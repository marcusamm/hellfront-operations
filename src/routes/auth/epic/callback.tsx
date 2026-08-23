import { createFileRoute } from "@tanstack/react-router";

function redirectTo(path: string): Response {
  return new Response(null, { status: 302, headers: { Location: path } });
}

// GET /auth/epic/callback?code=...&state=...
// Epic sends the user back here. We verify the signed state, exchange the code
// for the verified Epic account id, then attach it to the session (on top of
// an existing Discord/Steam session, or as an Epic-only stats session).
export const Route = createFileRoute("/auth/epic/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        try {
          const { exchangeEpicCode, readEpicState } = await import("@/lib/epic-auth.server");
          const next = (await readEpicState(url.searchParams.get("state"))) ?? null;
          if (!next) return redirectTo("/login?error=state");

          const code = url.searchParams.get("code");
          if (!code) return redirectTo("/login?error=denied");

          const identity = await exchangeEpicCode(code, url.origin);
          if (!identity) return redirectTo("/login?error=epic");

          const { applyEpicLogin } = await import("@/lib/auth.server");
          await applyEpicLogin(identity.accountId, identity.displayName);
          return redirectTo(next);
        } catch (err) {
          console.error("Epic callback failed:", err);
          return redirectTo("/login?error=epic");
        }
      },
    },
  },
});
