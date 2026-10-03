// Story Mode sound effects, synthesized with Web Audio (no extra files):
// hit ticks, miss thud, taunt stinger, crowd roar, transition whoosh/riser
// and impact. Everything routes through the game's master gain, so the
// volume slider and mute apply.

export class StorySfx {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(destination);
    // Shared white-noise buffer.
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Applause: hundreds of hand claps scattered over 3 s (each a short,
    // band-limited noise burst), rendered once.
    const alen = Math.floor(ctx.sampleRate * 3);
    this.applauseBuf = ctx.createBuffer(2, alen, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const a = this.applauseBuf.getChannelData(c);
      for (let k = 0; k < 900; k++) {
        const t0 = Math.floor(Math.random() * (alen - 2000)), dur = 300 + Math.random() * 500;
        const amp = 0.15 + Math.random() * 0.35, f = 0.25 + Math.random() * 0.5;
        let lp = 0;
        for (let i = 0; i < dur; i++) {
          const n = Math.random() * 2 - 1;
          lp += f * (n - lp);                       // crude band limit per clap
          a[t0 + i] += (n - lp) * amp * Math.exp(-i / (dur * 0.25));
        }
      }
    }
    this._murmur = null;
  }

  // ── Crowd ─────────────────────────────────────────────────────────
  // A cheering crowd: a roaring noise bed, a handful of individual "whoo!"
  // voices (sawtooth through vowel formants, pitch sweeping up) and claps.
  crowdCheer(amount = 1, at = 0) {
    const ctx = this.ctx, t = Math.max(ctx.currentTime, at);
    const bed = this._noise(t, 1.2 + 1.6 * amount, 'bandpass', 1100, 0.45, 0.32 * amount, 0.12);
    bed.frequency.linearRampToValueAtTime(1500, t + 0.8);
    const voices = Math.round(5 + 7 * amount);
    for (let i = 0; i < voices; i++) this._whoo(t + Math.random() * 0.45, 0.022 + 0.02 * amount, Math.random() < 0.6);
    this.applause(0.6 + 0.5 * amount, 1.5 + 1.5 * amount, t + 0.1);
  }

  // The crowd going "ooooh!" (a taunt lands, a big call-out).
  crowdOoh(amount = 1, at = 0) {
    const ctx = this.ctx, t = Math.max(ctx.currentTime, at);
    const n = Math.round(6 + 6 * amount);
    for (let i = 0; i < n; i++) {
      const tt = t + Math.random() * 0.12;
      const f0 = 170 + Math.random() * 170;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, tt);
      o.frequency.linearRampToValueAtTime(f0 * 1.25, tt + 0.35);
      o.frequency.linearRampToValueAtTime(f0 * 0.85, tt + 1.5);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520 + Math.random() * 160; f.Q.value = 3;
      o.connect(f);
      this._env(f, tt, 0.18, 0.065 * amount, 1.3 + Math.random() * 0.5);
      o.start(tt); o.stop(tt + 2.2);
    }
    this._noise(t, 1.5, 'bandpass', 600, 0.8, 0.2 * amount, 0.2);
  }

  applause(amount = 1, dur = 2.5, at = 0) {
    const ctx = this.ctx, t = Math.max(ctx.currentTime, at);
    const src = ctx.createBufferSource();
    src.buffer = this.applauseBuf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * amount, t + 0.25);
    g.gain.setValueAtTime(0.5 * amount, t + Math.max(0.3, dur - 0.9));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g); g.connect(this.out);
    src.start(t, Math.random() * 2);
    src.stop(t + dur + 0.05);
  }

  _whoo(t, peak, high) {
    const ctx = this.ctx;
    const f0 = (high ? 380 : 230) + Math.random() * 160;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * (1.35 + Math.random() * 0.3), t + 0.25);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.1, t + 1.1);
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5 + Math.random() * 2; vg.gain.value = f0 * 0.03;
    vib.connect(vg); vg.connect(o.frequency);
    const mix = ctx.createGain();
    for (const [fc, q, g] of [[high ? 500 : 420, 5, 1], [high ? 1100 : 900, 6, 0.6]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = q;
      const bg = ctx.createGain(); bg.gain.value = g;
      o.connect(bp); bp.connect(bg); bg.connect(mix);
    }
    const dur = 0.8 + Math.random() * 0.7;
    this._env(mix, t, 0.07, peak * 6, dur);
    o.start(t); vib.start(t);
    o.stop(t + dur + 0.2); vib.stop(t + dur + 0.2);
  }

  // Ambient crowd murmur under the whole battle; hype() swells it.
  murmur(on) {
    const ctx = this.ctx;
    if (on && !this._murmur) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.6;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.8);
      src.connect(bp); bp.connect(g); g.connect(this.out);
      src.start();
      this._murmur = { src, g };
    } else if (!on && this._murmur) {
      const { src, g } = this._murmur;
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
      try { src.stop(ctx.currentTime + 1.5); } catch {}
      this._murmur = null;
    }
  }

  hype(k) {
    if (this._murmur) this._murmur.g.gain.setTargetAtTime(0.04 + 0.06 * Math.max(0, Math.min(1, k)), this.ctx.currentTime, 0.6);
  }

  _env(node, t, a, peak, decay) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
    node.connect(g);
    g.connect(this.out);
    return g;
  }

  _noise(t, dur, filterType, freq, q, peak, attack = 0.002) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    src.connect(f);
    this._env(f, t, attack, peak, dur);
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + dur + 0.05);
    return f;
  }

  _tone(t, type, f0, f1, dur, peak) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(o, t, 0.004, peak, dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  hit(judgment) {
    const t = this.ctx.currentTime;
    if (judgment === 'miss') { this._tone(t, 'triangle', 160, 70, 0.18, 0.25); return; }
    const pitch = { perfect: 2400, great: 1900, good: 1500 }[judgment] || 1500;
    this._noise(t, 0.05, 'bandpass', pitch * 2, 2, 0.35);
    this._tone(t, 'sine', pitch, pitch * 0.5, 0.07, judgment === 'perfect' ? 0.22 : 0.14);
  }

  groove() {
    const t = this.ctx.currentTime;
    this._tone(t, 'square', 660, 990, 0.12, 0.08);
    this._noise(t, 0.12, 'highpass', 5000, 0.7, 0.18);
  }

  // A direction entered: a short blip that climbs with each step of the
  // sequence; a wrong one buzzes.
  dir(index, ok) {
    const t = this.ctx.currentTime;
    if (!ok) { this._tone(t, 'square', 180, 120, 0.12, 0.06); return; }
    const f = 700 * Math.pow(2, Math.min(index, 8) / 12 * 2);
    this._tone(t, 'triangle', f, f * 1.02, 0.06, 0.12);
  }

  // Count-in blip scheduled on the audio clock (sample-accurate on the beat).
  count(atTime, last = false) {
    const t = Math.max(this.ctx.currentTime, atTime);
    this._tone(t, 'square', last ? 1320 : 880, null, 0.09, 0.09);
    this._noise(t, 0.04, 'highpass', 6000, 0.7, 0.12);
  }

  taunt() {
    const t = this.ctx.currentTime;
    this._tone(t, 'sawtooth', 440, 880, 0.18, 0.12);
    this._tone(t + 0.12, 'sawtooth', 660, 1320, 0.22, 0.12);
  }

  crowd(amount = 1) { this.crowdCheer(amount); }

  whoosh(dur = 1.2, up = true) {
    const t = this.ctx.currentTime;
    const f = this._noise(t, dur, 'bandpass', up ? 300 : 3000, 1.2, 0.45, dur * 0.6);
    f.frequency.exponentialRampToValueAtTime(up ? 4000 : 250, t + dur);
  }

  riser(dur = 1.2) {
    const t = this.ctx.currentTime;
    this._tone(t, 'sawtooth', 120, 960, dur, 0.06);
    const f = this._noise(t, dur, 'highpass', 400, 0.8, 0.12, dur * 0.8);
    f.frequency.exponentialRampToValueAtTime(8000, t + dur);
  }

  impact(atTime) {
    const t = atTime || this.ctx.currentTime;
    this._tone(t, 'sine', 140, 38, 0.6, 0.6);
    this._noise(t, 0.4, 'lowpass', 1800, 0.7, 0.4);
  }

  dispose() { this.murmur(false); try { this.out.disconnect(); } catch {} }
}
