// MusicClock — the beat/BPM manager every Story Mode system keys off.
//
// The song's playback position is the single source of truth: notes,
// judgments, dance moves, camera cuts and stage lights are all expressed in
// song time / beats, never in animation or frame time. Song time is derived
// from the AudioContext clock (sample-accurate), mapped to performance.now()
// so input event timestamps can be converted precisely, and compensated for
// output latency plus a user calibration offset.

export class MusicClock {
  constructor(ctx, { bpm, firstBeat = 0, beatsPerBar = 4 }) {
    this.ctx = ctx;
    this.bpm = bpm;
    this.spb = 60 / bpm;
    this.firstBeat = firstBeat;
    this.beatsPerBar = beatsPerBar;
    this.t0 = null;          // ctx time at which song-time 0 would play
    this.userOffsetMs = 0;   // + = judge later (for delayed audio output)
    this._est = null;        // smoothed audible song time
    this._estPerf = 0;       // performance.now() of _est
    this._frozen = false;
  }

  // Start `buffer` so that song second `offset` is heard at ctx time `when`.
  play(buffer, destination, offset, when, fadeIn = 0.02) {
    const ctx = this.ctx;
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(1, when + Math.max(0.005, fadeIn));
    node.connect(gain);
    gain.connect(destination);
    node.start(when, offset);
    this.t0 = when - offset;
    this.duration = buffer.duration;
    this._est = null;
    return { node, gain };
  }

  // ── Grid conversions (song seconds <-> beats <-> bars) ──
  beatTime(beat) { return this.firstBeat + beat * this.spb; }
  barTime(bar) { return this.beatTime(bar * this.beatsPerBar); }
  beatAt(songSec) { return (songSec - this.firstBeat) / this.spb; }
  songToCtx(songSec) { return this.t0 + songSec; }

  // Raw (un-smoothed) audible song time for a performance.now() instant.
  _measure(perfNow) {
    const ctx = this.ctx;
    const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
      // contextTime is what is coming out of the speakers at performanceTime.
      return ts.contextTime + (perfNow - ts.performanceTime) / 1000 - this.t0;
    }
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    return ctx.currentTime - latency - this.t0;
  }

  // Audible song position at `perfNow` (defaults to now). Smoothed so the
  // visuals don't jitter with the audio clock's update granularity, while
  // snapping on real discontinuities (seek, resume).
  songTime(perfNow = performance.now()) {
    if (this.t0 == null) return -Infinity;
    if (this.ctx.state !== 'running') {
      // Suspended (paused): time stands still.
      if (this._est != null) { this._estPerf = perfNow; return this._est; }
      return this._measure(perfNow);
    }
    const measured = this._measure(perfNow);
    if (this._est == null) {
      this._est = measured;
    } else {
      const pred = this._est + (perfNow - this._estPerf) / 1000;
      const err = measured - pred;
      this._est = Math.abs(err) > 0.05 ? measured : pred + err * 0.12;
    }
    this._estPerf = perfNow;
    return this._est;
  }

  // Song time at which an input event happened, calibrated by the user
  // offset. `evTime` is an Event.timeStamp (performance.now timebase).
  inputSongTime(evTime) {
    const now = performance.now();
    const base = this.songTime(now);
    const t = (evTime && evTime <= now + 5) ? base - (now - evTime) / 1000 : base;
    return t - this.userOffsetMs / 1000;
  }
}
