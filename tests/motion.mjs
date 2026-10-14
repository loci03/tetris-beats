// Headless motion analysis for the dance system: drives a DanceController
// with a fake rig at 60 fps and measures what a viewer would notice —
// foot skating, foot contacts vs the beat grid, pose pops, flips, the state
// sequence. Used by tests/dance.test.mjs and the audit scripts.

import { DanceController, LAYOUT, MOVES } from '../story/dance.js';
import '../story/vocab.js';

const { ROOT, FEET, FS, ANK, HIP_Y, LEG } = LAYOUT;
const fakeRig = { applyPose() {}, setExpression() {} };

// Foot considered on the floor (flat or on its ball) when its ankle target
// is within this of resting height + the toe-raise offset.
const PLANT = 0.012;
export const footPlanted = (a, side) => {
  const f = FEET + side * FS;
  return a[f + 1] - Math.max(0, a[f + 3]) * 0.06 < ANK + PLANT;
};

// Simulate `plan` (entries like Choreographer output) from beat `from` to
// `to`. Returns per-frame samples and derived events.
export function simulate(def, plan, { bpm = 120, from = 0, to = 32, fps = 60, acc = true, foeSide = +1 } = {}) {
  const spb = 60 / bpm;
  const dc = new DanceController(fakeRig, { ...def.style, spb }, foeSide);
  for (const e of plan) {
    if (e.react) continue;
    dc.play(e.name, e.start, e.len, { state: e.state, fade: e.fade, lead: e.lead, out: e.out, level: e.level, mirror: e.mirror });
  }
  const reacts = plan.filter(e => e.react).sort((a, b) => a.start - b.start);
  const step = 1 / fps / spb;
  const frames = [];
  const A = { kick: 0, snare: 0, energy: 1 };
  for (let b = from; b <= to + 1e-9; b += step) {
    while (reacts.length && reacts[0].start <= b) { const r = reacts.shift(); dc.react(r.name, r.start, r.len, { state: r.state, fade: r.fade, mirror: r.mirror, level: r.level }); }
    if (acc) {
      const ph = b - Math.floor(b), even = (Math.floor(b) & 1) === 0;
      A.kick = even ? Math.exp(-ph * spb / 0.075) : 0; A.snare = even ? 0 : Math.exp(-ph * spb / 0.09);
    }
    dc.update(b, acc ? A : null);
    frames.push({ beat: b, a: Float32Array.from(dc.out), state: dc.state, move: dc.cur.name });
  }
  return { frames, spb, dc };
}

// Skating: a planted foot that travels across the floor between frames
// (moves flagged `slide`, and glides / moonwalks, are allowed to).
const SLIDERS = /glide|moonwalk|swivel|runningMan|rogerRabbit|footwork/i;
export function skating(sim, { speed = 0.6 } = {}) {
  const out = [];
  const { frames, spb } = sim;
  for (let i = 1; i < frames.length; i++) {
    const p = frames[i - 1], c = frames[i];
    const dt = (c.beat - p.beat) * spb;
    for (let s = 0; s < 2; s++) {
      if (!footPlanted(p.a, s) || !footPlanted(c.a, s)) continue;
      const f = FEET + s * FS;
      const v = Math.hypot(c.a[f] - p.a[f], c.a[f + 2] - p.a[f + 2]) / dt;
      const m = c.move;
      if (v > speed && !(MOVES[m] && MOVES[m].slide) && !SLIDERS.test(m)) out.push({ beat: c.beat, side: s ? 'R' : 'L', v, move: m, state: c.state });
    }
  }
  return out;
}

// Foot contacts (lift → plant) with their offset from the nearest 8th note.
export function contacts(sim) {
  const out = [];
  const { frames, spb } = sim;
  for (let i = 1; i < frames.length; i++) {
    for (let s = 0; s < 2; s++) {
      if (!footPlanted(frames[i - 1].a, s) && footPlanted(frames[i].a, s)) {
        const b = frames[i].beat, n8 = Math.round(b * 2) / 2, n16 = Math.round(b * 4) / 4;
        out.push({ beat: b, side: s ? 'R' : 'L', offMs: (b - n8) * spb * 1000, off16Ms: (b - n16) * spb * 1000, move: frames[i].move, state: frames[i].state });
      }
    }
  }
  return out;
}

// Largest joint angular speed between frames (rad/s) — pops / snaps.
export function pops(sim, { limit = 30 } = {}) {
  const out = [];
  const { frames, spb } = sim;
  for (let i = 1; i < frames.length; i++) {
    const dt = (frames[i].beat - frames[i - 1].beat) * spb;
    let worst = 0, j = -1;
    for (let k = 0; k < ROOT; k++) { const w = Math.abs(frames[i].a[k] - frames[i - 1].a[k]) / dt; if (w > worst) { worst = w; j = k; } }
    if (worst > limit) out.push({ beat: frames[i].beat, w: worst, joint: j, move: frames[i].move, state: frames[i].state });
  }
  return out;
}

// Flips / inversions / airborne frames outside the designated states.
export function acrobatics(sim, allowStates = ['SOLO_SEQUENCE', 'VICTORY_DANCE']) {
  const out = [];
  for (const f of sim.frames) {
    if (allowStates.includes(f.state)) continue;
    const t = Math.max(Math.abs(f.a[ROOT + 4]), Math.abs(f.a[ROOT + 5]));
    if (t > 1.2) out.push({ beat: f.beat, kind: 'flip', move: f.move });
    else if (f.a[ROOT + 1] > 0.12) out.push({ beat: f.beat, kind: 'airborne', move: f.move });
  }
  return out;
}

// Over-reach: a foot target farther from its hip than the leg can reach.
export function overreach(sim) {
  let worst = 0;
  for (const f of sim.frames) {
    const py = HIP_Y + f.a[ROOT + 1];
    for (let s = 0; s < 2; s++) {
      const o = FEET + s * FS;
      const d = Math.hypot(f.a[o] - f.a[ROOT], f.a[o + 1] - py, f.a[o + 2] - f.a[ROOT + 2]);
      worst = Math.max(worst, d / (2 * LEG));
    }
  }
  return worst;
}

// The state sequence (deduplicated).
export function stateSequence(sim) {
  const seq = [];
  for (const f of sim.frames) if (!seq.length || seq[seq.length - 1].state !== f.state) seq.push({ beat: f.beat, state: f.state, move: f.move });
  return seq;
}
