// ---------------------------------------------------------------------------
// Auth config — SAFE TO IMPORT ON THE CLIENT.
// This file must NOT contain secrets, tokens, or server-only imports.
// It defines the shape of a logged-in user and how Discord roles map to
// what a user is allowed to do on the site.
// ---------------------------------------------------------------------------

/**
 * Things a user can be allowed to do on the site. Add your own as needed.
 *  - admin     : access the admin panel (edit site content)
 *  - manageOps : create / edit operations on the Operations board
 *  - members   : view members-only content
 *  - rsvp      : RSVP to operations
 *  - stats     : view past-operation performance stats
 */
export type Capability = "admin" | "manageOps" | "members" | "rsvp" | "stats" | "rcon";

export const ALL_CAPABILITIES: Capability[] = [
  "admin",
  "manageOps",
  "members",
  "rsvp",
  "stats",
  "rcon",
];

/** The logged-in user, as stored in the (encrypted) session cookie. */
export type SessionUser = {
  /** Discord user id (snowflake). */
  id: string;
  /** Display name (Discord global name, server nickname, or username). */
  username: string;
  /** Full avatar URL, or null if the user has no custom avatar. */
  avatarUrl: string | null;
  /** Discord role ids the user has in your server. */
  roleIds: string[];
  /** Human-readable role names the user has in your server. */
  roleNames: string[];
  /** Capabilities derived from those roles (see ROLE_CAPABILITIES). */
  capabilities: Capability[];
  /** Whether the user is actually a member of your Discord server. */
  isMember: boolean;
  /** Discord user id, set when the user signed in with / linked Discord. */
  discordId?: string | null;

  steamId?: string | null;
  /** Verified Epic Games account id, set when the user linked Epic. */
  epicId?: string | null;
  /** Epic display name, used to match the player in the game archive. */
  epicName?: string | null;
  /** Which provider created this session. */
  provider?: "discord" | "steam" | "epic";
};

// ---------------------------------------------------------------------------
// ROLE → CAPABILITY MAPPING
//
// EDIT THIS to match the role names in YOUR Discord server.
// `role` is matched case-insensitively against the user's Discord roles.
// A user gets the UNION of capabilities from every matching role.
// ---------------------------------------------------------------------------
export const ROLE_CAPABILITIES: { role: string; grants: Capability[] }[] = [
  // Staff / leadership
  { role: "Obj 1st Admin", grants: ["admin", "manageOps", "members", "rsvp", "stats", "rcon"] },
  { role: "Server Owner", grants: ["admin", "manageOps", "members", "rsvp", "stats", "rcon"] },
  { role: "Admin", grants: ["admin", "manageOps", "members", "rsvp", "stats", "rcon"] },
  { role: "OBJ 1ST HEAD MOD", grants: ["admin", "manageOps", "members", "rsvp", "stats", "rcon"] },
  { role: "OBJ 1st MOD", grants: ["manageOps", "members", "rsvp", "stats", "rcon"] },
  { role: "Mod", grants: ["manageOps", "members", "rsvp", "stats", "rcon"] },
  { role: "cadre", grants: ["manageOps", "members", "rsvp", "stats"] },
  { role: "Team Manager", grants: ["manageOps", "members", "rsvp", "stats"] },
  { role: "Onboarding Team", grants: ["manageOps", "members", "rsvp", "stats"] },
  { role: "Tech Advisor", grants: ["members", "rsvp", "stats"] },
  { role: "Community Rep", grants: ["members", "rsvp", "stats"] },
  { role: "Obj1 Partner Streamer", grants: ["members", "rsvp", "stats"] },

  // Supporter tiers
  { role: "Platinum Member", grants: ["members", "rsvp", "stats"] },
  { role: "Plat member", grants: ["members", "rsvp", "stats"] },
  { role: "Gold Member", grants: ["members", "rsvp", "stats"] },
  { role: "Bronze member", grants: ["members", "rsvp", "stats"] },
  { role: "Patreon", grants: ["members", "rsvp", "stats"] },
  { role: "Ko-fi Bot", grants: [] },
  { role: "Donator", grants: ["members", "rsvp", "stats"] },
  { role: "Server Booster", grants: ["members", "rsvp", "stats"] },
  { role: "Early Supporter", grants: ["members", "rsvp", "stats"] },

  // General membership
  { role: "Member", grants: ["members", "rsvp", "stats"] },
  { role: "Squad mate", grants: ["members", "rsvp", "stats"] },
  { role: "Vietnam Squad Mate", grants: ["members", "rsvp", "stats"] },
  { role: "League", grants: ["members", "rsvp", "stats"] },
];

/** Roles that must NEVER grant access, even if a token heuristic matches. */
const DENY_ROLES = ["warned", "ban appeal", "muted", "banned"];


/** Compute capabilities from a list of Discord role names. */
export function capabilitiesFromRoleNames(roleNames: string[]): Capability[] {
  const lower = roleNames.map((n) => n.toLowerCase());
  const have = new Set(lower);
  const caps = new Set<Capability>();
  for (const { role, grants } of ROLE_CAPABILITIES) {
    if (have.has(role.toLowerCase())) {
      for (const g of grants) caps.add(g);
    }
  }
  // Any role that contains the word "admin" or "mod" as a token grants
  // RCON + full admin caps. Matches "OBJ 1st Admin", "Head Mod", etc.,
  // but NOT "Moderator-in-Training" substrings that aren't real tokens.
  const tokenize = (s: string) => s.split(/[^a-z0-9]+/i).filter(Boolean);
  const hasAdminToken = lower.some((n) => tokenize(n).includes("admin"));
  const hasModToken = lower.some((n) => tokenize(n).includes("mod"));
  if (hasAdminToken) {
    for (const g of ["admin", "manageOps", "members", "rsvp", "stats", "rcon"] as Capability[]) {
      caps.add(g);
    }
  }
  if (hasModToken) {
    for (const g of ["manageOps", "members", "rsvp", "stats", "rcon"] as Capability[]) {
      caps.add(g);
    }
  }
  return [...caps];
}


/** True if the user exists and has the given capability. */
export function userCan(user: SessionUser | null | undefined, cap: Capability): boolean {
  return !!user && user.capabilities.includes(cap);
}
