// InputMapper — keyboard + gamepad input for the dance battle, turned into
// the battle's actions with accurate timestamps:
//   U D L R  directions        X  ✕ (cross)     O  ○ (circle)
//   T        attack (△)        S  dodge (□)     P  pause
// Bindings are configurable and saved (localStorage 'tb.controls.v1');
// every device class has its own latency offset (ms, subtracted from the
// timestamp) on top of the global audio calibration. Keyboard auto-repeat
// is ignored, presses closer than DEBOUNCE ms on the same control are
// treated as switch chatter, repeated commands (↑ ↑ ↓) need a release in
// between, and gamepads are polled at ~250 Hz with edge detection (sticks
// with hysteresis) so a press is timed to within a few ms.
// 2P VS (players = 2): P2 has its own keyboard map (keys2, checked first —
// the arrow keys move to P2, P1 keeps WASD) and the second gamepad.

export const ACTIONS = ['U', 'D', 'L', 'R', 'X', 'O', 'T', 'S', 'P'];
export const ACTION_LABEL = { U: '↑ Up', D: '↓ Down', L: '← Left', R: '→ Right', X: '✕ Cross', O: '○ Circle', T: '△ Attack', S: '□ Dodge', P: 'Pause' };
const STORE = 'tb.controls.v1';
const DEBOUNCE = 0.025;            // seconds
const STICK_ON = 0.6, STICK_OFF = 0.35;

export function defaultControls() {
  return {
    keys: {
      ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
      KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R',
      KeyJ: 'X', Space: 'X', KeyK: 'O', Enter: 'O', NumpadEnter: 'O',
      KeyI: 'T', KeyT: 'T', KeyU: 'S', ShiftLeft: 'S', ShiftRight: 'S',
      Escape: 'P', KeyP: 'P',
    },
    // Standard gamepad mapping: 0 = bottom face (✕ / A), 1 = right (○ / B),
    // 2 = left (□ / X), 3 = top (△ / Y), 9 = start, 12-15 = d-pad.
    pad: { 12: 'U', 13: 'D', 14: 'L', 15: 'R', 0: 'X', 1: 'O', 3: 'T', 2: 'S', 9: 'P' },
    // P2's keyboard in 2P VS.
    keys2: {
      ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
      Period: 'X', Numpad1: 'X', Slash: 'O', Numpad2: 'O', Semicolon: 'T', Numpad5: 'T', Quote: 'S', Numpad4: 'S',
    },
    stick: true,
    latency: { key: 0, pad: 0, touch: 0 },   // ms
  };
}

export function loadControls(storage = globalThis.localStorage) {
  const d = defaultControls();
  try {
    const raw = storage && storage.getItem(STORE);
    if (!raw) return d;
    const c = JSON.parse(raw);
    return { ...d, ...c, keys: { ...(c.keys || d.keys) }, keys2: { ...(c.keys2 || d.keys2) }, pad: { ...(c.pad || d.pad) }, latency: { ...d.latency, ...(c.latency || {}) } };
  } catch { return d; }
}
export function saveControls(c, storage = globalThis.localStorage) {
  try { storage && storage.setItem(STORE, JSON.stringify(c)); } catch {}
}

// Rebind `action` to a key code or a pad button, removing what that
// control did before (one control → one action).
export function bind(controls, action, binding, player = 1) {
  const c = { ...controls, keys: { ...controls.keys }, keys2: { ...(controls.keys2 || {}) }, pad: { ...controls.pad } };
  if (binding.type === 'key') { (player === 2 ? c.keys2 : c.keys)[binding.code] = action; }
  else if (binding.type === 'button') { c.pad[binding.index] = action; }
  return c;
}
export function bindingsFor(controls, action, player = 1) {
  const keys = (player === 2 ? controls.keys2 : controls.keys) || {};
  return {
    keys: Object.keys(keys).filter(k => keys[k] === action),
    pad: Object.keys(controls.pad).filter(k => controls.pad[k] === action).map(Number),
  };
}

export class InputMapper {
  // onAction(action, timeStamp ms (performance.now base), info { source, pad })
  // onDevice({ connected, index, id })
  constructor({ onAction, onDevice = null, controls = null, target = globalThis.window,
    getGamepads = () => (globalThis.navigator && navigator.getGamepads ? navigator.getGamepads() : []),
    now = () => performance.now(), pollMs = 4, autoStart = true } = {}) {
    this.onAction = onAction;
    this.onDevice = onDevice;
    this.controls = controls || loadControls();
    this.target = target;
    this.getGamepads = getGamepads;
    this.now = now;
    this.pollMs = pollMs;
    this.enabled = true;
    this.players = 1;               // 2 = 2P VS (keys2 + second gamepad → P2)
    this.pads = new Map();          // index -> { id, buttons: bool[], dirs: {U,D,L,R} }
    this._last = new Map();         // control key -> last press time (s)
    this._capture = null;
    this._onKey = (e) => this._key(e);
    this._onConn = (e) => this._device(e.gamepad, true);
    this._onDisc = (e) => this._device(e.gamepad, false);
    if (autoStart) this.start();
  }

  start() {
    if (!this.target) return;
    this.target.addEventListener('keydown', this._onKey, true);
    this.target.addEventListener('gamepadconnected', this._onConn);
    this.target.addEventListener('gamepaddisconnected', this._onDisc);
    this._timer = setInterval(() => this.poll(), this.pollMs);
  }
  stop() {
    if (!this.target) return;
    this.target.removeEventListener('keydown', this._onKey, true);
    this.target.removeEventListener('gamepadconnected', this._onConn);
    this.target.removeEventListener('gamepaddisconnected', this._onDisc);
    clearInterval(this._timer);
  }
  setControls(c) { this.controls = c; }

  // Next key / pad button pressed goes to `cb(binding)` instead of the game
  // (the controls screen uses this to rebind).
  capture(cb) { this._capture = cb; }

  _emit(action, ts, info) {
    if (!this.enabled || !action) return false;
    const ctl = info.control;
    const t = ts / 1000, last = this._last.get(ctl);
    if (last != null && t - last >= 0 && t - last < DEBOUNCE) return false;   // switch chatter
    this._last.set(ctl, t);
    const lat = (this.controls.latency || {})[info.source] || 0;
    this.onAction(action, ts - lat, info);
    return true;
  }

  // Keyboard: physical key codes (layout-independent); held keys repeat
  // in the OS — those repeats are ignored.
  _key(e) {
    const code = e.code || e.key;
    if (this._capture) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) { const cb = this._capture; this._capture = null; cb({ type: 'key', code }); }
      return;
    }
    const p2 = this.players === 2 && this.controls.keys2 && this.controls.keys2[code];
    const action = p2 || this.controls.keys[code];
    if (!action) return false;
    if (this.claims && !this.claims(action, e)) return false;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return true;
    this._emit(action, e.timeStamp || this.now(), { source: 'key', control: 'k:' + code, player: p2 ? 2 : 1 });
    return true;
  }

  _device(gp, connected) {
    if (!gp) return;
    if (!connected) {
      // Whatever was held on it is released; nothing fires.
      this.pads.delete(gp.index);
    }
    if (this.onDevice) this.onDevice({ connected, index: gp.index, id: gp.id });
  }

  // Read every pad: rising edges fire, timed at the pad's own timestamp
  // when it has one (same clock as performance.now), else now.
  poll() {
    let list;
    try { list = this.getGamepads() || []; } catch { return; }
    const now = this.now();
    const seen = new Set();
    const fires = [];             // every pad's new presses, emitted in time order
    for (const gp of list) {
      if (!gp || gp.connected === false) continue;
      seen.add(gp.index);
      let st = this.pads.get(gp.index);
      if (!st) {
        // A pad that (re)appears: whatever is already held counts as held,
        // so it doesn't fire on connect.
        st = { id: gp.id, buttons: (gp.buttons || []).map(b => (typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5)), dirs: { U: false, D: false, L: false, R: false } };
        const ax = gp.axes || [];
        if (this.controls.stick) st.dirs = { L: -(ax[0] || 0) > STICK_ON, R: (ax[0] || 0) > STICK_ON, U: -(ax[1] || 0) > STICK_ON, D: (ax[1] || 0) > STICK_ON };
        this.pads.set(gp.index, st);
        if (this.onDevice) this.onDevice({ connected: true, index: gp.index, id: gp.id });
      }
      const ts = gp.timestamp && gp.timestamp <= now + 1 && gp.timestamp > now - 100 ? gp.timestamp : now;
      // Directions first so a direction + button in the same poll stay in
      // order (arrows before the final button).
      const player = this.players === 2 && gp.index >= 1 ? 2 : 1;
      const push = (order, action, control) => fires.push({ ts, order, action, info: { source: 'pad', pad: gp.index, control, player } });
      const ax = gp.axes || [], x = ax[0] || 0, y = ax[1] || 0;
      if (this.controls.stick) {
        for (const [dir, v] of [['L', -x], ['R', x], ['U', -y], ['D', y]]) {
          const was = st.dirs[dir], on = was ? v > STICK_OFF : v > STICK_ON;
          if (on && !was) push(0, dir, 'a:' + gp.index + ':' + dir);
          st.dirs[dir] = on;
        }
      }
      (gp.buttons || []).forEach((b, i) => {
        const on = typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5;
        if (this._capture && on && !st.buttons[i]) { const cb = this._capture; this._capture = null; cb({ type: 'button', index: i, pad: gp.index }); }
        else if (on && !st.buttons[i]) {
          const action = this.controls.pad[i];
          if (action) push('UDLR'.includes(action) ? 0 : 1, action, 'b:' + gp.index + ':' + i);
        }
        st.buttons[i] = on;
      });
    }
    // Two pads in one poll (2P): oldest press first.
    fires.sort((a, b) => a.ts - b.ts || a.order - b.order);
    for (const f of fires) this._emit(f.action, f.ts, f.info);
    // Pads that vanished without an event (some browsers): forget them.
    for (const idx of [...this.pads.keys()]) {
      if (!seen.has(idx)) { this.pads.delete(idx); if (this.onDevice) this.onDevice({ connected: false, index: idx }); }
    }
  }

  // Touch / on-screen pads call this directly.
  touch(action, ts) { return this._emit(action, ts, { source: 'touch', control: 't:' + action + ':' + Math.round(ts), player: 1 }); }

  destroy() { this.stop(); this.onAction = () => {}; }
}
