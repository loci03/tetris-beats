// HUD timing tests: the command strip's beat pulse comes from the battle's
// own beat events and the music clock — never a separate timer.
//   node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pulseEnvelope, beatPhase, PULSE } from '../story/hud.js';
import { MusicClock } from '../story/music-clock.js';
import { makeBattle, playBar, offered } from './battle-harness.mjs';

test('pulse envelope: ~40 ms attack, ~140 ms decay (beat 4: slower decay)', () => {
  assert.equal(pulseEnvelope(-0.01), 0);
  assert.equal(pulseEnvelope(0), 0);
  assert.ok(Math.abs(pulseEnvelope(0.02) - 0.5) < 1e-9);
  assert.equal(pulseEnvelope(PULSE.attack), 1);
  assert.ok(Math.abs(pulseEnvelope(PULSE.attack + PULSE.decay) - Math.exp(-1)) < 1e-9);
  assert.ok(pulseEnvelope(0.3, PULSE.attack, PULSE.decay4) > pulseEnvelope(0.3), 'beat 4 lingers');
  assert.ok(pulseEnvelope(0.6) < 0.05, 'gone before the next beat at 100 BPM');
});

test('beat events: one per beat, on the same grid the judge uses for beat 4, frame-rate independent', () => {
  const run = (dt) => {
    const rb = makeBattle({ bpm: 128 });
    const beats = [];
    rb.on((t, d) => { if (t === 'beat') beats.push(d); });
    for (let t = 0; t < rb.clock.barTime(12); t += dt) rb.update(t);
    return { rb, beats };
  };
  const { rb, beats } = run(1 / 60);
  // Every beat from the intro to now, in order, counting 1-2-3-4.
  for (let i = 1; i < beats.length; i++) assert.equal(beats[i].beat, beats[i - 1].beat + 1);
  assert.deepEqual(beats.slice(0, 5).map(b => b.count), [1, 2, 3, 4, 1]);
  // Beat 4 of a command measure is exactly the judge's beat 4.
  const b = rb.player.bars.get(6) || offered(rb, 'player', 6);
  const four = beats.find(x => x.bar === 6 && x.count === 4);
  assert.ok(Math.abs(four.time - b.finish) < 1e-9);
  // 20 fps and jittery frames give the same events.
  assert.deepEqual(run(1 / 20).beats, beats);
  let s = 3;
  const jitter = () => { s = (s * 16807) % 2147483647; return 0.004 + (s / 2147483647) * 0.07; };
  const rb2 = makeBattle({ bpm: 128 }), beats2 = [];
  rb2.on((t, d) => { if (t === 'beat') beats2.push(d); });
  for (let t = 0; t < rb2.clock.barTime(12); t += jitter()) rb2.update(t);
  assert.deepEqual(beats2, beats);
});

test('beat events recover after a seek; the pulse phase comes from the clock', () => {
  const rb = makeBattle({ bpm: 120 });
  const beats = [];
  rb.on((t, d) => { if (t === 'beat') beats.push(d.beat); });
  rb.update(rb.clock.barTime(6) + 0.1);
  rb.update(rb.clock.barTime(5) + 0.6);          // jump back
  assert.equal(beats.at(-1), 21, 'the beat at the new position');
  rb.update(rb.clock.barTime(9) + 0.01);          // jump ahead
  assert.equal(beats.at(-1), 36);
  // The HUD's phase is a pure function of song time.
  const ph = beatPhase(rb.clock, rb.clock.barTime(9) + 0.25);
  assert.equal(ph.k, 36); assert.ok(Math.abs(ph.since - 0.25) < 1e-9);
});

test('pause / resume: the pulse holds on pause and lines up with the beat after resume (also at ½ speed)', () => {
  for (const rate of [1, 0.5]) {
    const ctx = { state: 'running', currentTime: 0, outputLatency: 0, baseLatency: 0,
      createBufferSource() { return { playbackRate: { value: 1 }, connect() {}, start() {} }; },
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; } };
    const clock = new MusicClock(ctx, { bpm: 120, firstBeat: 0 });
    clock.play({ duration: 300 }, {}, 0, 0, 0.01, rate);
    const at = (perfMs) => { ctx.currentTime = perfMs / 1000; return clock.songTime(perfMs); };
    // 3 beats + 50 ms in (real time).
    let st = at((1.5 / rate + 0.05) * 1000);
    let ph = beatPhase(clock, st);
    assert.equal(ph.k, 3);
    assert.ok(Math.abs(ph.since - 0.05) < 0.003, `rate ${rate}: ${ph.since}`);
    const p0 = pulseEnvelope(ph.since);
    // Pause for 2 s: the context stops, song time and pulse hold.
    ctx.state = 'suspended';
    const st2 = clock.songTime((1.5 / rate + 2.05) * 1000);
    assert.equal(st2, st);
    assert.equal(pulseEnvelope(beatPhase(clock, st2).since), p0);
    // Resume: the audio clock picks up where it stopped (the context
    // doesn't advance while suspended).
    ctx.state = 'running';
    const resumeAt = (1.5 / rate + 2.05) * 1000;
    clock._est = null;
    ctx.currentTime = (1.5 / rate + 0.05);                 // suspended contexts don't advance
    st = clock.songTime(resumeAt);
    ph = beatPhase(clock, st);
    assert.equal(ph.k, 3); assert.ok(Math.abs(ph.since - 0.05) < 0.003);
  }
});

test('the strip follows the judge: beat 4 of the command measure is where the window is', () => {
  const rb = makeBattle({ bpm: 100 });
  const b = offered(rb, 'player', 5);
  const ph = beatPhase(rb.clock, b.finish + 0.001);
  assert.equal(ph.k, 5 * 4 + 3, 'the beat at the judge\'s beat 4 is count 4 of the measure');
  assert.equal(playBar(rb, 'player', 5).judgment, 'perfect');
});
