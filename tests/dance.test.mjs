// Dance system tests: rhythm sync, the dance state machine, dance-string
// advancement (rules + choreography), the flip budget and foot contact.
//   node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DanceController, MOVES, LAYOUT, registerMoves, moveProfile } from '../story/dance.js';
import { CHARACTERS, registerCharacter } from '../story/characters.js';
import { Choreographer, buildChoreo, validateChoreo, canTransition, rowState, STATES } from '../story/choreo.js';
import { musicalPosition } from '../story/music-clock.js';
import { STRING_ROWS } from '../story/rhythm-battle.js';
import { makeBattle, playBar, ev } from './battle-harness.mjs';
import { STORY_LEVELS, LEVEL_ORDER } from '../story/levels.js';
import { simulate, skating, acrobatics, illegalTransitions, overreach, stateSequence } from './motion.mjs';

// Register every level boss (their moves and definitions).
for (const id of LEVEL_ORDER) {
  const L = (await import(`../story/levels/${id}.js`)).default;
  if (L.moves) registerMoves(L.moves, L.moveMeta || {});
  if (L.boss && typeof L.boss === 'object') registerCharacter(STORY_LEVELS[id].dancers.rival, L.boss);
}
const MVP = ['player', 'toni', 'tina'];
const fakeRig = { applyPose() {}, setExpression() {} };

// A full run of landed commands, as RhythmBattle reports them: rows 0-7,
// the freeze on row 8, a rest bar, the next string.
function stringPlan(def, { line = 'std', bars = 12 } = {}) {
  const c = new Choreographer(def), plan = [];
  let row = 0, string = 0;
  for (let bar = 1; bar < bars; bar++) {
    const freeze = row >= STRING_ROWS - 1;
    plan.push(...c.success({ bar, tier: Math.min(4, bar), kind: line === 'alt' ? 'branch' : 'std', row, string, freeze }));
    if (freeze) { row = 0; string++; bar++; } else row++;
  }
  return plan;
}

// ── Rhythm sync ─────────────────────────────────────────────────────
test('musical position: counts, 8-counts and phrases', () => {
  const p = musicalPosition(13.5);
  assert.equal(p.bar, 3); assert.equal(p.count, 2); assert.equal(p.eighth, 1);
  assert.equal(p.countIn8, 6); assert.equal(p.phraseEnd, true);
  assert.equal(musicalPosition(16).phraseStart, true);
  assert.equal(musicalPosition(16).downbeat, true);
});

test('a planned move lands its first key ON its downbeat (lead-in)', () => {
  const spb = 0.5, def = CHARACTERS.player;
  const dc = new DanceController(fakeRig, { ...def.style, spb }, +1);
  dc.play('toprock', 8, 4);
  const look = 0.02 / spb;                      // update() looks this far ahead
  let prepSeen = false;
  for (let b = 0; b < 8 - look - 1e-9; b += 1 / 30) { dc.update(b); if (dc.state === 'MOVE_PREPARATION') prepSeen = true; }
  assert.ok(prepSeen, 'the move prepares before its downbeat');
  dc.update(8 - look);                          // evaluates beat 8 exactly
  assert.equal(dc.cur.name, 'toprock');
  assert.equal(dc.prev, null, 'the blend is complete on the downbeat');
  // The pose is the move's own first key (before springs / hits).
  const ref = new DanceController(fakeRig, { ...def.style, spb }, +1);
  ref.cur = { name: 'toprock', start: 8, len: 4 };
  ref._started = true; ref.update(8 - look);
  const { FEET, FS } = LAYOUT;
  for (const k of [FEET, FEET + 2, FEET + FS, FEET + FS + 2]) assert.ok(Math.abs(dc._blend[k] - ref._blend[k]) < 1e-4, `foot target ${k} on its key`);
});

test('foot contacts land on the beat grid (MVP strings, both lines)', () => {
  for (const id of MVP) for (const line of ['std', 'alt']) {
    const sim = simulate(CHARACTERS[id], stringPlan(CHARACTERS[id], { line }), { bpm: 120, from: 0, to: 44 });
    const inMove = sim.contacts.filter(c => !/PREPARATION|TRANSITION|IDLE/.test(c.state));
    const on8 = inMove.filter(c => Math.abs(c.offMs) <= 45).length / inMove.length;
    const off16 = sim.contacts.reduce((s, c) => s + Math.abs(c.off16Ms), 0) / sim.contacts.length;
    assert.ok(inMove.length > 10, `${id} ${line}: steps happen`);
    assert.ok(on8 >= 0.6, `${id} ${line}: ${(on8 * 100).toFixed(0)}% of steps within 45 ms of an 8th`);
    assert.ok(off16 < 30, `${id} ${line}: mean contact offset from the 16th grid ${off16.toFixed(1)} ms`);
  }
});

test('choreography is tempo-locked: the same steps land on the same beats at 90 and 150 BPM', () => {
  const def = CHARACTERS.player, plan = stringPlan(def, { bars: 8 });
  const a = simulate(def, plan, { bpm: 90, from: 0, to: 30, fps: 120 }).contacts;
  const b = simulate(def, plan, { bpm: 150, from: 0, to: 30, fps: 120 }).contacts;
  // Every step at 150 BPM has its twin at 90 BPM (same foot, same beat ±⅛);
  // the follow-through springs run in real seconds, so a borderline ball-of-
  // the-foot touch may register at one tempo only.
  const matched = b.filter(c => a.some(x => x.side === c.side && Math.abs(x.beat - c.beat) < 0.125));
  assert.ok(matched.length / b.length >= 0.9, `${matched.length}/${b.length} steps matched across tempos`);
});

// ── State machine ───────────────────────────────────────────────────
test('a full dance string walks the states in order, with no illegal transitions', () => {
  const def = CHARACTERS.player;
  const sim = simulate(def, stringPlan(def), { from: 0, to: 44 });
  assert.equal(illegalTransitions(sim).length, 0, JSON.stringify(illegalTransitions(sim).slice(0, 3)));
  const seq = stateSequence(sim).map(s => s.state);
  const order = ['IDLE_GROOVE', 'MOVE_PREPARATION', 'DANCE_MOVE', 'COMBO_ADVANCE', 'ADVANCED_COMBO', 'FREEZE_POSE', 'MOVE_TRANSITION', 'IDLE_GROOVE'];
  let i = 0;
  for (const s of seq) if (s === order[i]) i++;
  assert.equal(i, order.length, `state order: ${seq.join(' → ')}`);
  for (const s of seq) assert.ok(STATES.includes(s), s);
});

test('a miss is a stutter and a recovery — no tumble, flip or collapse', () => {
  const def = CHARACTERS.player, c = new Choreographer(def);
  const plan = [...c.success({ bar: 1, tier: 1, row: 0 }), ...c.success({ bar: 2, tier: 2, row: 1 })];
  plan.push(...c.miss({ bar: 2 }, 11.3));
  assert.equal(c.row, 0, 'the miss cuts the string short');
  const sim = simulate(def, plan, { from: 0, to: 20 });
  const seq = stateSequence(sim).map(s => s.state);
  const iMiss = seq.indexOf('MISSED_INPUT'), iRec = seq.indexOf('RECOVERY');
  assert.ok(iMiss >= 0 && iRec > iMiss, seq.join(' → '));
  assert.equal(seq[seq.length - 1], 'IDLE_GROOVE', 'back in the groove');
  const { ROOT } = LAYOUT;
  for (const f of sim.frames) {
    if (f.state !== 'MISSED_INPUT' && f.state !== 'RECOVERY') continue;
    assert.ok(Math.abs(f.a[ROOT + 4]) < 0.3 && Math.abs(f.a[ROOT + 5]) < 0.3, 'no tumble');
    assert.ok(f.a[ROOT + 1] > -0.25, `no collapse (hips ${f.a[ROOT + 1].toFixed(2)})`);
  }
  assert.equal(illegalTransitions(sim).length, 0);
});

test('solo: designated specials, then the finisher and the freeze', () => {
  const def = CHARACTERS.player, c = new Choreographer(def);
  const e = c.solo({ bar: 3, bars: 2 });
  assert.equal(e[0].name, 'headspin'); assert.equal(e[0].state, 'SOLO_SEQUENCE');
  assert.equal(e[e.length - 1].state, 'FREEZE_POSE');
  const sim = simulate(def, e, { from: 0, to: 24 });
  const seq = stateSequence(sim).map(s => s.state);
  assert.ok(seq.includes('SOLO_SEQUENCE') && seq.includes('FREEZE_POSE'), seq.join(' → '));
  assert.equal(illegalTransitions(sim).length, 0);
});

test('state machine table: every state is known and reachable', () => {
  for (const s of STATES) {
    const reachable = STATES.some(t => t !== s && canTransition(t, s));
    assert.ok(reachable, `${s} reachable`);
  }
  assert.ok(!canTransition('IDLE_GROOVE', 'FREEZE_POSE'), 'a freeze needs its preparation');
  assert.ok(canTransition('DANCE_MOVE', 'MISSED_INPUT'), 'a miss can interrupt');
});

// ── Dance-string advancement ────────────────────────────────────────
// Played through the real input path (arrows, then the button on beat 4).
test('rules: 8 landed commands walk rows 1-8, the 8th is the freeze, then a rest bar', () => {
  const rb = makeBattle(), d = rb.player;
  for (let i = 0; i < 8; i++) assert.equal(playBar(rb, 'player', 4 + i).judgment, 'perfect');
  const moves = ev(rb, 'move', 'player');
  assert.deepEqual(moves.map(m => m.row), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(moves.map(m => m.freeze), [false, false, false, false, false, false, false, true]);
  assert.equal(d.strings, 1); assert.equal(d.freezes, 1);
  assert.ok(d.row === 0 || d.row === 2, 'the next string starts at the top (or row 3 on a hot streak)');
  // The bar the freeze plays in carries no command.
  rb.update(rb.clock.barTime(12));
  assert.equal(d.bars.get(12).type, 'rest');
});

test('rules: a miss cuts the string short', () => {
  const rb = makeBattle(), d = rb.player;
  playBar(rb, 'player', 4); playBar(rb, 'player', 5); playBar(rb, 'player', 6);
  assert.equal(d.row, 3);
  assert.equal(playBar(rb, 'player', 7, { offset: 0.3 }).stray, true, 'a press after the window is not a new command');
  assert.equal(d.row, 0);
  playBar(rb, 'player', 8); playBar(rb, 'player', 9);
  assert.equal(d.row, 2);
});

test('choreographer: rows map to the character’s lines, the ★ line differs, odd strings mirror', () => {
  const def = CHARACTERS.toni, c = new Choreographer(def), P = c.plan;
  for (let r = 0; r < 7; r++) {
    assert.equal(c.success({ bar: 1 + r, tier: 2, row: r, string: 0 })[0].name, P.std[r]);
    assert.equal(c.success({ bar: 1 + r, tier: 2, row: r, kind: 'branch', string: 0 })[0].name, P.alt[r]);
  }
  const fin = c.success({ bar: 9, tier: 4, row: 7, freeze: true, string: 1 });
  assert.equal(fin.length, 2);
  assert.equal(fin[0].state, 'ADVANCED_COMBO'); assert.equal(fin[1].state, 'FREEZE_POSE');
  assert.equal(fin[1].name, P.freeze);
  assert.ok(fin[0].mirror && fin[1].mirror, 'odd strings lead with the other foot');
  assert.equal(rowState(2), 'COMBO_ADVANCE'); assert.equal(rowState(6), 'ADVANCED_COMBO');
  // Lines escalate: the advanced rows are not the opening grooves.
  assert.notEqual(P.std[6], P.std[0]);
});

// ── Flip budget / grounded dancing ──────────────────────────────────
test('no flips, jumps or multi-turn spins in any character’s strings, idle groove or accent', () => {
  for (const [id, def] of Object.entries(CHARACTERS)) {
    const issues = validateChoreo(buildChoreo(def), def.style);
    assert.deepEqual(issues, [], `${id}: ${issues.join('; ')}`);
  }
});

test('simulated strings stay on the ground outside the solo (all characters)', () => {
  for (const [id, def] of Object.entries(CHARACTERS)) for (const line of ['std', 'alt']) {
    const sim = simulate(def, stringPlan(def, { line, bars: 11 }), { from: 0, to: 40, fps: 30 });
    const flips = acrobatics(sim).filter(e => e.kind === 'flip');
    assert.equal(flips.length, 0, `${id} ${line}: ${JSON.stringify(flips.slice(0, 2))}`);
    assert.ok(overreach(sim) < 1.15, `${id} ${line}: legs over-reach ${overreach(sim).toFixed(2)}`);
  }
});

test('MVP dancers: specials only exist where designated (solo / victory)', () => {
  for (const id of MVP) {
    const P = buildChoreo(CHARACTERS[id]);
    const everyday = [...P.std, ...P.alt, P.finisher.std, P.finisher.alt, P.freeze];
    for (const n of everyday) assert.ok(!moveProfile(n, CHARACTERS[id].style).special, `${id}: ${n}`);
    assert.ok(P.solo.length >= 1, `${id} has a solo`);
  }
});

// ── Feet ────────────────────────────────────────────────────────────
test('MVP dancers: planted feet do not skate', () => {
  for (const id of MVP) for (const line of ['std', 'alt']) {
    const sim = simulate(CHARACTERS[id], stringPlan(CHARACTERS[id], { line }), { from: 0, to: 44 });
    const sk = skating(sim);
    assert.ok(sk.length <= 3, `${id} ${line}: ${sk.length} skating frames ${JSON.stringify(sk.slice(0, 3).map(s => s.move + '@' + s.beat.toFixed(2)))}`);
  }
});

test('feet never go through the floor', () => {
  const { FEET, FS, ANK } = LAYOUT;
  for (const id of MVP) {
    const sim = simulate(CHARACTERS[id], stringPlan(CHARACTERS[id]), { from: 0, to: 44, fps: 30 });
    for (const f of sim.frames) for (let s = 0; s < 2; s++) assert.ok(f.a[FEET + s * FS + 1] >= ANK - 1e-6);
  }
});

test('every move a plan names exists', () => {
  for (const [id, def] of Object.entries(CHARACTERS)) {
    const P = buildChoreo(def);
    for (const n of [...P.std, ...P.alt, P.finisher.std, P.finisher.alt, P.freeze, P.stumble, P.recover, ...P.solo]) assert.ok(MOVES[n], `${id}: ${n}`);
  }
});
