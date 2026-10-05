// VIOLETTA's anime marks: a golden beamed note for her moves, a shrieking
// zig-zag note for the taunt (it swirls over your controls when it lands),
// and a red rose for the big moves (the house throws roses at its diva).
export default {
  violettaNote(g, s) {
    g.lineWidth = s * 0.05; g.strokeStyle = '#3a1a00'; g.fillStyle = '#ffd23f';
    const head = (x, y) => { g.beginPath(); g.ellipse(x, y, s * 0.13, s * 0.095, -0.4, 0, Math.PI * 2); g.fill(); g.stroke(); };
    g.fillRect(s * 0.33, s * 0.2, s * 0.06, s * 0.52); g.strokeRect(s * 0.33, s * 0.2, s * 0.06, s * 0.52);
    g.fillRect(s * 0.73, s * 0.14, s * 0.06, s * 0.52); g.strokeRect(s * 0.73, s * 0.14, s * 0.06, s * 0.52);
    g.beginPath(); g.moveTo(s * 0.33, s * 0.2); g.lineTo(s * 0.79, s * 0.14); g.lineTo(s * 0.79, s * 0.26); g.lineTo(s * 0.33, s * 0.32); g.closePath(); g.fill(); g.stroke();
    head(s * 0.25, s * 0.74); head(s * 0.65, s * 0.68);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(s * 0.22, s * 0.71, s * 0.04, s * 0.025, -0.4, 0, Math.PI * 2); g.fill();
  },
  violettaScreech(g, s) {
    // Jagged shock-wave rings behind a crooked violet note.
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#ff3d6e'; g.lineWidth = s * 0.05;
    for (const r of [0.3, 0.42]) {
      g.beginPath();
      for (let i = 0; i <= 18; i++) {
        const a = -2.4 + (i / 18) * 1.6, rr = s * r * (i % 2 ? 0.88 : 1.08);
        g.lineTo(s * 0.5 + Math.cos(a) * rr, s * 0.55 + Math.sin(a) * rr);
      }
      g.stroke();
    }
    g.fillStyle = '#9b4dff'; g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.05;
    g.save(); g.translate(s * 0.55, s * 0.5); g.rotate(0.25);
    g.beginPath(); g.ellipse(-s * 0.1, s * 0.22, s * 0.15, s * 0.11, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(s * 0.03, s * 0.22); g.lineTo(s * 0.03, -s * 0.3); g.lineTo(s * 0.2, -s * 0.18); g.lineTo(s * 0.1, -s * 0.12); g.lineTo(s * 0.24, -s * 0.02); g.stroke();
    g.strokeStyle = '#9b4dff'; g.lineWidth = s * 0.035; g.stroke();
    g.restore();
    g.fillStyle = '#ffe45c'; g.font = `900 ${s * 0.24}px "Arial Black", Impact, sans-serif`;
    g.strokeStyle = '#3a0a1a'; g.lineWidth = s * 0.04; g.strokeText('!!', s * 0.08, s * 0.3); g.fillText('!!', s * 0.08, s * 0.3);
  },
  violettaRose(g, s) {
    g.lineCap = 'round';
    g.strokeStyle = '#2f8a3a'; g.lineWidth = s * 0.05;
    g.beginPath(); g.moveTo(s * 0.5, s * 0.42); g.quadraticCurveTo(s * 0.45, s * 0.7, s * 0.55, s * 0.95); g.stroke();
    g.fillStyle = '#3fae4a';
    g.beginPath(); g.ellipse(s * 0.38, s * 0.7, s * 0.1, s * 0.045, 0.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(s * 0.62, s * 0.62, s * 0.1, s * 0.045, -0.6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#5a0010'; g.lineWidth = s * 0.03;
    const pet = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); };
    pet(s * 0.38, s * 0.3, s * 0.13, '#c8102e'); pet(s * 0.62, s * 0.3, s * 0.13, '#c8102e');
    pet(s * 0.5, s * 0.4, s * 0.14, '#e0203e'); pet(s * 0.5, s * 0.22, s * 0.12, '#a50a24');
    g.strokeStyle = '#ff6a80'; g.beginPath(); g.arc(s * 0.5, s * 0.3, s * 0.06, 0.3, 4.5); g.stroke();
  },
};
