import { createServerFn } from "@tanstack/react-start";
import type { ServerStatus, ServerBrief } from "./stats-types";

// Live game-server status pulled from CRCON (players, max, current map).
export const getServerStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServerStatus | null> => {
    const { getServerStatus: read } = await import("./crcon.server");
    return read();
  },
);

// Every server registered in CRCON, with live population and current map.
export const getAllServerStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ servers: ServerBrief[]; totalPlayers: number; totalSlots: number }> => {
    const { getAllServers } = await import("./crcon.server");
    const servers = await getAllServers();
    return {
      servers,
      totalPlayers: servers.reduce((n, s) => n + s.players, 0),
      totalSlots: servers.reduce((n, s) => n + s.maxPlayers, 0),
    };
  },
);
