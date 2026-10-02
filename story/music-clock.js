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

  // Fine-tune the grid phase against the decoded audio between song seconds
  // `from` and `to`. MP3 decoders differ in how much encoder padding they
  // trim (tens of ms between browsers), so the configured `firstBeat` is
  // only trusted to within ±range; the drums in the actual buffer decide the
  // rest. Returns the applied shift in seconds (0 if the fit wasn't clear).
  alignPhase(buffer, from, to, range = 0.06) {
    if (!buffer || !(to > from)) return 0;
    if (buffer._storyPhase && buffer._storyPhase.key === `${this.bpm}:${this.firstBeat}:${from}`) {
      this.firstBeat += buffer._storyPhase.shift;
      return buffer._storyPhase.shift;
    }
    const sr = buffer.sampleRate;
    const L = buffer.getChannelData(0);
    const R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : L;
    const hop = Math.max(1, Math.round(sr * 0.002)), dt = hop / sr;
    const i0 = Math.max(0, Math.floor(from * sr)), i1 = Math.min(L.length, Math.floor(to * sr));
    const n = Math.floor((i1 - i0) / hop);
    if (n < 500) return 0;
    // Two envelopes: a two-pole ~150 Hz low-pass (kick) and full band
    // (snare / claps / hats), 2 ms frames.
    const a = Math.exp(-2 * Math.PI * 150 / sr), b = 1 - a;
    const low = new Float32Array(n), full = new Float32Array(n);
    let p1 = 0, p2 = 0;
    for (let k = 0, i = i0; k < n; k++) {
      let sl = 0, sf = 0;
      for (let j = 0; j < hop; j++, i++) {
        const x = (L[i] + R[i]) * 0.5;
        p1 = p1 * a + b * x; p2 = p2 * a + b * p1;
        sl += p2 * p2; sf += x * x;
      }
      low[k] = Math.log(1e-4 + Math.sqrt(sl / hop));
      full[k] = Math.log(1e-4 + Math.sqrt(sf / hop));
    }
    const o = new Float32Array(n);
    for (let k = 4; k < n; k++) {
      o[k] = Math.max(0, low[k] - low[k - 4]) + 0.6 * Math.max(0, full[k] - full[k - 2]);
    }
    // Comb over every beat in the window for each candidate shift.
    const scores = [];
    let best = -1, bestShift = 0;
    for (let s = -range; s <= range + 1e-9; s += 0.001) {
      let sum = 0, c = 0;
      const b0 = Math.ceil(this.beatAt(from + range)), b1 = Math.floor(this.beatAt(to - range));
      for (let beat = b0; beat <= b1; beat++) {
        const k = Math.round((this.beatTime(beat) + s - from) / dt);
        let m = 0;
        for (let q = k - 2; q <= k + 2; q++) if (q >= 0 && q < n && o[q] > m) m = o[q];
        sum += m; c++;
      }
      const v = c ? sum / c : 0;
      scores.push(v);
      if (v > best) { best = v; bestShift = s; }
    }
    const mean = scores.reduce((x, y) => x + y, 0) / scores.length;
    const shift = best > mean * 1.15 ? Math.round(bestShift * 1000) / 1000 : 0;
    buffer._storyPhase = { key: `${this.bpm}:${this.firstBeat}:${from}`, shift };
    this.firstBeat += shift;
    return shift;
  }

  // Find the drum hits in the decoded audio between `from` and `to` so the
  // dancers can hit them: kick (low band) and snare/clap (high band) onset
  // peaks with their strength, plus a slow loudness curve. Cheap (one pass,
  // ~20 ms for a minute of audio); `accents()` then reads it per frame.
  analyzeAccents(buffer, from, to) {
    this.acc = null;
    if (!buffer || !(to > from)) return;
    const sr = buffer.sampleRate;
    const L = buffer.getChannelData(0);
    const R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : L;
    const hop = Math.max(1, Math.round(sr * 0.005)), dt = hop / sr;
    const i0 = Math.max(0, Math.floor(from * sr)), i1 = Math.min(L.length, Math.floor(to * sr));
    const n = Math.floor((i1 - i0) / hop);
    if (n < 200) return;
    const aL = Math.exp(-2 * Math.PI * 150 / sr), aH = Math.exp(-2 * Math.PI * 1800 / sr);
    const low = new Float32Array(n), high = new Float32Array(n), rms = new Float32Array(n);
    let l1 = 0, l2 = 0, h1 = 0;
    for (let k = 0, i = i0; k < n; k++) {
      let sl = 0, sh = 0, sf = 0;
      for (let j = 0; j < hop; j++, i++) {
        const x = (L[i] + R[i]) * 0.5;
        l1 = l1 * aL + (1 - aL) * x; l2 = l2 * aL + (1 - aL) * l1;
        h1 = h1 * aH + (1 - aH) * x;
        const hp = x - h1;
        sl += l2 * l2; sh += hp * hp; sf += x * x;
      }
      low[k] = Math.log(1e-4 + Math.sqrt(sl / hop));
      high[k] = Math.log(1e-4 + Math.sqrt(sh / hop));
      rms[k] = Math.sqrt(sf / hop);
    }
    const peaks = (env, lag) => {
      const o = new Float32Array(n);
      for (let k = lag; k < n; k++) o[k] = Math.max(0, env[k] - env[k - lag]);
      const sorted = Array.from(o).filter(v => v > 0).sort((a, b) => a - b);
      const ref = sorted[Math.floor(sorted.length * 0.97)] || 1;
      const hits = [];
      const W = Math.round(0.06 / dt);
      for (let k = 1; k < n - 1; k++) {
        const v = o[k] / ref;
        if (v < 0.35) continue;
        let isMax = true;
        for (let q = Math.max(0, k - W); q <= Math.min(n - 1, k + W); q++) if (o[q] > o[k]) { isMax = false; break; }
        if (isMax) hits.push(from + k * dt, Math.min(1.3, (v - 0.35) / 0.65 + 0.15));
      }
      return Float32Array.from(hits);   // [t0, s0, t1, s1, ...]
    };
    // Loudness: ~0.6 s moving average, normalised to the section.
    const win = Math.round(0.6 / dt), loud = new Float32Array(n);
    let acc = 0;
    for (let k = 0; k < n; k++) { acc += rms[k]; if (k >= win) acc -= rms[k - win]; loud[k] = acc / Math.min(k + 1, win); }
    const ls = Array.from(loud).sort((a, b) => a - b), lref = ls[Math.floor(ls.length * 0.9)] || 1;
    for (let k = 0; k < n; k++) loud[k] = Math.max(0.55, Math.min(1.2, loud[k] / lref));
    this.acc = { from, dt, kick: peaks(low, 3), snare: peaks(high, 2), loud };
  }

  // Drum accents at `songTime`: { kick, snare } decay from each hit (0..~1.3)
  // and `energy` (section loudness, ~0.55..1.2). Null if not analysed.
  accents(songTime) {
    const A = this.acc;
    if (!A) return null;
    const read = (arr, tau) => {
      // Binary search the last hit at or before songTime.
      let lo = 0, hi = arr.length / 2 - 1, idx = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (arr[mid * 2] <= songTime) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
      let v = 0;
      for (let q = idx; q >= 0 && q > idx - 3; q--) {
        const age = songTime - arr[q * 2];
        if (age > tau * 5) break;
        v = Math.max(v, arr[q * 2 + 1] * Math.exp(-age / tau));
      }
      return v;
    };
    const k = Math.round((songTime - A.from) / A.dt);
    const energy = k >= 0 && k < A.loud.length ? A.loud[k] : 1;
    return { kick: read(A.kick, 0.075), snare: read(A.snare, 0.09), energy };
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
