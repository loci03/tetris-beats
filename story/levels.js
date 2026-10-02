// Story Mode / Bust a Beat level registry.
//
// A level = one Tetris world + one dance battle. Everything level-specific
// lives here as data (theme, special-piece rules, song timing, stage,
// dancers, chart, AI), so adding a world means adding an entry, not code.
//
// Song timing: `bpm` / `firstBeat` define the song's beat grid (measured
// from the MP3 — see README). Each mode then picks its own section:
//   • story — the battle the Tetris match drops into (a high-energy run).
//   • beat  — Bust a Beat: the song from the top, battling to the end.
// MusicClock.alignPhase() re-checks the phase against the decoded audio.

export const STORY_LEVELS = {
  underground: {
    id: 'underground',
    number: 1,
    title: 'THE UNDERGROUND',
    themeIndex: 1,                       // LEVEL_THEMES "Underground"
    // The special tetrimino plays exactly like `base`; clearing a line with
    // any of its cells opens the battle. It joins the NEXT queue after 3
    // lines or 20 locked pieces, at the back so it's seen coming.
    special: { base: 'T', appearAfterLines: 3, appearAfterPieces: 20, queueSlot: 4 },
    // underground.mp3: snare/hats lock to a 156.98 BPM pulse (±10 ms over
    // the whole song); the kicks swing in triplets. The battle runs on the
    // half-time grid (a 3 s bar — room to enter the command) and the dancers
    // bounce at double time so they still hit every snare.
    music: {
      track: 'underground.mp3',
      bpm: 78.49,
      firstBeat: 0.02,
      beatsPerBar: 4,
      bounce: 2,                         // groove bounces per grid beat
      story: { battleStartBar: 14, introBars: 4, battleBars: 20, resultBars: 2 },
      beat:  { battleStartBar: 4,  introBars: 4, battleBars: 45, resultBars: 2 },
    },
    world: 'underground',
    dancers: { player: 'player', rival: 'alfred' },
    chart: { seed: 707 },
    ai: {
      easy:   { perfect: 0.22, great: 0.32, good: 0.26, dodge: 0.25, tauntChance: 0.35, taunt: 0.65, fluster: 0.09, hypeRate: 1.1 },
      medium: { perfect: 0.5, great: 0.32, good: 0.12, dodge: 0.4, tauntChance: 0.55, taunt: 0.8, fluster: 0.06, hypeRate: 1.45, branch: 0.75 },
      hard:   { perfect: 0.7, great: 0.22, good: 0.05, dodge: 0.55, tauntChance: 0.75, taunt: 0.92, fluster: 0.03, hypeRate: 1.8, branch: 0.9 },
    },
    rewards: { win: 4000, lose: 800, battleScoreShare: 0.5 },
  },

  taco: {
    id: 'taco',
    number: 2,
    title: 'TACO TOWN',
    themeIndex: 16,                      // LEVEL_THEMES "Tacos"
    special: { base: 'T', appearAfterLines: 3, appearAfterPieces: 20, queueSlot: 4 },
    // extra-cheese-taco.mp3: kick- and snare-band comb fits put the whole
    // song on 101.03 BPM (phase steady to ±6 ms from 20 s to 200 s). The
    // tempo has to be exact — 0.2 BPM off is half a beat by bar 56.
    music: {
      track: 'extra-cheese-taco.mp3',
      bpm: 101.03,
      firstBeat: 0.394,                  // song seconds of beat 0 (kick on 1 & 3, snare on 2 & 4)
      beatsPerBar: 4,
      story: { battleStartBar: 56, introBars: 4, battleBars: 24, resultBars: 2 },
      beat:  { battleStartBar: 4,  introBars: 4, battleBars: 82, resultBars: 2 },
    },
    world: 'taco',
    dancers: { player: 'player', rival: 'tina' },
    chart: { seed: 1605 },
    // Per-difficulty rival profile (keyed by the game's Alfred difficulty).
    // Hit-rate split per finisher; `hypeRate` scales its taunt gauge fill;
    // `fluster` is how much it slips when it's being out-danced; `branch`
    // is how often it goes for a ★ branch when offered.
    ai: {
      easy:   { perfect: 0.26, great: 0.32, good: 0.24, dodge: 0.30, tauntChance: 0.40, taunt: 0.70, fluster: 0.08, hypeRate: 1.2 },
      medium: { perfect: 0.58, great: 0.3, good: 0.09, dodge: 0.45, tauntChance: 0.60, taunt: 0.85, fluster: 0.05, hypeRate: 1.6, branch: 0.85 },
      hard:   { perfect: 0.76, great: 0.2, good: 0.03, dodge: 0.60, tauntChance: 0.80, taunt: 0.95, fluster: 0.02, hypeRate: 2.0, branch: 0.95 },
    },
    rewards: { win: 5000, lose: 1000, battleScoreShare: 0.5 },
  },
};

export const LEVEL_ORDER = ['underground', 'taco'];
export const DEFAULT_LEVEL = 'underground';

// The music config a battle runs with: the song grid + the mode's section.
export function battleMusic(level, standalone) {
  const m = level.music;
  return { ...m, ...(standalone ? m.beat : m.story) };
}
