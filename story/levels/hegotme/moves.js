// DEACON GRACE's dances — gospel and praise dance: the choir step-touch
// sway with claps on 2 and 4, praise hands rising, the gospel stomp-clap,
// the "holy ghost" shout step (rapid feet, pumping elbows, head thrown
// back), the church two-step, conducting the choir, the handkerchief wave,
// robe twirls and jumps for joy. White handkerchief in the RIGHT hand;
// moves played facing the foe (intro, taunt) are mirrored by the
// controller, so those carry it in the LEFT.

import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, clapFront, clapHigh } = kit;

const lerpA = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
// Accent envelope for a hit landing on each beat of x: a quick rise just
// before it, then a decay (continuous, no pop).
const hit = (x, k = 6) => { const f = frac(x + 0.1); return f < 0.1 ? smooth(f / 0.1) : Math.exp(-(f - 0.1) * k); };
function arm(p, side, a, b = null, t = 0) {
  const x = b == null ? a : lerpA(a, b, t);
  p.arm(side, x[0], x[1], x[2], x[3]);
}
const other = (s) => (s === 'L' ? 'R' : 'L');
const sgn = (s) => (s === 'L' ? 1 : -1);

// Arm shapes: [fwd, out, elbow, twist]
const PRAISE = [2.55, 0.8, 0.25, 0.1];           // hands up, open V, palms to heaven
const HIGH = [2.95, 0.3, 0.1, 0];
const HEART = [0.75, -0.25, 2.25, -1.15];          // hand over the heart
const OPEN = [0.95, 1.35, 0.3, 0.6];               // arms wide, receiving
const LOW = [0.15, 0.3, 0.5, -0.2];
const SWING = [0.45, 0.4, 0.9, -0.4];
const HIP = [-0.25, 0.62, 1.65, -1.45];
const PUMP = [0.55, 0.35, 1.8, -0.4];
const VEE = [2.5, 1.05, 0.06, 0];

// Choir step-touch feet: step out on the beat, touch in on the next.
const stepTouch = {
  out: (p, S) => { const g = sgn(S); p.footX(S, 0.26 * g); p.footX(other(S), -0.14 * g, 0, 0, 0.3); p.hips(0.1 * g, -0.12, 0, 0.15 * g); },
  pass: (p, S) => { const g = sgn(S); p.footX(S, 0.26 * g); p.footX(other(S), 0.04 * g, 0.12, 0.02); p.hips(0.14 * g, -0.04); },
  touch: (p, S) => { const g = sgn(S); p.footX(S, 0.26 * g); p.footX(other(S), 0.1 * g, 0.0, 0.04, 0.6); p.hips(0.2 * g, -0.15, 0, 0.1 * g); },
  back: (p, S) => { const g = sgn(S); p.footX(S, 0.2 * g); p.footX(other(S), -0.06 * g, 0.12, 0); p.hips(0.06 * g, -0.05); },
};

// Shout step: rapid alternating steps on the 8ths, knees soft.
function shoutFeet(p, b, w = 0.13, lift = 0.14, x = 0, z = 0) {
  const s = Math.sin(TAU * b);
  p.foot('L', w, lift * Math.max(0, s) ** 2, z + 0.03 * s, 0.3 * Math.max(0, s));
  p.foot('R', w, lift * Math.max(0, -s) ** 2, z - 0.03 * s, 0.3 * Math.max(0, -s));
  p.hips(x + 0.035 * s, -0.16 + 0.03 * Math.abs(s), z);
}

export const moves = {
  // ════════ Base routines ════════════════════════════════════════════
  // The choir sway: step-touch side to side, claps on the 2 and the 4,
  // body leaning into each step.
  graceChoirSway: seq(4, [0, 2].flatMap((t0) => {
    const S = t0 === 0 ? 'R' : 'L', g = sgn(S);
    return [
      [t0, (p) => { stepTouch.out(p, S); arm(p, 'L', SWING); arm(p, 'R', SWING); p.lean(0.04, -0.02, 0.1 * g, -0.08 * g); p.look(-0.05, 0.2 * g, -0.06 * g); }],
      [t0 + 0.5, (p) => { stepTouch.pass(p, S); clapFront(p, 0.5); p.lean(0.02, -0.04); }],
      [t0 + 1, (p) => { stepTouch.touch(p, S); clapFront(p, 0.0); p.lean(0.02, -0.08, 0.15 * g, -0.12 * g); p.look(-0.12, 0.25 * g, -0.1 * g); }],
      [t0 + 1.5, (p) => { stepTouch.back(p, S); arm(p, 'L', [0.55, 0.45, 1.0, -0.4]); arm(p, 'R', [0.55, 0.45, 1.0, -0.4]); }],
    ];
  }), { groove: 0.8, hits: 0.8 }),

  // Step-touch with the hands rising into praise on the 2 and 4, then
  // floating back down.
  graceRaiseHands: seq(4, [0, 2].flatMap((t0) => {
    const S = t0 === 0 ? 'R' : 'L', g = sgn(S);
    return [
      [t0, (p) => { stepTouch.out(p, S); arm(p, 'L', [0.7, 0.6, 0.8, 0.2]); arm(p, 'R', [0.7, 0.6, 0.8, 0.2]); p.lean(0.05, 0, 0.1 * g); p.look(0, 0.15 * g); }],
      [t0 + 1, (p) => { stepTouch.touch(p, S); arm(p, S, PRAISE); arm(p, other(S), [2.2, 0.9, 0.4, 0.1]); p.lean(-0.05, -0.15, 0.1 * g, -0.1 * g); p.look(-0.3, 0.2 * g, -0.08 * g); }],
      [t0 + 1.5, (p) => { stepTouch.back(p, S); arm(p, 'L', [1.6, 0.8, 0.5, 0.1]); arm(p, 'R', [1.6, 0.8, 0.5, 0.1]); p.look(-0.15); }],
    ];
  }), { groove: 0.8, hits: 0.6 }),

  // Gospel stomp-clap: stomp, stomp, clap-clap, clap — knees dropping
  // into each stomp, chest popping on the claps.
  graceGospelStomp: seq(4, [
    [0, (p) => { p.foot('R', 0.16); p.foot('L', 0.16, 0.0, 0.02); p.hips(-0.05, -0.24, 0, -0.15); arm(p, 'L', [0.3, 0.55, 1.6, -0.5]); arm(p, 'R', [0.3, 0.55, 1.6, -0.5]); p.lean(0.18, 0.12, -0.1); p.look(0.15, -0.15); }],
    [0.5, (p) => { p.foot('R', 0.16); p.foot('L', 0.16, 0.16, 0.04); p.hips(-0.06, -0.08); arm(p, 'L', SWING); arm(p, 'R', SWING); p.lean(0.05); }],
    [1, (p) => { p.foot('L', 0.16); p.foot('R', 0.16, 0, 0.02); p.hips(0.05, -0.24, 0, 0.15); arm(p, 'L', [0.3, 0.55, 1.6, -0.5]); arm(p, 'R', [0.3, 0.55, 1.6, -0.5]); p.lean(0.18, 0.12, 0.1); p.look(0.15, 0.15); }],
    [1.5, (p) => { p.foot('L', 0.16); p.foot('R', 0.16); p.hips(0, -0.1); clapFront(p, 0.5); p.lean(0.02, -0.05); }],
    [2, (p) => { p.foot('L', 0.16); p.foot('R', 0.16); p.hips(0, -0.14); clapFront(p, 0.0); p.lean(-0.04, -0.15); p.look(-0.15); }],
    [2.5, (p) => { p.foot('L', 0.16); p.foot('R', 0.16); p.hips(0, -0.1); clapFront(p, 0.0); p.lean(-0.02, -0.12); p.look(-0.1); }],
    [3, (p) => { p.foot('L', 0.16); p.foot('R', 0.16, 0, 0, 0.4); p.hips(0.03, -0.16); clapHigh(p, 0); p.lean(-0.08, -0.2); p.look(-0.3); }],
    [3.5, (p) => { p.foot('L', 0.16); p.foot('R', 0.16, 0.12, 0.02); p.hips(0.06, -0.08); arm(p, 'L', [1.4, 0.8, 0.6, -0.2]); arm(p, 'R', [1.4, 0.8, 0.6, -0.2]); }],
  ], { groove: 0.7, hits: 1.0 }),

  // The shout: rapid feet on the 8ths, elbows pumping, head tossing back.
  graceShoutStep(p, b, B, s) {
    groove(p, B, s, 0.5);
    shoutFeet(p, b);
    const pump = Math.sin(TAU * b);
    arm(p, 'L', [0.55 + 0.35 * pump, 0.35, 1.8, -0.4]); arm(p, 'R', [0.55 - 0.35 * pump, 0.35, 1.8, -0.4]);
    p.lean(0.18, 0.05, 0.1 * pump); p.look(-0.1 - 0.15 * (0.5 + 0.5 * Math.cos(Math.PI * b)), 0.15 * Math.sin(Math.PI * b / 2));
  },

  // Phrase accent (count 3): one hand high to heaven, the other on her
  // heart, head back — joy.
  graceAccent(p, b, B, s) {
    groove(p, B, s, 0.5);
    p.foot('L', 0.15); p.foot('R', 0.15, 0, 0.04, 0.3);
    p.hips(0.03, -0.1, 0, 0.12);
    arm(p, 'L', HIGH); arm(p, 'R', HEART);
    p.lean(-0.06, -0.18); p.look(-0.32, 0.15, -0.08);
  },

  // ════════ Tier 1 ═══════════════════════════════════════════════════
  // Praise hands: both arms up, waving side to side like a congregation,
  // stepping underneath.
  gracePraiseHands(p, b, B, s) {
    groove(p, B, s, 0.8);
    const w = Math.sin(Math.PI * b / 2), sw = Math.sin(Math.PI * b);
    const tap = Math.sin(Math.PI * frac(b)) ** 2;
    p.footX('L', 0.17, 0.07 * tap * smooth(-2 * sw), 0, 0.3 * (1 - sw));
    p.footX('R', -0.17, 0.07 * tap * smooth(2 * sw), 0, 0.3 * (1 + sw));
    p.hips(0.07 * sw, -0.12, 0, 0.12 * sw);
    arm(p, 'L', [2.6, 0.75 + 0.35 * w, 0.25, 0.1]); arm(p, 'R', [2.6, 0.75 - 0.35 * w, 0.25, 0.1]);
    p.wrist('L', 0.3 * w); p.wrist('R', -0.3 * w);
    p.lean(-0.06, -0.15, 0, -0.12 * w); p.look(-0.3, 0.1 * w, -0.1 * w);
  },

  // Choir clap: clap high, clap low, clap high to the side, arms flung open.
  graceChoirClap: seq(4, [
    [0, (p) => { p.foot('L', 0.16); p.foot('R', 0.16); p.hips(0, -0.08); clapHigh(p, 0); p.lean(-0.06, -0.15); p.look(-0.3); }],
    [0.5, (p) => { p.foot('L', 0.16); p.foot('R', 0.16); p.hips(0, -0.16); arm(p, 'L', [1.5, 0.7, 0.5, 0]); arm(p, 'R', [1.5, 0.7, 0.5, 0]); }],
    [1, (p) => { p.foot('L', 0.18); p.foot('R', 0.18); p.hips(0, -0.3); arm(p, 'L', [0.45, -0.3, 0.3, -0.6]); arm(p, 'R', [0.45, -0.3, 0.3, -0.6]); p.lean(0.3, 0.12); p.look(0.2); }],
    [1.5, (p) => { p.foot('L', 0.18); p.foot('R', 0.18); p.hips(0, -0.18); arm(p, 'L', [1.2, 0.9, 0.5, 0]); arm(p, 'R', [1.2, 0.9, 0.5, 0]); p.lean(0.1); }],
    [2, (p) => { p.foot('L', 0.16, 0, 0, 0.4); p.foot('R', 0.16); p.hips(-0.06, -0.1, 0, -0.25); arm(p, 'L', [2.6, -0.45, 0.2, 0]); arm(p, 'R', [2.4, 0.1, 0.4, -0.3]); p.lean(-0.04, -0.15, -0.15, 0.1); p.look(-0.3, -0.3); }],
    [2.5, (p) => { p.foot('L', 0.16); p.foot('R', 0.16); p.hips(0, -0.12); arm(p, 'L', [1.6, 0.8, 0.5, 0]); arm(p, 'R', [1.6, 0.8, 0.5, 0]); }],
    [3, (p) => { p.foot('L', 0.2); p.foot('R', 0.2, 0, 0.04, 0.3); p.hips(0, -0.16); arm(p, 'L', OPEN); arm(p, 'R', OPEN); p.lean(-0.08, -0.2); p.look(-0.25); }],
  ], { groove: 0.7, hits: 0.8 }),

  // ════════ Tier 2 ═══════════════════════════════════════════════════
  // Hanky wave: the white handkerchief circling overhead, kick-steps
  // underneath, the other hand on her hip.
  graceHankyWave(p, b, B, s) {
    groove(p, B, s, 0.7);
    const a = TAU * b, kick = Math.max(0, Math.sin(Math.PI * b)) ** 2, kick2 = Math.max(0, -Math.sin(Math.PI * b)) ** 2;
    p.foot('L', 0.14, 0.18 * kick, 0.22 * kick, 0.5 * kick);
    p.foot('R', 0.14, 0.18 * kick2, 0.22 * kick2, 0.5 * kick2);
    p.hips(0.05 * (kick2 - kick), -0.12, 0, 0.15 * (kick2 - kick));
    arm(p, 'R', [2.55 + 0.25 * Math.sin(a), 0.6 + 0.4 * Math.cos(a), 0.45, 0.2]);
    p.wrist('R', 0.5 * Math.sin(a + 1));
    arm(p, 'L', HIP);
    p.lean(-0.04, -0.12, 0.1 * Math.sin(a)); p.look(-0.25, 0.25 * Math.sin(Math.PI * b), 0);
  },

  // Church two-step: step-together-step, sliding side to side, both arms
  // swinging out toward the way she travels.
  graceTwoStep: seq(4, [0, 2].flatMap((t0) => {
    const S = t0 === 0 ? 'L' : 'R', O = other(S), g = sgn(S);
    return [
      [t0, (p) => { p.footX(S, 0.32 * g); p.footX(O, 0.0, 0, 0, 0.4); p.hips(0.16 * g, -0.16, 0, 0.2 * g); arm(p, S, [0.7, 1.25, 0.35, 0.2]); arm(p, O, [0.9, -0.2, 1.0, -0.8]); p.lean(0.06, -0.05, 0.15 * g, -0.1 * g); p.look(-0.1, 0.35 * g); }],
      [t0 + 0.5, (p) => { p.footX(S, 0.32 * g); p.footX(O, 0.2 * g, 0.12, 0); p.hips(0.24 * g, -0.06); arm(p, S, [0.5, 0.9, 0.6, 0]); arm(p, O, [0.6, 0.3, 1.0, -0.4]); }],
      [t0 + 1, (p) => { p.footX(S, 0.32 * g); p.footX(O, 0.18 * g); p.hips(0.25 * g, -0.18, 0, 0.1 * g); arm(p, S, [1.0, 1.4, 0.2, 0.3]); arm(p, O, [1.2, -0.3, 0.9, -0.8]); p.lean(0.02, -0.12, 0.2 * g, -0.12 * g); p.look(-0.2, 0.4 * g, -0.1 * g); }],
      [t0 + 1.5, (p) => { p.footX(S, 0.2 * g, 0.12, 0); p.footX(O, 0.18 * g); p.hips(0.12 * g, -0.06); arm(p, 'L', [0.6, 0.5, 0.9, -0.3]); arm(p, 'R', [0.6, 0.5, 0.9, -0.3]); }],
    ];
  }), { groove: 0.7, hits: 0.8 }),

  // ════════ Tier 3 ═══════════════════════════════════════════════════
  // Holy ghost shout: the feet go off like a drum roll as she turns a
  // full circle, elbows pumping, handkerchief flying, head thrown back.
  graceHolyShout(p, b, B, s) {
    groove(p, B, s, 0.4);
    const turn = smooth(b / 3.6);
    shoutFeet(p, b * 2, 0.12, 0.12);
    p.root(0, 0, 0, TAU * turn);
    const pump = Math.sin(TAU * b * 2);
    arm(p, 'L', [0.55 + 0.4 * pump, 0.35, 1.8, -0.4]);
    arm(p, 'R', [2.5 + 0.3 * Math.sin(TAU * b), 0.6 + 0.3 * Math.cos(TAU * b), 0.5, 0.1]);
    p.wrist('R', 0.5 * Math.sin(TAU * b * 2));
    p.lean(0.12, -0.1, 0.12 * pump); p.look(-0.35, 0.15 * Math.sin(TAU * b));
  },

  // Directing the choir: gather them low, cue the sopranos, sweep both
  // arms up — "lift it up!" — and the cut-off, fists held high.
  graceDirect: seq(4, [
    [0, (p) => { p.foot('L', 0.18); p.foot('R', 0.18); p.hips(0, -0.26); arm(p, 'L', [0.6, 0.5, 0.9, -0.6]); arm(p, 'R', [0.6, 0.5, 0.9, -0.6]); p.lean(0.25, 0.1); p.look(0.15); }],
    [1, (p) => { p.foot('L', 0.16); p.foot('R', 0.18, 0, 0.05, 0.4); p.hips(-0.04, -0.1, 0, -0.3); arm(p, 'R', [1.9, 1.05, 0.15, 0]); arm(p, 'L', [0.9, 0.2, 1.6, -0.8]); p.lean(0, -0.1, -0.15); p.look(-0.2, -0.35); }],
    [2, (p) => { p.foot('L', 0.18); p.foot('R', 0.18); p.hips(0, -0.12); arm(p, 'L', [1.9, 0.9, 0.4, 0.2]); arm(p, 'R', [1.9, 0.9, 0.4, 0.2]); p.lean(-0.08, -0.15); p.look(-0.25); }],
    [2.5, (p) => { p.foot('L', 0.18, 0, 0, 0.5); p.foot('R', 0.18, 0, 0, 0.5); p.hips(0, 0.0); arm(p, 'L', PRAISE); arm(p, 'R', PRAISE); p.lean(-0.1, -0.2); p.look(-0.35); }],
    [3, (p) => { p.foot('L', 0.2); p.foot('R', 0.2); p.hips(0, -0.14); arm(p, 'L', [2.7, 0.5, 1.6, -0.4]); arm(p, 'R', [2.7, 0.5, 1.6, -0.4]); p.lean(-0.1, -0.2); p.look(-0.3); }],
  ], { groove: 0.6, hits: 0.6 }),

  // ════════ Tier 4 ═══════════════════════════════════════════════════
  // Robe twirl: two turns with the arms flung wide, ending in a
  // "hallelujah" V.
  graceRobeTwirl(p, b, B, s) {
    phased(p, b, B, s, [
      [0.6, (p, b, B, s) => { groove(p, B, s, 0.4); const k = smooth(b / 0.5); p.foot('L', 0.06); p.foot('R', 0.16, 0, -0.1 * k, 0.4 * k); p.hips(0, -0.1 - 0.08 * k, 0, 0.3 * k); arm(p, 'L', LOW, [0.8, 1.0, 0.8, -0.3], k); arm(p, 'R', LOW, [0.8, 1.0, 0.8, -0.3], k); }],
      [2.8, (p, b) => { const t = smooth((b - 0.6) / 2.2), r = Math.sin(TAU * (b - 0.6) * 2); p.foot('L', 0.04, 0.03 * (0.5 + 0.5 * r), 0, 0.6); p.foot('R', 0.08, 0.03 * (0.5 - 0.5 * r), 0, 0.6); p.hips(0, -0.02); p.root(0, 0, 0, 0.3 - TAU * 2 * t); arm(p, 'L', OPEN); arm(p, 'R', OPEN); p.lean(0, -0.12); p.look(-0.25); }],
      [Infinity, (p, b, B, s) => { groove(p, B, s, 0.5); const k = smooth((b - 2.8) / 0.4); p.foot('L', 0.2); p.foot('R', 0.2, 0, 0.04, 0.3 * k); p.hips(0, -0.14); arm(p, 'L', OPEN, VEE, k); arm(p, 'R', OPEN, VEE, k); p.lean(-0.06, -0.2 * k); p.look(-0.35 * k); }],
    ], 0.25);
  },

  // Jump for joy: crouch, leap with both arms up, land; again higher with
  // the heels kicked back; stomp on 4 with the arms in a V.
  graceJumpForJoy(p, b, B, s) {
    const jump = (t0, h) => Math.sin(Math.PI * clamp01((b - t0) / 1.0)) * h;
    const a1 = jump(0.3, 0.3), a2 = jump(1.95, 0.4), air = a1 + a2;
    const crouch = win(b, -0.3, 0.5, 0.35) + win(b, 1.3, 2.15, 0.4) + win(b, 2.8, 3.7, 0.4) * 0.7;
    const kick = a2 / 0.4;
    p.foot('L', 0.15, 0.6 * air, -0.2 * kick, 0.7 * Math.min(1, air * 3));
    p.foot('R', 0.15, 0.6 * air, -0.2 * kick, 0.7 * Math.min(1, air * 3));
    p.hips(0, -0.06 - 0.24 * crouch + air, 0);
    const up = Math.min(1, win(b, -0.15, 1.5, 0.6) + win(b, 1.5, 5, 0.6));
    arm(p, 'L', [0.3, 0.4, 0.5, 0], VEE, up); arm(p, 'R', [0.3, 0.4, 0.5, 0], VEE, up);
    p.lean(0.2 * crouch * (1 - up) - 0.1 * up, -0.15 * up); p.look(-0.35 * up);
  },

  // ════════ ★ Signature moves ════════════════════════════════════════
  // Hallelujah: four hits — arms up wide with a knee bend, hands to the
  // heart, arms flung open, up on her toes with everything to the sky.
  graceHallelujah: seq(4, [
    [0, (p) => { p.foot('L', 0.24); p.foot('R', 0.24); p.hips(0, -0.28); arm(p, 'L', VEE); arm(p, 'R', VEE); p.lean(-0.05, -0.18); p.look(-0.3); }],
    [1, (p) => { p.foot('L', 0.18); p.foot('R', 0.18, 0, 0.04, 0.3); p.hips(0, -0.14); arm(p, 'L', HEART); arm(p, 'R', [0.8, -0.2, 2.1, -1.1]); p.lean(0.12, 0.08); p.look(0.15); }],
    [2, (p) => { p.foot('L', 0.22); p.foot('R', 0.22); p.hips(0, -0.2); arm(p, 'L', OPEN); arm(p, 'R', OPEN); p.lean(-0.05, -0.15); p.look(-0.15); }],
    [3, (p) => { p.foot('L', 0.15, 0, 0, 0.9); p.foot('R', 0.15, 0, 0, 0.9); p.hips(0, 0.03); arm(p, 'L', HIGH); arm(p, 'R', HIGH); p.lean(-0.12, -0.25); p.look(-0.45); }],
  ], { groove: 0.5, hits: 0.7 }),

  // Glory stomp: three stomps with a fist pumped down on each, then a body
  // roll up and the arms rising on 4.
  graceGloryStomp(p, b, B, s) {
    groove(p, B, s, 0.5);
    const bar = ((b % 4) + 4) % 4, roll = win(bar, 2.75, 4.0, 0.4);
    const st = hit(b, 6) * (1 - roll), side = Math.floor(bar + 0.1) % 2 ? -1 : 1;
    const liftS = Math.sin(Math.PI * clamp01((frac(b) - 0.55) / 0.45)) * (1 - roll);
    const nextSide = Math.floor(bar + 1) % 2 ? -1 : 1;
    p.foot('L', 0.18, 0.14 * liftS * (nextSide > 0 ? 1 : 0.15), 0.02); p.foot('R', 0.18, 0.14 * liftS * (nextSide < 0 ? 1 : 0.15), 0.02);
    p.hips(0.04 * side * (1 - roll), -0.2 - 0.12 * st + 0.12 * roll, 0, 0.15 * side * (1 - roll));
    arm(p, 'L', PUMP, [0.15, 0.4, 1.9, -0.4], st * (side > 0 ? 1 : 0.3)); arm(p, 'R', PUMP, [0.15, 0.4, 1.9, -0.4], st * (side < 0 ? 1 : 0.3));
    if (roll > 0) { const u = smooth((bar - 2.75) / 1.2); arm(p, 'L', PUMP, PRAISE, roll * u); arm(p, 'R', PUMP, PRAISE, roll * u); }
    const w = Math.sin(TAU * (bar - 2.75) / 1.2) * roll;
    p.lean(0.2 * st + 0.15 * w, 0.1 * st + 0.25 * w - 0.15 * roll); p.look(0.2 * st - 0.3 * roll);
  },

  // Rejoice (the encore): shout steps in a circle, a spin, both arms up.
  graceRejoice(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b) => { shoutFeet(p, b * 2, 0.12, 0.12); p.root(0, 0, 0, Math.PI * smooth(b / 2)); const pump = Math.sin(TAU * b * 2); arm(p, 'L', [0.55 + 0.4 * pump, 0.35, 1.8, -0.4]); arm(p, 'R', [0.55 - 0.4 * pump, 0.35, 1.8, -0.4]); p.lean(0.15, 0.05); p.look(-0.3); }],
      [3, (p, b) => { const t = smooth(b - 2); p.foot('L', 0.04, 0, 0, 0.6); p.foot('R', 0.08, 0.1 * Math.sin(Math.PI * t), 0, 0.6); p.hips(0, -0.04); p.root(0, 0, 0, Math.PI + Math.PI * t); arm(p, 'L', OPEN); arm(p, 'R', OPEN); p.look(-0.3); }],
      [Infinity, (p, b, B, s) => { groove(p, B, s, 0.5); const k = smooth((b - 2.9) / 0.7); p.foot('L', 0.2); p.foot('R', 0.2); p.hips(0, -0.14); arm(p, 'L', OPEN, HIGH, k); arm(p, 'R', OPEN, HIGH, k); p.wrist('R', 0.4 * Math.sin(TAU * b * 2) * k); p.lean(-0.1 * k, -0.22 * k); p.look(-0.45 * k); }],
    ], 0.25);
  },

  // ★★ SOLO — Anointed: the shout with her head thrown back and the hanky
  // flying, a twirl, and a leap into a wide-legged landing, arms to heaven.
  graceAnointed(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b) => { shoutFeet(p, b * 2, 0.12, 0.13); const pump = Math.sin(TAU * b * 2); arm(p, 'L', [0.6 + 0.4 * pump, 0.4, 1.7, -0.4]); arm(p, 'R', [2.55 + 0.3 * Math.sin(TAU * b * 2), 0.6 + 0.3 * Math.cos(TAU * b * 2), 0.4, 0.1]); p.wrist('R', 0.4 * Math.sin(TAU * b * 2)); p.lean(0.05, -0.15, 0.1 * pump); p.look(-0.45, 0.2 * Math.sin(TAU * b)); }],
      [2.75, (p, b) => { const t = smooth((b - 1.5) / 1.25); p.foot('L', 0.04, 0, 0, 0.6); p.foot('R', 0.08, 0.12 * Math.sin(Math.PI * t), 0.04, 0.6); p.hips(0, -0.02); p.root(0, 0, 0, -TAU * 2 * t); arm(p, 'L', OPEN); arm(p, 'R', OPEN); p.lean(0, -0.15); p.look(-0.3); }],
      [Infinity, (p, b, B) => {
        const t = (b - 2.75), air = Math.sin(Math.PI * clamp01(t / 0.7)), land = smooth((t - 0.55) / 0.4);
        p.foot('L', 0.06 + 0.2 * land, 0.3 * air, 0, 0.5 * air); p.foot('R', 0.06 + 0.2 * land, 0.3 * air, 0, 0.5 * air);
        p.hips(0, -0.04 + 0.36 * air - 0.2 * land * (1 - smooth((t - 0.8) / 0.4)) - 0.06 * land, 0);
        arm(p, 'L', OPEN, HIGH, smooth((t + 0.15) / 0.7)); arm(p, 'R', OPEN, HIGH, smooth((t + 0.15) / 0.7));
        p.lean(-0.1, -0.25); p.look(-0.5);
        p.root(0.004 * Math.sin(B * 40) * land, 0, 0);
      }],
    ], 0.25);
  },

  // ════════ Battle actions ═══════════════════════════════════════════
  // Intro (faceFoe, mirrored — hanky in the LEFT): points up to heaven,
  // then a kindly finger wag at you ("mm-mm, child"), the handkerchief
  // circling overhead, two claps and a hand on her hip.
  graceIntro(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => { groove(p, B, s, 0.4); const k = smooth(b / 0.8); p.foot('L', 0.15); p.foot('R', 0.15, 0, 0.04, 0.3); p.hips(0, -0.1, 0, 0.3 * k); arm(p, 'R', LOW, HIGH, k); arm(p, 'L', LOW, HEART, k); p.look(-0.35 * k, 0.1); p.lean(-0.04, -0.12 * k); }],
      [2, (p, b, B, s) => { groove(p, B, s, 0.4); const k = smooth((b - 0.8) / 0.9), wag = Math.sin(TAU * b * 3); p.foot('L', 0.14, 0, 0.1); p.foot('R', 0.16, 0, -0.06, 0.4); p.hips(0, -0.1, 0, 0.55); arm(p, 'L', HEART, [1.2, 0.55, 1.6, -0.3 + 0.5 * wag], k); arm(p, 'R', HIGH, HIP, k); p.look(0.05, 0.3, 0.1 * wag); p.lean(-0.04, -0.1); }],
      [3, (p, b, B, s) => { groove(p, B, s, 0.6); const a = TAU * (b - 2); p.foot('L', 0.15); p.foot('R', 0.15); p.hips(0.03 * Math.sin(a), -0.12, 0, 0.3); arm(p, 'L', [2.55 + 0.25 * Math.sin(a), 0.6 + 0.4 * Math.cos(a), 0.45, 0.2]); arm(p, 'R', HIP); p.look(-0.25, 0.2); }],
      [Infinity, (p, b, B, s) => { groove(p, B, s, 0.5); const c = hit(b * 2, 7), k = smooth((b - 3.5) / 0.3); p.foot('L', 0.15); p.foot('R', 0.17, 0, 0.04, 0.3); p.hips(0.03, -0.12, 0, 0.4); clapFront(p, 0.4 * (1 - c)); if (k > 0) { arm(p, 'R', [1.05, -0.32, 0.75, 0], HIP, k); arm(p, 'L', [1.05, -0.32, 0.75, 0], [0.2, 0.5, 0.4, 0], k); } p.lean(-0.02, -0.12); p.look(-0.1, 0.3, 0.12 * k); }],
    ], 0.25);
  },

  // Taunt (faceFoe): gathers her hands at her chest, then throws both
  // palms at you and a blinding hallelujah light pours out — she leans
  // into it, trembling — and flings her arms to heaven.
  graceTaunt(p, b, B, s) {
    groove(p, B, s, 0.3);
    const g = smooth(b / 0.5), push = smooth((b - 0.75) / 0.45), up = smooth((b - 3.0) / 0.5);
    p.foot('L', 0.14, 0, 0.2 * push); p.foot('R', 0.16, 0, -0.12 * push, 0.4 * push);
    p.hips(0, -0.12 - 0.04 * push, 0.05 * push, 0.6 * Math.max(g, push) * (1 - 0.5 * up));
    const SHOVE = [1.55, 0.25, 0.15, 0.4];
    arm(p, 'L', LOW, [0.9, -0.3, 2.0, -1.1], g); arm(p, 'R', LOW, [0.9, -0.3, 2.0, -1.1], g);
    if (push > 0) { arm(p, 'L', [0.9, -0.3, 2.0, -1.1], SHOVE, push); arm(p, 'R', [0.9, -0.3, 2.0, -1.1], SHOVE, push); p.wrist('L', -0.6 * push); p.wrist('R', -0.6 * push); }
    if (up > 0) { arm(p, 'L', SHOVE, VEE, up); arm(p, 'R', SHOVE, VEE, up); }
    p.lean(-0.1 * g * (1 - push) + 0.18 * push * (1 - up) - 0.1 * up, -0.05 * g + 0.05 * push - 0.2 * up);
    p.look(0.05 * push - 0.4 * up, 0.1 * push);
    p.root(0.008 * Math.sin(B * 40) * push * (1 - up), 0, 0);
  },

  // Victory: jumping for joy and clapping, then the hanky wave and a
  // church two-step.
  graceVictory(p, b, B, s) {
    phased(p, b, B, s, [
      [4, (p, b) => {
        const hop = Math.sin(Math.PI * clamp01(frac(b) * 1.4)) * (Math.floor(b) % 2 ? 0.6 : 1);
        p.foot('L', 0.15, 0.22 * hop, 0, 0.5 * hop); p.foot('R', 0.15, 0.22 * hop, 0, 0.5 * hop);
        p.hips(0, -0.12 + 0.3 * hop);
        const c = 0.5 + 0.5 * Math.cos(Math.PI * b);
        arm(p, 'L', VEE, [2.85, -0.12, 0.15, 0], c); arm(p, 'R', VEE, [2.85, -0.12, 0.15, 0], c);
        p.lean(-0.06, -0.15); p.look(-0.35);
      }],
      [Infinity, (p, b, B, s) => { moves.graceHankyWave(p, b - 4, B, s); }],
    ], 0.3);
  },
};

export const moveMeta = {
  labels: {
    gracePraiseHands: 'PRAISE HANDS', graceChoirClap: 'CHOIR CLAP',
    graceHankyWave: 'HANKY WAVE', graceTwoStep: 'CHURCH TWO-STEP',
    graceHolyShout: 'HOLY GHOST SHOUT', graceDirect: 'LIFT IT UP!',
    graceRobeTwirl: 'ROBE TWIRL', graceJumpForJoy: 'JUMP FOR JOY',
    graceHallelujah: 'HALLELUJAH!', graceGloryStomp: 'GLORY STOMP', graceRejoice: 'REJOICE',
    graceAnointed: 'ANOINTED', graceTaunt: 'HALLELUJAH LIGHT!', graceVictory: 'GLORY!',
  },
  expressions: {
    graceChoirSway: 'smile', graceRaiseHands: 'joy', graceGospelStomp: 'grin', graceShoutStep: 'joy', graceAccent: 'joy',
    gracePraiseHands: 'joy', graceChoirClap: 'grin', graceHankyWave: 'joy', graceTwoStep: 'smile',
    graceHolyShout: 'shout', graceDirect: 'focus', graceRobeTwirl: 'joy', graceJumpForJoy: 'shout',
    graceHallelujah: 'shout', graceGloryStomp: 'focus', graceRejoice: 'joy', graceAnointed: 'shout',
    graceIntro: 'smirk', graceTaunt: 'shout', graceVictory: 'joy',
  },
  hits: {
    graceShoutStep: 0.6, graceAccent: 0.4, gracePraiseHands: 0.6, graceHankyWave: 0.7, graceHolyShout: 0.4,
    graceRobeTwirl: 0.1, graceJumpForJoy: 0.1, graceGloryStomp: 1.0, graceRejoice: 0.3, graceAnointed: 0.1,
    graceIntro: 0.5, graceTaunt: 0.3, graceVictory: 0.4,
  },
  fnGroove: { graceRobeTwirl: 0, graceJumpForJoy: 0, graceRejoice: 0, graceAnointed: 0, graceVictory: 0.2 },
  stiff: { graceHallelujah: 1.3, graceGospelStomp: 1.2 },
};

export default { moves, moveMeta };
