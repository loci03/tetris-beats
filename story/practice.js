// Practice mode — the battle with a coach: a diagnostics panel showing the
// beat, the command(s) expected, what was received (with each input's
// offset from beat 4), the status ("Waiting for ✕ on beat 4"), the last
// judgment's timing, and the move + animation the command resolved to;
// plus practice controls: start row / level, HOLD (repeat the same
// command), branch availability, rival on / off, speed (restarts), and the
// controls screen. Like the original's Practice mode it also shows each
// command's point value.

import { GLYPH, commandStatus, ROWS, LATTICE } from './commands.js';
import { MOVE_LABELS } from './dance.js';
import { MISSING_ANIMS } from './choreo.js';
import { openControls } from './controls-ui.js';

function css() {
  if (document.getElementById('pr-css')) return;
  const st = document.createElement('style');
  st.id = 'pr-css';
  st.textContent = `
  .pr { position: fixed; left: calc(env(safe-area-inset-left, 0px) + 8px); top: calc(env(safe-area-inset-top, 0px) + 92px); z-index: 12; width: 290px; max-height: calc(100vh - 250px); overflow: auto;
    background: rgba(12, 6, 22, 0.88); border: 1px solid rgba(255, 201, 58, 0.45); border-radius: 14px; padding: 10px 12px;
    font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; color: #efe8ff; pointer-events: auto; }
  .pr h3 { margin: 0 0 6px; font: 900 12px var(--font-display, system-ui); letter-spacing: 3px; color: #ffc93a; display: flex; justify-content: space-between; cursor: pointer; user-select: none; }
  .pr.min { width: auto; padding: 6px 10px; overflow: hidden; }
  .pr.min h3 { margin: 0; }
  .pr.min > :not(h3) { display: none; }
  .pr .k { color: rgba(255,255,255,0.55); }
  .pr .ok { color: #5dffb0; } .pr .bad { color: #ff6b7e; } .pr .dim { color: rgba(255,255,255,0.35); }
  .pr .row { margin: 2px 0; }
  .pr .big { font-size: 14px; font-weight: 700; }
  .pr .hist { display: flex; align-items: center; gap: 2px; height: 34px; margin: 4px 0; border-left: 1px solid rgba(255,255,255,0.2); position: relative; }
  .pr .hist::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed rgba(255,255,255,0.25); }
  .pr .hist i { width: 7px; border-radius: 2px; background: #7ecbff; }
  .pr .ctl { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .pr button, .pr select { font: 700 11px var(--font-ui, system-ui); color: #fff; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.22); border-radius: 7px; padding: 4px 7px; cursor: pointer; }
  .pr button.on { border-color: #ffc93a; color: #ffc93a; }
  @media (max-width: 760px) { .pr { top: calc(env(safe-area-inset-top, 0px) + 96px); width: 70vw; max-height: 45vh; font-size: 10px; } }`;
  document.head.appendChild(st);
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const ms = (s) => `${s >= 0 ? '+' : ''}${Math.round(s * 1000)} ms`;

export class PracticePanel {
  // session: the BattleSession; onRestart(practiceOptions) restarts at
  // another speed.
  constructor(session, { onRestart = null } = {}) {
    css();
    this.s = session;
    this.onRestart = onRestart;
    this.opts = session.practice;
    this.offsets = [];
    this.root = document.createElement('div');
    this.root.className = 'pr';
    this.root.innerHTML = `<h3 title="show / hide"><span>PRACTICE ▾</span><span data-f="speed"></span></h3>
      <div data-f="beat" class="row"></div>
      <div class="row"><span class="k">EXPECTED</span><div data-f="exp" class="big"></div></div>
      <div class="row"><span class="k">RECEIVED</span><div data-f="got" class="big"></div></div>
      <div class="row"><span class="k">STATUS</span> <span data-f="status"></span></div>
      <div class="row"><span class="k">LAST</span> <span data-f="last"></span></div>
      <div class="hist" data-f="hist" title="last 16 presses: offset from beat 4 (±150 ms)"></div>
      <div class="row"><span class="k">MOVE</span> <span data-f="move"></span></div>
      <div class="row"><span class="k">ANIM</span> <span data-f="anim"></span></div>
      <div class="row" data-f="missing"></div>
      <div class="ctl">
        <select data-c="row" title="start row (move type)">${Array.from({ length: ROWS }, (_, i) => `<option value="${i}">ROW ${i + 1}</option>`).join('')}</select>
        <select data-c="col" title="move level (tree column)"></select>
        <button data-c="hold" title="repeat the same command">HOLD</button>
        <button data-c="branch" title="the harder BOTTOM line: auto (enthusiasm) / always / never">BRANCH: AUTO</button>
        <button data-c="rival" title="rival dancing on / off">RIVAL ON</button>
      </div>
      <div class="ctl">
        <button data-c="speed" data-v="0.5">½×</button><button data-c="speed" data-v="0.75">¾×</button><button data-c="speed" data-v="1">1×</button>
        <button data-c="controls">CONTROLS</button>
      </div>`;
    document.body.appendChild(this.root);
    // Collapsible (starts collapsed on phones so the stage stays clear).
    if (window.innerWidth < 760) this.root.classList.add('min');
    this.root.querySelector('h3').onclick = () => this.root.classList.toggle('min');
    this.f = (k) => this.root.querySelector(`[data-f="${k}"]`);
    this.c = (k) => this.root.querySelector(`[data-c="${k}"]`);
    this._wire();
    this._sync();
  }

  _wire() {
    const b = this.s.battle, p = b.player;
    const setCols = (row) => {
      const sel = this.c('col');
      sel.innerHTML = LATTICE[row].map((n, i) => `<option value="${i}">LV ${i + 1} · ${n.seq.map(d => GLYPH[d]).join('') || '—'}${GLYPH[n.button]} (${n.points})</option>`).join('');
      sel.value = String(Math.min(+sel.value || 0, row));
    };
    this.c('row').onchange = (e) => {
      const row = +e.target.value;
      setCols(row);
      this._setStart(row, +this.c('col').value);
    };
    this.c('col').onchange = (e) => this._setStart(+this.c('row').value, +e.target.value);
    this.c('hold').onclick = () => { this.opts.holdRow = !this.opts.holdRow; this._sync(); };
    this.c('branch').onclick = () => {
      const order = ['auto', 'always', 'never'];
      this.opts.branch = order[(order.indexOf(this.opts.branch || 'auto') + 1) % 3];
      this._sync();
    };
    this.c('rival').onclick = () => {
      b.rival.controller = b.rival.controller === 'none' ? 'ai' : 'none';
      this.opts.rival = b.rival.controller;
      this._sync();
    };
    this.root.querySelectorAll('[data-c="speed"]').forEach(btn => { btn.onclick = () => this.onRestart && this.onRestart({ ...this.opts, speed: +btn.dataset.v }); });
    this.c('controls').onclick = () => {
      if (!this.s.paused) this.s._togglePause();
      openControls({ onChange: (c) => { this.s.controls = c; this.s.input.setControls(c); } });
    };
    setCols(p.row);
    this.c('row').value = String(p.row);
    this.c('col').value = String(p.col);
  }

  // The panel's screen rect while it's open (the camera keeps clear of it).
  rect() { return this.root.classList.contains('min') ? null : this.root.getBoundingClientRect(); }

  // Practise from a given row / level: the next command the player gets.
  _setStart(row, col) {
    const p = this.s.battle.player;
    this.opts.startRow = row; this.opts.startCol = col;
    p.row = row; p.col = Math.min(col, row);
    // Re-pick the command that's showing if nothing's been entered yet.
    for (const bar of p.bars.values()) {
      if (bar.type === 'command' && bar.prepared && !bar.resolved && !bar.buffer.length) { bar.prepared = false; bar.cands = bar.options = null; }
    }
  }

  _sync() {
    this.c('hold').classList.toggle('on', !!this.opts.holdRow);
    this.c('branch').textContent = `BRANCH: ${(this.opts.branch || 'auto').toUpperCase()}`;
    this.c('rival').textContent = this.s.battle.rival.controller === 'none' ? 'RIVAL OFF' : 'RIVAL ON';
    this.f('speed').textContent = `${this.opts.speed || 1}× SPEED`;
    this.root.querySelectorAll('[data-c="speed"]').forEach(btn => btn.classList.toggle('on', +btn.dataset.v === (this.opts.speed || 1)));
  }

  onJudge(d) {
    if (d.who !== 'player') return;
    if (Number.isFinite(d.delta) && Math.abs(d.delta) < 0.4) { this.offsets.push(d.delta); if (this.offsets.length > 16) this.offsets.shift(); }
    this.last = d;
  }
  onMove(d, plan, choreo) {
    if (d.who !== 'player') return;
    const md = choreo.moveDef(d.node);
    this.lastMove = { d, plan, md };
  }

  // Per frame.
  update() {
    const s = this.s, b = s.battle, clock = s.clock, t = b.songTime;
    if (!Number.isFinite(t)) return;
    const beat = clock.beatAt(t), bar = Math.floor(beat / 4), inBar = beat - bar * 4;
    this._set('beat', `<span class="k">BAR</span> ${bar}  <span class="k">BEAT</span> <b>${Math.floor(inBar) + 1}</b>.${Math.floor((inBar % 1) * 4) + 1}  <span class="k">BPM</span> ${Math.round(clock.bpm * (clock.rate || 1))}`);
    const cmd = b.commandFor('player', t);
    if (cmd && cmd.type === 'command' && cmd.cands) {
      this._set('exp', cmd.cands.map(o => {
        const cls = o.alive ? '' : 'dim';
        return `<span class="${cls}">${o.slot === 'top' ? 'TOP' : o.kind === 'solo' ? 'SOLO' : 'BOT'} ${o.seq.map(x => GLYPH[x]).join(' ') || '—'} ${GLYPH[o.button]} <span class="k">${o.node} ·${o.points}</span></span>`;
      }).join('<br>'));
      this._set('got', cmd.buffer.events.map(e => {
        const g = e.kind === 'dir' ? GLYPH[e.value] : e.kind === 'btn' ? GLYPH[e.value] : e.kind === 'atk' ? GLYPH.T : GLYPH.S;
        const cls = e.result === 'wrong' ? 'bad' : e.kind === 'dir' ? 'ok' : '';
        return `<span class="${cls}" title="${ms(e.t - cmd.finish)} from beat 4">${g}</span>`;
      }).join(' ') || '<span class="dim">—</span>');
      let st;
      if (cmd.resolved) st = cmd.success ? `<span class="ok">${cmd.judged.toUpperCase()} ${ms(cmd.delta)}</span>` : `<span class="bad">MISS — ${cmd.reason || ''} ${Number.isFinite(cmd.delta) ? ms(cmd.delta) : ''}</span>`;
      else {
        const cs = commandStatus(cmd.cands);
        st = cs.phase === 'dirs' ? `Enter ${cs.next.map(x => GLYPH[x]).join(' or ')} (${cs.entered}/${cs.total})`
          : cs.phase === 'button' ? `Waiting for ${cs.buttons.map(x => GLYPH[x]).join(' or ')} on beat 4 (${ms(t - cmd.finish)})` : '—';
      }
      this._set('status', st);
    } else if (cmd) {
      this._set('exp', cmd.type === 'dodge' ? `${GLYPH.S} on beat 4 (dodge)` : `<span class="dim">${cmd.type.toUpperCase()} bar — no command</span>`);
      this._set('got', cmd.buffer.events.map(e => GLYPH[e.value] || e.value).join(' ') || '<span class="dim">—</span>');
      this._set('status', cmd.resolved ? (cmd.success ? '<span class="ok">OK</span>' : '<span class="bad">MISS</span>') : '');
    }
    if (this.last) {
      const L = this.last;
      this._set('last', `<span class="${L.judgment === 'miss' ? 'bad' : 'ok'}">${L.judgment.toUpperCase()}</span> ${Number.isFinite(L.delta) ? ms(L.delta) : ''} ${L.reason ? esc(L.reason) : ''}`);
    }
    const hk = this.offsets.join(',');
    if (hk !== this._hk) {
      this._hk = hk;
      this.f('hist').innerHTML = this.offsets.map(o => {
        const h = Math.min(17, Math.abs(o) / 0.15 * 17);
        return `<i style="height:${Math.max(2, h)}px; margin-top:${o < 0 ? 0 : -h}px; transform: translateY(${o < 0 ? h / 2 : -h / 2}px); background:${Math.abs(o) <= 0.045 ? '#ffe45c' : Math.abs(o) <= 0.09 ? '#5dffb0' : '#7ecbff'}"></i>`;
      }).join('');
    }
    if (this.lastMove) {
      const { d, plan, md } = this.lastMove;
      this._set('move', md ? `${esc(md.id)} · type ${md.type} · LV ${md.level} · ${md.seq.map(x => GLYPH[x]).join('')}${GLYPH[md.button]} · ${md.points} pts` : esc(d.node || d.kind));
      this._set('anim', plan.map(e => `${esc(e.name)}${e.mirror ? ' (mirror)' : ''} <span class="k">${esc(MOVE_LABELS[e.name] || '')} · ${e.state}</span>`).join('<br>') + `<br><span class="k">now:</span> ${esc(s.pDance.cur.name)} <span class="k">${s.pDance.state}</span>`);
    }
    this._set('missing', MISSING_ANIMS.size ? `<span class="bad">MISSING ANIMS: ${[...MISSING_ANIMS].map(esc).join(', ')}</span>` : '');
  }

  _set(k, html) { const e = this.f(k); if (e._h !== html) { e._h = html; e.innerHTML = html; } }

  destroy() { this.root.remove(); }
}
