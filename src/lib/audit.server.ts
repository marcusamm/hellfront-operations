// ---------------------------------------------------------------------------
// SERVER-ONLY. Admin action log + support ticket store.
//
// Both tables are service-role only — the browser never touches them directly,
// every read/write goes through a capability-checked server function.
// ---------------------------------------------------------------------------

export type AdminActionRow = {
  id: string;
  actorName: string | null;
  action: string;
  targetPlayer: string | null;
  targetId: string | null;
  serverLabel: string | null;
  details: string;
  createdAt: string;
};

export type TicketRow = {
  id: string;
  requesterName: string | null;
  discordId: string | null;
  steamId: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  staffReply: string | null;
  handledBy: string | null;
  createdAt: string;
  updatedAt: string;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Record an admin/mod action. Never throws — logging must not break the action. */
export async function logAdminAction(entry: {
  actorKey: string;
  actorName?: string | null;
  action: string;
  targetPlayer?: string | null;
  targetId?: string | null;
  serverLabel?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = await admin();
    await db.from("admin_action_log").insert({
      actor_key: entry.actorKey,
      actor_name: entry.actorName ?? null,
      action: entry.action,
      target_player: entry.targetPlayer ?? null,
      target_id: entry.targetId ?? null,
      server_label: entry.serverLabel ?? null,
      details: (entry.details ?? {}) as never,
    });
  } catch (err) {
    console.error("[audit] log failed:", err);
  }
}

export async function listAdminActions(limit = 100): Promise<AdminActionRow[]> {
  try {
    const db = await admin();
    const { data, error } = await db
      .from("admin_action_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 300));
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      actorName: (r.actor_name as string | null) ?? null,
      action: r.action as string,
      targetPlayer: (r.target_player as string | null) ?? null,
      targetId: (r.target_id as string | null) ?? null,
      serverLabel: (r.server_label as string | null) ?? null,
      details: JSON.stringify(r.details ?? {}),
      createdAt: r.created_at as string,
    }));
  } catch (err) {
    console.error("[audit] list failed:", err);
    return [];
  }
}

function toTicket(r: Record<string, unknown>): TicketRow {
  return {
    id: r["id"] as string,
    requesterName: (r["requester_name"] as string | null) ?? null,
    discordId: (r["discord_id"] as string | null) ?? null,
    steamId: (r["steam_id"] as string | null) ?? null,
    category: r["category"] as string,
    subject: r["subject"] as string,
    message: r["message"] as string,
    status: r["status"] as string,
    staffReply: (r["staff_reply"] as string | null) ?? null,
    handledBy: (r["handled_by"] as string | null) ?? null,
    createdAt: r["created_at"] as string,
    updatedAt: r["updated_at"] as string,
  };
}

export async function createTicket(input: {
  requesterKey: string;
  requesterName?: string | null;
  discordId?: string | null;
  steamId?: string | null;
  category: string;
  subject: string;
  message: string;
}): Promise<TicketRow | null> {
  try {
    const db = await admin();
    const { data, error } = await db
      .from("support_tickets")
      .insert({
        requester_key: input.requesterKey,
        requester_name: input.requesterName ?? null,
        discord_id: input.discordId ?? null,
        steam_id: input.steamId ?? null,
        category: input.category,
        subject: input.subject,
        message: input.message,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toTicket(data as Record<string, unknown>);
  } catch (err) {
    console.error("[tickets] create failed:", err);
    return null;
  }
}

export async function listTickets(opts: { requesterKey?: string; status?: string } = {}) {
  try {
    const db = await admin();
    let q = db.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (opts.requesterKey) q = q.eq("requester_key", opts.requesterKey);
    if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
    const { data, error } = await q.limit(200);
    if (error) throw error;
    return (data ?? []).map((r) => toTicket(r as Record<string, unknown>));
  } catch (err) {
    console.error("[tickets] list failed:", err);
    return [] as TicketRow[];
  }
}

export async function updateTicket(input: {
  id: string;
  status?: string;
  staffReply?: string | null;
  handledBy?: string | null;
}): Promise<boolean> {
  try {
    const db = await admin();
    const patch: {
      status?: string;
      staff_reply?: string | null;
      handled_by?: string | null;
    } = {};
    if (input.status) patch.status = input.status;
    if (input.staffReply !== undefined) patch.staff_reply = input.staffReply;
    if (input.handledBy !== undefined) patch.handled_by = input.handledBy;
    const { error } = await db.from("support_tickets").update(patch).eq("id", input.id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[tickets] update failed:", err);
    return false;
  }
}

/** Fire-and-forget Discord webhook ping (used for tickets + squad battle sign-ups). */
export async function postWebhook(url: string | undefined, content: string): Promise<void> {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
  } catch (err) {
    console.error("[webhook] post failed:", err);
  }
}
