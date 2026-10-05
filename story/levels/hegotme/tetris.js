// HE GOT ME — the Tetris world: a radiant gothic cathedral, mid-service.
//
// The old 2D scene: a cathedral with god-rays from the rose window
// (brighter with the music and clears), blue / red stained-glass windows,
// pillars pulsing on the beat, coloured window light pooled on the floor,
// altar candles that flare on clears, two pastors who raise their arms on
// clears, three chandeliers swinging like pendulums (a hard drop kicks
// them), pews of worshippers bobbing (arms raised on clears), a singing
// choir of angels — wings flapping, halos, notes ♪ rising — that GASPS and
// stops on a hard drop, doves scattered by hard drops, ♪ ✝ ✦ glyphs rising
// on clears, golden sparks, a halo round the board on clears, a bell-ring
// flash on hard drops and a descending cross of light on a big clear.
//
// In 3D: we look down the nave between pillar arcades to the altar under a
// blazing rose window; tall lancet windows glow down both walls; angel
// choirs stand in the side lofts, wings slowly beating; the congregation
// fills the pews; chandeliers hang in the side aisles; doves circle under
// the vault; deacons in robes flank the aisle.
//   move     → doves wheel that way, a ripple of light runs down that wall's windows, candle flames lean
//   rotate   → chandeliers twirl, the rose window turns, a sparkle of ✦ from the choir
//   soft     → the organ swells: pipes + god rays breathe brighter, incense rises
//   drop     → the bell: BONG shock-ring + flash (∝ rows), chandeliers swing (∝ rows), doves scatter,
//              the choir GASPS (notes stop, halos dim), candles gutter
//   hold     → the choir holds the note: halos blaze, angels lift off their loft, aura
//   clear n  → god rays + floor light flare, congregation + deacons raise hands, ♪ ✝ ✦ rise (∝ n);
//              2 = every window blazes; 3 = organ blast + candles flare tall;
//              4 = a cross of light descends down the nave, all wings spread, doves released
//   combo    → the windows chase in colour, escalating, more glyphs
//   levelUp  → the rose window blooms and spins, a fountain of golden sparks, choir crescendo
//   danger   → a storm outside: lightning flashes through the windows, the light turns cold
//   gameOver → the candles snuff out; one shaft of light remains
//   start    → the lights rise

import { createKit, frac, clamp, lerp } from '../violins/tetris-kit.js';

const TAU = Math.PI * 2;

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const kit = createKit(THREE);
  const { keep } = kit;
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0x1a1008, 30, 90);
  scene.background = new THREE.Color(0x0a0604);
  camera.far = 300; camera.updateProjectionMatrix();
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const lam = (c, e = 0x000000, extra) => keep(new THREE.MeshLambertMaterial({ color: c, emissive: e, ...extra }));
  const basic = (c, extra) => keep(new THREE.MeshBasicMaterial({ color: c, ...extra }));
  const vcol = lam(0xffffff, 0x000000, { vertexColors: true });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const additive = (m) => { m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor; m.transparent = true; m.depthWrite = false; return m; };

  const NAVE = 8.5, WALL = 14, END = -36, VAULT = 22;

  // ── Architecture (one merged mesh) ────────────────────────────────
  const ab = new kit.Builder();
  const stone = 0x8a7a64, stoneD = 0x5a4c3c;
  ab.box(2 * WALL + 2, 0.4, 70, 0, -0.2, -2, 0x6a5a48);                       // floor
  for (let i = 0; i < 14; i++) ab.box(2 * NAVE - 1, 0.02, 0.06, 0, 0.01, 10 - i * 3.4, 0x4a3c2c);   // floor joints
  ab.box(3.2, 0.03, 60, 0, 0.02, -2, 0x7a1424);                                 // aisle runner
  for (const s of [-1, 1]) {
    ab.box(1, VAULT, 70, s * (WALL + 0.5), VAULT / 2, -2, stoneD);              // side walls
    for (let k = 0; k < 6; k++) {
      const z = 3 - k * 7;
      ab.cyl(0.75, 0.85, 13, 12, s * NAVE, 6.5, z, stone);                       // pillar
      ab.box(2, 0.6, 2, s * NAVE, 0.3, z, stoneD); ab.box(1.9, 0.5, 1.9, s * NAVE, 13.2, z, stoneD);
      for (let f = 0; f < 4; f++) ab.cyl(0.18, 0.18, 12.5, 5, s * NAVE + Math.cos(f * 1.57 + 0.78) * 0.8, 6.5, z + Math.sin(f * 1.57 + 0.78) * 0.8, 0x9a8a72);
      if (k < 5) ab.add(new THREE.TorusGeometry(3.5, 0.45, 5, 14, Math.PI), ab.m4(s * NAVE, 13.4, z - 3.5, 0, Math.PI / 2, 0, 1, 1.25, 1), stone);   // arcade arch
      ab.add(new THREE.TorusGeometry(NAVE, 0.4, 5, 20, Math.PI), ab.m4(0, 14, z, 0, 0, 0, 1, 0.95, 1), stoneD);  // vault rib
      ab.box(0.6, VAULT - 13, 0.6, s * (WALL - 0.3), 13 + (VAULT - 13) / 2 - 4, z - 3.5, stoneD); // wall shafts
    }
    // choir loft (balcony) along each wall
    ab.box(3.2, 0.5, 24, s * (WALL - 1.8), 5.2, -9, 0x4a2c18); ab.box(0.25, 1.1, 24, s * (WALL - 3.3), 6, -9, 0x6a4020);
    for (let k = 0; k < 12; k++) ab.box(0.12, 1, 0.12, s * (WALL - 3.3), 5.9, 2.5 - k * 2.1, 0xd4a548);
  }
  ab.box(2 * WALL + 2, VAULT + 6, 1, 0, (VAULT + 6) / 2, END - 0.5, stoneD);    // end wall
  ab.box(2 * WALL + 2, 1, 70, 0, VAULT + 4, -2, 0x2a1c12);                      // ceiling
  // Altar: steps, table, cross, organ case.
  ab.box(16, 0.5, 8, 0, 0.25, END + 6, 0x7a6a54); ab.box(12, 0.5, 6, 0, 0.75, END + 5, 0x8a7a64);
  ab.box(6, 1.6, 2, 0, 1.8, END + 4, 0xe8dcc0); ab.box(6.4, 0.2, 2.3, 0, 2.65, END + 4, 0xd4a548);
  ab.box(0.35, 4.5, 0.35, 0, 5.2, END + 3.2, 0xd4a548); ab.box(2.4, 0.35, 0.35, 0, 6.3, END + 3.2, 0xd4a548);
  root.add(new THREE.Mesh(ab.build(), vcol));

  // ── Pews + congregation ───────────────────────────────────────────
  const pb = new kit.Builder();
  pb.box(5.6, 0.12, 0.7, 0, 0.75, 0, 0x5a3418); pb.box(5.6, 1.1, 0.12, 0, 1.2, 0.36, 0x4a2a12); pb.box(0.15, 1.3, 0.8, -2.8, 0.65, 0, 0x3a200c); pb.box(0.15, 1.3, 0.8, 2.8, 0.65, 0, 0x3a200c);
  const pewGeo = pb.build();
  const PEW_ROWS = low ? 7 : 9, pews = [];
  for (let r = 0; r < PEW_ROWS; r++) for (const s of [-1, 1]) pews.push({ x: s * 4.7, z: 9 - r * 2.6 });
  const pewMesh = new THREE.InstancedMesh(pewGeo, vcol, pews.length);
  pews.forEach((p, i) => { dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); pewMesh.setMatrixAt(i, dummy.matrix); });
  root.add(pewMesh);
  const wb = new kit.Builder();
  wb.cyl(0.24, 0.3, 0.8, 7, 0, 1.2, 0, 0xffffff); wb.sph(0.17, 0, 1.78, 0, 0xffd8b8);
  const worGeo = wb.build();
  const hb = new kit.Builder();     // raised hands (pivot at the shoulders)
  hb.cyl(0.05, 0.05, 0.6, 5, -0.2, 0.3, 0, 0xffd8b8); hb.cyl(0.05, 0.05, 0.6, 5, 0.2, 0.3, 0, 0xffd8b8);
  const handGeo = hb.build();
  const wor = [];
  const robes = [0x3a2a6a, 0x7a1424, 0x1a3a5a, 0x2a2a2a, 0x5a3a1a, 0xe8dcc0, 0x2a5a3a, 0x6a2a5a];
  pews.forEach((p, pi) => { const n = low ? 3 : 4; for (let k = 0; k < n; k++) wor.push({ x: p.x - 2.2 + k * (4.4 / (n - 1)) + (Math.random() - 0.5) * 0.3, z: p.z - 0.25, ph: Math.random() * TAU, alt: (pi + k) & 1 }); });
  const WN = wor.length;
  const worMesh = new THREE.InstancedMesh(worGeo, vcol, WN), handMesh = new THREE.InstancedMesh(handGeo, vcol, WN);
  wor.forEach((w, i) => worMesh.setColorAt(i, col.set(robes[i % robes.length])));
  for (const m of [worMesh, handMesh]) { m.frustumCulled = false; root.add(m); }

  // ── Stained-glass lancets (canvas textures) + the rose window ─────
  const lancetTex = kit.canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.save(); g.beginPath(); g.moveTo(6, h); g.lineTo(6, 70); g.quadraticCurveTo(6, 6, w / 2, 2); g.quadraticCurveTo(w - 6, 6, w - 6, 70); g.lineTo(w - 6, h); g.closePath(); g.clip();
    const pal = ['#2a6aff', '#ff3040', '#ffd040', '#30c060', '#9a40ff', '#40c8ff', '#ff8020'];
    for (let y = 0; y < h; y += 18) for (let x = 0; x < w; x += 18) { g.fillStyle = pal[((x * 7 + y * 3) / 18 | 0) % pal.length]; g.globalAlpha = 0.7 + 0.3 * Math.sin(x * y); g.fillRect(x, y, 18, 18); }
    g.globalAlpha = 1; g.fillStyle = '#fff3c0'; g.beginPath(); g.arc(w / 2, 150, 26, 0, TAU); g.fill();
    g.fillStyle = '#ffd040'; g.fillRect(w / 2 - 5, 200, 10, 200); g.fillRect(w / 2 - 34, 250, 68, 10);
    g.strokeStyle = '#111'; g.lineWidth = 3;
    for (let y = 0; y < h; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x < w; x += 18) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.restore();
  });
  const lancetGeo = keep(new THREE.PlaneGeometry(3, 11));
  const lancets = [];
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
    const mat = additive(basic(0xffffff, { map: lancetTex, fog: false }));
    const m = add(lancetGeo, mat, s * (WALL - 0.05), 12, 6.5 - k * 7); m.rotation.y = -s * Math.PI / 2;
    lancets.push({ m, mat, s, k, z: 6.5 - k * 7, hue: s < 0 ? 0.6 : 0.0, ripple: 0, blaze: 0 });
  }
  const roseTex = kit.canvasTex(512, 512, (g, w) => {
    const c = w / 2; g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
    const pal = ['#ff3040', '#2a6aff', '#ffd040', '#9a40ff', '#30c060', '#ff8020'];
    for (let r = 5; r >= 1; r--) for (let i = 0; i < 16; i++) {
      g.fillStyle = pal[(i + r) % pal.length]; g.beginPath(); g.moveTo(c, c);
      g.arc(c, c, r * 48, (i / 16) * TAU, ((i + 1) / 16) * TAU); g.closePath(); g.fill();
    }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(c + Math.cos(a) * 170, c + Math.sin(a) * 170, 22, 0, TAU); g.fill(); }
    g.fillStyle = '#fff8d8'; g.beginPath(); g.arc(c, c, 40, 0, TAU); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 6;
    for (let r = 1; r <= 5; r++) { g.beginPath(); g.arc(c, c, r * 48, 0, TAU); g.stroke(); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * 40, c + Math.sin(a) * 40); g.lineTo(c + Math.cos(a) * 240, c + Math.sin(a) * 240); g.stroke(); }
    g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.arc(c, c, 246, 0, TAU); g.fill();
  });
  const roseMat = additive(basic(0xffffff, { map: roseTex, fog: false }));
  const rose = add(keep(new THREE.CircleGeometry(8, 48)), roseMat, 0, 15.5, END + 0.1);
  add(keep(new THREE.TorusGeometry(8.2, 0.5, 6, 48)), lam(0x8a7a64), 0, 15.5, END + 0.2);
  // Organ pipes flanking the rose window.
  const PIPES = 24, pipeHot = new Float32Array(PIPES);
  const pipeMesh = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.22, 0.22, 1, 8)), lam(0xd8b060, 0x3a2400), PIPES);
  const pipeInfo = [];
  for (let i = 0; i < PIPES; i++) {
    const s = i < PIPES / 2 ? -1 : 1, j = i % (PIPES / 2), x = s * (9 + j * 0.5), h = 5 + 4 * Math.sin((j / 11) * Math.PI) + (j % 2) * 0.6;
    pipeInfo.push({ x, h }); dummy.position.set(x, 3 + h / 2, END + 1.2); dummy.scale.set(1, h, 1); dummy.updateMatrix(); pipeMesh.setMatrixAt(i, dummy.matrix); pipeMesh.setColorAt(i, col.setRGB(1, 1, 1));
  }
  root.add(pipeMesh);

  // ── Chandeliers in the side aisles (pendulums) ───────────────────
  const chb = new kit.Builder();
  chb.cyl(0.03, 0.03, 7, 4, 0, -3.5, 0, 0x222222);
  chb.add(new THREE.TorusGeometry(1.1, 0.07, 5, 20), chb.m4(0, -7, 0, Math.PI / 2), 0xd4a548);
  chb.add(new THREE.TorusGeometry(0.6, 0.06, 5, 16), chb.m4(0, -6.4, 0, Math.PI / 2), 0xd4a548);
  chb.sph(0.2, 0, -7.2, 0, 0xd4a548);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; chb.cyl(0.05, 0.05, 0.3, 5, Math.cos(a) * 1.1, -6.8, Math.sin(a) * 1.1, 0xf0e8d0); }
  const chGeo = chb.build();
  const chand = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const g = new THREE.Group(); g.position.set(s * 11, VAULT - 1, 4 - k * 11); root.add(g);
    g.add(new THREE.Mesh(chGeo, vcol));
    chand.push({ g, ang: (Math.random() - 0.5) * 0.06, vel: 0, angZ: 0, velZ: 0, spin: 0, s, x: s * 11, z: 4 - k * 11 });
  }

  // ── Angel choirs in the side lofts ────────────────────────────────
  const angB = new kit.Builder();
  angB.add(new THREE.ConeGeometry(0.42, 1.5, 10, 1, true), angB.m4(0, 0.75, 0), 0xfff2dc); angB.sph(0.42, 0, 0.02, 0, 0xfff2dc, 1, 0.12, 1);
  angB.sph(0.22, 0, 1.68, 0, 0xffdcc0); angB.sph(0.24, 0, 1.76, -0.04, 0xd8a050, 1, 0.9, 1);
  const angelGeo = angB.build();
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.bezierCurveTo(0.4, 0.5, 1.1, 0.9, 1.4, 1.0); wingShape.bezierCurveTo(1.2, 0.5, 1.0, 0.0, 0.9, -0.5); wingShape.bezierCurveTo(0.6, -0.4, 0.3, -0.2, 0, 0);
  const wingGeo = keep(new THREE.ShapeGeometry(wingShape, 6));
  const angels = [], AS = 1.45;
  for (const s of [-1, 1]) for (let k = 0; k < (low ? 6 : 8); k++) angels.push({ s, x: s * (WALL - 1.8 + (k % 2) * 0.6), z: 1.5 - k * (21 / (low ? 5 : 7)), ph: Math.random() * TAU, rise: 0, hue: [0.12, 0.58, 0.0, 0.8][k % 4] });
  const AN = angels.length;
  const angelMat = lam(0xffffff, 0x2a2010, { vertexColors: true });
  const angelMesh = new THREE.InstancedMesh(angelGeo, angelMat, AN);
  const wingMat = lam(0xffffff, 0x3a3020, { side: THREE.DoubleSide });
  const wingMesh = new THREE.InstancedMesh(wingGeo, wingMat, AN * 2);
  for (const m of [angelMesh, wingMesh]) { m.frustumCulled = false; root.add(m); }
  // Deacons flanking the aisle near the front (arms rise on clears).
  const deacons = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 2.6, 0, 6); g.rotation.y = -s * 0.5; root.add(g);
    const db = new kit.Builder();
    db.add(new THREE.ConeGeometry(0.55, 1.9, 10, 1, true), db.m4(0, 0.95, 0), 0x5a1a6a); db.cyl(0.35, 0.3, 0.6, 10, 0, 1.95, 0, 0x5a1a6a);
    db.sph(0.24, 0, 2.5, 0, 0x7a5038); db.box(0.12, 1.4, 0.04, 0, 1.6, 0.36, 0xd4a548);   // stole
    g.add(new THREE.Mesh(db.build(), vcol));
    const arms = [-1, 1].map((a) => { const p = new THREE.Group(); p.position.set(a * 0.38, 2.15, 0); g.add(p); add(keep(new THREE.CylinderGeometry(0.09, 0.11, 0.9, 6)), lam(0x5a1a6a), 0, -0.45, 0, p); return p; });
    return { g, arms, s };
  });

  // ── Doves (instanced body + wings) ────────────────────────────────
  const DN = low ? 10 : 16;
  const doveBody = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.22, 8, 6)), lam(0xffffff, 0x302c28), DN);
  const doveWing = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.55, 0.28)), lam(0xffffff, 0x302c28, { side: THREE.DoubleSide }), DN * 2);
  for (const m of [doveBody, doveWing]) { m.frustumCulled = false; root.add(m); }
  const doves = Array.from({ length: DN }, (_, i) => ({ a: i / DN * TAU, r: 6 + Math.random() * 5, y: 15 + Math.random() * 4, cz: -6 + (Math.random() - 0.5) * 10, sp: 0.25 + Math.random() * 0.2, flap: Math.random() * 6, vy: 0, scared: 0, dr: 0, dz: 0 }));

  // ── God rays + the descending cross ───────────────────────────────
  const rayMat = (k) => additive(keep(new THREE.ShaderMaterial({
    uniforms: { uK: { value: k }, uCol: { value: new THREE.Color(1, 0.86, 0.55) } }, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uK; uniform vec3 uCol; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.2); gl_FragColor = vec4(uCol * uK * e * (0.25 + 0.75 * vUv.y), 1.0); }',
  })));
  const rayGeo = keep(new THREE.CylinderGeometry(1.2, 3.8, 40, 14, 1, true)); rayGeo.translate(0, -20, 0);
  const rays = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(rayGeo, rayMat(0.05)); const a = (i - 2) * 0.26;
    m.position.set(Math.sin(a) * 3, 15.5, END + 1); m.rotation.set(-1.05 + 0.1 * Math.abs(i - 2), 0, -a * 1.2); m.renderOrder = 3; root.add(m);
    rays.push({ m, a, ph: i });
  }
  // Lancet shafts: light slanting in from the side windows onto the floor.
  const shaftGeo = keep(new THREE.BoxGeometry(2.4, 1, 9)); shaftGeo.translate(0, -0.5, 0);
  const shafts = lancets.map((L) => {
    const mat = rayMat(0.02);
    const m = new THREE.Mesh(shaftGeo, mat); m.position.set(L.s * (WALL - 0.3), 15, L.z); m.rotation.set(0, 0, L.s * 0.85); m.scale.set(1, 16, 0.3); m.renderOrder = 3;
    root.add(m); return { m, mat };
  });
  const crossMat = rayMat(0);
  const crossV = add(keep(new THREE.BoxGeometry(2.2, 30, 0.1)), crossMat, 0, 15, -10); crossV.renderOrder = 4;
  const crossH = add(keep(new THREE.BoxGeometry(30, 2.2, 0.1)), crossMat, 0, 12, -10); crossH.renderOrder = 4;
  crossV.visible = crossH.visible = false;

  // ── Sprites ───────────────────────────────────────────────────────
  const atlasTex = kit.atlas([kit.paint.glow, kit.paint.ring, kit.paint.sparkle, kit.paint.glyph('♪'), kit.paint.glyph('♫'), kit.paint.glyph('✝'), kit.paint.glyph('✦'), kit.paint.puff, kit.paint.soft], 4, 512);
  const fx = new kit.SpriteBatch(low ? 700 : 1100, atlasTex, { cells: 4, additive: true, order: 6 });
  root.add(fx.mesh);
  const parts = new kit.Particles(low ? 380 : 620);
  const C = { glow: 0, ring: 1, spark: 2, note: 3, cross: 5, star: 6, puff: 7, soft: 8 };
  // Candles: altar (7) + candelabra stands down the aisle.
  const candles = [];
  for (let i = 0; i < 7; i++) candles.push({ x: -2.4 + i * 0.8, y: 3.05, z: END + 4, s: 0.5 });
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) for (let j = -1; j <= 1; j++) candles.push({ x: s * 2.2 + j * 0.3, y: 2.3 + (j === 0 ? 0.2 : 0), z: 8 - k * 5.6, s: 0.4 });
  const candb = new kit.Builder();
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { candb.cyl(0.05, 0.08, 2.0, 5, s * 2.2, 1, 8 - k * 5.6, 0xd4a548); candb.box(0.7, 0.05, 0.08, s * 2.2, 2.0, 8 - k * 5.6, 0xd4a548); }
  for (const c of candles) candb.cyl(0.05, 0.05, 0.3, 5, c.x, c.y - 0.18, c.z, 0xf0e8d0);
  root.add(new THREE.Mesh(candb.build(), vcol));
  const patches = [];
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) patches.push({ x: s * 6.2, z: 6.5 - k * 7, hue: (k * 0.17 + (s > 0 ? 0.5 : 0)) % 1 });

  // ── Lights ────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffe8c0, 0x4a3018, 1.5);
  const key = new THREE.DirectionalLight(0xffe0b0, 1.2); key.position.set(4, 18, 20);
  const altarL = new THREE.PointLight(0xffb060, 30, 30, 1.4); altarL.position.set(0, 5, END + 7);
  const bellL = new THREE.PointLight(0xfff0c0, 0, 50, 1.2); bellL.position.set(0, 14, -6);
  root.add(hemi, key, altarL, bellL);

  // ── State ─────────────────────────────────────────────────────────
  const st = {
    cheer: 0, flash: 0, bell: 0, gasp: 0, hold: 0, swell: 0, cross: 0, blazeAll: 0, organ: 0, candleFlare: 0, gutter: 0, lean: 0,
    roseSpin: kit.spring(), roseAng: 0, bloom: 0, combo: 0, chase: 0, wings: 0, arms: 0, storm: 0, lightning: 0, ltT: 3, over: false, dim: 1, dimT: 1, flock: 0,
  };
  const colSide = (c) => Math.sign(((c ?? 4.5) - 4.5) || 1);
  const glyphs = (n, side = 0, k = 1) => {
    for (let i = 0; i < n; i++) {
      const a = angels[Math.floor(Math.random() * AN)]; if (side && a.s !== side && Math.random() < 0.7) continue;
      const o = parts.spawn(a.x - a.s * 0.6, 7.8 + a.rise, a.z, [C.note, C.note + 1, C.cross, C.star][i % 4], 2.6 + Math.random());
      o.vx = -a.s * (0.3 + Math.random() * 0.5); o.vy = 1.4 + Math.random(); o.drag = 0.3; o.size = 0.8 + Math.random() * 0.4; o.wob = 0.4; o.r = 1; o.gg = 0.88; o.b = 0.5 * k + 0.2; o.rot = (Math.random() - 0.5) * 0.4;
    }
  };
  const bong = (k) => {
    for (const z of [-6, -6]) { const o = parts.spawn(0, 0.05, z, C.ring, 1.6); o.flat = 1; o.size = 2; o.grow = 9 * k; o.r = 1; o.gg = 0.85; o.b = 0.5; o.a = 0.7 * k; }
    const o = parts.spawn(0, 14, -12, C.ring, 1.2); o.size = 3; o.grow = 18 * k; o.r = 1; o.gg = 0.9; o.b = 0.6; o.a = 0.6 * k;
  };

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0;
    const ph = frac(beat), onBeat = Math.exp(-ph * 6), bp = Math.max(0, Math.sin(beat * TAU));
    const danger = clamp(((info.danger || 0) - 0.55) / 0.4, 0, 1);
    const ch = info.cheer || 0, fl = info.flash || 0, mv = info.move || 0;
    for (const k of ['flash', 'bell', 'blazeAll', 'organ', 'candleFlare', 'gutter']) st[k] = Math.max(0, st[k] - dt * (k === 'bell' ? 1.6 : k === 'flash' ? 2 : 1));
    st.cheer = Math.max(0, st.cheer - dt * 0.4); st.gasp = Math.max(0, st.gasp - dt * 0.9); st.hold = Math.max(0, st.hold - dt * 0.6);
    st.swell = Math.max(0, st.swell - dt * 0.8); st.cross = Math.max(0, st.cross - dt * 0.55); st.bloom = Math.max(0, st.bloom - dt * 0.35);
    st.wings = Math.max(0, st.wings - dt * 0.5); st.arms = Math.max(0, st.arms - dt * 0.5); st.lean *= Math.exp(-dt * 3); st.flock *= Math.exp(-dt * 1.5);
    st.lightning = Math.max(0, st.lightning - dt * 5);
    st.dim += (st.dimT - st.dim) * Math.min(1, dt * 1.2);
    const cheer = Math.max(st.cheer, ch), flash = Math.max(st.flash, fl * 0.7);
    st.chase += dt * (0.5 + 1.2 * st.combo);
    // Storm when the stack is high: lightning through the windows.
    if (danger > 0 && !st.over) { st.ltT -= dt * (0.5 + 2 * danger); if (st.ltT < 0) { st.ltT = 1 + Math.random() * 2; st.lightning = 1; } }
    const lt = st.lightning > 0 && Math.random() < 0.8 ? st.lightning : 0;
    const roseSpin = kit.stepSpring(st.roseSpin, dt, 0.5, 0.3);
    st.roseAng += dt * (0.02 + 0.5 * st.bloom);
    rose.rotation.z = st.roseAng + roseSpin;
    const D = st.dim;

    // Windows: glow with the music; ripple on moves; chase on combos; blaze on clears; storm flashes.
    const winBase = (0.5 + 0.2 * bp + 0.4 * cheer + 0.3 * st.swell) * D;
    for (const L of lancets) {
      L.ripple = Math.max(0, L.ripple - dt * 2.5);
      const chase = st.combo >= 2 ? 0.6 * Math.max(0, Math.sin(st.chase * 3 - L.k * 1.1)) : 0;
      const k = winBase + L.ripple + st.blazeAll + chase + 1.5 * lt;
      if (danger > 0) col.setRGB(0.7 + 0.3 * k, 0.75 + 0.2 * k, 1).multiplyScalar(k * (1 - 0.3 * danger) + 0.0);
      else col.setScalar(k);
      L.mat.color.copy(col);
    }
    shafts.forEach((s, i) => { const L = lancets[i]; s.mat.uniforms.uK.value = (0.04 + 0.03 * bp + 0.05 * cheer + 0.04 * L.ripple + 0.06 * st.blazeAll + 0.2 * lt) * D; s.mat.uniforms.uCol.value.setRGB(1, 0.85 - 0.2 * danger, 0.6 + 0.3 * danger); });
    roseMat.color.setScalar((0.75 + 0.25 * bp + 0.5 * cheer + 0.8 * st.bloom + 0.4 * st.swell + 0.8 * lt) * D);
    rays.forEach((r, i) => {
      r.m.material.uniforms.uK.value = (0.09 + 0.04 * bp + 0.08 * cheer + 0.1 * st.swell + 0.12 * st.bloom + 0.08 * flash) * D * (st.over ? (i === 2 ? 2 : 0) : 1);
      r.m.rotation.z = -r.a * 1.2 + Math.sin(t * 0.3 + r.ph) * 0.03;
    });
    // Organ pipes: breathe; swell on soft drops; blast on 3+.
    for (let i = 0; i < PIPES; i++) {
      const p = pipeInfo[i], j = i % (PIPES / 2);
      const wave = st.organ * Math.max(0, Math.sin(t * 8 - j * 0.6)) + 0.4 * st.swell;
      pipeHot[i] = wave;
      dummy.position.set(p.x, 3 + p.h * (1 + 0.08 * wave) / 2, END + 1.2); dummy.scale.set(1, p.h * (1 + 0.08 * wave), 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      pipeMesh.setMatrixAt(i, dummy.matrix); pipeMesh.setColorAt(i, col.setScalar(1 + 1.2 * wave));
    }
    pipeMesh.instanceMatrix.needsUpdate = pipeMesh.instanceColor.needsUpdate = true;

    fx.begin();
    // Floor light patches under the windows.
    for (const p of patches) { col.setHSL(p.hue, 0.8, 0.6); const k = (0.3 + 0.15 * bp + 0.3 * cheer + 0.4 * st.blazeAll + 0.3 * lancets[patches.indexOf(p)].ripple) * D; fx.add(p.x + Math.sin(beat * Math.PI + p.hue * 9) * 0.2, 0.03, p.z, 5 + 0.6 * bp, 0, C.glow, col.r, col.g, col.b, k, 0.55, 1); }
    // Candles: flicker, lean on moves, flare on clears, gutter on drops, snuffed on game over.
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (st.over) continue;
      const fk = 1 + Math.sin(t * 12 + i * 1.7) * 0.15, h = c.s * fk * (1 + 0.8 * st.candleFlare + 0.4 * cheer) * (1 - 0.6 * st.gutter);
      fx.add(c.x + st.lean * 0.08, c.y + h * 0.4, c.z, h * 0.9, -st.lean * 0.3, C.glow, 1, 0.75, 0.35, 0.9 * D, 1.8);
      fx.add(c.x, c.y + h * 0.3, c.z, h * 2.5, 0, C.glow, 1, 0.6, 0.2, 0.18 * D);
    }
    altarL.intensity = 30 * D * (st.over ? 0.15 : 1) * (1 + 0.5 * st.candleFlare + 0.3 * cheer);
    // Golden sparks drifting up.
    if (Math.random() < dt * (6 + 30 * cheer)) { const o = parts.spawn((Math.random() - 0.5) * 26, 0.5, 8 - Math.random() * 40, C.glow, 4); o.vy = 1 + Math.random(); o.wob = 0.5; o.size = 0.12; o.r = 1; o.gg = 0.85; o.b = 0.5; }
    if (st.swell > 0.05 && Math.random() < dt * 10) { const o = parts.spawn((Math.random() - 0.5) * 3, 3, END + 6, C.puff, 3); o.vy = 0.8; o.grow = 0.8; o.size = 1.2; o.r = 0.4; o.gg = 0.35; o.b = 0.3; o.a = 0.5; }

    // Angels: sway, wings beat (spread wide on Tetris), rise on hold, halos, gasp, notes.
    const singing = st.gasp < 0.2 && !st.over;
    for (let i = 0; i < AN; i++) {
      const a = angels[i];
      a.rise += ((st.hold > 0 ? 0.9 : 0) - a.rise) * Math.min(1, dt * 3);
      const bob = Math.sin(beat * Math.PI * 0.5 + a.ph) * 0.08 + a.rise;
      const y = 5.45 + bob;   // loft floor
      dummy.position.set(a.x, y, a.z); dummy.rotation.set(0, -a.s * Math.PI / 2 + Math.sin(t * 0.7 + a.ph) * 0.15, Math.sin(beat * Math.PI + a.ph) * 0.05); dummy.scale.setScalar(AS); dummy.updateMatrix();
      angelMesh.setMatrixAt(i, dummy.matrix);
      const flap = 0.5 + 0.5 * Math.sin(beat * Math.PI + a.ph) , spread = Math.max(st.wings, st.hold * 0.8);
      for (const w of [-1, 1]) {
        dummy.position.set(a.x + a.s * 0.3 * AS, y + 1.1 * AS, a.z + w * 0.1);
        dummy.rotation.set(0, -a.s * Math.PI / 2 + w * (0.9 - 0.7 * spread - 0.3 * flap) + (w < 0 ? Math.PI : 0), 0.2 + 0.3 * flap);
        dummy.scale.set(w * AS, AS, AS); dummy.updateMatrix(); wingMesh.setMatrixAt(i * 2 + (w > 0 ? 1 : 0), dummy.matrix);
      }
      const halo = (0.45 + 0.25 * onBeat + 0.5 * cheer + 0.9 * st.hold) * (1 - 0.8 * st.gasp) * D * (st.over ? 0.3 : 1);
      col.setHSL(a.hue, 0.5, 0.75);
      fx.add(a.x, y + 2.05 * AS, a.z, 0.75 * AS, 0, C.ring, col.r, col.g, col.b, halo, 0.35);
      fx.add(a.x, y + 1.2 * AS, a.z, 2.2 + 1.2 * st.hold, 0, C.glow, 1, 0.8, 0.45, 0.08 * halo + 0.1 * st.hold);
      if (singing && Math.random() < dt * (0.25 + 0.8 * cheer + 1.5 * st.hold)) { const o = parts.spawn(a.x - a.s * 0.4, y + 1.9 * AS, a.z, C.note + (i & 1), 2.4); o.vy = 1.1; o.vx = -a.s * 0.4; o.size = 0.6; o.wob = 0.3; col.setHSL(a.hue, 0.8, 0.75); o.r = col.r; o.gg = col.g; o.b = col.b; }
    }
    angelMesh.instanceMatrix.needsUpdate = wingMesh.instanceMatrix.needsUpdate = true;
    angelMat.emissive.setRGB(0.16 + 0.25 * st.hold + 0.15 * cheer, 0.12 + 0.2 * st.hold + 0.1 * cheer, 0.06);
    // Congregation: bob on the half-beat, alternate hands raised on clears.
    const raise = Math.max(st.arms, cheer > 0.4 ? cheer * 0.8 : 0);
    for (let i = 0; i < WN; i++) {
      const w = wor[i], bob = Math.sin(beat * Math.PI + w.ph) * 0.03 * (st.over ? 0.2 : 1);
      dummy.position.set(w.x, bob, w.z); dummy.rotation.set(0, Math.PI, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); worMesh.setMatrixAt(i, dummy.matrix);
      const up = (w.alt === (Math.floor(beat) & 1) ? 1 : 0.6) * raise;
      dummy.position.set(w.x, bob + 1.45, w.z); dummy.rotation.set(Math.PI - up * 2.6 + 0.1 * Math.sin(t * 4 + w.ph) * up, Math.PI, 0); dummy.updateMatrix(); handMesh.setMatrixAt(i, dummy.matrix);
    }
    worMesh.instanceMatrix.needsUpdate = handMesh.instanceMatrix.needsUpdate = true;
    for (const d of deacons) {
      const up = Math.max(raise, st.hold * 0.5);
      d.arms.forEach((p, k) => { p.rotation.z = (k ? 1 : -1) * (0.15 + up * 2.4 + 0.1 * Math.sin(beat * Math.PI)); });
      d.g.rotation.z = Math.sin(beat * Math.PI + d.s) * 0.04;
    }

    // Chandeliers: pendulum SHM (hard drops kick them), twirl on rotations.
    for (const c of chand) {
      c.vel += (-3.2 * c.ang - 0.25 * c.vel) * dt; c.ang += c.vel * dt;
      c.velZ += (-3.2 * c.angZ - 0.25 * c.velZ) * dt; c.angZ += c.velZ * dt;
      c.spin *= Math.exp(-dt * 0.8);
      c.g.rotation.set(c.ang, c.g.rotation.y + c.spin * dt, c.angZ);
      // Candle glows on the ring (follow the swing).
      const bx = c.x + Math.sin(c.angZ) * -7, bz = c.z + Math.sin(c.ang) * 7, by = c.g.position.y - 6.6;
      if (!st.over) fx.add(bx, by, bz, 3.2 + cheer, 0, C.glow, 1, 0.72, 0.35, (0.5 + 0.2 * onBeat) * D);
    }
    // Doves circling under the vault; drops scatter them; moves wheel the flock.
    for (let i = 0; i < DN; i++) {
      const d = doves[i];
      d.a += dt * (d.sp + st.flock * 1.5) * (1 + d.scared * 2);
      d.scared *= Math.exp(-dt * 1.2); d.vy *= Math.exp(-dt * 2); d.y += d.vy * dt; d.y += (16 - d.y) * dt * 0.3;
      d.flap += dt * (10 + 14 * d.scared);
      const x = Math.cos(d.a) * d.r * 1.3, z = d.cz + Math.sin(d.a) * d.r, yaw = -d.a - Math.PI / 2 * Math.sign(d.sp + st.flock);
      dummy.position.set(x, d.y, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(1, 0.8, 1.6); dummy.updateMatrix(); doveBody.setMatrixAt(i, dummy.matrix);
      const fa = Math.sin(d.flap) * 0.8;
      for (const w of [-1, 1]) {
        dummy.position.set(x, d.y + 0.05, z); dummy.rotation.set(0, yaw, w * fa); dummy.translateX(w * 0.3); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        doveWing.setMatrixAt(i * 2 + (w > 0 ? 1 : 0), dummy.matrix);
      }
    }
    doveBody.instanceMatrix.needsUpdate = doveWing.instanceMatrix.needsUpdate = true;

    // Descending cross of light (Tetris).
    crossV.visible = crossH.visible = st.cross > 0.01;
    if (crossV.visible) { const u = 1 - st.cross; crossV.position.y = 15 + 10 * Math.max(0, 1 - u * 4); crossH.position.y = 12 + 10 * Math.max(0, 1 - u * 4); crossMat.uniforms.uK.value = Math.min(1, st.cross * 1.6) * 0.9; }

    parts.step(dt, [fx]);
    fx.end();
    bellL.intensity = 80 * st.bell + 120 * lt;
    hemi.intensity = (1.5 + 0.3 * cheer + 0.4 * st.bell) * D * (st.over ? 0.5 : 1);
    hemi.color.setRGB(1, 0.91 - 0.15 * danger, 0.75 + 0.25 * danger);
    key.intensity = 1.2 * D * (1 + 0.5 * flash);

    // Camera: down the nave, slow drift; a soft bump on the bell.
    const aspect = camera.aspect || 1.6, fr = kit.framing(aspect);
    const bump = st.bell * 0.15 * Math.sin(t * 40);
    if (fr.portrait) {
      camera.fov = 78;
      camera.position.set(Math.sin(t * 0.1) * 0.5, 4.5 + bump, 17);
      camera.lookAt(0, 8, -20);
    } else {
      camera.fov = 58 + 2 * flash;
      camera.position.set(Math.sin(t * 0.1) * 1.0, 4.4 + Math.sin(t * 0.15) * 0.3 + bump, 15 + Math.sin(t * 0.07) * 0.6);
      camera.lookAt(Math.sin(t * 0.1) * 0.5, 7.2, -20);
    }
    camera.rotateZ(Math.sin(t * 0.12) * 0.008);
    camera.updateProjectionMatrix();
  }

  function react(kind, d = {}) {
    if (st.over && kind !== 'start') return;
    const side = colSide(d.col);
    switch (kind) {
      case 'move': {
        const dir = d.dir || 0;
        st.flock += dir * 0.8; st.lean += dir;
        for (const L of lancets) if (L.s === side) L.ripple = Math.max(L.ripple, 0.9 * Math.exp(-L.k * 0.3));
        break;
      }
      case 'rotate':
        for (const c of chand) c.spin += (d.dir || 1) * 2.2;
        st.roseSpin.v += (d.dir || 1) * 0.6;
        for (let i = 0; i < 3; i++) { const a = angels[Math.floor(Math.random() * AN)]; const o = parts.spawn(a.x - a.s * 0.5, 7.6, a.z, C.spark, 0.8); o.size = 0.8; o.vr = 3; o.r = 1; o.gg = 0.95; o.b = 0.7; }
        break;
      case 'soft':
        st.swell = Math.min(1, st.swell + 0.3);
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.3 + r / 14);
        st.bell = Math.max(st.bell, k); st.gasp = Math.max(st.gasp, 0.4 + 0.6 * k); st.gutter = k; bong(k);
        for (const c of chand) { c.vel += (Math.random() - 0.5) * 0.9 * k; c.velZ += (Math.random() - 0.5) * 0.9 * k; }
        if (r >= 4) for (const dv of doves) { dv.scared = Math.max(dv.scared, k); dv.vy = (Math.random() - 0.3) * 6 * k; }
        break;
      }
      case 'hold':
        st.hold = 1.4; st.gasp = 0;
        break;
      case 'clear': {
        const n = clamp(d.lines || 1, 1, 4), combo = d.combo || 0;
        st.combo = combo; st.cheer = Math.min(1.2, st.cheer + 0.28 * n + 0.05 * combo); st.arms = Math.min(1, 0.5 + 0.18 * n);
        glyphs(5 * n + 3 * Math.min(combo, 6), 0, 1);
        if (n >= 2) st.blazeAll = 0.9;
        if (n >= 3) { st.organ = 1.2; st.candleFlare = 1; }
        if (n >= 4) { st.cross = 1; st.wings = 1.2; st.flash = 1; st.blazeAll = 1.4; for (const dv of doves) { dv.scared = 0.6; dv.vy = 3; } glyphs(16, 0, 1); }
        break;
      }
      case 'levelUp':
        st.bloom = 1.2; st.roseSpin.v += 1.5; st.cheer = 1;
        for (let i = 0; i < 60; i++) { const o = parts.spawn((Math.random() - 0.5) * 3, 3, END + 6, i % 3 ? C.glow : C.spark, 2.2); o.vx = (Math.random() - 0.5) * 6; o.vy = 7 + Math.random() * 5; o.vz = Math.random() * 6; o.g = 5; o.size = 0.35; o.r = 1; o.gg = 0.85; o.b = 0.45; }
        glyphs(14);
        break;
      case 'gameOver':
        st.over = true; st.dimT = 0.45; st.hold = 0; st.cross = 0;
        break;
      case 'start':
        st.over = false; st.dimT = 1; st.dim = 0.3; st.combo = 0;
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      for (const m of [pewMesh, worMesh, handMesh, pipeMesh, angelMesh, wingMesh, doveBody, doveWing]) m.dispose();
      kit.dispose();
    },
  };
}
