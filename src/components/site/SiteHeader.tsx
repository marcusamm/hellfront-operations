import { Link } from "@tanstack/react-router";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Command" },
  { to: "/servers", label: "Servers" },
  { to: "/operations", label: "Operations" },
  { to: "/slb", label: "SLB", badge: "NEW" as const },
  { to: "/recruitment", label: "Recruitment" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b hairline bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border-2 border-khaki bg-olive-deep">
            <span className="stencil text-khaki text-sm leading-none">OF</span>
          </div>
          <div className="leading-none">
            <div className="stencil text-foreground text-base">Objective First</div>
            <div className="eyebrow mt-1 text-[10px]">HLL · TACTICAL COMMUNITY</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-khaki"
              activeProps={{ className: "!text-khaki" }}
            >
              {item.label}
              {item.badge && (
                <span className="inline-flex h-[18px] items-center border border-rust/70 bg-rust/15 px-1.5 font-mono text-[9px] font-bold tracking-[0.2em] text-rust">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ServerStatusPill />
          <a
            href="https://discord.gg/"
            className="group inline-flex items-center gap-2 border-2 border-khaki bg-khaki px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-all hover:bg-transparent hover:text-khaki"
          >
            <DiscordIcon className="h-3.5 w-3.5" />
            Join Discord
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center border hairline text-khaki md:hidden"
          aria-label="Menu"
        >
          <span className="block h-0.5 w-5 bg-current shadow-[0_-6px_0_currentColor,0_6px_0_currentColor]" />
        </button>
      </div>

      {open && (
        <div className="border-t hairline bg-card md:hidden">
          <div className="flex flex-col px-5 py-4">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 border-b hairline py-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground"
              >
                {item.label}
                {item.badge && (
                  <span className="inline-flex h-[18px] items-center border border-rust/70 bg-rust/15 px-1.5 font-mono text-[9px] font-bold tracking-[0.2em] text-rust">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
            <a
              href="https://discord.gg/"
              className="mt-4 inline-flex items-center justify-center gap-2 border-2 border-khaki bg-khaki px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background"
            >
              <DiscordIcon className="h-3.5 w-3.5" />
              Join Discord
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

export function ServerStatusPill() {
  return (
    <div className="flex items-center gap-2 border hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span>Servers Online</span>
      <span className="text-khaki">187/200</span>
    </div>
  );
}

export function MobileStickyCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-background/95 backdrop-blur md:hidden">
      <a
        href="https://discord.gg/"
        className="flex items-center justify-center gap-2 bg-khaki py-3.5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background"
      >
        <DiscordIcon className="h-4 w-4" />
        Enlist on Discord
      </a>
    </div>
  );
}

export function DiscordIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.51 14.51 0 0 0-.69 1.43 18.27 18.27 0 0 0-5.737 0A14.51 14.51 0 0 0 9.442 3 19.79 19.79 0 0 0 5.683 4.369C2.165 9.6 1.211 14.7 1.688 19.73a19.94 19.94 0 0 0 6.063 3.07 14.6 14.6 0 0 0 1.297-2.108 12.97 12.97 0 0 1-2.043-.984c.172-.125.34-.255.5-.39 3.927 1.82 8.18 1.82 12.06 0 .163.135.33.265.5.39-.654.39-1.34.72-2.045.985a14.6 14.6 0 0 0 1.297 2.107 19.94 19.94 0 0 0 6.063-3.07c.564-5.79-.962-10.84-4.063-15.36zM8.02 16.93c-1.183 0-2.157-1.09-2.157-2.418 0-1.328.96-2.42 2.157-2.42 1.197 0 2.17 1.092 2.157 2.42 0 1.327-.96 2.418-2.157 2.418zm7.96 0c-1.183 0-2.157-1.09-2.157-2.418 0-1.328.96-2.42 2.157-2.42 1.197 0 2.17 1.092 2.157 2.42 0 1.327-.96 2.418-2.157 2.418z" />
    </svg>
  );
}

export function SteamIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.98 2C6.2 2 1.45 6.45 1 12.08l5.36 2.22A2.78 2.78 0 0 1 8 13.7l2.39-3.46v-.07a3.7 3.7 0 1 1 3.7 3.7h-.08l-3.4 2.43c0 .07.01.14.01.21a2.78 2.78 0 0 1-5.49.61L1.2 15.7C2.56 19.93 6.93 23 11.98 23 18.07 23 23 18.07 23 12S18.07 2 11.98 2zm-4.6 16.6a2.15 2.15 0 0 1-1.18-2.79l1.21.5a1.57 1.57 0 0 0 2.07.86 1.57 1.57 0 0 0-.83-2.97l1.25.52a2.15 2.15 0 0 1-2.52 3.88zm6.74-4.18a2.47 2.47 0 0 1-2.46-2.47 2.47 2.47 0 1 1 2.46 2.47zm0-4.32a1.86 1.86 0 0 0-1.86 1.85 1.86 1.86 0 1 0 1.86-1.85z" />
    </svg>
  );
}
