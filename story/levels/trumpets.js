// TRUMPETS PLEASE — Level 10. Boss: ZOOT, the zoot-suited swing cat with
// the gold trumpet (Charleston, Lindy, tap, Shim Sham, Shorty George,
// Cab Calloway's hi-de-ho), in a 1930s velvet-curtain jazz club.
//
// Song grid override: the registry's 78.66 BPM is 2/3 of the real tempo.
// Folding the track's onsets on a 117.99 BPM grid (first downbeat 0.548 s)
// puts the kick on 1 and 3 and the snare/clap on 2 and 4, hats on straight
// 8ths; on the 78.66 grid the hits smear across the bar. Autocorrelation
// peaks at 118 BPM and the comb fit scores higher there (conf 6.13 vs 6.01),
// with < 6 ms drift across the song.
import boss from './trumpets/boss.js';
import mv from './trumpets/moves.js';
import { buildWorld } from './trumpets/world.js';
import sprites from './trumpets/sprites.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.5, 0], fov: 50 }, spread: 3.5, forward: 0.9 },
  music: { bpm: 117.99, firstBeat: 0.548, bounce: 1 },
};
