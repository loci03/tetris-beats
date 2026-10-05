// GALAXY — Level 20, the six-minute marathon. Boss: NOVA, a cosmic space
// diva who dances as if gravity were optional, on a floating platform
// drifting through a nebula.
import boss from './galaxy/boss.js';
import mv from './galaxy/moves.js';
import { buildWorld } from './galaxy/world.js';
import sprites from './galaxy/sprites.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.2, 8.6], look: [0, 1.6, 0], fov: 50 }, spread: 3.5, forward: 0.9 },
};
