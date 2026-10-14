// CameraDirector — frames both dancers by default and gets dynamic on the
// big moments: it drifts toward whoever's leading, pushes in for tier-3+
// moves and taunts, orbits the dancer on a tier-4 move, bumps on the beat,
// and frames the winner at the end. Shots are requested in beats so cuts
// land on the music.
//
// Framing is fitted to the part of the screen the HUD leaves free (the
// "stage" rect, BattleHUD.layout): every shot is pulled back just enough
// for its subject — both dancers head to feet, or one dancer for the close
// shots — to fit that rect, and a projection offset (setViewOffset) centres
// it there. The two-shot sits low in the rect (feet near its bottom), so
// banners have room above the heads.

import * as THREE from '../vendor/three/three.module.min.js';

const lerp = (a, b, t) => a + (b - a) * t;
// Subject boxes (world units): a dancer is ~2.1 tall; arms up / hair reach
// ~2.55. Width per dancer includes the arms' reach.
const BODY_H = 2.6, BODY_Y = 1.25;
// Only SOLO TIME and the winner's shot frame one dancer; every shot during
// normal play keeps both dancers head to feet.
const SINGLE = new Set(['solo', 'winner']);
// How much of the stage rect the subject may fill.
const FILL_W = 0.94, FILL_H = 0.86;

export class CameraDirector {
  constructor(camera, anchors) {
    this.cam = camera;
    this.anchors = anchors;          // { player: Vector3, rival: Vector3 }
    this.pos = new THREE.Vector3(0, 2.1, 8.6);
    this.look = new THREE.Vector3(0, 1.25, 0);
    this.fov = 42;
    this.roll = 0;
    this.shot = { kind: 'two', until: -Infinity };
    this.motion = true;
    this.stage = null;               // { W, H, rect }
    this.off = { x: 0, y: 0 };       // current projection offset (px)
    this._offT = { x: 0, y: 0 };
    this._tp = new THREE.Vector3();
    this._tl = new THREE.Vector3();
  }

  // The free screen areas from the HUD: { W, H, rects: [{left,right,top,bottom}] }.
  // Picks the one where the two dancers come out biggest.
  setStage({ W, H, rects }) {
    const P = this.anchors.player, R = this.anchors.rival;
    const bw = Math.abs(R.x - P.x) + 2 * this.halfW;
    let best = null, bestS = -1;
    for (const r of rects) {
      const s = Math.min((r.right - r.left) * FILL_W / bw, (r.bottom - r.top) * FILL_H / BODY_H);
      if (s > bestS) { bestS = s; best = r; }
    }
    this.stage = { W, H, rect: best || { left: 0, right: W, top: 0, bottom: H } };
    return this.stage.rect;
  }

  _baseFov() { return 42 + ((this.cam.aspect || 1.6) < 1.3 ? 4 : 0); }
  // Two-shot camera height over the dancers' middle (per 8.6 units out): a
  // little above eye level, higher on narrow screens — the camera is
  // further back there, and the angle keeps front-of-stage props (fences,
  // the crowd's heads) below the line to the dancers' feet.
  _rise() { return (this.cam.aspect || 1.6) < 1 ? 1.9 : 1.2; }
  // Half-width of a dancer incl. arms out.
  get halfW() { return 0.74; }

  // Distance at which a box (w × h world units) fits the stage rect (a
  // first guess; _fit refines it by projection).
  fitDistance(w, h, fov) {
    const st = this.stage, aspect = this.cam.aspect || 1.6;
    const t = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const fx = st ? (st.rect.right - st.rect.left) / st.W : 1, fy = st ? (st.rect.bottom - st.rect.top) / st.H : 1;
    return Math.max(h / (2 * t * fy * FILL_H), w / (2 * t * aspect * fx * FILL_W));
  }

  // Fit a shot by projection: the dancers' real 3D bounds (feet to raised
  // hands, arms' reach, a step's depth) are projected through the shot's
  // pose — perspective, side angles and dutch roll included — and the
  // distance along the shot's view line is scaled until they fit the stage
  // rect (exactly for the two-shot, at least for the rest). Moves tp in
  // place; returns the projection offset { ox, oy } (px) that puts them in
  // the rect: low in it for the two-shot (feet near the bottom), centred
  // otherwise.
  _fit(tp, tl, fov, roll, who, exact, low = exact) {
    const st = this.stage;
    if (!st) return null;
    const hw = this.halfW, pts = this._pts || (this._pts = Array.from({ length: 16 }, () => new THREE.Vector3()));
    let n = 0;
    for (const a of who) for (const x of [-hw, hw]) for (const y of [-0.02, BODY_H - 0.05]) for (const z of [-0.25, 0.25]) pts[n++].set(a.x + x, y, a.z + z);
    const cam = this._tmp || (this._tmp = new THREE.PerspectiveCamera());
    cam.fov = fov; cam.aspect = this.cam.aspect || 1.6; cam.near = 0.1; cam.far = 400; cam.updateProjectionMatrix();
    const r = st.rect;
    const allowX = 2 * FILL_W * (r.right - r.left) / st.W, allowY = 2 * FILL_H * (r.bottom - r.top) / st.H;
    const dir = this._dir || (this._dir = new THREE.Vector3());
    dir.copy(tp).sub(tl);
    const d0 = dir.length();
    dir.divideScalar(d0);
    const q = this._q || (this._q = new THREE.Vector3());
    let dist = exact ? this.fitDistance(Math.abs(who[who.length - 1].x - who[0].x) + 2 * hw, BODY_H, fov) : d0;
    let box = null;
    for (let it = 0; it < 4; it++) {
      tp.copy(tl).addScaledVector(dir, dist);
      // Out past the front of the stage (fences, the crowd's heads ~5
      // units out), stay high enough that anything up to 1.5 tall there
      // passes below the line to the dancers' feet.
      const minY = tp.z > 4.8 ? 0.3 * (tp.z - 0.2) + 0.1 : 0;
      if (tp.y < minY) tp.y = minY;
      cam.position.copy(tp); cam.up.set(0, 1, 0); cam.lookAt(tl); cam.rotateZ(roll); cam.updateMatrixWorld();
      box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      for (let i = 0; i < n; i++) {
        q.copy(pts[i]).project(cam);
        box.x0 = Math.min(box.x0, q.x); box.x1 = Math.max(box.x1, q.x);
        box.y0 = Math.min(box.y0, q.y); box.y1 = Math.max(box.y1, q.y);
      }
      const need = Math.max((box.x1 - box.x0) / allowX, (box.y1 - box.y0) / allowY);
      const next = exact ? dist * need : Math.max(d0, dist * need);
      if (Math.abs(next - dist) < 0.01) break;
      dist = next;
    }
    // Where the box should sit (px), and where it is.
    const cx = (box.x0 + box.x1) / 2, top = (1 - box.y1) / 2 * st.H, bottom = (1 - box.y0) / 2 * st.H;
    const boxPx = bottom - top, rh = r.bottom - r.top;
    const tx = (r.left + r.right) / 2;
    // (every two-dancer shot sits the same way, so cuts don't jump)
    const ty = low ? Math.max(r.top + rh / 2, r.bottom - rh * 0.05 - boxPx / 2) : r.top + rh / 2;
    return { ox: (cx + 1) / 2 * st.W - tx, oy: (top + bottom) / 2 - ty };
  }

  // Request a shot for `beats` beats starting now.
  cut(kind, nowBeat, beats, data = {}) {
    this.shot = { kind, start: nowBeat, until: nowBeat + beats, ...data };
  }

  update(dt, { beat, leader }) {
    const P = this.anchors.player, R = this.anchors.rival;
    let s = this.shot;
    if (beat > s.until) s = this.shot = { kind: 'two', until: Infinity };
    const tp = this._tp, tl = this._tl;
    const base = this._baseFov();
    let fov = base, roll = 0;
    const bump = this.motion ? Math.exp(-(((beat % 1) + 1) % 1) * 8) : 0;

    switch (s.kind) {
      case 'close': {                       // lean in toward one dancer (both stay in frame)
        const a = s.who === 'rival' ? R : P, side = s.who === 'rival' ? 1 : -1;
        tp.set(a.x * 0.5, 1.55, 6.2);
        tl.set(a.x * 0.22, BODY_Y, 0);
        fov = base - 2;
        roll = -side * 0.04;
        break;
      }
      case 'orbit': {                       // swing around the pair on a tier-4 move
        const a = s.who === 'rival' ? R : P;
        const t = (beat - s.start) / (s.until - s.start);
        const ang = (s.who === 'rival' ? 1 : -1) * (-0.45 + 0.9 * t);
        tp.set(Math.sin(ang) * 7, 1.6 + Math.sin(t * Math.PI) * 0.5, Math.cos(ang) * 7);
        tl.set(a.x * 0.25, BODY_Y, 0);
        fov = base + 2;
        break;
      }
      case 'solo': {                        // SOLO TIME: low sweep around the soloist, pushing in
        const a = s.who === 'rival' ? R : P;
        const t = Math.max(0, Math.min(1, (beat - s.start) / (s.until - s.start)));
        const side = s.who === 'rival' ? 1 : -1;
        const ang = side * (-0.85 + 1.7 * t);
        const r = 5.6 - 0.9 * Math.sin(Math.PI * t);
        tp.set(a.x + Math.sin(ang) * r, 1.15 + 0.8 * t, a.z + Math.cos(ang) * r);
        tl.set(a.x, 1.1 + 0.15 * t, a.z);
        fov = base + 2 - 3 * t;
        roll = side * 0.07 * Math.sin(Math.PI * 2 * t);
        break;
      }
      case 'taunt': {                       // low dutch angle over the taunter
        const a = s.who === 'rival' ? R : P, b = s.who === 'rival' ? P : R;
        tp.set(a.x + (a.x - b.x) * 0.45, 1.0, 5.2);
        tl.set((a.x + b.x) / 2, 1.5, 0);
        fov = base + 4;
        roll = (s.who === 'rival' ? 1 : -1) * 0.1;
        break;
      }
      case 'wide':
        tp.set(0, 3.4, 12.5);
        tl.set(0, 2.0, 0);
        fov = base + 6;
        break;
      case 'winner': {
        const a = s.who === 'rival' ? R : P;
        const t = Math.min(1, (beat - s.start) / 4);
        tp.set(a.x * 0.7, 1.4 + t * 0.4, 5.0 - t * 0.6);
        tl.set(a.x, 1.4, a.z);
        fov = base - 2;
        break;
      }
      default: {                            // two-shot, drifting to the leader
        // (barely on narrow screens, where the pair fills the width)
        const lead = Math.max(-1, Math.min(1, leader || 0)) * ((this.cam.aspect || 1.6) < 1 ? 0.2 : 1);
        const sway = this.motion ? Math.sin(beat * Math.PI / 4) * 0.35 : 0;
        tp.set(-lead * 0.9 + sway, BODY_Y + this._rise() + (this.motion ? Math.sin(beat * Math.PI / 8) * 0.15 : 0), 8.6);
        tl.set(-lead * 0.6 * this._spread(), BODY_Y, 0);
      }
    }

    // Fit the subject into the stage rect: the two-shot sits exactly at the
    // fitting distance; the other shots are pulled back only if needed.
    const single = SINGLE.has(s.kind);
    const fit = this._fit(tp, tl, fov, roll, single ? (s.who === 'rival' ? [R] : [P]) : [P, R], s.kind === 'two', !single);
    const k = 1 - Math.exp(-dt * (s.kind === 'orbit' || s.kind === 'solo' ? 8 : 4.5));
    this.pos.lerp(tp, k);
    this.look.lerp(tl, k);
    this.fov = lerp(this.fov, fov, k);
    this.roll = lerp(this.roll, roll, k);
    if (fit) { this._offT.x = fit.ox; this._offT.y = fit.oy; }
    this.off.x = lerp(this.off.x, this._offT.x, k);
    this.off.y = lerp(this.off.y, this._offT.y, k);
    this.cam.position.copy(this.pos);
    this.cam.position.y -= bump * 0.03;
    this.cam.lookAt(this.look);
    this.cam.rotateZ(this.roll);
    this.cam.fov = this.fov - bump * 0.6;
    this.applyView(1);
  }

  // Spread of the dancers relative to the default ±1.6 (narrow screens move
  // them closer).
  _spread() { return Math.abs(this.anchors.rival.x - this.anchors.player.x) / 3.2 || 1; }

  // Apply the projection offset (weight 0..1 — the board transitions blend
  // it in and out) and update the projection.
  applyView(weight = 1) {
    const st = this.stage;
    if (st && (Math.abs(this.off.x) > 0.5 || Math.abs(this.off.y) > 0.5) && weight > 0) {
      this.cam.setViewOffset(st.W, st.H, this.off.x * weight, this.off.y * weight, st.W, st.H);
    } else if (this.cam.view && this.cam.view.enabled) this.cam.clearViewOffset();
    this.cam.updateProjectionMatrix();
  }

  // The default two-shot for the current screen and stage rect.
  framing() {
    const fov = this._baseFov();
    const look = new THREE.Vector3(0, BODY_Y, 0);
    const pos = new THREE.Vector3(0, BODY_Y + this._rise(), 8.6);
    const f = this._fit(pos, look, fov, 0, [this.anchors.player, this.anchors.rival], true);
    if (f) { this.off.x = this._offT.x = f.ox; this.off.y = this._offT.y = f.oy; }
    return { pos, look, fov };
  }

  // Snap (used when a transition hands the camera over).
  snapTo(pos, look, fov) {
    this.pos.copy(pos); this.look.copy(look); this.fov = fov; this.roll = 0;
  }
}
