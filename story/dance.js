// Dance animation system.
//
// A pose is a flat Float32Array: an [x, y, z] Euler rotation per joint, a
// root offset (x, y, z) + yaw, and a world-space target for each foot. Legs
// are solved with two-bone IK from the foot targets, so planted feet stay
// planted while the hips bounce, sway and shift weight, and steps land
// where they're placed.
//
// Everything is a function of *beat time* (the song's own beat grid), so
// every step and hit lands on the music regardless of frame rate:
//   • a groove layer bounces the body down on every beat (harder on the
//     2 and 4 snare) with a head nod and a two-beat sway;
//   • choreography is keyframed on beats and half-beats, with per-key
//     easing — "in" to land a step on the beat, "snap" to pop a hit on it;
//   • when no move is playing the dancer cycles through their own 8-count
//     base routines, so nobody ever stands still.

export const JOINTS = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'shL', 'armL', 'foreL', 'handL',
  'shR', 'armR', 'foreR', 'handR',
  'thighL', 'shinL', 'footL',
  'thighR', 'shinR', 'footR',
];
const J = Object.fromEntries(JOINTS.map((n, i) => [n, i * 3]));
const ROOT = JOINTS.length * 3;       // root x, y, z, yaw, pitch, roll
const FEET = ROOT + 6;                // footL x, y, z, pitch, footR x, y, z, pitch
export const POSE_SIZE = FEET + 8;

// Rig proportions (body units, see characters.js).
const HIP_Y = 1.0, HIP_W = 0.11, HIP_DROP = 0.04, LEG = 0.44;
const ANK = 0.085;                    // ankle height with the foot flat
const STANCE = 0.13;

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (x) => ((x % 1) + 1) % 1;
const wrapAngle = (x) => x - TAU * Math.round(x / TAU);
// Sharp accent that decays after each beat.
const hitAt = (b) => Math.exp(-frac(b) * 7);

// Segment easings. The destination key is always reached exactly on its
// beat; they differ in *how* the body travels there.
const EASE = {
  smooth,
  lin: clamp01,
  in: (f) => { f = clamp01(f); return f * f; },                       // accelerate into the beat (steps, stomps)
  out: (f) => { f = clamp01(f); return 1 - (1 - f) * (1 - f); },        // burst off the previous beat
  snap: (f) => smooth((f - 0.62) / 0.38),                              // hold, then pop onto the beat
  hit: (f) => { f = clamp01(f); return Math.pow(f, 2.3); },             // whip into the beat
  hold: (f) => (f >= 1 ? 1 : 0),
};

// ── Pose builder ────────────────────────────────────────────────────
class Pose {
  constructor() { this.a = new Float32Array(POSE_SIZE); this.rest(); }
  rest() {
    this.a.fill(0);
    this.arm('L', 0.05, 0.13, 0.3); this.arm('R', 0.05, 0.13, 0.3);
    this.foot('L', STANCE); this.foot('R', STANCE);
    this.a[ROOT + 1] = -0.03;         // soft knees
    return this;
  }
  set(j, x, y, z) { const o = J[j]; this.a[o] = x; this.a[o + 1] = y; this.a[o + 2] = z; return this; }
  add(j, x = 0, y = 0, z = 0) { const o = J[j]; this.a[o] += x; this.a[o + 1] += y; this.a[o + 2] += z; return this; }
  root(x = 0, y = 0, z = 0, yaw = 0) { const a = this.a; a[ROOT] += x; a[ROOT + 1] += y; a[ROOT + 2] += z; a[ROOT + 3] += yaw; return this; }
  hips(x = 0, y = -0.03, z = 0, yaw = 0) { const a = this.a; a[ROOT] = x; a[ROOT + 1] = y; a[ROOT + 2] = z; a[ROOT + 3] = yaw; return this; }
  // Whole-body pitch (> 0 tips forward, -2π is a backflip) and roll, about
  // the hips — for flips, windmills and headspins.
  tumble(pitch, roll = 0) { this.a[ROOT + 4] = pitch; this.a[ROOT + 5] = roll; return this; }

  // Arms, written the same way for both sides: `fwd` raises the arm to the
  // front, `out` raises it to the side, `elbow` bends it, and `twist` rolls
  // the upper arm about its own axis (arm joints use Euler order XZY), which
  // turns the elbow bend inward across the body (< 0) or outward (> 0).
  arm(side, fwd, out, elbow = 0, twist = 0) {
    const m = side === 'L' ? 1 : -1;
    this.set('arm' + side, -fwd, twist * m, out * m);
    this.set('fore' + side, -elbow, 0, 0);
    return this;
  }
  arms(fwd, out, elbow = 0, twist = 0) { return this.arm('L', fwd, out, elbow, twist).arm('R', fwd, out, elbow, twist); }
  wrist(side, x, z = 0) { return this.set('hand' + side, x, 0, side === 'L' ? z : -z); }

  // Foot target: `out` from centre toward that foot's own side, `lift` off
  // the floor, `fwd` toward the dancer's front, `pitch` > 0 raises the heel.
  foot(side, out, lift = 0, fwd = 0, pitch = 0) {
    const o = FEET + (side === 'L' ? 0 : 4);
    const a = this.a;
    a[o] = (side === 'L' ? 1 : -1) * out;
    a[o + 1] = ANK + lift + Math.max(0, pitch) * 0.06;
    a[o + 2] = fwd - Math.max(0, pitch) * 0.03;
    a[o + 3] = pitch;
    return this;
  }
  // Foot at an absolute x (dancer's left = +x) — for travelling steps.
  footX(side, x, lift = 0, fwd = 0, pitch = 0) {
    return this.foot(side, side === 'L' ? x : -x, lift, fwd, pitch);
  }
  lift(side, h, fwd = 0) { const o = FEET + (side === 'L' ? 0 : 4); this.a[o + 1] += h; this.a[o + 2] += fwd; return this; }
  // Knees bend by lowering the hips; the IK keeps the feet where they are.
  squat(k) { this.a[ROOT + 1] -= 0.2 * k; return this; }
  lean(spine, chest = 0, twist = 0, side = 0) { this.add('spine', spine, 0, side * 0.5); this.add('chest', chest, twist, side * 0.5); return this; }
  look(x, y = 0, z = 0) { this.add('head', x, y, z); return this; }
  shrug(l, r = l) { this.add('shL', 0, 0, l); this.add('shR', 0, 0, -r); return this; }
}

// Swap left/right so a move can face either way.
export function mirrorPose(src, out = new Float32Array(POSE_SIZE)) {
  for (const name of JOINTS) {
    const o = J[name];
    const mirrorName = name.endsWith('L') ? name.slice(0, -1) + 'R' : name.endsWith('R') ? name.slice(0, -1) + 'L' : name;
    const m = J[mirrorName];
    out[m] = src[o]; out[m + 1] = -src[o + 1]; out[m + 2] = -src[o + 2];
  }
  out[ROOT] = -src[ROOT]; out[ROOT + 1] = src[ROOT + 1]; out[ROOT + 2] = src[ROOT + 2]; out[ROOT + 3] = -src[ROOT + 3];
  out[ROOT + 4] = src[ROOT + 4]; out[ROOT + 5] = -src[ROOT + 5];
  for (let k = 0; k < 4; k++) { out[FEET + k] = src[FEET + 4 + k]; out[FEET + 4 + k] = src[FEET + k]; }
  out[FEET] = -out[FEET]; out[FEET + 4] = -out[FEET + 4];
  return out;
}

// Two-bone leg IK: foot targets → thigh / shin / foot rotations. Thighs use
// Euler order ZXY (set in characters.js) so the solve is exact.
function solveLegs(a) {
  const hx = a[J.hips], hy = a[J.hips + 1], hz = a[J.hips + 2];
  const px = a[ROOT], py = HIP_Y + a[ROOT + 1], pz = a[ROOT + 2];
  for (let side = 0; side < 2; side++) {
    const f = FEET + side * 4, sx = side === 0 ? 1 : -1;
    let vx = a[f] - px, vy = a[f + 1] - py, vz = a[f + 2] - pz;
    // Into the hips' local frame (inverse of Rx·Ry·Rz).
    let c = Math.cos(hx), s = Math.sin(hx), t;
    t = vy * c + vz * s; vz = -vy * s + vz * c; vy = t;
    c = Math.cos(hy); s = Math.sin(hy);
    t = vx * c - vz * s; vz = vx * s + vz * c; vx = t;
    c = Math.cos(hz); s = Math.sin(hz);
    t = vx * c + vy * s; vy = -vx * s + vy * c; vx = t;
    vx -= HIP_W * sx; vy += HIP_DROP;
    const len = Math.hypot(vx, vy, vz) || 1e-6;
    const ux = vx / len, uy = vy / len, uz = vz / len;
    const d = Math.max(0.12, Math.min(len, 2 * LEG * 0.999));
    const alpha = Math.acos(d / (2 * LEG));
    const tx = -Math.asin(Math.max(-1, Math.min(1, uz)));
    const tz = Math.atan2(ux, -uy);
    const th = J[side === 0 ? 'thighL' : 'thighR'], sh = J[side === 0 ? 'shinL' : 'shinR'], ft = J[side === 0 ? 'footL' : 'footR'];
    a[th] = tx - alpha; a[th + 1] = 0; a[th + 2] = tz;
    a[sh] = 2 * alpha; a[sh + 1] = 0; a[sh + 2] = 0;
    a[ft] = -(tx + alpha) + a[f + 3]; a[ft + 1] = 0; a[ft + 2] = -tz;
  }
}

// ── Groove layer ────────────────────────────────────────────────────
// The bounce every move rides on: down on each beat, harder on the 2 and
// 4, a head nod, shoulders that come up between beats, a two-beat sway.
function groove(p, B, s, amt = 1) {
  if (amt <= 0) return;
  // Half-time songs bounce at double rate (style.bounceRate), so the
  // body still hits every snare.
  const Bb = B * (s.bounceRate || 1);
  const down = Math.pow(0.5 + 0.5 * Math.cos(TAU * frac(Bb)), 2);
  const accent = (Math.floor(Bb) & 1) ? 1.3 : 1;
  const e = s.energy || 1;                       // louder section → bigger bounce
  const d = down * amt * s.bounce * accent * e;
  // Each dancer has their own feel, so even grooving they don't move alike.
  const feel = s.feel || 'down';
  if (feel === 'up') {
    // Disco: pops UP on the beat — knees straighten, chest lifts, chin up,
    // shoulders jive between beats.
    p.root(0, -0.07 + 0.1 * d, 0);
    p.add('chest', -0.07 * d); p.add('head', -0.12 * d * s.swagger);
    p.shrug(0.11 * d, 0.11 * d);
    const jive = Math.sin(TAU * Bb) * amt * e;
    p.add('chest', 0, 0.1 * jive, 0);
    p.add('head', 0, -0.08 * jive, 0);
  } else if (feel === 'sway') {
    // Diva: the hips land on alternate sides on every beat, shoulders
    // counter, head tilts with it — a catwalk sway, not a bounce.
    const side = Math.cos(Math.PI * Bb) * amt * e * s.swagger;
    p.root(0.075 * side, -0.04 * d, 0);
    p.add('hips', 0, 0.12 * side, 0.14 * side);
    p.add('chest', 0.03 * d, -0.08 * side, -0.1 * side);
    p.add('head', 0.05 * d, 0, 0.09 * side);
    p.shrug(0.06 * (1 - down) * amt * e);
  } else {
    // Hip-hop: drops DOWN into the beat, head nod, two-beat sway.
    p.root(0, -0.11 * d, 0);
    p.add('head', 0.2 * d * s.swagger);
    p.add('chest', 0.07 * d);
    p.shrug(0.09 * (1 - down) * amt * e);
    const sway = Math.sin(Math.PI * B) * amt * s.swagger * e;
    p.root(0.04 * sway, 0, 0);
    p.add('chest', 0, 0.08 * sway, -0.05 * sway);
    p.add('head', 0, 0, 0.05 * sway);
  }
}

// Drum-hit layer, driven by the song's actual kick and snare hits (see
// MusicClock.accents): the body drops into every kick, and every snare/clap
// pops the chest back, snaps the head, flares the arms and twists the torso
// — so the dancers hit the drums, syncopations included, not just a metronome.
function hitLayer(a, acc, amt, beat) {
  if (!acc || amt <= 0) return;
  const k = acc.kick * amt, s = acc.snare * amt;
  a[ROOT + 1] -= 0.07 * k;
  a[J.chest] += 0.12 * k - 0.2 * s;
  a[J.head] += 0.14 * k - 0.18 * s;
  a[J.shL + 2] += 0.16 * s; a[J.shR + 2] -= 0.16 * s;
  a[J.chest + 1] += 0.16 * s * ((Math.floor(beat) & 1) ? 1 : -1);
  a[J.armL + 2] += 0.22 * s; a[J.armR + 2] -= 0.22 * s;
  a[J.foreL] -= 0.2 * s; a[J.foreR] -= 0.2 * s;
}

// Keyframed move: `keys` = [beat, poseFn, ease?]. Loops over `len` beats
// unless `loop: false` (then the last key holds). `groove` scales the
// bounce layer on top.
const seq = (len, keys, opts = {}) => ({
  len, loop: opts.loop !== false, groove: opts.groove ?? 1, hits: opts.hits ?? 0.8,
  // Keys on a beat default to 'hit' (the body whips into the pose right on
  // the beat); half-beat keys are passing positions and default to smooth.
  keys: keys.map(([t, fn, ease]) => ({ t, fn, ease: ease || (Number.isInteger(t) ? 'hit' : 'smooth') })),
});

// ── Reusable bits of choreography ───────────────────────────────────
const fists = (p, side, fwd, out = 0.2, elbow = 1.7) => p.arm(side, fwd, out, elbow, -0.25);
const hipHand = (p, side) => p.arm(side, -0.25, 0.62, 1.65, -1.45);
const crossArms = (p) => { p.arm('L', 0.5, 0.12, 1.55, -1.3); p.arm('R', 0.45, 0.1, 1.5, -1.25); };
const clapFront = (p, open = 0) => p.arms(1.05, -0.32 + open, 0.75 - open * 0.4);
const clapHigh = (p, open = 0) => p.arms(2.85, -0.12 + open * 1.2, 0.15);
const wideStance = (p, w = 0.21) => { p.foot('L', w); p.foot('R', w); };

// Step-touch / two-step: R out (1), L touches in (2 — snare), L out (3),
// R touches in (4 — snare). Travels a little side to side.
const twoStepFeet = {
  c1: (p) => { p.footX('L', 0.36); p.footX('R', -0.36); p.hips(0, -0.1); },
  a1: (p) => { p.footX('L', 0.14, 0.14); p.footX('R', -0.36); p.hips(-0.12, -0.02); },
  c2: (p) => { p.footX('L', -0.06, 0.01, 0.04, 0.55); p.footX('R', -0.36); p.hips(-0.24, -0.15); },
  a2: (p) => { p.footX('L', 0.16, 0.14); p.footX('R', -0.36); p.hips(-0.11, -0.02); },
  a3: (p) => { p.footX('L', 0.36); p.footX('R', -0.14, 0.14); p.hips(0.12, -0.02); },
  c4: (p) => { p.footX('L', 0.36); p.footX('R', 0.06, 0.01, 0.04, 0.55); p.hips(0.24, -0.15); },
  a4: (p) => { p.footX('L', 0.36); p.footX('R', -0.16, 0.14); p.hips(0.11, -0.02); },
};

// ── Move library ────────────────────────────────────────────────────
// Each move is either a keyframed `seq` or a function (pose, b = beats
// since the move started, B = absolute beat, style) for motions that are
// naturally circular. Written for a dancer whose opponent is on their left
// (+x); the controller mirrors for the other side when `faceFoe`.
export const MOVES = {
  // ── Base routines (the always-on dancing) ──────────────
  twoStep: seq(4, [
    [0, (p) => { twoStepFeet.c1(p); p.arm('L', 0.3, 0.95, 1.3); p.arm('R', 0.3, 0.95, 1.3); p.lean(-0.04, -0.08, 0.2); p.look(-0.08, 0.2); }, 'in'],
    [0.5, (p) => { twoStepFeet.a1(p); p.arm('L', 0.6, 0.5, 1.4); p.arm('R', 0.6, 0.5, 1.4); p.lean(0.05, 0, -0.05); }],
    [1, (p) => { twoStepFeet.c2(p); p.arm('L', 1.0, -0.15, 1.1, -0.5); p.arm('R', 0.9, -0.05, 1.2, -0.5); p.wrist('L', 0.4); p.wrist('R', 0.4); p.lean(0.18, 0.12, -0.35, -0.12); p.look(0.12, -0.35); }, 'in'],
    [1.5, (p) => { twoStepFeet.a2(p); p.arm('L', 0.6, 0.5, 1.4); p.arm('R', 0.6, 0.5, 1.4); p.lean(0.05, 0, -0.1); }],
    [2, (p) => { twoStepFeet.c1(p); p.arm('L', 0.3, 0.95, 1.3); p.arm('R', 0.3, 0.95, 1.3); p.lean(-0.04, -0.08, -0.2); p.look(-0.08, -0.2); }, 'in'],
    [2.5, (p) => { twoStepFeet.a3(p); p.arm('L', 0.6, 0.5, 1.4); p.arm('R', 0.6, 0.5, 1.4); p.lean(0.05, 0, 0.05); }],
    [3, (p) => { twoStepFeet.c4(p); p.arm('R', 1.0, -0.15, 1.1, -0.5); p.arm('L', 0.9, -0.05, 1.2, -0.5); p.wrist('L', 0.4); p.wrist('R', 0.4); p.lean(0.18, 0.12, 0.35, 0.12); p.look(0.12, 0.35); }, 'in'],
    [3.5, (p) => { twoStepFeet.a4(p); p.arm('L', 0.6, 0.5, 1.4); p.arm('R', 0.6, 0.5, 1.4); p.lean(0.05, 0, 0.1); }],
  ]),

  // Planted wide, rocking the chest into the beat, fists pumping down on
  // 1 and 3, shoulders popping back on the 2 and 4.
  bounceRock: seq(4, [
    [0, (p) => { wideStance(p, 0.24); p.hips(0, -0.17, 0.05); p.lean(0.3, 0.2, 0.2); p.arms(0.75, 0.35, 0.35); p.look(0.2, 0.15); }, 'in'],
    [1, (p) => { wideStance(p, 0.24); p.hips(0, -0.05, -0.04); p.lean(-0.08, -0.18, 0.05); p.arms(-0.45, 0.6, 2.1); p.shrug(0.25); p.look(-0.15); }, 'snap'],
    [2, (p) => { wideStance(p, 0.24); p.hips(0, -0.17, 0.05); p.lean(0.3, 0.2, -0.2); p.arms(0.75, 0.35, 0.35); p.look(0.2, -0.15); }, 'in'],
    [3, (p) => { wideStance(p, 0.24); p.hips(0.04, -0.06, -0.04); p.lean(-0.1, -0.2, -0.1); p.arm('L', 1.0, 0.2, 2.0, -0.8); p.arm('R', 0.1, 1.2, 2.2); p.shrug(0.25); p.look(-0.2, 0.3); }, 'snap'],
  ]),

  // Kick-step: low kick on 1 and 3, step it down on 2 and 4, arms swinging
  // opposite like a strut.
  kickStep: seq(4, [
    [0, (p) => { p.foot('L', 0.12); p.foot('R', 0.2, 0.24, 0.32, -0.25); p.hips(0, -0.04, -0.04); fists(p, 'L', 0.55, 0.15, 1.3); fists(p, 'R', -0.35, 0.2, 1.1); p.lean(-0.05); }, 'out'],
    [0.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.14, 0.06, 0.08); p.hips(0, -0.02); fists(p, 'L', 0.2, 0.2, 1.3); fists(p, 'R', 0.1, 0.2, 1.3); }],
    [1, (p) => { p.foot('L', 0.13, 0, 0, 0.3); p.foot('R', 0.14); p.hips(-0.04, -0.08); fists(p, 'L', -0.2, 0.25, 1.2); fists(p, 'R', 0.3, 0.25, 1.5); p.lean(0.1, 0.05, -0.15); p.look(0.08, -0.15); }, 'in'],
    [2, (p) => { p.foot('R', 0.12); p.foot('L', 0.2, 0.24, 0.32, -0.25); p.hips(0, -0.04, -0.04); fists(p, 'R', 0.55, 0.15, 1.3); fists(p, 'L', -0.35, 0.2, 1.1); p.lean(-0.05); }, 'out'],
    [2.5, (p) => { p.foot('R', 0.12); p.foot('L', 0.14, 0.06, 0.08); p.hips(0, -0.02); fists(p, 'L', 0.1, 0.2, 1.3); fists(p, 'R', 0.2, 0.2, 1.3); }],
    [3, (p) => { p.foot('R', 0.13, 0, 0, 0.3); p.foot('L', 0.14); p.hips(0.04, -0.08); fists(p, 'R', -0.2, 0.25, 1.2); fists(p, 'L', 0.3, 0.25, 1.5); p.lean(0.1, 0.05, 0.15); p.look(0.08, 0.15); }, 'in'],
  ]),

  // Alfred's base: the Hustle — rolling the arms in front of the chest on
  // 1-2, then a disco point up and across on 3-4, side steps underneath.
  hustle(p, b, B, s) {
    evalMove('discoStrut', b, B, s, p);                      // Travolta footwork + bounce
    const ph = b % 4;
    if (ph < 2) {
      const r = TAU * b * 1.5;                               // three rolls over two beats
      p.arm('L', 0.6 + 0.22 * Math.sin(r), 0.12, 1.15 + 0.3 * Math.cos(r), -1.0);
      p.arm('R', 0.6 - 0.22 * Math.sin(r), 0.12, 1.15 - 0.3 * Math.cos(r), -1.0);
      p.lean(0.06, 0.04);
    } else {
      const up = ph < 3;
      const k = smooth(((ph - 2) % 1) / 0.3);
      if (up) { p.arm('L', 0.5, 2.3 * k + 0.3, 0.05); hipHand(p, 'R'); p.look(-0.25 * k, 0.35 * k); p.lean(-0.05, -0.1 * k); }
      else { p.arm('L', 0.9, -0.2 * k + 0.4, 0.05); hipHand(p, 'R'); p.look(0.25 * k, -0.2 * k); p.lean(0.1, 0.1 * k); }
      p.root(0, 0, 0, (up ? 0.25 : -0.15) * k);
    }
  },


  // ── Tier 1 ─────────────────────────────────────────────
  // Step-touch with big claps on the 2 and 4.
  stepClap: seq(4, [
    [0, (p) => { twoStepFeet.c1(p); p.arms(0.4, 1.35, 0.25); p.lean(-0.05, -0.05, 0.1); p.look(-0.1, -0.2); }, 'out'],
    [0.5, (p) => { twoStepFeet.a1(p); p.arms(1.4, 0.4, 0.4); }],
    [1, (p) => { twoStepFeet.c2(p); clapHigh(p); p.lean(0.1, 0.1, -0.2); p.look(0.1, -0.35); }, 'in'],
    [1.5, (p) => { twoStepFeet.a2(p); p.arms(1.4, 0.5, 0.4); }],
    [2, (p) => { twoStepFeet.c1(p); p.arms(0.4, 1.35, 0.25); p.lean(-0.05, -0.05, -0.1); p.look(-0.1, 0.2); }, 'out'],
    [2.5, (p) => { twoStepFeet.a3(p); p.arms(1.4, 0.4, 0.4); }],
    [3, (p) => { twoStepFeet.c4(p); clapHigh(p); p.lean(0.1, 0.1, 0.2); p.look(0.1, 0.35); }, 'in'],
    [3.5, (p) => { twoStepFeet.a4(p); p.arms(1.4, 0.5, 0.4); }],
  ], { groove: 0.8 }),

  // Body roll: a wave from the chest down to the knees, twice, one hand
  // sliding down the body with it.
  bodyRoll: seq(4, [
    [0, (p) => { wideStance(p, 0.17); p.hips(0, -0.02, -0.02); p.lean(-0.1, -0.2); p.look(-0.25); p.arm('L', 0.6, 0.35, 2.3, -0.9); p.arm('R', 0.3, 2.2, 0.45); }],
    [0.5, (p) => { wideStance(p, 0.17); p.hips(0, -0.04, -0.06); p.lean(0.25, 0.55); p.look(-0.15); p.arm('L', 0.5, 0.3, 2.0, -0.9); p.arm('R', 0.3, 2.15, 0.5); }],
    [1, (p) => { wideStance(p, 0.17); p.hips(0, -0.14, 0.11); p.lean(-0.1, 0.1); p.look(0.15); p.arm('L', 0.45, 0.3, 1.4, -0.8); p.arm('R', 0.3, 2.1, 0.55); }, 'in'],
    [1.5, (p) => { wideStance(p, 0.17); p.hips(0, -0.26, 0.13); p.lean(-0.25, -0.1); p.look(0.1); p.arm('L', 0.3, 0.3, 0.9); p.arm('R', 0.3, 2.05, 0.6); }],
    [2, (p) => { wideStance(p, 0.17); p.hips(0, -0.02, -0.02); p.lean(-0.1, -0.2); p.look(-0.25, 0.2); p.arm('R', 0.6, 0.35, 2.3, -0.9); p.arm('L', 0.3, 2.2, 0.45); }],
    [2.5, (p) => { wideStance(p, 0.17); p.hips(0, -0.04, -0.06); p.lean(0.25, 0.55); p.look(-0.15, 0.2); p.arm('R', 0.5, 0.3, 2.0, -0.9); p.arm('L', 0.3, 2.15, 0.5); }],
    [3, (p) => { wideStance(p, 0.17); p.hips(0, -0.14, 0.11); p.lean(-0.1, 0.1); p.look(0.15, 0.2); p.arm('R', 0.45, 0.3, 1.4, -0.8); p.arm('L', 0.3, 2.1, 0.55); }, 'in'],
    [3.5, (p) => { wideStance(p, 0.17); p.hips(0, -0.26, 0.13); p.lean(-0.25, -0.1); p.look(0.1); p.arm('R', 0.3, 0.3, 0.9); p.arm('L', 0.3, 2.05, 0.6); }],
  ], { groove: 0.35 }),

  // Saturday-night disco point: up and across on 1 and 3, down and across
  // on 2 and 4, hips popping with it.
  discoPoint: seq(4, [
    [0, (p) => { p.foot('L', 0.12); p.foot('R', 0.2, 0, 0.05, 0.2); p.hips(0.05, -0.04, 0, 0.15); p.arm('L', 0.4, 2.55, 0.02); hipHand(p, 'R'); p.lean(-0.05, -0.12, 0.15, 0.1); p.look(-0.3, 0.4); }, 'snap'],
    [1, (p) => { p.foot('L', 0.12); p.foot('R', 0.2, 0, 0.05, 0.2); p.hips(-0.05, -0.08, 0, -0.1); p.arm('L', 0.95, -0.35, 0.02); hipHand(p, 'R'); p.lean(0.12, 0.12, -0.25, -0.1); p.look(0.3, -0.3); }, 'snap'],
    [2, (p) => { p.foot('L', 0.12); p.foot('R', 0.2, 0, 0.05, 0.2); p.hips(0.05, -0.04, 0, 0.15); p.arm('L', 0.4, 2.55, 0.02); hipHand(p, 'R'); p.lean(-0.05, -0.12, 0.15, 0.1); p.look(-0.3, 0.4); }, 'snap'],
    [3, (p) => { p.foot('L', 0.12); p.foot('R', 0.2, 0, 0.05, 0.2); p.hips(-0.05, -0.08, 0, -0.1); p.arm('L', 0.95, -0.35, 0.02); hipHand(p, 'R'); p.lean(0.12, 0.12, -0.25, -0.1); p.look(0.3, -0.3); }, 'snap'],
  ], { groove: 0.5 }),

  // ── Tier 2 ─────────────────────────────────────────────
  // Running man: the planted foot slides back as the other knee drives up,
  // then that foot lands in front — one side per beat.
  runningMan: seq(2, [
    [0, (p) => { p.foot('L', 0.12, 0, 0.14); p.foot('R', 0.12, 0.02, -0.2, 0.55); p.hips(0, -0.1, -0.02); fists(p, 'L', -0.3, 0.2, 1.6); fists(p, 'R', 0.7, 0.2, 1.7); p.lean(0.18, 0.1, 0.12); }, 'in'],
    [0.5, (p) => { p.foot('L', 0.12, 0, -0.02); p.foot('R', 0.12, 0.36, 0.12); p.hips(0, 0.0, -0.04); fists(p, 'L', 0.3, 0.2, 1.7); fists(p, 'R', 0.1, 0.2, 1.7); p.lean(0.12, 0.08); }, 'out'],
    [1, (p) => { p.foot('R', 0.12, 0, 0.14); p.foot('L', 0.12, 0.02, -0.2, 0.55); p.hips(0, -0.1, -0.02); fists(p, 'R', -0.3, 0.2, 1.6); fists(p, 'L', 0.7, 0.2, 1.7); p.lean(0.18, 0.1, -0.12); }, 'in'],
    [1.5, (p) => { p.foot('R', 0.12, 0, -0.02); p.foot('L', 0.12, 0.36, 0.12); p.hips(0, 0.0, -0.04); fists(p, 'R', 0.3, 0.2, 1.7); fists(p, 'L', 0.1, 0.2, 1.7); p.lean(0.12, 0.08); }, 'out'],
  ], { groove: 0.4 }),

  // Roger Rabbit: the running man in reverse — skipping backwards, kicking
  // the free foot back, elbows flapping.
  rogerRabbit: seq(2, [
    [0, (p) => { p.foot('L', 0.12, 0, -0.05); p.foot('R', 0.14, 0.34, -0.34, 0.5); p.hips(0, -0.1, 0.02); p.arms(-0.25, 0.95, 2.1); p.lean(0.3, 0.12, 0.1); p.look(-0.15); }, 'out'],
    [0.5, (p) => { p.foot('L', 0.12, 0.03, 0.1); p.foot('R', 0.12, 0.05, -0.05); p.hips(0, 0.07, 0.0); p.arms(0.1, 0.45, 1.7); p.lean(0.22, 0.08); }, 'in'],
    [1, (p) => { p.foot('R', 0.12, 0, -0.05); p.foot('L', 0.14, 0.34, -0.34, 0.5); p.hips(0, -0.1, 0.02); p.arms(-0.25, 0.95, 2.1); p.lean(0.3, 0.12, -0.1); p.look(-0.15); }, 'out'],
    [1.5, (p) => { p.foot('R', 0.12, 0.03, 0.1); p.foot('L', 0.12, 0.05, -0.05); p.hips(0, 0.07, 0.0); p.arms(0.1, 0.45, 1.7); p.lean(0.22, 0.08); }, 'in'],
  ], { groove: 0.4 }),

  // Cabbage patch: fists stirring a big circle in front of the chest while
  // the hips circle the other way.
  cabbagePatch(p, b, B, s) {
    groove(p, B, s, 0.7);
    const a = TAU * b * 0.5;                                // one circle per two beats
    const c = Math.cos(a), sn = Math.sin(a);
    wideStance(p, 0.19);
    p.root(0.09 * c, -0.07, 0.04 * sn);
    p.arm('L', 1.15 + 0.3 * sn, 0.05 + 0.3 * c, 1.6, -0.6);
    p.arm('R', 1.15 + 0.3 * sn, 0.05 - 0.3 * c, 1.6, -0.6);
    p.lean(0.1 * sn + 0.08, 0.1 * sn, 0.18 * c, 0.15 * c);
    p.look(0.05, 0, -0.2 * c);
  },

  // ── Tier 3 ─────────────────────────────────────────────
  // Robot / popping: snaps into a new hit on every half beat.
  robot: seq(4, [
    [0, (p) => { wideStance(p, 0.2); p.hips(0, -0.1); p.arm('L', 1.57, 0.1, 1.57); p.arm('R', 0, 0.2, 1.57); p.look(0, 0.6); p.lean(0, 0, 0.3); }, 'snap'],
    [0.5, (p) => { wideStance(p, 0.2); p.hips(0, -0.06); p.arm('L', 1.57, 0.1, 1.57); p.arm('R', 0, 1.57, 1.4); p.look(0, 0.6); p.lean(0, 0, 0.3); }, 'snap'],
    [1, (p) => { wideStance(p, 0.2); p.hips(0, -0.12); p.arm('L', 0, 1.57, 0.02); p.arm('R', 0, 1.57, 0.02); p.look(0, 0); p.lean(0.05, 0.1); }, 'snap'],
    [1.5, (p) => { wideStance(p, 0.2); p.hips(0, -0.07); p.arm('L', 0, 1.57, 1.57, -1.57); p.arm('R', 0, 1.57, 1.57, 1.57); p.look(-0.1, 0); }, 'snap'],
    [2, (p) => { wideStance(p, 0.2); p.hips(0, -0.1); p.arm('L', 0, 0.2, 1.57); p.arm('R', 1.57, 0.1, 1.57); p.look(0, -0.6); p.lean(0, 0, -0.3); }, 'snap'],
    [2.5, (p) => { wideStance(p, 0.2); p.hips(0, -0.06); p.arm('L', 0, 1.57, 1.4); p.arm('R', 1.57, 0.1, 1.57); p.look(0, -0.6); p.lean(0, 0, -0.3); }, 'snap'],
    [3, (p) => { wideStance(p, 0.2); p.hips(0, -0.16); p.arm('L', 3.0, 0.1, 0.02); p.arm('R', 0, 1.57, 1.57, 1.57); p.look(0.3, 0); p.lean(0.1, 0.1); }, 'snap'],
    [3.5, (p) => { wideStance(p, 0.2); p.hips(0, -0.1); p.arm('L', 1.57, 0.05, 0.02); p.arm('R', 1.57, 0.05, 0.02); p.look(0, 0); }, 'snap'],
  ], { groove: 0.3 }),

  // Moonwalk: backslide for two and a half beats (one foot flat and sliding,
  // the other on its toes), spin, and hit a toe-stand.
  moonwalk(p, b, B, s) {
    if (b < 2.5) {
      const step = Math.floor(b), ph = b - step;
      const z0 = -0.14 * b;                                  // gliding back
      const toe = step % 2 === 0 ? 'R' : 'L', flat = toe === 'R' ? 'L' : 'R';
      // The flat foot slides from front to back; the toe foot lifts and
      // drops flat in front at the end of the beat.
      p.foot(flat, 0.11, 0, z0 + 0.15 - 0.3 * smooth(ph), 0);
      p.foot(toe, 0.11, 0.01, z0 - 0.08, 0.7 * (1 - smooth((ph - 0.75) / 0.25)));
      p.hips(0, -0.1, z0 - 0.02);
      p.lean(0.08, 0.05);
      fists(p, 'L', 0.35, 0.18, 1.5); fists(p, 'R', 0.35, 0.18, 1.5);
      p.look(-0.05, 0.1);
    } else if (b < 3.25) {
      const t = smooth((b - 2.5) / 0.75);
      const z0 = -0.35 * (1 - t);
      p.foot('L', 0.1, 0, z0); p.foot('R', 0.1, 0, z0 + 0.06, 0.5 * Math.sin(Math.PI * t));
      p.hips(0, -0.04, z0, TAU * t);
      p.arms(0.6, 0.6, 1.8);
    } else {
      const k = smooth((b - 3.25) / 0.2);
      p.foot('L', 0.09, 0, 0, 0.9 * k); p.foot('R', 0.09, 0.02, 0.02, 0.9 * k);
      p.hips(0, 0.04 * k, 0);
      p.arm('L', 0.3, 2.3 * k + 0.2, 0.15); p.arm('R', 0.7, 0.5, 2.0, -0.8);
      p.look(-0.25 * k, 0.35 * k);
      p.lean(-0.05, -0.1 * k, 0.25 * k);
    }
  },

  // Spin and point.
  spinPoint(p, b, B, s) {
    if (b < 1.5) {
      const t = smooth(b / 1.5);
      p.foot('L', 0.11); p.foot('R', 0.11, 0.12 * Math.sin(Math.PI * t), 0.05, 0.3);
      p.hips(0, -0.02 + 0.04 * Math.sin(Math.PI * t), 0, TAU * t);
      p.arm('L', 0.6, 0.5, 1.9); p.arm('R', 0.6, 0.5, 1.9);
    } else {
      groove(p, B, s, 0.6);
      const k = smooth((b - 1.5) / 0.3);
      p.foot('L', 0.12); p.foot('R', 0.2, 0, 0.08, 0.35 * k);
      p.hips(0.03 * k, -0.06);
      p.arm('L', 0.4 * k, 0.14 + 2.25 * k, 0.05);
      hipHand(p, 'R');
      p.look(-0.15 * k, 0.5 * k, 0.15 * k);
      p.lean(0, -0.1 * k, 0.2 * k);
    }
  },

  // ── Tier 4 ─────────────────────────────────────────────
  // James Brown jump split.
  jumpSplit(p, b, B, s) {
    if (b < 1) {                        // wind-up crouch
      const k = smooth(b);
      wideStance(p, 0.15);
      p.hips(0, -0.03 - 0.28 * k, -0.04 * k);
      p.arms(-0.6 * k, 0.3, 0.3);
      p.lean(0.25 * k, 0.15 * k);
    } else if (b < 2) {                 // airborne split
      const t = b - 1, air = Math.sin(Math.PI * t);
      p.hips(0, lerp(-0.31, -0.05, smooth(t / 0.18)) + 0.7 * air, 0);
      p.foot('L', 0.15 + 0.62 * air, 0.7 * air, 0.05, 0.6 * air);
      p.foot('R', 0.15 + 0.62 * air, 0.7 * air, 0.05, 0.6 * air);
      p.arms(0.2, 0.3 + 2.3 * air, 0.1);
      p.look(-0.35 * air);
      p.lean(-0.1 * air, -0.15 * air);
    } else {                            // stick the landing, power pose
      const k = smooth((b - 2) / 0.4);
      groove(p, B, s, 0.5 * k);
      wideStance(p, 0.22);
      p.hips(0, -0.28 * (1 - k) - 0.07, 0);
      crossArms(p);
      p.lean(0, -0.12 * k); p.look(-0.15 * k, 0, 0.1 * k);
    }
  },

  // Arm windmills, then a spin down into a one-knee freeze, hand to the sky.
  windmillFreeze(p, b, B, s) {
    if (b < 2) {
      groove(p, B, s, 0.7);
      const a = TAU * b * 0.75;
      wideStance(p, 0.2);
      p.hips(0, -0.08);
      p.arm('L', a, 0.35, 0.02); p.arm('R', a + Math.PI, 0.35, 0.02);
      p.lean(0.12, 0.1, 0.25 * Math.sin(a));
    } else if (b < 2.5) {
      const t = smooth((b - 2) / 0.5);
      p.foot('L', 0.14, 0, 0.1 * t); p.foot('R', 0.14, 0.05 * Math.sin(Math.PI * t), -0.2 * t);
      p.hips(0, -0.03 - 0.3 * t, 0, TAU * t);
      p.arms(0.5, 0.9, 1.0);
    } else {
      const k = smooth((b - 2.5) / 0.25);
      // Front (left) foot flat, right knee on the floor behind.
      p.foot('L', 0.15, 0, 0.18);
      p.foot('R', 0.13, 0.02, -0.42, 0.9);
      p.hips(0, -0.47, -0.04);
      p.arm('L', 0.25, 0.2 + 2.45 * k, 0.05);
      p.arm('R', 0.9, 0.35, 1.2);
      p.look(-0.35 * k, -0.3 * k);
      p.lean(0.05, -0.1 * k);
      // A tiny tremble so the freeze reads as effort, not a paused frame.
      p.root(0.006 * Math.sin(B * 40), 0, 0);
    }
  },

  // ── Battle actions ─────────────────────────────────────
  taunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    const k = smooth(b / 0.25);
    p.foot('L', 0.14, 0, 0.1 * k); p.foot('R', 0.15, 0, -0.06 * k);
    p.root(0, -0.04, 0.1 * k, 0.8 * k);           // square up to the opponent
    if (b < 2) {
      // Point straight at them.
      p.arm('L', 0.1, 1.5 * k, 0.05);
      hipHand(p, 'R');
      p.lean(0, -0.12 * k, 0.25 * k); p.look(-0.1, 0.35 * k);
    } else if (b < 3) {
      // "Come here" — beckoning curl, on the half beats.
      const c = 0.5 + 0.5 * Math.cos(TAU * (b - 2) * 2);
      p.arm('L', 0.9, 0.9, 1.6 * c + 0.2);
      hipHand(p, 'R');
      p.lean(0, -0.2, 0.2); p.look(-0.2, 0.3);
    } else {
      // Chest puff + head shake.
      p.arms(-0.35, 0.55, 0.6);
      p.lean(0, -0.35, 0.1); p.look(-0.25, 0.45 * Math.sin(TAU * b * 2));
      p.shrug(0.2 * Math.sin(TAU * b * 2), -0.2 * Math.sin(TAU * b * 2));
    }
  },

  dodge(p, b, B, s) {
    const t = clamp01(b / 1.2), duck = Math.sin(Math.PI * t);
    wideStance(p, 0.13 + 0.12 * duck);
    p.squat(1.1 * duck);
    p.lean(-0.5 * duck, -0.3 * duck); p.look(-0.35 * duck);
    p.arms(0, 0.14 + 1.6 * duck, 0.2);
    p.root(0, 0, -0.25 * duck, 0);
    if (b > 1.2) groove(p, B, s, smooth((b - 1.2) / 0.5));
  },

  stunned(p, b, B, s) {
    const wob = Math.sin(TAU * b * 0.75);
    p.foot('L', 0.15 + 0.05 * wob, 0.04 * Math.max(0, wob)); p.foot('R', 0.15 - 0.05 * wob, 0.04 * Math.max(0, -wob));
    p.add('spine', 0.25 * Math.sin(TAU * b), 0, 0.3 * wob);
    p.add('chest', 0.15, 0, 0.2 * wob);
    p.look(0.3, 0.5 * Math.sin(TAU * b), 0.35 * Math.cos(TAU * b));   // dizzy circles
    p.arm('L', 0.6 - 0.8 * Math.sin(TAU * b * 1.3), 0.8 + 0.4 * wob, 0.8);
    p.arm('R', 0.6 + 0.8 * Math.sin(TAU * b * 1.3), 0.8 - 0.4 * wob, 0.8);
    p.squat(0.25 + 0.1 * Math.abs(wob));
    p.root(0.1 * wob, 0, -0.15 * smooth(b / 0.4), 0.3 * wob);
  },

  fumble(p, b, B, s) {
    const t = clamp01(b / 1.5), w = Math.sin(TAU * t * 1.5) * (1 - t);
    p.foot('L', 0.14, 0.1 * Math.max(0, w)); p.foot('R', 0.14, 0.1 * Math.max(0, -w));
    p.add('spine', 0.1, 0, 0.45 * w); p.add('chest', 0, 0, 0.25 * w);
    p.arm('L', 0, 1.1 + 0.8 * w, 0.3); p.arm('R', 0, 1.1 - 0.8 * w, 0.3);
    p.look(0.2, 0.3 * w, 0.2 * w);
    p.root(0.1 * w, -0.04, 0);
    if (b > 1.2) groove(p, B, s, smooth((b - 1.2) / 0.5) * 0.6);
  },

  whiff(p, b, B, s) {
    const t = clamp01(b / 1.4), lurch = Math.sin(Math.PI * t);
    p.foot('L', 0.13, 0.04 * lurch, 0.25 * lurch); p.foot('R', 0.13, 0, -0.05 * lurch);
    p.lean(0.5 * lurch, 0.3 * lurch); p.look(0.4 * lurch);
    p.arms(0.9 * lurch, 0.6, 0.3);
    p.root(0, -0.08 * lurch, 0.18 * lurch, 0.4);
    if (b > 1.4) groove(p, B, s, smooth((b - 1.4) / 0.5));
  },

  hitReact(p, b, B, s) {
    const t = clamp01(b / 0.9), jolt = Math.sin(Math.PI * t) * (1 - t * 0.3);
    p.foot('L', 0.14, 0.05 * jolt, -0.05 * jolt); p.foot('R', 0.14, 0, -0.1 * jolt);
    p.lean(-0.45 * jolt, 0, 0, 0.1 * jolt); p.look(-0.5 * jolt);
    p.arms(-0.4 * jolt, 0.14 + 0.9 * jolt, 0.3);
    p.root(0, 0, -0.25 * jolt, 0);
  },

  reactOoh(p, b, B, s) {
    groove(p, B, s, 0.3);
    const k = smooth(b / 0.3);
    // Hands on head, leaning back.
    p.set('armL', -0.6 * k, 0, 2.2 * k + 0.14); p.set('foreL', -2.1 * k, 0, 0.4 * k);
    p.set('armR', -0.6 * k, 0, -2.2 * k - 0.14); p.set('foreR', -2.1 * k, 0, -0.4 * k);
    p.lean(-0.3 * k); p.look(-0.3 * k, 0.2 * Math.sin(TAU * b), 0);
    p.foot('R', 0.14, 0, -0.1 * k);
    p.root(0, 0, -0.08 * k, 0);
  },

  cheer(p, b, B, s) {
    groove(p, B, s, 0.8);
    const up = hitAt(b);
    p.arms(0.3, 2.4 + 0.3 * up, 0.4);
    p.root(0, 0.1 * up, 0, 0);
    p.foot('L', 0.14, 0.1 * up); p.foot('R', 0.14, 0.1 * up);
  },

  victory(p, b, B, s) {
    const beat = Math.floor(b), ph = b % 1, jump = Math.sin(Math.PI * clamp01(ph * 1.4));
    const alt = beat % 2 === 0;
    p.root(0, 0.3 * jump - 0.12 * (1 - jump), 0, 0);
    p.foot('L', 0.15, 0.25 * jump, 0, 0.5 * jump); p.foot('R', 0.15, 0.25 * jump, 0, 0.5 * jump);
    if (b >= 6) { p.arms(0.2, 2.6, 0.02); }
    else { p.arm('L', 0.2, alt ? 2.8 : 1.2, alt ? 0 : 1.4); p.arm('R', 0.2, alt ? 1.2 : 2.8, alt ? 1.4 : 0); }
    p.look(-0.35); p.lean(0, -0.2);
  },

  defeat(p, b, B, s) {
    const k = smooth(b / 1.2);
    p.lean(0.35 * k, 0.25 * k); p.look(0.55 * k, 0.15 * Math.sin(Math.PI * B * 0.5), 0);
    p.arms(-0.1, 0.08, 0.05);
    p.shrug(-0.15 * k);
    p.squat(0.12 * k);
    p.foot('L', 0.1); p.foot('R', 0.1);
  },


  // ── Intro / personality ────────────────────────────────
  // Walk-on strut in place, ending on a point to the crowd.
  entrance: seq(4, [
    [0, (p) => { p.foot('L', 0.13, 0, 0.14); p.foot('R', 0.13, 0, -0.1, 0.5); p.hips(0, -0.09, 0.02, 0.18); p.arm('L', -0.55, 0.3, 0.5); p.arm('R', 0.75, 0.25, 1.0); p.lean(0.05, -0.12, -0.2); p.look(-0.1, 0.15); }, 'in'],
    [0.5, (p) => { p.foot('L', 0.13, 0, 0.02); p.foot('R', 0.13, 0.18, 0.08); p.hips(0, 0.0, 0.0, 0.05); p.arms(0.1, 0.3, 0.7); p.lean(0, -0.08); }],
    [1, (p) => { p.foot('R', 0.13, 0, 0.14); p.foot('L', 0.13, 0, -0.1, 0.5); p.hips(0, -0.09, 0.02, -0.18); p.arm('R', -0.55, 0.3, 0.5); p.arm('L', 0.75, 0.25, 1.0); p.lean(0.05, -0.12, 0.2); p.look(-0.1, -0.15); }, 'in'],
    [1.5, (p) => { p.foot('R', 0.13, 0, 0.02); p.foot('L', 0.13, 0.18, 0.08); p.hips(0, 0.0, 0.0, -0.05); p.arms(0.1, 0.3, 0.7); p.lean(0, -0.08); }],
    [2, (p) => { p.foot('L', 0.13, 0, 0.14); p.foot('R', 0.13, 0, -0.1, 0.5); p.hips(0, -0.09, 0.02, 0.18); p.arm('L', -0.55, 0.3, 0.5); p.arm('R', 0.75, 0.25, 1.0); p.lean(0.05, -0.12, -0.2); p.look(-0.1, 0.15); }, 'in'],
    [2.5, (p) => { p.foot('L', 0.16, 0, 0.02); p.foot('R', 0.16, 0.16, 0.06); p.hips(0, 0.02, 0, 0); p.arms(0.4, 0.6, 1.2); }],
    [3, (p) => { wideStance(p, 0.24); p.hips(0.05, -0.14, 0, -0.25); p.arm('L', 0.45, 2.45, 0.05); hipHand(p, 'R'); p.lean(-0.05, -0.18, 0.25, 0.1); p.look(-0.3, 0.3); }, 'snap'],
  ], { groove: 0.6, loop: false, hits: 0.6 }),

  // Arms folded, nodding, unimpressed head shake on 3 and 4.
  introWatch(p, b, B, s) {
    groove(p, B, s, 0.6);
    crossArms(p);
    p.foot('L', 0.17); p.foot('R', 0.17, 0, 0.04, 0.3 * (Math.floor(b) & 1));
    p.hips(0.04 * Math.sin(Math.PI * b), -0.06);
    p.lean(0, -0.1);
    if (b > 1.75 && b < 3.5) p.look(0.05, 0.38 * Math.sin(TAU * (b - 1.75) * 2), 0.05);
  },

  // The rival calls the player out: point, dismissive wave, spin, pose.
  introTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    if (b < 1) {
      const k = smooth(b / 0.25);
      p.foot('L', 0.14, 0, 0.12 * k); p.foot('R', 0.16);
      p.hips(0, -0.06, 0, 0.75 * k);
      p.arm('L', 0.12, 0.1 + 1.45 * k, 0.04);
      hipHand(p, 'R');
      p.lean(0, -0.18 * k, 0.25 * k); p.look(-0.12, 0.32 * k);
    } else if (b < 1.5) {
      const c = Math.sin(TAU * (b - 1) * 4);
      p.foot('L', 0.14, 0, 0.12); p.foot('R', 0.16);
      p.hips(0, -0.04, 0, 0.5);
      p.arm('L', 0.9, 0.7, 1.1 + 0.55 * c, -0.5);
      hipHand(p, 'R');
      p.look(0.12, -0.25, 0.18); p.lean(0, -0.1);
    } else if (b < 2.75) {
      const t = smooth((b - 1.5) / 1.25);
      p.foot('L', 0.12); p.foot('R', 0.12, 0.14 * Math.sin(Math.PI * t), 0.05, 0.4);
      p.hips(0, -0.02 + 0.05 * Math.sin(Math.PI * t), 0, 0.5 + TAU * t);
      p.arms(0.7, 0.45, 2.0, -0.6);
    } else {
      const k = smooth((b - 2.75) / 0.25);
      p.foot('L', 0.12); p.foot('R', 0.24, 0, 0.08, 0.45 * k);
      p.hips(0.08 * k, -0.1, 0, 0.5 - 0.25 * k);
      p.arm('L', 0.4, 0.3 + 2.25 * k, 0.03);
      hipHand(p, 'R');
      p.lean(-0.05, -0.15 * k, 0.15, 0.12 * k); p.look(-0.3 * k, 0.4 * k);
    }
  },

  // The answer: "nah" head shake and finger wag, two big bounces, then
  // "come on" with both hands.
  introAnswer(p, b, B, s) {
    if (b < 1) {
      groove(p, B, s, 0.5);
      const w = Math.sin(TAU * b * 3);
      p.foot('L', 0.16); p.foot('R', 0.16);
      p.hips(0, -0.06, 0, 0.35);
      p.arm('L', 1.25, 0.25, 1.7, -0.3 + 0.5 * w);
      p.look(0, 0.4 * Math.sin(TAU * b * 2), 0);
    } else if (b < 3) {
      const ph = frac(b), down = 0.5 + 0.5 * Math.cos(TAU * ph);
      wideStance(p, 0.25);
      p.hips(0, -0.04 - 0.3 * down, 0, 0.2);
      p.arm('L', 0.5 + 0.4 * down, 0.45, 1.9 - 0.8 * down); p.arm('R', 0.5 + 0.4 * down, 0.45, 1.9 - 0.8 * down);
      p.lean(0.3 * down, 0.15 * down - 0.1); p.look(0.3 * down - 0.1);
      p.shrug(0.18 * (1 - down));
    } else {
      groove(p, B, s, 0.5);
      const c = 0.5 + 0.5 * Math.cos(TAU * (b - 3) * 2);
      p.foot('L', 0.15, 0, 0.12); p.foot('R', 0.18, 0, -0.08);
      p.hips(0, -0.08, 0.04, 0.6);
      p.arms(1.05, 0.55, 0.3 + 1.5 * (1 - c));
      p.lean(-0.1, -0.25); p.look(-0.18, 0.3);
    }
  },

  // Ready stance for the count-in: low, fists up, bouncing on the beat.
  ready(p, b, B, s) {
    groove(p, B, s, 1.3);
    wideStance(p, 0.25);
    p.hips(0.04 * Math.sin(Math.PI * b), -0.12, 0, 0.12);
    p.arm('L', 0.95, 0.35, 2.0, -0.45); p.arm('R', 0.8, 0.35, 2.1, -0.45);
    p.lean(0.12, 0.08); p.look(-0.08);
  },

  // ── ★ Branch / signature moves ─────────────────────────
  // Locking: point, lock, knee drop, wrist roll, points, goalpost hit.
  lockAndPop: seq(4, [
    [0, (p) => { wideStance(p, 0.22); p.hips(0, -0.08); p.arm('L', 0.35, 1.9, 0.02); p.arm('R', 1.25, -0.45, 0.05); p.lean(0, -0.1, 0.35); p.look(-0.2, 0.45); }, 'snap'],
    [0.5, (p) => { wideStance(p, 0.22); p.hips(0, -0.04); p.arms(0.5, 0.2, 2.3, -0.8); p.look(0.25); p.shrug(0.2); }, 'snap'],
    [1, (p) => { wideStance(p, 0.3); p.hips(0, -0.44, 0.03); p.arms(0.6, 0.4, 0.25); p.lean(0.35, 0.25); p.look(-0.2); }, 'in'],
    [1.5, (p) => { wideStance(p, 0.22); p.hips(0, -0.05); p.arm('L', 2.6, 0.45, 1.0, -0.6); p.arm('R', 2.6, 0.45, 1.0, -0.6); p.lean(-0.05, -0.15); p.look(-0.3); }, 'out'],
    [2, (p) => { wideStance(p, 0.24); p.hips(-0.07, -0.12); p.arm('R', 0.6, 1.35, 0.02); hipHand(p, 'L'); p.lean(0.1, 0.1, -0.3, -0.12); p.look(0.25, -0.45); }, 'snap'],
    [2.5, (p) => { wideStance(p, 0.24); p.hips(0.07, -0.06); p.arm('L', 0.5, 2.45, 0.02); p.arm('R', 0.3, 0.3, 1.6); p.lean(-0.05, -0.12, 0.3, 0.12); p.look(-0.35, 0.45); }, 'snap'],
    [3, (p) => { wideStance(p, 0.27); p.hips(0, -0.18); p.arm('L', 0, 1.57, 1.57, 1.57); p.arm('R', 0, 1.57, 1.57, 1.57); p.lean(-0.08, -0.22); p.look(-0.18); }, 'snap'],
    [3.5, (p) => { wideStance(p, 0.27); p.hips(0, -0.14); p.arm('L', 0, 1.57, 1.57, 1.57); p.arm('R', 0, 1.57, 1.57, 1.57); p.lean(-0.04, -0.18); p.look(-0.12, 0.2); }],
  ], { groove: 0.5, hits: 0.6 }),

  // Breakdance windmill: drop to the floor and spin on the back/shoulders
  // with the legs scissoring in a V, then spring back up.
  breakWindmill(p, b, B, s) {
    if (b < 0.75) {
      const t = smooth(b / 0.75);
      p.foot('L', 0.16 + 0.3 * t, 0.05 * t, -0.3 * t); p.foot('R', 0.16 + 0.3 * t, 0.05 * t, -0.3 * t);
      p.hips(0, -0.03 - 0.6 * t, 0);
      p.tumble(Math.PI / 2 * t, 0);
      p.arms(0.6 + 1.0 * t, 0.3, 0.2);
      p.lean(0.4 * (1 - t) * Math.sin(Math.PI * t));
    } else if (b < 3.25) {
      const u = (b - 0.75) / 2.5, ang = TAU * 2 * u;
      const sc = Math.sin(ang * 2);
      p.hips(0, -0.63, 0, ang);
      p.tumble(Math.PI / 2 + 0.2 * Math.sin(ang), 0.45 * Math.sin(ang));
      p.foot('L', 0.58 + 0.12 * sc, 0.05, -0.55); p.foot('R', 0.58 - 0.12 * sc, 0.05, -0.55);
      p.arm('L', 1.57, 0.35 + 0.3 * Math.max(0, Math.sin(ang)), 0.15);
      p.arm('R', 1.57, 0.35 + 0.3 * Math.max(0, -Math.sin(ang)), 0.15);
      p.look(-0.3);
    } else {
      const t = smooth((b - 3.25) / 0.5);
      p.foot('L', 0.46 - 0.22 * t, 0.05 * (1 - t), -0.3 * (1 - t)); p.foot('R', 0.46 - 0.22 * t, 0.05 * (1 - t), -0.3 * (1 - t));
      p.hips(0, -0.63 + 0.5 * t, 0);
      p.tumble(Math.PI / 2 * (1 - t), 0);
      p.arm('L', 1.0 - 0.6 * t, 0.3 + 2.1 * t, 0.1); p.arm('R', 1.6 - 0.9 * t, 0.4, 1.4 * t);
      p.look(-0.2 * t, 0.3 * t);
    }
  },

  // Standing backflip: crouch and swing, flip with the knees tucked, stick
  // the landing, arms up.
  backflip(p, b, B, s) {
    if (b < 1) {
      const k = smooth(b);
      wideStance(p, 0.15);
      p.hips(0, -0.03 - 0.32 * k, -0.05 * k);
      p.arms(0.9 - 1.8 * k, 0.25, 0.25);
      p.lean(0.35 * k, 0.15 * k); p.look(0.1 * k);
    } else if (b < 2.1) {
      const t = (b - 1) / 1.1, air = Math.sin(Math.PI * t), tuck = Math.sin(Math.PI * Math.min(1, t * 1.1));
      p.hips(0, lerp(-0.35, -0.02, smooth(t / 0.15)) + 1.05 * air, 0);
      p.tumble(-TAU * smooth(t), 0);
      p.foot('L', 0.14, 0.5 * tuck, 0.2 * tuck, 0.3 * tuck); p.foot('R', 0.14, 0.5 * tuck, 0.2 * tuck, 0.3 * tuck);
      p.arms(0.6 + 1.4 * tuck, 0.25, 0.4 + 0.8 * tuck);
      p.look(-0.3 * tuck);
    } else if (b < 2.5) {
      const k = smooth((b - 2.1) / 0.4);
      wideStance(p, 0.2);
      p.hips(0, -0.34 * (1 - k) - 0.06, 0);
      p.arms(0.4, 1.4 + 1.0 * k, 0.2);
      p.lean(0.25 * (1 - k));
    } else {
      groove(p, B, s, 0.6);
      wideStance(p, 0.22);
      p.hips(0, -0.06);
      p.arms(0.3, 2.5, 0.08);
      p.look(-0.35); p.lean(-0.05, -0.2);
    }
  },

  // ★★ SOLO — headspin: flip upside down onto the head, spin with the legs
  // in a V, roll back up and fold the arms.
  headspin(p, b, B, s) {
    if (b < 0.75) {
      const t = smooth(b / 0.75);
      p.foot('L', 0.14 + 0.3 * t, 0.25 * Math.sin(Math.PI * t), 0); p.foot('R', 0.14 + 0.3 * t, 0.25 * Math.sin(Math.PI * t), 0);
      p.hips(0, -0.03 - 0.07 * t, 0);
      p.tumble(Math.PI * t, 0);
      p.arms(0.4, 0.3 + 2.3 * t, 0.2);
    } else if (b < 3.25) {
      const u = (b - 0.75) / 2.5, spin = TAU * 4 * smooth(u * 0.9 + 0.05);
      p.hips(0, -0.1, 0, spin);
      p.tumble(Math.PI, 0.08 * Math.sin(spin * 2));
      p.foot('L', 0.5 + 0.08 * Math.sin(spin), 0.06, 0.05); p.foot('R', 0.5 - 0.08 * Math.sin(spin), 0.06, 0.05);
      p.arms(0.3, 2.65, 0.25);
    } else {
      const t = smooth((b - 3.25) / 0.5);
      p.foot('L', 0.44 - 0.22 * t, 0.2 * Math.sin(Math.PI * t), 0); p.foot('R', 0.44 - 0.22 * t, 0.2 * Math.sin(Math.PI * t), 0);
      p.hips(0, -0.1 - 0.02 * t, 0);
      p.tumble(Math.PI + Math.PI * t, 0);
      if (t < 0.6) p.arms(0.4, 2.6 - 2.2 * t, 0.2);
      else crossArms(p);
      p.look(-0.15 * t);
    }
  },


  // ════════════════════════════════════════════════════════════════
  // TINA — glam taco queen (purse always in her right hand)
  // ════════════════════════════════════════════════════════════════
  // Catwalk strut in place: cross-steps, hip pops, purse swinging.
  sassyStrut: seq(4, [
    [0, (p) => { p.footX('L', 0.02, 0, 0.12, 0.25); p.footX('R', -0.16, 0, -0.06, 0.4); p.hips(0.11, -0.07, 0, -0.18); p.lean(0, -0.12, 0.12, 0.18); p.arm('L', -0.45, 0.35, 0.5); p.arm('R', 0.55, 0.3, 1.3); p.look(-0.18, 0.25, 0.12); }, 'in'],
    [0.5, (p) => { p.footX('L', 0.06, 0, 0.04); p.footX('R', -0.1, 0.12, 0.04, 0.3); p.hips(0, -0.02, 0, 0); p.arm('L', 0.1, 0.3, 0.7); p.arm('R', 0.2, 0.3, 1.4); p.look(-0.12); }],
    [1, (p) => { p.footX('R', -0.02, 0, 0.12, 0.25); p.footX('L', 0.16, 0, -0.06, 0.4); p.hips(-0.11, -0.07, 0, 0.18); p.lean(0, -0.12, -0.12, -0.18); p.arm('L', 0.6, 0.35, 0.9); p.arm('R', -0.3, 0.35, 1.0); p.look(-0.18, -0.25, -0.12); }, 'in'],
    [1.5, (p) => { p.footX('R', -0.06, 0, 0.04); p.footX('L', 0.1, 0.12, 0.04, 0.3); p.hips(0, -0.02, 0, 0); p.arm('L', 0.1, 0.3, 0.7); p.arm('R', 0.2, 0.3, 1.4); p.look(-0.12); }],
    [2, (p) => { p.footX('L', 0.02, 0, 0.12, 0.25); p.footX('R', -0.16, 0, -0.06, 0.4); p.hips(0.11, -0.07, 0, -0.18); p.lean(0, -0.12, 0.12, 0.18); p.arm('L', -0.45, 0.35, 0.5); p.arm('R', 0.55, 0.3, 1.3); p.look(-0.18, 0.25, 0.12); }, 'in'],
    [2.5, (p) => { p.footX('L', 0.1, 0, 0.04); p.footX('R', -0.12, 0.1, 0.04, 0.3); p.hips(0, -0.03); p.arm('L', 0.9, 0.5, 1.9, -0.5); p.arm('R', 0.2, 0.3, 1.4); }],
    [3, (p) => { p.footX('L', 0.14); p.footX('R', -0.2, 0, 0.06, 0.5); p.hips(0.14, -0.1, 0, -0.3); hipHand(p, 'L'); p.arm('R', 0.3, 0.55, 1.6); p.lean(-0.05, -0.2, 0.2, 0.2); p.look(-0.3, 0.45, 0.15); }, 'snap'],
  ], { groove: 0.7, hits: 0.9 }),

  // Shoulder shimmy, knees bouncing, jazz hand up, purse hugged in.
  shimmyBounce(p, b, B, s) {
    groove(p, B, s, 1.1);
    const sh = Math.sin(TAU * b * 4);
    wideStance(p, 0.2);
    p.hips(0.05 * Math.sin(Math.PI * b), -0.12, 0, 0.12 * Math.sin(Math.PI * b));
    p.shrug(0.16 * sh, -0.16 * sh);
    p.add('chest', 0, 0.16 * sh, 0);
    const up = (Math.floor(b) & 1) ? 1 : 0;
    p.arm('L', 0.4, 1.0 + 1.4 * up, 0.5 + 0.4 * (1 - up));
    p.wrist('L', 0.3 * Math.sin(TAU * b * 4));
    p.arm('R', 0.9, 0.1, 2.1, -0.9);
    p.lean(0.08, -0.05); p.look(-0.1, 0.2 * (up ? 1 : -1));
  },

  // Two-step footwork with the purse swinging round in circles.
  purseGroove(p, b, B, s) {
    evalMove('sassyStrut', b, B, s, p);
    const a = TAU * b / 2;
    p.arm('R', 0.8 + 0.7 * Math.sin(a), 0.5 + 0.35 * Math.cos(a), 0.35);
    hipHand(p, 'L');
    p.look(-0.1, 0.2 * Math.sin(a));
  },

  // Hair flip: head down, WHIP back with a hand through the hair, pose.
  hairFlip: seq(4, [
    [0, (p) => { wideStance(p, 0.18); p.hips(0, -0.12, 0.03); p.lean(0.45, 0.25); p.look(0.4); p.arm('L', 0.6, 0.3, 0.6); p.arm('R', 0.3, 0.3, 1.3); }],
    [0.75, (p) => { wideStance(p, 0.18); p.hips(0, -0.04, -0.03); p.lean(-0.15, -0.3, 0.2); p.look(-0.55, 0.3, 0.2); p.arm('L', 2.4, 0.9, 2.1, -0.4); p.arm('R', 0.3, 0.45, 1.4); }, 'snap'],
    [1.5, (p) => { p.foot('L', 0.14); p.foot('R', 0.22, 0, 0.06, 0.5); p.hips(0.1, -0.08, 0, -0.2); hipHand(p, 'L'); p.arm('R', 0.2, 0.5, 1.5); p.lean(0, -0.15, 0, 0.15); p.look(-0.25, 0.4, 0.2); }, 'out'],
    [2, (p) => { wideStance(p, 0.18); p.hips(0, -0.12, 0.03); p.lean(0.45, 0.25, -0.1); p.look(0.4, -0.1); p.arm('L', 0.6, 0.3, 0.6); p.arm('R', 0.3, 0.3, 1.3); }],
    [2.75, (p) => { wideStance(p, 0.18); p.hips(0, -0.04, -0.03); p.lean(-0.15, -0.3, -0.2); p.look(-0.55, -0.3, -0.2); p.arm('L', 2.4, 0.9, 2.1, -0.4); p.arm('R', 0.3, 0.45, 1.4); }, 'snap'],
    [3.5, (p) => { p.foot('R', 0.14); p.foot('L', 0.22, 0, 0.06, 0.5); p.hips(-0.1, -0.08, 0, 0.2); p.arm('L', 0.4, 2.3, 0.1); p.arm('R', 0.2, 0.5, 1.5); p.lean(0, -0.15, 0, -0.15); p.look(-0.3, -0.3); }, 'out'],
  ], { groove: 0.5, hits: 0.7 }),

  // So excited about tacos: little anime hops, fists at the chin, then a
  // jump with both arms up on 3.
  tacoHop(p, b, B, s) {
    const ph = frac(b), beat = Math.floor(b) % 4, hop = Math.sin(Math.PI * Math.min(1, ph * 1.6));
    if (beat < 3) {
      const side = beat % 2 ? -1 : 1;
      p.foot('L', 0.12, 0.1 * hop, 0, 0.5 * hop); p.foot('R', 0.12, 0.1 * hop, 0, 0.5 * hop);
      p.hips(0.06 * side, -0.1 + 0.16 * hop, 0, 0.15 * side);
      p.arm('L', 0.7, 0.05, 2.3, -0.7); p.arm('R', 0.7, 0.05, 2.2, -0.7);
      p.add('foreL', 0.2 * Math.sin(TAU * b * 4)); p.add('foreR', -0.2 * Math.sin(TAU * b * 4));
      p.lean(0.1, 0.05, 0, 0.12 * side); p.look(-0.1, 0.25 * side, 0.2 * side);
    } else {
      const air = Math.sin(Math.PI * Math.min(1, ph * 1.3));
      p.foot('L', 0.16, 0.3 * air, -0.1 * air, 0.6 * air); p.foot('R', 0.16, 0.3 * air, -0.1 * air, 0.6 * air);
      p.hips(0, -0.12 + 0.55 * air, 0);
      p.arms(0.3, 2.5 * air + 0.3, 0.15);
      p.look(-0.35 * air); p.lean(-0.1 * air, -0.15 * air);
    }
  },

  // Vogue: hands frame the face in sharp boxes on every half beat.
  vogueHands: seq(4, [
    [0, (p) => { wideStance(p, 0.2); p.hips(0.05, -0.1, 0, -0.2); p.arm('L', 1.57, 0.9, 1.8, -1.3); p.arm('R', 0.3, 0.35, 1.5); p.look(-0.1, 0.35); }, 'snap'],
    [0.5, (p) => { wideStance(p, 0.2); p.hips(0.05, -0.08, 0, -0.2); p.arm('L', 2.9, 0.15, 1.57, -1.57); p.arm('R', 0.3, 0.35, 1.5); p.look(-0.2, 0.35); }, 'snap'],
    [1, (p) => { wideStance(p, 0.2); p.hips(-0.05, -0.12, 0, 0.2); p.arm('L', 0.5, 0.2, 2.4, -1.0); p.arm('R', 0.5, 1.2, 1.57, 1.57); p.lean(0, -0.1, -0.2); p.look(-0.1, -0.35); }, 'snap'],
    [1.5, (p) => { wideStance(p, 0.2); p.hips(-0.05, -0.08, 0, 0.2); p.arm('L', 0.3, 2.6, 0.1); p.arm('R', 0.5, 1.2, 1.57, 1.57); p.look(-0.3, -0.2); }, 'snap'],
    [2, (p) => { p.foot('L', 0.12); p.foot('R', 0.24, 0, 0.1, 0.5); p.hips(0.1, -0.14, 0, -0.3); p.arm('L', 1.2, 0.2, 2.6, -1.2); p.arm('R', 0.3, 0.4, 1.4); p.lean(-0.05, -0.2, 0.2); p.look(-0.25, 0.4, 0.15); }, 'snap'],
    [2.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.24, 0, 0.1, 0.5); p.hips(0.1, -0.12, 0, -0.3); p.arm('L', 1.2, 0.2, 2.6, -1.2); p.arm('R', 2.6, 0.5, 0.6); p.look(-0.3, 0.2); }, 'snap'],
    [3, (p) => { wideStance(p, 0.26); p.hips(0, -0.26); p.arms(0.4, 1.57, 0.05); p.arm('L', 0.4, 1.57, 0.05); p.lean(0.05, -0.2); p.look(-0.2); }, 'snap'],
    [3.5, (p) => { wideStance(p, 0.26); p.hips(0, -0.18); p.arm('L', 2.9, 0.2, 1.4, -1.2); p.arm('R', 2.7, 0.3, 1.4, -1.2); p.look(-0.25); }, 'snap'],
  ], { groove: 0.4, hits: 0.6 }),

  // Purse twirl: spin with the purse flung out, swing it overhead, hold it high.
  purseTwirl(p, b, B, s) {
    if (b < 1.5) {
      const t = smooth(b / 1.5);
      p.foot('L', 0.1); p.foot('R', 0.1, 0.1 * Math.sin(Math.PI * t), 0.05, 0.6);
      p.hips(0, -0.03, 0, TAU * t);
      p.arm('R', 0.3, 1.5, 0.1); p.arm('L', 0.4, 1.2, 0.6);
    } else if (b < 3) {
      groove(p, B, s, 0.8);
      const a = TAU * (b - 1.5) / 0.75;
      wideStance(p, 0.2);
      p.hips(0, -0.1);
      p.arm('R', 2.6, 0.3 + 0.5 * Math.cos(a), 0.3 + 0.3 * Math.sin(a));
      hipHand(p, 'L');
      p.look(-0.3, 0.2 * Math.sin(a));
    } else {
      groove(p, B, s, 0.5);
      const k = smooth((b - 3) / 0.25);
      p.foot('L', 0.14); p.foot('R', 0.22, 0, 0.08, 0.5 * k);
      p.hips(0.08 * k, -0.08, 0, -0.2 * k);
      p.arm('R', 0.4, 2.6 * k + 0.2, 0.05);
      hipHand(p, 'L');
      p.lean(-0.05, -0.15 * k, 0, 0.15 * k); p.look(-0.3 * k, 0.35 * k);
    }
  },

  // Ballerina double twirl on her toes, then a curtsy.
  twirlSpin(p, b, B, s) {
    if (b < 2) {
      const t = smooth(b / 2);
      p.foot('L', 0.06, 0, 0, 0.9); p.foot('R', 0.06, 0.02, 0.03, 0.9);
      p.hips(0, 0.06, 0, TAU * 2 * t);
      p.arm('L', 0.6, 2.6, 0.7, -0.4); p.arm('R', 0.4, 1.2, 0.4);
      p.look(-0.2);
    } else if (b < 2.5) {
      const k = smooth((b - 2) / 0.5);
      p.foot('L', 0.12); p.foot('R', 0.12, 0, -0.2 * k, 0.5 * k);
      p.hips(0, -0.02 - 0.22 * k, 0);
      p.arm('L', 0.4, 1.2 - 0.5 * k, 0.3); p.arm('R', 0.3, 0.8, 0.5);
      p.lean(0.25 * k, 0.1 * k);
    } else {
      groove(p, B, s, 0.4);
      p.foot('L', 0.12); p.foot('R', 0.12, 0, -0.2, 0.5);
      p.hips(0, -0.24, 0);
      p.arm('L', 0.4, 0.7, 0.3); p.arm('R', 0.3, 0.8, 0.5);
      p.lean(0.25, 0.1); p.look(0.15, 0.25, 0.15);
    }
  },

  // Anime heart hands, heel kick-up hop, heart up high, send it over.
  heartHands: seq(4, [
    [0, (p) => { p.foot('L', 0.13); p.foot('R', 0.13, 0.26, -0.22, 0.5); p.hips(0, -0.02, 0, 0.2); p.arms(1.05, -0.2, 1.7, -0.7); p.lean(0, -0.05, 0, 0.12); p.look(-0.1, 0.2, 0.2); }, 'out'],
    [1, (p) => { p.foot('R', 0.13); p.foot('L', 0.13, 0.26, -0.22, 0.5); p.hips(0, -0.02, 0, -0.2); p.arms(1.05, -0.2, 1.7, -0.7); p.lean(0, -0.05, 0, -0.12); p.look(-0.1, -0.2, -0.2); }, 'out'],
    [2, (p) => { wideStance(p, 0.16); p.hips(0, 0.02); p.arms(2.7, 0.25, 1.2, -0.9); p.look(-0.35); p.lean(-0.05, -0.15); }, 'snap'],
    [3, (p) => { p.foot('L', 0.13, 0, 0.12); p.foot('R', 0.16, 0, -0.08, 0.4); p.hips(0, -0.06, 0.04, 0.5); p.arms(1.4, 0.4, 0.1); p.lean(0.05, 0.05, 0.2); p.look(-0.1, 0.3); }, 'out'],
  ], { groove: 0.6, hits: 0.6 }),

  // Catwalk: strut forward, snap a hip-pop pose, look back over the shoulder.
  catwalkPose(p, b, B, s) {
    if (b < 2) {
      const step = Math.floor(b), ph = b - step, z = 0.14 * smooth(b / 2);
      const lead = step % 2 ? 'R' : 'L', back = lead === 'L' ? 'R' : 'L';
      p.footX(lead, 0, 0.08 * Math.sin(Math.PI * ph), z + 0.12 * smooth(ph), 0.2);
      p.footX(back, 0, 0, z - 0.06, 0.4);
      p.hips((lead === 'L' ? 1 : -1) * 0.1, -0.05, z, (lead === 'L' ? -1 : 1) * 0.15);
      p.arm('L', lead === 'L' ? -0.4 : 0.5, 0.3, 0.6); p.arm('R', 0.3, 0.3, 1.4);
      p.look(-0.15, 0, 0.1 * (lead === 'L' ? 1 : -1));
    } else if (b < 3) {
      const k = smooth((b - 2) / 0.25);
      p.foot('L', 0.12, 0, 0.14); p.foot('R', 0.24, 0, 0.18, 0.5 * k);
      p.hips(0.14 * k, -0.1, 0.14, -0.3 * k);
      p.arm('R', 1.2 * k + 0.3, 0.6, 2.2 * k);
      hipHand(p, 'L');
      p.lean(-0.05, -0.2 * k, 0, 0.2 * k); p.look(-0.3 * k, 0.4 * k, 0.15);
    } else {
      groove(p, B, s, 0.4);
      const t = smooth((b - 3) / 0.4);
      p.foot('L', 0.12, 0, 0.14 * (1 - t)); p.foot('R', 0.14, 0, 0.14 * (1 - t), 0.3);
      p.hips(0, -0.08, 0.14 * (1 - t), -Math.PI * 0.7 * t * (1 - t) * 4 * 0.5);
      p.arm('R', 1.5, 0.6, 2.2); hipHand(p, 'L');
      p.look(-0.2, 0.6 * t);
    }
  },

  // Drop it low: shimmy all the way down and back up.
  dropItLow(p, b, B, s) {
    const down = Math.sin(Math.PI * clamp01(b / 3.2));
    const sh = Math.sin(TAU * b * 4);
    wideStance(p, 0.22 + 0.12 * down);
    p.hips(0.06 * Math.sin(TAU * b), -0.05 - 0.45 * down, 0.04 * down);
    p.foot('L', 0.22 + 0.12 * down, 0, 0, 0.5 * down); p.foot('R', 0.22 + 0.12 * down, 0, 0, 0.5 * down);
    p.shrug(0.15 * sh, -0.15 * sh); p.add('chest', 0, 0.15 * sh, 0);
    p.arm('L', 0.5 + 1.8 * (1 - down), 0.6 + 1.2 * down, 0.4); p.arm('R', 0.6, 0.4, 1.6);
    p.lean(0.2 * down, 0.1 * down); p.look(-0.15);
    if (b > 3.2) { const k = smooth((b - 3.2) / 0.3); p.arm('L', 0.4, 2.5 * k + 0.3, 0.1); p.look(-0.3 * k, 0.3 * k); }
  },

  // Blow a kiss to the rival — twice.
  kissBlow: seq(4, [
    [0, (p) => { p.foot('L', 0.13, 0, 0.08); p.foot('R', 0.16, 0, -0.06, 0.5); p.hips(0, -0.06, 0, 0.45); p.arm('L', 1.25, 0.15, 2.55, -0.6); p.arm('R', 0.3, 0.4, 1.4); p.look(-0.05, 0.25, 0.1); p.lean(0, -0.05, 0.1); }],
    [1, (p) => { p.foot('L', 0.13, 0, 0.14); p.foot('R', 0.16, 0.1, -0.12, 0.6); p.hips(0, -0.02, 0.04, 0.6); p.arm('L', 1.0, 1.3, 0.05); p.arm('R', 0.3, 0.45, 1.4); p.look(-0.15, 0.35, 0.15); p.lean(0.05, 0.05, 0.25); }, 'out'],
    [2, (p) => { p.foot('L', 0.13, 0, 0.08); p.foot('R', 0.16, 0, -0.06, 0.5); p.hips(0, -0.06, 0, 0.45); p.arm('L', 1.25, 0.15, 2.55, -0.6); p.arm('R', 0.3, 0.4, 1.4); p.look(-0.05, 0.25, -0.1); }],
    [3, (p) => { p.foot('L', 0.13, 0, 0.14); p.foot('R', 0.16, 0.1, -0.12, 0.6); p.hips(0, -0.02, 0.04, 0.6); p.arm('L', 0.9, 1.6, 0.05); p.arm('R', 2.4, 0.5, 0.4); p.look(-0.2, 0.35, 0.15); p.lean(0.05, 0.05, 0.25); }, 'out'],
  ], { groove: 0.5, hits: 0.4 }),

  // Cartwheel: over and back to her mark with a sassy step.
  cartwheel(p, b, B, s) {
    if (b < 0.5) {
      const k = smooth(b / 0.5);
      wideStance(p, 0.2 + 0.15 * k);
      p.hips(0, -0.05, 0);
      p.arms(0.2, 0.3 + 2.4 * k, 0.1);
      p.lean(0, 0, 0, 0.3 * k);
    } else if (b < 2.5) {
      const t = smooth((b - 0.5) / 2);
      p.foot('L', 0.5, 0.1, 0); p.foot('R', 0.5, 0.1, 0);
      p.hips(0.9 * t, 0.12 * Math.sin(Math.PI * t), 0);
      p.tumble(0, -TAU * t);
      p.arms(0.15, 2.75, 0.05);
    } else {
      groove(p, B, s, 0.5);
      const t = smooth((b - 2.5) / 1.2);
      const step = Math.sin(Math.PI * t * 2);
      p.footX('L', 0.9 * (1 - t) + 0.13, 0.08 * Math.max(0, step)); p.footX('R', 0.9 * (1 - t) - 0.13, 0.08 * Math.max(0, -step));
      p.hips(0.9 * (1 - t), -0.06, 0, 0);
      p.arm('L', 0.4, 2.3 * (1 - t) + 0.3, 0.2); p.arm('R', 0.3, 0.4, 1.4);
      p.look(-0.2, -0.3 * (1 - t));
    }
  },

  // Cheerleader toe-touch jump.
  toeTouch(p, b, B, s) {
    if (b < 1) {
      const k = smooth(b);
      wideStance(p, 0.14);
      p.hips(0, -0.03 - 0.3 * k, 0);
      p.arms(0.9 * k, -0.2, 1.2 * k, -0.6);
      p.lean(0.25 * k);
    } else if (b < 2) {
      const t = b - 1, air = Math.sin(Math.PI * t);
      p.hips(0, lerp(-0.33, -0.03, smooth(t / 0.15)) + 0.8 * air, 0);
      p.foot('L', 0.15 + 0.6 * air, 0.62 * air, 0.25 * air, 0.7 * air); p.foot('R', 0.15 + 0.6 * air, 0.62 * air, 0.25 * air, 0.7 * air);
      p.arms(0.5, 0.3 + 1.5 * air, 0.05);
      p.lean(0.15 * air); p.look(-0.3 * air);
    } else {
      groove(p, B, s, 0.6);
      const k = smooth((b - 2) / 0.4);
      wideStance(p, 0.18);
      p.hips(0, -0.3 * (1 - k) - 0.06);
      p.arm('L', 0.3, 2.5 * k + 0.2, 0.1); p.arm('R', 0.3, 0.6, 1.3);
      p.look(-0.3 * k, 0.2); p.lean(-0.05, -0.15 * k);
    }
  },

  // ★★ SOLO — superstar: double spin, cartwheel, toe-touch, purse to the sky.
  superstar(p, b, B, s) {
    if (b < 1) {
      const t = smooth(b);
      p.foot('L', 0.06, 0, 0, 0.9); p.foot('R', 0.06, 0.02, 0.03, 0.9);
      p.hips(0, 0.05, 0, TAU * 2 * t);
      p.arm('L', 0.6, 2.6, 0.7, -0.4); p.arm('R', 0.4, 1.4, 0.3);
    } else if (b < 2.4) {
      MOVES.cartwheel(p, 0.5 + (b - 1) / 1.4 * 2, B, s);
    } else if (b < 3.2) {
      MOVES.toeTouch(p, 1 + (b - 2.4) / 0.8, B, s);
    } else {
      groove(p, B, s, 0.5);
      const k = smooth((b - 3.2) / 0.25);
      p.foot('L', 0.14); p.foot('R', 0.24, 0, 0.08, 0.5 * k);
      p.hips(0.1 * k, -0.08, 0, -0.25 * k);
      p.arm('R', 0.4, 2.7 * k + 0.1, 0.05);
      hipHand(p, 'L');
      p.lean(-0.05, -0.2 * k, 0, 0.18 * k); p.look(-0.35 * k, 0.4 * k);
    }
  },

  // Intro: points the player out with a finger wag, hair flip, "bye-bye"
  // finger wave, blows a kiss, purse-on-shoulder pose.
  tinaTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    p.foot('L', 0.13, 0, 0.1); p.foot('R', 0.17, 0, -0.06, 0.4);
    if (b < 1) {
      const k = smooth(b / 0.25), w = Math.sin(TAU * b * 3);
      p.hips(0.05, -0.06, 0, 0.6 * k);
      p.arm('L', 0.6, 1.0 * k + 0.2, 1.0, -0.2 + 0.4 * w);
      p.arm('R', 0.3, 0.4, 1.4);
      p.look(-0.1, 0.3 * k, 0.15);
    } else if (b < 2) {
      const t = b - 1, flip = smooth(t / 0.4);
      p.hips(-0.05, -0.08, 0, 0.3);
      p.arm('L', 2.4 * flip, 0.9, 2.1 * flip, -0.4);
      p.arm('R', 0.3, 0.45, 1.4);
      p.look(0.35 - 0.85 * flip, -0.2, 0.2 * flip);
    } else if (b < 3) {
      const w = Math.sin(TAU * (b - 2) * 4);
      p.hips(0.05, -0.06, 0, 0.5);
      p.arm('L', 1.4, 0.7, 1.4 + 0.5 * w, -0.3);
      p.arm('R', 0.3, 0.45, 1.4);
      p.look(-0.05, 0.35, -0.1);
    } else {
      const k = smooth((b - 3) / 0.25);
      p.hips(0.1 * k, -0.08, 0, 0.5 - 0.3 * k);
      p.arm('L', 1.25 - 0.3 * k, 0.2 + 1.2 * k, 2.5 - 2.4 * k, -0.6);
      p.arm('R', 1.5, 0.6, 2.3);
      p.look(-0.2, 0.4 * k, 0.15);
      p.lean(0, -0.15, 0, 0.15 * k);
    }
  },

  // ════════════════════════════════════════════════════════════════
  // ALFRED — disco king / rock'n'roll
  // ════════════════════════════════════════════════════════════════
  // Travolta strut in place: step on each beat, pointing down across.
  discoStrut: seq(4, [
    [0, (p) => { p.foot('L', 0.13, 0, 0.14); p.foot('R', 0.15, 0, -0.08, 0.5); p.hips(0.05, -0.08, 0, 0.12); p.arm('R', 0.9, -0.2, 0.05); p.arm('L', 0.2, 0.4, 1.2); p.lean(-0.05, -0.1, -0.15); p.look(0.1, -0.2); }, 'in'],
    [0.5, (p) => { p.foot('L', 0.13, 0, 0.04); p.foot('R', 0.13, 0.12, 0.06, 0.3); p.hips(0, -0.02, 0, 0); p.arm('R', 0.5, 0.3, 0.6); p.arm('L', 0.3, 0.3, 0.9); }],
    [1, (p) => { p.foot('R', 0.13, 0, 0.14); p.foot('L', 0.15, 0, -0.08, 0.5); p.hips(-0.05, -0.08, 0, -0.12); p.arm('R', 0.4, 2.4, 0.05); p.arm('L', 0.2, 0.4, 1.2); p.lean(-0.08, -0.15, 0.15); p.look(-0.25, 0.3); }, 'in'],
    [1.5, (p) => { p.foot('R', 0.13, 0, 0.04); p.foot('L', 0.13, 0.12, 0.06, 0.3); p.hips(0, -0.02); p.arm('R', 0.5, 0.8, 0.6); p.arm('L', 0.3, 0.3, 0.9); }],
    [2, (p) => { p.foot('L', 0.13, 0, 0.14); p.foot('R', 0.15, 0, -0.08, 0.5); p.hips(0.05, -0.08, 0, 0.12); p.arm('R', 0.9, -0.2, 0.05); p.arm('L', 0.2, 0.4, 1.2); p.lean(-0.05, -0.1, -0.15); p.look(0.1, -0.2); }, 'in'],
    [2.5, (p) => { p.foot('L', 0.13, 0, 0.04); p.foot('R', 0.13, 0.12, 0.06, 0.3); p.hips(0, -0.02); p.arm('R', 0.5, 0.8, 0.6); p.arm('L', 0.3, 0.3, 0.9); }],
    [3, (p) => { p.foot('R', 0.13, 0, 0.14); p.foot('L', 0.15, 0, -0.08, 0.5); p.hips(-0.08, -0.1, 0, -0.18); p.arm('R', 0.4, 2.5, 0.05); hipHand(p, 'L'); p.lean(-0.1, -0.2, 0.2, 0.12); p.look(-0.3, 0.35); }, 'snap'],
  ], { groove: 0.7, hits: 0.9 }),

  // Elvis: knees wobbling in and out on the 8ths, hips swivelling.
  elvisSwivel(p, b, B, s) {
    groove(p, B, s, 0.5);
    const w = Math.sin(TAU * b * 2);
    p.foot('L', 0.2, 0, 0, 0.5 * Math.max(0, w)); p.foot('R', 0.2, 0, 0, 0.5 * Math.max(0, -w));
    p.hips(0.06 * w, -0.14, 0, 0.18 * w);
    p.add('hips', 0, 0, 0.12 * w);
    const up = (Math.floor(b) % 4) === 3;
    p.arm('L', up ? 0.3 : 0.9, up ? 2.5 : 0.4, up ? 0.05 : 1.6, -0.4);
    p.arm('R', 0.8, 0.3, 1.7, -0.5);
    p.lean(0.05, -0.12, 0.15 * w); p.look(-0.1, 0.15 * w, 0.1 * w);
  },

  // Elvis legs, bigger: leg shake, hip thrust on 3, point at the crowd.
  elvisLegs(p, b, B, s) {
    groove(p, B, s, 0.4);
    const w = Math.sin(TAU * b * 4), beat = Math.floor(b);
    p.foot('L', 0.22, 0, 0, beat % 2 ? 0.6 * Math.max(0, w) : 0); p.foot('R', 0.22, 0, 0, beat % 2 ? 0 : 0.6 * Math.max(0, w));
    p.hips(0.05 * w, -0.16, beat === 2 ? 0.08 : 0, 0.15 * w);
    if (beat < 2) { p.arm('L', 0.7, 1.0, 0.2); p.arm('R', 0.8, 0.3, 1.7, -0.5); p.look(-0.1, 0.3); }
    else if (beat === 2) { p.arms(-0.5, 0.6, 0.4); p.lean(-0.2, -0.25); p.look(-0.3); }
    else { p.arm('L', 0.4, 2.5, 0.05); hipHand(p, 'R'); p.look(-0.3, 0.4); p.lean(-0.05, -0.15, 0.2); }
  },

  // Funky chicken: elbows flapping, head pecking, a kick out.
  funkyChicken(p, b, B, s) {
    groove(p, B, s, 0.6);
    const flap = 0.5 + 0.5 * Math.sin(TAU * b * 2), peck = Math.sin(TAU * b);
    const beat = Math.floor(b) % 4;
    p.foot('L', 0.16); p.foot('R', 0.16, beat === 3 ? 0.2 * Math.sin(Math.PI * frac(b)) : 0, beat === 3 ? 0.25 : 0);
    p.hips(0, -0.14, 0, 0.1 * peck);
    p.arms(-0.25, 0.35 + 0.8 * flap, 2.2, 0.6);
    p.lean(0.15, 0.1); p.look(0.15 * peck, 0.2 * peck);
    p.add('neck', 0, 0, 0); p.root(0, 0, 0.04 * peck);
  },

  // Finger guns: pew pew on the beat, blow the smoke off on 4.
  fingerGuns(p, b, B, s) {
    groove(p, B, s, 0.6);
    const beat = Math.floor(b), ph = frac(b), kick = Math.exp(-ph * 8);
    p.foot('L', 0.15, 0, 0.06); p.foot('R', 0.18, 0, -0.04, 0.3);
    if (beat < 3) {
      const side = beat % 2 ? -1 : 1;
      p.hips(0.06 * side, -0.1, 0, 0.25 * side);
      p.arm('L', 1.45 - 0.3 * kick, 0.25 + (side > 0 ? 0.6 : -0.2), 0.05 + 0.4 * kick);
      p.arm('R', 1.45 - 0.3 * kick, 0.25 + (side < 0 ? 0.6 : -0.2), 0.05 + 0.4 * kick);
      p.lean(-0.05 - 0.08 * kick, -0.1); p.look(-0.05, 0.3 * side);
    } else {
      p.hips(0, -0.06, 0, 0);
      p.arm('L', 1.3, -0.1, 2.3, -0.6); hipHand(p, 'R');
      p.look(0.05, 0.2, 0.15); p.lean(0, -0.1);
    }
  },

  // Air guitar: rock stance, strumming, headbanging, windmill strum on 4.
  airGuitar(p, b, B, s) {
    groove(p, B, s, 0.5);
    const beat = Math.floor(b), strum = Math.sin(TAU * b * 4);
    wideStance(p, 0.28);
    p.hips(0, -0.2, 0, 0.35);
    p.arm('L', 1.3, 0.9, 0.3, -0.2);
    if (beat < 3) p.arm('R', 0.5 + 0.25 * strum, 0.2, 1.6, -0.9);
    else { const a = TAU * frac(b); p.arm('R', a + 0.5, 0.45, 0.05); }
    p.lean(0.2 + 0.25 * Math.max(0, Math.cos(TAU * b)), 0.15); p.look(0.35 * Math.max(0, Math.cos(TAU * b)), 0.2);
  },

  // Split drop: down into a full split, point it out, spring back up.
  splitDrop(p, b, B, s) {
    if (b < 1) {
      const t = smooth(b);
      p.foot('L', 0.15 + 0.72 * t, 0, 0, 0.3 * t); p.foot('R', 0.15 + 0.72 * t, 0, 0, 0.3 * t);
      p.hips(0, -0.04 - 0.8 * t, 0);
      p.arms(0.2, 0.3 + 1.3 * t, 0.1);
    } else if (b < 3) {
      const beat = Math.floor(b), up = beat % 2 === 1;
      p.foot('L', 0.87, 0, 0, 0.3); p.foot('R', 0.87, 0, 0, 0.3);
      p.hips(0, -0.84, 0);
      p.arm('L', up ? 0.4 : 0.9, up ? 2.5 : -0.3, 0.05); hipHand(p, 'R');
      p.look(up ? -0.3 : 0.2, up ? 0.35 : -0.3); p.lean(-0.1, -0.15);
    } else {
      groove(p, B, s, 0.5);
      const t = smooth((b - 3) / 0.4);
      p.foot('L', 0.87 - 0.7 * t, 0, 0, 0.3); p.foot('R', 0.87 - 0.7 * t, 0, 0, 0.3);
      p.hips(0, -0.84 + 0.76 * t, 0);
      p.arms(0.3, 2.4 * t, 0.1);
    }
  },

  // Pompadour comb-back, side smooth, double thumbs "ayyy".
  combBack: seq(4, [
    [0, (p) => { p.foot('L', 0.14); p.foot('R', 0.16, 0, 0.04, 0.3); p.hips(0, -0.06); p.arm('R', 2.5, 0.6, 2.4, -0.9); p.arm('L', 0.3, 0.4, 1.4); p.look(-0.2, 0.2); p.lean(-0.05, -0.12); }],
    [0.75, (p) => { p.foot('L', 0.14); p.foot('R', 0.16, 0, 0.04, 0.3); p.hips(0, -0.06); p.arm('R', 2.8, 0.3, 1.6, -0.6); p.arm('L', 0.3, 0.4, 1.4); p.look(-0.35, 0.2); p.lean(-0.1, -0.15); }],
    [1.5, (p) => { p.foot('L', 0.14); p.foot('R', 0.16, 0, 0.04, 0.3); p.hips(0, -0.06); p.arm('R', 2.5, 0.6, 2.4, -0.9); p.arm('L', 2.5, 0.6, 2.4, -0.9); p.look(-0.25); }],
    [2.25, (p) => { p.foot('L', 0.14); p.foot('R', 0.16, 0, 0.04, 0.3); p.hips(0, -0.08); p.arm('R', 1.6, 1.2, 2.6, -0.9); p.arm('L', 1.6, 1.2, 2.6, -0.9); p.look(-0.1); p.shrug(0.15); }],
    [3, (p) => { wideStance(p, 0.22); p.hips(0, -0.16, 0, 0.2); p.arms(1.3, 0.7, 1.3, 0.6); p.lean(-0.12, -0.25); p.look(-0.25, 0.25, 0.15); }, 'snap'],
  ], { groove: 0.5, hits: 0.5 }),

  // Rock-star knee slide with air guitar, then up.
  kneeSlide(p, b, B, s) {
    if (b < 1) {
      const t = smooth(b);
      p.foot('L', 0.14, 0.1 * Math.sin(Math.PI * t * 2), -0.2 * t); p.foot('R', 0.14, 0.1 * Math.sin(Math.PI * t * 2 + 1), -0.2 * t);
      p.hips(0, -0.05 - 0.15 * t, -0.15 * t);
      p.arms(0.6, 0.4, 1.4);
      p.lean(0.2 * t);
    } else if (b < 2.6) {
      const t = smooth((b - 1) / 1.6), strum = Math.sin(TAU * b * 4);
      const z = -0.2 + 0.55 * t;
      p.foot('L', 0.16, 0.02, z - 0.42, 0.9); p.foot('R', 0.16, 0.02, z - 0.42, 0.9);
      p.hips(0, -0.5, z);
      p.lean(-0.5 * smooth((b - 1) / 0.4), -0.2);
      p.arm('L', 1.5, 0.8, 0.3); p.arm('R', 0.6 + 0.2 * strum, 0.2, 1.6, -0.9);
      p.look(-0.45);
    } else {
      groove(p, B, s, 0.5 * smooth((b - 2.6) / 0.6));
      const t = smooth((b - 2.6) / 0.6);
      p.foot('L', 0.16, 0, 0.35 * (1 - t), 0.9 * (1 - t)); p.foot('R', 0.16, 0, 0.35 * (1 - t) - 0.1, 0.9 * (1 - t));
      p.hips(0, -0.5 + 0.44 * t, 0.35 * (1 - t));
      p.arm('L', 0.4, 0.8 + 1.7 * t, 0.05); p.arm('R', 0.4, 0.8 + 1.7 * t, 0.05);
      p.look(-0.3 * t);
    }
  },

  // Disco spin: three fast spins, then the Travolta point with a lean.
  discoSpin(p, b, B, s) {
    if (b < 2.25) {
      const t = smooth(b / 2.25);
      p.foot('L', 0.08); p.foot('R', 0.08, 0.06 * Math.abs(Math.sin(TAU * 3 * t)), 0.04, 0.5);
      p.hips(0, -0.02, 0, TAU * 3 * t);
      p.arm('R', 0.3, 2.6, 0.05); p.arm('L', 0.6, 0.5, 1.8);
    } else {
      groove(p, B, s, 0.5);
      const k = smooth((b - 2.25) / 0.25);
      p.foot('L', 0.12); p.foot('R', 0.28, 0, 0.1, 0.5 * k);
      p.hips(0.1 * k, -0.12, 0, -0.2 * k);
      p.arm('R', 0.4, 0.3 + 2.25 * k, 0.03); hipHand(p, 'L');
      p.lean(-0.08, -0.2 * k, 0.15, 0.2 * k); p.look(-0.35 * k, -0.4 * k);
    }
  },

  // ★★ SOLO — disco inferno: double spin, drop into the splits, points,
  // spring up into the pose.
  discoInferno(p, b, B, s) {
    if (b < 1) {
      const t = smooth(b);
      p.foot('L', 0.08); p.foot('R', 0.08, 0.06, 0.04, 0.5);
      p.hips(0, -0.02, 0, TAU * 2 * t);
      p.arm('R', 0.3, 2.6, 0.05); p.arm('L', 0.6, 0.5, 1.8);
    } else if (b < 3.2) {
      MOVES.splitDrop(p, (b - 1) / 2.2 * 3, B, s);
    } else {
      MOVES.discoSpin(p, 2.25 + (b - 3.2) * 1.5, B, s);
      p.root(0, 0.15 * Math.sin(Math.PI * clamp01((b - 3.2) / 0.3)), 0);
    }
  },

  // ════════════════════════════════════════════════════════════════
  // YOU — b-boy freeze
  // ════════════════════════════════════════════════════════════════
  // Air chair: drop to one hand, body tilted, knees up, hold the freeze.
  airChair(p, b, B, s) {
    if (b < 0.75) {
      const t = smooth(b / 0.75);
      wideStance(p, 0.16 + 0.1 * t);
      p.hips(0, -0.03 - 0.53 * t, 0);
      p.tumble(0, 1.0 * t);
      p.arm('R', 0.2, 1.3 * t + 0.1, 0.1); p.arm('L', 0.6, 0.6, 1.4);
      p.lean(0.2 * t);
    } else if (b < 3.3) {
      const shake = 0.006 * Math.sin(B * 40);
      p.hips(0, -0.56, 0);
      p.tumble(0.15, 1.15 + shake);
      p.foot('L', 0.1, 0.45, 0.25, 0.6); p.foot('R', 0.18, 0.55, 0.2, 0.6);
      p.arm('R', 0.2, 2.2, 0.05); p.arm('L', 1.2, 0.4, 1.8, -0.4);
      p.look(-0.3, 0.3, -0.4);
    } else {
      groove(p, B, s, 0.5);
      const t = smooth((b - 3.3) / 0.5);
      wideStance(p, 0.22);
      p.hips(0, -0.56 + 0.5 * t, 0);
      p.tumble(0, 1.15 * (1 - t));
      crossArms(p);
    }
  },


  // ── Phrase-accent signature poses (held for a beat) ──────────
  accentBboy(p, b, B, s) {                      // YOU: b-boy stance, arms folded, chin up
    wideStance(p, 0.25);
    p.hips(0, -0.16, 0, 0.25);
    crossArms(p);
    p.lean(-0.08, -0.15, 0.1); p.look(-0.22, 0.25, 0.1);
  },
  accentDisco(p, b, B, s) {                     // ALFRED: Travolta point to the sky
    p.foot('L', 0.12); p.foot('R', 0.28, 0, 0.1, 0.5);
    p.hips(0.1, -0.12, 0, -0.2);
    p.arm('R', 0.4, 2.55, 0.03); hipHand(p, 'L');
    p.lean(-0.08, -0.2, 0.15, 0.2); p.look(-0.35, -0.4);
  },
  accentDiva(p, b, B, s) {                      // TINA: hip pop, hand in the hair, purse up
    p.foot('L', 0.12); p.foot('R', 0.24, 0, 0.08, 0.55);
    p.hips(0.14, -0.1, 0, -0.3);
    p.arm('L', 2.4, 0.9, 2.1, -0.4);
    p.arm('R', 0.5, 0.6, 1.9);
    p.lean(-0.05, -0.18, 0.2, 0.2); p.look(-0.25, 0.4, 0.2);
  },

  // Walk-on: arms folded, nodding to the beat, then snap into a stance.
  intro(p, b, B, s) {
    groove(p, B, s, 0.6);
    if (b < 3) {
      crossArms(p);
      p.foot('L', 0.15); p.foot('R', 0.15, 0, 0.04, 0.3 * (Math.floor(b) & 1));
      p.look(0.1); p.lean(0, -0.08);
    } else {
      const k = smooth((b - 3) / 0.2);
      wideStance(p, 0.15 + 0.06 * k);
      fists(p, 'L', 0.8 * k + 0.3, 0.3, 1.8); fists(p, 'R', 0.8 * k + 0.3, 0.3, 1.8);
      p.squat(0.35 * k);
      p.look(-0.15 * k);
      p.root(0, 0, 0, 0.3 * k);
    }
  },
};

// Face expression per move (the rig maps these to mouth/brow shapes).
const EXPRESSIONS = {
  twoStep: 'smile', bounceRock: 'grin', kickStep: 'smile', hustle: 'smirk',
  stepClap: 'grin', bodyRoll: 'smirk', discoPoint: 'smirk',
  runningMan: 'focus', rogerRabbit: 'grin', cabbagePatch: 'grin',
  robot: 'focus', moonwalk: 'focus', spinPoint: 'grin', jumpSplit: 'shout', windmillFreeze: 'shout',
  taunt: 'smirk', dodge: 'o', stunned: 'dizzy', fumble: 'o', whiff: 'o', hitReact: 'o',
  reactOoh: 'o', cheer: 'shout', victory: 'shout', defeat: 'sad', intro: 'focus',
  entrance: 'smirk', introWatch: 'focus', introTaunt: 'smirk', introAnswer: 'grin', ready: 'focus',
  lockAndPop: 'shout', breakWindmill: 'focus', backflip: 'shout', headspin: 'focus', airChair: 'focus',
  // Tina
  sassyStrut: 'smirk', shimmyBounce: 'joy', purseGroove: 'smile', hairFlip: 'smirk', tacoHop: 'joy',
  vogueHands: 'smirk', purseTwirl: 'grin', twirlSpin: 'joy', heartHands: 'wink', catwalkPose: 'smirk',
  dropItLow: 'grin', kissBlow: 'kiss', cartwheel: 'joy', toeTouch: 'joy', superstar: 'joy', tinaTaunt: 'wink',
  // Alfred
  discoStrut: 'smirk', elvisSwivel: 'smirk', elvisLegs: 'grin', funkyChicken: 'joy', fingerGuns: 'wink',
  airGuitar: 'shout', splitDrop: 'shout', combBack: 'smirk', kneeSlide: 'shout', discoSpin: 'grin', discoInferno: 'shout',
};

// How hard each function move rides the drum-hit layer (seq moves carry
// their own `hits`); flips and floor work ignore it.
const HITS = {
  hustle: 1, cabbagePatch: 0.8, moonwalk: 0.5, spinPoint: 0.5, jumpSplit: 0.3, windmillFreeze: 0.4,
  taunt: 0.5, dodge: 0.2, stunned: 0.2, fumble: 0.2, whiff: 0.2, hitReact: 0.1, reactOoh: 0.4, cheer: 0.8,
  victory: 0.5, defeat: 0.1, intro: 0.6, introWatch: 0.7, introTaunt: 0.5, introAnswer: 0.6, ready: 1,
  breakWindmill: 0, backflip: 0, headspin: 0, airChair: 0.1, accentBboy: 0.4, accentDisco: 0.4, accentDiva: 0.4,
  shimmyBounce: 1, purseGroove: 1, tacoHop: 0.7, purseTwirl: 0.5, twirlSpin: 0.3, catwalkPose: 0.5, dropItLow: 0.7,
  cartwheel: 0, toeTouch: 0.2, superstar: 0, tinaTaunt: 0.5,
  elvisSwivel: 1, elvisLegs: 0.8, funkyChicken: 0.9, fingerGuns: 0.8, airGuitar: 0.9, splitDrop: 0.3,
  kneeSlide: 0.2, discoSpin: 0.3, discoInferno: 0.1,
};
const hitsFor = (name) => { const m = MOVES[name]; return m && typeof m !== 'function' ? m.hits : (HITS[name] ?? 0.6); };

// Display names for the HUD.
export const MOVE_LABELS = {
  stepClap: 'STEP CLAP', bodyRoll: 'BODY ROLL', discoPoint: 'DISCO POINT',
  runningMan: 'RUNNING MAN', rogerRabbit: 'ROGER RABBIT', cabbagePatch: 'CABBAGE PATCH',
  robot: 'THE ROBOT', moonwalk: 'MOONWALK', spinPoint: 'SPIN & POINT',
  jumpSplit: 'JUMP SPLIT', windmillFreeze: 'WINDMILL FREEZE',
  lockAndPop: 'LOCK & POP', breakWindmill: 'WINDMILL', backflip: 'BACKFLIP', headspin: 'HEADSPIN', airChair: 'AIR CHAIR',
  hairFlip: 'HAIR FLIP', tacoHop: 'TACO HOP', vogueHands: 'VOGUE', purseTwirl: 'PURSE TWIRL', twirlSpin: 'TWIRL',
  heartHands: 'HEART HANDS', catwalkPose: 'CATWALK', dropItLow: 'DROP IT LOW', kissBlow: 'KISS BLOW',
  cartwheel: 'CARTWHEEL', toeTouch: 'TOE TOUCH', superstar: 'SUPERSTAR',
  elvisLegs: 'ELVIS LEGS', funkyChicken: 'FUNKY CHICKEN', fingerGuns: 'FINGER GUNS', airGuitar: 'AIR GUITAR',
  splitDrop: 'SPLIT DROP', combBack: 'COMB BACK', kneeSlide: 'KNEE SLIDE', discoSpin: 'DISCO SPIN', discoInferno: 'DISCO INFERNO',
};

const _ka = new Pose(), _kb = new Pose();
const _mirror = new Float32Array(POSE_SIZE);

function evalMove(name, b, B, style, pose) {
  pose.rest();
  const m = MOVES[name] || MOVES.twoStep;
  if (typeof m === 'function') { m(pose, Math.max(0, b), B, style); return pose.a; }
  const keys = m.keys, n = keys.length;
  let t = Math.max(0, b);
  if (m.loop) t %= m.len;
  let i = n - 1;
  while (i > 0 && keys[i].t > t) i--;
  const k0 = keys[i];
  let k1 = keys[i + 1], t1;
  if (k1) t1 = k1.t;
  else if (m.loop) { k1 = keys[0]; t1 = m.len + keys[0].t; }
  if (!k1 || t < k0.t) {
    k0.fn(pose, B, style);
  } else {
    const w = EASE[k1.ease]((t - k0.t) / (t1 - k0.t));
    k0.fn(_ka.rest(), B, style);
    k1.fn(_kb.rest(), B, style);
    const a = pose.a, x = _ka.a, y = _kb.a;
    for (let q = 0; q < POSE_SIZE; q++) a[q] = x[q] + (y[q] - x[q]) * w;
  }
  groove(pose, B, style, m.groove);
  return pose.a;
}

// ── Controller ──────────────────────────────────────────────────────
export class DanceController {
  // `foeSide`: +1 if the opponent stands on this dancer's left (+x).
  // `style.routines`: the base routines this dancer cycles through, one
  // 8-count each, whenever no move is playing.
  constructor(rig, style, foeSide) {
    this.rig = rig;
    this.style = { swagger: 1, bounce: 1, routines: ['twoStep', 'bounceRock'], ...style };
    this.foeSide = foeSide;
    this.cur = { name: 'groove', start: 0, len: Infinity, faceFoe: false };
    this.prev = null;
    this.fadeStart = -Infinity;
    this.fadeLen = 0.3;
    this.queue = [];
    this._pa = new Pose(); this._pb = new Pose(); this._pc = new Pose(); this._pd = new Pose();
    this._phrases = new Map();
    this._energy = 1;
    this.out = new Float32Array(POSE_SIZE);
  }

  // Schedule `name` to start at `startBeat` for `len` beats.
  play(name, startBeat, len = 4, opts = {}) {
    const entry = { name, start: startBeat, len, faceFoe: !!opts.faceFoe, fade: opts.fade };
    this.queue.push(entry);
    this.queue.sort((a, b) => a.start - b.start);
    return entry;
  }

  // Cut in immediately (reactions).
  react(name, nowBeat, len = 2, opts = {}) {
    this.queue = this.queue.filter(q => q.start > nowBeat + len);
    this._switch({ name, start: nowBeat, len, faceFoe: !!opts.faceFoe, fade: opts.fade ?? 0.12 }, nowBeat);
  }

  clearQueue() { this.queue.length = 0; }

  // The base routine for the 8-count containing `beat`. `style.routines`
  // is either a list or { chill, hype }: each phrase picks from the hype
  // list when the song is loud there, so the dancing follows the song's
  // sections. Picked once per phrase.
  routineAt(beat) {
    const r = this.style.routines;
    const phrase = Math.floor(beat / 8);
    const mod = (a, n) => ((a % n) + n) % n;
    if (Array.isArray(r)) return r[mod(phrase, r.length)];
    let name = this._phrases.get(phrase);
    if (!name) {
      const list = (this._energy || 1) >= (this.style.hypeAt || 0.9) ? r.hype : r.chill;
      name = list[mod(phrase + (this.style.phraseOffset || 0), list.length)];
      this._phrases.set(phrase, name);
      if (this._phrases.size > 8) this._phrases.delete(this._phrases.keys().next().value);
    }
    return name;
  }

  _switch(entry, beat) {
    this.prev = this.cur;
    this.cur = entry;
    this.fadeStart = beat;
    this.fadeLen = entry.fade ?? 0.3;
  }

  _eval(entry, beat, pose) {
    let a;
    if (entry.name === 'groove') {
      // Base routines run on the absolute beat, so they're always in phase
      // with the music; the last half beat of each 8-count blends into the
      // next routine.
      const lb = ((beat % 4) + 4) % 4;                    // position in the bar
      const name = this.routineAt(beat);
      a = evalMove(name, lb, beat, this.style, pose);
      const local = ((beat % 8) + 8) % 8;
      const into = local - 7.5;
      const next = this.routineAt(beat + 1);
      if (into > 0 && next !== name) {
        const b2 = evalMove(next, lb, beat, this.style, this._pc);
        const w = smooth(into / 0.5);
        for (let i = 0; i < POSE_SIZE; i++) a[i] += (b2[i] - a[i]) * w;
      }
      // Phrase accent: once per 8-count each dancer whips into their
      // signature pose right on their count and holds it — the player on
      // 7, the rival on 3, so they answer each other like a routine.
      const ac = this.style.accent;
      if (ac) {
        let w = 0;
        if (local >= ac.at - 0.3 && local < ac.at) w = EASE.hit((local - ac.at + 0.3) / 0.3);
        else if (local >= ac.at && local < ac.at + 0.6) w = 1;
        else if (local >= ac.at + 0.6 && local < ac.at + 1) w = 1 - smooth((local - ac.at - 0.6) / 0.4);
        if (w > 0) {
          const pz = evalMove(ac.pose, local - ac.at, beat, this.style, this._pd);
          for (let i = 0; i < POSE_SIZE; i++) a[i] += (pz[i] - a[i]) * w;
        }
      }
    } else {
      a = evalMove(entry.name, beat - entry.start, beat, this.style, pose);
    }
    // Moves are authored with the opponent on the dancer's left.
    if (entry.faceFoe && this.foeSide < 0) a.set(mirrorPose(a, _mirror));
    return a;
  }

  // `acc` = the song's drum accents now ({ kick, snare, energy }, see
  // MusicClock.accents) — optional.
  update(beat, acc = null) {
    this.style.energy = acc ? acc.energy : 1;
    this._energy += ((acc ? acc.energy : 1) - this._energy) * 0.03;
    while (this.queue.length && this.queue[0].start <= beat) this._switch(this.queue.shift(), beat);
    if (this.cur.name !== 'groove' && beat >= this.cur.start + this.cur.len) {
      this._switch({ name: 'groove', start: beat, len: Infinity, faceFoe: false, fade: 0.35 }, beat);
    }
    const a = this._eval(this.cur, beat, this._pa);
    const w = smooth((beat - this.fadeStart) / this.fadeLen);
    if (this.prev && w < 1) {
      const bpose = this._eval(this.prev, beat, this._pb);
      for (let i = 0; i < POSE_SIZE; i++) this.out[i] = bpose[i] + (a[i] - bpose[i]) * w;
      // Body yaw / pitch / roll blend the short way round (a spin that ends
      // on 2π must not unwind back to 0).
      for (let i = ROOT + 3; i <= ROOT + 5; i++) this.out[i] = bpose[i] + wrapAngle(a[i] - bpose[i]) * w;
    } else {
      this.prev = null;
      this.out.set(a);
    }
    const name = this.cur.name === 'groove' ? this.routineAt(beat) : this.cur.name;
    hitLayer(this.out, acc, hitsFor(name) * (this.prev ? Math.min(1, w + 0.3) : 1), beat);
    solveLegs(this.out);
    this.rig.applyPose(this.out, J, ROOT);
    this.rig.setExpression(EXPRESSIONS[this.cur.name === 'groove' ? this.routineAt(beat) : this.cur.name] || 'smile', beat);
    return this.cur.name;
  }
}
