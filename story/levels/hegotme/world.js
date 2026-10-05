// HE GOT ME — a radiant cathedral stage. Cream-and-gold marble floor, a low
// gold altar rail with candles, stone pillars and pointed arches, tall
// stained-glass lancets and a rose window that blaze on the beat, god rays
// pouring down through the incense haze, a robed choir swaying and clapping
// on the risers, doves wheeling overhead and a congregation down front with
// their hands up. Everything is driven by the music clock via update().

import * as THREE from '../../../vendor/three/three.module.min.js';

const GOLD = 0xffcf4a, STONE = 0xcbb89a, TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (x) => ((x % 1) + 1) % 1;
const GLASS = ['#1f4fd8', '#c8102e', '#ffc13a', '#1f9a5a', '#7a2fbf', '#29b6e8'];

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
    const t = new THREE.DataTexture(new Uint8Array([90, 175, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = group) => { const m = new THREE.Mesh(keep(geo), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const goldMat = toon(GOLD, { emissive: 0x3a2800 });
  const stone = toon(STONE, { emissive: 0x1a1208 });

  // ── Vaulted dome: warm stone fading up into gold light ───────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(70, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uLight: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse; uniform float uLight;
      void main(){
        float h = vP.y;
        vec3 c = mix(vec3(0.22,0.15,0.08), vec3(0.32,0.24,0.12), smoothstep(-0.1, 0.4, h));
        c = mix(c, vec3(0.5,0.4,0.22), smoothstep(0.4, 0.9, h));
        c += vec3(0.4,0.32,0.15) * uPulse * smoothstep(0.3, 0.9, h);
        gl_FragColor = vec4(c * (0.35 + 0.65 * uLight), 1.0);
      }`,
  })));
  group.add(sky);
  // Back wall of warm stone blocks.
  const wallTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a7356'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = ((y / 32) % 2) * 32; x < w + 64; x += 64) {
      g.fillStyle = ['#9a8262', '#8f7858', '#a38a68'][(x + y) % 3]; g.fillRect(x - 62, y + 2, 60, 28);
    }
  }));
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(6, 4);
  const wallMat = toon(0xffffff, { map: wallTex, emissive: 0x140c04 });
  mesh(new THREE.PlaneGeometry(18, 11), wallMat, 0, 4.4, -5.3);

  // ── Floor: marble checker ────────────────────────────────────────
  const floorTex = keep(canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#e8dcc4' : '#a8875a'; g.fillRect(i * 64, j * 64, 64, 64); }
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h); g.stroke(); }
  }));
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(5, 3);
  mesh(new THREE.BoxGeometry(13.5, 0.4, 8.4), toon(0xffffff, { map: floorTex }), 0, -0.2, -1.5);
  const poolTex = keep(canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,190,0.6)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }));
  const poolMat = basic(0xffffff, { map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 });
  const pool = mesh(new THREE.PlaneGeometry(9, 4.5), poolMat, 0, 0.012, 0.3);
  pool.rotation.x = -Math.PI / 2;
  mesh(new THREE.BoxGeometry(13.5, 1.1, 0.2), toon(0x6a5034), 0, -0.55, 2.75);
  // Low gold altar rail along the front (kept below the dancers' feet line).
  mesh(new THREE.BoxGeometry(12.8, 0.05, 0.08), goldMat, 0, 0.32, 2.5);
  const BAL = lowGraphics ? 24 : 40;
  const bal = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.025, 0.035, 0.3, 6)), goldMat, BAL);
  for (let i = 0; i < BAL; i++) { dummy.position.set(-6.3 + 12.6 * i / (BAL - 1), 0.15, 2.5); dummy.updateMatrix(); bal.setMatrixAt(i, dummy.matrix); }
  group.add(bal);

  // ── Stained glass: five lancets and a rose window ────────────────
  const lancetTex = GLASS.slice(0, 5).map((c0, n) => keep(canvasTex(128, 384, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath(); g.moveTo(8, h); g.lineTo(8, 110); g.quadraticCurveTo(10, 20, w / 2, 4); g.quadraticCurveTo(w - 10, 20, w - 8, 110); g.lineTo(w - 8, h); g.closePath(); g.clip();
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
      g.fillStyle = GLASS[(x / 32 + y / 32 + n) % GLASS.length]; g.globalAlpha = 0.9;
      g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + 32, y + 16); g.lineTo(x + 16, y + 32); g.lineTo(x, y + 16); g.closePath(); g.fill();
      g.fillStyle = GLASS[(x / 32 + y / 32 + n + 2) % GLASS.length]; g.fillRect(x, y, 6, 6);
    }
    g.globalAlpha = 1;
    // A dove / cross medallion in each lancet.
    g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(w / 2, 150, 34, 0, TAU); g.fill();
    g.fillStyle = c0; g.fillRect(w / 2 - 6, 124, 12, 52); g.fillRect(w / 2 - 22, 138, 44, 12);
    g.strokeStyle = '#2a1a0e'; g.lineWidth = 3;
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    g.beginPath(); g.arc(w / 2, 150, 34, 0, TAU); g.stroke();
    g.restore();
    g.strokeStyle = '#c8a050'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(8, h); g.lineTo(8, 110); g.quadraticCurveTo(10, 20, w / 2, 4); g.quadraticCurveTo(w - 10, 20, w - 8, 110); g.lineTo(w - 8, h); g.stroke();
  })));
  const windows = [];
  [[-4.6, 3.3, 1.2], [-2.6, 3.7, 1.3], [2.6, 3.7, 1.3], [4.6, 3.3, 1.2]].forEach(([x, y, s], i) => {
    const mat = basic(0xffffff, { map: lancetTex[i], transparent: true, depthWrite: false });
    const m = mesh(new THREE.PlaneGeometry(1.2 * s, 3.6 * s), mat, x, y, -5.2);
    windows.push({ mat, ph: i * 0.25, x });
  });
  const roseTex = keep(canvasTex(256, 256, (g, w, h) => {
    const c = w / 2;
    g.clearRect(0, 0, w, h);
    for (let ring = 3; ring >= 0; ring--) {
      const r = 30 + ring * 30, n = 8 + ring * 4;
      for (let i = 0; i < n; i++) {
        const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
        g.fillStyle = GLASS[(i + ring) % GLASS.length];
        g.beginPath(); g.moveTo(c, c); g.arc(c, c, r, a0, a1); g.closePath(); g.fill();
        g.strokeStyle = '#2a1a0e'; g.lineWidth = 3; g.stroke();
      }
    }
    g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(c, c, 26, 0, TAU); g.fill();
    g.strokeStyle = '#c8a050'; g.lineWidth = 8; g.beginPath(); g.arc(c, c, 122, 0, TAU); g.stroke();
  }));
  const roseMat = basic(0xffffff, { map: roseTex, transparent: true, depthWrite: false });
  const rose = mesh(new THREE.CircleGeometry(1.5, 40), roseMat, 0, 5.4, -5.15);
  windows.push({ mat: roseMat, ph: 0.5, x: 0 });

  // ── God rays from the windows ────────────────────────────────────
  const rayTex = keep(canvasTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,190,0.9)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sg = g.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = sg; g.fillRect(0, 0, w, h);
  }));
  const rays = [];
  [[-4.6, 4.4, 0.25], [-2.6, 4.8, 0.15], [0, 5.4, 0], [2.6, 4.8, -0.15], [4.6, 4.4, -0.25]].forEach(([x, y, tilt], i) => {
    const mat = basic(0xfff0c0, { map: rayTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.25, fog: false });
    const m = mesh(new THREE.PlaneGeometry(1.4, 9), mat, x, y - 3.2, -3.0);
    m.rotation.set(-0.5, 0, tilt);
    rays.push({ m, mat, ph: i * 0.2 });
  });

  // ── Stone pillars and pointed arches framing the stage ───────────
  for (const sx of [-1, 1]) for (const z of [2.3, -2.2]) {
    mesh(new THREE.CylinderGeometry(0.34, 0.38, 7.2, 14), stone, sx * 5.6, 3.1, z);
    mesh(new THREE.BoxGeometry(0.95, 0.3, 0.95), stone, sx * 5.6, -0.35 + 0.3, z);
    mesh(new THREE.BoxGeometry(0.9, 0.25, 0.9), goldMat, sx * 5.6, 6.75, z);
  }
  // Pointed arches between the pillars: two arcs meeting at the apex.
  for (const z of [2.3, -2.2]) for (const sx of [-1, 1]) {
    const a = mesh(new THREE.TorusGeometry(11.2, 0.2, 6, 24, Math.PI / 3), stone, sx * 5.6, 6.8, z);
    a.rotation.z = sx > 0 ? Math.PI * 2 / 3 : 0;
    a.scale.set(1, 0.32, 1);
  }
  // Banner on the choir loft.
  const bannerTex = keep(canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = '#7a1030'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffcf4a'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.font = 'italic 700 56px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ffb300'; g.shadowBlur = 14; g.fillStyle = '#fff1c2'; g.fillText('He Got Me', w / 2, h / 2 + 4);
  }));
  mesh(new THREE.PlaneGeometry(3.0, 0.56), basic(0xffffff, { map: bannerTex }), 0, 2.6, -4.3);

  // ── Choir risers and the robed choir ─────────────────────────────
  const tiers = [[-2.6, 0.25, 7], [-3.25, 0.55, 8], [-3.9, 0.85, 9]];
  tiers.forEach(([z, h]) => {
    mesh(new THREE.BoxGeometry(8.4, h, 0.7), toon(0x5a3a22), 0, h / 2, z);
    mesh(new THREE.BoxGeometry(8.45, 0.04, 0.72), goldMat, 0, h, z);
  });
  const singers = [];
  tiers.forEach(([z, h, n], t) => {
    const cnt = lowGraphics ? Math.ceil(n * 0.6) : n;
    for (let i = 0; i < cnt; i++) singers.push({ x: -3.6 + 7.2 * (i + 0.5 * (t % 2)) / (cnt - 0.5 * (t % 2) || 1), y: h, z, ph: (i * 0.13 + t * 0.21) % 1 });
  });
  const SN = singers.length;
  const sBody = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.18, 0.3, 0.95, 10)), toon(0x7a1030), SN);
  const sStole = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.26, 0.5, 0.04)), toon(GOLD, { emissive: 0x2a1800 }), SN);
  const sHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.15, 10, 8)), toon(0xffffff), SN);
  const sArm = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.05, 0.38, 3, 6)), toon(0x7a1030), SN * 2);
  const skins = [0x6b4226, 0x8d5524, 0xc68642, 0x3d2616, 0xe0ac69, 0x5a3a22];
  singers.forEach((s, i) => sHead.setColorAt(i, col.set(skins[i % skins.length])));
  group.add(sBody, sStole, sHead, sArm);

  // ── Candelabras ──────────────────────────────────────────────────
  const flames = [];
  for (const sx of [-1, 1]) {
    const x = sx * 4.6;
    mesh(new THREE.CylinderGeometry(0.04, 0.18, 1.4, 8), goldMat, x, 0.7, 1.3);
    mesh(new THREE.BoxGeometry(1.1, 0.05, 0.05), goldMat, x, 1.4, 1.3);
    for (let k = -2; k <= 2; k++) {
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28 - Math.abs(k) * 0.03, 6), toon(0xfff6e0), x + k * 0.25, 1.55, 1.3);
      flames.push([x + k * 0.25, 1.75 - Math.abs(k) * 0.015, 1.3]);
    }
  }
  const flameMesh = new THREE.InstancedMesh(keep(new THREE.ConeGeometry(0.035, 0.12, 6)), basic(0xffffff), flames.length);
  group.add(flameMesh);

  // ── Congregation down front, hands up ────────────────────────────
  mesh(new THREE.BoxGeometry(16, 0.2, 5), toon(0x3a2818), 0, -1.1, 5.0);
  const pews = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(5.2, 0.5, 0.35)), toon(0x5a3a22), 4);
  [[-3.2, 3.9], [3.2, 3.9], [-3.4, 4.9], [3.4, 4.9]].forEach(([x, z], i) => { dummy.position.set(x, -0.75, z + 0.25); dummy.updateMatrix(); pews.setMatrixAt(i, dummy.matrix); });
  group.add(pews);
  const fans = [];
  [[-3.2, 3.9], [3.2, 3.9], [-3.4, 4.9], [3.4, 4.9]].forEach(([x, z]) => { const n = lowGraphics ? 3 : 5; for (let k = 0; k < n; k++) fans.push({ x: x - 2.2 + 4.4 * (k + 0.5) / n, z, ph: Math.random() * TAU, hype: 0.6 + Math.random() * 0.6 }); });
  const FN = fans.length;
  const fBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.2, 0.3, 3, 8)), toon(0xffffff), FN);
  const fHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.15, 10, 8)), toon(0xffffff), FN);
  const fArm = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.05, 0.34, 3, 6)), toon(0xffffff), FN * 2);
  const sunday = [0xffffff, 0x1f3c9a, 0xc8102e, 0xffc93a, 0x7a2fbf, 0x1f9a5a, 0xf4a6c0];
  fans.forEach((f, i) => {
    fBody.setColorAt(i, col.set(sunday[i % sunday.length])); fHead.setColorAt(i, col.set(skins[(i + 1) % skins.length]));
    fArm.setColorAt(i * 2, col.set(skins[(i + 1) % skins.length])); fArm.setColorAt(i * 2 + 1, col.set(skins[(i + 1) % skins.length]));
  });
  group.add(fBody, fHead, fArm);

  // ── Doves wheeling overhead ──────────────────────────────────────
  const DN = lowGraphics ? 5 : 9;
  const dBody = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.12, 8, 6)), toon(0xffffff, { emissive: 0x333028 }), DN);
  const wingGeo = keep(new THREE.PlaneGeometry(0.32, 0.14)); wingGeo.translate(0.16, 0, 0);
  const dWing = new THREE.InstancedMesh(wingGeo, toon(0xffffff, { side: THREE.DoubleSide, emissive: 0x333028 }), DN * 2);
  dBody.frustumCulled = dWing.frustumCulled = false;
  const doves = [];
  for (let i = 0; i < DN; i++) doves.push({ r: 3.5 + Math.random() * 3, y: 5.2 + Math.random() * 1.6, z0: -1.5 - Math.random() * 1.5, sp: (0.25 + Math.random() * 0.2) * (i % 2 ? 1 : -1), a: Math.random() * TAU, flap: Math.random() * TAU, boost: 0 });
  group.add(dBody, dWing);

  // ── Spotlights from heaven ───────────────────────────────────────
  const coneGeo = keep(new THREE.ConeGeometry(0.85, 6.8, 20, 1, true));
  coneGeo.translate(0, -3.4, 0);
  const cones = [];
  for (const [x, targetX] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.position.set(x, 6.6, 1.0);
    group.add(cone);
    cones.push({ cone, mat, baseX: x, targetX });
  }

  // ── Light motes rising, and bursts of glory ──────────────────────
  const GL = lowGraphics ? 220 : 460;
  const gPos = new Float32Array(GL * 3), gCol = new Float32Array(GL * 3), gVel = new Float32Array(GL * 3), gLife = new Float32Array(GL);
  for (let i = 0; i < GL; i++) { gPos[i * 3 + 1] = -100; col.set(i % 3 ? 0xfff1b0 : 0xffd23f); gCol[i * 3] = col.r; gCol[i * 3 + 1] = col.g; gCol[i * 3 + 2] = col.b; }
  const gGeo = keep(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
  const motes = new THREE.Points(gGeo, keep(new THREE.PointsMaterial({ size: 0.09, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9 })));
  motes.frustumCulled = false;
  group.add(motes);
  let gCursor = 0;
  function emit(n, x, spread, y0 = 0.2, vy = 0.5, life = 5) {
    for (let k = 0; k < n; k++) {
      const i = gCursor = (gCursor + 1) % GL;
      gPos[i * 3] = x + (Math.random() - 0.5) * spread; gPos[i * 3 + 1] = y0 + Math.random() * 0.6; gPos[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.5;
      gVel[i * 3] = (Math.random() - 0.5) * 0.4; gVel[i * 3 + 1] = vy * (0.6 + Math.random() * 0.8); gVel[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      gLife[i] = life * (0.7 + Math.random() * 0.5);
    }
  }

  // ── Lights ───────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xfff2d8, 0x5a3a22, 1.15);
  const key = new THREE.DirectionalLight(0xfff4e0, 1.45);
  key.position.set(1.2, 6, 6);
  const rimL = new THREE.PointLight(0xffc040, 14, 12, 1.6); rimL.position.set(-3.6, 3.2, -1.0);
  const rimR = new THREE.PointLight(0xff7aa0, 12, 12, 1.6); rimR.position.set(3.6, 3.2, -1.0);
  const glassGlow = new THREE.PointLight(0xffe0a0, 14, 12, 1.5); glassGlow.position.set(0, 4.0, -3.6);
  const frontGlow = new THREE.PointLight(0xfff0c0, 8, 8, 1.6); frontGlow.position.set(0, 0.6, 2.2);
  group.add(hemi, key, rimL, rimR, glassGlow, frontGlow);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, glass: glassGlow.intensity, front: frontGlow.intensity };

  // ── State + update ───────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, focus: 0, solo: null, glory: 0, lastBeat: -1 };

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = frac(beat), onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 1.8);
    state.cheer = Math.max(0, state.cheer - dt * 0.45);
    state.glory = Math.max(0, state.glory - dt * 0.6);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    const house = L * (1 - 0.6 * soloK);
    if (whole !== state.lastBeat) { state.lastBeat = whole; emit(lowGraphics ? 3 : 6, 0, 11, 0.2, 0.35, 7); }

    // Stained glass blazes on the beat, a ripple across the windows.
    windows.forEach((w) => {
      const k = (0.55 + 0.45 * Math.exp(-frac(beat - w.ph * 0.5) * 4) + 0.5 * state.glory + 0.6 * state.flash) * house + 0.1;
      w.mat.color.setRGB(Math.min(1.6, k), Math.min(1.6, k), Math.min(1.6, k));
    });
    rose.rotation.z += dt * 0.05;
    rays.forEach((r) => { r.mat.opacity = (0.12 + 0.12 * Math.exp(-frac(beat - r.ph) * 3) + 0.25 * state.glory + 0.3 * state.flash) * house; });
    poolMat.opacity = (0.3 + 0.2 * onBeat + 0.4 * state.flash) * house + 0.35 * soloK;
    pool.position.x = soloX * soloK;

    // Choir: robes swaying on two beats, claps on 2 and 4, hands raised
    // when the battle catches fire.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3 + state.glory * 0.5);
    singers.forEach((s, i) => {
      const sway = Math.sin(Math.PI * (beat - s.ph * 0.3)), nod = Math.pow(0.5 + 0.5 * Math.cos(TAU * beat), 2);
      dummy.scale.set(1, 1, 1);
      dummy.position.set(s.x + 0.06 * sway, s.y + 0.48 - 0.02 * nod, s.z); dummy.rotation.set(0, 0, -0.08 * sway); dummy.updateMatrix(); sBody.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x + 0.07 * sway, s.y + 0.62, s.z + 0.2); dummy.updateMatrix(); sStole.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x + 0.1 * sway, s.y + 1.1 - 0.02 * nod, s.z); dummy.rotation.set(-0.15 * nod, 0, -0.1 * sway); dummy.updateMatrix(); sHead.setMatrixAt(i, dummy.matrix);
      const clap = hit2(beat);
      for (const sd of [-1, 1]) {
        const raise = hype > 0.65 ? 1 : 0;
        dummy.position.set(s.x + sd * 0.18 + 0.08 * sway, s.y + 0.78, s.z + 0.12);
        dummy.rotation.set(-0.9 - 0.3 * clap - 1.4 * raise, 0, sd * (0.35 - 0.25 * clap + 0.3 * raise) - 0.08 * sway);
        dummy.updateMatrix(); sArm.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
    });
    sBody.instanceMatrix.needsUpdate = sStole.instanceMatrix.needsUpdate = sHead.instanceMatrix.needsUpdate = sArm.instanceMatrix.needsUpdate = true;

    // Congregation: hands up and waving.
    fans.forEach((f, i) => {
      const jump = (0.5 - 0.5 * Math.cos(TAU * beat + f.ph)) * (0.03 + 0.12 * hype * f.hype) * L, wave = Math.sin(Math.PI * beat / 2 + f.ph);
      dummy.scale.set(1, 1, 1);
      dummy.position.set(f.x, -0.6 + jump, f.z); dummy.rotation.set(0, Math.PI, 0.06 * wave); dummy.updateMatrix(); fBody.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.46; dummy.updateMatrix(); fHead.setMatrixAt(i, dummy.matrix);
      for (const sd of [-1, 1]) {
        dummy.position.set(f.x + sd * 0.2, -0.36 + jump, f.z);
        dummy.rotation.set(0, 0, sd * (hype > 0.55 ? 2.7 + 0.25 * wave * sd : 0.6 + 0.4 * hit2(beat + 0.5)));
        dummy.updateMatrix(); fArm.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
    });
    fBody.instanceMatrix.needsUpdate = fHead.instanceMatrix.needsUpdate = fArm.instanceMatrix.needsUpdate = true;

    // Candles flicker.
    flames.forEach(([x, y, z], i) => {
      const f = 1 + 0.15 * Math.sin(songTime * 13 + i * 3) + 0.1 * Math.sin(songTime * 7.3 + i);
      dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0.08 * Math.sin(songTime * 5 + i)); dummy.scale.set(1, f, 1); dummy.updateMatrix();
      flameMesh.setMatrixAt(i, dummy.matrix); flameMesh.setColorAt(i, col.setRGB(1, 0.75 + 0.1 * f, 0.3));
    });
    flameMesh.instanceMatrix.needsUpdate = true; flameMesh.instanceColor.needsUpdate = true;

    // Doves wheel over the stage, wings beating, faster after a big moment.
    doves.forEach((d, i) => {
      d.a += d.sp * dt * (1 + 2 * state.glory);
      const x = Math.cos(d.a) * d.r, z = d.z0 + Math.sin(d.a) * 1.2, y = d.y + 0.25 * Math.sin(d.a * 2 + i);
      const head = Math.atan2(-Math.sin(d.a) * d.sp, Math.cos(d.a) * d.sp * 0.3);
      const fl = Math.sin(songTime * (9 + 5 * state.glory) + d.flap);
      dummy.position.set(x, y, z); dummy.rotation.set(0, d.sp > 0 ? -d.a : Math.PI - d.a, 0); dummy.scale.set(1, 0.8, 1.6); dummy.updateMatrix(); dBody.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(1, 1, 1);
      for (const sd of [-1, 1]) {
        dummy.position.set(x, y + 0.03, z);
        dummy.rotation.set(0, (d.sp > 0 ? -d.a : Math.PI - d.a) + (sd > 0 ? 0 : Math.PI), 0.6 * fl);
        dummy.updateMatrix(); dWing.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
      void head;
    });
    dBody.instanceMatrix.needsUpdate = dWing.instanceMatrix.needsUpdate = true;

    cones.forEach((c, i) => {
      const lead = c.targetX < 0 ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const swy = Math.sin(songTime * 0.7 + i * 1.9) * 0.3;
      const dx = c.targetX + (soloX - c.targetX) * soloK + swy * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.5); c.cone.rotation.x = -0.1;
      c.mat.opacity = (0.03 + 0.035 * onBeat + 0.05 * lead + 0.12 * state.flash) * L * (1 - 0.3 * soloK) + 0.08 * soloK;
    });

    for (let i = 0; i < GL; i++) {
      if (gLife[i] <= 0) continue;
      gLife[i] -= dt;
      gPos[i * 3] += (gVel[i * 3] + Math.sin(songTime * 0.8 + i) * 0.15) * dt;
      gPos[i * 3 + 1] += gVel[i * 3 + 1] * dt; gPos[i * 3 + 2] += gVel[i * 3 + 2] * dt;
      if (gLife[i] <= 0) { gLife[i] = 0; gPos[i * 3 + 1] = -100; }
    }
    gGeo.attributes.position.needsUpdate = true;
    sky.material.uniforms.uPulse.value = onBeat * 0.3 * L + state.flash * 0.8 + state.glory * 0.3;
    sky.material.uniforms.uLight.value = house;

    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L + 0.6 * state.flash) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.5 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.5 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    glassGlow.intensity = base.glass * L * (0.7 + 0.4 * onBeat + state.glory + state.flash) * (1 - 0.6 * soloK);
    frontGlow.intensity = base.front * L * (0.8 + 0.3 * onBeat + state.flash);
    frontGlow.position.x = soloX * soloK;
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.cheer = Math.min(1, state.cheer + 0.35); state.glory = 1; emit(30, x, 1.5, 0.2, 1.2, 3); }
        if (data.tier >= 4) { state.flash = 0.6; emit(60, x, 2.5, 0.2, 1.6, 3); }
        break;
      case 'taunt': state.flash = 0.5; state.glory = 1; break;
      case 'tauntLanded': state.flash = 1.2; state.cheer = 1; state.glory = 1; emit(90, data.attacker === 'rival' ? -1.6 : 1.6, 3, 0.4, 1.4, 3); break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.4; break;
      case 'end': state.flash = 1; state.cheer = 1; state.glory = 1; emit(200, x, 6, 0.2, 1.4, 4); break;
      case 'drop': state.flash = 1; state.glory = 1; emit(80, 0, 8, 0.2, 1.2, 4); break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; state.glory = 1; emit(70, x, 2, 0.2, 1.4, 4);
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update, react,
    setLightLevel(v) { state.lightLevel = Math.max(0, Math.min(1, v)); },
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); },
  };
}

// Clap envelope landing on every 2 and 4 (odd beats of x): short rise, decay.
function hit2(x) { const f = frac((x + 0.1) / 2 - 0.5) * 2; return f < 0.1 ? f / 0.1 : Math.exp(-(f - 0.1) * 5); }
