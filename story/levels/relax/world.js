// RELAX YOUR MIND — Sage's floating zen garden at dusk.
//
// A floating island of raked sand (glowing ripple rings spread across it on
// every beat), a round moon gate framing a second island with a koi pond
// and cherry trees, stone lanterns, drifting floating stones, sky lanterns
// rising out of a pink cloud sea, falling blossom petals, an aurora over a
// purple-pink sky, and a serene audience floating on cushions. Moonbeam
// shafts swing onto the dancers. Everything breathes on the music clock.

import * as THREE from '../../../vendor/three/three.module.min.js';

const PALETTE = [0xc89bff, 0xff9ed8, 0x8fd8ff, 0xffd8a0, 0xa0ffd8, 0xff8fb0];

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
    const t = new THREE.DataTexture(new Uint8Array([100, 175, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const geo = (g) => keep(g);
  const col = new THREE.Color(), dummy = new THREE.Object3D(), tipX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const add = (mesh, x = 0, y = 0, z = 0, parent = group) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  const instanced = [];
  const inst = (g, mat, n, parent = group) => { const m = new THREE.InstancedMesh(geo(g), mat, n); instanced.push(m); parent.add(m); return m; };
  const low = lowGraphics;

  // ── Dusk sky + aurora + stars + moon ────────────────────────────
  const sky = add(new THREE.Mesh(geo(new THREE.SphereGeometry(85, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.10,0.05,0.24), mid = vec3(0.42,0.20,0.55), hor = vec3(1.0,0.62,0.72), low = vec3(0.55,0.32,0.62);
        vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.75, h)) : (h > -0.05 ? mix(hor, mid, smoothstep(-0.05, 0.08, h)) : mix(low, hor, smoothstep(-0.4, -0.05, h)));
        c += vec3(0.15,0.08,0.18) * uPulse * smoothstep(0.35, 0.0, abs(h - 0.05));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }))));
  const auroraMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vU; uniform float uT; uniform float uK;
      void main(){
        float x = vU.x * 18.0;
        float wave = sin(x * 0.7 + uT * 0.35) * 0.12 + sin(x * 1.9 - uT * 0.5) * 0.05;
        float band = smoothstep(0.0, 0.25, vU.y - 0.15 - wave) * smoothstep(1.0, 0.45, vU.y - wave);
        float curtain = 0.55 + 0.45 * sin(x * 5.0 + sin(x * 1.3 + uT * 0.6) * 2.0);
        vec3 c = mix(vec3(0.3,1.0,0.75), vec3(1.0,0.45,0.85), smoothstep(0.3, 0.9, vU.y));
        gl_FragColor = vec4(c * band * curtain * 0.42 * uK, 1.0);
      }`,
  }));
  const aurora = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(70, 70, 26, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8)), auroraMat), 0, 26, 0);
  const STARS = low ? 120 : 260, sp = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) { const a = Math.random() * Math.PI * 2, y = 0.3 + Math.random() * 0.68, r = 78; sp[i * 3] = Math.cos(a) * r * Math.sqrt(1 - y * y); sp[i * 3 + 1] = y * r; sp[i * 3 + 2] = Math.sin(a) * r * Math.sqrt(1 - y * y); }
  const starGeo = geo(new THREE.BufferGeometry()); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = keep(new THREE.PointsMaterial({ color: 0xfff0ff, size: 0.3, fog: false, transparent: true }));
  group.add(new THREE.Points(starGeo, starMat));
  const glowTex = keep(canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,240,250,0.7)'); gr.addColorStop(1, 'rgba(255,200,240,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }));
  const moonTex = keep(canvasTex(256, 256, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.16, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,248,240,1)'); gr.addColorStop(0.32, 'rgba(255,240,245,1)'); gr.addColorStop(0.36, 'rgba(255,200,235,0.35)'); gr.addColorStop(1, 'rgba(255,170,220,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }));
  add(new THREE.Mesh(geo(new THREE.PlaneGeometry(18, 18)), basic(0xffffff, { map: moonTex, transparent: true, depthWrite: false, fog: false })), 14, 22, -60);

  // ── Cloud sea far below ─────────────────────────────────────────
  const cloudTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a070c0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = (i * 73) % w, y = (i * 41) % h, r = 18 + (i % 5) * 9;
      const gr = g.createRadialGradient(x, y, 1, x, y, r);
      gr.addColorStop(0, 'rgba(255,190,230,0.55)'); gr.addColorStop(1, 'rgba(255,190,230,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }));
  cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping; cloudTex.repeat.set(6, 6);
  const clouds = add(new THREE.Mesh(geo(new THREE.CircleGeometry(90, 40)), basic(0xffffff, { map: cloudTex })), 0, -7, 0);
  clouds.rotation.x = -Math.PI / 2;

  // ── The floating stage island: raked sand + rock underside ───────
  const sandTex = keep(canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#e8d6c2'; g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(150,115,120,0.45)'; g.lineWidth = 3;
    for (let r = 14; r < w / 2; r += 14) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5;
    for (let r = 18; r < w / 2; r += 14) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, Math.PI * 2); g.stroke(); }
  }));
  const sand = add(new THREE.Mesh(geo(new THREE.CircleGeometry(4.75, 64)), toon(0xffffff, { map: sandTex })), 0, 0.0, 0);
  sand.rotation.x = -Math.PI / 2;
  const rockMat = toon(0x5a4a6a);
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(4.95, 4.7, 0.5, 40)), toon(0x7a6a88)), 0, -0.26, 0);
  const under = add(new THREE.Mesh(geo(new THREE.ConeGeometry(4.7, 4.6, 14, 2)), rockMat), 0, -2.8, 0);
  under.rotation.x = Math.PI;
  const edge = add(new THREE.Mesh(geo(new THREE.TorusGeometry(4.82, 0.12, 6, 64)), toon(0x9a8aa8)), 0, 0.02, 0);
  edge.rotation.x = Math.PI / 2;
  // Rune ring that pulses on the beat.
  const runeTex = keep(canvasTex(512, 32, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#fff';
    for (let i = 0; i < 24; i++) { const x = i * (w / 24) + 6; g.fillRect(x, 8, 3, 16); g.beginPath(); g.arc(x + 10, 16, 5, 0, Math.PI * 2); g.fill(); }
  }));
  runeTex.wrapS = THREE.RepeatWrapping; runeTex.repeat.set(3, 1);
  const runeMat = basic(0xffffff, { map: runeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xff9ed8 });
  const rune = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(4.96, 4.96, 0.2, 64, 1, true)), runeMat), 0, -0.22, 0);
  // Ripple rings across the sand.
  const RIPN = 7;
  const ripGeo = geo(new THREE.RingGeometry(0.92, 1.0, 64));
  const ripples = [];
  for (let i = 0; i < RIPN; i++) {
    const m = add(new THREE.Mesh(ripGeo, keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))), 0, 0.02, 0);
    m.rotation.x = -Math.PI / 2;
    ripples.push({ m, t0: -99, x: 0, z: 0, big: false });
  }
  let ripCursor = 0;
  const spawnRipple = (t, x, z, big) => { const r = ripples[ripCursor = (ripCursor + 1) % RIPN]; r.t0 = t; r.x = x; r.z = z; r.big = big; };
  // Stones on the sand.
  for (const [x, z, s] of [[-3.6, -2.4, 0.5], [3.8, -2.0, 0.42], [-1.0, -3.9, 0.36], [2.2, 3.7, 0.3]]) {
    const st = add(new THREE.Mesh(geo(new THREE.DodecahedronGeometry(s, 0)), toon(0x6a5a78)), x, s * 0.5, z);
    st.scale.set(1.3, 0.8, 1.1);
  }

  // ── Stone lanterns on the rim ───────────────────────────────────
  const lanternGlow = basic(0xffd8a0);
  const stoneMat = toon(0x8a8098);
  const lanterns = [];
  for (const a of [-2.25, -0.9, Math.PI + 0.9, Math.PI + 2.25]) {
    const L = add(new THREE.Group(), Math.cos(a) * 4.35, 0, Math.sin(a) * 4.35);
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 8)), stoneMat), 0, 0.35, 0, L);
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.5, 0.42, 0.5)), stoneMat), 0, 0.9, 0, L);
    const g1 = add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.3, 0.26, 0.52)), lanternGlow), 0, 0.92, 0, L);
    add(new THREE.Mesh(geo(new THREE.ConeGeometry(0.48, 0.32, 4)), stoneMat), 0, 1.27, 0, L).rotation.y = Math.PI / 4;
    add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.07, 6, 4)), stoneMat), 0, 1.47, 0, L);
    lanterns.push(g1);
  }

  // ── Moon gate + the koi pond island behind ──────────────────────
  const gateMat = toon(0xc8506a);
  const gate = add(new THREE.Mesh(geo(new THREE.TorusGeometry(3.3, 0.32, 10, 48)), gateMat), 0, 3.15, -4.45);
  add(new THREE.Mesh(geo(new THREE.TorusGeometry(3.68, 0.08, 6, 48)), toon(0xffd27a, { emissive: 0x3a2a00 })), 0, 3.15, -4.45);
  for (const sx of [-1, 1]) add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 0.4, 0.8)), toon(0x7a6a88)), sx * 2.4, 0.2, -4.45);
  const isle = add(new THREE.Group(), 0, -0.8, -9.2);
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(4.2, 4.0, 0.5, 32)), toon(0x7a8a6a)), 0, 0, 0, isle);
  add(new THREE.Mesh(geo(new THREE.ConeGeometry(4.0, 3.6, 12, 1)), rockMat), 0, -2.05, 0, isle).rotation.x = Math.PI;
  const waterTex = keep(canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#3a5aa8'; g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(200,220,255,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const x = (i * 59) % w, y = (i * 97) % w; g.beginPath(); g.ellipse(x, y, 14 + (i % 4) * 6, 4, 0, 0, Math.PI * 2); g.stroke(); }
  }));
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(2, 2);
  const pond = add(new THREE.Mesh(geo(new THREE.CircleGeometry(2.8, 40)), basic(0xffffff, { map: waterTex })), 0, 0.27, 0, isle);
  pond.rotation.x = -Math.PI / 2;
  const KOI = 7;
  const koiBody = inst(new THREE.CapsuleGeometry(0.11, 0.36, 2, 6), toon(0xffffff), KOI, isle);
  const koiTail = inst(new THREE.ConeGeometry(0.1, 0.18, 4), toon(0xffffff), KOI, isle);
  for (let i = 0; i < KOI; i++) { const c = [0xff7a2a, 0xffffff, 0xff4a3a, 0xffd04a][i % 4]; koiBody.setColorAt(i, col.set(c)); koiTail.setColorAt(i, col.set(c)); }
  const pads = inst(new THREE.CircleGeometry(0.28, 10), toon(0x4aa85a, { side: THREE.DoubleSide }), 6, isle);
  for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.4, r = 1.2 + (i % 3) * 0.45; dummy.position.set(Math.cos(a) * r, 0.29, Math.sin(a) * r); dummy.rotation.set(-Math.PI / 2, 0, a); dummy.scale.setScalar(1); dummy.updateMatrix(); pads.setMatrixAt(i, dummy.matrix); }

  // ── Cherry trees (one each side of the pond, one on a floating rock) ─
  const trunkMat = toon(0x5a3a4a);
  const blossomMat = toon(0xffb0d8, { emissive: 0x2a0a1a });
  const treeSpots = [[-3.3, -0.8 + 0.25, -9.0, 1.0, isle], [3.4, 0.25 - 0.8, -9.4, 0.9, isle]];
  const BL = 12;
  const blossoms = inst(new THREE.IcosahedronGeometry(0.55, 0), blossomMat, BL * 4);
  let bi = 0;
  const trees = [];
  const plantTree = (x, y, z, s) => {
    const t = add(new THREE.Group(), x, y, z);
    t.scale.setScalar(s);
    const tr1 = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.16, 0.24, 1.8, 7)), trunkMat), 0, 0.9, 0, t); tr1.rotation.z = 0.12;
    const tr2 = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.1, 0.15, 1.2, 6)), trunkMat), -0.25, 2.1, 0, t); tr2.rotation.z = 0.5;
    const tr3 = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.1, 0.14, 1.1, 6)), trunkMat), 0.25, 2.05, 0.1, t); tr3.rotation.z = -0.55;
    trees.push({ t, base: bi, s, x, y, z });
    for (let k = 0; k < BL; k++, bi++) {
      const a = k * 2.4, r = 0.5 + (k % 4) * 0.28;
      trees[trees.length - 1][k] = [Math.cos(a) * r * 1.3, 2.4 + (k % 3) * 0.35 + Math.sin(k) * 0.2, Math.sin(a) * r * 0.8, 0.7 + (k % 3) * 0.25];
    }
  };
  for (const [x, y, z, s] of treeSpots) plantTree(x, y, z, s);
  plantTree(-7.4, 1.0, -3.6, 0.85);
  plantTree(7.6, 0.8, -2.8, 0.8);
  blossoms.count = bi;
  const updateBlossoms = (time) => {
    for (const tr of trees) for (let k = 0; k < BL; k++) {
      const [bx, by, bz, bs] = tr[k];
      dummy.position.set(tr.x + (bx + 0.04 * Math.sin(time * 0.9 + k)) * tr.s, tr.y + by * tr.s, tr.z + bz * tr.s);
      dummy.rotation.set(k, k * 2, 0); dummy.scale.setScalar(bs * tr.s); dummy.updateMatrix();
      blossoms.setMatrixAt(tr.base + k, dummy.matrix);
    }
    blossoms.instanceMatrix.needsUpdate = true;
  };
  updateBlossoms(0);

  // ── Floating stones (two carry the side cherry trees) ───────────
  const floaters = [];
  for (const [x, y, z, s] of [[-7.4, 0.4, -3.6, 1.6], [7.6, 0.2, -2.8, 1.5], [-10, 3.5, -8, 1.0], [10.5, 4.2, -9, 1.2], [-5.5, 6.5, -12, 0.8], [6, 7, -13, 0.9], [-12, 1.5, 2, 0.9], [12, 2.2, 1.5, 0.8]]) {
    const r = add(new THREE.Mesh(geo(new THREE.DodecahedronGeometry(s, 0)), rockMat), x, y, z);
    r.scale.set(1.3, 0.55, 1.2);
    floaters.push({ r, y, ph: x * 0.7 });
  }

  // ── Sky lanterns rising from the clouds ─────────────────────────
  const SKYL = low ? 12 : 22;
  const skyLan = inst(new THREE.CylinderGeometry(0.18, 0.13, 0.36, 6), basic(0xffb870), SKYL);
  const skyState = Array.from({ length: SKYL }, (_, i) => ({ x: (Math.sin(i * 12.9) * 0.5 + 0.5) * 30 - 15, z: -6 - ((i * 37) % 20), ph: i / SKYL, sp: 0.03 + (i % 5) * 0.006 }));

  // ── Moonbeam shafts (the spotlights) ────────────────────────────
  const cones = [], coneMats = [];
  const coneGeo = geo(new THREE.ConeGeometry(1.0, 9, 24, 1, true));
  coneGeo.translate(0, -4.5, 0);
  for (const [x, targetX] of [[-3.6, -1.6], [-1.2, -1.6], [1.2, 1.6], [3.6, 1.6]]) {
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = add(new THREE.Mesh(coneGeo, mat), x, 9.0, 1.0);
    coneMats.push(mat);
    cones.push({ cone, baseX: x, targetX, side: targetX < 0 ? 'player' : 'rival' });
  }

  // ── Serene audience on floating cushions ────────────────────────
  const spots = [];
  const addRow = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.2 + ((i * 7) % 5) * 0.08) / n, z: z + ((i * 3) % 4) * 0.14, y: y + ((i * 5) % 3) * 0.15 }); };
  const cs = low ? 0.6 : 1;
  addRow(Math.round(11 * cs), -6.4, 6.4, 6.0, -0.4);
  addRow(Math.round(13 * cs), -7.6, 7.6, 7.2, -0.2);
  addRow(Math.round(5 * cs), -9.6, -6.4, 1.8, -0.2);
  addRow(Math.round(5 * cs), 6.4, 9.6, 1.8, -0.2);
  const N = spots.length;
  const cush = inst(new THREE.CylinderGeometry(0.42, 0.38, 0.16, 10), toon(0xffffff), N);
  const body = inst(new THREE.ConeGeometry(0.34, 0.75, 8), toon(0xffffff), N);
  const headM = inst(new THREE.SphereGeometry(0.18, 8, 6), toon(0xffffff), N);
  const armM = inst(new THREE.CapsuleGeometry(0.05, 0.42, 1, 4), toon(0xffffff), N * 2);
  const robes = [0xc89bff, 0xff9ed8, 0x8fd8ff, 0xffd8a0, 0xa0ffd8];
  const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x6a4028];
  spots.forEach((c, i) => {
    c.ph = (i * 2.399) % (Math.PI * 2);
    cush.setColorAt(i, col.set(PALETTE[(i + 2) % PALETTE.length]).multiplyScalar(0.8));
    body.setColorAt(i, col.set(robes[i % robes.length]));
    headM.setColorAt(i, col.set(skins[i % skins.length]));
    armM.setColorAt(i * 2, col.set(skins[i % skins.length])); armM.setColorAt(i * 2 + 1, col.set(skins[i % skins.length]));
  });

  // ── Petals ──────────────────────────────────────────────────────
  const PET = low ? 150 : 320;
  const petPos = new Float32Array(PET * 3), petSeed = new Float32Array(PET);
  for (let i = 0; i < PET; i++) { petPos[i * 3] = (Math.random() - 0.5) * 26; petPos[i * 3 + 1] = Math.random() * 12; petPos[i * 3 + 2] = -12 + Math.random() * 18; petSeed[i] = Math.random() * 10; }
  const petGeo = geo(new THREE.BufferGeometry()); petGeo.setAttribute('position', new THREE.BufferAttribute(petPos, 3));
  const petTex = keep(canvasTex(32, 32, (g) => { g.fillStyle = '#ffc0e0'; g.beginPath(); g.ellipse(16, 16, 12, 7, 0.6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff90c8'; g.beginPath(); g.ellipse(18, 17, 5, 3, 0.6, 0, Math.PI * 2); g.fill(); }));
  const petMat = keep(new THREE.PointsMaterial({ size: 0.16, map: petTex, transparent: true, depthWrite: false, alphaTest: 0.2 }));
  const petals = new THREE.Points(petGeo, petMat); petals.frustumCulled = false; group.add(petals);
  let petBoost = 0;

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffd8f0, 0x5a3a8a, 1.0);
  const key = new THREE.DirectionalLight(0xffe2d0, 1.15); key.position.set(3, 7, 6);
  const rimL = new THREE.PointLight(0xff7ac8, 16, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0x7ad8ff, 16, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const glow = new THREE.PointLight(0xffc890, 10, 14, 1.5); glow.position.set(0, 3, -5);
  group.add(hemi, key, rimL, rimR, glow);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, glow: glow.intensity };

  // ── State + update ──────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, focus: 0, lastBeat: -1, barColor: 0, solo: null };

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 4), whole = Math.floor(beat);
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 1.5);
    state.cheer = Math.max(0, state.cheer - dt * 0.4);
    petBoost = Math.max(0, petBoost - dt * 0.4);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.5)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.6));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    if (whole !== state.lastBeat) {
      state.lastBeat = whole;
      if (whole % 4 === 0) state.barColor = (state.barColor + 1) % PALETTE.length;
      // A ripple ring spreads across the sand on every beat (from the
      // soloist during a solo).
      spawnRipple(songTime, soloK > 0.2 ? soloX : 0, soloK > 0.2 ? 0.2 : 0, false);
    }
    ripples.forEach((r, i) => {
      const age = songTime - r.t0, life = r.big ? 3.2 : 2.6;
      if (age < 0 || age > life) { r.m.material.opacity = 0; return; }
      const u = age / life, rad = 0.4 + u * (r.big ? 5.5 : 4.4);
      r.m.position.set(r.x, 0.02 + i * 0.002, r.z);
      r.m.scale.set(rad, rad, 1);
      r.m.material.color.set(PALETTE[(state.barColor + i) % PALETTE.length]);
      r.m.material.opacity = (1 - u) * (r.big ? 0.8 : 0.5) * L;
    });
    runeMat.opacity = (0.35 + 0.5 * onBeat + state.flash * 0.3) * L;
    runeMat.color.set(PALETTE[(state.barColor + 1) % PALETTE.length]);
    runeTex.offset.x += dt * 0.02;
    lanterns.forEach((l, i) => l.material.color.setRGB(1, 0.85 + 0.1 * Math.sin(songTime * 3 + i), 0.62).multiplyScalar(0.6 + 0.4 * L + 0.2 * onBeat));
    auroraMat.uniforms.uT.value = songTime;
    auroraMat.uniforms.uK.value = (0.7 + 0.3 * onBeat + state.flash) * Math.max(0.3, L);
    sky.material.uniforms.uPulse.value = onBeat * 0.3 * L + state.flash * 0.6;
    starMat.opacity = 0.6 + 0.4 * Math.sin(songTime * 1.3);
    waterTex.offset.x += dt * 0.03; waterTex.offset.y += dt * 0.015;
    cloudTex.offset.x += dt * 0.006;

    // Koi circle the pond.
    for (let i = 0; i < KOI; i++) {
      const r = 0.8 + (i % 3) * 0.6, dir = i % 2 ? -1 : 1, a = songTime * (0.35 + (i % 2) * 0.12) * dir + i * 0.9;
      const wig = Math.sin(songTime * 6 + i) * 0.3, heading = dir > 0 ? -a : Math.PI - a;
      dummy.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r); dummy.rotation.set(0, heading, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      dummy.matrix.multiply(tipX); koiBody.setMatrixAt(i, dummy.matrix);
      const at = a - dir * 0.3;
      dummy.position.set(Math.cos(at) * r, 0.3, Math.sin(at) * r); dummy.rotation.set(0, heading + wig, 0); dummy.updateMatrix();
      dummy.matrix.multiply(tipX); koiTail.setMatrixAt(i, dummy.matrix);
    }
    koiBody.instanceMatrix.needsUpdate = koiTail.instanceMatrix.needsUpdate = true;
    updateBlossoms(songTime);
    floaters.forEach((f) => { f.r.position.y = f.y + Math.sin(songTime * 0.5 + f.ph) * 0.25; f.r.rotation.y += dt * 0.05; });
    trees.forEach((tr, i) => { if (i >= 2) tr.t.position.y = floaters[i - 2].r.position.y + 0.6; tr.y = tr.t.position.y; });

    // Sky lanterns drift up, loop.
    skyState.forEach((s, i) => {
      const u = ((songTime * s.sp + s.ph) % 1 + 1) % 1;
      dummy.position.set(s.x + Math.sin(songTime * 0.3 + i) * 0.6, -6 + u * 24, s.z); dummy.rotation.set(0, i, 0);
      dummy.scale.setScalar(u < 0.05 ? u / 0.05 : u > 0.92 ? (1 - u) / 0.08 : 1); dummy.updateMatrix();
      skyLan.setMatrixAt(i, dummy.matrix);
    });
    skyLan.instanceMatrix.needsUpdate = true;

    // Petals drift down and sideways, looping (faster after big moves).
    const fall = 0.35 + petBoost * 1.5;
    for (let i = 0; i < PET; i++) {
      petPos[i * 3 + 1] -= fall * dt * (0.6 + 0.4 * Math.sin(petSeed[i]));
      petPos[i * 3] += (0.25 + Math.sin(songTime * 0.7 + petSeed[i]) * 0.3) * dt;
      if (petPos[i * 3 + 1] < -2) { petPos[i * 3 + 1] = 11 + Math.random(); petPos[i * 3] = (Math.random() - 0.5) * 26; }
      if (petPos[i * 3] > 14) petPos[i * 3] -= 28;
    }
    petGeo.attributes.position.needsUpdate = true;

    // Audience: float and sway, palms rising slowly on the beat when hyped.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3);
    spots.forEach((c, i) => {
      const bob = Math.sin(songTime * 1.2 + c.ph) * 0.12, sway = Math.sin(beat * Math.PI / 2 + c.ph * 0.2) * 0.12 * L;
      const yaw = Math.atan2(-c.x, -c.z + 8) * 0.35, y = c.y + bob;
      dummy.rotation.set(0, yaw, 0); dummy.scale.setScalar(1);
      dummy.position.set(c.x, y, c.z); dummy.updateMatrix(); cush.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, yaw, sway);
      dummy.position.set(c.x, y + 0.45, c.z); dummy.updateMatrix(); body.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x - sway * 0.8, y + 0.95, c.z); dummy.updateMatrix(); headM.setMatrixAt(i, dummy.matrix);
      const up = 0.6 + (hype > 0.55 ? 1.6 : 0.4) * (0.5 + 0.5 * Math.sin(beat * Math.PI * 0.5 + c.ph));
      for (const sd of [-1, 1]) {
        dummy.position.set(c.x + sd * 0.22 * Math.cos(yaw), y + 0.62, c.z - sd * 0.22 * Math.sin(yaw));
        dummy.rotation.set(0, yaw, sd * up); dummy.updateMatrix();
        armM.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
    });
    cush.instanceMatrix.needsUpdate = body.instanceMatrix.needsUpdate = headM.instanceMatrix.needsUpdate = armM.instanceMatrix.needsUpdate = true;

    // Moonbeams.
    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.5 + i * 1.7) * 0.3;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 9.0); c.cone.rotation.x = -0.08;
      coneMats[i].color.set(PALETTE[(state.barColor + i) % PALETTE.length]);
      coneMats[i].opacity = (0.02 + 0.02 * onBeat + 0.03 * lead + 0.03 * state.flash) * L * (1 - 0.4 * soloK) + 0.025 * soloK * L;
    });

    // Lights.
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.75 + 0.4 * onBeat + 0.5 * Math.max(0, state.focus)) * (1 + 0.7 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.75 + 0.4 * onBeat + 0.5 * Math.max(0, -state.focus)) * (1 + 0.7 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    glow.intensity = base.glow * L * (0.8 + 0.3 * onBeat + state.flash) * (1 - 0.5 * soloK);
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { spawnRipple(data.songTime, x, 0.2, true); state.cheer = Math.min(1, state.cheer + 0.35); }
        if (data.tier >= 4) { state.flash = 0.5; petBoost = 1; }
        break;
      case 'tauntLanded': state.flash = 0.8; state.cheer = 1; petBoost = 1; break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.4; break;
      case 'taunt': state.flash = 0.3; break;
      case 'end': state.cheer = 1; state.flash = 1; petBoost = 1; break;
      case 'drop': state.flash = 0.8; petBoost = 0.6; break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.6; state.cheer = 1; petBoost = 1;
        spawnRipple(data.songTime, x, 0.2, true);
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
      for (const m of instanced) m.dispose();
      group.removeFromParent();
    },
  };
}
