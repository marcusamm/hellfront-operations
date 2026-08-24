import { createFileRoute } from "@tanstack/react-router";

function redirectTo(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "private, no-store",
      Pragma: "no-cache",
    },
  });
}

// GET /auth/discord/callback?code=...&state=...
// Discord redirects here after the user authorizes. We verify the CSRF state,
// exchange the code for an access token, read the user's identity + server
// roles, store everything in the encrypted session cookie, and redirect.
export const Route = createFileRoute("/auth/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
        const expectedState = getCookie("discord_oauth_state");
        deleteCookie("discord_oauth_state", { path: "/" });

        // The user denied authorization or something went wrong upstream.
        if (url.searchParams.get("error")) {
          return redirectTo("/login?error=denied");
        }
        // CSRF / state validation.
        if (!code || !state || !expectedState || state !== expectedState) {
          return redirectTo("/login?error=state");
        }

        try {
          const {
            exchangeCodeForToken,
            buildSessionUser,
            applyDiscordLinkIntent,
            setSessionUser,
          } =
            await import("@/lib/auth.server");
          const accessToken = await exchangeCodeForToken(code);
          const discordUser = await buildSessionUser(accessToken);
          const user = await applyDiscordLinkIntent(discordUser);
          await setSessionUser(user);

          // Logged in. Members go to the members area; non-members (not in the
          // Discord server) land on the home page with a notice.
          return redirectTo("/members#accounts");
        } catch (err) {
          console.error("Discord OAuth callback failed:", err);
          return redirectTo("/login?error=oauth");
        }
      },
    },
  },
});
