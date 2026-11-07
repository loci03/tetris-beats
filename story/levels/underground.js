// THE UNDERGROUND — Level 1. Boss: COOL TONI (disco king / rock'n'roll
// swagger; his look and moves live in characters.js / dance.js).
import { buildUndergroundWorld } from '../worlds/underground-world.js';
import { createTetrisWorld } from './underground/tetris.js';

export default {
  boss: 'toni',
  buildWorld: buildUndergroundWorld,
  // Tetris backdrop: in front of the crowd fence, dancers either side of the board.
  backdrop: { camera: { pos: [0, 2.0, 6.6], look: [0, 1.5, 0], fov: 58 }, spread: 3.3, forward: 0.6, create: createTetrisWorld },
};
