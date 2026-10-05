// Skye's anime mark: a soft ember-lit haze cloud — thrown in the taunt and
// drifting over your panel when it lands.
export default {
  skyeCloud(g, s) {
    const puffs = [[0.5, 0.52, 0.26], [0.3, 0.58, 0.19], [0.7, 0.58, 0.2], [0.4, 0.4, 0.18], [0.6, 0.38, 0.17], [0.5, 0.66, 0.18]];
    for (const [x, y, r] of puffs) {
      const gr = g.createRadialGradient(s * x, s * y, s * r * 0.15, s * x, s * y, s * r);
      gr.addColorStop(0, 'rgba(255,236,214,0.95)'); gr.addColorStop(0.55, 'rgba(255,190,140,0.65)'); gr.addColorStop(1, 'rgba(255,140,70,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(s * x, s * y, s * r, 0, Math.PI * 2); g.fill();
    }
    // A few ember sparks in it.
    g.fillStyle = '#ffd060';
    for (const [x, y, r] of [[0.32, 0.36, 0.018], [0.66, 0.3, 0.014], [0.74, 0.62, 0.016], [0.45, 0.7, 0.012]]) { g.beginPath(); g.arc(s * x, s * y, s * r, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = s * 0.02; g.lineCap = 'round';
    g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.14, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
  },
};
