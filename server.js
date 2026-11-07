// Tetris Beats — shared leaderboard + PvP lobby server.
//
// Local development server only. Production deploy uses GitHub Pages for the
// static frontend + a Cloudflare Worker for the leaderboard/PvP API — see
// DEPLOY.md. This server runs on 0.0.0.0:PORT (default 8765) and is intended
// for use on your LAN during development.
//
// Surfaces:
//   GET  /                → static index.html + assets
//   GET  /api/scores      → top-10 leaderboard
//   POST /api/scores      → submit {name, score, lines, level}
//   WS   /ws              → PvP matchmaking + state relay
//
// Scores live at ~/.openclaw/data/tetris-scores.json so they survive repo cleanups.
// Rooms are in-memory; if the server restarts, active matches end.

const express = require('express');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const http = require('http');

const PORT = Number(process.env.PORT) || 8765;
const ROOT = __dirname;
const DATA_DIR = path.join(os.homedir(), '.openclaw', 'data');
const SCORES_FILE = path.join(DATA_DIR, 'tetris-scores.json');
const MAX_SCORES = 10;
// Cap a single score at a sanity threshold — beyond this it's almost certainly
// a replay-bot or someone poking the endpoint manually. Real Tetris at
// reasonable depth maxes around 1–2 M; 10 M is a comfortable ceiling.
const MAX_SCORE_VALUE = 10_000_000;
// Per-mode/per-day leaderboards live in separate files under DATA_DIR/leaderboards.
// Daily key suffixes the UTC date so each day gets its own table.
const LB_DIR = path.join(DATA_DIR, 'leaderboards');
const VALID_MODES = new Set(['story', 'marathon', 'sprint', 'ultra', 'daily']);

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  try { fs.mkdirSync(LB_DIR,   { recursive: true }); } catch {}
}
function dailyDateStr(now) {
  const d = now ? new Date(now) : new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fileForMode(mode) {
  if (!VALID_MODES.has(mode)) return SCORES_FILE; // legacy fallback
  if (mode === 'story') return SCORES_FILE;       // legacy filename for backwards compat
  if (mode === 'daily') return path.join(LB_DIR, `daily-${dailyDateStr()}.json`);
  return path.join(LB_DIR, `${mode}.json`);
}
// In-memory leaderboard cache keyed by resolved file path. This process is
// the only writer, so entries stay valid until saveScores() refreshes them.
// Keying by path (not mode) means the daily file's UTC-midnight rollover is
// a natural cache miss — no TTL bookkeeping needed.
const _scoresCache = new Map();
function loadScores(mode) {
  const file = fileForMode(mode || 'story');
  const cached = _scoresCache.get(file);
  // Return a copy so callers can push/sort without corrupting the cache.
  if (cached) return cached.slice();
  let list;
  try {
    list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) list = [];
  } catch { list = []; }
  const lower = (mode === 'sprint');
  const cleaned = list
    .filter(e => e && (typeof e.score === 'number' || typeof e.timeMs === 'number'))
    .sort((a, b) => lower
      ? ((a.timeMs || Infinity) - (b.timeMs || Infinity))
      : (b.score - a.score))
    .slice(0, MAX_SCORES);
  _scoresCache.set(file, cleaned);
  return cleaned.slice();
}
function saveScores(list, mode) {
  ensureDataDir();
  const file = fileForMode(mode || 'story');
  const trimmed = list.slice(0, MAX_SCORES);
  fs.writeFileSync(file, JSON.stringify(trimmed, null, 2));
  _scoresCache.set(file, trimmed.slice());
}
function sanitizeName(name) {
  return String(name || 'AAA').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'AAA';
}
function sanitizeMode(m) {
  m = String(m || 'story').toLowerCase();
  return VALID_MODES.has(m) ? m : 'story';
}
// VS stage/world index (into the client's LEVEL_THEMES). The server just
// relays the host's pick; the client clamps to the real theme count. Bound to
// a sane range so a bogus value can't be echoed to peers.
function clampStage(v) {
  const n = Math.floor(Number(v));
  return (Number.isFinite(n) && n >= 1) ? Math.min(n, 40) : 1;
}

// ----------------------------------------------------------------
// Rate limiting (per-IP, naive sliding window) for POST /api/scores
// ----------------------------------------------------------------
const postBuckets = new Map();
const RATE_WINDOW = 60_000; // 1 min
function allowPost(ip) {
  const now = Date.now();
  const LIMIT = 10;        // 10 submits/min/IP — fine for playing, blocks floods
  let bucket = postBuckets.get(ip) || [];
  bucket = bucket.filter(t => now - t < RATE_WINDOW);
  if (bucket.length >= LIMIT) return false;
  bucket.push(now);
  postBuckets.set(ip, bucket);
  return true;
}
// Sweep stale rate-limit buckets so the map doesn't grow one entry per IP
// forever on a long-lived server. unref() keeps the timer from holding the
// process open on shutdown.
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW;
  for (const [ip, bucket] of postBuckets) {
    if (!bucket.length || bucket[bucket.length - 1] < cutoff) postBuckets.delete(ip);
  }
}, 5 * 60_000).unref();

// ----------------------------------------------------------------
// Express setup
// ----------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '32kb' }));

app.get('/api/scores', (req, res) => {
  const mode = sanitizeMode(req.query.mode);
  res.json({ scores: loadScores(mode), mode });
});

app.post('/api/scores', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!allowPost(ip)) return res.status(429).json({ error: 'rate limited' });
  const { name, score, lines, level, timeMs, mode } = req.body || {};
  const m = sanitizeMode(mode);
  const lower = (m === 'sprint');
  // Sprint ranks on time; everything else on score. Validate accordingly.
  if (lower) {
    const t = Math.floor(Number(timeMs));
    if (!Number.isFinite(t) || t <= 0 || t > 1000 * 60 * 60) {
      return res.status(400).json({ error: 'invalid time' });
    }
  } else {
    const n = Math.floor(Number(score));
    if (!Number.isFinite(n) || n <= 0 || n > MAX_SCORE_VALUE) {
      return res.status(400).json({ error: 'invalid score' });
    }
  }
  const entry = {
    name: sanitizeName(name),
    score: Math.max(0, Math.floor(Number(score)) || 0),
    lines: Math.max(0, Math.floor(Number(lines)) || 0),
    level: Math.max(1, Math.floor(Number(level)) || 1),
    date: Date.now(),
  };
  if (lower) entry.timeMs = Math.floor(Number(timeMs));
  const list = loadScores(m);
  list.push(entry);
  list.sort((a, b) => lower
    ? ((a.timeMs || Infinity) - (b.timeMs || Infinity))
    : (b.score - a.score));
  const trimmed = list.slice(0, MAX_SCORES);
  saveScores(trimmed, m);
  res.json({ ok: true, scores: trimmed, mode: m, rank: trimmed.findIndex(e => e === entry) + 1 || null });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, clients: wss.clients.size });
});

// Static — index.html and any other assets in the folder. Default route falls
// through to index.html for the SPA experience. Heavy immutable-ish media
// (84 MB of MP3s + tile art) gets a real max-age so phones on the LAN don't
// re-request every track on each reload; index.html stays no-cache so code
// changes land on refresh.
app.use(express.static(ROOT, {
  index: 'index.html',
  setHeaders(res, filePath) {
    if (/\.(mp3|ogg|wav|png|jpg|jpeg|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// ----------------------------------------------------------------
// WebSocket PvP — rooms, seeded bags, state relay
// ----------------------------------------------------------------
// Protocol (JSON messages):
//   client → server:
//     { type:"hello", name:"IVN" }
//     { type:"create" }
//     { type:"join",  code:"ABCD" }
//     { type:"ready" }
//     { type:"state", board:<ROWSxCOLS colors|null>, score:n, lines:n, level:n,
//                     piece:{type,x,y,rot} }
//     { type:"garbage", n:<int> }
//     { type:"topout" }
//     { type:"next-round" }            // ack readiness for next round (best-of-3)
//     { type:"leave" }
//   server → client:
//     { type:"hello", you:<id> }
//     { type:"room",  code, host:bool }
//     { type:"peer",  name, joined:bool }
//     { type:"start", seed:<str>, yourSide:"host"|"guest", opponent:<name> }
//     { type:"state", ... }           (forwarded from peer)
//     { type:"garbage", n }           (forwarded from peer)
//     { type:"round-result", youWon:bool, reason:"topout",
//         match:{ yours, theirs, target } }     // mid-match: room stays open
//     { type:"result", youWon:bool, reason:"topout"|"disconnect",
//         match?:{ yours, theirs, target } }    // match over: room closes
//     { type:"peer-ready" }            // opponent clicked NEXT ROUND
//     { type:"error", message }

// How long a mid-match player may be disconnected before we award the match to
// the opponent. Mobile browsers routinely close the WebSocket on backgrounding,
// screen-lock, or a WiFi<->cellular switch; ending the match the instant that
// happens is the "it ended without me beating them" bug. During this window the
// room is held open and the peer is told to wait, so a quick reconnect resumes
// the same round instead of spuriously ending it.
const RECONNECT_GRACE_MS = Number(process.env.RECONNECT_GRACE_MS) || 30_000;

const rooms = new Map();    // code -> { host, guest, started, spectators, awaiting, graceT }
function randomCode() {
  // 4-char uppercase — easy to read aloud ("tango-oscar-one-seven")
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/L/O/0/1 (ambiguous)
  let out = '';
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
function newSeed() {
  return crypto.randomBytes(8).toString('hex');
}
function send(ws, obj) {
  if (!ws || ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(obj)); } catch {}
}
// Forward an already-serialized frame verbatim. The 10 Hz state relay is the
// hot path — re-encoding the parsed object there just burns CPU per message.
function sendRaw(ws, text) {
  if (!ws || ws.readyState !== 1) return;
  try { ws.send(text); } catch {}
}

function peerOf(ws, room) {
  return room.host === ws ? room.guest : room.host;
}

function closeRoom(room, reason) {
  if (!room) return;
  // Cancel any pending reconnect grace timers so they don't fire after teardown.
  if (room.graceT) {
    for (const side of ['host', 'guest']) {
      if (room.graceT[side]) { clearTimeout(room.graceT[side]); room.graceT[side] = null; }
    }
  }
  for (const member of [room.host, room.guest]) {
    if (!member) continue;
    send(member, { type: 'peer', joined: false, reason });
    member.room = null;
  }
  if (room.spectators) {
    for (const sp of room.spectators) {
      send(sp, { type: 'result', youWon: false, reason: 'match-ended', spectator: true });
      sp.room = null;
    }
    room.spectators.clear();
  }
  rooms.delete(room.code);
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  ws.id = crypto.randomBytes(3).toString('hex');
  ws.name = 'ANON';
  ws.room = null;
  send(ws, { type: 'hello', you: ws.id });

  ws.on('message', (raw) => {
    const text = String(raw);
    let msg;
    try { msg = JSON.parse(text); }
    catch { return send(ws, { type: 'error', message: 'bad json' }); }
    if (!msg || typeof msg.type !== 'string') return;

    switch (msg.type) {
      case 'hello': {
        ws.name = sanitizeName(msg.name);
        break;
      }
      case 'create': {
        if (ws.room) return send(ws, { type: 'error', message: 'already in room' });
        let code; do { code = randomCode(); } while (rooms.has(code));
        // Best-of-3: scores persist across rounds; nextReady tracks per-side
        // readiness for the next round handshake; target is the first-to count
        // that wins the match (2 = first-to-2 round wins).
        const room = {
          code, host: ws, guest: null, started: false, spectators: new Set(),
          target: 2,
          scores: { host: 0, guest: 0 },
          nextReady: { host: false, guest: false },
          // Reconnect bookkeeping: `awaiting[side]` is true while that slot's
          // player is disconnected but still inside their grace window;
          // `graceT[side]` holds the pending "award the match" timer.
          awaiting: { host: false, guest: false },
          graceT: { host: null, guest: null },
          // VS world/stage chosen by the host; synced to the guest at join +
          // match start so both play the same world.
          stage: clampStage(msg.stage),
        };
        rooms.set(code, room);
        ws.room = room;
        send(ws, { type: 'room', code, host: true });
        break;
      }
      case 'spectate': {
        // Read-only join: receive state/result broadcasts but never send any
        // game-affecting messages. Don't block the second player from joining.
        const code = String(msg.code || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) return send(ws, { type: 'error', message: 'room not found' });
        if (room.host === ws || room.guest === ws) {
          return send(ws, { type: 'error', message: 'players cannot spectate own match' });
        }
        room.spectators.add(ws);
        ws.room = room;
        ws.isSpectator = true;
        send(ws, { type: 'room', code, host: false, spectator: true });
        // Replay current state to the new spectator so they don't sit on a
        // blank board waiting for the next 10Hz tick. Players get a "viewer
        // joined" notice (cosmetic; doesn't gate gameplay).
        if (room.host)  send(room.host,  { type: 'spectator-joined' });
        if (room.guest) send(room.guest, { type: 'spectator-joined' });
        break;
      }
      case 'join': {
        const code = String(msg.code || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) return send(ws, { type: 'error', message: 'room not found' });
        if (room.guest) return send(ws, { type: 'error', message: 'room full' });
        if (room.host === ws) return send(ws, { type: 'error', message: 'cannot join own room' });
        room.guest = ws;
        ws.room = room;
        send(ws, { type: 'room', code, host: false });
        send(room.host, { type: 'peer', joined: true, name: ws.name });
        // Tell the guest the host's chosen world so their lobby shows it.
        send(room.guest, { type: 'peer', joined: true, name: room.host.name, stage: room.stage });
        break;
      }
      case 'ready': {
        const room = ws.room;
        if (!room || !room.host || !room.guest) return;
        // Let the host refresh their stage pick at match start (covers a change
        // made after room creation). Only the host's choice counts.
        if (ws === room.host && msg.stage != null) room.stage = clampStage(msg.stage);
        // Host triggers start when ready is received. Both sides get the same
        // seed so their 7-bag sequences are identical, and the same stage.
        if (room.started) return;
        room.started = true;
        const seed = newSeed();
        send(room.host,  { type: 'start', seed, yourSide: 'host',  opponent: room.guest.name, stage: room.stage });
        send(room.guest, { type: 'start', seed, yourSide: 'guest', opponent: room.host.name, stage: room.stage });
        break;
      }
      case 'state':
      case 'garbage': {
        const room = ws.room;
        if (!room || !room.started) return;
        if (ws.isSpectator) return; // spectators never push state
        const peer = peerOf(ws, room);
        // Relay the original frame verbatim — no re-serialization on the
        // 10 Hz hot path. The parse above already validated it as JSON.
        if (peer) sendRaw(peer, text);
        // Tag the side that produced the update so spectators can render
        // both player feeds (server already knows; player code already in
        // PvP doesn't need the tag because there are exactly 2 sides).
        if (room.spectators && room.spectators.size) {
          const tagged = JSON.stringify(Object.assign({}, msg, { side: room.host === ws ? 'host' : 'guest' }));
          for (const sp of room.spectators) sendRaw(sp, tagged);
        }
        break;
      }
      case 'topout': {
        const room = ws.room;
        if (!room || !room.started) return;
        // Award the round to the peer (whoever didn't top out).
        const loserSide  = room.host === ws ? 'host' : 'guest';
        const winnerSide = loserSide === 'host' ? 'guest' : 'host';
        room.scores[winnerSide] = (room.scores[winnerSide] | 0) + 1;
        const matchOver = room.scores[winnerSide] >= room.target;
        // Per-side payload: each player gets a match summary in their own
        // perspective ({yours, theirs, target}) so client UIs don't need to
        // know which side they are.
        const payloadFor = (side) => ({
          match: {
            yours: room.scores[side] | 0,
            theirs: room.scores[side === 'host' ? 'guest' : 'host'] | 0,
            target: room.target,
          },
          reason: 'topout',
        });
        const peer = peerOf(ws, room);
        if (matchOver) {
          if (peer) send(peer, Object.assign({ type: 'result', youWon: true },  payloadFor(winnerSide)));
          send(ws,            Object.assign({ type: 'result', youWon: false }, payloadFor(loserSide)));
          closeRoom(room, 'match-ended');
        } else {
          // Round done, match continues. Keep the room alive but mark it not
          // started so neither side can stream stale state until both clients
          // send `next-round` and we mint a fresh `start`.
          room.started = false;
          room.nextReady = { host: false, guest: false };
          if (peer) send(peer, Object.assign({ type: 'round-result', youWon: true },  payloadFor(winnerSide)));
          send(ws,            Object.assign({ type: 'round-result', youWon: false }, payloadFor(loserSide)));
          // Spectators see both feeds; broadcast a tagged version so their UI
          // can update its scoreboard.
          if (room.spectators && room.spectators.size) {
            const tagged = {
              type: 'round-result',
              spectator: true,
              hostWins: room.scores.host | 0,
              guestWins: room.scores.guest | 0,
              target: room.target,
              loserSide,
            };
            for (const sp of room.spectators) send(sp, tagged);
          }
        }
        break;
      }
      case 'next-round': {
        const room = ws.room;
        if (!room || !room.host || !room.guest) return;
        if (room.started) return; // gameplay still active; ignore stale clicks
        const side = room.host === ws ? 'host' : 'guest';
        room.nextReady[side] = true;
        const peer = peerOf(ws, room);
        if (peer) send(peer, { type: 'peer-ready' });
        if (room.nextReady.host && room.nextReady.guest) {
          // Both sides clicked NEXT ROUND — start a fresh round with a new
          // seed (so the 7-bag sequence isn't a replay). Match scores stay
          // intact for the next topout to read.
          room.nextReady = { host: false, guest: false };
          room.started = true;
          const seed = newSeed();
          send(room.host,  { type: 'start', seed, yourSide: 'host',  opponent: room.guest.name, stage: room.stage });
          send(room.guest, { type: 'start', seed, yourSide: 'guest', opponent: room.host.name, stage: room.stage });
        }
        break;
      }
      case 'rejoin': {
        // A player whose socket dropped mid-match reconnects and reclaims its
        // original side. Only valid while that slot is inside its grace window.
        const code = String(msg.code || '').toUpperCase();
        const side = (msg.side === 'host' || msg.side === 'guest') ? msg.side : null;
        const room = rooms.get(code);
        if (!room || !side) return send(ws, { type: 'rejoin-failed', reason: 'no-room' });
        if (!room.awaiting[side]) return send(ws, { type: 'rejoin-failed', reason: 'slot-active' });
        // Re-bind this socket to the slot and cancel the pending award timer.
        room.awaiting[side] = false;
        if (room.graceT[side]) { clearTimeout(room.graceT[side]); room.graceT[side] = null; }
        if (side === 'host') room.host = ws; else room.guest = ws;
        ws.room = room;
        const peer = peerOf(ws, room);
        send(ws, {
          type: 'rejoined',
          code, side,
          opponent: peer ? peer.name : 'OPPONENT',
          started: !!room.started,
          match: {
            yours: room.scores[side] | 0,
            theirs: room.scores[side === 'host' ? 'guest' : 'host'] | 0,
            target: room.target,
          },
        });
        if (peer) send(peer, { type: 'opponent-reconnected' });
        break;
      }
      case 'leave': {
        if (ws.room) {
          const peer = peerOf(ws, ws.room);
          if (peer) send(peer, { type: 'result', youWon: true, reason: 'disconnect' });
          closeRoom(ws.room, 'left');
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!ws.room) return;
    const room = ws.room;
    if (ws.isSpectator) {
      // Spectator leaving doesn't end the match.
      try { room.spectators.delete(ws); } catch {}
      return;
    }
    const side = room.host === ws ? 'host' : (room.guest === ws ? 'guest' : null);
    const peer = peerOf(ws, room);
    // Mid-match drop: hold a grace window for reconnection instead of ending
    // the match immediately. The opponent is told to wait; if the player
    // reconnects (via `rejoin`) in time the same round resumes. Only if the
    // window lapses do we award the match on a genuine disconnect.
    if (room.started && side && !room.awaiting[side]) {
      if (room.host === ws) room.host = null;
      if (room.guest === ws) room.guest = null;
      room.awaiting[side] = true;
      if (peer) send(peer, { type: 'opponent-dropped', graceMs: RECONNECT_GRACE_MS });
      if (room.graceT[side]) clearTimeout(room.graceT[side]);
      room.graceT[side] = setTimeout(() => {
        if (!room.awaiting[side]) return;          // reconnected in time
        room.awaiting[side] = false;
        const stillPeer = side === 'host' ? room.guest : room.host;
        if (stillPeer) send(stillPeer, { type: 'result', youWon: true, reason: 'disconnect' });
        closeRoom(room, 'disconnect-timeout');
      }, RECONNECT_GRACE_MS);
      return;
    }
    // Lobby stage / already-ended / no active slot: tear down as before.
    if (peer) send(peer, { type: 'result', youWon: true, reason: 'disconnect' });
    closeRoom(room, 'disconnect');
  });
});

// ----------------------------------------------------------------
// Boot
// ----------------------------------------------------------------
ensureDataDir();
// Seed-empty scores file so `loadScores()` always returns [].
if (!fs.existsSync(SCORES_FILE)) saveScores([]);

server.listen(PORT, '0.0.0.0', () => {
  // Log local IPs so you can open the game from another device on the same LAN.
  const nets = os.networkInterfaces();
  const lan = [];
  for (const addrs of Object.values(nets)) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) lan.push(a.address);
    }
  }
  console.log(`[tetris] listening on 0.0.0.0:${PORT}`);
  for (const ip of lan) console.log(`[tetris]   LAN: http://${ip}:${PORT}`);
});
