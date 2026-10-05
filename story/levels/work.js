// WORK — Level 11. Boss: MR. MONDAY, the uptight office boss who secretly
// lives for Chicago house (jack, skate, loose legs, shuffle) — with the
// copier, typing, tie-swing and coffee-sip-spin office comedy on top.
// Stage: the open-plan office after hours, turned into a club.
// Song grid: registry 127.155 BPM / firstBeat 0.932 checked against the
// track (whole-song comb + 15 s window phase regression → 127.144; 128 and
// 127.5 drift by whole beats) — kept as is.
import boss from './work/boss.js';
import mv from './work/moves.js';
import { buildWorld } from './work/world.js';
import sprites from './work/sprites.js';
import { createTetrisWorld } from './work/tetris.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.45, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createTetrisWorld },
};
