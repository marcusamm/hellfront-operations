import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/vietnam")({
  head: () => ({
    meta: [
      { title: "Vietnam · Objective First" },
      {
        name: "description",
        content:
          "Objective First runs dedicated Hell Let Loose Vietnam servers. Jungle warfare, napalm, Hueys, and the same squad-first discipline.",
      },
      { property: "og:title", content: "Vietnam · Objective First" },
      {
        property: "og:description",
        content:
          "Dedicated Hell Let Loose Vietnam servers. Jungle warfare with structured teamwork.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VietnamPage,
});

const FEATURES = [
  {
    n: "01",
    t: "Jungle maps",
    d: "Dense foliage, river crossings, tunnel networks and open rice paddies. Every map demands different tactics.",
  },
  {
    n: "02",
    t: "Helicopter assault",
    d: "Huey insertions, fast rope drops and hot LZs. Coordination between pilots and ground squads wins rounds.",
  },
  {
    n: "03",
    t: "Flame & napalm",
    d: "Area denial changes the tempo. Smoke, fire and defoliation force both teams to adapt on the fly.",
  },
  {
    n: "04",
    t: "Same discipline",
    d: "The same officers, comms rules and squad structure you know from our WWII servers — just sweatier.",
  },
];

const SERVERS = [
  { region: "UK", status: "Live", players: "0/100", map: "Rotation" },
  { region: "US East", status: "Live", players: "0/100", map: "Rotation" },
  { region: "US West", status: "Live", players: "0/100", map: "Rotation" },
];

function VietnamPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative isolate overflow-hidden border-b hairline">
        <img
          src="/maps/vietnam-hero.jpg"
          alt="Hell Let Loose Vietnam jungle patrol at dawn"
          className="absolute inset-0 h-full w-full object-cover opacity-35 saturate-[0.7]"
          width={1536}
          height={768}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0 jungle-wash" />
        <div className="absolute inset-0 topo opacity-60" />

        <div className="relative mx-auto max-w-7xl px-5 py-24 md:py-32">
          <div className="eyebrow text-khaki">[VN] Theatre briefing</div>
          <h1 className="mt-5 max-w-3xl text-5xl leading-[0.92] md:text-7xl">
            Welcome to the jungle
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Objective First runs dedicated Hell Let Loose Vietnam servers across EU, UK and US.
            Same squad-first doctrine, new theatre: dense jungle, helicopter assaults, napalm and
            mud-soaked firefights that punish anyone who tries to solo.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="https://discord.gg/obj1st"
              className="inline-flex items-center gap-3 border-2 border-khaki bg-khaki px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki"
            >
              Join the Vietnam ops
            </a>
            <Link
              to="/"
              hash="servers"
              className="inline-flex items-center gap-2 border-b-2 border-khaki/40 px-1 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
            >
              Check live server status →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b hairline bg-card/20">
        <div className="mx-auto max-w-7xl px-5 py-20 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.6fr]">
            <div>
              <div className="eyebrow">[VN-1] What changes</div>
              <h2 className="mt-3 text-4xl md:text-5xl">
                Same war,
                <br />
                different hell
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Vietnam is not just a reskin. The jungle changes sightlines, the helicopters change
                pacing, and the fire changes everything.
              </p>
              <div className="mt-6 h-px w-24 bg-napalm/70" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <article
                  key={f.n}
                  className="ink-edge group relative overflow-hidden bg-card p-6 transition-colors hover:bg-secondary/40"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="stencil text-xs text-napalm">{f.n}</span>
                    <h3 className="text-lg text-foreground">{f.t}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                  <div className="absolute -right-6 -bottom-6 h-16 w-16 rotate-45 border-t hairline opacity-40 transition-transform group-hover:translate-x-1" />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 py-20 md:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow">[VN-2] Vietnam fleet</div>
              <h2 className="mt-2 text-3xl md:text-4xl">Our boxes in theatre</h2>
            </div>
            <p className="max-w-xs font-mono text-[11px] leading-relaxed uppercase tracking-[0.14em] text-muted-foreground">
              Tap a server card on the homepage for the live roster.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {SERVERS.map((s) => (
              <div key={s.region} className="ink-edge relative overflow-hidden bg-card p-6">
                <div className="absolute inset-0 halftone opacity-30" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl uppercase tracking-wide text-foreground">
                      {s.region}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-napalm">
                      <span className="h-2 w-2 rounded-full bg-napalm" />
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="tnum font-display text-3xl font-bold leading-none text-khaki">
                      {s.players.split("/")[0]}
                    </span>
                    <span className="pb-1 font-mono text-xs text-muted-foreground">
                      / {s.players.split("/")[1]} slots
                    </span>
                  </div>
                  <div className="mt-4 border-t hairline pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {s.map}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b hairline bg-card/20">
        <div className="mx-auto max-w-7xl px-5 py-20 md:py-24">
          <div className="ink-edge tape relative overflow-hidden bg-card p-10 md:p-14">
            <div className="absolute inset-0 halftone opacity-30" />
            <div className="relative max-w-2xl">
              <div className="eyebrow">[VN-3] New to Vietnam?</div>
              <h2 className="mt-4 text-3xl md:text-4xl">
                Jungle is a team sport
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Vietnam rewards patience, comms and squad cohesion more than raw aim. Stick with
                your SL, call contacts early, and trust that the Huey pilot is doing his best not to
                drop you in a hot LZ. If you already play with us on WWII, your roles transfer
                directly — just expect more mud.
              </p>
              <Link
                to="/"
                hash="recruitment"
                className="mt-7 inline-flex items-center gap-2 border-2 border-khaki px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-khaki transition-colors hover:bg-khaki hover:text-background"
              >
                Enlist →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
