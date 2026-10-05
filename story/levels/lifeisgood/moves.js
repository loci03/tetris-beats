// KAYA's moves — dancehall: the wine, the bogle, gully creepa, pon di
// river, row di boat, log on, tek weh yuhself, wacky dip, willie bounce,
// the butterfly, the dutty wine and signal di plane. Authored with the
// opponent on the dancer's left (+x).
//
// The rig's knees always point forward (the leg IK has no knee twist), so
// the butterfly's knees-in/out is read through the feet swivelling in and
// out on the balls of the feet with the hips pumping.
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, hipHand, wideStance } = kit;
const PI = Math.PI;
const mod4 = (b) => ((b % 4) + 4) % 4;
const armMix = (p, side, A, B, t) => p.arm(side, lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), lerp(A[3] || 0, B[3] || 0, t));
const KNEE = [0.85, 0.3, 0.3, -0.2];          // hand resting on the knee in a squat
const CROWN_L = [0.6, 2.25, 1.75, 0.3];         // hand up on top of the headwrap
const SIGNAL = [0.5, 2.65, 0.05, 0];            // arm straight up: signal di plane
// A hop that only travels while the feet are off the floor: position goes
// from a to b across each beat (eased), the feet lift in between.
const hopX = (b, f) => { const i = Math.floor(b), u = smooth(frac(b) / 0.8); return lerp(f(i), f(i + 1), u); };

// Butterfly legs: deep and wide, on the balls of the feet, the feet swivel
// in and out on the 8ths with the hips pumping.
function butterflyLegs(p, b, depth = 1) {
  const fl = Math.sin(TAU * b * 2), open = 0.5 + 0.5 * fl;
  const w = 0.24 + 0.08 * open;
  p.foot('L', w, 0, 0.02, 0.35 + 0.15 * (1 - open)); p.foot('R', w, 0, 0.02, 0.35 + 0.15 * (1 - open));
  p.hips(0, -0.38 * depth - 0.06 * open * depth, 0.03 * fl, 0);
  p.add('hips', -0.15 * fl, 0, 0);
  return fl;
}

export const moves = {
  // ── Base routines ───────────────────────────────────────────
  // The wine: hips rolling in circles, winding down over two beats and back
  // up, one hand in the air with a loose wrist, the other sliding hip → knee.
  kayaWine(p, b, B, s) {
    groove(p, B, s, 0.8);
    const a = PI * b, cx = Math.cos(a), cz = Math.sin(a), down = 0.5 - 0.5 * Math.cos(PI * b / 2);
    p.foot('L', 0.23, 0, 0, 0.25 * Math.pow(0.5 - 0.5 * cx, 2)); p.foot('R', 0.23, 0, 0, 0.25 * Math.pow(0.5 + 0.5 * cx, 2));
    p.hips(0.1 * cx, -0.1 - 0.26 * down, 0.07 * cz, 0.2 * cx);
    p.add('hips', 0.24 * cz, 0, 0.2 * cx);
    p.lean(0.06 + 0.16 * down, 0.02, -0.1 * cx, -0.1 * cx);
    p.arm('L', 0.55, 2.35 + 0.15 * cx, 0.55, 0.2); p.wrist('L', 0.35 * Math.sin(TAU * b), 0.2 * cx);
    armMix(p, 'R', [-0.25, 0.62, 1.65, -1.45], KNEE, down);
    p.look(0.06 + 0.1 * down, 0.15 * cx, 0.1 * cx);
  },

  // The bogle: arms rolling over each other in big forward circles, the
  // body waving through chest → belly → hips on every beat, weight shifting.
  kayaBogle(p, b, B, s) {
    groove(p, B, s, 0.75);
    const a = PI * b, w = (k) => Math.sin(TAU * b - k), side = Math.cos(a);
    p.foot('L', 0.19, 0, 0, 0.3 * Math.pow(0.5 - 0.5 * side, 2)); p.foot('R', 0.19, 0, 0, 0.3 * Math.pow(0.5 + 0.5 * side, 2));
    p.hips(0.06 * side, -0.14 - 0.04 * w(2.2), 0.05 * w(2), 0.12 * side);
    p.add('spine', 0.14 * w(1)); p.add('chest', 0.22 * w(0));
    p.add('hips', -0.16 * w(2), 0, 0);
    p.arm('L', 1.3 + 0.9 * Math.sin(a), 0.55 + 0.35 * Math.cos(a), 0.75 - 0.4 * Math.sin(a), -0.2);
    p.arm('R', 1.3 - 0.9 * Math.sin(a), 0.55 - 0.35 * Math.cos(a), 0.75 + 0.4 * Math.sin(a), -0.2);
    p.lean(0.1, 0, 0.15 * side, 0.05 * side);
    p.look(-0.2 * w(-0.5), 0.15 * side, 0.08 * side);
  },

  // Gully creepa: low and hunched, sneaking — one leg reaches way out to
  // the side toe-first and slides back, then the other; arms dangle loose,
  // shoulders rolling, head looking round.
  kayaGullyCreepa: seq(4, [
    [0, (p) => { p.foot('R', 0.12); p.foot('L', 0.42, 0, 0.06, 0.55); p.hips(-0.06, -0.2, -0.02, 0.15); p.arm('L', 0.35, 0.5, 0.5); p.arm('R', -0.3, 0.3, 0.4); p.shrug(0.18, -0.05); p.lean(0.3, 0.1, 0.2, 0.15); p.look(0.05, 0.4, 0.1); }],
    [0.5, (p) => { p.foot('R', 0.12); p.foot('L', 0.24, 0.05, 0.02, 0.3); p.hips(0, -0.16, 0, 0.05); p.arms(0.15, 0.3, 0.6); p.lean(0.32, 0.12); p.look(0.08, 0.15); }],
    [1, (p) => { p.foot('L', 0.12); p.foot('R', 0.42, 0, 0.06, 0.55); p.hips(0.06, -0.2, -0.02, -0.15); p.arm('R', 0.35, 0.5, 0.5); p.arm('L', -0.3, 0.3, 0.4); p.shrug(-0.05, 0.18); p.lean(0.3, 0.1, -0.2, -0.15); p.look(0.05, -0.4, -0.1); }],
    [1.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.24, 0.05, 0.02, 0.3); p.hips(0, -0.16, 0, -0.05); p.arms(0.15, 0.3, 0.6); p.lean(0.32, 0.12); p.look(0.08, -0.15); }],
    [2, (p) => { p.foot('R', 0.12, 0, -0.04); p.foot('L', 0.4, 0, 0.14, 0.55); p.hips(-0.06, -0.24, 0.0, 0.25); p.arm('L', 0.5, 0.45, 0.6); p.arm('R', -0.35, 0.3, 0.4); p.shrug(0.2, -0.05); p.lean(0.34, 0.12, 0.3, 0.12); p.look(0.1, 0.5, 0.12); }],
    [2.5, (p) => { p.foot('R', 0.12); p.foot('L', 0.22, 0.06, 0.04, 0.3); p.hips(0, -0.18, 0, 0); p.arms(0.2, 0.3, 0.6); p.lean(0.3, 0.12); p.look(0.06, 0); }],
    [3, (p) => { p.foot('L', 0.12, 0, -0.04); p.foot('R', 0.4, 0, 0.14, 0.55); p.hips(0.06, -0.24, 0.0, -0.25); p.arm('R', 0.5, 0.45, 0.6); p.arm('L', -0.35, 0.3, 0.4); p.shrug(-0.05, 0.2); p.lean(0.34, 0.12, -0.3, -0.12); p.look(0.1, -0.5, -0.12); }],
    [3.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.22, 0.06, 0.04, 0.3); p.hips(0, -0.18, 0, 0); p.arms(0.2, 0.3, 0.6); p.lean(0.3, 0.12); p.look(0.06, 0); }],
  ], { groove: 0.6, hits: 0.7 }),

  // Pon di river, pon di bank: feet-together hops forward-left ("river")
  // and back-right ("bank"), arms swinging through, knees soft.
  kayaPonDiRiver(p, b, B, s) {
    groove(p, B, s, 0.7);
    const fx = (i) => (i % 2 === 0 ? 0.15 : -0.15), fz = (i) => (i % 2 === 0 ? 0.12 : -0.08);
    const X = hopX(b, fx), Z = hopX(b, fz), u = frac(b);
    const lift = 0.22 * Math.sin(PI * clamp01(u / 0.8)), land = Math.exp(-u * 6);
    const side = Math.cos(PI * b);
    p.footX('L', X + 0.1, lift, Z, 1.6 * lift); p.footX('R', X - 0.1, lift, Z, 1.6 * lift);
    p.hips(X, -0.14 + 0.9 * lift - 0.1 * land, Z, 0.2 * side);
    p.arm('L', 0.5 - 1.0 * side, 0.5, 0.8); p.arm('R', 0.5 + 1.0 * side, 0.5, 0.8);
    p.lean(0.1 + 0.06 * side, 0.06, -0.2 * side);
    p.look(0.05, 0.2 * side, 0.05 * side);
  },

  // ── Tier 1 ──────────────────────────────────────────────────
  // Row di boat: knees bouncing, both arms reaching forward and pulling
  // back like oars on every beat, rowing on one side then the other.
  kayaRowBoat(p, b, B, s) {
    groove(p, B, s, 0.8);
    const reach = 0.5 + 0.5 * Math.cos(TAU * b), tw = Math.cos(PI * b / 2);
    wideStance(p, 0.22);
    p.hips(0.04 * tw, -0.18 + 0.05 * reach, -0.03 * reach, 0.25 * tw);
    p.arm('L', lerp(0.35, 1.35, reach), 0.32, lerp(2.0, 0.35, reach), -0.3);
    p.arm('R', lerp(0.35, 1.35, reach), 0.32, lerp(2.0, 0.35, reach), -0.3);
    p.lean(0.12 + 0.22 * reach, 0.08 * reach - 0.08 * (1 - reach), 0.25 * tw);
    p.look(0.1 * reach - 0.1, 0.25 * tw);
  },

  // Log on: knee up high, arms out for balance — stomp it down with a twist
  // ("step pon it"), then the other leg.
  kayaLogOn: seq(4, [
    [0, (p) => { p.foot('R', 0.13); p.foot('L', 0.16, 0.36, 0.12, 0.3); p.hips(-0.05, -0.04, 0, 0.15); p.arm('L', 0.4, 1.3, 1.2, 0.4); p.arm('R', 0.4, 1.3, 1.2, 0.4); p.lean(-0.05, -0.08, 0.1); p.look(0.15, 0.2); }, 'out'],
    [1, (p) => { p.foot('R', 0.13); p.foot('L', 0.22, 0, 0.12, -0.2); p.hips(0.03, -0.2, 0.03, 0.35); p.arm('L', 0.6, 0.3, 0.3); p.arm('R', 0.6, 0.3, 0.3); p.lean(0.3, 0.12, 0.3); p.look(0.3, 0.25); }, 'in'],
    [1.5, (p) => { p.foot('R', 0.13); p.foot('L', 0.16, 0.12, 0.06); p.hips(-0.02, -0.08, 0, 0.1); p.arms(0.4, 0.8, 0.9); p.lean(0.1); }],
    [2, (p) => { p.foot('L', 0.13); p.foot('R', 0.16, 0.36, 0.12, 0.3); p.hips(0.05, -0.04, 0, -0.15); p.arm('L', 0.4, 1.3, 1.2, 0.4); p.arm('R', 0.4, 1.3, 1.2, 0.4); p.lean(-0.05, -0.08, -0.1); p.look(0.15, -0.2); }, 'out'],
    [3, (p) => { p.foot('L', 0.13); p.foot('R', 0.22, 0, 0.12, -0.2); p.hips(-0.03, -0.2, 0.03, -0.35); p.arm('L', 0.6, 0.3, 0.3); p.arm('R', 0.6, 0.3, 0.3); p.lean(0.3, 0.12, -0.3); p.look(0.3, -0.25); }, 'in'],
    [3.5, (p) => { p.foot('L', 0.13); p.foot('R', 0.16, 0.12, 0.06); p.hips(0.02, -0.08, 0, -0.1); p.arms(0.4, 0.8, 0.9); p.lean(0.1); }],
  ], { groove: 0.6, hits: 0.9 }),

  // ── Tier 3 ──────────────────────────────────────────────────
  // Tek weh yuhself: hands crossed at the chest flick out and away on every
  // beat as she steps back, head turned away — then a big push-off at you.
  kayaTekWeh: seq(4, [
    [0, (p) => { p.foot('L', 0.14, 0, 0.06); p.foot('R', 0.15, 0, -0.14, 0.45); p.hips(0, -0.12, -0.05, 0.15); p.arm('L', 0.6, 1.45, 0.15, 0.6); p.arm('R', 0.6, 1.45, 0.15, 0.6); p.wrist('L', -0.6); p.wrist('R', -0.6); p.lean(-0.05, -0.12, 0.1); p.look(-0.1, -0.45, -0.1); }],
    [0.5, (p) => { p.foot('L', 0.14, 0, 0.0); p.foot('R', 0.14, 0.08, -0.05); p.hips(0, -0.08, -0.03); p.arm('L', 1.2, -0.15, 1.7, -1.1); p.arm('R', 1.2, -0.15, 1.7, -1.1); p.lean(0.08, 0.05); p.look(0.05, 0.1); }],
    [1, (p) => { p.foot('R', 0.14, 0, 0.06); p.foot('L', 0.15, 0, -0.14, 0.45); p.hips(0, -0.12, -0.05, -0.15); p.arm('L', 0.6, 1.45, 0.15, 0.6); p.arm('R', 0.6, 1.45, 0.15, 0.6); p.wrist('L', -0.6); p.wrist('R', -0.6); p.lean(-0.05, -0.12, -0.1); p.look(-0.1, 0.45, 0.1); }],
    [1.5, (p) => { p.foot('R', 0.14, 0, 0.0); p.foot('L', 0.14, 0.08, -0.05); p.hips(0, -0.08, -0.03); p.arm('L', 1.2, -0.15, 1.7, -1.1); p.arm('R', 1.2, -0.15, 1.7, -1.1); p.lean(0.08, 0.05); p.look(0.05, -0.1); }],
    [2, (p) => { p.foot('L', 0.14, 0, 0.06); p.foot('R', 0.15, 0, -0.14, 0.45); p.hips(0, -0.12, -0.05, 0.15); p.arm('L', 0.4, 1.1, 0.15, 0.6); p.arm('R', 0.4, 1.1, 0.15, 0.6); p.wrist('L', -0.6); p.wrist('R', -0.6); p.lean(-0.05, -0.12, 0.1); p.look(-0.1, -0.45, -0.1); }],
    [2.5, (p) => { p.foot('L', 0.15, 0, 0.08); p.foot('R', 0.15, 0.06, -0.06); p.hips(0, -0.1, 0, 0.3); p.arm('L', 1.3, 0.1, 2.0, -1.0); p.arm('R', 0.3, 0.4, 1.0); p.lean(0.05); p.look(0, 0.2); }],
    [3, (p) => { p.foot('L', 0.15, 0, 0.18); p.foot('R', 0.17, 0, -0.1, 0.5); p.hips(0.04, -0.1, 0.06, 0.55); p.arm('L', 1.45, 0.35, 0.05, 0.5); p.wrist('L', -0.9); hipHand(p, 'R'); p.lean(0.02, -0.15, 0.3); p.look(-0.2, -0.5, -0.15); }],
    [3.5, (p) => { p.foot('L', 0.15, 0, 0.1); p.foot('R', 0.16, 0, -0.06, 0.4); p.hips(0.02, -0.1, 0.03, 0.4); p.arm('L', 1.2, 0.5, 0.4, 0.3); hipHand(p, 'R'); p.lean(0, -0.1, 0.2); p.look(-0.15, -0.35); }],
  ], { groove: 0.6, hits: 0.7 }),

  // Wacky dip: double-time dips on bowed knees, elbows flapping on the 8ths,
  // shoulders see-sawing, heels popping one after the other.
  kayaWackyDip(p, b, B, s) {
    groove(p, B, s, 0.6);
    const dip = 0.5 + 0.5 * Math.cos(TAU * b * 2), flap = Math.sin(TAU * b * 2), side = Math.cos(PI * b);
    p.foot('L', 0.24, 0, 0, 0.45 * Math.pow(0.5 + 0.5 * side, 2)); p.foot('R', 0.24, 0, 0, 0.45 * Math.pow(0.5 - 0.5 * side, 2));
    p.hips(0.05 * side, -0.14 - 0.14 * dip, 0, 0.12 * side);
    p.arm('L', 0.3, 0.55 + 0.45 * flap, 1.9, 0.5); p.arm('R', 0.3, 0.55 + 0.45 * flap, 1.9, 0.5);
    p.shrug(0.14 * side, -0.14 * side);
    p.lean(0.18 + 0.08 * dip, 0.05, 0.1 * side, 0.12 * side);
    p.look(0.05, 0.2 * side, 0.15 * side);
  },

  // ── Tier 4 ──────────────────────────────────────────────────
  // Dutty wine: down low with hands on the knees, the knees fanning, the
  // whole upper body circling (head rolls kept gentle, braids flying), then
  // up with a hand in the air on 4.
  kayaDuttyWine(p, b, B, s) {
    groove(p, B, s, 0.5);
    const ph = mod4(b), up = win(ph, 2.9, 4.0, 0.4), a = TAU * b;
    const fl = butterflyLegs(p, b, 1 - 0.55 * up);
    p.lean(0.32 * (1 - up) + 0.12 * Math.sin(a) * (1 - up), 0.1 * Math.sin(a), 0.18 * Math.cos(a), 0.15 * Math.cos(a) * (1 - up));
    p.look(0.2 * Math.sin(a + 0.4), 0.1 * Math.cos(a), 0.2 * Math.cos(a + 0.4));
    armMix(p, 'L', [KNEE[0] + 0.1 * fl, KNEE[1], KNEE[2], KNEE[3]], SIGNAL, up);
    p.arm('R', KNEE[0] + 0.1 * fl, KNEE[1], KNEE[2], KNEE[3]);
  },

  // Spin drop: one turn on the left foot, drop into a deep wide squat and
  // wine down there, then rise into the crown pose.
  kayaSpinDrop(p, b, B, s) {
    phased(p, b, B, s, [
      [1.25, (p, b) => {
        const t = smooth(b / 1.25);
        p.foot('L', 0.01, 0, 0, 0.5); p.foot('R', 0.08, 0.16, 0.04, 0.6);
        p.hips(0, -0.03, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.4, 1.5, 0.3); p.arm('R', 0.4, 1.5, 0.3); p.look(-0.1);
      }],
      [1.75, (p, b) => {
        const t = smooth((b - 1.25) / 0.5);
        p.foot('L', 0.13 + 0.2 * t); p.foot('R', 0.13 + 0.2 * t, 0.06 * Math.sin(PI * t));
        p.hips(0, -0.03 - 0.4 * t, 0);
        armMix(p, 'L', [0.4, 1.5, 0.3], KNEE, t); armMix(p, 'R', [0.4, 1.5, 0.3], KNEE, t);
        p.lean(0.3 * t);
      }],
      [3.25, (p, b) => {
        const a = PI * (b - 1.75) * 2, cx = Math.cos(a), cz = Math.sin(a);
        p.foot('L', 0.33, 0, 0, 0.2); p.foot('R', 0.33, 0, 0, 0.2);
        p.hips(0.09 * cx, -0.43 + 0.03 * cz, 0.07 * cz, 0.2 * cx);
        p.add('hips', 0.25 * cz, 0, 0.18 * cx);
        p.arm('L', KNEE[0], KNEE[1] + 0.1 * cx, KNEE[2], KNEE[3]); p.arm('R', KNEE[0], KNEE[1] - 0.1 * cx, KNEE[2], KNEE[3]);
        p.lean(0.3, 0.05, -0.15 * cx, -0.1 * cx); p.look(0.05, 0.25 * cx);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const t = smooth((b - 3.25) / 0.5);
        p.foot('L', 0.33 - 0.2 * t); p.foot('R', 0.33 - 0.14 * t, 0.08 * Math.sin(PI * t), 0, 0.4 * t);
        p.hips(0.05 * t, -0.43 + 0.33 * t, 0, -0.2 * t);
        armMix(p, 'L', KNEE, CROWN_L, t); armMix(p, 'R', KNEE, CROWN_L, t);
        p.lean(0.3 * (1 - t), -0.12 * t, 0, 0.1 * t); p.look(-0.2 * t, 0.2 * t, 0.1 * t);
      }],
    ]);
  },

  // ── ★ Signature moves ───────────────────────────────────────
  // Willie bounce: bouncing on the 8ths, legs kicking out to the side one
  // after the other, fists pumping low, shoulders popping.
  kayaWillieBounce(p, b, B, s) {
    groove(p, B, s, 0.5);
    const side = Math.cos(PI * b), kL = Math.pow(0.5 + 0.5 * side, 3), kR = Math.pow(0.5 - 0.5 * side, 3);
    const bob = 0.5 + 0.5 * Math.cos(TAU * b * 2);
    p.foot('L', 0.13 + 0.25 * kL, 0.16 * kL, 0.08 * kL, 0.3 * kL); p.foot('R', 0.13 + 0.25 * kR, 0.16 * kR, 0.08 * kR, 0.3 * kR);
    p.hips(0.06 * (kR - kL), -0.1 - 0.1 * bob, 0, 0.18 * side);
    const pump = Math.sin(TAU * b * 2);
    p.arm('L', 0.55 + 0.25 * pump, 0.3, 1.6, -0.4); p.arm('R', 0.55 - 0.25 * pump, 0.3, 1.6, -0.4);
    p.shrug(0.15 * (1 - bob));
    p.lean(0.1, 0.05, 0.2 * side, -0.08 * side);
    p.look(0.05 - 0.1 * (1 - bob), 0.25 * side, 0.1 * side);
  },

  // The butterfly: deep and wide, knees fanning on the 8ths, arms out wide
  // flapping slow like wings, rising and sinking over the bar.
  kayaButterfly(p, b, B, s) {
    groove(p, B, s, 0.4);
    const depth = 0.75 + 0.25 * Math.cos(PI * b / 2);
    const fl = butterflyLegs(p, b, depth);
    const wing = Math.sin(PI * b);
    p.arm('L', 0.35, 1.3 + 0.45 * wing, 0.35 + 0.2 * fl, 0.3); p.arm('R', 0.35, 1.3 + 0.45 * wing, 0.35 + 0.2 * fl, 0.3);
    p.wrist('L', 0.35 * Math.cos(PI * b)); p.wrist('R', 0.35 * Math.cos(PI * b));
    p.lean(0.18, -0.04, 0, 0); p.look(-0.05, 0.2 * Math.sin(PI * b / 2));
  },

  // Queen wine (the encore): one spin, then a slow deep wine with an arm
  // sweeping over the head, finishing on signal di plane.
  kayaQueenWine(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const t = smooth(b);
        p.foot('L', 0.01, 0, 0, 0.5); p.foot('R', 0.08, 0.15, 0.04, 0.6);
        p.hips(0, -0.04, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.3, 2.5, 0.4); p.arm('R', 0.5, 0.9, 1.0); p.look(-0.15);
      }],
      [3.2, (p, b) => {
        const u = (b - 1) / 2.2, a = PI * (b - 1) * 2, cx = Math.cos(a), cz = Math.sin(a), down = Math.sin(PI * u);
        p.foot('L', 0.24); p.foot('R', 0.24, 0, 0, 0.3 * Math.pow(0.5 + 0.5 * cx, 2));
        p.hips(0.1 * cx, -0.08 - 0.3 * down, 0.07 * cz, 0.2 * cx);
        p.add('hips', 0.22 * cz, 0, 0.18 * cx);
        const sweep = PI * u;
        p.arm('L', 0.4 + 0.9 * Math.sin(sweep), 2.4 - 1.2 * Math.sin(sweep), 0.5, 0.2); hipHand(p, 'R');
        p.lean(0.1 + 0.15 * down, -0.04, -0.12 * cx, -0.12 * cx); p.look(0.05, 0.2 * cx - 0.3 * Math.sin(sweep), 0.1 * cx);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.6);
        const k = smooth((b - 3.2) / 0.35);
        p.foot('L', 0.13); p.foot('R', 0.22, 0, 0.08, 0.5 * k);
        p.hips(0.08 * k, -0.1, 0, -0.2 * k);
        armMix(p, 'L', [0.4, 2.4, 0.5, 0.2], SIGNAL, k); hipHand(p, 'R');
        p.lean(-0.05, -0.18 * k, 0, 0.12 * k); p.look(-0.35 * k, 0.25 * k);
      }],
    ]);
  },

  // ★★ SOLO — dancehall queen: big bogle rolls, down into the butterfly,
  // a rising spin, and signal di plane to the sky.
  kayaDancehallQueen(p, b, B, s) {
    phased(p, b, B, s, [
      [1.1, (p, b, B, s) => {
        moves.kayaBogle(p, b * 1.5, B, s);
        p.root(0, -0.04 * b, 0);
      }],
      [2.3, (p, b, B, s) => moves.kayaButterfly(p, (b - 1.1) * 1.6 + 1.6, B, s)],
      [3.2, (p, b) => {
        const t = smooth((b - 2.3) / 0.9);
        p.foot('L', 0.01, 0, 0, 0.5 + 0.3 * t); p.foot('R', 0.08, 0.16, 0.04, 0.6);
        p.hips(0, -0.3 + 0.32 * t, 0); p.root(0, 0, 0, TAU * 1.0 * t);
        p.arm('L', 0.4, 1.4 + 1.0 * t, 0.4); p.arm('R', 0.4, 1.4 - 0.4 * t, 0.6);
        p.look(-0.2 * t);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.2) / 0.3), flick = Math.sin(PI * clamp01((b - 3.45) / 0.3));
        p.foot('L', 0.13); p.foot('R', 0.22, 0, 0.08, 0.5 * k);
        p.hips(0.08 * k, -0.1, 0, -0.2 * k);
        p.arm('L', SIGNAL[0] + 0.5 * flick, SIGNAL[1] - 0.6 * flick, SIGNAL[2]); p.wrist('L', -0.6 * flick); hipHand(p, 'R');
        p.lean(-0.05, -0.2 * k, 0, 0.12 * k); p.look(-0.4 * k, 0.3 * k);
      }],
    ], 0.2);
  },

  // Phrase accent (count 5): crown pose — both hands up on the headwrap,
  // hip popped, one knee in.
  kayaAccent(p, b, B, s) {
    groove(p, B, s, 0.7);
    p.foot('L', 0.08, 0, 0.05, 0.5); p.foot('R', 0.16);
    p.hips(-0.07, -0.1, 0, 0.3); p.add('hips', 0, 0, 0.15);
    p.arm('L', CROWN_L[0], CROWN_L[1], CROWN_L[2], CROWN_L[3]); p.arm('R', CROWN_L[0], CROWN_L[1], CROWN_L[2], CROWN_L[3]);
    p.lean(-0.04, -0.15, -0.15, -0.1); p.look(-0.2, -0.3, -0.15);
  },

  // ── Intro / taunt / victory ────────────────────────────────
  // Intro call-out: points you out, "tek weh yuhself" brush-off, finger wag
  // with a head shake, winds down low, crown pose.
  kayaIntro(p, b, B, s) {
    groove(p, B, s, 0.5);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.3), brush = win(b, 0.5, 1.2, 0.25);
        p.foot('L', 0.14, 0, 0.1 * k); p.foot('R', 0.17, 0, -0.04, 0.3);
        p.hips(0.04, -0.08, 0, 0.5 * k);
        armMix(p, 'L', [0.15, 0.1 + 1.45 * k, 0.05], [0.7, 1.5, 0.15, 0.6], brush); p.wrist('L', -0.7 * brush);
        hipHand(p, 'R');
        p.lean(0, -0.12 * k, 0.2 * k); p.look(-0.1, 0.35 * k - 0.6 * brush);
      }],
      [2, (p, b) => {
        const w = Math.sin(TAU * b * 3);
        p.foot('L', 0.14, 0, 0.1); p.foot('R', 0.17, 0, -0.04, 0.3);
        p.hips(0.04, -0.08, 0, 0.45);
        p.arm('L', 1.3, 0.3, 1.75, -0.3 + 0.5 * w); hipHand(p, 'R');
        p.look(0, 0.25 + 0.3 * Math.sin(TAU * b * 2), 0);
      }],
      [3, (p, b, B, s) => moves.kayaWine(p, (b - 2) * 2, B, s)],
      [Infinity, (p, b, B, s) => moves.kayaAccent(p, b - 3, B, s)],
    ], 0.25);
  },

  // Taunt — signal di plane: points to the sky and flicks it down at you
  // (stars fly ~¾ beat in), twice, bouncing; then brushes you off and
  // winds, laughing.
  kayaTaunt(p, b, B, s) {
    groove(p, B, s, 0.6);
    phased(p, b, B, s, [
      [2, (p, b) => {
        const u = frac(b + 0.25), up = u < 0.6 ? smooth(u / 0.6) : 1 - smooth((u - 0.6) / 0.4), fwd = 1 - up;   // raised slowly, flicked at you on ¾
        const side = Math.cos(PI * b);
        p.foot('L', 0.15, 0, 0.1); p.foot('R', 0.17, 0, -0.06, 0.35 * (0.5 + 0.5 * side));
        p.hips(0.03, -0.1 - 0.05 * fwd, 0.02, 0.45);
        p.arm('L', lerp(1.45, SIGNAL[0], up), lerp(0.4, SIGNAL[1], up), 0.05); p.wrist('L', -0.7 * fwd);
        hipHand(p, 'R');
        p.lean(0.06 * fwd, -0.12 * up, 0.25); p.look(-0.25 * up + 0.05, 0.35);
      }],
      [3, (p, b) => {
        const brush = smooth((b - 2) / 0.4);
        p.foot('L', 0.15, 0, 0.12); p.foot('R', 0.16, 0, -0.1, 0.45);
        p.hips(0, -0.12, -0.04, 0.4);
        armMix(p, 'L', [1.2, -0.15, 1.7, -1.1], [0.6, 1.45, 0.15, 0.6], brush); armMix(p, 'R', [1.2, -0.15, 1.7, -1.1], [0.6, 1.45, 0.15, 0.6], brush);
        p.wrist('L', -0.6 * brush); p.wrist('R', -0.6 * brush);
        p.lean(-0.05, -0.12); p.look(-0.1, -0.45 * brush);
      }],
      [Infinity, (p, b, B, s) => moves.kayaWine(p, b * 2, B, s)],
    ], 0.2);
  },

  // Victory: lighters up — both arms waving overhead side to side, winding
  // the hips, a crown pose on 4.
  kayaVictory(p, b, B, s) {
    groove(p, B, s, 0.7);
    const ph = mod4(b), crown = win(ph, 2.75, 4.0, 0.45), a = PI * b, cx = Math.cos(a);
    p.foot('L', 0.2); p.foot('R', 0.2, 0, 0, 0.25 * Math.pow(0.5 + 0.5 * cx, 2));
    p.hips(0.08 * cx, -0.12, 0.05 * Math.sin(a), 0.15 * cx);
    p.add('hips', 0.18 * Math.sin(a), 0, 0.15 * cx);
    armMix(p, 'L', [0.4, 2.5 + 0.25 * cx, 0.3], CROWN_L, crown);
    armMix(p, 'R', [0.4, 2.5 - 0.25 * cx, 0.3], CROWN_L, crown);
    p.lean(0, -0.15, -0.1 * cx, -0.1 * cx); p.look(-0.3, 0.15 * cx, 0.1 * cx);
  },
};

export const moveMeta = {
  labels: {
    kayaRowBoat: 'ROW DI BOAT', kayaLogOn: 'LOG ON', kayaGullyCreepa: 'GULLY CREEPA', kayaPonDiRiver: 'PON DI RIVER',
    kayaTekWeh: 'TEK WEH YUHSELF', kayaWackyDip: 'WACKY DIP', kayaDuttyWine: 'DUTTY WINE', kayaSpinDrop: 'SPIN DROP',
    kayaWillieBounce: 'WILLIE BOUNCE', kayaButterfly: 'BUTTERFLY', kayaQueenWine: 'QUEEN WINE', kayaDancehallQueen: 'DANCEHALL QUEEN',
    kayaWine: 'WINE', kayaBogle: 'BOGLE',
  },
  expressions: {
    kayaWine: 'smirk', kayaBogle: 'smile', kayaGullyCreepa: 'focus', kayaPonDiRiver: 'grin', kayaRowBoat: 'grin', kayaLogOn: 'shout',
    kayaTekWeh: 'smirk', kayaWackyDip: 'joy', kayaDuttyWine: 'focus', kayaSpinDrop: 'smirk', kayaWillieBounce: 'joy',
    kayaButterfly: 'smile', kayaQueenWine: 'smirk', kayaDancehallQueen: 'shout', kayaAccent: 'smirk',
    kayaIntro: 'smirk', kayaTaunt: 'wink', kayaVictory: 'joy',
  },
  hits: {
    kayaWine: 0.7, kayaBogle: 0.8, kayaPonDiRiver: 0.5, kayaRowBoat: 0.9, kayaWackyDip: 1, kayaDuttyWine: 0.5, kayaSpinDrop: 0.2,
    kayaWillieBounce: 0.8, kayaButterfly: 0.5, kayaQueenWine: 0.3, kayaDancehallQueen: 0.1, kayaAccent: 0.4,
    kayaIntro: 0.5, kayaTaunt: 0.5, kayaVictory: 0.6,
  },
  fnGroove: { kayaSpinDrop: 0, kayaQueenWine: 0, kayaDancehallQueen: 0 },
  stiff: { kayaTekWeh: 1.3, kayaWackyDip: 1.3 },
};

export default { moves, moveMeta };
