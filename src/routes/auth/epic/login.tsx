import { createFileRoute } from "@tanstack/react-router";

// GET /auth/epic/login?next=/members%23my-stats
// Starts the Epic Games (Epic Account Services) OAuth flow.
export const Route = createFileRoute("/auth/epic/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { buildEpicLoginUrl, epicConfigured } = await import("@/lib/epic-auth.server");
          const url = new URL(request.url);
          if (!epicConfigured()) {
            return new Response(null, {
              status: 302,
              headers: { Location: "/login?error=epic_config" },
            });
          }
          const rawNext = url.searchParams.get("next") ?? "/members#my-stats";
          const next =
            rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/members#my-stats";
          return new Response(null, {
            status: 302,
            headers: { Location: await buildEpicLoginUrl(url.origin, next) },
          });
        } catch (err) {
          console.error("Epic login failed to start:", err);
          return new Response(null, { status: 302, headers: { Location: "/login?error=epic" } });
        }
      },
    },
  },
});
