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

// Resolves the signed-in user's own lifetime CRCON stats. Works for Steam,
// Epic / Microsoft Store, and Discord sign-ins: Steam gives a verified Steam64,
// Epic gives a verified Epic account (matched to the game archive by id, then
// by display name), and Discord falls back to the posted steam-id channel.
export const getMyStats = createServerFn({ method: "GET" }).handler(async (): Promise<MyStats> => {
  const { getSessionUser } = await import("./auth.server");
  const user = await getSessionUser();
  if (!user) return { status: "anon" };

  const { getLifetimeStats, findPlayerIdByName } = await import("./crcon.server");

  const candidates: string[] = [];
  if (user.steamId) candidates.push(user.steamId);

  // Discord sign-ins: CRCON already stores the Steam / Epic id members
  // register when they join the Discord, so match on that first.
  const discordId = user.discordId ?? (user.provider === "discord" ? user.id : null);
  if (discordId) {
    const { getLinkedPlayerIds } = await import("./discord-link.server");
    const linked = await getLinkedPlayerIds(discordId).catch(() => [] as string[]);
    for (const id of linked) if (!candidates.includes(id)) candidates.push(id);
  }

  if (candidates.length === 0 && discordId) {
    const { getSteamIdForDiscordUser } = await import("./steam-link.server");
    const posted = await getSteamIdForDiscordUser(discordId);
    if (posted) candidates.push(posted);
  }

  if (user.epicId && !candidates.includes(user.epicId)) candidates.push(user.epicId);
  if (user.epicName) {
    const byName = await findPlayerIdByName(user.epicName);
    if (byName && !candidates.includes(byName)) candidates.push(byName);
  }


  if (candidates.length === 0) return { status: "no_steam" };

  for (const playerId of candidates) {
    const s = await getLifetimeStats(playerId);
    if (!s) continue;
    return {
      status: "ok",
      steamId: playerId,
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
  }
  return { status: "no_data", steamId: candidates[0]! };
});
