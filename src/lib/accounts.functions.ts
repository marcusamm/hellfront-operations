// Server functions for website accounts and role management.
// Thin wrappers only — all logic lives in accounts.server.ts / auth.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Capability, SessionUser } from "./auth-config";
import type { AccountRow, SiteRole } from "./accounts.server";

/**
 * Called right after a successful e-mail/password sign-in. The bearer token is
 * verified by the middleware, so the account id here is trusted; we then write
 * the site session cookie the rest of the app reads.
 */
export const syncAccountSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionUser> => {
    const { sessionUserForAccount } = await import("./accounts.server");
    const { setSessionUser } = await import("./auth.server");
    const claims = context.claims as { email?: string; user_metadata?: { display_name?: string } };
    const user = await sessionUserForAccount(context.userId, {
      email: claims?.email ?? null,
      displayName: claims?.user_metadata?.display_name ?? null,
    });
    await setSessionUser(user);
    return user;
  });

export const getSiteRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<SiteRole[]> => {
    const { listSiteRoles } = await import("./accounts.server");
    return listSiteRoles();
  });

export const getAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountRow[]> => {
    const { requireAdminAccount } = await import("./accounts-guard.server");
    await requireAdminAccount(context.userId);
    const { listAccounts } = await import("./accounts.server");
    return listAccounts();
  });

export const setAccountRolesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; roles: string[] }) => {
    if (!input || typeof input.userId !== "string" || !Array.isArray(input.roles)) {
      throw new Error("Invalid input");
    }
    return {
      userId: input.userId,
      roles: input.roles.filter((r) => typeof r === "string").slice(0, 40),
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const { requireAdminAccount } = await import("./accounts-guard.server");
    const actor = await requireAdminAccount(context.userId);
    const { setAccountRoles, listSiteRoles } = await import("./accounts.server");

    // An admin must not be able to strip their own admin access and lock
    // everyone out of the panel.
    if (data.userId === context.userId) {
      const roles = await listSiteRoles();
      const keepsAdmin = roles.some(
        (r) => data.roles.includes(r.name) && r.grants.includes("admin"),
      );
      if (!keepsAdmin) {
        return { ok: false, message: "You cannot remove your own admin role." };
      }
    }

    await setAccountRoles(data.userId, data.roles, context.userId);
    const { logAdminAction } = await import("./audit.server");
    await logAdminAction({
      actorKey: context.userId,
      actorName: actor.displayName,
      action: "roles.set",
      targetId: data.userId,
      details: { roles: data.roles },
    });
    return { ok: true, message: "Roles updated." };
  });

export const saveSiteRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { name: string; description?: string; grants: string[]; sortOrder?: number }) => {
      if (!input || typeof input.name !== "string" || !input.name.trim()) {
        throw new Error("Role name is required");
      }
      return {
        name: input.name.trim().slice(0, 60),
        description: (input.description ?? "").slice(0, 200),
        grants: Array.isArray(input.grants) ? input.grants.map(String) : [],
        sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : 100,
      };
    },
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const { requireAdminAccount } = await import("./accounts-guard.server");
    const actor = await requireAdminAccount(context.userId);
    const { upsertSiteRole } = await import("./accounts.server");
    await upsertSiteRole(data);
    const { logAdminAction } = await import("./audit.server");
    await logAdminAction({
      actorKey: context.userId,
      actorName: actor.displayName,
      action: "role.save",
      details: { name: data.name, grants: data.grants },
    });
    return { ok: true, message: `Saved role “${data.name}”.` };
  });

export const deleteSiteRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    if (!input || typeof input.name !== "string") throw new Error("Invalid input");
    return { name: input.name };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const { requireAdminAccount } = await import("./accounts-guard.server");
    const actor = await requireAdminAccount(context.userId);
    const { deleteSiteRole } = await import("./accounts.server");
    await deleteSiteRole(data.name);
    const { logAdminAction } = await import("./audit.server");
    await logAdminAction({
      actorKey: context.userId,
      actorName: actor.displayName,
      action: "role.delete",
      details: { name: data.name },
    });
    return { ok: true, message: `Deleted role “${data.name}”.` };
  });

/** Available capability ids, for the role editor UI. */
export type { Capability };
