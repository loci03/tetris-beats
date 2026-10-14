// Shared dance vocabulary — real social / street / jazz steps that every
// dancer's choreography is built from (see choreo.js), written with the
// same authoring kit as the level modules.
//
// Principles every move here follows:
//   • weight transfer: the hips sit over the standing foot, and a foot only
//     travels while it carries no weight (lifted, or on its ball);
//   • foot contacts land on the beat (integer keys) and passing positions on
//     the "and" (half keys) — the music is in the feet first;
//   • the body is layered: feet on the beats, knees bounce with the groove,
//     the torso counter-rotates against the hips, shoulders / head accent
//     the backbeat and the 8ths;
//   • nothing flips, jumps or spins more than one turn — those are
//     designated specials (solo / victory), never everyday dancing.
// Moves read `s.level` (combo level 1-4) to grow arm size / sharpness with
// the combo — escalation by styling and choreography, not speed.

import { kit, registerMoves, POSE_SIZE } from './dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, fists, hipHand, crossArms, clapFront, wideStance, twoStepFeet } = kit;

const lvl = (s) => Math.min(4, Math.max(1, s.level || 1));
// Styling grows with the combo level: 1 → 1.0, 4 → 1.3.
const amp = (s) => 1 + 0.1 * (lvl(s) - 1);
const mod = (x, n) => ((x % n) + n) % n;

// ── Basic ───────────────────────────────────────────────────────────
const moves = {
  // KNEE BOUNCE — the foundation groove: feet planted, knees give into
  // every beat with the weight rocking over one foot then the other (that
  // heel peels up), relaxed arms swinging opposite, chin nodding.
  kneeBounce: seq(2, [
    [0, (p) => { p.foot('L', 0.17); p.foot('R', 0.17, 0, 0, 0.22); p.hips(0.045, -0.08, 0.01, 0.12); p.lean(0.09, 0.07, 0.12, -0.05); p.arm('L', -0.2, 0.25, 0.9); p.arm('R', 0.55, 0.22, 1.45, -0.25); p.look(0.12, 0.12); }],
    [0.5, (p) => { p.foot('L', 0.17); p.foot('R', 0.17); p.hips(0, -0.02, 0, 0); p.lean(0.02, -0.03); p.arms(0.2, 0.26, 1.2, -0.1); p.shrug(0.07); p.look(-0.04); }],
    [1, (p) => { p.foot('R', 0.17); p.foot('L', 0.17, 0, 0, 0.22); p.hips(-0.045, -0.08, 0.01, -0.12); p.lean(0.09, 0.07, -0.12, 0.05); p.arm('R', -0.2, 0.25, 0.9); p.arm('L', 0.55, 0.22, 1.45, -0.25); p.look(0.12, -0.12); }],
    [1.5, (p) => { p.foot('L', 0.17); p.foot('R', 0.17); p.hips(0, -0.02, 0, 0); p.lean(0.02, -0.03); p.arms(0.2, 0.26, 1.2, -0.1); p.shrug(0.07); p.look(-0.04); }],
  ], { groove: 0.6, hits: 1 }),

  // SHOULDER BOUNCE — step-touch underneath; the shoulders pop up one at a
  // time on the beats, then double-time on 3-and-4-and; elbows bent, the
  // head tilting into the high shoulder.
  shoulderBounce: seq(4, [
    [0, (p) => { twoStepFeet.c1(p); p.shrug(0.3, -0.06); p.lean(0.04, 0.03, 0.12, 0.1); p.arms(0.35, 0.32, 1.55, -0.25); p.look(0.08, 0.12, 0.14); }],
    [0.5, (p) => { twoStepFeet.a1(p); p.shrug(0.03, 0.03); p.arms(0.3, 0.3, 1.45, -0.25); p.look(0.02); }],
    [1, (p) => { twoStepFeet.c2(p); p.shrug(-0.06, 0.3); p.lean(0.06, 0.05, -0.16, -0.1); p.arms(0.38, 0.32, 1.6, -0.25); p.look(0.1, -0.15, -0.14); }],
    [1.5, (p) => { twoStepFeet.a2(p); p.shrug(0.03, 0.03); p.arms(0.3, 0.3, 1.45, -0.25); }],
    [2, (p) => { twoStepFeet.c1(p); p.shrug(0.28, -0.05); p.lean(0.04, 0.03, 0.1, 0.1); p.arms(0.35, 0.32, 1.55, -0.25); p.look(0.06, 0.1, 0.12); }],
    [2.5, (p) => { twoStepFeet.a3(p); p.shrug(-0.05, 0.26); p.lean(0.04, 0.03, -0.08, -0.08); p.arms(0.33, 0.3, 1.5, -0.25); p.look(0.04, -0.06, -0.1); }],
    [3, (p) => { twoStepFeet.c4(p); p.shrug(0.28, -0.05); p.lean(0.06, 0.05, 0.12, 0.1); p.arms(0.38, 0.32, 1.6, -0.25); p.look(0.1, 0.12, 0.12); }],
    [3.5, (p) => { twoStepFeet.a4(p); p.shrug(-0.05, 0.26); p.lean(0.04, 0.03, -0.08, -0.08); p.arms(0.33, 0.3, 1.5, -0.25); p.look(0.04, -0.06, -0.1); }],
  ], { groove: 0.7, hits: 1 }),

  // SHOULDER ROLLS — weight rocking side to side on the beats while the
  // shoulders roll back one after the other (forward, up, back, down), the
  // chest riding each roll and the head easing toward it.
  shoulderRoll(p, b, B, s) {
    groove(p, B, s, 0.7);
    const A = amp(s);
    const side = Math.cos(Math.PI * b);                    // +1 on 1 and 3 (weight left), -1 on 2 and 4
    p.foot('L', 0.19, 0, 0, 0.25 * Math.max(0, -side));
    p.foot('R', 0.19, 0, 0, 0.25 * Math.max(0, side));
    p.hips(0.05 * side, -0.09, 0.01, 0.1 * side);
    // Each shoulder rolls over two beats, the right a beat behind the left.
    const fL = TAU * b / 2, fR = fL - Math.PI;
    p.add('shL', 0, -0.2 * A * Math.cos(fL), 0.17 * A * Math.max(-0.2, Math.sin(fL)));
    p.add('shR', 0, 0.2 * A * Math.cos(fR), -0.17 * A * Math.max(-0.2, Math.sin(fR)));
    p.add('chest', -0.05 * (Math.sin(fL) + Math.sin(fR)), 0.09 * (Math.cos(fL) - Math.cos(fR)), 0);
    p.arm('L', 0.12 + 0.12 * Math.cos(fL), 0.22, 0.65 + 0.15 * Math.sin(fL));
    p.arm('R', 0.12 + 0.12 * Math.cos(fR), 0.22, 0.65 + 0.15 * Math.sin(fR));
    p.lean(0.04, 0, 0, -0.06 * side);
    p.look(0.06, 0.1 * Math.sin(fL), 0.08 * side);
  },

  // HIP SWAY — step out and sway: the weight lands on alternate feet on
  // every beat, the hip pops out over it, the ribs counter, finger snaps
  // at hip height on the 2 and 4.
  hipSway: seq(2, [
    [0, (p) => { p.foot('L', 0.2); p.foot('R', 0.16, 0, 0.02, 0.35); p.hips(0.075, -0.08, 0, 0.1); p.add('hips', 0, 0, 0.16); p.lean(0.02, -0.02, -0.08, -0.12); p.arm('L', 0.1, 0.42, 0.75); p.arm('R', 0.25, 0.35, 1.1); p.wrist('L', 0.2); p.look(-0.02, 0.06, 0.08); }],
    [0.5, (p) => { p.foot('L', 0.19); p.foot('R', 0.19); p.hips(0, -0.04, 0, 0); p.lean(0.02, -0.02); p.arms(0.18, 0.4, 0.95); p.look(-0.02); }],
    [1, (p) => { p.foot('R', 0.2); p.foot('L', 0.16, 0, 0.02, 0.35); p.hips(-0.075, -0.08, 0, -0.1); p.add('hips', 0, 0, -0.16); p.lean(0.02, -0.02, 0.08, 0.12); p.arm('R', 0.1, 0.58, 0.75); p.arm('L', 0.25, 0.35, 1.1); p.wrist('R', 0.5); p.look(-0.02, -0.06, -0.08); }],
    [1.5, (p) => { p.foot('L', 0.19); p.foot('R', 0.19); p.hips(0, -0.04, 0, 0); p.lean(0.02, -0.02); p.arms(0.18, 0.4, 0.95); p.look(-0.02); }],
  ], { groove: 0.6, hits: 0.9 }),

  // HEEL-TOE — standing on one foot, the other digs its heel in front (1)
  // and taps its toe behind (2); swap the weight and the other foot does it
  // (3, 4). Arms swing opposite the working leg.
  heelToe: seq(4, [
    [0, (p) => { p.foot('L', 0.12); p.foot('R', 0.14, 0, 0.22, -0.55); p.hips(0.06, -0.07, 0.02, -0.1); p.lean(-0.04, -0.05, -0.1); p.arm('L', 0.45, 0.25, 1.3); p.arm('R', -0.25, 0.3, 0.8); p.look(0.18, -0.12); }],
    [0.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0.1, 0.03); p.hips(0.06, -0.03, 0, 0); p.arms(0.15, 0.28, 1.1); p.look(0.08); }],
    [1, (p) => { p.foot('L', 0.12); p.foot('R', 0.12, 0, -0.18, 0.75); p.hips(0.06, -0.1, -0.01, 0.1); p.lean(0.1, 0.06, 0.1); p.arm('R', 0.45, 0.25, 1.3); p.arm('L', -0.25, 0.3, 0.8); p.look(0.12, 0.1); }],
    [1.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0.08, -0.02); p.hips(0.02, -0.03, 0, 0); p.arms(0.15, 0.28, 1.1); p.look(0.06); }],
    [2, (p) => { p.foot('R', 0.12); p.foot('L', 0.14, 0, 0.22, -0.55); p.hips(-0.06, -0.07, 0.02, 0.1); p.lean(-0.04, -0.05, 0.1); p.arm('R', 0.45, 0.25, 1.3); p.arm('L', -0.25, 0.3, 0.8); p.look(0.18, 0.12); }],
    [2.5, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0.1, 0.03); p.hips(-0.06, -0.03, 0, 0); p.arms(0.15, 0.28, 1.1); p.look(0.08); }],
    [3, (p) => { p.foot('R', 0.12); p.foot('L', 0.12, 0, -0.18, 0.75); p.hips(-0.06, -0.1, -0.01, -0.1); p.lean(0.1, 0.06, -0.1); p.arm('L', 0.45, 0.25, 1.3); p.arm('R', -0.25, 0.3, 0.8); p.look(0.12, -0.1); }],
    [3.5, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0.08, -0.02); p.hips(-0.02, -0.03, 0, 0); p.arms(0.15, 0.28, 1.1); p.look(0.06); }],
  ], { groove: 0.6, hits: 0.8 }),

  // CROSS-STEP — the house crossover in place: the right foot crosses in
  // front (1) and steps back out wide (2), the left crosses (3) and steps
  // out (4). The pelvis turns into each cross, the chest stays square, the
  // arms swing across and open.
  crossStep: seq(4, [
    [0, (p) => { p.footX('R', 0.04, 0, 0.1); p.footX('L', 0.17, 0, -0.02, 0.3); p.hips(0.06, -0.1, 0.03, 0.26); p.lean(0.05, 0.02, -0.16, -0.05); p.arm('R', 0.65, -0.05, 1.2, -0.3); p.arm('L', -0.3, 0.45, 0.8); p.look(0.06, -0.15); }],
    [0.5, (p) => { p.footX('R', -0.06, 0.11, 0.06); p.footX('L', 0.17); p.hips(0.08, -0.03, 0.02, 0.1); p.arms(0.25, 0.35, 1.0); }],
    [1, (p) => { p.footX('R', -0.21); p.footX('L', 0.17); p.hips(-0.03, -0.13, 0, 0); p.lean(0.06, 0.05); p.arms(0.2, 0.75, 0.6); p.shrug(0.08); p.look(0.1); }],
    [1.5, (p) => { p.footX('L', 0.06, 0.11, 0.06); p.footX('R', -0.21); p.hips(-0.08, -0.03, 0.02, -0.1); p.arms(0.25, 0.35, 1.0); }],
    [2, (p) => { p.footX('L', -0.04, 0, 0.1); p.footX('R', -0.17, 0, -0.02, 0.3); p.hips(-0.06, -0.1, 0.03, -0.26); p.lean(0.05, 0.02, 0.16, 0.05); p.arm('L', 0.65, -0.05, 1.2, -0.3); p.arm('R', -0.3, 0.45, 0.8); p.look(0.06, 0.15); }],
    [2.5, (p) => { p.footX('L', 0.06, 0.11, 0.06); p.footX('R', -0.17); p.hips(-0.08, -0.03, 0.02, -0.1); p.arms(0.25, 0.35, 1.0); }],
    [3, (p) => { p.footX('L', 0.21); p.footX('R', -0.17); p.hips(0.03, -0.13, 0, 0); p.lean(0.06, 0.05); p.arms(0.2, 0.75, 0.6); p.shrug(0.08); p.look(0.1); }],
    [3.5, (p) => { p.footX('R', -0.06, 0.11, 0.06); p.footX('L', 0.21); p.hips(0.08, -0.03, 0.02, 0.1); p.arms(0.25, 0.35, 1.0); }],
  ], { groove: 0.6, hits: 0.9 }),

  // ── Intermediate ──────────────────────────────────────────────────
  // CHARLESTON (hip-hop) — step forward (1), kick the other foot through
  // (2), step it back (3), tap the first foot behind (4); knees and toes
  // twisting in and out, arms swinging opposite the legs.
  charleston: seq(4, [
    [0, (p) => { p.foot('R', 0.1, 0, 0.14, 0, -0.25); p.foot('L', 0.13, 0, -0.06, 0.4, 0.2); p.hips(-0.04, -0.12, 0.07, -0.2); p.lean(0.12, 0.05, 0.15); fists(p, 'L', 0.75, 0.25, 1.1); fists(p, 'R', -0.35, 0.3, 0.9); p.look(0.08, 0.1); }],
    [0.5, (p) => { p.foot('R', 0.1, 0, 0.14, 0, 0.1); p.foot('L', 0.12, 0.13, 0.06); p.hips(-0.03, -0.02, 0.06, 0); p.arms(0.25, 0.3, 1.2); }],
    [1, (p) => { p.foot('R', 0.1, 0, 0.14, 0.15, 0.3); p.foot('L', 0.14, 0.15, 0.38, -0.35); p.hips(-0.05, -0.06, 0.03, 0.15); p.lean(-0.08, -0.06, -0.12); fists(p, 'R', 0.75, 0.25, 1.1); fists(p, 'L', -0.4, 0.3, 0.9); p.look(-0.05, -0.1); }],
    [1.5, (p) => { p.foot('R', 0.1, 0, 0.14, 0, 0); p.foot('L', 0.12, 0.13, 0.0); p.hips(-0.03, -0.02, 0.03, 0); p.arms(0.25, 0.3, 1.2); }],
    [2, (p) => { p.foot('L', 0.13, 0, -0.14, 0, -0.25); p.foot('R', 0.1, 0, 0.1, 0.4, 0.2); p.hips(0.04, -0.12, -0.06, 0.2); p.lean(0.06, 0.04, -0.15); fists(p, 'R', 0.75, 0.25, 1.1); fists(p, 'L', -0.35, 0.3, 0.9); p.look(0.06, -0.1); }],
    [2.5, (p) => { p.foot('L', 0.13, 0, -0.14, 0, 0.1); p.foot('R', 0.11, 0.12, -0.04); p.hips(0.03, -0.02, -0.06, 0); p.arms(0.25, 0.3, 1.2); }],
    [3, (p) => { p.foot('L', 0.13, 0, -0.14, 0.15, 0.3); p.foot('R', 0.12, 0, -0.34, 0.75, -0.2); p.hips(0.04, -0.1, -0.08, -0.15); p.lean(0.18, 0.08, 0.12); fists(p, 'L', 0.75, 0.25, 1.1); fists(p, 'R', -0.4, 0.3, 0.9); p.look(0.12, 0.1); }],
    [3.5, (p) => { p.foot('L', 0.13, 0, -0.14, 0, 0); p.foot('R', 0.11, 0.13, -0.04); p.hips(0.0, -0.02, -0.02, 0); p.arms(0.25, 0.3, 1.2); }],
  ], { groove: 0.65, hits: 0.9 }),

  // KICK-BALL-CHANGE — kick (1), step onto the ball of that foot behind
  // ("and"), change the weight back onto the other foot (2); then the other
  // side (3-and-4). The opposite arm punches forward on each kick.
  kickBallChange: seq(4, [
    [0, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0.17, 0.32, -0.3); p.hips(0.06, -0.05, -0.02, -0.08); p.lean(-0.06, -0.06); fists(p, 'L', 0.9, 0.2, 1.0); fists(p, 'R', -0.3, 0.3, 1.2); p.look(0.02, -0.08); }],
    [0.5, (p) => { p.foot('L', 0.12, 0, 0, 0.3); p.foot('R', 0.12, 0, -0.1, 0.7); p.hips(-0.03, -0.1, -0.03, 0); p.lean(0.08, 0.05); fists(p, 'L', 0.2, 0.3, 1.5); fists(p, 'R', 0.2, 0.3, 1.5); }],
    [1, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0, -0.06, 0.35); p.hips(0.05, -0.13, 0, 0.1); p.lean(0.1, 0.06, 0.1); fists(p, 'L', 0.1, 0.35, 1.6); fists(p, 'R', 0.35, 0.3, 1.6); p.look(0.1, 0.08); }],
    [1.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.12); p.hips(-0.02, -0.04, 0, 0); p.arms(0.25, 0.3, 1.3); }],
    [2, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0.17, 0.32, -0.3); p.hips(-0.06, -0.05, -0.02, 0.08); p.lean(-0.06, -0.06); fists(p, 'R', 0.9, 0.2, 1.0); fists(p, 'L', -0.3, 0.3, 1.2); p.look(0.02, 0.08); }],
    [2.5, (p) => { p.foot('R', 0.12, 0, 0, 0.3); p.foot('L', 0.12, 0, -0.1, 0.7); p.hips(0.03, -0.1, -0.03, 0); p.lean(0.08, 0.05); fists(p, 'L', 0.2, 0.3, 1.5); fists(p, 'R', 0.2, 0.3, 1.5); }],
    [3, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0, -0.06, 0.35); p.hips(-0.05, -0.13, 0, -0.1); p.lean(0.1, 0.06, -0.1); fists(p, 'R', 0.1, 0.35, 1.6); fists(p, 'L', 0.35, 0.3, 1.6); p.look(0.1, -0.08); }],
    [3.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.12); p.hips(0.02, -0.04, 0, 0); p.arms(0.25, 0.3, 1.3); }],
  ], { groove: 0.6, hits: 1 }),

  // TOPROCK (Indian step) — the b-boy's standing rock: the right foot
  // crosses in front (1) and back home (2), the left crosses (3) and back
  // (4). Arms open wide on each cross and close in front on each return,
  // the chest opening up to the opponent.
  toprock: seq(4, [
    [0, (p) => { p.footX('R', 0.05, 0, 0.13); p.footX('L', 0.15, 0, -0.04, 0.35); p.hips(0.035, -0.1, 0.04, 0.3); p.lean(-0.06, -0.08, -0.12); p.arm('L', 0.3, 1.15, 0.45); p.arm('R', 0.6, 0.85, 0.55); p.look(-0.04, 0.22); }],
    [0.5, (p) => { p.footX('R', -0.07, 0.12, 0.07); p.footX('L', 0.15); p.hips(0.06, -0.03, 0.02, 0.12); p.arms(0.55, 0.5, 1.1); }],
    [1, (p) => { p.footX('R', -0.16); p.footX('L', 0.15); p.hips(0, -0.15, 0, 0); p.lean(0.12, 0.08); p.arm('L', 0.95, -0.12, 1.45, -0.4); p.arm('R', 0.85, -0.1, 1.5, -0.4); p.look(0.12); }],
    [1.5, (p) => { p.footX('L', 0.07, 0.12, 0.07); p.footX('R', -0.16); p.hips(-0.06, -0.03, 0.02, -0.12); p.arms(0.55, 0.5, 1.1); }],
    [2, (p) => { p.footX('L', -0.05, 0, 0.13); p.footX('R', -0.15, 0, -0.04, 0.35); p.hips(-0.035, -0.1, 0.04, -0.3); p.lean(-0.06, -0.08, 0.12); p.arm('R', 0.3, 1.15, 0.45); p.arm('L', 0.6, 0.85, 0.55); p.look(-0.04, -0.22); }],
    [2.5, (p) => { p.footX('L', 0.07, 0.12, 0.07); p.footX('R', -0.15); p.hips(-0.06, -0.03, 0.02, -0.12); p.arms(0.55, 0.5, 1.1); }],
    [3, (p) => { p.footX('L', 0.16); p.footX('R', -0.15); p.hips(0, -0.15, 0, 0); p.lean(0.12, 0.08); p.arm('L', 0.95, -0.12, 1.45, -0.4); p.arm('R', 0.85, -0.1, 1.5, -0.4); p.look(0.12); }],
    [3.5, (p) => { p.footX('R', -0.07, 0.12, 0.07); p.footX('L', 0.16); p.hips(0.06, -0.03, 0.02, 0.12); p.arms(0.55, 0.5, 1.1); }],
  ], { groove: 0.7, hits: 1 }),

  // TOPROCK + KICK — complex toprock: cross (1), kick out to the front
  // corner (2), step home and drop (3), the left crosses (4) and rebounds
  // home on the last "and".
  toprockKick: seq(4, [
    [0, (p) => { p.footX('R', 0.05, 0, 0.13); p.footX('L', 0.15, 0, -0.04, 0.35); p.hips(0.035, -0.1, 0.04, 0.3); p.lean(-0.06, -0.08, -0.12); p.arm('L', 0.3, 1.15, 0.45); p.arm('R', 0.6, 0.85, 0.55); p.look(-0.04, 0.22); }],
    [0.5, (p) => { p.footX('R', -0.08, 0.12, 0.1); p.footX('L', 0.15); p.hips(0.06, -0.04, 0.02, 0.1); p.arms(0.6, 0.45, 1.2); }],
    [1, (p) => { p.footX('R', -0.24, 0.2, 0.32, -0.35); p.footX('L', 0.14); p.hips(0.07, -0.06, -0.02, -0.15); p.lean(-0.12, -0.08, 0.1); p.arm('L', 1.1, 0.1, 0.9, -0.3); p.arm('R', -0.25, 1.15, 0.3); p.look(-0.06, -0.25); }],
    [1.5, (p) => { p.footX('R', -0.15, 0.12, 0.07); p.footX('L', 0.14); p.hips(0.05, -0.05, 0, 0); p.arms(0.55, 0.45, 1.2); }],
    [2, (p) => { p.footX('R', -0.17); p.footX('L', 0.15); p.hips(0, -0.18, 0.01, 0); p.lean(0.16, 0.1); p.arm('L', 0.95, -0.12, 1.5, -0.4); p.arm('R', 0.85, -0.1, 1.55, -0.4); p.look(0.15); }],
    [2.5, (p) => { p.footX('L', 0.06, 0.12, 0.07); p.footX('R', -0.17); p.hips(-0.06, -0.04, 0.02, -0.12); p.arms(0.55, 0.5, 1.1); }],
    [3, (p) => { p.footX('L', -0.05, 0, 0.13); p.footX('R', -0.16, 0, -0.04, 0.35); p.hips(-0.035, -0.11, 0.04, -0.3); p.lean(-0.08, -0.1, 0.14); p.arm('R', 0.3, 1.25, 0.4); p.arm('L', 0.6, 0.9, 0.5); p.look(-0.06, -0.22); }],
    [3.5, (p) => { p.footX('L', 0.15, 0.03, 0.02); p.footX('R', -0.16); p.hips(-0.02, -0.06, 0.01, -0.05); p.arms(0.6, 0.45, 1.2); }],
    [3.75, (p) => { p.footX('L', 0.15); p.footX('R', -0.08, 0.1, 0.07); p.hips(0.05, -0.05, 0.02, 0.1); p.arms(0.55, 0.5, 1.1); }],
  ], { groove: 0.7, hits: 1 }),

  // SWIVEL STEP (heel-toe pivots) — travel sideways on swivels: pivot on
  // the heels (toes swing over), then on the balls (heels swing over), two
  // beats left and two back; knees follow the toes, hands snapping.
  swivelStep(p, b, B, s) {
    groove(p, B, s, 0.5);
    const A = amp(s);
    const ph = mod(b, 4), dir = ph < 2 ? 1 : -1, u = ph < 2 ? ph : ph - 2;
    // Half-beat swivels: heel pivot (toes swing toward the travel), then toe
    // pivot (heels swing after them, carrying the feet over a step).
    const k = Math.floor(u * 2), f = smooth(frac(u * 2) / 0.8);
    // The feet only travel during the toe pivots: 4 swivels, 2 of them carry.
    const carried = Math.floor(k / 2) + (k % 2 ? f : 0);          // 0 … 2 steps
    const cx = dir > 0 ? 0.18 * carried : 0.36 - 0.18 * carried;
    const heelPhase = k % 2 === 0;                     // heels planted, toes swing
    const ang = 0.55 * A * (heelPhase ? lerp(-1, 1, f) : lerp(1, -1, f)) * dir;
    const pitch = heelPhase ? -0.25 * Math.sin(Math.PI * f) : 0.4 * Math.sin(Math.PI * f);
    p.footX('L', cx + 0.12, 0, 0, pitch, ang);
    p.footX('R', cx - 0.12, 0, 0, pitch, -ang);
    p.hips(cx, -0.13, 0.01, 0.35 * ang);
    p.lean(0.06, 0.02, -0.2 * ang, -0.04 * dir);
    // Hands low, snapping on the beats, travelling with the hips.
    const snap = Math.exp(-frac(b) * 6);
    p.arm('L', 0.3, 0.4 + 0.15 * snap, 1.0 - 0.3 * snap); p.arm('R', 0.3, 0.4 + 0.15 * snap, 1.0 - 0.3 * snap);
    p.wrist('L', 0.3 * snap); p.wrist('R', 0.3 * snap);
    p.look(0.05, 0.2 * dir);
  },

  // SIDE GLIDE — the popper's slide: one foot flat and gliding, the other
  // on its ball, swapping every beat, so the body floats two beats to the
  // left and two back with the chest held still.
  sideGlide(p, b, B, s) {
    groove(p, B, s, 0.35);
    const ph = mod(b, 4), dir = ph < 2 ? 1 : -1, u = ph < 2 ? ph : ph - 2;
    const cx = dir > 0 ? 0.3 * (u / 2) : 0.3 * (1 - u / 2);
    const beat = Math.floor(u), f = frac(u);
    // On each beat the trailing foot rises onto its ball and the leading foot
    // slides flat; mid-beat they cross over.
    const lead = dir > 0 ? 'L' : 'R', trail = lead === 'L' ? 'R' : 'L';
    const sx = dir > 0 ? 1 : -1;
    const open = beat % 2 === 0 ? smooth(f) : 1 - smooth(f);      // feet apart → together
    p.footX(lead, cx + sx * (0.06 + 0.1 * open), 0, 0, 0.55 * (1 - open));
    p.footX(trail, cx - sx * (0.06 + 0.1 * (1 - open)), 0, 0, 0.55 * open);
    p.hips(cx + sx * 0.02, -0.08, 0, 0.05 * sx);
    p.lean(0.02, -0.04, 0, -0.03 * sx);
    // Arms: a smooth wave carried at chest height, the lead hand reaching.
    p.arm(lead, 0.6, 0.9, 0.5 + 0.2 * Math.sin(Math.PI * u), 0);
    p.arm(trail, 0.9, 0.2, 1.4, -0.4);
    p.look(-0.02, 0.35 * sx);
  },

  // HALF TURN — step across (1), pivot half way round on the balls of the
  // feet (2), hold the look back over the shoulder (3), pivot home (4).
  halfTurn(p, b, B, s) {
    groove(p, B, s, 0.5);
    phased(p, b, B, s, [
      [1, (p, b) => {                                         // step across, load the turn
        const k = smooth(b);
        p.footX('R', -0.12 + 0.12 * k, 0.1 * Math.sin(Math.PI * k), 0.1 * k); p.footX('L', 0.12, 0, 0, 0.2 * k);
        p.hips(0.02 * k, -0.08 - 0.06 * k, 0.03 * k, -0.25 * k);
        p.arm('L', 0.6, 0.8, 1.0); p.arm('R', 0.7, 0.2, 1.4, -0.4); p.look(0, -0.2 * k);
      }],
      [2, (p, b) => {                                         // pivot on the balls
        const t = smooth(b - 1);
        p.foot('L', 0.1, 0, 0, 0.45 * Math.sin(Math.PI * t)); p.foot('R', 0.1, 0, 0.04, 0.45 * Math.sin(Math.PI * t));
        p.hips(0, -0.06, 0, 0); p.root(0, 0, 0, Math.PI * t);
        p.arms(0.6, 0.35, 1.6, -0.3); p.look(-0.05);
      }],
      [3, (p, b) => {                                         // facing away: look back over the shoulder
        p.foot('L', 0.15); p.foot('R', 0.15, 0, 0, 0.3);
        p.hips(0.03, -0.12, 0, 0.2); p.root(0, 0, 0, Math.PI);
        hipHand(p, 'L'); p.arm('R', 0.4, 0.9, 0.6);
        p.lean(0, -0.1, 0.3); p.look(-0.1, 0.85);
      }],
      [Infinity, (p, b) => {                                  // pivot home
        const t = smooth((b - 3) / 0.9);
        p.foot('L', 0.1 + 0.04 * t, 0, 0, 0.45 * Math.sin(Math.PI * t)); p.foot('R', 0.1 + 0.04 * t, 0, 0, 0.45 * Math.sin(Math.PI * t));
        p.hips(0, -0.06 - 0.05 * t, 0, 0); p.root(0, 0, 0, Math.PI * (1 + t));
        p.arms(0.5, 0.4, 1.4, -0.2); p.look(0.05);
      }],
    ]);
  },

  // ARM WAVE + POPS — extended popping: a wave rolls from the left hand,
  // through the shoulders, out of the right hand (1-2), the chest pops twice
  // (3-and), and the body hits a frame on 4. Knees pop on every beat.
  popWave(p, b, B, s) {
    const A = amp(s), ph = mod(b, 4);
    const pop = Math.exp(-frac(b) * 9);                     // muscle hit on each beat
    wideStance(p, 0.19);
    p.hips(0, -0.07 - 0.07 * pop, 0, 0);
    if (ph < 2.75) {
      // Wave position along the arm chain, left hand (0) to right hand (1).
      const u = clamp01(ph / 2), bump = (at) => Math.exp(-Math.pow((at - u) / 0.11, 2));
      const lh = bump(0), lf = bump(0.13), la = bump(0.27), ls = bump(0.4), ch = bump(0.5), rs = bump(0.6), ra = bump(0.73), rf = bump(0.87), rh = bump(1);
      p.arm('L', 0.05, 1.45 + 0.35 * la * A - 0.15 * lf, 0.15 + 0.9 * lf * A, 0);
      p.arm('R', 0.05, 1.45 + 0.35 * ra * A - 0.15 * rf, 0.15 + 0.9 * rf * A, 0);
      p.add('handL', 0, 0, 0.8 * lh); p.add('handR', 0, 0, -0.8 * rh);
      p.shrug(0.3 * ls, 0.3 * rs);
      p.add('chest', -0.15 * ch, 0, 0.2 * (ls - rs));
      p.look(-0.05, 0.4 * (u - 0.5), 0.1 * (ls - rs));
      // Settle the arms in front for the pops.
      const fold = smooth((ph - 2.2) / 0.55);
      if (fold > 0) {
        const L = p.a;
        _t1.set(L);
        p.arm('L', 1.2, 0.3, 1.6, -0.6); p.arm('R', 1.1, 0.3, 1.65, -0.6);
        for (let i = 0; i < L.length; i++) L[i] = _t1[i] + (L[i] - _t1[i]) * fold;
      }
    } else if (ph < 3.5) {
      // Chest pops on 3 and the "and".
      const c = Math.exp(-frac(ph * 2) * 8);
      p.arm('L', 1.2, 0.3, 1.6, -0.6); p.arm('R', 1.1, 0.3, 1.65, -0.6);
      p.add('chest', -0.28 * c * A, 0, 0); p.add('spine', -0.06 * c, 0, 0);
      p.look(-0.12 * c);
    } else {
      // Hit: a frame — one arm up at 90°, the other across, head snapped.
      const k = EASE_SNAP((ph - 3.5) / 0.5);
      p.arm('L', lerp(1.2, 0.0, k), lerp(0.3, 1.57, k), lerp(1.6, 1.57, k), lerp(-0.6, 1.57, k));
      p.arm('R', lerp(1.1, 1.45, k), lerp(0.3, -0.25, k), lerp(1.65, 1.5, k), -0.6);
      p.lean(0, -0.1 * k, 0.2 * k); p.look(0, 0.5 * k);
    }
  },

  // ISOLATION STEP — step-touch footwork with the chest sliding against it
  // and the head ticking on the 8ths, hands framing the chest.
  isoStep(p, b, B, s) {
    evalPart(p, 'twoStep', b, B, s);
    const A = amp(s);
    const e8 = Math.floor(mod(b, 4) * 2);                    // which 8th
    const slide = [1, 0, -1, 0, 1, 0, -1, 0][e8], tick = [0.3, -0.3][e8 % 2];
    const f = smooth(frac(b * 2) / 0.35);
    const prev = [0, 1, 0, -1, 0, 1, 0, -1][e8];
    const cs = lerp(prev, slide, f);
    p.add('chest', 0, 0.12 * cs, -0.2 * cs * A);
    p.add('spine', 0, 0, 0.1 * cs);
    p.set('head', 0.04, tick * 0.6 * smooth(frac(b * 2) / 0.3), -0.15 * cs);
    p.arm('L', 0.9, 0.35 + 0.1 * cs, 1.7, -0.5); p.arm('R', 0.9, 0.35 - 0.1 * cs, 1.7, -0.5);
  },

  // JAZZ SQUARE — cross in front (1), step back (2), step to the side (3),
  // step forward to close (4): a box traced on the floor, jazz hands and a
  // shoulder lead on each corner.
  jazzSquare: seq(4, [
    [0, (p) => { p.footX('R', 0.04, 0, 0.1); p.footX('L', 0.14, 0, -0.03, 0.3); p.hips(0.05, -0.1, 0.03, 0.25); p.lean(0.02, -0.06, -0.15, -0.06); p.arm('L', 0.4, 0.9, 0.3); p.arm('R', 0.7, 0.4, 0.6); p.wrist('L', -0.3); p.look(-0.05, -0.15, -0.06); }],
    [0.5, (p) => { p.footX('R', 0.03, 0, 0.1); p.footX('L', 0.13, 0.12, -0.08); p.hips(0.03, -0.04, 0.02, 0.12); p.arms(0.45, 0.6, 0.6); }],
    [1, (p) => { p.footX('L', 0.14, 0, -0.16); p.footX('R', 0.03, 0, 0.1, 0.35); p.hips(0.07, -0.12, -0.05, 0.05); p.lean(0.06, 0.04, 0.1); p.arm('R', 0.4, 0.9, 0.3); p.arm('L', 0.7, 0.4, 0.6); p.look(0.05, 0.1); }],
    [1.5, (p) => { p.footX('L', 0.14, 0, -0.16); p.footX('R', -0.08, 0.12, -0.02); p.hips(0.06, -0.05, -0.05, 0); p.arms(0.45, 0.6, 0.6); }],
    [2, (p) => { p.footX('R', -0.2); p.footX('L', 0.14, 0, -0.16, 0.3); p.hips(-0.05, -0.12, -0.04, -0.15); p.lean(0.02, -0.06, 0.15, 0.08); p.arms(0.3, 1.25, 0.25); p.wrist('L', 0.3); p.wrist('R', 0.3); p.look(-0.05, -0.2); }],
    [2.5, (p) => { p.footX('R', -0.2); p.footX('L', 0.12, 0.12, -0.05); p.hips(-0.06, -0.05, -0.02, -0.05); p.arms(0.45, 0.8, 0.6); }],
    [3, (p) => { p.footX('L', 0.14, 0, 0.02); p.footX('R', -0.2, 0, 0, 0.3); p.hips(0.03, -0.13, 0.01, 0.15); p.lean(0.08, 0.06, -0.1, -0.05); p.arm('L', 0.9, 0.3, 1.3, -0.4); p.arm('R', 0.2, 0.9, 0.4); p.look(0.08, 0.15); }],
    [3.5, (p) => { p.footX('L', 0.14); p.footX('R', -0.06, 0.12, 0.05); p.hips(0.05, -0.05, 0.02, 0.12); p.arms(0.45, 0.6, 0.6); }],
  ], { groove: 0.6, hits: 0.9 }),

  // BUS STOP (disco line dance) — three steps back with a clap on 4
  // (1-and-2 … ), three forward with a clap on the next 4: back-back-
  // together-clap, forward-forward-together-clap, compressed into a bar.
  busStop: seq(4, [
    [0, (p) => { p.foot('R', 0.12, 0, -0.12); p.foot('L', 0.12, 0, 0.0, 0.3); p.hips(-0.04, -0.1, -0.05, -0.1); p.lean(0.04, -0.04, 0.1); p.arm('L', 0.6, 0.3, 1.0); p.arm('R', -0.2, 0.35, 0.8); p.look(0.02, 0.1); }],
    [0.5, (p) => { p.foot('R', 0.12, 0, -0.12); p.foot('L', 0.12, 0.12, -0.14); p.hips(-0.02, -0.04, -0.09, 0); p.arms(0.3, 0.3, 1.1); }],
    [1, (p) => { p.foot('L', 0.12, 0, -0.24); p.foot('R', 0.12, 0, -0.12, 0.3); p.hips(0.04, -0.12, -0.17, 0.1); p.lean(0.04, -0.04, -0.1); p.arm('R', 0.6, 0.3, 1.0); p.arm('L', -0.2, 0.35, 0.8); p.look(0.02, -0.1); }],
    [1.5, (p) => { p.foot('L', 0.12, 0, -0.24); p.foot('R', 0.12, 0.1, -0.22); p.hips(0.01, -0.04, -0.21, 0); p.arms(0.6, 0.35, 0.9); }],
    [2, (p) => { p.foot('L', 0.12, 0, -0.24); p.foot('R', 0.12, 0, -0.24); p.hips(0, -0.14, -0.24, 0); p.lean(0.08, 0.05); clapFront(p, 0.05); p.look(0.1); }],
    [2.5, (p) => { p.foot('R', 0.12, 0, -0.24); p.foot('L', 0.12, 0.12, -0.12); p.hips(-0.02, -0.04, -0.2, 0); p.arms(0.4, 0.4, 0.9); }],
    [3, (p) => { p.foot('L', 0.12, 0, -0.02); p.foot('R', 0.12, 0, -0.18, 0.4); p.hips(0.04, -0.1, -0.08, 0.1); p.lean(-0.04, -0.06, -0.12); p.arm('R', 0.5, 2.3, 0.05); hipHand(p, 'L'); p.look(-0.2, -0.3); }],
    [3.5, (p) => { p.foot('L', 0.12, 0, 0.0); p.foot('R', 0.12, 0.12, -0.08); p.hips(0.02, -0.04, -0.04, 0); p.arms(0.5, 0.5, 0.8); }],
  ], { groove: 0.6, hits: 0.9 }),

  // DISCO ROLLS — the Hustle's rolling arms on 1-2 and the up / down point
  // on 3-4, now over a travelling side touch (step right, touch, step
  // left, touch), hips popping into each point.
  discoRolls(p, b, B, s) {
    evalPart(p, 'discoPoint', b, B, s);
    const ph = mod(b, 4), A = amp(s);
    const r = TAU * b * 1.5;
    const roll = 1 - win(ph, 1.75, 4, 0.25);
    const upK = win(ph, 1.7, 3.1, 0.38), dnK = win(ph, 2.8, 4, 0.36);
    const a = p.a;
    _t1.set(a);
    p.arm('L', 0.8 + 0.45 * Math.sin(r), 0.15, 1.15 + 0.45 * Math.cos(r), -1.0);
    p.arm('R', 0.8 - 0.45 * Math.sin(r), 0.15, 1.15 - 0.45 * Math.cos(r), -1.0);
    _t2.set(a);
    a.set(_t1);
    p.arm('R', 0.5 * upK + 0.95 * dnK, 2.5 * A * upK - 0.3 * dnK + 0.2, 0.05);
    hipHand(p, 'L');
    for (let i = 0; i < a.length; i++) a[i] = _t2[i] + (a[i] - _t2[i]) * (1 - roll);
    p.look(-0.25 * upK + 0.25 * dnK, -0.35 * upK + 0.2 * dnK);
  },

  // ── Advanced: low footwork ────────────────────────────────────────
  // FOOTWORK (b-boy floor rock, standing-up version) — a deep crouch with
  // one hand skimming the floor while the feet step around under the body
  // (in, out, behind, out) on every beat — the shapes of six-step without
  // leaving the feet.
  footwork(p, b, B, s) {
    const ph = mod(b, 4), k = Math.floor(ph), f = frac(ph);
    // Foot positions for each beat (L / R: x out, z fwd), weight alternating.
    const P = [
      [[0.24, 0.12], [0.06, -0.18]],    // 1: R steps behind
      [[0.28, -0.02], [0.3, 0.02]],     // 2: out wide
      [[0.06, -0.18], [0.24, 0.12]],    // 3: L steps behind
      [[0.3, 0.02], [0.28, -0.02]],     // 4: out wide
    ];
    const cur = P[k], nxt = P[(k + 1) % 4];
    const t = smooth(clamp01((f - 0.45) / 0.55));            // feet move on the second half of each beat
    for (let i = 0; i < 2; i++) {
      const side = i ? 'R' : 'L';
      const moving = Math.abs(nxt[i][0] - cur[i][0]) + Math.abs(nxt[i][1] - cur[i][1]) > 0.01;
      const lift = moving ? 0.09 * Math.sin(Math.PI * t) : 0;
      p.foot(side, lerp(cur[i][0], nxt[i][0], t), lift, lerp(cur[i][1], nxt[i][1], t), 0.45);
    }
    const sway = Math.sin(Math.PI * ph);
    p.hips(0.06 * sway, -0.46 + 0.03 * Math.cos(TAU * ph), -0.02, 0.25 * sway);
    p.lean(0.55, 0.15, -0.25 * sway);
    // Support hand reaching to the floor on the weighted side, the other up.
    const hand = sway > 0 ? 'L' : 'R', free = hand === 'L' ? 'R' : 'L';
    p.arm(hand, 1.05, 0.25, 0.1);
    p.arm(free, 0.6, 0.9, 1.0);
    p.look(-0.45, 0.25 * sway);
  },

  // ── Finishers (advanced combination → freeze) ─────────────────────
  // B-boy: toprock cross (1), drop down (2) — lands crouched for the freeze.
  finBboy(p, b, B, s) {
    phased(p, b, B, s, [
      [0.9, (p, b, B, s) => evalPart(p, 'toprock', b, B, s)],
      [Infinity, (p, b) => {
        // Go down: the left foot stays planted, the right steps back (lifted
        // through the "and") and the hips sink between them.
        const t = smooth((b - 0.9) / 1.0), st = smooth((b - 0.9) / 0.6);
        p.footX('L', 0.15, 0, 0); p.footX('R', -0.16 - 0.08 * st, 0.12 * Math.sin(Math.PI * st), -0.28 * st, 0.6 * st);
        p.hips(0, -0.15 - 0.33 * t, -0.03 * t, 0.2 * t);
        p.lean(0.12 + 0.25 * t, 0.1);
        p.arm('R', 0.6 + 0.4 * t, 0.4 + 0.6 * t, 1.2 - 1.1 * t); p.arm('L', 0.9, 0.3, 1.5, -0.3);
        p.look(0.1 + 0.15 * t, 0.2 * t);
      }],
    ], 0.2);
  },
  // Disco: one clean pirouette on the ball of the foot (1), step out and
  // sink (2) — into the point.
  finDisco(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const t = smooth(b);
        p.foot('L', 0.02, 0, 0, 0.55); p.foot('R', 0.06, 0.12 * Math.sin(Math.PI * t), 0.06, 0.6);
        p.hips(0, -0.02, 0, 0); p.root(0, 0, 0, TAU * t);
        p.arm('R', 0.5, 2.0, 0.6); p.arm('L', 0.6, 0.5, 1.8);
        p.look(-0.1);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 1) / 0.8);
        p.foot('L', 0.12); p.foot('R', 0.12 + 0.14 * k, 0, 0.08 * k, 0.4 * k);
        p.hips(0.08 * k, -0.06 - 0.06 * k, 0, -0.15 * k);
        p.arm('R', 0.9 - 0.5 * k, 0.6 + 1.6 * k, 0.6 - 0.5 * k); hipHand(p, 'L');
        p.lean(-0.05 * k, -0.15 * k, 0.1 * k, 0.15 * k); p.look(-0.2 * k, -0.3 * k);
      }],
    ], 0.2);
  },
  // Jazz / diva: chaîné-style pivot (1), plié and hip pop (2).
  finDiva(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const t = smooth(b);
        p.foot('L', 0.03, 0, 0, 0.7); p.foot('R', 0.06, 0, 0.04, 0.7);
        p.hips(0, 0.0, 0, 0); p.root(0, 0, 0, TAU * t);
        p.arm('L', 0.9, 0.6, 1.4, -0.4); p.arm('R', 0.9, 0.6, 1.4, -0.4);
        p.look(-0.1);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 1) / 0.8);
        p.foot('L', 0.1 - 0.03 * k, 0, 0.04 * k, 0.5 * k); p.foot('R', 0.12, 0, -0.02, 0.2 * k);
        p.hips(-0.06 * k, -0.04 - 0.07 * k, 0, 0.35 * k);
        p.arm('L', 0.9 + 1.5 * k, 0.6 + 0.3 * k, 1.4 + 0.7 * k, -0.4); p.arm('R', 0.9 - 1.0 * k, 0.6 - 0.35 * k, 1.4 + 1.2 * k, -0.4 - 0.8 * k);
        p.lean(-0.05 * k, -0.18 * k, -0.2 * k, -0.12 * k); p.look(-0.2 * k, -0.45 * k, -0.18 * k);
      }],
    ], 0.2);
  },

  // ── Freezes (held, breathing, a tremble of effort) ────────────────
  // Chair freeze: tipped ~60° onto the right hand (arm straight down to the
  // floor under the shoulder), knees tucked with both feet off the floor,
  // the free arm thrown up and out, the head held up against the tilt.
  freezeChair(p, b, B, s) {
    const hit = Math.exp(-b * 6), breathe = Math.sin(TAU * b * 0.5);
    const R = 1.02 + 0.04 * hit + 0.004 * Math.sin(B * 40);   // a tremble of effort
    p.hips(0, -0.45 - 0.02 * hit, 0, 0.12);
    p.tumble(0.1, R);
    p.foot('L', -0.14, 0.26, 0.3, 0.3); p.foot('R', 0.3, 0.33, 0.24, 0.3);
    p.arm('R', 0.08, R - 0.02, 0.3);
    p.arm('L', 0.35, 1.75, 0.35);
    p.add('chest', 0.02 * breathe);
    p.look(-0.12, 0.3, -0.6);
  },
  // The Travolta: hip popped, right hand pointing to the sky, left on the
  // hip, chin up — held.
  freezeTravolta(p, b, B, s) {
    const hit = Math.exp(-b * 6), breathe = Math.sin(TAU * b * 0.5);
    p.foot('L', 0.12); p.foot('R', 0.28, 0, 0.1, 0.5);
    p.hips(0.1, -0.13 - 0.03 * hit, 0, -0.22);
    p.arm('R', 0.4, 2.55 + 0.05 * hit, 0.03); hipHand(p, 'L');
    p.lean(-0.08, -0.2 + 0.01 * breathe, 0.15, 0.2); p.look(-0.35, -0.4);
  },
  // Diva: knees together, hand in the hair, purse on the shoulder, looking
  // back — held.
  freezeDiva(p, b, B, s) {
    const hit = Math.exp(-b * 6), breathe = Math.sin(TAU * b * 0.5);
    p.foot('L', 0.07, 0, 0.04, 0.5); p.foot('R', 0.09, 0, -0.02, 0.2);
    p.hips(-0.06, -0.1 - 0.02 * hit, 0, 0.35);
    p.arm('L', 2.4, 0.9, 2.1, -0.4);
    p.arm('R', -0.1, 0.25, 2.6, -1.2);
    p.lean(-0.05, -0.18 + 0.01 * breathe, -0.2, -0.12); p.look(-0.2, -0.45, -0.18);
  },

  // Standing b-boy freeze: weight on the back foot, front foot turned out,
  // leaning back, arms folded, chin up — the generic finisher pose.
  freezeStance(p, b, B, s) {
    const hit = Math.exp(-b * 6), breathe = Math.sin(TAU * b * 0.5);
    p.foot('L', 0.15, 0, 0.14, 0, 0.35); p.foot('R', 0.17, 0, -0.1, 0.2);
    p.hips(-0.04, -0.1 - 0.03 * hit, -0.03, 0.25);
    crossArms(p);
    p.lean(-0.1, -0.15 + 0.01 * breathe, 0.1); p.look(-0.22, 0.3, 0.08);
  },

  // ── Miss / recovery ───────────────────────────────────────────────
  // MISSED INPUT — a stutter, not a fall (the original's miss: "your dancer
  // stutters, unable to perform his move"): a knee buckles and the chest
  // dips with the arms flaring for balance, a catch step forward on the
  // "and", then straighten up with a shake of the head.
  missStumble(p, b, B, s) {
    const buckle = Math.sin(Math.PI * clamp01(b / 0.7)) * (b < 0.7 ? 1 : 0);
    const step = smooth(clamp01((b - 0.25) / 0.45));                      // catch step lands ~0.7
    const up = smooth(clamp01((b - 0.7) / 0.5));
    p.footX('L', 0.13, 0.1 * Math.sin(Math.PI * step), 0.16 * step); p.footX('R', -0.14, 0, -0.02, 0.15 * buckle);
    p.hips(0.03 * buckle, -0.07 - 0.11 * buckle - 0.03 * (1 - up), 0.05 * step, -0.12 * buckle);
    p.add('hips', 0, 0, -0.1 * buckle);
    p.lean(0.28 * buckle + 0.06 * (1 - up), 0.1 * buckle, 0.1 * buckle, -0.12 * buckle);
    p.arm('L', 0.35, 0.3 + 0.75 * buckle, 0.5); p.arm('R', 0.2, 0.3 + 0.95 * buckle, 0.4);
    const shake = Math.sin(TAU * (b - 0.7) * 2.5) * up * (1 - smooth((b - 1.1) / 0.3));
    p.look(0.25 * buckle + 0.08, 0.3 * shake, 0.06 * buckle);
    groove(p, B, s, 0.2 + 0.4 * up);
  },
  // RECOVERY — shake it off and find the pocket again: a head shake and
  // loose-arm shake over small bounces, settling back into the groove.
  missRecover(p, b, B, s) {
    groove(p, B, s, 0.6 + 0.4 * smooth(b / 2));
    const fade = 1 - smooth((b - 1) / 1.2);
    const sh = Math.sin(TAU * b * 3) * fade;
    p.foot('L', 0.15); p.foot('R', 0.15, 0, 0, 0.2 * Math.max(0, Math.sin(Math.PI * b)));
    p.hips(0.03 * Math.sin(Math.PI * b), -0.07, 0, 0.08 * Math.sin(Math.PI * b));
    p.arm('L', 0.15, 0.3 + 0.1 * sh, 0.6 + 0.3 * sh); p.arm('R', 0.15, 0.3 - 0.1 * sh, 0.6 - 0.3 * sh);
    p.wrist('L', 0.4 * sh); p.wrist('R', -0.4 * sh);
    p.lean(0.05, 0.02); p.look(0.05, 0.25 * sh * fade, 0);
  },
};

// The popping 'snap' ease (hold, then pop onto the beat).
function EASE_SNAP(f) { return kit.EASE.snap(f); }
// Evaluate another move into `p` as the base of this one (its groove
// request is kept for the caller).
function evalPart(p, name, b, B, s) { kit.evalMove(name, b, B, s, p); }
const _t1 = new Float32Array(POSE_SIZE), _t2 = new Float32Array(POSE_SIZE);

export const VOCAB = moves;

registerMoves(moves, {
  labels: {
    kneeBounce: 'KNEE BOUNCE', shoulderBounce: 'SHOULDER BOUNCE', shoulderRoll: 'SHOULDER ROLLS', hipSway: 'HIP SWAY',
    heelToe: 'HEEL-TOE', crossStep: 'CROSS STEP', charleston: 'CHARLESTON', kickBallChange: 'KICK BALL CHANGE',
    toprock: 'TOPROCK', toprockKick: 'TOPROCK KICK', swivelStep: 'SWIVEL STEP', sideGlide: 'SIDE GLIDE', halfTurn: 'HALF TURN',
    popWave: 'WAVE & POP', isoStep: 'ISOLATIONS', jazzSquare: 'JAZZ SQUARE', busStop: 'BUS STOP', discoRolls: 'DISCO ROLLS',
    footwork: 'FOOTWORK', freezeStance: 'FREEZE', finBboy: 'GO DOWN', finDisco: 'PIROUETTE', finDiva: 'PIVOT', freezeChair: 'CHAIR FREEZE',
    freezeTravolta: 'THE TRAVOLTA', freezeDiva: 'DIVA FREEZE', missStumble: 'MISS', missRecover: 'RECOVER',
    twoStep: 'TWO STEP', bounceRock: 'UPROCK', kickStep: 'KICK STEP', hustle: 'THE HUSTLE', discoStrut: 'DISCO STRUT',
    elvisSwivel: 'ELVIS SWIVEL', sassyStrut: 'CATWALK STRUT', shimmyBounce: 'SHIMMY', purseGroove: 'PURSE GROOVE',
  },
  expressions: {
    kneeBounce: 'smile', shoulderBounce: 'grin', shoulderRoll: 'smirk', hipSway: 'smirk', heelToe: 'smile', crossStep: 'grin',
    charleston: 'grin', kickBallChange: 'grin', toprock: 'focus', toprockKick: 'shout', swivelStep: 'smirk', sideGlide: 'focus',
    halfTurn: 'smirk', popWave: 'focus', isoStep: 'focus', jazzSquare: 'smile', busStop: 'grin', discoRolls: 'smirk',
    footwork: 'focus', finBboy: 'focus', finDisco: 'grin', finDiva: 'smirk', freezeChair: 'focus', freezeTravolta: 'smirk',
    freezeDiva: 'wink', missStumble: 'o', missRecover: 'smile',
  },
  hits: {
    shoulderRoll: 0.7, swivelStep: 0.8, sideGlide: 0.3, halfTurn: 0.5, popWave: 0.4, isoStep: 0.5, discoRolls: 1,
    footwork: 0.3, finBboy: 0.6, finDisco: 0.4, finDiva: 0.4, freezeChair: 0, freezeTravolta: 0.1, freezeDiva: 0.1, freezeStance: 0.1,
    missStumble: 0.1, missRecover: 0.5,
  },
  fnGroove: { popWave: 0.15, footwork: 0, finBboy: 0.3, finDisco: 0.2, finDiva: 0.2, freezeChair: 0, freezeTravolta: 0, freezeDiva: 0, freezeStance: 0 },
  stiff: { popWave: 1.6, isoStep: 1.4, freezeChair: 1.3, freezeTravolta: 1.3, freezeDiva: 1.3, freezeStance: 1.3 },
});
