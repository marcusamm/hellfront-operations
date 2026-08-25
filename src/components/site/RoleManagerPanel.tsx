// Admin-only role management: assign roles to accounts and edit which
// permissions each role grants.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSiteRoleFn,
  getAccounts,
  getSiteRoles,
  saveSiteRoleFn,
  setAccountRolesFn,
} from "@/lib/accounts.functions";
import { ALL_CAPABILITIES, type Capability } from "@/lib/auth-config";

const CAP_LABELS: Record<Capability, string> = {
  admin: "Admin panel + role management",
  rcon: "RCON console + live map",
  manageOps: "Manage operations",
  members: "Members-only areas",
  rsvp: "RSVP to operations",
  stats: "Personal + server stats",
};

const chip =
  "inline-flex items-center border-2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-colors";

export function RoleManagerPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => getAccounts() });
  const roles = useQuery({ queryKey: ["site-roles"], queryFn: () => getSiteRoles() });

  const save = useMutation({
    mutationFn: (v: { userId: string; roles: string[] }) => setAccountRolesFn({ data: v }),
    onSuccess: (r) => {
      setNote(r.message);
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (e) => setNote(e instanceof Error ? e.message : "Failed to update roles."),
  });

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = accounts.data ?? [];
    if (!q) return rows;
    return rows.filter((a) =>
      [a.displayName, a.email, a.steamId, a.epicName, a.discordUsername]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [accounts.data, filter]);

  return (
    <div className="space-y-6">
      <div className="border hairline bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline pb-3">
          <div>
            <div className="eyebrow">ACCOUNTS &amp; ROLES</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Click a role to grant or revoke it. Changes apply the next time that member loads a
              page.
            </p>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search name, e-mail, Steam ID…"
            className="w-full max-w-xs border hairline bg-background/60 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-khaki"
          />
        </div>

        {note && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-khaki">{note}</p>
        )}

        {accounts.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading roster…</p>}
        {accounts.isError && (
          <p className="mt-4 text-sm text-destructive">
            Couldn't load accounts — admin access required.
          </p>
        )}

        <div className="mt-4 divide-y divide-foreground/10">
          {list.map((a) => (
            <div key={a.userId} className="py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-bold text-foreground">{a.displayName}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {a.email ?? "no e-mail"}
                  {a.confirmed ? "" : " · unconfirmed"}
                </span>
                {a.steamId && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    steam {a.steamId}
                  </span>
                )}
                {a.discordUsername && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    discord {a.discordUsername}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(roles.data ?? []).map((r) => {
                  const on = a.roles.includes(r.name);
                  return (
                    <button
                      key={r.name}
                      disabled={save.isPending}
                      onClick={() =>
                        save.mutate({
                          userId: a.userId,
                          roles: on ? a.roles.filter((x) => x !== r.name) : [...a.roles, r.name],
                        })
                      }
                      title={r.grants.join(", ") || "no permissions"}
                      className={`${chip} ${
                        on
                          ? "border-khaki bg-khaki text-background"
                          : "border-foreground/25 text-muted-foreground hover:border-khaki hover:text-khaki"
                      } disabled:opacity-50`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
              {a.capabilities.length > 0 && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-khaki/80">
                  {a.capabilities.join(" · ")}
                </p>
              )}
            </div>
          ))}
          {!accounts.isLoading && list.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No accounts match that search.</p>
          )}
        </div>
      </div>

      <RoleEditor onChanged={() => qc.invalidateQueries({ queryKey: ["site-roles"] })} />
    </div>
  );
}

function RoleEditor({ onChanged }: { onChanged: () => void }) {
  const roles = useQuery({ queryKey: ["site-roles"], queryFn: () => getSiteRoles() });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [grants, setGrants] = useState<Capability[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => saveSiteRoleFn({ data: { name, description, grants, sortOrder: 100 } }),
    onSuccess: (r) => {
      setNote(r.message);
      onChanged();
    },
    onError: (e) => setNote(e instanceof Error ? e.message : "Failed to save role."),
  });

  const remove = useMutation({
    mutationFn: (roleName: string) => deleteSiteRoleFn({ data: { name: roleName } }),
    onSuccess: (r) => {
      setNote(r.message);
      onChanged();
    },
  });

  function loadRole(roleName: string) {
    const r = (roles.data ?? []).find((x) => x.name === roleName);
    if (!r) return;
    setName(r.name);
    setDescription(r.description ?? "");
    setGrants(r.grants);
  }

  return (
    <div className="border hairline bg-card p-5">
      <div className="eyebrow">ROLES &amp; PERMISSIONS</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Create a new role or click one to edit what it unlocks.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(roles.data ?? []).map((r) => (
          <button
            key={r.name}
            onClick={() => loadRole(r.name)}
            className={`${chip} border-foreground/25 text-muted-foreground hover:border-khaki hover:text-khaki`}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Role name"
          className="border hairline bg-background/60 px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="border hairline bg-background/60 px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-khaki"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ALL_CAPABILITIES.map((cap) => {
          const on = grants.includes(cap);
          return (
            <button
              key={cap}
              onClick={() =>
                setGrants(on ? grants.filter((g) => g !== cap) : [...grants, cap])
              }
              title={CAP_LABELS[cap]}
              className={`${chip} ${
                on
                  ? "border-khaki bg-khaki text-background"
                  : "border-foreground/25 text-muted-foreground hover:border-khaki hover:text-khaki"
              }`}
            >
              {cap}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => save.mutate()}
          disabled={!name.trim() || save.isPending}
          className="inline-flex items-center border-2 border-khaki bg-khaki px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-khaki disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save role"}
        </button>
        {name.trim() && (
          <button
            onClick={() => remove.mutate(name.trim())}
            className="inline-flex items-center border-2 border-destructive px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-destructive transition-colors hover:bg-destructive hover:text-background"
          >
            Delete role
          </button>
        )}
      </div>
      {note && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-khaki">{note}</p>
      )}
    </div>
  );
}
