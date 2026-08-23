import { useQuery, queryOptions } from "@tanstack/react-query";
import { getMyStats } from "@/lib/me-stats.functions";
import { SteamIcon } from "@/components/site/SteamIcon";
import { EpicIcon } from "@/components/site/EpicIcon";

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

const NEXT = "/members%23my-stats";

function LinkButtons() {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <a
        href={`/auth/steam/login?next=${NEXT}`}
        className="inline-flex items-center justify-center gap-3 border-2 border-khaki bg-khaki px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-all hover:bg-transparent hover:text-khaki"
      >
        <SteamIcon className="h-4 w-4" />
        Link Steam
      </a>
      <a
        href={`/auth/epic/login?next=${NEXT}`}
        className="inline-flex items-center justify-center gap-3 border-2 border-khaki/50 px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-khaki transition-all hover:border-khaki hover:bg-khaki/10"
      >
        <EpicIcon className="h-4 w-4" />
        Link Epic Games
      </a>
    </div>
  );
}

function Notice({
  title,
  body,
  showLinks,
}: {
  title: string;
  body: string;
  showLinks?: boolean;
}) {
  return (
    <div className="border hairline bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-khaki" />
        <span className="eyebrow">YOUR STATS</span>
      </div>
      <h3 className="mt-3 text-xl text-foreground">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
      {showLinks && <LinkButtons />}
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
        title="Sign in to see your stats"
        body="Play on Steam or on Epic / Microsoft Store? Either works — one click, and we only read your account ID, never your password."
        showLinks
      />
    );
  }
  if (data.status === "no_steam") {
    return (
      <Notice
        title="Link your game account"
        body="We couldn't match you to a player in our archive yet. Link the account you actually play on — Steam or Epic Games — and your stats will appear here."
        showLinks
      />
    );
  }
  if (data.status === "no_data") {
    return (
      <Notice
        title="No games on record"
        body="We found your account, but you don't appear in our match archive yet. Hop on the server and your lifetime stats will show up here. Playing on Epic? Link Epic too so we can match your in-game name."
        showLinks
      />
    );
  }

  const p = data.player;
  const cov = p.coverage;
  const partial = cov.daysTotal > 0 && cov.daysCovered < cov.daysTotal;
  const n0 = (x: number) => Math.round(x).toLocaleString("en-US");
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-khaki" />
        <span className="eyebrow">YOUR STATS · LIFETIME</span>
      </div>
      <h2 className="mt-3 text-2xl text-foreground md:text-3xl">
        {p.name} <span className="text-muted-foreground">· {n0(p.sessions)} sessions</span>
      </h2>
      {partial && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Archive scan {cov.daysCovered}/{cov.daysTotal} days · totals still climbing
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-px border hairline bg-border/40 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Kills" value={n0(p.kills)} highlight />
        <Tile label="Deaths" value={n0(p.deaths)} />
        <Tile label="K/D" value={n1(p.kd)} />
        <Tile label="Kills / Hour" value={n1(p.killsPerHour)} />
        <Tile label="Teamkills" value={n0(p.teamkills)} />
        <Tile label="Hours" value={n1(p.hours)} />
      </div>
    </div>
  );
}

