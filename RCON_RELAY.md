# Self-hosted RCON Relay

Working relay files are in the `rcon-relay/` folder of this project:

- `server.js` — Fastify HTTP relay + HLL RCON client + match logger
- `package.json` — dependencies
- `Dockerfile` / `docker-compose.yml` / `Caddyfile` — Linux/Docker deployment
- `.env.example` — copy to `.env` and fill in your credentials

The site is wired to talk to this relay instead of CRCON when two environment variables are set:

| Secret              | What it is                                                       |
| ------------------- | ---------------------------------------------------------------- |
| `RCON_RELAY_URL`    | HTTPS URL of your relay, e.g. `https://rcon.yourdomain.com`      |
| `RCON_RELAY_TOKEN`  | A long random string. The site sends `Authorization: Bearer <token>` |

If those are NOT set, the site falls back to CRCON. Nothing in the UI changes either way.

---

## What the relay does

A small Node service on your VPS with **two jobs**:

### 1. Live RCON proxy
Opens a TCP socket to your GTX HLL server's RCON port, implements the HLL XOR
RCON protocol, exposes HTTP endpoints the site calls in real time
(kick, ban, message, map change, player list, etc).

### 2. Match-history logger (small built-in DB)
A background worker that polls the live server every ~30s and **writes match
results to a local SQLite (or Postgres) database**. Without this, the
leaderboard goes empty the moment you cut over from CRCON.

What to record per finished match:
- `matches`: id, map_name, started_at, ended_at, allied_score, axis_score
- `match_players`: match_id, player_id, player_name, team, kills, deaths,
  combat, offense, defense, support, time_seconds

That's enough to rebuild everything the current stats page shows.

---

## HTTP API surface

All require header `Authorization: Bearer <RCON_RELAY_TOKEN>`.
All respond with JSON shaped like CRCON: `{ "result": ..., "failed": false }`.

### Live RCON (proxied to the game server)

| Method | Path                                  | Purpose                            |
| ------ | ------------------------------------- | ---------------------------------- |
| GET    | `/api/get_public_info`                | server name, players, current map  |
| GET    | `/api/get_detailed_players`           | full player list                   |
| GET    | `/api/get_gamestate`                  | match state, score, time left      |
| GET    | `/api/get_map_rotation`               | current rotation                   |
| POST   | `/api/message_player`                 | `{ player_name, message }`         |
| POST   | `/api/punish`                         | `{ player_name, reason }`          |
| POST   | `/api/kick`                           | `{ player_name, reason }`          |
| POST   | `/api/temp_ban`                       | `{ player_name, duration_hours, reason }` |
| POST   | `/api/perma_ban`                      | `{ player_name, reason }`          |
| POST   | `/api/switch_player_now`              | `{ player_name }`                  |
| POST   | `/api/switch_player_on_death`         | `{ player_name }`                  |
| POST   | `/api/add_vip`                        | `{ player_id, description }`       |
| POST   | `/api/set_map`                        | `{ map_name }`                     |

### Stats (served from the relay's own DB)

| Method | Path                                  | Purpose                            |
| ------ | ------------------------------------- | ---------------------------------- |
| GET    | `/api/get_scoreboard_maps?limit=N`    | last N matches: `[{ id, map_name, ... }]` |
| GET    | `/api/get_map_scoreboard?map_id=N`    | per-player stats for one match     |

Response shape must mirror CRCON exactly — the site already parses both
endpoints. Match the field names the site looks for:
`id`, `map_id`, `player_id`, `player`, `name`, `kills`, `deaths`,
`combat`, `offense`, `defense`, `support`, `time_seconds`.

---

## Required env vars on the relay

```env
HLL_RCON_HOST=your.gtx.server.ip
HLL_RCON_PORT=27015            # whatever GTX gave you
HLL_RCON_PASSWORD=...          # GTX RCON password
RELAY_TOKEN=...                # MUST match RCON_RELAY_TOKEN on the site
DATABASE_PATH=/data/relay.db   # SQLite file path (or DATABASE_URL for Postgres)
PORT=8080
```

---

## Suggested stack

- **Node 20** + **Fastify** (HTTP)
- **better-sqlite3** (zero-config, single file, plenty fast for one server)
- A 30s `setInterval` worker that calls `Get Players` / `Get Game State`,
  detects map changes, and writes a `matches` row on match end.
- **Caddy** in front for free auto-HTTPS on `rcon.yourdomain.com`.
- Single `Dockerfile`, run with `docker compose up -d`.

---

## Windows VPS setup

The relay is just a Node.js app, so it runs on Windows Server or Windows 10/11.

### Option A: Run Node directly

1. Install **Node.js 20 LTS** from https://nodejs.org.
2. Create a folder, e.g. `C:\rcon-relay`.
3. Put `server.js`, `package.json`, and `.env` in it.
4. Open PowerShell as Administrator:

```powershell
cd C:\rcon-relay
npm install
node server.js
```

The relay listens on `http://localhost:8080`.

### Option B: Docker on Windows

Install Docker Desktop and use the Linux `docker-compose.yml` above. It works, but it is heavier than running Node directly.

### HTTPS on Windows

Pick one:

- **Caddy for Windows** — download `caddy.exe`, place `Caddyfile` in the same folder, run `caddy run`. Auto-HTTPS.
- **IIS reverse proxy** — install the URL Rewrite + Application Request Routing modules, create a site for `rcon.yourdomain.com`, and reverse-proxy to `http://localhost:8080`.
- **Cloudflare Tunnel** — easiest if your domain is on Cloudflare. One command: `cloudflared tunnel --url http://localhost:8080`.

### Auto-start on Windows

Use **nssm** (the Non-Sucking Service Manager) to run `node server.js` as a Windows service so it survives reboots:

```powershell
nssm install RCONRelay
# point Path to node.exe and Arguments to C:\rcon-relay\server.js
nssm start RCONRelay
```

---

## Switching the site over

Once your relay is running and reachable on HTTPS:

1. Add `RCON_RELAY_URL` and `RCON_RELAY_TOKEN` as secrets.
2. Done. The site stops calling CRCON and calls your relay instead — live
   RCON *and* stats.

No code changes, no redeploy.
