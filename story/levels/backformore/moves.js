// NULL's move set — popping, tutting, liquid and "bullet time".
//
// Popping / tutting vocabulary: hits (contract-release on the beat), ticks
// (a limb moving in small stops), dime stops, King Tut right-angle boxes,
// finger tuts (hands rotating little cubes), liquid / waving (a wave
// travelling through the arms), gliding (sliding as if on ice), animation
// / strobing (moving in frames) — plus the slow-motion lean-back dodge.
// Authored with the opponent on the dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, hipHand, crossArms, wideStance, twoStepFeet } = kit;

// Tut positions [fwd, out, elbow, twist] — right angles everywhere.
const T = {
  fwdUp: [1.57, 0.05, 1.57, 0],          // upper arm forward, forearm straight up
  fwdIn: [1.45, -0.05, 1.57, -1.57],     // upper arm forward, forearm across the chest
  sideUp: [0, 1.57, 1.57, 1.57],         // goalpost
  sideFwd: [0, 1.57, 1.57, 0],           // arm out, forearm pointing forward
  sideDown: [0, 1.57, 1.57, -1.57],      // arm out, forearm hanging
  downIn: [0, 0.15, 1.57, -1.57],        // forearm across the belly
  downFwd: [0.05, 0.12, 1.57, 0],        // forearm pointing forward at the waist
  upIn: [2.95, 0.1, 1.57, -1.57],        // arm up, forearm across over the head
  faceUp: [1.5, -0.32, 1.65, -0.15],     // forearm up in front of the face
  straightFwd: [1.57, 0.05, 0.03, 0],
  straightSide: [0, 1.57, 0.03, 0],
  straightUp: [3.0, 0.15, 0.03, 0],
  low: [0.15, 0.3, 0.35, 0],
};
const A = (p, side, a) => p.arm(side, a[0], a[1], a[2], a[3] || 0);
const LA = (p, side, a, b, t) => p.arm(side, lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3] || 0, b[3] || 0, t));
// Glitch-shaped bump: 0 → 1 → 0 across [a, b] with a sharp-ish attack.
const bump = (x, w) => Math.exp(-(x / w) * (x / w));
// Piecewise "hit" interpolation through corner values: hits each corner on
// its step, moves fast between them (continuous — no pose switching).
function hitPath(list, t, sharp = 0.45) {
  const n = list.length, k = Math.floor(t), f = t - k;
  const a = list[((k % n) + n) % n], b = list[(((k + 1) % n) + n) % n];
  const u = smooth(f / sharp);
  return a.map((v, i) => lerp(v, b[i], u));
}

const moves = {
  // ── Base routines ───────────────────────────────────────────────
  // Tut groove: two-step underneath, the arms snapping through right-angle
  // tut frames on every half beat — boxes passing from one side to the other.
  nullTutGroove: seq(4, [
    [0, (p) => { twoStepFeet.c1(p); A(p, 'L', T.fwdUp); A(p, 'R', T.fwdIn); p.lean(0.03, 0.04, 0.15); p.look(0.08, 0.2); }],
    [0.5, (p) => { twoStepFeet.a1(p); A(p, 'L', T.sideFwd); A(p, 'R', T.fwdUp); p.lean(0.02, 0, 0.05); p.look(0.04, 0.05); }],
    [1, (p) => { twoStepFeet.c2(p); A(p, 'L', T.sideUp); A(p, 'R', T.downIn); p.lean(0.05, 0.05, -0.15, -0.06); p.look(0.05, 0.35, 0.08); }],
    [1.5, (p) => { twoStepFeet.a2(p); A(p, 'L', T.upIn); A(p, 'R', T.downFwd); p.lean(0.02, -0.03); p.look(-0.05, 0.1); }],
    [2, (p) => { twoStepFeet.c1(p); A(p, 'R', T.fwdUp); A(p, 'L', T.fwdIn); p.lean(0.03, 0.04, -0.15); p.look(0.08, -0.2); }],
    [2.5, (p) => { twoStepFeet.a3(p); A(p, 'R', T.sideFwd); A(p, 'L', T.fwdUp); p.lean(0.02, 0, -0.05); p.look(0.04, -0.05); }],
    [3, (p) => { twoStepFeet.c4(p); A(p, 'R', T.sideUp); A(p, 'L', T.downIn); p.lean(0.05, 0.05, 0.15, 0.06); p.look(0.05, -0.35, -0.08); }],
    [3.5, (p) => { twoStepFeet.a4(p); A(p, 'R', T.upIn); A(p, 'L', T.downFwd); p.lean(0.02, -0.03); p.look(-0.05, -0.1); }],
  ], { groove: 0.8, hits: 0.7 }),

  // Liquid: weight rocking side to side over planted feet while the hands
  // trace slow interlocking circles in front of the body, a wave rolling
  // from the shoulder out through the wrist.
  nullLiquid(p, b, B, s) {
    groove(p, B, s, 0.8);
    const ph = Math.PI * b, side = Math.sin(ph);
    p.foot('L', 0.19, 0, 0.02, 0.35 * Math.max(0, -side) ** 1.5);
    p.foot('R', 0.19, 0, -0.02, 0.35 * Math.max(0, side) ** 1.5);
    p.hips(0.075 * side, -0.1 - 0.03 * Math.cos(2 * ph), 0, 0.12 * side);
    for (const [sd, o] of [['L', 0], ['R', Math.PI]]) {
      const a = ph + o;
      p.arm(sd, 1.05 + 0.45 * Math.sin(a), 0.32 + 0.42 * Math.cos(a), 1.25 + 0.5 * Math.sin(a - 1.1), -0.55 + 0.4 * Math.cos(a - 0.6));
      p.wrist(sd, 0.25 * Math.sin(a - 2.2), 0.55 * Math.sin(a - 1.8));
    }
    p.lean(0.04, 0.06 * Math.cos(ph), 0.18 * Math.sin(ph - 0.5), -0.05 * side);
    p.look(0.06, 0.22 * Math.sin(ph - 0.8), 0.06 * side);
  },

  // Glitch hits: popping on every half beat — point, fold, goalpost, X,
  // diagonal — each one a contraction that lands dead on the pulse.
  nullGlitchHit: seq(4, [
    [0, (p) => { wideStance(p, 0.22); p.hips(0.03, -0.12, 0, 0.2); A(p, 'L', [1.35, 0.9, 0.03]); p.arm('R', 0.9, 0.2, 2.1, -0.4); p.lean(0.06, 0.1, 0.15); p.look(0.05, 0.4); }, 'snap'],
    [0.5, (p) => { wideStance(p, 0.22); p.hips(0.03, -0.07, 0, 0.2); A(p, 'L', T.fwdUp); p.arm('R', 0.9, 0.2, 2.1, -0.4); p.lean(0.02, -0.05, 0.15); p.look(-0.05, 0.25); }, 'snap'],
    [1, (p) => { wideStance(p, 0.24); p.hips(-0.04, -0.16, 0, -0.1); A(p, 'R', T.sideUp); A(p, 'L', T.downIn); p.lean(0.08, 0.14, -0.1, -0.08); p.look(0.08, -0.3); }, 'snap'],
    [1.5, (p) => { wideStance(p, 0.24); p.hips(-0.04, -0.09, 0, -0.1); A(p, 'R', T.sideFwd); A(p, 'L', T.sideDown); p.lean(0.02, -0.06); p.look(0, -0.1, 0.12); }, 'snap'],
    [2, (p) => { wideStance(p, 0.2); p.hips(0, -0.2, 0.03); p.arm('L', 1.5, -0.15, 1.6, -1.45); p.arm('R', 1.3, -0.12, 1.6, -1.45); p.lean(0.14, 0.18); p.look(0.15); }, 'snap'],
    [2.5, (p) => { wideStance(p, 0.2); p.hips(0, -0.08); A(p, 'L', [0.15, 0.75, 0.05]); A(p, 'R', [0.15, 0.75, 0.05]); p.lean(-0.04, -0.14); p.look(-0.12); p.shrug(0.2); }, 'snap'],
    [3, (p) => { p.foot('L', 0.24); p.foot('R', 0.16, 0, -0.04, 0.4); p.hips(0.06, -0.14, 0, 0.25); A(p, 'L', [2.6, 0.95, 0.03]); A(p, 'R', [0.3, 0.75, 0.03]); p.lean(-0.04, -0.1, 0.1, 0.18); p.look(-0.2, 0.3, 0.15); }, 'snap'],
    [3.5, (p) => { p.foot('L', 0.24); p.foot('R', 0.16, 0, -0.04, 0.4); p.hips(0.06, -0.1, 0, 0.25); A(p, 'L', [2.6, 0.95, 0.03]); A(p, 'R', [0.3, 0.75, 0.03]); p.lean(-0.04, -0.1, 0.1, 0.18); p.look(-0.1, -0.15, -0.1); }, 'snap'],
  ], { groove: 0.6, hits: 0.9 }),

  // Boogaloo roll: hips rolling in circles over rolling knees, the arms
  // waving in front of the chest, head sliding the other way.
  nullRoll(p, b, B, s) {
    groove(p, B, s, 0.6);
    const a = Math.PI * b, c = Math.cos(a), sn = Math.sin(a);
    p.foot('L', 0.2, 0, 0.02, 0.45 * (0.5 + 0.5 * c));
    p.foot('R', 0.2, 0, 0.02, 0.45 * (0.5 - 0.5 * c));
    p.hips(0.08 * -c, -0.13 - 0.05 * sn, 0.06 * sn, 0.18 * -c);
    p.add('hips', 0.12 * sn, 0, 0.1 * c);
    p.lean(0.06 - 0.1 * sn, -0.08 * sn, 0, 0.1 * c);
    p.arm('L', 0.95 + 0.35 * Math.sin(a * 2), 0.25, 1.45 + 0.45 * Math.cos(a * 2), -0.7);
    p.arm('R', 0.95 + 0.35 * Math.sin(a * 2 + Math.PI), 0.25, 1.45 + 0.45 * Math.cos(a * 2 + Math.PI), -0.7);
    p.wrist('L', 0.4 * Math.sin(a * 2 - 1.2)); p.wrist('R', 0.4 * Math.sin(a * 2 + Math.PI - 1.2));
    p.look(0.05, 0.12 * c, -0.14 * c);
  },

  // Signature (count 3): one gloved hand up, palm out at the rival — stop
  // right there — the other fixing the shades.
  nullAccent(p, b, B, s) {
    groove(p, B, s, 0.6);
    p.foot('L', 0.16, 0, 0.1); p.foot('R', 0.2, 0, -0.05, 0.3);
    p.hips(-0.02, -0.08, -0.02, 0.35);
    p.arm('L', 0.55, 1.15, 0.12);
    p.wrist('L', -1.15, 0.2);
    p.arm('R', 1.35, 0.15, 2.55, -1.0);
    p.lean(-0.06, -0.14, 0.1); p.look(-0.08, 0.32, 0.06);
  },

  // ── Tier 1 ──────────────────────────────────────────────────────
  // Ticking: the arm climbs to the side in little stops, then the other,
  // goalpost hit and release; the head ticks along to watch it.
  nullTick: seq(4, [
    [0, (p) => { wideStance(p, 0.2); p.hips(0, -0.12); A(p, 'L', [0.1, 0.38, 0.05]); A(p, 'R', T.low); p.look(0.05, 0.05); }, 'snap'],
    [0.5, (p) => { wideStance(p, 0.2); p.hips(0, -0.07); A(p, 'L', [0.1, 0.78, 0.05]); A(p, 'R', T.low); p.look(0, 0.18); p.lean(0, 0, 0, 0.04); }, 'snap'],
    [1, (p) => { wideStance(p, 0.2); p.hips(0.02, -0.13); A(p, 'L', [0.1, 1.18, 0.05]); A(p, 'R', T.low); p.look(-0.03, 0.32); p.lean(0, -0.04, 0, 0.08); }, 'snap'],
    [1.5, (p) => { wideStance(p, 0.2); p.hips(0.03, -0.08); A(p, 'L', [0.1, 1.57, 0.03]); p.wrist('L', 0, 0.6); A(p, 'R', T.low); p.look(-0.05, 0.5); p.lean(0, -0.06, 0, 0.1); }, 'snap'],
    [2, (p) => { wideStance(p, 0.2); p.hips(-0.02, -0.13); A(p, 'L', [0.1, 1.57, 0.03]); p.wrist('L', 0, -0.4); A(p, 'R', [0.1, 1.0, 0.05]); p.look(0, -0.1); }, 'snap'],
    [2.5, (p) => { wideStance(p, 0.2); p.hips(-0.03, -0.08); A(p, 'L', [0.1, 1.57, 0.03]); A(p, 'R', [0.1, 1.57, 0.03]); p.wrist('R', 0, 0.6); p.look(-0.05, -0.5); p.lean(0, -0.06, 0, -0.1); }, 'snap'],
    [3, (p) => { wideStance(p, 0.22); p.hips(0, -0.18); A(p, 'L', T.sideUp); A(p, 'R', T.sideUp); p.lean(-0.03, -0.12); p.look(-0.15); }, 'snap'],
    [3.5, (p) => { wideStance(p, 0.22); p.hips(0, -0.08); A(p, 'L', [0.5, 0.6, 0.6]); A(p, 'R', [0.5, 0.6, 0.6]); p.look(0.08, 0.1); p.shrug(-0.08); }, 'snap'],
  ], { groove: 0.6, hits: 0.8 }),

  // Arm wave: a wave travelling from the left fingertips through the
  // shoulders to the right fingertips and back, weight following it.
  nullArmWave(p, b, B, s) {
    groove(p, B, s, 0.6);
    const w = 0.5 - 0.5 * Math.cos(Math.PI * b / 2);   // 0 → 1 → 0 over 4 beats
    const k = (u) => bump(u - w, 0.13);
    wideStance(p, 0.21);
    p.hips(0.07 * (1 - 2 * w), -0.12 - 0.04 * k(0.5), 0, 0.12 * (1 - 2 * w));
    p.arm('L', 0.2 * k(0.26), 1.45 + 0.35 * k(0.26) - 0.25 * k(0.12), 1.1 * k(0.12) + 0.05, 1.57);
    p.wrist('L', 0, 0.9 * k(0) - 0.3 * k(0.12));
    p.arm('R', 0.2 * k(0.74), 1.45 + 0.35 * k(0.74) - 0.25 * k(0.88), 1.1 * k(0.88) + 0.05, 1.57);
    p.wrist('R', 0, 0.9 * k(1) - 0.3 * k(0.88));
    p.shrug(0.3 * k(0.4), 0.3 * k(0.6));
    p.add('chest', -0.16 * k(0.5), 0, 0.1 * (k(0.4) - k(0.6)));
    p.look(-0.04, 0.4 * (0.5 - w), 0.1 * (k(0.4) - k(0.6)));
  },

  // ── Tier 2 ──────────────────────────────────────────────────────
  // King Tut: right-angle boxes around the head and chest on every half
  // beat, knees hitting underneath.
  nullTutBox: seq(4, [
    [0, (p) => { wideStance(p, 0.22); p.hips(0, -0.14); A(p, 'L', T.fwdUp); A(p, 'R', T.fwdIn); p.look(0.08, 0.15); }, 'snap'],
    [0.5, (p) => { wideStance(p, 0.22); p.hips(0, -0.08); A(p, 'L', T.upIn); A(p, 'R', T.fwdUp); p.look(-0.1, 0.1); p.lean(0, -0.05, 0, 0.08); }, 'snap'],
    [1, (p) => { wideStance(p, 0.25); p.hips(0, -0.2); A(p, 'L', T.sideUp); A(p, 'R', T.sideUp); p.lean(0.04, 0.08); p.look(0.05); }, 'snap'],
    [1.5, (p) => { wideStance(p, 0.25); p.hips(0, -0.1); A(p, 'L', T.sideDown); A(p, 'R', T.sideUp); p.lean(0, 0, 0, -0.1); p.look(0, -0.2, -0.1); }, 'snap'],
    [2, (p) => { wideStance(p, 0.22); p.hips(0, -0.14); A(p, 'R', T.fwdUp); A(p, 'L', T.fwdIn); p.look(0.08, -0.15); }, 'snap'],
    [2.5, (p) => { wideStance(p, 0.22); p.hips(0, -0.08); A(p, 'R', T.upIn); A(p, 'L', T.fwdUp); p.look(-0.1, -0.1); p.lean(0, -0.05, 0, -0.08); }, 'snap'],
    [3, (p) => { wideStance(p, 0.25); p.hips(0, -0.2); p.arm('L', 1.75, -0.05, 1.57, -1.57); p.arm('R', 1.3, -0.05, 1.57, -1.57); p.lean(0.06, 0.1); p.look(0.1); }, 'snap'],
    [3.5, (p) => { wideStance(p, 0.22); p.hips(0, -0.1); A(p, 'L', T.faceUp); A(p, 'R', T.fwdIn); p.look(-0.05, 0.25); }, 'snap'],
  ], { groove: 0.5, hits: 0.6 }),

  // Finger tutting: hands up by the face turning little cubes — the hands
  // orbit a square, hitting each corner, wrists flipping 90° on the hit.
  nullFingerTut(p, b, B, s) {
    groove(p, B, s, 0.7);
    const C = [[1.55, -0.28, 2.05, -0.8, 0.9], [1.4, 0.22, 1.7, -0.4, -0.9], [0.95, 0.22, 1.6, -0.3, 0.9], [1.05, -0.26, 1.95, -0.9, -0.9]];
    const l = hitPath(C, b * 2), r = hitPath(C, b * 2 + 2);
    p.arm('L', l[0], l[1], l[2], l[3]); p.wrist('L', 0.3 * l[4], l[4]);
    p.arm('R', r[0], r[1], r[2], r[3]); p.wrist('R', -0.3 * r[4], r[4]);
    const side = Math.sin(Math.PI * b);
    p.foot('L', 0.17, 0, 0.02, 0.3 * Math.max(0, -side)); p.foot('R', 0.17, 0, -0.02, 0.3 * Math.max(0, side));
    p.hips(0.05 * side, -0.11, 0, 0.1 * side);
    p.lean(0.06, 0.05);
    p.look(0.18 + 0.05 * Math.sin(TAU * b), 0.12 * Math.sin(Math.PI * b * 0.5));
  },

  // ── Tier 3 ──────────────────────────────────────────────────────
  // Bullet dodge: sees it coming, then leans back in slow motion, arms
  // wheeling in slow circles, and snaps upright again.
  nullBulletDodge(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.4);
        wideStance(p, 0.2 + 0.06 * k);
        p.hips(0, -0.08 - 0.06 * k, 0, 0.3 * k);
        A(p, 'L', [0.4, 0.5, 0.4]); A(p, 'R', [0.4, 0.5, 0.4]);
        p.look(-0.05, 0.45 * k); p.lean(0, -0.05 * k);
      }],
      [3, (p, b) => {
        const u = (b - 1) / 2, k = smooth(u / 0.35), a = TAU * u * 0.75;
        wideStance(p, 0.27);
        p.hips(0, -0.14 - 0.2 * k, 0.16 * k, 0.3 - 0.2 * k);
        p.lean(-0.5 * k, -0.42 * k, 0.15 * Math.sin(a), 0.08 * Math.sin(a * 0.7));
        p.look(-0.35 * k, 0.2 * (1 - k));
        p.arm('L', 1.6 + 1.1 * Math.sin(a), 1.0 + 0.4 * Math.cos(a), 0.3 + 0.25 * Math.sin(a + 1));
        p.arm('R', 1.6 - 1.1 * Math.sin(a + 0.8), 1.0 + 0.4 * Math.cos(a + 0.8), 0.3 + 0.25 * Math.sin(a + 2));
        p.wrist('L', 0.4 * Math.sin(a)); p.wrist('R', 0.4 * Math.cos(a));
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.3);
        p.foot('L', 0.16, 0, 0.08); p.foot('R', 0.2, 0, -0.04, 0.3 * k);
        p.hips(0, -0.1, 0.16 * (1 - k), 0.3 * k);
        p.lean(-0.5 * (1 - k), -0.1 - 0.32 * (1 - k));
        p.arm('L', 0.4, 0.1 + 1.25 * k, 0.05); p.wrist('L', -1.0 * k);
        p.arm('R', 1.35 * k + 0.3, 0.2, 2.5 * k, -1.0);
        p.look(-0.1, 0.35 * k);
      }],
    ]);
  },

  // Glide: sliding left then right as if the floor were ice — one foot
  // flat and gliding, the other on its toes, swapping every beat; the
  // arms float along and the head stays dead level.
  nullGlide(p, b, B, s) {
    groove(p, B, s, 0.4);
    const X = 0.32 * Math.sin(Math.PI * b / 2), v = Math.cos(Math.PI * b / 2);
    const sw = 0.5 + 0.5 * Math.cos(Math.PI * b);        // which foot is on its toes
    p.footX('L', X + 0.13 + 0.05 * (sw - 0.5) * Math.sign(v), 0, 0, 0.7 * sw);
    p.footX('R', X - 0.13 + 0.05 * (0.5 - sw) * Math.sign(v), 0, 0, 0.7 * (1 - sw));
    p.hips(X + 0.03 * v, -0.1 + 0.02 * Math.cos(TAU * b), 0, 0.1 * v);
    p.lean(0.02, 0, 0, -0.12 * v);
    p.add('head', 0, 0, 0.12 * v);
    const a = Math.PI * b;
    p.arm('L', 0.45 + 0.25 * Math.sin(a), 0.6 + 0.3 * v, 0.7 + 0.3 * Math.sin(a + 1), -0.2);
    p.arm('R', 0.45 - 0.25 * Math.sin(a), 0.6 - 0.3 * v, 0.7 + 0.3 * Math.sin(a + 2), -0.2);
    p.wrist('L', 0, 0.5 * Math.sin(a - 1)); p.wrist('R', 0, 0.5 * Math.sin(a - 2));
    p.look(0, 0.25 * v);
  },

  // ── Tier 4 ──────────────────────────────────────────────────────
  // Strobe: a full turn in frames — he ticks round like a strobe-lit
  // statue, drops into a dime-stop freeze and ticks back up.
  nullStrobe(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b) => {
        const st = b * 4, k = Math.floor(st), f = st - k;
        const yaw = TAU * (k + smooth(f / 0.35)) / 8;
        p.foot('L', 0.02, 0, 0, 0.35); p.foot('R', 0.1, 0.08, 0.04, 0.5);
        p.hips(0, -0.06 - 0.04 * Math.exp(-f * 6), 0);
        p.root(0, 0, 0, yaw);
        A(p, 'L', T.fwdUp); A(p, 'R', T.fwdIn);
        p.look(0.05);
      }],
      [3, (p, b) => {
        const k = smooth((b - 2) / 0.2);
        wideStance(p, 0.3);
        p.hips(0.04, -0.12 - 0.26 * k, 0.03, 0.3);
        A(p, 'L', [1.4, 1.0, 0.03]);
        A(p, 'R', [2.9, 0.4, 0.03]);
        p.lean(0.1, 0.1, 0.15, 0.1); p.look(-0.1, 0.45);
        p.root(0.004 * Math.sin(B * 40), 0, 0);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const st = (b - 3) * 4, k = Math.min(4, Math.floor(st)), u = clamp01((k + smooth((st - k) / 0.35)) / 4);
        wideStance(p, 0.3 - 0.08 * u);
        p.hips(0.04 * (1 - u), -0.38 + 0.26 * u, 0.03 * (1 - u), 0.3 * (1 - u));
        LA(p, 'L', [1.4, 1.0, 0.03], [0.55, 1.15, 0.12], u); p.wrist('L', -1.1 * u);
        LA(p, 'R', [2.9, 0.4, 0.03], [1.35, 0.15, 2.55, -1.0], u);
        p.lean(0.1 * (1 - u), 0.1 - 0.22 * u); p.look(-0.1, 0.35);
      }],
    ]);
  },

  // Wave drop: a body wave rolling down him twice, sinking lower each
  // time to one knee, then a reverse wave carries him back up into a hit.
  nullWaveDrop(p, b, B, s) {
    phased(p, b, B, s, [
      [2.5, (p, b) => {
        const ph = TAU * b / 1.25, w = (k) => Math.sin(ph - k), sink = smooth(b / 2.5);
        wideStance(p, 0.2 + 0.08 * sink);
        p.hips(0.02 * w(1.8), -0.1 - 0.32 * sink - 0.06 * (0.5 + 0.5 * w(2.4)), 0.09 * w(1.6), 0.2);
        p.add('spine', 0.22 * w(0.8)); p.add('chest', 0.34 * w(0)); p.add('hips', -0.16 * w(1.6));
        p.look(-0.28 * w(-0.6), 0.15);
        p.arm('L', 0.9 - 0.4 * sink, 0.6 + 0.3 * w(0.4), 0.6 + 0.6 * (0.5 + 0.5 * w(0.2)), -0.4);
        p.arm('R', 0.9 - 0.4 * sink, 0.6 + 0.3 * w(0.6), 0.6 + 0.6 * (0.5 + 0.5 * w(0.4)), -0.4);
        p.wrist('L', 0, 0.5 * w(-0.4)); p.wrist('R', 0, 0.5 * w(-0.2));
      }],
      [3, (p, b) => {
        const k = smooth((b - 2.5) / 0.3);
        p.foot('L', 0.2, 0, 0.16); p.foot('R', 0.16, 0.02, -0.38 * k, 0.9 * k);
        p.hips(0, -0.42 - 0.04 * k, -0.04);
        p.arm('L', 0.3, 1.4, 0.4); p.arm('R', 0.3, 1.4, 0.4);
        p.wrist('L', 0, 0.6 * Math.sin(TAU * b * 2)); p.wrist('R', 0, -0.6 * Math.sin(TAU * b * 2));
        p.lean(0.1, 0.05); p.look(0.15);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const u = smooth((b - 3) / 0.85), w = (d) => bump(u - d, 0.18);
        p.foot('L', 0.2 - 0.04 * u, 0, 0.16 * (1 - u)); p.foot('R', 0.16, 0, -0.38 * (1 - u), 0.9 * (1 - u));
        p.hips(0, -0.46 + 0.36 * u, -0.04 + 0.1 * w(0.35), 0.25 * u);
        p.add('spine', 0.25 * w(0.55)); p.add('chest', 0.32 * w(0.75) - 0.12 * u);
        p.look(-0.3 * w(0.95) - 0.1 * u, 0.3 * u);
        p.arm('L', lerp(0.3, 1.4, u), lerp(1.4, 0.9, u), 0.03);
        p.arm('R', lerp(0.3, 2.9, u), lerp(1.4, 0.4, u), 0.03);
      }],
    ]);
  },

  // ── ★ Branch moves ──────────────────────────────────────────────
  // Hit combo: guard, explode, zigzag on one leg, palms out, lean, lean —
  // and a dime-stop point at the rival, hand on the shades.
  nullHitCombo: seq(4, [
    [0, (p) => { wideStance(p, 0.28); p.hips(0, -0.32, 0.03); A(p, 'L', T.faceUp); A(p, 'R', T.faceUp); p.lean(0.2, 0.15); p.look(0.15); }, 'snap'],
    [0.5, (p) => { wideStance(p, 0.26); p.hips(0, -0.06); A(p, 'L', T.straightSide); A(p, 'R', T.straightSide); p.lean(-0.08, -0.25); p.look(-0.3); p.shrug(0.15); }, 'snap'],
    [1, (p) => { p.foot('R', 0.16); p.foot('L', 0.18, 0.32, 0.12, 0.3); p.hips(-0.06, -0.06); A(p, 'L', T.sideDown); A(p, 'R', T.sideUp); p.lean(0, -0.05, 0, -0.08); p.look(0, 0.3); }, 'snap'],
    [1.5, (p) => { wideStance(p, 0.26); p.hips(0, -0.16); A(p, 'L', T.straightFwd); A(p, 'R', T.straightFwd); p.wrist('L', -1.2); p.wrist('R', -1.2); p.lean(0.08, 0.05); p.look(0.05); }, 'snap'],
    [2, (p) => { wideStance(p, 0.26); p.hips(0.1, -0.14); A(p, 'L', [2.7, 0.9, 0.03]); A(p, 'R', T.downIn); p.lean(0, 0, 0.1, 0.32); p.look(0, 0.2, 0.2); }, 'snap'],
    [2.5, (p) => { wideStance(p, 0.26); p.hips(-0.1, -0.14); A(p, 'R', [2.7, 0.9, 0.03]); A(p, 'L', T.downIn); p.lean(0, 0, -0.1, -0.32); p.look(0, -0.2, -0.2); }, 'snap'],
    [3, (p) => { p.foot('L', 0.2, 0, 0.12); p.foot('R', 0.22, 0, -0.08, 0.4); p.hips(0.04, -0.22, 0, 0.5); A(p, 'L', [0.4, 1.4, 0.03]); p.arm('R', 1.35, 0.15, 2.55, -1.0); p.lean(0.04, -0.1, 0.2); p.look(-0.05, 0.45); }, 'snap'],
    [3.5, (p) => { p.foot('L', 0.2, 0, 0.12); p.foot('R', 0.22, 0, -0.08, 0.4); p.hips(0.04, -0.2, 0, 0.5); A(p, 'L', [0.4, 1.4, 0.03]); p.arm('R', 1.35, 0.15, 2.55, -1.0); p.lean(0.04, -0.1, 0.2); p.look(-0.12, 0.32, 0.1); }, 'snap'],
  ], { groove: 0.5, hits: 0.5 }),

  // Matrix limbo: down into the impossible lean-back — slow motion, arms
  // wheeling, coat hanging to the floor — then springs up into a spin.
  nullMatrixLimbo(p, b, B, s) {
    phased(p, b, B, s, [
      [0.75, (p, b) => {
        const k = smooth(b / 0.75);
        wideStance(p, 0.2 + 0.1 * k);
        p.hips(0, -0.05 - 0.3 * k, 0.12 * k);
        p.lean(-0.3 * k, -0.2 * k);
        A(p, 'L', [0.6 + 0.8 * k, 0.8, 0.3]); A(p, 'R', [0.6 + 0.8 * k, 0.8, 0.3]);
        p.look(-0.2 * k, 0.3);
      }],
      [2.75, (p, b) => {
        const u = (b - 0.75) / 2, a = TAU * u * 0.8, k = smooth(u / 0.3);
        wideStance(p, 0.3);
        p.hips(0, -0.35 - 0.14 * k, 0.12 + 0.12 * k);
        p.lean(-0.3 - 0.35 * k, -0.2 - 0.38 * k, 0.12 * Math.sin(a), 0.06 * Math.sin(a));
        p.look(-0.2 - 0.35 * k);
        p.arm('L', 1.5 + 1.2 * Math.sin(a), 1.1 + 0.35 * Math.cos(a), 0.25);
        p.arm('R', 1.5 - 1.2 * Math.sin(a + 0.6), 1.1 + 0.35 * Math.cos(a + 0.6), 0.25);
        p.root(0.004 * Math.sin(B * 33), 0, 0);
      }],
      [3.5, (p, b) => {
        const t = smooth((b - 2.75) / 0.75);
        p.foot('L', 0.02, 0, 0, 0.4); p.foot('R', 0.1, 0.06 + 0.1 * Math.sin(Math.PI * t), 0.04, 0.5);
        p.hips(0, -0.06, 0.05 * (1 - t)); p.root(0, 0, 0, TAU * t);
        A(p, 'L', T.fwdUp); A(p, 'R', T.fwdIn);
        p.lean(-0.1 * (1 - t), -0.05);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.5) / 0.2);
        p.foot('L', 0.14); p.foot('R', 0.22, 0, -0.04, 0.35 * k);
        p.hips(0.03, -0.1, 0, 0.35 * k);
        p.arm('L', 0.55, 1.15 * k + 0.2, 0.12); p.wrist('L', -1.15 * k, 0.2);
        p.arm('R', 1.35 * k, 0.15, 2.55 * k, -1.0);
        p.lean(-0.04, -0.14 * k, 0.1); p.look(-0.08, 0.32 * k);
      }],
    ]);
  },

  // System crash: the body glitches between two frames, ticks round in a
  // stuttering spin, crashes to one knee, then reboots in stiff stages.
  nullSystemCrash(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const g = 0.5 + 0.5 * Math.sin(TAU * b * 5) * Math.sin(TAU * b * 1.3);
        wideStance(p, 0.22);
        p.hips(0.04 * (g - 0.5), -0.12 - 0.05 * g, 0, 0.3 * (g - 0.5));
        LA(p, 'L', T.fwdUp, T.sideUp, g); LA(p, 'R', T.fwdIn, T.sideDown, g);
        p.look(0.1 * g, 0.4 * (g - 0.5), 0.25 * (0.5 - g));
        p.lean(0.05, 0.1 * g, 0, 0.1 * (g - 0.5));
      }],
      [2.5, (p, b) => {
        const st = (b - 1) * 6, k = Math.floor(st), f = st - k;
        const yaw = TAU * 1.5 * (k + smooth(f / 0.4)) / 9;
        p.foot('L', 0.02, 0, 0, 0.35); p.foot('R', 0.1, 0.1, 0.04, 0.5);
        p.hips(0, -0.06, 0); p.root(0, 0, 0, yaw);
        LA(p, 'L', T.sideUp, T.straightSide, 0.5 + 0.5 * Math.cos(Math.PI * st)); LA(p, 'R', T.sideDown, T.straightSide, 0.5 + 0.5 * Math.cos(Math.PI * st));
      }],
      [3, (p, b) => {
        const k = smooth((b - 2.5) / 0.25);
        p.foot('L', 0.2, 0, 0.16); p.foot('R', 0.16, 0.02, -0.38 * k, 0.9 * k);
        p.hips(0, -0.06 - 0.4 * k, -0.04); p.root(0, 0, 0, Math.PI);
        A(p, 'L', [0.05, 0.2, 0.1]); A(p, 'R', [0.05, 0.2, 0.1]);
        p.lean(0.35 * k, 0.2 * k); p.look(0.5 * k, 0, 0.2 * k);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4 * clamp01((b - 3.5) / 0.3));
        const st = (b - 3) * 6, k = Math.min(4, Math.floor(st)), u = clamp01((k + smooth((st - k) / 0.3)) / 4);
        p.foot('L', 0.2 - 0.04 * u, 0, 0.16 * (1 - u)); p.foot('R', 0.16, 0.02 * (1 - u), -0.38 * (1 - u), 0.9 * (1 - u));
        p.hips(0, -0.46 + 0.34 * u, -0.04); p.root(0, 0, 0, Math.PI * (1 - u));
        LA(p, 'L', [0.05, 0.2, 0.1], T.straightUp, u); LA(p, 'R', [0.05, 0.2, 0.1], [1.4, 1.0, 0.03], u);
        p.lean(0.35 * (1 - u), 0.2 * (1 - u) - 0.1 * u); p.look(0.5 * (1 - u) - 0.2 * u, 0.3 * u);
      }],
    ]);
  },

  // ★★ SOLO — OVERRIDE: drops into bullet time, turns a full circle leaned
  // back while the camera circles him, rises through an arm wave and
  // freezes on one knee, palm up: "come on".
  nullOverride(p, b, B, s) {
    phased(p, b, B, s, [
      [0.75, (p, b) => {
        const k = smooth(b / 0.75);
        p.foot('L', 0.03 + 0.1 * (1 - k), 0, 0.05 * k); p.foot('R', 0.22, 0.04 * k, -0.05, 0.3 * k);
        p.hips(0, -0.06 - 0.3 * k, 0.1 * k);
        p.lean(-0.35 * k, -0.25 * k);
        A(p, 'L', [1.0 + 0.6 * k, 1.1, 0.2]); A(p, 'R', [1.0 + 0.6 * k, 1.1, 0.2]);
        p.look(-0.25 * k);
      }],
      [2.25, (p, b) => {
        const u = (b - 0.75) / 1.5, t = smooth(u), a = TAU * u;
        p.foot('L', 0.03, 0, 0.05); p.foot('R', 0.22, 0.04 + 0.03 * Math.sin(a), -0.05, 0.3);
        p.hips(0, -0.4, 0.14); p.root(0, 0, 0, TAU * t);
        p.lean(-0.62, -0.5, 0.1 * Math.sin(a), 0.05 * Math.sin(a));
        p.look(-0.5);
        p.arm('L', 1.6 + 1.0 * Math.sin(a), 1.2 + 0.3 * Math.cos(a), 0.25);
        p.arm('R', 1.6 - 1.0 * Math.sin(a + 0.7), 1.2 + 0.3 * Math.cos(a + 0.7), 0.25);
      }],
      [3, (p, b, B, s) => {
        const u = smooth((b - 2.25) / 0.75), w = 0.5 - 0.5 * Math.cos(Math.PI * u * 2), k = (x) => bump(x - u, 0.18);
        wideStance(p, 0.22);
        p.hips(0.06 * (1 - 2 * u), -0.4 + 0.28 * u, 0.14 * (1 - u));
        p.lean(-0.62 * (1 - u), -0.5 * (1 - u) - 0.12 * k(0.5));
        p.arm('L', 0.2 * k(0.26), 1.45 + 0.35 * k(0.26), 1.1 * k(0.12) + 0.05, 1.57); p.wrist('L', 0, 0.9 * k(0));
        p.arm('R', 0.2 * k(0.74), 1.45 + 0.35 * k(0.74), 1.1 * k(0.88) + 0.05, 1.57); p.wrist('R', 0, 0.9 * k(1));
        p.shrug(0.3 * k(0.4), 0.3 * k(0.6));
        p.look(-0.5 * (1 - u), 0.3 * (0.5 - u) + 0.1 * w);
      }],
      [Infinity, (p, b, B, s) => {
        const k = smooth((b - 3) / 0.25), c = 0.5 + 0.5 * Math.cos(TAU * (b - 3.25) * 2);
        p.foot('L', 0.2, 0, 0.16); p.foot('R', 0.16, 0.02, -0.38 * k, 0.9 * k);
        p.hips(0, -0.12 - 0.34 * k, -0.04, 0.3 * k);
        p.arm('L', 0.9, 0.9, 0.3 + 1.4 * (1 - c) * smooth((b - 3.25) / 0.1));
        p.wrist('L', -0.6, 0);
        p.arm('R', 0.2, 0.4, 0.5);
        p.lean(0.05, -0.12 * k, 0.2 * k); p.look(-0.15 * k, 0.4 * k);
        p.root(0.004 * Math.sin(B * 40), 0, 0);
      }],
    ]);
  },

  // ── Intro / taunt / victory ─────────────────────────────────────
  // Fixes his shades, raises a hand palm up toward you, curls two fingers
  // — come on — and folds his arms.
  nullIntro(p, b, B, s) {
    groove(p, B, s, 0.4);
    p.foot('L', 0.15, 0, 0.08); p.foot('R', 0.18, 0, -0.04, 0.25);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.4);
        p.hips(0, -0.08, 0, 0.45 * k);
        p.arm('R', 1.35 * k + 0.1, 0.15, 2.55 * k, -1.0); A(p, 'L', T.low);
        p.look(0.15 * k, 0.2 * k);
      }],
      [2, (p, b) => {
        const k = smooth((b - 1) / 0.6);
        p.hips(0, -0.08, 0, 0.45);
        p.arm('L', 0.4 + 0.5 * k, 0.3 + 0.7 * k, 0.3); p.wrist('L', -0.5 * k);
        p.arm('R', 1.35 * (1 - k) + 0.2, 0.25, 2.55 * (1 - k) + 0.4, -0.5);
        p.look(0.15 - 0.25 * k, 0.2 + 0.2 * k);
      }],
      [3, (p, b) => {
        const c = 0.5 - 0.5 * Math.cos(TAU * (b - 2) * 2);
        p.hips(0, -0.08, 0, 0.45);
        p.arm('L', 0.9, 1.0, 0.3 + 1.3 * c); p.wrist('L', -0.5 - 0.6 * c);
        p.arm('R', 0.2, 0.25, 0.4, -0.5);
        p.look(-0.1, 0.4, 0.05);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.3);
        p.hips(0, -0.08, 0, 0.45 - 0.2 * k);
        crossArms(p);
        p.lean(-0.04, -0.14 * k); p.look(-0.12 * k, 0.32, 0.12 * k);
      }],
    ]);
  },

  // The hack: types the exploit on an invisible keyboard, slams ENTER and
  // pushes the code across at you with both palms, then dusts off a shoulder.
  nullHack(p, b, B, s) {
    groove(p, B, s, 0.35);
    phased(p, b, B, s, [
      [1.5, (p, b) => {
        const k = smooth(b / 0.3), ty = Math.sin(TAU * b * 6), ty2 = Math.sin(TAU * b * 6 + 2);
        p.foot('L', 0.16, 0, 0.06); p.foot('R', 0.18, 0, -0.04, 0.2);
        p.hips(0, -0.12, 0, 0.5 * k);
        p.arm('L', 0.75 + 0.06 * ty, 0.25, 1.15 + 0.12 * ty, -0.5); p.wrist('L', 0.3 + 0.25 * ty);
        p.arm('R', 0.75 + 0.06 * ty2, 0.25, 1.15 + 0.12 * ty2, -0.5); p.wrist('R', 0.3 + 0.25 * ty2);
        p.lean(0.18 * k, 0.1 * k); p.look(0.35 * k - 0.25 * win(b, 0.7, 1.2, 0.15), 0.15 + 0.25 * win(b, 0.7, 1.2, 0.15));
      }],
      [2, (p, b) => {
        const t = (b - 1.5) / 0.5, slam = Math.sin(Math.PI * clamp01(t * 1.6));
        p.foot('L', 0.16, 0, 0.06); p.foot('R', 0.18, 0, -0.04, 0.2);
        p.hips(0, -0.12 - 0.08 * smooth(t), 0, 0.5);
        p.arm('L', 0.6, 0.3, 1.0, -0.4);
        p.arm('R', 0.75 + 1.4 * slam, 0.25, 1.15 + 0.5 * slam, -0.5);
        p.lean(0.18, 0.1 + 0.1 * smooth(t)); p.look(0.35);
      }],
      [3.25, (p, b) => {
        const k = smooth((b - 2) / 0.35);
        p.foot('L', 0.16, 0, 0.06 + 0.14 * k); p.foot('R', 0.18, 0, -0.04, 0.4 * k);
        p.hips(0, -0.16, 0.08 * k, 0.75 * k + 0.5 * (1 - k));
        p.arm('L', 1.45, 0.15 + 0.1 * Math.sin(TAU * b * 2), 0.06); p.wrist('L', -1.25 * k);
        p.arm('R', 1.35, -0.05 + 0.1 * Math.sin(TAU * b * 2 + 1), 0.06); p.wrist('R', -1.25 * k);
        p.lean(0.12 * k, 0.1 * k); p.look(-0.05, 0.35 * k);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3.25) / 0.3), d = Math.sin(TAU * (b - 3.25) * 2);
        p.foot('L', 0.16, 0, 0.12); p.foot('R', 0.18, 0, -0.04, 0.25);
        p.hips(0, -0.1, 0.04, 0.45);
        p.arm('R', 1.6, -0.5, 2.0 + 0.3 * d, -0.9);
        A(p, 'L', [0.2, 0.25, 0.3]);
        p.lean(-0.05, -0.15 * k, -0.15 * k); p.look(-0.1, 0.25 - 0.4 * k, 0.15 * k);
      }],
    ]);
  },

  // Victory: shades adjust, arms folded, nodding with the beat, a last pop.
  nullVictory(p, b, B, s) {
    groove(p, B, s, 0.6);
    p.foot('L', 0.17); p.foot('R', 0.19, 0, 0.03, 0.15 * (1 - Math.cos(Math.PI * b)));
    const fix = win(b, 0, 1.8, 0.35);
    p.hips(0.03 * Math.sin(Math.PI * b), -0.08, -0.02, 0.15);
    crossArms(p);
    if (fix > 0) p.arm('R', lerp(0.45, 1.35, fix), lerp(0.1, 0.15, fix), lerp(1.5, 2.55, fix), lerp(-1.25, -1.0, fix));
    p.lean(-0.04, -0.14); p.look(-0.1 + 0.08 * Math.sin(TAU * b), 0.15, 0.06);
  },
};

const moveMeta = {
  labels: {
    nullTick: 'TICKING', nullArmWave: 'ARM WAVE', nullTutBox: 'KING TUT', nullFingerTut: 'FINGER TUT',
    nullBulletDodge: 'BULLET DODGE', nullGlide: 'GLIDE', nullStrobe: 'STROBE', nullWaveDrop: 'WAVE DROP',
    nullHitCombo: 'DIME STOP', nullMatrixLimbo: 'BULLET TIME', nullSystemCrash: 'SYSTEM CRASH', nullOverride: 'OVERRIDE',
  },
  expressions: {
    nullTutGroove: 'focus', nullLiquid: 'smirk', nullGlitchHit: 'focus', nullRoll: 'smirk', nullAccent: 'smirk',
    nullTick: 'focus', nullArmWave: 'smirk', nullTutBox: 'focus', nullFingerTut: 'focus',
    nullBulletDodge: 'o', nullGlide: 'smirk', nullStrobe: 'focus', nullWaveDrop: 'smirk',
    nullHitCombo: 'angry', nullMatrixLimbo: 'focus', nullSystemCrash: 'shout', nullOverride: 'smirk',
    nullIntro: 'smirk', nullHack: 'grin', nullVictory: 'smirk',
  },
  hits: {
    nullLiquid: 0.4, nullRoll: 0.7, nullAccent: 0.4, nullArmWave: 0.3, nullFingerTut: 0.6,
    nullBulletDodge: 0.1, nullGlide: 0.3, nullStrobe: 0.1, nullWaveDrop: 0.2,
    nullMatrixLimbo: 0, nullSystemCrash: 0.1, nullOverride: 0, nullIntro: 0.4, nullHack: 0.4, nullVictory: 0.5,
  },
  fnGroove: {
    nullBulletDodge: 0, nullStrobe: 0, nullWaveDrop: 0, nullMatrixLimbo: 0, nullSystemCrash: 0, nullOverride: 0,
  },
  stiff: { nullGlitchHit: 1.5, nullTick: 1.6, nullTutBox: 1.5, nullHitCombo: 1.5, nullTutGroove: 1.2, nullFingerTut: 1.3, nullStrobe: 1.3 },
};

export default { moves, moveMeta };
