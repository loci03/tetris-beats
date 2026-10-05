// Chef Gouda's anime marks: a molten-cheese splat (his taunt projectile and
// the HUD splats) and an elbow macaroni (his move mark).
export default {
  goudaSplat(g, s) {
    const c = s / 2;
    // Blobby splat outline with stubby splash arms.
    g.fillStyle = '#ffc21a'; g.strokeStyle = '#a85a00'; g.lineWidth = s * 0.035;
    g.beginPath();
    const N = 11;
    for (let i = 0; i <= N * 2; i++) {
      const a = (i / (N * 2)) * Math.PI * 2, arm = i % 2 === 0;
      const r = s * (arm ? 0.34 + 0.08 * Math.sin(i * 2.3) : 0.24 + 0.03 * Math.cos(i * 1.7));
      const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r * 0.92;
      if (i === 0) g.moveTo(x, y); else g.quadraticCurveTo(c + Math.cos(a - 0.15) * r * 1.08, c + Math.sin(a - 0.15) * r, x, y);
    }
    g.closePath(); g.fill(); g.stroke();
    // Drips running down.
    for (const [x, len] of [[0.36, 0.2], [0.55, 0.28], [0.68, 0.14]]) {
      g.beginPath();
      g.moveTo(s * (x - 0.035), s * 0.6); g.lineTo(s * (x - 0.03), s * (0.6 + len));
      g.arc(s * x, s * (0.6 + len), s * 0.032, Math.PI, 0, true); g.lineTo(s * (x + 0.035), s * 0.6);
      g.fill();
    }
    // Flying droplets.
    for (const [x, y, r] of [[0.1, 0.25, 0.04], [0.9, 0.3, 0.035], [0.86, 0.78, 0.03], [0.16, 0.8, 0.028]]) {
      g.beginPath(); g.arc(s * x, s * y, s * r, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    // Darker melt + glossy highlights.
    g.fillStyle = '#ff9a10';
    g.beginPath(); g.ellipse(c + s * 0.05, c + s * 0.06, s * 0.13, s * 0.09, 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,230,0.9)';
    g.beginPath(); g.ellipse(c - s * 0.1, c - s * 0.1, s * 0.07, s * 0.035, -0.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(c + s * 0.12, c - s * 0.14, s * 0.02, 0, Math.PI * 2); g.fill();
  },

  goudaMac(g, s) {
    // Elbow macaroni: a fat curved tube with ridges.
    const c = s / 2;
    g.lineCap = 'round';
    g.strokeStyle = '#7a4a00'; g.lineWidth = s * 0.3;
    g.beginPath(); g.arc(c + s * 0.1, c + s * 0.1, s * 0.25, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
    g.strokeStyle = '#ffd34d'; g.lineWidth = s * 0.24;
    g.beginPath(); g.arc(c + s * 0.1, c + s * 0.1, s * 0.25, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
    g.strokeStyle = 'rgba(200,130,10,0.7)'; g.lineWidth = s * 0.025;
    for (let i = 1; i < 6; i++) {
      const a = Math.PI * (0.95 + 0.8 * i / 6);
      g.beginPath();
      g.moveTo(c + s * 0.1 + Math.cos(a) * s * 0.14, c + s * 0.1 + Math.sin(a) * s * 0.14);
      g.lineTo(c + s * 0.1 + Math.cos(a) * s * 0.36, c + s * 0.1 + Math.sin(a) * s * 0.36);
      g.stroke();
    }
    // Hollow end.
    const a = Math.PI * 1.75, ex = c + s * 0.1 + Math.cos(a) * s * 0.25, ey = c + s * 0.1 + Math.sin(a) * s * 0.25;
    g.fillStyle = '#c98a10'; g.strokeStyle = '#7a4a00'; g.lineWidth = s * 0.03;
    g.beginPath(); g.ellipse(ex, ey, s * 0.1, s * 0.065, a, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,240,0.85)';
    g.beginPath(); g.ellipse(c - s * 0.08, c - s * 0.02, s * 0.05, s * 0.025, -0.9, 0, Math.PI * 2); g.fill();
  },
};
