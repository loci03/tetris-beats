// WHITE RABBIT — Level 5. Boss: BUNNI, a purple raver who shuffles —
// running man, T-steps, jumpstyle, glow-stick swirls — at a Wonderland rave
// at the mouth of the rabbit hole.
import boss from './whiterabbit/boss.js';
import mv from './whiterabbit/moves.js';
import { buildWorld } from './whiterabbit/world.js';
import sprites from './whiterabbit/sprites.js';
import { createTetrisWorld } from './whiterabbit/tetris.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.6, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createTetrisWorld },
};
