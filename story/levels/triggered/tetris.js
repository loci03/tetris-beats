// TRIGGERED — the living Tetris world: a night-time warzone seen from a
// sandbag bunker. Soldiers hold the line at both flanks behind sandbag
// emplacements, a burning city smoulders on the horizon (windows flicker,
// roofs catch fire), fire columns roar at the flanks, smoke columns billow,
// embers drift, searchlights comb the smoke, a helicopter crosses with its
// spotlight, barbed wire and craters fill no-man's land — the old 2D
// warzone scene in 3D.
//
// Reactions: moves = that flank's soldier fires a tracer burst and spits
// shell casings; rotations swing the searchlights and the soldiers' aim;
// soft drops make everyone duck (dust off the sandbags); hard drops = both
// flanks open fire (muzzle blasts, screen shake) and a shell lands in
// no-man's land where the piece is (dirt + fireball, scaled by rows; a huge
// one flashes the screen); holds pop a parachute flare that lights the
// field; clears = distant explosions with shockwave rings + artillery
// flashes and the city burns brighter (one per line; a Tetris is a massive
// fireball + debris + orange flash + the chopper swoops in); combos walk a
// chain of blasts across the field; level up = a pair of jets streak over
// with afterburners; a high stack sounds the red alarm beacons; game over
// = the field goes dark and smoky; start = a flare and a volley.

import { makeKit } from '../underground/tetris-kit.js';

const SKY_FS = `
varying vec3 vP; uniform float uT, uFlash, uArt, uArtX, uRed;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
void main(){
  float h = vP.y;
  vec3 top = vec3(0.02,0.0,0.01), mid = vec3(0.09,0.01,0.0), hor = vec3(0.42,0.08,0.0);
  vec3 c = mix(hor, mid, smoothstep(-0.02, 0.18, h));
  c = mix(c, top, smoothstep(0.18, 0.6, h));
  float glow = 0.5 + 0.5 * sin(atan(vP.x, vP.z) * 7.0 + uT * 0.3);
  c += vec3(0.3, 0.07, 0.0) * glow * smoothstep(0.25, 0.0, abs(h - 0.02)) * 0.6;
  float ax = atan(vP.x, -vP.z);
  c += vec3(1.0, 0.6, 0.2) * uArt * exp(-pow((ax - uArtX) * 3.0, 2.0)) * smoothstep(0.5, 0.0, h);
  vec2 g = floor(vec2(atan(vP.x, vP.z) * 120.0, h * 120.0));
  c += vec3(0.7) * step(0.993, hash(g)) * smoothstep(0.25, 0.5, h) * 0.5;
  c += vec3(1.0, 0.55, 0.25) * uFlash * 0.5 + vec3(0.5, 0.0, 0.0) * uRed * 0.25;
  gl_FragColor = vec4(c, 1.0);
}`;

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const K = makeKit(THREE), keep = K.keep;
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0x200604, 20, 75);
  scene.background = new THREE.Color(0x050000);
  camera.far = 300; camera.updateProjectionMatrix();
  const root = new THREE.Group();
  scene.add(root);
  const col = new THREE.Color(), dummy = new THREE.Object3D(), v3 = new THREE.Vector3();
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const lamV = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const addMat = (color, opacity = 1, map = null) => keep(new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));

  // ── Sky + ground ────────────────────────────────────────────────
  const skyU = { uT: { value: 0 }, uFlash: { value: 0 }, uArt: { value: 0 }, uArtX: { value: 0 }, uRed: { value: 0 } };
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(200, 24, 12)), keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: SKY_FS })));
  sky.renderOrder = -10; root.add(sky);
  const dirtTex = K.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a2c1c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,90,60' : '10,6,2'},${Math.random() * 0.2})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    g.strokeStyle = 'rgba(0,0,0,0.4)'; for (let i = 0; i < 6; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 40; y += 12; g.lineTo(x, y); } g.stroke(); }
  });
  dirtTex.wrapS = dirtTex.wrapT = THREE.RepeatWrapping; dirtTex.repeat.set(14, 14);
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(160, 160)), keep(new THREE.MeshLambertMaterial({ map: dirtTex })));
  ground.rotation.x = -Math.PI / 2; ground.position.z = -40; root.add(ground);

  // ── Static battlefield: sandbags, bunker walls, wire posts, craters, tank, ruins ─
  const B = new K.Builder();
  const BAG = [0x5c4a22, 0x4a3a18, 0x6a5528];
  const bagRow = (x0, x1, y, z, ry = 0) => { const n = Math.round((x1 - x0) / 0.95); for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * (x1 - x0) / n; B.sphere(0.5, x * Math.cos(ry), y, z - x * Math.sin(ry), BAG[(i + Math.round(y * 3)) % 3], 1, 0.42, 0.62, 7); } };
  // Foreground bunker (bottom of the screen).
  for (let r = 0; r < 3; r++) bagRow(-9 + (r % 2) * 0.45, 9, 0.2 + r * 0.38, 6.6);
  // Flank emplacements for the soldiers.
  for (const sx of [-1, 1]) for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) B.sphere(0.5, sx * (3.3 + i * 0.9) + (r % 2) * 0.4, 0.2 + r * 0.36, 2.0 - (sx > 0 ? 0 : 0) + Math.abs(i - 1.5) * 0.15, BAG[(i + r) % 3], 1, 0.42, 0.62, 7);
  // Broken concrete walls framing the flanks.
  for (const sx of [-1, 1]) { B.box(0.6, 4.2, 5, sx * 10.5, 2.1, -1, 0x2a2520, 0, sx * 0.25, 0); B.box(0.6, 2.4, 3, sx * 9.6, 1.2, 3.2, 0x262018, 0, sx * 0.6, 0.08 * sx); B.box(1.2, 0.8, 1, sx * 8.4, 0.4, 4.2, 0x3a3020, 0.3, 0.4, 0.2); }
  // Rubble.
  for (let i = 0; i < 26; i++) { const x = (Math.random() - 0.5) * 26, z = -2 - Math.random() * 14; B.add(new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.4, 0), x, 0.1, z, 0x3a3020, Math.random() * 3, Math.random() * 3, 0, 1, 0.6, 1); }
  // Wire posts (wire drawn as lines below).
  for (let x = -14; x <= 14; x += 2.2) { B.box(0.12, 1.4, 0.12, x, 0.7, -3, 0x3a2a1a, 0.15, 0, (x * 0.37 % 0.3)); B.add(new THREE.BoxGeometry(0.1, 1.2, 0.1), x + 0.5, 0.5, -3, 0x3a2a1a, 0, 0, 0.9); }
  // Burned-out tank (right) + wrecked truck (left).
  B.box(4.2, 1.2, 2.4, 9, 0.75, -8, 0x2a2a20, 0, -0.4, 0.05).box(2.2, 0.9, 1.8, 9.2, 1.75, -8.1, 0x24241c, 0, -0.6, 0).cyl(0.12, 0.14, 3.6, 6, 7.4, 1.95, -6.8, 0x1c1c16, 0, 0, Math.PI / 2 - 0.1);
  B.box(3.6, 1.6, 1.8, -9, 1.0, -9, 0x2a241a, 0.1, 0.5, 0.2).box(1.6, 1.4, 1.8, -10.8, 1.1, -8, 0x221c14, 0, 0.5, 0.3);
  // Craters (dark rims).
  for (const [x, z, r] of [[-3, -6, 1.6], [4, -11, 2.2], [-6, -14, 2], [1, -18, 2.6], [7, -3.6, 1.2]]) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; B.sphere(0.45, x + Math.cos(a) * r, 0.05, z + Math.sin(a) * r, 0x2a1c10, 1.4, 0.4, 1, 6); }
  root.add(new THREE.Mesh(B.build(), lamV));
  // Barbed wire: coils as line loops.
  { const pts = []; for (let i = 0; i < 280; i++) { const u = i / 280, x = -14 + u * 28, a = u * 180; pts.push(x + Math.cos(a) * 0.12, 0.85 + Math.sin(a) * 0.35, -3 + Math.cos(a) * 0.35); }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    root.add(new THREE.Line(g, keep(new THREE.LineBasicMaterial({ color: 0x5a4a3a })))); }

  // Distant burning city: instanced buildings + emissive windows + roof fires.
  const BLD = low ? 14 : 22, blds = [];
  for (let i = 0; i < BLD; i++) { const x = -48 + i * (96 / BLD) + (Math.random() - 0.5) * 2, z = -30 - Math.random() * 18, w = 3 + Math.random() * 4, h = 4 + Math.random() * 9; blds.push({ x, z, w, h, ph: Math.random() * 6, fire: 0.2 + Math.random() * 0.5, broken: Math.random() < 0.5 }); }
  const bldMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.MeshLambertMaterial({ color: 0x120806 })), BLD);
  blds.forEach((b, i) => { dummy.position.set(b.x, b.h / 2, b.z); dummy.rotation.set(0, 0, b.broken ? 0.05 : 0); dummy.scale.set(b.w, b.h, 3); dummy.updateMatrix(); bldMesh.setMatrixAt(i, dummy.matrix); });
  root.add(bldMesh);
  const winTex = K.canvasTex(64, 128, (g, w, h) => { g.clearRect(0, 0, w, h); for (let y = 6; y < h - 6; y += 14) for (let x = 6; x < w - 6; x += 14) if (Math.random() < 0.45) { g.fillStyle = `rgba(255,${100 + Math.random() * 90 | 0},20,1)`; g.fillRect(x, y, 7, 8); } });
  const winMat = keep(new THREE.MeshBasicMaterial({ map: winTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff }));
  const winMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), winMat, BLD);
  blds.forEach((b, i) => { dummy.position.set(b.x, b.h / 2, b.z + 1.52); dummy.rotation.set(0, 0, 0); dummy.scale.set(b.w * 0.9, b.h * 0.9, 1); dummy.updateMatrix(); winMesh.setMatrixAt(i, dummy.matrix); winMesh.setColorAt(i, col.setScalar(0.6)); });
  root.add(winMesh);

  // ── Soldiers ────────────────────────────────────────────────────
  const OL = 0x3a4424, OL2 = 0x2c341c;
  const soldiers = [];
  const makeSoldier = (x, z, side, crouch) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    const b = new K.Builder();
    b.add(new THREE.CapsuleGeometry(0.11, 0.7, 2, 6), -0.15, 0.45, 0, OL2).add(new THREE.CapsuleGeometry(0.11, 0.7, 2, 6), 0.15, 0.45, 0, OL2);
    b.add(new THREE.CapsuleGeometry(0.28, 0.55, 2, 8), 0, 1.25, 0, OL).box(0.62, 0.4, 0.34, 0, 1.3, 0.05, 0x2a2e18);
    b.sphere(0.2, 0, 1.85, 0, 0x6b4a30).sphere(0.27, 0, 1.94, 0, 0x30381c, 1, 0.55, 1.05, 10);
    const body = new THREE.Mesh(b.build(), lamV); g.add(body);
    const arms = new THREE.Group(); arms.position.set(0, 1.45, 0); g.add(arms);
    const a = new K.Builder();
    a.add(new THREE.CapsuleGeometry(0.08, 0.5, 2, 5), -0.25, -0.05, -0.25, OL, -1.2, 0, 0.3).add(new THREE.CapsuleGeometry(0.08, 0.5, 2, 5), 0.25, -0.1, -0.2, OL, -1.3, 0, -0.3);
    a.box(0.08, 0.12, 1.1, 0.05, -0.05, -0.65, 0x141410).box(0.06, 0.2, 0.25, 0.05, -0.18, -0.35, 0x141410).box(0.05, 0.05, 0.35, 0.05, -0.02, -1.35, 0x0c0c0a);
    arms.add(new THREE.Mesh(a.build(), lamV));
    const flash = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), addMat(0xffd060, 0, K.glowTex)); flash.position.set(0.05, 0, -1.6); arms.add(flash);
    const s = { g, arms, flash, x, z, side, crouch: crouch ? 1 : 0, baseCrouch: crouch ? 1 : 0, fire: 0, recoil: 0, aim: 0, burst: 0, burstT: 0, duck: 0, ph: Math.random() * 6 };
    soldiers.push(s); return s;
  };
  makeSoldier(-4.3, 2.8, -1, false); makeSoldier(4.4, 2.8, 1, false); makeSoldier(-6.3, 2.3, -1, true); makeSoldier(6.4, 2.4, 1, true);

  // ── Searchlights, helicopter, jets, flare, alarm beacons ────────
  const beamGeo = keep(new THREE.ConeGeometry(2.2, 60, 16, 1, true)); beamGeo.translate(0, -30, 0); beamGeo.rotateX(Math.PI);
  const searchLs = [-1, 1].map((s, i) => { const m = new THREE.Mesh(beamGeo, addMat(0xfff0c0, 0.06)); m.position.set(s * 16, 0, -26); root.add(m); return { m, s, ph: i * 2.1 }; });
  const heli = new THREE.Group(); root.add(heli);
  { const h = new K.Builder(); h.sphere(0.9, 0, 0, 0, 0x14140e, 1.6, 0.8, 0.8, 10).box(3, 0.25, 0.25, 2.2, 0.15, 0, 0x14140e).box(0.1, 0.9, 0.12, 3.6, 0.45, 0, 0x14140e).box(1.6, 0.06, 0.08, -0.2, -0.85, 0.5, 0x101010).box(1.6, 0.06, 0.08, -0.2, -0.85, -0.5, 0x101010); heli.add(new THREE.Mesh(h.build(), lamV)); }
  const rotor = new THREE.Mesh(keep(new THREE.BoxGeometry(5.2, 0.04, 0.22)), basic(0x0a0a0a)); rotor.position.y = 0.85; heli.add(rotor);
  const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2; rotor.add(rotor2);
  const heliBeamGeo = keep(new THREE.ConeGeometry(2.4, 14, 14, 1, true)); heliBeamGeo.translate(0, -7, 0);
  const heliBeamMat = addMat(0xfff4d0, 0.08);
  const heliBeam = new THREE.Mesh(heliBeamGeo, heliBeamMat); heliBeam.position.set(-0.8, -0.5, 0); heli.add(heliBeam);
  const heliLight = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), addMat(0xff2020, 1, K.glowTex)); heliLight.position.set(3.6, 0.9, 0); heli.add(heliLight);
  const heliSt = { active: false, x: -60, timer: 6, vx: 9, y: 9, z: -14, swoop: 0 };
  const jets = [0, 1].map(() => { const j = new THREE.Group(); const b = new K.Builder(); b.add(new THREE.ConeGeometry(0.35, 3.2, 6), 0, 0, 0, 0x2a2e30, 0, 0, -Math.PI / 2).box(0.8, 0.05, 2.8, -0.3, 0, 0, 0x22262a); j.add(new THREE.Mesh(b.build(), lamV)); j.visible = false; root.add(j); return j; });
  const jetSt = { t: -1 };
  const flare = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), addMat(0xe8ffd0, 1, K.glowTex)); flare.visible = false; root.add(flare);
  const flareSt = { t: -1, x: 0 };
  const beaconMat = addMat(0xff1010, 0, K.glowTex);
  const beacons = [[-10.5, 4.4, -1], [10.5, 4.4, -1], [-9.6, 2.6, 3.2], [9.6, 2.6, 3.2]].map(p => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), beaconMat); m.position.set(...p); m.scale.setScalar(2); root.add(m); return m; });

  // ── Fire columns (flank fires), roof fires ──────────────────────
  const fireTex = K.canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.75, 2, w / 2, h * 0.6, h * 0.55); gr.addColorStop(0, 'rgba(255,255,170,1)'); gr.addColorStop(0.3, 'rgba(255,170,30,0.9)'); gr.addColorStop(0.65, 'rgba(255,60,0,0.45)'); gr.addColorStop(1, 'rgba(255,30,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const fireMat = addMat(0xffffff, 1, fireTex);
  const FIRES = [[-8.6, -5], [-11, -12], [-6.8, -10], [8.4, -6.5], [11, -13], [6.2, -14]];
  const fireN = FIRES.length * 3 + BLD;
  const fireMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), fireMat, fireN); fireMesh.frustumCulled = false; root.add(fireMesh);

  // ── Particles ───────────────────────────────────────────────────
  const tracers = K.makePool(low ? 40 : 70, { map: K.glowTex });
  const glows = K.makePool(low ? 80 : 140, { map: K.glowTex });                     // explosions, embers, muzzle
  const smoke = K.makePool(low ? 50 : 90, { map: K.softTex, additive: false, order: 5 });
  const debris = K.makePool(low ? 60 : 110, { additive: false, geo: keep(new THREE.BoxGeometry(1, 1, 1)) });
  const casings = K.makePool(40, { additive: false, geo: keep(new THREE.CylinderGeometry(0.5, 0.5, 2, 6)) });
  root.add(smoke.mesh, debris.mesh, casings.mesh, glows.mesh, tracers.mesh);
  const rings = [];
  for (let i = 0; i < 4; i++) { const mat = addMat(0xffa040, 0); const m = new THREE.Mesh(keep(new THREE.RingGeometry(0.9, 1, 48)), mat); m.visible = false; root.add(m); rings.push({ m, mat, age: 99, max: 6 }); }
  let ringNext = 0;
  const flashMat = keep(new THREE.MeshBasicMaterial({ color: 0xff7020, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  const flashQ = new THREE.Mesh(keep(new THREE.PlaneGeometry(4, 4)), flashMat); flashQ.position.z = -0.5; flashQ.renderOrder = 50; camera.add(flashQ);

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x80405a, 0x301008, 0.45);
  const key = new THREE.DirectionalLight(0xffa070, 0.35); key.position.set(-3, 6, -8);
  const fireL = new THREE.PointLight(0xff6a10, 30, 22, 1.4); fireL.position.set(-8, 3, -5);
  const fireR = new THREE.PointLight(0xff6a10, 30, 22, 1.4); fireR.position.set(8, 3, -6);
  const blastL = new THREE.PointLight(0xffc060, 0, 30, 1.3); blastL.position.set(0, 4, -8);
  root.add(hemi, key, fireL, fireR, blastL);

  // ── State ───────────────────────────────────────────────────────
  const st = { cheer: 0, flash: 0, art: 0, artX: 0, shake: 0, dark: 0, danger: 0, blast: 0, burn: 0, combo: 0, follow: 0, chain: [], aim: [0, 0], sweep: [0, 0], camKick: [0, 0], camDip: [0, 0], ember: 0 };
  const colX = (c) => (c == null ? (Math.random() - 0.5) * 2 : (c - 4.5) / 4.5);
  const muzzle = (s, k = 1) => { s.fire = Math.max(s.fire, k); s.recoil = 1; };
  const fireTracer = (s, n = 1) => {
    for (let i = 0; i < n; i++) {
      v3.set(0.05, 0, -1.6).applyEuler(s.arms.rotation).add(s.arms.position).add(s.g.position);
      const tx = -s.side * (2 + Math.random() * 14) + (Math.random() - 0.5) * 6, ty = 1 + Math.random() * 7, tz = -18 - Math.random() * 20;
      const dx = tx - v3.x, dy = ty - v3.y, dz = tz - v3.z, L = Math.hypot(dx, dy, dz), sp = 45 + Math.random() * 15;
      tracers.spawn(v3.x, v3.y, v3.z, dx / L * sp, dy / L * sp, dz / L * sp, { life: 0.45 + Math.random() * 0.2, size: 0.12, mode: 2, aspect: 0.045, color: 0xfff0a0, alpha: 1 });
    }
  };
  const ejectCasings = (s, n) => { for (let i = 0; i < n; i++) casings.spawn(s.x + s.side * 0.3, 1.5, s.z, s.side * (1 + Math.random() * 1.5), 1.5 + Math.random() * 2, 0.5 + Math.random(), { life: 1.2, size: 0.05, size1: 0.05, grav: 9, mode: 1, spin: 15, color: 0xc8962a, floor: 0.03 }); };
  const explode = (x, z, k = 1, y = 0.4) => {
    for (let i = 0; i < 3; i++) glows.spawn(x + (Math.random() - 0.5) * k, y + 0.6 * k, z, 0, 1.5 * k, 0, { life: 0.5 + i * 0.12, size: 1.5 * k, size1: 5 * k, color: i ? 0xff6a10 : 0xfff0c0, alpha: 1 });
    for (let i = 0; i < Math.round(10 * k); i++) { const a = Math.random() * 6.28, sp = (2 + Math.random() * 5) * k; debris.spawn(x, y + 0.3, z, Math.cos(a) * sp, (3 + Math.random() * 6) * k, Math.sin(a) * sp * 0.5, { life: 1.6, size: 0.12 + Math.random() * 0.2 * k, grav: 12, mode: 1, spin: 10, color: Math.random() < 0.5 ? 0x2a1c10 : 0x4a3a28, floor: 0.05 }); }
    for (let i = 0; i < Math.round(4 * k); i++) smoke.spawn(x + (Math.random() - 0.5) * 2 * k, y + 1, z, (Math.random() - 0.5), 1.2 + Math.random(), 0, { life: 3, size: 2 * k, size1: 6 * k, drag: 0.4, color: 0x2a2220, alpha: 0.6 });
    for (let i = 0; i < Math.round(12 * k); i++) { const a = Math.random() * 6.28, sp = (3 + Math.random() * 6) * k; glows.spawn(x, y + 0.5, z, Math.cos(a) * sp, Math.random() * 7 * k, Math.sin(a) * sp * 0.4, { life: 0.8 + Math.random() * 0.6, size: 0.15, grav: 9, mode: 2, aspect: 0.05, color: 0xffb040 }); }
    const r = rings[ringNext = (ringNext + 1) % rings.length]; r.age = 0; r.max = 5 * k; r.m.position.set(x, y + 1.2 * k, z);
    st.blast = Math.max(st.blast, Math.min(1.5, 0.5 * k)); blastL.position.set(x, 3, z + 2);
  };

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6);
    st.cheer = Math.max(0, st.cheer - dt * 0.4); st.flash = Math.max(0, st.flash - dt * 2.2); st.art = Math.max(0, st.art - dt * 1.8);
    st.shake = Math.max(0, st.shake - dt * 2.6); st.blast = Math.max(0, st.blast - dt * 3); st.burn = Math.max(0, st.burn - dt * 0.12);
    if (st.dark < 0.9) st.dark = Math.max(0, st.dark - dt * 0.3);
    st.danger += ((info.danger > 0.62 ? 1 : 0) - st.danger) * Math.min(1, dt * 2);
    const cheer = Math.max(st.cheer, (info.cheer || 0) * 0.8), red = st.danger, lit = 1 - 0.7 * st.dark;
    const energy = 0.4 + 0.4 * onBeat + cheer * 0.4;
    const aimK = K.spring(st.aim, dt, 1.5, 0.3), sweepK = K.spring(st.sweep, dt, 0.8, 0.25);

    // Chain explosions (combos / Tetris).
    for (let i = st.chain.length - 1; i >= 0; i--) { const c = st.chain[i]; c.t -= dt; if (c.t <= 0) { explode(c.x, c.z, c.k, c.y || 0.4); st.art = Math.max(st.art, 0.6); st.artX = Math.atan2(c.x, -c.z + 10); st.chain.splice(i, 1); } }

    // Soldiers: idle sway, bursts, recoil, duck/crouch, aim.
    for (const s of soldiers) {
      s.fire = Math.max(0, s.fire - dt * 9); s.recoil = Math.max(0, s.recoil - dt * 10); s.duck = Math.max(0, s.duck - dt * 1.6);
      if (s.burst > 0) { s.burstT -= dt; if (s.burstT <= 0) { s.burstT = 0.08; s.burst--; muzzle(s, 0.9); fireTracer(s, 1); if (Math.random() < 0.6) ejectCasings(s, 1); } }
      else if (st.dark < 0.5 && Math.random() < dt * (0.12 + cheer * 0.8)) { s.burst = 2 + Math.floor(Math.random() * 3); }
      const cr = Math.max(s.baseCrouch, s.duck > 0 ? 1 : 0, cheer > 0.45 && s.side > 0 ? 0.6 : 0) * 0.5 + st.dark * 0.5;
      s.g.position.y = -cr * 0.55; s.g.scale.y = 1 - cr * 0.12;
      s.g.rotation.set(0, Math.PI + s.side * 0.25 + Math.sin(t * 0.4 + s.ph) * 0.06 + aimK * 0.15 * s.side, st.dark * 0.3 * s.side);
      s.arms.rotation.set(0.05 + Math.sin(t * 0.7 + s.ph) * 0.04 - aimK * 0.05 - s.recoil * 0.12 + st.dark * 0.8 + 0.12 - 0.24 * Math.max(0, 1 - cr), aimK * 0.25, 0);
      s.arms.position.z = s.recoil * 0.08;
      s.flash.material.opacity = s.fire; s.flash.scale.setScalar(0.6 + s.fire * (0.8 + Math.random() * 0.6)); s.flash.quaternion.copy(camera.quaternion);
      s.flash.position.set(0.05, 0, -1.6); // (arms-local, camera facing approximately)
    }
    const shooting = soldiers.reduce((a, s) => Math.max(a, s.fire), 0);

    // Fires: flank columns + roof fires on the city (bigger with cheer / burn).
    let n = 0;
    FIRES.forEach((f, i) => {
      for (let k = 0; k < 3; k++) {
        const h = (2.2 + energy * 1.6 + cheer * 1.4 + red * 0.8) * (1 - 0.25 * k) * (0.85 + 0.15 * Math.sin(t * (7 + k) + i * 3)) * lit;
        dummy.position.set(f[0] + (k - 1) * 0.45, h * 0.42, f[1] + k * 0.1); dummy.quaternion.copy(camera.quaternion);
        dummy.scale.set(h * 0.55, h, 1); dummy.updateMatrix(); fireMesh.setMatrixAt(n++, dummy.matrix);
      }
      if (Math.random() < dt * (3 + cheer * 6)) glows.spawn(f[0] + (Math.random() - 0.5), 1.5, f[1], (Math.random() - 0.5) * 0.8, 1.5 + Math.random() * 2, 0, { life: 2 + Math.random(), size: 0.1, color: 0xffa040, drag: 0.2 });
      if (Math.random() < dt * 1.2) smoke.spawn(f[0], 3.5, f[1], 0.3, 1.2, 0, { life: 4, size: 2, size1: 6, drag: 0.1, color: 0x1a1210, alpha: 0.45 });
    });
    blds.forEach((b, i) => {
      const k = Math.max(0, b.fire + st.burn + cheer * 0.6 - 0.4) * lit;
      const h = k * (3 + Math.sin(t * 5 + b.ph));
      dummy.position.set(b.x, b.h + h * 0.38, b.z); dummy.quaternion.copy(camera.quaternion); dummy.scale.set(Math.max(0.01, b.w * 0.8 * Math.min(1, k * 2)), Math.max(0.01, h), 1); dummy.updateMatrix(); fireMesh.setMatrixAt(n++, dummy.matrix);
      const lit2 = (Math.sin(t * 1.2 + b.ph) > -0.3 ? 0.6 : 0.2) + 0.3 * energy;
      winMesh.setColorAt(i, col.setRGB(1, 0.8, 0.6).multiplyScalar(lit2 * lit));
    });
    fireMesh.count = n; fireMesh.instanceMatrix.needsUpdate = true; winMesh.instanceColor.needsUpdate = true;

    // Searchlights comb the sky; swing on rotations.
    searchLs.forEach((l) => { l.m.rotation.set(-0.45 + 0.15 * Math.sin(t * 0.3 + l.ph), 0, l.s * (0.35 + 0.35 * Math.sin(t * 0.25 + l.ph)) + sweepK * 0.5 * l.s); l.m.material.opacity = (0.05 + 0.03 * onBeat + Math.min(0.08, Math.abs(sweepK) * 0.06)) * lit; });

    // Helicopter crossing.
    heliSt.timer -= dt * (1 + cheer * 1.5);
    if (!heliSt.active && heliSt.timer <= 0) { heliSt.active = true; heliSt.dir = Math.random() < 0.5 ? 1 : -1; heliSt.x = -heliSt.dir * 45; heliSt.y = 8 + Math.random() * 3; heliSt.z = -12 - Math.random() * 6; heliSt.timer = 12; }
    if (heliSt.active) {
      heliSt.swoop = Math.max(0, heliSt.swoop - dt * 0.4);
      heliSt.x += heliSt.dir * dt * (8 + energy * 4) * (1 - 0.5 * heliSt.swoop);
      heli.position.set(heliSt.x, heliSt.y - heliSt.swoop * 3 + Math.sin(t * 1.4) * 0.2, heliSt.z + heliSt.swoop * 6);
      heli.rotation.set(0, heliSt.dir > 0 ? Math.PI : 0, 0.15 * heliSt.dir * 0 + 0.12);
      if (Math.abs(heliSt.x) > 50) heliSt.active = false;
    } else heli.position.set(0, -50, 0);
    rotor.rotation.y += dt * 30;
    heliBeam.rotation.z = Math.sin(t * 0.8) * 0.4;
    heliBeamMat.opacity = (0.06 + 0.04 * cheer) * lit;
    heliLight.material.opacity = Math.sin(t * 8) > 0.6 ? 1 : 0.1; heliLight.quaternion.copy(camera.quaternion);

    // Jets (level up).
    if (jetSt.t >= 0) {
      jetSt.t += dt; const u = jetSt.t / 2.4;
      jets.forEach((j, i) => { j.visible = u < 1; j.position.set(-60 + u * 120 + i * 4, 13 - i * 1.5, -22 - i * 3); j.rotation.set(0, 0, -0.05); if (u < 1 && Math.random() < 0.9) glows.spawn(j.position.x - 1.8, j.position.y, j.position.z, -20, 0, 0, { life: 0.5, size: 0.8, size1: 0.2, color: 0xff9030 }); });
      if (u >= 1) jetSt.t = -1;
    }
    // Flare (hold): rises, hangs on its parachute, lights the field.
    let flareK = 0;
    if (flareSt.t >= 0) {
      flareSt.t += dt; const u = flareSt.t;
      const y = u < 0.8 ? 1.5 + u / 0.8 * 9 : 10.5 - (u - 0.8) * 0.7;
      flareK = u < 0.8 ? 0.5 : Math.max(0, 1 - (u - 0.8) / 4.5);
      flare.visible = flareK > 0.01; flare.position.set(flareSt.x + Math.sin(u) * 0.5, y, -8); flare.quaternion.copy(camera.quaternion);
      flare.scale.setScalar(2 + 4 * flareK * (0.9 + 0.2 * Math.random()));
      if (Math.random() < dt * 20) glows.spawn(flare.position.x, flare.position.y, -8, (Math.random() - 0.5), -1.5, 0, { life: 0.8, size: 0.12, color: 0xd8ffc0 });
      if (u > 5.5) { flareSt.t = -1; flare.visible = false; }
    }
    // Beacons (danger).
    beaconMat.opacity = red * (Math.sin(t * 9) > 0 ? 1 : 0.15);
    for (const b of beacons) b.quaternion.copy(camera.quaternion);

    // Rings.
    for (const r of rings) {
      if (r.age >= 99) continue;
      r.age += dt; const u = r.age / 0.8;
      if (u >= 1) { r.age = 99; r.m.visible = false; continue; }
      r.m.visible = true; r.m.quaternion.copy(camera.quaternion); r.m.scale.setScalar(0.5 + u * r.max); r.mat.opacity = (1 - u) * 0.8;
    }
    // Ambient embers drift up across the field.
    if (Math.random() < dt * (10 + cheer * 20)) glows.spawn((Math.random() - 0.5) * 24, 0.3, -2 - Math.random() * 12, (Math.random() - 0.5) * 0.6 + 0.2, 1 + Math.random() * 1.5, 0, { life: 3 + Math.random() * 2, size: 0.07 + Math.random() * 0.06, color: Math.random() < 0.5 ? 0xff8a20 : 0xffc040, drag: 0.1 });
    // Distant random tracer fire across the horizon.
    if (Math.random() < dt * (0.8 + cheer * 4)) { const sx = Math.random() < 0.5 ? -1 : 1; tracers.spawn(sx * 30, 2 + Math.random() * 6, -24 - Math.random() * 10, -sx * 40, Math.random() * 3, 0, { life: 1.2, size: 0.18, mode: 2, aspect: 0.05, color: Math.random() < 0.3 ? 0xff4020 : 0xffe080 }); }

    tracers.update(dt, camera); glows.update(dt, camera); smoke.update(dt, camera); debris.update(dt, camera); casings.update(dt, camera);

    // Sky, flash, lights.
    skyU.uT.value = t; skyU.uFlash.value = st.flash + st.blast * 0.3; skyU.uArt.value = st.art; skyU.uArtX.value = st.artX; skyU.uRed.value = red * (0.5 + 0.5 * Math.sin(t * 9));
    flashMat.color.set(st.flash > 0.6 ? 0xffc080 : 0xff6010);
    flashMat.opacity = Math.min(0.55, st.flash * 0.35 + (cheer > 0.85 ? 0.08 : 0) + red * 0.06 * (Math.sin(t * 9) > 0 ? 1 : 0));
    const fl = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
    fireL.intensity = (24 + 10 * energy + 12 * cheer) * fl * lit; fireR.intensity = (24 + 10 * energy + 12 * cheer) * (1.7 - fl) * lit;
    blastL.intensity = st.blast * 140 + shooting * 25 + flareK * 60;
    blastL.color.set(flareK > st.blast ? 0xd8ffd0 : 0xffb050);
    if (flareK > st.blast) blastL.position.set(flareSt.x, 8, -6);
    hemi.intensity = (0.4 + flareK * 0.6 + st.flash * 0.5) * lit;
    scene.fog.color.setRGB(0.13 + red * 0.1, 0.025, 0.015);

    // ── Camera ──
    const F = K.framing(camera);
    st.follow += ((info.pieceX || 0) * 0.6 - st.follow) * Math.min(1, dt * 2);
    const kx = K.spring(st.camKick, dt, 2.2, 0.4), dip = K.spring(st.camDip, dt, 2.6, 0.45);
    const sh = st.shake, sx = (Math.random() - 0.5) * sh * 0.45, sy = (Math.random() - 0.5) * sh * 0.35;
    if (F.portrait) {
      camera.position.set(Math.sin(t * 0.13) * 0.4 + st.follow * 0.4 + kx * 0.5 + sx, 2.6 + dip + sy, 11.5);
      camera.lookAt(st.follow * 0.3, 4.2 + dip * 0.5, -10);
      camera.fov = 80;
    } else {
      camera.position.set(Math.sin(t * 0.13) * 0.5 + st.follow + kx + sx, 2.7 + Math.sin(t * 0.21) * 0.12 + dip + sy, 10 + Math.sin(t * 0.09) * 0.3);
      camera.lookAt(st.follow * 0.6 + kx * 0.4, 2.5 + dip * 0.5, -10);
      camera.fov = 54;
    }
    camera.rotateZ(Math.sin(t * 0.17) * 0.01 + kx * 0.02 + sh * (Math.random() - 0.5) * 0.02);
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position);
  }

  function react(kind, d = {}) {
    const x = colX(d.col);
    switch (kind) {
      case 'move': {
        const s = soldiers.find(o => o.side === ((d.dir || 1) > 0 ? 1 : -1) && !o.baseCrouch);
        s.burst = Math.max(s.burst, 3); s.burstT = 0; ejectCasings(s, 2);
        st.camKick[1] += (d.dir || 1) * 0.35;
        break;
      }
      case 'rotate':
        st.sweep[1] += (d.dir || 1) * 2.5; st.aim[1] += (d.dir || 1) * 3;
        break;
      case 'soft':
        for (const s of soldiers) s.duck = 0.5;
        for (let i = 0; i < 3; i++) smoke.spawn((Math.random() - 0.5) * 14, 1.1, 6.4, (Math.random() - 0.5), 0.6, 0.3, { life: 1.2, size: 0.6, size1: 2, drag: 1, color: 0x6a5a40, alpha: 0.4 });
        st.camDip[1] -= 0.2;
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.25 + r / 14);
        for (const s of soldiers) { muzzle(s, 1); fireTracer(s, 2); ejectCasings(s, 2); s.burst = Math.max(s.burst, 2); }
        explode(x * 7, -7 - Math.random() * 4, 0.5 + k * 0.9);
        st.shake = Math.max(st.shake, 0.4 + 0.8 * k); st.camDip[1] -= 0.6 * k;
        if (r >= 12) st.flash = Math.max(st.flash, 0.6);
        break;
      }
      case 'hold':
        flareSt.t = 0; flareSt.x = x * 6;
        break;
      case 'clear': {
        const n = Math.max(1, Math.min(4, d.lines || 1)), c = Math.max(0, d.combo || 0);
        st.combo = c;
        st.cheer = Math.min(1.2, Math.max(st.cheer, [0, 0.35, 0.55, 0.78, 1][n] + Math.min(0.4, c * 0.12)));
        st.burn = Math.min(1.2, st.burn + 0.15 * n);
        for (let i = 0; i < n; i++) st.chain.push({ t: i * 0.22, x: (Math.random() - 0.5) * 30, z: -16 - Math.random() * 14, k: 0.9 + n * 0.25, y: 0.5 });
        st.art = 1; st.artX = (Math.random() - 0.5) * 1.6;
        if (n >= 4) {
          st.chain.push({ t: 0.1, x: x * 4, z: -12, k: 2.6 });
          st.flash = 1; st.shake = 1.2;
          heliSt.active = true; heliSt.dir = Math.random() < 0.5 ? 1 : -1; heliSt.x = -heliSt.dir * 30; heliSt.y = 9; heliSt.z = -12; heliSt.swoop = 1;
        } else st.flash = Math.max(st.flash, [0, 0.1, 0.2, 0.45][n]);
        for (let i = 0; i < Math.min(5, c); i++) st.chain.push({ t: 0.4 + i * 0.18, x: -12 + i * 6, z: -6 - i * 1.5, k: 0.7 + c * 0.1 });
        for (const s of soldiers) { s.burst = Math.max(s.burst, 2 + n); }
        break;
      }
      case 'combo':
        break;
      case 'levelUp':
        jetSt.t = 0; st.flash = 0.4; st.cheer = 1.2;
        for (let i = 0; i < 3; i++) st.chain.push({ t: 1 + i * 0.25, x: -20 + i * 20, z: -30, k: 1.5 });
        break;
      case 'gameOver':
        st.dark = 1; for (let i = 0; i < 10; i++) smoke.spawn((Math.random() - 0.5) * 20, 1, -2 - Math.random() * 8, 0, 0.5, 0, { life: 6, size: 3, size1: 8, drag: 0.2, color: 0x1a1412, alpha: 0.6 });
        break;
      case 'start':
        st.dark = 0; flareSt.t = 0; flareSt.x = 0; for (const s of soldiers) s.burst = 4;
        break;
    }
  }

  return {
    update, react,
    dispose() { scene.remove(root); camera.remove(flashQ); scene.fog = prevFog; scene.background = prevBg; K.dispose(); },
  };
}
