// ---------------------------------------------------------------------------
// SERVER-ONLY. Permanent account links.
//
// CRCON / Discord lookups are caches that can go stale or be rate limited. Once
// a member has linked Discord + Steam (or Epic) we persist that pairing in our
// own database so the link survives sign-outs, cookie loss and CRCON downtime.
// The table is only reachable with the service role — never from the browser.
// ---------------------------------------------------------------------------

export type StoredLink = {
  discordId: string;
  discordUsername: string | null;
  steamId: string | null;
  epicId: string | null;
  epicName: string | null;
};

type Row = {
  discord_id: string;
  discord_username: string | null;
  steam_id: string | null;
  epic_id: string | null;
  epic_name: string | null;
};

function toLink(row: Row): StoredLink {
  return {
    discordId: row.discord_id,
    discordUsername: row.discord_username,
    steamId: row.steam_id,
    epicId: row.epic_id,
    epicName: row.epic_name,
  };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Look the permanent link up by Discord id. */
export async function getLinkByDiscordId(discordId: string): Promise<StoredLink | null> {
  try {
    const db = await admin();
    const { data, error } = await db
      .from("account_links")
      .select("discord_id, discord_username, steam_id, epic_id, epic_name")
      .eq("discord_id", discordId)
      .maybeSingle();
    if (error) throw error;
    return data ? toLink(data as Row) : null;
  } catch (err) {
    console.error("[link-store] read by discord failed:", err);
    return null;
  }
}

/** Look the permanent link up by a game account id (Steam64 or Epic/EOS id). */
export async function getLinkByGameId(gameId: string): Promise<StoredLink | null> {
  try {
    const db = await admin();
    const { data, error } = await db
      .from("account_links")
      .select("discord_id, discord_username, steam_id, epic_id, epic_name")
      .or(`steam_id.eq.${gameId},epic_id.eq.${gameId}`)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toLink(data as Row) : null;
  } catch (err) {
    console.error("[link-store] read by game id failed:", err);
    return null;
  }
}

/**
 * Persist / refresh a link. Only fills fields we actually know — a null never
 * erases an id that was stored earlier, so a link is effectively permanent.
 */
export async function saveLink(input: {
  discordId: string;
  discordUsername?: string | null;
  steamId?: string | null;
  epicId?: string | null;
  epicName?: string | null;
}): Promise<void> {
  if (!input.discordId) return;
  try {
    const db = await admin();
    const existing = await getLinkByDiscordId(input.discordId);
    const row = {
      discord_id: input.discordId,
      discord_username: input.discordUsername ?? existing?.discordUsername ?? null,
      steam_id: input.steamId ?? existing?.steamId ?? null,
      epic_id: input.epicId ?? existing?.epicId ?? null,
      epic_name: input.epicName ?? existing?.epicName ?? null,
    };
    const { error } = await db.from("account_links").upsert(row, { onConflict: "discord_id" });
    if (error) throw error;
  } catch (err) {
    console.error("[link-store] save failed:", err);
  }
}
