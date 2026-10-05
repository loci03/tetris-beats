// FERRARI WINDOW — Level 6. Boss: RHETT RYDER.
import boss from './ferrari/boss.js';
import mv from './ferrari/moves.js';
import { buildWorld } from './ferrari/world.js';
import sprites from './ferrari/sprites.js';
import { createHighway } from './ferrari/highway.js';
export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.0, 8.4], look: [0, 1.45, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createHighway },
};
