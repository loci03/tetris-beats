// Command system — Bust a Groove rules.
//
// Every 4/4 bar is one command:
//
//     1 ── 2 ── 3 ── 4
//     ↓    →    ↑    [GROOVE]
//
// The directions are *not* timed notes: enter the sequence any time from
// the previous bar's finisher up to beat 4 (they're drawn on the lane in
// front of the GROOVE note as a guide; a wrong direction is just ignored).
// The finisher button is the one timed event — it must land on beat 4.
// Land it and the dancer performs the move through the next bar.
//
// Commands come from a command tree, not a random list. Each landed command
// climbs a level (longer sequences, bigger moves, more points); two fumbles
// in a row drop one. Landing commands fills the ENTHUSIASM gauge, and once it's high
// the tree offers a ★ branch next to the standard command — a longer, harder
// sequence that unlocks a dancer's signature moves for more points. At the
// top level with a full gauge the branch becomes the SOLO.

export const DIRS = ['L', 'U', 'D', 'R'];

// Standard path.
export const LEVELS = {
  1: { len: 2, mult: 1.0 },
  2: { len: 3, mult: 1.4 },
  3: { len: 4, mult: 1.9 },
  4: { len: 4, mult: 2.5 },
};
// ★ branches offered from level 2 up once Enthusiasm reaches BRANCH_AT.
export const BRANCHES = {
  2: { len: 4, mult: 2.1 },
  3: { len: 5, mult: 2.8 },
  4: { len: 5, mult: 3.6 },
};
export const SOLO = { len: 6, mult: 5.0 };
export const BRANCH_AT = 40;
export const SOLO_AT = 90;

// Direction motifs — short dance "phrases" that read as patterns rather
// than noise; concatenated / cut to the command length.
const MOTIFS = [
  ['L', 'R'], ['R', 'L'], ['U', 'D'], ['D', 'U'],
  ['L', 'L', 'R'], ['U', 'U', 'D'], ['D', 'D', 'U'], ['R', 'R', 'L'],
  ['L', 'U', 'R'], ['R', 'D', 'L'], ['D', 'L', 'U'], ['U', 'R', 'D'],
  ['L', 'D', 'R', 'U'], ['U', 'L', 'D', 'R'],
];

// Small seeded PRNG (mulberry32).
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const MIRROR = { L: 'R', R: 'L', U: 'U', D: 'D' };

function sequence(rng, len, avoidFirst) {
  const out = [];
  while (out.length < len) {
    let m = pick(rng, MOTIFS);
    if (rng() < 0.5) m = m.map(d => MIRROR[d]);
    out.push(...m);
  }
  out.length = len;
  // Options in the same bar start differently, so the first direction the
  // player enters already says which one they're going for.
  if (avoidFirst && out[0] === avoidFirst) out[0] = pick(rng, DIRS.filter(d => d !== avoidFirst));
  return out;
}

// One command bar for a dancer at `level` with `enthusiasm`. Returns the
// option(s) on offer plus the timed finisher note on beat 4 (index 3).
export function buildCommand(rng, level, enthusiasm) {
  const lv = Math.max(1, Math.min(4, level | 0));
  const std = LEVELS[lv];
  const options = [{ id: 'std', kind: 'std', level: lv, mult: std.mult, seq: sequence(rng, std.len) }];
  if (lv === 4 && enthusiasm >= SOLO_AT) {
    options.push({ id: 'solo', kind: 'solo', level: lv, mult: SOLO.mult, seq: sequence(rng, SOLO.len, options[0].seq[0]) });
  } else if (lv >= 2 && enthusiasm >= BRANCH_AT) {
    const br = BRANCHES[lv];
    options.push({ id: 'branch', kind: 'branch', level: lv, mult: br.mult, seq: sequence(rng, br.len, options[0].seq[0]) });
  }
  return { type: 'command', tier: lv, options, notes: [{ beat: 3, kind: 'groove', dir: 'G' }] };
}

// The attacker's bar: one TAUNT note on the downbeat.
export function buildTauntBar() {
  return { type: 'taunt', tier: 0, notes: [{ beat: 0, kind: 'taunt', dir: 'T' }] };
}

// The defender's bar: the hit lands on beat 3 — dodge it with GROOVE.
export function buildDodgeBar() {
  return { type: 'dodge', tier: 0, notes: [{ beat: 2, kind: 'dodge', dir: 'G' }] };
}

// Knocked off-balance: no command, the dancer just stumbles.
export function buildStunnedBar() {
  return { type: 'stunned', tier: 0, notes: [] };
}
