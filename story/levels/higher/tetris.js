// HIGHER — the living Tetris world: a rooftop lounge floating over a hazy
// neon city at night.
//
// A 3D take on the old drawHazeScene. You're on a roof garden high above
// the city: a parapet strung with fairy lights, a blunt smouldering in an
// ashtray on the left of the ledge and a joint on the right (glowing
// cherries, curling smoke, rising embers), a beanbag corner with a lava
// lamp and leafy plants, a cat napping on the ledge, and beyond it a city
// of lit towers sinking into green-gold haze — searchlights sweeping, a
// blimp drifting, antenna lights blinking, rolling haze banks, big smoke
// clouds and leaves floating up into a sky that breathes between green and
// purple-gold (the old scene's colourPhase / breath / trip meter).
//
// Reactions (every old one, plus more):
//   move     → a small green ring + a spark burst from the cherry on that
//              side, a brief green glow (old movePulse)
//   rotate   → the floating leaves spin, the city neon hue steps round
//   soft     → the cherries take a drag (flare) and puff smoke
//   drop     → ripple rings + haze flood + a leaf & spark explosion (old
//              boardDropPulse), scaled by rows; the plants and lamp jolt
//   hold     → a smoke ring drifts out over the city
//   clear    → trip meter up, haze flood, mandala rings, leaf blizzard
//              (old cheer); 3+: the sky colour-waves; 4 (TETRIS) "HIGHER!":
//              the whole lounge levitates, a giant mandala blooms, the moon
//              grows rainbow halos · combos escalate the trip
//   levelUp  → you go HIGHER: the camera rises a notch, sky lanterns float
//              up out of the city
//   danger   → the haze turns ember-red, sirens flicker in the streets, the
//              cat wakes up
//   gameOver → comedown: colour drains, cherries go out, leaves fall, the
//              fairy lights die · start → a lighter flick relights it all
//
// Cheap: one merged vertex-coloured toon mesh per furniture group, an
// instanced city with procedural windows, one GPU sprite pool for glows /
// rings / text and one for smoke / leaves; 2 point lights.

import { createKit, rng } from './kit.js';

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const K = createKit(THREE);
  const { keep, canvasTex, toon, Builder } = K;
  const R = rng(1313);
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  const fogCol = new THREE.Color(0x0c1608);
  scene.fog = new THREE.Fog(fogCol, 30, 190);
  scene.background = new THREE.Color(0x030602);
  camera.far = 400; camera.near = 0.1;
  const col = new THREE.Color(), col2 = new THREE.Color(), dummy = new THREE.Object3D(), V3 = new THREE.Vector3();
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // ── Lights ──────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x6a8a60, 0x2a1a10, 1.0); root.add(hemi);
  const moonL = new THREE.DirectionalLight(0xc8d8ff, 0.8); moonL.position.set(6, 12, -10); root.add(moonL); root.add(moonL.target);
  const pLamp = new THREE.PointLight(0xff5a2a, 10, 9, 1.5); pLamp.position.set(-3.6, 1.6, 2.2); root.add(pLamp);
  const pTrip = new THREE.PointLight(0x7fff40, 8, 14, 1.3); pTrip.position.set(3.2, 2.4, 1.6); root.add(pTrip);

  // ── Textures ────────────────────────────────────────────────────
  const drawLeaf = (g, size, hue) => {
    const blades = [[-Math.PI / 2, 1.0, 0.2], [-Math.PI / 2 + Math.PI * 2 / 7, 0.88, 0.18], [-Math.PI / 2 + Math.PI * 4 / 7, 0.7, 0.16], [-Math.PI / 2 + Math.PI * 6 / 7, 0.48, 0.13],
      [-Math.PI / 2 - Math.PI * 6 / 7, 0.48, 0.13], [-Math.PI / 2 - Math.PI * 4 / 7, 0.7, 0.16], [-Math.PI / 2 - Math.PI * 2 / 7, 0.88, 0.18]];
    const gr = g.createRadialGradient(0, -size * 0.1, 0, 0, 0, size);
    gr.addColorStop(0, `hsl(${hue + 18},85%,80%)`); gr.addColorStop(0.5, `hsl(${hue},72%,58%)`); gr.addColorStop(1, `hsl(${hue - 12},60%,38%)`);
    g.fillStyle = gr;
    for (const [ang, lf, wf] of blades) {
      const len = size * lf, wid = size * wf, cA = Math.cos(ang), sA = Math.sin(ang), cP = Math.cos(ang + Math.PI / 2), sP = Math.sin(ang + Math.PI / 2);
      g.beginPath(); g.moveTo(0, 0);
      for (let i = 1; i <= 6; i++) { const t = i / 6, env = Math.sin(t * Math.PI), pull = i % 2 === 0 ? 0.55 : 1; g.lineTo(cA * len * t - cP * wid * env * pull, sA * len * t - sP * wid * env * pull); }
      g.lineTo(cA * len, sA * len);
      for (let i = 6; i >= 1; i--) { const t = i / 6, env = Math.sin(t * Math.PI), pull = i % 2 === 0 ? 0.55 : 1; g.lineTo(cA * len * t + cP * wid * env * pull, sA * len * t + sP * wid * env * pull); }
      g.closePath(); g.fill();
    }
    g.strokeStyle = `hsl(${hue - 10},55%,30%)`; g.lineWidth = size * 0.05; g.beginPath(); g.moveTo(0, size * 0.06); g.lineTo(0, size * 0.58); g.stroke();
  };
  const atlas = canvasTex(512, 512, (g) => {
    const cell = (i, draw) => { g.save(); g.translate((i % 4) * 128, Math.floor(i / 4) * 128); g.beginPath(); g.rect(0, 0, 128, 128); g.clip(); draw(); g.restore(); };
    const radial = (stops, r = 62) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, r); for (const [o, c] of stops) gr.addColorStop(o, c); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); };
    cell(0, () => radial([[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,255,255,0.8)'], [0.4, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]));
    cell(1, () => { g.translate(64, 70); drawLeaf(g, 56, 100); });
    cell(2, () => { g.strokeStyle = '#fff'; g.lineWidth = 7; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke(); });
    cell(3, () => { radial([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']], 26); g.fillStyle = '#fff'; for (const r of [0, Math.PI / 2]) { g.save(); g.translate(64, 64); g.rotate(r); g.beginPath(); g.moveTo(-60, 0); g.quadraticCurveTo(0, 5, 60, 0); g.quadraticCurveTo(0, -5, -60, 0); g.fill(); g.restore(); } });
    const word = (i, txt, fill, stroke, size = 50) => cell(i, () => {
      g.translate(64, 66); g.scale(0.5, 1); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `italic 900 ${size}px "Arial Black", Impact, sans-serif`;
      g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = stroke; g.strokeText(txt, 0, 0);
      g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(txt, 0, 0);
      g.fillStyle = fill; g.fillText(txt, 0, 0);
    });
    word(4, 'HIGHER!', '#d8ff7a', '#2a8a00', 54);
    word(5, 'FAR OUT!', '#ffe08a', '#c04a00', 50);
    word(6, 'WHOA...', '#e0c0ff', '#6a20c0', 54);
    word(7, 'COSMIC!', '#a0f0ff', '#0060c0', 52);
    cell(8, () => { for (let k = 0; k < 7; k++) { const x = 64 + Math.cos(k * 2.1) * 24, y = 64 + Math.sin(k * 1.7) * 20; const gr = g.createRadialGradient(x, y, 0, x, y, 38); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } });
    cell(9, () => { const gr = g.createRadialGradient(64, 78, 0, 64, 70, 40); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.35, 'rgba(255,200,80,0.9)'); gr.addColorStop(1, 'rgba(255,90,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(64, 14); g.quadraticCurveTo(98, 70, 64, 112); g.quadraticCurveTo(30, 70, 64, 14); g.fill(); });
    cell(10, () => {   // mandala ring
      g.translate(64, 64); g.strokeStyle = '#fff'; g.lineWidth = 3; g.shadowColor = '#fff'; g.shadowBlur = 6;
      g.beginPath(); g.arc(0, 0, 56, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 12; k++) { g.save(); g.rotate(k * Math.PI / 6); g.beginPath(); g.moveTo(0, -40); g.quadraticCurveTo(9, -48, 0, -56); g.quadraticCurveTo(-9, -48, 0, -40); g.stroke(); g.beginPath(); g.arc(0, -30, 3, 0, Math.PI * 2); g.stroke(); g.restore(); }
    });
    cell(11, () => { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 16; g.shadowColor = '#fff'; g.shadowBlur = 18; g.beginPath(); g.ellipse(64, 64, 40, 30, 0, 0, Math.PI * 2); g.stroke(); });
    cell(12, () => { radial([[0, 'rgba(255,240,200,1)'], [0.3, 'rgba(255,170,60,0.85)'], [0.6, 'rgba(255,110,20,0.25)'], [1, 'rgba(255,80,0,0)']]); g.fillStyle = 'rgba(255,230,170,0.95)'; g.beginPath(); g.moveTo(48, 40); g.lineTo(80, 40); g.lineTo(76, 86); g.lineTo(52, 86); g.closePath(); g.fill(); });
    word(13, 'CHILL...', '#a0ffd0', '#008a60', 52);
    cell(14, () => radial([[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']]));
    word(15, 'LEVEL UP!', '#9ff0ff', '#2050ff', 44);
  });
  const glows = K.spritePool(low ? 500 : 800, atlas, { additive: true, cap: 0.07 });
  const flats = K.spritePool(low ? 360 : 600, atlas, { additive: false });
  glows.mesh.renderOrder = 6; flats.mesh.renderOrder = 5;
  root.add(flats.mesh, glows.mesh);
  const plankTex = canvasTex(256, 256, (g, w, h) => {
    for (let y = 0; y < h; y += 32) { const k = (y / 32) % 3; g.fillStyle = ['#4a3020', '#553624', '#3f2a1c'][k]; g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y, w, 2); g.fillRect(((y * 7) % w), y, 2, 32); }
  }, { repeat: true });
  plankTex.repeat.set(6, 3);
  const neonTex = canvasTex(512, 256, (g, w) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 256);
    const row = (i, txt, c, glow, size = 54) => { g.save(); g.translate(w / 2, i * 64 + 34); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 900 ${size}px "Arial Black", Impact, sans-serif`; g.shadowColor = glow; g.shadowBlur = 16; g.strokeStyle = glow; g.lineWidth = 6; g.strokeText(txt, 0, 0); g.shadowBlur = 6; g.fillStyle = c; g.fillText(txt, 0, 0); g.restore(); };
    row(0, 'HIGHER', '#efffd0', '#6aff00', 58); row(1, 'HOTEL', '#fff0f0', '#ff3050'); row(2, '24H', '#e0f8ff', '#20b0ff'); row(3, 'SKYE FM', '#fff4e0', '#ff9a00');
  });

  // ── Sky: breathing gradient, moon + halos, trip colour waves ──────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(300, 32, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uHue: { value: 0.3 }, uBreath: { value: 0 }, uTrip: { value: 0 }, uWave: { value: 0 }, uFlash: { value: 0 }, uGrey: { value: 0 }, uHalo: { value: 0 }, uRed: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uTime, uHue, uBreath, uTrip, uWave, uFlash, uGrey, uHalo, uRed, uPulse;
      vec3 hsl(float h, float s, float l){ vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0)); }
      void main(){
        float h = vP.y;
        vec3 top = hsl(uHue + 0.35, 0.5, 0.025 + 0.012 * uBreath);
        vec3 mid = hsl(uHue + 0.12, 0.55, 0.06 + 0.02 * uBreath);
        vec3 hor = hsl(uHue - 0.06, 0.65, 0.16 + 0.04 * uBreath + 0.05 * uPulse);
        vec3 c = mix(mid, top, smoothstep(0.1, 0.65, h));
        c = mix(hor, c, smoothstep(-0.05, 0.25, h));
        c = mix(c, vec3(0.35, 0.06, 0.02) * (1.0 - smoothstep(-0.1, 0.5, h)) + c * 0.6, uRed);
        // trip meter colour wave sweeping round the sky
        if (uWave > 0.01) {
          float az = atan(vP.x, -vP.z);
          float band = sin(az * 3.0 - uTime * 0.85 + h * 4.0);
          c += hsl(fract(0.43 + band * 0.25 + uTime * 0.05), 0.85, 0.35) * uWave * smoothstep(0.3, 1.0, band) * 0.35 * smoothstep(-0.1, 0.4, h);
        }
        // moon + halo rings on a trip
        vec3 md = normalize(vec3(0.47, 0.27, -0.84));
        float m = dot(vP, md);
        float ang = sqrt(max(0.0, 2.0 - 2.0 * m));          // ≈ angle for small angles
        c = mix(c, vec3(1.0, 0.97, 0.85), smoothstep(0.042, 0.037, ang) * (1.0 - 0.6 * uGrey));
        c += vec3(0.5, 0.55, 0.4) * max(0.0, 1.0 - ang * 3.0) * max(0.0, 1.0 - ang * 3.0) * 0.35;
        if (uHalo > 0.01) {
          float rings = sin(ang * 90.0 - uTime * 3.0) * 0.5 + 0.5;
          c += hsl(fract(ang * 3.0 - uTime * 0.2), 0.9, 0.5) * uHalo * rings * smoothstep(0.5, 0.07, ang) * step(0.05, ang) * 0.5;
        }
        c *= 1.0 + uFlash;
        float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(c, vec3(l), uGrey * 0.8);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  sky.renderOrder = -10; root.add(sky);
  const NST = low ? 160 : 300;
  const stPos = new Float32Array(NST * 3), stPh = new Float32Array(NST);
  for (let i = 0; i < NST; i++) { const a = R() * Math.PI * 2, y = 0.15 + Math.pow(R(), 0.7) * 0.8, r = 280, q = Math.sqrt(1 - y * y); stPos[i * 3] = Math.cos(a) * r * q; stPos[i * 3 + 1] = y * r; stPos[i * 3 + 2] = Math.sin(a) * r * q; stPh[i] = R() * 30; }
  const starGeo = keep(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3)); starGeo.setAttribute('aPh', new THREE.BufferAttribute(stPh, 1));
  const starMat = keep(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 1 } }, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aPh; uniform float uTime; varying float vA; void main(){ vA = 0.5 + 0.5 * sin(uTime * 1.7 + aPh); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 1.4 + fract(aPh) * 1.5; }',
    fragmentShader: 'uniform float uK; varying float vA; void main(){ float a = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(vec3(0.85, 1.0, 0.85) * a * vA * uK, 1.0); }',
  }));
  const stars = new THREE.Points(starGeo, starMat); stars.renderOrder = -9.5; stars.frustumCulled = false; root.add(stars);

  // ── City: instanced towers with procedural windows ───────────────
  const NB = low ? 80 : 130;
  const cityMat = keep(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFog: { value: fogCol }, uHue: { value: 0 }, uK: { value: 1 }, uRed: { value: 0 }, uFlash: { value: 0 } },
    vertexShader: `varying vec3 vW; varying vec3 vN; varying float vSeed;
      void main(){ vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normal; vSeed = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.11; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime, uHue, uK, uRed, uFlash; uniform vec3 uFog; varying vec3 vW; varying vec3 vN; varying float vSeed;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec3 hsl(float h, float s, float l){ vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0)); }
      void main(){
        float side = abs(vN.x) > 0.5 ? vW.z : vW.x;
        vec2 cell = vec2(side * 0.9, vW.y * 0.7);
        vec2 id = floor(cell), f = fract(cell);
        float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.25, f.y) * step(f.y, 0.75);
        float r = hash(id + vSeed);
        float lit = step(0.62, r) * (0.75 + 0.25 * sin(uTime * 0.5 + r * 40.0));
        vec3 wc = mix(vec3(1.0, 0.75, 0.4), vec3(0.5, 0.9, 1.0), step(0.85, r));
        wc = mix(wc, hsl(fract(uHue + r * 0.3), 0.8, 0.6), step(0.93, r));
        vec3 c = vec3(0.008, 0.012, 0.01) * (abs(vN.x) > 0.5 ? 0.6 : 1.0) + (vN.y > 0.5 ? vec3(0.01) : vec3(0.0));
        c += wc * win * lit * uK * (1.0 + uFlash);
        c = mix(c, c * vec3(1.6, 0.5, 0.35) + vec3(0.04, 0.0, 0.0), uRed);
        float d = length(vW - cameraPosition);
        c = mix(c, uFog * 1.6, smoothstep(18.0, 200.0, d) * 0.92);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  const bGeo = keep(new THREE.BoxGeometry(1, 1, 1)); bGeo.translate(0, 0.5, 0);
  const city = new THREE.InstancedMesh(bGeo, cityMat, NB);
  const roofLights = [];
  for (let i = 0; i < NB; i++) {
    let x, z, tries = 0;
    do { x = (R() - 0.5) * 260; z = -34 - Math.pow(R(), 0.8) * 160; tries++; } while (Math.abs(x) < 34 && z > -60 && tries < 30);
    const w = 5 + R() * 9, d = 5 + R() * 9, tall = R() < 0.12 ? 2.2 : 1;
    const top = (-10 + R() * 18) * tall + (z < -100 ? 6 : 0);
    dummy.position.set(x, -70, z); dummy.scale.set(w, top + 70, d); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    city.setMatrixAt(i, dummy.matrix);
    if (top > -2 && R() < 0.5) roofLights.push({ x, y: top + 0.6, z, ph: R() * 6, red: R() < 0.7 });
  }
  city.frustumCulled = false; root.add(city); keep(city);
  // A neighbouring roof with a wooden water tower + antenna (mid distance).
  const nb = new Builder();
  nb.box(14, 40, 12, -15, -40.5 + 0.0, -20, 0x1a1e18);
  nb.box(14.4, 0.5, 12.4, -15, -0.25, -20, 0x2a2e26);
  for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) nb.cyl(0.12, 0.12, 4, 5, -14 + lx, 2, -21 + lz, 0x3a2a1a);
  nb.cyl(2.0, 2.0, 3.2, 12, -14, 5.6, -21, 0x6a4a2a); nb.add(new THREE.ConeGeometry(2.2, 1.4, 12), nb.m4(-14, 7.9, -21), 0x4a3424);
  nb.box(30, 46, 14, 26, -40, -30, 0x161a16); nb.box(0.2, 9, 0.2, 22, 10.5, -30, 0x4a4a50); nb.box(2.5, 0.12, 0.12, 22, 9, -30, 0x4a4a50);
  const neighbour = new THREE.Mesh(nb.build(), toon({ vertexColors: true }));
  root.add(neighbour);
  roofLights.push({ x: 22, y: 15.1, z: -30, ph: 0, red: true, big: true });
  // Neon signs on the neighbours.
  const signs = [];
  const sign = (row, x, y, z, yaw, w, h) => {
    const geo = keep(new THREE.PlaneGeometry(w, h)); const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / 4);
    const mat = keep(new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = yaw; root.add(m); signs.push({ m, mat, ph: R() * 9 });
  };
  sign(1, -19.5, -2.6, -13.9, 0, 6, 1.5);
  sign(3, 19, 2.4, -22.9, -0.2, 8, 2.0);
  sign(0, -48, 9, -80, 0.3, 26, 6.5);
  sign(2, 56, 4, -95, -0.3, 12, 3);

  // Searchlights sweeping up from the city.
  const beamGeo = keep(new THREE.ConeGeometry(4, 120, 16, 1, true)); beamGeo.translate(0, -60, 0); beamGeo.rotateX(Math.PI);
  const beamMat = keep(new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0.5 }, uCol: { value: new THREE.Color(0xd0ffb0) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying float vY; void main(){ vY = position.y / 120.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uK; uniform vec3 uCol; varying float vY; void main(){ gl_FragColor = vec4(uCol * uK * 0.12 * (1.0 - vY) * (1.0 - vY), 1.0); }',
  }));
  const beams = [];
  for (const [x, z] of [[-60, -120], [70, -140]]) { const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(x, -10, z); b.frustumCulled = false; root.add(b); beams.push(b); }

  // Blimp with a glowing banner.
  const blimp = new THREE.Group(); root.add(blimp);
  {
    const bb = new Builder();
    bb.sphere(1, 0, 0, 0, 0x8a9a8a, 16, 10, 7, 2, 2);
    bb.box(1.6, 0.6, 0.8, 0, -2.1, 0, 0x2a2a30);
    for (const s of [-1, 1]) bb.box(1.6, 0.1, 1.4, -6.2, 0, s * 0.9, 0x5a6a5a, 0, 0, 0), bb.box(1.6, 1.4, 0.1, -6.2, s * 0.9, 0, 0x5a6a5a);
    blimp.add(new THREE.Mesh(bb.build(), toon({ vertexColors: true })));
    const g = keep(new THREE.PlaneGeometry(7, 1.6)); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (0 + 1 - uv.getY(i)) / 4);
    const m = new THREE.Mesh(g, keep(new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    m.position.set(0, 0, 2.02); blimp.add(m); blimp.userData.banner = m;
  }

  // ── The rooftop ─────────────────────────────────────────────────
  const setMat = toon({ vertexColors: true });
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(30, 14)), toon({ map: plankTex }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 6.5); root.add(floor);
  const rb = new Builder();
  rb.box(30, 1.0, 0.45, 0, 0.5, 0, 0x5a5048);           // parapet
  rb.box(30.4, 0.12, 0.6, 0, 1.06, 0, 0x7a6e62);         // coping
  rb.box(30, 40, 0.4, 0, -20, -0.1, 0x2a2622);           // façade dropping away
  for (const s of [-1, 1]) { rb.box(0.45, 1.0, 14, s * 15, 0.5, 7, 0x5a5048); }
  // planters along the ledge (ends)
  for (const x of [-7.2, 7.2]) { rb.box(1.6, 0.6, 0.7, x, 1.42, 0.0, 0x6a3a26); }
  // AC unit + vent pipe at the back corners
  rb.box(1.4, 1.0, 1.0, -9, 0.5, 4.5, 0x8a8e92); rb.cyl(0.35, 0.35, 0.05, 12, -9, 0.6, 5.01, 0x2a2a2e, Math.PI / 2, 0, 0);
  rb.cyl(0.18, 0.18, 2.4, 8, 9.5, 1.2, 4.2, 0x7a7e82);
  root.add(new THREE.Mesh(rb.build(), setMat));
  // Left lounge corner: beanbag couch, side crate, lava lamp, leafy plant.
  const groups = [];
  const lounge = (x, z, yaw) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; root.add(g); groups.push({ g, base: g.position.y, ph: R() * 6, lift: 0 }); return g; };
  const L = lounge(-5.3, 1.7, 0.8);
  {
    const b = new Builder();
    b.sphere(0.75, 0, 0.42, 0, 0x7a2a8a, 12, 8, 1.2, 0.6, 1.0);
    b.sphere(0.55, 0, 0.75, -0.45, 0x8a3a9a, 10, 8, 1.1, 0.8, 0.6);
    b.box(0.6, 0.55, 0.6, 1.25, 0.275, 0.1, 0x8a5a2a);
    b.box(0.3, 0.06, 0.3, 1.25, 0.58, 0.1, 0x2a2a2a);       // record sleeve
    L.add(new THREE.Mesh(b.build(), setMat));
  }
  // Lava lamp on the crate (glass + base + moving blobs).
  const lamp = new THREE.Group(); lamp.position.set(1.25, 0.56, 0.1); L.add(lamp);
  {
    const b = new Builder();
    b.cyl(0.11, 0.16, 0.22, 10, 0, 0.11, 0, 0xb0b0b8); b.cyl(0.1, 0.06, 0.12, 10, 0, 0.82, 0, 0xb0b0b8);
    lamp.add(new THREE.Mesh(b.build(), setMat));
    const glass = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.07, 0.12, 0.55, 12)), keep(new THREE.MeshBasicMaterial({ color: 0xff3a6a, transparent: true, opacity: 0.45, depthWrite: false })));
    glass.position.y = 0.5; lamp.add(glass); lamp.userData.glass = glass;
    const blobMat = keep(new THREE.MeshBasicMaterial({ color: 0xffb020 }));
    lamp.userData.blobs = [0, 1, 2].map((k) => { const m = new THREE.Mesh(keep(new THREE.SphereGeometry(0.045 + k * 0.01, 8, 6)), blobMat); lamp.add(m); return m; });
    lamp.userData.blobMat = blobMat;
  }
  // Leafy potted plants (fronds with an alpha leaf texture).
  const frondTex = canvasTex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#2a6a20'; g.lineWidth = 4; g.beginPath(); g.moveTo(64, h); g.lineTo(64, 4); g.stroke();
    for (let y = h - 14; y > 8; y -= 12) { const t = 1 - y / h, len = 46 * Math.sin(Math.PI * Math.min(1, t + 0.1)) + 8; for (const s of [-1, 1]) { g.fillStyle = (y / 12) % 2 < 1 ? '#4a9a2a' : '#3a8a22'; g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + s * len * 0.6, y - 10, 64 + s * len, y + 4); g.quadraticCurveTo(64 + s * len * 0.5, y + 4, 64, y + 4); g.fill(); } }
  });
  const frondMat = toon({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true });
  const plants = [];
  const plant = (parent, x, z, s) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
    const pb = new Builder(); pb.cyl(0.32, 0.24, 0.55, 10, 0, 0.275, 0, 0xb05a30); pb.cyl(0.33, 0.33, 0.06, 10, 0, 0.55, 0, 0xc06a3a);
    g.add(new THREE.Mesh(pb.build(), setMat));
    const fb = new Builder();
    for (let f = 0; f < 9; f++) {
      const a = f * 2.4, tilt = 0.25 + (f % 3) * 0.25, len = 1.0 + (f % 4) * 0.25;
      const pg = new THREE.PlaneGeometry(0.42, len, 1, 4); pg.translate(0, len / 2, 0);
      fb.add(pg, fb.m4(0, 0.5, 0, 0, a, 0), 0xffffff, null, (v) => { const y = v.y; v.set(v.x, y * Math.cos(tilt) - y * y * 0.18, y * Math.sin(tilt)); });
    }
    const crown = new THREE.Mesh(fb.build(), frondMat); g.add(crown);
    plants.push({ crown, ph: R() * 6, jolt: 0, jv: 0 });
    return g;
  };
  plant(L, -1.1, -0.6, 1.0);
  const Rg = lounge(5.5, 1.8, -0.7);
  {
    const b = new Builder();
    b.box(1.5, 0.35, 0.8, 0, 0.3, 0, 0x2a6a6a); b.box(1.5, 0.55, 0.22, 0, 0.6, -0.32, 0x2a7a7a);
    for (const s of [-1, 1]) b.box(0.18, 0.5, 0.8, s * 0.74, 0.45, 0, 0x2a7a7a);
    for (const [lx, lz] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) b.cyl(0.03, 0.03, 0.15, 4, lx, 0.07, lz, 0x222222);
    // little speaker + mug on a stool
    b.cyl(0.25, 0.25, 0.5, 10, -1.2, 0.25, 0.25, 0x6a4a2a); b.box(0.32, 0.4, 0.26, -1.2, 0.7, 0.25, 0x18181c); b.cyl(0.08, 0.08, 0.02, 10, -1.2, 0.76, 0.39, 0x5a5a60, Math.PI / 2, 0, 0);
    Rg.add(new THREE.Mesh(b.build(), setMat));
  }
  plant(Rg, 1.3, -0.5, 1.15);
  const ledgePlants = [];
  for (const x of [-7.2, 7.2]) { const g = new THREE.Group(); root.add(g); ledgePlants.push(plant(g, x, 0.0, 0.8)); g.children[0].position.y = 1.15; }
  // Ashtrays on the ledge with the blunt (left) and the joint (right).
  const cherries = [];
  const ashtray = (x, len, ang, rad, colr) => {
    const g = new THREE.Group(); g.position.set(x, 1.12, 0.05); root.add(g);
    const b = new Builder();
    b.cyl(0.17, 0.14, 0.06, 14, 0, 0.03, 0, 0x6a8a9a);
    b.cyl(0.11, 0.11, 0.02, 12, 0, 0.055, 0, 0x2a2a2a);
    b.add(new THREE.CylinderGeometry(rad, rad * 0.85, len, 8), b.m4(Math.cos(ang) * len / 2 - 0.05, 0.085, Math.sin(ang) * len / 2, 0, -ang, Math.PI / 2), colr);
    g.add(new THREE.Mesh(b.build(), setMat));
    const tip = new THREE.Vector3(Math.cos(ang) * len - 0.05, 0.085, Math.sin(ang) * len).add(g.position);
    cherries.push({ tip, drag: 0, lit: 1, side: x < 0 ? -1 : 1 });
  };
  ashtray(-4.5, 0.36, 0.3, 0.028, 0x5a3a1a);
  ashtray(4.6, 0.3, Math.PI - 0.35, 0.02, 0xf0ece0);
  // The cat napping on the ledge.
  const cat = new THREE.Group(); cat.position.set(0.4, 1.12, 0.0); cat.rotation.y = -0.4; root.add(cat);
  const catBody = new THREE.Group(); cat.add(catBody);
  {
    const b = new Builder();
    b.sphere(0.2, 0, 0.13, 0, 0xc8803a, 12, 8, 1.6, 0.7, 0.9);
    catBody.add(new THREE.Mesh(b.build(), setMat));
  }
  const catHead = new THREE.Group(); catHead.position.set(0.3, 0.16, 0.02); catBody.add(catHead);
  {
    const b = new Builder();
    b.sphere(0.12, 0, 0, 0, 0xc8803a, 10, 8);
    for (const s of [-1, 1]) b.add(new THREE.ConeGeometry(0.045, 0.1, 4), b.m4(0.01, 0.11, s * 0.06, 0, 0, s * -0.2), 0xc8803a);
    b.box(0.02, 0.012, 0.035, 0.115, 0.02, 0.04, 0xa0ff60); b.box(0.02, 0.012, 0.035, 0.115, 0.02, -0.04, 0xa0ff60);
    catHead.add(new THREE.Mesh(b.build(), setMat));
  }
  const catEyes = [];
  { const em = keep(new THREE.MeshBasicMaterial({ color: 0xc8ff40 })); for (const s of [-1, 1]) { const e = new THREE.Mesh(keep(new THREE.SphereGeometry(0.022, 6, 4)), em); e.position.set(0.105, 0.025, s * 0.045); e.scale.y = 0.1; catHead.add(e); catEyes.push(e); } }
  const tail = [];
  { let parent = catBody; const tg = keep(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 5)); tg.translate(0, 0.06, 0); const tailMat = toon({ color: 0xc8803a }); for (let k = 0; k < 5; k++) { const s = new THREE.Group(); s.position.set(k === 0 ? -0.3 : 0, k === 0 ? 0.1 : 0.12, 0); parent.add(s); s.add(new THREE.Mesh(tg, tailMat)); tail.push(s); parent = s; } }

  // Fairy lights along the parapet.
  const FAIRY = low ? 26 : 44;
  const fairy = [];
  for (let i = 0; i < FAIRY; i++) { const u = i / (FAIRY - 1); const x = -14 + 28 * u; fairy.push({ x, y: 1.25 - 0.12 * Math.sin((u * 7 % 1) * Math.PI), z: 0.28 }); }
  const fairyGeo = keep(new THREE.BufferGeometry());
  { const pos = []; for (let i = 0; i < FAIRY - 1; i++) pos.push(fairy[i].x, fairy[i].y + 0.03, fairy[i].z, fairy[i + 1].x, fairy[i + 1].y + 0.03, fairy[i + 1].z); fairyGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); }
  root.add(new THREE.LineSegments(fairyGeo, keep(new THREE.LineBasicMaterial({ color: 0x1a2a10 }))));

  // ── Ambient particles (persistent): haze banks, smoke clouds, leaves, embers
  const hazeBanks = Array.from({ length: low ? 3 : 5 }, (_, i) => ({ x: (R() - 0.5) * 100, y: -1 + (i % 4) * 2.2, z: -16 - i * 7, w: 22 + R() * 14, sp: 0.5 + R() * 0.8, ph: R() * 6, hue: R() }));
  const clouds = Array.from({ length: low ? 4 : 7 }, () => ({ x: 0, y: 0, z: 0, life: R(), r: 6, vy: 0, vx: 0, hue: 0 }));
  const respawnCloud = (c, init) => { c.x = (R() - 0.5) * 70; c.z = -12 - R() * 50; c.y = init ? -6 + R() * 26 : -10 - R() * 4; c.life = 1; c.vy = 0.5 + R() * 0.7; c.vx = (R() - 0.5) * 0.5; c.r = 8 + R() * 10; c.hue = R(); };
  clouds.forEach((c) => respawnCloud(c, true));
  const leaves = Array.from({ length: low ? 18 : 30 }, () => ({}));
  const respawnLeaf = (l, init) => { l.x = (R() - 0.5) * 24; l.z = -2 - R() * 14; l.y = init ? R() * 12 - 2 : -2 - R() * 2; l.vy = 0.35 + R() * 0.55; l.vx = (R() - 0.5) * 0.4; l.rot = R() * 6; l.vr = (R() - 0.5) * 0.8; l.s = 0.35 + R() * 0.45; l.hue = R(); l.spin = 0; };
  leaves.forEach((l) => respawnLeaf(l, true));

  // ── Event particles (pooled; no allocation per event) ─────────────
  const PMAX = low ? 420 : 700;
  const pts = Array.from({ length: PMAX }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1, r: 1, g: 1, b: 1, cell: 0, grav: 0, drag: 0, rot: 0, vr: 0, kind: 0, grow: 0, fade: 1, sx: 1, sy: 1 }));
  let pCur = 0;
  const emit = (o) => {
    pCur = (pCur + 1) % PMAX;
    if (pts[pCur].kind === 6 && pts[pCur].life > 0) pCur = (pCur + 1) % PMAX;
    const p = pts[pCur];
    p.life = p.max = o.life || 1; p.x = o.x; p.y = o.y; p.z = o.z; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.size = o.size || 0.2; p.r = o.r ?? 1; p.g = o.g ?? 1; p.b = o.b ?? 1; p.cell = o.cell || 0; p.grav = o.grav || 0; p.drag = o.drag || 0;
    p.rot = o.rot || 0; p.vr = o.vr || 0; p.kind = o.kind || 0; p.grow = o.grow || 0; p.fade = o.fade ?? 1; p.sx = o.sx || 1; p.sy = o.sy || 1;
    return p;
  };
  const hsl = (h, s, l) => col2.setHSL(((h % 1) + 1) % 1, s, l);
  const ring = (x, y, z, size, hue, life, cell = 2, grow = 6) => { const c = hsl(hue, 0.9, 0.62); emit({ x, y, z, life, size, r: c.r, g: c.g, b: c.b, cell, kind: 5, grow, rot: R() * 6, vr: 0.4 }); };
  const sparks = (x, y, z, n, sp = 2.5, hueBase = 0.1) => { for (let k = 0; k < n; k++) { const c = hsl(hueBase + Math.random() * 0.17, 0.9, 0.65); const a = Math.random() * 6.28; emit({ x, y, z, vx: Math.cos(a) * sp * Math.random(), vy: 0.8 + Math.random() * sp, vz: Math.sin(a) * sp * Math.random() * 0.5, life: 0.6 + Math.random() * 0.5, size: 0.06 + Math.random() * 0.05, r: c.r, g: c.g, b: c.b, grav: -2.5, kind: 4 }); } };
  const leafBurst = (x, y, z, n, sp, life = 2.6) => { for (let k = 0; k < n; k++) { const a = (k / n) * 6.28 + Math.random() * 0.3, s = sp * (0.6 + Math.random() * 0.8); const c = hsl(0.24 + Math.random() * 0.12, 0.7, 0.6); emit({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 + 1.6, vz: (Math.random() - 0.5) * s * 0.6, life: life + Math.random(), size: 0.3 + Math.random() * 0.3, r: c.r, g: c.g, b: c.b, cell: 1, grav: -1.2, drag: 0.9, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, kind: 1 }); } };
  const blizzard = (n) => { for (let k = 0; k < n; k++) { const c = hsl(0.22 + Math.random() * 0.18, 0.75, 0.6); emit({ x: (Math.random() - 0.5) * 22, y: 7 + Math.random() * 5, z: -1 - Math.random() * 10, vx: (Math.random() - 0.5) * 1.5, vy: -0.6 - Math.random() * 0.8, vz: 0, life: 6, size: 0.35 + Math.random() * 0.4, r: c.r, g: c.g, b: c.b, cell: 1, drag: 0.2, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, kind: 1 }); } };
  const textPop = (cell, x, y, z, size, life = 1.8) => {
    if (st.portrait) { if (pts.some(q => q.kind === 6 && q.life > 0.3)) return null; x = 0; y = 7.4; z = -1.0; size *= 0.6; }   // portrait: pop in the strip above the board
    return emit({ x, y, z, vy: 0.35, life, size, cell, kind: 6 });
  };
  const smokeRing = (side) => { const ch = cherries[side > 0 ? 1 : 0]; emit({ x: ch.tip.x, y: ch.tip.y + 0.2, z: ch.tip.z, vx: -side * 0.6, vy: 0.5, vz: -2.2, life: 5, size: 0.4, r: 0.85, g: 0.95, b: 0.85, cell: 11, kind: 7, grow: 6, drag: 0.25, fade: 0.8 }); };

  // ── State ──────────────────────────────────────────────────────
  const st = {
    t: 0, trip: 0, colorPhase: R() * 6, breathPhase: R() * 6, moveGlow: 0, hazeFlood: 0, ripple: 0, flash: 0, wave: 0,
    lift: 0, liftT: 0, halo: 0, combo: 0, level: 1, camY: 0, camYT: 0, hueStep: 0, hueShow: 0, spinAll: 0,
    danger: 0, red: 0, dead: false, deadT: 0, live: 1, catAwake: 0, lastBeatI: 0, cheer: 0, pieceX: 0, camX: 0,
    jolt: 0, portrait: false, sirenT: 0,
  };

  function update(dt, info) {
    dt = Math.min(dt, 0.05);
    const beat = info.beat || 0;
    st.t += dt; const t = st.t;
    const fb = ((beat % 1) + 1) % 1, onBeat = Math.exp(-fb * 5);
    const energy = (info.energy ?? 1) * (0.55 + 0.45 * onBeat);          // the old beatEnergy feel
    const cheerIn = info.cheer || 0;
    st.cheer = Math.max(st.cheer - dt * 0.6, cheerIn);
    st.pieceX += ((info.pieceX || 0) - st.pieceX) * Math.min(1, dt * 3);
    st.danger += ((info.danger || 0) - st.danger) * Math.min(1, dt * 1.5);
    // Old timers (per-frame constants converted to per-second).
    st.trip = Math.min(1.2, st.trip * Math.pow(0.9994, dt * 60) + st.cheer * 0.006 * dt * 60 * 0.3);
    st.colorPhase += (0.0009 + st.trip * 0.0012 + st.combo * 0.0006) * dt * 60;
    st.breathPhase += 0.0038 * dt * 60 * 1.2;
    st.moveGlow = Math.max(0, st.moveGlow - dt * 1.5);
    st.hazeFlood *= Math.pow(0.87, dt * 60 * 0.35);
    st.ripple = Math.max(0, st.ripple - dt * 0.8);
    st.flash = Math.max(0, st.flash - dt * 2);
    st.wave += ((st.trip > 0.25 ? Math.min(1, (st.trip - 0.2) * 1.4) : 0) - st.wave) * Math.min(1, dt * 1.2);
    st.halo = Math.max(0, st.halo - dt * 0.12);
    st.spinAll = Math.max(0, st.spinAll - dt * 1.2);
    st.hueShow += (st.hueStep - st.hueShow) * Math.min(1, dt * 3);
    st.liftT = Math.max(0, st.liftT - dt);
    st.lift += ((st.liftT > 0 ? 1 : 0) - st.lift) * Math.min(1, dt * (st.liftT > 0 ? 1.5 : 0.8));
    st.camY += (st.camYT - st.camY) * Math.min(1, dt * 0.8);
    st.live += ((st.dead ? 0 : 1) - st.live) * Math.min(1, dt * (st.dead ? 0.7 : 2.5));
    if (st.dead) st.deadT += dt;
    st.red += ((st.danger > 0.55 && !st.dead ? smooth(0.55, 0.9, st.danger) : 0) - st.red) * Math.min(1, dt * 1.5);
    st.catAwake += ((st.red > 0.2 || st.lift > 0.3 ? 1 : 0) - st.catAwake) * Math.min(1, dt * 2);
    const live = st.live, grey = 1 - live;
    const breath = Math.sin(st.breathPhase) * 0.5 + 0.5;
    const baseHue = (100 + Math.sin(st.colorPhase) * 28) / 360 + st.hueShow * 0.06;
    const bi = Math.floor(beat), newBeat = bi !== st.lastBeatI; st.lastBeatI = bi;

    // Sky / fog / lights.
    const su = sky.material.uniforms;
    su.uTime.value = t; su.uHue.value = baseHue + Math.sin(st.colorPhase * 1.1) * 0.06 + st.trip * 0.08; su.uBreath.value = breath + energy * 0.5;
    su.uTrip.value = st.trip; su.uWave.value = st.wave; su.uFlash.value = st.flash * 0.5 + st.moveGlow * 0.15 + st.hazeFlood * 0.3;
    su.uGrey.value = grey; su.uHalo.value = st.halo; su.uRed.value = st.red; su.uPulse.value = onBeat * 0.6 * live;
    fogCol.setHSL(baseHue + st.trip * 0.06, 0.45, 0.05 + 0.015 * breath + st.hazeFlood * 0.06);
    if (st.red > 0) fogCol.lerp(col.setRGB(0.16, 0.04, 0.02), st.red * 0.8);
    { const l = fogCol.r * 0.3 + fogCol.g * 0.59 + fogCol.b * 0.11; fogCol.lerp(col.setScalar(l * 0.8), grey * 0.8); }
    scene.fog.color.copy(fogCol); scene.background.copy(fogCol).multiplyScalar(0.4);
    scene.fog.near = 30 - st.hazeFlood * 18; scene.fog.far = 190 - st.hazeFlood * 90 - st.red * 40;
    starMat.uniforms.uTime.value = t; starMat.uniforms.uK.value = 1 - 0.5 * st.hazeFlood;
    hemi.color.setHSL(baseHue, 0.35, 0.45 + 0.1 * breath); hemi.intensity = 0.8 + 0.3 * energy * live + st.flash * 0.6 + st.moveGlow * 0.3;
    pLamp.intensity = (8 + 2 * Math.sin(t * 1.3)) * live + 1;
    pTrip.color.setHSL(baseHue + st.trip * 0.4 + t * 0.05 * st.trip, 0.85, 0.55);
    if (st.red > 0.05) pTrip.color.lerp(col.set(Math.sin(t * 8) > 0 ? 0xff2010 : 0xff7020), st.red);
    pTrip.intensity = (5 + 6 * energy + 12 * st.flash + 8 * st.trip + 6 * st.moveGlow) * live + 1;
    const cu = cityMat.uniforms; cu.uTime.value = t; cu.uHue.value = baseHue + st.hueShow * 0.17 + t * 0.02; cu.uK.value = 0.55 + 0.45 * live + 0.1 * onBeat; cu.uRed.value = st.red * 0.6; cu.uFlash.value = st.flash * 0.5;
    cu.uFog.value = fogCol;
    signs.forEach((s) => { let k = (0.7 + 0.3 * onBeat) * (0.25 + 0.75 * live); if (Math.sin(t * 11 + s.ph * 5) > 0.98) k *= 0.3; s.mat.color.setScalar(k * (1 + st.flash)); });
    beamMat.uniforms.uK.value = (0.5 + 0.3 * energy) * (0.3 + 0.7 * live) + st.flash;
    beamMat.uniforms.uCol.value.setHSL(baseHue + 0.05 + st.trip * 0.3, 0.6, 0.75);
    beams[0].rotation.set(Math.sin(t * 0.21) * 0.35, 0, -0.3 + Math.sin(t * 0.17) * 0.45);
    beams[1].rotation.set(Math.sin(t * 0.19 + 2) * 0.3, 0, 0.3 + Math.sin(t * 0.23 + 1) * 0.45);
    // Blimp: slow drift across the far sky, banner pulses.
    const bx = ((t * 1.6 + 60) % 240) - 120;
    blimp.position.set(bx, 22 + Math.sin(t * 0.3) * 0.8, -95); blimp.rotation.y = 0.0;
    blimp.userData.banner.material.color.setScalar((0.6 + 0.4 * onBeat) * (0.3 + 0.7 * live));

    // Lounge: levitation on a Tetris (HIGHER!), gentle hover with the trip.
    groups.forEach((G, i) => {
      const hover = st.lift * (0.7 + 0.25 * Math.sin(t * 1.1 + G.ph)) + st.trip * 0.04 * Math.sin(t * 0.8 + G.ph);
      G.g.position.y = Math.max(0, hover);
      G.g.rotation.z = st.lift * 0.08 * Math.sin(t * 0.7 + G.ph); G.g.rotation.x = st.lift * 0.05 * Math.sin(t * 0.9 + G.ph);
    });
    // Lava lamp blobs.
    lamp.userData.blobs.forEach((m, k) => { const u = 0.5 + 0.5 * Math.sin(t * (0.35 + k * 0.13) + k * 2); m.position.set(0.02 * Math.sin(t + k), 0.3 + u * 0.38, 0.02 * Math.cos(t * 0.7 + k)); m.scale.set(1, 1.2 + 0.4 * Math.sin(t * 0.9 + k), 1); });
    lamp.userData.blobMat.color.setHSL(0.08 + st.hueShow * 0.08 + st.trip * 0.3 * Math.sin(t * 0.3), 0.95, 0.55 * (0.4 + 0.6 * live));
    lamp.userData.glass.material.color.setHSL(0.95 + st.hueShow * 0.08, 0.8, 0.5 * (0.4 + 0.6 * live));
    // Plants sway (+ jolt on hard drops).
    st.jolt = Math.max(0, st.jolt - dt * 2);
    plants.forEach((p, i) => { p.jv += (-p.jolt * 90 - p.jv * 7) * dt; p.jolt += p.jv * dt; p.crown.rotation.z = Math.sin(t * 0.9 + p.ph) * 0.05 + p.jolt + st.lift * 0.2 * Math.sin(t * 2 + i); p.crown.rotation.x = Math.sin(t * 0.7 + p.ph) * 0.04 + 0.03 * onBeat; });
    // Cat: breathing, tail swish, ears/head up when awake.
    catBody.scale.y = 1 + 0.04 * Math.sin(t * 2.2);
    catHead.rotation.z = -0.25 * (1 - st.catAwake) + 0.12 * st.catAwake * Math.sin(t * 0.8);
    catHead.rotation.y = st.catAwake * (st.pieceX * 0.6);
    catHead.position.y = 0.12 + 0.08 * st.catAwake;
    for (const e of catEyes) e.scale.y = 0.1 + 0.9 * st.catAwake;
    tail.forEach((s, k) => { s.rotation.z = (k === 0 ? 1.4 : 0.25) + 0.25 * Math.sin(t * (1.2 + st.catAwake * 3) - k * 0.6) * (0.5 + st.catAwake); s.rotation.x = 0.15 * Math.sin(t * 0.9 - k * 0.5); });
    cat.position.y = 1.12 + st.lift * 0.6 * (0.8 + 0.2 * Math.sin(t * 1.3));

    glows.begin(); flats.begin();
    // Cherries: glow on the beat, flare on a drag, embers + curling smoke.
    for (const ch of cherries) {
      ch.drag = Math.max(0, ch.drag - dt * 1.4);
      ch.lit += ((st.dead ? 0 : 1) - ch.lit) * Math.min(1, dt * (st.dead ? 1 : 4));
      const k = ch.lit * (0.7 + 0.3 * energy + 1.2 * ch.drag);
      if (k > 0.02) {
        glows.set(ch.tip.x, ch.tip.y, ch.tip.z, 0.18 + 0.12 * k, 1.0 * k, (0.35 + 0.4 * energy) * k, 0.05 * k, 1);
        glows.set(ch.tip.x, ch.tip.y, ch.tip.z, 0.9 + 0.5 * k, 0.5 * k, 0.15 * k, 0.0, 0.6);
      }
      if (Math.random() < dt * (10 + 30 * ch.drag) * Math.max(0.15, ch.lit)) {
        emit({ x: ch.tip.x, y: ch.tip.y + 0.04, z: ch.tip.z, vx: (Math.random() - 0.5) * 0.08, vy: 0.35 + Math.random() * 0.2, vz: (Math.random() - 0.5) * 0.05, life: 3.2, size: 0.12, r: 0.62, g: 0.78, b: 0.55, cell: 8, kind: 8, grow: 7, fade: 0.32 + 0.3 * ch.drag, rot: Math.random() * 6, ph: Math.random() * 6 });
      }
      if (ch.lit > 0.3 && Math.random() < dt * (4 + 8 * energy)) {
        const c = hsl((35 + Math.random() * 65) / 360, 0.92, 0.66);
        emit({ x: ch.tip.x, y: ch.tip.y, z: ch.tip.z, vx: (Math.random() - 0.5) * 0.3, vy: 0.5 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.2, life: 1 + Math.random() * 0.8, size: 0.035 + Math.random() * 0.03, r: c.r, g: c.g, b: c.b, kind: 9 });
      }
    }
    // Fairy lights: warm chase, dim when dead.
    fairy.forEach((f, i) => {
      const chase = smooth(0.3, 1, Math.sin(t * 2 - i * 0.5));
      let k = (0.35 + 0.5 * chase + 0.4 * onBeat) * live + st.flash * 0.6;
      if (st.dead && st.deadT < 2 && Math.random() < 0.1) k = Math.random() * 0.5;
      if (k < 0.02) return;
      const c = hsl(st.trip > 0.4 ? (t * 0.2 + i * 0.07) : 0.11 + (i % 3) * 0.02, st.trip > 0.4 ? 0.9 : 0.85, 0.62);
      glows.set(f.x, f.y, f.z, 0.22 + 0.1 * k, c.r * k, c.g * k, c.b * k, 1);
    });
    // City roof lights (blink) + far sirens on danger.
    for (const L of roofLights) {
      const on = Math.sin(t * 2.2 + L.ph) > 0.4 ? 1 : 0.15;
      glows.set(L.x, L.y, L.z, L.big ? 1.6 : 1.2, (L.red ? 1 : 1) * on * 0.9, (L.red ? 0.1 : 0.9) * on * 0.9, (L.red ? 0.05 : 0.8) * on * 0.9, 1);
    }
    if (st.red > 0.05) {
      for (let k = 0; k < 4; k++) { const red = Math.sin(t * 9 + k * 1.3) > 0; glows.set(-30 + k * 22, -3.5 + (k % 2), -60 - k * 9, 3.2 * st.red, red ? st.red : 0.05, 0.05, red ? 0.05 : st.red, 1); }
    }
    // Plane crossing with a blinking strobe.
    { const px = ((t * 6) % 400) - 200; if ((Math.floor(t * 1.4) % 2) === 0) glows.set(px, 40, -150, 1.6, 1, 1, 1, 1); glows.set(px, 40, -150, 0.8, 1, 0.1, 0.1, 0.7); }

    // Haze banks (old 4 rolling fog bands) + big smoke clouds (old LARGE SMOKE CLOUDS).
    for (const H of hazeBanks) {
      const x = ((H.x + t * H.sp + 300) % 100) - 50, y = H.y + Math.sin(t * 0.28 + H.ph) * 1.2;
      const c = hsl(baseHue + H.hue * 0.15 + st.trip * 0.25 * Math.sin(t * 0.38 + H.ph), 0.55, 0.3 + 0.1 * breath);
      if (st.red > 0) c.lerp(col.setRGB(0.4, 0.12, 0.04), st.red);
      const a = (0.16 + energy * 0.05 + st.trip * 0.08 + st.hazeFlood * 0.25) * (1 - grey * 0.5);
      flats.set(x, y, H.z, H.w, c.r, c.g, c.b, a, 0, 1.8, 0.45, 14);
    }
    for (const c of clouds) {
      c.y += c.vy * dt * (0.55 + energy * 0.35 + breath * 0.12); c.x += c.vx * dt; c.life -= dt * 0.035;
      if (c.life <= 0 || c.y > 28) respawnCloud(c, false);
      const k = Math.min(1, c.life * 3) * Math.min(1, (1 - c.life) * 4);
      const cc = hsl((82 + c.hue * 50) / 360 + st.trip * 0.06, 0.42, 0.4);
      if (st.red > 0) cc.lerp(col.setRGB(0.35, 0.12, 0.05), st.red);
      flats.set(c.x, c.y, c.z, c.r * (1 + breath * 0.06) * 0.6, cc.r, cc.g, cc.b, k * (0.2 + energy * 0.05 + st.trip * 0.08) * (1 - 0.5 * grey), t * 0.02 + c.hue * 6, 1, 1, 8);
    }
    // Floating leaves (rise; fall in the comedown; spin on rotate).
    for (const l of leaves) {
      const dir = st.dead ? -0.6 : 1;
      l.y += l.vy * dt * dir * (0.72 + energy * 0.38 + breath * 0.1);
      l.x += (l.vx + Math.sin(t * 0.65 + l.y * 0.6) * 0.2) * dt;
      l.rot += (l.vr + energy * 0.4 + st.spinAll * 9) * dt;
      if (l.y > 12 || l.y < -4) respawnLeaf(l, false);
      if (st.dead && l.y < -3.5) l.y = 11.5;
      const a = Math.min(1, (l.y + 3) / 2) * Math.min(1, (12 - l.y) / 2) * (0.55 + energy * 0.25 + st.trip * 0.3);
      const c = hsl((80 + l.hue * 45) / 360 + st.trip * 0.07 * Math.sin(t * 0.7 + l.x), 0.7 * (1 - grey * 0.7), 0.55);
      flats.set(l.x, l.y, l.z, l.s, c.r, c.g, c.b, Math.max(0, Math.min(0.9, a)), l.rot, 1, 1, 1);
    }

    // Event particles.
    for (const p of pts) {
      if (p.life <= 0) continue;
      p.life -= dt; if (p.life <= 0) continue;
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr; p.vy += p.grav * dt;
      if (p.kind === 8) { p.vx += Math.sin(st.t * 1.7 + p.y * 3 + p.rot) * 0.25 * dt; }      // curling smoke
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
      const u = p.life / p.max, size = p.size * (1 + p.grow * (1 - u));
      if (p.kind === 1) flats.set(p.x, p.y, p.z, size, p.r, p.g, p.b, Math.min(1, u * 3) * 0.95, p.rot, 1, 1, 1);
      else if (p.kind === 8 || p.kind === 7) {
        const a = p.fade * Math.min(1, u * 2) * Math.min(1, (1 - u) * 8);
        if (st.red > 0 && p.kind === 8) col.setRGB(p.r, p.g, p.b).lerp(col2.setRGB(0.8, 0.45, 0.3), st.red); else col.setRGB(p.r, p.g, p.b);
        (p.kind === 7 ? glows : flats).set(p.x, p.y, p.z, size, col.r * (p.kind === 7 ? a : 1), col.g * (p.kind === 7 ? a : 1), col.b * (p.kind === 7 ? a : 1), p.kind === 7 ? 1 : a, p.rot, 1, 1, p.cell);
      } else if (p.kind === 6) {
        const age = p.max - p.life, punch = age < 0.15 ? 0.4 + 0.75 * (age / 0.15) : 1 + 0.05 * Math.sin(age * 18) * Math.exp(-age * 4);
        glows.set(p.x, p.y, p.z, size * punch, 1, 1, 1, Math.min(1, u * 4), 0.06 * Math.sin(age * 2.5), 2, 1, p.cell);
      } else if (p.kind === 5) glows.set(p.x, p.y, p.z, size, p.r, p.g, p.b, Math.min(1, u * 1.5), p.rot, 1, 1, p.cell);
      else glows.set(p.x, p.y, p.z, size, p.r, p.g, p.b, Math.min(1, u * 2), 0, 1, 1, p.cell);
    }
    // Ambient: occasional slow psychedelic ring in the haze while tripping.
    if (st.trip > 0.3 && Math.random() < dt * st.trip * 0.8) ring((Math.random() - 0.5) * 40, 4 + Math.random() * 10, -25 - Math.random() * 20, 2, baseHue + Math.random() * 0.5, 3, 10, 5);
    // Beat pulse (old: energy > 0.52 → warm centre glow) — a soft glow on the horizon.
    glows.set(0, 6, -60, 70, 0.25 * onBeat * live * (0.4 + st.trip), 0.3 * onBeat * live * (0.4 + st.trip), 0.08 * onBeat * live, 0.5, 0, 1, 0.5, 14);
    glows.end(); flats.end();

    // ── Camera ──
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    st.portrait = portrait;
    st.camX += (st.pieceX * 0.35 - st.camX) * Math.min(1, dt * 1.2);
    const swayX = Math.sin(t * 0.11) * 0.35, swayY = Math.sin(t * 0.15) * 0.1 + st.lift * 0.25 * Math.sin(t * 0.9);
    const drop = st.ripple > 0.6 ? (st.ripple - 0.6) * 0.15 * Math.sin(t * 50) : 0;
    if (portrait) {
      camera.fov = 72;
      camera.position.set(swayX * 0.3 + st.camX * 0.3, 1.9 + st.camY + swayY + drop, 4.4);
      camera.lookAt(st.camX * 0.3, 9.5 + st.camY * 0.6, -20);
    } else {
      const narrow = Math.max(0, 1.6 / aspect - 1);
      camera.fov = 50 + narrow * 10;
      camera.position.set(swayX + st.camX, 2.5 + st.camY + swayY + drop, 9.6 + narrow * 2.5);
      camera.lookAt(st.camX * 0.6 + swayX * 0.3, 2.9 + st.camY * 0.5, -20);
    }
    camera.rotateZ(Math.sin(t * 0.09) * 0.012 + st.lift * 0.02 * Math.sin(t * 0.6) + st.trip * 0.01 * Math.sin(t * 0.4));
    if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position); stars.position.copy(camera.position);
  }

  function react(kind, data = {}) {
    if (kind === 'move') {
      const dir = data.dir || 0, side = dir < 0 ? -1 : 1;
      st.moveGlow = Math.min(1, st.moveGlow + 0.4);
      ring(side * (3.5 + Math.random() * 3), 2.5 + Math.random() * 3, -3 - Math.random() * 4, 0.3, 0.25 + Math.random() * 0.08, 0.6);
      const ch = cherries[side > 0 ? 1 : 0];
      sparks(ch.tip.x, ch.tip.y, ch.tip.z, 4, 1.4);
    } else if (kind === 'rotate') {
      st.spinAll = Math.min(1.2, st.spinAll + 0.5); st.hueStep += 1;
      for (const p of plants) p.jv += (Math.random() - 0.5) * 0.6;
    } else if (kind === 'soft') {
      for (const ch of cherries) ch.drag = Math.min(1.2, ch.drag + 0.3);
    } else if (kind === 'drop') {
      const rows = data.rows || 0, k = Math.min(1, 0.35 + rows / 16);
      st.ripple = Math.min(1.2, k * 1.15); st.hazeFlood = Math.min(0.8, st.hazeFlood + k * 0.25);
      for (let i = 0; i < 5; i++) ring(0, 1.6, -1.5, 0.5 + i * 0.25, 0.26 + i * 0.08, 0.8 + i * 0.1, 2, (3 + i * 1.6) * (0.6 + 0.4 * k));
      const n = Math.round(4 + 6 * k);
      for (const s of [-1, 1]) { leafBurst(s * 3.8, 1.6, 0.4, n, 2.5 + 2 * k); sparks(s * 3.4, 1.3, 0.1, Math.round(6 + 10 * k), 2 + 2 * k, 0.11); }
      for (const p of plants) p.jv += 0.8 * k * (Math.random() < 0.5 ? -1 : 1);
      for (const G of groups) G.g.position.y += 0.02;
    } else if (kind === 'hold') {
      smokeRing(Math.random() < 0.5 ? -1 : 1);
      for (const ch of cherries) ch.drag = Math.min(1.2, ch.drag + 0.6);
    } else if (kind === 'clear') {
      const n = Math.max(1, data.lines || 1), combo = data.combo || 0;
      st.combo = combo;
      st.trip = Math.min(1.2, st.trip + 0.18 * n * 0.6 + (n >= 4 ? 0.3 : 0));
      st.hazeFlood = Math.min(1, st.hazeFlood + 0.6);
      st.flash = Math.max(st.flash, 0.25 + n * 0.12);
      const nr = 3 + n * 2;
      for (let i = 0; i < nr; i++) { const s = i % 2 ? 1 : -1; ring(s * (4 + Math.random() * 8), 2 + Math.random() * 6, -5 - Math.random() * 8, 0.35 + i * 0.12, (75 + i * 52) / 360 + Math.random() * 0.08, 1.4, i % 3 === 0 ? 10 : 2, 5); }
      blizzard(n >= 4 ? 70 : 14 + n * 8);
      for (const ch of cherries) ch.drag = Math.min(1.2, ch.drag + 0.4 * n);
      if (n >= 3) st.wave = Math.max(st.wave, 0.8);
      if (n >= 4) {
        st.liftT = 3.5; st.halo = 1.4;
        ring(0, 9, -30, 6, st.colorPhase * 0.1, 3.2, 10, 3);
        ring(0, 9, -30, 3, st.colorPhase * 0.1 + 0.3, 2.6, 10, 4);
        textPop(4, 5.6, 4.0, -1.5, 1.9, 2.4);
      } else if (n === 3) textPop(5, -5.6, 3.8, -1.5, 1.5, 1.8);
      else if (n === 2 && Math.random() < 0.6) textPop(13, (Math.random() < 0.5 ? -1 : 1) * 5.6, 3.6, -1.5, 1.3, 1.6);
      if (combo >= 2) {
        st.halo = Math.max(st.halo, 0.4 + combo * 0.2);
        textPop(combo >= 4 ? 7 : 6, (combo % 2 ? -1 : 1) * 5.4, 4.6, -1.5, 1.4, 1.8);
        for (let k = 0; k < combo; k++) ring((Math.random() - 0.5) * 30, 6 + Math.random() * 8, -20, 1.5, Math.random(), 2.2, 10, 4);
      }
    } else if (kind === 'combo') {
      st.combo = data.n || 0;
    } else if (kind === 'levelUp') {
      st.level = data.level || st.level + 1;
      st.camYT = Math.min(3, (st.level - 1) * 0.3);
      st.flash = Math.max(st.flash, 0.4);
      for (let k = 0; k < (low ? 10 : 18); k++) emit({ x: (Math.random() - 0.5) * (st.portrait ? 16 : 60), y: -1 + Math.random() * 3, z: -20 - Math.random() * 30, vx: (Math.random() - 0.5) * 0.4, vy: 1.1 + Math.random() * 0.6, life: 16, size: 0.9 + Math.random() * 0.5, r: 1, g: 0.85, b: 0.6, cell: 12, kind: 5, drag: 0.02 });
      textPop(15, 5.6, 4.2, -1.5, 1.7, 2.0);
    } else if (kind === 'gameOver') {
      if (!st.dead) { st.dead = true; st.deadT = 0; st.combo = 0; st.trip = 0; st.liftT = 0; }
    } else if (kind === 'start') {
      st.dead = false; st.deadT = 0; st.combo = 0; st.level = data.level || 1; st.camYT = 0;
      for (const ch of cherries) { ch.drag = 1.2; emit({ x: ch.tip.x, y: ch.tip.y + 0.08, z: ch.tip.z, vy: 0.2, life: 0.8, size: 0.35, cell: 9, kind: 5 }); }
      st.flash = 0.4;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      K.dispose();
    },
  };
}
