// BACK FOR MORE — the living Tetris world: the green digital rain (see
// matrix-world.js) with hot-air balloons drifting up through the code.
import { createMatrixWorld } from './matrix-world.js';

export function createTetrisWorld(ctx) {
  return createMatrixWorld(ctx, {
    accent: 0x00ff41, glow: 0x39ff7e, glowCss: '#39ff7e', bg: 0x000503, sky: 0x00331a,
    extras: 'balloons', title: 'SYSTEM://LEVEL_04',
  });
}
