// Cloudflare Worker: leaderboard + PvP signaling for Tetris Beats.
//
// Mirrors the API of server.js so the static client (served from GitHub Pages)
// can talk to it as a drop-in replacement when it isn't running locally.
//
// Endpoints:
//   GET  /api/health      → { ok: true }
//   GET  /api/scores      → { scores: [...] }
//   POST /api/scores      → { ok: true, scores, rank }
//   GET  /ws              → WebSocket upgrade, routes to a Room Durable Object
//                           by ?code=ABCD. CREATE flows generate a fresh code.
//
// Storage:
//   KV namespace `SCORES` holds the JSON top-10 under key "leaderboard".
//   Durable Object class `Room` holds per-match state (host/guest WS pairs).
//
// CORS is wide-open by design — the client is a static page on github.io and
// the Worker has no auth surface that could be abused beyond the rate limits
// and score-cap already enforced in the POST handler.

const MAX_SCORES = 10;
const MAX_SCORE_VALUE = 10_000_000;
const VALID_MODES = new Set(['story', 'marathon', 'sprint', 'ultra', 'daily']);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
  });
}

function sanitizeName(name) {
  return String(name || 'AAA').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'AAA';
}
function sanitizeMode(m) {
  m = String(m || 'story').toLowerCase();
  return VALID_MODES.has(m) ? m : 'story';
}
function dailyDateStr(now) {
  const d = now ? new Date(now) : new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}
// Legacy single-key for story so existing prod data isn't orphaned. Other
// modes get `lb:<mode>`. Daily gets `lb:daily:<YYYY-MM-DD>` so each day is
// its own ranked list.
function kvKeyFor(mode) {
  if (mode === 'story') return 'leaderboard';
  if (mode === 'daily') return 'lb:daily:' + dailyDateStr();
  return 'lb:' + mode;
}

async function loadScores(env, mode) {
  try {
    const raw = await env.SCORES.get(kvKeyFor(mode || 'story'));
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const lower = (mode === 'sprint');
    return list
      .filter(e => e && (typeof e.score === 'number' || typeof e.timeMs === 'number'))
      .sort((a, b) => lower
        ? ((a.timeMs || Infinity) - (b.timeMs || Infinity))
        : (b.score - a.score))
      .slice(0, MAX_SCORES);
  } catch { return []; }
}

async function saveScores(env, list, mode) {
  await env.SCORES.put(kvKeyFor(mode || 'story'), JSON.stringify(list.slice(0, MAX_SCORES)));
}

// Naive per-IP rate limit using a short-lived KV write would burn the free
// budget. Instead we use the in-memory module scope of this isolate as a
// soft limiter — won't block a determined attacker but stops accidental
// floods from a buggy client.
const postBuckets = new Map();
function allowPost(ip) {
  const now = Date.now();
  const WINDOW = 60_000;
  const LIMIT = 10;
  const bucket = (postBuckets.get(ip) || []).filter(t => now - t < WINDOW);
  if (bucket.length >= LIMIT) return false;
  bucket.push(now);
  postBuckets.set(ip, bucket);
  return true;
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === '/api/health') {
      return json({ ok: true });
    }

    if (path === '/api/scores' && request.method === 'GET') {
      const mode = sanitizeMode(url.searchParams.get('mode'));
      return json({ scores: await loadScores(env, mode), mode });
    }

    if (path === '/api/scores' && request.method === 'POST') {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      if (!allowPost(ip)) return json({ error: 'rate limited' }, { status: 429 });
      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad json' }, { status: 400 }); }
      const m = sanitizeMode(body.mode);
      const lower = (m === 'sprint');
      if (lower) {
        const t = Math.floor(Number(body.timeMs));
        if (!Number.isFinite(t) || t <= 0 || t > 1000 * 60 * 60) {
          return json({ error: 'invalid time' }, { status: 400 });
        }
      } else {
        const n = Math.floor(Number(body.score));
        if (!Number.isFinite(n) || n <= 0 || n > MAX_SCORE_VALUE) {
          return json({ error: 'invalid score' }, { status: 400 });
        }
      }
      const entry = {
        name: sanitizeName(body.name),
        score: Math.max(0, Math.floor(Number(body.score)) || 0),
        lines: Math.max(0, Math.floor(Number(body.lines)) || 0),
        level: Math.max(1, Math.floor(Number(body.level)) || 1),
        date: Date.now(),
      };
      if (lower) entry.timeMs = Math.floor(Number(body.timeMs));
      const list = await loadScores(env, m);
      list.push(entry);
      list.sort((a, b) => lower
        ? ((a.timeMs || Infinity) - (b.timeMs || Infinity))
        : (b.score - a.score));
      const trimmed = list.slice(0, MAX_SCORES);
      await saveScores(env, trimmed, m);
      return json({
        ok: true,
        scores: trimmed,
        mode: m,
        rank: trimmed.findIndex(e => e === entry) + 1 || null,
      });
    }

    // PvP: client connects to /ws?code=XXXX. If code is missing or matches an
    // existing-but-full room, server returns an error message and closes.
    // Empty `code=create` gets a fresh code minted server-side.
    if (path === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const raw = (url.searchParams.get('code') || '').toUpperCase();
      // "CREATE" is the sentinel for "mint a fresh code" — check it BEFORE
      // slicing to 4 chars or it'd reduce to "CREA" and route to a stable
      // (and unwanted) shared room.
      const code = (!raw || raw === 'CREATE') ? randomCode() : raw.slice(0, 4);
      const id = env.ROOMS.idFromName(code);
      const stub = env.ROOMS.get(id);
      // Forward the request. The DO upgrades the WebSocket and tracks members.
      // We pass the resolved code so the DO can echo it back in the `room`
      // message (matches the existing client protocol).
      const fwd = new Request(`https://internal/ws?code=${code}`, request);
      return stub.fetch(fwd);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};

// ============================================================
// Room Durable Object — one instance per 4-letter code. Holds the host/guest
// WebSocket pair and relays state/garbage messages between them. Mirrors the
// protocol of server.js so the existing client speaks to it without changes.
// ============================================================
export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.host = null;
    this.guest = null;
    this.started = false;
    this.spectators = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code') || '????';
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    this.attach(server, code);
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, obj) {
    if (!ws || ws.readyState !== 1) return;
    try { ws.send(JSON.stringify(obj)); } catch {}
  }

  peerOf(ws) {
    return this.host === ws ? this.guest : this.host;
  }

  closeRoom(reason) {
    for (const m of [this.host, this.guest]) {
      if (!m) continue;
      this.send(m, { type: 'peer', joined: false, reason });
      try { m.close(1000, reason); } catch {}
    }
    for (const sp of this.spectators) {
      this.send(sp, { type: 'result', youWon: false, reason: 'match-ended', spectator: true });
      try { sp.close(1000, reason); } catch {}
    }
    this.spectators.clear();
    this.host = null; this.guest = null; this.started = false;
  }

  attach(ws, code) {
    ws.name = 'ANON';
    // Assign role: first attach = host, second = guest, third+ rejected.
    if (!this.host) {
      this.host = ws;
      this.send(ws, { type: 'hello', you: 'host' });
      this.send(ws, { type: 'room', code, host: true });
    } else if (!this.guest && this.host !== ws) {
      this.guest = ws;
      this.send(ws, { type: 'hello', you: 'guest' });
      this.send(ws, { type: 'room', code, host: false });
      this.send(this.host, { type: 'peer', joined: true, name: ws.name });
      this.send(this.guest, { type: 'peer', joined: true, name: this.host.name });
    } else {
      this.send(ws, { type: 'error', message: 'room full' });
      try { ws.close(1000, 'full'); } catch {}
      return;
    }

    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data)); }
      catch { return this.send(ws, { type: 'error', message: 'bad json' }); }
      if (!msg || typeof msg.type !== 'string') return;
      switch (msg.type) {
        case 'hello': {
          ws.name = sanitizeName(msg.name);
          // Re-broadcast the corrected name to the peer so they see something
          // better than ANON in the lobby + result screens.
          const peer = this.peerOf(ws);
          if (peer) this.send(peer, { type: 'peer', joined: true, name: ws.name });
          break;
        }
        case 'create':
        case 'join':
          // The Worker assigned the room before this DO ran, so these are
          // no-ops here; the existing client sends them but we already
          // hello/room'd above.
          break;
        case 'spectate': {
          // Read-only join. Demote the role: this socket is now a spectator,
          // not host/guest. (The Worker's attach() assigned host/guest by
          // arrival order; if the third+ visitor sent spectate, attach()
          // already rejected them as 'room full'. So this re-entrancy only
          // matters for clients that connect early-but-spectate-only.)
          if (this.host === ws) this.host = null;
          if (this.guest === ws) this.guest = null;
          this.spectators.add(ws);
          ws.isSpectator = true;
          this.send(ws, { type: 'room', code: msg.code || '', host: false, spectator: true });
          if (this.host)  this.send(this.host,  { type: 'spectator-joined' });
          if (this.guest) this.send(this.guest, { type: 'spectator-joined' });
          break;
        }
        case 'ready': {
          if (!this.host || !this.guest || this.started) return;
          this.started = true;
          const seed = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
          this.send(this.host,  { type: 'start', seed, yourSide: 'host',  opponent: this.guest.name });
          this.send(this.guest, { type: 'start', seed, yourSide: 'guest', opponent: this.host.name });
          break;
        }
        case 'state':
        case 'garbage': {
          if (!this.started) return;
          if (ws.isSpectator) return; // spectators never push state
          const peer = this.peerOf(ws);
          if (peer) this.send(peer, msg);
          if (this.spectators.size) {
            const tagged = Object.assign({}, msg, { side: this.host === ws ? 'host' : 'guest' });
            for (const sp of this.spectators) this.send(sp, tagged);
          }
          break;
        }
        case 'topout': {
          if (!this.started) return;
          const peer = this.peerOf(ws);
          if (peer) this.send(peer, { type: 'result', youWon: true, reason: 'topout' });
          this.send(ws, { type: 'result', youWon: false, reason: 'topout' });
          this.closeRoom('match-ended');
          break;
        }
        case 'leave': {
          const peer = this.peerOf(ws);
          if (peer) this.send(peer, { type: 'result', youWon: true, reason: 'disconnect' });
          this.closeRoom('left');
          break;
        }
      }
    });

    ws.addEventListener('close', () => {
      if (ws.isSpectator) {
        this.spectators.delete(ws);
        return; // spectator leaving doesn't end the match
      }
      const peer = this.peerOf(ws);
      if (peer && this.started) this.send(peer, { type: 'result', youWon: true, reason: 'disconnect' });
      if (this.host === ws) this.host = null;
      if (this.guest === ws) this.guest = null;
      if (!this.host && !this.guest) this.started = false;
    });
  }
}
