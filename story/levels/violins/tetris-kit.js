// Small toolkit for the living Tetris worlds (violins, trumpets, hegotme,
// living): one batched sprite renderer for every particle / glow / glyph
// (one draw call per batch, immediate mode — fill it each frame), a pooled
// particle simulator that feeds it, a vertex-coloured geometry merger for
// static set dressing, canvas-texture helpers and a few common atlas cells.
// Nothing here allocates per frame or per event.

export function createKit(THREE) {
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  const canvasTex = (w, h, draw, srgb = true) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return keep(t);
  };

  // Atlas cells would bleed into each other in the mip chain.
  const noMip = (t) => { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t; };
  // ── Atlas: an N×N grid of cells, each painted by a function (g, size) ──
  // Painters draw white (tinted per sprite) centred in a size×size cell.
  const atlas = (cells, n = 4, px = 512) => noMip(canvasTex(px, px, (g) => {
    const s = px / n;
    cells.forEach((paint, i) => {
      if (!paint) return;
      g.save(); g.translate((i % n) * s, Math.floor(i / n) * s);
      g.beginPath(); g.rect(0, 0, s, s); g.clip();
      paint(g, s); g.restore();
    });
  }));
  const paint = {
    glow: (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.22, 'rgba(255,255,255,0.65)'); r.addColorStop(0.55, 'rgba(255,255,255,0.14)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); },
    soft: (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.6, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); },
    ring: (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.75, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); },
    sparkle: (g, s) => {
      const c = s / 2; paint.glow(g, s); g.fillStyle = '#fff';
      for (const [w, l] of [[s * 0.05, s * 0.48], [s * 0.035, s * 0.3]]) {
        g.save(); g.translate(c, c); if (l < s * 0.4) g.rotate(Math.PI / 4);
        g.beginPath(); g.moveTo(0, -l); g.quadraticCurveTo(w, -w, l, 0); g.quadraticCurveTo(w, w, 0, l); g.quadraticCurveTo(-w, w, -l, 0); g.quadraticCurveTo(-w, -w, 0, -l); g.fill(); g.restore();
      }
    },
    rect: (g, s) => { g.fillStyle = '#fff'; g.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.7); },
    glyph: (ch, font = 'serif', k = 0.72) => (g, s) => {
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = s * 0.06;
      g.font = `bold ${Math.round(s * k)}px ${font}`; g.fillText(ch, s / 2, s * 0.54);
    },
    puff: (g, s) => {
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, x = s / 2 + Math.cos(a) * s * 0.17, y = s / 2 + Math.sin(a) * s * 0.14;
        const r = g.createRadialGradient(x, y, 0, x, y, s * 0.26); r.addColorStop(0, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r; g.fillRect(0, 0, s, s);
      }
    },
  };

  // ── SpriteBatch: camera-facing (or ground-flat) textured quads ─────────
  // add(x, y, z, size, rot, cell, r, g, b, a, stretch = 1, flat = 0)
  // Additive batches pre-multiply alpha into rgb.
  class SpriteBatch {
    constructor(cap, tex, { cells = 4, additive = true, order = 5, depthTest = true } = {}) {
      this.cap = cap; this.n = 0;
      const g = this.geo = keep(new THREE.InstancedBufferGeometry());
      const q = new THREE.PlaneGeometry(1, 1);
      g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
      this.aPos = new Float32Array(cap * 4); this.aCol = new Float32Array(cap * 4); this.aSpr = new Float32Array(cap * 4);
      g.setAttribute('aPos', this.bPos = new THREE.InstancedBufferAttribute(this.aPos, 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aCol', this.bCol = new THREE.InstancedBufferAttribute(this.aCol, 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aSpr', this.bSpr = new THREE.InstancedBufferAttribute(this.aSpr, 4).setUsage(THREE.DynamicDrawUsage));
      g.instanceCount = 0;
      this.mat = keep(new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uCells: { value: cells } },
        vertexShader: `attribute vec4 aPos; attribute vec4 aCol; attribute vec4 aSpr; uniform float uCells;
          varying vec2 vUv; varying vec4 vCol;
          void main(){
            float c = cos(aSpr.y), s = sin(aSpr.y);
            vec2 p = position.xy * vec2(1.0, aSpr.z);
            p = vec2(p.x * c - p.y * s, p.x * s + p.y * c) * aPos.w;
            vec4 mv;
            if (aSpr.w > 0.5) mv = modelViewMatrix * vec4(aPos.xyz + vec3(p.x, 0.0, -p.y), 1.0);
            else { mv = modelViewMatrix * vec4(aPos.xyz, 1.0); mv.xy += p; }
            gl_Position = projectionMatrix * mv;
            vec2 cxy = vec2(mod(aSpr.x, uCells), floor(aSpr.x / uCells));
            vUv = vec2((cxy.x + uv.x) / uCells, 1.0 - (cxy.y + 1.0 - uv.y) / uCells);
            vCol = aCol;
          }`,
        fragmentShader: `uniform sampler2D uMap; varying vec2 vUv; varying vec4 vCol;
          void main(){ vec4 t = texture2D(uMap, vUv); vec4 c = t * vCol;
            ${additive ? 'gl_FragColor = vec4(c.rgb * c.a, 1.0);' : 'if (c.a < 0.01) discard; gl_FragColor = c;'} }`,
        transparent: true, depthWrite: false, depthTest, fog: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }));
      if (additive) this.mat.blending = THREE.CustomBlending, this.mat.blendSrc = THREE.OneFactor, this.mat.blendDst = THREE.OneFactor;
      this.mesh = new THREE.Mesh(g, this.mat);
      this.mesh.frustumCulled = false; this.mesh.renderOrder = order;
      q.dispose();
    }
    begin() { this.n = 0; }
    add(x, y, z, size, rot, cell, r, g, b, a, stretch = 1, flat = 0) {
      if (this.n >= this.cap || a <= 0.003 || size <= 0) return;
      const i = this.n++ * 4;
      this.aPos[i] = x; this.aPos[i + 1] = y; this.aPos[i + 2] = z; this.aPos[i + 3] = size;
      this.aCol[i] = r; this.aCol[i + 1] = g; this.aCol[i + 2] = b; this.aCol[i + 3] = a;
      this.aSpr[i] = cell; this.aSpr[i + 1] = rot; this.aSpr[i + 2] = stretch; this.aSpr[i + 3] = flat;
    }
    end() {
      this.geo.instanceCount = this.n;
      if (this.n) {
        for (const b of [this.bPos, this.bCol, this.bSpr]) { b.clearUpdateRanges ? (b.clearUpdateRanges(), b.addUpdateRange(0, this.n * 4)) : null; b.needsUpdate = true; }
      }
    }
  }

  // ── Particles: pooled point-mass sprites (life, gravity, drag, wobble) ──
  class Particles {
    constructor(cap) { this.cap = cap; this.i = 0; this.p = Array.from({ length: cap }, () => ({ t: 0, max: 0 })); this.live = 0; }
    spawn(x, y, z, cell, max) {
      const o = this.p[this.i = (this.i + 1) % this.cap];
      o.x = x; o.y = y; o.z = z; o.vx = 0; o.vy = 0; o.vz = 0; o.g = 0; o.drag = 0; o.size = 0.3; o.grow = 0;
      o.rot = 0; o.vr = 0; o.cell = cell; o.r = 1; o.gg = 1; o.b = 1; o.a = 1; o.t = 0; o.max = max; o.stretch = 1; o.flat = 0;
      o.wob = 0; o.wf = 2; o.ph = Math.random() * 6.28; o.fadeIn = 0.06; o.floor = -1e9; o.bounce = 0; o.batch = 0;
      return o;
    }
    step(dt, batches) {
      let live = 0;
      for (const o of this.p) {
        if (o.t >= o.max) continue;
        o.t += dt; if (o.t >= o.max) continue;
        live++;
        o.vy -= o.g * dt;
        if (o.drag) { const k = Math.exp(-o.drag * dt); o.vx *= k; o.vy *= k; o.vz *= k; }
        o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.rot += o.vr * dt;
        if (o.y < o.floor) { o.y = o.floor; o.vy = -o.vy * o.bounce; o.vx *= 0.6; o.vz *= 0.6; }
        const u = o.t / o.max, f = Math.min(1, o.t / o.fadeIn) * (u > 0.7 ? (1 - u) / 0.3 : 1);
        const wx = o.wob ? Math.sin(o.t * o.wf + o.ph) * o.wob : 0;
        (batches[o.batch] || batches[0]).add(o.x + wx, o.y, o.z, o.size * (1 + o.grow * o.t), o.rot, o.cell, o.r, o.gg, o.b, o.a * f, o.stretch, o.flat);
      }
      this.live = live;
    }
    clear() { for (const o of this.p) o.t = o.max; }
  }

  // ── Builder: merge primitives into one vertex-coloured geometry ────────
  const _v = new THREE.Vector3(), _c = new THREE.Color(), _m3 = new THREE.Matrix3();
  class Builder {
    constructor() { this.pos = []; this.nor = []; this.col = []; }
    m4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    }
    add(geo, matrix, color, k = 1) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (!g.attributes.normal) g.computeVertexNormals();
      const p = g.attributes.position, n = g.attributes.normal;
      _m3.getNormalMatrix(matrix); _c.set(color).multiplyScalar(k);
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(p, i).applyMatrix4(matrix); this.pos.push(_v.x, _v.y, _v.z);
        _v.fromBufferAttribute(n, i).applyMatrix3(_m3).normalize(); this.nor.push(_v.x, _v.y, _v.z);
        this.col.push(_c.r, _c.g, _c.b);
      }
      if (g !== geo) g.dispose();
      geo.dispose();
      return this;
    }
    box(w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0, k) { return this.add(new THREE.BoxGeometry(w, h, d), this.m4(x, y, z, rx, ry, rz), color, k); }
    cyl(r0, r1, len, seg, x, y, z, color, rx = 0, ry = 0, rz = 0, k) { return this.add(new THREE.CylinderGeometry(r0, r1, len, seg), this.m4(x, y, z, rx, ry, rz), color, k); }
    sph(r, x, y, z, color, sx = 1, sy = 1, sz = 1, seg = 8, k) { return this.add(new THREE.SphereGeometry(r, seg, Math.max(4, seg * 0.75 | 0)), this.m4(x, y, z, 0, 0, 0, sx, sy, sz), color, k); }
    get count() { return this.pos.length / 3; }
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.computeBoundingSphere();
      return keep(g);
    }
  }

  // ── Damped spring (value + velocity) ────────────────────────────────
  const spring = () => ({ x: 0, v: 0 });
  const stepSpring = (s, dt, hz, damp, target = 0) => {
    const w = 2 * Math.PI * hz, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (-w * w * (s.x - target) - 2 * damp * w * s.v) * h; s.x += s.v * h; }
    if (!Number.isFinite(s.x)) { s.x = 0; s.v = 0; }
    return s.x;
  };

  // Board framing: fraction of the screen width the board (+ side panels)
  // covers at this aspect, and whether we're in portrait.
  const framing = (aspect) => {
    const portrait = aspect < 0.9;
    return { portrait, covered: portrait ? 0.92 : Math.min(0.85, 0.56 * 1.6 / aspect) };
  };

  return {
    keep, canvasTex, atlas, paint, SpriteBatch, Particles, Builder, spring, stepSpring, framing,
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); disposables.length = 0; },
  };
}

export const frac = (x) => ((x % 1) + 1) % 1;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
