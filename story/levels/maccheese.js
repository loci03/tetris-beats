// MAC & CHEESE — Level 7. Boss: CHEF GOUDA, the jolly cheese-factory chef
// (look in maccheese/boss.js, old-school party moves in maccheese/moves.js,
// the bubbling-pot kitchen stage in maccheese/world.js).
import boss from './maccheese/boss.js';
import mv from './maccheese/moves.js';
import { buildWorld } from './maccheese/world.js';
import sprites from './maccheese/sprites.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.2, 8.6], look: [0, 1.6, 0], fov: 50 }, spread: 3.5, forward: 0.9 },
};
