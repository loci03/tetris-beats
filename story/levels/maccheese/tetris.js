// MAC & CHEESE — the living Tetris world: inside the world's biggest pot.
//
// The old 2D background hung thick molten-cheese ribbons from the top of
// the screen (stretching longer on clears, swaying on piece moves) over a
// warm brown glow, with cheese bubbles drifting up (glinting on the kick,
// swelling on clears). Here you're skimming over a bubbling lake of cheese
// sauce inside a colossal pot: the lid hangs overhead dripping cheese
// ribbons that stretch, sway and let go of fat drops that plop into the
// lake; elbow macaroni bob on the swell; bubbles boil on the surface and
// cream-coloured bubbles float up through the steam; a giant wooden spoon
// stirs in the distance.
//
// Reactions:
//   move     → every drip swings that way (each with its own lag), the
//              lake sloshes and the macaroni slide over
//   rotate   → the spoon whips round and the lake swirls (macaroni orbit)
//   soft     → drips stretch, the boil picks up
//   drop     → a glob of cheese slams into the lake at the piece's column:
//              splash crown + ripples + macaroni hop, scaled by rows
//   hold     → a big cheese bubble swells up out of the lake and pops
//   clear    → drips stretch long and let go (n of them), bubbles swell
//              and rise faster, macaroni jump; TETRIS = a cheese geyser
//              erupts, flinging macaroni and cheese everywhere
//   combo    → the pot runs hotter: rolling boil, steam, orange glow
//   levelUp  → it rains macaroni from the lid and every drip lets go
//   danger   → the pot boils over: violent boil, steam, scorched glow
//   gameOver → the cheese cools and goes dull, the bubbles stop
//   start    → a big plop to kick things off

const LAKE_VS = `
uniform float uT, uSlosh, uSwirl;
uniform vec4 uRip[6];
uniform vec3 uVort;
varying vec3 vW;
float lakeH(vec2 p){
  float h = 0.14 * sin(0.33 * p.x + 0.8 * uT + uSlosh) + 0.1 * sin(0.45 * p.y - 1.0 * uT + 0.25 * p.x) + 0.05 * sin(1.1 * p.x + 1.3 * p.y + 1.7 * uT);
  for (int i = 0; i < 6; i++) {
    vec4 r = uRip[i];
    float d = length(p - r.xy), rr = r.z * 5.0;
    h += r.w * exp(-1.2 * r.z) * exp(-pow(d - rr, 2.0) * 0.8) * cos((d - rr) * 3.0);
  }
  float dv = length(p - uVort.xy);
  h -= uVort.z * 0.6 * exp(-dv * dv / 30.0);
  return h;
}
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  w.y += lakeH(w.xz);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const LAKE_FS = `
uniform float uT, uBoil, uHeat, uCool, uFlash, uBeat;
uniform vec3 uFogC, uVort;
uniform float uFogN, uFogF;
varying vec3 vW;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  if (n.y < 0.0) n = -n;
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(vec3(0.3, 0.85, 0.45));
  vec3 base = mix(vec3(0.9, 0.5, 0.06), vec3(0.95, 0.32, 0.03), uHeat * 0.6);
  base = mix(base, vec3(0.36, 0.28, 0.18), uCool);
  // Boiling: cells of bubbles that swell and pop.
  vec2 dv = vW.xz - uVort.xy;
  float ang = uVort.z * 0.8 * exp(-dot(dv, dv) / 60.0);
  vec2 q = uVort.xy + mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * dv;
  vec2 p = q * 0.55;
  vec2 cell = floor(p), f = fract(p) - 0.5;
  float hh = hash(cell);
  float ph = fract(uT * (0.25 + 0.5 * hh) + hh * 7.0);
  float on = step(hash(cell + 3.1), uBoil);
  vec2 off = (vec2(hash(cell + 1.7), hash(cell + 9.2)) - 0.5) * 0.4;
  float r = 0.08 + 0.3 * ph, dd = length(f - off);
  float bub = on * smoothstep(r, r - 0.06, dd) * (1.0 - smoothstep(0.85, 1.0, ph));
  float rim = on * smoothstep(0.05, 0.0, abs(dd - r)) * (1.0 - smoothstep(0.85, 1.0, ph));
  float pop = on * step(0.86, ph) * smoothstep(0.5, 0.0, abs(dd - (ph - 0.86) * 4.0)) * (1.0 - ph) * 8.0;
  vec3 c = base * (0.4 + 0.5 * max(dot(n, L), 0.0));
  c += base * 0.07 * bub + vec3(1.0, 0.75, 0.35) * (rim * 0.14 + pop * 0.2);
  // Glossy sauce: warm specular + fresnel glow of the pot's light.
  vec3 Hh = normalize(L + V);
  c += vec3(1.0, 0.9, 0.65) * pow(max(dot(n, Hh), 0.0), 80.0) * (0.8 - 0.6 * uCool);
  float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  c += vec3(1.0, 0.5, 0.1) * fr * (0.25 + 0.3 * uHeat) * (1.0 - 0.7 * uCool);
  c *= 1.0 + 0.35 * uFlash + 0.06 * uBeat;
  c += vec3(0.6, 0.12, 0.0) * uHeat * 0.12;
  float fd = smoothstep(uFogN, uFogF, length(vW - cameraPosition));
  gl_FragColor = vec4(mix(c, uFogC, fd), 1.0);
}`;

export function createTetrisWorld(ctx) {
  const { THREE, scene, camera } = ctx;
  const low = !!ctx.low;
  const root = new THREE.Group();
  scene.add(root);
  const prevFog = scene.fog, prevBg = scene.background;
  const FOG = new THREE.Color(0x2e1402);
  scene.fog = new THREE.Fog(FOG, 26, 95);
  scene.background = FOG.clone();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t);
  };
  const LID = 10.5;

  // ── Lights: warm hemi + key + the pot's glow ─────────────────────
  const hemi = new THREE.HemisphereLight(0xffe2a8, 0x6a3008, 1.1);
  const key = new THREE.DirectionalLight(0xfff0d0, 1.5); key.position.set(3, 8, 6);
  const glow = new THREE.PointLight(0xff8a20, 30, 40, 1.4); glow.position.set(0, 2.5, -10);
  root.add(hemi, key, glow);

  // ── Sky / kitchen dark beyond the rim ───────────────────────────
  const skyMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uPulse: { value: 0 }, uHeat: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse, uHeat;
      void main(){ float h = vP.y;
        vec3 c = mix(vec3(0.36, 0.17, 0.03), vec3(0.08, 0.035, 0.005), smoothstep(-0.05, 0.45, h));
        c += vec3(0.5, 0.22, 0.02) * (0.3 * uPulse + 0.4 * uHeat) * smoothstep(0.35, 0.0, abs(h - 0.03));
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(140, 20, 10)), skyMat);
  sky.renderOrder = -10;
  root.add(sky);

  // ── The pot wall (curving round the far side of the lake) ───────
  const wallMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uGlow: { value: 0 } }]),
    vertexShader: `varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vW; uniform float uGlow;
      #include <fog_pars_fragment>
      void main(){
        float band = 0.5 + 0.5 * sin(vUv.x * 60.0);
        vec3 steel = mix(vec3(0.16, 0.08, 0.04), vec3(0.45, 0.22, 0.1), pow(band, 6.0) * 0.6 + 0.2);
        float crust = smoothstep(1.6, 0.2, vW.y) * (0.7 + 0.3 * sin(vUv.x * 230.0 + vW.y * 4.0));
        vec3 c = mix(steel, vec3(0.8, 0.42, 0.06), crust);
        c += vec3(0.6, 0.25, 0.03) * uGlow * smoothstep(5.0, 0.0, vW.y);
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
      }`,
  }));
  wallMat.fog = true;
  const wall = new THREE.Mesh(keep(new THREE.CylinderGeometry(52, 52, 14, 48, 1, true)), wallMat);
  wall.position.set(0, 5.5, -14);
  root.add(wall);

  // ── The lid overhead (cheese-crusted underside) ─────────────────
  const lidTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a2a10'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(${230 + (i % 3) * 8},${150 + (i % 5) * 12},${30 + (i % 4) * 10},${0.25 + (i % 4) * 0.12})`;
      g.beginPath(); g.ellipse((i * 73) % w, (i * 151) % h, 10 + (i % 6) * 6, 6 + (i % 5) * 5, i, 0, Math.PI * 2); g.fill();
    }
  });
  lidTex.wrapS = lidTex.wrapT = THREE.RepeatWrapping; lidTex.repeat.set(6, 5);
  const lidMat = keep(new THREE.MeshLambertMaterial({ map: lidTex, color: 0xffffff, emissive: 0x2a1000, side: THREE.DoubleSide }));
  const lid = new THREE.Mesh(keep(new THREE.PlaneGeometry(110, 80)), lidMat);
  lid.rotation.x = Math.PI / 2; lid.position.set(0, LID, -24);
  root.add(lid);

  // ── The lake of cheese ──────────────────────────────────────────
  const rip = []; for (let i = 0; i < 6; i++) rip.push(new THREE.Vector4(0, 0, 9, 0));
  const lakeMat = keep(new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 }, uSlosh: { value: 0 }, uSwirl: { value: 0 }, uRip: { value: rip }, uVort: { value: new THREE.Vector3(0, -14, 0) },
      uBoil: { value: 0.25 }, uHeat: { value: 0 }, uCool: { value: 0 }, uFlash: { value: 0 }, uBeat: { value: 0 },
      uFogC: { value: FOG.clone().convertLinearToSRGB() }, uFogN: { value: 26 }, uFogF: { value: 95 },
    },
    vertexShader: LAKE_VS, fragmentShader: LAKE_FS,
  }));
  const lakeGeo = keep(new THREE.PlaneGeometry(100, 64, low ? 70 : 120, low ? 46 : 80));
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, lakeMat);
  lake.position.set(0, 0, -18);
  lake.frustumCulled = false;
  root.add(lake);
  let ripI = 0;
  const ripples = rip.map(() => ({ x: 0, z: 0, t: 9, a: 0 }));
  const ripple = (x, z, a) => { const r = ripples[ripI++ % 6]; r.x = x; r.z = z; r.t = 0; r.a = a; };
  const st = {
    t: 0, slosh: 0, sloshV: 0, vort: 0, vortV: 0, vx: 0, vz: -14, boil: 0.25, heat: 0, cool: 0, flash: 0, stretch: 0, bubbleK: 0,
    shake: 0, camVX: 0, camX: 0, roll: 0, rollV: 0, dip: 0, dipV: 0, spoonA: 0, spoonV: 0.6, danger: 0, combo: 0, geyser: 0, dead: false,
  };
  // CPU twin of the lake height (macaroni ride the swell).
  const lakeH = (x, z) => {
    const t = st.t;
    let h = 0.14 * Math.sin(0.33 * x + 0.8 * t + st.slosh) + 0.1 * Math.sin(0.45 * z - 1.0 * t + 0.25 * x) + 0.05 * Math.sin(1.1 * x + 1.3 * z + 1.7 * t);
    for (const r of ripples) {
      if (r.t > 4 || r.a === 0) continue;
      const d = Math.hypot(x - r.x, z - r.z), rr = r.t * 5;
      h += r.a * Math.exp(-1.2 * r.t) * Math.exp(-(d - rr) * (d - rr) * 0.8) * Math.cos((d - rr) * 3);
    }
    const dv2 = (x - st.vx) ** 2 + (z - st.vz) ** 2;
    return h - st.vort * 0.6 * Math.exp(-dv2 / 30);
  };

  // ── Shared materials ────────────────────────────────────────────
  const cheeseMat = keep(new THREE.MeshPhongMaterial({ color: 0xf6b232, emissive: 0x5a2600, specular: 0xfff0c0, shininess: 70 }));
  const macMat = keep(new THREE.MeshPhongMaterial({ color: 0xffd25a, emissive: 0x3a1c00, specular: 0xfff4d0, shininess: 40 }));

  // ── Drips hanging from the lid ──────────────────────────────────
  const prof = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(Math.max(0.02, 0.62 + 0.38 * Math.pow(1 - t, 3) - 0.12 * t), -t)); }
  prof.reverse();
  const dripGeo = keep(new THREE.LatheGeometry(prof, 10));
  const blobGeo = keep(new THREE.SphereGeometry(1, 12, 8));
  const ND = low ? 14 : 22;
  const drips = [];
  for (let i = 0; i < ND; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (1.5 + ((i * 7.3) % 22)), z = -5 - ((i * 13.7) % 34);
    drips.push({ x, z, w: 0.45 + ((i * 3.1) % 1) * 0.45, base: 1.4 + ((i * 5.7) % 4.2), ph: i * 2.1, sway: 0, swayV: 0,
      swayDir: Math.sin(i * 2.1 * 3.7) >= 0 ? 1 : -1, grow: 1, lag: 0.7 + ((i * 0.37) % 0.6), len: 1 });
  }
  const dripMesh = new THREE.InstancedMesh(dripGeo, cheeseMat, ND);
  const blobMesh = new THREE.InstancedMesh(blobGeo, cheeseMat, ND);
  dripMesh.frustumCulled = blobMesh.frustumCulled = false;
  root.add(dripMesh, blobMesh);

  // ── Falling globs (drips letting go, slams) ─────────────────────
  const NG = 18;
  const globs = []; for (let i = 0; i < NG; i++) globs.push({ on: false, x: 0, y: 0, z: 0, vy: 0, s: 0.3, k: 0.3 });
  const globMesh = new THREE.InstancedMesh(blobGeo, cheeseMat, NG);
  globMesh.frustumCulled = false; root.add(globMesh);
  const dropGlob = (x, y, z, s, vy, k) => { const g = globs.find(q => !q.on) || globs[0]; Object.assign(g, { on: true, x, y, z, s, vy, k }); };

  // ── Splash droplets ─────────────────────────────────────────────
  const NS = low ? 110 : 200;
  const drops = []; for (let i = 0; i < NS; i++) drops.push({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1 });
  const dropMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 6, 4)), cheeseMat, NS);
  dropMesh.frustumCulled = false; root.add(dropMesh);
  let dropI = 0;
  const spray = (x, y, z, n, speed, up, size = 0.12) => {
    for (let i = 0; i < n; i++) {
      const d = drops[dropI++ % NS], a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.8);
      Object.assign(d, { life: 1, x, y, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp * 0.6, vy: up * (0.6 + Math.random() * 0.7), s: size * (0.6 + Math.random() * 0.9) });
    }
  };
  const splash = (x, z, k) => {
    ripple(x, z, 0.25 + 0.6 * k);
    spray(x, lakeH(x, z), z, Math.round(10 + 34 * k), 1.5 + 4 * k, 3 + 6 * k, 0.1 + 0.08 * k);
    for (const m of floats) {
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < 4 + 6 * k) { m.jv = Math.max(m.jv, (2 + 5 * k) * (1 - d / (4 + 6 * k)) + 0.5); m.spin += (Math.random() - 0.5) * 10 * k; }
    }
  };

  // ── Macaroni: floating on the lake + flying (geyser / rain) ─────
  const macGeo = keep(new THREE.TorusGeometry(0.3, 0.12, 6, 9, Math.PI * 0.85));
  const NF = low ? 26 : 44, NFly = low ? 50 : 90;
  const floats = [];
  for (let i = 0; i < NF; i++) floats.push({ x: (Math.random() - 0.5) * 40, z: -4 - Math.random() * 30, vx: 0, vz: 0, rot: Math.random() * 6, spin: 0, ph: Math.random() * 6, j: 0, jv: 0, tilt: Math.random() * 6 });
  const flyers = []; for (let i = 0; i < NFly; i++) flyers.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0 });
  const macMesh = new THREE.InstancedMesh(macGeo, macMat, NF + NFly);
  macMesh.frustumCulled = false; root.add(macMesh);
  let flyI = 0;
  const fling = (x, y, z, vx, vy, vz) => {
    const f = flyers[flyI++ % NFly];
    Object.assign(f, { on: true, x, y, z, vx, vy, vz, rx: Math.random() * 6, ry: Math.random() * 6, rz: 0, wx: (Math.random() - 0.5) * 12, wy: (Math.random() - 0.5) * 12, wz: (Math.random() - 0.5) * 8 });
  };

  // ── Rising cheese bubbles (the old scene's bubbles, in 3D) ──────
  const NB = low ? 16 : 28;
  const bubbles = [];
  for (let i = 0; i < NB; i++) bubbles.push({ x: (Math.random() - 0.5) * 36, y: Math.random() * LID, z: -3 - Math.random() * 26, r: 0.15 + Math.random() * 0.4, sp: 0.4 + Math.random() * 0.9, ph: Math.random() * 6 });
  const bubMat = keep(new THREE.MeshPhongMaterial({ color: 0xffe196, emissive: 0xb06a18, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.55, depthWrite: false }));
  const bubMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 14, 10)), bubMat, NB + 1);
  bubMesh.frustumCulled = false; root.add(bubMesh);
  const gloop = { on: false, t: 0, x: 0, z: 0, side: 1 };   // the hold bubble (last instance)

  // ── Steam wisps ─────────────────────────────────────────────────
  const NSt = low ? 40 : 70;
  const sPos = new Float32Array(NSt * 3), sSp = new Float32Array(NSt);
  for (let i = 0; i < NSt; i++) { sPos[i * 3] = (Math.random() - 0.5) * 50; sPos[i * 3 + 1] = Math.random() * 8; sPos[i * 3 + 2] = -4 - Math.random() * 34; sSp[i] = 0.4 + Math.random() * 0.8; }
  const sGeo = keep(new THREE.BufferGeometry()); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const puffTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,215,0.5)'); gr.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const sMat = keep(new THREE.PointsMaterial({ map: puffTex, size: 3.2, transparent: true, opacity: 0.25, depthWrite: false, color: 0xffe8c8 }));
  const steam = new THREE.Points(sGeo, sMat); steam.frustumCulled = false; root.add(steam);

  // ── The giant wooden spoon stirring far off ─────────────────────
  const woodMat = keep(new THREE.MeshPhongMaterial({ color: 0x9a6232, emissive: 0x24140a, shininess: 20 }));
  const spoon = new THREE.Group();
  const handle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.45, 0.6, 22, 10)), woodMat); handle.position.y = 11; spoon.add(handle);
  const bowl = new THREE.Mesh(keep(new THREE.SphereGeometry(2.2, 14, 8)), woodMat); bowl.scale.set(1, 0.35, 1.5); spoon.add(bowl);
  root.add(spoon);
  const SP = { x: 13, z: -30 };

  // ── Geyser column (Tetris) ──────────────────────────────────────
  const geyser = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.9, 1.5, 1, 14, 1, true)), cheeseMat);
  const crown = new THREE.Mesh(blobGeo, cheeseMat); crown.visible = false; root.add(crown);
  const GZ = { x: 9, z: -14 };
  geyser.position.set(GZ.x, 0, GZ.z); geyser.visible = false; root.add(geyser);

  // ── Update ──────────────────────────────────────────────────────
  const G = 18;
  function update(dt, info) {
    const { beat, songTime: t } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), onKick = Math.exp(-((((beat % 4) + 4) % 4)) * 4);
    const cheer = info.cheer || 0, move = info.move || 0, flashI = info.flash || 0;
    st.t = t;
    st.danger += ((info.danger || 0) - st.danger) * Math.min(1, dt * 1.5);
    const dec = (k, r) => { st[k] = Math.max(0, st[k] - dt * r); };
    dec('flash', 2); dec('stretch', 0.8); dec('bubbleK', 0.6); dec('shake', 2.5); dec('geyser', 0.9);
    st.heat = Math.max(0, st.heat - dt * 0.08);
    const spring = (k, v, hz, damp) => { const w = 2 * Math.PI * hz; st[v] += (-w * w * st[k] - 2 * damp * w * st[v]) * dt; st[k] += st[v] * dt; };
    spring('slosh', 'sloshV', 0.5, 0.25); st.geyserMax = st.geyserMax || 1; spring('camX', 'camVX', 1.5, 0.5); spring('roll', 'rollV', 1.3, 0.35); spring('dip', 'dipV', 2, 0.45);
    st.vortV += -st.vort * 2 * dt - st.vortV * 1.2 * dt; st.vort += st.vortV * dt;
    const coolT = st.dead ? 1 : 0; st.cool += (coolT - st.cool) * Math.min(1, dt * 0.8);
    const heatK = Math.min(1, st.heat * 0.25 + Math.max(0, st.danger - 0.5) * 1.6);
    st.boil = (0.22 + 0.5 * heatK + 0.25 * cheer + 0.2 * st.bubbleK) * (1 - st.cool);
    for (const r of ripples) r.t += dt;
    ripples.forEach((r, i) => rip[i].set(r.x, r.z, r.t, r.t > 4 ? 0 : r.a));

    const lu = lakeMat.uniforms;
    lu.uT.value = t; lu.uSlosh.value = st.slosh; lu.uVort.value.set(st.vx, st.vz, st.vort);
    lu.uBoil.value = st.boil; lu.uHeat.value = heatK; lu.uCool.value = st.cool; lu.uFlash.value = st.flash + 0.5 * flashI; lu.uBeat.value = onBeat;
    skyMat.uniforms.uPulse.value = onBeat + st.flash; skyMat.uniforms.uHeat.value = heatK;
    wallMat.uniforms.uGlow.value = 0.3 * onBeat + st.flash + heatK * 0.6;
    glow.intensity = (24 + 10 * onBeat + 40 * st.flash + 25 * heatK) * (1 - 0.7 * st.cool);
    glow.color.setRGB(1, 0.54 - 0.2 * heatK, 0.12);
    cheeseMat.color.setRGB(0.96, 0.7 - 0.08 * heatK, 0.2).lerp(col.setRGB(0.5, 0.38, 0.25), st.cool);
    cheeseMat.emissive.setRGB(0.35 + 0.25 * heatK, 0.15, 0.0).multiplyScalar(1 - 0.7 * st.cool);
    hemi.intensity = 1.1 * (1 - 0.35 * st.cool);

    // Drips: breathe, stretch with clears (old: len = base + breathe + cheer*80px),
    // swing on moves, regrow after letting go.
    drips.forEach((d, i) => {
      d.swayV += (-d.sway * 9 - d.swayV * 1.6) * dt; d.sway += d.swayV * dt;
      d.grow = Math.min(1, d.grow + dt * 0.55);
      const breathe = Math.sin(t / 1.8 + d.ph) * 0.15;
      d.len = Math.max(0.25, (d.base + breathe + cheer * 1.6 + st.stretch * 1.4 + Math.max(0, st.danger - 0.6) * 2) * d.grow * (1 - 0.25 * st.cool));
      const sw = d.sway + Math.sin(t / 2.2 + d.ph) * 0.03 + d.swayDir * move * 0.05;
      dummy.position.set(d.x, LID, d.z); dummy.rotation.set(Math.sin(t * 0.7 + d.ph) * 0.03, 0, sw);
      dummy.scale.set(d.w, d.len, d.w); dummy.updateMatrix(); dripMesh.setMatrixAt(i, dummy.matrix);
      const bw = d.w * 0.68 * (0.7 + 0.3 * d.grow) * (1 + 0.1 * onKick);
      dummy.position.set(d.x + Math.sin(sw) * d.len, LID - Math.cos(sw) * d.len - bw * 0.3, d.z);
      dummy.rotation.set(0, 0, 0); dummy.scale.set(bw, bw * (1.1 + 0.2 * Math.min(1, st.stretch)), bw); dummy.updateMatrix(); blobMesh.setMatrixAt(i, dummy.matrix);
      // Long enough? It lets go on its own now and then.
      if (d.grow >= 1 && d.len > d.base + 1.2 && Math.random() < dt * 0.8) release(d, sw);
    });
    dripMesh.instanceMatrix.needsUpdate = blobMesh.instanceMatrix.needsUpdate = true;

    // Globs fall and splash.
    let ng = 0;
    for (const g of globs) {
      if (!g.on) continue;
      g.vy -= G * dt; g.y += g.vy * dt;
      const surf = lakeH(g.x, g.z);
      if (g.y < surf) { g.on = false; splash(g.x, g.z, g.k); continue; }
      dummy.position.set(g.x, g.y, g.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(g.s, g.s * (1 + Math.min(0.8, -g.vy * 0.04)), g.s); dummy.updateMatrix();
      globMesh.setMatrixAt(ng++, dummy.matrix);
    }
    globMesh.count = ng; globMesh.instanceMatrix.needsUpdate = true;

    // Droplets.
    let nd = 0;
    for (const d of drops) {
      if (d.life <= 0) continue;
      d.vy -= G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.life -= dt * 0.6;
      if (d.y < -0.3 || d.life <= 0) { d.life = 0; continue; }
      dummy.position.set(d.x, d.y, d.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(d.s); dummy.updateMatrix();
      dropMesh.setMatrixAt(nd++, dummy.matrix);
    }
    dropMesh.count = nd; dropMesh.instanceMatrix.needsUpdate = true;

    // Macaroni.
    floats.forEach((m, i) => {
      // Lake swirl (rotations) orbits them round the vortex.
      const dx = m.x - st.vx, dz = m.z - st.vz, dv = Math.hypot(dx, dz) + 0.01;
      const sw = st.vort * 3 * Math.exp(-dv * dv / 200);
      m.x += (m.vx - dz / dv * sw) * dt; m.z += (m.vz + dx / dv * sw * 0.6) * dt;
      m.vx *= Math.exp(-dt * 1.2); m.vz *= Math.exp(-dt * 1.2); m.spin *= Math.exp(-dt * 1.5);
      if (m.x > 22) m.x -= 44; else if (m.x < -22) m.x += 44;
      if (m.z > -3) m.z = -3; else if (m.z < -36) m.z = -36;
      m.jv -= G * 0.6 * dt; m.j = Math.max(0, m.j + m.jv * dt); if (m.j === 0) m.jv = Math.max(0, m.jv);
      m.rot += (0.2 + m.spin) * dt;
      dummy.position.set(m.x, lakeH(m.x, m.z) + 0.05 + m.j, m.z);
      dummy.rotation.set(Math.PI / 2 + Math.sin(t + m.ph) * 0.15 + m.j * 0.8, m.rot, Math.cos(t * 0.8 + m.ph) * 0.15 + m.tilt * Math.min(1, m.j));
      dummy.scale.setScalar(1); dummy.updateMatrix(); macMesh.setMatrixAt(i, dummy.matrix);
    });
    let nf = NF;
    for (const f of flyers) {
      if (!f.on) continue;
      f.vy -= G * 0.7 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      f.rx += f.wx * dt; f.ry += f.wy * dt; f.rz += f.wz * dt;
      if (f.y < lakeH(f.x, f.z) && f.vy < 0) { f.on = false; if (Math.random() < 0.25) spray(f.x, 0, f.z, 3, 1.2, 2.5, 0.08); continue; }
      dummy.position.set(f.x, f.y, f.z); dummy.rotation.set(f.rx, f.ry, f.rz); dummy.scale.setScalar(1.15); dummy.updateMatrix();
      macMesh.setMatrixAt(nf++, dummy.matrix);
    }
    macMesh.count = nf; macMesh.instanceMatrix.needsUpdate = true;

    // Bubbles rise (old: speed*(1+cheer*0.8), size 1 + kick*0.12 + cheer*0.18).
    bubbles.forEach((b, i) => {
      b.y += b.sp * (1 + cheer * 0.8 + st.bubbleK * 1.5 + heatK) * dt * (1 - 0.9 * st.cool);
      if (b.y > LID - 0.3) { b.y = 0; b.x = (Math.random() - 0.5) * 36; b.z = -3 - Math.random() * 26; }
      const r = b.r * (1 + 0.12 * onKick + cheer * 0.18 + st.bubbleK * 0.5) * Math.min(1, b.y * 2);
      dummy.position.set(b.x + Math.sin(t / 1.9 + b.ph) * 0.3, b.y, b.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(Math.max(0.001, r)); dummy.updateMatrix();
      bubMesh.setMatrixAt(i, dummy.matrix);
    });
    if (gloop.on) {
      gloop.t += dt;
      const u = gloop.t / 0.55, r = 0.3 + 1.6 * Math.min(1, u) * Math.min(1, u);
      dummy.position.set(gloop.x, lakeH(gloop.x, gloop.z) + r * 0.55, gloop.z); dummy.rotation.set(0, 0, 0);
      dummy.scale.set(r * (1 + 0.06 * Math.sin(t * 30)), r * 0.9, r); dummy.updateMatrix(); bubMesh.setMatrixAt(NB, dummy.matrix);
      if (u >= 1) {
        gloop.on = false; spray(gloop.x, r * 0.6, gloop.z, 26, 4, 5, 0.12); ripple(gloop.x, gloop.z, 0.5);
        for (let k = 0; k < 4; k++) fling(gloop.x, 1, gloop.z, (Math.random() - 0.5) * 6, 6 + Math.random() * 4, (Math.random() - 0.5) * 3);
      }
    } else { dummy.scale.setScalar(0.0001); dummy.position.set(0, -5, 0); dummy.updateMatrix(); bubMesh.setMatrixAt(NB, dummy.matrix); }
    bubMesh.instanceMatrix.needsUpdate = true;
    bubMat.opacity = 0.45 + 0.25 * onKick;

    // Steam.
    for (let i = 0; i < NSt; i++) {
      sPos[i * 3 + 1] += sSp[i] * (1 + 2 * heatK) * dt; sPos[i * 3] += Math.sin(t * 0.5 + i) * 0.3 * dt;
      if (sPos[i * 3 + 1] > 9) sPos[i * 3 + 1] = 0;
    }
    sGeo.attributes.position.needsUpdate = true;
    sMat.opacity = (0.16 + 0.3 * heatK + 0.1 * cheer) * (1 - 0.5 * st.cool);

    // Spoon stirs (rotations whip it round).
    st.spoonV += (0.6 - st.spoonV) * Math.min(1, dt * 0.8);
    st.spoonA += st.spoonV * dt * (1 - st.cool);
    const bx = SP.x + Math.cos(st.spoonA) * 3.5, bz = SP.z + Math.sin(st.spoonA) * 2.5;
    spoon.position.set(bx, lakeH(bx, bz) - 0.3, bz);
    spoon.rotation.set(Math.sin(st.spoonA) * 0.18, 0, -0.38 + Math.cos(st.spoonA) * 0.12);

    // Geyser.
    if (st.geyser > 0) {
      const g = st.geyser, up = Math.min(1, (st.geyserMax - g) * 5), hgt = 11 * up * Math.min(1, g * 2);
      geyser.visible = true; geyser.scale.set(1 + 0.25 * Math.sin(t * 23), Math.max(0.1, hgt), 1 + 0.25 * Math.cos(t * 19));
      geyser.position.set(GZ.x, hgt / 2 - 0.3, GZ.z);
      crown.visible = true; crown.position.set(GZ.x, hgt, GZ.z); crown.scale.set(1.7 + 0.3 * Math.sin(t * 17), 0.9 + 0.2 * Math.cos(t * 21), 1.7);
      if (Math.random() < dt * 30) fling(GZ.x + (Math.random() - 0.5) * 2, hgt, GZ.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 18, 4 + Math.random() * 6, 2 + Math.random() * 4);
      if (Math.random() < dt * 40) spray(GZ.x, hgt, GZ.z, 4, 6, 4, 0.18);
      if (Math.random() < dt * 8) ripple(GZ.x, GZ.z, 0.4);
    } else geyser.visible = crown.visible = false;

    // ── Camera: skimming low over the sauce ──
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9; st.portrait = portrait;
    const sh = st.shake;
    camera.position.set(Math.sin(t * 0.08) * 1.6 + st.camX + (Math.random() - 0.5) * sh * 0.5,
      (portrait ? 3.6 : 3.2) + Math.sin(t * 0.13) * 0.25 + st.dip + (Math.random() - 0.5) * sh * 0.4 + 0.06 * Math.sin(t * 0.9),
      9 + Math.sin(t * 0.05) * 0.8);
    camera.lookAt(Math.sin(t * 0.08) * 0.8 + st.camX * 0.4, (portrait ? 3.6 : 3.0) + st.dip * 0.3, -12);
    camera.rotateZ(Math.sin(t * 0.11) * 0.02 + st.roll);
    const fov = portrait ? 66 : 56;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sky.position.copy(camera.position);
  }

  function release(d, sw = d.sway) {
    if (d.grow < 0.5) return;
    const bw = d.w * 0.5;
    dropGlob(d.x + Math.sin(sw) * d.len, LID - Math.cos(sw) * d.len - bw * 0.4, d.z, bw * 1.1, -1, 0.25 + d.w * 0.4);
    d.grow = 0.25;
  }
  const colX = (c) => { const u = (c ?? 4.5) - 4.5, s = u < 0 ? -1 : 1; return st.portrait ? u * 0.7 : s * (7 + Math.abs(u) * 1.1); };
  const nearZ = () => (st.portrait ? 2 : -8);
  const longest = (n) => drips.slice().sort((a, b) => b.len * b.grow - a.len * a.grow).slice(0, n);

  function react(kind, data = {}) {
    if (st.dead && kind !== 'start') return;
    switch (kind) {
      case 'move': {
        const dir = data.dir || 0;
        for (const d of drips) d.swayV += dir * (0.9 + 0.5 * d.lag) * (d.swayDir > 0 ? 1 : 0.8);
        st.sloshV += dir * 1.4;
        for (const m of floats) m.vx += dir * (0.8 + Math.random() * 0.8);
        st.camVX += dir * 0.9;
        break;
      }
      case 'rotate': {
        const dir = data.dir || 1;
        st.vortV += dir * 1.6; st.spoonV += dir * 4; st.rollV += dir * 0.18;
        for (const m of floats) m.spin += dir * 4;
        break;
      }
      case 'soft':
        st.stretch = Math.min(1.5, st.stretch + 0.2); st.bubbleK = Math.min(1, st.bubbleK + 0.15); st.dipV -= 0.35;
        break;
      case 'drop': {
        const r = data.rows || 0, k = Math.min(1, 0.3 + r / 14);
        const x = colX(data.col);
        dropGlob(x, 2.5, nearZ(), 0.5 + 0.5 * k, -16, k);
        st.shake = Math.max(st.shake, 0.6 * k); st.dipV -= 1.2 * k;
        for (const d of drips) d.swayV += (Math.random() - 0.5) * 2 * k;
        break;
      }
      case 'hold':
        gloop.side = -gloop.side; gloop.on = true; gloop.t = 0; gloop.x = gloop.side * (st.portrait ? 1.5 : 6 + Math.random() * 3); gloop.z = st.portrait ? 1.5 : -7 - Math.random() * 3;
        break;
      case 'clear': {
        const n = Math.max(1, data.lines || 1), combo = data.combo || 0;
        st.combo = combo;
        st.heat = Math.min(4, st.heat + 0.3 * n + 0.35 * combo);
        st.stretch = Math.min(2, st.stretch + 0.4 * n); st.bubbleK = Math.min(1.5, 0.4 + 0.25 * n + 0.1 * combo); st.flash = Math.max(st.flash, 0.15 + 0.12 * n);
        for (const d of longest(n * 2 + combo)) release(d);
        for (const m of floats) if (Math.random() < 0.15 * n) { m.jv = Math.max(m.jv, 2 + 1.5 * n + Math.random() * 2); m.spin += (Math.random() - 0.5) * 12; }
        if (n >= 4) {
          GZ.x = (Math.random() < 0.5 ? -1 : 1) * (st.portrait ? 2.2 : 8 + Math.random() * 3); GZ.z = st.portrait ? -2 : -14;
          st.geyser = st.geyserMax = 1.3 + 0.15 * Math.min(4, combo); st.flash = 1; st.shake = 1; ripple(GZ.x, GZ.z, 1.2);
          spray(GZ.x, 0.5, GZ.z, 60, 9, 9, 0.18);
          for (let i = 0; i < 26; i++) fling(GZ.x + (Math.random() - 0.5) * 2, 1, GZ.z, (Math.random() - 0.5) * 22, 9 + Math.random() * 8, 2 + Math.random() * 6);
          for (const d of drips) release(d);
        } else if (n === 3) { ripple(0, -12, 0.7); for (let i = 0; i < 8; i++) fling((Math.random() - 0.5) * 4, 0.5, -12, (Math.random() - 0.5) * 14, 7 + Math.random() * 4, 2 + Math.random() * 3); }
        if (combo >= 2) for (let i = 0; i < Math.min(12, combo * 3); i++) fling((Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6), 0.3, -6 - Math.random() * 8, (Math.random() - 0.5) * 4, 6 + Math.random() * 3 + combo, (Math.random() - 0.5) * 2);
        break;
      }
      case 'combo':
        st.combo = data.n || 0;
        break;
      case 'levelUp':
        st.flash = 0.8;
        for (let i = 0; i < 40; i++) fling((Math.random() - 0.5) * 34, LID - 0.5 - Math.random() * 2, -4 - Math.random() * 22, (Math.random() - 0.5) * 2, -Math.random() * 3, 0);
        for (const d of drips) release(d);
        st.bubbleK = 1.5; st.heat = Math.min(4, st.heat + 0.5);
        break;
      case 'gameOver':
        st.dead = true; st.heat = 0; st.flash = 0.3; st.geyser = Math.min(st.geyser, 0.3);
        break;
      case 'start':
        st.dead = false; st.heat = 0; st.combo = 0;
        dropGlob(0, 6, -10, 1.1, -10, 1); st.flash = 0.5;
        break;
    }
  }

  return {
    update, react,
    dispose() {
      scene.remove(root);
      scene.fog = prevFog; scene.background = prevBg;
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
  };
}
