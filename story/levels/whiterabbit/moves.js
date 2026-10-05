// BUNNI's move set — Melbourne shuffle and rave.
//
// Shuffle vocabulary: the running man (planted foot slides back as the
// other knee drives up, two steps per beat on this half-time grid), the
// T-step (standing foot swivelling while the free leg kicks out to the side
// and the body travels), the Charleston (toe taps forward and back with a
// knee twist), kick-spins, jumpstyle (hop-kicks front and back), plus rave
// hands — waving, glow-stick swirls, gloving — and rabbit hops.
// Authored with the opponent on the dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, hipHand, wideStance } = kit;

// Shuffle running man, one full cycle (L + R step) per `1/rate` beats.
// Each foot: lands forward, slides back flat, lifts its knee and swings
// forward to land again — continuous through the whole cycle.
function rmFoot(ph) {
  if (ph < 0.5) { const u = ph / 0.5; return [0.13 - 0.3 * u, 0, 0.45 * u * u]; }
  const u = (ph - 0.5) / 0.5;
  return [-0.17 + 0.3 * smooth(u), 0.3 * Math.pow(Math.sin(Math.PI * u), 0.9), 0.45 * (1 - u)];
}
function runningMan(p, b, rate = 1, amp = 1, out = 0.12) {
  const a = rmFoot(frac(b * rate)), c = rmFoot(frac(b * rate + 0.5));
  p.foot('L', out, a[1] * amp, a[0] * amp, a[2]);
  p.foot('R', out, c[1] * amp, c[0] * amp, c[2]);
  p.hips(0.035 * Math.sin(TAU * b * rate), -0.12 - 0.04 * Math.cos(2 * TAU * b * rate) * amp, -0.03, 0.12 * Math.sin(TAU * b * rate));
  p.lean(0.12 * amp, 0.04);
}
// Pump arms: fists swinging opposite the knees.
function pumpArms(p, b, rate = 1, k = 1) {
  const s = Math.sin(TAU * b * rate);
  p.arm('L', 0.35 + 0.45 * s * k, 0.25, 1.5 + 0.3 * s, -0.3);
  p.arm('R', 0.35 - 0.45 * s * k, 0.25, 1.5 - 0.3 * s, -0.3);
}
// T-step footwork over 4 beats: 2 beats standing on L with R kicking out
// (travelling toward R), 2 beats mirrored back. Kicks peak on the "and".
function tStep(p, b, travel = 0.18) {
  const ph = ((b % 4) + 4) % 4, first = ph < 2, X = travel * Math.cos(Math.PI * b / 2);
  const kk = (0.5 - 0.5 * Math.cos(2 * TAU * b)) * win(first ? ph : ph - 2, 0, 2, 0.3);
  const sw = 0.025 * Math.sin(2 * TAU * b);
  if (first) {
    p.footX('L', X + 0.125 + sw, 0, 0.02, 0.25 * kk);
    p.footX('R', X - 0.125 - 0.3 * kk, 0.22 * kk, 0.06 * kk);
    p.hips(X + 0.07 * kk + 0.03, -0.12 - 0.03 * kk, 0, -0.2 * kk);
  } else {
    p.footX('R', X - 0.125 - sw, 0, 0.02, 0.25 * kk);
    p.footX('L', X + 0.125 + 0.3 * kk, 0.22 * kk, 0.06 * kk);
    p.hips(X - 0.07 * kk - 0.03, -0.12 - 0.03 * kk, 0, 0.2 * kk);
  }
  return { kk, first };
}

const moves = {
  // ── Base routines ───────────────────────────────────────────────
  // Running man, glow sticks pumping at the hips, shoulders bouncing.
  bunniRunningMan(p, b, B, s) {
    groove(p, B, s, 0.5);
    runningMan(p, b);
    pumpArms(p, b);
    p.look(0.02, 0.15 * Math.sin(Math.PI * b * 0.5));
  },

  // Rave hand waves: step-touch side to side, both arms high, waving the
  // glow sticks from side to side over two beats with wrist flicks.
  bunniHandWave(p, b, B, s) {
    groove(p, B, s, 0.9);
    const side = Math.sin(Math.PI * b), w = Math.sin(Math.PI * b - 0.6);
    const tl = 0.5 - 0.5 * Math.cos(TAU * b);       // touch lifts on the "and"
    p.footX('L', 0.2 + 0.06 * side, 0.05 * tl * Math.max(0, -side), 0, 0.35 * Math.max(0, -side));
    p.footX('R', -0.2 + 0.06 * side, 0.05 * tl * Math.max(0, side), 0, 0.35 * Math.max(0, side));
    p.hips(0.08 * side, -0.1, 0, 0.1 * side);
    p.arm('L', 0.5, 2.2 + 0.45 * w, 0.35 + 0.25 * Math.max(0, w));
    p.arm('R', 0.5, 2.2 - 0.45 * w, 0.35 + 0.25 * Math.max(0, -w));
    p.wrist('L', 0, 0.5 * Math.sin(TAU * b)); p.wrist('R', 0, 0.5 * Math.sin(TAU * b));
    p.lean(0, -0.08, 0, 0.12 * w);
    p.look(-0.15, 0.1 * w, 0.12 * w);
  },

  // T-step: travelling side to side on a swivelling foot, free leg kicking
  // out, arms swinging across with the kick.
  bunniTStep(p, b, B, s) {
    groove(p, B, s, 0.5);
    const { kk, first } = tStep(p, b);
    const d = first ? 1 : -1;
    p.arm('L', 0.4 + 0.3 * kk, 0.3 + 0.5 * kk * (d < 0 ? 1 : 0.2), 1.3, -0.4);
    p.arm('R', 0.4 + 0.3 * kk, 0.3 + 0.5 * kk * (d > 0 ? 1 : 0.2), 1.3, -0.4);
    p.lean(0.1, 0.03, 0.15 * d * kk, -0.08 * d * kk);
    p.look(0, 0.25 * -d);
  },

  // Charleston: toe taps front and back with the knee twisting, a little
  // hop on the standing leg; arms swing across like a flapper raver.
  bunniCharleston(p, b, B, s) {
    groove(p, B, s, 0.6);
    const ph = ((b % 4) + 4) % 4, first = ph < 2, e = win(first ? ph : ph - 2, 0, 2, 0.35);
    const sw = Math.cos(TAU * b), hop = 0.5 - 0.5 * Math.cos(2 * TAU * b);
    const act = first ? 'R' : 'L', st = first ? 'L' : 'R';
    p.foot(st, 0.12, 0.02 * hop * e, 0);
    p.foot(act, 0.13 + 0.04 * e, (0.05 + 0.08 * hop) * e, 0.26 * sw * e, 0.5 * e);
    p.hips((first ? 0.05 : -0.05) * e, -0.12 + 0.03 * hop * e, 0, 0.32 * sw * e * (first ? 1 : -1));
    p.arm('L', 0.6 + 0.5 * sw, 0.5, 1.1, -0.3); p.arm('R', 0.6 - 0.5 * sw, 0.5, 1.1, -0.3);
    p.wrist('L', 0, 0.5 * sw); p.wrist('R', 0, -0.5 * sw);
    p.lean(0.1, 0.05, -0.15 * sw);
    p.look(0, 0.15 * sw);
  },

  // Signature (count 5): bunny ears — hands up on top of her head, knee up,
  // hip popped.
  bunniAccent(p, b, B, s) {
    groove(p, B, s, 0.6);
    p.foot('L', 0.1); p.foot('R', 0.12, 0.24, 0.08, 0.5);
    p.hips(0.05, -0.04, 0, 0.2);
    p.arm('L', 2.2, 0.75, 2.3, -0.5); p.arm('R', 2.2, 0.75, 2.3, -0.5);
    p.wrist('L', 0.7); p.wrist('R', 0.7);
    p.lean(-0.04, -0.1, 0.1, 0.12); p.look(-0.1, 0.25, 0.18);
  },

  // ── Tier 1 ──────────────────────────────────────────────────────
  // Rabbit hops: paws up at the chest, feet together, a hop on every
  // pulse, travelling left and right, nose twitching.
  bunniHop(p, b, B, s) {
    groove(p, B, s, 0.3);
    const u = frac(b * 2), hop = Math.pow(Math.sin(Math.PI * u), 1.2);
    const X = 0.18 * Math.sin(Math.PI * b / 2);
    p.footX('L', X + 0.09, 0.14 * hop, 0.02, 0.6 * hop + 0.2); p.footX('R', X - 0.09, 0.14 * hop, 0.02, 0.6 * hop + 0.2);
    p.hips(X, -0.18 + 0.22 * hop, 0.02);
    p.arm('L', 1.25, 0.12, 2.0, -0.6); p.arm('R', 1.25, 0.12, 2.0, -0.6);
    p.wrist('L', 1.0 - 0.3 * hop); p.wrist('R', 1.0 - 0.3 * hop);
    p.lean(0.18 - 0.08 * hop, 0.05);
    p.look(-0.05, 0.08 * Math.sin(TAU * b * 4), 0.1 * Math.sin(Math.PI * b));
  },

  // Glow-stick swirls: both arms wheel big circles (one forward, one back)
  // over a running man — light trails everywhere.
  bunniGlowSwirl(p, b, B, s) {
    groove(p, B, s, 0.5);
    runningMan(p, b, 1, 0.8);
    const a = TAU * b * 0.5;
    p.arm('L', 1.6 + 1.25 * Math.sin(a), 0.7 + 0.55 * Math.cos(a), 0.35, 0);
    p.arm('R', 1.6 + 1.25 * Math.sin(-a + Math.PI), 0.7 + 0.55 * Math.cos(-a + Math.PI), 0.35, 0);
    p.wrist('L', 0.7 * Math.sin(a * 4), 0.4); p.wrist('R', 0.7 * Math.cos(a * 4), 0.4);
    p.lean(0.05, -0.05);
    p.look(-0.1, 0.25 * Math.sin(a));
  },

  // ── Tier 2 ──────────────────────────────────────────────────────
  // Kick-spin: front kick, side kick, spin on the standing foot, stomp.
  bunniKickSpin(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = Math.sin(Math.PI * clamp01(b / 0.9));
        p.foot('L', 0.12); p.foot('R', 0.12, 0.38 * k, 0.4 * k, -0.2 * k);
        p.hips(0, -0.1 - 0.03 * k, -0.03 * k);
        p.arm('L', 0.9, 0.4, 1.2, -0.4); p.arm('R', -0.2, 0.4, 0.9);
        p.lean(-0.1 * k, 0.05);
      }],
      [2, (p, b) => {
        const k = Math.sin(Math.PI * clamp01((b - 1) / 0.9));
        p.foot('L', 0.12); p.foot('R', 0.12 + 0.36 * k, 0.32 * k, 0.04);
        p.hips(0.06 * k, -0.1, 0);
        p.arm('L', 0.3, 1.4 * k + 0.4, 0.4); p.arm('R', 0.3, 1.0 * k + 0.4, 0.4);
        p.lean(0, 0, 0, 0.18 * k);
      }],
      [3.4, (p, b) => {
        const t = smooth((b - 2) / 1.4);
        p.foot('L', 0.02, 0, 0, 0.45); p.foot('R', 0.1, 0.1 + 0.1 * Math.sin(Math.PI * t), 0.04, 0.5);
        p.hips(0, -0.02, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.6, 0.4, 2.0, -0.6); p.arm('R', 0.6, 0.4, 2.0, -0.6);
        p.look(-0.1);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.4) / 0.25);
        wideStance(p, 0.2);
        p.hips(0, -0.14 - 0.08 * Math.sin(Math.PI * clamp01((b - 3.4) / 0.6)));
        p.arm('L', 0.3, 0.4 + 2.0 * k, 0.3); p.arm('R', 1.1, 0.2, 1.8, -0.5);
        p.look(-0.2 * k, 0.25 * k);
      }],
    ]);
  },

  // Gloving: the glow sticks trace tight figure-eights round each other in
  // front of her face, wrists rolling; feet keep a light shuffle.
  bunniGloving(p, b, B, s) {
    groove(p, B, s, 0.8);
    const side = Math.sin(Math.PI * b);
    p.foot('L', 0.16, 0, 0.02, 0.35 * Math.max(0, -side)); p.foot('R', 0.16, 0, -0.02, 0.35 * Math.max(0, side));
    p.hips(0.05 * side, -0.12, 0, 0.1 * side);
    const a = TAU * b * 0.5;
    p.arm('L', 1.2 + 0.35 * Math.sin(2 * a), -0.05 + 0.35 * Math.cos(a), 1.6 + 0.4 * Math.sin(a), -0.6);
    p.arm('R', 1.2 + 0.35 * Math.sin(2 * a + Math.PI), -0.05 + 0.35 * Math.cos(a + Math.PI), 1.6 + 0.4 * Math.sin(a + Math.PI), -0.6);
    p.wrist('L', 0.6 * Math.sin(TAU * b), 0.6 * Math.cos(TAU * b)); p.wrist('R', 0.6 * Math.cos(TAU * b), -0.6 * Math.sin(TAU * b));
    p.lean(0.05, 0.05);
    p.look(0.12, 0.2 * Math.cos(a));
  },

  // ── Tier 3 ──────────────────────────────────────────────────────
  // Jumpstyle: hop-kicks — kick front, land, kick back, land, other side —
  // arms swinging big, a stomp on every landing.
  bunniJumpstyle: seq(4, [
    [0, (p) => { p.foot('L', 0.14); p.foot('R', 0.14); p.hips(0, -0.22, 0.02); p.arms(0.3, 0.5, 1.2, -0.3); p.lean(0.15, 0.1); p.look(0.1); }, 'in'],
    [0.5, (p) => { p.foot('L', 0.12, 0.06); p.foot('R', 0.12, 0.45, 0.42, -0.2); p.hips(0, 0.06, -0.05); p.arm('L', 1.5, 0.4, 0.3); p.arm('R', -0.4, 0.5, 0.5); p.lean(-0.08, -0.05); p.look(-0.1); }, 'out'],
    [1, (p) => { p.foot('L', 0.14); p.foot('R', 0.14); p.hips(0, -0.22, 0.02); p.arms(0.3, 0.5, 1.2, -0.3); p.lean(0.15, 0.1); }, 'in'],
    [1.5, (p) => { p.foot('R', 0.12, 0.06); p.foot('L', 0.13, 0.35, -0.38, 0.4); p.hips(0, 0.05, 0.03); p.arm('R', 1.6, 0.6, 0.3); p.arm('L', 1.6, 0.6, 0.3); p.lean(0.3, 0.1); p.look(-0.15); }, 'out'],
    [2, (p) => { p.foot('L', 0.14); p.foot('R', 0.14); p.hips(0, -0.22, 0.02); p.arms(0.3, 0.5, 1.2, -0.3); p.lean(0.15, 0.1); }, 'in'],
    [2.5, (p) => { p.foot('R', 0.12, 0.06); p.foot('L', 0.12, 0.45, 0.42, -0.2); p.hips(0, 0.06, -0.05); p.arm('R', 1.5, 0.4, 0.3); p.arm('L', -0.4, 0.5, 0.5); p.lean(-0.08, -0.05); }, 'out'],
    [3, (p) => { p.foot('L', 0.14); p.foot('R', 0.14); p.hips(0, -0.22, 0.02); p.arms(0.3, 0.5, 1.2, -0.3); p.lean(0.15, 0.1); }, 'in'],
    [3.5, (p) => { p.foot('L', 0.12, 0.06); p.foot('R', 0.13, 0.35, -0.38, 0.4); p.hips(0, 0.05, 0.03); p.arm('L', 2.6, 0.5, 0.2); p.arm('R', 2.6, 0.5, 0.2); p.lean(0.2, -0.05); p.look(-0.3); }, 'out'],
  ], { groove: 0.4, hits: 0.6 }),

  // Spin step: a spinning running man — pivoting on one foot while the
  // other keeps driving its knee, one turn each way.
  bunniSpinStep(p, b, B, s) {
    groove(p, B, s, 0.4);
    const first = b < 2, u = first ? b / 2 : (b - 2) / 2;
    const knee = Math.pow(Math.sin(Math.PI * frac(b * 2)), 1.2) * win(u, 0, 1, 0.12);
    const yaw = (first ? 1 : -1) * TAU * smooth(u);
    const pv = first ? 'L' : 'R', fr = first ? 'R' : 'L';
    p.foot(pv, 0.03, 0, 0, 0.4);
    p.foot(fr, 0.12, 0.05 + 0.3 * knee, 0.08 * knee, 0.3);
    p.hips(first ? 0.02 : -0.02, -0.1 + 0.04 * knee, 0); p.root(0, 0, 0, yaw);
    p.arm('L', 0.5 + 0.6 * knee, 1.3, 0.4); p.arm('R', 0.5 + 0.6 * knee, 1.3, 0.4);
    p.wrist('L', 0, 0.5 * knee); p.wrist('R', 0, 0.5 * knee);
    p.lean(0.05, -0.05); p.look(-0.1);
  },

  // ── Tier 4 ──────────────────────────────────────────────────────
  // Down the rabbit hole: spirals down in a falling spin to a crouch,
  // paws up, peeks left and right, then bursts up in a star jump.
  bunniRabbitHole(p, b, B, s) {
    phased(p, b, B, s, [
      [1.75, (p, b) => {
        const t = smooth(b / 1.75);
        p.foot('L', 0.03 + 0.1 * t, 0, 0, 0.45 * (1 - t)); p.foot('R', 0.1 + 0.03 * t, 0.12 * (1 - t), 0.04, 0.5 * (1 - t));
        p.hips(0, -0.02 - 0.48 * t, 0); p.root(0, 0, 0, TAU * 2 * t);
        p.arm('L', 0.4, 2.4 - 1.2 * t, 0.3); p.arm('R', 0.4, 2.4 - 1.2 * t, 0.3);
        p.lean(0.3 * t, 0.1 * t);
      }],
      [3.2, (p, b, B) => {
        const pk = Math.sin(Math.PI * (b - 1.75) / 1.45 * 2);
        p.foot('L', 0.14, 0, 0.06, 0.5); p.foot('R', 0.14, 0, 0.06, 0.5);
        p.hips(0.04 * pk, -0.5 + 0.02 * Math.sin(TAU * B), 0.0);
        p.arm('L', 1.2, 0.12, 2.0, -0.6); p.arm('R', 1.2, 0.12, 2.0, -0.6);
        p.wrist('L', 1.0); p.wrist('R', 1.0);
        p.lean(0.3, 0.1); p.look(-0.05, 0.45 * pk, 0.15 * pk);
      }],
      [Infinity, (p, b, B, s) => {
        const t = clamp01((b - 3.2) / 0.8), air = Math.sin(Math.PI * clamp01(t / 0.7));
        p.foot('L', 0.14 + 0.35 * air, 0.3 * air, 0.0); p.foot('R', 0.14 + 0.35 * air, 0.3 * air, 0.0);
        p.hips(0, -0.5 + 0.45 * smooth(t / 0.3) + 0.4 * air, 0);
        p.arms(0.3, 0.6 + 2.0 * smooth(t / 0.4), 0.2);
        p.look(-0.3 * air);
      }],
    ]);
  },

  // Star jump: crouch, tuck jump knees to chest, land, star jump — arms
  // and legs flung out in an X — and stick it.
  bunniStarJump(p, b, B, s) {
    phased(p, b, B, s, [
      [1.6, (p, b) => {
        const t = clamp01((b - 0.6) / 1.0), air = Math.sin(Math.PI * t), k = smooth(b / 0.6) * (1 - t);
        p.hips(0, -0.04 - 0.28 * k + 0.75 * air, 0);
        const fl = Math.max(0, 0.75 * air - 0.05) + 0.38 * air;
        p.foot('L', 0.14, fl, 0.15 * air, 0.3 * air); p.foot('R', 0.14, fl, 0.15 * air, 0.3 * air);
        p.arms(0.9 * air + 0.3, 0.3, 1.4 * air + 0.3);
        p.lean(0.25 * k + 0.2 * air);
      }],
      [3, (p, b) => {
        const u = (b - 1.6) / 1.4, k = smooth(u / 0.25), air = Math.sin(Math.PI * clamp01((u - 0.3) / 0.6));
        p.hips(0, -0.25 * k * (1 - air) - 0.04 + 0.8 * air, 0);
        p.foot('L', 0.14 + 0.5 * air, 0.55 * air, 0); p.foot('R', 0.14 + 0.5 * air, 0.55 * air, 0);
        p.arms(0.3, 0.5 + 2.1 * air, 0.1);
        p.look(-0.35 * air);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.3), give = Math.sin(Math.PI * clamp01((b - 3) / 0.5));
        p.foot('L', 0.12); p.foot('R', 0.12, 0.22 * k, 0.08, 0.5);
        p.hips(0.04, -0.06 - 0.2 * give, 0, 0.2 * k);
        p.arm('L', 2.2, 0.75, 2.3 * k, -0.5); p.arm('R', 2.2, 0.75, 2.3 * k, -0.5);
        p.wrist('L', 0.7 * k); p.wrist('R', 0.7 * k);
        p.look(-0.1, 0.25 * k, 0.15 * k);
      }],
    ]);
  },

  // ── ★ Branch moves ──────────────────────────────────────────────
  // Hyper shuffle: double-time running man, fists pumping the sky.
  bunniHyperShuffle(p, b, B, s) {
    groove(p, B, s, 0.3);
    runningMan(p, b, 2, 0.85);
    const pump = Math.sin(TAU * b * 2), up = 0.5 + 0.5 * pump;
    p.arm('L', 0.4, 2.0 + 0.6 * up, 1.4 - 1.2 * up); p.arm('R', 0.4, 2.0 + 0.6 * (1 - up), 0.2 + 1.2 * up);
    p.root(0, 0, 0.08 * Math.sin(Math.PI * b / 2));
    p.look(-0.2 + 0.08 * Math.sin(TAU * b * 2));
  },

  // Watch spin: pulls out the pocket watch, swings it like a pendulum,
  // then a double pirouette under it, landing on the "tick".
  bunniWatchSpin(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b, B, s) => {
        groove(p, B, s, 0.6);
        const k = smooth(b / 0.5), sw = Math.sin(TAU * b);
        wideStance(p, 0.18);
        p.hips(0.05 * sw, -0.12, 0, 0.15 * sw);
        p.arm('R', 1.3 * k + 0.1, 0.3 + 0.2 * k, 0.6 * k, 0); p.wrist('R', 0, 0.9 * sw * k);
        p.arm('L', 0.6 + 0.2 * k, 0.2, 2.4 * k, -0.9);
        p.lean(0, -0.05, -0.1 * sw); p.look(0.15, -0.1 + 0.3 * sw * k);
      }],
      [3.5, (p, b) => {
        const t = smooth((b - 2) / 1.5);
        p.foot('L', 0.02, 0, 0, 0.9); p.foot('R', 0.07, 0.2, 0.03, 0.7);
        p.hips(0, 0.05, 0); p.root(0, 0, 0, TAU * 2 * t);
        p.arm('R', 0.4, 2.7, 0.3); p.arm('L', 0.6, 1.1, 0.8);
        p.look(-0.25);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.5) / 0.2);
        p.foot('L', 0.12); p.foot('R', 0.2, 0, 0.08, 0.5 * k);
        p.hips(0.06 * k, -0.08, 0, -0.2 * k);
        p.arm('R', 1.35, 0.2, 0.1); p.wrist('R', 0, 0.5);
        hipHand(p, 'L');
        p.lean(-0.05, -0.15 * k, 0, 0.12 * k); p.look(-0.1 * k, -0.3 * k, -0.1 * k);
      }],
    ]);
  },

  // Wonderleap: shuffle run-up, a huge front-back split leap, landing into
  // a spin and the bunny-ears pose. (Also her encore after the solo.)
  bunniWonderleap(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => { runningMan(p, b, 2, 0.9); pumpArms(p, b, 2, 1.2); }],
      [2.4, (p, b) => {
        const t = (b - 1) / 1.4, air = Math.sin(Math.PI * t), k = smooth(t / 0.15);
        p.hips(0, -0.25 * (1 - k) + 0.9 * air, 0.05 * air);
        const base = Math.max(0, 0.9 * air - 0.08);
        p.foot('L', 0.12, base + 0.3 * air, 0.55 * air, -0.2 * air); p.foot('R', 0.12, base + 0.25 * air, -0.5 * air, 0.5 * air);
        p.arm('L', 0.9, 2.3 * air + 0.3, 0.2); p.arm('R', 0.9, 2.3 * air + 0.3, 0.2);
        p.lean(0.15 * air, -0.15 * air); p.look(-0.3 * air);
      }],
      [3.4, (p, b) => {
        const t = smooth((b - 2.4) / 1.0), give = Math.sin(Math.PI * clamp01((b - 2.4) / 0.4));
        p.foot('L', 0.02, 0, 0, 0.5 * (1 - give)); p.foot('R', 0.1, 0.12, 0.04, 0.6);
        p.hips(0, -0.04 - 0.22 * give, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.4, 1.6, 0.5); p.arm('R', 0.4, 1.6, 0.5);
      }],
      [Infinity, (p, b, B, s) => landEars(p, b, B, s, 3.4)],
    ]);
  },

  // ★★ SOLO — DOWN THE HOLE: fast T-steps, a double spin, a side-split
  // jump with both glow sticks flung wide, landing in the bunny-ears pose.
  bunniDownTheHole(p, b, B, s) {
    phased(p, b, B, s, [
      [1.25, (p, b) => {
        const { kk } = tStep(p, b * 1.2, 0.22);
        p.arm('L', 0.4 + 0.4 * kk, 1.2 + 0.4 * kk, 0.5); p.arm('R', 0.4 + 0.4 * kk, 1.2 + 0.4 * kk, 0.5);
        p.wrist('L', 0, 0.6 * kk); p.wrist('R', 0, 0.6 * kk);
        p.lean(0.1);
      }],
      [2.25, (p, b) => {
        const t = smooth((b - 1.25) / 1.0);
        p.foot('L', 0.02, 0, 0, 0.8); p.foot('R', 0.08, 0.18, 0.03, 0.6);
        p.hips(0, 0.03, 0); p.root(0, 0, 0, TAU * 2 * t);
        p.arm('L', 0.5, 2.6, 0.5); p.arm('R', 0.5, 2.6, 0.5);
        p.look(-0.2);
      }],
      [3.25, (p, b) => {
        const t = (b - 2.25), air = Math.sin(Math.PI * clamp01((t - 0.15) / 0.8)), k = smooth(t / 0.15) * (1 - smooth((t - 0.15) / 0.2));
        p.hips(0, -0.25 * k + 0.85 * air, 0);
        p.foot('L', 0.14 + 0.62 * air, 0.68 * air, 0.08 * air, 0.6 * air); p.foot('R', 0.14 + 0.62 * air, 0.68 * air, 0.08 * air, 0.6 * air);
        p.arms(0.25, 0.4 + 1.9 * air, 0.1);
        p.lean(0.12 * air); p.look(-0.3 * air);
      }],
      [Infinity, (p, b, B, s) => landEars(p, b, B, s, 3.25)],
    ]);
  },

  // ── Intro / taunt / victory ─────────────────────────────────────
  // "You're LATE!" — pulls out the pocket watch, taps it, points at you,
  // and bounces away in a little bunny hop.
  bunniIntro(p, b, B, s) {
    groove(p, B, s, 0.4);
    p.foot('L', 0.13, 0, 0.06); p.foot('R', 0.16, 0, -0.05, 0.3);
    phased(p, b, B, s, [
      [1.5, (p, b) => {
        const k = smooth(b / 0.5);
        p.hips(0, -0.08, 0, 0.3 * k);
        p.arm('R', 1.0 * k + 0.1, 0.15, 1.9 * k, -0.6); p.wrist('R', 0.4 * k);
        p.arm('L', 0.9 * k + 0.1, 0.1, 2.1 * k, -0.9 + 0.15 * Math.sin(TAU * b * 3) * k);
        p.look(0.25 * k, -0.15 * k);
      }],
      [2.75, (p, b) => {
        const k = smooth((b - 1.5) / 0.3);
        p.hips(0.03, -0.08, 0, 0.5);
        p.arm('L', 0.3, 0.2 + 1.3 * k, 0.05 + 0.2 * Math.max(0, Math.sin(TAU * (b - 1.5) * 2)));
        p.arm('R', 1.1, 0.15, 1.9, -0.6);
        p.lean(0, -0.1 * k, 0.1 * k); p.look(-0.05, 0.4 * k, 0.08);
      }],
      [Infinity, (p, b) => {
        const u = frac(b * 2), hop = Math.pow(Math.sin(Math.PI * u), 1.2), k = smooth((b - 2.75) / 0.25);
        p.foot('L', 0.1, 0.12 * hop * k, 0.06, 0.4); p.foot('R', 0.1, 0.12 * hop * k, 0.0, 0.4);
        p.hips(0, -0.14 + 0.18 * hop * k, 0, 0.35);
        p.arm('L', 1.25, 0.12, 2.0, -0.6); p.arm('R', 1.25, 0.12, 2.0, -0.6);
        p.wrist('L', 1.0 * k); p.wrist('R', 1.0 * k);
        p.lean(0.15 * k); p.look(-0.05, 0.3);
      }],
    ]);
  },

  // Hypnotist: the pocket watch swings at you on its chain while the other
  // hand spirals by her temple — you are getting very sleepy — then "boop".
  bunniHypno(p, b, B, s) {
    groove(p, B, s, 0.35);
    p.foot('L', 0.14, 0, 0.1); p.foot('R', 0.17, 0, -0.05, 0.3);
    phased(p, b, B, s, [
      [3, (p, b) => {
        const k = smooth(b / 0.4), sw = Math.sin(TAU * b * 0.75 * 2 / 1.5);
        p.hips(0.03 * sw, -0.1, 0.04 * k, 0.55 * k);
        p.arm('L', 0.9, 0.85 * k + 0.2, 0.15, 0); p.wrist('L', 0.2, 0.9 * sw * k);
        const c = TAU * b * 2;
        p.arm('R', 1.9 + 0.12 * Math.sin(c), 0.4 + 0.12 * Math.cos(c), 2.4, -0.9);
        p.lean(0.05 * k, -0.05, 0.1 * sw, 0.06 * sw); p.look(-0.05, 0.35 * k, 0.12 * sw);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.25);
        p.hips(0, -0.1, 0.08 * k + 0.04 * (1 - k), 0.6);
        p.arm('L', 0.5, 1.35, 0.08); p.wrist('L', 0, -0.3);
        p.arm('R', 1.9 - 1.5 * k, 0.4, 2.4 - 0.8 * k, -0.9 + 0.5 * k);
        p.lean(0.12 * k, 0.05); p.look(-0.1, 0.4, 0.15 * k);
      }],
    ]);
  },

  // Victory: bunny hops with both glow sticks waving overhead.
  bunniVictory(p, b, B, s) {
    const u = frac(b), hop = Math.pow(Math.sin(Math.PI * u), 1.3);
    p.foot('L', 0.12, 0.18 * hop, 0, 0.5 * hop + 0.2); p.foot('R', 0.12, 0.18 * hop, 0, 0.5 * hop + 0.2);
    p.hips(0, -0.16 + 0.3 * hop, 0);
    const w = Math.sin(Math.PI * b);
    p.arm('L', 0.4, 2.5 + 0.3 * w, 0.3); p.arm('R', 0.4, 2.5 - 0.3 * w, 0.3);
    p.wrist('L', 0, 0.6 * Math.sin(TAU * b)); p.wrist('R', 0, 0.6 * Math.sin(TAU * b));
    p.look(-0.3, 0.2 * w, 0.15 * w);
  },
};

// The bunny-ears landing pose (shared by the solo and the leap).
function landEars(p, b, B, s, start) {
  groove(p, B, s, 0.5);
  const k = smooth((b - start) / 0.3);
  p.foot('L', 0.1); p.foot('R', 0.12, 0.24 * k, 0.08, 0.5);
  p.hips(0.05, -0.04 - 0.1 * (1 - k), 0, 0.2);
  p.arm('L', 2.2, 0.75, 2.3 * k, -0.5); p.arm('R', 2.2, 0.75, 2.3 * k, -0.5);
  p.wrist('L', 0.7 * k); p.wrist('R', 0.7 * k);
  p.lean(-0.04, -0.1 * k, 0.1, 0.12 * k); p.look(-0.1 * k, 0.25 * k, 0.18 * k);
}

const moveMeta = {
  labels: {
    bunniHop: 'BUNNY HOP', bunniGlowSwirl: 'GLOW SWIRL', bunniKickSpin: 'KICK SPIN', bunniGloving: 'GLOVING',
    bunniJumpstyle: 'JUMPSTYLE', bunniSpinStep: 'SPIN STEP', bunniRabbitHole: 'RABBIT HOLE', bunniStarJump: 'STAR JUMP',
    bunniHyperShuffle: 'HYPER SHUFFLE', bunniWatchSpin: 'WATCH SPIN', bunniWonderleap: 'WONDERLEAP', bunniDownTheHole: 'DOWN THE HOLE',
  },
  expressions: {
    bunniRunningMan: 'grin', bunniHandWave: 'joy', bunniTStep: 'focus', bunniCharleston: 'grin', bunniAccent: 'wink',
    bunniHop: 'joy', bunniGlowSwirl: 'grin', bunniKickSpin: 'shout', bunniGloving: 'focus',
    bunniJumpstyle: 'shout', bunniSpinStep: 'joy', bunniRabbitHole: 'o', bunniStarJump: 'shout',
    bunniHyperShuffle: 'shout', bunniWatchSpin: 'smirk', bunniWonderleap: 'joy', bunniDownTheHole: 'joy',
    bunniIntro: 'angry', bunniHypno: 'smirk', bunniVictory: 'joy',
  },
  hits: {
    bunniRunningMan: 0.7, bunniHandWave: 0.8, bunniTStep: 0.6, bunniCharleston: 0.7, bunniAccent: 0.4,
    bunniHop: 0.3, bunniGlowSwirl: 0.4, bunniKickSpin: 0.3, bunniGloving: 0.5, bunniSpinStep: 0.2,
    bunniRabbitHole: 0.1, bunniStarJump: 0, bunniHyperShuffle: 0.4, bunniWatchSpin: 0.3, bunniWonderleap: 0, bunniDownTheHole: 0,
    bunniIntro: 0.4, bunniHypno: 0.4, bunniVictory: 0.3,
  },
  fnGroove: {
    bunniKickSpin: 0, bunniRabbitHole: 0, bunniStarJump: 0, bunniWatchSpin: 0, bunniWonderleap: 0, bunniDownTheHole: 0, bunniVictory: 0, bunniHop: 0.2,
  },
  stiff: {},
};

export default { moves, moveMeta };
