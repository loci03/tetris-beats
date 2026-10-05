// LIVING MY LIFE — Level 17. Boss: COCO, the boardwalk roller-disco queen
// (strides, crossovers, the fishtail, shoot-the-duck, camel spin, an axel)
// with beach-party moves on top (surf stance, shaka shuffle, hula, limbo,
// the bump). Stage: a sunset boardwalk rink by the pier.
// Song grid: registry 125.37 BPM / firstBeat 1.621 checked against the
// track — the first half holds within ±36 ms per 15 s window, the quieter
// second half wanders ±50–80 ms with no consistent slope (regression
// → 125.374); 125 and 125.5 drift by whole beats. Kept as is (the runtime
// phase re-align covers the wander).
import boss from './living/boss.js';
import mv from './living/moves.js';
import { buildWorld } from './living/world.js';
import sprites from './living/sprites.js';
import { createTetrisWorld } from './living/tetris.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.5, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createTetrisWorld },
};
