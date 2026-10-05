// ROTTEN REX's moves — a cartoon zombie doing the Thriller-video thing:
// the step-drag shamble, claw hands, shoulder shimmies, the dead-man lean,
// limbs that flop and snap back, broken-puppet jitters, rising from the
// grave. Authored with the opponent on the dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, evalMove, wideStance, hipHand } = kit;

const bump = (x) => Math.sin(Math.PI * clamp01(x));
// Thriller claws: forearm up, wrist cocked back. `h` 0 → by the hip, 1 → up by the head.
const claw = (p, side, h = 1, out = 1.25) => { p.arm(side, lerp(0.5, 0.75, h), lerp(0.5, out, h), lerp(1.2, 1.7, h), lerp(-0.3, 0.9, h)); p.wrist(side, -0.7, 0.2); };
// Zombie reach: arms straight out in front, hands drooping.
const reach = (p, k = 1, bob = 0) => { p.arm('L', lerp(0.1, 1.45 + bob, k), lerp(0.14, 0.15, k), lerp(0.25, 0.15, k)); p.arm('R', lerp(0.1, 1.4 - bob, k), lerp(0.14, 0.12, k), lerp(0.25, 0.2, k)); p.wrist('L', 0.75 * k); p.wrist('R', 0.75 * k); };
// A limb that flops limp: 0 → raised, 1 → fallen, with a damped wobble.
const flop = (t) => { t = clamp01(t); return 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 5); };
// Smooth "jolts": a staircase of quick smoothsteps at each half-beat.
const stairs = (b, from, n, step = 0.5, w = 0.18) => { let v = 0; for (let i = 0; i < n; i++) v += smooth((b - from - i * step) / w); return v / n; };

export const moves = {
  // ── Base routines ───────────────────────────────────────────
  // The shamble: a lurching step out, the other foot dragging after it on
  // its toe — two beats one way, two back — arms reaching, bobbing.
  rexShamble: seq(4, [
    [0, (p) => { p.footX('L', 0.34); p.footX('R', -0.12); p.hips(0.1, -0.2, 0, 0.15); p.lean(0.22, 0.1, 0.1, 0.1); reach(p, 0.9, 0.12); p.look(0.15, 0.2, 0.15); }],
    [0.5, (p) => { p.footX('L', 0.34); p.footX('R', 0.02, 0, -0.04, 0.4); p.hips(0.17, -0.14, 0, 0.1); p.lean(0.2, 0.08, 0.05, 0.12); reach(p, 0.85, -0.05); }],
    [1, (p) => { p.footX('L', 0.34); p.footX('R', 0.14, 0, -0.02, 0.5); p.hips(0.24, -0.16, 0, 0); p.lean(0.18, 0.1, 0, 0.14); reach(p, 0.9, 0.1); p.look(0.18, 0.1, 0.2); }],
    [1.5, (p) => { p.footX('L', 0.32); p.footX('R', -0.1, 0.12, 0.02); p.hips(0.18, -0.1, 0, -0.05); p.lean(0.2, 0.06, -0.05); reach(p, 0.85, -0.05); }],
    [2, (p) => { p.footX('R', -0.34); p.footX('L', 0.12); p.hips(-0.1, -0.2, 0, -0.15); p.lean(0.22, 0.1, -0.1, -0.1); reach(p, 0.9, -0.12); p.look(0.15, -0.2, -0.05); }],
    [2.5, (p) => { p.footX('R', -0.34); p.footX('L', -0.02, 0, -0.04, 0.4); p.hips(-0.17, -0.14, 0, -0.1); p.lean(0.2, 0.08, -0.05, -0.12); reach(p, 0.85, 0.05); }],
    [3, (p) => { p.footX('R', -0.34); p.footX('L', -0.14, 0, -0.02, 0.5); p.hips(-0.24, -0.16, 0, 0); p.lean(0.18, 0.1, 0, -0.14); reach(p, 0.9, -0.1); p.look(0.18, -0.1, -0.1); }],
    [3.5, (p) => { p.footX('R', -0.32); p.footX('L', 0.1, 0.12, 0.02); p.hips(-0.18, -0.1, 0, 0.05); p.lean(0.2, 0.06, 0.05); reach(p, 0.85, 0.05); }],
  ], { groove: 0.8, hits: 0.8, slide: true }),

  // Dead-man sway: planted wide, swaying side to side like a hanging coat,
  // arms dangling and swinging a beat behind, knees buckling on the beat.
  rexSway(p, b, B, s) {
    groove(p, B, s, 0.8);
    const sw = Math.sin(Math.PI * b), lag = Math.sin(Math.PI * b - 1.0), buck = Math.pow(0.5 + 0.5 * Math.cos(TAU * b), 3);
    wideStance(p, 0.22);
    p.hips(0.1 * sw, -0.12 - 0.08 * buck, 0, 0.12 * sw);
    p.add('hips', 0, 0, -0.12 * sw);
    p.lean(0.12, 0.08, 0.15 * sw, 0.16 * sw);
    p.arm('L', 0.15 + 0.25 * lag, 0.14 + 0.35 * Math.max(0.0, 0.5 + 0.5 * lag), 0.25 + 0.2 * (0.5 - 0.5 * lag));
    p.arm('R', 0.15 - 0.25 * lag, 0.14 + 0.35 * Math.max(0.0, 0.5 - 0.5 * lag), 0.25 + 0.2 * (0.5 + 0.5 * lag));
    p.wrist('L', 0.5 + 0.2 * lag); p.wrist('R', 0.5 - 0.2 * lag);
    p.look(0.18, -0.15 * lag, -0.25 * lag);
  },

  // The Thriller: claw up left, claw up right (head snapping with each),
  // both claws high and lean back, shoulder shake, hip pops.
  rexThriller: seq(4, [
    [0, (p) => { p.footX('L', 0.3); p.footX('R', -0.1); p.hips(0.1, -0.18, 0, 0.3); claw(p, 'L', 1, 1.4); claw(p, 'R', 0.2); p.lean(0.1, 0.05, 0.2, 0.08); p.look(0.05, 0.5, 0.2); }, 'snap'],
    [0.5, (p) => { p.footX('L', 0.24); p.footX('R', -0.14, 0.1); p.hips(0.06, -0.12, 0, 0.1); claw(p, 'L', 0.7); claw(p, 'R', 0.5); p.lean(0.12, 0.05); }],
    [1, (p) => { p.footX('R', -0.3); p.footX('L', 0.1); p.hips(-0.1, -0.18, 0, -0.3); claw(p, 'R', 1, 1.4); claw(p, 'L', 0.2); p.lean(0.1, 0.05, -0.2, -0.08); p.look(0.05, -0.5, -0.2); }, 'snap'],
    [1.5, (p) => { p.footX('R', -0.24); p.footX('L', 0.14, 0.1); p.hips(-0.06, -0.12, 0, -0.1); claw(p, 'R', 0.7); claw(p, 'L', 0.5); p.lean(0.12, 0.05); }],
    [2, (p) => { p.footX('L', 0.24); p.footX('R', -0.24); p.hips(0, -0.28, 0.02); claw(p, 'L', 1, 1.6); claw(p, 'R', 1, 1.6); p.lean(-0.12, -0.2); p.look(-0.3); p.shrug(0.2); }, 'snap'],
    [2.5, (p) => { p.footX('L', 0.24); p.footX('R', -0.24); p.hips(0, -0.22, 0.02); claw(p, 'L', 0.8); claw(p, 'R', 0.8); p.lean(0.15, 0.15); p.shrug(0.3, -0.1); p.look(0.15); }],
    [3, (p) => { p.footX('L', 0.24); p.footX('R', -0.24); p.hips(0.12, -0.2, 0, 0.2); p.add('hips', 0, 0, -0.25); claw(p, 'L', 0.4); claw(p, 'R', 0.4); p.lean(0.15, 0.1, 0, 0.12); p.look(0.15, 0.25, 0.2); }, 'snap'],
    [3.5, (p) => { p.footX('L', 0.24); p.footX('R', -0.24); p.hips(-0.12, -0.2, 0, -0.2); p.add('hips', 0, 0, 0.25); claw(p, 'L', 0.4); claw(p, 'R', 0.4); p.lean(0.15, 0.1, 0, -0.12); p.look(0.15, -0.25, -0.2); }, 'snap'],
  ], { groove: 0.6, hits: 0.9 }),

  // Shimmy step: shoulders shaking double time, kick-ball-change under it,
  // claws at the chest.
  rexShimmyStep(p, b, B, s) {
    groove(p, B, s, 0.7);
    const sh = Math.sin(TAU * b * 4) * 0.8, f = frac(b), side = Math.cos(Math.PI * (b - f));
    const kick = Math.pow(Math.sin(Math.PI * clamp01(f / 0.6)), 1.2);
    const kf = side > 0 ? 'R' : 'L', st = side > 0 ? 'L' : 'R';
    p.foot(st, 0.15); p.foot(kf, 0.15 + 0.06 * kick, 0.18 * kick, 0.22 * kick, -0.3 * kick);
    p.hips(0.05 * side * kick, -0.14 + 0.03 * kick, -0.02 * kick, 0.1 * side * kick);
    claw(p, 'L', 0.55 + 0.1 * sh); claw(p, 'R', 0.55 - 0.1 * sh);
    p.shrug(0.18 * sh, -0.18 * sh); p.add('chest', 0, 0.14 * sh, 0);
    p.lean(0.12, 0.06); p.look(0.12, 0.1 * sh, 0.1 * side * kick);
  },

  // Accent (count 5): neck CRACK — the head snaps over sideways, claws
  // framing the face.
  rexAccent(p, b, B, s) {
    groove(p, B, s, 0.5);
    wideStance(p, 0.2);
    p.hips(0, -0.14, 0, 0.15);
    claw(p, 'L', 1, 0.9); claw(p, 'R', 1, 0.9);
    p.lean(0.05, 0.05); p.look(0.05, 0.15, -0.75);
  },

  // ── Tier 1 ──────────────────────────────────────────────────
  // CLAW SWIPE: big diagonal claw swipes, one per beat, stepping into each,
  // and a double swipe down on 3.
  rexClaw: seq(4, [
    [0, (p) => { p.footX('L', 0.2, 0, 0.1); p.footX('R', -0.16); p.hips(0.04, -0.18, 0.03, -0.3); p.arm('L', 1.6, -0.3, 0.3); p.wrist('L', -0.6); claw(p, 'R', 0.3); p.lean(0.25, 0.15, -0.25); p.look(0.15, -0.2); }],
    [0.5, (p) => { p.footX('L', 0.16); p.footX('R', -0.14); p.hips(0, -0.12, 0, 0); claw(p, 'L', 0.5); claw(p, 'R', 1, 1.5); p.lean(0.05, -0.05, 0.2); p.look(-0.05, 0.2); }],
    [1, (p) => { p.footX('R', -0.2, 0, 0.1); p.footX('L', 0.16); p.hips(-0.04, -0.18, 0.03, 0.3); p.arm('R', 1.6, -0.3, 0.3); p.wrist('R', -0.6); claw(p, 'L', 0.3); p.lean(0.25, 0.15, 0.25); p.look(0.15, 0.2); }],
    [1.5, (p) => { p.footX('R', -0.16); p.footX('L', 0.14); p.hips(0, -0.12, 0, 0); claw(p, 'R', 0.5); claw(p, 'L', 1, 1.5); p.lean(0.05, -0.05, -0.2); p.look(-0.05, -0.2); }],
    [2, (p) => { p.footX('L', 0.2, 0, 0.1); p.footX('R', -0.16); p.hips(0.04, -0.18, 0.03, -0.3); p.arm('L', 1.6, -0.3, 0.3); p.wrist('L', -0.6); claw(p, 'R', 0.3); p.lean(0.25, 0.15, -0.25); p.look(0.15, -0.2); }],
    [2.5, (p) => { p.footX('L', 0.2); p.footX('R', -0.2); p.hips(0, -0.1, -0.02); claw(p, 'L', 1, 1.7); claw(p, 'R', 1, 1.7); p.lean(-0.1, -0.15); p.look(-0.25); }],
    [3, (p) => { p.footX('L', 0.24); p.footX('R', -0.24); p.hips(0, -0.3, 0.04); p.arms(0.9, 0.3, 0.2); p.wrist('L', -0.6); p.wrist('R', -0.6); p.lean(0.4, 0.2); p.look(0.25); }],
  ], { groove: 0.6, hits: 0.8, loop: false }),

  // LIMB FLOP: an arm goes up... and flops dead, wobbles, SNAPS back up on
  // the beat. Left, right, then the head, then both arms.
  rexLimbFlop(p, b, B, s) {
    groove(p, B, s, 0.6);
    wideStance(p, 0.18);
    const fl = (a) => flop((b - a) / 0.75) * (1 - smooth((b - a - 0.75) / 0.2));
    const L = Math.max(fl(0.15), fl(3.15)), R = Math.max(fl(1.15), fl(3.15)), H = fl(2.15);
    p.hips(0.05 * (R - L), -0.14 - 0.06 * H, 0, 0.1 * (L - R));
    p.arm('L', lerp(0.5, 0.0, L), lerp(2.6, 0.2, L), lerp(0.3, 0.1, L)); p.wrist('L', 0.8 * L);
    p.arm('R', lerp(0.5, 0.0, R), lerp(2.6, 0.2, R), lerp(0.3, 0.1, R)); p.wrist('R', 0.8 * R);
    p.lean(0.06 + 0.2 * H, 0.05 + 0.15 * H, 0, 0.15 * (R - L)); p.look(-0.15 + 0.75 * H, 0, 0.25 * (R - L) + 0.1 * H);
    p.shrug(-0.15 * L, -0.15 * R);
  },

  // ── Tier 2 ──────────────────────────────────────────────────
  // THRILLER STEP: claws by the face, the side-step with a head jerk, a
  // knee lift and hip pop — left, then right.
  rexThrillerStep: seq(4, [
    [0, (p) => { p.foot('L', 0.24); p.foot('R', 0.1, 0, 0, 0.5); p.hips(0.1, -0.22, 0, 0.25); claw(p, 'L', 1, 1.0); claw(p, 'R', 1, 1.0); p.lean(0.18, 0.1, 0.1, 0.1); p.look(0.1, 0.45, 0.15); }, 'snap'],
    [0.5, (p) => { p.foot('L', 0.22); p.foot('R', 0.16, 0.24, 0.1); p.hips(0.08, -0.12, 0, 0.1); claw(p, 'L', 0.8); claw(p, 'R', 0.8); p.lean(0.1, 0.05); p.look(0.05, 0.2); }],
    [1, (p) => { p.foot('L', 0.22); p.foot('R', 0.24); p.hips(-0.06, -0.24, 0, -0.1); p.add('hips', 0, 0, 0.25); claw(p, 'L', 0.4); claw(p, 'R', 0.4); p.lean(0.22, 0.15, 0, -0.1); p.look(0.25, -0.2, -0.2); }, 'snap'],
    [1.5, (p) => { p.foot('L', 0.18, 0.08); p.foot('R', 0.22); p.hips(-0.04, -0.14, 0, 0); claw(p, 'L', 0.7); claw(p, 'R', 0.7); p.lean(0.12, 0.05); }],
    [2, (p) => { p.foot('R', 0.24); p.foot('L', 0.1, 0, 0, 0.5); p.hips(-0.1, -0.22, 0, -0.25); claw(p, 'L', 1, 1.0); claw(p, 'R', 1, 1.0); p.lean(0.18, 0.1, -0.1, -0.1); p.look(0.1, -0.45, -0.15); }, 'snap'],
    [2.5, (p) => { p.foot('R', 0.22); p.foot('L', 0.16, 0.24, 0.1); p.hips(-0.08, -0.12, 0, -0.1); claw(p, 'L', 0.8); claw(p, 'R', 0.8); p.lean(0.1, 0.05); p.look(0.05, -0.2); }],
    [3, (p) => { p.foot('R', 0.22); p.foot('L', 0.24); p.hips(0.06, -0.24, 0, 0.1); p.add('hips', 0, 0, -0.25); claw(p, 'L', 0.4); claw(p, 'R', 0.4); p.lean(0.22, 0.15, 0, 0.1); p.look(0.25, 0.2, 0.2); }, 'snap'],
    [3.5, (p) => { p.foot('R', 0.18, 0.08); p.foot('L', 0.22); p.hips(0.04, -0.14, 0, 0); claw(p, 'L', 0.7); claw(p, 'R', 0.7); p.lean(0.12, 0.05); }],
  ], { groove: 0.6, hits: 0.8 }),

  // SHOULDER SHIMMY: bends down shimmying, comes back up shimmying,
  // arms dangling loose, head lolling with it.
  rexShimmy(p, b, B, s) {
    groove(p, B, s, 0.5);
    const down = 0.5 - 0.5 * Math.cos(Math.PI * b), sh = Math.sin(TAU * b * 4);
    wideStance(p, 0.22 + 0.06 * down);
    p.hips(0.03 * sh, -0.1 - 0.26 * down, -0.04 * down);
    p.lean(0.2 + 0.35 * down, 0.15 * down, 0, 0.05 * Math.sin(Math.PI * b * 0.5));
    p.shrug(0.2 * sh, -0.2 * sh); p.add('chest', 0, 0.18 * sh, 0);
    p.arm('L', 0.3 + 0.4 * down, 0.2 + 0.15 * sh, 0.3); p.arm('R', 0.3 + 0.4 * down, 0.2 - 0.15 * sh, 0.3);
    p.wrist('L', 0.7); p.wrist('R', 0.7);
    p.look(0.1 - 0.35 * down, 0.12 * sh, 0.2 * Math.sin(Math.PI * b));
  },

  // ── Tier 3 ──────────────────────────────────────────────────
  // DEAD MAN LEAN: tips forward from the ankles like a falling plank,
  // hangs there impossibly, wobbling, then snaps upright into the claws.
  rexDeadLean(p, b, B, s) {
    phased(p, b, B, s, [
      [2.75, (p, b, B, s) => {
        groove(p, B, s, 0.25);
        const k = smooth(b / 1.0), wob = Math.sin(TAU * b * 1.5) * k;
        p.foot('L', 0.13, 0, -0.02, 0.15 * k); p.foot('R', 0.13, 0, -0.02, 0.15 * k);
        p.hips(0.01 * wob, -0.06 - 0.02 * k, 0.3 * k);
        p.lean(0.32 * k, 0.12 * k, 0.04 * wob);
        reach(p, k, 0.08 * wob); p.look(-0.25 * k, 0.1 * wob, 0.15 * k);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 2.75) / 0.3);
        wideStance(p, 0.13 + 0.09 * k);
        p.hips(0, -0.08 - 0.12 * k, 0.3 * (1 - k), 0.2 * k);
        p.lean(0.32 * (1 - k) - 0.05 * k, 0.12 * (1 - k) - 0.1 * k);
        claw(p, 'L', k, 1.4); claw(p, 'R', k, 1.4); p.look(-0.25 * (1 - k) - 0.1 * k, 0.3 * k, -0.4 * k);
      }],
    ]);
  },

  // ZOMBIE JITTER: a broken puppet — snapping into a new twisted pose on
  // every half beat.
  rexJitter: seq(4, [
    [0, (p) => { wideStance(p, 0.2); p.hips(0, -0.16, 0, 0.2); p.arm('L', 0.4, 1.4, 1.6, 1.4); p.arm('R', 0.2, 0.3, 0.2); p.wrist('R', 0.8); p.look(0.2, 0.3, 0.5); }, 'snap'],
    [0.5, (p) => { wideStance(p, 0.2); p.hips(0.06, -0.22, 0, -0.1); p.arm('L', 0.1, 0.3, 0.1); p.wrist('L', 0.9); p.arm('R', 1.6, 0.2, 1.7, -1.2); p.lean(0.2, 0.1, 0.2); p.look(-0.2, -0.3, -0.3); }, 'snap'],
    [1, (p) => { p.foot('L', 0.2); p.foot('R', 0.12, 0, 0, 0.6); p.hips(0.06, -0.2, 0, 0.3); p.add('hips', 0, 0, 0.2); p.arms(1.5, 0.1, 0.1); p.wrist('L', 0.8); p.wrist('R', 0.8); p.lean(0.1, -0.1, 0, 0.2); p.look(0.3, 0, 0.6); }, 'snap'],
    [1.5, (p) => { wideStance(p, 0.22); p.hips(0, -0.28, 0); p.arm('L', 2.8, 0.3, 0.5, 0.5); p.arm('R', -0.4, 0.5, 0.3); p.lean(-0.15, -0.2, 0, -0.15); p.look(-0.4, 0.2, -0.3); }, 'snap'],
    [2, (p) => { wideStance(p, 0.2); p.hips(-0.05, -0.16, 0, -0.25); p.arm('R', 0.4, 1.4, 1.6, 1.4); p.arm('L', 0.2, 0.3, 0.2); p.wrist('L', 0.8); p.look(0.2, -0.3, -0.5); }, 'snap'],
    [2.5, (p) => { wideStance(p, 0.2); p.hips(-0.06, -0.22, 0, 0.1); p.arm('R', 0.1, 0.3, 0.1); p.wrist('R', 0.9); p.arm('L', 1.6, 0.2, 1.7, -1.2); p.lean(0.2, 0.1, -0.2); p.look(-0.2, 0.3, 0.3); }, 'snap'],
    [3, (p) => { p.foot('R', 0.2); p.foot('L', 0.12, 0, 0, 0.6); p.hips(-0.06, -0.2, 0, -0.3); p.add('hips', 0, 0, -0.2); p.arms(1.5, 0.1, 0.1); p.wrist('L', 0.8); p.wrist('R', 0.8); p.lean(0.1, -0.1, 0, -0.2); p.look(0.3, 0, -0.6); }, 'snap'],
    [3.5, (p) => { wideStance(p, 0.24); p.hips(0, -0.3, 0.02); claw(p, 'L', 1, 1.5); claw(p, 'R', 1, 1.5); p.lean(0.1, 0.1); p.look(0.1, 0, 0.3); }, 'snap'],
  ], { groove: 0.4, hits: 0.6 }),

  // ── Tier 4 ──────────────────────────────────────────────────
  // GRAVE RISE: drops into a curled crouch, then jolts up in stages — one
  // arm reaching for the sky, then the other — and ROARS, claws out.
  rexRiseUp(p, b, B, s) {
    groove(p, B, s, 0.3);
    const down = smooth(b / 0.5), up = stairs(b, 0.75, 5, 0.5, 0.16), roar = smooth((b - 3.2) / 0.3);
    const lvl = down * (1 - up);
    wideStance(p, 0.2 + 0.06 * lvl);
    p.hips(0, -0.06 - 0.5 * lvl, -0.08 * lvl);
    p.lean(0.7 * lvl - 0.12 * roar, 0.3 * lvl - 0.15 * roar);
    const aL = smooth((b - 1.0) / 0.2), aR = smooth((b - 1.5) / 0.2);
    p.arm('L', lerp(lerp(0.6, 0.9, down), 2.9, aL * (1 - roar)) * (1 - roar) + 0.75 * roar, lerp(0.3, 0.3, aL) * (1 - roar) + 1.5 * roar, 0.3 * (1 - roar) + 1.7 * roar, 0.9 * roar);
    p.arm('R', lerp(lerp(0.6, 0.9, down), 2.9, aR * (1 - roar)) * (1 - roar) + 0.75 * roar, lerp(0.3, 0.3, aR) * (1 - roar) + 1.5 * roar, 0.3 * (1 - roar) + 1.7 * roar, 0.9 * roar);
    p.wrist('L', -0.7 * roar + 0.5 * (1 - aL)); p.wrist('R', -0.7 * roar + 0.5 * (1 - aR));
    p.look(0.4 * lvl - 0.45 * roar * (1 - smooth((b - 3.7) / 0.3)), 0.15 * Math.sin(TAU * b) * (1 - roar));
    p.shrug(0.25 * roar);
  },

  // BONE CRACK: arches back with the head flopped behind him, then cracks
  // back into place joint by joint — head, shoulders, elbows, hips — and a
  // jump with a claw clap.
  rexBoneCrack(p, b, B, s) {
    phased(p, b, B, s, [
      [2.4, (p, b, B, s) => {
        groove(p, B, s, 0.3);
        const arch = smooth(b / 0.9);
        const c1 = smooth((b - 1.0) / 0.12), c2 = smooth((b - 1.25) / 0.12), c3 = smooth((b - 1.5) / 0.12), c4 = smooth((b - 1.75) / 0.12), c5 = smooth((b - 2.0) / 0.12);
        wideStance(p, 0.2);
        p.hips(0, -0.12 - 0.06 * c5, 0.08 * arch * (1 - c4));
        p.add('spine', -0.35 * arch * (1 - c4)); p.add('chest', -0.35 * arch * (1 - c3));
        p.look(-0.7 * arch * (1 - c1) + 0.1 * c1, 0, 0.3 * c1 * (1 - c5));
        p.shrug(0.3 * c2 * (1 - c3) - 0.1 * arch * (1 - c2));
        const el = c3;
        p.arm('L', lerp(0.0, 0.6, el), lerp(0.8 * arch, 1.3, el), lerp(0.1, 1.7, el), 0.9 * el);
        p.arm('R', lerp(0.0, 0.6, c4), lerp(0.8 * arch, 1.3, c4), lerp(0.1, 1.7, c4), 0.9 * c4);
        p.wrist('L', -0.7 * el + 0.6 * (1 - el)); p.wrist('R', -0.7 * c4 + 0.6 * (1 - c4));
      }],
      [3.4, (p, b) => {
        const t = (b - 2.4) / 1.0, air = Math.sin(Math.PI * t);
        const hy = lerp(-0.18, -0.04, smooth(t / 0.25)) + 0.4 * air;
        p.hips(0, hy, 0);
        const fl = Math.max(0, hy + 0.03) * 0.9 + 0.12 * air;
        p.foot('L', 0.16 + 0.08 * air, fl, 0.05); p.foot('R', 0.16 + 0.08 * air, fl, 0.05);
        const clap = bump((t - 0.35) / 0.4);
        p.arms(lerp(0.6, 1.3, clap) + 0.3 * air, lerp(1.3, -0.15, clap), lerp(1.7, 0.6, clap), lerp(0.9, 0, clap));
        p.look(-0.2 * air);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const u = clamp01((b - 3.4) / 0.4), give = Math.sin(Math.PI * u);
        wideStance(p, 0.22);
        p.hips(0, -0.05 - 0.2 * give - 0.1 * u, 0);
        claw(p, 'L', 1, 1.5); claw(p, 'R', 1, 1.5);
        p.lean(0.15 * give, 0.1); p.look(0.1, 0, -0.3 * u);
      }],
    ]);
  },

  // ── ★ Signature moves ───────────────────────────────────────
  // ★ MOON SHAMBLE: a zombie moonwalk — gliding backwards, one foot
  // dragging flat, the other rolling off its toes, arms reaching forward.
  rexMoonShamble(p, b, B, s) {
    groove(p, B, s, 0.5);
    const glide = b < 3 ? b : 3, z0 = -0.12 * glide + 0.36 * smooth((b - 3) / 0.9);
    const ph = frac(b), sideK = Math.cos(Math.PI * (b - ph));       // which foot is flat this beat
    const flatSlide = smooth(ph), toeUp = 0.7 * (1 - smooth((ph - 0.7) / 0.3));
    const back = b < 3 ? 1 : 1 - smooth((b - 3) / 0.6);
    const fFlat = z0 + (0.15 - 0.3 * flatSlide) * back, fToe = z0 - 0.08 * back;
    const flat = sideK > 0 ? 'L' : 'R', toe = sideK > 0 ? 'R' : 'L';
    p.foot(flat, 0.12, 0, fFlat, 0); p.foot(toe, 0.12, 0.01 * back, fToe, toeUp * back);
    p.hips(0, -0.12, z0 - 0.02);
    p.lean(0.12, 0.08);
    reach(p, 1, 0.1 * Math.sin(TAU * b)); p.look(0.15, 0.15 * Math.sin(Math.PI * b), 0.2);
  },

  // ★ HEAD ROLL: the head rolls round and round in big lazy circles, the
  // shoulders rolling with it, arms flopping — a spin — and a neck crack.
  rexHeadRoll(p, b, B, s) {
    phased(p, b, B, s, [
      [2.4, (p, b, B, s) => {
        groove(p, B, s, 0.6);
        const a = TAU * b * 0.75;
        wideStance(p, 0.2);
        p.hips(0.06 * Math.cos(a), -0.16, 0.04 * Math.sin(a), 0.15 * Math.cos(a));
        p.look(0.45 * Math.sin(a), 0.2 * Math.cos(a), 0.6 * Math.cos(a));
        p.lean(0.1 + 0.1 * Math.sin(a), 0.1 * Math.sin(a - 0.6), 0.15 * Math.cos(a), 0.12 * Math.cos(a - 0.5));
        p.shrug(0.2 * Math.pow(0.5 + 0.5 * Math.cos(a), 2) + 0.05, 0.2 * Math.pow(0.5 - 0.5 * Math.cos(a), 2) + 0.05);
        p.arm('L', 0.2 + 0.3 * Math.sin(a - 1), 0.3 + 0.3 * (0.5 + 0.5 * Math.cos(a - 1)), 0.3); p.wrist('L', 0.7);
        p.arm('R', 0.2 - 0.3 * Math.sin(a - 1), 0.3 + 0.3 * (0.5 - 0.5 * Math.cos(a - 1)), 0.3); p.wrist('R', 0.7);
      }],
      [3.3, (p, b) => {
        const t = smooth((b - 2.4) / 0.9);
        p.foot('L', 0.03, 0, 0, 0.4); p.foot('R', 0.09, 0.1 * bump(t) + 0.02, 0.04, 0.4);
        p.hips(0, -0.06, 0); p.root(0, 0, 0, TAU * t);
        p.arms(0.3, 0.6 + 0.8 * bump(t), 0.3); p.wrist('L', 0.7); p.wrist('R', 0.7);
        p.look(0.2, 0, 0.4 * bump(t));
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.3) / 0.25);
        wideStance(p, 0.13 + 0.08 * k);
        p.hips(0, -0.06 - 0.1 * k, 0, 0.15 * k);
        claw(p, 'L', k, 0.9); claw(p, 'R', k, 0.9);
        p.look(0.05, 0.15 * k, -0.75 * k);
      }],
    ]);
  },

  // ★ GRAVE DANCE (encore): the full Thriller finale — claws left and
  // right, shoulders shaking all the way down, and a leap out into the
  // big claw pose.
  rexGraveDance(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b, B, s) => evalMove('rexThriller', b, B, s, p)],
      [3, (p, b, B, s) => moves.rexShimmy(p, (b - 2) * 1.0, B, s)],
      [Infinity, (p, b, B, s) => {
        const t = clamp01((b - 3) / 0.6), air = Math.sin(Math.PI * t), k = smooth((b - 3) / 0.3);
        const hy = lerp(-0.36, -0.06, smooth(t / 0.3)) + 0.3 * air - 0.12 * smooth((b - 3.6) / 0.2);
        p.hips(0, hy, 0);
        const fl = Math.max(0, hy + 0.03) * 0.9;
        p.foot('L', 0.24 + 0.05 * air, fl); p.foot('R', 0.24 + 0.05 * air, fl);
        claw(p, 'L', k, 1.6); claw(p, 'R', k, 1.6);
        p.lean(0.3 * (1 - k) - 0.1 * k, 0.1 - 0.15 * k); p.look(-0.3 * k, 0, 0.25 * k); p.shrug(0.2 * k);
        groove(p, B, s, 0.4 * smooth((b - 3.6) / 0.3));
      }],
    ]);
  },

  // ★★ SOLO — CRAWL OUT: crouched low, clawing his way up out of the
  // ground hand over hand, jolting to his feet, a spin, and the big
  // Thriller claw pose.
  rexGraveCrawl(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b) => {
        const k = smooth(b / 0.4), c = Math.sin(TAU * b * 1.33);
        wideStance(p, 0.26);
        p.hips(0, -0.06 - 0.5 * k, -0.06 * k);
        p.lean(0.6 * k, 0.25 * k + 0.1 * c * k);
        p.arm('L', 0.9 + 1.4 * (0.5 + 0.5 * c) * k, 0.3, 0.5 + 0.6 * (0.5 - 0.5 * c)); p.wrist('L', -0.6);
        p.arm('R', 0.9 + 1.4 * (0.5 - 0.5 * c) * k, 0.3, 0.5 + 0.6 * (0.5 + 0.5 * c)); p.wrist('R', -0.6);
        p.look(-0.1 * k + 0.15 * c, 0.15 * c);
      }],
      [2.6, (p, b) => {
        const up = stairs(b, 1.6, 3, 0.33, 0.12);
        wideStance(p, 0.26 - 0.06 * up);
        p.hips(0, -0.56 + 0.46 * up, -0.06 * (1 - up));
        p.lean(0.6 * (1 - up), 0.25 * (1 - up));
        p.arm('L', 2.3 - 1.0 * up, 0.3 + 0.6 * up, 0.5 + 0.8 * up); p.arm('R', 2.0 - 0.8 * up, 0.3 + 0.6 * up, 0.8 + 0.5 * up);
        p.wrist('L', -0.6); p.wrist('R', -0.6); p.look(0.1 - 0.3 * up, 0.2 * Math.sin(TAU * b * 3) * (1 - up));
      }],
      [3.25, (p, b) => {
        const t = smooth((b - 2.6) / 0.65);
        p.foot('L', 0.03, 0, 0, 0.4); p.foot('R', 0.09, 0.1 * bump(t) + 0.02, 0.04, 0.4);
        p.hips(0, -0.06, 0); p.root(0, 0, 0, TAU * t);
        p.arms(0.5, 0.9 + 0.5 * bump(t), 1.3); p.wrist('L', -0.6); p.wrist('R', -0.6);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.25) / 0.3);
        wideStance(p, 0.13 + 0.13 * k);
        p.hips(0.05 * k, -0.06 - 0.18 * k, 0, 0.25 * k);
        claw(p, 'L', 1, 1.0 + 0.6 * k); claw(p, 'R', 1, 1.0 + 0.6 * k);
        p.lean(0.12 * k, 0.1 * k, 0, 0.1 * k); p.look(0.1, 0.2 * k, -0.35 * k); p.shrug(0.2 * k);
      }],
    ]);
  },

  // ── Battle actions ──────────────────────────────────────────
  // Intro (faces the player, +x): lurches at you, arms out — BRAAAINS —
  // cracks his neck, then a floppy little wave.
  rexIntro(p, b, B, s) {
    groove(p, B, s, 0.4);
    phased(p, b, B, s, [
      [1.5, (p, b) => {
        const k = smooth(b / 0.5), z = 0.15 * smooth(b / 1.4), st = Math.sin(TAU * b);
        p.foot('L', 0.15, 0.05 * Math.pow(0.5 + 0.5 * st, 3), z + 0.1); p.foot('R', 0.15, 0.05 * Math.pow(0.5 - 0.5 * st, 3), z - 0.06, 0.3);
        p.hips(0.02 * st, -0.16, z + 0.04, 0.6 * k);
        p.lean(0.25 * k, 0.1 * k, 0.15); reach(p, k, 0.1 * st); p.look(0.05, 0.3 * k, 0.2 * st);
      }],
      [2.5, (p, b) => {
        const c = smooth((b - 1.6) / 0.15), c2 = smooth((b - 2.0) / 0.15);
        p.foot('L', 0.15, 0, 0.25); p.foot('R', 0.15, 0, 0.09, 0.3);
        p.hips(0, -0.14, 0.19, 0.5);
        p.arm('L', 1.3, 0.3, 1.9, -0.9); p.arm('R', 1.3, 0.3, 1.9, -0.9);
        p.wrist('L', -0.3); p.wrist('R', -0.3);
        p.look(0.05, 0.3, -0.6 * c + 1.2 * c2 * 0.5); p.lean(0.05, 0.05);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 2.5) / 0.3), w = 0.5 - 0.5 * Math.cos(TAU * (b - 2.5) * 2);
        p.foot('L', 0.15, 0, 0.25 * (1 - k) + 0.1 * k); p.foot('R', 0.17, 0, 0.09 * (1 - k) - 0.04 * k, 0.3);
        p.hips(0, -0.12, 0.19 * (1 - k) + 0.04 * k, 0.45);
        p.arm('L', 0.5, lerp(0.4, 2.4, k) - 0.4 * w * k, 0.3 + 0.6 * w * k); p.wrist('L', 0.8 * w * k);
        p.arm('R', 0.1, 0.2, 0.3); p.wrist('R', 0.6);
        p.look(0.1, 0.3, 0.3 * k); p.lean(0.06, 0.04, 0, 0.1 * k);
      }],
    ]);
  },

  // GOO TOSS: scoops up a glob of toxic goo and lobs it at you (released at
  // +0.75 beats), then giggles, hugging his belly. Faces the foe (+x).
  rexTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    phased(p, b, B, s, [
      [0.5, (p, b) => {
        const k = smooth(b / 0.45);
        p.foot('L', 0.16, 0, 0.1); p.foot('R', 0.18, 0, -0.08, 0.3);
        p.hips(-0.02, -0.12 - 0.12 * k, -0.04 * k, 0.4);
        p.arm('L', 0.4 + 0.6 * k, 0.3, 0.3 + 0.4 * k); p.wrist('L', 0.5 * k);
        p.arm('R', 0.2, 0.3, 0.4);
        p.lean(0.3 * k, 0.15 * k, 0.1); p.look(0.2 * k, 0.25);
      }],
      [1.4, (p, b) => {
        const t = smooth((b - 0.5) / 0.35);
        p.foot('L', 0.16, 0, 0.1 + 0.1 * t); p.foot('R', 0.18, 0, -0.08, 0.4);
        p.hips(0.04 * t, -0.24 + 0.12 * t, 0.06 * t, 0.65);
        p.arm('L', lerp(1.0, 2.9, smooth((b - 0.5) / 0.15)) * (1 - t) + 1.4 * t, lerp(0.3, 0.9, t), lerp(0.7, 0.1, t), 0); p.wrist('L', -0.4 * t);
        p.arm('R', 0.3, 0.4, 0.5);
        p.lean(0.3 - 0.1 * t, 0.15, 0.25 * t); p.look(0.05, 0.35);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 1.4) / 0.4), g = Math.sin(TAU * (b - 1.4) * 4) * k * (1 - smooth((b - 3.2) / 0.5));
        p.foot('L', 0.15, 0, 0.08); p.foot('R', 0.17, 0, -0.06, 0.3);
        p.hips(0.01 * g, -0.14 + 0.02 * g, 0, 0.4);
        p.arm('L', 0.6, 0.05, 1.7, -1.0); p.arm('R', 0.55, 0.05, 1.7, -1.0);
        p.lean(0.18 * k + 0.04 * g, 0.12 * k); p.look(0.15 * k + 0.05 * g, 0.25, 0.25 * k); p.shrug(0.08 * g, -0.08 * g);
      }],
    ]);
  },

  // Victory: happy zombie hops, claws waving, head lolling around.
  rexVictory(p, b, B, s) {
    const hop = Math.pow(Math.sin(Math.PI * frac(b)), 1.4);
    p.foot('L', 0.15, 0.08 * hop); p.foot('R', 0.15, 0.08 * hop);
    p.hips(0.04 * Math.sin(Math.PI * b), -0.12 + 0.1 * hop, 0);
    const w = Math.sin(TAU * b);
    claw(p, 'L', 0.8 + 0.2 * w, 1.6); claw(p, 'R', 0.8 - 0.2 * w, 1.6);
    p.look(-0.1 + 0.2 * Math.sin(TAU * b * 0.5), 0.2 * w, 0.3 * Math.sin(Math.PI * b));
    p.lean(0.05, -0.05);
    groove(p, B, s, 0.4);
  },
};

export const moveMeta = {
  labels: {
    rexClaw: 'CLAW SWIPE', rexLimbFlop: 'LIMB FLOP', rexThrillerStep: 'THRILLER STEP', rexShimmy: 'SHOULDER SHIMMY',
    rexDeadLean: 'DEAD MAN LEAN', rexJitter: 'ZOMBIE JITTER', rexRiseUp: 'GRAVE RISE', rexBoneCrack: 'BONE CRACK',
    rexMoonShamble: 'MOON SHAMBLE', rexHeadRoll: 'HEAD ROLL', rexGraveDance: 'GRAVE DANCE', rexGraveCrawl: 'CRAWL OUT',
    rexTaunt: 'GOO TOSS', rexIntro: 'BRAAAINS', rexVictory: 'UNDEAD PARTY',
  },
  expressions: {
    rexShamble: 'dizzy', rexSway: 'o', rexThriller: 'grin', rexShimmyStep: 'joy', rexAccent: 'shout',
    rexClaw: 'angry', rexLimbFlop: 'dizzy', rexThrillerStep: 'grin', rexShimmy: 'joy',
    rexDeadLean: 'o', rexJitter: 'dizzy', rexRiseUp: 'shout', rexBoneCrack: 'shout',
    rexMoonShamble: 'smirk', rexHeadRoll: 'dizzy', rexGraveDance: 'shout', rexGraveCrawl: 'shout',
    rexIntro: 'o', rexTaunt: 'grin', rexVictory: 'joy',
  },
  hits: {
    rexSway: 0.8, rexShimmyStep: 1, rexAccent: 0.3, rexLimbFlop: 0.5, rexShimmy: 0.8, rexDeadLean: 0.1,
    rexRiseUp: 0.3, rexBoneCrack: 0.2, rexMoonShamble: 0.4, rexHeadRoll: 0.6, rexGraveDance: 0.3, rexGraveCrawl: 0,
    rexIntro: 0.4, rexTaunt: 0.4, rexVictory: 0.6,
  },
  fnGroove: { rexDeadLean: 0, rexBoneCrack: 0, rexHeadRoll: 0, rexGraveDance: 0, rexGraveCrawl: 0, rexRiseUp: 0.2, rexVictory: 0.2 },
  stiff: { rexJitter: 1.7, rexThriller: 1.3, rexThrillerStep: 1.3, rexClaw: 1.2 },
};

export default { moves, moveMeta };
