import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { SessionUser } from "./auth-config";

/**
 * Returns the currently logged-in user (read from the encrypted session
 * cookie), or null if nobody is logged in. Safe to call from the client —
 * the actual session read happens on the server.
 */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const { getSessionUser, hydrateDiscordFromGameIds, setSessionUser } = await import(
      "./auth.server"
    );
    const user = await getSessionUser();
    if (!user) return null;
    // Members register their Steam / Epic id on our Discord, so a Steam- or
    // Epic-only session can be matched back to its Discord account and roles.
    if (!user.discordId && (user.steamId || user.epicId)) {
      const hydrated = await Promise.race([
        hydrateDiscordFromGameIds(user),
        new Promise<SessionUser>((resolve) => {
          setTimeout(() => resolve(user), 1_500);
        }),
      ]);
      if (hydrated.discordId) {
        await setSessionUser(hydrated);
        return hydrated;
      }
    }
    return user;
  },
);

