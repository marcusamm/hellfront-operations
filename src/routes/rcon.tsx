import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader, MobileStickyCTA } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { currentUserQueryOptions } from "@/lib/auth-client";
import {
  getRconPlayers,
  messagePlayer,
  kickPlayer,
  tempBanPlayer,
  setBroadcast,
  setWelcomeMessage,
  type RconPlayer,
} from "@/lib/rcon.functions";

export const Route = createFileRoute("/rcon")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);
    if (!user) throw redirect({ to: "/login" });
    if (!user.capabilities.includes("rcon")) throw redirect({ to: "/members" });
  },
  head: () => ({ meta: [{ title: "RCON Console — Objective First" }] }),
  component: RconPage,
});

function RconPage() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-rust" />
            <span className="eyebrow text-rust">RESTRICTED · ADMIN &amp; MOD</span>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl">RCON Console</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Live control of the game server: message, kick, or ban players, and set the
                broadcast / welcome message. Every action is sent to CRCON as{" "}
                <span className="text-khaki">ObjFirst Web</span>.
              </p>
            </div>
            <Link
              to="/members"
              className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
            >
              ← Members
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <MessageBars />
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-5 py-10">
          <PlayersPanel />
        </div>
      </section>

      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}

function MessageBars() {
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

function PlayersPanel() {
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

function PlayerRow({ p }: { p: RconPlayer }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState<null | "message" | "kick" | "ban">(null);
  const [text, setText] = useState("");
  const [hours, setHours] = useState(2);
  const [result, setResult] = useState<string>("");

  const close = () => {
    setOpen(null);
    setText("");
    setResult("");
  };

  const msg = useMutation({
    mutationFn: () =>
      messagePlayer({
        data: { player_id: p.player_id, player_name: p.name, message: text },
      }),
    onSuccess: (r) => setResult(r.ok ? "Sent." : `Failed: ${r.message}`),
  });
  const kick = useMutation({
    mutationFn: () =>
      kickPlayer({ data: { player_id: p.player_id, player_name: p.name, reason: text } }),
    onSuccess: (r) => {
      setResult(r.ok ? "Kicked." : `Failed: ${r.message}`);
      if (r.ok) qc.invalidateQueries({ queryKey: ["rcon", "players"] });
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
      if (r.ok) qc.invalidateQueries({ queryKey: ["rcon", "players"] });
    },
  });

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
          <div className="inline-flex gap-1">
            <ActionBtn label="Msg" onClick={() => setOpen("message")} />
            <ActionBtn label="Kick" onClick={() => setOpen("kick")} tone="warn" />
            <ActionBtn label="Ban" onClick={() => setOpen("ban")} tone="danger" />
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
                placeholder={
                  open === "message"
                    ? "Message to player…"
                    : open === "kick"
                      ? "Reason for kick"
                      : "Reason for ban"
                }
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
                  if (!text.trim()) return;
                  if (open === "message") msg.mutate();
                  else if (open === "kick") kick.mutate();
                  else ban.mutate();
                }}
                disabled={!text.trim() || msg.isPending || kick.isPending || ban.isPending}
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
