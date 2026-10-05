// NUCLEAR WASTE — the living Tetris world: a toxic junkyard at night.
//
// A nuclear plant on the horizon (four cooling towers venting steam, the
// reactor hall with its green-lit windows), a chain-link fence with
// radiation signs, glowing ooze pools bubbling on cracked asphalt, leaking
// hazmat barrels, two police cruisers strobing red/blue, toxic drips
// raining down, zombies shambling across the lot and skeletons dancing,
// and a radiation hologram spinning above the board.
//
// Reactions (ported from drawNuclearWasteScene + more):
//   move      zombies lurch that way, skeletons rattle a step, drip burst
//   rotate    radiation sign kicks into a spin, skeletons rattle, zombie
//             heads twitch
//   soft      ooze pools boil (bubble burst), camera dips
//   drop      ground shockwave + ooze splatter from the board, barrels jump,
//             zombies stagger, camera shake (all scaled by rows)
//   hold      barrel lids pop: green geysers, radiation sign flips
//   clear     siren flash, toxic explosion + shockwave ring, every creature
//             reacts (zombies break into the Thriller claw dance, skeletons
//             rattle); 1–4 lines → 1–4 pool geysers; 3+ a cooling tower
//             vents green; TETRIS: reactor flash, mushroom glow over the
//             plant, all towers vent, zombies throw their arms up
//   combo     more geysers, faster sirens, skeletons headbang harder
//   levelUp   sirens whoop, a fresh wave of zombies claws up out of the
//             ground, towers vent
//   danger    the horde turns and shambles toward you, pools swell, sirens
//             speed up, green fog thickens
//   gameOver  meltdown: the sky burns red, the horde swarms the camera
//   start     the floodlights kick on, zombies rise

const TOX = 0x66ff33;

const SKY_FS = `varying vec3 vP; uniform float uTime, uRed, uBlue, uTox, uMelt, uPulse;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  void main(){
    vec3 d = normalize(vP); float h = d.y;
    vec3 top = vec3(0.006, 0.03, 0.0), mid = vec3(0.02, 0.07, 0.008), hor = vec3(0.07, 0.17, 0.02);
    vec3 c = mix(mid, top, smoothstep(0.05, 0.6, h));
    c = mix(hor, c, smoothstep(-0.02, 0.18, h));
    // drifting toxic clouds
    vec2 uv = vec2(atan(d.x, d.z) * 3.0, h * 6.0);
    float n = noise(uv * 2.0 + vec2(uTime * 0.03, 0.0)) * 0.6 + noise(uv * 5.0 - vec2(uTime * 0.05, 0.0)) * 0.4;
    c += vec3(0.05, 0.14, 0.02) * smoothstep(0.45, 0.85, n) * smoothstep(0.55, 0.05, h) * (1.0 + 1.5 * uTox);
    // police strobes washing the sky from the upper corners
    float l = pow(max(dot(d, normalize(vec3(-0.75, 0.45, -0.5))), 0.0), 6.0);
    float r = pow(max(dot(d, normalize(vec3(0.75, 0.45, -0.5))), 0.0), 6.0);
    c += (vec3(1.0, 0.1, 0.1) * uRed + vec3(0.1, 0.25, 1.0) * uBlue) * (l + r) * 0.22;
    c += vec3(0.25, 1.0, 0.1) * uTox * (0.15 + 0.5 * smoothstep(0.4, 0.0, h)) * 0.4;
    c += vec3(0.2, 0.5, 0.05) * uPulse * smoothstep(0.2, 0.0, abs(h - 0.03));
    c = mix(c, vec3(0.35, 0.04, 0.0) * (0.6 + 0.4 * smoothstep(0.5, 0.0, h)), uMelt);
    vec2 sg = vec2(atan(d.x, d.z) * 160.0, h * 160.0);
    float s = step(0.993, hash12(floor(sg))) * smoothstep(0.35, 0.0, length(fract(sg) - 0.5)) * smoothstep(0.2, 0.5, h);
    c += vec3(0.6, 0.8, 0.6) * s * 0.7;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

const GROUND_VS = `varying vec3 vW;
  #include <fog_pars_vertex>
  void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const GROUND_FS = `uniform float uTime, uBeat, uFlash, uRed, uBlue, uDanger, uMelt;
  uniform vec4 uPool[6]; uniform vec4 uRing[4]; uniform vec4 uCop[2];
  varying vec3 vW;
  #include <fog_pars_fragment>
  vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    vec2 p = vW.xz;
    float n = hash(floor(p * 5.0));
    vec3 c = vec3(0.045, 0.055, 0.03) * (0.8 + 0.4 * n);
    // cracks: voronoi cell edges
    vec2 g = p * 0.35, i = floor(g), f = fract(g);
    float d1 = 9.0, d2 = 9.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y)); vec2 q = o + hash2(i + o) - f; float d = dot(q, q);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    float edge = 1.0 - smoothstep(0.0, 0.06 + fwidth(g.x) * 1.5, sqrt(d2) - sqrt(d1));
    c = mix(c, vec3(0.015, 0.02, 0.01), edge * 0.8);
    c += vec3(0.15, 0.6, 0.05) * edge * (0.05 + 0.08 * uBeat) * smoothstep(-60.0, 0.0, p.y);
    // ooze pools
    for (int k = 0; k < 6; k++) {
      vec4 o = uPool[k];
      vec2 dd = (p - o.xy) / vec2(o.z, o.z * 0.75);
      float r = length(dd);
      float wob = 0.08 * sin(atan(dd.y, dd.x) * 5.0 + uTime * 2.0 + float(k));
      float body = smoothstep(1.0 + wob, 0.8 + wob, r);
      vec3 oc = mix(vec3(0.3, 1.0, 0.1), vec3(1.0, 0.35, 0.05), uDanger * 0.5);
      c = mix(c, oc * (0.5 + 0.5 * o.w), body);
      c += oc * exp(-r * r * 1.2) * 0.35 * o.w + oc * smoothstep(1.9, 1.0, r) * 0.08 * o.w;
    }
    // police light spill
    for (int k = 0; k < 2; k++) {
      vec2 dd = p - uCop[k].xy; float fall = exp(-dot(dd, dd) / 40.0);
      c += (vec3(1.0, 0.1, 0.08) * uRed + vec3(0.1, 0.2, 1.0) * uBlue) * fall * 0.35;
    }
    // shock rings
    for (int k = 0; k < 4; k++) {
      vec4 r = uRing[k];
      if (r.w <= 0.0) continue;
      float d = length(p - r.xy);
      c += vec3(0.35, 1.0, 0.12) * exp(-pow((d - r.z) * 1.3, 2.0)) * r.w;
    }
    c += vec3(0.2, 0.6, 0.1) * uFlash * 0.3;
    c = mix(c, c * vec3(1.6, 0.5, 0.3) + vec3(0.06, 0.0, 0.0), uMelt);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const prevFog = scene.fog, prevBg = scene.background;
  scene.background = new THREE.Color(0x020600);
  scene.fog = new THREE.Fog(0x0c1a04, 30, 150);
  camera.near = 0.1; camera.far = 420; camera.updateProjectionMatrix();

  const root = new THREE.Group();
  scene.add(root);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const col = new THREE.Color(), dummy = new THREE.Object3D(), V = new THREE.Vector3();
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t);
  };
  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([60, 140, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const additive = (extra) => basic(0xffffff, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, ...extra });
  const glowTex = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const springStep = (s, target, dt, hz, damp) => {
    const w = 2 * Math.PI * hz, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (-w * w * (s.x - target) - 2 * damp * w * s.v) * h; s.x += s.v * h; }
    if (!Number.isFinite(s.x)) { s.x = 0; s.v = 0; }
    return s.x;
  };
  const boxGeo = keep(new THREE.BoxGeometry(1, 1, 1));

  // ── Sky ─────────────────────────────────────────────────────────
  const skyMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uRed: { value: 0 }, uBlue: { value: 0 }, uTox: { value: 0 }, uMelt: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: SKY_FS,
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(380, 32, 16)), skyMat);
  sky.renderOrder = -10; root.add(sky);

  // ── Ground ──────────────────────────────────────────────────────
  const POOLS = [[-14, -9, 3.2], [12.5, -4, 2.6], [-8, 2.5, 2.0], [17, -15, 3.6], [-22, -20, 4.0], [6.5, 6.0, 1.6]];
  const groundMat = keep(new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uBeat: { value: 0 }, uFlash: { value: 0 }, uRed: { value: 0 }, uBlue: { value: 0 }, uDanger: { value: 0 }, uMelt: { value: 0 },
      uPool: { value: POOLS.map(() => new THREE.Vector4()) }, uRing: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uCop: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    }]),
    vertexShader: GROUND_VS, fragmentShader: GROUND_FS, fog: true,
  }));
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(420, 220)), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -80); root.add(ground);

  // ── Nuclear plant on the horizon ────────────────────────────────
  const plantMat = toon(0x1c2a18), plantDark = toon(0x0e160a);
  const towerPts = [];
  for (let i = 0; i <= 12; i++) { const y = i / 12; towerPts.push(new THREE.Vector2(9 * (0.62 + 0.38 * Math.pow(Math.abs(y - 0.72) / 0.72, 1.6)), y * 30)); }
  const towerGeo = keep(new THREE.LatheGeometry(towerPts, 24));
  const towers = [-46, -27, 27, 46].map((x, i) => {
    const m = new THREE.Mesh(towerGeo, plantMat); m.position.set(x, 0, -82 - (i % 2) * 8); m.scale.setScalar(0.9 + (i % 2) * 0.15); root.add(m);
    return { x, z: m.position.z, top: 30 * m.scale.y, r: 6.3 * m.scale.x, vent: 0 };
  });
  const hall = new THREE.Mesh(boxGeo, plantDark); hall.scale.set(34, 14, 14); hall.position.set(0, 7, -88); root.add(hall);
  const dome = new THREE.Mesh(keep(new THREE.SphereGeometry(9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), plantMat); dome.position.set(0, 14, -90); root.add(dome);
  const hallWin = new THREE.Mesh(boxGeo, basic(TOX, { fog: true })); hallWin.scale.set(28, 2.2, 0.2); hallWin.position.set(0, 9, -80.9); root.add(hallWin);
  const stacks = [-12, 12].map((x) => { const m = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.9, 1.3, 26, 10)), plantDark); m.position.set(x, 13, -92); root.add(m); return { x, y: 26, z: -92 }; });

  // ── Fence with radiation signs ──────────────────────────────────
  const fenceTex = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(170,190,160,0.9)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  });
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(160, 4);
  const fence = new THREE.Mesh(keep(new THREE.PlaneGeometry(160, 4.4)), basic(0x8a9a80, { map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  fence.position.set(0, 2.2, -34); root.add(fence);
  const NPOST = 28;
  const posts = new THREE.InstancedMesh(boxGeo, toon(0x3a4236), NPOST);
  for (let i = 0; i < NPOST; i++) { dummy.position.set(-80 + i * (160 / (NPOST - 1)), 2.3, -34); dummy.scale.set(0.15, 4.6, 0.15); dummy.updateMatrix(); posts.setMatrixAt(i, dummy.matrix); }
  posts.frustumCulled = false; root.add(posts); disposables.push(posts);
  const trefoil = (g, cx, cy, r, fill, bg) => {
    g.fillStyle = fill; g.beginPath(); g.arc(cx, cy, r * 0.18, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3 - Math.PI / 2 - Math.PI / 6;
      g.beginPath(); g.arc(cx, cy, r, a, a + Math.PI / 3); g.arc(cx, cy, r * 0.3, a + Math.PI / 3, a, true); g.closePath(); g.fill();
    }
    if (bg) { g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, r * 0.1, 0, Math.PI * 2); g.fill(); }
  };
  const signTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2c800'; g.beginPath(); g.moveTo(w / 2, 8); g.lineTo(w - 8, h - 30); g.lineTo(8, h - 30); g.closePath(); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 10; g.stroke();
    trefoil(g, w / 2, h * 0.58, 58, '#111', '#f2c800');
  });
  const signMat = basic(0xffffff, { map: signTex, transparent: true, alphaTest: 0.4 });
  for (const x of [-21, 19.5]) { const s = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.2, 3.2)), signMat); s.position.set(x, 2.6, -33.8); root.add(s); }

  // ── Barrels ─────────────────────────────────────────────────────
  const BARRELS = [[-10.5, -6, 0], [-11.6, -5.2, 0], [-9.6, -4.8, 1], [10, -9, 0], [11.1, -8.2, 0], [15.5, -2.5, 0], [-17, -13, 0], [-16, -14, 2], [21, -11, 0], [-6.5, -15, 0], [8.4, -18, 0], [-24, -6, 0]];
  const barrelGeo = keep(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 12).translate(0, 0.75, 0));
  const barrels = new THREE.InstancedMesh(barrelGeo, toon(0xffffff), BARRELS.length);
  const bands = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.57, 0.57, 0.28, 12)), toon(0xe0c000), BARRELS.length);
  const barrelState = BARRELS.map(([x, z, fall], i) => ({ x, z, fall, y: { x: 0, v: 0 }, c: [0x2a2a2a, 0x3a5a2a, 0x2a2a2a, 0x5a3a1a][i % 4], leak: rnd() * 6, lid: 0 }));
  barrelState.forEach((b, i) => { barrels.setColorAt(i, col.set(b.c)); });
  for (const m of [barrels, bands]) { m.frustumCulled = false; root.add(m); disposables.push(m); }

  // ── Police cruisers ─────────────────────────────────────────────
  const cops = [];
  const copBody = toon(0x14141c), copWhite = toon(0xd8dce0);
  for (const [x, z, ry] of [[-12.5, -7.5, 0.5], [13, -8.5, -0.55]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const b = (w, h, d, px, py, pz, m) => { const mm = new THREE.Mesh(boxGeo, m); mm.scale.set(w, h, d); mm.position.set(px, py, pz); g.add(mm); return mm; };
    b(2.0, 0.75, 4.6, 0, 0.7, 0, copBody); b(2.02, 0.4, 2.2, 0, 0.75, 0, copWhite);
    b(1.8, 0.65, 2.3, 0, 1.4, -0.2, copBody);
    b(1.82, 0.45, 1.0, 0, 1.45, 0.75, basic(0x1a2a3a));
    for (const [wx, wz] of [[0.95, 1.4], [-0.95, 1.4], [0.95, -1.4], [-0.95, -1.4]]) { const w = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10)), copBody); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.4, wz); g.add(w); }
    const red = b(0.7, 0.18, 0.32, -0.42, 1.82, -0.2, basic(0x330000));
    const blue = b(0.7, 0.18, 0.32, 0.42, 1.82, -0.2, basic(0x000033));
    cops.push({ g, red, blue, x, z });
  }

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x8ac878, 0x0a1404, 0.75);
  const moon = new THREE.DirectionalLight(0xc8ffb8, 0.9); moon.position.set(-10, 25, 20);
  const redL = new THREE.PointLight(0xff2020, 0, 30, 1.4); redL.position.set(-12.5, 3, -6);
  const blueL = new THREE.PointLight(0x2050ff, 0, 30, 1.4); blueL.position.set(13, 3, -7);
  const toxL = new THREE.PointLight(TOX, 0, 40, 1.3); toxL.position.set(0, 4, -6);
  root.add(hemi, moon, moon.target, redL, blueL, toxL);

  // ── Creatures (instanced parts driven by invisible rigs) ────────
  const rigs = new THREE.Group();          // never rendered; only matrices
  const partsZ = [], partsS = [], skulls = [];
  const zombieMat = toon(0xffffff), boneMat = toon(0xe8e0c0);
  const part = (parent, list, w, h, d, x, y, z, color) => {
    const n = new THREE.Object3D(); n.position.set(x, y, z); n.scale.set(w, h, d); parent.add(n);
    list.push({ n, color }); return n;
  };
  const joint = (parent, x, y, z) => { const j = new THREE.Object3D(); j.position.set(x, y, z); parent.add(j); return j; };
  const SHIRTS = [0x3a4a6a, 0x5a3a2a, 0x5a2030, 0x4a4a42, 0x2a4a3a, 0x6a5a3a], SKIN = [0x7a9a6a, 0x8aa070, 0x6a8a62], PANTS = [0x2a2a30, 0x3a3028, 0x22303a];
  const NZ = low ? 6 : 9, NS = low ? 3 : 5;
  const zombies = [], skels = [];
  for (let i = 0; i < NZ; i++) {
    const R = new THREE.Object3D(); rigs.add(R);
    const sh = SHIRTS[i % SHIRTS.length], sk = SKIN[i % 3], pa = PANTS[i % 3];
    const hips = joint(R, 0, 1.05, 0);
    part(hips, partsZ, 0.62, 0.3, 0.36, 0, 0, 0, pa);
    const torso = joint(hips, 0, 0.12, 0);
    part(torso, partsZ, 0.7, 0.78, 0.4, 0, 0.4, 0, sh);
    part(torso, partsZ, 0.72, 0.12, 0.42, 0, 0.2, 0.01, sh === 0x4a4a42 ? 0x2a2a26 : 0x22201a);
    const neck = joint(torso, 0, 0.82, 0);
    const head = joint(neck, 0, 0.05, 0);
    part(head, partsZ, 0.42, 0.46, 0.42, 0, 0.23, 0, sk);
    part(head, partsZ, 0.3, 0.08, 0.05, 0, 0.12, 0.21, 0x1a0a08);
    const arms = [], legs = [];
    for (const sx of [-1, 1]) {
      const s = joint(torso, sx * 0.44, 0.72, 0);
      part(s, partsZ, 0.17, 0.48, 0.17, 0, -0.24, 0, sh);
      const e = joint(s, 0, -0.48, 0);
      part(e, partsZ, 0.15, 0.46, 0.15, 0, -0.23, 0, sk);
      arms.push({ s, e, sx });
      const hp = joint(hips, sx * 0.17, -0.08, 0);
      part(hp, partsZ, 0.22, 0.5, 0.22, 0, -0.25, 0, pa);
      const k = joint(hp, 0, -0.5, 0);
      part(k, partsZ, 0.2, 0.48, 0.2, 0, -0.24, 0, i % 2 ? pa : sk);
      part(k, partsZ, 0.24, 0.1, 0.36, 0, -0.5, 0.06, 0x1a1612);
      legs.push({ hp, k, sx });
    }
    const z = {
      R, hips, torso, head, arms, legs, x: (rnd() - 0.5) * 44, z: -13 + rnd() * 15, dir: rnd() < 0.5 ? 1 : -1, speed: 0.55 + rnd() * 0.5,
      ph: rnd() * 6, scale: 1.05 + rnd() * 0.35, lurch: { x: 0, v: 0 }, twitch: { x: 0, v: 0 }, stagger: { x: 0, v: 0 }, rise: 1, riseT: 0, eye: new THREE.Vector3(),
      walk: rnd() * 10,
    };
    zombies.push(z);
  }
  for (let i = 0; i < NS; i++) {
    const R = new THREE.Object3D(); rigs.add(R);
    const B = 0xe8e0c0;
    const hips = joint(R, 0, 0.95, 0);
    part(hips, partsS, 0.44, 0.16, 0.2, 0, 0, 0, B);
    const torso = joint(hips, 0, 0.06, 0);
    part(torso, partsS, 0.07, 0.62, 0.07, 0, 0.32, -0.06, B);
    for (let r = 0; r < 4; r++) part(torso, partsS, 0.5 - r * 0.05, 0.06, 0.28, 0, 0.32 + r * 0.11, 0, B);
    part(torso, partsS, 0.62, 0.07, 0.12, 0, 0.74, -0.04, B);
    const head = joint(torso, 0, 0.82, 0);
    skulls.push({ n: head });
    part(head, partsS, 0.1, 0.06, 0.04, -0.08, 0.2, 0.17, 0x080604);
    part(head, partsS, 0.1, 0.06, 0.04, 0.08, 0.2, 0.17, 0x080604);
    part(head, partsS, 0.24, 0.08, 0.2, 0, 0.0, 0.05, B);
    const arms = [], legs = [];
    for (const sx of [-1, 1]) {
      const s = joint(torso, sx * 0.32, 0.72, 0);
      part(s, partsS, 0.06, 0.42, 0.06, 0, -0.21, 0, B);
      const e = joint(s, 0, -0.42, 0);
      part(e, partsS, 0.05, 0.38, 0.05, 0, -0.19, 0, B);
      part(e, partsS, 0.1, 0.1, 0.06, 0, -0.42, 0, B);
      arms.push({ s, e, sx });
      const hp = joint(hips, sx * 0.14, -0.04, 0);
      part(hp, partsS, 0.07, 0.46, 0.07, 0, -0.23, 0, B);
      const k = joint(hp, 0, -0.46, 0);
      part(k, partsS, 0.06, 0.44, 0.06, 0, -0.22, 0, B);
      part(k, partsS, 0.14, 0.05, 0.24, 0, -0.45, 0.05, B);
      legs.push({ hp, k, sx });
    }
    skels.push({ R, hips, torso, head, arms, legs, x: (rnd() - 0.5) * 40, z: -11 + rnd() * 13, dir: rnd() < 0.5 ? 1 : -1, speed: 0.9 + rnd() * 0.8, ph: rnd() * 6, scale: 1.0 + rnd() * 0.3, rattle: 0, bang: 0 });
  }
  const zMesh = new THREE.InstancedMesh(boxGeo, zombieMat, partsZ.length);
  partsZ.forEach((p, i) => zMesh.setColorAt(i, col.set(p.color)));
  const sMesh = new THREE.InstancedMesh(boxGeo, boneMat, partsS.length);
  partsS.forEach((p, i) => sMesh.setColorAt(i, col.set(p.color)));
  const skullMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.2, 10, 8)), boneMat, skulls.length);
  for (const m of [zMesh, sMesh, skullMesh]) { m.frustumCulled = false; root.add(m); disposables.push(m); }
  const skullOff = new THREE.Matrix4().makeTranslation(0, 0.22, 0).multiply(new THREE.Matrix4().makeScale(1.0, 1.1, 1.0));
  const M = new THREE.Matrix4();

  // ── Radiation hologram above the board (camera-locked) ──────────
  const radTex = canvasTex(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.shadowColor = '#66ff33'; g.shadowBlur = 16;
    g.strokeStyle = '#a8ff80'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w * 0.45, 0, Math.PI * 2); g.stroke();
    trefoil(g, w / 2, w / 2, w * 0.38, '#b8ff90', null);
  });
  const radMat = additive({ map: radTex, depthTest: false, fog: false, color: TOX });
  const rad = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), radMat); rad.renderOrder = 15; camera.add(rad);
  // Board-edge toxic glow on clears (green inside, red rim), camera-locked.
  const edgeMats = [], edges = [];
  for (const sx of [-1, 1]) for (const [c, w] of [[TOX, 1], [0xff2800, 1.7]]) {
    const m = additive({ map: glowTex, depthTest: false, fog: false, color: 0x000000 });
    const e = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), m); e.renderOrder = 14; camera.add(e);
    edges.push({ e, m, sx, c: new THREE.Color(c), w });
  }
  const washMat = additive({ color: 0x000000, depthTest: false, fog: false });
  const wash = new THREE.Mesh(keep(new THREE.PlaneGeometry(4, 4)), washMat); wash.position.z = -0.5; wash.renderOrder = 20; camera.add(wash);

  // ── Particles: goo (splatter/geysers/bubbles), drips, steam ─────
  const GLOWS = low ? 260 : 380;
  const glowMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), additive({ map: glowTex, fog: false }), GLOWS);
  glowMesh.frustumCulled = false; glowMesh.renderOrder = 6; glowMesh.setColorAt(0, col.set(0)); root.add(glowMesh); disposables.push(glowMesh);
  let nGlow = 0;
  const glow = (x, y, z, sx, sy, c, k) => {
    if (nGlow >= GLOWS || k <= 0.003) return;
    dummy.position.set(x, y, z); dummy.quaternion.copy(camera.quaternion); dummy.scale.set(sx, sy, 1); dummy.updateMatrix();
    glowMesh.setMatrixAt(nGlow, dummy.matrix); glowMesh.setColorAt(nGlow++, col.set(c).multiplyScalar(k));
  };
  const GOO = 140;
  const goo = Array.from({ length: GOO }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.3, c: TOX }));
  let gooCur = 0;
  const spit = (x, y, z, vx, vy, vz, s, life, c) => { const p = goo[gooCur = (gooCur + 1) % GOO]; p.life = life; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.s = s; p.c = c || TOX; };
  const geyser = (x, z, k) => { for (let i = 0; i < 14 * k; i++) spit(x + (rnd() - 0.5) * 0.8, 0.2, z + (rnd() - 0.5) * 0.8, (rnd() - 0.5) * 2.5, 7 + rnd() * 6 * k, (rnd() - 0.5) * 2.5, 0.35 + rnd() * 0.4, 1.6 + rnd() * 0.5); };
  const DRIPS = low ? 26 : 44;
  const drips = Array.from({ length: DRIPS }, () => ({ x: (rnd() - 0.5) * 60, y: rnd() * 30, z: -20 + rnd() * 24, vy: 5 + rnd() * 6 }));
  const STEAM = low ? 36 : 60;
  const steam = Array.from({ length: STEAM }, (_, i) => ({ t: towers[i % 4], life: rnd(), x: 0, y: 0, z: 0, s: 1 }));
  const resetSteam = (p) => { const T = p.t; p.life = 1; p.x = T.x + (rnd() - 0.5) * T.r; p.y = T.top; p.z = T.z + (rnd() - 0.5) * 3; p.s = 4 + rnd() * 3; };
  steam.forEach(p => { const l = p.life; resetSteam(p); p.life = l; p.y += (1 - l) * 18; });

  // Ground shock rings.
  const shocks = Array.from({ length: 4 }, () => ({ life: 0, x: 0, z: 0, r: 0, v: 14 }));
  let shockCur = 0;
  const shock = (x, z, v) => { const s = shocks[shockCur = (shockCur + 1) % 4]; s.life = 1; s.x = x; s.z = z; s.r = 0.3; s.v = v || 14; };

  // ── State ───────────────────────────────────────────────────────
  const st = {
    t: 0, policePhase: 0, strobe: 0, flash: 0, tox: 0, shake: 0, cheer: 0, combo: 0, danger: 0, melt: 0, over: false,
    radSpin: 0, radV: 0, radFlip: { x: 0, v: 0 }, boil: 0, thriller: 0, armsUp: 0, mushroom: 0, dip: { x: 0, v: 0 }, camX: { x: 0, v: 0 }, roll: { x: 0, v: 0 },
    fov: 0, pieceX: 0, follow: 0, power: 1, lastDrip: 0,
  };

  const poseZombie = (z, dt, beat, t) => {
    const thr = smooth(st.thriller * 1.5) * (st.over ? 0 : 1), up = smooth(st.armsUp * 1.8);
    springStep(z.lurch, 0, dt, 1.6, 0.35); springStep(z.twitch, 0, dt, 3, 0.25); springStep(z.stagger, 0, dt, 1.4, 0.4);
    // walking / approaching
    const toward = smooth((st.danger - 0.55) / 0.3) + (st.over ? 1 : 0);
    const spd = z.speed * (1 - thr * 0.9) * (1 + 1.2 * toward);
    z.walk += dt * spd * 2.2;
    if (toward > 0.02) { z.z += dt * spd * 1.2 * toward; z.x += z.dir * dt * spd * 0.3 * (1 - toward); }
    else z.x += z.dir * dt * spd * 0.8 + z.lurch.x * dt * 3;
    if (z.x > 26) z.x = -26; if (z.x < -26) z.x = 26;
    if (z.z > 12) { z.z = -14 - rnd() * 4; z.rise = 0; z.riseT = 0; }
    z.x += z.stagger.x * dt * 2;
    // rise from the ground (level up / start)
    if (z.rise < 1) { z.riseT += dt; z.rise = smooth(z.riseT / 1.6); }
    const facing = toward > 0.5 ? 0 : (z.dir > 0 ? Math.PI / 2 : -Math.PI / 2) * (1 - toward * 2);
    z.R.position.set(z.x, -1.9 * z.scale * (1 - z.rise), z.z);
    z.R.rotation.set(0, lerp(facing, 0, thr) + z.twitch.x * 0.3, 0);
    z.R.scale.setScalar(z.scale);
    const w = z.walk + z.ph;
    // shamble: stiff legs, one foot dragging
    const sw = Math.sin(w * Math.PI);
    z.legs[0].hp.rotation.x = -0.45 * sw * (1 - thr); z.legs[1].hp.rotation.x = 0.3 * sw * (1 - thr);
    z.legs[0].k.rotation.x = 0.3 * Math.max(0, sw) * (1 - thr); z.legs[1].k.rotation.x = 0.15 * (1 - thr);
    // Thriller: side shuffle with claw hands, shoulders shimmy, on the beat
    const bt = beat * Math.PI;
    const shuf = Math.sin(bt) * thr;
    z.legs[0].hp.rotation.z = -0.15 * Math.max(0, shuf); z.legs[1].hp.rotation.z = 0.15 * Math.max(0, -shuf);
    z.hips.position.set(0.18 * shuf, 1.05 - 0.05 * Math.abs(sw) * (1 - thr) - 0.08 * thr * (0.5 + 0.5 * Math.cos(2 * bt)), 0);
    z.torso.rotation.set(0.45 * (1 - thr) * (1 - up) + z.lurch.x * 0.0 + Math.abs(z.lurch.x) * 0.3 - z.stagger.x * 0.05 * 0, 0.25 * Math.sin(w * Math.PI * 0.5) * (1 - thr) + 0.35 * shuf, 0.12 * Math.sin(w * 0.7) + z.stagger.x * 0.08);
    z.head.rotation.set(0.25 + 0.15 * Math.sin(w * 1.3) * (1 - thr), 0.2 * Math.sin(w * 0.6) + z.twitch.x, 0.35 * Math.sin(w * 0.4 + z.ph) * (1 - thr) + 0.2 * shuf + z.twitch.x * 0.6);
    z.arms.forEach((a, k) => {
      // classic arms-out reach … Thriller claws … arms up (Tetris)
      const reach = -1.45 - 0.1 * Math.sin(w * 2 + k) - 0.3 * Math.abs(z.lurch.x);
      const clawSh = -0.6 + 0.35 * Math.sin(bt * 2 + k * Math.PI), clawZ = a.sx * (0.9 + 0.2 * Math.sin(bt));
      a.s.rotation.set(lerp(lerp(reach, clawSh, thr), -3.0, up), 0, lerp(lerp(a.sx * 0.08, clawZ, thr), a.sx * 0.35, up));
      a.e.rotation.set(lerp(lerp(-0.15, -1.3, thr), -0.2, up), 0, 0);
    });
  };
  const poseSkel = (s, dt, beat) => {
    s.rattle = Math.max(0, s.rattle - dt * 1.4);
    s.bang = Math.max(0, s.bang - dt * 0.5);
    const toward = smooth((st.danger - 0.6) / 0.3);
    s.x += s.dir * dt * s.speed * (1 - toward);
    s.z += dt * toward * 1.2;
    if (s.x > 25) s.x = -25; if (s.x < -25) s.x = 25;
    if (s.z > 12) s.z = -12;
    const bt = beat * Math.PI * 2 + s.ph * 0.2;
    const j = () => (rnd() - 0.5) * s.rattle * 0.5;
    // spooky skeleton dance: Charleston-ish knees-in / knees-out bounce
    const hop = Math.abs(Math.sin(bt * 0.5));
    s.R.position.set(s.x, 0.08 * hop + j() * 0.2, s.z);
    s.R.rotation.set(0, (s.dir > 0 ? 1 : -1) * 0.9 * (1 - toward) + 0.4 * Math.sin(bt * 0.25), 0);
    s.R.scale.setScalar(s.scale);
    const ch = Math.sin(bt * 0.5);
    s.legs.forEach((l, k) => {
      const sgn = k ? 1 : -1;
      l.hp.rotation.set(-0.3 * Math.max(0, ch * sgn) + j(), 0, sgn * 0.25 * ch + j());
      l.k.rotation.set(0.6 * Math.max(0, ch * sgn) + j(), 0, 0);
    });
    s.hips.position.y = 0.95 - 0.06 * (1 - hop);
    const bang = 0.35 + s.bang + st.combo * 0.08;
    s.torso.rotation.set(0.1 * Math.sin(bt) + j(), 0.3 * Math.sin(bt * 0.5) + j(), j());
    s.head.rotation.set(bang * Math.max(0, Math.sin(bt)) + j() * 2, j() * 2, j() * 2);
    s.arms.forEach((a, k) => {
      const sgn = k ? 1 : -1;
      a.s.rotation.set(-0.8 + 0.7 * Math.sin(bt * 0.5 + k * Math.PI) + j(), 0, sgn * (0.5 + 0.3 * Math.sin(bt)) + j());
      a.e.rotation.set(-1.0 - 0.4 * Math.sin(bt + k) + j(), 0, 0);
    });
  };

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0, energy = info.energy ?? 1;
    st.t += dt;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6);
    const cheer = Math.max(st.cheer, info.cheer || 0);
    st.flash = Math.max(0, st.flash - dt * 2.5);
    st.tox = Math.max(0, st.tox - dt * 0.8);
    st.cheer = Math.max(0, st.cheer - dt * 0.45);
    st.shake = Math.max(0, st.shake - dt * 2.4);
    st.strobe = Math.max(0, st.strobe - dt * 0.6);
    st.boil = Math.max(0, st.boil - dt * 1.5);
    st.thriller = Math.max(0, st.thriller - dt * 0.4);
    st.armsUp = Math.max(0, st.armsUp - dt * 0.6);
    st.mushroom = Math.max(0, st.mushroom - dt * 0.35);
    st.fov = Math.max(0, st.fov - dt * 8);
    const dg = info.danger || 0;
    st.danger += (dg - st.danger) * Math.min(1, dt * 1.5);
    st.melt += ((st.over ? 1 : 0) - st.melt) * Math.min(1, dt * 0.8);
    st.pieceX += ((info.pieceX || 0) - st.pieceX) * Math.min(1, dt * 3);
    // Police strobes: alternate red / blue; faster with combos and danger.
    st.policePhase += dt * (2.4 + 1.2 * energy + 1.2 * st.combo * 0.5 + 3 * st.danger + 4 * st.strobe);
    const isRed = (st.policePhase % (Math.PI * 2)) < Math.PI;
    const strobeA = Math.abs(Math.sin(st.policePhase * 2)) * (0.35 + st.strobe * 0.9 + 0.3 * st.danger);
    const rK = isRed ? strobeA : 0, bK = isRed ? 0 : strobeA;
    nGlow = 0;

    // ── Cops ──
    cops.forEach((c, i) => {
      const r = i ? !isRed : isRed;
      c.red.material.color.setRGB(r ? 1 : 0.15, 0.02, 0.02);
      c.blue.material.color.setRGB(0.02, 0.06, r ? 0.15 : 1);
      V.set(0, 1.85, -0.2); c.g.localToWorld(V);
      glow(V.x - 0.3, V.y, V.z, 2.6, 2.6, r ? 0xff2020 : 0x2050ff, 0.6 + strobeA);
      groundMat.uniforms.uCop.value[i].set(c.x, c.z, 0, 0);
    });
    redL.intensity = 120 * rK; blueL.intensity = 140 * bK;
    redL.position.set(-12.5 + 2 * Math.sin(st.t), 3, -6); blueL.position.set(13, 3, -7);

    // ── Creatures ──
    rigs.position.z = (camera.aspect || 1.6) < 0.9 ? 8 : 0;   // portrait: bring the lot into the strip under the board
    for (const z of zombies) poseZombie(z, dt, beat, t);
    for (const s of skels) poseSkel(s, dt, beat);
    rigs.updateMatrixWorld(true);
    partsZ.forEach((p, i) => zMesh.setMatrixAt(i, p.n.matrixWorld));
    partsS.forEach((p, i) => sMesh.setMatrixAt(i, p.n.matrixWorld));
    skulls.forEach((s, i) => skullMesh.setMatrixAt(i, M.multiplyMatrices(s.n.matrixWorld, skullOff)));
    zMesh.instanceMatrix.needsUpdate = sMesh.instanceMatrix.needsUpdate = skullMesh.instanceMatrix.needsUpdate = true;
    // zombie eyes
    for (const z of zombies) {
      V.set(0, 0.28, 0.24); z.head.localToWorld(V);
      glow(V.x, V.y, V.z, 0.45 * z.scale, 0.3 * z.scale, st.melt > 0.3 ? 0xff3010 : TOX, 0.7 + 0.5 * cheer + 0.3 * onBeat);
    }
    for (const s of skels) { V.set(0, 0.2, 0.2); s.head.localToWorld(V); if (s.rattle > 0.2 || st.combo > 1) glow(V.x, V.y, V.z, 0.5, 0.35, 0xff4020, 0.6); }

    // ── Pools (pulse, bubbles) ──
    POOLS.forEach(([x, z, r], i) => {
      const pulse = 0.6 + 0.25 * Math.sin(t * (1.6 + i * 0.3) + i) + 0.3 * onBeat + 0.6 * st.boil + 0.8 * st.tox;
      const rr = r * (1 + 0.08 * Math.sin(t * 1.3 + i) + 0.35 * st.danger + 0.15 * st.boil);
      groundMat.uniforms.uPool.value[i].set(x, z, rr, pulse);
      glow(x, 0.3, z, rr * 2.4, rr * 1.0, TOX, 0.12 * pulse);
      const nb = 2 + Math.round(2 * st.boil);
      for (let k = 0; k < nb; k++) {
        const life = ((t * (0.6 + 0.6 * st.boil) + k * 0.37 + i * 0.21) % 1);
        const a = (k * 2.4 + i) % 6.28, rb = rr * 0.55 * ((k * 0.37 + i * 0.13) % 1);
        glow(x + Math.cos(a) * rb, 0.1 + life * 0.9, z + Math.sin(a) * rb * 0.7, 0.35 + 0.25 * life, 0.35 + 0.25 * life, 0x9aff60, Math.sin(life * Math.PI) * 0.7);
      }
    });

    // ── Barrels: bounce on drops, leak ──
    barrelState.forEach((b, i) => {
      springStep(b.y, 0, dt, 2.5, 0.25);
      const jump = Math.max(0, b.y.x);
      dummy.position.set(b.x, b.fall ? 0.55 : jump, b.z);
      dummy.rotation.set(b.fall ? Math.PI / 2 : 0.05 * Math.sin(st.t * 9 + i) * Math.min(1, jump * 4), i * 0.7, b.fall ? 0.3 * b.fall : 0);
      dummy.scale.setScalar(1); dummy.updateMatrix(); barrels.setMatrixAt(i, dummy.matrix);
      if (b.fall) { dummy.translateY(0.75); } else dummy.position.y += 0.95;
      dummy.updateMatrix(); bands.setMatrixAt(i, dummy.matrix);
      b.leak -= dt; b.lid = Math.max(0, b.lid - dt);
      if (b.leak <= 0) { b.leak = 1.5 + rnd() * 4; spit(b.x + 0.5, b.fall ? 0.4 : 0.6, b.z + 0.3, 0.3, 0.4, 0.3, 0.22, 0.8); }
      if (b.lid > 0 && Math.floor(b.lid * 20) % 2 === 0) spit(b.x, 1.6, b.z, (rnd() - 0.5) * 2, 6 + rnd() * 5, (rnd() - 0.5) * 2, 0.35, 1.2);
    });
    barrels.instanceMatrix.needsUpdate = bands.instanceMatrix.needsUpdate = true;

    // ── Goo particles ──
    for (const p of goo) {
      if (p.life <= 0) continue;
      p.life -= dt; p.vy -= 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.2; p.vx *= 0.5; p.vz *= 0.5; }
      glow(p.x, p.y, p.z, p.s * 1.8, p.s * 1.8, p.c, Math.min(1, p.life * 2) * 0.9);
    }
    // ── Drips raining down ──
    for (const d of drips) {
      d.y -= d.vy * dt * (1 + 0.4 * energy);
      if (d.y < 0) { d.y = 24 + rnd() * 8; d.x = (rnd() - 0.5) * 60; d.vy = 5 + rnd() * 6; spit(d.x, 0.1, d.z, 0, 1.5, 0, 0.18, 0.3); }
      glow(d.x, d.y, d.z, 0.22, 0.75, 0x66ff22, 0.55);
    }
    // ── Steam from the cooling towers ──
    for (const p of steam) {
      const vent = p.t.vent;
      p.life -= dt * (0.07 + 0.25 * vent);
      if (p.life <= 0) resetSteam(p);
      const u = 1 - p.life;
      p.y += dt * (2.2 + 9 * vent); p.x += dt * (0.8 + 0.6 * Math.sin(st.t * 0.3));
      const s = p.s * (1 + u * 1.6) * (1 + vent * 0.5);
      glow(p.x, p.y, p.z, s, s, vent > 0.05 ? 0x60ff30 : 0x5a7a50, Math.sin(Math.min(1, u * 1.2) * Math.PI) * (0.12 + 0.13 * vent) * (1 + 0.5 * st.melt));
    }
    for (const T of towers) { T.vent = Math.max(0, T.vent - dt * 0.25); if (Math.floor(st.t * 1.2 + T.x) % 2 === 0) glow(T.x, T.top + 0.5, T.z, 1.8, 1.8, 0xff2020, 0.8); }
    for (const S of stacks) if (Math.floor(st.t * 1.6 + S.x) % 2 === 0) glow(S.x, S.y + 0.5, S.z, 1.6, 1.6, 0xff3030, 0.8);
    // Reactor mushroom glow (Tetris) / meltdown.
    const mush = smooth(st.mushroom), melt = st.melt;
    if (mush > 0.01 || melt > 0.01) {
      glow(0, 16 + 22 * (1 - st.mushroom * 0.5), -95, 50 * (0.5 + mush), 34 * (0.5 + mush), melt > 0.3 ? 0xff5010 : 0x80ff40, Math.max(mush * 0.6, melt * 0.4));
      glow(0, 10, -92, 14, 30, melt > 0.3 ? 0xff4010 : 0x80ff40, Math.max(mush, melt) * 0.4);
    }
    hallWin.material.color.set(melt > 0.3 ? 0xff3010 : TOX).multiplyScalar(0.5 + 0.3 * onBeat + 0.8 * st.tox + mush);

    // ── Shocks ──
    shocks.forEach((s, i) => {
      if (s.life > 0) { s.life -= dt * 0.9; s.r += s.v * dt; }
      groundMat.uniforms.uRing.value[i].set(s.x, s.z, s.r, Math.max(0, s.life) * 0.9);
    });

    // ── Shaders + lights ──
    const gu = groundMat.uniforms;
    gu.uTime.value = t; gu.uBeat.value = onBeat; gu.uFlash.value = st.flash + st.tox * 0.5; gu.uRed.value = rK; gu.uBlue.value = bK; gu.uDanger.value = st.danger; gu.uMelt.value = melt;
    const su = skyMat.uniforms;
    su.uTime.value = t; su.uRed.value = rK; su.uBlue.value = bK; su.uTox.value = 0.45 * st.tox + 0.3 * mush; su.uMelt.value = melt; su.uPulse.value = onBeat * 0.6;
    scene.fog.color.setRGB(0.05 + 0.25 * melt, 0.1 + 0.05 * st.danger - 0.06 * melt, 0.015);
    scene.fog.near = 30 - 18 * st.danger; scene.fog.far = 150 - 50 * st.danger;
    hemi.intensity = 0.7 + 0.25 * st.tox + 0.25 * st.flash;
    toxL.intensity = 110 * (st.tox + st.flash * 0.6) + 30 * onBeat;
    washMat.color.setRGB(0.15, 0.8, 0.1).multiplyScalar(st.flash * 0.1 + st.tox * 0.02).add(col.setRGB(rK * 0.04, 0, bK * 0.05));

    // ── Radiation hologram ──
    st.radV *= Math.exp(-dt * 1.2);
    st.radSpin += dt * (0.9 + 0.6 * energy + st.radV);
    springStep(st.radFlip, 0, dt, 0.9, 0.3);
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    const baseFov = portrait ? 66 : 50;
    const fov = baseFov - st.fov;
    const dist = 10, hh = dist * Math.tan(fov * Math.PI / 360);
    const sz = (portrait ? 0.07 : 0.085) * hh * 2 * (1 + 0.15 * onBeat + 0.25 * cheer);
    rad.scale.set(sz, sz, 1);
    rad.position.set(0, hh * (portrait ? 0.84 : 0.85), -dist);
    rad.rotation.set(0, st.radFlip.x, st.radSpin);
    const edgeK = smooth((cheer - 0.5) / 0.5);
    for (const E of edges) {
      const ex = E.sx * 0.135 * hh * 2 * Math.min(1.6, aspect) * (portrait ? 2.6 : 1);
      E.e.position.set(ex * (E.w > 1 ? 1.15 : 1), 0, -dist);
      E.e.scale.set(hh * 0.5 * E.w, hh * 2.2, 1);
      E.m.color.copy(E.c).multiplyScalar(edgeK * (E.w > 1 ? 0.35 : 0.5) * (0.8 + 0.2 * onBeat));
    }
    radMat.color.set(melt > 0.3 ? 0xff4020 : TOX).multiplyScalar(0.55 + 0.3 * onBeat + 0.6 * cheer + (melt > 0.3 && Math.sin(st.t * 20) > 0 ? 0.6 : 0));

    // ── Camera ──
    springStep(st.camX, 0, dt, 2.2, 0.4); springStep(st.roll, 0, dt, 2.0, 0.3); springStep(st.dip, 0, dt, 2.6, 0.45);
    st.follow += (st.pieceX * 1.2 - st.follow) * Math.min(1, dt * 2);
    const sh = st.shake * st.shake;
    const cz = portrait ? 12 : 14;
    camera.position.set(Math.sin(t * 0.1) * 1.0 + st.follow + st.camX.x + (rnd() - 0.5) * sh * 0.8, (portrait ? 8.5 : 3.0) + Math.sin(t * 0.15) * 0.25 + st.dip.x + (rnd() - 0.5) * sh * 0.6, cz + Math.sin(t * 0.07) * 0.6 - 2 * melt);
    camera.lookAt(st.follow * 0.5 + st.camX.x * 0.4, (portrait ? -1.0 : 4.3) + st.dip.x * 0.4, -12);
    camera.rotateZ(st.roll.x + Math.sin(t * 0.13) * 0.012);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sky.position.copy(camera.position);

    glowMesh.count = nGlow; glowMesh.instanceMatrix.needsUpdate = true; if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
  }

  // Board centre on the ground (in front of the camera).
  const boardX = () => st.pieceX * 3;
  function react(kind, data = {}) {
    if (kind === 'move') {
      const d = data.dir || 0;
      for (const z of zombies) if (rnd() < 0.5) { z.lurch.v += d * 3; z.dir = d || z.dir; }
      for (const s of skels) { s.rattle = Math.max(s.rattle, 0.6); s.x += d * 0.15; }
      for (let i = 0; i < 4; i++) { const dd = drips[Math.floor(rnd() * DRIPS)]; dd.y = 22 + rnd() * 6; dd.vy = 10 + rnd() * 6; dd.x = (rnd() - 0.5) * 50; }
      st.camX.v += d * 1.4;
    } else if (kind === 'rotate') {
      const d = data.dir || 1;
      st.radV += 6 * d; st.roll.v += d * 0.22;
      for (const s of skels) s.rattle = 1;
      for (const z of zombies) z.twitch.v += (rnd() - 0.5) * 6;
    } else if (kind === 'soft') {
      st.boil = 1; st.dip.v -= 0.8;
    } else if (kind === 'drop') {
      const rows = data.rows || 0, k = Math.min(1, 0.35 + rows / 14);
      const x = data.col != null ? (data.col - 4.5) * 0.8 : boardX();
      shock(x, 4, 12 + 10 * k);
      for (let i = 0; i < 10 + 14 * k; i++) { const a = rnd() * Math.PI * 2, v = 3 + rnd() * 6 * k; spit(x + Math.cos(a) * 0.5, 0.3, 4 + Math.sin(a) * 0.5, Math.cos(a) * v, 3 + rnd() * 6 * k, Math.sin(a) * v * 0.6, 0.3 + rnd() * 0.3, 1.2); }
      for (const b of barrelState) b.y.v += (1.5 + 3 * k) * (0.6 + 0.4 * rnd());
      for (const z of zombies) z.stagger.v += (z.x > x ? 1 : -1) * 3 * k;
      st.shake = Math.max(st.shake, 0.35 + 0.6 * k); st.flash = Math.max(st.flash, 0.15 * k); st.fov = Math.max(st.fov, 2 * k);
    } else if (kind === 'hold') {
      st.radFlip.v += 9;
      const picks = [0, 3, 6, 9];
      for (const i of picks) if (barrelState[i]) barrelState[i].lid = 0.6;
    } else if (kind === 'clear') {
      const n = Math.max(1, Math.min(4, data.lines || 1)), combo = data.combo || 0;
      st.combo = combo;
      st.cheer = Math.min(1.2, st.cheer + 0.35 + 0.18 * n);
      st.strobe = Math.min(1.5, st.strobe + 0.5 + 0.2 * n);
      st.tox = Math.min(1.4, st.tox + 0.3 + 0.2 * n);
      st.flash = Math.max(st.flash, 0.25 + 0.15 * n);
      st.thriller = Math.min(3, 1.4 + 0.5 * n);
      st.fov = Math.max(st.fov, 1.5 + n);
      shock(boardX(), 0, 18 + 4 * n);
      for (const z of zombies) z.lurch.v += (rnd() - 0.5) * 4;
      for (const s of skels) { s.rattle = 1; s.bang = 0.4 + 0.15 * n; }
      const order = [0, 1, 3, 2, 4, 5];
      for (let i = 0; i < Math.min(6, n + Math.floor(combo / 2)); i++) { const [x, z] = POOLS[order[i]]; geyser(x, z, 0.7 + 0.15 * n); }
      if (n >= 3) towers[Math.floor(rnd() * 4)].vent = 1.2;
      if (n >= 4) { st.mushroom = 1.4; st.armsUp = 2; for (const T of towers) T.vent = 1.5; st.flash = 1; }
    } else if (kind === 'levelUp') {
      st.strobe = 1.5; st.tox = Math.max(st.tox, 0.6);
      for (const T of towers) T.vent = Math.max(T.vent, 0.8);
      zombies.forEach((z, i) => { if (i % 2 === 0) { z.rise = 0; z.riseT = -i * 0.1; z.z = -10 + rnd() * 12; spit(z.x, 0.2, z.z, 0, 3, 0, 0.6, 0.8, 0x6a5a3a); } });
    } else if (kind === 'combo') {
      st.combo = data.n || 0;
    } else if (kind === 'gameOver') {
      st.over = true; st.combo = 0; st.strobe = 1.5; st.mushroom = 1.4; st.flash = 1;
      for (const T of towers) T.vent = 2;
    } else if (kind === 'start') {
      st.over = false; st.melt = 0; st.combo = 0;
      for (const z of zombies) { z.rise = 0; z.riseT = -rnd() * 1.2; if (z.z > 4) z.z = -10 + rnd() * 12; }
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root); camera.remove(rad); camera.remove(wash); for (const E of edges) camera.remove(E.e);
      scene.fog = prevFog; scene.background = prevBg;
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
  };
}
