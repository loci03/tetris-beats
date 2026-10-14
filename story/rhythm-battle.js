// RhythmBattle — the rules of the dance battle (Bust a Groove's command
// system, see commands.js). Pure logic: it reads song time from the
// MusicClock, takes timestamped inputs, and emits events that the dancers,
// camera, stage, HUD and audio react to. No rendering here.
//
// Per 4/4 bar, for each dancer (both at once, independently):
//   • COMMAND bar: the options on offer come from the dancer's place in the
//     8-row command tree — TOP continues at their move level, BOTTOM (when
//     eligible) steps up a level. Directions go into the dancer's ordered
//     input buffer any time before beat 4 (each narrows the candidates);
//     the command's button (✕ / ○) must land on beat 4. Success = the whole
//     sequence entered + the right button + inside the timing window; the
//     move plays through the next bar and the string advances. Anything
//     else is a miss: the string restarts at row 1.
//   • Row 8 is the FREEZE: the next bar is a REST bar (no command).
//   • ATTACK: △ on beat 4 instead of the button (twice per battle). It
//     doesn't break the attacker's string. The defender's next bar becomes
//     a DODGE bar: □ on beat 4 dodges (string kept); otherwise they're hit —
//     stunned for a bar, string reset. A dancer in a Freeze is immune.
//   • SOLO (our addition): with a full gauge on rows 5-7 the BOTTOM option
//     is the dancer's SOLO command; landing it gives them two bars of solo.
// The rival runs the same rules: its AI produces timestamped inputs that go
// through the very same buffer and judge as the player's.
//
// Scheduled work (bar preparation, AI inputs, time-outs) is processed in
// song-time order (`_advanceTo`), so results don't depend on frame rate.

import { makeRng } from './chart.js';
import { OpponentAI } from './opponent-ai.js';
import {
  RULES, windowsFor, judgeTiming, resolveCommands, advance, startCandidates, applyDirection,
  resolveFinal, commandStatus, InputBuffer, ROWS,
} from './commands.js';

export const WINDOWS = RULES.timing;
export const STRING_ROWS = ROWS;
const ENTH_GAIN = { perfect: 22, great: 16, good: 10, miss: -20 };
const ATTACK_LAND_BONUS = 1500;
const DODGE_BONUS = 800;
const FREEZE_BONUS = 1200;
// SOLO TIME: two bars that are the dancer's alone (no commands); the
// opponent watches. Each solo bar scores this much.
const SOLO_BARS = 2;
const SOLO_BAR_POINTS = 2500;
// Bars are built this far ahead (seconds) so the HUD can show what's coming.
export const LOOKAHEAD = 2.5;
const INPUT_BAR_TYPES = ['command', 'dodge'];

function newDancer(id, controller) {
  return {
    id, controller,                       // 'human' | 'ai' | 'none'
    score: 0, chain: 0, maxCombo: 0, level: 1, enthusiasm: 0, jammers: RULES.jammers,
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    moves: 0, branches: 0, solos: 0, tauntsLanded: 0, dodges: 0, stuns: 0, attacks: 0, bestLevel: 1,
    bars: new Map(), barPoints: new Map(), forced: new Map(),
    row: 0, col: 0, strings: 0, freezes: 0,
    lastPress: -Infinity, aiQueue: [], soloUntil: 0, soloRole: null,
    get combo() { return this.chain; },
    get hype() { return this.jammers > 0 ? 100 : 0; },
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class RhythmBattle {
  // practice: { holdRow, startRow (0-7), startCol, branch: 'auto'|'always'|'never', rival: 'ai'|'none' }
  constructor({ clock, music, seed = 1, aiProfile, practice = null, rival = 'ai', timing = null }) {
    this.clock = clock;
    this.music = music;
    this.startBar = music.battleStartBar;
    this.endBar = music.battleStartBar + music.battleBars; // exclusive
    this.introStartBar = music.battleStartBar - music.introBars;
    this.rng = makeRng(seed);
    this.ai = new OpponentAI(aiProfile, makeRng((seed ^ 0x9e3779b9) >>> 0));
    this.practice = practice;
    this.win = windowsFor(clock.spb, timing || RULES.timing);
    this.inputGrace = RULES.inputGrace;   // song seconds (see RULES.inputGrace)
    this.player = newDancer('player', 'human');
    this.rival = newDancer('rival', practice && practice.rival === 'none' ? 'none' : rival);
    for (const d of [this.player, this.rival]) this._restart(d);
    this.solo = { player: null, rival: null };    // { seq, button } per dancer
    this.groove = 0;            // tug of war: -1 rival … +1 player
    this.nextBuild = this.startBar;
    this.lastBarSeen = this.introStartBar - 1;
    this.lastBeatSeen = this.introStartBar * (clock.beatsPerBar || 4) - 1;
    this.listeners = [];
    this.ended = false;
    this.songTime = -Infinity;
    this._clockT = -Infinity;   // song time the schedule has been processed to
  }

  on(fn) { this.listeners.push(fn); return this; }
  emit(type, data) { for (const f of this.listeners) f(type, data); }
  dancer(who) { return who === 'player' ? this.player : this.rival; }
  other(who) { return who === 'player' ? 'rival' : 'player'; }
  barIndex(bar) { return bar - this.startBar; }       // 0-based battle bar
  get barsTotal() { return this.endBar - this.startBar; }
  setSoloCommand(who, cmd) { this.solo[who] = cmd; }

  // A dancer's string state after a miss / at the start (practice can pin
  // a row and level).
  _restart(d) {
    const p = this.practice;
    d.row = p && p.startRow != null ? clamp(p.startRow, 0, ROWS - 1) : 0;
    d.col = p && p.startCol != null ? Math.max(0, Math.min(d.row, p.startCol)) : 0;
  }

  // ── Bars ─────────────────────────────────────────────────────────
  _materialize(type, bar, who, meta = {}) {
    const clock = this.clock, t0 = clock.barTime(bar), spb = clock.spb;
    const b = {
      bar, who, type, t0, end: clock.barTime(bar + 1), finish: t0 + 3 * spb,
      resolved: false, success: false, prepared: false, options: null, cands: null,
      buffer: new InputBuffer(), judged: null, delta: 0, reason: null, chosen: null, resolvedAt: null, meta,
    };
    // The timed press of the bar (the HUD / old callers read `finisher`).
    if (INPUT_BAR_TYPES.includes(type)) {
      b.finisher = { bar, who, kind: type === 'dodge' ? 'dodge' : 'groove', time: b.finish, judged: null, delta: 0 };
      b.notes = [b.finisher];
    } else b.notes = [];
    return b;
  }

  _buildBar(bar) {
    for (const d of [this.player, this.rival]) {
      let type = 'command', meta = {};
      if (bar < d.soloUntil) type = d.soloRole;
      else if (d.forced.has(bar)) ({ type, meta } = d.forced.get(bar));
      else if (d.controller === 'none') type = 'idle';
      d.forced.delete(bar);
      d.bars.set(bar, this._materialize(type, bar, d.id, meta));
    }
    this.emit('barBuilt', { bar, player: this.player.bars.get(bar), rival: this.rival.bars.get(bar) });
  }

  // Turn a (future) bar of `d` into `type` — rest / dodge / stunned.
  _setBarType(d, bar, type, meta = {}) {
    if (bar >= this.endBar || bar < d.soloUntil) return false;
    const prev = d.bars.get(bar);
    if (prev) {
      if (prev.resolved) return false;
      d.bars.set(bar, this._materialize(type, bar, d.id, meta));
      d.aiQueue = d.aiQueue.filter(e => e.bar !== bar);
      this.emit('barReplaced', { who: d.id, bar, type });
    } else d.forced.set(bar, { type, meta });
    return true;
  }

  // When a bar's command is decided and shown: the moment the dancer's
  // previous command is decided (its result picks the next node), or a beat
  // before the bar when nothing is pending (first bar, after a rest …).
  _prepareTime(d, b) {
    const prev = d.bars.get(b.bar - 1);
    if (prev && INPUT_BAR_TYPES.includes(prev.type) && !prev.resolved) return Infinity;
    return b.t0 - this.clock.spb;
  }

  _prepare(d, b, t) {
    if (b.prepared || b.resolved) return;
    // A dancer switched off (practice: rival off) just grooves.
    if (d.controller === 'none' && b.type === 'command') { b.type = 'idle'; b.notes = []; b.finisher = null; return; }
    b.prepared = true;
    b.preparedAt = t;
    if (b.type === 'command') {
      b.options = b.cands = startCandidates(resolveCommands(d, {
        branch: this.practice && this.practice.branch, solo: this.solo[d.id],
      }));
      b.tier = d.level;
      this.emit('commandReady', { who: d.id, bar: b.bar, options: b.cands });
    } else if (b.type === 'dodge') {
      this.emit('commandReady', { who: d.id, bar: b.bar, dodge: true });
    }
    if (d.controller === 'ai') this._planAI(d, b, t);
  }

  // ── AI: timestamped inputs through the same judge ────────────────
  _planAI(d, b, t) {
    const clock = this.clock, spb = clock.spb, ev = [];
    const at = (time, kind, value) => ev.push({ t: Math.max(t + 0.01, time), kind, value, bar: b.bar });
    if (b.type === 'dodge') {
      if (this.ai.dodges(b.meta.judgment || 'great', this.groove < 0)) at(b.finish + (this.ai.rng() * 2 - 1) * 0.05, 'S');
      d.aiQueue.push(...ev); d.aiQueue.sort((a, c) => a.t - c.t);
      return;
    }
    const pressure = Math.max(0, d === this.rival ? this.groove : -this.groove);
    // Spend a jammer instead of dancing this bar?
    if (d.jammers > 0 && this._attackAllowed(d, b) && this.ai.rng() < (this.ai.p.tauntChance ?? 0.5) * 0.12) {
      at(b.finish + (this.ai.rng() * 2 - 1) * 0.04, 'T');
      d.aiQueue.push(...ev); d.aiQueue.sort((a, c) => a.t - c.t);
      return;
    }
    const opts = b.cands;
    const opt = opts.length > 1 && this.ai.takesBranch(opts[1]) ? opts[1] : opts[0];
    const { judgment, delta } = this.ai.judge(opt, pressure);
    // Arrows spread through the measure, then the button.
    const n = opt.seq.length, from = Math.max(t + 0.05, b.t0 - spb * 0.6), to = b.finish - spb * 0.6;
    for (let i = 0; i < n; i++) at(from + (to - from) * (i + 1) / (n + 1), 'dir', opt.seq[i]);
    if (judgment !== 'miss') at(b.finish + clamp(delta, -this.win.good * 0.95, this.win.good * 0.95), opt.button);
    else if (this.ai.rng() < 0.5) at(b.finish - this.win.good - 0.05 - this.ai.rng() * spb, opt.button);   // jumps the gun
    // else: never presses — the time-out judges it.
    d.aiQueue.push(...ev); d.aiQueue.sort((a, c) => a.t - c.t);
  }

  // ── Input ────────────────────────────────────────────────────────
  // A human input: who = 'player' | 'rival', action = U D L R (directions),
  // X O (the final buttons), T (attack △), S (dodge □). evTime is the
  // event's performance.now() timestamp (converted with the clock's latency
  // and calibration offsets).
  input(who, action, evTime) {
    // Back-compat: input(kind, dir, ts) with kind 'arrow' | 'groove' | 'taunt'.
    if (who === 'arrow' || who === 'groove' || who === 'taunt') {
      const map = { arrow: action, groove: 'X', taunt: 'T' };
      return this.input('player', map[who], evTime);
    }
    return this.inputAt(who, action, this.clock.inputSongTime(evTime));
  }

  // The same, at a song time (seconds).
  inputAt(who, action, t) {
    if (this.ended) return null;
    const d = this.dancer(who);
    this._advanceTo(t);
    if (action === 'U' || action === 'D' || action === 'L' || action === 'R') return this._dir(d, t, action);
    if (action === 'X' || action === 'O') return this._button(d, t, action);
    if (action === 'T') return this._attack(d, t);
    if (action === 'S') return this._dodge(d, t);
    return null;
  }

  // The bar a press at song time t belongs to: the dancer's earliest
  // unresolved, prepared input bar whose window hasn't closed.
  _inputBar(d, t) {
    let best = null;
    for (const b of d.bars.values()) {
      if (b.resolved || !b.prepared || !INPUT_BAR_TYPES.includes(b.type)) continue;
      if (t > b.finish + this.win.good + 1e-6) continue;
      if (!best || b.bar < best.bar) best = b;
    }
    return best;
  }

  _dir(d, t, dir) {
    const b = this._inputBar(d, t);
    // Directions only count before beat 4.
    if (!b || b.type !== 'command' || t > b.finish) {
      this.emit('stray', { who: d.id, kind: 'dir', value: dir, t });
      return { stray: true };
    }
    const r = applyDirection(b.cands, dir);
    b.buffer.push(t, 'dir', dir, r.ok ? 'ok' : 'wrong');
    const st = commandStatus(b.cands);
    this.emit('dir', { who: d.id, bar: b.bar, dir, ok: r.ok, complete: st.phase === 'button', status: st });
    return { ok: r.ok, bar: b.bar };
  }

  _button(d, t, button) {
    if (t - d.lastPress < RULES.doubleTap) { this.emit('stray', { who: d.id, kind: 'double', value: button, t }); return { stray: true }; }
    const b = this._inputBar(d, t);
    if (!b || b.type !== 'command') { this.emit('stray', { who: d.id, kind: 'btn', value: button, t }); return { stray: true }; }
    const dt = t - b.finish;
    // Right after a command appears, an early press is the tail of the last
    // one (a late or doubled press), not a commitment to this one.
    if (dt < -this.win.good && t - b.preparedAt < RULES.graceAfterShow) {
      this.emit('stray', { who: d.id, kind: 'late', value: button, t });
      return { stray: true };
    }
    d.lastPress = t;
    b.buffer.push(t, 'btn', button, null);
    if (dt < -this.win.good) return this._judgeCommand(d, b, 'miss', dt, null, 'early', t);
    const j = judgeTiming(dt, this.win);
    const r = resolveFinal(b.cands, button);
    if (!r.ok) return this._judgeCommand(d, b, 'miss', dt, null, r.reason, t);
    return this._judgeCommand(d, b, j, dt, r.option, null, t);
  }

  _attackAllowed(d, b) {
    const foe = this.dancer(this.other(d.id));
    return b.bar + 1 < this.endBar - 1 && b.bar >= this.startBar && b.bar + 1 >= foe.soloUntil && b.bar >= d.soloUntil;
  }

  _attack(d, t) {
    const b = this._inputBar(d, t);
    if (!b || b.type !== 'command' || Math.abs(t - b.finish) > this.win.good) {
      this.emit('stray', { who: d.id, kind: 'attack', t });
      return { stray: true };
    }
    if (d.jammers <= 0) { this.emit('tauntNotReady', { who: d.id, jammers: 0 }); return { blocked: true }; }
    if (!this._attackAllowed(d, b)) { this.emit('tauntBlocked', { who: d.id }); return { blocked: true }; }
    const dt = t - b.finish, j = judgeTiming(dt, this.win);
    d.lastPress = t;
    d.jammers--; d.attacks++;
    b.buffer.push(t, 'atk', 'T', j);
    b.resolved = true; b.success = true; b.judged = j; b.delta = dt; b.kind = 'attack'; b.resolvedAt = t;
    b.finisher.judged = j; b.finisher.delta = dt;
    const foe = this.dancer(this.other(d.id));
    // A dancer holding a Freeze (its rest measure) is immune (original).
    const nb = foe.bars.get(b.bar + 1), nf = foe.forced.get(b.bar + 1);
    const immune = (nb ? nb.type : nf && nf.type) === 'rest';
    if (!immune) this._setBarType(foe, b.bar + 1, 'dodge', { attacker: d.id, judgment: j });
    this.emit('judge', { who: d.id, note: b.finisher, judgment: j, delta: dt, kind: 'attack' });
    this.emit('taunt', { attacker: d.id, bar: b.bar, judgment: j, dodgeBar: immune ? null : b.bar + 1, immune, jammers: d.jammers });
    this._afterResolve(d, b, t);
    return { attack: true, judgment: j };
  }

  _dodge(d, t) {
    const b = this._inputBar(d, t);
    if (!b || b.type !== 'dodge') { this.emit('stray', { who: d.id, kind: 'dodge', t }); return { stray: true }; }
    d.lastPress = t;
    const dt = t - b.finish;
    b.buffer.push(t, 'dodge', 'S', null);
    const j = dt < -this.win.good ? 'miss' : judgeTiming(dt, this.win);
    return this._resolveDodge(d, b, j, dt, t, dt < -this.win.good ? 'early' : null);
  }

  // ── Resolution ───────────────────────────────────────────────────
  _judgeCommand(d, b, j, dt, opt, reason, t) {
    b.resolved = true; b.resolvedAt = t;
    b.judged = j; b.delta = dt; b.reason = reason; b.chosen = opt;
    b.finisher.judged = j; b.finisher.delta = dt;
    b.success = j !== 'miss';
    d.counts[j]++;
    let pts = 0;
    if (b.success) {
      d.chain++;
      d.maxCombo = Math.max(d.maxCombo, d.chain);
      pts = Math.round(opt.points * RULES.judgmentScale[j] * (1 + Math.min(d.chain, 20) * 0.02));
      this._addPoints(d, b.bar, pts);
    }
    this.emit('judge', { who: d.id, note: b.finisher, judgment: j, delta: dt, reason, points: pts, combo: d.chain, option: opt && opt.kind, node: opt && opt.node });
    if (b.success) this._landed(d, b, j, opt, pts);
    else this._missed(d, b, reason);
    this._afterResolve(d, b, t);
    return { judgment: j, reason, option: opt };
  }

  _landed(d, b, j, opt, pts) {
    d.moves++;
    if (opt.kind === 'branch') d.branches++;
    if (opt.kind === 'solo') d.solos++;
    // A solo spends the gauge: it's the climax, not a loop.
    d.enthusiasm = opt.kind === 'solo' ? 25 : clamp(d.enthusiasm + ENTH_GAIN[j] + (opt.kind === 'branch' ? 6 : 0), 0, 100);
    d.bestLevel = Math.max(d.bestLevel, opt.col + 1);
    const soloTime = opt.kind === 'solo' && b.bar + 1 + SOLO_BARS <= this.endBar;
    const freeze = opt.kind !== 'solo' && opt.row >= ROWS && b.bar + 1 < this.endBar;
    const string = d.strings;
    const next = advance(d, opt, { hold: !!(this.practice && this.practice.holdRow) });
    d.row = next.row; d.col = next.col;
    d.level = d.col + 1;                  // the move level of the next TOP command
    if (freeze || soloTime) d.strings++;
    if (freeze) { d.freezes++; this._addPoints(d, b.bar, FREEZE_BONUS); }
    this.emit('move', {
      who: d.id, bar: b.bar + 1, node: opt.node, row: opt.row - 1, col: opt.col, kind: opt.kind,
      tier: Math.min(4, 1 + Math.floor((opt.row - 1) / 2)), judgment: j, perfect: j === 'perfect', bonus: pts,
      points: opt.points, chain: d.chain, soloTime, string, freeze,
    });
    if (soloTime) this._startSolo(d, b.bar + 1);
    else if (freeze) this._setBarType(d, b.bar + 1, 'rest');
  }

  _missed(d, b, reason) {
    d.chain = 0;
    this._restart(d);
    d.level = d.col + 1;
    d.enthusiasm = clamp(d.enthusiasm + ENTH_GAIN.miss, 0, 100);
    this.emit('fumble', { who: d.id, bar: b.bar, reason });
  }

  _resolveDodge(d, b, j, dt, t, reason = null) {
    b.resolved = true; b.resolvedAt = t; b.judged = j; b.delta = dt; b.reason = reason;
    b.finisher.judged = j; b.finisher.delta = dt;
    const attacker = this.dancer(b.meta.attacker || this.other(d.id));
    this.emit('judge', { who: d.id, note: b.finisher, judgment: j, delta: dt, kind: 'dodge', reason });
    if (j !== 'miss') {
      // Dodged: the string carries on where it was.
      b.success = true;
      d.dodges++;
      this._addPoints(d, b.bar, DODGE_BONUS);
      this.emit('dodge', { who: d.id, attacker: attacker.id, bar: b.bar, judgment: j });
    } else {
      b.success = false;
      d.stuns++;
      d.chain = 0;
      this._restart(d);
      d.level = d.col + 1;
      d.enthusiasm = clamp(d.enthusiasm - 30, 0, 100);
      attacker.tauntsLanded++;
      this._addPoints(attacker, b.bar, ATTACK_LAND_BONUS);
      this._setBarType(d, b.bar + 1, 'stunned');
      this.emit('tauntLanded', { attacker: attacker.id, defender: d.id, bar: b.bar, stunBar: b.bar + 1 });
    }
    this._afterResolve(d, b, t);
    return { judgment: j, dodge: j !== 'miss' };
  }

  // The next command shows as soon as this one is decided.
  _afterResolve(d, b, t) {
    const next = d.bars.get(b.bar + 1);
    if (next && INPUT_BAR_TYPES.includes(next.type)) this._prepare(d, next, t);
    this._barDone(b.bar);
  }

  _addPoints(d, bar, pts) {
    d.score += pts;
    d.barPoints.set(bar, (d.barPoints.get(bar) || 0) + pts);
  }

  // SOLO TIME: the next SOLO_BARS bars become 'solo' for the dancer and
  // 'watch' for the opponent (bars already built are swapped out).
  _startSolo(d, startBar) {
    const foe = this.dancer(this.other(d.id));
    const until = startBar + SOLO_BARS;
    for (const dd of [d, foe]) {
      dd.soloRole = dd === d ? 'solo' : 'watch';
      for (let bar = startBar; bar < until; bar++) {
        const prev = dd.bars.get(bar);
        if (prev && prev.resolved) continue;
        if (prev) this.emit('barReplaced', { who: dd.id, bar, type: dd.soloRole });
        dd.bars.set(bar, this._materialize(dd.soloRole, bar, dd.id));
        dd.forced.delete(bar);
      }
      dd.aiQueue = dd.aiQueue.filter(e => e.bar < startBar || e.bar >= until);
      dd.soloUntil = until;
    }
    this.emit('soloStart', { who: d.id, bar: startBar, bars: SOLO_BARS });
  }

  // Once both dancers' bars are resolved, nudge the groove meter.
  _barDone(bar) {
    const pb = this.player.bars.get(bar), rb = this.rival.bars.get(bar);
    if (!pb || !rb || !pb.resolved || !rb.resolved || pb._grooved) return;
    pb._grooved = true;
    const pp = this.player.barPoints.get(bar) || 0;
    const rp = this.rival.barPoints.get(bar) || 0;
    const delta = clamp((pp - rp) / 2400, -0.35, 0.35);
    this.groove = clamp(this.groove * 0.85 + delta, -1, 1);
    this.emit('bar', { bar, playerPoints: pp, rivalPoints: rp, groove: this.groove });
  }

  // ── Time ─────────────────────────────────────────────────────────
  update(songTime) {
    this.songTime = songTime;
    if (this.ended) return;
    const clock = this.clock;
    // Beats (for the HUD's pulse — the same grid beat 4 is judged on). A
    // jump back (seek) restarts the count; a jump forward reports the beats
    // passed, the last one being the current.
    const curBeat = Math.floor(clock.beatAt(songTime) + 1e-9);
    if (curBeat < this.lastBeatSeen) this.lastBeatSeen = curBeat - 1;
    if (curBeat - this.lastBeatSeen > 8) this.lastBeatSeen = curBeat - 1;
    while (this.lastBeatSeen < curBeat) {
      const k = ++this.lastBeatSeen;
      if (k >= this.introStartBar * clock.beatsPerBar && k < this.endBar * clock.beatsPerBar) {
        const bar = Math.floor(k / clock.beatsPerBar);
        this.emit('beat', { beat: k, bar, count: k - bar * clock.beatsPerBar + 1, time: clock.barTime(bar) + (k - bar * clock.beatsPerBar) * clock.spb });
      }
    }
    // Bar starts (intro + battle).
    const curBar = Math.floor(clock.beatAt(songTime) / clock.beatsPerBar);
    while (this.lastBarSeen < curBar) {
      this.lastBarSeen++;
      const b = this.lastBarSeen;
      if (b >= this.introStartBar && b < this.endBar) this.emit('barStart', { bar: b, index: this.barIndex(b) });
    }
    this._advanceTo(songTime);
    // Battle over at the downbeat after the last battle bar.
    if (!this.ended && songTime >= clock.barTime(this.endBar)) {
      this.ended = true;
      this.emit('end', this.summary());
    }
  }

  // Everything scheduled up to song time `t`, in time order: building bars,
  // showing commands, the AI's inputs, missed windows and note-less bars
  // ending. Called by update() and before every input.
  _advanceTo(t) {
    const clock = this.clock;
    while (this.nextBuild < this.endBar && clock.barTime(this.nextBuild) - LOOKAHEAD <= t) {
      this._buildBar(this.nextBuild);
      this.nextBuild++;
    }
    for (let guard = 0; guard < 10000; guard++) {
      let best = null;
      const consider = (time, fn) => { if (time <= t && (!best || time < best.time)) best = { time, fn }; };
      for (const d of [this.player, this.rival]) {
        if (d.aiQueue.length) {
          const e = d.aiQueue[0];
          consider(e.t, () => {
            d.aiQueue.shift();
            if (e.kind === 'dir') this._dir(d, e.t, e.value);
            else if (e.kind === 'T') this._attack(d, e.t);
            else if (e.kind === 'S') this._dodge(d, e.t);
            else this._button(d, e.t, e.kind);
          });
        }
        for (const b of d.bars.values()) {
          if (b.resolved) continue;
          if (INPUT_BAR_TYPES.includes(b.type)) {
            if (!b.prepared) { const pt = this._prepareTime(d, b); consider(pt, () => this._prepare(d, b, pt)); }
            else {
              const tt = b.finish + this.win.good;
              consider(tt + this.inputGrace + 1e-6, () => {
                if (b.type === 'dodge') this._resolveDodge(d, b, 'miss', this.win.good, tt);
                else {
                  const st = commandStatus(b.cands);
                  this._judgeCommand(d, b, 'miss', this.win.good, null, st.phase === 'button' ? 'late' : 'incomplete', tt);
                }
              });
            }
          } else {
            consider(b.end, () => this._endNoteless(d, b));
          }
        }
      }
      if (!best) break;
      this._clockT = best.time;
      best.fn();
    }
  }

  // Note-less bars (stunned / rest / solo / watch / idle) resolve when they
  // end; solo bars pay out.
  _endNoteless(d, b) {
    b.resolved = true; b.resolvedAt = b.end;
    if (b.type === 'solo') {
      b.success = true;
      this._addPoints(d, b.bar, SOLO_BAR_POINTS);
      if (b.bar + 1 >= d.soloUntil) {
        d.row = 0; d.col = 0; d.level = 1;
        this.emit('soloEnd', { who: d.id, bar: b.bar });
      }
    }
    this._afterResolve(d, b, b.end);
  }

  summary() {
    const pack = (d) => ({
      score: d.score, counts: { ...d.counts }, maxCombo: d.maxCombo, moves: d.moves,
      branches: d.branches, solos: d.solos, bestTier: d.bestLevel, freezes: d.freezes, strings: d.strings,
      tauntsLanded: d.tauntsLanded, dodges: d.dodges, stuns: d.stuns, attacks: d.attacks,
    });
    const player = pack(this.player), rival = pack(this.rival);
    return { winner: player.score >= rival.score ? 'player' : 'rival', player, rival, groove: this.groove };
  }

  // What the HUD shows for `who` at song time t: the command being entered
  // (or the dodge), the one just judged for a moment after its result, or
  // the bar that's on (rest / stunned / solo …).
  commandFor(who, t) {
    const d = this.dancer(who);
    let open = null, recent = null, now = null;
    const cur = Math.floor(this.clock.beatAt(t) / this.clock.beatsPerBar);
    for (const b of d.bars.values()) {
      if (!b.resolved && b.prepared && INPUT_BAR_TYPES.includes(b.type)) { if (!open || b.bar < open.bar) open = b; }
      if (b.resolved && INPUT_BAR_TYPES.includes(b.type) && b.resolvedAt != null && t >= b.resolvedAt && t - b.resolvedAt < 0.35) {
        if (!recent || b.bar > recent.bar) recent = b;
      }
      if (b.bar === cur) now = b;
    }
    if (recent) return recent;
    if (open) return open;
    return now && !INPUT_BAR_TYPES.includes(now.type) ? now : null;
  }

  // Back-compat for older callers: the timed presses in a window.
  visibleNotes(who, fromTime, toTime) {
    const out = [];
    for (const b of this.dancer(who).bars.values()) for (const n of b.notes) if (n.time >= fromTime && n.time <= toTime) out.push(n);
    return out;
  }
}
