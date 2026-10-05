// Sage's anime mark: a glowing lotus on a hypnotic ripple — his move mark,
// the mind-wave projectile and the HUD swirl when it lands.
export default {
  sageLotus(g, s) {
    const c = s / 2;
    // Ripple rings.
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = `rgba(${200 - i * 20},${155 + i * 10},255,${0.75 - i * 0.16})`;
      g.lineWidth = s * (0.035 - i * 0.005);
      g.beginPath(); g.ellipse(c, c + s * 0.1, s * (0.18 + i * 0.08), s * (0.07 + i * 0.035), 0, 0, Math.PI * 2); g.stroke();
    }
    // Petals: back row, then front row.
    const petal = (a, len, wid, fill) => {
      g.save(); g.translate(c, c + s * 0.1); g.rotate(a);
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(-wid, -len * 0.4, -wid * 0.6, -len * 0.85, 0, -len);
      g.bezierCurveTo(wid * 0.6, -len * 0.85, wid, -len * 0.4, 0, 0);
      g.fillStyle = fill; g.fill();
      g.lineWidth = s * 0.015; g.strokeStyle = '#a03a8a'; g.stroke();
      g.restore();
    };
    for (const a of [-1.15, 1.15, -0.6, 0.6]) petal(a, s * 0.34, s * 0.11, '#ffb0de');
    for (const a of [-0.3, 0.3, 0]) petal(a, s * 0.38, s * 0.12, a ? '#ff8fd0' : '#ffd0ee');
    g.fillStyle = '#ffe27a';
    g.beginPath(); g.ellipse(c, c + s * 0.06, s * 0.05, s * 0.03, 0, 0, Math.PI * 2); g.fill();
    // Soft glow.
    const gl = g.createRadialGradient(c, c, s * 0.05, c, c, s * 0.5);
    gl.addColorStop(0, 'rgba(255,220,255,0.35)'); gl.addColorStop(1, 'rgba(200,155,255,0)');
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = gl; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'source-over';
  },
};
