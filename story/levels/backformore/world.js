// BACK FOR MORE — the Level 4 battle stage: a server-farm rooftop at the
// edge of the digital void.
//
// A glowing grid dance floor on a rooftop of humming server racks, walls of
// green code rain falling all around (every column at its own speed), a
// wireframe city floating in the dark, hot-air balloons drifting up through
// the rain, data-glass panels either side of the stage, a crowd of
// operators with glowing visors. Big moves send ripples through the grid
// and "bullet-time" rings round the dancer; a landed taunt glitches the
// whole place red; a SOLO slows the rain to bullet time and swings every
// light onto the soloist. Everything runs off the music clock.

import * as THREE from '../../../vendor/three/three.module.min.js';

const GREEN = 0x00ff41, MINT = 0x7dffb0, DEEP = 0x003b12;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Code-rain glyph columns: grey-level trails with white heads (the shader
// tints them). Font-independent glyphs: mirrored digits/letters + strokes.
function rainTexture(seed = 1) {
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const cols = 32, cw = w / cols, ch = 16, rows = h / ch;
    const glyphs = '01ZA9E7<>=+*:#3K5T2Y8';
    g.font = 'bold 14px "DejaVu Sans Mono", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let c = 0; c < cols; c++) {
      let y = Math.floor(rnd() * rows);
      for (let s = 0; s < 2; s++) {
        const len = 6 + Math.floor(rnd() * 14);
        for (let k = 0; k < len; k++) {
          const row = (y - k + rows * 4) % rows, v = k === 0 ? 255 : Math.round(200 * Math.pow(1 - k / len, 1.4)) + 20;
          g.fillStyle = `rgb(${v},${v},${v})`;
          g.save(); g.translate(c * cw + cw / 2, row * ch + ch / 2); g.scale(-1, 1);
          if (rnd() < 0.7) g.fillText(glyphs[Math.floor(rnd() * glyphs.length)], 0, 1);
          else { g.fillRect(-4, -5, 8, 2); g.fillRect(rnd() < 0.5 ? -4 : 2, -5, 2, 10); g.fillRect(-4, 2, 8, 2); }
          g.restore();
        }
        y = (y + Math.floor(rows / 2) + Math.floor(rnd() * 6)) % rows;
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

const RAIN_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const RAIN_FS = `uniform sampler2D uMap; uniform float uTime, uBright; uniform vec3 uTint; uniform vec2 uRep;
  varying vec2 vUv;
  float h(float n){ return fract(sin(n * 91.345) * 47453.5453); }
  void main(){
    vec2 uv = vUv * uRep;
    float col = floor(uv.x * 32.0);
    float sp = 0.35 + 0.9 * h(col);
    float v = texture2D(uMap, vec2(uv.x, uv.y + uTime * sp + h(col + 7.0))).r;
    float fade = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    vec3 c = uTint * v + vec3(0.75) * pow(v, 8.0);
    gl_FragColor = vec4(c * uBright * fade, 1.0);
  }`;

const FLOOR_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FLOOR_FS = `uniform float uBeat, uFlash, uLevel, uTime; uniform vec4 uRip; uniform vec2 uSolo; uniform vec3 uTint;
  varying vec3 vW;
  void main(){
    vec2 p = vW.xz * 1.6;
    vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    vec2 cell = floor(p);
    float chk = mod(cell.x + cell.y, 2.0);
    float d = length(vW.xz - vec2(0.0, 0.3));
    float edge = smoothstep(5.6, 3.2, d);
    float cellPulse = chk * uBeat * 0.35 + 0.06 * sin(uTime * 1.3 + cell.x * 0.7 + cell.y * 1.3);
    float r = (uRip.z) * 7.0, rd = length(vW.xz - vec2(uRip.x, 0.2));
    float rip = exp(-pow((rd - r) * 1.6, 2.0)) * uRip.w * (1.0 - min(1.0, r / 9.0));
    float pool = exp(-pow(length(vW.xz - vec2(uSolo.x, 0.2)) / 1.2, 2.0)) * uSolo.y;
    float k = (0.25 + 0.75 * uBeat) * line * edge + max(cellPulse, 0.0) * edge * 0.5 + rip * (0.6 + line) + pool * (0.5 + line);
    k *= uLevel * (1.0 - 0.6 * uSolo.y) + pool * uSolo.y;
    vec3 base = vec3(0.004, 0.02, 0.01);
    vec3 c = base + uTint * k + vec3(0.6, 1.0, 0.75) * line * uFlash * 0.5 * edge;
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

  // ── Sky: the void ───────────────────────────────────────────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(95, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uRed: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse, uRed;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.0, 0.012, 0.006), hor = vec3(0.0, 0.11, 0.045);
        vec3 c = mix(hor, top, smoothstep(-0.05, 0.55, h));
        c += vec3(0.0, 0.16, 0.06) * uPulse * smoothstep(0.35, 0.0, abs(h - 0.02));
        c = mix(c, c.grb * vec3(1.6, 0.3, 0.3) + vec3(0.05, 0.0, 0.0), uRed);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  group.add(sky);

  // ── Code rain: two curved walls behind + data-glass panels ──────
  const rainTex = keep(rainTexture(7));
  const rainMats = [];
  const rainMat = (rep, bright, side = THREE.BackSide) => {
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { uMap: { value: rainTex }, uTime: { value: 0 }, uBright: { value: bright }, uTint: { value: new THREE.Color(GREEN) }, uRep: { value: new THREE.Vector2(rep[0], rep[1]) } },
      vertexShader: RAIN_VS, fragmentShader: RAIN_FS, side, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    m.userData.base = bright; rainMats.push(m); return m;
  };
  const wallNear = new THREE.Mesh(keep(new THREE.CylinderGeometry(17, 17, 24, 40, 1, true, Math.PI - 2.1, 4.2)), rainMat([9, 2.2], 1.0));
  wallNear.position.set(0, 8, -1);
  group.add(wallNear);
  if (!low) {
    const wallFar = new THREE.Mesh(keep(new THREE.CylinderGeometry(30, 30, 40, 40, 1, true, Math.PI - 2.4, 4.8)), rainMat([14, 2.6], 0.45));
    wallFar.position.set(0, 12, -2);
    group.add(wallFar);
  }
  // Data glass either side of the stage.
  const glassGeo = keep(new THREE.PlaneGeometry(2.6, 5.2));
  const panels = [];
  for (const sx of [-1, 1]) {
    const frame = new THREE.Mesh(keep(new THREE.BoxGeometry(2.8, 5.4, 0.12)), toon(0x0b120e));
    frame.position.set(sx * 5.7, 2.6, -2.4); frame.rotation.y = -sx * 0.55;
    group.add(frame);
    const pm = rainMat([1.3, 1.3], 1.2, THREE.DoubleSide);
    const pane = new THREE.Mesh(glassGeo, pm);
    pane.position.set(sx * 5.65, 2.6, -2.3); pane.rotation.y = -sx * 0.55;
    pane.translateZ(0.08);
    group.add(pane);
    panels.push(pane);
    const trim = new THREE.Mesh(keep(new THREE.BoxGeometry(2.82, 0.05, 0.14)), basic(GREEN));
    trim.position.copy(frame.position); trim.position.y = 5.32; trim.rotation.y = frame.rotation.y;
    group.add(trim);
  }

  // ── Wireframe city floating in the void ─────────────────────────
  {
    const pos = [];
    const box = new THREE.BoxGeometry(1, 1, 1), edges = new THREE.EdgesGeometry(box);
    const ep = edges.attributes.position.array;
    const N = low ? 26 : 46;
    for (let i = 0; i < N; i++) {
      const a = Math.PI - 1.9 + (i / N) * 3.8 + Math.sin(i * 12.9) * 0.05;
      const r = 34 + (i * 37 % 13);
      const w = 2.5 + (i * 7 % 4), d = 2.5 + (i * 11 % 3), hgt = 6 + (i * 53 % 17);
      const cx = Math.sin(a) * r, cz = Math.cos(a) * r, y0 = -4 + (i % 3) * 0.5;
      for (let k = 0; k < ep.length; k += 3) pos.push(cx + ep[k] * w, y0 + (ep[k + 1] + 0.5) * hgt, cz + ep[k + 2] * d);
      // A few floor lines on the taller towers.
      for (let f = 1; f < hgt / 2.5; f++) {
        const y = y0 + f * 2.5;
        pos.push(cx - w / 2, y, cz + d / 2, cx + w / 2, y, cz + d / 2);
      }
    }
    box.dispose(); edges.dispose();
    const cg = keep(new THREE.BufferGeometry());
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const city = new THREE.LineSegments(cg, basic(0x0f8a3a, { transparent: true, opacity: 0.55, fog: true }));
    group.add(city);
  }

  // ── Rooftop + stage ─────────────────────────────────────────────
  const deck = new THREE.Mesh(keep(new THREE.BoxGeometry(24, 0.4, 18)), toon(0x0c1410));
  deck.position.set(0, -0.82, 1);
  group.add(deck);
  const stage = new THREE.Mesh(keep(new THREE.BoxGeometry(11.4, 0.6, 8.4)), toon(0x0a110d));
  stage.position.set(0, -0.31, 0.3);
  group.add(stage);
  const floorMat = keep(new THREE.ShaderMaterial({
    uniforms: {
      uBeat: { value: 0 }, uFlash: { value: 0 }, uLevel: { value: 1 }, uTime: { value: 0 },
      uRip: { value: new THREE.Vector4(0, 0, 99, 0) }, uSolo: { value: new THREE.Vector2(0, 0) }, uTint: { value: new THREE.Color(GREEN) },
    },
    vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS,
  }));
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(11.2, 8.2)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.005, 0.3);
  group.add(floor);
  // Glowing stage edge.
  const edgeMat = basic(GREEN);
  for (const [x, z, w, d] of [[0, 4.4, 11.5, 0.06], [0, -3.8, 11.5, 0.06], [5.72, 0.3, 0.06, 8.3], [-5.72, 0.3, 0.06, 8.3]]) {
    const e = new THREE.Mesh(keep(new THREE.BoxGeometry(w, 0.06, d)), edgeMat);
    e.position.set(x, 0.0, z);
    group.add(e);
  }

  // ── Server racks with blinking LEDs ─────────────────────────────
  const ledTex = keep(canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#050806'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 12) {
      g.fillStyle = '#122018'; g.fillRect(4, y - 4, w - 8, 9);
      for (let x = 8; x < w - 8; x += 8) {
        const v = Math.random();
        g.fillStyle = v < 0.5 ? '#39ff7e' : v < 0.75 ? '#0b5a24' : v < 0.9 ? '#ffffff' : '#ff3b3b';
        g.fillRect(x, y - 1, 3, 3);
      }
    }
  }));
  const racks = [];
  const rackSpots = [];
  for (let i = 0; i < 6; i++) rackSpots.push([-4.6 + i * 1.84, -4.6, 0]);               // back row
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) rackSpots.push([sx * (7.2 + i * 0.1), -1.2 + i * 1.5 - 2.6, -sx * Math.PI / 2 + sx * 0.25]);
  const rackMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1.5, 3.2, 1.0)), toon(0x101814), rackSpots.length);
  const ledMesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1.2, 2.9)), basic(0xffffff, { map: ledTex }), rackSpots.length);
  rackSpots.forEach(([x, z, ry], i) => {
    dummy.position.set(x, 0.98, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    rackMesh.setMatrixAt(i, dummy.matrix);
    dummy.translateZ(0.51); dummy.updateMatrix();
    ledMesh.setMatrixAt(i, dummy.matrix);
    ledMesh.setColorAt(i, col.set(0xffffff));
    racks.push({ x, z, ph: i * 1.7 });
  });
  group.add(rackMesh, ledMesh);
  // Cable trays over the back row.
  const tray = new THREE.Mesh(keep(new THREE.BoxGeometry(11.5, 0.12, 0.5)), toon(0x1b2620));
  tray.position.set(0, 2.75, -4.6);
  group.add(tray);

  // Neon sign on a gantry behind the racks.
  const signTex = keep(canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = '900 64px "DejaVu Sans Mono", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#00ff41'; g.shadowBlur = 22;
    g.strokeStyle = '#39ff7e'; g.lineWidth = 6; g.strokeText('BACK FOR MORE', w / 2, h / 2 + 4);
    g.shadowBlur = 8; g.fillStyle = '#eafff0'; g.fillText('BACK FOR MORE', w / 2, h / 2 + 4);
    g.font = '700 18px "DejaVu Sans Mono", monospace'; g.fillStyle = '#39ff7e'; g.shadowBlur = 0;
    g.fillText('> SYSTEM://LEVEL_04  ACCESS GRANTED_', w / 2, h - 12);
  }));
  const signMat = basic(0xffffff, { map: signTex, transparent: true, depthWrite: false });
  const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(7.2, 1.8)), signMat);
  sign.position.set(0, 4.55, -4.9);
  group.add(sign);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(keep(new THREE.BoxGeometry(0.14, 3.8, 0.14)), toon(0x18221c));
    post.position.set(sx * 3.5, 2.6, -5.0);
    group.add(post);
  }

  // Antenna mast + dish, blinking beacon.
  const mast = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.09, 7, 6)), toon(0x1a221e));
  mast.position.set(-8.2, 3.0, -6.5);
  group.add(mast);
  const beacon = new THREE.Mesh(keep(new THREE.SphereGeometry(0.16, 8, 6)), basic(0xff2a2a));
  beacon.position.set(-8.2, 6.6, -6.5);
  group.add(beacon);
  const dish = new THREE.Mesh(keep(new THREE.SphereGeometry(1.0, 14, 6, 0, Math.PI * 2, 0, 1.1)), toon(0x26302a, { side: THREE.DoubleSide }));
  dish.position.set(8.4, 2.4, -6.0); dish.rotation.set(-0.9, -0.6, 0);
  group.add(dish);

  // ── Hot-air balloons drifting up through the rain ───────────────
  const gores = keep(canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#04130a' : '#0d3d1d'; g.fillRect(i * w / 8, 0, w / 8, h); }
    g.fillStyle = '#39ff7e'; for (let i = 0; i < 8; i++) g.fillRect(i * w / 8, 0, 2, h);
    g.font = 'bold 13px "DejaVu Sans Mono", monospace'; g.fillStyle = '#7dffb0';
    for (let y = 18; y < h; y += 22) for (let i = 0; i < 8; i++) if ((i + y) % 3) g.fillText(((i * 7 + y) % 2) + '' + ((i + y) % 2), i * w / 8 + 8, y);
    g.fillStyle = 'rgba(57,255,126,0.9)'; g.fillRect(0, h * 0.62, w, 3);
  }));
  const prof = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, a = -Math.PI / 2 + t * Math.PI;
    const rr = t < 0.25 ? lerp(0.32, 0.9, t / 0.25) : Math.cos(a * 0.82) * 1.05 + 0.05;
    prof.push(new THREE.Vector2(Math.max(0.02, rr * (t > 0.9 ? (1 - t) * 10 : 1)), t * 2.4));
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  const envGeo = keep(new THREE.LatheGeometry(prof, low ? 10 : 14));
  const envMat = toon(0xffffff, { map: gores, emissive: 0x062a12 });
  const basketGeo = keep(new THREE.BoxGeometry(0.42, 0.32, 0.42));
  const basketMat = toon(0x2a1d10);
  const flameMat = basic(0xb6ff5a, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameGeo = keep(new THREE.ConeGeometry(0.12, 0.45, 8));
  const ropeGeo = keep(new THREE.BufferGeometry());
  ropeGeo.setAttribute('position', new THREE.Float32BufferAttribute([0.18, 0.16, 0.18, 0.55, 0.85, 0.55, -0.18, 0.16, 0.18, -0.55, 0.85, 0.55, 0.18, 0.16, -0.18, 0.55, 0.85, -0.55, -0.18, 0.16, -0.18, -0.55, 0.85, -0.55], 3));
  const ropeMat = basic(0x2f6b43);
  const balloons = [];
  const bSpots = low
    ? [[-9, 6, -11, 1.4], [10, 9, -13, 1.7], [-15, 13, -20, 2.4], [4, 15, -24, 2.6]]
    : [[-9, 6, -11, 1.4], [10, 9, -13, 1.7], [-15, 13, -20, 2.4], [4, 15, -24, 2.6], [17, 4, -18, 2.0], [-4, 3, -16, 1.6], [-22, 8, -10, 2.2]];
  for (const [x, y, z, s] of bSpots) {
    const b = new THREE.Group();
    const env = new THREE.Mesh(envGeo, envMat); env.position.y = 0.85; b.add(env);
    const bask = new THREE.Mesh(basketGeo, basketMat); b.add(bask);
    const rope = new THREE.LineSegments(ropeGeo, ropeMat); b.add(rope);
    const fl = new THREE.Mesh(flameGeo, flameMat); fl.position.y = 0.55; b.add(fl);
    b.position.set(x, y, z); b.scale.setScalar(s);
    group.add(b);
    balloons.push({ obj: b, flame: fl, x, y0: y, z, ph: x * 0.37 + z, flare: 0 });
  }

  // ── Falling code particles round the stage ──────────────────────
  const PN = low ? 160 : 360;
  const pPos = new Float32Array(PN * 3), pSpd = new Float32Array(PN);
  for (let i = 0; i < PN; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 22; pPos[i * 3 + 1] = Math.random() * 12; pPos[i * 3 + 2] = -8 + Math.random() * 12;
    pSpd[i] = 0.8 + Math.random() * 2.2;
  }
  const pGeo = keep(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const glyphDot = keep(canvasTex(32, 32, (g) => { g.fillStyle = '#fff'; g.fillRect(9, 3, 14, 4); g.fillRect(9, 3, 4, 26); g.fillRect(9, 14, 12, 4); g.fillRect(9, 25, 14, 4); }));
  const pMat = keep(new THREE.PointsMaterial({ color: GREEN, size: 0.16, map: glyphDot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const pts = new THREE.Points(pGeo, pMat);
  pts.frustumCulled = false;
  group.add(pts);

  // ── Bullet-time rings (expanding shockwaves round a dancer) ─────
  const ringGeo = keep(new THREE.TorusGeometry(1, 0.03, 6, 48));
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const m = basic(MINT, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const r = new THREE.Mesh(ringGeo, m);
    r.rotation.x = Math.PI / 2; r.visible = false;
    group.add(r);
    rings.push({ mesh: r, mat: m, life: 0, x: 0, y: 0.1 });
  }
  function ring(x, y = 0.1) {
    const r = rings.find(q => q.life <= 0) || rings[0];
    r.life = 1; r.x = x; r.y = y; r.mesh.visible = true;
  }

  // ── Truss + spotlight cones ─────────────────────────────────────
  const truss = new THREE.Mesh(keep(new THREE.BoxGeometry(11, 0.2, 0.2)), toon(0x18201c));
  truss.position.set(0, 6.6, 1.0);
  group.add(truss);
  const coneGeo = keep(new THREE.ConeGeometry(0.85, 6.8, 20, 1, true));
  coneGeo.translate(0, -3.4, 0);
  const cones = [];
  for (const [x, tx] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    const fix = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.18, 0.25, 0.36, 10)), toon(0x0c100e));
    fix.position.set(x, 6.4, 1.0);
    group.add(fix);
    const m = basic(GREEN, { transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(coneGeo, m);
    c.position.copy(fix.position);
    group.add(c);
    cones.push({ cone: c, mat: m, baseX: x, tx, side: tx < 0 ? 'player' : 'rival' });
  }

  // ── Crowd: operators with glowing visors ────────────────────────
  const spots = [];
  const row = (n, x0, x1, z, y) => { for (let i = 0; i < n; i++) spots.push({ x: x0 + (x1 - x0) * (i + 0.2 + Math.random() * 0.6) / n, z: z + Math.random() * 0.5, y }); };
  const cs = low ? 0.6 : 1;
  row(Math.round(13 * cs), -6.6, 6.6, 5.3, -1.0);
  row(Math.round(15 * cs), -7.6, 7.6, 6.3, -1.1);
  row(Math.round(5 * cs), -9.4, -6.6, 1.6, -0.62);
  row(Math.round(5 * cs), 6.6, 9.4, 1.6, -0.62);
  const CN = spots.length;
  const crowdMat = toon(0xffffff);
  const cBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.26, 0.6, 3, 8)), crowdMat, CN);
  const cHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.2, 10, 8)), crowdMat, CN);
  const cVisor = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.3, 0.07, 0.06)), basic(0xffffff), CN);
  const cArm = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6)), crowdMat, CN * 2);
  const coats = [0x14181a, 0x1b2a22, 0x0f1512, 0x23302a, 0x101418];
  const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22];
  spots.forEach((c, i) => {
    c.ph = Math.random() * 6.28; c.hype = 0.6 + Math.random() * 0.6;
    cBody.setColorAt(i, col.set(coats[i % coats.length]));
    cHead.setColorAt(i, col.set(skins[i % skins.length]));
    cVisor.setColorAt(i, col.set(i % 4 ? GREEN : 0xd8fff0));
    cArm.setColorAt(i * 2, col.set(coats[i % coats.length])); cArm.setColorAt(i * 2 + 1, col.set(coats[i % coats.length]));
  });
  group.add(cBody, cHead, cVisor, cArm);

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xe4fff0, 0x0c2216, 1.15);
  const key = new THREE.DirectionalLight(0xffffff, 1.75);
  key.position.set(1.5, 6, 6);
  const rimL = new THREE.PointLight(0x00ff55, 22, 12, 1.6); rimL.position.set(-3.5, 3, -1.5);
  const rimR = new THREE.PointLight(0x7dffe0, 20, 12, 1.6); rimR.position.set(3.5, 3, -1.5);
  const top = new THREE.PointLight(0x9dffbe, 10, 14, 1.5); top.position.set(0, 5.2, 1.2);
  group.add(hemi, key, rimL, rimR, top);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, top: top.intensity };

  // ── State + update ──────────────────────────────────────────────
  const S = { L: 1, flash: 0, cheer: 0, focus: 0, rip: null, solo: null, glitch: 0, rainT: 0, rainBoost: 0, red: 0 };
  const tint = new THREE.Color(), redC = new THREE.Color(0xff2a3a), greenC = new THREE.Color(GREEN);

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), L = S.L;
    S.flash = Math.max(0, S.flash - dt * 2.2);
    S.cheer = Math.max(0, S.cheer - dt * 0.5);
    S.glitch = Math.max(0, S.glitch - dt);
    S.red = Math.max(0, S.red - dt * 0.6);
    S.rainBoost = Math.max(0, S.rainBoost - dt * 0.8);
    S.focus += ((info.leader || 0) - S.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (S.solo) {
      const so = S.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) S.solo = null;
    }
    // The theme's own fog (the session's default is purple).
    const scene = group.parent;
    if (scene && scene.fog && !scene.userData.bfmFog) { scene.fog.color.set(0x010a04); scene.userData.bfmFog = true; }

    // Code rain: falls with the music; a SOLO drops it into bullet time.
    const speed = (0.22 + 0.5 * S.rainBoost) * (1 - 0.85 * soloK);
    S.rainT += dt * speed;
    tint.copy(greenC).lerp(redC, Math.min(1, S.red * 1.4));
    for (const m of rainMats) {
      m.uniforms.uTime.value = S.rainT;
      m.uniforms.uBright.value = m.userData.base * (0.55 + 0.45 * onBeat + 0.6 * S.flash) * (0.25 + 0.75 * L) * (1 - 0.45 * soloK);
      m.uniforms.uTint.value.copy(tint);
    }
    sky.material.uniforms.uPulse.value = onBeat * 0.7 * L + S.flash;
    sky.material.uniforms.uRed.value = Math.min(1, S.red);

    // Floor.
    const fu = floorMat.uniforms;
    fu.uBeat.value = onBeat; fu.uFlash.value = S.flash; fu.uLevel.value = L; fu.uTime.value = songTime;
    if (S.rip) { fu.uRip.value.set(S.rip.x, 0, songTime - S.rip.t, S.rip.k); if (songTime - S.rip.t > 2) S.rip = null; }
    else fu.uRip.value.w = 0;
    fu.uSolo.value.set(soloX, soloK);
    fu.uTint.value.copy(tint);
    edgeMat.color.copy(tint).multiplyScalar(0.5 + 0.5 * onBeat + 0.5 * S.flash);

    // Racks blink in waves.
    racks.forEach((r, i) => {
      const k = 0.45 + 0.55 * Math.max(0, Math.sin(songTime * 3 + r.ph + beat * Math.PI));
      ledMesh.setColorAt(i, col.setRGB(k * L, k * L, k * L));
    });
    ledMesh.instanceColor.needsUpdate = true;
    signMat.opacity = L * (0.82 + 0.18 * onBeat) * (S.glitch > 0 && Math.sin(songTime * 60) > 0 ? 0.3 : 1) * (Math.sin(songTime * 13) > 0.985 ? 0.5 : 1);
    beacon.visible = (Math.floor(songTime * 1.2) % 2) === 0;

    // Balloons drift up and wrap; burners flare on big moments.
    for (const b of balloons) {
      b.flare = Math.max(0, b.flare - dt * 1.5);
      const y = b.y0 + ((((songTime * 0.25 + b.ph * 3) % 26) + 26) % 26) - 8;
      b.obj.position.set(b.x + Math.sin(songTime * 0.2 + b.ph) * 0.8, y + Math.sin(songTime * 0.9 + b.ph) * 0.15, b.z);
      b.obj.rotation.y = songTime * 0.1 + b.ph;
      const f = 0.4 + 0.3 * onBeat + 1.2 * b.flare;
      b.flame.scale.set(0.6 + 0.6 * f, 0.4 + 1.6 * f, 0.6 + 0.6 * f);
      b.flame.visible = L > 0.1;
    }

    // Code particles fall.
    const pv = (1 + 1.5 * S.rainBoost) * (1 - 0.85 * soloK);
    for (let i = 0; i < PN; i++) {
      pPos[i * 3 + 1] -= pSpd[i] * pv * dt;
      if (pPos[i * 3 + 1] < -0.5) pPos[i * 3 + 1] += 12.5;
    }
    pGeo.attributes.position.needsUpdate = true;
    pMat.color.copy(tint);
    pMat.opacity = 0.5 + 0.5 * onBeat;

    // Rings.
    for (const r of rings) {
      if (r.life <= 0) continue;
      r.life -= dt * 0.9;
      const u = 1 - r.life, s = 0.4 + u * 4.5;
      r.mesh.position.set(r.x, r.y + u * 0.3, 0.2);
      r.mesh.scale.set(s, s, s);
      r.mat.opacity = Math.max(0, r.life) * 0.9;
      if (r.life <= 0) r.mesh.visible = false;
    }

    // Cones swing to the dancers (and all onto the soloist).
    cones.forEach((c, i) => {
      const lead = c.side === 'player' ? Math.max(0, S.focus) : Math.max(0, -S.focus);
      const sway = Math.sin(songTime * 0.9 + i * 1.7) * 0.3;
      const dx = c.tx + (soloX - c.tx) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.6);
      c.cone.rotation.x = -0.1;
      c.mat.color.copy(tint);
      c.mat.opacity = (0.03 + 0.05 * onBeat + 0.05 * lead + 0.1 * S.flash) * L * (1 + 0.6 * soloK);
    });

    // Crowd: bob on the beat, arms up when hyped.
    const hype = Math.min(1, 0.35 + S.cheer + Math.abs(S.focus) * 0.3);
    spots.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(beat * Math.PI * 2 + c.ph * 0.3)) * (0.06 + 0.3 * hype * c.hype) * L;
      dummy.position.set(c.x, c.y + 0.58 + jump, c.z);
      dummy.rotation.set(0, Math.atan2(-c.x, -c.z + 8) * 0.3, S.focus * 0.12 * Math.sign(-c.x || 1));
      dummy.scale.setScalar(1); dummy.updateMatrix();
      cBody.setMatrixAt(i, dummy.matrix);
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

    // Glitch: the whole stage jitters for a moment.
    if (S.glitch > 0) group.position.set((Math.sin(songTime * 91) * 0.06) * S.glitch, 0, (Math.sin(songTime * 57) * 0.03) * S.glitch);
    else group.position.set(0, 0, 0);

    // Lights.
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.5 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, S.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.6 * onBeat + 0.6 * Math.max(0, -S.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    top.intensity = base.top * L * (0.6 + 0.4 * onBeat + S.flash) * (1 + soloK);
    top.position.x = soloX * soloK;
    top.color.copy(tint).lerp(col.set(0xffffff), 0.5);
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { S.rip = { t: data.songTime, x, k: 1 }; S.cheer = Math.min(1, S.cheer + 0.35); S.rainBoost = Math.max(S.rainBoost, 0.6); }
        if (data.tier >= 4) { S.flash = 0.6; ring(x, 0.1); ring(x, 1.2); for (const b of balloons) b.flare = 1; }
        break;
      case 'taunt':
        S.flash = 0.4; S.glitch = 0.4; S.rainBoost = 1;
        break;
      case 'tauntLanded':
        S.flash = 1; S.cheer = 1; S.glitch = 1.2; S.red = 1.6;
        ring(data.attacker === 'rival' ? -1.6 : 1.6, 1.0);
        break;
      case 'dodge':
        S.cheer = Math.min(1, S.cheer + 0.6); S.flash = 0.5;
        ring(data.who === 'rival' ? 1.6 : -1.6, 0.9);
        break;
      case 'end':
        S.cheer = 1; S.flash = 1; S.rainBoost = 1.5; ring(x, 0.1); ring(x, 1.0); ring(x, 2.0);
        for (const b of balloons) b.flare = 1.5;
        break;
      case 'drop':
        S.flash = 1; S.rainBoost = 1.5; ring(0, 0.1);
        break;
      case 'solo':
        S.solo = { x, t0: data.songTime, t1: data.until };
        S.flash = 0.8; S.cheer = 1; ring(x, 0.1); ring(x, 1.4);
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update,
    react,
    setLightLevel(v) { S.L = Math.max(0, Math.min(1, v)); },
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); },
  };
}
