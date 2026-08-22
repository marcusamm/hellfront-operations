import { useQuery, queryOptions } from "@tanstack/react-query";
import { getMyStats } from "@/lib/me-stats.functions";
import { SteamIcon } from "@/components/site/SteamIcon";

const myStatsQueryOptions = queryOptions({
  queryKey: ["crcon", "myStats"],
  queryFn: () => getMyStats(),
  staleTime: 5 * 60_000,
});

function n1(x: number): string {
  return x.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function Tile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-background/80 px-4 py-4">
      <div
        className={`tnum font-display text-2xl font-bold md:text-3xl ${highlight ? "text-khaki" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="eyebrow mt-1 text-[10px]">{label}</div>
    </div>
  );
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border hairline bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-khaki" />
        <span className="eyebrow">YOUR STATS</span>
      </div>
      <h3 className="mt-3 text-xl text-foreground">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
      {action && (
        <a
          href={action.href}
          className="mt-5 inline-flex items-center gap-3 border-2 border-khaki bg-khaki px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-all hover:bg-transparent hover:text-khaki"
        >
          <SteamIcon className="h-4 w-4" />
          {action.label}
        </a>
      )}
    </div>
  );
}

export function MyStatsPanel() {
  const { data, isLoading } = useQuery(myStatsQueryOptions);

  if (isLoading || !data) {
    return (
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Loading your stats…
      </div>
    );
  }

  if (data.status === "anon") {
    return (
      <Notice
        title="Sign in with Steam to see your stats"
        body="One click through Steam — we only read your Steam ID, never your password."
        action={{ href: "/auth/steam/login?next=/members%23my-stats", label: "Sign in through Steam" }}
      />
    );
  }
  if (data.status === "no_steam") {
    return (
      <Notice
        title="Link your Steam account"
        body="We couldn't match your account to a Steam ID. Link it through Steam and your stats will appear here instantly."
        action={{ href: "/auth/steam/login?next=/members%23my-stats", label: "Link Steam account" }}
      />
    );
  }
  if (data.status === "no_data") {
    return (
      <Notice
        title="No games on record"
        body="We found your Steam ID, but you don't appear in our match archive yet. Hop on the server and your lifetime stats will show up here."
      />
    );
  }

  const p = data.player;
  const cov = data.coverage;
  const partial = cov.mapsTotal > 0 && cov.mapsProcessed < cov.mapsTotal;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-khaki" />
        <span className="eyebrow">YOUR STATS · LIFETIME</span>
      </div>
      <h2 className="mt-3 text-2xl text-foreground md:text-3xl">
        {p.name} <span className="text-muted-foreground">· {p.games} games</span>
      </h2>
      {partial && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Archive scan {cov.mapsProcessed}/{cov.mapsTotal} matches · totals still climbing
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-px border hairline bg-border/40 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Avg Kills" value={n1(p.avgKills)} highlight />
        <Tile label="Avg Deaths" value={n1(p.avgDeaths)} />
        <Tile label="K/D" value={n1(p.kd)} />
        <Tile label="Combat" value={n1(p.avgCombat)} />
        <Tile label="Offense" value={n1(p.avgOffense)} />
        <Tile label="Defense" value={n1(p.avgDefense)} />
        <Tile label="Support" value={n1(p.avgSupport)} />
        <Tile label="Hours" value={n1(p.hours)} />
      </div>
    </div>
  );
}
