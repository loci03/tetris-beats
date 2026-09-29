// Dance animation system.
//
// A pose is a flat Float32Array: an [x, y, z] Euler rotation per joint plus
// a root offset (x, y, z) and root yaw. Moves are pure functions of *beat
// time*, so every step lands on the music no matter the frame rate. The
// DanceController plays moves on a beat schedule and crossfades between
// them; reactions (fumbles, dodges, stuns) cut in at the beat they happen.

export const JOINTS = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'shL', 'armL', 'foreL', 'handL',
  'shR', 'armR', 'foreR', 'handR',
  'thighL', 'shinL', 'footL',
  'thighR', 'shinR', 'footR',
];
const J = Object.fromEntries(JOINTS.map((n, i) => [n, i * 3]));
const ROOT = JOINTS.length * 3;       // root x, y, z, yaw
export const POSE_SIZE = ROOT + 4;

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
// 1 on the beat, 0 half-way between beats.
const onBeat = (b) => 0.5 + 0.5 * Math.cos(TAU * b);
// Sharp accent that decays after each beat.
const hitAt = (b) => Math.exp(-(((b % 1) + 1) % 1) * 7);

// Pose builder used by the move functions.
class Pose {
  constructor() { this.a = new Float32Array(POSE_SIZE); this.rest(); }
  rest() {
    this.a.fill(0);
    this.set('armL', 0, 0, 0.14); this.set('armR', 0, 0, -0.14);
    this.set('foreL', -0.18, 0, 0); this.set('foreR', -0.18, 0, 0);
    return this;
  }
  set(j, x, y, z) { const o = J[j]; this.a[o] = x; this.a[o + 1] = y; this.a[o + 2] = z; return this; }
  add(j, x = 0, y = 0, z = 0) { const o = J[j]; this.a[o] += x; this.a[o + 1] += y; this.a[o + 2] += z; return this; }
  root(x = 0, y = 0, z = 0, yaw = 0) { const a = this.a; a[ROOT] += x; a[ROOT + 1] += y; a[ROOT + 2] += z; a[ROOT + 3] += yaw; return this; }
  // Knee bend of `k` (0..1) on one leg, keeping the foot flat.
  bend(side, k) {
    this.add('thigh' + side, -0.7 * k); this.add('shin' + side, 1.3 * k); this.add('foot' + side, -0.6 * k);
    return this;
  }
  // Both knees bend and the body drops to match.
  squat(k) { this.bend('L', k); this.bend('R', k); this.root(0, -0.19 * k); return this; }
}

// Swap left/right so a move can face either way.
export function mirrorPose(src) {
  const out = new Float32Array(POSE_SIZE);
  for (const name of JOINTS) {
    const o = J[name];
    const mirrorName = name.endsWith('L') ? name.slice(0, -1) + 'R' : name.endsWith('R') ? name.slice(0, -1) + 'L' : name;
    const m = J[mirrorName];
    out[m] = src[o]; out[m + 1] = -src[o + 1]; out[m + 2] = -src[o + 2];
  }
  out[ROOT] = -src[ROOT]; out[ROOT + 1] = src[ROOT + 1]; out[ROOT + 2] = src[ROOT + 2]; out[ROOT + 3] = -src[ROOT + 3];
  return out;
}

// Shared "groove" layer — the bounce every move rides on.
function groove(p, B, s, amt = 1) {
  const d = onBeat(B) * amt * s.bounce;
  p.squat(0.4 * d);
  p.add('head', 0.14 * d * s.swagger);
  p.add('chest', 0.05 * d, 0, 0.05 * Math.sin(Math.PI * B) * s.swagger);
  p.root(0.035 * Math.sin(Math.PI * B) * s.swagger, 0, 0);
}

// ── Move library ────────────────────────────────────────────────────
// Each move: (pose, b = beats since the move started, B = absolute beat,
// style) → mutates pose. Written for a dancer whose opponent is on their
// left (+x); the controller mirrors for the other side when `faceFoe`.
export const MOVES = {
  groove(p, b, B, s) {
    groove(p, B, s);
    const sw = Math.sin(Math.PI * B);
    p.add('armL', -0.3 * sw, 0, 0.1 * onBeat(B)); p.add('armR', 0.3 * sw, 0, -0.1 * onBeat(B));
    p.add('foreL', -0.45 - 0.2 * onBeat(B)); p.add('foreR', -0.45 - 0.2 * onBeat(B));
  },

  // Tier 1 ─────────────────────────────────────────────
  stepClap(p, b, B, s) {
    groove(p, B, s, 0.7);
    const side = Math.floor(b) % 2 ? -1 : 1;
    const ph = b % 1;
    p.root(side * 0.16 * smooth(ph * 2) - side * 0.08, 0, 0);
    p.bend(side > 0 ? 'R' : 'L', 0.45 * Math.sin(Math.PI * clamp01(ph * 1.6)));
    // Clap on 2 and 4, arms thrown wide on 1 and 3.
    const clap = Math.floor(b) % 2 === 1;
    const k = hitAt(b);
    if (clap) {
      p.set('armL', -1.25, 0, -0.25 + 0.2 * (1 - k)); p.set('armR', -1.25, 0, 0.25 - 0.2 * (1 - k));
      p.set('foreL', -0.55, 0, 0); p.set('foreR', -0.55, 0, 0);
    } else {
      p.set('armL', -0.2, 0, 1.2 * (0.6 + 0.4 * k)); p.set('armR', -0.2, 0, -1.2 * (0.6 + 0.4 * k));
      p.set('foreL', -0.3, 0, 0); p.set('foreR', -0.3, 0, 0);
    }
    p.add('head', 0, side * 0.25, 0);
  },

  armWave(p, b, B, s) {
    groove(p, B, s, 0.8);
    const w = Math.sin(Math.PI * b);
    p.set('armL', -0.15, 0, 2.55 + 0.25 * w); p.set('armR', -0.15, 0, -2.55 + 0.25 * w);
    p.set('foreL', -0.2 + 0.35 * Math.sin(TAU * b), 0, 0.3 * w); p.set('foreR', -0.2 - 0.35 * Math.sin(TAU * b), 0, 0.3 * w);
    p.add('chest', 0, 0, 0.22 * w); p.add('spine', 0, 0, 0.12 * w);
    p.root(0.12 * w, 0, 0);
    p.add('head', 0, 0, -0.18 * w);
  },

  // Tier 2 ─────────────────────────────────────────────
  runningMan(p, b, B, s) {
    const ph = b % 1, side = Math.floor(b) % 2 ? 'R' : 'L', other = side === 'L' ? 'R' : 'L';
    const lift = Math.sin(Math.PI * ph);
    p.add('thigh' + side, -1.35 * lift); p.add('shin' + side, 1.5 * lift); p.add('foot' + side, 0.2 * lift);
    p.add('thigh' + other, 0.35 * lift); p.add('shin' + other, 0.25 * lift);
    p.root(0, -0.08 * (1 - lift) - 0.03, 0);
    const pump = side === 'L' ? 1 : -1;
    p.set('armL', -1.0 * pump * lift - 0.2, 0, 0.25); p.set('armR', 1.0 * pump * lift - 0.2, 0, -0.25);
    p.set('foreL', -1.5, 0, 0); p.set('foreR', -1.5, 0, 0);
    p.add('chest', 0.12, 0.15 * pump * lift, 0);
    p.add('head', 0.1 * hitAt(b), 0, 0);
  },

  cabbagePatch(p, b, B, s) {
    groove(p, B, s, 0.9);
    const c = Math.cos(TAU * b * 0.5), sn = Math.sin(TAU * b * 0.5);
    p.set('armL', -1.1 + 0.35 * sn, 0, -0.35 + 0.3 * c); p.set('armR', -1.1 + 0.35 * sn, 0, 0.35 + 0.3 * c);
    p.set('foreL', -1.2, 0.3, 0); p.set('foreR', -1.2, -0.3, 0);
    p.add('chest', 0.12 * sn, 0.1 * c, 0.18 * c); p.add('spine', 0.08 * sn, 0, 0.1 * c);
    p.root(0.1 * c, 0, 0.05 * sn);
    p.add('head', 0, 0, -0.2 * c);
  },

  // Tier 3 ─────────────────────────────────────────────
  robot(p, b, B, s) {
    // Snap between keyframes every half beat — mechanical on purpose.
    const KEYS = [
      { armL: [-1.57, 0, 0.1], foreL: [-1.57, 0, 0], armR: [0, 0, -0.2], foreR: [-1.57, 0, 0], head: [0, 0.6, 0], chest: [0, 0.3, 0] },
      { armL: [0, 0, 1.57], foreL: [0, 0, 1.4], armR: [0, 0, -1.57], foreR: [0, 0, -1.4], head: [0, 0, 0], chest: [0, 0, 0] },
      { armL: [0, 0, 0.2], foreL: [-1.57, 0, 0], armR: [-1.57, 0, -0.1], foreR: [-1.57, 0, 0], head: [0, -0.6, 0], chest: [0, -0.3, 0] },
      { armL: [-3.0, 0, 0.1], foreL: [0, 0, 0], armR: [0, 0, -1.57], foreR: [0, 0, -1.4], head: [0.3, 0, 0], chest: [0.1, 0, 0] },
    ];
    const step = Math.floor(b * 2), f = smooth(((b * 2) % 1) / 0.18);
    const A = KEYS[(step + 3) % 4], K = KEYS[step % 4];
    for (const j of ['armL', 'foreL', 'armR', 'foreR', 'head', 'chest']) {
      p.set(j, lerp(A[j][0], K[j][0], f), lerp(A[j][1], K[j][1], f), lerp(A[j][2], K[j][2], f));
    }
    p.squat(0.18 + 0.08 * (step % 2));
    p.root(0, 0, 0, 0.25 * Math.sin(Math.PI * step / 2));
  },

  spinPoint(p, b, B, s) {
    if (b < 1.5) {
      const t = smooth(b / 1.5);
      p.root(0, 0.05 * Math.sin(Math.PI * t), 0, (TAU * t) % TAU);
      p.set('armL', -0.6, 0, 0.5); p.set('armR', -0.6, 0, -0.5);
      p.set('foreL', -1.9, 0, 0); p.set('foreR', -1.9, 0, 0);
      p.bend('R', 0.5 * Math.sin(Math.PI * t));
    } else {
      groove(p, B, s, 0.6);
      const k = smooth((b - 1.5) / 0.3);
      p.set('armL', -0.4 * k, 0, 0.14 + 2.2 * k); p.set('foreL', -0.1, 0, 0);
      p.set('armR', -0.4, 0, -0.5); p.set('foreR', -2.1 * k, 0.6, 0);  // hand on hip
      p.add('head', -0.15 * k, 0.5 * k, 0.15 * k);
      p.add('chest', -0.1 * k, 0.2 * k, 0);
      p.add('thighR', 0, 0.3 * k, 0.15 * k);
    }
  },

  // Tier 4 ─────────────────────────────────────────────
  jumpSplit(p, b, B, s) {
    if (b < 1) {                        // wind-up crouch
      const k = smooth(b);
      p.squat(0.55 * k);
      p.set('armL', 0.7 * k, 0, 0.3); p.set('armR', 0.7 * k, 0, -0.3);
      p.add('chest', 0.35 * k);
    } else if (b < 2) {                 // airborne split
      const t = b - 1, air = Math.sin(Math.PI * t);
      p.root(0, 0.75 * air, 0, 0);
      p.set('thighL', -0.2, 0, 1.25 * air); p.set('thighR', -0.2, 0, -1.25 * air);
      p.set('shinL', 0.1, 0, 0); p.set('shinR', 0.1, 0, 0);
      p.set('armL', 0, 0, 2.5 * air + 0.2); p.set('armR', 0, 0, -2.5 * air - 0.2);
      p.set('foreL', 0, 0, 0); p.set('foreR', 0, 0, 0);
      p.add('head', -0.35 * air);
      p.add('chest', -0.25 * air);
    } else {                            // stick the landing, power pose
      const k = smooth((b - 2) / 0.4);
      p.squat(0.5 * (1 - k) + 0.12);
      groove(p, B, s, 0.5 * k);
      p.set('armL', -1.3 * k, 0, 0.3); p.set('armR', -1.3 * k, 0, -0.3);
      p.set('foreL', -1.7 * k, -0.9 * k, 0); p.set('foreR', -1.7 * k, 0.9 * k, 0); // crossed arms
      p.add('chest', -0.12 * k); p.add('head', -0.15 * k, 0, 0.1 * k);
    }
  },

  windmillFreeze(p, b, B, s) {
    if (b < 2) {
      groove(p, B, s, 0.7);
      const a = TAU * b * 0.75;
      p.set('armL', -a, 0, 0.35); p.set('armR', -a - Math.PI, 0, -0.35);
      p.set('foreL', 0, 0, 0); p.set('foreR', 0, 0, 0);
      p.add('chest', 0.15, 0.25 * Math.sin(a), 0);
    } else {
      const k = smooth((b - 2) / 0.35);
      // Drop to one knee, one hand to the sky.
      p.set('thighR', -1.55 * k, 0, 0); p.set('shinR', 2.3 * k, 0, 0); p.set('footR', -0.7 * k, 0, 0);
      p.set('thighL', -0.9 * k, 0, 0.35 * k); p.set('shinL', 1.3 * k, 0, 0);
      p.root(0, -0.46 * k, 0.05 * k, 0);
      p.set('armL', -0.2, 0, 2.7 * k + 0.14); p.set('foreL', 0, 0, 0);
      p.set('armR', -1.0 * k, 0, -0.5); p.set('foreR', -1.2 * k, 0, 0);
      p.add('head', -0.35 * k, -0.3 * k, 0);
      // A tiny tremble so the freeze reads as effort, not a paused frame.
      p.root(0.006 * Math.sin(B * 40), 0, 0);
    }
  },

  // Battle actions ─────────────────────────────────────
  taunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    const k = smooth(b / 0.25);
    p.root(0, 0, 0.12 * k, 0.8 * k);           // square up to the opponent
    if (b < 2) {
      // Point straight at them.
      p.set('armL', -0.1, 0.1, 1.5 * k); p.set('foreL', 0, 0, 0.05);
      p.set('armR', -0.3, 0, -0.55); p.set('foreR', -2.0 * k, 0.8, 0);
      p.add('chest', -0.12 * k, 0.25 * k, 0); p.add('head', -0.1, 0.35 * k, 0);
    } else if (b < 3) {
      // "Come here" — beckoning curl.
      const c = 0.5 + 0.5 * Math.sin(TAU * (b - 2) * 2);
      p.set('armL', -0.9, 0, 0.9); p.set('foreL', -1.6 * c - 0.2, 0, 0);
      p.set('armR', -0.3, 0, -0.55); p.set('foreR', -2.0, 0.8, 0);
      p.add('chest', -0.2, 0.2, 0); p.add('head', -0.2, 0.3, 0);
    } else {
      // Chest puff + head shake.
      p.set('armL', 0.35, 0, 0.55); p.set('foreL', -0.6, 0, 0);
      p.set('armR', 0.35, 0, -0.55); p.set('foreR', -0.6, 0, 0);
      p.add('chest', -0.35, 0.1, 0); p.add('head', -0.25, 0.45 * Math.sin(TAU * b * 2), 0);
      p.add('shL', 0, 0, 0.2 * Math.sin(TAU * b * 2)); p.add('shR', 0, 0, 0.2 * Math.sin(TAU * b * 2));
    }
  },

  dodge(p, b, B, s) {
    const t = clamp01(b / 1.2), duck = Math.sin(Math.PI * t);
    p.squat(0.55 * duck);
    p.add('spine', -0.55 * duck); p.add('chest', -0.35 * duck); p.add('head', -0.4 * duck);
    p.set('armL', 0, 0, 1.6 * duck + 0.14); p.set('armR', 0, 0, -1.6 * duck - 0.14);
    p.root(0, 0, -0.25 * duck, 0);
    if (b > 1.2) groove(p, B, s, smooth((b - 1.2) / 0.5));
  },

  stunned(p, b, B, s) {
    const wob = Math.sin(TAU * b * 0.75);
    p.add('spine', 0.25 * Math.sin(TAU * b), 0, 0.3 * wob);
    p.add('chest', 0.15, 0, 0.2 * wob);
    p.add('head', 0.3, 0.5 * Math.sin(TAU * b), 0.35 * Math.cos(TAU * b));   // dizzy circles
    p.set('armL', -0.6 + 0.8 * Math.sin(TAU * b * 1.3), 0, 0.8 + 0.4 * wob);
    p.set('armR', -0.6 - 0.8 * Math.sin(TAU * b * 1.3), 0, -0.8 + 0.4 * wob);
    p.set('foreL', -0.8, 0, 0); p.set('foreR', -0.8, 0, 0);
    p.squat(0.25 + 0.1 * Math.abs(wob));
    p.root(0.12 * wob, 0, -0.18 * smooth(b / 0.4), 0.3 * wob);
  },

  fumble(p, b, B, s) {
    const t = clamp01(b / 1.5), w = Math.sin(TAU * t * 1.5) * (1 - t);
    p.add('spine', 0.1, 0, 0.45 * w); p.add('chest', 0, 0, 0.25 * w);
    p.set('armL', 0, 0, 1.1 + 0.8 * w); p.set('armR', 0, 0, -1.1 + 0.8 * w);
    p.set('foreL', -0.3, 0, 0.6 * w); p.set('foreR', -0.3, 0, 0.6 * w);
    p.add('head', 0.2, 0.3 * w, 0.2 * w);
    p.bend('L', 0.35 * Math.max(0, w)); p.bend('R', 0.35 * Math.max(0, -w));
    p.root(0.1 * w, 0, 0);
    if (b > 1.2) groove(p, B, s, smooth((b - 1.2) / 0.5) * 0.6);
  },

  whiff(p, b, B, s) {
    const t = clamp01(b / 1.4), lurch = Math.sin(Math.PI * t);
    p.add('spine', 0.5 * lurch); p.add('chest', 0.3 * lurch); p.add('head', 0.4 * lurch);
    p.set('armL', -0.9 * lurch, 0, 0.6); p.set('armR', -0.9 * lurch, 0, -0.6);
    p.add('thighL', -0.6 * lurch); p.add('shinL', 0.5 * lurch);
    p.root(0, -0.05 * lurch, 0.25 * lurch, 0.4);
    if (b > 1.4) groove(p, B, s, smooth((b - 1.4) / 0.5));
  },

  hitReact(p, b, B, s) {
    const t = clamp01(b / 0.9), jolt = Math.sin(Math.PI * t) * (1 - t * 0.3);
    p.add('spine', -0.45 * jolt, 0, 0.1 * jolt); p.add('head', -0.5 * jolt);
    p.set('armL', 0.4 * jolt, 0, 0.9 * jolt + 0.14); p.set('armR', 0.4 * jolt, 0, -0.9 * jolt - 0.14);
    p.root(0, 0, -0.3 * jolt, 0);
  },

  reactOoh(p, b, B, s) {
    groove(p, B, s, 0.3);
    const k = smooth(b / 0.3);
    // Hands on head, leaning back.
    p.set('armL', -0.6 * k, 0, 2.2 * k + 0.14); p.set('foreL', -2.1 * k, 0, 0.4 * k);
    p.set('armR', -0.6 * k, 0, -2.2 * k - 0.14); p.set('foreR', -2.1 * k, 0, -0.4 * k);
    p.add('spine', -0.3 * k); p.add('head', -0.3 * k, 0.2 * Math.sin(TAU * b), 0);
    p.root(0, 0, -0.1 * k, 0);
  },

  cheer(p, b, B, s) {
    groove(p, B, s, 0.8);
    const up = hitAt(b);
    p.set('armL', -0.3, 0, 2.4 + 0.3 * up); p.set('armR', -0.3, 0, -2.4 - 0.3 * up);
    p.set('foreL', -0.4, 0, 0); p.set('foreR', -0.4, 0, 0);
    p.root(0, 0.12 * up, 0, 0);
  },

  victory(p, b, B, s) {
    const beat = Math.floor(b), ph = b % 1, jump = Math.sin(Math.PI * clamp01(ph * 1.4));
    p.root(0, 0.3 * jump, 0, 0);
    p.squat(0.35 * (1 - jump));
    const alt = beat % 2 === 0;
    p.set('armL', -0.2, 0, alt ? 2.8 : 1.2); p.set('armR', -0.2, 0, alt ? -1.2 : -2.8);
    p.set('foreL', alt ? 0 : -1.4, 0, 0); p.set('foreR', alt ? -1.4 : 0, 0, 0);
    p.add('head', -0.35, 0, 0); p.add('chest', -0.2);
    if (b >= 6) { p.set('armL', -0.2, 0, 2.6); p.set('armR', -0.2, 0, -2.6); p.set('foreL', 0, 0, 0); p.set('foreR', 0, 0, 0); }
  },

  defeat(p, b, B, s) {
    const k = smooth(b / 1.2);
    p.add('spine', 0.35 * k); p.add('chest', 0.25 * k); p.add('head', 0.55 * k, 0.15 * Math.sin(Math.PI * B * 0.5), 0);
    p.set('armL', 0.1, 0, 0.08); p.set('armR', 0.1, 0, -0.08);
    p.set('foreL', -0.05, 0, 0); p.set('foreR', -0.05, 0, 0);
    p.add('shL', 0, 0, -0.15 * k); p.add('shR', 0, 0, 0.15 * k);
    p.squat(0.12 * k);
  },

  intro(p, b, B, s) {
    // Head down and still, then snap into a ready stance on beat 4.
    if (b < 3) {
      p.add('head', 0.6); p.add('chest', 0.12);
      p.set('armL', 0, 0, 0.05); p.set('armR', 0, 0, -0.05);
    } else {
      const k = smooth((b - 3) / 0.2);
      p.add('head', 0.6 * (1 - k) - 0.2 * k);
      p.set('armL', -1.0 * k, 0, 0.5 * k); p.set('foreL', -1.8 * k, 0, 0);
      p.set('armR', -1.0 * k, 0, -0.5 * k); p.set('foreR', -1.8 * k, 0, 0);
      p.squat(0.3 * k);
      p.root(0, 0, 0, 0.3 * k);
    }
  },
};

// Face expression per move (the rig maps these to mouth/brow shapes).
const EXPRESSIONS = {
  groove: 'smile', stepClap: 'grin', armWave: 'grin', runningMan: 'focus', cabbagePatch: 'grin',
  robot: 'focus', spinPoint: 'grin', jumpSplit: 'shout', windmillFreeze: 'shout',
  taunt: 'smirk', dodge: 'o', stunned: 'dizzy', fumble: 'o', whiff: 'o', hitReact: 'o',
  reactOoh: 'o', cheer: 'shout', victory: 'shout', defeat: 'sad', intro: 'focus',
};

// ── Controller ──────────────────────────────────────────────────────
export class DanceController {
  // `foeSide`: +1 if the opponent stands on this dancer's left (+x).
  constructor(rig, style, foeSide) {
    this.rig = rig;
    this.style = { swagger: 1, bounce: 1, ...style };
    this.foeSide = foeSide;
    this.cur = { name: 'groove', start: 0, len: Infinity, faceFoe: false };
    this.prev = null;
    this.fadeStart = -Infinity;
    this.fadeLen = 0.3;
    this.queue = [];
    this._pa = new Pose(); this._pb = new Pose();
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

  _switch(entry, beat) {
    this.prev = this.cur;
    this.cur = entry;
    this.fadeStart = beat;
    this.fadeLen = entry.fade ?? 0.3;
  }

  _eval(entry, beat, pose) {
    pose.rest();
    const fn = MOVES[entry.name] || MOVES.groove;
    const b = entry.name === 'groove' ? beat : beat - entry.start;
    fn(pose, Math.max(0, b), beat, this.style);
    // Moves are authored with the opponent on the dancer's left.
    if (entry.faceFoe && this.foeSide < 0) pose.a.set(mirrorPose(pose.a));
    return pose.a;
  }

  update(beat) {
    while (this.queue.length && this.queue[0].start <= beat) this._switch(this.queue.shift(), beat);
    if (this.cur.name !== 'groove' && beat >= this.cur.start + this.cur.len) {
      this._switch({ name: 'groove', start: beat, len: Infinity, faceFoe: false }, beat);
    }
    const a = this._eval(this.cur, beat, this._pa);
    const w = smooth((beat - this.fadeStart) / this.fadeLen);
    if (this.prev && w < 1) {
      const bpose = this._eval(this.prev, beat, this._pb);
      for (let i = 0; i < POSE_SIZE; i++) this.out[i] = bpose[i] + (a[i] - bpose[i]) * w;
    } else {
      this.out.set(a);
    }
    this.rig.applyPose(this.out, J, ROOT);
    this.rig.setExpression(EXPRESSIONS[this.cur.name] || 'smile', beat);
    return this.cur.name;
  }
}
