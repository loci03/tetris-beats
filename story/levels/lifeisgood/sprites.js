// Kaya's anime mark: a glowing gold star with a green/pink halo — thrown
// in signal di plane, falling over your panel when it lands.
export default {
  kayaStar(g, s) {
    const c = s / 2;
    const halo = g.createRadialGradient(c, c, s * 0.05, c, c, s * 0.5);
    halo.addColorStop(0, 'rgba(255,250,200,0.95)'); halo.addColorStop(0.35, 'rgba(255,210,60,0.55)');
    halo.addColorStop(0.65, 'rgba(60,220,120,0.25)'); halo.addColorStop(1, 'rgba(255,60,160,0)');
    g.fillStyle = halo; g.fillRect(0, 0, s, s);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * 0.15 : s * 0.38, a = i * Math.PI / 5 - Math.PI / 2;
      g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#ffd23a'; g.fill();
    g.lineWidth = s * 0.035; g.strokeStyle = '#1a7a3a'; g.stroke();
    g.fillStyle = 'rgba(255,255,235,0.9)';
    g.beginPath(); g.ellipse(c - s * 0.05, c - s * 0.07, s * 0.06, s * 0.03, -0.6, 0, Math.PI * 2); g.fill();
  },
};
