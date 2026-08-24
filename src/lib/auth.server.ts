// ---------------------------------------------------------------------------
// SERVER-ONLY auth helpers. NEVER import this from a client component.
// It is only imported by server functions and server-route handlers, and it
// reads secrets (Discord client secret, bot token, session password) from env.
// ---------------------------------------------------------------------------
import {
  // aliased so the react-hooks lint rule doesn't mistake it for a React hook
  useSession as openSession,
  getRequestUrl,
  getRequestProtocol,
} from "@tanstack/react-start/server";
import { capabilitiesFromRoleNames, type Capability, type SessionUser } from "./auth-config";

const DISCORD_API = "https://discord.com/api/v10";
const CDN = "https://cdn.discordapp.com";

// --- env -------------------------------------------------------------------
type ProcessLike = { env?: Record<string, string | undefined> };

function env(key: string): string | undefined {
  const proc = (globalThis as unknown as { process?: ProcessLike }).process;
  const v = proc?.env ? proc.env[key] : undefined;
  return v && v.length > 0 ? v : undefined;
}

function requireEnv(key: string): string {
  const v = env(key);
  if (!v) {
    throw new Error(`Missing required environment variable: ${key}. See DISCORD_SETUP.md.`);
  }
  return v;
}

export function discordClientId(): string {
  return requireEnv("DISCORD_CLIENT_ID");
}

// --- session ---------------------------------------------------------------
export type SessionData = { user?: SessionUser };

export function getSessionConfig() {
  const password = requireEnv("DISCORD_SESSION_SECRET");
  if (password.length < 32) {
    throw new Error("DISCORD_SESSION_SECRET must be at least 32 characters long.");
  }
  let secure = true;
  try {
    secure = getRequestProtocol() === "https";
  } catch {
    secure = true;
  }
  return {
    password,
    name: "objfirst_session",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      sameSite: "lax" as const,
      httpOnly: true,
      secure,
      path: "/",
    },
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await openSession<SessionData>(getSessionConfig());
    return session.data.user ?? null;
  } catch {
    return null;
  }
}

export async function setSessionUser(user: SessionUser): Promise<void> {
  const session = await openSession<SessionData>(getSessionConfig());
  await session.update({ user });
}

export async function clearSessionUser(): Promise<void> {
  const session = await openSession<SessionData>(getSessionConfig());
  await session.clear();
}

// --- OAuth + redirect URI --------------------------------------------------
export function getRedirectUri(): string {
  const override = env("DISCORD_REDIRECT_URI");
  if (override) return override;
  const origin = getRequestUrl().origin;
  return `${origin}/auth/discord/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: discordClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    // `identify` = read the user's id/name/avatar. Roles are read separately
    // via the bot token, so no extra scope is needed.
    scope: "identify",
    state,
    prompt: "consent",
  });
  return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
}

type TokenResponse = { access_token: string; token_type: string };

export async function exchangeCodeForToken(code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: discordClientId(),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Discord token exchange failed (${res.status})`);
  }
  const json = (await res.json()) as TokenResponse;
  return json.access_token;
}

// --- Discord identity (user access token) ----------------------------------
type DiscordIdentity = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export async function fetchIdentity(accessToken: string): Promise<DiscordIdentity> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Discord user (${res.status})`);
  return (await res.json()) as DiscordIdentity;
}

// --- Guild member + roles (bot token) --------------------------------------
type GuildMember = {
  roles: string[];
  nick: string | null;
  user?: { username?: string; global_name?: string | null; avatar?: string | null; id?: string };
} | null;

export async function fetchGuildMember(userId: string): Promise<GuildMember> {
  const guildId = requireEnv("DISCORD_GUILD_ID");
  const botToken = requireEnv("DISCORD_BOT_TOKEN");
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (res.status === 404) return null; // user is not in the server
  if (!res.ok) throw new Error(`Failed to fetch guild member (${res.status})`);
  const json = (await res.json()) as {
    roles?: string[];
    nick?: string | null;
    user?: GuildMember extends null ? never : NonNullable<GuildMember>["user"];
  };
  return { roles: json.roles ?? [], nick: json.nick ?? null, user: json.user };
}


// Cache the guild's role-id -> role-name map for a few minutes.
let rolesCache: { at: number; map: Map<string, string> } | null = null;
const ROLES_TTL_MS = 5 * 60 * 1000;

async function fetchGuildRoleMap(): Promise<Map<string, string>> {
  if (rolesCache && Date.now() - rolesCache.at < ROLES_TTL_MS) {
    return rolesCache.map;
  }
  const guildId = requireEnv("DISCORD_GUILD_ID");
  const botToken = requireEnv("DISCORD_BOT_TOKEN");
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch guild roles (${res.status})`);
  const json = (await res.json()) as { id: string; name: string }[];
  const map = new Map(json.map((r) => [r.id, r.name]));
  rolesCache = { at: Date.now(), map };
  return map;
}

// --- Build the session user ------------------------------------------------
export async function buildSessionUser(accessToken: string): Promise<SessionUser> {
  const identity = await fetchIdentity(accessToken);
  const member = await fetchGuildMember(identity.id);

  const roleIds: string[] = member ? member.roles : [];
  const roleNames: string[] = [];
  if (member) {
    const roleMap = await fetchGuildRoleMap();
    for (const id of roleIds) {
      const name = roleMap.get(id);
      if (name) roleNames.push(name);
    }
  }

  const displayName = member?.nick || identity.global_name || identity.username;
  const avatarUrl = identity.avatar
    ? `${CDN}/avatars/${identity.id}/${identity.avatar}.png?size=128`
    : null;

  // CRCON stores the Steam / Epic id members register when they join the
  // Discord, so link the game account automatically at sign-in.
  let steamId: string | null = null;
  let epicId: string | null = null;
  let epicName: string | null = null;
  try {
    const { getLinkedAccount } = await import("./discord-link.server");
    const linked = await getLinkedAccount(identity.id);
    if (linked) {
      steamId = linked.steamId;
      epicId = linked.eosId;
      epicName = linked.name;
    }
  } catch (err) {
    console.error("[discord-link] account lookup failed:", err);
  }

  // Keep anything the user already linked in this browser (Steam / Epic
  // sign-in before connecting Discord).
  const existing = await getSessionUser();

  return {
    id: identity.id,
    discordId: identity.id,
    username: displayName,
    avatarUrl,
    roleIds,
    roleNames,
    capabilities: capabilitiesFromRoleNames(roleNames),
    isMember: member !== null,
    steamId: steamId ?? existing?.steamId ?? null,
    epicId: epicId ?? existing?.epicId ?? null,
    epicName: epicName ?? existing?.epicName ?? null,
    provider: "discord",
  };
}

/**
 * Reverse account linking: members register their Steam64 / Epic id on our
 * Discord, and CRCON stores that `discord_id` on the player record. So when
 * someone signs in with Steam or Epic we can look the Discord account up from
 * the game id and pull their server roles automatically — no manual linking.
 */
export async function hydrateDiscordFromGameIds(user: SessionUser): Promise<SessionUser> {
  if (user.discordId) return user; // already linked
  const gameIds = [user.steamId, user.epicId].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (gameIds.length === 0) return user;

  try {
    const { getDiscordIdForPlayer, getLinkedAccount } = await import("./discord-link.server");
    let discordId: string | null = null;
    for (const id of gameIds) {
      discordId = await getDiscordIdForPlayer(id);
      if (discordId) break;
    }
    if (!discordId) return user;

    const member = await fetchGuildMember(discordId).catch(() => null);
    const roleIds = member?.roles ?? [];
    const roleNames: string[] = [];
    if (member) {
      const roleMap = await fetchGuildRoleMap();
      for (const id of roleIds) {
        const name = roleMap.get(id);
        if (name) roleNames.push(name);
      }
    }

    // Fill in any game id the member registered but hasn't signed in with.
    const linked = await getLinkedAccount(discordId).catch(() => null);

    const discordName =
      member?.nick || member?.user?.global_name || member?.user?.username || null;
    const avatar = member?.user?.avatar;
    const discordAvatar =
      avatar && member?.user?.id ? `${CDN}/avatars/${member.user.id}/${avatar}.png?size=128` : null;

    return {
      ...user,
      discordId,
      username: discordName || user.username,
      avatarUrl: user.avatarUrl ?? discordAvatar,
      roleIds,
      roleNames,
      capabilities: Array.from(
        new Set<Capability>([...capabilitiesFromRoleNames(roleNames), ...user.capabilities]),
      ),
      isMember: member !== null,
      steamId: user.steamId ?? linked?.steamId ?? null,
      epicId: user.epicId ?? linked?.eosId ?? null,
      epicName: user.epicName ?? linked?.name ?? null,
    };
  } catch (err) {
    console.error("[discord-link] reverse lookup failed:", err);
    return user;
  }
}


// --- Steam sign-in / linking ------------------------------------------------
/**
 * Attach a verified Steam64 id to the current session. If nobody is signed in
 * with Discord, this creates a Steam-only session that can view its own stats
 * but has no member/staff capabilities.
 */
export async function applySteamLogin(
  steamId: string,
  profile: { name: string | null; avatarUrl: string | null },
): Promise<SessionUser> {
  const existing = await getSessionUser();
  const user: SessionUser = existing
    ? {
        ...existing,
        steamId,
        // Steam-only sessions adopt the live Steam persona name / avatar so we
        // never show a placeholder like "Steam 6978".
        username:
          existing.provider === "steam" && profile.name ? profile.name : existing.username,
        avatarUrl:
          existing.provider === "steam" && profile.avatarUrl
            ? profile.avatarUrl
            : existing.avatarUrl,
      }
    : {
        id: `steam:${steamId}`,
        username: profile.name || `Steam ${steamId.slice(-4)}`,
        avatarUrl: profile.avatarUrl,
        roleIds: [],
        roleNames: [],
        capabilities: ["stats"],
        isMember: false,
        steamId,
        provider: "steam",
      };
  const hydrated = await hydrateDiscordFromGameIds(user);
  await setSessionUser(hydrated);
  return hydrated;
}

/**
 * Attach a verified Epic Games account id to the current session. Epic (and
 * Microsoft Store) players have no Steam64 at all, so this is how they claim
 * their own stats. Layers on top of an existing Discord/Steam session, or
 * creates a stats-only Epic session.
 */
export async function applyEpicLogin(
  epicId: string,
  displayName: string | null,
): Promise<SessionUser> {
  const existing = await getSessionUser();
  const user: SessionUser = existing
    ? {
        ...existing,
        epicId,
        epicName: displayName ?? existing.epicName ?? null,
        username:
          existing.provider === "epic" && displayName ? displayName : existing.username,
      }
    : {
        id: `epic:${epicId}`,
        username: displayName || `Epic ${epicId.slice(-4)}`,
        avatarUrl: null,
        roleIds: [],
        roleNames: [],
        capabilities: ["stats"],
        isMember: false,
        epicId,
        epicName: displayName ?? null,
        provider: "epic",
      };
  const hydrated = await hydrateDiscordFromGameIds(user);
  await setSessionUser(hydrated);
  return hydrated;
}
