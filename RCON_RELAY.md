# Self-hosted RCON Relay

The site is wired to talk to a **custom RCON relay** instead of CRCON when two
environment variables are set:

| Secret              | What it is                                                       |
| ------------------- | ---------------------------------------------------------------- |
| `RCON_RELAY_URL`    | HTTPS URL of your relay, e.g. `https://rcon.yourdomain.com`      |
| `RCON_RELAY_TOKEN`  | A long random string. The site sends `Authorization: Bearer <token>` |

If those are NOT set, the site falls back to CRCON (`CRCON_URL` / `CRCON_USER` / `CRCON_PASSWORD`).
Nothing in the UI changes either way.

---

## What the relay must do

A tiny Node service on your VPS that:

1. Opens a TCP socket to your GTX HLL server's RCON port.
2. Implements the HLL XOR RCON handshake + command protocol.
3. Exposes the **same HTTP API surface as CRCON** so the site doesn't care which one it's talking to.

### Required HTTP endpoints

All require header `Authorization: Bearer <RCON_RELAY_TOKEN>`.
All respond with JSON shaped like CRCON: `{ "result": ..., "failed": false }`.

| Method | Path                                  | Purpose                            |
| ------ | ------------------------------------- | ---------------------------------- |
| GET    | `/api/get_public_info`                | server name, players, current map  |
| GET    | `/api/get_detailed_players`           | full player list                   |
| GET    | `/api/get_gamestate`                  | match state, score, time left      |
| GET    | `/api/get_map_rotation`               | current rotation                   |
| GET    | `/api/get_scoreboard_maps?limit=N`    | recent games (for stats)           |
| GET    | `/api/get_map_scoreboard?map_id=N`    | per-player stats for one game      |
| POST   | `/api/message_player`                 | body: `{ player_name, message }`   |
| POST   | `/api/punish`                         | body: `{ player_name, reason }`    |
| POST   | `/api/kick`                           | body: `{ player_name, reason }`    |
| POST   | `/api/temp_ban`                       | body: `{ player_name, duration_hours, reason }` |
| POST   | `/api/perma_ban`                      | body: `{ player_name, reason }`    |
| POST   | `/api/switch_player_now`              | body: `{ player_name }`            |
| POST   | `/api/switch_player_on_death`         | body: `{ player_name }`            |
| POST   | `/api/add_vip`                        | body: `{ player_id, description }` |
| POST   | `/api/set_map`                        | body: `{ map_name }`               |

Each endpoint just translates the JSON body into the corresponding HLL RCON
text command and returns the server's reply.

### Required env vars on the relay

```env
HLL_RCON_HOST=your.gtx.server.ip
HLL_RCON_PORT=27015         # whatever GTX gave you
HLL_RCON_PASSWORD=...       # GTX RCON password
RELAY_TOKEN=...             # MUST match RCON_RELAY_TOKEN on the site
PORT=8080
```

### Deploy hint

- Put it behind Caddy or Cloudflare Tunnel for free HTTPS.
- Use a subdomain like `rcon.yourdomain.com`.
- Lock the firewall: only port 443 inbound public; outbound to GTX RCON port.

---

## Switching the site over

Once your relay is running and reachable on HTTPS:

1. Add `RCON_RELAY_URL` and `RCON_RELAY_TOKEN` as secrets.
2. Done. The site stops calling CRCON and calls your relay instead.

No code changes, no redeploy needed.
