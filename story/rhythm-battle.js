// RhythmBattle — the rules of the dance battle. Pure logic: it reads song
// time from the MusicClock, takes timestamped inputs, and emits events that
// the dancers, camera, stage, HUD and audio react to. No rendering here.
//
// Loop per 4/4 bar (both dancers, simultaneously — like Bust a Groove):
//   • A command is built for the bar (arrows + GROOVE finisher on beat 3).
//   • Hit every note (Perfect/Great/Good) to land the move; the dancer then
//     performs it during the next bar. Consecutive landings raise the move
//     tier (longer commands, flashier moves, more points). A miss drops it.
//   • Hits fill the HYPE gauge. Full hype = a TAUNT: press it, hit the taunt
//     note on the next downbeat, and the opponent must DODGE (GROOVE on
//     beat 2) or get stunned for a bar (their next command is wiped).
//   • The rival runs the same rules with AI-rolled hits.

import { buildCommand, buildTauntBar, buildDodgeBar, buildStunnedBar, makeRng } from './chart.js';
import { OpponentAI } from './opponent-ai.js';

export const WINDOWS = { perfect: 0.05, great: 0.1, good: 0.15 };
const NOTE_POINTS = { perfect: 300, great: 200, good: 100, miss: 0 };
const HYPE_GAIN = { perfect: 4, great: 3, good: 1, miss: -10 };
const MOVE_BONUS = 400;       // × tier
const TAUNT_LAND_BONUS = 1500;
const DODGE_BONUS = 800;
// Notes appear this far ahead on the lane; bars are built this far ahead,
// which is also the last moment a taunt can still claim that bar.
export const LOOKAHEAD = 2.0;

function newDancer(id) {
  return {
    id, score: 0, noteCombo: 0, maxNoteCombo: 0, chain: 0, tier: 1, hype: 0,
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    moves: 0, tauntsLanded: 0, dodges: 0, stuns: 0, bestTier: 1,
    bars: new Map(), stunNext: false, barPoints: new Map(),
  };
}

function judgmentFor(absDelta) {
  if (absDelta <= WINDOWS.perfect) return 'perfect';
  if (absDelta <= WINDOWS.great) return 'great';
  if (absDelta <= WINDOWS.good) return 'good';
  return 'miss';
}

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
    this.finished = false;
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
    const t0 = this.clock.barTime(bar);
    return {
      bar, who, type: spec.type, tier: spec.tier, resolved: false, success: false,
      notes: spec.notes.map(n => ({
        ...n, bar, who,
        time: t0 + n.beat * this.clock.spb,
        judged: null, delta: 0,
      })),
    };
  }

  _buildBar(bar) {
    const taunt = this.pendingTaunt && this.pendingTaunt.bar === bar ? this.pendingTaunt : null;
    for (const who of ['player', 'rival']) {
      const d = this.dancer(who);
      let spec;
      if (taunt) spec = taunt.attacker === who ? buildTauntBar() : buildDodgeBar();
      else if (d.stunNext) { spec = buildStunnedBar(); d.stunNext = false; }
      else spec = buildCommand(this.rng, d.tier);
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

  // Pre-roll the rival's hits so its performance is decided (and
  // reproducible) when the bar is built; they're applied at note time.
  _rollRival(b) {
    const pressure = Math.max(0, this.groove);
    for (const n of b.notes) {
      if (n.kind === 'taunt') n.ai = { judgment: this.ai.judgeTaunt(), delta: 0 };
      else if (n.kind === 'dodge') n.ai = null; // decided when the taunt lands
      else n.ai = this.ai.judge(n, b.tier, pressure);
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
    const p = this.player;

    // Candidate notes: the player's unjudged notes inside the good window.
    const cands = [];
    for (const b of p.bars.values()) {
      if (b.resolved) continue;
      for (const n of b.notes) {
        if (n.judged) continue;
        const dt = t - n.time;
        if (Math.abs(dt) <= WINDOWS.good) cands.push({ n, dt });
      }
    }
    const matches = (n) => (n.kind === 'arrow' && kind === 'arrow' && n.dir === dir)
      || ((n.kind === 'groove' || n.kind === 'dodge') && kind === 'groove')
      || (n.kind === 'taunt' && kind === 'taunt');
    const hit = cands.filter(c => matches(c.n)).sort((a, b) => Math.abs(a.dt) - Math.abs(b.dt))[0];
    if (hit) { this._judgePlayer(hit.n, hit.dt); return; }

    if (kind === 'taunt') {
      // Not on a taunt note: this is a request to taunt.
      if (this.pendingTaunt) { this.emit('tauntBlocked', { who: 'player' }); return; }
      if (p.hype < 100) { this.emit('tauntNotReady', { who: 'player', hype: p.hype }); return; }
      const bar = this.nextBuild;
      if (bar < this.startBar || bar > this.endBar - 2) { this.emit('tauntBlocked', { who: 'player' }); return; }
      this._queueTaunt('player', bar);
      return;
    }
    // Wrong input while a note is live: that note is missed.
    const nearest = cands.sort((a, b) => Math.abs(a.dt) - Math.abs(b.dt))[0];
    if (nearest) this._judgePlayer(nearest.n, nearest.dt, true);
    else this.emit('stray', { kind, dir });
  }

  _judgePlayer(n, dt, wrong = false) {
    const j = wrong ? 'miss' : judgmentFor(Math.abs(dt));
    this._applyJudgment(this.player, n, j, dt, wrong);
  }

  _applyJudgment(d, n, j, dt, wrong = false) {
    n.judged = j;
    n.delta = dt;
    const b = d.bars.get(n.bar);
    if (n.kind === 'taunt') {
      this.emit('judge', { who: d.id, note: n, judgment: j, delta: dt, wrong });
      this._resolveTaunt(d, b, n, j);
      return;
    }
    if (n.kind === 'dodge') {
      this.emit('judge', { who: d.id, note: n, judgment: j, delta: dt, wrong });
      this._resolveDodge(d, b, n, j);
      return;
    }
    d.counts[j]++;
    if (j === 'miss') d.noteCombo = 0;
    else {
      d.noteCombo++;
      d.maxNoteCombo = Math.max(d.maxNoteCombo, d.noteCombo);
    }
    const mult = 1 + Math.min(d.noteCombo, 40) * 0.025;
    const pts = Math.round(NOTE_POINTS[j] * mult);
    this._addPoints(d, n.bar, pts);
    const rate = (d === this.rival && HYPE_GAIN[j] > 0) ? (this.ai.p.hypeRate || 1) : 1;
    d.hype = Math.max(0, Math.min(100, d.hype + HYPE_GAIN[j] * rate));
    this.emit('judge', { who: d.id, note: n, judgment: j, delta: dt, wrong, points: pts, combo: d.noteCombo });
    if (d.hype >= 100 && d._hypeWasFull !== true) { d._hypeWasFull = true; this.emit('hypeFull', { who: d.id }); }
    if (d.hype < 100) d._hypeWasFull = false;
    // A missed note sinks the whole command right away.
    if (b && !b.resolved && b.type === 'command') {
      if (j === 'miss') this._resolveCommand(d, b, false);
      else if (b.notes.every(x => x.judged)) this._resolveCommand(d, b, b.notes.every(x => x.judged !== 'miss'));
    }
  }

  _addPoints(d, bar, pts) {
    d.score += pts;
    d.barPoints.set(bar, (d.barPoints.get(bar) || 0) + pts);
  }

  _resolveCommand(d, b, success) {
    b.resolved = true;
    b.success = success;
    const tierPlayed = b.tier;
    if (success) {
      d.chain++;
      d.moves++;
      const allPerfect = b.notes.every(n => n.judged === 'perfect');
      const bonus = Math.round(MOVE_BONUS * tierPlayed * (allPerfect ? 1.5 : 1));
      this._addPoints(d, b.bar, bonus);
      d.hype = Math.min(100, d.hype + 6);
      d.tier = Math.min(4, 1 + Math.floor(d.chain / 2));
      d.bestTier = Math.max(d.bestTier, tierPlayed);
      this.emit('move', { who: d.id, bar: b.bar + 1, tier: tierPlayed, perfect: allPerfect, bonus, chain: d.chain });
    } else {
      // Any unjudged notes left in a failed command are void.
      for (const n of b.notes) if (!n.judged) n.judged = 'void';
      d.chain = 0;
      d.tier = Math.max(1, d.tier - 1);
      this.emit('fumble', { who: d.id, bar: b.bar });
    }
    if (d.hype >= 100 && d._hypeWasFull !== true) { d._hypeWasFull = true; this.emit('hypeFull', { who: d.id }); }
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
      d.noteCombo = 0;
      d.tier = Math.max(1, d.tier - 1);
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
    const delta = Math.max(-0.35, Math.min(0.35, (pp - rp) / 2400));
    this.groove = Math.max(-1, Math.min(1, this.groove * 0.85 + delta));
    this.emit('bar', { bar, playerPoints: pp, rivalPoints: rp, groove: this.groove });
  }

  // ── Time ─────────────────────────────────────────────────────────
  update(songTime) {
    this.songTime = songTime;
    const clock = this.clock;
    if (this.ended) return;

    // Bar starts (intro + battle + end).
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

    // Rival hits land at their note times.
    for (const b of this.rival.bars.values()) {
      if (b.resolved) continue;
      for (const n of b.notes) {
        if (n.judged || n.time > songTime || !n.ai) continue;
        this._applyJudgment(this.rival, n, n.ai.judgment, n.ai.delta);
        if (b.resolved) break;
      }
    }

    // Player notes that slipped past the window are misses.
    for (const b of this.player.bars.values()) {
      if (b.resolved) continue;
      for (const n of b.notes) {
        if (!n.judged && songTime > n.time + WINDOWS.good) {
          this._applyJudgment(this.player, n, 'miss', WINDOWS.good);
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
      score: d.score, counts: { ...d.counts }, maxCombo: d.maxNoteCombo, moves: d.moves,
      bestTier: d.bestTier, tauntsLanded: d.tauntsLanded, dodges: d.dodges, stuns: d.stuns,
    });
    const player = pack(this.player), rival = pack(this.rival);
    return { winner: player.score >= rival.score ? 'player' : 'rival', player, rival, groove: this.groove };
  }

  // Notes for the HUD lane (player's bars around now).
  visibleNotes(who, fromTime, toTime) {
    const out = [];
    for (const b of this.dancer(who).bars.values()) {
      for (const n of b.notes) if (n.time >= fromTime && n.time <= toTime) out.push(n);
    }
    return out;
  }
}
