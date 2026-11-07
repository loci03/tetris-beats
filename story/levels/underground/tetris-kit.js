// Shared bits for the living Tetris worlds (underground, taco, triggered,
// work): canvas textures, damped springs, a pooled instanced particle
// system (billboard / tumbling / velocity-stretched quads with per-particle
// colour + alpha, one draw call), and a vertex-animated instanced crowd
// (bounce, jump waves, arms up, lean — zero per-frame JS per person).

export function makeKit(THREE) {
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t);
  };
  const glowTex = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.75)');
    gr.addColorStop(0.55, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const softTex = canvasTex(64, 64, (g, w) => {           // smoke / haze puff
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  // Damped spring: s = [x, v].
  const spring = (s, dt, hz, damp) => {
    const w = 2 * Math.PI * hz, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) { s[1] += (-w * w * s[0] - 2 * damp * w * s[1]) * h; s[0] += s[1] * h; }
    if (!Number.isFinite(s[0])) { s[0] = 0; s[1] = 0; }
    return s[0];
  };

  // ── Particle pool ────────────────────────────────────────────────
  // mode 0 billboard (spins about the view axis), 1 tumble (3D spin, for
  // confetti / paper / chips), 2 stretch (along the screen-space velocity:
  // tracers, sparks, rain).
  const POOL_VS = `
    attribute float aAlpha;
    varying vec2 vUv; varying vec3 vCol; varying float vA;
    void main() {
      vUv = uv; vA = aAlpha;
      #ifdef USE_INSTANCING_COLOR
        vCol = instanceColor;
      #else
        vCol = vec3(1.0);
      #endif
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }`;
  const POOL_FS = `
    uniform sampler2D uMap; uniform float uUseMap, uAdd;
    varying vec2 vUv; varying vec3 vCol; varying float vA;
    void main() {
      vec4 t = uUseMap > 0.5 ? texture2D(uMap, vUv) : vec4(1.0);
      float a = t.a * vA;
      if (uAdd > 0.5) gl_FragColor = vec4(vCol * t.rgb * a, 1.0);
      else { if (a < 0.02) discard; gl_FragColor = vec4(vCol * t.rgb, a); }
    }`;
  function makePool(max, { map = null, additive = true, geo = null, order = 6, side = THREE.DoubleSide } = {}) {
    const mat = keep(new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uUseMap: { value: map ? 1 : 0 }, uAdd: { value: additive ? 1 : 0 } },
      vertexShader: POOL_VS, fragmentShader: POOL_FS, transparent: true, depthWrite: false, side,
      blending: additive ? THREE.CustomBlending : THREE.NormalBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    }));
    const g = keep(geo || new THREE.PlaneGeometry(1, 1));
    const alpha = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    alpha.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aAlpha', alpha);
    const mesh = new THREE.InstancedMesh(g, mat, max);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = order;
    keep(mesh);
    const P = new Float32Array(max * 3), V = new Float32Array(max * 3), R = new Float32Array(max * 3), C = new Float32Array(max * 3);
    const L = new Float32Array(max), L0 = new Float32Array(max), S = new Float32Array(max), S1 = new Float32Array(max);
    const G = new Float32Array(max), D = new Float32Array(max), M = new Uint8Array(max), A0 = new Float32Array(max), F = new Float32Array(max), FL = new Float32Array(max);
    let cur = 0, live = 0;
    const dummy = new THREE.Object3D(), q = new THREE.Quaternion(), qz = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), v3 = new THREE.Vector3(), col = new THREE.Color();
    const qi = new THREE.Quaternion();
    // o: { life, size, size1, color (hex), grav, drag, spin, mode, alpha, floor (y; bounce), aspect }
    function spawn(x, y, z, vx, vy, vz, o = {}) {
      const i = cur; cur = (cur + 1) % max;
      if (L[i] <= 0) live++;
      P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
      V[i * 3] = vx; V[i * 3 + 1] = vy; V[i * 3 + 2] = vz;
      L[i] = L0[i] = o.life || 1;
      S[i] = o.size || 0.2; S1[i] = o.size1 != null ? o.size1 : S[i];
      G[i] = o.grav || 0; D[i] = o.drag || 0; M[i] = o.mode || 0; A0[i] = o.alpha != null ? o.alpha : 1;
      F[i] = o.aspect || 1; FL[i] = o.floor != null ? o.floor : -1e9;
      R[i * 3] = Math.random() * 6.28; R[i * 3 + 1] = Math.random() * 6.28; R[i * 3 + 2] = o.spin != null ? o.spin : (Math.random() - 0.5) * 6;
      col.set(o.color != null ? o.color : 0xffffff);
      C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b;
    }
    function update(dt, camera) {
      if (live <= 0) { mesh.count = 0; return; }
      let n = 0;
      qi.copy(camera.quaternion).invert();
      for (let i = 0; i < max; i++) {
        if (L[i] <= 0) continue;
        L[i] -= dt;
        if (L[i] <= 0) { live--; continue; }
        const j = i * 3, k = Math.max(0, 1 - D[i] * dt);
        V[j] *= k; V[j + 2] *= k; V[j + 1] = V[j + 1] * k - G[i] * dt;
        P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
        if (P[j + 1] < FL[i]) { P[j + 1] = FL[i]; V[j + 1] *= -0.3; V[j] *= 0.5; V[j + 2] *= 0.5; R[j + 2] *= 0.5; }
        R[j] += R[j + 2] * dt; R[j + 1] += R[j + 2] * 0.7 * dt;
        const u = 1 - L[i] / L0[i], s = S[i] + (S1[i] - S[i]) * u;
        dummy.position.set(P[j], P[j + 1], P[j + 2]);
        if (M[i] === 1) { dummy.rotation.set(R[j], R[j + 1], 0); dummy.scale.set(s * F[i], s, s); }
        else if (M[i] === 2) {
          v3.set(V[j], V[j + 1], V[j + 2]).applyQuaternion(qi);
          const ang = Math.atan2(v3.y, v3.x), sp = Math.hypot(v3.x, v3.y);
          qz.setFromAxisAngle(zAxis, ang);
          dummy.quaternion.copy(camera.quaternion).multiply(qz);
          dummy.scale.set(Math.max(s, sp * F[i]), s, s);
        } else {
          qz.setFromAxisAngle(zAxis, R[j]);
          dummy.quaternion.copy(camera.quaternion).multiply(qz);
          dummy.scale.set(s * F[i], s, s);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        mesh.instanceColor.setXYZ(n, C[j], C[j + 1], C[j + 2]);
        const fade = Math.min(1, L[i] / Math.min(0.35, L0[i] * 0.5));
        alpha.array[n] = A0[i] * fade;
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; alpha.needsUpdate = true;
    }
    return { mesh, spawn, update, get live() { return live; }, clear() { L.fill(0); live = 0; mesh.count = 0; } };
  }

  // ── Instanced crowd (vertex animated) ───────────────────────────
  // spots: [{ x, y, z, yaw, s, shirt, skin, hype }]. Uniforms drive it.
  const CROWD_VS = `
    attribute float aPart; attribute vec3 aShirt; attribute vec3 aSkin; attribute vec2 aPh;
    uniform float uBeat, uHype, uArms, uLean, uBounce, uWaveR, uWaveK, uDown, uTime;
    uniform vec2 uWaveO;
    varying vec3 vN; varying vec3 vC; varying vec3 vW;
    #include <fog_pars_vertex>
    void main() {
      vec3 p = position;
      float ph = aPh.x, hy = aPh.y;
      vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      float wave = uWaveK * exp(-pow((distance(ip.xz, uWaveO) - uWaveR) * 1.2, 2.0));
      float jump = max(0.0, sin(uBeat * 6.2832 + ph * 0.5)) * (0.03 + 0.28 * uHype * hy) * uBounce + wave * 0.55;
      float up = clamp(uArms * hy * 1.4 + wave * 1.5 - 0.15, 0.0, 1.0);
      vec3 n = normal;
      if (aPart > 1.5) {
        float s = aPart > 2.5 ? 1.0 : -1.0;
        vec2 sh = vec2(0.28 * s, 0.95);
        float rest = 0.22 + 0.25 * sin(uBeat * 3.1416 + ph);
        float pump = 2.75 + 0.25 * sin(uBeat * 6.2832 + ph);
        float a = s * mix(rest, pump, up);
        vec2 d = p.xy - sh; float ca = cos(a), sa = sin(a);
        p.xy = sh + vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
        n.xy = vec2(n.x * ca - n.y * sa, n.x * sa + n.y * ca);
      }
      if (aPart > 0.5 && aPart < 1.5) { p.x += 0.04 * sin(uBeat * 3.1416 + ph); p.y -= uDown * 0.22; p.z += uDown * 0.12; }
      p.y += jump;
      p.x += uLean * p.y * 0.14;
      vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
      vW = wp.xyz;
      vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
      vC = aPart < 0.5 ? aShirt : aSkin;
      vec4 mvPosition = viewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const CROWD_FS = `
    uniform vec3 uKey, uAmb, uRimL, uRimR, uKeyDir;
    uniform float uFlash;
    varying vec3 vN; varying vec3 vC; varying vec3 vW;
    #include <fog_pars_fragment>
    void main() {
      vec3 n = normalize(vN);
      float l = max(0.0, dot(n, normalize(uKeyDir)));
      vec3 c = vC * (uAmb + uKey * l);
      c += uRimL * pow(max(0.0, -n.x), 2.0) + uRimR * pow(max(0.0, n.x), 2.0);
      c += vC * uFlash;
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`;
  function makeCrowd(spots, { lowPoly = false, fog = true } = {}) {
    const parts = [];
    const add = (geo, part, m) => { geo.applyMatrix4(m); const n = geo.attributes.position.count; geo.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(n).fill(part), 1)); parts.push(geo); };
    const M = new THREE.Matrix4();
    const seg = lowPoly ? 5 : 7;
    add(new THREE.CapsuleGeometry(0.26, 0.55, 2, seg), 0, M.makeTranslation(0, 0.55, 0));
    add(new THREE.SphereGeometry(0.2, seg + 1, 5), 1, M.makeTranslation(0, 1.17, 0));
    add(new THREE.CapsuleGeometry(0.07, 0.5, 2, 4), 2, M.makeTranslation(-0.28, 0.65, 0));
    add(new THREE.CapsuleGeometry(0.07, 0.5, 2, 4), 3, M.makeTranslation(0.28, 0.65, 0));
    const geo = keep(mergeGeos(parts));
    parts.forEach(p => p.dispose());
    const n = spots.length;
    const shirt = new Float32Array(n * 3), skin = new Float32Array(n * 3), ph = new Float32Array(n * 2);
    const c = new THREE.Color();
    spots.forEach((s, i) => {
      c.set(s.shirt); shirt.set([c.r, c.g, c.b], i * 3);
      c.set(s.skin); skin.set([c.r, c.g, c.b], i * 3);
      ph[i * 2] = s.phase != null ? s.phase : Math.random() * 6.28; ph[i * 2 + 1] = s.hype != null ? s.hype : 0.6 + Math.random() * 0.6;
    });
    geo.setAttribute('aShirt', new THREE.InstancedBufferAttribute(shirt, 3));
    geo.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 3));
    geo.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 2));
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uBeat: { value: 0 }, uHype: { value: 0.4 }, uArms: { value: 0 }, uLean: { value: 0 }, uBounce: { value: 1 },
      uWaveR: { value: -10 }, uWaveK: { value: 0 }, uWaveO: { value: new THREE.Vector2() }, uDown: { value: 0 }, uTime: { value: 0 },
      uKey: { value: new THREE.Color(0.5, 0.5, 0.55) }, uAmb: { value: new THREE.Color(0.18, 0.16, 0.22) },
      uRimL: { value: new THREE.Color(0.6, 0.1, 0.4) }, uRimR: { value: new THREE.Color(0.1, 0.5, 0.7) },
      uKeyDir: { value: new THREE.Vector3(0.3, 0.8, 0.6) }, uFlash: { value: 0 },
    }]);
    const mat = keep(new THREE.ShaderMaterial({ uniforms, vertexShader: CROWD_VS, fragmentShader: CROWD_FS, fog }));
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const dummy = new THREE.Object3D();
    spots.forEach((s, i) => { dummy.position.set(s.x, s.y || 0, s.z); dummy.rotation.set(0, s.yaw || 0, 0); dummy.scale.setScalar(s.s || 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.frustumCulled = false;
    keep(mesh);
    return { mesh, u: mat.uniforms };
  }

  // Minimal merge (non-indexed output) for a handful of BufferGeometries
  // with position/normal/uv + any extra float attributes they all share.
  function mergeGeos(geos) {
    const list = geos.map(g => (g.index ? g.toNonIndexed() : g));
    const names = Object.keys(list[0].attributes).filter(nm => list.every(g => g.attributes[nm]));
    const out = new THREE.BufferGeometry();
    for (const nm of names) {
      const size = list[0].attributes[nm].itemSize;
      const total = list.reduce((a, g) => a + g.attributes[nm].count, 0);
      const arr = new Float32Array(total * size);
      let o = 0;
      for (const g of list) { const a = g.attributes[nm]; for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) arr[o++] = a.array[i * size + k]; }
      out.setAttribute(nm, new THREE.BufferAttribute(arr, size));
    }
    list.forEach((g, i) => { if (g !== geos[i]) g.dispose(); });
    return out;
  }

  // Box/cylinder builder with vertex colours → one geometry (static props).
  class Builder {
    constructor() { this.geos = []; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); }
    add(geo, x, y, z, color, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      this.e.set(rx, ry, rz); this.q.setFromEuler(this.e);
      this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz));
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      g.applyMatrix4(this.m);
      const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      this.geos.push(g);
      return this;
    }
    box(w, h, d, x, y, z, color, rx, ry, rz) { return this.add(new THREE.BoxGeometry(w, h, d), x, y, z, color, rx, ry, rz); }
    cyl(rt, rb, h, seg, x, y, z, color, rx, ry, rz) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, color, rx, ry, rz); }
    sphere(r, x, y, z, color, sx = 1, sy = 1, sz = 1, seg = 8) { return this.add(new THREE.SphereGeometry(r, seg, Math.max(4, seg >> 1)), x, y, z, color, 0, 0, 0, sx, sy, sz); }
    build() { const g = mergeGeos(this.geos); this.geos.forEach(x => x.dispose()); this.geos = []; return keep(g); }
  }

  // Board framing: the fraction of the screen width the board + panels
  // cover, and whether we're in portrait.
  const framing = (camera) => {
    const aspect = camera.aspect || 1.6, portrait = aspect < 0.9;
    return { aspect, portrait, covered: Math.min(0.9, 0.56 * 1.6 / aspect) };
  };

  return { keep, disposables, canvasTex, glowTex, softTex, spring, makePool, makeCrowd, mergeGeos, Builder, framing,
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); disposables.length = 0; } };
}
