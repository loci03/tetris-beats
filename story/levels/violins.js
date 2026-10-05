// FALLING VIOLINS — Level 3. Boss: VIOLETTA, prima ballerina and virtuoso
// violinist (ballet + tango/flamenco fire + air-violin cadenzas), on the
// stage of a golden opera house where violins rain from the flies.
// Song grid: the registry's 127.295 BPM / 0.125 s checks out (four-on-the-
// floor kick, clap on 2 and 4 — see the level report), so no override.
import boss from './violins/boss.js';
import mv from './violins/moves.js';
import { buildWorld } from './violins/world.js';
import sprites from './violins/sprites.js';
import { createTetrisWorld } from './violins/tetris.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.5, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createTetrisWorld },
};
