// Announcer — the game-show host. Says little, says it big: "Here comes…
// Tina!", "Are you ready?", "Let's go!", "Solo time!", "Fever!", "You win!".
// Lines are short MP3s (audio/voice/announcer/, generated with the Piper
// TTS LibriTTS voice — CC BY 4.0) decoded into the game's AudioContext, so
// they can be scheduled sample-accurately on the music clock (the count-in
// lands on the beat). Music ducks a little under the voice.

const LINES = ['vs-alfred', 'vs-tina', 'ready', 'go', 'solo', 'fever', 'you-win', 'alfred-wins', 'tina-wins'];
const _cache = new Map();          // name → Promise<AudioBuffer|null>, shared across battles

export class Announcer {
  constructor(ctx, destination, duck, { enabled = true } = {}) {
    this.ctx = ctx;
    this.duck = duck;               // GainNode to dip under the voice (music)
    this.enabled = enabled;
    this.out = ctx.createGain();
    this.out.gain.value = 1.15;
    this.out.connect(destination);
    this.base = new URL('../audio/voice/announcer/', import.meta.url).href;
    this.busyUntil = 0;
    this.sources = new Set();
    for (const n of LINES) this._load(n);
  }

  _load(name) {
    if (!_cache.has(name)) {
      _cache.set(name, fetch(this.base + name + '.mp3')
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then(ab => this.ctx.decodeAudioData(ab))
        .catch(() => null));
    }
    return _cache.get(name);
  }

  // Say `name` at AudioContext time `at` (default: now). Calls that would
  // talk over the previous line are dropped unless `force`.
  async say(name, at = 0, { force = false } = {}) {
    if (!this.enabled) return;
    const buf = await this._load(name);
    if (!buf || this.disposed) return;
    const t = Math.max(this.ctx.currentTime + 0.01, at || 0);
    if (!force && t < this.busyUntil) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.out);
    src.start(t);
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
    this.busyUntil = t + buf.duration - 0.1;
    if (this.duck) {
      const g = this.duck.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(0.72, t, 0.03);
      g.setTargetAtTime(1, t + buf.duration, 0.15);
    }
  }

  dispose() {
    this.disposed = true;
    for (const s of this.sources) { try { s.stop(); } catch {} }
    try { this.out.disconnect(); } catch {}
  }
}
