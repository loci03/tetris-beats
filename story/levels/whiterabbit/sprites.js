// BUNNI's marks: her gold pocket watch with a hypnotic purple spiral face
// (taunt projectile, and what swirls round your control panel), and a
// little heart playing card for her moves.
export default {
  bunniWatch(g, s) {
    const c = s / 2;
    g.strokeStyle = '#ffc93a'; g.lineWidth = s * 0.05;
    g.beginPath(); g.arc(c, s * 0.12, s * 0.07, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffc93a'; g.beginPath(); g.arc(c, c + s * 0.05, s * 0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff6ff'; g.beginPath(); g.arc(c, c + s * 0.05, s * 0.33, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a23cff'; g.lineWidth = s * 0.045; g.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.15) { const r = a / (Math.PI * 7) * s * 0.3; g.lineTo(c + Math.cos(a) * r, c + s * 0.05 + Math.sin(a) * r); }
    g.stroke();
    g.strokeStyle = '#7a4a00'; g.lineWidth = s * 0.03; g.beginPath(); g.arc(c, c + s * 0.05, s * 0.4, 0, Math.PI * 2); g.stroke();
  },
  bunniCard(g, s) {
    g.save(); g.translate(s / 2, s / 2); g.rotate(-0.2);
    g.fillStyle = '#fffaf2'; g.strokeStyle = '#7b3cc4'; g.lineWidth = s * 0.05;
    g.fillRect(-s * 0.26, -s * 0.36, s * 0.52, s * 0.72); g.strokeRect(-s * 0.26, -s * 0.36, s * 0.52, s * 0.72);
    g.fillStyle = '#e0287a';
    g.beginPath(); g.moveTo(0, s * 0.14);
    g.bezierCurveTo(-s * 0.24, -s * 0.02, -s * 0.14, -s * 0.2, 0, -s * 0.08);
    g.bezierCurveTo(s * 0.14, -s * 0.2, s * 0.24, -s * 0.02, 0, s * 0.14); g.fill();
    g.restore();
  },
};
