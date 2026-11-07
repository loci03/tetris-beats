// TACO TOWN — Level 16. Boss: TINA, Taco Town's glam queen (look and moves
// in characters.js / dance.js).
import { buildTacoWorld } from '../worlds/taco-world.js';
import { createTetrisWorld } from './taco/tetris.js';

export default {
  boss: 'tina',
  buildWorld: buildTacoWorld,
  backdrop: { create: createTetrisWorld },
};
