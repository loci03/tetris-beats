// DREAM OR NIGHTMARE — the Level 14 battle stage: a neon rooftop in a
// cyberpunk megacity.
//
// A circuit-board dance floor whose traces pulse in to the dancers, a
// skyline of lit towers with neon strips fading into magenta haze, two
// giant robots dancing between the skyscrapers (they hit the beat, their
// eyes flash on big moves), hologram billboards and a spinning holo-globe,
// police-style helicopters circling with searchlights that swing onto the
// soloist, a water tower, rooftop vents, neon dust and a cyber crowd.
// Dream ↔ nightmare: a landed taunt flips the whole city red for a moment.

import * as THREE from '../../../vendor/three/three.module.min.js';

const MAGENTA = 0xff2dd0, CYAN = 0x22e8ff, VIOLET = 0x8a4dff;
const NEON = [MAGENTA, CYAN, VIOLET, 0xffd23f];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const FLOOR_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FLOOR_FS = `uniform float uBeat, uFlash, uLevel, uTime, uRed; uniform vec4 uRip; uniform vec2 uSolo; uniform vec3 uA, uB;
  varying vec3 vW;
  float h(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 p = vW.xz * 1.4;
    vec2 cell = floor(p), f = fract(p);
    // Circuit traces: each cell carries a horizontal or vertical trace.
    float o = h(cell);
    float tr = o < 0.5 ? abs(f.y - 0.5) : abs(f.x - 0.5);
    float w = fwidth(p.x) * 1.2 + 0.02;
    float line = 1.0 - smoothstep(w, w + 0.03, tr);
    vec2 g = abs(f - 0.5);
    float pad = 1.0 - smoothstep(0.08, 0.11, length(f - 0.5));
    pad *= step(0.72, h(cell + 3.1));
    float grid = 1.0 - smoothstep(0.0, 0.03, min(0.5 - g.x, 0.5 - g.y));
    float d = length(vW.xz - vec2(0.0, 0.3));
    // Pulses travel inward along the traces with the beat.
    float pulse = pow(0.5 + 0.5 * sin(d * 3.0 + uTime * 6.0), 6.0);
    float r = uRip.z * 7.0, rd = length(vW.xz - vec2(uRip.x, 0.2));
    float rip = exp(-pow((rd - r) * 1.6, 2.0)) * uRip.w * (1.0 - min(1.0, r / 9.0));
    float pool = exp(-pow(length(vW.xz - vec2(uSolo.x, 0.2)) / 1.2, 2.0)) * uSolo.y;
    vec3 colA = mix(uA, vec3(1.0, 0.1, 0.12), uRed), colB = mix(uB, vec3(1.0, 0.45, 0.1), uRed);
    vec3 c = vec3(0.02, 0.015, 0.05) + vec3(0.04, 0.03, 0.08) * grid;
    c += colB * line * (0.25 + 0.45 * uBeat + 0.6 * pulse) + colA * pad * (0.6 + uBeat);
    c += colA * rip * (0.5 + line) + (colB + 0.4) * pool * (0.4 + line);
    c *= uLevel * (1.0 - 0.6 * uSolo.y) + pool * uSolo.y * 0.6;
    c += colB * uFlash * 0.25 * line;
    c *= smoothstep(6.4, 4.4, d) * 0.7 + 0.3;
    gl_FragColor = vec4(c, 1.0);
  }`;

export function buildWorld({ lowGraphics = false } = {}) {
  const group = new THREE.Group();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([60, 140, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const low = lowGraphics;

  // ── Sky: indigo night into a magenta haze ───────────────────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(110, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uPulse: { value: 0 }, uRed: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse, uRed;
      void main(){ float h = vP.y;
        vec3 top = vec3(0.02, 0.01, 0.08), mid = vec3(0.16, 0.04, 0.3), hor = vec3(0.7, 0.12, 0.55);
        vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(hor, mid, smoothstep(-0.05, 0.08, h));
        c += vec3(0.3, 0.06, 0.3) * uPulse * smoothstep(0.3, 0.0, abs(h - 0.03));
        c = mix(c, vec3(c.r * 1.3 + 0.08, c.g * 0.25, c.b * 0.2), uRed);
        gl_FragColor = vec4(c, 1.0); }`,
  })));
  group.add(sky);

  // ── Skyline: towers with lit windows and neon strips ────────────
  const winTex = keep(canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#0a0818'; g.fillRect(0, 0, w, h);
    for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) {
      const r = Math.random();
      if (r < 0.42) { g.fillStyle = r < 0.08 ? '#ff7ae8' : r < 0.18 ? '#7af4ff' : '#ffd9a0'; g.globalAlpha = 0.5 + Math.random() * 0.5; g.fillRect(x, y, 4, 4); }
    }
    g.globalAlpha = 1;
  }));
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const towers = [];
  const TN = low ? 34 : 60;
  for (let i = 0; i < TN; i++) {
    const a = Math.PI + (i / TN - 0.5) * 3.9 + Math.sin(i * 7.7) * 0.03;
    const r = (i % 2 ? 33 : 46) + (i * 13 % 9);
    const hgt = 10 + (i * 37 % 26) + (i % 2 ? 0 : 8), w = 3 + (i * 7 % 4);
    towers.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, h: hgt, w, d: w * (0.8 + (i % 3) * 0.15), ry: -a });
  }
  const towerMat = basic(0xffffff, { map: winTex });
  const towerMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), towerMat, TN);
  const stripMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), basic(0xffffff), TN);
  towers.forEach((t, i) => {
    dummy.position.set(t.x, t.h / 2 - 6, t.z); dummy.rotation.set(0, t.ry, 0); dummy.scale.set(t.w, t.h, t.d); dummy.updateMatrix();
    towerMesh.setMatrixAt(i, dummy.matrix); towerMesh.setColorAt(i, col.setHSL(0.72 + (i % 5) * 0.03, 0.4, 0.55 + (i % 3) * 0.12));
    dummy.position.y = t.h - 6 + 0.15; dummy.scale.set(t.w * 1.02, 0.25, t.d * 1.02); dummy.updateMatrix();
    stripMesh.setMatrixAt(i, dummy.matrix); stripMesh.setColorAt(i, col.set(NEON[i % 3]));
  });
  group.add(towerMesh, stripMesh);
  // Antenna beacons on the tallest towers.
  const beaconGeo = keep(new THREE.SphereGeometry(0.35, 6, 4));
  const beaconMat = basic(0xff3355);
  const beacons = towers.filter(t => t.h > 28).slice(0, 8).map(t => { const m = new THREE.Mesh(beaconGeo, beaconMat); m.position.set(t.x, t.h - 5.2, t.z); group.add(m); return m; });

  // ── Giant dancing robots between the towers ─────────────────────
  const giantMat = toon(0x4a4070), giantTrim = basic(MAGENTA), giantEye = basic(CYAN);
  const giants = [];
  const box = (w, h, d) => keep(new THREE.BoxGeometry(w, h, d));
  for (const [x, z, sc, ry, ph] of [[-12.5, -21, 0.66, 0.4, 0], [13, -22, 0.68, -0.4, 2]]) {
    const R = new THREE.Group(); R.position.set(x, -6, z); R.rotation.y = ry; R.scale.setScalar(sc);
    const pelvis = new THREE.Group(); pelvis.position.y = 9; R.add(pelvis);
    const torso = new THREE.Group(); pelvis.add(torso);
    const tm = new THREE.Mesh(box(5, 6, 3), giantMat); tm.position.y = 3.4; torso.add(tm);
    const coreM = new THREE.Mesh(keep(new THREE.CircleGeometry(0.9, 16)), giantTrim); coreM.position.set(0, 4, 1.52); torso.add(coreM);
    const head = new THREE.Group(); head.position.y = 6.6; torso.add(head);
    const hm = new THREE.Mesh(box(2.4, 2, 2.2), giantMat); hm.position.y = 1; head.add(hm);
    const eye = new THREE.Mesh(box(1.9, 0.35, 0.1), giantEye); eye.position.set(0, 1.15, 1.12); head.add(eye);
    const ant = new THREE.Mesh(box(0.12, 1.4, 0.12), giantMat); ant.position.set(0.7, 2.6, 0); head.add(ant);
    const arms = [];
    for (const sx of [1, -1]) {
      const sh = new THREE.Group(); sh.position.set(3.0 * sx, 5.6, 0); torso.add(sh);
      sh.add(new THREE.Mesh(box(1.3, 1.3, 1.3), giantMat));
      const up = new THREE.Mesh(box(1, 3.4, 1), giantMat); up.position.y = -1.9; sh.add(up);
      const el = new THREE.Group(); el.position.y = -3.6; sh.add(el);
      const fo = new THREE.Mesh(box(0.9, 3.2, 0.9), giantMat); fo.position.y = -1.6; el.add(fo);
      const glove = new THREE.Mesh(box(1.1, 0.25, 1.1), giantTrim); glove.position.y = -0.1; el.add(glove);
      arms.push({ sh, el, sx });
    }
    const legs = [];
    for (const sx of [1, -1]) {
      const hip = new THREE.Group(); hip.position.set(1.3 * sx, 0, 0); pelvis.add(hip);
      const th = new THREE.Mesh(box(1.4, 4.6, 1.4), giantMat); th.position.y = -2.3; hip.add(th);
      const kn = new THREE.Group(); kn.position.y = -4.6; hip.add(kn);
      const sn = new THREE.Mesh(box(1.3, 4.4, 1.5), giantMat); sn.position.y = -2.2; kn.add(sn);
      const knee = new THREE.Mesh(box(1.5, 0.3, 1.6), giantTrim); knee.position.y = 0; kn.add(knee);
      legs.push({ hip, kn, sx });
    }
    group.add(R);
    giants.push({ R, pelvis, torso, head, arms, legs, eye, ph, pose: 0 });
  }

  // ── Rooftop: deck, stage, railing, water tower, vents ───────────
  const deck = new THREE.Mesh(keep(new THREE.BoxGeometry(26, 0.4, 20)), toon(0x1a1626));
  deck.position.set(0, -0.82, 1);
  group.add(deck);
  const roofSide = new THREE.Mesh(keep(new THREE.BoxGeometry(26, 14, 0.6)), toon(0x120f1c));
  roofSide.position.set(0, -8, -9);
  group.add(roofSide);
  const stage = new THREE.Mesh(keep(new THREE.CylinderGeometry(6.2, 6.4, 0.6, 6)), toon(0x221c34));
  stage.position.set(0, -0.31, 0.3); stage.rotation.y = Math.PI / 6; stage.scale.z = 0.72;
  group.add(stage);
  const floorMat = keep(new THREE.ShaderMaterial({
    uniforms: {
      uBeat: { value: 0 }, uFlash: { value: 0 }, uLevel: { value: 1 }, uTime: { value: 0 }, uRed: { value: 0 },
      uRip: { value: new THREE.Vector4(0, 0, 99, 0) }, uSolo: { value: new THREE.Vector2(0, 0) },
      uA: { value: new THREE.Color(MAGENTA) }, uB: { value: new THREE.Color(CYAN) },
    },
    vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS,
  }));
  const floor = new THREE.Mesh(keep(new THREE.CircleGeometry(6.15, 6)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.rotation.z = Math.PI / 6; floor.scale.y = 0.72; floor.position.set(0, 0.005, 0.3);
  group.add(floor);
  const hexRim = new THREE.Mesh(keep(new THREE.TorusGeometry(6.2, 0.06, 4, 6)), basic(CYAN));
  hexRim.rotation.x = Math.PI / 2; hexRim.rotation.z = Math.PI / 6; hexRim.scale.y = 0.72; hexRim.position.set(0, 0.02, 0.3);
  group.add(hexRim);
  // Railing with a neon strip along the back of the roof.
  const rail = new THREE.Mesh(keep(new THREE.BoxGeometry(26, 0.08, 0.08)), basic(MAGENTA));
  rail.position.set(0, 0.5, -8.7);
  group.add(rail);
  const postGeo = keep(new THREE.BoxGeometry(0.08, 1.1, 0.08));
  const posts = new THREE.InstancedMesh(postGeo, toon(0x2a2438), 14);
  for (let i = 0; i < 14; i++) { dummy.position.set(-13 + i * 2, -0.05, -8.7); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); posts.setMatrixAt(i, dummy.matrix); }
  group.add(posts);
  // Water tower.
  const wt = new THREE.Group(); wt.position.set(-8.6, -0.62, -5.8);
  const tank = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 14)), toon(0x4a3a40)); tank.position.y = 4.2; wt.add(tank);
  const roofC = new THREE.Mesh(keep(new THREE.ConeGeometry(1.55, 0.9, 14)), toon(0x3a2a30)); roofC.position.y = 5.85; wt.add(roofC);
  for (const [lx, lz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const lg = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.07, 0.09, 3, 5)), toon(0x2a2228)); lg.position.set(lx * 0.9, 1.5, lz * 0.9); wt.add(lg); }
  const wtSign = new THREE.Mesh(keep(new THREE.TorusGeometry(1.42, 0.05, 4, 24)), basic(CYAN)); wtSign.rotation.x = Math.PI / 2; wtSign.position.y = 3.4; wt.add(wtSign);
  group.add(wt);
  // AC units / vents.
  const acGeo = keep(new THREE.BoxGeometry(1.6, 1.1, 1.2));
  const ac = new THREE.InstancedMesh(acGeo, toon(0x3a3448), 4);
  [[7.8, -5.6], [9.6, -4.2], [-9.8, 0.5], [9.9, 0.8]].forEach(([x, z], i) => { dummy.position.set(x, -0.07, z); dummy.rotation.set(0, i * 0.4, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); ac.setMatrixAt(i, dummy.matrix); });
  group.add(ac);

  // ── Holograms: billboard + spinning globe ───────────────────────
  const holoTex = keep(canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(34,232,255,0.9)'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.font = '900 72px "DejaVu Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#22e8ff'; g.shadowBlur = 18; g.fillStyle = '#bff8ff'; g.fillText('DREAM', w / 2, h * 0.33);
    g.shadowColor = '#ff2dd0'; g.fillStyle = '#ffc4f2'; g.font = '900 54px "DejaVu Sans", sans-serif'; g.fillText('or NIGHTMARE', w / 2, h * 0.7);
    g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
  }));
  const holoMat = basic(0xffffff, { map: holoTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const holo = new THREE.Mesh(keep(new THREE.PlaneGeometry(6.4, 3.2)), holoMat);
  holo.position.set(0, 5.2, -7.4);
  group.add(holo);
  const projector = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.4, 0.5, 0.3, 10)), toon(0x2a2438));
  projector.position.set(0, -0.47, -7.4);
  group.add(projector);
  const beamGeo = keep(new THREE.CylinderGeometry(3.2, 0.35, 3.9, 16, 1, true)); beamGeo.translate(0, 1.95, 0);
  const beamMat = basic(CYAN, { transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(0, -0.35, -7.4); beam.scale.z = 0.15;
  group.add(beam);
  const globe = new THREE.LineSegments(keep(new THREE.WireframeGeometry(keep(new THREE.IcosahedronGeometry(1.2, 1)))), basic(MAGENTA, { transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  globe.position.set(7.4, 4.6, -4.8);
  group.add(globe);
  const globeRing = new THREE.Mesh(keep(new THREE.TorusGeometry(1.8, 0.03, 4, 40)), basic(CYAN, { transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  globeRing.position.copy(globe.position);
  group.add(globeRing);

  // ── Helicopters with searchlights ───────────────────────────────
  const heliMat = toon(0x2a2a38), rotorMat = basic(0x8888aa, { transparent: true, opacity: 0.55 });
  const searchGeo = keep(new THREE.ConeGeometry(1.6, 16, 18, 1, true)); searchGeo.translate(0, -8, 0);
  const helis = [];
  for (let i = 0; i < 2; i++) {
    const h = new THREE.Group();
    const body = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.55, 1.2, 4, 10)), heliMat); body.rotation.z = Math.PI / 2; h.add(body);
    const tail = new THREE.Mesh(keep(new THREE.BoxGeometry(2.2, 0.18, 0.18)), heliMat); tail.position.x = -1.7; h.add(tail);
    const fin = new THREE.Mesh(keep(new THREE.BoxGeometry(0.3, 0.6, 0.06)), heliMat); fin.position.set(-2.7, 0.25, 0); h.add(fin);
    const rotor = new THREE.Mesh(keep(new THREE.BoxGeometry(4.2, 0.03, 0.18)), rotorMat); rotor.position.y = 0.7; h.add(rotor);
    const nav = new THREE.Mesh(keep(new THREE.SphereGeometry(0.1, 6, 4)), basic(i ? 0xff3355 : 0x55ff88)); nav.position.set(-2.8, 0.5, 0); h.add(nav);
    const sm = basic(0xfff4e0, { transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(searchGeo, sm);
    group.add(h, cone);
    helis.push({ h, rotor, nav, cone, sm, ph: i * Math.PI, r: i ? 13 : 10, y: i ? 8.2 : 7.0 });
  }

  // ── Neon dust ───────────────────────────────────────────────────
  const DN = low ? 140 : 300;
  const dPos = new Float32Array(DN * 3), dCol = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 24; dPos[i * 3 + 1] = Math.random() * 12; dPos[i * 3 + 2] = -8 + Math.random() * 12;
    col.set(NEON[i % 3]); dCol[i * 3] = col.r; dCol[i * 3 + 1] = col.g; dCol[i * 3 + 2] = col.b;
  }
  const dGeo = keep(new THREE.BufferGeometry());
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dotTex = keep(canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }));
  const dMat = keep(new THREE.PointsMaterial({ size: 0.14, vertexColors: true, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false;
  group.add(dust);

  // ── Spot cones ──────────────────────────────────────────────────
  const truss = new THREE.Mesh(keep(new THREE.BoxGeometry(10, 0.2, 0.2)), toon(0x2a2438));
  truss.position.set(0, 6.6, 1.2);
  group.add(truss);
  const coneGeo = keep(new THREE.ConeGeometry(0.85, 6.8, 20, 1, true)); coneGeo.translate(0, -3.4, 0);
  const cones = [];
  for (const [x, tx] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    const fix = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.18, 0.25, 0.36, 10)), toon(0x14101e));
    fix.position.set(x, 6.4, 1.2); group.add(fix);
    const m = basic(CYAN, { transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(coneGeo, m); c.position.copy(fix.position); group.add(c);
    cones.push({ cone: c, mat: m, baseX: x, tx, side: tx < 0 ? 'player' : 'rival' });
  }

  // ── Crowd: cyber kids with visor shades ─────────────────────────
  const spots = [];
  const row = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.2 + Math.random() * 0.6) / n, z: z + Math.random() * 0.5, y }); };
  const cs = low ? 0.6 : 1;
  row(Math.round(13 * cs), -6.6, 6.6, 5.4, -1.0);
  row(Math.round(15 * cs), -7.8, 7.8, 6.4, -1.1);
  row(Math.round(5 * cs), -10.4, -7.4, 2.6, -0.62);
  row(Math.round(5 * cs), 7.4, 10.4, 2.6, -0.62);
  const CN = spots.length, crowdMat = toon(0xffffff);
  const cBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.26, 0.6, 3, 8)), crowdMat, CN);
  const cHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.2, 10, 8)), crowdMat, CN);
  const cVisor = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.32, 0.08, 0.06)), basic(0xffffff), CN);
  const cArm = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6)), crowdMat, CN * 2);
  const coats = [0x2a1a48, 0x3a1030, 0x10283a, 0x241a2e, 0x4a1a5a];
  const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22];
  spots.forEach((c, i) => {
    c.ph = Math.random() * 6.28; c.hype = 0.6 + Math.random() * 0.6;
    cBody.setColorAt(i, col.set(coats[i % coats.length])); cHead.setColorAt(i, col.set(skins[i % skins.length]));
    cVisor.setColorAt(i, col.set(NEON[i % 3]));
    cArm.setColorAt(i * 2, col.set(coats[i % coats.length])); cArm.setColorAt(i * 2 + 1, col.set(coats[i % coats.length]));
  });
  group.add(cBody, cHead, cVisor, cArm);

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xe6dcff, 0x2a0a3a, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(MAGENTA, 22, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(CYAN, 20, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const top = new THREE.PointLight(0xc8b8ff, 10, 14, 1.5); top.position.set(0, 5.2, 1.2);
  group.add(hemi, key, rimL, rimR, top);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, top: top.intensity };

  // ── State + update ──────────────────────────────────────────────
  const S = { L: 1, flash: 0, cheer: 0, focus: 0, rip: null, solo: null, red: 0, gpose: 0 };
  const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const redC = new THREE.Color(0xff2030), mag = new THREE.Color(MAGENTA), cyan = new THREE.Color(CYAN);

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), L = S.L, whole = Math.floor(beat);
    S.flash = Math.max(0, S.flash - dt * 2.2);
    S.cheer = Math.max(0, S.cheer - dt * 0.5);
    S.red = Math.max(0, S.red - dt * 0.5);
    S.gpose = Math.max(0, S.gpose - dt * 0.6);
    S.focus += ((info.leader || 0) - S.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (S.solo) {
      const so = S.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) S.solo = null;
    }
    const red = Math.min(1, S.red);
    const scene = group.parent;
    if (scene && scene.fog && !scene.userData.dreamFog) { scene.fog.color.set(0x3a0f4a); scene.userData.dreamFog = true; }

    sky.material.uniforms.uPulse.value = onBeat * 0.6 * L + S.flash;
    sky.material.uniforms.uRed.value = red;
    const fu = floorMat.uniforms;
    fu.uBeat.value = onBeat; fu.uFlash.value = S.flash; fu.uLevel.value = L; fu.uTime.value = songTime; fu.uRed.value = red;
    if (S.rip) { fu.uRip.value.set(S.rip.x, 0, songTime - S.rip.t, 1); if (songTime - S.rip.t > 2) S.rip = null; } else fu.uRip.value.w = 0;
    fu.uSolo.value.set(soloX, soloK);
    hexRim.material.color.copy(cyan).lerp(redC, red).multiplyScalar(0.55 + 0.45 * onBeat);
    rail.material.color.copy(mag).lerp(redC, red).multiplyScalar(0.6 + 0.4 * onBeat);
    stripMesh.material.color.setScalar(0.6 + 0.4 * onBeat).lerp(redC, red);
    towerMat.color.setScalar(0.75 + 0.25 * onBeat * L).lerp(redC, red * 0.5);
    beacons.forEach((m, i) => { m.visible = ((Math.floor(songTime * 1.5) + i) % 3) === 0; });

    // Giant robots dance: a heavy two-step, arms pumping on the beat;
    // a big move makes them strike a pose with eyes blazing.
    for (const g of giants) {
      const sway = Math.sin(Math.PI * (beat + g.ph)), drop = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * ph), 2);
      const pose = sm(S.gpose * 2);
      g.pelvis.position.y = 9 - 0.6 * drop;
      g.pelvis.rotation.z = 0.06 * sway * (1 - pose);
      g.torso.rotation.y = 0.25 * sway * (1 - pose);
      g.head.rotation.x = 0.15 * drop; g.head.rotation.y = -0.3 * sway;
      for (const a of g.arms) {
        const pump = Math.sin(Math.PI * (beat + g.ph) + (a.sx > 0 ? 0 : Math.PI));
        a.sh.rotation.x = lerp(-0.6 - 0.6 * pump, -1.2, pose);
        a.sh.rotation.z = lerp(0.2 * a.sx, (a.sx > 0 ? 2.6 : -2.6), pose);
        a.el.rotation.x = lerp(-1.4 + 0.4 * pump, -0.2, pose);
      }
      for (const l of g.legs) {
        const lift = Math.max(0, Math.sin(Math.PI * (beat + g.ph) * (l.sx > 0 ? 1 : -1)));
        l.hip.rotation.x = -0.5 * lift * (1 - pose); l.kn.rotation.x = 0.9 * lift * (1 - pose) + 0.5 * drop * 0.3;
      }
      g.eye.material.color.copy(cyan).lerp(redC, red).multiplyScalar(0.6 + 0.4 * onBeat + pose);
    }
    giantTrim.color.copy(mag).lerp(redC, red);

    // Holograms flicker; globe spins.
    holoMat.opacity = L * (0.75 + 0.25 * onBeat) * (Math.sin(songTime * 23) > 0.93 ? 0.35 : 1);
    holo.position.y = 5.2 + 0.05 * Math.sin(songTime * 2);
    beamMat.opacity = (0.04 + 0.04 * onBeat) * L;
    globe.rotation.y = songTime * 0.6; globe.rotation.x = 0.3;
    globe.scale.setScalar(1 + 0.12 * onBeat + 0.2 * S.flash);
    globeRing.rotation.set(Math.PI / 2 + 0.4 * Math.sin(songTime * 0.7), songTime * 0.9, 0);

    // Helicopters circle; searchlights sweep the roof, lock onto a soloist.
    for (const h of helis) {
      const a = songTime * 0.12 + h.ph;
      const hx = Math.sin(a) * h.r, hz = -9 + Math.cos(a) * h.r * 0.35;
      h.h.position.set(hx, h.y + Math.sin(songTime * 0.8 + h.ph) * 0.4, hz);
      h.h.rotation.y = -a + Math.PI;
      h.h.rotation.z = 0.08;
      h.rotor.rotation.y = songTime * 40;
      h.nav.visible = (Math.floor(songTime * 2 + h.ph) % 2) === 0;
      const tx = lerp(Math.sin(songTime * 0.5 + h.ph) * 4, soloX, soloK), tz = lerp(Math.cos(songTime * 0.4 + h.ph) * 2, 0.2, soloK);
      h.cone.position.copy(h.h.position); h.cone.position.y -= 0.5;
      const dx = tx - h.cone.position.x, dy = 0 - h.cone.position.y, dz = tz - h.cone.position.z;
      const len = Math.hypot(dx, dy, dz);
      h.cone.quaternion.setFromUnitVectors(DOWN, _v.set(dx / len, dy / len, dz / len));
      h.cone.scale.set(1, len / 16, 1);
      h.sm.opacity = L * (0.05 + 0.04 * onBeat + 0.08 * soloK + 0.1 * S.flash);
    }

    // Dust drifts up.
    for (let i = 0; i < DN; i++) { dPos[i * 3 + 1] += (0.15 + (i % 5) * 0.06) * dt; if (dPos[i * 3 + 1] > 12) dPos[i * 3 + 1] -= 12; }
    dGeo.attributes.position.needsUpdate = true;
    dMat.size = 0.12 + 0.06 * onBeat;

    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, S.focus) : Math.max(0, -S.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.3;
      const dx = c.tx + (soloX - c.tx) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.6); c.cone.rotation.x = -0.1;
      c.mat.color.set(NEON[(i + (whole >> 2)) % 2]).lerp(redC, red);
      c.mat.opacity = (0.03 + 0.05 * onBeat + 0.05 * lead + 0.1 * S.flash) * L * (1 + 0.6 * soloK);
    });

    const hype = Math.min(1, 0.35 + S.cheer + Math.abs(S.focus) * 0.3);
    spots.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.ph * 0.3)) * (0.06 + 0.3 * hype * c.hype) * L;
      dummy.position.set(c.x, c.y + 0.58 + jump, c.z);
      dummy.rotation.set(0, Math.atan2(-c.x, -c.z + 8) * 0.3, S.focus * 0.12 * Math.sign(-c.x || 1));
      dummy.scale.setScalar(1); dummy.updateMatrix(); cBody.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.66; dummy.updateMatrix(); cHead.setMatrixAt(i, dummy.matrix);
      dummy.translateY(0.02); dummy.translateZ(0.16); dummy.updateMatrix(); cVisor.setMatrixAt(i, dummy.matrix);
      const up = hype > 0.6 ? 2.6 : 0.4 + 0.3 * Math.sin(beat * Math.PI + c.ph);
      for (const sd of [-1, 1]) {
        dummy.position.set(c.x + sd * 0.29, c.y + 0.9 + jump, c.z);
        dummy.rotation.set(0, 0, sd * up); dummy.updateMatrix();
        cArm.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), dummy.matrix);
      }
    });
    cBody.instanceMatrix.needsUpdate = cHead.instanceMatrix.needsUpdate = cVisor.instanceMatrix.needsUpdate = cArm.instanceMatrix.needsUpdate = true;

    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.5 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, S.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -S.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    top.intensity = base.top * L * (0.6 + 0.4 * onBeat + S.flash) * (1 + soloK);
    top.position.x = soloX * soloK;
    rimL.color.copy(mag).lerp(redC, red);
  }
  const _v = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);
  function lerp(a, b, t) { return a + (b - a) * t; }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { S.rip = { t: data.songTime, x }; S.cheer = Math.min(1, S.cheer + 0.35); }
        if (data.tier >= 4) { S.flash = 0.6; S.gpose = 1.3; }
        break;
      case 'taunt': S.flash = 0.4; break;
      case 'tauntLanded': S.flash = 1; S.cheer = 1; S.red = 1.8; break;
      case 'dodge': S.cheer = Math.min(1, S.cheer + 0.6); S.flash = 0.5; break;
      case 'end': S.cheer = 1; S.flash = 1; S.gpose = 3; break;
      case 'drop': S.flash = 1; S.gpose = 1; break;
      case 'solo': S.solo = { x, t0: data.songTime, t1: data.until }; S.flash = 0.8; S.cheer = 1; S.gpose = 1.5; break;
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
