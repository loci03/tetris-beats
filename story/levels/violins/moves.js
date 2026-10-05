// VIOLETTA's dances — classical ballet (balancé, tendus, chassés, bourrées,
// pas de chat, pirouettes, arabesque penché, grand jeté, fouettés) with the
// fire of a dramatic violinist: tango walks and boleos, a flamenco
// zapateado, and "air violin" virtuoso passages where the violin flips up
// under her chin and the bow saws on the beat. Violin in the LEFT hand, bow
// in the RIGHT (see boss.js); moves played facing the foe (intro, taunt) are
// mirrored by the controller, so those are written with the props swapped.

import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased } = kit;

// ── Ballet arm positions: [fwd, out, elbow, twist] ───────────────────
const ARMS = {
  bas: [0.32, 0.1, 0.55, -0.9],          // bras bas — low, rounded
  first: [1.2, 0.08, 1.0, -1.1],          // rounded in front of the navel
  second: [0.35, 1.38, 0.28, -0.4],       // open to the side
  demi: [0.15, 0.72, 0.25, -0.3],         // demi-seconde
  fifth: [2.7, 0.32, 0.85, -1.1],         // couronne over the head
  high: [2.95, 0.3, 0.1, 0],              // straight up
  allonge: [1.7, 0.22, 0.06, 0],          // reaching forward
  sideHigh: [1.9, 1.5, 0.08, 0],          // up and out, a long diagonal
  back: [-0.35, 1.15, 0.12, 0],           // arabesque back arm
  vee: [2.55, 1.05, 0.05, 0],             // victory V
};
const A = (n) => (typeof n === 'string' ? ARMS[n] : n);
function arm(p, side, a, b = null, t = 0) {
  const x = A(a), y = b == null ? x : A(b);
  p.arm(side, lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t), lerp(x[3], y[3], t));
}
const other = (s) => (s === 'L' ? 'R' : 'L');
const sgn = (s) => (s === 'L' ? 1 : -1);

// ── Air violin ───────────────────────────────────────────────────────
// The violin hand comes up beside the jaw and the wrist flips, swinging the
// violin (which hangs off the hand) up onto the shoulder; the head tilts
// onto the chinrest. `s` = bow position, -1 at the frog … +1 at the tip.
// V = the violin hand ('L' normally, 'R' in mirrored faceFoe moves).
const FLIP = 2.75, FIDDLE = [1.35, 0.6, 1.75, -0.6];
function fiddle(p, V, s, k = 1) {
  const W = other(V), g = sgn(V), u = 0.5 + 0.5 * s;
  arm(p, V, 'bas', FIDDLE, k);
  p.wrist(V, FLIP * k, 0.35 * k);
  arm(p, W, 'bas', [lerp(0.95, 0.9, u), lerp(0.15, 1.0, u), lerp(1.7, 0.5, u), lerp(-1.3, -0.4, u)], k);
  p.wrist(W, -1.8 * u * k, -0.4 * u * k);
  p.look(0.08 * k, 0.18 * g * k, -0.3 * g * k);
}
// Bow strokes landing on the beat: frog on even beats, tip on odd ones.
const stroke = (b, rate = 1) => -Math.cos(Math.PI * b * rate);

// ── Footwork helpers (pointe = pitch ~1.1, raises the hips with it) ──
const POINTE = 1.1;

export const moves = {
  // ════════ Base routines (always-on dancing) ════════════════════════
  // Balancé: step out into a plié, rise behind onto demi-pointe on the
  // "and", down again — left then right — while the arms pass through
  // first, fifth and second in one continuous port de bras.
  violettaBalance: seq(4, [0, 2].flatMap((t0) => {
    const S = t0 === 0 ? 'L' : 'R', O = other(S), g = sgn(S);
    return [
      [t0, (p) => { p.footX(S, 0.28 * g); p.footX(O, -0.26 * g, 0, 0, 0.35); p.hips(0.1 * g, -0.13, 0, 0.15 * g); arm(p, S, 'second'); arm(p, O, 'first'); p.lean(0.02, -0.04, 0.12 * g, -0.1 * g); p.look(0.1, 0.3 * g, -0.1 * g); }],
      [t0 + 0.5, (p) => { p.footX(S, 0.28 * g, 0, 0, 0.6); p.footX(O, 0.1 * g, 0, -0.12, 0.75); p.hips(0.17 * g, 0.0, -0.03, 0.1 * g); arm(p, S, [0.55, 1.5, 0.25, -0.4]); arm(p, O, [1.75, 0.18, 0.95, -1.1]); p.look(-0.06, 0.2 * g); }],
      [t0 + 1, (p) => { p.footX(S, 0.28 * g); p.footX(O, 0.12 * g, 0.1, -0.14, 0.9); p.hips(0.24 * g, -0.12, 0, 0.1 * g); arm(p, S, 'second'); arm(p, O, 'fifth'); p.lean(0.03, -0.08, 0.1 * g, -0.15 * g); p.look(-0.1, 0.25 * g, -0.12 * g); }],
      [t0 + 1.5, (p) => { p.footX(S, 0.26 * g, 0, 0, 0.3); p.footX(O, -0.08 * g, 0.08, 0, 0.6); p.hips(0.1 * g, -0.04); arm(p, S, [0.75, 1.0, 0.55, -0.7]); arm(p, O, [1.9, 0.95, 0.55, -0.8]); p.look(0, 0); }],
    ];
  }), { groove: 0.8, hits: 0.4 }),

  // Tendu to the side, close in fifth on relevé with the arms in fifth;
  // other side; then a plié with a cambré back. The tendus slide on purpose.
  violettaPortDeBras: seq(4, [
    [0, (p) => { p.foot('L', 0.05); p.foot('R', 0.44, 0, 0, POINTE); p.hips(0.05, -0.07, 0, -0.1); arm(p, 'L', 'second'); arm(p, 'R', 'second'); p.lean(0, -0.06, -0.1, 0.06); p.look(0.02, -0.28, 0.1); }],
    [1, (p) => { p.foot('L', 0.04, 0, -0.03, POINTE); p.foot('R', 0.03, 0, 0.07, POINTE); p.hips(0, 0.05); arm(p, 'L', 'fifth'); arm(p, 'R', 'fifth'); p.lean(0, -0.08); p.look(-0.16, 0.12); }],
    [2, (p) => { p.foot('R', 0.05); p.foot('L', 0.44, 0, 0, POINTE); p.hips(-0.05, -0.07, 0, 0.1); arm(p, 'L', 'second'); arm(p, 'R', 'second'); p.lean(0, -0.06, 0.1, -0.06); p.look(0.02, 0.28, -0.1); }],
    [3, (p) => { p.foot('L', 0.05, 0, 0.07); p.foot('R', 0.05, 0, -0.03); p.hips(0, -0.17, 0.03); arm(p, 'L', [2.85, 0.55, 0.55, -1.0]); arm(p, 'R', [2.85, 0.55, 0.55, -1.0]); p.lean(-0.2, -0.24); p.look(-0.35); }],
  ], { groove: 0.7, slide: true, hits: 0.35 }),

  // Chassé — temps levé: slide out, spring the feet together in the air,
  // land on one foot with the other at the ankle, hop; and back. Arms sweep
  // up through first into a high diagonal.
  violettaChasse: seq(4, [0, 2].flatMap((t0) => {
    const S = t0 === 0 ? 'L' : 'R', O = other(S), g = sgn(S);
    return [
      [t0, (p) => { p.footX(S, 0.3 * g); p.footX(O, -0.04 * g, 0, -0.04, 0.7); p.hips(0.15 * g, -0.16); arm(p, S, 'demi'); arm(p, O, 'demi'); p.lean(0.06, 0.02, 0.1 * g, -0.06 * g); p.look(0.06, 0.22 * g); }],
      [t0 + 0.5, (p) => { p.footX(S, 0.24 * g, 0.15, 0, 0.9); p.footX(O, 0.12 * g, 0.15, 0, 0.9); p.hips(0.2 * g, 0.12); arm(p, S, [1.25, 1.2, 0.4, -0.6]); arm(p, O, 'first'); p.look(-0.1, 0.12 * g); }],
      [t0 + 1, (p) => { p.footX(S, 0.32 * g); p.footX(O, 0.16 * g, 0.17, -0.07, 0.9); p.hips(0.28 * g, -0.13); arm(p, S, 'sideHigh'); arm(p, O, 'first'); p.lean(0.05, -0.08, 0.15 * g, -0.12 * g); p.look(-0.16, 0.35 * g); }],
      [t0 + 1.5, (p) => { p.footX(S, 0.3 * g, 0.09, 0, 0.8); p.footX(O, 0.02 * g, 0.18, 0, 0.9); p.hips(0.15 * g, 0.05); arm(p, S, 'second'); arm(p, O, 'second'); p.look(-0.05, 0); }],
    ];
  }), { groove: 0.6, hits: 0.5 }),

  // Bourrée: on pointe, tiny rippling steps gliding side to side, swan
  // arms rippling from the shoulders to the fingertips.
  violettaBourree(p, b, B, s) {
    groove(p, B, s, 0.45);
    const x = 0.2 * Math.sin(Math.PI * b / 2), v = Math.cos(Math.PI * b / 2);
    const r = Math.sin(TAU * b * 3);
    p.footX('L', x + 0.05, 0.035 * (0.5 + 0.5 * r), 0.04, POINTE);
    p.footX('R', x - 0.02, 0.035 * (0.5 - 0.5 * r), -0.03, POINTE);
    p.hips(x + 0.01, 0.06, 0, 0.08 * v);
    for (const S of ['L', 'R']) {
      const ph = TAU * b / 2 + (S === 'L' ? 0 : Math.PI);
      p.arm(S, 0.4 + 0.15 * Math.sin(ph), 1.15 + 0.3 * Math.sin(ph), 0.45 + 0.4 * Math.sin(ph + 1.2), -0.4);
      p.wrist(S, 0.35 * Math.sin(ph + 2.2));
    }
    p.lean(0, -0.1, 0.1 * v, -0.06 * v); p.look(-0.1, 0.35 * v, -0.08 * v);
  },

  // Phrase accent (count 3): sous-sus — up on pointe in a tight fifth,
  // arms in a high couronne, chin lifted over the shoulder.
  violettaAccent(p, b, B, s) {
    groove(p, B, s, 0.5);
    p.foot('L', 0.04, 0, -0.02, POINTE); p.foot('R', 0.03, 0, 0.06, POINTE);
    p.hips(0, 0.06, 0, -0.2);
    arm(p, 'L', 'fifth'); arm(p, 'R', [2.5, 0.45, 0.85, -1.1]);
    p.lean(0, -0.14, 0, 0.05); p.look(-0.2, 0.3, -0.1);
  },

  // ════════ Tier 1 ═══════════════════════════════════════════════════
  // Grand battement: the leg thrown high to the front, closed in fifth,
  // thrown to the side, closed with a little bow.
  violettaBattement: seq(4, [
    [0, (p) => { p.foot('L', 0.05, 0, -0.02, 0.4); p.foot('R', 0.55, 0.58, 0.62, 0.9); p.hips(0.05, 0.0, -0.05, -0.25); arm(p, 'L', 'second'); arm(p, 'R', 'second'); p.lean(-0.12, -0.12); p.look(-0.12); }],
    [1, (p) => { p.foot('L', 0.05, 0, -0.03); p.foot('R', 0.04, 0, 0.06); p.hips(0, -0.14); arm(p, 'L', 'first'); arm(p, 'R', 'first'); p.lean(0.06); p.look(0.1, 0.25); }],
    [2, (p) => { p.foot('R', 0.06, 0, 0, 0.4); p.foot('L', 0.9, 0.56, 0.05, 0.9); p.hips(-0.07, 0.0); arm(p, 'L', 'sideHigh'); arm(p, 'R', 'second'); p.lean(0, -0.05, 0, 0.16); p.look(-0.12, 0.3); }],
    [3, (p) => { p.foot('L', 0.05, 0, 0.07); p.foot('R', 0.05, 0, -0.03); p.hips(0, -0.16, 0.02); arm(p, 'L', 'bas'); arm(p, 'R', 'bas'); p.lean(0.32, 0.15); p.look(0.3); }],
  ], { groove: 0.6, hits: 0.5 }),

  // Air violin: the violin flips up under the chin and she saws a full bow
  // on every beat, rocking side to side from foot to foot, rising onto
  // pointe with her head thrown back on the last stroke.
  violettaAirViolin: seq(4, [
    [0, (p) => { p.footX('L', 0.18); p.footX('R', -0.18, 0, 0, 0.5); p.hips(0.07, -0.13, 0, 0.18); fiddle(p, 'L', -1); p.lean(0.08, 0.04, 0.1, -0.06); }],
    [1, (p) => { p.footX('L', 0.18, 0, 0, 0.5); p.footX('R', -0.18); p.hips(-0.07, -0.06, 0, -0.1); fiddle(p, 'L', 1); p.lean(-0.06, -0.1, -0.1, 0.06); }],
    [2, (p) => { p.footX('L', 0.18); p.footX('R', -0.18, 0, 0, 0.5); p.hips(0.07, -0.13, 0, 0.18); fiddle(p, 'L', -1); p.lean(0.1, 0.06, 0.12, -0.06); }],
    [3, (p) => { p.footX('L', 0.06, 0, 0.02, POINTE); p.footX('R', -0.12, 0.22, -0.2, 0.9); p.hips(0.04, 0.05, 0, -0.1); fiddle(p, 'L', 1); p.lean(-0.12, -0.2); p.look(-0.25); }],
  ], { groove: 0.6, hits: 0.6 }),

  // ════════ Tier 2 ═══════════════════════════════════════════════════
  // Pas de chat: cat leaps to the side, both knees drawn up in the air,
  // landing soft in fifth — left, recover, right, and rise with arms high.
  violettaPasDeChat: seq(4, [
    [0, (p) => { p.foot('L', 0.05, 0, -0.02); p.foot('R', 0.04, 0, 0.06); p.hips(0, -0.17); arm(p, 'L', 'bas'); arm(p, 'R', 'bas'); p.lean(0.08); p.look(0.08, 0.25); }],
    [0.5, (p) => { p.footX('L', 0.34, 0.42, 0, 0.9); p.footX('R', 0.06, 0.4, 0.06, 0.9); p.hips(0.16, 0.24); arm(p, 'L', [0.95, 0.95, 0.9, -0.8]); arm(p, 'R', [0.95, 0.95, 0.9, -0.8]); p.look(-0.12, 0.35); }],
    [1, (p) => { p.footX('L', 0.27, 0, -0.02); p.footX('R', 0.18, 0, 0.06); p.hips(0.22, -0.17); arm(p, 'L', 'first'); arm(p, 'R', 'first'); p.lean(0.06); p.look(0.04, 0.12); }],
    [1.5, (p) => { p.footX('L', 0.27, 0, -0.02, 0.6); p.footX('R', 0.18, 0, 0.06, 0.6); p.hips(0.22, -0.02); arm(p, 'L', 'second'); arm(p, 'R', 'second'); p.look(-0.06, -0.2); }],
    [2, (p) => { p.footX('L', 0.27, 0, -0.02); p.footX('R', 0.18, 0, 0.06); p.hips(0.22, -0.17); arm(p, 'L', 'bas'); arm(p, 'R', 'bas'); p.lean(0.08); p.look(0.08, -0.25); }],
    [2.5, (p) => { p.footX('R', -0.12, 0.42, 0.06, 0.9); p.footX('L', 0.18, 0.4, -0.02, 0.9); p.hips(0.05, 0.24); arm(p, 'L', [0.95, 0.95, 0.9, -0.8]); arm(p, 'R', [0.95, 0.95, 0.9, -0.8]); p.look(-0.12, -0.35); }],
    [3, (p) => { p.footX('L', 0.05, 0, -0.02); p.footX('R', -0.04, 0, 0.06); p.hips(0, -0.17); arm(p, 'L', 'first'); arm(p, 'R', 'first'); p.lean(0.06); }],
    [3.5, (p) => { p.foot('L', 0.05, 0, -0.02, POINTE); p.foot('R', 0.04, 0, 0.06, POINTE); p.hips(0, 0.05); arm(p, 'L', 'vee'); arm(p, 'R', 'vee'); p.lean(0, -0.12); p.look(-0.25); }],
  ], { groove: 0.4, hits: 0.4 }),

  // Tango: slow — forward; slow — rock back into a deep lunge; quick-quick —
  // cross behind, side; slow — a whipping boleo, the head snapping on every
  // step. The violin arm holds an invisible partner's hand.
  violettaTango: seq(4, [
    [0, (p) => { p.foot('L', 0.09, 0, 0.2); p.foot('R', 0.11, 0, -0.1, 0.5); p.hips(0.03, -0.13, 0.07, 0.25); tangoHold(p); p.lean(0.04, -0.1, 0.1); p.look(0.02, 0.6, -0.05); }, 'snap'],
    [1, (p) => { p.foot('L', 0.09, 0, 0.22, 0.8); p.foot('R', 0.11, 0, -0.1); p.hips(-0.02, -0.19, -0.05, 0.2); tangoHold(p); p.lean(-0.1, -0.14, 0.15); p.look(-0.04, -0.4, 0.05); }, 'snap'],
    [2, (p) => { p.footX('L', -0.03, 0, -0.14); p.footX('R', -0.11, 0, -0.08, 0.4); p.hips(-0.03, -0.13, -0.08, -0.2); tangoHold(p); p.lean(0.05, -0.08, -0.15); p.look(0, 0.45); }],
    [2.5, (p) => { p.footX('L', -0.02, 0, -0.14, 0.5); p.footX('R', -0.2, 0, -0.04); p.hips(-0.14, -0.15, -0.06, -0.25); tangoHold(p); p.look(0, -0.3); }],
    [3, (p) => { p.footX('R', -0.2, 0, -0.04); p.footX('L', -0.16, 0.36, -0.3, 0.9); p.hips(-0.17, -0.08, -0.04, -0.3); arm(p, 'L', [2.3, 1.35, 0.2, 0]); arm(p, 'R', [1.25, 0.2, 1.8, -1.3]); p.lean(0.08, -0.15, -0.25, 0.1); p.look(-0.15, 0.6, -0.1); }],
    [3.5, (p) => { p.footX('R', -0.18, 0, -0.06); p.footX('L', 0.06, 0.12, 0.08, 0.6); p.hips(-0.08, -0.08, 0.02, 0.1); tangoHold(p); p.look(0, 0.2); }],
  ], { groove: 0.5, hits: 0.9 }),

  // ════════ Tier 3 ═══════════════════════════════════════════════════
  // Double pirouette: fourth-position plié, spring up onto pointe with the
  // right foot at the knee, two turns, land in a long fourth, arms open.
  violettaPirouette(p, b, B, s) {
    const prep = smooth(b / 0.6), up = smooth((b - 0.45) / 0.55), turn = smooth((b - 0.9) / 1.7);
    const land = smooth((b - 2.55) / 0.55), air = up * (1 - land);
    groove(p, B, s, 0.4 * (1 - air));
    p.foot('L', lerp(0.02, 0.0, air) + 0.08 * land, 0, lerp(0.04, 0.02, air) + 0.14 * land, POINTE * air);
    p.foot('R', lerp(0.14, 0.01, air) + 0.12 * land, 0.38 * air, lerp(-0.24 * prep, 0.08, air) - 0.3 * land * (1 - air), lerp(0.4 * prep, 1.0, air) - 0.45 * land);
    p.hips(0.02 * (1 - air), lerp(-0.08 - 0.1 * prep, 0.06, air) - 0.14 * land * (1 - air) * 0 - 0.1 * land, -0.04 * (1 - air), 0.2 * prep * (1 - air) + 0.12 * land);
    p.root(0, 0, 0, -TAU * 2 * turn);
    const Lp = ARMS.demi.map((v, i) => lerp(lerp(v, ARMS.second[i], prep), ARMS.first[i], up));
    arm(p, 'R', 'demi', 'first', prep); arm(p, 'L', Lp);
    if (land > 0) { arm(p, 'L', Lp, 'allonge', land); arm(p, 'R', 'first', 'second', land); }
    p.lean(0.04 * (1 - air) - 0.04 * land, -0.1 * air - 0.15 * land, 0.1 * prep * (1 - air));
    p.look(-0.05 * air - 0.2 * land, 0.35 * prep * (1 - air) + 0.3 * Math.sin(TAU * 2 * turn) * air + 0.3 * land);
  },

  // Arabesque penché: step onto pointe, the right leg sweeping up behind,
  // violin reaching forward and bow behind; tip forward until the leg is
  // high in the air, come back up, close in fifth with a port de bras.
  violettaArabesque(p, b, B, s) {
    const up = smooth(b / 0.8), pen = win(b, 1.0, 2.7, 0.6), down = smooth((b - 2.8) / 0.7);
    const air = up * (1 - down);
    groove(p, B, s, 0.25 + 0.4 * down);
    p.foot('L', 0.03, 0, 0.1 * air, POINTE * air);
    p.foot('R', 0.06 + 0.16 * air, (0.5 + 0.15 * pen) * smooth(b / 0.5) * (1 - down), lerp(-0.12, -0.62 - 0.15 * pen, smooth((b - 0.15) / 0.75)) * (1 - down) - 0.03 * down, 0.9 * air);
    p.hips(0.02 * air, -0.1 + 0.15 * air - 0.08 * pen - 0.06 * down, 0.06 * air);
    p.add('hips', 0.25 * pen);
    p.root(0, 0, 0, 1.05 * air);
    arm(p, 'L', 'bas', 'allonge', air); arm(p, 'R', 'bas', 'back', air);
    if (down > 0) { arm(p, 'L', ARMS.allonge, 'fifth', down); arm(p, 'R', ARMS.back, 'fifth', down); }
    p.lean(0.3 * air + 0.55 * pen, 0.05 * air + 0.1 * pen - 0.1 * down);
    p.look(-0.15 * air - 0.35 * pen - 0.2 * down, 0.1 * air);
  },

  // ════════ Tier 4 ═══════════════════════════════════════════════════
  // Grand jeté: turn and prepare, launch into a flying split across the
  // stage, land in arabesque, bourrée back to her mark.
  violettaGrandJete(p, b, B, s) {
    const YAW = 1.15;
    phased(p, b, B, s, [
      [1, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth(b / 0.9);
        p.foot('L', 0.1, 0, 0.12 * k, 0.6 * k); p.foot('R', 0.12, 0, -0.18 * k);
        p.hips(0, -0.06 - 0.14 * k, -0.08 * k); p.root(0, 0, 0, YAW * k);
        arm(p, 'L', 'bas', 'demi', k); arm(p, 'R', 'bas', 'demi', k);
        p.lean(0.12 * k, 0.05 * k); p.look(0.05, -0.3 * k);
      }],
      [2, (p, b) => {
        const t = b - 1, air = Math.sin(Math.PI * t), z = lerp(-0.08, 0.75, smooth(t));
        p.hips(0, -0.2 + 0.52 * air + 0.14 * smooth(t), z); p.root(0, 0, 0, YAW);
        const st = smooth(t);
        p.foot('L', 0.1, 0.85 * air, lerp(0.12, z, smooth(t / 0.3)) + 0.82 * air, lerp(0.6, 0, smooth(t / 0.3)) + 0.3 * air);
        p.foot('R', 0.16, 0.75 * air + 0.45 * st * (1 - air), z - 0.8 * air - 0.62 * st * (1 - air), 0.9 * Math.max(air, st));
        arm(p, 'L', 'demi', [2.25, 0.3, 0.1, 0], smooth(t / 0.7)); arm(p, 'R', 'demi', [0.15, 1.55, 0.08, 0], smooth(t / 0.7));
        p.lean(0.12 * air, -0.15 * air); p.look(-0.25 * air);
      }],
      [3, (p, b, B, s) => {
        groove(p, B, s, 0.3);
        const t = b - 2, give = Math.sin(Math.PI * clamp01(t / 0.7));
        p.root(0, 0, 0, YAW);
        p.foot('L', 0.1, 0, 0.75, POINTE * smooth(t / 0.5)); p.foot('R', 0.16, 0.45 - 0.1 * give, 0.13, 0.9);
        p.hips(0.02, -0.06 - 0.14 * give + 0.08 * smooth(t), 0.72);
        arm(p, 'L', [2.25, 0.3, 0.1, 0], 'allonge', smooth(t)); arm(p, 'R', [0.15, 1.55, 0.08, 0], 'back', smooth(t));
        p.lean(0.2 + 0.1 * give, 0.05); p.look(-0.15);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const t = smooth((b - 3) / 0.85), r = Math.sin(TAU * (b - 3) * 4), z = 0.72 * (1 - t);
        p.root(0, 0, 0, YAW * (1 - t));
        p.foot('L', 0.06, 0.03 * (0.5 + 0.5 * r), z + 0.05, POINTE); p.foot('R', 0.06, 0.03 * (0.5 - 0.5 * r), z - 0.04, POINTE);
        p.hips(0.0, 0.05 - 0.12 * t, z);
        arm(p, 'L', 'allonge', 'fifth', t); arm(p, 'R', 'back', 'fifth', t);
        p.lean(0.2 * (1 - t), -0.1 * t); p.look(-0.15 - 0.1 * t, 0.2 * t);
      }],
    ], 0.3);
  },

  // Fouettés: three whipping turns — on each beat the right leg whips out
  // front, round to the side and snaps into retiré as she spins on pointe —
  // then a long fourth with the arms flung open.
  violettaFouette(p, b, B, s) {
    phased(p, b, B, s, [
      [3, (p, b) => {
        // Each beat: plié on the left while the right leg opens from retiré
        // to the side (0 → .45), then up onto pointe, the leg whipping back
        // into retiré as she turns (.45 → 1).
        const n = Math.floor(b), u = b - n;
        const open = Math.sin(Math.PI * clamp01(u / 0.8)) ** 1.5;
        const rise = smooth((u - 0.35) / 0.3) * (1 - smooth((u - 0.78) / 0.22));
        const turn = smooth((u - 0.45) / 0.55);
        p.foot('L', 0.0, 0, 0.02, 0.8 * rise);
        p.foot('R', 0.02 + 0.5 * open, 0.38 + 0.08 * open, 0.08 + 0.06 * open, 1.0);
        p.hips(0.03 * open * (1 - rise), -0.13 + 0.19 * rise, 0); p.root(0, 0, 0, -TAU * (n + turn));
        arm(p, 'L', 'first', 'second', open); arm(p, 'R', 'first', 'second', open);
        p.lean(0.04 * (1 - rise), -0.06); p.look(-0.05, 0.3 * Math.sin(TAU * turn));
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 3) / 0.5);
        p.foot('L', 0.08 * k, 0, 0.15 * k); p.foot('R', 0.02 + 0.11 * k, 0.38 * (1 - k), lerp(0.08, -0.26, k), lerp(1.0, 0.55, k));
        p.hips(0.03, -0.15 + 0.04 * k, 0, 0.12 * k);
        arm(p, 'L', 'first', 'sideHigh', k); arm(p, 'R', 'first', 'sideHigh', k);
        p.lean(-0.06 * k, -0.18 * k); p.look(-0.3 * k, 0.2 * k);
      }],
    ], 0.2);
  },

  // ════════ ★ Signature moves ════════════════════════════════════════
  // Flamenco: a zapateado — heels drumming, knees soft, back proud — while
  // the violin arm circles overhead (braceo); a whipping turn; and a stamp
  // into the "¡olé!" pose.
  violettaFlamenco(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b) => {
        const lL = 0.09 * Math.pow(0.5 - 0.5 * Math.cos(TAU * b), 2), lR = 0.09 * Math.pow(0.5 + 0.5 * Math.cos(TAU * b), 2);
        p.foot('L', 0.14, lL, 0.04, 0); p.foot('R', 0.14, lR, -0.02, 0);
        p.hips(0.03 * Math.cos(TAU * b), -0.16, 0, 0.25);
        const c = Math.PI * b;
        arm(p, 'L', [2.55 + 0.25 * Math.sin(c), 0.55 + 0.35 * Math.cos(c), 0.75, -0.9]);
        p.wrist('L', 0.5 * Math.sin(TAU * b));
        arm(p, 'R', [0.55, 0.85, 1.75, -1.3]);
        p.lean(-0.04, -0.2, 0.15); p.look(-0.18, 0.35, -0.06);
      }],
      [3, (p, b) => {
        const t = smooth(b - 2);
        p.foot('R', 0.0, 0, 0.0, 0.5); p.foot('L', 0.03, 0.3, 0.05, 0.9);
        p.hips(0, -0.06, 0); p.root(0, 0, 0, TAU * t);
        arm(p, 'L', [2.7, 0.4, 0.8, -1.0]); arm(p, 'R', [2.4, 0.5, 0.9, -1.0]);
        p.lean(0, -0.15); p.look(-0.2);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 2.95) / 0.35);
        p.foot('R', 0.12); p.foot('L', 0.12, 0, 0.26, -0.35 * k);
        p.hips(-0.04, -0.15, -0.02, -0.3 * k);
        arm(p, 'L', [2.7, 0.4, 0.8, -1.0], [2.85, 0.45, 0.2, 0], k); arm(p, 'R', [2.4, 0.5, 0.9, -1.0], [0.6, 0.55, 0.05, 0], k);
        p.lean(-0.06, -0.22 * k, -0.2 * k, 0.1 * k); p.look(-0.3 * k, -0.45 * k, 0.1 * k);
      }],
    ], 0.3);
  },

  // Grand cambré: a long lunge, the arms flung wide; a deep back-bend with
  // violin and bow sweeping over her head; and up into three sforzando
  // strokes on the violin.
  violettaCambre(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => {
        groove(p, B, s, 0.3);
        const k = smooth(b / 0.6);
        p.foot('L', 0.14, 0, 0.36 * k); p.foot('R', 0.14, 0, -0.32 * k, 0.5 * k);
        p.hips(0.04 * k, -0.06 - 0.2 * k, 0.04 * k, 0.25 * k);
        arm(p, 'L', 'bas', 'sideHigh', k); arm(p, 'R', 'bas', 'sideHigh', k);
        p.lean(0.05 * k, -0.1 * k); p.look(-0.2 * k, 0.3 * k);
      }],
      [2.5, (p, b) => {
        const t = smooth((b - 1) / 1.2), c = Math.sin(Math.PI * clamp01((b - 1) / 1.5));
        p.foot('L', 0.14, 0, 0.36); p.foot('R', 0.14, 0, -0.32, 0.5);
        p.hips(0.04, -0.26 + 0.05 * c, -0.04 * c, 0.25);
        arm(p, 'L', 'sideHigh', [3.05, 0.5, 0.2, 0], t); arm(p, 'R', 'sideHigh', [2.7, 0.9, 0.3, 0], t);
        p.lean(-0.55 * c, -0.45 * c, 0.1); p.look(-0.6 * c, 0.15);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 2.2) / 0.9);
        p.foot('L', 0.14, 0, 0.36); p.foot('R', 0.14, 0, -0.32, 0.5);
        p.hips(0.04, -0.22, 0.03, 0.25);
        fiddle(p, 'L', stroke(Math.max(0, b - 2.5), 2), k);
        p.lean(0.12 * k, 0.05 * k); p.look(0.05 * k);
      }],
    ], 0.3);
  },

  // Bravissima (the encore): chaîné turns on pointe, then a deep révérence,
  // violin and bow swept down and open.
  violettaFinale(p, b, B, s) {
    phased(p, b, B, s, [
      [2, (p, b) => {
        const t = smooth(b / 2), r = Math.sin(TAU * b * 2);
        p.foot('L', 0.06, 0.02 * (0.5 + 0.5 * r), 0, POINTE); p.foot('R', 0.06, 0.02 * (0.5 - 0.5 * r), 0, POINTE);
        p.hips(0, 0.05); p.root(0, 0, 0, -TAU * 2 * t);
        arm(p, 'L', 'first'); arm(p, 'R', 'first');
        p.lean(0, -0.08); p.look(-0.06);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.35);
        const k = smooth((b - 2) / 0.7), up = smooth((b - 3.25) / 0.7);
        p.foot('L', 0.06 + 0.02 * k, 0, 0.06 * k, POINTE * (1 - k)); p.foot('R', 0.06 + 0.04 * k, 0, -0.28 * k, lerp(POINTE, 0.6, k));
        p.hips(0, 0.05 * (1 - k) - 0.32 * k * (1 - up) - 0.05 * up, -0.06 * k);
        arm(p, 'L', 'first', [0.15, 1.25, 0.2, -0.3], k); arm(p, 'R', 'first', [0.15, 1.25, 0.2, -0.3], k);
        if (up > 0) { arm(p, 'L', [0.15, 1.25, 0.2, -0.3], 'vee', up); arm(p, 'R', [0.15, 1.25, 0.2, -0.3], 'vee', up); }
        p.lean(0.28 * k * (1 - up), 0.12 * k * (1 - up) - 0.12 * up); p.look(0.32 * k * (1 - up) - 0.25 * up);
      }],
    ], 0.3);
  },

  // ★★ SOLO — Virtuoso: a furious tremolo on pointe, a triple pirouette
  // still playing, and a grand arabesque with violin and bow raised high.
  violettaVirtuoso(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b) => {
        const r = Math.sin(TAU * b * 3);
        p.foot('L', 0.06, 0.03 * (0.5 + 0.5 * r), 0.03, POINTE); p.foot('R', 0.06, 0.03 * (0.5 - 0.5 * r), -0.03, POINTE);
        p.hips(0.03 * Math.sin(Math.PI * b), 0.05, 0, 0.15 * Math.sin(Math.PI * b));
        fiddle(p, 'L', 0.55 * Math.sin(TAU * b * 4));
        p.lean(0.12 * Math.sin(Math.PI * b), -0.08, 0.15 * Math.sin(Math.PI * b)); p.look(-0.1);
      }],
      [3, (p, b) => {
        const t = smooth((b - 1.5) / 1.5);
        p.foot('L', 0.0, 0, 0.02, POINTE); p.foot('R', 0.01, 0.38, 0.08, 1.0);
        p.hips(0, 0.06, 0); p.root(0, 0, 0, -TAU * 3 * t);
        fiddle(p, 'L', 0.6 * Math.sin(TAU * b * 4));
        p.lean(0, -0.12); p.look(-0.1);
      }],
      [Infinity, (p, b, B) => {
        const k = smooth((b - 2.85) / 0.8);
        p.foot('L', 0.03, 0, 0.08, POINTE); p.foot('R', 0.01 + 0.2 * k, 0.38 + 0.24 * k, lerp(0.08, -0.7, k), 0.9);
        p.hips(0.02, 0.06, 0.05 * k);
        arm(p, 'L', 'first', 'vee', k); arm(p, 'R', 'first', 'vee', k);
        p.lean(0.3 * k, -0.15 * k); p.look(-0.35 * k);
        p.root(0.004 * Math.sin(B * 40), 0, 0);
      }],
    ], 0.3);
  },

  // ════════ Battle actions ═══════════════════════════════════════════
  // Intro call-out (faceFoe — written mirrored: violin in the RIGHT hand):
  // en garde, the bow pointed at you like a rapier; a scornful screech on
  // the violin; a chaîné turn away; nose in the air, bow flicked over her
  // shoulder.
  violettaIntro(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => {
        groove(p, B, s, 0.3);
        const k = smooth(b / 0.4);
        p.foot('L', 0.12, 0, 0.3 * k); p.foot('R', 0.13, 0, -0.22 * k, 0.3 * k);
        p.hips(0.02, -0.06 - 0.12 * k, 0.04 * k); p.root(0, 0, 0, 0.75 * k);
        arm(p, 'L', 'bas', [1.55, 0.12, 0.04, 0], k);
        arm(p, 'R', 'bas', [1.3, 1.45, 1.7, 0.4], k);
        p.lean(0.04 * k, -0.06 * k); p.look(-0.05, -0.1 * k);
      }],
      [2, (p, b) => {
        const k = smooth((b - 0.85) / 0.8), u = smooth((b - 1.6) / 0.38);
        p.foot('L', 0.12, 0, 0.18); p.foot('R', 0.13, 0, -0.12);
        p.hips(0, -0.08, 0, 0); p.root(0, 0, 0, 0.6);
        fiddle(p, 'R', lerp(-1, 1, u), k);
        p.lean(-0.04, -0.12 * k);
      }],
      [3, (p, b) => {
        const t = smooth(b - 2), r = Math.sin(TAU * (b - 2) * 2);
        p.foot('L', 0.06, 0.02 * (0.5 + 0.5 * r), 0, POINTE); p.foot('R', 0.06, 0.02 * (0.5 - 0.5 * r), 0, POINTE);
        p.hips(0, 0.05); p.root(0, 0, 0, 0.6 - TAU * t);
        arm(p, 'L', 'first'); arm(p, 'R', 'first');
        p.lean(0, -0.1); p.look(-0.1);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 3) / 0.3);
        p.foot('R', 0.05, 0, 0.02, 0.6 * k); p.foot('L', 0.1, 0, 0.1, 0.3 * k);
        p.hips(-0.03, -0.04, 0, -0.3 * k); p.root(0, 0, 0, 0.6 - 0.4 * k);
        arm(p, 'L', 'first', [2.55, 0.75, 1.9, -0.7], k); arm(p, 'R', 'first', [-0.1, 0.35, 0.3, 0], k);
        p.lean(-0.06 * k, -0.2 * k, 0, -0.1 * k); p.look(-0.32 * k, -0.5 * k, 0.12 * k);
      }],
    ], 0.35);
  },

  // Battle taunt (faceFoe, mirrored: violin in the RIGHT hand): the violin
  // snaps up and she saws a shrieking tremolo straight at you, stamping,
  // then slashes the bow out to point you down.
  violettaTaunt(p, b, B, s) {
    phased(p, b, B, s, [
      [0.7, (p, b) => {
        const k = smooth(b / 0.65);
        p.foot('L', 0.13, 0, 0.18 * k); p.foot('R', 0.14, 0, -0.1 * k);
        p.hips(0, -0.08, 0.03 * k); p.root(0, 0, 0, 0.6 * k);
        fiddle(p, 'R', -0.6, k);
      }],
      [3.2, (p, b, B) => {
        const stamp = Math.pow(0.5 - 0.5 * Math.cos(TAU * b), 3);
        p.foot('L', 0.13, 0.07 * stamp, 0.18); p.foot('R', 0.14, 0, -0.1);
        p.hips(0.012 * Math.sin(B * 40), -0.12 + 0.03 * stamp, 0.05); p.root(0, 0, 0, 0.6);
        fiddle(p, 'R', 0.35 * Math.sin(TAU * b * 4) - 0.1);
        p.lean(0.16, 0.12, 0, 0.04 * Math.sin(TAU * b * 2)); p.look(0.05, 0.12 * Math.sin(TAU * b * 2));
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3.1) / 0.8);
        p.foot('L', 0.13, 0, 0.22); p.foot('R', 0.14, 0, -0.12, 0.4 * k);
        p.hips(0.02, -0.14, 0.06); p.root(0, 0, 0, 0.6);
        arm(p, 'R', FIDDLE, 'bas', k); p.wrist('R', FLIP * (1 - k), 0.35 * (1 - k));
        arm(p, 'L', [0.92, 0.6, 1.1, -0.85], [1.45, 0.2, 0.04, 0], k); p.wrist('L', -0.8 * (1 - k), -0.2 * (1 - k));
        p.lean(0.06, -0.12 * k); p.look(-0.1 * k, 0.2 * k);
      }],
    ]);
  },

  // Victory: a deep révérence to the house, arms up in a V on pointe, then
  // a triumphant cadenza, one full bow per beat.
  violettaBow(p, b, B, s) {
    phased(p, b, B, s, [
      [2.5, (p, b) => {
        const k = smooth(b / 1.2);
        p.foot('L', 0.08, 0, 0.06); p.foot('R', 0.1, 0, -0.28 * k, 0.6 * k);
        p.hips(0, -0.05 - 0.3 * k, -0.06 * k);
        arm(p, 'L', 'bas', [0.2, 1.2, 0.2, -0.3], k); arm(p, 'R', 'bas', [0.2, 1.2, 0.2, -0.3], k);
        p.lean(0.3 * k, 0.12 * k); p.look(0.3 * k);
      }],
      [4, (p, b) => {
        const k = smooth((b - 2.5) / 0.6);
        p.foot('L', 0.06, 0, 0.02, POINTE * k); p.foot('R', 0.06, 0, -0.04 * (1 - k), POINTE * k);
        p.hips(0, -0.35 + 0.4 * k, -0.06 * (1 - k));
        arm(p, 'L', [0.2, 1.2, 0.2, -0.3], 'vee', k); arm(p, 'R', [0.2, 1.2, 0.2, -0.3], 'vee', k);
        p.lean(0.3 * (1 - k), -0.15 * k); p.look(0.3 - 0.6 * k);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.6);
        const sw = Math.sin(Math.PI * (b - 4));
        p.footX('L', 0.16, 0, 0, 0.3 + 0.3 * sw); p.footX('R', -0.16, 0, 0, 0.3 - 0.3 * sw);
        p.hips(0.06 * sw, -0.08, 0, 0.15 * sw);
        fiddle(p, 'L', stroke(b - 4));
        p.lean(0.06 * sw, -0.06, 0.12 * sw); p.look(-0.12);
      }],
    ], 0.35);
  },
};

// Tango hold: the violin arm up and out as if holding a partner's hand,
// the bow arm curved round an invisible partner's back.
function tangoHold(p) {
  arm(p, 'L', [1.05, 1.25, 1.45, 0.3]);
  arm(p, 'R', [1.35, 0.15, 1.65, -1.25]);
}

export const moveMeta = {
  labels: {
    violettaBattement: 'GRAND BATTEMENT', violettaAirViolin: 'AIR VIOLIN',
    violettaPasDeChat: 'PAS DE CHAT', violettaTango: 'TANGO',
    violettaPirouette: 'PIROUETTE', violettaArabesque: 'ARABESQUE',
    violettaGrandJete: 'GRAND JETÉ', violettaFouette: 'FOUETTÉS',
    violettaFlamenco: 'FLAMENCO FIRE', violettaCambre: 'GRAND CAMBRÉ', violettaFinale: 'BRAVISSIMA',
    violettaVirtuoso: 'VIRTUOSO', violettaTaunt: 'SCREECH!', violettaBow: 'RÉVÉRENCE',
  },
  expressions: {
    violettaBalance: 'smile', violettaPortDeBras: 'smile', violettaChasse: 'joy', violettaBourree: 'smile', violettaAccent: 'smirk',
    violettaBattement: 'smirk', violettaAirViolin: 'focus', violettaPasDeChat: 'joy', violettaTango: 'focus',
    violettaPirouette: 'focus', violettaArabesque: 'smile', violettaGrandJete: 'joy', violettaFouette: 'focus',
    violettaFlamenco: 'angry', violettaCambre: 'shout', violettaFinale: 'joy', violettaVirtuoso: 'focus',
    violettaIntro: 'smirk', violettaTaunt: 'shout', violettaBow: 'joy',
  },
  hits: {
    violettaBourree: 0.4, violettaAccent: 0.3, violettaPirouette: 0.15, violettaArabesque: 0.2, violettaGrandJete: 0,
    violettaFouette: 0, violettaFlamenco: 0.9, violettaCambre: 0.3, violettaFinale: 0.1, violettaVirtuoso: 0.1,
    violettaIntro: 0.4, violettaTaunt: 0.5, violettaBow: 0.4,
  },
  fnGroove: {
    violettaPirouette: 0, violettaArabesque: 0, violettaGrandJete: 0, violettaFouette: 0, violettaFlamenco: 0.3,
    violettaCambre: 0, violettaFinale: 0, violettaVirtuoso: 0.15, violettaIntro: 0.2, violettaTaunt: 0.3, violettaBow: 0,
  },
  stiff: { violettaFlamenco: 1.3, violettaTaunt: 1.25, violettaTango: 1.2 },
};

export default { moves, moveMeta };
