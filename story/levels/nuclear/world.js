// NUCLEAR WASTE — a glowing toxic-waste junkyard at night.
//
// Rusted steel deck plates with green light bleeding through the seams,
// stacks of crushed cars, leaking radioactive barrels, bubbling ooze pools,
// a big sickly moon, police cars at the edges with red/blue light bars
// sweeping the yard, DO NOT CROSS tape, green fog rolling low, and a crowd
// of shambling zombie silhouettes reaching for the stage. Music-driven.

import * as THREE from '../../../vendor/three/three.module.min.js';

const TOX = 0x66ff33, RED = 0xff2a2a, BLUE = 0x2a6aff;

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
    const t = new THREE.DataTexture(new Uint8Array([80, 160, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const geo = (g) => keep(g);
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), dummy = new THREE.Object3D();

  // ── Sky + moon ──────────────────────────────────────────────────────
  const sky = new THREE.Mesh(geo(new THREE.SphereGeometry(85, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uPol: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse; uniform float uPol;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.02,0.04,0.03), mid = vec3(0.06,0.14,0.06), hor = vec3(0.22,0.42,0.12);
        vec3 c = h > 0.06 ? mix(mid, top, smoothstep(0.06, 0.6, h)) : mix(hor, mid, smoothstep(-0.04, 0.06, h));
        c += vec3(0.15,0.35,0.05) * uPulse * smoothstep(0.3, 0.0, abs(h - 0.03));
        vec3 pol = mix(vec3(0.6,0.05,0.05), vec3(0.05,0.12,0.7), step(0.0, vP.x));
        c += pol * uPol * 0.25 * smoothstep(0.25, 0.0, abs(h - 0.02));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  group.add(sky);
  const moonTex = keep(canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(230,255,190,1)'); gr.addColorStop(0.42, 'rgba(190,255,120,1)'); gr.addColorStop(0.5, 'rgba(120,255,60,0.45)'); gr.addColorStop(1, 'rgba(80,255,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,170,80,0.5)';
    for (const [x, y, r] of [[100, 110, 16], [150, 140, 22], [130, 90, 10], [95, 150, 9]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  }));
  const moon = new THREE.Mesh(geo(new THREE.PlaneGeometry(18, 18)), basic(0xffffff, { map: moonTex, transparent: true, depthWrite: false, fog: false }));
  moon.position.set(-14, 16, -66); group.add(moon);

  // ── Ground + steel deck plates (green seams) ────────────────────────
  const dirt = new THREE.Mesh(geo(new THREE.CircleGeometry(45, 32)), toon(0x22261a));
  dirt.rotation.x = -Math.PI / 2; dirt.position.y = -0.04; group.add(dirt);
  const seam = new THREE.Mesh(geo(new THREE.PlaneGeometry(13.2, 8.2)), basic(TOX));
  seam.rotation.x = -Math.PI / 2; seam.position.set(0, -0.055, 0.15); group.add(seam);
  const T = 0.94, plates = [];
  for (let ix = -6; ix <= 6; ix++) for (let iz = -4; iz <= 3; iz++) plates.push({ x: ix * 1.0, z: iz * 1.0 + 0.65, ix, iz });
  const plateMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(T, 0.08, T)), toon(0xffffff), plates.length);
  const rusts = [0x5a4a3a, 0x4a4238, 0x6a5038, 0x3e3c36];
  plates.forEach((q, i) => { dummy.position.set(q.x, -0.04, q.z); dummy.rotation.set(0, ((i * 37) % 5 - 2) * 0.01, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); plateMesh.setMatrixAt(i, dummy.matrix); plateMesh.setColorAt(i, col.set(rusts[(i * 7) % 4])); });
  group.add(plateMesh);
  const rivetMesh = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 6)), toon(0x8a8a80), plates.length);
  plates.forEach((q, i) => { m4.makeTranslation(q.x + 0.38, 0.01, q.z + 0.38); rivetMesh.setMatrixAt(i, m4); });
  group.add(rivetMesh);

  // ── Junk: crushed car stacks + tyres ────────────────────────────────
  const carCols = [0x6a2a2a, 0x2a4a6a, 0x5a5a2a, 0x3a5a3a, 0x6a4a2a, 0x4a3a5a];
  const junk = [];
  for (const [x, z, n, r] of [[-7.4, -6.2, 4, 0.3], [-4.8, -7.4, 3, -0.2], [5.2, -7.2, 4, 0.15], [7.8, -5.4, 3, -0.4], [0.6, -8.6, 2, 0.05], [-9.4, -2.6, 3, 1.3], [9.6, -1.8, 3, -1.2]]) {
    for (let k = 0; k < n; k++) junk.push([x + (k % 2) * 0.15, 0.32 + k * 0.6, z, r + (k % 2 ? 0.12 : -0.1)]);
  }
  const junkMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(2.6, 0.58, 1.3)), toon(0xffffff), junk.length);
  junk.forEach(([x, y, z, r], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0.04 * ((i % 3) - 1), r, 0.05 * ((i % 2) * 2 - 1)); dummy.scale.setScalar(1); dummy.updateMatrix(); junkMesh.setMatrixAt(i, dummy.matrix); junkMesh.setColorAt(i, col.set(carCols[i % carCols.length])); });
  group.add(junkMesh);
  const winMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(1.2, 0.22, 1.32)), toon(0x1a2620), junk.length);
  junk.forEach(([x, y, z, r], i) => { dummy.position.set(x, y + 0.12, z); dummy.rotation.set(0, r, 0); dummy.updateMatrix(); winMesh.setMatrixAt(i, dummy.matrix); });
  group.add(winMesh);
  const tyreMesh = new THREE.InstancedMesh(geo(new THREE.TorusGeometry(0.38, 0.15, 6, 12)), toon(0x141414), 8);
  [[-6.2, 2.6, 0], [-6.0, 2.7, 1], [6.4, 2.2, 0], [6.3, 2.3, 1], [6.5, 2.2, 2], [-3.2, -6.4, 0], [3.0, -6.6, 0], [3.1, -6.6, 1]].forEach(([x, z, k], i) => { dummy.position.set(x, 0.15 + k * 0.28, z); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.updateMatrix(); tyreMesh.setMatrixAt(i, dummy.matrix); });
  group.add(tyreMesh);

  // ── Toxic barrels (some tipped and leaking) ─────────────────────────
  const radTex = keep(canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#e8c020'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2a10'; g.fillRect(0, 6, w, 4); g.fillRect(0, h - 10, w, 4);
    for (const cx of [32, 96]) {
      g.beginPath(); g.arc(cx, h / 2, 5, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 - Math.PI / 2; g.beginPath(); g.moveTo(cx, h / 2); g.arc(cx, h / 2, 18, a - 0.5, a + 0.5); g.closePath(); g.fill(); }
      g.fillStyle = '#e8c020'; g.beginPath(); g.arc(cx, h / 2, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2a2a10'; g.beginPath(); g.arc(cx, h / 2, 4.5, 0, Math.PI * 2); g.fill();
    }
  }));
  const barrels = [[-5.4, -3.6, 0, 0], [-5.9, -3.0, 0, 0.6], [-4.9, -4.3, 0, 0.3], [5.6, -3.4, 0, 0], [6.2, -2.7, 0, 0.4], [-5.2, 3.0, 1, 0.8], [5.4, 3.2, 1, -1.9], [-2.6, -5.8, 0, 0], [2.4, -5.6, 1, 2.5], [8.2, 0.8, 0, 0], [-8.4, 0.6, 0, 0]];
  const barrelMesh = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.34, 0.34, 0.95, 14)), toon(0xffffff, { map: radTex }), barrels.length);
  barrels.forEach(([x, z, tip, r], i) => {
    dummy.position.set(x, tip ? 0.34 : 0.48, z); dummy.rotation.set(tip ? Math.PI / 2 : 0, r, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    barrelMesh.setMatrixAt(i, dummy.matrix);
  });
  group.add(barrelMesh);

  // ── Ooze pools (glowing, bubbling) ──────────────────────────────────
  const oozeMat = keep(new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uGlow: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vU; uniform float uT; uniform float uGlow;
      void main(){
        vec2 p = vU * 2.0 - 1.0; float r = length(p);
        float edge = smoothstep(1.0, 0.85, r + 0.06 * sin(atan(p.y, p.x) * 6.0 + uT));
        float sw = 0.5 + 0.5 * sin(r * 14.0 - uT * 3.0);
        vec3 c = mix(vec3(0.15,0.8,0.05), vec3(0.6,1.0,0.3), sw * 0.6) * (0.55 + 0.6 * uGlow);
        gl_FragColor = vec4(c, edge * 0.95);
      }`,
  }));
  const pools = [];
  for (const [x, z, r] of [[-5.3, 3.9, 0.9], [5.6, 4.1, 0.8], [-6.6, -1.6, 1.0], [6.8, -1.0, 0.9], [2.6, -6.6, 0.9], [-3.6, -6.8, 0.7], [0, -4.4, 1.3]]) {
    const pm = new THREE.Mesh(geo(new THREE.CircleGeometry(r, 24)), oozeMat);
    pm.rotation.x = -Math.PI / 2; pm.position.set(x, 0.02, z); group.add(pm);
    pools.push({ x, z, r });
  }
  const NBUB = lowGraphics ? 16 : 30;
  const bubMesh = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.08, 8, 6)), basic(0xaaff66), NBUB);
  const bubs = Array.from({ length: NBUB }, (_, i) => ({ pool: pools[i % pools.length], a: Math.random() * 6.28, rr: Math.random(), t: Math.random() * 2, sp: 0.6 + Math.random() * 0.8 }));
  group.add(bubMesh);

  // ── Police cars with light bars ─────────────────────────────────────
  const police = [];
  for (const sx of [-1, 1]) {
    const car = new THREE.Group(); car.position.set(sx * 8.2, 0, 3.4); car.rotation.y = sx * 1.0; group.add(car);
    const body = new THREE.Mesh(geo(new THREE.BoxGeometry(3.0, 0.6, 1.4)), toon(0x14141a)); body.position.y = 0.55; car.add(body);
    const door = new THREE.Mesh(geo(new THREE.BoxGeometry(1.2, 0.5, 1.42)), toon(0xf0f0f0)); door.position.set(0, 0.55, 0); car.add(door);
    const cab = new THREE.Mesh(geo(new THREE.BoxGeometry(1.5, 0.48, 1.3)), toon(0x14141a)); cab.position.set(-0.1, 1.08, 0); car.add(cab);
    const glass = new THREE.Mesh(geo(new THREE.BoxGeometry(1.52, 0.3, 1.32)), toon(0x2a3a4a)); glass.position.set(-0.1, 1.1, 0); car.add(glass);
    for (const wx of [-1, 1]) for (const wz of [-1, 1]) { const w = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10)), toon(0x101010)); w.rotation.x = Math.PI / 2; w.position.set(wx * 0.95, 0.3, wz * 0.7); car.add(w); }
    const lr = new THREE.Mesh(geo(new THREE.BoxGeometry(0.3, 0.14, 0.5)), basic(RED)); lr.position.set(-0.1, 1.4, 0.27); car.add(lr);
    const lb = new THREE.Mesh(geo(new THREE.BoxGeometry(0.3, 0.14, 0.5)), basic(BLUE)); lb.position.set(-0.1, 1.4, -0.27); car.add(lb);
    police.push({ car, lr, lb, sx });
  }
  // Rotating light beams from the bars.
  const beamTex = keep(canvasTex(64, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const beamGeo = geo(new THREE.PlaneGeometry(5, 0.7)); beamGeo.translate(2.5, 0, 0);
  const beams = [];
  for (const p of police) for (const [c, z] of [[RED, 0.27], [BLUE, -0.27]]) {
    const rot = new THREE.Group(); rot.position.set(-0.1, 1.45, z); p.car.add(rot);
    const m = basic(c, { map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const bm = new THREE.Mesh(beamGeo, m); rot.add(bm);
    beams.push({ rot, m, red: c === RED });
  }

  // ── DO NOT CROSS tape + fence ───────────────────────────────────────
  const tapeTex = keep(canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = '#ffd400'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111'; g.font = '900 15px "Arial Black", Impact, sans-serif'; g.textBaseline = 'middle';
    g.fillText('DO NOT CROSS', 8, h / 2 + 1); g.fillText('DO NOT CROSS', 136, h / 2 + 1);
  }));
  tapeTex.wrapS = THREE.RepeatWrapping; tapeTex.repeat.set(5, 1);
  const tapeMat = basic(0xffffff, { map: tapeTex, side: THREE.DoubleSide });
  const tapes = [];
  for (const [x0, z0, x1, z1, y] of [[-7, -4.6, 7, -4.6, 1.1], [-7.6, -4.2, -7.6, 3.2, 0.95], [7.6, -4.2, 7.6, 3.2, 0.95]]) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const t = new THREE.Mesh(geo(new THREE.PlaneGeometry(len, 0.18, 12, 1)), tapeMat);
    t.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); t.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    group.add(t); tapes.push(t);
  }
  const conePosts = new THREE.InstancedMesh(geo(new THREE.ConeGeometry(0.2, 0.6, 8)), toon(0xff6a1a), 6);
  [[-7, -4.6], [7, -4.6], [-7.6, -4.2], [7.6, -4.2], [-7.6, 3.2], [7.6, 3.2]].forEach(([x, z], i) => { m4.makeTranslation(x, 0.3, z); conePosts.setMatrixAt(i, m4); });
  group.add(conePosts);
  const fenceTex = keep(canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(150,170,140,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }));
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(30, 5);
  const fence = new THREE.Mesh(geo(new THREE.PlaneGeometry(28, 3)), basic(0xffffff, { map: fenceTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  fence.position.set(0, 1.5, -10.5); group.add(fence);

  // ── Spot cones (solo) from a rusty gantry ───────────────────────────
  const gantry = new THREE.Mesh(geo(new THREE.BoxGeometry(12, 0.22, 0.22)), toon(0x4a3a2a)); gantry.position.set(0, 6.6, 1.0); group.add(gantry);
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(geo(new THREE.BoxGeometry(0.22, 6.6, 0.22)), toon(0x4a3a2a)); leg.position.set(sx * 6, 3.3, 1.0); group.add(leg); }
  const hazard = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.6, 2.6)), basic(0xffffff, { map: keep(canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e8c020'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1a10'; g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 - Math.PI / 2; g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 52, a - 0.52, a + 0.52); g.closePath(); g.fill(); }
    g.fillStyle = '#e8c020'; g.beginPath(); g.arc(64, 64, 15, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1a1a10'; g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill();
  })), transparent: true }));
  hazard.position.set(0, 5.0, -10.4); group.add(hazard);
  const cones = [], coneMats = [];
  const coneGeo = geo(new THREE.ConeGeometry(0.9, 6.6, 18, 1, true)); coneGeo.translate(0, -3.3, 0);
  for (const [x, tx] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    const fix = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.18, 0.26, 0.34, 10)), toon(0x151515)); fix.position.set(x, 6.4, 1.0); group.add(fix);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = new THREE.Mesh(coneGeo, mat); cone.position.copy(fix.position); group.add(cone);
    cones.push({ cone, baseX: x, targetX: tx, side: tx < 0 ? 'player' : 'rival' }); coneMats.push(mat);
  }

  // ── Zombie crowd (reaching, swaying, heads lolling) ─────────────────
  const crowd = [];
  const addRow = (n, x0, x1, z, y, jit = 0.4) => { for (let i = 0; i < n; i++) crowd.push({ x: x0 + (x1 - x0) * (i + Math.random() * jit) / n, z: z + Math.random() * 0.4, y }); };
  const cs = lowGraphics ? 0.6 : 1;
  addRow(Math.round(14 * cs), -6.8, 6.8, 5.2, -0.62);
  addRow(Math.round(16 * cs), -7.6, 7.6, 6.3, -0.5);
  addRow(Math.round(12 * cs), -8, 8, -9.6, 0.0, 0.7);
  const nCrowd = crowd.length;
  const rags = [0x3a4a3a, 0x4a3a4a, 0x3a3a50, 0x504a3a, 0x2a3a2a];
  const zskin = [0x7aa85a, 0x8ab86a, 0x6a9a5a, 0x9ab87a, 0x7a9a7a];
  const bodyMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.26, 0.55, 3, 8)), toon(0xffffff), nCrowd);
  const headMesh = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.2, 10, 8)), toon(0xffffff), nCrowd);
  const armMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6)), toon(0xffffff), nCrowd * 2);
  const eyeMesh = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.045, 6, 4)), basic(0xd8ff60), nCrowd * 2);
  crowd.forEach((c, i) => {
    c.phase = Math.random() * Math.PI * 2; c.hype = 0.6 + Math.random() * 0.6; c.tilt = (Math.random() - 0.5) * 0.6;
    bodyMesh.setColorAt(i, col.set(rags[i % rags.length]));
    headMesh.setColorAt(i, col.set(zskin[i % zskin.length]));
    armMesh.setColorAt(i * 2, col.set(zskin[i % zskin.length])); armMesh.setColorAt(i * 2 + 1, col.set(zskin[i % zskin.length]));
  });
  group.add(bodyMesh, headMesh, armMesh, eyeMesh);

  // ── Green fog + toxic sparks ────────────────────────────────────────
  const puffTex = keep(canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(160,255,120,0.5)'); gr.addColorStop(1, 'rgba(160,255,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const NF = lowGraphics ? 50 : 100;
  const fPos = new Float32Array(NF * 3), fVel = new Float32Array(NF * 3);
  for (let i = 0; i < NF; i++) { fPos[i * 3] = (Math.random() - 0.5) * 24; fPos[i * 3 + 1] = Math.random() * 0.7; fPos[i * 3 + 2] = -10 + Math.random() * 14; fVel[i * 3] = 0.15 + Math.random() * 0.2; }
  const fGeo = geo(new THREE.BufferGeometry()); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const fog = new THREE.Points(fGeo, keep(new THREE.PointsMaterial({ size: 2.6, map: puffTex, transparent: true, depthWrite: false, color: 0x7aff5a, opacity: 0.35 })));
  fog.frustumCulled = false; group.add(fog);
  const NS = lowGraphics ? 120 : 240;
  const sPos = new Float32Array(NS * 3), sVel = new Float32Array(NS * 3), sLife = new Float32Array(NS);
  for (let i = 0; i < NS; i++) sPos[i * 3 + 1] = -50;
  const sGeo = geo(new THREE.BufferGeometry()); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sparks = new THREE.Points(sGeo, keep(new THREE.PointsMaterial({ size: 0.12, color: 0xa8ff50, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
  sparks.frustumCulled = false; group.add(sparks);
  let sCur = 0;
  function splash(n, x, z = 0.3, up = 1) {
    for (let k = 0; k < n; k++) { const i = sCur = (sCur + 1) % NS; sPos[i * 3] = x + (Math.random() - 0.5) * 0.8; sPos[i * 3 + 1] = 0.1; sPos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.8; sVel[i * 3] = (Math.random() - 0.5) * 3; sVel[i * 3 + 1] = (2.5 + Math.random() * 3) * up; sVel[i * 3 + 2] = (Math.random() - 0.5) * 2; sLife[i] = 1.6 + Math.random(); }
  }

  // ── Lights ──────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xc8f0b0, 0x1a2a10, 1.0);
  const key = new THREE.DirectionalLight(0xe8ffe0, 1.45); key.position.set(1.5, 6, 6);
  const polR = new THREE.PointLight(RED, 0, 14, 1.5); polR.position.set(-5.5, 2.5, 2.5);
  const polB = new THREE.PointLight(BLUE, 0, 14, 1.5); polB.position.set(5.5, 2.5, 2.5);
  const toxic = new THREE.PointLight(TOX, 16, 14, 1.4); toxic.position.set(0, 1.6, -3.5);
  group.add(hemi, key, polR, polB, toxic);
  const base = { hemi: hemi.intensity, key: key.intensity, tox: toxic.intensity };

  const state = { L: 1, flash: 0, cheer: 0, focus: 0, ripple: null, solo: null, siren: 0.5 };
  const lerp = (a, b, t) => a + (b - a) * t;
  const tox = new THREE.Color(TOX), hot = new THREE.Color(0xc8ff80);

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const L = state.L;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.45);
    state.siren = Math.max(0.5, state.siren - dt * 0.15);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }

    // Deck plates: toxic glow pulses through in waves; ripple; solo pool.
    plates.forEach((q, i) => {
      const wave = Math.pow(0.5 + 0.5 * Math.sin(q.x * 0.9 - beat * Math.PI + q.z * 0.4), 6);
      let k = (0.12 * wave + 0.25 * onBeat * (((q.ix + q.iz + whole) & 3) === 0 ? 1 : 0)) * L;
      if (state.ripple) { const r = (songTime - state.ripple.t) * 7, d = Math.hypot(q.x - state.ripple.x, q.z); k = Math.max(k, Math.exp(-Math.pow((d - r) * 1.6, 2)) * (1 - Math.min(1, r / 10)) * L); }
      col.set(rusts[(i * 7) % 4]).multiplyScalar(0.55 + 0.45 * L).lerp(tox, Math.min(1, k));
      if (soloK > 0) { const near = Math.exp(-Math.pow(Math.hypot(q.x - soloX, q.z - 0.2) / 1.2, 2)); col.multiplyScalar(1 - 0.55 * soloK).lerp(hot, soloK * near * 0.8); }
      plateMesh.setColorAt(i, col.multiplyScalar(1 + state.flash * 0.3));
    });
    plateMesh.instanceColor.needsUpdate = true;
    seam.material.color.copy(tox).multiplyScalar((0.35 + 0.65 * onBeat) * L + 0.1);

    // Ooze + bubbles.
    oozeMat.uniforms.uT.value = songTime; oozeMat.uniforms.uGlow.value = (0.5 + 0.7 * onBeat) * L + state.flash;
    bubs.forEach((bb, i) => {
      bb.t += dt * bb.sp;
      const u = bb.t % 1.2, pr = bb.pool;
      const s = u < 1 ? Math.sin(Math.PI * u) : 0;
      dummy.position.set(pr.x + Math.cos(bb.a) * pr.r * 0.6 * bb.rr, 0.03 + 0.06 * u, pr.z + Math.sin(bb.a) * pr.r * 0.6 * bb.rr);
      dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(Math.max(0.001, s * (0.8 + 0.6 * onBeat))); dummy.updateMatrix();
      bubMesh.setMatrixAt(i, dummy.matrix);
      if (u >= 1.0 && u - dt * bb.sp < 1.0) bb.a = Math.random() * 6.28;
    });
    bubMesh.instanceMatrix.needsUpdate = true;

    // Police lights: bars alternate red/blue on every beat, beams sweep.
    const alt = whole % 2 === 0, siren = Math.min(1, state.siren + state.cheer * 0.5);
    for (const p of police) {
      p.lr.material.color.set(RED).multiplyScalar(alt ? 1 : 0.25);
      p.lb.material.color.set(BLUE).multiplyScalar(alt ? 0.25 : 1);
    }
    beams.forEach((bm, i) => { bm.rot.rotation.y += dt * (4 + 4 * siren) * (i % 2 ? -1 : 1); bm.m.opacity = (bm.red === alt ? 0.75 : 0.25) * L * (1 - 0.6 * soloK) * siren; });
    sky.material.uniforms.uPulse.value = onBeat * 0.4 * L + state.flash * 0.5;
    sky.material.uniforms.uPol.value = (alt ? 1 : 0.6) * siren * L;
    tapes.forEach((t, i) => { t.position.y += Math.sin(songTime * 2 + i) * 0.0008; t.rotation.x = Math.sin(songTime * 1.7 + i) * 0.15; });

    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.3;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.6); c.cone.rotation.x = -0.12;
      coneMats[i].color.set(soloK > 0.5 ? 0xe8ffd0 : (i % 2 ? TOX : 0xe8ffd0));
      coneMats[i].opacity = (0.015 + 0.03 * onBeat + 0.05 * lead + 0.1 * state.flash + 0.09 * soloK) * L;
    });

    // Zombie crowd: lurching on the beat, arms reaching, heads lolling,
    // glowing eyes.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3);
    crowd.forEach((c, i) => {
      const lurch = Math.pow(0.5 + 0.5 * Math.cos(TAU * beat + c.phase * 0.2), 2) * (0.05 + 0.18 * hype * c.hype) * L * (1 - 0.5 * soloK);
      const sway = Math.sin(Math.PI * beat + c.phase) * 0.18;
      dummy.position.set(c.x + sway * 0.25, c.y + 0.55 - lurch * 0.5, c.z);
      dummy.rotation.set(0.15 + lurch, Math.atan2(-c.x, -c.z + 8) * 0.3, sway + c.tilt * 0.3);
      dummy.scale.setScalar(1); dummy.updateMatrix(); bodyMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x + sway * 0.25 + Math.sin(sway + c.tilt) * 0.1, c.y + 1.15 - lurch * 0.6, c.z + 0.12);
      dummy.rotation.set(0, 0, c.tilt + sway * 1.5); dummy.updateMatrix(); headMesh.setMatrixAt(i, dummy.matrix);
      for (const sd of [-1, 1]) {
        const ex = dummy.position.x + sd * 0.07, ey = dummy.position.y + 0.03 + sd * c.tilt * 0.05;
        m4.makeTranslation(ex, ey, c.z + 0.3); eyeMesh.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4);
      }
      const reachA = hype > 0.6 ? 2.4 + 0.3 * Math.sin(TAU * beat + c.phase) : 1.4 + 0.15 * Math.sin(Math.PI * beat + c.phase + sd(i));
      for (const s2 of [-1, 1]) {
        dummy.position.set(c.x + sway * 0.25 + s2 * 0.24, c.y + 0.9 - lurch * 0.5, c.z + 0.2);
        dummy.rotation.set(-reachA, 0, s2 * 0.1); dummy.updateMatrix();
        armMesh.setMatrixAt(i * 2 + (s2 > 0 ? 1 : 0), dummy.matrix);
      }
    });
    bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = armMesh.instanceMatrix.needsUpdate = eyeMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NF; i++) {
      fPos[i * 3] += fVel[i * 3] * dt;
      if (fPos[i * 3] > 13) { fPos[i * 3] = -13; fPos[i * 3 + 2] = -10 + Math.random() * 14; fPos[i * 3 + 1] = Math.random() * 0.7; }
    }
    fGeo.attributes.position.needsUpdate = true;
    fog.material.opacity = (0.25 + 0.15 * onBeat) * (0.4 + 0.6 * L);
    for (let i = 0; i < NS; i++) {
      if (sLife[i] <= 0) continue;
      sLife[i] -= dt; sVel[i * 3 + 1] -= 9 * dt;
      sPos[i * 3] += sVel[i * 3] * dt; sPos[i * 3 + 1] += sVel[i * 3 + 1] * dt; sPos[i * 3 + 2] += sVel[i * 3 + 2] * dt;
      if (sPos[i * 3 + 1] < 0.02) { sPos[i * 3 + 1] = 0.02; sVel[i * 3 + 1] *= -0.3; sVel[i * 3] *= 0.5; sVel[i * 3 + 2] *= 0.5; }
      if (sLife[i] <= 0) sPos[i * 3 + 1] = -50;
    }
    sGeo.attributes.position.needsUpdate = true;

    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.5 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    polR.intensity = 20 * L * siren * (alt ? 1 : 0.2) * (1 + 1.2 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL)) * (1 + 0.5 * Math.max(0, state.focus));
    polB.intensity = 20 * L * siren * (alt ? 0.2 : 1) * (1 + 1.2 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL)) * (1 + 0.5 * Math.max(0, -state.focus));
    toxic.intensity = base.tox * L * (0.7 + 0.6 * onBeat + state.flash);
  }
  const TAU = Math.PI * 2;
  const sd = (i) => (i % 2) * 0.8;

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); splash(25, x); state.siren = Math.min(1, state.siren + 0.2); }
        if (data.tier >= 4) { state.flash = 0.6; for (const p of pools.slice(0, 4)) splash(10, p.x, p.z); }
        break;
      case 'taunt': state.flash = 0.35; break;
      case 'tauntLanded': splash(60, data.attacker === 'rival' ? -1.6 : 1.6, 0.3, 1.2); state.flash = 1; state.cheer = 1; break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5; splash(15, x || 0); break;
      case 'end': for (const p of pools) splash(20, p.x, p.z, 1.3); state.cheer = 1; state.flash = 1; state.siren = 1; break;
      case 'drop': state.flash = 1; state.siren = 1; for (const p of pools) splash(12, p.x, p.z); break;
      case 'solo': state.solo = { x, t0: data.songTime, t1: data.until }; state.flash = 0.8; state.cheer = 1; splash(40, x); break;
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
