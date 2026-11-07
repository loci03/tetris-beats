// LIVING MY LIFE — the Tetris world: a sunny coast-highway beach cruise.
//
// The old 2D scene: blue sky, a big sun with rays and a corona (brighter
// with the music and clears), drifting clouds, a sparkling ocean with a
// surfer and a sailboat, a wave CRASH on hard drops that scared the gulls,
// a coast road with scrolling dashes, beach umbrellas and palms swaying
// (harder on clears), seagulls and a pelican, convertibles driven by robots
// playing saxophone — every move honked a car and floated a note, every
// clear made all the cars speed up, honk and blast a burst of sax notes —
// exhaust puffs, and a beach-volleyball game (moves make a player hop,
// clears force a spike, hard drops slam the ball into the sand).
//
// In 3D: the camera sits by the Pacific Coast Highway looking out to sea:
// robot-driven convertibles cruise both lanes, palms line the road, the
// beach is dotted with umbrellas, a volleyball game runs stage-left, the
// ocean rolls in with a surfer riding and a sailboat on the horizon, gulls
// and a pelican glide under a blazing sun and drifting clouds.
//   move     → the nearest car on the piece's side honks (headlights + a note), a volleyball player hops, gulls bank
//   rotate   → palms whip, the surfer carves a 360, the volleyball gets set high
//   soft     → cars push faster, the swell builds
//   drop     → wave CRASH (spray + foam ∝ rows), gulls scatter, the ball is slammed into the sand, cars bounce
//   hold     → lowrider hop: every car bounces on its hydraulics, a sax solo
//   clear n  → all cars speed up + honk + sax-note bursts (∝ n), palms + umbrellas sway harder, sun corona swells;
//              2 = volleyball spike; 3 = dolphins leap; 4 = TETRIS: a rainbow arcs over the sea, the surfer airs,
//              dolphins + a whale spout, beach balls fly
//   combo    → horns chain, notes escalate, the rainbow deepens
//   levelUp  → the sun flares, a banner plane flies over, beach balls rain
//   danger   → storm clouds roll in, the sea gets choppy, the wind bends the palms
//   gameOver → sunset: the sky goes orange and dim, the cars pull over
//   start    → bright morning, engines rev

import { createKit, frac, clamp, lerp } from '../violins/tetris-kit.js';

const TAU = Math.PI * 2;
const SUN = [0.5, 0.3, -0.8];

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const kit = createKit(THREE);
  const { keep } = kit;
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0xa8d8f0, 60, 260);
  scene.background = new THREE.Color(0x5ab0e8);
  camera.far = 600; camera.updateProjectionMatrix();
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const lam = (c, e = 0x000000, extra) => keep(new THREE.MeshLambertMaterial({ color: c, emissive: e, ...extra }));
  const basic = (c, extra) => keep(new THREE.MeshBasicMaterial({ color: c, ...extra }));
  const vcol = lam(0xffffff, 0x000000, { vertexColors: true });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const sunDir = new THREE.Vector3(...SUN).normalize();

  // ── Sky: blue gradient, sun + corona + rays, rainbow, storm, sunset ──
  const skyU = { uTime: { value: 0 }, uSun: { value: sunDir }, uCorona: { value: 0.3 }, uRain: { value: 0 }, uStorm: { value: 0 }, uSet: { value: 0 }, uFlash: { value: 0 } };
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(500, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uTime, uCorona, uRain, uStorm, uSet, uFlash; uniform vec3 uSun;
      vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.0, 0.33, 0.63), mid = vec3(0.16, 0.59, 0.85), hor = vec3(0.66, 0.85, 0.94);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.25, h)); c = mix(c, top, smoothstep(0.25, 0.8, h));
        vec3 setc = mix(vec3(1.0, 0.55, 0.25), vec3(0.25, 0.12, 0.3), smoothstep(0.0, 0.6, h));
        c = mix(c, setc, uSet);
        c = mix(c, vec3(0.32, 0.36, 0.42) * (0.8 + 0.4 * h), uStorm * 0.85);
        float s = max(dot(vP, uSun), 0.0);
        vec3 sunC = mix(vec3(1.0, 0.95, 0.75), vec3(1.0, 0.6, 0.3), uSet);
        c += sunC * smoothstep(0.9975, 0.998, s) * 1.6 * (1.0 - uStorm * 0.7);
        c += sunC * (pow(s, 60.0) * (0.35 + 0.6 * uCorona) + pow(s, 8.0) * 0.15 * (0.6 + uCorona)) * (1.0 - uStorm * 0.6);
        // Sun rays: rotating spokes round the sun.
        vec3 ax = normalize(cross(uSun, vec3(0.0, 1.0, 0.0))), ay = cross(ax, uSun);
        float a = atan(dot(vP, ay), dot(vP, ax));
        float rays = pow(0.5 + 0.5 * sin(a * 14.0 + uTime * 0.25), 6.0) * smoothstep(0.75, 0.995, s) * (1.0 - smoothstep(0.995, 0.999, s));
        c += sunC * rays * (0.12 + 0.3 * uCorona) * (1.0 - uStorm);
        // Rainbow: an arc opposite-ish the sun, over the sea.
        vec3 rc = normalize(vec3(-0.25, -0.35, -1.0));
        float d = acos(clamp(dot(vP, rc), -1.0, 1.0));
        float band = (d - 0.62) / 0.07;
        float rb = smoothstep(0.0, 0.15, band) * smoothstep(1.0, 0.85, band) * smoothstep(-0.02, 0.06, h);
        c = mix(c, c + hue(clamp(band, 0.0, 1.0) * 0.8) * 0.75, rb * uRain);
        c += vec3(0.9) * uFlash * 0.4;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  sky.renderOrder = -10; root.add(sky);

  // Clouds: soft puff sprites (one normal-blended batch), drifting; storm darkens them.
  const cloudTex = kit.atlas([kit.paint.puff, kit.paint.soft], 2, 256);
  const clouds = new kit.SpriteBatch(80, cloudTex, { cells: 2, additive: false, order: -5 });
  root.add(clouds.mesh);
  const CLOUDS = Array.from({ length: low ? 9 : 14 }, (_, i) => ({ x: -260 + i * 40 + Math.random() * 20, y: 40 + Math.random() * 50, z: -250 - Math.random() * 60, s: 40 + Math.random() * 40, n: 3 + (i % 3) }));

  // ── Ocean (shader): waves, sun glitter, shore foam, crash ─────────
  const seaU = { uTime: { value: 0 }, uCrash: { value: 0 }, uChop: { value: 0 }, uSun: { value: sunDir }, uSet: { value: 0 }, uStorm: { value: 0 }, uSwell: { value: 0 } };
  const sea = new THREE.Mesh(keep(new THREE.PlaneGeometry(900, 500, 1, 1)), keep(new THREE.ShaderMaterial({
    uniforms: seaU, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform float uTime, uCrash, uChop, uSet, uStorm, uSwell; uniform vec3 uSun;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 V = normalize(vW - cameraPosition);
        float dist = length(vW.xz - cameraPosition.xz);
        float k = 1.0 + 1.5 * uChop;
        float w = sin(vW.x * 0.35 + vW.z * 0.9 - uTime * 1.6 * k) * 0.5 + sin(vW.x * 0.9 - vW.z * 0.5 + uTime * 1.1 * k) * 0.3 + sin(vW.x * 2.1 + vW.z * 1.7 - uTime * 2.4) * 0.2;
        vec3 deep = vec3(0.0, 0.32, 0.58), shallow = vec3(0.16, 0.74, 0.86);
        float shoreT = smoothstep(-30.0, -15.0, vW.z);
        vec3 c = mix(deep, shallow, shoreT * 0.8 + 0.15 * w);
        c = mix(c, vec3(0.66, 0.85, 0.94), smoothstep(80.0, 420.0, dist) * 0.85);
        c = mix(c, c * vec3(1.2, 0.7, 0.5), uSet * 0.7);
        c = mix(c, vec3(0.2, 0.28, 0.32), uStorm * 0.6);
        // Glitter path toward the sun.
        vec3 R = reflect(V, vec3(0.06 * w, 1.0, 0.04 * w));
        float g = pow(max(dot(R, uSun), 0.0), 120.0);
        c += vec3(1.0, 0.95, 0.8) * g * 2.2 * (1.0 - uStorm) * (0.6 + 0.4 * step(0.4, hash(floor(vW.xz * 2.0) + floor(uTime * 6.0))));
        // Rolling wave lines + shore foam (the crash floods it).
        float lines = smoothstep(0.92, 1.0, sin(vW.z * 0.5 + uTime * (1.3 + uSwell) + sin(vW.x * 0.08) * 2.0)) * (0.35 + 0.65 * shoreT);
        c += vec3(0.9) * lines * (0.3 + 0.4 * uSwell);
        float foam = smoothstep(-15.5 - 4.0 * uCrash, -14.2, vW.z) * (0.55 + 0.45 * sin(vW.x * 1.3 + uTime * 3.0));
        c = mix(c, vec3(1.0), clamp(foam * (0.6 + uCrash), 0.0, 1.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, -264);
  root.add(sea);

  // ── Land: sand, road, sidewalk, distant headland ──────────────────
  const sandTex = kit.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#efd894'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = i % 3 ? 'rgba(200,170,90,0.35)' : 'rgba(255,250,220,0.5)'; g.fillRect((i * 37.7) % w, (i * 91.3) % h, 1.5, 1.5); }
  });
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(30, 8);
  const sand = add(keep(new THREE.PlaneGeometry(400, 20)), lam(0xffffff, 0x1a1408, { map: sandTex }), 0, 0, -4.5); sand.rotation.x = -Math.PI / 2;
  const roadTex = kit.canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#3d3a3a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect((i * 37.7) % w, (i * 53.3) % h, 1.5, 1.5); }
    g.fillStyle = '#f5e870'; g.fillRect(0, 8, w, 5); g.fillRect(0, h - 13, w, 5);
    g.fillStyle = '#f5e870'; g.fillRect(0, h / 2 - 3, w * 0.55, 6);
  });
  roadTex.wrapS = THREE.RepeatWrapping; roadTex.repeat.set(40, 1);
  const roadMat = lam(0xffffff, 0x101010, { map: roadTex });
  const road = add(keep(new THREE.PlaneGeometry(400, 7)), roadMat, 0, 0.02, 9); road.rotation.x = -Math.PI / 2;
  const walk = add(keep(new THREE.PlaneGeometry(400, 2.4)), lam(0xd8d0c0), 0, 0.15, 13.6); walk.rotation.x = -Math.PI / 2;
  add(keep(new THREE.BoxGeometry(400, 0.5, 0.3)), lam(0xe8e8e8), 0, 0.25, 5.4);   // sea wall lip
  const headTex = kit.canvasTex(512, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#5a7a6a'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 4) g.lineTo(x, h * 0.55 - 18 * Math.exp(-Math.pow((x - w * 0.12) / 60, 2)) - 10 * Math.exp(-Math.pow((x - w * 0.85) / 90, 2)) - 3 * Math.sin(x * 0.07)); g.lineTo(w, h); g.fill(); });
  const head = add(keep(new THREE.PlaneGeometry(900, 60)), basic(0xffffff, { map: headTex, transparent: true, depthWrite: false, fog: false }), 0, 10, -330);
  head.renderOrder = -6;

  // ── Palms along the road + umbrellas on the beach ─────────────────
  const trunkB = new kit.Builder();
  for (let i = 0; i < 7; i++) trunkB.cyl(0.32 - i * 0.025, 0.36 - i * 0.025, 1.3, 7, Math.sin(i * 0.25) * 0.5 * (i / 7), 0.65 + i * 1.25, 0, i % 2 ? 0x8a6a40 : 0x7a5a34, 0, 0, -i * 0.04);
  const trunkGeo = trunkB.build();
  const frondB = new kit.Builder();
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; frondB.add(new THREE.PlaneGeometry(0.9, 4.2, 1, 4), frondB.m4(Math.cos(a) * 1.6, -0.6, Math.sin(a) * 1.6, -Math.PI / 2 + 0.55, -a + Math.PI / 2, 0), i % 2 ? 0x2a8a3a : 0x3aa048); }
  frondB.sph(0.5, 0, 0, 0, 0x5a4020);
  const frondGeo = frondB.build();
  const palms = [];
  for (let i = 0; i < (low ? 14 : 20); i++) { const x = -60 + i * (120 / (low ? 13 : 19)) + (Math.random() - 0.5) * 2; if (Math.abs(x) < 3) continue; palms.push({ x, z: i % 2 ? 4.4 : -0.5 - Math.random() * 2, s: 0.8 + Math.random() * 0.4, ph: Math.random() * TAU }); }
  const PN = palms.length;
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, vcol, PN), frondMesh = new THREE.InstancedMesh(frondGeo, lam(0xffffff, 0x0a1a08, { vertexColors: true, side: THREE.DoubleSide }), PN);
  palms.forEach((p, i) => { dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix(); trunkMesh.setMatrixAt(i, dummy.matrix); });
  for (const m of [trunkMesh, frondMesh]) { m.frustumCulled = false; root.add(m); }
  const umbB = new kit.Builder();
  umbB.cyl(0.05, 0.05, 2.4, 5, 0, 1.2, 0, 0xeeeeee);
  for (let i = 0; i < 8; i++) umbB.add(new THREE.ConeGeometry(1.6, 0.6, 2, 1, true, i / 8 * TAU, TAU / 8), umbB.m4(0, 2.5, 0), i % 2 ? 0xffffff : 0xff3020);
  const umbGeo = umbB.build();
  const umbs = [];
  const UMB_COL = [0xff3020, 0xffc020, 0x2080e0, 0x40c040, 0xe040b0];
  for (let i = 0; i < (low ? 10 : 16); i++) { const s = i % 2 ? 1 : -1; umbs.push({ x: s * (9 + Math.random() * 28), z: -2 - Math.random() * 9, ph: Math.random() * TAU }); }
  const umbMesh = new THREE.InstancedMesh(umbGeo, vcol, umbs.length);
  umbs.forEach((u, i) => umbMesh.setColorAt(i, col.set(UMB_COL[i % 5]).lerp(new THREE.Color(1, 1, 1), 0.35)));
  umbMesh.frustumCulled = false; root.add(umbMesh);
  // Towels under the umbrellas (static).
  const towB = new kit.Builder();
  umbs.forEach((u, i) => towB.box(1.0, 0.03, 1.9, u.x + 0.8, 0.02, u.z + 0.4, UMB_COL[(i + 2) % 5], 0, 0.3, 0));
  root.add(new THREE.Mesh(towB.build(), vcol));

  // ── Convertibles with robot sax players ───────────────────────────
  const paintB = new kit.Builder();
  paintB.box(4.2, 0.55, 1.8, 0, 0.62, 0, 0xffffff); paintB.box(1.4, 0.3, 1.75, 1.35, 0.98, 0, 0xffffff); paintB.box(0.9, 0.28, 1.75, -1.6, 0.95, 0, 0xffffff);
  paintB.box(0.5, 0.25, 1.9, 2.0, 0.55, 0, 0xffffff); paintB.box(0.4, 0.3, 1.9, -2.05, 0.6, 0, 0xffffff);
  const paintGeo = paintB.build();
  const trimB = new kit.Builder();
  for (const [x, z] of [[1.35, 0.9], [1.35, -0.9], [-1.35, 0.9], [-1.35, -0.9]]) { trimB.cyl(0.38, 0.38, 0.28, 12, x, 0.38, z, 0x151515, Math.PI / 2); trimB.cyl(0.2, 0.2, 0.3, 10, x, 0.38, z, 0xd8d8e0, Math.PI / 2); }
  trimB.box(0.08, 0.5, 1.6, 0.65, 1.25, 0, 0xbfe6ff, 0, 0, -0.35);         // windshield
  trimB.box(0.7, 0.35, 0.7, -0.2, 0.95, 0.42, 0xf0e8d8); trimB.box(0.7, 0.35, 0.7, -0.2, 0.95, -0.42, 0xf0e8d8);   // seats
  trimB.box(0.12, 0.1, 1.95, 2.25, 0.5, 0, 0xd8d8e0); trimB.box(0.12, 0.1, 1.95, -2.27, 0.5, 0, 0xd8d8e0);
  // Robot driver: body, head, eyes, antenna; sax.
  trimB.box(0.5, 0.65, 0.5, -0.35, 1.4, 0.42, 0xb8c0cc); trimB.box(0.42, 0.38, 0.42, -0.35, 1.95, 0.42, 0xd0d8e4);
  trimB.box(0.06, 0.1, 0.3, -0.12, 1.97, 0.42, 0x40e8ff); trimB.cyl(0.015, 0.015, 0.35, 4, -0.35, 2.3, 0.42, 0x888888); trimB.sph(0.05, -0.35, 2.48, 0.42, 0xff3040);
  trimB.cyl(0.07, 0.11, 0.65, 8, 0.0, 1.55, 0.42, 0xffc840, 0, 0, -0.5); trimB.cyl(0.11, 0.18, 0.2, 8, 0.16, 1.27, 0.42, 0xffc840, 0, 0, -1.6);
  // Passenger robot (shorter).
  trimB.box(0.45, 0.55, 0.45, -0.35, 1.35, -0.42, 0xa0a8b8); trimB.box(0.38, 0.34, 0.38, -0.35, 1.85, -0.42, 0xc0c8d4); trimB.box(0.06, 0.08, 0.26, -0.15, 1.86, -0.42, 0xffe040);
  const trimGeo = trimB.build();
  const CARN = low ? 6 : 8;
  const CAR_COL = [0xe02828, 0xf0c018, 0x1870d8, 0x28b050, 0xd050a0, 0xff7020, 0xcc2288, 0x20a0c8];
  const cars = Array.from({ length: CARN }, (_, i) => ({ lane: i % 2, x: -60 + (i / CARN) * 120 + Math.random() * 6, v: 0, vb: 7 + Math.random() * 3, boost: 0, honk: 0, hop: 0, hopV: 0, bob: Math.random() * TAU, color: CAR_COL[i % CAR_COL.length] }));
  const paintMesh = new THREE.InstancedMesh(paintGeo, lam(0xffffff, 0x000000, { vertexColors: true }), CARN), trimMesh = new THREE.InstancedMesh(trimGeo, vcol, CARN);
  cars.forEach((c, i) => paintMesh.setColorAt(i, col.set(c.color)));
  for (const m of [paintMesh, trimMesh]) { m.frustumCulled = false; root.add(m); }
  const LANE_Z = [10.6, 7.4], LANE_DIR = [1, -1];

  // ── Volleyball (stage-left) ───────────────────────────────────────
  const VX = -14, VZ = -5;
  const vbB = new kit.Builder();
  vbB.cyl(0.06, 0.06, 2.6, 5, VX, 1.3, VZ - 3, 0xddd6c0); vbB.cyl(0.06, 0.06, 2.6, 5, VX, 1.3, VZ + 3, 0xddd6c0);
  vbB.box(0.03, 0.8, 6, VX, 2.1, VZ, 0x8a8a8a); vbB.box(0.05, 0.08, 6, VX, 2.5, VZ, 0xffffff);
  root.add(new THREE.Mesh(vbB.build(), vcol));
  const plB = new kit.Builder();
  plB.cyl(0.2, 0.17, 0.75, 7, 0, 1.25, 0, 0xffffff); plB.sph(0.17, 0, 1.82, 0, 0x8a5a3a); plB.cyl(0.09, 0.08, 0.85, 5, -0.1, 0.43, 0, 0x8a5a3a); plB.cyl(0.09, 0.08, 0.85, 5, 0.1, 0.43, 0, 0x8a5a3a);
  plB.cyl(0.06, 0.06, 0.7, 5, -0.28, 1.75, 0, 0x8a5a3a); plB.cyl(0.06, 0.06, 0.7, 5, 0.28, 1.75, 0, 0x8a5a3a);
  const vbPl = [{ x: VX - 3.8, z: VZ - 1.2, s: -1 }, { x: VX - 2, z: VZ + 1.4, s: -1 }, { x: VX + 2.1, z: VZ - 1.0, s: 1 }, { x: VX + 3.8, z: VZ + 1.3, s: 1 }].map((p, i) => ({ ...p, j: 0, jv: 0, arms: 0, i }));
  const plMesh = new THREE.InstancedMesh(plB.build(), vcol, 4);
  [0x40c8ff, 0x40c8ff, 0xff8040, 0xff8040].forEach((c, i) => plMesh.setColorAt(i, col.set(c)));
  plMesh.frustumCulled = false; root.add(plMesh);
  const ball = add(keep(new THREE.SphereGeometry(0.22, 12, 8)), lam(0xffffff, 0x404040), VX - 3, 2, VZ);
  const vb = { x: VX - 3, y: 2, z: VZ, vx: 3, vy: 5, vz: 0, score: [0, 0] };

  // ── Surfer, sailboat, dolphins, whale ─────────────────────────────
  const surfB = new kit.Builder();
  surfB.add(new THREE.SphereGeometry(1, 10, 6), surfB.m4(0, 0.08, 0, 0, 0, 0, 1.3, 0.08, 0.32), 0xffe040);
  surfB.cyl(0.16, 0.14, 0.7, 6, 0, 1.0, 0, 0x2050c0); surfB.sph(0.15, 0, 1.5, 0, 0x8a5a3a); surfB.cyl(0.07, 0.07, 0.75, 5, -0.2, 0.42, 0, 0x2050c0, 0, 0, 0.3); surfB.cyl(0.07, 0.07, 0.75, 5, 0.2, 0.42, 0, 0x2050c0, 0, 0, -0.3);
  surfB.cyl(0.05, 0.05, 0.7, 5, -0.45, 1.15, 0, 0x8a5a3a, 0, 0, 1.3); surfB.cyl(0.05, 0.05, 0.7, 5, 0.45, 1.15, 0, 0x8a5a3a, 0, 0, -1.3);
  const surfer = add(surfB.build(), vcol, 22, 0, -26); surfer.scale.setScalar(1.6);
  const sailB = new kit.Builder();
  sailB.box(3, 0.6, 0.9, 0, 0.3, 0, 0x6a4020); sailB.add(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.6), new THREE.Vector2(0, 4.5), new THREE.Vector2(1.6, 0.6)])), sailB.m4(0.1, 0, 0), 0xffffff);
  sailB.add(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.6), new THREE.Vector2(0, 3.6), new THREE.Vector2(-1.2, 0.6)])), sailB.m4(-0.1, 0, 0), 0xe8e8e8);
  const sail = add(sailB.build(), lam(0xffffff, 0x303030, { vertexColors: true, side: THREE.DoubleSide }), -34, 0, -90); sail.scale.setScalar(2);
  const dolB = new kit.Builder();
  dolB.add(new THREE.SphereGeometry(1, 10, 6), dolB.m4(0, 0, 0, 0, 0, 0, 1.2, 0.32, 0.3), 0x6a8aa8); dolB.add(new THREE.ConeGeometry(0.2, 0.5, 4), dolB.m4(0.1, 0.38, 0, 0, 0, -0.4), 0x5a7a98);
  dolB.add(new THREE.ConeGeometry(0.1, 0.5, 4), dolB.m4(1.25, 0, 0, 0, 0, -Math.PI / 2), 0x6a8aa8); dolB.box(0.15, 0.08, 0.7, -1.1, 0, 0, 0x5a7a98);
  const DOLN = 5;
  const dolMesh = new THREE.InstancedMesh(dolB.build(), vcol, DOLN); dolMesh.frustumCulled = false; root.add(dolMesh);
  const dols = Array.from({ length: DOLN }, () => ({ t: 9, x: 0, z: 0, s: 1 }));
  const leap = (n) => { for (let i = 0; i < n; i++) { const d = dols[i % DOLN]; d.t = -i * 0.25; d.x = (i % 2 ? 1 : -1) * (20 + Math.random() * 14); d.z = -30 - Math.random() * 14; d.s = 1.5 + Math.random() * 0.5; d.dir = Math.random() < 0.5 ? -1 : 1; } };
  let whale = 9;

  // ── Gulls + pelican + banner plane ────────────────────────────────
  const GN = low ? 10 : 16;
  const gullB = new kit.Builder(); gullB.add(new THREE.SphereGeometry(0.2, 6, 4), gullB.m4(0, 0, 0, 0, 0, 0, 1.6, 0.8, 0.8), 0xffffff);
  const gullBody = new THREE.InstancedMesh(gullB.build(), lam(0xffffff, 0x404040, { vertexColors: true }), GN + 1);
  const gullWing = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.75, 0.22)), lam(0xf4f4f4, 0x303030, { side: THREE.DoubleSide }), (GN + 1) * 2);
  for (const m of [gullBody, gullWing]) { m.frustumCulled = false; root.add(m); }
  const gulls = Array.from({ length: GN + 1 }, (_, i) => ({ x: (Math.random() - 0.5) * 80, y: 9 + Math.random() * 10, z: -8 - Math.random() * 30, vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2), vy: 0, flap: Math.random() * 6, scared: 0, bank: 0, pel: i === GN }));
  gullBody.setColorAt(GN, col.set(0x9a8a70)); for (let i = 0; i < GN; i++) gullBody.setColorAt(i, col.set(0xffffff));
  const planeB = new kit.Builder();
  planeB.box(2.4, 0.5, 0.5, 0, 0, 0, 0xffffff); planeB.box(0.5, 0.08, 3.6, 0.2, 0.2, 0, 0xff4040); planeB.box(0.4, 0.6, 0.06, -1.15, 0.3, 0, 0xff4040); planeB.cyl(0.4, 0.4, 0.04, 8, 1.25, 0, 0, 0x333333, 0, 0, Math.PI / 2);
  const planeG = new THREE.Group(); root.add(planeG); planeG.add(new THREE.Mesh(planeB.build(), vcol)); planeG.visible = false;
  const bannerTex = kit.canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#fff8e0'; g.fillRect(0, 0, w, h); g.fillStyle = '#e02060'; g.font = '900 40px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LEVEL UP! ★ LIVING MY LIFE', w / 2, h / 2 + 2); });
  const bannerM = add(keep(new THREE.PlaneGeometry(14, 1.8)), basic(0xffffff, { map: bannerTex, side: THREE.DoubleSide }), -9, 0, 0, planeG);
  let planeT = 99;

  // ── Sprites ───────────────────────────────────────────────────────
  const atlasTex = kit.atlas([kit.paint.glow, kit.paint.ring, kit.paint.sparkle, kit.paint.glyph('♪'), kit.paint.glyph('♫'), kit.paint.glyph('♬'), kit.paint.puff, kit.paint.soft], 4, 512);
  const fx = new kit.SpriteBatch(low ? 600 : 1000, atlasTex, { cells: 4, additive: true, order: 6 });
  const fxN = new kit.SpriteBatch(low ? 200 : 320, atlasTex, { cells: 4, additive: false, order: 5 });   // spray / sand / smoke (normal blend)
  root.add(fx.mesh, fxN.mesh);
  const parts = new kit.Particles(low ? 420 : 700);
  const C = { glow: 0, ring: 1, spark: 2, note: 3, puff: 6, soft: 7 };
  // Beach balls (pooled instanced spheres).
  const BB = 10;
  const bbMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.35, 10, 8)), lam(0xffffff, 0x303030), BB); bbMesh.frustumCulled = false; root.add(bbMesh);
  const bballs = Array.from({ length: BB }, (_, i) => ({ on: false })); let bbCur = 0;
  [0xff3040, 0xffd020, 0x30a0ff, 0xffffff, 0x40d060].forEach((c, i) => { for (let k = i; k < BB; k += 5) bbMesh.setColorAt(k, col.set(c)); });
  const throwBalls = (n) => { for (let i = 0; i < n; i++) { const b = bballs[bbCur = (bbCur + 1) % BB]; b.on = true; const s = Math.random() < 0.5 ? -1 : 1; b.x = s * (8 + Math.random() * 20); b.z = -2 - Math.random() * 10; b.y = 0.4; b.vx = (Math.random() - 0.5) * 4; b.vy = 7 + Math.random() * 5; b.vz = (Math.random() - 0.5) * 2; b.r = 0; } };

  // ── Lights ────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xcfeaff, 0xe8c890, 1.3);
  const sunL = new THREE.DirectionalLight(0xfff2d8, 2.0); sunL.position.copy(sunDir).multiplyScalar(50);
  root.add(hemi, sunL);

  // ── State ─────────────────────────────────────────────────────────
  const st = {
    cheer: 0, crash: 0, corona: 0, rain: 0, swell: 0, whip: kit.spring(), spin: 0, flash: 0, combo: 0, storm: 0, set: 0, setT: 0,
    over: false, push: 0, bounce: 0, solo: 0, spike: 0,
  };
  const colX = (c) => { const u = ((c ?? 4.5) - 4.5) / 4.5; return Math.sign(u || 1) * (8 + 8 * Math.abs(u)); };
  const note = (x, y, z, big = false) => {
    const o = parts.spawn(x, y, z, C.note + Math.floor(Math.random() * 3), big ? 2.4 : 1.8);
    o.vx = (Math.random() - 0.5) * (big ? 5 : 1.5); o.vy = big ? 4 + Math.random() * 3 : 2 + Math.random(); o.g = big ? 2.5 : 0.5; o.drag = 0.4;
    o.size = big ? 1.1 + Math.random() * 0.5 : 0.7; o.vr = (Math.random() - 0.5) * 2; col.setHSL(0.08 + Math.random() * 0.12, 0.95, 0.6); o.r = col.r; o.gg = col.g; o.b = col.b; o.wob = 0.3;
  };
  const honk = (c, big = false, n = 1) => { c.honk = 1; const z = LANE_Z[c.lane]; for (let i = 0; i < n; i++) note(c.x + 0.2, 2.2, z, big); };
  const spray = (x, n, k) => { for (let i = 0; i < n; i++) { const o = parts.spawn(x + (Math.random() - 0.5) * 6, 0.3, -14.5 + Math.random() * 1.5, C.puff, 1 + Math.random() * 0.6); o.vx = (Math.random() - 0.5) * 3; o.vy = (4 + Math.random() * 6) * k; o.vz = 1 + Math.random() * 2; o.g = 9; o.size = 0.9 + Math.random() * 0.8; o.grow = 1.5; o.r = 1; o.gg = 1; o.b = 1; o.a = 0.85; o.batch = 1; } };
  const sandPuff = (x, z, n = 8) => { for (let i = 0; i < n; i++) { const o = parts.spawn(x, 0.2, z, C.puff, 0.8); o.vx = (Math.random() - 0.5) * 3; o.vy = 1 + Math.random() * 2; o.vz = (Math.random() - 0.5) * 3; o.g = 4; o.size = 0.5; o.grow = 1.5; o.r = 0.95; o.gg = 0.85; o.b = 0.6; o.a = 0.8; o.batch = 1; } };
  const nearestCar = (x) => { let best = cars[0], bd = 1e9; for (const c of cars) { const d = Math.abs(c.x - x); if (d < bd) { bd = d; best = c; } } return best; };
  const vbHit = (p, up, spike = false) => { // player p sends the ball over the net
    p.jv = spike ? 5 : 3; p.arms = 1;
    vb.x = p.x; vb.y = 2.4 + (spike ? 0.8 : 0); vb.z = p.z;
    const tx = VX - p.s * (2 + Math.random() * 2), tz = VZ + (Math.random() - 0.5) * 3, T = spike ? 0.55 : 1.2 + up * 0.4;
    vb.vx = (tx - vb.x) / T; vb.vz = (tz - vb.z) / T; vb.vy = (0 - vb.y + 0.5 * 9.8 * T * T) / T;
  };

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0;
    const ph = frac(beat), onBeat = Math.exp(-ph * 6);
    const danger = clamp(((info.danger || 0) - 0.55) / 0.4, 0, 1);
    const ch = info.cheer || 0, fl = info.flash || 0;
    st.cheer = Math.max(0, st.cheer - dt * 0.4); st.crash = Math.max(0, st.crash - dt * 0.8); st.corona = Math.max(0, st.corona - dt * 0.4);
    st.rain = Math.max(0, st.rain - dt * 0.12); st.swell = Math.max(0, st.swell - dt * 0.5); st.flash = Math.max(0, st.flash - dt * 2);
    st.push = Math.max(0, st.push - dt * 0.6); st.solo = Math.max(0, st.solo - dt * 0.5); st.spin = Math.max(0, st.spin - dt * 1.2);
    st.storm += (danger - st.storm) * Math.min(1, dt * 0.8);
    st.set += ((st.over ? 1 : 0) - st.set) * Math.min(1, dt * 0.5);
    const cheer = Math.max(st.cheer, ch), whip = kit.stepSpring(st.whip, dt, 1.4, 0.2);
    skyU.uTime.value = t; skyU.uCorona.value = 0.3 + 0.3 * onBeat + cheer * 0.6 + st.corona; skyU.uRain.value = Math.min(1, st.rain); skyU.uStorm.value = st.storm; skyU.uSet.value = st.set; skyU.uFlash.value = st.flash * 0.3;
    seaU.uTime.value = t; seaU.uCrash.value = st.crash; seaU.uChop.value = st.storm; seaU.uSet.value = st.set; seaU.uStorm.value = st.storm; seaU.uSwell.value = st.swell + 0.3 * st.storm;
    hemi.intensity = 1.3 * (1 - 0.4 * st.storm) * (1 - 0.45 * st.set); sunL.intensity = 2.0 * (1 - 0.6 * st.storm) * (1 - 0.5 * st.set) * (1 + 0.2 * cheer);
    sunL.color.setRGB(1, 0.95 - 0.3 * st.set, 0.85 - 0.45 * st.set);
    scene.fog.color.setRGB(0.66 - 0.3 * st.storm, 0.85 - 0.4 * st.storm - 0.3 * st.set, 0.94 - 0.4 * st.storm - 0.5 * st.set);

    // Clouds drift (faster in a storm, darker).
    clouds.begin();
    for (const c of CLOUDS) {
      c.x += dt * (1.5 + 8 * st.storm); if (c.x > 300) c.x -= 600;
      const g = 1 - 0.55 * st.storm - 0.2 * st.set;
      for (let k = 0; k < c.n; k++) clouds.add(c.x + (k - c.n / 2) * c.s * 0.45, c.y + Math.sin(k * 2.1) * c.s * 0.12, c.z, c.s * (0.8 + 0.25 * Math.sin(k * 1.7)), 0, 0, g, g, g * (1 + 0.04 * st.storm), 0.9);
    }
    clouds.end();

    fx.begin(); fxN.begin();
    // Palms: sway with the music + clears + wind; whip on rotations.
    const wind = 0.06 + 0.1 * cheer + 0.35 * st.storm;
    palms.forEach((p, i) => {
      const sw = Math.sin(t * 1.3 + p.ph) * wind + whip * 0.25 + 0.2 * st.storm;
      dummy.position.set(p.x + 0.43 * p.s + sw * 1.5, 8.6 * p.s, p.z); dummy.rotation.set(sw * 0.5, p.ph + t * 0.05 * (1 + 4 * st.storm), sw); dummy.scale.setScalar(p.s); dummy.updateMatrix(); frondMesh.setMatrixAt(i, dummy.matrix);
    });
    frondMesh.instanceMatrix.needsUpdate = true;
    umbs.forEach((u, i) => { dummy.position.set(u.x, 0, u.z); dummy.rotation.set(Math.sin(t * 0.8 + u.ph) * (0.05 + 0.08 * cheer + 0.2 * st.storm), u.ph, Math.sin(t * 0.9 + u.ph * 2) * (0.05 + 0.1 * cheer + 0.2 * st.storm)); dummy.scale.setScalar(1); dummy.updateMatrix(); umbMesh.setMatrixAt(i, dummy.matrix); });
    umbMesh.instanceMatrix.needsUpdate = true;

    // Cars: cruise, bob on the beat, honk (headlight glow), speed up on clears, hop on hold, pull over on game over.
    cars.forEach((c, i) => {
      const dir = LANE_DIR[c.lane], z = LANE_Z[c.lane];
      c.boost = Math.max(0, c.boost - dt * 0.4); c.honk = Math.max(0, c.honk - dt * 3);
      const vT = st.over ? 0 : c.vb * (1 + 1.4 * c.boost + 0.6 * st.push + 0.3 * cheer);
      c.v += (vT - c.v) * Math.min(1, dt * 1.5);
      c.x += dir * c.v * dt; if (c.x > 70) c.x -= 140; if (c.x < -70) c.x += 140;
      c.hopV += (-c.hop * 120 - c.hopV * 6) * dt - (c.hop > 0 ? 0 : 0); c.hop += c.hopV * dt; if (c.hop < 0 && c.hopV < 0 && st.solo <= 0) { c.hop *= 0.5; }
      if (st.solo > 0 && c.hop <= 0.01 && Math.abs(c.hopV) < 1 && Math.random() < dt * 6) c.hopV = 4 + Math.random() * 2;
      const bob = 0.03 * Math.exp(-frac(beat + c.bob) * 6) + Math.max(0, c.hop) * 0.8;
      const pz = z + (st.over ? (c.lane ? -1.4 : 1.4) : 0);
      dummy.position.set(c.x, bob, pz); dummy.rotation.set(Math.max(0, c.hop) * 0.3 * (i % 2 ? 1 : -1), dir > 0 ? 0 : Math.PI, Math.sin(t * 3 + c.bob) * 0.01 * c.v * 0.1 + c.hopV * 0.01); dummy.scale.setScalar(1); dummy.updateMatrix();
      paintMesh.setMatrixAt(i, dummy.matrix); trimMesh.setMatrixAt(i, dummy.matrix);
      const hx = c.x + dir * 2.3;
      const hk = 0.15 + 1.1 * c.honk;
      fx.add(hx, 0.6 + bob, pz + 0.65, 0.6 + 1.6 * c.honk, 0, C.glow, 1, 0.95, 0.75, hk); fx.add(hx, 0.6 + bob, pz - 0.65, 0.6 + 1.6 * c.honk, 0, C.glow, 1, 0.95, 0.75, hk);
      if (!st.over && Math.random() < dt * (3 + 6 * c.boost)) { const o = parts.spawn(c.x - dir * 2.4, 0.45, pz + 0.5, C.puff, 0.9); o.vx = -dir * (1 + Math.random()); o.vy = 0.4; o.size = 0.35; o.grow = 1.4; o.r = 0.75; o.gg = 0.73; o.b = 0.7; o.a = 0.45; o.batch = 1; }
      if (st.solo > 0 && Math.random() < dt * 2) note(c.x, 2.3, pz);
    });
    paintMesh.instanceMatrix.needsUpdate = trimMesh.instanceMatrix.needsUpdate = true;

    // Volleyball: the ball flies between the teams; a player under it sends it back.
    vb.vy -= 9.8 * dt; vb.x += vb.vx * dt; vb.y += vb.vy * dt; vb.z += vb.vz * dt;
    if (vb.y < 0.22) {
      vb.y = 0.22; sandPuff(vb.x, vb.z, 6);
      const scorer = vb.x < VX ? 1 : 0; vb.score[scorer]++;
      const p = vbPl[scorer === 0 ? 0 : 3]; vbHit(p, 1);
    } else if (vb.vy < 0 && vb.y < 2.4) {
      const team = vb.x < VX ? -1 : 1;
      let p = null; for (const q of vbPl) if (q.s === team && Math.hypot(q.x - vb.x, q.z - vb.z) < 1.6) p = q;
      if (p && Math.random() < 0.97) vbHit(p, 0.5 + Math.random() * 0.5);
    }
    ball.position.set(vb.x, vb.y, vb.z); ball.rotation.x += dt * 6;
    vbPl.forEach((p, i) => {
      p.jv -= 12 * dt; p.j = Math.max(0, p.j + p.jv * dt); if (p.j === 0) p.jv = 0; p.arms = Math.max(0, p.arms - dt * 2);
      const tx = p.x + clamp((vb.x - p.x) * 0.0, -1, 1);
      dummy.position.set(tx, p.j, p.z); dummy.rotation.set(0, p.s > 0 ? -Math.PI / 2 : Math.PI / 2, 0); dummy.scale.setScalar(1.1); dummy.updateMatrix(); plMesh.setMatrixAt(i, dummy.matrix);
    });
    plMesh.instanceMatrix.needsUpdate = true;

    // Surfer rides the swell (360 on rotate, air on Tetris), sailboat bobs.
    const sx = 22 + Math.sin(t * 0.25) * 6;
    surfer.position.set(sx, 0.15 + Math.sin(t * 1.6) * 0.15 + (st.spin > 0 ? 0 : 0) + Math.max(0, st.air || 0), -26 + Math.sin(t * 0.4) * 2);
    st.air = Math.max(0, (st.air || 0) - dt * 3);
    surfer.rotation.set(Math.sin(t * 1.3) * 0.08, -0.4 + Math.cos(t * 0.25) * 0.3 + (1 - st.spin) * 0 + st.spin * TAU, Math.sin(t * 1.1) * 0.12);
    if (Math.random() < dt * 8) { const o = parts.spawn(sx - 1.5, 0.3, surfer.position.z, C.puff, 0.7); o.vx = -2; o.vy = 1.5; o.g = 4; o.size = 0.6; o.grow = 1; o.r = 1; o.gg = 1; o.b = 1; o.a = 0.7; o.batch = 1; }
    sail.position.set(-34 + Math.sin(t * 0.05) * 8, Math.sin(t * 0.9) * 0.2, -90); sail.rotation.z = Math.sin(t * 0.7) * 0.05;
    // Dolphins: arc out of the water.
    dols.forEach((d, i) => {
      d.t += dt;
      const u = d.t / 1.4;
      if (u > 0 && u < 1) { dummy.position.set(d.x + d.dir * (u - 0.5) * 6, Math.sin(u * Math.PI) * 4 - 0.5, d.z); dummy.rotation.set(0, d.dir > 0 ? 0 : Math.PI, (0.5 - u) * 2.4); dummy.scale.setScalar(d.s); if (u > 0.9 && !d.sp) { d.sp = 1; for (let k = 0; k < 6; k++) { const o = parts.spawn(d.x + d.dir * 3, 0.2, d.z, C.puff, 0.8); o.vy = 3 + Math.random() * 2; o.vx = (Math.random() - 0.5) * 2; o.g = 9; o.size = 0.7; o.r = o.gg = o.b = 1; o.batch = 1; } } }
      else { dummy.scale.setScalar(0); d.sp = 0; }
      dummy.updateMatrix(); dolMesh.setMatrixAt(i, dummy.matrix);
    });
    dolMesh.instanceMatrix.needsUpdate = true;
    whale += dt; if (whale < 1.4) { for (let k = 0; k < 3; k++) { const o = parts.spawn(-26 + (Math.random() - 0.5) * 0.5, 0.5, -48, C.puff, 1.2); o.vy = 7 + Math.random() * 3; o.vx = (Math.random() - 0.5) * 2; o.g = 6; o.size = 1; o.grow = 1.5; o.r = o.gg = o.b = 1; o.a = 0.7; o.batch = 1; } }

    // Gulls (scared by the crash), pelican.
    gulls.forEach((g, i) => {
      g.flap += dt * (g.pel ? 4 : 9 + 10 * g.scared);
      g.scared = Math.max(0, g.scared - dt * 0.6); g.bank *= Math.exp(-dt * 2);
      g.x += g.vx * dt * (1 + g.scared * 2); g.y += g.vy * dt; g.vy *= Math.exp(-dt * 1.5); g.y += (12 - g.y) * dt * 0.15 + Math.sin(t + i) * 0.01;
      if (g.x > 60) g.x = -60; if (g.x < -60) g.x = 60;
      const s = g.pel ? 2.2 : 1, yaw = g.vx > 0 ? 0 : Math.PI;
      dummy.position.set(g.x, g.y, g.z); dummy.rotation.set(g.bank, yaw, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); gullBody.setMatrixAt(i, dummy.matrix);
      const fa = Math.sin(g.flap) * (g.pel ? 0.3 : 0.7);
      for (const w of [-1, 1]) { dummy.position.set(g.x, g.y + 0.05 * s, g.z); dummy.rotation.set(g.bank + w * fa, yaw, 0); dummy.translateZ(w * 0.38 * s); dummy.rotateX(Math.PI / 2); dummy.scale.set(s, s, s); dummy.updateMatrix(); gullWing.setMatrixAt(i * 2 + (w > 0 ? 1 : 0), dummy.matrix); }
    });
    gullBody.instanceMatrix.needsUpdate = gullWing.instanceMatrix.needsUpdate = true;
    // Banner plane (level up).
    planeT += dt; planeG.visible = planeT < 9;
    if (planeG.visible) { planeG.position.set(-45 + planeT * 10, 16 + Math.sin(planeT) * 0.4, -18); bannerM.position.y = -0.2 + Math.sin(planeT * 3) * 0.1; }
    // Beach balls.
    let bbl = 0;
    bballs.forEach((b, i) => {
      if (b.on) { b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.r += dt * 5; if (b.y < 0.35) { b.y = 0.35; b.vy = -b.vy * 0.55; b.vx *= 0.8; if (Math.abs(b.vy) < 1) b.on = false; } }
      if (b.on) { bbl++; dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(b.r, b.r * 0.6, 0); dummy.scale.setScalar(1); } else dummy.scale.setScalar(0);
      dummy.updateMatrix(); bbMesh.setMatrixAt(i, dummy.matrix);
    });
    bbMesh.visible = bbl > 0; bbMesh.instanceMatrix.needsUpdate = true;
    // Sun sparkle on the water near the shore.
    if (Math.random() < dt * 20 * (1 - st.storm)) { const o = parts.spawn((Math.random() - 0.5) * 60 + 10, 0.1, -16 - Math.random() * 40, C.spark, 0.4); o.size = 0.5 + Math.random() * 0.6; o.r = 1; o.gg = 1; o.b = 0.9; o.fadeIn = 0.05; }

    parts.step(dt, [fx, fxN]);
    fx.end(); fxN.end();

    // Camera: by the highway, looking out to sea.
    const aspect = camera.aspect || 1.6, fr = kit.framing(aspect);
    const shake = st.crash * 0.08;
    if (fr.portrait) {
      camera.fov = 70;
      camera.position.set(Math.sin(t * 0.1) * 0.6, 3.4 + (Math.random() - 0.5) * shake, 21);
      camera.lookAt(0, 4.2, -20);
      // Slide the frustum so the highway (and its cars) sits in the strip under the board.
      camera.setViewOffset(1000 * aspect, 1000, 0, -1000 * 0.2, 1000 * aspect, 1000);
    } else {
      camera.fov = 54;
      camera.position.set(Math.sin(t * 0.1) * 1.4 + (Math.random() - 0.5) * shake, 3.6 + Math.sin(t * 0.15) * 0.25 + (Math.random() - 0.5) * shake, 19 + Math.sin(t * 0.07) * 0.6);
      camera.lookAt(Math.sin(t * 0.1) * 0.7, 3.4, -20);
      if (camera.view && camera.view.enabled) camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position);
  }

  function react(kind, d = {}) {
    if (st.over && kind !== 'start') return;
    const x = colX(d.col);
    switch (kind) {
      case 'move': {
        honk(nearestCar(x));
        const p = vbPl[Math.floor(Math.random() * 4)]; if (p.j === 0) p.jv = 2.5; p.arms = 0.6;
        for (const g of gulls) g.bank += (d.dir || 0) * 0.4;
        break;
      }
      case 'rotate':
        st.whip.v += (d.dir || 1) * 1.8; st.spin = 1;
        if (vb.vy < 0) { vb.vy = 8; vb.vx *= 0.3; }
        break;
      case 'soft':
        st.push = Math.min(1, st.push + 0.25); st.swell = Math.min(1, st.swell + 0.2);
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.35 + r / 14);
        st.crash = Math.min(1.3, st.crash + k); spray(x, 6 + r, k); spray(-x * 0.7, 3 + (r >> 1), k * 0.8);
        if (r >= 4) for (const g of gulls) { g.scared = 1; g.vy = 3 + Math.random() * 4; g.vx *= -1; }
        vb.vy = -Math.abs(vb.vy) * 1.5 - 6; sandPuff(vb.x, vb.z, 12);
        for (const c of cars) c.hopV += 1.5 * k;
        break;
      }
      case 'hold':
        st.solo = 1.6; for (const c of cars) c.hopV = 4 + Math.random() * 2;
        break;
      case 'clear': {
        const n = clamp(d.lines || 1, 1, 4), combo = d.combo || 0;
        st.combo = combo; st.cheer = Math.min(1.2, st.cheer + 0.28 * n + 0.05 * combo); st.corona = Math.min(1, 0.3 + 0.2 * n);
        for (const c of cars) { c.boost = Math.min(1.5, 0.5 + 0.2 * n); honk(c, true, n + Math.min(combo, 4)); }
        if (n >= 2) { st.spike = 1; const team = vb.x < VX ? -1 : 1; const p = vbPl.find(q => q.s === team); vbHit(p, 0, true); sandPuff(VX - team * 3, VZ, 14); }
        if (n >= 3) leap(n >= 4 ? 5 : 3);
        if (n >= 4) { st.rain = 1.6; st.air = 1.5; st.spin = 1; whale = 0; throwBalls(6); st.flash = 1; }
        if (combo >= 2) st.rain = Math.max(st.rain, Math.min(1, 0.2 * combo));
        break;
      }
      case 'levelUp':
        st.corona = 1.2; planeT = 0; throwBalls(10); st.cheer = 1;
        break;
      case 'gameOver':
        st.over = true;
        break;
      case 'start':
        st.over = false; st.set = 0; for (const c of cars) { c.boost = 1; c.honk = 1; }
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      if (camera.view && camera.view.enabled) camera.clearViewOffset();
      for (const m of [trunkMesh, frondMesh, umbMesh, paintMesh, trimMesh, plMesh, dolMesh, gullBody, gullWing, bbMesh]) m.dispose();
      kit.dispose();
    },
  };
}
