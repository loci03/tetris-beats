// HE GOT ME — Level 15. Boss: DEACON GRACE, the powerhouse choir director
// (praise dance, gospel stomp-claps, the holy-ghost shout, the church
// two-step, robe twirls), on a radiant cathedral stage with stained glass
// that lights on the beat and a robed choir swaying on the risers.
// Song grid: the registry's 119.98 BPM / 0.763 s holds (gospel over 808
// trap drums; drift < 20 ms across the song), so no override.
import boss from './hegotme/boss.js';
import mv from './hegotme/moves.js';
import { buildWorld } from './hegotme/world.js';
import sprites from './hegotme/sprites.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.5, 0], fov: 50 }, spread: 3.5, forward: 0.9 },
};
