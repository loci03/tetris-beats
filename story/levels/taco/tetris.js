// TACO TOWN — the living Tetris world: a food fight in a packed taqueria.
// Terracotta walls with talavera tile bands, a saltillo floor, papel picado
// and string lights under the beams, a ceiling fan, the kitchen pass-through
// (back left) with the cook shouting over a flaming comal and steam rolling
// out under the menu board and the TACOS neon, red booths (back right) under
// the HOT and OPEN signs, a piñata — and customers at both flanks lobbing
// tacos, burritos, guac and hot sauce across the room. Food splats stick to
// the walls and floor. The old 2D food-fight scene, in 3D.
//
// Reactions: moves make a customer on that side wind up and throw; rotations
// flutter the papel picado and kick the fan; soft drops flare the comal;
// hard drops burst tortilla chips off the floor with a golden flash and a
// volley (scaled by rows); holds make the cook flip a tortilla; clears fire
// hot-sauce shockwave rings, a red flash, the cook shouts and everyone
// throws (bigger per line, combos escalate); a Tetris also bursts the piñata;
// level up bursts it too with a light chase; a high stack sets the kitchen
// ablaze (smoke, red light, HOT sign strobing); game over flips OPEN to
// CLOSED and the room goes dim; start lights it back up.

import { makeKit } from '../underground/tetris-kit.js';

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const K = makeKit(THREE), keep = K.keep;
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0x1a0a04, 18, 48);
  scene.background = new THREE.Color(0x120800);
  camera.far = 120; camera.updateProjectionMatrix();
  const root = new THREE.Group();
  scene.add(root);
  const col = new THREE.Color(), dummy = new THREE.Object3D(), v3 = new THREE.Vector3();
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const lamV = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const addMat = (color, opacity = 1, map = null) => keep(new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const W = 12, D0 = -8, H = 7.2;      // room half-width, back wall z, height

  // ── Room shell ──────────────────────────────────────────────────
  const TILE = ['#1e6acc', '#cc1e28', '#d4a010', '#1ea030', '#a028a0'];
  const wallTex = K.canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b0603a'); gr.addColorStop(1, '#8a4024');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,200,150' : '40,10,0'},${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    const band = (y, s) => { for (let x = 0, i = 0; x < w; x += s, i++) { g.fillStyle = TILE[i % 5]; g.fillRect(x + 1, y, s - 2, s - 2); g.fillStyle = 'rgba(255,255,255,0.25)'; g.save(); g.translate(x + s / 2, y + s / 2 - 1); g.rotate(Math.PI / 4); g.fillRect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4); g.restore(); } };
    band(20, 32); band(390, 36);
    g.fillStyle = '#3c1208'; g.fillRect(0, 426, w, h - 426);
  });
  wallTex.wrapS = THREE.RepeatWrapping;
  const backTex = wallTex; backTex.repeat.set(3, 1);
  const wallMat = keep(new THREE.MeshLambertMaterial({ map: backTex }));
  // Back wall with the kitchen pass-through cut out.
  const wallShape = new THREE.Shape([new THREE.Vector2(-W, 0), new THREE.Vector2(W, 0), new THREE.Vector2(W, H), new THREE.Vector2(-W, H)]);
  wallShape.holes.push(new THREE.Path([new THREE.Vector2(-11.05, 2.1), new THREE.Vector2(-11.05, 4.4), new THREE.Vector2(-6.95, 4.4), new THREE.Vector2(-6.95, 2.1)]));
  const backGeo = keep(new THREE.ShapeGeometry(wallShape));
  { const p = backGeo.attributes.position, uv = backGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W) / (2 * W), p.getY(i) / H); }
  const back = new THREE.Mesh(backGeo, wallMat); back.position.set(0, 0, D0); root.add(back);
  for (const sx of [-1, 1]) { const s = new THREE.Mesh(keep(new THREE.PlaneGeometry(22, H)), wallMat); s.position.set(sx * W, H / 2, 3); s.rotation.y = -sx * Math.PI / 2; root.add(s); }
  const floorTex = K.canvasTex(256, 256, (g, w, h) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 0.85 + Math.random() * 0.3; g.fillStyle = `rgb(${150 * v | 0},${72 * v | 0},${30 * v | 0})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
    g.fillStyle = 'rgba(60,25,8,0.9)'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 2, 0, 4, h); g.fillRect(0, i * 64 - 2, w, 4); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(12, 11);
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(2 * W, 22)), keep(new THREE.MeshLambertMaterial({ map: floorTex }))); floor.rotation.x = -Math.PI / 2; floor.position.z = 3; root.add(floor);
  const ceil = new THREE.Mesh(keep(new THREE.PlaneGeometry(2 * W, 22)), basic(0x1e1008)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, 3); root.add(ceil);

  // Static props: beams, kitchen frame + counter, booths + tables, menu board frame.
  const B = new K.Builder();
  for (let z = -6; z <= 10; z += 4) B.box(2 * W, 0.35, 0.4, 0, H - 0.2, z, 0x3a1e0c);
  // Kitchen (back left): frame round a window, counter, back wall of the kitchen.
  const KX = -9;
  B.box(4.4, 0.3, 0.5, KX, 4.55, D0 + 0.2, 0x5a2808).box(4.4, 0.3, 0.8, KX, 1.95, D0 + 0.4, 0x6a3010);
  B.box(0.3, 2.9, 0.5, KX - 2.2, 3.25, D0 + 0.2, 0x5a2808).box(0.3, 2.9, 0.5, KX + 2.2, 3.25, D0 + 0.2, 0x5a2808);
  B.box(4.2, 2.6, 0.1, KX, 3.3, D0 - 1.6, 0x2a1408);                     // kitchen interior wall
  B.box(4.1, 0.1, 1.4, KX, 2.1, D0 - 0.9, 0x1a0c04);                     // kitchen floor/counter level
  B.box(1.6, 0.15, 0.8, KX + 0.9, 2.2, D0 - 1.0, 0x222222);              // comal
  B.box(4.4, 1.9, 0.6, KX, 0.95, D0 + 0.3, 0x7a3a14);                    // counter front
  // Booths (back right) + front tables at both flanks.
  for (const bz of [-6.6, -3.6]) { B.box(4.2, 0.5, 1.0, 9.6, 0.5, bz, 0x8a1a08).box(4.2, 1.3, 0.25, 9.6, 1.3, bz - 0.45, 0x8a1a08); B.box(3.6, 0.12, 1.1, 9.6, 1.05, bz + 0.85, 0x6a3818).box(0.15, 1.0, 0.15, 9.6, 0.5, bz + 0.85, 0x3a1e0c); }
  for (const [tx, tz] of [[-6.2, 2.2], [6.2, 2.2], [-8.4, -1.8], [8.0, 0.2]]) { B.cyl(0.85, 0.85, 0.1, 14, tx, 1.0, tz, 0x6a3818).cyl(0.08, 0.1, 1.0, 6, tx, 0.5, tz, 0x2a160a); B.cyl(0.28, 0.24, 0.12, 10, tx + 0.3, 1.1, tz, 0xd0c8b0); }
  // Menu board frame + sign plates.
  B.box(5.2, 1.9, 0.12, KX, 5.75, D0 + 0.08, 0x0e0804);
  // Foreground table (bottom of the screen; portrait's lower strip): plates, salsa, sauce bottles.
  B.box(7, 0.16, 1.6, 0, 1.25, 6.6, 0x7a4420).box(7.2, 0.08, 1.7, 0, 1.36, 6.6, 0xd8c8a0);
  for (const px of [-2.4, -0.8, 0.9, 2.5]) { B.cyl(0.38, 0.32, 0.06, 14, px, 1.43, 6.5, 0xf4f0e6); B.add(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10, 1, false, 0, Math.PI), px - 0.1, 1.55, 6.5, 0xf2b02e, Math.PI / 2, 0.3, 0); B.add(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10, 1, false, 0, Math.PI), px + 0.15, 1.55, 6.4, 0xf2b02e, Math.PI / 2, -0.2, 0); }
  for (const [bx, c] of [[-1.6, 0xd8180c], [0.05, 0x2a9a20], [1.7, 0xff7a10]]) B.cyl(0.09, 0.11, 0.4, 8, bx, 1.6, 6.8, c).cyl(0.05, 0.05, 0.1, 6, bx, 1.85, 6.8, 0xf0f0f0);
  for (const [bx, c] of [[-3.2, 0xcc2200], [3.2, 0x5a9818]]) B.cyl(0.26, 0.2, 0.16, 12, bx, 1.48, 6.7, 0xe0d8c8).cyl(0.22, 0.22, 0.02, 12, bx, 1.56, 6.7, c);
  // Piñata cord anchor + fan mount.
  B.cyl(0.04, 0.04, 0.5, 4, -5.2, H - 0.25, 2, 0x222222);
  root.add(new THREE.Mesh(B.build(), lamV));

  // Kitchen fire glow (window) + comal flames.
  const fireGlowMat = addMat(0xff8a20, 0.55, K.glowTex);
  const fireGlow = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.2, 2.6)), fireGlowMat); fireGlow.position.set(KX, 3.2, D0 - 1.5); root.add(fireGlow);
  const flameMat = addMat(0xff6010, 0.9, K.glowTex);
  const flames = [];
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.5, 0.9)), flameMat); f.position.set(KX + 0.4 + i * 0.32, 2.6, D0 - 0.95); root.add(f); flames.push(f); }

  // The cook: body, head, chef hat, mouth, two arms (one with a spatula).
  const cook = new THREE.Group(); cook.position.set(KX - 0.6, 2.1, D0 - 1.0); root.add(cook);
  const cb = new K.Builder();
  cb.add(new THREE.CapsuleGeometry(0.34, 0.6, 2, 8), 0, 0.75, 0, 0xe8e2d4);
  cb.sphere(0.27, 0, 1.45, 0, 0x8a5028).cyl(0.22, 0.2, 0.36, 10, 0, 1.82, 0, 0xf4f0e8).sphere(0.3, 0, 2.02, 0, 0xf4f0e8, 1, 0.6, 1);
  cb.box(0.22, 0.05, 0.05, -0.1, 1.55, 0.25, 0x150602).box(0.22, 0.05, 0.05, 0.1, 1.55, 0.25, 0x150602);   // angry brows
  cb.box(0.32, 0.06, 0.04, 0, 1.36, 0.25, 0x2a1408);                                                         // moustache
  cook.add(new THREE.Mesh(cb.build(), lamV));
  const mouth = new THREE.Mesh(keep(new THREE.CircleGeometry(0.09, 10)), basic(0x1a0602)); mouth.position.set(0, 1.28, 0.27); cook.add(mouth);
  const cArmGeo = keep(new THREE.CapsuleGeometry(0.08, 0.5, 2, 6)); cArmGeo.translate(0, -0.3, 0);
  const cArmMat = keep(new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }));
  const cookArms = [-1, 1].map(s => { const a = new THREE.Mesh(cArmGeo, cArmMat); a.position.set(s * 0.42, 1.15, 0); cook.add(a); return a; });
  const spat = new THREE.Mesh(keep(new THREE.BoxGeometry(0.22, 0.04, 0.3)), basic(0xb0b0b8)); spat.position.set(0, -0.7, 0.1); cookArms[1].add(spat);
  const tortilla = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 14)), keep(new THREE.MeshLambertMaterial({ color: 0xf0d080 }))); tortilla.visible = false; root.add(tortilla);

  // Menu board.
  const menuTex = K.canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = '#0e0804'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff9a20'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffd060'; g.font = 'bold 34px monospace'; g.textBaseline = 'middle';
    ['TACO ......... $3', 'BURRITO ...... $5', 'GUAC ........ +$1', 'COMBO ........ $8'].forEach((t, i) => g.fillText(t, 30, 32 + i * 42));
  });
  const menuMat = basic(0xffffff, { map: menuTex });
  const menu = new THREE.Mesh(keep(new THREE.PlaneGeometry(5, 1.8)), menuMat); menu.position.set(KX, 5.75, D0 + 0.15); root.add(menu);

  // Neon signs: TACOS (over the kitchen), HOT + chili (right), OPEN/CLOSED (right).
  const neonTex = (w, h, draw) => K.canvasTex(w, h, (g) => { g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; draw(g); });
  const glowText = (g, t, x, y, size, c1, c2) => { g.font = `900 ${size}px "Arial Black", Impact, sans-serif`; g.shadowColor = c1; g.shadowBlur = size * 0.35; g.strokeStyle = c1; g.lineWidth = size * 0.1; g.strokeText(t, x, y); g.shadowBlur = size * 0.15; g.fillStyle = c2; g.fillText(t, x, y); };
  const tacosTex = neonTex(512, 128, g => glowText(g, 'TACOS', 256, 64, 96, '#ff6a00', '#fff0b0'));
  const hotTex = neonTex(256, 128, g => { glowText(g, 'HOT', 150, 64, 80, '#ff1010', '#ffd0c0'); g.fillStyle = '#ff2010'; g.shadowColor = '#ff2010'; g.shadowBlur = 16; g.beginPath(); g.ellipse(40, 70, 18, 34, 0.5, 0, 7); g.fill(); g.fillStyle = '#30c020'; g.fillRect(44, 26, 8, 14); });
  const openTex = neonTex(256, 256, g => { glowText(g, 'OPEN', 128, 64, 70, '#10ff70', '#d0ffe0'); glowText(g, 'CLOSED', 128, 192, 56, '#ff2050', '#ffd0e0'); });
  const tacosMat = basic(0xffffff, { map: tacosTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const tacos = new THREE.Mesh(keep(new THREE.PlaneGeometry(5.2, 1.3)), tacosMat); tacos.position.set(KX, 6.65, D0 + 0.2); root.add(tacos);
  const hotMat = basic(0xffffff, { map: hotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const hot = new THREE.Mesh(keep(new THREE.PlaneGeometry(3, 1.5)), hotMat); hot.position.set(9.4, 5.6, D0 + 0.1); root.add(hot);
  // Hanging TACO TOWN banner over the room (top of a portrait screen).
  const bannerTex = neonTex(512, 128, g => glowText(g, 'TACO TOWN', 256, 64, 78, '#ff2d95', '#fff4fb'));
  const bannerMat = basic(0xffffff, { map: bannerTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const banner = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.4, 1.1)), bannerMat); banner.position.set(0, 6.1, 4.5); root.add(banner);
  const openGeo = keep(new THREE.PlaneGeometry(1.8, 0.9));
  const openMat = basic(0xffffff, { map: openTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const openUv = openGeo.attributes.uv;
  const setOpen = (closed) => { for (let i = 0; i < openUv.count; i++) openUv.setY(i, (i < 2 ? 1 : 0.5) - (closed ? 0.5 : 0)); openUv.needsUpdate = true; };
  setOpen(false);
  const openSign = new THREE.Mesh(openGeo, openMat); openSign.position.set(W - 0.02, 3.6, -1.5); openSign.rotation.y = -Math.PI / 2; root.add(openSign);

  // ── Papel picado + string lights ────────────────────────────────
  const flagTex = K.canvasTex(64, 80, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h - 12);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 16, h - 12); g.lineTo(i * 16 + 8, h); g.lineTo(i * 16 + 16, h - 12); g.fill(); }
    g.globalCompositeOperation = 'destination-out';
    for (let y = 14; y < h - 18; y += 16) for (let x = 10; x < w - 6; x += 16) { g.beginPath(); g.arc(x + ((y / 16) % 2) * 6, y, 4, 0, 7); g.fill(); }
  });
  const FLAGC = [0xe82020, 0xf0c010, 0x2070e0, 0x20b030, 0xe020a0, 0xff8010];
  const flagGeo = keep(new THREE.PlaneGeometry(0.42, 0.52)); flagGeo.translate(0, -0.26, 0);
  const flagList = [], bulbList = [];
  for (const [z, y] of [[-2.5, 6.95], [2.5, 6.9]]) {
    const n = low ? 22 : 30;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = -W + u * 2 * W, sag = Math.sin(u * Math.PI) * 0.45;
      flagList.push({ x, y: y - sag, z, ph: i * 0.7 + z, c: FLAGC[(i + Math.round(z) + 50) % 6] });
      if (i % 2 === 0) bulbList.push({ x: x + 0.4, y: y - sag + 0.08, z: z + 0.25, c: [0xff6600, 0xff2200, 0xffcc00, 0x00cc44, 0xff2288][(i / 2) % 5] });
    }
  }
  const flags = new THREE.InstancedMesh(flagGeo, keep(new THREE.MeshBasicMaterial({ map: flagTex, alphaTest: 0.4, side: THREE.DoubleSide })), flagList.length);
  flagList.forEach((f, i) => flags.setColorAt(i, col.set(f.c)));
  root.add(flags);
  const bulbs = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.09, 6, 4)), basic(0xffffff, { fog: false }), bulbList.length);
  bulbList.forEach((b, i) => { dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); bulbs.setMatrixAt(i, dummy.matrix); });
  root.add(bulbs);
  const bulbHalo = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), addMat(0xffffff, 0.5, K.glowTex), bulbList.length);
  root.add(bulbHalo);

  // ── Ceiling fan + piñata ────────────────────────────────────────
  const fan = new THREE.Group(); fan.position.set(-5.2, H - 0.5, 2); root.add(fan);
  const fb = new K.Builder(); fb.cyl(0.18, 0.22, 0.25, 10, 0, 0, 0, 0x3a2a1a);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; fb.add(new THREE.BoxGeometry(1.5, 0.04, 0.32), Math.cos(a) * 0.85, -0.05, Math.sin(a) * 0.85, 0x6a4020, 0, -a, 0); }
  fan.add(new THREE.Mesh(fb.build(), lamV));
  const pinata = new THREE.Group(); pinata.position.set(5.2, H - 1.6, 1.5); root.add(pinata);
  const pb = new K.Builder(); pb.sphere(0.45, 0, 0, 0, 0xff3d9a, 1, 1, 1, 10);
  [0xffd23a, 0x29c7ff, 0x3ddc84, 0xff7a1a, 0xb35cff].forEach((c, i) => { const a = i * Math.PI * 2 / 5; pb.add(new THREE.ConeGeometry(0.16, 0.7, 8), Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0, c, 0, 0, a - Math.PI / 2); });
  pinata.add(new THREE.Mesh(pb.build(), lamV));
  const pinCord = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.015, 0.015, 1, 4)), basic(0x111111)); pinCord.position.set(5.2, H - 0.6, 1.5); root.add(pinCord);

  // ── Customers (instanced parts, JS-posed so each throws on its own) ─
  const SKIN = [0x2a1408, 0x6b3010, 0x8b4820, 0xc07840, 0xe0ac69];
  const SHIRT = [0xcc2200, 0xe07020, 0xd0a020, 0x204080, 0x206030, 0x802060, 0x30a0c0];
  const custs = [];
  const addCust = (x, z, side, s = 1) => custs.push({ x, z, side, s, ph: Math.random() * 6.28, state: 0, t: Math.random() * 4 + 1, wind: 0, rel: 0, jump: 0, shirt: SHIRT[custs.length % 7], skin: SKIN[(custs.length * 3) % 5] });
  for (const [x, z] of [[-5.2, 1.0], [-7.0, 3.2], [-6.8, -0.6], [-8.6, 1.6], [-5.6, 4.6], [-9.8, -1.4], [-7.6, -3.4]]) addCust(x, z, -1);
  for (const [x, z] of [[5.2, 1.2], [7.0, 3.0], [6.6, -0.8], [8.8, 1.4], [5.8, 4.6], [8.4, -5.4], [10.6, -5.2], [9.6, -2.3]]) addCust(x, z, 1);
  const NC = custs.length;
  const bodyM = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.3, 0.6, 2, 8)), keep(new THREE.MeshLambertMaterial({ color: 0xffffff })), NC);
  const headM = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.24, 10, 7)), keep(new THREE.MeshLambertMaterial({ color: 0xffffff })), NC);
  const armG = keep(new THREE.CapsuleGeometry(0.08, 0.55, 2, 5)); armG.translate(0, -0.32, 0);
  const armM = new THREE.InstancedMesh(armG, keep(new THREE.MeshLambertMaterial({ color: 0xffffff })), NC * 2);
  custs.forEach((c, i) => { bodyM.setColorAt(i, col.set(c.shirt)); headM.setColorAt(i, col.set(c.skin)); armM.setColorAt(i * 2, col.set(c.shirt)); armM.setColorAt(i * 2 + 1, col.set(c.skin)); });
  root.add(bodyM, headM, armM);

  // ── Food (projectiles), splats, chips, rings, steam, sparkles ───
  const FT = [
    { name: 'taco', splat: 0xd49020 }, { name: 'burrito', splat: 0xc8a040 }, { name: 'guac', splat: 0x5a9818 }, { name: 'sauce', splat: 0xcc1008 }, { name: 'tomato', splat: 0xcc2200 },
  ];
  const fg = [];
  { const b = new K.Builder(); b.add(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 12, 1, false, 0, Math.PI), 0, 0, 0, 0xf2b02e, Math.PI / 2, 0, 0); b.sphere(0.22, 0, 0.06, 0, 0x5ccf3a, 1.2, 0.5, 0.5); fg.push(b.build()); }
  { const b = new K.Builder(); b.add(new THREE.CapsuleGeometry(0.15, 0.45, 2, 8), 0, 0, 0, 0xe8d0a0, 0, 0, Math.PI / 2); fg.push(b.build()); }
  { const b = new K.Builder(); b.sphere(0.2, 0, 0, 0, 0x5ccf3a, 1, 1, 1, 8); fg.push(b.build()); }
  { const b = new K.Builder(); b.cyl(0.1, 0.12, 0.42, 8, 0, 0, 0, 0xd8180c).cyl(0.05, 0.06, 0.14, 6, 0, 0.27, 0, 0xf0f0f0); fg.push(b.build()); }
  { const b = new K.Builder(); b.sphere(0.18, 0, 0, 0, 0xe02818, 1, 0.9, 1, 8); fg.push(b.build()); }
  const FPER = low ? 6 : 9;
  const foodMeshes = fg.map(g => { const m = new THREE.InstancedMesh(g, lamV, FPER); m.count = 0; m.frustumCulled = false; root.add(m); return m; });
  const food = [];
  for (let t = 0; t < FT.length; t++) for (let i = 0; i < FPER; i++) food.push({ type: t, life: 0, T: 1, age: 0, p0: new THREE.Vector3(), p1: new THREE.Vector3(), arc: 2, spin: 0, nx: 0, ny: 0, nz: 1 });
  // Splats: blob-with-drips decal, oriented on the wall/floor they hit.
  const splatTex = K.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 54, 30, 0, 7); g.fill();
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + Math.random() * 0.4, r = 26 + Math.random() * 14; g.beginPath(); g.arc(64 + Math.cos(a) * r, 54 + Math.sin(a) * r, 6 + Math.random() * 8, 0, 7); g.fill(); }
    for (let i = 0; i < 3; i++) { const x = 44 + i * 18 + Math.random() * 6, l = 30 + Math.random() * 40; g.fillRect(x - 3, 60, 6, l); g.beginPath(); g.arc(x, 60 + l, 5, 0, 7); g.fill(); }
  });
  const SPL = low ? 30 : 48;
  const splatM = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshLambertMaterial({ map: splatTex, alphaTest: 0.5, transparent: false, polygonOffset: true, polygonOffsetFactor: -2 })), SPL);
  splatM.count = 0; root.add(splatM);
  let splatN = 0;
  const qn = new THREE.Quaternion(), zAx = new THREE.Vector3(0, 0, 1), nrm = new THREE.Vector3();
  const addSplat = (x, y, z, nx, ny, nz, c, s = 1) => {
    const i = splatN % SPL; splatN++;
    nrm.set(nx, ny, nz); qn.setFromUnitVectors(zAx, nrm);
    dummy.position.set(x + nx * 0.02, y + ny * 0.02, z + nz * 0.02); dummy.quaternion.copy(qn);
    if (ny > 0.5) dummy.rotateZ(Math.random() * 6.28); else dummy.rotateZ((Math.random() - 0.5) * 0.4);
    dummy.scale.setScalar(s * (0.7 + Math.random() * 0.6)); dummy.updateMatrix();
    splatM.setMatrixAt(i, dummy.matrix); splatM.setColorAt(i, col.set(c));
    splatM.count = Math.min(SPL, splatN); splatM.instanceMatrix.needsUpdate = true; splatM.instanceColor.needsUpdate = true;
  };
  for (let i = 0; i < 12; i++) {     // the room's already a mess
    const r = Math.random(), c = FT[i % 5].splat;
    if (r < 0.4) addSplat(-W + 4 + Math.random() * 16, 0.8 + Math.random() * 4.5, D0, 0, 0, 1, c);
    else if (r < 0.7) { const sd = Math.random() < 0.5 ? -1 : 1; addSplat(sd * W, 0.8 + Math.random() * 4, -6 + Math.random() * 12, -sd, 0, 0, c); }
    else addSplat((Math.random() - 0.5) * 16, 0, -6 + Math.random() * 12, 0, 1, 0, c, 1.4);
  }
  const chipGeo = keep(new THREE.CircleGeometry(0.5, 3));
  const chips = K.makePool(low ? 90 : 160, { additive: false, geo: chipGeo });
  const steam = K.makePool(low ? 24 : 40, { map: K.softTex, additive: false, order: 5 });
  const sparks = K.makePool(low ? 60 : 110, { map: K.glowTex });
  root.add(chips.mesh, steam.mesh, sparks.mesh);
  const rings = [];
  for (let i = 0; i < 3; i++) { const mat = addMat(i === 1 ? 0xffd23c : 0xff6a10, 0); const m = new THREE.Mesh(keep(new THREE.RingGeometry(0.93, 1, 64)), mat); m.position.set(0, 3.4, -3); m.visible = false; root.add(m); rings.push({ m, mat, age: 99, max: 8 }); }
  let ringNext = 0;
  const shockRing = (delay, max) => { const r = rings[ringNext = (ringNext + 1) % 3]; r.age = -delay; r.max = max; };
  // Floating taco / chili sprites (the old floating emoji).
  const emojiTex = K.canvasTex(128, 64, (g) => {
    g.fillStyle = '#f2b02e'; g.beginPath(); g.arc(32, 40, 26, Math.PI, 0); g.fill(); g.fillStyle = '#5ccf3a'; g.fillRect(10, 36, 44, 6); g.fillStyle = '#e02818'; g.fillRect(18, 32, 8, 6); g.fillRect(36, 32, 8, 6);
    g.fillStyle = '#e8201a'; g.beginPath(); g.ellipse(96, 36, 12, 24, 0.5, 0, 7); g.fill(); g.fillStyle = '#30b020'; g.fillRect(100, 8, 6, 12);
  });
  const EM = 10;
  const emGeo = keep(new THREE.PlaneGeometry(0.9, 0.9));
  const emList = [];
  for (let k = 0; k < 2; k++) { const gg = emGeo.clone(); keep(gg); const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5 + k * 0.5); emList.push(gg); }
  const emMeshes = emList.map(gg => { const m = new THREE.InstancedMesh(gg, keep(new THREE.MeshBasicMaterial({ map: emojiTex, transparent: true, opacity: 0.55, depthWrite: false })), EM / 2); m.frustumCulled = false; root.add(m); return m; });
  const emoji = Array.from({ length: EM }, (_, i) => ({ x: (Math.random() - 0.5) * 22, y: Math.random() * 7, z: -6 + Math.random() * 8, vy: 0.3 + Math.random() * 0.4, ph: Math.random() * 6 }));
  // Camera-attached flash + heat vignette.
  const flashMat = keep(new THREE.MeshBasicMaterial({ color: 0xff5010, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  const flashQ = new THREE.Mesh(keep(new THREE.PlaneGeometry(4, 4)), flashMat); flashQ.position.z = -0.5; flashQ.renderOrder = 50; camera.add(flashQ);
  const vigTex = K.canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, w * 0.25, w / 2, w / 2, w * 0.72); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const vigMat = keep(new THREE.MeshBasicMaterial({ map: vigTex, color: 0xff4a00, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  const vigQ = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.6, 1)), vigMat); vigQ.position.z = -0.45; vigQ.renderOrder = 49; camera.add(vigQ);

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffe0c0, 0x2a1830, 0.75);
  const key = new THREE.DirectionalLight(0xfff0dd, 0.6); key.position.set(2, 8, 8);
  const kitchenL = new THREE.PointLight(0xff8a20, 22, 14, 1.5); kitchenL.position.set(KX + 0.5, 3.4, D0 + 1.4);
  const boothL = new THREE.PointLight(0xff3060, 14, 12, 1.6); boothL.position.set(9, 4.5, -3);
  const stringL = new THREE.PointLight(0xffb040, 12, 16, 1.4); stringL.position.set(0, 5.6, 1);
  root.add(hemi, key, kitchenL, boothL, stringL);

  // ── State ───────────────────────────────────────────────────────
  const st = {
    cheer: 0, sauce: 0, gold: 0, flare: 0, shout: 0, flip: -1, chase: 0, rainbow: 0, dark: 0, danger: 0, shake: 0, combo: 0, follow: 0,
    pinata: 1, pinT: 0, flag: [0, 0], ban: [0, 0], fan: [0, 0], fanSpin: 0, camKick: [0, 0], camDip: [0, 0], lastBeat: -1,
  };
  const colX = (c) => (c == null ? (Math.random() - 0.5) * 2 : (c - 4.5) / 4.5);

  function throwFrom(c, big = 1) {
    const f = food.find(o => o.life <= 0 && o.type === Math.floor(Math.random() * FT.length)) || food.find(o => o.life <= 0);
    if (!f) return;
    const s = c.side;
    f.p0.set(c.x - s * 0.1, 2.1, c.z);
    const r = Math.random();
    if (r < 0.4) { f.p1.set(-s * (6 + Math.random() * 5), 1 + Math.random() * 4.5, D0); f.nx = 0; f.ny = 0; f.nz = 1; }
    else if (r < 0.7) { f.p1.set(-s * W, 1 + Math.random() * 4, -6 + Math.random() * 10); f.nx = s; f.ny = 0; f.nz = 0; }
    else { f.p1.set(-s * (2 + Math.random() * 6), 0, -5 + Math.random() * 8); f.nx = 0; f.ny = 1; f.nz = 0; }
    f.T = (0.9 + Math.random() * 0.4) / Math.sqrt(big); f.age = 0; f.life = 1; f.arc = 2 + Math.random() * 2; f.spin = (Math.random() - 0.5) * 16;
    c.state = 2; c.rel = 0;
  }
  const windUp = (c, urgent) => { if (c.state === 0) { c.state = 1; c.wind = 0; c.windT = urgent ? 0.18 : 0.35; } };
  const salvo = (n, side) => {
    const pool = custs.filter(c => (!side || c.side === side));
    for (let i = 0; i < n && pool.length; i++) { const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; if (c.state === 0) { c.state = 1; c.wind = 0; c.windT = 0.1 + Math.random() * 0.25; } else throwFrom(c, 1.2); }
  };
  const burstChips = (x, z, n, power) => {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.28, sp = (1 + Math.random() * 3) * power, isChip = Math.random() > 0.35;
      chips.spawn(x + (Math.random() - 0.5), 0.15, z + (Math.random() - 0.5), Math.cos(a) * sp, (4 + Math.random() * 5) * power, Math.sin(a) * sp * 0.6,
        { life: 1.4 + Math.random() * 0.6, size: isChip ? 0.32 : 0.14, grav: 10, mode: 1, spin: 8 + Math.random() * 10, color: isChip ? 0xe8b820 : [0xcc2200, 0xe0a000, 0x50a010, 0xd49020][k % 4], floor: 0.06 });
    }
  };
  const burstPinata = () => {
    if (st.pinata < 1) return;
    st.pinata = 0; st.pinT = 0;
    const p = pinata.position;
    for (let k = 0; k < 70; k++) { const a = Math.random() * 6.28, sp = 1 + Math.random() * 4; chips.spawn(p.x, p.y, p.z, Math.cos(a) * sp, 1 + Math.random() * 4, Math.sin(a) * sp, { life: 2.5 + Math.random(), size: 0.16, grav: 8, mode: 1, spin: 10, color: [0xff3d9a, 0xffd23a, 0x29c7ff, 0x3ddc84, 0xff7a1a, 0xffffff][k % 6], floor: 0.06 }); }
    for (let k = 0; k < 20; k++) sparks.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 6, (Math.random() - 0.3) * 6, (Math.random() - 0.5) * 4, { life: 0.6, size: 0.3, size1: 0.05, color: 0xfff0a0 });
  };

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    st.cheer = Math.max(0, st.cheer - dt * 0.45); st.sauce = Math.max(0, st.sauce - dt * 1.3); st.gold = Math.max(0, st.gold - dt * 2.4);
    st.flare = Math.max(0, st.flare - dt * 1.5); st.shout = Math.max(0, st.shout - dt * 1.2); st.chase = Math.max(0, st.chase - dt);
    st.rainbow = Math.max(0, st.rainbow - dt); st.shake = Math.max(0, st.shake - dt * 2.5);
    if (st.dark < 0.9) st.dark = Math.max(0, st.dark - dt * 0.3);
    st.danger += ((info.danger > 0.62 ? 1 : 0) - st.danger) * Math.min(1, dt * 2);
    const cheer = Math.max(st.cheer, (info.cheer || 0) * 0.8), move = info.move || 0, red = st.danger, lit = 1 - 0.75 * st.dark;
    const flagK = K.spring(st.flag, dt, 1.1, 0.15), fanK = K.spring(st.fan, dt, 0.6, 0.5);

    // Kitchen: fire flicker (blazes in danger), flames, steam.
    const fl = 0.7 + Math.sin(t * 41) * 0.15 + Math.sin(t * 28) * 0.1;
    fireGlowMat.opacity = Math.min(1, (0.35 + 0.25 * fl + st.flare * 0.5 + red * 0.5) * lit);
    fireGlowMat.color.set(red > 0.5 ? 0xff3010 : 0xff8a20);
    flames.forEach((f, i) => { const h = 0.4 + 0.35 * Math.sin(t * 17 + i * 2) ** 2 + st.flare * 1.6 + red * 1.2; f.scale.set(1 + st.flare * 0.5, h, 1); f.position.y = 2.3 + 0.45 * h; f.quaternion.copy(camera.quaternion); });
    flameMat.opacity = (0.6 + st.flare * 0.4) * lit;
    if (Math.random() < dt * (5 + st.flare * 20 + red * 15)) steam.spawn(KX + (Math.random() - 0.5) * 3, 2.6, D0 - 0.4, (Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.6, 0.6 + Math.random() * 0.4,
      { life: 2.2, size: 0.8, size1: 2.6, drag: 0.3, color: red > 0.5 ? 0x3a3030 : 0xd8c8b0, alpha: red > 0.5 ? 0.5 : 0.22 });

    // Cook: stirs on the beat, shouts on clears, flips tortillas on hold.
    const shout = Math.min(1, st.shout * 1.5 + cheer * 0.4);
    mouth.scale.set(1 + shout * 0.6, 0.4 + shout * 2.2, 1);
    cook.position.y = 2.1 + Math.abs(Math.sin(beat * Math.PI)) * 0.05 + shout * 0.08;
    cook.rotation.z = Math.sin(t * 2.2) * 0.05 + shout * 0.1 * Math.sin(t * 20);
    cookArms[0].rotation.set(-0.6 - shout * 2.2, 0, -0.2 - shout * 0.6);
    let flipK = 0;
    if (st.flip >= 0) {
      st.flip += dt; const u = st.flip / 0.9;
      flipK = Math.sin(Math.min(1, u * 3) * Math.PI);
      tortilla.visible = true;
      tortilla.position.set(KX + 0.9, 2.35 + Math.sin(Math.min(1, u) * Math.PI) * 1.8, D0 - 0.95);
      tortilla.rotation.x = u * Math.PI * 4;
      if (u >= 1) { st.flip = -1; tortilla.visible = false; }
    }
    cookArms[1].rotation.set(-0.9 + Math.sin(beat * Math.PI * 2) * 0.35 - flipK * 1.2 - shout * 1.4, 0, 0.3);

    // Menu board + neon.
    menuMat.color.setScalar((0.8 + 0.2 * onBeat) * lit);
    const np = 0.75 + Math.sin(t / 0.35) * 0.12 + cheer * 0.25;
    if (st.rainbow > 0) tacosMat.color.setHSL((t * 0.8) % 1, 1, 0.65); else tacosMat.color.setScalar(np * lit);
    const hotStrobe = red > 0.5 ? (Math.sin(t * 14) > 0 ? 1.4 : 0.15) : 0.75 + Math.sin(t / 0.28 + 1.3) * 0.25 + cheer * 0.2 + st.sauce * 0.6;
    hotMat.color.setScalar(hotStrobe * lit);
    banner.rotation.z = Math.sin(t * 1.1) * 0.03 + K.spring(st.ban, dt, 1.2, 0.2) * 0.2;
    if (st.rainbow > 0) bannerMat.color.setHSL((t * 0.7 + 0.5) % 1, 1, 0.7); else bannerMat.color.setScalar((0.75 + 0.25 * onBeat + cheer * 0.3) * lit);
    openMat.color.setScalar(st.dark > 0.5 ? 0.9 : (0.6 + 0.4 * Math.sin(t / 0.7)) * lit + 0.2);

    // Papel picado sway (+ flutter kick), bulbs twinkle / chase.
    flagList.forEach((f, i) => {
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(Math.sin(t * 2.2 + f.ph + beat * 0.5) * 0.3 + flagK * Math.sin(f.ph * 1.3 + 1), 0, 0);
      dummy.scale.setScalar(1); dummy.updateMatrix(); flags.setMatrixAt(i, dummy.matrix);
    });
    flags.instanceMatrix.needsUpdate = true;
    const chaseOn = st.chase > 0 || st.rainbow > 0, ch = Math.floor(t * 14);
    bulbList.forEach((b, i) => {
      let k = 0.8 + Math.sin(t * 35 * 0.06 + i * 1.9) * 0.15 + ((i + whole) % 4 === 0 ? onBeat * 0.6 : 0);
      if (chaseOn) k = (i + ch) % 5 === 0 ? 1.8 : 0.35;
      k *= lit;
      if (st.rainbow > 0) col.setHSL(((i * 0.07 + t * 0.6) % 1), 1, 0.6); else col.set(red > 0.5 && i % 2 ? 0xff1a00 : b.c);
      bulbs.setColorAt(i, col.multiplyScalar(k));
      dummy.position.set(b.x, b.y, b.z); dummy.quaternion.copy(camera.quaternion); dummy.scale.setScalar(0.7 + 0.35 * k); dummy.updateMatrix();
      bulbHalo.setMatrixAt(i, dummy.matrix); bulbHalo.setColorAt(i, col.multiplyScalar(0.45));
    });
    bulbs.instanceColor.needsUpdate = true; bulbHalo.instanceMatrix.needsUpdate = true; bulbHalo.instanceColor.needsUpdate = true;

    // Fan + piñata.
    st.fanSpin += dt * (2.5 + fanK * 10 + cheer * 4) * (1 - 0.7 * st.dark);
    fan.rotation.y = st.fanSpin;
    if (st.pinata < 1) { st.pinT += dt; if (st.pinT > 3.5) st.pinata = Math.min(1, (st.pinT - 3.5) / 1.2); }
    pinata.visible = st.pinata > 0;
    const pinY = H - 1.6 + (1 - st.pinata) * 1.4;
    pinata.position.set(5.2 + Math.sin(t * 1.3) * 0.15, pinY + Math.sin(beat * Math.PI * 2) * 0.03, 1.5);
    pinata.rotation.set(0, t * 0.5, Math.sin(t * 1.3) * 0.15 + flagK * 0.1);
    pinCord.scale.y = Math.max(0.05, H - pinY - 0.45 - 0.4); pinCord.position.y = H - 0.45 - pinCord.scale.y / 2 - 0.05;

    // Customers: bob on the beat, wind up / throw / settle; jump on cheer.
    custs.forEach((c, i) => {
      c.t -= dt;
      if (c.state === 0 && c.t <= 0) { windUp(c, false); c.t = 2.5 + Math.random() * 5 - cheer * 2; }
      if (c.state === 1) { c.wind += dt / c.windT; if (c.wind >= 1) throwFrom(c); }
      else if (c.state === 2) { c.rel += dt / 0.2; if (c.rel >= 1) { c.state = 3; c.rel = 1; } }
      else if (c.state === 3) { c.rel -= dt * 2.5; if (c.rel <= 0) c.state = 0; }
      const bob = Math.abs(Math.sin(beat * Math.PI + c.ph)) * (0.04 + 0.08 * cheer) * lit;
      const jump = cheer > 0.5 ? Math.max(0, Math.sin(beat * Math.PI * 2 + c.ph)) * 0.25 * cheer : 0;
      const y = bob + jump - st.dark * 0.15, face = -c.side * 0.9 - 0.2 * c.side;
      dummy.position.set(c.x, 0.6 + y, c.z); dummy.rotation.set(0, face, 0.06 * Math.sin(beat * Math.PI + c.ph) - st.dark * 0.2 * c.side); dummy.scale.setScalar(c.s); dummy.updateMatrix(); bodyM.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x, 1.33 + y - st.dark * 0.12, c.z); dummy.updateMatrix(); headM.setMatrixAt(i, dummy.matrix);
      // Throwing arm (toward the room), the other one dances.
      let a = Math.sin(beat * Math.PI + c.ph) * 0.2;
      if (c.state === 1) a = 0.8 + c.wind * 1.8; else if (c.state === 2) a = 2.6 - c.rel * 3.6; else if (c.state === 3) a = -1.0 * c.rel;
      const cy = Math.cos(face), sy = Math.sin(face);
      for (const s of [-1, 1]) {
        const lx = s * 0.36;
        dummy.position.set(c.x + lx * cy, 1.05 + y, c.z - lx * sy);
        if (s === 1) dummy.rotation.set(-a, face, 0.15);
        else dummy.rotation.set(0, face, -0.25 - (cheer > 0.4 ? 2.2 * Math.min(1, cheer) : 0) + 0.15 * Math.sin(beat * Math.PI * 2 + c.ph));
        dummy.updateMatrix(); armM.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
      }
    });
    bodyM.instanceMatrix.needsUpdate = headM.instanceMatrix.needsUpdate = armM.instanceMatrix.needsUpdate = true;

    // Flying food → splat where it lands.
    const cnt = [0, 0, 0, 0, 0];
    for (const f of food) {
      if (f.life <= 0) continue;
      f.age += dt;
      const u = f.age / f.T;
      if (u >= 1) { f.life = 0; addSplat(f.p1.x, f.p1.y, f.p1.z, f.nx, f.ny, f.nz, FT[f.type].splat, f.type === 3 ? 1.3 : 1); if (f.ny > 0.5) burstChips(f.p1.x, f.p1.z, 3, 0.4); continue; }
      v3.lerpVectors(f.p0, f.p1, u); v3.y += Math.sin(u * Math.PI) * f.arc;
      const m = foodMeshes[f.type], n = cnt[f.type]++;
      dummy.position.copy(v3); dummy.rotation.set(f.age * f.spin, f.age * f.spin * 0.6, f.age * f.spin * 0.3); dummy.scale.setScalar(1.15); dummy.updateMatrix();
      m.setMatrixAt(n, dummy.matrix);
    }
    foodMeshes.forEach((m, i) => { m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; });

    // Rings.
    for (const r of rings) {
      if (r.age >= 99) continue;
      r.age += dt; if (r.age < 0) continue;
      const u = r.age / 0.9;
      if (u >= 1) { r.age = 99; r.m.visible = false; continue; }
      r.m.visible = true; r.m.scale.setScalar(1.5 + u * r.max); r.mat.opacity = (1 - u) * 0.9;
    }
    // Floating emoji.
    emoji.forEach((e, i) => {
      e.y += e.vy * dt * (1 + cheer); e.x += Math.sin(t * 0.8 + e.ph) * 0.2 * dt;
      if (e.y > H + 0.5) { e.y = -0.5; e.x = (Math.random() - 0.5) * 22; }
      dummy.position.set(e.x, e.y, e.z); dummy.quaternion.copy(camera.quaternion); dummy.rotateZ(Math.sin(t + e.ph) * 0.3); dummy.scale.setScalar(1); dummy.updateMatrix();
      emMeshes[i & 1].setMatrixAt(i >> 1, dummy.matrix);
    });
    emMeshes.forEach(m => { m.instanceMatrix.needsUpdate = true; m.material.opacity = 0.45 * lit; });

    chips.update(dt, camera); steam.update(dt, camera); sparks.update(dt, camera);

    // Flash + heat vignette.
    const strobe = st.combo >= 3 && st.sauce > 0.2 ? (Math.floor(t * 12) & 1) : 1;
    flashMat.color.set(st.gold > st.sauce ? 0xffc040 : 0xff3a08);
    flashMat.opacity = Math.min(0.5, st.sauce * 0.22 * strobe + st.gold * 0.16);
    vigMat.opacity = Math.min(0.85, Math.max(0, cheer - 0.5) * 1.2 + red * (0.35 + 0.2 * Math.sin(t * 6)));
    vigMat.color.set(red > 0.5 && cheer < 0.6 ? 0xff1000 : 0xff4a00);

    // Lights.
    hemi.intensity = (0.55 + 0.25 * onBeat * 0.4 + st.gold * 0.6 + st.sauce * 0.3) * lit;
    hemi.color.set(st.sauce > 0.3 ? 0xff7050 : 0xffc890);
    key.intensity = 0.55 * lit;
    kitchenL.intensity = (18 + 8 * fl + st.flare * 30 + red * 25) * lit; kitchenL.color.set(red > 0.5 ? 0xff3010 : 0xff8a20);
    boothL.intensity = (10 + 6 * onBeat + st.sauce * 20) * lit;
    stringL.intensity = (10 + 4 * onBeat + (chaseOn ? 6 : 0)) * lit;
    if (st.rainbow > 0) stringL.color.setHSL((t * 0.6) % 1, 1, 0.6); else stringL.color.set(0xffb040);

    // ── Camera ──
    const F = K.framing(camera);
    st.follow += ((info.pieceX || 0) * 0.7 - st.follow) * Math.min(1, dt * 2);
    const kx = K.spring(st.camKick, dt, 2.2, 0.4), dip = K.spring(st.camDip, dt, 2.6, 0.45);
    const sh = st.shake, sx = (Math.random() - 0.5) * sh * 0.3, sy = (Math.random() - 0.5) * sh * 0.2;
    if (F.portrait) {
      camera.position.set(Math.sin(t * 0.13) * 0.4 + st.follow * 0.4 + kx * 0.5 + sx, 2.9 + dip + sy, 11.2);
      camera.lookAt(st.follow * 0.3, 4.3 + dip * 0.5, -8);
      camera.fov = 80;
    } else {
      camera.position.set(Math.sin(t * 0.13) * 0.5 + st.follow + kx + sx, 3.3 + Math.sin(t * 0.21) * 0.15 + dip + sy, 11 + Math.sin(t * 0.09) * 0.3);
      camera.lookAt(st.follow * 0.6 + kx * 0.4, 3.2 + dip * 0.5, -8);
      camera.fov = 54;
    }
    camera.rotateZ(Math.sin(t * 0.17) * 0.01 + kx * 0.02);
    camera.updateProjectionMatrix();
  }

  function react(kind, d = {}) {
    const x = colX(d.col);
    switch (kind) {
      case 'move': {
        const side = (d.dir || 1) > 0 ? 1 : -1, pool = custs.filter(c => c.side === side && c.state === 0);
        if (pool.length && Math.random() < 0.65) windUp(pool[Math.floor(Math.random() * pool.length)], true);
        st.camKick[1] += (d.dir || 1) * 0.4;
        break;
      }
      case 'rotate':
        st.flag[1] += (d.dir || 1) * 2; st.fan[1] += 1.5; st.ban[1] += (d.dir || 1) * 2;
        break;
      case 'soft':
        st.flare = Math.min(1, st.flare + 0.35); st.camDip[1] -= 0.2;
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.25 + r / 14);
        burstChips(x * 5, 0.5, Math.round(12 + r * 2.5), 0.7 + 0.5 * k);
        st.gold = Math.max(st.gold, 0.5 + 0.5 * k); st.shake = Math.max(st.shake, 0.3 + 0.6 * k); st.camDip[1] -= 0.5 * k;
        if (r >= 4) salvo(Math.min(5, 1 + Math.floor(r / 3)));
        break;
      }
      case 'hold':
        st.flip = 0; st.shout = Math.max(st.shout, 0.3);
        break;
      case 'clear': {
        const n = Math.max(1, Math.min(4, d.lines || 1)), c = Math.max(0, d.combo || 0);
        st.combo = c;
        st.cheer = Math.min(1.2, Math.max(st.cheer, [0, 0.35, 0.55, 0.78, 1][n] + Math.min(0.4, c * 0.12)));
        st.sauce = Math.min(1.4, st.sauce + 0.4 + n * 0.2 + c * 0.1); st.shout = 1;
        const nr = n >= 4 ? 3 : Math.min(3, 1 + (n >= 3 ? 1 : 0) + (c >= 2 ? 1 : 0));
        for (let i = 0; i < nr; i++) shockRing(i * 0.15, 6 + n * 1.6 + c * 0.4);
        salvo(Math.min(NC, n * 3 + c * 2));
        if (n >= 4) { burstPinata(); st.shake = 1; st.chase = 2; }
        if (c >= 2) st.chase = Math.max(st.chase, 0.8 + c * 0.3);
        break;
      }
      case 'combo':
        if ((d.n || 0) >= 2) st.chase = Math.max(st.chase, 1 + d.n * 0.3);
        break;
      case 'levelUp':
        st.rainbow = 4; st.cheer = 1.2; burstPinata(); salvo(NC); st.shout = 1;
        break;
      case 'gameOver':
        st.dark = 1; setOpen(true); st.cheer = 0; st.chase = 0; st.rainbow = 0;
        break;
      case 'start':
        st.dark = 0; setOpen(false); st.gold = 1; salvo(6);
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root); camera.remove(flashQ); camera.remove(vigQ);
      scene.fog = prevFog; scene.background = prevBg;
      K.dispose();
    },
  };
}
