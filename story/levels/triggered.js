// TRIGGERED — Level 12. Boss: SARGE, a hulking drill-sergeant krumper
// (chest pops, arm swings, stomps, jabs, buck hops, the kill-off) who runs
// PT drills mid-battle (march, salute, double time, jumping jacks).
// Stage: a military training yard at night — red alarms and olive drab.
// Song grid: registry 72.6 BPM half-time (145.2 pulse, bounce 2) /
// firstBeat 0.032 checked against the track (15 s window phase regression
// → 72.615; no drift over the 95 s song) — kept as is.
import boss from './triggered/boss.js';
import mv from './triggered/moves.js';
import { buildWorld } from './triggered/world.js';
import sprites from './triggered/sprites.js';

export default {
  boss, moves: mv.moves, moveMeta: mv.moveMeta, sprites,
  buildWorld,
  backdrop: { camera: { pos: [0, 2.1, 8.6], look: [0, 1.5, 0], fov: 50 }, spread: 3.5, forward: 0.9 },
};
