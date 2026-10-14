// Choreographer — turns battle results into phrased dancing.
//
// Bust a Groove (1998) structures every battle as DANCE STRINGS: one
// command per measure, each success walks one row down an 8-row tree whose
// last row is the FREEZE, followed by a rest measure; at every row the
// player can take the easier line or the harder one, and a miss cuts the
// string short (see story/DANCE.md). RhythmBattle runs those rules and tells
// us, per landed command, which row it earned (`row`), whether the harder
// ★ line was taken (`kind: 'branch'`), whether it was the freeze, and which
// string this is. The choreographer owns the *dancing* side of that:
//
//   row 1-2   basic grooves (knee bounce, step-touch, shoulders …)
//   row 3-6   intermediate steps (running man, Charleston, toprock …)
//   row 7     an advanced move that sets up …
//   row 8     … the finisher: an advanced combination (2 beats) that drops
//             into the character's FREEZE (held through the rest measure)
//   solo      the only place for designated specials (flips, power moves)
//   miss      a stutter (MISSED_INPUT) and RECOVERY back into the groove
//
// Escalation comes from the choreography (rows, the harder line, the combo
// level styling each move) — never from speed or flips.

import { MOVES, moveProfile, registerMoves } from './dance.js';
import './vocab.js';
import { moveDefinitions } from './commands.js';

// Animations a plan asked for that don't exist (logged once each; the
// fallback is the same row's standard move, else a knee bounce — never a
// flip).
export const MISSING_ANIMS = new Set();

// ── States ──────────────────────────────────────────────────────────
export const STATES = [
  'INTRO_TAUNT', 'IDLE_GROOVE', 'MOVE_PREPARATION', 'DANCE_MOVE', 'MOVE_TRANSITION',
  'COMBO_ADVANCE', 'ADVANCED_COMBO', 'FREEZE_POSE', 'SOLO_SEQUENCE', 'JAMMER_ATTACK',
  'JAMMER_DODGE', 'MISSED_INPUT', 'RECOVERY', 'VICTORY_DANCE',
];
// Planned transitions. Interrupts (a jammer, a miss, the solo, the end of
// the battle) may cut in from anywhere.
const INTERRUPTS = ['JAMMER_ATTACK', 'JAMMER_DODGE', 'MISSED_INPUT', 'SOLO_SEQUENCE', 'VICTORY_DANCE', 'IDLE_GROOVE'];
export const TRANSITIONS = {
  INTRO_TAUNT: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  IDLE_GROOVE: ['MOVE_PREPARATION'],
  MOVE_PREPARATION: ['DANCE_MOVE', 'COMBO_ADVANCE', 'ADVANCED_COMBO', 'FREEZE_POSE', 'INTRO_TAUNT', 'RECOVERY'],
  DANCE_MOVE: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  COMBO_ADVANCE: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  ADVANCED_COMBO: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  FREEZE_POSE: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  SOLO_SEQUENCE: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  JAMMER_ATTACK: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  JAMMER_DODGE: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  MISSED_INPUT: ['MOVE_PREPARATION', 'RECOVERY', 'MOVE_TRANSITION'],
  RECOVERY: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
  MOVE_TRANSITION: ['MOVE_PREPARATION'],
  VICTORY_DANCE: ['MOVE_PREPARATION', 'MOVE_TRANSITION'],
};
export function canTransition(from, to) {
  return from === to || INTERRUPTS.includes(to) || (TRANSITIONS[from] || []).includes(to);
}

// The state each battle action / reaction plays in.
export const ACTION_STATE = {
  entrance: 'INTRO_TAUNT', introTaunt: 'INTRO_TAUNT', introWatch: 'INTRO_TAUNT', introAnswer: 'INTRO_TAUNT', ready: 'INTRO_TAUNT',
  taunt: 'JAMMER_ATTACK', cheer: 'JAMMER_ATTACK', dodge: 'JAMMER_DODGE',
  whiff: 'MISSED_INPUT', hitReact: 'MISSED_INPUT', fumble: 'MISSED_INPUT', missStumble: 'MISSED_INPUT',
  stunned: 'RECOVERY', missRecover: 'RECOVERY',
  reactOoh: 'IDLE_GROOVE', soloWatch: 'IDLE_GROOVE', defeat: 'IDLE_GROOVE',
  victory: 'VICTORY_DANCE',
};

// Row → state: the first move of each new band announces the combo
// stepping up; row 7 is the advanced build into the finisher.
export function rowState(row) {
  if (row >= 7) return 'FREEZE_POSE';
  if (row === 6) return 'ADVANCED_COMBO';
  if (row === 2 || row === 4) return 'COMBO_ADVANCE';
  return 'DANCE_MOVE';
}
export const ROW_NAMES = ['GROOVE', 'GROOVE', 'STEP', 'STEP', 'STYLE', 'COOL', "CHILLIN'", 'FREEZE'];

// ── Move profiling ──────────────────────────────────────────────────
// A move is "special" when it flips / inverts, leaves the floor, or spins
// more than a turn (dance.js moveProfile). Specials are only allowed where a
// character explicitly designates them: the solo and the victory dance.
export function isSpecial(name, style = {}) {
  if (!MOVES[name]) return false;
  return moveProfile(name, style).special;
}

// A held freeze made from a signature pose (the bosses' accent poses):
// evaluated still, with only a breath and the settle of the hit.
const _freezeStyles = new Map();
export function freezeFromPose(pose) {
  const name = 'freeze:' + pose;
  if (MOVES[name]) return name;
  const still = {};
  registerMoves({
    [name](p, b, B, s) {
      Object.assign(still, s); still.bounce = (s.bounce || 1) * 0.12; still.energy = 1;
      MOVES[pose](p, 0.9, B, still);
      const hit = Math.exp(-b * 6), breathe = Math.sin(Math.PI * b);
      p.root(0, -0.025 * hit, 0);
      p.add('chest', 0.012 * breathe);
    },
  }, { hits: { [name]: 0.05 }, fnGroove: { [name]: 0 }, stiff: { [name]: 1.3 } });
  _freezeStyles.set(name, pose);
  return name;
}

// ── Choreography plans ──────────────────────────────────────────────
// def.choreo = {
//   std: [7 moves, rows 1-7], alt: [7 moves, the harder ★ line],
//   finisher: { std, alt },       2-beat advanced combination into the freeze
//   freeze,                       the character's freeze (held)
//   solo: [bar1, bar2?],          designated specials allowed here
//   victory,
// }
// Characters without one (level bosses) get one built from their tiered move
// lists with every special filtered out.
export function buildChoreo(def) {
  const style = def.style || {};
  const c = def.choreo;
  if (c) {
    return {
      std: c.std.slice(0, 7), alt: (c.alt || c.std).slice(0, 7),
      finisher: typeof c.finisher === 'string' ? { std: c.finisher, alt: c.finisher } : { ...c.finisher },
      freeze: c.freeze || freezeFromPose((style.accent && style.accent.pose) || 'accentBboy'),
      solo: c.solo || [def.solo].filter(Boolean),
      victory: c.victory || def.victory || 'victory',
      stumble: c.stumble || 'missStumble', recover: c.recover || 'missRecover',
      auto: false,
    };
  }
  return autoChoreo(def);
}

function autoChoreo(def) {
  const style = def.style || {};
  const ok = (n) => !!n && !!MOVES[n] && !isSpecial(n, style);
  const uniq = (arr) => [...new Set(arr.filter(ok))];
  const r = style.routines;
  const routines = !r ? [] : Array.isArray(r) ? r : [...(r.chill || []), ...(r.hype || [])];
  const tier = (k) => uniq((def.moves && def.moves[k]) || []);
  const branch = (k) => { const n = def.branchMoves && def.branchMoves[k]; return ok(n) ? n : null; };
  const basic = uniq([...tier(1), ...routines]);
  const inter = uniq([...tier(2), ...tier(3)]);
  const adv = uniq([...tier(4), ...tier(3), branch(4), branch(3)].filter(Boolean));
  const shared = { basic: ['kneeBounce', 'shoulderBounce', 'hipSway', 'twoStep'], inter: ['charleston', 'kickBallChange', 'crossStep', 'heelToe'], adv: ['popWave', 'isoStep'] };
  // Small own pools borrow from the shared vocabulary so a line never
  // repeats itself.
  const pool = (own, sh, n) => own.length >= n ? own : uniq([...own, ...sh]).slice(0, Math.max(n, own.length));
  const B = pool(basic, shared.basic, 3), I = pool(inter, shared.inter, 4), A = pool(adv, shared.adv, 2);
  const at = (p, i) => p[i % p.length];
  // Two lines through the same bands, never the same move twice in a row.
  const line = (offs) => {
    const out = [at(B, offs), at(B, offs + 1), at(I, offs), at(I, offs + 1), at(I, offs + 2), at(I, offs + 3), at(A, offs)];
    for (let i = 1; i < out.length; i++) {
      if (out[i] === out[i - 1]) out[i] = [...B, ...I, ...A].find(m => m !== out[i - 1] && m !== out[i + 1]) || out[i];
    }
    return out;
  };
  const std = line(0), alt = line(1);
  if (branch(2)) alt[3] = branch(2);
  if (branch(3)) alt[5] = branch(3);
  const finStd = at(A, 1), finAlt = branch(4) || at(A, 2);
  const pose = (style.accent && style.accent.pose) || null;
  return {
    std, alt, finisher: { std: finStd, alt: finAlt },
    freeze: pose && MOVES[pose] ? freezeFromPose(pose) : 'freezeStance',
    solo: [def.solo].filter(Boolean),
    victory: def.victory || 'victory',
    stumble: 'missStumble', recover: 'missRecover',
    auto: true,
  };
}

// Problems with a plan: missing moves, specials outside the solo/victory.
export function validateChoreo(plan, style = {}) {
  const issues = [];
  const check = (n, where, allowSpecial = false) => {
    if (!MOVES[n]) { issues.push(`${where}: missing move ${n}`); return; }
    if (!allowSpecial && isSpecial(n, style)) {
      const p = moveProfile(n, style);
      issues.push(`${where}: ${n} is a special (${[p.flip && 'flip', p.air && 'airborne', p.spin && p.turns.toFixed(1) + ' turns'].filter(Boolean).join(', ')})`);
    }
  };
  plan.std.forEach((n, i) => check(n, `row ${i + 1}`));
  plan.alt.forEach((n, i) => check(n, `★ row ${i + 1}`));
  check(plan.finisher.std, 'finisher'); check(plan.finisher.alt, '★ finisher');
  check(plan.freeze, 'freeze');
  check(plan.stumble, 'miss'); check(plan.recover, 'recovery');
  plan.solo.forEach((n, i) => check(n, `solo ${i + 1}`, true));
  // The idle groove and the phrase accent are everyday dancing too.
  const r = style.routines;
  const rs = !r ? [] : Array.isArray(r) ? r : [...(r.chill || []), ...(r.hype || [])];
  [...new Set(rs)].forEach((n) => check(n, 'idle groove'));
  if (style.accent && style.accent.pose) check(style.accent.pose, 'phrase accent');
  return issues;
}

// ── Choreographer ───────────────────────────────────────────────────
// Each method returns the entries to schedule:
//   { name, start, len, state, fade?, lead?, out?, level, mirror?, react? }
// (start/len in beats; react = cut in now instead of leading in).
export class Choreographer {
  constructor(def, charId = def && (def.id || def.name)) {
    this.def = def;
    this.plan = buildChoreo(def);
    // Every node of the command tree → this dancer's move (commands.js).
    this.moves = moveDefinitions(String(charId || 'dancer').toLowerCase(), this.plan, (def.choreo && def.choreo.nodes) || {});
    this.row = 0;
    this.string = 0;
    this.history = [];             // { bar, row, name, state, moveId }
  }

  // The animation to play for `name`, or an explicit grounded fallback when
  // the asset is missing (logged once).
  anim(name, row = 0) {
    if (name && MOVES[name]) return name;
    if (!MISSING_ANIMS.has(name)) {
      MISSING_ANIMS.add(name);
      console.warn(`[choreo] missing animation "${name}" for ${this.def && this.def.name} — using a fallback`);
    }
    const alt = this.plan.std[Math.max(0, Math.min(6, row))];
    return MOVES[alt] ? alt : 'kneeBounce';
  }

  // The move definition a resolved command plays (commands.js).
  moveDef(node) { return this.moves.get(node) || null; }

  // The move for a dance-string row on the standard / ★ line.
  moveFor(row, alt = false) {
    const P = this.plan;
    if (row >= 7) return alt ? P.finisher.alt : P.finisher.std;
    return (alt ? P.alt : P.std)[row];
  }

  // A landed command: the move(s) for its bar. `e` is RhythmBattle's 'move'
  // event ({ bar, tier, kind, row, string, freeze }); without `row` the
  // choreographer keeps its own count.
  success(e) {
    const P = this.plan, B = e.bar * 4, level = e.tier || 1;
    // A resolved command node: its move definition decides the animation.
    const md = e.node && this.moves.get(e.node);
    if (md) {
      const out = [];
      if (md.freeze) {
        out.push({ name: this.anim(md.anim, 6), start: B, len: 2, state: 'ADVANCED_COMBO', level, mirror: md.mirror, moveId: md.id });
        out.push({ name: this.anim(md.freeze, 6), start: B + 2, len: 3.5, state: 'FREEZE_POSE', fade: 0.45, lead: 0.45, out: 1.5, level, mirror: md.mirror, moveId: md.id });
        this.row = 0; this.string++;
      } else {
        out.push({ name: this.anim(md.anim, md.type - 1), start: B, len: 4, state: rowState(md.type - 1), level, mirror: md.mirror, moveId: md.id });
        this.row = Math.min(7, md.type);
      }
      for (const x of out) this.history.push({ bar: e.bar, row: md.type - 1, name: x.name, state: x.state, moveId: md.id });
      if (this.history.length > 64) this.history.splice(0, this.history.length - 64);
      return out;
    }
    const row = e.row ?? this.row;
    const freeze = e.freeze ?? row >= 7;
    const alt = e.kind === 'branch';
    // Every other string mirrors, so the same line reads fresh.
    const mirror = ((e.string ?? this.string) % 2) === 1;
    const out = [];
    if (freeze) {
      // Finisher on counts 1-2, the freeze hits on 3 and is held through
      // the rest measure; then a slow come-up into the groove.
      out.push({ name: this.moveFor(7, alt), start: B, len: 2, state: 'ADVANCED_COMBO', level, mirror });
      out.push({ name: P.freeze, start: B + 2, len: 3.5, state: 'FREEZE_POSE', fade: 0.45, lead: 0.45, out: 1.5, level, mirror });
      this.row = 0; this.string++;
    } else {
      out.push({ name: this.moveFor(row, alt), start: B, len: 4, state: rowState(row), level, mirror });
      this.row = Math.min(7, row + 1);
    }
    for (const x of out) this.history.push({ bar: e.bar, row, name: x.name, state: x.state });
    if (this.history.length > 64) this.history.splice(0, this.history.length - 64);
    return out;
  }

  // A missed command at `beat` (the miss lands around beat 4 of its bar):
  // a stutter now, then recovery through the next bar's first three beats.
  miss(e, beat) {
    const P = this.plan;
    this.row = 0;
    const end = (e.bar + 1) * 4 + 3;
    const stumble = 1.3;
    return [
      { name: P.stumble, start: beat, len: stumble, state: 'MISSED_INPUT', react: true, fade: 0.2 },
      { name: P.recover, start: beat + stumble - 0.1, len: Math.max(1.5, end - beat - stumble + 0.1), state: 'RECOVERY', fade: 0.35, lead: 0.35, out: 0.8 },
    ];
  }

  // SOLO TIME (`bars` bars from `bar`): the designated special(s), then the
  // finisher and the freeze to close it.
  solo(e) {
    const P = this.plan, B = e.bar * 4, len = (e.bars || 2) * 4;
    const out = [];
    const specials = P.solo.length ? P.solo : [P.finisher.alt];
    let t = 0;
    for (const n of specials) {
      if (t >= len - 4) break;
      out.push({ name: n, start: B + t, len: 4, state: 'SOLO_SEQUENCE', level: 4 });
      t += 4;
    }
    // Close: finisher into the freeze, held into the next bar.
    out.push({ name: P.finisher.alt, start: B + t, len: 2, state: 'SOLO_SEQUENCE', level: 4 });
    out.push({ name: P.freeze, start: B + t + 2, len: len - t - 2 + 1.5, state: 'FREEZE_POSE', fade: 0.45, lead: 0.45, out: 1.5, level: 4 });
    this.row = 0; this.string++;
    return out;
  }

  victory(bar, len) {
    return [{ name: this.plan.victory, start: bar * 4, len, state: 'VICTORY_DANCE', level: 4 }];
  }
}
