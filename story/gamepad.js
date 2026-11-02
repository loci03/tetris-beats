// Gamepad support for the whole game (menus, the puzzle, the dance battle).
//
//  • normalizePad(gp) reads any controller into the standard layout
//    (A B X Y · LB RB LT RT · Select Start · sticks · d-pad 12-15), also when
//    the browser doesn't know the pad (gp.mapping !== 'standard') — common on
//    Linux-based browsers such as a car's: the d-pad then often arrives as a
//    "hat" axis (one axis, eight positions) or as axes 6/7, and Xbox / Sony
//    pads use their raw HID button order.
//  • PadLayer polls every pad and, depending on what's on screen, either
//      - plays the puzzle (presses the game's own bound keys, so DAS/ARR and any
//        remapping work unchanged),
//      - navigates menus (d-pad / stick moves a visible focus ring between
//        buttons, A selects, B goes back, Start starts / pauses), or
//      - stays out of the way while a dance battle reads the pads itself.
// Browsers only show a controller after one of its buttons is pressed with
// the page open.

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };
const B = BTN;

// Raw (non-standard) button orders by controller family → standard index.
const LAYOUTS = {
  // Xbox pads on Linux (xpad): A B X Y LB RB Back Start Guide LS RS; triggers on axes 2 / 5.
  xbox: { buttons: [B.A, B.B, B.X, B.Y, B.LB, B.RB, B.SELECT, B.START, B.HOME, B.LS, B.RS], triggers: [2, 5] },
  // PlayStation pads on Linux (hid-sony): ✕ ○ △ □ L1 R1 L2 R2 Share Options PS L3 R3.
  sony: { buttons: [B.A, B.B, B.Y, B.X, B.LB, B.RB, B.LT, B.RT, B.SELECT, B.START, B.HOME, B.LS, B.RS] },
  // Most generic / DirectInput pads: face 0-3, shoulders 4-7, Select/Start 8/9, sticks 10/11.
  generic: { buttons: [B.A, B.B, B.X, B.Y, B.LB, B.RB, B.LT, B.RT, B.SELECT, B.START, B.LS, B.RS, B.UP, B.DOWN, B.LEFT, B.RIGHT, B.HOME] },
};
export function layoutFor(id = '') {
  if (/xbox|xinput|045e|x-box|microsoft/i.test(id)) return 'xbox';
  if (/054c|playstation|dualshock|dualsense|sony|wireless controller/i.test(id)) return 'sony';
  return 'generic';
}

// A hat switch reports one axis: -1 (up) … +1 in eight 2/7 steps clockwise,
// and a value just above 1 (9/7) when centred.
const HAT = [['U'], ['U', 'R'], ['R'], ['D', 'R'], ['D'], ['D', 'L'], ['L'], ['U', 'L']];
export function hatDirs(v) {
  if (!(Math.abs(v) <= 1.02)) return [];
  return HAT[Math.round((v + 1) / (2 / 7)) & 7];
}

const pressed = (b) => (typeof b === 'object' && b ? (b.pressed || b.value > 0.5) : b > 0.5);

// Read a Gamepad into the standard layout. `memo` (per pad) remembers which
// axis is a hat switch once it has been seen resting.
export function normalizePad(gp, memo = {}) {
  const out = { id: gp.id || '', index: gp.index, standard: gp.mapping === 'standard', buttons: new Array(17).fill(false), lx: 0, ly: 0, rx: 0, ry: 0, layout: 'standard' };
  const axes = gp.axes || [], raw = gp.buttons || [];
  out.lx = axes[0] || 0; out.ly = axes[1] || 0;
  if (out.standard) {
    for (let i = 0; i < Math.min(17, raw.length); i++) out.buttons[i] = pressed(raw[i]);
    out.rx = axes[2] || 0; out.ry = axes[3] || 0;
    return out;
  }
  const name = layoutFor(out.id), L = LAYOUTS[name];
  out.layout = name;
  for (let i = 0; i < raw.length && i < L.buttons.length; i++) if (pressed(raw[i])) out.buttons[L.buttons[i]] = true;
  if (L.triggers) {
    // Linux trigger axes rest at -1 (some at 0) and go to +1.
    if ((axes[L.triggers[0]] || -1) > 0.3) out.buttons[B.LT] = true;
    if ((axes[L.triggers[1]] || -1) > 0.3) out.buttons[B.RT] = true;
  }
  // D-pad: a hat axis (found by its resting value just above 1), or axes 6/7.
  if (memo.hat == null) for (let i = 0; i < axes.length; i++) if (Math.abs(axes[i]) > 1.05 && Math.abs(axes[i]) < 1.5) { memo.hat = i; break; }
  let dirs = [];
  if (memo.hat != null) dirs = hatDirs(axes[memo.hat]);
  else if (axes.length >= 8 && !L.triggers) {
    // (only when 6/7 look digital: exactly -1 / 0 / +1)
    const x = axes[6], y = axes[7];
    const dig = (v) => v === 0 || Math.abs(Math.abs(v) - 1) < 0.01;
    if (dig(x) && dig(y)) { if (x < -0.5) dirs.push('L'); if (x > 0.5) dirs.push('R'); if (y < -0.5) dirs.push('U'); if (y > 0.5) dirs.push('D'); }
  } else if (axes.length >= 8 && L.triggers) {
    const x = axes[6], y = axes[7];
    if (x < -0.5) dirs.push('L'); if (x > 0.5) dirs.push('R'); if (y < -0.5) dirs.push('U'); if (y > 0.5) dirs.push('D');
  }
  for (const d of dirs) out.buttons[{ U: B.UP, D: B.DOWN, L: B.LEFT, R: B.RIGHT }[d]] = true;
  out.rx = axes[name === 'xbox' ? 3 : 2] || 0; out.ry = axes[name === 'xbox' ? 4 : 3] || 0;
  return out;
}

// Left-stick → d-pad with hysteresis (on past 0.6, off under 0.35).
export function stickDirs(lx, ly, held = {}) {
  const on = (dir, v) => (held[dir] ? v > 0.35 : v > 0.6);
  return { L: on('L', -lx), R: on('R', lx), U: on('U', -ly), D: on('D', ly) };
}

// The puzzle on a controller (standard indices → the game's actions).
export const PLAY_MAP = [
  [B.LEFT, 'left'], [B.RIGHT, 'right'], [B.DOWN, 'soft'], [B.UP, 'hard'],
  [B.A, 'cw'], [B.B, 'ccw'], [B.X, 'ccw'], [B.Y, 'hold'],
  [B.LB, 'hold'], [B.RB, 'zone'], [B.LT, 'hold'], [B.RT, 'hard'],
  [B.START, 'pause'], [B.SELECT, 'pause'],
];

export class PadLayer {
  // mode(): 'play' | 'menu' | 'battle-menu' | 'battle' | 'off'
  // play: { press(action), release(action) }
  // nav:  { move(dir), activate(), back(), start(), adjust?(dir) }
  constructor({ mode, play, nav, onDevice = null, onInput = null, getGamepads, now, pollMs = 10, autoStart = true } = {}) {
    this.mode = mode || (() => 'menu');
    this.play = play; this.nav = nav;
    this.onDevice = onDevice; this.onInput = onInput;
    this.getGamepads = getGamepads || (() => (globalThis.navigator && navigator.getGamepads ? navigator.getGamepads() : []));
    this.now = now || (() => performance.now());
    this.pollMs = pollMs;
    this.supported = !!(globalThis.navigator && navigator.getGamepads);
    this.pads = new Map();        // index → { id, memo, norm }
    this.state = new Array(17).fill(false);
    this.stick = {};
    this._mode = null;
    this._held = new Map();       // play action → count of buttons holding it
    this._rep = null;             // menu auto-repeat { dir, next }
    if (autoStart) this.start();
  }

  start() { if (!this._timer) this._timer = setInterval(() => this.poll(), this.pollMs); }
  stop() { clearInterval(this._timer); this._timer = null; this._releaseAll(); }

  // Connected pads (for the settings screen / diagnostics).
  list() { return [...this.pads.values()].map(p => ({ index: p.index, id: p.id, standard: p.norm ? p.norm.standard : false, layout: p.norm ? p.norm.layout : '', buttons: p.norm ? p.norm.buttons.slice() : [], lx: p.norm ? p.norm.lx : 0, ly: p.norm ? p.norm.ly : 0, raw: p.raw })); }

  _releaseAll() {
    if (this.play) for (const [a, n] of this._held) if (n > 0) this.play.release(a);
    this._held.clear();
  }

  poll() {
    let list;
    try { list = this.getGamepads() || []; } catch { return; }
    const merged = new Array(17).fill(false), seen = new Set();
    let lx = 0, ly = 0;
    for (const gp of list) {
      if (!gp || gp.connected === false) continue;
      seen.add(gp.index);
      let p = this.pads.get(gp.index);
      if (!p) {
        p = { index: gp.index, id: gp.id, memo: {}, norm: null };
        this.pads.set(gp.index, p);
        if (this.onDevice) this.onDevice({ connected: true, index: gp.index, id: gp.id, standard: gp.mapping === 'standard' });
      }
      p.norm = normalizePad(gp, p.memo);
      p.raw = { buttons: (gp.buttons || []).map(pressed), axes: (gp.axes || []).map(v => Math.round(v * 100) / 100), mapping: gp.mapping };
      p.norm.buttons.forEach((v, i) => { if (v) merged[i] = true; });
      if (Math.abs(p.norm.lx) > Math.abs(lx)) lx = p.norm.lx;
      if (Math.abs(p.norm.ly) > Math.abs(ly)) ly = p.norm.ly;
    }
    for (const idx of [...this.pads.keys()]) if (!seen.has(idx)) {
      const p = this.pads.get(idx); this.pads.delete(idx);
      if (this.onDevice) this.onDevice({ connected: false, index: idx, id: p.id });
    }
    // The left stick drives the d-pad too.
    this.stick = stickDirs(lx, ly, this.stick);
    if (this.stick.U) merged[B.UP] = true; if (this.stick.D) merged[B.DOWN] = true;
    if (this.stick.L) merged[B.LEFT] = true; if (this.stick.R) merged[B.RIGHT] = true;

    const mode = this.mode();
    const prev = this.state;
    if (mode !== this._mode) {
      // New context: buttons already down don't count as fresh presses.
      this._releaseAll();
      this._rep = null;
      this._mode = mode;
      this.state = merged;
      return;
    }
    this.state = merged;
    const rose = (i) => merged[i] && !prev[i], fell = (i) => !merged[i] && prev[i];
    let any = false;
    for (let i = 0; i < 17; i++) if (rose(i)) any = true;
    if (any && this.onInput) this.onInput(mode);
    if (mode === 'play' && this.play) {
      for (const [btn, action] of PLAY_MAP) {
        if (rose(btn)) { const n = this._held.get(action) || 0; this._held.set(action, n + 1); if (n === 0) this.play.press(action); }
        else if (fell(btn)) { const n = this._held.get(action) || 0; if (n > 0) { this._held.set(action, n - 1); if (n === 1) this.play.release(action); } }
      }
      return;
    }
    if ((mode === 'menu' || mode === 'battle-menu') && this.nav) {
      const t = this.now();
      const dirs = [['U', B.UP], ['D', B.DOWN], ['L', B.LEFT], ['R', B.RIGHT]];
      for (const [d, btn] of dirs) {
        if (rose(btn)) { this.nav.move(d); this._rep = { dir: d, btn, next: t + 380 }; }
      }
      if (this._rep) {
        if (!merged[this._rep.btn]) this._rep = null;
        else if (t >= this._rep.next) { this.nav.move(this._rep.dir); this._rep.next = t + 140; }
      }
      if (rose(B.A)) this.nav.activate();
      if (rose(B.B) || rose(B.SELECT)) this.nav.back();
      if (rose(B.START) && mode === 'menu') this.nav.start();
    }
    // 'battle': the dance battle's own InputMapper reads the pads.
  }

  destroy() { this.stop(); }
}

// ── Spatial menu navigation (DOM) ───────────────────────────────────
// A focus ring that the d-pad moves between the visible buttons of
// whatever is on top (pause card, settings, start screen …).
const FOCUSABLE = 'button, a[href], input, select, [role="button"], [tabindex]:not([tabindex="-1"]), .story-level, .level-chip';

function visible(el) {
  if (el.disabled || el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05 || cs.pointerEvents === 'none') return false;
  return true;
}

// The topmost full-screen layer under the middle of the screen, else the page.
export function navRoot(doc = document) {
  const W = innerWidth, H = innerHeight;
  let root = null;
  for (const [x, y] of [[W / 2, H / 2], [W / 2, H * 0.3], [W / 2, H * 0.7]]) {
    for (let n = doc.elementFromPoint(x, y); n && n !== doc.body && n !== doc.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if ((cs.position === 'fixed' || cs.position === 'absolute') && n.offsetWidth >= W * 0.6 && n.offsetHeight >= H * 0.5) root = n;
    }
    if (root) break;
  }
  return root || doc.body;
}

export function navCandidates(root = navRoot()) {
  const out = [];
  for (const el of root.querySelectorAll(FOCUSABLE)) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight) {
      // On screen: must actually be on top (not under an overlay).
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || (hit !== el && !el.contains(hit) && !hit.contains(el))) continue;
    }
    out.push(el);
  }
  return out;
}

let _focus = null;
export function navCurrent() { return _focus && document.contains(_focus) ? _focus : null; }

export function navFocus(el) {
  if (_focus && _focus !== el) _focus.classList.remove('pad-focus');
  _focus = el;
  if (!el) return;
  el.classList.add('pad-focus');
  try { el.focus({ preventScroll: true }); } catch {}
  try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch {}
}

// Pick a sensible first focus: a primary / resume / start button.
export function navDefault(cands = navCandidates()) {
  const pref = ['#pause-resume', '.beat-card.on .primary', '#start-btn-2', '#splash-start-btn', '#start-btn', '#settings-done', '.ov-primary', '.primary', '[autofocus]'];
  for (const q of pref) { const el = cands.find(c => c.matches(q)); if (el) return el; }
  return cands[0] || null;
}

export function navMove(dir) {
  const cands = navCandidates();
  let cur = navCurrent();
  if (!cur || !cands.includes(cur)) { navFocus(navDefault(cands)); return; }
  // Range sliders / selects take left-right themselves.
  if ((dir === 'L' || dir === 'R') && cur.matches('input[type="range"]')) {
    const step = +cur.step || 1;
    cur.value = String(+cur.value + (dir === 'R' ? step : -step) * Math.max(1, Math.round(((+cur.max || 100) - (+cur.min || 0)) / step / 20)));
    cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if ((dir === 'L' || dir === 'R') && cur.tagName === 'SELECT') {
    const n = cur.options.length; if (!n) return;
    cur.selectedIndex = (cur.selectedIndex + (dir === 'R' ? 1 : n - 1)) % n;
    cur.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestS = Infinity;
  for (const c of cands) {
    if (c === cur) continue;
    const r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = cx - ax, dy = cy - ay;
    const main = dir === 'R' ? dx : dir === 'L' ? -dx : dir === 'D' ? dy : -dy;
    const side = dir === 'R' || dir === 'L' ? Math.abs(dy) : Math.abs(dx);
    // Ahead of the current one; prefer close and in line.
    const gap = dir === 'R' ? r.left - a.right : dir === 'L' ? a.left - r.right : dir === 'D' ? r.top - a.bottom : a.top - r.bottom;
    if (main <= 4 && gap < -2) continue;
    if (main <= 0) continue;
    const s = Math.max(0, gap) + main * 0.4 + side * 2.2;
    if (s < bestS) { bestS = s; best = c; }
  }
  if (best) navFocus(best);
}

export function navActivate() {
  const cands = navCandidates();
  const cur = navCurrent();
  if (!cur || !cands.includes(cur)) { navFocus(navDefault(cands)); return; }
  if (cur.matches('input[type="range"]')) return;
  if (cur.matches('input[type="checkbox"], input[type="radio"]')) { cur.click(); return; }
  cur.click();
}
