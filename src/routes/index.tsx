import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import heroImg from "@/assets/hero-battlefield.jpg";
import frontline1 from "@/assets/frontline-1.png.asset.json";
import frontline2 from "@/assets/frontline-2.png.asset.json";
import frontline3 from "@/assets/frontline-3.jpg.asset.json";
import frontline4 from "@/assets/frontline-4.jpg.asset.json";
import frontline5 from "@/assets/frontline-5.jpg.asset.json";
import commandImg from "@/assets/gallery-command.jpg";
import { SiteHeader, MobileStickyCTA, DiscordIcon } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getServerStatus, getAllServerStatus } from "@/lib/server-status.functions";
import { getGuildStats } from "@/lib/discord.functions";

const serverStatusQueryOptions = queryOptions({
  queryKey: ["crcon", "serverStatus"],
  queryFn: () => getServerStatus(),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

const allServersQueryOptions = queryOptions({
  queryKey: ["crcon", "allServers"],
  queryFn: () => getAllServerStatus(),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

const guildStatsQueryOptions = queryOptions({
  queryKey: ["discord", "guildStats"],
  queryFn: () => getGuildStats(),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Objective First — Elite Hell Let Loose Community" },
      {
        name: "description",
        content:
          "Join one of the most organized Hell Let Loose communities. Active leadership, structured teamwork, competitive operations, and dedicated servers.",
      },
      { property: "og:title", content: "Objective First — Elite Hell Let Loose Community" },
      {
        property: "og:description",
        content:
          "Organized teamwork, active leadership, and competitive Hell Let Loose operations.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(serverStatusQueryOptions),
      context.queryClient.ensureQueryData(allServersQueryOptions),
      context.queryClient.ensureQueryData(guildStatsQueryOptions),
    ]),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />
      <Hero />
      <CommandBento />
      <Doctrine />
      <Operations />
      <Gallery />
      <Recruitment />
      <Testimonials />
      <FAQ />
      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b hairline noise">
      <img
        src={heroImg}
        alt="Hell Let Loose battlefield at dusk"
        className="absolute inset-0 h-full w-full object-cover opacity-40 saturate-[0.7]"
        width={1920}
        height={1280}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/70 to-background/30" />
      <div className="absolute inset-0 jungle-wash" />
      <div className="absolute inset-0 topo opacity-70" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pt-16 pb-20 md:grid-cols-[1.35fr_1fr] md:items-end md:pt-24 md:pb-24">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="stamp off-axis-r text-[10px]">Enlistment Open</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              EU · Hell Let Loose · Est. 2026
            </span>
          </div>

          <h1 className="mt-7 max-w-3xl text-[2.75rem] leading-[0.92] text-foreground sm:text-6xl lg:text-[5.25rem]">
            Hold the line
            <br />
            <span className="text-khaki">with people</span>
            <br />
            who answer back.
          </h1>

          <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground">
            Objective First is a squad-first Hell Let Loose community. Officers who actually lead,
            comms that stay disciplined, and a server that's ours. No filler, no clan drama.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="https://discord.gg/obj1st"
              className="group inline-flex items-center gap-3 border-2 border-khaki bg-khaki px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki"
            >
              <DiscordIcon className="h-4 w-4" />
              Join Discord
            </a>
            <Link
              to="/"
              hash="servers"
              className="inline-flex items-center gap-3 border-b-2 border-khaki/40 px-1 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
            >
              Live server status →
            </Link>
          </div>
        </div>

        <aside className="off-axis ink-edge scanline relative bg-card/80 p-6 backdrop-blur-sm tape">
          <div className="halftone absolute inset-0 opacity-40" />
          <div className="relative">
            <div className="eyebrow text-[10px]">Field card / 01</div>
            <p className="mt-4 font-mono text-[13px] leading-relaxed text-canvas/90">
              &ldquo;Bring a mic and a willingness to be told what to do for ninety minutes. That's
              the whole entry exam.&rdquo;
            </p>
            <div className="mt-5 space-y-2 border-t hairline pt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <div className="flex justify-between">
                <span>Requirement</span>
                <span className="text-khaki">18+ · Mic</span>
              </div>
              <div className="flex justify-between">
                <span>Trial</span>
                <span className="text-khaki">2 weeks</span>
              </div>
              <div className="flex justify-between">
                <span>Region</span>
                <span className="text-khaki">EU</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ------------------------------------------------- live bento (stats + server) */

function CommandBento() {
  const { data: guild } = useSuspenseQuery(guildStatsQueryOptions);
  const { data: fleet } = useSuspenseQuery(allServersQueryOptions);
  const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US"));
  const servers = fleet.servers;
  const onlineCount = servers.filter((s) => s.online).length;
  const totalPct = fleet.totalSlots
    ? Math.min(100, Math.round((fleet.totalPlayers / fleet.totalSlots) * 100))
    : 0;

  return (
    <section id="servers" className="relative border-b hairline bg-card/20">
      <div className="mx-auto max-w-7xl px-5 py-16 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">[02] Situation report · live</div>
            <h2 className="mt-2 text-3xl md:text-4xl">On the ground right now</h2>
          </div>
          <p className="max-w-xs font-mono text-[11px] leading-relaxed uppercase tracking-[0.14em] text-muted-foreground">
            Straight from our own RCON. {servers.length || "—"} servers · refreshed every minute.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {/* total population across the whole fleet */}
          <div className="ink-edge relative overflow-hidden bg-card p-6 md:col-span-2 md:row-span-2">
            <div className="absolute inset-0 topo opacity-60" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-[10px]">Fleet population · all servers</span>
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-khaki">
                  <span
                    className={`h-2 w-2 rounded-full ${onlineCount ? "bg-napalm" : "bg-muted-foreground"}`}
                  />
                  {onlineCount}/{servers.length || "—"} online
                </span>
              </div>

              {servers.length === 0 ? (
                <div className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Server feed temporarily unavailable · retrying
                </div>
              ) : (
                <>
                  <div className="mt-8 flex items-end gap-3">
                    <div className="stencil tnum text-6xl leading-none text-khaki md:text-7xl">
                      {fleet.totalPlayers}
                    </div>
                    <div className="pb-2 font-mono text-sm text-muted-foreground">
                      / {fleet.totalSlots} slots
                    </div>
                  </div>

                  <div className="mt-6 h-2 w-full bg-olive-deep/70">
                    <div
                      className="h-full bg-gradient-to-r from-olive to-napalm transition-all duration-700"
                      style={{ width: `${totalPct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{totalPct}% populated</span>
                    <span className="text-khaki">
                      {servers.filter((s) => s.game === "hllv").length} Vietnam ·{" "}
                      {servers.filter((s) => s.game !== "hllv").length} WWII
                    </span>
                  </div>
                </>
              )}

              <p className="mt-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Our own boxes across EU, UK and both US coasts — WWII and Vietnam. Seeded most
                evenings, full on op nights, moderated by people who actually play on them.
              </p>
            </div>
          </div>

          <BentoStat v={fmt(guild.onlineCount)} l="Members online" accent />
          <BentoStat v={fmt(guild.memberCount)} l="Discord members" />

          <div className="ink-edge relative overflow-hidden bg-olive-deep/40 p-5">
            <div className="halftone absolute inset-0 opacity-50" />
            <div className="relative">
              <div className="stencil text-3xl leading-none text-canvas">
                {servers.length || "—"}
              </div>
              <div className="eyebrow mt-2 text-[10px]">Dedicated servers</div>
              <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                All ours. All moderated by our own admins.
              </p>
            </div>
          </div>

          <Link
            to="/slb"
            className="ink-edge group relative flex flex-col justify-between overflow-hidden bg-card p-5 transition-colors hover:bg-secondary/50"
          >
            <span className="stamp self-start text-[9px]">New</span>
            <div>
              <div className="font-display text-xl uppercase tracking-wide text-foreground">
                SLB
              </div>
              <div className="eyebrow mt-1 text-[10px] group-hover:text-napalm">
                Squad line battle →
              </div>
            </div>
          </Link>
        </div>

        {/* per-server board */}
        {servers.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {servers.map((s) => {
              const pct = Math.min(
                100,
                Math.round((s.players / Math.max(1, s.maxPlayers)) * 100),
              );
              return (
                <article key={s.serverNumber} className="ink-edge relative bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-napalm">
                          #{s.serverNumber}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                          {s.game === "hllv" ? "Vietnam" : "WWII"}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate text-base text-foreground">{s.shortName}</h3>
                    </div>
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.online ? "bg-napalm" : "bg-muted-foreground"}`}
                      title={s.online ? "Online" : "No signal"}
                    />
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="tnum font-display text-3xl font-bold leading-none text-khaki">
                      {s.players}
                      <span className="font-mono text-xs font-normal text-muted-foreground">
                        /{s.maxPlayers}
                      </span>
                    </div>
                    <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {s.map}
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 w-full bg-olive-deep/70">
                    <div
                      className="h-full bg-gradient-to-r from-olive to-napalm transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function BentoStat({ v, l, accent = false }: { v: string; l: string; accent?: boolean }) {
  return (
    <div className="ink-edge relative overflow-hidden bg-card p-5">
      <div className="tnum font-display text-4xl font-bold leading-none text-foreground">{v}</div>
      <div className="eyebrow mt-2 text-[10px]">{l}</div>
      {accent && <div className="mt-4 h-px w-10 bg-napalm" />}
    </div>
  );
}

/* -------------------------------------------------------------- doctrine */

function Doctrine() {
  // Cards are placed to trace a hollow "O" — the Objective First ring.
  const items = [
    {
      n: "01",
      t: "Officers who lead",
      d: "Veterans run every op. Orders are given, acknowledged, and followed. Nobody freelances into a minefield.",
      cell: "sm:col-span-3 sm:row-start-1",
    },
    { n: "02", t: "Squad doctrine", d: "Roles are assigned, not squabbled over.", cell: "sm:col-start-1 sm:row-start-2" },
    { n: "03", t: "Voice-active", d: "A Discord that's loud at 22:00 on a Tuesday.", cell: "sm:col-start-3 sm:row-start-2" },
    { n: "04", t: "Bootcamps weekly", d: "New players get trained, not tolerated.", cell: "sm:col-start-1 sm:row-start-3" },
    {
      n: "05",
      t: "Competitive program",
      d: "Scrims, campaigns, and a curated SLB roster playing other top clans.",
      cell: "sm:col-start-3 sm:row-start-3",
    },
    {
      n: "06",
      t: "Four of our own servers",
      d: "WWII and Vietnam across EU, UK and both US coasts. Always ours.",
      cell: "sm:col-span-3 sm:row-start-4",
    },
  ];
  return (
    <section className="relative border-b hairline">
      <div className="mx-auto max-w-7xl px-5 py-20 md:py-24">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.6fr]">
          <div className="md:sticky md:top-24 md:self-start">
            <div className="eyebrow">[03] Doctrine</div>
            <h2 className="mt-3 text-4xl md:text-5xl">
              How we
              <br />
              actually play
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Not a casual clan tag. A structure that holds when the game gets ugly.
            </p>
            <div className="mt-6 h-px w-24 bg-napalm/70" />
          </div>

          <div className="relative grid gap-3 sm:grid-cols-3 sm:grid-rows-[auto_1fr_1fr_auto]">
            {/* hollow centre of the O */}
            <div
              aria-hidden
              className="pointer-events-none hidden sm:col-start-2 sm:row-start-2 sm:row-end-4 sm:block"
            >
              <div className="relative h-full w-full">
                <div className="absolute inset-3 halftone opacity-20" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="stencil text-4xl leading-none text-khaki/15 md:text-5xl">
                    OBJ
                    <br />
                    1ST
                  </span>
                </div>
              </div>
            </div>

            {items.map((i) => (
              <article
                key={i.n}
                className={`ink-edge group relative overflow-hidden bg-card p-6 transition-colors hover:bg-secondary/40 ${i.cell}`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="stencil text-xs text-napalm">{i.n}</span>
                  <h3 className="text-lg text-foreground">{i.t}</h3>
                </div>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {i.d}
                </p>
                <div className="absolute -right-6 -bottom-6 h-16 w-16 rotate-45 border-t hairline opacity-40 transition-transform group-hover:translate-x-1" />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ operations */

function Operations() {
  return (
    <section id="operations" className="relative border-b hairline bg-card/20">
      <div className="mx-auto max-w-7xl px-5 py-20">
        <div className="ink-edge tape relative overflow-hidden bg-card p-10 md:p-14">
          <div className="absolute inset-0 halftone opacity-30" />
          <div className="relative max-w-xl">
            <div className="eyebrow">[04] Operations board</div>
            <div className="stencil mt-4 text-2xl text-khaki/85 md:text-3xl">
              Still under construction
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Scheduled ops, RSVPs and briefings will live here. Until the board is wired up, the
              op calendar runs out of Discord.
            </p>
            <a
              href="https://discord.gg/obj1st"
              className="mt-7 inline-flex items-center gap-2 border-2 border-khaki px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-khaki transition-colors hover:bg-khaki hover:text-background"
            >
              Check Discord →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- gallery */

function Gallery() {
  const tiles = [
    { src: frontline1.url, label: "Forest patrol", span: "md:col-span-3 md:row-span-2" },
    { src: frontline2.url, label: "Trench line", span: "md:col-span-2" },
    { src: frontline3.url, label: "Village assault", span: "md:col-span-1" },
    { src: frontline4.url, label: "Placing outpost", span: "md:col-span-1" },
    { src: frontline5.url, label: "Armored recon", span: "md:col-span-2" },
  ];
  return (
    <section className="relative border-b hairline">
      <div className="mx-auto max-w-7xl px-5 py-20 md:py-24">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="eyebrow">[05] Field archive</div>
            <h2 className="mt-2 text-3xl md:text-4xl">From the front lines</h2>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
            Unedited · in-game
          </span>
        </div>
        <div className="grid auto-rows-[170px] grid-cols-2 gap-2 md:auto-rows-[190px] md:grid-cols-6">
          {tiles.map((t) => (
            <figure
              key={t.label}
              className={`group relative overflow-hidden ink-edge ${t.span ?? ""}`}
            >
              <img
                src={t.src}
                alt={t.label}
                loading="lazy"
                width={1024}
                height={1024}
                className="h-full w-full object-cover saturate-[0.6] transition-all duration-700 group-hover:scale-[1.04] group-hover:saturate-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
              <figcaption className="absolute bottom-3 left-3 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-khaki">
                {t.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- recruitment */

function Recruitment() {
  return (
    <section id="recruitment" className="relative isolate overflow-hidden border-b hairline">
      <img
        src={commandImg}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-15 saturate-[0.5]"
      />
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 jungle-wash" />
      <div className="relative mx-auto max-w-7xl px-5 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="eyebrow">[06] Enlistment</div>
            <h2 className="mt-3 text-4xl md:text-6xl">
              Ready to <span className="text-napalm">enlist?</span>
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              No experience needed. A working mic, a couple of evenings a week, and respect for the
              people next to you. We'll teach the rest.
            </p>
            <a
              href="https://discord.gg/obj1st"
              className="mt-8 inline-flex items-center gap-3 border-2 border-khaki bg-khaki px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki"
            >
              Enlist today <span aria-hidden>→</span>
            </a>
          </div>

          <div className="ink-edge off-axis-r relative bg-card/85 p-8 backdrop-blur">
            <div className="absolute inset-0 halftone opacity-30" />
            <div className="relative">
              <div className="flex items-center justify-between border-b hairline pb-3">
                <span className="eyebrow text-[10px]">Enlistment requirements</span>
                <span className="font-mono text-[10px] text-clay">FORM OF-1</span>
              </div>
              <ul className="mt-5 space-y-4">
                {[
                  ["18+", "Adult community, mature comms"],
                  ["MIC", "Working microphone is mandatory"],
                  ["ACTIVE", "Play at least 1–2 nights per week"],
                  ["RESPECT", "Toxicity earns a one-way ticket out"],
                  ["TEAM", "Squad-first mentality"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-start gap-4">
                    <span className="stencil mt-0.5 w-16 shrink-0 text-xs text-khaki">{k}</span>
                    <span className="text-sm text-muted-foreground">{v}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 border-t hairline pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Discord join → interview → 2-week trial → full member
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- testimonials */

function Testimonials() {
  const quotes = [
    {
      q: "The structure here is real, not just talk. Squads actually hold together when it matters.",
      n: "Halvo",
      r: "Infantry",
      big: true,
    },
    {
      q: "Showed up brand new. Trainers walked me through every role. Now I lead squads.",
      n: "Reyez",
      r: "Squad lead",
    },
    {
      q: "SLB nights are the most fun I've had in this game. Real tactics, real stakes.",
      n: "Brennan",
      r: "SLB roster",
    },
  ];
  return (
    <section className="border-b hairline">
      <div className="mx-auto max-w-7xl px-5 py-20 md:py-24">
        <div className="eyebrow">[07] Field reports</div>
        <h2 className="mt-2 mb-8 text-3xl md:text-4xl">From the ranks</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {quotes.map((q) => (
            <figure
              key={q.n}
              className={`ink-edge relative overflow-hidden bg-card p-7 ${
                q.big ? "md:col-span-2 md:p-10" : ""
              }`}
            >
              {q.big && <div className="absolute inset-0 topo opacity-60" />}
              <blockquote
                className={`relative leading-relaxed text-foreground ${
                  q.big ? "text-xl md:text-2xl" : "text-base"
                }`}
              >
                {q.q}
              </blockquote>
              <figcaption className="relative mt-6 flex items-center gap-3 border-t hairline pt-4">
                <span className="h-6 w-1 bg-napalm" />
                <span className="font-display text-sm uppercase tracking-wider text-foreground">
                  {q.n}
                </span>
                <span className="eyebrow text-[10px]">{q.r}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- faq */

function FAQ() {
  const faqs = [
    {
      q: "How do I join?",
      a: "Hop into our Discord, introduce yourself in #recruitment, and a recruiter will run you through a quick interview. From there it's a two-week trial.",
    },
    {
      q: "Do I need a microphone?",
      a: "Yes — non-negotiable. Hell Let Loose is a comms-based game and our entire doctrine depends on voice communication.",
    },
    {
      q: "Is training required?",
      a: "Not required, but highly recommended. Bootcamps run weekly and they're the fastest path from new player to squad lead.",
    },
    {
      q: "Which regions are your servers in?",
      a: "Four servers: our WWII server in the EU, plus Hell Let Loose Vietnam servers in the UK, US East and US West. All moderated by our own admins.",
    },
    {
      q: "What's SLB?",
      a: "Squad Line Battle — our competitive program. Curated rosters, scheduled scrims, and league-style matches against other top HLL clans.",
    },
    {
      q: "Is there an age requirement?",
      a: "18+. We're an adult community and our voice comms reflect that.",
    },
  ];
  return (
    <section className="border-b hairline bg-card/20">
      <div className="mx-auto max-w-7xl px-5 py-20 md:py-24">
        <div className="grid gap-10 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <div className="eyebrow">[08] Common questions</div>
            <h2 className="mt-2 text-3xl md:text-4xl">Before you ask</h2>
          </div>
          <div className="ink-edge">
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className={`group ${i !== faqs.length - 1 ? "border-b hairline" : ""}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 transition-colors hover:bg-secondary/40">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-napalm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base text-foreground">{f.q}</span>
                  </div>
                  <span className="font-mono text-khaki transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pl-14 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
