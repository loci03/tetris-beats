// HIGHER — Skye's city rooftop at night in an ember-orange haze.
//
// A tar-and-gravel rooftop with a light-up dance floor, Skye's DJ booth
// with pumping speakers under a neon "HIGHER" sign, a wooden water tower,
// AC units and a blinking antenna, string lights, a neon skyline all round
// with lit windows, drifting haze banks and rising embers, and a rooftop
// crowd nodding along with phone lights up. Everything breathes on the
// music clock.

import * as THREE from '../../../vendor/three/three.module.min.js';

const PALETTE = [0xff8a3a, 0x7fff00, 0xff3d9a, 0x3dd8ff, 0xffd23a, 0xb35cff];

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
  const instanced = [];
  const inst = (g, mat, n) => { const m = new THREE.InstancedMesh(geo(g), mat, n); instanced.push(m); group.add(m); return m; };
  const low = lowGraphics;

  // ── Night sky with an ember glow on the horizon ─────────────────
  const sky = add(new THREE.Mesh(geo(new THREE.SphereGeometry(90, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.03,0.02,0.08), mid = vec3(0.16,0.06,0.16), hor = vec3(0.85,0.36,0.14);
        vec3 c = h > 0.06 ? mix(mid, top, smoothstep(0.06, 0.6, h)) : mix(hor, mid, smoothstep(-0.08, 0.06, h));
        c += vec3(0.25,0.1,0.02) * uPulse * smoothstep(0.3, 0.0, abs(h - 0.02));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }))));
  const STARS = low ? 80 : 160, sp = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) { const a = Math.random() * Math.PI * 2, y = 0.35 + Math.random() * 0.6, r = 85; sp[i * 3] = Math.cos(a) * r * Math.sqrt(1 - y * y); sp[i * 3 + 1] = y * r; sp[i * 3 + 2] = Math.sin(a) * r * Math.sqrt(1 - y * y); }
  const starGeo = geo(new THREE.BufferGeometry()); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  group.add(new THREE.Points(starGeo, keep(new THREE.PointsMaterial({ color: 0xffe8d0, size: 0.28, fog: false }))));
  const moonTex = keep(canvasTex(256, 256, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.15, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,236,210,1)'); gr.addColorStop(0.3, 'rgba(255,220,180,1)'); gr.addColorStop(0.34, 'rgba(255,170,90,0.35)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }));
  add(new THREE.Mesh(geo(new THREE.PlaneGeometry(14, 14)), basic(0xffffff, { map: moonTex, transparent: true, depthWrite: false, fog: false })), 20, 24, -64);

  // ── Neon skyline: instanced towers with lit windows ─────────────
  const winTex = keep(canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#14101c'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 4; y += 12) for (let x = 6; x < w - 4; x += 12) {
      const r = ((x * 7 + y * 13) % 17) / 17;
      g.fillStyle = r > 0.62 ? (r > 0.9 ? '#ffb070' : '#ffe0a0') : r > 0.5 ? '#5a3a6a' : '#221a2c';
      g.fillRect(x, y, 6, 7);
    }
  }));
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const towerMat = basic(0xffffff, { map: winTex });
  const towers = [];
  for (let i = 0; i < (low ? 26 : 40); i++) {
    const a = -Math.PI * 0.95 + (i / (low ? 26 : 40)) * Math.PI * 1.9 + Math.sin(i * 3.7) * 0.03;
    const r = 34 + (i * 37 % 11) * 1.6, h = 10 + (i * 53 % 13) * 2.4, w = 4 + (i * 29 % 4);
    towers.push({ x: Math.sin(a) * r, z: -Math.cos(a) * r, h, w, a });
  }
  const towerMesh = inst(new THREE.BoxGeometry(1, 1, 1), towerMat, towers.length);
  towers.forEach((t, i) => { dummy.position.set(t.x, t.h / 2 - 12, t.z); dummy.rotation.set(0, -t.a, 0); dummy.scale.set(t.w, t.h, t.w); dummy.updateMatrix(); towerMesh.setMatrixAt(i, dummy.matrix); });
  // Neon rooftop strips on some towers.
  const neonMesh = inst(new THREE.BoxGeometry(1, 0.25, 0.08), basic(0xffffff), towers.length);
  towers.forEach((t, i) => {
    dummy.position.set(t.x * 0.985, t.h - 12 - 0.6, t.z * 0.985); dummy.rotation.set(0, -t.a, 0); dummy.scale.set(t.w * 0.9, 1, 1); dummy.updateMatrix();
    neonMesh.setMatrixAt(i, dummy.matrix); neonMesh.setColorAt(i, col.set(PALETTE[i % PALETTE.length]));
  });

  // ── The rooftop: gravel, parapet, dance floor ───────────────────
  const roofTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3238'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const v = 70 + (i * 37 % 60); g.fillStyle = `rgba(${v},${v - 8},${v - 4},0.6)`; g.fillRect((i * 97) % w, (i * 61) % h, 2, 2); }
    g.strokeStyle = 'rgba(20,16,20,0.6)'; g.lineWidth = 3;
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }));
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping; roofTex.repeat.set(8, 8);
  const roof = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(36, 30)), toon(0xffffff, { map: roofTex })), 0, -0.01, 3);
  roof.rotation.x = -Math.PI / 2;
  const parMat = toon(0x5a4a50), capMat = toon(0x8a7a7a);
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(36, 1.1, 0.5)), parMat), 0, 0.55, -12);
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(36.4, 0.15, 0.7)), capMat), 0, 1.15, -12);
  for (const sx of [-1, 1]) {
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.5, 1.1, 30)), parMat), sx * 18, 0.55, 3);
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.7, 0.15, 30)), capMat), sx * 18, 1.15, 3);
  }
  // The building drops away below the parapet.
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(36, 30, 30)), toon(0x2a2228)), 0, -15.1, 3);
  const tileSize = 0.64, tiles = [];
  for (let ix = -7; ix <= 7; ix++) for (let iz = -6; iz <= 6; iz++) {
    const x = ix * tileSize, z = iz * tileSize;
    if (Math.hypot(x, z) <= 4.4) tiles.push({ x, z, ix, iz, r: Math.hypot(x, z) });
  }
  const tileMesh = inst(new THREE.BoxGeometry(tileSize * 0.94, 0.05, tileSize * 0.94), basic(0xffffff), tiles.length);
  tiles.forEach((t, i) => { m4.makeTranslation(t.x, 0.0, t.z); tileMesh.setMatrixAt(i, m4); tileMesh.setColorAt(i, col.set(0x18101a)); });
  const ring = add(new THREE.Mesh(geo(new THREE.TorusGeometry(4.6, 0.06, 6, 96)), basic(0xff8a3a)), 0, 0.03, 0);
  ring.rotation.x = Math.PI / 2;

  // ── DJ booth, speakers, neon sign ───────────────────────────────
  const booth = add(new THREE.Group(), 0, 0, -6.0);
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(3.2, 1.05, 1.0)), toon(0x1c1820)), 0, 0.53, 0, booth);
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(3.3, 0.06, 1.1)), basic(0x7fff00)), 0, 1.07, 0, booth);
  const boothFront = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(3.0, 0.7)), basic(0xffffff)), 0, 0.5, 0.51, booth);
  const decks = [];
  for (const sx of [-1, 1]) {
    const d = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 20)), toon(0x101014)), sx * 0.8, 1.12, 0.05, booth);
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.02, 0.3)), basic(0xff8a3a)), 0, 0.03, 0.12, d);
    decks.push(d);
  }
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.5, 0.06, 0.4)), toon(0x2a2a30)), 0, 1.12, 0.05, booth);
  const laptop = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(0.5, 0.32)), basic(0x9affd0)), 0.0, 1.3, -0.25, booth);
  laptop.rotation.x = -0.25;
  const woofers = [];
  for (const sx of [-1, 1]) {
    const st = add(new THREE.Group(), sx * 2.6, 0, -6.1);
    for (let k = 0; k < 2; k++) {
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(1.1, 1.1, 0.9)), toon(0x15121a)), 0, 0.55 + k * 1.12, 0, st);
      const wf = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 20)), toon(0x34343e)), 0, 0.55 + k * 1.12, 0.47, st);
      wf.rotation.x = Math.PI / 2;
      const rg = add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.4, 0.035, 5, 20)), basic(0xff8a3a)), 0, 0.55 + k * 1.12, 0.5, st);
      woofers.push({ wf, rg, k });
    }
    st.rotation.y = -sx * 0.25;
  }
  const signTex = keep(canvasTex(512, 160, (g, w, h) => {
    g.font = '900 120px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(1, (w - 40) / g.measureText('HIGHER').width);
    g.translate(w / 2, h / 2 + 6); g.scale(fit, 1);
    g.shadowColor = '#ff7a2a'; g.shadowBlur = 34; g.lineWidth = 12; g.strokeStyle = '#ff9a4a'; g.strokeText('HIGHER', 0, 0);
    g.shadowColor = '#ffd0a0'; g.shadowBlur = 16; g.fillStyle = '#fff2e2'; g.fillText('HIGHER', 0, 0);
  }));
  const sign = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(7.5, 2.35)), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false })), 0, 4.6, -6.4);
  for (const sx of [-1, 1]) add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6)), toon(0x3a3a44)), sx * 3.2, 2.1, -6.5);
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(6.6, 0.08, 0.08)), toon(0x3a3a44)), 0, 3.4, -6.5);

  // ── Water tower, AC units, antenna ──────────────────────────────
  const wt = add(new THREE.Group(), 8.6, 1.15, -8.6);
  const woodMat = toon(0x8a5a3a), ironMat = toon(0x3a3438);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6)), ironMat), lx * 1.1, 1.7, lz * 1.1, wt);
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.7, 1.7, 0.15, 16)), ironMat), 0, 3.45, 0, wt);
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(1.6, 1.6, 3.0, 20)), woodMat), 0, 5.0, 0, wt);
  for (let k = 0; k < 3; k++) add(new THREE.Mesh(geo(new THREE.TorusGeometry(1.62, 0.04, 4, 24)), ironMat), 0, 3.9 + k * 1.1, 0, wt).rotation.x = Math.PI / 2;
  add(new THREE.Mesh(geo(new THREE.ConeGeometry(1.8, 1.2, 20)), toon(0x5a3a2a)), 0, 7.1, 0, wt);
  const ac = toon(0x9a9aa4);
  for (const [x, z] of [[-8.5, -7.5], [-10.4, -6.8], [9.6, -3.6]]) {
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(1.5, 1.0, 1.2)), ac), x, 0.5, z);
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14)), toon(0x2a2a30)), x, 1.02, z);
  }
  const fans = [];
  for (const [x, z] of [[-8.5, -7.5], [-10.4, -6.8], [9.6, -3.6]]) {
    const f = add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.75, 0.02, 0.1)), toon(0x5a5a64)), x, 1.06, z);
    fans.push(f);
  }
  add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.04, 0.06, 6, 6)), ironMat), -6.6, 3.0, -10);
  const blink = add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.12, 8, 6)), basic(0xff2020)), -6.6, 6.1, -10);

  // ── String lights ───────────────────────────────────────────────
  const bulbSpots = [];
  const strand = (a, b, sag, n) => { for (let i = 0; i <= n; i++) { const u = i / n; bulbSpots.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u - Math.sin(Math.PI * u) * sag, z: a[2] + (b[2] - a[2]) * u }); } };
  strand([-9, 5.4, -6], [9, 5.6, -6.5], 1.2, 26);
  strand([-9, 5.2, -6], [-6, 4.8, 4], 0.8, 12);
  strand([9, 5.4, -6.5], [6, 4.8, 4], 0.8, 12);
  for (const [x, z] of [[-9, -6], [9, -6.5], [-6, 4], [6, 4]]) add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.06, 5.4, 6)), ironMat), x, 2.7, z);
  const bulbs = inst(new THREE.SphereGeometry(0.075, 6, 4), basic(0xffffff), bulbSpots.length);
  bulbSpots.forEach((b, i) => { m4.makeTranslation(b.x, b.y, b.z); bulbs.setMatrixAt(i, m4); });

  // ── Spot cones from a light truss ───────────────────────────────
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(12, 0.2, 0.2)), toon(0x2a2a34)), 0, 7.2, 1.2);
  const cones = [], coneMats = [];
  const coneGeo = geo(new THREE.ConeGeometry(0.95, 7.3, 24, 1, true)); coneGeo.translate(0, -3.65, 0);
  for (const [x, targetX] of [[-3.6, -1.6], [-1.2, -1.6], [1.2, 1.6], [3.6, 1.6]]) {
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.2, 0.28, 0.4, 12)), toon(0x151520)), x, 7.0, 1.2);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = add(new THREE.Mesh(coneGeo, mat), x, 7.0, 1.2);
    coneMats.push(mat); cones.push({ cone, baseX: x, targetX, side: targetX < 0 ? 'player' : 'rival' });
  }

  // ── Haze banks + embers ─────────────────────────────────────────
  const hazeTex = keep(canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = 20 + (i * 53) % (w - 40), y = 30 + (i * 29) % (h - 60), r = 26 + (i % 5) * 9;
      const gr = g.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, 'rgba(255,170,110,0.32)'); gr.addColorStop(1, 'rgba(255,140,80,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }));
  const hazes = [];
  for (let i = 0; i < (low ? 4 : 7); i++) {
    const m = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(14, 5)), keep(new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, depthWrite: false, opacity: 0.5, fog: false }))), 0, 0, 0);
    hazes.push({ m, x0: -14 + i * 4.7, y: 1.4 + (i % 3) * 1.5, z: -10.5 + (i % 4) * 1.4, sp: 0.25 + (i % 3) * 0.12, ph: i });
  }
  const EMB = low ? 120 : 260;
  const embPos = new Float32Array(EMB * 3), embSeed = new Float32Array(EMB);
  for (let i = 0; i < EMB; i++) { embPos[i * 3] = (Math.random() - 0.5) * 24; embPos[i * 3 + 1] = Math.random() * 9; embPos[i * 3 + 2] = -10 + Math.random() * 14; embSeed[i] = Math.random() * 10; }
  const embGeo = geo(new THREE.BufferGeometry()); embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  const embMat = keep(new THREE.PointsMaterial({ color: 0xffa040, size: 0.09, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const embers = new THREE.Points(embGeo, embMat); embers.frustumCulled = false; group.add(embers);
  let emberBoost = 0;

  // ── Crowd with phone lights ─────────────────────────────────────
  const spots = [];
  const addRow = (n, x0, x1, z) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.2 + ((i * 7) % 5) * 0.08) / n, z: z + ((i * 3) % 4) * 0.14 }); };
  const cs = low ? 0.6 : 1;
  addRow(Math.round(13 * cs), -6.6, 6.6, 5.8);
  addRow(Math.round(15 * cs), -7.6, 7.6, 6.9);
  addRow(Math.round(6 * cs), -9.4, -6.0, 1.8);
  addRow(Math.round(6 * cs), 6.0, 9.4, 1.8);
  addRow(Math.round(5 * cs), -9.8, -6.8, -2.2);
  addRow(Math.round(5 * cs), 6.8, 9.8, -2.2);
  const N = spots.length;
  const cBody = inst(new THREE.CapsuleGeometry(0.27, 0.6, 2, 7), toon(0xffffff), N);
  const cHead = inst(new THREE.SphereGeometry(0.2, 9, 6), toon(0xffffff), N);
  const cHat = inst(new THREE.CylinderGeometry(0.17, 0.24, 0.12, 8), toon(0xffffff), N);
  const cArm = inst(new THREE.CapsuleGeometry(0.065, 0.5, 1, 4), toon(0xffffff), N * 2);
  const cPhone = inst(new THREE.BoxGeometry(0.1, 0.17, 0.02), basic(0xd8f0ff), N);
  const hoods = [0x3a3a48, 0x6a2a3a, 0x2a4a3a, 0xf08a3a, 0x4a3a6a, 0x8a8a90, 0x2a2a2a];
  const skins = [0x4a2a18, 0x8d5524, 0xc68642, 0xe0ac69, 0x6a4028];
  spots.forEach((c, i) => {
    c.ph = (i * 2.399) % (Math.PI * 2); c.hype = 0.6 + ((i * 13) % 7) / 10; c.phone = i % 3 === 1; c.hat = i % 4 === 0;
    cBody.setColorAt(i, col.set(hoods[i % hoods.length]));
    cHead.setColorAt(i, col.set(skins[i % skins.length]));
    cHat.setColorAt(i, col.set(PALETTE[(i * 3) % PALETTE.length]).multiplyScalar(0.7));
    cArm.setColorAt(i * 2, col.set(hoods[i % hoods.length])); cArm.setColorAt(i * 2 + 1, col.set(hoods[i % hoods.length]));
  });

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffc8a0, 0x2a1a2a, 1.1);
  const key = new THREE.DirectionalLight(0xd8dcff, 1.3); key.position.set(-2, 7, 6);
  const rimL = new THREE.PointLight(0xff7a2a, 18, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0x7fff40, 14, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const boothGlow = new THREE.PointLight(0xff4a9a, 12, 12, 1.5); boothGlow.position.set(0, 2.6, -4.6);
  group.add(hemi, key, rimL, rimR, boothGlow);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, booth: boothGlow.intensity };

  // ── State + update ──────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, ripple: null, focus: 0, lastBeat: -1, barColor: 0, solo: null };
  const cA = new THREE.Color(), cB = new THREE.Color(), dim = new THREE.Color(0x140c14), warm = new THREE.Color(0xffd8a0);

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 5), whole = Math.floor(beat);
    const pulse = Math.exp(-(((beat * 2) % 1 + 1) % 1) * 6);          // the 150 pulse
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 2);
    state.cheer = Math.max(0, state.cheer - dt * 0.5);
    emberBoost = Math.max(0, emberBoost - dt * 0.5);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    if (whole !== state.lastBeat) { state.lastBeat = whole; if (whole % 4 === 0) state.barColor = (state.barColor + 1) % PALETTE.length; }

    // Floor: slow rings rolling outward from the centre, warm on the pulse.
    cA.set(PALETTE[state.barColor]); cB.set(PALETTE[(state.barColor + 1) % PALETTE.length]);
    tiles.forEach((t, i) => {
      const wave = 0.5 + 0.5 * Math.cos(t.r * 1.6 - beat * Math.PI);
      let k = (0.1 + 0.45 * Math.pow(wave, 3) + 0.15 * pulse) * L;
      if (state.ripple) {
        const r = (songTime - state.ripple.t) * 7, d = Math.hypot(t.x - state.ripple.x, t.z);
        k = Math.max(k, Math.exp(-Math.pow((d - r) * 1.8, 2)) * (1 - Math.min(1, r / 10)) * L);
      }
      if (soloK > 0) {
        const near = Math.exp(-Math.pow(Math.hypot(t.x - soloX, t.z) / 1.3, 2));
        k = k * (1 - 0.75 * soloK) + soloK * near * (0.6 + 0.4 * onBeat);
      }
      col.copy(dim).lerp(wave > 0.5 ? cA : cB, Math.min(1, k)).multiplyScalar(0.6 + 0.8 * k + state.flash * 0.4);
      tileMesh.setColorAt(i, col);
    });
    tileMesh.instanceColor.needsUpdate = true;

    // Booth: woofers, decks, sign flicker, laptop glow.
    woofers.forEach((w) => { const s = 1 + (w.k === 0 ? 0.22 * onBeat : 0.12 * pulse) * L; w.wf.scale.set(s, 1, s); w.rg.scale.set(s, s, 1); w.rg.material.color.set(PALETTE[state.barColor]); });
    decks.forEach((d) => { d.rotation.y += dt * 3.2; });
    boothFront.material.color.set(PALETTE[(state.barColor + 2) % PALETTE.length]).multiplyScalar(0.35 + 0.4 * pulse * L);
    laptop.material.color.setHSL(0.42 + 0.05 * Math.sin(songTime), 0.8, 0.45 + 0.2 * onBeat);
    sign.material.opacity = L * (0.85 + 0.15 * onBeat) * ((Math.sin(songTime * 11) > 0.985 || Math.sin(songTime * 3.1) > 0.995) ? 0.35 : 1);
    blink.visible = (songTime % 1.6) < 0.25;
    fans.forEach((f, i) => { f.rotation.y += dt * (8 + i); });
    neonMesh.material.color.setScalar(0.7 + 0.3 * onBeat);
    bulbSpots.forEach((b, i) => {
      const on = ((i + whole) % 4 === 0) ? 1 : 0.45;
      bulbs.setColorAt(i, col.copy(warm).multiplyScalar((0.3 + 0.7 * on * (0.6 + 0.4 * onBeat)) * Math.max(0.15, L)));
    });
    bulbs.instanceColor.needsUpdate = true;
    sky.material.uniforms.uPulse.value = onBeat * 0.4 * L + state.flash;

    // Haze drifts, embers rise.
    hazes.forEach((h) => {
      const x = ((h.x0 + songTime * h.sp + 16) % 32 + 32) % 32 - 16;
      h.m.position.set(x, h.y + Math.sin(songTime * 0.3 + h.ph) * 0.3, h.z);
      h.m.material.opacity = (0.22 + 0.1 * Math.sin(songTime * 0.5 + h.ph) + 0.08 * onBeat) * Math.max(0.3, L);
    });
    const rise = 0.5 + emberBoost * 2;
    for (let i = 0; i < EMB; i++) {
      embPos[i * 3 + 1] += rise * dt * (0.5 + 0.5 * Math.sin(embSeed[i]));
      embPos[i * 3] += Math.sin(songTime * 0.8 + embSeed[i]) * 0.3 * dt;
      if (embPos[i * 3 + 1] > 9) { embPos[i * 3 + 1] = 0; embPos[i * 3] = (Math.random() - 0.5) * 24; }
    }
    embGeo.attributes.position.needsUpdate = true;
    embMat.opacity = 0.6 + 0.4 * pulse;

    // Crowd: lazy nod on the pulse, phones up, arms up when hyped.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3);
    spots.forEach((c, i) => {
      const nod = Math.pow(0.5 + 0.5 * Math.cos((beat * 2 - 0.08) * Math.PI * 2 + c.ph * 0.2), 2);
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.ph * 0.3)) * 0.25 * hype * c.hype * L;
      const yaw = Math.atan2(-c.x, -c.z + 8) * 0.3, lean = state.focus * 0.12 * Math.sign(-c.x || 1);
      const y = jump - 0.05 * nod;
      dummy.rotation.set(0.08 * nod, yaw, lean); dummy.scale.setScalar(1);
      dummy.position.set(c.x, y + 0.6, c.z); dummy.updateMatrix(); cBody.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x, y + 1.26, c.z + 0.05 * nod); dummy.updateMatrix(); cHead.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x, c.hat ? y + 1.43 : -50, c.z + 0.05 * nod); dummy.updateMatrix(); cHat.setMatrixAt(i, dummy.matrix);
      const wave = Math.sin(beat * Math.PI + c.ph);
      for (const sd of [-1, 1]) {
        const up = (c.phone && sd > 0) ? 2.7 : hype > 0.6 ? 2.5 + 0.3 * wave * sd : 0.35 + 0.15 * wave;
        dummy.position.set(c.x + sd * 0.28 * Math.cos(yaw), y + 0.9, c.z - sd * 0.28 * Math.sin(yaw));
        dummy.rotation.set(0, yaw, sd * up); dummy.updateMatrix();
        cArm.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
        if (sd > 0) {
          const hx = c.x + 0.28 * Math.cos(yaw) + 0.33 * Math.sin(up), hy = y + 0.9 - 0.33 * Math.cos(up);
          dummy.position.set(hx, c.phone ? hy + 0.1 : -50, c.z + 0.04); dummy.rotation.set(0, yaw + Math.PI, 0.2 * wave); dummy.updateMatrix();
          cPhone.setMatrixAt(i, dummy.matrix);
        }
      }
    });
    cBody.instanceMatrix.needsUpdate = cHead.instanceMatrix.needsUpdate = cHat.instanceMatrix.needsUpdate = true;
    cArm.instanceMatrix.needsUpdate = cPhone.instanceMatrix.needsUpdate = true;

    // Cones.
    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.7 + i * 1.7) * 0.25;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 7.0); c.cone.rotation.x = -0.12;
      coneMats[i].color.set(PALETTE[(state.barColor + i) % PALETTE.length]);
      coneMats[i].opacity = (0.03 + 0.04 * onBeat + 0.05 * lead + 0.08 * state.flash) * L * (1 - 0.35 * soloK) + 0.05 * soloK * L;
    });

    // Lights.
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.5 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.4 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.5 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.4 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    boothGlow.intensity = base.booth * L * (0.7 + 0.6 * pulse + state.flash) * (1 - 0.5 * soloK);
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); }
        if (data.tier >= 4) { state.flash = 0.6; emberBoost = 1; }
        break;
      case 'tauntLanded': state.flash = 1; state.cheer = 1; emberBoost = 1; break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5; break;
      case 'taunt': state.flash = 0.4; emberBoost = 0.6; break;
      case 'end': state.cheer = 1; state.flash = 1; emberBoost = 1; break;
      case 'drop': state.flash = 1; emberBoost = 1; break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; emberBoost = 1;
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
