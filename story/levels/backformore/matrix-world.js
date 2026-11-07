// MATRIX RAIN — the living Tetris world shared by BACK FOR MORE (green,
// hot-air balloons drifting up through the rain) and WHITE RABBIT (purple,
// with Wonderland in the code: pocket watches and playing cards tumbling
// through the rain and a glowing white rabbit to follow).
//
// The old 2D background was a wall of falling code columns: each column at
// its own speed and trail length, heads throbbing on the kick, random
// columns flickering on every piece move, the rain rushing on clears and
// glowing on big clears. Here it's a 3D digital void you glide through:
// hundreds of code streams falling at every depth (billboarded strips, one
// instanced draw), a grid floor that ripples, a wireframe city far off,
// code motes drifting past the lens.
//
// Reactions:
//   move     → a fresh set of streams flickers (more on the move's side),
//              the motes near the lens are blown that way, camera nudges
//   rotate   → a scan band sweeps up (or down) through all the rain + roll
//   soft     → the rain and the glide speed up a notch, the camera dips
//   drop     → floor shockwave from the piece's column + every head jumps,
//              shake scaled by rows; a long slam bursts motes outward
//   hold     → déjà vu: the rain glitches white and jitters sideways
//   clear    → rain surges, heads flare, scan band (1-3 lines get bigger),
//              balloon burners / white rabbit react; TETRIS = bullet time:
//              the rain freezes, the camera orbits, then it all rushes
//   combo    → the code runs hotter and faster, escalating rings
//   levelUp  → ACCESS GRANTED banner, all streams flare, rings
//   danger   → the rain bleeds red as the stack climbs (agents incoming)
//   gameOver → the code goes red, slows, and glitches out; start reboots

const GLYPHS = 'ハミヒーウシナモニサワツオリアホテマケメエカキムユラセネスタヌヘ0123456789Z:.=*+';

const STRIP_VS = `
attribute vec3 aPos; attribute vec4 aProp;
uniform float uTravel, uRange, uZMax;
varying vec2 vUv; varying vec4 vProp; varying float vY, vDist, vSide;
void main(){
  vec3 c = aPos;
  c.z = uZMax - mod(uZMax - aPos.z - uTravel, uRange);
  vec2 toCam = normalize(cameraPosition.xz - c.xz + vec2(0.0001));
  vec2 right = vec2(toCam.y, -toCam.x);
  float W = aProp.w, H = W * 1.15 * aProp.z;
  vec3 wp = vec3(c.x + right.x * position.x * W, c.y + position.y * H, c.z + right.y * position.x * W);
  vUv = vec2(position.x + 0.5, position.y);
  vProp = aProp; vY = wp.y; vSide = c.x;
  vDist = length(wp - cameraPosition);
  // Fade in at the far end of the loop and out right in front of the lens.
  vDist += 400.0 * (1.0 - smoothstep(uZMax - uRange, uZMax - uRange + 12.0, c.z));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const STRIP_FS = `
uniform sampler2D uAtlas;
uniform float uTime, uBright, uWhite, uHead, uFar, uRed, uGlitch, uWave, uWaveK, uSideK;
uniform vec3 uTint, uGlow, uRedC;
uniform vec2 uFlick, uScan;
varying vec2 vUv; varying vec4 vProp; varying float vY, vDist, vSide;
float h1(float n){ return fract(sin(n * 91.345) * 47453.5453); }
void main(){
  float rows = vProp.z, speed = vProp.x, seed = vProp.y;
  float rf = (1.0 - vUv.y) * rows, row = floor(rf);
  float len = 6.0 + floor(h1(seed * 3.1) * 16.0);
  float cyc = rows + len + 4.0;
  float head = mod(uTime * speed * 7.0 + seed * cyc, cyc);
  float d = head - row;
  if (d < 0.0 || d > len) discard;
  float fade = 1.0 - d / len;
  // Glyph per cell, changing on its own cadence.
  float gi = floor(h1(row * 7.13 + seed * 13.7 + floor(uTime * (0.6 + 1.2 * h1(row + seed)) + h1(row * 3.0 + seed))) * 63.99);
  vec2 cu = vec2(fract(rf), vUv.x);
  vec2 auv = vec2((mod(gi, 8.0) + cu.y) / 8.0, 1.0 - (floor(gi / 8.0) + cu.x) / 8.0);
  float g = texture2D(uAtlas, auv).r;
  float isHead = step(d, 1.0);
  vec3 tint = mix(uTint, uRedC, uRed);
  vec3 c = tint * pow(fade, 1.3) * g * 1.25 + (uGlow * 0.6 + vec3(0.55)) * isHead * g * uHead;
  // Piece-move flicker: a fresh random set of streams each move, more of
  // them on the move's side.
  float fl = step(h1(seed * 1.37 + uFlick.x), uFlick.y * (1.0 + uSideK * sign(vSide) * 0.8));
  c *= 1.0 + fl * 2.0;
  c += uGlow * fl * g * fade * 0.5;
  // Scan band (rotations, clears) and the sideways clear wave.
  float sb = exp(-pow((vY - uScan.x) * 0.9, 2.0)) * uScan.y;
  c += (tint * 0.8 + vec3(0.35)) * sb * (0.2 + 1.6 * g);
  float wv = exp(-pow((vSide - uWave) * 0.12, 2.0)) * uWaveK;
  c += (tint + vec3(0.3)) * wv * g * (0.4 + fade);
  // Déjà vu: the code bleaches white.
  c = mix(c, vec3(dot(c, vec3(0.6, 1.0, 0.6))) * 0.9 + vec3(0.25) * g, uWhite);
  float far = (1.0 - smoothstep(uFar * 0.35, uFar, vDist)) * smoothstep(2.5, 7.0, vDist);
  gl_FragColor = vec4(c * uBright * far * (1.0 - 0.5 * uGlitch * step(0.5, h1(row + floor(uTime * 30.0)))), 1.0);
}`;

const FLOOR_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FLOOR_FS = `
uniform float uTravel, uBeat, uFlash, uTime, uRed, uLevel;
uniform vec4 uRipA, uRipB;
uniform vec3 uTint, uRedC;
uniform vec2 uSweep;
varying vec3 vW;
float ripple(vec4 r){
  float rad = r.z * 14.0, d = length(vW.xz - r.xy);
  return exp(-pow((d - rad) * 0.9, 2.0)) * r.w * (1.0 - min(1.0, r.z / 1.6));
}
void main(){
  vec2 p = vec2(vW.x, vW.z - uTravel) * 0.5;
  vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float d = length(vW.xz - cameraPosition.xz);
  float fade = 1.0 - smoothstep(10.0, 70.0, d);
  float rip = ripple(uRipA) + ripple(uRipB);
  float sweep = exp(-pow((vW.z - uSweep.x) * 0.6, 2.0)) * uSweep.y;
  vec3 tint = mix(uTint, uRedC, uRed);
  float k = line * (0.14 + 0.22 * uBeat + 0.4 * uFlash) * uLevel + rip * (0.5 + 1.5 * line) + sweep * (0.3 + line);
  vec3 c = vec3(0.003, 0.006, 0.006) + tint * k * fade;
  // Faint glow pooled under the rain.
  c += tint * 0.03 * fade;
  gl_FragColor = vec4(c, 1.0);
}`;

export function createMatrixWorld(ctx, opts) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const P = opts;                         // { accent, glow, bg, sky, extras: 'balloons' | 'wonderland', title }
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = new THREE.Fog(P.bg, 30, 120);
  scene.background = new THREE.Color(P.bg);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t);
  };
  const ACC = new THREE.Color(P.accent), GLOW = new THREE.Color(P.glow), RED = new THREE.Color(0xff2a3a);

  // ── Glyph atlas: 8x8 mirrored katakana / digits (+ theme extras) ──
  const atlas = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 46px "WenQuanYi Zen Hei", "Noto Sans CJK JP", "MS Gothic", monospace';
    const extra = P.extras === 'wonderland' ? '♥♠♦♣♥♠♦♣' : '0101ZZ::';
    const all = GLYPHS + extra + '<>[]#%$&';
    for (let i = 0; i < 64; i++) {
      const cx = (i % 8) * 64 + 32, cy = Math.floor(i / 8) * 64 + 34;
      g.save(); g.translate(cx, cy); g.scale(-1, 1); g.fillText(all[i % all.length], 0, 0); g.restore();
    }
  });
  atlas.colorSpace = THREE.NoColorSpace;

  // ── Sky dome ───────────────────────────────────────────────────
  const skyMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uRed: { value: 0 }, uHor: { value: new THREE.Color(P.sky) }, uRedC: { value: RED } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse, uRed; uniform vec3 uHor, uRedC;
      void main(){
        float h = vP.y;
        vec3 hor = mix(uHor, uRedC * 0.3, uRed);
        vec3 c = mix(hor, hor * 0.06, smoothstep(-0.05, 0.5, h));
        c += hor * 1.2 * uPulse * smoothstep(0.3, 0.0, abs(h - 0.02));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(150, 24, 12)), skyMat);
  sky.renderOrder = -10;
  root.add(sky);

  // ── Code rain: billboarded glyph streams at every depth ─────────
  const N = low ? 340 : 680, RANGE = 84, ZMAX = 6;
  const sGeo = keep(new THREE.InstancedBufferGeometry());
  const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
  sGeo.index = base.index; sGeo.setAttribute('position', base.attributes.position); sGeo.setAttribute('uv', base.attributes.uv);
  const aPos = new Float32Array(N * 3), aProp = new Float32Array(N * 4);
  let rs = 11;
  const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    let x, z;
    do { x = (rnd() - 0.5) * 80; z = ZMAX - rnd() * RANGE; } while (Math.abs(x) < 2.2 && z > -6);
    const near = Math.max(0, 1 - (ZMAX - z) / 40);
    const W = 0.32 + rnd() * 0.22 + near * 0.15;
    const rows = 26 + Math.floor(rnd() * 26);
    aPos[i * 3] = x; aPos[i * 3 + 1] = -1.5 + rnd() * 8 - rows * W * 0.35; aPos[i * 3 + 2] = z;
    aProp[i * 4] = 0.55 + rnd() * 1.1; aProp[i * 4 + 1] = rnd() * 100; aProp[i * 4 + 2] = rows; aProp[i * 4 + 3] = W;
  }
  sGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3));
  sGeo.setAttribute('aProp', new THREE.InstancedBufferAttribute(aProp, 4));
  sGeo.instanceCount = N;
  const rainMat = keep(new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: atlas }, uTime: { value: 0 }, uBright: { value: 1 }, uWhite: { value: 0 }, uHead: { value: 1 },
      uFar: { value: 95 }, uRed: { value: 0 }, uGlitch: { value: 0 }, uWave: { value: -99 }, uWaveK: { value: 0 }, uSideK: { value: 0 },
      uTint: { value: ACC.clone() }, uGlow: { value: GLOW.clone() }, uRedC: { value: RED },
      uFlick: { value: new THREE.Vector2() }, uScan: { value: new THREE.Vector2(-99, 0) },
      uTravel: { value: 0 }, uRange: { value: RANGE }, uZMax: { value: ZMAX },
    },
    vertexShader: STRIP_VS, fragmentShader: STRIP_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  const rain = new THREE.Mesh(sGeo, rainMat);
  rain.frustumCulled = false;
  root.add(rain);
  base.dispose();

  // ── Floor grid (scrolls as we glide; ripples on slams) ──────────
  const floorMat = keep(new THREE.ShaderMaterial({
    uniforms: {
      uTravel: { value: 0 }, uBeat: { value: 0 }, uFlash: { value: 0 }, uTime: { value: 0 }, uRed: { value: 0 }, uLevel: { value: 1 },
      uRipA: { value: new THREE.Vector4(0, 0, 9, 0) }, uRipB: { value: new THREE.Vector4(0, 0, 9, 0) },
      uTint: { value: ACC.clone() }, uRedC: { value: RED }, uSweep: { value: new THREE.Vector2(99, 0) },
    },
    vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS,
  }));
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(160, 160)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6;
  root.add(floor);

  // ── Wireframe city far off ──────────────────────────────────────
  {
    const pos = [];
    const box = new THREE.BoxGeometry(1, 1, 1), edges = new THREE.EdgesGeometry(box), ep = edges.attributes.position.array;
    const NC = low ? 30 : 54;
    for (let i = 0; i < NC; i++) {
      const a = -1.35 + (i / NC) * 2.7 + Math.sin(i * 12.9) * 0.03;
      const r = 95 + (i * 37 % 23);
      const w = 3 + (i * 7 % 5), dd = 3 + (i * 11 % 4), hgt = 8 + (i * 53 % 26);
      const cx = Math.sin(a) * r, cz = -Math.cos(a) * r, y0 = -1.6;
      for (let k = 0; k < ep.length; k += 3) pos.push(cx + ep[k] * w, y0 + (ep[k + 1] + 0.5) * hgt, cz + ep[k + 2] * dd);
      for (let f = 1; f < hgt / 3; f++) { const y = y0 + f * 3; pos.push(cx - w / 2, y, cz + dd / 2, cx + w / 2, y, cz + dd / 2); }
    }
    box.dispose(); edges.dispose();
    const cg = keep(new THREE.BufferGeometry());
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    var cityMat = keep(new THREE.LineBasicMaterial({ color: ACC.clone().multiplyScalar(0.45), transparent: true, opacity: 0.6, fog: false }));
    var city = new THREE.LineSegments(cg, cityMat);
    root.add(city);
  }

  // ── Code motes drifting past the lens ───────────────────────────
  const PN = low ? 120 : 240;
  const pPos = new Float32Array(PN * 3), pSpd = new Float32Array(PN), pVx = new Float32Array(PN), pVy = new Float32Array(PN);
  for (let i = 0; i < PN; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 24; pPos[i * 3 + 1] = -1 + Math.random() * 12; pPos[i * 3 + 2] = -14 + Math.random() * 16;
    pSpd[i] = 0.8 + Math.random() * 2.2;
  }
  const pGeo = keep(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const moteTex = canvasTex(32, 32, (g) => { g.fillStyle = '#fff'; g.fillRect(9, 3, 14, 4); g.fillRect(9, 3, 4, 26); g.fillRect(9, 14, 12, 4); g.fillRect(9, 25, 14, 4); });
  const pMat = keep(new THREE.PointsMaterial({ color: GLOW.clone(), size: 0.16, map: moteTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  const motes = new THREE.Points(pGeo, pMat);
  motes.frustumCulled = false;
  root.add(motes);

  // ── Floor rings (bullet-time shockwaves) ────────────────────────
  const ringGeo = keep(new THREE.TorusGeometry(1, 0.05, 6, 64));
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const m = keep(new THREE.MeshBasicMaterial({ color: GLOW.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const r = new THREE.Mesh(ringGeo, m); r.rotation.x = Math.PI / 2; r.visible = false;
    root.add(r);
    rings.push({ mesh: r, mat: m, life: 0, x: 0, y: 0, z: 0, s: 1 });
  }
  let ringI = 0;
  const ring = (x, y, z, s = 1) => { const r = rings[ringI++ % rings.length]; r.life = 1; r.x = x; r.y = y; r.z = z; r.s = s; r.mesh.visible = true; };

  // ── Banner: ACCESS GRANTED (level up) / SYSTEM FAILURE (game over) ─
  const bannerTex = canvasTex(512, 256, (g, w, h) => {
    const draw = (y, big, small, colr) => {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 54px "DejaVu Sans Mono", monospace'; g.shadowColor = colr; g.shadowBlur = 18;
      g.strokeStyle = colr; g.lineWidth = 5; g.strokeText(big, w / 2, y);
      g.shadowBlur = 6; g.fillStyle = '#ffffff'; g.fillText(big, w / 2, y);
      g.font = '700 20px "DejaVu Sans Mono", monospace'; g.shadowBlur = 0; g.fillStyle = colr; g.fillText(small, w / 2, y + 44);
    };
    draw(52, 'LEVEL UP', `> ${P.title}  ACCESS GRANTED_`, P.glowCss);
    draw(180, 'SYSTEM FAILURE', '> CONNECTION LOST_', '#ff3b4a');
  });
  const bannerMat = keep(new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false, blending: THREE.AdditiveBlending }));
  const bannerGeo = keep(new THREE.PlaneGeometry(4.2, 1.05));
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.renderOrder = 20;
  camera.add(banner);
  const setBanner = (which) => {
    const uv = bannerGeo.attributes.uv;
    const v0 = which ? 0 : 0.5, v1 = which ? 0.5 : 1;
    uv.setXY(0, 0, v1); uv.setXY(1, 1, v1); uv.setXY(2, 0, v0); uv.setXY(3, 1, v0); uv.needsUpdate = true;
  };
  setBanner(0);

  // ── Theme extras ────────────────────────────────────────────────
  const extras = P.extras === 'wonderland' ? wonderland() : balloonsKit();

  function balloonsKit() {
    const gores = canvasTex(256, 128, (g, w, h) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#04130a' : '#0d3d1d'; g.fillRect(i * w / 8, 0, w / 8, h); }
      g.fillStyle = '#39ff7e'; for (let i = 0; i < 8; i++) g.fillRect(i * w / 8, 0, 2, h);
      g.font = 'bold 13px "DejaVu Sans Mono", monospace'; g.fillStyle = '#7dffb0';
      for (let y = 18; y < h; y += 22) for (let i = 0; i < 8; i++) if ((i + y) % 3) g.fillText(((i * 7 + y) % 2) + '' + ((i + y) % 2), i * w / 8 + 8, y);
      g.fillStyle = 'rgba(57,255,126,0.9)'; g.fillRect(0, h * 0.62, w, 3);
    });
    const prof = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, a = -Math.PI / 2 + t * Math.PI;
      const rr = t < 0.25 ? 0.32 + (0.9 - 0.32) * t / 0.25 : Math.cos(a * 0.82) * 1.05 + 0.05;
      prof.push(new THREE.Vector2(Math.max(0.02, rr * (t > 0.9 ? (1 - t) * 10 : 1)), t * 2.4));
    }
    const envGeo = keep(new THREE.LatheGeometry(prof, low ? 10 : 14));
    const envMat = keep(new THREE.MeshBasicMaterial({ map: gores, color: 0x5a7a62, fog: true }));
    const basketGeo = keep(new THREE.BoxGeometry(0.42, 0.32, 0.42));
    const basketMat = keep(new THREE.MeshBasicMaterial({ color: 0x1e150a }));
    const flameGeo = keep(new THREE.ConeGeometry(0.12, 0.45, 8));
    const flameMat = keep(new THREE.MeshBasicMaterial({ color: 0xb6ff5a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const glowMat = keep(new THREE.SpriteMaterial({ map: glowTex, color: 0x7dff6a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
    const ropeGeo = keep(new THREE.BufferGeometry());
    ropeGeo.setAttribute('position', new THREE.Float32BufferAttribute([0.18, 0.16, 0.18, 0.55, 0.85, 0.55, -0.18, 0.16, 0.18, -0.55, 0.85, 0.55, 0.18, 0.16, -0.18, 0.55, 0.85, -0.55, -0.18, 0.16, -0.18, -0.55, 0.85, -0.55], 3));
    const ropeMat = keep(new THREE.LineBasicMaterial({ color: 0x2f6b43 }));
    const list = [];
    const spots = low
      ? [[-9, -20, 1.2], [9, -26, 1.4], [-14, -34, 2.0], [13, -42, 2.2], [-4, -56, 2.4]]
      : [[-9, -20, 1.2], [9, -26, 1.4], [-14, -30, 2.2], [13, -40, 2.6], [-4, -52, 2.4], [20, -26, 2.0], [-22, -44, 2.6], [5, -64, 3.0]];
    spots.forEach(([x, z, s], i) => {
      const b = new THREE.Group();
      const env = new THREE.Mesh(envGeo, envMat); env.position.y = 0.85; b.add(env);
      b.add(new THREE.Mesh(basketGeo, basketMat));
      b.add(new THREE.LineSegments(ropeGeo, ropeMat));
      const fl = new THREE.Mesh(flameGeo, flameMat); fl.position.y = 0.55; b.add(fl);
      const gl = new THREE.Sprite(glowMat); gl.position.y = 1.3; gl.scale.setScalar(2.6); b.add(gl);
      b.scale.setScalar(s);
      root.add(b);
      list.push({ obj: b, flame: fl, glow: gl, x, z, s, y0: -2 + (i * 5.3) % 16, ph: i * 1.7, flare: 0, lift: 0 });
    });
    return {
      update(dt, t, onBeat, st) {
        for (const b of list) {
          b.flare = Math.max(0, b.flare - dt * 1.3);
          b.lift = Math.max(0, b.lift - dt * 0.8);
          b.y0 += dt * (0.35 + 2.2 * b.lift + 0.3 * st.surge) * (st.freeze > 0 ? 0.05 : 1);
          const y = -3 + ((b.y0 % 20) + 20) % 20;
          const zz = -9 - (((-9 - b.z - st.travel * 0.6) % 72) + 72) % 72;
          b.obj.position.set(b.x + Math.sin(t * 0.2 + b.ph) * 0.8 + st.wind * b.s * 0.25, y + Math.sin(t * 0.9 + b.ph) * 0.15, zz);
          b.obj.rotation.y = t * 0.1 + b.ph;
          b.obj.rotation.z = -st.wind * 0.05;
          const f = 0.4 + 0.3 * onBeat + 1.4 * b.flare;
          b.flame.scale.set(0.6 + 0.6 * f, 0.4 + 1.8 * f, 0.6 + 0.6 * f);
          b.glow.material.opacity = 0.25 + 0.5 * Math.min(1, b.flare + 0.2 * onBeat);
          b.glow.scale.setScalar(1.6 + 1.6 * b.flare);
        }
        glowMat.color.copy(st.tint).lerp(col.set(0xffffff), 0.3);
      },
      // burners: flare n balloons (lift them on clears)
      flare(n, lift = 0) { for (let i = 0; i < Math.min(n, list.length); i++) { const b = list[(i * 3 + Math.floor(Math.random() * list.length)) % list.length]; b.flare = 1; b.lift = Math.max(b.lift, lift); } },
      all(k) { for (const b of list) { b.flare = k; b.lift = Math.max(b.lift, k * 0.6); } },
      hop() {}, back() {},
    };
  }

  function wonderland() {
    // Pocket watches + playing cards tumbling through the rain, and the
    // White Rabbit himself bounding across the grid.
    const clockTex = canvasTex(128, 128, (g, w) => {
      const c = w / 2;
      g.fillStyle = '#fff6e8'; g.beginPath(); g.arc(c, c, c - 3, 0, Math.PI * 2); g.fill();
      g.lineWidth = 7; g.strokeStyle = '#c9a23a'; g.stroke();
      g.fillStyle = '#2a0f48';
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(c + Math.cos(a) * 46 - 3, c + Math.sin(a) * 46 - 3, 6, 6); }
      g.strokeStyle = '#2a0f48'; g.lineWidth = 5; g.beginPath(); g.moveTo(c, c); g.lineTo(c, c - 38); g.moveTo(c, c); g.lineTo(c + 26, c + 8); g.stroke();
    });
    const cardTex = canvasTex(128, 192, (g, w, h) => {
      g.fillStyle = '#fffaf2'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#7b3cc4'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#e0287a'; g.font = 'bold 84px "DejaVu Serif", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('♥', w / 2, h / 2); g.font = 'bold 28px "DejaVu Serif", serif'; g.fillText('A', 22, 26);
    });
    const NW = low ? 8 : 14, NK = low ? 10 : 18;
    const watchMat = keep(new THREE.MeshBasicMaterial({ map: clockTex, side: THREE.DoubleSide, color: 0xd8c8e8 }));
    const watches = new THREE.InstancedMesh(keep(new THREE.CircleGeometry(0.5, 20)), watchMat, NW);
    const cardMat = keep(new THREE.MeshBasicMaterial({ map: cardTex, side: THREE.DoubleSide, color: 0xd8c8e8 }));
    const cards = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.62, 0.93)), cardMat, NK);
    watches.frustumCulled = cards.frustumCulled = false;
    root.add(watches, cards);
    const items = [];
    for (let i = 0; i < NW + NK; i++) {
      items.push({ watch: i < NW, x: (Math.random() - 0.5) * 30, y: Math.random() * 14 - 2, z: -4 - Math.random() * 40, sp: 0.4 + Math.random() * 0.6,
        rx: Math.random() * 6, ry: Math.random() * 6, wx: (Math.random() - 0.5) * 2, wy: (Math.random() - 0.5) * 2, vx: 0, spin: 0 });
    }
    // The White Rabbit: glowing silhouette, bounding across on the beat.
    const rabMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    const rabbit = new THREE.Group();
    const body = new THREE.Mesh(keep(new THREE.SphereGeometry(0.5, 14, 10)), rabMat); body.scale.set(1.25, 0.95, 0.85); rabbit.add(body);
    const head = new THREE.Mesh(keep(new THREE.SphereGeometry(0.3, 12, 8)), rabMat); head.position.set(0.55, 0.5, 0); rabbit.add(head);
    const earGeo = keep(new THREE.CapsuleGeometry(0.07, 0.5, 2, 6));
    for (const s of [-1, 1]) { const e = new THREE.Mesh(earGeo, rabMat); e.position.set(0.5, 1.0, s * 0.1); e.rotation.set(s * 0.15, 0, -0.35); rabbit.add(e); }
    const tail = new THREE.Mesh(keep(new THREE.SphereGeometry(0.16, 8, 6)), rabMat); tail.position.set(-0.65, 0.15, 0); rabbit.add(tail);
    const legGeo = keep(new THREE.CapsuleGeometry(0.1, 0.35, 2, 6));
    const legB = new THREE.Mesh(legGeo, rabMat); legB.position.set(-0.3, -0.45, 0); rabbit.add(legB);
    const legF = new THREE.Mesh(legGeo, rabMat); legF.position.set(0.35, -0.4, 0); legF.scale.setScalar(0.7); rabbit.add(legF);
    const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), color: 0xe090ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    halo.scale.setScalar(3.2); rabbit.add(halo);
    rabbit.visible = false;
    root.add(rabbit);
    const R = { on: false, t: 0, dir: 1, speed: 1, z: -11, lastAmbient: 0 };
    const startHop = (dir, speed = 1) => { if (R.on && R.t < 0.6) { R.speed = Math.max(R.speed, speed); return; } R.on = true; R.t = 0; R.dir = dir; R.speed = speed; R.z = -9 - Math.random() * 5; rabbit.visible = true; };
    return {
      update(dt, t, onBeat, st) {
        items.forEach((it, i) => {
          it.vx *= Math.exp(-dt * 2);
          it.spin *= Math.exp(-dt * 1.5);
          const fall = it.sp * (1 + st.surge * 1.5) * (st.freeze > 0 ? 0.04 : 1);
          it.y -= fall * dt; it.x += (it.vx + Math.sin(t * 0.6 + i) * 0.3) * dt;
          if (it.y < -2.5) { it.y += 16; it.x = (Math.random() - 0.5) * 30; }
          if (it.x > 16) it.x -= 32; else if (it.x < -16) it.x += 32;
          const zz = -4 - (((-4 - it.z - st.travel) % 46) + 46) % 46;
          it.rx += (it.wx + it.spin) * dt; it.ry += (it.wy + it.spin * 0.7) * dt;
          dummy.position.set(it.x, it.y, zz); dummy.rotation.set(it.rx, it.ry, 0);
          dummy.scale.setScalar(it.watch ? 1 + 0.15 * onBeat : 1); dummy.updateMatrix();
          if (it.watch) watches.setMatrixAt(i, dummy.matrix); else cards.setMatrixAt(i - NW, dummy.matrix);
        });
        watches.instanceMatrix.needsUpdate = cards.instanceMatrix.needsUpdate = true;
        const k = 0.75 + 0.25 * onBeat;
        watchMat.color.setRGB(0.85 * k, 0.78 * k, 0.92 * k); cardMat.color.copy(watchMat.color);
        // Ambient: the rabbit bounds by every 16 beats.
        if (st.beat - R.lastAmbient > 16) { R.lastAmbient = st.beat; startHop(Math.random() < 0.5 ? 1 : -1, 0.8); }
        if (R.on) {
          R.t += dt * 0.28 * R.speed * (st.freeze > 0 ? 0.08 : 1);
          if (R.t >= 1) { R.on = false; rabbit.visible = false; }
          const span = 13, x = R.dir * (-span + 2 * span * R.t);
          const hopPh = (R.t * 9) % 1, hop = Math.sin(hopPh * Math.PI);
          rabbit.position.set(x, -1.05 + hop * 1.4, R.z);
          rabbit.rotation.set(0, R.dir > 0 ? 0 : Math.PI, (0.5 - hopPh) * 0.6);
          legB.rotation.z = hop * 1.1 - 0.4; legF.rotation.z = -hop * 0.8;
          rabMat.color.copy(st.tint).lerp(col.set(0xffffff), 0.75);
          halo.material.color.copy(st.tint);
        }
      },
      push(dir) { for (const it of items) it.vx += dir * (1.5 + Math.random() * 1.5); },
      spin(dir) { for (const it of items) it.spin += dir * (3 + Math.random() * 3); },
      flare(n) { if (n >= 2) startHop(Math.random() < 0.5 ? 1 : -1, 1 + 0.4 * n); for (const it of items) it.spin += 2 * n; },
      all(k) { startHop(1, 1.6 * k + 0.6); for (const it of items) it.spin += 6 * k; },
      hop(dir, speed) { startHop(dir, speed); },
      back() { if (R.on) { R.dir = -R.dir; R.t = 1 - R.t; R.speed = Math.max(R.speed, 1.6); } else startHop(-1, 1.6); },
    };
  }

  // ── State ───────────────────────────────────────────────────────
  const st = {
    rainT: 0, travel: 0, surge: 0, heat: 0, combo: 0, freeze: 0, bt: 0, white: 0, glitch: 0, red: 0, dead: 0, flash: 0,
    flickSeed: 0, flick: 0, sideK: 0, scanY: -99, scanV: 0, scanK: 0, wave: -99, waveV: 0, waveK: 0, sweep: 99, sweepK: 0,
    head: 0, wind: 0, banner: 0, bannerWhich: 0, level: 1, beat: 0, tint: ACC.clone(),
    camX: 0, camVX: 0, roll: 0, rollV: 0, dip: 0, dipV: 0, shake: 0, fovK: 0, danger: 0,
  };
  const ripA = { x: 0, z: 0, t: 9, k: 0 }, ripB = { x: 0, z: 0, t: 9, k: 0 };
  let ripFlip = 0;
  const ripple = (x, z, k) => { const r = (ripFlip++ % 2) ? ripB : ripA; r.x = x; r.z = z; r.t = 0; r.k = k; };
  const colX = (c) => ((c ?? 4.5) - 4.5) * 0.55;

  function update(dt, info) {
    const { beat, songTime: t } = info;
    st.beat = beat;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6);
    const cheer = info.cheer || 0, move = info.move || 0, flashI = info.flash || 0;
    st.danger += ((info.danger || 0) - st.danger) * Math.min(1, dt * 1.5);
    // Decays.
    const dec = (k, r) => { st[k] = Math.max(0, st[k] - dt * r); };
    dec('surge', 0.9); dec('freeze', 1); dec('white', 2.4); dec('glitch', 1.6); dec('red', 0.5); dec('flash', 2);
    dec('flick', 1.8); dec('scanK', 0.8); dec('waveK', 0.7); dec('sweepK', 1); dec('head', 1.6); dec('banner', 0.6); dec('shake', 2.5);
    dec('fovK', 1.5); st.heat = Math.max(0, st.heat - dt * 0.1);
    if (st.dead > 0 && st.dead < 1) st.dead = Math.max(0, st.dead - dt * 0.05);
    st.sideK *= Math.exp(-dt * 2); st.wind *= Math.exp(-dt * 1.5);
    if (st.bt > 0) st.bt = Math.max(0, st.bt - dt * 0.7);
    st.scanY += st.scanV * dt; st.wave += st.waveV * dt; st.sweep -= dt * 30;
    for (const r of [ripA, ripB]) r.t += dt;
    // Springs.
    const spring = (k, v, hz, damp) => { const w = 2 * Math.PI * hz; st[v] += (-w * w * st[k] - 2 * damp * w * st[v]) * dt; st[k] += st[v] * dt; };
    spring('camX', 'camVX', 1.6, 0.5); spring('roll', 'rollV', 1.4, 0.35); spring('dip', 'dipV', 2.2, 0.45);

    // Rain clock: the old renderer's fallBoost = 1 + cheer*1.6 + flash*0.6.
    const fallBoost = (1 + cheer * 1.6 + flashI * 0.6 + st.surge * 1.4 + st.heat * 0.12) * (1 - 0.8 * Math.min(1, st.dead));
    const frozen = st.freeze > 0 ? 0.03 : 1;
    st.rainT += dt * 0.9 * fallBoost * frozen;
    st.travel += dt * (1.6 + 2.5 * st.surge + 0.4 * st.heat) * frozen * (1 - 0.9 * Math.min(1, st.dead));

    // Colours: hotter with combos, red with danger / a crash.
    const redK = Math.min(1, Math.max(st.red, Math.max(0, st.danger - 0.55) * 1.6 * (0.75 + 0.25 * Math.sin(t * 6))));
    st.tint.copy(ACC).lerp(GLOW, Math.min(0.8, st.heat * 0.18));
    const ru = rainMat.uniforms;
    ru.uTime.value = st.rainT; ru.uTravel.value = st.travel;
    ru.uTint.value.copy(st.tint); ru.uRed.value = redK;
    ru.uBright.value = (P.bright || 1) * (0.8 + 0.25 * onBeat + 0.5 * st.flash + 0.3 * flashI) * (1 - 0.5 * Math.min(1, st.dead));
    ru.uHead.value = 0.85 + 0.45 * onBeat + 1.2 * st.head + 0.8 * flashI;
    // The old renderer pinged random columns proportional to movePulse.
    ru.uFlick.value.set(st.flickSeed, Math.min(0.7, st.flick + move * 0.25));
    ru.uSideK.value = st.sideK;
    ru.uScan.value.set(st.scanY, st.scanK);
    ru.uWave.value = st.wave; ru.uWaveK.value = st.waveK;
    ru.uWhite.value = Math.min(1, st.white);
    ru.uGlitch.value = Math.min(1, st.glitch);
    rain.position.x = st.glitch > 0 ? (Math.random() - 0.5) * 0.5 * st.glitch : 0;

    const fu = floorMat.uniforms;
    fu.uTravel.value = st.travel; fu.uBeat.value = onBeat; fu.uFlash.value = st.flash + 0.5 * flashI; fu.uRed.value = redK;
    fu.uTint.value.copy(st.tint); fu.uLevel.value = 1 - 0.7 * Math.min(1, st.dead);
    fu.uRipA.value.set(ripA.x, ripA.z, ripA.t, ripA.k); fu.uRipB.value.set(ripB.x, ripB.z, ripB.t, ripB.k);
    fu.uSweep.value.set(st.sweep, st.sweepK);
    skyMat.uniforms.uPulse.value = 0.35 * onBeat + st.flash + 0.4 * cheer;
    skyMat.uniforms.uRed.value = redK;
    cityMat.color.copy(st.tint).lerp(RED, redK).multiplyScalar(0.12 + 0.08 * onBeat + 0.3 * st.flash);

    // Motes: fall with the rain, blown sideways by moves.
    const pv = fallBoost * frozen, vd = Math.exp(-dt * 2.2);
    for (let i = 0; i < PN; i++) {
      const j = i * 3;
      pPos[j + 1] -= (pSpd[i] * pv - pVy[i]) * dt;
      if (pVx[i] !== 0 || pVy[i] !== 0) {
        pPos[j] += pVx[i] * dt; pVx[i] *= vd; pVy[i] *= vd;
        if (Math.abs(pVx[i]) + Math.abs(pVy[i]) < 0.02) { pVx[i] = 0; pVy[i] = 0; }
      }
      if (pPos[j + 1] < -1.6) pPos[j + 1] += 13; else if (pPos[j + 1] > 11.5) pPos[j + 1] -= 13;
      if (pPos[j] > 12) pPos[j] -= 24; else if (pPos[j] < -12) pPos[j] += 24;
    }
    pGeo.attributes.position.needsUpdate = true;
    pMat.color.copy(st.tint).lerp(RED, redK).lerp(col.set(0xffffff), 0.3 + 0.4 * st.white);
    pMat.opacity = 0.5 + 0.4 * onBeat;

    // Rings.
    for (const r of rings) {
      if (r.life <= 0) continue;
      r.life -= dt * 0.8 * (st.freeze > 0 ? 0.2 : 1);
      const u = 1 - r.life, s = (0.5 + u * 9) * r.s;
      r.mesh.position.set(r.x, r.y + u * 0.4, r.z); r.mesh.scale.set(s, s, s);
      r.mat.opacity = Math.max(0, r.life) * 0.9;
      r.mat.color.copy(st.tint).lerp(col.set(0xffffff), 0.5);
      if (r.life <= 0) r.mesh.visible = false;
    }

    extras.update(dt, t, onBeat, st);

    // ── Camera: a slow glide through the rain ──
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    const bt = st.bt > 0 ? Math.sin(Math.min(1, st.bt) * Math.PI) : 0;    // bullet-time orbit
    const yaw = Math.sin(t * 0.07) * 0.12 + bt * 0.35 + st.camX * 0.05;
    const sh = st.shake;
    const R = 9;
    const cx = Math.sin(yaw) * R + st.camX * 0.5 + (Math.random() - 0.5) * sh * 0.4;
    const cy = (portrait ? 2.6 : 2.2) + Math.sin(t * 0.11) * 0.3 + st.dip + (Math.random() - 0.5) * sh * 0.3 - 0.04 * onBeat;
    camera.position.set(cx, cy, -9 + Math.cos(yaw) * R);
    camera.lookAt(st.camX * 0.3, (portrait ? 3.4 : 2.9) + st.dip * 0.4, -9);
    camera.rotateZ(Math.sin(t * 0.13) * 0.015 + st.roll);
    const fov = (portrait ? 64 : 56) - 6 * st.fovK + 4 * Math.min(1, st.surge);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sky.position.copy(camera.position);
    floor.position.x = camera.position.x; floor.position.z = camera.position.z - 40;
    // Banner sits at the top of the frame, above the board.
    if (st.banner > 0) {
      const tanH = Math.tan(camera.fov * Math.PI / 360), d = 6;
      const w = Math.min(2 * d * tanH * aspect * 0.9, 4.2 * 1.4);
      banner.scale.setScalar(w / 4.2 * (1 + 0.04 * Math.sin(t * 40) * Math.min(1, st.banner)));
      banner.position.set(0, d * tanH * (portrait ? 0.78 : 0.72), -d);
      bannerMat.opacity = Math.min(1, st.banner * 1.5) * (st.bannerWhich ? 1 : (0.75 + 0.25 * Math.sin(t * 18)));
      banner.visible = true;
    } else banner.visible = false;
  }

  function react(kind, data = {}) {
    switch (kind) {
      case 'move': {
        const dir = data.dir || 0;
        st.flickSeed = Math.random() * 100; st.flick = Math.min(0.5, st.flick + 0.28); st.sideK = dir;
        st.camVX += dir * 1.6; st.wind += dir;
        for (let i = 0; i < PN; i += 2) pVx[i] += dir * (1.5 + (i % 5) * 0.6);
        if (extras.push) extras.push(dir);
        break;
      }
      case 'rotate': {
        const dir = data.dir || 1;
        st.scanY = dir > 0 ? -3 : 14; st.scanV = dir > 0 ? 22 : -22; st.scanK = 1;
        st.rollV += dir * 0.35; st.flickSeed = Math.random() * 100; st.flick = Math.min(0.5, st.flick + 0.12);
        if (extras.spin) extras.spin(dir);
        break;
      }
      case 'soft':
        st.surge = Math.min(1.2, st.surge + 0.18); st.dipV -= 0.5; st.sweep = camera.position.z - 2; st.sweepK = 0.5;
        break;
      case 'drop': {
        const r = data.rows || 0, k = Math.min(1, 0.3 + r / 14);
        ripple(colX(data.col), camera.position.z - 11, 0.6 + 0.9 * k);
        st.head = Math.max(st.head, 0.6 + k); st.flash = Math.max(st.flash, 0.4 * k); st.surge = Math.min(1.6, st.surge + 0.5 * k);
        st.shake = Math.max(st.shake, k); st.dipV -= 1.5 * k; st.fovK = Math.max(st.fovK, 0.5 * k);
        st.flickSeed = Math.random() * 100; st.flick = Math.min(0.7, 0.2 + 0.5 * k);
        for (let i = 1; i < PN; i += 2) { pVx[i] += (Math.random() - 0.5) * 8 * k; pVy[i] += Math.random() * 6 * k; }
        if (r >= 10) ring(colX(data.col), -1.5, camera.position.z - 11, 0.8);
        break;
      }
      case 'hold':
        st.white = 1; st.glitch = Math.max(st.glitch, 0.45);
        if (extras.back) extras.back();
        break;
      case 'clear': {
        const n = Math.max(1, data.lines || 1), combo = data.combo || 0;
        st.combo = combo;
        st.heat = Math.min(5, st.heat + 0.35 * n + 0.3 * combo);
        st.surge = Math.min(2, st.surge + 0.4 + 0.25 * n);
        st.head = Math.max(st.head, 0.5 + 0.3 * n); st.flash = Math.max(st.flash, 0.2 + 0.15 * n);
        st.scanY = -3; st.scanV = 14 + 6 * n; st.scanK = 0.7 + 0.25 * n;
        if (n >= 2) { const d = Math.random() < 0.5 ? 1 : -1; st.wave = -d * 40; st.waveV = d * (50 + 15 * n); st.waveK = 0.6 + 0.2 * n; }
        extras.flare(n + combo, 0.3 * n);
        const z = camera.position.z - 11;
        if (n >= 4) {
          // Bullet time: freeze the rain, orbit, then let it rush.
          st.freeze = 0.7; st.bt = 1; st.white = 0.6; st.surge = 2.2; st.fovK = 1;
          ring(0, -1.5, z, 1.2); ring(-6, 2, z - 6, 0.6); ring(6, 2, z - 6, 0.6);
          extras.all(1);
        } else if (n === 3) ring(0, -1.5, z, 1);
        for (let c = 0; c < Math.min(3, combo - 1); c++) ring((c - 1) * 6, 0.5 + c * 2, z - 4, 0.5 + 0.15 * c);
        break;
      }
      case 'combo':
        st.combo = data.n || 0;
        break;
      case 'levelUp':
        st.level = data.level || st.level + 1;
        st.banner = 2.2; st.bannerWhich = 0; setBanner(0); st.head = 1.5; st.flash = 0.8; st.surge = 1.5;
        st.flickSeed = Math.random() * 100; st.flick = 0.7;
        st.scanY = -3; st.scanV = 10; st.scanK = 1.4;
        ring(0, -1.5, camera.position.z - 11, 1.4);
        extras.all(1.2);
        break;
      case 'gameOver':
        st.red = 6; st.glitch = 2; st.dead = 3; st.banner = 4; st.bannerWhich = 1; setBanner(1);
        break;
      case 'start':
        st.dead = 0; st.red = 0; st.heat = 0; st.combo = 0; st.banner = 0; st.surge = 1.2; st.flash = 0.8;
        st.scanY = -3; st.scanV = 12; st.scanK = 1.2; st.head = 1;
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root); camera.remove(banner);
      scene.fog = prevFog; scene.background = prevBg;
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
  };
}
