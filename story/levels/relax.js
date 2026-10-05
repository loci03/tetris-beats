// RELAX YOUR MIND — Level 9. Boss: SAGE, the floating mystic (look in
// relax/boss.js, tai chi / yoga / levitation moves in relax/moves.js, the
// floating zen garden at dusk in relax/world.js).
//
// Song grid: the registry's 67.05 BPM half-time grid (pulse 134) checked
// out — the drums sit on the 134 pulse with nothing on triplet positions
// (the analyser's 89.4 BPM alternative is a 2/3 artifact). Sage's own
// feel breathes on the slow 67 beat while the pulse keeps 134.
import boss from './relax/boss.js';
import mv from './relax/moves.js';
import { buildWorld } from './relax/world.js';
import sprites from './relax/sprites.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.3, 8.8], look: [0, 1.8, 0], fov: 50 }, spread: 3.5, forward: 0.9 },
};
