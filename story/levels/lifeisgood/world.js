// LIFE IS GOOD — Kaya's outdoor Caribbean night street party.
//
// A hex-tile dance floor in the street, a towering sound-system speaker
// wall with the selector's booth and a "LIFE IS GOOD" sign behind the
// dancers, string lights strung between swaying palm trees, colourful
// zinc-roof shops and a patty stall on the sides, a crowd waving rags,
// a big moon and stars. Woofers pump, bulbs chase and the crowd bounces on
// the beat; streamers fly for the big moments.

import * as THREE from '../../../vendor/three/three.module.min.js';

const PALETTE = [0x1faa4f, 0xffc81e, 0xff3d6e, 0x2bd4ff, 0xff8a1f, 0xb35cff];

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
  const crowdScale = lowGraphics ? 0.6 : 1;

  // ── Night sky, stars, moon ──────────────────────────────────────
  const sky = add(new THREE.Mesh(geo(new THREE.SphereGeometry(85, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.02,0.03,0.10), mid = vec3(0.07,0.10,0.26), hor = vec3(0.30,0.12,0.32);
        vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.7, h)) : mix(hor, mid, smoothstep(-0.05, 0.1, h));
        c += vec3(0.1,0.2,0.08) * uPulse * smoothstep(0.3, 0.0, abs(h - 0.05));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }))));
  const STARS = lowGraphics ? 160 : 320;
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const a = Math.random() * Math.PI * 2, y = 0.15 + Math.random() * 0.8, r = 78;
    starPos[i * 3] = Math.cos(a) * r * Math.sqrt(1 - y * y); starPos[i * 3 + 1] = y * r; starPos[i * 3 + 2] = Math.sin(a) * r * Math.sqrt(1 - y * y);
  }
  const starGeo = geo(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = keep(new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.35, sizeAttenuation: true, fog: false, transparent: true }));
  group.add(new THREE.Points(starGeo, starMat));
  const moonTex = keep(canvasTex(256, 256, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(0.34, 'rgba(255,244,205,1)'); gr.addColorStop(0.38, 'rgba(255,230,170,0.35)'); gr.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.fillStyle = 'rgba(220,200,160,0.5)';
    for (const [x, y, r] of [[110, 110, 14], [150, 140, 10], [120, 155, 8], [145, 100, 6]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  }));
  add(new THREE.Mesh(geo(new THREE.PlaneGeometry(16, 16)), basic(0xffffff, { map: moonTex, transparent: true, depthWrite: false, fog: false })), -18, 26, -62);

  // ── Street, hex dance floor ─────────────────────────────────────
  const streetTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2630'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${150 + (i % 60)},${140 + (i % 50)},${150},${0.05 + (i % 7) * 0.012})`; g.fillRect((i * 97) % w, (i * 57) % h, 2, 2); }
  }));
  streetTex.wrapS = streetTex.wrapT = THREE.RepeatWrapping; streetTex.repeat.set(16, 16);
  const ground = add(new THREE.Mesh(geo(new THREE.CircleGeometry(40, 40)), toon(0xffffff, { map: streetTex })), 0, -0.02, 0);
  ground.rotation.x = -Math.PI / 2;
  const hexR = 0.36, hexes = [];
  for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) {
    const x = hexR * 1.5 * q, z = hexR * Math.sqrt(3) * (r + q / 2);
    if (Math.hypot(x, z) <= 4.5) hexes.push({ x, z, ring: Math.hypot(x, z), ang: Math.atan2(z, x) });
  }
  const hexMesh = inst(new THREE.CylinderGeometry(hexR * 0.93, hexR * 0.93, 0.06, 6), basic(0xffffff), hexes.length);
  hexes.forEach((t, i) => { dummy.position.set(t.x, 0.0, t.z); dummy.rotation.set(0, Math.PI / 6, 0); dummy.updateMatrix(); hexMesh.setMatrixAt(i, dummy.matrix); hexMesh.setColorAt(i, col.set(0x101418)); });
  const rim = add(new THREE.Mesh(geo(new THREE.TorusGeometry(4.75, 0.07, 6, 96)), basic(0xffc81e)), 0, 0.03, 0);
  rim.rotation.x = Math.PI / 2;

  // ── Sound-system wall + selector booth + sign ───────────────────
  const wall = new THREE.Group();
  wall.position.set(0, 0, -6.4);
  group.add(wall);
  const COLS = 8, ROWS = 3, bw = 1.25, bh = 1.15;
  const boxes = inst(new THREE.BoxGeometry(bw * 0.96, bh * 0.96, 1.0), toon(0x16141c), COLS * ROWS);
  const woofs = inst(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 18), toon(0x2e2e3a), COLS * ROWS);
  const rings = inst(new THREE.TorusGeometry(0.45, 0.04, 5, 18), basic(0xffffff), COLS * ROWS);
  const woofList = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, x = (c - (COLS - 1) / 2) * bw + (c < COLS / 2 ? -0.9 : 0.9), y = 0.58 + r * bh;
    const big = r < 2;
    dummy.position.set(x, y, -6.4); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); boxes.setMatrixAt(i, dummy.matrix);
    woofList.push({ x, y, z: -6.4 + 0.52, big, i, c, r });
    rings.setColorAt(i, col.set(PALETTE[(c + r) % 3]));
  }
  // Selector booth on top in the middle: decks, a little canopy.
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(2.2, 1.0, 1.1)), toon(0x1a1a22)), 0, 0.5, 0.0, wall);
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(2.3, 0.08, 1.15)), toon(0xffc81e)), 0, 1.02, 0.0, wall);
  const decks = [];
  for (const sx of [-1, 1]) {
    const d = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20)), toon(0x0c0c10)), sx * 0.55, 1.08, 0.1, wall);
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.02, 0.3)), toon(0xff3d6e)), 0, 0.03, 0.12, d);
    decks.push(d);
  }
  const panelTex = keep(canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#0c0c10'; g.fillRect(0, 0, w, h);
    const bands = ['#1faa4f', '#ffc81e', '#141414'];
    for (let i = 0; i < 3; i++) { g.fillStyle = bands[i]; g.fillRect(0, i * (h / 3), w, h / 3); }
    g.font = '900 64px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(1, (w - 30) / g.measureText('KAYA SOUND').width);
    g.save(); g.translate(w / 2, h / 2 + 4); g.scale(fit, 1);
    g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeText('KAYA SOUND', 0, 0); g.fillStyle = '#fff'; g.fillText('KAYA SOUND', 0, 0);
    g.restore();
  }));
  add(new THREE.Mesh(geo(new THREE.PlaneGeometry(4.6, 1.15)), basic(0xffffff, { map: panelTex })), 0, 0.58 + ROWS * bh + 0.6, -5.85);
  const signTex = keep(canvasTex(512, 160, (g, w, h) => {
    g.font = 'italic 900 96px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(1, (w - 40) / g.measureText('LIFE IS GOOD').width);
    g.translate(w / 2, h / 2); g.scale(fit, 1);
    g.shadowColor = '#1fff7a'; g.shadowBlur = 30; g.lineWidth = 10; g.strokeStyle = '#3dff8f'; g.strokeText('LIFE IS GOOD', 0, 0);
    g.shadowColor = '#ffd23a'; g.shadowBlur = 18; g.fillStyle = '#fff6c8'; g.fillText('LIFE IS GOOD', 0, 0);
  }));
  const sign = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(9, 2.8)), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false })), 0, 0.58 + ROWS * bh + 2.3, -5.9);

  // ── Shops on the sides (zinc roofs, painted walls, lit windows) ──
  const shopCols = [0x2bb5a8, 0xff7a5a, 0xffd23a, 0x8a5cff, 0x3dbb5a, 0xff4f9a];
  const winMat = basic(0xffd890);
  const zinc = toon(0x9aa0aa);
  const shopSpots = [[-11, -6, 0.5], [-13.5, -1.5, 0.9], [-12, 3.6, 1.3], [11, -6, -0.5], [13.5, -1.5, -0.9], [12, 3.6, -1.3]];
  shopSpots.forEach(([x, z, ry], i) => {
    const sh = add(new THREE.Group(), x, 0, z);
    sh.rotation.y = ry;
    add(new THREE.Mesh(geo(new THREE.BoxGeometry(4, 3, 3)), toon(shopCols[i])), 0, 1.5, 0, sh);
    const roof = add(new THREE.Mesh(geo(new THREE.BoxGeometry(4.6, 0.12, 3.8)), zinc), 0, 3.15, 0.3, sh);
    roof.rotation.x = 0.12;
    add(new THREE.Mesh(geo(new THREE.PlaneGeometry(0.9, 0.8)), winMat), -1.0, 1.9, 1.51, sh);
    add(new THREE.Mesh(geo(new THREE.PlaneGeometry(0.9, 0.8)), winMat), 1.0, 1.9, 1.51, sh);
    add(new THREE.Mesh(geo(new THREE.PlaneGeometry(0.9, 1.7)), toon(0x3a2210)), 0, 0.85, 1.51, sh);
  });
  // Patty stall with a sign.
  const pattyTex = keep(canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#ffc81e'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8241e'; g.fillRect(0, h - 14, w, 14);
    g.font = '900 52px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1a1a1a';
    const fit = Math.min(1, (w - 16) / g.measureText('PATTIES').width); g.translate(w / 2, h / 2 - 4); g.scale(fit, 1); g.fillText('PATTIES', 0, 0);
  }));
  const stall = add(new THREE.Group(), 7.6, 0, -3.2);
  stall.rotation.y = -0.6;
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(2.6, 1.1, 1.2)), toon(0xd8241e)), 0, 0.55, 0, stall);
  for (const sx of [-1, 1]) add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6)), toon(0x5a3a1a)), sx * 1.2, 2.0, 0.5, stall);
  const awning = add(new THREE.Mesh(geo(new THREE.BoxGeometry(2.9, 0.08, 1.6)), toon(0x1faa4f)), 0, 3.05, 0.3, stall);
  awning.rotation.x = 0.2;
  add(new THREE.Mesh(geo(new THREE.PlaneGeometry(2.4, 0.9)), basic(0xffffff, { map: pattyTex })), 0, 3.6, 0.0, stall);
  for (let k = 0; k < 4; k++) add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 3)), toon(0xe8a030)), -0.8 + k * 0.5, 1.15, 0.2, stall).rotation.y = k;

  // ── Palm trees with fronds that sway ────────────────────────────
  const palms = [];
  const trunkMat = toon(0x8a6a44), frondMat = toon(0x2a8a3a, { side: THREE.DoubleSide });
  const segGeo = geo(new THREE.CylinderGeometry(0.2, 0.26, 1.2, 8));
  const frondGeo = geo((() => { const g = new THREE.PlaneGeometry(0.7, 3.0, 1, 4); g.translate(0, 1.5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y / 3.3)); p.setZ(i, -0.12 * y * y); } g.computeVertexNormals(); return g; })());
  for (const [x, z, s, lean] of [[-8.6, -5.0, 1.15, 0.25], [8.8, -5.4, 1.2, -0.2], [-6.8, -8.5, 0.95, 0.12], [6.6, -8.8, 1.0, -0.1], [-10.5, 1.5, 1.1, 0.3], [10.6, 1.2, 1.05, -0.3]]) {
    const palm = add(new THREE.Group(), x, 0, z);
    palm.scale.setScalar(s);
    let px = 0, py = 0;
    for (let k = 0; k < 6; k++) {
      const seg = add(new THREE.Mesh(segGeo, trunkMat), px, py + 0.6, 0, palm);
      seg.rotation.z = -lean * k * 0.25; seg.scale.setScalar(1 - k * 0.06);
      px += Math.sin(lean * k * 0.25) * 1.15; py += Math.cos(lean * k * 0.25) * 1.15;
    }
    const crown = add(new THREE.Group(), px, py + 0.2, 0, palm);
    for (let f = 0; f < 7; f++) {
      const fr = add(new THREE.Mesh(frondGeo, frondMat), 0, 0, 0, crown);
      fr.rotation.set(1.05 + (f % 2) * 0.2, (f / 7) * Math.PI * 2, 0, 'YXZ');
    }
    add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.22, 8, 6)), toon(0x5a3a1a)), 0.15, -0.15, 0.1, crown);
    palms.push({ crown, ph: x * 0.3 });
  }

  // ── String lights (catenaries between the palms) ────────────────
  const bulbSpots = [];
  const strand = (a, b, sag, n) => { for (let i = 0; i <= n; i++) { const u = i / n; bulbSpots.push({ x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u) - Math.sin(Math.PI * u) * sag, z: lerp(a[2], b[2], u), i: bulbSpots.length }); } };
  function lerp(a, b, t) { return a + (b - a) * t; }
  strand([-9.4, 6.4, -5.0], [9.6, 6.6, -5.4], 1.6, 30);
  strand([-11.4, 6.1, 1.5], [-0.5, 5.6, 2.6], 1.0, 16);
  strand([0.5, 5.6, 2.6], [11.4, 6.0, 1.2], 1.0, 16);
  strand([-7.4, 5.4, -8.5], [7.2, 5.6, -8.8], 1.2, 22);
  const bulbs = inst(new THREE.SphereGeometry(0.075, 6, 4), basic(0xffffff), bulbSpots.length);
  bulbSpots.forEach((b, i) => { m4.makeTranslation(b.x, b.y, b.z); bulbs.setMatrixAt(i, m4); });

  // ── Truss + spotlight cones ─────────────────────────────────────
  const cones = [], coneMats = [];
  const coneGeo = geo(new THREE.ConeGeometry(0.95, 7.3, 24, 1, true));
  coneGeo.translate(0, -3.65, 0);
  add(new THREE.Mesh(geo(new THREE.BoxGeometry(12, 0.2, 0.2)), toon(0x2a2a34)), 0, 7.2, 1.2);
  for (const sx of [-1, 1]) add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.08, 0.08, 7.2, 8)), toon(0x2a2a34)), sx * 6, 3.6, 1.2);
  for (const [x, targetX] of [[-3.6, -1.6], [-1.2, -1.6], [1.2, 1.6], [3.6, 1.6]]) {
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.2, 0.28, 0.4, 12)), toon(0x151520)), x, 7.0, 1.2);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = add(new THREE.Mesh(coneGeo, mat), x, 7.0, 1.2);
    coneMats.push(mat);
    cones.push({ cone, baseX: x, targetX, side: targetX < 0 ? 'player' : 'rival' });
  }

  // ── Crowd waving rags ───────────────────────────────────────────
  const spots = [];
  const addRow = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.2 + ((i * 7) % 5) * 0.08) / n, z: z + ((i * 3) % 4) * 0.14, y }); };
  addRow(Math.round(14 * crowdScale), -6.8, 6.8, 5.8, 0);
  addRow(Math.round(16 * crowdScale), -7.8, 7.8, 6.9, 0);
  addRow(Math.round(6 * crowdScale), -9.4, -6.0, 1.8, 0);
  addRow(Math.round(6 * crowdScale), 6.0, 9.4, 1.8, 0);
  addRow(Math.round(5 * crowdScale), -9.8, -6.8, -2.2, 0);
  addRow(Math.round(5 * crowdScale), 6.8, 9.8, -2.2, 0);
  const N = spots.length;
  const cBody = inst(new THREE.CapsuleGeometry(0.26, 0.6, 2, 7), toon(0xffffff), N);
  const cHead = inst(new THREE.SphereGeometry(0.2, 9, 6), toon(0xffffff), N);
  const cArm = inst(new THREE.CapsuleGeometry(0.065, 0.5, 1, 4), toon(0xffffff), N * 2);
  const cRag = inst(new THREE.PlaneGeometry(0.28, 0.22), toon(0xffffff, { side: THREE.DoubleSide }), N);
  const skins = [0x4a2a18, 0x6a3e22, 0x8d5524, 0x5a3420, 0x3a2216, 0xa0683c];
  spots.forEach((c, i) => {
    c.phase = (i * 2.399) % (Math.PI * 2); c.hype = 0.6 + ((i * 13) % 7) / 10; c.rag = i % 3 === 0;
    cBody.setColorAt(i, col.set(PALETTE[(i * 5) % PALETTE.length]).multiplyScalar(0.9));
    cHead.setColorAt(i, col.set(skins[i % skins.length]));
    cArm.setColorAt(i * 2, col.set(skins[i % skins.length])); cArm.setColorAt(i * 2 + 1, col.set(skins[i % skins.length]));
    cRag.setColorAt(i, col.set(PALETTE[(i * 3 + 1) % PALETTE.length]));
  });

  // ── Streamer confetti ───────────────────────────────────────────
  const CONF = lowGraphics ? 200 : 420;
  const confPos = new Float32Array(CONF * 3), confCol = new Float32Array(CONF * 3), confVel = new Float32Array(CONF * 3), confLife = new Float32Array(CONF);
  for (let i = 0; i < CONF; i++) { col.set(PALETTE[i % 3]); confCol[i * 3] = col.r; confCol[i * 3 + 1] = col.g; confCol[i * 3 + 2] = col.b; confPos[i * 3 + 1] = -100; }
  const confGeo = geo(new THREE.BufferGeometry());
  confGeo.setAttribute('position', new THREE.BufferAttribute(confPos, 3));
  confGeo.setAttribute('color', new THREE.BufferAttribute(confCol, 3));
  const confetti = new THREE.Points(confGeo, keep(new THREE.PointsMaterial({ size: 0.13, vertexColors: true, sizeAttenuation: true })));
  confetti.frustumCulled = false;
  group.add(confetti);
  let confCursor = 0;
  function burst(n, x, spread) {
    for (let k = 0; k < n; k++) {
      const i = confCursor = (confCursor + 1) % CONF;
      confPos[i * 3] = x + (Math.random() - 0.5) * spread; confPos[i * 3 + 1] = 6.5 + Math.random() * 1.5; confPos[i * 3 + 2] = (Math.random() - 0.5) * 4 + 0.5;
      confVel[i * 3] = (Math.random() - 0.5) * 1.2; confVel[i * 3 + 1] = -1.2 - Math.random() * 1.2; confVel[i * 3 + 2] = (Math.random() - 0.5);
      confLife[i] = 5;
    }
  }

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xb0c0ff, 0x3a2a40, 1.3);
  const key = new THREE.DirectionalLight(0xdfe6ff, 1.35);
  key.position.set(-2, 7, 6);
  const rimL = new THREE.PointLight(0x2bff7a, 18, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0xff3d9a, 18, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const sysGlow = new THREE.PointLight(0xffc040, 14, 15, 1.5); sysGlow.position.set(0, 3.5, -4.2);
  group.add(hemi, key, rimL, rimR, sysGlow);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, sys: sysGlow.intensity };

  // ── State + update ──────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, ripple: null, focus: 0, lastBeat: -1, barColor: 0, solo: null };
  const cA = new THREE.Color(), cB = new THREE.Color(), dim = new THREE.Color(0x0c1014), warm = new THREE.Color(0xfff0c0);

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.5);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    if (whole !== state.lastBeat) { state.lastBeat = whole; if (whole % 4 === 0) state.barColor = (state.barColor + 1) % 3; }

    // Hex floor: a pinwheel sweeping round once a bar, a pulse ring on each
    // beat, ripples from big moves, the solo spotlight.
    cA.set(PALETTE[state.barColor]); cB.set(PALETTE[(state.barColor + 1) % 3]);
    const sweep = (beat / 4) * Math.PI * 2, ringR = ph * 5;
    hexes.forEach((t, i) => {
      const arm = Math.pow(0.5 + 0.5 * Math.cos(t.ang * 3 - sweep), 6);
      const ringK = Math.exp(-Math.pow((t.ring - ringR) * 2.2, 2)) * (1 - ph);
      let k = (0.12 + 0.5 * arm + 0.45 * ringK) * L;
      if (state.ripple) {
        const r = (songTime - state.ripple.t) * 7, d = Math.hypot(t.x - state.ripple.x, t.z);
        k = Math.max(k, Math.exp(-Math.pow((d - r) * 1.8, 2)) * (1 - Math.min(1, r / 10)) * L);
      }
      if (soloK > 0) {
        const near = Math.exp(-Math.pow(Math.hypot(t.x - soloX, t.z) / 1.3, 2));
        k = k * (1 - 0.75 * soloK) + soloK * near * (0.6 + 0.4 * onBeat);
      }
      col.copy(dim).lerp(arm > 0.3 ? cA : cB, Math.min(1, k)).multiplyScalar(0.6 + 0.8 * k + state.flash * 0.4);
      hexMesh.setColorAt(i, col);
    });
    hexMesh.instanceColor.needsUpdate = true;

    // Woofers pump (big ones on the kick), rings flash in chase order.
    woofList.forEach((w, i) => {
      const pump = 1 + (w.big ? 0.22 : 0.12) * onBeat * L;
      dummy.position.set(w.x, w.y, w.z); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.scale.set(pump, 1, pump); dummy.updateMatrix();
      woofs.setMatrixAt(i, dummy.matrix);
      dummy.position.z += 0.05; dummy.rotation.set(0, 0, 0); dummy.scale.set(pump, pump, 1); dummy.updateMatrix();
      rings.setMatrixAt(i, dummy.matrix);
      const chase = ((w.c + w.r + whole) % 4 === 0) ? 1 : 0.25;
      rings.setColorAt(i, col.set(PALETTE[(w.c + w.r + state.barColor) % 3]).multiplyScalar((0.35 + 0.65 * chase * (0.5 + 0.5 * onBeat)) * L + state.flash * 0.3));
    });
    woofs.instanceMatrix.needsUpdate = rings.instanceMatrix.needsUpdate = true;
    rings.instanceColor.needsUpdate = true;
    decks.forEach((d) => { d.rotation.y += dt * 3.5; });

    // String lights chase; sign flickers; palms sway; stars twinkle.
    bulbSpots.forEach((b, i) => {
      const on = ((i + whole) % 3 === 0) ? 1 : 0.35;
      bulbs.setColorAt(i, col.set(PALETTE[i % 6]).lerp(warm, 0.35).multiplyScalar((0.25 + 0.75 * on * (0.6 + 0.4 * onBeat)) * Math.max(0.15, L)));
    });
    bulbs.instanceColor.needsUpdate = true;
    sign.material.opacity = L * (0.85 + 0.15 * onBeat) * ((Math.sin(songTime * 13) > 0.985) ? 0.5 : 1);
    palms.forEach((pl) => { pl.crown.rotation.z = Math.sin(songTime * 0.8 + pl.ph) * 0.08; pl.crown.rotation.x = Math.sin(songTime * 0.6 + pl.ph * 2) * 0.05; });
    starMat.opacity = 0.7 + 0.3 * Math.sin(songTime * 2);
    sky.material.uniforms.uPulse.value = onBeat * 0.5 * L + state.flash;

    // Crowd bounce + rag waving, arms up when hyped, lean to the leader.
    const hype = Math.min(1, 0.35 + state.cheer + Math.abs(state.focus) * 0.3);
    spots.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.phase * 0.3)) * (0.06 + 0.3 * hype * c.hype) * L;
      const lean = state.focus * 0.15 * Math.sign(-c.x || 1), yaw = Math.atan2(-c.x, -c.z + 8) * 0.3;
      dummy.rotation.set(0, yaw, lean); dummy.scale.setScalar(1);
      dummy.position.set(c.x, c.y + 0.6 + jump, c.z); dummy.updateMatrix(); cBody.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.66; dummy.updateMatrix(); cHead.setMatrixAt(i, dummy.matrix);
      const wave = Math.sin(beat * Math.PI + c.phase);
      for (const sd of [-1, 1]) {
        const up = (c.rag && sd > 0) || hype > 0.6 ? 2.6 + 0.35 * wave * sd : 0.45 + 0.3 * wave;
        dummy.position.set(c.x + sd * 0.27 * Math.cos(yaw), c.y + 0.9 + jump, c.z - sd * 0.27 * Math.sin(yaw));
        dummy.rotation.set(0, yaw, sd * up); dummy.updateMatrix();
        cArm.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
        if (sd > 0) {
          const hx = c.x + 0.27 * Math.cos(yaw) + 0.33 * Math.sin(up), hy = c.y + 0.9 + jump - 0.33 * Math.cos(up);
          dummy.position.set(hx, c.rag ? hy + 0.12 : -50, c.z); dummy.rotation.set(0, yaw + Math.sin(beat * Math.PI * 2 + c.phase) * 1.2, 0.3 * wave); dummy.updateMatrix();
          cRag.setMatrixAt(i, dummy.matrix);
        }
      }
    });
    cBody.instanceMatrix.needsUpdate = cHead.instanceMatrix.needsUpdate = cArm.instanceMatrix.needsUpdate = cRag.instanceMatrix.needsUpdate = true;

    // Spotlight cones.
    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.25;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 7.0); c.cone.rotation.x = -0.12;
      coneMats[i].color.set(PALETTE[(state.barColor + i) % 3]);
      coneMats[i].opacity = (0.03 + 0.05 * onBeat + 0.05 * lead + 0.1 * state.flash) * L * (1 - 0.35 * soloK) + 0.05 * soloK * L;
    });

    // Confetti.
    for (let i = 0; i < CONF; i++) {
      if (confLife[i] <= 0) continue;
      confLife[i] -= dt;
      confPos[i * 3] += (confVel[i * 3] + Math.sin(songTime * 3 + i) * 0.4) * dt;
      confPos[i * 3 + 1] += confVel[i * 3 + 1] * dt;
      confPos[i * 3 + 2] += confVel[i * 3 + 2] * dt;
      if (confLife[i] <= 0 || confPos[i * 3 + 1] < 0) { confLife[i] = 0; confPos[i * 3 + 1] = -100; }
    }
    confGeo.attributes.position.needsUpdate = true;

    // Lights.
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    sysGlow.intensity = base.sys * L * (0.7 + 0.6 * onBeat + state.flash) * (1 - 0.5 * soloK);
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); }
        if (data.tier >= 4) { burst(60, x, 3); state.flash = 0.6; }
        break;
      case 'tauntLanded': burst(90, data.attacker === 'rival' ? 1.6 : -1.6, 4); state.flash = 1; state.cheer = 1; break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5; break;
      case 'taunt': state.flash = 0.4; break;
      case 'end': burst(200, x, 6); state.cheer = 1; state.flash = 1; break;
      case 'drop': state.flash = 1; burst(80, 0, 8); break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; burst(90, x, 3);
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
