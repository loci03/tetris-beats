// THE UNDERGROUND — the Level 1 battle stage.
//
// A warehouse rave under the city: concrete floor with an LED dance ring,
// a graffiti wall with the club's neon sign, steel girders with swinging
// work lamps, neon tubes and lasers that hit the beat, a subway train
// rattling past the back windows, speaker stacks, a crowd behind a chain
// fence, sparks and smoke for the big moments. Same interface as the taco
// world: { group, anchors, update, react, setLightLevel, dispose }.

import * as THREE from '../../vendor/three/three.module.min.js';

const NEON = [0xff2d6f, 0x29e7ff, 0xb35cff, 0xffd23f, 0x3dff9a];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildUndergroundWorld({ lowGraphics = false } = {}) {
  const group = new THREE.Group();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const col = new THREE.Color();

  // ── Room: concrete floor, back wall, side walls, ceiling ─────────
  const concreteTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2730'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  }));
  concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
  concreteTex.repeat.set(10, 10);
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(60, 60)), toon(0x8a8494, { map: concreteTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  group.add(floor);

  // Graffiti wall
  const graffitiTex = keep(canvasTex(2048, 512, (g, w, h) => {
    g.fillStyle = '#3a3440'; g.fillRect(0, 0, w, h);
    // bricks
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) g.strokeRect(x, y, 64, 32);
    // spray blobs + tags
    const sprays = ['#ff2d6f', '#29e7ff', '#ffd23f', '#3dff9a', '#b35cff', '#ff8a1a'];
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * w, y = 120 + Math.random() * 300, r = 60 + Math.random() * 120;
      const gr = g.createRadialGradient(x, y, 4, x, y, r);
      gr.addColorStop(0, sprays[i % sprays.length] + 'cc'); gr.addColorStop(1, sprays[i % sprays.length] + '00');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const tag = (txt, x, y, size, fill, rot) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
      g.lineJoin = 'round'; g.lineWidth = size * 0.16; g.strokeStyle = '#111';
      g.strokeText(txt, 0, 0); g.fillStyle = fill; g.fillText(txt, 0, 0);
      g.restore();
    };
    tag('BOOM', 230, 330, 120, '#ffd23f', -0.12);
    tag('BEATS', 1830, 300, 130, '#29e7ff', 0.08);
    tag('GROOVE', 520, 420, 80, '#ff2d6f', 0.05);
    tag('DROP IT', 1530, 430, 80, '#3dff9a', -0.06);
    tag('★', 1200, 420, 110, '#b35cff', 0.2);
  }));
  const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(28, 7)), toon(0xffffff, { map: graffitiTex }));
  wall.position.set(0, 3.3, -6.5);
  group.add(wall);
  const sideMat = toon(0x2c2834, { map: concreteTex });
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(keep(new THREE.PlaneGeometry(20, 7)), sideMat);
    side.position.set(sx * 11, 3.3, 2);
    side.rotation.y = -sx * Math.PI / 2;
    group.add(side);
  }
  const ceiling = new THREE.Mesh(keep(new THREE.PlaneGeometry(30, 22)), toon(0x141218));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 6.8, 1);
  group.add(ceiling);

  // Neon club sign on the wall
  const signTex = keep(canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = '900 120px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#29e7ff'; g.shadowBlur = 40;
    g.strokeStyle = '#7ff4ff'; g.lineWidth = 9;
    g.strokeText('UNDERGROUND', w / 2, h / 2);
    g.shadowBlur = 18; g.fillStyle = '#eaffff';
    g.fillText('UNDERGROUND', w / 2, h / 2);
  }));
  const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(7.2, 1.8)), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false }));
  sign.position.set(0, 5.4, -6.4);
  group.add(sign);

  // ── Back windows with a passing subway train ─────────────────────
  const windowMat = basic(0x0b0a12);
  const winGeo = keep(new THREE.PlaneGeometry(2.2, 1.1));
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const w = new THREE.Mesh(winGeo, windowMat);
    w.position.set(i * 3.4, 1.75, -6.45);
    group.add(w);
    const frame = new THREE.LineSegments(keep(new THREE.EdgesGeometry(winGeo)), keep(new THREE.LineBasicMaterial({ color: 0x55505f })));
    frame.position.copy(w.position);
    group.add(frame);
  }
  const train = new THREE.Group();
  const carTex = keep(canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#b8bcc8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe9a8';
    for (let x = 18; x < w - 40; x += 62) g.fillRect(x, 30, 44, 40);
    g.fillStyle = '#ff2d6f'; g.fillRect(0, 86, w, 10);
    g.fillStyle = '#1b1b22'; g.font = '900 22px sans-serif'; g.fillText('L LINE', 20, 116);
  }));
  for (let k = 0; k < 3; k++) {
    const car = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 2.2)), basic(0xffffff, { map: carTex }));
    car.position.set(k * 9.2, 1.75, -7.2);
    train.add(car);
  }
  train.position.x = -60;
  group.add(train);
  const trainState = { x: -60, active: false, nextBar: 6 };

  // ── Steel girders + swinging work lamps ──────────────────────────
  const steel = toon(0x3b3846);
  for (const z of [-3.5, 0.5, 4.5]) {
    const beam = new THREE.Mesh(keep(new THREE.BoxGeometry(24, 0.32, 0.3)), steel);
    beam.position.set(0, 6.3, z);
    group.add(beam);
  }
  for (const x of [-7.5, 7.5]) for (const z of [-5.8, 4.5]) {
    const post = new THREE.Mesh(keep(new THREE.BoxGeometry(0.34, 6.8, 0.34)), steel);
    post.position.set(x, 3.4, z);
    group.add(post);
  }
  const lamps = [];
  const lampGlow = basic(0xffe2a0);
  for (const [x, z] of [[-3.2, -1.2], [0, 0.6], [3.2, -1.2], [-5.5, 2.4], [5.5, 2.4]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 6.3, z);
    const cord = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4)), basic(0x111111));
    cord.position.y = -0.7;
    pivot.add(cord);
    const shade = new THREE.Mesh(keep(new THREE.ConeGeometry(0.32, 0.34, 14, 1, true)), toon(0x26323a, { side: THREE.DoubleSide }));
    shade.position.y = -1.5;
    pivot.add(shade);
    const bulb = new THREE.Mesh(keep(new THREE.SphereGeometry(0.11, 10, 8)), lampGlow);
    bulb.position.y = -1.62;
    pivot.add(bulb);
    group.add(pivot);
    lamps.push({ pivot, phase: x * 0.7 + z });
  }

  // ── Neon tubes on the walls ──────────────────────────────────────
  const tubes = [];
  const tubeGeo = keep(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 8));
  for (let i = 0; i < 6; i++) {
    const sx = i < 3 ? -1 : 1, k = i % 3;
    const mat = basic(NEON[i % NEON.length]);
    const t = new THREE.Mesh(tubeGeo, mat);
    t.position.set(sx * 10.9, 1.2 + k * 1.6, 1.5 - k * 0.4);
    t.rotation.x = Math.PI / 2;
    group.add(t);
    tubes.push({ mesh: t, mat, base: NEON[i % NEON.length] });
  }
  for (let i = 0; i < 2; i++) {
    const mat = basic(NEON[(i + 1) % NEON.length]);
    const t = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.05, 9, 8)), mat);
    t.position.set(i ? 6.5 : -6.5, 0.6, -6.35);
    t.rotation.z = Math.PI / 2;
    group.add(t);
    tubes.push({ mesh: t, mat, base: NEON[(i + 1) % NEON.length] });
  }

  // ── Dance floor: LED ring + tiles ────────────────────────────────
  const tileSize = 0.62;
  const tiles = [];
  for (let ix = -7; ix <= 7; ix++) for (let iz = -6; iz <= 6; iz++) {
    const x = ix * tileSize, z = iz * tileSize;
    const r = Math.hypot(x, z);
    if (r > 4.3) continue;
    tiles.push({ x, z, r, ang: Math.atan2(z, x) });
  }
  const tileMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(tileSize * 0.92, 0.05, tileSize * 0.92)), basic(0xffffff), tiles.length);
  const m4 = new THREE.Matrix4();
  tiles.forEach((t, i) => { m4.makeTranslation(t.x, 0.02, t.z); tileMesh.setMatrixAt(i, m4); tileMesh.setColorAt(i, col.set(0x121018)); });
  group.add(tileMesh);
  const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(4.45, 0.06, 8, 96)), basic(0x29e7ff));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  // ── Lasers ───────────────────────────────────────────────────────
  const lasers = [];
  const laserGeo = keep(new THREE.CylinderGeometry(0.018, 0.018, 16, 6));
  laserGeo.translate(0, -8, 0);
  for (let i = 0; i < (lowGraphics ? 4 : 8); i++) {
    const mat = keep(new THREE.MeshBasicMaterial({ color: NEON[i % NEON.length], transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    const l = new THREE.Mesh(laserGeo, mat);
    l.position.set(i % 2 ? 6.2 : -6.2, 6.2, -5.5 + (i >> 1) * 0.4);
    group.add(l);
    lasers.push({ mesh: l, mat, side: i % 2 ? 1 : -1, phase: i * 0.9 });
  }

  // ── Speakers ─────────────────────────────────────────────────────
  const speakers = [];
  const cabMat = toon(0x121016), coneMat = toon(0x34323c), ringMat = basic(0x29e7ff);
  for (const sx of [-1, 1]) {
    const stack = new THREE.Group();
    stack.position.set(sx * 6.2, 0, -2.2);
    for (let k = 0; k < 3; k++) {
      const cab = new THREE.Mesh(keep(new THREE.BoxGeometry(1.5, 1.2, 1.1)), cabMat);
      cab.position.y = 0.6 + k * 1.24;
      stack.add(cab);
      const woofer = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 24)), coneMat);
      woofer.rotation.x = Math.PI / 2;
      woofer.position.set(0, 0.6 + k * 1.24, 0.56);
      stack.add(woofer);
      const rr = new THREE.Mesh(keep(new THREE.TorusGeometry(0.44, 0.035, 6, 24)), ringMat);
      rr.position.set(0, 0.6 + k * 1.24, 0.6);
      stack.add(rr);
      speakers.push(woofer);
    }
    stack.rotation.y = -sx * 0.4;
    group.add(stack);
  }

  // ── Chain fence + crowd ──────────────────────────────────────────
  const fenceTex = keep(canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(190,190,205,0.85)'; g.lineWidth = 3;
    for (let i = -h; i < w; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
  }));
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
  fenceTex.repeat.set(10, 1);
  const fence = new THREE.Mesh(keep(new THREE.PlaneGeometry(20, 1.4)), basic(0xffffff, { map: fenceTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  fence.position.set(0, 0.7, 5.2);
  group.add(fence);

  const crowdSpots = [];
  const crowdScale = lowGraphics ? 0.6 : 1;
  const addRow = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) crowdSpots.push({ x: x0 + (x1 - x0) * (i + Math.random() * 0.4) / n, z: z + Math.random() * 0.5, y }); };
  addRow(Math.round(14 * crowdScale), -7, 7, 5.8, -0.45);
  addRow(Math.round(16 * crowdScale), -8, 8, 6.8, -0.55);
  addRow(Math.round(6 * crowdScale), -10, -7.4, 0.5, 0);
  addRow(Math.round(6 * crowdScale), 7.4, 10, 0.5, 0);
  const crowdN = crowdSpots.length;
  const bodyMesh = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.26, 0.55, 4, 8)), toon(0xffffff), crowdN);
  const headMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.2, 10, 8)), toon(0xffffff), crowdN);
  const armMesh = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6)), toon(0xffffff), crowdN * 2);
  const skin = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22];
  const shirts = [0x22222c, 0x3a2c4a, 0x1d3540, 0x4a1d2c, 0x2c2c2c, 0xd0d0d8];
  crowdSpots.forEach((c, i) => {
    c.phase = Math.random() * Math.PI * 2;
    c.hype = 0.6 + Math.random() * 0.6;
    bodyMesh.setColorAt(i, col.set(shirts[i % shirts.length]));
    headMesh.setColorAt(i, col.set(skin[i % skin.length]));
    armMesh.setColorAt(i * 2, col.set(skin[i % skin.length]));
    armMesh.setColorAt(i * 2 + 1, col.set(skin[i % skin.length]));
  });
  group.add(bodyMesh, headMesh, armMesh);

  // ── Sparks (big moments) ─────────────────────────────────────────
  const SPK = lowGraphics ? 200 : 420;
  const spkPos = new Float32Array(SPK * 3), spkCol = new Float32Array(SPK * 3), spkVel = new Float32Array(SPK * 3), spkLife = new Float32Array(SPK);
  for (let i = 0; i < SPK; i++) {
    col.set(i % 3 ? 0xffb03a : NEON[i % NEON.length]);
    spkCol[i * 3] = col.r; spkCol[i * 3 + 1] = col.g; spkCol[i * 3 + 2] = col.b;
    spkPos[i * 3 + 1] = -100;
  }
  const spkGeo = keep(new THREE.BufferGeometry());
  spkGeo.setAttribute('position', new THREE.BufferAttribute(spkPos, 3));
  spkGeo.setAttribute('color', new THREE.BufferAttribute(spkCol, 3));
  const sparks = new THREE.Points(spkGeo, keep(new THREE.PointsMaterial({ size: 0.1, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })));
  sparks.frustumCulled = false;
  group.add(sparks);
  let spkCursor = 0;
  function burstSparks(n, x, y = 5.5, up = false) {
    for (let k = 0; k < n; k++) {
      const i = spkCursor = (spkCursor + 1) % SPK;
      spkPos[i * 3] = x + (Math.random() - 0.5) * 1.5;
      spkPos[i * 3 + 1] = y;
      spkPos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3;
      spkVel[i * 3] = Math.cos(a) * sp;
      spkVel[i * 3 + 1] = up ? 3 + Math.random() * 4 : Math.random() * 2;
      spkVel[i * 3 + 2] = Math.sin(a) * sp * 0.6;
      spkLife[i] = 1.6 + Math.random();
    }
  }

  // ── Tetris reactions (backdrop piece events) ─────────────────────
  // Confetti rains from the girders on line clears (pooled instanced quads),
  // phones flash in the crowd, the LED floor chases the piece, lasers and
  // lamps get kicked around. All pooled at build time.
  const CONF = lowGraphics ? 160 : 320;
  const confMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.13, 0.08)), basic(0xffffff, { side: THREE.DoubleSide }), CONF);
  const confP = new Float32Array(CONF * 3), confV = new Float32Array(CONF * 3), confR = new Float32Array(CONF * 3), confLife = new Float32Array(CONF);
  const CONF_COLS = [0x29e7ff, 0xff2d6f, 0xffffff, 0xffd23f, 0xff66cc, 0x3dff9a];
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < CONF; i++) { confMesh.setColorAt(i, col.set(CONF_COLS[i % CONF_COLS.length])); confMesh.setMatrixAt(i, hidden); }
  confMesh.frustumCulled = false;
  group.add(confMesh);
  let confCursor = 0, confAlive = 0;
  function spawnConfetti(n, cx = 0, spread = 8) {
    for (let k = 0; k < n; k++) {
      const i = confCursor = (confCursor + 1) % CONF;
      confP[i * 3] = cx + (Math.random() - 0.5) * spread * 2;
      confP[i * 3 + 1] = 6.1 + Math.random() * 0.3;
      confP[i * 3 + 2] = -4 + Math.random() * 7;
      confV[i * 3] = (Math.random() - 0.5) * 1.2;
      confV[i * 3 + 1] = -0.4 - Math.random() * 1.2;
      confV[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      confR[i * 3] = Math.random() * 6; confR[i * 3 + 1] = Math.random() * 6; confR[i * 3 + 2] = 2 + Math.random() * 5;
      if (confLife[i] <= 0) confAlive++;
      confLife[i] = 3.5 + Math.random() * 1.5;
    }
  }
  // Phone camera flashes over the crowd (front rows + the side pits).
  const FL = 24;
  const flPos = new Float32Array(FL * 3), flCol = new Float32Array(FL * 3), flLife = new Float32Array(FL);
  for (let i = 0; i < FL; i++) flPos[i * 3 + 1] = -100;
  const flGeo = keep(new THREE.BufferGeometry());
  flGeo.setAttribute('position', new THREE.BufferAttribute(flPos, 3));
  flGeo.setAttribute('color', new THREE.BufferAttribute(flCol, 3));
  const flashes = new THREE.Points(flGeo, keep(new THREE.PointsMaterial({ size: 0.45, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, map: keep(canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  })) })));
  flashes.frustumCulled = false;
  group.add(flashes);
  let flCursor = 0;
  // Visible phone spots: along the fence line and on the side walls' crowd pits.
  function camFlash(n) {
    for (let k = 0; k < n; k++) {
      const i = flCursor = (flCursor + 1) % FL;
      const side = Math.random();
      if (side < 0.5) { flPos[i * 3] = (Math.random() - 0.5) * 12; flPos[i * 3 + 1] = 1.2 + Math.random() * 0.5; flPos[i * 3 + 2] = 4.9 + Math.random() * 0.4; }
      else { const sx = Math.random() < 0.5 ? -1 : 1; flPos[i * 3] = sx * (5.6 + Math.random() * 1.2); flPos[i * 3 + 1] = 1.3 + Math.random() * 1.2; flPos[i * 3 + 2] = -1 + Math.random() * 4; }
      flLife[i] = 0.18 + Math.random() * 0.12;
    }
  }
  // Damped springs for the kicked props.
  const springs = { laser: [0, 0], lamp: [0, 0], spin: [0, 0] };
  const spring = (s, dt, hz, damp) => {
    const w = 2 * Math.PI * hz, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) { s[1] += (-w * w * s[0] - 2 * damp * w * s[1]) * h; s[0] += s[1] * h; }
    return s[0];
  };
  const colX = (c) => (c == null ? 0 : (c - 4.5) * 0.8);

  // ── Lights ───────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xb0c0ff, 0x2a1030, 0.9);
  const key = new THREE.DirectionalLight(0xfff0e0, 1.35);
  key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(0xff2d6f, 20, 12, 1.6);
  rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0x29e7ff, 20, 12, 1.6);
  rimR.position.set(3.5, 3, -1.5);
  const wash = new THREE.PointLight(0xb35cff, 10, 16, 1.5);
  wash.position.set(0, 4.5, -4.5);
  group.add(hemi, key, rimL, rimR, wash);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, wash: wash.intensity };

  // ── Update ───────────────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, focus: 0, lastBeat: -1, barColor: 0, ripple: null, solo: null,
    sweep: null, spot: null, shock: null, boom: 0, strobe: 0, hold: 0, ringHop: 0, rainbow: 0, dark: 0, flashAmb: 0, combo: 0 };
  const dummy = new THREE.Object3D();
  const cA = new THREE.Color(), cB = new THREE.Color(), dim = new THREE.Color(0x0e0c14), tmp = new THREE.Color(), white = new THREE.Color(0xffffff);

  function update(dt, info) {
    const { beat } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6);
    const whole = Math.floor(beat), bar = Math.floor(beat / 4);
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 2.4);
    state.cheer = Math.max(0, state.cheer - dt * 0.5);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    // SOLO TIME: house lights down, lasers and the floor converge on the soloist.
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const st = info.songTime, so = state.solo;
      soloK = Math.min(1, Math.max(0, (st - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - st) / 0.5));
      soloX = so.x;
      if (st > so.t1) state.solo = null;
    }
    if (whole !== state.lastBeat) {
      state.lastBeat = whole;
      if (whole % 4 === 0) state.barColor = (state.barColor + 1) % NEON.length;
    }

    // Floor: radial pulse rings from the centre on every beat.
    // Piece reactions decay.
    state.boom = Math.max(0, state.boom - dt * 3);
    state.strobe = Math.max(0, state.strobe - dt);
    state.hold = Math.max(0, state.hold - dt * 1.5);
    state.rainbow = Math.max(0, state.rainbow - dt);
    state.dark = Math.max(0, state.dark - dt * 0.25);
    const strobeOn = state.strobe > 0 && (Math.floor(info.songTime * 14) & 1) ? 1 : 0;
    const laserKick = spring(springs.laser, dt, 1.6, 0.25), lampKick = spring(springs.lamp, dt, 0.9, 0.12), spin = spring(springs.spin, dt, 1.2, 0.3);
    const hop = Math.round(state.ringHop) % NEON.length;
    const pal = (state.barColor + hop + (state.hold > 0.5 ? 2 : 0)) % NEON.length;
    cA.set(NEON[pal]); cB.set(NEON[(pal + 1) % NEON.length]);
    const sw = state.sweep, swAge = sw ? info.songTime - sw.t : 0;
    if (sw && swAge > 1.2) state.sweep = null;
    const spot = state.spot, spAge = spot ? info.songTime - spot.t : 0;
    if (spot && spAge > 0.6) state.spot = null;
    const sh = state.shock, shAge = sh ? info.songTime - sh.t : 0;
    if (sh && shAge > 1.1) state.shock = null;
    tiles.forEach((t, i) => {
      const wave = Math.exp(-Math.pow((t.r - ph * 5.2) * 1.6, 2)) * (0.3 + 0.7 * (1 - ph));
      const spoke = ((Math.floor((t.ang + Math.PI + spin) / (Math.PI / 4)) + whole) & 1) ? 0.14 : 0.05;
      let k = (spoke + wave * 0.9) * L;
      if (state.ripple) {
        const rr = (info.songTime - state.ripple.t) * 7;
        const d = Math.hypot(t.x - state.ripple.x, t.z);
        k = Math.max(k, Math.exp(-Math.pow((d - rr) * 1.8, 2)) * (1 - Math.min(1, rr / 10)) * L);
      }
      if (soloK > 0) {
        const near = Math.exp(-Math.pow(Math.hypot(t.x - soloX, t.z) / 1.3, 2));
        k = k * (1 - 0.75 * soloK) + soloK * near * (0.6 + 0.4 * onBeat);
      }
      let hot = 0;
      if (sw) { const fx = sw.x + sw.dir * swAge * 9; hot = Math.exp(-Math.pow((t.x - fx) * 2.2, 2)) * (1 - swAge / 1.2) * sw.k; }
      if (spot) hot = Math.max(hot, Math.exp(-Math.pow(Math.hypot(t.x - spot.x, t.z - 0.8) * 1.6, 2)) * (1 - spAge / 0.6));
      if (sh) hot = Math.max(hot, Math.exp(-Math.pow((Math.hypot(t.x - sh.x, t.z - 0.5) - shAge * 6) * 2, 2)) * (1 - shAge / 1.1) * sh.k);
      k = Math.max(k, hot * L) * (1 - 0.7 * state.dark);
      tmp.copy(dim).lerp(wave > 0.3 ? cA : cB, Math.min(1, k)).multiplyScalar(0.6 + 0.8 * k + state.flash * 0.5);
      if (hot > 0.05) tmp.lerp(white, hot * 0.45);
      if (strobeOn) tmp.lerp(white, 0.6);
      tileMesh.setColorAt(i, tmp);
    });
    tileMesh.instanceColor.needsUpdate = true;
    if (state.rainbow > 0) ring.material.color.setHSL((info.songTime * 1.5) % 1, 1, 0.6); else ring.material.color.set(NEON[pal]);
    ring.material.color.multiplyScalar((0.4 + 0.6 * onBeat) * L + state.flash * 0.3 + state.boom * 0.6);

    // Lasers sweep, strobe on the beat; neon tubes pulse and flicker.
    lasers.forEach((l, i) => {
      const aim = Math.atan2(soloX - l.mesh.position.x, 6.0);
      l.mesh.rotation.z = l.side * (0.55 + 0.35 * Math.sin(info.songTime * 1.3 + l.phase)) * (1 - soloK) + aim * soloK + laserKick * 0.5;
      l.mesh.rotation.x = 0.35 + 0.25 * Math.sin(info.songTime * 0.9 + l.phase * 2) + spin * 0.25 * l.side;
      l.mat.opacity = Math.min(1, (0.12 + 0.45 * onBeat + state.flash * 0.4 + Math.abs(laserKick) * 0.5 + strobeOn * 0.5) * L * ((whole + i) % 2 ? 1 : 0.5)) * (1 - 0.8 * state.dark);
      if (state.rainbow > 0) l.mat.color.setHSL((info.songTime * 1.2 + i * 0.13) % 1, 1, 0.55); else l.mat.color.set(NEON[(pal + i) % NEON.length]);
    });
    tubes.forEach((t, i) => {
      const flick = Math.sin(info.songTime * 23 + i * 7) > 0.985 ? 0.25 : 1;
      t.mat.color.set(state.hold > 0.05 ? NEON[(i + pal + 2) % NEON.length] : t.base).multiplyScalar((0.35 + 0.65 * (((whole + i) % 3 === 0) ? onBeat : 0.4)) * L * flick * (1 - 0.8 * state.dark) + state.flash * 0.3 + strobeOn * 0.5);
    });
    const holdFlick = state.hold > 0.05 && Math.sin(info.songTime * 47) > 0 ? 0.15 : 1;
    sign.material.opacity = L * (0.8 + 0.2 * onBeat) * ((Math.sin(info.songTime * 13) > 0.97) ? 0.35 : 1) * holdFlick * (1 - 0.7 * state.dark);
    if (state.rainbow > 0) sign.material.color.setHSL((info.songTime * 2) % 1, 1, 0.7); else sign.material.color.setScalar(1 + state.boom * 0.4);
    sign.scale.setScalar(1 + state.boom * 0.06 + (state.rainbow > 0 ? 0.08 * onBeat : 0));

    // Lamps swing, speakers pump.
    for (const lp of lamps) { lp.pivot.rotation.z = Math.sin(info.songTime * 1.6 + lp.phase) * 0.12 + onBeat * 0.03 + lampKick; lp.pivot.rotation.x = lampKick * 0.4 * Math.sin(lp.phase); }
    const pump = 1 + 0.2 * onBeat * L + state.boom * 0.45;
    const pumpR = Math.min(1.12, pump);
    for (const w of speakers) w.scale.set(pumpR, 1, pumpR);
    ringMat.color.set(state.boom > 0.3 ? 0xffffff : 0x29e7ff).multiplyScalar(1 + state.boom);

    // Confetti from the girders: flutter down, tumble, settle on the floor.
    if (confAlive > 0) {
      for (let i = 0; i < CONF; i++) {
        if (confLife[i] <= 0) continue;
        confLife[i] -= dt;
        const j = i * 3;
        if (confP[j + 1] > 0.03) {
          confV[j + 1] = Math.max(-1.6, confV[j + 1] - 2.2 * dt);
          confP[j] += (confV[j] + Math.sin(info.songTime * 3 + i) * 0.6) * dt;
          confP[j + 1] += confV[j + 1] * dt;
          confP[j + 2] += confV[j + 2] * dt;
          confR[j] += confR[j + 2] * dt; confR[j + 1] += confR[j + 2] * 0.7 * dt;
        } else { confP[j + 1] = 0.03; confR[j] = Math.PI / 2; }
        if (confLife[i] <= 0) { confAlive--; confMesh.setMatrixAt(i, hidden); continue; }
        dummy.position.set(confP[j], confP[j + 1], confP[j + 2]);
        dummy.rotation.set(confR[j], confR[j + 1], 0);
        dummy.scale.setScalar(Math.min(1, confLife[i] * 2));
        dummy.updateMatrix();
        confMesh.setMatrixAt(i, dummy.matrix);
      }
      confMesh.instanceMatrix.needsUpdate = true;
    }
    // Phone flashes: ambient pops + bursts on big moments.
    if (Math.random() < dt * (1.2 + state.cheer * 10 + state.flashAmb * 14)) camFlash(1);
    state.flashAmb = Math.max(0, state.flashAmb - dt * 0.4);
    for (let i = 0; i < FL; i++) {
      if (flLife[i] <= 0) continue;
      flLife[i] -= dt;
      const v = Math.max(0, flLife[i] / 0.3);
      flCol[i * 3] = flCol[i * 3 + 1] = flCol[i * 3 + 2] = v * L;
      if (flLife[i] <= 0) { flPos[i * 3 + 1] = -100; flCol[i * 3] = flCol[i * 3 + 1] = flCol[i * 3 + 2] = 0; }
    }
    flGeo.attributes.position.needsUpdate = flGeo.attributes.color.needsUpdate = true;

    // Subway train every ~8 bars.
    if (!trainState.active && bar >= trainState.nextBar) { trainState.active = true; trainState.x = -40; trainState.nextBar = bar + 8; }
    if (trainState.active) {
      trainState.x += dt * 26;
      train.position.x = trainState.x;
      train.position.y = Math.sin(info.songTime * 30) * 0.02;
      if (trainState.x > 30) { trainState.active = false; train.position.x = -60; }
    }

    // Crowd behind the fence.
    const hype = Math.min(1, 0.35 + state.cheer + Math.abs(state.focus) * 0.3);
    crowdSpots.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.phase * 0.3)) * (0.08 + 0.35 * hype * c.hype) * L;
      dummy.position.set(c.x, c.y + 0.55 + jump, c.z);
      dummy.rotation.set(0, Math.atan2(-c.x, -c.z + 8) * 0.3, state.focus * 0.15 * Math.sign(-c.x || 1));
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.62;
      dummy.updateMatrix();
      headMesh.setMatrixAt(i, dummy.matrix);
      const armUp = hype > 0.6 ? 2.6 : 0.4 + 0.3 * Math.sin(beat * Math.PI + c.phase);
      for (const s of [-1, 1]) {
        dummy.position.set(c.x + s * 0.28, c.y + 0.85 + jump, c.z);
        dummy.rotation.set(0, 0, s * armUp);
        dummy.updateMatrix();
        armMesh.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
      }
    });
    bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = armMesh.instanceMatrix.needsUpdate = true;

    // Sparks
    for (let i = 0; i < SPK; i++) {
      if (spkLife[i] <= 0) continue;
      spkLife[i] -= dt;
      spkVel[i * 3 + 1] -= 6 * dt;
      spkPos[i * 3] += spkVel[i * 3] * dt;
      spkPos[i * 3 + 1] += spkVel[i * 3 + 1] * dt;
      spkPos[i * 3 + 2] += spkVel[i * 3 + 2] * dt;
      if (spkPos[i * 3 + 1] < 0.02) { spkPos[i * 3 + 1] = 0.02; spkVel[i * 3 + 1] *= -0.3; spkVel[i * 3] *= 0.6; }
      if (spkLife[i] <= 0) spkPos[i * 3 + 1] = -100;
    }
    spkGeo.attributes.position.needsUpdate = true;

    // Lights
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    const pk = 1 - 0.6 * state.dark;
    rimL.intensity = base.rimL * L * pk * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, state.focus) + state.flash + strobeOn * 1.5 + state.boom);
    rimR.intensity = base.rimR * L * pk * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -state.focus) + state.flash + strobeOn * 1.5 + state.boom);
    wash.intensity = base.wash * L * pk * (0.6 + 0.6 * onBeat + state.flash + strobeOn * 2);
    hemi.intensity *= pk * (1 + strobeOn * 0.8);
  }

  // Tetris backdrop piece actions (the old 2D warehouse: crowd bob + DJ
  // twitch on input, confetti from the truss and a white stage flash on
  // clears, camera flashes in the crowd).
  function piece(d) {
    const x = colX(d.col), t = d.songTime || 0;
    switch (d.kind) {
      case 'move':
        state.sweep = { t, x, dir: d.dir || 1, k: 0.8 };
        springs.laser[1] += (d.dir || 1) * 2.2;
        if (Math.random() < 0.5) camFlash(1);
        break;
      case 'rotate':
        springs.spin[1] += (d.dir || 1) * 5;
        springs.lamp[1] += (d.dir || 1) * 0.5;
        state.ringHop += 1;
        break;
      case 'soft':
        state.spot = { t, x };
        state.boom = Math.max(state.boom, 0.25);
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.25 + r / 14);
        state.shock = { t, x, k: 0.5 + 0.5 * k };
        state.boom = Math.max(state.boom, 0.5 + k * 0.5);
        springs.lamp[1] += (Math.random() < 0.5 ? -1 : 1) * (0.6 + 1.6 * k);
        springs.laser[1] += (Math.random() - 0.5) * 3 * k;
        burstSparks(Math.round(6 + r * 3), x, 6.2);
        state.flash = Math.max(state.flash, 0.15 + 0.35 * k);
        if (r >= 8) camFlash(3);
        break;
      }
      case 'hold':
        state.hold = 1;
        springs.spin[1] -= 4;
        camFlash(2);
        break;
      case 'clear': {
        const n = Math.max(1, Math.min(4, d.lines || 1)), c = Math.max(0, d.combo || 0);
        spawnConfetti([0, 12, 22, 36, 60][n] + c * 8, x * 0.5, n >= 3 ? 8 : 5);
        state.flash = Math.max(state.flash, [0, 0.15, 0.35, 0.6, 0.85][n] + Math.min(0.3, c * 0.08));
        state.cheer = Math.min(1, state.cheer + [0, 0.35, 0.55, 0.78, 1][n] + Math.min(0.4, c * 0.12));
        state.flashAmb = Math.min(1.5, state.flashAmb + n * 0.25 + c * 0.1);
        camFlash(n * 2 + c);
        state.ringHop += n;
        if (n >= 3 || c >= 2) state.strobe = Math.max(state.strobe, 0.25 * (n - 1) + 0.12 * c);
        if (n >= 4) { burstSparks(60, -4, 6.2); burstSparks(60, 4, 6.2); springs.laser[1] += 6; springs.lamp[1] += 2; }
        break;
      }
      case 'levelUp':
        state.rainbow = 3.5; state.cheer = 1; state.flashAmb = 1.5;
        spawnConfetti(90, 0, 9);
        trainState.active = true; trainState.x = -40;   // the L train roars past
        springs.spin[1] += 8;
        break;
      case 'gameOver':
        state.dark = 1; state.strobe = 0; state.rainbow = 0;
        break;
      case 'start':
        state.dark = 0; state.boom = 1; state.rainbow = 1.2; camFlash(6);
        break;
    }
  }

  function react(type, data = {}) {
    if (type === 'piece') { piece(data); return; }
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); }
        if (data.tier >= 4) { burstSparks(80, x, 6.2); state.flash = 0.6; }
        break;
      case 'tauntLanded':
        burstSparks(120, data.attacker === 'rival' ? 1.6 : -1.6, 0.3, true);
        state.flash = 1; state.cheer = 1;
        break;
      case 'dodge':
        state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5;
        break;
      case 'taunt':
        state.flash = 0.4;
        break;
      case 'end':
        burstSparks(240, x, 6.2); state.cheer = 1; state.flash = 1;
        break;
      case 'drop':
        state.flash = 1; burstSparks(120, 0, 6.2);
        break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1;
        burstSparks(120, x, 0.3, true);
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.05, 0.2), rival: new THREE.Vector3(1.6, 0.05, 0.2) },
    update,
    react,
    setLightLevel(v) { state.lightLevel = Math.max(0, Math.min(1, v)); },
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); },
  };
}
