// LIVING MY LIFE sprites: COCO's beach ball (her taunt — balls bonking down
// over your arrows) and a pink seashell for her move marks.
export default {
  cocoBall(g, s) {
    const c = s / 2, r = s * 0.42;
    const cols = ['#ff3333', '#ffffff', '#ffcc00', '#ffffff', '#3399ff', '#ffffff'];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[i];
      g.beginPath(); g.moveTo(c, c);
      g.arc(c, c, r, -Math.PI / 2 + i * Math.PI / 3, -Math.PI / 2 + (i + 1) * Math.PI / 3);
      g.closePath(); g.fill();
    }
    // Shading + highlight + cap.
    const gr = g.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,40,0.3)');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(c, c, r * 0.14, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a2440'; g.lineWidth = s * 0.035; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke();
  },
  cocoShell(g, s) {
    const c = s / 2;
    g.fillStyle = '#ff9ec8'; g.strokeStyle = '#7a1f4a'; g.lineWidth = s * 0.035; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(c, s * 0.86);
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + i * Math.PI / 6, r = s * 0.4;
      g.quadraticCurveTo(c + Math.cos(a - Math.PI / 12) * r * 1.08, s * 0.62 + Math.sin(a - Math.PI / 12) * r * 1.08, c + Math.cos(a) * r, s * 0.62 + Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(122,31,74,0.7)'; g.lineWidth = s * 0.025;
    for (let i = 1; i < 6; i++) { const a = Math.PI + i * Math.PI / 6; g.beginPath(); g.moveTo(c, s * 0.84); g.lineTo(c + Math.cos(a) * s * 0.36, s * 0.62 + Math.sin(a) * s * 0.36); g.stroke(); }
    g.fillStyle = '#ffd6e8'; g.beginPath(); g.ellipse(c, s * 0.86, s * 0.12, s * 0.05, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  },
};
