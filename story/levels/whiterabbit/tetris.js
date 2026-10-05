// WHITE RABBIT — the living Tetris world: the purple twin of Back for
// More's digital rain (see ../backformore/matrix-world.js), with Wonderland
// in the code — pocket watches and playing cards tumbling through the rain
// and the White Rabbit bounding across the grid (follow him).
import { createMatrixWorld } from '../backformore/matrix-world.js';

export function createTetrisWorld(ctx) {
  return createMatrixWorld(ctx, {
    accent: 0xc440ff, glow: 0xe090ff, glowCss: '#e090ff', bg: 0x04000a, sky: 0x2a0848,
    extras: 'wonderland', bright: 1.45, title: 'FOLLOW_THE_WHITE_RABBIT',
  });
}
