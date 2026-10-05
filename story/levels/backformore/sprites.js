// NULL's marks: a glowing block of falling code (taunt projectile and the
// glyphs that rain over your control panel) and a single code glyph.
export default {
  nullCode(g, s) {
    g.fillStyle = 'rgba(2,14,6,0.92)'; g.strokeStyle = '#00ff41'; g.lineWidth = s * 0.05;
    g.beginPath(); g.roundRect ? g.roundRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8, s * 0.1) : g.rect(s * 0.1, s * 0.1, s * 0.8, s * 0.8); g.fill(); g.stroke();
    g.font = `bold ${s * 0.22}px "DejaVu Sans Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#00ff41'; g.shadowBlur = s * 0.08;
    const rows = ['10', '01', '1F'];
    rows.forEach((r, i) => { g.fillStyle = i === 0 ? '#eafff0' : '#39ff7e'; g.fillText(r, s / 2, s * (0.3 + i * 0.2)); });
    g.shadowBlur = 0;
  },
  nullGlyph(g, s) {
    g.shadowColor = '#00ff41'; g.shadowBlur = s * 0.12;
    g.fillStyle = '#7dffb0';
    g.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.08);
    g.fillRect(s * 0.46, s * 0.15, s * 0.08, s * 0.7);
    g.fillRect(s * 0.3, s * 0.48, s * 0.32, s * 0.08);
    g.fillRect(s * 0.3, s * 0.77, s * 0.4, s * 0.08);
    g.shadowBlur = 0;
  },
};
