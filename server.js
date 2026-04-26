// Tetris Beats — shared leaderboard + PvP lobby server.
//
// Runs on 0.0.0.0:PORT (default 8765). Accessible via:
//   - LAN        http://<mac-lan-ip>:8765          (when home)
//   - Tailscale  https://alfreds-mac-mini.tail493f2f.ts.net:8443   (anywhere)
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

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
function loadScores() {
  try {
    const raw = fs.readFileSync(SCORES_FILE, 'utf8');
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter(e => e && typeof e.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES);
  } catch { return []; }
}
function saveScores(list) {
  ensureDataDir();
  fs.writeFileSync(SCORES_FILE, JSON.stringify(list.slice(0, MAX_SCORES), null, 2));
}
function sanitizeName(name) {
  return String(name || 'AAA').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'AAA';
}

// ----------------------------------------------------------------
// Rate limiting (per-IP, naive sliding window) for POST /api/scores
// ----------------------------------------------------------------
const postBuckets = new Map();
function allowPost(ip) {
  const now = Date.now();
  const WINDOW = 60_000;   // 1 min
  const LIMIT = 10;        // 10 submits/min/IP — fine for playing, blocks floods
  let bucket = postBuckets.get(ip) || [];
  bucket = bucket.filter(t => now - t < WINDOW);
  if (bucket.length >= LIMIT) return false;
  bucket.push(now);
  postBuckets.set(ip, bucket);
  return true;
}

// ----------------------------------------------------------------
// Express setup
// ----------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '32kb' }));

app.get('/api/scores', (_req, res) => {
  res.json({ scores: loadScores() });
});

app.post('/api/scores', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!allowPost(ip)) return res.status(429).json({ error: 'rate limited' });
  const { name, score, lines, level } = req.body || {};
  const n = Math.floor(Number(score));
  if (!Number.isFinite(n) || n <= 0 || n > MAX_SCORE_VALUE) {
    return res.status(400).json({ error: 'invalid score' });
  }
  const entry = {
    name: sanitizeName(name),
    score: n,
    lines: Math.max(0, Math.floor(Number(lines)) || 0),
    level: Math.max(1, Math.floor(Number(level)) || 1),
    date: Date.now(),
  };
  const list = loadScores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_SCORES);
  saveScores(trimmed);
  res.json({ ok: true, scores: trimmed, rank: trimmed.findIndex(e => e === entry) + 1 || null });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, clients: wss.clients.size });
});

// Static — index.html and any other assets in the folder. Default route falls
// through to index.html for the SPA experience.
app.use(express.static(ROOT, { index: 'index.html' }));

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
//     { type:"leave" }
//   server → client:
//     { type:"hello", you:<id> }
//     { type:"room",  code, host:bool }
//     { type:"peer",  name, joined:bool }
//     { type:"start", seed:<str>, yourSide:"host"|"guest", opponent:<name> }
//     { type:"state", ... }           (forwarded from peer)
//     { type:"garbage", n }           (forwarded from peer)
//     { type:"result", youWon:bool, reason:"topout"|"disconnect" }
//     { type:"error", message }

const rooms = new Map();    // code -> { host, guest, started }
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

function peerOf(ws, room) {
  return room.host === ws ? room.guest : room.host;
}

function closeRoom(room, reason) {
  if (!room) return;
  for (const member of [room.host, room.guest]) {
    if (!member) continue;
    send(member, { type: 'peer', joined: false, reason });
    member.room = null;
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
    let msg;
    try { msg = JSON.parse(String(raw)); }
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
        const room = { code, host: ws, guest: null, started: false };
        rooms.set(code, room);
        ws.room = room;
        send(ws, { type: 'room', code, host: true });
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
        send(room.guest, { type: 'peer', joined: true, name: room.host.name });
        break;
      }
      case 'ready': {
        const room = ws.room;
        if (!room || !room.host || !room.guest) return;
        // Host triggers start when ready is received. Both sides get the same
        // seed so their 7-bag sequences are identical.
        if (room.started) return;
        room.started = true;
        const seed = newSeed();
        send(room.host,  { type: 'start', seed, yourSide: 'host',  opponent: room.guest.name });
        send(room.guest, { type: 'start', seed, yourSide: 'guest', opponent: room.host.name });
        break;
      }
      case 'state':
      case 'garbage': {
        const room = ws.room;
        if (!room || !room.started) return;
        const peer = peerOf(ws, room);
        if (peer) send(peer, msg);
        break;
      }
      case 'topout': {
        const room = ws.room;
        if (!room || !room.started) return;
        const peer = peerOf(ws, room);
        if (peer) send(peer, { type: 'result', youWon: true, reason: 'topout' });
        send(ws, { type: 'result', youWon: false, reason: 'topout' });
        closeRoom(room, 'match-ended');
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
    if (ws.room) {
      const peer = peerOf(ws, ws.room);
      if (peer) send(peer, { type: 'result', youWon: true, reason: 'disconnect' });
      closeRoom(ws.room, 'disconnect');
    }
  });
});

// ----------------------------------------------------------------
// Boot
// ----------------------------------------------------------------
ensureDataDir();
// Seed-empty scores file so `loadScores()` always returns [].
if (!fs.existsSync(SCORES_FILE)) saveScores([]);

server.listen(PORT, '0.0.0.0', () => {
  // Log both interfaces so the launchd log tells Sir how to reach it.
  const nets = os.networkInterfaces();
  const lan = [];
  for (const addrs of Object.values(nets)) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) lan.push(a.address);
    }
  }
  console.log(`[tetris] listening on 0.0.0.0:${PORT}`);
  for (const ip of lan) console.log(`[tetris]   LAN:       http://${ip}:${PORT}`);
  console.log(`[tetris]   Tailscale: https://alfreds-mac-mini.tail493f2f.ts.net:8443  (proxied)`);
});
