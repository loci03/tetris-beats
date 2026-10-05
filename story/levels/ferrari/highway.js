// FERRARI WINDOW — the Tetris backdrop: a night-highway chase.
//
// Rhett's red supercar bobs and weaves through interstate traffic at full
// tilt under sodium street lamps, desert mesas and a glowing city on the
// horizon; oncoming headlights stream past beyond the median. Line clears
// are overtakes (a Tetris lights the nitro), drops thump the suspension,
// a level-up is a gear change with a backfire, combos flash the high
// beams, game over is a spin-out onto the shoulder, start is a launch.
//
// Framing: the Tetris board (+ HOLD/NEXT panels) covers the middle ~56% of
// the screen, so the camera sits over the centre of the road and the car
// lives in an OUTER lane — whichever side it's on, it reads in the visible
// strip — and swoops across to the other side to overtake. In portrait the
// camera tracks the car and frames it in the strip under the board.
//
// Cheap by construction: everything that repeats along the road is one
// instanced mesh in a group that slides by (distance mod spacing); the
// road, markings, lamp pools, head-light pool and underglow are one shader
// on one quad; light reflections on the (wet-looking) asphalt are additive
// quads; vehicles share one paint shader (car.js). No shadows, no lights.

import { createCarKit, buildHeroCar } from './car.js';

const LANE = 3.4;                    // our carriageway: 4 lanes, centres ±1.7, ±5.1
const HOME = 5.1;                    // the hero's outer lane (either side)
const LAMP_GAP = 32, POST_GAP = 4, CACTUS_GAP = 96, BOARD_GAP = 300;

const ROAD_VS = `
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const ROAD_FS = `
uniform float uScroll, uPulse, uFlash, uHead;
uniform vec3 uCar;            // hero x, z, yaw
uniform vec3 uGlow;           // underglow colour (pre-multiplied)
varying vec3 vW;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float band(float x, float c, float w) { return smoothstep(w, w * 0.4, abs(x - c)); }
void main() {
  float x = vW.x, z = vW.z, zz = z - uScroll;
  vec3 asph = vec3(0.016, 0.016, 0.024);
  float n = hash(floor(vec2(x * 14.0, zz * 14.0)));
  vec3 c = asph * (0.88 + 0.24 * n);
  // Wet asphalt: the city-glow sky reflects at grazing angles.
  float dist = length(vW - cameraPosition);
  c += vec3(0.16, 0.05, 0.07) * smoothstep(25.0, 220.0, dist) * 0.55;
  float onRoad = step(-8.4, x) * step(x, 8.4);
  float oncoming = step(-21.0, x) * step(x, -11.0);
  float median = step(-11.0, x) * step(x, -8.4);
  c = mix(c, vec3(0.06, 0.05, 0.05) * (0.7 + 0.6 * n), median);
  // Markings: dashed lane lines, solid edges, rumble strips.
  float dash = step(fract(zz / 12.0), 0.3);
  float lines = 0.0;
  lines += (band(x, -3.4, 0.09) + band(x, 0.0, 0.09) + band(x, 3.4, 0.09)) * dash;
  lines += band(x, -6.8, 0.1) + band(x, 6.8, 0.1);
  lines += (band(x, -14.3, 0.09) + band(x, -17.6, 0.09)) * dash + band(x, -11.4, 0.09) + band(x, -20.6, 0.09);
  float rumble = step(6.95, abs(x)) * step(abs(x), 7.5) * step(0.5, fract(zz / 1.2)) * onRoad;
  c = mix(c, vec3(0.42, 0.41, 0.38), lines * (onRoad + oncoming));
  c += vec3(0.07, 0.06, 0.06) * rumble;
  // Sodium lamp pools (lamps every 32 m on both sides).
  float dz = fract(zz / 32.0) - 0.5;
  float pool = exp(-dz * dz * 32.0 * 32.0 / 90.0) * (exp(-pow(x - 6.2, 2.0) / 30.0) + exp(-pow(x + 7.0, 2.0) / 30.0) + 0.8 * exp(-pow(x + 12.4, 2.0) / 30.0));
  c += vec3(1.0, 0.55, 0.22) * pool * 0.13 * (0.85 + 0.15 * n);
  // Hero head-light pool ahead + red spill behind + neon underglow.
  float cy = cos(uCar.z), sy = sin(uCar.z);
  vec2 d = vec2(x - uCar.x, z - uCar.y);
  vec2 l = vec2(d.x * cy - d.y * sy, d.x * sy + d.y * cy);
  float ahead = smoothstep(-2.0, -6.0, l.y) * exp(l.y / 30.0);
  float spread = 0.9 + 0.12 * abs(l.y);
  c += vec3(1.0, 0.92, 0.75) * ahead * exp(-l.x * l.x / (spread * spread)) * 0.5 * uHead;
  c += vec3(0.9, 0.05, 0.05) * exp(-l.x * l.x / 1.2) * smoothstep(1.8, 3.0, l.y) * exp(-(l.y - 2.4) / 3.0) * 0.18;
  c += uGlow * exp(-(l.x * l.x / 1.9 + l.y * l.y / 6.0) * 1.6);
  c *= 1.0 + 0.6 * uFlash;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function createHighway(ctx) {
  const { THREE, scene, camera, world, rigs } = ctx;
  const low = !!ctx.low;
  if (world) world.group.visible = false;
  for (const r of Object.values(rigs || {})) r.root.visible = false;
  const prevFog = scene.fog;
  scene.fog = new THREE.Fog(0x140c26, 70, 360);
  camera.far = 700; camera.updateProjectionMatrix();

  const root = new THREE.Group();
  scene.add(root);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const col = new THREE.Color(), dummy = new THREE.Object3D(), M4 = new THREE.Matrix4();
  const C = (h) => new THREE.Color(h);
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t);
  };

  const kit = createCarKit(THREE);
  const paint = keep(kit.paintMaterial({
    uKeyCol: C(0xffd2a0).multiplyScalar(1.05), uAmb: C(0x3a2638), uSkyHor: C(0x8a2a1a).multiplyScalar(0.5),
    uLampCol: C(0xffb060).multiplyScalar(1.6), uLampGap: LAMP_GAP, uRim: C(0x5a2cff).multiplyScalar(0.15),
  }));
  const scenery = keep(kit.paintMaterial({ uKeyCol: C(0xffc890).multiplyScalar(0.35), uAmb: C(0x1c1a30), uGloss: 0.4, uLampGap: LAMP_GAP }));

  // ── Sky dome: gradient, stars, moon, horizon city glow ──────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(500, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse, uTime;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.015,0.015,0.055), mid = vec3(0.07,0.035,0.15), hor = vec3(0.5,0.17,0.24);
        vec3 c = mix(mid, top, smoothstep(0.08, 0.6, h));
        float ahead = smoothstep(0.2, 1.0, -vP.z);
        c = mix(mix(hor * 0.6, hor, ahead), c, smoothstep(-0.02, 0.16 + 0.06 * ahead, h));
        c += vec3(0.5,0.2,0.1) * uPulse * ahead * smoothstep(0.2, 0.0, abs(h - 0.02));
        vec2 g = floor(vec2(atan(vP.x, vP.z) * 150.0, h * 150.0));
        float s = step(0.986, hash(g)) * smoothstep(0.1, 0.35, h);
        c += vec3(0.85,0.85,1.0) * s * (0.55 + 0.45 * sin(uTime * 2.0 + hash(g + 3.0) * 30.0));
        vec3 md = normalize(vec3(0.55, 0.2, -0.8));
        float m = dot(vP, md);
        c = mix(c, vec3(1.0, 0.95, 0.85), smoothstep(0.99935, 0.9995, m));
        c += vec3(0.5, 0.45, 0.4) * pow(max(m, 0.0), 900.0) * 0.6;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  sky.renderOrder = -10;
  root.add(sky);

  // Far layers (stay with the camera): city skyline ahead, mesas around.
  const cityTex = canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    let x = 0, k = 0;
    while (x < w) {
      const bw = 6 + (k * 13 % 12), tall = (k % 9 === 4) ? 2.2 : 1, bh = (12 + (k * 29 % 46)) * tall;
      g.fillStyle = '#100a1e'; g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = k % 3 ? 'rgba(255,196,120,0.85)' : 'rgba(130,220,255,0.85)';
      for (let yy = h - bh + 3; yy < h - 2; yy += 4) for (let xx = x + 1; xx < x + bw - 1; xx += 2) if ((xx * 7 + yy * 13 + k) % 6 === 0) g.fillRect(xx, yy, 1, 1);
      if (tall > 1) { g.fillStyle = '#ff3050'; g.fillRect(x + bw / 2 - 1, h - bh - 4, 2, 3); }
      x += bw + (k % 4 === 0 ? 6 : 1); k++;
    }
  });
  const ring = (radius, height, y, a0, a1, tex, rep, colr) => {
    const geo = keep(new THREE.CylinderGeometry(radius, radius, height, 32, 1, true, a0, a1 - a0));
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(rep, 1);
    const m = new THREE.Mesh(geo, keep(new THREE.MeshBasicMaterial({ map: tex, color: colr, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide })));
    m.position.y = y; m.renderOrder = -9;
    root.add(m);
    return m;
  };
  // Cylinder theta 0 points at +z; π is straight ahead (-z).
  const city = ring(420, 40, 18, Math.PI - 0.75, Math.PI + 0.75, cityTex, 2, 0xffffff);
  const mesaTex = canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#0d0818';
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const k = Math.floor(x / 64), f = (x % 64) / 64, top = 18 + (k * 23 % 26);
      const y = f < 0.15 ? h - (h - top) * (f / 0.15) : f > 0.7 ? h - (h - top) * Math.max(0, 1 - (f - 0.7) / 0.2) : top + Math.sin(x) * 1.5;
      g.lineTo(x, Math.min(h, y));
    }
    g.lineTo(w, h); g.fill();
  });
  const mesas = ring(400, 26, 9, 0, Math.PI * 2, mesaTex, 6, 0xffffff);
  const farLayers = [city, mesas];

  // ── Ground + road ───────────────────────────────────────────────
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(1400, 1400)), keep(new THREE.MeshBasicMaterial({ color: 0x0b0812 })));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
  root.add(ground);
  const roadMat = keep(new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uScroll: { value: 0 }, uPulse: { value: 0 }, uFlash: { value: 0 }, uHead: { value: 1 },
      uCar: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Color() },
    }]),
    vertexShader: ROAD_VS, fragmentShader: ROAD_FS, fog: true,
  }));
  const road = new THREE.Mesh(keep(new THREE.PlaneGeometry(31, 520)), roadMat);
  road.rotation.x = -Math.PI / 2; road.position.set(-5.5, 0, -230);
  root.add(road);

  // Long static pieces: median barrier, guard rail.
  const B = kit.Builder;
  const barrier = new B();
  barrier.box(0.7, 0.35, 520, -9.7, 0.18, -230, 0x5a5660, 2);
  barrier.box(0.32, 0.6, 520, -9.7, 0.65, -230, 0x6a6670, 2);
  barrier.box(0.08, 0.32, 520, 8.9, 0.75, -230, 0x9a9cab, 4);
  barrier.box(0.08, 0.06, 520, 8.9, 0.95, -230, 0xc8c8d0, 4);
  barrier.box(0.08, 0.32, 520, -21.6, 0.75, -230, 0x9a9cab, 4);
  root.add(new THREE.Mesh(keep(barrier.build()), scenery));

  // ── Repeating roadside: lamps, posts + reflectors, cacti, billboards ──
  const wraps = [];
  const wrapGroup = (gap) => { const g = new THREE.Group(); root.add(g); wraps.push({ g, gap }); return g; };
  const instanced = (geo, mat, list, parent) => {
    const m = new THREE.InstancedMesh(keep(geo), mat, list.length);
    list.forEach((p, i) => { M4.compose(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p[3] || 0, 0)), new THREE.Vector3(1, 1, 1)); m.setMatrixAt(i, M4); });
    m.frustumCulled = false;
    parent.add(m);
    disposables.push(m);
    return m;
  };
  // Street lamps: right verge (arm over the road) + double-armed in the median.
  const lampR = new B();
  lampR.cyl(0.13, 0.17, 9.5, 6, 0, 4.75, 0, 0x30303a, 2);
  lampR.box(3.4, 0.14, 0.14, -1.7, 9.4, 0, 0x30303a, 2);
  lampR.box(0.9, 0.16, 0.42, -3.3, 9.3, 0, 0x22222a, 2);
  lampR.box(0.78, 0.04, 0.34, -3.3, 9.2, 0, 0xffc070, 6);
  const lampM = new B();
  lampM.cyl(0.13, 0.17, 9.5, 6, 0, 4.75, 0, 0x30303a, 2);
  lampM.box(5.2, 0.14, 0.14, 0, 9.4, 0, 0x30303a, 2);
  for (const sx of [1, -1]) { lampM.box(0.9, 0.16, 0.42, sx * 2.6, 9.3, 0, 0x22222a, 2); lampM.box(0.78, 0.04, 0.34, sx * 2.6, 9.2, 0, 0xffc070, 6); }
  const lampG = wrapGroup(LAMP_GAP);
  const nL = low ? 8 : 11, lampZ = [];
  for (let i = 0; i < nL; i++) lampZ.push(14 - i * LAMP_GAP);
  instanced(lampR.build(), scenery, lampZ.map((z) => [9.7, 0, z]), lampG);
  instanced(lampM.build(), scenery, lampZ.map((z) => [-9.7, 0, z]), lampG);
  // Guard-rail posts + amber reflectors on the barrier.
  const postG = wrapGroup(POST_GAP);
  const post = new B();
  post.box(0.12, 0.8, 0.12, 8.95, 0.4, 0, 0x6a6c78, 2);
  post.box(0.06, 0.1, 0.04, 8.85, 0.78, 0, 0xffb020, 3);
  post.box(0.06, 0.1, 0.04, -9.35, 0.7, 0, 0xffb020, 3);
  post.box(0.12, 0.8, 0.12, -21.6, 0.4, 0, 0x6a6c78, 2);
  const nP = low ? 40 : 70, postZ = [];
  for (let i = 0; i < nP; i++) postZ.push([0, 0, 12 - i * POST_GAP]);
  instanced(post.build(), scenery, postZ, postG);
  // Cacti + rocks on the desert either side.
  const cactus = new B();
  cactus.cyl(0.32, 0.38, 4.2, 7, 0, 2.1, 0, 0x1c4a2c, 2);
  cactus.cyl(0.22, 0.22, 1.4, 6, 0.7, 2.2, 0, 0x1c4a2c, 2, 0, 0, Math.PI / 2);
  cactus.cyl(0.2, 0.2, 1.6, 6, 1.35, 3.0, 0, 0x1c4a2c, 2);
  cactus.cyl(0.2, 0.2, 1.0, 6, -0.55, 2.8, 0, 0x1c4a2c, 2, 0, 0, Math.PI / 2);
  cactus.cyl(0.18, 0.18, 1.3, 6, -1.0, 3.4, 0, 0x1c4a2c, 2);
  cactus.add(new THREE.DodecahedronGeometry(0.9, 0), cactus.m4(2.5, 0.3, 1.0, 0, 0, 0, 1.4, 0.7, 1), 0x3a2a30, 2);
  const cactG = wrapGroup(CACTUS_GAP);
  const cl = [];
  for (let i = 0; i < (low ? 10 : 16); i++) {
    const side = i % 2 ? 1 : -1, z = 20 - (i >> 1) * (CACTUS_GAP / 2) - (i % 3) * 13;
    cl.push([side > 0 ? 14 + (i * 7 % 18) : -27 - (i * 11 % 16), 0, z, i]);
  }
  instanced(cactus.build(), scenery, cl, cactG);
  // Billboards: lit boards on tall posts.
  const boardTex = canvasTex(512, 512, (g, w, h) => {
    const sign = (y0, bg, draw) => { g.fillStyle = bg; g.fillRect(0, y0, w, h / 2); g.save(); g.translate(0, y0); draw(); g.restore(); };
    sign(0, '#1a0c2c', () => {
      g.strokeStyle = '#ff2d7a'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h / 2 - 20);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'italic 900 64px "Arial Black", Impact, sans-serif'; g.fillStyle = '#ffe9a0'; g.shadowColor = '#ff9a00'; g.shadowBlur = 14;
      g.fillText('RHETT RYDER', w / 2, 82);
      g.font = '900 34px "Arial Black", Impact, sans-serif'; g.fillStyle = '#9ff0ff'; g.shadowColor = '#00c8ff';
      g.fillText('LIVE TONITE · TRUCK STOP', w / 2, 150);
      g.font = '900 28px "Arial Black", Impact, sans-serif'; g.fillStyle = '#ff6a9a'; g.fillText('EXIT 6  →', w / 2, 205);
    });
    sign(h / 2, '#0c1420', () => {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'italic 900 92px "Arial Black", Impact, sans-serif'; g.lineWidth = 8; g.strokeStyle = '#ff2040'; g.shadowColor = '#ff0030'; g.shadowBlur = 20;
      g.strokeText('YEEHAW!', w / 2, 100); g.fillStyle = '#fff4f0'; g.fillText('YEEHAW!', w / 2, 100);
      g.font = '900 34px "Arial Black", Impact, sans-serif'; g.fillStyle = '#ffc23a'; g.shadowColor = '#ff9a00';
      g.fillText('LINE DANCING · 2 MI', w / 2, 190);
    });
  });
  const boardG = wrapGroup(BOARD_GAP);
  const boardMats = [];
  const billboard = (x, z, ry, half) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; boardG.add(g);
    const frame = new B();
    frame.cyl(0.25, 0.3, 9, 6, -3.5, 4.5, 0, 0x2a2a34, 2); frame.cyl(0.25, 0.3, 9, 6, 3.5, 4.5, 0, 0x2a2a34, 2);
    frame.box(12.4, 6.4, 0.4, 0, 11.8, -0.25, 0x18141e, 2);
    frame.box(12.4, 0.2, 1.2, 0, 8.55, 0.4, 0x2a2a34, 2);
    g.add(new THREE.Mesh(keep(frame.build()), scenery));
    const geo = keep(new THREE.PlaneGeometry(12, 6));
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 0.5 + (half ? 0 : 0.5));
    const mat = keep(new THREE.MeshBasicMaterial({ map: boardTex, color: 0xffffff }));
    const m = new THREE.Mesh(geo, mat); m.position.set(0, 11.8, 0); g.add(m);
    boardMats.push(mat);
  };
  billboard(17.5, -40, -0.35, 0);
  billboard(-27, -190, 0.35, 1);

  // ── Light glows + wet-road reflections (one instanced mesh each) ──
  const glowTex = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.7)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const streakTex = canvasTex(32, 128, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w - 0.5, v = y / h;
      const a = Math.exp(-u * u * 40) * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.15)), 0.6) * (1 - v * 0.6);
      const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
  });
  const addMat = (map) => keep(new THREE.MeshBasicMaterial({ map, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const GLOWS = 120, REFL = 90;
  const glowMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), addMat(glowTex), GLOWS);
  const reflGeo = keep(new THREE.PlaneGeometry(1, 1)); reflGeo.rotateX(-Math.PI / 2); reflGeo.translate(0, 0, 0.5);
  const reflMesh = new THREE.InstancedMesh(reflGeo, addMat(streakTex), REFL);
  for (const m of [glowMesh, reflMesh]) { m.frustumCulled = false; m.setColorAt(0, col.set(0)); root.add(m); disposables.push(m); }
  glowMesh.renderOrder = 5; reflMesh.renderOrder = 4;
  let nGlow = 0, nRefl = 0;
  const glow = (x, y, z, s, c, k = 1) => {
    if (nGlow >= GLOWS) return;
    dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
    glowMesh.setMatrixAt(nGlow, dummy.matrix); glowMesh.setColorAt(nGlow++, col.set(c).multiplyScalar(k));
  };
  const refl = (x, z, w, len, c, k = 1) => {
    if (nRefl >= REFL) return;
    dummy.position.set(x, 0.03, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(w, 1, len); dummy.updateMatrix();
    reflMesh.setMatrixAt(nRefl, dummy.matrix); reflMesh.setColorAt(nRefl++, col.set(c).multiplyScalar(k));
  };

  // ── Traffic ─────────────────────────────────────────────────────
  const TYPES = ['sedan', 'suv', 'truck', 'semi'];
  const tdefs = {}, tmesh = {};
  const PAINTS = [0xe8e8ee, 0x2a5cc8, 0x1a1a22, 0x8a8f9a, 0x2a8a5a, 0xc89a30, 0x7a1a8a, 0xd0d4dc, 0x3a3a48];
  const caps = { sedan: low ? 6 : 9, suv: low ? 3 : 5, truck: 2, semi: 2 };
  for (const t of TYPES) {
    tdefs[t] = kit.traffic[t]();
    keep(tdefs[t].geo);
    const cap = caps[t] + (t === 'sedan' || t === 'suv' ? (low ? 4 : 7) : 0);
    tdefs[t].geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
    const m = new THREE.InstancedMesh(tdefs[t].geo, paint, cap);
    m.frustumCulled = false; m.count = 0; m.setColorAt(0, col.set(0xffffff));
    root.add(m); tmesh[t] = m; disposables.push(m);
  }
  const LANES = [-HOME, -LANE / 2, LANE / 2, HOME];
  const cars = [];
  const spawn = (car, zFar) => {
    for (let tries = 0; tries < 6; tries++) {
      const r = Math.random();
      car.type = r < 0.6 ? 'sedan' : r < 0.86 ? 'suv' : r < 0.95 ? 'truck' : 'semi';
      car.lane = Math.floor(Math.random() * 4);
      car.z = zFar - Math.random() * 60;
      const len = tdefs[car.type].len;
      if (!cars.some(o => o !== car && o.lane === car.lane && Math.abs(o.z - car.z) < (len + tdefs[o.type].len) / 2 + 8)) break;
    }
    car.v = car.type === 'semi' || car.type === 'truck' ? 22 + Math.random() * 3 : 25 + Math.random() * 6;
    car.color = PAINTS[Math.floor(Math.random() * PAINTS.length)];
    car.wob = Math.random() * 6;
  };
  const NCARS = low ? 9 : 14;
  for (let i = 0; i < NCARS; i++) { const c = {}; cars.push(c); spawn(c, 20 - i * 26); c.z = 30 - i * (300 / NCARS) - Math.random() * 8; }
  // Oncoming traffic beyond the median: instanced sedans/SUVs, head lights on.
  const ONC = low ? 6 : 10;
  const oncGeo = keep(tdefs.sedan.geo.clone());
  oncGeo.deleteAttribute('aFade');
  const oncMesh = new THREE.InstancedMesh(oncGeo, paint, ONC);
  oncMesh.frustumCulled = false; oncMesh.setColorAt(0, col.set(0xffffff)); root.add(oncMesh); disposables.push(oncMesh);
  const onc = [];
  for (let i = 0; i < ONC; i++) { onc.push({ lane: [-12.7, -16, -19.3][i % 3], z: -340 + i * 36 + Math.random() * 20, v: 28 + Math.random() * 6 }); oncMesh.setColorAt(i, col.set(PAINTS[(i * 3) % PAINTS.length])); }

  // ── The hero car ────────────────────────────────────────────────
  const hero = buildHeroCar(THREE, kit, paint);
  disposables.push(hero);
  const heroG = new THREE.Group();            // lateral / yaw (the "chassis on the road")
  const bodyG = new THREE.Group();            // pitch / roll / bob
  heroG.add(bodyG); bodyG.add(hero.group);
  root.add(heroG);
  // Head-light beams.
  const beamGeo = keep(new THREE.ConeGeometry(1.1, 14, 14, 1, true));
  beamGeo.translate(0, -7, 0); beamGeo.rotateX(Math.PI / 2 + 0.05);
  const beamMat = keep(new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  for (const sx of [1, -1]) { const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(sx * 0.62, 0.52, -2.1); bodyG.add(b); }
  // Nitro / backfire flames.
  const flameGeo = keep(new THREE.ConeGeometry(0.14, 1.4, 10, 1, true));
  flameGeo.translate(0, -0.7, 0); flameGeo.rotateX(-Math.PI / 2);
  const flameOuter = keep(new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const flameCore = keep(new THREE.MeshBasicMaterial({ color: 0x6ab8ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const flames = [];
  for (const x of [-0.2, 0.2]) {
    const o = new THREE.Mesh(flameGeo, flameOuter); o.position.set(x, 0.33, 2.38); bodyG.add(o);
    const c = new THREE.Mesh(flameGeo, flameCore); c.position.set(x, 0.33, 2.38); bodyG.add(c);
    flames.push(o, c);
  }
  // Tail-light trails: two ribbons laid on the road behind the car.
  const TRAIL = 28;
  const trailPos = new Float32Array(TRAIL * 2 * 2 * 3), trailCol = new Float32Array(TRAIL * 2 * 2 * 3);
  const trailIdx = [];
  for (let r = 0; r < 2; r++) for (let j = 0; j < TRAIL - 1; j++) { const a = (r * TRAIL + j) * 2; trailIdx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const trailGeo = keep(new THREE.BufferGeometry());
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  trailGeo.setIndex(trailIdx);
  const trail = new THREE.Mesh(trailGeo, keep(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  trail.frustumCulled = false; root.add(trail);
  const hist = [];                             // { s, x, yaw }
  // Tyre smoke (spin-outs, launches).
  const SMOKE = 24;
  const smokeMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({ map: glowTex, color: 0x8a86a0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })), SMOKE);
  smokeMesh.frustumCulled = false; smokeMesh.count = 0; root.add(smokeMesh); disposables.push(smokeMesh);
  const smoke = Array.from({ length: SMOKE }, () => ({ life: 0, x: 0, y: 0, z: 0, s: 1, vx: 0 }));
  let smokeCur = 0;
  const puff = (x, z, n) => { for (let k = 0; k < n; k++) { const p = smoke[smokeCur = (smokeCur + 1) % SMOKE]; p.life = 1.4; p.x = x + (Math.random() - 0.5) * 1.2; p.z = z + (Math.random() - 0.5); p.y = 0.4; p.s = 0.8; p.vx = (Math.random() - 0.5) * 2; } };

  // Speed lines: streaks rushing past the camera.
  const SL = low ? 30 : 56;
  const slPos = new Float32Array(SL * 6), slCol = new Float32Array(SL * 6);
  const slGeo = keep(new THREE.BufferGeometry());
  slGeo.setAttribute('position', new THREE.BufferAttribute(slPos, 3));
  slGeo.setAttribute('color', new THREE.BufferAttribute(slCol, 3));
  const speedLines = new THREE.LineSegments(slGeo, keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  speedLines.frustumCulled = false; root.add(speedLines);
  const lines = Array.from({ length: SL }, (_, i) => ({ a: Math.PI * (1.05 + 0.9 * i / SL), r: 3 + Math.random() * 7, z: -Math.random() * 80 }));

  // ── State ───────────────────────────────────────────────────────
  const st = {
    s: 0, v: 0, vBase: 36, side: 1, x: HOME, vx: 0, targetX: HOME, yaw: 0, roll: 0, pitch: 0,
    z: 0, boost: 0, nitro: 0, flash: 0, high: 0, highN: 0, backfire: 0, thump: 0, thumpV: 0,
    spin: -1, spinYaw: 0, stopped: false, launch: 0, level: 1, glowHue: 0, combo: 0, weaveT: 0,
    camX: 0, camZ: 10, crossCD: 0, autoT: 8, fov: 50, shake: 0, crossT: 0, second: 0, lastBeat: 0,
  };
  st.v = st.vBase;
  hero.group.rotation.y = 0;
  const wheelR = kit.WHEEL_R;

  const laneFree = (x, z0, z1) => !cars.some(c => Math.abs(LANES[c.lane] - x) < 1.5 && c.z > z0 && c.z - tdefs[c.type].len / 2 < z1 && c.z + tdefs[c.type].len / 2 > z0);
  const cross = (k = 1) => {
    st.side = -st.side; st.targetX = st.side * HOME; st.crossT = 1; st.boost = Math.min(1.6, st.boost + 0.35 * k);
    st.crossCD = 3.5; st.autoT = 7 + Math.random() * 5;
  };

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, songTime = info.songTime || 0;
    const pulse = ((beat * 2) % 1 + 1) % 1, onPulse = Math.exp(-pulse * 7), onBeat = Math.exp(-(((beat % 1) + 1) % 1) * 6);
    st.flash = Math.max(0, st.flash - dt * 2.5);
    st.boost = Math.max(0, st.boost - dt * 0.45);
    st.nitro = Math.max(0, st.nitro - dt * 0.42);
    st.backfire = Math.max(0, st.backfire - dt * 3);
    st.crossT = Math.max(0, st.crossT - dt * 1.4);
    st.launch = Math.max(0, st.launch - dt * 0.5);
    if (st.second > 0 && (st.second -= dt) <= 0 && st.spin < 0 && !st.stopped) cross(0.4);
    // High-beam flashes (combo).
    if (st.highN > 0) { st.high += dt * 7; if (st.high > 1) { st.high = 0; st.highN--; } }
    const highK = st.highN > 0 ? (st.high < 0.5 ? 1 : 0) : 0;

    // Speed: base grows with the level; boost / nitro on top; spin-out bleeds it off.
    let vT = st.stopped ? 0 : st.vBase * (1 + 0.35 * st.boost + 0.9 * st.nitro) * (1 - 0.6 * st.launch);
    if (st.spin >= 0) vT = 0;
    st.v += (vT - st.v) * Math.min(1, dt * (st.spin >= 0 ? 0.9 : st.stopped ? 2 : 1.6));
    st.s += st.v * dt;

    // Weaving: stay in the outer lane (traffic ahead moves over for him),
    // swoop across to the other side when it's clear — on slow traffic
    // ahead or every few seconds for the show.
    if (st.spin < 0 && !st.stopped) {
      const blocker = cars.find(c => Math.abs(LANES[c.lane] - st.side * HOME) < 0.5 && c.z < st.z - 1 && c.z > st.z - 26 - st.v * 0.3);
      st.crossCD = Math.max(0, st.crossCD - dt); st.autoT -= dt;
      const otherFree = st.crossCD <= 0 && laneFree(-st.side * HOME, st.z - 30, st.z + 8);
      if (blocker && st.crossT <= 0 && otherFree && Math.random() < 0.5) cross(0.6);
      else if (st.autoT <= 0 && otherFree) cross(0.5);         // a weave for the show every few seconds
      else if (st.autoT <= 0) st.autoT = 1;
      st.targetX = st.side * HOME;
      // Lane-keeping wiggle ("bobbing and weaving").
      st.weaveT += dt;
    }
    const wiggle = st.spin < 0 && !st.stopped ? 0.35 * Math.sin(st.weaveT * 1.3) + 0.15 * Math.sin(st.weaveT * 3.1) : 0;
    // Critically damped steering spring.
    const k = st.crossT > 0 ? 9 : 5, ax = (st.targetX + wiggle - st.x) * k * k - 2 * k * st.vx;
    st.vx += ax * dt; st.x += st.vx * dt;
    if (st.spin < 0) st.yaw += (-Math.atan2(st.vx, Math.max(8, st.v)) * 1.4 - st.yaw) * Math.min(1, dt * 10);
    st.roll += (-ax * 0.0035 - st.roll) * Math.min(1, dt * 6);
    st.roll = Math.max(-0.08, Math.min(0.08, st.roll));
    // Surge forward on boost / nitro (the camera lags behind).
    const zT = -2.2 * Math.min(1, st.boost) - 3.2 * st.nitro;
    st.z += (zT - st.z) * Math.min(1, dt * 1.6);
    st.pitch += ((-0.035 * st.nitro - 0.012 * st.boost + 0.05 * st.launch * (st.v > 2 ? 1 : 0)) - st.pitch) * Math.min(1, dt * 4);

    // Spin-out (game over): yaw spins out and the car slides to the shoulder.
    if (st.spin >= 0) {
      st.spin += dt;
      const u = Math.min(1, st.spin / 2.2), e = 1 - Math.pow(1 - u, 3);
      st.yaw = st.spinYaw + e * Math.PI * 2.75 * (st.side > 0 ? 1 : -1);
      st.targetX = st.side * 7.4;
      if (st.spin < 1.6 && Math.random() < 0.6) puff(st.x, st.z + 1.5, 1);
      if (st.spin > 2.4) { st.spin = -1; st.stopped = true; }
    }
    // Suspension thump (hard drop) + bob on the pulse.
    st.thumpV += (-st.thump * 160 - st.thumpV * 14) * dt; st.thump += st.thumpV * dt;
    const bob = (st.stopped ? 0 : 0.014 * onPulse) + st.thump;

    heroG.position.set(st.x, 0, st.z);
    heroG.rotation.y = st.yaw;
    bodyG.position.y = bob;
    bodyG.rotation.set(st.pitch, 0, st.roll);
    const spinRate = Math.min(st.v / wheelR, 16);
    for (const w of hero.wheels) {
      w.mesh.rotation.x -= spinRate * dt;
      w.pivot.rotation.y = w.front ? Math.max(-0.35, Math.min(0.35, -st.vx * 0.06)) : 0;
    }
    const stopped = st.stopped || st.v < 0.5;
    const hazard = stopped && st.spin < 0 ? (Math.sin(songTime * 9) > 0 ? 1 : 0.15) : 0;
    paint.uniforms.uTail.value = stopped ? 1 + 2.5 * hazard : 1.6 + 1.2 * onBeat * 0.4 + st.flash;
    paint.uniforms.uHead.value = 1.8 + 3 * highK + st.flash;
    paint.uniforms.uScroll.value = -st.s;
    scenery.uniforms.uScroll.value = -st.s;
    beamMat.opacity = (0.05 + 0.03 * onPulse) * (1 + 2.5 * highK) * (stopped ? 0.6 : 1);
    // Flames: nitro roars blue-orange, a level-up pops a backfire.
    const fl = Math.max(st.nitro > 0 ? 0.5 + st.nitro * 0.8 : 0, st.backfire, st.launch > 0.7 ? 0.8 : 0);
    flames.forEach((f, i) => {
      const flick = 0.75 + 0.5 * Math.random();
      f.visible = fl > 0.02;
      f.scale.set(1, 1, fl * flick * (i % 2 ? 0.7 : 1.15) * 1.3);
    });

    // Roadside scroll.
    for (const w of wraps) w.g.position.z = ((st.s % w.gap) + w.gap) % w.gap;
    for (const m of boardMats) m.color.setScalar(0.7 + 0.3 * onBeat);

    // Traffic.
    nGlow = 0; nRefl = 0;
    const counts = { sedan: 0, suv: 0, truck: 0, semi: 0 };
    for (const c of cars) {
      c.z += (st.v - c.v) * dt;
      if (c.z > 26 || c.z < -420) spawn(c, c.z > 26 ? -300 : -300);
      const def = tdefs[c.type], m = tmesh[c.type];
      const i = counts[c.type]++;
      if (i >= m.instanceMatrix.count) continue;
      // Give the hero room: drift away when he's alongside.
      const x0 = LANES[c.lane], dzh = c.z - st.z, dxh = x0 - st.x;
      // (traffic ahead in his path moves over too — they see him coming)
      const near = dzh < def.len / 2 + 15 && dzh > -def.len / 2 - 16 && Math.abs(dxh) < 2.9;
      c.xo = c.xo || 0;
      const xoT = near ? Math.sign(dxh || -x0) * (2.9 - Math.abs(dxh) + 0.4) : 0;
      c.xo += (Math.max(-6.2 - x0, Math.min(6.2 - x0, xoT)) - c.xo) * Math.min(1, dt * 4);
      const x = x0 + c.xo + 0.15 * Math.sin(songTime * 0.4 + c.wob);
      dummy.position.set(x, 0.006 * Math.sin(songTime * 9 + c.wob), c.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, col.set(c.color));
      // Blocking the camera's view of the hero (or right under the lens)? Dither it out.
      const camZ = camera.position.z, camXp = camera.position.x;
      let fT = 0;
      if (c.z - def.len / 2 < camZ && c.z + def.len / 2 > st.z + 1.5) {
        const u = (Math.min(camZ, c.z + def.len / 2) - st.z) / Math.max(1, camZ - st.z);
        const sx = st.x + (camXp - st.x) * Math.max(0, Math.min(1, u));
        if (Math.abs(x - sx) < def.w / 2 + 1.4) fT = def.len > 6 ? 0.82 : 0.7;
      }
      const prox = Math.max(0, Math.min(1, (c.z + def.len / 2 - (camZ - 13)) / 8));
      fT = Math.max(fT, 0.85 * prox * prox * (3 - 2 * prox));
      c.fade = (c.fade || 0) + (fT - (c.fade || 0)) * Math.min(1, dt * 6);
      def.geo.attributes.aFade.array[i] = c.fade;
      const [tz, ty, tw] = def.tail;
      const brake = c.z > st.z - 30 && c.z < st.z + 4 ? 1.6 : 1;
      glow(x - tw, ty, c.z + tz + 0.05, 0.9, 0xff2030, 0.55 * brake); glow(x + tw, ty, c.z + tz + 0.05, 0.9, 0xff2030, 0.55 * brake);
      refl(x - tw, c.z + tz, 0.5, 7, 0xff1a20, 0.35); refl(x + tw, c.z + tz, 0.5, 7, 0xff1a20, 0.35);
    }
    for (const t of TYPES) { tmesh[t].count = Math.min(counts[t], tmesh[t].instanceMatrix.count); tmesh[t].instanceMatrix.needsUpdate = true; tdefs[t].geo.attributes.aFade.needsUpdate = true; if (tmesh[t].instanceColor) tmesh[t].instanceColor.needsUpdate = true; }
    // Oncoming: head lights streaming at us.
    onc.forEach((o, i) => {
      o.z += (st.v + o.v) * dt;
      if (o.z > 30) { o.z -= 380 + Math.random() * 30; o.lane = [-12.7, -16, -19.3][Math.floor(Math.random() * 3)]; }
      dummy.position.set(o.lane, 0, o.z); dummy.rotation.set(0, Math.PI, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      oncMesh.setMatrixAt(i, dummy.matrix);
      glow(o.lane - 0.6, 0.6, o.z + 2.35, 1.6, 0xfff2d8, 0.8); glow(o.lane + 0.6, 0.6, o.z + 2.35, 1.6, 0xfff2d8, 0.8);
      refl(o.lane, o.z + 2.4, 1.4, 12, 0xfff0d0, 0.28);
    });
    oncMesh.instanceMatrix.needsUpdate = true;
    // Lamp heads: glow + long warm streaks down the wet road.
    const lz0 = lampG.position.z;
    for (const z of lampZ) {
      const zz = z + lz0;
      if (zz < -260) continue;
      glow(6.4, 9.2, zz, 2.2, 0xffb060, 0.7); glow(-7.1, 9.2, zz, 2.2, 0xffb060, 0.7); glow(-12.3, 9.2, zz, 2.2, 0xffb060, 0.55);
      refl(6.4, zz, 1.0, 18, 0xff9a40, 0.34); refl(-7.1, zz, 1.0, 18, 0xff9a40, 0.34);
    }
    // Hero lights: tail-light glows + streaks, head lights.
    const hx = st.x, hz = st.z, cyaw = Math.cos(st.yaw), syaw = Math.sin(st.yaw);
    const loc = (lx, lz) => [hx + lx * cyaw + lz * syaw, hz - lx * syaw + lz * cyaw];
    for (const sx of [1, -1]) {
      const [tx, tz] = loc(sx * 0.55, 2.35);
      glow(tx, 0.68 + bob, tz + 0.1, 1.1, 0xff1a28, stopped ? 0.5 + hazard : 0.7 + 0.3 * onBeat);
      refl(tx, tz, 0.55, 6, 0xff1a20, 0.45);
      const [fx, fz] = loc(sx * 0.62, -2.2);
      glow(fx, 0.52 + bob, fz, 0.9 + 1.2 * highK, 0xfff4e0, 0.6 + highK);
    }
    // Neon underglow on the road (pulses on the beat, combos cycle the hue).
    st.glowHue = (st.glowHue + dt * (0.05 + st.combo * 0.12)) % 1;
    col.setHSL(st.combo > 2 ? st.glowHue : 0.97, 0.95, 0.5).multiplyScalar((0.18 + 0.22 * onPulse + 0.3 * st.boost + 0.6 * st.nitro) * (stopped ? 0.3 : 1));
    roadMat.uniforms.uGlow.value.copy(col);
    roadMat.uniforms.uCar.value.set(hx, hz, st.yaw);
    roadMat.uniforms.uScroll.value = st.s;
    roadMat.uniforms.uHead.value = 1 + 1.5 * highK;
    roadMat.uniforms.uFlash.value = st.flash * 0.6 + 0.08 * onBeat;
    glowMesh.count = nGlow; reflMesh.count = nRefl;
    glowMesh.instanceMatrix.needsUpdate = reflMesh.instanceMatrix.needsUpdate = true;
    if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
    if (reflMesh.instanceColor) reflMesh.instanceColor.needsUpdate = true;

    // Tail-light trails: laid where the tail lights WERE (the road scrolls
    // under them), so a weave leaves a curve behind the car.
    {
      const tl = loc(-0.55, 2.4), tr = loc(0.55, 2.4);
      hist.unshift({ s: st.s, lx: tl[0], lz: tl[1], rx: tr[0], rz: tr[1], y: bob });
      if (hist.length > 120) hist.pop();
    }
    const trailLen = 3 + st.v * 0.12 * (1 + st.boost + 2.2 * st.nitro);
    for (let r = 0; r < 2; r++) {
      let h = 0;
      for (let j = 0; j < TRAIL; j++) {
        const d = (j / (TRAIL - 1)) * trailLen;
        while (h < hist.length - 2 && st.s - hist[h + 1].s <= d) h++;
        const A = hist[h], Bq = hist[Math.min(hist.length - 1, h + 1)];
        const span = A.s - Bq.s, f0 = span > 1e-4 ? Math.min(1, Math.max(0, (d - (st.s - A.s)) / span)) : 0;
        const ax = r ? A.rx : A.lx, az = r ? A.rz : A.lz, bx = r ? Bq.rx : Bq.lx, bz = r ? Bq.rz : Bq.lz;
        const px = ax + (bx - ax) * f0, pz = az + (bz - az) * f0 + (st.s - A.s) + span * f0, py = 0.66 + A.y;
        const a = (r * TRAIL + j) * 2 * 3, w = 0.07;
        trailPos[a] = px - w; trailPos[a + 1] = py; trailPos[a + 2] = pz;
        trailPos[a + 3] = px + w; trailPos[a + 4] = py; trailPos[a + 5] = pz;
        const f = Math.pow(1 - j / (TRAIL - 1), 1.6) * (stopped ? 0 : 0.85) * (0.6 + 0.4 * Math.min(1, st.v / 30));
        const g = st.nitro > 0.1 ? 0.25 : 0.04;
        trailCol[a] = trailCol[a + 3] = f; trailCol[a + 1] = trailCol[a + 4] = f * g; trailCol[a + 2] = trailCol[a + 5] = f * (st.nitro > 0.1 ? 0.5 : 0.08);
      }
    }
    trailGeo.attributes.position.needsUpdate = trailGeo.attributes.color.needsUpdate = true;

    // Smoke.
    let ns = 0;
    for (const p of smoke) {
      if (p.life <= 0) continue;
      p.life -= dt; p.z += st.v * dt * 0.9; p.y += dt * 0.8; p.x += p.vx * dt; p.s += dt * 2.2;
      if (p.life <= 0) continue;
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix();
      smokeMesh.setMatrixAt(ns, dummy.matrix); smokeMesh.setColorAt(ns++, col.setScalar(Math.min(1, p.life)));
    }
    smokeMesh.count = ns; smokeMesh.instanceMatrix.needsUpdate = true; if (smokeMesh.instanceColor) smokeMesh.instanceColor.needsUpdate = true;
    if (st.launch > 0.5 && st.v > 1 && Math.random() < 0.5) puff(st.x, st.z + 2.2, 1);

    // ── Camera ──
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    const t = songTime;
    // Landscape: the board + HOLD/NEXT panels cover the middle (~56% of
    // the width at 16:10, more on narrower screens): park the car in the
    // middle of the visible strip on its side, pulling the camera back on
    // narrow screens so the car fits the strip.
    const tanH = Math.tan(st.fov * Math.PI / 360), covered = Math.min(0.85, 0.56 * 1.6 / aspect);
    const dist = portrait ? 12 : Math.max(11.8, Math.min(16, 2.2 / ((1 - covered) * 0.55) / (tanH * aspect)));
    const halfW = dist * tanH * aspect;
    const camXT = portrait ? st.x : st.x - st.side * ((covered + 1) / 2 - 0.02) * halfW;
    st.camX += (camXT - st.camX) * Math.min(1, dt * (portrait ? 6 : 2.2));
    st.camZ += ((st.z * (portrait ? 0.95 : 0.7) + dist + 1.5 * st.nitro) - st.camZ) * Math.min(1, dt * 2);
    st.shake = Math.max(st.nitro * 0.06, st.spin >= 0 ? 0.03 : 0, Math.abs(st.thump) * 0.6);
    const sh = st.shake;
    const swayX = Math.sin(t * 0.31) * 0.25, swayY = Math.sin(t * 0.23) * 0.12;
    camera.position.set(st.camX + swayX + (Math.random() - 0.5) * sh, (portrait ? 3.4 : 4.6) + swayY + (Math.random() - 0.5) * sh - 0.02 * onBeat, st.camZ);
    camera.lookAt(st.camX + swayX * 0.6, portrait ? 0.9 : 1.15, st.z - 22);
    camera.rotateZ(Math.sin(t * 0.17) * 0.012 - st.roll * 0.25);
    const fovT = (portrait ? 54 : 50) + 6 * Math.min(1, st.boost) + 16 * st.nitro;
    st.fov += (fovT - st.fov) * Math.min(1, dt * 3);
    if (Math.abs(camera.fov - st.fov) > 0.01) { camera.fov = st.fov; }
    // Portrait: slide the frustum so the car sits in the strip under the board.
    if (portrait) camera.setViewOffset(1000 * aspect, 1000, 0, -1000 * 0.235, 1000 * aspect, 1000);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix();
    // Far layers ride with the camera.
    sky.position.set(camera.position.x, 0, camera.position.z);
    for (const f of farLayers) { f.position.x = camera.position.x; f.position.z = camera.position.z; }
    ground.position.x = camera.position.x; ground.position.z = camera.position.z - 300;
    sky.material.uniforms.uTime.value = t;
    sky.material.uniforms.uPulse.value = 0.4 * onBeat + st.flash;

    // Speed lines.
    const slK = Math.min(1, 0.04 + 0.5 * st.boost + 1.2 * st.nitro) * (stopped ? 0 : 1);
    for (let i = 0; i < SL; i++) {
      const L = lines[i];
      L.z += st.v * dt * 1.6;
      if (L.z > 4) { L.z -= 90; L.a = Math.PI * (1.05 + Math.random() * 0.9); L.r = 3.5 + Math.random() * 7; }
      const x = camera.position.x + Math.cos(L.a) * L.r * 1.5, y = Math.max(0.3, camera.position.y + Math.sin(L.a) * L.r * 0.7);
      const z = camera.position.z - 6 + L.z, len = 2 + st.v * 0.12 * (1 + 3 * st.nitro);
      slPos.set([x, y, z, x, y, z - len], i * 6);
      const c = slK * (0.4 + 0.6 * onPulse) * Math.min(1, (L.z + 90) / 30);
      slCol.set([c, c * 0.9, c * 0.85, 0, 0, 0], i * 6);
    }
    slGeo.attributes.position.needsUpdate = slGeo.attributes.color.needsUpdate = true;
  }

  function react(kind, data = {}) {
    if (kind === 'clear') {
      const n = Math.max(1, data.lines || 1);
      if (st.stopped || st.spin >= 0) return;
      if (n >= 4) {                       // TETRIS: nitro — cross, then weave back
        st.nitro = 1.25; st.flash = 1; cross(1.5);
        st.second = 0.9;
      } else {
        cross(n);
        st.flash = Math.max(st.flash, 0.2 * n);
        if (n >= 2) st.highN = Math.max(st.highN, n - 1);
        if (n >= 3) st.backfire = 1;
      }
    } else if (kind === 'move') {
      // Every piece move: a flick of the wheel that way.
      if (st.spin < 0 && !st.stopped) st.vx += (data.dir || 0) * 2.4;
    } else if (kind === 'rotate') {
      st.flash = Math.max(st.flash, 0.12);   // headlight flick on each spin
      st.thumpV -= 0.15;
    } else if (kind === 'soft') {
      st.boost = Math.min(1.6, st.boost + 0.06);
    } else if (kind === 'hold') {
      st.backfire = 1;
    } else if (kind === 'drop') {
      st.thumpV -= 0.5 + Math.min(1, (data.rows || 0) / 12);
    } else if (kind === 'levelUp') {
      st.level = data.level || st.level + 1;
      st.vBase = Math.min(56, 36 * (1 + 0.04 * (st.level - 1)));
      st.backfire = 1; st.boost = Math.min(1.6, st.boost + 0.5); st.flash = 0.5;
    } else if (kind === 'combo') {
      st.combo = data.n || 0;
      if (st.combo >= 2) st.highN = Math.min(4, st.combo);
    } else if (kind === 'gameOver') {
      if (st.spin < 0 && !st.stopped) { st.spin = 0; st.spinYaw = st.yaw; st.combo = 0; st.flash = 0.6; }
    } else if (kind === 'start') {
      st.spin = -1; st.stopped = false; st.yaw = 0; st.launch = 1; st.backfire = 1; st.combo = 0;
      st.x = st.side * HOME; st.vx = 0; st.flash = 0.5;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog;
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
  };
}
