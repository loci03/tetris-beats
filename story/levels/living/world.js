// LIVING MY LIFE — the sunset boardwalk roller rink.
//
// A wooden boardwalk deck ringed with neon rink lights over the sand, the
// ocean rolling in under a striped retro sun, a pier strung with lights
// running out to a spinning Ferris wheel, palm trees swaying to the beat,
// a lifeguard tower, a robot cruising in a cherry convertible (the level's
// robots-in-convertibles theme), beach balls bouncing on the kick and a
// beach crowd. Music-driven via update().

import * as THREE from '../../../vendor/three/three.module.min.js';

const NEON = [0xff4f9a, 0x40ddff, 0xffdd44, 0xff7a3a, 0xb98cff, 0x5cf2b0];

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
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), dummy = new THREE.Object3D();

  // ── Sunset sky + retro sun ──────────────────────────────────────────
  const sky = new THREE.Mesh(geo(new THREE.SphereGeometry(90, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.16,0.10,0.38), mid = vec3(0.95,0.36,0.52), hor = vec3(1.0,0.72,0.32);
        vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.65, h)) : mix(hor, mid, smoothstep(-0.02, 0.1, h));
        c += vec3(0.2,0.08,0.1) * uPulse * smoothstep(0.35, 0.0, abs(h - 0.06));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  group.add(sky);
  const sunTex = keep(canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.55, '#ffab3a'); gr.addColorStop(1, '#ff4f7a');
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) g.fillRect(0, h * 0.55 + i * 15, w, 3 + i * 1.6);
  }));
  const sun = new THREE.Mesh(geo(new THREE.PlaneGeometry(22, 22)), basic(0xffffff, { map: sunTex, transparent: true, depthWrite: false, fog: false }));
  sun.position.set(4, 3.2, -70); group.add(sun);

  // ── Ocean with a sun-glitter path + rolling foam ────────────────────
  const ocean = new THREE.Mesh(geo(new THREE.PlaneGeometry(220, 120, 1, 1)), keep(new THREE.ShaderMaterial({
    fog: false, uniforms: { uT: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform float uT; uniform float uPulse;
      void main(){
        float d = clamp((-vW.z - 9.0) / 60.0, 0.0, 1.0);
        vec3 near = vec3(0.10,0.36,0.52), far = vec3(0.86,0.42,0.48);
        vec3 c = mix(near, far, pow(d, 0.7));
        float wv = sin(vW.z * 2.2 + uT * 1.6 + sin(vW.x * 0.6) * 1.5) * sin(vW.x * 0.9 - uT * 0.4);
        c += vec3(0.08,0.1,0.12) * wv * (1.0 - d);
        float glit = smoothstep(4.5, 0.0, abs(vW.x - 4.0 * (0.4 + 0.6 * d))) * step(0.55, fract(sin(dot(floor(vW.xz * vec2(3.0, 1.5) + vec2(0.0, uT * 2.0)), vec2(12.9898, 78.233))) * 43758.5453));
        c += vec3(1.0,0.8,0.5) * glit * (0.35 + 0.4 * d + 0.3 * uPulse);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -0.75, -69); group.add(ocean);
  const foamMat = basic(0xffffff, { transparent: true, opacity: 0.6, depthWrite: false });
  const foams = [];
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(geo(new THREE.PlaneGeometry(40, 0.35)), foamMat.clone()); keep(f.material); f.rotation.x = -Math.PI / 2; group.add(f); foams.push(f); }

  // ── Sand ────────────────────────────────────────────────────────────
  const sand = new THREE.Mesh(geo(new THREE.PlaneGeometry(60, 26)), toon(0xe8b878));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, -0.62, 3.5); group.add(sand);

  // ── Boardwalk deck (planks) + neon rink ring ────────────────────────
  const deck = new THREE.Mesh(geo(new THREE.BoxGeometry(13.6, 0.6, 8.0)), toon(0x7a4a2a));
  deck.position.set(0, -0.32, 0.15); group.add(deck);
  const planks = [];
  for (let iz = 0; iz < 18; iz++) for (let ix = 0; ix < 8; ix++) planks.push({ x: -6.8 + 0.85 + ix * 1.7 + ((iz % 2) ? 0.85 : 0) - (ix === 7 && iz % 2 ? 1.7 : 0), z: -3.85 + 0.22 + iz * 0.44, iz, ix });
  const plankMesh = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(1.66, 0.05, 0.4)), toon(0xffffff), planks.length);
  const woods = [0xc89058, 0xb57c48, 0xd6a066, 0xbf8650];
  planks.forEach((q, i) => { m4.makeTranslation(q.x, -0.0, q.z); plankMesh.setMatrixAt(i, m4); plankMesh.setColorAt(i, col.set(woods[(i * 7) % 4])); });
  group.add(plankMesh);
  const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(1, 0.045, 6, 80)), basic(0xff4f9a));
  ring.rotation.x = Math.PI / 2; ring.scale.set(5.6, 3.0, 1); ring.position.set(0, 0.04, 0.2); group.add(ring);
  const ring2 = new THREE.Mesh(geo(new THREE.TorusGeometry(1, 0.035, 6, 80)), basic(0x40ddff));
  ring2.rotation.x = Math.PI / 2; ring2.scale.set(5.9, 3.3, 1); ring2.position.set(0, 0.04, 0.2); group.add(ring2);
  // Railing posts with bulbs along the back edge.
  const bulbGeo = geo(new THREE.SphereGeometry(0.08, 8, 6));
  const railBulbs = new THREE.InstancedMesh(bulbGeo, basic(0xffffff), 16);
  const railPosts = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6)), toon(0xf4ede0), 16);
  for (let i = 0; i < 16; i++) { const x = -6.4 + i * (12.8 / 15); m4.makeTranslation(x, 0.5, -3.85); railPosts.setMatrixAt(i, m4); m4.makeTranslation(x, 1.05, -3.85); railBulbs.setMatrixAt(i, m4); railBulbs.setColorAt(i, col.set(NEON[i % NEON.length])); }
  const rail = new THREE.Mesh(geo(new THREE.BoxGeometry(12.9, 0.08, 0.1)), toon(0xf4ede0)); rail.position.set(0, 0.9, -3.85);
  group.add(railBulbs, railPosts, rail);

  // ── Pier + string lights + Ferris wheel ─────────────────────────────
  const pier = new THREE.Mesh(geo(new THREE.BoxGeometry(3.2, 0.3, 26)), toon(0x8a5a32));
  pier.position.set(-8.5, 0.1, -21); group.add(pier);
  const pierLegs = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6)), toon(0x5a3a22), 18);
  for (let i = 0; i < 18; i++) { m4.makeTranslation(-8.5 + (i % 2 ? 1.4 : -1.4), -0.9, -9 - Math.floor(i / 2) * 3); pierLegs.setMatrixAt(i, m4); }
  group.add(pierLegs);
  const NB = lowGraphics ? 24 : 40;
  const strBulbs = new THREE.InstancedMesh(bulbGeo, basic(0xffffff), NB * 2);
  for (let i = 0; i < NB; i++) for (const s of [0, 1]) {
    const u = i / (NB - 1), z = -8.5 - u * 24, sag = Math.sin((u * 6 % 1) * Math.PI) * 0.35;
    m4.makeTranslation(-8.5 + (s ? 1.5 : -1.5), 2.4 - sag, z); strBulbs.setMatrixAt(i * 2 + s, m4);
  }
  group.add(strBulbs);
  const lampPosts = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6)), toon(0xf4ede0), 10);
  for (let i = 0; i < 10; i++) { m4.makeTranslation(-8.5 + (i % 2 ? 1.5 : -1.5), 1.3, -8.5 - Math.floor(i / 2) * 6); lampPosts.setMatrixAt(i, m4); }
  group.add(lampPosts);
  const wheel = new THREE.Group(); wheel.position.set(-8.5, 5.4, -30); group.add(wheel);
  const wheelRot = new THREE.Group(); wheel.add(wheelRot);
  wheelRot.add(new THREE.Mesh(geo(new THREE.TorusGeometry(4.6, 0.12, 6, 40)), toon(0xf4ede0)));
  const spokeGeo = geo(new THREE.BoxGeometry(0.08, 9.2, 0.08)), spokeMat = toon(0xf4ede0);
  for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(spokeGeo, spokeMat); sp.rotation.z = i * Math.PI / 6; wheelRot.add(sp); }
  const cabGeo = geo(new THREE.BoxGeometry(0.7, 0.6, 0.7));
  const cabs = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const c = new THREE.Mesh(cabGeo, toon(NEON[i % NEON.length])); c.position.set(Math.cos(a) * 4.6, Math.sin(a) * 4.6 - 0.4, 0); wheelRot.add(c); cabs.push(c); }
  const wBulbs = new THREE.InstancedMesh(bulbGeo, basic(0xffffff), 24);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; m4.makeTranslation(Math.cos(a) * 4.75, Math.sin(a) * 4.75, 0.1); wBulbs.setMatrixAt(i, m4); }
  wheelRot.add(wBulbs);
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.14, 0.18, 6.2, 6)), toon(0xf4ede0)); leg.position.set(sx * 1.5, -2.6, 0); leg.rotation.z = sx * 0.25; wheel.add(leg); }

  // ── Palm trees ──────────────────────────────────────────────────────
  const palms = [];
  const trunkMat = toon(0x8a6038), leafMat = toon(0x2fa84a, { side: THREE.DoubleSide });
  const segGeo = geo(new THREE.CylinderGeometry(0.15, 0.19, 0.75, 7));
  const leafGeo = geo(new THREE.ConeGeometry(0.35, 2.4, 4, 1)); leafGeo.translate(0, 1.2, 0);
  for (const [x, z, sc, lean] of [[-7.4, -2.8, 1.15, 0.12], [-8.6, 1.2, 1.0, -0.08], [7.5, -3.2, 1.2, -0.12], [8.4, 1.6, 0.95, 0.1], [4.8, -7.8, 1.1, 0.05], [-3.5, -8.4, 1.25, -0.06]]) {
    const pg = new THREE.Group(); pg.position.set(x, -0.6, z); pg.scale.setScalar(sc); group.add(pg);
    let top = new THREE.Vector3();
    for (let k = 0; k < 7; k++) {
      const seg = new THREE.Mesh(segGeo, trunkMat);
      seg.position.set(Math.sin(k * 0.25) * lean * k * 0.8, 0.37 + k * 0.72, 0); seg.rotation.z = -lean * (0.5 + k * 0.1);
      pg.add(seg); top.copy(seg.position);
    }
    const crown = new THREE.Group(); crown.position.copy(top).add(new THREE.Vector3(0, 0.35, 0)); pg.add(crown);
    for (let i = 0; i < 7; i++) {
      const lf = new THREE.Mesh(leafGeo, leafMat);
      lf.rotation.set(0, i / 7 * Math.PI * 2, 1.25 + (i % 2) * 0.2); lf.scale.set(1, 1, 0.25);
      crown.add(lf);
    }
    for (let i = 0; i < 3; i++) { const nut = new THREE.Mesh(geo(new THREE.SphereGeometry(0.13, 6, 5)), toon(0x5a3a1a)); nut.position.set(Math.cos(i * 2.1) * 0.16, -0.1, Math.sin(i * 2.1) * 0.16); crown.add(nut); }
    palms.push({ crown, phase: x * 0.7 });
  }

  // ── Lifeguard tower ─────────────────────────────────────────────────
  const tower = new THREE.Group(); tower.position.set(3.4, -0.6, -6.6); group.add(tower);
  for (const [lx, lz] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]]) { const l = new THREE.Mesh(geo(new THREE.BoxGeometry(0.12, 2.4, 0.12)), toon(0xf4ede0)); l.position.set(lx, 1.2, lz); tower.add(l); }
  const hutTex = keep(canvasTex(64, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff3a3a'; g.fillRect(0, i * 8, w, 8); } }));
  const hut = new THREE.Mesh(geo(new THREE.BoxGeometry(1.6, 1.1, 1.4)), toon(0xffffff, { map: hutTex })); hut.position.y = 2.95; tower.add(hut);
  const hutRoof = new THREE.Mesh(geo(new THREE.ConeGeometry(1.25, 0.6, 4)), toon(0x40ddff)); hutRoof.position.y = 3.8; hutRoof.rotation.y = Math.PI / 4; tower.add(hutRoof);
  const signTex = keep(canvasTex(512, 128, (g, w, h) => {
    g.font = 'italic 900 62px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff4f9a'; g.shadowBlur = 24; g.strokeStyle = '#ff9ad0'; g.lineWidth = 7;
    g.strokeText('ROLLER BEACH', w / 2, h / 2 + 4); g.shadowBlur = 10; g.fillStyle = '#fff4fb'; g.fillText('ROLLER BEACH', w / 2, h / 2 + 4);
  }));
  const sign = new THREE.Mesh(geo(new THREE.PlaneGeometry(3.4, 0.85)), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false }));
  sign.position.set(0, 4.6, 0.75); tower.add(sign);

  // ── Robot in a cherry convertible ───────────────────────────────────
  const car = new THREE.Group(); car.position.set(-4.6, -0.6, -6.2); car.rotation.y = 0.5; group.add(car);
  const carRed = toon(0xe8203a), chrome = toon(0xdfe6ee), tyre = toon(0x151515);
  const body = new THREE.Mesh(geo(new THREE.BoxGeometry(3.4, 0.55, 1.5)), carRed); body.position.y = 0.6; car.add(body);
  const hood = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.3, 2.8, 3, 8)), carRed); hood.rotation.z = Math.PI / 2; hood.scale.set(1, 1, 2.4); hood.position.y = 0.72; car.add(hood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12)), tyre); w.rotation.x = Math.PI / 2; w.position.set(sx * 1.1, 0.32, sz * 0.72); car.add(w); }
  const shield = new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.4, 1.3)), toon(0x9fe8ff, { transparent: true, opacity: 0.5 })); shield.position.set(0.35, 1.15, 0); shield.rotation.z = 0.35; car.add(shield);
  const bumperF = new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 0.14, 1.55)), chrome); bumperF.position.set(1.72, 0.45, 0); car.add(bumperF);
  const seat = new THREE.Mesh(geo(new THREE.BoxGeometry(0.4, 0.5, 1.2)), toon(0xfff2e0)); seat.position.set(-0.45, 1.05, 0); car.add(seat);
  const robot = new THREE.Group(); robot.position.set(-0.2, 1.1, 0.3); car.add(robot);
  const rTorso = new THREE.Mesh(geo(new THREE.BoxGeometry(0.42, 0.5, 0.45)), chrome); rTorso.position.y = 0.3; robot.add(rTorso);
  const rHead = new THREE.Group(); rHead.position.y = 0.72; robot.add(rHead);
  rHead.add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.4, 0.34, 0.36)), chrome));
  const visor = new THREE.Mesh(geo(new THREE.BoxGeometry(0.05, 0.1, 0.3)), basic(0x40ddff)); visor.position.set(0.2, 0.03, 0); rHead.add(visor);
  const ant = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4)), chrome); ant.position.y = 0.32; rHead.add(ant);
  const antTip = new THREE.Mesh(geo(new THREE.SphereGeometry(0.05, 8, 6)), basic(0xff4f9a)); antTip.position.y = 0.48; rHead.add(antTip);
  const rShades = new THREE.Mesh(geo(new THREE.BoxGeometry(0.03, 0.08, 0.34)), toon(0x111111)); rShades.position.set(0.22, 0.05, 0); rHead.add(rShades);
  const rArm = new THREE.Group(); rArm.position.set(0, 0.5, -0.28); robot.add(rArm);
  const rArmM = new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 0.55, 0.1)), chrome); rArmM.position.y = 0.27; rArm.add(rArmM);

  // ── Bouncing beach balls ────────────────────────────────────────────
  const ballTex = keep(canvasTex(128, 64, (g, w, h) => { const c = ['#ff3333', '#ffffff', '#ffcc00', '#ffffff', '#3399ff', '#ffffff']; for (let i = 0; i < 6; i++) { g.fillStyle = c[i]; g.fillRect(i * w / 6, 0, w / 6 + 1, h); } }));
  const balls = [];
  const ballMesh = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.3, 14, 10)), toon(0xffffff, { map: ballTex }), 8);
  [[-5.8, -5.0], [6.2, -4.6], [-2.2, -6.8], [1.6, -7.4], [-9, -4], [9.2, -2], [5.6, 4.6], [-5.6, 4.8]].forEach(([x, z], i) => balls.push({ x, z, y0: -0.3, phase: i * 0.37, spin: 0, kick: 0, vx: 0, vz: 0, ox: x, oz: z }));
  group.add(ballMesh);

  // ── Spot cones (solo) ───────────────────────────────────────────────
  const cones = [], coneMats = [];
  const coneGeo = geo(new THREE.ConeGeometry(0.9, 6.6, 18, 1, true)); coneGeo.translate(0, -3.3, 0);
  const truss = new THREE.Mesh(geo(new THREE.BoxGeometry(11, 0.2, 0.2)), toon(0xf4ede0)); truss.position.set(0, 6.6, 1.2); group.add(truss);
  for (const [x, tx] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    const fix = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.18, 0.26, 0.34, 10)), toon(0x22222a)); fix.position.set(x, 6.4, 1.2); group.add(fix);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = new THREE.Mesh(coneGeo, mat); cone.position.copy(fix.position); group.add(cone);
    cones.push({ cone, baseX: x, targetX: tx, side: tx < 0 ? 'player' : 'rival' }); coneMats.push(mat);
  }

  // ── Beach crowd ─────────────────────────────────────────────────────
  const crowd = [];
  const addRow = (n, x0, x1, z, y, jit = 0.4) => { for (let i = 0; i < n; i++) crowd.push({ x: x0 + (x1 - x0) * (i + Math.random() * jit) / n, z: z + Math.random() * 0.4, y }); };
  const cs = lowGraphics ? 0.6 : 1;
  addRow(Math.round(14 * cs), -6.8, 6.8, 5.4, -1.0);
  addRow(Math.round(16 * cs), -7.6, 7.6, 6.5, -1.15);
  addRow(Math.round(8 * cs), -2.5, 2.5, -5.4, -0.6, 0.8);
  const nCrowd = crowd.length;
  const suits = [0xff4f9a, 0x40ddff, 0xffdd44, 0xff7a3a, 0xb98cff, 0x5cf2b0, 0xffffff];
  const skin = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22, 0xf3d2b8];
  const bodyMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.26, 0.55, 3, 8)), toon(0xffffff), nCrowd);
  const headMesh = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.2, 10, 8)), toon(0xffffff), nCrowd);
  const armMesh = new THREE.InstancedMesh(geo(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6)), toon(0xffffff), nCrowd * 2);
  crowd.forEach((c, i) => {
    c.phase = Math.random() * Math.PI * 2; c.hype = 0.6 + Math.random() * 0.6;
    bodyMesh.setColorAt(i, col.set(suits[i % suits.length]));
    headMesh.setColorAt(i, col.set(skin[i % skin.length]));
    armMesh.setColorAt(i * 2, col.set(skin[i % skin.length])); armMesh.setColorAt(i * 2 + 1, col.set(skin[i % skin.length]));
  });
  group.add(bodyMesh, headMesh, armMesh);

  // ── Confetti-ish sparkles (beach glitter) ───────────────────────────
  const NG = lowGraphics ? 160 : 320;
  const gPos = new Float32Array(NG * 3), gCol = new Float32Array(NG * 3), gVel = new Float32Array(NG * 3), gLife = new Float32Array(NG);
  for (let i = 0; i < NG; i++) { col.set(NEON[i % NEON.length]); gCol[i * 3] = col.r; gCol[i * 3 + 1] = col.g; gCol[i * 3 + 2] = col.b; gPos[i * 3 + 1] = -100; }
  const gGeo = geo(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
  const glitter = new THREE.Points(gGeo, keep(new THREE.PointsMaterial({ size: 0.11, vertexColors: true }))); glitter.frustumCulled = false; group.add(glitter);
  let gCur = 0;
  function burst(n, x, spread = 3) {
    for (let k = 0; k < n; k++) { const i = gCur = (gCur + 1) % NG; gPos[i * 3] = x + (Math.random() - 0.5) * spread; gPos[i * 3 + 1] = 6 + Math.random() * 1.5; gPos[i * 3 + 2] = (Math.random() - 0.5) * 4 + 0.5; gVel[i * 3] = (Math.random() - 0.5) * 1.2; gVel[i * 3 + 1] = -1.2 - Math.random(); gVel[i * 3 + 2] = (Math.random() - 0.5); gLife[i] = 5; }
  }
  function kickBalls(power, x) {
    for (const b of balls) { b.kick = Math.max(b.kick, power * (0.6 + Math.random() * 0.5)); b.vx += (b.x - x) * 0.1 * power; }
  }

  // ── Lights ──────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffd0e0, 0xc08060, 1.1);
  const key = new THREE.DirectionalLight(0xffe2c0, 1.55); key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(0xff4f9a, 16, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0x40ddff, 16, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const sunset = new THREE.PointLight(0xffa040, 10, 16, 1.4); sunset.position.set(0, 2.5, -5);
  group.add(hemi, key, rimL, rimR, sunset);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, sun: sunset.intensity };

  const state = { L: 1, flash: 0, cheer: 0, focus: 0, ripple: null, solo: null, lastBeat: -1, bar: 0, wheelSpin: 0 };
  const lerp = (a, b, t) => a + (b - a) * t;

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const L = state.L;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.45);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    if (whole !== state.lastBeat) { state.lastBeat = whole; if (whole % 4 === 0) state.bar = (state.bar + 1) % NEON.length; }

    // Deck: planks glow in a neon chase along the boards on the beat, a
    // ripple from big moves, a pool of light under the soloist.
    const nc = new THREE.Color(NEON[state.bar]), nc2 = new THREE.Color(NEON[(state.bar + 2) % NEON.length]);
    planks.forEach((q, i) => {
      const lane = ((q.iz + whole) % 3 + 3) % 3 === 0;
      let k = (lane ? 0.28 * onBeat : 0) * L;
      if (state.ripple) { const r = (songTime - state.ripple.t) * 7, d = Math.hypot(q.x - state.ripple.x, q.z); k = Math.max(k, 0.8 * Math.exp(-Math.pow((d - r) * 1.6, 2)) * (1 - Math.min(1, r / 10)) * L); }
      col.set(woods[(i * 7) % 4]).multiplyScalar(0.55 + 0.45 * L);
      col.lerp(lane ? nc : nc2, Math.min(1, k));
      if (soloK > 0) { const near = Math.exp(-Math.pow(Math.hypot(q.x - soloX, q.z - 0.2) / 1.3, 2)); col.multiplyScalar(1 - 0.55 * soloK + 0.9 * soloK * near); }
      plankMesh.setColorAt(i, col.multiplyScalar(1 + state.flash * 0.3));
    });
    plankMesh.instanceColor.needsUpdate = true;
    ring.material.color.set(NEON[state.bar]).multiplyScalar(0.5 + 0.8 * onBeat * L);
    ring2.material.color.set(NEON[(state.bar + 1) % NEON.length]).multiplyScalar(0.4 + 0.5 * (1 - onBeat) * L);
    for (let i = 0; i < 16; i++) railBulbs.setColorAt(i, col.set(NEON[(i + whole) % NEON.length]).multiplyScalar(((i + whole) % 2 ? 0.4 : 1) * L + 0.1));
    railBulbs.instanceColor.needsUpdate = true;
    for (let i = 0; i < NB * 2; i++) strBulbs.setColorAt(i, col.set(NEON[(Math.floor(i / 2) + whole) % 3 === 0 ? 2 : 0]).multiplyScalar(0.5 + 0.5 * ((Math.floor(i / 2) + whole) % 3 === 0 ? onBeat : 0.3)));
    strBulbs.instanceColor.needsUpdate = true;
    state.wheelSpin = Math.max(0, state.wheelSpin - dt * 0.5);
    wheelRot.rotation.z += dt * (0.12 + 0.8 * state.wheelSpin);
    cabs.forEach(c => { c.rotation.z = -wheelRot.rotation.z; });
    for (let i = 0; i < 24; i++) wBulbs.setColorAt(i, col.set(NEON[(i + whole) % NEON.length]).multiplyScalar((i + whole) % 4 === 0 ? 0.6 + onBeat : 0.5));
    wBulbs.instanceColor.needsUpdate = true;
    sign.material.opacity = L * (0.85 + 0.15 * onBeat);

    // Ocean, foam, sun.
    ocean.material.uniforms.uT.value = songTime; ocean.material.uniforms.uPulse.value = onBeat * L;
    foams.forEach((f, i) => { const u = ((songTime * 0.12 + i / 3) % 1); f.position.set(0, -0.6, -16 + u * 6.5); f.material.opacity = 0.7 * Math.sin(Math.PI * u); });
    sky.material.uniforms.uPulse.value = onBeat * 0.5 * L + state.flash * 0.5;

    // Palms sway (a lean on each beat), robot cruising and bobbing.
    for (const pm of palms) { pm.crown.rotation.z = 0.08 * Math.sin(Math.PI * beat + pm.phase) + 0.05 * onBeat; pm.crown.rotation.x = 0.05 * Math.sin(songTime * 0.7 + pm.phase); }
    rHead.rotation.z = 0.18 * Math.sin(Math.PI * beat); rHead.position.y = 0.72 + 0.04 * onBeat;
    rArm.rotation.x = -2.4 + 0.35 * Math.sin(TAU2 * beat);
    antTip.material.color.set(NEON[(whole) % NEON.length]);
    car.position.y = -0.6 + 0.03 * onBeat;

    // Beach balls bounce on the kick (higher when the crowd goes off).
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3);
    balls.forEach((b, i) => {
      b.kick = Math.max(0, b.kick - dt * 0.6);
      const h = (0.12 + 0.5 * b.kick + 0.15 * hype) * Math.abs(Math.sin(Math.PI * (beat + b.phase)));
      b.x += b.vx * dt; b.vx *= 1 - dt * 0.8; b.x += (b.ox - b.x) * dt * 0.3;
      b.spin += dt * (1 + 3 * b.kick);
      dummy.position.set(b.x, b.y0 + 0.3 + h * (b.z > 4 ? 0.8 : 1.6), b.z); dummy.rotation.set(b.spin, b.spin * 0.7, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      ballMesh.setMatrixAt(i, dummy.matrix);
    });
    ballMesh.instanceMatrix.needsUpdate = true;

    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.3;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.6); c.cone.rotation.x = -0.12;
      coneMats[i].color.set(soloK > 0.5 ? 0xfff0e0 : NEON[(state.bar + i) % NEON.length]);
      coneMats[i].opacity = (0.015 + 0.03 * onBeat + 0.05 * lead + 0.1 * state.flash + 0.09 * soloK) * L;
    });

    crowd.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.phase * 0.3)) * (0.06 + 0.3 * hype * c.hype) * L * (1 - 0.6 * soloK);
      const sway = Math.sin(Math.PI * beat + c.phase) * 0.15;
      dummy.position.set(c.x + sway * 0.3, c.y + 0.55 + jump, c.z);
      dummy.rotation.set(0, Math.atan2(-c.x, -c.z + 8) * 0.3, sway * 0.5 + state.focus * 0.1 * Math.sign(-c.x || 1));
      dummy.scale.setScalar(1); dummy.updateMatrix(); bodyMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.62; dummy.updateMatrix(); headMesh.setMatrixAt(i, dummy.matrix);
      const armUp = hype > 0.6 ? 2.5 + 0.3 * Math.sin(beat * Math.PI * 2 + c.phase) : 0.9 + 0.6 * Math.sin(beat * Math.PI + c.phase);
      for (const sd of [-1, 1]) {
        dummy.position.set(c.x + sway * 0.3 + sd * 0.28, c.y + 0.85 + jump, c.z);
        dummy.rotation.set(0, 0, sd * armUp + sway); dummy.updateMatrix();
        armMesh.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
    });
    bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = armMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NG; i++) {
      if (gLife[i] <= 0) continue;
      gLife[i] -= dt;
      gPos[i * 3] += (gVel[i * 3] + Math.sin(songTime * 3 + i) * 0.4) * dt; gPos[i * 3 + 1] += gVel[i * 3 + 1] * dt; gPos[i * 3 + 2] += gVel[i * 3 + 2] * dt;
      if (gLife[i] <= 0 || gPos[i * 3 + 1] < 0) { gLife[i] = 0; gPos[i * 3 + 1] = -100; }
    }
    gGeo.attributes.position.needsUpdate = true;

    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.5 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    sunset.intensity = base.sun * L * (0.8 + 0.4 * onBeat + state.flash);
  }
  const TAU2 = Math.PI * 2;

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); kickBalls(0.6, x); }
        if (data.tier >= 4) { state.flash = 0.6; burst(60, x); state.wheelSpin = 1; }
        break;
      case 'taunt': state.flash = 0.35; break;
      case 'tauntLanded': kickBalls(1.2, data.attacker === 'rival' ? 1.6 : -1.6); burst(80, data.attacker === 'rival' ? -1.6 : 1.6, 4); state.flash = 1; state.cheer = 1; break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5; kickBalls(0.5, 0); break;
      case 'end': burst(200, x, 6); kickBalls(1.4, x); state.cheer = 1; state.flash = 1; state.wheelSpin = 1; break;
      case 'drop': state.flash = 1; burst(80, 0, 8); kickBalls(1, 0); break;
      case 'solo': state.solo = { x, t0: data.songTime, t1: data.until }; state.flash = 0.8; state.cheer = 1; burst(90, x); state.wheelSpin = 1; break;
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
