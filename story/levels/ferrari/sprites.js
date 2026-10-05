// FERRARI WINDOW — Rhett Ryder's anime marks (2D painters, drawn into a
// 128px canvas by AnimeFx / the HUD disruption overlay).
//   lasso   — a spinning lariat loop with its tail: the taunt projectile
//   sheriff — a gold six-point sheriff star: pops off his moves
//   horseshoe — lucky horseshoe for the big hits

const TAU = Math.PI * 2;

export default {
  lasso(g, s) {
    const c = s / 2;
    g.lineCap = 'round'; g.lineJoin = 'round';
    // Loop: an ellipse seen at an angle, thick rope with a darker twist.
    const rope = (w, col) => {
      g.strokeStyle = col; g.lineWidth = w;
      g.beginPath(); g.ellipse(c, c * 0.86, s * 0.36, s * 0.24, -0.25, 0, TAU); g.stroke();
      // Tail: from the honda knot down and out of frame, with a wave.
      g.beginPath();
      g.moveTo(c + s * 0.22, c * 0.86 + s * 0.17);
      g.bezierCurveTo(c + s * 0.3, s * 0.78, c + s * 0.05, s * 0.8, c + s * 0.16, s * 0.97);
      g.stroke();
    };
    rope(s * 0.11, '#3a2010');
    rope(s * 0.075, '#d9a45a');
    // Twist marks along the loop.
    g.strokeStyle = '#8a5a2a'; g.lineWidth = s * 0.02;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU, x = c + Math.cos(a) * s * 0.36, y = c * 0.86 + Math.sin(a) * s * 0.24;
      const r = s * 0.025;
      g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.stroke();
    }
    // Honda knot.
    g.fillStyle = '#b87a3a'; g.strokeStyle = '#3a2010'; g.lineWidth = s * 0.025;
    g.beginPath(); g.ellipse(c + s * 0.22, c * 0.86 + s * 0.17, s * 0.05, s * 0.035, 0.6, 0, TAU); g.fill(); g.stroke();
    // Motion swooshes.
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = s * 0.03;
    g.beginPath(); g.ellipse(c, c * 0.86, s * 0.45, s * 0.31, -0.25, 3.6, 4.6); g.stroke();
    g.beginPath(); g.ellipse(c, c * 0.86, s * 0.45, s * 0.31, -0.25, 0.4, 1.2); g.stroke();
  },
  sheriff(g, s) {
    const c = s / 2;
    const star = (R, r) => {
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 - Math.PI / 2, rr = i % 2 ? r : R;
        g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr);
      }
      g.closePath();
    };
    star(s * 0.46, s * 0.24);
    g.fillStyle = '#ffd045'; g.fill();
    g.lineWidth = s * 0.05; g.strokeStyle = '#7a4a00'; g.stroke();
    // Ball tips.
    g.fillStyle = '#fff2b0';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 - Math.PI / 2;
      g.beginPath(); g.arc(c + Math.cos(a) * s * 0.44, c + Math.sin(a) * s * 0.44, s * 0.05, 0, TAU); g.fill(); g.stroke();
    }
    g.beginPath(); g.arc(c, c, s * 0.14, 0, TAU); g.fillStyle = '#ffe680'; g.fill();
    g.lineWidth = s * 0.03; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.ellipse(c - s * 0.1, c - s * 0.12, s * 0.06, s * 0.03, -0.6, 0, TAU); g.fill();
  },
  horseshoe(g, s) {
    const c = s / 2;
    g.lineCap = 'butt';
    g.strokeStyle = '#3a2a20'; g.lineWidth = s * 0.22;
    g.beginPath(); g.arc(c, c * 0.95, s * 0.28, Math.PI * 0.82, Math.PI * 2.18, false); g.stroke();
    g.strokeStyle = '#c9ced8'; g.lineWidth = s * 0.15;
    g.beginPath(); g.arc(c, c * 0.95, s * 0.28, Math.PI * 0.82, Math.PI * 2.18, false); g.stroke();
    g.fillStyle = '#3a2a20';
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.95 + i * 0.22);
      g.beginPath(); g.arc(c + Math.cos(a) * s * 0.28, c * 0.95 + Math.sin(a) * s * 0.28, s * 0.022, 0, TAU); g.fill();
    }
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(c - s * 0.18, c * 0.6, s * 0.03, 0, TAU); g.fill();
  },
};
