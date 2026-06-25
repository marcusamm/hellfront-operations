import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getGameState, getRconPlayers, type RconPlayer } from "@/lib/rcon.functions";
import { HLL_MAPS, mapById, normalizeMapId, type HllMap } from "@/lib/hll-maps";

/**
 * In-website Hell Let Loose live tactical map.
 *
 * Pulls live state directly from CRCON through the existing server functions
 * (no separate Node/Socket.io service required). Polls every few seconds.
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
    refetchInterval: 5_000,
  });

  const detected = gs.data?.status === "ok" ? gs.data.current_map ?? null : null;
  const autoId = normalizeMapId(detected);
  const [override, setOverride] = useState<string | null>(null);
  const currentId = override ?? autoId;
  const currentMap = mapById(currentId);

  const error =
    gs.data?.status === "forbidden" || pl.data?.status === "forbidden"
      ? "Forbidden — admin / mod only."
      : gs.data?.status === "error"
        ? gs.data.message
        : pl.data?.status === "error"
          ? pl.data.message
          : null;

  const players: RconPlayer[] =
    pl.data?.status === "ok" ? pl.data.players : [];

  const teams = useMemo(() => groupByTeam(players), [players]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      {/* Map */}
      <div className="border hairline bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline bg-background/40 px-4 py-3">
          <div>
            <div className="eyebrow">CURRENT MAP</div>
            <div className="mt-1 font-mono text-sm text-foreground">
              {currentMap ? currentMap.name : detected ?? "Waiting for live map…"}
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
            allied={gs.data?.status === "ok" ? gs.data.allied_score ?? 0 : 0}
            axis={gs.data?.status === "ok" ? gs.data.axis_score ?? 0 : 0}
            allCount={gs.data?.status === "ok" ? gs.data.num_allied_players ?? 0 : 0}
            axCount={gs.data?.status === "ok" ? gs.data.num_axis_players ?? 0 : 0}
            time={gs.data?.status === "ok" ? gs.data.time_remaining : undefined}
          />
        </div>

        <div className="relative bg-background">
          <MapImage map={currentMap} />
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
            <TeamBlock label="Allies" tone="allied" team={teams.allies} />
            <TeamBlock label="Axis" tone="axis" team={teams.axis} />
            {teams.other.length > 0 && (
              <TeamBlock label="Unassigned" tone="neutral" team={teams.other} />
            )}
            {players.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Server is empty.</div>
            )}
          </div>
        )}
      </div>
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

function MapImage({ map }: { map: HllMap | null }) {
  const [broken, setBroken] = useState(false);
  if (!map || broken) return <MapPlaceholder name={map?.name ?? "Unknown map"} />;
  return (
    <img
      src={map.image}
      alt={`${map.name} tactical map`}
      onError={() => setBroken(true)}
      className="block aspect-square w-full object-cover"
    />
  );
}

function MapPlaceholder({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      role="img"
      aria-label={`${name} map placeholder`}
      className="block aspect-square w-full"
    >
      <defs>
        <pattern id="livemap-grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0H0V100" fill="none" stroke="#4b5563" strokeWidth="2" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="1000" height="1000" fill="#242424" />
      <rect width="1000" height="1000" fill="url(#livemap-grid)" />
      <path
        d="M110 680C210 560 300 610 410 475c130-160 250-105 360-225 55-60 90-78 130-88v730H110Z"
        fill="#3f4d36"
        opacity="0.72"
      />
      <path
        d="M0 360c130 44 210 24 318-38 140-80 236-61 350 24 94 70 195 81 332 22v632H0Z"
        fill="#554f3f"
        opacity="0.5"
      />
      <line x1="500" y1="0" x2="500" y2="1000" stroke="#d6d3c8" strokeWidth="3" opacity="0.45" />
      <line x1="0" y1="500" x2="1000" y2="500" stroke="#d6d3c8" strokeWidth="3" opacity="0.45" />
      <text
        x="500"
        y="495"
        textAnchor="middle"
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize="56"
        fontWeight="700"
        fill="#f3f4f6"
      >
        {name}
      </text>
      <text
        x="500"
        y="555"
        textAnchor="middle"
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize="22"
        fill="#cbd5e1"
      >
        Drop tactical artwork into /public/maps/ to replace this view
      </text>
    </svg>
  );
}

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
  return {
    allies: bySquad(allies),
    axis: bySquad(axis),
    other,
  };
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
}: {
  label: string;
  tone: "allied" | "axis" | "neutral";
  team: TeamGroup | RconPlayer[];
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
          ? team.map((p) => <PlayerLine key={p.player_id} p={p} />)
          : team.squads.map((s) => (
              <div key={s.name} className="px-3 py-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {s.name} <span className="ml-1 text-foreground/60">· {s.players.length}</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {s.players.map((p) => (
                    <PlayerLine key={p.player_id} p={p} compact />
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

function PlayerLine({ p, compact }: { p: RconPlayer; compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 ${compact ? "" : "px-3 py-1.5"} text-sm`}
      title={`${p.name} · ${p.role ?? "—"}`}
    >
      <span className="truncate text-foreground">{p.name}</span>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {p.role ?? "—"}
        <span className="tnum ml-2 text-foreground/70">
          {p.kills}/{p.deaths}
        </span>
      </span>
    </div>
  );
}
