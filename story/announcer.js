// Announcer — the versus-game host. Says little, shouts it big: "A new
// challenger… Tina!", "Ready?", "DANCE!", "Solo time!", "Fever!", "You win!".
// Lines are short MP3s (audio/voice/announcer/, generated with Kokoro TTS —
// Apache-2.0 — then pushed into a shouted delivery with an arena echo, see
// CREDITS.txt) decoded into the game's AudioContext, so they can be
// scheduled sample-accurately on the music clock. Music ducks under the voice.

// Per line: `accent` = seconds from the clip start to the stressed syllable
// (what lands on the beat), `dry` = length of the voice before the echo tail.
const LINES = {
  'vs-alfred': { accent: 0.15, dry: 1.6 }, 'vs-tina': { accent: 0.15, dry: 1.55 },
  'ready': { accent: 0.22, dry: 0.6 }, 'go': { accent: 0.03, dry: 0.65 },
  'solo': { accent: 0.31, dry: 0.95 }, 'fever': { accent: 0.17, dry: 0.63 },
  'you-win': { accent: 0.21, dry: 0.64 }, 'alfred-wins': { accent: 0.51, dry: 1.0 }, 'tina-wins': { accent: 0.13, dry: 0.88 },
};
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
    for (const n of Object.keys(LINES)) this._load(n);
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

  // Say `name` so its stressed syllable lands at AudioContext time `at`
  // (default: as soon as possible). Calls that would talk over the previous
  // line are dropped unless `force`.
  async say(name, at = 0, { force = false } = {}) {
    if (!this.enabled) return;
    const buf = await this._load(name);
    if (!buf || this.disposed) return;
    const info = LINES[name] || { accent: 0, dry: buf.duration };
    const t = Math.max(this.ctx.currentTime + 0.01, (at || 0) - info.accent);
    if (!force && t < this.busyUntil) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.out);
    src.start(t);
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
    this.busyUntil = t + info.dry;
    if (this.duck) {
      const g = this.duck.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(0.55, t, 0.02);
      g.setTargetAtTime(1, t + info.dry + 0.2, 0.25);
    }
  }

  dispose() {
    this.disposed = true;
    for (const s of this.sources) { try { s.stop(); } catch {} }
    try { this.out.disconnect(); } catch {}
  }
}
