// WORK — the open-plan office after hours, turned into a house club.
//
// Carpet tiles that light up on the kick, rows of cubicles with monitors
// flashing to the beat, fluorescent ceiling panels that flicker and then
// go full strobe, a water cooler glugging in time, photocopiers stacked
// like speaker cabinets (lids flapping, scan bars sweeping), a giant wall
// clock crawling toward 5 o'clock, a city skyline through the windows, a
// mirror ball, office-worker crowd raving behind the partitions and TPS
// reports flying everywhere on the big moves. Music-driven via update().

import * as THREE from '../../../vendor/three/three.module.min.js';

const STROBE = [0x6db4ff, 0xffe066, 0xff4f7a, 0x5cf2b0, 0xb98cff, 0xff9a3a];

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
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), dummy = new THREE.Object3D();

  // ── Room shell: back wall with windows, side walls, ceiling ─────────
  const skyTex = keep(canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#060b1c'); gr.addColorStop(0.7, '#1a2350'); gr.addColorStop(1, '#3a2a5a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; g.fillRect(Math.random() * w, Math.random() * h * 0.4, 1, 1); }
    // Skyline.
    let x = 0;
    while (x < w) {
      const bw = 18 + Math.random() * 34, bh = 60 + Math.random() * 150;
      g.fillStyle = '#0b1028'; g.fillRect(x, h - bh, bw, bh);
      for (let yy = h - bh + 6; yy < h - 4; yy += 9) for (let xx = x + 4; xx < x + bw - 4; xx += 7) {
        if (Math.random() < 0.45) { g.fillStyle = Math.random() < 0.8 ? '#ffe9a0' : '#8fd0ff'; g.fillRect(xx, yy, 3, 4); }
      }
      x += bw + 2;
    }
  }));
  const windowMat = basic(0xffffff, { map: skyTex });
  const backWall = new THREE.Mesh(geo(new THREE.PlaneGeometry(26, 9)), toon(0x2a3248));
  backWall.position.set(0, 3.9, -7.6);
  group.add(backWall);
  const win = new THREE.Mesh(geo(new THREE.PlaneGeometry(22, 4.2)), windowMat);
  win.position.set(0, 3.3, -7.55);
  group.add(win);
  // Window mullions.
  const mullMat = toon(0x161b2a);
  const mullV = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(0.14, 4.4, 0.12)), mullMat, 12);
  for (let i = 0; i < 12; i++) { m4.makeTranslation(-11 + i * 2, 3.3, -7.5); mullV.setMatrixAt(i, m4); }
  group.add(mullV);
  for (const y of [1.15, 5.45]) {
    const bar = new THREE.Mesh(geo(new THREE.BoxGeometry(22.2, 0.16, 0.14)), mullMat);
    bar.position.set(0, y, -7.5); group.add(bar);
  }
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(geo(new THREE.PlaneGeometry(16, 9)), toon(0x262d42));
    side.position.set(sx * 9.5, 3.9, -0.5); side.rotation.y = -sx * Math.PI / 2;
    group.add(side);
  }
  const ceiling = new THREE.Mesh(geo(new THREE.PlaneGeometry(22, 16)), toon(0x1c2132));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 7.0, -0.5);
  group.add(ceiling);

  // ── Carpet tiles (light up) ─────────────────────────────────────────
  const T = 0.7, tiles = [];
  for (let ix = -9; ix <= 9; ix++) for (let iz = -9; iz <= 5; iz++) {
    const x = ix * T, z = iz * T + 0.35;
    if (Math.abs(x) > 6.4 || z < -6.4) continue;
    tiles.push({ x, z, ix, iz, stage: Math.abs(x) < 4.4 && z > -2.6 && z < 2.9 });
  }
  const tileMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(T * 0.96, 0.05, T * 0.96)), basic(0xffffff), tiles.length);
  tiles.forEach((t, i) => { m4.makeTranslation(t.x, -0.02, t.z); tileMesh.setMatrixAt(i, m4); tileMesh.setColorAt(i, col.set(0x252b3c)); });
  group.add(tileMesh);
  const floorBase = new THREE.Mesh(geo(new THREE.PlaneGeometry(26, 12)), toon(0x1a1e2c));
  floorBase.rotation.x = -Math.PI / 2; floorBase.position.set(0, -0.06, -1.8);
  group.add(floorBase);
  // The office floor ends in a step down to the crowd pit.
  const edge = new THREE.Mesh(geo(new THREE.BoxGeometry(26, 0.6, 0.3)), toon(0x2e3a55));
  edge.position.set(0, -0.36, 4.3); group.add(edge);
  const edgeGlow = new THREE.Mesh(geo(new THREE.BoxGeometry(13, 0.05, 0.05)), basic(0x6db4ff));
  edgeGlow.position.set(0, -0.02, 4.46); group.add(edgeGlow);
  const pit = new THREE.Mesh(geo(new THREE.PlaneGeometry(30, 10)), toon(0x121522));
  pit.rotation.x = -Math.PI / 2; pit.position.set(0, -0.64, 9.2); group.add(pit);

  // ── Cubicles: partitions, desks, monitors, chairs ───────────────────
  const cubes = [];
  const cubeScale = lowGraphics ? 0.7 : 1;
  // Back row (behind the stage) and side rows.
  for (let i = 0; i < 6; i++) cubes.push({ x: -6.25 + i * 2.5, z: -5.4, rot: 0 });
  for (const sx of [-1, 1]) for (let i = 0; i < (lowGraphics ? 2 : 3); i++) cubes.push({ x: sx * 6.6, z: -2.8 + i * 2.2, rot: -sx * Math.PI / 2 });
  const nC = cubes.length;
  const partMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(2.3, 1.35, 0.1)), toon(0x5b6a86), nC * 2);
  const deskMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(1.8, 0.08, 0.8)), toon(0xc9b28a), nC);
  const monMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(0.62, 0.44, 0.06)), toon(0x1a1c24), nC);
  const scrMesh = new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(0.54, 0.36)), basic(0xffffff), nC);
  const chairMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(0.5, 0.75, 0.12)), toon(0x22262f), nC);
  const parent = new THREE.Object3D();
  const place = (mesh, i, c, x, y, z, ry = 0) => {
    parent.position.set(c.x, 0, c.z); parent.rotation.set(0, c.rot, 0); parent.updateMatrix();
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    m4.multiplyMatrices(parent.matrix, dummy.matrix); mesh.setMatrixAt(i, m4);
  };
  cubes.forEach((c, i) => {
    place(partMesh, i * 2, c, 0, 0.67, -0.55);                // back panel
    place(partMesh, i * 2 + 1, c, 1.15, 0.67, 0.0, Math.PI / 2); // side panel
    place(deskMesh, i, c, 0, 0.74, -0.2);
    place(monMesh, i, c, 0, 1.02, -0.32);
    place(scrMesh, i, c, 0, 1.02, -0.285);
    place(chairMesh, i, c, 0.1, 0.75, 0.45);
    scrMesh.setColorAt(i, col.set(STROBE[i % STROBE.length]));
  });
  group.add(partMesh, deskMesh, monMesh, scrMesh, chairMesh);

  // ── Fluorescent ceiling panels → strobes ────────────────────────────
  const panels = [];
  for (let ix = -2; ix <= 2; ix++) for (let iz = -3; iz <= 1; iz++) panels.push({ x: ix * 2.6, z: iz * 2.2 + 0.4, ix, iz });
  const panelMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(1.5, 0.06, 0.55)), basic(0xffffff), panels.length);
  panels.forEach((q, i) => { m4.makeTranslation(q.x, 6.95, q.z); panelMesh.setMatrixAt(i, m4); panelMesh.setColorAt(i, col.set(0xeaf4ff)); });
  group.add(panelMesh);

  // ── Giant wall clock (crawling toward 5) + neon sign ────────────────
  const clockTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fbfaf2'; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#1a1e2c'; g.stroke();
    g.fillStyle = '#1a1e2c'; g.font = '900 30px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6 - Math.PI / 2; g.fillText(String(i), 128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); }
    g.fillStyle = '#d8262e'; g.font = '900 16px "Arial Black", sans-serif'; g.fillText('MONDAY CORP', 128, 172);
  }));
  const clock = new THREE.Group();
  clock.position.set(0, 5.35, -7.3);
  group.add(clock);
  const clockFace = new THREE.Mesh(geo(new THREE.CircleGeometry(1.15, 40)), basic(0xffffff, { map: clockTex }));
  clock.add(clockFace);
  const clockRim = new THREE.Mesh(geo(new THREE.TorusGeometry(1.17, 0.09, 8, 40)), toon(0x2e3a55));
  clock.add(clockRim);
  const handMat = toon(0x1a1e2c);
  const hourHand = new THREE.Group(), minHand = new THREE.Group(), secHand = new THREE.Group();
  const mkHand = (grp, len, wdt, mat) => { const m = new THREE.Mesh(geo(new THREE.BoxGeometry(wdt, len, 0.03)), mat); m.position.y = len / 2 - 0.08; grp.add(m); grp.position.z = 0.03; clock.add(grp); };
  mkHand(hourHand, 0.62, 0.1, handMat); mkHand(minHand, 0.95, 0.06, handMat); mkHand(secHand, 1.0, 0.025, toon(0xd8262e));
  secHand.position.z = 0.05;

  const signTex = keep(canvasTex(512, 128, (g, w, h) => {
    g.font = '900 86px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#6db4ff'; g.shadowBlur = 26; g.strokeStyle = '#9fd0ff'; g.lineWidth = 7;
    g.strokeText('OVERTIME', w / 2, h / 2 + 4); g.shadowBlur = 12; g.fillStyle = '#f2faff'; g.fillText('OVERTIME', w / 2, h / 2 + 4);
  }));
  const sign = new THREE.Mesh(geo(new THREE.PlaneGeometry(4.2, 1.05)), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false }));
  sign.position.set(-5.2, 5.6, -7.45);
  group.add(sign);
  const posterTex = keep(canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = '#10141f'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe066'; g.fillRect(6, 6, w - 12, h - 44);
    g.fillStyle = '#7a4a1a'; g.beginPath(); g.arc(64, 62, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '900 15px "Arial Black", sans-serif'; g.textAlign = 'center';
    g.fillText('HANG IN', 64, h - 24); g.fillText('THERE', 64, h - 8);
  }));
  const poster = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.3, 1.62)), basic(0xffffff, { map: posterTex }));
  poster.position.set(5.4, 5.6, -7.45);
  group.add(poster);

  // ── Water cooler (glugs on the beat) ────────────────────────────────
  const cooler = new THREE.Group();
  cooler.position.set(-4.9, 0, -1.0);
  group.add(cooler);
  const cBase = new THREE.Mesh(geo(new THREE.BoxGeometry(0.6, 1.1, 0.55)), toon(0xe8ecf2));
  cBase.position.y = 0.55; cooler.add(cBase);
  const bottleMat = toon(0x6ec8ff, { transparent: true, opacity: 0.75, emissive: 0x0a3050 });
  const bottle = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 16)), bottleMat);
  bottle.position.y = 1.45; cooler.add(bottle);
  const bubbleGeo = geo(new THREE.SphereGeometry(0.05, 6, 4)), bubbleMat = basic(0xdff6ff);
  const bubbles = [];
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(bubbleGeo, bubbleMat); b.position.set((i - 1.5) * 0.08, 1.2, 0.1); cooler.add(b); bubbles.push(b); }
  for (const sx of [-1, 1]) { const tap = new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.07, 0.08)), toon(sx > 0 ? 0xd8262e : 0x2a6cd8)); tap.position.set(sx * 0.12, 0.85, 0.3); cooler.add(tap); }

  // ── Photocopier speaker stacks ──────────────────────────────────────
  const copiers = [];
  const copMat = toon(0xd9dce4), lidMat = toon(0x50586a), scanMat = basic(0x7fe6ff);
  for (const sx of [-1, 1]) {
    const stack = new THREE.Group();
    stack.position.set(sx * 5.25, 0, 0.9);
    stack.rotation.y = -sx * 0.4;
    group.add(stack);
    for (let k = 0; k < 2; k++) {
      const y0 = k * 1.15;
      const body = new THREE.Mesh(geo(new THREE.BoxGeometry(1.2, 1.0, 0.9)), copMat);
      body.position.y = y0 + 0.5; stack.add(body);
      const tray = new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 0.06, 0.5)), lidMat);
      tray.position.set(0, y0 + 0.4, 0.55); stack.add(tray);
      const woof = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 18)), toon(0x2a2e38));
      woof.rotation.x = Math.PI / 2; woof.position.set(0, y0 + 0.55, 0.46); stack.add(woof);
      const lid = new THREE.Group(); lid.position.set(0, y0 + 1.02, -0.45); stack.add(lid);
      const lidM = new THREE.Mesh(geo(new THREE.BoxGeometry(1.15, 0.07, 0.88)), lidMat); lidM.position.z = 0.44; lid.add(lidM);
      const scan = new THREE.Mesh(geo(new THREE.BoxGeometry(1.05, 0.03, 0.08)), scanMat);
      scan.position.set(0, y0 + 1.0, 0); stack.add(scan);
      copiers.push({ woof, lid, scan, phase: k * 0.5 + (sx > 0 ? 0.25 : 0) });
    }
  }

  // ── Mirror ball + spotlight truss ───────────────────────────────────
  const ball = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.42, 1)), toon(0xd0d8ea, { flatShading: true, emissive: 0x223044 }));
  ball.position.set(0, 6.1, -0.6);
  group.add(ball);
  const cord = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4)), toon(0x111111));
  cord.position.set(0, 6.7, -0.6); group.add(cord);
  const coneGeo = geo(new THREE.ConeGeometry(0.9, 6.6, 20, 1, true));
  coneGeo.translate(0, -3.3, 0);
  const cones = [], coneMats = [];
  for (const [x, tx] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    const fix = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.18, 0.26, 0.36, 10)), toon(0x151822));
    fix.position.set(x, 6.75, 1.0); group.add(fix);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.position.copy(fix.position); group.add(cone);
    cones.push({ cone, baseX: x, targetX: tx, side: tx < 0 ? 'player' : 'rival' }); coneMats.push(mat);
  }

  // ── Office crowd: shirts and ties, raving behind the partitions ─────
  const crowd = [];
  const addRow = (n, x0, x1, z, y, jit = 0.4) => { for (let i = 0; i < n; i++) crowd.push({ x: x0 + (x1 - x0) * (i + Math.random() * jit) / n, z: z + Math.random() * 0.4, y }); };
  const cs = lowGraphics ? 0.6 : 1;
  addRow(Math.round(14 * cs), -6.8, 6.8, 5.3, -1.0);
  addRow(Math.round(16 * cs), -7.6, 7.6, 6.4, -1.15);
  addRow(Math.round(10 * cs), -6.5, 6.5, -6.3, 0.0, 0.6);      // behind the back cubicles
  addRow(Math.round(4 * cs), -8.6, -7.4, -1.5, 0.0);
  addRow(Math.round(4 * cs), 7.4, 8.6, -1.5, 0.0);
  const nCrowd = crowd.length;
  const shirtCols = [0xf4f4f0, 0xcfe3ff, 0xffe1e6, 0xe8f6d8, 0xfff2c8];
  const skin = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22, 0xf3d2b8];
  const bodyMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.26, 0.55, 3, 8)), toon(0xffffff), nCrowd);
  const headMesh = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.2, 10, 8)), toon(0xffffff), nCrowd);
  const armMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6)), toon(0xffffff), nCrowd * 2);
  const tieMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(0.07, 0.36, 0.04)), toon(0xffffff), nCrowd);
  crowd.forEach((c, i) => {
    c.phase = Math.random() * Math.PI * 2; c.hype = 0.6 + Math.random() * 0.6;
    bodyMesh.setColorAt(i, col.set(shirtCols[i % shirtCols.length]));
    headMesh.setColorAt(i, col.set(skin[i % skin.length]));
    armMesh.setColorAt(i * 2, col.set(shirtCols[i % shirtCols.length])); armMesh.setColorAt(i * 2 + 1, col.set(shirtCols[i % shirtCols.length]));
    tieMesh.setColorAt(i, col.set(STROBE[(i * 3) % STROBE.length]));
  });
  group.add(bodyMesh, headMesh, armMesh, tieMesh);

  // ── Flying TPS reports ──────────────────────────────────────────────
  const paperTex = keep(canvasTex(64, 80, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8262e'; g.fillRect(6, 6, 30, 8);
    g.fillStyle = '#8a98b8'; for (let i = 0; i < 6; i++) g.fillRect(6, 22 + i * 9, i === 5 ? 28 : 50, 3);
  }));
  const NP = lowGraphics ? 36 : 70;
  const paperMesh = new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(0.32, 0.4)), toon(0xffffff, { map: paperTex, side: THREE.DoubleSide }), NP);
  const papers = Array.from({ length: NP }, (_, i) => ({ p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, 0), spin: new THREE.Vector3(), life: 0, ambient: i < NP * 0.18 }));
  paperMesh.frustumCulled = false;
  group.add(paperMesh);
  let paperCursor = 0;
  function throwPapers(n, x, up = 1) {
    for (let k = 0; k < n; k++) {
      const q = papers[paperCursor = (paperCursor + 1) % NP];
      if (q.ambient && q.life > 0) continue;
      q.p.set(x + (Math.random() - 0.5) * 1.5, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 2 + 0.3);
      q.v.set((Math.random() - 0.5) * 4, (2.5 + Math.random() * 3) * up, (Math.random() - 0.5) * 2);
      q.spin.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
      q.life = 4 + Math.random() * 2;
    }
  }

  // ── Lights ──────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xdfeaff, 0x2a2440, 1.05);
  const key = new THREE.DirectionalLight(0xfff6ea, 1.5);
  key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(0x6db4ff, 16, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0xffe066, 14, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const strobe = new THREE.PointLight(0xffffff, 0, 16, 1.4); strobe.position.set(0, 5.5, 0.5);
  group.add(hemi, key, rimL, rimR, strobe);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity };

  // ── State + update ──────────────────────────────────────────────────
  const state = { L: 1, flash: 0, cheer: 0, focus: 0, ripple: null, solo: null, lastBeat: -1, bar: 0, spin: 0, rave: 0, clockSpin: 0 };

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const L = state.L;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.45);
    state.rave = Math.max(0, state.rave - dt * 0.12);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    if (whole !== state.lastBeat) { state.lastBeat = whole; if (whole % 4 === 0) state.bar = (state.bar + 1) % STROBE.length; }
    // Party level: the office "wakes up" as the song goes on and on hype.
    const party = Math.min(1, 0.45 + state.rave + state.cheer * 0.5);

    // Carpet: checker on the kick, ripple from big moves, spot under the soloist.
    const cA = col.set(STROBE[state.bar]).clone(), cB = new THREE.Color(STROBE[(state.bar + 3) % STROBE.length]), dim = new THREE.Color(0x232838);
    tiles.forEach((t, i) => {
      const chk = ((t.ix + t.iz + whole) & 1) === 0;
      let k = t.stage ? (chk ? 0.18 + 0.6 * onBeat * party : 0.08) * L : 0.04 * L;
      if (state.ripple) {
        const r = (songTime - state.ripple.t) * 7, d = Math.hypot(t.x - state.ripple.x, t.z);
        k = Math.max(k, Math.exp(-Math.pow((d - r) * 1.8, 2)) * (1 - Math.min(1, r / 10)) * L);
      }
      if (soloK > 0) k = k * (1 - 0.8 * soloK) + soloK * Math.exp(-Math.pow(Math.hypot(t.x - soloX, t.z - 0.2) / 1.2, 2)) * (0.6 + 0.4 * onBeat);
      col.copy(dim).lerp(chk ? cA : cB, Math.min(1, k)).multiplyScalar(0.6 + 0.8 * k + state.flash * 0.4);
      tileMesh.setColorAt(i, col);
    });
    tileMesh.instanceColor.needsUpdate = true;

    // Ceiling panels: fluorescent flicker → coloured strobes when it's on.
    panels.forEach((q, i) => {
      const flick = Math.sin(songTime * 37 + i * 13.1) > 0.985 ? 0.25 : 1;
      const chase = ((q.ix + q.iz + whole) % 3 + 3) % 3 === 0;
      const strobeOn = party > 0.75 && chase ? onBeat : 0;
      col.set(0xdfeeff).multiplyScalar((0.25 + 0.5 * (1 - party)) * flick * L * (1 - 0.7 * soloK));
      if (strobeOn > 0.02) col.lerp(new THREE.Color(STROBE[(state.bar + i) % STROBE.length]), strobeOn).multiplyScalar(1 + strobeOn);
      panelMesh.setColorAt(i, col);
    });
    panelMesh.instanceColor.needsUpdate = true;

    // Monitors flash on the beat.
    for (let i = 0; i < nC; i++) {
      const on = ((i + whole) % 3 === 0) ? onBeat : 0.15;
      scrMesh.setColorAt(i, col.set(STROBE[(i + state.bar) % STROBE.length]).multiplyScalar((0.35 + 0.9 * on) * L));
    }
    scrMesh.instanceColor.needsUpdate = true;

    // Clock: hours crawl from 9 toward 5, the minute hand ticks every beat,
    // whole thing spins on huge moves.
    state.clockSpin = Math.max(0, state.clockSpin - dt * 1.5);
    const hours = 9 + Math.min(8, songTime / 30);
    hourHand.rotation.z = -((hours % 12) / 12) * Math.PI * 2;
    minHand.rotation.z = -(whole + smooth01(ph * 4)) * Math.PI / 30 - state.clockSpin * 8 * songTime;
    secHand.rotation.z = -beat * Math.PI / 2;
    clock.rotation.z = Math.sin(songTime * 3) * 0.02 * state.clockSpin;
    sign.material.opacity = L * (0.8 + 0.2 * onBeat) * (Math.sin(songTime * 23) > 0.96 ? 0.35 : 1);

    // Water cooler glug, copier lids flap, scan bars sweep, woofers pump.
    bottle.scale.set(1 + 0.05 * onBeat, 1 - 0.04 * onBeat, 1 + 0.05 * onBeat);
    bubbles.forEach((b, i) => { b.position.y = 1.2 + ((songTime * 0.8 + i * 0.25) % 1) * 0.5; });
    for (const c of copiers) {
      const lph = (beat + c.phase) % 1;
      c.lid.rotation.x = -0.5 * Math.exp(-lph * 5) * L * party;
      c.scan.position.z = Math.sin((beat + c.phase) * Math.PI) * 0.38;
      c.woof.scale.set(1 + 0.2 * onBeat * L, 1, 1 + 0.2 * onBeat * L);
    }

    // Mirror ball + spot cones (they land on the soloist).
    ball.rotation.y += dt * (0.6 + 1.5 * party);
    ball.material.emissive.setRGB(0.15 + 0.4 * onBeat * party, 0.18 + 0.3 * onBeat * party, 0.25 + 0.4 * onBeat * party);
    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.3;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.6); c.cone.rotation.x = -0.12;
      coneMats[i].color.set(soloK > 0.5 ? 0xffffff : STROBE[(state.bar + i) % STROBE.length]);
      coneMats[i].opacity = (0.02 + 0.04 * onBeat * party + 0.05 * lead + 0.1 * state.flash + 0.08 * soloK) * L;
    });

    // Crowd.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3 + state.rave * 0.4);
    crowd.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.phase * 0.3)) * (0.06 + 0.3 * hype * c.hype) * L * (1 - 0.6 * soloK);
      dummy.position.set(c.x, c.y + 0.55 + jump, c.z);
      dummy.rotation.set(0, Math.atan2(-c.x, -c.z + 8) * 0.3, state.focus * 0.12 * Math.sign(-c.x || 1));
      dummy.scale.setScalar(1); dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.62; dummy.updateMatrix(); headMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x, c.y + 0.68 + jump, c.z + 0.24); dummy.rotation.set(0, 0, Math.sin(beat * Math.PI + c.phase) * 0.35); dummy.updateMatrix();
      tieMesh.setMatrixAt(i, dummy.matrix);
      const armUp = hype > 0.6 ? 2.6 + 0.2 * Math.sin(beat * Math.PI * 2 + c.phase) : 0.4 + 0.3 * Math.sin(beat * Math.PI + c.phase);
      for (const s of [-1, 1]) {
        dummy.position.set(c.x + s * 0.28, c.y + 0.85 + jump, c.z);
        dummy.rotation.set(0, 0, s * armUp); dummy.updateMatrix();
        armMesh.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
      }
    });
    bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = armMesh.instanceMatrix.needsUpdate = tieMesh.instanceMatrix.needsUpdate = true;

    // Papers: a few always drift down from the ceiling; thrown ones arc.
    papers.forEach((q, i) => {
      if (q.ambient && q.life <= 0) {
        q.p.set((Math.random() - 0.5) * 12, 7 + Math.random() * 2, -5 + Math.random() * 8);
        q.v.set(0, -0.5, 0); q.spin.set(Math.random() * 2, Math.random() * 2, Math.random()); q.life = 14;
      }
      if (q.life > 0) {
        q.life -= dt;
        q.v.y = Math.max(-0.9, q.v.y - 6 * dt);
        q.v.x *= 1 - dt * 0.6; q.v.z *= 1 - dt * 0.6;
        q.p.addScaledVector(q.v, dt);
        q.p.x += Math.sin(songTime * 2 + i) * 0.4 * dt;
        q.r.addScaledVector(q.spin, dt);
        if (q.p.y < 0.02) { q.p.y = 0.02; q.v.set(0, 0, 0); q.spin.set(0, 0, 0); q.r.x = -Math.PI / 2; }
      }
      dummy.position.copy(q.life > 0 ? q.p : dummy.position.set(0, -50, 0));
      dummy.rotation.set(q.r.x, q.r.y, q.r.z); dummy.scale.setScalar(1); dummy.updateMatrix();
      paperMesh.setMatrixAt(i, dummy.matrix);
    });
    paperMesh.instanceMatrix.needsUpdate = true;

    // Lights.
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    strobe.intensity = L * (party > 0.75 ? 10 * onBeat * onBeat : 0) + 18 * state.flash * L;
    strobe.color.set(STROBE[state.bar]);
  }
  const smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); throwPapers(8, x); state.rave = Math.min(0.6, state.rave + 0.1); }
        if (data.tier >= 4) { state.flash = 0.6; state.clockSpin = 1; throwPapers(12, x); }
        break;
      case 'taunt':
        state.flash = 0.35;
        break;
      case 'tauntLanded':
        throwPapers(26, data.attacker === 'rival' ? -1.6 : 1.6, 1.3);
        state.flash = 1; state.cheer = 1;
        break;
      case 'dodge':
        state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5; throwPapers(8, 0);
        break;
      case 'end':
        throwPapers(50, x, 1.4); state.cheer = 1; state.flash = 1; state.rave = 0.6; state.clockSpin = 1;
        break;
      case 'drop':
        state.flash = 1; state.rave = 0.6; throwPapers(20, 0, 1.2);
        break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; throwPapers(20, x);
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update, react,
    setLightLevel(v) { state.L = Math.max(0, Math.min(1, v)); },
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); },
  };
}
