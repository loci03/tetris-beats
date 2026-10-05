// TRUMPETS PLEASE — a 1930s velvet-curtain jazz club. Black-lacquer stage
// with a gold art-deco sunburst, marquee bulbs chasing round the apron,
// a deco band shell whose rings light up on the beat, the house band
// swinging on the riser (trumpet, sax, trombone, upright bass, drums),
// a neon sign, spotlights cutting through the haze, smoke rings drifting
// up, and candle-lit tables of patrons snapping along down front.
// Everything that moves is driven by the music clock via update().

import * as THREE from '../../../vendor/three/three.module.min.js';

const GOLD = 0xf5b829, PLUM = 0x3a0f3e, VELVET = 0x7a1048, NEON = 0xff3d9a;
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (x) => ((x % 1) + 1) % 1;

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
    const t = new THREE.DataTexture(new Uint8Array([80, 165, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = group) => { const m = new THREE.Mesh(keep(geo), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const goldMat = toon(GOLD, { emissive: 0x3a2400 });
  const velvet = toon(VELVET, { emissive: 0x1a0010 });
  const dark = toon(0x1a0e1e);

  // ── Room: deep plum haze ─────────────────────────────────────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(70, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uLight: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse; uniform float uLight;
      void main(){
        float h = vP.y;
        vec3 c = mix(vec3(0.14,0.03,0.12), vec3(0.03,0.01,0.04), smoothstep(-0.1, 0.5, h));
        c += vec3(0.3,0.05,0.2) * uPulse * smoothstep(0.45, 0.0, abs(h - 0.12));
        gl_FragColor = vec4(c * (0.35 + 0.65 * uLight), 1.0);
      }`,
  })));
  group.add(sky);
  // Back wall: velvet drape all the way across.
  const curtainGeo = (w, h, folds, amp) => {
    const geo = new THREE.PlaneGeometry(w, h, folds * 4, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / w + 0.5) * folds * TAU) * amp);
    geo.computeVertexNormals();
    return geo;
  };
  const backMat = toon(0x4a0c34, { emissive: 0x12020c });
  mesh(curtainGeo(16, 9, 22, 0.14), backMat, 0, 4.0, -5.4);

  // ── Stage: black lacquer + gold sunburst ─────────────────────────
  const floorTex = keep(canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#120810'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.42;
    g.strokeStyle = 'rgba(245,184,41,0.55)'; g.lineWidth = 3;
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); g.lineTo(cx + Math.cos(a) * 400, cy + Math.sin(a) * 400); g.stroke(); }
    for (const r of [30, 90, 160, 240]) { g.lineWidth = r === 30 ? 6 : 4; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(245,184,41,0.9)'; g.beginPath(); g.arc(cx, cy, 24, 0, TAU); g.fill();
  }));
  const floorMat = toon(0xffffff, { map: floorTex });
  const floor = mesh(new THREE.BoxGeometry(13.5, 0.4, 8.2), [dark, dark, floorMat, dark, dark, dark], 0, -0.2, -1.4);
  floor.material = [dark, dark, floorMat, dark, dark, dark];
  const shineTex = keep(canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,160,220,0.5)'); gr.addColorStop(1, 'rgba(255,120,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }));
  const shineMat = basic(0xffffff, { map: shineTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 });
  const shine = mesh(new THREE.PlaneGeometry(9, 4.5), shineMat, 0, 0.012, 0.3);
  shine.rotation.x = -Math.PI / 2;
  mesh(new THREE.BoxGeometry(13.5, 1.1, 0.2), toon(PLUM), 0, -0.55, 2.75);
  mesh(new THREE.BoxGeometry(13.6, 0.08, 0.14), goldMat, 0, 0.0, 2.72);
  // Marquee bulbs chasing along the apron.
  const BULB = lowGraphics ? 20 : 30;
  const bulbs = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.065, 8, 6)), basic(0xffffff), BULB);
  for (let i = 0; i < BULB; i++) { dummy.position.set(-6.4 + 12.8 * i / (BULB - 1), -0.3, 2.87); dummy.updateMatrix(); bulbs.setMatrixAt(i, dummy.matrix); bulbs.setColorAt(i, col.set(0xffe0a0)); }
  group.add(bulbs);

  // ── Deco band shell with rings that light on the beat ────────────
  const shellTex = keep(canvasTex(512, 256, (g, w, h) => {
    const cx = w / 2, cy = h;
    for (let i = 0; i < 18; i++) {
      const a0 = Math.PI + i / 18 * Math.PI, a1 = Math.PI + (i + 1) / 18 * Math.PI;
      g.fillStyle = i % 2 ? '#2a0c2c' : '#40143e';
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, w * 0.7, a0, a1); g.closePath(); g.fill();
    }
  }));
  const shell = mesh(new THREE.CircleGeometry(5.0, 40, 0, Math.PI), toon(0xffffff, { map: shellTex, emissive: 0x100010 }), 0, 0.4, -5.0);
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const m = basic(0xffd27a, { transparent: true, opacity: 0.6 });
    rings.push({ mesh: mesh(new THREE.TorusGeometry(1.6 + i * 1.05, 0.06, 6, 40, Math.PI), m, 0, 0.4, -4.95), mat: m });
  }
  // Band riser.
  mesh(new THREE.BoxGeometry(8.6, 0.45, 1.6), toon(0x2a0e2c), 0, 0.22, -3.9);
  mesh(new THREE.BoxGeometry(8.7, 0.05, 1.65), goldMat, 0, 0.46, -3.9);

  // ── The house band ───────────────────────────────────────────────
  // Silhouette players in tuxes on the riser, gold instruments catching
  // the light, everyone swinging on the beat.
  const tux = toon(0x120a14), skinMats = [0x5a3a22, 0x8d5524, 0xc68642, 0x3d2616, 0xa86a3e].map(c => toon(c));
  const brass = toon(GOLD, { emissive: 0x4a3000 });
  const players = [];
  const player = (x, z, skin, build) => {
    const g = new THREE.Group(); g.position.set(x, 0.47, z); group.add(g);
    mesh(new THREE.CapsuleGeometry(0.11, 0.55, 3, 8), tux, -0.08, 0.4, 0, g); mesh(new THREE.CapsuleGeometry(0.11, 0.55, 3, 8), tux, 0.08, 0.4, 0, g);
    const torso = new THREE.Group(); torso.position.y = 0.85; g.add(torso);
    mesh(new THREE.CapsuleGeometry(0.22, 0.4, 3, 10), tux, 0, 0.3, 0, torso);
    mesh(new THREE.BoxGeometry(0.1, 0.25, 0.02), toon(0xf4f0e6), 0, 0.42, 0.2, torso);
    const head = mesh(new THREE.SphereGeometry(0.17, 12, 10), skinMats[skin % skinMats.length], 0, 0.82, 0, torso);
    const p = { g, torso, head, ph: players.length * 0.37 };
    build(p);
    players.push(p);
    return p;
  };
  const tube = (r, len) => new THREE.CylinderGeometry(r, r, len, 8);
  // Trumpet player: horn up at the lips, raising it on the hits.
  player(-3.0, -3.8, 0, (p) => {
    const h = new THREE.Group(); h.position.set(0, 0.78, 0.18); p.torso.add(h); p.horn = h;
    mesh(tube(0.02, 0.4), brass, 0, 0, 0.2, h).rotation.x = Math.PI / 2;
    mesh(new THREE.ConeGeometry(0.09, 0.14, 12, 1, true), brass, 0, 0, 0.42, h).rotation.x = -Math.PI / 2;
  });
  // Sax: curved body with a flared bell.
  player(-1.5, -3.6, 1, (p) => {
    const h = new THREE.Group(); h.position.set(0.04, 0.45, 0.24); p.torso.add(h); p.horn = h;
    mesh(tube(0.035, 0.5), brass, 0, 0.05, 0, h).rotation.z = 0.25;
    const u = mesh(new THREE.TorusGeometry(0.08, 0.035, 6, 10, Math.PI), brass, 0.06, -0.2, 0, h); u.rotation.z = Math.PI;
    mesh(new THREE.ConeGeometry(0.08, 0.16, 10, 1, true), brass, 0.15, -0.08, 0, h).rotation.z = Math.PI;
  });
  // Trombone: the slide shoots out on the beat.
  player(1.5, -3.6, 2, (p) => {
    const h = new THREE.Group(); h.position.set(0, 0.78, 0.18); p.torso.add(h); p.horn = h;
    mesh(tube(0.018, 0.5), brass, 0, 0, 0.25, h).rotation.x = Math.PI / 2;
    mesh(new THREE.ConeGeometry(0.1, 0.16, 12, 1, true), brass, 0.08, 0, 0.5, h).rotation.x = -Math.PI / 2;
    const slide = new THREE.Group(); h.add(slide); p.slide = slide;
    mesh(tube(0.016, 0.6), brass, -0.06, -0.02, 0.3, slide).rotation.x = Math.PI / 2;
  });
  // Upright bass: big body leaning on the player, plucked on every beat.
  player(3.0, -3.8, 3, (p) => {
    const b = new THREE.Group(); b.position.set(0.25, -0.45, 0.2); b.rotation.z = 0.25; p.torso.add(b); p.horn = b;
    mesh(new THREE.SphereGeometry(0.3, 12, 10), toon(0x7a3a12), 0, 0.2, 0, b).scale.set(0.8, 1.45, 0.4);
    mesh(new THREE.BoxGeometry(0.05, 0.9, 0.04), toon(0x1a0e08), 0, 1.0, 0.02, b);
  });
  // Drums, center back: bass drum with a Z on the head, toms, cymbals.
  const drumTex = keep(canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f4ead8'; g.beginPath(); g.arc(64, 64, 62, 0, TAU); g.fill();
    g.strokeStyle = '#c8102e'; g.lineWidth = 8; g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.stroke();
    g.fillStyle = '#7a1048'; g.font = '900 72px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Z', 64, 68);
  }));
  const drummer = player(0, -4.4, 4, (p) => {
    p.arms = [-1, 1].map(sx => { const a = new THREE.Group(); a.position.set(0.22 * sx, 0.5, 0); p.torso.add(a); mesh(new THREE.CapsuleGeometry(0.05, 0.4, 3, 6), tux, 0, -0.2, 0.1, a).rotation.x = -0.6; return a; });
  });
  drummer.g.position.y = 0.2;
  const kick = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 20), toon(0xc8102e), 0, 0.9, -3.75);
  kick.rotation.x = Math.PI / 2;
  const kickHead = mesh(new THREE.CircleGeometry(0.4, 20), basic(0xffffff, { map: drumTex }), 0, 0.9, -3.59);
  const cymbals = [[-0.7, 1.75], [0.7, 1.85]].map(([x, y]) => { const c = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.015, 16), brass, x, y, -3.95); c.rotation.x = 0.35; return c; });
  for (const x of [-0.45, 0.45]) mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 14), toon(0xc8102e), x, 1.35, -3.85).rotation.x = 0.3;
  // Music stands with deco fronts.
  for (const x of [-3.0, -1.5, 1.5, 3.0]) {
    mesh(new THREE.BoxGeometry(0.6, 0.45, 0.04), toon(0x2a0c2c), x, 1.0, -3.2);
    mesh(new THREE.BoxGeometry(0.62, 0.05, 0.05), goldMat, x, 1.22, -3.19);
  }

  // ── Proscenium: deco gold frame, velvet drapes and valance ───────
  for (const sx of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.5, 7.4, 0.5), goldMat, sx * 5.6, 3.3, 2.35);
    mesh(new THREE.BoxGeometry(0.75, 7.0, 0.3), toon(PLUM), sx * 5.95, 3.1, 2.3);
    const drape = mesh(curtainGeo(1.7, 7.0, 5, 0.12), velvet, sx * 4.75, 3.1, 2.1);
    const pos = drape.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), x = pos.getX(i), pinch = Math.exp(-Math.pow((y + 1.2) / 1.2, 2));
      pos.setX(i, x * (1 - 0.55 * pinch) + sx * 0.38 * pinch);
    }
    drape.geometry.computeVertexNormals();
    const tie = mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 16), goldMat, sx * 5.05, 1.9, 2.2);
    tie.rotation.y = Math.PI / 2;
  }
  mesh(curtainGeo(11.6, 0.9, 16, 0.08), velvet, 0, 5.25, 2.35);
  for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(11.8 - i * 1.2, 0.12, 0.3), goldMat, 0, 5.75 + i * 0.16, 2.4);
  // Neon sign over the band.
  const signTex = keep(canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = 'italic 900 62px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff3d9a'; g.shadowBlur = 22;
    g.strokeStyle = '#ff7ac0'; g.lineWidth = 7; g.strokeText('Trumpets Please', w / 2, h / 2 + 4);
    g.shadowBlur = 10; g.fillStyle = '#fff0f8'; g.fillText('Trumpets Please', w / 2, h / 2 + 4);
  }));
  const sign = mesh(new THREE.PlaneGeometry(4.6, 1.15), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false }), 0, 4.55, -4.7);
  // Neon trumpets flanking the sign.
  const neonMat = basic(0xffc13a, { transparent: true, opacity: 0.9 });
  for (const sx of [-1, 1]) {
    const t = new THREE.Group(); t.position.set(sx * 3.1, 4.55, -4.75); t.scale.set(-sx, 1, 1); group.add(t);
    mesh(new THREE.BoxGeometry(0.9, 0.05, 0.03), neonMat, 0, 0, 0, t);
    const bell = mesh(new THREE.TorusGeometry(0.2, 0.03, 4, 12, Math.PI), neonMat, 0.5, 0, 0, t); bell.rotation.z = -Math.PI / 2;
    for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(0.04, 0.16, 0.03), neonMat, -0.15 + k * 0.12, 0.1, 0, t);
  }

  // ── Club tables and patrons down front ───────────────────────────
  mesh(new THREE.BoxGeometry(16, 0.2, 5), toon(0x1a0a14), 0, -1.1, 5.0);
  const tables = [];
  const TN = lowGraphics ? 6 : 9;
  for (let i = 0; i < TN; i++) {
    const u = i / (TN - 1), x = -6 + 12 * u, z = 3.6 + (i % 2) * 0.9;
    if (Math.abs(x) < 0.9 && z < 4) continue;
    tables.push({ x, z });
  }
  const tableTop = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16)), toon(0x2a0c18), tables.length);
  const cloth = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.43, 0.5, 0.45, 16, 1, true)), toon(0xf4ead8), tables.length);
  const candle = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.07, 8, 6)), basic(0xffffff), tables.length);
  tables.forEach((t, i) => {
    dummy.position.set(t.x, -0.55, t.z); dummy.updateMatrix(); tableTop.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x, -0.78, t.z); dummy.updateMatrix(); cloth.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x, -0.45, t.z); dummy.updateMatrix(); candle.setMatrixAt(i, dummy.matrix); candle.setColorAt(i, col.set(0xffc870));
  });
  group.add(tableTop, cloth, candle);
  const fans = [];
  tables.forEach((t) => { for (const dx of [-0.55, 0.55]) fans.push({ x: t.x + dx, z: t.z + 0.15, ph: Math.random() * TAU, hype: 0.6 + Math.random() * 0.6 }); });
  const FN = fans.length;
  const fBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.2, 0.3, 3, 8)), toon(0xffffff), FN);
  const fHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.15, 10, 8)), toon(0xffffff), FN);
  const fHat = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12)), toon(0x1a0e1e), FN);
  const fArm = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.05, 0.32, 3, 6)), toon(0xffffff), FN * 2);
  const outfits = [0xc8102e, 0x1a3a8a, 0x15121a, 0xe8b830, 0x0e5a3a, 0x7a1048, 0xf4ead8];
  const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0x5a3a22, 0xf1c27d, 0x3d2616];
  fans.forEach((f, i) => {
    fBody.setColorAt(i, col.set(outfits[i % outfits.length])); fHead.setColorAt(i, col.set(skins[i % skins.length]));
    fArm.setColorAt(i * 2, col.set(skins[i % skins.length])); fArm.setColorAt(i * 2 + 1, col.set(skins[i % skins.length]));
  });
  group.add(fBody, fHead, fHat, fArm);

  // ── Spotlights ───────────────────────────────────────────────────
  const coneGeo = keep(new THREE.ConeGeometry(0.85, 6.8, 20, 1, true));
  coneGeo.translate(0, -3.4, 0);
  const cones = [];
  for (const [x, targetX, c] of [[-3.4, -1.6, 0xffe2b0], [-1.1, -1.6, 0xff8ad0], [1.1, 1.6, 0xff8ad0], [3.4, 1.6, 0xffe2b0]]) {
    mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.38, 10), toon(0x141014), x, 6.55, 1.0);
    const mat = keep(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.position.set(x, 6.55, 1.0);
    group.add(cone);
    cones.push({ cone, mat, baseX: x, targetX });
  }

  // ── Smoke rings drifting up through the beams ────────────────────
  const RN = lowGraphics ? 6 : 10;
  const ringGeo = keep(new THREE.TorusGeometry(0.3, 0.06, 6, 20));
  const smoke = [];
  for (let i = 0; i < RN; i++) {
    const mat = basic(0xe8d8f0, { transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(ringGeo, mat); m.visible = false; group.add(m);
    smoke.push({ m, mat, life: 0, max: 1, v: new THREE.Vector3(), spin: 0 });
  }
  let smokeCursor = 0;
  function puff(x, y, z, n = 1, big = false) {
    for (let k = 0; k < n; k++) {
      const r = smoke[smokeCursor = (smokeCursor + 1) % RN];
      r.m.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.4);
      r.v.set((Math.random() - 0.5) * 0.15, 0.35 + Math.random() * 0.25, 0);
      r.max = r.life = (big ? 4.5 : 3.5) + Math.random();
      r.spin = (Math.random() - 0.5) * 0.6; r.m.rotation.set(Math.PI / 2 - 0.4 + Math.random() * 0.3, 0, Math.random());
      r.m.visible = true; r.big = big;
    }
  }

  // ── Sparkle bursts (gold + magenta) ──────────────────────────────
  const GL = lowGraphics ? 200 : 420;
  const gPos = new Float32Array(GL * 3), gCol = new Float32Array(GL * 3), gVel = new Float32Array(GL * 3), gLife = new Float32Array(GL);
  for (let i = 0; i < GL; i++) gPos[i * 3 + 1] = -100;
  const gGeo = keep(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
  const sparks = new THREE.Points(gGeo, keep(new THREE.PointsMaterial({ size: 0.1, vertexColors: true, sizeAttenuation: true })));
  sparks.frustumCulled = false;
  group.add(sparks);
  let gCursor = 0;
  function burst(n, x, spread) {
    for (let k = 0; k < n; k++) {
      const i = gCursor = (gCursor + 1) % GL;
      gPos[i * 3] = x + (Math.random() - 0.5) * spread; gPos[i * 3 + 1] = 5.4 + Math.random() * 1.2; gPos[i * 3 + 2] = (Math.random() - 0.5) * 3 + 0.4;
      gVel[i * 3] = (Math.random() - 0.5) * 1.0; gVel[i * 3 + 1] = -1.0 - Math.random() * 1.2; gVel[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      col.set(k % 3 ? (k % 2 ? GOLD : 0xfff0c0) : NEON);
      gCol[i * 3] = col.r; gCol[i * 3 + 1] = col.g; gCol[i * 3 + 2] = col.b;
      gLife[i] = 6;
    }
    gGeo.attributes.color.needsUpdate = true;
  }

  // ── Lights ───────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffd8e8, 0x2a0a2a, 1.0);
  const key = new THREE.DirectionalLight(0xffeedd, 1.45);
  key.position.set(1.2, 6, 6);
  const rimL = new THREE.PointLight(0xff3d9a, 16, 12, 1.6); rimL.position.set(-3.6, 3.2, -1.0);
  const rimR = new THREE.PointLight(0xffb030, 16, 12, 1.6); rimR.position.set(3.6, 3.2, -1.0);
  const bandGlow = new THREE.PointLight(0xffa860, 12, 10, 1.6); bandGlow.position.set(0, 3.0, -2.6);
  const footGlow = new THREE.PointLight(0xffc870, 8, 8, 1.6); footGlow.position.set(0, 0.5, 2.5);
  group.add(hemi, key, rimL, rimR, bandGlow, footGlow);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, band: bandGlow.intensity, foot: footGlow.intensity };

  // ── State + update ───────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, focus: 0, solo: null, blare: 0, lastBeat: -1, flicker: 0 };

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = frac(beat), onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.45);
    state.blare = Math.max(0, state.blare - dt * 0.7);
    state.flicker = Math.max(0, state.flicker - dt * 1.5);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    const house = L * (1 - 0.6 * soloK);
    if (whole !== state.lastBeat) {
      state.lastBeat = whole;
      if (whole % 2 === 0) puff(-4 + Math.random() * 8, 1.4, -2.5 + Math.random() * 2.5, 1);
    }

    // Marquee bulbs chase; the band-shell rings light outward on each beat.
    for (let i = 0; i < BULB; i++) {
      const on = ((i + whole) % 3 === 0) ? 1 : 0.25 + 0.2 * onBeat;
      const x = -6.4 + 12.8 * i / (BULB - 1);
      const k = on * house + soloK * Math.exp(-Math.pow((x - soloX) / 1.8, 2)) + state.flash * 0.5;
      bulbs.setColorAt(i, col.setRGB(Math.min(1, 0.2 + k), Math.min(1, 0.14 + 0.8 * k), Math.min(1, 0.08 + 0.5 * k)));
    }
    bulbs.instanceColor.needsUpdate = true;
    rings.forEach((r, i) => {
      const wave = Math.exp(-Math.pow((ph * 4 - i), 2) * 1.5);
      r.mat.opacity = (0.18 + 0.7 * wave + 0.3 * state.blare) * house;
      r.mat.color.setRGB(1, 0.75 + 0.2 * wave, 0.4 + 0.3 * wave);
    });
    shineMat.opacity = (0.3 + 0.25 * onBeat + 0.3 * state.flash) * house + 0.35 * soloK;
    shine.position.x = soloX * soloK;

    // The band swings: heads nod, horns lift on the hits, the trombone
    // slide shoots out, the drummer's sticks come down on every beat.
    const sw = Math.sin(Math.PI * beat);
    players.forEach((p, i) => {
      const nod = Math.pow(0.5 + 0.5 * Math.cos(TAU * (beat - 0.1)), 2);
      p.torso.rotation.set(0.05 + 0.06 * nod, 0.12 * Math.sin(Math.PI * beat / 2 + i), 0.06 * sw * (i % 2 ? 1 : -1));
      p.head.rotation.x = 0.15 * nod;
      p.g.position.y = (p === drummer ? 0.2 : 0.47) - 0.03 * nod;
      if (p.horn && p !== players[3]) p.horn.rotation.x = -0.15 * onBeat - 0.35 * state.blare - 0.2 * (0.5 + 0.5 * Math.sin(Math.PI * beat / 4 + i));
    });
    players[2].slide.position.z = 0.25 * (0.5 + 0.5 * Math.cos(Math.PI * beat));
    players[3].horn.rotation.y = 0.1 * sw;
    drummer.arms.forEach((a, k) => { a.rotation.x = -0.4 - 0.6 * Math.exp(-frac(beat + k * 0.5) * 7); });
    kick.scale.set(1 + 0.06 * onBeat, 1, 1 + 0.06 * onBeat);
    cymbals.forEach((c, k) => { c.rotation.z = 0.12 * Math.sin(songTime * 9 + k) * Math.exp(-frac(beat + k) * 3); });

    // Patrons: swaying at their tables, snapping on 2 and 4, up and
    // cheering when the battle heats up.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3);
    fans.forEach((f, i) => {
      const sway = Math.sin(Math.PI * beat + f.ph), up = (0.5 - 0.5 * Math.cos(TAU * beat + f.ph)) * 0.12 * hype * f.hype * L;
      dummy.scale.set(1, 1, 1);
      dummy.position.set(f.x + 0.04 * sway, -0.62 + up, f.z); dummy.rotation.set(0, Math.PI, 0.08 * sway); dummy.updateMatrix(); fBody.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.46; dummy.updateMatrix(); fHead.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.13; dummy.scale.set(i % 3 ? 0 : 1, 1, i % 3 ? 0 : 1); dummy.updateMatrix(); fHat.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(1, 1, 1);
      const snap = Math.exp(-frac(beat * 0.5 + 0.5) * 6);
      for (const s of [-1, 1]) {
        dummy.position.set(f.x + s * 0.2, -0.38 + up, f.z);
        dummy.rotation.set(0, 0, s * (hype > 0.65 ? 2.5 : 0.5 + 0.5 * snap));
        dummy.updateMatrix(); fArm.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
      }
    });
    fBody.instanceMatrix.needsUpdate = fHead.instanceMatrix.needsUpdate = fHat.instanceMatrix.needsUpdate = fArm.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < tables.length; i++) candle.setColorAt(i, col.setRGB(1, 0.65 + 0.15 * Math.sin(songTime * 7 + i * 2), 0.35));
    candle.instanceColor.needsUpdate = true;

    // Spotlights.
    cones.forEach((c, i) => {
      const lead = c.targetX < 0 ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const swy = Math.sin(songTime * 0.8 + i * 1.9) * 0.3;
      const dx = c.targetX + (soloX - c.targetX) * soloK + swy * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.5); c.cone.rotation.x = -0.1;
      c.mat.opacity = (0.035 + 0.04 * onBeat + 0.05 * lead + 0.1 * state.flash) * L * (1 - 0.3 * soloK) + 0.07 * soloK;
    });

    // Smoke rings rise, widen and fade.
    for (const r of smoke) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const t = 1 - r.life / r.max;
      r.m.position.addScaledVector(r.v, dt);
      r.m.rotation.z += r.spin * dt;
      r.m.scale.setScalar((r.big ? 1.4 : 1) * (0.6 + 1.6 * t));
      r.mat.opacity = Math.min(1, t * 5) * (1 - t) * 0.45 * L;
      if (r.life <= 0) r.m.visible = false;
    }
    for (let i = 0; i < GL; i++) {
      if (gLife[i] <= 0) continue;
      gLife[i] -= dt;
      gPos[i * 3] += (gVel[i * 3] + Math.sin(songTime * 2 + i) * 0.35) * dt;
      gPos[i * 3 + 1] += gVel[i * 3 + 1] * dt; gPos[i * 3 + 2] += gVel[i * 3 + 2] * dt;
      if (gLife[i] <= 0 || gPos[i * 3 + 1] < 0.02) { gLife[i] = 0; gPos[i * 3 + 1] = -100; }
    }
    gGeo.attributes.position.needsUpdate = true;

    const flick = state.flicker > 0 && Math.sin(songTime * 60) > 0.3 ? 0.35 : 1;
    sign.material.opacity = L * (0.8 + 0.2 * onBeat) * flick;
    neonMat.opacity = L * (0.6 + 0.4 * onBeat) * flick;
    sky.material.uniforms.uPulse.value = onBeat * 0.35 * L + state.flash * 0.6;
    sky.material.uniforms.uLight.value = house;

    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.5 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.5 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    bandGlow.intensity = base.band * L * (0.7 + 0.4 * onBeat + 0.8 * state.blare) * (1 - 0.6 * soloK);
    footGlow.intensity = base.foot * L * (0.8 + 0.4 * onBeat + state.flash);
    footGlow.position.x = soloX * soloK;
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.cheer = Math.min(1, state.cheer + 0.35); state.blare = 1; puff(x, 2.2, 0, 2); }
        if (data.tier >= 4) { burst(60, x, 3); state.flash = 0.6; }
        break;
      case 'taunt': state.flash = 0.4; state.blare = 1; state.flicker = 0.6; break;
      case 'tauntLanded': burst(90, data.attacker === 'rival' ? 1.6 : -1.6, 3); state.flash = 1; state.cheer = 1; state.flicker = 1; puff(data.attacker === 'rival' ? -1.6 : 1.6, 2.0, 0.3, 3, true); break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5; break;
      case 'end': burst(200, x, 6); state.cheer = 1; state.flash = 1; state.blare = 1; puff(0, 2, 0, 4, true); break;
      case 'drop': state.flash = 1; burst(80, 0, 8); state.blare = 1; break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; burst(70, x, 2.5); state.blare = 1;
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update, react,
    setLightLevel(v) { state.lightLevel = Math.max(0, Math.min(1, v)); },
    dispose() {
      for (const d of disposables) if (d && d.dispose) d.dispose();
      // Per-mesh multi-material array on the floor is covered by `keep`.
    },
  };
}
