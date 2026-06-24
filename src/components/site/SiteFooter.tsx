import { Link } from "@tanstack/react-router";
import { DiscordIcon, SteamIcon } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="relative border-t hairline bg-card/40">
      <div className="grid-tactical absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-khaki bg-olive-deep">
                <span className="stencil text-khaki">OF</span>
              </div>
              <div>
                <div className="stencil text-base">Objective First</div>
                <div className="eyebrow text-[10px] mt-0.5">EST. 2019</div>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-sm text-muted-foreground">
              A disciplined Hell Let Loose community built on teamwork, leadership, and respect for the game.
            </p>
          </div>

          <FooterCol title="Operations">
            <FooterLink to="/" hash="servers">Servers</FooterLink>
            <FooterLink to="/" hash="operations">Operations</FooterLink>
            <FooterLink to="/slb">SLB · Squad Line Battle</FooterLink>
            <FooterLink to="/" hash="recruitment">Recruitment</FooterLink>
          </FooterCol>

          <FooterCol title="Community">
            <FooterLink href="https://discord.gg/" external>Discord</FooterLink>
            <FooterLink href="https://steamcommunity.com/" external>Steam Group</FooterLink>
            <FooterLink to="/">Code of Conduct</FooterLink>
            <FooterLink to="/">Contact Command</FooterLink>
          </FooterCol>

          <FooterCol title="Server Status">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">EU MAIN</span>
              <span className="ml-auto text-khaki">92/100</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">EU TRAINING</span>
              <span className="ml-auto text-khaki">48/100</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">NA SCRIM</span>
              <span className="ml-auto text-khaki">47/100</span>
            </div>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t hairline pt-6 md:flex-row md:items-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            © {new Date().getFullYear()} Objective First · All ranks reserved
          </p>
          <div className="flex items-center gap-3">
            <a href="https://discord.gg/" aria-label="Discord" className="border hairline p-2 text-muted-foreground transition-colors hover:text-khaki">
              <DiscordIcon className="h-4 w-4" />
            </a>
            <a href="https://steamcommunity.com/" aria-label="Steam" className="border hairline p-2 text-muted-foreground transition-colors hover:text-khaki">
              <SteamIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="eyebrow mb-4">{title}</h4>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink(props: { to?: string; hash?: string; href?: string; external?: boolean; children: React.ReactNode }) {
  const cls = "text-sm text-muted-foreground transition-colors hover:text-khaki";
  if (props.href) {
    return <a href={props.href} className={cls} target={props.external ? "_blank" : undefined} rel={props.external ? "noreferrer" : undefined}>{props.children}</a>;
  }
  return <Link to={props.to!} hash={props.hash} className={cls}>{props.children}</Link>;
}
