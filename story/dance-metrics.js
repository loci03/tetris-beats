// Motion metrics for the dance system — what a viewer would notice, frame
// by frame: feet skating while planted, foot contacts vs the beat grid,
// joints popping between frames, flips / airborne frames outside the
// designated specials, illegal state transitions. Shared by the Dance View
// (story/dev/danceview.html) and the tests (tests/*.mjs).

import { LAYOUT, MOVES, SLIDES } from './dance.js';
import { canTransition } from './choreo.js';

const { ROOT, FEET, FS, ANK } = LAYOUT;

// A foot is on the floor (flat, or on its ball) when its ankle target sits
// at resting height once the heel-raise offset is taken out.
export function footPlanted(a, side) {
  const f = FEET + side * FS;
  return a[f + 1] - Math.max(0, a[f + 3]) * 0.06 < ANK + 0.012;
}

// Moves whose planted feet travel on purpose (dance.js SLIDES, or a
// keyframed move's `slide` flag).
export const slidesOnPurpose = (name) => SLIDES.has(name) || !!(MOVES[name] && MOVES[name].slide);
// States where flips / jumps are designated.
export const SPECIAL_STATES = ['SOLO_SEQUENCE', 'VICTORY_DANCE'];

export const LIMITS = { skate: 0.6, pop: 30, tumble: 1.2, air: 0.12 };

export class MotionMonitor {
  // opts.slides: the whole character glides (e.g. on roller skates).
  constructor(spb = 0.5, opts = {}) { this.spb = spb; this.allSlide = !!opts.slides; this.reset(); }
  reset() {
    this.prev = null; this.prevBeat = null; this.prevState = null;
    this.events = [];        // { kind, beat, ... }
    this.contacts = [];
  }
  // Feed one frame: `a` = DanceController.out (copied), at song `beat`.
  feed(beat, a, state, move) {
    const ev = [];
    const p = this.prev, dtB = p ? beat - this.prevBeat : 0;
    if (p && dtB > 0.004 && dtB < 0.2) {
      const dt = dtB * this.spb;
      for (let s = 0; s < 2; s++) {
        const was = footPlanted(p, s), is = footPlanted(a, s);
        const f = FEET + s * FS;
        if (was && is && !this.allSlide && !slidesOnPurpose(move)) {
          const v = Math.hypot(a[f] - p[f], a[f + 2] - p[f + 2]) / dt;
          if (v > LIMITS.skate) ev.push({ kind: 'skate', beat, side: s ? 'R' : 'L', v, move, state });
        }
        if (!was && is) {
          const n8 = Math.round(beat * 2) / 2, n16 = Math.round(beat * 4) / 4;
          const c = { kind: 'contact', beat, side: s ? 'R' : 'L', offMs: (beat - n8) * this.spb * 1000, off16Ms: (beat - n16) * this.spb * 1000, move, state };
          this.contacts.push(c);
        }
      }
      let worst = 0, j = -1;
      for (let k = 0; k < ROOT; k++) { const w = Math.abs(a[k] - p[k]) / dt; if (w > worst) { worst = w; j = k; } }
      if (worst > LIMITS.pop) ev.push({ kind: 'pop', beat, w: worst, joint: j, move, state });
    }
    if (!SPECIAL_STATES.includes(state)) {
      const t = Math.max(Math.abs(a[ROOT + 4]), Math.abs(a[ROOT + 5]));
      if (t > LIMITS.tumble) ev.push({ kind: 'flip', beat, move, state });
      else if (a[ROOT + 1] > LIMITS.air) ev.push({ kind: 'air', beat, move, state });
    }
    if (this.prevState && state !== this.prevState && !canTransition(this.prevState, state)) ev.push({ kind: 'fsm', beat, from: this.prevState, to: state, move });
    if (!this.prev) this.prev = new Float32Array(a.length);
    this.prev.set(a); this.prevBeat = beat; this.prevState = state;
    for (const e of ev) this.events.push(e);
    if (this.events.length > 4000) this.events.splice(0, 1000);
    if (this.contacts.length > 4000) this.contacts.splice(0, 1000);
    return ev;
  }
}

// One-line descriptions for display.
export function describe(e) {
  switch (e.kind) {
    case 'skate': return `${e.side} foot skating ${e.v.toFixed(1)} u/s in ${e.move}`;
    case 'pop': return `pose jump ${e.w.toFixed(0)} rad/s in ${e.move}`;
    case 'flip': return `FLIP in ${e.move} (${e.state} — not a designated special)`;
    case 'air': return `airborne in ${e.move} (${e.state})`;
    case 'fsm': return `illegal transition ${e.from} → ${e.to}`;
    default: return e.kind;
  }
}
