// MECHA-9's marks: a cyan laser bolt (the hand-cannon taunt) and a little
// magenta spark burst for its moves.
export default {
  mechaBolt(g, s) {
    g.save(); g.translate(s / 2, s / 2); g.rotate(-0.6);
    const gr = g.createLinearGradient(-s * 0.45, 0, s * 0.45, 0);
    gr.addColorStop(0, 'rgba(34,232,255,0)'); gr.addColorStop(0.5, 'rgba(34,232,255,0.9)'); gr.addColorStop(1, '#ffffff');
    g.fillStyle = gr; g.shadowColor = '#22e8ff'; g.shadowBlur = s * 0.12;
    g.beginPath(); g.ellipse(0, 0, s * 0.45, s * 0.1, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(s * 0.18, 0, s * 0.2, s * 0.045, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  },
  mechaSpark(g, s) {
    const c = s / 2;
    g.strokeStyle = '#ff2dd0'; g.lineWidth = s * 0.06; g.lineCap = 'round'; g.shadowColor = '#ff2dd0'; g.shadowBlur = s * 0.1;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2, r0 = s * (i % 2 ? 0.12 : 0.08), r1 = s * (i % 2 ? 0.3 : 0.44);
      g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
    }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(c, c, s * 0.08, 0, Math.PI * 2); g.fill();
  },
};
