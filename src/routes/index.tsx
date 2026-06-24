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
import { getServers } from "@/lib/battlemetrics.functions";

const SERVER_IDS = ["38460828"];

const serversQueryOptions = queryOptions({
  queryKey: ["battlemetrics", "servers", SERVER_IDS],
  queryFn: () => getServers({ data: { ids: SERVER_IDS } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Objective First — Elite Hell Let Loose Community" },
      { name: "description", content: "Join one of the most organized Hell Let Loose communities. Active leadership, structured teamwork, competitive operations, and dedicated servers." },
      { property: "og:title", content: "Objective First — Elite Hell Let Loose Community" },
      { property: "og:description", content: "Organized teamwork, active leadership, and competitive Hell Let Loose operations." },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(serversQueryOptions),
  component: Index,
});


function Index() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />
      <Hero />
      <Stats />
      <WhyJoin />
      <Servers />
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

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b hairline">
      <img
        src={heroImg}
        alt="Hell Let Loose battlefield at dusk"
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        width={1920}
        height={1280}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      <div className="absolute inset-0 grid-tactical opacity-30" />

      <div className="relative mx-auto max-w-7xl px-5 pt-20 pb-28 md:pt-32 md:pb-40">
        <div className="flex items-center gap-4">
          <span className="h-px w-12 bg-khaki" />
          <span className="eyebrow">OPS BRIEF · 06.24.2026</span>
        </div>

        <h1 className="mt-6 max-w-4xl text-5xl leading-[0.95] text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
          Fight with the <span className="text-khaki">best</span><br />
          Hell Let Loose<br />
          community.
        </h1>

        <p className="mt-7 max-w-xl text-base text-muted-foreground md:text-lg">
          Organized teamwork. Active leadership. Competitive gameplay. Objective First is
          one of the strongest, most disciplined communities in Hell Let Loose — and we're
          recruiting.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
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
            className="inline-flex items-center gap-3 border-2 border-foreground/30 bg-transparent px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
          >
            View Servers →
          </Link>
        </div>

        <div className="mt-16 grid max-w-3xl grid-cols-2 gap-px border hairline bg-border/40 sm:grid-cols-4">
          {[
            ["2026", "Founded"],
            ["3", "Dedicated Servers"],
            ["12+", "Ops Per Month"],
            ["24/7", "Command Online"],
          ].map(([v, l]) => (
            <div key={l} className="bg-background/80 px-4 py-4 backdrop-blur">
              <div className="stencil text-2xl text-khaki">{v}</div>
              <div className="eyebrow mt-1 text-[10px]">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { v: "2,847", l: "Active Members" },
    { v: "8,420", l: "Discord Members" },
    { v: "14", l: "Monthly Operations" },
    { v: "187", l: "Avg Server Pop" },
    { v: "2026", l: "Founded" },
  ];
  return (
    <section className="border-b hairline bg-card/30">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
          {stats.map((s) => (
            <div key={s.l} className="flex flex-col items-start border-l-2 border-khaki/60 pl-4">
              <div className="font-display text-3xl font-bold text-foreground md:text-4xl">{s.v}</div>
              <div className="eyebrow mt-1 text-[10px]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ index, eyebrow, title, sub }: { index: string; eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-[0.3em] text-khaki">[{index}]</span>
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h2 className="mt-3 text-4xl md:text-5xl">{title}</h2>
      </div>
      {sub && <p className="max-w-md text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function WhyJoin() {
  const items = [
    { n: "01", t: "Experienced Leadership", d: "Veteran officers run every op. Clear comms, clear orders, no chaos." },
    { n: "02", t: "Structured Teamwork", d: "Squad doctrine, role specialization, and tactics that actually win games." },
    { n: "03", t: "Active Community", d: "Daily full servers, voice-active members, and a Discord that never sleeps." },
    { n: "04", t: "Competitive Events", d: "Weekly scrims, monthly campaigns, and a thriving SLB competitive program." },
    { n: "05", t: "New Player Training", d: "Dedicated trainers run weekly bootcamps. Show up. Learn. Promote." },
    { n: "06", t: "Dedicated Servers", d: "Three high-tickrate servers across EU and NA. Always populated. Always ours." },
  ];
  return (
    <section className="relative border-b hairline">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader
          index="01"
          eyebrow="OPERATIONAL DOCTRINE"
          title="Why enlist with us"
          sub="We aren't a casual clan. We're a structured community where teamwork is the standard, not the exception."
        />
        <div className="grid gap-px border hairline bg-border/40 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.n} className="group relative bg-card p-7 transition-colors hover:bg-card/60">
              <div className="stencil text-xs text-khaki/70">{i.n}</div>
              <h3 className="mt-4 text-xl text-foreground">{i.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.d}</p>
              <div className="absolute right-6 top-6 h-px w-8 bg-khaki/40 transition-all group-hover:w-12" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Servers() {
  const { data } = useSuspenseQuery(serversQueryOptions);
  const servers = data.servers;
  return (
    <section id="servers" className="relative border-b hairline bg-card/20">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader
          index="02"
          eyebrow="ACTIVE SERVERS · LIVE"
          title="Dedicated. Populated. Ours."
          sub="Live population pulled directly from BattleMetrics. Refreshed every minute."
        />
        {servers.length === 0 ? (
          <div className="border hairline bg-card p-10 text-center font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Server data temporarily unavailable · Try again shortly
          </div>
        ) : (
          <div className={`grid gap-px border hairline bg-border/40 ${servers.length > 1 ? "lg:grid-cols-3" : ""}`}>
            {servers.map((s) => {
              const online = s.status === "online";
              const battlemetricsUrl = `https://www.battlemetrics.com/servers/hll/${s.id}`;
              return (
                <div key={s.id} className="relative bg-card p-7">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {s.country} · OFFICIAL
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {s.status}
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg text-foreground line-clamp-2">{s.name}</h3>

                  <div className="mt-5 space-y-3 border-t hairline pt-4">
                    <Row label="Population" value={`${s.players}/${s.maxPlayers}`} highlight />
                    <Row label="Current Map" value={s.map} />
                    {s.rank != null && <Row label="Global Rank" value={`#${s.rank}`} />}
                  </div>

                  {/* Population bar */}
                  <div className="mt-5">
                    <div className="h-1.5 w-full overflow-hidden bg-border/60">
                      <div
                        className="h-full bg-khaki transition-all"
                        style={{ width: `${Math.min(100, Math.round((s.players / Math.max(1, s.maxPlayers)) * 100))}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      <span>0</span>
                      <span>{s.maxPlayers}</span>
                    </div>
                  </div>

                  <a
                    href={battlemetricsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center border border-khaki/70 bg-transparent py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-khaki transition-colors hover:bg-khaki hover:text-background"
                  >
                    View on BattleMetrics →
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between font-mono text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-khaki" : "text-foreground"}>{value}</span>
    </div>
  );
}


function Operations() {
  const ops = [
    { d: "JUL 04", t: "OPERATION RED DAWN", type: "Community Battle", who: "60v60 · Cross-clan", time: "20:00 UTC" },
    { d: "JUL 09", t: "Recruit Bootcamp", type: "Training", who: "New members · All welcome", time: "19:00 UTC" },
    { d: "JUL 13", t: "SLB Scrim · Week 4", type: "Competitive", who: "Squad Line Battle · Roster only", time: "21:00 UTC" },
    { d: "JUL 20", t: "Campaign: Bocage", type: "Campaign", who: "3-night operation", time: "20:00 UTC" },
  ];
  return (
    <section id="operations" className="relative border-b hairline">

      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader
          index="03"
          eyebrow="OPERATIONS BOARD"
          title="Upcoming operations"
          sub="Our schedule runs weekly. Show up, follow the briefing, and play with people who care."
        />
        <div className="border hairline">
          {ops.map((o, i) => (
            <div
              key={o.t}
              className={`grid grid-cols-12 items-center gap-4 px-5 py-5 md:px-7 ${
                i !== ops.length - 1 ? "border-b hairline" : ""
              } transition-colors hover:bg-card/50`}
            >
              <div className="col-span-3 md:col-span-2">
                <div className="stencil text-khaki text-base md:text-xl">{o.d}</div>
                <div className="eyebrow mt-1 text-[9px]">{o.time}</div>
              </div>
              <div className="col-span-9 md:col-span-5">
                <h3 className="text-base text-foreground md:text-lg">{o.t}</h3>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{o.type}</div>
              </div>
              <div className="col-span-9 col-start-4 text-sm text-muted-foreground md:col-span-4 md:col-start-auto">{o.who}</div>
              <div className="col-span-3 text-right md:col-span-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-khaki">RSVP →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const tiles = [
    { src: frontline1.url, label: "FOREST PATROL", span: "md:col-span-2 md:row-span-2" },
    { src: frontline2.url, label: "TRENCH LINE" },
    { src: frontline3.url, label: "VILLAGE ASSAULT" },
    { src: frontline4.url, label: "PLACING OUTPOST", span: "md:col-span-2" },
    { src: frontline5.url, label: "ARMORED RECON", span: "md:col-span-2" },
  ];
  return (
    <section className="relative border-b hairline bg-card/20">

      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader index="04" eyebrow="FIELD ARCHIVE" title="From the front lines" />
        <div className="grid auto-rows-[200px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className={`group relative overflow-hidden border hairline ${t.span ?? ""}`}>
              <img
                src={t.src}
                alt={t.label}
                loading="lazy"
                width={1024}
                height={1024}
                className="h-full w-full object-cover grayscale-[20%] transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-khaki">{t.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">[CLASSIFIED]</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Recruitment() {
  return (
    <section id="recruitment" className="relative isolate border-b hairline overflow-hidden">
      <img src={commandImg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-background/80" />
      <div className="absolute inset-0 grid-tactical opacity-40" />
      <div className="relative mx-auto max-w-7xl px-5 py-28">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <div className="eyebrow">[05] · ENLISTMENT</div>
            <h2 className="mt-3 text-4xl md:text-6xl">
              Ready to <span className="text-khaki">enlist?</span>
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              We accept members who want to play the game properly. No experience required —
              just a working mic, a willingness to learn, and respect for the people you play with.
            </p>
            <a
              href="https://discord.gg/obj1st"
              className="mt-8 inline-flex items-center gap-3 border-2 border-khaki bg-khaki px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki"
            >
              Enlist Today <span aria-hidden>→</span>
            </a>
          </div>

          <div className="border hairline bg-card/70 p-8 backdrop-blur">
            <div className="flex items-center justify-between border-b hairline pb-3">
              <span className="eyebrow">ENLISTMENT REQUIREMENTS</span>
              <span className="font-mono text-[10px] text-muted-foreground">FORM 1-A</span>
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
                  <span className="mt-0.5 w-16 shrink-0 stencil text-xs text-khaki">{k}</span>
                  <span className="text-sm text-muted-foreground">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 border-t hairline pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Process · Discord join → Interview → 2-week trial → Full member
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    { q: "Best HLL community I've found in five years. The structure is real, not just talk.", n: "Sgt. Halverson", r: "Infantry · 2 yrs" },
    { q: "Showed up as a brand new player. Trainers walked me through every role. Now I lead squads.", n: "Cpl. Reyes", r: "Squad Lead · 1 yr" },
    { q: "The SLB program is the most fun I've had in this game. Real tactics. Real stakes.", n: "Lt. Brennan", r: "SLB Roster · 3 yrs" },
  ];
  return (
    <section className="border-b hairline">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader index="06" eyebrow="FIELD REPORTS" title="From the ranks" />
        <div className="grid gap-px border hairline bg-border/40 md:grid-cols-3">
          {quotes.map((q) => (
            <figure key={q.n} className="bg-card p-8">
              <div className="stencil text-3xl text-khaki/60 leading-none">"</div>
              <blockquote className="mt-3 text-base leading-relaxed text-foreground">{q.q}</blockquote>
              <figcaption className="mt-6 border-t hairline pt-4">
                <div className="font-display text-sm uppercase tracking-wider text-foreground">{q.n}</div>
                <div className="eyebrow mt-1 text-[10px]">{q.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "How do I join?", a: "Hop into our Discord, introduce yourself in #recruitment, and a recruiter will run you through a quick interview. From there it's a two-week trial." },
    { q: "Do I need a microphone?", a: "Yes — non-negotiable. Hell Let Loose is a comms-based game and our entire doctrine depends on voice communication." },
    { q: "Is training required?", a: "Not required, but highly recommended. Bootcamps run weekly and they're the fastest path from new player to squad lead." },
    { q: "Which region are your servers in?", a: "We host two EU servers (Frankfurt) and one NA East server (Virginia). All run at 60Hz tickrate." },
    { q: "What's SLB?", a: "Squad Line Battle — our new competitive program. Curated rosters, scheduled scrims, and league-style matches against other top HLL clans." },
    { q: "Is there an age requirement?", a: "18+. We're an adult community and our voice comms reflect that — no kids on the front line." },
  ];
  return (
    <section className="border-b hairline bg-card/20">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <SectionHeader index="07" eyebrow="FREQUENT INTEL REQUESTS" title="FAQ" />
        <div className="border hairline">
          {faqs.map((f, i) => (
            <details key={f.q} className={`group ${i !== faqs.length - 1 ? "border-b hairline" : ""}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-card/50">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] text-khaki">[{String(i + 1).padStart(2, "0")}]</span>
                  <span className="text-base text-foreground md:text-lg">{f.q}</span>
                </div>
                <span className="font-mono text-khaki transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-6 pb-6 pl-16 text-sm leading-relaxed text-muted-foreground">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
