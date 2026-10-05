// Announcer — the versus-arcade host. Says little, yells it big: "Here
// comes… Rhett Ryder!", "Ready?", "DANCE!", "Solo time!", "Fever!", and
// who wins. Lines are short MP3s (audio/voice/announcer/, generated with
// Kokoro TTS — Apache-2.0 — then pushed onto a hype contour with held
// vowels, rasp, doubling and an arena echo; see CREDITS.txt) decoded into
// the game's AudioContext so they're scheduled sample-accurately on the
// music clock. lines.json gives, per line, `accent` (seconds to the punch
// word — what lands on the beat) and `dry` (voice length before the echo).
// Music ducks under the voice.

const _cache = new Map();          // name → Promise<AudioBuffer|null>, shared across battles
let _manifest = null;              // Promise<{ name: { accent, dry } }>

export class Announcer {
  // `rival`: the boss id — preloads their "here comes" / "wins" lines.
  constructor(ctx, destination, duck, { enabled = true, rival = null } = {}) {
    this.ctx = ctx;
    this.duck = duck;               // GainNode to dip under the voice (music)
    this.enabled = enabled;
    this.out = ctx.createGain();
    this.out.gain.value = 1.15;
    this.out.connect(destination);
    this.base = new URL('../audio/voice/announcer/', import.meta.url).href;
    this.busyUntil = 0;
    this.sources = new Set();
    _manifest = _manifest || fetch(this.base + 'lines.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}));
    const lines = ['ready', 'go', 'solo', 'fever', 'you-win'];
    if (rival) lines.push('vs-' + rival, rival + '-wins');
    if (enabled) for (const n of lines) this._load(n);
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

  // Say `name` so its punch word lands at AudioContext time `at` (default:
  // as soon as possible). Calls that would talk over the previous line are
  // dropped unless `force`.
  async say(name, at = 0, { force = false } = {}) {
    if (!this.enabled) return;
    const [buf, man] = await Promise.all([this._load(name), _manifest]);
    if (!buf || this.disposed) return;
    const info = (man && man[name]) || { accent: 0, dry: Math.max(0.3, buf.duration - 1.7) };
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
      g.setTargetAtTime(0.5, t, 0.02);
      g.setTargetAtTime(1, t + info.dry + 0.2, 0.25);
    }
  }

  dispose() {
    this.disposed = true;
    for (const s of this.sources) { try { s.stop(); } catch {} }
    try { this.out.disconnect(); } catch {}
  }
}
