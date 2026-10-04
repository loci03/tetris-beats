// CameraDirector — frames both dancers by default and gets dynamic on the
// big moments: it drifts toward whoever's leading, pushes in for tier-3+
// moves and taunts, orbits the dancer on a tier-4 move, bumps on the beat,
// and frames the winner at the end. Shots are requested in beats so cuts
// land on the music.

import * as THREE from '../vendor/three/three.module.min.js';

const lerp = (a, b, t) => a + (b - a) * t;

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
    this._tp = new THREE.Vector3();
    this._tl = new THREE.Vector3();
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
    let fov = 42, roll = 0;
    const bump = this.motion ? Math.exp(-(((beat % 1) + 1) % 1) * 8) : 0;

    switch (s.kind) {
      case 'close': {                       // push in on one dancer
        const a = s.who === 'rival' ? R : P;
        tp.set(a.x * 0.55 + (s.who === 'rival' ? -0.6 : 0.6), 1.7, 4.6);
        tl.set(a.x, 1.35, a.z);
        fov = 38;
        roll = (s.who === 'rival' ? -1 : 1) * 0.04;
        break;
      }
      case 'orbit': {                       // swing around a tier-4 move
        const a = s.who === 'rival' ? R : P;
        const t = (beat - s.start) / (s.until - s.start);
        const ang = (s.who === 'rival' ? 1 : -1) * (-0.9 + 1.8 * t);
        tp.set(a.x + Math.sin(ang) * 4.2, 1.5 + Math.sin(t * Math.PI) * 0.6, a.z + Math.cos(ang) * 4.2);
        tl.set(a.x, 1.25, a.z);
        fov = 44;
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
        fov = 44 - 3 * t;
        roll = side * 0.07 * Math.sin(Math.PI * 2 * t);
        break;
      }
      case 'taunt': {                       // low dutch angle over the taunter
        const a = s.who === 'rival' ? R : P, b = s.who === 'rival' ? P : R;
        tp.set(a.x + (a.x - b.x) * 0.45, 1.0, 5.2);
        tl.set((a.x + b.x) / 2, 1.5, 0);
        fov = 46;
        roll = (s.who === 'rival' ? 1 : -1) * 0.1;
        break;
      }
      case 'wide':
        tp.set(0, 3.4, 12.5);
        tl.set(0, 2.0, 0);
        fov = 48;
        break;
      case 'winner': {
        const a = s.who === 'rival' ? R : P;
        const t = Math.min(1, (beat - s.start) / 4);
        tp.set(a.x * 0.7, 1.4 + t * 0.4, 5.0 - t * 0.6);
        tl.set(a.x, 1.4, a.z);
        fov = 40;
        break;
      }
      default: {                            // two-shot, drifting to the leader
        const lead = Math.max(-1, Math.min(1, leader || 0));
        const sway = this.motion ? Math.sin(beat * Math.PI / 4) * 0.35 : 0;
        tp.set(-lead * 0.9 + sway, 2.1 + (this.motion ? Math.sin(beat * Math.PI / 8) * 0.15 : 0), 8.6);
        tl.set(-lead * 0.6, 1.25, 0);
        fov = 42;
      }
    }

    // Portrait / narrow screens: widen a little and pull back along the
    // view line until both dancers fit horizontally.
    const aspect = this.cam.aspect || 1.6;
    if (aspect < 1.3) fov += 8;
    const fit = this.fitFactor(fov);
    if (fit > 1 && s.kind !== 'solo') { tp.sub(tl).multiplyScalar(fit).add(tl); tp.y += (fit - 1) * 1.1; }

    const k = 1 - Math.exp(-dt * (s.kind === 'orbit' || s.kind === 'solo' ? 8 : 4.5));
    this.pos.lerp(tp, k);
    this.look.lerp(tl, k);
    this.fov = lerp(this.fov, fov, k);
    this.roll = lerp(this.roll, roll, k);
    this.cam.position.copy(this.pos);
    this.cam.position.y -= bump * 0.03;
    this.cam.lookAt(this.look);
    this.cam.rotateZ(this.roll);
    this.cam.fov = this.fov - bump * 0.6;
    this.cam.updateProjectionMatrix();
  }

  // How far to pull back so ±2.8 units (both dancers + margin) fit across
  // the screen at the default 8.6-unit shot distance.
  fitFactor(fov) {
    const aspect = this.cam.aspect || 1.6;
    const halfW = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect * 8.6;
    return Math.max(1, 2.8 / halfW);
  }

  // The default two-shot for the current screen shape.
  framing() {
    const fov = 42 + ((this.cam.aspect || 1.6) < 1.3 ? 8 : 0);
    const look = new THREE.Vector3(0, 1.25, 0);
    const fit = this.fitFactor(fov);
    const pos = new THREE.Vector3(0, 2.1, 8.6).sub(look).multiplyScalar(fit).add(look);
    pos.y += (fit - 1) * 1.1;
    return { pos, look, fov };
  }

  // Snap (used when a transition hands the camera over).
  snapTo(pos, look, fov) {
    this.pos.copy(pos); this.look.copy(look); this.fov = fov; this.roll = 0;
  }
}
