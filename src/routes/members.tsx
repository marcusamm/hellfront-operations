import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { SiteHeader, MobileStickyCTA } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { currentUserQueryOptions, useAuth } from "@/lib/auth-client";
import { MyStatsPanel } from "@/components/site/MyStatsPanel";
import { SupportTickets } from "@/components/site/SupportTickets";

export const Route = createFileRoute("/members")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);
    if (!user) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [{ title: "Members Area — Objective First" }],
  }),
  component: MembersPage,
});

function MembersPage() {
  const { user, can } = useAuth();
  if (!user) return null;

  const hasMemberAccess = can("members");

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-12">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-khaki" />
            <span className="eyebrow">RESTRICTED · MEMBERS AREA</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 border-2 border-khaki object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center border-2 border-khaki bg-olive-deep stencil text-khaki">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl">{user.username}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.roleNames.length > 0 ? (
                  user.roleNames.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center border border-khaki/60 bg-khaki/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-khaki"
                    >
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    No roles assigned
                  </span>
                )}
              </div>
            </div>
            <a
              href="/auth/logout"
              className="ml-auto inline-flex items-center border-2 border-foreground/30 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-rust hover:text-rust"
            >
              Sign Out
            </a>
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="stencil text-xs text-khaki/70">00</span>
            <h2 className="text-2xl text-foreground md:text-3xl">Linked accounts</h2>
          </div>
          <div className="grid gap-px border hairline bg-border/40 sm:grid-cols-3">
            <AccountCard
              label="Discord"
              linked={!!user.discordId}
              value={
                user.discordId
                  ? `${user.username}${user.isMember ? " · in server" : " · not in server"}`
                  : null
              }
              detail={user.discordId ? user.roleNames.join(", ") || "No roles" : null}
              href="/auth/discord/login"
            />
            <AccountCard
              label="Steam"
              linked={!!user.steamId}
              value={user.steamId ?? null}
              href="/auth/steam/login"
            />
            <AccountCard
              label="Epic Games"
              linked={!!user.epicId}
              value={user.epicName ?? user.epicId ?? null}
              href="/auth/epic/login"
            />
          </div>
        </div>
      </section>

      <section id="my-stats" className="border-b hairline scroll-mt-24">

        <div className="mx-auto max-w-7xl px-5 py-12">
          <div className="mb-6 flex items-center gap-3">
            <span className="stencil text-xs text-khaki/70">00</span>
            <h2 className="text-2xl text-foreground md:text-3xl">My Stats</h2>
            {user.steamId && (
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Steam linked
              </span>
            )}
          </div>
          <MyStatsPanel />
        </div>
      </section>

      <section id="support" className="border-b hairline scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <div className="mb-6 flex items-center gap-3">
            <span className="stencil text-xs text-khaki/70">00</span>
            <h2 className="text-2xl text-foreground md:text-3xl">Support</h2>
          </div>
          <SupportTickets />
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-5 py-16">
          {!hasMemberAccess ? (
            <div className="border hairline bg-card p-8">
              <h2 className="text-2xl text-foreground">Access pending</h2>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                You're signed in, but your current Discord roles don't grant members access yet.
                Once you've been given a member role in the Discord server, it'll show up here
                automatically next time you sign in.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center border-2 border-khaki px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-khaki transition-colors hover:bg-khaki hover:text-background"
              >
                ← Back to base
              </Link>
            </div>
          ) : (
            <div className="grid gap-px border hairline bg-border/40 sm:grid-cols-2 lg:grid-cols-3">
              <MemberCard
                show
                index="01"
                title="Briefings"
                desc="Members-only operation briefings, maps, and battle plans."
                cta="Open briefings"
              />
              <MemberCard
                show={can("rsvp")}
                index="02"
                title="Operation RSVP"
                desc="Confirm your attendance for upcoming operations."
                cta="Manage RSVPs"
              />
              <MemberCard
                show={can("stats")}
                index="03"
                title="Performance Stats"
                desc="Per-player leaderboard from your last 30 games."
                cta="Open leaderboard"
                to="/stats"
              />
              <MemberCard
                show={can("manageOps")}
                index="04"
                title="Operations Board"
                desc="Create and edit operations on the public schedule."
                cta="Manage operations"
              />
              <MemberCard
                show={can("rcon")}
                index="05"
                title="RCON Console"
                desc="Live game-server control: message, kick, ban, broadcast, welcome."
                cta="Open RCON"
                to="/rcon"
              />
              <MemberCard
                show={can("admin")}
                index="06"
                title="Admin Panel"
                desc="Live tactical map and site-wide admin tools."
                cta="Open admin"
                to="/admin"
              />

            </div>
          )}
        </div>
      </section>

      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}

function MemberCard({
  show,
  index,
  title,
  desc,
  cta,
  to,
}: {
  show: boolean;
  index: string;
  title: string;
  desc: string;
  cta: string;
  to?: string;
}) {
  if (!show) return null;
  return (
    <div className="group relative bg-card p-7">
      <div className="stencil text-xs text-khaki/70">{index}</div>
      <h3 className="mt-4 text-xl text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      {to ? (
        <a
          href={to}
          className="mt-6 inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-khaki transition-colors hover:text-foreground"
        >
          {cta} →
        </a>
      ) : (
        <div className="mt-6 inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-khaki/70">
          {cta} · soon
        </div>
      )}
    </div>
  );
}

function AccountCard({
  label,
  linked,
  value,
  detail,
  href,
}: {
  label: string;
  linked: boolean;
  value: string | null;
  detail?: string | null;
  href: string;
}) {
  return (
    <div className="bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
          {label}
        </span>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
            linked ? "text-khaki" : "text-muted-foreground"
          }`}
        >
          {linked ? "Linked" : "Not linked"}
        </span>
      </div>
      <p className="mt-3 break-all text-sm text-muted-foreground">
        {value ?? "Connect this account to pull your details and stats."}
      </p>
      {detail ? (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-khaki/70">
          {detail}
        </p>
      ) : null}
      <a
        href={href}
        className="mt-5 inline-flex items-center border border-khaki/60 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-khaki transition-colors hover:bg-khaki hover:text-background"
      >
        {linked ? "Reconnect" : `Connect ${label}`}
      </a>
    </div>
  );
}
