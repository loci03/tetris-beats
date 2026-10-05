// NOVA's move set — dancing as if gravity were optional.
//
// Floaty, slow-motion vocabulary: zero-g drift steps, glides and the
// moonwalk, slow-motion arm and body waves, orbit spins (one leg extended,
// arms making a ring), comet lunges, the impossible anti-gravity lean,
// moon-gravity jumps with long hang time, star jumps and supernova bursts.
// Authored with the opponent on the dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, hipHand, wideStance } = kit;
const bump = (x, w) => Math.exp(-(x / w) * (x / w));

// Anti-gravity lean: the whole body tips sideways toward the rival by
// `th`, one straight line from her boots, pivoting about the ankles.
function zeroLean(p, th) {
  const x = 0.9 * Math.sin(th);
  p.tumble(0, -th);
  p.hips(x, -0.9 * (1 - Math.cos(th)) - 0.02, 0);
  p.footX('L', x + 0.11); p.footX('R', x - 0.11);
}
// Diva halo pose: arms arched overhead into a ring, chin up.
function haloArms(p, k = 1, from = 0.4) { for (const sd of ['L', 'R']) p.arm(sd, lerp(0.3, 0.35, k), lerp(from, 2.75, k), lerp(0.3, 1.55, k), lerp(0, -1.25, k)); }

const moves = {
  // ── Base routines ───────────────────────────────────────────────
  // Zero-g float: a slow step-touch, weight drifting side to side over two
  // beats, hands drifting up and down as if underwater, wrists trailing.
  novaFloat(p, b, B, s) {
    groove(p, B, s, 0.8);
    const a = Math.PI * b / 2, side = Math.sin(a);
    p.foot('L', 0.19, 0, 0.02, 0.45 * Math.max(0, -side)); p.foot('R', 0.19, 0, -0.02, 0.45 * Math.max(0, side));
    p.hips(0.08 * side, -0.08, 0, 0.18 * side);
    p.arm('L', 0.55 + 0.35 * Math.sin(a + 0.6), 0.7 + 0.5 * Math.sin(a), 0.5 + 0.3 * Math.sin(a - 0.8));
    p.arm('R', 0.55 - 0.35 * Math.sin(a + 0.6), 0.7 - 0.5 * Math.sin(a), 0.5 - 0.3 * Math.sin(a - 0.8));
    p.wrist('L', 0.3 * Math.sin(a - 1.4), 0.4 * Math.sin(a - 1.2)); p.wrist('R', -0.3 * Math.sin(a - 1.4), -0.4 * Math.sin(a - 1.2));
    p.lean(0, -0.06, 0.12 * Math.sin(a - 0.5), -0.05 * side);
    p.look(-0.08, 0.2 * Math.sin(a - 0.7), 0.08 * side);
  },

  // Glide: sliding side to side on the floor like it's ice in orbit, one
  // boot pointed, arms doing a slow breaststroke.
  novaGlide(p, b, B, s) {
    groove(p, B, s, 0.6);
    const a = Math.PI * b / 2, X = 0.26 * Math.sin(a), v = Math.cos(a);
    p.footX('L', X + 0.14 + 0.06 * Math.max(0, v), 0, 0.02, 0.5 * Math.max(0, v));
    p.footX('R', X - 0.14 - 0.06 * Math.max(0, -v), 0, 0.02, 0.5 * Math.max(0, -v));
    p.hips(X - 0.03 * v, -0.08, 0, -0.12 * v);
    const st = Math.PI * b;
    p.arm('L', 1.1 + 0.3 * Math.sin(st), 0.4 + 0.6 * (0.5 - 0.5 * Math.cos(st)), 0.9 - 0.5 * Math.sin(st), -0.4);
    p.arm('R', 1.1 + 0.3 * Math.sin(st), 0.4 + 0.6 * (0.5 - 0.5 * Math.cos(st)), 0.9 - 0.5 * Math.sin(st), -0.4);
    p.wrist('L', 0.3 * Math.cos(st)); p.wrist('R', 0.3 * Math.cos(st));
    p.lean(0.04, -0.05, 0, 0.1 * v);
    p.look(-0.05, -0.2 * v, -0.06 * v);
  },

  // Orbit step: a box step (forward, side, back, close), one arm tracing a
  // big orbit overhead while the other floats low.
  novaOrbitStep: seq(4, [
    [0, (p) => { p.footX('R', -0.12, 0, 0.16); p.footX('L', 0.13); p.hips(-0.04, -0.1, 0.06, -0.15); p.arm('L', 2.2, 0.6, 0.6); p.arm('R', 0.3, 0.6, 0.4); p.lean(0.03, -0.08, -0.1); p.look(-0.15, 0.1); }],
    [1, (p) => { p.footX('R', -0.12, 0, 0.16); p.footX('L', 0.32); p.hips(0.1, -0.14, 0.04, 0.12); p.arm('L', 1.6, 1.9, 0.5); p.arm('R', 0.4, 0.4, 0.6); p.lean(0.02, -0.04, 0.1, 0.08); p.look(-0.1, 0.35); }],
    [2, (p) => { p.footX('R', -0.14, 0, -0.14, 0.2); p.footX('L', 0.32); p.hips(0.02, -0.1, -0.06, 0.15); p.arm('L', 0.4, 2.5, 0.5); p.arm('R', 0.6, 0.3, 0.8); p.lean(-0.03, -0.1, 0.12); p.look(-0.2, 0.2); }],
    [3, (p) => { p.footX('R', -0.14, 0, -0.14); p.footX('L', 0.13); p.hips(-0.04, -0.14, -0.04, -0.1); p.arm('L', 0.2, 1.3, 0.6); p.arm('R', 1.0, 0.5, 0.8); p.lean(0.03, -0.04, -0.12, -0.08); p.look(-0.05, -0.15); }],
  ], { groove: 0.8, hits: 0.6 }),

  // Star reach: step-touch, reaching up diagonally to the stars on each
  // beat — left, right — fingers twinkling, up on her toes.
  novaStarReach(p, b, B, s) {
    groove(p, B, s, 0.8);
    const u = 0.5 + 0.5 * Math.cos(Math.PI * b), side = 2 * u - 1, tw = Math.sin(TAU * b * 3);
    p.foot('L', 0.18, 0, 0.02, 0.5 * (1 - u)); p.foot('R', 0.18, 0, 0.02, 0.5 * u);
    p.hips(0.07 * side, -0.07 + 0.03 * Math.abs(side), 0, 0.15 * side);
    p.arm('L', 0.5, lerp(0.5, 2.55, u), lerp(1.0, 0.1, u)); p.wrist('L', 0, 0.35 * tw * u);
    p.arm('R', 0.5, lerp(0.5, 2.55, 1 - u), lerp(1.0, 0.1, 1 - u)); p.wrist('R', 0, 0.35 * tw * (1 - u));
    p.lean(0, -0.12, 0, -0.1 * side);
    p.look(-0.3, 0.25 * side, 0.1 * side);
  },

  // Signature (count 5): starlight — one arm arched overhead, hand on the
  // hip, up on her toes, chin to the stars.
  novaAccent(p, b, B, s) {
    groove(p, B, s, 0.6);
    p.foot('L', 0.08, 0, 0.04, 0.6); p.foot('R', 0.12, 0, -0.02, 0.6);
    p.hips(-0.04, -0.02, 0, 0.3);
    p.arm('L', 0.5, 2.6, 1.0, -0.6); hipHand(p, 'R');
    p.lean(-0.05, -0.18, -0.1, -0.12); p.look(-0.35, 0.2, -0.12);
  },

  // ── Tier 1 ──────────────────────────────────────────────────────
  // Moonwalk: slides backwards on alternating toes for three beats,
  // floats forward to her mark and rises onto her toes.
  novaMoonwalk(p, b, B, s) {
    groove(p, B, s, 0.4);
    phased(p, b, B, s, [
      [3, (p, b) => {
        const step = Math.floor(b), ph = b - step, z0 = -0.13 * b;
        const toe = step % 2 === 0 ? 'R' : 'L', flat = toe === 'R' ? 'L' : 'R';
        p.foot(flat, 0.11, 0, z0 + 0.14 - 0.28 * smooth(ph), 0);
        p.foot(toe, 0.11, 0.01, z0 - 0.1, 0.7 * (1 - smooth((ph - 0.78) / 0.22)));
        p.hips(0, -0.1, z0 - 0.02);
        p.arm('L', 0.5, 0.35, 1.4, -0.5); p.arm('R', 0.5, 0.35, 1.4, -0.5);
        p.wrist('L', 0, 0.3 * Math.sin(Math.PI * b)); p.wrist('R', 0, -0.3 * Math.sin(Math.PI * b));
        p.lean(0.08, 0.04); p.look(-0.05, 0.12);
      }],
      [Infinity, (p, b) => {
        const t = smooth((b - 3) / 0.6), z = -0.39 * (1 - t);
        p.foot('L', 0.09, 0.02 * Math.sin(Math.PI * t), z, 0.8 * t); p.foot('R', 0.1, 0.02 * Math.sin(Math.PI * t), z + 0.03, 0.8 * t);
        p.hips(0, -0.08 + 0.09 * t, z);
        p.arm('L', 0.4, 0.4 + 2.1 * t, 0.2); p.arm('R', 0.6, 0.5, 1.6, -0.6);
        p.look(-0.3 * t, 0.3 * t); p.lean(-0.03, -0.12 * t, 0.15 * t);
      }],
    ]);
  },

  // Slow-motion wave: a wave rolls from one fingertip across her shoulders
  // to the other and a body wave rolls down her spine with it.
  novaWave(p, b, B, s) {
    groove(p, B, s, 0.5);
    const w = 0.5 - 0.5 * Math.cos(Math.PI * b / 2), k = (u) => bump(u - w, 0.16);
    const bw = Math.sin(Math.PI * b), q = (d) => Math.sin(Math.PI * b - d);
    wideStance(p, 0.19);
    p.hips(0.06 * (1 - 2 * w), -0.1 - 0.05 * (0.5 + 0.5 * q(2.2)), 0.06 * q(1.6), 0.12 * (1 - 2 * w));
    p.add('spine', 0.15 * q(0.8)); p.add('chest', 0.22 * q(0)); p.add('hips', -0.12 * q(1.6));
    p.arm('L', 0.25 * k(0.26), 1.35 + 0.45 * k(0.26) - 0.3 * k(0.12), 1.3 * k(0.12) + 0.1, 1.57);
    p.wrist('L', 0, 1.0 * k(0) - 0.3 * k(0.12));
    p.arm('R', 0.25 * k(0.74), 1.35 + 0.45 * k(0.74) - 0.3 * k(0.88), 1.3 * k(0.88) + 0.1, 1.57);
    p.wrist('R', 0, 1.0 * k(1) - 0.3 * k(0.88));
    p.shrug(0.3 * k(0.4), 0.3 * k(0.6));
    p.look(-0.2 * q(-0.6), 0.35 * (0.5 - w)); void bw;
  },

  // ── Tier 2 ──────────────────────────────────────────────────────
  // Orbit spin: a slow full turn on one foot, the other leg extended
  // behind, arms in a ring — then she floats down into a pose.
  novaOrbitSpin(p, b, B, s) {
    phased(p, b, B, s, [
      [0.6, (p, b) => {
        const k = smooth(b / 0.6);
        p.foot('L', 0.12 - 0.1 * k, 0, 0, 0.6 * k); p.foot('R', 0.12, 0.2 * k, -0.25 * k, 0.6 * k);
        p.hips(0, -0.06 + 0.04 * k, -0.02 * k);
        haloArms(p, k); p.lean(0.15 * k, -0.05);
      }],
      [3, (p, b) => {
        const t = smooth((b - 0.6) / 2.4);
        p.foot('L', 0.02, 0, 0, 0.6); p.foot('R', 0.12, 0.2 + 0.08 * Math.sin(Math.PI * t), -0.25, 0.6);
        p.hips(0, -0.02, -0.02); p.root(0, 0, 0, TAU * t);
        haloArms(p, 1); p.lean(0.15, -0.05); p.look(-0.15);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.4);
        p.foot('L', 0.1); p.foot('R', 0.18, 0, 0.08, 0.5 * k);
        p.hips(0.05 * k, -0.08, 0, -0.2 * k);
        p.arm('L', 0.5, 2.55 * (1 - k) + 1.0 * k, 1.25 * (1 - k) + 0.1 * k, -0.6 * (1 - k)); p.arm('R', 0.5, 2.55 - 0.3 * k, 1.25 - 0.6 * k, -0.6);
        p.lean(-0.04, -0.12 * k, 0, 0.1 * k); p.look(-0.25 * k, -0.25 * k);
      }],
    ]);
  },

  // Comet: a lunge to one side, the arm sweeping from high behind to low
  // in front like a comet's tail, the other trailing — then the other way.
  novaComet(p, b, B, s) {
    groove(p, B, s, 0.5);
    const first = b < 2, u = first ? b / 2 : (b - 2) / 2, d = first ? 1 : -1;
    const e = win(u, 0, 1, 0.2), sw = smooth(clamp01((u - 0.1) / 0.6));
    const lead = first ? 'L' : 'R', tr = first ? 'R' : 'L';
    p.footX(lead, d * (0.14 + 0.26 * e), 0, 0.05 * e);
    p.footX(tr, -d * 0.14, 0, -0.03 * e, 0.3 * e);
    p.hips(d * 0.13 * e, -0.08 - 0.15 * e, 0.02 * e, d * 0.25 * e);
    p.arm(lead, lerp(2.7, 1.1, sw), lerp(0.6, 1.6, sw) * e + 0.3 * (1 - e), 0.15);
    p.arm(tr, lerp(0.2, -0.4, sw) * e + 0.3, 0.5 + 0.5 * e, 0.3);
    p.wrist(lead, 0, 0.5 * Math.sin(Math.PI * sw));
    p.lean(0.12 * e, 0.05, 0.15 * d * e, 0.1 * d * e);
    p.look(-0.1 + 0.2 * sw * e, d * 0.4 * e);
  },

  // ── Tier 3 ──────────────────────────────────────────────────────
  // Zero-G lean: tips forward in one straight line from her boots, far past
  // where anyone should fall, hangs there, and floats back upright.
  novaZeroG(p, b, B, s) {
    phased(p, b, B, s, [
      [0.75, (p, b) => {
        const k = smooth(b / 0.75);
        p.foot('L', 0.12); p.foot('R', 0.12);
        p.hips(0, -0.06 + 0.04 * k, 0);
        p.arm('L', -0.2 * k, 0.25, 0.1); p.arm('R', -0.2 * k, 0.25, 0.1);
        p.lean(0, -0.1 * k); p.look(-0.1 * k);
      }],
      [3, (p, b, B) => {
        const t = (b - 0.75) / 2.25, th = 0.55 * smooth(t / 0.4) * (1 - smooth((t - 0.8) / 0.2));
        zeroLean(p, th);
        p.arm('L', -0.25, 0.25, 0.1); p.arm('R', -0.25, 0.25, 0.1);
        p.wrist('L', 0.4 * Math.sin(TAU * b)); p.wrist('R', 0.4 * Math.sin(TAU * b + 1));
        p.look(-0.1, 0.3 * th, 0.4 * th);
        p.root(0.003 * Math.sin(B * 30), 0, 0);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.3);
        p.foot('L', 0.08, 0, 0.04, 0.6 * k); p.foot('R', 0.12, 0, -0.02, 0.6 * k);
        p.hips(-0.04 * k, -0.04, 0, 0.3 * k);
        p.arm('L', 0.5, 0.3 + 2.3 * k, 0.1 + 0.9 * k, -0.6 * k); hipHand(p, 'R');
        p.lean(-0.05, -0.18 * k, -0.1 * k, -0.12 * k); p.look(-0.35 * k, 0.2 * k);
      }],
    ]);
  },

  // Moon jump: a deep crouch, then a jump in moon gravity — long, slow
  // hang time, knees drawn up and stretched out again in the air.
  novaMoonJump(p, b, B, s) {
    phased(p, b, B, s, [
      [0.9, (p, b) => {
        const k = smooth(b / 0.9);
        wideStance(p, 0.15); p.hips(0, -0.04 - 0.3 * k, -0.04 * k);
        p.arms(0.8 - 1.3 * k, 0.3, 0.3); p.lean(0.3 * k, 0.12 * k); p.look(0.1 * k);
      }],
      [3.2, (p, b) => {
        const t = (b - 0.9) / 2.3, air = Math.sin(Math.PI * t), k = smooth(t / 0.1);
        const hy = lerp(-0.34, -0.04, k) + 0.85 * air;
        p.hips(0, hy, 0);
        const tuck = Math.sin(Math.PI * clamp01((t - 0.15) / 0.6));
        const fl = Math.max(0, hy + 0.04) + 0.35 * tuck;
        p.foot('L', 0.13, fl, 0.15 * tuck, 0.5 * air); p.foot('R', 0.13, fl * 0.92, 0.12 * tuck, 0.5 * air);
        p.arm('L', 0.5 + 0.6 * air, 0.5 + 1.6 * air, 0.3 + 0.4 * tuck); p.arm('R', 0.5 + 0.6 * air, 0.5 + 1.6 * air, 0.3 + 0.4 * tuck);
        p.wrist('L', 0.4 * Math.sin(TAU * b)); p.wrist('R', 0.4 * Math.sin(TAU * b + 1));
        p.lean(0.1 * tuck - 0.1 * air, -0.1 * air); p.look(-0.3 * air);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const u = clamp01((b - 3.2) / 0.8), give = Math.sin(Math.PI * clamp01(u / 0.7));
        wideStance(p, 0.17); p.hips(0, -0.04 - 0.2 * give);
        p.arms(0.5, 2.1 - 1.4 * smooth(u), 0.3); p.lean(0.12 * give); p.look(-0.2 * (1 - u));
      }],
    ]);
  },

  // ── Tier 4 ──────────────────────────────────────────────────────
  // Supernova: curls up gathering energy, then bursts — a star jump flung
  // wide in every direction — and drifts down radiating.
  novaSupernova(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b, B) => {
        const k = smooth(b / 1.0), tr = Math.sin(B * 45) * 0.005 * k;
        p.foot('L', 0.12, 0, 0.03, 0.4 * k); p.foot('R', 0.12, 0, 0.03, 0.4 * k);
        p.hips(tr, -0.04 - 0.38 * k, 0);
        p.arm('L', 1.2 * k + 0.2, -0.2 * k + 0.3, 2.2 * k, -1.2 * k); p.arm('R', 1.2 * k + 0.2, -0.2 * k + 0.3, 2.2 * k, -1.2 * k);
        p.lean(0.45 * k, 0.25 * k); p.look(0.4 * k);
      }],
      [2.6, (p, b) => {
        const t = (b - 1.5) / 1.1, k = smooth(t / 0.3), air = Math.sin(Math.PI * clamp01(t * 0.85 + 0.15) * 0.999);
        p.hips(0, -0.42 * (1 - k) + 0.75 * k * air, 0);
        const fl = Math.max(0, 0.75 * k * air - 0.05);
        p.foot('L', 0.12 + 0.5 * k, fl + 0.35 * k, 0, 0.6 * k); p.foot('R', 0.12 + 0.5 * k, fl + 0.35 * k, 0, 0.6 * k);
        p.arms(0.3, 0.3 + 2.0 * k, 0.05);
        p.lean(-0.1 * k, -0.2 * k); p.look(-0.4 * k);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const u = clamp01((b - 2.6) / 1.2), d = smooth(u);
        const hy = lerp(0.6, -0.06, d) - 0.12 * Math.sin(Math.PI * clamp01((u - 0.6) / 0.4));
        p.hips(0, hy, 0);
        const fl = Math.max(0, hy + 0.05);
        p.foot('L', lerp(0.62, 0.17, d), fl + 0.35 * (1 - d), 0, 0.6 * (1 - d)); p.foot('R', lerp(0.62, 0.17, d), fl + 0.35 * (1 - d), 0, 0.6 * (1 - d));
        p.arms(0.3, lerp(2.3, 1.45, d), 0.05 + 0.15 * d);
        p.wrist('L', 0, 0.4 * d); p.wrist('R', 0, 0.4 * d);
        p.lean(-0.1 * (1 - d), -0.2 + 0.05 * d); p.look(-0.4 + 0.15 * d);
      }],
    ]);
  },

  // Black hole: something pulls her sideways — she leans into it, arms
  // stretched, resists, gets dragged — then spins free and makes a ring.
  novaBlackHole(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b) => {
        const pull = smooth(b / 0.6), res = 0.5 + 0.5 * Math.sin(Math.PI * b * 1.5);
        p.footX('L', 0.3); p.footX('R', -0.14, 0, 0, 0.5 * pull);
        p.hips(0.12 * pull + 0.05 * res, -0.14, 0, 0.2 * pull);
        p.arm('L', 0.4, 1.4 + 0.2 * res, 0.05); p.arm('R', 0.7, 0.2 + 0.5 * res, 0.2, -0.3);
        p.wrist('L', 0, 0.3 * Math.sin(TAU * b * 2)); p.wrist('R', 0, 0.3 * Math.sin(TAU * b * 2 + 1));
        p.lean(0.05, 0.05, 0.2, (0.3 - 0.15 * res) * pull);
        p.look(0.05, 0.35 * pull - 0.2 * res, 0.1);
      }],
      [3, (p, b) => {
        const t = smooth((b - 2) / 1.0);
        p.foot('L', 0.03, 0, 0, 0.6); p.foot('R', 0.1, 0.12 + 0.08 * Math.sin(Math.PI * t), 0.03, 0.6);
        p.hips(0, -0.02, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.4, 1.5, 0.3); p.arm('R', 0.4, 1.5, 0.3);
        p.look(-0.1);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.35);
        p.foot('L', 0.1, 0, 0.02, 0.5 * k); p.foot('R', 0.12, 0, -0.02, 0.5 * k);
        p.hips(0, -0.06 + 0.03 * k, 0);
        haloArms(p, k, 1.5); p.lean(0, -0.15 * k); p.look(-0.3 * k);
      }],
    ]);
  },

  // ── ★ Branch moves ──────────────────────────────────────────────
  // Stardust: twirls her hands overhead and sprinkles stardust down over
  // herself, fingers fluttering, hips swaying.
  novaStardust(p, b, B, s) {
    groove(p, B, s, 0.7);
    const ph = ((b % 2) + 2) % 2, down = smooth(clamp01((ph - 0.8) / 1.0)), up = 1 - down;
    const fl = Math.sin(TAU * b * 4), side = Math.sin(Math.PI * b);
    p.foot('L', 0.15, 0, 0.02, 0.4 * Math.max(0, -side)); p.foot('R', 0.15, 0, -0.02, 0.4 * Math.max(0, side));
    p.hips(0.07 * side, -0.08, 0, 0.15 * side);
    const tw = TAU * b * 1.5;
    p.arm('L', lerp(0.7, 0.5, up) + 0.1 * Math.sin(tw), lerp(0.7, 2.5, up) + 0.15 * Math.cos(tw), lerp(0.4, 1.1, up), -0.4 * up);
    p.arm('R', lerp(0.7, 0.5, up) + 0.1 * Math.sin(tw + 2), lerp(0.7, 2.5, up) + 0.15 * Math.cos(tw + 2), lerp(0.4, 1.1, up), -0.4 * up);
    p.wrist('L', 0.4 * fl * down, 0.5 * Math.sin(tw)); p.wrist('R', -0.4 * fl * down, 0.5 * Math.sin(tw + 2));
    p.lean(0, -0.12 * up, 0, -0.06 * side); p.look(-0.3 * up + 0.1 * down, 0.15 * side);
  },

  // Gravity flip: a slow-motion aerial cartwheel that hangs at the top,
  // then two floaty steps back to her mark.
  novaGravityFlip(p, b, B, s) {
    phased(p, b, B, s, [
      [0.5, (p, b) => {
        const k = smooth(b / 0.5);
        wideStance(p, 0.2 + 0.15 * k); p.hips(0, -0.06, 0);
        p.arms(0.2, 0.3 + 2.4 * k, 0.1); p.lean(0, 0, 0, 0.3 * k);
      }],
      [2.8, (p, b) => {
        const t = (b - 0.5) / 2.3, r = t < 0.5 ? 0.5 * smooth(t / 0.5) ** 0.8 : 0.5 + 0.5 * smooth((t - 0.5) / 0.5) ** 1.25;
        p.foot('L', 0.5, 0.1, 0); p.foot('R', 0.5, 0.1, 0);
        p.hips(0.9 * r, 0.14 * Math.sin(Math.PI * r) + 0.1 * Math.sin(Math.PI * t), 0);
        p.tumble(0, -TAU * r);
        p.arms(0.15, 2.75, 0.05);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const t = smooth((b - 2.8) / 1.1), step = Math.sin(Math.PI * t * 2);
        p.footX('L', 0.9 * (1 - t) + 0.13, 0.08 * Math.max(0, step)); p.footX('R', 0.9 * (1 - t) - 0.13, 0.08 * Math.max(0, -step));
        p.hips(0.9 * (1 - t), -0.06, 0);
        p.arm('L', 0.4, 2.3 * (1 - t) + 0.4, 0.2); p.arm('R', 0.4, 2.3 * (1 - t) + 0.4, 0.2);
        p.look(-0.2, -0.3 * (1 - t));
      }],
    ]);
  },

  // Big bang: orbit spins that speed up, a supernova burst, a ring pose.
  // (Her encore after the solo.)
  novaBigBang(p, b, B, s) {
    phased(p, b, B, s, [
      [1.8, (p, b) => {
        const t = b / 1.8, yaw = TAU * 2 * t * t;
        p.foot('L', 0.02, 0, 0, 0.6); p.foot('R', 0.1, 0.15, -0.1, 0.6);
        p.hips(0, -0.02, 0); p.root(0, 0, 0, yaw);
        p.arm('L', 0.3, 1.5 + 1.0 * t, 0.3); p.arm('R', 0.3, 1.5 + 1.0 * t, 0.3);
        p.look(-0.15);
      }],
      [2.2, (p, b) => {
        const k = smooth((b - 1.8) / 0.4);
        p.foot('L', 0.12, 0, 0.03, 0.4); p.foot('R', 0.12, 0, 0.03, 0.4);
        p.hips(0, -0.06 - 0.3 * k, 0); p.root(0, 0, 0, TAU * 2);
        p.arm('L', 1.2 * k + 0.3, lerp(2.5, 0.3, k), 0.3 + 1.7 * k, -1.0 * k); p.arm('R', 1.2 * k + 0.3, lerp(2.5, 0.3, k), 0.3 + 1.7 * k, -1.0 * k);
        p.lean(0.4 * k, 0.2 * k);
      }],
      [3.2, (p, b) => {
        const t = (b - 2.2) / 1.0, k = smooth(t / 0.15), air = Math.sin(Math.PI * t);
        p.hips(0, -0.36 * (1 - k) + 0.8 * air, 0); p.root(0, 0, 0, TAU * 2);
        const fl = Math.max(0, 0.8 * air - 0.05);
        p.foot('L', 0.12 + 0.5 * air, fl + 0.3 * air, 0, 0.6 * air); p.foot('R', 0.12 + 0.5 * air, fl + 0.3 * air, 0, 0.6 * air);
        p.arms(0.3, 0.4 + 2.0 * smooth(t / 0.3), 0.05); p.look(-0.4 * air);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.2) / 0.3), give = Math.sin(Math.PI * clamp01((b - 3.2) / 0.5));
        p.foot('L', 0.1, 0, 0.02, 0.5 * k); p.foot('R', 0.12, 0, -0.02, 0.5 * k);
        p.hips(0, -0.06 - 0.18 * give, 0); p.root(0, 0, 0, TAU * 2);
        haloArms(p, k, 2.4); p.lean(0, -0.15 * k); p.look(-0.3 * k);
      }],
    ]);
  },

  // ★★ SOLO — COSMIC DIVA: a moonwalk, the zero-G lean, a slow spinning
  // jump through the starlight, and the halo pose.
  novaCosmicDiva(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const ph = b, z0 = -0.15 * b, sw = smooth(ph);
        p.foot('L', 0.11, 0, z0 + 0.14 - 0.28 * sw, 0); p.foot('R', 0.11, 0.01, z0 - 0.1, 0.7 * (1 - smooth((ph - 0.78) / 0.22)));
        p.hips(0, -0.1, z0 - 0.02);
        p.arm('L', 0.5, 0.35, 1.4, -0.5); p.arm('R', 0.5, 0.35, 1.4, -0.5);
        p.lean(0.08, 0.04);
      }],
      [2.1, (p, b) => {
        const t = (b - 1) / 1.1, th = 0.48 * Math.sin(Math.PI * t);
        zeroLean(p, th);
        p.root(0, 0, -0.15 * (1 - t));
        p.arm('L', -0.25, 0.25, 0.1); p.arm('R', -0.25, 0.25, 0.1);
        p.look(-0.1, 0.3 * th, 0.4 * th);
      }],
      [3.2, (p, b) => {
        const t = (b - 2.1) / 1.1, k = smooth(t / 0.15), air = Math.sin(Math.PI * t);
        p.hips(0, -0.25 * (1 - k) * (1 - air) + 0.7 * air, 0); p.root(0, 0, 0, TAU * smooth(t));
        const fl = Math.max(0, 0.7 * air - 0.05);
        p.foot('L', 0.1, fl + 0.12 * air, 0.05 * air, 0.7 * air); p.foot('R', 0.1, fl + 0.3 * air, -0.05, 0.7 * air);
        p.arm('L', 0.5, 0.5 + 2.0 * smooth(t / 0.3), 0.4 + 0.8 * air, -0.5 * air); p.arm('R', 0.5, 0.5 + 2.0 * smooth(t / 0.3), 0.4 + 0.8 * air, -0.5 * air);
        p.look(-0.3 * air);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.2) / 0.3), give = Math.sin(Math.PI * clamp01((b - 3.2) / 0.4));
        p.foot('L', 0.08, 0, 0.04, 0.6 * k); p.foot('R', 0.13, 0, -0.03, 0.6 * k);
        p.hips(-0.03 * k, -0.04 - 0.15 * give, 0, 0.3 * k);
        haloArms(p, k, 2.5); p.lean(-0.04, -0.18 * k, -0.08 * k); p.look(-0.35 * k, 0.2 * k);
      }],
    ]);
  },

  // ── Intro / taunt / victory ─────────────────────────────────────
  // Floats down onto the stage, flicks her hair, blows you a kiss of
  // stars, and points up: that's where she's from.
  novaIntro(p, b, B, s) {
    groove(p, B, s, 0.4 * smooth((b - 0.8) / 0.4));
    phased(p, b, B, s, [
      [1, (p, b) => {
        const d = smooth(b / 0.9), hy = lerp(0.35, -0.06, d);
        p.hips(0, hy, 0);
        const fl = Math.max(0, hy + 0.06);
        p.foot('L', 0.1, fl, 0, 0.7 * (1 - d)); p.foot('R', 0.12, fl + 0.06 * (1 - d), -0.02, 0.7 * (1 - d));
        p.arms(0.3, 1.3 - 0.6 * d, 0.2); p.look(0.1 * d - 0.2 * (1 - d));
      }],
      [2, (p, b) => {
        const f = smooth((b - 1) / 0.4);
        p.foot('L', 0.13, 0, 0.06); p.foot('R', 0.16, 0, -0.04, 0.4);
        p.hips(0.03, -0.07, 0, 0.3);
        p.arm('L', 2.4 * f, 0.9, 2.1 * f, -0.4); p.arm('R', 0.3, 0.45, 0.8);
        p.look(0.3 - 0.75 * f, -0.2, 0.2 * f);
      }],
      [3, (p, b) => {
        const k = Math.sin(Math.PI * clamp01((b - 2) / 1.0));
        p.foot('L', 0.13, 0, 0.1); p.foot('R', 0.16, 0.06 * k, -0.08, 0.5);
        p.hips(0.02, -0.05, 0.03, 0.55);
        p.arm('L', lerp(1.25, 1.0, k), lerp(0.15, 1.3, k), lerp(2.55, 0.05, k), -0.6 * (1 - k)); p.arm('R', 0.3, 0.45, 0.8);
        p.look(-0.1, 0.35, 0.1); p.lean(0.05 * k, 0, 0.2 * k);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.3);
        p.foot('L', 0.1, 0, 0.04, 0.5 * k); p.foot('R', 0.13, 0, -0.02, 0.5 * k);
        p.hips(-0.03, -0.04, 0, 0.3);
        p.arm('L', 0.3, 0.6 + 2.2 * k, 0.05); hipHand(p, 'R');
        p.lean(-0.04, -0.15 * k, 0, -0.08 * k); p.look(-0.4 * k, 0.15);
      }],
    ]);
  },

  // Meteor shower: both arms rise high, fingers twinkling as she calls the
  // stars down, then she flings them at you — twice — and flips her hair.
  novaMeteor(p, b, B, s) {
    groove(p, B, s, 0.35);
    p.foot('L', 0.15, 0, 0.1); p.foot('R', 0.18, 0, -0.06, 0.4);
    const rise = smooth(b / 0.8), t1 = smooth((b - 1.2) / 0.25) * (1 - smooth((b - 1.75) / 0.35)), t2 = smooth((b - 2.2) / 0.25) * (1 - smooth((b - 2.75) / 0.35));
    const throwK = Math.max(t1, t2), flip = win(b, 3.05, 4.1, 0.3);
    const tw = Math.sin(TAU * b * 3) * (1 - throwK);
    p.hips(0.03 * throwK, -0.08 - 0.06 * throwK, 0.05 * throwK, 0.55 * rise);
    const upF = lerp(0.3, 2.7, rise);
    p.arm('L', lerp(upF, 1.2, throwK) * (1 - flip) + 2.4 * flip, lerp(0.4 + 0.3 * rise, 1.1, throwK) * (1 - flip) + 0.9 * flip, lerp(0.3, 0.05, throwK) + 1.8 * flip, -0.4 * flip);
    p.arm('R', lerp(upF, 1.4, throwK) * (1 - flip) + 0.3 * flip, lerp(0.4 + 0.3 * rise, 0.3, throwK) * (1 - flip) + 0.45 * flip, lerp(0.3, 0.05, throwK) + 0.5 * flip);
    p.wrist('L', -0.6 * throwK, 0.4 * tw); p.wrist('R', -0.6 * throwK, -0.4 * tw);
    p.lean(0.15 * throwK - 0.08 * rise * (1 - throwK), -0.1 * rise + 0.1 * throwK, 0.15 * throwK);
    p.look(-0.3 * rise * (1 - throwK) + 0.35 * flip * 0 + 0.1 * throwK, 0.35 * throwK + 0.2 * rise, 0.15 * flip);
  },

  // Victory: a slow pirouette on her toes with both arms up, then the halo.
  novaVictory(p, b, B, s) {
    groove(p, B, s, 0.4);
    const t = smooth(clamp01(b / 3)), k = smooth((b - 3) / 0.5);
    p.foot('L', 0.03 + 0.07 * k, 0, 0, 0.8); p.foot('R', 0.08 + 0.04 * k, 0.15 * (1 - k), 0.02, 0.6);
    p.hips(0, 0.02 - 0.06 * k, 0); p.root(0, 0, 0, TAU * t);
    p.arm('L', 0.4, 2.6 - 0.05 * k, 0.4 + 0.85 * k, -0.6 * k); p.arm('R', 0.4, 2.6 - 0.05 * k, 0.4 + 0.85 * k, -0.6 * k);
    p.look(-0.35, 0.15 * Math.sin(Math.PI * b * 0.5));
  },
};

const moveMeta = {
  labels: {
    novaMoonwalk: 'MOONWALK', novaWave: 'SLOW-MO WAVE', novaOrbitSpin: 'ORBIT SPIN', novaComet: 'COMET',
    novaZeroG: 'ZERO-G LEAN', novaMoonJump: 'MOON JUMP', novaSupernova: 'SUPERNOVA', novaBlackHole: 'BLACK HOLE',
    novaStardust: 'STARDUST', novaGravityFlip: 'GRAVITY FLIP', novaBigBang: 'BIG BANG', novaCosmicDiva: 'COSMIC DIVA',
  },
  expressions: {
    novaFloat: 'smile', novaGlide: 'smirk', novaOrbitStep: 'smile', novaStarReach: 'joy', novaAccent: 'smirk',
    novaMoonwalk: 'smirk', novaWave: 'smile', novaOrbitSpin: 'joy', novaComet: 'focus',
    novaZeroG: 'smirk', novaMoonJump: 'joy', novaSupernova: 'shout', novaBlackHole: 'o',
    novaStardust: 'wink', novaGravityFlip: 'joy', novaBigBang: 'shout', novaCosmicDiva: 'smirk',
    novaIntro: 'kiss', novaMeteor: 'grin', novaVictory: 'joy',
  },
  hits: {
    novaFloat: 0.4, novaGlide: 0.4, novaStarReach: 0.6, novaAccent: 0.3, novaMoonwalk: 0.3, novaWave: 0.25,
    novaOrbitSpin: 0.15, novaComet: 0.4, novaZeroG: 0, novaMoonJump: 0, novaSupernova: 0, novaBlackHole: 0.2,
    novaStardust: 0.5, novaGravityFlip: 0, novaBigBang: 0, novaCosmicDiva: 0, novaIntro: 0.3, novaMeteor: 0.4, novaVictory: 0.2,
  },
  fnGroove: {
    novaOrbitSpin: 0, novaZeroG: 0, novaMoonJump: 0, novaSupernova: 0, novaBlackHole: 0, novaGravityFlip: 0,
    novaBigBang: 0, novaCosmicDiva: 0, novaVictory: 0,
  },
  stiff: {},
};

export default { moves, moveMeta };
