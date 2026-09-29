// BoardTransition — the "enter the world behind the board" effect.
//
// The frozen Tetris board is captured into a texture and rebuilt as a grid
// of 3D tiles positioned so they sit exactly on top of the 2D board on
// screen. Going in, the tiles charge up, ripple, then shatter outward from
// the cleared line while the camera flies through the gap into the stage.
// Coming back, the same tiles fly in from around the camera and reassemble
// into the board, pixel-aligned with the live 2D canvas it hands back to.

import * as THREE from '../vendor/three/three.module.min.js';

export const START_POSE = {
  pos: new THREE.Vector3(0, 1.6, 15.6),   // camera where the board fills its screen rect
  fov: 42,
};
const BOARD_DIST = 3.0;                    // board plane distance in front of START_POSE

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class BoardTransition {
  // cols/rows: board grid; specialCells: [[c, r]] cells glowing gold;
  // impactRow: the cleared line the shatter starts from.
  constructor({ canvas, cols, rows, specialCells = [], impactRow = null }) {
    this.cols = cols;
    this.rows = rows;
    // Snapshot the board bitmap now — the texture must not change later.
    const snap = document.createElement('canvas');
    const bw = canvas._dpr ? Math.round(canvas.width * canvas._dpr) : canvas.width;
    const bh = canvas._dpr ? Math.round(canvas.height * canvas._dpr) : canvas.height;
    snap.width = bw; snap.height = bh;
    snap.getContext('2d').drawImage(canvas, 0, 0, bw, bh, 0, 0, bw, bh);
    this.texture = new THREE.CanvasTexture(snap);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.group = new THREE.Group();
    this.mat = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false, depthWrite: false });
    this.glowMat = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false, depthWrite: false });
    this.geoms = [];
    const special = new Set(specialCells.map(([c, r]) => c + ',' + r));
    this.impact = new THREE.Vector2(0, impactRow == null ? 0 : (0.5 - (impactRow + 0.5) / rows));
    this.tiles = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const geo = new THREE.PlaneGeometry(1, 1);
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i, (c + uv.getX(i)) / cols, 1 - (r + 1 - uv.getY(i)) / rows);
        }
        this.geoms.push(geo);
        const isSpecial = special.has(c + ',' + r);
        const m = new THREE.Mesh(geo, isSpecial ? this.glowMat : this.mat);
        m.renderOrder = 3;
        this.group.add(m);
        // Normalised board coords (-0.5..0.5, y up).
        const u = (c + 0.5) / cols - 0.5, v = 0.5 - (r + 0.5) / rows;
        const dx = u - this.impact.x, dy = v - this.impact.y;
        const d = Math.hypot(dx, dy * 0.5) + 1e-3;
        this.tiles.push({
          mesh: m, u, v, special: isSpecial,
          delay: d * 0.55,
          vel: new THREE.Vector3(dx / d * (1.5 + rnd() * 2.5), dy / d * (1.5 + rnd() * 2.5) + 0.8, 3 + rnd() * 5),
          spin: new THREE.Vector3((rnd() - 0.5) * 9, (rnd() - 0.5) * 9, (rnd() - 0.5) * 6),
        });
      }
    }

    // Black curtain between the board and the world, riding with the camera.
    this.curtain = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({ color: 0x05050f, transparent: true, depthTest: false, depthWrite: false }));
    this.curtain.renderOrder = 2;
    this.curtain.position.z = -BOARD_DIST - 0.3;
  }

  attach(scene, camera) {
    scene.add(this.group);
    camera.add(this.curtain);
    if (!camera.parent) scene.add(camera);
  }

  // Size/position the board plane so it covers `rect` (CSS px) exactly when
  // viewed from START_POSE with the camera looking straight down -z.
  layout(rect, vw, vh) {
    const worldPerPx = (2 * BOARD_DIST * Math.tan(THREE.MathUtils.degToRad(START_POSE.fov / 2))) / vh;
    this.w = rect.width * worldPerPx;
    this.h = rect.height * worldPerPx;
    this.center = new THREE.Vector3(
      START_POSE.pos.x + (rect.left + rect.width / 2 - vw / 2) * worldPerPx,
      START_POSE.pos.y - (rect.top + rect.height / 2 - vh / 2) * worldPerPx,
      START_POSE.pos.z - BOARD_DIST,
    );
    this._place(0, 0);
  }

  // Put every tile at its grid spot, displaced by the shatter at time `s`
  // (seconds into the break) and a ripple amount.
  _place(s, ripple, time = 0) {
    const tw = this.w / this.cols, th = this.h / this.rows;
    for (const t of this.tiles) {
      const m = t.mesh;
      const bx = this.center.x + t.u * this.w, by = this.center.y + t.v * this.h;
      const lt = Math.max(0, s - t.delay);
      const z = ripple * Math.sin((t.u * 9 + t.v * 5) + time * 18) * 0.05 * (1 + (t.special ? 1.5 : 0));
      m.position.set(bx + t.vel.x * lt * 1.6, by + t.vel.y * lt * 1.6 - 2.2 * lt * lt, this.center.z + z + t.vel.z * lt);
      m.rotation.set(t.spin.x * lt, t.spin.y * lt, t.spin.z * lt);
      const sc = 1 - Math.min(0.6, lt * 0.35);
      m.scale.set(tw * 1.001 * sc, th * 1.001 * sc, 1);
    }
  }

  // Going in. `t` in seconds since the transition started.
  //   0.00–0.55  charge: board brightens, special cells blaze, ripple builds
  //   0.55–      shatter from the cleared line, curtain opens on the world
  updateIn(t) {
    const charge = clamp01(t / 0.55);
    const s = Math.max(0, t - 0.55);
    this._place(s, charge * (s > 0 ? Math.max(0, 1 - s * 3) : 1), t);
    const glow = 1 + 0.9 * charge * (0.6 + 0.4 * Math.sin(t * 30));
    this.mat.color.setScalar(1 + 0.35 * charge);
    this.glowMat.color.setRGB(glow * 1.3, glow * 1.1, glow * 0.6);
    this.mat.opacity = this.glowMat.opacity = 1 - clamp01((s - 0.45) / 0.5);
    this.curtain.material.opacity = 1 - clamp01((t - 0.75) / 0.6);
    this.group.visible = this.mat.opacity > 0.01;
  }

  // Coming back. `t` in seconds since the return started (total `dur`).
  updateOut(t, dur) {
    const assembleAt = dur - 0.55;
    const s = Math.max(0, (assembleAt - t) * 0.9);        // shatter time, running backwards
    this._place(s, 0, t);
    const settle = clamp01((t - assembleAt) / 0.35);
    this.mat.opacity = this.glowMat.opacity = clamp01((t - 0.35) / 0.6);
    const flash = settle > 0 ? 1 + 0.6 * (1 - settle) : 1;
    this.mat.color.setScalar(flash);
    this.glowMat.color.setScalar(flash);
    this.curtain.material.opacity = clamp01((t - 0.5) / 0.9);
    this.group.visible = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.curtain.removeFromParent();
    for (const g of this.geoms) g.dispose();
    this.curtain.geometry.dispose();
    this.curtain.material.dispose();
    this.mat.dispose(); this.glowMat.dispose(); this.texture.dispose();
  }
}

// Camera path between START_POSE (looking straight at the board) and the
// battle framing. u: 0 = at the board, 1 = in the world.
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _m = new THREE.Matrix4();
export function cameraAlongPath(camera, u, endPos, endLook, endFov) {
  const e = ease(clamp01(u));
  camera.position.lerpVectors(START_POSE.pos, endPos, e);
  _q0.identity();                                         // straight down -z
  _m.lookAt(endPos, endLook, camera.up);
  _q1.setFromRotationMatrix(_m);
  camera.quaternion.slerpQuaternions(_q0, _q1, e);
  // Wide "warp" FOV while passing through the board.
  camera.fov = THREE.MathUtils.lerp(START_POSE.fov, endFov, e) + Math.sin(Math.PI * e) * 22;
  camera.updateProjectionMatrix();
}
export { ease };
