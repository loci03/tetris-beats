// Small shared toolkit for the living Tetris worlds of this level:
// a merged-geometry builder (vertex colours + uvs → one draw call), a
// GPU billboard sprite pool (one instanced draw for hundreds of glows /
// confetti / text pops, sampled from a 4×4 atlas), a toon gradient and a
// canvas-texture helper. Everything created is tracked for dispose().

export function createKit(THREE) {
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  const canvasTex = (w, h, draw, { srgb = true, repeat = false } = {}) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 2;
    return keep(t);
  };

  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([70, 150, 220, 255]), 4, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (opts) => keep(new THREE.MeshToonMaterial({ gradientMap: toonGrad, ...opts }));

  // ── Builder: merge primitives (with optional vertex colour + uv rect) ──
  const _v = new THREE.Vector3(), _c = new THREE.Color(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
  class Builder {
    constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; }
    m4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    }
    // uvRect = [u0, v0, u1, v1] remaps the primitive's 0..1 uvs into a texture atlas cell.
    add(geo, matrix, color = 0xffffff, uvRect = null, bend = null) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (!g.attributes.normal) g.computeVertexNormals();
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
      const nm = new THREE.Matrix3().getNormalMatrix(matrix);
      _c.set(color);
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(p, i);
        if (bend) bend(_v);
        _v.applyMatrix4(matrix); this.pos.push(_v.x, _v.y, _v.z);
        _v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); this.nor.push(_v.x, _v.y, _v.z);
        let u = uv ? uv.getX(i) : 0, w = uv ? uv.getY(i) : 0;
        if (uvRect) { u = uvRect[0] + u * (uvRect[2] - uvRect[0]); w = uvRect[1] + w * (uvRect[3] - uvRect[1]); }
        this.uv.push(u, w);
        this.col.push(_c.r, _c.g, _c.b);
      }
      if (g !== geo) g.dispose();
      geo.dispose();
      return this;
    }
    box(w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0, uvRect) { return this.add(new THREE.BoxGeometry(w, h, d), this.m4(x, y, z, rx, ry, rz), color, uvRect); }
    cyl(r0, r1, len, seg, x, y, z, color, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(r0, r1, len, seg), this.m4(x, y, z, rx, ry, rz), color); }
    sphere(r, x, y, z, color, ws = 8, hs = 6, sx = 1, sy = 1, sz = 1) { return this.add(new THREE.SphereGeometry(r, ws, hs), this.m4(x, y, z, 0, 0, 0, sx, sy, sz), color); }
    plane(w, h, x, y, z, color, rx = 0, ry = 0, rz = 0, uvRect) { return this.add(new THREE.PlaneGeometry(w, h), this.m4(x, y, z, rx, ry, rz), color, uvRect); }
    get count() { return this.pos.length / 3; }
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.computeBoundingSphere();
      return keep(g);
    }
  }

  // ── Sprite pool: camera-facing quads, one instanced draw ──
  // set(i, x, y, z, size, r, g, b, a, rot, sx, sy, cell)
  const spritePool = (max, map, { additive = true, depthTest = true, cap = 0 } = {}) => {
    const base = keep(new THREE.PlaneGeometry(1, 1));
    const geo = keep(new THREE.InstancedBufferGeometry());
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    const P = new Float32Array(max * 4), Cc = new Float32Array(max * 4), X = new Float32Array(max * 4);
    const aP = new THREE.InstancedBufferAttribute(P, 4), aC = new THREE.InstancedBufferAttribute(Cc, 4), aX = new THREE.InstancedBufferAttribute(X, 4);
    for (const a of [aP, aC, aX]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', aP); geo.setAttribute('iCol', aC); geo.setAttribute('iExt', aX);
    geo.instanceCount = 0;
    const mat = keep(new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, uCap: { value: cap } },
      transparent: true, depthWrite: false, depthTest,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 iPos; attribute vec4 iCol; attribute vec4 iExt; uniform float uCap;
        varying vec2 vUv; varying vec4 vCol;
        void main(){
          vec4 mv = modelViewMatrix * vec4(iPos.xyz, 1.0);
          float c = cos(iExt.x), s = sin(iExt.x);
          vec2 p = position.xy * iExt.yw;
          // cap the on-screen size of plain glows (cells 0 and 3: near bulbs)
          float sz = (uCap > 0.0 && (iExt.z < 0.5 || abs(iExt.z - 3.0) < 0.5)) ? min(iPos.w, -mv.z * uCap) : iPos.w;
          mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y) * sz;
          gl_Position = projectionMatrix * mv;
          float cell = iExt.z;
          vUv = (uv * 0.98 + 0.01 + vec2(mod(cell, 4.0), 3.0 - floor(cell / 4.0))) * 0.25;
          vCol = iCol;
        }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
        void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(vCol.rgb * t.rgb, vCol.a * t.a); if (gl_FragColor.a < 0.004) discard; }`,
    }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    let n = 0;
    return {
      mesh,
      begin() { n = 0; },
      // sx/sy stretch the quad (streaks, confetti flips)
      set(x, y, z, size, r, g, b, a, rot = 0, sx = 1, sy = 1, cell = 0) {
        if (n >= max) return;
        const k = n * 4;
        P[k] = x; P[k + 1] = y; P[k + 2] = z; P[k + 3] = size;
        Cc[k] = r; Cc[k + 1] = g; Cc[k + 2] = b; Cc[k + 3] = a;
        X[k] = rot; X[k + 1] = sx; X[k + 2] = cell; X[k + 3] = sy;
        n++;
      },
      end() { geo.instanceCount = n; aP.needsUpdate = aC.needsUpdate = aX.needsUpdate = true; },
      get count() { return n; },
    };
  };

  const dispose = () => { for (const d of disposables) if (d && d.dispose) d.dispose(); disposables.length = 0; };
  return { keep, canvasTex, toonGrad, toon, Builder, spritePool, dispose };
}

// Deterministic pseudo-random (so the world looks the same every load).
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
