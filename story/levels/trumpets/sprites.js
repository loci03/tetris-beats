// ZOOT's anime marks: a hot gold eighth note for his moves, a neon star for
// the big ones, and the BRASS BLAST — a trumpet bell spitting notes — for
// the taunt (it rains down over your controls when it lands).
export default {
  zootNote(g, s) {
    g.save(); g.translate(s / 2, s / 2); g.rotate(-0.2); g.translate(-s / 2, -s / 2);
    g.fillStyle = '#ffc13a'; g.strokeStyle = '#2a0c2c'; g.lineWidth = s * 0.05;
    g.beginPath(); g.ellipse(s * 0.38, s * 0.72, s * 0.16, s * 0.11, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillRect(s * 0.5, s * 0.16, s * 0.07, s * 0.56); g.strokeRect(s * 0.5, s * 0.16, s * 0.07, s * 0.56);
    g.beginPath(); g.moveTo(s * 0.56, s * 0.16); g.bezierCurveTo(s * 0.9, s * 0.26, s * 0.78, s * 0.42, s * 0.74, s * 0.52);
    g.bezierCurveTo(s * 0.74, s * 0.38, s * 0.66, s * 0.32, s * 0.56, s * 0.32); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.strokeStyle = '#ff3d9a'; g.lineWidth = s * 0.04; g.lineCap = 'round';
    for (const [x, y] of [[0.12, 0.3], [0.08, 0.45], [0.86, 0.72]]) { g.beginPath(); g.moveTo(s * x, s * y); g.lineTo(s * (x + 0.06), s * (y - 0.06)); g.stroke(); }
  },
  zootStar(g, s) {
    const c = s / 2;
    g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.2 : s * 0.46, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
    g.closePath();
    g.shadowColor = '#ff3d9a'; g.shadowBlur = s * 0.12;
    g.strokeStyle = '#ff7ac0'; g.lineWidth = s * 0.07; g.stroke();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,240,248,0.9)'; g.fill();
  },
  zootBlast(g, s) {
    // A brass bell blaring to the right, notes and blast lines flying out.
    g.fillStyle = '#f5b829'; g.strokeStyle = '#3a1a00'; g.lineWidth = s * 0.04;
    g.beginPath(); g.moveTo(s * 0.06, s * 0.46); g.lineTo(s * 0.3, s * 0.46); g.quadraticCurveTo(s * 0.42, s * 0.44, s * 0.5, s * 0.22);
    g.lineTo(s * 0.5, s * 0.78); g.quadraticCurveTo(s * 0.42, s * 0.56, s * 0.3, s * 0.54); g.lineTo(s * 0.06, s * 0.54); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff0b0'; g.beginPath(); g.ellipse(s * 0.5, s * 0.5, s * 0.05, s * 0.28, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = '#ff3d9a'; g.lineWidth = s * 0.045; g.lineCap = 'round';
    for (const a of [-0.55, -0.2, 0.2, 0.55]) { g.beginPath(); g.moveTo(s * 0.6 + Math.cos(a) * s * 0.04, s * 0.5 + Math.sin(a) * s * 0.2); g.lineTo(s * 0.6 + Math.cos(a) * s * 0.3, s * 0.5 + Math.sin(a) * s * 0.42); g.stroke(); }
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#2a0c2c'; g.lineWidth = s * 0.03;
    for (const [x, y, r] of [[0.8, 0.22, 0.07], [0.86, 0.66, 0.06]]) {
      g.beginPath(); g.ellipse(s * x, s * y, s * r, s * r * 0.7, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillRect(s * (x + r * 0.7), s * (y - 0.2), s * 0.025, s * 0.2);
    }
  },
};
