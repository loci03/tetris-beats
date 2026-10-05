// SKYE's moves — laid-back hip-hop / R&B on a 75 BPM half-time grid (the
// pulse is 150): the lean back, shoulder rolls, two-step glides, slow-mo
// bounce, the woah, smooth arm waves, finger snaps, a turntable scratch, a
// knee drop, hat tips and a float walk. Authored with the opponent on the
// dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, evalMove } = kit;
const PI = Math.PI;
const mod4 = (b) => ((b % 4) + 4) % 4;
const armMix = (p, side, A, B, t) => p.arm(side, lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), lerp(A[3] || 0, B[3] || 0, t));
const LOOSE = [-0.25, 0.42, 0.45, 0];            // arms hanging loose, a little out and back
const POCKET = [0.32, -0.12, 1.5, -1.2];         // hand in the hoodie pocket
const BRIM = [2.05, 0.55, 2.25, -0.4];           // fingers on the hat brim
const HEAD_BACK = [0.4, 2.2, 2.6, 0.9];          // hands behind the head
const SKY = [0.35, 2.75, 0.05, 0];               // reaching for the sky

export const moves = {
  // ── Base routines ───────────────────────────────────────────
  // The lean back: leaning way back, shoulders rocking on the pulse, arms
  // loose, knees easy, chin up.
  skyeLeanBack(p, b, B, s) {
    groove(p, B, s, 0.8);
    const lean = 0.5 - 0.5 * Math.cos(PI * b), rock = Math.sin(TAU * b);
    p.foot('L', 0.21, 0, 0.02, 0.3 * (0.5 + 0.5 * rock) ** 2); p.foot('R', 0.21, 0, 0.02, 0.3 * (0.5 - 0.5 * rock) ** 2);
    p.hips(0.03 * rock, -0.14 - 0.04 * lean, 0.05 + 0.04 * lean, 0.12 * rock);
    p.lean(-0.12 - 0.16 * lean, -0.1 - 0.1 * lean, 0.12 * rock, 0.05 * rock);
    p.shrug(0.16 * (0.5 + 0.5 * rock), 0.16 * (0.5 - 0.5 * rock));
    p.arm('L', LOOSE[0] - 0.15 * lean, LOOSE[1] + 0.1 * lean, LOOSE[2] + 0.1 * rock); p.arm('R', LOOSE[0] - 0.15 * lean, LOOSE[1] + 0.1 * lean, LOOSE[2] - 0.1 * rock);
    p.look(-0.05 - 0.08 * lean, 0.15 * rock, 0.06 * rock);
  },

  // Shoulder rolls over a lazy step-drag: step out on the beat, drag the
  // other foot in on its heel, each shoulder rolling a circle in turn.
  skyeShoulderRoll(p, b, B, s) {
    groove(p, B, s, 0.85);
    const side = Math.cos(PI * b), tL = 0.5 + 0.5 * side, tR = 1 - tL, a = TAU * b;
    p.footX('L', 0.11 + 0.15 * tL, 0.06 * 4 * tL * tR * tR, 0.03 * tR, -0.35 * tR);
    p.footX('R', -0.11 - 0.15 * tR, 0.06 * 4 * tR * tL * tL, 0.03 * tL, -0.35 * tL);
    p.hips(0.07 * side, -0.13, 0.02, 0.15 * side);
    p.add('shL', 0.25 * Math.cos(a), 0, 0.14 * (0.5 + 0.5 * Math.sin(a)));
    p.add('shR', 0.25 * Math.cos(a + PI), 0, -0.14 * (0.5 + 0.5 * Math.sin(a + PI)));
    p.add('chest', 0, 0.12 * Math.sin(a), 0);
    p.arm('L', 0.2 + 0.15 * Math.sin(a), 0.35, 1.2, -0.3); p.arm('R', 0.2 + 0.15 * Math.sin(a + PI), 0.35, 1.2, -0.3);
    p.lean(0.04, -0.06, 0.1 * side, 0.06 * side);
    p.look(0.02, 0.18 * side, 0.08 * side);
  },

  // Two-step glide: drifting side to side, one foot on its heel and the
  // other on its toe, swapping on the pulse, leaning into the travel.
  skyeGlide(p, b, B, s) {
    groove(p, B, s, 0.7);
    const X = 0.26 * Math.sin(PI * b / 2), v = Math.cos(PI * b / 2), sw = Math.sin(TAU * b);
    p.footX('L', X + 0.13, 0, 0.03 * sw, 0.45 * (0.5 + 0.5 * sw) - 0.25 * (0.5 - 0.5 * sw));
    p.footX('R', X - 0.13, 0, -0.03 * sw, 0.45 * (0.5 - 0.5 * sw) - 0.25 * (0.5 + 0.5 * sw));
    p.hips(X, -0.13, 0, 0.18 * v);
    p.arm('L', 0.25 - 0.35 * v, 0.4, 0.8 + 0.2 * sw, -0.2); p.arm('R', 0.25 + 0.35 * v, 0.4, 0.8 - 0.2 * sw, -0.2);
    p.lean(0.02, -0.08, 0.15 * v, -0.1 * v);
    p.look(0, 0.3 * v, 0.08 * v);
  },

  // Slow-mo bounce: deep, lazy knee drops on each half-time beat, head
  // nodding big, arms swinging slow like a stroll; an arm wave on 4.
  skyeSlowBounce(p, b, B, s) {
    groove(p, B, s, 0.5);
    const ph = mod4(b), dip = Math.pow(0.5 + 0.5 * Math.cos(TAU * (b - 0.1)), 1.5), side = Math.cos(PI * b);
    const wave = win(ph, 2.7, 4, 0.4), w = Math.sin(TAU * (b - 3));
    p.foot('L', 0.2, 0, 0.03 * side); p.foot('R', 0.2, 0, -0.03 * side);
    p.hips(0.04 * side, -0.08 - 0.22 * dip, 0, 0.1 * side);
    armMix(p, 'L', [0.15 + 0.45 * side, 0.3, 0.9, -0.2], [0.3, 1.5 + 0.3 * w, 0.4 + 0.4 * w, 1.4], wave);
    armMix(p, 'R', [0.15 - 0.45 * side, 0.3, 0.9, -0.2], [0.3, 1.5 - 0.3 * w, 0.4 - 0.4 * w, 1.4], wave);
    p.lean(0.08 * dip - 0.06, 0.05 * dip, 0.08 * side);
    p.look(0.28 * dip - 0.1, 0.1 * side);
  },

  // ── Tier 1 ──────────────────────────────────────────────────
  // Nod & snap: step-drag with finger snaps out to the side on the
  // off-pulses, head nodding.
  skyeNodSnap(p, b, B, s) {
    groove(p, B, s, 0.85);
    const side = Math.cos(PI * b), tL = 0.5 + 0.5 * side, tR = 1 - tL;
    const snap = Math.pow(Math.sin(PI * b), 8);                // flick on each off-beat
    p.footX('L', 0.12 + 0.13 * tL, 0.05 * 4 * tL * tR * tR, 0, 0.35 * tR); p.footX('R', -0.12 - 0.13 * tR, 0.05 * 4 * tR * tL * tL, 0, 0.35 * tL);
    p.hips(0.06 * side, -0.12, 0, 0.14 * side);
    p.arm('L', 0.7 + 0.25 * tL, 0.7 + 0.3 * tL, 1.7, -0.6); p.arm('R', 0.7 + 0.25 * tR, 0.7 + 0.3 * tR, 1.7, -0.6);
    p.wrist('L', 0.4 * tL * snap); p.wrist('R', 0.4 * tR * snap);
    p.lean(0.03, -0.06, 0.14 * side, 0.05 * side);
    p.look(0.05, 0.25 * side, 0.08 * side);
  },

  // Smooth arm wave: a ripple through both arms, left to right then back,
  // body riding it, knees bouncing.
  skyeArmWave(p, b, B, s) {
    groove(p, B, s, 0.8);
    const dir = Math.cos(PI * b / 2) >= 0 ? 1 : -1;
    const w = (k) => Math.sin(TAU * b - k * 0.8 * dir);
    const side = Math.sin(PI * b / 2);
    p.foot('L', 0.2); p.foot('R', 0.2);
    p.hips(0.06 * side, -0.14, 0, 0.1 * side);
    p.arm('L', 0.2, 1.45 + 0.35 * w(2), 0.5 + 0.45 * w(1), 1.4); p.wrist('L', 0.6 * w(0));
    p.arm('R', 0.2, 1.45 + 0.35 * w(4), 0.5 + 0.45 * w(5), 1.4); p.wrist('R', 0.6 * w(6));
    p.shrug(0.14 * w(3), -0.14 * w(3));
    p.lean(0.02, -0.04, 0, 0.12 * w(3));
    p.look(-0.02, 0.25 * side, 0.1 * w(3));
  },

  // ── Tier 2 ──────────────────────────────────────────────────
  // The woah: snap into a sharp pose on each beat — then melt out of it
  // smooth and slow, leaning back.
  skyeWoah: seq(4, [
    [0, (p) => { p.foot('L', 0.2); p.foot('R', 0.22, 0, 0, 0.3); p.hips(0.04, -0.2, 0, 0.25); p.arm('L', 1.45, 0.1, 1.6, -1.3); p.arm('R', 0.2, 1.3, 0.1); p.lean(0.05, 0.05, 0.2); p.look(0.1, 0.35); }, 'snap'],
    [0.6, (p) => { p.foot('L', 0.2); p.foot('R', 0.22); p.hips(0.02, -0.12, 0.03, 0.15); p.arm('L', 0.6, 0.4, 0.9); p.arm('R', -0.1, 0.6, 0.5); p.lean(-0.1, -0.12, 0.1); p.look(-0.08, 0.2); }],
    [1, (p) => { p.foot('R', 0.2); p.foot('L', 0.22, 0, 0, 0.3); p.hips(-0.04, -0.2, 0, -0.25); p.arm('R', 1.45, 0.1, 1.6, -1.3); p.arm('L', 0.2, 1.3, 0.1); p.lean(0.05, 0.05, -0.2); p.look(0.1, -0.35); }, 'snap'],
    [1.6, (p) => { p.foot('R', 0.2); p.foot('L', 0.22); p.hips(-0.02, -0.12, 0.03, -0.15); p.arm('R', 0.6, 0.4, 0.9); p.arm('L', -0.1, 0.6, 0.5); p.lean(-0.1, -0.12, -0.1); p.look(-0.08, -0.2); }],
    [2, (p) => { p.foot('L', 0.24); p.foot('R', 0.24); p.hips(0, -0.26, 0); p.arm('L', 0.4, 0.5, 2.3, -0.9); p.arm('R', 0.4, 0.5, 2.3, -0.9); p.lean(0.18, 0.14); p.look(0.25); }, 'snap'],
    [2.6, (p) => { p.foot('L', 0.22); p.foot('R', 0.22); p.hips(0, -0.14, 0.03); p.arms(0.3, 0.5, 1.0); p.lean(-0.06, -0.1); p.look(-0.05); }],
    [3, (p) => { p.foot('L', 0.16); p.foot('R', 0.26, 0, 0.1, 0.4); p.hips(0.05, -0.16, 0, 0.3); p.arm('L', 0.5, 2.5, 0.1); p.arm('R', 0.3, 0.4, 2.4, -1.0); p.lean(-0.1, -0.15, 0.15, 0.1); p.look(-0.25, 0.3); }, 'snap'],
    [3.6, (p) => { p.foot('L', 0.18); p.foot('R', 0.22, 0, 0.04); p.hips(0.02, -0.13, 0.03, 0.15); p.arm('L', 0.4, 1.2, 0.6); p.arm('R', 0.1, 0.5, 1.0); p.lean(-0.12, -0.12); p.look(-0.1, 0.15); }],
  ], { groove: 0.6, hits: 0.7 }),

  // ── Tier 4 ──────────────────────────────────────────────────
  // Turntable scratch: hunched over invisible decks, one hand scratching on
  // the 16ths, the other cutting the fader; a spin on 3, back on the decks.
  skyeScratch(p, b, B, s) {
    phased(p, b, B, s, [
      [1.8, (p, b, B, s) => scratchPose(p, b, B, s)],
      [2.8, (p, b) => {
        const t = smooth((b - 1.8) / 1.0);
        p.foot('L', 0.02, 0, 0, 0.45); p.foot('R', 0.08, 0.14, 0.04, 0.5);
        p.hips(0, -0.06, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.7, 0.9, 1.4, -0.4); p.arm('R', 0.7, 0.9, 1.4, -0.4); p.look(-0.1);
      }],
      [Infinity, (p, b, B, s) => {
        scratchPose(p, b, B, s);
        const k = win(b, 3.45, 4.2, 0.3);
        armMix(p, 'L', [0.85, 0.3, 1.5, -0.6], SKY, k);
        p.look(-0.25 * k, 0.1 * k);
      }],
    ], 0.2);
  },

  // Knee drop: slides smoothly down onto the right knee, leans back with a
  // hand to the sky, nodding, then rises.
  skyeKneeDrop(p, b, B, s) {
    phased(p, b, B, s, [
      [1.2, (p, b) => {
        const t = smooth(b / 1.2);
        p.foot('L', 0.15, 0, 0.18 * t); p.foot('R', 0.13, 0.04 * Math.sin(PI * t), -0.38 * t, 0.9 * t);
        p.hips(0, -0.04 - 0.42 * t, -0.04 * t);
        p.arm('L', 0.4, 0.5 + 0.4 * t, 0.6); p.arm('R', 0.4, 0.5, 0.6);
        p.lean(0.15 * t, 0.05 * t); p.look(0.1 * t);
      }],
      [3, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 1.2) / 0.5), nod = Math.pow(0.5 + 0.5 * Math.cos(TAU * b * 2), 2);
        p.foot('L', 0.15, 0, 0.18); p.foot('R', 0.13, 0.02, -0.38, 0.9);
        p.hips(0, -0.46, -0.04 - 0.04 * k);
        armMix(p, 'L', [0.4, 0.9, 0.6], SKY, k); armMix(p, 'R', [0.4, 0.5, 0.6], [0.2, 0.5, 1.4, -0.4], k);
        p.lean(-0.25 * k, -0.15 * k, 0.15 * k); p.look(-0.25 * k + 0.12 * nod, 0.2 * k);
      }],
      [Infinity, (p, b) => {
        const t = smooth((b - 3) / 0.9);
        p.foot('L', 0.15, 0, 0.18 * (1 - t)); p.foot('R', 0.13 + 0.06 * t, 0.06 * Math.sin(PI * t), -0.38 * (1 - t), 0.9 * (1 - t));
        p.hips(0, -0.46 + 0.32 * t, -0.08 * (1 - t));
        armMix(p, 'L', SKY, LOOSE, t); armMix(p, 'R', [0.2, 0.5, 1.4, -0.4], LOOSE, t);
        p.lean(-0.25 * (1 - t) - 0.08 * t, -0.15 * (1 - t)); p.look(-0.25 * (1 - t));
      }],
    ], 0.25);
  },

  // ── ★ Signature moves ───────────────────────────────────────
  // Hat tip: fingers to the brim with a little head dip, a body roll down,
  // a hand wave out, and two fingers pointed at you.
  skyeHatTip(p, b, B, s) {
    groove(p, B, s, 0.6);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const dip = Math.sin(PI * clamp01(b));
        p.foot('L', 0.16, 0, 0.06); p.foot('R', 0.19, 0, -0.04, 0.3);
        p.hips(0.03, -0.12, 0, 0.2);
        p.arm('R', BRIM[0], BRIM[1], BRIM[2], BRIM[3]); p.arm('L', POCKET[0], POCKET[1], POCKET[2], POCKET[3]);
        p.lean(0.08 * dip, 0.05 * dip); p.look(0.3 * dip, 0.1);
      }],
      [2.5, (p, b) => {
        const ph = TAU * (b - 1) / 1.5, w = (k) => Math.sin(ph - k);
        p.foot('L', 0.19); p.foot('R', 0.19);
        p.hips(0.02 * w(1.8), -0.1 - 0.1 * (0.5 + 0.5 * w(2.4)), 0.08 * w(1.6), 0.3);
        p.add('spine', 0.2 * w(0.8)); p.add('chest', 0.3 * w(0)); p.add('hips', -0.18 * w(1.6));
        p.arm('R', 0.6 - 0.3 * (0.5 - 0.5 * Math.cos(ph)), 0.3, 2.0 - 1.2 * (0.5 - 0.5 * Math.cos(ph)), -0.8);
        p.arm('L', 0.3, 2.0 + 0.1 * w(0.5), 0.5 + 0.2 * w(0.5));
        p.look(-0.25 * w(-0.6), 0.15);
      }],
      [3.4, (p, b) => {
        const w = Math.sin(TAU * (b - 2.5) - 0);
        p.foot('L', 0.18); p.foot('R', 0.2);
        p.hips(0.02, -0.13, 0, 0.2);
        p.arm('L', 0.2, 1.45 + 0.3 * w, 0.4 + 0.4 * w, 1.4); p.arm('R', 0.2, 1.45 - 0.3 * w, 0.4 - 0.4 * w, 1.4);
        p.look(0, 0.2);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3.4) / 0.3);
        p.foot('L', 0.15, 0, 0.12); p.foot('R', 0.19, 0, -0.06, 0.4);
        p.hips(0.03, -0.12, 0.03, 0.55 * k);
        p.arm('L', 1.5, 0.3 - 0.2 * k, 0.1); p.arm('R', POCKET[0], POCKET[1], POCKET[2], POCKET[3]);
        p.lean(-0.06, -0.12, 0.2 * k); p.look(-0.1, 0.4 * k);
      }],
    ], 0.2);
  },

  // Float walk: walking on air in place — feet gliding heel-toe under him,
  // arms swimming slow, leaning way into it.
  skyeFloatWalk(p, b, B, s) {
    groove(p, B, s, 0.5);
    const a = PI * b * 2;                                      // one step per pulse
    const sL = Math.sin(a), sR = -sL;
    p.foot('L', 0.12, 0.06 * (0.5 + 0.5 * Math.cos(a)) ** 3, 0.14 * sL, 0.5 * (0.5 - 0.5 * sL));
    p.foot('R', 0.12, 0.06 * (0.5 - 0.5 * Math.cos(a)) ** 3, 0.14 * sR, 0.5 * (0.5 - 0.5 * sR));
    p.hips(0.03 * Math.sin(PI * b), -0.12 - 0.03 * Math.cos(a * 2), 0, 0.15 * Math.sin(PI * b));
    p.arm('L', 0.7 + 0.5 * Math.sin(PI * b), 0.6 + 0.3 * Math.cos(PI * b), 0.9 - 0.4 * Math.sin(PI * b), -0.2);
    p.arm('R', 0.7 - 0.5 * Math.sin(PI * b), 0.6 - 0.3 * Math.cos(PI * b), 0.9 + 0.4 * Math.sin(PI * b), -0.2);
    p.wrist('L', 0.5 * Math.sin(PI * b - 0.7)); p.wrist('R', -0.5 * Math.sin(PI * b - 0.7));
    p.lean(0.18, 0.06, 0.1 * Math.sin(PI * b));
    p.look(-0.05, 0.25 * Math.sin(PI * b / 2));
  },

  // Chill spin (the encore): one slow turn on the left foot, arms wide,
  // into a lean-back with the hands behind the head, nodding.
  skyeChillSpin(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b) => {
        const t = smooth(b / 2);
        p.foot('L', 0.02, 0, 0, 0.45); p.foot('R', 0.08, 0.15, 0.04, 0.5);
        p.hips(0, -0.06, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.3, 1.5, 0.15); p.arm('R', 0.3, 1.5, 0.15); p.look(-0.15);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.6);
        const k = smooth((b - 2) / 0.5);
        p.foot('L', 0.2); p.foot('R', 0.22, 0, 0.06, 0.3 * k);
        p.hips(0, -0.14, 0.06 * k, 0.15 * k);
        armMix(p, 'L', [0.3, 1.5, 0.15], HEAD_BACK, k); armMix(p, 'R', [0.3, 1.5, 0.15], HEAD_BACK, k);
        p.lean(-0.25 * k, -0.15 * k); p.look(-0.15 * k, 0.15 * k);
      }],
    ], 0.2);
  },

  // ★★ SOLO — sky high: two woah hits, a glide, a rising spin up on the
  // toes, and the lean back reaching for the sky.
  skyeSkyHigh(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => evalMove('skyeWoah', b * 2, B, s, p)],
      [2, (p, b, B, s) => moves.skyeGlide(p, (b - 1) * 2, B, s)],
      [3, (p, b) => {
        const t = smooth((b - 2) / 1.0), up = Math.sin(PI * t);
        p.foot('L', 0.02, 0.0, 0, 0.6 + 0.3 * up); p.foot('R', 0.08, 0.16, 0.04, 0.6);
        p.hips(0, -0.04 + 0.08 * up, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.5, 1.2 + 1.2 * t, 0.4); p.arm('R', 0.5, 1.2, 0.8);
        p.look(-0.2 * t);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.4);
        p.foot('L', 0.19); p.foot('R', 0.24, 0, 0.08, 0.4 * k);
        p.hips(0.03, -0.14, 0.06 * k, -0.15 * k);
        armMix(p, 'L', [0.5, 2.4, 0.4], SKY, k); armMix(p, 'R', [0.5, 1.2, 0.8], POCKET, k);
        p.lean(-0.25 * k, -0.18 * k, 0, 0.08 * k); p.look(-0.4 * k, 0.2 * k);
      }],
    ], 0.2);
  },

  // Phrase accent (count 5): fingers on the hat brim, other hand in the
  // pocket, leaning back, chin down — cool.
  skyeAccent(p, b, B, s) {
    groove(p, B, s, 0.7);
    p.foot('L', 0.17); p.foot('R', 0.22, 0, 0.06, 0.35);
    p.hips(0.03, -0.12, 0.04, 0.2);
    p.arm('R', BRIM[0], BRIM[1], BRIM[2], BRIM[3]); p.arm('L', POCKET[0], POCKET[1], POCKET[2], POCKET[3]);
    p.lean(-0.12, -0.1, 0.1); p.look(0.15, 0.15);
  },

  // ── Intro / taunt / victory ────────────────────────────────
  // Intro: leaning back, waves you off lazily, fixes the hat, "I see you"
  // two fingers from the eyes to you, then arms folded, nodding.
  skyeIntro(p, b, B, s) {
    groove(p, B, s, 0.6);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const f = Math.sin(TAU * b * 2);
        p.foot('L', 0.18); p.foot('R', 0.2, 0, 0.04, 0.3);
        p.hips(0.02, -0.12, 0.04, 0.3);
        p.arm('L', 0.9, 0.6, 1.2 + 0.4 * f, 0.4); p.wrist('L', 0.5 * f);
        p.arm('R', POCKET[0], POCKET[1], POCKET[2], POCKET[3]);
        p.lean(-0.15, -0.12, 0.1); p.look(-0.05, 0.2);
      }],
      [2, (p) => {
        p.foot('L', 0.18); p.foot('R', 0.2, 0, 0.04, 0.3);
        p.hips(0.02, -0.12, 0.04, 0.3);
        p.arm('R', BRIM[0], BRIM[1], BRIM[2], BRIM[3]); p.arm('L', POCKET[0], POCKET[1], POCKET[2], POCKET[3]);
        p.lean(-0.1, -0.1); p.look(0.2, 0.2);
      }],
      [3, (p, b) => {
        const k = smooth((b - 2) / 0.5);
        p.foot('L', 0.16, 0, 0.08); p.foot('R', 0.2, 0, -0.04, 0.3);
        p.hips(0.02, -0.12, 0.02, 0.45);
        armMix(p, 'L', [1.25, -0.05, 2.5, -0.75], [1.5, 0.35, 0.1, 0], k); p.arm('R', POCKET[0], POCKET[1], POCKET[2], POCKET[3]);
        p.lean(-0.05, -0.08, 0.2); p.look(-0.05, 0.4);
      }],
      [Infinity, (p, b) => {
        const nod = Math.pow(0.5 + 0.5 * Math.cos(TAU * b * 2), 2);
        p.foot('L', 0.2); p.foot('R', 0.2);
        p.hips(0, -0.14, 0.05, 0.2);
        p.arm('L', 0.5, 0.12, 1.55, -1.3); p.arm('R', 0.45, 0.1, 1.5, -1.25);
        p.lean(-0.2, -0.12); p.look(-0.08 + 0.15 * nod, 0.25);
      }],
    ], 0.25);
  },

  // Taunt — the haze: scoops the air up to the chest, sweeps a big haze
  // cloud over at you with both arms (lands ~¾ beat in), then leans back,
  // hands behind the head, shrugging.
  skyeTaunt(p, b, B, s) {
    groove(p, B, s, 0.5);
    phased(p, b, B, s, [
      [0.55, (p, b) => {
        const k = smooth(b / 0.55);
        p.foot('L', 0.16, 0, 0.06); p.foot('R', 0.2, 0, -0.06);
        p.hips(0, -0.16, -0.03, 0.1);
        armMix(p, 'L', [-0.2, 0.5, 0.4], [0.9, 0.0, 1.9, -0.9], k); armMix(p, 'R', [-0.2, 0.5, 0.4], [0.9, 0.0, 1.9, -0.9], k);
        p.lean(0.12 * k, 0.05 * k, -0.25 * k); p.look(0.05, -0.1 * k);
      }],
      [1.4, (p, b) => {
        const k = smooth((b - 0.55) / 0.45);
        p.foot('L', 0.16, 0, 0.16); p.foot('R', 0.2, 0, -0.1, 0.4 * k);
        p.hips(0.03, -0.14, 0.05 * k, 0.1 + 0.5 * k);
        armMix(p, 'L', [0.9, 0.0, 1.9, -0.9], [1.4, 0.7, 0.15, 0.4], k); armMix(p, 'R', [0.9, 0.0, 1.9, -0.9], [1.4, -0.2, 0.2, 0.4], k);
        p.wrist('L', -0.5 * k); p.wrist('R', -0.5 * k);
        p.lean(0.08, -0.04, 0.35 * k); p.look(-0.05, 0.4 * k);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 1.4) / 0.6), shrug = Math.sin(PI * clamp01((b - 2.2) / 0.8));
        p.foot('L', 0.2); p.foot('R', 0.2, 0, 0.04, 0.3);
        p.hips(0, -0.14, 0.05 * k, 0.4);
        armMix(p, 'L', [1.4, 0.7, 0.15, 0.4], HEAD_BACK, k); armMix(p, 'R', [1.4, -0.2, 0.2, 0.4], HEAD_BACK, k);
        p.shrug(0.18 * shrug); p.lean(-0.22 * k, -0.12 * k, 0.2); p.look(-0.1 * k, 0.35);
      }],
    ], 0.2);
  },

  // Victory: lean back, hands behind the head, slow nod; arms up — higher —
  // on 3 and 4.
  skyeVictory(p, b, B, s) {
    groove(p, B, s, 0.7);
    const ph = mod4(b), up = win(ph, 1.8, 4.0, 0.5), nod = Math.pow(0.5 + 0.5 * Math.cos(TAU * b * 2), 2);
    p.foot('L', 0.2); p.foot('R', 0.2, 0, 0, 0.25 * up);
    p.hips(0.03 * Math.sin(PI * b), -0.14, 0.05, 0.12 * Math.sin(PI * b));
    armMix(p, 'L', HEAD_BACK, SKY, up); armMix(p, 'R', HEAD_BACK, [0.35, 2.5, 0.2, 0], up);
    p.lean(-0.22 + 0.1 * up, -0.12 - 0.06 * up); p.look(-0.1 + 0.12 * nod - 0.2 * up, 0.15);
  },
};

// Hunched over the decks: right hand scratching on the 16ths, left hand
// flicking the fader, head nodding hard.
function scratchPose(p, b, B, s) {
  groove(p, B, s, 0.7);
  const sc = Math.sin(TAU * b * 4), fade = Math.sin(TAU * b * 2 + 0.5);
  p.foot('L', 0.22); p.foot('R', 0.22, 0, 0, 0.2 * (0.5 + 0.5 * Math.sin(TAU * b)));
  p.hips(0, -0.2, -0.04, 0);
  p.arm('R', 0.9 + 0.12 * sc, 0.35 + 0.18 * sc, 1.45, -0.6); p.wrist('R', 0.3 * sc);
  p.arm('L', 0.85, 0.3 + 0.12 * fade, 1.5, -0.6);
  p.lean(0.3, 0.12); p.look(0.15 + 0.12 * Math.pow(0.5 + 0.5 * Math.cos(TAU * b * 2), 2), 0.05);
}

export const moveMeta = {
  labels: {
    skyeNodSnap: 'NOD & SNAP', skyeArmWave: 'ARM WAVE', skyeWoah: 'THE WOAH', skyeShoulderRoll: 'SHOULDER ROLLS',
    skyeGlide: 'TWO-STEP GLIDE', skyeSlowBounce: 'SLOW-MO BOUNCE', skyeScratch: 'SCRATCH', skyeKneeDrop: 'KNEE DROP',
    skyeHatTip: 'HAT TIP', skyeFloatWalk: 'FLOAT WALK', skyeChillSpin: 'CHILL SPIN', skyeSkyHigh: 'SKY HIGH',
    skyeLeanBack: 'LEAN BACK',
  },
  expressions: {
    skyeLeanBack: 'smirk', skyeShoulderRoll: 'smile', skyeGlide: 'smirk', skyeSlowBounce: 'smile', skyeNodSnap: 'smile',
    skyeArmWave: 'focus', skyeWoah: 'o', skyeScratch: 'focus', skyeKneeDrop: 'grin', skyeHatTip: 'wink', skyeFloatWalk: 'smirk',
    skyeChillSpin: 'grin', skyeSkyHigh: 'grin', skyeAccent: 'smirk', skyeIntro: 'smirk', skyeTaunt: 'smirk', skyeVictory: 'grin',
  },
  hits: {
    skyeLeanBack: 0.6, skyeShoulderRoll: 0.7, skyeGlide: 0.5, skyeSlowBounce: 0.6, skyeNodSnap: 0.8, skyeArmWave: 0.5,
    skyeScratch: 0.6, skyeKneeDrop: 0.2, skyeHatTip: 0.5, skyeFloatWalk: 0.4, skyeChillSpin: 0.2, skyeSkyHigh: 0.1,
    skyeAccent: 0.4, skyeIntro: 0.5, skyeTaunt: 0.4, skyeVictory: 0.5,
  },
  fnGroove: { skyeKneeDrop: 0, skyeChillSpin: 0, skyeSkyHigh: 0, skyeScratch: 0.2 },
  stiff: { skyeWoah: 1.5 },
};

export default { moves, moveMeta };
