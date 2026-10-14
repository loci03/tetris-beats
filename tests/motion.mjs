// Headless motion analysis: drives a DanceController with a fake rig at
// 60 fps through a plan of moves and runs the same MotionMonitor the Dance
// View uses (story/dance-metrics.js) over every frame.

import { DanceController, LAYOUT } from '../story/dance.js';
import '../story/vocab.js';
import { MotionMonitor } from '../story/dance-metrics.js';

const { ROOT, FEET, FS, HIP_Y, LEG } = LAYOUT;
const fakeRig = { applyPose() {}, setExpression() {} };

// Simulate `plan` (Choreographer-style entries; `react` ones cut in at
// their start) from beat `from` to `to`.
export function simulate(def, plan, { bpm = 120, from = 0, to = 32, fps = 60, acc = true, foeSide = +1 } = {}) {
  const spb = 60 / bpm;
  const dc = new DanceController(fakeRig, { ...def.style, spb }, foeSide);
  // Entries are laid down in plan order, as BattleSession does: a reaction
  // cuts in at its start, and the entries listed after it are queued then.
  const play = (e) => dc.play(e.name, e.start, e.len, { state: e.state, fade: e.fade, lead: e.lead, out: e.out, level: e.level, mirror: e.mirror, faceFoe: e.faceFoe });
  const reacts = [];
  for (const e of plan) {
    if (e.react) reacts.push({ ...e, after: [] });
    else if (reacts.length) reacts[reacts.length - 1].after.push(e);
    else play(e);
  }
  reacts.sort((a, b) => a.start - b.start);
  const mon = new MotionMonitor(spb, { slides: !!def.style.slides });
  const step = 1 / fps / spb;
  const frames = [];
  const A = { kick: 0, snare: 0, energy: 1 };
  for (let b = from; b <= to + 1e-9; b += step) {
    while (reacts.length && reacts[0].start <= b) {
      const r = reacts.shift();
      dc.react(r.name, r.start, r.len, { state: r.state, fade: r.fade, mirror: r.mirror, level: r.level });
      r.after.forEach(play);
    }
    if (acc) {
      const ph = b - Math.floor(b), even = (Math.floor(b) & 1) === 0;
      A.kick = even ? Math.exp(-ph * spb / 0.075) : 0; A.snare = even ? 0 : Math.exp(-ph * spb / 0.09);
    }
    dc.update(b, acc ? A : null);
    const a = Float32Array.from(dc.out);
    mon.feed(b, a, dc.state, dc.cur.name);
    frames.push({ beat: b, a, state: dc.state, move: dc.cur.name });
  }
  return { frames, spb, dc, events: mon.events, contacts: mon.contacts };
}

export const skating = (sim) => sim.events.filter(e => e.kind === 'skate');
export const pops = (sim) => sim.events.filter(e => e.kind === 'pop');
export const acrobatics = (sim) => sim.events.filter(e => e.kind === 'flip' || e.kind === 'air');
export const illegalTransitions = (sim) => sim.events.filter(e => e.kind === 'fsm');
export const contacts = (sim) => sim.contacts;

// Worst foot reach as a fraction of the leg's length (> 1 = over-reach).
export function overreach(sim) {
  let worst = 0;
  for (const f of sim.frames) {
    const py = HIP_Y + f.a[ROOT + 1];
    for (let s = 0; s < 2; s++) {
      const o = FEET + s * FS;
      worst = Math.max(worst, Math.hypot(f.a[o] - f.a[ROOT], f.a[o + 1] - py, f.a[o + 2] - f.a[ROOT + 2]) / (2 * LEG));
    }
  }
  return worst;
}

// The state sequence, deduplicated.
export function stateSequence(sim) {
  const seq = [];
  for (const f of sim.frames) if (!seq.length || seq[seq.length - 1].state !== f.state) seq.push({ beat: f.beat, state: f.state, move: f.move });
  return seq;
}
