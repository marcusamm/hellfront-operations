// Admin/Mod-only server functions that proxy our Hell Let Loose CRCON.
// Every handler re-verifies the caller has the "rcon" capability on the
// server, so the gate cannot be bypassed by hitting the endpoint directly.
import { createServerFn } from "@tanstack/react-start";

export type RconPlayer = {
  name: string;
  player_id: string;
  team: string | null;
  role: string | null;
  unit_name: string | null;
  level: number | null;
  kills: number;
  deaths: number;
};

export type RconPlayersResult = {
  status: "ok" | "forbidden" | "error";
  players: RconPlayer[];
  message?: string;
};

async function requireRcon(): Promise<string | null> {
  const { getSessionUser } = await import("./auth.server");
  const u = await getSessionUser();
  if (!u) return "Not signed in";
  if (!u.capabilities.includes("rcon")) return "Forbidden";
  return null;
}

function pickN(o: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}
function pickS(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

export const getRconPlayers = createServerFn({ method: "GET" }).handler(
  async (): Promise<RconPlayersResult> => {
    const denied = await requireRcon();
    if (denied) return { status: "forbidden", players: [], message: denied };
    const { apiGetRaw } = await import("./crcon.server");
    const result = await apiGetRaw("/api/get_detailed_players");
    if (result == null)
      return { status: "error", players: [], message: "CRCON did not respond" };
    const r = result as Record<string, unknown>;
    const playersObj = (r.players ?? r) as Record<string, unknown>;
    const rows: RconPlayer[] = [];
    for (const value of Object.values(playersObj)) {
      if (!value || typeof value !== "object") continue;
      const p = value as Record<string, unknown>;
      const id = pickS(p, "player_id", "steam_id_64", "id");
      const name = pickS(p, "name", "player", "player_name");
      if (!id || !name) continue;
      rows.push({
        name,
        player_id: id,
        team: pickS(p, "team"),
        role: pickS(p, "role"),
        unit_name: pickS(p, "unit_name"),
        level: pickN(p, "level") || null,
        kills: pickN(p, "kills"),
        deaths: pickN(p, "deaths"),
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return { status: "ok", players: rows };
  },
);

export type RconActionResult = { ok: boolean; message: string };

async function runAction(path: string, body: Record<string, unknown>): Promise<RconActionResult> {
  const denied = await requireRcon();
  if (denied) return { ok: false, message: denied };
  const { apiPost } = await import("./crcon.server");
  const res = (await apiPost(path, body)) as
    | { result?: unknown; failed?: boolean; error?: unknown }
    | null;
  if (!res) return { ok: false, message: "CRCON did not respond" };
  if (res.failed) return { ok: false, message: String(res.error ?? "CRCON refused") };
  return { ok: true, message: "Done" };
}

export const messagePlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { player_id: string; player_name: string; message: string }) => d)
  .handler(async ({ data, context }): Promise<RconActionResult> => {
    void context;
    return runAction("/api/message_player", {
      player_id: data.player_id,
      player_name: data.player_name,
      message: data.message,
    });
  });

export const kickPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { player_id: string; player_name: string; reason: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/kick", {
      player_id: data.player_id,
      player_name: data.player_name,
      reason: data.reason,
      by: "ObjFirst Web",
    });
  });

export const tempBanPlayer = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { player_id: string; player_name: string; duration_hours: number; reason: string }) => d,
  )
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/temp_ban", {
      player_id: data.player_id,
      player_name: data.player_name,
      duration_hours: data.duration_hours,
      reason: data.reason,
      by: "ObjFirst Web",
    });
  });

export const setBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/set_broadcast", { message: data.message });
  });

export const setWelcomeMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/set_welcome_message", { message: data.message });
  });

// --- extended per-player actions ------------------------------------------

export const punishPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { player_id: string; player_name: string; reason: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/punish", {
      player_id: data.player_id,
      player_name: data.player_name,
      reason: data.reason,
      by: "ObjFirst Web",
    });
  });

export const switchPlayerNow = createServerFn({ method: "POST" })
  .inputValidator((d: { player_name: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/switch_player_now", { player_name: data.player_name });
  });

export const switchPlayerOnDeath = createServerFn({ method: "POST" })
  .inputValidator((d: { player_name: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/switch_player_on_death", { player_name: data.player_name });
  });

export const permaBanPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { player_id: string; player_name: string; reason: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/perma_ban", {
      player_id: data.player_id,
      player_name: data.player_name,
      reason: data.reason,
      by: "ObjFirst Web",
    });
  });

export const addVipPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { player_id: string; description: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/add_vip", {
      player_id: data.player_id,
      description: data.description || "VIP",
    });
  });

// --- gamestate & map info -------------------------------------------------

export type GameStateResult = {
  status: "ok" | "forbidden" | "error";
  message?: string;
  current_map?: string;
  next_map?: string;
  allied_score?: number;
  axis_score?: number;
  num_allied_players?: number;
  num_axis_players?: number;
  time_remaining?: string;
  raw?: Record<string, unknown>;
};

export const getGameState = createServerFn({ method: "GET" }).handler(
  async (): Promise<GameStateResult> => {
    const denied = await requireRcon();
    if (denied) return { status: "forbidden", message: denied };
    const { apiGetRaw } = await import("./crcon.server");
    const r = (await apiGetRaw("/api/get_gamestate")) as Record<string, unknown> | null;
    if (!r) return { status: "error", message: "CRCON did not respond" };
    const cm = r.current_map as Record<string, unknown> | string | undefined;
    const nm = r.next_map as Record<string, unknown> | string | undefined;
    const mapName = (m: typeof cm) =>
      typeof m === "string" ? m : (m?.pretty_name as string) || (m?.id as string) || "—";
    const tr = r.raw_time_remaining ?? r.time_remaining;
    return {
      status: "ok",
      current_map: mapName(cm),
      next_map: mapName(nm),
      allied_score: pickN(r, "allied_score"),
      axis_score: pickN(r, "axis_score"),
      num_allied_players: pickN(r, "num_allied_players"),
      num_axis_players: pickN(r, "num_axis_players"),
      time_remaining: typeof tr === "string" ? tr : tr != null ? String(tr) : undefined,
      raw: r,
    };
  },
);

export type MapRotationResult = {
  status: "ok" | "forbidden" | "error";
  message?: string;
  maps: { id: string; pretty_name: string }[];
};

export const getMapRotation = createServerFn({ method: "GET" }).handler(
  async (): Promise<MapRotationResult> => {
    const denied = await requireRcon();
    if (denied) return { status: "forbidden", maps: [], message: denied };
    const { apiGetRaw } = await import("./crcon.server");
    const r = await apiGetRaw("/api/get_map_rotation");
    if (!Array.isArray(r)) return { status: "error", maps: [], message: "No rotation" };
    const maps = r.map((m) => {
      if (typeof m === "string") return { id: m, pretty_name: m };
      const o = m as Record<string, unknown>;
      return {
        id: (o.id as string) || (o.name as string) || "?",
        pretty_name: (o.pretty_name as string) || (o.id as string) || "?",
      };
    });
    return { status: "ok", maps };
  },
);

export const changeMap = createServerFn({ method: "POST" })
  .inputValidator((d: { map_name: string }) => d)
  .handler(async ({ data }): Promise<RconActionResult> => {
    return runAction("/api/set_map", { map_name: data.map_name });
  });

// --- raw command runner ---------------------------------------------------

export type RawCommandResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

export const runRawCommand = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { path: string; method?: "GET" | "POST"; body?: Record<string, unknown> }) => d,
  )
  .handler(async ({ data }): Promise<RawCommandResult> => {
    const denied = await requireRcon();
    if (denied) return { ok: false, message: denied };
    const path = data.path.startsWith("/") ? data.path : `/api/${data.path}`;
    const { apiGetRaw, apiPost } = await import("./crcon.server");
    try {
      const res =
        (data.method ?? "GET") === "POST"
          ? await apiPost(path, data.body ?? {})
          : await apiGetRaw(path);
      return { ok: true, message: "ok", data: res };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  });

