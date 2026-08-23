// ---------------------------------------------------------------------------
// SERVER-ONLY. "Sign in with Epic Games" via Epic Account Services (EOS)
// OAuth 2.0. Needs an Epic product with Epic Account Services enabled:
//   EPIC_CLIENT_ID / EPIC_CLIENT_SECRET  (Epic Dev Portal > Product > EAS)
// Redirect URI to register there: <site-origin>/auth/epic/callback
// ---------------------------------------------------------------------------
const AUTHORIZE = "https://www.epicgames.com/id/authorize";
const TOKEN = "https://api.epicgames.dev/epic/oauth/v2/token";
const USERINFO = "https://api.epicgames.dev/epic/oauth/v2/userInfo";
const ACCOUNTS = "https://api.epicgames.dev/epic/id/v2/accounts";

function env(key: string): string | undefined {
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  const v = proc?.env?.[key];
  return v && v.length > 0 ? v : undefined;
}

export function epicConfigured(): boolean {
  return !!env("EPIC_CLIENT_ID") && !!env("EPIC_CLIENT_SECRET");
}

export function epicRedirectUri(origin: string): string {
  return env("EPIC_REDIRECT_URI") ?? `${origin}/auth/epic/callback`;
}

// --- signed state (carries the post-login redirect, tamper-proof) -----------
function stateSecret(): string {
  return env("DISCORD_SESSION_SECRET") ?? env("EPIC_CLIENT_SECRET") ?? "epic-state";
}

async function hmac(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(stateSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildEpicState(nextPath: string): Promise<string> {
  const payload = `${Date.now()}|${nextPath}`;
  return `${btoa(payload).replace(/=+$/, "")}.${(await hmac(payload)).slice(0, 32)}`;
}

/** Returns the `next` path when the state is valid and fresh, else null. */
export async function readEpicState(state: string | null): Promise<string | null> {
  if (!state) return null;
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  let payload: string;
  try {
    payload = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  } catch {
    return null;
  }
  if ((await hmac(payload)).slice(0, 32) !== sig) return null;
  const [tsRaw, ...rest] = payload.split("|");
  const ts = Number(tsRaw);
  if (!ts || Date.now() - ts > 15 * 60_000) return null;
  const next = rest.join("|");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/members#my-stats";
}

export async function buildEpicLoginUrl(origin: string, nextPath: string): Promise<string> {
  const clientId = env("EPIC_CLIENT_ID");
  if (!clientId) throw new Error("Missing EPIC_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: epicRedirectUri(origin),
    response_type: "code",
    scope: "basic_profile",
    state: await buildEpicState(nextPath),
  });
  return `${AUTHORIZE}?${params.toString()}`;
}

export type EpicIdentity = {
  /** Epic account id (32 hex chars). */
  accountId: string;
  displayName: string | null;
};

/** Exchange the OAuth code and read the Epic account id + display name. */
export async function exchangeEpicCode(
  code: string,
  origin: string,
): Promise<EpicIdentity | null> {
  const clientId = env("EPIC_CLIENT_ID");
  const clientSecret = env("EPIC_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: epicRedirectUri(origin),
      scope: "basic_profile",
    }),
  });
  if (!res.ok) {
    console.error("[epic-auth] token exchange failed", res.status, await res.text());
    return null;
  }
  const token = (await res.json()) as { access_token?: string; account_id?: string };
  const accessToken = token.access_token;
  let accountId = token.account_id ?? null;
  if (!accessToken) return null;

  if (!accountId) {
    const info = await fetch(USERINFO, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (info.ok) {
      const json = (await info.json()) as { sub?: string; preferred_username?: string };
      accountId = json.sub ?? null;
      if (accountId) return { accountId, displayName: json.preferred_username ?? null };
    }
  }
  if (!accountId) return null;

  let displayName: string | null = null;
  try {
    const acc = await fetch(`${ACCOUNTS}?accountId=${encodeURIComponent(accountId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (acc.ok) {
      const rows = (await acc.json()) as { accountId?: string; displayName?: string }[];
      displayName = rows?.[0]?.displayName ?? null;
    }
  } catch (err) {
    console.error("[epic-auth] display-name lookup failed:", err);
  }
  return { accountId, displayName };
}
