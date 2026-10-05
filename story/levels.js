// Story Mode / Bust a Beat level registry.
//
// One entry per level that has a real song: the Tetris world (themeIndex in
// index.html's LEVEL_THEMES) + a dance battle against that world's boss.
// Song grids were measured from the MP3s (onset autocorrelation + whole-song
// comb fit, see README); MusicClock.alignPhase() re-checks the phase against
// the decoded audio at runtime.
//
// Everything visual for a level — the boss (look, moves, solo, taunt), the
// 3D stage and the Tetris backdrop framing — lives in its module,
// story/levels/<id>.js, loaded on demand by loadLevel().
//
// Songs faster than ~130 BPM battle on the half-time grid (`bounce: 2`):
// the command bar stays playable and the dancers bounce on every pulse.

// [id, themeIndex, title, track, bpm, firstBeat, songSeconds, bounce, bossId]
const SONGS = [
  ['underground', 1, 'THE UNDERGROUND', 'underground.mp3', 78.49, 0.02, 158.9, 2, 'toni'],
  ['violins', 3, 'FALLING VIOLINS', 'falling-violins.mp3', 127.295, 0.125, 157.9, 1, 'violetta'],
  ['backformore', 4, 'BACK FOR MORE', 'back-for-more.mp3', 70.0, 0.455, 174.6, 2, 'null'],
  ['whiterabbit', 5, 'WHITE RABBIT', 'white-rabbit.mp3', 71.0, 1.663, 124.0, 2, 'bunni'],
  ['ferrari', 6, 'FERRARI WINDOW', 'ferrari-window.mp3', 72.065, 0.22, 147.5, 2, 'rhett'],
  ['maccheese', 7, 'MAC & CHEESE', 'mac-and-cheese.mp3', 94.005, 0.496, 158.3, 1, 'gouda'],
  ['lifeisgood', 8, 'LIFE IS GOOD', 'life-is-good.mp3', 94.085, 0.509, 126.1, 1, 'kaya'],
  ['relax', 9, 'RELAX YOUR MIND', 'relax-your-mind.mp3', 67.05, 0.487, 200.4, 2, 'sage'],
  ['trumpets', 10, 'TRUMPETS PLEASE', 'trumpets-please.mp3', 117.99, 0.548, 173.1, 1, 'zoot'],
  ['work', 11, 'WORK', 'work.mp3', 127.155, 0.932, 189.9, 1, 'monday'],
  ['triggered', 12, 'TRIGGERED', 'trigger-on.mp3', 72.6, 0.032, 95.0, 2, 'sarge'],
  ['higher', 13, 'HIGHER', 'rooftop-ember-haze.mp3', 75.025, 0.603, 222.8, 2, 'skye'],
  ['dream', 14, 'DREAM OR NIGHTMARE', 'dream-or-nightmare.mp3', 122.135, 0.148, 272.3, 1, 'mecha'],
  ['hegotme', 15, 'HE GOT ME', 'valley-808-drop.mp3', 119.98, 0.763, 199.2, 1, 'grace'],
  ['taco', 16, 'TACO TOWN', 'extra-cheese-taco.mp3', 101.03, 0.394, 214.1, 1, 'tina'],
  ['living', 17, 'LIVING MY LIFE', 'living-my-life.mp3', 125.37, 1.621, 295.3, 1, 'coco'],
  ['nuclear', 18, 'NUCLEAR WASTE', 'nuclear-wrong-turn.mp3', 105.11, 0.875, 313.9, 1, 'rex'],
  ['galaxy', 20, 'GALAXY', 'galaxy.mp3', 91.5, 0.011, 370.8, 1, 'nova'],
];

// Boss display names + the song's style, for the level select.
export const LEVEL_CARDS = {
  underground: ['COOL TONI', 'disco swagger'], violins: ['VIOLETTA', 'ballet & strings'], backformore: ['NULL', 'tutting & glitch'],
  whiterabbit: ['BUNNI', 'rave shuffle'], ferrari: ['RHETT RYDER', 'country line dance'], maccheese: ['CHEF GOUDA', 'party classics'],
  lifeisgood: ['KAYA', 'dancehall'], relax: ['SAGE', 'tai chi flow'], trumpets: ['ZOOT', 'swing & Charleston'],
  work: ['MR. MONDAY', 'office house'], triggered: ['SARGE', 'krump'], higher: ['SKYE', 'laid-back R&B'],
  dream: ['MECHA-9', 'robot & popping'], hegotme: ['DEACON GRACE', 'gospel praise'], taco: ['TINA', 'glam diva'],
  living: ['COCO', 'roller disco'], nuclear: ['ROTTEN REX', 'zombie shuffle'], galaxy: ['NOVA', 'zero-gravity'],
};

// Rival skill grows with the level (rank 0 → 1).
function aiFor(rank) {
  const r = Math.max(0, Math.min(1, rank)), L = (a, b) => +(a + (b - a) * r).toFixed(2);
  return {
    easy:   { perfect: L(0.2, 0.32), great: 0.32, good: L(0.27, 0.22), dodge: L(0.22, 0.35), tauntChance: L(0.32, 0.45), taunt: L(0.62, 0.75), fluster: L(0.1, 0.07), hypeRate: L(1.05, 1.3) },
    medium: { perfect: L(0.46, 0.64), great: L(0.33, 0.26), good: L(0.13, 0.07), dodge: L(0.38, 0.5), tauntChance: L(0.52, 0.66), taunt: L(0.78, 0.88), fluster: L(0.065, 0.04), hypeRate: L(1.4, 1.75), branch: L(0.72, 0.9) },
    hard:   { perfect: L(0.68, 0.82), great: L(0.23, 0.15), good: L(0.06, 0.02), dodge: L(0.52, 0.66), tauntChance: L(0.72, 0.85), taunt: L(0.9, 0.97), fluster: L(0.035, 0.015), hypeRate: L(1.75, 2.15), branch: L(0.88, 0.97) },
  };
}

function makeLevel([id, themeIndex, title, track, bpm, firstBeat, dur, bounce, boss], i) {
  const bar = 240 / bpm;
  const bars = Math.floor((dur - firstBeat) / bar);
  // Bust a Beat: intro on bars 0-3, battle to (nearly) the end of the song.
  const beatBattle = Math.max(8, bars - 4 - 2 - 1);
  // Story drop: about a third of the way in, ~60-75 s of battle.
  const storyBars = Math.max(12, Math.min(bars - 8, Math.round(66 / bar)));
  const storyStart = Math.max(6, Math.min(bars - storyBars - 3, Math.round(bars * 0.33)));
  return {
    id, number: themeIndex, title, themeIndex,
    // The special tetrimino plays exactly like `base`; clearing a line with
    // any of its cells opens the battle. It joins the NEXT queue after 3
    // lines or 20 locked pieces, at the back so it's seen coming.
    special: { base: 'T', appearAfterLines: 3, appearAfterPieces: 20, queueSlot: 4 },
    music: {
      track, bpm, firstBeat, beatsPerBar: 4, bounce,
      story: { battleStartBar: storyStart, introBars: 4, battleBars: storyBars, resultBars: 2 },
      beat: { battleStartBar: 4, introBars: 4, battleBars: beatBattle, resultBars: 2 },
    },
    world: id,
    dancers: { player: 'player', rival: boss },
    chart: { seed: 701 + i * 97 },
    ai: aiFor(i / (SONGS.length - 1)),
    rewards: { win: 4000 + 250 * i, lose: 800 + 50 * i, battleScoreShare: 0.5 },
  };
}

export const STORY_LEVELS = Object.fromEntries(SONGS.map((s, i) => [s[0], makeLevel(s, i)]));
// The two levels whose battle sections were tuned by hand.
Object.assign(STORY_LEVELS.underground.music.story, { battleStartBar: 14, battleBars: 20 });
Object.assign(STORY_LEVELS.taco.music.story, { battleStartBar: 56, battleBars: 24 });

export const LEVEL_ORDER = SONGS.map(s => s[0]);
export const DEFAULT_LEVEL = 'underground';

// The music config a battle runs with: the song grid + the mode's section.
export function battleMusic(level, standalone) {
  const m = level.music;
  return { ...m, ...(standalone ? m.beat : m.story) };
}

// Load a level's module (boss, moves, stage) and register it. Resolves to
// { level, buildWorld, backdrop } — cached.
const _loaded = new Map();
export function loadLevel(id) {
  if (!_loaded.has(id)) {
    _loaded.set(id, (async () => {
      const level = STORY_LEVELS[id];
      if (!level) throw new Error('unknown level ' + id);
      const [mod, chars, dance] = await Promise.all([
        import(`./levels/${id}.js`), import('./characters.js'), import('./dance.js'),
      ]);
      const L = mod.default;
      // A module may correct its song grid: { bpm, firstBeat, bounce }.
      if (L.music) {
        const i = SONGS.findIndex(s => s[0] === id), row = SONGS[i].slice();
        if (L.music.bpm) row[4] = L.music.bpm;
        if (L.music.firstBeat != null) row[5] = L.music.firstBeat;
        if (L.music.bounce) row[7] = L.music.bounce;
        const fresh = makeLevel(row, i);
        Object.assign(level.music, fresh.music);
      }
      if (L.moves) dance.registerMoves(L.moves, L.moveMeta || {});
      if (L.boss && typeof L.boss === 'object') chars.registerCharacter(level.dancers.rival, L.boss);
      if (L.sprites) { const fx = await import('./anime-fx.js'); fx.registerSprites(L.sprites); }
      return { level, buildWorld: L.buildWorld, backdrop: L.backdrop || null };
    })());
    _loaded.get(id).catch(() => _loaded.delete(id));
  }
  return _loaded.get(id);
}
