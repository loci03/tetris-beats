// TRIGGERED — a military training yard at night, turned battle stage.
//
// A concrete drill pad with hazard-striped edges whose tiles flash red on
// the kick, sandbag walls, a corrugated Quonset hut stencilled BOOT CAMP,
// chain-link fence with razor wire, two watch towers sweeping searchlights,
// spinning red alarm beacons, tyre stacks, oil drums and crates, low
// drifting smoke, sparks off the floodlight truss on the big moves, and a
// crowd of recruits pumping their fists. Red + olive, all music-driven.

import * as THREE from '../../../vendor/three/three.module.min.js';

const RED = 0xff2a14, AMBER = 0xff7a1a, OLIVE = 0x5d6b34;

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

  // ── Sky: smoky red night with a burning horizon ─────────────────────
  const sky = new THREE.Mesh(geo(new THREE.SphereGeometry(80, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse; uniform float uT;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.03,0.02,0.02), mid = vec3(0.16,0.04,0.03), hor = vec3(0.55,0.14,0.04);
        vec3 c = h > 0.05 ? mix(mid, top, smoothstep(0.05, 0.6, h)) : mix(hor, mid, smoothstep(-0.05, 0.05, h));
        float smoke = 0.5 + 0.5 * sin(vP.x * 9.0 + uT * 0.2) * sin(vP.z * 7.0 - uT * 0.13);
        c += vec3(0.06,0.05,0.04) * smoke * smoothstep(0.4, 0.0, h);
        c += vec3(0.35,0.04,0.02) * uPulse * smoothstep(0.3, 0.0, abs(h - 0.03));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  group.add(sky);

  // ── Ground: dirt yard + concrete drill pad ──────────────────────────
  const dirt = new THREE.Mesh(geo(new THREE.CircleGeometry(45, 32)), toon(0x2e2a1c));
  dirt.rotation.x = -Math.PI / 2; dirt.position.y = -0.04;
  group.add(dirt);
  const T = 0.72, tiles = [];
  for (let ix = -8; ix <= 8; ix++) for (let iz = -6; iz <= 4; iz++) {
    const x = ix * T, z = iz * T + 0.3;
    tiles.push({ x, z, ix, iz, edge: Math.abs(ix) === 8 || iz === -6 || iz === 4 });
  }
  const tileMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(T * 0.97, 0.06, T * 0.97)), basic(0xffffff), tiles.length);
  tiles.forEach((t, i) => { m4.makeTranslation(t.x, -0.03, t.z); tileMesh.setMatrixAt(i, m4); tileMesh.setColorAt(i, col.set(0x3a3a34)); });
  group.add(tileMesh);
  // Hazard stripe border.
  const hazTex = keep(canvasTex(128, 16, (g, w, h) => {
    g.fillStyle = '#f2c018'; g.fillRect(0, 0, w, h); g.fillStyle = '#111';
    for (let x = -16; x < w + 16; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, h); g.fill(); }
  }));
  hazTex.wrapS = THREE.RepeatWrapping; hazTex.repeat.set(10, 1);
  const hazMat = basic(0xffffff, { map: hazTex });
  const padW = 17 * T, padD = 11 * T, padZ = -0.7 * T + 0.3 - 0.36;
  for (const [w, x, z, ry] of [[padW, 0, padZ + padD / 2 + 0.12, 0], [padW, 0, padZ - padD / 2 - 0.12, 0], [padD, padW / 2 + 0.12, padZ, Math.PI / 2], [padD, -padW / 2 - 0.12, padZ, Math.PI / 2]]) {
    const st = new THREE.Mesh(geo(new THREE.PlaneGeometry(w + 0.5, 0.24)), hazMat);
    st.rotation.set(-Math.PI / 2, 0, ry); st.position.set(x, 0.005, z);
    group.add(st);
  }

  // ── Quonset hut (corrugated half-cylinder) + stencil sign ──────────
  const hut = new THREE.Group(); hut.position.set(0, 0, -9.5); group.add(hut);
  const corrTex = keep(canvasTex(64, 64, (g, w, h) => {
    for (let x = 0; x < w; x++) { const v = 70 + 30 * Math.sin(x / w * Math.PI * 8); g.fillStyle = `rgb(${v},${v + 8},${v - 12})`; g.fillRect(x, 0, 1, h); }
  }));
  corrTex.wrapS = corrTex.wrapT = THREE.RepeatWrapping; corrTex.repeat.set(1, 12);
  const shell = new THREE.Mesh(geo(new THREE.CylinderGeometry(4.2, 4.2, 9, 24, 1, true, -Math.PI / 2, Math.PI)), toon(0xb0b8a0, { map: corrTex, side: THREE.DoubleSide }));
  shell.rotation.z = Math.PI / 2; shell.rotation.y = Math.PI / 2;
  shell.position.y = 0; hut.add(shell);
  const front = new THREE.Mesh(geo(new THREE.CircleGeometry(4.2, 24, 0, Math.PI)), toon(0x3d4628));
  front.position.z = 4.5; hut.add(front);
  const signTex = keep(canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h);
    g.font = '900 92px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#e8e2c8'; g.fillText('BOOT CAMP', w / 2, h / 2 + 6);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9; i++) g.fillRect(40 + i * 50, 0, 5, h);     // stencil bridges
  }));
  const sign = new THREE.Mesh(geo(new THREE.PlaneGeometry(5.0, 1.25)), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false }));
  sign.position.set(0, 2.9, 4.52); hut.add(sign);
  const door = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.4, 2.2)), toon(0x22281a));
  door.position.set(0, 1.1, 4.53); hut.add(door);
  const doorLight = new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 10, 8)), basic(RED));
  doorLight.position.set(0, 2.4, 4.6); hut.add(doorLight);
  const star = new THREE.Mesh(geo(new THREE.CircleGeometry(0.55, 5)), basic(0xe8e2c8));
  star.position.set(0, 3.75, 4.53); star.rotation.z = Math.PI / 2; hut.add(star);

  // ── Sandbag walls ───────────────────────────────────────────────────
  const bags = [];
  const wall = (x0, z0, x1, z1, rows) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.62));
    const ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    for (let r = 0; r < rows; r++) for (let i = 0; i < n - (r % 2); i++) {
      const u = (i + (r % 2) * 0.5 + 0.5) / n;
      bags.push([x0 + (x1 - x0) * u, 0.13 + r * 0.24, z0 + (z1 - z0) * u, ry]);
    }
  };
  wall(-8.6, -4.6, -6.6, -6.8, 3); wall(6.6, -6.8, 8.6, -4.6, 3);
  wall(-8.8, -3.8, -8.8, 1.8, lowGraphics ? 2 : 3); wall(8.8, 1.8, 8.8, -3.8, lowGraphics ? 2 : 3);
  wall(-5.6, -6.9, -2.8, -6.9, 2); wall(2.8, -6.9, 5.6, -6.9, 2);
  const bagMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.15, 0.36, 2, 6)), toon(0x8a7a52), bags.length);
  bags.forEach(([x, y, z, ry], i) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, Math.PI / 2); dummy.scale.set(1, 1, 0.75); dummy.updateMatrix();
    bagMesh.setMatrixAt(i, dummy.matrix);
    bagMesh.setColorAt(i, col.set(0x8a7a52).multiplyScalar(0.8 + 0.3 * ((i * 37) % 7) / 7));
  });
  group.add(bagMesh);

  // ── Chain-link fence with razor wire (behind the pad) ───────────────
  const fenceTex = keep(canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(190,200,190,0.9)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  }));
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(36, 6);
  const fence = new THREE.Mesh(geo(new THREE.PlaneGeometry(26, 3.2)), basic(0xffffff, { map: fenceTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  fence.position.set(0, 1.6, -12.5); group.add(fence);
  const postMesh = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 6)), toon(0x5a5e58), 14);
  for (let i = 0; i < 14; i++) { m4.makeTranslation(-13 + i * 2, 1.8, -12.45); postMesh.setMatrixAt(i, m4); }
  group.add(postMesh);
  const wireMesh = new THREE.InstancedMesh(geo(new THREE.TorusGeometry(0.22, 0.012, 3, 10)), toon(0x9aa098), 60);
  for (let i = 0; i < 60; i++) { dummy.position.set(-13 + i * 26 / 60, 3.45, -12.45); dummy.rotation.set(0, Math.PI / 2 + 0.4, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); wireMesh.setMatrixAt(i, dummy.matrix); }
  group.add(wireMesh);

  // ── Watch towers with sweeping searchlights ─────────────────────────
  const towerMat = toon(0x4a4232), roofMat = toon(0x2e3220);
  const searchCones = [];
  const coneGeo = geo(new THREE.ConeGeometry(1.1, 14, 18, 1, true));
  coneGeo.translate(0, -7, 0);
  for (const sx of [-1, 1]) {
    const tw = new THREE.Group(); tw.position.set(sx * 9.2, 0, -8.2); group.add(tw);
    for (const [lx, lz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      const leg = new THREE.Mesh(geo(new THREE.BoxGeometry(0.16, 5.2, 0.16)), towerMat); leg.position.set(lx, 2.6, lz); tw.add(leg);
    }
    const plat = new THREE.Mesh(geo(new THREE.BoxGeometry(2.0, 0.9, 2.0)), towerMat); plat.position.y = 5.5; tw.add(plat);
    const roof = new THREE.Mesh(geo(new THREE.ConeGeometry(1.7, 0.8, 4)), roofMat); roof.position.y = 6.7; roof.rotation.y = Math.PI / 4; tw.add(roof);
    const lamp = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.22, 0.3, 0.4, 10)), toon(0x1a1a1a)); lamp.position.set(-sx * 0.6, 6.15, 0.8); tw.add(lamp);
    const beam = new THREE.Mesh(coneGeo, keep(new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    beam.position.copy(lamp.position); tw.add(beam);
    searchCones.push({ beam, sx });
  }

  // ── Red alarm beacons (rotating beams) ──────────────────────────────
  const beacons = [];
  const beamTex = keep(canvasTex(64, 16, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,60,30,0.9)'); gr.addColorStop(1, 'rgba(255,60,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }));
  const beamGeo = geo(new THREE.PlaneGeometry(3.2, 0.5)); beamGeo.translate(1.6, 0, 0);
  const beamMat = basic(0xffffff, { map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const capMat = basic(RED);
  for (const [x, z, h] of [[-6.4, -5.6, 3.2], [6.4, -5.6, 3.2], [-7.6, 2.4, 2.4], [7.6, 2.4, 2.4]]) {
    const pole = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.06, 0.08, h, 6)), toon(0x3a3a34)); pole.position.set(x, h / 2, z); group.add(pole);
    const cap = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.18, 0.2, 0.3, 10)), capMat); cap.position.set(x, h + 0.15, z); group.add(cap);
    const rot = new THREE.Group(); rot.position.set(x, h + 0.15, z); group.add(rot);
    for (const a of [0, Math.PI]) { const bm = new THREE.Mesh(beamGeo, beamMat); bm.rotation.y = a; rot.add(bm); }
    beacons.push(rot);
  }

  // ── Props: tyre stacks, oil drums, crates, a climbing wall ──────────
  const tyreMesh = new THREE.InstancedMesh(geo(new THREE.TorusGeometry(0.4, 0.16, 6, 14)), toon(0x161616), 12);
  let ti = 0;
  for (const [x, z, n] of [[-6.2, -2.8, 4], [6.0, -3.4, 3], [-5.6, 2.6, 3], [6.4, 3.0, 2]]) {
    for (let k = 0; k < n; k++) { dummy.position.set(x + (k % 2) * 0.06, 0.16 + k * 0.3, z); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); tyreMesh.setMatrixAt(ti++, dummy.matrix); }
  }
  tyreMesh.count = ti; group.add(tyreMesh);
  const drumMesh = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.32, 0.32, 0.95, 12)), toon(OLIVE), 6);
  [[-7.2, -1.2], [-6.7, -1.0], [7.1, -0.4], [7.3, 0.3], [-4.8, -6.0], [4.9, -6.1]].forEach(([x, z], i) => { m4.makeTranslation(x, 0.48, z); drumMesh.setMatrixAt(i, m4); drumMesh.setColorAt(i, col.set(i % 3 === 2 ? 0x8a2a1a : OLIVE)); });
  group.add(drumMesh);
  const crateMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(0.9, 0.7, 0.7)), toon(0x6a5a32), 5);
  [[-3.4, -6.3, 0], [-2.6, -6.4, 0.3], [-3.0, -6.35, 0.2, 0.7], [3.3, -6.3, -0.2], [7.5, 1.0, 0.4]].forEach(([x, z, r, y = 0], i) => { dummy.position.set(x, 0.35 + y, z); dummy.rotation.set(0, r, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); crateMesh.setMatrixAt(i, dummy.matrix); });
  group.add(crateMesh);

  // ── Floodlight truss (spot cones for the dancers / the solo) ────────
  const truss = new THREE.Mesh(geo(new THREE.BoxGeometry(12, 0.24, 0.24)), toon(0x2a2a26));
  truss.position.set(0, 6.6, 1.0); group.add(truss);
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(geo(new THREE.BoxGeometry(0.24, 6.6, 0.24)), toon(0x2a2a26)); leg.position.set(sx * 6, 3.3, 1.0); group.add(leg); }
  const cones = [], coneMats = [];
  const sGeo = geo(new THREE.ConeGeometry(0.9, 6.6, 18, 1, true)); sGeo.translate(0, -3.3, 0);
  for (const [x, tx] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    const fix = new THREE.Mesh(geo(new THREE.BoxGeometry(0.4, 0.34, 0.34)), toon(0x151515)); fix.position.set(x, 6.4, 1.0); group.add(fix);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = new THREE.Mesh(sGeo, mat); cone.position.copy(fix.position); group.add(cone);
    cones.push({ cone, baseX: x, targetX: tx, side: tx < 0 ? 'player' : 'rival' }); coneMats.push(mat);
  }

  // ── Crowd of recruits ───────────────────────────────────────────────
  const crowd = [];
  const addRow = (n, x0, x1, z, y, jit = 0.4) => { for (let i = 0; i < n; i++) crowd.push({ x: x0 + (x1 - x0) * (i + Math.random() * jit) / n, z: z + Math.random() * 0.4, y }); };
  const cs = lowGraphics ? 0.6 : 1;
  addRow(Math.round(14 * cs), -6.8, 6.8, 5.4, -1.0);
  addRow(Math.round(16 * cs), -7.6, 7.6, 6.5, -1.15);
  addRow(Math.round(12 * cs), -7.5, 7.5, -11.6, 0.0, 0.7);
  const nCrowd = crowd.length;
  const tees = [0x5d6b34, 0x47522b, 0x3a3a34, 0x6a5a32, 0x2c3420];
  const skin = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22, 0x3b2617];
  const bodyMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.27, 0.55, 3, 8)), toon(0xffffff), nCrowd);
  const headMesh = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.2, 10, 8)), toon(0xffffff), nCrowd);
  const armMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.075, 0.5, 3, 6)), toon(0xffffff), nCrowd * 2);
  crowd.forEach((c, i) => {
    c.phase = Math.random() * Math.PI * 2; c.hype = 0.6 + Math.random() * 0.6;
    bodyMesh.setColorAt(i, col.set(tees[i % tees.length]));
    headMesh.setColorAt(i, col.set(skin[i % skin.length]));
    armMesh.setColorAt(i * 2, col.set(skin[i % skin.length])); armMesh.setColorAt(i * 2 + 1, col.set(skin[i % skin.length]));
  });
  group.add(bodyMesh, headMesh, armMesh);

  // ── Smoke + sparks (points) ─────────────────────────────────────────
  const puffTex = keep(canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(200,200,190,0.55)'); gr.addColorStop(1, 'rgba(200,200,190,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }));
  const NS = lowGraphics ? 60 : 120;
  const smPos = new Float32Array(NS * 3), smVel = new Float32Array(NS * 3), smLife = new Float32Array(NS);
  const smGeo = geo(new THREE.BufferGeometry()); smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3));
  const smoke = new THREE.Points(smGeo, keep(new THREE.PointsMaterial({ size: 2.4, map: puffTex, transparent: true, depthWrite: false, color: 0x8a8a80, opacity: 0.6 })));
  smoke.frustumCulled = false; group.add(smoke);
  const resetSmoke = (i, x, y, z, vx, vy, vz, life) => { smPos[i * 3] = x; smPos[i * 3 + 1] = y; smPos[i * 3 + 2] = z; smVel[i * 3] = vx; smVel[i * 3 + 1] = vy; smVel[i * 3 + 2] = vz; smLife[i] = life; };
  for (let i = 0; i < NS; i++) resetSmoke(i, (Math.random() - 0.5) * 22, Math.random() * 0.8, -9 + Math.random() * 12, 0.2 + Math.random() * 0.2, 0.02, 0, 6 + Math.random() * 12);
  let smCursor = 0;
  function puff(n, x, z = 0.4, spread = 1.5) {
    for (let k = 0; k < n; k++) { const i = smCursor = (smCursor + 1) % NS; resetSmoke(i, x + (Math.random() - 0.5) * spread, 0.2 + Math.random() * 0.6, z + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 1.6, 0.25 + Math.random() * 0.4, (Math.random() - 0.5) * 1.2, 3 + Math.random() * 2); }
  }
  const NK = lowGraphics ? 120 : 260;
  const skPos = new Float32Array(NK * 3), skVel = new Float32Array(NK * 3), skLife = new Float32Array(NK);
  for (let i = 0; i < NK; i++) skPos[i * 3 + 1] = -50;
  const skGeo = geo(new THREE.BufferGeometry()); skGeo.setAttribute('position', new THREE.BufferAttribute(skPos, 3));
  const sparks = new THREE.Points(skGeo, keep(new THREE.PointsMaterial({ size: 0.09, color: 0xffb040, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
  sparks.frustumCulled = false; group.add(sparks);
  let skCursor = 0;
  function spark(n, x, y = 6.4, z = 1.0) {
    for (let k = 0; k < n; k++) {
      const i = skCursor = (skCursor + 1) % NK;
      skPos[i * 3] = x + (Math.random() - 0.5) * 0.4; skPos[i * 3 + 1] = y; skPos[i * 3 + 2] = z;
      skVel[i * 3] = (Math.random() - 0.5) * 3; skVel[i * 3 + 1] = Math.random() * 2; skVel[i * 3 + 2] = (Math.random() - 0.5) * 2 + 0.5;
      skLife[i] = 1.2 + Math.random() * 0.8;
    }
  }

  // ── Lights ──────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xd8d0c0, 0x3a1a10, 1.0);
  const key = new THREE.DirectionalLight(0xf0f0ff, 1.45); key.position.set(1.5, 6, 6);
  const alarmL = new THREE.PointLight(RED, 18, 13, 1.6); alarmL.position.set(-3.8, 3, -1.2);
  const alarmR = new THREE.PointLight(RED, 18, 13, 1.6); alarmR.position.set(3.8, 3, -1.2);
  const flare = new THREE.PointLight(AMBER, 0, 14, 1.5); flare.position.set(0, 4.5, 0.5);
  group.add(hemi, key, alarmL, alarmR, flare);
  const base = { hemi: hemi.intensity, key: key.intensity, a: alarmL.intensity };

  const state = { L: 1, flash: 0, cheer: 0, focus: 0, ripple: null, solo: null, alarm: 0, smokeOut: 0 };
  const dark = new THREE.Color(0x2c2c28), hot = new THREE.Color(RED), amber = new THREE.Color(AMBER), conc = new THREE.Color(0x4a4a42);

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const ph2 = ((beat * 2) % 1 + 1) % 1, onPulse = Math.exp(-ph2 * 7);
    const L = state.L;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.45);
    state.alarm = Math.max(0, state.alarm - dt * 0.25);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    const alarm = Math.min(1, 0.5 + state.alarm + state.cheer * 0.4);

    // Pad: concrete with red strips flashing on the pulse, a red shock ring
    // from the big moves, hazard-amber edge, light pool under the soloist.
    tiles.forEach((t, i) => {
      const lane = (((t.ix + whole * 3) % 4) + 4) % 4 === 0;
      let k = (lane ? 0.6 * onPulse * alarm : 0) * L;
      if (state.ripple) {
        const r = (songTime - state.ripple.t) * 7, d = Math.hypot(t.x - state.ripple.x, t.z);
        k = Math.max(k, Math.exp(-Math.pow((d - r) * 1.8, 2)) * (1 - Math.min(1, r / 10)) * L);
      }
      col.copy(conc).multiplyScalar(0.55 + 0.25 * L + 0.15 * (((t.ix * 7 + t.iz * 13) % 5) / 5));
      if (t.edge) col.lerp(amber, 0.25 + 0.4 * onBeat * L);
      col.lerp(hot, Math.min(1, k));
      if (soloK > 0) { const near = Math.exp(-Math.pow(Math.hypot(t.x - soloX, t.z - 0.2) / 1.2, 2)); col.multiplyScalar(1 - 0.6 * soloK).lerp(new THREE.Color(0xfff0d0), soloK * near * 0.8); }
      col.multiplyScalar(1 + state.flash * 0.4);
      tileMesh.setColorAt(i, col);
    });
    tileMesh.instanceColor.needsUpdate = true;

    // Searchlights sweep (and both lock onto a soloist).
    searchCones.forEach((c, i) => {
      const sweep = Math.sin(songTime * 0.55 + i * 2.2);
      const aim = c.sx * 9.2 - soloX;
      c.beam.rotation.z = lerp(c.sx * (0.55 + 0.35 * sweep), Math.atan2(aim, 6) * 1.0, soloK);
      c.beam.rotation.x = lerp(-0.55 + 0.15 * Math.cos(songTime * 0.4 + i), -0.75, soloK);
      c.beam.material.opacity = (0.05 + 0.03 * onBeat + 0.06 * soloK) * L;
    });
    // Beacons spin, faster when it's going off.
    beacons.forEach((r, i) => { r.rotation.y += dt * (3 + 5 * alarm) * (i % 2 ? -1 : 1); r.visible = L > 0.15; });
    capMat.color.setRGB(0.6 + 0.4 * onPulse * alarm, 0.08, 0.04);
    beamMat.opacity = (0.5 + 0.5 * onPulse) * L * (1 - 0.6 * soloK);
    doorLight.material.color.setRGB(0.4 + 0.6 * onBeat, 0.05, 0.02);
    sign.material.opacity = L * (0.85 + 0.15 * onBeat);
    sky.material.uniforms.uPulse.value = onBeat * 0.5 * L + state.flash * 0.6;
    sky.material.uniforms.uT.value = songTime;

    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.3;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.6); c.cone.rotation.x = -0.12;
      coneMats[i].color.set(soloK > 0.5 ? 0xfff0d0 : (i % 2 ? RED : 0xfff0d0));
      coneMats[i].opacity = (0.02 + 0.035 * onBeat + 0.05 * lead + 0.1 * state.flash + 0.08 * soloK) * L;
    });

    // Recruits: fist pumps on the beat, both arms up when hyped.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3);
    crowd.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.phase * 0.3)) * (0.05 + 0.28 * hype * c.hype) * L * (1 - 0.6 * soloK);
      dummy.position.set(c.x, c.y + 0.55 + jump, c.z);
      dummy.rotation.set(0, Math.atan2(-c.x, -c.z + 8) * 0.3, state.focus * 0.12 * Math.sign(-c.x || 1));
      dummy.scale.setScalar(1); dummy.updateMatrix(); bodyMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.62; dummy.updateMatrix(); headMesh.setMatrixAt(i, dummy.matrix);
      const pumpA = 2.3 + 0.5 * Math.exp(-((((beat + c.phase * 0.05) % 1) + 1) % 1) * 5);
      for (const sd of [-1, 1]) {
        const up = hype > 0.6 ? pumpA : (sd > 0 ? pumpA * (0.5 + 0.5 * Math.sin(c.phase)) : 0.35);
        dummy.position.set(c.x + sd * 0.29, c.y + 0.85 + jump, c.z);
        dummy.rotation.set(0, 0, sd * up); dummy.updateMatrix();
        armMesh.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
    });
    bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = armMesh.instanceMatrix.needsUpdate = true;

    // Smoke drifts; ambient smoke recycles along the ground.
    state.smokeOut = Math.max(0, state.smokeOut - dt * 0.3);
    for (let i = 0; i < NS; i++) {
      smLife[i] -= dt;
      if (smLife[i] <= 0) { resetSmoke(i, -11 + Math.random() * 3, Math.random() * 0.6, -9 + Math.random() * 12, 0.25 + Math.random() * 0.25, 0.02, (Math.random() - 0.5) * 0.1, 30 + Math.random() * 20); continue; }
      smPos[i * 3] += smVel[i * 3] * dt; smPos[i * 3 + 1] += smVel[i * 3 + 1] * dt; smPos[i * 3 + 2] += smVel[i * 3 + 2] * dt;
      smVel[i * 3 + 1] *= 1 - dt * 0.5; smVel[i * 3] += (0.25 - smVel[i * 3]) * dt * 0.3;
      if (smPos[i * 3] > 12 || smPos[i * 3 + 1] > 5) smLife[i] = 0;
    }
    smGeo.attributes.position.needsUpdate = true;
    smoke.material.opacity = (0.35 + 0.35 * state.smokeOut) * (0.4 + 0.6 * L);
    for (let i = 0; i < NK; i++) {
      if (skLife[i] <= 0) continue;
      skLife[i] -= dt; skVel[i * 3 + 1] -= 9 * dt;
      skPos[i * 3] += skVel[i * 3] * dt; skPos[i * 3 + 1] += skVel[i * 3 + 1] * dt; skPos[i * 3 + 2] += skVel[i * 3 + 2] * dt;
      if (skPos[i * 3 + 1] < 0.02) { skPos[i * 3 + 1] = 0.02; skVel[i * 3 + 1] *= -0.3; skVel[i * 3] *= 0.6; skVel[i * 3 + 2] *= 0.6; }
      if (skLife[i] <= 0) skPos[i * 3 + 1] = -50;
    }
    skGeo.attributes.position.needsUpdate = true;

    // Lights: alarms pulse with the 145 pulse; the amber flare on big hits.
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    const aL = (0.55 + 0.7 * onPulse * alarm + 0.5 * Math.max(0, state.focus));
    const aR = (0.55 + 0.7 * onPulse * alarm + 0.5 * Math.max(0, -state.focus));
    alarmL.intensity = base.a * L * aL * (1 + 1.4 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    alarmR.intensity = base.a * L * aR * (1 + 1.4 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    flare.intensity = 20 * state.flash * L;
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); spark(30, x * 1.6); state.alarm = Math.min(0.5, state.alarm + 0.15); }
        if (data.tier >= 4) { state.flash = 0.6; spark(40, -x * 1.2); puff(8, x); }
        break;
      case 'taunt':
        state.flash = 0.3;
        break;
      case 'tauntLanded':
        puff(30, data.attacker === 'rival' ? -1.6 : 1.6, 0.4, 2.2); state.smokeOut = 1;
        state.flash = 0.8; state.cheer = 1;
        break;
      case 'dodge':
        state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.4; puff(10, x || 0);
        break;
      case 'end':
        spark(120, -3.4); spark(120, 3.4); state.cheer = 1; state.flash = 1; state.alarm = 0.5; puff(20, 0, 0.4, 6);
        break;
      case 'drop':
        state.flash = 1; state.alarm = 0.5; spark(60, -3); spark(60, 3);
        break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; spark(50, x); puff(12, x);
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
