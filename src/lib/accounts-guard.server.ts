// SERVER-ONLY. Authorization guard for staff-level account operations.
import { capabilitiesForRoles, rolesForUser } from "./accounts.server";
import type { Capability } from "./auth-config";

export type ActorInfo = {
  userId: string;
  displayName: string | null;
  roles: string[];
  capabilities: Capability[];
};

/** Throws unless the verified account holds a role granting `cap`. */
export async function requireAccountCapability(
  userId: string,
  cap: Capability,
): Promise<ActorInfo> {
  const roles = await rolesForUser(userId);
  const capabilities = await capabilitiesForRoles(roles);
  if (!capabilities.includes(cap)) {
    throw new Error("Forbidden");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    userId,
    displayName: (data?.display_name as string | undefined) ?? null,
    roles,
    capabilities,
  };
}

export async function requireAdminAccount(userId: string): Promise<ActorInfo> {
  return requireAccountCapability(userId, "admin");
}
