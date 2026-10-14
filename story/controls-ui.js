// Controls screen — rebind every battle action on the keyboard and on a
// gamepad, and set per-device latency offsets. Saved to localStorage (see
// input.js); a running battle picks the new bindings up immediately.

import { ACTIONS, ACTION_LABEL, loadControls, saveControls, defaultControls, bind, bindingsFor, InputMapper } from './input.js';

const KEY_NAME = (code) => ({ Space: 'Space', Enter: 'Enter', NumpadEnter: 'Num Enter', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', Escape: 'Esc',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[code] || code.replace(/^Key/, '').replace(/^Digit/, ''));
const PAD_NAME = (i) => ({ 0: 'A / ✕', 1: 'B / ○', 2: 'X / □', 3: 'Y / △', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Select', 9: 'Start', 12: 'D-↑', 13: 'D-↓', 14: 'D-←', 15: 'D-→' }[i] || `Btn ${i}`);

function css() {
  if (document.getElementById('ctl-css')) return;
  const st = document.createElement('style');
  st.id = 'ctl-css';
  st.textContent = `
  .ctl-wrap { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(6, 2, 12, 0.72); backdrop-filter: blur(4px); font-family: var(--font-ui, system-ui); color: #fff; }
  .ctl-card { width: min(560px, 94vw); max-height: 90vh; overflow: auto; background: #170b26; border: 1px solid rgba(255,255,255,0.18); border-radius: 16px; padding: 16px 18px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
  .ctl-card h2 { margin: 0 0 4px; font: 900 18px var(--font-display, system-ui); letter-spacing: 4px; color: #ffc93a; }
  .ctl-card p { margin: 0 0 12px; font-size: 12px; color: rgba(255,255,255,0.7); }
  .ctl-grid { display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 6px 8px; align-items: center; font-size: 13px; }
  .ctl-grid .h { font-size: 10px; font-weight: 900; letter-spacing: 2px; color: rgba(255,255,255,0.55); }
  .ctl-b { font: 700 12px var(--font-ui, system-ui); color: #fff; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 6px 8px; cursor: pointer; text-align: left; }
  .ctl-b.wait { border-color: #ffc93a; color: #ffc93a; animation: ctlPulse 0.6s ease-in-out infinite alternate; }
  @keyframes ctlPulse { to { box-shadow: 0 0 10px rgba(255,201,58,0.7); } }
  .ctl-lat { display: grid; grid-template-columns: 90px 1fr 60px; gap: 8px; align-items: center; margin-top: 14px; font-size: 12px; }
  .ctl-lat input { width: 100%; }
  .ctl-row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
  .ctl-act { font: 900 12px var(--font-display, system-ui); letter-spacing: 2px; color: #fff; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; padding: 9px 14px; cursor: pointer; }
  .ctl-act.primary { background: linear-gradient(135deg, #ff9d2e, #ff3d9a); border-color: transparent; }
  .ctl-pads { margin-top: 10px; font-size: 11px; color: rgba(255,255,255,0.65); }`;
  document.head.appendChild(st);
}

export function openControls({ onChange = null } = {}) {
  css();
  let controls = loadControls();
  const wrap = document.createElement('div');
  wrap.className = 'ctl-wrap';
  wrap.innerHTML = `<div class="ctl-card" role="dialog" aria-label="Controls">
    <h2>CONTROLS</h2>
    <p>Click a binding, then press the key or gamepad button to use. Directions are entered in order before beat 4; ✕ / ○ must land on beat 4.</p>
    <div class="ctl-grid"></div>
    <div class="ctl-lat"></div>
    <div class="ctl-pads"></div>
    <div class="ctl-row"><button class="ctl-act" data-a="reset">DEFAULTS</button><button class="ctl-act primary" data-a="done">DONE</button></div>
  </div>`;
  document.body.appendChild(wrap);
  const grid = wrap.querySelector('.ctl-grid'), lat = wrap.querySelector('.ctl-lat'), padsEl = wrap.querySelector('.ctl-pads');
  // A private mapper only for capturing presses (and listing pads).
  const cap = new InputMapper({ onAction: () => {}, onDevice: () => showPads(), controls });
  cap.enabled = false;
  const showPads = () => {
    const list = [...cap.pads.values()].map(p => p.id);
    padsEl.textContent = list.length ? `Gamepads: ${list.join(' · ')}` : 'No gamepad detected — press a button on it to wake it up.';
  };
  const commit = () => { saveControls(controls); if (onChange) onChange(controls); };
  const render = () => {
    grid.innerHTML = '<span class="h">ACTION</span><span class="h">KEYBOARD</span><span class="h">GAMEPAD</span>';
    for (const a of ACTIONS) {
      const b = bindingsFor(controls, a);
      const name = document.createElement('span'); name.textContent = ACTION_LABEL[a];
      const kb = document.createElement('button'); kb.className = 'ctl-b'; kb.textContent = b.keys.map(KEY_NAME).join(', ') || '—';
      const pb = document.createElement('button'); pb.className = 'ctl-b'; pb.textContent = b.pad.map(PAD_NAME).join(', ') || '—';
      kb.onclick = () => { kb.classList.add('wait'); kb.textContent = 'press a key…'; cap.capture((bd) => {
        if (bd.type === 'key') { controls = bind(controls, a, bd); commit(); }
        render();
      }); };
      pb.onclick = () => { pb.classList.add('wait'); pb.textContent = 'press a button…'; cap.capture((bd) => {
        if (bd.type === 'button') { controls = bind(controls, a, bd); commit(); }
        render();
      }); };
      grid.append(name, kb, pb);
    }
    lat.innerHTML = '';
    for (const [k, label] of [['key', 'Keyboard'], ['pad', 'Gamepad'], ['touch', 'Touch']]) {
      const l = document.createElement('span'); l.textContent = `${label} latency`;
      const r = document.createElement('input'); r.type = 'range'; r.min = -50; r.max = 120; r.step = 1; r.value = controls.latency[k] || 0;
      const v = document.createElement('span'); v.textContent = `${r.value} ms`;
      r.oninput = () => { v.textContent = `${r.value} ms`; controls = { ...controls, latency: { ...controls.latency, [k]: +r.value } }; commit(); };
      lat.append(l, r, v);
    }
    showPads();
  };
  render();
  const close = () => { cap.destroy(); wrap.remove(); window.removeEventListener('keydown', esc, true); };
  const esc = (e) => { if (e.key === 'Escape' && !cap._capture) { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
  window.addEventListener('keydown', esc, true);
  wrap.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]');
    if (!a) { if (e.target === wrap) close(); return; }
    if (a.dataset.a === 'reset') { controls = defaultControls(); commit(); render(); }
    else close();
  });
  return { close };
}
