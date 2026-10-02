// Story Mode level registry.
//
// A level = one Tetris world + one rhythm battle. Everything level-specific
// lives here as data (theme, special-piece rules, song timing, stage,
// dancers, chart, AI), so adding a world means adding an entry, not code.

export const STORY_LEVELS = {
  taco: {
    id: 'taco',
    number: 1,
    title: 'TACO TOWN',
    // LEVEL_THEMES index used for the Tetris phase (board look + music).
    themeIndex: 16,

    // The special tetrimino. It plays exactly like `base`; clearing a line
    // that contains any of its cells opens the battle.
    special: {
      base: 'T',
      appearAfterLines: 3,   // joins the NEXT queue after 3 lines...
      appearAfterPieces: 20, // ...or 20 locked pieces, whichever comes first
      queueSlot: 4,          // back of the visible queue, so it's seen coming
    },

    // Music timeline. The battle is charted against the song's own beat
    // grid, measured from the MP3 with kick- and snare-band comb fits over
    // the battle section (120-208 s: phase steady to ±6 ms at this tempo).
    // The tempo has to be exact — 0.2 BPM off is half a beat by bar 56.
    // At runtime MusicClock.alignPhase() re-checks the phase against the
    // decoded buffer. Swapping the track only requires updating these.
    music: {
      track: 'extra-cheese-taco.mp3',
      bpm: 101.07,
      firstBeat: 0.452,     // song seconds of beat 0 (kick on 1 & 3, snare on 2 & 4)
      beatsPerBar: 4,
      battleStartBar: 56,   // first scored bar (high-energy section)
      introBars: 4,         // intro: entrance, rival taunt, answer, 3-2-1 count-in
      battleBars: 24,       // ~57 s of battle
      resultBars: 2,        // result moment before heading back
    },

    world: 'taco',
    dancers: {
      player: 'player',
      rival: 'alfred',
    },

    chart: { seed: 1605 },

    // Per-difficulty rival profile (keyed by the game's Alfred difficulty).
    ai: {
      // Hit-rate split per note; `hypeRate` scales its taunt gauge fill;
      // `fluster` is how much it slips when it's being out-danced.
      easy:   { perfect: 0.32, great: 0.34, good: 0.22, dodge: 0.30, tauntChance: 0.40, taunt: 0.70, fluster: 0.08, hypeRate: 1.2 },
      medium: { perfect: 0.52, great: 0.31, good: 0.11, dodge: 0.45, tauntChance: 0.60, taunt: 0.85, fluster: 0.05, hypeRate: 1.5 },
      hard:   { perfect: 0.68, great: 0.24, good: 0.06, dodge: 0.60, tauntChance: 0.80, taunt: 0.95, fluster: 0.02, hypeRate: 1.7 },
    },

    rewards: {
      win: 5000,           // flat bonus for winning the battle
      lose: 1000,          // consolation for showing up
      battleScoreShare: 0.5, // fraction of battle points added to the Tetris score
    },
  },
};

export const DEFAULT_LEVEL = 'taco';
