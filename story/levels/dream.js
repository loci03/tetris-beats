// DREAM OR NIGHTMARE — Level 14. Boss: MECHA-9, a chrome dance-bot doing
// the robot for real, on a neon rooftop where giant robots dance between
// the skyscrapers and helicopters sweep the crowd with searchlights.
import boss from './dream/boss.js';
import mv from './dream/moves.js';
import { buildWorld } from './dream/world.js';
import sprites from './dream/sprites.js';
import { createTetrisWorld } from './dream/tetris.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.2, 8.6], look: [0, 1.7, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createTetrisWorld },
};
