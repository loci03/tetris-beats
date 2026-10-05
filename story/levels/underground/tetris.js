// THE UNDERGROUND — the living Tetris world: you're in the crowd at a
// warehouse rave. A DJ works the decks on a riser (back left), an LED wall
// pumps EQ bars (back right), speaker stacks boom, moving heads on the truss
// throw beams and light pools onto the concrete, lasers sweep the room, the
// crowd bounces with phones flashing — the old 2D warehouse scene, in 3D.
//
// Reactions: moves bump the crowd and twitch the DJ (meters jump, lasers
// kick that way); rotations swing the moving heads and spin the platters;
// soft drops pump the subs; hard drops are bass drops (strobe + a jump wave
// through the crowd + fogger puff, scaled by rows); holds swap the record;
// clears rain confetti from the truss (12/22/36/60 + combo), triples and
// Tetrises white-flash the room, Tetrises fire the CO2 cannons; combos
// escalate (CO2, laser strobe, colour chase); level up is a laser show;
// a high stack turns the room red with alarm beacons; game over kills the
// lights; start slams them back on.
//
// Framing: the board covers the middle; the DJ and LED wall sit in the side
// strips, the truss + sign above, crowd heads/hands below. Portrait pulls
// back so the truss reads above the board and the crowd below it.

import { makeKit } from './tetris-kit.js';

const NEON = [0xff2d6f, 0x29e7ff, 0xb35cff, 0xffd23f, 0x3dff9a];

const FLOOR_FS = `
uniform sampler2D uMap; uniform vec3 uAmb; uniform float uFlash, uRed;
uniform vec3 uSpot[6]; uniform vec3 uSpotC[6];
varying vec2 vUv; varying vec3 vW;
#include <fog_pars_fragment>
void main() {
  vec3 c = texture2D(uMap, vUv * 12.0).rgb * uAmb;
  for (int i = 0; i < 6; i++) {
    vec2 d = vW.xz - uSpot[i].xy;
    c += uSpotC[i] * exp(-dot(d, d) / (uSpot[i].z * uSpot[i].z)) * 0.55;
  }
  c += vec3(0.9, 0.9, 1.0) * uFlash * 0.35 + vec3(0.5, 0.0, 0.02) * uRed * 0.25;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
const FLOOR_VS = `
varying vec2 vUv; varying vec3 vW;
#include <fog_pars_vertex>
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const LED_FS = `
uniform float uTime, uBeat, uLevel, uHue, uFlash, uRed, uRain;
uniform sampler2D uLogo;
varying vec2 vUv;
vec3 hsv(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float cols = 16.0, x = floor(vUv.x * cols);
  float ph = fract(uBeat), on = exp(-ph * 5.0);
  float h = 0.25 + 0.45 * hash(x + floor(uTime * 8.0)) * (0.5 + 0.5 * on) + uLevel * 0.35 * (0.6 + 0.4 * hash(x * 3.1 + floor(uTime * 14.0)));
  float bar = step(vUv.y, h) * step(0.12, fract(vUv.x * cols)) * step(0.15, fract(vUv.y * 22.0));
  vec3 col = hsv(uHue + x / cols * 0.5 + vUv.y * 0.2 + uRain * uTime * 0.6);
  vec3 c = col * bar * (0.55 + 0.6 * on) + col * 0.05;
  vec4 lg = texture2D(uLogo, vUv);
  c = mix(c, vec3(1.0) * (0.8 + 0.4 * on), lg.a * 0.9);
  c = mix(c, vec3(1.0, 0.05, 0.05) * (0.4 + 0.6 * on) * bar + vec3(0.3, 0.0, 0.0), uRed * 0.85);
  c += uFlash * 0.8;
  gl_FragColor = vec4(c, 1.0);
}`;

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const K = makeKit(THREE), keep = K.keep;
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0x0a0610, 14, 46);
  scene.background = new THREE.Color(0x05030a);
  camera.far = 120; camera.updateProjectionMatrix();
  const root = new THREE.Group();
  scene.add(root);
  const col = new THREE.Color(), dummy = new THREE.Object3D(), dirV = new THREE.Vector3();
  const lam = (extra) => keep(new THREE.MeshLambertMaterial({ vertexColors: true, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const addMat = (color, opacity = 1, map = null) => keep(new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));

  // ── Room ────────────────────────────────────────────────────────
  const concrete = K.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4650'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(40, 0); g.lineTo(90, 120); g.lineTo(70, 256); g.stroke();
  });
  concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping;
  const floorU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uMap: { value: concrete }, uAmb: { value: new THREE.Color(0.16, 0.14, 0.2) }, uFlash: { value: 0 }, uRed: { value: 0 },
    uSpot: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, 0, 1.6)) }, uSpotC: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
  }]);
  floorU.uMap.value = concrete;
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(44, 44)), keep(new THREE.ShaderMaterial({ uniforms: floorU, vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS, fog: true })));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 2;
  root.add(floor);

  const brick = K.canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#3c3240'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) g.strokeRect(x, y, 32, 16);
    const sprays = ['#ff2d6f', '#29e7ff', '#ffd23f', '#3dff9a', '#b35cff'];
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * w, y = 110 + Math.random() * 130, r = 30 + Math.random() * 60;
      const gr = g.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, sprays[i % 5] + 'aa'); gr.addColorStop(1, sprays[i % 5] + '00');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const tag = (t, x, y, s, f, r) => { g.save(); g.translate(x, y); g.rotate(r); g.font = `900 ${s}px "Arial Black", Impact, sans-serif`; g.lineWidth = s * 0.16; g.strokeStyle = '#111'; g.strokeText(t, 0, 0); g.fillStyle = f; g.fillText(t, 0, 0); g.restore(); };
    tag('BOOM', 70, 200, 52, '#ffd23f', -0.12); tag('BEATS', 440, 190, 56, '#29e7ff', 0.08); tag('DROP IT', 250, 225, 34, '#3dff9a', -0.05);
  });
  brick.wrapS = THREE.RepeatWrapping; brick.repeat.set(2, 1);
  const wallMat = keep(new THREE.MeshLambertMaterial({ map: brick }));
  const back = new THREE.Mesh(keep(new THREE.PlaneGeometry(34, 10)), wallMat);
  back.position.set(0, 5, -9); root.add(back);
  const sideTex = concrete.clone(); keep(sideTex); sideTex.needsUpdate = true; sideTex.repeat.set(4, 2);
  for (const sx of [-1, 1]) {
    const s = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 10)), keep(new THREE.MeshLambertMaterial({ color: 0x5a5262, map: sideTex })));
    s.position.set(sx * 16, 5, 3); s.rotation.y = -sx * Math.PI / 2; root.add(s);
  }
  const ceil = new THREE.Mesh(keep(new THREE.PlaneGeometry(34, 26)), basic(0x08060c));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 9.5, 2); root.add(ceil);

  // Static structure: truss, DJ riser + booth, speaker stacks, LED wall frame, pillars.
  const B = new K.Builder();
  for (const z of [-3, 1.5]) { B.box(30, 0.3, 0.3, 0, 7.6, z, 0x3a3846); B.box(30, 0.3, 0.3, 0, 8.2, z, 0x3a3846); }
  for (let x = -14; x <= 14; x += 1) B.box(0.06, 0.6, 0.06, x, 7.9, -3, 0x4a4856).box(0.06, 0.6, 0.06, x, 7.9, 1.5, 0x4a4856);
  for (const x of [-13, 13]) for (const z of [-8, 5]) B.box(0.5, 9.5, 0.5, x, 4.75, z, 0x2e2c38);
  // DJ riser + booth (back left)
  B.box(5.4, 1.7, 3.2, -9, 0.85, -6.2, 0x1c1a24);
  B.box(3.6, 1.1, 1.0, -9, 2.25, -5.2, 0x15131c);
  B.box(3.8, 0.08, 1.15, -9, 2.83, -5.25, 0x2a2834);
  B.cyl(0.38, 0.38, 0.06, 18, -9.9, 2.89, -5.3, 0x202028).cyl(0.38, 0.38, 0.06, 18, -8.1, 2.89, -5.3, 0x202028);
  B.box(0.7, 0.1, 0.5, -9, 2.9, -5.3, 0x34323e);
  // Speaker stacks (outer flanks)
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) B.box(1.7, 1.35, 1.2, sx * 12, 0.68 + k * 1.38, -5.4, 0x111016);
  // LED wall frame (back right)
  B.box(5.2, 3.6, 0.3, 9, 3.4, -7.0, 0x15131c).box(0.3, 1.6, 0.3, 7.6, 0.8, -7.0, 0x2a2834).box(0.3, 1.6, 0.3, 10.4, 0.8, -7.0, 0x2a2834);
  // Front truss (over the crowd, frames the top of a portrait screen).
  B.box(30, 0.26, 0.26, 0, 6.5, 6.2, 0x3a3846).box(30, 0.26, 0.26, 0, 7.0, 6.2, 0x3a3846);
  for (let x = -14; x <= 14; x += 1) B.box(0.05, 0.5, 0.05, x, 6.75, 6.2, 0x4a4856);
  B.cyl(0.02, 0.02, 3.2, 4, 0, 8.0, 3.5, 0x222222);
  root.add(new THREE.Mesh(B.build(), lam()));
  // Mirror ball + par cans on the front truss.
  const ballTex = K.canvasTex(128, 64, (g, w, h) => { for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const v = 120 + Math.random() * 135; g.fillStyle = `rgb(${v},${v},${v + 10})`; g.fillRect(x, y, 3, 3); } });
  const ball = new THREE.Mesh(keep(new THREE.SphereGeometry(0.5, 18, 12)), keep(new THREE.MeshBasicMaterial({ map: ballTex })));
  ball.position.set(0, 6.3, 3.5); root.add(ball);
  const parGeo = keep(new THREE.CircleGeometry(0.2, 12));
  const pars = new THREE.InstancedMesh(parGeo, basic(0xffffff, { fog: false, side: THREE.DoubleSide }), 10);
  for (let i = 0; i < 10; i++) { dummy.position.set(-6.75 + i * 1.5, 6.28, 6.3); dummy.rotation.set(Math.PI / 2 + 0.5, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); pars.setMatrixAt(i, dummy.matrix); pars.setColorAt(i, col.set(NEON[i % 5])); }
  root.add(pars);

  // Speaker woofers (pump) + rings.
  const wooferGeo = keep(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 20)); wooferGeo.rotateX(Math.PI / 2);
  const woofers = new THREE.InstancedMesh(wooferGeo, keep(new THREE.MeshLambertMaterial({ color: 0x34323e })), 6);
  const ringGeo = keep(new THREE.TorusGeometry(0.48, 0.035, 5, 22));
  const ringMat = basic(0x29e7ff);
  const spkRings = new THREE.InstancedMesh(ringGeo, ringMat, 6);
  const wooferPos = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) wooferPos.push([sx * 12, 0.68 + k * 1.38, -4.78]);
  wooferPos.forEach((p, i) => { dummy.position.set(...p); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); spkRings.setMatrixAt(i, dummy.matrix); });
  root.add(woofers, spkRings);

  // LED wall screen (procedural EQ + logo).
  const logoTex = K.canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px "Arial Black", Impact, sans-serif'; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.9)';
    g.strokeText('UNDER', w / 2, h * 0.3); g.strokeText('GROUND', w / 2, h * 0.62);
    g.fillStyle = '#fff'; g.fillText('UNDER', w / 2, h * 0.3); g.fillText('GROUND', w / 2, h * 0.62);
  });
  const ledU = { uTime: { value: 0 }, uBeat: { value: 0 }, uLevel: { value: 0 }, uHue: { value: 0.85 }, uFlash: { value: 0 }, uRed: { value: 0 }, uRain: { value: 0 }, uLogo: { value: logoTex } };
  const led = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.8, 3.2)), keep(new THREE.ShaderMaterial({ uniforms: ledU, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: LED_FS })));
  led.position.set(9, 3.4, -6.83); root.add(led);

  // Neon sign over the room.
  const signTex = K.canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.font = '900 72px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#29e7ff'; g.shadowBlur = 22; g.strokeStyle = '#7ff4ff'; g.lineWidth = 6; g.strokeText('UNDERGROUND', w / 2, h / 2);
    g.shadowBlur = 10; g.fillStyle = '#eaffff'; g.fillText('UNDERGROUND', w / 2, h / 2);
  });
  const signMat = basic(0xffffff, { map: signTex, transparent: true, depthWrite: false, fog: false });
  const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 2.25)), signMat);
  sign.position.set(0, 8.6, -8.9); root.add(sign);

  // Neon tubes on the side walls.
  const tubes = [];
  const tubeGeo = keep(new THREE.CylinderGeometry(0.06, 0.06, 7, 6)); tubeGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const sx = i < 3 ? -1 : 1, k = i % 3, mat = basic(NEON[i % 5], { fog: false });
    const t = new THREE.Mesh(tubeGeo, mat); t.position.set(sx * 15.8, 2 + k * 2, 0 - k * 1.2); root.add(t);
    tubes.push({ mat, base: NEON[i % 5] });
  }

  // ── The DJ ──────────────────────────────────────────────────────
  const dj = new THREE.Group(); dj.position.set(-9, 1.7, -6.1); dj.scale.setScalar(1.3); root.add(dj);
  const djBody = new K.Builder();
  djBody.add(new THREE.CapsuleGeometry(0.3, 0.6, 2, 8), 0, 1.0, 0, 0x1a1a22);
  djBody.box(0.62, 0.18, 0.4, 0, 1.2, 0, 0xff2d6f);
  const djTorso = new THREE.Mesh(djBody.build(), lam()); dj.add(djTorso);
  const djHead = new THREE.Group(); djHead.position.set(0, 1.72, 0); dj.add(djHead);
  const hb = new K.Builder();
  hb.sphere(0.22, 0, 0, 0, 0x8d5524).box(0.5, 0.06, 0.06, 0, 0.2, 0, 0x111111).sphere(0.1, -0.24, 0, 0, 0x111111, 0.6, 1, 1).sphere(0.1, 0.24, 0, 0, 0x111111, 0.6, 1, 1);
  hb.box(0.34, 0.08, 0.05, 0, 0.04, 0.2, 0x0a0a0a);   // shades
  hb.box(0.48, 0.1, 0.5, 0, 0.18, 0.02, 0x29e7ff);    // cap
  djHead.add(new THREE.Mesh(hb.build(), lam()));
  const armGeo = keep(new THREE.CapsuleGeometry(0.08, 0.55, 2, 6)); armGeo.translate(0, -0.33, 0);
  const armMat = keep(new THREE.MeshLambertMaterial({ color: 0x8d5524 }));
  const djArms = [-1, 1].map(s => { const a = new THREE.Mesh(armGeo, armMat); a.position.set(s * 0.36, 1.42, 0); dj.add(a); return a; });
  const recordGeo = keep(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 20));
  const record = new THREE.Mesh(recordGeo, basic(0x111111)); record.rotation.x = Math.PI / 2; record.position.set(0, -0.7, 0.1); record.visible = false;
  djArms[1].add(record);
  const platters = [-9.9, -8.1].map(x => { const m = new THREE.Mesh(recordGeo, basic(0x0c0c0c)); m.position.set(x, 2.94, -5.3); root.add(m); const dot = new THREE.Mesh(keep(new THREE.BoxGeometry(0.06, 0.03, 0.2)), basic(0xffd23f)); dot.position.z = 0.18; m.add(dot); return m; });
  // Booth LED strip + level meters.
  const boothLedMat = basic(0xff2d6f, { fog: false });
  const boothLed = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.4, 0.12)), boothLedMat); boothLed.position.set(-9, 2.05, -4.69); root.add(boothLed);
  const meterGeo = keep(new THREE.BoxGeometry(0.22, 1, 0.04)); meterGeo.translate(0, 0.5, 0);
  const meters = new THREE.InstancedMesh(meterGeo, basic(0xffffff, { fog: false }), 10);
  for (let i = 0; i < 10; i++) meters.setColorAt(i, col.set(i < 6 ? 0x3dff9a : i < 8 ? 0xffd23f : 0xff2d6f));
  root.add(meters);
  const meterLv = new Float32Array(10);

  // ── Moving heads on the front truss: beam cones + floor pools ────
  const heads = [];
  const beamGeo = keep(new THREE.ConeGeometry(0.9, 9, 16, 1, true)); beamGeo.translate(0, -4.5, 0);
  const headGeo = keep(new THREE.CylinderGeometry(0.18, 0.25, 0.42, 10));
  const headMat = keep(new THREE.MeshLambertMaterial({ color: 0x1a1a22 }));
  const HX = [-7.5, -5, -2.5, 2.5, 5, 7.5];
  HX.forEach((x, i) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 7.35, 1.5); root.add(pivot);
    const body = new THREE.Mesh(headGeo, headMat); pivot.add(body);
    const mat = addMat(NEON[i % 5], 0.1);
    const beam = new THREE.Mesh(beamGeo, mat); pivot.add(beam);
    const lens = new THREE.Mesh(keep(new THREE.CircleGeometry(0.17, 10)), basic(0xffffff, { fog: false })); lens.rotation.x = Math.PI / 2; lens.position.y = -0.22; pivot.add(lens);
    heads.push({ pivot, mat, lens, x, phase: i * 1.1, side: x < 0 ? -1 : 1 });
  });
  // Strobe bars on the back truss.
  const strobeMat = basic(0x222228, { fog: false });
  const strobes = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.9, 0.22, 0.12)), strobeMat, 8);
  for (let i = 0; i < 8; i++) { dummy.position.set(-10.5 + i * 3, 7.3, -3); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); strobes.setMatrixAt(i, dummy.matrix); }
  root.add(strobes);
  // Alarm beacons (danger) on the pillars.
  const beaconMat = addMat(0xff1010, 0, K.glowTex);
  const beaconGeo = keep(new THREE.PlaneGeometry(1, 1));
  const beacons = [[-13, 6.5, -7.6], [13, 6.5, -7.6], [-13, 6.5, 4.6], [13, 6.5, 4.6]].map(p => { const m = new THREE.Mesh(beaconGeo, beaconMat); m.position.set(...p); m.scale.setScalar(2.2); root.add(m); return m; });

  // ── Lasers ──────────────────────────────────────────────────────
  const lasers = [];
  const laserGeo = keep(new THREE.CylinderGeometry(0.025, 0.025, 30, 5)); laserGeo.translate(0, -15, 0);
  const NL = low ? 6 : 10;
  for (let i = 0; i < NL; i++) {
    const mat = addMat(NEON[i % 5], 0.5);
    const m = new THREE.Mesh(laserGeo, mat);
    const side = i % 2 ? 1 : -1;
    m.position.set(side * (2.5 + (i >> 1) * 0.35), 7.4, -7.5);
    root.add(m);
    lasers.push({ m, mat, side, phase: i * 0.83 });
  }

  // ── Haze sheets ─────────────────────────────────────────────────
  const hazeMat = keep(new THREE.MeshBasicMaterial({ map: K.softTex, color: 0x6a3a8a, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  for (const [x, y, z, s] of [[-8, 1.2, -4, 12], [8, 1.2, -4, 12], [0, 1.5, -6, 16], [-6, 2.8, 1, 9], [6, 2.8, 1, 9]]) {
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(s, s * 0.45)), hazeMat); m.position.set(x, y, z); root.add(m);
  }

  // ── Crowd ───────────────────────────────────────────────────────
  const spots = [];
  const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22];
  const shirts = [0x22222c, 0x3a2c4a, 0x1d3540, 0x4a1d2c, 0x2c2c2c, 0xd0d0d8, 0x7a1a3a, 0x1a4a5a];
  const rows = low ? 5 : 6;
  for (let r = 0; r < rows; r++) {
    const z = -2.5 + r * (9.5 / rows), n = Math.round((low ? 14 : 18) + r * 1.5), half = 9 + r * 0.8;
    for (let i = 0; i < n; i++) {
      const x = -half + (2 * half) * (i + 0.5 + (Math.random() - 0.5) * 0.6) / n;
      spots.push({ x, z: z + (Math.random() - 0.5) * 0.6, y: 0, s: 0.95 + Math.random() * 0.15, shirt: shirts[(i + r) % shirts.length], skin: skins[(i * 3 + r) % skins.length] });
    }
  }
  const crowd = K.makeCrowd(spots, { lowPoly: true });
  crowd.u.uKey.value.setRGB(0.12, 0.11, 0.15); crowd.u.uAmb.value.setRGB(0.05, 0.04, 0.07);
  root.add(crowd.mesh);

  // ── Particles ───────────────────────────────────────────────────
  const confetti = K.makePool(low ? 220 : 420, { additive: false });
  const glows = K.makePool(low ? 60 : 110, { map: K.glowTex });          // phone flashes, sparks
  const smoke = K.makePool(low ? 40 : 70, { map: K.softTex, order: 5 });  // CO2 jets, fogger
  root.add(confetti.mesh, glows.mesh, smoke.mesh);
  const CONF = [0x29e7ff, 0xff2d6f, 0xffffff, 0xffd23f, 0xff66cc, 0x3dff9a];
  const spawnConfetti = (n, cx = 0, spread = 11) => {
    for (let k = 0; k < n; k++) {
      confetti.spawn(cx + (Math.random() - 0.5) * spread * 2, 7.3 + Math.random() * 0.4, -3 + Math.random() * 9,
        (Math.random() - 0.5) * 1.4, -0.3 - Math.random() * 1.2, (Math.random() - 0.5) * 0.8,
        { life: 4 + Math.random() * 1.5, size: 0.13, aspect: 0.6, grav: 1.1, drag: 1.4, spin: 3 + Math.random() * 5, mode: 1, color: CONF[k % CONF.length], floor: 0.02 });
    }
  };
  const phoneFlash = (n) => {
    for (let k = 0; k < n; k++) {
      const s = spots[Math.floor(Math.random() * spots.length)];
      glows.spawn(s.x + 0.25, 1.95 + Math.random() * 0.3, s.z, 0, 0, 0, { life: 0.16 + Math.random() * 0.1, size: 0.9, size1: 0.5, color: 0xffffff });
    }
  };
  const co2 = (x, z, power = 1) => {
    for (let k = 0; k < 10; k++) smoke.spawn(x + (Math.random() - 0.5) * 0.3, 0.3, z, (Math.random() - 0.5) * 0.8, (7 + Math.random() * 4) * power, (Math.random() - 0.5) * 0.8,
      { life: 1.0 + Math.random() * 0.5, size: 0.6, size1: 3.2, drag: 1.8, color: 0x9aa0b4, alpha: 0.55 });
  };
  const fogPuff = (x, n) => { for (let k = 0; k < n; k++) smoke.spawn(x + (Math.random() - 0.5) * 6, 0.4, -3 + Math.random() * 4, (Math.random() - 0.5) * 2, 0.5 + Math.random(), (Math.random() - 0.5), { life: 1.6, size: 2, size1: 5, drag: 0.8, color: 0x5a3a7a, alpha: 0.4 }); };
  const sparks = (x, y, z, n) => { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, sp = 1 + Math.random() * 3; glows.spawn(x, y, z, Math.cos(a) * sp, Math.random() * 3, Math.sin(a) * sp * 0.5, { life: 0.8 + Math.random() * 0.6, size: 0.12, grav: 7, mode: 2, aspect: 0.06, color: k % 3 ? 0xffb03a : 0xffffff, floor: 0.05 }); } };

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x8a90c0, 0x200a28, 0.55);
  const key = new THREE.DirectionalLight(0xffe8f0, 0.5); key.position.set(2, 8, 6);
  const djLight = new THREE.PointLight(0xff2d6f, 18, 12, 1.6); djLight.position.set(-8, 4, -3.5);
  const ledLight = new THREE.PointLight(0x29e7ff, 16, 12, 1.6); ledLight.position.set(8.5, 3.5, -4.5);
  root.add(hemi, key, djLight, ledLight);

  // ── State ───────────────────────────────────────────────────────
  const st = {
    t: 0, cheer: 0, flash: 0, strobe: 0, boom: 0, move: 0, twitch: 0, scratch: 0, swap: 0, armsUp: 0, rainbow: 0, dark: 0, lastBeat: -1,
    pal: 0, hop: 0, combo: 0, chase: 0, danger: 0, shake: 0, waveT: 99, waveX: 0, waveK: 0, follow: 0, start: 0,
    laserK: [0, 0], headK: [0, 0], platK: [0, 0], djLean: [0, 0], camKick: [0, 0], camDip: [0, 0],
  };
  const colX = (c) => (c == null ? 0 : (c - 4.5) / 4.5);

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0;
    st.t = t;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    if (whole !== st.lastBeat) { st.lastBeat = whole; if (whole % 4 === 0) st.pal = (st.pal + 1) % 5; }
    for (const k of ['cheer']) st[k] = Math.max(0, st[k] - dt * 0.45);
    st.flash = Math.max(0, st.flash - dt * 2.4);
    st.strobe = Math.max(0, st.strobe - dt);
    st.boom = Math.max(0, st.boom - dt * 3);
    st.move = Math.max(0, st.move - dt * 2.2);
    st.twitch = Math.max(0, st.twitch - dt * 4);
    st.scratch = Math.max(0, st.scratch - dt);
    st.swap = Math.max(0, st.swap - dt * 1.4);
    st.armsUp = Math.max(0, st.armsUp - dt * 0.4);
    st.rainbow = Math.max(0, st.rainbow - dt);
    st.chase = Math.max(0, st.chase - dt);
    st.shake = Math.max(0, st.shake - dt * 2.5);
    st.start = Math.max(0, st.start - dt);
    st.dark = Math.max(0, st.dark - dt * (st.dark > 0.9 ? 0 : 0.3));
    st.waveT += dt;
    st.danger += ((info.danger > 0.62 ? 1 : 0) - st.danger) * Math.min(1, dt * 2);
    const cheer = Math.max(st.cheer, (info.cheer || 0) * 0.8), move = Math.max(st.move, info.move || 0);
    const strobeOn = st.strobe > 0 && (Math.floor(t * 15) & 1) ? 1 : 0;
    const lit = 1 - 0.85 * st.dark;
    const red = st.danger;
    const laserK = K.spring(st.laserK, dt, 1.5, 0.25), headK = K.spring(st.headK, dt, 1.1, 0.2), platK = K.spring(st.platK, dt, 1.4, 0.3), djLean = K.spring(st.djLean, dt, 2.4, 0.3);
    const pal = (st.pal + st.hop) % 5;

    // Moving heads: sweep on the music, swing on rotations; pools on the floor.
    heads.forEach((h, i) => {
      const sweep = Math.sin(t * 0.7 + h.phase) * 0.45 + headK * (i % 2 ? 1 : -1);
      const tilt = 0.35 + 0.18 * Math.sin(t * 0.9 + h.phase * 2) - h.side * 0.12;
      h.pivot.rotation.set(tilt * (0.5 + 0.5 * Math.cos(h.phase)), 0, sweep - h.side * 0.25);
      const c = red > 0.5 ? 0xff1010 : st.rainbow > 0 || st.chase > 0 ? null : NEON[(pal + i) % 5];
      if (c == null) h.mat.color.setHSL((t * 0.8 + i * 0.17) % 1, 1, 0.55); else h.mat.color.set(c);
      const k = (0.05 + 0.07 * onBeat + 0.1 * cheer + 0.12 * strobeOn + 0.06 * Math.min(1, Math.abs(headK))) * lit;
      h.mat.opacity = k;
      h.lens.material.color.copy(h.mat.color).multiplyScalar(0.6 + onBeat * 0.6 + strobeOn);
      // Floor pool where the beam lands.
      const dir = dirV.set(0, -1, 0).applyEuler(h.pivot.rotation);
      const tt = dir.y < -0.1 ? -h.pivot.position.y / dir.y : 0;
      floorU.uSpot.value[i].set(h.pivot.position.x + dir.x * tt, h.pivot.position.z + dir.z * tt, 1.4);
      floorU.uSpotC.value[i].copy(h.mat.color).multiplyScalar(k * 5);
    });
    floorU.uFlash.value = strobeOn * 0.9 + st.flash;
    floorU.uRed.value = red * (0.5 + 0.5 * Math.sin(t * 6));
    floorU.uAmb.value.setRGB(0.16, 0.14, 0.2).multiplyScalar(lit * (1 + st.boom * 0.4));

    // Lasers: sweep on the music, kick with moves, fan out for a level up.
    lasers.forEach((l, i) => {
      const show = st.rainbow > 0 ? 1 : 0;
      const base = l.side * (0.5 + 0.4 * Math.sin(t * (1.1 + show * 2) + l.phase));
      l.m.rotation.z = base + laserK * 0.5 + (show ? Math.sin(t * 3 + i) * 0.6 : 0);
      l.m.rotation.x = -0.9 - 0.25 * Math.sin(t * 0.8 + l.phase * 2) - 0.2 * show;
      if (red > 0.5) l.mat.color.set(0xff1010); else if (show || st.chase > 0) l.mat.color.setHSL((t * 1.2 + i * 0.1) % 1, 1, 0.55); else l.mat.color.set(NEON[(pal + i) % 5]);
      const strobeL = st.combo >= 3 && st.chase > 0 ? ((Math.floor(t * 12) + i) & 1) : 1;
      l.mat.opacity = Math.min(1, (0.12 + 0.4 * onBeat * ((whole + i) % 2 ? 1 : 0.5) + 0.4 * Math.min(1, Math.abs(laserK)) + 0.35 * show + 0.3 * cheer) * lit * strobeL);
    });

    // Strobe bars, beacons, neon tubes, sign.
    strobeMat.color.setScalar(0.13 + strobeOn * 2 + onBeat * 0.15 + st.flash);
    const beac = red * (Math.sin(t * 9) > 0 ? 1 : 0.2);
    beaconMat.opacity = beac * 0.9;
    for (const b of beacons) b.quaternion.copy(camera.quaternion);
    tubes.forEach((tb, i) => {
      const flick = Math.sin(t * 23 + i * 7) > 0.985 ? 0.25 : 1;
      if (red > 0.5) tb.mat.color.set(0xff1010); else tb.mat.color.set(tb.base);
      tb.mat.color.multiplyScalar((0.35 + 0.65 * ((whole + i) % 3 === 0 ? onBeat : 0.4)) * flick * lit + strobeOn * 0.5);
    });
    if (red > 0.5) signMat.color.setRGB(1, 0.2 + 0.2 * Math.sin(t * 9), 0.2);
    else if (st.rainbow > 0) signMat.color.setHSL((t * 0.9) % 1, 1, 0.7);
    else signMat.color.setScalar(0.6 + 0.4 * cheer + 0.15 * onBeat);
    signMat.opacity = lit * ((Math.sin(t * 13) > 0.97) ? 0.35 : 1) * (st.start > 0 && Math.random() < 0.4 ? 0.2 : 1);

    // LED wall.
    ledU.uTime.value = t; ledU.uBeat.value = beat; ledU.uLevel.value = Math.min(1.4, move * 1.2 + cheer * 0.8 + st.boom);
    ledU.uHue.value = 0.8 + pal * 0.12; ledU.uFlash.value = strobeOn * 0.6 + st.flash * 0.5; ledU.uRed.value = red; ledU.uRain.value = st.rainbow > 0 || st.chase > 0 ? 1 : 0;

    // Mirror ball spins (faster when hyped), glints on the beat; par cans chase.
    ball.rotation.y += dt * (0.6 + cheer * 2 + (st.rainbow > 0 ? 2 : 0));
    ball.material.color.setScalar((0.5 + 0.5 * onBeat + strobeOn) * lit);
    if (lit > 0.5 && Math.random() < dt * (3 + cheer * 20 + onBeat * 6)) glows.spawn((Math.random() - 0.5) * 0.9, 6.3 + (Math.random() - 0.5) * 0.9, 4.0, 0, 0, 0, { life: 0.2, size: 0.5, size1: 0.1, color: 0xffffff });
    for (let i = 0; i < 10; i++) {
      const on = st.chase > 0 || st.rainbow > 0 ? ((Math.floor(t * 10) + i) % 5 === 0 ? 1 : 0.15) : ((whole + i) % 2 ? onBeat : 0.3);
      if (red > 0.5) col.set(0xff1010); else col.set(NEON[(pal + i) % 5]);
      pars.setColorAt(i, col.multiplyScalar((0.25 + on + move * 0.8 + strobeOn) * lit));
    }
    pars.instanceColor.needsUpdate = true;

    // Speakers.
    const pump = 1 + (0.12 * onBeat + 0.25 * st.boom) * lit;
    wooferPos.forEach((p, i) => { dummy.position.set(p[0], p[1], p[2] - 0.02 + st.boom * 0.06); dummy.rotation.set(0, 0, 0); dummy.scale.set(pump, pump, 1); dummy.updateMatrix(); woofers.setMatrixAt(i, dummy.matrix); });
    woofers.instanceMatrix.needsUpdate = true;
    ringMat.color.set(st.boom > 0.3 ? 0xffffff : red > 0.5 ? 0xff2020 : 0x29e7ff).multiplyScalar(lit * (0.5 + 0.5 * onBeat + st.boom));

    // DJ: head bob (harder on cheer/moves), lean in, scratch, twitch, swap records, hands up.
    const bob = Math.abs(Math.sin(beat * Math.PI)) * (0.05 + cheer * 0.09 + move * 0.05);
    djHead.position.y = 1.72 - bob; djHead.rotation.x = 0.15 + bob * 2 + cheer * 0.2;
    dj.rotation.x = 0.08 + cheer * 0.12 + move * 0.08 + djLean * 0.1;
    dj.rotation.z = djLean * 0.12;
    const scratching = cheer > 0.3 || st.scratch > 0;
    const scr = scratching ? Math.sin(t * 24) * 0.35 : 0, tw = st.twitch * Math.sin(t * 50) * 0.25;
    const up = Math.min(1, st.armsUp * 1.5);
    djArms[0].rotation.set(-1.0 + scr + tw - up * 1.6, 0, -0.25 - up * 0.5);
    const swapK = Math.sin(Math.min(1, st.swap) * Math.PI);
    djArms[1].rotation.set(-1.0 - scr + tw - Math.max(up, swapK) * 1.7, 0, 0.25 + up * 0.5);
    record.visible = st.swap > 0.05;
    platters.forEach((p, i) => { p.rotation.y += dt * (scratching && i === 0 ? -8 * Math.sign(Math.sin(t * 12)) : 3.5 + platK * 6); });
    boothLedMat.color.set(red > 0.5 ? 0xff1010 : NEON[pal]).multiplyScalar((0.4 + 0.4 * onBeat + 0.6 * move) * lit);
    for (let i = 0; i < 10; i++) {
      const target = Math.max(0.05, (0.15 + 0.5 * onBeat + 0.6 * move + 0.4 * cheer) * (0.6 + 0.4 * Math.sin(t * 9 + i * 1.7)) - i * 0.03);
      meterLv[i] += (target - meterLv[i]) * Math.min(1, dt * 14);
      dummy.position.set(-10.4 + i * 0.3, 1.82, -4.68); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, Math.min(0.75, meterLv[i] * 0.7) * lit + 0.01, 1); dummy.updateMatrix();
      meters.setMatrixAt(i, dummy.matrix);
    }
    meters.instanceMatrix.needsUpdate = true;

    // Crowd.
    const cu = crowd.u;
    cu.uBeat.value = beat; cu.uTime.value = t;
    cu.uHype.value = Math.min(1.2, 0.35 + cheer * 0.8 + move * 0.6) * (1 - 0.8 * st.dark);
    cu.uArms.value = Math.min(1, Math.max(cheer > 0.3 ? cheer : 0, st.armsUp, st.rainbow > 0 ? 0.9 : 0)) * (1 - st.dark);
    cu.uLean.value += ((-(info.pieceX || 0) * 0.6) - cu.uLean.value) * Math.min(1, dt * 3);
    cu.uBounce.value = 1 - 0.85 * st.dark;
    cu.uDown.value = st.dark;
    cu.uWaveR.value = st.waveT * 9; cu.uWaveK.value = st.waveK * Math.max(0, 1 - st.waveT / 1.6); cu.uWaveO.value.set(st.waveX, -3);
    cu.uFlash.value = strobeOn * 0.6 + st.flash * 0.5;
    cu.uRimL.value.set(red > 0.5 ? 0xff1010 : NEON[pal]).multiplyScalar((0.3 + 0.15 * onBeat) * lit);
    cu.uRimR.value.set(red > 0.5 ? 0xff3010 : NEON[(pal + 1) % 5]).multiplyScalar((0.3 + 0.15 * onBeat) * lit);

    // Ambient phone flashes, more when the room is hyped.
    if (st.dark < 0.5 && Math.random() < dt * (1.5 + cheer * 14)) phoneFlash(1);

    // Lights.
    hemi.intensity = (0.4 + 0.35 * strobeOn + st.flash * 0.6) * lit;
    key.intensity = 0.45 * lit;
    djLight.color.set(red > 0.5 ? 0xff1010 : NEON[pal]); ledLight.color.set(red > 0.5 ? 0xff2010 : NEON[(pal + 1) % 5]);
    djLight.intensity = (14 + 10 * onBeat + 12 * cheer + 20 * strobeOn) * lit;
    ledLight.intensity = (12 + 8 * onBeat + 10 * move + 20 * strobeOn) * lit;
    scene.fog.color.setRGB(0.04 + 0.08 * red, 0.024, 0.06 * (1 - red));

    confetti.update(dt, camera); glows.update(dt, camera); smoke.update(dt, camera);

    // ── Camera ──
    const F = K.framing(camera);
    st.follow += ((info.pieceX || 0) * 0.6 - st.follow) * Math.min(1, dt * 2);
    const kx = K.spring(st.camKick, dt, 2.2, 0.4), dip = K.spring(st.camDip, dt, 2.6, 0.45);
    const sh = st.shake, sx = (Math.random() - 0.5) * sh * 0.3, sy = (Math.random() - 0.5) * sh * 0.22;
    if (F.portrait) {
      camera.position.set(Math.sin(t * 0.13) * 0.4 + st.follow * 0.5 + kx * 0.5 + sx, 3.7 + Math.sin(t * 0.2) * 0.1 + dip + sy, 10.6);
      camera.lookAt(st.follow * 0.3, 3.9 + dip * 0.5, -10);
      camera.fov = 70;
    } else {
      camera.position.set(Math.sin(t * 0.13) * 0.5 + st.follow + kx + sx, 3.4 + Math.sin(t * 0.21) * 0.15 + dip + sy, 10.5 + Math.sin(t * 0.09) * 0.3);
      camera.lookAt(st.follow * 0.6 + kx * 0.4, 2.9 + dip * 0.5, -3);
      camera.fov = 52 - st.boom * 2;
    }
    camera.rotateZ(Math.sin(t * 0.17) * 0.01 + kx * 0.02);
    camera.updateProjectionMatrix();
  }

  function react(kind, d = {}) {
    const x = colX(d.col);
    switch (kind) {
      case 'move':
        st.move = Math.min(0.7, st.move + 0.25); st.twitch = 1;
        st.laserK[1] += (d.dir || 1) * 2.2; st.djLean[1] += (d.dir || 1) * 1.5; st.camKick[1] += (d.dir || 1) * 0.5;
        if (Math.random() < 0.5) phoneFlash(1);
        break;
      case 'rotate':
        st.headK[1] += (d.dir || 1) * 2.6; st.platK[1] += (d.dir || 1) * 3; st.hop = (st.hop + 1) % 5;
        break;
      case 'soft':
        st.boom = Math.max(st.boom, 0.3); st.camDip[1] -= 0.25;
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.25 + r / 14);
        st.boom = Math.max(st.boom, 0.5 + 0.5 * k); st.strobe = Math.max(st.strobe, 0.08 + 0.3 * k); st.shake = Math.max(st.shake, 0.3 + 0.7 * k);
        st.waveT = 0; st.waveX = x * 6; st.waveK = 0.4 + 0.6 * k; st.camDip[1] -= 0.6 * k;
        st.move = Math.min(0.7, st.move + 0.4);
        if (r >= 4) fogPuff(x * 6, Math.round(2 + r / 3));
        if (r >= 10) phoneFlash(4);
        break;
      }
      case 'hold':
        st.swap = 1.2; st.hop = (st.hop + 2) % 5; st.headK[1] -= 3;
        break;
      case 'clear': {
        const n = Math.max(1, Math.min(4, d.lines || 1)), c = Math.max(0, d.combo || 0);
        st.combo = c;
        spawnConfetti([0, 12, 22, 36, 60][n] + c * 8, x * 3, n >= 3 ? 11 : 7);
        st.cheer = Math.min(1.2, Math.max(st.cheer, [0, 0.35, 0.55, 0.78, 1][n] + Math.min(0.4, c * 0.12)));
        st.flash = Math.max(st.flash, [0, 0.15, 0.35, 0.6, 0.85][n] + Math.min(0.3, c * 0.08));
        st.scratch = 0.6 + n * 0.2; phoneFlash(n * 2 + c);
        if (n >= 3) st.strobe = Math.max(st.strobe, 0.2 * n);
        if (n >= 4) { co2(-11, -4.4, 1.2); co2(11, -4.4, 1.2); co2(-6, 1.2, 1); co2(6, 1.2, 1); sparks(-9, 2.5, -5, 30); st.armsUp = 1.2; st.shake = 1; st.waveT = 0; st.waveX = 0; st.waveK = 1; }
        if (c >= 2) { const m = Math.min(4, c - 1); for (let i = 0; i < m; i++) co2(i % 2 ? 11 : -11, -4.4, 0.8 + 0.1 * c); st.chase = 1 + c * 0.4; }
        break;
      }
      case 'combo':
        if ((d.n || 0) >= 2) st.chase = Math.max(st.chase, 1 + d.n * 0.3);
        break;
      case 'levelUp':
        st.rainbow = 4; st.armsUp = 2; st.cheer = 1.2; spawnConfetti(100, 0, 12); co2(-11, -4.4, 1.3); co2(11, -4.4, 1.3);
        break;
      case 'gameOver':
        st.dark = 1; st.strobe = 0; st.rainbow = 0; st.chase = 0; st.cheer = 0;
        break;
      case 'start':
        st.dark = 0; st.start = 0.6; st.strobe = 0.5; st.boom = 1; st.armsUp = 0.8; phoneFlash(6);
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      if (camera.view && camera.view.enabled) camera.clearViewOffset();
      K.dispose();
    },
  };
}
