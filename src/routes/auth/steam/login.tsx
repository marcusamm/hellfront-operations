import { createFileRoute } from "@tanstack/react-router";

// GET /auth/steam/login?next=/stats
// Kicks off Steam's OpenID 2.0 sign-in flow.
export const Route = createFileRoute("/auth/steam/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { buildSteamLoginUrl } = await import("@/lib/steam-auth.server");
          const url = new URL(request.url);
          const rawNext = url.searchParams.get("next") ?? "/stats";
          // Only allow same-site paths.
          const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/stats";
          return new Response(null, {
            status: 302,
            headers: { Location: buildSteamLoginUrl(url.origin, next) },
          });
        } catch (err) {
          console.error("Steam login failed to start:", err);
          return new Response(null, { status: 302, headers: { Location: "/login?error=steam" } });
        }
      },
    },
  },
});
