// LIFE IS GOOD — Level 8. Boss: KAYA, the dancehall queen (look in
// lifeisgood/boss.js, dancehall moves in lifeisgood/moves.js, the night
// street party with its sound-system wall in lifeisgood/world.js).
import boss from './lifeisgood/boss.js';
import mv from './lifeisgood/moves.js';
import { buildWorld } from './lifeisgood/world.js';
import sprites from './lifeisgood/sprites.js';
import { createTetrisWorld } from './lifeisgood/tetris.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.2, 8.6], look: [0, 1.7, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createTetrisWorld },
};
