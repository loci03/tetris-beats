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
  const state = { lightLevel: 1, flash: 0, cheer: 0, focus: 0, lastBeat: -1, barColor: 0, ripple: null, solo: null };
  const dummy = new THREE.Object3D();

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
    const cA = col.clone().set(NEON[state.barColor]), cB = new THREE.Color(NEON[(state.barColor + 1) % NEON.length]);
    const dim = new THREE.Color(0x0e0c14), tmp = new THREE.Color();
    tiles.forEach((t, i) => {
      const wave = Math.exp(-Math.pow((t.r - ph * 5.2) * 1.6, 2)) * (0.3 + 0.7 * (1 - ph));
      const spoke = ((Math.floor((t.ang + Math.PI) / (Math.PI / 4)) + whole) & 1) ? 0.14 : 0.05;
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
      tmp.copy(dim).lerp(wave > 0.3 ? cA : cB, Math.min(1, k)).multiplyScalar(0.6 + 0.8 * k + state.flash * 0.5);
      tileMesh.setColorAt(i, tmp);
    });
    tileMesh.instanceColor.needsUpdate = true;
    ring.material.color.set(NEON[state.barColor]).multiplyScalar((0.4 + 0.6 * onBeat) * L + state.flash * 0.3);

    // Lasers sweep, strobe on the beat; neon tubes pulse and flicker.
    lasers.forEach((l, i) => {
      const aim = Math.atan2(soloX - l.mesh.position.x, 6.0);
      l.mesh.rotation.z = l.side * (0.55 + 0.35 * Math.sin(info.songTime * 1.3 + l.phase)) * (1 - soloK) + aim * soloK;
      l.mesh.rotation.x = 0.35 + 0.25 * Math.sin(info.songTime * 0.9 + l.phase * 2);
      l.mat.opacity = (0.12 + 0.45 * onBeat + state.flash * 0.4) * L * ((whole + i) % 2 ? 1 : 0.5);
      l.mat.color.set(NEON[(state.barColor + i) % NEON.length]);
    });
    tubes.forEach((t, i) => {
      const flick = Math.sin(info.songTime * 23 + i * 7) > 0.985 ? 0.25 : 1;
      t.mat.color.set(t.base).multiplyScalar((0.35 + 0.65 * (((whole + i) % 3 === 0) ? onBeat : 0.4)) * L * flick + state.flash * 0.3);
    });
    sign.material.opacity = L * (0.8 + 0.2 * onBeat) * ((Math.sin(info.songTime * 13) > 0.97) ? 0.35 : 1);

    // Lamps swing, speakers pump.
    for (const lp of lamps) lp.pivot.rotation.z = Math.sin(info.songTime * 1.6 + lp.phase) * 0.12 + onBeat * 0.03;
    const pump = 1 + 0.2 * onBeat * L;
    for (const w of speakers) w.scale.set(pump, 1, pump);

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
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, state.focus) + state.flash);
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -state.focus) + state.flash);
    wash.intensity = base.wash * L * (0.6 + 0.6 * onBeat + state.flash);
  }

  function react(type, data = {}) {
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
