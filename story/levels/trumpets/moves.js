// ZOOT's dances — 1930s swing: Lindy triple steps and finger snaps, the
// boogie back, the Charleston and its kicks, the Suzie Q, Bee's Knees,
// tap shuffles and stomps, the Shim Sham, the Shorty George, a Lindy
// swing-out with an invisible partner, a Nicholas-Brothers jump split,
// Cab Calloway's hi-de-ho — and that gold trumpet (right hand) blown at
// the crowd, at the sky, and at you. Moves played facing the foe (intro,
// taunt) are mirrored by the controller, so those hold the horn in the LEFT.

import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased } = kit;

const lerpA = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
// Accent envelope for a hit landing on each beat of x: a quick rise just
// before it, then a decay (continuous, no pop).
const hit = (x, k = 6) => { const f = frac(x + 0.1); return f < 0.1 ? smooth(f / 0.1) : Math.exp(-(f - 0.1) * k); };
function arm(p, side, a, b = null, t = 0) {
  const x = b == null ? a : lerpA(a, b, t);
  p.arm(side, x[0], x[1], x[2], x[3]);
}
const other = (s) => (s === 'L' ? 'R' : 'L');
const sgn = (s) => (s === 'L' ? 1 : -1);

// Trumpet arm poses, solved against the horn's attachment in boss.js so
// the mouthpiece meets the lips: [fwd, out, elbow, twist], wrist [x, z].
const PLAY = [1.64, -0.17, 1.0, -0.8], PLAY_W = [-0.09, 0.4];
const SKY = [1.98, -0.19, 0.81, -0.79], SKY_W = [-0.15, 0.45];
const VALVE = [1.45, 0.02, 1.25, -1.05];                     // other hand cradling the valves
const DOWN = [0.1, 0.18, 0.35, 0];
const SNAP = [0.55, 0.55, 1.95, -0.7];                       // hand up by the shoulder, snapping
const JAZZ = [0.85, 1.2, 0.55, 0.1];                         // jazz hand out to the side
const HIP = [-0.25, 0.62, 1.65, -1.45];

// Blow the horn: k = 0 … 1 into the playing pose, sky = 0 … 1 tilts it up
// to the rafters (leaning back with it). T = the trumpet hand.
function blow(p, k, sky = 0, T = 'R') {
  const O = other(T);
  arm(p, T, DOWN, lerpA(PLAY, SKY, sky), k);
  p.wrist(T, lerp(PLAY_W[0], SKY_W[0], sky) * k, lerp(PLAY_W[1], SKY_W[1], sky) * k);
  arm(p, O, DOWN, VALVE, k);
  p.lean(-0.22 * sky * k, -0.25 * sky * k);
  p.look((-0.05 - 0.35 * sky) * k);
}

// Hands clasped in front, pumping up (+1) and down (-1) with the steps.
function suzieArms(p, u) {
  arm(p, 'L', [1.0 + 0.18 * u, -0.3, 1.05 - 0.2 * u, -1.0]); arm(p, 'R', [1.0 + 0.18 * u, -0.3, 1.05 - 0.2 * u, -1.0]);
}

export const moves = {
  // ════════ Base routines ════════════════════════════════════════════
  // Lindy triple steps in place — left-right-left, right-left-right — knees
  // soft, snapping on the 2 and 4 with the horn swinging low.
  zootTripleSnap: seq(4, [0, 2].flatMap((t0) => {
    const S = t0 === 0 ? 'L' : 'R', O = other(S), g = sgn(S);
    return [
      [t0, (p) => { p.footX(S, 0.2 * g); p.footX(O, -0.12 * g, 0, 0, 0.4); p.hips(0.1 * g, -0.14, 0, 0.18 * g); arm(p, 'L', S === 'L' ? [0.3, 0.4, 1.0, -0.4] : SNAP); arm(p, 'R', S === 'L' ? SNAP : [0.3, 0.4, 1.0, -0.4]); p.lean(0.05, 0.04, 0.1 * g); p.look(0.05, 0.2 * g); }],
      [t0 + 0.5, (p) => { p.footX(S, 0.2 * g); p.footX(O, -0.06 * g, 0.12, 0); p.hips(0.03 * g, -0.06); arm(p, 'L', [0.35, 0.45, 1.2, -0.5]); arm(p, 'R', [0.35, 0.45, 1.2, -0.5]); }],
      [t0 + 1, (p) => { p.footX(S, 0.14 * g, 0, 0, 0.3); p.footX(O, -0.14 * g); p.hips(-0.08 * g, -0.15, 0, -0.12 * g); arm(p, S, [0.45, 0.6, 2.0, -0.6]); arm(p, O, [0.6, 0.55, 1.9, -0.7]); p.wrist(S, 0.5); p.wrist(O, 0.5); p.shrug(0.1); p.lean(0.06, 0.05, -0.1 * g); p.look(0.08, -0.2 * g); }],
      [t0 + 1.5, (p) => { p.footX(S, 0.06 * g, 0.12, 0.02); p.footX(O, -0.16 * g); p.hips(-0.06 * g, -0.06); arm(p, 'L', [0.35, 0.45, 1.2, -0.5]); arm(p, 'R', [0.35, 0.45, 1.2, -0.5]); }],
    ];
  }), { groove: 0.8, hits: 0.9 }),

  // Boogie back / boogie forward: slouch back onto the heels with the hips
  // out and the arms pulling taffy, then strut forward, shoulders rolling.
  zootBoogieBack: seq(4, [
    [0, (p) => { p.foot('L', 0.15, 0, -0.12, -0.3); p.foot('R', 0.15, 0, 0.06, 0.4); p.hips(0.04, -0.14, -0.1, 0.2); p.lean(-0.12, -0.08, 0.15); arm(p, 'L', [0.9, 0.35, 0.4, -0.3]); arm(p, 'R', [0.7, 0.4, 0.6, -0.3]); p.look(-0.1, 0.25); }],
    [1, (p) => { p.foot('R', 0.15, 0, -0.12, -0.3); p.foot('L', 0.15, 0, 0.0, 0.4); p.hips(-0.04, -0.16, -0.12, -0.2); p.lean(-0.14, -0.1, -0.15); arm(p, 'R', [0.95, 0.35, 0.35, -0.3]); arm(p, 'L', [0.65, 0.4, 0.7, -0.3]); p.look(-0.1, -0.25); p.shrug(0.12, -0.05); }],
    [2, (p) => { p.foot('L', 0.14, 0, 0.12); p.foot('R', 0.14, 0, -0.04, 0.5); p.hips(0.05, -0.12, 0.06, 0.25); p.lean(0.1, 0.02, 0.2); arm(p, 'L', [-0.45, 0.35, 0.5, 0]); arm(p, 'R', [0.8, 0.3, 1.4, -0.6]); p.look(-0.12, 0.2); }],
    [3, (p) => { p.foot('R', 0.14, 0, 0.12); p.foot('L', 0.14, 0, -0.02, 0.5); p.hips(-0.05, -0.12, 0.05, -0.25); p.lean(0.12, 0.03, -0.2); arm(p, 'R', [-0.45, 0.35, 0.5, 0]); arm(p, 'L', [0.8, 0.3, 1.4, -0.6]); p.look(-0.12, -0.2); p.shrug(-0.05, 0.12); }],
  ], { groove: 0.8, hits: 0.8 }),

  // Charleston basic: step forward, kick forward, step back, touch back —
  // knees swivelling in and out, arms swinging long and loose.
  zootCharleston: seq(4, [
    [0, (p) => { p.foot('R', 0.12, 0, 0.16); p.foot('L', 0.16, 0, -0.04, 0.4); p.hips(-0.05, -0.15, 0.08, -0.25); arm(p, 'L', [0.9, 0.3, 0.2, 0]); arm(p, 'R', [-0.6, 0.3, 0.2, 0]); p.lean(0.12, 0.05, 0.1); p.look(0.05, 0.15); }],
    [1, (p) => { p.foot('R', 0.14, 0, 0.14, 0.5); p.foot('L', 0.1, 0.32, 0.42, 0.6); p.hips(-0.06, -0.04, 0.08, 0.2); arm(p, 'R', [1.1, 0.3, 0.2, 0]); arm(p, 'L', [-0.7, 0.3, 0.2, 0]); p.lean(-0.06, -0.06, -0.15); p.look(-0.05, -0.15); }],
    [2, (p) => { p.foot('L', 0.12, 0, -0.14); p.foot('R', 0.16, 0, 0.04, 0.4); p.hips(0.05, -0.15, -0.06, 0.25); arm(p, 'R', [0.9, 0.3, 0.2, 0]); arm(p, 'L', [-0.6, 0.3, 0.2, 0]); p.lean(0.1, 0.05, -0.1); p.look(0.05, -0.15); }],
    [3, (p) => { p.foot('L', 0.14, 0, -0.12, 0.5); p.foot('R', 0.12, 0.16, -0.36, 0.9); p.hips(0.06, -0.06, -0.06, -0.2); arm(p, 'L', [1.1, 0.3, 0.2, 0]); arm(p, 'R', [-0.7, 0.3, 0.2, 0]); p.lean(0.18, 0.1, 0.15); p.look(0.1, 0.15); }],
  ], { groove: 0.75, hits: 0.9 }),

  // Suzie Q: travelling sideways on cross-steps — the crossing foot toes
  // in over the front, the other opens out on its heel — two to the left,
  // two back, hands clasped in front and pumping.
  zootSuzieQ: seq(4, [
    [0, (p) => { p.footX('R', 0.1, 0, 0.08, 0.5); p.footX('L', 0.0); p.hips(0.05, -0.16, 0, 0.3); suzieArms(p, 1); p.lean(0.12, 0.04, 0.15); p.look(0.05, 0.3); }],
    [0.5, (p) => { p.footX('R', 0.1); p.footX('L', 0.2, 0, 0.02, -0.25); p.hips(0.15, -0.1, 0, 0.05); suzieArms(p, -1); p.lean(0.1, 0, 0, -0.05); p.look(0.02, 0.35); }],
    [1, (p) => { p.footX('R', 0.3, 0, 0.08, 0.5); p.footX('L', 0.2); p.hips(0.25, -0.16, 0, 0.3); suzieArms(p, 1); p.lean(0.12, 0.04, 0.15); p.look(0.05, 0.3); }],
    [1.5, (p) => { p.footX('L', 0.18, 0, 0.08, 0.5); p.footX('R', 0.3); p.hips(0.24, -0.12, 0, -0.25); suzieArms(p, -1); p.lean(0.1, 0, -0.1); p.look(0.02, -0.1); }],
    [2, (p) => { p.footX('L', 0.18); p.footX('R', 0.04, 0, 0.02, -0.25); p.hips(0.11, -0.16, 0, -0.05); suzieArms(p, 1); p.lean(0.12, 0.04, -0.12, 0.05); p.look(0.05, -0.3); }],
    [2.5, (p) => { p.footX('L', -0.06, 0, 0.08, 0.5); p.footX('R', 0.04); p.hips(-0.01, -0.12, 0, -0.3); suzieArms(p, -1); p.lean(0.1, 0, -0.15); p.look(0.02, -0.35); }],
    [3, (p) => { p.footX('L', -0.06); p.footX('R', -0.18, 0, 0.02, -0.25); p.hips(-0.12, -0.16, 0, -0.05); suzieArms(p, 1); p.lean(0.12, 0.04, -0.1, 0.05); p.look(0.05, -0.3); }],
    [3.5, (p) => { p.footX('L', 0.0); p.footX('R', -0.16); p.hips(-0.08, -0.1, 0, 0.15); suzieArms(p, -1); p.lean(0.1, 0, 0.1); p.look(0.02, 0.1); }],
  ], { groove: 0.75, hits: 0.9 }),

  // Phrase accent (count 3): freeze — weight on the right, left knee popped
  // in, jazz hand fanned by the face, horn held out low.
  zootAccent(p, b, B, s) {
    groove(p, B, s, 0.5);
    p.foot('R', 0.16); p.foot('L', 0.06, 0, 0.06, 0.8);
    p.hips(-0.06, -0.14, 0, -0.25); p.add('hips', 0, 0, 0.1);
    arm(p, 'L', [1.2, 0.85, 2.05, -0.3]); p.wrist('L', 0.4 * Math.sin(TAU * b * 4));
    arm(p, 'R', [0.35, 0.75, 0.25, 0]);
    p.lean(0.02, -0.1, 0.15, -0.06); p.look(-0.12, 0.35, -0.12);
  },

  // ════════ Tier 1 ═══════════════════════════════════════════════════
  // Jazz hands: step-touch side to side with both hands thrown out wide and
  // shimmering, the horn hand too.
  zootJazzHands(p, b, B, s) {
    groove(p, B, s, 0.8);
    const side = Math.cos(Math.PI * b);
    const tap = Math.pow(Math.sin(Math.PI * frac(b)), 2);
    p.footX('L', 0.18, 0.07 * tap * smooth(-2 * side), 0, 0.3 * (1 - side));
    p.footX('R', -0.18, 0.07 * tap * smooth(2 * side), 0, 0.3 * (1 + side));
    p.hips(0.09 * side, -0.14, 0, 0.18 * side);
    const open = 0.5 + 0.5 * Math.cos(TAU * b), shim = Math.sin(TAU * b * 5);
    arm(p, 'L', lerpA([0.7, 0.4, 1.6, -0.5], JAZZ, open)); arm(p, 'R', lerpA([0.7, 0.4, 1.6, -0.5], JAZZ, open));
    p.wrist('L', 0.45 * shim); p.wrist('R', -0.45 * shim);
    p.shrug(0.1 * shim, -0.1 * shim);
    p.lean(0.04, -0.08, 0.15 * side); p.look(-0.1, 0.25 * side);
  },

  // Trumpet blast: horn up to the lips on 1, a stab on every beat, rocking
  // back further each time until it's pointed at the rafters on 4.
  zootTrumpetBlast(p, b, B, s) {
    groove(p, B, s, 0.6);
    const k = smooth(b / 0.6), sky = smooth((b - 1.6) / 1.4), stab = hit(b, 6);
    p.foot('L', 0.16, 0, 0.08); p.foot('R', 0.16, 0, -0.08, 0.3 + 0.2 * stab);
    p.hips(0, -0.12 - 0.04 * stab, -0.03 * sky, 0.15);
    blow(p, k, sky);
    p.lean(0.06 * stab * (1 - sky), 0.08 * stab);
  },

  // ════════ Tier 2 ═══════════════════════════════════════════════════
  // Bee's Knees: knees flapping open and shut, the hands crossing back and
  // forth over them — the Charleston classic.
  zootBeesKnees(p, b, B, s) {
    groove(p, B, s, 0.6);
    const f = 0.5 - 0.5 * Math.cos(TAU * b);          // 0 knees together (on the beat) … 1 open
    p.hips(0, -0.36, 0.04);
    const cross = Math.cos(Math.PI * b);              // hands swap knees every beat
    arm(p, 'L', [0.62, -0.45 + 0.8 * f, 0.25, -0.4 * cross]); arm(p, 'R', [0.62, -0.45 + 0.8 * f, 0.25, 0.4 * cross]);
    p.lean(0.32, 0.12); p.look(-0.25, 0.2 * cross);
    // Swivelling on the balls of the feet opens and shuts the knees.
    p.foot('L', 0.07 + 0.22 * f, 0, 0.05, 0.6); p.foot('R', 0.07 + 0.22 * f, 0, 0.05, 0.6);
  },

  // Tap: shuffle-ball-change, shuffle-ball-change, stomp-stomp, heel drop
  // with the arms loose and the horn swinging.
  zootTapStomp: seq(4, [
    [0, (p) => { p.foot('L', 0.13); p.foot('R', 0.13, 0.08, 0.18, 0.5); p.hips(0.04, -0.13); arm(p, 'L', [0.4, 0.5, 1.0, -0.4]); arm(p, 'R', [0.3, 0.45, 0.6, -0.2]); p.lean(0.1); p.look(0.15, 0.1); }],
    [0.5, (p) => { p.foot('L', 0.13); p.foot('R', 0.13, 0.08, -0.12, 0.6); p.hips(0.04, -0.1); arm(p, 'L', [0.3, 0.5, 1.2, -0.4]); arm(p, 'R', [0.4, 0.45, 0.8, -0.2]); p.look(0.18); }],
    [1, (p) => { p.foot('R', 0.12, 0, -0.06, 0.7); p.foot('L', 0.13, 0.04); p.hips(-0.04, -0.15); arm(p, 'R', [0.5, 0.5, 1.0, -0.4]); arm(p, 'L', [0.3, 0.45, 0.6, -0.2]); p.lean(0.12); p.look(0.15, -0.1); }],
    [1.5, (p) => { p.foot('R', 0.13); p.foot('L', 0.13, 0.08, 0.16, 0.5); p.hips(-0.03, -0.1); }],
    [2, (p) => { p.foot('R', 0.13); p.foot('L', 0.18, 0, 0.04); p.hips(0.02, -0.22); arm(p, 'L', [0.2, 0.9, 0.3, 0]); arm(p, 'R', [0.2, 0.9, 0.3, 0]); p.lean(0.18, 0.08); p.look(0.2); }],
    [2.5, (p) => { p.foot('L', 0.18, 0, 0.04); p.foot('R', 0.18, 0.12, 0.02); p.hips(0.06, -0.08); }],
    [3, (p) => { p.foot('L', 0.18); p.foot('R', 0.18, 0, 0.02); p.hips(0, -0.24); arm(p, 'L', [1.4, 1.0, 0.4, 0]); arm(p, 'R', [1.4, 1.0, 0.4, 0]); p.lean(0.05, -0.1); p.look(-0.1); }],
    [3.5, (p) => { p.foot('L', 0.16, 0, 0, 0.6); p.foot('R', 0.16, 0, 0, 0.6); p.hips(0, -0.06); arm(p, 'L', [0.8, 0.7, 1.0, -0.3]); arm(p, 'R', [0.8, 0.7, 1.0, -0.3]); }],
  ], { groove: 0.6, hits: 1.0 }),

  // ════════ Tier 3 ═══════════════════════════════════════════════════
  // Lindy swing-out with an invisible partner: rock step back, pull her in
  // (both hands), whip round 360° together, and fling her out wide.
  zootSwingOut(p, b, B, s) {
    const rock = win(b, -0.5, 1.1, 0.4), turn = smooth((b - 1.1) / 1.8), out = smooth((b - 2.9) / 0.5);
    const spin = turn;
    groove(p, B, s, 0.6 * (1 - spin * (1 - out)));
    const r = Math.sin(Math.PI * clamp01((b - 1.1) / 1.8));
    const stepPh = Math.sin(TAU * (b - 1.1) * 2) * r;
    p.foot('L', 0.13, 0.07 * Math.max(0, stepPh) ** 2, -0.16 * rock + 0.04 * r);
    p.foot('R', 0.13, 0.07 * Math.max(0, -stepPh) ** 2, 0.06 * rock - 0.04 * r, 0.3 * rock);
    p.hips(0, -0.14 - 0.06 * rock, -0.08 * rock + 0.04 * r, 0.1);
    p.root(0, 0, 0, TAU * spin);
    p.lean(-0.1 * rock + 0.12 * r, 0, 0, -0.12 * r);
    arm(p, 'L', [0.5, 0.35, 1.0, -0.5], [1.0, 0.25, 0.5, -0.4], rock + r * (1 - out));
    arm(p, 'R', [0.4, 0.45, 1.0, -0.4], [0.9, -0.1, 1.2, -1.0], r * (1 - out));
    if (out > 0) { arm(p, 'L', [1.0, 0.25, 0.5, -0.4], [1.2, 1.6, 0.05, 0], out); arm(p, 'R', [0.9, -0.1, 1.2, -1.0], HIP, out); }
    p.look(-0.05 - 0.15 * out, 0.4 * out, 0);
  },

  // Scat strut: a high-stepping cakewalk forward and back, leaning way
  // back, knees up to the waist, snapping and nodding the scat.
  zootScatStrut: seq(4, [0, 1, 2, 3].map((t) => {
    const S = t % 2 === 0 ? 'L' : 'R', O = other(S), z = [0.0, 0.12, 0.12, 0.0][t];
    return [t, (p) => {
      p.foot(S, 0.2, 0.5, z + 0.2, 0.7); p.foot(O, 0.12, 0, z - 0.05, 0.3);
      p.hips(0.03 * sgn(O), -0.02, z, 0.15 * sgn(S));
      p.lean(-0.3, -0.15, 0.1 * sgn(S));
      arm(p, S, [-0.5, 0.4, 0.4, 0]); arm(p, O, [0.6, 0.5, 2.0, -0.6]); p.wrist(O, 0.5);
      p.look(-0.2, 0.3 * sgn(S), 0.15 * sgn(S));
    }, 'out'];
  }).flatMap((k, i) => [k, [i + 0.5, (p) => {
    const S = i % 2 === 0 ? 'L' : 'R', O = other(S), z = [0.06, 0.12, 0.06, 0.0][i];
    p.foot(S, 0.12, 0.06, z + 0.06, 0.4); p.foot(O, 0.12, 0.1, z, 0.5);
    p.hips(0, -0.14, z); p.lean(-0.22, -0.1);
    arm(p, S, [0.1, 0.4, 0.6, 0]); arm(p, O, [0.3, 0.45, 1.2, -0.4]);
    p.look(-0.1);
  }]]), { groove: 0.5, hits: 0.8 }),

  // ════════ Tier 4 ═══════════════════════════════════════════════════
  // Nicholas-Brothers splits: a leap, slam down into a full split, horn to
  // the lips for a blast down there, and bounce straight back up.
  zootNicholasSplits(p, b, B, s) {
    phased(p, b, B, s, [
      [0.7, (p, b) => { const k = smooth(b / 0.6); p.foot('L', 0.15); p.foot('R', 0.15); p.hips(0, -0.06 - 0.22 * k); arm(p, 'L', DOWN, [-0.6, 0.4, 0.2, 0], k); arm(p, 'R', DOWN, [-0.6, 0.4, 0.2, 0], k); p.lean(0.2 * k); }],
      [1.4, (p, b) => { const t = (b - 0.7) / 0.7, air = Math.sin(Math.PI * t * 0.85); const a2 = Math.sin(Math.PI * t); p.hips(0, -0.28 + 0.6 * air - 0.84 * smooth(t), 0); p.foot('L', 0.15 + 0.71 * smooth(t), 0.35 * a2, 0.0, 0.3); p.foot('R', 0.15 + 0.71 * smooth(t), 0.35 * a2, 0.0, 0.3); arm(p, 'L', [-0.6, 0.4, 0.2, 0], [0.3, 2.6, 0.1, 0], smooth(t)); arm(p, 'R', [-0.6, 0.4, 0.2, 0], [0.3, 2.6, 0.1, 0], smooth(t)); p.look(-0.3 * air); }],
      [3.1, (p, b) => { const k = smooth((b - 1.4) / 0.5), st = hit(b, 6); p.foot('L', 0.86, 0, 0, 0.3); p.foot('R', 0.86, 0, 0, 0.3); p.hips(0, -0.84 + 0.02 * st, 0); arm(p, 'L', [0.3, 2.6, 0.1, 0], VALVE, k); arm(p, 'R', [0.3, 2.6, 0.1, 0], PLAY, k); p.wrist('R', PLAY_W[0] * k, PLAY_W[1] * k); p.lean(-0.12, -0.08 * st); p.look(-0.1); }],
      [Infinity, (p, b, B, s) => { groove(p, B, s, 0.5); const t = smooth((b - 3.05) / 0.8); p.foot('L', 0.86 - 0.7 * t, 0, 0, 0.3); p.foot('R', 0.86 - 0.7 * t, 0, 0, 0.3); p.hips(0, -0.84 + 0.72 * t + 0.12 * Math.sin(Math.PI * t), 0); arm(p, 'L', VALVE, [0.3, 2.55, 0.1, 0], t); arm(p, 'R', PLAY, [0.3, 2.55, 0.1, 0], t); p.wrist('R', PLAY_W[0] * (1 - t), PLAY_W[1] * (1 - t)); p.look(-0.3 * t); }],
    ], 0.25);
  },

  // Zoot spin: a double heel-pivot spin with the knee up and the horn held
  // high, landing in a wide "ta-da" lean.
  zootSpin(p, b, B, s) {
    phased(p, b, B, s, [
      [0.8, (p, b, B, s) => { groove(p, B, s, 0.5); const k = smooth(b / 0.7); p.foot('L', 0.12); p.foot('R', 0.18, 0, -0.1 * k, 0.4 * k); p.hips(0, -0.1 - 0.12 * k, 0, -0.35 * k); arm(p, 'R', DOWN, [0.9, 0.8, 1.0, -0.4], k); arm(p, 'L', DOWN, [0.6, -0.2, 1.4, -1.0], k); p.lean(0.1 * k); }],
      [2.6, (p, b) => { const t = smooth((b - 0.8) / 1.8); p.foot('L', 0.0, 0, 0.02, 0.5); p.foot('R', 0.03, 0.42, 0.12, 0.5); p.hips(0, -0.04, 0); p.root(0, 0, 0, -0.35 + TAU * 2 * t); arm(p, 'R', [2.8, 0.25, 0.15, 0]); arm(p, 'L', [0.8, 0.4, 1.8, -0.8]); p.lean(0, -0.1); p.look(-0.2); }],
      [Infinity, (p, b, B, s) => { groove(p, B, s, 0.5); const k = smooth((b - 2.6) / 0.35); p.foot('L', 0.26); p.foot('R', 0.26, 0, 0, 0.3 * k); p.hips(0.08 * k, -0.2, 0, 0.1); arm(p, 'R', [2.8, 0.25, 0.15, 0], [1.3, 1.55, 0.05, 0], k); arm(p, 'L', [0.8, 0.4, 1.8, -0.8], JAZZ, k); p.wrist('L', 0.4 * Math.sin(TAU * b * 4) * k); p.lean(-0.05, -0.15 * k, 0, -0.15 * k); p.look(-0.2 * k, 0.3 * k); }],
    ], 0.2);
  },

  // ════════ ★ Signature moves ════════════════════════════════════════
  // Shim Sham: shuffle-step, shuffle-step, push-slide across, cross-over,
  // and a "freeze" with jazz hands up by the face.
  zootShimSham: seq(4, [
    [0, (p) => { p.foot('L', 0.13); p.foot('R', 0.14, 0.07, 0.16, 0.5); p.hips(0.05, -0.15); arm(p, 'L', [0.35, 0.5, 1.2, -0.4]); arm(p, 'R', [0.3, 0.5, 1.0, -0.3]); p.lean(0.12); p.look(0.15, 0.15); }],
    [0.5, (p) => { p.foot('L', 0.13); p.foot('R', 0.14, 0.07, -0.08, 0.6); p.hips(0.05, -0.1); }],
    [1, (p) => { p.foot('R', 0.15); p.foot('L', 0.14, 0.07, 0.16, 0.5); p.hips(-0.05, -0.16); arm(p, 'R', [0.35, 0.5, 1.2, -0.4]); arm(p, 'L', [0.3, 0.5, 1.0, -0.3]); p.lean(0.12); p.look(0.15, -0.15); }],
    [1.5, (p) => { p.foot('R', 0.15); p.foot('L', 0.14, 0.07, -0.08, 0.6); p.hips(-0.05, -0.1); }],
    [2, (p) => { p.footX('L', 0.32); p.footX('R', 0.02, 0, 0, 0.6); p.hips(0.18, -0.2, 0, 0.3); arm(p, 'L', [0.6, 1.1, 0.3, 0]); arm(p, 'R', [0.9, -0.2, 1.0, -0.8]); p.lean(0.05, 0, 0.15, -0.12); p.look(0, 0.4); }],
    [2.5, (p) => { p.footX('L', 0.3); p.footX('R', 0.42, 0.08, 0.1, 0.4); p.hips(0.3, -0.12, 0, 0.2); arm(p, 'L', [0.4, 0.8, 0.8, -0.3]); arm(p, 'R', [0.4, 0.8, 0.8, -0.3]); }],
    [3, (p) => { p.footX('R', 0.44, 0, 0.12); p.footX('L', 0.24, 0, -0.02, 0.7); p.hips(0.36, -0.22, 0.04, -0.3); arm(p, 'L', [1.25, 0.85, 2.1, -0.3]); arm(p, 'R', [1.25, 0.85, 2.1, -0.3]); p.wrist('L', 0.5); p.wrist('R', -0.5); p.lean(-0.04, -0.15); p.look(-0.15, -0.2); }, 'snap'],
    [3.5, (p) => { p.footX('R', 0.14, 0.1, 0.04); p.footX('L', 0.16); p.hips(0.14, -0.1); arm(p, 'L', [0.5, 0.6, 1.4, -0.4]); arm(p, 'R', [0.5, 0.6, 1.4, -0.4]); }],
  ], { groove: 0.6, hits: 1.0 }),

  // Shorty George: way down low, knees together and knocking side to
  // side, walking it, straight arms swinging down at the floor.
  zootShortyGeorge(p, b, B, s) {
    groove(p, B, s, 0.6);
    const sw = Math.sin(Math.PI * b);
    p.foot('L', 0.1, 0.07 * Math.max(0, sw) ** 2, 0.04, 0.5 + 0.3 * Math.max(0, sw));
    p.foot('R', 0.1, 0.07 * Math.max(0, -sw) ** 2, 0.0, 0.5 + 0.3 * Math.max(0, -sw));
    p.hips(0.12 * sw, -0.42, 0.02, 0.3 * sw);
    p.add('hips', 0, 0, -0.12 * sw);
    arm(p, 'L', [0.35 - 0.35 * sw, -0.2, 0.05, 0]); arm(p, 'R', [0.35 + 0.35 * sw, -0.2, 0.05, 0]);
    p.lean(0.32, 0.1, -0.2 * sw, 0.15 * sw); p.look(-0.2, 0.25 * sw, 0.1 * sw);
  },

  // Hi-De-Ho (the encore): Cab Calloway — arms flailing overhead in turn,
  // knees wobbling, a big jump with both arms up, the horn to the sky.
  zootHiDeHo(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b, B, s) => {
        groove(p, B, s, 0.8);
        const w = Math.sin(TAU * b), al = Math.sin(Math.PI * b);
        p.foot('L', 0.2, 0, 0, 0.4 + 0.3 * w); p.foot('R', 0.2, 0, 0, 0.4 - 0.3 * w);
        p.hips(0.05 * w, -0.18, 0, 0.2 * w);
        arm(p, 'L', [2.4 + 0.4 * al, 0.6 + 0.5 * al, 0.6 - 0.4 * al, 0]); arm(p, 'R', [2.4 - 0.4 * al, 0.6 - 0.5 * al, 0.6 + 0.4 * al, 0]);
        p.wrist('L', 0.5 * w); p.wrist('R', -0.5 * w);
        p.lean(-0.08, -0.15, 0.2 * al); p.look(-0.3, 0.2 * al);
      }],
      [3, (p, b) => {
        const t = b - 2, air = Math.sin(Math.PI * clamp01((t - 0.15) / 0.8)), crouch = win(t, -0.2, 0.3, 0.15);
        p.foot('L', 0.16, 0.4 * air, -0.1 * air, 0.7 * air); p.foot('R', 0.16, 0.4 * air, -0.1 * air, 0.7 * air);
        p.hips(0, -0.06 - 0.16 * crouch + 0.36 * air, 0);
        arm(p, 'L', [2.7, 0.9, 0.1, 0]); arm(p, 'R', [2.7, 0.9, 0.1, 0]);
        p.lean(-0.1 * air, -0.15 * air); p.look(-0.35 * air);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.5);
        p.foot('L', 0.18); p.foot('R', 0.18, 0, -0.08, 0.3);
        p.hips(0, -0.14, 0, 0.1);
        blow(p, 1, 1);
        arm(p, 'L', [2.7, 0.9, 0.1, 0], VALVE, k); arm(p, 'R', [2.7, 0.9, 0.1, 0], SKY, k);
      }],
    ], 0.25);
  },

  // ★★ SOLO — Hot solo: a screaming blast at the rafters, knee pumping,
  // a spin with the horn held high, and down into the splits for the last
  // high note.
  zootHotSolo(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b) => {
        const pump = 0.5 - 0.5 * Math.cos(TAU * b * 2), k = smooth(b / 0.5);
        p.foot('L', 0.15, 0, 0.04); p.foot('R', 0.13, 0.3 * pump * k, 0.15 * pump, 0.6);
        p.hips(0.03, -0.1 + 0.03 * pump, -0.02);
        blow(p, k, 0.5 + 0.5 * k);
      }],
      [2.6, (p, b) => {
        const t = smooth((b - 1.5) / 1.1);
        p.foot('L', 0.0, 0, 0.02, 0.5); p.foot('R', 0.03, 0.4, 0.12, 0.5);
        p.hips(0, -0.04, 0); p.root(0, 0, 0, TAU * t);
        arm(p, 'R', [2.85, 0.2, 0.15, 0]); arm(p, 'L', [2.6, 0.6, 0.3, 0]);
        p.lean(0, -0.15); p.look(-0.3);
      }],
      [Infinity, (p, b) => {
        const t = smooth((b - 2.6) / 0.5), st = hit(b, 5) * t;
        p.foot('L', 0.15 + 0.71 * t, 0, 0, 0.3); p.foot('R', 0.15 + 0.71 * t, 0, 0, 0.3);
        p.hips(0, -0.04 - 0.8 * t, 0);
        blow(p, t, 1);
        p.lean(0.04 * st, 0.04 * st);
      }],
    ], 0.25);
  },

  // ════════ Battle actions ═══════════════════════════════════════════
  // Intro (faceFoe, mirrored: horn in the LEFT): tips the fedora at you,
  // blows a little fanfare in your face, then the finger wag — uh-uh.
  zootIntro(p, b, B, s) {
    phased(p, b, B, s, [
      [1.2, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth(b / 0.4), tip = win(b, -0.05, 1.05, 0.5);
        p.foot('L', 0.14, 0, 0.1 * k); p.foot('R', 0.16, 0, -0.06 * k, 0.4 * k);
        p.hips(0.02, -0.1, 0, 0.5 * k);
        arm(p, 'R', DOWN, [2.45, 0.55, 2.15, -0.5], tip);
        arm(p, 'L', DOWN, [0.3, 0.6, 0.4, 0], k);
        p.lean(0.12 * tip, 0.1 * tip); p.look(0.15 * tip, 0.3 * k, -0.1 * tip);
      }],
      [2.6, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 0.95) / 0.7), stab = hit(b * 2, 6) * k;
        p.foot('L', 0.14, 0, 0.14); p.foot('R', 0.16, 0, -0.08, 0.3 + 0.2 * stab);
        p.hips(0, -0.12, 0.03, 0.5);
        blow(p, k, 0.15, 'L');
        p.lean(0.08 * stab, 0.06 * stab);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 2.6) / 0.5), wag = Math.sin(TAU * b * 3);
        p.foot('L', 0.14, 0, 0.12); p.foot('R', 0.17, 0, -0.06, 0.3);
        p.hips(0.03, -0.1, 0, 0.45);
        arm(p, 'L', VALVE, HIP, k); p.wrist('L', PLAY_W[0] * (1 - k), PLAY_W[1] * (1 - k));
        arm(p, 'R', DOWN, [1.3, 0.35, 1.7, -0.3 + 0.45 * wag], k);
        p.lean(-0.04, -0.12 * k); p.look(-0.05, 0.3, 0.12 * wag * k);
      }],
    ], 0.25);
  },

  // Taunt (faceFoe, mirrored: horn in the LEFT): leans right into your face
  // and BLASTS — three stabs that rock him back, then one long wail.
  zootTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    const k = smooth(b / 0.6), stab = hit(b, 5) * smooth((b - 0.6) / 0.3) * (1 - smooth((b - 2.9) / 0.3));
    const wail = smooth((b - 2.9) / 0.5);
    p.foot('L', 0.13, 0, 0.22 * k); p.foot('R', 0.15, 0, -0.12 * k, 0.4);
    p.hips(0, -0.14 + 0.03 * stab, 0.06 * k - 0.05 * stab, 0.55 * k);
    blow(p, k, 0.1 + 0.35 * wail, 'L');
    p.lean(0.2 * k * (1 - wail) - 0.18 * stab, 0.1 * k - 0.12 * stab);
    p.root(0.006 * wail * Math.sin(B * 45), 0, 0);
  },

  // Victory: a tip of the hat, a heel-click jump, and a hot victory riff.
  zootVictory(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const tip = win(b, 0.1, 1.5, 0.35);
        p.foot('L', 0.14, 0, 0.06); p.foot('R', 0.16, 0, -0.1, 0.4);
        p.hips(0, -0.12 - 0.06 * tip, -0.02);
        arm(p, 'L', DOWN, [2.45, 0.55, 2.15, -0.5], tip); arm(p, 'R', DOWN, [0.4, 1.0, 0.3, 0], tip);
        p.lean(0.3 * tip, 0.12 * tip); p.look(0.25 * tip);
      }],
      [3, (p, b) => {
        const t = (b - 1.5) / 1.5, air = Math.sin(Math.PI * clamp01((t - 0.15) / 0.7)), crouch = win(t, -0.2, 0.3, 0.15);
        const click = Math.sin(Math.PI * clamp01((t - 0.25) / 0.5));
        p.foot('L', 0.16 - 0.14 * click, 0.25 * air, 0, 0.6 * air); p.foot('R', 0.16 - 0.14 * click, 0.25 * air, 0, 0.6 * air);
        p.hips(0.25 * air, -0.06 - 0.2 * crouch + 0.42 * air, 0, 0);
        p.tumble(0, -0.35 * click);
        arm(p, 'L', [2.6, 0.9, 0.1, 0]); arm(p, 'R', [2.6, 0.9, 0.1, 0]);
        p.look(-0.3 * air);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.7);
        const sw = Math.sin(Math.PI * (b - 3)), stab = hit(b, 5);
        p.foot('L', 0.17, 0, 0.04, 0.3 + 0.3 * sw); p.foot('R', 0.17, 0, -0.04, 0.3 - 0.3 * sw);
        p.hips(0.05 * sw, -0.12, 0, 0.2 * sw);
        blow(p, 1, 0.4 + 0.3 * (0.5 + 0.5 * Math.sin(Math.PI * (b - 3) / 2)));
        p.lean(0.05 * stab, 0.05 * stab, 0.1 * sw);
      }],
    ], 0.3);
  },
};

export const moveMeta = {
  labels: {
    zootJazzHands: 'JAZZ HANDS', zootTrumpetBlast: 'TRUMPET BLAST',
    zootBeesKnees: "BEE'S KNEES", zootTapStomp: 'TAP STOMP',
    zootSwingOut: 'SWING OUT', zootScatStrut: 'SCAT STRUT',
    zootNicholasSplits: 'NICHOLAS SPLITS', zootSpin: 'ZOOT SPIN',
    zootShimSham: 'SHIM SHAM', zootShortyGeorge: 'SHORTY GEORGE', zootHiDeHo: 'HI-DE-HO!',
    zootHotSolo: 'HOT SOLO', zootTaunt: 'BRASS BLAST!', zootVictory: 'HEEL CLICK',
  },
  expressions: {
    zootTripleSnap: 'smirk', zootBoogieBack: 'grin', zootCharleston: 'joy', zootSuzieQ: 'grin', zootAccent: 'wink',
    zootJazzHands: 'joy', zootTrumpetBlast: 'o', zootBeesKnees: 'grin', zootTapStomp: 'focus',
    zootSwingOut: 'smirk', zootScatStrut: 'shout', zootNicholasSplits: 'o', zootSpin: 'grin',
    zootShimSham: 'smirk', zootShortyGeorge: 'grin', zootHiDeHo: 'shout', zootHotSolo: 'o',
    zootIntro: 'smirk', zootTaunt: 'o', zootVictory: 'joy',
  },
  hits: {
    zootSuzieQ: 0.9, zootAccent: 0.4, zootJazzHands: 0.8, zootTrumpetBlast: 0.6, zootBeesKnees: 0.7,
    zootSwingOut: 0.4, zootNicholasSplits: 0.1, zootSpin: 0.2, zootShortyGeorge: 0.9, zootHiDeHo: 0.5,
    zootHotSolo: 0.2, zootIntro: 0.5, zootTaunt: 0.4, zootVictory: 0.3,
  },
  fnGroove: { zootNicholasSplits: 0, zootSpin: 0, zootHiDeHo: 0, zootHotSolo: 0, zootSwingOut: 0, zootVictory: 0, zootIntro: 0.2 },
  stiff: { zootTapStomp: 1.3, zootShimSham: 1.3 },
};

export default { moves, moveMeta };
