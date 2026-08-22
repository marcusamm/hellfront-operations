import { createServerFn } from "@tanstack/react-start";
import type { PlayerRow } from "./stats-types";

export type MyStats =
  | { status: "anon" }
  | { status: "no_steam" }
  | { status: "no_data"; steamId: string }
  | {
      status: "ok";
      steamId: string;
      player: PlayerRow;
      coverage: { mapsProcessed: number; mapsTotal: number };
    };

// Resolves the signed-in user's own lifetime CRCON stats. Steam sign-in gives
// us a verified Steam64 id directly; Discord sign-in falls back to the Steam ID
// posted in the Discord steam-id channel.
export const getMyStats = createServerFn({ method: "GET" }).handler(async (): Promise<MyStats> => {
  const { getSessionUser } = await import("./auth.server");
  const user = await getSessionUser();
  if (!user) return { status: "anon" };

  let steamId = user.steamId ?? null;
  if (!steamId && user.provider !== "steam") {
    const { getSteamIdForDiscordUser } = await import("./steam-link.server");
    steamId = await getSteamIdForDiscordUser(user.id);
  }
  if (!steamId) return { status: "no_steam" };

  const { getPlayerStats, lifetimeCoverage } = await import("./crcon.server");
  const player = await getPlayerStats(steamId);
  if (!player) return { status: "no_data", steamId };
  return { status: "ok", steamId, player, coverage: lifetimeCoverage() };
});

