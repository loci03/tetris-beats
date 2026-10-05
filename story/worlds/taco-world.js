// TACO TOWN — the Level 1 battle stage.
//
// A sunset street-party stage inside a giant taco shell: a light-up dance
// floor, spotlight cones, papel picado, string lights, pumping speakers, a
// crowd, confetti and a food-fight of flying tacos for the big moments.
// Everything that moves is driven by the music clock via update().

import * as THREE from '../../vendor/three/three.module.min.js';

const PALETTE = [0xff3d7f, 0xffc93a, 0x3ddc84, 0x29c7ff, 0xff7a1a, 0xb35cff];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildTacoWorld({ lowGraphics = false } = {}) {
  const group = new THREE.Group();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));

  // ── Sky, sun, horizon ───────────────────────────────────────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(80, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uPulse: { value: 0 }, uSauce: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse; uniform float uSauce;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.10,0.02,0.22), mid = vec3(0.62,0.10,0.42), hor = vec3(1.0,0.52,0.18);
        vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h)) : mix(hor, mid, smoothstep(-0.05, 0.12, h));
        c += vec3(0.25,0.05,0.12) * uPulse * smoothstep(0.4, 0.0, abs(h - 0.08));
        c = mix(c, vec3(0.95,0.22,0.04) * (0.6 + 0.4 * smoothstep(0.5, 0.0, h)), uSauce);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  group.add(sky);

  const sunTex = keep(canvasTex(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,245,200,1)'); grad.addColorStop(0.45, 'rgba(255,170,60,0.95)');
    grad.addColorStop(0.7, 'rgba(255,90,80,0.35)'); grad.addColorStop(1, 'rgba(255,60,120,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(160,20,90,0.55)';                    // retro sun stripes
    for (let i = 0; i < 6; i++) g.fillRect(0, h * 0.58 + i * 16, w, 4 + i * 2);
  }));
  const sun = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 26)), basic(0xffffff, { map: sunTex, transparent: true, depthWrite: false, fog: false }));
  sun.position.set(0, 5.5, -60);
  group.add(sun);

  // Mesas / mountains
  const mesaMat = toon(0x3a1446);
  for (let i = 0; i < 14; i++) {
    const w = 6 + (i * 37 % 7), hgt = 3 + (i * 53 % 6);
    const m = new THREE.Mesh(keep(new THREE.CylinderGeometry(w * 0.55, w * 0.8, hgt, 6)), mesaMat);
    m.position.set(-55 + i * 8.5, hgt / 2 - 1.5, -44 - (i % 3) * 4);
    group.add(m);
  }

  // Cacti in the mid-ground
  const cactusMat = toon(0x1f8a4c);
  const cactusGeo = keep(new THREE.CapsuleGeometry(0.35, 2.2, 4, 10));
  const armGeo = keep(new THREE.CapsuleGeometry(0.22, 0.8, 4, 8));
  for (const [x, z, s] of [[-11, -14, 1.2], [-15, -9, 0.9], [12, -13, 1.1], [16, -8, 1.3], [-8, -20, 1], [9, -22, 1.1]]) {
    const c = new THREE.Group();
    const t = new THREE.Mesh(cactusGeo, cactusMat); t.position.y = 1.4; c.add(t);
    const a1 = new THREE.Mesh(armGeo, cactusMat); a1.position.set(0.45, 1.5, 0); a1.rotation.z = -0.5; c.add(a1);
    const a2 = new THREE.Mesh(armGeo, cactusMat); a2.position.set(-0.45, 1.9, 0); a2.rotation.z = 0.5; c.add(a2);
    c.position.set(x, -0.6, z); c.scale.setScalar(s);
    group.add(c);
  }

  // Ground (street) around the stage
  const ground = new THREE.Mesh(keep(new THREE.CircleGeometry(40, 40)), toon(0x4a1f3a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.62;
  group.add(ground);

  // ── Stage floor: light-up tiles ─────────────────────────────────
  const stageBase = new THREE.Mesh(keep(new THREE.CylinderGeometry(4.6, 4.9, 0.6, 48)), toon(0x2a1236));
  stageBase.position.y = -0.31;
  group.add(stageBase);
  const tileSize = 0.64;
  const tiles = [];
  for (let ix = -7; ix <= 7; ix++) {
    for (let iz = -6; iz <= 6; iz++) {
      const x = ix * tileSize, z = iz * tileSize;
      if (Math.hypot(x, z) > 4.3) continue;
      tiles.push({ x, z, ix, iz, glow: 0 });
    }
  }
  const tileMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(tileSize * 0.94, 0.06, tileSize * 0.94)), basic(0xffffff), tiles.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  tiles.forEach((t, i) => { m4.makeTranslation(t.x, 0.0, t.z); tileMesh.setMatrixAt(i, m4); tileMesh.setColorAt(i, col.set(0x221133)); });
  group.add(tileMesh);
  const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(4.55, 0.07, 8, 96)), basic(0xffc93a));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  group.add(rim);

  // ── The taco arch ───────────────────────────────────────────────
  const arch = new THREE.Group();
  arch.position.set(0, -0.2, -4.4);
  group.add(arch);
  const shellMat = toon(0xf7b733, { emissive: 0x3a1a00 });
  const shell = new THREE.Mesh(keep(new THREE.TorusGeometry(5.6, 0.85, 16, 64, Math.PI)), shellMat);
  shell.scale.z = 0.55;
  arch.add(shell);
  // Shell texture dots
  const dotGeo = keep(new THREE.SphereGeometry(0.12, 8, 6));
  const dotMat = toon(0xc97a14);
  for (let i = 0; i < 26; i++) {
    const a = 0.08 + (i / 26) * (Math.PI - 0.16);
    const d = new THREE.Mesh(dotGeo, dotMat);
    d.position.set(Math.cos(a) * 5.6, Math.sin(a) * 5.6, 0.47 + (i % 2) * 0.02);
    d.scale.set(1, 1, 0.35);
    arch.add(d);
  }
  // Lettuce frill + tomatoes + cheese on the inner edge
  const lettuceGeo = keep(new THREE.SphereGeometry(0.42, 10, 8));
  const lettuceMat = toon(0x5ccf3a);
  const tomatoGeo = keep(new THREE.BoxGeometry(0.34, 0.34, 0.34));
  const tomatoMat = toon(0xe83a2a);
  const cheeseGeo = keep(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6));
  const cheeseMat = toon(0xffe45c);
  const cheeseStrands = [];
  for (let i = 0; i < 30; i++) {
    const a = 0.12 + (i / 29) * (Math.PI - 0.24);
    const r = 4.75;
    const l = new THREE.Mesh(lettuceGeo, lettuceMat);
    l.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.1);
    l.scale.set(1, 0.7, 0.5);
    l.rotation.z = a;
    arch.add(l);
    if (i % 3 === 1) {
      const tm = new THREE.Mesh(tomatoGeo, tomatoMat);
      tm.position.set(Math.cos(a) * (r - 0.35), Math.sin(a) * (r - 0.35), 0.3);
      tm.rotation.set(a, a * 2, 0);
      arch.add(tm);
    }
    if (i % 4 === 0 && Math.sin(a) > 0.5) {
      const ch = new THREE.Mesh(cheeseGeo, cheeseMat);
      ch.position.set(Math.cos(a) * (r - 0.55), Math.sin(a) * (r - 0.55) - 0.4, 0.2);
      ch.userData.y0 = ch.position.y;
      arch.add(ch);
      cheeseStrands.push(ch);
    }
  }

  // Neon sign on top of the arch
  const signTex = keep(canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = '900 150px Orbitron, "Arial Black", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff2d95'; g.shadowBlur = 40;
    g.strokeStyle = '#ff7ac0'; g.lineWidth = 10;
    g.strokeText('TACO TOWN', w / 2, h / 2 + 8);
    g.shadowBlur = 20; g.fillStyle = '#fff4fb';
    g.fillText('TACO TOWN', w / 2, h / 2 + 8);
  }));
  const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(6.4, 1.6)), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false }));
  sign.position.set(0, 6.95, 0.6);
  arch.add(sign);

  // ── Truss + spotlight cones ─────────────────────────────────────
  const truss = new THREE.Mesh(keep(new THREE.BoxGeometry(12, 0.22, 0.22)), toon(0x303040));
  truss.position.set(0, 7.2, 1.2);
  group.add(truss);
  const coneMats = [];
  const cones = [];
  const coneGeo = keep(new THREE.ConeGeometry(0.95, 7.3, 24, 1, true));
  coneGeo.translate(0, -3.65, 0);
  for (const [x, targetX] of [[-3.6, -1.6], [-1.2, -1.6], [1.2, 1.6], [3.6, 1.6]]) {
    const fixture = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.2, 0.28, 0.4, 12)), toon(0x151520));
    fixture.position.set(x, 7.0, 1.2);
    group.add(fixture);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.position.copy(fixture.position);
    group.add(cone);
    coneMats.push(mat);
    cones.push({ cone, baseX: x, targetX, side: targetX < 0 ? 'player' : 'rival' });
  }

  // ── Papel picado + string lights ────────────────────────────────
  const flagTexes = PALETTE.map(c => keep(canvasTex(64, 80, (g, w, h) => {
    g.fillStyle = '#' + c.toString(16).padStart(6, '0');
    g.fillRect(0, 0, w, h - 12);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 16, h - 12); g.lineTo(i * 16 + 8, h); g.lineTo(i * 16 + 16, h - 12); g.fill(); }
    g.globalCompositeOperation = 'destination-out';
    for (let y = 14; y < h - 18; y += 16) for (let x = 10; x < w - 6; x += 16) {
      g.beginPath(); g.arc(x + ((y / 16) % 2) * 6, y, 4, 0, Math.PI * 2); g.fill();
    }
  })));
  const flagGeo = keep(new THREE.PlaneGeometry(0.46, 0.58));
  const flagMats = flagTexes.map(t => keep(new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide })));
  const flags = [];
  const bulbs = [];
  const bulbGeo = keep(new THREE.SphereGeometry(0.07, 8, 6));
  const bulbMats = [0xfff2a0, 0xff9ad0, 0x9ae6ff].map(c => keep(new THREE.MeshBasicMaterial({ color: c })));
  for (const [z, y, span] of [[2.2, 5.6, 11], [0.2, 6.0, 12], [-2.0, 6.3, 12]]) {
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = -span / 2 + u * span;
      const sag = Math.sin(u * Math.PI) * 0.7;
      const f = new THREE.Mesh(flagGeo, flagMats[(i + Math.round(z)) % flagMats.length]);
      f.position.set(x, y - sag - 0.3, z);
      group.add(f);
      flags.push({ mesh: f, phase: i * 0.7 + z });
      const b = new THREE.Mesh(bulbGeo, bulbMats[i % 3]);
      b.position.set(x + span / n / 2, y - Math.sin((u + 0.5 / n) * Math.PI) * 0.7 + 0.05, z);
      if (i < n) { group.add(b); bulbs.push(b); }
    }
  }

  // ── Speakers ────────────────────────────────────────────────────
  const speakers = [];
  const cabMat = toon(0x16121e), coneMat = toon(0x3a3a48), ringMat = basic(0xff3d7f);
  for (const sx of [-1, 1]) {
    const stack = new THREE.Group();
    stack.position.set(sx * 5.6, -0.6, -0.8);
    for (let k = 0; k < 2; k++) {
      const cab = new THREE.Mesh(keep(new THREE.BoxGeometry(1.4, 1.4, 1.1)), cabMat);
      cab.position.y = 0.7 + k * 1.45;
      stack.add(cab);
      const woofer = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 24)), coneMat);
      woofer.rotation.x = Math.PI / 2;
      woofer.position.set(0, 0.7 + k * 1.45, 0.56);
      stack.add(woofer);
      const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(0.5, 0.04, 6, 24)), ringMat);
      ring.position.set(0, 0.7 + k * 1.45, 0.6);
      stack.add(ring);
      speakers.push(woofer);
    }
    stack.rotation.y = -sx * 0.35;
    group.add(stack);
    // Chili ristra hanging off each stack
    for (let r = 0; r < 7; r++) {
      const chili = new THREE.Mesh(keep(new THREE.ConeGeometry(0.1, 0.4, 8)), toon(0xd81e1e));
      chili.position.set(sx * 5.0, 2.5 - r * 0.28, 0.0);
      chili.rotation.z = Math.PI + (r % 2 ? 0.3 : -0.3);
      group.add(chili);
    }
  }

  // ── Crowd ───────────────────────────────────────────────────────
  const crowdSpots = [];
  const addRow = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) crowdSpots.push({ x: x0 + (x1 - x0) * (i + Math.random() * 0.4) / n, z: z + Math.random() * 0.5, y }); };
  const crowdScale = lowGraphics ? 0.6 : 1;
  addRow(Math.round(14 * crowdScale), -6.8, 6.8, 5.6, -1.0);
  addRow(Math.round(16 * crowdScale), -7.6, 7.6, 6.6, -1.15);
  addRow(Math.round(7 * crowdScale), -8.8, -5.2, 1.5, -0.62);
  addRow(Math.round(7 * crowdScale), 5.2, 8.8, 1.5, -0.62);
  addRow(Math.round(6 * crowdScale), -9.6, -6.4, -1.4, -0.62);
  addRow(Math.round(6 * crowdScale), 6.4, 9.6, -1.4, -0.62);
  const crowdN = crowdSpots.length;
  const bodyMesh = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.26, 0.55, 4, 8)), toon(0xffffff), crowdN);
  const headMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.2, 10, 8)), toon(0xffffff), crowdN);
  const armMesh = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6)), toon(0xffffff), crowdN * 2);
  const skinTones = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22];
  crowdSpots.forEach((c, i) => {
    c.phase = Math.random() * Math.PI * 2;
    c.hype = 0.6 + Math.random() * 0.6;
    bodyMesh.setColorAt(i, col.set(PALETTE[i % PALETTE.length]).multiplyScalar(0.85));
    headMesh.setColorAt(i, col.set(skinTones[i % skinTones.length]));
    armMesh.setColorAt(i * 2, col.set(skinTones[i % skinTones.length]));
    armMesh.setColorAt(i * 2 + 1, col.set(skinTones[i % skinTones.length]));
  });
  group.add(bodyMesh, headMesh, armMesh);

  // ── Confetti ────────────────────────────────────────────────────
  const CONF = lowGraphics ? 220 : 500;
  const confPos = new Float32Array(CONF * 3), confCol = new Float32Array(CONF * 3);
  const confVel = new Float32Array(CONF * 3), confLife = new Float32Array(CONF);
  for (let i = 0; i < CONF; i++) {
    col.set(PALETTE[i % PALETTE.length]);
    confCol[i * 3] = col.r; confCol[i * 3 + 1] = col.g; confCol[i * 3 + 2] = col.b;
    confPos[i * 3 + 1] = -100;
  }
  const confGeo = keep(new THREE.BufferGeometry());
  confGeo.setAttribute('position', new THREE.BufferAttribute(confPos, 3));
  confGeo.setAttribute('color', new THREE.BufferAttribute(confCol, 3));
  const confetti = new THREE.Points(confGeo, keep(new THREE.PointsMaterial({ size: 0.12, vertexColors: true, sizeAttenuation: true })));
  confetti.frustumCulled = false;
  group.add(confetti);
  let confCursor = 0;
  function burstConfetti(n, x, spread) {
    for (let k = 0; k < n; k++) {
      const i = confCursor = (confCursor + 1) % CONF;
      confPos[i * 3] = x + (Math.random() - 0.5) * spread;
      confPos[i * 3 + 1] = 6.5 + Math.random() * 1.5;
      confPos[i * 3 + 2] = (Math.random() - 0.5) * 4 + 0.5;
      confVel[i * 3] = (Math.random() - 0.5) * 1.2;
      confVel[i * 3 + 1] = -1.2 - Math.random() * 1.2;
      confVel[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
      confLife[i] = 5;
    }
  }

  // ── Flying tacos (food fight) ───────────────────────────────────
  const tacoGeo = keep(new THREE.CylinderGeometry(0.4, 0.4, 0.22, 16, 1, false, 0, Math.PI));
  const tacoMat = toon(0xf7b733), fillMat = toon(0x5ccf3a);
  const tacos = [];
  for (let i = 0; i < 10; i++) {
    const t = new THREE.Group();
    const shellM = new THREE.Mesh(tacoGeo, tacoMat); shellM.rotation.x = Math.PI / 2; t.add(shellM);
    const fill = new THREE.Mesh(keep(new THREE.SphereGeometry(0.28, 8, 6)), fillMat); fill.position.y = 0.05; fill.scale.set(1.2, 0.5, 0.6); t.add(fill);
    t.visible = false;
    group.add(t);
    tacos.push({ obj: t, life: 0, v: new THREE.Vector3(), spin: 0 });
  }
  function throwTacos(n, fromSide) {
    let thrown = 0;
    for (const t of tacos) {
      if (t.life > 0 || thrown >= n) continue;
      thrown++;
      const sx = fromSide || (Math.random() < 0.5 ? -1 : 1);
      t.obj.position.set(sx * (7 + Math.random() * 2), 0.5 + Math.random(), 3 + Math.random() * 2);
      t.v.set(-sx * (4 + Math.random() * 3), 5 + Math.random() * 2.5, -2 - Math.random() * 3);
      t.spin = (Math.random() - 0.5) * 12;
      t.life = 2.4;
      t.splat = false;
      t.obj.visible = true;
    }
  }
  // Tetris piece reactions: a crowd member lobs a taco onto the stage where
  // the piece is (it splats on the floor), tortilla chips burst from slams,
  // hot-sauce shockwave rings + sky flash on clears. All pooled.
  const SPLAT_COLS = [0xd8231a, 0x6cc23a, 0xf2b02e, 0xc4141a];
  function lobTaco(fromSide, tx, tz, T = 1.0) {
    for (const t of tacos) {
      if (t.life > 0) continue;
      const sx = fromSide || (Math.random() < 0.5 ? -1 : 1);
      t.obj.position.set(sx * (6 + Math.random() * 2), 0.6 + Math.random() * 0.6, 2.5 + Math.random() * 2.5);
      const p = t.obj.position;
      t.v.set((tx - p.x) / T, (0.05 - p.y) / T + 4.5 * T, (tz - p.z) / T);
      t.spin = (Math.random() - 0.5) * 14;
      t.life = T + 0.4;
      t.splat = true;
      t.obj.visible = true;
      return true;
    }
    return false;
  }
  const SPL = 24;
  const splatMesh = new THREE.InstancedMesh(keep(new THREE.CircleGeometry(0.34, 12)), basic(0xffffff, { transparent: true, opacity: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SPL);
  const splats = [];
  const hideM = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < SPL; i++) { splats.push({ x: 0, z: 0, age: 99, size: 1, rot: 0 }); splatMesh.setMatrixAt(i, hideM); splatMesh.setColorAt(i, col.set(SPLAT_COLS[i % SPLAT_COLS.length])); }
  splatMesh.frustumCulled = false;
  group.add(splatMesh);
  let splatCursor = 0, splatsLive = 0;
  function addSplat(x, z, size = 1) {
    const sp = splats[splatCursor = (splatCursor + 1) % SPL];
    if (sp.age >= 99) splatsLive++;
    sp.x = x; sp.z = z; sp.age = 0; sp.size = size * (0.7 + Math.random() * 0.6); sp.rot = Math.random() * 6;
  }
  const CHIP = lowGraphics ? 60 : 110;
  const chipGeo = keep(new THREE.CircleGeometry(0.16, 3));
  const chipMesh = new THREE.InstancedMesh(chipGeo, toon(0xffffff, { side: THREE.DoubleSide }), CHIP);
  const chipP = new Float32Array(CHIP * 3), chipV = new Float32Array(CHIP * 3), chipR = new Float32Array(CHIP * 2), chipLife = new Float32Array(CHIP);
  for (let i = 0; i < CHIP; i++) { chipMesh.setMatrixAt(i, hideM); chipMesh.setColorAt(i, col.set(i % 4 === 3 ? [0xd8231a, 0x6cc23a, 0xffffff][i % 3] : 0xf2c040)); }
  chipMesh.frustumCulled = false;
  group.add(chipMesh);
  let chipCursor = 0, chipsLive = 0;
  function burstChips(n, x, z = 0.8, power = 1) {
    for (let k = 0; k < n; k++) {
      const i = chipCursor = (chipCursor + 1) % CHIP;
      if (chipLife[i] <= 0) chipsLive++;
      chipP[i * 3] = x + (Math.random() - 0.5) * 0.8; chipP[i * 3 + 1] = 0.15; chipP[i * 3 + 2] = z + (Math.random() - 0.5) * 0.8;
      const a = Math.random() * Math.PI * 2, sp = (1 + Math.random() * 2.5) * power;
      chipV[i * 3] = Math.cos(a) * sp; chipV[i * 3 + 1] = (3.5 + Math.random() * 4) * power; chipV[i * 3 + 2] = Math.sin(a) * sp * 0.6;
      chipR[i * 2] = Math.random() * 6; chipR[i * 2 + 1] = (Math.random() - 0.5) * 18;
      chipLife[i] = 1.3 + Math.random() * 0.6;
    }
  }
  // Hot-sauce shockwave rings round the board (it stands in front of the arch).
  const ringsFx = [];
  for (let i = 0; i < 3; i++) {
    const mat = keep(new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffd23c : 0xff6a10, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const m = new THREE.Mesh(keep(new THREE.RingGeometry(0.92, 1, 64)), mat);
    m.position.set(0, 2.6, -0.6); m.visible = false;
    group.add(m);
    ringsFx.push({ mesh: m, mat, age: 99, delay: 0, max: 9 });
  }
  let ringNext = 0;
  function shockRing(delay = 0, max = 9) {
    const r = ringsFx[ringNext = (ringNext + 1) % ringsFx.length];
    r.age = -delay; r.max = max;
  }
  const springsT = { flag: [0, 0], cone: [0, 0], sign: [0, 0], arch: [0, 0] };
  const springT = (s, dt, hz, damp) => {
    const w = 2 * Math.PI * hz, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) { s[1] += (-w * w * s[0] - 2 * damp * w * s[1]) * h; s[0] += s[1] * h; }
    return s[0];
  };
  const colX = (c) => (c == null ? (Math.random() - 0.5) * 4 : (c - 4.5) * 0.8);

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x4a1f6a, 1.1);
  const key = new THREE.DirectionalLight(0xfff0dd, 1.6);
  key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(0xff3d7f, 18, 12, 1.6);
  rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0x29c7ff, 18, 12, 1.6);
  rimR.position.set(3.5, 3, -1.5);
  const archGlow = new THREE.PointLight(0xffa640, 14, 14, 1.5);
  archGlow.position.set(0, 4, -2.5);
  group.add(hemi, key, rimL, rimR, archGlow);
  const baseIntensity = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, arch: archGlow.intensity };

  // ── State + update ──────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, ripple: null, focus: 0, lastBeat: -1, barColor: 0, solo: null,
    sauce: 0, gold: 0, boom: 0, cheese: 0, spot: null, bulbs: 0, rainbow: 0, dark: 0, flagSpin: 0 };
  const dummy = new THREE.Object3D();
  const cA = new THREE.Color(), cB = new THREE.Color(), dim = new THREE.Color(0x1a0d28), sauceC = new THREE.Color(0xff3a0a), goldC = new THREE.Color(0xffd060);

  function update(dt, info) {
    const { beat } = info;
    const ph = ((beat % 1) + 1) % 1;
    const onBeat = Math.exp(-ph * 6);
    const whole = Math.floor(beat);
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.5);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    // SOLO TIME: the house lights drop and every spotlight lands on the soloist.
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const st = info.songTime, so = state.solo;
      soloK = Math.min(1, Math.max(0, (st - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - st) / 0.5));
      soloX = so.x;
      if (st > so.t1) state.solo = null;
    }
    if (whole !== state.lastBeat) {
      state.lastBeat = whole;
      if (whole % 4 === 0) state.barColor = (state.barColor + 1) % PALETTE.length;
    }

    // Tiles: checker pulse on the beat + ripple from the last big move.
    state.sauce = Math.max(0, state.sauce - dt * 1.4);
    state.gold = Math.max(0, state.gold - dt * 2.5);
    state.boom = Math.max(0, state.boom - dt * 3);
    state.cheese = Math.max(0, state.cheese - dt * 1.5);
    state.bulbs = Math.max(0, state.bulbs - dt);
    state.rainbow = Math.max(0, state.rainbow - dt);
    state.dark = Math.max(0, state.dark - dt * 0.25);
    const flagK = springT(springsT.flag, dt, 1.1, 0.15), coneK = springT(springsT.cone, dt, 1.4, 0.25), signK = springT(springsT.sign, dt, 2.2, 0.2), archK = springT(springsT.arch, dt, 2.6, 0.25);
    const spot = state.spot, spAge = spot ? info.songTime - spot.t : 0;
    if (spot && spAge > 0.7) state.spot = null;
    const Ld = L * (1 - 0.7 * state.dark);
    cA.set(PALETTE[state.barColor]); cB.set(PALETTE[(state.barColor + 2) % PALETTE.length]);
    tiles.forEach((t, i) => {
      const checker = ((t.ix + t.iz + whole) & 1) === 0;
      let k = (checker ? 0.25 + 0.65 * onBeat : 0.12) * L;
      if (state.ripple) {
        const r = (info.songTime - state.ripple.t) * 7;
        const d = Math.hypot(t.x - state.ripple.x, t.z);
        const band = Math.exp(-Math.pow((d - r) * 1.8, 2));
        k = Math.max(k, band * (1 - Math.min(1, r / 10)) * L);
      }
      if (soloK > 0) {
        const near = Math.exp(-Math.pow(Math.hypot(t.x - soloX, t.z) / 1.3, 2));
        k = k * (1 - 0.75 * soloK) + soloK * near * (0.6 + 0.4 * onBeat);
      }
      k *= 1 - 0.7 * state.dark;
      col.copy(dim).lerp(checker ? cA : cB, Math.min(1, k)).multiplyScalar(0.6 + 0.8 * k + state.flash * 0.4);
      if (state.sauce > 0.02) col.lerp(sauceC, state.sauce * 0.55);
      if (state.gold > 0.02) col.lerp(goldC, state.gold * 0.4);
      if (spot) { const g = Math.exp(-Math.pow(Math.hypot(t.x - spot.x, t.z - 0.8) * 1.5, 2)) * (1 - spAge / 0.7); if (g > 0.02) col.lerp(goldC, g * 0.8); }
      tileMesh.setColorAt(i, col);
    });
    tileMesh.instanceColor.needsUpdate = true;

    // Spotlight cones swing to the dancers; the leader gets the brighter one.
    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(info.songTime * 0.9 + i * 1.7) * 0.25;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 7.0) + coneK * (i < 2 ? 1 : -1) * 0.6;
      c.cone.rotation.x = -0.12;
      coneMats[i].color.set(PALETTE[(state.barColor + i) % PALETTE.length]);
      if (state.rainbow > 0) coneMats[i].color.setHSL((info.songTime * 1.3 + i * 0.25) % 1, 1, 0.6);
      coneMats[i].opacity = (0.025 + 0.045 * onBeat + 0.05 * lead + 0.1 * state.flash + 0.12 * Math.min(1, Math.abs(coneK)) + 0.08 * state.sauce) * Ld * (1 - 0.35 * soloK);
    });

    // Flags sway, bulbs twinkle, cheese drips, speakers pump.
    state.flagSpin = Math.max(0, state.flagSpin - dt);
    for (const f of flags) f.mesh.rotation.x = Math.sin(info.songTime * 2.2 + f.phase) * 0.35 + flagK * Math.sin(f.phase * 1.3 + 1) + (state.flagSpin > 0 ? state.flagSpin * 6 + f.phase : 0);
    const chase = state.bulbs > 0 ? Math.floor(info.songTime * 16) : -1;
    bulbs.forEach((b, i) => { b.visible = state.dark < 0.6 && L > 0.2 && (chase >= 0 ? (i + chase) % 4 !== 0 : ((i + whole) % 3 !== 0 || onBeat > 0.5)); });
    cheeseStrands.forEach((c, i) => { c.scale.y = 1 + 0.25 * Math.sin(info.songTime * 3 + i) + state.cheese * (1.5 + (i % 3) * 0.5); c.position.y = c.userData.y0 - state.cheese * 0.4 * (1 + (i % 3) * 0.3); });
    const pump = 1 + 0.18 * onBeat * L + state.boom * 0.3;
    for (const w of speakers) w.scale.set(pump, 1, pump);
    ringMat.color.set(state.boom > 0.3 ? 0xffe070 : 0xff3d7f);
    sign.material.opacity = L * (0.85 + 0.15 * onBeat) * ((Math.sin(info.songTime * 17) > 0.97) ? 0.4 : 1) * (1 - 0.7 * state.dark);
    sign.rotation.z = signK * 0.25;
    if (state.rainbow > 0) sign.material.color.setHSL((info.songTime * 2) % 1, 1, 0.7); else sign.material.color.setRGB(1, 1, 1);
    arch.scale.set(1 + archK * 0.06, 1 - archK * 0.08, 1);
    sky.material.uniforms.uPulse.value = onBeat * 0.6 * L + state.flash + state.gold * 0.8;
    sky.material.uniforms.uSauce.value = state.sauce * 0.45;
    sun.rotation.z += dt * 0.02;

    // Crowd bounce, arms up when hyped, lean toward the leader.
    const hype = Math.min(1, 0.35 + state.cheer + Math.abs(state.focus) * 0.3);
    crowdSpots.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.phase * 0.3)) * (0.08 + 0.35 * hype * c.hype) * L;
      const lean = state.focus * 0.15 * Math.sign(-c.x || 1);
      dummy.position.set(c.x, c.y + 0.55 + jump, c.z);
      dummy.rotation.set(0, Math.atan2(-c.x, -c.z + 8) * 0.3, lean);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.62;
      dummy.updateMatrix();
      headMesh.setMatrixAt(i, dummy.matrix);
      const armUp = hype > 0.6 ? 2.6 : 0.4 + 0.3 * Math.sin(beat * Math.PI + c.phase);
      for (const s of [-1, 1]) {
        dummy.position.set(c.x + s * 0.28, c.y + 0.85 + jump, c.z);
        dummy.rotation.set(0, 0, s * armUp);
        dummy.updateMatrix();
        armMesh.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
      }
    });
    bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = armMesh.instanceMatrix.needsUpdate = true;

    // Confetti + tacos
    for (let i = 0; i < CONF; i++) {
      if (confLife[i] <= 0) continue;
      confLife[i] -= dt;
      confPos[i * 3] += (confVel[i * 3] + Math.sin(info.songTime * 3 + i) * 0.4) * dt;
      confPos[i * 3 + 1] += confVel[i * 3 + 1] * dt;
      confPos[i * 3 + 2] += confVel[i * 3 + 2] * dt;
      if (confLife[i] <= 0 || confPos[i * 3 + 1] < 0) { confLife[i] = 0; confPos[i * 3 + 1] = -100; }
    }
    confGeo.attributes.position.needsUpdate = true;
    for (const t of tacos) {
      if (t.life <= 0) continue;
      t.life -= dt;
      t.v.y -= 9 * dt;
      t.obj.position.addScaledVector(t.v, dt);
      t.obj.rotation.z += t.spin * dt;
      t.obj.rotation.x += t.spin * 0.5 * dt;
      if (t.splat && t.v.y < 0 && t.obj.position.y < 0.08) {
        const p = t.obj.position;
        if (Math.hypot(p.x, p.z) < 4.4) { addSplat(p.x, p.z, 1); burstChips(4, p.x, p.z, 0.5); }
        t.life = 0;
      }
      if (t.life <= 0) t.obj.visible = false;
    }
    // Splats grow in, sit, then shrink away.
    if (splatsLive > 0) {
      splats.forEach((sp, i) => {
        if (sp.age >= 99) return;
        sp.age += dt;
        const k = sp.age < 0.12 ? sp.age / 0.12 * 1.15 : sp.age < 4 ? 1 : Math.max(0, 1 - (sp.age - 4) / 0.8);
        if (sp.age > 4.8) { sp.age = 99; splatsLive--; splatMesh.setMatrixAt(i, hideM); return; }
        dummy.position.set(sp.x, 0.045, sp.z); dummy.rotation.set(-Math.PI / 2, 0, sp.rot);
        dummy.scale.set(sp.size * k, sp.size * k * 0.8, 1); dummy.updateMatrix();
        splatMesh.setMatrixAt(i, dummy.matrix);
      });
      splatMesh.instanceMatrix.needsUpdate = true;
    }
    // Tortilla chips: fly, tumble, bounce, fade.
    if (chipsLive > 0) {
      for (let i = 0; i < CHIP; i++) {
        if (chipLife[i] <= 0) continue;
        chipLife[i] -= dt;
        const j = i * 3;
        chipV[j + 1] -= 9 * dt;
        chipP[j] += chipV[j] * dt; chipP[j + 1] += chipV[j + 1] * dt; chipP[j + 2] += chipV[j + 2] * dt;
        if (chipP[j + 1] < 0.06) { chipP[j + 1] = 0.06; chipV[j + 1] *= -0.35; chipV[j] *= 0.6; chipV[j + 2] *= 0.6; chipR[i * 2 + 1] *= 0.5; }
        chipR[i * 2] += chipR[i * 2 + 1] * dt;
        if (chipLife[i] <= 0) { chipsLive--; chipMesh.setMatrixAt(i, hideM); continue; }
        dummy.position.set(chipP[j], chipP[j + 1], chipP[j + 2]);
        dummy.rotation.set(chipR[i * 2], chipR[i * 2] * 0.7, chipR[i * 2] * 0.3);
        dummy.scale.setScalar(Math.min(1, chipLife[i] * 3));
        dummy.updateMatrix();
        chipMesh.setMatrixAt(i, dummy.matrix);
      }
      chipMesh.instanceMatrix.needsUpdate = true;
    }
    // Shockwave rings.
    for (const r of ringsFx) {
      if (r.age >= 99) continue;
      r.age += dt;
      if (r.age < 0) continue;
      const u = r.age / 0.9;
      if (u >= 1) { r.age = 99; r.mesh.visible = false; continue; }
      r.mesh.visible = true;
      r.mesh.scale.setScalar(1.5 + u * r.max);
      r.mat.opacity = (1 - u) * 0.85 * L;
    }

    // Lights
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = baseIntensity.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = baseIntensity.key * L * (1 - 0.45 * soloK);
    rimL.intensity = baseIntensity.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = baseIntensity.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    archGlow.intensity = baseIntensity.arch * L * (0.8 + 0.5 * onBeat + state.flash + state.gold * 1.5 + state.sauce * 1.5) * (1 - 0.6 * state.dark);
    shellMat.emissive.setRGB((0.23 * (0.4 + onBeat * 0.6) + state.sauce * 0.35 + state.gold * 0.3) * L, (0.1 + state.gold * 0.2) * L, 0);
    if (state.dark > 0) { hemi.intensity *= 1 - 0.6 * state.dark; key.intensity *= 1 - 0.6 * state.dark; }
  }

  // Stage reactions to battle events.
  // Tetris backdrop piece actions (the old 2D food fight: customers wind
  // up and throw on input, chip burst + golden flash + a food volley on
  // hard drops, hot-sauce flash + shockwave rings + a full salvo on clears).
  function piece(d) {
    const x = colX(d.col), t = d.songTime || 0;
    switch (d.kind) {
      case 'move':
        springsT.flag[1] += (d.dir || 1) * 1.6;
        if (Math.random() < 0.45) lobTaco(d.dir || 1, x + (Math.random() - 0.5), 0.6 + Math.random() * 1.6, 0.9);
        break;
      case 'rotate':
        springsT.cone[1] += (d.dir || 1) * 3;
        springsT.sign[1] += (d.dir || 1) * 4;
        break;
      case 'soft':
        state.cheese = Math.min(1, state.cheese + 0.35);
        state.spot = { t, x };
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.25 + r / 14);
        burstChips(Math.round(8 + r * 2.5), x, 0.8, 0.7 + 0.5 * k);
        state.gold = Math.max(state.gold, 0.4 + 0.6 * k);
        state.boom = Math.max(state.boom, 0.5 + 0.5 * k);
        springsT.arch[1] += 1.5 * k;
        if (r >= 6) for (let i = 0; i < Math.min(5, Math.floor(r / 4)); i++) lobTaco(i % 2 ? 1 : -1, (Math.random() - 0.5) * 6, Math.random() * 2.5, 0.8 + Math.random() * 0.4);
        break;
      }
      case 'hold':
        springsT.arch[1] += 4;
        state.bulbs = 1.2;
        springsT.sign[1] -= 3;
        break;
      case 'clear': {
        const n = Math.max(1, Math.min(4, d.lines || 1)), c = Math.max(0, d.combo || 0);
        state.sauce = Math.min(1.2, state.sauce + [0, 0.35, 0.55, 0.78, 1][n] + Math.min(0.4, c * 0.12));
        state.cheer = Math.min(1, state.cheer + 0.3 + n * 0.15);
        const rings = Math.min(3, n === 4 ? 3 : 1 + (c >= 2 ? 1 : 0) + (n >= 3 ? 1 : 0));
        for (let i = 0; i < rings; i++) shockRing(i * 0.14, 6 + n * 1.5);
        const salvo = Math.min(10, n * 2 + c);
        for (let i = 0; i < salvo; i++) lobTaco(i % 2 ? 1 : -1, (Math.random() - 0.5) * 7, Math.random() * 3, 0.8 + Math.random() * 0.5);
        springsT.flag[1] += 2 + n;
        if (n >= 4) { burstChips(40, -2.5, 0.8, 1.3); burstChips(40, 2.5, 0.8, 1.3); burstConfetti(120, 0, 8); state.gold = 1; }
        else if (c >= 3) burstConfetti(30 + c * 10, x, 4);
        break;
      }
      case 'levelUp':
        state.rainbow = 3.5; state.flagSpin = 1.2; state.cheer = 1; state.bulbs = 3;
        burstConfetti(160, 0, 9);
        shockRing(0, 10); shockRing(0.2, 10);
        for (let i = 0; i < 6; i++) lobTaco(i % 2 ? 1 : -1, (Math.random() - 0.5) * 6, Math.random() * 2.5, 0.9 + i * 0.12);
        break;
      case 'gameOver':
        state.dark = 1; state.sauce = 0; state.rainbow = 0;
        break;
      case 'start':
        state.dark = 0; state.gold = 1; state.bulbs = 1.5; springsT.arch[1] += 3;
        break;
    }
  }

  function react(type, data = {}) {
    if (type === 'piece') { piece(data); return; }
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.ripple = { t: data.songTime, x }; state.cheer = Math.min(1, state.cheer + 0.35); }
        if (data.tier >= 4) { burstConfetti(60, x, 3); state.flash = 0.6; }
        break;
      case 'tauntLanded':
        burstConfetti(90, data.attacker === 'rival' ? 1.6 : -1.6, 4);
        throwTacos(4, data.attacker === 'rival' ? -1 : 1);
        state.flash = 1; state.cheer = 1;
        break;
      case 'dodge':
        state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5;
        throwTacos(2);
        break;
      case 'taunt':
        state.flash = 0.4;
        break;
      case 'end':
        burstConfetti(200, x, 6); throwTacos(6); state.cheer = 1; state.flash = 1;
        break;
      case 'drop':
        state.flash = 1; burstConfetti(80, 0, 8);
        break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1;
        burstConfetti(90, x, 3);
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update,
    react,
    setLightLevel(v) { state.lightLevel = Math.max(0, Math.min(1, v)); },
    dispose() {
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
  };
}
