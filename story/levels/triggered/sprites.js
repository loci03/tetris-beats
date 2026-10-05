// TRIGGERED sprites: SARGE's smoke canister puff (his taunt — rolling
// grey smoke over your arrows) and a stencilled army star for his moves.
export default {
  sargeSmoke(g, s) {
    // Billowing cloud: overlapping grey puffs with a darker core.
    const puffs = [[0.5, 0.5, 0.3], [0.3, 0.58, 0.22], [0.7, 0.58, 0.22], [0.38, 0.36, 0.2], [0.63, 0.34, 0.21], [0.5, 0.7, 0.2], [0.22, 0.42, 0.14], [0.8, 0.44, 0.15]];
    for (const [layer, col] of [[1.0, 'rgba(70,74,64,0.9)'], [0.86, 'rgba(150,156,138,0.95)'], [0.6, 'rgba(205,210,192,0.9)']]) {
      g.fillStyle = col;
      for (const [x, y, r] of puffs) { g.beginPath(); g.arc(s * x, s * (y - (1 - layer) * 0.05), s * r * layer, 0, Math.PI * 2); g.fill(); }
    }
    // The canister poking out of the bottom of the cloud.
    g.save(); g.translate(s * 0.5, s * 0.84); g.rotate(-0.5);
    g.fillStyle = '#4a5a2a'; g.strokeStyle = '#1a1e10'; g.lineWidth = s * 0.025;
    g.beginPath(); g.rect(-s * 0.07, -s * 0.11, s * 0.14, s * 0.22); g.fill(); g.stroke();
    g.fillStyle = '#c8ccd4'; g.fillRect(-s * 0.05, -s * 0.15, s * 0.1, s * 0.04);
    g.fillStyle = '#ffe066'; g.fillRect(-s * 0.07, -s * 0.02, s * 0.14, s * 0.03);
    g.restore();
  },
  sargeStar(g, s) {
    const c = s / 2;
    g.fillStyle = '#e02020'; g.strokeStyle = '#2a0808'; g.lineWidth = s * 0.05; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * 0.19 : s * 0.44, a = i * Math.PI / 5 - Math.PI / 2;
      g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * 0.08 : s * 0.19, a = i * Math.PI / 5 - Math.PI / 2;
      g.lineTo(c + Math.cos(a) * r, c + 0.01 * s + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
  },
};
