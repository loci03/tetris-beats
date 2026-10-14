// BattleHUD — the rhythm battle's 2D overlay, laid out like the reference
// mock-up so the dancers own the middle of the screen:
//
//   YOU          [ 1:13 ❚❚ ]          BOSS        names + scores, timer/pause
//   1,792                            25,359
//   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬            Enthusiasm (pink / cyan)
//   ┌ YOUR MOVE 3/8                  BEAT 4 ┐     YOUR command panel
//   │        ←  ↓  →   →   [○]              │     (two compact rows when the
//   │  ▬▬▬▬   ▬▬▬▬   ▬▬▬▬   ████            │      ★ branch is open)
//   └───────────────────────────────────────┘     beats 1-2-3-4
//               (the dance battle stage)
//            YOU                BOSS              name tags under the dancers
//   ┌ BOSS · MOVE 2/8                  → ○ ┐      the rival's command, one line
//     SWIPE DIRECTIONS · TAP ✕ / ○ ON BEAT FOUR   hint / callouts
//
// The panel PULSES ON EVERY BEAT of the song: the battle emits a 'beat'
// event from the same audio clock its judge uses (onBeat), and each frame
// the pulse envelope is computed from that clock's song time — so it can't
// drift, freezes on pause and is right again after a seek or a slow frame.
// Beat 4 of a measure you press in gets its own, stronger green pulse.
// Touch: swipe anywhere for the directions; tap the ✕ / ○ (or □) button in
// the panel, and the △ chip — no pad buttons over the stage.
// Everything here only *reads* battle state; it never decides a result.

import { DRAW } from './anime-fx.js';
import { GLYPH } from './commands.js';

const DIR_GLYPH = { L: '←', U: '↑', D: '↓', R: '→' };
const DIR_COLOR = { L: '#ff4f9a', U: '#39d0ff', D: '#4be08a', R: '#ffa53a' };
const BTN_COLOR = { X: '#8fb8ff', O: '#8be8c0', T: '#5dffb0', S: '#ff9ad8' };
const JUDGE_COLOR = { perfect: '#ffe45c', great: '#6dffb4', good: '#8fd3ff', miss: '#ff5a6e' };
const REASON = { early: 'TOO EARLY', late: 'TOO LATE', incomplete: 'INCOMPLETE', 'wrong-button': 'WRONG BUTTON' };

// Beat pulse (real-time seconds): a quick attack, then an exponential decay.
// Beat 4 of the command's measure decays slower.
export const PULSE = { attack: 0.04, decay: 0.14, decay4: 0.28 };
export function pulseEnvelope(dt, attack = PULSE.attack, decay = PULSE.decay) {
  if (!(dt >= 0)) return 0;
  if (dt < attack) return dt / attack;
  return Math.exp(-(dt - attack) / decay);
}
// The beat a song time falls in and how long ago (real seconds) it hit,
// from the music clock — the same grid the judge uses.
export function beatPhase(clock, songTime) {
  const beat = clock.beatAt(songTime);
  const k = Math.floor(beat + 1e-9);
  return { beat, k, since: (beat - k) * clock.spb / (clock.rate || 1) };
}

function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export class BattleHUD {
  // controlsHint: the keyboard hint (desktop); touch screens get the swipe one.
  constructor({ names, isTouch, onPad, onPause, controlsHint = '', twoPlayer = false, hints2 = null }) {
    this.names = names;
    this.isTouch = !!isTouch;
    this.twoPlayer = twoPlayer;
    this.root = el('div', 'story-hud' + (twoPlayer ? ' sh-2p' : '') + (isTouch ? ' sh-touch' : ''));
    this.root.setAttribute('aria-live', 'polite');
    const pad = onPad || (() => {});

    // ── Top: scores + timer, Enthusiasm bars, your command panel ──
    const head = this.head = el('div', 'sh-head', this.root);
    const scores = this.scores = el('div', 'sh-scores', head);
    this.p = this._side(scores, 'sh-p1', names.player);
    const mid = el('div', 'sh-mid', scores);
    const pill = el('div', 'sh-timer', mid);
    this.timer = el('span', 'sh-time', pill, '1:00');
    if (onPause) {
      const pb = el('button', 'sh-pause', pill, '<i></i><i></i>');
      pb.type = 'button';
      pb.setAttribute('aria-label', 'Pause');
      pb.addEventListener('click', (e) => { e.preventDefault(); onPause(); });
    }
    this.r = this._side(scores, 'sh-p2', names.rival);
    const bars = el('div', 'sh-bars', head);
    this.p.enth = el('div', 'sh-enth sh-p1', bars); this.p.enthFill = el('i', '', this.p.enth);
    this.r.enth = el('div', 'sh-enth sh-p2', bars); this.r.enthFill = el('i', '', this.r.enth);
    this.p.enth.title = this.r.enth.title = 'Enthusiasm';

    this.bars = {};
    this.bars.player = new CommandBar(head, {
      who: 'player', variant: 'panel', onPad: pad, attack: isTouch,
      title: twoPlayer ? names.player : 'YOUR MOVE', hint: twoPlayer && !isTouch ? hints2 && hints2[0] : '',
    });

    this.banner = el('div', 'sh-banner', this.root);
    // Name tags under the dancers (placed by the session from the 3D feet).
    this.tags = { player: el('div', 'sh-tag sh-p1', this.root, twoPlayer ? 'P1' : 'YOU'), rival: el('div', 'sh-tag sh-p2', this.root, twoPlayer ? 'P2' : names.rival) };

    // ── Bottom: the rival's command (a full panel in 2P), hint / callouts ──
    const foot = this.foot = el('div', 'sh-foot', this.root);
    this.bars.rival = twoPlayer
      ? new CommandBar(foot, { who: 'rival', variant: 'panel', title: names.rival, hint: !isTouch ? hints2 && hints2[1] : '' })
      : new CommandBar(foot, { who: 'rival', variant: 'line', title: names.rival });
    this.ticker = el('div', 'sh-ticker', foot);
    // (in 2P each panel shows its own keys)
    this.hint = isTouch ? 'SWIPE DIRECTIONS · TAP ✕ / ○ ON BEAT FOUR' : twoPlayer ? 'ARROWS ANY TIME · ✕ / ○ ON BEAT FOUR' : controlsHint;

    if (isTouch) {
      // Touch: swipe anywhere (under the HUD) for the directions.
      this.swipeZone = el('div', 'sh-swipe', this.root);
      this.root.insertBefore(this.swipeZone, this.root.firstChild);
      this._initSwipe(this.swipeZone, pad);
    }
    document.body.appendChild(this.root);
    this._bannerTimer = 0;
    this._calloutTimer = 0;
    this._callout = false;
    this._beatK = null;
    this._setTicker(this.hint, 'hint');
    this.resize();
  }

  _side(parent, cls, name) {
    const p = el('div', 'sh-side ' + cls, parent);
    const top = el('div', 'sh-label', p);
    el('span', 'sh-name', top, name);
    const jam = el('span', 'sh-jam', top, '');
    const combo = el('span', 'sh-combo', top, '');
    const score = el('div', 'sh-score', p, '0');
    return { p, score, combo, jam };
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


  // Where the HUD leaves room for the stage, in px: the band between the
  // top (scores + your panel) and the bottom (rival line + hint); and when
  // the panels sit in a left column (short landscape), the area beside it.
  // The camera frames the dancers into the best of these.
  layout() {
    const W = window.innerWidth, H = window.innerHeight;
    const s = this.scores.getBoundingClientRect(), h = this.head.getBoundingClientRect(), f = this.foot.getBoundingClientRect();
    const tagRoom = 22;                                   // name tags under the feet
    const top = Math.min(H * 0.5, h.bottom + 6);
    const rects = [{ left: 0, right: W, top, bottom: Math.max(top + 40, f.top - 4 - tagRoom) }];
    const panel = this.bars.player.root.getBoundingClientRect();
    if (panel.right < W * 0.62 && f.right < W * 0.62) rects.push({ left: Math.max(panel.right, f.right) + 6, right: W, top: s.bottom + 8, bottom: H - tagRoom - 4 });
    return { W, H, rects };
  }

  // The stage rect the camera chose: banners sit in its upper part, and
  // the practice panel tucks under the top HUD.
  setStage(rect) {
    if (!rect) return;
    this.stage = rect;
    this.root.style.setProperty('--banner-y', `${Math.round(rect.top + (rect.bottom - rect.top) * 0.2)}px`);
    this.root.style.setProperty('--banner-x', `${Math.round((rect.left + rect.right) / 2)}px`);
    document.documentElement.style.setProperty('--sh-stage-top', `${Math.round(rect.top)}px`);
  }

  // Name tags: screen points under each dancer's feet (null hides them).
  placeTags(pts) {
    for (const who of ['player', 'rival']) {
      const t = this.tags[who], p = pts && pts[who];
      if (!p || !Number.isFinite(p.x)) { t.style.opacity = '0'; continue; }
      const maxY = this.stage ? this.stage.bottom + 18 : window.innerHeight - 40;
      t.style.opacity = '1';
      t.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(Math.min(maxY, p.y + 6))}px) translateX(-50%)`;
    }
  }

  resize() {}

  show(v) { this.root.classList.toggle('sh-on', !!v); }

  // A beat of the song (from RhythmBattle's 'beat' event — the judge's own
  // clock): beatIndex = song beat, measureIndex = bar, songTime = its time.
  onBeat(beatIndex, measureIndex, songTime) {
    this._beatK = beatIndex;
    this._beatBar = measureIndex;
    this._beatAt = songTime;
  }

  // Per-frame refresh from battle state.
  update(battle, clock, songTime) {
    // Beat pulse, from the music clock. The last beat event says which beat
    // is on; if a frame skipped it (seek, stall) the clock decides.
    const ph = beatPhase(clock, songTime);
    if (this._beatK !== ph.k) this._beatK = ph.k;
    const pulse = { k: ph.k, beat: ph.beat, since: ph.since };

    for (const [ui, d] of [[this.p, battle.player], [this.r, battle.rival]]) {
      const sc = d.score.toLocaleString();
      if (ui.score.textContent !== sc) ui.score.textContent = sc;
      const combo = d.chain >= 3 ? `×${d.chain}` : '';
      if (ui.combo.textContent !== combo) ui.combo.textContent = combo;
      ui.enthFill.style.width = d.enthusiasm + '%';
      ui.enth.classList.toggle('branch', d.enthusiasm >= 40);
      const jam = `${GLYPH.T}${d.jammers}`;
      if (ui.jam.textContent !== jam) { ui.jam.textContent = jam; ui.jam.classList.toggle('empty', d.jammers <= 0); ui.jam.title = `${d.jammers} attack${d.jammers === 1 ? '' : 's'} left`; }
    }
    // Timer: time left in the battle.
    const left = Math.max(0, clock.barTime(battle.endBar) - Math.max(songTime, clock.barTime(battle.startBar)));
    const tt = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    if (this.timer.textContent !== tt) this.timer.textContent = tt;
    this.bars.player.update(battle, clock, songTime, pulse);
    this.bars.rival.update(battle, clock, songTime, pulse);
  }

  _setTicker(html, kind = '') {
    const t = this.ticker;
    t.className = 'sh-ticker' + (html ? ' show ' + kind : '');
    if (html) t.innerHTML = html;
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

  // Callouts run in the hint line at the bottom — never over the dancers.
  showCallout(text, kind = '', ms = 1600) {
    this._callout = true;
    this._setTicker(text, kind);
    clearTimeout(this._calloutTimer);
    this._calloutTimer = setTimeout(() => { this._callout = false; this._setTicker(this.hint, 'hint'); }, ms);
  }

  // A landed taunt messes with the victim's controls until the stun ends.
  // `kind` is one or more effects joined by '+':
  //   shake · wobble · blur · glitch · flash · darkness · spin   (the panel itself)
  //   float · fall · swirl · splat · cloud                        (marks of `sprite` over it)
  disrupt(kind, { sprite = 'note', color = '#ffffff', ms = 2500, who = 'player' } = {}) {
    const kinds = String(kind || 'shake').split('+');
    // Only the stunned dancer's command strip.
    const b = (this.bars[who] || this.bars.player).root;
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
    document.documentElement.style.removeProperty('--sh-stage-top');
    this.root.remove();
  }
}

// ── CommandBar ──────────────────────────────────────────────────────
// One dancer's command display.
//   variant 'panel' (yours; both in 2P):
//     YOUR MOVE 3/8  △2                         BEAT 4
//              ←  ↓  →   →   [○]          (★ second row when a branch is open)
//     ▬▬▬▬  ▬▬▬▬  ▬▬▬▬  ████              beats 1-2-3-4 of the measure
//   variant 'line' (the rival in 1P): "BOSS · MOVE 2/8 ……… → ○".
// The rows mirror the battle's candidates for the bar being entered: arrows
// turn green as they're entered, the next one is bright, a candidate the
// input ruled out dims, the button lights when its sequence is complete,
// fills while beat 4's window is open and flashes on beat 4. With onPad the
// buttons are touch targets (✕ / ○ / □), and `attack` adds a △ chip.
class CommandBar {
  constructor(parent, { who, title, variant = 'panel', onPad = null, attack = false, hint = '' }) {
    this.who = who;
    this.variant = variant;
    this.onPad = onPad;
    this.root = el('div', `ch ch-${variant} ch-${who}`, parent);
    const head = el('div', 'ch-head', this.root);
    this.titleText = title;
    this.title = el('span', 'ch-title', head, title);
    if (attack && onPad) {
      this.atk = el('button', 'ch-atk', head, `${GLYPH.T}`);
      this.atk.type = 'button';
      this.atk.setAttribute('aria-label', 'Attack (△ on beat 4)');
      this._tap(this.atk, 'T');
    }
    if (hint) el('span', 'ch-keys', head, hint);
    this.chip = el('span', 'ch-chip', head, '');
    if (variant === 'line') head.appendChild(this.rowsEl = el('div', 'ch-rows'));
    else this.rowsEl = el('div', 'ch-rows', this.root);
    if (variant === 'panel') {
      const segs = el('div', 'ch-segs', this.root);
      this.segs = [1, 2, 3, 4].map(n => el('i', 'ch-seg' + (n === 4 ? ' b4' : ''), segs));
    }
    this._key = '';
    this._rows = [];
    this._judgeUntil = -Infinity;
    this._build(null);
  }

  // pointerdown on a button = that button, timed at the touch.
  _tap(node, action) {
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      node.classList.remove('tap'); void node.offsetWidth; node.classList.add('tap');
      this.onPad(action, e.timeStamp);
    });
  }

  _btn(row, button) {
    const tag = this.onPad && this.variant === 'panel' ? 'button' : 'b';
    const btn = el(tag, `ch-btn ch-btn-${button}`, row, GLYPH[button]);
    btn.style.setProperty('--c', BTN_COLOR[button]);
    if (tag === 'button') {
      btn.type = 'button';
      btn.setAttribute('aria-label', `${GLYPH[button]} on beat 4`);
      this._tap(btn, button);
    }
    return btn;
  }

  _build(b) {
    this.rowsEl.innerHTML = '';
    this._rows = [];
    this.root.dataset.type = b ? b.type : 'none';
    const panel = this.variant === 'panel';
    if (b && b.type === 'command' && b.cands) {
      this.rowsEl.dataset.n = String(b.cands.length);
      for (const o of b.cands) {
        const row = el('div', `ch-row ${o.slot} ${o.kind}`, this.rowsEl);
        if (b.cands.length > 1 || o.kind === 'solo') el('span', 'ch-tag', row, o.kind === 'solo' ? '★★' : !panel ? (o.slot === 'top' ? '' : '★') : (o.slot === 'top' ? '' : '★') + 'LV' + (o.col + 1));
        const seq = el('span', 'ch-seq', row);
        const arrows = o.seq.map(d => {
          const a = el('i', 'ch-dir', seq, DIR_GLYPH[d]);
          a.style.setProperty('--c', DIR_COLOR[d]);
          return a;
        });
        if (o.seq.length && panel) el('span', 'ch-sep', row, '→');
        const btn = this._btn(row, o.button);
        this._rows.push({ o, row, arrows, btn, sig: '' });
      }
    } else if (b && b.type === 'dodge') {
      this.rowsEl.dataset.n = '1';
      const row = el('div', 'ch-row note dodge', this.rowsEl);
      el('span', 'ch-note', row, panel ? 'INCOMING! DODGE' : 'DODGE');
      el('span', 'ch-sep', row, '→');
      const btn = this._btn(row, 'S');
      this._rows.push({ o: null, row, arrows: [], btn, sig: '' });
    } else {
      this.rowsEl.dataset.n = '1';
      const label = !b ? (panel ? 'GET READY' : '') : ({ stunned: 'STUNNED…', rest: 'FREEZE! — REST', solo: '★★ SOLO TIME ★★', watch: 'WATCH THE SOLO', idle: 'GROOVING' }[b.type] || '');
      if (label) el('div', `ch-row note ${b ? b.type : 'idle'}`, this.rowsEl, label);
    }
  }

  update(battle, clock, now, pulse) {
    const b = battle.commandFor(this.who, now);
    const key = !b ? 'none' : `${b.bar}:${b.type}:${b.cands ? b.cands.map(o => o.node + o.slot).join('|') : ''}`;
    if (key !== this._key) { this._key = key; this._build(b); }
    // Move type (row 1-8) of the TOP command.
    const top = b && b.cands && b.cands[0];
    // ("YOUR MOVE 3/8" on your panel, "NAME · MOVE 2/8" elsewhere)
    const own = this.titleText === 'YOUR MOVE';
    const mv = !top ? '' : top.kind === 'solo' ? (own ? ': SOLO' : ' · SOLO') : own ? ` ${top.row}/8` : ` · MOVE ${top.row}/8`;
    const title = this.titleText + mv;
    if (this.title.textContent !== title) this.title.textContent = title;

    // Where the command's measure is: u = beats since its beat 1.
    const bpb = clock.beatsPerBar;
    const input = b && (b.type === 'command' || b.type === 'dodge');
    const u = b ? pulse.beat - b.bar * bpb : -9;
    const win = battle.win ? battle.win.good / clock.spb : 0.2;       // ± beats
    const inWindow = input && !b.resolved && Math.abs(u - 3) <= win;
    // Beat 4 of a measure this dancer had to press in (from that beat until
    // the next — independent of which command is on screen by then).
    const kBar = Math.floor(pulse.k / bpb), kb = battle.dancer(this.who).bars.get(kBar);
    const count = pulse.k - kBar * bpb + 1;                            // 1-4, the song's beat
    const four = count === 4 && !!kb && (kb.type === 'command' || kb.type === 'dodge');
    const p = pulseEnvelope(pulse.since, PULSE.attack, four ? PULSE.decay4 : PULSE.decay);
    const rs = this.root.style;
    rs.setProperty('--p', four ? '0' : p.toFixed(3));
    rs.setProperty('--p4', four ? p.toFixed(3) : '0');
    this.root.classList.toggle('four', four);
    this.root.classList.toggle('window', !!inWindow);

    if (this.variant === 'panel') {
      // Beats 1-2-3-4: the beat that's on lights (beat 4 brightest); the
      // ones before it in the measure stay faintly lit; beat 4's window
      // pre-lights its segment.
      const sig = `${count}${!!inWindow}`;
      if (sig !== this._segSig) {
        this._segSig = sig;
        this.segs.forEach((s, i) => { s.classList.toggle('on', i === count - 1); s.classList.toggle('past', i < count - 1); });
        this.segs[3].classList.toggle('win', !!inWindow && count !== 4);
      }
      // The chip: the beat (or, for a moment, the judgment).
      if (now >= this._judgeUntil) this._chip(b ? `BEAT ${count}` : '', four ? 'go' : '');
    } else if (now >= this._judgeUntil) this._chip('', '');
    if (this._judgeNew) { this._judgeNew = false; this._judgeUntil = now + 0.6 * (clock.rate || 1); }
    if (!b) return;

    // Rows.
    for (const r of this._rows) {
      const o = r.o;
      const prog = o ? o.progress : 0, alive = o ? o.alive : true;
      const done = o ? prog === o.seq.length && alive : true;
      const chosen = b.resolved && b.success && (b.chosen === o || b.type === 'dodge');
      const failed = b.resolved && !b.success;
      const rsig = `${prog}${alive}${done}${chosen}${failed}${b.resolved}`;
      if (rsig !== r.sig) {
        r.sig = rsig;
        r.arrows.forEach((a, i) => {
          a.classList.toggle('done', i < prog);
          a.classList.toggle('next', !b.resolved && alive && i === prog);
        });
        r.row.classList.toggle('dead', !alive || (b.resolved && !chosen && b.type === 'command'));
        r.row.classList.toggle('ready', !b.resolved && done);
        r.row.classList.toggle('hit', chosen);
        r.row.classList.toggle('fail', failed);
      }
      r.btn.classList.toggle('flash', four && b.bar === kBar && !b.resolved && done);
    }
  }

  _chip(t, cls) {
    if (this.chip.textContent !== t) this.chip.textContent = t;
    const c = 'ch-chip' + (cls ? ' ' + cls : '') + (t ? '' : ' empty');
    if (this.chip.className !== c) this.chip.className = c;
  }

  flashWrong() {
    const r = this.root;
    r.classList.remove('wrong'); void r.offsetWidth; r.classList.add('wrong');
  }

  // Instant result: the panel flashes (green hit / red miss) and the chip
  // shows the judgment with the offset for a moment.
  judge(judgment, delta, reason) {
    const ok = judgment !== 'miss';
    const off = Math.round((delta || 0) * 1000);
    const ms = ok && Number.isFinite(delta) && this.variant === 'panel' ? ` ${off >= 0 ? '+' : '−'}${Math.abs(off)}ms` : '';
    const txt = ok ? `${judgment.toUpperCase()}!${ms}` : (this.variant === 'panel' && reason ? `MISS · ${REASON[reason] || ''}` : 'MISS!');
    this._judgeNew = true;
    this._chip(txt, ok ? 'judge' : 'judge miss');
    this.chip.style.setProperty('--jc', JUDGE_COLOR[judgment]);
    const r = this.root;
    r.classList.remove('ok', 'bad'); void r.offsetWidth; r.classList.add(ok ? 'ok' : 'bad');
  }

  destroy() { this.root.remove(); }
}
