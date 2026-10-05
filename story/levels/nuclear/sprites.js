// NUCLEAR WASTE sprites: ROTTEN REX's toxic goo glob (his taunt — slime
// splats over your arrows) and a cartoon bone for his move marks.
export default {
  rexGoo(g, s) {
    const c = s / 2;
    // Splat: an irregular blob with drips and droplets.
    g.fillStyle = '#5cff2a'; g.strokeStyle = '#1e5a0a'; g.lineWidth = s * 0.035; g.lineJoin = 'round';
    g.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, r = s * (0.3 + 0.09 * Math.sin(i * 2.7) + 0.05 * Math.cos(i * 5.1));
      const x = c + Math.cos(a) * r, y = c * 0.92 + Math.sin(a) * r * 0.85;
      if (i === 0) g.moveTo(x, y); else g.quadraticCurveTo(c + Math.cos(a - 0.22) * r * 1.18, c * 0.92 + Math.sin(a - 0.22) * r, x, y);
    }
    g.closePath(); g.fill(); g.stroke();
    // Drips.
    for (const [x, len] of [[0.36, 0.22], [0.55, 0.3], [0.68, 0.16]]) {
      g.beginPath(); g.moveTo(s * (x - 0.035), s * 0.62); g.lineTo(s * (x - 0.03), s * (0.62 + len)); g.arc(s * x, s * (0.62 + len), s * 0.035, Math.PI, 0, true); g.lineTo(s * (x + 0.035), s * 0.62); g.closePath(); g.fill(); g.stroke();
    }
    for (const [x, y, r] of [[0.15, 0.25, 0.04], [0.86, 0.3, 0.05], [0.82, 0.72, 0.03]]) { g.beginPath(); g.arc(s * x, s * y, s * r, 0, Math.PI * 2); g.fill(); g.stroke(); }
    // Shine + bubbles.
    g.fillStyle = 'rgba(230,255,200,0.85)';
    g.beginPath(); g.ellipse(s * 0.4, s * 0.33, s * 0.09, s * 0.045, -0.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(30,90,10,0.6)'; g.lineWidth = s * 0.02;
    for (const [x, y, r] of [[0.58, 0.45, 0.04], [0.45, 0.55, 0.025]]) { g.beginPath(); g.arc(s * x, s * y, s * r, 0, Math.PI * 2); g.stroke(); }
  },
  rexBone(g, s) {
    g.save(); g.translate(s / 2, s / 2); g.rotate(-0.6);
    g.fillStyle = '#fbf6e4'; g.strokeStyle = '#3a2a1a'; g.lineWidth = s * 0.04;
    const L = s * 0.28, W = s * 0.07, K = s * 0.085;
    g.beginPath();
    g.rect(-L, -W, 2 * L, 2 * W);
    g.fill();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * L, sy * K * 0.8, K, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.fillRect(-L, -W, 2 * L, 2 * W);
    g.beginPath(); g.moveTo(-L, -W); g.lineTo(L, -W); g.moveTo(-L, W); g.lineTo(L, W); g.stroke();
    g.restore();
  },
};
