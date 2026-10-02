// RhythmBattle — the rules of the dance battle. Pure logic: it reads song
// time from the MusicClock, takes timestamped inputs, and emits events that
// the dancers, camera, stage, HUD and audio react to. No rendering here.
//
// Loop per 4/4 bar (both dancers, simultaneously — like Bust a Groove):
//   • Each dancer gets a command from the command tree (chart.js): a
//     direction sequence, entered any time from the previous bar's finisher
//     until beat 4, then GROOVE exactly on beat 4. Only the finisher is
//     timed (Perfect/Great/Good); a wrong direction clears the sequence.
//   • Land it and the dancer performs the move during the next bar, the
//     level climbs (longer commands, bigger moves, more points) and the
//     ENTHUSIASM gauge fills; once it's high a ★ branch is offered next to
//     the standard command (signature moves), and at level 4 the SOLO.
//     A fumble drops a level and drains enthusiasm.
//   • Landed commands also fill HYPE. Full hype = a TAUNT: press it, hit
//     the taunt note on the next downbeat, and the opponent must DODGE
//     (GROOVE on beat 3) or get stunned for a bar.
//   • The rival runs the same rules with AI-rolled results.

import { buildCommand, buildTauntBar, buildDodgeBar, buildStunnedBar, makeRng } from './chart.js';
import { OpponentAI } from './opponent-ai.js';

export const WINDOWS = { perfect: 0.05, great: 0.1, good: 0.15 };
const FINISH_POINTS = { perfect: 1000, great: 700, good: 400, miss: 0 };
const HYPE_GAIN = { perfect: 18, great: 13, good: 6, miss: -15 };
const ENTH_GAIN = { perfect: 22, great: 15, good: 8, miss: -30 };
const TAUNT_LAND_BONUS = 1500;
const DODGE_BONUS = 800;
// Bars are built (and commands shown) this far ahead; the lane shows the
// finisher this far ahead. Also the last moment a taunt can claim a bar.
export const LOOKAHEAD = 2.0;

function newDancer(id) {
  return {
    id, score: 0, combo: 0, maxCombo: 0, chain: 0, level: 1, enthusiasm: 0, hype: 0,
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    moves: 0, branches: 0, solos: 0, tauntsLanded: 0, dodges: 0, stuns: 0, bestLevel: 1,
    bars: new Map(), stunNext: false, barPoints: new Map(),
  };
}

function judgmentFor(absDelta) {
  if (absDelta <= WINDOWS.perfect) return 'perfect';
  if (absDelta <= WINDOWS.great) return 'great';
  if (absDelta <= WINDOWS.good) return 'good';
  return 'miss';
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class RhythmBattle {
  constructor({ clock, music, seed = 1, aiProfile }) {
    this.clock = clock;
    this.music = music;
    this.startBar = music.battleStartBar;
    this.endBar = music.battleStartBar + music.battleBars; // exclusive
    this.introStartBar = music.battleStartBar - music.introBars;
    this.rng = makeRng(seed);
    this.ai = new OpponentAI(aiProfile, makeRng((seed ^ 0x9e3779b9) >>> 0));
    this.player = newDancer('player');
    this.rival = newDancer('rival');
    this.groove = 0;            // tug of war: -1 rival … +1 player
    this.pendingTaunt = null;   // { attacker, bar }
    this.nextBuild = this.startBar;
    this.lastBarSeen = this.introStartBar - 1;
    this.listeners = [];
    this.ended = false;
    this.songTime = -Infinity;
  }

  on(fn) { this.listeners.push(fn); return this; }
  emit(type, data) { for (const f of this.listeners) f(type, data); }
  dancer(who) { return who === 'player' ? this.player : this.rival; }
  other(who) { return who === 'player' ? 'rival' : 'player'; }
  barIndex(bar) { return bar - this.startBar; }       // 0-based battle bar
  get barsTotal() { return this.endBar - this.startBar; }

  // ── Build ────────────────────────────────────────────────────────
  _materialize(spec, bar, who) {
    const t0 = this.clock.barTime(bar), spb = this.clock.spb;
    const b = {
      bar, who, type: spec.type, tier: spec.tier, resolved: false, success: false,
      notes: spec.notes.map(n => ({ ...n, bar, who, time: t0 + n.beat * spb, judged: null, delta: 0 })),
    };
    if (spec.type === 'command') {
      b.options = spec.options.map(o => ({ ...o, progress: 0 }));
      b.finisher = b.notes[0];
      // Directions open right after the previous bar's finisher window.
      b.openTime = t0 - spb + WINDOWS.good;
      b.chosen = null;
    }
    return b;
  }

  _buildBar(bar) {
    const taunt = this.pendingTaunt && this.pendingTaunt.bar === bar ? this.pendingTaunt : null;
    for (const who of ['player', 'rival']) {
      const d = this.dancer(who);
      let spec;
      if (taunt) spec = taunt.attacker === who ? buildTauntBar() : buildDodgeBar();
      else if (d.stunNext) { spec = buildStunnedBar(); d.stunNext = false; }
      else spec = buildCommand(this.rng, d.level, d.enthusiasm);
      const b = this._materialize(spec, bar, who);
      if (who === 'rival') this._rollRival(b);
      d.bars.set(bar, b);
    }
    this.emit('barBuilt', { bar, player: this.player.bars.get(bar), rival: this.rival.bars.get(bar) });

    // The rival decides whether to taunt the bar after this one, so the
    // player sees it coming a full bar ahead.
    const r = this.rival;
    if (!this.pendingTaunt && r.hype >= 100 && bar >= this.startBar + 1 && bar + 1 <= this.endBar - 2
        && this.ai.wantsTaunt(this.groove < 0)) {
      this._queueTaunt('rival', bar + 1);
    }
  }

  // Pre-roll the rival's result so its performance is decided (and
  // reproducible) when the bar is built; it's applied at the finisher.
  _rollRival(b) {
    const pressure = Math.max(0, this.groove);
    for (const n of b.notes) {
      if (n.kind === 'taunt') n.ai = { judgment: this.ai.judgeTaunt(), delta: 0 };
      else if (n.kind === 'dodge') n.ai = null; // decided when the taunt lands
      else {
        const opt = b.options.length > 1 && this.ai.takesBranch(b.options[1]) ? b.options[1] : b.options[0];
        b.aiOption = opt;
        n.ai = this.ai.judge(opt, pressure);
      }
    }
  }

  _queueTaunt(attacker, bar) {
    const d = this.dancer(attacker);
    d.hype = 0;
    this.pendingTaunt = { attacker, bar };
    this.emit('tauntQueued', { attacker, bar });
  }

  // ── Input ────────────────────────────────────────────────────────
  // kind: 'arrow' | 'groove' | 'taunt'; dir: L/U/D/R for arrows.
  input(kind, dir, evTime) {
    if (this.ended) return;
    const t = this.clock.inputSongTime(evTime);
    if (kind === 'arrow') { this._dirInput(t, dir); return; }
    const p = this.player;

    // Timed notes (finisher / dodge / taunt) inside the good window.
    const cands = [];
    for (const b of p.bars.values()) {
      if (b.resolved) continue;
      for (const n of b.notes) {
        if (n.judged) continue;
        const dt = t - n.time;
        if (Math.abs(dt) <= WINDOWS.good) cands.push({ n, dt });
      }
    }
    const matches = (n) => ((n.kind === 'groove' || n.kind === 'dodge') && kind === 'groove')
      || (n.kind === 'taunt' && kind === 'taunt');
    const hit = cands.filter(c => matches(c.n)).sort((a, b) => Math.abs(a.dt) - Math.abs(b.dt))[0];
    if (hit) { this._applyJudgment(p, hit.n, judgmentFor(Math.abs(hit.dt)), hit.dt); return; }

    if (kind === 'taunt') {
      // Not on a taunt note: this is a request to taunt.
      if (this.pendingTaunt) { this.emit('tauntBlocked', { who: 'player' }); return; }
      if (p.hype < 100) { this.emit('tauntNotReady', { who: 'player', hype: p.hype }); return; }
      const bar = this.nextBuild;
      if (bar < this.startBar || bar > this.endBar - 2) { this.emit('tauntBlocked', { who: 'player' }); return; }
      this._queueTaunt('player', bar);
      return;
    }
    // GROOVE before beat 4 with the sequence already entered: jumped the
    // gun, the command is blown. (With the sequence unfinished it's just a
    // stray press — a stray tap on a phone shouldn't cost a command.)
    const b = this._openCommand(p, t);
    if (b && b.options.some(o => o.progress === o.seq.length) && t < b.finisher.time) {
      this._applyJudgment(p, b.finisher, 'miss', t - b.finisher.time, 'early');
      return;
    }
    this.emit('stray', { kind, dir });
  }

  // The earliest unresolved command bar accepting input at song time t.
  _openCommand(d, t, needIncomplete = false) {
    let best = null;
    for (const b of d.bars.values()) {
      if (b.resolved || b.type !== 'command') continue;
      if (t < b.openTime || t > b.finisher.time + WINDOWS.good) continue;
      if (needIncomplete && b.options.some(o => o.progress === o.seq.length)) continue;
      if (!best || b.bar < best.bar) best = b;
    }
    return best;
  }

  _dirInput(t, dir) {
    const b = this._openCommand(this.player, t, true);
    if (!b) { this.emit('stray', { kind: 'arrow', dir }); return; }
    let advanced = false;
    for (const o of b.options) {
      if (o.seq[o.progress] === dir) { o.progress++; advanced = true; }
      else o.progress = o.seq[0] === dir ? 1 : 0;
    }
    if (!advanced && b.options.some(o => o.progress > 0)) advanced = true;   // restarted cleanly
    const done = b.options.find(o => o.progress === o.seq.length) || null;
    this.emit('dir', { who: 'player', bar: b.bar, dir, ok: advanced, complete: done && done.id });
  }

  _applyJudgment(d, n, j, dt, reason = null) {
    const b = d.bars.get(n.bar);
    if (n.kind === 'taunt') {
      n.judged = j; n.delta = dt;
      this.emit('judge', { who: d.id, note: n, judgment: j, delta: dt });
      this._resolveTaunt(d, b, n, j);
      return;
    }
    if (n.kind === 'dodge') {
      n.judged = j; n.delta = dt;
      this.emit('judge', { who: d.id, note: n, judgment: j, delta: dt });
      this._resolveDodge(d, b, n, j);
      return;
    }
    // Command finisher.
    let opt = null;
    if (d === this.rival) opt = b.aiOption;
    else opt = b.options.filter(o => o.progress === o.seq.length).sort((x, y) => y.seq.length - x.seq.length)[0] || null;
    if (!opt && j !== 'miss') { j = 'miss'; reason = 'incomplete'; }
    if (!reason && j === 'miss') reason = 'late';
    n.judged = j; n.delta = dt;
    b.chosen = opt;
    d.counts[j]++;
    if (j === 'miss') d.combo = 0;
    else { d.combo++; d.maxCombo = Math.max(d.maxCombo, d.combo); }
    let pts = 0;
    if (j !== 'miss') {
      pts = Math.round(FINISH_POINTS[j] * opt.mult * (1 + Math.min(d.combo, 20) * 0.03));
      this._addPoints(d, n.bar, pts);
    }
    const rate = d === this.rival ? (this.ai.p.hypeRate || 1) : 1;
    d.hype = clamp(d.hype + HYPE_GAIN[j] * (HYPE_GAIN[j] > 0 ? rate : 1), 0, 100);
    this.emit('judge', { who: d.id, note: n, judgment: j, delta: dt, reason, points: pts, combo: d.combo, option: opt && opt.kind });
    if (d.hype >= 100 && d._hypeWasFull !== true) { d._hypeWasFull = true; this.emit('hypeFull', { who: d.id }); }
    if (d.hype < 100) d._hypeWasFull = false;
    this._resolveCommand(d, b, j, opt, pts, reason);
  }

  _addPoints(d, bar, pts) {
    d.score += pts;
    d.barPoints.set(bar, (d.barPoints.get(bar) || 0) + pts);
  }

  _resolveCommand(d, b, j, opt, pts, reason) {
    b.resolved = true;
    b.success = j !== 'miss';
    const level = b.tier;
    if (b.success) {
      d.chain++;
      d.moves++;
      if (opt.kind === 'branch') d.branches++;
      if (opt.kind === 'solo') d.solos++;
      // A solo spends the gauge: it's the climax, not a loop.
      d.enthusiasm = opt.kind === 'solo' ? 25 : clamp(d.enthusiasm + ENTH_GAIN[j] + (opt.kind === 'branch' ? 6 : 0), 0, 100);
      d.bestLevel = Math.max(d.bestLevel, level + (opt.kind === 'branch' ? 0.5 : opt.kind === 'solo' ? 1 : 0));
      d.level = Math.min(4, d.level + 1);
      this.emit('move', { who: d.id, bar: b.bar + 1, tier: level, kind: opt.kind, judgment: j, perfect: j === 'perfect', bonus: pts, chain: d.chain });
    } else {
      d.chain = 0;
      d.level = Math.max(1, d.level - 1);
      d.enthusiasm = clamp(d.enthusiasm + ENTH_GAIN.miss, 0, 100);
      this.emit('fumble', { who: d.id, bar: b.bar, reason });
    }
    this._barDone(b.bar);
  }

  _resolveTaunt(d, b, n, j) {
    b.resolved = true;
    b.success = j !== 'miss';
    const foe = this.dancer(this.other(d.id));
    const foeBar = foe.bars.get(b.bar);
    if (!b.success) {
      // Whiffed taunt: the defender's dodge note is void.
      if (foeBar) {
        for (const x of foeBar.notes) if (!x.judged) x.judged = 'void';
        foeBar.resolved = true;
        foeBar.success = true;
      }
      this.emit('tauntWhiff', { attacker: d.id, bar: b.bar });
      if (this.pendingTaunt && this.pendingTaunt.bar === b.bar) this.pendingTaunt = null;
      this._barDone(b.bar);
      return;
    }
    this.emit('taunt', { attacker: d.id, bar: b.bar, judgment: j });
    // An AI defender decides now whether its dodge will land.
    if (foe === this.rival && foeBar) {
      const dn = foeBar.notes.find(x => x.kind === 'dodge');
      if (dn) {
        const ok = this.ai.dodges(j, this.groove < 0);
        dn.ai = ok ? { judgment: this.ai.rng() < 0.5 ? 'great' : 'good', delta: 0.03 } : { judgment: 'miss', delta: 0.2 };
      }
    }
    this._barDone(b.bar);
  }

  _resolveDodge(d, b, n, j) {
    b.resolved = true;
    const attacker = this.dancer(this.other(d.id));
    if (j !== 'miss') {
      b.success = true;
      d.dodges++;
      d.hype = Math.min(100, d.hype + 20);
      this._addPoints(d, b.bar, DODGE_BONUS);
      this.emit('dodge', { who: d.id, attacker: attacker.id, bar: b.bar, judgment: j });
      if (d.hype >= 100 && d._hypeWasFull !== true) { d._hypeWasFull = true; this.emit('hypeFull', { who: d.id }); }
    } else {
      b.success = false;
      d.stuns++;
      d.chain = 0;
      d.combo = 0;
      d.level = Math.max(1, d.level - 1);
      d.enthusiasm = clamp(d.enthusiasm - 30, 0, 100);
      attacker.tauntsLanded++;
      this._addPoints(attacker, b.bar, TAUNT_LAND_BONUS);
      // Stunned next bar: wipe it if already built, else mark it.
      const next = d.bars.get(b.bar + 1);
      if (next && b.bar + 1 < this.endBar) {
        const stunned = this._materialize(buildStunnedBar(), b.bar + 1, d.id);
        d.bars.set(b.bar + 1, stunned);
        this.emit('barReplaced', { who: d.id, bar: b.bar + 1 });
      } else if (b.bar + 1 < this.endBar) {
        d.stunNext = true;
      }
      this.emit('tauntLanded', { attacker: attacker.id, defender: d.id, bar: b.bar, stunBar: b.bar + 1 });
    }
    if (this.pendingTaunt && this.pendingTaunt.bar === b.bar) this.pendingTaunt = null;
    this._barDone(b.bar);
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
    const clock = this.clock;
    if (this.ended) return;

    // Bar starts (intro + battle).
    const curBar = Math.floor(clock.beatAt(songTime) / clock.beatsPerBar);
    while (this.lastBarSeen < curBar) {
      this.lastBarSeen++;
      const b = this.lastBarSeen;
      if (b >= this.introStartBar && b < this.endBar) this.emit('barStart', { bar: b, index: this.barIndex(b) });
    }

    // Build bars just-in-time.
    while (this.nextBuild < this.endBar && clock.barTime(this.nextBuild) - LOOKAHEAD <= songTime) {
      this._buildBar(this.nextBuild);
      this.nextBuild++;
    }

    // Rival results land at their note times; its sequence fills in over
    // beats 1-3 for anyone watching.
    for (const b of this.rival.bars.values()) {
      if (b.resolved) continue;
      if (b.type === 'command' && b.aiOption) {
        const f = clamp((songTime - clock.barTime(b.bar)) / (clock.spb * 2.6), 0, 1);
        b.aiOption.progress = Math.floor(f * b.aiOption.seq.length);
      }
      for (const n of b.notes) {
        if (n.judged || n.time > songTime || !n.ai) continue;
        this._applyJudgment(this.rival, n, n.ai.judgment, n.ai.delta);
        if (b.resolved) break;
      }
    }

    // Player finishers / dodges / taunts that slipped past the window.
    for (const b of this.player.bars.values()) {
      if (b.resolved) continue;
      for (const n of b.notes) {
        if (!n.judged && songTime > n.time + WINDOWS.good) {
          const incomplete = b.type === 'command' && !b.options.some(o => o.progress === o.seq.length);
          this._applyJudgment(this.player, n, 'miss', WINDOWS.good, incomplete ? 'incomplete' : 'late');
          if (b.resolved) break;
        }
      }
    }

    // Note-less bars (stunned) resolve when they end.
    for (const d of [this.player, this.rival]) {
      for (const b of d.bars.values()) {
        if (!b.resolved && b.notes.length === 0 && songTime >= clock.barTime(b.bar + 1)) {
          b.resolved = true;
          this._barDone(b.bar);
        }
      }
    }

    // Battle over at the downbeat after the last battle bar.
    if (!this.ended && songTime >= clock.barTime(this.endBar)) {
      this.ended = true;
      this.emit('end', this.summary());
    }
  }

  summary() {
    const pack = (d) => ({
      score: d.score, counts: { ...d.counts }, maxCombo: d.maxCombo, moves: d.moves,
      branches: d.branches, solos: d.solos, bestTier: d.bestLevel,
      tauntsLanded: d.tauntsLanded, dodges: d.dodges, stuns: d.stuns,
    });
    const player = pack(this.player), rival = pack(this.rival);
    return { winner: player.score >= rival.score ? 'player' : 'rival', player, rival, groove: this.groove };
  }

  // The command bar the HUD should show for `who` at song time t: the one
  // being entered now (or coming up), held briefly after its finisher.
  commandFor(who, t) {
    let best = null;
    for (const b of this.dancer(who).bars.values()) {
      if (b.type !== 'command' && b.type !== 'taunt' && b.type !== 'dodge' && b.type !== 'stunned') continue;
      const end = b.type === 'command' ? b.finisher.time + 0.3 : this.clock.barTime(b.bar + 1) - this.clock.spb + 0.3;
      if (end < t) continue;
      if (!best || b.bar < best.bar) best = b;
    }
    return best;
  }

  // Timed notes for the HUD lane (finishers, dodges, taunts).
  visibleNotes(who, fromTime, toTime) {
    const out = [];
    for (const b of this.dancer(who).bars.values()) {
      for (const n of b.notes) if (n.time >= fromTime && n.time <= toTime) out.push(n);
    }
    return out;
  }
}
