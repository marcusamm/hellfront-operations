// Staff-only extras for the admin panel: action log, support tickets and the
// GFN seeder-bot controls. Every handler re-checks capabilities server-side.
import { createServerFn } from "@tanstack/react-start";
import type { AdminActionRow, TicketRow } from "./audit.server";

async function staff(): Promise<{ key: string; name: string } | null> {
  const { getSessionUser } = await import("./auth.server");
  const u = await getSessionUser();
  if (!u) return null;
  if (!u.capabilities.includes("rcon") && !u.capabilities.includes("admin")) return null;
  return { key: u.discordId ?? u.id, name: u.username };
}

async function anyUser(): Promise<{
  key: string;
  name: string;
  discordId: string | null;
  steamId: string | null;
} | null> {
  const { getSessionUser } = await import("./auth.server");
  const u = await getSessionUser();
  if (!u) return null;
  return {
    key: u.discordId ?? u.steamId ?? u.epicId ?? u.id,
    name: u.username,
    discordId: u.discordId ?? null,
    steamId: u.steamId ?? null,
  };
}

// --- action log -------------------------------------------------------------

export const getAdminLog = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ status: "ok" | "forbidden"; rows: AdminActionRow[] }> => {
    if (!(await staff())) return { status: "forbidden", rows: [] };
    const { listAdminActions } = await import("./audit.server");
    return { status: "ok", rows: await listAdminActions(150) };
  },
);

// --- support tickets --------------------------------------------------------

export const getStaffTickets = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ status: "ok" | "forbidden"; tickets: TicketRow[] }> => {
    if (!(await staff())) return { status: "forbidden", tickets: [] };
    const { listTickets } = await import("./audit.server");
    return { status: "ok", tickets: await listTickets() };
  },
);

export const updateStaffTicket = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status?: string; staffReply?: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const me = await staff();
    if (!me) return { ok: false, message: "Forbidden" };
    const { updateTicket, logAdminAction } = await import("./audit.server");
    const ok = await updateTicket({
      id: data.id,
      ...(data.status ? { status: data.status } : {}),
      ...(data.staffReply !== undefined ? { staffReply: data.staffReply } : {}),
      handledBy: me.name,
    });
    if (ok) {
      await logAdminAction({
        actorKey: me.key,
        actorName: me.name,
        action: "ticket_update",
        targetId: data.id,
        details: { status: data.status ?? null },
      });
    }
    return { ok, message: ok ? "Ticket updated" : "Update failed" };
  });

export const getMyTickets = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ status: "ok" | "anon"; tickets: TicketRow[] }> => {
    const me = await anyUser();
    if (!me) return { status: "anon", tickets: [] };
    const { listTickets } = await import("./audit.server");
    return { status: "ok", tickets: await listTickets({ requesterKey: me.key }) };
  },
);

export const submitTicket = createServerFn({ method: "POST" })
  .inputValidator((d: { category: string; subject: string; message: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const me = await anyUser();
    if (!me) return { ok: false, message: "Sign in to open a ticket" };
    const subject = data.subject.trim().slice(0, 140);
    const message = data.message.trim().slice(0, 4000);
    if (subject.length < 3 || message.length < 5) {
      return { ok: false, message: "Add a subject and a bit more detail" };
    }
    const { createTicket, postWebhook } = await import("./audit.server");
    const row = await createTicket({
      requesterKey: me.key,
      requesterName: me.name,
      discordId: me.discordId,
      steamId: me.steamId,
      category: data.category || "general",
      subject,
      message,
    });
    if (!row) return { ok: false, message: "Could not save the ticket" };
    await postWebhook(
      process.env["SUPPORT_TICKETS_WEBHOOK_URL"],
      `**New support ticket** (${row.category}) from ${me.name}\n**${subject}**\n${message}`,
    );
    return { ok: true, message: "Ticket submitted — staff will pick it up" };
  });

// --- GFN seeder bots --------------------------------------------------------

export type SeederResult = {
  status: "ok" | "forbidden" | "unconfigured" | "error";
  message?: string;
  data?: string;
};

async function botsFetch(path: string, init?: RequestInit): Promise<SeederResult> {
  const base = process.env["BOTS_API_URL"];
  if (!base) {
    return {
      status: "unconfigured",
      message: "BOTS_API_URL is not set — add it to point at your seeder-bot API.",
    };
  }
  const token = process.env["BOTS_API_TOKEN"];
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init?.body) headers.set("content-type", "application/json");
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    if (!res.ok) return { status: "error", message: `Bots API ${res.status}: ${text.slice(0, 300)}` };
    let pretty = text;
    try {
      pretty = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      /* plain text response */
    }
    return { status: "ok", data: pretty };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export const getSeederStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<SeederResult> => {
    if (!(await staff())) return { status: "forbidden", message: "Forbidden" };
    return botsFetch("/api/status");
  },
);

const SEEDER_ACTIONS = new Set(["start", "stop", "restart"]);

export const seederControl = createServerFn({ method: "POST" })
  .inputValidator((d: { action: string; count?: number }) => d)
  .handler(async ({ data }): Promise<SeederResult> => {
    const me = await staff();
    if (!me) return { status: "forbidden", message: "Forbidden" };
    if (!SEEDER_ACTIONS.has(data.action)) return { status: "error", message: "Unknown action" };
    const res = await botsFetch(`/api/${data.action}`, {
      method: "POST",
      body: JSON.stringify(data.count ? { count: data.count } : {}),
    });
    if (res.status === "ok") {
      const { logAdminAction } = await import("./audit.server");
      await logAdminAction({
        actorKey: me.key,
        actorName: me.name,
        action: `seeder_${data.action}`,
        details: data.count ? { count: data.count } : {},
      });
    }
    return res;
  });
