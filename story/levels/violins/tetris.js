// FALLING VIOLINS — the Tetris world: a golden night sky raining violins.
//
// The old 2D scene was the gold concert-hall sky with violin silhouettes
// raining down, reacting to everything: every move kicked them sideways
// (fanned out) with a snap of tilt and plucked their strings, clears sped
// the rain up, widened the sway and brightened the gold, a hard drop jolted
// the whole sky downward and pitched them forward, Tetris FX lit the strings.
//
// In 3D: violins tumble out of a warm black-gold sky in deep parallax and
// splash into a mirror lake; golden music staves ripple across the sky with
// notes riding them; searchlight shafts sweep; a gilded moon hangs over the
// hills and a distant opera house glitters on the shore.
//   move     → the rain lurches (fanned out per violin) + tilt snap + string pluck, staves ripple that way
//   rotate   → every violin pirouettes, the light shafts swing, staff notes hop
//   soft     → the rain is pushed faster, strings tremolo (shimmer), dust streams down
//   drop     → the sky JOLTS: rain slams down + pitches forward + swells (∝ rows), shock rings on the lake
//   hold     → fermata: the rain freezes in the air for a moment, cool white shimmer
//   clear n  → rain speeds / sway widens / gold brightens; gilded violins cascade at the piece's side,
//              notes burst off the staves; 3 = lake rings, 4 = TETRIS: strings blaze, sky + aurora flare,
//              cascade everywhere, shafts converge and strobe
//   combo    → escalating: more notes light, aurora cycles faster, shafts strobe more
//   levelUp  → crescendo: the whole rain swirls into a golden vortex, the aurora changes key (hue)
//   danger   → the sky reddens, a wind whips the rain sideways, the aurora runs hot
//   gameOver → the music stops: the rain drops into the lake, lights go down
//   start    → lights up, a fresh downpour

import { createKit, frac, clamp, lerp } from './tetris-kit.js';

const TAU = Math.PI * 2;

// Violin body outline (one side; x ≥ 0), in units of body length ≈ 0.62.
function violinShape(THREE) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.31);
  s.bezierCurveTo(0.07, -0.31, 0.115, -0.28, 0.112, -0.21);    // lower bout
  s.bezierCurveTo(0.11, -0.16, 0.07, -0.15, 0.062, -0.12);      // C-bout
  s.bezierCurveTo(0.058, -0.09, 0.098, -0.08, 0.094, -0.03);    // upper bout
  s.bezierCurveTo(0.09, 0.01, 0.05, 0.02, 0.0, 0.02);
  s.bezierCurveTo(-0.05, 0.02, -0.09, 0.01, -0.094, -0.03);
  s.bezierCurveTo(-0.098, -0.08, -0.058, -0.09, -0.062, -0.12);
  s.bezierCurveTo(-0.07, -0.15, -0.11, -0.16, -0.112, -0.21);
  s.bezierCurveTo(-0.115, -0.28, -0.07, -0.31, 0, -0.31);
  return s;
}

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const kit = createKit(THREE);
  const { keep } = kit;
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0x120a02, 30, 120);
  scene.background = new THREE.Color(0x0a0600);
  camera.far = 400; camera.near = 0.1; camera.updateProjectionMatrix();
  const col = new THREE.Color(), dummy = new THREE.Object3D();

  // ── Sky dome: black-gold gradient, stars, aurora of light, gilded moon ──
  const MOON = new THREE.Vector3(-0.5, 0.36, -0.79).normalize();
  const skyU = { uTime: { value: 0 }, uPulse: { value: 0 }, uFlash: { value: 0 }, uAur: { value: 0.4 }, uHue: { value: 0 }, uDanger: { value: 0 }, uDim: { value: 1 }, uMoon: { value: MOON } };
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(300, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uTime, uPulse, uFlash, uAur, uHue, uDanger, uDim; uniform vec3 uMoon;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.012, 0.008, 0.004), mid = vec3(0.07, 0.04, 0.01), hor = vec3(0.32, 0.18, 0.04);
        hor = mix(hor, vec3(0.45, 0.06, 0.03), uDanger);
        vec3 c = mix(hor, mid, smoothstep(-0.02, 0.18, h));
        c = mix(c, top, smoothstep(0.18, 0.75, h));
        // Stars.
        vec2 g = floor(vec2(atan(vP.x, vP.z) * 140.0, h * 140.0));
        float s = step(0.988, hash(g)) * smoothstep(0.08, 0.4, h);
        c += vec3(1.0, 0.9, 0.7) * s * (0.5 + 0.5 * sin(uTime * 1.7 + hash(g + 7.0) * 40.0));
        // Aurora: golden curtains of light that ripple with the music.
        float a = atan(vP.x, -vP.z);
        float band = sin(a * 3.0 + uTime * 0.15 + sin(a * 7.0 - uTime * 0.4) * 0.6);
        float curtain = smoothstep(0.12, 0.3, h) * smoothstep(0.75, 0.32, h + band * 0.06);
        float rays = 0.55 + 0.45 * sin(a * 40.0 + uTime * 0.8 + band * 4.0);
        vec3 ac = mix(vec3(1.0, 0.72, 0.22), hue(fract(1.06 + 0.08 * sin(uHue * 6.2832))), 0.55);
        ac = mix(ac, vec3(1.0, 0.25, 0.1), uDanger * 0.8);
        c += ac * curtain * rays * (0.16 + 0.5 * uAur) * (0.6 + 0.4 * band);
        // Moon + halo.
        float m = dot(vP, uMoon);
        c = mix(c, vec3(1.0, 0.86, 0.55), smoothstep(0.9988, 0.9992, m));
        c += vec3(1.0, 0.7, 0.3) * (pow(max(m, 0.0), 300.0) * 0.6 + pow(max(m, 0.0), 30.0) * 0.12) * (1.0 + uFlash);
        c += vec3(0.4, 0.25, 0.06) * uPulse * smoothstep(0.25, 0.0, abs(h - 0.05));
        c += vec3(0.5, 0.35, 0.1) * uFlash * 0.5;
        gl_FragColor = vec4(c * uDim, 1.0);
      }`,
  })));
  sky.renderOrder = -10;
  root.add(sky);

  // Far shore: hills with village lights + a glittering opera house.
  const shoreTex = kit.canvasTex(512, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#0b0602'; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, h * 0.62 - 18 * Math.sin(x * 0.013) - 10 * Math.sin(x * 0.041 + 1) - 6 * Math.sin(x * 0.11));
    g.lineTo(w, h); g.fill();
    for (let i = 0; i < 160; i++) { const x = (i * 97.3) % w, y = h * 0.7 + ((i * 53) % 26); g.fillStyle = i % 5 ? 'rgba(255,190,90,0.8)' : 'rgba(255,240,190,0.95)'; g.fillRect(x, y, 1.5, 1.5); }
    // Opera house at ~x=0.72: dome, columns, lit windows.
    const ox = w * 0.72, oy = h * 0.66;
    g.fillStyle = '#1a0e04'; g.fillRect(ox - 40, oy - 16, 80, 22); g.beginPath(); g.arc(ox, oy - 16, 18, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(255,200,90,0.95)';
    for (let k = -3; k <= 3; k++) g.fillRect(ox + k * 10 - 2, oy - 12, 4, 14);
    g.fillStyle = 'rgba(255,230,150,1)'; g.beginPath(); g.arc(ox, oy - 34, 2.5, 0, TAU); g.fill();
  });
  shoreTex.wrapS = THREE.RepeatWrapping; shoreTex.repeat.set(3, 1);
  const shore = new THREE.Mesh(keep(new THREE.CylinderGeometry(150, 150, 22, 48, 1, true)), keep(new THREE.MeshBasicMaterial({ map: shoreTex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false })));
  shore.position.y = 6; shore.renderOrder = -9; root.add(shore);

  // ── Mirror lake ────────────────────────────────────────────────────
  const lakeU = { uTime: { value: 0 }, uFlash: { value: 0 }, uMoonX: { value: MOON.x / MOON.z }, uDanger: { value: 0 }, uDim: { value: 1 }, uGold: { value: 0.5 } };
  const lake = new THREE.Mesh(keep(new THREE.PlaneGeometry(400, 300)), keep(new THREE.ShaderMaterial({
    uniforms: lakeU, depthWrite: true,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform float uTime, uFlash, uMoonX, uDanger, uDim, uGold;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 V = normalize(vW - cameraPosition);
        float fres = pow(1.0 - abs(V.y), 4.0);
        vec3 c = vec3(0.012, 0.008, 0.004);
        vec3 hor = mix(vec3(0.3, 0.17, 0.04), vec3(0.42, 0.07, 0.03), uDanger);
        c += hor * fres * 0.32 + vec3(0.03, 0.018, 0.004) * smoothstep(-200.0, 0.0, vW.z);
        // Moon glitter path: broken shimmer on small waves.
        float w = sin(vW.x * 1.7 + uTime * 1.3) * sin(vW.z * 2.3 - uTime * 0.9) + sin(vW.x * 4.1 - vW.z * 3.3 + uTime * 2.0) * 0.5;
        float mx = cameraPosition.x + (vW.z - cameraPosition.z) * uMoonX; float path = exp(-pow((vW.x - mx) / (1.5 + 0.05 * abs(vW.z - cameraPosition.z)), 2.0));
        float glit = smoothstep(0.55, 1.0, w) * path;
        c += vec3(1.0, 0.75, 0.35) * (glit * 0.9 + path * 0.05) * smoothstep(5.0, -60.0, vW.z) * (0.6 + uGold);
        c += vec3(0.5, 0.32, 0.08) * uFlash * 0.4 * fres;
        gl_FragColor = vec4(c * uDim, 1.0);
      }`,
  })));
  lake.rotation.x = -Math.PI / 2; lake.position.set(0, 0, -100);
  root.add(lake);

  // ── Violins ────────────────────────────────────────────────────────
  // Body (extruded outline), neck + fingerboard, scroll, tailpiece, bridge:
  // merged, vertex-coloured. Strings are a separate instanced mesh sharing
  // the matrices so they can glow / pluck.
  const vb = new kit.Builder();
  const body = new THREE.ExtrudeGeometry(violinShape(THREE), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 1, curveSegments: 5 });
  body.translate(0, 0, -0.035);
  vb.add(body, new THREE.Matrix4(), 0xb8501a);
  vb.box(0.034, 0.27, 0.03, 0, 0.14, 0.045, 0x1a0c04);              // fingerboard
  vb.box(0.028, 0.08, 0.04, 0, 0.3, 0.02, 0x7a3410);                // peg box
  vb.add(new THREE.TorusGeometry(0.022, 0.011, 5, 10), vb.m4(0, 0.35, 0.02, 0, Math.PI / 2, 0), 0x8a3c12);  // scroll
  vb.box(0.07, 0.012, 0.012, 0, 0.33, 0.02, 0x1a0c04, 0, 0, 0);     // pegs
  vb.box(0.05, 0.08, 0.012, 0, -0.24, 0.05, 0x140804);              // tailpiece
  vb.box(0.07, 0.025, 0.01, 0, -0.14, 0.06, 0xe8c890);              // bridge
  vb.box(0.008, 0.06, 0.004, -0.04, -0.15, 0.047, 0x140804);        // f-holes
  vb.box(0.008, 0.06, 0.004, 0.04, -0.15, 0.047, 0x140804);
  const violinGeo = vb.build();
  const sb = new kit.Builder();
  for (let k = 0; k < 4; k++) sb.box(0.0035, 0.56, 0.0035, -0.012 + k * 0.008, 0.03, 0.068, 0xffffff);
  const stringGeo = sb.build();
  const vMat = keep(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2a1000 }));
  const gMat = keep(new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xffe080, emissive: 0x5a3a00 }));
  const sMat = keep(new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false }));
  const VN = low ? 40 : 64, CN = low ? 18 : 28;
  const rainMesh = new THREE.InstancedMesh(violinGeo, vMat, VN), rainStr = new THREE.InstancedMesh(stringGeo, sMat, VN);
  const goldMesh = new THREE.InstancedMesh(violinGeo, gMat, CN), goldStr = new THREE.InstancedMesh(stringGeo, sMat, CN);
  for (const m of [rainMesh, rainStr, goldMesh, goldStr]) { m.frustumCulled = false; root.add(m); }

  const CAM_Z = 13;
  const hwAt = (z) => (CAM_Z - z) * 0.52 * 1.6;          // rough visible half-width at depth z (landscape)
  const rain = [];
  let portrait = false;
  const spawnV = (v, top) => {
    v.z = -30 + Math.pow(Math.random(), 0.8) * 30;
    const side = Math.random() < 0.5 ? -1 : 1, hw = hwAt(v.z);
    // Landscape: mostly either side of the board; portrait: across the strip above/below it.
    v.x = portrait ? side * Math.random() * hw * 0.32 : side * hw * (Math.random() < 0.18 ? Math.random() * 0.5 : 0.42 + 0.6 * Math.random());
    v.y = top ? 15 + Math.random() * 6 : 1 + Math.random() * 18;
    v.vy = 1.6 + Math.random() * 1.6; v.vx = 0; v.s = 1.4 + Math.random() * 1.1;
    v.ry = Math.random() * TAU; v.wy = (Math.random() - 0.5) * 1.2;   // yaw + yaw rate (pirouette)
    v.rx = Math.random() * TAU; v.wx = (Math.random() - 0.5) * 0.9;   // tumble
    v.tilt = 0; v.dir = Math.random() < 0.5 ? -1 : 1; v.ph = Math.random() * TAU; v.on = true;
  };
  for (let i = 0; i < VN; i++) { const v = {}; spawnV(v, false); rain.push(v); }
  const gold = Array.from({ length: CN }, () => ({ on: false }));
  let goldCur = 0;
  const cascade = (n, x, spread, speed = 1) => {
    for (let k = 0; k < n; k++) {
      const v = gold[goldCur = (goldCur + 1) % CN];
      spawnV(v, true);
      v.x = x + (Math.random() - 0.5) * spread; v.z = -6 - Math.random() * 18; v.y = 14 + Math.random() * 6;
      v.vy = (6 + Math.random() * 4) * speed; v.s = 1.8 + Math.random() * 0.9; v.wy = (Math.random() - 0.5) * 6;
    }
  };

  // ── Sprites: glows, rings, notes, sparkles (one additive batch) ─────
  const atlasTex = kit.atlas([kit.paint.glow, kit.paint.ring, kit.paint.sparkle, kit.paint.glyph('♪'), kit.paint.glyph('♫'), kit.paint.glyph('♬'), kit.paint.glyph('♩'), kit.paint.soft], 4, 512);
  const fx = new kit.SpriteBatch(low ? 700 : 1100, atlasTex, { cells: 4, additive: true, order: 6 });
  root.add(fx.mesh);
  const parts = new kit.Particles(low ? 360 : 600);
  const CELL = { glow: 0, ring: 1, spark: 2, note: 3, soft: 7 };

  // Ambient gold dust drifting in the air.
  const DUST = low ? 70 : 130;
  const dust = Array.from({ length: DUST }, () => ({ x: (Math.random() - 0.5) * 60, y: Math.random() * 16, z: -30 + Math.random() * 34, ph: Math.random() * TAU, s: 0.05 + Math.random() * 0.08 }));

  // ── Music staves across the sky (5 lines each) with riding notes ────
  const STAVES = [{ y: 11.5, z: -26, amp: 1.1, k: 0.09, sp: 0.9, ph: 0 }, { y: 8.2, z: -17, amp: 0.8, k: 0.12, sp: -0.7, ph: 2 }, { y: 13.5, z: -40, amp: 1.5, k: 0.06, sp: 0.5, ph: 4 }];
  const SEG = low ? 36 : 56, LINES = STAVES.length * 5, SPAN = 70;
  const stPos = new Float32Array(LINES * (SEG + 1) * 2 * 3), stCol = new Float32Array(LINES * (SEG + 1) * 2 * 3), stIdx = [];
  for (let l = 0; l < LINES; l++) for (let j = 0; j < SEG; j++) { const a = (l * (SEG + 1) + j) * 2; stIdx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const stGeo = keep(new THREE.BufferGeometry());
  stGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3).setUsage(THREE.DynamicDrawUsage));
  stGeo.setAttribute('color', new THREE.BufferAttribute(stCol, 3).setUsage(THREE.DynamicDrawUsage));
  stGeo.setIndex(stIdx);
  const staves = new THREE.Mesh(stGeo, keep(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  staves.frustumCulled = false; staves.renderOrder = 4; root.add(staves);
  const NOTES_PER = 9;
  const staffNotes = [];
  STAVES.forEach((s, si) => { for (let k = 0; k < NOTES_PER; k++) staffNotes.push({ si, u: (k + Math.random() * 0.6) / NOTES_PER, line: Math.floor(Math.random() * 9) * 0.5, cell: 3 + (k % 4), lit: 0, hop: 0, hv: 0 }); });
  const ripples = [];   // traveling staff ripples { x0, dir, t, amp }
  const staffY = (s, x, t) => {
    let y = s.y + Math.sin(x * s.k + t * s.sp + s.ph) * s.amp;
    for (const r of ripples) { const d = x - (r.x0 + r.dir * r.t * 22); y += Math.sin(d * 0.5) * Math.exp(-d * d / 40) * r.amp * Math.exp(-r.t * 1.2); }
    return y;
  };

  // ── Light shafts from the sky onto the lake ─────────────────────────
  const shaftGeo = keep(new THREE.CylinderGeometry(0.4, 3.2, 26, 18, 1, true));
  shaftGeo.translate(0, -13, 0);
  const shafts = [];
  for (const [x, z] of [[-16, -16], [-9, -8], [-22, -26], [16, -14], [9, -9], [23, -24]]) {
    const mat = keep(new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0.1 }, uCol: { value: new THREE.Color(1, 0.8, 0.45) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uK; uniform vec3 uCol; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.5); float a = uK * e * smoothstep(0.0, 0.25, vUv.y) * (0.35 + 0.65 * vUv.y); gl_FragColor = vec4(uCol * a, 1.0); }',
    }));
    mat.blending = THREE.CustomBlending; mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneFactor;
    const m = new THREE.Mesh(shaftGeo, mat);
    m.position.set(x, 26, z); m.renderOrder = 3; root.add(m);
    shafts.push({ m, mat, x, z, ph: Math.random() * TAU, side: Math.sign(x) });
  }

  // ── Lights (hemi + 1 directional; the rest is emissive/additive) ────
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x2a1404, 1.4);
  const key = new THREE.DirectionalLight(0xffe2b0, 1.6); key.position.set(-6, 10, 8);
  root.add(hemi, key);

  // ── State ───────────────────────────────────────────────────────────
  const st = {
    pluck: 0, jolt: 0, pump: 0, cheer: 0, flash: 0, push: 0, freeze: 0, vortex: 0, gust: 0, dim: 1, dimT: 1,
    aur: 0.4, aurHue: 0, aurSpin: 0, combo: 0, strobe: 0, strobeN: 0, swing: kit.spring(), shake: 0, level: 1, over: false, converge: 0, tremolo: 0,
  };
  const colX = (c) => { const u = ((c ?? 4.5) - 4.5) / 4.5; return Math.sign(u || 1) * (9 + 7 * Math.abs(u)); };  // piece side → world x (outside the board)
  const ringAt = (x, z, size, k, gold = true) => { const o = parts.spawn(x, 0.03, z, CELL.ring, 1.4); o.flat = 1; o.size = size; o.grow = 5 + size; o.a = k; o.r = 1; o.gg = gold ? 0.78 : 0.95; o.b = gold ? 0.4 : 0.85; };
  const splash = (x, z, n, k = 1) => {
    ringAt(x, z, 0.6, 0.5 * k);
    for (let i = 0; i < n; i++) { const o = parts.spawn(x, 0.1, z, CELL.glow, 0.7 + Math.random() * 0.4); o.vx = (Math.random() - 0.5) * 2; o.vz = (Math.random() - 0.5) * 2; o.vy = 2 + Math.random() * 3; o.g = 9; o.size = 0.18; o.r = 1; o.gg = 0.85; o.b = 0.55; o.a = 0.8 * k; }
  };
  const noteBurst = (x, y, z, n, spread = 2, up = 3) => {
    for (let i = 0; i < n; i++) {
      const o = parts.spawn(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread * 0.5, z, 3 + (i % 4), 2.2 + Math.random());
      o.vx = (Math.random() - 0.5) * 3; o.vy = up * (0.6 + Math.random() * 0.8); o.g = 1.2; o.drag = 0.6; o.size = 0.9 + Math.random() * 0.6; o.vr = (Math.random() - 0.5) * 2; o.rot = (Math.random() - 0.5) * 0.6;
      o.r = 1; o.gg = 0.82 + Math.random() * 0.15; o.b = 0.35 + Math.random() * 0.3; o.wob = 0.4;
    }
  };

  let lastDanger = 0, songT = 0;

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0; songT = t;
    const ph = frac(beat), onBeat = Math.exp(-ph * 6), kick = Math.exp(-frac(beat) * 9);
    const danger = clamp(info.danger || 0, 0, 1); lastDanger += (danger - lastDanger) * Math.min(1, dt * 2);
    const dz = clamp((lastDanger - 0.55) / 0.4, 0, 1);
    // Pulses (game-side pulses add on top of events).
    const mv = info.move || 0, ch = info.cheer || 0, fl = info.flash || 0;
    st.pluck = Math.max(0, st.pluck - dt * 3); st.jolt = Math.max(0, st.jolt - dt * 2.2); st.pump = Math.max(0, st.pump - dt * 1.4);
    st.cheer = Math.max(0, st.cheer - dt * 0.4); st.flash = Math.max(0, st.flash - dt * 1.6); st.push = Math.max(0, st.push - dt * 1.2);
    st.freeze = Math.max(0, st.freeze - dt); st.vortex = Math.max(0, st.vortex - dt * 0.4); st.converge = Math.max(0, st.converge - dt * 0.6);
    st.tremolo = Math.max(0, st.tremolo - dt * 2); st.shake = Math.max(0, st.shake - dt * 2.5);
    st.aur += ((0.35 + 0.5 * st.cheer + 0.8 * st.flash + 0.4 * dz) - st.aur) * Math.min(1, dt * 3);
    st.aurSpin += dt * (0.02 + 0.05 * st.combo);
    st.dim += (st.dimT - st.dim) * Math.min(1, dt * 1.5);
    if (st.strobeN > 0) { st.strobe += dt * 10; if (st.strobe > 1) { st.strobe = 0; st.strobeN--; } }
    const strobe = st.strobeN > 0 && st.strobe < 0.5 ? 1 : 0;
    const cheer = Math.max(st.cheer, ch), flash = Math.max(st.flash, fl), pluck = Math.max(st.pluck, mv * 0.8);
    const gustX = Math.sin(t * 0.7) * 3 * dz + st.gust;
    st.gust *= Math.exp(-dt * 2);
    const swing = kit.stepSpring(st.swing, dt, 0.8, 0.25);

    // Violins: the old 2D fall boost, stacked — clears, flash, slam, moves, beat.
    const frozen = st.freeze > 0 ? 0.06 : 1;
    const boost = (1 + cheer * 1.6 + flash * 1.2 + st.jolt * 5 + st.push * 1.5 + pluck * 0.5 + kick * 0.3 + dz * 0.8) * (st.over ? 1.8 : 1);
    const sway = 0.3 + cheer * 0.9 + dz * 0.4, grow = 1 + 0.45 * st.pump + 0.08 * kick;
    const dk = Math.exp(-dt * 3);
    fx.begin();
    const glowK = 0.12 + 0.35 * cheer + 0.5 * flash + 0.35 * st.jolt + 0.25 * pluck + 0.6 * (st.freeze > 0 ? 1 : 0);
    const placeViolin = (v, i, mesh, strMesh, isGold) => {
      dummy.position.set(v.x + Math.sin(t * 0.42 + v.ph) * sway, v.y, v.z);
      dummy.rotation.set(Math.sin(v.rx) * 0.5 + 0.7 * st.jolt, v.ry, Math.sin(v.rx * 0.7 + v.ph) * 0.4 + v.tilt, 'YXZ');
      dummy.scale.setScalar(v.s * grow);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (st.tremolo > 0 || pluck > 0.05) { dummy.position.x += (Math.random() - 0.5) * 0.02 * (st.tremolo + pluck); dummy.updateMatrix(); }
      strMesh.setMatrixAt(i, dummy.matrix);
      const gk = isGold ? 0.5 + glowK : glowK * (0.6 + 0.4 * Math.sin(v.ph + t * 2));
      fx.add(v.x + Math.sin(t * 0.42 + v.ph) * sway, v.y, v.z, v.s * 1.6 * grow, 0, CELL.glow, 1, 0.75, 0.3, Math.min(1, gk) * (st.freeze > 0 ? 0.8 : 1));
    };
    for (let i = 0; i < VN; i++) {
      const v = rain[i];
      if (st.vortex > 0) {                       // crescendo: swirl round the centre while still falling
        const r = Math.hypot(v.x, v.z + 14), a = Math.atan2(v.z + 14, v.x) + dt * 1.6 * st.vortex * (8 / Math.max(4, r));
        v.x = Math.cos(a) * r; v.z = Math.sin(a) * r - 14;
      }
      v.y -= v.vy * boost * frozen * dt;
      v.x += (v.vx + gustX * 0.6) * dt * frozen; v.vx *= dk; v.tilt *= dk;
      v.ry += v.wy * dt * frozen * (1 + cheer); v.rx += v.wx * dt * frozen;
      if (v.y < 0) {
        if (!st.over || Math.random() < 0.5) splash(v.x, v.z, low ? 2 : 4, v.z > -18 ? 1 : 0.6);
        if (st.over) { v.y = -50; v.vy = 0; } else spawnV(v, true);
      }
      if (v.z < -34 || v.z > 3) spawnV(v, true);
      placeViolin(v, i, rainMesh, rainStr, false);
    }
    let goldLive = 0;
    for (let i = 0; i < CN; i++) {
      const v = gold[i];
      if (v.on) {
        v.vy += 4 * dt; v.y -= v.vy * dt * frozen; v.ry += v.wy * dt; v.rx += v.wx * dt * 3;
        if (v.y < 0) { v.on = false; splash(v.x, v.z, 6, 1.2); }
      }
      if (v.on) { goldLive++; placeViolin(v, i, goldMesh, goldStr, true); }
      else { dummy.scale.setScalar(0); dummy.updateMatrix(); goldMesh.setMatrixAt(i, dummy.matrix); goldStr.setMatrixAt(i, dummy.matrix); }
    }
    goldMesh.visible = goldStr.visible = goldLive > 0;
    for (const m of [rainMesh, rainStr, goldMesh, goldStr]) m.instanceMatrix.needsUpdate = true;
    // Strings light with every pluck, the big-clear flash and the beat.
    const sk = Math.min(1.6, 0.35 + 1.0 * pluck + 0.9 * flash + 0.2 * onBeat + 0.6 * st.tremolo);
    sMat.color.setRGB(sk, sk * 0.92, sk * 0.7);
    const fz = st.freeze > 0 ? 1 : 0;
    vMat.emissive.setRGB(0.16 + 0.35 * flash + 0.2 * pluck + 0.25 * dz + 0.25 * fz, 0.06 + 0.2 * flash + 0.1 * pluck + 0.3 * fz, 0.01 + 0.35 * fz);

    // Gold dust.
    for (const d of dust) {
      d.y -= dt * (0.15 + 3 * st.push + 4 * st.jolt) * frozen; d.x += (Math.sin(t * 0.3 + d.ph) * 0.2 + gustX * 0.4) * dt;
      if (d.y < 0) { d.y = 16; d.x = (Math.random() - 0.5) * 60; }
      fx.add(d.x, d.y, d.z, d.s * (1 + cheer), 0, CELL.glow, 1, 0.82, 0.5, 0.35 + 0.3 * Math.sin(t * 2 + d.ph) + 0.4 * cheer);
    }

    // Staves: ripple, light with combos, notes ride and hop.
    for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t += dt; if (ripples[i].t > 3) ripples.splice(i, 1); }
    const staffK = (0.18 + 0.12 * onBeat + 0.4 * cheer + 0.6 * flash + 0.15 * pluck) * st.dim;
    let vi = 0;
    for (let si = 0; si < STAVES.length; si++) {
      const s = STAVES[si];
      for (let L = 0; L < 5; L++) {
        const l = si * 5 + L;
        for (let j = 0; j <= SEG; j++) {
          const x = -SPAN + (2 * SPAN * j) / SEG, y = staffY(s, x, t) + L * 0.34, a = (l * (SEG + 1) + j) * 6;
          const edge = Math.min(1, Math.min(j, SEG - j) / 6);
          stPos[a] = x; stPos[a + 1] = y - 0.035; stPos[a + 2] = s.z; stPos[a + 3] = x; stPos[a + 4] = y + 0.035; stPos[a + 5] = s.z;
          const k = staffK * edge * (dz > 0 ? 1 : 1);
          stCol[a] = stCol[a + 3] = k; stCol[a + 1] = stCol[a + 4] = k * (0.72 - 0.4 * dz); stCol[a + 2] = stCol[a + 5] = k * (0.3 - 0.2 * dz);
          vi++;
        }
      }
    }
    stGeo.attributes.position.needsUpdate = stGeo.attributes.color.needsUpdate = true;
    for (const n of staffNotes) {
      const s = STAVES[n.si];
      n.u = frac(n.u + dt * 0.012 * Math.sign(s.sp));
      n.hv += (-n.hop * 60 - n.hv * 6) * dt; n.hop += n.hv * dt; n.lit = Math.max(0, n.lit - dt * 0.8);
      const x = -SPAN * 0.85 + 1.7 * SPAN * n.u, y = staffY(s, x, t) + n.line * 0.34 + 0.2 + n.hop;
      const k = (0.25 + 0.2 * onBeat + n.lit + 0.5 * flash) * st.dim;
      fx.add(x, y, s.z, 1.3 + 0.6 * n.lit, Math.sin(t + n.u * 9) * 0.2, n.cell, 1, 0.85, 0.45, Math.min(1, k));
    }

    // Shafts: sweep, swing on rotations, converge on the big moments.
    shafts.forEach((s, i) => {
      const sweep = Math.sin(t * 0.35 + s.ph) * 0.25 + swing * (i % 2 ? 1 : -0.7);
      const conv = st.converge * -s.side * 0.35;
      s.m.rotation.set(0.1 * Math.sin(t * 0.27 + s.ph), 0, sweep + conv);
      const k = (0.05 + 0.03 * onBeat + 0.12 * cheer + 0.2 * flash + 0.1 * st.converge + 0.25 * strobe * (i % 2 === (st.strobeN & 1) ? 1 : 0.3)) * st.dim;
      s.mat.uniforms.uK.value = k;
      s.mat.uniforms.uCol.value.setRGB(1, 0.8 - 0.4 * dz, 0.45 - 0.3 * dz);
      // A pool of light where the shaft lands.
      const lx = s.x + Math.sin(-(sweep + conv)) * 26, lz = s.z;
      fx.add(lx, 0.04, lz, 6, 0, CELL.glow, 1, 0.75, 0.35, k * 2.2, 0.5, 1);
    });

    // Moon glow sprite + its reflection column.
    parts.step(dt, [fx]);
    fx.end();

    // Sky / lake uniforms.
    skyU.uTime.value = t; skyU.uPulse.value = 0.5 * onBeat + cheer * 0.4; skyU.uFlash.value = flash + 0.6 * st.jolt * 0.5 + strobe * 0.3;
    skyU.uAur.value = st.aur; skyU.uHue.value = st.aurHue + st.aurSpin; skyU.uDanger.value = dz; skyU.uDim.value = st.dim;
    lakeU.uTime.value = t; lakeU.uFlash.value = flash + st.jolt * 0.5; lakeU.uDanger.value = dz; lakeU.uDim.value = st.dim; lakeU.uGold.value = 0.5 + cheer;
    hemi.intensity = 1.4 * st.dim * (1 + 0.3 * flash); key.intensity = 1.6 * st.dim * (1 + 0.4 * flash + 0.2 * onBeat);

    // ── Camera: slow drift, framed for the board covering the middle ──
    const aspect = camera.aspect || 1.6, fr = kit.framing(aspect);
    portrait = fr.portrait;
    const sh = st.shake * 0.25;
    const sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh;
    if (fr.portrait) {
      camera.fov = 72;
      camera.position.set(Math.sin(t * 0.11) * 0.6 + sx, 2.4 + Math.sin(t * 0.17) * 0.2 + sy - 0.3 * st.jolt, CAM_Z + 2);
      camera.lookAt(Math.sin(t * 0.11) * 0.3, 6.5, -14);
    } else {
      camera.fov = 56 + 3 * st.jolt + 2 * flash;
      camera.position.set(Math.sin(t * 0.11) * 1.4 + sx, 2.6 + Math.sin(t * 0.17) * 0.35 + sy - 0.4 * st.jolt, CAM_Z + Math.sin(t * 0.07) * 0.8);
      camera.lookAt(Math.sin(t * 0.11) * 0.7, 5.2, -14);
    }
    camera.rotateZ(Math.sin(t * 0.13) * 0.01 + swing * 0.02);
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position); shore.position.x = camera.position.x; shore.position.z = camera.position.z;
  }

  function react(kind, d = {}) {
    const x = colX(d.col);
    switch (kind) {
      case 'move': {                             // lurch (fanned per violin), tilt snap, pluck; staves ripple that way
        const dir = d.dir || 0;
        for (const v of rain) { v.vx += v.dir * 2.2 + dir * 1.6; v.tilt += v.dir * 0.55; }
        st.pluck = Math.min(1, st.pluck + 0.7); st.jolt = Math.max(st.jolt, 0.06);
        ripples.push({ x0: x - dir * 10, dir: dir || 1, t: 0, amp: 0.8 }); if (ripples.length > 6) ripples.shift();
        for (const n of staffNotes) if (Math.abs((n.u - 0.5) * 2 * SPAN * 0.85 - x) < 6) n.hv += 3;
        break;
      }
      case 'rotate': {                           // pirouette + shafts swing + notes hop
        const dir = d.dir || 1;
        for (const v of rain) { v.wy += dir * 7; v.tilt -= v.dir * 0.25; }
        for (const v of rain) v.wy = clamp(v.wy, -10, 10);
        st.swing.v += dir * 1.6; st.pluck = Math.min(1, st.pluck + 0.4);
        for (const n of staffNotes) n.hv += 2 + Math.random() * 2;
        break;
      }
      case 'soft':
        st.push = Math.min(1.2, st.push + 0.35); st.tremolo = Math.min(1, st.tremolo + 0.5);
        break;
      case 'drop': {                             // the sky JOLTS
        const r = d.rows || 0, k = Math.min(1, 0.3 + r / 14);
        st.jolt = Math.max(st.jolt, k); st.pump = Math.max(st.pump, 0.7 * k); st.pluck = 1; st.shake = Math.max(st.shake, k);
        for (const v of rain) { v.vx += v.dir * 2.5 * k; v.wx += (Math.random() - 0.5) * 3 * k; }
        ringAt(x, -10, 1.5, 0.9 * k); if (r >= 6) ringAt(x, -10, 0.5, 0.7 * k); if (r >= 12) { ringAt(-x * 0.8, -16, 1, 0.6); cascade(3 + (r >> 2), x, 8, 1.2); }
        break;
      }
      case 'hold':                               // fermata — the rain hangs in the air
        st.freeze = 0.7; st.tremolo = 1;
        for (const v of rain) v.vx *= 0.2;
        for (let i = 0; i < 12; i++) { const o = parts.spawn(x + (Math.random() - 0.5) * 6, 2 + Math.random() * 10, -10 + (Math.random() - 0.5) * 8, CELL.spark, 1.2); o.size = 0.6 + Math.random() * 0.6; o.r = 0.9; o.gg = 0.95; o.b = 1; o.vr = 2; }
        break;
      case 'clear': {
        const n = clamp(d.lines || 1, 1, 4), combo = d.combo || 0;
        st.combo = combo;
        st.cheer = Math.min(1.2, st.cheer + 0.3 * n + 0.06 * combo); st.pump = Math.min(1.4, 0.45 + 0.22 * n);
        cascade(n >= 4 ? CN : 2 + n * 2 + Math.min(combo, 4), n >= 4 ? 0 : x, n >= 4 ? 44 : 8, n >= 4 ? 1.3 : 1);
        const nb = 5 * n + 3 * Math.min(combo, 6);
        noteBurst(x, 9, -17, nb, 6, 2.5 + n * 0.5);
        if (n >= 2) st.converge = Math.min(1.2, 0.5 + 0.2 * n);
        if (n >= 3) { ringAt(x, -12, 1, 0.9); ringAt(-x, -18, 1, 0.7); }
        if (n >= 4) { st.flash = 1; st.strobeN = 6 + Math.min(combo, 6); st.aurHue += 0.08; noteBurst(-x, 10, -22, 16, 10, 4); st.shake = 0.6; }
        if (combo >= 2) { st.strobeN = Math.max(st.strobeN, Math.min(8, combo)); for (let i = 0; i < Math.min(combo, 8); i++) ringAt(x + (i - combo / 2) * 2.5, -8 - i * 2, 0.8, 0.6); }
        for (const nn of staffNotes) if (Math.random() < 0.25 + 0.15 * n + 0.08 * combo) { nn.lit = 1; nn.hv += 4; }
        break;
      }
      case 'levelUp':                            // crescendo vortex + key change
        st.level = d.level || st.level + 1;
        st.vortex = 1.2; st.aurHue += 0.17; st.flash = Math.max(st.flash, 0.6); st.cheer = 1;
        cascade(CN, 0, 44, 1); noteBurst(-12, 9, -15, 14, 6, 4); noteBurst(12, 9, -15, 14, 6, 4);
        break;
      case 'gameOver':
        st.over = true; st.dimT = 0.35; st.freeze = 0; st.vortex = 0; st.strobeN = 0;
        break;
      case 'start':
        st.over = false; st.dimT = 1; st.dim = 0.4; st.combo = 0; st.aurHue = 0;
        for (const v of rain) if (v.y < 0) spawnV(v, true);
        cascade(12, 0, 44, 0.8); st.flash = 0.5;
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      for (const m of [rainMesh, rainStr, goldMesh, goldStr]) m.dispose();
      kit.dispose();
    },
  };
}
