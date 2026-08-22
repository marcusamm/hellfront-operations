// ---------------------------------------------------------------------------
// SERVER-ONLY. Talks to your Hell Let Loose CRCON to build a per-player
// leaderboard from the last N games. Credentials live in .env and never reach
// the browser. A human-readable diagnostic is returned so the stats page can
// show exactly what happened (login, endpoints, field names) without needing
// the terminal.
// ---------------------------------------------------------------------------
import type { PlayerRow, Leaderboard } from "./stats-types";

function env(key: string): string | undefined {
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  const v = proc?.env?.[key];
  return v && v.length > 0 ? v : undefined;
}

function baseUrl(): string | null {
  // Prefer the self-hosted RCON relay when configured. The relay is a small
  // service you run on your own VPS that speaks the raw HLL RCON TCP
  // protocol and exposes the SAME `/api/...` paths CRCON does, secured by a
  // bearer token. When RCON_RELAY_URL is set, we skip CRCON entirely.
  const relay = env("RCON_RELAY_URL");
  if (relay) return relay.replace(/\/+$/, "");
  const u = env("CRCON_URL");
  return u ? u.replace(/\/+$/, "") : null;
}

function useRelay(): boolean {
  return !!env("RCON_RELAY_URL");
}

let diag: string[] = [];
const note = () => diag.join("  ·  ");

// --- session handling ------------------------------------------------------
let sessionCookie: string | null = null;

async function login(): Promise<boolean> {
  // Relay uses a static bearer token — no login round-trip.
  if (useRelay()) {
    if (!env("RCON_RELAY_TOKEN")) {
      diag.push("missing RCON_RELAY_TOKEN");
      return false;
    }
    return true;
  }
  const base = baseUrl();
  const user = env("CRCON_USER");
  const pass = env("CRCON_PASSWORD");
  if (!base || !user || !pass) {
    diag.push("missing CRCON_URL/USER/PASSWORD in .env");
    return false;
  }
  try {
    const res = await fetch(`${base}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
    });
    if (!res.ok) {
      diag.push(`login HTTP ${res.status}`);
      return false;
    }
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie") as string]
          : [];
    const sess = setCookies.find((c) => c.startsWith("sessionid="));
    if (!sess) {
      diag.push("login ok but no sessionid cookie");
      return false;
    }
    sessionCookie = sess.split(";")[0];
    diag.push("login ok");
    return true;
  } catch (err) {
    diag.push(`login error: ${(err as Error).message}`);
    return false;
  }
}

function authHeaders(
  method: "GET" | "POST",
  path: string,
  body: string,
): Record<string, string> {
  if (useRelay()) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${env("RCON_RELAY_TOKEN") ?? ""}`,
    };
    // If a signing secret is configured on both sides, sign the request
    // with HMAC-SHA256 over (ts \n nonce \n method \n path \n body).
    // The relay rejects requests >30s old or with a reused nonce.
    const secret = env("RCON_RELAY_SIGNING_SECRET");
    if (secret) {
      // Lazy load so this never ships to the browser bundle.
      const { createHmac, randomBytes } = require("node:crypto") as typeof import("node:crypto");
      const ts = Math.floor(Date.now() / 1000).toString();
      const nonce = randomBytes(16).toString("hex");
      const sig = createHmac("sha256", secret)
        .update(`${ts}\n${nonce}\n${method}\n${path}\n${body}`)
        .digest("hex");
      headers["x-relay-timestamp"] = ts;
      headers["x-relay-nonce"] = nonce;
      headers["x-relay-signature"] = sig;
    }
    return headers;
  }
  return { Cookie: sessionCookie as string };
}

async function apiGet(path: string): Promise<unknown | null> {
  const base = baseUrl();
  if (!base) return null;
  if (!useRelay() && !sessionCookie && !(await login())) return null;
  if (useRelay() && !(await login())) return null;

  const doFetch = () =>
    fetch(`${base}${path}`, {
      headers: { ...authHeaders("GET", path, ""), Accept: "application/json" },
    });

  let res = await doFetch().catch((e) => {
    diag.push(`GET ${path} error: ${(e as Error).message}`);
    return null;
  });
  if (!res) return null;

  if (!useRelay() && (res.status === 401 || res.status === 403)) {
    sessionCookie = null;
    if (!(await login())) return null;
    res = await doFetch().catch(() => null);
    if (!res) return null;
  }
  if (!res.ok) {
    diag.push(`GET ${path.split("?")[0]} HTTP ${res.status}`);
    return null;
  }
  try {
    const json = (await res.json()) as { result?: unknown; failed?: boolean; error?: unknown };
    if (json && typeof json === "object" && "result" in json) {
      if (json.failed) diag.push(`${path.split("?")[0]} failed: ${String(json.error)}`);
      return json.result ?? null;
    }
    return json;
  } catch {
    diag.push(`${path.split("?")[0]} returned non-JSON`);
    return null;
  }
}

export async function apiPost(path: string, body: unknown): Promise<unknown | null> {
  const base = baseUrl();
  if (!base) return null;
  if (!useRelay() && !sessionCookie && !(await login())) return null;
  if (useRelay() && !(await login())) return null;

  const bodyStr = JSON.stringify(body ?? {});
  const doFetch = () =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        ...authHeaders("POST", path, bodyStr),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: bodyStr,
    });

  let res = await doFetch().catch(() => null);
  if (!res) return null;
  if (!useRelay() && (res.status === 401 || res.status === 403)) {
    sessionCookie = null;
    if (!(await login())) return null;
    res = await doFetch().catch(() => null);
    if (!res) return null;
  }
  if (!res.ok) return { failed: true, error: `HTTP ${res.status}` };
  try {
    const json = (await res.json()) as { result?: unknown; failed?: boolean; error?: unknown };
    return json;
  } catch {
    return { failed: true, error: "non-JSON response" };
  }
}


export async function apiGetRaw(path: string): Promise<unknown | null> {
  return apiGet(path);
}

// --- tolerant field helpers ------------------------------------------------
function pickNum(o: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}
function pickStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}
function asArray(x: unknown, ...keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(x)) return x as Record<string, unknown>[];
  if (x && typeof x === "object") {
    const obj = x as Record<string, unknown>;
    for (const k of keys) if (Array.isArray(obj[k])) return obj[k] as Record<string, unknown>[];
  }
  return [];
}

async function getRecentMapIds(limit: number): Promise<number[]> {
  const result = await apiGet(`/api/get_scoreboard_maps?limit=${limit}`);
  if (result == null) return [];
  const maps = asArray(result, "maps", "scoreboard_maps");
  diag.push(`get_scoreboard_maps: ${maps.length} games`);
  if (maps[0]) diag.push(`map keys: ${Object.keys(maps[0]).slice(0, 12).join(",")}`);
  return maps
    .map((m) => pickNum(m, ["id", "map_id"]))
    .filter((id) => id > 0)
    .slice(0, limit);
}

let loggedPlayerKeys = false;
async function getMapPlayers(mapId: number): Promise<Record<string, unknown>[]> {
  const result = await apiGet(`/api/get_map_scoreboard?map_id=${mapId}`);
  if (result == null) return [];
  const players = asArray(result, "player_stats", "players", "stats");
  if (!loggedPlayerKeys && players[0]) {
    diag.push(`player keys: ${Object.keys(players[0]).slice(0, 14).join(",")}`);
    loggedPlayerKeys = true;
  }
  return players;
}

// 15-minute in-memory cache of the FULL per-player aggregation (nothing on disk).
let cache: { at: number; all: PlayerRow[]; gamesAnalyzed: number; note: string } | null = null;
const TTL_MS = 15 * 60 * 1000;

async function aggregate(
  games: number,
): Promise<{ all: PlayerRow[]; gamesAnalyzed: number; note: string }> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return { all: cache.all, gamesAnalyzed: cache.gamesAnalyzed, note: cache.note };
  }
  diag = [];
  loggedPlayerKeys = false;

  const mapIds = await getRecentMapIds(games);
  if (mapIds.length === 0) {
    const out = { all: [] as PlayerRow[], gamesAnalyzed: 0, note: note() };
    cache = { at: Date.now(), ...out };
    return out;
  }

  type Acc = {
    name: string;
    games: number;
    kills: number;
    deaths: number;
    combat: number;
    offense: number;
    defense: number;
    support: number;
    seconds: number;
  };
  const acc = new Map<string, Acc>();
  const perMap = await Promise.all(mapIds.map((id) => getMapPlayers(id)));
  for (const players of perMap) {
    for (const p of players) {
      const id = pickStr(p, ["player_id", "steam_id_64", "playerId", "id"]);
      if (!id) continue;
      const a = acc.get(id) ?? {
        name: "",
        games: 0,
        kills: 0,
        deaths: 0,
        combat: 0,
        offense: 0,
        defense: 0,
        support: 0,
        seconds: 0,
      };
      a.name = pickStr(p, ["player", "name", "player_name"]) || a.name || id;
      a.games += 1;
      a.kills += pickNum(p, ["kills"]);
      a.deaths += pickNum(p, ["deaths"]);
      a.combat += pickNum(p, ["combat", "combat_score"]);
      a.offense += pickNum(p, ["offense", "offense_score"]);
      a.defense += pickNum(p, ["defense", "defense_score"]);
      a.support += pickNum(p, ["support", "support_score"]);
      a.seconds += pickNum(p, ["time_seconds", "playtime", "time", "playtime_seconds"]);
      acc.set(id, a);
    }
  }

  const all: PlayerRow[] = [...acc.entries()]
    .map(([playerId, a]) => ({
      playerId,
      name: a.name,
      games: a.games,
      avgKills: a.kills / a.games,
      avgDeaths: a.deaths / a.games,
      kd: a.deaths > 0 ? a.kills / a.deaths : a.kills,
      avgCombat: a.combat / a.games,
      avgOffense: a.offense / a.games,
      avgDefense: a.defense / a.games,
      avgSupport: a.support / a.games,
      hours: a.seconds / 3600,
    }))
    .sort((x, y) => y.avgKills - x.avgKills);

  diag.push(`${acc.size} players aggregated`);
  const out = { all, gamesAnalyzed: mapIds.length, note: note() };
  cache = { at: Date.now(), ...out };
  return out;
}

export async function buildLeaderboard(games = 30, topN = 25): Promise<Leaderboard> {
  const { all, gamesAnalyzed, note: n } = await aggregate(games);
  return {
    players: all.slice(0, topN),
    gamesAnalyzed,
    updatedAt: new Date().toISOString(),
    note: n,
  };
}

export async function getPlayerStats(steamId: string, games = 30): Promise<PlayerRow | null> {
  const { all } = await aggregate(games);
  return all.find((p) => p.playerId === steamId) ?? null;
}

// --- live server status (CRCON public info) --------------------------------
import type { ServerStatus } from "./stats-types";

function asObj(x: unknown): Record<string, unknown> {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : {};
}
function asNum(x: unknown): number | null {
  if (typeof x === "number") return x;
  if (typeof x === "string" && x.trim() !== "" && !isNaN(Number(x))) return Number(x);
  return null;
}
function asStr(x: unknown): string | null {
  if (typeof x === "string" && x.length > 0) return x;
  if (typeof x === "number") return String(x);
  return null;
}

export async function getServerStatus(): Promise<ServerStatus | null> {
  const result = await apiGet("/api/get_public_info");
  if (result == null) return null;
  const r = asObj(result);
  const teams = asObj(r.player_count_by_team);
  const players =
    asNum(r.player_count) ??
    asNum(r.current_players) ??
    (asNum(teams.allied) ?? 0) + (asNum(teams.axis) ?? 0);
  const maxPlayers = asNum(r.max_player_count) ?? asNum(r.max_players) ?? 100;
  const cm = asObj(r.current_map);
  const cmMap = asObj(cm.map);
  const map =
    asStr(cm.pretty_name) ??
    asStr(cmMap.pretty_name) ??
    asStr(cmMap.name) ??
    asStr(cm.name) ??
    asStr(r.current_map) ??
    "Unknown";
  const nm = asObj(r.name);
  const name = asStr(nm.name) ?? asStr(nm.short_name) ?? asStr(r.name) ?? "Objective First";
  return { name, players, maxPlayers, map, online: true };
}

// --- multi-server status (all servers registered in CRCON) ------------------
import type { ServerBrief } from "./stats-types";
export type { ServerBrief };

function parsePublicInfo(result: unknown): Omit<ServerStatus, "online"> | null {
  if (result == null) return null;
  const r = asObj(result);
  const teams = asObj(r.player_count_by_team);
  const players =
    asNum(r.player_count) ??
    asNum(r.current_players) ??
    (asNum(teams.allied) ?? 0) + (asNum(teams.axis) ?? 0);
  const maxPlayers = asNum(r.max_player_count) ?? asNum(r.max_players) ?? 100;
  const cm = asObj(r.current_map);
  const cmMap = asObj(cm.map);
  const cmMapMap = asObj(cmMap.map);
  const map =
    asStr(cmMap.pretty_name) ??
    asStr(cmMapMap.pretty_name) ??
    asStr(cm.pretty_name) ??
    asStr(cmMap.name) ??
    asStr(r.current_map) ??
    "Unknown";
  const nm = asObj(r.name);
  const name = asStr(nm.name) ?? asStr(nm.short_name) ?? asStr(r.name) ?? "Objective First";
  return { name, players, maxPlayers, map };
}

// CRCON exposes /api/get_public_info without a session, so each sibling
// server can be read straight from its own CRCON host.
async function publicInfoFrom(base: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/get_public_info`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: unknown };
    return json?.result ?? null;
  } catch {
    return null;
  }
}

let serversCache: { at: number; data: ServerBrief[] } | null = null;
const SERVERS_TTL_MS = 30_000;

export async function getAllServers(): Promise<ServerBrief[]> {
  if (serversCache && Date.now() - serversCache.at < SERVERS_TTL_MS) return serversCache.data;

  const primary = baseUrl();
  const listRaw = await apiGet("/api/get_server_list");
  const entries = Array.isArray(listRaw) ? (listRaw as Record<string, unknown>[]) : [];

  let data: ServerBrief[];

  if (entries.length === 0) {
    const single = await getServerStatus();
    data = single
      ? [
          {
            ...single,
            serverNumber: 1,
            shortName: single.name,
            link: primary,
            game: "hll",
            isPrimary: true,
          },
        ]
      : [];
  } else {
    data = await Promise.all(
      entries.map(async (e) => {
        const serverNumber = asNum(e.server_number) ?? 0;
        const link = asStr(e.link) ?? primary;
        const isPrimary = e.this_server === true;
        const shortName = asStr(e.short_name) ?? asStr(e.name) ?? `Server ${serverNumber}`;
        const fullName = asStr(e.name) ?? shortName;
        const game = asStr(e.game) ?? "hll";

        let info = link ? await publicInfoFrom(link) : null;
        if (info == null && isPrimary) info = await apiGet("/api/get_public_info");
        const parsed = parsePublicInfo(info);

        return {
          name: fullName,
          shortName,
          serverNumber,
          link: link ?? null,
          game,
          isPrimary,
          players: parsed?.players ?? 0,
          maxPlayers: parsed?.maxPlayers ?? 100,
          map: parsed?.map ?? "Unknown",
          online: parsed != null,
        } satisfies ServerBrief;
      }),
    );
    data.sort((a, b) => a.serverNumber - b.serverNumber);
  }

  serversCache = { at: Date.now(), data };
  return data;
}

// --- per-server rosters (public "who's on" deck) ----------------------------
// Each sibling CRCON host needs its own session, so we keep a small cookie
// jar keyed by host and a short-lived roster cache to stay light on the API.
export type RosterEntry = {
  name: string;
  team: string;
  level: number | null;
};

const hostCookies = new Map<string, string>();
const rosterCache = new Map<number, { at: number; data: RosterEntry[] }>();
const ROSTER_TTL_MS = 20_000;

async function loginTo(base: string): Promise<string | null> {
  const cached = hostCookies.get(base);
  if (cached) return cached;
  const user = env("CRCON_USER");
  const pass = env("CRCON_PASSWORD");
  if (!user || !pass) return null;
  try {
    const res = await fetch(`${base}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
    });
    if (!res.ok) return null;
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    const list =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie") as string]
          : [];
    const sess = list.find((c) => c.startsWith("sessionid="));
    if (!sess) return null;
    const cookie = sess.split(";")[0] as string;
    hostCookies.set(base, cookie);
    return cookie;
  } catch {
    return null;
  }
}

async function rosterFrom(base: string): Promise<RosterEntry[] | null> {
  const fetchOnce = async (cookie: string) => {
    const res = await fetch(`${base}/api/get_detailed_players`, {
      headers: { Accept: "application/json", Cookie: cookie },
    });
    if (res.status === 401) return "unauth" as const;
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: unknown };
    return json?.result ?? null;
  };

  let cookie = await loginTo(base);
  if (!cookie) return null;
  let result = await fetchOnce(cookie);
  if (result === "unauth") {
    hostCookies.delete(base);
    cookie = await loginTo(base);
    if (!cookie) return null;
    result = await fetchOnce(cookie);
  }
  if (result == null || result === "unauth") return null;

  const r = asObj(result);
  const playersObj = asObj(r.players ?? result);
  const rows: RosterEntry[] = [];
  for (const value of Object.values(playersObj)) {
    if (!value || typeof value !== "object") continue;
    const p = value as Record<string, unknown>;
    const name = asStr(p.name) ?? asStr(p.player) ?? null;
    if (!name) continue;
    // Public roster only shows name, team and level. No squads, roles or IDs.
    rows.push({
      name,
      team: (asStr(p.team) ?? "").toLowerCase(),
      level: asNum(p.level),
    });
  }
  rows.sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name));
  return rows;
}

export async function getServerRoster(serverNumber: number): Promise<RosterEntry[] | null> {
  const cached = rosterCache.get(serverNumber);
  if (cached && Date.now() - cached.at < ROSTER_TTL_MS) return cached.data;

  const servers = await getAllServers();
  const target = servers.find((s) => s.serverNumber === serverNumber);
  const base = (target?.link ?? (target?.isPrimary ? baseUrl() : null))?.replace(/\/+$/, "");
  if (!base) return null;

  let data = await rosterFrom(base);
  // Primary server may only be reachable through the configured CRCON host.
  if (data == null && target?.isPrimary) {
    const primary = baseUrl();
    if (primary && primary !== base) data = await rosterFrom(primary);
  }
  if (data == null) return null;
  rosterCache.set(serverNumber, { at: Date.now(), data });
  return data;
}
