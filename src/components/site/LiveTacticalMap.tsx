import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getGameState,
  getRconPlayers,
  messagePlayer,
  kickPlayer,
  tempBanPlayer,
  permaBanPlayer,
  punishPlayer,
  switchPlayerNow,
  switchPlayerOnDeath,
  watchPlayer,
  addVipPlayer,
  type RconPlayer,
} from "@/lib/rcon.functions";
import { HLL_MAPS, mapById, normalizeMapId, type HllMap } from "@/lib/hll-maps";

const MAP_SIZE = 1000;

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type MapGeo = {
  orientation?: "horizontal" | "vertical";
  bounds: Bounds;
  mirror_factions?: boolean;
  points?: { id: string; name: string; x: number; y: number }[];
};
type Geometry = { maps: Record<string, MapGeo> };

/**
 * In-website Hell Let Loose live tactical map.
 *
 * - Map artwork + map-geometry.json ported from the standalone live-map app.
 * - Live game state + player positions come from CRCON via existing server fns.
 * - Sector front-line and player markers are rendered as an SVG overlay on top
 *   of the tactical image, refreshed every few seconds.
 */
export function LiveTacticalMap() {
  const gs = useQuery({
    queryKey: ["live-map", "gamestate"],
    queryFn: () => getGameState(),
    refetchInterval: 5_000,
  });
  const pl = useQuery({
    queryKey: ["live-map", "players"],
    queryFn: () => getRconPlayers(),
    refetchInterval: 3_000,
  });
  const geo = useQuery({
    queryKey: ["live-map", "geometry"],
    queryFn: async (): Promise<Geometry | null> => {
      const r = await fetch("/map-geometry.json");
      if (!r.ok) return null;
      return (await r.json()) as Geometry;
    },
    staleTime: Infinity,
  });

  const detected = gs.data?.status === "ok" ? (gs.data.current_map ?? null) : null;
  const autoId = normalizeMapId(detected);
  const [override, setOverride] = useState<string | null>(null);
  const currentId = override ?? autoId;
  const currentMap = mapById(currentId);
  const mapGeo: MapGeo | null =
    currentId && geo.data?.maps?.[currentId] ? geo.data.maps[currentId] : null;

  const error =
    gs.data?.status === "forbidden" || pl.data?.status === "forbidden"
      ? "Forbidden — admin / mod only."
      : gs.data?.status === "error"
        ? gs.data.message
        : pl.data?.status === "error"
          ? pl.data.message
          : null;

  const players: RconPlayer[] = pl.data?.status === "ok" ? pl.data.players : [];
  const teams = useMemo(() => groupByTeam(players), [players]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? (players.find((p) => p.player_id === selectedId) ?? null) : null;

  const allied = gs.data?.status === "ok" ? (gs.data.allied_score ?? 0) : 0;
  const axis = gs.data?.status === "ok" ? (gs.data.axis_score ?? 0) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      {/* Map */}
      <div className="border hairline bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline bg-background/40 px-4 py-3">
          <div>
            <div className="eyebrow">CURRENT MAP</div>
            <div className="mt-1 font-mono text-sm text-foreground">
              {currentMap ? currentMap.name : (detected ?? "Waiting for live map…")}
              {override && (
                <button
                  onClick={() => setOverride(null)}
                  className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-rust hover:underline"
                >
                  reset to live
                </button>
              )}
            </div>
          </div>
          <ScoreBadge
            allied={allied}
            axis={axis}
            allCount={gs.data?.status === "ok" ? (gs.data.num_allied_players ?? 0) : 0}
            axCount={gs.data?.status === "ok" ? (gs.data.num_axis_players ?? 0) : 0}
            time={gs.data?.status === "ok" ? gs.data.time_remaining : undefined}
          />
        </div>

        <div className="relative bg-background">
          <MapCanvas
            map={currentMap}
            geo={mapGeo}
            players={players}
            allied={allied}
            axis={axis}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div className="border-t hairline bg-background/40 px-4 py-3">
          <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Preview another map
          </label>
          <select
            value={currentId ?? ""}
            onChange={(e) => setOverride(e.target.value || null)}
            className="mt-2 w-full border hairline bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
          >
            <option value="">— auto-detect from server —</option>
            {HLL_MAPS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Players sidebar */}
      <div className="border hairline bg-card">
        <div className="border-b hairline bg-background/40 px-4 py-3">
          <div className="eyebrow">PLAYERS ON SERVER</div>
          <div className="mt-1 font-mono text-sm text-foreground">
            {players.length} player{players.length === 1 ? "" : "s"}
            {(gs.isFetching || pl.isFetching) && (
              <span className="ml-2 text-muted-foreground">· refreshing…</span>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-4 font-mono text-[11px] uppercase tracking-[0.2em] text-rust">
            {error}
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto p-2">
            <TeamBlock
              label="Allies"
              tone="allied"
              team={teams.allies}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <TeamBlock
              label="Axis"
              tone="axis"
              team={teams.axis}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {teams.other.length > 0 && (
              <TeamBlock
                label="Unassigned"
                tone="neutral"
                team={teams.other}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
            {players.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Server is empty.</div>
            )}
          </div>
        )}
      </div>

      {/* Selected player actions span full width below */}
      {selected && (
        <div className="lg:col-span-2">
          <PlayerActionsPanel p={selected} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}

function ScoreBadge({
  allied,
  axis,
  allCount,
  axCount,
  time,
}: {
  allied: number;
  axis: number;
  allCount: number;
  axCount: number;
  time?: string;
}) {
  return (
    <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.2em]">
      <div className="text-right">
        <div className="text-muted-foreground">Allies</div>
        <div className="tnum text-base text-foreground">
          {allied} <span className="text-muted-foreground">· {allCount}</span>
        </div>
      </div>
      <div className="text-muted-foreground">vs</div>
      <div>
        <div className="text-muted-foreground">Axis</div>
        <div className="tnum text-base text-foreground">
          {axis} <span className="text-muted-foreground">· {axCount}</span>
        </div>
      </div>
      {time && (
        <div className="ml-2 border-l hairline pl-3">
          <div className="text-muted-foreground">Time</div>
          <div className="tnum text-base text-khaki">{time}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map rendering
// ---------------------------------------------------------------------------

function MapCanvas({
  map,
  geo,
  players,
  allied,
  axis,
  selectedId,
  onSelect,
}: {
  map: HllMap | null;
  geo: MapGeo | null;
  players: RconPlayer[];
  allied: number;
  axis: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="relative aspect-square w-full">
      {map && !broken ? (
        <img
          src={map.image}
          alt={`${map.name} tactical map`}
          onError={() => setBroken(true)}
          className="absolute inset-0 block h-full w-full object-cover"
        />
      ) : (
        <MapPlaceholder name={map?.name ?? "Unknown map"} />
      )}

      <svg
        viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        {geo && <SectorOverlay geo={geo} allied={allied} axis={axis} />}
        {geo && (
          <PlayerMarkers
            geo={geo}
            players={players}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        )}
      </svg>
    </div>
  );
}

function MapPlaceholder({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      role="img"
      aria-label={`${name} map placeholder`}
      className="absolute inset-0 h-full w-full"
    >
      <rect width="1000" height="1000" fill="#242424" />
      <text
        x="500"
        y="500"
        textAnchor="middle"
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize="48"
        fontWeight="700"
        fill="#f3f4f6"
      >
        {name}
      </text>
    </svg>
  );
}

function SectorOverlay({ geo, allied, axis }: { geo: MapGeo; allied: number; axis: number }) {
  const vertical = geo.orientation === "vertical";
  const mirror = geo.mirror_factions === true;
  const size = MAP_SIZE;
  const aDepth = (Math.max(0, Math.min(5, allied)) / 5) * size;
  const xDepth = (Math.max(0, Math.min(5, axis)) / 5) * size;
  const BLUE = "#3b82f6";
  const RED = "#ef4444";

  const zones: { x: number; y: number; w: number; h: number; color: string; front?: "L" | "R" | "T" | "B" }[] = [];

  if (vertical) {
    if (mirror) {
      if (axis > 0) zones.push({ x: 0, y: 0, w: size, h: xDepth, color: RED, front: "B" });
      if (allied > 0) zones.push({ x: 0, y: size - aDepth, w: size, h: aDepth, color: BLUE, front: "T" });
    } else {
      if (allied > 0) zones.push({ x: 0, y: 0, w: size, h: aDepth, color: BLUE, front: "B" });
      if (axis > 0) zones.push({ x: 0, y: size - xDepth, w: size, h: xDepth, color: RED, front: "T" });
    }
  } else {
    if (mirror) {
      if (axis > 0) zones.push({ x: 0, y: 0, w: xDepth, h: size, color: RED, front: "R" });
      if (allied > 0) zones.push({ x: size - aDepth, y: 0, w: aDepth, h: size, color: BLUE, front: "L" });
    } else {
      if (allied > 0) zones.push({ x: 0, y: 0, w: aDepth, h: size, color: BLUE, front: "R" });
      if (axis > 0) zones.push({ x: size - xDepth, y: 0, w: xDepth, h: size, color: RED, front: "L" });
    }
  }

  return (
    <g>
      {/* Sector grid (5 sectors) */}
      {[0.2, 0.4, 0.6, 0.8].map((f) => {
        const p = Math.round(f * size);
        return vertical ? (
          <line key={f} x1={0} y1={p} x2={size} y2={p} stroke="#d6d3c8" strokeWidth={2} opacity={0.45} />
        ) : (
          <line key={f} x1={p} y1={0} x2={p} y2={size} stroke="#d6d3c8" strokeWidth={2} opacity={0.45} />
        );
      })}

      {zones.map((z, i) => (
        <g key={i}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color} fillOpacity={0.14} />
          {z.front === "R" && (
            <line x1={z.x + z.w} y1={0} x2={z.x + z.w} y2={size} stroke={z.color} strokeWidth={4} opacity={0.9} />
          )}
          {z.front === "L" && (
            <line x1={z.x} y1={0} x2={z.x} y2={size} stroke={z.color} strokeWidth={4} opacity={0.9} />
          )}
          {z.front === "B" && (
            <line x1={0} y1={z.y + z.h} x2={size} y2={z.y + z.h} stroke={z.color} strokeWidth={4} opacity={0.9} />
          )}
          {z.front === "T" && (
            <line x1={0} y1={z.y} x2={size} y2={z.y} stroke={z.color} strokeWidth={4} opacity={0.9} />
          )}
        </g>
      ))}
    </g>
  );
}

function worldToPixel(x: number, y: number, b: Bounds): { px: number; py: number } {
  const nx = Math.max(0, Math.min(1, (x - b.minX) / (b.maxX - b.minX)));
  const ny = Math.max(0, Math.min(1, (y - b.minY) / (b.maxY - b.minY)));
  // Image: pixel (0,0) is top-left. In HLL, +Y is south on the tac-map artwork,
  // so higher world Y maps to a larger py (further down). No flip.
  return { px: nx * MAP_SIZE, py: ny * MAP_SIZE };
}

function teamColor(team: string | null): string {
  const t = (team ?? "").toLowerCase();
  if (t.includes("all") || t.includes("us") || t.includes("brit")) return "#3b82f6";
  if (t.includes("axis") || t.includes("ger")) return "#ef4444";
  return "#9ca3af";
}

function isLeader(role: string | null): "cmd" | "sl" | null {
  const r = (role ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!r) return null;
  if (r === "armycommander" || r === "commander") return "cmd";
  if (
    r === "officer" ||
    r === "squadleader" ||
    r === "platoonleader" ||
    r === "tankcommander" ||
    r === "crewcommander" ||
    r === "spotter"
  )
    return "sl";
  return null;
}

function PlayerMarkers({
  geo,
  players,
  selectedId,
  onSelect,
}: {
  geo: MapGeo;
  players: RconPlayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const dots = players
    .filter((p) => p.x !== null && p.y !== null)
    .map((p) => {
      const { px, py } = worldToPixel(p.x as number, p.y as number, geo.bounds);
      return { p, px, py };
    });

  return (
    <g>
      {dots.map(({ p, px, py }) => {
        const isSelected = p.player_id === selectedId;
        return (
          <circle
            key={p.player_id}
            cx={px}
            cy={py}
            r={isSelected ? 9 : 6}
            fill={teamColor(p.team)}
            stroke={isSelected ? "#facc15" : "#111"}
            strokeWidth={isSelected ? 3 : 1.5}
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p.player_id);
            }}
          >
            <title>
              {p.name}
              {p.role ? ` · ${p.role}` : ""}
              {p.unit_name ? ` · ${p.unit_name}` : ""}
            </title>
          </circle>
        );
      })}
      {dots.map(({ p, px, py }) => {
        const kind = isLeader(p.role);
        if (!kind) return null;
        const label = kind === "cmd" ? "CMD" : (p.unit_name?.toUpperCase() || "SL");
        const color = kind === "cmd" ? "#facc15" : teamColor(p.team);
        return (
          <text
            key={`l-${p.player_id}`}
            x={px}
            y={py - 10}
            textAnchor="middle"
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={12}
            fontWeight={700}
            fill={color}
            stroke="#000"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Player sidebar
// ---------------------------------------------------------------------------

type Squad = { name: string; players: RconPlayer[] };
type TeamGroup = { squads: Squad[]; count: number };

function groupByTeam(players: RconPlayer[]): {
  allies: TeamGroup;
  axis: TeamGroup;
  other: RconPlayer[];
} {
  const allies: RconPlayer[] = [];
  const axis: RconPlayer[] = [];
  const other: RconPlayer[] = [];
  for (const p of players) {
    const t = (p.team ?? "").toLowerCase();
    if (t.includes("all")) allies.push(p);
    else if (t.includes("axis") || t.includes("ger")) axis.push(p);
    else other.push(p);
  }
  return { allies: bySquad(allies), axis: bySquad(axis), other };
}

function bySquad(list: RconPlayer[]): TeamGroup {
  const map = new Map<string, RconPlayer[]>();
  for (const p of list) {
    const key = p.unit_name?.toUpperCase() || "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  const squads: Squad[] = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, players]) => ({
      name,
      players: players.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  return { squads, count: list.length };
}

function TeamBlock({
  label,
  tone,
  team,
  selectedId,
  onSelect,
}: {
  label: string;
  tone: "allied" | "axis" | "neutral";
  team: TeamGroup | RconPlayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const isFlat = Array.isArray(team);
  const count = isFlat ? team.length : team.count;
  if (count === 0) return null;
  const toneClass =
    tone === "allied" ? "text-khaki" : tone === "axis" ? "text-rust" : "text-muted-foreground";

  return (
    <div className="mb-3 border hairline bg-background/40">
      <div className="flex items-center justify-between border-b hairline px-3 py-2">
        <div className={`font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${toneClass}`}>
          {label}
        </div>
        <div className="tnum font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {count}
        </div>
      </div>
      <div className="divide-y hairline">
        {isFlat
          ? team.map((p) => (
              <PlayerLine
                key={p.player_id}
                p={p}
                selected={p.player_id === selectedId}
                onSelect={onSelect}
              />
            ))
          : team.squads.map((s) => (
              <div key={s.name} className="px-3 py-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {s.name} <span className="ml-1 text-foreground/60">· {s.players.length}</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {s.players.map((p) => (
                    <PlayerLine
                      key={p.player_id}
                      p={p}
                      compact
                      selected={p.player_id === selectedId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

function PlayerLine({
  p,
  compact,
  selected,
  onSelect,
}: {
  p: RconPlayer;
  compact?: boolean;
  selected: boolean;
  onSelect: (id: string | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(p.player_id)}
      className={`flex w-full items-center justify-between gap-2 ${compact ? "px-1 py-0.5" : "px-3 py-1.5"} text-left text-sm transition-colors ${selected ? "bg-khaki/10 ring-1 ring-khaki" : "hover:bg-card/60"}`}
      title={`${p.name} · ${p.role ?? "—"}`}
    >
      <span className="truncate text-foreground">{p.name}</span>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {p.role ?? "—"}
        <span className="tnum ml-2 text-foreground/70">
          {p.kills}/{p.deaths}
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Player actions panel — same actions as the standalone map app
// ---------------------------------------------------------------------------

type ActionKind =
  | "message"
  | "punish"
  | "kick"
  | "tban"
  | "pban"
  | "vip"
  | "watch"
  | "switch"
  | "switchOnDeath";

function PlayerActionsPanel({ p, onClose }: { p: RconPlayer; onClose: () => void }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["live-map", "players"] });

  const [open, setOpen] = useState<ActionKind | null>(null);
  const [text, setText] = useState("");
  const [hours, setHours] = useState(2);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const reset = () => {
    setOpen(null);
    setText("");
  };

  const run = useMutation({
    mutationFn: async (): Promise<{ ok: boolean; message: string }> => {
      switch (open) {
        case "message":
          return messagePlayer({
            data: { player_id: p.player_id, player_name: p.name, message: text },
          });
        case "punish":
          return punishPlayer({
            data: { player_id: p.player_id, player_name: p.name, reason: text },
          });
        case "kick":
          return kickPlayer({
            data: { player_id: p.player_id, player_name: p.name, reason: text },
          });
        case "tban":
          return tempBanPlayer({
            data: {
              player_id: p.player_id,
              player_name: p.name,
              duration_hours: hours,
              reason: text,
            },
          });
        case "pban":
          return permaBanPlayer({
            data: { player_id: p.player_id, player_name: p.name, reason: text },
          });
        case "vip":
          return addVipPlayer({
            data: { player_id: p.player_id, description: text || p.name },
          });
        case "watch":
          return watchPlayer({
            data: { player_id: p.player_id, player_name: p.name, reason: text || "Watch" },
          });
        case "switch":
          return switchPlayerNow({ data: { player_name: p.name } });
        case "switchOnDeath":
          return switchPlayerOnDeath({ data: { player_name: p.name } });
        default:
          return { ok: false, message: "no action" };
      }
    },
    onSuccess: (r) => {
      setResult(r);
      if (r.ok) {
        invalidate();
        reset();
      }
    },
    onError: (err) => setResult({ ok: false, message: (err as Error).message }),
  });

  const needsText = open !== null && !["switch", "switchOnDeath", "vip"].includes(open);
  const placeholders: Record<ActionKind, string> = {
    message: "Message to player…",
    punish: "Reason (kill)",
    kick: "Reason for kick",
    tban: "Reason for temp ban",
    pban: "Reason for PERMA ban",
    vip: "VIP description (optional)",
    watch: "Why are we watching them?",
    switch: "",
    switchOnDeath: "",
  };

  const trigger = (k: ActionKind) => {
    setResult(null);
    if (k === "switch" || k === "switchOnDeath") {
      setOpen(k);
      setTimeout(() => run.mutate(), 0);
      return;
    }
    setOpen(k);
    setText("");
  };

  const stat = (label: string, value: string | number) => (
    <div key={label}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="tnum font-mono text-sm text-foreground">{value}</div>
    </div>
  );

  return (
    <div className="mt-4 border hairline bg-card">
      <div className="flex items-start justify-between gap-3 border-b hairline bg-background/40 px-4 py-3">
        <div>
          <div className="eyebrow">SELECTED PLAYER</div>
          <div className="mt-1 font-mono text-base text-foreground">{p.name}</div>
          <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {p.team ?? "—"} · {p.role ?? "—"} · {p.unit_name ?? "—"} · lvl {p.level ?? "?"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-rust"
        >
          Close ✕
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 py-3 sm:grid-cols-6">
        {stat("Kills", p.kills)}
        {stat("Deaths", p.deaths)}
        {stat("K/D", p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : String(p.kills))}
        {stat("Combat", p.combat)}
        {stat("Offense", p.offense)}
        {stat("Defense", p.defense)}
        {stat("Support", p.support)}
        {p.loadout && stat("Loadout", p.loadout)}
      </div>

      <div className="flex flex-wrap gap-1 border-t hairline bg-background/40 px-4 py-3">
        <ActionBtn label="Msg" onClick={() => trigger("message")} />
        <ActionBtn label="Punish" onClick={() => trigger("punish")} tone="warn" />
        <ActionBtn label="Watch" onClick={() => trigger("watch")} />
        <ActionBtn label="Switch" onClick={() => trigger("switch")} />
        <ActionBtn label="SwOnDie" onClick={() => trigger("switchOnDeath")} />
        <ActionBtn label="VIP" onClick={() => trigger("vip")} />
        <ActionBtn label="Kick" onClick={() => trigger("kick")} tone="warn" />
        <ActionBtn label="T-Ban" onClick={() => trigger("tban")} tone="danger" />
        <ActionBtn label="P-Ban" onClick={() => trigger("pban")} tone="danger" />
      </div>

      {open && open !== "switch" && open !== "switchOnDeath" && (
        <div className="flex flex-wrap items-center gap-3 border-t hairline bg-background/60 px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-khaki">
            {open}
          </span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholders[open]}
            className="flex-1 min-w-[200px] border hairline bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
          />
          {open === "tban" && (
            <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Hours
              <input
                type="number"
                min={1}
                max={720}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value) || 1)}
                className="w-20 border hairline bg-background px-2 py-1 text-right font-mono text-sm text-foreground outline-none focus:border-khaki"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              if (needsText && !text.trim()) return;
              run.mutate();
            }}
            disabled={(needsText && !text.trim()) || run.isPending}
            className="inline-flex items-center border-2 border-khaki bg-khaki px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50"
          >
            {run.isPending ? "Sending…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-rust hover:text-rust"
          >
            Cancel
          </button>
        </div>
      )}

      {result && (
        <div
          className={`border-t hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] ${
            result.ok ? "text-khaki" : "text-rust"
          }`}
        >
          {result.ok ? "OK" : "Failed"} · {result.message}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "warn" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "border-rust text-rust hover:bg-rust hover:text-background"
      : tone === "warn"
        ? "border-khaki text-khaki hover:bg-khaki hover:text-background"
        : "border-foreground/40 text-foreground hover:border-khaki hover:text-khaki";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center border-2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}
