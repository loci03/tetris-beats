// BattleHUD — the rhythm battle's 2D overlay: both dancers' score, combo,
// move tier and hype gauge, the groove tug-of-war meter and timer, the note
// lane (notes scroll into the hit ring on the beat), judgment pops, banners
// and — on touch screens — the input pads.

import { LOOKAHEAD } from './rhythm-battle.js';

const DIR_GLYPH = { L: '←', U: '↑', D: '↓', R: '→' };
const DIR_COLOR = { L: '#ff4f9a', U: '#39d0ff', D: '#4be08a', R: '#ffa53a' };
const JUDGE_COLOR = { perfect: '#ffe45c', great: '#5dffb0', good: '#7ecbff', miss: '#ff5a6e' };

function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export class BattleHUD {
  constructor({ names, isTouch, onPad }) {
    this.root = el('div', 'story-hud');
    this.root.setAttribute('aria-live', 'polite');
    const top = el('div', 'sh-top', this.root);
    this.p = this._panel(top, 'sh-p1', names.player);
    const mid = el('div', 'sh-mid', top);
    this.timer = el('div', 'sh-timer', mid, '1:00');
    const gm = el('div', 'sh-groove', mid);
    el('span', 'sh-groove-l', gm, 'YOU');
    this.grooveBar = el('div', 'sh-groove-bar', gm);
    this.grooveKnob = el('i', '', this.grooveBar);
    el('span', 'sh-groove-r', gm, names.rival);
    this.r = this._panel(top, 'sh-p2', names.rival);

    this.banner = el('div', 'sh-banner', this.root);
    this.callout = el('div', 'sh-callout', this.root);
    this.rivalJudge = el('div', 'sh-rjudge', this.root);

    const bottom = el('div', 'sh-bottom', this.root);
    this.hint = el('div', 'sh-hint', bottom, isTouch
      ? 'Tap the arrows as notes hit the ring · GROOVE on the gold note'
      : 'Arrows / WASD on the notes · SPACE = GROOVE / DODGE · T = TAUNT');
    const laneWrap = el('div', 'sh-lane-wrap', bottom);
    this.lane = el('canvas', 'sh-lane', laneWrap);
    this.judgeEl = el('div', 'sh-judge', laneWrap);
    this.lg = this.lane.getContext('2d');

    if (isTouch) {
      this.root.classList.add('sh-touch');
      const pads = el('div', 'sh-pads', this.root);
      const left = el('div', 'sh-pad-dirs', pads);
      for (const d of ['L', 'U', 'D', 'R']) this._pad(left, 'sh-pad', DIR_GLYPH[d], () => onPad('arrow', d), DIR_COLOR[d]);
      const right = el('div', 'sh-pad-acts', pads);
      this.tauntPad = this._pad(right, 'sh-pad sh-pad-taunt', 'TAUNT', () => onPad('taunt'));
      this._pad(right, 'sh-pad sh-pad-groove', 'GROOVE', () => onPad('groove'));
    }
    document.body.appendChild(this.root);
    this._judgeTimer = 0;
    this._bannerTimer = 0;
    this._calloutTimer = 0;
    this.resize();
  }

  _panel(parent, cls, name) {
    const p = el('div', 'sh-panel ' + cls, parent);
    el('div', 'sh-name', p, name);
    const score = el('div', 'sh-score', p, '0');
    const row = el('div', 'sh-row', p);
    const tier = el('div', 'sh-tier', row);
    const pips = [1, 2, 3, 4].map(() => el('i', '', tier));
    const combo = el('div', 'sh-combo', row, '');
    const hype = el('div', 'sh-hype', p);
    const fill = el('i', '', hype);
    const label = el('span', '', hype, 'HYPE');
    return { p, score, pips, combo, hype, fill, label };
  }

  _pad(parent, cls, label, fn, color) {
    const b = el('button', cls, parent, label);
    b.type = 'button';
    if (color) b.style.setProperty('--pad', color);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); fn(e.timeStamp); });
    const up = () => b.classList.remove('down');
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    return b;
  }

  resize() {
    const r = this.lane.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.lw = Math.max(200, r.width); this.lh = Math.max(60, r.height);
    this.lane.width = Math.round(this.lw * dpr);
    this.lane.height = Math.round(this.lh * dpr);
    this.lg.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  show(v) { this.root.classList.toggle('sh-on', !!v); }

  // Per-frame refresh from battle state.
  update(battle, clock, songTime) {
    for (const [ui, d] of [[this.p, battle.player], [this.r, battle.rival]]) {
      ui.score.textContent = d.score.toLocaleString();
      ui.pips.forEach((pip, i) => pip.classList.toggle('on', i < d.tier));
      ui.combo.textContent = d.noteCombo >= 3 ? `${d.noteCombo} COMBO` : '';
      ui.fill.style.width = d.hype + '%';
      const full = d.hype >= 100;
      ui.hype.classList.toggle('full', full);
      ui.label.textContent = full ? (ui === this.p ? 'TAUNT READY · T' : 'TAUNT READY') : 'HYPE';
    }
    if (this.tauntPad) this.tauntPad.classList.toggle('ready', battle.player.hype >= 100);
    // Groove meter: player pushes it left, rival right.
    this.grooveKnob.style.left = (50 - battle.groove * 45) + '%';
    // Timer: time left in the battle.
    const left = Math.max(0, clock.barTime(battle.endBar) - Math.max(songTime, clock.barTime(battle.startBar)));
    this.timer.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    this._drawLane(battle, clock, songTime);
  }

  _drawLane(battle, clock, now) {
    const g = this.lg, W = this.lw, H = this.lh;
    g.clearRect(0, 0, W, H);
    const hitX = Math.min(120, W * 0.16);
    const pps = (W - hitX - 20) / LOOKAHEAD;
    const cy = H / 2;
    const xOf = (t) => hitX + (t - now) * pps;
    // Lane body
    g.fillStyle = 'rgba(10,6,24,0.72)';
    g.beginPath(); g.roundRect(4, cy - 34, W - 8, 68, 34); g.fill();
    // Beat grid
    const b0 = Math.floor(clock.beatAt(now - 0.5)), b1 = Math.ceil(clock.beatAt(now + LOOKAHEAD));
    for (let b = b0; b <= b1; b++) {
      const x = xOf(clock.beatTime(b));
      if (x < 8 || x > W - 8) continue;
      const bar = b % 4 === 0;
      g.fillStyle = bar ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
      g.fillRect(x - (bar ? 1.5 : 0.75), cy - (bar ? 30 : 20), bar ? 3 : 1.5, bar ? 60 : 40);
    }
    // Hit ring, pulsing on the beat
    const ph = ((clock.beatAt(now) % 1) + 1) % 1, pulse = Math.exp(-ph * 6);
    g.lineWidth = 3 + pulse * 2;
    g.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * pulse})`;
    g.beginPath(); g.arc(hitX, cy, 25 + pulse * 3, 0, Math.PI * 2); g.stroke();
    // Notes
    const notes = battle.visibleNotes('player', now - 0.35, now + LOOKAHEAD + 0.1);
    notes.sort((a, b) => b.time - a.time);
    for (const n of notes) {
      if (n.judged && n.judged !== 'miss' && n.judged !== 'void') continue;
      const x = xOf(n.time);
      const faded = n.judged === 'miss' || n.judged === 'void';
      g.globalAlpha = faded ? 0.3 : 1;
      if (n.kind === 'arrow') this._arrowNote(g, x, cy, n.dir);
      else if (n.kind === 'groove') this._badgeNote(g, x, cy, 24, '#ffc93a', '#fff3c4', 'GROOVE');
      else if (n.kind === 'dodge') this._badgeNote(g, x, cy, 25, '#ff3355', '#ffd0d8', 'DODGE', true);
      else if (n.kind === 'taunt') this._badgeNote(g, x, cy, 25, '#b35cff', '#f0dcff', 'TAUNT', true);
      g.globalAlpha = 1;
    }
    // Stunned: wipe the lane with a warning tint.
    const cur = battle.player.bars.get(Math.floor(clock.beatAt(now) / 4));
    if (cur && cur.type === 'stunned') {
      g.fillStyle = 'rgba(255,40,80,0.18)';
      g.beginPath(); g.roundRect(4, cy - 34, W - 8, 68, 34); g.fill();
    }
  }

  _arrowNote(g, x, y, dir) {
    const r = 20;
    g.fillStyle = DIR_COLOR[dir];
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
    g.save();
    g.translate(x, y);
    g.rotate({ R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[dir]);
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(11, 0); g.lineTo(-2, -10); g.lineTo(-2, -4); g.lineTo(-10, -4); g.lineTo(-10, 4); g.lineTo(-2, 4); g.lineTo(-2, 10);
    g.closePath(); g.fill();
    g.restore();
  }

  _badgeNote(g, x, y, r, fill, stroke, label, diamond) {
    g.fillStyle = fill;
    g.beginPath();
    if (diamond) { g.moveTo(x, y - r - 3); g.lineTo(x + r + 3, y); g.lineTo(x, y + r + 3); g.lineTo(x - r - 3, y); g.closePath(); }
    else g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 3; g.strokeStyle = stroke; g.stroke();
    g.fillStyle = '#1a0a14';
    g.font = '800 9px "Exo 2", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, x, y + 1);
  }

  judge(judgment, delta, wrong) {
    const e = this.judgeEl;
    const txt = wrong ? 'WRONG' : judgment.toUpperCase();
    const timing = (!wrong && judgment !== 'perfect' && judgment !== 'miss') ? (delta < 0 ? 'EARLY' : 'LATE') : '';
    e.innerHTML = `${txt}${timing ? `<small>${timing}</small>` : ''}`;
    e.style.color = JUDGE_COLOR[judgment];
    e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  }

  rivalJudgment(judgment) {
    const e = this.rivalJudge;
    e.textContent = judgment.toUpperCase();
    e.style.color = JUDGE_COLOR[judgment];
    e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  }

  showBanner(text, kind = '', ms = 1400) {
    const b = this.banner;
    b.className = 'sh-banner show ' + kind;
    b.innerHTML = text;
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => { b.className = 'sh-banner ' + kind; }, ms);
  }

  showCallout(text, kind = '', ms = 1600) {
    const c = this.callout;
    c.className = 'sh-callout show ' + kind;
    c.innerHTML = text;
    clearTimeout(this._calloutTimer);
    this._calloutTimer = setTimeout(() => { c.className = 'sh-callout ' + kind; }, ms);
  }

  destroy() {
    clearTimeout(this._bannerTimer); clearTimeout(this._calloutTimer);
    this.root.remove();
  }
}
