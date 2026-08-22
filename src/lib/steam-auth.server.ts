// ---------------------------------------------------------------------------
// SERVER-ONLY. Steam sign-in via OpenID 2.0 (Steam's only supported login
// method — no app registration or API key required for the login itself).
// An optional STEAM_API_KEY lets us also read the player's profile name and
// avatar; without it we fall back to a generic name.
// ---------------------------------------------------------------------------
const STEAM_OPENID = "https://steamcommunity.com/openid/login";
const NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED_ID = /^https?:\/\/steamcommunity\.com\/openid\/id\/(7656\d{13})$/;

function env(key: string): string | undefined {
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  const v = proc?.env?.[key];
  return v && v.length > 0 ? v : undefined;
}

/** Where Steam sends the user back to. */
export function steamReturnTo(origin: string): string {
  return env("STEAM_RETURN_TO") ?? `${origin}/auth/steam/callback`;
}

/** Build the URL that starts the Steam login flow. */
export function buildSteamLoginUrl(origin: string, nextPath: string): string {
  const returnTo = new URL(steamReturnTo(origin));
  if (nextPath) returnTo.searchParams.set("next", nextPath);
  const params = new URLSearchParams({
    "openid.ns": NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo.toString(),
    "openid.realm": origin,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${STEAM_OPENID}?${params.toString()}`;
}

/**
 * Verify the OpenID assertion with Steam and return the verified Steam64 id.
 * Returns null when the signature is invalid or the response is malformed.
 */
export async function verifySteamCallback(url: URL): Promise<string | null> {
  const claimedId = url.searchParams.get("openid.claimed_id") ?? "";
  const match = claimedId.match(CLAIMED_ID);
  if (!match) return null;

  // Re-send every openid.* parameter back to Steam with mode=check_authentication.
  const body = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    if (key.startsWith("openid.")) body.set(key, value);
  }
  body.set("openid.mode", "check_authentication");

  let res: Response;
  try {
    res = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (err) {
    console.error("[steam-auth] verification request failed:", err);
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text();
  if (!/is_valid\s*:\s*true/i.test(text)) return null;
  return match[1];
}

export type SteamProfile = { name: string | null; avatarUrl: string | null };

function xmlTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i"));
  const v = m?.[1]?.trim();
  return v && v.length > 0 ? v : null;
}

/**
 * Public profile scrape — works with NO API key. Steam exposes the community
 * profile as XML, which carries the persona name and avatar. Never throws.
 */
async function fetchSteamProfileXml(steamId: string): Promise<SteamProfile> {
  try {
    const res = await fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, {
      headers: { "User-Agent": "objective-first-site/1.0" },
    });
    if (!res.ok) return { name: null, avatarUrl: null };
    const xml = await res.text();
    return { name: xmlTag(xml, "steamID"), avatarUrl: xmlTag(xml, "avatarFull") };
  } catch {
    return { name: null, avatarUrl: null };
  }
}

/** Profile lookup: Steam Web API when a key exists, public XML otherwise. */
export async function fetchSteamProfile(steamId: string): Promise<SteamProfile> {
  const key = env("STEAM_API_KEY");
  if (!key) return fetchSteamProfileXml(steamId);
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`,
    );
    if (!res.ok) return fetchSteamProfileXml(steamId);
    const json = (await res.json()) as {
      response?: { players?: { personaname?: string; avatarfull?: string }[] };
    };
    const p = json.response?.players?.[0];
    if (!p?.personaname) return fetchSteamProfileXml(steamId);
    return { name: p.personaname, avatarUrl: p.avatarfull ?? null };
  } catch {
    return fetchSteamProfileXml(steamId);
  }
}
