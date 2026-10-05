// GALAXY — the Level 20 battle stage: a floating platform in deep space.
//
// A disc of rock drifting through a nebula, its top an orbital chart that
// lights up in rings with the beat; glowing orbit rings circling the
// stage, a ringed gas giant, a blue planet and a moon hanging in the void,
// a twinkling starfield, comets streaking past, an asteroid belt wheeling
// round, crystals floating at the rim, and a crowd of little aliens
// bobbing in zero gravity. Big moves set off supernova shells; a landed
// taunt brings down a meteor shower; a SOLO dims the galaxy and drops the
// starlight on the soloist while the orbit rings close in round them.

import * as THREE from '../../../vendor/three/three.module.min.js';

const CYAN = 0x7df9ff, PINK = 0xff66e0, VIOLET = 0x8a6dff, GOLD = 0xffe27a;
const NEON = [CYAN, PINK, VIOLET, GOLD];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const FLOOR_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FLOOR_FS = `uniform float uBeat, uFlash, uLevel, uTime; uniform vec4 uRip; uniform vec2 uSolo; uniform vec3 uA, uB;
  varying vec3 vW;
  void main(){
    vec2 q = vW.xz - vec2(0.0, 0.3);
    float r = length(q), a = atan(q.y, q.x);
    float rings = 1.0 - smoothstep(0.0, 0.035, abs(fract(r * 1.3) - 0.5) - 0.44);
    float spokes = 1.0 - smoothstep(0.0, 0.02, abs(fract(a / 6.2831 * 24.0) - 0.5) - 0.47);
    spokes *= smoothstep(1.0, 1.6, r);
    float wave = pow(0.5 + 0.5 * sin(r * 4.0 - uTime * 3.0), 8.0);
    float ring = mod(floor(r * 1.3) + floor(uTime * 1.53), 3.0) < 1.0 ? 1.0 : 0.0;
    float rd = length(vW.xz - vec2(uRip.x, 0.2)), rr = uRip.z * 7.0;
    float rip = exp(-pow((rd - rr) * 1.6, 2.0)) * uRip.w * (1.0 - min(1.0, rr / 9.0));
    float pool = exp(-pow(length(vW.xz - vec2(uSolo.x, 0.2)) / 1.2, 2.0)) * uSolo.y;
    vec3 base = mix(vec3(0.05, 0.04, 0.12), vec3(0.09, 0.07, 0.2), smoothstep(5.5, 0.0, r));
    vec3 c = base + uA * rings * (0.25 + 0.5 * uBeat * ring + 0.4 * wave) + uB * spokes * (0.15 + 0.2 * uBeat);
    c += uB * rip * (0.6 + rings) + (uA * 0.6 + 0.3) * pool * (0.5 + rings);
    c *= uLevel * (1.0 - 0.6 * uSolo.y) + pool * uSolo.y * 0.6;
    c += uA * uFlash * 0.25 * rings;
    gl_FragColor = vec4(c, 1.0);
  }`;

export function buildWorld({ lowGraphics = false } = {}) {
  const group = new THREE.Group();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([60, 150, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const low = lowGraphics;
  const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

  // ── Nebula sky (baked once into a small equirect texture — cheap to draw) ──
  const nebTex = (() => {
    const W = low ? 192 : 256, H = W / 2, data = new Uint8Array(W * H * 4);
    const hash = (x, y, z) => { let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
    const noise = (x, y, z) => {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
      const L = (a, b, t) => a + (b - a) * t;
      const c = (dx, dy, dz) => hash(ix + dx, iy + dy, iz + dz);
      return L(L(L(c(0, 0, 0), c(1, 0, 0), ux), L(c(0, 1, 0), c(1, 1, 0), ux), uy), L(L(c(0, 0, 1), c(1, 0, 1), ux), L(c(0, 1, 1), c(1, 1, 1), ux), uy), uz);
    };
    const fbm = (x, y, z) => { let v = 0, a = 0.5; for (let i = 0; i < 4; i++) { v += a * noise(x, y, z); x = x * 2.03 + 1.7; y = y * 2.03 + 1.7; z = z * 2.03 + 1.7; a *= 0.5; } return v; };
    const ss = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    for (let j = 0; j < H; j++) {
      const th = (j + 0.5) / H * Math.PI, y = Math.cos(th), r = Math.sin(th);
      for (let i = 0; i < W; i++) {
        const ph = (i + 0.5) / W * Math.PI * 2, x = -Math.cos(ph) * r, z = Math.sin(ph) * r;
        const n = fbm(x * 2.2, y * 2.2, z * 2.2), m = fbm(x * 4.5 + 3.1, y * 4.5 + 1.2, z * 4.5);
        const band = Math.exp(-Math.pow((y - 0.15 + 0.25 * x) * 2.4, 2));
        let R = 0.01, G = 0.008, B = 0.04;
        const a1 = ss(0.4, 0.8, n) * (0.5 + band), a2 = ss(0.5, 0.9, m) * band * 0.9, a3 = Math.pow(ss(0.6, 1.0, n * m * 1.6), 2) * 0.5;
        R += 0.42 * a1 + 0.05 * a2 + 0.9 * a3; G += 0.1 * a1 + 0.35 * a2 + 0.3 * a3; B += 0.6 * a1 + 0.5 * a2 + 0.7 * a3;
        const o = (j * W + i) * 4;
        data[o] = Math.min(255, R * 255); data[o + 1] = Math.min(255, G * 255); data[o + 2] = Math.min(255, B * 255); data[o + 3] = 255;
      }
    }
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; t.flipY = true; t.needsUpdate = true;
    return keep(t);
  })();
  const skyMat = basic(0xffffff, { map: nebTex, side: THREE.BackSide, depthWrite: false, fog: false });
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(120, 32, 16)), skyMat);
  group.add(sky);

  // ── Starfield (twinkles with the beat) ──────────────────────────
  const SN = low ? 700 : 1500;
  const sPos = new Float32Array(SN * 3), sPh = new Float32Array(SN), sSz = new Float32Array(SN), sCol = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 40, q = Math.sqrt(1 - u * u);
    sPos[i * 3] = Math.cos(a) * q * r; sPos[i * 3 + 1] = u * r; sPos[i * 3 + 2] = Math.sin(a) * q * r;
    sPh[i] = Math.random() * 6.28; sSz[i] = 0.6 + Math.random() * Math.random() * 3.2;
    col.set(i % 7 === 0 ? PINK : i % 5 === 0 ? CYAN : 0xffffff); sCol[i * 3] = col.r; sCol[i * 3 + 1] = col.g; sCol[i * 3 + 2] = col.b;
  }
  const sGeo = keep(new THREE.BufferGeometry());
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('aPh', new THREE.BufferAttribute(sPh, 1));
  sGeo.setAttribute('aSz', new THREE.BufferAttribute(sSz, 1));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const starMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uT: { value: 0 }, uBeat: { value: 0 }, uLevel: { value: 1 }, uPx: { value: 1 } },
    vertexShader: `attribute float aPh, aSz; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uT, uBeat, uPx;
      void main(){ vC = color; float tw = 0.55 + 0.45 * sin(uT * 2.0 + aPh * 3.0); vA = tw * (0.6 + 0.4 * uBeat);
        gl_PointSize = aSz * uPx * (1.0 + 0.5 * uBeat * step(2.0, aSz)); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vC; varying float vA; uniform float uLevel;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.0, r) + 0.6 * smoothstep(0.08, 0.0, min(abs(d.x), abs(d.y))) * smoothstep(0.5, 0.1, r);
        gl_FragColor = vec4(vC * a * vA * (0.4 + 0.6 * uLevel), 1.0); }`,
  }));
  const stars = new THREE.Points(sGeo, starMat); stars.frustumCulled = false;
  group.add(stars);

  // ── Planets ─────────────────────────────────────────────────────
  const bandTex = keep(canvasTex(256, 128, (g, w, h) => {
    const cs = ['#ffb4e8', '#e070c8', '#ffd6a8', '#b660d8', '#ff9ad0', '#7a48c8', '#ffc2e0'];
    let y = 0; let i = 0;
    while (y < h) { const bh = 6 + (i * 7 % 13); g.fillStyle = cs[i % cs.length]; g.fillRect(0, y, w, bh); y += bh; i++; }
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(170, 70, 22, 9, 0, 0, Math.PI * 2); g.fill();
  }));
  const giant = new THREE.Mesh(keep(new THREE.SphereGeometry(9, 32, 20)), toon(0xffffff, { map: bandTex, emissive: 0x1a0620 }));
  giant.position.set(-26, 11, -55); giant.rotation.z = 0.35;
  group.add(giant);
  const ringTex = keep(canvasTex(256, 16, (g, w, h) => {
    for (let x = 0; x < w; x++) { const a = 0.25 + 0.6 * Math.abs(Math.sin(x * 0.11) * Math.sin(x * 0.037)); g.fillStyle = `rgba(255,${190 + (x % 40)},${230},${x < 20 || x > w - 8 ? 0 : a})`; g.fillRect(x, 0, 1, h); }
  }));
  const ringGeo = keep(new THREE.RingGeometry(11, 18, 64, 1));
  { const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv; for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - 11) / 7, 0.5); } }
  const pRing = new THREE.Mesh(ringGeo, basic(0xffffff, { map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  pRing.position.copy(giant.position); pRing.rotation.set(-Math.PI / 2 + 0.45, 0.2, 0.35);
  group.add(pRing);
  const blue = new THREE.Mesh(keep(new THREE.SphereGeometry(4.5, 24, 16)), toon(0x3a8cff, { emissive: 0x06183a }));
  blue.position.set(30, 17, -60);
  group.add(blue);
  const atmo = new THREE.Mesh(keep(new THREE.SphereGeometry(4.9, 24, 16)), basic(CYAN, { transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
  atmo.position.copy(blue.position);
  group.add(atmo);
  const moon = new THREE.Mesh(keep(new THREE.SphereGeometry(1.6, 16, 12)), toon(0xd8d4ec));
  group.add(moon);

  // ── The floating platform ───────────────────────────────────────
  const rock = new THREE.Mesh(keep(new THREE.ConeGeometry(6.4, 5.5, 10, 3)), toon(0x3a2f58));
  rock.rotation.x = Math.PI; rock.position.set(0, -3.38, 0.3); rock.scale.z = 0.78;
  group.add(rock);
  const slab = new THREE.Mesh(keep(new THREE.CylinderGeometry(6.3, 6.4, 0.6, 48)), toon(0x2a2246));
  slab.position.set(0, -0.31, 0.3); slab.scale.z = 0.78;
  group.add(slab);
  const floorMat = keep(new THREE.ShaderMaterial({
    uniforms: {
      uBeat: { value: 0 }, uFlash: { value: 0 }, uLevel: { value: 1 }, uTime: { value: 0 },
      uRip: { value: new THREE.Vector4(0, 0, 99, 0) }, uSolo: { value: new THREE.Vector2(0, 0) },
      uA: { value: new THREE.Color(CYAN) }, uB: { value: new THREE.Color(PINK) },
    },
    vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS,
  }));
  const floor = new THREE.Mesh(keep(new THREE.CircleGeometry(6.25, 64)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.scale.y = 0.78; floor.position.set(0, 0.005, 0.3);
  group.add(floor);
  const rimMat = basic(CYAN);
  const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(6.3, 0.07, 6, 80)), rimMat);
  rim.rotation.x = Math.PI / 2; rim.scale.y = 0.78; rim.position.set(0, 0.02, 0.3);
  group.add(rim);
  // Engine glow under the rock.
  const glowTex = keep(canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
  const under = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: VIOLET, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  under.position.set(0, -6.5, 0.3); under.scale.set(6, 6, 1);
  group.add(under);

  // Orbit rings circling the stage.
  const orbitGeo = keep(new THREE.TorusGeometry(1, 0.025, 4, 96));
  const orbits = [];
  for (const [r, tx, tz, c, sp] of [[6.9, 0.1, 0.05, CYAN, 0.12], [7.5, -0.08, 0.12, PINK, -0.08], [8.2, 0.05, -0.1, VIOLET, 0.05]]) {
    const m = basic(c, { transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const o = new THREE.Mesh(orbitGeo, m);
    o.scale.setScalar(r); o.position.set(0, 1.0, 0.3);
    group.add(o);
    const moonlet = new THREE.Mesh(keep(new THREE.SphereGeometry(0.16, 10, 8)), basic(c));
    group.add(moonlet);
    orbits.push({ o, m, r, tx, tz, sp, moonlet });
  }

  // Floating crystals at the rim.
  const crystGeo = keep(new THREE.OctahedronGeometry(0.4, 0));
  const crystals = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI + (i / 7 - 0.5) * 3.6;
    const m = toon(NEON[i % 3], { emissive: NEON[i % 3], emissiveIntensity: 0.35 });
    const c = new THREE.Mesh(crystGeo, m);
    c.scale.set(0.8, 1.6, 0.8);
    group.add(c);
    crystals.push({ c, m, x: Math.sin(a) * 6.9, z: 0.3 + Math.cos(a) * 5.0, ph: i * 1.3 });
  }

  // ── Asteroid belt ───────────────────────────────────────────────
  const AN = low ? 30 : 64;
  const astMesh = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(0.5, 0)), toon(0x6a5a8a), AN);
  const asts = [];
  for (let i = 0; i < AN; i++) {
    asts.push({ a: Math.random() * Math.PI * 2, r: 13 + Math.random() * 6, y: -3 + Math.random() * 2.5, s: 0.4 + Math.random() * 1.4, sp: 0.02 + Math.random() * 0.03, rx: Math.random() * 6, ry: Math.random() * 6 });
    astMesh.setColorAt(i, col.setHSL(0.72 + Math.random() * 0.08, 0.25, 0.35 + Math.random() * 0.2));
  }
  group.add(astMesh);

  // ── Comets / meteors ────────────────────────────────────────────
  const tailTex = keep(canvasTex(128, 16, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, 0); g.lineTo(w, h); g.closePath(); g.fill();
  }));
  const tailGeo = keep(new THREE.PlaneGeometry(1, 1)); tailGeo.translate(-0.5, 0, 0);
  const comets = [];
  const CM = low ? 5 : 9;
  for (let i = 0; i < CM; i++) {
    const tm = basic(i % 2 ? PINK : CYAN, { map: tailTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const tail = new THREE.Mesh(tailGeo, tm);
    const head = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    tail.visible = head.visible = false;
    group.add(tail, head);
    comets.push({ tail, head, life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), len: 4 });
  }
  const _q = new THREE.Vector3();
  function launch(n = 1, fast = false) {
    for (let k = 0; k < n; k++) {
      const c = comets.find(q => q.life <= 0); if (!c) return;
      const sx = Math.random() < 0.5 ? -1 : 1;
      c.p.set(sx * (22 + Math.random() * 10), 10 + Math.random() * 14, -20 - Math.random() * 25);
      c.v.set(-sx * (12 + Math.random() * 8) * (fast ? 1.6 : 1), -(4 + Math.random() * 5) * (fast ? 1.6 : 1), 4 + Math.random() * 4);
      c.max = c.life = fast ? 1.6 : 3.2; c.len = fast ? 6 : 5 + Math.random() * 3;
      c.tail.visible = c.head.visible = true;
    }
  }
  let nextComet = 2;

  // ── Supernova shells ────────────────────────────────────────────
  const shellGeo = keep(new THREE.SphereGeometry(1, 24, 16));
  const shells = [];
  for (let i = 0; i < 3; i++) {
    const m = basic(PINK, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
    const s = new THREE.Mesh(shellGeo, m); s.visible = false; group.add(s);
    shells.push({ s, m, life: 0, x: 0 });
  }
  function nova(x, c = PINK) { const s = shells.find(q => q.life <= 0) || shells[0]; s.life = 1; s.x = x; s.s.visible = true; s.m.color.set(c); }

  // ── Starlight beams (spot cones from the void) ──────────────────
  const coneGeo = keep(new THREE.ConeGeometry(0.9, 9, 20, 1, true)); coneGeo.translate(0, -4.5, 0);
  const cones = [];
  for (const [x, tx] of [[-3.6, -1.6], [-1.2, -1.6], [1.2, 1.6], [3.6, 1.6]]) {
    const m = basic(CYAN, { transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(coneGeo, m); c.position.set(x, 8.6, 1.0);
    group.add(c);
    cones.push({ cone: c, mat: m, baseX: x, tx, side: tx < 0 ? 'player' : 'rival' });
  }

  // ── Alien crowd, bobbing in zero gravity ────────────────────────
  const spots = [];
  const row = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.2 + Math.random() * 0.6) / n, z: z + Math.random() * 0.6, y: y + Math.random() * 0.3 }); };
  const cs = low ? 0.6 : 1;
  row(Math.round(12 * cs), -6.4, 6.4, 5.6, -1.25);
  row(Math.round(14 * cs), -7.8, 7.8, 6.7, -1.15);
  row(Math.round(5 * cs), -11, -7.8, 1.8, -0.6);
  row(Math.round(5 * cs), 7.8, 11, 1.8, -0.6);
  const CN = spots.length, aMat = toon(0xffffff);
  const cBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.24, 0.42, 3, 8)), aMat, CN);
  const cHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.26, 12, 8)), aMat, CN);
  const cEye = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.075, 8, 6)), basic(0x101020), CN * 2);
  const cAnt = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.06, 6, 4)), basic(0xffffff), CN);
  const alienCols = [0x7dff8a, 0x8affe0, 0xc68aff, 0xff9ae0, 0x9ad0ff];
  spots.forEach((c, i) => {
    c.ph = Math.random() * 6.28; c.hype = 0.6 + Math.random() * 0.6; c.spin = (Math.random() - 0.5) * 0.4;
    cBody.setColorAt(i, col.set(alienCols[i % 5]).multiplyScalar(0.8)); cHead.setColorAt(i, col.set(alienCols[i % 5]));
    cAnt.setColorAt(i, col.set(NEON[i % 3]));
  });
  group.add(cBody, cHead, cEye, cAnt);

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xdcd8ff, 0x1a0f3a, 1.15);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(PINK, 20, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(CYAN, 20, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const star = new THREE.PointLight(0xfff2d8, 10, 14, 1.5); star.position.set(0, 5.6, 1.2);
  group.add(hemi, key, rimL, rimR, star);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, star: star.intensity };

  // ── State + update ──────────────────────────────────────────────
  const S = { L: 1, flash: 0, cheer: 0, focus: 0, rip: null, solo: null, shower: 0, soloX: 0 };

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), L = S.L, whole = Math.floor(beat);
    S.flash = Math.max(0, S.flash - dt * 2.2);
    S.cheer = Math.max(0, S.cheer - dt * 0.5);
    S.focus += ((info.leader || 0) - S.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (S.solo) {
      const so = S.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) S.solo = null;
    }
    const scene = group.parent;
    if (scene && scene.fog && !scene.userData.galaxyFog) { scene.fog.color.set(0x0c0828); scene.fog.near = 40; scene.fog.far = 140; scene.userData.galaxyFog = true; }

    skyMat.color.setScalar((0.55 + 0.45 * L) * (1 - 0.4 * soloK) * (1 + 0.25 * onBeat + 0.3 * S.flash));
    sky.rotation.y = songTime * 0.003;
    starMat.uniforms.uT.value = songTime; starMat.uniforms.uBeat.value = onBeat; starMat.uniforms.uLevel.value = L;
    starMat.uniforms.uPx.value = Math.min(2, (window.devicePixelRatio || 1));
    stars.rotation.y = songTime * 0.004;

    giant.rotation.y = songTime * 0.05;
    pRing.rotation.z = 0.35 + Math.sin(songTime * 0.1) * 0.02;
    blue.rotation.y = songTime * 0.08;
    moon.position.set(blue.position.x + Math.cos(songTime * 0.15) * 8, blue.position.y + Math.sin(songTime * 0.15) * 2, blue.position.z + Math.sin(songTime * 0.15) * 8);

    // Platform drifts gently.
    const drift = Math.sin(songTime * 0.4) * 0.04;
    rock.position.y = -3.38 + drift; slab.position.y = -0.31 + drift * 0.0;
    under.material.opacity = L * (0.5 + 0.3 * onBeat);
    under.scale.setScalar(6 + 1.2 * onBeat);

    const fu = floorMat.uniforms;
    fu.uBeat.value = onBeat; fu.uFlash.value = S.flash; fu.uLevel.value = L; fu.uTime.value = songTime;
    if (S.rip) { fu.uRip.value.set(S.rip.x, 0, songTime - S.rip.t, 1); if (songTime - S.rip.t > 2) S.rip = null; } else fu.uRip.value.w = 0;
    fu.uSolo.value.set(soloX, soloK);
    rimMat.color.set(NEON[(whole >> 2) % 3]).multiplyScalar(0.55 + 0.45 * onBeat);

    // Orbit rings spin round the stage — and close in round a soloist.
    for (const o of orbits) {
      const r = lerp(o.r, 2.0 + o.r * 0.12, soloK);
      o.o.scale.set(r * (1 + 0.02 * onBeat), r * (1 + 0.02 * onBeat) * lerp(0.78, 1, soloK), 1);
      o.o.position.set(soloX * soloK, 0.5 + 0.7 * soloK, 0.3 - 0.1 * soloK);
      o.o.rotation.set(Math.PI / 2 + o.tx + 0.05 * Math.sin(songTime * 0.3), o.tz, songTime * o.sp * (1 + 3 * soloK));
      o.m.opacity = L * (0.35 + 0.35 * onBeat + 0.3 * soloK);
      const a = songTime * o.sp * 8, sq = lerp(0.78, 1, soloK);
      _q.set(Math.cos(a) * r, Math.sin(a) * r * sq, 0).applyEuler(o.o.rotation);
      o.moonlet.position.copy(o.o.position).add(_q);
    }
    for (const c of crystals) {
      c.c.position.set(c.x, 1.0 + 0.25 * Math.sin(songTime * 1.2 + c.ph), c.z);
      c.c.rotation.y = songTime * 0.8 + c.ph;
      c.c.scale.set(0.8, 1.6, 0.8).multiplyScalar(1 + 0.15 * onBeat);
      c.m.emissiveIntensity = 0.3 + 0.6 * onBeat + S.flash;
    }
    for (let i = 0; i < AN; i++) {
      const a = asts[i]; a.a += a.sp * dt;
      dummy.position.set(Math.cos(a.a) * a.r, a.y + Math.sin(songTime * 0.3 + i) * 0.2, 0.3 + Math.sin(a.a) * a.r * 0.8);
      dummy.rotation.set(a.rx + songTime * 0.2, a.ry + songTime * 0.15, 0); dummy.scale.setScalar(a.s); dummy.updateMatrix();
      astMesh.setMatrixAt(i, dummy.matrix);
    }
    astMesh.instanceMatrix.needsUpdate = true;

    // Comets: one every few bars; a meteor shower after a landed taunt.
    nextComet -= dt;
    if (nextComet <= 0) { launch(1); nextComet = 3 + Math.random() * 4; }
    if (S.shower > 0) { S.shower -= dt; if (Math.random() < dt * 6) launch(1, true); }
    for (const c of comets) {
      if (c.life <= 0) continue;
      c.life -= dt; c.p.addScaledVector(c.v, dt);
      const fade = Math.min(1, c.life / 0.5) * Math.min(1, (c.max - c.life) / 0.3);
      c.head.position.copy(c.p); c.head.scale.setScalar(1.4 * fade + 0.01);
      c.tail.position.copy(c.p);
      _q.copy(c.v).normalize();
      c.tail.quaternion.setFromUnitVectors(X1, _q);
      c.tail.scale.set(c.len, 0.5, 1);
      c.tail.material.opacity = fade * L;
      if (c.life <= 0) c.tail.visible = c.head.visible = false;
    }

    for (const s of shells) {
      if (s.life <= 0) continue;
      s.life -= dt * 0.8;
      const u = 1 - s.life, r = 0.5 + 6 * sm(u * 1.4);
      s.s.position.set(s.x, 1.2, 0.2); s.s.scale.setScalar(r);
      s.m.opacity = Math.max(0, s.life) * 0.35;
      if (s.life <= 0) s.s.visible = false;
    }

    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, S.focus) : Math.max(0, -S.focus);
      const sway = Math.sin(songTime * 0.7 + i * 1.7) * 0.3;
      const dx = c.tx + (soloX - c.tx) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 8.6); c.cone.rotation.x = -0.1;
      c.mat.color.set(NEON[(i + (whole >> 2)) % 2]);
      c.mat.opacity = (0.025 + 0.04 * onBeat + 0.05 * lead + 0.1 * S.flash) * L * (1 + 0.8 * soloK);
    });

    // Aliens float and bob, antennae glowing, arms (well, whole bodies)
    // wiggling to the beat.
    const hype = Math.min(1, 0.35 + S.cheer + Math.abs(S.focus) * 0.3);
    spots.forEach((c, i) => {
      const bob = Math.sin(beat * Math.PI + c.ph) * (0.08 + 0.2 * hype * c.hype) * L + Math.sin(songTime * 0.7 + c.ph) * 0.12;
      dummy.position.set(c.x, c.y + 0.5 + bob, c.z);
      dummy.rotation.set(0.15 * Math.sin(songTime + c.ph), Math.atan2(-c.x, -c.z + 8) * 0.3, c.spin * Math.sin(songTime * 0.5 + c.ph) + S.focus * 0.12 * Math.sign(-c.x || 1));
      dummy.scale.setScalar(1); dummy.updateMatrix(); cBody.setMatrixAt(i, dummy.matrix);
      dummy.translateY(0.55); dummy.updateMatrix(); cHead.setMatrixAt(i, dummy.matrix);
      const hx = dummy.position.x, hy = dummy.position.y, hz = dummy.position.z, rot = _rot.copy(dummy.rotation);
      for (const sd of [-1, 1]) {
        dummy.position.set(hx, hy, hz); dummy.rotation.copy(rot); dummy.translateX(sd * 0.1); dummy.translateY(0.03); dummy.translateZ(0.22);
        dummy.scale.set(1, 1.3, 0.6); dummy.updateMatrix(); cEye.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
      dummy.position.set(hx, hy, hz); dummy.rotation.copy(rot); dummy.translateY(0.38 + 0.03 * onBeat); dummy.scale.setScalar(1 + 0.6 * onBeat * hype); dummy.updateMatrix();
      cAnt.setMatrixAt(i, dummy.matrix);
    });
    cBody.instanceMatrix.needsUpdate = cHead.instanceMatrix.needsUpdate = cEye.instanceMatrix.needsUpdate = cAnt.instanceMatrix.needsUpdate = true;

    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.5 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, S.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -S.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    star.intensity = base.star * L * (0.6 + 0.4 * onBeat + S.flash) * (1 + soloK);
    star.position.x = soloX * soloK;
  }
  const X1 = new THREE.Vector3(1, 0, 0), _rot = new THREE.Euler();
  function lerp(a, b, t) { return a + (b - a) * t; }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { S.rip = { t: data.songTime, x }; S.cheer = Math.min(1, S.cheer + 0.35); launch(1); }
        if (data.tier >= 4) { S.flash = 0.6; nova(x, data.who === 'rival' ? PINK : CYAN); }
        break;
      case 'taunt': S.flash = 0.4; launch(2); break;
      case 'tauntLanded': S.flash = 1; S.cheer = 1; S.shower = 2.5; launch(3, true); break;
      case 'dodge': S.cheer = Math.min(1, S.cheer + 0.6); S.flash = 0.5; break;
      case 'end': S.cheer = 1; S.flash = 1; nova(x, GOLD); S.shower = 3; break;
      case 'drop': S.flash = 1; nova(0, CYAN); launch(2); break;
      case 'solo': S.solo = { x, t0: data.songTime, t1: data.until }; S.flash = 0.8; S.cheer = 1; nova(x, VIOLET); break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update, react,
    setLightLevel(v) { S.L = Math.max(0, Math.min(1, v)); },
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); },
  };
}
