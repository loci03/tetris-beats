// WORK — the living Tetris world: an open-plan office after hours, seen
// from your desk. Rows of cubicles run down to a wall of night windows,
// fluorescent panels hum overhead, co-workers hunch over glowing monitors,
// the "FUCK WORK" neon flickers on the back wall, the calendar keeps
// flipping, a wall clock ticks, the copier hums, papers drift through the
// air, sticky notes cling to your monitors and your coffee sits by the
// keyboard — the old 2D office-rage scene in 3D.
//
// Reactions: moves = papers whoosh off your desk that way, the sticky notes
// shake, your mouse cursor darts; rotations spin the co-workers' swivel
// chairs (and the desk fan); soft drops = a typing burst (monitor text
// scrolls, coffee ripples); hard drops = the fluorescents flicker and the
// neon cuts out, the desk jolts (mug hops), a paper stack topples (scaled
// by rows); holds fire the copier (paper stream); clears grow the coffee
// stain and flip the calendar (one day per line), co-workers rage with
// their arms up, the inbox counter climbs; a Tetris is a paper storm with
// every monitor flashing and the clock spinning; combos speed the calendar
// and frenzy the cursor; level up rings 5 o'clock (clock spins, confetti
// from the vents, monitors party); a high stack = DEADLINE: red alarm
// strobes and red screens; game over kills the lights (monitors to
// screensavers); start flickers the panels back on row by row.

import { makeKit } from '../underground/tetris-kit.js';

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const K = makeKit(THREE), keep = K.keep;
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0x0a121c, 16, 42);
  scene.background = new THREE.Color(0x060a10);
  camera.far = 120; camera.updateProjectionMatrix();
  const root = new THREE.Group();
  scene.add(root);
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const lamV = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const addMat = (color, opacity = 1, map = null) => keep(new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const W = 10, BACK = -22, H = 4.2;

  // ── Room ────────────────────────────────────────────────────────
  const carpet = K.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#2a3442'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,140,170' : '0,0,10'},${Math.random() * 0.15})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(10, 16);
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(2 * W, 34)), keep(new THREE.MeshLambertMaterial({ map: carpet }))); floor.rotation.x = -Math.PI / 2; floor.position.z = -5; root.add(floor);
  const ceil = new THREE.Mesh(keep(new THREE.PlaneGeometry(2 * W, 34)), keep(new THREE.MeshLambertMaterial({ color: 0x3a4250 }))); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -5); root.add(ceil);
  const wallMat = keep(new THREE.MeshLambertMaterial({ color: 0x24384c }));
  for (const sx of [-1, 1]) { const s = new THREE.Mesh(keep(new THREE.PlaneGeometry(34, H)), wallMat); s.position.set(sx * W, H / 2, -5); s.rotation.y = -sx * Math.PI / 2; root.add(s); }
  // Back wall: window band with the night city behind.
  const cityTex = K.canvasTex(512, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1430'); gr.addColorStop(1, '#2a2040'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    let x = 0; while (x < w) { const bw = 14 + Math.random() * 30, bh = 30 + Math.random() * 80; g.fillStyle = '#0a0e18'; g.fillRect(x, h - bh, bw, bh); g.fillStyle = 'rgba(255,220,140,0.8)'; for (let yy = h - bh + 4; yy < h - 3; yy += 6) for (let xx = x + 2; xx < x + bw - 2; xx += 5) if (Math.random() < 0.3) g.fillRect(xx, yy, 2, 3); x += bw + 2; }
  });
  const city = new THREE.Mesh(keep(new THREE.PlaneGeometry(2 * W, 2.2)), basic(0xffffff, { map: cityTex, fog: false })); city.position.set(0, 2.3, BACK - 0.05); root.add(city);
  const B = new K.Builder();
  B.box(2 * W, 1.2, 0.2, 0, 0.6, BACK, 0x1e3044).box(2 * W, 0.8, 0.2, 0, H - 0.4, BACK, 0x1e3044);
  for (let x = -W; x <= W; x += 2.5) B.box(0.12, 2.2, 0.15, x, 2.3, BACK + 0.05, 0x101820);
  // Cubicle rows: partitions (grey fabric) + desks on both sides of the aisle.
  const cubs = [];
  for (let r = 0; r < 6; r++) {
    const z = 1.5 - r * 3.4;
    for (const sx of [-1, 1]) for (let c = 0; c < 2; c++) {
      const x = sx * (2.6 + c * 3.3);
      B.box(3.1, 1.25, 0.08, x, 0.62, z - 1.5, 0x7a8696).box(0.08, 1.25, 3.0, x + sx * 1.55, 0.62, z, 0x748090);
      B.box(2.6, 0.06, 0.9, x, 0.75, z - 1.0, 0x8a8478);
      B.box(0.7, 0.45, 0.06, x, 1.05, z - 1.3, 0x14161a);
      cubs.push({ x, z, r, sx });
    }
  }
  // Foreground: your desk + two monitors at the screen edges, keyboard, mug.
  B.box(9, 0.1, 2.2, 0, 1.0, 6.8, 0xa49a88).box(9, 0.9, 0.1, 0, 0.5, 5.8, 0x6a6458);
  for (const sx of [-1, 1]) { B.box(1.9, 1.2, 0.1, sx * 3.4, 1.72, 6.5, 0x111216, 0, -sx * 0.4, 0); B.box(0.1, 0.35, 0.1, sx * 3.35, 1.2, 6.6, 0x2a2a30); B.box(0.6, 0.04, 0.4, sx * 3.35, 1.06, 6.65, 0x2a2a30); }
  B.box(1.9, 0.05, 0.6, 0, 1.08, 6.9, 0x2a2c32);
  // Copier (right wall), water cooler, pillar with calendar (left).
  B.box(1.3, 1.2, 1.0, 8.6, 0.6, -6, 0xc8c8c0).box(1.3, 0.1, 1.0, 8.6, 1.25, -6, 0x5a5a60).box(1.0, 0.06, 0.5, 8.0, 0.95, -6, 0xe0e0d8);
  B.cyl(0.25, 0.25, 0.9, 10, 8.9, 0.45, -10, 0xd0d0d0).cyl(0.22, 0.2, 0.55, 10, 8.9, 1.2, -10, 0x6aa8e0);
  B.box(1.0, H, 1.0, -7.5, H / 2, -4, 0x2c4056);
  root.add(new THREE.Mesh(B.build(), lamV));

  // Fluorescent ceiling panels (flicker).
  const panels = [];
  for (let r = 0; r < 8; r++) for (const x of [-5, 0, 5]) panels.push({ x, z: 4 - r * 3.4, r });
  const panelMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(2.2, 0.7)), basic(0xffffff, { fog: true }), panels.length);
  panels.forEach((p, i) => { dummy.position.set(p.x, H - 0.02, p.z); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); panelMesh.setMatrixAt(i, dummy.matrix); });
  root.add(panelMesh);

  // Co-workers (instanced, vertex-animated), seated facing their monitors.
  const SK = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22], SH = [0xe8e8f0, 0x6a8ab0, 0x404858, 0xc8b8a0, 0x8a4a4a, 0x3a5a4a];
  const spots = cubs.filter((c, i) => (i * 7) % 5 !== 0).map((c, i) => ({ x: c.x + (Math.random() - 0.5) * 0.4, y: 0.05, z: c.z - 0.2, yaw: Math.PI, s: 0.95, shirt: SH[i % 6], skin: SK[(i * 3) % 5] }));
  const crowd = K.makeCrowd(spots, { lowPoly: low });
  crowd.u.uKey.value.setRGB(0.35, 0.4, 0.5); crowd.u.uAmb.value.setRGB(0.18, 0.2, 0.26); crowd.u.uRimL.value.setRGB(0.1, 0.2, 0.35); crowd.u.uRimR.value.setRGB(0.1, 0.2, 0.35);
  crowd.u.uBounce.value = 0.2;
  root.add(crowd.mesh);
  // Swivel chairs behind them (spin on rotations).
  const chairGeo = (() => { const b = new K.Builder(); b.cyl(0.3, 0.3, 0.08, 10, 0, 0.45, 0, 0x1a1a20).box(0.55, 0.6, 0.08, 0, 0.8, 0.28, 0x1a1a20).cyl(0.04, 0.04, 0.4, 5, 0, 0.22, 0, 0x404040); for (let i = 0; i < 5; i++) { const a = i * 1.2566; b.box(0.4, 0.04, 0.05, Math.cos(a) * 0.2, 0.03, Math.sin(a) * 0.2, 0x303030, 0, -a, 0); } return b.build(); })();
  const chairs = new THREE.InstancedMesh(chairGeo, lamV, spots.length);
  root.add(chairs);
  const chairSpin = new Float32Array(spots.length), chairV = new Float32Array(spots.length);
  // Their monitors' screens (glow; colour per state).
  const scrMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.62, 0.38)), basic(0xffffff, { fog: true }), cubs.length);
  cubs.forEach((c, i) => { dummy.position.set(c.x, 1.06, c.z - 1.26); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); scrMesh.setMatrixAt(i, dummy.matrix); });
  root.add(scrMesh);

  // ── Your monitors (left: spreadsheet + cursor; right: inbox) ─────
  const sheetTex = K.canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#e8eef4'; g.fillRect(0, 0, w, h); g.fillStyle = '#217346'; g.fillRect(0, 0, w, 14);
    g.strokeStyle = '#b0bcc8'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, h); g.stroke(); } for (let y = 14; y < h; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#334'; g.font = '8px monospace'; for (let y = 22; y < h; y += 10) for (let x = 3; x < w; x += 32) if (Math.random() < 0.7) g.fillText(String(Math.random() * 9999 | 0), x, y);
    g.fillStyle = '#d02020'; g.font = 'bold 9px sans-serif'; g.fillText('Q3 TARGETS — OVERDUE', 70, 10);
  });
  sheetTex.wrapT = THREE.RepeatWrapping;
  let unread = 247;
  const inboxCanvas = document.createElement('canvas'); inboxCanvas.width = 256; inboxCanvas.height = 160;
  const inboxTex = keep(new THREE.CanvasTexture(inboxCanvas)); inboxTex.colorSpace = THREE.SRGBColorSpace;
  const drawInbox = (redAlert) => {
    const g = inboxCanvas.getContext('2d');
    g.fillStyle = redAlert ? '#400808' : '#f0f2f6'; g.fillRect(0, 0, 256, 160); g.fillStyle = redAlert ? '#c01010' : '#2a5cc8'; g.fillRect(0, 0, 256, 18);
    g.fillStyle = '#fff'; g.font = 'bold 11px sans-serif'; g.fillText(redAlert ? '!! DEADLINE !!' : 'Inbox', 6, 13);
    g.fillStyle = '#e03030'; g.beginPath(); g.arc(226, 9, 9, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText(String(unread), 226, 12); g.textAlign = 'left';
    const subj = ['RE: RE: RE: TPS reports', 'URGENT: synergy sync', 'Mandatory fun Friday', 'Who took my yogurt', 'Per my last email…', 'Quick call? (2h)', 'Q3 numbers ASAP', 'Reply-all disaster'];
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? (redAlert ? '#501010' : '#e4e8ee') : (redAlert ? '#400808' : '#f8f9fb'); g.fillRect(0, 20 + i * 11.5, 256, 11.5); g.fillStyle = i < 3 ? (redAlert ? '#ff8080' : '#101a30') : (redAlert ? '#c06060' : '#6a7080'); g.font = (i < 3 ? 'bold ' : '') + '9px sans-serif'; g.fillText(subj[(i + unread) % subj.length], 6, 29 + i * 11.5); }
    inboxTex.needsUpdate = true;
  };
  drawInbox(false);
  const screenL = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.76, 1.06)), basic(0xffffff, { map: sheetTex, fog: false }));
  screenL.position.set(-3.4, 1.72, 6.56); screenL.rotation.y = 0.4; root.add(screenL);
  const screenR = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.76, 1.06)), basic(0xffffff, { map: inboxTex, fog: false }));
  screenR.position.set(3.4, 1.72, 6.56); screenR.rotation.y = -0.4; root.add(screenR);
  const cursorGeo = keep(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, -0.16), new THREE.Vector2(0.04, -0.12), new THREE.Vector2(0.08, -0.19), new THREE.Vector2(0.1, -0.18), new THREE.Vector2(0.06, -0.11), new THREE.Vector2(0.12, -0.1)])));
  const cursor = new THREE.Mesh(cursorGeo, basic(0x000000, { fog: false })); cursor.position.z = 0.01; screenL.add(cursor);
  const cur = { x: 0, y: 0, tx: 0, ty: 0 };
  // Sticky notes round your monitors.
  const PHR = ['DO IT', 'OVERDUE', 'DUE 5pm', 'FOLLOW UP', 'LATE', 'FIRE!!', 'EOD'];
  const stickyTex = K.canvasTex(512, 64, (g) => { PHR.forEach((p, i) => { g.fillStyle = ['#ffe866', '#ffb0d0', '#a8f0a0', '#ffe866', '#ffc070', '#ffe866', '#a8d8ff'][i]; g.fillRect(i * 73 + 1, 1, 71, 62); g.fillStyle = '#222'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(p, i * 73 + 36, 36); g.fillStyle = '#c02020'; g.beginPath(); g.arc(i * 73 + 36, 8, 4, 0, 7); g.fill(); }); });
  const stickies = [];
  const SPOS = [[-4.25, 2.25, 6.95, 0.4], [-2.6, 2.3, 6.25, 0.4], [-4.3, 1.25, 7.0, 0.4], [4.25, 2.3, 6.95, -0.4], [2.6, 2.3, 6.25, -0.4], [4.3, 1.3, 7.0, -0.4], [-2.5, 1.2, 6.2, 0.4]];
  SPOS.forEach((p, i) => {
    const g = keep(new THREE.PlaneGeometry(0.42, 0.38)); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (i * 73 + 1 + uv.getX(k) * 71) / 512);
    const m = new THREE.Mesh(g, basic(0xffffff, { map: stickyTex, fog: false, side: THREE.DoubleSide })); m.position.set(p[0], p[1], p[2] + 0.02); m.rotation.set(0, p[3], (Math.random() - 0.5) * 0.3); root.add(m);
    stickies.push({ m, base: m.rotation.z, x: p[0], y: p[1] });
  });
  // Coffee mug, coffee surface + the growing stain.
  const mug = new THREE.Group(); mug.position.set(1.6, 1.05, 7.0); root.add(mug);
  { const b = new K.Builder(); b.cyl(0.16, 0.14, 0.34, 14, 0, 0.17, 0, 0xf0ece0); b.add(new THREE.TorusGeometry(0.09, 0.025, 6, 10), 0.18, 0.18, 0, 0xf0ece0); mug.add(new THREE.Mesh(b.build(), lamV)); }
  const coffee = new THREE.Mesh(keep(new THREE.CircleGeometry(0.14, 14)), keep(new THREE.MeshLambertMaterial({ color: 0x3a1c0a }))); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.3; mug.add(coffee);
  const stainTex = K.canvasTex(128, 128, (g) => { g.fillStyle = 'rgba(70,34,12,0.9)'; g.beginPath(); g.ellipse(64, 64, 40, 28, 0, 0, 7); g.ellipse(84, 68, 22, 16, 0.4, 0, 7); g.ellipse(44, 70, 20, 14, -0.3, 0, 7); g.fill(); g.strokeStyle = 'rgba(30,14,4,0.9)'; g.lineWidth = 4; g.stroke(); });
  const stain = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshLambertMaterial({ map: stainTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));
  stain.rotation.x = -Math.PI / 2; stain.position.set(2.1, 1.056, 6.75); root.add(stain);
  let stainR = 0.15;
  // Neon sign, calendar, wall clock.
  const neonTex = K.canvasTex(512, 128, (g, w, h) => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 900 80px Impact, "Arial Black", sans-serif'; g.shadowColor = '#ff2890'; g.shadowBlur = 26; g.strokeStyle = '#ff4aa0'; g.lineWidth = 7; g.strokeText('FUCK WORK', w / 2, h / 2); g.shadowBlur = 10; g.fillStyle = '#ffe0f0'; g.fillText('FUCK WORK', w / 2, h / 2); });
  const neonMat = basic(0xffffff, { map: neonTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const neon = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 1.5)), neonMat); neon.position.set(-5.6, 3.55, BACK + 0.2); root.add(neon);
  const calCanvas = document.createElement('canvas'); calCanvas.width = 128; calCanvas.height = 160;
  const calTex = keep(new THREE.CanvasTexture(calCanvas)); calTex.colorSpace = THREE.SRGBColorSpace;
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  let day = 1, month = 9;
  const drawCal = () => { const g = calCanvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#cc2222'; g.fillRect(0, 0, 128, 38); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText(MONTHS[month], 64, 29); g.fillStyle = '#222'; g.font = '900 78px "Arial Black", sans-serif'; g.fillText(String(day), 64, 128); calTex.needsUpdate = true; };
  drawCal();
  const calendar = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.9, 1.12)), keep(new THREE.MeshLambertMaterial({ map: calTex, emissive: 0x333333 })));
  calendar.position.set(-7.5, 2.4, -3.48); root.add(calendar);
  const peel = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.9, 1.12)), basic(0xf4f4f0, { side: THREE.DoubleSide })); peel.geometry.translate(0, 0.56, 0); peel.position.set(-7.5, 2.96, -3.46); root.add(peel);
  const clock = new THREE.Group(); clock.position.set(4.5, 3.5, BACK + 0.2); root.add(clock);
  { const b = new K.Builder(); b.cyl(0.55, 0.55, 0.08, 24, 0, 0, 0, 0xf4f4f0, Math.PI / 2, 0, 0).add(new THREE.TorusGeometry(0.56, 0.05, 6, 24), 0, 0, 0.04, 0x202020); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; b.box(0.04, 0.1, 0.02, Math.sin(a) * 0.45, Math.cos(a) * 0.45, 0.05, 0x202020, 0, 0, -a); } clock.add(new THREE.Mesh(b.build(), lamV)); }
  const handGeo = keep(new THREE.BoxGeometry(0.04, 1, 0.02)); handGeo.translate(0, 0.5, 0);
  const hourH = new THREE.Mesh(handGeo, basic(0x111111)); hourH.scale.y = 0.28; hourH.position.z = 0.06; clock.add(hourH);
  const minH = new THREE.Mesh(handGeo, basic(0x111111)); minH.scale.y = 0.42; minH.position.z = 0.07; clock.add(minH);
  let clockT = 14.5;   // 2:30 pm
  // Copier light bar + desk fan.
  const copyLight = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.9, 0.08)), addMat(0x80ff90, 0)); copyLight.rotation.x = -Math.PI / 2; copyLight.position.set(8.6, 1.31, -6); root.add(copyLight);
  const fan = new THREE.Group(); fan.position.set(-2.4, 1.35, 7.2); fan.scale.setScalar(0.7); root.add(fan);
  { const b = new K.Builder(); b.cyl(0.03, 0.05, 0.35, 6, 0, -0.18, 0, 0x2a2a2a).cyl(0.15, 0.18, 0.04, 10, 0, -0.36, 0, 0x2a2a2a); fan.add(new THREE.Mesh(b.build(), lamV)); }
  const fanBlades = new THREE.Mesh((() => { const b = new K.Builder(); for (let i = 0; i < 3; i++) b.box(0.08, 0.24, 0.01, Math.sin(i * 2.094) * 0.12, Math.cos(i * 2.094) * 0.12, 0, 0x8aa0b8, 0, 0, -i * 2.094); return b.build(); })(), lamV); fanBlades.position.z = 0.05; fan.add(fanBlades);
  const fanCage = new THREE.Mesh(keep(new THREE.TorusGeometry(0.27, 0.012, 4, 20)), basic(0x303438)); fanCage.position.z = 0.05; fan.add(fanCage);
  fan.rotation.y = Math.PI + 0.4;
  // Alarm strobes (danger).
  const alarmMat = addMat(0xff1010, 0, K.glowTex);
  const alarms = [[-W + 0.05, 3.3, -2], [W - 0.05, 3.3, -2], [-W + 0.05, 3.3, -12], [W - 0.05, 3.3, -12]].map(p => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), alarmMat); m.position.set(...p); m.scale.setScalar(1.6); root.add(m); return m; });

  // ── Particles: papers, confetti ─────────────────────────────────
  const papers = K.makePool(low ? 90 : 160, { additive: false });
  const glows = K.makePool(40, { map: K.glowTex });
  root.add(papers.mesh, glows.mesh);
  const paper = (x, y, z, vx, vy, vz, o = {}) => papers.spawn(x, y, z, vx, vy, vz, { life: o.life || 4 + Math.random() * 2, size: o.size || 0.32, aspect: 0.77, grav: 0.9, drag: 1.1, spin: 2 + Math.random() * 4, mode: 1, color: o.color || (Math.random() < 0.85 ? 0xf5f0e8 : 0xfff09a), floor: 0.02 });
  // Ambient drifting papers.
  const ambientPaper = () => paper((Math.random() - 0.5) * 16, 0.5 + Math.random() * 3, -2 - Math.random() * 14, (Math.random() - 0.5) * 0.6, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4, { life: 6 });

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xdde8ff, 0x304050, 1.0);
  const key = new THREE.DirectionalLight(0xf0f4ff, 0.4); key.position.set(0, 8, 4);
  const screenGlow = new THREE.PointLight(0x80b0ff, 6, 6, 1.5); screenGlow.position.set(0, 2, 5.6);
  const neonL = new THREE.PointLight(0xff3090, 10, 10, 1.6); neonL.position.set(-5.6, 3.2, BACK + 1.5);
  root.add(hemi, key, screenGlow, neonL);

  // ── State ───────────────────────────────────────────────────────
  const st = {
    cheer: 0, flicker: 0, dark: 0, danger: 0, rage: 0, typing: 0, storm: 0, party: 0, start: -1, shake: 0, jolt: 0, follow: 0, frenzy: 0,
    calRate: 0, calAcc: 0, flipT: 0, clockSpin: 0, copier: 0, combo: 0, sticky: [0, 0], fanK: [0, 0], camKick: [0, 0], camDip: [0, 0], mugY: 0, mugV: 0, ripple: 0,
  };
  const colX = (c) => (c == null ? (Math.random() - 0.5) * 2 : (c - 4.5) / 4.5);
  const flipDay = () => { day++; if (day > 30) { day = 1; month = (month + 1) % 12; } drawCal(); st.flipT = 0.25; };
  const burstDesk = (dir, n) => { for (let i = 0; i < n; i++) paper(dir * (0.5 + Math.random() * 2), 1.15, 6.4 + Math.random() * 0.4, dir * (1.5 + Math.random() * 3), 1 + Math.random() * 2, -1 - Math.random() * 1.5, { size: 0.22 }); };

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, t = info.songTime || 0;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6);
    st.cheer = Math.max(0, st.cheer - dt * 0.45); st.flicker = Math.max(0, st.flicker - dt * 1.4); st.rage = Math.max(0, st.rage - dt * 0.5);
    st.typing = Math.max(0, st.typing - dt * 1.5); st.storm = Math.max(0, st.storm - dt * 0.6); st.party = Math.max(0, st.party - dt);
    st.shake = Math.max(0, st.shake - dt * 2.5); st.copier = Math.max(0, st.copier - dt); st.frenzy = Math.max(0, st.frenzy - dt * 0.6);
    st.ripple = Math.max(0, st.ripple - dt * 1.5); st.flipT = Math.max(0, st.flipT - dt);
    if (st.dark < 0.9) st.dark = Math.max(0, st.dark - dt * 0.3);
    const wasRed = st.danger > 0.5;
    st.danger += ((info.danger > 0.62 ? 1 : 0) - st.danger) * Math.min(1, dt * 2);
    const red = st.danger, cheer = Math.max(st.cheer, (info.cheer || 0) * 0.8), move = info.move || 0;
    if ((red > 0.5) !== wasRed) drawInbox(red > 0.5);
    const stickyK = K.spring(st.sticky, dt, 3, 0.15), fanK = K.spring(st.fanK, dt, 0.5, 0.6);

    // Fluorescents: hum, flicker after hard drops, die on game over, row-by-row on start.
    let startRows = 99;
    if (st.start >= 0) { st.start += dt; startRows = Math.floor(st.start * 6); if (st.start > 2) st.start = -1; }
    const flick = st.flicker > 0 && Math.random() < 0.35 ? 0.15 : 1;
    const party = st.party > 0;
    panels.forEach((p, i) => {
      let k = flick * (1 - 0.9 * st.dark) * (p.r < startRows ? 1 : 0);
      if (i === 7 && Math.sin(t * 17) > 0.9) k *= 0.3;                  // the one broken tube
      if (party) col.setHSL((t * 0.8 + i * 0.07) % 1, 0.9, 0.6); else col.setRGB(0.92, 0.96, 1);
      panelMesh.setColorAt(i, col.multiplyScalar(k * (red > 0.5 && (Math.floor(t * 4) & 1) ? 0.6 : 1)));
    });
    panelMesh.instanceColor.needsUpdate = true;
    const roomL = flick * (1 - 0.85 * st.dark) * (startRows > 7 ? 1 : startRows / 8);

    // Neon sign (cuts out on hard drops / game over).
    const neonOn = !(st.flicker > 0 && Math.random() < 0.5) && st.dark < 0.9;
    neonMat.color.setScalar(neonOn ? 0.75 + 0.25 * onBeat + cheer * 0.3 : 0.05);
    neonL.intensity = neonOn ? 8 + 4 * onBeat : 0.5;

    // Calendar flips on its own (faster on cheer / combos), more per clear.
    st.calAcc += dt * (0.25 + cheer * 3 + st.calRate);
    st.calRate = Math.max(0, st.calRate - dt * 0.8);
    if (st.calAcc >= 1) { st.calAcc = 0; flipDay(); }
    peel.visible = st.flipT > 0; peel.rotation.x = -(1 - st.flipT / 0.25) * 2.6;
    // Clock ticks (spins on Tetris / level up).
    st.clockSpin = Math.max(0, st.clockSpin - dt);
    clockT += dt * (st.clockSpin > 0 ? 3 : 1 / 600);
    minH.rotation.z = -(clockT % 1) * 6.283; hourH.rotation.z = -((clockT % 12) / 12) * 6.283;

    // Co-workers: typing hunch; rage with arms up on clears; party at level up.
    const cu = crowd.u;
    cu.uBeat.value = beat * (party ? 1 : 0.5); cu.uTime.value = t;
    cu.uHype.value = 0.15 + st.rage * 0.9 + (party ? 0.8 : 0) + st.typing * 0.2;
    cu.uArms.value = Math.min(1, st.rage * 1.2 + (party ? 1 : 0) + st.storm);
    cu.uBounce.value = 0.25 + st.rage + (party ? 1 : 0);
    cu.uDown.value = st.dark * 0.8 + (st.rage > 0.2 ? 0 : 0.35);
    cu.uLean.value += ((-(info.pieceX || 0) * 0.4) - cu.uLean.value) * Math.min(1, dt * 3);
    cu.uFlash.value = st.storm * 0.2;
    // Chairs spin.
    spots.forEach((s, i) => {
      chairV[i] *= Math.max(0, 1 - dt * 1.5); chairSpin[i] += chairV[i] * dt;
      dummy.position.set(s.x, 0, s.z + 0.35); dummy.rotation.set(0, chairSpin[i], 0); dummy.scale.setScalar(1); dummy.updateMatrix(); chairs.setMatrixAt(i, dummy.matrix);
    });
    chairs.instanceMatrix.needsUpdate = true;
    // Their screens.
    cubs.forEach((c, i) => {
      if (st.dark > 0.5) col.setRGB(0.05, 0.08, 0.2).multiplyScalar(0.5 + 0.5 * Math.sin(t + i));
      else if (red > 0.5) col.setRGB(1, 0.1, 0.1).multiplyScalar(0.6 + 0.4 * (Math.floor(t * 4 + i) & 1));
      else if (party) col.setHSL((t + i * 0.13) % 1, 1, 0.6);
      else if (st.storm > 0.3) col.setRGB(0.1, 0.25, 1).multiplyScalar(1.3);
      else col.setRGB(0.55, 0.7, 1).multiplyScalar(0.7 + 0.3 * Math.sin(t * 3 + i * 1.7) * st.typing + 0.1 * Math.sin(i));
      scrMesh.setColorAt(i, col);
    });
    scrMesh.instanceColor.needsUpdate = true;

    // Your monitors: spreadsheet scrolls when typing, cursor darts / snaps.
    sheetTex.offset.y += dt * st.typing * 0.8;
    screenL.material.color.setScalar(st.dark > 0.5 ? 0.1 : st.storm > 0.3 ? 0.6 : 1);
    if (red > 0.5) screenL.material.color.setRGB(1, 0.5, 0.5);
    screenR.material.color.setScalar(st.dark > 0.5 ? 0.1 : 1);
    if (Math.random() < dt * (0.8 + cheer * 5 + st.frenzy * 12)) { cur.tx = (Math.random() - 0.5) * 1.5; cur.ty = (Math.random() - 0.5) * 0.85; }
    const cs = Math.min(1, dt * (3 + cheer * 20 + st.frenzy * 20));
    cur.x += (cur.tx - cur.x) * cs; cur.y += (cur.ty - cur.y) * cs;
    cursor.position.set(cur.x, cur.y + 0.08, 0.01);
    // Sticky notes shake (moves, the beat).
    stickies.forEach((s, i) => { const sh = (move * 0.15 + onBeat * 0.03) * Math.sin(t * 40 + i * 3); s.m.rotation.z = s.base + sh + stickyK * 0.25 * (i % 2 ? 1 : -1); s.m.position.y = s.y + Math.abs(stickyK) * 0.01; });
    // Mug hop + coffee ripple + stain growth.
    st.mugV -= 9.8 * dt; st.mugY += st.mugV * dt; if (st.mugY < 0) { st.mugY = 0; st.mugV = Math.abs(st.mugV) > 0.4 ? -st.mugV * 0.3 : 0; if (st.mugV) st.ripple = 1; }
    mug.position.y = 1.05 + st.mugY; mug.rotation.z = st.mugY * 0.6;
    coffee.scale.setScalar(1 + 0.12 * Math.sin(t * 30) * Math.max(st.ripple, st.typing * 0.3));
    stain.scale.setScalar(stain.scale.x + (stainR - stain.scale.x) * Math.min(1, dt * 3));
    // Copier: light sweep + paper stream on hold.
    copyLight.material.opacity = st.copier > 0 ? 0.6 + 0.4 * Math.sin(t * 20) : 0.08;
    copyLight.position.z = -6 + Math.sin(t * 6) * 0.35 * (st.copier > 0 ? 1 : 0);
    if (st.copier > 0 && Math.random() < dt * 22) paper(8.0, 1.0, -6 + (Math.random() - 0.5) * 0.3, -2 - Math.random() * 2, 1.2 + Math.random(), (Math.random() - 0.5) * 1.5, { size: 0.3 });
    // Desk fan.
    fanBlades.rotation.z += dt * (8 + fanK * 30) * (1 - 0.8 * st.dark);
    // Alarms.
    alarmMat.opacity = red * (Math.sin(t * 10) > 0 ? 1 : 0.1);
    for (const a of alarms) a.quaternion.copy(camera.quaternion);
    // Papers: ambient drift, the storm.
    if (Math.random() < dt * (0.8 + move * 4)) ambientPaper();
    if (st.storm > 0) for (let i = 0; i < 3; i++) if (Math.random() < dt * 30 * st.storm) paper((Math.random() - 0.5) * 18, 0.3 + Math.random() * 1.5, -2 - Math.random() * 14, (Math.random() - 0.5) * 3, 3 + Math.random() * 4, (Math.random() - 0.5) * 2);
    if (party && Math.random() < dt * 30) papers.spawn((Math.random() - 0.5) * 16, H - 0.1, -Math.random() * 14, (Math.random() - 0.5), -0.5, 0, { life: 4, size: 0.12, aspect: 0.6, grav: 1, drag: 1.4, spin: 6, mode: 1, color: [0xff4a8a, 0xffd23f, 0x3dd0ff, 0x7aff6a, 0xffffff][Math.floor(Math.random() * 5)], floor: 0.02 });
    papers.update(dt, camera); glows.update(dt, camera);

    // Lights.
    hemi.intensity = 1.05 * roomL + 0.1;
    hemi.color.set(red > 0.5 && (Math.floor(t * 4) & 1) ? 0xff8080 : 0xdde8ff);
    key.intensity = 0.4 * roomL;
    screenGlow.intensity = st.dark > 0.5 ? 1 : 5 + st.typing * 3;
    scene.fog.color.setRGB(0.04 + 0.1 * red, 0.07, 0.11).multiplyScalar(0.4 + 0.6 * roomL);

    // ── Camera ──
    const F = K.framing(camera);
    st.follow += ((info.pieceX || 0) * 0.5 - st.follow) * Math.min(1, dt * 2);
    const kx = K.spring(st.camKick, dt, 2.2, 0.4), dip = K.spring(st.camDip, dt, 2.6, 0.45);
    const sh = st.shake, sx = (Math.random() - 0.5) * sh * 0.15, sy = (Math.random() - 0.5) * sh * 0.12;
    if (F.portrait) {
      camera.position.set(Math.sin(t * 0.13) * 0.2 + st.follow * 0.3 + kx * 0.3 + sx + 1.1, 2.4 + dip + sy, 9.0);
      camera.lookAt(st.follow * 0.2 + 1.1, 1.7 + dip * 0.5, -10);
      camera.fov = 84;
    } else {
      camera.position.set(Math.sin(t * 0.13) * 0.3 + st.follow + kx + sx, 2.5 + Math.sin(t * 0.21) * 0.08 + dip + sy, 10.3 + Math.sin(t * 0.09) * 0.2);
      camera.lookAt(st.follow * 0.6 + kx * 0.4, 1.8 + dip * 0.5, -10);
      camera.fov = 58;
    }
    camera.rotateZ(Math.sin(t * 0.17) * 0.008 + kx * 0.015);
    camera.updateProjectionMatrix();
  }

  function react(kind, d = {}) {
    const x = colX(d.col);
    switch (kind) {
      case 'move':
        burstDesk(d.dir || 1, 2 + Math.floor(Math.random() * 2));
        st.sticky[1] += (d.dir || 1) * 2.5; cur.tx = Math.max(-0.75, Math.min(0.75, cur.tx + (d.dir || 1) * 0.35));
        st.camKick[1] += (d.dir || 1) * 0.3;
        break;
      case 'rotate':
        spots.forEach((s, i) => { if ((i + Math.floor(Math.random() * 3)) % 3 === 0) chairV[i] += (d.dir || 1) * (6 + Math.random() * 6); });
        st.fanK[1] += 2;
        break;
      case 'soft':
        st.typing = Math.min(1, st.typing + 0.4); st.ripple = Math.max(st.ripple, 0.4); st.camDip[1] -= 0.15;
        break;
      case 'drop': {
        const r = d.rows || 0, k = Math.min(1, 0.25 + r / 14);
        st.flicker = Math.max(st.flicker, 0.3 + 0.7 * k); st.shake = Math.max(st.shake, 0.3 + 0.7 * k);
        st.mugV = 1.2 + 1.5 * k; st.camDip[1] -= 0.4 * k;
        for (let i = 0; i < Math.round(3 + r * 0.9); i++) paper(x * 2.5 + (Math.random() - 0.5), 1.2 + Math.random() * 0.3, 6.2, (Math.random() - 0.5) * 4, 1.5 + Math.random() * 3 * k, -2 - Math.random() * 2.5, { size: 0.22 });
        break;
      }
      case 'hold':
        st.copier = 1.4;
        break;
      case 'clear': {
        const n = Math.max(1, Math.min(4, d.lines || 1)), c = Math.max(0, d.combo || 0);
        st.combo = c;
        st.cheer = Math.min(1.2, Math.max(st.cheer, [0, 0.35, 0.55, 0.78, 1][n] + Math.min(0.4, c * 0.12)));
        stainR = Math.min(1.6, stainR + 0.08 + 0.05 * n + 0.02 * c);
        for (let i = 0; i < n; i++) flipDay();
        st.rage = Math.min(1.2, st.rage + 0.3 + 0.2 * n); st.calRate += 2 + c * 1.5;
        unread += n * 7 + c * 5; drawInbox(st.danger > 0.5);
        if (c >= 2) st.frenzy = 1 + c * 0.2;
        if (n >= 4) { st.storm = 1.4; st.clockSpin = 1.5; st.shake = 0.8; for (let i = 0; i < 30; i++) paper((Math.random() - 0.5) * 6, 1.2, 6.0, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, -2 - Math.random() * 3, { size: 0.24 }); }
        break;
      }
      case 'levelUp':
        st.party = 4; st.clockSpin = 2; st.rage = 1;
        break;
      case 'gameOver':
        st.dark = 1; st.party = 0; st.storm = 0;
        break;
      case 'start':
        st.dark = 0; st.start = 0;
        break;
    }
  }

  return {
    update, react,
    dispose() { scene.remove(root); scene.fog = prevFog; scene.background = prevBg; K.dispose(); },
  };
}
