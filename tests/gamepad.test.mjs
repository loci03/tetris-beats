// Controller layer tests (story/gamepad.js): any pad → the standard layout,
// and the PadLayer that plays Tetris / navigates menus / yields to battles.
//   node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePad, hatDirs, layoutFor, PadLayer, BTN, stickDirs } from '../story/gamepad.js';

const btns = (n, on = []) => Array.from({ length: n }, (_, i) => ({ pressed: on.includes(i), value: on.includes(i) ? 1 : 0 }));
const HAT_REST = 9 / 7;

test('standard-mapped pads pass straight through', () => {
  const n = normalizePad({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, mapping: 'standard', buttons: btns(17, [0, 9, 12]), axes: [0.2, -0.9, 0, 0] });
  assert.equal(n.standard, true);
  assert.equal(n.buttons[BTN.A], true); assert.equal(n.buttons[BTN.START], true); assert.equal(n.buttons[BTN.UP], true);
  assert.equal(n.buttons[BTN.B], false);
  assert.equal(n.ly, -0.9);
});

test('hat switch: eight directions and centred', () => {
  assert.deepEqual(hatDirs(-1), ['U']);
  assert.deepEqual(hatDirs(-1 + 2 / 7 * 2), ['R']);
  assert.deepEqual(hatDirs(-1 + 2 / 7 * 4), ['D']);
  assert.deepEqual(hatDirs(-1 + 2 / 7 * 6), ['L']);
  assert.deepEqual(hatDirs(-1 + 2 / 7 * 3).sort(), ['D', 'R']);
  assert.deepEqual(hatDirs(HAT_REST), []);
});

test('Xbox pad without a browser mapping (Linux xpad order, hat d-pad, trigger axes)', () => {
  assert.equal(layoutFor('045e-02ea-Microsoft X-Box One S pad'), 'xbox');
  const memo = {};
  const gp = (on, axes) => ({ id: '045e-02ea-Microsoft X-Box One S pad', index: 0, mapping: '', buttons: btns(11, on), axes });
  // At rest: the hat axis (index 9) sits at 9/7 and is remembered.
  let n = normalizePad(gp([], [0, 0, -1, 0, 0, -1, 0, 0, 0, HAT_REST]), memo);
  assert.equal(memo.hat, 9);
  assert.equal(n.buttons.some(Boolean), false);
  // Start is raw 7, Back raw 6; d-pad left on the hat; right trigger pulled.
  n = normalizePad(gp([7, 6], [0, 0, -1, 0, 0, 0.9, 0, 0, 0, -1 + 2 / 7 * 6]), memo);
  assert.equal(n.buttons[BTN.START], true); assert.equal(n.buttons[BTN.SELECT], true);
  assert.equal(n.buttons[BTN.LEFT], true); assert.equal(n.buttons[BTN.RT], true); assert.equal(n.buttons[BTN.LT], false);
});

test('PlayStation pad without a mapping: ✕ ○ △ □ land on A B Y X', () => {
  const memo = {};
  const n = normalizePad({ id: '054c-09cc-Wireless Controller', index: 1, mapping: '', buttons: btns(13, [2, 3, 9]), axes: [0, 0, 0, 0, 0, 0, 0, 1] }, memo);
  assert.equal(n.layout, 'sony');
  assert.equal(n.buttons[BTN.Y], true, 'triangle'); assert.equal(n.buttons[BTN.X], true, 'square'); assert.equal(n.buttons[BTN.START], true, 'options');
  assert.equal(n.buttons[BTN.DOWN], true, 'd-pad on axes 6/7');
});

test('generic pad with a digital d-pad on axes 6/7', () => {
  const n = normalizePad({ id: 'USB Gamepad', index: 0, mapping: '', buttons: btns(12, [0]), axes: [0, 0, 0, 0, 0, 0, -1, 0] }, {});
  assert.equal(n.buttons[BTN.A], true); assert.equal(n.buttons[BTN.LEFT], true);
  // Analog values on 6/7 (not a d-pad) are ignored.
  const m = normalizePad({ id: 'USB Gamepad', index: 0, mapping: '', buttons: btns(12), axes: [0, 0, 0, 0, 0, 0, -0.63, 0.2] }, {});
  assert.equal(m.buttons[BTN.LEFT], false);
});

test('stick → d-pad with hysteresis', () => {
  let h = stickDirs(-0.7, 0, {});
  assert.equal(h.L, true);
  h = stickDirs(-0.45, 0, h); assert.equal(h.L, true, 'stays on above 0.35');
  h = stickDirs(-0.3, 0, h); assert.equal(h.L, false);
  h = stickDirs(-0.5, 0, h); assert.equal(h.L, false, 'needs 0.6 to come back');
});

function rig(mode = 'play') {
  const pads = [];
  const log = [];
  const L = new PadLayer({
    mode: () => rig.mode, autoStart: false, getGamepads: () => pads,
    play: { press: (a) => log.push(['down', a]), release: (a) => log.push(['up', a]) },
    nav: { move: (d) => log.push(['move', d]), activate: () => log.push(['A']), back: () => log.push(['B']), start: () => log.push(['start']) },
    onDevice: (d) => log.push(['dev', d.connected]),
  });
  rig.mode = mode;
  const pad = { id: 'Test Pad', index: 0, mapping: 'standard', connected: true, buttons: btns(17), axes: [0, 0, 0, 0] };
  const set = (i, on) => { pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
  return { L, pads, pad, set, log };
}

test('Tetris on a controller: press / release map to the game actions (DAS works through release)', () => {
  const { L, pads, pad, set, log } = rig('play');
  pads.push(pad); L.poll();
  assert.deepEqual(log, [['dev', true]]);
  log.length = 0;
  set(BTN.LEFT, true); L.poll(); L.poll();             // held: one press
  set(BTN.LEFT, false); L.poll();
  set(BTN.A, true); L.poll(); set(BTN.A, false); L.poll();
  set(BTN.UP, true); L.poll(); set(BTN.UP, false); L.poll();
  set(BTN.START, true); L.poll(); set(BTN.START, false); L.poll();
  assert.deepEqual(log, [['down', 'left'], ['up', 'left'], ['down', 'cw'], ['up', 'cw'], ['down', 'hard'], ['up', 'hard'], ['down', 'pause'], ['up', 'pause']]);
  // Two buttons on one action (Y and LB both hold): one press, released when both are up.
  log.length = 0;
  set(BTN.Y, true); L.poll(); set(BTN.LB, true); L.poll(); set(BTN.Y, false); L.poll(); set(BTN.LB, false); L.poll();
  assert.deepEqual(log, [['down', 'hold'], ['up', 'hold']]);
  // The stick moves pieces too.
  log.length = 0;
  pad.axes[0] = 0.8; L.poll(); pad.axes[0] = 0; L.poll();
  assert.deepEqual(log, [['down', 'right'], ['up', 'right']]);
});

test('a held button does not fire again when the screen changes (menu → game)', () => {
  const { L, pads, pad, set, log } = rig('menu');
  pads.push(pad); L.poll(); log.length = 0;
  set(BTN.A, true); L.poll();                            // selects START on the menu
  assert.deepEqual(log, [['A']]);
  rig.mode = 'play'; L.poll(); L.poll();                 // game starts with A still held
  assert.deepEqual(log, [['A']], 'no rotate from the held A');
  set(BTN.A, false); L.poll(); set(BTN.A, true); L.poll();
  assert.deepEqual(log.slice(1), [['down', 'cw']]);
  // Leaving play releases what's held (no stuck auto-repeat).
  set(BTN.RIGHT, true); L.poll(); rig.mode = 'menu'; L.poll();
  assert.deepEqual(log.slice(-3), [['down', 'right'], ['up', 'cw'], ['up', 'right']]);
});

test('menus: d-pad moves with auto-repeat, A selects, B backs out, Start starts; battles are left alone', () => {
  let t = 0;
  const { L, pads, pad, set, log } = rig('menu');
  L.now = () => t;
  pads.push(pad); L.poll(); log.length = 0;
  set(BTN.DOWN, true); L.poll();                         // one move…
  t = 300; L.poll();                                     // (not yet repeating)
  t = 400; L.poll();                                     // …then repeats
  t = 545; L.poll();
  set(BTN.DOWN, false); t = 700; L.poll();
  assert.deepEqual(log, [['move', 'D'], ['move', 'D'], ['move', 'D']]);
  log.length = 0;
  set(BTN.B, true); L.poll(); set(BTN.B, false); L.poll();
  set(BTN.START, true); L.poll(); set(BTN.START, false); L.poll();
  assert.deepEqual(log, [['B'], ['start']]);
  // In a paused battle Start belongs to the battle (it pauses / resumes).
  rig.mode = 'battle-menu'; L.poll(); log.length = 0;
  set(BTN.START, true); L.poll(); set(BTN.START, false); L.poll();
  set(BTN.A, true); L.poll(); set(BTN.A, false); L.poll();
  assert.deepEqual(log, [['A']]);
  // While dancing the layer does nothing at all.
  rig.mode = 'battle'; L.poll(); log.length = 0;
  set(BTN.A, true); L.poll(); set(BTN.LEFT, true); L.poll();
  assert.deepEqual(log, []);
});

test('pads coming and going are reported', () => {
  const { L, pads, pad, log } = rig('menu');
  pads.push(pad); L.poll();
  pads.length = 0; L.poll();
  pads.push({ ...pad }); L.poll();
  assert.deepEqual(log.filter(e => e[0] === 'dev'), [['dev', true], ['dev', false], ['dev', true]]);
  assert.equal(L.list().length, 1);
});
