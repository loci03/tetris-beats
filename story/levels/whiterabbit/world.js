// WHITE RABBIT — the Level 5 battle stage: a Wonderland rave at the mouth
// of the rabbit hole.
//
// A black-and-white checkerboard floor that lights up purple, the rabbit
// hole itself swirling away behind the stage (a hypnotic tunnel of purple
// spirals), a giant clock over the hole whose hands tick on every beat,
// giant spotted mushrooms that squash with the kick, ranks of playing
// cards standing guard that flip in waves on big moves, purple lasers
// fanning over the crowd, clock pieces and gears tumbling down through the
// air, and a crowd of bunny-eared ravers. A SOLO spins the tunnel faster
// and drops every light on the soloist; a landed taunt reverses the spiral
// and flips every card.

import * as THREE from '../../../vendor/three/three.module.min.js';

const PURPLE = 0xc440ff, PINK = 0xff4fd8, LILAC = 0xe090ff, CYAN = 0x3ff6ff;
const NEON = [PURPLE, PINK, CYAN, LILAC, 0x8a5cff];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function heartPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s * 0.6, y - s * 0.05, x - s * 0.35, y - s * 0.5, x, y - s * 0.2);
  g.bezierCurveTo(x + s * 0.35, y - s * 0.5, x + s * 0.6, y - s * 0.05, x, y + s * 0.35);
  g.fill();
}
function spadePath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.6, y, x + s * 0.35, y + s * 0.45, x, y + s * 0.15);
  g.bezierCurveTo(x - s * 0.35, y + s * 0.45, x - s * 0.6, y, x, y - s * 0.4);
  g.fill(); g.fillRect(x - s * 0.06, y + s * 0.1, s * 0.12, s * 0.35);
}

const TUNNEL_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const TUNNEL_FS = `uniform float uT, uBeat, uLevel, uHue; varying vec2 vUv;
  vec3 pal(float t){ return 0.5 + 0.5 * cos(6.2831 * (vec3(0.78, 0.86, 0.95) * 0.0 + vec3(0.75, 0.55, 0.95) + t * vec3(0.12, 0.2, 0.1))); }
  void main(){
    float u = vUv.x, v = 1.0 - vUv.y;
    float sp = fract(u * 6.0 + v * 9.0 - uT);
    float band = smoothstep(0.42, 0.5, sp) * (1.0 - smoothstep(0.92, 1.0, sp));
    float ring = smoothstep(0.85, 1.0, abs(sin((v * 22.0 - uT * 2.0) * 3.1416)));
    vec3 deep = vec3(0.07, 0.0, 0.14), vio = vec3(0.55, 0.12, 0.95), pink = vec3(1.0, 0.3, 0.85);
    vec3 c = mix(deep, mix(vio, pink, 0.5 + 0.5 * sin(v * 12.0 + uHue)), band * (0.55 + 0.45 * uBeat));
    c += vec3(0.9, 0.8, 1.0) * ring * 0.35 * (0.5 + uBeat);
    float far = smoothstep(0.0, 0.85, v);
    c *= mix(1.0, 0.08, far) * (0.25 + 0.75 * uLevel);
    gl_FragColor = vec4(c, 1.0);
  }`;

const FLOOR_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FLOOR_FS = `uniform float uBeat, uFlash, uLevel, uTime, uBar; uniform vec4 uRip; uniform vec2 uSolo; uniform vec3 uA, uB;
  varying vec3 vW;
  void main(){
    vec2 p = vW.xz * 1.25;
    vec2 cell = floor(p);
    float chk = mod(cell.x + cell.y, 2.0);
    vec2 f = abs(fract(p) - 0.5);
    float inner = smoothstep(0.5, 0.44, max(f.x, f.y));
    float d = length(vW.xz - vec2(0.0, 0.3));
    float r = uRip.z * 7.0, rd = length(vW.xz - vec2(uRip.x, 0.2));
    float rip = exp(-pow((rd - r) * 1.5, 2.0)) * uRip.w * (1.0 - min(1.0, r / 9.0));
    float pool = exp(-pow(length(vW.xz - vec2(uSolo.x, 0.2)) / 1.2, 2.0)) * uSolo.y;
    float lit = mod(cell.x + cell.y + uBar, 4.0) < 1.0 ? 1.0 : 0.0;
    vec3 white = vec3(0.86, 0.82, 0.92), black = vec3(0.03, 0.01, 0.05);
    vec3 c = mix(black, white, chk) * (0.35 + 0.15 * uBeat);
    c += mix(uA, uB, chk) * (lit * uBeat * 0.9 + rip * 1.2) * inner;
    c *= uLevel * (1.0 - 0.7 * uSolo.y);
    c += (white * 0.5 + uA * 0.8) * pool * inner;
    c += uA * uFlash * 0.3;
    c *= smoothstep(6.0, 4.5, d) * 0.6 + 0.4;
    gl_FragColor = vec4(c, 1.0);
  }`;

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
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const low = lowGraphics;

  // ── Sky ─────────────────────────────────────────────────────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(95, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uPulse: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse;
      void main(){ float h = vP.y; vec3 top = vec3(0.03, 0.0, 0.07), hor = vec3(0.2, 0.03, 0.3);
        vec3 c = mix(hor, top, smoothstep(-0.05, 0.6, h)) + vec3(0.25, 0.05, 0.3) * uPulse * smoothstep(0.4, 0.0, abs(h - 0.05));
        gl_FragColor = vec4(c, 1.0); }`,
  })));
  group.add(sky);

  // ── The rabbit hole: a swirling tunnel behind the stage ─────────
  const tunnelMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false,
    uniforms: { uT: { value: 0 }, uBeat: { value: 0 }, uLevel: { value: 1 }, uHue: { value: 0 } },
    vertexShader: TUNNEL_VS, fragmentShader: TUNNEL_FS,
  }));
  const tunnel = new THREE.Mesh(keep(new THREE.CylinderGeometry(6.2, 6.2, 60, low ? 24 : 36, 1, true)), tunnelMat);
  tunnel.rotation.x = Math.PI / 2;           // axis along z; uv.v = 1 at the mouth (+z end)
  tunnel.position.set(0, 3.6, -5.6 - 30);
  group.add(tunnel);
  // The mouth: a thick ring with suit pips round it.
  const mouthMat = toon(0x2a0b40);
  const mouth = new THREE.Mesh(keep(new THREE.TorusGeometry(6.35, 0.45, 10, 48)), mouthMat);
  mouth.position.set(0, 3.6, -5.5);
  group.add(mouth);
  const pipGeo = keep(new THREE.SphereGeometry(0.18, 8, 6));
  const pipMat = basic(0xffffff);
  const pips = new THREE.InstancedMesh(pipGeo, pipMat, 24);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 6.35, 3.6 + Math.sin(a) * 6.35, -5.0); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    pips.setMatrixAt(i, dummy.matrix); pips.setColorAt(i, col.set(NEON[i % NEON.length]));
  }
  group.add(pips);
  // Back wall around the mouth so the hole reads as a hole.
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-16, -1); wallShape.lineTo(16, -1); wallShape.lineTo(16, 13); wallShape.lineTo(-16, 13); wallShape.lineTo(-16, -1);
  const hole = new THREE.Path(); hole.absarc(0, 3.6, 6.2, 0, Math.PI * 2, true); wallShape.holes.push(hole);
  const wallTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1b0830'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a0f48'; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) g.fillRect(x * 64, y * 64, 64, 64);
    g.fillStyle = 'rgba(255,79,216,0.35)'; heartPath(g, 32, 34, 30); heartPath(g, 160, 162, 30);
    g.fillStyle = 'rgba(196,64,255,0.35)'; spadePath(g, 160, 32, 30); spadePath(g, 32, 160, 30);
  }));
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(0.25, 0.25);
  const wall = new THREE.Mesh(keep(new THREE.ShapeGeometry(wallShape, 24)), toon(0xffffff, { map: wallTex }));
  wall.position.set(0, 0, -5.6);
  group.add(wall);

  // The giant clock over the hole: minute hand ticks every beat.
  const clockTex = keep(canvasTex(256, 256, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = '#fff6e8'; g.beginPath(); g.arc(c, c, c - 4, 0, Math.PI * 2); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#c9a23a'; g.stroke();
    g.fillStyle = '#2a0f48'; g.font = 'bold 26px "DejaVu Serif", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    R.forEach((r, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(r, c + Math.cos(a) * 96, c + Math.sin(a) * 96); });
    g.strokeStyle = '#7b3cc4'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, 70, 0, Math.PI * 2); g.stroke();
  }));
  const clock = new THREE.Group();
  clock.position.set(0, 3.7, -9.5);
  group.add(clock);
  clock.add(new THREE.Mesh(keep(new THREE.CircleGeometry(1.6, 32)), basic(0xffffff, { map: clockTex })));
  const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(1.62, 0.12, 8, 32)), toon(0xffc93a, { emissive: 0x4a3300 }));
  clock.add(rim);
  const handMat = toon(0x1a0828);
  const minHand = new THREE.Mesh(keep(new THREE.BoxGeometry(0.08, 1.25, 0.04)), handMat); minHand.geometry.translate(0, 0.55, 0); minHand.position.z = 0.04;
  const hrHand = new THREE.Mesh(keep(new THREE.BoxGeometry(0.12, 0.85, 0.04)), handMat); hrHand.geometry.translate(0, 0.35, 0); hrHand.position.z = 0.06;
  clock.add(minHand, hrHand);

  // ── Ground, stage, checker floor ────────────────────────────────
  const deck = new THREE.Mesh(keep(new THREE.BoxGeometry(34, 0.4, 22)), toon(0x1a0a28));
  deck.position.set(0, -0.82, 2);
  group.add(deck);
  const stage = new THREE.Mesh(keep(new THREE.CylinderGeometry(5.9, 6.2, 0.6, 48)), toon(0x22102f));
  stage.position.set(0, -0.31, 0.3); stage.scale.z = 0.72;
  group.add(stage);
  const floorMat = keep(new THREE.ShaderMaterial({
    uniforms: {
      uBeat: { value: 0 }, uFlash: { value: 0 }, uLevel: { value: 1 }, uTime: { value: 0 }, uBar: { value: 0 },
      uRip: { value: new THREE.Vector4(0, 0, 99, 0) }, uSolo: { value: new THREE.Vector2(0, 0) },
      uA: { value: new THREE.Color(PURPLE) }, uB: { value: new THREE.Color(PINK) },
    },
    vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS,
  }));
  const floor = new THREE.Mesh(keep(new THREE.CircleGeometry(5.85, 48)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.scale.y = 0.72; floor.position.set(0, 0.005, 0.3);
  group.add(floor);
  const stageRim = new THREE.Mesh(keep(new THREE.TorusGeometry(5.9, 0.07, 6, 72)), basic(LILAC));
  stageRim.rotation.x = Math.PI / 2; stageRim.scale.y = 0.72; stageRim.position.set(0, 0.02, 0.3);
  group.add(stageRim);

  // ── Giant mushrooms (squash on the kick) ────────────────────────
  const capTex = keep(canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#8a2cff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff4ff';
    for (let i = 0; i < 26; i++) { g.beginPath(); g.arc((i * 53) % w, 10 + (i * 37) % (h - 30), 8 + (i % 4) * 4, 0, Math.PI * 2); g.fill(); }
  }));
  const capGeo = keep(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  const stemGeo = keep(new THREE.CylinderGeometry(0.28, 0.4, 1, 12));
  const capMats = [toon(0xffffff, { map: capTex }), toon(0xff7ae0, { map: capTex })];
  const stemMat = toon(0xf6e6ff);
  const gillMat = toon(0xd9b8ff, { side: THREE.DoubleSide });
  const gillGeo = keep(new THREE.CircleGeometry(1, 20));
  const shrooms = [];
  for (const [x, z, s, m] of [[-6.6, -2.6, 1.7, 0], [6.6, -2.4, 1.6, 1], [-8.8, 1.2, 1.2, 1], [8.8, 1.4, 1.25, 0], [-4.4, -4.6, 0.9, 1], [4.6, -4.7, 0.95, 0], [-11, -4, 2.0, 0], [11.5, -4.5, 2.2, 1]]) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(stemGeo, stemMat); stem.scale.set(s, 2.2 * s, s); stem.position.y = 1.1 * s; g.add(stem);
    const cap = new THREE.Group(); cap.position.y = 2.15 * s; g.add(cap);
    const c = new THREE.Mesh(capGeo, capMats[m]); c.scale.set(1.5 * s, 0.95 * s, 1.5 * s); cap.add(c);
    const gl = new THREE.Mesh(gillGeo, gillMat); gl.rotation.x = Math.PI / 2; gl.scale.setScalar(1.5 * s); cap.add(gl);
    g.position.set(x, -0.62, z); g.rotation.z = (x > 0 ? -1 : 1) * 0.06;
    group.add(g);
    shrooms.push({ cap, s, ph: x * 0.3, side: x < 0 ? 0 : 1, y0: cap.position.y });
  }

  // ── Playing-card guards (flip in waves) ─────────────────────────
  const cardFront = (suit, rank, red) => keep(canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#fffaf2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7b3cc4'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = red ? '#e0287a' : '#2a0f48';
    g.font = 'bold 30px "DejaVu Serif", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(rank, 24, 28); g.save(); g.translate(w - 24, h - 28); g.rotate(Math.PI); g.fillText(rank, 0, 0); g.restore();
    (suit === 'h' ? heartPath : spadePath)(g, w / 2, h / 2, 70);
  }));
  const cardBack = keep(canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#5a1ea8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e090ff'; g.lineWidth = 3;
    for (let i = -h; i < w + h; i += 14) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  }));
  const fronts = [cardFront('h', 'A', true), cardFront('s', 'K', false), cardFront('h', 'Q', true), cardFront('s', 'J', false), cardFront('h', '7', true)];
  const backMat = toon(0xffffff, { map: cardBack });
  const edgeMat = toon(0xf0e6ff);
  const cardGeo = keep(new THREE.BoxGeometry(1.5, 2.25, 0.05));
  const cards = [];
  let ci = 0;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const fm = toon(0xffffff, { map: fronts[(ci++) % fronts.length] });
      const mesh = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, edgeMat, edgeMat, fm, backMat]);
      const piv = new THREE.Group();
      const a = -0.25 + i * 0.32;
      piv.position.set(sx * (6.6 + Math.sin(a) * 2.6 + i * 0.25), -0.62 + 1.13, 3.4 - i * 1.55);
      piv.rotation.y = -sx * (0.9 - i * 0.12);
      piv.add(mesh);
      group.add(piv);
      cards.push({ piv, mesh, base: piv.rotation.y, flip: 0, t0: -9, delay: i * 0.08 + (sx > 0 ? 0.04 : 0) });
    }
  }

  // ── Lasers fanning out of the hole ──────────────────────────────
  const laserGeo = keep(new THREE.CylinderGeometry(0.035, 0.035, 34, 6, 1, true));
  laserGeo.translate(0, 17, 0);
  const lasers = [];
  const LN = low ? 4 : 8;
  for (let i = 0; i < LN; i++) {
    const m = basic(NEON[i % 3], { transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const l = new THREE.Mesh(laserGeo, m);
    l.position.set((i - (LN - 1) / 2) * 0.5, 7.6, -5.3);
    group.add(l);
    lasers.push({ l, m, i });
  }

  // ── Tumbling clock pieces + gears ───────────────────────────────
  const gearShape = new THREE.Shape();
  for (let i = 0; i < 24; i++) {
    const a0 = i / 24 * Math.PI * 2, r = i % 2 ? 0.75 : 1.0;
    const a1 = (i + 1) / 24 * Math.PI * 2;
    if (i === 0) gearShape.moveTo(Math.cos(a0) * r, Math.sin(a0) * r); else gearShape.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    gearShape.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
  }
  const gh = new THREE.Path(); gh.absarc(0, 0, 0.3, 0, Math.PI * 2, true); gearShape.holes.push(gh);
  const gearGeo = keep(new THREE.ExtrudeGeometry(gearShape, { depth: 0.12, bevelEnabled: false, curveSegments: 2 }));
  const gearMat = toon(0xffc93a, { emissive: 0x3a2400 });
  const faceGeo = keep(new THREE.CircleGeometry(0.8, 20));
  const faceMat = basic(0xffffff, { map: clockTex, side: THREE.DoubleSide });
  const bits = [];
  const BN = low ? 8 : 16;
  for (let i = 0; i < BN; i++) {
    const m = new THREE.Mesh(i % 3 === 0 ? faceGeo : gearGeo, i % 3 === 0 ? faceMat : gearMat);
    const x = (i % 2 ? 1 : -1) * (3 + (i * 37 % 9)), z = -4 - (i * 53 % 14);
    m.scale.setScalar(0.5 + (i % 4) * 0.25);
    group.add(m);
    bits.push({ m, x, z, y0: (i * 7.3) % 16, sp: 0.4 + (i % 5) * 0.15, rx: (i % 3) - 1, rz: ((i * 7) % 3) - 1 });
  }

  // Neon sign under the clock.
  const signTex = keep(canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = 'italic 900 70px "DejaVu Serif", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#c440ff'; g.shadowBlur = 24;
    g.strokeStyle = '#e090ff'; g.lineWidth = 7; g.strokeText('White Rabbit', w / 2, h / 2);
    g.shadowBlur = 10; g.fillStyle = '#fff4ff'; g.fillText('White Rabbit', w / 2, h / 2);
  }));
  const signMat = basic(0xffffff, { map: signTex, transparent: true, depthWrite: false });
  const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(5.6, 1.4)), signMat);
  sign.position.set(0, 6.05, -4.9);
  group.add(sign);

  // ── Crowd: bunny-eared ravers with glow sticks ──────────────────
  const spots = [];
  const row = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.2 + Math.random() * 0.6) / n, z: z + Math.random() * 0.5, y }); };
  const cs = low ? 0.6 : 1;
  row(Math.round(13 * cs), -6.6, 6.6, 5.4, -1.0);
  row(Math.round(15 * cs), -7.8, 7.8, 6.4, -1.1);
  const CN = spots.length;
  const crowdMat = toon(0xffffff);
  const cBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.26, 0.6, 3, 8)), crowdMat, CN);
  const cHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.2, 10, 8)), crowdMat, CN);
  const cEar = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.045, 0.24, 2, 6)), crowdMat, CN * 2);
  const cStick = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.035, 0.42, 2, 6)), basic(0xffffff), CN * 2);
  const tops = [0x7a2cff, 0xff4fd8, 0x3a1460, 0xe090ff, 0x2a0f48];
  const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22];
  spots.forEach((c, i) => {
    c.ph = Math.random() * 6.28; c.hype = 0.6 + Math.random() * 0.6;
    cBody.setColorAt(i, col.set(tops[i % tops.length]));
    cHead.setColorAt(i, col.set(skins[i % skins.length]));
    for (const k of [0, 1]) { cEar.setColorAt(i * 2 + k, col.set(i % 3 ? 0xffffff : 0xffb0e8)); cStick.setColorAt(i * 2 + k, col.set(NEON[(i + k) % 3])); }
  });
  group.add(cBody, cHead, cEar, cStick);

  // ── Sparkle dust (falls through the air) ────────────────────────
  const DN = low ? 140 : 300;
  const dPos = new Float32Array(DN * 3), dCol = new Float32Array(DN * 3), dSp = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 22; dPos[i * 3 + 1] = Math.random() * 12; dPos[i * 3 + 2] = -6 + Math.random() * 11;
    col.set(NEON[i % NEON.length]); dCol[i * 3] = col.r; dCol[i * 3 + 1] = col.g; dCol[i * 3 + 2] = col.b;
    dSp[i] = 0.3 + Math.random() * 0.7;
  }
  const dGeo = keep(new THREE.BufferGeometry());
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dotTex = keep(canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }));
  const dMat = keep(new THREE.PointsMaterial({ size: 0.18, vertexColors: true, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false;
  group.add(dust);
  let dBurst = 0;

  // ── Spot cones ──────────────────────────────────────────────────
  const truss = new THREE.Mesh(keep(new THREE.BoxGeometry(10, 0.2, 0.2)), toon(0x2a1438));
  truss.position.set(0, 6.6, 1.4);
  group.add(truss);
  const coneGeo = keep(new THREE.ConeGeometry(0.85, 6.8, 20, 1, true));
  coneGeo.translate(0, -3.4, 0);
  const cones = [];
  for (const [x, tx] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    const fix = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.18, 0.25, 0.36, 10)), toon(0x150a1e));
    fix.position.set(x, 6.4, 1.4);
    group.add(fix);
    const m = basic(PURPLE, { transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(coneGeo, m); c.position.copy(fix.position);
    group.add(c);
    cones.push({ cone: c, mat: m, baseX: x, tx, side: tx < 0 ? 'player' : 'rival' });
  }

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffe8ff, 0x2a0a40, 1.15);
  const key = new THREE.DirectionalLight(0xfff4ff, 1.6); key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(PINK, 20, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(CYAN, 16, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const holeGlow = new THREE.PointLight(PURPLE, 18, 16, 1.4); holeGlow.position.set(0, 3.4, -4.4);
  group.add(hemi, key, rimL, rimR, holeGlow);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, hole: holeGlow.intensity };

  // ── State + update ──────────────────────────────────────────────
  const S = { L: 1, flash: 0, cheer: 0, focus: 0, rip: null, solo: null, tT: 0, spin: 0, wob: 0, lastBeat: -99,
    // Tetris piece reactions (backdrop only).
    cardNext: [0, 0], clockOff: 0, clockTo: 0, twist: 0, twistV: 0, pull: 0, rev: 0, shX: 0, shV: 0, bitBoost: 0,
    laser: 0, laserFan: 0, signK: 0, hop: [0, 0], hopV: [0, 0], lean: [0, 0], capSpin: 0, capTo: 0, glow: 0, glowHz: 0, chaseHead: 0, chaseLeft: 0, chaseRate: 0, pipsOn: false, dustPush: 0 };
  const pipK = new Float32Array(24);

  function flipCards(t, all = true, side = 0) {
    for (const c of cards) if (all || Math.sign(c.piv.position.x) === side) { c.t0 = t + c.delay; }
  }

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), L = S.L, whole = Math.floor(beat);
    S.flash = Math.max(0, S.flash - dt * 2.2);
    S.cheer = Math.max(0, S.cheer - dt * 0.5);
    S.spin = Math.max(0, S.spin - dt * 0.7);
    S.wob = Math.max(0, S.wob - dt * 0.7);
    dBurst = Math.max(0, dBurst - dt * 0.6);
    S.focus += ((info.leader || 0) - S.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (S.solo) {
      const so = S.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) S.solo = null;
    }

    // Tunnel spiral: drifts inward with the music; solo = hypnotic rush,
    // landed taunt = it runs backwards.
    S.pull = Math.max(0, S.pull - dt * 1.5); S.rev = Math.max(0, S.rev - dt);
    S.bitBoost = Math.max(0, S.bitBoost - dt * 0.8); S.laser = Math.max(0, S.laser - dt * 1.8);
    S.laserFan = Math.max(0, S.laserFan - dt * 1.2); S.signK = Math.max(0, S.signK - dt * 1.4);
    S.twistV += (-S.twist * 40 - S.twistV * 5) * dt; S.twist += S.twistV * dt;
    S.shV += (-S.shX * 160 - S.shV * 7) * dt; S.shX += S.shV * dt;
    S.clockOff += (S.clockTo - S.clockOff) * Math.min(1, dt * 7);
    S.capSpin += (S.capTo - S.capSpin) * Math.min(1, dt * 6);
    S.glow = Math.max(0, S.glow - dt * 1.1);
    for (const k of [0, 1]) {
      S.hopV[k] += (-S.hop[k] * 120 - S.hopV[k] * 6) * dt; S.hop[k] += S.hopV[k] * dt;
      S.lean[k] *= Math.exp(-dt * 4);
    }
    const dir = S.wob > 0.2 || S.rev > 0 ? -1 : 1;
    S.tT += dt * dir * (0.25 + 0.6 * S.spin + 1.4 * soloK + 3 * S.pull);
    tunnelMat.uniforms.uT.value = S.tT;
    tunnelMat.uniforms.uBeat.value = onBeat + S.flash;
    tunnelMat.uniforms.uLevel.value = L;
    tunnelMat.uniforms.uHue.value = songTime * 0.4;
    tunnel.rotation.y = 0; tunnel.rotation.z = songTime * 0.05 * dir + S.twist;
    sky.material.uniforms.uPulse.value = onBeat * 0.6 * L + S.flash;

    // Clock: the minute hand ticks on every beat, the hour hand per bar.
    const tick = whole + smooth01((ph) / 0.12);
    minHand.rotation.z = -tick * Math.PI / 6 - S.clockOff;
    hrHand.rotation.z = -(beat / 4) * Math.PI / 24 - S.clockOff / 12;
    clock.scale.setScalar(1 + 0.04 * onBeat + 0.1 * S.flash + 0.12 * S.signK);
    clock.rotation.z = S.twist * 0.25;

    // Suit pips round the mouth: a chase of light runs round on clears.
    if (S.chaseLeft > 0) {
      const adv = Math.min(S.chaseLeft, S.chaseRate * dt);
      const h0 = Math.floor(S.chaseHead); S.chaseHead += adv; S.chaseLeft -= adv;
      for (let k = h0; k <= Math.floor(S.chaseHead); k++) pipK[((k % 24) + 24) % 24] = 1;
      S.pipsOn = true;
    }
    if (S.pipsOn) {
      let any = false;
      for (let i = 0; i < 24; i++) {
        pipK[i] = Math.max(0, pipK[i] - dt * 1.6); if (pipK[i] > 0) any = true;
        pips.setColorAt(i, col.set(NEON[i % NEON.length]).multiplyScalar(1 - 0.5 * pipK[i]).addScalar(pipK[i] * 0.9));
      }
      pips.instanceColor.needsUpdate = true; S.pipsOn = any || S.chaseLeft > 0;
    }

    // Floor.
    const fu = floorMat.uniforms;
    fu.uBeat.value = onBeat; fu.uFlash.value = S.flash; fu.uLevel.value = L; fu.uTime.value = songTime; fu.uBar.value = whole % 4;
    if (S.rip) { fu.uRip.value.set(S.rip.x, 0, songTime - S.rip.t, S.rip.k ?? 1); if (songTime - S.rip.t > 2) S.rip = null; } else fu.uRip.value.w = 0;
    fu.uSolo.value.set(soloX, soloK);
    stageRim.material.color.set(NEON[(whole >> 2) % 3]).multiplyScalar(0.55 + 0.45 * onBeat);

    // Mushrooms squash on the beat.
    for (const m of shrooms) {
      const hp = S.hop[m.side];
      const sq = Math.exp(-ph * 5) * 0.08 * L + S.shX - hp * 0.5;
      m.cap.scale.set(1 + sq, Math.max(0.3, 1 - sq * 1.4), 1 + sq);
      m.cap.position.y = m.y0 + Math.max(0, hp) * 0.9 * m.s;
      m.cap.rotation.z = Math.sin(songTime * 0.8 + m.ph) * 0.04 + S.lean[m.side] * Math.min(1, Math.abs(hp) * 4 + 0.3);
      m.cap.rotation.y = S.capSpin * (m.side ? -1 : 1);
    }
    // Caps glow (spots light up) on clears: flicker n times.
    {
      const gk = S.glow * (0.55 + 0.45 * Math.cos(songTime * S.glowHz * 6.283));
      capMats[0].emissive.setRGB(0.55 * gk, 0.15 * gk, 0.9 * gk);
      capMats[1].emissive.setRGB(0.9 * gk, 0.2 * gk, 0.7 * gk);
    }

    // Cards: idle sway, flip over a full turn when triggered.
    for (const c of cards) {
      const u = Math.max(0, Math.min(1, (songTime - c.t0) / 0.7));
      c.piv.rotation.y = c.base + Math.PI * 2 * smooth01(u) + Math.sin(songTime * 1.3 + c.delay * 20) * 0.04;
      c.piv.position.y = 0.51 + 0.12 * Math.sin(Math.PI * u) + 0.03 * onBeat;
    }

    // Lasers sweep in a fan, flicker on the beat.
    for (const z of lasers) {
      const k = z.i / Math.max(1, LN - 1) - 0.5;
      const sweep = Math.sin(songTime * 0.9 + z.i * 0.6);
      z.l.rotation.set(1.25 + 0.15 * Math.sin(songTime * 1.3 + z.i) - 0.25 * S.laserFan, 0, k * (1.6 + 1.2 * S.laserFan) + 0.35 * sweep + S.twist * 0.6);
      z.m.opacity = L * (0.15 + 0.45 * onBeat + 0.4 * S.flash + 0.6 * S.laser) * (1 - 0.7 * soloK);
      z.m.color.set(NEON[(z.i + (whole >> 1) + (S.laser > 0.05 ? Math.floor(songTime * 12) : 0)) % 3]);
    }

    // Falling clock bits.
    for (const bt of bits) {
      bt.y0 += bt.sp * 4 * S.bitBoost * dt;
      const y = 14 - ((((songTime * bt.sp + bt.y0) % 16) + 16) % 16);
      bt.m.position.set(bt.x + Math.sin(songTime * 0.5 + bt.y0) * 0.6, y, bt.z);
      bt.m.rotation.set(songTime * 0.6 * bt.rx + bt.y0 * 2, songTime * 0.4, songTime * 0.5 * bt.rz + S.clockOff * 0.5);
    }

    // Sparkle dust.
    const dv = 1 + 2.5 * dBurst;
    S.dustPush *= Math.exp(-dt * 3);
    for (let i = 0; i < DN; i++) {
      dPos[i * 3 + 1] -= dSp[i] * dv * dt;
      dPos[i * 3] += (Math.sin(songTime * 1.5 + i) * 0.2 + S.dustPush * (0.6 + (i % 7) * 0.25)) * dt;
      if (dPos[i * 3] > 11) dPos[i * 3] -= 22; else if (dPos[i * 3] < -11) dPos[i * 3] += 22;
      if (dPos[i * 3 + 1] < -0.3) dPos[i * 3 + 1] += 12.3;
    }
    dGeo.attributes.position.needsUpdate = true;
    dMat.size = 0.14 + 0.08 * onBeat + 0.1 * dBurst;

    // Cones.
    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, S.focus) : Math.max(0, -S.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.3;
      const dx = c.tx + (soloX - c.tx) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.6); c.cone.rotation.x = -0.1;
      c.mat.color.set(NEON[(i + (whole >> 2)) % 3]);
      c.mat.opacity = (0.03 + 0.05 * onBeat + 0.05 * lead + 0.1 * S.flash) * L * (1 + 0.6 * soloK);
    });

    // Crowd: bounce, glow sticks waving overhead when hyped.
    const hype = Math.min(1, 0.4 + S.cheer + Math.abs(S.focus) * 0.3);
    spots.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 4 + c.ph * 0.3)) * (0.05 + 0.22 * hype * c.hype) * L;
      dummy.position.set(c.x, c.y + 0.58 + jump, c.z);
      dummy.rotation.set(0, Math.atan2(-c.x, -c.z + 8) * 0.3, S.focus * 0.12 * Math.sign(-c.x || 1));
      dummy.scale.setScalar(1); dummy.updateMatrix(); cBody.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.66; dummy.updateMatrix(); cHead.setMatrixAt(i, dummy.matrix);
      for (const sd of [-1, 1]) {
        dummy.position.set(c.x + sd * 0.09, c.y + 1.24 + 0.24 + jump, c.z);
        dummy.rotation.set(0, 0, sd * -0.15); dummy.updateMatrix();
        cEar.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
        const wave = Math.sin(beat * Math.PI + c.ph + sd);
        const up = hype > 0.6 ? 2.7 + 0.3 * wave : 0.6 + 0.4 * wave;
        dummy.position.set(c.x + sd * (0.3 + 0.25 * Math.sin(up)), c.y + 0.95 + jump - 0.3 * Math.cos(up), c.z + 0.1);
        dummy.rotation.set(0, 0, sd * up); dummy.updateMatrix();
        cStick.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
    });
    cBody.instanceMatrix.needsUpdate = cHead.instanceMatrix.needsUpdate = cEar.instanceMatrix.needsUpdate = cStick.instanceMatrix.needsUpdate = true;

    signMat.opacity = L * (0.85 + 0.15 * onBeat);
    signMat.color.setScalar(1 + 1.2 * S.signK);
    sign.scale.setScalar(1 + 0.1 * S.signK * (1 + Math.sin(songTime * 30) * 0.3));
    // Wobble (landed taunt): the whole place sways like a dream.
    group.rotation.z = Math.sin(songTime * 3) * 0.02 * S.wob;

    // Lights.
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.5 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, S.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -S.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    holeGlow.intensity = base.hole * L * (0.7 + 0.5 * onBeat + S.flash) * (1 - 0.5 * soloK);
  }
  function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  // Tetris piece actions (the old 2D level was purple code rain that pinged
  // columns on moves and rushed on clears; here it's Wonderland's take):
  // each move flips the next playing card on that side and blows the
  // sparkle dust over, a spin twists the rabbit hole and turns the clock
  // hands a quarter, soft drops pull you down the hole, a hard drop
  // bounces the mushrooms and ripples the checkerboard from the piece's
  // column, a hold runs the clock BACKWARDS (I'm late!), clears run a
  // chase of light round the hole's pips and flip cards in waves, a
  // Tetris flips every card and sends the clock spinning.
  const colX = (c) => ((c ?? 4.5) - 4.5) * 0.34;
  function chase(n, rate) { S.chaseLeft += n; S.chaseRate = Math.max(S.chaseRate * (S.chaseLeft > n ? 1 : 0), rate); }
  function flipNext(side, t) {
    const si = side < 0 ? 0 : 1, c = cards[si * 5 + (S.cardNext[si] % 5)];
    S.cardNext[si]++; c.t0 = t;
  }
  function piece(d) {
    const t = d.songTime ?? curT;
    switch (d.kind) {
      case 'move': {
        const dir = d.dir || 0;
        if (dir) { flipNext(dir, t); const k = dir < 0 ? 0 : 1; S.hopV[k] += 2.6; S.lean[k] = -dir * 0.22; }
        S.dustPush += dir * 2.2;
        break;
      }
      case 'rotate': {
        const dir = d.dir || 1;
        S.twistV += dir * 3.2; S.clockTo += dir * Math.PI / 2; S.laser = Math.max(S.laser, 0.35);
        S.capTo += dir * Math.PI / 2;
        break;
      }
      case 'soft':
        S.pull = Math.min(1, S.pull + 0.45); S.clockTo += Math.PI / 6; S.bitBoost = Math.max(S.bitBoost, 0.4);
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.3 + r / 14);
        S.shV -= 4.5 * k; S.rip = { t, x: colX(d.col), k: 0.5 + 0.8 * k };
        S.bitBoost = Math.max(S.bitBoost, k); dBurst = Math.max(dBurst, 0.6 * k);
        if (r >= 10) { S.flash = Math.max(S.flash, 0.4); S.laserFan = 1; }
        break;
      }
      case 'hold':
        S.clockTo -= Math.PI * 2; S.rev = 0.7; S.twistV -= 2.5; S.signK = 0.5; S.capTo -= Math.PI;
        break;
      case 'clear': {
        const n = d.lines || 1, combo = d.combo || 0;
        chase(n >= 4 ? 48 : n * 6 + combo * 3, 30 + 12 * n + 8 * combo);
        S.laser = Math.min(1.4, 0.4 + 0.2 * n + 0.15 * combo); S.laserFan = Math.min(1, 0.3 * n);
        dBurst = Math.max(dBurst, 0.3 * n); S.cheer = Math.min(1, S.cheer + 0.2 * n);
        S.glow = Math.min(1.6, 0.6 + 0.2 * n + 0.15 * combo); S.glowHz = 1.5 + n + combo * 0.8;
        S.hopV[0] += 1.2 * n; S.hopV[1] += 1.2 * n;
        S.clockTo += (combo + 1) * Math.PI / 3;
        if (n >= 4) { flipCards(t, true); S.clockTo += Math.PI * 4; S.pull = 1; S.shV -= 2.5; }
        else for (const c of cards) { const i = cards.indexOf(c) % 5; if (i < n + Math.min(2, combo)) c.t0 = t + i * 0.09; }
        break;
      }
      case 'levelUp':
        S.signK = 1.4; S.clockTo += Math.PI * 4; chase(24, 40); S.capTo += Math.PI * 2; S.glow = 1.4; S.glowHz = 3; S.laser = 1; S.laserFan = 1; flipCards(t, true);
        break;
      case 'gameOver':
        S.wob = 2.2; S.clockTo -= Math.PI * 6; S.signK = 0;
        break;
      case 'start':
        S.signK = 1; chase(24, 36);
        break;
    }
  }

  function react(type, data = {}) {
    if (type === 'piece') { piece(data); return; }
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    const t = data.songTime;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { S.rip = { t, x }; S.cheer = Math.min(1, S.cheer + 0.35); S.spin = Math.max(S.spin, 0.6); }
        if (data.tier >= 4) { S.flash = 0.6; dBurst = 1; flipCards(t, false, Math.sign(x) || 1); }
        break;
      case 'taunt': S.flash = 0.4; S.spin = 1; break;
      case 'tauntLanded': S.flash = 1; S.cheer = 1; S.wob = 1.6; dBurst = 1; flipCards(curT, true); break;
      case 'dodge': S.cheer = Math.min(1, S.cheer + 0.6); S.flash = 0.5; break;
      case 'end': S.cheer = 1; S.flash = 1; dBurst = 1.5; flipCards(curT, true); break;
      case 'drop': S.flash = 1; S.spin = 1.2; dBurst = 1; flipCards(curT, true); break;
      case 'solo':
        S.solo = { x, t0: t, t1: data.until };
        S.flash = 0.8; S.cheer = 1; dBurst = 1; flipCards(t, true);
        break;
    }
  }
  // Song time of the last frame (for reactions that carry no songTime).
  let curT = 0;
  const _update = update;

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update(dt, info) { curT = info.songTime; _update(dt, info); },
    react,
    setLightLevel(v) { S.L = Math.max(0, Math.min(1, v)); },
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); },
  };
}
