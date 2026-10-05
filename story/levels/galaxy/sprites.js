// NOVA's marks: a shooting star with a glowing tail (the meteor-shower
// taunt — they rain over your controls) and a little four-point star.
export default {
  novaMeteor(g, s) {
    g.save(); g.translate(s * 0.62, s * 0.38); g.rotate(Math.PI * 0.75);
    const gr = g.createLinearGradient(0, 0, s * 0.62, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, 'rgba(125,249,255,0.6)'); gr.addColorStop(1, 'rgba(255,102,224,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -s * 0.09); g.lineTo(s * 0.62, 0); g.lineTo(0, s * 0.09); g.closePath(); g.fill();
    g.restore();
    const c = [s * 0.62, s * 0.38];
    g.fillStyle = '#fffbe0'; g.strokeStyle = '#7df9ff'; g.lineWidth = s * 0.03; g.shadowColor = '#7df9ff'; g.shadowBlur = s * 0.1;
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.08 : s * 0.19; g.lineTo(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke(); g.shadowBlur = 0;
  },
  novaStar(g, s) {
    const c = s / 2;
    g.fillStyle = '#ffffff'; g.shadowColor = '#ff66e0'; g.shadowBlur = s * 0.14;
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.09 : s * 0.42; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
    g.closePath(); g.fill();
    g.fillStyle = '#7df9ff'; g.beginPath(); g.arc(c, c, s * 0.07, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
  },
};
