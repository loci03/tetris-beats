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
// Events from the game: move {dir}, rotate {dir}, soft, drop {rows}, hold,
// clear {lines, combo}, levelUp {level}, gameOver, start. Every piece action
// shows: the camera drifts with the piece and kicks on moves / rolls on
// spins / shakes on slams, the dancers lean with each move, twist on each
// rotation and stomp on each hard drop, the lights and crowd follow the
// piece's side, the boss taunts you when your stack gets high.

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
  const bdc = mod.backdrop || {}, spread = bdc.spread ?? 3.5;
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
  // Reaction springs (value, velocity): camera x / roll / dip / fov punch,
  // and per dancer lean / twist / stomp.
  const S = {};
  const sp = (k) => (S[k] || (S[k] = { x: 0, v: 0 }));
  const step = (k, dt, hz, damp) => {
    const s = sp(k), w = 2 * Math.PI * hz, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (-w * w * s.x - 2 * damp * w * s.v) * h; s.x += s.v * h; }
    if (!Number.isFinite(s.x)) { s.x = 0; s.v = 0; }
    return s.x;
  };
  const kick = (k, dv) => { sp(k).v += dv; };
  let shake = 0, follow = 0, leader = 0, dangerHi = false, dangerAt = -99, pulses = { move: 0, cheer: 0, flash: 0 };
  const baseX = { player: rigs.player.root.position.x, rival: rigs.rival.root.position.x };
  const baseY = { player: rigs.player.root.position.y, rival: rigs.rival.root.position.y };
  const api = {
    get failed() { return failed; },
    // info: { songTime } (seconds into the track; null if unknown), energy 0..1
    update(dt, info = {}) {
      if (failed) return;
      songTime = info.songTime != null ? info.songTime : songTime + dt;
      const beat = (songTime - m.firstBeat) / spb;
      lastBeat = beat;
      pulses = { move: info.move || 0, cheer: info.cheer || 0, flash: info.flash || 0 };
      const px = info.pieceX || 0;
      if (custom) custom.update(dt, { beat, songTime, energy: info.energy ?? 1, pieceX: px, danger: info.danger || 0, ...pulses });
      else {
        // Every piece action makes the dancers hit (the drum-hit layer), the
        // crowd and lights lean toward the piece's side.
        const acc = { kick: Math.min(1.2, pulses.move * 1.6), snare: Math.min(1, pulses.flash * 1.2 + pulses.cheer * 0.4), energy: 1 + 0.25 * pulses.cheer };
        dancers.player.update(beat, acc); dancers.rival.update(beat, acc);
        leader += (-px - leader) * Math.min(1, dt * 3);
        world.update(dt, { beat, songTime, leader: leader * 0.8 });
        fx.update(dt);
        // Dancers: lean with moves, twist on spins, stomp on slams.
        for (const who of ['player', 'rival']) {
          const lean = step(who + 'lean', dt, 2.2, 0.35), twist = step(who + 'twist', dt, 1.6, 0.3), stomp = step(who + 'stomp', dt, 3.2, 0.4);
          const r = rigs[who].root;
          r.rotation.set(0, twist, -lean * 0.5);
          r.position.x = baseX[who] + lean * 0.25;
          r.position.y = baseY[who] + Math.min(0, stomp) * 0.25 + Math.max(0, stomp) * 0.1;
        }
        // Camera: slow drift + follows the piece + action kicks.
        const t = songTime;
        follow += (px * 0.55 - follow) * Math.min(1, dt * 2.5);
        const cx = step('camx', dt, 2.4, 0.45), roll = step('roll', dt, 2.0, 0.3), dip = step('dip', dt, 2.8, 0.5), fovp = step('fov', dt, 2.6, 0.45);
        shake = Math.max(0, shake - dt * 2.6);
        const sx = shake * (Math.random() - 0.5) * 0.35, sy = shake * (Math.random() - 0.5) * 0.25;
        camera.position.set(base.pos.x + Math.sin(t * 0.13) * 0.45 + follow + cx + sx, base.pos.y + Math.sin(t * 0.21) * 0.15 + dip + sy, base.pos.z + Math.sin(t * 0.09) * 0.35);
        camera.lookAt(base.look.x + follow * 0.6 + cx * 0.5, base.look.y + dip * 0.5, base.look.z);
        camera.rotateZ(roll);
        const fv = (cam.fov || 52) - fovp;
        if (Math.abs(camera.fov - fv) > 0.01) { camera.fov = fv; camera.updateProjectionMatrix(); }
        // The boss taunts you when your stack gets dangerously high.
        const dg = info.danger || 0;
        if (!dangerHi && dg > 0.65 && songTime - dangerAt > 8) {
          dangerHi = true; dangerAt = songTime;
          const b = Math.ceil(lastBeat + 0.25);
          dancers.rival.play(rDef.taunt || 'taunt', b, 4, { faceFoe: true });
          fxAt('rival', (rDef.fx || {}).taunt, 5); fxAt('player', 'sweat', 2);
          world.react('taunt', { attacker: 'rival' });
        } else if (dangerHi && dg < 0.5) dangerHi = false;
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
      // Level worlds can add their own reactions to piece actions (the
      // 2D scenes each had theirs): world.react('piece', { kind, ... }).
      world.react('piece', { kind, songTime, ...data });
      if (kind === 'move') {
        const d = data.dir || 0;
        kick('camx', d * 0.9); kick('playerlean', d * 2.6); kick('rivallean', d * 2.0);
        return;
      }
      if (kind === 'rotate') {
        const d = data.dir || 1;
        kick('roll', d * 0.22); kick('playertwist', d * 7); kick('rivaltwist', -d * 3);
        return;
      }
      if (kind === 'soft') { kick('dip', -0.35); kick('playerstomp', -0.8); return; }
      if (kind === 'hold') {
        kick('playertwist', 14); fxAt('player', 'sparkle', 3);
        return;
      }
      if (kind === 'drop') {
        const r = data.rows || 0, k = Math.min(1, 0.3 + r / 14);
        shake = Math.max(shake, k); kick('fov', 9 * k); kick('dip', -1.2 * k);
        kick('playerstomp', -4 * k); kick('rivalstomp', -3 * k);
        if (r >= 6) world.react('taunt', { attacker: 'player' });
        return;
      }
      if (kind === 'clear') {
        kick('fov', 6 + 3 * (data.lines || 1));
        if ((data.combo || 0) >= 2) fxAt('player', 'sparkle', 2 + data.combo);
        if ((data.combo || 0) >= 4) fxAt('rival', 'sweat', 1);
        const n = data.lines || 1, tier = Math.min(4, n);
        dancers.player.play(moveFor('player', tier), b, 4);
        fxAt('player', (pDef.fx || {}).move, 3 + n);
        if (n >= 4) {
          dancers.rival.play('reactOoh', b, 2); world.react('move', { who: 'player', tier: 4, songTime }); world.react('drop', {});
          world.react('tauntLanded', { attacker: 'player', defender: 'rival' });
          shake = 1; fxAt('rival', 'exclaim', 1);
        } else world.react('move', { who: 'player', tier: tier + 1, songTime });
      } else if (kind === 'combo' && data.n >= 3) {
        fxAt('player', 'sparkle', 6);
      } else if (kind === 'levelUp') {
        // Level up: the spotlight's on you for a few beats; the boss answers.
        dancers.player.play(pDef.solo || moveFor('player', 4), b, 4);
        dancers.rival.play('soloWatch', b, 4);
        world.react('solo', { who: 'player', songTime, until: songTime + 4 * spb });
        fxAt('player', 'sparkle', 8);
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
