import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, MobileStickyCTA } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { currentUserQueryOptions } from "@/lib/auth-client";
import { LiveTacticalMap } from "@/components/site/LiveTacticalMap";
import {
  MessageBars,
  PlayersPanel,
  GameStatePanel,
  MapRotationPanel,
  RawCommandPanel,
} from "@/components/site/RconPanels";


export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);
    if (!user) throw redirect({ to: "/login" });
    if (!user.capabilities.includes("admin") && !user.capabilities.includes("rcon")) {
      throw redirect({ to: "/members" });
    }
  },
  head: () => ({ meta: [{ title: "Admin Panel — Objective First" }] }),
  component: AdminPage,
});

type AdminTab = "live-map" | "gamestate" | "players" | "messages" | "rotation" | "raw";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "live-map", label: "Live Tactical Map" },
  { id: "gamestate", label: "Game State" },
  { id: "players", label: "Players & Actions" },
  { id: "messages", label: "Broadcast / Welcome" },
  { id: "rotation", label: "Map Rotation" },
  { id: "raw", label: "Raw Command" },
];

function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("live-map");

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
              <h1 className="text-3xl md:text-5xl">Admin Panel</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Live tactical map and the full RCON toolset in one place.
              </p>
            </div>
            <Link
              to="/members"
              className="inline-flex items-center border-2 border-foreground/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-khaki hover:text-khaki"
            >
              ← Members
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </TabBtn>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-5 py-10">
          {tab === "live-map" && <LiveMapPanel />}
          {tab === "gamestate" && <GameStatePanel />}
          {tab === "players" && <PlayersPanel />}
          {tab === "messages" && <MessageBars />}
          {tab === "rotation" && <MapRotationPanel />}
          {tab === "raw" && <RawCommandPanel />}
        </div>
      </section>


      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
        active
          ? "border-khaki bg-khaki text-background"
          : "border-foreground/30 text-foreground hover:border-khaki hover:text-khaki"
      }`}
    >
      {children}
    </button>
  );
}

function LiveMapPanel() {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">LIVE TACTICAL MAP</div>
          <h2 className="mt-1 text-2xl text-foreground">Real-time server map</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Current map, score, time remaining and live player roster — pulled
            directly from CRCON. Refreshes every 5 seconds.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <LiveTacticalMap />
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Tip: drop tactical artwork (e.g. <code className="text-khaki">tac_carentan.webp</code>)
        into <code className="text-khaki">/public/maps/</code> to replace the placeholder
        for any map.
      </p>
    </div>
  );
}
