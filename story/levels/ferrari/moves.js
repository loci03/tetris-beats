// RHETT RYDER's moves — country line dancing, rodeo tricks and a lariat.
//
// The song pulses at ~144 BPM on a 72 BPM half-time grid (bounce 2), so
// one beat here = two line-dance counts: footwork keys sit on every half
// beat (each count), the big hits on the beat. Authored with the opponent
// on the dancer's left (+x). lassoArm() raises the right hand over the hat
// and flags it (wrist roll) so the lariat appears there (boss.js); the
// fiddle and bow come out when a move twists both hands (rhettAirFiddle).

import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, clamp01, TAU, phased, hipHand, clapFront } = kit;

// ── Little helpers ─────────────────────────────────────────────────
// Mirror a side for the second half of a phrase (s = +1 as written, -1 mirrored).
const S = (s, side) => (s > 0 ? side : side === 'L' ? 'R' : 'L');
// Thumbs hooked in the front belt loops: elbows out, hands by the buckle.
const belt = (p, side) => p.arm(side, 0.12, 0.48, 1.3, -1.2);
const belts = (p) => { belt(p, 'L'); belt(p, 'R'); };
// Right hand up to the hat brim (k = 0 → down at the side, 1 → at the brim).
const hatTip = (p, k = 1) => p.arm('R', lerp(0.25, 2.5, k), lerp(0.3, 0.32, k), lerp(0.5, 2.3, k), -0.35 * k);
// Right hand over the hat, circling the lariat (a = angle of the circle);
// the wrist-roll flag tells boss.js to show the loop in this hand.
const lassoArm = (p, a, k = 1) => { p.arm('R', lerp(0.4, 2.95 + 0.12 * Math.sin(a), k), lerp(0.3, 0.42 + 0.14 * Math.cos(a), k), lerp(0.6, 0.3 + 0.12 * Math.sin(a + 1), k), 0); p.set('handR', 0, 0, -0.9 * k); };
// Left hand up waving ("yeehaw!").
const yeehaw = (p, w = 0) => p.arm('L', 0.35 + 0.1 * w, 2.7 + 0.22 * w, 0.35 + 0.2 * w);
// Feet / hips placed in WORLD coordinates for a body turned by `yaw`, so a
// planted foot stays put while the body pivots over it.
function turned(p, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return {
    foot(side, x, z, lift = 0, pitch = 0) { p.footX(side, x * c - z * s, lift, x * s + z * c, pitch); },
    hips(x, y, z, twist = 0) { p.hips(x * c - z * s, y, x * s + z * c, twist); p.root(0, 0, 0, yaw); },
  };
}

// ── Base routines ──────────────────────────────────────────────────
// Jazz box, thumbs in the belt loops: cross, back, side, forward — once
// leading with the right foot, once mirrored.
const jazzHalf = (s, t0) => [
  [t0, (p) => { p.footX(S(s, 'L'), 0.13 * s); p.footX(S(s, 'R'), 0.05 * s, 0, 0.13); p.hips(0.05 * s, -0.08, 0.05, 0.25 * s); belts(p); p.lean(0.02, -0.04, -0.14 * s); p.look(-0.06, 0.22 * s, 0.07 * s); }, 'in'],
  [t0 + 0.5, (p) => { p.footX(S(s, 'L'), 0.17 * s, 0, -0.13); p.footX(S(s, 'R'), 0.05 * s, 0, 0.13); p.hips(0.08 * s, -0.05, -0.04, 0.12 * s); belts(p); p.lean(0, -0.02, -0.05 * s); p.look(-0.03, 0.12 * s); }],
  [t0 + 1, (p) => { p.footX(S(s, 'L'), 0.17 * s, 0, -0.13); p.footX(S(s, 'R'), -0.15 * s, 0, -0.02); p.hips(-0.06 * s, -0.1, -0.02, -0.1 * s); belts(p); p.shrug(0.06, 0); p.lean(0.03, -0.03, 0.05 * s); p.look(-0.05, -0.12 * s, -0.05 * s); }, 'in'],
  [t0 + 1.5, (p) => { p.footX(S(s, 'L'), 0.11 * s, 0, 0.03); p.footX(S(s, 'R'), -0.15 * s, 0, -0.02); p.hips(0, -0.05, 0.01, 0); belts(p); p.lean(0.02, -0.03); p.look(-0.05, 0); }],
];

// Heel, toe, heel, together — then the other boot. Thumbs in the belt,
// shoulders shimmying, checking out his own boots.
const heelToeHalf = (s, t0) => [
  [t0, (p) => { p.footX(S(s, 'R'), -0.24 * s, 0.02, 0.19, -0.6); p.footX(S(s, 'L'), 0.13 * s); p.hips(0.05 * s, -0.07, -0.01, -0.1 * s); belts(p); p.shrug(0.1 * (s > 0 ? 1 : 0), 0.1 * (s > 0 ? 0 : 1)); p.lean(-0.04, -0.06, -0.12 * s); p.look(0.14, -0.25 * s, -0.05 * s); }],
  [t0 + 0.5, (p) => { p.footX(S(s, 'R'), -0.09 * s, 0, -0.07, 0.6); p.footX(S(s, 'L'), 0.13 * s); p.hips(0.05 * s, -0.11, 0, 0.06 * s); belts(p); p.lean(0.05, 0.04, 0.06 * s); p.look(0.02, -0.05 * s); }],
  [t0 + 1, (p) => { p.footX(S(s, 'R'), -0.24 * s, 0.02, 0.19, -0.6); p.footX(S(s, 'L'), 0.13 * s); p.hips(0.05 * s, -0.07, -0.01, -0.12 * s); belts(p); p.shrug(0.12 * (s > 0 ? 0 : 1), 0.12 * (s > 0 ? 1 : 0)); p.lean(-0.04, -0.07, -0.14 * s); p.look(0.12, -0.28 * s, -0.06 * s); }],
  [t0 + 1.5, (p) => { p.footX(S(s, 'R'), -0.13 * s); p.footX(S(s, 'L'), 0.13 * s); p.hips(-0.03 * s, -0.08); belts(p); p.lean(0.03, 0); p.look(-0.06, 0); }],
];

// Grapevine: side, behind, side, touch-and-clap — right, then left.
const vineHalf = (s, t0) => [
  [t0, (p) => { p.footX(S(s, 'L'), 0.42 * s); p.footX(S(s, 'R'), -0.02 * s); p.hips(0.1 * s, -0.1, 0, -0.12 * s); p.arm(S(s, 'L'), -0.35, 0.4, 0.6); p.arm(S(s, 'R'), 0.55, 0.45, 1.1); p.lean(0.03, 0.02, 0.1 * s, -0.05 * s); p.look(-0.04, -0.3 * s); }, 'in'],
  [t0 + 0.5, (p) => { p.footX(S(s, 'L'), -0.14 * s, 0, -0.1); p.footX(S(s, 'R'), -0.02 * s); p.hips(-0.07 * s, -0.05, -0.02, 0.12 * s); p.arms(0.3, 0.65, 0.9); p.lean(0.02, 0, -0.08 * s); p.look(-0.02, -0.25 * s); }],
  [t0 + 1, (p) => { p.footX(S(s, 'L'), -0.14 * s, 0, -0.1); p.footX(S(s, 'R'), -0.42 * s); p.hips(-0.27 * s, -0.11, -0.01, -0.1 * s); p.arm(S(s, 'L'), 0.55, 0.45, 1.1); p.arm(S(s, 'R'), -0.35, 0.4, 0.6); p.lean(0.03, 0.02, 0.08 * s, -0.04 * s); p.look(-0.04, -0.32 * s); }, 'in'],
  [t0 + 1.5, (p) => { p.footX(S(s, 'L'), -0.28 * s, 0, 0.03, 0.5); p.footX(S(s, 'R'), -0.42 * s); p.hips(-0.36 * s, -0.12, 0.01, 0.15 * s); clapFront(p, 0.04); p.lean(0.05, 0.02, 0.18 * s, 0.06 * s); p.look(0.02, 0.2 * s, 0.08 * s); }],
];

// Boot scoot: heel switches on every count, then kick-ball-change, stomp
// with a clap.
const switchKey = (s, dig) => (p) => {
  p.footX(S(s, 'R'), -0.23 * s, 0.02, 0.18, -0.6); p.footX(S(s, 'L'), 0.13 * s, 0, -0.02);
  p.hips(0.03 * s, -0.09, -0.02, -0.12 * s);
  p.arm(S(s, 'L'), 0.65, 0.3, 1.6, -0.4); p.arm(S(s, 'R'), -0.15, 0.35, 1.4, -0.3);
  p.lean(-0.03, -0.05, 0.12 * s); p.shrug(0.1 * dig); p.look(0.06, -0.15 * s);
};

// ── Battle moves ───────────────────────────────────────────────────
const moves = {
  rhettJazzBox: seq(4, [...jazzHalf(1, 0), ...jazzHalf(-1, 2)], { groove: 0.85, hits: 0.7 }),
  rhettHeelToe: seq(4, [...heelToeHalf(1, 0), ...heelToeHalf(-1, 2)], { groove: 0.85, hits: 0.8 }),
  rhettGrapevine: seq(4, [...vineHalf(1, 0), ...vineHalf(-1, 2)], { groove: 0.75, hits: 0.8 }),
  rhettBootScoot: seq(4, [
    [0, switchKey(1, 1)],
    [0.5, switchKey(-1, 1)],
    [1, switchKey(1, 0.5)],
    [1.5, switchKey(-1, 0.5)],
    [2, (p) => { p.footX('R', -0.12, 0.28, 0.34, -0.2); p.footX('L', 0.13); p.hips(0.05, -0.03, -0.04); p.arms(0.25, 0.85, 0.5); p.lean(-0.1, -0.06); p.look(-0.08, -0.1); }, 'out'],
    [2.5, (p) => { p.footX('R', -0.13, 0, -0.12, 0.6); p.footX('L', 0.13); p.hips(-0.02, -0.08, -0.05); p.arms(0.35, 0.55, 1.2); p.lean(0.04, 0.02); }],
    [3, (p) => { p.footX('R', -0.13, 0, -0.12, 0.6); p.footX('L', 0.13, 0, 0.02); p.hips(0.06, -0.1, -0.02, 0.1); p.arms(0.5, 0.45, 1.4); p.lean(0.05, 0.03); p.look(0.04, 0.1); }],
    [3.5, (p) => { p.footX('R', -0.16, 0, 0.04); p.footX('L', 0.13, 0, 0.02); p.hips(-0.02, -0.17, 0.01); clapFront(p, 0.02); p.lean(0.12, 0.08); p.shrug(0.12); p.look(0.15); }, 'in'],
  ], { groove: 0.8, hits: 0.9 }),

  // ★ Accent (count 3 of every 8): hat tip and a hip pop, peeking over the brim.
  rhettAccent(p, b, B, s) {
    groove(p, B, s, 0.7);
    p.foot('L', 0.13); p.foot('R', 0.19, 0, 0.06, 0.5);
    p.hips(0.08, -0.1, 0, -0.2);
    hatTip(p, 1); belt(p, 'L');
    p.lean(-0.04, -0.1, 0.1, 0.08); p.look(0.2, -0.12, 0.12);
  },

  // ── Tier 1 ───────────────────────────────────────────
  // "Howdy": step-touch with a hat tip and a nod, then step-touch the
  // other way pointing the foe out with a wink and a tongue click.
  rhettHatTip: seq(4, [
    [0, (p) => { p.footX('R', -0.24); p.footX('L', 0.1); p.hips(-0.08, -0.1, 0, -0.15); hatTip(p, 1); belt(p, 'L'); p.lean(0.05, 0.05, -0.1); p.look(0.25, -0.1, 0.05); }, 'in'],
    [0.5, (p) => { p.footX('R', -0.24); p.footX('L', -0.06, 0, 0.02, 0.5); p.hips(-0.13, -0.06, 0, -0.1); p.arm('R', 1.5, 0.95, 0.5, -0.2); belt(p, 'L'); p.lean(-0.02, -0.06, -0.05); p.look(-0.08, -0.15, 0.08); }],
    [1, (p) => { p.footX('R', -0.24); p.footX('L', -0.06, 0, 0.02, 0.5); p.hips(-0.14, -0.1, 0, -0.08); p.arm('R', 1.2, 1.15, 0.1); belt(p, 'L'); p.lean(-0.04, -0.1, -0.04, -0.04); p.look(-0.12, -0.2, 0.06); }],
    [1.5, (p) => { p.footX('R', -0.12); p.footX('L', 0.1); p.hips(-0.03, -0.06); belts(p); p.look(0, 0); }],
    [2, (p) => { p.footX('L', 0.26); p.footX('R', -0.12); p.hips(0.08, -0.1, 0, 0.25); p.arm('L', 0.25, 1.45, 0.04); belt(p, 'R'); p.lean(0, -0.08, 0.15, 0.06); p.look(-0.05, 0.4, 0.06); }, 'in'],
    [2.5, (p) => { p.footX('L', 0.26); p.footX('R', 0.06, 0, 0.02, 0.5); p.hips(0.14, -0.06, 0, 0.3); p.arm('L', 0.4, 1.35, 0.5, 0.2); p.wrist('L', 0.4); belt(p, 'R'); p.lean(0, -0.1, 0.18, 0.08); p.look(-0.08, 0.42, 0.12); }],
    [3, (p) => { p.footX('L', 0.26); p.footX('R', 0.06, 0, 0.04, 0.6); p.hips(0.15, -0.11, 0, 0.3); p.add('hips', 0, 0, -0.12); p.arm('L', 0.25, 1.45, 0.04); belt(p, 'R'); p.lean(-0.03, -0.12, 0.2, 0.1); p.look(-0.1, 0.42, 0.15); }, 'snap'],
    [3.5, (p) => { p.footX('L', 0.14); p.footX('R', -0.12); p.hips(0.02, -0.06, 0, 0.1); belts(p); p.look(0, 0.1); }],
  ], { groove: 0.8, hits: 0.7 }),

  // Belt-loop sway: wide and easy, thumbs in the belt, the hips rolling
  // side to side with the off knee popping in; shoulder shimmy on 3-4.
  rhettHipSway(p, b, B, s) {
    groove(p, B, s, 0.6);
    const sw = Math.sin(Math.PI * b), ph = ((b % 4) + 4) % 4;
    const shim = win(ph, 2.6, 4, 0.35), sh = Math.sin(TAU * b * 2) * shim;
    const pL = 0.5 * Math.pow(0.5 - 0.5 * sw, 2), pR = 0.5 * Math.pow(0.5 + 0.5 * sw, 2);
    p.foot('L', 0.22, 0, 0, pL); p.foot('R', 0.22, 0, 0, pR);
    p.hips(0.09 * sw, -0.13 - 0.02 * shim, 0.01, 0.22 * sw);
    p.add('hips', 0, 0, 0.14 * sw);
    belts(p);
    p.shrug(0.14 * sh, -0.14 * sh);
    p.lean(0.03, -0.06 + 0.04 * shim, -0.12 * sw + 0.12 * sh, -0.06 * sw);
    p.look(-0.04 + 0.08 * shim, 0.12 * sw, 0.1 * sw);
  },

  // ── Tier 2 ───────────────────────────────────────────
  // Slap leather: heel, together, heel, together — then slap the boot
  // behind, to the side and in front, and stomp.
  rhettSlapLeather: seq(4, [
    [0, (p) => { p.footX('R', -0.23, 0.02, 0.19, -0.6); p.footX('L', 0.13); p.hips(0.05, -0.08); p.arms(0.2, 0.5, 1.0); p.lean(-0.03, -0.04, -0.1); p.look(0.1, -0.15); }],
    [0.5, (p) => { p.footX('R', -0.13); p.footX('L', 0.13); p.hips(0, -0.1); p.arms(0.25, 0.45, 1.1); p.look(0.02); }],
    [1, (p) => { p.footX('L', 0.23, 0.02, 0.19, -0.6); p.footX('R', -0.13); p.hips(-0.05, -0.08); p.arms(0.2, 0.5, 1.0); p.lean(-0.03, -0.04, 0.1); p.look(0.1, 0.15); }],
    [1.5, (p) => { p.footX('L', 0.13); p.footX('R', -0.13); p.hips(0.05, -0.1); p.arms(0.25, 0.45, 1.1); p.look(0.02); }],
    [2, (p) => { p.footX('L', 0.12); p.footX('R', -0.1, 0.34, -0.26, 0.3); p.hips(0.07, -0.1, 0.02, -0.25); p.arm('L', -0.85, -0.05, 0.25, -0.6); p.arm('R', 0.4, 1.2, 0.3); p.lean(0.1, 0.05, -0.3, 0.05); p.look(0.15, -0.6, -0.1); }, 'hit'],
    [2.5, (p) => { p.footX('L', 0.12); p.footX('R', -0.36, 0.3, 0.02, 0); p.hips(0.08, -0.12, 0, -0.05); p.arm('R', -0.05, 0.62, 0.15); p.arm('L', 0.3, 1.15, 0.4); p.lean(0.05, 0.04, 0, -0.18); p.look(0.25, -0.3, -0.15); }, 'hit'],
    [3, (p) => { p.footX('L', 0.12); p.footX('R', 0.04, 0.36, 0.2, -0.1); p.hips(0.06, -0.11, 0.01, 0.15); p.arm('L', 0.75, -0.2, 0.35, -0.4); p.arm('R', 0.3, 1.1, 0.5); p.lean(0.18, 0.08, 0.12); p.look(0.3, 0.1); }, 'hit'],
    [3.5, (p) => { p.footX('L', 0.13); p.footX('R', -0.15); p.hips(0, -0.17); clapFront(p, 0.05); p.lean(0.1, 0.06); p.shrug(0.1); p.look(0.1); }, 'in'],
  ], { groove: 0.7, hits: 0.7 }),

  // Scuff, hitch with a 1/8 turn, stomp, stomp — then back the other way.
  rhettScuffHitch(p, b, B, s) {
    phased(p, b % 4, B, s, [
      [2, (p, t) => scuffHalf(p, t, 1)],
      [Infinity, (p, t) => scuffHalf(p, t - 2, -1)],
    ], 0.2);
    groove(p, B, s, 0.7);
  },

  // ── Tier 3 ───────────────────────────────────────────
  // Lasso twirl: two-stepping with the lariat spinning over the hat, throw
  // it on 3, haul it back hand over hand on 4.
  rhettLassoTwirl(p, b, B, s) {
    const ph = ((b % 4) + 4) % 4;
    phased(p, ph, B, s, [
      [2.5, (p, t) => {
        const st = Math.sin(Math.PI * t), up = 0.5 - 0.5 * Math.cos(TAU * t);
        p.foot('L', 0.15, 0.06 * Math.max(0, -st) * up, 0); p.foot('R', 0.15, 0.06 * Math.max(0, st) * up, 0);
        p.footX('L', 0.15 + 0.05 * st); p.footX('R', -0.15 + 0.05 * st);
        p.hips(0.06 * st, -0.1, 0, 0.12 * st);
        lassoArm(p, TAU * t * 2, smooth(t / 0.6));
        belt(p, 'L');
        p.lean(-0.03, -0.1, -0.1 * st); p.look(-0.3, 0.1 * st, -0.05);
      }],
      [3, (p, t) => {
        const k = smooth((t - 2.5) / 0.3);
        p.footX('L', 0.15, 0, 0.02 + 0.12 * k); p.footX('R', -0.15, 0, -0.04);
        p.hips(0.05 * k, -0.1 - 0.05 * k, 0.06 * k, 0.4 * k);
        p.arm('R', lerp(2.9, 1.45, k), lerp(0.4, -0.15, k), lerp(0.4, 0.05, k));
        belt(p, 'L');
        p.lean(0.18 * k, 0.12 * k, 0.15 * k); p.look(-0.3 + 0.2 * k, 0.35 * k);
      }],
      [Infinity, (p, t) => {
        const c = 0.5 - 0.5 * Math.cos(TAU * (t - 3) * 2), yank = win(t, 3.55, 4.2, 0.2);
        p.footX('L', 0.18, 0, 0.12); p.footX('R', -0.14, 0, -0.08);
        p.hips(0.02, -0.16, -0.04 - 0.05 * yank, 0.4);
        p.arm('L', 1.2 - 0.5 * c, 0.15, 0.4 + 1.5 * c, -0.4); p.arm('R', 0.7 + 0.5 * c, 0.15, 1.9 - 1.5 * c, -0.4);
        p.lean(-0.12 - 0.12 * yank, -0.1, 0.25); p.look(-0.05, 0.35);
      }],
    ], 0.18);
  },

  // Air fiddle: fiddle tucked under the chin, the bow sawing on every
  // count, heel taps; a big bow flourish on 4.
  rhettAirFiddle(p, b, B, s) {
    groove(p, B, s, 0.6);
    const ph = ((b % 4) + 4) % 4, fl = win(ph, 2.7, 4, 0.3);
    const bow = 0.5 + 0.5 * Math.sin(TAU * b * 2 - 0.6), tap = 0.5 + 0.5 * Math.cos(TAU * b * 2);
    const show = smooth(b / 0.4);
    p.foot('L', 0.14); p.foot('R', 0.16, 0.02 * tap, 0.12 * tap, -0.45 * tap);
    p.hips(-0.02, -0.11 - 0.03 * tap, 0, 0.18);
    p.arm('L', 1.35 + 0.1 * fl, 0.5, 0.55, -0.15);
    p.set('handL', -0.2, 0.5 * show, 0);
    p.arm('R', lerp(1.0, 0.85, fl), lerp(-0.35 + 1.1 * bow, 1.7, fl), lerp(1.9 - 1.35 * bow, 0.15, fl), -0.6 * (1 - fl));
    p.set('handR', 0.1, 0.5 * show, 0);
    p.lean(0.04 - 0.1 * fl, -0.05 - 0.12 * fl, 0.12, 0.05);
    p.look(0.16 - 0.3 * fl, 0.32, 0.36 - 0.2 * fl);
  },

  // ── Tier 4 ───────────────────────────────────────────
  // Cotton-Eyed Joe: knee up, kick, back-together-forward — right, then
  // left — hands on the hips, a "yeehaw!" fist to the sky on the last count.
  rhettCottonEye: seq(4, [...cottonHalf(1, 0), ...cottonHalf(-1, 2)], { groove: 0.6, hits: 0.6 }),

  // Rolling vine: step, spin a full turn on that boot, touch and clap —
  // right, then back to the left with a stomp and the hat tipped.
  rhettRollingVine(p, b, B, s) {
    phased(p, ((b % 4) + 4) % 4, B, s, [
      [2, (p, t) => rollingHalf(p, t, 1)],
      [Infinity, (p, t) => rollingHalf(p, t - 2, -1)],
    ], 0.12);
  },

  // ── ★ Signature moves ─────────────────────────────────
  // Bronco ride: squat like he's on a bucking bronco, reins in the right
  // hand, the left waving over his head, bucking on every beat.
  rhettBronco(p, b, B, s) {
    const hop = 0.5 - 0.5 * Math.cos(TAU * b), buck = Math.sin(TAU * b - 0.8);
    p.foot('L', 0.25, 0.07 * hop * hop, 0, 0.3 * hop); p.foot('R', 0.25, 0.07 * hop * hop, 0, 0.3 * hop);
    p.hips(0.03 * Math.sin(Math.PI * b), -0.27 + 0.16 * hop, -0.04 * buck, 0.3 * Math.sin(Math.PI * b * 0.5));
    p.add('hips', -0.2 * buck, 0, 0);
    p.arm('R', 0.75 + 0.15 * buck, 0.2, 1.7, -0.6);
    yeehaw(p, Math.sin(TAU * b * 2));
    p.lean(0.18 * buck + 0.08, 0.12 * buck, 0, 0.05 * Math.sin(Math.PI * b));
    p.look(-0.25 * buck - 0.1, 0.1 * Math.sin(Math.PI * b));
  },

  // Lasso tornado: two full spins on the left boot with the lariat flying
  // over the hat, then drop to a knee and point the foe out.
  rhettLassoTornado(p, b, B, s) {
    phased(p, b, B, s, [
      [2.2, (p, t) => {
        const u = smooth(t / 2.2), yaw = TAU * 2 * u, w = turned(p, yaw);
        w.foot('L', 0.02, 0, 0, 0.35); w.foot('R', -0.08, 0, 0.0);
        p.footX('R', -0.07, 0.16 + 0.05 * Math.sin(TAU * t), 0.05, 0.4);
        w.hips(0.01, -0.06 + 0.03 * Math.sin(TAU * t), 0);
        lassoArm(p, TAU * t * 2, smooth(t / 0.6));
        p.arm('L', 0.3, 1.25, 0.4);
        p.lean(-0.05, -0.1); p.look(-0.35);
      }],
      [Infinity, (p, t) => {
        const k = smooth((t - 2.2) / 0.5);
        p.footX('L', 0.17, 0, 0.22 * k); p.footX('R', -0.1, 0, -0.34 * k, 0.9 * k);
        p.hips(0.02, -0.06 - 0.38 * k, -0.06 * k, 0.3 * k);
        const pulse = Math.sin(TAU * t) * k;
        p.arm('L', 0.3 + 0.08 * pulse, 0.3 + 1.2 * k, 0.05 + 0.1 * pulse); p.arm('R', lerp(2.9, 0.6, k), 0.3, lerp(0.3, 1.6, k), -0.6 * k);
        p.lean(0.05 * k + 0.03 * pulse, -0.15 * k, 0.15 * k); p.look(-0.1 * k, 0.4 * k, 0.06 * pulse);
      }],
    ], 0.2);
  },

  // Heel click: two jumps clicking the boots together in the air — to the
  // left, then to the right — and land in the hat tip.
  rhettHeelClick(p, b, B, s) {
    phased(p, b, B, s, [
      [0.7, (p, t) => crouch(p, smooth(t / 0.7))],
      [1.7, (p, t) => heelJump(p, t - 0.7, 1)],
      [2.2, (p, t) => crouch(p, 0.25 + 0.75 * smooth((t - 1.7) / 0.45))],
      [3.2, (p, t) => heelJump(p, t - 2.2, -1)],
      [Infinity, (p, t) => {
        const k = smooth((t - 3.2) / 0.4), give = Math.sin(Math.PI * clamp01((t - 3.2) / 0.5));
        p.foot('L', 0.13); p.foot('R', 0.18, 0, 0.06, 0.5 * k);
        p.hips(0.07 * k, -0.08 - 0.22 * give, 0, -0.2 * k);
        hatTip(p, k); belt(p, 'L');
        p.lean(-0.04, -0.1 * k, 0.1 * k, 0.08 * k); p.look(0.2 * k, -0.12 * k, 0.12 * k);
      }],
    ], 0.12);
  },

  // ★★ SOLO — Rodeo Showdown: lasso tornado, a flying heel click with the
  // lariat still up, slide to one knee with the arms wide ("YEEHAW!"), rise
  // into the hat tip.
  rhettRodeo(p, b, B, s) {
    phased(p, b, B, s, [
      [1.25, (p, t) => {
        const u = smooth(t / 1.25), yaw = TAU * 2 * u, w = turned(p, yaw);
        w.foot('L', 0.02, 0, 0, 0.35);
        p.footX('R', -0.07, 0.15 + 0.05 * Math.sin(TAU * t * 2), 0.05, 0.4);
        w.hips(0.01, -0.05, 0);
        lassoArm(p, TAU * t * 2.5, smooth(t / 0.5));
        p.arm('L', 0.3, 1.3, 0.4);
        p.lean(-0.05, -0.12); p.look(-0.35);
      }],
      [2.4, (p, t) => {
        const u = (t - 1.25) / 1.15, air = Math.sin(Math.PI * clamp01(u));
        const pre = 1 - smooth(u / 0.15);
        p.hips(0.05 * air, -0.05 - 0.2 * pre + 0.6 * air, 0);
        p.footX('L', 0.13 + 0.22 * air, 0.5 * air, 0.05, 0.3 * air); p.footX('R', -0.13 + 0.35 * air, 0.5 * air, 0.05, 0.3 * air);
        p.tumble(0, -0.3 * air);
        lassoArm(p, TAU * t * 2.5, 1 - smooth((u - 0.45) / 0.55));
        p.arm('L', 0.3, 1.6 + 0.8 * air, 0.2);
        p.look(-0.3 * air); p.lean(-0.05 * air, -0.15 * air);
      }],
      [3.2, (p, t) => {
        const k = smooth((t - 2.4) / 0.4);
        p.footX('L', 0.17, 0, 0.22 * k); p.footX('R', -0.1, 0, -0.34 * k, 0.9 * k);
        p.hips(0, -0.08 - 0.36 * k, -0.06 * k, 0.15 * k);
        p.arms(0.35, 0.4 + 1.5 * k, 0.15);
        p.lean(-0.1 * k, -0.25 * k); p.look(-0.45 * k);
      }],
      [Infinity, (p, t) => {
        const k = smooth((t - 3.2) / 0.5);
        p.footX('L', 0.17 - 0.04 * k, 0, 0.22 * (1 - k)); p.footX('R', -0.1 - 0.08 * k, 0, -0.34 * (1 - k) + 0.06 * k, 0.9 - 0.4 * k);
        p.hips(0.06 * k, -0.44 + 0.34 * k, -0.06 * (1 - k), 0.15 - 0.35 * k);
        hatTip(p, k); p.arm('L', 0.3 + 0.0 * k, 1.9 - 0.45 * k, 0.15 - 0.1 * k);
        p.lean(-0.1 + 0.06 * k, -0.25 + 0.15 * k, 0.1 * k, 0.08 * k); p.look(-0.45 + 0.65 * k, -0.12 * k, 0.12 * k);
      }],
    ], 0.15);
  },

  // Intro call-out (facing the player): hat tip, point, "c'mere partner"
  // beckon, thumbs in the belt and a hip pop.
  rhettIntro(p, b, B, s) {
    groove(p, B, s, 0.5);
    phased(p, b, B, s, [
      [1, (p, t) => {
        const k = smooth(t / 0.4), nod = Math.sin(Math.PI * clamp01((t - 0.3) / 0.6));
        p.footX('L', 0.14, 0, 0.1 * k); p.footX('R', -0.15);
        p.hips(0.03, -0.08, 0, 0.6 * k);
        hatTip(p, k); belt(p, 'L');
        p.lean(0.05 * nod, -0.05, 0.1 * k); p.look(0.25 * nod, 0.3 * k);
      }],
      [2, (p, t) => {
        const k = smooth((t - 1) / 0.25);
        p.footX('L', 0.14, 0, 0.1); p.footX('R', -0.15);
        p.hips(0.04, -0.08, 0, 0.6);
        const d = smooth((t - 1) / 0.5);
        p.arm('L', 0.2, 0.3 + 1.2 * k, 0.04); p.arm('R', lerp(2.5, 0.12, d), lerp(0.32, 0.48, d), lerp(2.3, 1.3, d), lerp(-0.35, -1.2, d));
        p.lean(0, -0.1, 0.15 * k); p.look(-0.05, 0.35, 0.1 * k);
      }],
      [3, (p, t) => {
        const c = 0.5 + 0.5 * Math.cos(TAU * (t - 2) * 2);
        p.footX('L', 0.14, 0, 0.1); p.footX('R', -0.15);
        p.hips(0.04, -0.09, 0, 0.55);
        p.arm('L', 0.9, 0.75, 0.25 + 1.5 * (1 - c), -0.4); belt(p, 'R');
        p.lean(-0.04, -0.14, 0.15); p.look(-0.12, 0.35, 0.1);
      }],
      [Infinity, (p, t) => {
        const k = smooth((t - 3) / 0.3);
        p.footX('L', 0.13); p.footX('R', -0.19, 0, 0.06, 0.5 * k);
        p.hips(0.08 * k, -0.1, 0, 0.5 - 0.25 * k);
        p.add('hips', 0, 0, 0.1 * k);
        belts(p);
        p.lean(-0.05, -0.15 * k, 0.1, 0.06 * k); p.look(-0.15 * k, 0.35, 0.12 * k);
      }],
    ], 0.15);
  },

  // Taunt: twirl the lariat, throw it at the foe, haul them in.
  rhettTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    phased(p, b, B, s, [
      [2, (p, t) => {
        const st = Math.sin(Math.PI * t);
        p.footX('L', 0.15 + 0.04 * st, 0.03 * Math.max(0, -st), 0.08); p.footX('R', -0.15 + 0.04 * st, 0.03 * Math.max(0, st), -0.04);
        p.hips(0.04 * st, -0.1, 0, 0.45);
        lassoArm(p, TAU * t * 2.2, smooth(t / 0.6));
        belt(p, 'L');
        p.lean(-0.04, -0.1, 0.1); p.look(-0.25 + 0.15 * smooth(t / 2), 0.3);
      }],
      [2.6, (p, t) => {
        const k = smooth((t - 2) / 0.35);
        p.footX('L', 0.15, 0, 0.08 + 0.14 * k); p.footX('R', -0.15, 0, -0.06);
        p.hips(0.06 * k, -0.1 - 0.06 * k, 0.06 * k, 0.6);
        p.arm('R', lerp(2.9, 1.45, k), lerp(0.4, -0.2, k), lerp(0.4, 0.04, k));
        belt(p, 'L');
        p.lean(0.2 * k, 0.12 * k, 0.15); p.look(-0.1, 0.4);
      }],
      [Infinity, (p, t) => {
        const c = 0.5 - 0.5 * Math.cos(TAU * (t - 2.6) * 2), yank = win(t, 3.4, 4.1, 0.25);
        p.footX('L', 0.18, 0, 0.16); p.footX('R', -0.15, 0, -0.1);
        p.hips(0.02, -0.17, -0.03 - 0.06 * yank, 0.55);
        p.arm('L', 1.25 - 0.55 * c - 0.4 * yank, 0.15, 0.4 + 1.5 * c, -0.4); p.arm('R', 0.7 + 0.55 * c - 0.3 * yank, 0.15, 1.9 - 1.5 * c, -0.4);
        p.lean(-0.1 - 0.15 * yank, -0.1, 0.2); p.look(-0.08, 0.4);
      }],
    ], 0.15);
  },

  // Victory: yeehaw waving and hopping, a heel click, then the hat tip.
  rhettVictory(p, b, B, s) {
    phased(p, b, B, s, [
      [4, (p, t) => {
        groove(p, B, s, 0.6);
        const hop = Math.pow(0.5 - 0.5 * Math.cos(TAU * t), 2);
        p.foot('L', 0.15, 0.1 * hop, 0, 0.4 * hop); p.foot('R', 0.15, 0.1 * hop, 0, 0.4 * hop);
        p.hips(0.04 * Math.sin(Math.PI * t), -0.12 + 0.2 * hop, 0, 0.2 * Math.sin(Math.PI * t));
        yeehaw(p, Math.sin(TAU * t * 2)); belt(p, 'R');
        p.lean(-0.05, -0.15, 0, 0.05 * Math.sin(Math.PI * t)); p.look(-0.3, 0.15 * Math.sin(Math.PI * t));
      }],
      [5, (p, t) => crouch(p, smooth((t - 4) / 0.4) * (1 - smooth((t - 4.6) / 0.4)) + 0.0)],
      [6, (p, t) => heelJump(p, t - 5, 1)],
      [Infinity, (p, t) => {
        groove(p, B, s, 0.6);
        const k = smooth((t - 6) / 0.4);
        p.foot('L', 0.13); p.foot('R', 0.18, 0, 0.06, 0.5 * k);
        p.hips(0.07 * k, -0.1, 0, -0.2 * k);
        hatTip(p, k); belt(p, 'L');
        p.lean(-0.04, -0.1 * k, 0.1 * k, 0.08 * k); p.look(0.2 * k, -0.12 * k, 0.12 * k);
      }],
    ], 0.15);
  },
};

// Scuff (brush the heel forward), hitch the knee with a 1/8 turn, stomp,
// stomp. s = +1 turns toward the foe side, -1 back.
function scuffHalf(p, t, s) {
  const turn = s > 0 ? 0.6 * smooth((t - 0.3) / 0.5) : 0.6 * (1 - smooth((t - 0.3) / 0.5));
  const w = turned(p, turn);
  const R = S(s, 'R'), L = S(s, 'L');
  // Standing foot pivots near the centre; the working foot scuffs, hitches, stomps.
  const sc = win(t, -0.1, 0.55, 0.25), hi = win(t, 0.3, 1.0, 0.25), st1 = smooth((t - 0.85) / 0.2), st2 = win(t, 1.2, 1.75, 0.15);
  w.foot(L, 0.04 * s, 0);
  const fx = -0.14 * s, fz = 0.05 + 0.15 * sc * (1 - st1) + 0.1 * st1;
  w.foot(R, fx, fz, 0.06 * sc * (1 - hi) + 0.36 * hi * (1 - st1), -0.25 * sc * (1 - hi) + 0.2 * hi);
  if (st2 > 0) w.foot(L, 0.04 * s + 0.08 * s * st2, 0.03 * st2, 0.12 * Math.sin(Math.PI * clamp01((t - 1.2) / 0.5)));
  w.hips(-0.02 * s + -0.05 * s * st1, -0.06 - 0.1 * st1 + 0.04 * hi * (1 - st1) - 0.05 * st2, 0.03 * st1);
  p.arm(L, 0.5 + 1.6 * hi * (1 - st1), 0.35 + 0.2 * hi, 1.7 - 0.9 * hi * (1 - st1), -0.3);
  p.arm(R, 0.3 - 0.4 * hi + 0.6 * st1, 0.4, 1.5, -0.3);
  p.lean(0.04 - 0.08 * hi + 0.14 * st1, 0.08 * st1, 0.1 * s * hi); p.look(0.18 * st1 - 0.1 * hi, 0.15 * s * hi);
}

// Cotton-Eyed Joe, one side: knee up, kick, back, together, forward.
function cottonHalf(s, t0) {
  const R = S(s, 'R'), L = S(s, 'L');
  return [
    [t0, (p) => { p.footX(R, -0.12 * s, 0.4, 0.18, 0.2); p.footX(L, 0.13 * s); p.hips(0.04 * s, -0.03, 0.02); hipHand(p, 'L'); hipHand(p, 'R'); p.lean(-0.04, -0.06); p.look(0.05, -0.1 * s); }, 'out'],
    [t0 + 0.5, (p) => { p.footX(R, -0.12 * s, 0.3, 0.5, -0.35); p.footX(L, 0.13 * s); p.hips(0.03 * s, -0.05, -0.06); hipHand(p, 'L'); hipHand(p, 'R'); p.lean(-0.2, -0.1); p.look(-0.1, -0.12 * s); }, 'hit'],
    [t0 + 1, (p) => { p.footX(R, -0.14 * s, 0, -0.14); p.footX(L, 0.13 * s); p.hips(-0.03 * s, -0.13, -0.06); hipHand(p, 'L'); hipHand(p, 'R'); p.lean(0.06, 0.04); p.look(0.06); }, 'in'],
    [t0 + 1.25, (p) => { p.footX(R, -0.14 * s, 0, -0.14); p.footX(L, 0.11 * s, 0, -0.1); p.hips(0.02 * s, -0.09, -0.09); hipHand(p, 'L'); hipHand(p, 'R'); if (s < 0) p.arm('L', 0.4, 1.4, 0.9); p.lean(0.04, 0.02); }],
    [t0 + 1.5, (p) => {
      p.footX(R, -0.13 * s, 0, 0.0); p.footX(L, 0.11 * s, 0, -0.1); p.hips(-0.03 * s, -0.13, -0.04);
      if (s < 0) { yeehaw(p, 0); p.arm('L', 0.3, 2.8, 0.3); } else hipHand(p, 'L');
      hipHand(p, 'R'); p.lean(0.06, s < 0 ? -0.12 : 0.03); p.look(s < 0 ? -0.3 : 0.05, s < 0 ? 0.15 : 0);
    }, 'in'],
  ];
}

// Rolling vine, one side: step out, spin a full turn on that boot, land,
// touch and clap (s = +1 to the right, -1 back to the left).
function rollingHalf(p, t, s) {
  const R = S(s, 'R'), L = S(s, 'L');
  const X = 0.32 * s;                                  // the pivot boot's spot (world x, toward -x for s = +1)
  const step = smooth(t / 0.45);                       // step out onto the pivot boot
  const u = smooth((t - 0.4) / 0.9), yaw = -TAU * s * u;
  const land = smooth((t - 1.15) / 0.4);
  const w = turned(p, yaw);
  // Pivot boot: lifts and steps out, then stays planted through the spin.
  w.foot(R, lerp(-0.13 * s + (s < 0 ? 0.32 * 2 * 0 : 0), -X, step), 0, 0.1 * Math.sin(Math.PI * step), 0.3 * u * (1 - land));
  // Other boot: off the floor through the spin, lands beside on the touch.
  const lx = lerp(0.13 * s, -X + 0.06 * s, smooth(t / 0.5)), lift = 0.14 * win(t, 0.25, 1.35, 0.2);
  w.foot(L, lerp(lx, -X + 0.16 * s, land), 0.02 * land, lift, 0.45 * land);
  w.hips(lerp(0, -X * 0.9, step), -0.06 - 0.06 * land, 0);
  // Arms tuck in for the spin, open, clap on the touch (or stomp + hat point).
  const open = 1 - win(t, 0.35, 1.25, 0.25), clap = smooth((t - 1.2) / 0.45);
  p.arms(lerp(0.6, 0.3, open), lerp(0.25, 0.9, open), lerp(1.9, 0.7, open), -0.6 * (1 - open));
  if (s > 0) { if (clap > 0) clapFront(p, 0.05 * clap + 0.6 * (1 - clap)); }
  else if (clap > 0) { hatTip(p, clap); p.arm('L', 0.3, 0.9 + 0.55 * clap, 0.5 - 0.45 * clap); }
  p.lean(0.05 * land, -0.08 + 0.1 * land * (s > 0 ? 1 : -1)); p.look(-0.2 * (1 - land) + 0.1 * land, 0.25 * s * land);
}

// Crouch wind-up (k 0 → 1).
function crouch(p, k) {
  p.foot('L', 0.15); p.foot('R', 0.15);
  p.hips(0, -0.04 - 0.26 * k, -0.04 * k);
  p.arms(0.3 - 0.8 * k, 0.4, 0.4);
  p.lean(0.25 * k, 0.1 * k); p.look(0.08 * k);
}

// Heel-click jump, t = 0 → 1, boots clicked out to side s (+1 = his left).
function heelJump(p, t, s) {
  const u = clamp01(t), air = Math.sin(Math.PI * u), pre = 1 - smooth(u / 0.3);
  const click = Math.sin(Math.PI * clamp01((u - 0.12) / 0.76));
  p.hips(-0.04 * s * air, -0.3 * pre + 0.5 * air - 0.04, 0);
  const fx = 0.36 * s * click;
  p.footX('L', 0.13 * (1 - click) + fx + 0.035 * click, 0.82 * air * (0.4 + 0.6 * click), -0.05 * click, 0.3 * air);
  p.footX('R', -0.13 * (1 - click) + fx - 0.035 * click, 0.82 * air * (0.4 + 0.6 * click), -0.05 * click, 0.3 * air);
  p.tumble(0, 0.22 * s * click);
  const a = smooth(u / 0.35) * (1 - smooth((u - 0.7) / 0.3));
  p.arm('L', lerp(-0.5, 0.35, a), lerp(0.4, 2.7 + 0.2 * Math.sin(TAU * t * 2), a), lerp(0.4, 0.35, a));
  p.arm('R', lerp(-0.5, 0.3, a), lerp(0.4, 1.5, a), lerp(0.4, 0.5, a));
  p.lean(-0.05 * air, -0.15 * air, 0, -0.12 * s * click); p.look(-0.3 * air, 0.2 * s * air);
}

const moveMeta = {
  labels: {
    rhettHatTip: 'HOWDY HAT TIP', rhettHipSway: 'BELT-LOOP SWAY',
    rhettSlapLeather: 'SLAP LEATHER', rhettScuffHitch: 'SCUFF & HITCH',
    rhettLassoTwirl: 'LASSO TWIRL', rhettAirFiddle: 'AIR FIDDLE',
    rhettCottonEye: 'COTTON-EYED JOE', rhettRollingVine: 'ROLLING VINE',
    rhettBronco: 'BRONCO RIDE', rhettLassoTornado: 'LASSO TORNADO', rhettHeelClick: 'HEEL CLICK',
    rhettRodeo: 'RODEO SHOWDOWN', rhettJazzBox: 'JAZZ BOX', rhettHeelToe: 'HEEL-TOE',
    rhettGrapevine: 'GRAPEVINE', rhettBootScoot: 'BOOT SCOOT',
  },
  expressions: {
    rhettJazzBox: 'smirk', rhettHeelToe: 'smirk', rhettGrapevine: 'grin', rhettBootScoot: 'grin', rhettAccent: 'wink',
    rhettHatTip: 'wink', rhettHipSway: 'smirk', rhettSlapLeather: 'grin', rhettScuffHitch: 'focus',
    rhettLassoTwirl: 'focus', rhettAirFiddle: 'joy', rhettCottonEye: 'shout', rhettRollingVine: 'grin',
    rhettBronco: 'shout', rhettLassoTornado: 'focus', rhettHeelClick: 'joy', rhettRodeo: 'shout',
    rhettIntro: 'smirk', rhettTaunt: 'smirk', rhettVictory: 'shout',
  },
  hits: {
    rhettAccent: 0.4, rhettHipSway: 0.9, rhettScuffHitch: 0.5, rhettLassoTwirl: 0.4, rhettAirFiddle: 0.8,
    rhettRollingVine: 0.2, rhettBronco: 0.3, rhettLassoTornado: 0.15, rhettHeelClick: 0.1, rhettRodeo: 0,
    rhettIntro: 0.5, rhettTaunt: 0.4, rhettVictory: 0.3,
  },
  fnGroove: {
    rhettHipSway: 0.6, rhettScuffHitch: 0.6, rhettLassoTwirl: 0.5, rhettAirFiddle: 0.6, rhettRollingVine: 0.25,
    rhettBronco: 0, rhettLassoTornado: 0, rhettHeelClick: 0, rhettRodeo: 0, rhettVictory: 0, rhettTaunt: 0.4, rhettIntro: 0.5,
  },
  stiff: { rhettSlapLeather: 1.25, rhettBootScoot: 1.15 },
};

export default { moves, moveMeta };
