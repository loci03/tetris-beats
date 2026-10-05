// DEACON GRACE's marks: a golden halo for her moves, a radiant burst of
// light for the big ones, and a white dove wrapped in glory for the taunt
// (doves of light float up over your controls when it lands).
export default {
  graceHalo(g, s) {
    const c = s / 2;
    const gr = g.createRadialGradient(c, c, s * 0.18, c, c, s * 0.48);
    gr.addColorStop(0, 'rgba(255,240,180,0)'); gr.addColorStop(0.6, 'rgba(255,220,120,0.55)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#ffd23f'; g.lineWidth = s * 0.07;
    g.beginPath(); g.ellipse(c, c, s * 0.34, s * 0.14, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#fff8dc'; g.lineWidth = s * 0.025; g.stroke();
    g.fillStyle = '#ffffff';
    for (const [x, y] of [[0.2, 0.3], [0.8, 0.28], [0.5, 0.15]]) { g.beginPath(); g.arc(s * x, s * y, s * 0.025, 0, Math.PI * 2); g.fill(); }
  },
  graceLight(g, s) {
    const c = s / 2;
    const gr = g.createRadialGradient(c, c, 2, c, c, s * 0.5);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,245,200,0.9)'); gr.addColorStop(1, 'rgba(255,215,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,250,220,0.9)';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, r = i % 2 ? s * 0.3 : s * 0.48;
      g.beginPath(); g.moveTo(c + Math.cos(a - 0.08) * s * 0.08, c + Math.sin(a - 0.08) * s * 0.08);
      g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); g.lineTo(c + Math.cos(a + 0.08) * s * 0.08, c + Math.sin(a + 0.08) * s * 0.08); g.fill();
    }
    g.fillStyle = '#ffffff'; g.fillRect(c - s * 0.025, c - s * 0.13, s * 0.05, s * 0.26); g.fillRect(c - s * 0.09, c - s * 0.07, s * 0.18, s * 0.045);
  },
  graceDove(g, s) {
    const gr = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s * 0.5);
    gr.addColorStop(0, 'rgba(255,248,210,0.85)'); gr.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#c8a050'; g.lineWidth = s * 0.025; g.lineJoin = 'round';
    // Wings up, body gliding to the right.
    g.beginPath(); g.moveTo(s * 0.45, s * 0.55); g.quadraticCurveTo(s * 0.2, s * 0.25, s * 0.08, s * 0.18); g.quadraticCurveTo(s * 0.3, s * 0.48, s * 0.38, s * 0.6); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(s * 0.5, s * 0.55); g.quadraticCurveTo(s * 0.62, s * 0.2, s * 0.8, s * 0.1); g.quadraticCurveTo(s * 0.68, s * 0.45, s * 0.6, s * 0.6); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(s * 0.5, s * 0.62, s * 0.22, s * 0.09, -0.15, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(s * 0.72, s * 0.56, s * 0.07, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(s * 0.28, s * 0.64); g.lineTo(s * 0.14, s * 0.58); g.lineTo(s * 0.16, s * 0.72); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#f0a020'; g.beginPath(); g.moveTo(s * 0.78, s * 0.55); g.lineTo(s * 0.86, s * 0.57); g.lineTo(s * 0.78, s * 0.59); g.fill();
    g.fillStyle = '#2a1a0a'; g.beginPath(); g.arc(s * 0.74, s * 0.55, s * 0.012, 0, Math.PI * 2); g.fill();
  },
};
