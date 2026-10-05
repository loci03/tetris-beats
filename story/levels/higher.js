// HIGHER — Level 13. Boss: SKYE, the laid-back rooftop DJ (look in
// higher/boss.js, laid-back hip-hop / R&B moves in higher/moves.js, the
// ember-haze city rooftop in higher/world.js).
//
// Song grid: the registry's 75.025 BPM half-time grid (pulse 150) checked
// out — the drums sit on the 150 pulse with nothing on triplet positions
// (the analyser's 100 BPM alternative is a 2/3 artifact).
import boss from './higher/boss.js';
import mv from './higher/moves.js';
import { buildWorld } from './higher/world.js';
import sprites from './higher/sprites.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.2, 8.6], look: [0, 1.7, 0], fov: 50 }, spread: 3.5, forward: 0.9 },
};
