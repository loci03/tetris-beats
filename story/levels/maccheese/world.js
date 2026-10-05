// MAC & CHEESE — Chef Gouda's cartoon cheese-factory kitchen.
//
// A light-up checker floor on a giant cheese wheel, a huge copper pot of
// molten cheese bubbling on a blue-flame stove behind the dancers (a giant
// spoon stirring it, steam puffing on the beat), cheese waterfalls pouring
// from factory pipes into vats on both sides, a kitchen rack of swinging
// pans, a dripping-cheese curtain, a crowd of mice in little chef hats and
// macaroni confetti for the big moments. Everything moves on the music
// clock via update().

import * as THREE from '../../../vendor/three/three.module.min.js';

const PALETTE = [0xffc532, 0xff8a1f, 0xfff1b8, 0xff5a3c, 0xffe066, 0xf2a93b];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWorld({ lowGraphics = false } = {}) {
  const group = new THREE.Group();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const geo = (g) => keep(g);
  const col = new THREE.Color(), dummy = new THREE.Object3D(), m4 = new THREE.Matrix4();
  const add = (mesh, x = 0, y = 0, z = 0, parent = group) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  const crowdScale = lowGraphics ? 0.6 : 1;

  // ── Back wall: cream subway tiles, a cheese-yellow band, the sign ──
  const wallTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9a25a'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) {
      const x = c * 64 + (r % 2) * 32, y = r * 32;
      const gg = g.createLinearGradient(0, y, 0, y + 30);
      gg.addColorStop(0, '#fff3cf'); gg.addColorStop(1, '#ead7a4');
      g.fillStyle = gg; g.fillRect(x + 2, y + 2, 60, 28);
    }
  }));
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(28, 4);
  // A round kitchen: the tiled wall goes all the way round (no void behind
  // the orbit / solo cameras), the back of it flattened behind the stage.
  const room = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(17, 17, 16, 40, 1, true)), toon(0xffffff, { map: wallTex, side: THREE.BackSide })), 0, 7.4, 6.5);
  room.scale.set(1.25, 1, 1);
  const band = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(16.9, 16.9, 1.2, 40, 1, true)), toon(0xffb21f, { side: THREE.BackSide })), 0, 2.6, 6.5);
  band.scale.set(1.25, 1, 1);
  // Cheese ooze along the top of the wall (the 2D level's dripping ribbons).
  const ooze = [];
  const oozeMat = toon(0xffc21a, { emissive: 0x4a2a00 });
  const dripGeo = geo(new THREE.CapsuleGeometry(0.28, 1, 2, 7));
  const wallZ = (x) => 6.5 - 17 * Math.sqrt(Math.max(0, 1 - (x / 21.25) ** 2));
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(16.7, 16.7, 1.0, 40, 1, true)), toon(0xffc21a, { emissive: 0x4a2a00, side: THREE.BackSide })), 0, 12.6, 6.5).scale.set(1.25, 1, 1);
  for (let i = 0; i < 26; i++) {
    const dx = -17 + i * 1.36 + Math.sin(i * 7) * 0.3;
    const d = add(new THREE.Mesh(dripGeo, oozeMat), dx, 12, wallZ(dx) + 0.45);
    const len = 0.8 + ((i * 37) % 7) * 0.35;
    ooze.push({ d, len, ph: i * 1.3 });
  }
  const signTex = keep(canvasTex(512, 160, (g, w, h) => {
    g.font = '900 104px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(1, (w - 40) / g.measureText('MAC&CHEESE').width);
    g.translate(w / 2, 0); g.scale(fit, 1); g.translate(-w / 2, 0);
    g.lineJoin = 'round';
    g.lineWidth = 22; g.strokeStyle = '#6a2e00'; g.strokeText('MAC&CHEESE', w / 2, h / 2 + 6);
    const gr = g.createLinearGradient(0, 20, 0, h - 20);
    gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.5, '#ffc21a'); gr.addColorStop(1, '#ff8a00');
    g.fillStyle = gr; g.fillText('MAC&CHEESE', w / 2, h / 2 + 6);
    g.fillStyle = '#ffc21a';
    for (const x of [70, 150, 260, 345, 430]) { g.beginPath(); g.ellipse(x, h / 2 + 46, 9, 22, 0, 0, Math.PI * 2); g.fill(); }
  }));
  const sign = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(11, 3.44)), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false })), 0, 7.6, -9.2);

  // ── Floor: red & cream kitchen checker around a giant cheese wheel ──
  const floorTex = keep(canvasTex(128, 128, (g, w, h) => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#8a2a1c' : '#f2dfae'; g.fillRect(x * 64, y * 64, 64, 64); }
  }));
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(24, 24);
  const floor = add(new THREE.Mesh(geo(new THREE.CircleGeometry(36, 40)), toon(0xffffff, { map: floorTex })), 0, -0.5, 0);
  floor.rotation.x = -Math.PI / 2;
  const wheelTex = keep(canvasTex(512, 64, (g, w, h) => {
    g.fillStyle = '#ffc532'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e09a12';
    for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse(14 + i * 28.5, 18 + (i % 3) * 13, 6 + (i % 4) * 2, 5 + (i % 3) * 2, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#c47a0a'; g.fillRect(0, h - 6, w, 6);
  }));
  wheelTex.wrapS = THREE.RepeatWrapping; wheelTex.repeat.set(3, 1);
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(4.7, 4.85, 0.5, 48, 1, true)), toon(0xffffff, { map: wheelTex })), 0, -0.25, 0);
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(4.68, 4.68, 0.04, 48)), toon(0x3a1c08)), 0, -0.03, 0);
  const tileSize = 0.64, tiles = [];
  for (let ix = -7; ix <= 7; ix++) for (let iz = -6; iz <= 6; iz++) {
    const x = ix * tileSize, z = iz * tileSize;
    if (Math.hypot(x, z) <= 4.3) tiles.push({ x, z, ix, iz });
  }
  const tileMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(tileSize * 0.94, 0.06, tileSize * 0.94)), basic(0xffffff), tiles.length);
  tiles.forEach((t, i) => { m4.makeTranslation(t.x, 0, t.z); tileMesh.setMatrixAt(i, m4); tileMesh.setColorAt(i, col.set(0x3a2208)); });
  group.add(tileMesh);
  const rim = add(new THREE.Mesh(geo(new THREE.TorusGeometry(4.62, 0.08, 6, 96)), basic(0xffe066)), 0, 0.02, 0);
  rim.rotation.x = Math.PI / 2;

  // ── The giant pot on the stove ──────────────────────────────────
  const pot = new THREE.Group();
  pot.position.set(0, -0.5, -6.6);
  pot.scale.setScalar(0.88);
  group.add(pot);
  const steel = toon(0x464654), copper = toon(0xb8602e, { emissive: 0x1a0600 });
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(7, 1.1, 3.6)), steel), 0, 0.55, 0, pot);
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(7.1, 0.12, 3.7)), toon(0x22222c)), 0, 1.12, 0, pot);
  for (let i = 0; i < 5; i++) {
    const k = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12)), toon(0x16161c)), -2.4 + i * 1.2, 0.6, 1.83, pot);
    k.rotation.x = Math.PI / 2;
  }
  const flames = [];
  const flameGeo = geo(new THREE.ConeGeometry(0.16, 0.5, 8, 1, true));
  const flameMat = basic(0x3aa0ff, { transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    flames.push(add(new THREE.Mesh(flameGeo, flameMat), Math.cos(a) * 1.7, 1.38, Math.sin(a) * 1.0 + 0.2, pot));
  }
  const potBody = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(2.55, 2.2, 2.5, 32, 1, true)), toon(0xaeb4c4, { emissive: 0x0a0a12, side: THREE.DoubleSide })), 0, 2.45, 0, pot);
  const potRim = add(new THREE.Mesh(geo(new THREE.TorusGeometry(2.55, 0.13, 8, 40)), toon(0xd8dce6)), 0, 3.7, 0, pot);
  potRim.rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) {
    const h = add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.42, 0.1, 6, 16, Math.PI)), steel), sx * 2.6, 3.0, 0, pot);
    h.rotation.set(0, sx > 0 ? 0 : Math.PI, -sx * Math.PI / 2);
  }
  add(new THREE.Mesh(geo(new THREE.TorusGeometry(2.43, 0.07, 6, 40)), toon(0x7a8090)), 0, 2.2, 0.02, pot).rotation.x = Math.PI / 2;
  const cheeseTopMat = toon(0xffc21a, { emissive: 0x5a3000 });
  const cheeseTop = add(new THREE.Mesh(geo(new THREE.CircleGeometry(2.5, 32)), cheeseTopMat), 0, 3.6, 0, pot);
  cheeseTop.rotation.x = -Math.PI / 2;
  // Cheese oozing over the rim.
  const rimDrips = [];
  for (let i = 0; i < 9; i++) {
    const a = 0.35 + (i / 8) * (Math.PI - 0.7);
    const d = add(new THREE.Mesh(dripGeo, oozeMat), Math.cos(a) * 2.5, 3.35, Math.sin(a) * 2.5 + 0.05, pot);
    d.scale.set(0.55, 0.5, 0.45);
    rimDrips.push({ d, ph: i * 1.9, len: 0.4 + (i % 3) * 0.2 });
  }
  // Bubbles that swell and pop on the beat.
  const BUB = 12;
  const bubbles = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.3, 10, 8)), toon(0xffd84a, { emissive: 0x4a2a00 }), BUB);
  const bubState = Array.from({ length: BUB }, (_, i) => ({ x: Math.cos(i * 2.4) * (0.4 + (i % 4) * 0.5), z: Math.sin(i * 2.4) * (0.3 + (i % 4) * 0.45), ph: i * 0.37 }));
  pot.add(bubbles);
  // The giant spoon, stirring.
  const spoonPivot = add(new THREE.Group(), 0, 3.6, 0, pot);
  const spoon = add(new THREE.Group(), 1.0, 0, 0, spoonPivot);
  spoon.rotation.z = 0.42;
  const woodMat = toon(0xc98a4a);
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.13, 0.16, 5.2, 12)), woodMat), 0, 2.2, 0, spoon);
  add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.55, 14, 10)), woodMat), 0, -0.4, 0, spoon).scale.set(1, 1.4, 0.4);
  // Steam puffs.
  const steamTex = keep(canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,250,235,0.45)'); gr.addColorStop(1, 'rgba(255,250,235,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }));
  const steam = [];
  for (let i = 0; i < (lowGraphics ? 5 : 8); i++) {
    const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })));
    pot.add(sp);
    steam.push({ sp, ph: i / (lowGraphics ? 5 : 8), x: Math.sin(i * 2.1) * 1.2 });
  }
  // Geyser of cheese for the big moments.
  const geyser = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.5, 0.9, 1, 16, 1, true)), toon(0xffc21a, { emissive: 0x6a3a00, side: THREE.DoubleSide })), 0, 3.6, 0, pot);
  geyser.visible = false;
  const geyserCap = add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.75, 14, 10)), cheeseTopMat), 0, 3.6, 0, pot);
  geyserCap.visible = false;

  // ── Cheese waterfalls from factory pipes into vats ───────────────
  const fallTex = keep(canvasTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#e88a00'); gr.addColorStop(0.3, '#ffcc33'); gr.addColorStop(0.55, '#fff1a0'); gr.addColorStop(0.75, '#ffc21a'); gr.addColorStop(1, '#d97800');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,220,0.55)';
    for (let i = 0; i < 14; i++) g.fillRect((i * 23) % w, (i * 71) % h, 3, 30 + (i % 4) * 14);
    g.fillStyle = 'rgba(200,100,0,0.35)';
    for (let i = 0; i < 10; i++) g.fillRect((i * 37 + 9) % w, (i * 53) % h, 4, 40);
  }));
  fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping; fallTex.repeat.set(2, 2);
  const fallMat = basic(0xffffff, { map: fallTex });
  const vatTops = [], splashes = [];
  for (const sx of [-1, 1]) {
    const x = sx * 7.6, z = -5.2;
    const pipe = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.5, 0.5, 4.4, 16)), steel), x, 7.2, z - 2.4);
    pipe.rotation.x = Math.PI / 2;
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 16)), toon(0x2a2a34)), x, 7.2, z - 0.1).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.66, 0.66, 0.2, 16)), toon(0xd2723a)), x, 7.2, z - 3.6).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.42, 0.55, 6.6, 14, 1, true)), fallMat), x, 3.75, z + 0.25);
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.5, 1.3, 1.6, 24)), steel), x, 0.3, z + 0.25);
    add(new THREE.Mesh(geo(new THREE.TorusGeometry(1.5, 0.09, 6, 30)), toon(0x2a2a34)), x, 1.1, z + 0.25).rotation.x = Math.PI / 2;
    const vt = add(new THREE.Mesh(geo(new THREE.CircleGeometry(1.42, 24)), cheeseTopMat), x, 1.06, z + 0.25);
    vt.rotation.x = -Math.PI / 2;
    vatTops.push(vt);
    const sp = add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.6, 0.12, 6, 20)), oozeMat), x, 1.12, z + 0.25);
    sp.rotation.x = Math.PI / 2;
    splashes.push(sp);
    // Big cheese wedge with holes beside each vat.
    const wedge = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.5, 1.5, 1.1, 20, 1, false, 0, 1.1)), toon(0xffc532)), sx * 5.4, 0.05, -2.6);
    wedge.rotation.y = sx > 0 ? 2.2 : -0.2 - 1.1 + Math.PI;
    for (let k = 0; k < 4; k++) {
      const hole = add(new THREE.Mesh(geo(new THREE.CircleGeometry(0.13 + (k % 2) * 0.06, 12)), toon(0xd98c12)), 0, 0, 0, wedge);
      const a = 0.25 + k * 0.22, r = 0.55 + (k % 2) * 0.5;
      hole.position.set(Math.sin(a) * r, 0.56, Math.cos(a) * r); hole.rotation.x = -Math.PI / 2;
    }
  }

  // ── Kitchen rack truss with swinging pans + spotlight cones ──────
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(13, 0.2, 0.2)), toon(0x30303c)), 0, 7.2, 1.2);
  const pans = [];
  const panGeo = geo(new THREE.CylinderGeometry(0.42, 0.36, 0.12, 18)), handleGeo = geo(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 6));
  for (let i = 0; i < 8; i++) {
    const x = -5.6 + i * 1.6;
    if (Math.abs(x) < 0.9) continue;
    const hang = add(new THREE.Group(), x, 7.1, 1.2);
    const pan = add(new THREE.Mesh(panGeo, i % 2 ? copper : steel), 0, -0.85, 0, hang);
    pan.rotation.x = Math.PI / 2;
    add(new THREE.Mesh(handleGeo, toon(0x1a1a20)), 0, -0.3, 0, hang);
    pans.push({ hang, ph: i * 0.9 });
  }
  const cones = [], coneMats = [];
  const coneGeo = geo(new THREE.ConeGeometry(0.95, 7.3, 24, 1, true));
  coneGeo.translate(0, -3.65, 0);
  for (const [x, targetX] of [[-3.6, -1.6], [-1.2, -1.6], [1.2, 1.6], [3.6, 1.6]]) {
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.2, 0.28, 0.4, 12)), toon(0x151520)), x, 7.0, 1.2);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = add(new THREE.Mesh(coneGeo, mat), x, 7.0, 1.2);
    coneMats.push(mat);
    cones.push({ cone, baseX: x, targetX, side: targetX < 0 ? 'player' : 'rival' });
  }

  // ── Crowd: mice in little chef hats ─────────────────────────────
  const spots = [];
  const addRow = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.2 + ((i * 7) % 5) * 0.08) / n, z: z + ((i * 3) % 4) * 0.12, y }); };
  addRow(Math.round(13 * crowdScale), -6.6, 6.6, 5.6, -0.5);
  addRow(Math.round(15 * crowdScale), -7.4, 7.4, 6.6, -0.5);
  addRow(Math.round(6 * crowdScale), -9.0, -5.6, 1.6, -0.5);
  addRow(Math.round(6 * crowdScale), 5.6, 9.0, 1.6, -0.5);
  addRow(Math.round(5 * crowdScale), -10, -6.8, -1.2, -0.5);
  addRow(Math.round(5 * crowdScale), 6.8, 10, -1.2, -0.5);
  const N = spots.length;
  const furMat = toon(0xffffff);
  const mBody = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.3, 0.42, 2, 7)), furMat, N);
  const mHead = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.27, 9, 6)), furMat, N);
  const mEar = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.15, 6, 4)), toon(0xffffff), N * 2);
  const mHat = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.12, 0.1, 0.22, 8)), toon(0xfdfaf2), N);
  const mArm = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.06, 0.36, 1, 4)), furMat, N * 2);
  const furs = [0x9a9aa8, 0xc8c0b4, 0x7a7068, 0xe8e2da, 0xb0a090];
  spots.forEach((c, i) => {
    c.phase = (i * 2.399) % (Math.PI * 2); c.hype = 0.6 + ((i * 13) % 7) / 10;
    const f = furs[i % furs.length];
    mBody.setColorAt(i, col.set(f)); mHead.setColorAt(i, col.set(f));
    mEar.setColorAt(i * 2, col.set(0xffa0b4)); mEar.setColorAt(i * 2 + 1, col.set(0xffa0b4));
    mArm.setColorAt(i * 2, col.set(f)); mArm.setColorAt(i * 2 + 1, col.set(f));
  });
  group.add(mBody, mHead, mEar, mHat, mArm);

  // ── Macaroni confetti ───────────────────────────────────────────
  const MAC = lowGraphics ? 60 : 120;
  const macMesh = new THREE.InstancedMesh(geo(new THREE.TorusGeometry(0.09, 0.04, 4, 5, Math.PI * 0.75)), toon(0xffd34d, { emissive: 0x3a2000 }), MAC);
  macMesh.frustumCulled = false;
  const macs = Array.from({ length: MAC }, () => ({ life: 0, p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }));
  let macCursor = 0;
  dummy.position.set(0, -50, 0); dummy.updateMatrix();
  for (let i = 0; i < MAC; i++) macMesh.setMatrixAt(i, dummy.matrix);
  group.add(macMesh);
  function burstMac(n, x, spread, fromPot = false) {
    for (let k = 0; k < n; k++) {
      const m = macs[macCursor = (macCursor + 1) % MAC];
      if (fromPot) { m.p.set((Math.random() - 0.5) * 1.5, 3.2, -6.6); m.v.set((Math.random() - 0.5) * 5, 7 + Math.random() * 4, 2 + Math.random() * 3.5); }
      else { m.p.set(x + (Math.random() - 0.5) * spread, 6.8 + Math.random() * 1.5, (Math.random() - 0.5) * 4 + 0.6); m.v.set((Math.random() - 0.5) * 1.2, -1 - Math.random() * 1.3, (Math.random() - 0.5)); }
      m.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      m.w.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      m.life = 5;
    }
  }

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffe7b8, 0x5a2a12, 1.15);
  const key = new THREE.DirectionalLight(0xfff2dc, 1.55);
  key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(0xff6a3c, 16, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0xffd23a, 16, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const potGlow = new THREE.PointLight(0xffa020, 16, 14, 1.5); potGlow.position.set(0, 4.4, -4.8);
  group.add(hemi, key, rimL, rimR, potGlow);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, pot: potGlow.intensity };

  // ── State + update ──────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, ripple: null, focus: 0, lastBeat: -1, barColor: 0, solo: null, geyser: 0, stir: 0 };
  const cA = new THREE.Color(), cB = new THREE.Color(), dim = new THREE.Color(0x2a1606);

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.5);
    state.geyser = Math.max(0, state.geyser - dt * 0.55);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    if (whole !== state.lastBeat) {
      state.lastBeat = whole;
      if (whole % 4 === 0) state.barColor = (state.barColor + 1) % PALETTE.length;
    }

    // Tiles: checker pulse on the beat, ripple from big moves, solo spotlight.
    cA.set(PALETTE[state.barColor]); cB.set(PALETTE[(state.barColor + 3) % PALETTE.length]);
    tiles.forEach((t, i) => {
      const checker = ((t.ix + t.iz + whole) & 1) === 0;
      let k = (checker ? 0.4 + 0.55 * onBeat : 0.22) * L;
      if (state.ripple) {
        const r = (songTime - state.ripple.t) * 7, d = Math.hypot(t.x - state.ripple.x, t.z);
        k = Math.max(k, Math.exp(-Math.pow((d - r) * 1.8, 2)) * (1 - Math.min(1, r / 10)) * L);
      }
      if (soloK > 0) {
        const near = Math.exp(-Math.pow(Math.hypot(t.x - soloX, t.z) / 1.3, 2));
        k = k * (1 - 0.75 * soloK) + soloK * near * (0.6 + 0.4 * onBeat);
      }
      col.copy(dim).lerp(checker ? cA : cB, Math.min(1, k)).multiplyScalar(0.6 + 0.8 * k + state.flash * 0.4);
      tileMesh.setColorAt(i, col);
    });
    tileMesh.instanceColor.needsUpdate = true;

    // Spotlight cones swing to the dancers (all onto the soloist in a solo).
    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.25;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 7.0); c.cone.rotation.x = -0.12;
      coneMats[i].color.set(PALETTE[(state.barColor + i) % PALETTE.length]);
      coneMats[i].opacity = (0.025 + 0.045 * onBeat + 0.05 * lead + 0.1 * state.flash) * L * (1 - 0.35 * soloK) + 0.05 * soloK * L;
    });

    // The pot: stirring spoon (a push on each beat), bubbles, steam, flames, ooze.
    state.stir += dt * (0.6 + 1.6 * onBeat + 2 * state.geyser);
    spoonPivot.rotation.y = state.stir;
    spoon.rotation.z = 0.42 + 0.05 * Math.sin(songTime * 3);
    bubState.forEach((bs, i) => {
      const u = ((beat * 0.5 + bs.ph) % 1 + 1) % 1;                 // swell over two beats, pop
      const sc = (0.35 + 1.1 * Math.pow(u, 1.6)) * (u > 0.93 ? (1 - u) / 0.07 : 1);
      dummy.position.set(bs.x, 3.6 + 0.1 * sc, bs.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(sc, sc * 0.75, sc); dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    });
    bubbles.instanceMatrix.needsUpdate = true;
    steam.forEach((st) => {
      const u = ((songTime * 0.22 + st.ph) % 1 + 1) % 1;
      st.sp.position.set(st.x + Math.sin(u * 5 + st.ph * 9) * 0.4, 4.0 + u * 5, 0.3);
      const s = 1.4 + u * 2.6; st.sp.scale.set(s, s, 1);
      st.sp.material.opacity = Math.sin(Math.PI * u) * 0.55 * L;
    });
    flames.forEach((f, i) => { const s = 0.8 + 0.25 * Math.sin(songTime * 17 + i * 2.3) + 0.3 * onBeat; f.scale.set(1, s, 1); });
    flameMat.opacity = (0.55 + 0.3 * onBeat) * Math.max(0.3, L);
    rimDrips.forEach((r) => { const s = r.len + 0.25 * Math.sin(songTime * 1.6 + r.ph); r.d.scale.y = s; r.d.position.y = 3.35 - s * 0.45; });
    ooze.forEach((o) => { const s = o.len + 0.35 * Math.sin(songTime * 0.9 + o.ph) + 0.15 * onBeat; o.d.scale.y = s; o.d.position.y = 12.1 - s * 0.7; });
    cheeseTopMat.emissive.setRGB(0.35 * (0.45 + 0.55 * onBeat) * L + state.geyser * 0.3, 0.18 * L, 0);
    // Geyser.
    if (state.geyser > 0) {
      const g = state.geyser, h = 7 * Math.sin(Math.PI * Math.min(1, (1 - g) * 1.4 + 0.05));
      geyser.visible = geyserCap.visible = h > 0.2;
      geyser.scale.set(1, Math.max(0.01, h), 1); geyser.position.y = 3.6 + h / 2;
      geyserCap.position.y = 3.6 + h; geyserCap.scale.setScalar(0.8 + 0.4 * Math.sin(songTime * 9));
    } else geyser.visible = geyserCap.visible = false;

    // Waterfalls pour faster on the beat; vats splash.
    fallTex.offset.y += dt * (1.2 + 1.4 * onBeat) * (1 + state.geyser);
    splashes.forEach((sp, i) => { const s = 1 + 0.45 * onBeat + 0.2 * Math.sin(songTime * 7 + i); sp.scale.set(s, s, 1); });
    pans.forEach((p) => { p.hang.rotation.z = Math.sin(songTime * 2.2 + p.ph) * 0.12 + 0.08 * onBeat * Math.sin(p.ph * 3); });
    sign.material.opacity = L * (0.88 + 0.12 * onBeat);

    // Mouse crowd: hop on the beat, ears flapping, arms up when hyped.
    const hype = Math.min(1, 0.35 + state.cheer + Math.abs(state.focus) * 0.3);
    spots.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.phase * 0.3)) * (0.08 + 0.32 * hype * c.hype) * L;
      const lean = state.focus * 0.15 * Math.sign(-c.x || 1);
      const yaw = Math.atan2(-c.x, -c.z + 8) * 0.35;
      const y = c.y + jump;
      dummy.rotation.set(0, yaw, lean); dummy.scale.setScalar(1);
      dummy.position.set(c.x, y + 0.52, c.z); dummy.updateMatrix(); mBody.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x, y + 1.08, c.z); dummy.updateMatrix(); mHead.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x, y + 1.38, c.z); dummy.updateMatrix(); mHat.setMatrixAt(i, dummy.matrix);
      const flap = 0.25 * Math.sin(beat * Math.PI * 2 + c.phase);
      for (const s of [-1, 1]) {
        dummy.position.set(c.x + s * 0.22 * Math.cos(yaw), y + 1.3, c.z - s * 0.22 * Math.sin(yaw));
        dummy.rotation.set(0, yaw, s * (0.3 + flap)); dummy.scale.set(1, 1, 0.35); dummy.updateMatrix();
        mEar.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
        const up = hype > 0.6 ? 2.5 : 0.5 + 0.3 * Math.sin(beat * Math.PI + c.phase);
        dummy.position.set(c.x + s * 0.3 * Math.cos(yaw), y + 0.75, c.z - s * 0.3 * Math.sin(yaw));
        dummy.rotation.set(0, yaw, s * up); dummy.scale.setScalar(1); dummy.updateMatrix();
        mArm.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
      }
    });
    mBody.instanceMatrix.needsUpdate = mHead.instanceMatrix.needsUpdate = mHat.instanceMatrix.needsUpdate = true;
    mEar.instanceMatrix.needsUpdate = mArm.instanceMatrix.needsUpdate = true;

    // Macaroni confetti.
    let anyMac = false;
    for (let i = 0; i < MAC; i++) {
      const m = macs[i];
      if (m.life <= 0) continue;
      anyMac = true;
      m.life -= dt;
      m.v.y -= (m.v.y > -2 ? 6 : 0) * dt;
      m.p.addScaledVector(m.v, dt);
      m.r.x += m.w.x * dt; m.r.y += m.w.y * dt; m.r.z += m.w.z * dt;
      if (m.life <= 0 || m.p.y < 0) { m.life = 0; m.p.y = -50; }
      dummy.position.copy(m.p); dummy.rotation.copy(m.r); dummy.scale.setScalar(1.2); dummy.updateMatrix();
      macMesh.setMatrixAt(i, dummy.matrix);
    }
    if (anyMac || state._macDirty) { macMesh.instanceMatrix.needsUpdate = true; state._macDirty = anyMac; }

    // Lights (solo: house down, the soloist's side up).
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    potGlow.intensity = base.pot * L * (0.75 + 0.5 * onBeat + state.flash + state.geyser) * (1 - 0.5 * soloK);
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); }
        if (data.tier >= 4) { burstMac(40, x, 3); state.flash = 0.6; state.geyser = Math.max(state.geyser, 0.8); }
        break;
      case 'tauntLanded':
        burstMac(50, 0, 0, true); state.geyser = 1;
        state.flash = 1; state.cheer = 1;
        break;
      case 'dodge':
        state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5;
        break;
      case 'taunt':
        state.flash = 0.4; burstMac(12, 0, 0, true);
        break;
      case 'end':
        burstMac(120, x, 6); state.geyser = 1; state.cheer = 1; state.flash = 1;
        break;
      case 'drop':
        state.flash = 1; burstMac(50, 0, 8);
        break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; state.geyser = 1;
        burstMac(50, x, 3);
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update,
    react,
    setLightLevel(v) { state.lightLevel = Math.max(0, Math.min(1, v)); },
    dispose() {
      for (const d of disposables) if (d && d.dispose) d.dispose();
      for (const m of [tileMesh, bubbles, mBody, mHead, mEar, mHat, mArm, macMesh]) m.dispose();
      group.removeFromParent();
    },
  };
}
