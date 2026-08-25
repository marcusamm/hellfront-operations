// Staff-only panels: seeder bots, support tickets and the admin action log.
// Every server fn behind these re-checks the caller's staff capability.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getAdminLog,
  getSeederStatus,
  getStaffTickets,
  seederControl,
  updateStaffTicket,
} from "@/lib/admin-extras.functions";

const btn =
  "inline-flex items-center border-2 border-khaki bg-khaki px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50";

// --- Seeder ----------------------------------------------------------------

export function SeederPanel() {
  const [count, setCount] = useState(6);
  const [note, setNote] = useState("");
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["seeder-status"],
    queryFn: () => getSeederStatus(),
    refetchInterval: 15_000,
  });

  const control = useMutation({
    mutationFn: (action: "start" | "stop" | "restart") =>
      seederControl({ data: { action, count } }),
    onSuccess: (r) => {
      setNote(r.status === "ok" ? "Command sent." : (r.message ?? "Failed"));
      qc.invalidateQueries({ queryKey: ["seeder-status"] });
    },
  });

  return (
    <div>
      <div className="eyebrow">SEEDER BOTS</div>
      <h2 className="mt-1 text-2xl text-foreground">Auto-seeder control</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Starts, stops and restarts the GFN seeding bots that populate an empty
        server. Talks to your bots API over HTTPS.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border hairline bg-card p-5">
          <div className="eyebrow">CONTROLS</div>
          <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Bot count
          </label>
          <input
            type="number"
            min={1}
            max={40}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
            className="mt-2 w-28 border hairline bg-background/60 p-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={btn}
              disabled={control.isPending}
              onClick={() => control.mutate("start")}
            >
              Start
            </button>
            <button
              className={btnGhost}
              disabled={control.isPending}
              onClick={() => control.mutate("restart")}
            >
              Restart
            </button>
            <button
              className={btnGhost}
              disabled={control.isPending}
              onClick={() => control.mutate("stop")}
            >
              Stop
            </button>
          </div>
          {note && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-khaki">
              {note}
            </p>
          )}
        </div>

        <div className="border hairline bg-card p-5">
          <div className="eyebrow">LIVE STATUS</div>
          {status.isLoading && (
            <p className="mt-3 text-sm text-muted-foreground">Contacting bots API…</p>
          )}
          {status.data?.status === "unconfigured" && (
            <p className="mt-3 text-sm text-muted-foreground">{status.data.message}</p>
          )}
          {status.data?.status === "error" && (
            <p className="mt-3 text-sm text-rust">{status.data.message}</p>
          )}
          {status.data?.status === "forbidden" && (
            <p className="mt-3 text-sm text-rust">Staff access required.</p>
          )}
          {status.data?.status === "ok" && (
            <pre className="mt-3 max-h-72 overflow-auto border hairline bg-background/60 p-3 font-mono text-[11px] text-foreground">
              {status.data.data}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Support tickets --------------------------------------------------------

const STATUSES = ["open", "in_progress", "closed"] as const;

export function TicketsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("open");
  const [replies, setReplies] = useState<Record<string, string>>({});

  const tickets = useQuery({
    queryKey: ["staff-tickets"],
    queryFn: () => getStaffTickets(),
    refetchInterval: 30_000,
  });

  const update = useMutation({
    mutationFn: (v: { id: string; status?: string; staffReply?: string }) =>
      updateStaffTicket({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-tickets"] }),
  });

  const rows = (tickets.data?.tickets ?? []).filter(
    (t) => filter === "all" || t.status === filter,
  );

  return (
    <div>
      <div className="eyebrow">SUPPORT TICKETS</div>
      <h2 className="mt-1 text-2xl text-foreground">Member ticket queue</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Tickets opened by members from their profile page. Reply and set a status —
        the member sees both.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {["open", "in_progress", "closed", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? btn : btnGhost}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {tickets.data?.status === "forbidden" && (
        <p className="mt-6 text-sm text-rust">Staff access required.</p>
      )}
      {tickets.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {tickets.data?.status === "ok" && rows.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No tickets in this view.</p>
      )}

      <div className="mt-6 space-y-4">
        {rows.map((t) => (
          <div key={t.id} className="border hairline bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {t.category} · {new Date(t.createdAt).toLocaleString()} ·{" "}
                  {t.requesterName ?? "unknown"}
                </div>
                <h3 className="mt-1 text-lg text-foreground">{t.subject}</h3>
              </div>
              <span className="border hairline px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-khaki">
                {t.status.replace("_", " ")}
              </span>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{t.message}</p>

            {t.staffReply && (
              <p className="mt-3 border-l-2 border-khaki pl-3 text-sm text-foreground">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-khaki">
                  {t.handledBy ?? "Staff"}:{" "}
                </span>
                {t.staffReply}
              </p>
            )}

            <textarea
              rows={2}
              value={replies[t.id] ?? ""}
              onChange={(e) => setReplies((p) => ({ ...p, [t.id]: e.target.value }))}
              placeholder="Reply to the member…"
              className="mt-4 w-full resize-none border hairline bg-background/60 p-3 font-mono text-sm text-foreground outline-none focus:border-khaki"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={btn}
                disabled={update.isPending || !(replies[t.id] ?? "").trim()}
                onClick={() =>
                  update.mutate({ id: t.id, staffReply: replies[t.id] ?? "" })
                }
              >
                Send reply
              </button>
              {STATUSES.filter((s) => s !== t.status).map((s) => (
                <button
                  key={s}
                  className={btnGhost}
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: t.id, status: s })}
                >
                  Mark {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Action log -------------------------------------------------------------

export function ActionLogPanel() {
  const log = useQuery({
    queryKey: ["admin-log"],
    queryFn: () => getAdminLog(),
    refetchInterval: 20_000,
  });

  return (
    <div>
      <div className="eyebrow">AUDIT TRAIL</div>
      <h2 className="mt-1 text-2xl text-foreground">Admin action log</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every kick, ban, punish, broadcast, map change, seeder command and ticket
        update made from this site — who did it, to whom, and when.
      </p>

      {log.data?.status === "forbidden" && (
        <p className="mt-6 text-sm text-rust">Staff access required.</p>
      )}
      {log.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

      {log.data?.status === "ok" && (
        <div className="mt-6 overflow-x-auto border hairline bg-card">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b hairline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="p-3">When</th>
                <th className="p-3">Staff</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {log.data.rows.map((r) => (
                <tr key={r.id} className="border-b hairline align-top text-sm">
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-foreground">{r.actorName ?? "—"}</td>
                  <td className="p-3 font-mono text-[11px] uppercase tracking-[0.14em] text-khaki">
                    {r.action}
                  </td>
                  <td className="p-3 text-foreground">
                    {r.targetPlayer ?? r.targetId ?? "—"}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-muted-foreground">
                    {r.details === "{}" ? "—" : r.details}
                  </td>
                </tr>
              ))}
              {log.data.rows.length === 0 && (
                <tr>
                  <td className="p-4 text-sm text-muted-foreground" colSpan={5}>
                    No actions logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
