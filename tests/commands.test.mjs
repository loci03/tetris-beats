// Command input & combo system tests (story/commands.js, rhythm-battle.js,
// input.js, music-clock.js, choreo.js). Every battle scenario goes through
// the public input path: arrows during the measure, the button on beat 4.
//   node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LATTICE, ROWS, RULES, children, nodeById, resolveCommands, startCandidates, applyDirection, resolveFinal,
  commandStatus, windowsFor, judgeTiming, moveDefinitions, InputBuffer,
} from '../story/commands.js';
import { InputMapper, defaultControls, bind, loadControls, saveControls } from '../story/input.js';
import { MusicClock } from '../story/music-clock.js';
import { Choreographer, MISSING_ANIMS } from '../story/choreo.js';
import { MOVES, registerMoves, moveProfile } from '../story/dance.js';
import { CHARACTERS, registerCharacter } from '../story/characters.js';
import { STORY_LEVELS, LEVEL_ORDER } from '../story/levels.js';
import { makeBattle, playBar, offered, ev, fakeClock } from './battle-harness.mjs';

for (const id of LEVEL_ORDER) {
  const L = (await import(`../story/levels/${id}.js`)).default;
  if (L.moves) registerMoves(L.moves, L.moveMeta || {});
  if (L.boss && typeof L.boss === 'object') registerCharacter(STORY_LEVELS[id].dancers.rival, L.boss);
}

const at = (row, col) => ({ startRow: row - 1, startCol: col });   // next command = node (row, col)
const lastJudge = (rb, who = 'player') => ev(rb, 'judge', who).at(-1);

// ── The original command tree ───────────────────────────────────────
test('tree: 8 rows, row r has r nodes (row 8: 7), two children per node, one into row 8', () => {
  assert.equal(LATTICE.length, ROWS);
  LATTICE.forEach((row, r) => assert.equal(row.length, Math.min(r + 1, 7)));
  assert.deepEqual(children(3, 1).map(n => n.id), ['r4c1', 'r4c2']);
  assert.deepEqual(children(7, 4).map(n => n.id), ['r8c4']);
  assert.deepEqual(children(8, 0), []);
  for (const row of LATTICE) for (const n of row) {
    assert.ok(n.seq.every(d => 'UDLR'.includes(d)), n.id);
    assert.ok(n.button === 'X' || n.button === 'O', n.id);
  }
  // Spot-check against the transcribed original (TAS combos.lua).
  assert.equal(nodeById('r1c0').button, 'O');
  assert.deepEqual([...nodeById('r7c6').seq, nodeById('r7c6').button], ['D', 'D', 'R', 'L', 'L', 'O']);
  assert.equal(nodeById('r8c6').points, 8757);
});

// 1 ────────────────────────────────────────────────────────────────
test('1. all directions correct, button on beat 4 → PERFECT, move lands, string advances', () => {
  const rb = makeBattle({ practice: at(4, 3) });           // r4c3 = ↑ → ○
  const r = playBar(rb, 'player', 4);
  assert.equal(r.judgment, 'perfect');
  assert.equal(r.option.node, 'r4c3');
  const m = ev(rb, 'move', 'player')[0];
  assert.equal(m.node, 'r4c3'); assert.equal(m.bar, 5, 'the move plays through the next measure');
  assert.equal(rb.player.chain, 1);
  assert.equal(rb.player.row, 4); assert.equal(rb.player.col, 3);
  assert.equal(rb.player.score, Math.round(1200 * 1.02));
  // Great / good by offset.
  assert.equal(playBar(rb, 'player', 5, { offset: -0.07 }).judgment, 'great');
  assert.equal(playBar(rb, 'player', 6, { offset: 0.14 }).judgment, 'good');
  assert.equal(rb.player.chain, 3);
});

// 2 ────────────────────────────────────────────────────────────────
test('2. correct directions, wrong final button → MISS, string resets', () => {
  const rb = makeBattle({ practice: at(4, 3) });
  const r = playBar(rb, 'player', 4, { button: 'X' });     // asks for ○
  assert.equal(r.judgment, 'miss'); assert.equal(r.reason, 'wrong-button');
  assert.equal(rb.player.chain, 0);
  assert.equal(ev(rb, 'fumble', 'player').length, 1);
  assert.equal(ev(rb, 'move', 'player').length, 0);
});

// 3 ────────────────────────────────────────────────────────────────
test('3. button outside the beat-4 window → MISS (early press / time-out), windows are inclusive', () => {
  let rb = makeBattle();
  assert.deepEqual([playBar(rb, 'player', 4, { offset: -0.2 }).judgment, lastJudge(rb).reason], ['miss', 'early']);
  rb = makeBattle();
  playBar(rb, 'player', 4, { offset: 0.2 });                // later than GOOD: the window closed first
  assert.equal(lastJudge(rb).judgment, 'miss'); assert.equal(lastJudge(rb).reason, 'late');
  assert.equal(ev(rb, 'judge', 'player').length, 1, 'the stray late press is not charged to the next command');
  rb = makeBattle();
  assert.equal(playBar(rb, 'player', 4, { offset: 0.15 }).judgment, 'good');
  assert.equal(playBar(rb, 'player', 5, { offset: -0.045 }).judgment, 'perfect');
  assert.equal(playBar(rb, 'player', 6, { offset: 0.09 }).judgment, 'great');
  // Never pressed: judged once the window has closed.
  rb = makeBattle();
  offered(rb, 'player', 4);
  rb.update(rb.clock.barTime(4) + 3 * rb.clock.spb + 0.149);
  assert.equal(ev(rb, 'judge', 'player').length, 0);
  rb.update(rb.clock.barTime(4) + 3 * rb.clock.spb + 0.151);
  assert.equal(lastJudge(rb).reason, 'late');
});

// 4 ────────────────────────────────────────────────────────────────
test('4. wrong order: the out-of-order arrow is flagged and ignored; the button then fails as incomplete', () => {
  const rb = makeBattle({ practice: at(4, 3) });           // ↑ → ○
  const r = playBar(rb, 'player', 4, { dirs: ['R', 'U'] });
  const dirs = ev(rb, 'dir', 'player');
  assert.deepEqual(dirs.map(d => d.ok), [false, true]);
  assert.equal(r.judgment, 'miss'); assert.equal(r.reason, 'incomplete');
  // The buffer keeps both, in order, with their results.
  const b = rb.player.bars.get(4);
  assert.deepEqual(b.buffer.events.map(e => [e.kind, e.value, e.result]), [['dir', 'R', 'wrong'], ['dir', 'U', 'ok'], ['btn', 'O', null]]);
  assert.deepEqual(b.buffer.directions, ['U']);
  // A wrong arrow in the middle doesn't clear what was entered.
  const rb2 = makeBattle({ practice: at(4, 3) });
  assert.equal(playBar(rb2, 'player', 4, { dirs: ['U', 'L', 'R'] }).judgment, 'perfect');
});

// 5 ────────────────────────────────────────────────────────────────
test('5. repeated directions (↑ ↑ ↑ ○) count one by one', () => {
  const rb = makeBattle({ practice: at(5, 4) });           // r5c4 = ↑ ↑ ↑ ○
  assert.deepEqual(offered(rb, 'player', 4).cands[0].seq, ['U', 'U', 'U']);
  const r = playBar(rb, 'player', 4);
  assert.equal(r.judgment, 'perfect');
  assert.deepEqual(ev(rb, 'dir', 'player').map(d => d.status.phase), ['dirs', 'dirs', 'button']);
  // Only two ↑ → incomplete.
  const rb2 = makeBattle({ practice: at(5, 4) });
  assert.equal(playBar(rb2, 'player', 4, { dirs: ['U', 'U'] }).reason, 'incomplete');
});

// 6 ────────────────────────────────────────────────────────────────
test('6. more than three directions: five-arrow commands, entered any time before beat 4', () => {
  const rb = makeBattle({ practice: at(7, 6) });           // ↓ ↓ → ← ← ○
  assert.equal(playBar(rb, 'player', 4).judgment, 'perfect');
  // All five crammed into the last half-beat before beat 4 still count.
  const rb2 = makeBattle({ practice: at(7, 6) });
  const b = offered(rb2, 'player', 4);
  ['D', 'D', 'R', 'L', 'L'].forEach((d, i) => rb2.inputAt('player', d, b.finish - 0.2 + i * 0.03));
  assert.equal(rb2.inputAt('player', 'O', b.finish).judgment, 'perfect');
  // An arrow after beat 4 is not part of this command.
  const rb3 = makeBattle({ practice: at(7, 6) });
  const b3 = offered(rb3, 'player', 4);
  ['D', 'D', 'R', 'L'].forEach((d, i) => rb3.inputAt('player', d, b3.t0 + i * 0.1));
  assert.equal(rb3.inputAt('player', 'L', b3.finish + 0.01).stray, true);
  assert.equal(rb3.inputAt('player', 'O', b3.finish + 0.02).reason, 'incomplete');
});

// 7 ────────────────────────────────────────────────────────────────
test('7. shared-prefix branches stay ambiguous until they diverge', () => {
  const rb = makeBattle({ practice: at(4, 2) });           // TOP r4c2 ↑↑✕ · BOTTOM r4c3 ↑→○
  rb.player.enthusiasm = 50;
  const b = offered(rb, 'player', 4);
  assert.deepEqual(b.cands.map(c => [c.slot, c.node]), [['top', 'r4c2'], ['bottom', 'r4c3']]);
  rb.inputAt('player', 'U', b.t0 + 0.1);
  assert.deepEqual(b.cands.map(c => c.alive), [true, true], 'both still possible after ↑');
  assert.deepEqual(commandStatus(b.cands).next.sort(), ['R', 'U']);
  rb.inputAt('player', 'R', b.t0 + 0.3);
  assert.deepEqual(b.cands.map(c => c.alive), [false, true]);
  assert.equal(rb.inputAt('player', 'O', b.finish).option.slot, 'bottom');
  // Same arrows, different buttons (r6c0 →→✕ vs r6c1 →→○): the button decides.
  for (const [btn, node] of [['X', 'r6c0'], ['O', 'r6c1']]) {
    const r2 = makeBattle({ practice: at(6, 0) });
    r2.player.enthusiasm = 50;
    assert.equal(playBar(r2, 'player', 4, { dirs: ['R', 'R'], button: btn }).option.node, node);
  }
  // A command whose arrows are a prefix of the other's: the button after the
  // shorter one completes it; another arrow continues the longer one.
  const cands = startCandidates([
    { slot: 'top', kind: 'std', seq: ['U', 'D'], button: 'O' },
    { slot: 'bottom', kind: 'solo', seq: ['U', 'D', 'U'], button: 'X' }]);
  applyDirection(cands, 'U'); applyDirection(cands, 'D');
  assert.equal(resolveFinal(cands, 'O').option.slot, 'top');
  assert.equal(resolveFinal(cands, 'X').reason, 'wrong-button');
  applyDirection(cands, 'U');
  assert.equal(resolveFinal(cands, 'X').option.slot, 'bottom');
});

// 8 / 9 ────────────────────────────────────────────────────────────
test('8. completing the TOP option continues at the current move level', () => {
  const rb = makeBattle({ practice: at(4, 2) });
  rb.player.enthusiasm = 50;
  const r = playBar(rb, 'player', 4, { slot: 'top' });
  assert.equal(r.option.node, 'r4c2');
  assert.equal(rb.player.level, 3);
  assert.deepEqual(offered(rb, 'player', 5).cands.map(c => c.node), ['r5c2', 'r5c3']);
});

test('9. completing the BOTTOM option steps up a level — only when eligible', () => {
  const rb = makeBattle({ practice: at(4, 2) });
  rb.player.enthusiasm = 50;
  const r = playBar(rb, 'player', 4, { slot: 'bottom' });
  assert.equal(r.option.node, 'r4c3');
  assert.equal(rb.player.level, 4);
  assert.deepEqual(offered(rb, 'player', 5).cands.map(c => c.node).slice(0, 1), ['r5c3']);
  // Eligibility is a rule, not a dice roll.
  assert.equal(resolveCommands({ row: 3, col: 2, enthusiasm: RULES.branchEnthusiasm - 1 }).length, 1);
  assert.equal(resolveCommands({ row: 3, col: 2, enthusiasm: RULES.branchEnthusiasm }).length, 2);
  assert.equal(resolveCommands({ row: 7, col: 2, enthusiasm: 100 }).length, 1, 'row 7 → 8 has one child');
  assert.equal(resolveCommands({ row: 0, col: 0, enthusiasm: 100 }).length, 1, 'row 1 has one node');
  for (let i = 0; i < 20; i++) assert.deepEqual(resolveCommands({ row: 4, col: 1, enthusiasm: 55 }).map(o => o.node), ['r5c1', 'r5c2']);
  // Practice can force it either way.
  assert.equal(resolveCommands({ row: 3, col: 2, enthusiasm: 0 }, { branch: 'always' }).length, 2);
  assert.equal(resolveCommands({ row: 3, col: 2, enthusiasm: 100 }, { branch: 'never' }).length, 1);
});

// 10 ───────────────────────────────────────────────────────────────
test('10. a failed command mid-combo resets the combo and the string; the move type ≠ the combo count', () => {
  const rb = makeBattle();
  for (let i = 0; i < 4; i++) playBar(rb, 'player', 4 + i);
  assert.equal(rb.player.chain, 4); assert.equal(rb.player.row, 4);
  playBar(rb, 'player', 8, { dirs: [] });                   // r5c0 needs ↑ first
  assert.equal(lastJudge(rb).reason, 'incomplete');
  assert.equal(rb.player.chain, 0); assert.equal(rb.player.row, 0); assert.equal(rb.player.col, 0);
  assert.equal(rb.player.maxCombo, 4);
  // After a freeze the move type restarts at 1 while the combo keeps counting.
  const rb2 = makeBattle();
  for (let i = 0; i < 8; i++) playBar(rb2, 'player', 4 + i);
  playBar(rb2, 'player', 13);
  const m = ev(rb2, 'move', 'player').at(-1);
  assert.ok(m.row === 0 || m.row === 2, 'move type back to 1 (3 on a hot streak)'); assert.equal(m.chain, 9);
});

// 11 ───────────────────────────────────────────────────────────────
test('11. eight moves → FREEZE, then a REST measure with no command, then a new string', () => {
  const rb = makeBattle(), d = rb.player;
  for (let i = 0; i < 8; i++) playBar(rb, 'player', 4 + i);
  const moves = ev(rb, 'move', 'player');
  assert.deepEqual(moves.map(m => m.node), ['r1c0', 'r2c0', 'r3c0', 'r4c0', 'r5c0', 'r6c0', 'r7c0', 'r8c0']);
  assert.equal(moves.at(-1).freeze, true);
  rb.update(rb.clock.barTime(12) + 0.5);
  assert.equal(d.bars.get(12).type, 'rest');
  assert.equal(rb.inputAt('player', 'X', rb.clock.barTime(12) + 3 * rb.clock.spb).stray, true, 'nothing to press in the rest bar');
  const next = offered(rb, 'player', 13);
  assert.equal(next.type, 'command');
  assert.equal(next.cands[0].node, d.enthusiasm >= RULES.hotStartEnthusiasm ? 'r3c1' : 'r1c0');
  assert.equal(d.freezes, 1);
});

// 12 ───────────────────────────────────────────────────────────────
test('12. recovery: after a miss the next measure offers row 1 again and can be landed', () => {
  const rb = makeBattle();
  playBar(rb, 'player', 4); playBar(rb, 'player', 5);
  playBar(rb, 'player', 6, { button: 'O' });                // r3c0 asks for ✕
  assert.equal(rb.player.chain, 0);
  const b = offered(rb, 'player', 7);
  assert.deepEqual(b.cands.map(c => c.node), ['r1c0']);
  assert.equal(playBar(rb, 'player', 7).judgment, 'perfect');
  assert.equal(rb.player.chain, 1);
});

// 13 ───────────────────────────────────────────────────────────────
// A scripted player (plans its presses when each command appears, with a
// human reaction delay) against the AI, driven at different frame rates.
function runAtFrames(nextDt, { bars = 24, bpm = 128 } = {}) {
  const rb = makeBattle({ rival: 'ai', bpm, bars, seed: 11 });
  const queue = [];
  let k = 0;
  rb.on((type, d) => {
    if (type !== 'commandReady' || d.who !== 'player' || d.dodge) return;
    const b = rb.player.bars.get(d.bar);
    const opt = b.cands[k % b.cands.length];
    const start = Math.max(b.preparedAt + 0.3, b.t0);
    opt.seq.forEach((dir, i) => queue.push([start + i * 0.12, dir]));
    queue.push([b.finish + ((k * 37) % 9 - 4) * 0.012, opt.button]);
    k++;
  });
  const end = rb.clock.barTime(rb.endBar) + 0.01;
  for (let t = rb.clock.barTime(0); !rb.ended && t <= end + 1; t += nextDt()) {
    queue.sort((a, b) => a[0] - b[0]);
    while (queue.length && queue[0][0] <= t) { const [tt, a] = queue.shift(); rb.inputAt('player', a, tt); }
    rb.update(t);
  }
  return {
    summary: rb.summary(),
    judges: rb.events.filter(e => e.type === 'judge').map(e => [e.who, e.note.bar, e.judgment, Math.round(e.delta * 1000), e.node || e.kind]),
  };
}

test('13. results are identical at 20, 60, 144 fps and with jittery frames', () => {
  const ref = runAtFrames(() => 1 / 60);
  assert.ok(ref.summary.player.moves > 10, 'the scripted player lands commands');
  assert.ok(ref.summary.rival.moves > 5, 'the AI plays');
  for (const dt of [() => 1 / 20, () => 1 / 144]) assert.deepEqual(runAtFrames(dt), ref);
  let s = 7;
  const jitter = () => { s = (s * 16807) % 2147483647; return 0.004 + (s / 2147483647) * 0.06; };
  assert.deepEqual(runAtFrames(jitter), ref);
});

// 14 ───────────────────────────────────────────────────────────────
test('14. low and high tempos: full strings at 60 and 180 BPM; windows never reach the next beat', () => {
  for (const bpm of [60, 90, 180]) {
    const rb = makeBattle({ bpm });
    for (let i = 0; i < 8; i++) assert.equal(playBar(rb, 'player', 4 + i, { offset: 0.03 }).judgment, 'perfect', `${bpm} BPM`);
    assert.equal(rb.player.freezes, 1);
    assert.equal(playBar(rb, 'player', 13, { offset: -0.14 }).judgment, 'good');
  }
  for (const bpm of [60, 120, 180, 240, 300]) {
    const spb = 60 / bpm, w = windowsFor(spb);
    assert.ok(w.good < spb / 2, `${bpm}: GOOD stays inside half a beat`);
    assert.ok(w.perfect <= w.great && w.great <= w.good);
  }
  // At 240 BPM the GOOD window is capped below 150 ms.
  const fast = makeBattle({ bpm: 240 });
  playBar(fast, 'player', 4, { offset: 0.14 });
  assert.equal(lastJudge(fast).judgment, 'miss');
});

// 15 ───────────────────────────────────────────────────────────────
test('15. player and opponent input at the same time stay independent', () => {
  const rb = makeBattle({ rival: 'human' });
  for (const bar of [4, 5, 6]) {
    const pb = offered(rb, 'player', bar), qb = offered(rb, 'rival', bar);
    const pc = pb.cands[0], qc = qb.cands[0];
    // Interleaved arrows, near-simultaneous buttons.
    const n = Math.max(pc.seq.length, qc.seq.length);
    for (let i = 0; i < n; i++) {
      if (pc.seq[i]) rb.inputAt('player', pc.seq[i], pb.t0 + i * 0.2);
      if (qc.seq[i]) rb.inputAt('rival', qc.seq[i], pb.t0 + i * 0.2 + 0.001);
    }
    rb.inputAt('player', pc.button, pb.finish - 0.004);
    rb.inputAt('rival', bar === 5 ? (qc.button === 'X' ? 'O' : 'X') : qc.button, qb.finish + 0.003);
  }
  assert.equal(rb.player.chain, 3);
  assert.equal(rb.rival.chain, 1, 'the rival fumbled bar 5 and restarted');
  assert.deepEqual(ev(rb, 'fumble').map(e => e.who), ['rival']);
  for (const who of ['player', 'rival']) for (const b of rb.dancer(who).bars.values()) {
    assert.ok(b.buffer.events.every(e => true), 'separate buffers');
  }
  assert.notEqual(rb.player.bars.get(5).buffer, rb.rival.bars.get(5).buffer);
  assert.equal(rb.player.score > rb.rival.score, true);
});

// 16 ───────────────────────────────────────────────────────────────
test('16. battle boundaries: no commands in the intro, the last measure counts, inputs after the end are ignored', () => {
  const rb = makeBattle({ bars: 10, startBar: 4 });
  rb.update(rb.clock.barTime(1));
  assert.equal(rb.inputAt('player', 'O', rb.clock.barTime(1) + 3 * rb.clock.spb).stray, true, 'intro: nothing to press');
  for (let bar = 4; bar < 14; bar++) if (bar !== 12) playBar(rb, 'player', bar);   // bar 12 = rest after the freeze
  assert.equal(rb.player.moves, 9);
  assert.equal(ev(rb, 'move', 'player').at(-1).bar, 14, 'the last battle measure is playable');
  rb.update(rb.clock.barTime(14));
  assert.equal(rb.ended, true);
  assert.equal(ev(rb, 'end').length, 1);
  assert.equal(rb.inputAt('player', 'O', rb.clock.barTime(14) + 1), null);
  // A freeze on the very last measure doesn't spill a rest bar past the end.
  const rb3 = makeBattle({ bars: 8 });
  for (let bar = 4; bar < 12; bar++) playBar(rb3, 'player', bar);
  assert.equal(ev(rb3, 'move', 'player').at(-1).row, 7);
  assert.ok(![...rb3.player.bars.keys()].some(b => b >= rb3.endBar));
  // No attack in the last two measures (the dodge would fall outside the battle).
  const rb2 = makeBattle({ bars: 6 });
  offered(rb2, 'player', 8);
  assert.ok(rb2.inputAt('player', 'T', rb2.player.bars.get(8).finish).blocked);
});

// 17 ───────────────────────────────────────────────────────────────
function fakePads() {
  const pads = [];
  const mk = (index) => ({ index, id: `Pad ${index}`, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
  return { pads, mk, set(p, i, on) { p.buttons[i] = { pressed: on, value: on ? 1 : 0 }; } };
}

test('17. gamepad: d-pad + buttons, disconnect / reconnect, remapping, debounce, latency', () => {
  const F = fakePads();
  let now = 1000;
  const got = [], dev = [];
  const m = new InputMapper({ onAction: (a, ts, info) => got.push([a, ts, info.source]), onDevice: (d) => dev.push([d.connected, d.index]),
    controls: defaultControls(), target: null, getGamepads: () => F.pads, now: () => now, autoStart: false });
  const p = F.mk(0); F.pads.push(p);
  m.poll();
  assert.deepEqual(dev, [[true, 0]]);
  const press = (i, t) => { now = t; p.timestamp = t; F.set(p, i, true); m.poll(); now += 8; p.timestamp = now; F.set(p, i, false); m.poll(); };
  press(12, 1100); press(12, 1200); press(13, 1300); press(0, 1500);  // ↑ ↑ ↓ ✕
  assert.deepEqual(got.map(g => g[0]), ['U', 'U', 'D', 'X']);
  assert.deepEqual(got.map(g => g[1]), [1100, 1200, 1300, 1500]);
  // Switch chatter: a second edge 10 ms later is dropped.
  got.length = 0;
  press(1, 2000); press(1, 2010);
  assert.deepEqual(got.map(g => g[0]), ['O']);
  // Direction + button in the same poll: direction first.
  got.length = 0; now = 2500; p.timestamp = now;
  F.set(p, 1, true); F.set(p, 15, true); m.poll();
  assert.deepEqual(got.map(g => g[0]), ['R', 'O']);
  F.set(p, 1, false); F.set(p, 15, false); now = 2510; m.poll();
  // Analog stick with hysteresis: one ← per push.
  got.length = 0;
  for (const x of [-0.7, -0.5, -0.7, -0.2, -0.65]) { now += 30; p.axes[0] = x; m.poll(); }
  assert.deepEqual(got.map(g => g[0]), ['L', 'L']);
  p.axes[0] = 0; now += 30; m.poll();
  // Disconnect (vanishes) → reported; held buttons on reconnect don't fire.
  F.pads.length = 0; now += 30; m.poll();
  assert.deepEqual(dev.at(-1), [false, 0]);
  got.length = 0;
  const p2 = F.mk(0); F.set(p2, 0, true); F.pads.push(p2); now += 30; m.poll();
  assert.deepEqual(dev.at(-1), [true, 0]);
  assert.equal(got.length, 0, 'a button held while reconnecting does not fire');
  F.set(p2, 0, false); now += 30; m.poll();
  F.set(p2, 0, true); now += 30; p2.timestamp = now; m.poll();
  assert.deepEqual(got.map(g => g[0]), ['X']);
  F.set(p2, 0, false); now += 30; m.poll();
  // Remap ○ to RB (5) and give the pad 20 ms of latency.
  got.length = 0;
  m.setControls({ ...bind(m.controls, 'O', { type: 'button', index: 5 }), latency: { key: 0, pad: 20, touch: 0 } });
  now += 30; p2.timestamp = now; F.set(p2, 5, true); m.poll();
  assert.deepEqual(got, [['O', now - 20, 'pad']]);
});

test('17b. keyboard: physical keys, auto-repeat ignored, remap, saved bindings', () => {
  const got = [];
  const m = new InputMapper({ onAction: (a, ts) => got.push([a, ts]), controls: defaultControls(), target: null, getGamepads: () => [], autoStart: false });
  const key = (code, ts, repeat = false) => m._key({ code, timeStamp: ts, repeat, preventDefault() {}, stopImmediatePropagation() {} });
  key('ArrowUp', 100); key('ArrowUp', 130, true); key('ArrowUp', 200); key('ArrowDown', 300); key('KeyJ', 500); key('KeyK', 900);
  assert.deepEqual(got.map(g => g[0]), ['U', 'U', 'D', 'X', 'O']);
  m.setControls(bind(m.controls, 'O', { type: 'key', code: 'KeyZ' }));
  got.length = 0; key('KeyZ', 1200);
  assert.deepEqual(got, [['O', 1200]]);
  // Persisted and restored.
  const mem = new Map(), storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveControls(m.controls, storage);
  assert.equal(loadControls(storage).keys.KeyZ, 'O');
  assert.equal(loadControls({ getItem: () => '{broken' }).keys.KeyJ, 'X', 'corrupt data falls back to defaults');
});

// 18 ───────────────────────────────────────────────────────────────
test('18. every move of every character resolves to its own animation (by move id, no flips, no randomness)', () => {
  MISSING_ANIMS.clear();
  for (const [id, def] of Object.entries(CHARACTERS)) {
    const c = new Choreographer(def, id);
    assert.equal(c.moves.size, 35, id);
    for (const row of LATTICE) for (const n of row) {
      const md = c.moveDef(n.id);
      assert.equal(md.id, `${String(id).toLowerCase()}:${n.id}`);
      assert.equal(md.type, n.row); assert.equal(md.level, n.col + 1);
      assert.deepEqual([...md.seq], [...n.seq]); assert.equal(md.button, n.button);
      assert.ok(MOVES[md.anim], `${id} ${n.id}: "${md.anim}" exists`);
      const a = c.success({ bar: 2, node: n.id, tier: 1 }), b = c.success({ bar: 2, node: n.id, tier: 1 });
      assert.deepEqual(a, b, 'same node, same animation');
      assert.equal(a[0].name, md.anim); assert.equal(a[0].moveId, md.id); assert.equal(a[0].mirror, md.mirror);
      if (n.row === ROWS) { assert.equal(a[1].state, 'FREEZE_POSE'); assert.equal(a[1].name, md.freeze); }
      else assert.equal(a.length, 1);
      // Measured motion, not names ("hairFlip" is a hair whip): no flips.
      assert.equal(moveProfile(md.anim).flip, false, `${id} ${n.id} ${md.anim} is not a flip`);
    }
  }
  assert.equal(MISSING_ANIMS.size, 0, `missing: ${[...MISSING_ANIMS]}`);
  // A missing asset falls back to a grounded move and is logged once.
  const c = new Choreographer(CHARACTERS.player, 'player');
  const warn = console.warn; let warned = 0; console.warn = () => warned++;
  try {
    assert.ok(MOVES[c.anim('noSuchMove', 2)]); c.anim('noSuchMove', 2);
  } finally { console.warn = warn; }
  assert.equal(warned, 1); assert.ok(MISSING_ANIMS.has('noSuchMove'));
  MISSING_ANIMS.clear();
});

test('18b. a battle string plays the animations of the nodes it actually resolved', () => {
  const rb = makeBattle({ practice: { branch: 'always' } });
  const c = new Choreographer(CHARACTERS.toni, 'toni');
  for (let i = 0; i < 8; i++) playBar(rb, 'player', 4 + i, { slot: i % 2 ? 'bottom' : 'top' });
  const moves = ev(rb, 'move', 'player');
  assert.equal(moves.length, 8);
  for (const m of moves) assert.equal(c.success(m)[0].name, c.moveDef(m.node).anim);
  assert.notDeepEqual(moves.map(m => m.col), [0, 0, 0, 0, 0, 0, 0, 0], 'the bottom options were taken');
});

// 19 ───────────────────────────────────────────────────────────────
test('19. no drift: the beat grid, judge and HUD clock agree over a full song (and at ½ speed)', () => {
  for (const rate of [1, 0.5]) {
    // Fake audio context: the output clock advances in 128-frame blocks.
    const ctx = { state: 'running', currentTime: 0, outputLatency: 0.02, baseLatency: 0.005, createBufferSource() {
      return { playbackRate: { value: 1 }, connect() {}, start() {} };
    }, createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; } };
    const clock = new MusicClock(ctx, { bpm: 128, firstBeat: 0.25 });
    clock.play({ duration: 400 }, {}, 0, 0.1, 0.02, rate);
    const block = 128 / 48000;
    let worst = 0, perf = 0;
    const truth = (ctxT) => (ctxT - 0.025 - clock.t0) * rate;
    for (let frame = 0; frame < 60 * 330; frame++) {      // 5½ minutes at 60 fps
      perf = frame * 1000 / 60 + (frame % 7) * 0.3;
      const real = perf / 1000;
      ctx.currentTime = Math.floor(real / block) * block;
      const st = clock.songTime(perf);
      worst = Math.max(worst, Math.abs(st - truth(real)));
    }
    assert.ok(worst < 0.006, `rate ${rate}: worst error ${Math.round(worst * 1000)} ms`);
  }
  // The judge's beat 4 is the grid's beat 4 at every bar of a long song.
  const rb = makeBattle({ bpm: 133, bars: 120 });
  for (let bar = 4; bar < 124; bar++) {
    if (offered(rb, 'player', bar).type !== 'command') continue;   // the rest measure after a freeze
    const r = playBar(rb, 'player', bar);
    assert.equal(r.judgment, 'perfect', `bar ${bar}`);
    const b = rb.player.bars.get(bar);
    assert.equal(b.finish, rb.clock.barTime(bar) + 3 * rb.clock.spb);
    assert.ok(Math.abs(rb.clock.beatAt(b.finish) - (bar * 4 + 3)) < 1e-9);
  }
  assert.equal(ev(rb, 'judge', 'player').every(e => Math.abs(e.delta) < 1e-9), true);
});

// 20 ───────────────────────────────────────────────────────────────
test('20. attack △ / dodge □ never corrupt either string', () => {
  const rb = makeBattle({ rival: 'human' });
  // Both build a string.
  for (const bar of [4, 5]) { playBar(rb, 'player', bar); playBar(rb, 'rival', bar); }
  assert.equal(rb.player.chain, 2); assert.equal(rb.rival.chain, 2);
  // Player attacks on beat 4 of bar 6 instead of the button.
  const b6 = offered(rb, 'player', 6);
  playBar(rb, 'rival', 6);
  const r = rb.inputAt('player', 'T', b6.finish + 0.01);
  assert.equal(r.attack, true); assert.equal(r.judgment, 'perfect');
  assert.equal(rb.player.chain, 2, 'the attacker keeps the string'); assert.equal(rb.player.row, 2);
  assert.equal(rb.player.jammers, RULES.jammers - 1);
  // The rival's next measure is a dodge measure: □ on beat 4 dodges, string kept.
  const d7 = offered(rb, 'rival', 7);
  assert.equal(d7.type, 'dodge');
  assert.equal(rb.inputAt('rival', 'U', d7.t0 + 0.1).stray, true, 'arrows are not part of a dodge');
  assert.equal(rb.inputAt('rival', 'S', d7.finish).dodge, true);
  assert.equal(rb.rival.chain, 3); assert.equal(rb.rival.row, 3);
  playBar(rb, 'player', 7);
  assert.equal(rb.player.chain, 3);
  // Second attack lands (no □): the rival is stunned for a measure and restarts.
  const b8 = offered(rb, 'player', 8);
  playBar(rb, 'rival', 8);
  rb.inputAt('player', 'T', b8.finish);
  const d9 = offered(rb, 'rival', 9);
  rb.inputAt('rival', 'X', d9.finish);                      // wrong button
  rb.update(d9.finish + 0.2);
  assert.equal(rb.rival.chain, 0); assert.equal(rb.rival.row, 0);
  assert.equal(rb.rival.bars.get(10).type, 'stunned');
  assert.equal(ev(rb, 'tauntLanded').length, 1);
  // Out of attacks: △ does nothing, the open command is untouched.
  playBar(rb, 'player', 9);
  const b10 = offered(rb, 'player', 10);
  const chain = rb.player.chain;
  assert.equal(rb.inputAt('player', 'T', b10.finish).blocked, true);
  assert.equal(rb.player.bars.get(10).resolved, false);
  // □ on a command measure is stray, and the command can still be landed.
  assert.equal(rb.inputAt('player', 'S', b10.finish - 0.3).stray, true);
  b10.cands[0].seq.forEach((d, i) => rb.inputAt('player', d, b10.t0 + 0.05 * i));
  assert.equal(rb.inputAt('player', b10.cands[0].button, b10.finish + 0.03).judgment, 'perfect');
  assert.equal(rb.player.chain, chain + 1);
});

// ── Pieces ──────────────────────────────────────────────────────────
test('input buffer keeps song-time order; judge windows; move definitions carry successors', () => {
  const buf = new InputBuffer();
  buf.push(1.2, 'dir', 'U', 'ok'); buf.push(1.1, 'dir', 'D', 'ok'); buf.push(1.3, 'btn', 'O');
  assert.deepEqual(buf.events.map(e => e.value), ['D', 'U', 'O']);
  const w = windowsFor(0.5);
  assert.deepEqual([0, 0.045, 0.046, 0.09, 0.15, 0.151].map(d => judgeTiming(d, w)), ['perfect', 'perfect', 'great', 'great', 'good', 'miss']);
  const defs = moveDefinitions('x', { std: Array(7).fill('a'), alt: Array(7).fill('b'), finisher: { std: 'f', alt: 'g' }, freeze: 'z' });
  assert.deepEqual(defs.get('r3c1').successors, ['r4c1', 'r4c2']);
  assert.equal(defs.get('r7c2').branch.rule, 'none');
  assert.equal(defs.get('r8c5').freeze, 'z');
});
