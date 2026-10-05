// MR. MONDAY's moves — Chicago/NY house (the jack, heel-toe, the skate,
// loose legs, the shuffle, the train, floor "lofting" spins) cut with
// office comedy (typing, the copier, the tie swing, the coffee-sip spin,
// the swivel chair). Mug in the right hand, clipboard in the left, always.
// Authored with the opponent on the dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, evalMove, hipHand, wideStance } = kit;

// Props: the mug carried in front (forearm forward keeps it upright), the
// sip, the clipboard hand.
const MUG = (p, fwd = 0.25, out = 0.28, elbow = 1.55, tw = -0.25) => p.arm('R', fwd, out, elbow, tw);
const SIP = (p, k = 1) => p.arm('R', lerp(0.25, 1.25, k), lerp(0.28, 0.15, k), lerp(1.55, 2.55, k), lerp(-0.25, -0.6, k));
const CLIP = (p, fwd = 0.15, out = 0.3, elbow = 0.8) => p.arm('L', fwd, out, elbow, -0.2);
// The tie hangs off the neck: roll / pitch the neck, keep the head level.
const tie = (p, roll, pitch = 0) => { p.add('neck', pitch, 0, roll); p.add('head', -pitch, 0, -roll); };
const bump = (x) => Math.sin(Math.PI * clamp01(x));

export const moves = {
  // ── Base routines ───────────────────────────────────────────
  // The jack: planted, the torso rolling into each beat, heels lifting on
  // the "and", knees pumping, mug arm and clipboard hand swinging loose.
  mondayJack(p, b, B, s) {
    groove(p, B, s, 0.9);
    const j = Math.cos(TAU * b), sw = Math.sin(Math.PI * b);
    const heel = 0.5 - 0.5 * j, dn = 0.5 + 0.5 * j;
    // Weight rocks onto one heel-lifted foot and back every two beats.
    p.foot('L', 0.2, 0, 0.02, 0.5 * heel * (0.5 + 0.5 * sw));
    p.foot('R', 0.2, 0, 0.02, 0.5 * heel * (0.5 - 0.5 * sw));
    p.hips(0.07 * sw, -0.12 - 0.13 * dn, -0.08 * j, 0.2 * sw);
    // The jack: chest punches forward into the beat and rolls back out.
    p.lean(0.1 + 0.2 * j, 0.26 * Math.cos(TAU * b - 0.7), 0.15 * sw, 0.08 * sw);
    p.look(-0.14 * Math.cos(TAU * b - 1.2), 0.2 * sw, 0.08 * sw);
    p.shrug(0.12 * heel);
    MUG(p, 0.35 + 0.3 * j, 0.35 + 0.1 * heel, 1.35 + 0.35 * j);
    CLIP(p, 0.1 - 0.55 * j * (0.6 + 0.4 * sw), 0.35 + 0.2 * heel, 0.6 + 0.7 * heel);
    p.wrist('L', 0.35 * j);
  },

  // Heel-toe: heel dug in front, toe tapped back, step out wide (the jack
  // drops into it), close in — then the other side.
  mondayHeelToe: seq(4, [
    [0, (p) => { p.footX('L', 0.14); p.footX('R', -0.17, 0.02, 0.26, -0.6); p.hips(0.07, -0.06, 0.02, -0.2); p.lean(-0.1, -0.12, -0.15); MUG(p, 0.3, 0.3, 1.5); CLIP(p, 0.35, 0.35, 0.9); p.look(0.08, -0.25); }],
    [0.5, (p) => { p.footX('L', 0.14); p.footX('R', -0.17, 0.01, -0.1, 0.6); p.hips(0.05, -0.12, 0, -0.08); p.lean(0.08, 0.1); MUG(p, 0.4, 0.3, 1.7); CLIP(p, 0.05, 0.3, 1.1); }],
    [1, (p) => { p.footX('L', 0.14); p.footX('R', -0.36); p.hips(-0.08, -0.3, -0.04, 0.1); p.lean(0.28, 0.24, 0.15, -0.06); MUG(p, 0.2, 0.5, 1.4); CLIP(p, -0.3, 0.5, 0.6); p.look(0.12, 0.1); }],
    [1.5, (p) => { p.footX('L', 0.14); p.footX('R', -0.14, 0.11); p.hips(0.05, -0.07, 0, 0); p.lean(0.02, -0.04); MUG(p, 0.3, 0.3, 1.6); CLIP(p, 0.1, 0.3, 0.9); }],
    [2, (p) => { p.footX('R', -0.14); p.footX('L', 0.17, 0.02, 0.26, -0.6); p.hips(-0.07, -0.06, 0.02, 0.2); p.lean(-0.1, -0.12, 0.15); MUG(p, 0.5, 0.2, 1.7); CLIP(p, -0.1, 0.35, 0.7); p.look(0.08, 0.25); }],
    [2.5, (p) => { p.footX('R', -0.14); p.footX('L', 0.17, 0.01, -0.1, 0.6); p.hips(-0.05, -0.12, 0, 0.08); p.lean(0.08, 0.1); MUG(p, 0.3, 0.3, 1.5); CLIP(p, 0.3, 0.3, 1.0); }],
    [3, (p) => { p.footX('R', -0.14); p.footX('L', 0.36); p.hips(0.08, -0.3, -0.04, -0.1); p.lean(0.28, 0.24, -0.15, 0.06); MUG(p, -0.1, 0.45, 1.2); CLIP(p, 0.5, 0.55, 0.8); p.look(0.12, -0.1); }],
    [3.5, (p) => { p.footX('R', -0.14); p.footX('L', 0.14, 0.11); p.hips(-0.05, -0.07, 0, 0); p.lean(0.02, -0.04); MUG(p, 0.3, 0.3, 1.6); CLIP(p, 0.1, 0.3, 0.9); }],
  ], { groove: 0.8, hits: 0.8 }),

  // The skate: push off and glide out on one foot, the other trailing
  // back on the floor, gather it in on the next beat, glide the other way.
  mondaySkate: seq(4, [
    [0, (p) => { p.footX('L', 0.24); p.footX('R', -0.3, 0, -0.26, 0.55); p.hips(0.13, -0.22, -0.02, 0.22); p.lean(0.26, 0.1, 0.25, 0.08); MUG(p, 0.9, -0.05, 1.3, -0.5); CLIP(p, -0.55, 0.45, 0.4); p.look(0.05, 0.3); }],
    [0.5, (p) => { p.footX('L', 0.22); p.footX('R', -0.12, 0.08, -0.12, 0.3); p.hips(0.1, -0.16, 0, 0.12); p.lean(0.18, 0.06, 0.12); MUG(p, 0.6, 0.15, 1.4); CLIP(p, -0.2, 0.35, 0.6); }],
    [1, (p) => { p.footX('L', 0.2); p.footX('R', 0.02, 0.14, 0.02, 0.2); p.hips(0.1, -0.08, 0, 0); p.lean(0.06, -0.04); MUG(p, 0.35, 0.3, 1.6); CLIP(p, 0.2, 0.3, 0.9); p.look(-0.05, 0); }],
    [1.5, (p) => { p.footX('L', 0.18); p.footX('R', -0.12, 0.08, 0.02); p.hips(0.04, -0.14, 0, -0.06); p.lean(0.14, 0.04); MUG(p, 0.2, 0.4, 1.4); CLIP(p, 0.45, 0.2, 1.1); }],
    [2, (p) => { p.footX('R', -0.24); p.footX('L', 0.3, 0, -0.26, 0.55); p.hips(-0.13, -0.22, -0.02, -0.22); p.lean(0.26, 0.1, -0.25, -0.08); MUG(p, -0.5, 0.45, 1.0); CLIP(p, 0.95, -0.05, 1.0, -0.5); p.look(0.05, -0.3); }],
    [2.5, (p) => { p.footX('R', -0.22); p.footX('L', 0.12, 0.08, -0.12, 0.3); p.hips(-0.1, -0.16, 0, -0.12); p.lean(0.18, 0.06, -0.12); MUG(p, -0.1, 0.35, 1.3); CLIP(p, 0.6, 0.15, 1.0); }],
    [3, (p) => { p.footX('R', -0.2); p.footX('L', -0.02, 0.14, 0.02, 0.2); p.hips(-0.1, -0.08, 0, 0); p.lean(0.06, -0.04); MUG(p, 0.35, 0.3, 1.6); CLIP(p, 0.2, 0.3, 0.9); p.look(-0.05, 0); }],
    [3.5, (p) => { p.footX('R', -0.18); p.footX('L', 0.12, 0.08, 0.02); p.hips(-0.04, -0.14, 0, 0.06); p.lean(0.14, 0.04); MUG(p, 0.5, 0.2, 1.5); CLIP(p, -0.2, 0.4, 0.7); }],
  ], { groove: 0.75, hits: 0.8, slide: true }),

  // Loose legs: a leg flicks out loose on every beat (front, front, side,
  // side), a little hop on the standing leg in between.
  mondayLooseLegs: seq(4, [
    [0, (p) => { p.foot('L', 0.1); p.foot('R', 0.28, 0.3, 0.36, -0.4); p.hips(0.07, -0.08, 0.02, -0.1); p.lean(-0.06, -0.08, -0.1); MUG(p, 0.55, 0.3, 1.5); CLIP(p, -0.3, 0.55, 0.5); p.look(0.05, -0.2); }],
    [0.5, (p) => { p.foot('L', 0.11, 0.02); p.foot('R', 0.15, 0.16, 0.04, 0.2); p.hips(0.05, 0.0, 0, 0); p.lean(0.08, 0.06); MUG(p, 0.35, 0.3, 1.6); CLIP(p, 0.1, 0.35, 0.9); }],
    [1, (p) => { p.foot('R', 0.1); p.foot('L', 0.28, 0.3, 0.36, -0.4); p.hips(-0.07, -0.08, 0.02, 0.1); p.lean(-0.06, -0.08, 0.1); MUG(p, -0.2, 0.55, 1.1); CLIP(p, 0.55, 0.3, 1.2); p.look(0.05, 0.2); }],
    [1.5, (p) => { p.foot('R', 0.11, 0.02); p.foot('L', 0.15, 0.16, 0.04, 0.2); p.hips(-0.05, 0.0, 0, 0); p.lean(0.08, 0.06); MUG(p, 0.35, 0.3, 1.6); CLIP(p, 0.1, 0.35, 0.9); }],
    [2, (p) => { p.foot('L', 0.1); p.foot('R', 0.46, 0.26, 0.08, -0.2); p.hips(0.08, -0.1, 0, 0); p.lean(0.04, 0, 0, 0.12); MUG(p, 0.2, 0.75, 1.3); CLIP(p, 0.2, 1.0, 0.4); p.look(0, -0.3, 0.1); }],
    [2.5, (p) => { p.foot('L', 0.11, 0.02); p.foot('R', 0.16, 0.16, 0.02); p.hips(0.05, 0.0); p.lean(0.08, 0.06); MUG(p, 0.35, 0.3, 1.6); CLIP(p, 0.1, 0.35, 0.9); }],
    [3, (p) => { p.foot('R', 0.1); p.foot('L', 0.46, 0.26, 0.08, -0.2); p.hips(-0.08, -0.1, 0, 0); p.lean(0.04, 0, 0, -0.12); MUG(p, 0.2, 1.0, 1.0); CLIP(p, 0.2, 0.75, 0.6); p.look(0, 0.3, -0.1); }],
    [3.5, (p) => { p.foot('R', 0.11, 0.02); p.foot('L', 0.16, 0.16, 0.02); p.hips(-0.05, 0.0); p.lean(0.08, 0.06); MUG(p, 0.35, 0.3, 1.6); CLIP(p, 0.1, 0.35, 0.9); }],
  ], { groove: 0.7, hits: 0.9 }),

  // Accent (count 3): checks his watch — you're LATE.
  mondayAccent(p, b, B, s) {
    groove(p, B, s, 0.6);
    p.foot('L', 0.14); p.foot('R', 0.17, 0, 0.05, 0.3);
    p.hips(-0.04, -0.08, 0, 0.2);
    p.arm('L', 1.35, 0.35, 2.05, -1.0);
    MUG(p, 0.15, 0.5, 1.3);
    p.lean(0.02, -0.08, 0.1); p.look(0.32, 0.3, 0.1);
  },

  // ── Tier 1 ──────────────────────────────────────────────────
  // TYPE TYPE TYPE: jacking at the desk, fingers flying (mug and all), and
  // the typewriter return swipe on 4.
  mondayTyping(p, b, B, s) {
    evalMove('mondayJack', b, B, s, p);
    const ph = ((b % 4) + 4) % 4, ret = win(ph, 2.7, 4, 0.3), k = 1 - ret;
    const t1 = Math.sin(TAU * b * 4), t2 = Math.sin(TAU * b * 4 + 2.1);
    p.arm('L', lerp(0.75 + 0.1 * t1, 0.9, ret), lerp(0.05, 0.1, ret), lerp(1.25 + 0.15 * t1, 1.1, ret), -0.4);
    p.arm('R', lerp(0.75 + 0.1 * t2, 0.9, ret), lerp(-0.05, 1.3 * smooth((ph - 2.9) / 0.8), ret), lerp(1.3 + 0.15 * t2, 0.6, ret), -0.3);
    p.wrist('L', 0.3 * t1 * k); p.wrist('R', 0.3 * t2 * k);
    p.lean(0.12 * k, 0.1 * k, -0.25 * ret);
    p.look(0.28 * k + 0.05 * Math.sin(TAU * b * 2) * k, -0.3 * ret);
  },

  // The farmer: heel-toe swivels travelling out to the left for two beats
  // and back, mug held level, clipboard hand flat out for balance.
  mondayFarmer: seq(4, [
    [0, (p) => { p.footX('L', 0.14, 0, 0, -0.35); p.footX('R', -0.12, 0, 0, 0.45); p.hips(0.0, -0.13, 0, 0.1); p.lean(0.12, 0.05, 0.1); MUG(p, 0.6, 0.15, 1.7); CLIP(p, 0.2, 1.1, 0.3); p.look(0, 0.25); }],
    [0.5, (p) => { p.footX('L', 0.22, 0, 0, 0.45); p.footX('R', -0.06, 0, 0, -0.35); p.hips(0.08, -0.17, 0, -0.1); p.lean(0.16, 0.08, -0.1); MUG(p, 0.6, 0.2, 1.7); CLIP(p, 0.25, 1.2, 0.3); }],
    [1, (p) => { p.footX('L', 0.3, 0, 0, -0.35); p.footX('R', 0.02, 0, 0, 0.45); p.hips(0.16, -0.13, 0, 0.1); p.lean(0.12, 0.05, 0.1); MUG(p, 0.6, 0.15, 1.7); CLIP(p, 0.2, 1.1, 0.3); p.look(0, 0.3); }],
    [1.5, (p) => { p.footX('L', 0.38, 0, 0, 0.45); p.footX('R', 0.1, 0, 0, -0.35); p.hips(0.24, -0.17, 0, -0.1); p.lean(0.16, 0.08, -0.1); MUG(p, 0.6, 0.2, 1.7); CLIP(p, 0.3, 1.3, 0.3); }],
    [2, (p) => { p.footX('R', 0.12, 0, 0, -0.35); p.footX('L', 0.4, 0, 0, 0.45); p.hips(0.26, -0.15, 0, -0.1); p.lean(0.1, 0.05, -0.1); MUG(p, 0.3, 1.1, 0.4); CLIP(p, 0.6, 0.15, 1.6); p.look(0, -0.25); }],
    [2.5, (p) => { p.footX('R', 0.04, 0, 0, 0.45); p.footX('L', 0.34, 0, 0, -0.35); p.hips(0.18, -0.17, 0, 0.1); p.lean(0.16, 0.08, 0.1); MUG(p, 0.35, 1.2, 0.4); CLIP(p, 0.6, 0.2, 1.6); }],
    [3, (p) => { p.footX('R', -0.04, 0, 0, -0.35); p.footX('L', 0.26, 0, 0, 0.45); p.hips(0.1, -0.13, 0, -0.1); p.lean(0.12, 0.05, -0.1); MUG(p, 0.3, 1.1, 0.4); CLIP(p, 0.6, 0.15, 1.6); p.look(0, -0.3); }],
    [3.5, (p) => { p.footX('R', -0.12, 0, 0, 0.45); p.footX('L', 0.2, 0, 0, -0.35); p.hips(0.04, -0.17, 0, 0.1); p.lean(0.16, 0.08, 0.1); MUG(p, 0.45, 0.6, 1.0); CLIP(p, 0.4, 0.6, 1.2); }],
  ], { groove: 0.8, hits: 0.8, slide: true }),

  // ── Tier 2 ──────────────────────────────────────────────────
  // The shuffle: two running-man steps, then the T-step — knee out to the
  // side while the standing foot swivels in and out, arms pistoning.
  mondayShuffle: seq(4, [
    [0, (p) => { p.foot('L', 0.12, 0, 0.12); p.foot('R', 0.12, 0.02, -0.2, 0.55); p.hips(0, -0.15, -0.02); MUG(p, 0.9, 0.2, 1.7); CLIP(p, -0.4, 0.25, 1.2); p.lean(0.24, 0.08, 0.15); }],
    [0.5, (p) => { p.foot('L', 0.12, 0.03, -0.04, 0.3); p.foot('R', 0.12, 0.4, 0.1); p.hips(0, 0.0, -0.04); MUG(p, 0.4, 0.25, 1.6); CLIP(p, 0.3, 0.25, 1.4); p.lean(0.26, 0.06); }],
    [1, (p) => { p.foot('R', 0.12, 0, 0.12); p.foot('L', 0.12, 0.02, -0.2, 0.55); p.hips(0, -0.15, -0.02); MUG(p, -0.3, 0.3, 1.3); CLIP(p, 0.85, 0.2, 1.5); p.lean(0.24, 0.08, -0.15); }],
    [1.5, (p) => { p.foot('R', 0.12, 0.03, -0.04, 0.3); p.foot('L', 0.15, 0.36, 0.06); p.hips(-0.05, 0.0, -0.04); MUG(p, 0.4, 0.25, 1.6); CLIP(p, 0.3, 0.3, 1.4); p.lean(0.2, 0.06); }],
    [2, (p) => { p.footX('R', -0.1); p.footX('L', 0.4, 0.26, 0.05); p.hips(-0.08, -0.12, 0, 0.1); MUG(p, 1.0, 0.3, 1.8); CLIP(p, 0.2, 1.4, 1.6); p.lean(0.08, 0, 0, -0.1); p.look(0, 0.25); }],
    [2.5, (p) => { p.footX('R', -0.22); p.footX('L', 0.3, 0.26, 0.05); p.hips(-0.17, -0.1, 0, -0.1); MUG(p, 0.6, 0.3, 1.8); CLIP(p, 0.5, 1.2, 1.9); p.lean(0.08, 0, 0, -0.12); }],
    [3, (p) => { p.footX('R', -0.08); p.footX('L', 0.44, 0.28, 0.05); p.hips(-0.06, -0.12, 0, 0.1); MUG(p, 1.0, 0.3, 1.8); CLIP(p, 0.2, 1.4, 1.6); p.lean(0.08, 0, 0, -0.1); p.look(0, 0.3); }],
    [3.5, (p) => { p.footX('R', -0.14); p.footX('L', 0.16, 0.12, 0.04); p.hips(-0.05, -0.08, 0, 0); MUG(p, 0.5, 0.3, 1.6); CLIP(p, 0.2, 0.4, 1.0); p.lean(0.14, 0.04); }],
  ], { groove: 0.7, hits: 0.8, slide: true }),

  // THE COPIER: bend over the glass, slap the button, ride the scan light
  // (the body waves down and back up), bump the lid with the hip, pull the
  // copy out and read it.
  mondayCopier(p, b, B, s) {
    groove(p, B, s, 0.7);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.6), press = bump((b - 0.55) / 0.45);
        wideStance(p, 0.2);
        p.hips(0, -0.1 - 0.08 * k, -0.1 * k, 0.75 * k);
        p.lean(0.55 * k, 0.25 * k);
        p.arm('L', 0.2 + 1.3 * k, 0.25, 0.3 + 0.9 * press, -0.3);
        MUG(p, 0.3 + 0.5 * k, 0.35, 1.5);
        p.look(0.1 * k, -0.3 * k);
      }],
      [3, (p, b) => {
        const u = (b - 1) / 2, sc = Math.sin(TAU * u * 2);
        wideStance(p, 0.2);
        // Hip bump into the lid on 3.
        const hb = bump((b - 2.3) / 0.7);
        p.hips(0.05 * sc - 0.1 * hb, -0.2 - 0.06 * sc, -0.12, 0.75);
        p.add('hips', 0, 0, -0.3 * hb);
        p.lean(0.55 + 0.15 * sc, 0.25 + 0.2 * Math.sin(TAU * u * 2 - 0.8));
        p.arm('L', 1.5 + 0.2 * sc, 0.2, 0.3, -0.3); MUG(p, 0.8, 0.4, 1.5);
        p.look(0.1 + 0.2 * Math.sin(TAU * u * 2 - 1.4), -0.3 + 0.3 * Math.sin(TAU * u));
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.4);
        p.foot('L', 0.15); p.foot('R', 0.17, 0, 0.04, 0.3 * k);
        p.hips(0.03, -0.1, -0.12 * (1 - k), 0.75 * (1 - k) + 0.15 * k);
        p.lean(0.55 * (1 - k), 0.25 * (1 - k) - 0.05 * k);
        p.arm('L', lerp(1.5, 1.25, k), lerp(0.2, 0.35, k), lerp(0.3, 1.1, k), -0.6);
        MUG(p, 0.3, 0.35, 1.5);
        p.look(0.2 * k, 0.4 * k, 0.12 * k);
      }],
    ]);
  },

  // ── Tier 3 ──────────────────────────────────────────────────
  // TIE SWING: the clipboard hand lassos overhead while the neck whips the
  // tie round in front of him, loose-leg kicks underneath.
  mondayTieSwing(p, b, B, s) {
    evalMove('mondayLooseLegs', b, B, s, p);
    const a = TAU * b * 1.0;
    p.arm('L', 2.5 + 0.35 * Math.sin(a), 0.6 + 0.35 * Math.cos(a), 0.7 + 0.3 * Math.sin(a + 1), -0.4);
    p.wrist('L', 0.4 * Math.cos(a));
    MUG(p, 0.2, 0.6, 1.2);
    tie(p, 0.55 * Math.sin(a), 0.3 + 0.2 * Math.cos(a));
    p.lean(-0.04, -0.12, 0.1 * Math.sin(a));
    p.look(-0.15, 0.2 * Math.sin(a), 0);
  },

  // STAPLE STOMP: knee up high, stomp it down with the clipboard
  // slamming like a stapler on every beat — and a jump on 4.
  mondayStapler(p, b, B, s) {
    const ph = ((b % 4) + 4) % 4, f = frac(b), side = Math.cos(Math.PI * Math.round(b - f));
    const jump = win(b, 2.7, 5, 0.3);
    const up = bump(f / 0.8);
    const lifted = side > 0 ? 'R' : 'L', stand = side > 0 ? 'L' : 'R';
    const kneeK = Math.pow(Math.sin(Math.PI * f), 0.8) * (1 - jump);
    const air = Math.pow(Math.sin(Math.PI * clamp01((b - 3) / 0.85)), 1.3) * jump;
    p.foot(stand, 0.14, 0.32 * air); p.foot(lifted, 0.14 + 0.04 * kneeK, 0.46 * kneeK + 0.32 * air, 0.16 * kneeK);
    p.hips(0.07 * side * kneeK, -0.08 - 0.1 * (1 - up) * (1 - jump) + 0.36 * air - 0.12 * jump * (1 - air), 0, 0.12 * side * kneeK);
    // The stapler: clipboard raised on the "and", slammed down on the beat.
    const slam = 1 - up;
    p.arm('L', lerp(2.6, 0.7, slam) * (1 - jump) + 2.7 * jump, lerp(0.3, 0.1, slam) * (1 - jump) + 0.5 * jump, lerp(1.5, 0.3, slam) * (1 - jump) + 0.2 * jump, -0.3);
    MUG(p, 0.4 * (1 - jump) + 2.5 * jump, 0.35 + 0.3 * jump, 1.5 * (1 - jump) + 0.4 * jump);
    p.lean(0.2 * slam * (1 - jump) - 0.1 * jump, 0.15 * slam * (1 - jump) - 0.15 * jump, 0.1 * side * kneeK);
    p.look(0.2 * slam * (1 - jump) - 0.3 * jump, 0.15 * side * kneeK);
    groove(p, B, s, 0.4 * (1 - jump));
  },

  // ── Tier 4 ──────────────────────────────────────────────────
  // COFFEE SIP SPIN: a long sip, a double spin on his toes with the mug
  // held high (not a drop spilled), a lunge and a toast to the crowd.
  mondayCoffeeSpin(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => {
        groove(p, B, s, 0.6);
        const k = smooth(b / 0.5);
        p.foot('L', 0.13); p.foot('R', 0.15, 0, 0.03, 0.2 * k);
        p.hips(0, -0.08, 0, 0.1);
        SIP(p, k); CLIP(p, 0.1, 0.35, 0.6);
        p.lean(-0.06 * k, -0.18 * k); p.look(-0.3 * k, 0, 0.1);
      }],
      [3, (p, b) => {
        const t = smooth((b - 1) / 2);
        p.foot('L', 0.01, 0, 0, 0.6); p.foot('R', 0.08, 0.14 + 0.08 * bump(t), 0.05, 0.6);
        p.hips(0, 0.02, 0); p.root(0, 0, 0, TAU * 2 * t);
        const r = smooth((b - 0.9) / 0.8);
        p.arm('R', lerp(1.25, 0.4, r), lerp(0.15, 2.55, r), lerp(2.55, 0.15, r), lerp(-0.6, 0, r)); p.arm('L', 0.6, 0.45, lerp(0.6, 1.9, r), -0.6);
        p.look(-0.15);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.3);
        p.foot('L', 0.16, 0, 0.26 * k); p.foot('R', 0.15, 0, -0.18 * k, 0.6 * k);
        p.hips(0.02, -0.06 - 0.16 * k, 0.04 * k, 0.25 * k);
        p.arm('R', lerp(0.4, 2.5, k), lerp(2.55, 0.4, k), 0.15, 0);
        p.arm('L', lerp(0.6, -0.3, k), 0.45, lerp(1.9, 0.5, k), -0.6 * (1 - k));
        p.lean(0.08 * k, -0.2 * k, 0.15 * k); p.look(-0.3 * k, 0.3 * k);
      }],
    ]);
  },

  // COFFEE GRINDER: drop low, one leg sweeping a full circle round the
  // floor (the b-boy grinder, house-floor style), pop up and point.
  mondayGrinder(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b);
        p.foot('L', 0.1, 0, 0.04); p.foot('R', 0.15 + 0.4 * k, 0.03 * bump(b), 0.02);
        p.hips(0.06 * k, -0.05 - 0.4 * k, -0.04 * k);
        p.lean(0.35 * k, 0.15 * k);
        p.arm('L', 0.4 + 0.6 * k, 0.4, 0.5); MUG(p, 0.5, 0.6, 1.2);
        p.look(0.15 * k);
      }],
      [3, (p, b) => {
        const t = (b - 1) / 2, a = TAU * smooth(t);
        p.foot('L', 0.04, 0, 0.04); p.foot('R', 0.58, 0.03, 0.02);
        const bob = Math.sin(TAU * b);
        p.hips(0.06, -0.47 + 0.03 * bob, -0.05); p.root(0, 0, 0, -a);
        p.lean(0.4 + 0.08 * bob, 0.18 + 0.1 * Math.sin(TAU * b - 0.8), 0.15 * Math.sin(Math.PI * b), -0.08);
        p.arm('L', 1.0 + 0.25 * bob, 0.45, 0.4 + 0.3 * Math.sin(TAU * b - 1)); MUG(p, 0.6, 0.9 + 0.2 * bob, 1.3);
        p.look(0.1 + 0.1 * bob, -0.2);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.45);
        p.foot('L', 0.12); p.foot('R', 0.58 - 0.36 * k, 0.04 * bump((b - 3) / 0.45), 0.02 + 0.06 * k, 0.4 * k);
        p.hips(0.06 - 0.02 * k, -0.47 + 0.37 * k, -0.05 * (1 - k), -0.2 * k);
        p.arm('L', 0.4, 0.3 + 2.2 * k, 0.05); MUG(p, 0.4, 0.4, 1.5);
        p.lean(0.4 * (1 - k), 0.18 * (1 - k) - 0.15 * k, 0.15 * k); p.look(-0.3 * k, 0.4 * k);
      }],
    ]);
  },

  // ── ★ Signature moves ───────────────────────────────────────
  // ★ THE JACK TRAIN: chugging side to side, arms pistoning like the
  // wheels of a locomotive, the jack slamming every beat, then he pulls
  // the whistle cord — TOOT TOOT.
  mondayJackTrain(p, b, B, s) {
    groove(p, B, s, 0.6);
    const ph = b, toot = win(b, 2.6, 5, 0.4), k = 1 - toot;
    const w = TAU * b, c = Math.cos(w), sn = Math.sin(w);
    const x = 0.06 * Math.sin(Math.PI * b / 2) * k;
    const st = Math.sin(TAU * b);                         // little shuffle steps
    p.footX('L', x + 0.15, 0.08 * Math.pow(0.5 + 0.5 * st, 3) * k, 0.02);
    p.footX('R', x - 0.15, 0.08 * Math.pow(0.5 - 0.5 * st, 3) * k, 0.02);
    p.hips(x, -0.26 - 0.08 * Math.cos(TAU * b) * k + 0.16 * toot, -0.06 * k, 0.15 * Math.sin(Math.PI * b) * k);
    p.lean(0.38 * k + 0.14 * Math.cos(TAU * b) * k - 0.08 * toot, 0.16 * k - 0.15 * toot, 0.08 * sn * k);
    // Pistons: fists cranking big wheels at the sides, opposite phase; on 3
    // the left hand reaches up and yanks the whistle cord twice.
    const yank = Math.pow(0.5 + 0.5 * Math.cos(TAU * (b - 3) * 1.5), 1.5);
    p.arm('L', lerp(0.55 + 0.75 * sn, 2.75 - 0.35 * (1 - yank), toot), lerp(0.3, 0.35, toot), lerp(1.5 + 0.6 * c, 0.4 + 0.9 * (1 - yank), toot), -0.3);
    MUG(p, lerp(0.55 - 0.75 * sn, 0.2, toot), lerp(0.3, 0.5, toot), lerp(1.5 - 0.6 * c, 1.3, toot));
    p.look(0.1 * k - 0.35 * toot, 0.2 * Math.sin(Math.PI * b / 2) * k + 0.15 * toot);
    tie(p, 0.25 * Math.sin(Math.PI * b), 0.15 * k);
  },

  // ★ SWIVEL CHAIR: sits into an invisible office chair and spins one and a
  // half turns on the ball of one foot, sipping, then pops up pointing.
  mondaySwivelChair(p, b, B, s) {
    phased(p, b, B, s, [
      [0.75, (p, b) => {
        const k = smooth(b / 0.75);
        p.foot('L', 0.06, 0, 0.02); p.foot('R', 0.12, 0.18 * k, 0.16 * k);
        p.hips(0.04 * k, -0.06 - 0.3 * k, -0.12 * k);
        p.lean(0.2 * k, 0.05);
        CLIP(p, 0.8 * k, 0.3, 1.0); MUG(p, 0.5, 0.3, 1.6);
      }],
      [2.75, (p, b) => {
        const t = smooth((b - 0.75) / 2);
        p.foot('L', 0.03, 0, 0.02, 0.4); p.foot('R', 0.1, 0.2, 0.18);
        p.hips(0.03, -0.36, -0.12); p.root(0, 0, 0, TAU * 2 * t);
        p.lean(0.2, 0.0);
        CLIP(p, 0.8, 0.3, 1.0); SIP(p, bump((b - 0.9) / 1.6));
        p.look(-0.1, 0, 0.1 * Math.sin(TAU * t));
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 2.75) / 0.4), hop = bump((b - 2.75) / 0.5);
        p.foot('L', 0.13, 0.1 * hop); p.foot('R', 0.2, 0.1 * hop + 0.12 * (1 - k), 0.06 + 0.1 * (1 - k), 0.4 * k);
        p.hips(0.04, -0.36 + 0.28 * k + 0.08 * hop, -0.12 * (1 - k), 0.2 * k);
        p.arm('L', 0.3 + 0.9 * k, 0.4 + 1.0 * k, 0.05); MUG(p, 0.4, 0.4, 1.5);
        p.lean(0.2 * (1 - k), -0.12 * k, 0.1 * k); p.look(-0.15 * k, 0.45 * k);
      }],
    ]);
  },

  // ★ OVERTIME (encore): crouch, a huge pike jump flinging the clipboard
  // overhead, stick it, glide back with a tie fix.
  mondayOvertime(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b);
        wideStance(p, 0.16);
        p.hips(0, -0.05 - 0.27 * k, -0.04 * k);
        p.arm('L', -0.6 * k + 0.2, 0.3, 0.4); MUG(p, 0.3 - 0.5 * k, 0.35, 1.4);
        p.lean(0.3 * k, 0.12 * k);
      }],
      [2, (p, b) => {
        const t = b - 1, air = Math.sin(Math.PI * t), tuck = Math.pow(air, 1.6);
        const hy = lerp(-0.32, -0.05, smooth(t / 0.3)) + 0.6 * air;
        p.hips(0, hy, 0);
        const fl = Math.max(0, hy + 0.03) * 0.9 + 0.3 * tuck;
        p.foot('L', 0.14 + 0.12 * tuck, fl, 0.38 * tuck, -0.3 * tuck); p.foot('R', 0.14 + 0.12 * tuck, fl, 0.38 * tuck, -0.3 * tuck);
        p.arm('L', 0.3 + 2.4 * air, 0.3, 0.1); MUG(p, 0.3 + 2.2 * air, 0.35, 0.3, 0);
        p.lean(0.35 * air, 0.1 * air); p.look(0.2 * air);
      }],
      [2.6, (p, b) => {
        const u = (b - 2) / 0.6, give = Math.sin(Math.PI * u);
        wideStance(p, 0.2);
        p.hips(0, -0.06 - 0.25 * give, 0);
        p.arm('L', 1.5 - 1.0 * u, 0.6 + 0.5 * u, 0.3); MUG(p, 1.4 - 1.0 * u, 0.6, 0.6 + 0.9 * u);
        p.lean(0.25 * give);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const u = smooth((b - 2.6) / 1.4), z = -0.22 * u;
        const st = Math.sin(TAU * (b - 2.6) * 1.4);
        const sl = Math.pow(0.5 + 0.5 * st, 2), sr = Math.pow(0.5 - 0.5 * st, 2);
        p.foot('L', 0.13, 0.02 * sl, z + 0.05 * st, 0.6 * sl);
        p.foot('R', 0.13, 0.02 * sr, z - 0.05 * st, 0.6 * sr);
        p.hips(0, -0.09, z, 0.1);
        p.arm('L', 1.3, 0.1, 2.3, -1.0); MUG(p, 0.3, 0.4, 1.5);
        p.lean(-0.04, -0.15); p.look(-0.18, 0.3, 0.12);
        tie(p, -0.1 * u, 0);
      }],
    ]);
  },

  // ★★ SOLO — HAPPY HOUR: yanks the tie loose with a shoulder shimmy, spins
  // down low, grinds the floor, and pops up into the coffee toast.
  mondayHappyHour(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => {
        groove(p, B, s, 0.8);
        const sh = Math.sin(TAU * b * 4), k = smooth(b / 0.6);
        wideStance(p, 0.2);
        p.hips(0, -0.12, 0, 0.15 * sh);
        p.arm('L', 1.35 * k + 0.15, 0.3 - 0.15 * k, 0.8 + 1.5 * k, -0.9 * k); MUG(p, 0.3, 0.7, 1.2);
        p.shrug(0.16 * sh, -0.16 * sh); p.add('chest', 0, 0.12 * sh, 0);
        tie(p, 0.5 * Math.sin(TAU * b * 2), 0.3 * k);
        p.look(-0.15, 0.2 * sh, 0.15);
      }],
      [2.1, (p, b) => {
        const t = smooth((b - 1) / 1.1);
        const ext = smooth((b - 1.6) / 0.5);
        p.foot('L', 0.02 + 0.02 * ext, 0, 0.04 * ext, 0.4 * (1 - ext)); p.foot('R', 0.1 + 0.46 * ext, 0.12 * bump(t) + 0.03, 0.05 - 0.03 * ext, 0.4 * (1 - ext));
        p.hips(0.06 * ext, -0.04 - 0.42 * t, -0.05 * ext); p.root(0, 0, 0, TAU * 2 * t);
        p.arm('L', 0.6, 1.4, 0.5); MUG(p, 0.4, 1.4, 0.6, 0);
        p.lean(0.2 * t);
      }],
      [3.2, (p, b) => {
        const t = (b - 2.1) / 1.1, a = TAU * smooth(t);
        p.foot('L', 0.04, 0, 0.04); p.foot('R', 0.56, 0.03, 0.02);
        const bob = Math.sin(TAU * b);
        p.hips(0.06, -0.46 + 0.03 * bob, -0.05); p.root(0, 0, 0, -a);
        p.lean(0.4 + 0.08 * bob, 0.18 + 0.1 * Math.sin(TAU * b - 0.8), 0, -0.08);
        p.arm('L', 1.0 + 0.25 * bob, 0.45, 0.4 + 0.3 * Math.sin(TAU * b - 1)); MUG(p, 0.6, 1.0, 1.2);
        p.look(0.1, -0.2);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.2) / 0.35), hop = bump((b - 3.2) / 0.4);
        p.foot('L', 0.13, 0.05 * hop); p.foot('R', 0.15, 0.3 * k, 0.12 * k);
        p.hips(0.07 * k, -0.46 + 0.38 * k + 0.12 * hop, 0, 0.15 * k);
        MUG(p, 1.2 + 1.35 * k, 0.4, 0.15, 0); p.arm('L', 0.3, 1.6 * k, 0.1);
        p.lean(0.4 * (1 - k), 0.18 * (1 - k) - 0.2 * k); p.look(-0.35 * k, 0.2 * k);
      }],
    ]);
  },

  // ── Battle actions ──────────────────────────────────────────
  // Intro (faces the player, +x): taps the watch, points you out, writes
  // you up on the clipboard, "tsk tsk" and a smug sip.
  // faceFoe moves are mirrored for the rival, so here the mug is authored on
  // the LEFT arm and the clipboard on the RIGHT — they land on the right
  // hands once mirrored.
  mondayIntro(p, b, B, s) {
    groove(p, B, s, 0.4);
    p.foot('L', 0.13, 0, 0.08); p.foot('R', 0.16, 0, -0.05, 0.3);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const tap = Math.sin(TAU * b * 3);
        p.hips(0, -0.06, 0, 0.35);
        p.arm('R', 1.35, 0.35, 2.05, -1.0);                      // watch (clipboard hand)
        p.arm('L', 1.05, 0.0, 1.9 + 0.12 * tap, -0.8);           // tapping it
        p.look(0.3, -0.1, -0.1); p.lean(0.03, -0.05);
      }],
      [2, (p, b) => {
        const k = smooth((b - 0.9) / 0.5);
        p.hips(0.02, -0.07, 0, 0.75);
        // Points you out with the clipboard hand, across the body.
        p.arm('R', lerp(1.35, 1.45, k), lerp(0.35, -0.55, k), lerp(2.05, 0.1, k), lerp(-1.0, 0, k));
        p.arm('L', 0.25, 0.3, 1.5, -0.25);
        p.lean(0, -0.12 * k, 0.25 * k); p.look(-0.08, 0.3 * k);
      }],
      [3, (p, b) => {
        const w = Math.sin(TAU * (b - 2) * 4);
        p.hips(0, -0.06, 0, 0.45);
        p.arm('R', 1.1, 0.0, 1.6, -0.9);                         // clipboard up
        p.arm('L', 1.0, -0.05, 1.7 + 0.15 * w, -0.9);            // scribbling
        p.look(0.35, -0.05 + 0.08 * w); p.lean(0.06, 0.05);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.3), shake = Math.sin(TAU * (b - 3) * 3) * (1 - smooth((b - 3.6) / 0.3));
        const sip = smooth((b - 3.3) / 0.4);
        p.hips(0.03, -0.07, 0, 0.45);
        p.arm('R', 0.15, 0.3, 0.8, -0.2);
        p.arm('L', lerp(0.25, 1.25, sip), lerp(0.28, 0.15, sip), lerp(1.55, 2.55, sip), lerp(-0.25, -0.6, sip));
        p.look(-0.1, 0.3 + 0.3 * shake * k, 0.1); p.lean(-0.04, -0.12 * k);
      }],
    ]);
  },

  // TPS REPORTS: rips the papers off the clipboard and flings them
  // backhand across his body at you (thrown at +0.75 beats), dusts off,
  // smug sip. Faces the foe (+x); props authored mirrored (see above).
  mondayTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    p.foot('L', 0.14, 0, 0.12); p.foot('R', 0.16, 0, -0.08, 0.35);
    phased(p, b, B, s, [
      [0.55, (p, b) => {
        const k = smooth(b / 0.5);
        p.hips(-0.03, -0.1, -0.03, 0.3 + 0.3 * k);
        // Wind up: clipboard hand cocked back over the far shoulder.
        p.arm('R', 0.6 + 0.9 * k, -0.3 - 0.5 * k, 1.0 + 1.1 * k, -0.6 * k);
        p.arm('L', 0.3, 0.3, 1.5, -0.25);
        p.lean(0.05 * k, -0.1 * k, -0.2 * k); p.look(-0.1, 0.35);
      }],
      [1.5, (p, b) => {
        const t = smooth((b - 0.55) / 0.3);
        p.hips(0.04 * t, -0.1, 0.05 * t, 0.6 + 0.3 * t);
        // Backhand fling: the arm whips out toward the foe.
        p.arm('R', lerp(1.5, 1.55, t), lerp(-0.8, 0.2, t), lerp(2.1, 0.05, t), lerp(-0.6, 0, t));
        p.arm('L', 0.3, 0.3, 1.5, -0.25);
        p.lean(0.18 * t, 0.1 * t, 0.3 * t); p.look(-0.05, 0.35);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 1.5) / 0.4), d = Math.sin(TAU * (b - 1.5) * 3) * (1 - smooth((b - 2.3) / 0.3));
        const sip = smooth((b - 2.2) / 0.5);
        p.hips(0.02, -0.08, 0.02, 0.6);
        p.arm('R', 0.5, 0.45 + 0.1 * d, 1.0 + 0.4 * d, -0.4);
        p.arm('L', lerp(0.3, 1.25, sip), lerp(0.3, 0.15, sip), lerp(1.5, 2.55, sip), lerp(-0.25, -0.6, sip));
        p.lean(0.02, -0.15 * k); p.look(-0.2 * k, 0.3, 0.1);
      }],
    ]);
  },

  // Employee of the month: raises the mug, jacks with satisfaction.
  mondayVictory(p, b, B, s) {
    evalMove('mondayJack', b, B, s, p);
    const up = 0.5 - 0.5 * Math.cos(Math.PI * b);
    MUG(p, 2.4, 0.35 + 0.2 * up, 0.25, 0);
    p.arm('L', 0.3 + 0.2 * up, 0.5 + 1.6 * up, 0.2);
    p.look(-0.3, 0.2 * Math.sin(Math.PI * b));
    p.lean(0, -0.12);
  },
};

export const moveMeta = {
  labels: {
    mondayTyping: 'TYPE TYPE TYPE', mondayFarmer: 'THE FARMER', mondayShuffle: 'THE SHUFFLE', mondayCopier: 'THE COPIER',
    mondayTieSwing: 'TIE SWING', mondayStapler: 'STAPLE STOMP', mondayCoffeeSpin: 'COFFEE SIP SPIN', mondayGrinder: 'COFFEE GRINDER',
    mondayJackTrain: 'JACK TRAIN', mondaySwivelChair: 'SWIVEL CHAIR', mondayOvertime: 'OVERTIME', mondayHappyHour: 'HAPPY HOUR',
    mondayTaunt: 'TPS REPORTS!', mondayIntro: 'YOU\'RE LATE', mondayVictory: 'EMPLOYEE OF THE MONTH',
  },
  expressions: {
    mondayJack: 'focus', mondayHeelToe: 'smirk', mondaySkate: 'grin', mondayLooseLegs: 'joy', mondayAccent: 'angry',
    mondayTyping: 'focus', mondayFarmer: 'smirk', mondayShuffle: 'grin', mondayCopier: 'o',
    mondayTieSwing: 'shout', mondayStapler: 'angry', mondayCoffeeSpin: 'joy', mondayGrinder: 'focus',
    mondayJackTrain: 'shout', mondaySwivelChair: 'smirk', mondayOvertime: 'shout', mondayHappyHour: 'joy',
    mondayIntro: 'angry', mondayTaunt: 'angry', mondayVictory: 'joy',
  },
  hits: {
    mondayJack: 1, mondayAccent: 0.4, mondayTyping: 0.8, mondayCopier: 0.6, mondayTieSwing: 0.7, mondayStapler: 0.5,
    mondayCoffeeSpin: 0.2, mondayGrinder: 0, mondayJackTrain: 0.9, mondaySwivelChair: 0.1, mondayOvertime: 0.1,
    mondayHappyHour: 0, mondayIntro: 0.5, mondayTaunt: 0.4, mondayVictory: 0.6,
  },
  fnGroove: {
    mondayCoffeeSpin: 0, mondayGrinder: 0, mondaySwivelChair: 0, mondayOvertime: 0, mondayHappyHour: 0,
    mondayStapler: 0, mondayCopier: 0.2,
  },
  stiff: { mondayTyping: 1.3, mondayStapler: 1.3 },
};

export default { moves, moveMeta };
