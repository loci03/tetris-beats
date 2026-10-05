// COCO's moves — 70s/80s roller disco (strides, crossovers, the fishtail,
// spins, shoot-the-duck, the camel spin, an axel), beach party (surf
// stance, shaka shuffle, hula hips, limbo, the bump). She's on quad
// skates, so her feet glide: stepping moves use `slide`. Authored with the
// opponent on the dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, evalMove, hipHand, clapFront, clapHigh, wideStance } = kit;

const bump = (x) => Math.sin(Math.PI * clamp01(x));
const PEEK = (p, k = 1) => p.arm('R', lerp(0.1, 2.3, k), lerp(0.2, 0.2, k), lerp(0.4, 1.2, k), lerp(0, -1.1, k));   // finger on the shades
const shaka = (p, side, wag) => { p.arm(side, 0.5, 2.0, 1.3, 0.6); p.wrist(side, 0.35 * wag, 0.25 * wag); };

export const moves = {
  // ── Base routines ───────────────────────────────────────────
  // The stride: push one skate out diagonally behind, glide on the other,
  // draw it back in, push the other way — arms swinging like a speed skater.
  cocoGlide: seq(4, [
    [0, (p) => { p.footX('L', 0.16, 0, 0.08); p.footX('R', -0.44, 0.02, -0.3, 0.3); p.hips(0.1, -0.22, -0.04, 0.3); p.lean(0.26, 0.1, 0.3, 0.1); p.arm('L', -0.75, 0.35, 0.3); p.arm('R', 1.05, -0.15, 0.7, -0.3); p.look(0.0, 0.3); }],
    [1, (p) => { p.footX('L', 0.13, 0, 0.02); p.footX('R', -0.1, 0, 0.02); p.hips(0, -0.06, 0, 0); p.lean(0.0, -0.08); p.arms(0.25, 0.75, 0.5); p.wrist('L', 0.4); p.wrist('R', 0.4); p.look(-0.12, 0); }],
    [2, (p) => { p.footX('R', -0.16, 0, 0.08); p.footX('L', 0.44, 0.02, -0.3, 0.3); p.hips(-0.1, -0.22, -0.04, -0.3); p.lean(0.26, 0.1, -0.3, -0.1); p.arm('R', -0.75, 0.35, 0.3); p.arm('L', 1.05, -0.15, 0.7, -0.3); p.look(0.0, -0.3); }],
    [3, (p) => { p.footX('R', -0.13, 0, 0.02); p.footX('L', 0.1, 0, 0.02); p.hips(0, -0.06, 0, 0); p.lean(0.0, -0.08); p.arms(0.25, 0.75, 0.5); p.wrist('L', -0.4); p.wrist('R', -0.4); p.look(-0.12, 0); }],
  ], { groove: 0.8, hits: 0.7, slide: true }),

  // Hula: hips rolling in circles over planted skates, both arms waving out
  // to one side, then flowing over to the other.
  cocoHula(p, b, B, s) {
    groove(p, B, s, 0.6);
    const a = TAU * b * 0.5, side = Math.sin(Math.PI * b / 2);
    wideStance(p, 0.17);
    p.hips(0.08 * Math.cos(a), -0.12, 0.05 * Math.sin(a), 0.25 * Math.cos(a));
    p.add('hips', 0, 0, -0.15 * Math.cos(a));
    p.lean(0, 0, -0.15 * side, -0.1 * Math.cos(a));
    const w = Math.sin(TAU * b);
    p.arm('L', 0.5, 0.9 + 0.55 * side, 0.35 + 0.25 * w, 0.2);
    p.arm('R', 0.5, 0.9 - 0.55 * side, 0.35 - 0.25 * w, 0.2);
    p.wrist('L', 0.4 * Math.sin(TAU * b + 1), 0.3 * w); p.wrist('R', 0.4 * Math.sin(TAU * b + 2), -0.3 * w);
    p.look(0.05, 0.25 * side, -0.1 * side);
  },

  // Crossovers: the left skate crosses over the right (like taking a
  // curve), steps back out, then the right crosses over the left.
  cocoCrossover: seq(4, [
    [0, (p) => { p.footX('L', 0.18); p.footX('R', -0.18); p.hips(0, -0.14, 0, 0.15); p.lean(0.12, 0, 0.2, 0.1); p.arm('L', 0.3, 1.2, 0.3); p.arm('R', 0.7, 0.6, 0.6, -0.3); p.look(0.05, 0.3); }],
    [0.5, (p) => { p.footX('L', 0.02, 0.14, 0.08); p.footX('R', -0.18); p.hips(-0.1, -0.08, 0, 0.2); p.lean(0.1, 0, 0.25, 0.12); p.arm('L', 0.3, 1.3, 0.3); p.arm('R', 0.6, 0.7, 0.6, -0.3); }],
    [1, (p) => { p.footX('L', -0.12, 0, 0.1); p.footX('R', -0.2, 0, -0.06, 0.3); p.hips(-0.13, -0.18, 0.02, 0.3); p.lean(0.14, 0.04, 0.3, 0.14); p.arm('L', 0.2, 1.5, 0.2); p.arm('R', 0.5, 0.8, 0.5, -0.3); p.look(0.08, 0.35); }],
    [1.5, (p) => { p.footX('L', 0.1); p.footX('R', -0.2, 0.12, 0.0); p.hips(0.03, -0.1, 0, 0.15); p.lean(0.06, 0, 0.1); p.arms(0.3, 0.9, 0.4); }],
    [2, (p) => { p.footX('L', 0.18); p.footX('R', -0.18); p.hips(0, -0.14, 0, -0.15); p.lean(0.12, 0, -0.2, -0.1); p.arm('R', 0.3, 1.2, 0.3); p.arm('L', 0.7, 0.6, 0.6, -0.3); p.look(0.05, -0.3); }],
    [2.5, (p) => { p.footX('R', -0.02, 0.14, 0.08); p.footX('L', 0.18); p.hips(0.1, -0.08, 0, -0.2); p.lean(0.1, 0, -0.25, -0.12); p.arm('R', 0.3, 1.3, 0.3); p.arm('L', 0.6, 0.7, 0.6, -0.3); }],
    [3, (p) => { p.footX('R', 0.12, 0, 0.1); p.footX('L', 0.2, 0, -0.06, 0.3); p.hips(0.13, -0.18, 0.02, -0.3); p.lean(0.14, 0.04, -0.3, -0.14); p.arm('R', 0.2, 1.5, 0.2); p.arm('L', 0.5, 0.8, 0.5, -0.3); p.look(0.08, -0.35); }],
    [3.5, (p) => { p.footX('R', -0.1); p.footX('L', 0.2, 0.12, 0.0); p.hips(-0.03, -0.1, 0, -0.15); p.lean(0.06, 0, -0.1); p.arms(0.3, 0.9, 0.4); }],
  ], { groove: 0.7, hits: 0.8, slide: true }),

  // Glide-and-clap: glide out left, clap; glide out right, clap up high,
  // shoulders shimmying through it.
  cocoClapSkate: seq(4, [
    [0, (p) => { p.footX('L', 0.32); p.footX('R', -0.1, 0, -0.06, 0.3); p.hips(0.12, -0.16, 0, 0.15); p.arm('L', 0.3, 1.3, 0.3); p.arm('R', 0.4, 0.9, 0.5); p.lean(0.06, 0, 0.15, 0.1); p.look(0, 0.3); }],
    [1, (p) => { p.footX('L', 0.2); p.footX('R', -0.06); p.hips(0.06, -0.08, 0, 0); clapFront(p, 0.05); p.lean(0.06, 0.08); p.look(0.1, 0.1); }],
    [2, (p) => { p.footX('R', -0.32); p.footX('L', 0.1, 0, -0.06, 0.3); p.hips(-0.12, -0.16, 0, -0.15); p.arm('R', 0.3, 1.3, 0.3); p.arm('L', 0.4, 0.9, 0.5); p.lean(0.06, 0, -0.15, -0.1); p.look(0, -0.3); }],
    [3, (p) => { p.footX('R', -0.2); p.footX('L', 0.06); p.hips(-0.06, -0.04, 0, 0); clapHigh(p, 0.05); p.lean(-0.06, -0.12); p.look(-0.3, -0.1); }],
  ], { groove: 0.8, hits: 0.9, slide: true }),

  // Accent (count 5): hip out, one finger pulls the shades down — wink.
  cocoAccent(p, b, B, s) {
    groove(p, B, s, 0.6);
    p.foot('L', 0.12, 0, 0.04, 0.3); p.foot('R', 0.18);
    p.hips(-0.08, -0.08, 0, -0.25); p.add('hips', 0, 0, 0.18);
    PEEK(p, 1); hipHand(p, 'L');
    p.lean(-0.04, -0.1, 0.15, 0.1); p.look(0.15, 0.2, 0.15);
  },

  // ── Tier 1 ──────────────────────────────────────────────────
  // SURF'S UP: swings round into a surf stance and rides the wave — bobbing
  // over the swell, arms seesawing for balance, a cutback crouch on 3.
  cocoSurfer(p, b, B, s) {
    groove(p, B, s, 0.4);
    const k = smooth(b / 0.5) * (1 - smooth((b - 3.5) / 0.5));
    const wave = Math.sin(Math.PI * b), cut = win(b, 2.6, 3.6, 0.35);
    p.foot('L', 0.17, 0, 0.3 * k); p.foot('R', 0.17, 0, -0.3 * k);
    p.root(0, 0, 0, 1.1 * k);
    p.hips(0, -0.26 - 0.1 * (0.5 + 0.5 * wave) - 0.14 * cut, 0, -0.1 * wave * k);
    p.lean(0.2 * k + 0.1 * cut, 0.05, -0.2 * wave * k, 0.12 * wave * k);
    p.arm('L', lerp(0.2, 0.6, k), lerp(0.3, 1.1 + 0.4 * wave, k), 0.25);
    p.arm('R', lerp(0.2, -0.3, k), lerp(0.3, 1.1 - 0.4 * wave, k), 0.25);
    p.look(0.1, -0.9 * k + 0.2 * cut, 0.1 * wave);
  },

  // HANG LOOSE: the beach shuffle — heel-toe side steps, shaka hand up and
  // wagging, switching hands every two beats.
  cocoShaka(p, b, B, s) {
    groove(p, B, s, 0.8);
    const side = Math.cos(Math.PI * b / 2);               // +1 → left hand up
    const f = frac(b), heel = Math.sin(Math.PI * f);
    const x = 0.05 * Math.sin(Math.PI * b);
    p.footX('L', x + 0.15, 0.03 * heel * (0.5 + 0.5 * Math.cos(Math.PI * b)), 0.06 * Math.cos(Math.PI * b), -0.35 * heel * (0.5 + 0.5 * Math.cos(Math.PI * b)));
    p.footX('R', x - 0.15, 0.03 * heel * (0.5 - 0.5 * Math.cos(Math.PI * b)), -0.06 * Math.cos(Math.PI * b), -0.35 * heel * (0.5 - 0.5 * Math.cos(Math.PI * b)));
    p.hips(x, -0.12, 0, 0.15 * Math.sin(Math.PI * b));
    const wag = Math.sin(TAU * b * 2);
    const up = 0.5 + 0.5 * side;
    p.arm('L', lerp(0.3, 0.5, up), lerp(0.4, 2.0, up), lerp(0.5, 1.3, up), 0.6 * up); p.wrist('L', 0.35 * wag * up, 0.25 * wag * up);
    p.arm('R', lerp(0.3, 0.5, 1 - up), lerp(0.4, 2.0, 1 - up), lerp(0.5, 1.3, 1 - up), 0.6 * (1 - up)); p.wrist('R', 0.35 * wag * (1 - up), 0.25 * wag * (1 - up));
    p.lean(0.04, -0.06, 0.15 * side, 0.08 * side); p.look(0, 0.25 * side, 0.1 * side);
  },

  // ── Tier 2 ──────────────────────────────────────────────────
  // THE BUMP: hip bumps side to side on every beat, a clap on each "and",
  // and a big double bump with the arms up on 3.
  cocoBump(p, b, B, s) {
    groove(p, B, s, 0.5);
    const side = Math.cos(Math.PI * b), big = win(b, 2.45, 4.5, 0.55);
    const hit = Math.pow(Math.abs(side), 3);
    wideStance(p, 0.2);
    p.hips(0.13 * side, -0.14 - 0.05 * (1 - hit), 0, -0.25 * side);
    p.add('hips', 0, 0, (0.32 + 0.15 * big) * side * hit);
    p.lean(0.03, -0.04, 0.2 * side, -0.15 * side);
    const clap = Math.exp(-frac(b + 0.5) * 6) * (1 - big);
    p.arm('L', lerp(0.9, 0.3, big), lerp(-0.25 + 0.5 * (1 - clap), 2.6, big), lerp(0.75, 0.15, big));
    p.arm('R', lerp(0.9, 0.3, big), lerp(-0.25 + 0.5 * (1 - clap), 2.6, big), lerp(0.75, 0.15, big));
    p.look(0.05 - 0.2 * big, -0.2 * side, -0.12 * side);
  },

  // FISHTAIL: the roller scissor — skates slide out into a wide V and
  // back together on every beat, sinking and rising, arms rolling outward.
  cocoFishtail(p, b, B, s) {
    groove(p, B, s, 0.4);
    const o = 0.5 - 0.5 * Math.cos(TAU * b);               // wide on the "and"
    const tw = Math.sin(Math.PI * b);
    p.foot('L', 0.06 + 0.3 * o, 0, 0.1 * tw * o); p.foot('R', 0.06 + 0.3 * o, 0, -0.1 * tw * o);
    p.hips(0, -0.06 - 0.22 * o, 0, 0.15 * tw);
    const a = TAU * b;
    p.arm('L', 0.6 + 0.4 * Math.sin(a), 0.6 + 0.5 * o, 0.6 + 0.4 * Math.cos(a), 0.3);
    p.arm('R', 0.6 + 0.4 * Math.sin(a + Math.PI), 0.6 + 0.5 * o, 0.6 + 0.4 * Math.cos(a + Math.PI), 0.3);
    p.lean(0.12 * o, 0.06, 0.15 * tw); p.look(0.1 * o, 0.2 * tw);
  },

  // ── Tier 3 ──────────────────────────────────────────────────
  // ROLLER SPIN: arms tucked, two spins on her skates, opening up into a
  // high V, then a hip pose.
  cocoSpin(p, b, B, s) {
    phased(p, b, B, s, [
      [0.5, (p, b, B, s) => { groove(p, B, s, 0.5); const k = smooth(b / 0.5); p.foot('L', 0.12); p.foot('R', 0.14); p.hips(0, -0.06 - 0.12 * k, 0, -0.4 * k); p.arms(0.5, 0.4 + 0.6 * k, 1.0); p.lean(0.1 * k); }],
      [2.5, (p, b) => {
        const t = smooth((b - 0.5) / 2), open = bump(t);
        p.foot('L', 0.03, 0, 0, 0.3); p.foot('R', 0.08, 0.12 * open, 0.04, 0.4);
        p.hips(0, -0.02, 0); p.root(0, 0, 0, -0.4 + (TAU * 2 + 0.4) * t);
        p.arm('L', 0.6 - 0.3 * open, lerp(0.4, 2.7, open), lerp(1.8, 0.2, open), -0.4 * (1 - open));
        p.arm('R', 0.6 - 0.3 * open, lerp(0.4, 2.7, open), lerp(1.8, 0.2, open), -0.4 * (1 - open));
        p.look(-0.25 * open);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 2.5) / 0.4);
        p.foot('L', 0.12); p.foot('R', 0.22, 0, 0.08, 0.4 * k);
        p.hips(0.08 * k, -0.1, 0, -0.25 * k);
        p.arm('R', 0.3, 0.4 + 2.2 * k, 0.15); hipHand(p, 'L');
        p.lean(-0.05, -0.15 * k, 0.1, 0.15 * k); p.look(-0.3 * k, -0.3 * k);
      }],
    ]);
  },

  // SHOOT THE DUCK: drops into a crouch on one skate, the other leg shot
  // straight out in front, gliding forward — then rises back up.
  cocoDuck(p, b, B, s) {
    phased(p, b, B, s, [
      [0.8, (p, b) => {
        const k = smooth(b / 0.8);
        p.foot('L', 0.1, 0, 0.0); p.foot('R', 0.12, 0.1 * k, 0.3 * k);
        p.hips(0.04 * k, -0.05 - 0.45 * k, -0.08 * k);
        p.arms(0.3 + 1.0 * k, 0.3, 0.2); p.lean(0.3 * k, 0.1 * k);
      }],
      [2.9, (p, b) => {
        const u = (b - 0.8) / 2.1, z = 0.32 * smooth(u), wob = Math.sin(TAU * b);
        p.foot('L', 0.1, 0, z); p.foot('R', 0.12, 0.1 + 0.02 * wob, z + 0.42);
        p.hips(0.04, -0.52, z - 0.1);
        p.arm('L', 1.3 + 0.1 * wob, 0.35, 0.15); p.arm('R', 1.3 - 0.1 * wob, 0.35, 0.15);
        p.lean(0.36, 0.1, 0.06 * wob); p.look(-0.1, 0.1 * wob);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 2.9) / 0.6), z = 0.32 * (1 - k);
        p.foot('L', 0.12, 0, z); p.foot('R', 0.14, 0.1 * (1 - k), z + 0.42 * (1 - k));
        p.hips(0.04 * (1 - k), -0.52 + 0.42 * k, z - 0.1 * (1 - k));
        p.arms(lerp(1.3, 0.3, k), lerp(0.35, 2.6, k), 0.15); p.lean(0.36 * (1 - k), -0.15 * k); p.look(-0.3 * k);
      }],
    ]);
  },

  // ── Tier 4 ──────────────────────────────────────────────────
  // CAMEL SPIN: tips into an arabesque — torso level, one leg stretched out
  // behind at hip height, arms wide — and spins twice like that.
  cocoCamel(p, b, B, s) {
    phased(p, b, B, s, [
      [0.8, (p, b) => {
        const k = smooth(b / 0.8);
        p.foot('L', 0.04 * k + 0.12 * (1 - k)); p.foot('R', 0.12, 0.62 * k, -0.62 * k, 0.3 * k);
        p.hips(0.03 * k, -0.06, 0.06 * k);
        p.lean(0.85 * k, 0.15 * k); p.arms(0.3, 0.3 + 1.2 * k, 0.2); p.look(-0.6 * k);
      }],
      [3, (p, b) => {
        const t = smooth((b - 0.8) / 2.2);
        p.foot('L', 0.04, 0, 0, 0.3); p.foot('R', 0.12, 0.62, -0.62, 0.3);
        const fl = Math.sin(TAU * b);
        p.hips(0.03, -0.06 + 0.02 * fl, 0.06); p.root(0, 0, 0, TAU * 2 * t);
        p.lean(0.85 + 0.05 * fl, 0.15 + 0.08 * Math.sin(TAU * b - 1)); p.arm('L', 0.3 + 0.15 * fl, 1.5, 0.2 + 0.2 * (0.5 + 0.5 * fl)); p.arm('R', 0.3 - 0.15 * fl, 1.5, 0.2 + 0.2 * (0.5 - 0.5 * fl));
        p.wrist('L', 0.4 * fl); p.wrist('R', -0.4 * fl); p.look(-0.6, 0.1 * fl);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.5);
        p.foot('L', 0.04 + 0.08 * k); p.foot('R', 0.12 + 0.08 * k, 0.62 * (1 - k), -0.62 * (1 - k) + 0.06 * k, 0.4 * k);
        p.hips(0.03 + 0.05 * k, -0.06 - 0.04 * k, 0.06 * (1 - k), -0.2 * k);
        p.lean(0.85 * (1 - k), 0.15 * (1 - k) - 0.15 * k); p.arms(0.3, 1.5 + 1.1 * k, 0.2); p.look(-0.6 * (1 - k) - 0.25 * k);
      }],
    ]);
  },

  // TIDAL WAVE: a double body wave rolling through her arms and body,
  // sinking down into the trough, then she bursts up out of it in a star
  // jump and lands gliding.
  cocoTidalWave(p, b, B, s) {
    phased(p, b, B, s, [
      [2.2, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const ph = TAU * b, w = (k) => Math.sin(ph - k), sink = smooth(b / 2.2);
        wideStance(p, 0.18 + 0.06 * sink);
        p.hips(0.06 * w(2.0), -0.08 - 0.3 * sink - 0.05 * w(2.4), 0.07 * w(1.6));
        p.add('spine', 0.2 * w(1.0)); p.add('chest', 0.3 * w(0.4)); p.add('hips', -0.15 * w(1.8));
        p.arm('L', 0.4 + 0.3 * w(-0.4), 1.4 + 0.5 * w(-0.2), 0.3 + 0.4 * (0.5 + 0.5 * w(0)), 0.2);
        p.arm('R', 0.4 + 0.3 * w(0.6), 1.4 + 0.5 * w(0.8), 0.3 + 0.4 * (0.5 + 0.5 * w(1)), 0.2);
        p.wrist('L', 0.4 * w(-0.8)); p.wrist('R', 0.4 * w(0.2));
        p.look(-0.2 * w(-0.4), 0, 0.1 * w(0));
      }],
      [2.8, (p, b) => {
        const k = smooth((b - 2.2) / 0.6);
        wideStance(p, 0.24 - 0.08 * k); p.hips(0, -0.38 - 0.06 * k, -0.05 * k);
        p.arms(0.3 + 0.4 * k, 0.6 - 0.3 * k, 0.4); p.lean(0.3 * k, 0.15 * k); p.look(0.15 * k);
      }],
      [3.55, (p, b) => {
        const t = (b - 2.8) / 0.75, air = Math.sin(Math.PI * t);
        const hy = lerp(-0.44, -0.05, smooth(t / 0.3)) + 0.5 * air;
        p.hips(0, hy, 0);
        const fl = Math.max(0, hy + 0.03) * 0.9;
        p.foot('L', 0.16 + 0.3 * air, fl, 0, 0.4 * air); p.foot('R', 0.16 + 0.3 * air, fl, 0, 0.4 * air);
        p.arms(0.3, 0.5 + 2.2 * air, 0.1); p.look(-0.3 * air); p.lean(-0.1 * air);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const u = clamp01((b - 3.55) / 0.45), give = Math.sin(Math.PI * u);
        p.foot('L', 0.14, 0, 0.1 * u); p.foot('R', 0.18, 0, -0.1 * u, 0.3 * u);
        p.hips(0.03 * u, -0.06 - 0.18 * give, 0, -0.2 * u);
        p.arms(0.3, 2.4 - 0.4 * u, 0.15); p.look(-0.25);
      }],
    ]);
  },

  // ── ★ Signature moves ───────────────────────────────────────
  // ★ LIMBO: knees bent, leaning way back, gliding under the bar with her
  // shoulders shimmying — and up with a TA-DA.
  cocoLimbo(p, b, B, s) {
    groove(p, B, s, 0.3);
    const down = smooth(b / 0.8) * (1 - smooth((b - 2.8) / 0.6)), tada = win(b, 3.1, 5, 0.3);
    const sh = Math.sin(TAU * b * 4) * down, z = 0.2 * Math.sin(Math.PI * clamp01((b - 0.5) / 2.5));
    p.foot('L', 0.24 - 0.08 * tada, 0, z + 0.06 * down); p.foot('R', 0.24 - 0.08 * tada, 0, z + 0.06 * down);
    p.root(0, 0, 0, 1.0 * down);
    p.hips(0, -0.06 - 0.36 * down, z + 0.14 * down);
    p.lean(-0.5 * down - 0.05 * tada, -0.35 * down - 0.15 * tada);
    p.look(-0.25 * down - 0.3 * tada, 0.1 * Math.sin(Math.PI * b));
    p.arm('L', lerp(0.2, 0.3, tada), lerp(1.2 + 0.1 * sh, 2.5, tada), 0.25); p.arm('R', lerp(0.2, 0.3, tada), lerp(1.2 - 0.1 * sh, 2.5, tada), 0.25);
    p.shrug(0.15 * sh, -0.15 * sh);
  },

  // ★ BOARDWALK AXEL: a gliding wind-up, a jump with a full turn in the
  // air, landing on one skate with the free leg stretched behind.
  cocoAxel(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth(b);
        p.foot('L', 0.13, 0, 0.12 * k); p.foot('R', 0.13, 0, -0.14 * k);
        p.hips(0, -0.06 - 0.24 * k, 0, -0.5 * k);
        p.arm('L', 0.4 + 0.4 * k, 0.8, 0.5); p.arm('R', -0.3 * k, 0.6, 0.4); p.lean(0.15 * k, 0, -0.2 * k);
      }],
      [2, (p, b) => {
        const t = b - 1, air = Math.sin(Math.PI * t);
        const hy = lerp(-0.3, -0.05, smooth(t / 0.25)) + 0.55 * air;
        p.hips(0, hy, 0); p.root(0, 0, 0, -0.5 + (TAU + 0.5) * smooth(t));
        const fl = Math.max(0, hy + 0.03) * 0.9 + 0.12 * air;
        p.foot('L', 0.06, fl, 0.02); p.foot('R', 0.08, fl + 0.06 * air, 0.06);
        p.arms(0.6, 0.35, 1.9, -0.6); p.look(-0.1);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4 * smooth((b - 2) / 0.5));
        const u = clamp01((b - 2) / 0.5), give = Math.sin(Math.PI * u) * (1 - smooth((b - 2.6) / 0.6)), k = smooth((b - 2) / 0.4);
        p.foot('L', 0.06); p.foot('R', 0.12, 0.3 * k, -0.45 * k, 0.3 * k);
        p.hips(0.03, -0.06 - 0.2 * give, 0.03 * k);
        p.lean(0.35 * k, 0.05); p.arm('L', 0.4, 0.4 + 1.1 * k, 0.15); p.arm('R', 0.4, 0.4 + 1.1 * k, 0.15);
        p.look(-0.2 * k, 0.3 * k);
      }],
    ]);
  },

  // ★ SUNSET (encore): skates a full lap of her spot, waving to the
  // crowd, and stops in a pose with both shakas up.
  cocoSunset(p, b, B, s) {
    phased(p, b, B, s, [
      [3, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const t = smooth(b / 3), a = TAU * t, R = 0.38;
        const cx = R * Math.sin(a), cz = R * (Math.cos(a) - 1);
        const st = Math.sin(TAU * b);
        // Laps a circle facing the crowd (the hips twist into the curve).
        p.footX('L', cx + 0.12, 0.05 * Math.pow(0.5 + 0.5 * st, 3), cz + 0.1 * st); p.footX('R', cx - 0.12, 0.05 * Math.pow(0.5 - 0.5 * st, 3), cz - 0.1 * st);
        p.hips(cx, -0.12, cz, 0.35 * Math.cos(a));
        p.lean(0.12, 0, 0, -0.12);
        p.arm('L', 0.3, 2.3, 0.5 + 0.4 * Math.sin(TAU * b * 2)); p.wrist('L', 0.4 * Math.sin(TAU * b * 2));
        p.arm('R', -0.2, 0.6, 0.3);
        p.look(-0.1, 0.2);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.35);
        p.foot('L', 0.13); p.foot('R', 0.2, 0, 0.06, 0.4 * k);
        p.hips(0.05 * k, -0.1, 0, -0.15 * k);
        shaka(p, 'L', Math.sin(TAU * b * 2) * k); shaka(p, 'R', Math.sin(TAU * b * 2 + 1) * k);
        p.lean(-0.05, -0.15 * k, 0, 0.1 * k); p.look(-0.25 * k, 0.15 * k, 0.12 * k);
      }],
    ]);
  },

  // ★★ SOLO — ROLLER QUEEN: shoot the duck, rise into the camel spin, the
  // axel, and the shaka pose.
  cocoRollerQueen(p, b, B, s) {
    phased(p, b, B, s, [
      [1.2, (p, b, B, s) => moves.cocoDuck(p, 0.4 + b * (2.9 - 0.4) / 1.2, B, s)],
      // Rise out of the duck straight into a double spin, arms opening up.
      [2.9, (p, b) => {
        const up = smooth((b - 1.2) / 0.6), t = smooth((b - 1.4) / 1.4), open = smooth((b - 1.5) / 1.0);
        p.foot('L', lerp(0.1, 0.05, up), 0, lerp(0.32, 0, up), 0.3 * up); p.foot('R', lerp(0.12, 0.1, up), lerp(0.1, 0.1, up) * (1 - 0.3 * open), lerp(0.74, 0.04, up), 0.4 * up);
        p.hips(0.04 * (1 - up), lerp(-0.52, -0.03, up), lerp(0.22, 0, up)); p.root(0, 0, 0, TAU * 2 * t);
        p.lean(0.36 * (1 - up));
        p.arm('L', lerp(1.3, 0.3, up), lerp(0.35, 2.7, open), lerp(0.15, 0.2, open)); p.arm('R', lerp(1.3, 0.3, up), lerp(0.35, 2.7, open), lerp(0.15, 0.2, open));
        p.look(-0.25 * open);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 2.9) / 0.5);
        p.foot('L', 0.05 + 0.08 * k); p.foot('R', 0.1 + 0.1 * k, 0.1 * (1 - k), 0.04 + 0.02 * k, 0.4);
        p.hips(0.05 * k, -0.03 - 0.07 * k, 0, -0.15 * k);
        p.arm('L', lerp(0.3, 0.5, k), lerp(2.7, 2.0, k), lerp(0.2, 1.3, k), 0.6 * k); p.wrist('L', 0.35 * Math.sin(TAU * b * 2) * k, 0.25 * Math.sin(TAU * b * 2) * k);
        p.arm('R', lerp(0.3, -0.25, k), lerp(2.7, 0.62, k), lerp(0.2, 1.65, k), -1.45 * k);
        p.lean(-0.05, -0.15 * k, 0, 0.1 * k); p.look(-0.25 * k, 0.15 * k, 0.12 * k);
      }],
    ]);
  },

  // ── Battle actions ──────────────────────────────────────────
  // Intro (faces the player, +x): peeks over the shades at you, waggles a
  // "bye-bye", spins on her skates, shaka and a wink.
  cocoIntro(p, b, B, s) {
    groove(p, B, s, 0.4);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.4);
        p.foot('L', 0.13, 0, 0.08); p.foot('R', 0.17, 0, -0.04, 0.3);
        p.hips(-0.04, -0.08, 0, 0.5 * k);
        PEEK(p, k); hipHand(p, 'L');
        p.lean(0.06 * k, 0.04, 0.15); p.look(0.18 * k, 0.35 * k, 0.1);
      }],
      [2, (p, b) => {
        const w = Math.sin(TAU * (b - 1) * 4);
        p.foot('L', 0.13, 0, 0.08); p.foot('R', 0.17, 0, -0.04, 0.3);
        p.hips(0.04, -0.08, 0, 0.5);
        const r = smooth((b - 0.9) / 0.5);
        p.arm('L', lerp(-0.25, 1.4, r), lerp(0.62, 0.6, r), lerp(1.65, 0.6 + 0.35 * w, r), lerp(-1.45, -0.2, r)); p.wrist('L', 0.4 * w * r);
        p.arm('R', lerp(2.3, 0.2, r), lerp(0.2, 0.35, r), lerp(1.2, 0.6, r), lerp(-1.1, 0, r));
        p.look(-0.05, 0.35, -0.1);
      }],
      [3, (p, b) => {
        const t = smooth((b - 2) / 1);
        p.foot('L', 0.03, 0, 0, 0.3); p.foot('R', 0.08, 0.1 * bump(t), 0.04, 0.3);
        p.hips(0, -0.04, 0); p.root(0, 0, 0, 0.5 + TAU * t);
        p.arms(0.5, 0.4 + 1.6 * bump(t), 0.8);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.3);
        p.foot('L', 0.13); p.foot('R', 0.2, 0, 0.06, 0.4 * k);
        p.hips(0.06 * k, -0.1, 0, 0.5 - 0.2 * k);
        shaka(p, 'L', Math.sin(TAU * b * 2) * k); hipHand(p, 'R');
        p.lean(-0.05, -0.15 * k, 0.1, 0.12 * k); p.look(-0.2 * k, 0.35, 0.12 * k);
      }],
    ]);
  },

  // BEACH BALL SPIKE: tosses the ball up and spikes it at you (struck at
  // +0.75 beats), then laughs, hands on hips. Faces the foe (+x).
  cocoTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    phased(p, b, B, s, [
      [0.55, (p, b) => {
        const k = smooth(b / 0.5);
        p.foot('L', 0.14, 0, 0.1); p.foot('R', 0.17, 0, -0.08, 0.4 * k);
        p.hips(-0.03, -0.08 + 0.04 * k, -0.03 * k, 0.5);
        p.arm('R', 0.6 + 1.9 * k, 0.3, 0.3); p.arm('L', 0.4 + 2.2 * k, 0.7 + 0.2 * k, 0.4 + 1.2 * k, 0.3);
        p.lean(-0.1 * k, -0.2 * k, 0.1); p.look(-0.35 * k, 0.25);
      }],
      [1.4, (p, b) => {
        const t = smooth((b - 0.55) / 0.3);
        p.foot('L', 0.14, 0, 0.1 + 0.08 * t); p.foot('R', 0.17, 0, -0.08, 0.4);
        p.hips(0.04 * t, -0.04 - 0.08 * t, 0.04 * t, 0.65);
        p.arm('L', lerp(2.6, 1.2, t), lerp(0.9, 1.3, t), lerp(1.6, 0.1, t), 0.3 * (1 - t)); p.arm('R', lerp(2.5, 0.2, t), 0.4, 0.3);
        p.lean(0.25 * t, 0.15 * t, 0.2 * t); p.look(-0.1 + 0.1 * t, 0.35);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 1.4) / 0.4), laugh = Math.sin(TAU * (b - 1.4) * 4) * k * (1 - smooth((b - 3) / 0.5));
        p.foot('L', 0.14, 0, 0.1); p.foot('R', 0.17, 0, -0.06, 0.3);
        p.hips(0.02, -0.08 + 0.015 * laugh, 0, 0.45);
        hipHand(p, 'L'); hipHand(p, 'R');
        p.lean(-0.12 * k, -0.25 * k); p.look(-0.3 * k + 0.05 * laugh, 0.3, 0); p.shrug(0.06 * laugh);
      }],
    ]);
  },

  // Victory: twirls, arms up, little skate hops.
  cocoVictory(p, b, B, s) {
    const hop = Math.pow(Math.sin(Math.PI * frac(b)), 1.5);
    p.foot('L', 0.1, 0.08 * hop); p.foot('R', 0.12, 0.08 * hop);
    p.hips(0, -0.08 + 0.1 * hop, 0); p.root(0, 0, 0, TAU * smooth(clamp01((b - 2) / 1.5)));
    p.arms(0.3, 2.4 + 0.25 * Math.sin(TAU * b), 0.2);
    p.wrist('L', 0.4 * Math.sin(TAU * b * 2)); p.wrist('R', 0.4 * Math.sin(TAU * b * 2 + 1));
    p.look(-0.3, 0.15 * Math.sin(Math.PI * b));
    groove(p, B, s, 0.4);
  },
};

export const moveMeta = {
  labels: {
    cocoSurfer: 'SURF\'S UP', cocoShaka: 'HANG LOOSE', cocoBump: 'THE BUMP', cocoFishtail: 'FISHTAIL',
    cocoSpin: 'ROLLER SPIN', cocoDuck: 'SHOOT THE DUCK', cocoCamel: 'CAMEL SPIN', cocoTidalWave: 'TIDAL WAVE',
    cocoLimbo: 'LIMBO', cocoAxel: 'BOARDWALK AXEL', cocoSunset: 'SUNSET LAP', cocoRollerQueen: 'ROLLER QUEEN',
    cocoTaunt: 'BEACH BALL SPIKE', cocoIntro: 'BYE-BYE', cocoVictory: 'ENDLESS SUMMER',
  },
  expressions: {
    cocoGlide: 'smile', cocoHula: 'smirk', cocoCrossover: 'grin', cocoClapSkate: 'joy', cocoAccent: 'wink',
    cocoSurfer: 'grin', cocoShaka: 'joy', cocoBump: 'grin', cocoFishtail: 'focus',
    cocoSpin: 'joy', cocoDuck: 'focus', cocoCamel: 'focus', cocoTidalWave: 'smirk',
    cocoLimbo: 'o', cocoAxel: 'shout', cocoSunset: 'joy', cocoRollerQueen: 'joy',
    cocoIntro: 'wink', cocoTaunt: 'grin', cocoVictory: 'joy',
  },
  hits: {
    cocoHula: 0.6, cocoAccent: 0.3, cocoSurfer: 0.4, cocoShaka: 0.9, cocoBump: 1, cocoFishtail: 0.6,
    cocoSpin: 0.2, cocoDuck: 0.2, cocoCamel: 0, cocoTidalWave: 0.3, cocoLimbo: 0.4, cocoAxel: 0.1,
    cocoSunset: 0.4, cocoRollerQueen: 0, cocoIntro: 0.5, cocoTaunt: 0.4, cocoVictory: 0.5,
  },
  fnGroove: { cocoSpin: 0, cocoDuck: 0, cocoCamel: 0, cocoTidalWave: 0, cocoAxel: 0, cocoSunset: 0, cocoRollerQueen: 0, cocoVictory: 0.2 },
  stiff: { cocoBump: 1.2 },
};

export default { moves, moveMeta };
