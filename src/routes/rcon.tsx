import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { SiteHeader, MobileStickyCTA } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { currentUserQueryOptions } from "@/lib/auth-client";
import {
  MessageBars,
  PlayersPanel,
  GameStatePanel,
  MapRotationPanel,
  RawCommandPanel,
} from "@/components/site/RconPanels";

export const Route = createFileRoute("/rcon")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);
    if (!user) throw redirect({ to: "/login" });
    if (!user.capabilities.includes("rcon")) throw redirect({ to: "/members" });
  },
  head: () => ({ meta: [{ title: "RCON Console — Objective First" }] }),
  component: RconPage,
});

function RconPage() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-rust" />
            <span className="eyebrow text-rust">RESTRICTED · ADMIN &amp; MOD</span>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl">RCON Console</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Live control of the game server: message, kick, or ban players, and set the
                broadcast / welcome message. Every action is sent to CRCON as{" "}
                <span className="text-khaki">ObjFirst Web</span>.
              </p>
            </div>
            <Link
              to="/members"
              className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
            >
              ← Members
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <GameStatePanel />
        </div>
      </section>

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <MessageBars />
        </div>
      </section>

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <MapRotationPanel />
        </div>
      </section>

      <section className="border-b hairline">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <PlayersPanel />
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-5 py-10">
          <RawCommandPanel />
        </div>
      </section>


      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}

