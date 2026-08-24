// Shared RCON control panels. Used by both /rcon and the Admin panel.
// Every underlying server fn re-checks the caller's "rcon" capability.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getRconPlayers,
  messagePlayer,
  kickPlayer,
  tempBanPlayer,
  setBroadcast,
  setWelcomeMessage,
  punishPlayer,
  switchPlayerNow,
  switchPlayerOnDeath,
  permaBanPlayer,
  addVipPlayer,
  getGameState,
  getMapRotation,
  changeMap,
  runRawCommand,
  type RconPlayer,
} from "@/lib/rcon.functions";

export function MessageBars() {
  const [broadcast, setBroadcastMsg] = useState("");
  const [welcome, setWelcome] = useState("");
  const [status, setStatus] = useState<string>("");

  const broadcastMut = useMutation({
    mutationFn: (m: string) => setBroadcast({ data: { message: m } }),
    onSuccess: (r) => setStatus(r.ok ? "Broadcast updated." : `Broadcast failed: ${r.message}`),
  });
  const welcomeMut = useMutation({
    mutationFn: (m: string) => setWelcomeMessage({ data: { message: m } }),
    onSuccess: (r) =>
      setStatus(r.ok ? "Welcome message updated." : `Welcome update failed: ${r.message}`),
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="border hairline bg-card p-5">
        <div className="eyebrow">SERVER BROADCAST</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Top-of-screen banner shown to every player in-game.
        </p>
        <textarea
          value={broadcast}
          onChange={(e) => setBroadcastMsg(e.target.value)}
          rows={3}
          className="mt-3 w-full resize-none border hairline bg-background/60 p-3 font-mono text-sm text-foreground outline-none focus:border-khaki"
          placeholder="Match starts in 10 min — pick a squad."
        />
        <button
          onClick={() => broadcastMut.mutate(broadcast)}
          disabled={broadcastMut.isPending || !broadcast.trim()}
          className="mt-3 inline-flex items-center border-2 border-khaki bg-khaki px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50"
        >
          {broadcastMut.isPending ? "Sending…" : "Send broadcast"}
        </button>
      </div>

      <div className="border hairline bg-card p-5">
        <div className="eyebrow">WELCOME MESSAGE</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Shown to players in the connect screen and rule-list.
        </p>
        <textarea
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          rows={3}
          className="mt-3 w-full resize-none border hairline bg-background/60 p-3 font-mono text-sm text-foreground outline-none focus:border-khaki"
          placeholder="Welcome to Objective First — mic + teamwork required."
        />
        <button
          onClick={() => welcomeMut.mutate(welcome)}
          disabled={welcomeMut.isPending || !welcome.trim()}
          className="mt-3 inline-flex items-center border-2 border-khaki bg-khaki px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50"
        >
          {welcomeMut.isPending ? "Updating…" : "Update welcome"}
        </button>
      </div>

      {status && (
        <div className="md:col-span-2 border hairline bg-background/60 p-3 font-mono text-[11px] uppercase tracking-[0.2em] text-khaki">
          {status}
        </div>
      )}
    </div>
  );
}

export function PlayersPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["rcon", "players"],
    queryFn: () => getRconPlayers(),
    refetchInterval: 15_000,
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">LIVE PLAYERS</div>
          <h2 className="mt-1 text-2xl text-foreground">
            On server{" "}
            <span className="text-muted-foreground">
              · {data?.players.length ?? 0} player{data?.players.length === 1 ? "" : "s"}
            </span>
          </h2>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Loading players…
        </div>
      ) : data?.status === "error" ? (
        <div className="mt-6 border hairline bg-card p-4 font-mono text-[11px] uppercase tracking-[0.2em] text-rust">
          {data.message}
        </div>
      ) : data && data.players.length === 0 ? (
        <div className="mt-6 border hairline bg-card p-6 text-sm text-muted-foreground">
          Server is empty.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border hairline">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-card/60 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-3 py-3">Player</th>
                <th className="px-3 py-3">Team</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Unit</th>
                <th className="px-3 py-3 text-right">Lvl</th>
                <th className="px-3 py-3 text-right">K/D</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.players.map((p) => <PlayerRow key={p.player_id} p={p} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type PlayerAction = "message" | "kick" | "ban" | "punish" | "pban" | "vip";

function PlayerRow({ p }: { p: RconPlayer }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState<PlayerAction | null>(null);
  const [text, setText] = useState("");
  const [hours, setHours] = useState(2);
  const [result, setResult] = useState<string>("");

  const close = () => {
    setOpen(null);
    setText("");
    setResult("");
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["rcon", "players"] });

  const msg = useMutation({
    mutationFn: () =>
      messagePlayer({ data: { player_id: p.player_id, player_name: p.name, message: text } }),
    onSuccess: (r) => setResult(r.ok ? "Sent." : `Failed: ${r.message}`),
  });
  const kick = useMutation({
    mutationFn: () =>
      kickPlayer({ data: { player_id: p.player_id, player_name: p.name, reason: text } }),
    onSuccess: (r) => {
      setResult(r.ok ? "Kicked." : `Failed: ${r.message}`);
      if (r.ok) invalidate();
    },
  });
  const ban = useMutation({
    mutationFn: () =>
      tempBanPlayer({
        data: {
          player_id: p.player_id,
          player_name: p.name,
          duration_hours: hours,
          reason: text,
        },
      }),
    onSuccess: (r) => {
      setResult(r.ok ? "Banned." : `Failed: ${r.message}`);
      if (r.ok) invalidate();
    },
  });
  const punish = useMutation({
    mutationFn: () =>
      punishPlayer({ data: { player_id: p.player_id, player_name: p.name, reason: text } }),
    onSuccess: (r) => setResult(r.ok ? "Punished." : `Failed: ${r.message}`),
  });
  const pban = useMutation({
    mutationFn: () =>
      permaBanPlayer({ data: { player_id: p.player_id, player_name: p.name, reason: text } }),
    onSuccess: (r) => {
      setResult(r.ok ? "Perma-banned." : `Failed: ${r.message}`);
      if (r.ok) invalidate();
    },
  });
  const vip = useMutation({
    mutationFn: () =>
      addVipPlayer({ data: { player_id: p.player_id, description: text || p.name } }),
    onSuccess: (r) => setResult(r.ok ? "VIP added." : `Failed: ${r.message}`),
  });
  const switchNow = useMutation({
    mutationFn: () => switchPlayerNow({ data: { player_name: p.name } }),
    onSuccess: (r) => setResult(r.ok ? "Switched." : `Failed: ${r.message}`),
  });
  const switchDeath = useMutation({
    mutationFn: () => switchPlayerOnDeath({ data: { player_name: p.name } }),
    onSuccess: (r) => setResult(r.ok ? "Will switch on death." : `Failed: ${r.message}`),
  });

  const placeholders: Record<PlayerAction, string> = {
    message: "Message to player…",
    kick: "Reason for kick",
    ban: "Reason for temp ban",
    punish: "Reason for punish (kill)",
    pban: "Reason for PERMA ban",
    vip: "VIP description (name / note)",
  };
  const needsText = open !== null && open !== "vip";

  return (
    <>
      <tr className="border-t hairline hover:bg-card/40">
        <td className="max-w-[220px] truncate px-3 py-2.5 text-foreground">{p.name}</td>
        <td className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {p.team ?? "—"}
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">{p.role ?? "—"}</td>
        <td className="px-3 py-2.5 text-muted-foreground">{p.unit_name ?? "—"}</td>
        <td className="tnum px-3 py-2.5 text-right text-muted-foreground">{p.level ?? "—"}</td>
        <td className="tnum px-3 py-2.5 text-right text-foreground">
          {p.kills}/{p.deaths}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="inline-flex flex-wrap justify-end gap-1">
            <ActionBtn label="Msg" onClick={() => setOpen("message")} />
            <ActionBtn label="Punish" onClick={() => setOpen("punish")} tone="warn" />
            <ActionBtn label="Switch" onClick={() => switchNow.mutate()} />
            <ActionBtn label="SwOnDie" onClick={() => switchDeath.mutate()} />
            <ActionBtn label="VIP" onClick={() => setOpen("vip")} />
            <ActionBtn label="Kick" onClick={() => setOpen("kick")} tone="warn" />
            <ActionBtn label="TBan" onClick={() => setOpen("ban")} tone="danger" />
            <ActionBtn label="PBan" onClick={() => setOpen("pban")} tone="danger" />
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-t hairline bg-background/60">
          <td colSpan={7} className="px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-khaki">
                {open} · {p.name}
              </span>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholders[open]}
                className="flex-1 min-w-[200px] border hairline bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
              />
              {open === "ban" && (
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
                onClick={() => {
                  if (needsText && !text.trim()) return;
                  if (open === "message") msg.mutate();
                  else if (open === "kick") kick.mutate();
                  else if (open === "ban") ban.mutate();
                  else if (open === "punish") punish.mutate();
                  else if (open === "pban") pban.mutate();
                  else if (open === "vip") vip.mutate();
                }}
                disabled={needsText && !text.trim()}
                className="inline-flex items-center border-2 border-khaki bg-khaki px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={close}
                className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-rust hover:text-rust"
              >
                Cancel
              </button>
              {result && (
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-khaki">
                  {result}
                </span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function GameStatePanel() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["rcon", "gamestate"],
    queryFn: () => getGameState(),
    refetchInterval: 20_000,
  });
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">GAME STATE</div>
          <h2 className="mt-1 text-2xl text-foreground">Live match</h2>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {isLoading ? (
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Loading…
        </div>
      ) : data?.status !== "ok" ? (
        <div className="mt-4 border hairline bg-card p-3 font-mono text-[11px] uppercase tracking-[0.2em] text-rust">
          {data?.message ?? "Unavailable"}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Current map" value={data.current_map ?? "—"} />
          <Stat label="Next map" value={data.next_map ?? "—"} />
          <Stat
            label="Score (All / Axis)"
            value={`${data.allied_score ?? 0} — ${data.axis_score ?? 0}`}
          />
          <Stat
            label="Players (All / Axis)"
            value={`${data.num_allied_players ?? 0} / ${data.num_axis_players ?? 0}`}
          />
          {data.time_remaining && (
            <Stat label="Time remaining" value={data.time_remaining} />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border hairline bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg text-foreground">{value}</div>
    </div>
  );
}

export function MapRotationPanel() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rcon", "rotation"],
    queryFn: () => getMapRotation(),
  });
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const change = useMutation({
    mutationFn: (map: string) => changeMap({ data: { map_name: map } }),
    onSuccess: (r, map) => {
      setStatus(r.ok ? `Map changed → ${map}` : `Failed: ${r.message}`);
      if (r.ok) qc.invalidateQueries({ queryKey: ["rcon", "gamestate"] });
    },
  });
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">MAP ROTATION</div>
          <h2 className="mt-1 text-2xl text-foreground">
            {data?.maps.length ?? 0} map{data?.maps.length === 1 ? "" : "s"} in rotation
          </h2>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
        >
          Reload
        </button>
      </div>
      {isLoading ? (
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Loading…
        </div>
      ) : data?.status !== "ok" ? (
        <div className="mt-4 border hairline bg-card p-3 font-mono text-[11px] uppercase tracking-[0.2em] text-rust">
          {data?.message ?? "Unavailable"}
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.maps.map((m, i) => (
            <div
              key={`${m.id}-${i}`}
              className="flex items-center justify-between border hairline bg-card px-3 py-2"
            >
              <div className="truncate">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  #{i + 1}
                </div>
                <div className="truncate text-sm text-foreground">{m.pretty_name}</div>
              </div>
              <button
                onClick={() => change.mutate(m.id)}
                disabled={change.isPending}
                className="ml-3 inline-flex items-center border-2 border-khaki px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-khaki transition-colors hover:bg-khaki hover:text-background disabled:opacity-50"
              >
                Set now
              </button>
            </div>
          ))}
        </div>
      )}
      {status && (
        <div className="mt-3 border hairline bg-background/60 p-3 font-mono text-[11px] uppercase tracking-[0.2em] text-khaki">
          {status}
        </div>
      )}
    </div>
  );
}

export function RawCommandPanel() {
  const [path, setPath] = useState("/api/get_status");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [body, setBody] = useState("{}");
  const [out, setOut] = useState<string>("");
  const run = useMutation({
    mutationFn: () => {
      let parsed: Record<string, unknown> = {};
      if (method === "POST") {
        try {
          parsed = JSON.parse(body || "{}");
        } catch {
          throw new Error("Body must be valid JSON");
        }
      }
      return runRawCommand({ data: { path, method, body: parsed } });
    },
    onSuccess: (r) => setOut(r.ok ? (r.data ?? "(empty)") : `ERROR: ${r.message}`),
    onError: (e) => setOut(`ERROR: ${(e as Error).message}`),
  });
  return (
    <div>
      <div className="eyebrow">RAW CRCON COMMAND</div>
      <h2 className="mt-1 text-2xl text-foreground">Power user · any endpoint</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Hits any CRCON HTTP endpoint with the server&apos;s authenticated session. GET for queries
        like <code className="text-khaki">/api/get_status</code>, POST + JSON body for actions.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[120px_1fr]">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
          className="border hairline bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/api/get_status"
          className="border hairline bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
        />
        {method === "POST" && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="md:col-span-2 resize-y border hairline bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
          />
        )}
      </div>
      <button
        onClick={() => run.mutate()}
        disabled={run.isPending || !path.trim()}
        className="mt-3 inline-flex items-center border-2 border-khaki bg-khaki px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50"
      >
        {run.isPending ? "Running…" : "Run command"}
      </button>
      {out && (
        <pre className="mt-4 max-h-[420px] overflow-auto border hairline bg-background/60 p-3 font-mono text-[11px] text-foreground">
          {out}
        </pre>
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
  const color =
    tone === "danger"
      ? "border-rust text-rust hover:bg-rust hover:text-background"
      : tone === "warn"
        ? "border-khaki text-khaki hover:bg-khaki hover:text-background"
        : "border-foreground/30 text-foreground hover:border-khaki hover:text-khaki";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${color}`}
    >
      {label}
    </button>
  );
}
