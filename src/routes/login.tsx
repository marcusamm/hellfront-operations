import { createFileRoute, redirect } from "@tanstack/react-router";
import { SiteHeader, MobileStickyCTA } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { currentUserQueryOptions } from "@/lib/auth-client";
import { AccountAuthForms } from "@/components/site/AccountAuthForms";

type LoginSearch = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  state: "Your login session expired or didn't match. Please try again.",
  oauth: "We couldn't complete the Discord sign-in. Please try again.",
  denied: "Sign-in was cancelled.",
  config: "Discord login isn't set up yet — add your credentials in .env (see DISCORD_SETUP.md).",
  steam: "We couldn't verify your Steam sign-in. Please try again.",
  epic: "We couldn't verify your Epic Games sign-in. Please try again.",
  epic_config: "Epic sign-in isn't set up yet — EPIC_CLIENT_ID / EPIC_CLIENT_SECRET are missing.",
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);
    if (user) {
      throw redirect({ to: user.provider === "steam" ? "/stats" : "/members" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign In — Objective First" },
      {
        name: "description",
        content:
          "Sign in or create an Objective First account to access the members area, stats and staff tools.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 grid-tactical opacity-30" />
        <div className="relative mx-auto flex max-w-xl flex-col px-5 pt-20 pb-28 md:pt-28">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-khaki" />
            <span className="eyebrow">SECURE CHANNEL · ACCESS CONTROL</span>
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl">
            Sign in to <span className="text-khaki">command</span>
          </h1>
          <p className="mt-5 text-muted-foreground">
            Objective First accounts are managed here on the site. Create one with your e-mail,
            confirm it, and your roles are assigned by our admins. You can link Steam, Epic and
            Discord to your account afterwards to pull up your own performance stats.
          </p>

          {error && (
            <div className="mt-6 border border-destructive/60 bg-destructive/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-destructive">
              {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
            </div>
          )}

          <div className="mt-8">
            <AccountAuthForms />
          </div>

          <div className="mt-12 border hairline bg-card/60 p-6">
            <div className="flex items-center justify-between border-b hairline pb-3">
              <span className="eyebrow">WHAT YOUR ROLE UNLOCKS</span>
              <span className="font-mono text-[10px] text-muted-foreground">CLEARANCE</span>
            </div>
            <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-4">
                <span className="mt-0.5 w-20 shrink-0 stencil text-xs text-khaki">MEMBER</span>
                <span>Members-only briefings, operation RSVPs, and performance stats.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-0.5 w-20 shrink-0 stencil text-xs text-khaki">OFFICER</span>
                <span>Everything members get, plus managing the operations board.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-0.5 w-20 shrink-0 stencil text-xs text-khaki">ADMIN</span>
                <span>Full access, including the site admin panel.</span>
              </li>
            </ul>
            <div className="mt-6 border-t hairline pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              New accounts start with no clearance — an admin assigns your role.
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}
