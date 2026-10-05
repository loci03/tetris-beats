// Backdrop3D — a level's 3D world rendered behind the Tetris board: the
// stage, the crowd and both dancers grooving to the song, reacting to the
// match (line clears are dance moves, a Tetris is a big move with the
// stage going off). Rendered at reduced resolution (it sits behind the
// board — a soft backdrop reads as depth of field) with an adaptive
// quality governor; if frames get slow it drops resolution and frame rate,
// and as a last resort reports `failed` so the game can fall back to its
// 2D background.
//
// A level module can customise it via `backdrop`:
//   camera: { pos:[x,y,z], look:[x,y,z], fov }   — framing (dancers either side of the board)
//   spread, forward: dancer x (±spread) and z offset from the stage anchors
//   create(ctx) → { update(dt, info), react(kind, data), dispose() }
//        replaces the default behaviour; ctx = { THREE, scene, camera, world,
//        rigs, dancers, low, level }. Used by Ferrari Window's highway chase.
// Events from the game: clear {lines}, drop, levelUp {level}, combo {n},
// gameOver, start.

import * as THREE from '../vendor/three/three.module.min.js';
import { createCharacter, CHARACTERS } from './characters.js';
import { DanceController } from './dance.js';
import { AnimeFx } from './anime-fx.js';
import { STORY_LEVELS, loadLevel } from './levels.js';

export async function createBackdrop(levelId, { canvas, low = false } = {}) {
  const mod = await loadLevel(levelId);
  const level = STORY_LEVELS[levelId], m = level.music, spb = 60 / m.bpm;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a0f3a, 26, 80);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 260);
  scene.add(camera);
  const world = mod.buildWorld({ lowGraphics: true });
  scene.add(world.group);
  world.setLightLevel(1);
  const pDef = CHARACTERS.player, rDef = CHARACTERS[level.dancers.rival];
  const rigs = { player: createCharacter(pDef), rival: createCharacter(rDef) };
  // The board covers the middle of the screen: the dancers move out to
  // either side of it (backdrop.spread = |x| of each dancer).
  const bdc = mod.backdrop || {}, spread = bdc.spread ?? 2.9;
  rigs.player.root.position.copy(world.anchors.player).setX(-spread).setZ(world.anchors.player.z + (bdc.forward ?? 0.9));
  rigs.rival.root.position.copy(world.anchors.rival).setX(spread).setZ(world.anchors.rival.z + (bdc.forward ?? 0.9));
  rigs.player.baseYaw = 0.12; rigs.rival.baseYaw = -0.12;
  scene.add(rigs.player.root, rigs.rival.root);
  const style = (d) => ({ ...d.style, bounceRate: m.bounce || 1, spb });
  const dancers = { player: new DanceController(rigs.player, style(pDef), +1), rival: new DanceController(rigs.rival, style(rDef), -1) };
  const fx = new AnimeFx(scene, 32);
  const bd = mod.backdrop || {};
  const cam = bd.camera || { pos: [0, 2.0, 8.4], look: [0, 1.45, 0], fov: 50 };
  const base = { pos: new THREE.Vector3(...cam.pos), look: new THREE.Vector3(...cam.look) };
  const ctx = { THREE, scene, camera, world, rigs, dancers, low, level, fx };
  const custom = bd.create ? bd.create(ctx) : null;

  let scale = low ? 0.5 : 0.7, w = 0, h = 0, skip = 0, frame = 0, slow = 0, fast = 0, failed = false;
  const resize = () => {
    const W = canvas.clientWidth || window.innerWidth, H = canvas.clientHeight || window.innerHeight;
    const nw = Math.max(64, Math.round(W * scale)), nh = Math.max(64, Math.round(H * scale));
    if (nw !== w || nh !== h) { w = nw; h = nh; renderer.setSize(w, h, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  };
  const moveFor = (who, tier) => {
    const def = who === 'player' ? pDef : rDef;
    const list = def.moves[Math.max(1, Math.min(4, tier))] || def.moves[1];
    return list[Math.floor(Math.random() * list.length)];
  };
  const fxAt = (who, kind, n) => {
    if (!kind) return;
    const p = rigs[who].root.position.clone(); p.y += 2.05 * rigs[who].def.scale;
    fx.burst(kind, p, n);
  };
  let lastBeat = 0, songTime = 0;
  const api = {
    get failed() { return failed; },
    // info: { songTime } (seconds into the track; null if unknown), energy 0..1
    update(dt, info = {}) {
      if (failed) return;
      songTime = info.songTime != null ? info.songTime : songTime + dt;
      const beat = (songTime - m.firstBeat) / spb;
      lastBeat = beat;
      if (custom) custom.update(dt, { beat, songTime, energy: info.energy ?? 1 });
      else {
        const acc = info.acc || null;
        dancers.player.update(beat, acc); dancers.rival.update(beat, acc);
        world.update(dt, { beat, songTime, leader: 0 });
        fx.update(dt);
        // Slow drift so the backdrop feels alive.
        const t = songTime;
        camera.position.set(base.pos.x + Math.sin(t * 0.13) * 0.6, base.pos.y + Math.sin(t * 0.21) * 0.15, base.pos.z + Math.sin(t * 0.09) * 0.4);
        camera.lookAt(base.look);
        if (camera.fov !== cam.fov) { camera.fov = cam.fov || 52; camera.updateProjectionMatrix(); }
      }
      // Frame governor: render every (skip+1)th call; adapt to frame cost.
      if ((frame++ % (skip + 1)) !== 0) return;
      resize();
      const t0 = performance.now();
      renderer.render(scene, camera);
      const ms = performance.now() - t0;
      if (ms > 9) { slow++; fast = 0; } else if (ms < 4) { fast++; slow = Math.max(0, slow - 1); }
      if (slow > 20) {
        slow = 0;
        if (scale > 0.42) scale -= 0.12; else if (skip < 2) skip++; else failed = true;
      } else if (fast > 240 && scale < (low ? 0.5 : 0.75)) { fast = 0; scale += 0.06; }
    },
    react(kind, data = {}) {
      if (custom) { custom.react && custom.react(kind, data); return; }
      const b = Math.ceil(lastBeat + 0.25);
      if (kind === 'clear') {
        const n = data.lines || 1, tier = Math.min(4, n);
        dancers.player.play(moveFor('player', tier), b, 4);
        fxAt('player', (pDef.fx || {}).move, 3 + n);
        if (n >= 4) { dancers.rival.play('reactOoh', b, 2); world.react('move', { who: 'player', tier: 4, songTime }); world.react('drop', {}); }
        else world.react('move', { who: 'player', tier: tier + 1, songTime });
      } else if (kind === 'combo' && data.n >= 3) {
        fxAt('player', 'sparkle', 6);
      } else if (kind === 'levelUp') {
        dancers.rival.play(moveFor('rival', 3), b, 4);
        fxAt('rival', (rDef.fx || {}).big, 6);
        world.react('move', { who: 'rival', tier: 3, songTime });
      } else if (kind === 'gameOver') {
        dancers.player.play('defeat', b, 8); dancers.rival.play(rDef.victory || 'victory', b, 8);
        world.react('end', { who: 'rival' });
      } else if (kind === 'start') {
        world.react('drop', {});
      }
    },
    dispose() {
      if (custom && custom.dispose) custom.dispose();
      world.dispose(); fx.dispose();
      rigs.player.dispose(); rigs.rival.dispose();
      renderer.dispose();
    },
  };
  return api;
}
