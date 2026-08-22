import { createServerFn } from "@tanstack/react-start";

export type LifetimeStatsDTO = {
  playerId: string;
  name: string;
  kills: number;
  deaths: number;
  teamkills: number;
  kd: number;
  hours: number;
  killsPerHour: number;
  sessions: number;
  coverage: { daysCovered: number; daysTotal: number };
};

export type MyStats =
  | { status: "anon" }
  | { status: "no_steam" }
  | { status: "no_data"; steamId: string }
  | { status: "ok"; steamId: string; player: LifetimeStatsDTO };

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

  const { getLifetimeStats } = await import("./crcon.server");
  const s = await getLifetimeStats(steamId);
  if (!s) return { status: "no_data", steamId };
  return {
    status: "ok",
    steamId,
    player: {
      playerId: s.playerId,
      name: s.name,
      kills: s.kills,
      deaths: s.deaths,
      teamkills: s.teamkills,
      kd: s.kd,
      hours: s.hours,
      killsPerHour: s.killsPerHour,
      sessions: s.sessions,
      coverage: s.coverage,
    },
  };
});
