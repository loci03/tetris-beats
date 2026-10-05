// BattleSession — one trip into the world: transition in, intro, the
// ~60 s rhythm battle, the result moment, and the transition back. It wires
// the pure systems together:
//
//   MusicClock ──► RhythmBattle ──events──► DanceControllers (dancers)
//        │                         ├──────► CameraDirector
//        │                         ├──────► World (stage reactions)
//        │                         ├──────► BattleHUD / StorySfx / voices
//        └──► everything reads song time; nothing runs on animation time.

import * as THREE from '../vendor/three/three.module.min.js';
import { MusicClock } from './music-clock.js';
import { RhythmBattle } from './rhythm-battle.js';
import { createCharacter, CHARACTERS } from './characters.js';
import { DanceController, MOVE_LABELS } from './dance.js';
import { CameraDirector } from './camera.js';
import { BoardTransition, cameraAlongPath, START_POSE } from './transition.js';
import { BattleHUD } from './hud.js';
import { StorySfx } from './sfx.js';
import { AnimeFx } from './anime-fx.js';
import { Announcer } from './announcer.js';
import { buildTacoWorld } from './worlds/taco-world.js';
import { battleMusic } from './levels.js';

const IN_DUR = 2.35;      // seconds, board → world
const DROP_AT = 1.3;      // the music drop lands as the camera passes the board
const OUT_DUR = 2.4;      // seconds, world → board

const KEY_DIRS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D' };

export class BattleSession {
  // `standalone`: Bust a Beat — the battle on its own, no Tetris board to
  // fly through; it fades in on the stage and ends on the result screen.
  // `buildWorld`: the level's stage builder (from loadLevel()).
  constructor({ bridge, level, specialCells, impactRow, onDone, standalone = false, onPause = null, buildWorld = null }) {
    this.bridge = bridge;
    this.level = level;
    this.onDone = onDone;
    this.standalone = standalone;
    this.onPause = onPause;
    // Song grid + this mode's section (story drop vs full-song Bust a Beat).
    this.mcfg = battleMusic(level, standalone);
    this.phase = 'init';       // battle phase: init → intro → battle → result → out → done
    this.trans = null;         // camera transition running: 'in' | 'out' | null
    this.paused = false;
    this.cuts = [];            // camera cuts waiting for their bar
    this.cues = [];            // HUD cues waiting for their beat
    this._voiceAt = 0;
    const st = bridge.settings();
    this.low = st.lowGraphics;
    this.motion = st.motion;

    // ── Renderer / scene ──
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'story-stage';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.low, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.low ? 1 : 1.5));
    this.renderer.setClearColor(0x000000, 0);
    document.body.appendChild(this.canvas);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x2a0f3a, 22, 70);
    this.camera = new THREE.PerspectiveCamera(START_POSE.fov, 1, 0.1, 220);
    this.camera.position.copy(START_POSE.pos);
    this.scene.add(this.camera);

    this.world = (buildWorld || buildTacoWorld)({ lowGraphics: this.low });
    this.scene.add(this.world.group);
    this.world.setLightLevel(0);

    // ── Dancers ──
    const pDef = CHARACTERS[level.dancers.player], rDef = CHARACTERS[level.dancers.rival];
    this.pRig = createCharacter(pDef);
    this.rRig = createCharacter(rDef);
    this.pRig.root.position.copy(this.world.anchors.player);
    this.rRig.root.position.copy(this.world.anchors.rival);
    this.pRig.baseYaw = 0.32;
    this.rRig.baseYaw = -0.32;
    this.scene.add(this.pRig.root, this.rRig.root);
    const bounceRate = this.mcfg.bounce || 1;
    const spb = 60 / this.mcfg.bpm;
    this.pDance = new DanceController(this.pRig, { ...pDef.style, bounceRate, spb }, +1);
    this.rDance = new DanceController(this.rRig, { ...rDef.style, bounceRate, spb }, -1);
    this.pDef = pDef; this.rDef = rDef;
    this.fx = new AnimeFx(this.scene);
    this.director = new CameraDirector(this.camera, this.world.anchors);
    this.director.motion = this.motion;

    // ── Board transition ──
    this.transition = null;
    if (!standalone) {
      this.transition = new BoardTransition({
        canvas: bridge.getBoardCanvas(), cols: 10, rows: 20, specialCells, impactRow,
      });
      this.transition.attach(this.scene, this.camera);
    }

    // ── Audio + rules ──
    this.audio = bridge.audio;
    this.ctx = this.audio.ctx;
    this.clock = new MusicClock(this.ctx, this.mcfg);
    this.clock.userOffsetMs = st.rhythmOffsetMs;
    this.sfx = new StorySfx(this.ctx, this.audio.masterGain);
    // The battle music runs through its own gain so the announcer can duck it.
    this.duckGain = this.ctx.createGain();
    this.duckGain.connect(this.audio.trackGain);
    this.ann = new Announcer(this.ctx, this.audio.masterGain, this.duckGain, { enabled: bridge.voiceEnabled !== false });
    const profile = level.ai[st.difficulty] || level.ai.medium;
    this.battle = new RhythmBattle({ clock: this.clock, music: this.mcfg, seed: level.chart.seed + (Date.now() % 997), aiProfile: profile });
    this.battle.on((type, data) => this._onBattle(type, data));

    this.hud = new BattleHUD({
      names: { player: pDef.name, rival: rDef.name },
      isTouch: bridge.isTouch,
      onPad: (kind, dir, ts) => this._input(kind, dir, ts ?? performance.now()),
      onPause: () => { if (this.phase === 'done' || this.phase === 'dead') return; if (this.standalone) { if (this.onPause) this.onPause(); } else this.bridge.togglePause(); },
    });

    this._onKey = (e) => this._key(e);
    this._onResize = () => this._resize();
    window.addEventListener('keydown', this._onKey, true);
    window.addEventListener('resize', this._onResize);
    this._resize();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────
  async start() {
    const m = this.mcfg;
    const buffer = this.audio._trackBuffers[m.track] || await this.audio._loadTrack(m.track);
    if (!buffer) throw new Error('battle track unavailable: ' + m.track);
    // Lock the grid phase to the drums in this browser's decode of the song,
    // and find the drum hits the dancers will hit.
    const from = this.clock.barTime(m.battleStartBar - m.introBars);
    const to = Math.min(buffer.duration, this.clock.barTime(m.battleStartBar + m.battleBars + m.resultBars) + 3);
    this.clock.alignPhase(buffer, from, to);
    this.clock.analyzeAccents(buffer, from, to);

    if (this.standalone) return this._startStandalone(buffer);

    // Warm up shaders before the first visible frame.
    this.transition.layout(this._boardRect(), window.innerWidth, window.innerHeight);
    this.transition.updateIn(0);
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);

    document.body.classList.add('story-dim');
    this.canvas.classList.add('on');
    this.bridge.setHide2D(true);

    // Music: filter-sweep the Tetris track down, riser, then drop the battle
    // section in exactly as the camera passes through the board.
    const ctx = this.ctx, now = ctx.currentTime;
    this.dropTime = now + DROP_AT;
    this._insertFilter();
    this.filter.frequency.setValueAtTime(18000, now);
    this.filter.frequency.exponentialRampToValueAtTime(420, this.dropTime - 0.05);
    this.filter.frequency.setValueAtTime(20000, this.dropTime);
    this.sfx.riser(DROP_AT);
    this.sfx.whoosh(DROP_AT + 0.3, true);
    this.sfx.impact(this.dropTime);
    const old = this.audio._trackSource;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0.0001, this.dropTime + 0.05);
      try { old.node.stop(this.dropTime + 0.1); } catch {}
      this.audio._trackSource = null;
      this.audio._trackName = null;
    }
    this.music = this.clock.play(buffer, this.duckGain, this._songOffset(), this.dropTime, 0.01);
    this.sfx.murmur(true);

    this.trans = 'in';
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));
  }

  // Where the song starts: the top of the track when the intro is bar 0
  // (Bust a Beat plays the whole song), else the intro bar's downbeat.
  _songOffset() {
    const introStart = this.mcfg.battleStartBar - this.mcfg.introBars;
    return introStart <= 0 ? 0 : this.clock.barTime(introStart);
  }

  // Bust a Beat: no board transition — open on the two-shot as the lights
  // come up and the song comes in on the intro bar.
  _startStandalone(buffer) {
    const m = this.mcfg;
    const f = this.director.framing();
    this.camera.position.copy(f.pos); this.camera.fov = f.fov; this.camera.lookAt(f.look);
    this.camera.updateProjectionMatrix();
    this.director.snapTo(f.pos, f.look, f.fov);
    this.world.setLightLevel(1);
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    document.body.classList.add('story-dim');
    this.canvas.classList.add('on');
    this.bridge.setHide2D(true);
    const ctx = this.ctx, now = ctx.currentTime;
    this.dropTime = now + 0.5;
    const old = this.audio._trackSource;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      try { old.node.stop(now + 0.35); } catch {}
      this.audio._trackSource = null;
      this.audio._trackName = null;
    }
    this.sfx.whoosh(0.5, true);
    this.sfx.impact(this.dropTime);
    this.music = this.clock.play(buffer, this.duckGain, this._songOffset(), this.dropTime, 0.05);
    this.sfx.murmur(true);
    this.trans = null;
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));
  }

  // Bust a Beat ends here: the music fades out under the result screen
  // while the dancers keep celebrating / sulking.
  _finishStandalone() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.hud.show(false);
    const g = this.music && this.music.gain.gain, t = this.ctx.currentTime;
    if (g) {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0.0001, t + 2.5);
      try { this.music.node.stop(t + 2.6); } catch {}
    }
    this.onDone({ summary: this.summary, bonus: this.bonus || 0 });
  }

  setPaused(p) {
    this.paused = !!p;
    try { p ? this.ctx.suspend() : this.ctx.resume(); } catch {}
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._onKey, true);
    window.removeEventListener('resize', this._onResize);
    this._removeFilter();
    this.hud.destroy();
    this.sfx.dispose();
    if (this.transition) this.transition.dispose();
    this.fx.dispose();
    this.ann.dispose();
    if (this.standalone) { try { this.duckGain.disconnect(); } catch {} }
    this.world.dispose();
    this.pRig.dispose(); this.rRig.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();   // browsers cap live WebGL contexts
    this.canvas.remove();
    document.body.classList.remove('story-dim');
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.phase = 'dead';
  }

  // Tear-down that also stops the battle music (quit / restart mid-battle).
  abort() {
    if (this.music && (this.phase !== 'done' || this.standalone)) {
      try { this.music.node.stop(); } catch {}
    }
    this.destroy();
  }

  // ── Audio routing ─────────────────────────────────────────────────
  _insertFilter() {
    const a = this.audio;
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 6;
    a.trackGain.disconnect();
    a.trackGain.connect(this.filter);
    this.filter.connect(a.masterGain);
    if (a.analyser) a.trackGain.connect(a.analyser);
  }
  _removeFilter() {
    const a = this.audio;
    if (!this.filter) return;
    try {
      a.trackGain.disconnect();
      a.trackGain.connect(a.masterGain);
      if (a.analyser) a.trackGain.connect(a.analyser);
      this.filter.disconnect();
    } catch {}
    this.filter = null;
  }

  // ── Input ─────────────────────────────────────────────────────────
  _key(e) {
    if (this.phase === 'dead' || this.phase === 'done') return;
    if (this.bridge.uiBlocking()) return;      // settings panel etc.
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'Escape' || k === 'p') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) { if (this.standalone) { if (this.onPause) this.onPause(); } else this.bridge.togglePause(); }
      return;
    }
    if (this.paused) return;
    let kind = null, dir = null;
    if (KEY_DIRS[k]) { kind = 'arrow'; dir = KEY_DIRS[k]; }
    else if (k === ' ' || k === 'Enter') kind = 'groove';
    else if (k === 't' || k === 'Shift') kind = 'taunt';
    else if (k === 'm') { return; }  // let the global mute shortcut through
    if (!kind) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return;
    this._input(kind, dir, e.timeStamp);
  }

  _input(kind, dir, ts) {
    if (this.paused || (this.phase !== 'battle' && this.phase !== 'intro')) return;
    this.battle.input(kind, dir, ts);
  }

  // ── Battle events → dancers / camera / stage / HUD / audio ────────
  _dc(who) { return who === 'player' ? this.pDance : this.rDance; }
  // Anime marks over a dancer's head.
  _fx(who, kind, n) {
    if (!kind) return;
    const rig = who === 'player' ? this.pRig : this.rRig;
    this._fxPos = this._fxPos || new THREE.Vector3();
    this._fxPos.copy(rig.root.position);
    this._fxPos.y += 2.05 * rig.def.scale;
    this.fx.burst(kind, this._fxPos, n);
  }
  _def(who) { return who === 'player' ? this.pDef : this.rDef; }
  // Each dancer's taunt: their own move, the marks they throw across, and
  // how it messes with the victim's HUD (see BattleHUD.disrupt).
  _taunt(who) {
    const def = this._def(who), t = def.tauntFx || {};
    return { move: def.taunt || 'taunt', projectile: t.projectile || (def.fx || {}).taunt || 'note', disrupt: t.disrupt || 'shake', color: t.color, n: t.n || 7 };
  }
  _throw(from, kind, n) {
    const a = from === 'player' ? this.pRig : this.rRig, b = from === 'player' ? this.rRig : this.pRig;
    const p0 = a.root.position.clone(), p1 = b.root.position.clone();
    p0.y += 1.5 * a.def.scale; p1.y += 1.45 * b.def.scale;
    this.fx.throw(kind, p0, p1, n);
  }

  _schedule(who, name, startBeat, len, own = true) {
    const dc = this._dc(who);
    if (own) dc.queue = dc.queue.filter(q => !(q.start === startBeat && q.reaction));
    else if (dc.queue.some(q => q.start === startBeat && !q.reaction)) return;
    dc.play(name, startBeat, len, { faceFoe: name === 'taunt' }).reaction = !own;
  }

  // Character voice lines: only a boss with a recorded voice pack speaks;
  // the player's side is covered by the announcer. Never over the announcer.
  _voice(who, pool, chance = 1) {
    if (!this.bridge.voiceEnabled || Math.random() > chance) return;
    if (who !== 'rival' || !this.rDef.voicePack) return;
    if (this.ctx.currentTime < this.ann.busyUntil + 0.3) return;
    const now = performance.now();
    if (now - this._voiceAt < 2200) return;
    this._voiceAt = now;
    const v = who === 'player' ? this.bridge.voices.player : this.bridge.voices.rival;
    try { v.speakOneOf(pool); } catch {}
  }

  // AudioContext time of a song beat (for sample-accurate voice / crowd).
  _at(beat) { return this.clock.songToCtx(this.clock.beatTime(beat)); }

  _onBattle(type, d) {
    const beatNow = this.clock.beatAt(this.battle.songTime);
    const rivalName = this.rDef.name;
    switch (type) {
      case 'barStart': {
        const m = this.mcfg;
        const i = d.bar - (m.battleStartBar - m.introBars);   // intro bar index (0..introBars-1)
        const B = d.bar * 4;
        if (i === 0) {
          // INTRO — both dancers make their entrance, wide shot.
          this.phase = 'intro';
          this.hud.show(true);
          this.hud.showBanner(`${this.level.title}<small>DANCE BATTLE vs ${rivalName}</small>`, 'big', 2200);
          this.pDance.play('entrance', B, 4); this.rDance.play('entrance', B, 4);
          this.director.cut('two', B, 4);
          this.sfx.crowdCheer(1, this._at(B));
        } else if (i === 1) {
          // The rival calls the player out: point, smirk, spin, signature pose.
          this.rDance.play(this.rDef.introTaunt || 'introTaunt', B, 4, { faceFoe: true });
          this.pDance.play('introWatch', B, 4);
          this.director.cut('close', B, 4, { who: 'rival' });
          this.ann.say('vs-' + this.level.dancers.rival, this._at(B + 0.5), { force: true });
          this.sfx.crowdOoh(0.8, this._at(B + 1.5));
          this.cues.push({ beat: B + 2.5, fn: () => this._voice('rival', 'single') });
          this.cues.push({ beat: B + 1, fn: () => this._fx('rival', this.rDef.fx && this.rDef.fx.taunt, 5) });
        } else if (i === 2) {
          // The player answers: head shake, two bounces, "come on".
          this.pDance.play('introAnswer', B, 4, { faceFoe: true });
          this.rDance.play('introWatch', B, 4);
          this.director.cut('close', B, 4, { who: 'player' });
          this._fx('player', 'anger', 1);
          this.sfx.crowdCheer(0.6, this._at(B + 3));
          this.cues.push({ beat: B + 3, fn: () => this._fx('player', 'note', 4) });
          if (this.bridge.isTouch) this.hud.showCallout('<b>SWIPE</b> the arrows any time · <b>TAP</b> on beat 4', '', 4000);
          else this.hud.showCallout('Enter the <b>arrows</b> any time · <b>SPACE</b> on beat 4', '', 4000);
        } else if (i === 3) {
          // READY + count-in: 3 — 2 — 1 — GROOVE, on the beat.
          this.pDance.play('ready', B, 4); this.rDance.play('ready', B, 4);
          this.director.cut('two', B, 4);
          this.hud.showBanner('READY?', '', this.clock.spb * 1000 * 0.9);
          // "Ready?" — count-in blips on 3-2-1 — "DANCE!" landing on the
          // downbeat, fighting-game style.
          this.ann.say('ready', this._at(B), { force: true });
          ['3', '2', '1'].forEach((n, k) => {
            const beat = B + 1 + k;
            this.sfx.count(this._at(beat));
            this.cues.push({ beat, fn: () => this.hud.showBanner(n, 'count', this.clock.spb * 900) });
          });
          const go = this._at(m.battleStartBar * 4);
          if (this.ann.enabled) this.ann.say('go', go, { force: true }); else this.sfx.count(go, true);
          this.sfx.crowdCheer(1.2, go);
        }
        if (d.bar === m.battleStartBar) {
          this.phase = 'battle';
          this.hud.showBanner('DANCE!', 'go', 900);
          this.world.react('drop', {});
        }
        const cut = this.cuts.filter(c => c.bar === d.bar);
        for (const c of cut) this.director.cut(c.kind, d.bar * 4, c.len, { who: c.who });
        this.cuts = this.cuts.filter(c => c.bar !== d.bar);
        break;
      }
      case 'dir':
        this.sfx.dir(this._dirCount = d.ok ? (this._dirCount || 0) + 1 : 0, d.ok);
        this.hud.dirFeedback(d.ok);
        if (d.complete) this._dirCount = 0;
        break;
      case 'judge':
        if (d.who === 'player') {
          this.hud.judge(d.judgment, d.delta, d.reason);
          if (d.note.kind === 'groove' && d.judgment !== 'miss') { this.sfx.groove(); this.sfx.hit(d.judgment); }
          else this.sfx.hit(d.judgment);
          if (d.combo && d.combo % 8 === 0) this.sfx.crowdCheer(0.8);
        } else if (d.note.kind !== 'dodge' && d.note.kind !== 'taunt') {
          this.hud.rivalJudgment(d.judgment);
        }
        break;
      case 'move': {
        const def = this._def(d.who);
        let name;
        if (d.kind === 'solo') name = def.solo;
        else if (d.kind === 'branch') name = def.branchMoves[d.tier];
        if (!name) { const list = def.moves[d.tier] || ['twoStep']; name = list[d.bar % list.length]; }
        const inSolo = this._soloUntil && d.bar < this._soloUntil;
        if (!d.soloTime && !inSolo) this._schedule(d.who, name, d.bar * 4, 4, true);
        const foe = d.who === 'player' ? 'rival' : 'player';
        const big = d.kind !== 'std' || d.tier >= 4;
        if (d.soloTime) {
          // Solo Time stages itself (soloStart).
        } else if (big) {
          this._schedule(foe, 'reactOoh', d.bar * 4, 2, false);
          this.cuts.push({ bar: d.bar, kind: 'orbit', who: d.who, len: 4 });
        } else if (d.tier >= 3) {
          this.cuts.push({ bar: d.bar, kind: 'close', who: d.who, len: 3 });
        }
        const fxKind = name === 'kissBlow' || name === 'heartHands' ? 'heart' : (def.fx && def.fx.move);
        this.cues.push({ beat: d.bar * 4, fn: () => { this._fx(d.who, fxKind, big ? 8 : 4); if (big) this._fx(d.who, 'sparkle', 8); } });
        this.cues.sort((a, b) => a.beat - b.beat);
        const power = d.kind === 'solo' ? 5 : d.kind === 'branch' ? Math.min(5, d.tier + 1) : d.tier;
        this.world.react('move', { ...d, tier: power, songTime: this.clock.barTime(d.bar) });
        if (d.who === 'player') {
          const label = (d.kind === 'solo' ? '★★ ' : d.kind === 'branch' ? '★ ' : '') + (MOVE_LABELS[name] || 'GROOVE');
          this.hud.showCallout(`${label} · ${d.judgment.toUpperCase()} <b>+${d.bonus}</b>`, d.perfect || big ? 'good' : '', 1400);
          // The host only calls the first ★ branch of the battle ("Fever!");
          // the solo gets its own call when Solo Time starts.
          if (d.kind === 'branch' && !this._feverCalled) { this._feverCalled = true; this.ann.say('fever', this._at(d.bar * 4)); }
        } else if (big) {
          this._voice('rival', 'combo', 0.5);
        }
        if (big) {
          if (d.who === 'player') this.sfx.crowdCheer(d.kind === 'solo' ? 1.4 : 1, this._at(d.bar * 4));
          else this.sfx.crowdOoh(0.7, this._at(d.bar * 4));
        } else if (d.tier >= 3 && d.who === 'player') {
          this.sfx.crowdCheer(0.45, this._at(d.bar * 4));
        }
        break;
      }
      case 'fumble':
        this._dc(d.who).react('fumble', beatNow, 1.6);
        this._fx(d.who, 'sweat', 1);
        if (d.who === 'player') this._voice('rival', 'single', 0.3);
        break;
      case 'hypeFull':
        if (d.who === 'player') {
          this.hud.showCallout(this.bridge.isTouch ? 'HYPE FULL — tap <b>TAUNT</b>!' : 'HYPE FULL — press <b>T</b> to TAUNT!', 'taunt', 2200);
          this.sfx.taunt();
        }
        break;
      case 'tauntQueued':
        if (d.attacker === 'rival') {
          this.hud.showCallout(`${rivalName} IS WINDING UP A TAUNT — hit <b>DODGE</b> on the red note!`, 'warn', 2600);
          this._voice('rival', 'triple');
        } else {
          this.hud.showCallout(this.bridge.isTouch ? 'Hit <b>TAUNT</b> on the purple note!' : 'Hit <b>T</b> on the purple note!', 'taunt', 2200);
        }
        break;
      case 'taunt': {
        const tt = this._taunt(d.attacker);
        this._dc(d.attacker).react(tt.move, beatNow, 4 - (beatNow % 4) + 0.001, { faceFoe: true, fade: 0.15 });
        this.cues.push({ beat: beatNow + 0.75, fn: () => this._throw(d.attacker, tt.projectile, tt.n) });
        this.cues.sort((a, b) => a.beat - b.beat);
        this._fx(d.attacker, (this._def(d.attacker).fx || {}).taunt, 5);
        this._fx(d.attacker === 'player' ? 'rival' : 'player', 'anger', 1);
        this.sfx.crowdOoh(0.5);
        this.director.cut('taunt', beatNow, 3, { who: d.attacker });
        this.sfx.taunt();
        this.world.react('taunt', d);
        break;
      }
      case 'tauntWhiff':
        this._dc(d.attacker).react('whiff', beatNow, 2);
        if (d.attacker === 'player') this.hud.showCallout('TAUNT WHIFFED', 'bad', 1200);
        else this.hud.showCallout(`${rivalName} WHIFFED THE TAUNT`, 'good', 1200);
        break;
      case 'dodge':
        this._dc(d.who).react('dodge', beatNow, 2);
        this._fx(d.who, 'sparkle', 5); this._fx(d.attacker, 'sweat', 1);
        this._dc(d.attacker).react('whiff', beatNow + 0.2, 2);
        this.hud.showBanner(d.who === 'player' ? 'DODGED!' : `${rivalName} DODGED`, d.who === 'player' ? 'good' : 'bad', 1100);
        this.world.react('dodge', d);
        this.sfx.crowdCheer(0.8);
        if (d.who === 'player') this._voice('player', 'single');
        break;
      case 'tauntLanded':
        this._dc(d.defender).react('hitReact', beatNow, 1);
        this._fx(d.defender, 'exclaim', 1); this._fx(d.defender, 'sweat', 2);
        this._schedule(d.defender, 'stunned', d.stunBar * 4, 4, true);
        this._schedule(d.attacker, 'cheer', Math.ceil(beatNow + 0.5), 2, false);
        this.hud.showBanner(d.defender === 'player' ? 'STUNNED!' : `${rivalName} STUNNED!`, d.defender === 'player' ? 'bad' : 'good', 1300);
        if (d.defender === 'player') {
          const tt = this._taunt(d.attacker);
          this.hud.disrupt(tt.disrupt, { sprite: tt.projectile, color: tt.color, ms: this.clock.spb * 1000 * (4 * (d.stunBar + 1) - beatNow) });
        }
        this.director.cut('close', beatNow, 2, { who: d.attacker });
        this.world.react('tauntLanded', d);
        this.sfx.crowdOoh(1.1);
        this._voice(d.attacker, 'tetris');
        break;
      case 'tauntNotReady':
        this.hud.showCallout(`Fill your HYPE to taunt (${Math.floor(d.hype)}%)`, '', 900);
        break;
      case 'tauntBlocked':
        this.hud.showCallout('Can\'t taunt right now', '', 800);
        break;
      case 'bar':
        this.sfx.hype(0.3 + Math.abs(d.groove) * 0.7);
        break;
      case 'soloStart': {
        // SOLO TIME — the stage is theirs for two bars: solo, then encore,
        // the camera circles them, the lights close in, the rival watches.
        const who = d.who, foe = who === 'player' ? 'rival' : 'player';
        const def = this._def(who), B = d.bar * 4, len = d.bars * 4;
        this._soloUntil = d.bar + d.bars;
        this._dc(who).queue = []; this._dc(foe).queue = [];
        this._schedule(who, def.solo, B, 4, true);
        this._schedule(who, def.branchMoves[4] || def.solo, B + 4, len - 4, true);
        this._schedule(foe, 'soloWatch', B, len, true);
        this.cuts = this.cuts.filter(c => c.bar < d.bar || c.bar >= d.bar + d.bars);
        this.cuts.push({ bar: d.bar, kind: 'solo', who, len });
        this.world.react('solo', { who, songTime: this.clock.barTime(d.bar), until: this.clock.barTime(d.bar + d.bars) });
        this.ann.say('solo', this._at(B), { force: true });
        this.sfx.crowdCheer(1.3, this._at(B));
        this.sfx.crowdCheer(0.9, this._at(B + 4));
        this.cues.push({ beat: B, fn: () => {
          this.hud.showBanner(who === 'player' ? 'SOLO TIME!' : `${this.rDef.name}'S SOLO!`, 'big', 1600);
          this._fx(who, 'sparkle', 12); this._fx(who, (def.fx || {}).move, 8);
        } });
        this.cues.push({ beat: B + 4, fn: () => this._fx(who, (def.fx || {}).move, 8) });
        this.cues.sort((a, b) => a.beat - b.beat);
        break;
      }
      case 'soloEnd':
        this.sfx.crowdCheer(1.4);
        this.sfx.applause(1, 3);
        this._fx(d.who, 'sparkle', 10);
        if (d.who === 'player') this.hud.showCallout('SOLO TIME <b>+5000</b>', 'good', 1500);
        break;
      case 'end':
        this._result(d);
        break;
    }
  }

  _result(summary) {
    this.phase = 'result';
    this.summary = summary;
    const m = this.mcfg;
    const r = this.level.rewards;
    const win = summary.winner === 'player';
    this.bonus = Math.round(summary.player.score * r.battleScoreShare) + (win ? r.win : r.lose);
    const bar = this.battle.endBar;
    const len = m.resultBars * 4;
    this.pDance.clearQueue(); this.rDance.clearQueue();
    this.pDance.play(win ? (this.pDef.victory || 'victory') : 'defeat', bar * 4, len);
    this.rDance.play(win ? 'defeat' : (this.rDef.victory || 'victory'), bar * 4, len);
    this.director.cut('winner', bar * 4, len, { who: summary.winner });
    this.world.react('end', { who: summary.winner });
    const loser = win ? 'rival' : 'player';
    this._fx(summary.winner, 'sparkle', 12); this._fx(summary.winner, (this._def(summary.winner).fx || {}).move, 6);
    this._fx(loser, 'sweat', 2);
    this.sfx.crowdCheer(1.5);
    this.sfx.applause(1.2, 5);
    this.ann.say(win ? 'you-win' : this.level.dancers.rival + '-wins', this.ctx.currentTime + 0.4, { force: true });
    this.hud.showBanner(
      `${win ? 'YOU WIN!' : `${this.rDef.name} WINS`}<small>${summary.player.score.toLocaleString()} — ${summary.rival.score.toLocaleString()} · GROOVE BONUS +${this.bonus.toLocaleString()}</small>`,
      win ? 'big win' : 'big lose', len * this.clock.spb * 1000);
    if (!win) this.cues.push({ beat: this.clock.beatAt(this.battle.songTime) + 4, fn: () => this._voice('rival', 'tetris') });
    this.outAtSong = this.clock.barTime(bar + m.resultBars);
  }

  // ── Frame ─────────────────────────────────────────────────────────
  _frame(nowMs) {
    this._raf = requestAnimationFrame((t) => this._frame(t));
    const dt = Math.min(0.1, (nowMs - this._last) / 1000);
    this._last = nowMs;
    const songTime = this.clock.songTime(nowMs);
    const beat = this.clock.beatAt(songTime);
    const inWorld = this.ctx.currentTime >= this.dropTime - 0.02;

    if (inWorld) {
      this.battle.update(songTime);
      this.hud.update(this.battle, this.clock, songTime);
    }
    while (this.cues.length && beat >= this.cues[0].beat) this.cues.shift().fn();
    const beatForDance = inWorld ? beat : 0;
    const acc = inWorld && !this.paused ? this.clock.accents(songTime) : null;
    this.pDance.update(beatForDance, acc);
    this.rDance.update(beatForDance, acc);
    this.world.update(this.paused ? 0 : dt, { beat: beatForDance, songTime, leader: this.battle.groove });
    this.fx.update(this.paused ? 0 : dt);

    if (this.trans === 'in') {
      // Timed on the audio clock so the drop lands as the camera crosses
      // the board even when frames are slow (and it freezes on pause).
      const t = this.ctx.currentTime - (this.dropTime - DROP_AT);
      this.transition.updateIn(t);
      const u = Math.max(0, Math.min(1, (t - 0.55) / (IN_DUR - 0.55)));
      const f = this.director.framing();
      cameraAlongPath(this.camera, u, f.pos, f.look, f.fov);
      this.world.setLightLevel((t - 1.05) / 0.6);
      if (t >= IN_DUR) {
        this.transition.group.visible = false;
        this.transition.curtain.visible = false;
        const f = this.director.framing();
        this.director.snapTo(this.camera.position, f.look, f.fov);
        this.trans = null;
      }
    } else if (this.trans === 'out') {
      const t = songTime - this.outAtSong;
      const u = 1 - Math.max(0, Math.min(1, t / (OUT_DUR - 0.55)));
      cameraAlongPath(this.camera, u, this.outFrom.pos, this.outFrom.look, this.outFrom.fov);
      this.world.setLightLevel(1 - (t - 0.2) / 0.9);
      this.transition.updateOut(t, OUT_DUR);
      if (t >= OUT_DUR) this._finish();
    } else {
      this.director.update(dt, { beat, leader: this.battle.groove });
      if (this.phase === 'result' && songTime >= this.outAtSong) this.standalone ? this._finishStandalone() : this._startOut();
    }
    this.renderer.render(this.scene, this.camera);
  }

  _startOut() {
    this.phase = 'out';
    this.trans = 'out';
    this.outFrom = { pos: this.camera.position.clone(), look: this.director.look.clone(), fov: this.camera.fov };
    this.hud.show(false);
    this.bridge.normalizeSpecialCells();
    this.transition.recapture(this.bridge.renderCleanBoard());
    this.transition.layout(this._boardRect(), window.innerWidth, window.innerHeight);
    this.transition.group.visible = true;
    this.transition.curtain.visible = true;
    this.transition.updateOut(0, OUT_DUR);
    this.sfx.whoosh(OUT_DUR - 0.4, false);
  }

  _finish() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    // The song keeps playing: hand it to the Tetris level as its track.
    this._removeFilter();
    this.bridge.adoptMusic(this.music.node, this.music.gain, this.mcfg.track);
    this.onDone({ summary: this.summary, bonus: this.bonus || 0 });
  }

  // ── Layout ────────────────────────────────────────────────────────
  _boardRect() {
    const r = this.bridge.getBoardCanvas().getBoundingClientRect();
    // Content box (the canvas has a 1 px border).
    return { left: r.left + 1, top: r.top + 1, width: r.width - 2, height: r.height - 2 };
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.hud.resize();
    if (this.transition && (this.trans === 'in' || this.phase === 'init')) this.transition.layout(this._boardRect(), w, h);
  }
}
