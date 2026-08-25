// ---------------------------------------------------------------------------
// SERVER-ONLY. Website accounts: profiles, assignable roles, role assignments.
//
// Accounts are real e-mail/password logins. Roles live in the database and are
// managed from the admin panel — they are no longer read from Discord.
// ---------------------------------------------------------------------------
import { ALL_CAPABILITIES, type Capability, type SessionUser } from "./auth-config";

export type SiteRole = {
  name: string;
  description: string | null;
  grants: Capability[];
  sortOrder: number;
};

export type AccountRow = {
  userId: string;
  displayName: string;
  email: string | null;
  steamId: string | null;
  epicId: string | null;
  epicName: string | null;
  discordId: string | null;
  discordUsername: string | null;
  avatarUrl: string | null;
  roles: string[];
  capabilities: Capability[];
  createdAt: string;
  confirmed: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function asCaps(list: unknown): Capability[] {
  const arr = Array.isArray(list) ? list : [];
  return arr.filter((g): g is Capability => ALL_CAPABILITIES.includes(g as Capability));
}

export async function listSiteRoles(): Promise<SiteRole[]> {
  const db = await admin();
  const { data, error } = await db
    .from("site_roles")
    .select("name, description, grants, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    grants: asCaps(r.grants),
    sortOrder: (r.sort_order as number) ?? 100,
  }));
}

/** Capabilities granted by a set of role names. */
export async function capabilitiesForRoles(roles: string[]): Promise<Capability[]> {
  if (roles.length === 0) return [];
  const all = await listSiteRoles();
  const wanted = new Set(roles.map((r) => r.toLowerCase()));
  const caps = new Set<Capability>();
  for (const role of all) {
    if (wanted.has(role.name.toLowerCase())) for (const g of role.grants) caps.add(g);
  }
  return [...caps];
}

export async function rolesForUser(userId: string): Promise<string[]> {
  const db = await admin();
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.role as string);
}

/** True when at least one account already holds an admin-granting role. */
export async function anyAdminExists(): Promise<boolean> {
  const roles = await listSiteRoles();
  const adminRoles = roles.filter((r) => r.grants.includes("admin")).map((r) => r.name);
  if (adminRoles.length === 0) return false;
  const db = await admin();
  const { data, error } = await db.from("user_roles").select("id").in("role", adminRoles).limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function grantRole(userId: string, role: string): Promise<void> {
  const db = await admin();
  const { error } = await db.from("user_roles").insert({ user_id: userId, role });
  if (error && error.code !== "23505") throw error;
}

type ProfileRow = {
  user_id: string;
  display_name: string;
  steam_id: string | null;
  epic_id: string | null;
  epic_name: string | null;
  discord_id: string | null;
  discord_username: string | null;
  avatar_url: string | null;
  created_at: string;
};

async function getProfile(userId: string): Promise<ProfileRow | null> {
  const db = await admin();
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

/**
 * Build the site session for a verified Supabase account. The very first
 * account to sign in becomes Admin so the community can bootstrap itself.
 */
export async function sessionUserForAccount(
  userId: string,
  fallback: { email?: string | null; displayName?: string | null },
): Promise<SessionUser> {
  const db = await admin();
  let profile = await getProfile(userId);
  if (!profile) {
    const name =
      fallback.displayName || (fallback.email ? fallback.email.split("@")[0] : "Recruit");
    const { data, error } = await db
      .from("profiles")
      .insert({ user_id: userId, display_name: name })
      .select("*")
      .single();
    if (error) throw error;
    profile = data as ProfileRow;
  }

  let roles = await rolesForUser(userId);
  if (roles.length === 0 && !(await anyAdminExists())) {
    await grantRole(userId, "Admin");
    roles = ["Admin"];
  }

  const capabilities = await capabilitiesForRoles(roles);
  return {
    id: `site:${userId}`,
    authUserId: userId,
    email: fallback.email ?? null,
    username: profile.display_name,
    avatarUrl: profile.avatar_url,
    roleIds: [],
    roleNames: roles,
    capabilities,
    isMember: capabilities.includes("members"),
    discordId: profile.discord_id,
    steamId: profile.steam_id,
    epicId: profile.epic_id,
    epicName: profile.epic_name,
    provider: "site",
  };
}

/** Persist Steam / Epic / Discord links onto the account profile. */
export async function saveProfileLinks(
  userId: string,
  patch: {
    steamId?: string | null;
    epicId?: string | null;
    epicName?: string | null;
    discordId?: string | null;
    discordUsername?: string | null;
    avatarUrl?: string | null;
    displayName?: string | null;
  },
): Promise<void> {
  const db = await admin();
  const row: Record<string, string | null> = {};
  if (patch.steamId !== undefined) row["steam_id"] = patch.steamId;
  if (patch.epicId !== undefined) row["epic_id"] = patch.epicId;
  if (patch.epicName !== undefined) row["epic_name"] = patch.epicName;
  if (patch.discordId !== undefined) row["discord_id"] = patch.discordId;
  if (patch.discordUsername !== undefined) row["discord_username"] = patch.discordUsername;
  if (patch.avatarUrl !== undefined) row["avatar_url"] = patch.avatarUrl;
  if (patch.displayName) row["display_name"] = patch.displayName;
  if (Object.keys(row).length === 0) return;
  const { error } = await db.from("profiles").update(row).eq("user_id", userId);
  if (error) throw error;
}

/** Every account with its roles — admin panel roster. */
export async function listAccounts(): Promise<AccountRow[]> {
  const db = await admin();
  const [{ data: profiles, error: pErr }, { data: roleRows, error: rErr }, roles] =
    await Promise.all([
      db.from("profiles").select("*").order("created_at", { ascending: true }).limit(500),
      db.from("user_roles").select("user_id, role"),
      listSiteRoles(),
    ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;

  const grantsByRole = new Map(roles.map((r) => [r.name.toLowerCase(), r.grants]));
  const byUser = new Map<string, string[]>();
  for (const r of roleRows ?? []) {
    const list = byUser.get(r.user_id as string) ?? [];
    list.push(r.role as string);
    byUser.set(r.user_id as string, list);
  }

  // Emails / confirmation status live in the auth system, not in profiles.
  const emails = new Map<string, { email: string | null; confirmed: boolean }>();
  try {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      emails.set(u.id, {
        email: u.email ?? null,
        confirmed: !!(u.email_confirmed_at ?? u.confirmed_at),
      });
    }
  } catch (err) {
    console.error("[accounts] listUsers failed:", err);
  }

  return (profiles ?? []).map((p) => {
    const row = p as ProfileRow;
    const userRoles = byUser.get(row.user_id) ?? [];
    const caps = new Set<Capability>();
    for (const r of userRoles) {
      for (const g of grantsByRole.get(r.toLowerCase()) ?? []) caps.add(g);
    }
    const auth = emails.get(row.user_id);
    return {
      userId: row.user_id,
      displayName: row.display_name,
      email: auth?.email ?? null,
      steamId: row.steam_id,
      epicId: row.epic_id,
      epicName: row.epic_name,
      discordId: row.discord_id,
      discordUsername: row.discord_username,
      avatarUrl: row.avatar_url,
      roles: userRoles,
      capabilities: [...caps],
      createdAt: row.created_at,
      confirmed: auth?.confirmed ?? false,
    };
  });
}

/** Replace an account's roles with exactly `roles`. */
export async function setAccountRoles(
  userId: string,
  roles: string[],
  grantedBy: string,
): Promise<void> {
  const db = await admin();
  const valid = new Set((await listSiteRoles()).map((r) => r.name));
  const next = [...new Set(roles.filter((r) => valid.has(r)))];

  const { error: delErr } = await db.from("user_roles").delete().eq("user_id", userId);
  if (delErr) throw delErr;
  if (next.length === 0) return;
  const { error } = await db
    .from("user_roles")
    .insert(next.map((role) => ({ user_id: userId, role, granted_by: grantedBy })));
  if (error) throw error;
}

/** Create or update an assignable role and the capabilities it grants. */
export async function upsertSiteRole(input: {
  name: string;
  description?: string | null;
  grants: string[];
  sortOrder?: number;
}): Promise<void> {
  const db = await admin();
  const grants = input.grants.filter((g): g is Capability =>
    ALL_CAPABILITIES.includes(g as Capability),
  );
  const { error } = await db.from("site_roles").upsert(
    {
      name: input.name.trim(),
      description: input.description ?? null,
      grants,
      sort_order: input.sortOrder ?? 100,
    },
    { onConflict: "name" },
  );
  if (error) throw error;
}

export async function deleteSiteRole(name: string): Promise<void> {
  const db = await admin();
  const { error } = await db.from("site_roles").delete().eq("name", name);
  if (error) throw error;
}
