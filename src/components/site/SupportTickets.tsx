// Member-facing support tickets: open a ticket and follow staff replies.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyTickets, submitTicket } from "@/lib/admin-extras.functions";

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "report", label: "Report a player" },
  { id: "ban_appeal", label: "Ban appeal" },
  { id: "technical", label: "Technical" },
];

export function SupportTickets() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

  const mine = useQuery({ queryKey: ["my-tickets"], queryFn: () => getMyTickets() });

  const send = useMutation({
    mutationFn: () => submitTicket({ data: { category, subject, message } }),
    onSuccess: (r) => {
      setNote(r.message);
      if (r.ok) {
        setSubject("");
        setMessage("");
        qc.invalidateQueries({ queryKey: ["my-tickets"] });
      }
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="border hairline bg-card p-5">
        <div className="eyebrow">OPEN A TICKET</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Report a player, appeal a ban or ask staff anything. Admins answer from the
          command panel.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`inline-flex items-center border-2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                category === c.id
                  ? "border-khaki bg-khaki text-background"
                  : "border-foreground/30 text-foreground hover:border-khaki hover:text-khaki"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="mt-4 w-full border hairline bg-background/60 p-3 font-mono text-sm text-foreground outline-none focus:border-khaki"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="What happened? Include names, times and server if relevant."
          className="mt-3 w-full resize-none border hairline bg-background/60 p-3 font-mono text-sm text-foreground outline-none focus:border-khaki"
        />
        <button
          onClick={() => send.mutate()}
          disabled={send.isPending || !subject.trim() || !message.trim()}
          className="mt-3 inline-flex items-center border-2 border-khaki bg-khaki px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50"
        >
          {send.isPending ? "Sending…" : "Submit ticket"}
        </button>
        {note && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-khaki">{note}</p>
        )}
      </div>

      <div className="border hairline bg-card p-5">
        <div className="eyebrow">MY TICKETS</div>
        {mine.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {mine.data?.tickets.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">You haven't opened any tickets.</p>
        )}
        <div className="mt-3 space-y-4">
          {(mine.data?.tickets ?? []).map((t) => (
            <div key={t.id} className="border-l-2 border-khaki/50 pl-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {new Date(t.createdAt).toLocaleDateString()} · {t.status.replace("_", " ")}
              </div>
              <div className="mt-1 text-sm text-foreground">{t.subject}</div>
              {t.staffReply && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-khaki">{t.handledBy ?? "Staff"}: </span>
                  {t.staffReply}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
