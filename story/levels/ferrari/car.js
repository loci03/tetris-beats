// FERRARI WINDOW — vehicles: the hero red Italian-style supercar (no
// badges, no logos) and the highway traffic, as merged low-poly geometry
// drawn with one cheap "car paint" shader.
//
// Every vehicle is a single BufferGeometry with a vertex colour and a
// material id per vertex (aMat): 0 paint · 1 glass · 2 matte trim ·
// 3 tail lights · 4 chrome · 5 rubber · 6 head lights. The shader fakes
// a glossy clear-coat: a night-sky / city-glow environment reflection,
// street lamps sliding over the body as it drives (uScroll), a fresnel rim
// and a key light — no scene lights, no env maps, no shadows.
// Traffic is instanced (instanceColor tints the paint; an optional per-
// instance aFade screen-door-dithers a vehicle that blocks the hero).

const PAINT_VS = `
attribute vec3 color;
attribute float aMat;
varying vec3 vC; varying float vM; varying vec3 vN; varying vec3 vW; varying float vFade;
#ifdef USE_INSTANCING
  attribute float aFade;     // per-instance camera-occlusion fade (0 = solid); absent → 0
#endif
#include <fog_pars_vertex>
void main() {
  vec3 c = color;
  vFade = 0.0;
  #ifdef USE_INSTANCING
    vFade = aFade;
    mat4 mm = modelMatrix * instanceMatrix;
    #ifdef USE_INSTANCING_COLOR
      if (aMat < 0.5) c *= instanceColor;
    #endif
  #else
    mat4 mm = modelMatrix;
  #endif
  vec4 wp = mm * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(mm) * normal);
  vC = c; vM = aMat;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const PAINT_FS = `
uniform vec3 uKeyDir, uKeyCol, uAmb, uSkyTop, uSkyHor, uGround, uLampCol, uRim;
uniform float uScroll, uLampGap, uTail, uHead, uGloss;
varying vec3 vC; varying float vM; varying vec3 vN; varying vec3 vW; varying float vFade;
#include <fog_pars_fragment>
void main() {
  // Screen-door fade for traffic between the camera and the hero car.
  if (vFade > 0.001 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) < vFade) discard;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 R = reflect(-V, N);
  float ndv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - ndv, 4.0);
  float ndl = max(dot(N, uKeyDir), 0.0);
  float h = R.y;
  vec3 env = mix(uGround, uSkyHor, smoothstep(-0.3, 0.02, h));
  env = mix(env, uSkyTop, smoothstep(0.06, 0.65, h));
  // Street lamps overhead slide back over the body as it drives.
  float ph = fract((vW.z + R.z * 3.0 + uScroll) / uLampGap);
  float lamp = smoothstep(0.08, 0.0, abs(ph - 0.5) - 0.02) * smoothstep(0.2, 0.75, h) * smoothstep(0.0, 0.4, abs(R.x) + 0.25);
  env += uLampCol * lamp;
  vec3 col;
  float m = vM;
  vec3 diff = vC * (uAmb + uKeyCol * ndl);
  if (m < 0.5) {                      // paint: clear-coat
    float spec = pow(max(dot(R, uKeyDir), 0.0), 70.0);
    col = diff + env * (0.06 + 0.85 * fres) * uGloss + uKeyCol * spec * 0.9 + uRim * fres * 0.6;
  } else if (m < 1.5) {               // glass
    col = vC * 0.3 + mix(env, uSkyTop * 2.0 + vec3(0.02, 0.03, 0.07), 0.55) * (0.35 + 0.75 * fres) + uLampCol * lamp * 0.5;
  } else if (m < 2.5) {               // matte trim
    col = diff * 0.9 + env * 0.06 * fres;
  } else if (m < 3.5) {               // tail lights
    col = vC * uTail;
  } else if (m < 4.5) {               // chrome
    col = vC * 0.15 + env * 1.25 + uKeyCol * pow(max(dot(R, uKeyDir), 0.0), 30.0);
  } else if (m < 5.5) {               // rubber
    col = vC * (uAmb + uKeyCol * ndl * 0.5);
  } else {                            // head lights
    col = vC * uHead;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function createCarKit(THREE) {
  const C = (hex) => new THREE.Color(hex);

  // ── Geometry builder: merges anything into one non-indexed geometry ──
  class Builder {
    constructor() { this.pos = []; this.nor = []; this.col = []; this.mat = []; }
    add(geo, matrix, color, mat) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (!g.attributes.normal) g.computeVertexNormals();
      const p = g.attributes.position, n = g.attributes.normal;
      const nm = new THREE.Matrix3().getNormalMatrix(matrix), v = new THREE.Vector3(), c = C(color);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(matrix); this.pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); this.nor.push(v.x, v.y, v.z);
        this.col.push(c.r, c.g, c.b); this.mat.push(mat);
      }
      if (g !== geo) g.dispose();
      geo.dispose();
      return this;
    }
    // Box / cylinder / sphere helpers at (x, y, z) with rotation (rx, ry, rz).
    m4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    }
    box(w, h, d, x, y, z, color, mat, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), this.m4(x, y, z, rx, ry, rz), color, mat); }
    cyl(r0, r1, len, seg, x, y, z, color, mat, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(r0, r1, len, seg), this.m4(x, y, z, rx, ry, rz), color, mat); }
    // Mirror everything added after `from` across x = 0.
    mirrorFrom(from) {
      const n = this.pos.length / 3;
      for (let t = from; t < n; t += 3) {
        for (const k of [0, 2, 1]) {          // reversed winding
          const i = t + k;
          this.pos.push(-this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
          this.nor.push(-this.nor[i * 3], this.nor[i * 3 + 1], this.nor[i * 3 + 2]);
          this.col.push(this.col[i * 3], this.col[i * 3 + 1], this.col[i * 3 + 2]);
          this.mat.push(this.mat[i]);
        }
      }
      return this;
    }
    get count() { return this.pos.length / 3; }
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
      g.computeBoundingSphere();
      return g;
    }
  }

  // ── Lofted body: half cross-sections along z (front = -z) ──
  // Station: [z, yb, wb, yr, wr, wm, ym, ws, ys, wg, yg, wt, yt, yc, cabin, intake]
  // Profile (half, x ≥ 0): P0 (0,yb) P1 (wb,yb) P2 (wr,yr) P3 (wm,ym)
  // P4 (ws,ys) P5 (wg,yg) P6 (wt,yt) P7 (0,yc). Bands between them get
  // their own material: underbody, sill, side (or intake), fender, deck,
  // glass (cabin) or paint, roof.
  function loft(B, stations, { paint, trim = 0x16161a, glass = 0x0d1424, axles = [], axleY = 0.35, archR = 0.46, sub = 3, intakeCol = 0x0b0b0e }) {
    const S = [];
    const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    for (let i = 0; i < stations.length - 1; i++) {
      for (let k = 0; k < sub; k++) {
        const t = k / sub, a = stations[Math.max(0, i - 1)], b = stations[i], c = stations[i + 1], d = stations[Math.min(stations.length - 1, i + 2)];
        S.push(b.map((_, j) => (j >= 14 ? b[j] + (c[j] - b[j]) * t : cr(a[j], b[j], c[j], d[j], t))));
      }
    }
    S.push(stations[stations.length - 1].slice());
    const prof = S.map((s) => {
      const [z, yb, wb, yr, wr, wm, ym, ws, ys, wg, yg, wt, yt, yc] = s;
      let y2 = yr, y3 = ym, y1 = yb;
      for (const za of axles) {
        const dz = z - za;
        if (Math.abs(dz) < archR) {
          const ay = axleY + Math.sqrt(archR * archR - dz * dz);
          y1 = Math.max(y1, Math.min(ay - 0.06, yr - 0.01));
          y2 = Math.max(y2, Math.min(ay, ys - 0.12));
          y3 = Math.max(y3, Math.min(ay + 0.05, ys - 0.06));
        }
      }
      return [[0, y1, z], [wb, y1, z], [wr, y2, z], [wm, y3, z], [ws, ys, z], [wg, yg, z], [wt, yt, z], [0, yc, z]];
    });
    const bandMat = (b, s) => {
      if (b <= 1) return [trim, 2];
      if (b === 2) return s[15] > 0.5 ? [intakeCol, 2] : [paint, 0];
      if (b === 5) return s[14] > 0.5 ? [glass, 1] : [paint, 0];
      return [paint, 0];
    };
    const start = B.count;
    for (let b = 0; b < 7; b++) {
      for (let i = 0; i < S.length - 1; i++) {
        const [colA, matA] = bandMat(b, S[i]), [colB, matB] = bandMat(b, S[i + 1]);
        const [col, mat] = matA === matB ? [colA, matA] : (S[i][14] + S[i + 1][14] > 1 || S[i][15] + S[i + 1][15] > 1) ? (matA === 0 ? [colB, matB] : [colA, matA]) : [paint, 0];
        const a0 = prof[i][b], a1 = prof[i][b + 1], b0 = prof[i + 1][b], b1 = prof[i + 1][b + 1];
        const g = new THREE.BufferGeometry();
        // Outward winding for the +x half (front = -z).
        g.setAttribute('position', new THREE.Float32BufferAttribute([...a0, ...a1, ...b1, ...a0, ...b1, ...b0], 3));
        g.computeVertexNormals();
        B.add(g, new THREE.Matrix4(), col, mat);
      }
    }
    B.mirrorFrom(start);
    // End caps (fans).
    const cap = (pr, flip, col, mat) => {
      const pts = [];
      for (const p of pr) pts.push(p);
      for (let k = pr.length - 2; k >= 1; k--) pts.push([-pr[k][0], pr[k][1], pr[k][2]]);
      let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; }
      cx /= pts.length; cy /= pts.length;
      const z = pr[0][2], arr = [];
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k], q = pts[(k + 1) % pts.length];
        if (flip) arr.push(cx, cy, z, ...q, ...p); else arr.push(cx, cy, z, ...p, ...q);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      B.add(g, new THREE.Matrix4(), col, mat);
    };
    cap(prof[0], true, paint, 0);
    cap(prof[prof.length - 1], false, 0x121216, 2);
    return prof;
  }

  // ── The hero: red Italian-style mid-engine supercar ──
  const HERO = [
    [-2.30, 0.22, 0.52, 0.26, 0.64, 0.70, 0.33, 0.66, 0.40, 0.50, 0.42, 0.25, 0.43, 0.43, 0, 0],
    [-2.12, 0.15, 0.70, 0.19, 0.86, 0.91, 0.38, 0.87, 0.52, 0.62, 0.55, 0.32, 0.57, 0.57, 0, 0],
    [-1.82, 0.14, 0.78, 0.17, 0.94, 0.99, 0.45, 0.95, 0.66, 0.68, 0.63, 0.38, 0.64, 0.63, 0, 0],
    [-1.42, 0.14, 0.80, 0.17, 0.96, 1.01, 0.49, 0.96, 0.72, 0.70, 0.67, 0.44, 0.68, 0.67, 0, 0],
    [-1.08, 0.14, 0.80, 0.17, 0.94, 0.99, 0.51, 0.94, 0.73, 0.73, 0.75, 0.54, 0.76, 0.75, 0, 0],
    [-0.84, 0.14, 0.80, 0.17, 0.93, 0.98, 0.52, 0.93, 0.74, 0.75, 0.78, 0.62, 0.86, 0.87, 1, 0],
    [-0.44, 0.14, 0.80, 0.17, 0.92, 0.97, 0.53, 0.92, 0.75, 0.77, 0.80, 0.61, 1.07, 1.10, 1, 0],
    [-0.04, 0.14, 0.80, 0.17, 0.91, 0.96, 0.54, 0.91, 0.76, 0.77, 0.81, 0.57, 1.16, 1.19, 1, 0],
    [0.34, 0.14, 0.80, 0.17, 0.84, 0.88, 0.55, 0.90, 0.77, 0.75, 0.82, 0.55, 1.13, 1.16, 1, 1],
    [0.74, 0.14, 0.80, 0.17, 0.84, 0.89, 0.56, 0.95, 0.79, 0.73, 0.84, 0.51, 1.01, 1.03, 1, 1],
    [1.08, 0.14, 0.82, 0.17, 0.97, 1.02, 0.57, 1.00, 0.80, 0.70, 0.86, 0.45, 0.93, 0.94, 1, 0],
    [1.42, 0.14, 0.83, 0.18, 0.99, 1.03, 0.58, 1.01, 0.81, 0.68, 0.86, 0.40, 0.89, 0.89, 0, 0],
    [1.84, 0.16, 0.82, 0.21, 0.98, 1.01, 0.60, 0.99, 0.82, 0.66, 0.85, 0.38, 0.87, 0.87, 0, 0],
    [2.18, 0.23, 0.76, 0.29, 0.93, 0.96, 0.62, 0.93, 0.80, 0.62, 0.82, 0.36, 0.83, 0.83, 0, 0],
    [2.30, 0.29, 0.66, 0.35, 0.83, 0.87, 0.62, 0.83, 0.76, 0.55, 0.78, 0.30, 0.78, 0.78, 0, 0],
  ];
  const HERO_AXLES = [-1.42, 1.42], WHEEL_R = 0.35, TRACK = 0.86;

  function heroBody(paint = 0xd8101e) {
    const B = new Builder();
    loft(B, HERO, { paint, axles: HERO_AXLES, axleY: WHEEL_R });
    const s = B.count;
    // One side's details (mirrored below).
    B.box(0.06, 0.03, 0.55, 0.62, 0.53, -2.02, 0xfff6e8, 6, 0.0, 0.32, -0.25);           // headlight slit
    B.box(0.32, 0.05, 0.04, 0.55, 0.46, -2.24, 0xfff6e8, 6, 0, 0.28, 0);                  // DRL under-strip
    B.box(0.3, 0.12, 0.05, 0.58, 0.26, -2.25, 0x0a0a0c, 2, 0, 0.2, 0);                    // front intake
    B.box(0.06, 0.07, 0.62, 0.995, 0.5, 0.54, 0x0a0a0c, 2, 0, 0, 0.1);                     // side intake lip
    B.box(0.03, 0.05, 0.18, 0.99, 0.82, -0.62, 0xd8101e, 0, 0, -0.2, 0.3);                // mirror stalk
    B.box(0.16, 0.09, 0.2, 1.06, 0.86, -0.62, paint, 0, 0, -0.15, 0);                      // mirror
    B.box(0.035, 0.04, 2.6, 0.98, 0.2, 0.0, 0x0a0a0c, 2);                                  // side skirt
    B.box(0.48, 0.07, 0.05, 0.56, 0.72, 2.29, 0xff1830, 3, 0, 0, 0.06);                    // tail light bar
    B.cyl(0.075, 0.075, 0.05, 14, 0.66, 0.62, 2.29, 0xff1a2a, 3, Math.PI / 2, 0, 0);       // round tail lamp
    B.cyl(0.075, 0.075, 0.05, 14, 0.4, 0.62, 2.31, 0xff1a2a, 3, Math.PI / 2, 0, 0);
    B.cyl(0.05, 0.05, 0.18, 12, 0.13, 0.33, 2.3, 0xd8dde6, 4, Math.PI / 2, 0, 0);           // exhaust tips
    B.cyl(0.05, 0.05, 0.18, 12, 0.27, 0.33, 2.3, 0xd8dde6, 4, Math.PI / 2, 0, 0);
    B.box(0.26, 0.05, 0.6, 0.46, 0.84, 0.9, 0x0a0a0c, 2, 0, 0, 0);                          // engine louvres
    B.box(0.06, 0.18, 0.12, 0.84, 0.36, -1.42 + 0.12, 0xe0202a, 0, 0, 0, 0);               // brake calipers
    B.box(0.06, 0.18, 0.12, 0.84, 0.36, 1.42 - 0.12, 0xe0202a, 0, 0, 0, 0);
    B.box(0.06, 0.38, 0.03, 0.62, 1.0, 1.98, 0x16161a, 2, 0.2, 0, 0);                       // spoiler struts
    B.box(0.12, 0.1, 0.36, 0.9, 1.15, 2.0, 0x16161a, 2);                                     // spoiler endplate
    B.mirrorFrom(s);
    B.box(1.82, 0.04, 0.36, 0, 1.18, 2.02, paint, 0, -0.12, 0, 0);                          // rear wing
    B.box(1.84, 0.02, 0.06, 0, 1.2, 2.2, 0x0a0a0c, 2, -0.12, 0, 0);                         // wing gurney
    B.box(1.4, 0.08, 0.32, 0, 0.17, 2.22, 0x0e0e12, 2, 0.35, 0, 0);                         // diffuser
    for (let k = -2; k <= 2; k++) B.box(0.02, 0.12, 0.3, k * 0.22, 0.2, 2.2, 0x1a1a20, 2, 0.35, 0, 0);
    B.box(1.5, 0.04, 0.28, 0, 0.13, -2.22, 0x0e0e12, 2);                                    // front splitter
    B.box(1.0, 0.06, 0.04, 0, 0.73, 2.25, 0x0a0a0c, 2);                                     // tail centre panel
    B.box(0.5, 0.03, 0.06, 0, 0.62, -2.26, 0x0a0a0c, 2);                                    // nose grille line
    return B.build();
  }

  // Wheel: tyre + 5-spoke rim, axis along x, centred; spins about x.
  function wheel(r = WHEEL_R, w = 0.3, rim = 0x2a2c33, spokes = 5, side = 1) {
    const B = new Builder();
    B.cyl(r, r, w, 22, 0, 0, 0, 0x101012, 5, 0, 0, Math.PI / 2);
    B.cyl(r * 0.72, r * 0.72, 0.02, 22, side * (w / 2 + 0.005), 0, 0, 0x0c0c10, 2, 0, 0, Math.PI / 2);
    B.add(new THREE.TorusGeometry(r * 0.72, 0.025, 5, 22), B.m4(side * (w / 2 + 0.01), 0, 0, 0, Math.PI / 2, 0), 0xc8ccd6, 4);
    for (let k = 0; k < spokes; k++) {
      const a = k / spokes * Math.PI * 2;
      B.box(0.03, r * 0.66, 0.07, side * (w / 2 + 0.02), Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, rim === 0x2a2c33 ? 0xb8bcc6 : rim, 4, a, 0, 0);
    }
    B.cyl(0.055, 0.055, 0.04, 10, side * (w / 2 + 0.03), 0, 0, 0x16161a, 2, 0, 0, Math.PI / 2);
    return B.build();
  }

  // ── Traffic ──
  const SEDAN = [
    [-2.25, 0.3, 0.7, 0.34, 0.82, 0.86, 0.5, 0.84, 0.64, 0.6, 0.66, 0.3, 0.67, 0.67, 0, 0],
    [-1.6, 0.25, 0.8, 0.3, 0.9, 0.92, 0.55, 0.9, 0.76, 0.66, 0.78, 0.4, 0.79, 0.79, 0, 0],
    [-0.9, 0.25, 0.8, 0.3, 0.9, 0.92, 0.56, 0.9, 0.8, 0.7, 0.86, 0.55, 0.95, 0.96, 1, 0],
    [-0.4, 0.25, 0.8, 0.3, 0.9, 0.92, 0.57, 0.88, 0.82, 0.72, 0.9, 0.62, 1.38, 1.42, 1, 0],
    [0.6, 0.25, 0.8, 0.3, 0.9, 0.92, 0.57, 0.88, 0.82, 0.72, 0.9, 0.62, 1.38, 1.42, 1, 0],
    [1.3, 0.25, 0.8, 0.3, 0.9, 0.92, 0.56, 0.9, 0.82, 0.7, 0.88, 0.55, 1.02, 1.03, 1, 0],
    [1.9, 0.27, 0.8, 0.32, 0.9, 0.92, 0.56, 0.9, 0.84, 0.66, 0.86, 0.4, 0.87, 0.87, 0, 0],
    [2.3, 0.32, 0.72, 0.36, 0.84, 0.86, 0.56, 0.84, 0.8, 0.6, 0.82, 0.3, 0.82, 0.82, 0, 0],
  ];
  const SUV = SEDAN.map((s) => s.map((v, j) => (j === 0 ? v * 1.06 : j >= 1 && j <= 13 && j % 2 === 1 ? v * 1.28 + 0.06 : j >= 2 && j <= 12 && j % 2 === 0 ? v * 1.04 : v)));
  for (const s of SUV) if (s[14] > 0.5) { s[12] = Math.max(s[12], 1.85); s[13] = Math.max(s[13], 1.9); }
  SUV[2][12] = 1.5; SUV[2][13] = 1.52; SUV[5][12] = 1.8; SUV[5][13] = 1.84;

  function tailLights(B, z, y, w, wl = 0.3) {
    B.box(wl, 0.12, 0.05, w - wl / 2 - 0.04, y, z, 0xff2030, 3);
    B.box(wl, 0.12, 0.05, -(w - wl / 2 - 0.04), y, z, 0xff2030, 3);
  }
  function wheelsOf(B, axles, x, r = 0.34, w = 0.26) {
    for (const z of axles) for (const sx of [1, -1]) B.cyl(r, r, w, 14, sx * x, r, z, 0x111114, 5, 0, 0, Math.PI / 2);
  }
  const traffic = {
    sedan() {
      const B = new Builder();
      loft(B, SEDAN, { paint: 0xffffff, axles: [-1.45, 1.45], axleY: 0.34, archR: 0.42 });
      wheelsOf(B, [-1.45, 1.45], 0.78);
      tailLights(B, 2.31, 0.72, 0.84);
      B.box(0.32, 0.1, 0.05, 0.6, 0.6, -2.27, 0xfff4dc, 6); B.box(0.32, 0.1, 0.05, -0.6, 0.6, -2.27, 0xfff4dc, 6);
      return { geo: B.build(), len: 4.6, w: 1.8, tail: [2.33, 0.72, 0.66] };
    },
    suv() {
      const B = new Builder();
      loft(B, SUV, { paint: 0xffffff, axles: [-1.55, 1.55], axleY: 0.4, archR: 0.48 });
      wheelsOf(B, [-1.55, 1.55], 0.82, 0.4, 0.3);
      tailLights(B, 2.45, 1.05, 0.9, 0.22);
      B.box(1.3, 0.06, 0.06, 0, 1.92, 0.2, 0x202024, 2);                                   // roof rails
      return { geo: B.build(), len: 4.9, w: 1.9, tail: [2.47, 1.05, 0.76] };
    },
    truck() {
      const B = new Builder();
      B.box(2.2, 2.3, 4.6, 0, 1.75, 0.9, 0xffffff, 0);                                      // box
      B.box(2.1, 1.7, 1.9, 0, 1.25, -2.4, 0xd8d8dc, 0);                                     // cab
      B.box(1.9, 0.75, 0.05, 0, 1.75, -3.36, 0x0d1424, 1, -0.15, 0, 0);                    // windscreen
      B.box(2.22, 0.12, 4.62, 0, 0.62, 0.9, 0x18181c, 2);                                   // bumper rail
      B.box(2.0, 0.4, 0.06, 0, 0.55, 3.22, 0x18181c, 2);                                    // rear bumper
      for (let k = 0; k < 3; k++) B.box(2.21, 0.04, 0.05, 0, 1.0 + k * 0.7, 3.21, 0xf2b81e, 3);  // reflector stripes
      wheelsOf(B, [-2.4, 1.8, 2.6], 0.92, 0.42, 0.3);
      tailLights(B, 3.25, 0.75, 1.08, 0.22);
      B.box(0.25, 0.12, 0.05, 0.85, 0.85, -3.37, 0xfff4dc, 6); B.box(0.25, 0.12, 0.05, -0.85, 0.85, -3.37, 0xfff4dc, 6);
      return { geo: B.build(), len: 6.8, w: 2.2, tail: [3.27, 0.75, 0.97] };
    },
    semi() {
      const B = new Builder();
      B.box(2.5, 2.7, 10.5, 0, 2.0, 2.0, 0xffffff, 0);                                      // trailer
      B.box(2.52, 0.08, 10.52, 0, 3.32, 2.0, 0xe8e8ea, 0);
      for (let k = 0; k < 8; k++) B.box(2.53, 2.6, 0.04, 0, 2.0, -3.0 + k * 1.4, 0xdadade, 0);   // ribs
      B.box(2.5, 0.1, 0.05, 0, 0.75, 7.26, 0xf2b81e, 3);                                    // ICC bar reflector
      B.box(2.3, 2.0, 2.4, 0, 1.75, -4.9, 0x2a2a30, 0);                                     // tractor cab (tinted by colour)
      B.box(2.1, 0.9, 0.05, 0, 2.2, -6.12, 0x0d1424, 1, -0.1, 0, 0);
      B.box(2.32, 0.5, 0.6, 0, 3.0, -4.6, 0x2a2a30, 0, 0.3, 0, 0);                         // fairing
      B.cyl(0.09, 0.09, 1.6, 8, 1.05, 2.9, -3.8, 0xd8dde6, 4);                              // stacks
      B.cyl(0.09, 0.09, 1.6, 8, -1.05, 2.9, -3.8, 0xd8dde6, 4);
      wheelsOf(B, [-5.3, -3.6, 5.4, 6.6], 1.05, 0.5, 0.42);
      tailLights(B, 7.27, 0.95, 1.22, 0.2);
      B.box(2.4, 0.06, 0.06, 0, 3.36, 7.26, 0xff6a20, 3);                                   // marker lights
      B.box(0.28, 0.14, 0.05, 0.9, 1.0, -6.13, 0xfff4dc, 6); B.box(0.28, 0.14, 0.05, -0.9, 1.0, -6.13, 0xfff4dc, 6);
      return { geo: B.build(), len: 13.6, w: 2.5, tail: [7.3, 0.95, 1.1] };
    },
  };

  // ── The shader ──
  function paintMaterial(opts = {}) {
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uKeyDir: { value: new THREE.Vector3(0.35, 0.8, 0.45).normalize() },
      uKeyCol: { value: C(0xbfc8ff).multiplyScalar(0.7) },
      uAmb: { value: C(0x30304a) },
      uSkyTop: { value: C(0x0b0d22) },
      uSkyHor: { value: C(0xff7a4a).multiplyScalar(0.55) },
      uGround: { value: C(0x08080c) },
      uLampCol: { value: C(0xffb870).multiplyScalar(1.4) },
      uRim: { value: C(0x6a3cff).multiplyScalar(0.25) },
      uScroll: { value: 0 }, uLampGap: { value: 30 }, uTail: { value: 1.6 }, uHead: { value: 1.8 }, uGloss: { value: 1 },
    }]);
    for (const [k, v] of Object.entries(opts)) if (u[k]) u[k].value = v;
    return new THREE.ShaderMaterial({ uniforms: u, vertexShader: PAINT_VS, fragmentShader: PAINT_FS, fog: true });
  }

  return { Builder, heroBody, wheel, traffic, paintMaterial, HERO_AXLES, WHEEL_R, TRACK };
}

// The hero car as a ready group: body + four spinning wheels.
// Returns { group, body, wheels: [{ mesh, front, side }], material, dispose }.
export function buildHeroCar(THREE, kit, material, { paint } = {}) {
  const group = new THREE.Group();
  const bodyGeo = kit.heroBody(paint), wheelGeoL = kit.wheel(kit.WHEEL_R, 0.3, 0x2a2c33, 5, 1), wheelGeoR = kit.wheel(kit.WHEEL_R, 0.3, 0x2a2c33, 5, -1);
  const body = new THREE.Mesh(bodyGeo, material);
  group.add(body);
  const wheels = [];
  for (const z of kit.HERO_AXLES) for (const side of [1, -1]) {
    const pivot = new THREE.Group();                 // steering pivot
    pivot.position.set(side * kit.TRACK, kit.WHEEL_R, z);
    const mesh = new THREE.Mesh(side > 0 ? wheelGeoL : wheelGeoR, material);
    pivot.add(mesh);
    group.add(pivot);
    wheels.push({ mesh, pivot, front: z < 0, side });
  }
  return {
    group, body, wheels,
    dispose() { bodyGeo.dispose(); wheelGeoL.dispose(); wheelGeoR.dispose(); },
  };
}
