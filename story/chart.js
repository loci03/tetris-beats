// Chart system — builds each bar's command (the note sequence a dancer must
// hit) from rhythm templates + direction motifs, scaled by the dancer's
// current move tier. Deterministic per seed so a level plays the same way
// for a given sequence of results.
//
// Bar layout (beats 0..3 of a 4/4 bar):
//   arrows on the template's beats, then the GROOVE finisher on beat 3 —
//   the modern take on Bust a Groove's "enter the command, hit the button
//   on the fourth beat".

export const DIRS = ['L', 'U', 'D', 'R'];

// Beat offsets for the arrow notes, per tier (1 = warm-up, 4 = hardest).
const RHYTHMS = {
  1: [[0, 2], [0, 1], [1, 2]],
  2: [[0, 1, 2], [0, 1.5, 2], [0, 0.5, 2], [0, 1, 1.5]],
  3: [[0, 0.5, 1, 2], [0, 1, 1.5, 2], [0, 1, 2, 2.5], [0, 0.5, 1.5, 2]],
  4: [[0, 0.5, 1, 1.5, 2], [0, 0.5, 1, 2, 2.5], [0, 1, 1.5, 2, 2.5], [0, 0.5, 1.5, 2, 2.5]],
};

// Direction motifs — short dance "phrases" that read as patterns rather
// than noise. Cut / repeated to the rhythm's length.
const MOTIFS = [
  ['L', 'R'], ['R', 'L'], ['U', 'D'], ['D', 'U'],
  ['L', 'L', 'R', 'R'], ['U', 'U', 'D', 'D'],
  ['L', 'U', 'R', 'D'], ['R', 'D', 'L', 'U'],
  ['L', 'R', 'U', 'U'], ['D', 'D', 'L', 'R'],
  ['U', 'L', 'U', 'R'], ['D', 'R', 'D', 'L'],
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

// A normal command bar for `tier`. Returns note specs in beats (relative to
// the bar start); the battle converts them to song time.
export function buildCommand(rng, tier) {
  const t = Math.max(1, Math.min(4, tier | 0));
  const beats = pick(rng, RHYTHMS[t]);
  let motif = pick(rng, MOTIFS);
  // Mirror half the time for variety.
  if (rng() < 0.5) motif = motif.map(d => ({ L: 'R', R: 'L', U: 'U', D: 'D' })[d]);
  const notes = beats.map((beat, i) => ({ beat, kind: 'arrow', dir: motif[i % motif.length] }));
  notes.push({ beat: 3, kind: 'groove', dir: 'G' });
  return { type: 'command', tier: t, notes };
}

// The attacker's bar: one TAUNT note on the downbeat.
export function buildTauntBar() {
  return { type: 'taunt', tier: 0, notes: [{ beat: 0, kind: 'taunt', dir: 'T' }] };
}

// The defender's bar: the hit lands on beat 2 — dodge it with GROOVE.
export function buildDodgeBar() {
  return { type: 'dodge', tier: 0, notes: [{ beat: 2, kind: 'dodge', dir: 'G' }] };
}

// Knocked off-balance: no notes, the dancer just stumbles.
export function buildStunnedBar() {
  return { type: 'stunned', tier: 0, notes: [] };
}
