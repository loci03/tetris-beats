// AnimeFx — the manga marks that make the battle read like an anime:
// hearts, sparkles and music notes bursting off a dancer who lands a move,
// a sweat drop on a fumble, an anger vein when someone gets called out,
// a big "!" when a taunt lands. Billboard sprites from canvas textures,
// pooled; driven by BattleSession on battle events.

import * as THREE from '../vendor/three/three.module.min.js';

const DRAW = {
  heart(g, s) {
    g.fillStyle = '#ff4f9a'; g.strokeStyle = '#fff'; g.lineWidth = s * 0.06;
    g.beginPath();
    g.moveTo(s / 2, s * 0.82);
    g.bezierCurveTo(s * 0.05, s * 0.5, s * 0.12, s * 0.12, s / 2, s * 0.32);
    g.bezierCurveTo(s * 0.88, s * 0.12, s * 0.95, s * 0.5, s / 2, s * 0.82);
    g.fill(); g.stroke();
  },
  sparkle(g, s) {
    const c = s / 2;
    g.fillStyle = '#fff6a8'; g.strokeStyle = '#ffb000'; g.lineWidth = s * 0.03;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? s * 0.1 : s * 0.46, a = i * Math.PI / 4 - Math.PI / 2;
      g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.stroke();
  },
  note(g, s) {
    g.fillStyle = '#7fe9ff'; g.strokeStyle = '#123'; g.lineWidth = s * 0.05;
    g.beginPath(); g.ellipse(s * 0.36, s * 0.72, s * 0.17, s * 0.12, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillRect(s * 0.49, s * 0.18, s * 0.07, s * 0.55);
    g.beginPath(); g.moveTo(s * 0.52, s * 0.18); g.quadraticCurveTo(s * 0.85, s * 0.28, s * 0.78, s * 0.5); g.lineTo(s * 0.72, s * 0.46); g.quadraticCurveTo(s * 0.74, s * 0.32, s * 0.55, s * 0.3); g.fill();
  },
  sweat(g, s) {
    g.fillStyle = '#8fd8ff'; g.strokeStyle = '#fff'; g.lineWidth = s * 0.05;
    g.beginPath(); g.moveTo(s / 2, s * 0.1);
    g.bezierCurveTo(s * 0.85, s * 0.55, s * 0.78, s * 0.9, s / 2, s * 0.9);
    g.bezierCurveTo(s * 0.22, s * 0.9, s * 0.15, s * 0.55, s / 2, s * 0.1);
    g.fill(); g.stroke();
  },
  anger(g, s) {
    g.strokeStyle = '#ff2848'; g.lineWidth = s * 0.11; g.lineCap = 'round';
    const c = s / 2, r = s * 0.3;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      g.beginPath();
      g.arc(c + Math.cos(a) * r * 0.9, c + Math.sin(a) * r * 0.9, r * 0.55, a + Math.PI * 0.6, a + Math.PI * 1.4);
      g.stroke();
    }
  },
  exclaim(g, s) {
    g.font = `900 ${s * 0.9}px "Arial Black", Impact, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = s * 0.08; g.strokeStyle = '#1a0a14'; g.strokeText('!', s / 2, s * 0.55);
    g.fillStyle = '#ffe45c'; g.fillText('!', s / 2, s * 0.55);
  },
};

export class AnimeFx {
  constructor(scene, size = 48) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.tex = {};
    for (const [k, draw] of Object.entries(DRAW)) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      draw(c.getContext('2d'), 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      this.tex[k] = t;
    }
    this.pool = [];
    for (let i = 0; i < size; i++) {
      const m = new THREE.SpriteMaterial({ map: this.tex.heart, transparent: true, depthWrite: false });
      const sp = new THREE.Sprite(m);
      sp.visible = false;
      this.group.add(sp);
      this.pool.push({ sp, life: 0, max: 1, v: new THREE.Vector3(), kind: 'heart', size: 0.3, spin: 0 });
    }
    this.cursor = 0;
  }

  // Spawn `n` marks of `kind` around world position `pos` (a dancer's head).
  burst(kind, pos, n = 5) {
    if (!this.tex[kind]) return;
    for (let k = 0; k < n; k++) {
      const p = this.pool[this.cursor = (this.cursor + 1) % this.pool.length];
      p.kind = kind;
      p.sp.material.map = this.tex[kind];
      p.sp.material.needsUpdate = true;
      p.sp.position.copy(pos);
      const spread = n > 1 ? 1 : 0;
      p.sp.position.x += (Math.random() - 0.5) * 0.5 * spread;
      p.sp.position.y += Math.random() * 0.2 * spread;
      p.spin = (Math.random() - 0.5) * 3;
      if (kind === 'sweat') {
        p.sp.position.x += 0.28; p.sp.position.y += 0.05;
        p.v.set(0.1, -0.35, 0); p.max = 1.1; p.size = 0.22; p.spin = 0;
      } else if (kind === 'anger' || kind === 'exclaim') {
        p.sp.position.x += kind === 'anger' ? 0.25 : 0; p.sp.position.y += 0.3;
        p.v.set(0, 0.05, 0); p.max = 1.0; p.size = kind === 'exclaim' ? 0.55 : 0.3; p.spin = 0;
      } else {
        const a = Math.random() * Math.PI * 2;
        p.v.set(Math.cos(a) * (0.4 + Math.random() * 0.9), 0.9 + Math.random() * 1.2, Math.sin(a) * 0.3);
        p.max = 1.2 + Math.random() * 0.6; p.size = kind === 'sparkle' ? 0.2 + Math.random() * 0.2 : 0.22 + Math.random() * 0.14;
      }
      p.life = p.max;
      p.sp.visible = true;
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.sp.visible = false; continue; }
      const t = 1 - p.life / p.max;
      p.sp.position.addScaledVector(p.v, dt);
      if (p.kind !== 'anger' && p.kind !== 'exclaim' && p.kind !== 'sweat') p.v.multiplyScalar(1 - dt * 1.2);
      let s = p.size;
      if (p.kind === 'anger' || p.kind === 'exclaim') s *= 1 + 0.25 * Math.max(0, Math.sin(t * Math.PI * 6)) * (1 - t);
      else s *= Math.min(1, t * 6) * (p.kind === 'sparkle' ? 0.8 + 0.4 * Math.sin(t * 20) : 1);
      p.sp.scale.set(s, s, s);
      p.sp.material.rotation += p.spin * dt;
      p.sp.material.opacity = Math.min(1, (1 - t) * 3);
    }
  }

  dispose() {
    for (const p of this.pool) p.sp.material.dispose();
    for (const t of Object.values(this.tex)) t.dispose();
    this.group.removeFromParent();
  }
}
