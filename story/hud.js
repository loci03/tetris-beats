// BattleHUD — the rhythm battle's 2D overlay: both dancers' score, move
// level, dance-string progress, enthusiasm and jammers, the groove
// tug-of-war meter and timer, and — at the bottom — each dancer's COMMAND
// BAR (CommandBar): the command(s) on offer (TOP line, and the harder
// BOTTOM line when it's eligible) as direction boxes plus a separate ✕ / ○
// box, filled in as the directions are entered, a BEAT 1-2-3-4 track with
// the marker driven by the same audio clock as the judge, and the
// judgment. On touch screens: swipe for directions, ✕ ○ △ □ pads.
// Everything here only *reads* battle state; it never decides a result.

import { DRAW } from './anime-fx.js';
import { GLYPH, commandStatus } from './commands.js';

const DIR_GLYPH = { L: '←', U: '↑', D: '↓', R: '→' };
const DIR_COLOR = { L: '#ff4f9a', U: '#39d0ff', D: '#4be08a', R: '#ffa53a' };
const BTN_COLOR = { X: '#7fb2ff', O: '#ff6b6b', T: '#5dffb0', S: '#ff8ad8' };
const JUDGE_COLOR = { perfect: '#ffe45c', great: '#5dffb0', good: '#7ecbff', miss: '#ff5a6e' };
const REASON = { early: 'TOO EARLY', late: 'TOO LATE', incomplete: 'INCOMPLETE', 'wrong-button': 'WRONG BUTTON' };

function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export class BattleHUD {
  // controlsHint: e.g. 'Arrows / WASD · ✕ J · ○ K · △ I · □ U'
  constructor({ names, isTouch, onPad, onPause, controlsHint = '', twoPlayer = false, hints2 = null }) {
    this.names = names;
    this.root = el('div', 'story-hud' + (twoPlayer ? ' sh-2p' : ''));
    this.root.setAttribute('aria-live', 'polite');
    const top = el('div', 'sh-top', this.root);
    this.p = this._panel(top, 'sh-p1', names.player);
    const mid = el('div', 'sh-mid', top);
    const timerRow = el('div', 'sh-timer-row', mid);
    this.timer = el('div', 'sh-timer', timerRow, '1:00');
    if (onPause) {
      const pb = el('button', 'sh-pause', timerRow, '❚❚');
      pb.type = 'button';
      pb.setAttribute('aria-label', 'Pause');
      pb.addEventListener('click', (e) => { e.preventDefault(); onPause(); });
    }
    const gm = el('div', 'sh-groove', mid);
    el('span', 'sh-groove-l', gm, twoPlayer ? 'P1' : 'YOU');
    this.grooveBar = el('div', 'sh-groove-bar', gm);
    this.grooveKnob = el('i', '', this.grooveBar);
    el('span', 'sh-groove-r', gm, names.rival);
    this.r = this._panel(top, 'sh-p2', names.rival);

    this.banner = el('div', 'sh-banner', this.root);
    this.callout = el('div', 'sh-callout', this.root);

    // Command bars: YOU at the bottom centre, the rival's compact one to the
    // right — each with its own state, judgments and feedback.
    // 2P VS: two full-size bars side by side, each with its keys.
    const bottom = this.bottom = el('div', 'sh-bottom', this.root);
    if (twoPlayer) {
      const col = (who, hint) => { const c = el('div', 'sh-col', bottom); el('div', 'sh-hint', c, isTouch ? '' : hint); return c; };
      const c1 = col('player', hints2 ? hints2[0] : ''), c2 = col('rival', hints2 ? hints2[1] : '');
      this.bars = {
        player: new CommandBar(c1, { who: 'player', label: names.player }),
        rival: new CommandBar(c2, { who: 'rival', label: names.rival }),
      };
    } else {
      this.hint = el('div', 'sh-hint', bottom, isTouch ? '' : controlsHint);
      this.bars = {
        player: new CommandBar(bottom, { who: 'player', label: names.player }),
        rival: new CommandBar(this.root, { who: 'rival', label: names.rival, small: true }),
      };
    }

    if (isTouch) {
      // Touch: swipe anywhere for the directions; the four face buttons.
      this.root.classList.add('sh-touch');
      this.swipeZone = el('div', 'sh-swipe', this.root);
      this._initSwipe(this.swipeZone, onPad);
      const pads = el('div', 'sh-pads', this.root);
      el('div', 'sh-swipe-hint', pads, 'SWIPE <b>←&#8202;↑&#8202;↓&#8202;→</b> ANY TIME<br>THEN ✕ / ○ ON BEAT 4');
      const face = el('div', 'sh-face', pads);
      for (const [a, cls] of [['T', 'n'], ['S', 'w'], ['O', 'e'], ['X', 's']]) {
        const b = this._pad(face, `sh-pad sh-face-${cls}`, GLYPH[a], (ts) => onPad(a, ts), BTN_COLOR[a]);
        if (a === 'T') this.tauntPad = b;
      }
    }
    document.body.appendChild(this.root);
    this._bannerTimer = 0;
    this._calloutTimer = 0;
    this.resize();
  }

  _panel(parent, cls, name) {
    const p = el('div', 'sh-panel ' + cls, parent);
    el('div', 'sh-name', p, name);
    const score = el('div', 'sh-score', p, '0');
    const row = el('div', 'sh-row', p);
    const lv = el('div', 'sh-lv', row, 'LV 1');
    // Dance-string progress: 8 rows, the last one the freeze.
    const str = el('div', 'sh-string', row);
    const rows = [0, 1, 2, 3, 4, 5, 6, 7].map(i => el('i', i === 7 ? 'fz' : '', str));
    const combo = el('div', 'sh-combo', row, '');
    const enth = el('div', 'sh-enth', p);
    const enthFill = el('i', '', enth);
    el('span', '', enth, 'ENTHUSIASM');
    const jam = el('div', 'sh-jam', p);
    return { p, score, lv, rows, combo, enth, enthFill, jam };
  }

  _pad(parent, cls, label, fn, color) {
    const b = el('button', cls, parent, label);
    b.type = 'button';
    if (color) b.style.setProperty('--pad', color);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('down'); fn(e.timeStamp); });
    const up = () => b.classList.remove('down');
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    return b;
  }

  // Swipe recognition. A swipe is judged at the onset of the flick — the
  // last moment the finger was still (the touch itself for a quick flick)
  // plus a little of the travel — not when it finally crosses the distance
  // threshold. The finger can keep going after a swipe: turning chains the
  // next arrow from the turning point (zig-zags), and pausing re-arms the
  // same direction (repeated arrows).
  _initSwipe(zone, onPad) {
    const ptrs = new Map();
    const threshold = () => Math.max(18, Math.min(42, Math.min(window.innerWidth, window.innerHeight) * 0.05));
    const STILL = 2.5;                                   // px between samples that counts as "not moving"
    const VEC = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { zone.setPointerCapture(e.pointerId); } catch {}
      const a = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      ptrs.set(e.pointerId, { down: a, anchor: a, last: a, armed: true, dir: null });
    });
    zone.addEventListener('pointermove', (e) => {
      const s = ptrs.get(e.pointerId);
      if (!s) return;
      const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
      for (const ev of (evs.length ? evs : [e])) {
        const pt = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp };
        const step = Math.hypot(pt.x - s.last.x, pt.y - s.last.y);
        s.last = pt;
        if (step < STILL) {                              // resting: re-anchor here
          if (Math.hypot(pt.x - s.anchor.x, pt.y - s.anchor.y) < threshold() * 0.5) { s.anchor = pt; s.armed = true; }
          continue;
        }
        if (!s.armed && s.dir) {
          const v = VEC[s.dir], mx = pt.x - s.anchor.x, my = pt.y - s.anchor.y;
          const along = mx * v[0] + my * v[1], across = Math.abs(mx * v[1] - my * v[0]);
          if (along > 0 && along >= across) { s.anchor = pt; continue; }
        }
        const dx = pt.x - s.anchor.x, dy = pt.y - s.anchor.y;
        const th = threshold();
        if (dx * dx + dy * dy < th * th) continue;
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
        if (!s.armed && dir === s.dir) continue;
        const ts = s.anchor.t + Math.min(40, (pt.t - s.anchor.t) * 0.4);
        onPad(dir, ts);
        this._swipeFx(s.anchor.x, s.anchor.y, dir);
        s.armed = false; s.dir = dir;
        s.anchor = pt;
      }
    });
    const end = (e) => ptrs.delete(e.pointerId);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  _swipeFx(x, y, dir) {
    const fx = el('div', 'sh-swipe-fx', this.root, DIR_GLYPH[dir]);
    fx.style.left = x + 'px';
    fx.style.top = y + 'px';
    fx.style.setProperty('--c', DIR_COLOR[dir]);
    const v = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[dir];
    fx.style.setProperty('--dx', v[0] * 70 + 'px');
    fx.style.setProperty('--dy', v[1] * 70 + 'px');
    setTimeout(() => fx.remove(), 450);
  }

  resize() {}

  show(v) { this.root.classList.toggle('sh-on', !!v); }

  // Per-frame refresh from battle state.
  update(battle, clock, songTime) {
    for (const [ui, d] of [[this.p, battle.player], [this.r, battle.rival]]) {
      ui.score.textContent = d.score.toLocaleString();
      const lv = `LV ${d.level}`;
      if (ui.lv.textContent !== lv) ui.lv.textContent = lv;
      if (ui._row !== d.row) { ui._row = d.row; ui.rows.forEach((r, i) => r.classList.toggle('on', i < d.row)); }
      const combo = d.chain >= 3 ? `${d.chain} COMBO` : '';
      if (ui.combo.textContent !== combo) ui.combo.textContent = combo;
      ui.enthFill.style.width = d.enthusiasm + '%';
      ui.enth.classList.toggle('branch', d.enthusiasm >= 40);
      const jam = `ATTACK △ ×${d.jammers}`;
      if (ui.jam.textContent !== jam) { ui.jam.textContent = jam; ui.jam.classList.toggle('empty', d.jammers <= 0); }
    }
    if (this.tauntPad) this.tauntPad.classList.toggle('ready', battle.player.jammers > 0);
    // Groove meter: player pushes it left, rival right.
    this.grooveKnob.style.left = (50 - battle.groove * 45) + '%';
    // Timer: time left in the battle.
    const left = Math.max(0, clock.barTime(battle.endBar) - Math.max(songTime, clock.barTime(battle.startBar)));
    this.timer.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    this.bars.player.update(battle, clock, songTime);
    this.bars.rival.update(battle, clock, songTime);
  }

  // Feedback hooks (driven by battle events).
  dirFeedback(who, ok) { if (!ok) this.bars[who === 'rival' ? 'rival' : 'player'].flashWrong(); }
  judge(who, judgment, delta, reason) {
    // Back-compat: judge(judgment, delta, reason) = the player's.
    if (who !== 'player' && who !== 'rival') return this.bars.player.judge(who, judgment, delta);
    this.bars[who].judge(judgment, delta, reason);
  }
  rivalJudgment(judgment) { this.bars.rival.judge(judgment, 0, null); }

  showBanner(text, kind = '', ms = 1400) {
    const b = this.banner;
    b.className = 'sh-banner show ' + kind;
    b.innerHTML = text;
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => { b.className = 'sh-banner ' + kind; }, ms);
  }

  showCallout(text, kind = '', ms = 1600) {
    const c = this.callout;
    c.className = 'sh-callout show ' + kind;
    c.innerHTML = text;
    clearTimeout(this._calloutTimer);
    this._calloutTimer = setTimeout(() => { c.className = 'sh-callout ' + kind; }, ms);
  }

  // A landed taunt messes with the victim's controls until the stun ends.
  // `kind` is one or more effects joined by '+':
  //   shake · wobble · blur · glitch · flash · darkness · spin   (the panel itself)
  //   float · fall · swirl · splat · cloud                        (marks of `sprite` over it)
  disrupt(kind, { sprite = 'note', color = '#ffffff', ms = 2500, who = 'player' } = {}) {
    const kinds = String(kind || 'shake').split('+');
    // 2P: only the stunned player's column.
    const b = this.root.classList.contains('sh-2p') ? this.bars[who].root.parentElement : this.bottom;
    const css = kinds.filter(k => ['shake', 'wobble', 'blur', 'glitch', 'flash', 'darkness', 'spin'].includes(k));
    for (const k of css) { b.classList.remove('dz-' + k); void b.offsetWidth; b.classList.add('dz-' + k); }
    b.style.setProperty('--dz-color', color);
    clearTimeout(this._dzTimer);
    this._dzTimer = setTimeout(() => { for (const k of css) b.classList.remove('dz-' + k); }, ms);
    const pattern = kinds.find(k => ['float', 'fall', 'swirl', 'splat', 'cloud'].includes(k));
    if (!pattern || !DRAW[sprite]) return;
    // Marks over the command bar, drawn from the same sprite painters as the
    // 3D anime FX.
    if (this._dzCanvas && this._dzCanvas.parentElement !== b) { this._dzCanvas.remove(); this._dzCanvas = null; }
    if (!this._dzCanvas) this._dzCanvas = el('canvas', 'sh-disrupt', b);
    const cv = this._dzCanvas, r = b.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const img = document.createElement('canvas'); img.width = img.height = 128;
    DRAW[sprite](img.getContext('2d'), 128);
    const W = cv.width, H = cv.height, N = pattern === 'cloud' ? 7 : pattern === 'splat' ? 9 : 16;
    const parts = Array.from({ length: N }, (_, i) => ({
      x: Math.random() * W, y: pattern === 'fall' ? -Math.random() * H : pattern === 'float' ? H + Math.random() * H * 0.5 : Math.random() * H,
      s: (pattern === 'cloud' ? 0.9 : pattern === 'splat' ? 0.55 : 0.32) * H * (0.7 + Math.random() * 0.6),
      vx: (Math.random() - 0.5) * W * 0.15, vy: (pattern === 'fall' ? 1 : -1) * H * (0.25 + Math.random() * 0.35),
      a: Math.random() * 6.28, va: (Math.random() - 0.5) * 3, delay: pattern === 'splat' ? i * 0.09 : 0, ph: Math.random() * 6.28,
    }));
    const g = cv.getContext('2d'), t0 = performance.now(), dur = ms / 1000;
    cancelAnimationFrame(this._dzRaf);
    const step = () => {
      const t = (performance.now() - t0) / 1000;
      g.clearRect(0, 0, W, H);
      if (t > dur) { cv.remove(); this._dzCanvas = null; return; }
      const fade = Math.min(1, (dur - t) / 0.4);
      for (const p of parts) {
        const lt = t - p.delay;
        if (lt < 0) continue;
        let x = p.x, y = p.y, s = p.s, a = p.a + p.va * lt, al = fade;
        if (pattern === 'fall' || pattern === 'float') { x += p.vx * lt + Math.sin(lt * 2 + p.ph) * H * 0.08; y += p.vy * lt; if (pattern === 'fall' && y > H + s) p.y -= H + 2 * s; if (pattern === 'float' && y < -s) p.y += H + 2 * s; }
        else if (pattern === 'swirl') { const R = Math.min(W, H) * 0.4, ang = p.ph + lt * 2.2; x = W / 2 + Math.cos(ang) * R * (0.4 + 0.6 * ((p.a % 1 + 1) % 1)) * (W / H) * 0.5; y = H / 2 + Math.sin(ang) * R; }
        else if (pattern === 'splat') { s *= Math.min(1, lt * 8) * (1 + 0.05 * Math.sin(lt * 9)); al *= 0.92; a = p.a; }
        else if (pattern === 'cloud') { x += Math.sin(lt * 0.7 + p.ph) * W * 0.05; s *= 1 + 0.08 * Math.sin(lt * 1.3 + p.ph); al *= 0.82; a = 0; }
        g.globalAlpha = al;
        g.save(); g.translate(x, y); g.rotate(a); g.drawImage(img, -s / 2, -s / 2, s, s); g.restore();
      }
      g.globalAlpha = 1;
      this._dzRaf = requestAnimationFrame(step);
    };
    step();
  }

  destroy() {
    clearTimeout(this._bannerTimer); clearTimeout(this._calloutTimer); clearTimeout(this._dzTimer);
    for (const b of Object.values(this.bars)) b.destroy();
    cancelAnimationFrame(this._dzRaf);
    this.root.remove();
  }
}

// ── CommandBar ──────────────────────────────────────────────────────
// One dancer's command display. The rows mirror the battle's candidates for
// the bar being entered: arrows turn green as they're entered, the next
// arrow pulses, a candidate the input ruled out greys out, the ✕ / ○ box
// lights when its sequence is complete and flashes on beat 4.
class CommandBar {
  constructor(parent, { who, label, small = false }) {
    this.who = who;
    this.root = el('div', `ch ch-${who}${small ? ' ch-small' : ''}`, parent);
    const head = el('div', 'ch-head', this.root);
    el('span', 'ch-who', head, label);
    this.move = el('span', 'ch-move', head, '');
    this.rowsEl = el('div', 'ch-rows', this.root);
    const beats = el('div', 'ch-beats', this.root);
    this.cells = [1, 2, 3, 4].map(n => el('span', 'ch-cell' + (n === 4 ? ' b4' : ''), beats, n === 4 ? '4' : String(n)));
    this.marker = el('i', 'ch-marker', beats);
    this.status = el('div', 'ch-status', this.root, '');
    this.judgeEl = el('div', 'ch-judge', this.root);
    this._key = '';
    this._rows = [];
  }

  _build(b) {
    this.rowsEl.innerHTML = '';
    this._rows = [];
    this.root.dataset.type = b ? b.type : 'none';
    if (!b) return;
    if (b.type === 'command' && b.cands) {
      for (const o of b.cands) {
        const row = el('div', `ch-row ${o.slot} ${o.kind}`, this.rowsEl);
        el('span', 'ch-tag', row, o.kind === 'solo' ? '★★ SOLO' : o.slot === 'top' ? 'TOP' : '★ BOTTOM');
        const seq = el('span', 'ch-seq', row);
        const arrows = o.seq.map(d => {
          const a = el('i', 'ch-dir', seq, DIR_GLYPH[d]);
          a.style.setProperty('--c', DIR_COLOR[d]);
          return a;
        });
        if (!o.seq.length) el('i', 'ch-none', seq, 'no arrows');
        el('span', 'ch-sep', row, '▸');
        const btn = el('b', `ch-btn ch-btn-${o.button}`, row, GLYPH[o.button]);
        btn.style.setProperty('--c', BTN_COLOR[o.button]);
        el('span', 'ch-lv', row, o.kind === 'solo' ? '' : `LV ${o.col + 1}`);
        this._rows.push({ o, row, arrows, btn, sig: '' });
      }
    } else if (b.type === 'dodge') {
      const row = el('div', 'ch-row note dodge', this.rowsEl);
      el('span', 'ch-tag', row, 'INCOMING!');
      el('span', 'ch-note', row, 'DODGE');
      el('span', 'ch-sep', row, '▸');
      const btn = el('b', 'ch-btn ch-btn-S', row, GLYPH.S);
      btn.style.setProperty('--c', BTN_COLOR.S);
      this._rows.push({ o: null, row, arrows: [], btn, sig: '' });
    } else {
      const label = { stunned: 'STUNNED…', rest: 'FREEZE! — rest bar', solo: '★★ SOLO TIME ★★', watch: 'WATCH THE SOLO', idle: 'GROOVING' }[b.type] || '';
      el('div', `ch-row note ${b.type}`, this.rowsEl, label);
    }
  }

  update(battle, clock, now) {
    const b = battle.commandFor(this.who, now);
    const key = !b ? 'none' : `${b.bar}:${b.type}:${b.cands ? b.cands.map(o => o.node + o.slot).join('|') : ''}`;
    if (key !== this._key) { this._key = key; this._build(b); }
    const d = battle.dancer(this.who);
    // Move type (row 1-8) and level of the TOP command.
    const top = b && b.cands && b.cands[0];
    const mv = top ? (top.kind === 'solo' ? 'SOLO' : `MOVE ${top.row}/8`) : '';
    if (this.move.textContent !== mv) this.move.textContent = mv;
    // Beat track for the bar being entered (same audio clock as the judge).
    const beat = clock.beatAt(now);
    const base = b ? b.bar * clock.beatsPerBar : Math.floor(beat / 4) * 4;
    const x = beat - base;
    const pos = Math.max(-0.5, Math.min(4, x));
    this.marker.style.left = `${(pos / 4) * 100}%`;
    this.marker.classList.toggle('pre', x < 0);
    const cell = x >= 0 && x < 4 ? Math.floor(x) : -1;
    if (cell !== this._cell) { this._cell = cell; this.cells.forEach((c, i) => c.classList.toggle('on', i === cell)); }
    const onFour = x >= 2.92 && x < 3.25;
    this.cells[3].classList.toggle('hit', onFour);
    if (!b) { this._status(''); return; }
    // Rows.
    for (const r of this._rows) {
      const o = r.o;
      const prog = o ? o.progress : 0, alive = o ? o.alive : true;
      const done = o ? prog === o.seq.length && alive : true;
      const chosen = b.resolved && b.chosen === o && b.success;
      const failed = b.resolved && !b.success;
      const sig = `${prog}${alive}${done}${chosen}${failed}${b.resolved}`;
      if (sig !== r.sig) {
        r.sig = sig;
        r.arrows.forEach((a, i) => {
          a.classList.toggle('done', i < prog);
          a.classList.toggle('next', !b.resolved && alive && i === prog);
        });
        r.row.classList.toggle('dead', !alive || (b.resolved && !chosen && b.type === 'command'));
        r.row.classList.toggle('ready', !b.resolved && done);
        r.row.classList.toggle('hit', chosen || (b.type === 'dodge' && b.resolved && b.success));
        r.row.classList.toggle('fail', failed);
      }
      r.btn.classList.toggle('flash', onFour && !b.resolved && (done || !o));
    }
    // Status line.
    let st = '';
    if (b.type === 'command' && b.cands) {
      if (b.resolved) st = b.success ? `${(b.judged || '').toUpperCase()}!` : (REASON[b.reason] || 'MISS');
      else {
        const s = commandStatus(b.cands);
        if (s.phase === 'dirs') st = `ENTER ${s.next.map(d => DIR_GLYPH[d]).join(' / ')} — ${s.entered} OF ${s.total}`;
        else if (s.phase === 'button') st = `${s.buttons.map(k => GLYPH[k]).join(' OR ')} ON BEAT 4!`;
      }
    } else if (b.type === 'dodge') st = b.resolved ? (b.success ? 'DODGED!' : 'HIT!') : `${GLYPH.S} ON BEAT 4 TO DODGE`;
    this._status(st);
    this.root.classList.toggle('waiting', b.type === 'command' && !b.resolved && x < 0);
    void d;
  }

  _status(t) { if (this.status.textContent !== t) this.status.textContent = t; }

  flashWrong() {
    const r = this.root;
    r.classList.remove('wrong'); void r.offsetWidth; r.classList.add('wrong');
  }

  judge(judgment, delta, reason) {
    const e = this.judgeEl;
    const txt = judgment === 'miss' ? (REASON[reason] || 'MISS') : judgment.toUpperCase() + '!';
    const ms = judgment !== 'miss' && Number.isFinite(delta) ? `${delta >= 0 ? '+' : ''}${Math.round(delta * 1000)} ms` : '';
    e.innerHTML = `${judgment === 'miss' ? 'MISS!' : txt}${judgment === 'miss' && reason ? `<small>${txt}</small>` : ms ? `<small>${ms}</small>` : ''}`;
    e.style.color = JUDGE_COLOR[judgment];
    e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  }

  destroy() { this.root.remove(); }
}
