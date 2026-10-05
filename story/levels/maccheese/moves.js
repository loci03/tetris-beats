// CHEF GOUDA's moves — goofy old-school party dances with a giant wooden
// spoon in the right hand: stir the pot, belly bounce, the sprinkler, the
// bump, spoon-drum hits, seasoning, the cabbage patch, the twist, heel
// clicks, the mixer (a crouched coffee-grinder spin), the chef's kiss,
// Cossack kicks and a presenting spin. Authored with the opponent on the
// dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, hipHand, crossArms, wideStance } = kit;
const PI = Math.PI;
const mod4 = (b) => ((b % 4) + 4) % 4;
// Blend two arm settings [fwd, out, elbow, twist] by t.
const armMix = (p, side, A, B, t) => p.arm(side, lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), lerp(A[3] || 0, B[3] || 0, t));
// Three-way: base A, then B and C mixed in by weights wb, wc.
const arm3 = (p, side, A, B, C, wb, wc) => {
  const k = (i) => (A[i] || 0) + ((B[i] || 0) - (A[i] || 0)) * wb + ((C[i] || 0) - (A[i] || 0)) * wc;
  p.arm(side, k(0), k(1), k(2), k(3));
};
// Hand poses.
const BELLY_L = [0.28, 0.12, 1.3, -0.75], BELLY_R = [0.28, 0.12, 1.3, -0.75];
const TASTE = [1.2, 0.05, 2.45, -0.75];          // spoon up to the mouth
const SPOON_HIGH = [2.75, 0.35, 0.25, 0];        // spoon raised to the sky
const PRESENT_L = [0.55, 1.35, 0.25, 0.4];       // open hand out to the side: voilà

// Raise-and-strike envelope: 0 on the beat, rises slowly, whips down onto
// the next beat (continuous).
const strike = (u) => { u = frac(u); return u < 0.72 ? smooth(u / 0.72) : 1 - smooth((u - 0.72) / 0.28); };

// Heel-click phases (shared by the move and the solo).
const heelWind = (p, b) => {
  const k = smooth(b);
  wideStance(p, 0.17);
  p.hips(0, -0.04 - 0.28 * k, -0.04 * k);
  p.arms(0.8 - 1.1 * k, 0.3, 0.4);
  p.lean(0.3 * k, 0.1 * k); p.look(0.1 * k);
};
const heelAir = (p, t, a0 = -0.3) => {   // t: 0 → 1 across the jump; a0: where the arms start
  const air = Math.sin(PI * t), click = Math.sin(PI * clamp01((t - 0.15) / 0.7));
  p.hips(0.05 * air, lerp(-0.32, -0.04, smooth(t / 0.3)) + 0.6 * air, 0);
  p.tumble(0, 0.32 * click);
  p.footX('L', lerp(0.17, -0.22, click), 0.5 * air, 0.02, 0.4 * air);
  p.footX('R', lerp(-0.17, -0.3, click), 0.5 * air, -0.02, 0.4 * air);
  const up = smooth(t / 0.6);
  p.arm('R', lerp(a0, 2.8, up), 0.3 + 0.1 * up, 0.4 - 0.25 * up); p.arm('L', lerp(a0, 0.4, up), 1.9 * air + 0.3, 0.2);
  p.look(-0.3 * air, 0, 0.2 * click);
};
const heelLand = (p, u) => {            // u: 0 → 1 absorbing the landing
  const give = Math.sin(PI * clamp01(u));
  wideStance(p, 0.2);
  p.hips(0, -0.06 - 0.3 * give);
  p.arm('R', 2.0, 0.6, 0.4); p.arm('L', 0.5, 1.6, 0.3);
  p.lean(0.25 * give);
};
const HEEL = [
  [1, heelWind],
  [2, (p, b) => heelAir(p, b - 1)],
  [2.6, (p, b) => heelLand(p, (b - 2) / 0.6)],
  [Infinity, (p, b, B, s) => {
    groove(p, B, s, 0.5);
    const k = smooth((b - 2.6) / 0.5), bow = win(b, 2.8, 3.8, 0.35);
    p.foot('L', 0.14, 0, 0.12 * k); p.foot('R', 0.17, 0, -0.06 * k, 0.4 * k);
    p.hips(0, -0.1 - 0.08 * bow, -0.03);
    p.arm('R', lerp(1.6, 0.6, k), lerp(0.9, 1.5, k), 0.25); p.arm('L', 0.6, 1.5, 0.25, 0.3);
    p.lean(0.45 * bow, 0.1 * bow); p.look(0.25 * bow - 0.15 * (1 - bow));
  }],
];

export const moves = {
  // ── Base routines ───────────────────────────────────────────
  // Stir the pot: weight rocking foot to foot, the spoon stirring a big
  // circle in front of the belly, the other hand steadying the pot; tastes
  // it on 4 ("mmm!").
  goudaStirPot(p, b, B, s) {
    groove(p, B, s, 0.9);
    const ph = mod4(b), a = TAU * b / 2, shift = Math.cos(PI * b);
    const taste = win(ph, 2.75, 4, 0.4);
    p.foot('L', 0.21, 0, 0, 0.4 * Math.pow(0.5 - 0.5 * shift, 2));
    p.foot('R', 0.21, 0, 0, 0.4 * Math.pow(0.5 + 0.5 * shift, 2));
    p.hips(0.06 * shift + 0.04 * Math.cos(a) * (1 - taste), -0.13, 0.02, 0.22 * Math.cos(a) * (1 - taste));
    armMix(p, 'R', [0.8 + 0.35 * Math.sin(a), 0.05 + 0.5 * Math.cos(a), 0.85 - 0.35 * Math.sin(a), -0.4], TASTE, taste);
    armMix(p, 'L', [0.5 + 0.06 * Math.sin(a), 0.32, 1.0, -0.3], BELLY_L, taste);
    p.lean(0.16 * (1 - taste) - 0.06 * taste, 0.04, 0.25 * Math.cos(a) * (1 - taste), 0.08 * Math.sin(a) * (1 - taste));
    p.look(0.22 * (1 - taste) - 0.12 * taste, 0.12 * Math.sin(a) * (1 - taste) - 0.15 * taste, 0.12 * taste);
  },

  // Belly bounce: both hands patting the belly, heel taps out front foot
  // after foot, shoulders shaking with laughter.
  goudaBellyBounce(p, b, B, s) {
    groove(p, B, s, 1.1);
    const side = Math.cos(PI * b);
    const tL = 0.5 + 0.5 * side, tR = 1 - tL;
    p.foot('L', 0.15, 0.06 * 4 * tL * tR * tR, 0.17 * tL, -0.45 * tL);
    p.foot('R', 0.15, 0.06 * 4 * tR * tL * tL, 0.17 * tR, -0.45 * tR);
    p.hips(-0.045 * side, -0.12, -0.02, 0.1 * side);
    const pat = Math.sin(TAU * b * 2);
    p.arm('L', BELLY_L[0], BELLY_L[1], BELLY_L[2] + 0.18 * pat, BELLY_L[3]);
    p.arm('R', BELLY_R[0], BELLY_R[1], BELLY_R[2] - 0.18 * pat, BELLY_R[3]);
    p.shrug(0.05 * Math.sin(TAU * b * 4));
    p.lean(-0.08, -0.08, 0.1 * side);
    p.look(-0.12, 0.22 * side, 0.12 * side);
  },

  // The sprinkler: hand behind the head, the spoon arm ticking across in
  // eight staccato clicks, then whooshing back; the toe taps out with it.
  goudaSprinkler(p, b, B, s) {
    groove(p, B, s, 0.9);
    const ph = mod4(b);
    let out;
    if (ph < 2) { const st = ph * 4, k = Math.floor(st) + smooth(frac(st) / 0.35); out = 1.45 - (1.5 / 8) * k; }
    else out = lerp(-0.05, 1.45, smooth((ph - 2) / 2));
    const tick = ph < 2 ? Math.exp(-frac(ph * 4) * 6) : 0;
    p.arm('R', 1.5, out, 0.12, 0); p.wrist('R', -0.25 * tick);
    p.arm('L', 0.25, 2.2, 2.55, 0.9);
    const sweep = (1.45 - out) / 1.75;                    // 0 at the side → 1 across the front
    p.foot('L', 0.13); p.foot('R', 0.26, 0, 0.04, 0.55);
    p.hips(0.05, -0.13 - 0.03 * tick, 0, 0.25 * sweep - 0.1);
    p.lean(0.04, -0.05, 0.15 * sweep, 0.06);
    p.look(-0.05, -0.5 + 0.55 * sweep, 0.08);
  },

  // The bump: hip bumps out left, right, left, then a big BELLY BUMP
  // forward, arms swinging the other way each time.
  goudaBump: seq(4, [
    [0, (p) => { p.foot('L', 0.24); p.foot('R', 0.18, 0, 0, 0.3); p.hips(0.11, -0.14, 0, 0.2); p.add('hips', 0, 0, -0.18); p.arm('L', -0.2, 0.5, 0.6); p.arm('R', 0.9, -0.2, 1.4, -0.5); p.lean(0, -0.02, -0.15, 0.12); p.look(-0.05, 0.3, -0.1); }],
    [0.5, (p) => { wideStance(p, 0.2); p.hips(0, -0.07); p.arms(0.45, 0.4, 1.3); p.lean(0.04); }],
    [1, (p) => { p.foot('R', 0.24); p.foot('L', 0.18, 0, 0, 0.3); p.hips(-0.11, -0.14, 0, -0.2); p.add('hips', 0, 0, 0.18); p.arm('R', -0.2, 0.5, 0.6); p.arm('L', 0.9, -0.2, 1.4, -0.5); p.lean(0, -0.02, 0.15, -0.12); p.look(-0.05, -0.3, 0.1); }],
    [1.5, (p) => { wideStance(p, 0.2); p.hips(0, -0.07); p.arms(0.45, 0.4, 1.3); p.lean(0.04); }],
    [2, (p) => { p.foot('L', 0.24); p.foot('R', 0.18, 0, 0, 0.3); p.hips(0.12, -0.15, 0, 0.22); p.add('hips', 0, 0, -0.2); p.arm('L', -0.2, 0.5, 0.6); p.arm('R', 0.9, -0.2, 1.4, -0.5); p.lean(0, -0.02, -0.15, 0.12); p.look(-0.05, 0.3, -0.1); }],
    [2.5, (p) => { wideStance(p, 0.19); p.hips(0, -0.18, -0.05); p.arms(-0.5, 0.35, 0.6); p.lean(0.18, 0.1); p.look(0.1); }],
    [3, (p) => { p.foot('L', 0.17, 0, 0.08); p.foot('R', 0.17, 0, -0.04, 0.3); p.hips(0, -0.08, 0.12); p.arms(-0.55, 0.55, 0.3); p.lean(-0.22, -0.2); p.look(-0.3); p.shrug(0.15); }],
    [3.5, (p) => { wideStance(p, 0.2); p.hips(0.05, -0.1, 0.02); p.arms(0.3, 0.45, 1.1); p.lean(0.02, -0.04); }],
  ], { groove: 0.8, hits: 0.9 }),

  // ── Tier 1 ──────────────────────────────────────────────────
  // Spoon-drum hits: hunched over a row of pots, spoon on the beats, the
  // free hand on the "and"s, cymbal crash with both arms on 4.
  goudaSpoonDrum(p, b, B, s) {
    groove(p, B, s, 0.8);
    const ph = mod4(b), crash = win(ph, 2.85, 3.95, 0.3);
    const uR = strike(b), uL = strike(b + 0.5);
    wideStance(p, 0.21);
    p.foot('L', 0.21, 0, 0, 0.3 * uL * (1 - crash));
    p.hips(0.03 * Math.sin(PI * b), -0.17 + 0.06 * crash, 0.0, 0.12 * (uR - uL) * (1 - crash));
    arm3(p, 'R', [0.7 + 0.25 * uR, 0.2, 0.85 + 0.9 * uR, -0.3], [2.4, 1.3, 0.3, 0.2], [2.4, 1.3, 0.3, 0.2], crash, 0);
    arm3(p, 'L', [0.7 + 0.25 * uL, 0.25, 0.85 + 0.9 * uL, -0.3], [2.3, 1.4, 0.3, 0.2], [2.3, 1.4, 0.3, 0.2], crash, 0);
    p.lean(0.24 * (1 - crash) - 0.1 * crash, 0.06 - 0.12 * crash);
    p.look(0.18 * (1 - crash) - 0.3 * crash + 0.06 * (1 - uR), 0.15 * (uL - uR) * (1 - crash));
  },

  // Season it: step-touch, the free hand sprinkling from up high with a
  // wrist flick on every 8th, swept over the shoulder on 3, spoon on the hip.
  goudaSeasoning(p, b, B, s) {
    groove(p, B, s, 0.85);
    const ph = mod4(b), side = Math.cos(PI * b);
    const tL = 0.5 + 0.5 * side, tR = 1 - tL;
    // Step-touch: out on each beat, the other foot closes in on its toe.
    p.footX('L', 0.12 + 0.12 * tL, 0.07 * 4 * tL * tR * tR, 0, 0.45 * tR);
    p.footX('R', -0.12 - 0.12 * tR, 0.07 * 4 * tR * tL * tL, 0, 0.45 * tL);
    p.hips(0.07 * side, -0.12, 0, 0.12 * side);
    const over = win(ph, 1.8, 3.4, 0.45);
    const flick = Math.sin(TAU * b * 2);
    armMix(p, 'L', [2.35, 0.55, 0.9, 0.2], [2.55, -0.25, 1.4, -0.6], over);
    p.wrist('L', 0.45 * flick, 0.2 * flick);
    hipHand(p, 'R');
    p.lean(-0.04, -0.12 - 0.08 * over, 0.1 * side - 0.25 * over, 0.05 * side);
    p.look(-0.22 - 0.1 * over, 0.2 * side + 0.35 * over, -0.1 * over);
  },

  // ── Tier 2 ──────────────────────────────────────────────────
  // Cabbage patch, chef style: both fists (spoon too) churning a circle on
  // every beat, the belly circling the other way, stepping foot to foot.
  goudaCabbage(p, b, B, s) {
    groove(p, B, s, 0.8);
    const a = TAU * b, c = Math.cos(a), sn = Math.sin(a), side = Math.cos(PI * b);
    p.foot('L', 0.2, 0, 0, 0.35 * Math.pow(0.5 - 0.5 * side, 2));
    p.foot('R', 0.2, 0, 0, 0.35 * Math.pow(0.5 + 0.5 * side, 2));
    p.hips(0.08 * c, -0.17 + 0.03 * sn, 0.04 * sn, 0.12 * c);
    p.arm('L', 0.8 + 0.35 * sn, 0.22 + 0.35 * c, 1.35, -0.5);
    p.arm('R', 0.8 + 0.35 * sn, 0.22 - 0.35 * c, 1.35, -0.5);
    p.lean(0.1 + 0.08 * sn, 0.1 * sn, -0.2 * c, 0.12 * c);
    p.look(0.05, 0.15 * c, -0.18 * c);
  },

  // ── Tier 3 ──────────────────────────────────────────────────
  // The twist: pelvis twisting on every beat, shoulders countering, arms
  // swinging, twisting down low over two beats and back up — lifting one
  // foot to twist on the other leg on 3.
  goudaTwist(p, b, B, s) {
    groove(p, B, s, 0.55);
    const ph = mod4(b), tw = Math.cos(TAU * b), down = 0.5 - 0.5 * Math.cos(PI * b / 2);
    const lift = win(ph, 2.55, 3.75, 0.35);
    p.foot('L', 0.13, 0, 0.1, 0.25);
    p.foot('R', 0.15, 0.16 * lift, -0.06 + 0.12 * lift, 0.5 * (1 - lift));
    p.hips(-0.03 * lift, -0.12 - 0.26 * down, 0.01, 0.3 * tw);
    p.lean(0.12 + 0.15 * down, 0.04, -0.62 * tw, 0);
    p.arm('L', 0.5 - 0.45 * tw, 0.42, 1.45, -0.2);
    p.arm('R', 0.5 + 0.45 * tw, 0.42, 1.45, -0.2);
    p.look(-0.1 - 0.1 * down, 0.15 * tw, 0);
  },

  // ── Tier 4 ──────────────────────────────────────────────────
  // Heel click: wind up, jump and click the heels together off to the side
  // (spoon to the sky), land soft, then a jolly bow, arms wide — ta-da!
  goudaHeelClick(p, b, B, s) { phased(p, b, B, s, HEEL); },

  // The mixer: drops into a crouch on one foot and sweeps the other leg
  // round like a mixer blade, twice, spoon out, then pops back up.
  goudaMixer(p, b, B, s) {
    phased(p, b, B, s, [
      [0.75, (p, b) => {
        const t = smooth(b / 0.75);
        p.foot('L', 0.13 - 0.1 * t); p.foot('R', 0.13 + 0.35 * t, 0.1 * Math.sin(PI * t), 0.05 * t);
        p.hips(0, -0.04 - 0.42 * t, 0);
        p.arm('R', 1.0 + 0.5 * t, 1.0 * t, 0.2); p.arm('L', 0.9, 0.6, 1.4 * t, -0.6);
        p.lean(0.2 * t);
      }],
      [3.1, (p, b) => {
        const u = (b - 0.75) / 2.35, ang = TAU * 2 * smooth(u);
        p.foot('L', 0.03, 0, 0, 0.3); p.foot('R', 0.5, 0.02, 0.05);
        p.hips(0.06, -0.47 + 0.02 * Math.sin(TAU * u * 4), 0); p.root(0, 0, 0, ang);
        p.arm('R', 1.5, 1.3, 0.15); p.arm('L', 1.1, 0.35, 1.3, -0.6);
        p.lean(0.22, 0.05, 0, 0.1); p.look(-0.05, 0.25);
      }],
      [Infinity, (p, b, B, s) => {
        const t = smooth((b - 3.1) / 0.5);
        groove(p, B, s, 0.5 * t);
        p.foot('L', 0.03 + 0.11 * t); p.foot('R', 0.5 - 0.33 * t, 0.12 * Math.sin(PI * t));
        p.hips(0.06 * (1 - t), -0.47 + 0.37 * t, 0);
        armMix(p, 'R', [1.5, 1.3, 0.15], SPOON_HIGH, t); armMix(p, 'L', [1.1, 0.35, 1.3, -0.6], PRESENT_L, t);
        p.lean(0.22 * (1 - t), -0.15 * t); p.look(-0.3 * t, 0.2 * t);
      }],
    ]);
  },

  // ── ★ Signature moves ───────────────────────────────────────
  // Chef's kiss: fingertips to the lips … MWAH! flung out wide, twice, the
  // second one bigger with the belly out; then hands clasped, swaying.
  goudaChefKiss: seq(4, [
    [0, (p) => { p.foot('L', 0.14, 0, 0.06); p.foot('R', 0.16, 0, -0.04, 0.35); p.hips(0, -0.1, 0, 0.2); p.arm('L', 1.15, -0.05, 2.5, -0.75); hipHand(p, 'R'); p.lean(0.04, 0.02, 0.1); p.look(0.08, 0.1, 0.12); }],
    [1, (p) => { p.foot('L', 0.14, 0, 0.14); p.foot('R', 0.17, 0.08, -0.12, 0.6); p.hips(0, -0.04, 0.05, 0.35); p.arm('L', 1.0, 1.45, 0.1, 0.3); p.arm('R', 0.6, 1.0, 0.6); p.lean(-0.1, -0.15, 0.2); p.look(-0.25, 0.3, 0.1); }, 'out'],
    [1.5, (p) => { p.foot('L', 0.14, 0, 0.06); p.foot('R', 0.16, 0, -0.04, 0.35); p.hips(0, -0.12, 0, 0.15); p.arm('L', 1.1, 0.1, 2.3, -0.7); p.arm('R', 0.4, 0.4, 1.0); p.lean(0.06, 0.04); p.look(0.05, 0.1); }],
    [2, (p) => { p.foot('L', 0.15, 0, 0.06); p.foot('R', 0.17, 0, -0.04, 0.35); p.hips(0, -0.1, 0, 0.1); p.arm('L', 1.15, -0.05, 2.5, -0.75); p.arm('R', 0.35, 0.45, 1.1); p.lean(0.05, 0.03); p.look(0.1, 0, 0.1); }],
    [3, (p) => { wideStance(p, 0.24); p.hips(0, -0.05, 0.1); p.arm('L', 0.6, 1.7, 0.1, 0.4); p.arm('R', 0.6, 1.7, 0.1, 0.4); p.lean(-0.28, -0.25); p.look(-0.4, 0.1); p.shrug(0.12); }, 'out'],
    [3.5, (p) => { p.foot('L', 0.16); p.foot('R', 0.17, 0, 0, 0.3); p.hips(0.03, -0.12, 0, 0.15); p.arm('L', 0.9, 0.0, 1.8, -1.1); p.arm('R', 0.9, 0.0, 1.8, -1.1); p.lean(0.04, -0.04, 0.1); p.look(-0.1, 0.2, 0.15); }],
  ], { groove: 0.6, hits: 0.6 }),

  // Cossack kicks: down into a deep squat, arms folded high, kicking one
  // leg out straight on every beat with a hop — HEY! arms flung on 4.
  goudaCossack(p, b, B, s) {
    groove(p, B, s, 0.5);
    const ph = mod4(b), side = Math.cos(PI * b);           // +1: left leg kicks
    const kL = Math.pow(0.5 + 0.5 * side, 3), kR = Math.pow(0.5 - 0.5 * side, 3);
    const into = smooth(b / 0.5), hey = win(ph, 2.7, 4.0, 0.4);
    const hop = Math.pow(Math.sin(PI * frac(b)), 4);         // little hop as the legs swap
    p.foot('L', 0.12 + 0.24 * kL * into, 0.04 * hop + 0.34 * kL * into, -0.04 + 0.6 * kL * into, -0.2 * kL);
    p.foot('R', 0.12 + 0.24 * kR * into, 0.04 * hop + 0.34 * kR * into, -0.04 + 0.6 * kR * into, -0.2 * kR);
    p.hips(0.05 * (kR - kL), -0.03 - 0.44 * into + 0.06 * hop, -0.1 * into);
    const fold = [1.45, 0.1, 1.6, -1.35];
    armMix(p, 'L', fold, [0.7, 2.2, 0.15, 0.3], hey);
    armMix(p, 'R', [1.4, 0.1, 1.55, -1.3], [0.7, 2.2, 0.15, 0.3], hey);
    p.lean(-0.08 * into, -0.12, 0.08 * side);
    p.look(-0.12 - 0.15 * hey, 0.1 * side);
  },

  // Presenting spin: two turns on the left foot with the spoon held out,
  // then the chef presents his dish — spoon high, open hand, chin up.
  goudaPotSpin(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b) => {
        const t = smooth(b / 2);
        p.foot('L', 0.01, 0, 0, 0.45); p.foot('R', 0.08, 0.17, 0.04, 0.5);
        p.hips(0, -0.04 + 0.03 * Math.sin(PI * t), 0); p.root(0, 0, 0, TAU * 2 * t);
        p.arm('R', 1.5, 1.4, 0.1); p.arm('L', 0.9, 0.5, 1.6, -0.6);
        p.look(-0.1, 0.2);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.6);
        const k = smooth((b - 2) / 0.4), bob = Math.sin(PI * clamp01((b - 2) / 0.5));
        p.foot('L', 0.13); p.foot('R', 0.22, 0, 0.1, 0.5 * k);
        p.hips(0.06 * k, -0.08 - 0.1 * bob, 0, -0.15 * k);
        armMix(p, 'R', [1.5, 1.4, 0.1], SPOON_HIGH, k); armMix(p, 'L', [0.9, 0.5, 1.6, -0.6], PRESENT_L, k);
        p.lean(-0.06 * k, -0.18 * k, 0.1 * k, 0.1 * k); p.look(-0.3 * k, 0.3 * k);
      }],
    ]);
  },

  // ★★ SOLO — cheese storm: a huge stir, two Cossack kicks, a heel-click
  // jump, and land presenting with a chef's kiss.
  goudaCheeseStorm(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => {
        const a = TAU * b * 1.5;
        wideStance(p, 0.24);
        p.hips(0.08 * Math.cos(a), -0.2 - 0.1 * b, 0.04 * Math.sin(a), 0.25 * Math.sin(a));
        p.arm('R', 1.2 + 0.4 * Math.sin(a), 0.2 + 0.6 * Math.cos(a), 0.4, -0.3);
        p.arm('L', 1.0, 0.9, 1.2, -0.3);
        p.lean(0.2, 0.1, 0.35 * Math.cos(a)); p.look(0.1, 0.2 * Math.cos(a));
      }],
      [2.25, (p, b, B, s) => moves.goudaCossack(p, (b - 1) * 1.76 + 0.3, B, s)],
      [3.0, (p, b) => heelAir(p, (b - 2.25) / 0.75, 1.4)],
      [3.3, (p, b) => heelLand(p, (b - 3.0) / 0.3)],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.3) / 0.3), kiss = win(b, 3.35, 4.4, 0.45);
        p.foot('L', 0.14); p.foot('R', 0.22, 0, 0.1, 0.5 * k);
        p.hips(0.06 * k, -0.1 - 0.12 * (1 - k), 0, -0.15 * k);
        armMix(p, 'R', [2.0, 0.6, 0.4], SPOON_HIGH, k);
        armMix(p, 'L', [0.5, 1.6, 0.3], [1.15, -0.05, 2.5, -0.75], kiss);
        p.lean(-0.06, -0.16 * k, 0.1 * k); p.look(-0.25 * k + 0.1 * kiss, 0.2 * k);
      }],
    ], 0.25);
  },

  // Phrase accent (count 3): VOILÀ — spoon up, open hand out, chin up, heel lifted.
  goudaAccent(p, b, B, s) {
    groove(p, B, s, 0.7);
    p.foot('L', 0.13); p.foot('R', 0.22, 0, 0.1, 0.5);
    p.hips(0.06, -0.1, 0, -0.15);
    p.arm('R', SPOON_HIGH[0], SPOON_HIGH[1], SPOON_HIGH[2]);
    p.arm('L', PRESENT_L[0], PRESENT_L[1], PRESENT_L[2], PRESENT_L[3]);
    p.lean(-0.06, -0.18, 0.1, 0.1); p.look(-0.3, 0.3);
  },

  // ── Intro / taunt / victory ────────────────────────────────
  // Intro call-out: points the spoon at you, has a taste, "pfft — needs
  // salt!" head shake and finger wag, then a big belly laugh.
  goudaIntro(p, b, B, s) {
    groove(p, B, s, 0.45);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.3);
        p.foot('L', 0.14, 0, 0.12 * k); p.foot('R', 0.17);
        p.hips(0, -0.08, 0, 0.55 * k);
        p.arm('R', 1.5, -0.35 * k + 0.2, 0.1); hipHand(p, 'L');
        p.lean(0, -0.12 * k, 0.2 * k); p.look(-0.1, 0.35 * k);
      }],
      [2, (p, b) => {
        p.foot('L', 0.14, 0, 0.12); p.foot('R', 0.17);
        p.hips(0, -0.06, 0, 0.35);
        p.arm('R', TASTE[0], TASTE[1], TASTE[2], TASTE[3]); hipHand(p, 'L');
        p.look(-0.1 + 0.08 * Math.sin(TAU * b * 2), 0.1, 0.1);
      }],
      [3, (p, b) => {
        const w = Math.sin(TAU * b * 3);
        p.foot('L', 0.14, 0, 0.12); p.foot('R', 0.17);
        p.hips(0, -0.08, 0, 0.45);
        p.arm('L', 1.3, 0.3, 1.75, -0.3 + 0.55 * w);
        p.arm('R', 0.5, 0.6, 1.0);
        p.look(0, 0.3 + 0.3 * Math.sin(TAU * b * 2), 0);
      }],
      [Infinity, (p, b) => {
        const shake = Math.sin(TAU * b * 4);
        wideStance(p, 0.2);
        p.hips(0, -0.1 + 0.03 * shake, -0.03, 0.3);
        p.arm('L', BELLY_L[0], BELLY_L[1], BELLY_L[2] + 0.15 * shake, BELLY_L[3]);
        p.arm('R', BELLY_R[0], BELLY_R[1], BELLY_R[2] - 0.15 * shake, BELLY_R[3]);
        p.lean(-0.25, -0.15); p.look(-0.35, 0.2); p.shrug(0.06 * shake);
      }],
    ], 0.3);
  },

  // Taunt: scoops a dollop of molten cheese and catapults it at you with
  // the spoon (lands ~¾ beat in), shades his eyes to watch it fly, then
  // points and laughs, belly shaking.
  goudaTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    phased(p, b, B, s, [
      [0.6, (p, b) => {
        const k = smooth(b / 0.6);
        p.foot('L', 0.15, 0, 0.12); p.foot('R', 0.19, 0, -0.08, 0.3);
        p.hips(0, -0.06 - 0.18 * k, -0.04, 0.4 - 0.5 * k);
        p.arm('R', lerp(0.5, -0.35, k), 0.4, lerp(0.6, 0.2, k)); p.arm('L', 0.8, 0.6, 0.6);
        p.lean(0.3 * k, 0.1 * k, -0.2 * k); p.look(0.15 * k, -0.2 * k);
      }],
      [1.5, (p, b) => {
        const k = smooth((b - 0.45) / 0.55);
        p.foot('L', 0.15, 0, 0.16); p.foot('R', 0.19, 0.06, -0.12, 0.6);
        p.hips(0.03, -0.1, 0.05, 0.6 * k);
        p.arm('R', lerp(-0.35, 2.2, k), lerp(0.4, -0.3, k), lerp(0.2, 0.1, k)); p.arm('L', 0.4, 0.9, 0.5);
        p.lean(lerp(0.3, -0.05, k), -0.12 * k, 0.4 * k); p.look(-0.15 * k, 0.4 * k);
      }],
      [2.2, (p, b) => {
        p.foot('L', 0.15, 0, 0.14); p.foot('R', 0.19, 0, -0.1, 0.4);
        p.hips(0.03, -0.08, 0.03, 0.55);
        p.arm('L', 1.45, 0.75, 2.4, -1.3); p.arm('R', 1.2, -0.2, 0.3);
        p.lean(-0.04, -0.06, 0.25); p.look(-0.12, 0.45, 0);
      }],
      [Infinity, (p, b) => {
        const shake = Math.sin(TAU * b * 4);
        p.foot('L', 0.16, 0, 0.08); p.foot('R', 0.19, 0, -0.06, 0.3);
        p.hips(0, -0.1 + 0.03 * shake, -0.03, 0.5);
        p.arm('R', 1.4, -0.3, 0.15);
        p.arm('L', BELLY_L[0], BELLY_L[1], BELLY_L[2] + 0.15 * shake, BELLY_L[3]);
        p.lean(-0.22, -0.18, 0.15); p.look(-0.3, 0.35); p.shrug(0.07 * shake);
      }],
    ], 0.25);
  },

  // Victory: hops with arms wide on 1 and 2, chef's kiss on 3, presents on 4.
  goudaVictory(p, b, B, s) {
    groove(p, B, s, 0.6);
    const ph = mod4(b), u = frac(b), jump = ph < 2 ? Math.sin(PI * clamp01(u * 1.4)) : 0;
    const kiss = win(ph, 1.55, 3.15, 0.5), pres = win(ph, 2.7, 4.0, 0.45);
    p.root(0, 0.22 * jump, 0, 0);
    p.foot('L', 0.15, 0.2 * jump, 0, 0.4 * jump); p.foot('R', 0.15 + 0.07 * pres, 0.2 * jump, 0.08 * pres, 0.4 * jump + 0.5 * pres);
    p.hips(0.05 * pres, -0.08 - 0.06 * (1 - jump), 0, -0.12 * pres);
    arm3(p, 'R', [0.4, 2.4, 0.3], [0.4, 2.0, 0.6], SPOON_HIGH, kiss, pres);
    arm3(p, 'L', [0.4, 2.4, 0.3], [1.15, -0.05, 2.5, -0.75], PRESENT_L, kiss, pres);
    p.lean(0, -0.18); p.look(-0.3 + 0.2 * kiss, 0.2 * pres);
  },
};

export const moveMeta = {
  labels: {
    goudaSpoonDrum: 'SPOON DRUM', goudaSeasoning: 'SEASON IT', goudaSprinkler: 'THE SPRINKLER', goudaCabbage: 'CABBAGE PATCH',
    goudaTwist: 'THE TWIST', goudaBump: 'THE BUMP', goudaHeelClick: 'HEEL CLICK', goudaMixer: 'THE MIXER',
    goudaChefKiss: "CHEF'S KISS", goudaCossack: 'COSSACK KICKS', goudaPotSpin: 'VOILÀ SPIN', goudaCheeseStorm: 'CHEESE STORM',
    goudaStirPot: 'STIR THE POT', goudaBellyBounce: 'BELLY BOUNCE',
  },
  expressions: {
    goudaStirPot: 'smile', goudaBellyBounce: 'joy', goudaSprinkler: 'grin', goudaBump: 'grin', goudaSpoonDrum: 'focus',
    goudaSeasoning: 'smirk', goudaCabbage: 'grin', goudaTwist: 'joy', goudaHeelClick: 'shout', goudaMixer: 'focus',
    goudaChefKiss: 'kiss', goudaCossack: 'shout', goudaPotSpin: 'grin', goudaCheeseStorm: 'shout', goudaAccent: 'grin',
    goudaIntro: 'smirk', goudaTaunt: 'joy', goudaVictory: 'joy',
  },
  hits: {
    goudaStirPot: 0.8, goudaBellyBounce: 1, goudaSprinkler: 0.7, goudaSpoonDrum: 1, goudaSeasoning: 0.8, goudaCabbage: 0.9,
    goudaTwist: 0.6, goudaHeelClick: 0.1, goudaMixer: 0, goudaCossack: 0.3, goudaPotSpin: 0.2, goudaCheeseStorm: 0,
    goudaAccent: 0.4, goudaIntro: 0.5, goudaTaunt: 0.4, goudaVictory: 0.5,
  },
  fnGroove: { goudaHeelClick: 0, goudaMixer: 0, goudaPotSpin: 0, goudaCheeseStorm: 0 },
  stiff: { goudaSprinkler: 1.3, goudaSpoonDrum: 1.3 },
};

export default { moves, moveMeta };
