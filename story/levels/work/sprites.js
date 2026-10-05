// WORK sprites: a flying TPS report (MR. MONDAY's taunt — the papers rain
// over your arrows) and a steaming "#1 BOSS" mug for his move marks.
export default {
  mondayTps(g, s) {
    g.save();
    g.translate(s / 2, s / 2); g.rotate(-0.12);
    // A small stack: two sheets behind, the report on top.
    g.lineWidth = s * 0.025; g.strokeStyle = '#2a3550';
    for (const [dx, dy, c] of [[s * 0.07, s * 0.05, '#dfe6f2'], [s * 0.035, s * 0.025, '#eef2f8'], [0, 0, '#ffffff']]) {
      g.fillStyle = c;
      g.beginPath(); g.rect(-s * 0.3 + dx, -s * 0.38 + dy, s * 0.58, s * 0.74); g.fill(); g.stroke();
    }
    // Dog-eared corner.
    g.fillStyle = '#c9d3e6';
    g.beginPath(); g.moveTo(s * 0.28, -s * 0.38); g.lineTo(s * 0.16, -s * 0.38); g.lineTo(s * 0.28, -s * 0.26); g.closePath(); g.fill(); g.stroke();
    // Header + lines.
    g.fillStyle = '#d8262e';
    g.font = `900 ${s * 0.17}px "Arial Black", Impact, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('TPS', -s * 0.02, -s * 0.22);
    g.fillStyle = '#6d7ea0';
    for (let i = 0; i < 5; i++) g.fillRect(-s * 0.22, -s * 0.08 + i * s * 0.075, s * (i === 4 ? 0.26 : 0.42), s * 0.025);
    // A coffee ring stain.
    g.strokeStyle = 'rgba(120,70,30,0.55)'; g.lineWidth = s * 0.02;
    g.beginPath(); g.arc(s * 0.1, s * 0.22, s * 0.08, 0.3, Math.PI * 1.8); g.stroke();
    g.restore();
  },
  mondayMug(g, s) {
    g.lineWidth = s * 0.05; g.strokeStyle = '#1a1420'; g.lineJoin = 'round';
    // Steam.
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = s * 0.045; g.lineCap = 'round';
    for (const x of [0.38, 0.52]) {
      g.beginPath(); g.moveTo(s * x, s * 0.3);
      g.bezierCurveTo(s * (x - 0.08), s * 0.22, s * (x + 0.08), s * 0.16, s * x, s * 0.06); g.stroke();
    }
    g.strokeStyle = '#1a1420'; g.lineWidth = s * 0.05;
    // Handle.
    g.beginPath(); g.arc(s * 0.72, s * 0.56, s * 0.12, -Math.PI / 2, Math.PI / 2); g.stroke();
    // Body.
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(s * 0.2, s * 0.34); g.lineTo(s * 0.7, s * 0.34); g.lineTo(s * 0.66, s * 0.86); g.lineTo(s * 0.24, s * 0.86); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#d8262e'; g.fillRect(s * 0.22, s * 0.5, s * 0.46, s * 0.12);
    g.fillStyle = '#fff'; g.font = `900 ${s * 0.1}px "Arial Black", Impact, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('#1', s * 0.45, s * 0.565);
    g.fillStyle = '#5a3318'; g.beginPath(); g.ellipse(s * 0.45, s * 0.35, s * 0.24, s * 0.045, 0, 0, Math.PI * 2); g.fill();
  },
};
