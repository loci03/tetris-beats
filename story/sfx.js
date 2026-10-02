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

  crowd(amount = 1) {
    const t = this.ctx.currentTime;
    const f = this._noise(t, 1.4 * amount, 'bandpass', 900, 0.6, 0.35 * amount, 0.25);
    f.frequency.linearRampToValueAtTime(1400, t + 1.2);
  }

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

  dispose() { try { this.out.disconnect(); } catch {} }
}
