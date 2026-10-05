// DREAM OR NIGHTMARE — the living Tetris world: ROBOT CITY.
//
// A cyberpunk megacity at dusk, seen from street level: an over-large pink
// moon, an indigo sky fading into magenta haze, three layers of skyline
// (lit windows that flicker and ride the beat, neon roof strips, red
// beacons, flying-car skyways), two GIANT robots dancing the robot either
// side of the board (a third peeks over the far skyline), patrol
// helicopters sweeping searchlights over the street, drones blinking across
// the sky and a crowd of glow-stick kids at the front.
// The city breathes between DREAM (cyan haze, white-hot robot eyes) and
// NIGHTMARE (red haze, red eyes, lightning) with how you play.
//
// Reactions (ported from drawRobotCityScene + more):
//   move      robots' heads snap toward the piece, searchlights + drones jink
//   rotate    robots pop a torso twist + arm wave, helicopters bank, holo
//             billboards glitch, camera rolls
//   soft      robots dip, the street neon flares, camera dips
//   drop      the robot on the piece's side STOMPS: shock ring on the street,
//             camera shake, full-screen flash, left helicopter dives,
//             lightning (≥ 6 rows a bolt, ≥ 12 two bolts), mood → nightmare
//   hold      robots spin their heads 360°, the far robot pops up to look
//   clear     eye-lasers into the sky (1–4 lines → 2–8 beams), crowd cheers,
//             searchlights swing onto the robots, mood → dream; 3+ lines a
//             purple sky blast; TETRIS: arms-up pose, criss-cross lasers,
//             blast rings, every window in the city blazes, FOV punch
//   combo     more beams, hue-cycling lasers + glow sticks, window chase
//   levelUp   power surge rolls across the skyline, robots spin a full turn
//   danger    nightmare: red haze + red eyes, helicopter sirens strobe
//             red/blue, the far robot looms, stray lightning
//   gameOver  city blackout: windows die, robots power down and slump
//   start     power-on: windows switch on in a wave, robots boot up

const MAGENTA = 0xff2dd0, CYAN = 0x22e8ff, VIOLET = 0x8a4dff, RED = 0xff2030;

const SKY_FS = `varying vec3 vP; uniform float uTime, uPulse, uMood, uLight, uPower;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  void main(){
    vec3 d = normalize(vP); float h = d.y;
    vec3 top = vec3(0.02, 0.012, 0.09), mid = vec3(0.09, 0.035, 0.22), hor = vec3(0.42, 0.07, 0.36);
    vec3 c = mix(mid, top, smoothstep(0.1, 0.65, h));
    c = mix(hor, c, smoothstep(-0.03, 0.2, h));
    // mood: dream = cyan wash, nightmare = blood red
    vec3 dream = vec3(0.05, 0.2, 0.3), night = vec3(0.3, 0.0, 0.03);
    float m = clamp(uMood, -1.0, 1.0);
    c += (m > 0.0 ? dream * m : night * -m) * (0.35 + 0.65 * smoothstep(0.5, 0.0, h)) * 0.55;
    c += vec3(0.25, 0.05, 0.25) * uPulse * smoothstep(0.25, 0.0, abs(h - 0.04));
    // stars
    vec2 sg = vec2(atan(d.x, d.z) * 170.0, h * 170.0), g = floor(sg);
    float s = step(0.99, hash12(g)) * smoothstep(0.38, 0.0, length(fract(sg) - 0.5)) * smoothstep(0.12, 0.4, h);
    c += vec3(0.9, 0.85, 1.0) * s * (0.5 + 0.5 * sin(uTime * 2.3 + hash(g + 4.0) * 40.0));
    // the over-large dream moon (upper right)
    vec3 md = normalize(vec3(0.428, 0.469, -0.772));
    float mm = dot(d, md);
    float disc = smoothstep(0.9984, 0.9988, mm);
    vec3 moon = vec3(1.0, 0.86, 0.97) * (0.85 + 0.15 * hash(floor(d.xy * 300.0)));
    c = mix(c, moon * mix(1.0, 0.75, smoothstep(0.0, -1.0, m)) + vec3(0.25, 0.0, 0.0) * max(0.0, -m), disc);
    c += vec3(1.0, 0.55, 0.9) * pow(max(mm, 0.0), 700.0) * 0.4;
    c += vec3(0.6, 0.2, 0.55) * pow(max(mm, 0.0), 40.0) * 0.12;
    c += vec3(0.9, 0.75, 1.0) * uLight * (0.35 + 0.65 * smoothstep(0.0, 0.5, h));
    c *= 0.35 + 0.65 * uPower;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

const TOWER_VS = `varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vSeed;
  #include <fog_pars_vertex>
  void main(){
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vW = wp.xyz; vN = normal;
    #ifdef USE_INSTANCING_COLOR
      vC = instanceColor;
    #else
      vC = vec3(1.0);
    #endif
    vSeed = fract(instanceMatrix[3].x * 0.137 + instanceMatrix[3].z * 0.071);
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const TOWER_FS = `uniform float uCell, uTime, uBeat, uPower, uWave, uWaveK, uMood, uFlash, uBright, uBlaze, uChase;
  varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vSeed;
  #include <fog_pars_fragment>
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    vec3 n = normalize(vN);
    float roof = step(0.5, n.y);
    vec2 q = abs(n.x) > 0.5 ? vec2(vW.z, vW.y) : vec2(vW.x, vW.y);
    vec2 g = q / vec2(uCell, uCell * 1.3);
    vec2 cell = floor(g), f = fract(g);
    float h = hash(cell + vSeed * 91.0);
    float lit = step(0.56, h);
    float fl = step(0.95, hash(cell + floor(uTime * 0.6 + h * 7.0)));
    lit = abs(lit - fl);
    vec2 aw = fwidth(g);
    float win = smoothstep(0.26, 0.26 + aw.x, f.x) * smoothstep(0.74, 0.74 - aw.x, f.x) * smoothstep(0.3, 0.3 + aw.y, f.y) * smoothstep(0.72, 0.72 - aw.y, f.y);
    win = mix(win, 0.2, clamp(max(aw.x, aw.y) * 1.6 - 0.35, 0.0, 1.0));
    float hu = hash(cell + 7.3);
    vec3 wc = hu < 0.35 ? vec3(1.0, 0.25, 0.78) : hu < 0.72 ? vec3(0.25, 0.85, 1.0) : vec3(1.0, 0.78, 0.55);
    float m = clamp(uMood, -1.0, 1.0);
    wc = mix(wc, vec3(1.0, 0.15, 0.12) * (0.6 + 0.4 * hu), max(0.0, -m) * 0.75);
    // power: blackout / power-on wave (uPower 0..1 with a sweeping front)
    float on = smoothstep(0.0, 6.0, (uPower * 260.0 - 130.0) - vW.x * 0.6 + h * 18.0);
    float wave = exp(-pow((vW.x - uWave) * 0.07, 2.0)) * uWaveK;
    float chase = uChase * step(0.8, fract(cell.y * 0.21 + cell.x * 0.05 - uTime * 1.6));
    float b = lit * on * (uBright + 0.35 * uBeat * step(0.6, hash(cell + 3.1)));
    vec3 c = vC * 0.035;
    c += wc * win * b + vec3(1.0) * win * (wave + uBlaze * on) + wc * win * chase * on;
    c += vec3(0.6, 0.4, 0.8) * uFlash * win * 0.5;
    c = mix(c, vC * 0.03, roof);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

const GROUND_VS = `varying vec3 vW;
  #include <fog_pars_vertex>
  void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const GROUND_FS = `uniform float uTime, uBeat, uMood, uFlash, uSoft, uPower, uLight;
  uniform vec4 uSpot[3]; uniform vec3 uSpotC[3]; uniform vec4 uRing[4]; uniform vec4 uHeart[2];
  varying vec3 vW;
  #include <fog_pars_fragment>
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    vec2 p = vW.xz;
    float n = hash(floor(p * 6.0));
    vec3 c = vec3(0.018, 0.012, 0.03) * (0.85 + 0.3 * n);
    // neon plaza grid
    vec2 gq = abs(fract(p / 4.0) - 0.5);
    vec2 gw = fwidth(p / 4.0);
    float grid = (1.0 - smoothstep(0.0, gw.x * 1.5, gq.x - 0.0) ) + (1.0 - smoothstep(0.0, gw.y * 1.5, gq.y));
    grid = clamp(grid, 0.0, 1.0) * smoothstep(-70.0, -10.0, p.y) * 0.5;
    float m = clamp(uMood, -1.0, 1.0);
    vec3 gc = mix(vec3(0.15, 0.5, 0.9), vec3(0.9, 0.1, 0.1), max(0.0, -m));
    c += gc * grid * (0.12 + 0.2 * uBeat) * uPower;
    // magenta neon strip along the base of the skyline
    float strip = exp(-pow((p.y + 33.0) * 0.9, 2.0)) + 0.35 * exp(-pow((p.y + 33.0) * 0.12, 2.0));
    c += vec3(1.0, 0.25, 0.85) * strip * (0.45 + 0.35 * uBeat + 0.8 * uSoft) * uPower;
    // wet-street moon reflection streak
    c += vec3(0.5, 0.25, 0.45) * exp(-pow((p.x - 40.0 - (p.y + 30.0) * 0.6) * 0.18, 2.0)) * smoothstep(10.0, -40.0, p.y) * 0.25;
    // searchlight pools
    for (int i = 0; i < 3; i++) {
      vec2 d = p - uSpot[i].xy;
      c += uSpotC[i] * exp(-dot(d, d) / (uSpot[i].z * uSpot[i].z)) * uSpot[i].w;
    }
    // robot heart glow pools
    for (int i = 0; i < 2; i++) {
      vec2 d = p - uHeart[i].xy;
      c += vec3(1.0, 0.3, 0.9) * exp(-dot(d, d) / 30.0) * uHeart[i].w;
    }
    // stomp shock rings
    for (int i = 0; i < 4; i++) {
      vec4 r = uRing[i];
      if (r.w <= 0.0) continue;
      float d = length(p - r.xy);
      c += vec3(1.0, 0.45, 0.95) * exp(-pow((d - r.z) * 1.4, 2.0)) * r.w;
      c += vec3(0.5, 0.2, 0.6) * exp(-pow((d - r.z * 0.6) * 1.0, 2.0)) * r.w * 0.4;
    }
    c += vec3(0.6, 0.5, 0.8) * (uFlash * 0.25 + uLight * 0.3);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const prevFog = scene.fog, prevBg = scene.background;
  scene.background = new THREE.Color(0x05030f);
  scene.fog = new THREE.Fog(0x2a0c3a, 45, 190);
  camera.near = 0.1; camera.far = 420; camera.updateProjectionMatrix();

  const root = new THREE.Group();
  scene.add(root);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const V = new THREE.Vector3(), V2 = new THREE.Vector3(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t);
  };
  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const additive = (extra) => basic(0xffffff, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, ...extra });
  const glowTex = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.6)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });

  // ── Sky dome (follows the camera) ───────────────────────────────
  const skyMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uMood: { value: 0 }, uLight: { value: 0 }, uPower: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: SKY_FS,
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(380, 32, 16)), skyMat);
  sky.renderOrder = -10; root.add(sky);

  // ── Skyline: three layers of instanced towers ───────────────────
  const towerUniforms = (cell, bright) => THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uCell: { value: cell }, uTime: { value: 0 }, uBeat: { value: 0 }, uPower: { value: 1 }, uWave: { value: -999 }, uWaveK: { value: 0 },
    uMood: { value: 0 }, uFlash: { value: 0 }, uBright: { value: bright }, uBlaze: { value: 0 }, uChase: { value: 0 },
  }]);
  const towerMats = [];
  const towerMat = (cell, bright) => { const m = keep(new THREE.ShaderMaterial({ uniforms: towerUniforms(cell, bright), vertexShader: TOWER_VS, fragmentShader: TOWER_FS, fog: true })); towerMats.push(m); return m; };
  const boxGeo = keep(new THREE.BoxGeometry(1, 1, 1));
  const unitBox = keep(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const towers = { near: [], mid: [], far: [] };
  // Near: tall towers flanking the giants, out at the sides.
  // (left: tall, one carries the holo billboard; right: low, under the moon)
  towers.near.push({ x: -28, z: -34, w: 12, d: 8, h: 38 });
  for (const sx of [-1, 1]) for (let i = 0; i < (low ? 3 : 5); i++) {
    const x = sx * (22 + i * 8 + rnd() * 3);
    towers.near.push({ x: sx < 0 && i === 1 ? x - 12 : x, z: -15 - rnd() * 14 - i * 3, w: 6 + rnd() * 4, d: 6 + rnd() * 4, h: sx < 0 ? 26 + rnd() * 28 : 12 + rnd() * 9 });
  }
  // Mid: the dense skyline behind them (kept low where the far robot peeks).
  for (let x = -95; x < 95;) {
    const w = 5 + rnd() * 6;
    let h = 9 + rnd() * 24;
    if (x > 24 && x < 46) h = Math.min(h, 6 + rnd() * 3);
    towers.mid.push({ x: x + w / 2, z: -38 - rnd() * 16, w, d: 5 + rnd() * 5, h });
    x += w + 0.6 + rnd() * 2.5;
    if (low) x += 3;
  }
  // Far: hazy giants on the horizon.
  for (let x = -230; x < 230;) {
    const w = 9 + rnd() * 10;
    towers.far.push({ x: x + w / 2, z: -105 - rnd() * 30, w, d: 10, h: 20 + rnd() * 42 });
    x += w + 2 + rnd() * 6;
    if (low) x += 8;
  }
  const towerTints = [0x3a2a6a, 0x2a2058, 0x4a2a5a, 0x22284a];
  const layerMesh = (list, mat) => {
    const m = new THREE.InstancedMesh(unitBox, mat, list.length);
    list.forEach((t, i) => {
      dummy.position.set(t.x, 0, t.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(t.w, t.h, t.d); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, col.set(towerTints[i % 4]));
    });
    m.frustumCulled = false; root.add(m); disposables.push(m); return m;
  };
  layerMesh(towers.near, towerMat(1.1, 0.5));
  layerMesh(towers.mid, towerMat(1.25, 0.5));
  layerMesh(towers.far, towerMat(2.4, 0.4));
  // Neon roof strips (near + mid) and red antenna beacons on the tallest.
  const stripList = towers.near.concat(towers.mid.filter((t, i) => i % 2 === 0));
  const strips = new THREE.InstancedMesh(boxGeo, basic(0xffffff, { fog: false }), stripList.length);
  const NEON = [MAGENTA, CYAN, VIOLET];
  stripList.forEach((t, i) => {
    dummy.position.set(t.x, t.h - 0.6, t.z); dummy.scale.set(t.w * 1.02, 0.35, t.d * 1.02); dummy.updateMatrix();
    strips.setMatrixAt(i, dummy.matrix); strips.setColorAt(i, col.set(NEON[i % 3]));
  });
  strips.frustumCulled = false; root.add(strips); disposables.push(strips);
  const beacons = towers.near.concat(towers.mid).filter(t => t.h > 22).map((t, i) => ({ x: t.x, y: t.h + 2.2, z: t.z, ph: i * 0.37 }));
  const antennaList = beacons;
  const antennas = new THREE.InstancedMesh(boxGeo, toon(0x2a2438), antennaList.length);
  antennaList.forEach((b, i) => { dummy.position.set(b.x, b.y - 1.1, b.z); dummy.scale.set(0.18, 2.2, 0.18); dummy.updateMatrix(); antennas.setMatrixAt(i, dummy.matrix); });
  antennas.frustumCulled = false; root.add(antennas); disposables.push(antennas);

  // Holo billboards on the flanking towers: DREAM / NIGHTMARE.
  const holoTex = canvasTex(512, 512, (g, w, h) => {
    const half = (y0, word, c1, c2) => {
      g.save(); g.translate(0, y0);
      g.strokeStyle = c1; g.lineWidth = 8; g.shadowColor = c1; g.shadowBlur = 16; g.strokeRect(12, 12, w - 24, h / 2 - 24);
      g.font = '900 96px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = c2; g.fillText(word, w / 2, h / 4 + 4);
      g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = 0; y < h / 2; y += 6) g.fillRect(0, y, w, 3);
      g.restore();
    };
    g.clearRect(0, 0, w, h);
    half(0, 'DREAM', '#22e8ff', '#c8faff');
    g.font = '900 72px "Arial Black", Impact, sans-serif';
    half(h / 2, 'NIGHTMARE', '#ff2a3a', '#ffd0d0');
  });
  const holos = [];
  for (const [x, y, z, ry] of [[-25, 26, -29.8, 0.12]]) {
    for (const half of [0, 1]) {
      const geo = keep(new THREE.PlaneGeometry(11, 5.5));
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 0.5 + (half ? 0 : 0.5));
      const mat = additive({ map: holoTex, side: THREE.DoubleSide, fog: false });
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; root.add(m);
      holos.push({ m, mat, half, x });
    }
  }

  // ── Ground plaza ────────────────────────────────────────────────
  const groundMat = keep(new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uBeat: { value: 0 }, uMood: { value: 0 }, uFlash: { value: 0 }, uSoft: { value: 0 }, uPower: { value: 1 }, uLight: { value: 0 },
      uSpot: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
      uSpotC: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color()] },
      uRing: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
      uHeart: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    }]),
    vertexShader: GROUND_VS, fragmentShader: GROUND_FS, fog: true,
  }));
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(520, 260)), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -100); root.add(ground);

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xb8a8ff, 0x3a0a3a, 0.6);
  const moonLight = new THREE.DirectionalLight(0xffd0f0, 1.5); moonLight.position.set(30, 40, 20);
  const rimL = new THREE.PointLight(MAGENTA, 260, 40, 1.4);
  const rimR = new THREE.PointLight(CYAN, 260, 40, 1.4);
  const flashL = new THREE.PointLight(0xffc0ff, 0, 34, 1.3);
  root.add(hemi, moonLight, moonLight.target, rimL, rimR, flashL);

  // ── Giant robots ────────────────────────────────────────────────
  const bodyMat = toon(0x48426e), darkMat = toon(0x24222e), trimMat = basic(MAGENTA), farBody = toon(0x2e2848);
  const THIGH = 3.5, FOOT = 0.7;
  const robots = [];
  const makeRobot = (opts) => {
    const R = new THREE.Group();
    const spinG = new THREE.Group(); R.add(spinG);
    const body = opts.body || bodyMat;
    const eyeMat = basic(MAGENTA, { fog: false }), coreMat = basic(MAGENTA, { fog: false });
    const box = (parent, w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(boxGeo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; };
    const pelvis = new THREE.Group(); spinG.add(pelvis);
    box(pelvis, 3.8, 1.4, 2.2, 0, 0, 0, darkMat);
    const legs = [];
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(sx * 1.3, -0.3, 0); pelvis.add(hip);
      box(hip, 1.5, THIGH, 1.5, 0, -THIGH / 2, 0, body);
      const knee = new THREE.Group(); knee.position.y = -THIGH; hip.add(knee);
      box(knee, 1.7, 0.45, 1.8, 0, 0, 0.05, trimMat);
      box(knee, 1.4, THIGH, 1.6, 0, -THIGH / 2, 0, body);
      const ankle = new THREE.Group(); ankle.position.y = -THIGH; knee.add(ankle);
      box(ankle, 1.9, FOOT, 2.9, 0, -FOOT / 2, 0.35, darkMat);
      legs.push({ hip, knee, ankle, sx });
    }
    const waist = new THREE.Group(); waist.position.y = 0.7; pelvis.add(waist);
    const torso = new THREE.Group(); waist.add(torso);
    box(torso, 5.2, 5.6, 3.0, 0, 3.0, 0, body);
    box(torso, 4.7, 0.18, 0.1, 0, 1.6, 1.52, trimMat);
    box(torso, 4.7, 0.18, 0.1, 0, 4.6, 1.52, trimMat);
    box(torso, 0.5, 5.4, 3.05, -2.45, 3.0, 0, darkMat);
    box(torso, 0.5, 5.4, 3.05, 2.45, 3.0, 0, darkMat);
    const core = box(torso, 1.5, 1.5, 0.2, 0, 3.1, 1.56, coreMat);
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(sx * 3.25, 5.1, 0); sh.rotation.order = 'ZYX'; torso.add(sh);
      box(sh, 1.7, 1.7, 1.8, 0, 0, 0, darkMat);
      box(sh, 1.1, 3.0, 1.1, 0, -1.6, 0, body);
      const el = new THREE.Group(); el.position.y = -3.1; sh.add(el);
      box(el, 1.25, 0.45, 1.25, 0, 0, 0, trimMat);
      box(el, 1.0, 2.8, 1.0, 0, -1.5, 0, body);
      box(el, 1.25, 1.0, 1.25, 0, -3.3, 0, darkMat);
      arms.push({ sh, el, sx });
    }
    const neck = new THREE.Group(); neck.position.y = 5.9; torso.add(neck);
    box(neck, 1.1, 0.7, 1.1, 0, 0.35, 0, darkMat);
    const head = new THREE.Group(); head.position.y = 0.7; neck.add(head);
    box(head, 2.9, 2.3, 2.5, 0, 1.15, 0, body);
    box(head, 2.95, 0.75, 0.12, 0, 1.35, 1.26, darkMat);
    box(head, 0.62, 0.32, 0.08, -0.62, 1.37, 1.33, eyeMat);
    box(head, 0.62, 0.32, 0.08, 0.62, 1.37, 1.33, eyeMat);
    for (let k = -2; k <= 2; k++) box(head, 0.14, 0.32, 0.08, k * 0.3, 0.45, 1.27, darkMat);
    box(head, 0.16, 1.3, 0.16, 0, 2.95, 0, darkMat);
    box(head, 0.42, 0.42, 0.42, 0, 3.7, 0, trimMat);
    R.scale.setScalar(opts.scale);
    root.add(R);
    const rb = {
      R, spinG, pelvis, waist, torso, head, neck, legs, arms, core, eyeMat, coreMat,
      side: opts.side, phase: opts.phase || 0, scale: opts.scale, far: !!opts.far,
      look: { x: 0, v: 0 }, twist: { x: 0, v: 0 }, dip: { x: 0, v: 0 }, imp: { x: 0, v: 0 },
      stomp: -1, stompLeg: 0, stompHit: false, headSpin: -1, spin: -1, wave: 0,
      eyeW: new THREE.Vector3(), coreW: new THREE.Vector3(), tipW: new THREE.Vector3(), footW: new THREE.Vector3(),
      x: 0, z: 0, baseYaw: 0, peek: 0,
    };
    robots.push(rb);
    return rb;
  };
  const robL = makeRobot({ side: -1, scale: 0.86, phase: 0 });
  const robR = makeRobot({ side: 1, scale: 0.82, phase: 4 });
  const robFar = makeRobot({ side: 1, scale: 0.5, phase: 2, far: true, body: farBody });
  const giants = [robL, robR];

  // Robot dance: the robot — rigid ticks between poses on every beat.
  //            abduct  twist  flex  elbow
  const P = {
    D90: [0.12, 0, 0, 1.55], GOAL: [1.5, 1.57, 0, 1.6], FWD: [0, 0, 1.5, 0.15], FWDB: [0, 0, 1.4, 1.35],
    DIAG: [2.3, 0, 0, 0.1], DOWN: [0.15, 0, 0.1, 0.25], UP: [2.95, 0, 0, 0.15], LOW: [0.85, 0, 0.2, 0.35],
    ROOF: [2.3, 1.57, 0, 1.1], PUNCH: [2.75, 0, 0.25, 0.3], V: [2.45, 0, 0, 0.05], SLUMP: [0.05, 0, 0.35, 0.15],
  };
  const ROUTINE = [
    ['D90', 'D90'], ['GOAL', 'D90'], ['GOAL', 'GOAL'], ['FWD', 'GOAL'], ['FWD', 'FWD'], ['FWDB', 'FWD'], ['DIAG', 'LOW'], ['UP', 'UP'],
    ['GOAL', 'LOW'], ['LOW', 'GOAL'], ['GOAL', 'GOAL'], ['D90', 'D90'], ['FWDB', 'FWDB'], ['DIAG', 'DIAG'], ['ROOF', 'ROOF'], ['ROOF', 'ROOF'],
  ];
  const TORSO_TICK = [0, 0.16, -0.16, 0.22, 0, -0.22, 0.14, 0, 0.18, -0.18, 0, 0.12, 0, -0.14, 0.1, -0.1];
  const A0 = [0, 0, 0, 0], A1 = [0, 0, 0, 0];
  const poseOf = (beat, k, side, armTmp) => {           // k: 0 = left arm, 1 = right arm
    const i = Math.floor(beat), f = beat - i;
    const n = ROUTINE.length, cur = ROUTINE[((i % n) + n) % n], prev = ROUTINE[(((i - 1) % n) + n) % n];
    const kk = side > 0 ? 1 - k : k;            // mirror the routine for the right-hand robot
    const a = P[prev[kk]], b = P[cur[kk]], e = smooth(f / 0.24);
    for (let j = 0; j < 4; j++) armTmp[j] = a[j] + (b[j] - a[j]) * e;
    return armTmp;
  };
  const setArm = (arm, p) => { arm.sh.rotation.set(-p[2], arm.sx * p[1], arm.sx * p[0]); arm.el.rotation.x = -p[3]; };
  const legIK = (leg, bend, lift) => {          // bend: knee angle (feet planted), lift: raise this foot
    const a = bend + lift;
    leg.hip.rotation.x = -a; leg.knee.rotation.x = 2 * a; leg.ankle.rotation.x = -a;
    return 2 * THIGH * (Math.cos(a));
  };
  const springStep = (s, target, dt, hz, damp) => {
    const w = 2 * Math.PI * hz, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (-w * w * (s.x - target) - 2 * damp * w * s.v) * h; s.x += s.v * h; }
    if (!Number.isFinite(s.x)) { s.x = 0; s.v = 0; }
    return s.x;
  };

  // ── Helicopters ─────────────────────────────────────────────────
  const heliMat = toon(0x2c2a3c), rotorMat = additive({ color: 0x6a6a88, opacity: 0.5, side: THREE.DoubleSide });
  const coneGeo = keep(new THREE.ConeGeometry(1, 1, 18, 1, true).translate(0, -0.5, 0));
  const capGeo = keep(new THREE.CapsuleGeometry(0.75, 1.6, 3, 10));
  const helis = [];
  [[-0.05, 17, -24, 1.0, 1], [0.4, 21, -30, 0.85, 1], [1.1, 15, -20, 1.1, -1]].forEach(([u, y, z, s, dir], i) => {
    const g = new THREE.Group();
    const bodyM = new THREE.Mesh(capGeo, heliMat); bodyM.rotation.z = Math.PI / 2; g.add(bodyM);
    const tail = new THREE.Mesh(boxGeo, heliMat); tail.scale.set(3.2, 0.3, 0.3); tail.position.x = -2.6; g.add(tail);
    const fin = new THREE.Mesh(boxGeo, heliMat); fin.scale.set(0.5, 1.0, 0.1); fin.position.set(-4.1, 0.4, 0); g.add(fin);
    const skid = new THREE.Mesh(boxGeo, heliMat); skid.scale.set(2.6, 0.1, 0.1); skid.position.set(0, -1.0, 0.5); g.add(skid);
    const skid2 = skid.clone(); skid2.position.z = -0.5; g.add(skid2);
    const rotor = new THREE.Mesh(boxGeo, rotorMat); rotor.scale.set(7, 0.04, 0.3); rotor.position.y = 1.0; g.add(rotor);
    const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2; g.add(rotor2);
    const trot = new THREE.Mesh(boxGeo, rotorMat); trot.scale.set(1.4, 0.2, 0.05); trot.position.set(-4.2, 0.5, 0.15); g.add(trot);
    g.scale.setScalar(s); root.add(g);
    const sm = additive({ color: 0xfff2d8, opacity: 0.07, side: THREE.DoubleSide, fog: false });
    const cone = new THREE.Mesh(coneGeo, sm); root.add(cone);
    helis.push({ g, rotor, rotor2, trot, cone, sm, u, y, z, s, dir, speed: [0.011, 0.008, 0.013][i], ph: i * 2.1, dive: 0, bank: { x: 0, v: 0 }, aim: new THREE.Vector3(0, 0, -8), pos: new THREE.Vector3(), rot: 0 });
  });

  // ── Instanced glow sprites (camera-facing) ──────────────────────
  const GLOWS = low ? 170 : 240;
  const glowMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), additive({ map: glowTex, fog: false }), GLOWS);
  glowMesh.frustumCulled = false; glowMesh.renderOrder = 6; glowMesh.setColorAt(0, col.set(0)); root.add(glowMesh); disposables.push(glowMesh);
  let nGlow = 0;
  const glow = (x, y, z, sx, sy, c, k) => {
    if (nGlow >= GLOWS || k <= 0.003) return;
    dummy.position.set(x, y, z); dummy.quaternion.copy(camera.quaternion); dummy.scale.set(sx, sy, 1); dummy.updateMatrix();
    glowMesh.setMatrixAt(nGlow, dummy.matrix); glowMesh.setColorAt(nGlow++, col.set(c).multiplyScalar(k));
  };
  const glowC = (x, y, z, sx, sy, colr, k) => {     // colr: THREE.Color
    if (nGlow >= GLOWS || k <= 0.003) return;
    dummy.position.set(x, y, z); dummy.quaternion.copy(camera.quaternion); dummy.scale.set(sx, sy, 1); dummy.updateMatrix();
    glowMesh.setMatrixAt(nGlow, dummy.matrix); glowMesh.setColorAt(nGlow++, col.copy(colr).multiplyScalar(k));
  };

  // ── Lasers (eye beams) ──────────────────────────────────────────
  const BEAMS = 20;
  const beamGeo = keep(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0));
  const beamMesh = new THREE.InstancedMesh(beamGeo, additive({ fog: false }), BEAMS * 2);
  beamMesh.frustumCulled = false; beamMesh.renderOrder = 7; beamMesh.count = 0; beamMesh.setColorAt(0, col.set(0)); root.add(beamMesh); disposables.push(beamMesh);
  const lasers = Array.from({ length: BEAMS }, () => ({ life: 0, rb: null, eye: 0, tx: 0, ty: 0, tz: 0, hue: 0, sweep: 0 }));
  let laserCur = 0;
  const fireLaser = (rb, eye, tx, ty, tz, hue, sweep) => {
    const L = lasers[laserCur = (laserCur + 1) % BEAMS];
    L.life = 1; L.rb = rb; L.eye = eye; L.tx = tx; L.ty = ty; L.tz = tz; L.hue = hue; L.sweep = sweep || 0;
  };

  // ── Sky blast rings (camera-facing) ─────────────────────────────
  const RINGS = 8;
  const ringMesh = new THREE.InstancedMesh(keep(new THREE.RingGeometry(0.86, 1, 48)), additive({ fog: false, side: THREE.DoubleSide }), RINGS);
  ringMesh.frustumCulled = false; ringMesh.renderOrder = 5; ringMesh.count = 0; ringMesh.setColorAt(0, col.set(0)); root.add(ringMesh); disposables.push(ringMesh);
  const blasts = Array.from({ length: RINGS }, () => ({ life: 0, x: 0, y: 0, z: 0, r: 0, maxR: 0, hue: 0 }));
  let blastCur = 0;
  const blast = (x, y, z, maxR, hue, delay = 0) => { const b = blasts[blastCur = (blastCur + 1) % RINGS]; b.life = 1 + delay; b.x = x; b.y = y; b.z = z; b.r = 0.5; b.maxR = maxR; b.hue = hue; };
  // Ground shock rings (in the plaza shader).
  const shocks = Array.from({ length: 4 }, () => ({ life: 0, x: 0, z: 0, r: 0 }));
  let shockCur = 0;
  const shock = (x, z) => { const s = shocks[shockCur = (shockCur + 1) % 4]; s.life = 1; s.x = x; s.z = z; s.r = 0.5; };

  // ── Lightning bolts (ribbons) ───────────────────────────────────
  const BOLT_N = 16;
  const bolts = [];
  for (let b = 0; b < 2; b++) {
    const pos = new Float32Array(BOLT_N * 2 * 3), idx = [];
    for (let i = 0; i < BOLT_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    const geo = keep(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    const mat = additive({ color: 0xffd8ff, opacity: 0, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 8; root.add(m);
    bolts.push({ m, mat, pos, geo, life: 0 });
  }
  const strike = (b, x, z) => {
    const B = bolts[b]; let px = x, y = 70;
    const yEnd = 2 + rnd() * 18, w = 0.45;
    for (let i = 0; i < BOLT_N; i++) {
      const t = i / (BOLT_N - 1);
      const yy = lerp(y, yEnd, t);
      if (i) px += (rnd() - 0.5) * 6;
      const k = i * 6, ww = w * (1.2 - t * 0.7);
      B.pos[k] = px - ww; B.pos[k + 1] = yy; B.pos[k + 2] = z;
      B.pos[k + 3] = px + ww; B.pos[k + 4] = yy; B.pos[k + 5] = z;
    }
    B.geo.attributes.position.needsUpdate = true; B.life = 1;
  };

  // ── Drones + skyway traffic ─────────────────────────────────────
  const DRONES = low ? 7 : 11;
  const droneMesh = new THREE.InstancedMesh(boxGeo, toon(0x1c1a28), DRONES);
  droneMesh.frustumCulled = false; root.add(droneMesh); disposables.push(droneMesh);
  const drones = Array.from({ length: DRONES }, (_, i) => ({ x: (rnd() - 0.5) * 120, y: 11 + rnd() * 16, z: -14 - rnd() * 30, vx: (rnd() - 0.5) * 6 || 1, ph: rnd() * 6, hue: i % 2 ? MAGENTA : CYAN, jink: 0 }));
  const SKY_CARS = low ? 14 : 24;
  const skyCars = Array.from({ length: SKY_CARS }, (_, i) => ({ lane: i % 3, x: (rnd() - 0.5) * 260, v: (i % 3 === 1 ? -1 : 1) * (14 + rnd() * 10) }));
  const LANES = [[14, -60], [19, -72], [25, -88]];

  // ── Crowd at the front ──────────────────────────────────────────
  const CN = low ? 22 : 36;
  const crowdMat = basic(0x0a0614);
  const cBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.32, 0.8, 2, 6)), crowdMat, CN);
  const cHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.26, 8, 6)), crowdMat, CN);
  const cArm = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.08, 0.62, 2, 4).translate(0, 0.38, 0)), crowdMat, CN * 2);
  const crowdG = new THREE.Group(); root.add(crowdG);
  for (const m of [cBody, cHead, cArm]) { m.frustumCulled = false; crowdG.add(m); disposables.push(m); }
  const crowd = Array.from({ length: CN }, (_, i) => ({
    x: -9 + 18 * (i + 0.2 + rnd() * 0.6) / CN, z: 6.2 + rnd() * 2.4, s: 0.7 + rnd() * 0.3, ph: rnd() * 6.28, hue: rnd() < 0.5 ? 0.8 : 0.53, hype: 0.6 + rnd() * 0.6,
  }));

  // Neon dust drifting up.
  const DN = low ? 90 : 170;
  const dPos = new Float32Array(DN * 3), dCol = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) {
    dPos[i * 3] = (rnd() - 0.5) * 60; dPos[i * 3 + 1] = rnd() * 30; dPos[i * 3 + 2] = -30 + rnd() * 36;
    col.set(NEON[i % 3]); dCol[i * 3] = col.r; dCol[i * 3 + 1] = col.g; dCol[i * 3 + 2] = col.b;
  }
  const dGeo = keep(new THREE.BufferGeometry());
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3)); dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dMat = keep(new THREE.PointsMaterial({ size: 0.3, vertexColors: true, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false; root.add(dust);

  // Full-screen flash / mood wash (a quad on the camera).
  const washMat = additive({ color: 0x000000, depthTest: false, fog: false });
  const wash = new THREE.Mesh(keep(new THREE.PlaneGeometry(4, 4)), washMat);
  wash.position.z = -0.5; wash.renderOrder = 20; camera.add(wash);

  // ── State ───────────────────────────────────────────────────────
  const st = {
    t: 0, mood: 0.25, flash: 0, light: 0, shake: 0, cheer: 0, combo: 0, punch: 0, punchMax: 0, vpose: 0, blaze: 0, chase: 0,
    power: 0, powerT: 1, over: false, wave: -999, waveK: 0, soft: 0, fov: 0, level: 1, danger: 0, dangerHi: false,
    camX: { x: 0, v: 0 }, roll: { x: 0, v: 0 }, dip: { x: 0, v: 0 }, follow: 0, pieceX: 0, glitch: 0, strayT: 3, peek: 0,
    sirens: 0, hueT: 0, lastDropT: -9,
  };
  const cMag = new THREE.Color(MAGENTA), cCyan = new THREE.Color(CYAN), cRed = new THREE.Color(RED), cWhite = new THREE.Color(0xffffff), tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
  const fogDream = new THREE.Color(0x1c1640), fogNight = new THREE.Color(0x3a0812), fogBase = new THREE.Color(0x2a0c3a);
  const eyeOff = [new THREE.Vector3(-0.62, 1.37, 1.4), new THREE.Vector3(0.62, 1.37, 1.4)];
  const coreOff = new THREE.Vector3(0, 3.1, 1.7), tipOff = new THREE.Vector3(0, 3.7, 0);

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0;
    st.t += dt;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), down = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * ph), 2);
    const cheerIn = Math.max(st.cheer, info.cheer || 0);
    st.flash = Math.max(0, st.flash - dt * 2.8);
    st.light = Math.max(0, st.light - dt * 4.5);
    st.cheer = Math.max(0, st.cheer - dt * 0.45);
    st.shake = Math.max(0, st.shake - dt * 2.4);
    st.punch = Math.max(0, st.punch - dt);
    st.vpose = Math.max(0, st.vpose - dt);
    st.blaze = Math.max(0, st.blaze - dt * 0.9);
    st.chase = Math.max(0, st.chase - dt * 0.35);
    st.soft = Math.max(0, st.soft - dt * 3);
    st.fov = Math.max(0, st.fov - dt * 9);
    st.glitch = Math.max(0, st.glitch - dt * 3);
    st.peek = Math.max(0, st.peek - dt * 0.5);
    st.waveK = Math.max(0, st.waveK - dt * 0.4);
    st.wave += dt * 110;
    st.hueT += dt * (0.1 + st.combo * 0.15);
    // Power (blackout / boot).
    st.power += (st.powerT - st.power) * Math.min(1, dt * (st.powerT > st.power ? 0.7 : 0.9));
    const power = st.power;
    // Danger: the stack is high → nightmare.
    const dg = info.danger || 0;
    st.danger += (dg - st.danger) * Math.min(1, dt * 2);
    if (!st.dangerHi && dg > 0.65) { st.dangerHi = true; st.light = Math.max(st.light, 0.6); strike(1, (rnd() < 0.5 ? -1 : 1) * (30 + rnd() * 30), -60); }
    else if (st.dangerHi && dg < 0.5) st.dangerHi = false;
    st.sirens = Math.max(st.sirens - dt * 0.5, smooth((st.danger - 0.5) / 0.3));
    // Mood: dream ↔ nightmare (cheer pushes up, drops / danger pull down).
    const moodT = 0.25 + 0.6 * Math.min(1, cheerIn) - 1.3 * smooth((st.danger - 0.45) / 0.4) - (st.over ? 0.8 : 0);
    st.mood += (clamp(moodT, -1, 1) - st.mood) * Math.min(1, dt * 1.2);
    const night = Math.max(0, -st.mood), dream = Math.max(0, st.mood);
    if (st.danger > 0.8 && (st.strayT -= dt) <= 0) { st.strayT = 2 + rnd() * 3; strike(rnd() < 0.5 ? 0 : 1, (rnd() < 0.5 ? -1 : 1) * (25 + rnd() * 40), -50 - rnd() * 30); st.light = Math.max(st.light, 0.5); }
    st.pieceX += ((info.pieceX || 0) - st.pieceX) * Math.min(1, dt * 3);

    // ── Layout (keep the giants in the visible strips either side of the board) ──
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    const baseFov = portrait ? 66 : 50;
    const tanH = Math.tan(baseFov * Math.PI / 360);
    const covered = Math.min(0.86, 0.56 * 1.6 / aspect);
    const camZ = 15, gz = portrait ? -5 : -8;
    const halfW = (camZ - gz) * tanH * aspect;
    const gx = portrait ? Math.max(3.2, halfW * 0.82) : clamp(((covered + 1) / 2) * halfW, 7, 22);
    robL.x = -gx; robL.z = gz; robR.x = gx; robR.z = gz - 0.6;
    robL.baseYaw = 0.32; robR.baseYaw = -0.32;
    crowdG.position.z = portrait ? 0.8 : 0;
    robFar.x = 36 + 4 * st.danger; robFar.z = -62 + 14 * st.danger; robFar.baseYaw = -0.5;

    // ── Robots ──
    const eyeBase = tmpC.copy(cMag).lerp(cRed, night).lerp(cWhite, smooth(cheerIn * 1.6) * 0.85);
    nGlow = 0;
    let heartI = 0;
    for (const rb of robots) {
      const b = beat + rb.phase;
      const isFar = rb.far;
      // Reaction springs.
      const lookT = clamp((st.pieceX * 6 - rb.x) / 22, -0.6, 0.6) - rb.baseYaw * 0.5;
      springStep(rb.look, lookT, dt, 2.4, 0.45);
      springStep(rb.twist, 0, dt, 1.6, 0.28);
      springStep(rb.dip, 0, dt, 2.8, 0.4);
      springStep(rb.imp, 0, dt, 3.4, 0.35);
      // Stomp (hard drop): lift one foot, slam it down.
      let lift = 0;
      if (rb.stomp >= 0) {
        rb.stomp += dt;
        const s = rb.stomp;
        lift = s < 0.34 ? smooth(s / 0.34) * 0.75 : s < 0.44 ? 0.75 * (1 - Math.pow((s - 0.34) / 0.1, 2)) : 0;
        if (s >= 0.44 && !rb.stompHit) {
          rb.stompHit = true; rb.imp.v -= 2.2;
          rb.legs[rb.stompLeg].ankle.getWorldPosition(rb.footW);
          shock(rb.footW.x, rb.footW.z);
          st.shake = Math.max(st.shake, 0.5 + 0.5 * rb.stompPow); st.flash = Math.max(st.flash, 0.3);
          flashL.position.set(rb.footW.x, 2, rb.footW.z + 2); flashL.intensity = 260;
        }
        if (s > 0.9) rb.stomp = -1;
      }
      // Base dance.
      const arms0 = poseOf(b, 0, rb.side, A0), arms1 = poseOf(b, 1, rb.side, A1);
      const punchK = smooth(st.punch * 2.2) * (isFar ? 0.6 : 1), vK = smooth(st.vpose * 1.6);
      const slump = 1 - power;
      const blendArm = (p, k) => {
        const target = vK > 0 ? P.V : P.PUNCH;
        const pump = 0.25 * Math.sin(Math.PI * 2 * (b + (k ? 0.5 : 0))) * punchK;
        for (let j = 0; j < 4; j++) p[j] = lerp(p[j], target[j] + (j === 0 ? pump : 0), Math.max(punchK, vK));
        // the "wave" (rotate): ripple through the elbows
        if (rb.wave > 0) p[3] += Math.sin(st.t * 18 + k * 1.6) * 0.6 * rb.wave;
        for (let j = 0; j < 4; j++) p[j] = lerp(p[j], P.SLUMP[j], slump);
        return p;
      };
      rb.wave = Math.max(0, rb.wave - dt * 1.3);
      setArm(rb.arms[0], blendArm(arms0, 0));
      setArm(rb.arms[1], blendArm(arms1, 1));
      // Legs: bounce on the beat (knees), stomp lift on one side.
      const bend = (0.1 + 0.2 * down) * (0.4 + 0.6 * power) + Math.max(0, -rb.dip.x) + Math.max(0, -rb.imp.x) * 0.5 + slump * 0.25;
      let hipH = 0;
      rb.legs.forEach((leg, i) => {
        const hh = legIK(leg, bend, i === rb.stompLeg ? lift : 0);
        if (i !== rb.stompLeg || lift === 0) hipH = Math.max(hipH, hh);
      });
      rb.pelvis.position.y = hipH + FOOT + 0.3;
      // Torso / head ticks.
      const i8 = Math.floor(b), f8 = b - i8, n = TORSO_TICK.length;
      const ty = lerp(TORSO_TICK[(((i8 - 1) % n) + n) % n], TORSO_TICK[((i8 % n) + n) % n], smooth(f8 / 0.24));
      rb.waist.rotation.set(0.35 * slump + 0.05 * down, ty + rb.twist.x, 0.04 * Math.sin(Math.PI * b));
      let hy = -ty * 1.3 + rb.look.x;
      if (rb.headSpin >= 0) { rb.headSpin += dt; const u = smooth(rb.headSpin / 0.9); hy += u * Math.PI * 2; if (rb.headSpin > 0.9) rb.headSpin = -1; }
      rb.head.rotation.set(0.08 * down + 0.5 * slump - 0.25 * punchK, hy, 0.06 * Math.sin(Math.PI * b * 0.5));
      // Root: placement, whole-body spin (level up), far robot peek.
      let yaw = rb.baseYaw;
      if (rb.spin >= 0) { rb.spin += dt; const u = smooth(rb.spin / 1.3); yaw += u * Math.PI * 2 * (rb.side > 0 ? -1 : 1); if (rb.spin > 1.3) rb.spin = -1; }
      rb.R.position.set(rb.x, isFar ? -2 + 4.5 * smooth(st.peek * 1.5) + 2.5 * st.danger : 0, rb.z);
      rb.spinG.rotation.y = yaw;
      // Eyes / core / trims.
      const stompRed = rb.stomp >= 0 ? 1 : 0;
      const eyeK = power * (0.75 + 0.25 * onBeat) * (power < 0.98 && Math.sin(st.t * 40 + rb.phase) > 0.3 ? 0.3 : 1);
      rb.eyeMat.color.copy(eyeBase).lerp(cRed, stompRed).multiplyScalar(eyeK * (isFar ? 0.7 : 1.4));
      const hot = smooth(cheerIn * 1.4);
      rb.coreMat.color.copy(cMag).lerp(cWhite, hot).multiplyScalar(power * (0.6 + 0.5 * onBeat + 0.6 * hot));
      // Glows: eyes, core, antenna tip.
      rb.R.updateMatrixWorld(true);
      const sc = rb.scale;
      const ek = (0.55 + 1.1 * hot + 0.9 * stompRed) * eyeK * (isFar ? 0.5 : 1);
      tmpC2.copy(eyeBase).lerp(cRed, stompRed);
      for (let e = 0; e < 2; e++) {
        rb.eyeW.copy(eyeOff[e]); rb.head.localToWorld(rb.eyeW);
        glowC(rb.eyeW.x, rb.eyeW.y, rb.eyeW.z, 2.6 * sc * (1 + hot), 1.6 * sc * (1 + hot), tmpC2, ek);
      }
      rb.coreW.copy(coreOff); rb.torso.localToWorld(rb.coreW);
      tmpC2.copy(cMag).lerp(cWhite, hot);
      glowC(rb.coreW.x, rb.coreW.y, rb.coreW.z, 5 * sc * (1 + 0.6 * hot), 5 * sc * (1 + 0.6 * hot), tmpC2, power * (0.35 + 0.3 * onBeat + 0.6 * hot) * (isFar ? 0.5 : 1));
      if (!isFar && heartI < 2) groundMat.uniforms.uHeart.value[heartI++].set(rb.coreW.x, rb.coreW.z + 2, 0, power * (0.08 + 0.06 * onBeat + 0.25 * hot));
      rb.tipW.copy(tipOff); rb.head.localToWorld(rb.tipW);
      if (Math.floor(b * 1.6) % 2 === 0 || st.combo > 1) glow(rb.tipW.x, rb.tipW.y, rb.tipW.z, 2 * sc, 2 * sc, CYAN, power * 0.9);
    }
    trimMat.color.copy(cMag).lerp(cRed, night * 0.8).multiplyScalar((0.55 + 0.45 * onBeat) * (0.25 + 0.75 * power));
    flashL.intensity *= Math.exp(-dt * 7);

    // ── Lasers ──
    let nb = 0;
    for (const L of lasers) {
      if (L.life <= 0) continue;
      L.life -= dt * 1.15;
      if (L.life <= 0) continue;
      const rb = L.rb;
      V.copy(eyeOff[L.eye]); rb.head.localToWorld(V);
      V2.set(L.tx + Math.sin(st.t * 3 + L.hue) * L.sweep, L.ty, L.tz).sub(V);
      const len = V2.length(); V2.divideScalar(len);
      Q.setFromUnitVectors(UP, V2);
      const k = Math.min(1, L.life * 2.5) * (0.85 + 0.15 * Math.sin(st.t * 60 + L.hue));
      tmpC2.setHSL((L.hue / 360 + (st.combo > 1 ? st.hueT : 0)) % 1, 0.95, 0.6);
      for (const [w, cc] of [[0.55, tmpC2], [0.16, cWhite]]) {
        if (nb >= BEAMS * 2) break;
        dummy.position.copy(V); dummy.quaternion.copy(Q); dummy.scale.set(w * rb.scale, len, w * rb.scale); dummy.updateMatrix();
        beamMesh.setMatrixAt(nb, dummy.matrix); beamMesh.setColorAt(nb++, col.copy(cc).multiplyScalar(k * (w > 0.3 ? 0.8 : 1)));
      }
      glowC(V.x, V.y, V.z, 4 * rb.scale, 4 * rb.scale, tmpC2, k);
    }
    beamMesh.count = nb; beamMesh.instanceMatrix.needsUpdate = true; if (beamMesh.instanceColor) beamMesh.instanceColor.needsUpdate = true;

    // ── Sky blasts + ground shocks ──
    let nr = 0;
    for (const B of blasts) {
      if (B.life <= 0) continue;
      B.life -= dt * 0.9;
      if (B.life > 1 || B.life <= 0) continue;
      B.r += (B.maxR - B.r) * Math.min(1, dt * 4.5);
      dummy.position.set(B.x, B.y, B.z); dummy.quaternion.copy(camera.quaternion); dummy.scale.setScalar(B.r); dummy.updateMatrix();
      ringMesh.setMatrixAt(nr, dummy.matrix); ringMesh.setColorAt(nr++, col.setHSL(B.hue / 360, 0.9, 0.65).multiplyScalar(B.life * 1.2));
      glow(B.x, B.y, B.z, B.r * 1.6, B.r * 1.6, 0x8a3aff, B.life * B.life * 0.35);
    }
    ringMesh.count = nr; ringMesh.instanceMatrix.needsUpdate = true; if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;
    shocks.forEach((s, i) => {
      if (s.life > 0) { s.life -= dt * 1.1; s.r += (30 - s.r) * Math.min(1, dt * 2.6); }
      groundMat.uniforms.uRing.value[i].set(s.x, s.z, s.r, Math.max(0, s.life) * 1.2);
    });

    // ── Lightning ──
    for (const B of bolts) {
      if (B.life > 0) B.life -= dt * 3.2;
      B.mat.opacity = B.life > 0 ? Math.min(1, B.life * 1.5) * (Math.sin(st.t * 70) > -0.3 ? 1 : 0.3) : 0;
      B.m.visible = B.life > 0;
    }

    // ── Helicopters + searchlights ──
    const sirenRed = Math.sin(t * 9) > 0;
    helis.forEach((h, i) => {
      h.u += h.speed * h.dir * dt * (1 + 0.4 * (info.energy ?? 1));
      if (h.u > 1.15) h.u -= 1.3; if (h.u < -0.15) h.u += 1.3;
      h.dive = Math.max(0, h.dive - dt * 0.35);
      springStep(h.bank, 0, dt, 1.2, 0.3);
      const x = lerp(-70, 70, h.u), y = h.y - 6 * smooth(h.dive) + Math.sin(t * 0.8 + h.ph) * 0.8, z = h.z;
      h.pos.set(x, y, z);
      h.g.position.copy(h.pos);
      h.g.rotation.set(0.04, h.dir > 0 ? 0 : Math.PI, -0.12 * h.dir + h.bank.x + 0.1 * Math.sin(t * 0.6 + h.ph));
      h.rot += dt * (28 + 16 * (info.energy ?? 1));
      h.rotor.rotation.y = h.rot; h.rotor2.rotation.y = h.rot + Math.PI / 2; h.trot.rotation.z = h.rot * 3;
      // Aim: sweep the street; swing onto the robots on clears; jink with moves.
      const onRobots = smooth(st.cheer * 1.3);
      const sweepX = x * 0.4 + Math.sin(t * 0.5 + h.ph) * 10 + st.pieceX * 6;
      const tgt = i === 1 ? robR : robL;
      const txw = lerp(sweepX, i === 2 ? robR.x : tgt.x, onRobots), tzw = lerp(-4 + Math.cos(t * 0.4 + h.ph) * 6, tgt.z + 2, onRobots);
      h.aim.x += (txw - h.aim.x) * Math.min(1, dt * 3); h.aim.z += (tzw - h.aim.z) * Math.min(1, dt * 3); h.aim.y = 0;
      V.copy(h.aim).sub(h.pos); const len = V.length(); V.divideScalar(len);
      h.cone.position.copy(h.pos); h.cone.position.y -= 0.8 * h.s;
      h.cone.quaternion.setFromUnitVectors(DOWN, V);
      const rad = (1.8 + 0.7 * Math.sin(t * 1.3 + h.ph) + 1.1 * cheerIn);
      h.cone.scale.set(rad, len, rad);
      const lk = power * (0.045 + 0.02 * (info.energy ?? 1) + 0.035 * cheerIn);
      if (st.sirens > 0.05) h.sm.color.set(sirenRed === (i % 2 === 0) ? 0xff2a2a : 0x2a5aff).lerp(cWhite, 1 - st.sirens);
      else h.sm.color.set(i === 2 ? 0xa8e8ff : 0xfff2d8);
      h.sm.opacity = lk;
      const sp = groundMat.uniforms.uSpot.value[i], sc2 = groundMat.uniforms.uSpotC.value[i];
      sp.set(h.aim.x, h.aim.z, rad * 1.1, power * (0.35 + 0.4 * cheerIn));
      sc2.copy(h.sm.color);
      // lights: searchlight bulb, nav blinkers, siren
      glowC(h.cone.position.x, h.cone.position.y, h.cone.position.z, 3.2 * h.s, 3.2 * h.s, h.sm.color, power * (0.8 + cheerIn * 0.4));
      const blink = Math.sin(t * 6 + h.ph) > 0.2 ? 1 : 0;
      glow(x - 4.4 * h.s * h.dir, y + 0.5 * h.s, z, 1.1, 1.1, 0xff3040, blink * 0.9);
      glow(x + 1.6 * h.s * h.dir, y - 0.3 * h.s, z + 0.6, 1.0, 1.0, 0x40ff80, (1 - blink) * 0.8);
      if (st.sirens > 0.05) glow(x, y + 1.0 * h.s, z, 3, 3, sirenRed === (i % 2 === 0) ? 0xff2020 : 0x2050ff, st.sirens);
    });

    // ── Drones ──
    drones.forEach((d, i) => {
      d.jink *= Math.exp(-dt * 3);
      d.x += (d.vx * (1 + 0.8 * (info.energy ?? 1)) + d.jink) * dt;
      if (d.x > 70) d.x = -70; if (d.x < -70) d.x = 70;
      const y = d.y + Math.sin(t * 1.3 + d.ph) * 0.6;
      dummy.position.set(d.x, y, d.z); dummy.quaternion.identity(); dummy.rotation.set(0, 0, d.jink * 0.05); dummy.scale.set(1.4, 0.4, 0.8); dummy.updateMatrix();
      droneMesh.setMatrixAt(i, dummy.matrix);
      const bl = Math.sin(t * 8 + d.ph) > 0.5 ? 1 : 0.25;
      glow(d.x, y - 0.3, d.z, 1.4, 1.4, st.combo > 1 ? tmpC2.setHSL((st.hueT + i * 0.1) % 1, 1, 0.6).getHex() : d.hue, (bl + cheerIn * 0.3) * power);
    });
    droneMesh.instanceMatrix.needsUpdate = true;
    // Skyway traffic: head + tail lights streaming between the towers.
    for (const c of skyCars) {
      c.x += c.v * dt * (1 + 0.5 * cheerIn);
      if (c.x > 140) c.x -= 280; if (c.x < -140) c.x += 280;
      const [ly, lz] = LANES[c.lane];
      const dir = Math.sign(c.v);
      glow(c.x + dir * 0.6, ly, lz, 2.2, 0.7, 0xfff0d8, 0.55 * power);
      glow(c.x - dir * 1.4, ly, lz, 3.4, 0.5, 0xff2040, 0.4 * power);
    }
    // Beacons on the tallest towers.
    for (const bc of beacons) if (((Math.floor(t * 1.4 + bc.ph * 3)) % 3) === 0) glow(bc.x, bc.y, bc.z, 2.2, 2.2, 0xff3355, power * 0.9);
    // Moon halo pulse (in the sky direction, far away).

    // ── Crowd + glow sticks ──
    const hype = clamp(0.3 + cheerIn + 0.3 * Math.abs(st.pieceX), 0, 1.3);
    crowd.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.ph * 0.3)) * (0.05 + 0.32 * hype * c.hype) * power;
      const lean = st.camX.x * 0.08;
      dummy.position.set(c.x, 0.7 * c.s + jump, c.z); dummy.quaternion.identity(); dummy.rotation.set(0, 0, lean); dummy.scale.setScalar(c.s); dummy.updateMatrix();
      cBody.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.95 * c.s; dummy.updateMatrix(); cHead.setMatrixAt(i, dummy.matrix);
      const up = hype > 0.7 ? 2.7 + 0.25 * Math.sin(beat * Math.PI * 2 + c.ph) : 0.5 + 0.9 * Math.max(0, Math.sin(beat * Math.PI + c.ph));
      for (const sd of [-1, 1]) {
        dummy.position.set(c.x + sd * 0.3 * c.s, 1.15 * c.s + jump, c.z); dummy.rotation.set(0, 0, -sd * (Math.PI - up)); dummy.updateMatrix();
        cArm.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
      // glow stick in the right hand
      const ang = up, hx = c.x + 0.3 * c.s + Math.sin(ang) * 0.75 * c.s, hy2 = 1.15 * c.s + jump - Math.cos(ang) * 0.75 * c.s;
      if (cheerIn > 0.15 || Math.sin(beat * Math.PI * 2 + c.ph) > 0.4) {
        if (st.combo > 1) tmpC2.setHSL((st.hueT * 2 + i * 0.07) % 1, 1, 0.6); else tmpC2.setHSL(c.hue, 0.9, 0.6);
        glowC(hx, hy2 + 0.15, c.z + 0.1 + crowdG.position.z, 0.55 + cheerIn * 0.25, 0.55 + cheerIn * 0.25, tmpC2, 0.6 + cheerIn * 0.3);
      }
    });
    cBody.instanceMatrix.needsUpdate = cHead.instanceMatrix.needsUpdate = cArm.instanceMatrix.needsUpdate = true;

    // Dust.
    for (let i = 0; i < DN; i++) { dPos[i * 3 + 1] += (0.5 + (i % 5) * 0.2) * dt * (1 + cheerIn); if (dPos[i * 3 + 1] > 30) dPos[i * 3 + 1] -= 30; }
    dGeo.attributes.position.needsUpdate = true;
    dMat.size = (0.25 + 0.12 * onBeat) * (0.4 + 0.6 * power);

    // ── City shaders / lights ──
    for (const m of towerMats) {
      const u = m.uniforms;
      u.uTime.value = t; u.uBeat.value = onBeat; u.uPower.value = power; u.uMood.value = st.mood; u.uFlash.value = st.flash + st.light;
      u.uWave.value = st.wave; u.uWaveK.value = st.waveK; u.uBlaze.value = st.blaze; u.uChase.value = Math.min(1, st.chase);
    }
    strips.material.color.setScalar((0.55 + 0.45 * onBeat + st.blaze) * power).lerp(cRed, night * 0.6);
    const gu = groundMat.uniforms;
    gu.uTime.value = t; gu.uBeat.value = onBeat; gu.uMood.value = st.mood; gu.uFlash.value = st.flash; gu.uSoft.value = st.soft; gu.uPower.value = power; gu.uLight.value = st.light;
    skyMat.uniforms.uTime.value = t; skyMat.uniforms.uPulse.value = onBeat * 0.6 + st.flash; skyMat.uniforms.uMood.value = st.mood; skyMat.uniforms.uLight.value = st.light; skyMat.uniforms.uPower.value = 0.6 + 0.4 * power;
    scene.fog.color.copy(fogBase).lerp(fogDream, dream * 0.7).lerp(fogNight, night * 0.7);
    // Holo billboards: DREAM lit when the mood is up, NIGHTMARE when it's down.
    for (const H of holos) {
      const want = H.half === 0 ? smooth(st.mood * 2 + 0.5) : smooth(-st.mood * 2 + 0.2);
      const glitch = (st.glitch > 0 && Math.sin(st.t * 50 + H.x) > 0) ? 0.2 : 1;
      H.mat.opacity = want * glitch * power * (0.75 + 0.25 * onBeat) * (Math.sin(t * 17 + H.x) > 0.96 ? 0.4 : 1);
      H.m.position.x = H.m.userData.x0 ?? (H.m.userData.x0 = H.m.position.x);
      H.m.position.x = H.m.userData.x0 + (st.glitch > 0 ? (rnd() - 0.5) * st.glitch * 1.5 : 0);
    }
    hemi.intensity = 0.6 * (0.55 + 0.45 * power) * (1 + st.light);
    hemi.color.set(0xb8a8ff).lerp(cRed, night * 0.4);
    moonLight.intensity = 1.0 * (0.4 + 0.6 * power) + st.light * 2;
    rimL.position.set(robL.x + 5, 9, robL.z + 7); rimR.position.set(robR.x - 5, 9, robR.z + 7);
    rimL.intensity = 130 * power * (0.7 + 0.5 * onBeat + cheerIn * 0.8);
    rimR.intensity = 120 * power * (0.7 + 0.5 * onBeat + cheerIn * 0.8);
    rimL.color.copy(cMag).lerp(cRed, night); rimR.color.copy(cCyan).lerp(cRed, night * 0.8);
    // Wash: flash (pink-white) + mood haze.
    const hazeA = 0.04 + Math.abs(st.mood) * 0.05;
    washMat.color.setRGB(1, 0.78, 1).multiplyScalar(st.flash * 0.2 + st.light * 0.25)
      .add(tmpC2.copy(st.mood >= 0 ? cCyan : cRed).multiplyScalar(hazeA * (st.mood >= 0 ? 0.3 : 0.4)));

    // ── Camera ──
    springStep(st.camX, 0, dt, 2.2, 0.4); springStep(st.roll, 0, dt, 2.0, 0.3); springStep(st.dip, 0, dt, 2.6, 0.45);
    st.follow += (st.pieceX * 1.2 - st.follow) * Math.min(1, dt * 2);
    const sh = st.shake * st.shake;
    const sx = (rnd() - 0.5) * sh * 0.9, sy = (rnd() - 0.5) * sh * 0.7;
    const cy = portrait ? 4.6 : 3.4;
    camera.position.set(Math.sin(t * 0.11) * 1.2 + st.follow + st.camX.x + sx, cy + Math.sin(t * 0.17) * 0.3 + st.dip.x + sy, camZ + Math.sin(t * 0.07) * 0.8);
    camera.lookAt(st.follow * 0.6 + st.camX.x * 0.4 + Math.sin(t * 0.09) * 0.8, (portrait ? 5.4 : 7.6) + st.dip.x * 0.4, -12);
    camera.rotateZ(st.roll.x + Math.sin(t * 0.13) * 0.01);
    const fov = baseFov - st.fov;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sky.position.copy(camera.position);
    moonLight.target.position.set(0, 0, -10);

    glowMesh.count = nGlow; glowMesh.instanceMatrix.needsUpdate = true; if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
  }

  const sideRobot = (col) => (col == null ? (st.pieceX < 0 ? robL : robR) : (col < 4.5 ? robL : robR));
  const doStomp = (rb, pow) => {
    if (rb.stomp >= 0 && rb.stomp < 0.44) return;
    rb.stomp = 0; rb.stompHit = false; rb.stompLeg = rb.side < 0 ? 1 : 0; rb.stompPow = pow;
  };

  function react(kind, data = {}) {
    if (kind === 'move') {
      const d = data.dir || 0;
      for (const rb of giants) rb.look.v += d * 3.2;
      robFar.look.v += d * 2;
      st.camX.v += d * 1.6;
      for (const dr of drones) dr.jink += d * 6;
      for (const h of helis) h.aim.x += d * 2.5;
    } else if (kind === 'rotate') {
      const d = data.dir || 1;
      for (const rb of giants) { rb.twist.v += d * (rb.side < 0 ? 3.5 : -3.5); rb.wave = 1; }
      for (const h of helis) h.bank.v += d * 1.2;
      st.roll.v += d * 0.25; st.glitch = 0.5;
    } else if (kind === 'soft') {
      for (const rb of giants) rb.dip.v -= 1.2;
      st.dip.v -= 0.9; st.soft = 1;
    } else if (kind === 'drop') {
      const rows = data.rows || 0, k = Math.min(1, 0.35 + rows / 16);
      doStomp(sideRobot(data.col), k);
      st.flash = Math.max(st.flash, 0.35 + 0.4 * k); st.shake = Math.max(st.shake, 0.3 + 0.6 * k);
      st.mood = Math.max(-1, st.mood - 0.25 - 0.25 * k);
      helis[0].dive = Math.min(1.4, helis[0].dive + 0.6);
      if (rows >= 6) { strike(0, (rnd() < 0.5 ? -1 : 1) * (22 + rnd() * 40), -45 - rnd() * 40); st.light = Math.max(st.light, 0.8); }
      if (rows >= 12) { strike(1, (rnd() < 0.5 ? -1 : 1) * (22 + rnd() * 40), -45 - rnd() * 40); st.light = 1; }
      st.fov = Math.max(st.fov, 2.5 * k);
      st.lastDropT = st.t;
    } else if (kind === 'hold') {
      for (const rb of robots) rb.headSpin = 0;
      st.peek = 1.4; st.glitch = 0.6;
      for (const dr of drones) dr.jink += (rnd() - 0.5) * 20;
    } else if (kind === 'clear') {
      const n = Math.max(1, Math.min(4, data.lines || 1)), combo = data.combo || 0;
      st.combo = combo;
      st.cheer = Math.min(1.2, st.cheer + 0.35 + 0.18 * n);
      st.mood = Math.min(1, st.mood + 0.3 + 0.15 * n);
      st.punch = n >= 2 ? 1.3 : 0.7;
      st.fov = Math.max(st.fov, 1.5 + 1.1 * n);
      st.flash = Math.max(st.flash, 0.15 * n);
      // eye lasers into the sky: 1 beam per eye per line (more with combos)
      const per = Math.min(4, n + (combo >= 3 ? 1 : 0));
      for (const rb of giants) for (let k = 0; k < per; k++) {
        const e = k % 2;
        const spread = n >= 4 ? -rb.side * (20 + k * 12) : (rnd() - 0.5) * 30;
        fireLaser(rb, e, rb.x + spread, 70 + rnd() * 20, -60 - rnd() * 30, e ? 200 + rnd() * 40 : 300 + rnd() * 40, n >= 3 ? 6 + k * 2 : 2);
      }
      if (n >= 3) blast(0, 34, -70, 22 + 6 * n, 290);
      if (n >= 4) {
        st.vpose = 1.6; st.blaze = 0.7; st.flash = 1; st.light = 0.4;
        blast(-26, 40, -80, 30, 200, 0.25); blast(26, 40, -80, 30, 320, 0.45); blast(0, 38, -70, 46, 280, 0.6);
        for (const rb of giants) rb.wave = 1;
      }
      if (combo >= 2) st.chase = Math.min(1.5, st.chase + 0.4 * combo);
    } else if (kind === 'levelUp') {
      st.level = data.level || st.level + 1;
      st.wave = -150; st.waveK = 1.2;
      for (const rb of robots) rb.spin = 0;
      st.flash = Math.max(st.flash, 0.5); st.cheer = Math.min(1.2, st.cheer + 0.5);
      blast(0, 36, -70, 40, 190);
    } else if (kind === 'combo') {
      st.combo = data.n || 0;
    } else if (kind === 'gameOver') {
      st.over = true; st.powerT = 0.08; st.combo = 0; st.light = 0.8;
      strike(0, -30, -60); strike(1, 34, -70);
    } else if (kind === 'start') {
      st.over = false; st.power = 0; st.powerT = 1; st.combo = 0; st.mood = 0.3;
      st.wave = -150; st.waveK = 0.8;
      for (const rb of robots) { rb.stomp = -1; rb.spin = -1; }
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
