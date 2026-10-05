// SAGE's moves — flowing tai chi, liquid waves, yoga balances, slow-motion
// glides and levitation, all on the slow half-time beat (67 BPM; one move
// = 4 slow beats). Authored with the opponent on the dancer's left (+x).
// Sage hovers (his feel lifts both feet), so his glides may slide.
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased } = kit;
const PI = Math.PI;
const mod4 = (b) => ((b % 4) + 4) % 4;
const armMix = (p, side, A, B, t) => p.arm(side, lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), lerp(A[3] || 0, B[3] || 0, t));
const PRAYER = [0.95, -0.28, 1.95, -1.15];       // palms together at the chest
const PALMS_UP = [0.75, 0.55, 1.1, 0.9];         // open palms, offering
const MUDRA = [0.35, 0.25, 0.9, -0.4];           // hands resting on the thighs
const OVER = [2.85, -0.14, 0.3, 0];               // palms together overhead
// Floating seiza: kneeling in mid-air, shins folded back, hands on thighs.
function seiza(p, up, bob = 0) {
  const h = up * (0.42 + bob);
  p.hips(0, -0.03 + h - 0.1 * up, 0);
  // Feet tucked behind and under: knees come forward as the hips rise.
  const lift = Math.max(0, 1.0 + (-0.03 + h - 0.1 * up) - 0.3 - 0.085) * up;
  p.foot('L', 0.12, lift, -0.08 * up, 1.2 * up); p.foot('R', 0.12, lift, -0.08 * up, 1.2 * up);
}

export const moves = {
  // ── Base routines ───────────────────────────────────────────
  // Cloud hands (yun shou): the hands circle past the face one after the
  // other, the waist turning, weight drifting side to side.
  sageCloudHands(p, b, B, s) {
    groove(p, B, s, 0.8);
    const a = PI * b, c = Math.cos(a);
    p.foot('L', 0.24); p.foot('R', 0.24);
    p.hips(0.08 * c, -0.16, 0, 0.28 * c);
    p.arm('L', 1.0 + 0.55 * Math.sin(a), 0.22 - 0.6 * c, 0.6 + 0.2 * Math.sin(a), -0.5 + 0.3 * Math.sin(a));
    p.arm('R', 1.0 - 0.55 * Math.sin(a), 0.22 + 0.6 * c, 0.6 - 0.2 * Math.sin(a), -0.5 - 0.3 * Math.sin(a));
    p.wrist('L', -0.3 * Math.sin(a), 0.2 * c); p.wrist('R', 0.3 * Math.sin(a), -0.2 * c);
    p.lean(0.04, 0, 0.12 * c, 0.03 * c);
    p.look(0.05 - 0.1 * Math.abs(Math.sin(a)) * 0, 0.35 * c, 0.06 * c);
  },

  // Liquid wave: a ripple runs from the left fingertips across the
  // shoulders to the right fingertips and back, the body swaying under it.
  sageWave(p, b, B, s) {
    groove(p, B, s, 0.8);
    const dir = Math.cos(PI * b / 2);                         // which way the wave travels
    const w = (k) => Math.sin(TAU * b / 2 - k * 0.7 * Math.sign(dir || 1));
    const side = Math.sin(PI * b / 2);
    p.foot('L', 0.2, 0, 0, 0.3 * Math.max(0, -side) ** 2); p.foot('R', 0.2, 0, 0, 0.3 * Math.max(0, side) ** 2);
    p.hips(0.07 * side, -0.12, 0, 0.12 * side);
    p.arm('L', 0.15, 1.4 + 0.32 * w(2), 0.45 + 0.4 * w(1), 1.35); p.wrist('L', 0.55 * w(0));
    p.arm('R', 0.15, 1.4 + 0.32 * w(4), 0.45 + 0.4 * w(5), 1.35); p.wrist('R', 0.55 * w(6));
    p.shrug(0.12 * w(3), -0.12 * w(3));
    p.lean(0.02, -0.04, 0, 0.12 * w(3));
    p.look(-0.05, 0.25 * side, 0.12 * w(3));
  },

  // Ocean flow (hype base): bow stance, both palms rolling out and drawing
  // back in big vertical circles, the weight rocking forward and back.
  sageFlow(p, b, B, s) {
    groove(p, B, s, 0.8);
    const a = TAU * b, push = 0.5 - 0.5 * Math.cos(a);       // 0 drawn back → 1 pushed out
    p.foot('L', 0.15, 0, 0.24); p.foot('R', 0.17, 0, -0.2, 0.25 * (1 - push));
    p.hips(0, -0.15 - 0.05 * Math.sin(a), lerp(-0.08, 0.1, push), 0.25 - 0.1 * push);
    const fw = 0.8 + 0.7 * push + 0.25 * Math.sin(a), el = lerp(1.9, 0.35, push);
    p.arm('L', fw + 0.15 * push, 0.15 + 0.55 * push, el, -0.7 + 0.5 * push); p.arm('R', fw + 0.15 * push, 0.15 + 0.55 * push, el, -0.7 + 0.5 * push);
    p.wrist('L', -0.75 * push + 0.3 * (1 - push)); p.wrist('R', -0.75 * push + 0.3 * (1 - push));
    p.lean(0.1 * push - 0.06, 0.06 * push, -0.1, 0);
    p.look(-0.02, 0.2);
  },

  // ── Tier 1 ──────────────────────────────────────────────────
  // Breath: the arms float up with the in-breath (wrists leading) as he
  // rises, then palms press down with the out-breath as he sinks.
  sageBreath(p, b, B, s) {
    groove(p, B, s, 0.6);
    const ph = mod4(b), rise = 0.5 - 0.5 * Math.cos(PI * ph / 2);   // 0 → 1 (beat 2) → 0
    p.foot('L', 0.2); p.foot('R', 0.2);
    p.hips(0, -0.2 + 0.2 * rise, 0);
    p.root(0, 0.08 * rise, 0); p.lift('L', 0.08 * rise); p.lift('R', 0.08 * rise);
    p.arms(0.25 + 1.3 * rise, 0.28, 0.4 + 0.3 * rise, -0.4);
    const wr = 0.55 * Math.sin(PI * ph / 2);                  // wrists lead up, then palms press down
    p.wrist('L', wr); p.wrist('R', wr);
    p.lean(-0.04 * rise, -0.1 * rise);
    p.look(-0.12 * rise + 0.04);
  },

  // Lotus hands: wrists together at the heart, hands rolling around each
  // other, then blooming open overhead and floating back down.
  sageLotusHands(p, b, B, s) {
    groove(p, B, s, 0.7);
    const ph = mod4(b), bloom = win(ph, 1.6, 3.6, 0.7), roll = Math.sin(TAU * b);
    p.foot('L', 0.16, 0, 0.04); p.foot('R', 0.17, 0, -0.03, 0.2);
    p.hips(0.03 * Math.sin(PI * b), -0.1 + 0.05 * bloom, 0, 0.1 * Math.sin(PI * b));
    armMix(p, 'L', [1.05 + 0.15 * roll, -0.18, 1.75 - 0.2 * roll, -1.0], [0.4, 2.3, 0.5, 0.5], bloom);
    armMix(p, 'R', [1.05 - 0.15 * roll, -0.18, 1.75 + 0.2 * roll, -1.0], [0.4, 2.3, 0.5, 0.5], bloom);
    p.wrist('L', 0.5 * Math.cos(TAU * b) * (1 - bloom), 0.4 * bloom); p.wrist('R', -0.5 * Math.cos(TAU * b) * (1 - bloom), 0.4 * bloom);
    p.lean(0.02, -0.12 * bloom, 0.08 * Math.sin(PI * b));
    p.look(0.1 - 0.35 * bloom, 0, 0.06 * Math.sin(PI * b));
  },

  // ── Tier 2 ──────────────────────────────────────────────────
  // White crane spreads its wings: knee up, one wing high and one low,
  // wings opening and closing slowly; steps through to the other leg.
  sageCrane: seq(4, [
    [0, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0.32, 0.14, 0.4); p.hips(-0.05, -0.04, 0, 0.1); p.arm('R', 0.7, 1.9, 0.6, 0.3); p.arm('L', 0.3, 0.7, 0.4, 0.3); p.wrist('R', -0.4); p.wrist('L', -0.5); p.lean(0, -0.06, 0, 0.06); p.look(-0.08, -0.2); }],
    [1, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0.36, 0.18, 0.5); p.hips(-0.05, -0.02, 0, 0.15); p.arm('R', 0.4, 2.4, 0.3, 0.3); p.arm('L', 0.2, 1.2, 0.3, 0.3); p.wrist('R', 0.3); p.wrist('L', 0.3); p.lean(0, -0.1, 0, 0.08); p.look(-0.15, -0.25); }],
    [1.5, (p) => { p.foot('R', 0.15); p.foot('L', 0.16, 0.06, 0.05); p.hips(0, -0.14, 0); p.arms(0.8, 0.5, 1.0, -0.4); p.lean(0.06); p.look(0.05); }],
    [2, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0.32, 0.14, 0.4); p.hips(0.05, -0.04, 0, -0.1); p.arm('L', 0.7, 1.9, 0.6, 0.3); p.arm('R', 0.3, 0.7, 0.4, 0.3); p.wrist('L', -0.4); p.wrist('R', -0.5); p.lean(0, -0.06, 0, -0.06); p.look(-0.08, 0.2); }],
    [3, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0.36, 0.18, 0.5); p.hips(0.05, -0.02, 0, -0.15); p.arm('L', 0.4, 2.4, 0.3, 0.3); p.arm('R', 0.2, 1.2, 0.3, 0.3); p.wrist('L', 0.3); p.wrist('R', 0.3); p.lean(0, -0.1, 0, -0.08); p.look(-0.15, 0.25); }],
    [3.5, (p) => { p.foot('L', 0.15); p.foot('R', 0.16, 0.06, 0.05); p.hips(0, -0.14, 0); p.arms(0.8, 0.5, 1.0, -0.4); p.lean(0.06); p.look(0.05); }],
  ], { groove: 0.6, hits: 0.3 }),

  // Slow-motion glide: he drifts left and right on the air, feet gliding,
  // body leaning into it, the arms trailing behind like water.
  sageGlide(p, b, B, s) {
    groove(p, B, s, 0.6);
    const X = 0.28 * Math.sin(PI * b / 2), v = Math.cos(PI * b / 2);   // v: direction of travel
    p.footX('L', X + 0.15 - 0.04 * v, 0.03, 0.02 * v, 0.3 * Math.max(0, -v));
    p.footX('R', X - 0.15 - 0.04 * v, 0.03, -0.02 * v, 0.3 * Math.max(0, v));
    p.hips(X, -0.1, 0, 0.15 * v);
    p.arm('L', 0.5 + 0.3 * v, 0.9 - 0.4 * v, 0.5 + 0.3 * Math.sin(PI * b), 0.4);
    p.arm('R', 0.5 - 0.3 * v, 0.9 + 0.4 * v, 0.5 - 0.3 * Math.sin(PI * b), 0.4);
    p.wrist('L', 0.4 * Math.sin(PI * b - 0.8)); p.wrist('R', -0.4 * Math.sin(PI * b - 0.8));
    p.lean(0.04, -0.04, 0.1 * v, -0.14 * v);
    p.look(-0.05, 0.3 * v, 0.1 * v);
  },

  // ── Tier 3 ──────────────────────────────────────────────────
  // Tree pose: rises onto the right leg, left foot drawn up to the knee,
  // palms together and up overhead, swaying like a tree in a breeze.
  sageTree(p, b, B, s) {
    groove(p, B, s, 0.4);
    const k = smooth(b / 0.8), out = smooth((b - 3.3) / 0.7), up = k * (1 - out), sway = Math.sin(PI * b / 2);
    p.foot('R', 0.1); p.foot('L', lerp(0.13, 0.02, up), 0.42 * up, 0.08 * up, 0.6 * up);
    p.hips(-0.06 * up + 0.03 * sway * up, -0.04, 0, 0);
    armMix(p, 'L', PRAYER, OVER, smooth((b - 0.4) / 0.9) * (1 - out));
    armMix(p, 'R', PRAYER, OVER, smooth((b - 0.4) / 0.9) * (1 - out));
    p.lean(0, -0.06 * up, 0, 0.1 * sway * up);
    p.look(-0.06 * up, 0, 0.08 * sway);
  },

  // Warrior flow: steps back into warrior II (arms long, gazing over the
  // front hand), tips forward into warrior III balancing on the left leg,
  // then returns to prayer.
  sageWarrior(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b) => {
        const k = smooth(b / 0.9);
        p.foot('L', 0.13 + 0.12 * k, 0, 0.12 * k); p.foot('R', 0.13 + 0.2 * k, 0, -0.2 * k, 0.2 * k);
        p.hips(0.06 * k, -0.04 - 0.24 * k, 0, 0.3 * k);
        armMix(p, 'L', PRAYER, [0.1, 1.55, 0.05, 0.6], k); armMix(p, 'R', PRAYER, [0.1, 1.55, 0.05, 0.6], k);
        p.lean(0, -0.06 * k, -0.3 * k); p.look(0, 0.4 * k);
      }],
      [3, (p, b) => {
        const k = smooth((b - 1.5) / 0.8);
        p.foot('L', 0.25 - 0.13 * k, 0, 0.12 - 0.04 * k); p.foot('R', 0.33 - 0.2 * k, 0.5 * k, -0.2 - 0.5 * k, 0.4 * k);
        p.hips(0.06 - 0.02 * k, -0.28 + 0.2 * k, -0.06 * k, 0.3 * (1 - k));
        armMix(p, 'L', [0.1, 1.55, 0.05, 0.6], [2.8, 0.3, 0.05, 0], k); armMix(p, 'R', [0.1, 1.55, 0.05, 0.6], [2.8, 0.3, 0.05, 0], k);
        p.lean(0.95 * k, 0.15 * k, -0.3 * (1 - k)); p.look(-0.6 * k, 0.4 * (1 - k));
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.8);
        p.foot('L', 0.12 + 0.03 * k, 0, 0.08 - 0.08 * k); p.foot('R', 0.13 + 0.02 * k, 0.5 * (1 - k), -0.7 * (1 - k), 0.4 * (1 - k));
        p.hips(0.04 * (1 - k), -0.08 - 0.04 * k, -0.06 * (1 - k));
        armMix(p, 'L', [2.8, 0.3, 0.05, 0], PRAYER, k); armMix(p, 'R', [2.8, 0.3, 0.05, 0], PRAYER, k);
        p.lean(0.95 * (1 - k) + 0.12 * k, 0.15 * (1 - k)); p.look(-0.6 * (1 - k) + 0.15 * k);
      }],
    ], 0.3);
  },

  // ── Tier 4 ──────────────────────────────────────────────────
  // Spiral: one slow turn on the left foot, arms spiralling up as he
  // floats higher and higher, then drifts back down with the arms open.
  sageSpiral(p, b, B, s) {
    groove(p, B, s, 0.3);
    const t = smooth(b / 2.6), down = smooth((b - 2.6) / 1.2), h = 0.32 * Math.sin(PI * clamp01(b / 3.6));
    const turn = TAU * t;
    p.foot('L', 0.02, h, 0, 0.5 * (1 - down)); p.foot('R', 0.08 + 0.05 * down, h + 0.16 * (1 - down), 0.04, 0.6 * (1 - down));
    p.hips(0, -0.04 + h, 0); p.root(0, 0, 0, turn);
    const sp = TAU * b * 0.75;
    armMix(p, 'L', [0.6 + 0.5 * Math.sin(sp), 0.5 + 1.9 * t, 0.6, 0.3], [0.3, 1.6, 0.2, 0.6], down);
    armMix(p, 'R', [0.6 - 0.5 * Math.sin(sp), 0.4 + 1.0 * t, 0.7, 0.3], [0.3, 1.6, 0.2, 0.6], down);
    p.lean(0, -0.12 * t * (1 - down)); p.look(-0.3 * t * (1 - down) + 0.05);
  },

  // Levitate: rises off the floor into a floating kneel, hands on the
  // thighs, turning slowly in mid-air, then unfolds and lands.
  sageLevitate(p, b, B, s) {
    groove(p, B, s, 0.2);
    const up = smooth(b / 1.0) * (1 - smooth((b - 3.0) / 0.9)), bob = 0.04 * Math.sin(PI * b);
    seiza(p, up, bob);
    p.root(0, 0, 0, PI * 2 * smooth((b - 0.8) / 2.4) * up);
    armMix(p, 'L', [0.3, 0.25, 0.4], MUDRA, up); armMix(p, 'R', [0.3, 0.25, 0.4], MUDRA, up);
    p.wrist('L', 0.3 * up); p.wrist('R', 0.3 * up);
    p.lean(0.04 * up, -0.06 * up); p.look(0.12 * up);
  },

  // ── ★ Signature moves ───────────────────────────────────────
  // Ripple: a full-body wave from the head down to the knees, twice, the
  // arms flowing with it, then both palms push out a mind ripple.
  sageRipple(p, b, B, s) {
    groove(p, B, s, 0.5);
    const ph = mod4(b), push = win(ph, 2.6, 4, 0.5), wave = 1 - push;
    const w = (k) => Math.sin(PI * b - k);
    p.foot('L', 0.17, 0, 0.06 * push); p.foot('R', 0.18, 0, -0.06 * push, 0.2 * push);
    p.hips(0, -0.12 - 0.08 * (0.5 + 0.5 * w(2.4)) * wave, 0.08 * w(1.8) * wave + 0.06 * push);
    p.add('chest', 0.3 * w(0) * wave); p.add('spine', 0.2 * w(0.8) * wave); p.add('hips', -0.2 * w(1.6) * wave);
    p.look(-0.25 * w(-0.6) * wave);
    armMix(p, 'L', [0.6 + 0.4 * w(0.4), 0.6, 1.2 - 0.6 * w(0.8), 0.2], [1.5, 0.15, 0.1, -0.5], push);
    armMix(p, 'R', [0.6 + 0.4 * w(0.4), 0.6, 1.2 - 0.6 * w(0.8), 0.2], [1.5, 0.15, 0.1, -0.5], push);
    p.wrist('L', 0.4 * w(1.2) * wave - 0.9 * push); p.wrist('R', 0.4 * w(1.2) * wave - 0.9 * push);
    p.lean(0.05 * push, -0.05 * push);
  },

  // Snake creeps down → golden rooster: sinks low on the right leg with the
  // left leg stretched out, the left hand sliding down along it, then
  // rises forward onto the left leg with the right knee up high.
  sageSnake(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b) => {
        const k = smooth(b / 1.4);
        p.foot('R', 0.16 + 0.04 * k); p.foot('L', 0.16 + 0.48 * k, 0, 0.04 * k, -0.3 * k);
        p.hips(-0.14 * k, -0.06 - 0.44 * k, -0.04 * k, 0.15 * k);
        p.arm('L', lerp(0.9, 0.35, k), lerp(0.4, 0.75, k), lerp(0.8, 0.05, k), 0.3); p.wrist('L', -0.3);
        p.arm('R', lerp(0.9, -0.45, k), lerp(0.4, 0.9, k), 0.25, 0.2); p.wrist('R', 1.1 * k);
        p.lean(0.3 * k, 0.1 * k, 0.3 * k, -0.2 * k); p.look(0.15 * k, 0.45 * k);
      }],
      [3, (p, b) => {
        const k = smooth((b - 2) / 0.9);
        p.foot('L', 0.64 - 0.52 * k, 0, 0.04 + 0.04 * k, -0.3 * (1 - k)); p.foot('R', 0.2 - 0.07 * k, 0.4 * k, 0.16 * k, 0.4 * k);
        p.hips(-0.14 + 0.2 * k, -0.5 + 0.46 * k, -0.04 + 0.06 * k, 0.15 * (1 - k));
        p.arm('R', lerp(-0.45, 1.4, k), lerp(0.9, 0.3, k), lerp(0.25, 1.6, k), 0.2); p.wrist('R', 1.1 * (1 - k));
        p.arm('L', lerp(0.35, 0.2, k), 0.75 - 0.35 * k, 0.05 + 0.2 * k, 0.3); p.wrist('L', -0.3 - 0.5 * k);
        p.lean(0.3 * (1 - k), 0.1 * (1 - k), 0.3 * (1 - k), -0.2 * (1 - k)); p.look(0.15 * (1 - k) - 0.1 * k, 0.45 * (1 - k));
      }],
      [Infinity, (p, b) => {
        const f = Math.sin(PI * (b - 3));
        p.foot('L', 0.12, 0, 0.08); p.foot('R', 0.13, 0.4 + 0.03 * f, 0.16, 0.4);
        p.hips(0.06, -0.04 + 0.02 * f, 0.02);
        p.arm('R', 1.4, 0.3, 1.6, 0.2); p.arm('L', 0.2, 0.4, 0.25, 0.3); p.wrist('L', -0.8);
        p.lean(0, -0.05, 0, 0.04 * f); p.look(-0.1);
      }],
    ], 0.3);
  },

  // Ascend (the encore): rises onto one leg with the arms spiralling up,
  // floats up off the floor with arms open like wings, drifts down.
  sageAscend(p, b, B, s) {
    groove(p, B, s, 0.25);
    const rise = smooth(b / 1.6), down = smooth((b - 2.8) / 1.2), h = 0.5 * rise * (1 - down);
    const sp = TAU * b * 0.5;
    p.foot('L', 0.06, h, 0, 0.6 * rise * (1 - down)); p.foot('R', 0.1, h + 0.2 * rise * (1 - down), -0.06 * rise, 0.7 * rise * (1 - down));
    p.hips(0, -0.06 + h, 0);
    const wings = win(b, 1.4, 3.4, 0.6);
    armMix(p, 'L', [0.8 + 0.6 * Math.sin(sp), 0.4 + 2.0 * rise, 0.5, 0.4], [0.2, 1.9, 0.15, 0.6], wings);
    armMix(p, 'R', [0.8 - 0.6 * Math.sin(sp), 0.4 + 2.0 * rise, 0.5, 0.4], [0.2, 1.9, 0.15, 0.6], wings);
    p.wrist('L', 0.4 * Math.sin(sp * 2)); p.wrist('R', -0.4 * Math.sin(sp * 2));
    p.lean(0, -0.15 * wings); p.look(-0.3 * wings);
  },

  // ★★ SOLO — nirvana: rises into the floating kneel, spins with a halo of
  // circling arms, opens wide and radiant, palms together.
  sageNirvana(p, b, B, s) {
    groove(p, B, s, 0.15);
    const up = smooth(b / 0.9), radiant = win(b, 2.7, 3.8, 0.4), pray = smooth((b - 3.5) / 0.4);
    seiza(p, up, 0.08 * smooth((b - 1) / 1.5) + 0.03 * Math.sin(PI * b));
    p.root(0, 0, 0, TAU * 2 * smooth((b - 0.6) / 2.1));
    const haloK = smooth((b - 0.7) / 0.5), radIn = smooth((b - 2.7) / 0.4), a = TAU * b * 1.5;
    const base = [0.3, 0.25, 0.4, 0], wide = [0.4, 2.3, 0.1, 0.6];
    const L = [1.3 + 1.0 * Math.sin(a), 1.2 + 0.8 * Math.cos(a), 0.4, 0.4], R = [1.3 + 1.0 * Math.sin(a + PI), 1.2 + 0.8 * Math.cos(a + PI), 0.4, 0.4];
    const AL = lerpArr(lerpArr(lerpArr(base, L, haloK), wide, radIn), PRAYER, pray);
    const AR = lerpArr(lerpArr(lerpArr(base, R, haloK), wide, radIn), PRAYER, pray);
    p.arm('L', AL[0], AL[1], AL[2], AL[3]); p.arm('R', AR[0], AR[1], AR[2], AR[3]);
    p.lean(0, -0.2 * radiant, 0); p.look(-0.35 * radiant + 0.1 * pray);
  },

  // Phrase accent (count 3): palms together at the heart, a small bow.
  sageAccent(p, b, B, s) {
    groove(p, B, s, 0.6);
    p.foot('L', 0.14); p.foot('R', 0.14);
    p.hips(0, -0.08, -0.02);
    p.arm('L', PRAYER[0], PRAYER[1], PRAYER[2], PRAYER[3]); p.arm('R', PRAYER[0], PRAYER[1], PRAYER[2], PRAYER[3]);
    p.lean(0.12, 0.08); p.look(0.18);
  },

  // ── Intro / taunt / victory ────────────────────────────────
  // Intro: a polite bow, a finger to the lips — "shhh" — a slow beckon with
  // an open palm, then hands rise, palms up: relax.
  sageIntro(p, b, B, s) {
    groove(p, B, s, 0.5);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const bow = Math.sin(PI * clamp01(b));
        p.foot('L', 0.14); p.foot('R', 0.14);
        p.hips(0, -0.08, -0.02, 0.4);
        p.arm('L', PRAYER[0], PRAYER[1], PRAYER[2], PRAYER[3]); p.arm('R', PRAYER[0], PRAYER[1], PRAYER[2], PRAYER[3]);
        p.lean(0.35 * bow, 0.15 * bow); p.look(0.3 * bow);
      }],
      [2, (p) => {
        p.foot('L', 0.14); p.foot('R', 0.14);
        p.hips(0, -0.08, 0, 0.45);
        p.arm('L', 1.15, -0.1, 2.5, -0.75); p.arm('R', 0.3, 0.3, 0.6);
        p.look(0.05, 0.1, 0.12);
      }],
      [3, (p, b) => {
        const c = 0.5 - 0.5 * Math.cos(TAU * (b - 2));
        p.foot('L', 0.14, 0, 0.06); p.foot('R', 0.14);
        p.hips(0, -0.08, 0, 0.45);
        p.arm('L', 1.2, 0.5, 0.4 + 1.2 * c, 0.9); p.arm('R', 0.3, 0.3, 0.6);
        p.lean(0, -0.06); p.look(-0.05, 0.3);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.6);
        p.foot('L', 0.15); p.foot('R', 0.15);
        p.hips(0, -0.08, 0, 0.3);
        armMix(p, 'L', [1.2, 0.5, 0.6, 0.9], [1.0, 0.9, 0.8, 1.0], k); armMix(p, 'R', [0.3, 0.3, 0.6], [1.0, 0.9, 0.8, 1.0], k);
        p.lean(-0.04 * k, -0.12 * k); p.look(-0.1 * k, 0.2, 0.15 * k);
      }],
    ], 0.3);
  },

  // Taunt — hypnotic mind-wave: draws the palms to the chest, pushes them
  // out at you (lotuses fly ~¾ beat in), spirals the hands hypnotically,
  // then a serene shrug and prayer hands.
  sageTaunt(p, b, B, s) {
    groove(p, B, s, 0.5);
    phased(p, b, B, s, [
      [0.6, (p, b) => {
        const k = smooth(b / 0.6);
        p.foot('L', 0.15, 0, 0.1); p.foot('R', 0.16, 0, -0.08);
        p.hips(0, -0.1, -0.04 * k, 0.45);
        armMix(p, 'L', [0.6, 0.4, 1.0], [0.9, 0.1, 2.1, -0.8], k); armMix(p, 'R', [0.6, 0.4, 1.0], [0.9, 0.1, 2.1, -0.8], k);
        p.lean(-0.06 * k, -0.06 * k, 0.2); p.look(0, 0.35);
      }],
      [1.2, (p, b) => {
        const k = smooth((b - 0.6) / 0.35);
        p.foot('L', 0.15, 0, 0.18); p.foot('R', 0.16, 0, -0.1, 0.3 * k);
        p.hips(0, -0.12, 0.06 * k, 0.5);
        armMix(p, 'L', [0.9, 0.1, 2.1, -0.8], [1.5, 0.1, 0.1, -0.5], k); armMix(p, 'R', [0.9, 0.1, 2.1, -0.8], [1.5, 0.1, 0.1, -0.5], k);
        p.wrist('L', -0.9 * k); p.wrist('R', -0.9 * k);
        p.lean(0.1 * k, 0.04, 0.3); p.look(0, 0.4);
      }],
      [2.6, (p, b) => {
        const a = TAU * (b - 1.2) * 1.5;
        p.foot('L', 0.15, 0, 0.16); p.foot('R', 0.16, 0, -0.1, 0.3);
        p.hips(0, -0.12, 0.05, 0.5);
        p.arm('L', 1.4 + 0.3 * Math.sin(a), 0.15 + 0.3 * Math.cos(a), 0.4, -0.5); p.arm('R', 1.4 + 0.3 * Math.sin(-a), 0.15 + 0.3 * Math.cos(-a), 0.4, -0.5);
        p.wrist('L', -0.6, 0.3 * Math.sin(a)); p.wrist('R', -0.6, 0.3 * Math.sin(a));
        p.lean(0.06, 0.04, 0.3); p.look(0.05, 0.4, 0.1 * Math.sin(a));
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 2.6) / 0.6), shrug = Math.sin(PI * clamp01((b - 2.6) / 0.7));
        p.foot('L', 0.15, 0, 0.1); p.foot('R', 0.15, 0, -0.04);
        p.hips(0, -0.08, 0, 0.35);
        armMix(p, 'L', PALMS_UP, PRAYER, smooth((b - 3.1) / 0.5)); armMix(p, 'R', PALMS_UP, PRAYER, smooth((b - 3.1) / 0.5));
        p.shrug(0.2 * shrug); p.lean(0.05 * k, 0.03); p.look(0.1 * k, 0.2, 0.15 * shrug);
      }],
    ], 0.25);
  },

  // Victory: rises into the floating kneel and stays there, bobbing on the
  // breath, palms up.
  sageVictory(p, b, B, s) {
    groove(p, B, s, 0.15);
    const up = smooth(b / 1.2), bob = 0.05 * Math.sin(PI * b);
    seiza(p, up, bob);
    armMix(p, 'L', [0.3, 0.25, 0.4], PALMS_UP, up); armMix(p, 'R', [0.3, 0.25, 0.4], PALMS_UP, up);
    p.lean(-0.04 * up, -0.08 * up); p.look(-0.15 * up, 0, 0.08 * Math.sin(PI * b / 2));
  },
};

function lerpArr(A, B, t) { return A.map((v, i) => lerp(v, B[i] ?? 0, t)); }

export const moveMeta = {
  labels: {
    sageBreath: 'BREATH OF LIFE', sageLotusHands: 'LOTUS HANDS', sageCrane: 'WHITE CRANE', sageGlide: 'SPIRIT GLIDE',
    sageTree: 'TREE POSE', sageWarrior: 'WARRIOR FLOW', sageSpiral: 'SKY SPIRAL', sageLevitate: 'LEVITATE',
    sageRipple: 'MIND RIPPLE', sageSnake: 'SNAKE CREEPS DOWN', sageAscend: 'ASCEND', sageNirvana: 'NIRVANA',
    sageCloudHands: 'CLOUD HANDS', sageWave: 'LIQUID WAVE', sageFlow: 'OCEAN FLOW',
  },
  expressions: {
    sageCloudHands: 'smile', sageWave: 'smile', sageFlow: 'focus', sageBreath: 'joy', sageLotusHands: 'smile',
    sageCrane: 'focus', sageGlide: 'smirk', sageTree: 'joy', sageWarrior: 'focus', sageSpiral: 'joy', sageLevitate: 'joy',
    sageRipple: 'focus', sageSnake: 'focus', sageAscend: 'joy', sageNirvana: 'joy', sageAccent: 'joy',
    sageIntro: 'smile', sageTaunt: 'wink', sageVictory: 'joy',
  },
  hits: {
    sageCloudHands: 0.25, sageWave: 0.3, sageFlow: 0.35, sageBreath: 0.15, sageLotusHands: 0.25, sageGlide: 0.2,
    sageTree: 0.1, sageWarrior: 0.1, sageSpiral: 0, sageLevitate: 0, sageRipple: 0.3, sageSnake: 0.1, sageAscend: 0,
    sageNirvana: 0, sageAccent: 0.2, sageIntro: 0.2, sageTaunt: 0.3, sageVictory: 0,
  },
  fnGroove: { sageSpiral: 0.3, sageLevitate: 0.2, sageAscend: 0.25, sageNirvana: 0.15, sageVictory: 0.15 },
};

export default { moves, moveMeta };
