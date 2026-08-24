// ---------------------------------------------------------------------------
// SERVER-ONLY. Builds a Discord-user-id -> game-account index straight from
// CRCON. CRCON stores a `account: { discord_id, name, is_member }` block on
// every player record (that's what your join/registration flow fills in), so
// a Discord sign-in can be matched to the player's Steam64 / Epic (EOS) id
// with no manual linking on the website.
// ---------------------------------------------------------------------------
import { apiGetRaw } from "./crcon.server";

export type LinkedAccount = {
  /** CRCON player id — Steam64 for Steam players, EOS hex for Epic/console. */
  playerId: string;
  /** Steam64 when CRCON knows one. */
  steamId: string | null;
  /** EOS id when the player is on Epic / console. */
  eosId: string | null;
  /** Last known in-game name. */
  name: string | null;
  /** Discord name recorded on the CRCON account, if any. */
  discordName: string | null;
  isMember: boolean;
  lastSeenMs: number;
};

const PAGE_SIZE = 500;
const MAX_PAGES = 200; // ~100k most-recent players
const CONCURRENCY = 4;
const FULL_TTL_MS = 6 * 60 * 60 * 1000; // full rescan every 6h
const HEAD_TTL_MS = 5 * 60 * 1000; // refresh newest pages every 5min
const HEAD_PAGES = 3;

type HistoryPlayer = {
  player_id?: string;
  steam_id?: string | null;
  names?: { name?: string }[];
  soldier?: { eos_id?: string | null; name?: string | null } | null;
  account?: {
    name?: string | null;
    discord_id?: string | null;
    is_member?: boolean | null;
  } | null;
  last_seen_timestamp_ms?: number | null;
};

const index = new Map<string, LinkedAccount>();
/** Reverse index: game account id (player id / Steam64 / EOS) -> discord id. */
const reverse = new Map<string, string>();

let totalPlayers = 0;
let pagesScanned = 0;
let fullScanAt = 0;
let headScanAt = 0;
let scanning: Promise<void> | null = null;

function isHex32(v: string): boolean {
  return /^[0-9a-f]{32}$/i.test(v);
}

function absorb(players: HistoryPlayer[]): void {
  for (const p of players) {
    const discordId = p.account?.discord_id?.trim();
    if (!discordId) continue;
    const playerId = p.player_id ?? "";
    if (!playerId) continue;

    const steamRaw = p.steam_id ?? null;
    const steamId =
      steamRaw && /^7656\d{13}$/.test(steamRaw)
        ? steamRaw
        : /^7656\d{13}$/.test(playerId)
          ? playerId
          : null;
    const eosId = p.soldier?.eos_id ?? (isHex32(playerId) ? playerId : null);
    const lastSeenMs = p.last_seen_timestamp_ms ?? 0;

    const entry: LinkedAccount = {
      playerId,
      steamId,
      eosId,
      name: p.soldier?.name ?? p.names?.[0]?.name ?? null,
      discordName: p.account?.name ?? null,
      isMember: Boolean(p.account?.is_member),
      lastSeenMs,
    };
    const existing = index.get(discordId);
    // Newest record wins, so a returning player's current account is used.
    if (!existing || lastSeenMs >= existing.lastSeenMs) index.set(discordId, entry);
  }
}

async function fetchPage(page: number): Promise<HistoryPlayer[]> {
  const res = (await apiGetRaw(
    `/api/get_players_history?page=${page}&page_size=${PAGE_SIZE}`,
  )) as { total?: number; players?: HistoryPlayer[] } | null;
  if (!res) return [];
  if (typeof res.total === "number") totalPlayers = res.total;
  return Array.isArray(res.players) ? res.players : [];
}

/** Refresh only the newest pages — cheap, catches players who just registered. */
async function scanHead(): Promise<void> {
  for (let page = 1; page <= HEAD_PAGES; page++) {
    absorb(await fetchPage(page));
  }
  headScanAt = Date.now();
}

/** Walk the whole archive newest-first, in small concurrent batches. */
async function scanAll(): Promise<void> {
  pagesScanned = 0;
  for (let page = 1; page <= MAX_PAGES; page += CONCURRENCY) {
    const batch: Promise<HistoryPlayer[]>[] = [];
    for (let i = 0; i < CONCURRENCY && page + i <= MAX_PAGES; i++) {
      batch.push(fetchPage(page + i));
    }
    const results = await Promise.all(batch);
    let empty = true;
    for (const players of results) {
      if (players.length > 0) empty = false;
      absorb(players);
      pagesScanned++;
    }
    if (empty) break;
    if (totalPlayers > 0 && pagesScanned * PAGE_SIZE >= totalPlayers) break;
  }
  fullScanAt = Date.now();
  headScanAt = Date.now();
}

function ensureIndex(): Promise<void> {
  const now = Date.now();
  if (scanning) return scanning;
  if (now - fullScanAt >= FULL_TTL_MS) {
    scanning = scanAll().finally(() => {
      scanning = null;
    });
    return scanning;
  }
  if (now - headScanAt >= HEAD_TTL_MS) {
    scanning = scanHead().finally(() => {
      scanning = null;
    });
    return scanning;
  }
  return Promise.resolve();
}

/**
 * Look up the game account CRCON has registered for a Discord user id.
 * Waits for the first index build; later calls are served from memory while
 * refreshes happen in the background.
 */
export async function getLinkedAccount(discordUserId: string): Promise<LinkedAccount | null> {
  const first = fullScanAt === 0;
  const job = ensureIndex();
  if (first) {
    await job; // no data yet — we have to wait for the first pass
  } else {
    const hit = index.get(discordUserId);
    if (hit) return hit;
    await job; // miss: let any in-flight refresh finish before giving up
  }
  return index.get(discordUserId) ?? null;
}

/** Candidate CRCON player ids for a Discord user, best first. */
export async function getLinkedPlayerIds(discordUserId: string): Promise<string[]> {
  const acc = await getLinkedAccount(discordUserId);
  if (!acc) return [];
  const ids = [acc.playerId, acc.steamId, acc.eosId].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  return Array.from(new Set(ids));
}

/** Diagnostics for admin tooling. */
export function linkIndexStatus(): {
  linked: number;
  totalPlayers: number;
  pagesScanned: number;
  lastFullScan: number;
  scanning: boolean;
} {
  return {
    linked: index.size,
    totalPlayers,
    pagesScanned,
    lastFullScan: fullScanAt,
    scanning: scanning !== null,
  };
}
