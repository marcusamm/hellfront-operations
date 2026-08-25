import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, MobileStickyCTA } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a New Password — Objective First" },
      {
        name: "description",
        content: "Choose a new password for your Objective First website account.",
      },
      { property: "og:title", content: "Set a New Password — Objective First" },
      {
        property: "og:description",
        content: "Choose a new password for your Objective First website account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase delivers a recovery session in the URL hash on arrival.
    const hash = window.location.hash;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session || hash.includes("type=recovery")) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/login" }), 1500);
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />
      <section className="mx-auto max-w-lg px-5 py-24">
        <div className="flex items-center gap-3">
          <span className="h-px w-12 bg-khaki" />
          <span className="eyebrow">ACCOUNT RECOVERY</span>
        </div>
        <h1 className="mt-6 text-3xl md:text-4xl">
          Set a new <span className="text-khaki">password</span>
        </h1>

        <div className="mt-8 border hairline bg-card p-6">
          {done ? (
            <p className="text-sm text-muted-foreground">
              Password updated. Redirecting you to sign in…
            </p>
          ) : !ready ? (
            <p className="text-sm text-muted-foreground">
              Open this page from the reset link in your e-mail to continue.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
                  htmlFor="new-password"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 w-full border hairline bg-background/60 px-3 py-3 font-mono text-sm text-foreground outline-none focus:border-khaki"
                />
              </div>
              {error && (
                <div className="border border-destructive/60 bg-destructive/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-destructive">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center border-2 border-khaki bg-khaki px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki disabled:opacity-50"
              >
                {busy ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </section>
      <SiteFooter />
      <MobileStickyCTA />
    </div>
  );
}
