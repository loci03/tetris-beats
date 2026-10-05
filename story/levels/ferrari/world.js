// FERRARI WINDOW — the battle stage: the RHETT RYDER TRUCK STOP.
//
// A honky-tonk stage built on a flatbed trailer in a desert truck-stop
// lot at night: plank deck with a light-up LED lip, a neon marquee
// ("FERRARI WINDOW · LIVE · LINE DANCING"), a Vegas-style roadside pylon
// sign with chaser bulbs, a truss with spot cones and string bulbs, hay
// bales and a wagon wheel, a crowd of line dancers in cowboy hats moving
// in unison — and Rhett's red supercar parked on a turntable, headlights
// on. Behind it all an elevated interstate streams headlights and tail
// lights past, under desert mesas, a big moon and a city glow.
// Everything moves on the music clock.

import * as THREE from '../../../vendor/three/three.module.min.js';
import { createCarKit, buildHeroCar } from './car.js';

const NEON = [0xff2d7a, 0x29d3ff, 0xffc23a, 0xff5a1f, 0x8a5bff];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = group) => { const m = new THREE.Mesh(keep(geo), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const col = new THREE.Color(), dummy = new THREE.Object3D();

  // ── Sky: night gradient, stars, city glow on the horizon ─────────
  const sky = add(new THREE.SphereGeometry(90, 24, 12), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse, uTime;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.02,0.02,0.07), mid = vec3(0.08,0.04,0.17), hor = vec3(0.55,0.2,0.28);
        vec3 c = mix(mid, top, smoothstep(0.1, 0.65, h));
        c = mix(hor, c, smoothstep(-0.02, 0.2, h));
        c += vec3(0.5,0.18,0.1) * uPulse * smoothstep(0.25, 0.0, abs(h - 0.03));
        vec2 g = floor(vec2(atan(vP.x, vP.z) * 120.0, h * 120.0));
        float s = step(0.985, hash(g)) * smoothstep(0.12, 0.4, h);
        c += vec3(0.85,0.85,1.0) * s * (0.6 + 0.4 * sin(uTime * 2.0 + hash(g + 3.0) * 30.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));

  const moonTex = keep(canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 8, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,248,225,1)'); gr.addColorStop(0.42, 'rgba(255,236,200,1)'); gr.addColorStop(0.47, 'rgba(255,220,180,0.35)'); gr.addColorStop(1, 'rgba(255,200,160,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.fillStyle = 'rgba(200,180,150,0.35)';
    for (const [x, y, r] of [[52, 50, 9], [74, 70, 6], [60, 78, 5], [80, 48, 4]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  }));
  add(new THREE.PlaneGeometry(14, 14), basic(0xffffff, { map: moonTex, transparent: true, depthWrite: false, fog: false }), 22, 26, -70);

  // Desert mesas (silhouettes)
  const mesaMat = toon(0x1c1030);
  for (let i = 0; i < 12; i++) {
    const w = 7 + (i * 37 % 8), hgt = 3 + (i * 53 % 7);
    const m = add(new THREE.CylinderGeometry(w * 0.5, w * 0.75, hgt, 6), mesaMat, -60 + i * 11, hgt / 2 - 1, -55 - (i % 3) * 5);
    m.rotation.y = i;
  }
  // City glow skyline strip far away
  const cityTex = keep(canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    let x = 0, k = 0;
    while (x < w) {
      const bw = 8 + (k * 13 % 14), bh = 14 + (k * 29 % 40);
      g.fillStyle = '#120a22'; g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = k % 3 ? 'rgba(255,200,120,0.8)' : 'rgba(120,220,255,0.8)';
      for (let yy = h - bh + 3; yy < h - 2; yy += 4) for (let xx = x + 2; xx < x + bw - 1; xx += 3) if ((xx * 7 + yy * 13 + k) % 5 === 0) g.fillRect(xx, yy, 1, 1);
      x += bw + 1; k++;
    }
  }));
  cityTex.wrapS = THREE.RepeatWrapping; cityTex.repeat.set(2, 1);
  add(new THREE.PlaneGeometry(90, 9), basic(0xffffff, { map: cityTex, transparent: true, depthWrite: false, fog: false }), 0, 3.0, -64);

  // ── Ground: asphalt lot with painted lines ──────────────────────
  const lotTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#17131e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${90 + (i % 60)},${80 + (i % 50)},${110},${0.08 + (i % 7) * 0.01})`; g.fillRect((i * 97) % w, (i * 61) % h, 2, 2); }
    g.fillStyle = 'rgba(240,220,160,0.35)';
    g.fillRect(0, 0, 5, h);
  }));
  lotTex.wrapS = lotTex.wrapT = THREE.RepeatWrapping; lotTex.repeat.set(12, 12);
  const ground = add(new THREE.CircleGeometry(60, 40), toon(0x8a8098, { map: lotTex }), 0, -0.62, 0);
  ground.rotation.x = -Math.PI / 2;

  // ── Elevated interstate with streaming traffic lights ───────────
  const hwZ = -18, hwY = 3.2;
  const deck = add(new THREE.BoxGeometry(140, 0.8, 7), toon(0x2a2438), 0, hwY - 0.4, hwZ);
  void deck;
  add(new THREE.BoxGeometry(140, 0.6, 0.3), toon(0x3a3448), 0, hwY + 0.3, hwZ + 3.5);
  const pierGeo = keep(new THREE.BoxGeometry(1.2, hwY + 0.6, 1.4));
  const pierMat = toon(0x221c30);
  for (let x = -60; x <= 60; x += 15) add(pierGeo, pierMat, x, (hwY - 0.6) / 2 - 0.6, hwZ);
  // Streams: instanced glowing quads (white heading left, red heading right).
  const STREAM = lowGraphics ? 26 : 44;
  const streamGeo = keep(new THREE.PlaneGeometry(1.1, 0.22));
  const streamMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const streams = new THREE.InstancedMesh(streamGeo, streamMat, STREAM);
  const streamCars = [];
  for (let i = 0; i < STREAM; i++) {
    const dir = i % 2 ? 1 : -1;
    streamCars.push({ x: -70 + Math.random() * 140, dir, lane: dir > 0 ? hwZ + 1.6 + (i % 4 < 2 ? 0 : 1.2) : hwZ - 0.2 - (i % 4 < 2 ? 0 : 1.2), v: 14 + Math.random() * 10 });
    streams.setColorAt(i, col.set(dir > 0 ? 0xff2a3a : 0xfff0d0));
  }
  group.add(streams);

  // ── The stage: plank deck on a flatbed trailer ──────────────────
  const plankTex = keep(canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ['#7a4a26', '#6e4020', '#83512a', '#744624'][i % 4];
      g.fillRect(0, i * 32, w, 32);
      g.fillStyle = 'rgba(30,14,6,0.8)'; g.fillRect(0, i * 32, w, 2);
      g.fillStyle = 'rgba(40,20,8,0.35)';
      for (let k = 0; k < 6; k++) g.fillRect((i * 53 + k * 47) % w, i * 32 + 6 + k * 4, 30 + k * 6, 1);
      g.fillStyle = '#2a170a'; g.fillRect((i * 97) % w, i * 32 + 4, 3, 24);
    }
  }));
  plankTex.wrapS = plankTex.wrapT = THREE.RepeatWrapping; plankTex.repeat.set(2.5, 1.5);
  add(new THREE.BoxGeometry(11, 0.62, 5.6), toon(0xffffff, { map: plankTex }), 0, -0.31, 0.1);
  add(new THREE.BoxGeometry(11.2, 0.25, 5.8), toon(0x2a2a34), 0, -0.55, 0.1);                       // trailer frame
  const flatWheelGeo = keep(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14));
  const tyreMat = toon(0x121216);
  for (const x of [-3.8, -2.8, 2.8, 3.8]) for (const z of [-2.6, 2.8]) { const w = add(flatWheelGeo, tyreMat, x, -0.35, z); w.rotation.x = Math.PI / 2; }
  // LED lip along the front edge: segments that chase and pulse.
  const LED = 28;
  const ledMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.34, 0.08, 0.05)), basic(0xffffff), LED);
  for (let i = 0; i < LED; i++) { dummy.position.set(-5.3 + i * (10.6 / (LED - 1)), -0.12, 2.92); dummy.updateMatrix(); ledMesh.setMatrixAt(i, dummy.matrix); ledMesh.setColorAt(i, col.set(0x000000)); }
  group.add(ledMesh);

  // Hay bales + wagon wheel
  const hayMat = toon(0xd9b24a), hayDark = toon(0xa8822a);
  for (const [x, z, r] of [[-5.0, 2.3, 0.2], [-4.2, 2.6, -0.3], [-4.7, 2.4, 0], [5.0, 2.4, 0.3], [4.3, 2.65, -0.1]]) {
    const b = add(new THREE.BoxGeometry(0.95, 0.5, 0.55), hayMat, x, 0.25, z); b.rotation.y = r;
    const s = add(new THREE.BoxGeometry(0.97, 0.05, 0.57), hayDark, x, 0.3, z); s.rotation.y = r;
  }
  add(new THREE.BoxGeometry(0.95, 0.5, 0.55), hayMat, -4.6, 0.75, 2.45).rotation.y = 0.1;
  const wagon = new THREE.Group();
  wagon.position.set(5.35, 0.62, 1.2); wagon.rotation.set(0, -Math.PI / 2 + 0.3, 0.1);
  group.add(wagon);
  const woodMat = toon(0x6a3a1a);
  add(new THREE.TorusGeometry(0.6, 0.05, 6, 28), woodMat, 0, 0, 0, wagon);
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 10), woodMat, 0, 0, 0, wagon).rotation.x = Math.PI / 2;
  for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.035, 1.18, 0.035), woodMat, 0, 0, 0, wagon).rotation.z = k * Math.PI / 6;

  // ── Neon marquee behind the stage ───────────────────────────────
  const marquee = new THREE.Group();
  marquee.position.set(0, 0, -3.4);
  group.add(marquee);
  const boardTex = keep(canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 16; i++) { g.fillStyle = ['#3a2416', '#33200f', '#41291a'][i % 3]; g.fillRect(i * 16, 0, 16, h); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(i * 16, 0, 1, h); }
  }));
  add(new THREE.BoxGeometry(10.5, 4.4, 0.25), toon(0xffffff, { map: boardTex }), 0, 2.6, 0, marquee);
  add(new THREE.BoxGeometry(0.3, 5.4, 0.3), toon(0x2a2030), -5.1, 2.1, 0.1, marquee);
  add(new THREE.BoxGeometry(0.3, 5.4, 0.3), toon(0x2a2030), 5.1, 2.1, 0.1, marquee);
  const signTex = keep(canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const neon = (txt, y, size, colr, glow, font = 'italic 900') => {
      g.font = `${font} ${size}px "Arial Black", Impact, sans-serif`;
      g.shadowColor = glow; g.shadowBlur = 18; g.lineWidth = 6; g.strokeStyle = colr; g.strokeText(txt, w / 2, y);
      g.shadowBlur = 8; g.fillStyle = '#fff6f2'; g.fillText(txt, w / 2, y);
    };
    neon('FERRARI', 70, 84, '#ff2d55', '#ff0040');
    neon('WINDOW', 150, 74, '#ffc23a', '#ff9a00');
    neon('★ LIVE · LINE DANCING · TONITE ★', 220, 26, '#29d3ff', '#00b0ff', '900');
  }));
  const sign = add(new THREE.PlaneGeometry(8.6, 4.3), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 2.75, 0.16, marquee);
  // Neon cowboy hat + neon car outline either side of the text.
  const neonLine = (pts, color, parent, x, y, s = 1) => {
    const g = keep(new THREE.BufferGeometry().setFromPoints(pts.map(([a, b]) => new THREE.Vector3(a * s, b * s, 0))));
    const l = new THREE.Line(g, basic(color, { transparent: true, blending: THREE.AdditiveBlending }));
    l.position.set(x, y, 0.2); parent.add(l); return l;
  };
  const hatPts = []; for (let i = 0; i <= 24; i++) { const a = i / 24; hatPts.push([-1 + 2 * a, 0.25 * Math.pow(Math.abs(2 * a - 1), 3) - 0.05]); }
  hatPts.push([0.55, 0.05], [0.45, 0.6], [0.2, 0.75], [0, 0.6], [-0.2, 0.75], [-0.45, 0.6], [-0.55, 0.05], [-1, 0.2]);
  const neonHat = neonLine(hatPts, 0xffc23a, marquee, -4.2, 3.7, 0.55);
  const carPts = [[-1, 0], [-0.95, 0.18], [-0.5, 0.25], [-0.15, 0.5], [0.35, 0.5], [0.65, 0.28], [1, 0.22], [1, 0], [0.7, 0], [0.6, 0.12], [0.4, 0.12], [0.3, 0], [-0.35, 0], [-0.45, 0.12], [-0.65, 0.12], [-0.75, 0], [-1, 0]];
  const neonCar = neonLine(carPts, 0xff2d55, marquee, 4.2, 3.5, 0.6);
  // Chaser bulbs round the marquee
  const BULBS = 44;
  const bulbMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.07, 6, 4)), basic(0xffffff), BULBS);
  const bulbPos = [];
  for (let i = 0; i < BULBS; i++) {
    const t = i / BULBS, per = 2 * (10.2 + 4.1);
    let d = t * per, x, y;
    if (d < 10.2) { x = -5.1 + d; y = 4.75; } else if ((d -= 10.2) < 4.1) { x = 5.1; y = 4.75 - d; } else if ((d -= 4.1) < 10.2) { x = 5.1 - d; y = 0.65; } else { d -= 10.2; x = -5.1; y = 0.65 + d; }
    bulbPos.push([x, y]);
    dummy.position.set(x, y, -3.4 + 0.18); dummy.updateMatrix(); bulbMesh.setMatrixAt(i, dummy.matrix); bulbMesh.setColorAt(i, col.set(0xffe9a0));
  }
  group.add(bulbMesh);

  // ── Roadside pylon sign (Vegas-style arrow) ─────────────────────
  const pylon = new THREE.Group();
  pylon.position.set(-8.6, 0, -5.5); pylon.rotation.y = 0.45;
  group.add(pylon);
  add(new THREE.CylinderGeometry(0.2, 0.25, 9, 8), toon(0x3a3446), 0, 3.9, 0, pylon);
  const arrowTex = keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1b0f2a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff2d7a'; g.lineWidth = 10; g.shadowColor = '#ff2d7a'; g.shadowBlur = 14; g.strokeRect(10, 10, w - 20, h - 20);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowBlur = 12;
    g.font = '900 54px "Arial Black", Impact, sans-serif'; g.fillStyle = '#ffe9a0'; g.shadowColor = '#ffaa00';
    g.fillText('TRUCK', w / 2, 70); g.fillText('STOP', w / 2, 128);
    g.font = '900 30px "Arial Black", Impact, sans-serif'; g.fillStyle = '#9ff0ff'; g.shadowColor = '#00c8ff';
    g.fillText('EAT · GAS · DANCE', w / 2, 192);
  }));
  const pylonSign = add(new THREE.BoxGeometry(3.4, 3.4, 0.3), [toon(0x2a1a3a), toon(0x2a1a3a), toon(0x2a1a3a), toon(0x2a1a3a), basic(0xffffff, { map: arrowTex }), toon(0x2a1a3a)], 0, 7.4, 0, pylon);
  void pylonSign;
  const arrow = add(new THREE.ConeGeometry(0.8, 1.6, 3), basic(0xffc23a), 2.4, 6.1, 0.2, pylon);
  arrow.rotation.z = -Math.PI / 2;

  // ── Rhett's supercar on a turntable ─────────────────────────────
  const carKit = createCarKit(THREE);
  const carMat = keep(carKit.paintMaterial({
    uKeyCol: new THREE.Color(0xffe2c0).multiplyScalar(0.9), uAmb: new THREE.Color(0x4a3048), uSkyHor: new THREE.Color(0xff6a8a).multiplyScalar(0.7),
    uLampCol: new THREE.Color(0xff3d9a).multiplyScalar(1.2), uLampGap: 7,
  }));
  const hero = buildHeroCar(THREE, carKit, carMat);
  disposables.push(hero);
  const turntable = new THREE.Group();
  turntable.position.set(7.0, -0.62, -2.6);
  group.add(turntable);
  add(new THREE.CylinderGeometry(2.7, 2.8, 0.3, 32), toon(0x2a2a36), 0, 0.15, 0, turntable);
  const ttRing = add(new THREE.TorusGeometry(2.72, 0.05, 6, 48), basic(0xff2d55), 0, 0.31, 0, turntable);
  ttRing.rotation.x = Math.PI / 2;
  const carSpin = new THREE.Group();
  carSpin.position.y = 0.3;
  turntable.add(carSpin);
  hero.group.scale.setScalar(0.92);
  carSpin.add(hero.group);
  // Headlight beams (additive cones).
  const beamGeo = keep(new THREE.ConeGeometry(0.9, 5, 16, 1, true));
  beamGeo.translate(0, -2.5, 0); beamGeo.rotateX(-Math.PI / 2 - 0.06);
  const beamMat = keep(new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  for (const sx of [1, -1]) { const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(sx * 0.6, 0.55, -2.2); hero.group.add(b); }

  // ── Truss, spot cones, string bulbs ─────────────────────────────
  add(new THREE.BoxGeometry(13.4, 0.22, 0.22), toon(0x30303c), 0, 6.6, 1.4);
  for (const x of [-6.6, 6.6]) add(new THREE.BoxGeometry(0.22, 7.2, 0.22), toon(0x30303c), x, 3.0, 1.4);
  const coneGeo = keep(new THREE.ConeGeometry(0.95, 6.7, 20, 1, true));
  coneGeo.translate(0, -3.35, 0);
  const cones = [], coneMats = [];
  for (const [x, targetX] of [[-3.6, -1.6], [-1.2, -1.6], [1.2, 1.6], [3.6, 1.6]]) {
    add(new THREE.CylinderGeometry(0.2, 0.28, 0.4, 10), toon(0x15151c), x, 6.4, 1.4);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.position.set(x, 6.4, 1.4);
    group.add(cone);
    coneMats.push(mat);
    cones.push({ cone, baseX: x, targetX });
  }
  const STRING = lowGraphics ? 24 : 40;
  const stringMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.075, 6, 4)), basic(0xffffff), STRING);
  const stringPts = [];
  for (let i = 0; i < STRING; i++) {
    const row = i < STRING / 2 ? 0 : 1, u = (i % (STRING / 2)) / (STRING / 2 - 1);
    const x = -5.8 + 11.6 * u, y = 6.3 - Math.sin(u * Math.PI) * 0.8 - row * 0.5, z = row ? -1.0 : 2.4;
    stringPts.push([x, y, z]);
    dummy.position.set(x, y, z); dummy.updateMatrix(); stringMesh.setMatrixAt(i, dummy.matrix);
  }
  group.add(stringMesh);

  // ── Crowd of line dancers in cowboy hats ────────────────────────
  const spots = [];
  const addRow = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.5) / n, z, y }); };
  const cs = lowGraphics ? 0.6 : 1;
  addRow(Math.round(13 * cs), -6.6, 6.6, 5.5, -1.5);
  addRow(Math.round(15 * cs), -7.6, 7.6, 6.6, -1.62);
  addRow(Math.round(5 * cs), -9.4, -6.9, 2.0, -0.62);
  addRow(Math.round(4 * cs), 7.0, 9.4, 3.2, -0.62);
  const N = spots.length;
  const bodyM = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.25, 0.55, 2, 7)), toon(0xffffff), N);
  const legM = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.09, 0.5, 1, 5)), toon(0x2e4a7a), N * 2);
  const headM = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.19, 8, 6)), toon(0xffffff), N);
  const brimM = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.36, 0.36, 0.035, 10)), toon(0xffffff), N);
  const crownM = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.15, 0.19, 0.2, 7)), toon(0xffffff), N);
  const armM = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.065, 0.45, 1, 5)), toon(0xffffff), N * 2);
  const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22];
  const shirts = [0xc8102e, 0x2e6fd8, 0xf2f2f2, 0x6a3fb5, 0xe8a020, 0x1f8a5c, 0xff4f9a];
  const hats = [0xf1e7d2, 0x3a2416, 0x1a1418, 0xb8865a, 0xf1e7d2];
  spots.forEach((s, i) => {
    s.phase = (i * 0.37) % 1; s.dir = i % 2 ? 1 : -1;
    bodyM.setColorAt(i, col.set(shirts[i % shirts.length]));
    headM.setColorAt(i, col.set(skins[i % skins.length]));
    brimM.setColorAt(i, col.set(hats[i % hats.length])); crownM.setColorAt(i, col.set(hats[i % hats.length]));
    for (const k of [0, 1]) armM.setColorAt(i * 2 + k, col.set(shirts[i % shirts.length]));
  });
  group.add(bodyM, legM, headM, brimM, crownM, armM);

  // ── Dust / confetti of sparks for big moments ───────────────────
  const SP = lowGraphics ? 160 : 320;
  const spPos = new Float32Array(SP * 3), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP), spCol = new Float32Array(SP * 3);
  for (let i = 0; i < SP; i++) { spPos[i * 3 + 1] = -100; col.set(NEON[i % NEON.length]); spCol.set([col.r, col.g, col.b], i * 3); }
  const spGeo = keep(new THREE.BufferGeometry());
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  const sparks = new THREE.Points(spGeo, keep(new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  sparks.frustumCulled = false;
  group.add(sparks);
  let spCur = 0;
  function burst(n, x, spread = 3, y = 6) {
    for (let k = 0; k < n; k++) {
      const i = spCur = (spCur + 1) % SP;
      spPos[i * 3] = x + (Math.random() - 0.5) * spread; spPos[i * 3 + 1] = y + Math.random(); spPos[i * 3 + 2] = (Math.random() - 0.5) * 3 + 0.5;
      spVel[i * 3] = (Math.random() - 0.5) * 2; spVel[i * 3 + 1] = -0.5 - Math.random() * 1.5; spVel[i * 3 + 2] = (Math.random() - 0.5);
      spLife[i] = 4;
    }
  }

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffd0e0, 0x2a1a40, 1.0);
  const key = new THREE.DirectionalLight(0xfff0e0, 1.5);
  key.position.set(2, 7, 7);
  const neonL = new THREE.PointLight(0xff2d7a, 16, 12, 1.6); neonL.position.set(-3.5, 3.2, -1.8);
  const neonR = new THREE.PointLight(0x29d3ff, 16, 12, 1.6); neonR.position.set(3.5, 3.2, -1.8);
  const carGlow = new THREE.PointLight(0xff2030, 10, 9, 1.6); carGlow.position.set(6.6, 1.5, -1.0);
  group.add(hemi, key, neonL, neonR, carGlow);
  const base = { hemi: hemi.intensity, key: key.intensity, nl: neonL.intensity, nr: neonR.intensity, car: carGlow.intensity };

  // ── Update ──────────────────────────────────────────────────────
  const state = { L: 1, flash: 0, cheer: 0, focus: 0, solo: null, rev: 0, lastBeat: -1, bar: 0, spin: 0 };
  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, pulse = ((beat * 2) % 1 + 1) % 1;
    const onBeat = Math.exp(-ph * 6), onPulse = Math.exp(-pulse * 7);
    const whole = Math.floor(beat), L = state.L;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.5);
    state.rev = Math.max(0, state.rev - dt * 0.8);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    if (whole !== state.lastBeat) { state.lastBeat = whole; if (whole % 4 === 0) state.bar++; }
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    const house = L * (1 - 0.6 * soloK);

    sky.material.uniforms.uPulse.value = (onBeat * 0.5 + state.flash) * L;
    sky.material.uniforms.uTime.value = songTime;

    // Interstate streams (faster with the crowd's hype).
    const sp = 1 + state.cheer * 1.2 + state.rev;
    streamCars.forEach((c, i) => {
      c.x += c.dir * c.v * sp * dt;
      if (c.x > 72) c.x -= 144; if (c.x < -72) c.x += 144;
      dummy.position.set(c.x, hwY + 0.45, c.lane);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1 + state.rev * 2, 1, 1);
      dummy.updateMatrix();
      streams.setMatrixAt(i, dummy.matrix);
    });
    streams.instanceMatrix.needsUpdate = true;
    streamMat.opacity = 0.9 * Math.max(0.3, L);

    // LED lip: a chase that snaps on the beat; the solo side lights up.
    for (let i = 0; i < LED; i++) {
      const x = -5.3 + i * (10.6 / (LED - 1));
      const chase = Math.exp(-Math.pow(((i - beat * 4) % LED + LED) % LED - LED / 2, 2) * 0.02);
      let k = (0.25 + 0.75 * onPulse * ((i + whole) % 2 ? 1 : 0.4)) * house + chase * 0.5 * L + state.flash * 0.6;
      if (soloK > 0) k = k * (1 - soloK) + soloK * Math.exp(-Math.pow((x - soloX) / 1.6, 2)) * (0.6 + 0.4 * onPulse);
      ledMesh.setColorAt(i, col.set(NEON[(state.bar + (i >> 2)) % NEON.length]).multiplyScalar(Math.min(1.4, k)));
    }
    ledMesh.instanceColor.needsUpdate = true;

    // Marquee bulbs chase; neon flickers and pulses.
    for (let i = 0; i < BULBS; i++) {
      const on = ((i + Math.floor(beat * 4)) % 4 === 0) || onBeat > 0.6;
      bulbMesh.setColorAt(i, col.set(0xffe9a0).multiplyScalar((on ? 1 : 0.18) * house + state.flash * 0.5));
    }
    bulbMesh.instanceColor.needsUpdate = true;
    const flick = Math.sin(songTime * 23) > 0.985 ? 0.35 : 1;
    sign.material.opacity = Math.min(1, house * (0.75 + 0.25 * onBeat) * flick + state.flash * 0.3);
    neonHat.material.opacity = house * (0.6 + 0.4 * onPulse);
    neonCar.material.opacity = house * (0.6 + 0.4 * (1 - onPulse));
    for (let i = 0; i < STRING; i++) stringMesh.setColorAt(i, col.set(NEON[(i + state.bar) % 3 === 0 ? 2 : (i % 2 ? 0 : 1)]).lerp(col.set(0xfff2c0), 0.5).multiplyScalar(((i + whole) % 3 ? 0.9 : 0.3 + onBeat) * house));
    stringMesh.instanceColor.needsUpdate = true;

    // Turntable + car: slow spin, revs on big moves, headlights flash on the beat.
    state.spin += dt * (0.25 + state.rev * 2.5);
    carSpin.rotation.y = 0.9 + Math.sin(state.spin * 0.6) * 0.6 + state.spin * 0.0;
    carSpin.position.y = 0.3 + 0.015 * onPulse * L + 0.04 * state.rev * Math.sin(songTime * 40);
    carMat.uniforms.uHead.value = (1.2 + 1.2 * onBeat + 2 * state.flash) * Math.max(0.2, L);
    carMat.uniforms.uTail.value = (1.2 + 0.8 * state.rev) * Math.max(0.2, L);
    carMat.uniforms.uScroll.value = songTime * 2.5;
    beamMat.opacity = (0.06 + 0.06 * onBeat + 0.12 * state.flash) * L;
    ttRing.material.color.set(NEON[state.bar % NEON.length]).multiplyScalar(0.5 + 0.5 * onBeat);

    // Spot cones
    cones.forEach((c, i) => {
      const lead = c.targetX < 0 ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.25;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.6);
      c.cone.rotation.x = -0.12;
      coneMats[i].color.set(NEON[(state.bar + i) % NEON.length]);
      coneMats[i].opacity = (0.025 + 0.045 * onBeat + 0.05 * lead + 0.1 * state.flash) * L * (1 + 1.2 * soloK);
    });

    // Line dancers: the whole crowd does the same grapevine in unison —
    // travelling right for 2 beats, left for 2 — clapping on the touch,
    // hats bobbing; they whoop (arms up) when hyped.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3);
    const bar = ((beat % 4) + 4) % 4;
    const travel = Math.sin(Math.PI * bar / 2 - Math.PI / 2) * 0.35;      // vine right, vine left
    const clap = Math.exp(-((bar % 2) - 1.5 + 2) % 2 * 6);
    for (let i = 0; i < N; i++) {
      const s = spots[i];
      const step = Math.abs(Math.sin(Math.PI * beat * 2 + s.phase * 0.3));
      const bob = (0.05 + 0.12 * hype) * step * L;
      const x = s.x + travel * L, y = s.y + 0.95 + bob;
      dummy.position.set(x, y, s.z); dummy.rotation.set(0, Math.atan2(-s.x, 9 - s.z) * 0.4, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      bodyM.setMatrixAt(i, dummy.matrix);
      dummy.position.y = y + 0.62; dummy.updateMatrix(); headM.setMatrixAt(i, dummy.matrix);
      dummy.position.y = y + 0.76; dummy.rotation.z = 0.08 * Math.sin(Math.PI * beat); dummy.updateMatrix(); brimM.setMatrixAt(i, dummy.matrix);
      dummy.position.y = y + 0.86; dummy.updateMatrix(); crownM.setMatrixAt(i, dummy.matrix);
      for (const k of [0, 1]) {
        const sx = k ? 1 : -1;
        const lift = (k ? Math.sin(Math.PI * beat * 2) : -Math.sin(Math.PI * beat * 2)) * 0.12;
        dummy.position.set(x + sx * 0.1, s.y + 0.32 + Math.max(0, lift) * L, s.z); dummy.rotation.set(0, 0, sx * 0.08); dummy.updateMatrix();
        legM.setMatrixAt(i * 2 + k, dummy.matrix);
        const up = hype > 0.7 ? 2.7 - 0.2 * k : 0.5 + 0.9 * clap * L;
        dummy.position.set(x + sx * 0.3, y + 0.25, s.z + 0.05); dummy.rotation.set(-0.3 * clap, 0, sx * up); dummy.updateMatrix();
        armM.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    }
    bodyM.instanceMatrix.needsUpdate = headM.instanceMatrix.needsUpdate = brimM.instanceMatrix.needsUpdate = true;
    crownM.instanceMatrix.needsUpdate = armM.instanceMatrix.needsUpdate = legM.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SP; i++) {
      if (spLife[i] <= 0) continue;
      spLife[i] -= dt;
      spPos[i * 3] += (spVel[i * 3] + Math.sin(songTime * 3 + i) * 0.3) * dt;
      spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt;
      spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
      if (spLife[i] <= 0 || spPos[i * 3 + 1] < 0) { spLife[i] = 0; spPos[i * 3 + 1] = -100; }
    }
    spGeo.attributes.position.needsUpdate = true;

    const sL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    neonL.intensity = base.nl * L * (0.7 + 0.6 * onBeat + 0.5 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, sL) - 0.6 * soloK * Math.max(0, -sL));
    neonR.intensity = base.nr * L * (0.7 + 0.6 * onBeat + 0.5 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -sL) - 0.6 * soloK * Math.max(0, sL));
    carGlow.intensity = base.car * L * (0.6 + 0.6 * onBeat + state.rev) * (1 - 0.5 * soloK);
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) state.cheer = Math.min(1, state.cheer + 0.35);
        if (data.tier >= 4) { burst(70, x, 3); state.flash = 0.6; state.rev = Math.min(1.2, state.rev + 0.6); }
        break;
      case 'taunt': state.flash = 0.4; break;
      case 'tauntLanded':
        burst(90, data.attacker === 'rival' ? 1.6 : -1.6, 4); state.flash = 1; state.cheer = 1; state.rev = 1;
        break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5; break;
      case 'end': burst(200, x, 6); state.cheer = 1; state.flash = 1; state.rev = 1.2; break;
      case 'drop': state.flash = 1; burst(80, 0, 8); state.rev = 1; break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; burst(90, x, 3);
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update, react,
    setLightLevel(v) { state.L = Math.max(0, Math.min(1, v)); },
    dispose() {
      for (const d of disposables) if (d && d.dispose) d.dispose();
      for (const m of [streams, ledMesh, bulbMesh, stringMesh, bodyM, legM, headM, brimM, crownM, armM]) m.dispose();
    },
  };
}
