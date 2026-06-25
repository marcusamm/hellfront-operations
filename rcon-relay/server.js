import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { DatabaseSync } from "node:sqlite";
import net from "node:net";
import path from "node:path";
import fs from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";

const env = {
  HLL_RCON_HOST: process.env.HLL_RCON_HOST,
  HLL_RCON_PORT: Number(process.env.HLL_RCON_PORT || 27015),
  HLL_RCON_PASSWORD: process.env.HLL_RCON_PASSWORD,
  RELAY_TOKEN: process.env.RELAY_TOKEN,
  DATABASE_PATH: process.env.DATABASE_PATH || "./relay.db",
  PORT: Number(process.env.PORT || 8080),
};

if (!env.HLL_RCON_HOST || !env.HLL_RCON_PASSWORD || !env.RELAY_TOKEN) {
  console.error("Missing required env vars: HLL_RCON_HOST, HLL_RCON_PASSWORD, RELAY_TOKEN");
  process.exit(1);
}

// ---------------- DB ----------------

// Ensure the directory for the SQLite file exists (e.g. /data inside Docker).
const dbDir = path.dirname(path.resolve(env.DATABASE_PATH));
fs.mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(env.DATABASE_PATH);
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_name TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    allied_score INTEGER,
    axis_score INTEGER,
    crcON_map_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS match_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id TEXT,
    player_name TEXT NOT NULL,
    team TEXT,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    combat INTEGER DEFAULT 0,
    offense INTEGER DEFAULT 0,
    defense INTEGER DEFAULT 0,
    support INTEGER DEFAULT 0,
    time_seconds INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
  CREATE INDEX IF NOT EXISTS idx_matches_started ON matches(started_at);
`);

const insertMatch = db.prepare(`
  INSERT INTO matches (map_name, started_at, allied_score, axis_score)
  VALUES (?, ?, ?, ?)
`);

const finishMatch = db.prepare(`
  UPDATE matches
  SET ended_at = ?, allied_score = ?, axis_score = ?
  WHERE id = ?
`);

const insertMatchPlayer = db.prepare(`
  INSERT INTO match_players (
    match_id, player_id, player_name, team, kills, deaths, combat,
    offense, defense, support, time_seconds
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getMatches = db.prepare(`
  SELECT id, map_name, started_at, ended_at, allied_score, axis_score
  FROM matches
  ORDER BY started_at DESC
  LIMIT ?
`);

const getMatch = db.prepare(`
  SELECT id, map_name, started_at, ended_at, allied_score, axis_score
  FROM matches
  WHERE id = ?
`);

const getMatchPlayers = db.prepare(`
  SELECT
    player_id, player_name, team, kills, deaths, combat, offense,
    defense, support, time_seconds
  FROM match_players
  WHERE match_id = ?
`);

// ---------------- HLL RCON ----------------

function xorBuffer(buf, key) {
  const keyBytes = Buffer.from(key, "utf8");
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

function sendPacket(sock, text) {
  const payload = Buffer.from(text, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(payload.length, 0);
  sock.write(Buffer.concat([lenBuf, payload]));
}

async function rconCommand(command) {
  return new Promise((resolve, reject) => {
    let authenticated = false;
    let buffer = Buffer.alloc(0);
    let timeout;

    const sock = net.connect({
      host: env.HLL_RCON_HOST,
      port: env.HLL_RCON_PORT,
    });

    const cleanup = () => {
      clearTimeout(timeout);
      sock.destroy();
    };

    timeout = setTimeout(() => {
      cleanup();
      reject(new Error("RCON command timeout"));
    }, 10000);

    sock.on("error", (err) => {
      cleanup();
      reject(err);
    });

    sock.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= 4) {
        const len = buffer.readUInt32LE(0);
        if (buffer.length < 4 + len) return;
        const message = buffer.slice(4, 4 + len).toString("utf8");
        buffer = buffer.slice(4 + len);

        if (!authenticated) {
          // first message is the challenge
          const response = xorBuffer(Buffer.from(message), env.HLL_RCON_PASSWORD).toString("utf8");
          sendPacket(sock, response);
          authenticated = true;
        } else {
          cleanup();
          resolve(message);
          return;
        }
      }
    });

    sock.on("connect", () => {
      // wait for challenge in on('data')
    });
  });
}

// ---------------- HTTP server ----------------

const app = Fastify({ logger: true });

app.addHook("onRequest", async (request, reply) => {
  const auth = request.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== env.RELAY_TOKEN) {
    reply.code(401).send({ failed: true, error: "Unauthorized" });
    return;
  }
});

function crcONResponse(result) {
  return { result, failed: false };
}

// Parse common HLL RCON responses
function parsePlayers(text) {
  // Expected format from "Get Players":
  // Name: <name> | Player ID: <id> | Team: <axis|allied> | ...
  const lines = text.split("\n").filter(Boolean);
  const players = [];
  for (const line of lines) {
    const name = (line.match(/Name:\s*([^|]+)/) || [])[1]?.trim();
    const player_id = (line.match(/Player ID:\s*([^|]+)/) || [])[1]?.trim();
    const team = (line.match(/Team:\s*([^|]+)/) || [])[1]?.trim();
    const kills = Number((line.match(/Kills:\s*(\d+)/) || [])[1] || 0);
    const deaths = Number((line.match(/Deaths:\s*(\d+)/) || [])[1] || 0);
    const combat = Number((line.match(/Combat:\s*(\d+)/) || [])[1] || 0);
    const offense = Number((line.match(/Offense:\s*(\d+)/) || [])[1] || 0);
    const defense = Number((line.match(/Defense:\s*(\d+)/) || [])[1] || 0);
    const support = Number((line.match(/Support:\s*(\d+)/) || [])[1] || 0);
    const time_seconds = Number((line.match(/Time:\s*(\d+)/) || [])[1] || 0);
    if (name) {
      players.push({
        name,
        player_id,
        team,
        kills,
        deaths,
        combat,
        offense,
        defense,
        support,
        time_seconds,
      });
    }
  }
  return players;
}

function parseGamestate(text) {
  // Example: "Map: ... | Allied Score: 0 | Axis Score: 0 | Remaining Time: ..."
  const map = (text.match(/Map:\s*([^|]+)/) || [])[1]?.trim();
  const allied = Number((text.match(/Allied Score:\s*(\d+)/) || [])[1] || 0);
  const axis = Number((text.match(/Axis Score:\s*(\d+)/) || [])[1] || 0);
  const time = (text.match(/Remaining Time:\s*([^|]+)/) || [])[1]?.trim();
  return { map, allied_score: allied, axis_score: axis, time_left: time };
}

app.get("/api/get_public_info", async () => {
  const raw = await rconCommand("Get Game State");
  const gs = parseGamestate(raw);
  const players = await rconCommand("Get Players");
  const playerList = parsePlayers(players);
  return crcONResponse({
    name: "HLL Server",
    map: gs.map,
    current_players: playerList.length,
    max_players: 100,
    players: playerList,
  });
});

app.get("/api/get_detailed_players", async () => {
  const raw = await rconCommand("Get Players");
  return crcONResponse({ players: parsePlayers(raw) });
});

app.get("/api/get_gamestate", async () => {
  const raw = await rconCommand("Get Game State");
  return crcONResponse(parseGamestate(raw));
});

app.get("/api/get_map_rotation", async () => {
  const raw = await rconCommand("Get Map Rotation");
  return crcONResponse({ rotation: raw.split("\n").filter(Boolean) });
});

app.post("/api/message_player", async (request) => {
  const { player_name, message } = request.body || {};
  await rconCommand(`Message ${player_name} ${message}`);
  return crcONResponse({ message: "ok" });
});

app.post("/api/punish", async (request) => {
  const { player_name, reason } = request.body || {};
  await rconCommand(`Punish ${player_name} ${reason || ""}`);
  return crcONResponse({ message: "ok" });
});

app.post("/api/kick", async (request) => {
  const { player_name, reason } = request.body || {};
  await rconCommand(`Kick ${player_name} ${reason || ""}`);
  return crcONResponse({ message: "ok" });
});

app.post("/api/temp_ban", async (request) => {
  const { player_name, duration_hours, reason } = request.body || {};
  await rconCommand(`TempBan ${player_name} ${duration_hours || 1} ${reason || ""}`);
  return crcONResponse({ message: "ok" });
});

app.post("/api/perma_ban", async (request) => {
  const { player_name, reason } = request.body || {};
  await rconCommand(`PermaBan ${player_name} ${reason || ""}`);
  return crcONResponse({ message: "ok" });
});

app.post("/api/switch_player_now", async (request) => {
  const { player_name } = request.body || {};
  await rconCommand(`SwitchPlayerNow ${player_name}`);
  return crcONResponse({ message: "ok" });
});

app.post("/api/switch_player_on_death", async (request) => {
  const { player_name } = request.body || {};
  await rconCommand(`SwitchPlayerOnDeath ${player_name}`);
  return crcONResponse({ message: "ok" });
});

app.post("/api/add_vip", async (request) => {
  const { player_id, description } = request.body || {};
  await rconCommand(`AddVipBySteamID ${player_id} ${description || ""}`);
  return crcONResponse({ message: "ok" });
});

app.post("/api/set_map", async (request) => {
  const { map_name } = request.body || {};
  await rconCommand(`SetMap ${map_name}`);
  return crcONResponse({ message: "ok" });
});

app.get("/api/get_scoreboard_maps", async (request) => {
  const limit = Number(request.query.limit || 50);
  const rows = getMatches.all(limit).map((m) => ({
    id: m.id,
    map_name: m.map_name,
    start: m.started_at,
    end: m.ended_at,
    allied_score: m.allied_score,
    axis_score: m.axis_score,
  }));
  return crcONResponse({ maps: rows });
});

app.get("/api/get_map_scoreboard", async (request) => {
  const mapId = Number(request.query.map_id);
  const match = getMatch.get(mapId);
  if (!match) return crcONResponse({ players: [] });
  const players = getMatchPlayers.all(mapId).map((p) => ({
    map_id: mapId,
    player_id: p.player_id,
    player: p.player_name,
    name: p.player_name,
    team: p.team,
    kills: p.kills,
    deaths: p.deaths,
    combat: p.combat,
    offense: p.offense,
    defense: p.defense,
    support: p.support,
    time_seconds: p.time_seconds,
  }));
  return crcONResponse({ players });
});

app.get("/health", async () => ({ ok: true }));

// ---------------- Match logger ----------------

let currentMatchId = null;
let currentMapName = null;

async function pollMatch() {
  try {
    const gsRaw = await rconCommand("Get Game State");
    const gs = parseGamestate(gsRaw);
    const playersRaw = await rconCommand("Get Players");
    const players = parsePlayers(playersRaw);

    const now = Math.floor(Date.now() / 1000);
    const mapName = gs.map || "Unknown";

    // Map change detection
    if (mapName !== currentMapName) {
      // Close previous match
      if (currentMatchId) {
        finishMatch.run(now, gs.allied_score, gs.axis_score, currentMatchId);
      }
      // Start new match
      const result = insertMatch.run(mapName, now, gs.allied_score, gs.axis_score);
      currentMatchId = Number(result.lastInsertRowid);
      currentMapName = mapName;

      // Insert current players as initial snapshot
      for (const p of players) {
        insertMatchPlayer.run(
          currentMatchId,
          p.player_id || null,
          p.name,
          p.team || null,
          p.kills,
          p.deaths,
          p.combat,
          p.offense,
          p.defense,
          p.support,
          p.time_seconds
        );
      }
    } else if (currentMatchId) {
      // Update scores on current match
      finishMatch.run(null, gs.allied_score, gs.axis_score, currentMatchId);

      // Upsert players: delete + insert for simplicity
      db.prepare("DELETE FROM match_players WHERE match_id = ?").run(currentMatchId);
      for (const p of players) {
        insertMatchPlayer.run(
          currentMatchId,
          p.player_id || null,
          p.name,
          p.team || null,
          p.kills,
          p.deaths,
          p.combat,
          p.offense,
          p.defense,
          p.support,
          p.time_seconds
        );
      }
    }
  } catch (err) {
    app.log.error({ msg: "pollMatch error", err: err.message });
  }
}

setInterval(pollMatch, 30000);
pollMatch();

app.listen({ port: env.PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
