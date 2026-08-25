// Website account sign-in / registration (e-mail + password).
// After a successful sign-in we sync the verified account into the site
// session cookie, which is what every capability check on the site reads.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncAccountSession } from "@/lib/accounts.functions";
import { currentUserQueryOptions } from "@/lib/auth-client";

type Mode = "signin" | "register" | "forgot";

const fieldClass =
  "mt-1 w-full border hairline bg-background/60 px-3 py-3 font-mono text-sm text-foreground outline-none focus:border-khaki";
const labelClass =
  "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground";

export function AccountAuthForms() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // If a browser still holds a valid account session but the site cookie has
  // expired, restore it silently instead of asking for the password again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      try {
        const user = await syncAccountSession();
        if (cancelled) return;
        qc.setQueryData(currentUserQueryOptions.queryKey, user);
        navigate({ to: "/members" });
      } catch {
        /* stale token — leave the form visible */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, qc]);

  async function afterSignIn() {
    const user = await syncAccountSession();
    qc.setQueryData(currentUserQueryOptions.queryKey, user);
    await qc.invalidateQueries();
    navigate({ to: "/members" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        await afterSignIn();
      } else if (mode === "register") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/login",
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (err) throw err;
        if (data.session) {
          await afterSignIn();
        } else {
          setNotice(
            "Account created. Check your inbox and click the confirmation link, then sign in.",
          );
          setMode("signin");
        }
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (err) throw err;
        setNotice("Password reset link sent — check your inbox.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(
        /email not confirmed/i.test(message)
          ? "Confirm your e-mail first — check your inbox for the confirmation link."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border hairline bg-card p-6">
      <div className="flex gap-2">
        {(
          [
            ["signin", "Sign in"],
            ["register", "Create account"],
          ] as [Mode, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              setError(null);
              setNotice(null);
            }}
            className={`inline-flex items-center border-2 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
              mode === id
                ? "border-khaki bg-khaki text-background"
                : "border-foreground/30 text-foreground hover:border-khaki hover:text-khaki"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <div>
            <label className={labelClass} htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              placeholder="In-game name"
              className={fieldClass}
            />
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={fieldClass}
          />
        </div>

        {mode !== "forgot" && (
          <div>
            <label className={labelClass} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              className={fieldClass}
            />
            {mode === "register" && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Minimum 8 characters · known-breached passwords are rejected
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="border border-destructive/60 bg-destructive/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-destructive">
            {error}
          </div>
        )}
        {notice && (
          <div className="border border-khaki/60 bg-khaki/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-khaki">
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center border-2 border-khaki bg-khaki px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-background transition-all hover:bg-transparent hover:text-khaki disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Working…"
            : mode === "signin"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "forgot" ? "signin" : "forgot");
          setError(null);
          setNotice(null);
        }}
        className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground underline-offset-4 hover:text-khaki hover:underline"
      >
        {mode === "forgot" ? "← Back to sign in" : "Forgot your password?"}
      </button>
    </div>
  );
}
