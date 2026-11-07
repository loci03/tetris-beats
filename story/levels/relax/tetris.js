// RELAX YOUR MIND — the living Tetris world: a mirror lake at dusk.
//
// The old 2D background was a zen night: a purple-pink sky with twinkling
// stars, a soft moon with a halo, drifting pink clouds (nudged along by
// piece moves), mountain silhouettes with an accent rim, an aurora ribbon
// swelling with the music and with clears, a slowly turning mandala with a
// segment lit on every beat (spinning faster on clears), a breathing candle
// glow at its centre, meditation rings expanding every second (faster after
// a clear), a "brainwave" sine pulse across the screen on each clear, a
// shock ring on hard drops and dust motes that speed up on input.
//
// Here it all sits round a perfectly still lake that mirrors the sky (the
// sky — gradient, stars, moon, aurora, clouds, mountain ridges — is one
// shader function, and the water reflects it through its ripples). A huge
// glowing mandala floats on the water, lotus candles drift and bob, fire-
// flies wander, sky lanterns float up for big moments.
//
// Reactions:
//   move     → a ripple rings out on the water on the piece's side, the
//              clouds glide that way and the fireflies drift with them
//   rotate   → the mandala turns a step that way, a segment flares
//   soft     → a light raindrop ripple near the shore, the moon breathes
//   drop     → a shock ring sweeps across the lake from the piece's
//              column (bigger with the drop height), lotus candles bob
//   hold     → an ensō is brushed round the moon
//   clear    → a brainwave pulse runs along the horizon (taller per line),
//              the aurora swells, meditation rings speed up, the candles
//              flare; TETRIS = the aurora blooms, the mandala blazes and
//              sky lanterns float up off the lake
//   combo    → the aurora shifts hue faster, more lanterns rise
//   levelUp  → an ensō + a lantern release + the mandala spins up
//   danger   → wind: the lake turns choppy and the clouds darken
//   gameOver → mist rolls in, the moon dims, the candles go out
//   start    → one drop in the middle of the lake

const SKY_FN = `
uniform float uT, uAur, uAurHue, uCloud, uMoonK, uEnso, uEnsoA, uDim, uWind, uBeat;
uniform vec3 uMoon;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ return 0.62 * vnoise(p) + 0.38 * vnoise(p * 2.3); }
vec3 hue2rgb(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
vec3 skyCol(vec3 d, float refl){
  float y = d.y, az = atan(d.x, -d.z);
  vec3 c = mix(vec3(0.23, 0.09, 0.33), vec3(0.08, 0.03, 0.16), smoothstep(0.0, 0.35, y));
  c = mix(c, vec3(0.035, 0.012, 0.08), smoothstep(0.3, 0.9, y));
  c += vec3(0.35, 0.12, 0.3) * exp(-y * 9.0) * 0.6;
#ifndef REFL
  // Stars.
  vec2 sg = floor(vec2(az * 120.0, y * 120.0));
  float s = step(0.988, hh(sg)) * smoothstep(0.06, 0.25, y) * (1.0 - refl * 0.6);
  c += vec3(1.0) * s * (0.5 + 0.4 * sin(uT * 1.4 + hh(sg + 2.0) * 40.0)) * (1.0 - uDim * 0.7);
#endif
  // Aurora ribbon (3 bands).
#ifdef REFL
  for (int b = 0; b < 1; b++) {
#else
  for (int b = 0; b < 3; b++) {
#endif
    float fb = float(b);
    float cy = 0.3 + fb * 0.025 + (0.03 + 0.05 * uAur) * sin(az * 4.0 + uT * 0.7 + fb * 0.6);
    float dy = y - cy;
    float band = exp(-pow(dy / (0.022 + 0.012 * uAur), 2.0)) + 0.6 * exp(-max(dy, 0.0) * 14.0) * step(0.0, dy) * exp(-pow(dy / 0.12, 2.0));
    float curtain = 0.82 + 0.18 * sin(az * 26.0 + uT * 0.9 + fb * 2.0) * sin(az * 7.0 - uT * 0.4);
    c += hue2rgb(fract(uAurHue + fb * 0.06)) * band * curtain * (0.07 + 0.22 * uAur) * (1.0 - 0.3 * fb);
  }
  // Moon + halo.
  float md = dot(d, uMoon);
  c += vec3(1.0, 0.82, 0.92) * pow(max(md, 0.0), 250.0) * (0.3 + 0.15 * uMoonK) * (1.0 - 0.6 * uDim) * (1.0 - 0.5 * refl);
  c = mix(c, mix(vec3(0.88, 0.7, 0.84), vec3(1.0, 0.97, 0.98), smoothstep(0.99935, 0.99985, md)), smoothstep(0.9992, 0.99935, md) * (1.0 - 0.5 * uDim) * (1.0 - 0.65 * refl));
#ifndef REFL
  // Ensō: a brush circle painted round the moon.
  if (uEnsoA > 0.0) {
  vec3 up = vec3(0.0, 1.0, 0.0), mx = normalize(cross(up, uMoon)), my = cross(uMoon, mx);
  vec2 mp = vec2(dot(d, mx), dot(d, my));
  float er = length(mp), ea = fract(atan(mp.y, mp.x) / 6.2832 + 0.3);
  float brush = 0.006 + 0.004 * sin(ea * 9.0) * (1.0 - ea);
  float ens = smoothstep(brush, brush * 0.4, abs(er - 0.11)) * step(ea, uEnso) * step(0.0, md) * (0.6 + 0.4 * vnoise(mp * 400.0));
  c += vec3(1.0, 0.62, 0.86) * ens * uEnsoA;
  }
  // Clouds drifting.
  vec2 cp = vec2(az * 3.0 + uCloud, y * 9.0);
  float cl = smoothstep(0.5, 0.85, fbm(cp)) * smoothstep(0.05, 0.14, y) * smoothstep(0.42, 0.22, y);
  c = mix(c, mix(vec3(0.6, 0.35, 0.55), vec3(0.18, 0.12, 0.2), uWind * 0.8 + uDim * 0.5), cl * 0.45);
#else
  c *= 1.0 + 0.0 * refl;
#endif
  // Mountain ridges (two layers), accent rim on the crests.
  float r1 = 0.05 + 0.05 * sin(az * 3.1 + 1.0) + 0.03 * sin(az * 7.3) + 0.012 * sin(az * 23.0);
  float r2 = 0.02 + 0.03 * sin(az * 5.3 + 2.0) + 0.012 * sin(az * 13.0 + 0.5) + 0.006 * sin(az * 41.0);
  float ay = abs(y);
  c = mix(c, vec3(0.13, 0.06, 0.2), step(ay, r1));
  c += vec3(0.78, 0.6, 1.0) * smoothstep(0.004, 0.0, abs(ay - r1)) * (0.12 + 0.1 * uBeat);
  c = mix(c, vec3(0.06, 0.025, 0.1), step(ay, r2));
  return c;
}`;

const SKY_VS = 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const SKY_FS = `varying vec3 vP;
${SKY_FN}
uniform vec3 uMist;
void main(){
  vec3 c = skyCol(normalize(vP), 0.0);
  c = mix(c, uMist, uDim * 0.55 * smoothstep(0.3, 0.0, vP.y));
  gl_FragColor = vec4(c, 1.0);
}`;

const WATER_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const WATER_FS = `#define REFL 1
varying vec3 vW;
${SKY_FN}
uniform vec4 uRip[8];
uniform float uRipG[8];
uniform vec3 uAccent, uMist;
void main(){
  vec2 p = vW.xz;
  vec2 g = vec2(0.0); float glow = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 r = uRip[i];
    if (r.w <= 0.0) continue;
    vec2 dv = p - r.xy; float d = length(dv) + 1e-3;
    float rad = r.z * 3.2, x = d - rad;
    float env = exp(-x * x * 1.2) * exp(-0.7 * r.z) * r.w;
    float dh = env * (3.0 * cos(x * 3.0) - 2.4 * x * sin(x * 3.0));
    g += dh * dv / d;
    glow += env * uRipG[i] * smoothstep(0.35, 0.0, abs(x));
  }
  // Ambient wind ripples (choppier with danger).
  float wv = 0.02 + 0.12 * uWind;
  g += wv * vec2(sin(p.x * 1.7 + uT * 1.3 + sin(p.y * 0.9)), sin(p.y * 2.3 - uT * 1.1 + p.x * 0.4));
  g += 0.015 * vec2(sin(p.x * 5.0 + p.y * 3.0 + uT * 2.0), cos(p.y * 6.0 - uT * 2.3));
  vec3 n = normalize(vec3(-g.x * 0.12, 1.0, -g.y * 0.12));
  vec3 V = normalize(vW - cameraPosition);
  vec3 R = reflect(V, n);
  R.y = abs(R.y);
  vec3 c = skyCol(R, 1.0) * 0.82;
  // Moon glitter path.
  c += vec3(1.0, 0.8, 0.92) * pow(max(dot(R, uMoon), 0.0), 900.0) * 0.8 * (1.0 - 0.6 * uDim);
  c += uAccent * glow * 0.9;
  float fr = pow(1.0 - max(-V.y, 0.0), 4.0);
  c = mix(c * 0.7, c, fr);
  float dist = length(vW - cameraPosition);
  c = mix(c, uMist * 0.8, (0.15 + 0.6 * uDim) * smoothstep(20.0, 80.0, dist));
  gl_FragColor = vec4(c, 1.0);
}`;

const MANDALA_VS = 'varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const MANDALA_FS = `varying vec2 vUv;
uniform float uAng, uSeg, uSegK, uGlow, uFlare, uDim;
uniform vec3 uA, uB;
void main(){
  float r = length(vUv), a = atan(vUv.y, vUv.x) - uAng;
  float seg = mod(floor((a / 6.2832) * 12.0 + 12.0), 12.0);
  float sa = fract((a / 6.2832) * 12.0 + 12.0);
  float spoke = smoothstep(0.035, 0.0, abs(sa - 0.5) * r * 0.6) * step(0.18, r) * step(r, 0.92);
  float ring = smoothstep(0.012, 0.0, abs(r - 0.92)) + smoothstep(0.01, 0.0, abs(r - 0.18)) + 0.6 * smoothstep(0.008, 0.0, abs(r - 0.55));
  float petal = smoothstep(0.02, 0.0, abs(r - (0.55 + 0.18 * abs(sin(sa * 3.1416))))) * step(0.37, r) * step(r, 0.74);
  float petal2 = smoothstep(0.015, 0.0, abs(r - (0.2 + 0.14 * abs(sin(sa * 6.2832))))) * step(r, 0.36);
  float lit = step(abs(seg - uSeg), 0.5) * uSegK;
  float k = (spoke * (0.35 + 1.4 * lit) + ring * 0.6 + petal * (0.45 + 0.8 * lit) + petal2 * 0.5) * (0.55 + uGlow) + uFlare * (spoke + ring + petal) * 1.2;
  float core = exp(-r * r * 30.0) * (0.5 + uGlow + uFlare);
  vec3 c = mix(uA, uB, smoothstep(0.2, 0.9, r)) * k + vec3(1.0, 0.75, 0.9) * core;
  gl_FragColor = vec4(c * (1.0 - 0.7 * uDim) * smoothstep(1.0, 0.95, r), 1.0);
}`;

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = null;
  scene.background = new THREE.Color(0x140820);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t);
  };
  const ACCENT = new THREE.Color(0.78, 0.6, 1.0), GLOWC = new THREE.Color(1.0, 0.62, 0.85), MIST = new THREE.Color(0.32, 0.22, 0.4);

  // Shared sky uniforms (sky + water + their reflection).
  const U = {
    uT: { value: 0 }, uAur: { value: 0 }, uAurHue: { value: 0 }, uCloud: { value: 0 }, uMoonK: { value: 0 },
    uEnso: { value: 0 }, uEnsoA: { value: 0 }, uDim: { value: 0 }, uWind: { value: 0 }, uBeat: { value: 0 },
    uMoon: { value: new THREE.Vector3(-0.5, 0.3, -0.8).normalize() }, uMist: { value: MIST },
  };
  // Upper dome only: below the horizon the lake covers everything.
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(150, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.53)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: U, vertexShader: SKY_VS, fragmentShader: SKY_FS,
  })));
  sky.renderOrder = -10;
  root.add(sky);

  // ── The lake ────────────────────────────────────────────────────
  const rip = [], ripG = [];
  for (let i = 0; i < 8; i++) { rip.push(new THREE.Vector4(0, 0, 0, 0)); ripG.push(0); }
  const waterMat = keep(new THREE.ShaderMaterial({
    uniforms: { ...U, uRip: { value: rip }, uRipG: { value: ripG }, uAccent: { value: ACCENT.clone() } },
    vertexShader: WATER_VS, fragmentShader: WATER_FS,
  }));
  const water = new THREE.Mesh(keep(new THREE.PlaneGeometry(300, 300)), waterMat);
  water.rotation.x = -Math.PI / 2;
  root.add(water);
  const ripples = []; for (let i = 0; i < 8; i++) ripples.push({ x: 0, z: 0, t: 0, a: 0, g: 0 });
  let ripI = 0;
  const ripple = (x, z, a, g = 0.5) => {
    // Reuse the slot that's faded the most.
    let best = ripples[ripI++ % 8];
    for (const r of ripples) if (r.a * Math.exp(-0.7 * r.t) < best.a * Math.exp(-0.7 * best.t)) best = r;
    Object.assign(best, { x, z, t: 0, a, g });
  };

  // ── The mandala floating on the water ───────────────────────────
  const mandMat = keep(new THREE.ShaderMaterial({
    uniforms: { uAng: { value: 0 }, uSeg: { value: 0 }, uSegK: { value: 1 }, uGlow: { value: 0 }, uFlare: { value: 0 }, uDim: { value: 0 }, uA: { value: GLOWC.clone() }, uB: { value: ACCENT.clone() } },
    vertexShader: MANDALA_VS, fragmentShader: MANDALA_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const mandala = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 26)), mandMat);
  mandala.rotation.x = -Math.PI / 2; mandala.position.set(0, 0.03, -9);
  root.add(mandala);

  // ── Lotus candles drifting on the water ─────────────────────────
  const lotusProf = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; lotusProf.push(new THREE.Vector2(0.05 + 0.32 * Math.sin(t * 1.5), t * 0.22)); }
  const lotusGeo = keep(new THREE.LatheGeometry(lotusProf, 8));
  const lotusMat = keep(new THREE.MeshBasicMaterial({ color: 0xff9ed8 }));
  const NL = low ? 10 : 18;
  const lotus = [];
  for (let i = 0; i < NL; i++) {
    const side = i % 2 ? 1 : -1;
    lotus.push({ x: side * (3.5 + Math.random() * 12), z: -2 - Math.random() * 22, ph: Math.random() * 6, vx: 0, bob: 0, bobV: 0, flare: 0 });
  }
  const lotusMesh = new THREE.InstancedMesh(lotusGeo, lotusMat, NL);
  lotusMesh.frustumCulled = false; root.add(lotusMesh);
  const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  // Flames + reflections + fireflies + sky lanterns' glows: one Points cloud.
  const NFF = low ? 60 : 110, NSL = 28;
  const NP = NL * 2 + NFF + NSL;
  const pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pSize = new Float32Array(NP);
  const pGeo = keep(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
  const pMat = keep(new THREE.ShaderMaterial({
    uniforms: { uMap: { value: glowTex }, uScale: { value: 400 } },
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float uScale;
      void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform sampler2D uMap; varying vec3 vC; void main(){ gl_FragColor = vec4(vC * texture2D(uMap, gl_PointCoord).r, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; root.add(pts);
  const flies = [];
  for (let i = 0; i < NFF; i++) flies.push({ x: (Math.random() - 0.5) * 40, y: 0.3 + Math.random() * 5, z: 2 - Math.random() * 26, vx: 0, ph: Math.random() * 6, sp: 0.2 + Math.random() * 0.5 });
  // Sky lanterns.
  const lantMat = keep(new THREE.MeshBasicMaterial({ color: 0xffb070 }));
  const lantMesh = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.22, 0.16, 0.42, 6)), lantMat, NSL);
  lantMesh.frustumCulled = false; root.add(lantMesh);
  const lanterns = []; for (let i = 0; i < NSL; i++) lanterns.push({ on: false, x: 0, y: 0, z: 0, vy: 0, ph: 0, life: 0 });
  let lantI = 0;
  const release = (n) => {
    for (let i = 0; i < n; i++) {
      const L = lanterns[lantI++ % NSL], side = Math.random() < 0.5 ? -1 : 1;
      Object.assign(L, { on: true, x: st.portrait ? (Math.random() - 0.5) * 5 : side * (3 + Math.random() * 10), y: 0.2, z: (st.portrait ? 0 : -3) - Math.random() * 14, vy: 0.6 + Math.random() * 0.6, ph: Math.random() * 6, life: 0 });
    }
  };

  // ── Brainwave pulse: a glowing sine ribbon along the horizon ────
  const BW = 140;
  const bwPos = new Float32Array(BW * 2 * 3), bwCol = new Float32Array(BW * 2 * 3);
  const bwIdx = [];
  for (let i = 0; i < BW - 1; i++) { const a = i * 2; bwIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const bwGeo = keep(new THREE.BufferGeometry());
  bwGeo.setAttribute('position', new THREE.BufferAttribute(bwPos, 3));
  bwGeo.setAttribute('color', new THREE.BufferAttribute(bwCol, 3));
  bwGeo.setIndex(bwIdx);
  const bwMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const brain = new THREE.Mesh(bwGeo, bwMat); brain.frustumCulled = false; brain.visible = false; root.add(brain);
  const waves = []; for (let i = 0; i < 4; i++) waves.push({ t: 9, k: 0 });

  // ── State ───────────────────────────────────────────────────────
  const st = {
    aur: 0, aurHue: 0, aurV: 0.02, cloud: 0, cloudV: 0, moonK: 0, enso: 0, ensoA: 0, ensoOn: false, dim: 0, wind: 0, danger: 0,
    mAng: 0, mVel: 0.05, mKick: 0, mGlow: 0, mFlare: 0, ringT: 0, cheerSpeed: 0, dead: false, portrait: false, combo: 0,
    camX: 0, camVX: 0, dip: 0, dipV: 0, fly: 0, lastSeg: -1, segFlash: 0, segX: 0,
  };
  const MC = { x: 0, z: -9 };   // mandala / ring centre

  function update(dt, info) {
    const { beat, songTime: t } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 5);
    const cheer = info.cheer || 0, move = info.move || 0, flashI = info.flash || 0, energy = info.energy ?? 0.6;
    st.danger += ((info.danger || 0) - st.danger) * Math.min(1, dt);
    const dec = (k, r) => { st[k] = Math.max(0, st[k] - dt * r); };
    dec('aur', 0.35); dec('moonK', 1); dec('mGlow', 0.8); dec('mFlare', 0.7); dec('cheerSpeed', 0.25); dec('segFlash', 2);
    const spring = (k, v, hz, damp) => { const w = 2 * Math.PI * hz; st[v] += (-w * w * st[k] - 2 * damp * w * st[v]) * dt; st[k] += st[v] * dt; };
    spring('camX', 'camVX', 0.9, 0.6); spring('dip', 'dipV', 1.4, 0.5);
    st.dim += ((st.dead ? 1 : 0) - st.dim) * Math.min(1, dt * 0.6);
    st.wind += (Math.max(0, st.danger - 0.55) * 2.2 - st.wind) * Math.min(1, dt);
    if (st.ensoOn) { st.enso = Math.min(1, st.enso + dt * 1.6); if (st.enso >= 1) st.ensoA = Math.max(0, st.ensoA - dt * 0.6); if (st.ensoA <= 0) st.ensoOn = false; }
    st.aurHue = (st.aurHue + dt * (0.02 + 0.04 * Math.min(5, st.combo) + 0.05 * cheer)) % 1;
    // Clouds: drift, nudged along by moves (old: cloudBoost = 1 + move*1.8).
    st.cloudV *= Math.exp(-dt * 1.2);
    st.cloud += dt * (0.015 * (1 + move * 1.8) + st.cloudV + 0.05 * st.wind) * (1 - 0.7 * st.dim);

    U.uT.value = t; U.uAur.value = Math.min(1.6, 0.25 + 0.3 * energy + st.aur + 0.4 * cheer) * (1 - 0.7 * st.dim);
    U.uAurHue.value = 0.76 + 0.13 * Math.sin(st.aurHue * Math.PI * 2); U.uCloud.value = st.cloud; U.uMoonK.value = st.moonK + 0.3 * energy;
    U.uEnso.value = st.enso; U.uEnsoA.value = st.ensoOn ? Math.min(1, st.ensoA) : 0;
    U.uDim.value = st.dim; U.uWind.value = st.wind; U.uBeat.value = onBeat;

    // Meditation rings: every ~1s from the mandala's heart, faster after
    // a clear (old: interval 60 - cheer*35 frames).
    st.ringT += dt;
    const interval = Math.max(0.4, 1.6 - cheer * 0.9 - st.cheerSpeed * 0.6);
    if (st.ringT > interval && !st.dead) { st.ringT = 0; ripple(MC.x, MC.z, 0.12, 0.6 + 0.3 * cheer); }
    ripples.forEach((r, i) => {
      r.t += dt * (1 + cheer * 0.8);
      const live = r.t < 8 ? r.a : 0;
      rip[i].set(r.x, r.z, r.t, live); ripG[i] = r.g;
    });

    // Mandala: slow turn (faster with clears), beat segment lit.
    st.mKick *= Math.exp(-dt * 3);
    st.mAng += dt * (st.mVel * (1 + cheer * 4 + st.cheerSpeed * 3) + st.mKick) * (1 - 0.9 * st.dim);
    const mu = mandMat.uniforms;
    const seg = ((Math.floor(beat) % 12) + 12) % 12;
    mu.uAng.value = st.mAng; mu.uSeg.value = st.segFlash > 0.05 ? st.segX : seg; mu.uSegK.value = 0.7 + 0.3 * onBeat + st.segFlash;
    mu.uGlow.value = 0.15 * energy + st.mGlow + 0.3 * cheer + 0.06 * Math.sin(t * 2.4); mu.uFlare.value = st.mFlare + 0.5 * flashI; mu.uDim.value = st.dim;

    // Lotus candles bob on the swell; flames breathe (the old candle glow).
    let pi = 0;
    lotus.forEach((L, i) => {
      L.bobV += (-L.bob * 30 - L.bobV * 3) * dt; L.bob += L.bobV * dt;
      L.vx *= Math.exp(-dt * 0.8); L.x += (L.vx + Math.sin(t * 0.1 + L.ph) * 0.05) * dt;
      if (L.x > 17) L.x -= 34; else if (L.x < -17) L.x += 34;
      L.flare = Math.max(0, L.flare - dt * 0.8);
      const y = 0.02 + 0.04 * Math.sin(t * 1.1 + L.ph) + L.bob * 0.3;
      dummy.position.set(L.x, y, L.z); dummy.rotation.set(Math.sin(t * 0.9 + L.ph) * 0.08 + L.bob * 0.4, L.ph, 0); dummy.scale.setScalar(1.1); dummy.updateMatrix();
      lotusMesh.setMatrixAt(i, dummy.matrix);
      const fl = st.dead ? 0 : (0.75 + 0.15 * Math.sin(t * 2.6 + L.ph * 3) + 0.08 * Math.sin(t * 11 + L.ph) + 1.4 * L.flare + 0.4 * cheer);
      // flame
      pPos.set([L.x, y + 0.32, L.z], pi * 3); col.setRGB(1, 0.72, 0.5).multiplyScalar(fl); pCol.set([col.r, col.g, col.b], pi * 3); pSize[pi++] = 0.5 + 0.4 * L.flare;
      // its reflection
      pPos.set([L.x, -0.35, L.z], pi * 3); col.multiplyScalar(0.35); pCol.set([col.r, col.g, col.b], pi * 3); pSize[pi++] = 0.7;
    });
    lotusMesh.instanceMatrix.needsUpdate = true;
    lotusMat.color.setRGB(1, 0.62, 0.85).multiplyScalar(0.55 + 0.25 * onBeat * (1 - st.dim) + 0.4 * flashI);
    // Fireflies (the old dust motes: speed 1 + move*4).
    const fs = (1 + move * 4) * (1 - 0.8 * st.dim);
    st.fly *= Math.exp(-dt * 1.2);
    for (const f of flies) {
      f.x += (Math.sin(t * f.sp + f.ph) * 0.25 + st.fly) * fs * dt;
      f.y += Math.cos(t * f.sp * 1.3 + f.ph) * 0.12 * fs * dt;
      if (f.x > 20) f.x -= 40; else if (f.x < -20) f.x += 40;
      const tw = 0.55 + 0.35 * Math.sin(t * 1.9 + f.ph * 5);
      pPos.set([f.x, f.y, f.z], pi * 3); col.setRGB(0.9, 0.85, 1).multiplyScalar(tw * (0.7 + 0.5 * cheer) * (1 - 0.8 * st.dim)); pCol.set([col.r, col.g, col.b], pi * 3); pSize[pi++] = 0.14;
    }
    // Sky lanterns.
    lanterns.forEach((L, i) => {
      if (L.on) {
        L.life += dt; L.y += L.vy * dt; L.x += Math.sin(t * 0.5 + L.ph) * 0.2 * dt;
        if (L.y > 14) L.on = false;
      }
      const k = L.on ? Math.min(1, L.life * 2) * (1 - Math.max(0, (L.y - 9) / 5)) : 0;
      dummy.position.set(L.x, L.on ? L.y : -50, L.z); dummy.rotation.set(0, L.ph, Math.sin(t + L.ph) * 0.06); dummy.scale.setScalar(L.on ? 1 : 0.001); dummy.updateMatrix();
      lantMesh.setMatrixAt(i, dummy.matrix);
      pPos.set([L.x, L.y, L.z], pi * 3); col.setRGB(1, 0.6, 0.3).multiplyScalar(k * (0.8 + 0.2 * Math.sin(t * 7 + L.ph))); pCol.set([col.r, col.g, col.b], pi * 3); pSize[pi++] = 0.75;
    });
    lantMesh.instanceMatrix.needsUpdate = true;
    pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = pGeo.attributes.size.needsUpdate = true;

    // Brainwave ribbons.
    let anyW = false;
    for (const w of waves) { w.t += dt; if (w.t < 1.6) anyW = true; }
    brain.visible = anyW;
    if (anyW) {
      const portrait = st.portrait;
      const zz = -16, y0 = portrait ? 5.4 : 2.0, span = portrait ? 16 : 44;
      for (let i = 0; i < BW; i++) {
        const u = i / (BW - 1), x = (u - 0.5) * span;
        let y = 0, a = 0;
        for (const w of waves) {
          if (w.t >= 1.6) continue;
          const fade = 1 - w.t / 1.6, amp = (0.5 + 0.5 * w.k) * w.k * fade;
          y += Math.sin(u * Math.PI * 2 * 6 + w.t * Math.PI * 4) * amp * 0.9;
          a = Math.max(a, fade * Math.min(1, w.k + 0.3));
        }
        const th = 0.05 + 0.03 * a;
        bwPos.set([x, y0 + y - th, zz, x, y0 + y + th, zz], i * 6);
        const edge = Math.min(1, u * 8, (1 - u) * 8);
        col.setRGB(1, 0.62, 0.86).multiplyScalar(a * edge);
        bwCol.set([col.r, col.g, col.b, col.r, col.g, col.b], i * 6);
      }
      bwGeo.attributes.position.needsUpdate = bwGeo.attributes.color.needsUpdate = true;
    }

    // ── Camera: low over the water, drifting ──
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    st.portrait = portrait;
    // Keep the moon in a visible strip: upper-left in landscape, top in portrait.
    U.uMoon.value.set(portrait ? -0.12 : -0.62, portrait ? 0.52 : 0.25, -0.8).normalize();
    camera.position.set(Math.sin(t * 0.05) * 1.2 + st.camX, (portrait ? 2.2 : 1.7) + Math.sin(t * 0.09) * 0.12 + st.dip, 9);
    camera.lookAt(Math.sin(t * 0.05) * 0.6 + st.camX * 0.5, (portrait ? 3.4 : 2.0) + st.dip * 0.3, -14);
    camera.rotateZ(Math.sin(t * 0.07) * 0.01);
    const fov = portrait ? 70 : 52;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    pMat.uniforms.uScale.value = 300 * (window.innerHeight || 800) / 800 / Math.tan(fov * Math.PI / 360);
    sky.position.copy(camera.position);
    water.position.x = camera.position.x; water.position.z = camera.position.z - 120;
  }

  const sideX = (c) => { const u = (c ?? 4.5) - 4.5; return st.portrait ? u * 0.5 : (u < 0 ? -1 : 1) * (5 + Math.abs(u) * 1.2); };
  const enso = () => { st.ensoOn = true; st.enso = 0; st.ensoA = 1.4; };
  const wave = (k) => { const w = waves.reduce((a, b) => (b.t > a.t ? b : a)); w.t = 0; w.k = k; };

  function react(kind, data = {}) {
    if (st.dead && kind !== 'start') return;
    switch (kind) {
      case 'move': {
        const dir = data.dir || 0;
        ripple(sideX(data.col), st.portrait ? 3 : -3 - Math.random() * 3, 0.16, 0.7);
        st.cloudV += dir * 0.05; st.fly += dir * 0.9; st.camVX += dir * 0.25;
        for (const L of lotus) L.vx += dir * 0.15;
        break;
      }
      case 'rotate': {
        const dir = data.dir || 1;
        st.mKick += dir * 2.2; st.segFlash = 1; st.segX = ((Math.floor(st.mAng / (Math.PI / 6)) % 12) + 12 + (dir > 0 ? 3 : 9)) % 12; st.mGlow = Math.max(st.mGlow, 0.3);
        break;
      }
      case 'soft':
        ripple((Math.random() - 0.5) * (st.portrait ? 4 : 14), st.portrait ? 4 : -1 - Math.random() * 2, 0.06, 0.35);
        st.moonK = Math.min(1.2, st.moonK + 0.25);
        break;
      case 'drop': {
        const r = data.rows || 0, k = Math.min(1, 0.3 + r / 14);
        ripple(sideX(data.col) * 0.4, st.portrait ? 0 : -6, 0.35 + 0.6 * k, 2.6 * k + 0.5);
        if (r >= 10) ripple(MC.x, MC.z, 0.4, 1);
        st.dipV -= 0.5 * k; st.mGlow = Math.max(st.mGlow, 0.4 * k);
        for (const L of lotus) L.bobV += (0.6 + Math.random()) * k;
        break;
      }
      case 'hold':
        enso(); st.moonK = 1;
        break;
      case 'clear': {
        const n = Math.max(1, data.lines || 1), combo = data.combo || 0;
        st.combo = combo;
        wave(Math.min(1.4, 0.35 + 0.25 * n + 0.08 * combo));
        st.aur = Math.min(1.6, st.aur + 0.25 * n + 0.1 * combo); st.cheerSpeed = Math.min(1.5, st.cheerSpeed + 0.4 * n);
        st.mGlow = Math.max(st.mGlow, 0.3 + 0.15 * n);
        lotus.forEach((L, i) => { if (i % (5 - Math.min(4, n)) === 0) L.flare = 1; });
        ripple(MC.x, MC.z, 0.2 + 0.08 * n, 1);
        if (n >= 4) { st.aur = 1.6; st.mFlare = 1.4; release(10 + 2 * Math.min(5, combo)); ripple(MC.x, MC.z, 0.5, 1.5); }
        else if (combo >= 2) release(Math.min(6, combo));
        break;
      }
      case 'combo':
        st.combo = data.n || 0;
        break;
      case 'levelUp':
        enso(); release(14); st.mKick += 6; st.mFlare = 1; st.aur = Math.min(1.6, st.aur + 0.8);
        break;
      case 'gameOver':
        st.dead = true; st.combo = 0;
        break;
      case 'start':
        st.dead = false; st.combo = 0; ripple(MC.x, MC.z, 0.6, 1.5); st.mGlow = 0.8;
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
  };
}
