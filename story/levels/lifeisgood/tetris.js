// LIFE IS GOOD — the living Tetris world: a Caribbean night street dance.
//
// A 3D take on the old drawDancehallScene: a sandy street under criss-
// crossing chaser string lights strung between wooden poles, swaying palm
// trees, colourful zinc-roof shops with neon signs, KING KAYA's towering
// sound-system speaker wall + the selector's booth on the left, a patty &
// jerk stall with a smoking drum grill on the right, a second speaker stack
// down the road, a big moon over the hills — and a crowd that dances
// dancehall (wine, bogle, rag wave, signal-the-plane, gully creepa, point-
// up) to the riddim.
//
// It reacts to Tetris like the old scene did (energy bounce, cheer arms-up
// + confetti from the string lights + streamers + stage flash, the golden
// drop pulse) and much more:
//   move     → a light wave races along the strings that way, crowd leans
//   rotate   → bulbs step to the next colour scheme, rags twirl, the
//              selector spins the record
//   soft     → woofers pump, crowd dips
//   drop     → speaker BOOM: woofers punch, wires bounce, a dust shockwave
//              rolls down the street (all scaled by rows), crowd hops
//   hold     → air horn: "BRAP BRAP!", sound rings from the speakers
//   clear    → 1: confetti + arms up · 2: + streamers · 3: + lighters +
//              fireworks · 4 (TETRIS): "BIG TUNE!", fireworks barrage, the
//              whole street jumps, bulbs strobe gold · combos escalate
//   levelUp  → "LEVEL UP!", firework salute, more people join the dance
//   danger   → police sirens wash the street red/blue, wind in the palms
//   gameOver → power cut: bulbs die in a cascade, the crowd stops, phone
//              torches come up · start → power back on, the street cheers
//
// Cheap: one merged vertex-coloured toon mesh for the whole static set,
// instanced crowd (13 instanced parts), one GPU sprite pool for every glow
// / bulb / spark / text pop and one for confetti / smoke; 3 point lights.

import { createKit, rng } from './kit.js';

const BULB_COLS = [0xff3030, 0xffd23a, 0x30ff6a, 0xff8a1f, 0xff4fb0, 0x3ac8ff];
const SCHEMES = [
  [0xff3030, 0xffd23a, 0x30ff6a, 0xff8a1f, 0xff4fb0, 0x3ac8ff],   // carnival
  [0xffd23a, 0x30d050, 0x101010, 0xffd23a, 0x30d050, 0xffe080],   // gold + green
  [0xff4fb0, 0xb35cff, 0x3ac8ff, 0xff4fb0, 0xb35cff, 0x3ac8ff],   // neon
  [0xffb040, 0xff7020, 0xffe0a0, 0xffb040, 0xff7020, 0xffe0a0],   // warm
];
const SHIRTS = [0xff3333, 0x00cc44, 0xffd700, 0xff69b4, 0x00bfff, 0xff8c00, 0xee82ee, 0xff4500, 0x1faa4f, 0xffffff, 0x2bd4ff, 0xb35cff];
const PANTS = [0x1a1a6e, 0x330066, 0x8b0000, 0x006600, 0x4b0082, 0x006400, 0x1c1c1c, 0x00008b, 0xf0f0f0, 0x2a2a2a, 0xd0a060];
const SKINS = [0x8b4513, 0xc68642, 0x4a2c0a, 0xd2691e, 0x6b3a1a, 0x9a5a2a, 0x5a3010];

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const K = createKit(THREE);
  const { keep, canvasTex, toon, Builder } = K;
  const R = rng(808);
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(0x120c26, 24, 80);
  scene.background = new THREE.Color(0x05060f);
  camera.far = 240; camera.near = 0.1;
  const col = new THREE.Color(), col2 = new THREE.Color(), dummy = new THREE.Object3D(), M4 = new THREE.Matrix4(), V3 = new THREE.Vector3();
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x5a6cc0, 0x4a2a12, 1.25); root.add(hemi);
  const moonL = new THREE.DirectionalLight(0xb0c0ff, 0.9); moonL.position.set(-8, 16, -6); root.add(moonL); root.add(moonL.target);
  const pSound = new THREE.PointLight(0xffc040, 26, 16, 1.4); pSound.position.set(-5.0, 3.4, 0.6); root.add(pSound);
  const pStall = new THREE.PointLight(0xff7a30, 22, 14, 1.4); pStall.position.set(5.0, 2.8, 0.2); root.add(pStall);
  const pParty = new THREE.PointLight(0xff3d9a, 30, 30, 1.2); pParty.position.set(0, 6.5, -7); root.add(pParty);

  // ── Textures ────────────────────────────────────────────────────
  // Sprite atlas (4×4 cells of 128 px).
  const atlas = canvasTex(512, 512, (g) => {
    const cell = (i, draw) => { g.save(); g.translate((i % 4) * 128, Math.floor(i / 4) * 128); g.beginPath(); g.rect(0, 0, 128, 128); g.clip(); draw(); g.restore(); };
    cell(0, () => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    cell(1, () => { g.fillStyle = '#fff'; g.fillRect(8, 8, 112, 112); });
    cell(2, () => { g.strokeStyle = '#fff'; g.lineWidth = 9; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke(); });
    cell(3, () => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; for (const r of [0, Math.PI / 2]) { g.save(); g.translate(64, 64); g.rotate(r); g.beginPath(); g.moveTo(-60, 0); g.quadraticCurveTo(0, 5, 60, 0); g.quadraticCurveTo(0, -5, -60, 0); g.fill(); g.restore(); } });
    const word = (i, txt, fill, stroke, size = 50) => cell(i, () => {
      g.translate(64, 66); g.scale(0.5, 1); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `italic 900 ${size}px "Arial Black", Impact, sans-serif`;
      g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = stroke; g.strokeText(txt, 0, 0);
      g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(txt, 0, 0);
      g.fillStyle = fill; g.fillText(txt, 0, 0);
    });
    word(4, 'BIG TUNE!', '#ffe04a', '#ff3060');
    word(5, 'PULL UP!', '#ffffff', '#20c040');
    word(6, 'BRAP BRAP!', '#ffd23a', '#ff6a00', 42);
    word(7, 'WHEEL!', '#7affb0', '#008a40');
    cell(8, () => { for (let k = 0; k < 6; k++) { const x = 40 + Math.cos(k) * 22, y = 64 + Math.sin(k * 1.7) * 18; const gr = g.createRadialGradient(x, y, 0, x, y, 40); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } });
    cell(9, () => { const gr = g.createRadialGradient(64, 78, 0, 64, 70, 40); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.35, 'rgba(255,200,80,0.9)'); gr.addColorStop(1, 'rgba(255,90,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(64, 14); g.quadraticCurveTo(98, 70, 64, 112); g.quadraticCurveTo(30, 70, 64, 14); g.fill(); });
    cell(10, () => { g.fillStyle = '#fff'; g.font = '900 100px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', 64, 64); });
    word(11, 'BOOM!', '#ffffff', '#ff8a00', 58);
    word(12, 'LEVEL UP!', '#9ff0ff', '#2050ff', 44);
    word(13, 'BOOYAKA!', '#ffb0e0', '#c00070', 44);
    word(14, 'FORWARD!', '#ffe04a', '#20a040', 44);
    cell(15, () => { const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 54, 128, 20); });
  });
  atlas.generateMipmaps = true;
  const glows = K.spritePool(low ? 800 : 1100, atlas, { additive: true });
  const flats = K.spritePool(low ? 260 : 420, atlas, { additive: false });
  glows.mesh.renderOrder = 6; flats.mesh.renderOrder = 5;
  root.add(flats.mesh, glows.mesh);

  // Shop facades (2×2 atlas of 256 px cells) + neon sign rows.
  const facadeTex = canvasTex(512, 512, (g) => {
    const shop = (cx, cy, wall, trim, sign, signBg, signFg, door) => {
      g.save(); g.translate(cx, cy);
      g.fillStyle = wall; g.fillRect(0, 0, 256, 256);
      for (let y = 6; y < 256; y += 18) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(0, y, 256, 2); }
      g.fillStyle = trim; g.fillRect(0, 0, 256, 14); g.fillRect(0, 242, 256, 14);
      g.fillStyle = signBg; g.fillRect(16, 26, 224, 54);
      g.strokeStyle = trim; g.lineWidth = 5; g.strokeRect(16, 26, 224, 54);
      g.fillStyle = signFg; g.font = '900 34px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(sign, 128, 55);
      // door + windows with warm light
      g.fillStyle = '#2a1608'; g.fillRect(door, 120, 56, 122);
      g.fillStyle = '#ffcf7a'; g.fillRect(door + 6, 128, 44, 50);
      const wx = door < 100 ? 150 : 24;
      g.fillStyle = '#3a2410'; g.fillRect(wx - 6, 112, 92, 80);
      g.fillStyle = '#ffd88a'; g.fillRect(wx, 118, 80, 68);
      g.fillStyle = 'rgba(120,60,20,0.5)'; g.fillRect(wx + 38, 118, 4, 68); g.fillRect(wx, 150, 80, 4);
      g.fillStyle = trim; for (let k = 0; k < 8; k++) g.fillRect(wx - 6 + k * 12, 104, 8, 10);
      g.restore();
    };
    shop(0, 0, '#ff3d6e', '#ffe14a', 'PATTIES', '#ffe14a', '#c0102a', 30);
    shop(256, 0, '#1faa4f', '#ffd23a', 'RUM BAR', '#101010', '#ffd23a', 170);
    shop(0, 256, '#2bd4ff', '#ff3d6e', 'BARBER', '#ffffff', '#1a3ad0', 170);
    shop(256, 256, '#ffc81e', '#1faa4f', 'JERK HUT', '#1faa4f', '#fff2a0', 30);
  });
  const neonTex = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
    const row = (i, txt, c, glow, size = 54) => {
      g.save(); g.translate(w / 2, i * 64 + 34); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `italic 900 ${size}px "Arial Black", Impact, sans-serif`;
      g.shadowColor = glow; g.shadowBlur = 16; g.strokeStyle = glow; g.lineWidth = 6; g.strokeText(txt, 0, 0);
      g.shadowBlur = 6; g.fillStyle = c; g.fillText(txt, 0, 0);
      g.restore();
    };
    row(0, 'KING KAYA SOUND', '#fff4c0', '#ffb000', 46);
    row(1, 'LIFE IS GOOD', '#fff0ff', '#ff2d9a');
    row(2, 'PATTIES · JERK', '#fffbe0', '#ff6a00', 48);
    row(3, 'RUM BAR', '#e0fff0', '#00e070');
    row(4, 'OPEN LATE', '#e8f4ff', '#20a0ff');
    row(5, 'DANCEHALL', '#ffffe0', '#ffd000');
    row(6, '★ BIG UP ★', '#ffe8ff', '#c040ff');
    row(7, 'SOUND CLASH', '#fff', '#ff3030', 50);
  });
  const frondTex = canvasTex(128, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#2c5a1a'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, h); g.lineTo(64, 0); g.stroke();
    for (let y = h - 20; y > 10; y -= 9) {
      const t = 1 - y / h, len = 58 * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.08)) + 6;
      for (const s of [-1, 1]) {
        g.strokeStyle = (y / 9) % 2 < 1 ? '#3f8a26' : '#2f7020'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + s * len * 0.5, y - 6, 64 + s * len, y + 16); g.stroke();
      }
    }
  }, { srgb: true });
  const ringTex = canvasTex(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#0a0918'; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h - 40 - 22 * Math.sin(x * 0.006) - 14 * Math.sin(x * 0.021 + 1) - 6 * Math.sin(x * 0.07));
    g.lineTo(w, h); g.fill();
    // distant palms
    for (let k = 0; k < 22; k++) {
      const x = (k * 47.3 + (k * k * 13) % 40) % w, base = h - 46 - 20 * Math.sin(x * 0.006), ht = 26 + (k * 7) % 22, lean = ((k * 5) % 9 - 4) * 1.6;
      g.strokeStyle = '#0a0918'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + lean, base - ht * 0.6, x + lean * 1.8, base - ht); g.stroke();
      g.lineWidth = 2.5;
      for (let f = 0; f < 7; f++) { const a = -Math.PI + f * Math.PI / 6 + 0.1; g.beginPath(); g.moveTo(x + lean * 1.8, base - ht); g.quadraticCurveTo(x + lean * 1.8 + Math.cos(a) * 9, base - ht + Math.sin(a) * 9 - 4, x + lean * 1.8 + Math.cos(a) * 15, base - ht + Math.sin(a) * 6 + 5); g.stroke(); }
    }
    // house lights on the hills
    for (let k = 0; k < 60; k++) { const x = (k * 97.7) % w, y = h - 30 - (k * 13) % 26; g.fillStyle = k % 3 ? 'rgba(255,200,120,0.9)' : 'rgba(255,240,200,0.8)'; g.fillRect(x, y, 2, 2); }
  });
  ringTex.wrapS = THREE.RepeatWrapping;

  // ── Sky ─────────────────────────────────────────────────────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(150, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uFlash: { value: 0 }, uSiren: { value: 0 }, uPower: { value: 1 }, uMoon: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p; }',
    fragmentShader: `varying vec3 vP; uniform float uTime, uPulse, uFlash, uSiren, uPower, uMoon;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.012,0.02,0.07), mid = vec3(0.04,0.07,0.2), hor = vec3(0.34,0.12,0.30);
        vec3 c = mix(mid, top, smoothstep(0.12, 0.7, h));
        c = mix(hor, c, smoothstep(-0.02, 0.22, h));
        c += vec3(0.35,0.22,0.05) * (0.25 * uPower + uPulse) * smoothstep(0.25, 0.0, abs(h - 0.03));
        vec3 md = normalize(vec3(-0.42, 0.34, -0.84));
        float m = dot(vP, md);
        c = mix(c, vec3(1.0, 0.96, 0.82), smoothstep(0.9988, 0.9991, m));
        c += vec3(0.25,0.22,0.3) * pow(max(m, 0.0), 24.0) * 0.3 * uMoon + vec3(0.6, 0.55, 0.45) * smoothstep(0.985, 0.999, m) * 0.35 * uMoon;
        c += mix(vec3(0.9,0.05,0.05), vec3(0.1,0.2,1.0), step(0.0, sin(uTime * 9.0))) * uSiren * 0.12 * smoothstep(0.4, 0.0, h);
        c *= 1.0 + uFlash * 1.2;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  sky.renderOrder = -10; root.add(sky);
  // Stars: a point cloud (twinkle in the shader) — cheaper than per-pixel sky stars.
  const NST = low ? 220 : 420;
  const stPos = new Float32Array(NST * 3), stPh = new Float32Array(NST);
  for (let i = 0; i < NST; i++) {
    const a = R() * Math.PI * 2, y = 0.12 + Math.pow(R(), 0.7) * 0.85, r = 140, q = Math.sqrt(1 - y * y);
    stPos[i * 3] = Math.cos(a) * r * q; stPos[i * 3 + 1] = y * r; stPos[i * 3 + 2] = Math.sin(a) * r * q; stPh[i] = R() * 30;
  }
  const starGeo = keep(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3)); starGeo.setAttribute('aPh', new THREE.BufferAttribute(stPh, 1));
  const starMat = keep(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 1 } }, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aPh; uniform float uTime; varying float vA; void main(){ vA = 0.55 + 0.45 * sin(uTime * 2.3 + aPh); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 1.5 + fract(aPh) * 1.6; }',
    fragmentShader: 'uniform float uK; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.1, length(d)); gl_FragColor = vec4(vec3(0.9, 0.92, 1.0) * a * vA * uK, 1.0); }',
  }));
  const stars = new THREE.Points(starGeo, starMat); stars.renderOrder = -9.5; stars.frustumCulled = false; root.add(stars);
  const hills = new THREE.Mesh(keep(new THREE.CylinderGeometry(120, 120, 34, 48, 1, true)), keep(new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide })));
  ringTex.repeat.set(3, 1); hills.position.y = 10; hills.renderOrder = -9; root.add(hills);

  // ── Ground: sandy street, coloured floor spots, shockwave, sirens ──
  const SPOTS = 6;
  const groundMat = keep(new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uSpot: { value: Array.from({ length: SPOTS }, () => new THREE.Vector4()) },
      uSpotCol: { value: Array.from({ length: SPOTS }, () => new THREE.Color()) },
      uRing: { value: new THREE.Vector4(0, 0, 0, 0) }, uFlash: { value: 0 }, uPower: { value: 1 },
      uSiren: { value: 0 }, uTime: { value: 0 }, uWarm: { value: new THREE.Color(0.22, 0.13, 0.05) },
    }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec4 uSpot[${SPOTS}]; uniform vec3 uSpotCol[${SPOTS}]; uniform vec4 uRing; uniform float uFlash, uPower, uSiren, uTime; uniform vec3 uWarm;
      varying vec3 vW;
      #include <fog_pars_fragment>
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 p = vW.xz;
        float n = hash(floor(p * 9.0)), n2 = hash(floor(p * 2.3) + 7.0);
        vec3 sand = vec3(0.36, 0.27, 0.18) * (0.8 + 0.3 * n) * (0.9 + 0.2 * n2);
        float street = smoothstep(4.6, 3.4, abs(p.x));
        vec3 c = mix(sand, vec3(0.27, 0.2, 0.15) * (0.85 + 0.25 * n), street * 0.7) * 0.32;
        // warm light under the string lights
        float wires = 0.55 + 0.45 * cos(p.y * 1.25);
        c += uWarm * uPower * wires * smoothstep(10.0, 2.0, abs(p.x)) * smoothstep(-34.0, -4.0, p.y + 0.0) ;
        c += uWarm * uPower * 0.8 * smoothstep(12.0, 0.0, abs(p.x)) * smoothstep(-6.0, 4.0, p.y) * smoothstep(12.0, 4.0, p.y);
        for (int i = 0; i < ${SPOTS}; i++) {
          vec2 d = (p - uSpot[i].xy) / uSpot[i].z;
          c += uSpotCol[i] * uSpot[i].w * exp(-dot(d, d) * 2.2);
        }
        float r = length(p - uRing.xy);
        float ring = exp(-pow((r - uRing.z) * 1.6, 2.0)) * uRing.w;
        c += vec3(1.0, 0.75, 0.35) * ring * 0.5 + vec3(0.25, 0.18, 0.1) * uRing.w * smoothstep(uRing.z, 0.0, r) * 0.25;
        vec3 sir = mix(vec3(1.0, 0.06, 0.04), vec3(0.08, 0.2, 1.0), step(0.0, sin(uTime * 9.0)));
        c += sir * uSiren * 0.22 * smoothstep(60.0, 6.0, length(p - vec2(0.0, -22.0)));
        c *= 1.0 + uFlash * 0.9;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  }));
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(260, 260)), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.z = -60; root.add(ground);

  // ── Static set: one merged vertex-coloured toon mesh ─────────────
  const setB = new Builder();
  const facB = new Builder();
  const setMat = toon({ vertexColors: true });
  const facMat = toon({ map: facadeTex });
  // Wire poles (both sides of the street).
  const POLE_Z = [3, -3, -9, -15, -21, -28];
  const poles = [];
  POLE_Z.forEach((z, i) => {
    for (const s of [-1, 1]) {
      const x = s * (7.2 + (i % 2) * 0.6);
      setB.cyl(0.11, 0.15, 6.2, 6, x, 3.1, z, 0x5a3a20);
      setB.box(0.9, 0.1, 0.1, x, 5.9, z, 0x5a3a20, 0, 0, 0);
      poles.push({ x, y: 5.85, z, s, i });
    }
  });
  for (const sx of [-5.2, 5.2]) setB.cyl(0.1, 0.14, 6.6, 6, sx, 3.3, 8.2, 0x5a3a20);
  // Shops along the street (angled a little toward the camera: a curving street).
  const shops = [];
  const shop = (x, z, w, h, d, yaw, cell, wall, roof) => {
    const m = (lx, ly, lz) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [x + lx * c + lz * s, ly, z - lx * s + lz * c]; };
    const [bx, , bz] = m(0, 0, -d / 2);
    setB.box(w, h, d, bx, h / 2, bz, wall, 0, yaw, 0);
    // zinc roof: two sloped slabs + a stripe pattern of ridges
    for (const sd of [-1, 1]) {
      const [rx, , rz] = m(0, 0, -d / 2 + sd * d * 0.27);
      setB.box(w + 0.5, 0.08, d * 0.6, rx, h + 0.36, rz, roof, sd * -0.42, yaw, 0, null);
    }
    for (let k = 0; k < 6; k++) { const [rx, , rz] = m(-w / 2 + (k + 0.5) * w / 6, 0, 0.2); setB.box(0.05, 0.05, 0.4, rx, h + 0.02, rz, 0x8a8a90, 0, yaw, 0); }
    // facade (textured) a hair in front of the wall
    const [fx, , fz] = m(0, 0, 0.012);
    const u = (cell % 2) * 0.5, v = cell < 2 ? 0.5 : 0;
    facB.plane(w, h, fx, h / 2, fz, 0xffffff, 0, yaw, 0, [u, v, u + 0.5, v + 0.5]);
    // porch posts + awning
    for (const px of [-w / 2 + 0.15, w / 2 - 0.15]) { const [qx, , qz] = m(px, 0, 1.1); setB.cyl(0.06, 0.06, h * 0.72, 5, qx, h * 0.36, qz, 0xe8e0d0); }
    const [ax, , az] = m(0, 0, 0.6);
    setB.box(w + 0.2, 0.06, 1.3, ax, h * 0.73, az, roof, 0.18, yaw, 0);
    shops.push({ x, z, yaw, w, h });
  };
  shop(-10.6, -6.0, 4.4, 3.2, 4, 1.05, 3, 0xffc81e, 0x8a5a3a);
  shop(-11.6, -13.0, 4.6, 3.6, 4, 1.25, 1, 0x1faa4f, 0x6a6a72);
  shop(-12.2, -20.5, 5.0, 3.4, 4, 1.35, 0, 0xff3d6e, 0x8a4a2a);
  shop(10.8, -9.0, 4.6, 3.4, 4, -1.1, 2, 0x2bd4ff, 0x7a7a80);
  shop(11.8, -16.0, 4.6, 3.2, 4, -1.25, 1, 0x1faa4f, 0x8a5a3a);
  shop(12.4, -23.5, 5.0, 3.6, 4, -1.35, 3, 0xffc81e, 0x6a6a72);
  // Far end of the street: a row of little houses across.
  for (let k = 0; k < 7; k++) {
    const x = -12 + k * 4, z = -34 - (k % 2) * 1.5, h = 2.6 + (k % 3) * 0.6;
    setB.box(3.4, h, 3, x, h / 2, z, [0xff8a1f, 0x2bd4ff, 0xffc81e, 0xb35cff, 0x1faa4f, 0xff3d6e, 0xffffff][k], 0, 0, 0);
    setB.box(3.8, 0.1, 2, x, h + 0.35, z + 0.7, 0x6a6a72, 0.4, 0, 0); setB.box(3.8, 0.1, 2, x, h + 0.35, z - 0.7, 0x6a6a72, -0.4, 0, 0);
    setB.box(0.7, 0.8, 0.05, x - 0.7, 1.3, z + 1.52, 0xffd88a); setB.box(0.6, 1.4, 0.05, x + 0.7, 0.7, z + 1.52, 0x2a1608);
  }

  // Sound system: KING KAYA SOUND speaker wall (left) + a second stack (right).
  const woofers = [];          // { group, lx, ly, r }
  const speakerStack = (x, z, yaw, cols, rows, scale) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.scale.setScalar(scale); root.add(g);
    const bw = 1.15, bh = 1.0, bd = 0.9;
    const B2 = new Builder();
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const cx = (c - (cols - 1) / 2) * (bw + 0.04), cy = bh / 2 + r * (bh + 0.03);
      B2.box(bw, bh, bd, cx, cy, 0, r === rows - 1 ? 0x22222a : 0x15151b);
      B2.box(bw * 0.92, 0.05, 0.02, cx, cy + bh * 0.44, bd / 2 + 0.01, 0xffc81e);
      woofers.push({ g, lx: cx, ly: cy - 0.04, lz: bd / 2 + 0.02, r: r === rows - 1 ? 0.3 : 0.4, horn: r === rows - 1 });
    }
    // tweeter horns on top
    for (let c = 0; c < cols; c++) { const cx = (c - (cols - 1) / 2) * (bw + 0.04); B2.box(0.7, 0.35, 0.6, cx, rows * (bh + 0.03) + 0.18, 0.05, 0x2a2a32); B2.box(0.5, 0.22, 0.04, cx, rows * (bh + 0.03) + 0.18, 0.36, 0x0a0a0c); }
    const m = new THREE.Mesh(B2.build(), setMat); g.add(m);
    return g;
  };
  const stackL = speakerStack(-6.7, -2.6, 0.8, 2, 3, 1.0);
  const stackR = speakerStack(7.6, -6.2, -0.85, 2, 2, 0.9);
  // Woofer cones: one instanced mesh (cone + dust cap), punched on the beat.
  const coneB = new Builder();
  coneB.add(new THREE.CylinderGeometry(1, 0.35, 0.22, 16, 1, true), coneB.m4(0, 0, -0.11, Math.PI / 2, 0, 0), 0x2a2a30);
  coneB.add(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), coneB.m4(0, 0, -0.2, Math.PI / 2, 0, 0), 0x55555c);
  coneB.add(new THREE.TorusGeometry(1.0, 0.07, 5, 18), coneB.m4(0, 0, 0, 0, 0, 0), 0x0e0e12);
  const coneMesh = new THREE.InstancedMesh(coneB.build(), toon({ vertexColors: true }), woofers.length);
  coneMesh.frustumCulled = false; root.add(coneMesh); keep(coneMesh);
  // Booth (selector's table + decks) by the speaker wall.
  const booth = new THREE.Group(); booth.position.set(-4.5, 0, -1.2); booth.rotation.y = 0.75; root.add(booth);
  {
    const B3 = new Builder();
    B3.box(1.9, 0.95, 0.75, 0, 0.475, 0, 0x1a1a22);
    B3.box(1.95, 0.06, 0.8, 0, 0.97, 0, 0xffc81e);
    B3.box(1.7, 0.4, 0.04, 0, 0.55, 0.39, 0x1faa4f);
    B3.box(0.3, 0.06, 0.4, 0, 1.03, 0, 0x30303a);
    booth.add(new THREE.Mesh(B3.build(), setMat));
  }
  const platters = [];
  for (const sx of [-0.55, 0.55]) {
    const p = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16)), keep(new THREE.MeshToonMaterial({ color: 0x18181c, gradientMap: K.toonGrad })));
    p.position.set(sx, 1.03, 0); booth.add(p); platters.push(p);
    const lab = new THREE.Mesh(keep(new THREE.BoxGeometry(0.12, 0.012, 0.03)), keep(new THREE.MeshBasicMaterial({ color: 0xffd23a }))); lab.position.set(0.12, 0.026, 0); p.add(lab);
  }
  // Patty & jerk stall (right).
  const stall = new THREE.Group(); stall.position.set(5.6, 0, -1.6); stall.rotation.y = -0.8; root.add(stall);
  {
    const B4 = new Builder();
    B4.box(2.4, 1.0, 0.8, 0, 0.5, 0, 0x8a4a22);
    B4.box(2.5, 0.06, 0.9, 0, 1.02, 0.02, 0xffe14a);
    for (const px of [-1.15, 1.15]) for (const pz of [-0.35, 0.35]) B4.cyl(0.05, 0.05, 2.4, 5, px, 1.2, pz, 0xe8e0d0);
    B4.box(2.8, 0.08, 1.4, 0, 2.45, 0.05, 0xff3d6e, 0.15, 0, 0);
    for (let k = 0; k < 7; k++) B4.box(0.4, 0.09, 1.42, -1.2 + k * 0.4, 2.452, 0.05, k % 2 ? 0xffffff : 0xff3d6e, 0.15, 0, 0);
    // drum grill (oil drum split) + legs
    B4.cyl(0.32, 0.32, 0.9, 10, 1.75, 0.95, 0.5, 0x3a3a40, 0, 0, Math.PI / 2);
    B4.box(0.95, 0.04, 0.6, 1.75, 1.2, 0.5, 0x2a2a2a);
    for (const lx of [1.4, 2.1]) B4.cyl(0.03, 0.03, 0.8, 4, lx, 0.4, 0.5, 0x222226);
    // patties in a tray, cooler box
    for (let k = 0; k < 5; k++) B4.box(0.22, 0.05, 0.15, -0.8 + k * 0.26, 1.08, 0.15, 0xe0a030);
    B4.box(0.7, 0.5, 0.5, -1.6, 0.25, 0.7, 0x2b7ad4); B4.box(0.72, 0.08, 0.52, -1.6, 0.52, 0.7, 0xffffff);
    stall.add(new THREE.Mesh(B4.build(), setMat));
  }
  // A few crates / benches / a cooler about.
  setB.box(0.6, 0.45, 0.6, -8.4, 0.22, 0.4, 0x8a5a2a); setB.box(0.6, 0.45, 0.6, -8.4, 0.67, 0.4, 0xb07a3a, 0, 0.4, 0);
  setB.box(1.8, 0.1, 0.4, 8.6, 0.48, 1.2, 0x7a5030); setB.box(0.1, 0.48, 0.35, 7.9, 0.24, 1.2, 0x5a3a20); setB.box(0.1, 0.48, 0.35, 9.3, 0.24, 1.2, 0x5a3a20);

  // Palm trees: trunks merged into the set; crowns are groups that sway.
  const palms = [];
  const frondGeo = (() => {
    const fb = new Builder();
    const NF = 9;
    for (let f = 0; f < NF; f++) {
      const a = (f / NF) * Math.PI * 2 + (f % 2) * 0.2, tilt = (f % 3) * 0.12;
      const pg = new THREE.PlaneGeometry(1.0, 3.3, 1, 6); pg.translate(0, 1.65, 0); pg.rotateX(-Math.PI / 2);
      fb.add(pg, fb.m4(0, 0, 0, 0, a, 0), 0xffffff, null, (v) => { const y = -v.z; v.set(v.x * (1 - y * 0.12), 0.5 * y - (0.2 + tilt) * y * y - Math.abs(v.x) * 0.35, y); });
    }
    // coconuts
    for (let k = 0; k < 4; k++) fb.sphere(0.13, Math.cos(k * 1.7) * 0.22, -0.18, Math.sin(k * 1.7) * 0.22, 0x5a3010, 6, 5);
    return fb.build();
  })();
  const frondMat = toon({ map: frondTex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true });
  const palm = (x, z, h, lean, leanDir) => {
    const segs = 7;
    const trunk = new THREE.CylinderGeometry(0.16, 0.26, h, 7, segs);
    trunk.translate(0, h / 2, 0);
    const cl = Math.cos(leanDir), sl = Math.sin(leanDir);
    setB.add(trunk, setB.m4(x, 0, z), 0x7a5232, null, (v) => { const t = v.y / h, off = lean * t * t * h; v.x += off * cl; v.z += off * sl; if (Math.round(v.y / h * segs * 2) % 2) { v.x *= 1.0; } });
    const crown = new THREE.Group(); crown.position.set(x + lean * h * cl, h, z + lean * h * sl);
    crown.add(new THREE.Mesh(frondGeo, frondMat));
    crown.rotation.y = R() * 6.28;
    root.add(crown);
    palms.push({ crown, ph: R() * 6.28, rate: 0.6 + R() * 0.5, lean: lean, cl, sl });
  };
  palm(-9.2, 1.8, 7.4, 0.12, Math.PI + 0.3);
  palm(-8.4, -9.5, 8.6, 0.08, Math.PI);
  palm(-9.8, -17, 9.0, 0.1, Math.PI + 0.5);
  palm(9.6, 2.6, 7.8, 0.14, -0.3);
  palm(8.6, -12.6, 8.8, 0.09, 0.2);
  palm(10.2, -20, 9.4, 0.1, 0);
  if (!low) { palm(-4.6, -30, 9.5, 0.06, 2.6); palm(5.2, -31, 10, 0.07, 0.4); palm(-15, -4, 8.2, 0.12, 3.6); palm(15.5, -2, 8.5, 0.12, -0.5); }

  const setMesh = new THREE.Mesh(setB.build(), setMat), facMesh = new THREE.Mesh(facB.build(), facMat);
  root.add(setMesh, facMesh);

  // Neon signs (additive, each its own material so they can flicker / die).
  const signs = [];
  const sign = (row, x, y, z, yaw, w, h, colr) => {
    const geo = keep(new THREE.PlaneGeometry(w, h));
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / 8);
    const mat = keep(new THREE.MeshBasicMaterial({ map: neonTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = yaw; root.add(m);
    signs.push({ m, mat, ph: R() * 10, base: colr || 1, dead: 0 });
    return m;
  };
  sign(0, -6.7 + Math.sin(0.8) * 0.0, 3.55, -2.6, 0.8, 2.6, 0.34);       // on the speaker wall
  { const s = signs[0].m; s.position.set(-6.7 + Math.sin(0.8) * 0.5, 3.75, -2.6 + Math.cos(0.8) * 0.5); }
  sign(1, -10.6 + Math.sin(1.05) * 0.3, 4.75, -6.0 + Math.cos(1.05) * 0.3, 1.05, 4.6, 0.6);
  sign(2, 5.6 + Math.sin(-0.8) * 0.6, 2.75, -1.6 + Math.cos(-0.8) * 0.6, -0.8, 2.6, 0.33);
  sign(3, 11.8 + Math.sin(-1.25) * 0.3, 4.2, -16 + Math.cos(-1.25) * 0.3, -1.25, 3.2, 0.42);
  sign(5, 10.8 + Math.sin(-1.1) * 0.3, 4.2, -9 + Math.cos(-1.1) * 0.3, -1.1, 3.6, 0.46);
  sign(7, 7.6 + Math.sin(-0.85) * 0.45, 2.45, -6.2 + Math.cos(-0.85) * 0.45, -0.85, 2.0, 0.27);

  // ── String lights: catenaries between the poles ───────────────────
  const wires = [];
  const addWire = (a, b, sag, n) => wires.push({ a, b, sag, n, bounce: 0, bv: 0, ph: R() * 6 });
  const P = (i, s) => poles.find(p => p.i === i && p.s === s);
  for (let i = 0; i < POLE_Z.length; i++) {
    addWire(P(i, -1), P(i, 1), 1.2, low ? 14 : 20);
    if (i < POLE_Z.length - 1) {
      addWire(P(i, -1), P(i + 1, 1), 1.4, low ? 14 : 22);
      addWire(P(i, -1), P(i + 1, -1), 0.6, 7);
      addWire(P(i, 1), P(i + 1, 1), 0.6, 7);
    }
  }
  // overhead strings near the camera (they fill the top strip in portrait)
  const near = [{ x: -5.2, y: 6.2, z: 8.2 }, { x: 5.2, y: 6.2, z: 8.2 }];
  addWire(near[0], near[1], 1.0, low ? 12 : 16);
  addWire(near[0], P(0, 1), 1.3, low ? 12 : 18);
  addWire(near[1], P(0, -1), 1.3, low ? 12 : 18);
  // strings from the speaker wall / stall roof to the nearest poles
  addWire({ x: -6.2, y: 3.9, z: -2.2 }, P(0, -1), 0.5, 6);
  addWire({ x: 5.0, y: 2.5, z: -1.1 }, P(0, 1), 0.5, 6);
  let nBulbs = 0;
  wires.forEach((w) => { w.first = nBulbs; nBulbs += w.n; });
  const bulbs = new Float32Array(nBulbs * 4);     // x y z u(along street x, -1..1)
  const wireGeo = keep(new THREE.BufferGeometry());
  const WSEG = 10;
  const wirePos = new Float32Array(wires.length * WSEG * 6);
  wireGeo.setAttribute('position', new THREE.BufferAttribute(wirePos, 3).setUsage(THREE.DynamicDrawUsage));
  const wireLines = new THREE.LineSegments(wireGeo, keep(new THREE.LineBasicMaterial({ color: 0x2a1c10 })));
  wireLines.frustumCulled = false; root.add(wireLines);

  // ── Crowd ──────────────────────────────────────────────────────
  // One template rig (Object3D tree) posed per dancer; its world matrices
  // are copied into 13 instanced part meshes.
  const node = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); if (parent) parent.add(o); return o; };
  const rRoot = node(null, 0, 0, 0);
  const rHips = node(rRoot, 0, 0.91, 0);
  const rChest = node(rHips, 0, 0.06, 0);
  const rNeck = node(rChest, 0, 0.5, 0);
  const rShL = node(rChest, -0.21, 0.44, 0), rElL = node(rShL, 0, -0.31, 0);
  const rShR = node(rChest, 0.21, 0.44, 0), rElR = node(rShR, 0, -0.31, 0), rHand = node(rElR, 0, -0.3, 0);
  const rHipL = node(rHips, -0.1, -0.02, 0), rKnL = node(rHipL, 0, -0.42, 0);
  const rHipR = node(rHips, 0.1, -0.02, 0), rKnR = node(rHipR, 0, -0.42, 0);
  const rRag = node(rHand, 0, 0, 0);
  const crowdMat = toon({ color: 0xffffff });
  const limbMat = toon({ vertexColors: true });
  const ragMat = toon({ color: 0xffffff, side: THREE.DoubleSide });
  const partGeo = {
    torso: (() => { const g = new THREE.CylinderGeometry(0.2, 0.155, 0.52, 8); g.translate(0, 0.26, 0); return keep(g); })(),
    pelvis: (() => { const g = new THREE.CylinderGeometry(0.165, 0.175, 0.24, 8); g.translate(0, -0.02, 0); return keep(g); })(),
    head: (() => { const g = new THREE.SphereGeometry(0.13, 10, 8); g.scale(0.92, 1.05, 1); g.translate(0, 0.17, 0); return keep(g); })(),
    hair: (() => { const g = new THREE.SphereGeometry(0.145, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55); g.translate(0, 0.19, -0.01); return keep(g); })(),
    shades: (() => { const g = new THREE.BoxGeometry(0.22, 0.05, 0.04); g.translate(0, 0.19, 0.115); return keep(g); })(),
    uarm: (() => { const g = new THREE.CylinderGeometry(0.058, 0.05, 0.31, 6); g.translate(0, -0.155, 0); return keep(g); })(),
    farm: (() => { const b = new Builder(); b.cyl(0.05, 0.042, 0.29, 6, 0, -0.145, 0, 0xffffff); b.sphere(0.058, 0, -0.31, 0, 0xffffff, 6, 5); return b.build(); })(),
    thigh: (() => { const g = new THREE.CylinderGeometry(0.08, 0.065, 0.42, 6); g.translate(0, -0.21, 0); return keep(g); })(),
    shin: (() => { const b = new Builder(); b.cyl(0.062, 0.05, 0.42, 6, 0, -0.21, 0, 0xffffff); b.box(0.12, 0.08, 0.26, 0, -0.45, 0.06, 0x303030); return b.build(); })(),
    rag: (() => { const g = new THREE.PlaneGeometry(0.42, 0.3, 2, 1); g.translate(0.21, -0.15, 0); return keep(g); })(),
  };
  const NC = low ? 34 : 56;
  const dancers = [];
  const place = (x, z, style, face) => {
    const d = {
      x, z, yaw: face != null ? face : Math.atan2(-x * 0.35, 11 - z) + (R() - 0.5) * 0.9,
      s: 0.92 + R() * 0.2, style: style != null ? style : Math.floor(R() * 6),
      ph: [0, 0, 0.5, 0, 0.25, 0.5][Math.floor(R() * 6)] + (R() - 0.5) * 0.08,
      skin: SKINS[Math.floor(R() * SKINS.length)], shirt: SHIRTS[Math.floor(R() * SHIRTS.length)], pants: PANTS[Math.floor(R() * PANTS.length)],
      hair: Math.floor(R() * 4), hairCol: R() < 0.35 ? SHIRTS[Math.floor(R() * SHIRTS.length)] : 0x150a04, shades: R() < 0.4,
      rag: 0, ragCol: [0xffffff, 0xffd23a, 0xff3030, 0x30d050][Math.floor(R() * 4)],
      jump: -10, jumpH: 0, join: 0, joinAt: 0, torch: R() < 0.6, lean: 0,
    };
    d.rag = d.style === 2 || R() < 0.18 ? 1 : 0;
    dancers.push(d); return d;
  };
  const avoid = [[-6.7, -2.6, 1.9], [-4.5, -1.2, 1.4], [5.6, -1.6, 1.8], [7.6, -6.2, 1.4], [-8.4, 0.4, 0.7], [8.6, 1.2, 1.2]];
  const free = (x, z) => avoid.every(([ax, az, r]) => (x - ax) ** 2 + (z - az) ** 2 > r * r) && dancers.every(d => (d.x - x) ** 2 + (d.z - z) ** 2 > 0.62);
  // the selector + the cook
  const selector = place(-4.85, -1.75, 6, 0.75 + 0.1); selector.hair = 3; selector.hairCol = 0xffd23a; selector.shades = true; selector.shirt = 0x1faa4f; selector.rag = 0;
  const cook = place(5.95, -2.05, 7, -0.8); cook.hair = 2; cook.hairCol = 0xffffff; cook.shirt = 0xffffff; cook.rag = 0;
  const zones = [
    { x0: -9.5, x1: -2.6, z0: -8, z1: 4.5, n: 0.34 },
    { x0: 2.6, x1: 9.5, z0: -8, z1: 4.5, n: 0.34 },
    { x0: -2.6, x1: 2.6, z0: 1.5, z1: 5.2, n: 0.1 },
    { x0: -2.3, x1: 2.3, z0: 4.8, z1: 6.0, n: 0.07 },
    { x0: -8, x1: 8, z0: -20, z1: -8, n: 0.2 },
  ];
  for (const zn of zones) {
    const want = Math.round((NC - 2) * zn.n);
    for (let k = 0, tries = 0; k < want && tries < 400; tries++) {
      const x = zn.x0 + R() * (zn.x1 - zn.x0), z = zn.z0 + R() * (zn.z1 - zn.z0);
      if (!free(x, z)) continue;
      place(x, z); k++;
    }
  }
  // Who joins at which level (the party grows): sort by a random key.
  dancers.forEach((d, i) => { d.joinAt = i < 2 ? 0 : (R() < 0.62 ? 0 : 1 + Math.floor(R() * 7)); d.join = d.joinAt === 0 ? 1 : 0; });
  const ND = dancers.length;
  const parts = {};
  const mkPart = (name, geo, mat, per) => { const m = new THREE.InstancedMesh(geo, mat, ND * per); m.frustumCulled = false; root.add(m); keep(m); parts[name] = m; return m; };
  mkPart('torso', partGeo.torso, crowdMat, 1); mkPart('pelvis', partGeo.pelvis, crowdMat, 1);
  mkPart('head', partGeo.head, crowdMat, 1); mkPart('hair', partGeo.hair, crowdMat, 1); mkPart('shades', partGeo.shades, crowdMat, 1);
  mkPart('uarm', partGeo.uarm, crowdMat, 2); mkPart('farm', partGeo.farm, limbMat, 2);
  mkPart('thigh', partGeo.thigh, crowdMat, 2); mkPart('shin', partGeo.shin, limbMat, 2); mkPart('rag', partGeo.rag, ragMat, 1);
  dancers.forEach((d, i) => {
    parts.torso.setColorAt(i, col.set(d.shirt)); parts.pelvis.setColorAt(i, col.set(d.pants));
    parts.head.setColorAt(i, col.set(d.skin)); parts.hair.setColorAt(i, col.set(d.hairCol)); parts.shades.setColorAt(i, col.set(0x101014));
    for (let k = 0; k < 2; k++) { parts.uarm.setColorAt(i * 2 + k, col.set(d.skin)); parts.farm.setColorAt(i * 2 + k, col.set(d.skin)); parts.thigh.setColorAt(i * 2 + k, col.set(d.pants)); parts.shin.setColorAt(i * 2 + k, col.set(d.pants)); }
    parts.rag.setColorAt(i, col.set(d.ragCol));
  });
  const hairLocal = [new THREE.Matrix4(), new THREE.Matrix4().makeScale(1.4, 1.35, 1.35), new THREE.Matrix4().compose(new THREE.Vector3(0, -0.04, 0), new THREE.Quaternion(), new THREE.Vector3(1.08, 1.6, 1.08)), new THREE.Matrix4().compose(new THREE.Vector3(0, 0.03, 0.02), new THREE.Quaternion(), new THREE.Vector3(1.15, 0.7, 1.25))];
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  // ── State ──────────────────────────────────────────────────────
  const st = {
    t: 0, power: 1, powerT: 1, dead: false, deadT: 0, cheer: 0, flash: 0, gold: 0, strobe: 0,
    scheme: 0, schemeMix: 1, schemePrev: 0, hueShift: 0, waves: [{ t: 9, dir: 1 }, { t: 9, dir: 1 }, { t: 9, dir: 1 }], waveI: 0,
    woof: 0, woofV: 0, dip: 0, ring: 0, ringR: 0, shake: 0, horn: 0, wheel: 0, ragSpin: 0, lean: 0, leanV: 0,
    level: 1, combo: 0, danger: 0, siren: 0, wind: 0, lighters: 0, armsUp: 0, deckSpin: 0, camKick: 0,
    camX: 0, pieceX: 0, portrait: false, startT: 0, lastBeatI: 0, newBeat: false,
  };

  // ── Particles (pooled; no allocation per event) ───────────────────
  const PMAX = low ? 420 : 700;
  const pts = Array.from({ length: PMAX }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1, r: 1, g: 1, b: 1, cell: 0, grav: 0, drag: 0, add: true, rot: 0, vr: 0, kind: 0, sx: 1, sy: 1, fade: 1 }));
  let pCur = 0;
  const emit = (o) => {
    pCur = (pCur + 1) % PMAX;
    if (pts[pCur].kind === 6 && pts[pCur].life > 0) pCur = (pCur + 1) % PMAX;   // never overwrite a live text pop
    const p = pts[pCur];
    p.life = p.max = o.life || 1; p.x = o.x; p.y = o.y; p.z = o.z; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.size = o.size || 0.2; p.r = o.r ?? 1; p.g = o.g ?? 1; p.b = o.b ?? 1; p.cell = o.cell || 0; p.grav = o.grav || 0; p.drag = o.drag || 0;
    p.add = o.add !== false; p.rot = o.rot || 0; p.vr = o.vr || 0; p.kind = o.kind || 0; p.sx = o.sx || 1; p.sy = o.sy || 1; p.grow = o.grow || 0; p.fade = o.fade ?? 1;
    return p;
  };
  const rgb = (hex) => { col2.set(hex); return col2; };
  const confettiBurst = (n) => {
    for (let k = 0; k < n; k++) {
      const w = wires[Math.floor(Math.random() * wires.length)], u = Math.random();
      const x = w.a.x + (w.b.x - w.a.x) * u, z = w.a.z + (w.b.z - w.a.z) * u, y = w.a.y + (w.b.y - w.a.y) * u - w.sag * 4 * u * (1 - u);
      const c = rgb(BULB_COLS[Math.floor(Math.random() * 6)]);
      emit({ x, y, z, vx: (Math.random() - 0.5) * 1.6, vy: -0.3 - Math.random() * 0.8, vz: (Math.random() - 0.5) * 1.6, life: 3.5 + Math.random() * 2, size: 0.13 + Math.random() * 0.08, r: c.r, g: c.g, b: c.b, cell: 1, grav: -0.9, drag: 1.6, add: false, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, kind: 1, sy: 0.5 });
    }
  };
  const streamers = (n) => {
    for (let k = 0; k < n; k++) {
      const d = dancers[Math.floor(Math.random() * ND)];
      const c = rgb(SHIRTS[Math.floor(Math.random() * SHIRTS.length)]);
      emit({ x: d.x, y: 2.2, z: d.z, vx: (Math.random() - 0.5) * 3, vy: 5 + Math.random() * 4, vz: (Math.random() - 0.5) * 3, life: 2.2, size: 0.07, r: c.r, g: c.g, b: c.b, cell: 1, grav: -6, drag: 0.6, add: false, kind: 2, sy: 7 });
    }
  };
  const FW_SPOTS = [[-15, 11, -16], [15, 12, -17], [-12, 13.5, -22], [12, 12.5, -21], [-17, 9.5, -12], [17, 10, -13], [-10, 15, -26], [10, 15.5, -27]];
  const FW_PORTRAIT = [[-2.5, 13, -14], [2.5, 14, -16], [0, 16, -20], [-4, 15, -18], [4, 12.5, -15]];
  const firework = (k, delay = 0) => {
    const list = st.portrait ? FW_PORTRAIT : FW_SPOTS;
    const [x, y, z] = list[k % list.length];
    const c = rgb(BULB_COLS[(k * 7 + st.level) % 6]);
    const p = emit({ x: x * 0.7, y: 1, z, vx: x * 0.3 / 1.2, vy: (y - 1) / 1.2, vz: 0, life: 1.2, size: 0.35, r: 1, g: 0.8, b: 0.5, cell: 0, kind: 3 });
    p.delay = delay; p.cr = c.r; p.cg = c.g; p.cb = c.b; p.tx = x; p.ty = y; p.tz = z;
  };
  const burst = (x, y, z, r, g, b, n) => {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, e = Math.acos(2 * Math.random() - 1), sp = 4 + Math.random() * 2.5;
      emit({ x, y, z, vx: Math.sin(e) * Math.cos(a) * sp, vy: Math.cos(e) * sp, vz: Math.sin(e) * Math.sin(a) * sp, life: 1.4 + Math.random() * 0.6, size: 0.45, r, g, b, cell: 0, grav: -3, drag: 1.4, kind: 4 });
    }
    emit({ x, y, z, life: 0.5, size: 7, r: r * 0.8, g: g * 0.8, b: b * 0.8, cell: 0, kind: 5, grow: 4 });
  };
  const textPop = (cell, x, y, z, size, life = 1.6) => emit({ x, y, z, vy: 0.5, life, size, r: 1, g: 1, b: 1, cell, kind: 6, sx: 2, sy: 1 });
  const soundRings = () => { for (const w of woofers) { if (Math.random() < 0.5) continue; V3.set(w.lx, w.ly, w.lz + 0.1); w.g.localToWorld(V3); emit({ x: V3.x, y: V3.y, z: V3.z, life: 0.7, size: 0.5, r: 1, g: 0.85, b: 0.4, cell: 2, kind: 5, grow: 5 }); } };
  const dustRing = (rows) => {
    st.ring = Math.min(1.4, 0.5 + rows / 14); st.ringR = 0.5;
    const n = Math.min(26, 6 + rows);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 2;
      emit({ x: Math.cos(a) * r, y: 0.2, z: -2 + Math.sin(a) * r, vx: Math.cos(a) * (4 + rows * 0.2), vy: 0.6 + Math.random(), vz: Math.sin(a) * (4 + rows * 0.2), life: 1.4, size: 0.9, r: 0.45, g: 0.36, b: 0.26, cell: 8, drag: 1.8, add: false, kind: 7, grow: 1.6, fade: 0.55 });
    }
  };

  const jumpAll = (h, spread) => { for (const d of dancers) if (d.join > 0.5 && d.style < 6 && Math.random() < 0.9) { d.jump = -Math.random() * spread; d.jumpH = h * (0.7 + Math.random() * 0.5); } };

  // ── Update ─────────────────────────────────────────────────────
  const tmpM = new THREE.Matrix4();
  function poseDancer(d, beat, dt, energyK) {
    const tB = beat + d.ph;
    const live = st.power;              // power cut → the dance stops
    const cos2 = Math.cos(2 * Math.PI * tB), d1 = 0.5 + 0.5 * cos2;       // 1 on the beat
    const half = Math.PI * tB;                                           // one cycle per 2 beats
    let knee = (0.1 + (0.12 + 0.1 * energyK) * d1) * live + 0.05;
    let hx = 0, hz = 0, hyaw = 0, hrx = 0, hrz = 0, cx = 0, cz = 0, cy = 0;
    let lZ = -0.15, lX = 0, lE = -0.3, rZ = 0.15, rX = 0, rE = -0.3, nod = 0.12 * d1 * live, rag = 0, footSpread = 0;
    switch (d.style) {
      case 0: { // WINE: hip circles, torso counter, arms floating out
        hx = 0.08 * Math.cos(half) * live; hz = 0.06 * Math.sin(half) * live; hrz = -0.16 * Math.cos(half) * live; cz = 0.22 * Math.cos(half) * live; cx = 0.2;
        lZ = -0.7 - 0.3 * Math.sin(half); lE = -0.9; rZ = 0.7 - 0.3 * Math.sin(half); rE = -0.9; lX = -0.3; rX = -0.3; knee += 0.12; break;
      }
      case 1: { // BOGLE: chest rolls, arms rolling forward alternately
        cx = 0.28 * Math.sin(2 * half) * live; hx = 0.06 * Math.sin(half) * live; hrz = 0.1 * Math.sin(half) * live;
        lX = -1.1 + 0.8 * Math.sin(2 * half) * live; rX = -1.1 - 0.8 * Math.sin(2 * half) * live; lZ = -0.3; rZ = 0.3; lE = -1.2; rE = -1.2; break;
      }
      case 2: { // RAG WAVE: right arm overhead circling the rag, left on the hip
        rZ = 2.75; rX = 0.25 * Math.sin(2 * half); rE = -0.25; rag = 1;
        lZ = -0.75; lE = -1.9; lX = 0.3; cz = 0.1 * Math.sin(half) * live; hx = 0.05 * Math.sin(half) * live; break;
      }
      case 3: { // SIGNAL THE PLANE: wings out, tilt side to side, step
        const tilt = Math.sin(half * 0.5) * live;
        lZ = -1.45 - 0.1 * d1; rZ = 1.45 + 0.1 * d1; lE = -0.1; rE = -0.1; cz = 0.35 * tilt; hx = 0.1 * tilt; hrz = -0.08 * tilt; break;
      }
      case 4: { // GULLY CREEPA: lean back, knees deep, creeping arm
        const s2 = Math.sin(half * 0.5) * live;
        cx = -0.28; knee += 0.18; hx = 0.08 * s2; hyaw = 0.25 * s2;
        rX = -0.9 + 0.3 * s2; rZ = 0.25; rE = -0.6 - 0.3 * s2; lX = 0.2; lZ = -0.35; lE = -0.4; nod = -0.12 * d1 * live; break;
      }
      case 5: { // POINT UP: pumping finger to the sky on the beat
        rZ = 2.55 + 0.25 * d1 * live; rX = -0.15; rE = -0.1 - 0.4 * (1 - d1) * live;
        lZ = -0.35 - 0.2 * d1; lX = -0.4 * Math.sin(half); lE = -0.8; cz = -0.08; hx = 0.06 * Math.sin(half) * live; break;
      }
      case 6: { // SELECTOR: nodding, hand on the deck, other hand waving
        nod = 0.3 * d1 * live; knee = 0.08 + 0.1 * d1 * live; cx = 0.18;
        lX = -1.0; lZ = -0.15; lE = -0.9;
        const wave = Math.sin(half) * live;
        rZ = 1.2 + 0.9 * (0.5 + 0.5 * wave); rX = -0.3; rE = -0.6 + 0.3 * wave;
        if (st.wheel > 0) { const a = st.t * 14; rX = -1.2 + 0.4 * Math.sin(a); rZ = 0.4 + 0.4 * Math.cos(a); rE = -1.0; }   // wheel up the record
        if (st.horn > 0) { rZ = 2.4; rX = -0.6; rE = -1.2; }                                                             // air horn high
        break;
      }
      case 7: { // COOK: stirring the jerk drum, nodding
        const a = st.t * 3;
        rX = -1.1 + 0.25 * Math.sin(a); rZ = 0.35 + 0.2 * Math.cos(a); rE = -0.8; lX = -0.6; lZ = -0.3; lE = -1.3; cx = 0.15; break;
      }
    }
    // Cheer (line clears): arms shoot up.
    const up = smooth(0, 0.35, st.armsUp) * (d.style >= 6 ? 0.6 : 1) * live;
    if (up > 0) {
      const wv = Math.sin(st.t * 8 + d.ph * 6) * 0.25;
      lZ += (-2.75 + wv - lZ) * up; rZ += (2.75 + wv - rZ) * up; lX += (-0.15 - lX) * up; rX += (-0.15 - rX) * up; lE += (-0.2 - lE) * up; rE += (-0.2 - rE) * up;
    }
    // Power cut: stand, look around (phone torch up on some).
    if (live < 1) {
      const k = 1 - live;
      const look = Math.sin(st.t * 0.7 + d.ph * 9) * 0.6;
      hyaw += look * 0.4 * k;
      if (d.torch && st.deadT > 1.2 && d.style < 6) { rZ += (2.3 - rZ) * k; rX += (-0.6 - rX) * k; rE += (-0.5 - rE) * k; }
      else { lZ += (-0.12 - lZ) * k; rZ += (0.12 - rZ) * k; lE += (-0.25 - lE) * k; rE += (-0.25 - rE) * k; }
    }
    // Jump.
    let jy = 0;
    if (d.jump > -9) {
      d.jump += dt;
      if (d.jump >= 0) {
        const T = 0.55; const u = d.jump / T;
        if (u >= 1) { d.jump = -10; } else { jy = d.jumpH * 4 * u * (1 - u); knee = Math.max(0.05, knee - 0.2 * Math.sin(u * Math.PI)); }
      } else knee += 0.15;
    }
    knee += st.dip * 0.35 * live;
    // Lean toward the last move; heads track the piece.
    const lean = st.lean * (d.style >= 6 ? 0.3 : 1);
    // Join animation: pop in.
    const js = d.join;
    rRoot.position.set(d.x, jy - (1 - js) * 1.8, d.z);
    rRoot.rotation.set(0, d.yaw, 0);
    rRoot.scale.setScalar(d.s * (0.3 + 0.7 * js));
    knee = Math.min(0.85, knee);
    rHips.position.set(hx, 0.84 * Math.cos(knee) + 0.07, hz);
    rHips.rotation.set(hrx, hyaw, hrz + lean * 0.15);
    rChest.rotation.set(cx + knee * 0.35, cy, cz + lean * 0.25);
    rNeck.rotation.set(nod - knee * 0.3, st.pieceX * 0.5 * (d.style >= 6 ? 0.2 : 1) - (d.yaw * 0.3), 0);
    rShL.rotation.set(lX, 0, lZ); rElL.rotation.set(lE, 0, 0);
    rShR.rotation.set(rX, 0, rZ); rElR.rotation.set(rE, 0, 0);
    const fs = 0.12 + footSpread;
    rHipL.rotation.set(-knee, 0, -fs * 0.5 - hrz); rKnL.rotation.set(2 * knee, 0, 0);
    rHipR.rotation.set(-knee, 0, fs * 0.5 - hrz); rKnR.rotation.set(2 * knee, 0, 0);
    rRag.rotation.set(0, (st.t * (7 + st.ragSpin * 14) + d.ph * 5) % 6.283, 0.4 * Math.sin(st.t * 6 + d.ph));
    rRoot.updateMatrixWorld(true);
  }

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0, songTime = info.songTime || 0;
    st.t += dt;
    const t = st.t;
    const fb = ((beat % 1) + 1) % 1, onBeat = Math.exp(-fb * 6), d1 = 0.5 + 0.5 * Math.cos(2 * Math.PI * beat);
    const energy = info.energy ?? 1;
    const cheerIn = info.cheer || 0, flashIn = info.flash || 0, moveIn = info.move || 0;
    st.pieceX += ((info.pieceX || 0) - st.pieceX) * Math.min(1, dt * 4);
    st.danger += ((info.danger || 0) - st.danger) * Math.min(1, dt * 2);
    // Decays.
    st.cheer = Math.max(st.cheer - dt * 0.6, cheerIn);
    st.flash = Math.max(0, st.flash - dt * 2.2);
    st.gold = Math.max(0, st.gold - dt * 0.5);
    st.strobe = Math.max(0, st.strobe - dt);
    st.armsUp = Math.max(0, Math.max(st.armsUp - dt * 0.45, cheerIn > 0.4 ? (cheerIn - 0.4) * 1.6 : 0));
    st.horn = Math.max(0, st.horn - dt);
    st.wheel = Math.max(0, st.wheel - dt);
    st.ragSpin = Math.max(0, st.ragSpin - dt * 1.2);
    st.lighters = Math.max(0, st.lighters - dt * 0.25);
    st.camKick = Math.max(0, st.camKick - dt * 3);
    st.dip += (0 - st.dip) * Math.min(1, dt * 6);
    st.schemeMix = Math.min(1, st.schemeMix + dt * 2.5);
    st.leanV += (-st.lean * 60 - st.leanV * 9) * dt; st.lean += st.leanV * dt;
    st.woofV += (-st.woof * 400 - st.woofV * 18) * dt; st.woof += st.woofV * dt;
    st.ringR += dt * 9; st.ring = Math.max(0, st.ring - dt * 0.8);
    // Power (game over cuts it, start brings it back).
    if (st.dead) st.deadT += dt;
    st.power += ((st.dead ? 0 : 1) - st.power) * Math.min(1, dt * (st.dead ? 1.6 : 3));
    const power = st.power;
    // Sirens when the stack is high.
    st.siren += ((st.danger > 0.55 && !st.dead ? smooth(0.55, 0.85, st.danger) : 0) - st.siren) * Math.min(1, dt * 2);
    st.wind = 0.3 + st.danger * 0.9 + st.cheer * 0.4;

    // Lights.
    const sirenRed = Math.sin(t * 9) < 0;
    pSound.intensity = (16 + 14 * onBeat * energy + 18 * st.flash + 12 * st.gold) * power;
    pStall.intensity = (16 + 3 * Math.sin(t * 7) + 10 * st.flash) * power;
    col.setHSL((t * 0.05 + st.combo * 0.1) % 1, 0.85, 0.55);
    if (st.siren > 0.05) col.lerp(col2.set(sirenRed ? 0xff1010 : 0x1840ff), Math.min(1, st.siren * 1.4));
    if (st.gold > 0) col.lerp(col2.set(0xffd060), Math.min(1, st.gold));
    pParty.color.copy(col);
    pParty.intensity = (22 + 16 * onBeat + 40 * st.flash + 30 * st.siren) * Math.max(power, st.siren);
    pParty.position.set(Math.sin(t * 0.4) * 5, 6.5, -6 + Math.cos(t * 0.3) * 3);
    hemi.intensity = 0.7 + 0.55 * power + 0.6 * st.flash;
    moonL.intensity = 0.9 + 0.5 * (1 - power);

    // Sky + ground.
    const sm = sky.material.uniforms;
    sm.uTime.value = t; sm.uPulse.value = (0.3 * onBeat + st.flash * 0.6 + st.gold * 0.4) * power; sm.uFlash.value = st.flash * 0.25; sm.uSiren.value = st.siren; sm.uPower.value = power;
    const gu = groundMat.uniforms;
    gu.uTime.value = t; gu.uFlash.value = st.flash * 0.6 + 0.08 * onBeat * power; gu.uPower.value = power; gu.uSiren.value = st.siren;
    gu.uWarm.value.setRGB(0.24, 0.14, 0.05).multiplyScalar(0.8 + 0.4 * onBeat);
    gu.uRing.value.set(0, -2, st.ringR, st.ring);
    // Floor spots (old: four coloured pools pulsing on the beat) — now six,
    // drifting about the crowd; one follows the falling piece.
    const spotHue = [0, 0.78, 0.33, 0.14, 0.58, 0.9];
    for (let i = 0; i < SPOTS; i++) {
      const side = i % 2 ? 1 : -1;
      let x = side * (5 + 1.8 * Math.sin(t * (0.3 + i * 0.07) + i)), z = -2 + 4 * Math.sin(t * (0.21 + i * 0.05) + i * 2) - (i >> 1) * 3;
      if (i === 0) { x = st.pieceX * 7.5; z = 2.5; }
      const r = 1.6 + 0.4 * onBeat * energy + 0.5 * st.cheer;
      gu.uSpot.value[i].set(x, z, r, (0.25 + 0.2 * energy + 0.25 * onBeat + 0.4 * st.cheer) * power);
      gu.uSpotCol.value[i].setHSL((spotHue[i] + st.hueShift * 0.17) % 1, 0.9, 0.5);
    }

    // Woofers: pump on the beat (+ soft drop / hard drop kicks).
    stackL.updateMatrixWorld(); stackR.updateMatrixWorld();
    const pump = (0.06 + 0.1 * energy) * onBeat * power + st.woof;
    woofers.forEach((w, i) => {
      dummy.position.set(w.lx, w.ly, w.lz + Math.max(-0.05, pump * 0.4));
      dummy.rotation.set(0, 0, 0); dummy.scale.set(w.r * (1 + pump * 0.6), w.r * (1 + pump * 0.6), w.r * (1 + Math.max(-0.5, pump * 5)));
      dummy.updateMatrix();
      M4.multiplyMatrices(w.g.matrixWorld, dummy.matrix);
      coneMesh.setMatrixAt(i, M4);
    });
    coneMesh.instanceMatrix.needsUpdate = true;
    // Decks spin (faster on a wheel-up).
    st.deckSpin += dt * (3.5 + st.wheel * 20) * power;
    platters[0].rotation.y = st.deckSpin; platters[1].rotation.y = -st.deckSpin * 0.8 + (st.wheel > 0 ? -st.t * 18 : 0);

    // Palms sway (wind gets up with danger).
    for (const p of palms) {
      const sw = Math.sin(t * p.rate + p.ph) * 0.06 * st.wind + Math.sin(t * p.rate * 2.3 + p.ph) * 0.02 * st.wind;
      p.crown.rotation.x = sw * p.cl + 0.02 * onBeat; p.crown.rotation.z = sw * p.sl + Math.cos(t * p.rate * 0.7 + p.ph) * 0.04 * st.wind;
    }

    // Neon signs: pulse on the beat, flicker, die in a power cut.
    signs.forEach((s, i) => {
      let k = (0.8 + 0.25 * onBeat) * power;
      if (Math.sin(t * 13 + s.ph * 7) > 0.985 - st.danger * 0.05) k *= 0.3;
      if (st.dead && st.deadT < 1.5 && Math.random() < 0.15) k = Math.random();
      k *= 1 + st.flash * 0.8;
      s.mat.color.setScalar(Math.max(0, k));
    });

    // Wires + bulbs.
    glows.begin(); flats.begin();
    let wp = 0;
    const chaserT = t * 2.5;
    const scheme = SCHEMES[st.scheme], schemeP = SCHEMES[st.schemePrev];
    const powerCut = st.dead ? st.deadT : -1;
    const strobeOn = st.strobe > 0 && (Math.floor(t * 14) % 2 === 0);
    for (let wi = 0; wi < wires.length; wi++) {
      const w = wires[wi];
      w.bv += (-w.bounce * 50 - w.bv * 3.2) * dt; w.bounce += w.bv * dt;
      const sag = w.sag * (1 + w.bounce) + Math.sin(t * 1.3 + w.ph) * 0.04 * st.wind;
      const pos = (u, out) => { out.x = w.a.x + (w.b.x - w.a.x) * u; out.z = w.a.z + (w.b.z - w.a.z) * u; out.y = w.a.y + (w.b.y - w.a.y) * u - sag * 4 * u * (1 - u); return out; };
      for (let s = 0; s < WSEG; s++) {
        pos(s / WSEG, V3); wirePos[wp++] = V3.x; wirePos[wp++] = V3.y; wirePos[wp++] = V3.z;
        pos((s + 1) / WSEG, V3); wirePos[wp++] = V3.x; wirePos[wp++] = V3.y; wirePos[wp++] = V3.z;
      }
      for (let b = 0; b < w.n; b++) {
        const u = (b + 0.5) / w.n;
        pos(u, V3);
        const idx = w.first + b;
        // colour: scheme blend
        const ci = (b + wi) % 6;
        col.set(schemeP[ci]).lerp(col2.set(scheme[ci]), st.schemeMix);
        if (st.combo >= 3) col.offsetHSL((t * 0.3 + b * 0.05) % 1, 0, 0);
        if (st.siren > 0.2 && (b % 3 === 0)) col.lerp(col2.set(sirenRed ? 0xff2010 : 0x2050ff), st.siren * 0.8);
        // brightness: chaser + beat + travelling move waves
        const chase = smooth(0.4, 0.95, Math.sin(chaserT - idx * 0.45));
        let k = 0.35 + 0.65 * chase + 0.5 * onBeat * energy;
        for (const wv of st.waves) {
          if (wv.t > 2) continue;
          const front = -1.2 + wv.t * 2.6, xn = (V3.x / 9) * wv.dir;
          k += 1.6 * Math.exp(-((xn - front) ** 2) * 18) * (1 - wv.t / 2);
        }
        k += st.flash * 1.2 + st.cheer * 0.5;
        if (st.gold > 0) { col.lerp(col2.set(0xffd040), Math.min(1, st.gold) * 0.8); k += st.gold * 0.5; }
        if (strobeOn) { col.set(0xffffff); k += 1; }
        // power cut cascade: bulbs die along the street from the far end
        let pk = power;
        if (powerCut >= 0) pk = Math.max(0, 1 - smooth(0, 0.25, powerCut * 2.2 - (1 - (V3.z + 30) / 34) * 1.2 - (b % 2) * 0.05));
        else if (power < 0.999) pk = smooth(0, 1, power * 2.2 - (1 - (V3.z + 30) / 34) * 1.2);
        k *= pk;
        if (k < 0.02) continue;
        const sz = 0.3 + 0.18 * Math.min(1.4, k);
        const wk = Math.min(1, k * 0.25);   // hot white-ish core when bright
        glows.set(V3.x, V3.y - 0.08, V3.z, sz, (col.r + wk) * k, (col.g + wk) * k, (col.b + wk * 0.8) * k, 1, 0, 1, 1, 0);
        bulbs[idx * 4] = V3.x; bulbs[idx * 4 + 1] = V3.y; bulbs[idx * 4 + 2] = V3.z;
      }
    }
    wireGeo.attributes.position.needsUpdate = true;
    for (const wv of st.waves) wv.t += dt;
    // Glows on other light sources: stall bulbs, drum-grill fire, sign halos.
    if (power > 0.05) {
      V3.set(1.75, 1.3, 0.5); stall.localToWorld(V3);
      glows.set(V3.x, V3.y, V3.z, 1.1 + 0.3 * Math.sin(t * 11), 1 * power, 0.45 * power, 0.1 * power, 0.9, 0, 1, 1, 0);
      if (Math.random() < dt * 9) emit({ x: V3.x + (Math.random() - 0.5) * 0.5, y: V3.y + 0.1, z: V3.z, vx: (Math.random() - 0.5) * 0.3, vy: 0.9 + Math.random() * 0.5, life: 2.8, size: 0.5, r: 0.55, g: 0.5, b: 0.5, cell: 8, add: false, kind: 7, grow: 0.9, fade: 0.5 });
      if (Math.random() < dt * 6) emit({ x: V3.x, y: V3.y, z: V3.z, vx: (Math.random() - 0.5) * 0.6, vy: 1.4 + Math.random(), life: 0.9, size: 0.07, r: 1, g: 0.6, b: 0.2, cell: 0, kind: 4, grav: -0.2 });
    }
    // Siren beacons at the end of the street.
    if (st.siren > 0.02) {
      const red = sirenRed ? 1 : 0.15, blue = sirenRed ? 0.15 : 1;
      glows.set(-1.2, 1.6, -30, 3 * st.siren, 1 * red * st.siren, 0.05, 0.05, 1);
      glows.set(1.2, 1.6, -30, 3 * st.siren, 0.05, 0.15 * blue * st.siren, 1 * blue * st.siren, 1);
    }

    // Crowd.
    const energyK = Math.min(1.3, energy * 0.7 + st.cheer * 0.5);
    let liveCount = 0;
    for (let i = 0; i < ND; i++) {
      const d = dancers[i];
      const want = d.joinAt <= st.level - 1 ? 1 : 0;
      d.join += (want - d.join) * Math.min(1, dt * 3);
      if (d.join < 0.01) {
        for (const n of ['torso', 'pelvis', 'head', 'hair', 'shades', 'rag']) parts[n].setMatrixAt(i, ZERO);
        for (const n of ['uarm', 'farm', 'thigh', 'shin']) { parts[n].setMatrixAt(i * 2, ZERO); parts[n].setMatrixAt(i * 2 + 1, ZERO); }
        continue;
      }
      liveCount++;
      poseDancer(d, beat, dt, energyK);
      parts.torso.setMatrixAt(i, rChest.matrixWorld);
      parts.pelvis.setMatrixAt(i, rHips.matrixWorld);
      parts.head.setMatrixAt(i, rNeck.matrixWorld);
      parts.hair.setMatrixAt(i, tmpM.multiplyMatrices(rNeck.matrixWorld, hairLocal[d.hair]));
      parts.shades.setMatrixAt(i, d.shades ? rNeck.matrixWorld : ZERO);
      parts.uarm.setMatrixAt(i * 2, rShL.matrixWorld); parts.uarm.setMatrixAt(i * 2 + 1, rShR.matrixWorld);
      parts.farm.setMatrixAt(i * 2, rElL.matrixWorld); parts.farm.setMatrixAt(i * 2 + 1, rElR.matrixWorld);
      parts.thigh.setMatrixAt(i * 2, rHipL.matrixWorld); parts.thigh.setMatrixAt(i * 2 + 1, rHipR.matrixWorld);
      parts.shin.setMatrixAt(i * 2, rKnL.matrixWorld); parts.shin.setMatrixAt(i * 2 + 1, rKnR.matrixWorld);
      const showRag = (d.rag || (st.ragSpin > 0.3 && d.style !== 6 && d.style !== 7 && (i % 3 === 0))) && power > 0.5 && rShR.rotation.z > 1.6;
      parts.rag.setMatrixAt(i, showRag ? rRag.matrixWorld : ZERO);
      // Lighters / phone torches at the raised hand.
      V3.set(0, -0.36, 0).applyMatrix4(rElR.matrixWorld);
      if (st.lighters > 0.05 && d.style < 6 && i % 2 === 0 && power > 0.5) {
        const fl = Math.min(1, st.lighters) * (0.8 + 0.2 * Math.sin(t * 20 + i));
        glows.set(V3.x, V3.y + 0.12, V3.z, 0.28, fl, fl * 0.8, fl * 0.5, 1, 0, 0.6, 1, 9);
        glows.set(V3.x, V3.y + 0.1, V3.z, 0.7, 0.5 * fl, 0.3 * fl, 0.1 * fl, 1, 0, 1, 1, 0);
      }
      if (st.dead && d.torch && st.deadT > 1.4 && d.style < 6) {
        const k = Math.min(1, (st.deadT - 1.4 - (i % 7) * 0.25) * 2);
        if (k > 0) { glows.set(V3.x, V3.y + 0.05, V3.z, 0.5, 0.85 * k, 0.9 * k, 1 * k, 1, 0, 1, 1, 3); }
      }
    }
    for (const n in parts) { parts[n].instanceMatrix.needsUpdate = true; }

    // Particles.
    for (const p of pts) {
      if (p.life <= 0) continue;
      if (p.kind === 3 && p.delay > 0) { p.delay -= dt; if (p.delay > 0) continue; }
      p.life -= dt;
      if (p.kind === 3) {           // rocket: rises to its spot, then bursts
        if (p.life <= 0) { burst(p.tx, p.ty, p.tz, p.cr, p.cg, p.cb, low ? 26 : 44); continue; }
      }
      if (p.life <= 0) continue;
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr; p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
      if (p.kind === 1 && p.y < 0.03) { p.y = 0.03; p.vx = p.vz = p.vy = 0; p.vr = 0; }
      const u = p.life / p.max;
      const fade = Math.min(1, u * 3) * p.fade;
      const size = p.size * (1 + p.grow * (1 - u));
      if (p.kind === 1) {           // confetti: flutter (flip squashes the quad)
        flats.set(p.x, p.y, p.z, size, p.r, p.g, p.b, Math.min(1, u * 4), p.rot, Math.abs(Math.cos(p.rot * 0.7)) + 0.15, p.sy, 1);
      } else if (p.kind === 2) {    // streamer: stretched along its velocity
        const ang = Math.atan2(p.vy, p.vx * 0.6 + 0.001) - Math.PI / 2;
        flats.set(p.x, p.y, p.z, size, p.r, p.g, p.b, Math.min(1, u * 3), ang, 1, p.sy, 1);
      } else if (p.kind === 7) {    // smoke / dust
        flats.set(p.x, p.y, p.z, size, p.r, p.g, p.b, fade * (u < 0.85 ? 1 : (1 - u) / 0.15), p.rot, 1, 1, 8);
      } else if (p.kind === 6) {    // text pop: punch in, hold, float away
        const age = p.max - p.life, punch = age < 0.15 ? 0.4 + 0.6 * (age / 0.15) * 1.25 : 1 + 0.05 * Math.sin(age * 20) * Math.exp(-age * 4);
        glows.set(p.x, p.y, p.z, size * punch, p.r, p.g, p.b, Math.min(1, u * 4), 0.08 * Math.sin(age * 3), 2, 1, p.cell);
      } else if (p.kind === 3) {    // rocket streak
        glows.set(p.x, p.y, p.z, 0.35, 1, 0.75, 0.4, 1, Math.atan2(p.vy, p.vx) - Math.PI / 2, 0.4, 2.2, 0);
      } else if (p.kind === 4) {    // sparks
        const tw = u > 0.3 ? 1 : (Math.sin(p.x * 50 + st.t * 40) > 0 ? 1 : 0.3);
        glows.set(p.x, p.y, p.z, size, p.r * tw, p.g * tw, p.b * tw, Math.min(1, u * 2), Math.atan2(p.vy, p.vx) - Math.PI / 2, 0.6, 1.6, 0);
      } else {                      // flashes, rings
        glows.set(p.x, p.y, p.z, size, p.r, p.g, p.b, fade, 0, 1, 1, p.cell);
      }
    }
    // Ambient confetti while the cheer lasts (the old scene's cheer > 0.5 trickle).
    if (st.cheer > 0.5 && Math.random() < 0.35) confettiBurst(3);
    if (st.cheer > 0.1 && Math.random() < 0.08 * st.cheer) streamers(1);
    // Music notes drifting up from the speaker wall on the beat.
    const bi = Math.floor(beat);
    if (bi !== st.lastBeatI) { st.lastBeatI = bi; st.newBeat = true; } else st.newBeat = false;
    if (power > 0.5 && st.newBeat && Math.random() < 0.8) {
      const w = woofers[Math.floor(Math.random() * woofers.length)];
      V3.set(w.lx, w.ly + 0.3, w.lz + 0.3); w.g.localToWorld(V3);
      const c = rgb(BULB_COLS[Math.floor(Math.random() * 6)]);
      emit({ x: V3.x, y: V3.y, z: V3.z, vx: 0.6 + Math.random() * 0.4, vy: 0.9, vz: 0.4, life: 2.2, size: 0.4, r: c.r, g: c.g, b: c.b, cell: 10, kind: 5, drag: 0.3 });
    }
    glows.end(); flats.end();

    // ── Camera ──
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    st.portrait = portrait;
    st.shake = Math.max(0, st.shake - dt * 2.5);
    const sh = st.shake * 0.12;
    st.camX += (st.pieceX * 0.6 - st.camX) * Math.min(1, dt * 1.5);
    const swayX = Math.sin(t * 0.13) * 0.5, swayY = Math.sin(t * 0.17) * 0.15;
    if (portrait) {
      // Portrait: the board covers nearly everything — tilt up so the
      // string lights fill the top strip and the crowd the bottom one.
      camera.fov = 70;
      camera.position.set(swayX * 0.4 + st.camX * 0.5 + (Math.random() - 0.5) * sh, 1.9 + swayY * 0.5 + (Math.random() - 0.5) * sh - 0.03 * onBeat - st.camKick * 0.15, 8.6);
      camera.lookAt(st.camX * 0.4, 5.6, -8);
    } else {
      // Landscape: the board + panels cover the middle ~56% — keep the
      // speaker wall (left) and stall (right) in the side strips; pull back
      // on narrower screens.
      const narrow = Math.max(0, 1.6 / aspect - 1);
      camera.fov = 50 + narrow * 10;
      camera.position.set(swayX + st.camX + (Math.random() - 0.5) * sh, 3.0 + swayY + (Math.random() - 0.5) * sh - 0.03 * onBeat - st.camKick * 0.2, 11.5 + narrow * 3);
      camera.lookAt(st.camX * 0.6 + swayX * 0.3, 2.3, -10);
    }
    camera.rotateZ(Math.sin(t * 0.11) * 0.01 + st.lean * 0.01);
    if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position); stars.position.copy(camera.position); starMat.uniforms.uTime.value = t;
    hills.position.x = camera.position.x; hills.position.z = camera.position.z;
  }

  function react(kind, data = {}) {
    if (kind === 'move') {
      const dir = data.dir || 0;
      const wv = st.waves[st.waveI = (st.waveI + 1) % st.waves.length]; wv.t = 0; wv.dir = dir >= 0 ? 1 : -1;
      st.leanV += dir * 1.6;
    } else if (kind === 'rotate') {
      st.schemePrev = st.scheme; st.scheme = (st.scheme + 1) % SCHEMES.length; st.schemeMix = 0;
      st.hueShift = (st.hueShift + 1) % 6;
      st.ragSpin = Math.min(1.5, st.ragSpin + 0.6); st.wheel = 0.45;
      for (const w of wires) w.bv += (Math.random() - 0.5) * 0.4;
    } else if (kind === 'soft') {
      st.woofV -= 0.6; st.dip = Math.min(0.6, st.dip + 0.25);
    } else if (kind === 'drop') {
      const rows = data.rows || 0;
      st.woofV -= 2 + Math.min(3, rows * 0.2);
      for (const w of wires) w.bv += 0.6 + Math.min(1.6, rows * 0.09);
      dustRing(rows);
      st.flash = Math.max(st.flash, 0.15 + Math.min(0.35, rows * 0.02));
      st.shake = Math.min(1.5, st.shake + 0.3 + rows * 0.05); st.camKick = 1;
      st.dip = Math.min(0.8, st.dip + 0.4);
      if (rows >= 8) for (const d of dancers) if (d.style < 6 && Math.random() < Math.min(0.8, rows / 20)) { d.jump = -Math.random() * 0.15; d.jumpH = 0.15 + rows * 0.01; }
      if (rows >= 14) textPop(11, -6.5, 4.6, -1.5, 1.6, 1.1);
    } else if (kind === 'hold') {
      st.horn = 1.1; soundRings(); st.woofV -= 1;
      textPop(6, -6.4, 5.0, -1.8, 1.7, 1.4);
    } else if (kind === 'clear') {
      const n = Math.max(1, data.lines || 1), combo = data.combo || 0;
      st.combo = combo;
      st.armsUp = Math.max(st.armsUp, 0.7 + n * 0.12);
      st.flash = Math.max(st.flash, 0.3 + n * 0.15);
      st.cheer = Math.max(st.cheer, 0.4 + n * 0.2);
      confettiBurst(n >= 4 ? 140 : 25 + n * 20);
      if (n >= 2) streamers(n * 6);
      if (n >= 3) { st.lighters = 2.5; for (let k = 0; k < (n >= 4 ? 5 : 2); k++) firework(k + Math.floor(Math.random() * 7), k * 0.35); }
      if (n >= 4) {
        st.gold = 1.6; st.strobe = 1.2; jumpAll(0.5, 0.3); st.shake = 1;
        textPop(4, 6.4, 4.4, -1.5, 2.2, 2.2); textPop(5, -6.4, 4.8, -2, 1.8, 2.2);
        for (const w of wires) w.bv += 1.2;
      } else if (n >= 2) jumpAll(0.25, 0.4);
      if (combo >= 2) {
        for (let k = 0; k < Math.min(4, combo - 1); k++) firework(3 + k * 2, 0.5 + k * 0.3);
        textPop(13, (combo % 2 ? 6.6 : -6.6), 3.8, -1, 1.5, 1.6);
        st.ragSpin = 1.5;
      }
    } else if (kind === 'combo') {
      st.combo = data.n || 0;
    } else if (kind === 'levelUp') {
      st.level = data.level || st.level + 1;
      for (let k = 0; k < 3; k++) firework(k * 2 + 1, k * 0.25);
      textPop(12, 6.4, 4.6, -1.5, 1.9, 2.0);
      st.flash = Math.max(st.flash, 0.5); st.schemePrev = st.scheme; st.scheme = (st.scheme + 2) % SCHEMES.length; st.schemeMix = 0;
      jumpAll(0.3, 0.6);
    } else if (kind === 'gameOver') {
      if (!st.dead) { st.dead = true; st.deadT = 0; st.combo = 0; st.lighters = 0; st.gold = 0; st.strobe = 0; }
    } else if (kind === 'start') {
      const was = st.dead;
      st.dead = false; st.deadT = 0; st.combo = 0; st.level = data.level || 1;
      st.flash = 0.6; st.horn = 1; jumpAll(0.35, 0.5); soundRings();
      textPop(14, -6.4, 5.0, -1.8, 1.6, 1.6);
      if (!was) st.power = 0.2;
    }
  }

  if (typeof window !== 'undefined' && window.__lwDebug) window.__lwDebug = { root, sky, hills, setMesh, facMesh, crowns: palms.map(p => p.crown), signs: signs.map(s => s.m), wireLines, coneMesh, ground, glows, flats, parts, pParty, pSound, pStall, hemi };
  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      K.dispose();
    },
  };
}
