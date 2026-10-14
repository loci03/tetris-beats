// Test harness for RhythmBattle: a fake musical clock (same interface as
// MusicClock) and helpers that play a bar the way a player would — arrows
// during the measure, the button on beat 4 — through the public input API.

import { RhythmBattle } from '../story/rhythm-battle.js';
import { STORY_LEVELS } from '../story/levels.js';

export function fakeClock(bpm = 120) {
  const spb = 60 / bpm;
  return {
    bpm, spb, beatsPerBar: 4,
    barTime: (bar) => bar * 4 * spb,
    beatAt: (t) => t / spb,
    inputSongTime: (ms) => ms / 1000,
  };
}

// rival: 'none' (switched off), 'ai', or 'human' (driven by the test).
export function makeBattle({ bpm = 120, rival = 'none', practice = null, seed = 3, startBar = 4, bars = 40, ai = 'medium', timing = null } = {}) {
  const clock = fakeClock(bpm);
  const music = { battleStartBar: startBar, battleBars: bars, introBars: 4 };
  const p = rival === 'none' ? { ...(practice || {}), rival: 'none' } : practice;
  const rb = new RhythmBattle({ clock, music, seed, aiProfile: STORY_LEVELS.underground.ai[ai], practice: p, rival: rival === 'none' ? 'ai' : rival, timing });
  const events = [];
  rb.on((type, data) => events.push({ type, ...data }));
  rb.events = events;
  return rb;
}

// The bar's offered options once it's on screen (advances time to it).
export function offered(rb, who, bar) {
  const d = rb.dancer(who), clock = rb.clock;
  const b = d.bars.get(bar);
  if (!b || !b.prepared) rb.update(clock.barTime(bar) - 0.001);
  const bb = d.bars.get(bar);
  if (!bb.prepared) rb.update(clock.barTime(bar));
  return d.bars.get(bar);
}

// Play `who`'s bar: pick the option in `slot` ('top' | 'bottom'), enter its
// arrows (or `dirs`), press `button` (default: the option's) at beat 4 +
// `offset` seconds. Returns the input result of the button.
export function playBar(rb, who, bar, { slot = 'top', offset = 0, dirs = null, button = null, spread = 0.4 } = {}) {
  const b = offered(rb, who, bar), clock = rb.clock;
  const opt = (b.cands || []).find(o => o.slot === slot) || (b.cands || [])[0];
  const seq = dirs || (opt ? opt.seq : []);
  const t0 = Math.max(clock.barTime(bar), (b.preparedAt ?? -Infinity) + 0.01);
  seq.forEach((dir, i) => rb.inputAt(who, dir, t0 + i * spread * clock.spb * Math.min(1, 6 / Math.max(6, seq.length))));
  return rb.inputAt(who, button || (opt ? opt.button : 'X'), b.finish + offset);
}

export function ev(rb, type, who = null) {
  return rb.events.filter(e => e.type === type && (who == null || e.who === who));
}
