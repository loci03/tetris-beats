// TRUMPETS PLEASE — the Tetris world: a Hollywood movie premiere at night.
//
// The old 2D scene: a velvet jazz-club stage under a midnight sky with the
// Hollywood Hills + sign, six klieg searchlights sweeping (faster on every
// move, wider and brighter on clears), a two-row marquee bulb chaser, the
// neon "★ Trumpets, Please ★" sign that flickered on hard drops, film
// cameras on tripods with red tally lights, an Oscar statue, gold confetti
// + ticker tape (heavier on clears / drops), smoke rings drifting up on
// every move, an audience bobbing (arms up on clears), a band silhouette
// (bass, drums, sax — the sax bell lifting on clears), paparazzi flashes on
// hard drops and big clears, and "BRAVO!"-style text on a Tetris.
//
// In 3D: the red carpet runs up to a movie palace with a bulb-chased
// marquee and the neon sign; the hills and the HOLLYWOOD letters glow
// behind; klieg lights on trucks rake the sky; paparazzi crowd the velvet
// ropes, flashes popping; the house band swings on a bandstand stage-left,
// a giant golden statuette shines stage-right; film cameras roll.
//   move     → kliegs lurch that way, a paparazzo pops a flash on the piece's side, the sax puffs a smoke ring,
//              the marquee chaser steps
//   rotate   → kliegs scissor (swing spring), the drummer crashes the cymbal, the chaser reverses
//   soft     → drum roll: the drummer rattles, the chaser races, the camera tally lights blink fast
//   drop     → neon sign flickers (∝ rows), a burst of paparazzi flashes (∝ rows), bass-drum thump + shake,
//              ticker tape shower
//   hold     → spotlight solo: kliegs converge on the bandstand, the sax player leans back, bell up, notes
//   clear n  → confetti (∝ n) + crowd arms up + flashes; 2 = every bulb blazes; 3 = kliegs converge overhead;
//              4 = TETRIS: "BRAVO!"-style banner over the marquee, fireworks over the hills, klieg strobe
//   combo    → gel colours on the kliegs cycle faster, more flashes, fireworks escalate
//   levelUp  → the HOLLYWOOD sign chases letter by letter + fireworks + a bulb wave
//   danger   → kliegs go red, the marquee stutters, the crowd gets restless
//   gameOver → lights out: one klieg left on the empty carpet, neon dies
//   start    → lights pop on in sequence

import { createKit, frac, clamp, lerp } from '../violins/tetris-kit.js';

const TAU = Math.PI * 2;
const PHRASES = ['BRAVO!', 'ENCORE!', 'MAGNIFICENT!', 'LIGHTS! CAMERA!', 'ACTION!', 'AND THE WINNER IS...'];

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const kit = createKit(THREE);
  const { keep } = kit;
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0x05020e, 40, 170);
  scene.background = new THREE.Color(0x04010c);
  camera.far = 420; camera.updateProjectionMatrix();
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const lam = (c, e = 0x000000, extra) => keep(new THREE.MeshLambertMaterial({ color: c, emissive: e, ...extra }));
  const basic = (c, extra) => keep(new THREE.MeshBasicMaterial({ color: c, ...extra }));
  const vcol = lam(0xffffff, 0x000000, { vertexColors: true });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  // ── Sky: midnight navy, gold stars ─────────────────────────────────
  const skyU = { uTime: { value: 0 }, uFlash: { value: 0 }, uDanger: { value: 0 }, uDim: { value: 1 } };
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(320, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uTime, uFlash, uDanger, uDim;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        float h = vP.y;
        vec3 c = mix(vec3(0.09, 0.04, 0.16), vec3(0.012, 0.006, 0.04), smoothstep(-0.02, 0.5, h));
        c = mix(c, vec3(0.2, 0.03, 0.05), uDanger * smoothstep(0.4, 0.0, h));
        vec2 g = floor(vec2(atan(vP.x, vP.z) * 160.0, h * 160.0));
        float s = step(0.986, hash(g)) * smoothstep(0.06, 0.3, h);
        c += vec3(1.0, 0.87, 0.47) * s * (0.45 + 0.55 * sin(uTime * 1.9 + hash(g + 3.0) * 40.0));
        c += vec3(0.25, 0.22, 0.35) * uFlash * smoothstep(0.6, 0.0, h);
        gl_FragColor = vec4(c * uDim, 1.0);
      }`,
  })));
  sky.renderOrder = -10; root.add(sky);

  // Hollywood Hills (ring texture) + the HOLLYWOOD letters (instanced, per-letter light).
  const hillTex = kit.canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#070312'; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, h * 0.45 - 14 * Math.sin(x * 0.012 + 0.5) - 8 * Math.sin(x * 0.037) - 4 * Math.sin(x * 0.09));
    g.lineTo(w, h); g.fill();
    for (let i = 0; i < 90; i++) { g.fillStyle = i % 4 ? 'rgba(255,200,110,0.7)' : 'rgba(180,210,255,0.8)'; g.fillRect((i * 83.7) % w, h * 0.72 + (i * 31 % 16), 1.2, 1.2); }
  });
  hillTex.wrapS = THREE.RepeatWrapping; hillTex.repeat.set(3, 1);
  const hills = new THREE.Mesh(keep(new THREE.CylinderGeometry(200, 200, 40, 48, 1, true)), keep(new THREE.MeshBasicMaterial({ map: hillTex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false })));
  hills.position.y = 8; hills.renderOrder = -9; root.add(hills);
  const LETTERS = 'HOLLYWOOD';
  const letterTex = kit.canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 54px "Arial Black", Impact, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
    for (let i = 0; i < 9; i++) g.fillText(LETTERS[i], (i + 0.5) * w / 9, h / 2 + 3);
  });
  const letterGeo = keep(new THREE.PlaneGeometry(1, 1.1));
  const letterMat = keep(new THREE.ShaderMaterial({
    uniforms: { uMap: { value: letterTex } }, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'attribute float aI; attribute vec3 aC; varying vec2 vUv; varying vec3 vC; void main(){ vUv = vec2((aI + uv.x) / 9.0, uv.y); vC = aC; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D uMap; varying vec2 vUv; varying vec3 vC; void main(){ float a = texture2D(uMap, vUv).a; if (a < 0.05) discard; gl_FragColor = vec4(vC, a); }',
  }));
  const letterAI = new Float32Array(9), letterAC = new Float32Array(27);
  letterGeo.setAttribute('aI', new THREE.InstancedBufferAttribute(letterAI, 1));
  const letterCAttr = new THREE.InstancedBufferAttribute(letterAC, 3).setUsage(THREE.DynamicDrawUsage);
  letterGeo.setAttribute('aC', letterCAttr);
  const letters = new THREE.InstancedMesh(letterGeo, letterMat, 9);
  for (let i = 0; i < 9; i++) {
    letterAI[i] = i;
    dummy.position.set(53 + i * 5.2, 14 + i * 0.7 + Math.sin(i * 0.9) * 0.5, -112 + i * 1.6); dummy.rotation.set(0, -0.4, 0); dummy.scale.set(4.8, 4.8, 1); dummy.updateMatrix(); letters.setMatrixAt(i, dummy.matrix);   // on the hillside, right of the palace
  }
  letters.renderOrder = -8; letters.frustumCulled = false; root.add(letters);

  // ── Ground: terrazzo plaza with Walk-of-Fame stars + the red carpet ──
  const plazaTex = kit.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1a1420'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${120 + (i * 37) % 80},${100 + (i * 13) % 60},${110 + (i * 7) % 60},0.25)`; g.fillRect((i * 53.3) % w, (i * 97.1) % h, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2); g.fillStyle = '#7a2a3c'; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 34 : 86, a = i / 10 * TAU - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.strokeStyle = '#d4a548'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#d4a548'; g.beginPath(); g.arc(0, 4, 16, 0, TAU); g.fill(); g.restore();
  });
  plazaTex.wrapS = plazaTex.wrapT = THREE.RepeatWrapping; plazaTex.repeat.set(30, 30); plazaTex.anisotropy = 4;
  const plaza = add(keep(new THREE.PlaneGeometry(200, 200)), lam(0xb0a8b8, 0x000000, { map: plazaTex }), 0, 0, -60);
  plaza.rotation.x = -Math.PI / 2;
  const carpetMat = lam(0xc0102a, 0x300008);
  const carpet = add(keep(new THREE.PlaneGeometry(6, 46)), carpetMat, 0, 0.02, -10);
  carpet.rotation.x = -Math.PI / 2;
  for (const sx of [-1, 1]) { const tr = add(keep(new THREE.PlaneGeometry(0.18, 46)), basic(0xd4a548), sx * 3.05, 0.025, -10); tr.rotation.x = -Math.PI / 2; }

  // ── The movie palace ──────────────────────────────────────────────
  const pb = new kit.Builder();
  pb.box(44, 20, 6, 0, 10, -36, 0x2a1830);                // façade
  pb.box(14, 6, 5, 0, 23, -36.5, 0x2a1830); pb.box(15, 0.8, 5.6, 0, 26.2, -36.3, 0x8a6a2a);   // crown
  pb.box(16, 10, 1, 0, 5, -32.6, 0x100608);               // lobby opening
  for (let k = -2; k <= 2; k++) pb.box(1.2, 14, 1.2, k * 9.5, 7, -32.4, 0x6a4a2a);
  pb.box(45, 1.2, 7, 0, 20.4, -35.5, 0x8a6a2a);           // cornice
  pb.box(30, 3.2, 6, 0, 10.2, -30, 0x1a0c10);             // marquee canopy
  pb.box(30.4, 0.3, 6.2, 0, 8.5, -30, 0xd4a548); pb.box(30.4, 0.3, 6.2, 0, 11.9, -30, 0xd4a548);
  for (let k = -2; k <= 2; k += 4) pb.box(1, 6, 0.2, k * 9.5, 16.5, -32.8, 0x3a2440);   // pilaster strips
  pb.box(2.4, 16, 0.8, -19, 15, -32, 0x1a0c10); pb.box(2.4, 16, 0.8, 19, 15, -32, 0x1a0c10);  // blade signs
  root.add(new THREE.Mesh(pb.build(), vcol));
  // Lobby glow + blade sign letters + neon sign (canvas textures).
  const lobbyMat = basic(0xffc070, { fog: false });
  add(keep(new THREE.PlaneGeometry(15, 9)), lobbyMat, 0, 4.6, -32.5);
  const neonTex = kit.canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'italic 900 50px Georgia, "Times New Roman", serif';
    g.shadowColor = 'rgba(255,215,40,1)'; g.shadowBlur = 16; g.fillStyle = '#ffe040'; g.strokeStyle = '#fff6c0'; g.lineWidth = 2;
    g.strokeText('★ Trumpets, Please ★', w / 2, h / 2);
    g.fillText('★ Trumpets, Please ★', w / 2, h / 2); g.shadowBlur = 4; g.fillText('★ Trumpets, Please ★', w / 2, h / 2);
  });
  const neonMat = basic(0xffffff, { map: neonTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  neonMat.blending = THREE.CustomBlending; neonMat.blendSrc = THREE.OneFactor; neonMat.blendDst = THREE.OneFactor;
  const neon = add(keep(new THREE.PlaneGeometry(24, 4.5)), neonMat, 0, 15.2, -32.4);
  const bladeTex = kit.canvasTex(64, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10; g.font = '900 52px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    'JAZZ'.split('').forEach((ch, i) => g.fillText(ch, w / 2, 60 + i * 120));
  });
  const bladeMat = basic(0xff3d9a, { map: bladeTex, transparent: true, depthWrite: false, fog: false });
  bladeMat.blending = THREE.CustomBlending; bladeMat.blendSrc = THREE.OneFactor; bladeMat.blendDst = THREE.OneFactor;
  add(keep(new THREE.PlaneGeometry(1.9, 14)), bladeMat, -19, 15, -31.5); add(keep(new THREE.PlaneGeometry(1.9, 14)), bladeMat, 19, 15, -31.5);
  // Marquee bulbs: 3 rows round the canopy front (instanced, chaser colours).
  const BULB_ROW = low ? 34 : 48, bulbs = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < BULB_ROW; i++) bulbs.push({ x: -14.6 + 29.2 * i / (BULB_ROW - 1), y: [8.3, 12.1, 19.6][r], z: r === 2 ? -32.7 : -26.85, r, i });
  for (let i = 0; i < 16; i++) { bulbs.push({ x: -20.4, y: 7.5 + i, z: -31.5, r: 3, i }); bulbs.push({ x: 20.4, y: 7.5 + i, z: -31.5, r: 3, i }); }
  const BN = bulbs.length;
  const bulbMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.17, 8, 6)), basic(0xffffff, { fog: false }), BN);
  bulbs.forEach((b, i) => { dummy.position.set(b.x, b.y, b.z); dummy.scale.setScalar(1); dummy.updateMatrix(); bulbMesh.setMatrixAt(i, dummy.matrix); bulbMesh.setColorAt(i, col.set(0xffd27a)); });
  root.add(bulbMesh);

  // ── Velvet ropes + stanchions along the carpet ────────────────────
  const rb = new kit.Builder();
  for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) {
    const z = 8 - k * 4.5, x = sx * 3.6;
    rb.cyl(0.07, 0.09, 1.1, 8, x, 0.55, z, 0xd4a548); rb.sph(0.12, x, 1.15, z, 0xffd27a); rb.cyl(0.25, 0.28, 0.08, 10, x, 0.04, z, 0xd4a548);
    if (k < 8) for (let s = 0; s < 6; s++) { const u = (s + 0.5) / 6; rb.cyl(0.05, 0.05, 0.8, 5, x, 1.05 - 0.28 * Math.sin(Math.PI * u), z - 4.5 * u, 0x8a0a20, Math.PI / 2 + (u - 0.5) * 0.5, 0, 0); }
  }
  root.add(new THREE.Mesh(rb.build(), vcol));

  // ── Paparazzi + fans behind the ropes (instanced) ─────────────────
  const fb = new kit.Builder();
  fb.cyl(0.26, 0.2, 0.9, 7, 0, 1.25, 0, 0xffffff); fb.sph(0.18, 0, 1.92, 0, 0xffe0c0); fb.cyl(0.12, 0.1, 0.8, 6, -0.1, 0.4, 0, 0x202028); fb.cyl(0.12, 0.1, 0.8, 6, 0.1, 0.4, 0, 0x202028);
  const fanGeo = fb.build();
  const ab = new kit.Builder();      // arms holding a camera up (pivot at shoulder)
  ab.cyl(0.06, 0.06, 0.6, 5, -0.2, 0.3, 0, 0xffe0c0); ab.cyl(0.06, 0.06, 0.6, 5, 0.2, 0.3, 0, 0xffe0c0);
  ab.box(0.34, 0.22, 0.2, 0, 0.66, 0.05, 0x111111); ab.cyl(0.07, 0.07, 0.18, 8, 0, 0.66, 0.2, 0x333333, Math.PI / 2);
  const armGeo = ab.build();
  const FANS = low ? 36 : 56, fans = [];
  const suits = [0x1a1a24, 0x3a2a4a, 0x7a1020, 0x204060, 0x2a2a2a, 0x5a4a20, 0x101018];
  for (let i = 0; i < FANS; i++) {
    const side = i % 2 ? 1 : -1, row = (i >> 1) % 3, k = i >> 1;
    fans.push({ x: side * (4.5 + row * 1.0 + Math.random() * 0.4), z: 8 - (k / (FANS / 2)) * 34 + Math.random() * 0.8, side, ph: Math.random() * TAU, hype: 0.6 + Math.random() * 0.6, pap: Math.random() < 0.55, arms: 0, flash: 0 });
  }
  const fanMesh = new THREE.InstancedMesh(fanGeo, vcol, FANS), armMesh = new THREE.InstancedMesh(armGeo, vcol, FANS);
  fans.forEach((f, i) => { fanMesh.setColorAt(i, col.set(suits[i % suits.length]).multiplyScalar(1.4)); armMesh.setColorAt(i, col.set(0xffffff)); });
  for (const m of [fanMesh, armMesh]) { m.frustumCulled = false; root.add(m); }

  // ── Film cameras on tripods ───────────────────────────────────────
  const cb = new kit.Builder();
  for (const a of [0, 2.1, 4.2]) cb.cyl(0.04, 0.04, 2.0, 4, Math.sin(a) * 0.35, 0.95, Math.cos(a) * 0.35, 0x222222, Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
  cb.box(0.7, 0.5, 1.0, 0, 2.1, 0, 0x151515); cb.cyl(0.18, 0.22, 0.5, 10, 0, 2.1, -0.7, 0x222222, Math.PI / 2);
  cb.cyl(0.32, 0.32, 0.08, 12, 0, 2.6, 0.15, 0x111111, 0, 0, Math.PI / 2); cb.cyl(0.32, 0.32, 0.08, 12, 0, 2.6, -0.45, 0x111111, 0, 0, Math.PI / 2);
  const camGeo = cb.build();
  const CAMS = [[-7.5, 3, 0.6], [7.8, 1, -0.6], [-12, -10, 0.4], [12.5, -12, -0.4]];
  for (const [x, z, ry] of CAMS) { const m = add(camGeo, vcol, x, 0, z); m.rotation.y = ry + Math.PI; }

  // ── Bandstand stage-left: bass, drums, sax ────────────────────────
  const BX = -16, BZ = -9;
  const bs = new kit.Builder();
  bs.cyl(5.2, 5.4, 0.8, 24, BX, 0.4, BZ, 0x2a0a14); bs.cyl(5.25, 5.25, 0.12, 24, BX, 0.82, BZ, 0xd4a548);
  bs.add(new THREE.TorusGeometry(5.0, 0.18, 6, 24, Math.PI), bs.m4(BX, 0.8, BZ - 0.6, 0, 0, 0, 1, 1.2, 1), 0xd4a548);  // shell arch
  for (let k = 0; k < 4; k++) bs.add(new THREE.TorusGeometry(4.4 - k * 0.9, 0.12, 5, 22, Math.PI), bs.m4(BX, 0.8, BZ - 0.8 - k * 0.1, 0, 0, 0, 1, 1.2, 1), 0x8a5a20);
  // drum kit
  const DX = BX, DZ = BZ - 1.4;
  bs.cyl(0.75, 0.75, 0.6, 14, DX, 1.75, DZ + 0.6, 0x7a1020, Math.PI / 2); bs.cyl(0.35, 0.35, 0.3, 10, DX - 0.9, 1.9, DZ + 0.2, 0xe0e0e0);
  bs.cyl(0.4, 0.4, 0.4, 10, DX + 0.9, 1.7, DZ + 0.2, 0x7a1020); bs.cyl(0.02, 0.02, 1.4, 4, DX + 1.3, 1.6, DZ, 0x888888);
  bs.cyl(0.18, 0.2, 0.8, 7, DX, 1.6, DZ - 0.3, 0x111118); bs.sph(0.2, DX, 2.2, DZ - 0.3, 0x5a3a28);  // drummer seated
  // bassist + bass
  const BAX = BX - 2.6, BAZ = BZ;
  bs.cyl(0.24, 0.18, 1.0, 7, BAX, 1.95, BAZ, 0x111118); bs.cyl(0.08, 0.08, 1.1, 5, BAX - 0.1, 1.2, BAZ, 0x111118); bs.cyl(0.08, 0.08, 1.1, 5, BAX + 0.1, 1.2, BAZ, 0x111118);
  bs.sph(0.19, BAX, 2.65, BAZ, 0x6a4430);
  bs.sph(0.5, BAX + 0.55, 1.6, BAZ + 0.2, 0x7a3a12, 0.9, 1.4, 0.4); bs.box(0.08, 1.8, 0.08, BAX + 0.55, 2.8, BAZ + 0.2, 0x1a0c04);
  root.add(new THREE.Mesh(bs.build(), vcol));
  // Sax player (moving: leans back + bell lifts) and drum sticks + cymbal.
  const sax = new THREE.Group(); sax.position.set(BX + 2.6, 0.82, BZ + 0.2); root.add(sax);
  const sxb = new kit.Builder();
  sxb.cyl(0.08, 0.08, 1.1, 5, -0.1, 0.55, 0, 0x111118); sxb.cyl(0.08, 0.08, 1.1, 5, 0.1, 0.55, 0, 0x111118);
  root.add(sax);
  const saxLegs = new THREE.Mesh(sxb.build(), vcol); sax.add(saxLegs);
  const saxTop = new THREE.Group(); saxTop.position.y = 1.1; sax.add(saxTop);
  const stb = new kit.Builder();
  stb.cyl(0.25, 0.18, 1.0, 7, 0, 0.5, 0, 0x2a1a3a); stb.sph(0.19, 0, 1.2, 0, 0x5a3a28); stb.cyl(0.21, 0.21, 0.12, 10, 0, 1.36, 0, 0x111111); stb.cyl(0.13, 0.15, 0.2, 10, 0, 1.46, 0, 0x111111);
  stb.cyl(0.05, 0.05, 0.6, 5, -0.2, 0.75, 0.2, 0x2a1a3a, 0.9, 0, 0.3); stb.cyl(0.05, 0.05, 0.6, 5, 0.2, 0.6, 0.25, 0x2a1a3a, 0.9, 0, -0.3);
  saxTop.add(new THREE.Mesh(stb.build(), vcol));
  const horn = new kit.Builder();     // saxophone: neck, body, curve, bell
  horn.cyl(0.03, 0.03, 0.35, 5, 0, 1.05, 0.3, 0xffcc44, 0.8); horn.cyl(0.06, 0.09, 0.9, 8, 0.05, 0.55, 0.42, 0xffcc44, -0.15);
  horn.add(new THREE.TorusGeometry(0.14, 0.08, 6, 10, Math.PI), horn.m4(0.1, 0.1, 0.42, 0, Math.PI / 2, Math.PI), 0xffcc44);
  horn.cyl(0.11, 0.2, 0.35, 10, 0.24, 0.32, 0.42, 0xffcc44, 0, 0, -0.3);
  const hornMat = lam(0xffffff, 0x4a3000, { vertexColors: true });
  saxTop.add(new THREE.Mesh(horn.build(), hornMat));
  const sticks = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(DX + s * 0.25, 2.05, DZ - 0.15); root.add(p); add(keep(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4)), basic(0xe8d8b0), 0, 0, 0.3, p).rotation.x = Math.PI / 2; return p; });
  const cymbal = add(keep(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 16)), lam(0xffd060, 0x3a2400), DX + 1.3, 2.35, DZ);

  // ── Golden statuette stage-right ──────────────────────────────────
  const OX = 16, OZ = -10;
  const ob = new kit.Builder();
  ob.cyl(1.6, 1.8, 1.2, 16, OX, 0.6, OZ, 0x111111); ob.cyl(1.2, 1.4, 1.0, 16, OX, 1.7, OZ, 0x1a1a1a);
  ob.add(new THREE.LatheGeometry([[0, 0], [0.55, 0], [0.5, 0.4], [0.35, 0.6], [0.42, 1.6], [0.6, 2.6], [0.62, 3.6], [0.5, 4.2], [0.25, 4.5], [0.32, 4.8], [0.36, 5.3], [0.2, 5.65], [0, 5.7]].map(([x, y]) => new THREE.Vector2(x, y)), 14), ob.m4(OX, 2.2, OZ), 0xffc53a);
  ob.cyl(0.13, 0.13, 1.6, 6, OX, 5.4, OZ + 0.3, 0xffc53a, 0.3);   // sword
  const statue = new THREE.Mesh(ob.build(), lam(0xffffff, 0x000000, { vertexColors: true }));
  root.add(statue);
  const statueMat = statue.material;

  // ── Klieg searchlights on trucks ──────────────────────────────────
  const beamGeo = keep(new THREE.CylinderGeometry(0.35, 4.5, 90, 18, 1, true)); beamGeo.translate(0, 45, 0);
  const kb = new kit.Builder();
  kb.box(2.6, 1.0, 3.4, 0, 0.5, 0, 0x2a2a30); kb.cyl(0.8, 0.8, 1.0, 14, 0, 1.6, 0, 0x55555e, 0, 0, Math.PI / 2);
  const truckGeo = kb.build();
  const KL = [[-14, -16], [-21, -22], [-28, -30], [14, -16], [21, -22], [28, -30]].map(([x, z], i) => {
    const m = add(truckGeo, vcol, x, 0, z);
    const mat = keep(new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0.1 }, uCol: { value: new THREE.Color(1, 0.97, 0.9) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uK; uniform vec3 uCol; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.6); float a = uK * e * (1.0 - vUv.y) * smoothstep(0.0, 0.03, vUv.y); gl_FragColor = vec4(uCol * a, 1.0); }',
    }));
    mat.blending = THREE.CustomBlending; mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneFactor;
    const beam = new THREE.Mesh(beamGeo, mat); beam.position.set(x, 1.6, z); beam.renderOrder = 3; root.add(beam);
    return { beam, mat, x, z, ph: i * 1.1, sp: 0.42 + 0.06 * (i % 3), side: Math.sign(x), phase: i * 1.1 };
  });

  // ── Confetti / ticker tape (instanced quads) ──────────────────────
  const CF = low ? 220 : 380;
  const confMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.16, 0.28)), basic(0xffffff, { side: THREE.DoubleSide }), CF);
  confMesh.frustumCulled = false; root.add(confMesh);
  const conf = Array.from({ length: CF }, () => ({ on: false }));
  let confCur = 0, confLive = 0;
  const CONF_COLS = [0xffcf3a, 0xffe27a, 0xd4a017, 0xff3040, 0xfff4d0, 0xffb020];
  const throwConf = (n, x, spread, y0 = 18, tape = 0.25) => {
    for (let k = 0; k < n; k++) {
      const c = conf[confCur = (confCur + 1) % CF];
      c.on = true; c.x = x + (Math.random() - 0.5) * spread; c.y = y0 + Math.random() * 6; c.z = -24 + Math.random() * 30;
      c.vy = 1.2 + Math.random() * 1.6; c.vx = (Math.random() - 0.5) * 1.5; c.r = Math.random() * TAU; c.vr = (Math.random() - 0.5) * 8; c.ph = Math.random() * TAU;
      c.tape = Math.random() < tape; const cc = c.tape ? 0xfff4d0 : CONF_COLS[k % CONF_COLS.length];
      confMesh.setColorAt(confCur, col.set(cc));
    }
    confMesh.instanceColor.needsUpdate = true;
  };
  confMesh.setColorAt(0, col.set(0xffffff));

  // ── Sprites: flashes, glows, rings (smoke), notes, fireworks, banner ──
  const atlasTex = kit.atlas([kit.paint.glow, kit.paint.ring, kit.paint.sparkle, kit.paint.glyph('♪'), kit.paint.glyph('♫'), kit.paint.glyph('♬'), kit.paint.puff, kit.paint.soft], 4, 512);
  const fx = new kit.SpriteBatch(low ? 700 : 1100, atlasTex, { cells: 4, additive: true, order: 6 });
  root.add(fx.mesh);
  const parts = new kit.Particles(low ? 380 : 650);
  const C = { glow: 0, ring: 1, spark: 2, note: 3, puff: 6, soft: 7 };
  const bannerTex = kit.canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    PHRASES.forEach((p, i) => {
      const y = (i + 0.5) * h / 8; let fs = 64; g.font = `900 ${fs}px "Arial Black", Impact, sans-serif`;
      while (g.measureText(p).width > w * 0.94 && fs > 20) { fs -= 2; g.font = `900 ${fs}px "Arial Black", Impact, sans-serif`; }
      g.shadowColor = 'rgba(255,190,30,1)'; g.shadowBlur = 14; g.fillStyle = '#ffe840'; g.fillText(p, w / 2, y); g.shadowBlur = 0; g.fillStyle = '#fffbe0'; g.fillText(p, w / 2, y);
    });
  });
  const bannerGeo = keep(new THREE.PlaneGeometry(30, 30 / 8));
  const bannerMat = basic(0xffffff, { map: bannerTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  const banner = add(bannerGeo, bannerMat, 0, 20, -26); banner.visible = false; banner.renderOrder = 7;
  const setBanner = (i) => { const uv = bannerGeo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (i + (1 - (k < 2 ? 1 : 0))) / 8); uv.needsUpdate = true; };

  // ── Lights ────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x8a7aff, 0x2a0a10, 0.9);
  const key = new THREE.DirectionalLight(0xffd8a0, 1.3); key.position.set(4, 14, 18);
  const flashL = new THREE.PointLight(0xffffff, 0, 30, 1.5); flashL.position.set(0, 4, 2);
  const marqL = new THREE.PointLight(0xffc060, 40, 40, 1.4); marqL.position.set(0, 7, -24);
  root.add(hemi, key, flashL, marqL);

  // ── State ─────────────────────────────────────────────────────────
  const st = {
    kick: 0, swing: kit.spring(), conv: 0, convX: 0, convY: 0, solo: 0, roll: 0, crash: 0, chase: 0, chaseDir: 1, chaseSp: 1,
    flicker: 0, cheer: 0, flash: 0, allBulbs: 0, strobeN: 0, strobe: 0, banner: 0, combo: 0, gelHue: 0, hollyChase: -1, shake: 0,
    over: false, dim: 1, dimT: 1, age: 10, thump: 0, saxPuffT: 0, tally: 0, armsUp: 0, wave: -1,
  };
  const colX = (c) => { const u = ((c ?? 4.5) - 4.5) / 4.5; return Math.sign(u || 1) * (5.2 + 2.6 * Math.abs(u)); };
  const popFlash = (x, y, z, k = 1) => {
    const o = parts.spawn(x, y, z, C.glow, 0.32); o.size = 2.2 * k; o.grow = 4; o.r = 1; o.gg = 1; o.b = 1; o.a = 1; o.fadeIn = 0.01;
    const s = parts.spawn(x, y, z, C.spark, 0.25); s.size = 1.2 * k; s.r = 1; s.gg = 1; s.b = 1; s.fadeIn = 0.01; s.vr = 4;
    st.flash = Math.max(st.flash, 0.25 * k); flashL.position.set(x, y, z + 1.5);
  };
  const papFlash = (side, k = 1) => {   // a paparazzo on that side fires
    let best = null;
    for (let tries = 0; tries < 6; tries++) { const f = fans[Math.floor(Math.random() * FANS)]; if (f.side === side || side === 0) { best = f; break; } }
    if (!best) return;
    best.flash = 1; best.arms = Math.max(best.arms, 1);
    popFlash(best.x, 2.6, best.z + 0.3, k);
  };
  const smokeRing = (big = false) => {
    const o = parts.spawn(sax.position.x + 0.3, sax.position.y + 2.4, sax.position.z + 0.6, C.ring, big ? 4.5 : 3.2);
    o.vy = 0.7; o.vx = 0.2; o.size = big ? 0.7 : 0.45; o.grow = 0.6; o.r = 0.86; o.gg = 0.82; o.b = 0.76; o.a = big ? 0.6 : 0.45; o.wob = 0.3; o.wf = 1.2;
  };
  const notes = (n, x, y, z) => { for (let i = 0; i < n; i++) { const o = parts.spawn(x, y, z, C.note + (i % 3), 2 + Math.random()); o.vx = (Math.random() - 0.3) * 1.6; o.vy = 1.5 + Math.random() * 1.5; o.drag = 0.4; o.size = 0.7 + Math.random() * 0.4; o.r = 1; o.gg = 0.85; o.b = 0.4; o.wob = 0.3; } };
  const firework = (x, y, z, hue, n = 40) => {
    col.setHSL(hue, 0.9, 0.6);
    const r0 = col.r, g0 = col.g, b0 = col.b;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, e = Math.acos(2 * Math.random() - 1), sp = 7 + Math.random() * 3;
      const o = parts.spawn(x, y, z, i % 3 ? C.glow : C.spark, 1.4 + Math.random() * 0.6);
      o.vx = Math.sin(e) * Math.cos(a) * sp; o.vy = Math.cos(e) * sp; o.vz = Math.sin(e) * Math.sin(a) * sp * 0.5; o.g = 4; o.drag = 1.4; o.size = 0.9; o.r = r0; o.gg = g0; o.b = b0; o.fadeIn = 0.02;
    }
    const f = parts.spawn(x, y, z, C.glow, 0.5); f.size = 14; f.r = r0; f.gg = g0; f.b = b0; f.a = 0.8; f.fadeIn = 0.01;
  };
  let fwQueue = 0, fwT = 0;

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0;
    const ph = frac(beat), onBeat = Math.exp(-ph * 6), half = Math.exp(-frac(beat * 2) * 7);
    const danger = clamp(((info.danger || 0) - 0.55) / 0.4, 0, 1);
    const mv = info.move || 0, ch = info.cheer || 0, fl = info.flash || 0;
    st.kick *= Math.exp(-dt * 3); st.conv = Math.max(0, st.conv - dt * 0.5); st.solo = Math.max(0, st.solo - dt * 0.45);
    st.roll = Math.max(0, st.roll - dt * 1.6); st.crash = Math.max(0, st.crash - dt * 3); st.flicker = Math.max(0, st.flicker - dt * 1.4);
    st.cheer = Math.max(0, st.cheer - dt * 0.45); st.flash = Math.max(0, st.flash - dt * 5); st.allBulbs = Math.max(0, st.allBulbs - dt * 1.2);
    st.banner = Math.max(0, st.banner - dt * 0.38); st.shake = Math.max(0, st.shake - dt * 2.5); st.thump = Math.max(0, st.thump - dt * 4);
    st.tally = Math.max(0, st.tally - dt); st.armsUp = Math.max(0, st.armsUp - dt * 0.6);
    st.dim += (st.dimT - st.dim) * Math.min(1, dt * 1.5);
    const cheer = Math.max(st.cheer, ch), flash = Math.max(st.flash, fl * 0.6);
    if (st.strobeN > 0) { st.strobe += dt * 12; if (st.strobe > 1) { st.strobe = 0; st.strobeN--; } }
    const strobe = st.strobeN > 0 && st.strobe < 0.5 ? 1 : 0;
    st.gelHue = (st.gelHue + dt * 0.04 * st.combo) % 1;
    const swing = kit.stepSpring(st.swing, dt, 0.9, 0.22);
    st.age += dt; const startK = clamp(st.age * 0.8, 0, 1);

    // Kliegs: sweep (faster on moves / clears), converge on solo / big clears, gels on combos, red on danger.
    KL.forEach((k, i) => {
      k.phase += dt * (k.sp + mv * 1.5 + cheer * 1.1 + st.kick * k.side * 0.0) + st.kick * dt * 3;
      let rz = Math.sin(k.phase) * 0.42 + swing * (i % 2 ? 1 : -1) * 0.5, rx = -0.12 + Math.sin(k.phase * 0.7 + i) * 0.1;
      if (st.solo > 0) { const s = Math.min(1, st.solo * 2), dx = BX - k.x; rz = lerp(rz, Math.atan2(-dx, 7), s); rx = lerp(rx, Math.atan2(-(BZ - k.z), 7) * 0.9, s); }
      else if (st.conv > 0) { const s = Math.min(1, st.conv * 1.5); rz = lerp(rz, Math.atan2(k.x - st.convX, 40), s); rx = lerp(rx, -0.25, s); }
      if (st.over) { rz = i === 0 ? Math.atan2(k.x, 6) * 0.9 : rz; rx = i === 0 ? Math.atan2(-k.z - 2, 6) * -0.5 : rx; }
      k.beam.rotation.set(rx, 0, rz);
      const on = st.over ? (i === 0 ? 1 : 0) : clamp(startK * 6 - i, 0, 1);
      const kk = (0.09 + 0.035 * onBeat + 0.08 * cheer + 0.12 * flash + 0.25 * strobe * ((i + st.strobeN) % 2) + 0.08 * st.solo) * on;
      k.mat.uniforms.uK.value = kk;
      if (danger > 0) k.mat.uniforms.uCol.value.setRGB(1, 0.95 - 0.7 * danger, 0.9 - 0.75 * danger);
      else if (st.combo >= 2) { col.setHSL(frac(st.gelHue + i / 6), 0.7, 0.7); k.mat.uniforms.uCol.value.copy(col); }
      else k.mat.uniforms.uCol.value.setRGB(1, 0.97, 0.9);
      fx.add(k.x, 1.7, k.z, 3.2, 0, C.glow, 1, 0.95, 0.85, kk * 5);
    });

    // Marquee bulbs: chaser (moves step it, rotations reverse it, soft drops race it).
    st.chase += dt * st.chaseDir * (6 + 14 * st.roll + 4 * cheer) * (st.over ? 0 : 1);
    const stutter = danger > 0 && Math.sin(t * 23) * Math.sin(t * 7.3) > 0.6 - 0.3 * danger ? 0.25 : 1;
    for (let i = 0; i < BN; i++) {
      const b = bulbs[i];
      const on = Math.sin((b.i - st.chase) * 0.65 + b.r * 1.2) > 0.18;
      const wave = st.wave >= 0 ? Math.exp(-Math.pow((b.x + 15) - st.wave * 60, 2) / 8) : 0;
      let k = (on ? 1 : 0.32 + 0.1 * Math.sin(t * 2 + i)) + st.allBulbs + wave;
      k *= stutter * st.dim * (st.over ? 0.15 : startK);
      const hue = b.r === 3 ? 0.92 : 0.12 + (i % 3) * 0.02;
      col.setHSL(hue, b.r === 3 ? 0.9 : 0.85, 0.35 + 0.3 * Math.min(1, k)).multiplyScalar(0.6 + 0.9 * Math.min(1.4, k));
      bulbMesh.setColorAt(i, col);
      if (on && (i & 1) === 0 && b.r < 3) fx.add(b.x, b.y, b.z + 0.2, 0.9, 0, C.glow, 1, 0.78, 0.4, 0.35 * k);
    }
    bulbMesh.instanceColor.needsUpdate = true;
    if (st.wave >= 0) { st.wave += dt * 0.9; if (st.wave > 1.3) st.wave = -1; }
    marqL.intensity = 40 * st.dim * (0.8 + 0.3 * onBeat + 0.6 * st.allBulbs) * (st.over ? 0.1 : startK) * stutter;
    // Neon sign: hum + flicker on drops; dies on game over.
    const flickOff = st.flicker > 0 && Math.random() < 0.3 + 0.4 * st.flicker;
    const nk = st.over ? (Math.random() < 0.04 ? 0.5 : 0) : flickOff ? 0.08 : (0.85 + 0.15 * onBeat + 0.3 * cheer) * startK;
    neonMat.color.setScalar(nk * st.dim); bladeMat.color.setRGB(nk, 0.24 * nk, 0.6 * nk);
    lobbyMat.color.setRGB(st.dim * (st.over ? 0.15 : 1), st.dim * (st.over ? 0.1 : 0.75), st.dim * (st.over ? 0.05 : 0.44));
    // HOLLYWOOD letters (chase letter by letter on level up).
    if (st.hollyChase >= 0) { st.hollyChase += dt * 6; if (st.hollyChase > 20) st.hollyChase = -1; }
    for (let i = 0; i < 9; i++) {
      let k = 0.55 + 0.1 * Math.sin(t * 0.8 + i) + 0.3 * cheer;
      if (st.hollyChase >= 0) k += 1.4 * Math.exp(-Math.pow((st.hollyChase % 10) - i, 2));
      k *= st.dim;
      letterAC[i * 3] = k; letterAC[i * 3 + 1] = k * (danger > 0 ? 0.6 : 0.96); letterAC[i * 3 + 2] = k * (danger > 0 ? 0.5 : 0.88);
    }
    letterCAttr.needsUpdate = true;

    fx.begin();
    // Crowd: bob on the beat, arms (cameras) up on clears, restless on danger, flash on events.
    for (let i = 0; i < FANS; i++) {
      const f = fans[i];
      f.arms = Math.max(0, f.arms - dt * 0.8); f.flash = Math.max(0, f.flash - dt * 4);
      const hype = Math.min(1.4, 0.25 + cheer * f.hype + 0.5 * danger);
      const bob = (0.5 - 0.5 * Math.cos(TAU * beat + f.ph)) * (0.04 + 0.25 * hype) * (st.over ? 0.2 : 1);
      const face = Math.atan2(-f.x * 0.2, 1) + (danger > 0 ? Math.sin(t * 3 + f.ph) * 0.4 * danger : 0) + (f.side > 0 ? -1.2 : 1.2) * 0.5;
      dummy.position.set(f.x, bob, f.z); dummy.rotation.set(0, face, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); fanMesh.setMatrixAt(i, dummy.matrix);
      const up = Math.min(1, Math.max(f.arms, st.armsUp * f.hype, f.pap ? 0.55 : 0.1));
      dummy.position.set(f.x, bob + 1.6, f.z); dummy.rotation.set(-0.3 - up * 2.4 + Math.sin(t * 6 + f.ph) * 0.1 * cheer, face, 0); dummy.updateMatrix(); armMesh.setMatrixAt(i, dummy.matrix);
      // Ambient paparazzi: random flashes, more with cheer.
      if (!st.over && f.pap && Math.random() < dt * (0.08 + 1.2 * cheer + 0.3 * danger)) { f.flash = 1; popFlash(f.x, 2.6 + bob, f.z + 0.3, 0.7); }
    }
    fanMesh.instanceMatrix.needsUpdate = armMesh.instanceMatrix.needsUpdate = true;

    // Band: drummer sticks on the beat (rattle on soft drops, crash on rotations), bassist sway, sax bell lifts.
    const roll = st.roll > 0 ? Math.sin(t * 60) * 0.5 * st.roll : 0;
    sticks[0].rotation.x = -0.3 - 0.6 * Math.exp(-frac(beat) * 8) + roll - 0.8 * st.crash;
    sticks[1].rotation.x = -0.3 - 0.6 * Math.exp(-frac(beat + 0.5) * 8) - roll - 0.3 * st.thump;
    sticks[1].rotation.y = -0.6 * st.crash;
    cymbal.rotation.z = Math.sin(t * 30) * 0.15 * st.crash + 0.08 * Math.exp(-frac(beat) * 6);
    const lean = 0.15 * Math.sin(Math.PI * beat) + 0.5 * Math.min(1, st.solo * 2) + 0.25 * cheer;
    saxTop.rotation.set(-lean * 0.8, 0.5 + 0.2 * Math.sin(Math.PI * beat / 2), 0);
    sax.position.y = 0.82 + 0.05 * half;
    hornMat.emissive.setRGB(0.3 + 0.5 * st.solo + 0.3 * cheer, 0.2 + 0.35 * st.solo + 0.2 * cheer, 0.02);
    st.saxPuffT -= dt; if (st.saxPuffT < 0 && !st.over) { st.saxPuffT = 2.5 + Math.random() * 2; smokeRing(); }
    if (st.solo > 0.2 && Math.random() < dt * 4) notes(1, sax.position.x + 0.4, sax.position.y + 2.2, sax.position.z + 0.6);
    // Statue gleam.
    statueMat.emissive.setRGB(0.25 + 0.15 * onBeat + 0.45 * cheer + 0.4 * flash, 0.16 + 0.1 * onBeat + 0.3 * cheer + 0.3 * flash, 0.02);
    fx.add(OX, 6, OZ, 7 + 4 * cheer, 0, C.glow, 1, 0.75, 0.3, 0.12 + 0.15 * onBeat + 0.35 * cheer);
    // Film camera tally lights.
    const tallyOn = st.tally > 0 ? Math.sin(t * 30) > 0 : onBeat > 0.4;
    for (const [x, z] of CAMS) fx.add(x, 2.45, z + 0.4, 0.5, 0, C.glow, 1, 0.1, 0.08, (tallyOn ? 1 : 0.35) * st.dim);
    // Fireworks queue.
    if (fwQueue > 0) { fwT -= dt; if (fwT <= 0) { fwQueue--; fwT = 0.18 + Math.random() * 0.2; const s = Math.random() < 0.5 ? -1 : 1; firework(s * (18 + Math.random() * 22), 26 + Math.random() * 10, -70 - Math.random() * 30, Math.random(), low ? 26 : 40); } }

    // Confetti.
    let live = 0;
    for (let i = 0; i < CF; i++) {
      const c = conf[i];
      if (c.on) {
        c.y -= c.vy * dt; c.x += (c.vx + Math.sin(t * 2 + c.ph) * 0.6) * dt; c.r += c.vr * dt;
        if (c.y < 0.05) c.on = false;
      }
      if (c.on) { live++; dummy.position.set(c.x, c.y, c.z); dummy.rotation.set(c.r, c.r * 0.7 + c.ph, c.r * 0.3); dummy.scale.set(c.tape ? 0.5 : 1, c.tape ? 3 : 1, 1); }
      else dummy.scale.setScalar(0);
      dummy.updateMatrix(); confMesh.setMatrixAt(i, dummy.matrix);
    }
    confMesh.visible = live > 0; confMesh.instanceMatrix.needsUpdate = true;
    if (!st.over && Math.random() < dt * (1.5 + 10 * cheer)) throwConf(1 + Math.round(cheer * 3), (Math.random() - 0.5) * 40, 4);

    // Banner.
    banner.visible = st.banner > 0.01;
    if (banner.visible) { const u = 1 - st.banner; banner.position.y = 19.5 + u * 3; bannerMat.opacity = Math.min(1, st.banner * 2.5); bannerMat.color.setScalar(Math.min(1, st.banner * 2.5)); banner.scale.setScalar(0.8 + 0.25 * Math.min(1, u * 6)); }

    parts.step(dt, [fx]);
    fx.end();

    flashL.intensity = 60 * st.flash;
    hemi.intensity = 0.9 * st.dim * (st.over ? 0.5 : 1) * (1 + 0.6 * strobe); key.intensity = 1.3 * st.dim * (st.over ? 0.3 : 1);
    carpetMat.emissive.setRGB(0.19 + 0.12 * onBeat * st.dim + 0.15 * cheer, 0.02, 0.03);
    skyU.uTime.value = t; skyU.uFlash.value = flash + 0.4 * strobe; skyU.uDanger.value = danger; skyU.uDim.value = st.dim;

    // Camera: hovering over the red carpet, slow drift, shake on slams.
    const aspect = camera.aspect || 1.6, fr = kit.framing(aspect);
    const sh = st.shake * 0.3, sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh;
    if (fr.portrait) {
      camera.fov = 78;
      camera.position.set(Math.sin(t * 0.1) * 0.8 + sx, 6.5 + sy - 0.3 * st.thump, 22);
      camera.lookAt(0, 9, -20);
    } else {
      camera.fov = 52 + 2 * st.thump + 2 * flash;
      camera.position.set(Math.sin(t * 0.1) * 1.6 + sx, 5.2 + Math.sin(t * 0.16) * 0.4 + sy - 0.3 * st.thump, 17 + Math.sin(t * 0.07));
      camera.lookAt(Math.sin(t * 0.1) * 0.8, 6.6, -20);
    }
    camera.rotateZ(Math.sin(t * 0.13) * 0.01);
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position); hills.position.x = camera.position.x; hills.position.z = camera.position.z;
  }

  function react(kind, d = {}) {
    if (st.over && kind !== 'start') return;
    const x = colX(d.col), side = Math.sign(x);
    switch (kind) {
      case 'move':
        st.kick += (d.dir || 0) * 0.9; st.chase += (d.dir || 1) * 1;
        papFlash(side, 0.8); smokeRing();
        break;
      case 'rotate':
        st.swing.v += (d.dir || 1) * 1.8; st.crash = 1; st.chaseDir = -st.chaseDir;
        break;
      case 'soft':
        st.roll = Math.min(1, st.roll + 0.4); st.tally = 0.6;
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.3 + r / 14);
        st.flicker = Math.max(st.flicker, k); st.thump = 1; st.shake = Math.max(st.shake, k);
        const n = 1 + Math.round(r / 3);
        for (let i = 0; i < n; i++) papFlash(i % 2 ? side : -side, 1);
        if (r >= 8) throwConf(10 + r * 2, x, 10, 18, 0.7);
        break;
      }
      case 'hold':
        st.solo = 1.6; smokeRing(true); notes(5, sax.position.x + 0.4, sax.position.y + 2.4, sax.position.z + 0.6);
        break;
      case 'clear': {
        const n = clamp(d.lines || 1, 1, 4), combo = d.combo || 0;
        st.combo = combo; st.cheer = Math.min(1.2, st.cheer + 0.25 * n + 0.05 * combo); st.armsUp = Math.min(1, 0.4 + 0.2 * n);
        throwConf(n >= 4 ? 140 : 20 * n + 6 * Math.min(combo, 6), n >= 4 ? 0 : x, n >= 4 ? 44 : 12);
        for (let i = 0; i < n + Math.min(combo, 6); i++) papFlash(i % 2 ? side : -side, 1);
        if (n >= 2) st.allBulbs = 1;
        if (n >= 3) { st.conv = 1.4; st.convX = 0; }
        if (n >= 4) { st.banner = 1; setBanner(Math.floor(Math.random() * PHRASES.length)); fwQueue += 6 + Math.min(combo, 6); st.strobeN = 8; st.shake = 0.5; }
        else if (combo >= 3) fwQueue += Math.min(combo - 2, 4);
        break;
      }
      case 'levelUp':
        st.hollyChase = 0; st.wave = 0; fwQueue += 8; st.cheer = 1; throwConf(80, 0, 40);
        break;
      case 'gameOver':
        st.over = true; st.dimT = 0.45; st.strobeN = 0; st.banner = 0; st.solo = 0; st.conv = 0; fwQueue = 0;
        break;
      case 'start':
        st.over = false; st.dimT = 1; st.combo = 0; st.age = 0;
        st.flash = 0.6; throwConf(40, 0, 30);
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      for (const m of [letters, bulbMesh, fanMesh, armMesh, confMesh]) m.dispose();
      kit.dispose();
    },
  };
}
