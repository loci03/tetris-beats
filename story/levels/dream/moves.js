// MECHA-9's move set — the robot, done by an actual robot.
//
// Robot / animatronic vocabulary: servo locks (a joint moves, stops dead,
// holds), right-angle arm frames, ticking (moving in small stops),
// animatronic stutter and overshoot, a mechanical march, piston pumps, a
// robotic moonwalk — plus the things only a machine can do: a head that
// spins all the way round, a waist that rotates 360°, rocket jumps and a
// transformation. Authored with the opponent on the dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, hipHand, wideStance } = kit;

// Servo time: integer steps of `n` per beat; each step moves in the first
// `sharp` of its slot and then holds. Continuous.
const servo = (b, n = 1, sharp = 0.55) => { const t = b * n, k = Math.floor(t); return k + smooth((t - k) / sharp); };
// Interpolate through a list of [..values] on servo steps.
function servoPath(list, t, sharp = 0.55) {
  const n = list.length, k = Math.floor(t), f = t - k;
  const a = list[((k % n) + n) % n], b = list[(((k + 1) % n) + n) % n], u = smooth(f / sharp);
  return a.map((v, i) => lerp(v, b[i], u));
}
// Mechanical overshoot after each servo step (a little wobble as it locks).
const wob = (b, n = 1) => { const f = frac(b * n); return Math.exp(-f * 9) * Math.sin(f * 30) * smooth(f / 0.05); };
const bump = (x, w) => Math.exp(-(x / w) * (x / w));
const ARM = (p, side, a) => p.arm(side, a[0], a[1], a[2], a[3] || 0);
const R = {
  fwdUp: [1.57, 0.05, 1.57, 0], fwdIn: [1.45, -0.05, 1.57, -1.57], sideUp: [0, 1.57, 1.57, 1.57], sideFwd: [0, 1.57, 1.57, 0],
  sideDown: [0, 1.57, 1.57, -1.57], downFwd: [0.05, 0.12, 1.57, 0], back: [-0.5, 0.15, 1.57, 0], fwd: [1.57, 0.05, 0.03],
  side: [0, 1.57, 0.03], up: [3.0, 0.15, 0.03], low: [0.1, 0.18, 0.2],
};

const moves = {
  // ── Base routines ───────────────────────────────────────────────
  // Mechanical march: knees driven to right angles in turn, arms swinging
  // stiff with locked elbows, every position snapping in and holding.
  mechaRobotWalk: seq(2, [
    [0, (p) => { p.foot('R', 0.13); p.foot('L', 0.13, 0.3, 0.12); p.hips(-0.02, -0.06); ARM(p, 'R', [0.8, 0.12, 1.57]); ARM(p, 'L', R.back); p.look(0, 0.15); }, 'snap'],
    [0.5, (p) => { p.foot('R', 0.13); p.foot('L', 0.13); p.hips(0, -0.12); ARM(p, 'R', R.downFwd); ARM(p, 'L', R.downFwd); p.look(0.05, 0.15); }, 'snap'],
    [1, (p) => { p.foot('L', 0.13); p.foot('R', 0.13, 0.3, 0.12); p.hips(0.02, -0.06); ARM(p, 'L', [0.8, 0.12, 1.57]); ARM(p, 'R', R.back); p.look(0, -0.15); }, 'snap'],
    [1.5, (p) => { p.foot('L', 0.13); p.foot('R', 0.13); p.hips(0, -0.12); ARM(p, 'L', R.downFwd); ARM(p, 'R', R.downFwd); p.look(0.05, -0.15); }, 'snap'],
  ], { groove: 0.6, hits: 0.6 }),

  // Servo groove: weight locks from side to side each beat, the arms swap
  // between right-angle frames, the head ticks against the body.
  mechaServoGroove(p, b, B, s) {
    groove(p, B, s, 0.7);
    const side = Math.cos(Math.PI * servo(b, 1, 0.62));
    const tilt = wob(b) * 0.08;
    p.foot('L', 0.2, 0, 0, 0.3 * Math.max(0, -side)); p.foot('R', 0.2, 0, 0, 0.3 * Math.max(0, side));
    p.hips(0.07 * side, -0.12, 0, 0.2 * side);
    const u = 0.5 + 0.5 * side;
    p.arm('L', lerp(1.57, 0, u), lerp(0.05, 1.57, u), 1.57, lerp(0, 1.57, u));
    p.arm('R', lerp(0, 1.57, u), lerp(1.57, 0.05, u), 1.57, lerp(1.57, 0, u));
    p.lean(0, 0, 0, -0.06 * side + tilt);
    p.look(0, -0.3 * side, tilt);
  },

  // Piston pump: fists punching up and down like pistons on the half beat,
  // knees pumping, chest popping.
  mechaPistonPump(p, b, B, s) {
    groove(p, B, s, 0.8);
    const st = Math.cos(Math.PI * servo(b, 1, 0.6)), u = 0.5 + 0.5 * st;
    p.foot('L', 0.19, 0, 0, 0.45 * u); p.foot('R', 0.19, 0, 0, 0.45 * (1 - u));
    p.hips(0.04 * st, -0.13 - 0.03 * Math.abs(st), 0, 0.12 * st);
    p.arm('L', lerp(0.8, 2.4, u), lerp(0.7, 0.35, u), lerp(1.6, 0.3, u), 0); p.arm('R', lerp(2.4, 0.8, u), lerp(0.35, 0.7, u), lerp(0.3, 1.6, u), 0);
    p.lean(0.04, 0.08 * Math.abs(st), 0.1 * st);
    p.look(-0.1, 0.12 * st);
  },

  // Circuit: an animatronic loop — each arm rotates through right-angle
  // frames like clock hands, one beat per frame, hips locking with it.
  mechaCircuit(p, b, B, s) {
    groove(p, B, s, 0.7);
    const F = [R.downFwd, R.sideFwd, R.sideUp, R.fwdUp];
    const l = servoPath(F, b, 0.6), r = servoPath(F, b + 2, 0.6);
    ARM(p, 'L', l); ARM(p, 'R', r);
    const yaw = 0.25 * Math.sin(Math.PI / 2 * servo(b, 1, 0.6));
    wideStance(p, 0.2);
    p.hips(0, -0.12, 0, yaw);
    p.look(0.03 + 0.05 * wob(b), -yaw * 1.5);
  },

  // Signature (count 3): targeting — one hand at the visor, the other arm
  // locked out at the rival.
  mechaAccent(p, b, B, s) {
    groove(p, B, s, 0.6);
    wideStance(p, 0.23);
    p.hips(0.02, -0.14, 0, 0.3);
    p.arm('L', 0.35, 1.45, 0.03); p.wrist('L', 0, -0.2);
    p.arm('R', 2.0, 0.6, 2.5, -1.0);
    p.lean(0, -0.1, 0.1); p.look(-0.05, 0.4, 0.1);
  },

  // ── Tier 1 ──────────────────────────────────────────────────────
  // The robot: right-angle frames snapping on every half beat, the head
  // turning on its own, knees locking with each hit.
  mechaRobot: seq(4, [
    [0, (p) => { wideStance(p, 0.2); p.hips(0, -0.1); ARM(p, 'L', R.fwdUp); ARM(p, 'R', R.downFwd); p.look(0, 0.5); }, 'snap'],
    [1, (p) => { wideStance(p, 0.2); p.hips(0, -0.12, 0, 0.25); ARM(p, 'L', R.sideFwd); ARM(p, 'R', R.sideFwd); p.look(0, 0); }, 'snap'],
    [2, (p) => { wideStance(p, 0.2); p.hips(0, -0.1); ARM(p, 'R', R.fwdUp); ARM(p, 'L', R.downFwd); p.look(0, -0.5); }, 'snap'],
    [3, (p) => { wideStance(p, 0.22); p.hips(0, -0.14, 0, -0.25); ARM(p, 'L', R.fwd); ARM(p, 'R', R.fwd); p.look(0.05, 0); }, 'snap'],
  ], { groove: 0.3, hits: 0.6 }),

  // Servo wave: a wave runs fingertip to fingertip — but in locked steps,
  // one joint at a time, four clicks a beat.
  mechaServoWave(p, b, B, s) {
    groove(p, B, s, 0.5);
    const st = servo(b, 4, 0.65), w = 0.5 - 0.5 * Math.cos(Math.PI * st / 8);
    const k = (u) => bump(u - w, 0.11);
    wideStance(p, 0.21);
    p.hips(0.06 * (1 - 2 * w), -0.12 - 0.03 * k(0.5), 0, 0.1 * (1 - 2 * w));
    p.arm('L', 0.2 * k(0.26), 1.4 + 0.5 * k(0.26) - 0.3 * k(0.12), 1.57 * k(0.12) + 0.05, 1.57);
    p.wrist('L', 0, 1.2 * k(0));
    p.arm('R', 0.2 * k(0.74), 1.4 + 0.5 * k(0.74) - 0.3 * k(0.88), 1.57 * k(0.88) + 0.05, 1.57);
    p.wrist('R', 0, 1.2 * k(1));
    p.shrug(0.35 * k(0.4), 0.35 * k(0.6));
    p.add('chest', -0.14 * k(0.5), 0, 0.08 * (k(0.4) - k(0.6)));
    p.look(0, 0.4 * (0.5 - w));
  },

  // ── Tier 2 ──────────────────────────────────────────────────────
  // Animatronic: a theme-park robot waving hello — the head snaps round
  // and wobbles as it locks, the arm climbs in stutters and waves stiffly.
  mechaAnimatronic(p, b, B, s) {
    groove(p, B, s, 0.4);
    const head = servoPath([[0, 0], [0.75, 0.1], [0.75, -0.15], [-0.5, 0.05], [-0.5, 0.15], [0.2, 0], [0.2, -0.1], [0, 0]], b * 2, 0.25);
    const w = wob(b, 2);
    wideStance(p, 0.18);
    p.hips(0, -0.1, 0, 0.12 * Math.sign(head[0]) * Math.min(1, Math.abs(head[0]) * 2));
    const lift = Math.min(1, servo(b, 2, 0.25) / 4);
    const wave = Math.sin(TAU * servo(b, 4, 0.3) / 2) * smooth((b - 2) / 0.2);
    p.arm('L', 0.1 + 0.2 * lift, 0.2 + 1.37 * lift, 0.1 + 1.47 * lift, 1.57 * lift);
    p.wrist('L', 0, 0.6 * wave);
    p.arm('R', 0.15, 0.2, 0.3 + 0.1 * w);
    p.look(head[1] + 0.06 * w, head[0] + 0.08 * w, 0.06 * w);
    p.lean(0, -0.05, 0, 0.04 * w);
  },

  // Ticking: sinks to a low squat in eight ticks, arms rising frame by
  // frame, then ticks all the way back up.
  mechaTicking(p, b, B, s) {
    groove(p, B, s, 0.3);
    const st = servo(b, 4, 0.6), u = 1 - Math.abs(((st / 8) % 2) - 1);
    p.foot('L', 0.2 + 0.08 * u); p.foot('R', 0.2 + 0.08 * u);
    p.hips(0, -0.08 - 0.42 * u, 0.02 * u);
    p.arm('L', 0.1 + 1.47 * u, 0.3 + 1.0 * u, 0.2 + 1.37 * u, 0); p.arm('R', 0.1 + 1.47 * u, 0.3 + 1.0 * u, 0.2 + 1.37 * u, 0);
    p.wrist('L', 0, 0.5 * Math.sin(Math.PI * st)); p.wrist('R', 0, -0.5 * Math.sin(Math.PI * st));
    p.lean(0.12 * u, 0.05);
    p.look(-0.1 * u + 0.04 * wob(b, 4), 0.2 * Math.sin(Math.PI * st / 2));
  },

  // ── Tier 3 ──────────────────────────────────────────────────────
  // Laser eyes: hands frame the visor like goggles, the head sweeps the
  // room left to right, then snaps onto the rival and zaps.
  mechaLaserEyes(p, b, B, s) {
    groove(p, B, s, 0.5);
    const sweep = b < 2.5 ? Math.sin(Math.PI * b / 1.25 - Math.PI / 2) * -1 : 1;
    const lock = smooth((b - 2.5) / 0.2), zap = Math.sin(Math.PI * clamp01((b - 2.75) / 0.5));
    wideStance(p, 0.25);
    p.hips(0, -0.16 - 0.04 * zap, 0.05 * zap, 0.25 * lerp(sweep * 0.6, 1, lock));
    p.arm('L', 2.0, 0.75, 2.5, -0.9); p.arm('R', 2.0, 0.75, 2.5, -0.9);
    p.wrist('L', 0.3, -0.3); p.wrist('R', 0.3, -0.3);
    p.look(-0.05 + 0.1 * zap, lerp(0.7 * sweep, 0.55, lock));
    p.lean(0.08 * zap, 0.1 * zap - 0.05);
  },

  // Moonbot: a robotic moonwalk backwards — one foot flat and gliding, the
  // other on its toes — arms swinging stiff, then it rolls forward to its
  // mark on locked legs.
  mechaMoonbot(p, b, B, s) {
    groove(p, B, s, 0.4);
    if (b < 3) {
      const step = Math.floor(b), ph = b - step, z0 = -0.13 * b;
      const toe = step % 2 === 0 ? 'R' : 'L', flat = toe === 'R' ? 'L' : 'R';
      const sw = smooth(ph / 0.8);
      p.foot(flat, 0.11, 0, z0 + 0.14 - 0.28 * sw, 0);
      p.foot(toe, 0.11, 0.01, z0 - 0.1, 0.7 * (1 - smooth((ph - 0.8) / 0.2)));
      p.hips(0, -0.1, z0 - 0.02);
      const a = Math.cos(Math.PI * servo(b, 1, 0.6));
      p.arm('L', 0.6 * a, 0.12, 1.57); p.arm('R', -0.6 * a, 0.12, 1.57);
      p.look(0, 0.2 * a);
    } else {
      const t = smooth((b - 3) / 0.8), z = -0.39 * (1 - t);
      p.foot('L', 0.12, 0, z + 0.02); p.foot('R', 0.12, 0, z - 0.02);
      p.hips(0, -0.06, z + 0.03 * Math.sin(Math.PI * t));
      p.arm('L', 0.4 * t, 0.4 + 1.17 * t, 1.57 * t, 1.57 * t); p.arm('R', 0.4 * t, 0.4 + 1.17 * t, 1.57 * t, 1.57 * t);
      p.lean(-0.06 * Math.sin(Math.PI * t));
    }
  },

  // ── Tier 4 ──────────────────────────────────────────────────────
  // Power slide: drops to its knees and slides forward, arms swept back
  // like jet wings, then powers up in clicks and stands.
  mechaPowerSlide(p, b, B, s) {
    phased(p, b, B, s, [
      [0.75, (p, b) => {
        const t = smooth(b / 0.75);
        p.foot('L', 0.15, 0.08 * Math.sin(Math.PI * t), -0.15 * t); p.foot('R', 0.15, 0.08 * Math.sin(Math.PI * t + 1), -0.15 * t);
        p.hips(0, -0.05 - 0.2 * t, -0.1 * t);
        p.arms(0.4 - 0.9 * t, 0.4, 0.3); p.lean(0.3 * t);
      }],
      [2.2, (p, b) => {
        const t = smooth((b - 0.75) / 1.45), z = -0.15 + 0.5 * t;
        p.foot('L', 0.17, 0.02, z - 0.42, 0.9); p.foot('R', 0.17, 0.02, z - 0.42, 0.9);
        p.hips(0, -0.5, z);
        p.lean(-0.35 * smooth((b - 0.75) / 0.3), -0.2);
        p.arm('L', -0.7, 0.55, 0.15); p.arm('R', -0.7, 0.55, 0.15);
        p.look(-0.4);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4 * smooth((b - 3.2) / 0.4));
        const st = clamp01(servo(b - 2.2, 4, 0.35) / 6);
        p.foot('L', 0.17 - 0.03 * st, 0.02 * (1 - st), lerp(-0.07, 0.02, st), 0.9 * (1 - st)); p.foot('R', 0.17 - 0.03 * st, 0.02 * (1 - st), lerp(-0.07, -0.02, st), 0.9 * (1 - st));
        p.hips(0, -0.5 + 0.38 * st, 0.35 * (1 - st));
        p.lean(-0.35 * (1 - st), -0.2 * (1 - st) - 0.1 * st);
        p.arm('L', lerp(-0.7, 0.3, st), lerp(0.55, 2.5, st), 0.1); p.arm('R', lerp(-0.7, 0.3, st), lerp(0.55, 2.5, st), 0.1);
        p.look(-0.4 * (1 - st) - 0.2 * st);
      }],
    ]);
  },

  // Rocket jump: crouches to charge, blasts straight up with arms pinned
  // like fins, and comes down in a three-point landing.
  mechaRocketJump(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b), sh = Math.sin(B * 60) * 0.006 * k;
        wideStance(p, 0.17);
        p.hips(sh, -0.04 - 0.32 * k, -0.03 * k);
        p.arms(-0.2, 0.25 + 0.2 * k, 0.1); p.lean(0.25 * k, 0.1 * k); p.look(0.15 * k);
      }],
      [2.2, (p, b) => {
        const t = (b - 1) / 1.2, air = Math.sin(Math.PI * t), k = smooth(t / 0.12);
        p.hips(0, lerp(-0.36, -0.02, k) + 1.15 * air, 0);
        const fl = Math.max(0, 1.15 * air - 0.02);
        p.foot('L', 0.08, fl, 0, 0.6 * air); p.foot('R', 0.08, fl, 0, 0.6 * air);
        p.arms(-0.15, 0.22, 0.05); p.look(-0.3 * air);
      }],
      [3.2, (p, b) => {
        const k = smooth((b - 2.2) / 0.2);
        p.foot('L', 0.22, 0, 0.16); p.foot('R', 0.16, 0.02, -0.4 * k, 0.9 * k);
        p.hips(0, -0.1 - 0.38 * k, -0.04);
        p.arm('R', 0.95 * k, 0.35, 0.1); p.arm('L', -0.4, 0.9 * k, 0.4);
        p.lean(0.35 * k, 0.15 * k); p.look(0.1 * k - 0.35 * smooth((b - 2.6) / 0.3), 0.3 * smooth((b - 2.6) / 0.3));
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const st = clamp01(servo(b - 3.2, 4, 0.35) / 3);
        p.foot('L', 0.22 - 0.02 * st, 0, 0.16 * (1 - st)); p.foot('R', 0.16 + 0.04 * st, 0.02 * (1 - st), -0.4 * (1 - st), 0.9 * (1 - st));
        p.hips(0, -0.48 + 0.34 * st, -0.04);
        hipHand(p, 'L'); hipHand(p, 'R');
        p.lean(0.35 * (1 - st), 0.15 * (1 - st) - 0.15 * st); p.look(-0.15 * st, 0.3 * (1 - st));
      }],
    ]);
  },

  // ── ★ Branch moves ──────────────────────────────────────────────
  // Breakdown: a malfunction — the body judders, the head spins all the
  // way round, the arms go limp, sparks — and a hard reboot into a pose.
  mechaBreakdown(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b) => {
        const j = Math.sin(TAU * b * 3) * 0.5 + Math.sin(TAU * b * 1.7) * 0.5, k = smooth(b / 0.3);
        wideStance(p, 0.2);
        p.hips(0.03 * j * k, -0.12 - 0.03 * Math.abs(j) * k, 0, 0.15 * j * k);
        p.arm('L', 0.6 + 0.4 * j, 1.0 - 0.3 * j, 1.0 + 0.6 * j, 0.6); p.arm('R', 0.6 - 0.4 * j, 1.0 + 0.3 * j, 1.0 - 0.6 * j, 0.6);
        p.look(0.15 * j * k, 0.3 * j * k, 0.2 * j * k);
      }],
      [2.5, (p, b) => {
        const t = smooth((b - 1.5) / 1.0);
        wideStance(p, 0.2);
        p.hips(0, -0.18, 0);
        p.arms(0.05, 0.25, 0.1); p.shrug(-0.15);
        p.lean(0.12, 0.1);
        p.look(0.1, TAU * t);
      }],
      [3, (p, b) => {
        const k = smooth((b - 2.5) / 0.25);
        wideStance(p, 0.2);
        p.hips(0, -0.18 - 0.12 * k, 0);
        p.arms(0.05, 0.25, 0.1); p.shrug(-0.15 - 0.1 * k);
        p.lean(0.12 + 0.3 * k, 0.1 + 0.15 * k); p.look(0.1 + 0.4 * k, TAU);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 3) / 0.35);
        wideStance(p, 0.24);
        p.hips(0, -0.3 + 0.14 * k, 0, 0.25 * k);
        ARM(p, 'L', [lerp(0.05, 0, k), lerp(0.25, 1.57, k), lerp(0.1, 1.57, k), lerp(0, 1.57, k)]);
        ARM(p, 'R', [lerp(0.05, 1.57, k), lerp(0.25, 0.05, k), lerp(0.1, 1.57, k), 0]);
        p.lean(0.42 * (1 - k), 0.25 * (1 - k) - 0.1 * k); p.look(0.5 * (1 - k) - 0.1 * k, TAU + 0.35 * k);
      }],
    ]);
  },

  // Rocket punch: winds up, lunges and fires a straight at the rival, a
  // second one, an uppercut, and stomps.
  mechaRocketPunch(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.8);
        p.foot('L', 0.16, 0, 0.1); p.foot('R', 0.2, 0, -0.1, 0.3 * k);
        p.hips(-0.04 * k, -0.18 * k - 0.04, -0.04 * k, -0.35 * k);
        p.arm('L', 1.0, 0.3, 2.0, -0.6); p.arm('R', -0.4 * k + 0.3, 0.5, 1.9, -0.3);
        p.lean(0.1, 0.05, -0.2 * k); p.look(0.05, 0.6 * k);
      }],
      [2, (p, b) => {
        const t = smooth((b - 1) / 0.3), rec = smooth((b - 1.5) / 0.45);
        p.foot('L', 0.2, 0, 0.18); p.foot('R', 0.2, 0, -0.12, 0.4);
        p.hips(0.08 * t, -0.22, 0.06 * t, 0.6 * t - 0.35 * (1 - t));
        p.arm('L', lerp(0.3, 1.0, rec), lerp(1.5, 0.3, rec), lerp(0.03, 2.0, rec), -0.6 * rec);
        p.arm('R', 1.0, 0.3, 2.0, -0.6);
        p.lean(0.12 * t, 0.06, 0.25 * t); p.look(0, 0.5);
      }],
      [3, (p, b) => {
        const t = smooth((b - 2) / 0.3), u = smooth((b - 2.5) / 0.35);
        p.foot('L', 0.2, 0, 0.18); p.foot('R', 0.2, 0, -0.12, 0.4);
        p.hips(0.05, -0.22 + 0.1 * u, 0.05, 0.3 - 0.3 * u);
        p.arm('R', lerp(1.0, lerp(1.3, 2.9, u), t), lerp(0.3, lerp(-0.7, 0.4, u), t), lerp(2.0, lerp(0.05, 1.2, u), t), -0.6 * (1 - t));
        p.arm('L', 1.0, 0.3, 2.0, -0.6);
        p.lean(0.1 - 0.15 * u, 0.06 - 0.15 * u, -0.25 * t + 0.25 * u); p.look(-0.25 * u, 0.4 - 0.3 * u);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 3) / 0.15), st = Math.sin(Math.PI * clamp01((b - 3) / 0.3));
        p.foot('L', 0.24); p.foot('R', 0.24, 0.15 * st);
        p.hips(0, -0.16 - 0.06 * k, 0, 0.2);
        p.arm('L', 1.0, 0.6, 1.9, -0.8); p.arm('R', 1.0, 0.6, 1.9, -0.8);
        p.lean(0.05, 0.1); p.look(0.05, 0.4);
      }],
    ]);
  },

  // Overdrive: the waist spins two full turns, arms out like rotor
  // blades, legs planted — then a stomp and a power pose.
  mechaOverdrive(p, b, B, s) {
    phased(p, b, B, s, [
      [0.5, (p, b) => {
        const k = smooth(b / 0.5);
        wideStance(p, 0.2 + 0.06 * k); p.hips(0, -0.12 - 0.06 * k);
        p.arm('L', 0.05, 0.3 + 1.27 * k, 0.03); p.arm('R', 0.05, 0.3 + 1.27 * k, 0.03);
      }],
      [2.75, (p, b) => {
        const t = smooth((b - 0.5) / 2.25);
        wideStance(p, 0.26); p.hips(0, -0.18 + 0.02 * Math.sin(TAU * b * 2));
        p.add('spine', 0, TAU * 2 * t, 0);
        p.arm('L', 0.05, 1.57 + 0.1 * Math.sin(TAU * b * 2), 0.03); p.arm('R', 0.05, 1.57 - 0.1 * Math.sin(TAU * b * 2), 0.03);
        p.look(-0.05);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 2.75) / 0.4), st = Math.sin(Math.PI * clamp01((b - 2.75) / 0.35));
        wideStance(p, 0.26); p.hips(0, -0.18 - 0.1 * st);
        p.add('spine', 0, TAU * 2, 0);
        p.arm('L', 0.3, 2.6 * k + 1.57 * (1 - k), 1.2 * k, 1.57 * k); p.arm('R', 0.3, 2.6 * k + 1.57 * (1 - k), 1.2 * k, 1.57 * k);
        p.lean(0, -0.15 * k); p.look(-0.25 * k);
      }],
    ]);
  },

  // ★★ SOLO — TRANSFORM: folds into a tight block, unfolds limb by limb
  // with mechanical clicks, spins its waist round once, and locks into the
  // hero pose.
  mechaTransform(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.6);
        p.foot('L', 0.12, 0, 0.04, 0.5 * k); p.foot('R', 0.12, 0, 0.04, 0.5 * k);
        p.hips(0, -0.05 - 0.48 * k, 0);
        p.arm('L', 2.2 * k, 0.3, 2.4 * k, -1.3 * k); p.arm('R', 2.2 * k, 0.3, 2.4 * k, -1.3 * k);
        p.lean(0.5 * k, 0.2 * k); p.look(0.5 * k);
      }],
      [2.5, (p, b) => {
        const st = servo(b - 1, 2.67, 0.9);                  // 4 clicks over 1.5 beats
        const c = (i) => clamp01(st - i);
        p.foot('L', 0.12 + 0.12 * c(1), 0, 0.04, 0.5 * (1 - c(1))); p.foot('R', 0.12 + 0.12 * c(0), 0, 0.04, 0.5 * (1 - c(0)));
        p.hips(0, -0.53 + 0.36 * clamp01(st / 2), 0);
        p.arm('R', lerp(2.2, 3.0, c(2)), lerp(0.3, 0.2, c(2)), lerp(2.4, 0.05, c(2)), lerp(-1.3, 0, c(2)));
        p.arm('L', lerp(2.2, 0.05, c(3)), lerp(0.3, 1.57, c(3)), lerp(2.4, 0.03, c(3)), lerp(-1.3, 0, c(3)));
        p.lean(0.5 * (1 - clamp01(st / 2)), 0.2 * (1 - clamp01(st / 2)));
        p.look(0.5 * (1 - c(0)) + 0.05 * wob(b - 1, 2.67), 0.2 * c(3));
      }],
      [3.25, (p, b) => {
        const t = smooth((b - 2.5) / 0.75);
        wideStance(p, 0.24); p.hips(0, -0.17);
        p.add('spine', 0, TAU * t, 0);
        p.arm('R', 3.0 - 1.43 * t, 0.2 + 1.37 * t, 0.05); p.arm('L', 0.05, 1.57, 0.03);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3.25) / 0.35);
        wideStance(p, 0.26); p.hips(0, -0.17 - 0.06 * k);
        p.add('spine', 0, TAU, 0);
        p.arm('L', lerp(0.05, 0.3, k), lerp(1.57, 2.5, k), lerp(0.03, 1.4, k), 1.57 * k);
        p.arm('R', lerp(1.57, 0.3, k), lerp(1.57, 2.5, k), lerp(0.05, 1.4, k), 1.57 * k);
        p.lean(-0.05, -0.18 * k); p.look(-0.3 * k);
      }],
    ]);
  },

  // ── Intro / taunt / victory ─────────────────────────────────────
  // Boot-up: slumped and dark, the head snaps up as the eyes come on, the
  // arms calibrate one by one, and it locks a target on you.
  mechaIntro(p, b, B, s) {
    groove(p, B, s, 0.3 * smooth((b - 1) / 0.5));
    wideStance(p, 0.19);
    const up = smooth((b - 0.5) / 0.3), cL = win(b, 0.9, 2.1, 0.4), cR = win(b, 1.6, 2.8, 0.4), aim = smooth((b - 2.7) / 0.35);
    p.hips(0, -0.18 + 0.06 * up, 0, 0.35 * aim);
    p.lean(0.3 * (1 - up), 0.25 * (1 - up));
    p.look(0.5 * (1 - up) + 0.06 * wob(b - 0.5), 0.45 * aim);
    p.shrug(-0.15 * (1 - up));
    p.arm('L', lerp(0.05, 0, cL) + 0.3 * aim, lerp(0.15, 1.57, cL) + 1.3 * aim * (1 - cL), lerp(0.1, 1.57, cL) * (1 - aim) + 0.03 * aim, 1.57 * cL);
    p.arm('R', lerp(0.05, 0, cR) + 1.55 * aim, lerp(0.15, 1.57, cR) + 0.4 * aim, lerp(0.1, 1.57, cR) * (1 - aim) + 2.3 * aim, 1.57 * cR - 1.1 * aim);
  },

  // Hand cannon: the arm locks out at you, the other hand braces the
  // wrist, it charges (shaking) and fires twice with recoil, then blows
  // the smoke off the barrel.
  mechaLaser(p, b, B, s) {
    groove(p, B, s, 0.3);
    p.foot('L', 0.18, 0, 0.12); p.foot('R', 0.22, 0, -0.08, 0.3);
    const aim = smooth(b / 0.35), sh = Math.sin(B * 70) * 0.008 * win(b, 0.5, 1.5, 0.2);
    const rec = Math.exp(-Math.max(0, b - 1.5) * 6) * smooth((b - 1.5) / 0.05) + Math.exp(-Math.max(0, b - 2.5) * 6) * smooth((b - 2.5) / 0.05);
    const blow = smooth((b - 3.1) / 0.3);
    p.hips(sh, -0.16, 0.04 - 0.06 * rec, 0.6 * aim);
    p.arm('L', lerp(0.4, 0.55, blow) + 0.25 * rec, lerp(0.3, 1.35, aim) * (1 - blow) + 0.4 * blow, lerp(0.3, 0.03, aim) + 1.9 * blow, -0.9 * blow);
    p.arm('R', 1.3 * aim, -0.5 * aim * (1 - blow) + 0.2 * blow, 0.9 * aim * (1 - blow) + 0.3, -0.4);
    p.lean(0.06 * aim - 0.08 * rec, -0.05 - 0.1 * rec, 0.15 * aim);
    p.look(0.05 + 0.15 * blow, 0.45 * aim - 0.2 * blow);
  },

  // Victory: raise-the-roof pumps in servo clicks, then a double flex.
  mechaVictory(p, b, B, s) {
    groove(p, B, s, 0.7);
    wideStance(p, 0.24);
    const flex = win(((b % 8) + 8) % 8, 4, 8, 0.4), pump = 0.5 - 0.5 * Math.cos(Math.PI * servo(b, 1, 0.6));
    p.hips(0, -0.14, 0);
    p.arm('L', 0.3, 2.3 + 0.4 * pump * (1 - flex) - 0.9 * flex, 1.3 * (1 - flex) + 1.9 * flex, 1.57); p.arm('R', 0.3, 2.3 + 0.4 * pump * (1 - flex) - 0.9 * flex, 1.3 * (1 - flex) + 1.9 * flex, 1.57);
    p.lean(0, -0.15); p.look(-0.3 + 0.1 * flex, 0.2 * Math.sin(Math.PI * servo(b, 1)));
  },
};

const moveMeta = {
  labels: {
    mechaRobot: 'THE ROBOT', mechaServoWave: 'SERVO WAVE', mechaAnimatronic: 'ANIMATRONIC', mechaTicking: 'TICKING',
    mechaLaserEyes: 'LASER EYES', mechaMoonbot: 'MOONBOT', mechaPowerSlide: 'POWER SLIDE', mechaRocketJump: 'ROCKET JUMP',
    mechaBreakdown: 'BREAKDOWN', mechaRocketPunch: 'ROCKET PUNCH', mechaOverdrive: 'OVERDRIVE', mechaTransform: 'TRANSFORM',
  },
  expressions: {
    mechaRobotWalk: 'focus', mechaServoGroove: 'smile', mechaPistonPump: 'grin', mechaCircuit: 'focus', mechaAccent: 'focus',
    mechaRobot: 'focus', mechaServoWave: 'smile', mechaAnimatronic: 'grin', mechaTicking: 'focus',
    mechaLaserEyes: 'angry', mechaMoonbot: 'smirk', mechaPowerSlide: 'shout', mechaRocketJump: 'shout',
    mechaBreakdown: 'dizzy', mechaRocketPunch: 'angry', mechaOverdrive: 'shout', mechaTransform: 'shout',
    mechaIntro: 'focus', mechaLaser: 'angry', mechaVictory: 'joy',
  },
  hits: {
    mechaServoGroove: 0.6, mechaPistonPump: 0.8, mechaCircuit: 0.5, mechaAccent: 0.4, mechaServoWave: 0.3, mechaAnimatronic: 0.3,
    mechaTicking: 0.3, mechaLaserEyes: 0.4, mechaMoonbot: 0.4, mechaPowerSlide: 0.1, mechaRocketJump: 0, mechaBreakdown: 0.2,
    mechaRocketPunch: 0.3, mechaOverdrive: 0.2, mechaTransform: 0, mechaIntro: 0.3, mechaLaser: 0.3, mechaVictory: 0.6,
  },
  fnGroove: { mechaPowerSlide: 0, mechaRocketJump: 0, mechaBreakdown: 0, mechaRocketPunch: 0, mechaOverdrive: 0, mechaTransform: 0 },
  stiff: { mechaRobotWalk: 1.4, mechaRobot: 1.7, mechaServoGroove: 1.3, mechaCircuit: 1.4, mechaPistonPump: 1.4, mechaAnimatronic: 1.4, mechaTicking: 1.5, mechaServoWave: 1.3 },
};

export default { moves, moveMeta };
