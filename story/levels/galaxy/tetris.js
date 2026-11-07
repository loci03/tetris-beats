// GALAXY — the living Tetris world: drifting through deep space.
//
// A vast spiral galaxy wheels behind the board (its arms reach out into the
// side strips), three nebula clouds drift and breathe, a ringed gas giant
// hangs upper right and a blue ice world lower left with a little moon in
// orbit, asteroids tumble past at the edges, the near starfield streams
// toward you (parallax), constellations slowly turn, shooting stars and
// comets streak by.
//
// Reactions (ported from drawGalaxyScene + more):
//   move      a shooting star streaks that way, the starfield parallax slides
//   rotate    the galaxy's spin kicks, constellations turn, ring wobble
//   soft      a burst of speed: stars stretch into short streaks
//   drop      a meteor slams into the ice world: impact flash, debris, shock
//             ring on the planet, screen flash, camera shake (by rows)
//   hold      a comet swings across the sky
//   clear     shockwave rings expand from the board (one per line), the
//             nebulae pulse, the galaxy spins up; 2+ lines a constellation
//             lights up; 3+ a supernova bursts; TETRIS: hyperspace jump —
//             stars become warp lines, FOV punch, galaxy core flares
//   combo     constellations draw in one by one, nebula hues cycle
//   levelUp   warp to a new sector: the nebulae shift hue
//   danger    a red giant swells and pulses, nebulae burn red, asteroids
//             thicken and rush past
//   gameOver  the galaxy collapses into its core, the stars fade out
//   start     hyperspace arrival: stars streak in and settle

const CYAN = 0x7df9ff, PINK = 0xff66e0;

const PLANET_VS = `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PLANET_FS = `uniform vec3 uA, uB, uSun; uniform float uTime, uBands, uFlash; uniform vec4 uHit; varying vec3 vN; varying vec3 vP;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float noise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
  void main(){
    vec3 p = normalize(vP);
    float n = noise(p * 4.0 + vec3(uTime * 0.02, 0.0, 0.0)) * 0.6 + noise(p * 9.0) * 0.4;
    float b = uBands > 0.5 ? sin(p.y * 18.0 + n * 3.0) * 0.5 + 0.5 : n;
    vec3 c = mix(uA, uB, b);
    float l = max(dot(normalize(vN), normalize(uSun)), 0.0);
    c *= 0.08 + 1.1 * smoothstep(-0.1, 0.6, l);
    float rim = pow(1.0 - abs(dot(normalize(vN), vec3(0.0, 0.0, 1.0))), 3.0);
    c += uA * rim * 0.6;
    float hit = smoothstep(0.35, 0.0, distance(p, normalize(uHit.xyz))) * uHit.w;
    c += vec3(1.0, 0.7, 0.4) * hit * 2.0 + vec3(1.0, 0.9, 1.0) * uFlash * 0.25;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

const SKY_FS = `varying vec3 vP; uniform float uTime, uRed, uFade;
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  void main(){
    vec3 d = normalize(vP);
    vec3 c = mix(vec3(0.006, 0.004, 0.03), vec3(0.018, 0.01, 0.06), smoothstep(-0.6, 0.6, d.y));
    c += vec3(0.25, 0.02, 0.04) * uRed * (0.4 + 0.6 * smoothstep(-0.3, 0.6, -d.z));
    for (int k = 0; k < 2; k++) {
      float sc = k == 0 ? 220.0 : 90.0;
      vec2 g = vec2(atan(d.x, d.z) * sc, asin(clamp(d.y, -1.0, 1.0)) * sc);
      vec2 cell = floor(g);
      float h = hash12(cell + float(k) * 17.0);
      float s = step(k == 0 ? 0.985 : 0.993, h) * smoothstep(0.42, 0.0, length(fract(g) - 0.5));
      float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h * 3.0) + h * 60.0);
      vec3 sc3 = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.8, 0.95), hash12(cell + 3.0));
      c += sc3 * s * tw * (k == 0 ? 0.7 : 1.1);
    }
    c *= uFade;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const prevFog = scene.fog, prevBg = scene.background;
  scene.background = new THREE.Color(0x020114);
  scene.fog = null;
  camera.near = 0.1; camera.far = 900; camera.updateProjectionMatrix();

  const root = new THREE.Group();
  scene.add(root);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const col = new THREE.Color(), dummy = new THREE.Object3D(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), Qz = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let seed = 5;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t);
  };
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const additive = (extra) => basic(0xffffff, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, ...extra });
  const glowTex = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.6)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const springStep = (s, target, dt, hz, damp) => {
    const w = 2 * Math.PI * hz, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (-w * w * (s.x - target) - 2 * damp * w * s.v) * h; s.x += s.v * h; }
    if (!Number.isFinite(s.x)) { s.x = 0; s.v = 0; }
    return s.x;
  };

  // ── Sky (far stars) ─────────────────────────────────────────────
  const skyMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uRed: { value: 0 }, uFade: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: SKY_FS,
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(800, 32, 16)), skyMat);
  sky.renderOrder = -10; root.add(sky);

  // ── Nebulae: soft noise clouds (one canvas texture, tinted) ─────
  const nebTex = canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    const val = (x, y, s) => { const xi = Math.floor(x / s), yi = Math.floor(y / s), fx = x / s - xi, fy = y / s - yi; const H = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); }; const sm = (t) => t * t * (3 - 2 * t); return lerp(lerp(H(xi, yi), H(xi + 1, yi), sm(fx)), lerp(H(xi, yi + 1), H(xi + 1, yi + 1), sm(fx)), sm(fy)); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), r = Math.sqrt(dx * dx + dy * dy);
      const n = val(x, y, 64) * 0.5 + val(x, y, 24) * 0.3 + val(x, y, 9) * 0.2;
      const a = Math.max(0, 1 - r) ** 1.6 * Math.max(0, n * 1.6 - 0.35);
      const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.min(255, a * 255);
    }
    g.putImageData(img, 0, 0);
  });
  const nebulae = [[-150, 60, -320, 260, 285], [170, -40, -340, 280, 200], [40, 110, -380, 300, 320], [-200, -90, -360, 240, 250]].slice(0, low ? 3 : 4).map(([x, y, z, s, hue], i) => {
    const m = additive({ map: nebTex, fog: false, color: 0x000000 });
    const mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), m);
    mesh.position.set(x, y, z); mesh.scale.set(s, s * 0.75, 1); mesh.rotation.z = i * 1.3; mesh.renderOrder = -8; root.add(mesh);
    return { mesh, m, x, y, z, s, hue, ph: i * 1.7 };
  });

  // ── The spiral galaxy ───────────────────────────────────────────
  const GN = low ? 2600 : 5200;
  const gPos = new Float32Array(GN * 3), gCol = new Float32Array(GN * 3);
  const cCore = new THREE.Color(0xfff0c8), cArm = new THREE.Color(CYAN), cArm2 = new THREE.Color(PINK);
  for (let i = 0; i < GN; i++) {
    const arm = i % 2, t = Math.pow(rnd(), 0.7);
    const r = 4 + t * 92;
    const theta = arm * Math.PI + Math.log(r / 4) * 2.1 + (rnd() - 0.5) * (0.5 + 0.6 * (1 - t));
    const sp = (rnd() - 0.5) * 6 * (1 - t * 0.5);
    gPos[i * 3] = Math.cos(theta) * r + sp; gPos[i * 3 + 1] = (rnd() - 0.5) * 3 * (1 - t); gPos[i * 3 + 2] = Math.sin(theta) * r + sp;
    col.copy(cCore).lerp(rnd() < 0.5 ? cArm : cArm2, smooth(t * 1.6)).multiplyScalar(0.55 + 0.45 * rnd());
    gCol[i * 3] = col.r; gCol[i * 3 + 1] = col.g; gCol[i * 3 + 2] = col.b;
  }
  const gGeo = keep(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
  const gMat = keep(new THREE.PointsMaterial({ size: 2.2, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  const galaxyTilt = new THREE.Group(); galaxyTilt.position.set(0, 28, -230); galaxyTilt.rotation.set(1.05, 0, 0.22); root.add(galaxyTilt);
  const galaxySpin = new THREE.Group(); galaxyTilt.add(galaxySpin);
  const galaxy = new THREE.Points(gGeo, gMat); galaxy.frustumCulled = false; galaxySpin.add(galaxy);
  const coreMat = additive({ map: glowTex, fog: false, color: 0xffe8c0 });
  const core = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), coreMat); core.renderOrder = 2; root.add(core);

  // ── Planets ─────────────────────────────────────────────────────
  const sunDir = new THREE.Vector3(-0.6, 0.35, 0.7);
  const planetMat = (a, b, bands) => keep(new THREE.ShaderMaterial({
    uniforms: { uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uSun: { value: sunDir }, uTime: { value: 0 }, uBands: { value: bands }, uFlash: { value: 0 }, uHit: { value: new THREE.Vector4(0, 0, 1, 0) } },
    vertexShader: PLANET_VS, fragmentShader: PLANET_FS,
  }));
  const giantMat = planetMat(0xd8803a, 0x6a2a14, 1);
  const giant = new THREE.Mesh(keep(new THREE.SphereGeometry(14, 40, 24)), giantMat);
  const giantG = new THREE.Group(); giantG.position.set(62, 28, -120); giantG.rotation.set(0.25, 0, -0.35); giantG.add(giant); root.add(giantG);
  const ringTex = canvasTex(256, 8, (g, w, h) => {
    for (let x = 0; x < w; x++) { const u = x / w; const a = (0.25 + 0.6 * Math.abs(Math.sin(u * 37) * Math.sin(u * 11 + 1))) * (u > 0.08 ? 1 : 0) * (u > 0.62 && u < 0.68 ? 0.15 : 1); g.fillStyle = `rgba(${235 - u * 60},${190 - u * 80},${140 - u * 60},${a})`; g.fillRect(x, 0, 1, h); }
  });
  const ringGeo = keep(new THREE.RingGeometry(18, 33, 64, 1));
  { const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv; for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - 18) / 15, 0.5); } }
  const ringMat = basic(0xffffff, { map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2 + 0.25; giantG.add(ring);
  const iceMat = planetMat(0x4aa8ff, 0x12306a, 0);
  const ice = new THREE.Mesh(keep(new THREE.SphereGeometry(9, 36, 20)), iceMat);
  ice.position.set(-46, -16, -85); root.add(ice);
  const iceAtmo = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), additive({ map: glowTex, color: 0x3a7aff, fog: false }));
  iceAtmo.renderOrder = 1; root.add(iceAtmo);
  const moonMat = planetMat(0xb0a8c0, 0x4a4458, 0);
  const moon = new THREE.Mesh(keep(new THREE.SphereGeometry(2, 20, 12)), moonMat); root.add(moon);
  // Red giant (danger), far behind.
  const redMat = additive({ map: glowTex, color: 0x000000, fog: false });
  const redGiant = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), redMat); redGiant.position.set(-120, 70, -400); redGiant.renderOrder = -7; root.add(redGiant);

  // ── Asteroids ───────────────────────────────────────────────────
  const AN = low ? 14 : 24;
  const astMesh = new THREE.InstancedMesh(keep(new THREE.DodecahedronGeometry(1, 0)), keep(new THREE.MeshLambertMaterial({ color: 0x8a7a8a, flatShading: true })), AN);
  astMesh.frustumCulled = false; root.add(astMesh); disposables.push(astMesh);
  const asts = Array.from({ length: AN }, (_, i) => ({ side: i % 2 ? 1 : -1, x: 0, y: 0, z: 0, s: 0.4 + rnd() * 1.6, rx: rnd() * 6, ry: rnd() * 6, wr: (rnd() - 0.5) * 2, vz: 6 + rnd() * 8, reset: true }));
  const resetAst = (a, far) => { a.x = a.side * (14 + rnd() * 26); a.y = (rnd() - 0.5) * 30; a.z = far ? -120 - rnd() * 60 : -rnd() * 160; a.reset = false; };
  asts.forEach(a => resetAst(a, false));
  const sun = new THREE.DirectionalLight(0xfff0e0, 2.2); sun.position.copy(sunDir).multiplyScalar(50);
  const amb = new THREE.AmbientLight(0x4a3a7a, 0.6);
  root.add(sun, amb);

  // ── Near starfield streaming toward us (dots + warp lines) ──────
  const SN = low ? 260 : 480;
  const stars = Array.from({ length: SN }, () => ({ x: (rnd() - 0.5) * 140, y: (rnd() - 0.5) * 90, z: -rnd() * 220 }));
  const sPos = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3);
  const sGeo = keep(new THREE.BufferGeometry());
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const sMat = keep(new THREE.PointsMaterial({ size: 0.9, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const starPts = new THREE.Points(sGeo, sMat); starPts.frustumCulled = false; root.add(starPts);
  const wPos = new Float32Array(SN * 6), wCol = new Float32Array(SN * 6);
  const wGeo = keep(new THREE.BufferGeometry());
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3)); wGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 3));
  const warpLines = new THREE.LineSegments(wGeo, keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  warpLines.frustumCulled = false; root.add(warpLines);

  // ── Constellations ──────────────────────────────────────────────
  const CONST = [
    { c: [-48, 30, -90], pts: [[0, 0], [5, 3], [10, 2], [14, 6], [9, 9], [4, 8]], hue: 0.52 },
    { c: [46, -14, -90], pts: [[0, 0], [3, 6], [8, 7], [12, 4], [10, -2], [5, -3], [2, -1]], hue: 0.85 },
    { c: [-40, -22, -95], pts: [[0, 0], [6, 1], [11, -2], [15, 2], [20, 1]], hue: 0.15 },
    { c: [38, 34, -100], pts: [[0, 0], [4, -4], [9, -3], [12, 1], [8, 4]], hue: 0.6 },
  ];
  let segCount = 0; for (const C of CONST) segCount += C.pts.length - 1;
  const cPos = new Float32Array(segCount * 6), cCol = new Float32Array(segCount * 6);
  const cGeo = keep(new THREE.BufferGeometry());
  cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3)); cGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
  const constLines = new THREE.LineSegments(cGeo, keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  constLines.frustumCulled = false; root.add(constLines);
  CONST.forEach(C => { C.lit = 0; C.draw = 0; C.rot = { x: 0, v: 0 }; });

  // ── Glows / streaks (camera-facing, rotatable) ──────────────────
  const GLOWS = low ? 150 : 220;
  const glowMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), additive({ map: glowTex, fog: false }), GLOWS);
  glowMesh.frustumCulled = false; glowMesh.renderOrder = 6; glowMesh.setColorAt(0, col.set(0)); root.add(glowMesh); disposables.push(glowMesh);
  let nGlow = 0;
  const glow = (x, y, z, sx, sy, c, k, ang = 0) => {
    if (nGlow >= GLOWS || k <= 0.003) return;
    dummy.position.set(x, y, z); dummy.quaternion.copy(camera.quaternion);
    if (ang) { Qz.setFromAxisAngle(ZAX, ang); dummy.quaternion.multiply(Qz); }
    dummy.scale.set(sx, sy, 1); dummy.updateMatrix();
    glowMesh.setMatrixAt(nGlow, dummy.matrix); glowMesh.setColorAt(nGlow++, (typeof c === 'number' ? col.set(c) : col.copy(c)).multiplyScalar(k));
  };
  // Shock rings (camera-facing).
  const RINGS = 8;
  const ringMesh = new THREE.InstancedMesh(keep(new THREE.RingGeometry(0.9, 1, 64)), additive({ fog: false, side: THREE.DoubleSide }), RINGS);
  ringMesh.frustumCulled = false; ringMesh.renderOrder = 5; ringMesh.count = 0; ringMesh.setColorAt(0, col.set(0)); root.add(ringMesh); disposables.push(ringMesh);
  const rings = Array.from({ length: RINGS }, () => ({ life: 0, x: 0, y: 0, z: 0, r: 0, v: 0, c: new THREE.Color() }));
  let ringCur = 0;
  const shock = (x, y, z, v, c, delay = 0) => { const R = rings[ringCur = (ringCur + 1) % RINGS]; R.life = 1 + delay; R.x = x; R.y = y; R.z = z; R.r = 0.5; R.v = v; R.c.set(c); };
  // Shooting stars / meteors / comets.
  const SHOOT = 12;
  const shooters = Array.from({ length: SHOOT }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, len: 6, hue: 0.55, kind: 0, tx: 0, ty: 0, tz: 0 }));
  let shootCur = 0;
  const shootingStar = (dir) => {
    const S = shooters[shootCur = (shootCur + 1) % SHOOT];
    const d = dir || (rnd() < 0.5 ? 1 : -1);
    S.kind = 0; S.life = 1; S.z = -60 - rnd() * 30; S.x = -d * (30 + rnd() * 30) + (rnd() - 0.5) * 20; S.y = 10 + rnd() * 25;
    S.vx = d * (55 + rnd() * 30); S.vy = -(14 + rnd() * 16); S.len = 8 + rnd() * 6; S.hue = 0.5 + rnd() * 0.3;
  };
  const comet = () => {
    const S = shooters[shootCur = (shootCur + 1) % SHOOT];
    S.kind = 2; S.life = 2.6; S.x = -110; S.y = 40; S.z = -120; S.vx = 85; S.vy = -9; S.len = 30; S.hue = 0.52;
  };
  const meteor = (k) => {
    const S = shooters[shootCur = (shootCur + 1) % SHOOT];
    S.kind = 1; S.life = 0.55; S.k = k; S.tx = ice.position.x + 4; S.ty = ice.position.y + 5; S.tz = ice.position.z + 6;
    S.x = S.tx + 70; S.y = S.ty + 60; S.z = S.tz + 10; S.vx = (S.tx - S.x) / 0.55; S.vy = (S.ty - S.y) / 0.55; S.vz = (S.tz - S.z) / 0.55; S.len = 14 + 10 * k;
  };
  const DEB = 40;
  const debris = Array.from({ length: DEB }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
  let debCur = 0;

  const washMat = additive({ color: 0x000000, depthTest: false, fog: false });
  const wash = new THREE.Mesh(keep(new THREE.PlaneGeometry(4, 4)), washMat); wash.position.z = -0.5; wash.renderOrder = 20; camera.add(wash);

  // ── State ───────────────────────────────────────────────────────
  const st = {
    t: 0, spin: 0, spinV: 0, cheer: 0, flash: 0, shake: 0, warp: 0, speed: 0, combo: 0, danger: 0, collapse: 0, over: false, arrive: 0,
    hueShift: 0, hueT: 0, hit: 0, nova: 0, novaPos: new THREE.Vector3(), fov: 0, camX: { x: 0, v: 0 }, roll: { x: 0, v: 0 }, dip: { x: 0, v: 0 },
    ringWob: { x: 0, v: 0 }, pieceX: 0, follow: 0, randT: 2, slide: 0,
  };
  const tmpC = new THREE.Color();

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0, energy = info.energy ?? 1;
    st.t += dt;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6);
    const cheer = Math.max(st.cheer, info.cheer || 0);
    st.cheer = Math.max(0, st.cheer - dt * 0.45);
    st.flash = Math.max(0, st.flash - dt * 2.4);
    st.shake = Math.max(0, st.shake - dt * 2.2);
    st.warp = Math.max(0, st.warp - dt * 0.55);
    st.speed = Math.max(0, st.speed - dt * 1.6);
    st.hit = Math.max(0, st.hit - dt * 1.2);
    st.nova = Math.max(0, st.nova - dt * 0.5);
    st.fov = Math.max(0, st.fov - dt * 7);
    st.arrive = Math.max(0, st.arrive - dt * 0.6);
    st.hueT += dt * (st.combo > 1 ? 0.08 * st.combo : 0);
    const dg = info.danger || 0;
    st.danger += (dg - st.danger) * Math.min(1, dt * 1.2);
    st.collapse += ((st.over ? 1 : 0) - st.collapse) * Math.min(1, dt * 0.6);
    st.pieceX += ((info.pieceX || 0) - st.pieceX) * Math.min(1, dt * 3);
    const red = smooth((st.danger - 0.45) / 0.4), coll = st.collapse;
    nGlow = 0;

    // Galaxy: always rotating, faster on cheer and on the beat.
    st.spinV *= Math.exp(-dt * 0.8);
    st.spin += dt * (0.035 * (1 + cheer * 4 + onBeat * 0.5) + st.spinV);
    galaxySpin.rotation.y = st.spin;
    galaxySpin.scale.setScalar(1.45 * lerp(1, 0.12, smooth(coll)) * (1 + 0.04 * onBeat));
    gMat.size = 2.8 * (1 + 0.2 * cheer) * (1 - 0.6 * coll);
    gMat.opacity = 1 - 0.5 * coll;
    V.set(0, 0, 0); galaxyTilt.localToWorld(V);
    core.position.copy(V); core.quaternion.copy(camera.quaternion);
    const cs = (60 + 30 * cheer + 50 * st.warp) * (1 - 0.5 * coll);
    core.scale.set(cs, cs * 0.8, 1);
    coreMat.color.set(0xffe2b8).lerp(tmpC.set(0xff5030), red).multiplyScalar(0.55 + 0.25 * onBeat + 0.6 * cheer + 0.8 * st.warp + (coll > 0.5 ? (1 - coll) * 2 : 0));

    // Nebulae: drift, pulse on cheer, hue shifts (level up / combo / danger).
    nebulae.forEach((N, i) => {
      N.mesh.position.set(N.x + Math.sin(t * 0.03 + N.ph) * 12, N.y + Math.cos(t * 0.025 + N.ph) * 8, N.z);
      N.mesh.quaternion.copy(camera.quaternion); Qz.setFromAxisAngle(ZAX, N.ph + t * 0.01); N.mesh.quaternion.multiply(Qz);
      const pulse = 1 + Math.sin(t / 1.8 + N.ph) * 0.08 + cheer * 0.18 + 0.04 * onBeat;
      N.mesh.scale.set(N.s * pulse, N.s * 0.75 * pulse, 1);
      tmpC.setHSL(((N.hue / 360 + st.hueShift + st.hueT) % 1 + 1) % 1, 0.85, 0.5).lerp(col.set(0xff2a10), red * 0.8);
      N.m.color.copy(tmpC).multiplyScalar((0.2 + 0.16 * cheer + 0.04 * onBeat) * (1 - 0.7 * coll));
    });

    // Planets (portrait: the giant moves into the strip above the board, the ice world below).
    const portraitNow = (camera.aspect || 1.6) < 0.9;
    if (portraitNow) { giantG.position.set(26, 86, -125); ice.position.set(-10, -52, -85); }
    else { giantG.position.set(62, 28, -120); ice.position.set(-46, -16, -85); }
    giant.rotation.y = t * 0.05;
    springStep(st.ringWob, 0, dt, 0.8, 0.25);
    ring.rotation.set(-Math.PI / 2 + 0.25 + st.ringWob.x * 0.2, st.ringWob.x * 0.1, 0);
    giantMat.uniforms.uTime.value = t; iceMat.uniforms.uTime.value = t;
    ice.rotation.y = t * 0.08;
    iceMat.uniforms.uHit.value.w = st.hit * 1.5;
    iceMat.uniforms.uFlash.value = st.hit * 0.6;
    iceAtmo.position.copy(ice.position); iceAtmo.quaternion.copy(camera.quaternion); iceAtmo.scale.setScalar(26 * (1 + 0.15 * st.hit));
    iceAtmo.material.color.set(0x3a7aff).multiplyScalar(0.5 + 0.2 * onBeat + st.hit);
    const ma = t * 0.35;
    moon.position.set(ice.position.x + Math.cos(ma) * 16, ice.position.y + Math.sin(ma) * 4, ice.position.z + Math.sin(ma) * 16);
    redGiant.quaternion.copy(camera.quaternion);
    const rg = 60 + 80 * red * (1 + 0.15 * Math.sin(t * 3));
    redGiant.scale.set(rg, rg, 1); redMat.color.set(0xff3a18).multiplyScalar(red * (0.6 + 0.3 * Math.sin(t * 3)));
    skyMat.uniforms.uTime.value = t; skyMat.uniforms.uRed.value = red; skyMat.uniforms.uFade.value = 1 - 0.75 * coll;

    // Asteroids tumble past at the edges (more + faster in danger).
    const aspeed = 1 + 2.5 * red + 3 * st.warp + st.speed;
    asts.forEach((a, i) => {
      a.z += a.vz * dt * aspeed;
      if (a.z > 20) resetAst(a, true);
      a.rx += a.wr * dt; a.ry += a.wr * 0.7 * dt;
      dummy.position.set(a.x, a.y, a.z); dummy.rotation.set(a.rx, a.ry, 0); dummy.scale.setScalar(a.s * (i < AN * (0.5 + 0.5 * red) ? 1 : 0.001)); dummy.updateMatrix();
      astMesh.setMatrixAt(i, dummy.matrix);
    });
    astMesh.instanceMatrix.needsUpdate = true;

    // Near starfield: streaming toward the camera; warp → long lines.
    const fly = (6 + 4 * energy + 60 * st.speed + 260 * st.warp + 200 * st.arrive) * (1 - 0.9 * coll);
    const lineLen = 0.02 * fly + 0.0;
    const showLines = st.speed + st.warp + st.arrive > 0.02;
    for (let i = 0; i < SN; i++) {
      const s = stars[i];
      s.z += fly * dt; s.x -= st.slide * dt * 4 * (1 + s.z / 220);
      if (s.z > 12) { s.z -= 230; s.x = (rnd() - 0.5) * 140; s.y = (rnd() - 0.5) * 90; }
      if (s.x > 80) s.x -= 160; if (s.x < -80) s.x += 160;
      sPos[i * 3] = s.x; sPos[i * 3 + 1] = s.y; sPos[i * 3 + 2] = s.z;
      const near = clamp((s.z + 220) / 220, 0, 1), b = (0.25 + 0.75 * near * near) * (1 - 0.8 * coll) * (0.85 + 0.15 * onBeat);
      sCol[i * 3] = b * 0.85; sCol[i * 3 + 1] = b * 0.9; sCol[i * 3 + 2] = b;
      if (showLines) {
        const L = lineLen * (0.4 + near);
        wPos[i * 6] = s.x; wPos[i * 6 + 1] = s.y; wPos[i * 6 + 2] = s.z;
        wPos[i * 6 + 3] = s.x; wPos[i * 6 + 4] = s.y; wPos[i * 6 + 5] = s.z - L;
        const wb = b * Math.min(1, (st.speed + st.warp * 2 + st.arrive * 2));
        wCol[i * 6] = wb * 0.7; wCol[i * 6 + 1] = wb * 0.9; wCol[i * 6 + 2] = wb; wCol[i * 6 + 3] = wCol[i * 6 + 4] = wCol[i * 6 + 5] = 0;
      }
    }
    st.slide *= Math.exp(-dt * 3);
    sGeo.attributes.position.needsUpdate = sGeo.attributes.color.needsUpdate = true;
    warpLines.visible = showLines;
    if (showLines) wGeo.attributes.position.needsUpdate = wGeo.attributes.color.needsUpdate = true;
    sMat.size = 0.9 * (1 + 0.3 * onBeat);

    // Constellations: slowly turning, lit / drawn on clears + combos.
    let k6 = 0;
    CONST.forEach((C, ci) => {
      springStep(C.rot, 0, dt, 0.7, 0.3);
      C.lit = Math.max(0, C.lit - dt * 0.25);
      C.draw += ((C.lit > 0 ? 1 : 0) - C.draw) * Math.min(1, dt * (C.lit > 0 ? 1.8 : 0.6));
      const ang = t * 0.02 + C.rot.x + ci, ca = Math.cos(ang), sa = Math.sin(ang);
      const P = (j) => { const [px, py] = C.pts[j]; const cx = px - 6, cy = py - 2; return [C.c[0] + cx * ca - cy * sa, C.c[1] + cx * sa + cy * ca, C.c[2]]; };
      const segs = C.pts.length - 1;
      tmpC.setHSL((C.hue + st.hueT) % 1, 0.8, 0.65);
      for (let j = 0; j < segs; j++) {
        const a = P(j), b = P(j + 1);
        const f = clamp(C.draw * segs - j, 0, 1);
        const base = 0.06 * (1 - coll);
        cPos.set([a[0], a[1], a[2], b[0], b[1], b[2]], k6 * 6);
        const k = base + f * (0.7 + 0.3 * onBeat) * Math.min(1, C.lit * 2 + 0.3);
        cCol.set([tmpC.r * k, tmpC.g * k, tmpC.b * k, tmpC.r * k, tmpC.g * k, tmpC.b * k], k6 * 6);
        k6++;
      }
      for (let j = 0; j <= segs; j++) {
        const p = P(j), tw = 0.6 + 0.4 * Math.sin(t * 2 + j * 1.7 + ci);
        glow(p[0], p[1], p[2], 1.4 + C.draw, 1.4 + C.draw, tmpC, (0.35 + 0.6 * C.draw) * tw * (1 - 0.8 * coll));
      }
    });
    cGeo.attributes.position.needsUpdate = cGeo.attributes.color.needsUpdate = true;

    // Random shooting stars (as the 2D scene had).
    if ((st.randT -= dt) <= 0) { st.randT = 2.5 + rnd() * 4; shootingStar(); }
    for (const S of shooters) {
      if (S.life <= 0) continue;
      S.life -= dt;
      if (S.kind === 1) {
        S.x += S.vx * dt; S.y += S.vy * dt; S.z += S.vz * dt;
        if (S.life <= 0) {     // impact on the ice world
          st.hit = 1; st.flash = Math.max(st.flash, 0.35 + 0.4 * S.k); st.shake = Math.max(st.shake, 0.3 + 0.6 * S.k);
          shock(S.tx, S.ty, S.tz + 2, 18 + 14 * S.k, 0xffc890);
          for (let i = 0; i < 10 + 14 * S.k; i++) { const D = debris[debCur = (debCur + 1) % DEB]; D.life = 1.2; D.x = S.tx; D.y = S.ty; D.z = S.tz + 2; D.vx = (rnd() - 0.3) * 18; D.vy = (rnd() - 0.2) * 18; D.vz = (rnd()) * 10; }
          continue;
        }
      } else { S.x += S.vx * dt; S.y += S.vy * dt; }
      const ang = Math.atan2(S.vy, S.vx), sp = Math.hypot(S.vx, S.vy);
      const k = S.kind === 2 ? Math.min(1, S.life) : Math.min(1, S.life * 2);
      tmpC.setHSL(S.hue, 0.7, 0.75);
      const ux = Math.cos(ang), uy = Math.sin(ang);
      if (S.kind === 1) { tmpC.set(0xffb070); }
      glow(S.x - ux * S.len * 0.5, S.y - uy * S.len * 0.5, S.z, S.len, S.kind === 2 ? 2.4 : 0.7, tmpC, k * 0.9, ang);
      glow(S.x, S.y, S.z, S.kind === 2 ? 5 : 2.2, S.kind === 2 ? 5 : 2.2, S.kind === 1 ? 0xffe0b0 : 0xffffff, k);
      if (S.kind === 2) glow(S.x - ux * S.len * 0.9, S.y - uy * S.len * 0.9, S.z, S.len * 1.4, 5, 0x5ab0ff, k * 0.35, ang);
      void sp;
    }
    for (const D of debris) {
      if (D.life <= 0) continue;
      D.life -= dt; D.x += D.vx * dt; D.y += D.vy * dt; D.z += D.vz * dt;
      glow(D.x, D.y, D.z, 0.9, 0.9, 0xffa060, D.life);
    }
    // Supernova.
    if (st.nova > 0) {
      const nv = st.nova;
      glow(st.novaPos.x, st.novaPos.y, st.novaPos.z, 30 * (1.4 - nv), 30 * (1.4 - nv), 0xfff0ff, nv * nv * 1.2);
      glow(st.novaPos.x, st.novaPos.y, st.novaPos.z, 80 * (1.2 - nv), 6, 0x9ad8ff, nv * 0.6);
    }

    // Rings.
    let nr = 0;
    for (const R of rings) {
      if (R.life <= 0) continue;
      R.life -= dt * 0.75;
      if (R.life > 1 || R.life <= 0) continue;
      R.r += R.v * dt;
      dummy.position.set(R.x, R.y, R.z); dummy.quaternion.copy(camera.quaternion); dummy.scale.setScalar(R.r); dummy.updateMatrix();
      ringMesh.setMatrixAt(nr, dummy.matrix); ringMesh.setColorAt(nr++, col.copy(R.c).multiplyScalar(R.life * 0.9));
    }
    ringMesh.count = nr; ringMesh.instanceMatrix.needsUpdate = true; if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;

    washMat.color.setRGB(1, 0.78, 1).multiplyScalar(st.flash * 0.1 + st.warp * 0.03);

    // ── Camera ──
    springStep(st.camX, 0, dt, 2.0, 0.4); springStep(st.roll, 0, dt, 1.8, 0.3); springStep(st.dip, 0, dt, 2.4, 0.45);
    st.follow += (st.pieceX * 1.5 - st.follow) * Math.min(1, dt * 2);
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    const sh = st.shake * st.shake;
    camera.position.set(Math.sin(t * 0.07) * 2 + st.follow + st.camX.x + (rnd() - 0.5) * sh, Math.sin(t * 0.05) * 1.2 + st.dip.x + (rnd() - 0.5) * sh * 0.7, 10);
    camera.lookAt(st.follow * 0.6 + st.camX.x * 0.3 + Math.sin(t * 0.04) * 3, (portrait ? 4 : 2) + st.dip.x * 0.3, -60);
    camera.rotateZ(st.roll.x + Math.sin(t * 0.06) * 0.04);
    const fov = (portrait ? 72 : 55) + 18 * st.warp + 6 * st.speed + 20 * st.arrive - st.fov;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sky.position.copy(camera.position);

    glowMesh.count = nGlow; glowMesh.instanceMatrix.needsUpdate = true; if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
  }

  function react(kind, data = {}) {
    if (kind === 'move') {
      const d = data.dir || 0;
      shootingStar(d || null);
      st.slide += d * 2; st.camX.v += d * 1.2;
    } else if (kind === 'rotate') {
      const d = data.dir || 1;
      st.spinV += 0.5 * d; st.roll.v += d * 0.15; st.ringWob.v += d * 1.5;
      for (const C of CONST) C.rot.v += d * 0.6;
    } else if (kind === 'soft') {
      st.speed = Math.min(1, st.speed + 0.35); st.dip.v -= 0.6;
    } else if (kind === 'drop') {
      const rows = data.rows || 0, k = Math.min(1, 0.3 + rows / 14);
      meteor(k);
      st.flash = Math.max(st.flash, 0.15); st.fov = Math.max(st.fov, 1.5 * k);
    } else if (kind === 'hold') {
      comet();
    } else if (kind === 'clear') {
      const n = Math.max(1, Math.min(4, data.lines || 1)), combo = data.combo || 0;
      st.combo = combo;
      st.cheer = Math.min(1.2, st.cheer + 0.35 + 0.18 * n);
      st.spinV += 0.4 + 0.25 * n;
      st.fov = Math.max(st.fov, 1 + n);
      const cols = [0xffc8ff, 0x7df9ff, 0xff66e0, 0xfff0a0];
      for (let i = 0; i < n; i++) shock(st.pieceX * 4, 0, -40, 34 + 6 * i, cols[i], i * 0.14);
      if (n >= 2 || combo >= 2) { const C = CONST[Math.floor(rnd() * CONST.length)]; C.lit = 1.5 + 0.3 * n; }
      if (combo >= 2) for (let i = 0; i < Math.min(CONST.length, combo - 1); i++) CONST[i].lit = Math.max(CONST[i].lit, 1.2);
      if (n >= 3) { st.nova = 1; const side = rnd() < 0.5 ? -1 : 1; st.novaPos.set(side * (45 + rnd() * 25), 10 + rnd() * 25, -140); shock(st.novaPos.x, st.novaPos.y, st.novaPos.z, 50, 0xb0e0ff); }
      if (n >= 4) { st.warp = 1.3; st.flash = 0.8; for (const C of CONST) C.lit = 2; }
    } else if (kind === 'levelUp') {
      st.warp = Math.max(st.warp, 0.9); st.hueShift += 0.17; st.flash = Math.max(st.flash, 0.4);
    } else if (kind === 'combo') {
      st.combo = data.n || 0;
    } else if (kind === 'gameOver') {
      st.over = true; st.combo = 0;
    } else if (kind === 'start') {
      st.over = false; st.collapse = 0; st.arrive = 1; st.combo = 0;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root); camera.remove(wash);
      scene.fog = prevFog; scene.background = prevBg;
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
  };
}
