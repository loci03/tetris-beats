// NUCLEAR WASTE — Level 18. Boss: ROTTEN REX, a goofy cartoon zombie who
// dances like a Thriller-video extra (the shamble, claw hands, shoulder
// shimmies, the dead-man lean, limb flops, a crawl-out-of-the-grave solo).
// Stage: a glowing toxic-waste junkyard with police lights.
// Song grid: registry 105.11 BPM / firstBeat 0.875 checked against the
// track (15 s window phase regression → 105.108, windows within ±15 ms
// after the intro; 105.0 drifts by ~1 beat) — kept as is.
import boss from './nuclear/boss.js';
import mv from './nuclear/moves.js';
import { buildWorld } from './nuclear/world.js';
import sprites from './nuclear/sprites.js';
import { createTetrisWorld } from './nuclear/tetris.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.5, 0], fov: 50 }, spread: 3.5, forward: 0.9, create: createTetrisWorld },
};
