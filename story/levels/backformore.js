// BACK FOR MORE — Level 4. Boss: NULL, a ghost in the machine who dances
// in tuts, ticks, liquid waves and slow-motion lean-backs, on a server-farm
// rooftop under walls of green code rain with balloons drifting through.
import boss from './backformore/boss.js';
import mv from './backformore/moves.js';
import { buildWorld } from './backformore/world.js';
import sprites from './backformore/sprites.js';
import { createTetrisWorld } from './backformore/tetris.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.5, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createTetrisWorld },
};
