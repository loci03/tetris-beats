// SARGE's moves — krump (stomps, arm swings, chest pops, jabs, buck hops,
// the tantrum, "get off me", the kill-off) and drill-yard PT (march,
// salute, double time, jumping jacks, about face). The song is half-time
// (72.6 BPM grid, bouncing on every 145 BPM pulse), so half-beat keys are
// real hits too. Authored with the opponent on the dancer's left (+x).
import { kit } from '../../dance.js';

const { seq, groove, win, smooth, lerp, frac, clamp01, TAU, phased, evalMove, fists, crossArms, wideStance } = kit;

const bump = (x) => Math.sin(Math.PI * clamp01(x));
// Double-biceps flex (forearms up), the salute, fists at the chest.
const flex = (p, side, k = 1) => p.arm(side, 0.2, lerp(0.4, 1.45, k), lerp(1.2, 2.0, k), lerp(-0.4, 1.5, k));
const salute = (p, k = 1) => p.arm('R', lerp(0.1, 2.6, k), lerp(0.2, 0.25, k), lerp(0.5, 1.2, k), lerp(-0.2, -1.4, k));
const chestFists = (p) => { fists(p, 'L', 0.85, 0.15, 2.3); fists(p, 'R', 0.85, 0.15, 2.3); };
const pulse = (b) => Math.pow(0.5 + 0.5 * Math.cos(TAU * b * 2), 4);      // a hit on every half-beat

export const moves = {
  // ── Base routines ───────────────────────────────────────────
  // Krump stomp: knee up on the "and", STOMP on the beat, hammer-fist on
  // the stomping side, the other pulled back; arms out wide on 3.
  sargeStomp: seq(4, [
    [0, (p) => { p.foot('L', 0.24); p.foot('R', 0.22); p.hips(0.02, -0.26, 0.02, 0.1); p.lean(0.26, 0.16, 0.15); fists(p, 'L', 0.35, 0.3, 0.9); fists(p, 'R', -0.35, 0.45, 1.9); p.look(0.15, 0.2); }, 'in'],
    [0.5, (p) => { p.foot('L', 0.22); p.foot('R', 0.2, 0.32, 0.1); p.hips(0.09, -0.12, 0, 0); p.lean(0.12, 0.02, 0); fists(p, 'L', 0.2, 0.45, 1.6); fists(p, 'R', 0.6, 0.35, 1.8); }],
    [1, (p) => { p.foot('L', 0.22); p.foot('R', 0.24); p.hips(-0.02, -0.26, 0.02, -0.1); p.lean(0.26, 0.16, -0.15); fists(p, 'R', 0.35, 0.3, 0.9); fists(p, 'L', -0.35, 0.45, 1.9); p.look(0.15, -0.2); }, 'in'],
    [1.5, (p) => { p.foot('R', 0.22); p.foot('L', 0.2, 0.32, 0.1); p.hips(-0.09, -0.12, 0, 0); p.lean(0.12, 0.02, 0); fists(p, 'R', 0.2, 0.45, 1.6); fists(p, 'L', 0.6, 0.35, 1.8); }],
    [2, (p) => { p.foot('L', 0.26); p.foot('R', 0.24); p.hips(0, -0.3, 0); p.lean(0.12, -0.12); p.arms(0.2, 1.25, 1.5, 0.6); p.shrug(0.2); p.look(-0.15); }, 'in'],
    [2.5, (p) => { p.foot('L', 0.24); p.foot('R', 0.2, 0.3, 0.1); p.hips(0.09, -0.13, 0); p.lean(0.14, 0.05); fists(p, 'L', 0.5, 0.35, 1.7); fists(p, 'R', 0.5, 0.35, 1.7); }],
    [3, (p) => { p.foot('L', 0.24); p.foot('R', 0.24); p.hips(0, -0.28, 0.03); p.lean(0.2, 0.3); chestFists(p); p.shrug(0.18); p.look(0.25); }, 'in'],
    [3.5, (p) => { p.foot('R', 0.24); p.foot('L', 0.2, 0.32, 0.1); p.hips(-0.09, -0.12, 0); p.lean(0.12, 0.02); fists(p, 'L', -0.1, 0.4, 1.7); fists(p, 'R', 0.4, 0.35, 1.6); }],
  ], { groove: 0.8, hits: 1 }),

  // March in place: knee up on the beat, down on the "and", stiff arms
  // swinging opposite, chin up — eyes RIGHT on 4.
  sargeMarch: seq(4, [
    [0, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0.46, 0.2); p.hips(0.06, -0.06, 0); p.arm('L', 0.85, 0.15, 0.15); p.arm('R', -0.55, 0.15, 0.1); p.lean(-0.04, -0.1); p.look(-0.08); }],
    [0.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.12); p.hips(0, -0.14, 0); p.arms(0.1, 0.15, 0.15); p.lean(0, -0.08); p.look(-0.06); }, 'in'],
    [1, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0.46, 0.2); p.hips(-0.06, -0.06, 0); p.arm('R', 0.85, 0.15, 0.15); p.arm('L', -0.55, 0.15, 0.1); p.lean(-0.04, -0.1); p.look(-0.08); }],
    [1.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.12); p.hips(0, -0.14, 0); p.arms(0.1, 0.15, 0.15); p.lean(0, -0.08); p.look(-0.06); }, 'in'],
    [2, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0.46, 0.2); p.hips(0.06, -0.06, 0); p.arm('L', 0.85, 0.15, 0.15); p.arm('R', -0.55, 0.15, 0.1); p.lean(-0.04, -0.1); p.look(-0.08); }],
    [2.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.12); p.hips(0, -0.14, 0); p.arms(0.1, 0.15, 0.15); p.lean(0, -0.08); p.look(-0.06, -0.3); }, 'in'],
    [3, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0.46, 0.2); p.hips(-0.06, -0.06, 0); p.arm('R', 0.85, 0.15, 0.15); p.arm('L', -0.55, 0.15, 0.1); p.lean(-0.04, -0.1, -0.15); p.look(-0.1, -0.6); }],
    [3.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.12); p.hips(0, -0.14, 0); p.arms(0.1, 0.15, 0.15); p.lean(0, -0.08); p.look(-0.06, -0.2); }, 'in'],
  ], { groove: 0.6, hits: 0.9 }),

  // Arm swings: the arms wheel in big opposite arcs, each one hammering
  // down past the hip on its beat, a stomp under every hit.
  sargeArmSwing(p, b, B, s) {
    groove(p, B, s, 0.8);
    const c = Math.cos(Math.PI * b), side = Math.sin(Math.PI * b);
    const lift = Math.pow(Math.sin(Math.PI * frac(b)), 1.5);
    const lifted = Math.cos(Math.PI * (b - frac(b))) > 0 ? 'R' : 'L', sgn = lifted === 'R' ? 1 : -1;
    p.foot(lifted === 'R' ? 'L' : 'R', 0.24); p.foot(lifted, 0.24 - 0.04 * lift, 0.24 * lift, 0.06 * lift);
    p.hips(0.08 * sgn * lift, -0.26 + 0.08 * lift, 0.02, 0.25 * side);
    p.arm('L', 1.15 + 1.55 * c, 0.35 + 0.15 * side, 0.5 + 0.4 * (0.5 - 0.5 * c), -0.2);
    p.arm('R', 1.15 - 1.55 * c, 0.35 - 0.15 * side, 0.5 + 0.4 * (0.5 + 0.5 * c), -0.2);
    p.lean(0.28 + 0.08 * (1 - lift), 0.15, 0.3 * side, 0.08 * side);
    p.look(0.18 + 0.1 * (1 - lift), 0.25 * side);
  },

  // Buck hops: low aggressive hops on every pulse, landing hard on the
  // beat, goalpost arms pumping, drifting side to side.
  sargeBuck(p, b, B, s) {
    const f2 = frac(b * 2), air = Math.pow(Math.sin(Math.PI * f2), 1.2);
    const big = 0.5 + 0.5 * Math.cos(TAU * b);                  // bigger hop out of the beat
    const h = air * (0.07 + 0.08 * (1 - big));
    const x = 0.08 * Math.sin(Math.PI * b * 0.5);
    p.footX('L', x + 0.22, h * 1.3, 0.02 + 0.03 * air); p.footX('R', x - 0.22, h * 1.3, 0.02 + 0.03 * air);
    p.hips(x, -0.24 + h * 1.2 - 0.06 * big, 0, 0.15 * Math.sin(Math.PI * b));
    const pump = 0.5 + 0.5 * Math.cos(TAU * b * 2);
    flex(p, 'L', 0.7 + 0.3 * pump); flex(p, 'R', 0.7 + 0.3 * pump);
    p.lean(0.2 + 0.1 * pump, 0.12 + 0.12 * pump, 0.1 * Math.sin(Math.PI * b));
    p.shrug(0.15 * pump);
    p.look(0.15 * pump - 0.05, 0.2 * Math.sin(Math.PI * b));
    groove(p, B, s, 0.4);
  },

  // Accent (count 3): heels together, SALUTE.
  sargeAccent(p, b, B, s) {
    groove(p, B, s, 0.4);
    p.foot('L', 0.09); p.foot('R', 0.09);
    p.hips(0, -0.04, 0);
    salute(p, 1); p.arm('L', 0.0, 0.12, 0.1);
    p.lean(-0.05, -0.15); p.look(-0.12, 0.1);
  },

  // ── Tier 1 ──────────────────────────────────────────────────
  // CHEST POP: planted wide and low, fists together, the chest popping on
  // every pulse — and a double-biceps flex on 3.
  sargeChestPop(p, b, B, s) {
    groove(p, B, s, 0.5);
    const ph = ((b % 4) + 4) % 4, fl = win(ph, 2.6, 3.9, 0.35), pop = pulse(b) * (1 - 0.5 * fl);
    wideStance(p, 0.27);
    p.hips(0, -0.28 + 0.05 * fl, -0.03 * pop, 0.12 * Math.sin(Math.PI * b) * (1 - fl));
    p.add('spine', 0.18 - 0.1 * fl); p.add('chest', 0.32 * pop - 0.06 - 0.2 * fl);
    const m = 1 - fl;
    p.arm('L', lerp(0.65, 0.2, fl), lerp(0.55, 1.45, fl), lerp(1.9, 2.0, fl), lerp(-0.9, 1.5, fl));
    p.arm('R', lerp(0.65, 0.2, fl), lerp(0.55, 1.45, fl), lerp(1.9, 2.0, fl), lerp(-0.9, 1.5, fl));
    p.shrug(0.18 * pop * m + 0.1 * fl);
    p.look(0.25 * m - 0.12 * pop * m - 0.2 * fl, 0.15 * Math.sin(Math.PI * b) * m);
  },

  // SALUTE: snap a salute, hold it with a heel bounce, march two, snap it
  // again turned to the crowd.
  sargeSalute: seq(4, [
    [0, (p) => { p.foot('L', 0.09); p.foot('R', 0.09); p.hips(0, -0.04); salute(p, 1); p.arm('L', 0, 0.12, 0.1); p.lean(-0.05, -0.15); p.look(-0.12); }, 'snap'],
    [1, (p) => { p.foot('L', 0.09, 0, 0, 0.3); p.foot('R', 0.09, 0, 0, 0.3); p.hips(0, -0.02); salute(p, 1); p.arm('L', 0, 0.12, 0.1); p.lean(-0.05, -0.15); p.look(-0.12, 0.08); }],
    [1.5, (p) => { p.foot('L', 0.12); p.foot('R', 0.13, 0.32, 0.12); p.hips(0.06, -0.06); p.arm('L', 0.8, 0.15, 0.15); p.arm('R', -0.5, 0.15, 0.1); p.lean(-0.04, -0.1); }],
    [2, (p) => { p.foot('L', 0.12); p.foot('R', 0.12); p.hips(0, -0.14); p.arms(0.1, 0.15, 0.15); p.lean(0, -0.08); }, 'in'],
    [2.5, (p) => { p.foot('R', 0.12); p.foot('L', 0.13, 0.32, 0.12); p.hips(-0.06, -0.06); p.arm('R', 0.8, 0.15, 0.15); p.arm('L', -0.5, 0.15, 0.1); p.lean(-0.04, -0.1); }],
    [3, (p) => { p.foot('L', 0.09); p.foot('R', 0.09); p.hips(0, -0.05, 0, -0.45); salute(p, 1); p.arm('L', 0, 0.12, 0.1); p.lean(-0.05, -0.15); p.look(-0.15, -0.2); }, 'snap'],
  ], { groove: 0.6, hits: 0.8, loop: false }),

  // ── Tier 2 ──────────────────────────────────────────────────
  // JABS: krump jabs on the pulses — jab, jab, hook, uppercut, double jab,
  // and a chest-pop stomp to finish.
  sargeJabs: seq(4, [
    [0, (p) => { p.foot('L', 0.18, 0, 0.12); p.foot('R', 0.2, 0, -0.1, 0.3); p.hips(0.02, -0.2, 0.02, 0.3); fists(p, 'L', 1.5, 0.05, 0.1); fists(p, 'R', 0.7, 0.2, 2.2); p.lean(0.15, 0.1, 0.2); p.look(0.05, 0.2); }, 'snap'],
    [0.5, (p) => { p.foot('L', 0.18, 0, 0.12); p.foot('R', 0.2, 0, -0.1, 0.4); p.hips(0, -0.22, 0.03, -0.25); fists(p, 'R', 1.5, 0.0, 0.1); fists(p, 'L', 0.7, 0.2, 2.2); p.lean(0.18, 0.12, -0.25); p.look(0.05, -0.1); }, 'snap'],
    [1, (p) => { p.foot('L', 0.18, 0, 0.12); p.foot('R', 0.2, 0, -0.1, 0.3); p.hips(0.03, -0.24, 0.02, 0.4); fists(p, 'L', 1.4, 1.0, 1.5); p.set('armL', -1.4, -0.6, 1.0); fists(p, 'R', 0.7, 0.2, 2.2); p.lean(0.15, 0.1, 0.35); p.look(0.08, 0.3); }, 'snap'],
    [1.5, (p) => { p.foot('L', 0.18, 0, 0.12); p.foot('R', 0.2, 0, -0.1, 0.5); p.hips(-0.02, -0.18, 0.02, -0.3); fists(p, 'R', 1.9, 0.1, 1.9); fists(p, 'L', 0.7, 0.2, 2.2); p.lean(0.0, -0.1, -0.3); p.look(-0.15, -0.1); }, 'snap'],
    [2, (p) => { p.foot('L', 0.18, 0, 0.12); p.foot('R', 0.2, 0, -0.1, 0.3); p.hips(0.02, -0.2, 0.03, 0.35); fists(p, 'L', 1.5, 0.05, 0.1); fists(p, 'R', 0.7, 0.2, 2.2); p.lean(0.15, 0.1, 0.2); p.look(0.05, 0.25); }, 'snap'],
    [2.25, (p) => { p.foot('L', 0.18, 0, 0.12); p.foot('R', 0.2, 0, -0.1, 0.3); p.hips(0.02, -0.18, 0.0, 0.3); fists(p, 'L', 0.8, 0.15, 2.0); fists(p, 'R', 0.7, 0.2, 2.2); p.lean(0.1, 0.05, 0.15); }],
    [2.5, (p) => { p.foot('L', 0.18, 0, 0.12); p.foot('R', 0.2, 0, -0.1, 0.3); p.hips(0.02, -0.21, 0.03, 0.35); fists(p, 'L', 1.5, 0.05, 0.1); fists(p, 'R', 0.7, 0.2, 2.2); p.lean(0.16, 0.12, 0.2); p.look(0.05, 0.25); }, 'snap'],
    [3, (p) => { p.foot('L', 0.25); p.foot('R', 0.25); p.hips(0, -0.32, 0.03, 0); chestFists(p); p.lean(0.25, 0.32); p.shrug(0.2); p.look(0.25); }, 'in'],
  ], { groove: 0.5, hits: 0.8 }),

  // GET OFF ME: hunched and wrapped up tight — then he EXPLODES outward,
  // throwing everybody off, brushes off each shoulder, stomps.
  sargeGetOffMe(p, b, B, s) {
    groove(p, B, s, 0.5);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.8), sh = Math.sin(TAU * b * 4) * k;
        wideStance(p, 0.2);
        p.hips(0.02 * sh, -0.2 - 0.08 * k, -0.04);
        p.arm('L', 0.75, 0.0, 2.1, -1.1); p.arm('R', 0.7, 0.0, 2.1, -1.1);
        p.lean(0.35 * k, 0.3 * k, 0.1 * sh); p.shrug(0.25 * k); p.look(0.35 * k);
      }],
      [2, (p, b) => {
        const t = smooth((b - 1) / 0.25), rec = bump((b - 1.25) / 0.75);
        wideStance(p, 0.28);
        p.hips(0, -0.18 - 0.08 * rec, 0.02);
        p.arms(0.3 - 0.1 * rec, lerp(0.2, 1.5, t) - 0.25 * rec, lerp(2.0, 0.15, t) + 0.5 * rec, 0.2);
        p.lean(-0.18 * t + 0.1 * rec, -0.3 * t + 0.1 * rec); p.look(-0.3 * t + 0.15 * rec); p.shrug(0.1);
      }],
      [3, (p, b) => {
        const u = b - 2, l = 1 - smooth((u - 0.3) / 0.3), r = smooth((u - 0.4) / 0.3);
        const br = Math.sin(TAU * u * 4) * 0.5 + 0.5;
        wideStance(p, 0.24);
        p.hips(0, -0.2, 0, 0.25 * l - 0.25 * r);
        // Right hand brushes the left shoulder, then the left hand the right.
        p.arm('R', lerp(0.5, 1.1, l), lerp(0.35, -0.2, l), lerp(1.6, 2.3 - 0.3 * br, l), lerp(-0.2, -1.0, l));
        p.arm('L', lerp(0.5, 1.1, r), lerp(0.35, -0.2, r), lerp(1.6, 2.3 - 0.3 * br, r), lerp(-0.2, -1.0, r));
        p.look(0.1, 0.45 * l - 0.45 * r, 0.1 * (l - r)); p.lean(0.05, -0.05);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.25);
        p.foot('L', 0.26); p.foot('R', 0.26, 0.2 * bump((b - 2.9) / 0.35));
        p.hips(0, -0.2 - 0.12 * k, 0.03);
        fists(p, 'L', 0.2 - 0.3 * k, 0.4, 1.0); fists(p, 'R', 0.2 - 0.3 * k, 0.4, 1.0);
        p.lean(0.25 * k, 0.2 * k); p.shrug(0.2 * k); p.look(0.25 * k);
      }],
    ]);
  },

  // ── Tier 3 ──────────────────────────────────────────────────
  // PT DRILL: three jumping jacks, then a burpee — drop, hands to the
  // floor, and explode back up.
  sargeJumpingJacks(p, b, B, s) {
    phased(p, b, B, s, [
      [3, (p, b) => {
        const f = frac(b), air = Math.pow(Math.sin(Math.PI * f), 1.2);
        const open = 0.5 - 0.5 * Math.cos(TAU * f);           // wide on the "and"
        const w = 0.1 + 0.26 * open;
        p.foot('L', w, 0.12 * air); p.foot('R', w, 0.12 * air);
        p.hips(0, -0.1 + 0.14 * air - 0.08 * (1 - air), 0);
        p.arms(0.15, 0.2 + 2.65 * open, 0.15);
        p.lean(-0.05 * open, -0.12 * open); p.look(-0.15 * open);
      }],
      [3.55, (p, b) => {
        const k = smooth((b - 3) / 0.4);
        wideStance(p, 0.12 + 0.1 * k);
        p.hips(0, -0.1 - 0.42 * k, -0.08 * k);
        p.lean(0.75 * k, 0.25 * k);
        p.arms(0.15 + 0.55 * k, 0.2, 0.1); p.look(-0.2 * k);
      }],
      [Infinity, (p, b) => {
        const t = clamp01((b - 3.55) / 0.45), air = Math.sin(Math.PI * t);
        const hy = lerp(-0.52, -0.06, smooth(t / 0.4)) + 0.4 * air;
        p.hips(0, hy, -0.08 * (1 - t));
        const fl = Math.max(0, hy + 0.04) * 0.9;
        p.foot('L', 0.18, fl, 0, 0.4 * air); p.foot('R', 0.18, fl, 0, 0.4 * air);
        p.lean(0.75 * (1 - smooth(t / 0.5)), 0.25 * (1 - t) - 0.15 * t);
        p.arms(0.3, lerp(0.2, 2.75, smooth(t / 0.5)), 0.15); p.look(-0.25 * t);
      }],
    ]);
  },

  // TANTRUM: the krump tantrum — fists hammering down twice a beat,
  // stomping on every pulse, head banging, totally possessed.
  sargeTantrum(p, b, B, s) {
    groove(p, B, s, 0.4);
    const h = TAU * b * 2, c = Math.cos(h), sn = Math.sin(h);
    const f2 = frac(b * 2), lift = Math.pow(Math.sin(Math.PI * f2), 1.5);
    const lifted = Math.cos(Math.PI * (b * 2 - f2)) > 0 ? 'R' : 'L', sg = lifted === 'R' ? 1 : -1;
    p.foot(lifted === 'R' ? 'L' : 'R', 0.24); p.foot(lifted, 0.22, 0.2 * lift, 0.05 * lift);
    p.hips(0.07 * sg * lift, -0.28 + 0.06 * lift, 0, 0.2 * Math.sin(Math.PI * b));
    p.arm('L', 1.4 + 0.8 * c, 0.4 + 0.15 * sn, 0.8 + 0.6 * (0.5 - 0.5 * c), -0.3);
    p.arm('R', 1.4 + 0.8 * Math.cos(h + 1.2), 0.4 - 0.15 * sn, 0.8 + 0.6 * (0.5 - 0.5 * Math.cos(h + 1.2)), -0.3);
    p.lean(0.32 + 0.1 * c, 0.2 + 0.15 * sn, 0.2 * Math.sin(Math.PI * b), 0.1 * Math.sin(Math.PI * b));
    p.look(0.3 + 0.15 * Math.cos(h - 0.8), 0.2 * Math.sin(Math.PI * b), 0.1 * sn);
    p.shrug(0.2 * (0.5 + 0.5 * c), 0.2 * (0.5 - 0.5 * c));
  },

  // ── Tier 4 ──────────────────────────────────────────────────
  // GROUND POUND: wind up, tuck jump, land in a deep squat with both fists
  // smashing the floor, roar, rise with the arms spread.
  sargeGroundPound(p, b, B, s) {
    phased(p, b, B, s, [
      [1, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth(b);
        wideStance(p, 0.18);
        p.hips(0, -0.08 - 0.25 * k, -0.04 * k);
        p.arms(0.3 + 2.4 * k, 0.35, 0.4); p.lean(0.2 * k - 0.1 * k * k, -0.05 * k); p.look(-0.2 * k);
      }],
      [2, (p, b) => {
        const t = b - 1, air = Math.sin(Math.PI * t), tuck = Math.pow(air, 1.4);
        const hy = lerp(-0.33, -0.05, smooth(t / 0.3)) + 0.6 * air;
        p.hips(0, hy, 0);
        const fl = Math.max(0, hy + 0.03) * 0.9 + 0.3 * tuck;
        p.foot('L', 0.18 + 0.06 * (1 - tuck), fl, 0.12 * tuck, 0.3 * tuck); p.foot('R', 0.18 + 0.06 * (1 - tuck), fl, 0.12 * tuck, 0.3 * tuck);
        p.arms(2.7 - 0.6 * t, 0.35 + 0.3 * tuck, 0.4 + 0.6 * tuck); p.lean(0.3 * t, 0.15 * t); p.look(0.25 * t);
      }],
      [3, (p, b, B) => {
        const u = b - 2, k = smooth(u / 0.15), tr = 0.008 * Math.sin(B * 45);
        wideStance(p, 0.3);
        p.hips(tr, -0.56 + 0.05 * smooth((u - 0.2) / 0.8), 0.02);
        p.lean(0.75 - 0.3 * smooth((u - 0.4) / 0.6), 0.35 - 0.45 * smooth((u - 0.4) / 0.6));
        fists(p, 'L', 0.95, 0.55, 0.35); fists(p, 'R', 0.95, 0.55, 0.35);
        p.look(0.3 - 0.75 * smooth((u - 0.4) / 0.5)); p.shrug(0.25 * k);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.5);
        const k = smooth((b - 3) / 0.6);
        wideStance(p, 0.3 - 0.04 * k);
        p.hips(0, -0.51 + 0.27 * k, 0.02);
        p.arms(0.25, 0.6 + 0.9 * k, 1.5 - 0.3 * k, 0.6 * k);
        p.lean(0.45 - 0.4 * k, -0.1 - 0.15 * k); p.look(-0.45 + 0.2 * k); p.shrug(0.2);
      }],
    ]);
  },

  // ABOUT FACE: attention, a crisp drill about-face, stamp, look back over
  // the shoulder, about-face again to the front, salute.
  sargeAboutFace(p, b, B, s) {
    phased(p, b, B, s, [
      [0.5, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        p.foot('L', 0.09); p.foot('R', 0.09);
        p.hips(0, -0.04); p.arms(0.0, 0.12, 0.1); p.lean(-0.05, -0.15); p.look(-0.12);
      }],
      [1.4, (p, b) => {
        const t = smooth((b - 0.5) / 0.9);
        p.foot('L', 0.02, 0, 0, 0.5); p.foot('R', 0.09, 0.12 * bump(t) + 0.02, -0.12 * (1 - t), 0.5);
        p.hips(0, -0.03, 0); p.root(0, 0, 0, Math.PI * t);
        p.arms(0.0, 0.12, 0.1); p.lean(-0.05, -0.15);
      }],
      [2.4, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const st = bump((b - 1.4) / 0.4);
        p.foot('L', 0.09); p.foot('R', 0.09, 0.26 * st, 0.08 * st);
        p.hips(0, -0.06 - 0.06 * (1 - st), 0, 0.3 * smooth((b - 1.7) / 0.4));
        p.root(0, 0, 0, Math.PI);
        p.arms(0.0, 0.12, 0.1); p.lean(-0.05, -0.15);
        p.look(-0.1, 0.75 * smooth((b - 1.7) / 0.4));
      }],
      [3.2, (p, b) => {
        const t = smooth((b - 2.4) / 0.8);
        p.foot('L', 0.02, 0, 0, 0.5); p.foot('R', 0.09, 0.12 * bump(t) + 0.02, -0.12 * (1 - t), 0.5);
        p.hips(0, -0.03, 0, 0.3 * (1 - t)); p.root(0, 0, 0, Math.PI + Math.PI * t);
        p.arms(0.0, 0.12, 0.1); p.lean(-0.05, -0.15);
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 3.2) / 0.3);
        p.foot('L', 0.09); p.foot('R', 0.09);
        p.hips(0, -0.05); p.root(0, 0, 0, TAU);
        salute(p, k); p.arm('L', 0, 0.12, 0.1); p.lean(-0.05, -0.15); p.look(-0.12);
      }],
    ]);
  },

  // ── ★ Signature moves ───────────────────────────────────────
  // ★ DOUBLE TIME: high knees on every pulse, fists pumping, pointing the
  // squad left and right — MOVE IT — and a blast on the whistle.
  sargeDoubleTime(p, b, B, s) {
    groove(p, B, s, 0.4);
    const f2 = frac(b * 2), up = Math.pow(Math.sin(Math.PI * f2), 1.3);
    const lifted = Math.cos(Math.PI * (b * 2 - f2)) > 0 ? 'R' : 'L', sg = lifted === 'R' ? 1 : -1;
    p.foot(lifted === 'R' ? 'L' : 'R', 0.12); p.foot(lifted, 0.13, 0.42 * up, 0.16 * up);
    p.hips(0.06 * sg * up, -0.1 + 0.04 * up, 0);
    const ph = b, ptL = win(ph, 1.8, 2.7, 0.25), ptR = win(ph, 2.7, 3.45, 0.25), wh = win(ph, 3.4, 5, 0.25);
    const pumps = 1 - ptL - ptR - wh, a = Math.sin(TAU * b);
    const mix = (pairs) => pairs.reduce((o, [w, v]) => o.map((x, i) => x + w * v[i]), [0, 0, 0, 0]);
    const L = mix([[1 - ptL, [0.3 + 0.6 * a, 0.2, 1.6, -0.2]], [ptL, [0.3, 1.5, 0.1, 0]]]);
    const R = mix([[pumps + ptL, [0.3 - 0.6 * a, 0.2, 1.6, -0.2]], [ptR, [0.3, 1.5, 0.1, 0]], [wh, [1.65, -0.05, 1.6, -0.8]]]);
    p.arm('L', ...L); p.arm('R', ...R);
    p.lean(0.12 * pumps, 0.06 * pumps, 0.3 * ptL - 0.3 * ptR, 0.06 * (ptL - ptR));
    p.look(-0.05, 0.6 * ptL - 0.6 * ptR, 0);
    p.root(0, 0, 0, 0.25 * ptL - 0.25 * ptR);
  },

  // ★ BEAST MODE: stomps forward beating his chest, left-right-left, then
  // throws the head back and ROARS with the arms spread.
  sargeBeastMode(p, b, B, s) {
    groove(p, B, s, 0.5);
    const z = 0.28 * smooth(b / 2.6) - 0.28 * smooth((b - 3.3) / 0.7);
    const f = frac(b), lift = Math.pow(Math.sin(Math.PI * f), 1.4) * (1 - smooth((b - 2.5) / 0.4));
    const lifted = Math.cos(Math.PI * (b - f)) > 0 ? 'R' : 'L', sg = lifted === 'R' ? 1 : -1;
    const roar = win(b, 2.6, 5, 0.35);
    p.foot(lifted === 'R' ? 'L' : 'R', 0.2 + 0.05 * roar, 0, z); p.foot(lifted, 0.2 + 0.05 * roar, 0.3 * lift, z + 0.1 * lift);
    p.hips(0.08 * sg * lift, -0.26 + 0.08 * lift - 0.06 * roar, z);
    // Chest beats: fists alternate onto the chest on the pulses.
    const beat = 0.5 + 0.5 * Math.cos(TAU * b * 2), alt = Math.sin(Math.PI * b * 2);
    const m = 1 - roar;
    p.arm('L', lerp(0.9, 0.2, roar), lerp(0.15 + 0.1 * (alt > 0 ? 0 : 1) * 0, 1.35, roar), lerp(2.3 - 0.8 * (0.5 + 0.5 * alt), 1.5, roar), lerp(-0.6, 0.7, roar));
    p.arm('R', lerp(0.9, 0.2, roar), lerp(0.15, 1.35, roar), lerp(2.3 - 0.8 * (0.5 - 0.5 * alt), 1.5, roar), lerp(-0.6, 0.7, roar));
    p.lean(0.3 * m - 0.12 * roar, 0.15 * m + 0.2 * beat * m - 0.35 * roar, 0.15 * sg * lift);
    p.look(0.2 * m - 0.55 * roar, 0.15 * sg * lift * m);
    p.shrug(0.18 * beat * m + 0.25 * roar);
  },

  // ★ KILL-OFF (encore): chest pops building faster, a jump-stomp, landing
  // low and wide in the beast pose, trembling — then he rises and points
  // you out.
  sargeKillOff(p, b, B, s) {
    phased(p, b, B, s, [
      [1.5, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const pop = Math.pow(0.5 + 0.5 * Math.cos(TAU * (b * (2 + b * 1.3))), 3);
        wideStance(p, 0.24);
        p.hips(0, -0.24, -0.03 * pop);
        p.add('spine', 0.15); p.add('chest', 0.35 * pop - 0.05);
        p.arm('L', 0.65, 0.55, 1.9, -0.9); p.arm('R', 0.65, 0.55, 1.9, -0.9);
        p.shrug(0.2 * pop); p.look(0.2 - 0.15 * pop);
      }],
      [2.3, (p, b) => {
        const t = (b - 1.5) / 0.8, air = Math.sin(Math.PI * t);
        const hy = -0.24 + 0.42 * air - 0.1 * smooth((t - 0.7) / 0.3);
        p.hips(0, hy, 0);
        const fl = Math.max(0, hy + 0.03) * 0.9 + 0.15 * air;
        p.foot('L', 0.24 + 0.06 * t, fl); p.foot('R', 0.24 + 0.06 * t, fl);
        p.arms(0.4 + 1.6 * air, 0.5, 1.2); p.lean(0.1, -0.1 * air); p.look(-0.2 * air);
      }],
      [3.2, (p, b, B) => {
        const u = b - 2.3, tr = 0.01 * Math.sin(B * 50);
        p.foot('L', 0.34); p.foot('R', 0.34);
        p.hips(tr, -0.5, 0.02);
        p.lean(0.3, 0.1);
        flex(p, 'L', 1); flex(p, 'R', 1); p.add('armL', 0, 0, 0.0);
        p.shrug(0.3); p.look(-0.1 + 0.03 * Math.sin(B * 30), 0.05 * Math.sin(u * 9));
      }],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 3.2) / 0.5);
        p.foot('L', 0.34 - 0.12 * k, 0, 0.1 * k); p.foot('R', 0.34 - 0.12 * k, 0, -0.06 * k);
        p.hips(0, -0.5 + 0.3 * k, 0.02, 0.5 * k);
        p.arm('L', lerp(0.2, 0.15, k), lerp(1.45, 1.55, k), lerp(2.0, 0.05, k), lerp(1.5, 0, k));
        flex(p, 'R', 1 - k * 0.6);
        p.lean(0.3 - 0.35 * k, 0.1 - 0.25 * k, 0.2 * k); p.look(-0.1 - 0.05 * k, 0.4 * k); p.shrug(0.3 - 0.1 * k);
      }],
    ]);
  },

  // ★★ SOLO — BOOT CAMP: salute, two double-speed jumping jacks, tuck jump
  // into the ground pound, rise into the double-biceps roar.
  sargeBootCamp(p, b, B, s) {
    phased(p, b, B, s, [
      [0.7, (p, b, B, s) => { groove(p, B, s, 0.3); p.foot('L', 0.09); p.foot('R', 0.09); p.hips(0, -0.04); salute(p, smooth(b / 0.2)); p.arm('L', 0, 0.12, 0.1); p.lean(-0.05, -0.15); p.look(-0.12); }],
      [1.7, (p, b) => {
        const f = clamp01(b - 0.7), air = Math.pow(Math.sin(Math.PI * f), 1.2), open = 0.5 - 0.5 * Math.cos(TAU * f);
        p.foot('L', 0.1 + 0.26 * open, 0.12 * air); p.foot('R', 0.1 + 0.26 * open, 0.12 * air);
        p.hips(0, -0.1 + 0.14 * air, 0); p.arms(0.15, 0.2 + 2.6 * open, 0.15); p.look(-0.15 * open);
      }],
      [2.1, (p, b) => {
        const k = smooth((b - 1.7) / 0.4);
        wideStance(p, 0.16); p.hips(0, -0.06 - 0.26 * k, -0.04 * k);
        p.arms(0.3 + 2.4 * k, 0.35, 0.4); p.look(-0.2 * k);
      }],
      [2.8, (p, b, B, s) => moves.sargeGroundPound(p, 1 + (b - 2.1) / 0.7, B, s)],
      [3.3, (p, b, B, s) => moves.sargeGroundPound(p, 2 + (b - 2.8) / 0.5, B, s)],
      [Infinity, (p, b, B, s) => {
        groove(p, B, s, 0.4);
        const k = smooth((b - 3.3) / 0.4);
        wideStance(p, 0.3 - 0.02 * k);
        p.hips(0, -0.5 + 0.28 * k, 0.02);
        flex(p, 'L', k); flex(p, 'R', k);
        p.lean(0.35 - 0.3 * k, 0.1 - 0.2 * k); p.look(0.1 - 0.5 * k); p.shrug(0.3 * k);
      }],
    ]);
  },

  // ── Battle actions ──────────────────────────────────────────
  // Intro (faces the player, +x): points you out, blows the whistle,
  // points at the floor — DROP AND GIVE ME TWENTY — arms folded, glaring.
  sargeIntro(p, b, B, s) {
    groove(p, B, s, 0.4);
    p.foot('L', 0.16, 0, 0.1); p.foot('R', 0.2, 0, -0.06, 0.3);
    phased(p, b, B, s, [
      [1, (p, b) => {
        const k = smooth(b / 0.3);
        p.hips(0.02, -0.12, 0, 0.6 * k);
        fists(p, 'L', 0.15, 0.2 + 1.35 * k, 0.1); p.arm('R', -0.2, 0.6, 1.6, -1.4);
        p.lean(0.1, -0.05, 0.25 * k); p.look(0.0, 0.35 * k);
      }],
      [2, (p, b) => {
        const bl = 0.5 + 0.5 * Math.sin(TAU * (b - 1) * 6);
        p.hips(0, -0.1, 0, 0.4);
        p.arm('R', 1.65, -0.05, 1.6, -0.8); p.arm('L', -0.2, 0.6, 1.6, -1.4);
        p.lean(-0.08, -0.25); p.look(-0.25, 0.25); p.shrug(0.06 * bl);
      }],
      [3, (p, b) => {
        const k = smooth((b - 2) / 0.3), jab = Math.exp(-frac((b - 2) * 2) * 5);
        p.hips(0.02, -0.16, 0.02, 0.55);
        fists(p, 'L', 0.9 - 0.15 * jab, 0.6, 0.15); p.arm('R', -0.2, 0.6, 1.6, -1.4);
        p.lean(0.25 * k, 0.15 * k, 0.2); p.look(0.25 * k, 0.3);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 3) / 0.3);
        p.hips(0, -0.12, 0, 0.45);
        crossArms(p);
        p.lean(-0.05 * k, -0.2 * k); p.look(-0.1 * k, 0.3, 0.06 * Math.sin(TAU * b));
      }],
    ]);
  },

  // SMOKE OUT: bowls a smoke canister underhand across the floor at you
  // (released at +0.75 beats), fans the smoke, folds the arms. Faces the
  // foe (+x).
  sargeTaunt(p, b, B, s) {
    groove(p, B, s, 0.4);
    phased(p, b, B, s, [
      [0.6, (p, b) => {
        const k = smooth(b / 0.55);
        p.foot('L', 0.18, 0, 0.18 * k); p.foot('R', 0.2, 0, -0.12, 0.4 * k);
        p.hips(0.02, -0.12 - 0.12 * k, 0.03, 0.5 + 0.2 * k);
        p.arm('L', 0.3 - 1.0 * k, 0.25, 0.3); p.arm('R', 0.4, 0.4, 1.2);
        p.lean(0.3 * k, 0.1 * k, 0.15); p.look(0.05, 0.3);
      }],
      [1.5, (p, b) => {
        const t = smooth((b - 0.6) / 0.3);
        p.foot('L', 0.18, 0, 0.18); p.foot('R', 0.2, 0, -0.12, 0.4);
        p.hips(0.03 * t, -0.24 + 0.04 * t, 0.06 * t, 0.7);
        p.arm('L', lerp(-0.7, 1.15, t), 0.25, 0.15); p.arm('R', 0.4, 0.5, 1.0);
        p.lean(0.3 - 0.05 * t, 0.1, 0.15); p.look(0.0, 0.35);
      }],
      [2.5, (p, b) => {
        const w = Math.sin(TAU * (b - 1.5) * 3);
        p.foot('L', 0.16, 0, 0.1); p.foot('R', 0.2, 0, -0.06, 0.3);
        p.hips(0, -0.12, 0, 0.45);
        p.arm('R', 1.3, 0.1 + 0.3 * w, 1.6, -0.6); p.arm('L', 0.2, 0.3, 0.8);
        p.lean(-0.05, -0.12); p.look(-0.1, 0.3 - 0.1 * w);
      }],
      [Infinity, (p, b) => {
        const k = smooth((b - 2.5) / 0.4);
        p.foot('L', 0.16, 0, 0.1); p.foot('R', 0.2, 0, -0.06, 0.3);
        p.hips(0, -0.12, 0, 0.45);
        crossArms(p);
        p.lean(-0.05 * k, -0.2 * k); p.look(-0.12 * k, 0.3, 0);
      }],
    ]);
  },

  // Victory: double-biceps flex with chest pops, then a slow salute.
  sargeVictory(p, b, B, s) {
    groove(p, B, s, 0.5);
    const sal = win(b, 4, 99, 0.4), pop = pulse(b);
    wideStance(p, 0.24 - 0.13 * sal);
    p.hips(0, -0.2 + 0.15 * sal, 0);
    p.add('chest', (0.25 * pop - 0.1) * (1 - sal));
    flex(p, 'L', 1 - sal); p.arm('R', lerp(0.2, 0.95, sal), lerp(1.45, 1.3, sal), lerp(2.0, 2.55, sal), lerp(1.5, -1.15, sal));
    p.shrug(0.2 * pop * (1 - sal));
    p.lean(0.1 - 0.15 * sal, -0.15); p.look(-0.25 + 0.1 * pop * (1 - sal));
  },
};

export const moveMeta = {
  labels: {
    sargeChestPop: 'CHEST POP', sargeSalute: 'SALUTE', sargeJabs: 'KRUMP JABS', sargeGetOffMe: 'GET OFF ME',
    sargeJumpingJacks: 'PT DRILL', sargeTantrum: 'TANTRUM', sargeGroundPound: 'GROUND POUND', sargeAboutFace: 'ABOUT FACE',
    sargeDoubleTime: 'DOUBLE TIME', sargeBeastMode: 'BEAST MODE', sargeKillOff: 'KILL-OFF', sargeBootCamp: 'BOOT CAMP',
    sargeTaunt: 'SMOKE OUT', sargeIntro: 'DROP AND GIVE ME 20', sargeVictory: 'DISMISSED',
  },
  expressions: {
    sargeStomp: 'angry', sargeMarch: 'focus', sargeArmSwing: 'shout', sargeBuck: 'angry', sargeAccent: 'focus',
    sargeChestPop: 'angry', sargeSalute: 'focus', sargeJabs: 'angry', sargeGetOffMe: 'shout',
    sargeJumpingJacks: 'shout', sargeTantrum: 'shout', sargeGroundPound: 'shout', sargeAboutFace: 'focus',
    sargeDoubleTime: 'shout', sargeBeastMode: 'shout', sargeKillOff: 'angry', sargeBootCamp: 'shout',
    sargeIntro: 'shout', sargeTaunt: 'smirk', sargeVictory: 'grin',
  },
  hits: {
    sargeArmSwing: 1, sargeBuck: 0.9, sargeAccent: 0.3, sargeChestPop: 1, sargeGetOffMe: 0.6, sargeJumpingJacks: 0.2,
    sargeTantrum: 1, sargeGroundPound: 0.2, sargeAboutFace: 0.2, sargeDoubleTime: 0.6, sargeBeastMode: 0.8,
    sargeKillOff: 0.3, sargeBootCamp: 0, sargeIntro: 0.5, sargeTaunt: 0.4, sargeVictory: 0.7,
  },
  fnGroove: {
    sargeJumpingJacks: 0, sargeGroundPound: 0, sargeAboutFace: 0, sargeKillOff: 0, sargeBootCamp: 0, sargeBuck: 0.2,
  },
  stiff: { sargeJabs: 1.5, sargeChestPop: 1.4, sargeSalute: 1.3, sargeTantrum: 1.3 },
};

export default { moves, moveMeta };
