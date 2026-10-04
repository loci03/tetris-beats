// BattleHUD — the rhythm battle's 2D overlay: both dancers' score, combo,
// level, enthusiasm and hype gauges, the groove tug-of-war meter and timer,
// the command panel (the direction sequence to enter, with a ★ branch row
// when the command tree offers one), the beat lane (counts 1-2-3 into the
// GROOVE hit on beat 4), judgment pops, banners and — on touch screens —
// swipe input plus GROOVE / TAUNT buttons.

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
  constructor({ names, isTouch, onPad, onPause }) {
    this.names = names;
    this.root = el('div', 'story-hud');
    this.root.setAttribute('aria-live', 'polite');
    const top = el('div', 'sh-top', this.root);
    this.p = this._panel(top, 'sh-p1', names.player);
    const mid = el('div', 'sh-mid', top);
    const timerRow = el('div', 'sh-timer-row', mid);
    this.timer = el('div', 'sh-timer', timerRow, '1:00');
    if (onPause) {
      const pb = el('button', 'sh-pause', timerRow, '❚❚');
      pb.type = 'button';
      pb.setAttribute('aria-label', 'Pause');
      pb.addEventListener('click', (e) => { e.preventDefault(); onPause(); });
    }
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
      ? 'Swipe the arrows any time · tap GROOVE on beat 4'
      : 'Enter the arrows (← ↑ ↓ → / WASD) any time · SPACE on beat 4 · T = TAUNT');
    this.cmd = el('div', 'sh-cmd', bottom);
    this._cmdKey = '';
    const laneWrap = el('div', 'sh-lane-wrap', bottom);
    this.lane = el('canvas', 'sh-lane', laneWrap);
    this.judgeEl = el('div', 'sh-judge', laneWrap);
    this.lg = this.lane.getContext('2d');

    if (isTouch) {
      // Touch: swipe anywhere for the arrows, tap anywhere for GROOVE;
      // GROOVE and TAUNT also get real buttons.
      this.root.classList.add('sh-touch');
      this.swipeZone = el('div', 'sh-swipe', this.root);
      this._initSwipe(this.swipeZone, onPad);
      const pads = el('div', 'sh-pads', this.root);
      el('div', 'sh-swipe-hint', pads, 'SWIPE <b>←&#8202;↑&#8202;↓&#8202;→</b> ANY TIME<br>TAP = GROOVE ON BEAT 4');
      const right = el('div', 'sh-pad-acts', pads);
      this.tauntPad = this._pad(right, 'sh-pad sh-pad-taunt', 'TAUNT', (ts) => onPad('taunt', null, ts));
      this._pad(right, 'sh-pad sh-pad-groove', 'GROOVE', (ts) => onPad('groove', null, ts));
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
    const lv = el('div', 'sh-lv', row, 'LV 1');
    const combo = el('div', 'sh-combo', row, '');
    const enth = el('div', 'sh-enth', p);
    const enthFill = el('i', '', enth);
    el('span', '', enth, 'ENTHUSIASM');
    const hype = el('div', 'sh-hype', p);
    const fill = el('i', '', hype);
    const label = el('span', '', hype, 'HYPE');
    return { p, score, pips, lv, combo, enth, enthFill, hype, fill, label };
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

  // Swipe recognition. A swipe is judged at the onset of the flick — the
  // last moment the finger was still (the touch itself for a quick flick)
  // plus a little of the travel — not when it finally crosses the distance
  // threshold, so a swipe started on the beat counts as on the beat. The
  // finger can keep going after a swipe: turning chains the next arrow from
  // the turning point (zig-zags), and pausing re-arms the same direction.
  // A touch that never travels is a tap (GROOVE), timed at touch-down.
  _initSwipe(zone, onPad) {
    const ptrs = new Map();
    const threshold = () => Math.max(18, Math.min(42, Math.min(window.innerWidth, window.innerHeight) * 0.05));
    const STILL = 2.5;                                   // px between samples that counts as "not moving"
    const VEC = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { zone.setPointerCapture(e.pointerId); } catch {}
      const a = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      ptrs.set(e.pointerId, { down: a, anchor: a, last: a, armed: true, dir: null, swiped: false });
    });
    zone.addEventListener('pointermove', (e) => {
      const s = ptrs.get(e.pointerId);
      if (!s) return;
      const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
      for (const ev of (evs.length ? evs : [e])) {
        const pt = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp };
        const step = Math.hypot(pt.x - s.last.x, pt.y - s.last.y);
        s.last = pt;
        if (step < STILL) {                              // resting: re-anchor here
          if (Math.hypot(pt.x - s.anchor.x, pt.y - s.anchor.y) < threshold() * 0.5) { s.anchor = pt; s.armed = true; }
          continue;
        }
        if (!s.armed && s.dir) {
          // Still travelling the way we just swiped: drag the anchor along so
          // a turn is measured from the turning point.
          const v = VEC[s.dir], mx = pt.x - s.anchor.x, my = pt.y - s.anchor.y;
          const along = mx * v[0] + my * v[1], across = Math.abs(mx * v[1] - my * v[0]);
          if (along > 0 && along >= across) { s.anchor = pt; continue; }
        }
        const dx = pt.x - s.anchor.x, dy = pt.y - s.anchor.y;
        const th = threshold();
        if (dx * dx + dy * dy < th * th) continue;
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
        if (!s.armed && dir === s.dir) continue;
        const ts = s.anchor.t + Math.min(40, (pt.t - s.anchor.t) * 0.4);
        onPad('arrow', dir, ts);
        this._swipeFx(s.anchor.x, s.anchor.y, dir);
        s.armed = false; s.swiped = true; s.dir = dir;
        s.anchor = pt;
      }
    });
    const end = (e, cancel) => {
      const s = ptrs.get(e.pointerId);
      if (!s) return;
      ptrs.delete(e.pointerId);
      if (cancel || s.swiped) return;
      const moved = Math.hypot(e.clientX - s.down.x, e.clientY - s.down.y);
      if (moved < threshold() && e.timeStamp - s.down.t < 450) {
        onPad('groove', null, s.down.t);
        this._swipeFx(s.down.x, s.down.y, 'G');
      }
    };
    zone.addEventListener('pointerup', (e) => end(e, false));
    zone.addEventListener('pointercancel', (e) => end(e, true));
  }

  _swipeFx(x, y, dir) {
    const fx = el('div', 'sh-swipe-fx' + (dir === 'G' ? ' tap' : ''), this.root, dir === 'G' ? '' : DIR_GLYPH[dir]);
    fx.style.left = x + 'px';
    fx.style.top = y + 'px';
    if (dir !== 'G') {
      fx.style.setProperty('--c', DIR_COLOR[dir]);
      const v = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[dir];
      fx.style.setProperty('--dx', v[0] * 70 + 'px');
      fx.style.setProperty('--dy', v[1] * 70 + 'px');
    }
    setTimeout(() => fx.remove(), 450);
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
      ui.pips.forEach((pip, i) => pip.classList.toggle('on', i < d.level));
      ui.lv.textContent = `LV ${d.level}`;
      ui.combo.textContent = d.combo >= 2 ? `${d.combo} COMBO` : '';
      ui.enthFill.style.width = d.enthusiasm + '%';
      ui.enth.classList.toggle('branch', d.enthusiasm >= 50);
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
    this._drawCommand(battle, songTime);
    this._drawLane(battle, clock, songTime);
  }

  // The option being entered: the one with the most arrows in (ties go to
  // the standard command, listed first).
  static activeOption(b) {
    let best = b.options[0];
    for (const o of b.options) if (o.progress > best.progress) best = o;
    return best;
  }

  // The command panel lists the *other* option(s) on offer — the ★ branch
  // or SOLO row next to the standard command (the active option's arrows
  // are drawn on the lane). Entered arrows light up; a ready row glows.
  _drawCommand(battle, now) {
    const b = battle.commandFor('player', now);
    const act = b && b.type === 'command' ? BattleHUD.activeOption(b) : null;
    const key = !b ? 'none' : `${b.bar}:${b.type}:` + (act ? b.options.map(o => o.id + o.seq.join('')).join('|') + ':' + act.id : '');
    if (key !== this._cmdKey) {
      this._cmdKey = key;
      this.cmd.innerHTML = '';
      this._rows = [];
      if (act) {
        for (const o of b.options) {
          if (o === act) continue;
          const row = el('div', 'sh-cmd-row ' + o.kind, this.cmd);
          el('span', 'sh-cmd-tag', row, o.kind === 'std' ? `OR LV ${o.level}` : o.kind === 'branch' ? '★ BRANCH' : '★★ SOLO');
          const chips = o.seq.map(d => {
            const c = el('i', 'sh-chip', row, DIR_GLYPH[d]);
            c.style.setProperty('--c', DIR_COLOR[d]);
            return c;
          });
          if (o.kind !== 'std') el('span', 'sh-cmd-go', row, 'BIGGER MOVE');
          this._rows.push({ o, row, chips, prog: -1 });
        }
      } else if (b) {
        const label = { taunt: 'TAUNT on beat 1!', dodge: 'DODGE! GROOVE on beat 3', stunned: 'STUNNED…',
          solo: '★★ SOLO TIME — the stage is yours! ★★', watch: `${this.names.rival}'s SOLO — watch the show` }[b.type];
        if (label) el('div', 'sh-cmd-row note ' + b.type, this.cmd, label);
      }
    }
    if (!act) return;
    for (const r of this._rows) {
      const prog = r.o.progress;
      if (prog !== r.prog) {
        r.chips.forEach((c, i) => { c.classList.toggle('done', i < prog); c.classList.toggle('next', i === prog); });
        r.row.classList.toggle('ready', prog === r.o.seq.length);
        r.prog = prog;
      }
    }
  }

  // Where the active option's arrows sit on the lane: spread over the
  // bar, ending half a beat before the GROOVE note on beat 4. They're a
  // guide — enter them any time before beat 4.
  static arrowBeats(n) {
    if (n <= 1) return [2];
    const step = Math.min(1, 2.5 / (n - 1));
    return Array.from({ length: n }, (_, i) => 2.5 - step * (n - 1 - i));
  }

  // A wrong direction is ignored: shake the panel and lane a little.
  dirFeedback(ok) {
    if (ok) return;
    for (const e of [this.cmd, this.lane]) { e.classList.remove('reset'); void e.offsetWidth; e.classList.add('reset'); }
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
    // Beat grid, counted 1-2-3 into the finisher on 4.
    const b0 = Math.floor(clock.beatAt(now - 0.5)), b1 = Math.ceil(clock.beatAt(now + LOOKAHEAD));
    g.font = '800 11px "Exo 2", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let b = b0; b <= b1; b++) {
      const x = xOf(clock.beatTime(b));
      if (x < 8 || x > W - 8) continue;
      const k = ((b % 4) + 4) % 4;
      const bar = k === 0;
      g.fillStyle = bar ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)';
      g.fillRect(x - (bar ? 1.5 : 0.75), cy - (bar ? 30 : 20), bar ? 3 : 1.5, bar ? 60 : 40);
      if (k < 3) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillText(String(k + 1), x + 9, cy - 22); }
    }
    // Hit ring, pulsing on the beat
    const ph = ((clock.beatAt(now) % 1) + 1) % 1, pulse = Math.exp(-ph * 6);
    g.lineWidth = 3 + pulse * 2;
    g.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * pulse})`;
    g.beginPath(); g.arc(hitX, cy, 25 + pulse * 3, 0, Math.PI * 2); g.stroke();
    // The command's arrows, on the same line, leading into GROOVE.
    for (const b of battle.player.bars.values()) {
      if (b.type !== 'command') continue;
      const t0 = clock.barTime(b.bar);
      if (b.finisher.time < now - 0.4 || t0 > now + LOOKAHEAD + 0.1) continue;
      const o = BattleHUD.activeOption(b);
      const beats = BattleHUD.arrowBeats(o.seq.length);
      const failed = b.resolved && !b.success;
      for (let i = o.seq.length - 1; i >= 0; i--) {
        const x = xOf(t0 + beats[i] * clock.spb);
        if (x < -30 || x > W + 30) continue;
        const done = i < o.progress;
        g.globalAlpha = failed ? 0.25 : done ? 1 : 0.55;
        this._arrowNote(g, x, cy, o.seq[i], done, !done && i === o.progress && !b.resolved);
      }
      g.globalAlpha = 1;
    }
    // Notes
    const notes = battle.visibleNotes('player', now - 0.35, now + LOOKAHEAD + 0.1);
    notes.sort((a, b) => b.time - a.time);
    for (const n of notes) {
      if (n.judged && n.judged !== 'miss' && n.judged !== 'void') continue;
      const x = xOf(n.time);
      const faded = n.judged === 'miss' || n.judged === 'void';
      g.globalAlpha = faded ? 0.3 : 1;
      if (n.kind === 'groove') {
        const b = battle.player.bars.get(n.bar);
        const ready = b && b.options && b.options.some(o => o.progress === o.seq.length);
        this._badgeNote(g, x, cy, ready ? 26 : 23, ready ? '#ffc93a' : '#8a7440', ready ? '#fff3c4' : 'rgba(255,243,196,0.5)', 'GROOVE');
      }
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

  _arrowNote(g, x, y, dir, done, next) {
    const r = done ? 19 : 17;
    g.fillStyle = done ? DIR_COLOR[dir] : 'rgba(20,12,36,0.9)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = next ? 4 : 3;
    g.strokeStyle = done ? '#fff' : next ? '#fff' : DIR_COLOR[dir];
    g.stroke();
    g.save();
    g.translate(x, y);
    g.rotate({ R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[dir]);
    g.fillStyle = done ? '#fff' : DIR_COLOR[dir];
    g.beginPath();
    g.moveTo(10, 0); g.lineTo(-2, -9); g.lineTo(-2, -4); g.lineTo(-9, -4); g.lineTo(-9, 4); g.lineTo(-2, 4); g.lineTo(-2, 9);
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

  judge(judgment, delta, reason) {
    const e = this.judgeEl;
    const txt = reason === 'incomplete' ? 'INCOMPLETE' : reason === 'early' ? 'TOO EARLY' : judgment.toUpperCase();
    const timing = (judgment !== 'perfect' && judgment !== 'miss') ? (delta < 0 ? 'EARLY' : 'LATE') : '';
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
