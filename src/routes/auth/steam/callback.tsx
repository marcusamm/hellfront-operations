import { createFileRoute } from "@tanstack/react-router";

function redirectTo(path: string): Response {
  return new Response(null, { status: 302, headers: { Location: path } });
}

// GET /auth/steam/callback?openid.*=...
// Steam sends the user back here. We verify the assertion directly with Steam
// (signed check_authentication), then store the verified Steam64 id in the
// session — either on top of an existing Discord session or as a Steam-only
// session that can view its own stats.
export const Route = createFileRoute("/auth/steam/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const rawNext = url.searchParams.get("next") ?? "/stats";
        const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/stats";

        try {
          const { verifySteamCallback, fetchSteamProfile } =
            await import("@/lib/steam-auth.server");
          const steamId = await verifySteamCallback(url);
          if (!steamId) return redirectTo("/login?error=steam");

          const profile = await fetchSteamProfile(steamId);
          const { applySteamLogin } = await import("@/lib/auth.server");
          await applySteamLogin(steamId, profile);

          return redirectTo(next);
        } catch (err) {
          console.error("Steam callback failed:", err);
          return redirectTo("/login?error=steam");
        }
      },
    },
  },
});
