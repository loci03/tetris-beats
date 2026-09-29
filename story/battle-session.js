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
import { DanceController } from './dance.js';
import { CameraDirector } from './camera.js';
import { BoardTransition, cameraAlongPath, START_POSE } from './transition.js';
import { BattleHUD } from './hud.js';
import { StorySfx } from './sfx.js';
import { buildTacoWorld } from './worlds/taco-world.js';

const WORLDS = { taco: buildTacoWorld };

const IN_DUR = 2.35;      // seconds, board → world
const DROP_AT = 1.3;      // the music drop lands as the camera passes the board
const OUT_DUR = 2.4;      // seconds, world → board

const KEY_DIRS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D' };

export class BattleSession {
  constructor({ bridge, level, specialCells, impactRow, onDone }) {
    this.bridge = bridge;
    this.level = level;
    this.onDone = onDone;
    this.phase = 'init';       // battle phase: init → intro → battle → result → out → done
    this.trans = null;         // camera transition running: 'in' | 'out' | null
    this.paused = false;
    this.cuts = [];            // camera cuts waiting for their beat
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

    this.world = (WORLDS[level.world] || buildTacoWorld)({ lowGraphics: this.low });
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
    this.pDance = new DanceController(this.pRig, pDef.style, +1);
    this.rDance = new DanceController(this.rRig, rDef.style, -1);
    this.pDef = pDef; this.rDef = rDef;
    this.director = new CameraDirector(this.camera, this.world.anchors);
    this.director.motion = this.motion;

    // ── Board transition ──
    this.transition = new BoardTransition({
      canvas: bridge.getBoardCanvas(), cols: 10, rows: 20, specialCells, impactRow,
    });
    this.transition.attach(this.scene, this.camera);

    // ── Audio + rules ──
    this.audio = bridge.audio;
    this.ctx = this.audio.ctx;
    this.clock = new MusicClock(this.ctx, level.music);
    this.clock.userOffsetMs = st.rhythmOffsetMs;
    this.sfx = new StorySfx(this.ctx, this.audio.masterGain);
    const profile = level.ai[st.difficulty] || level.ai.medium;
    this.battle = new RhythmBattle({ clock: this.clock, music: level.music, seed: level.chart.seed + (Date.now() % 997), aiProfile: profile });
    this.battle.on((type, data) => this._onBattle(type, data));

    this.hud = new BattleHUD({
      names: { player: pDef.name, rival: rDef.name },
      isTouch: bridge.isTouch,
      onPad: (kind, dir) => this._input(kind, dir, performance.now()),
    });

    this._onKey = (e) => this._key(e);
    this._onResize = () => this._resize();
    window.addEventListener('keydown', this._onKey, true);
    window.addEventListener('resize', this._onResize);
    this._resize();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────
  async start() {
    const m = this.level.music;
    const buffer = this.audio._trackBuffers[m.track] || await this.audio._loadTrack(m.track);
    if (!buffer) throw new Error('battle track unavailable: ' + m.track);

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
    const offset = this.clock.barTime(m.battleStartBar - m.introBars);
    this.music = this.clock.play(buffer, this.audio.trackGain, offset, this.dropTime, 0.01);

    this.trans = 'in';
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));
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
    this.transition.dispose();
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
    if (this.music && this.phase !== 'done') {
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
      if (!e.repeat) this.bridge.togglePause();
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
  _def(who) { return who === 'player' ? this.pDef : this.rDef; }

  _schedule(who, name, startBeat, len, own = true) {
    const dc = this._dc(who);
    if (own) dc.queue = dc.queue.filter(q => !(q.start === startBeat && q.reaction));
    else if (dc.queue.some(q => q.start === startBeat && !q.reaction)) return;
    dc.play(name, startBeat, len, { faceFoe: name === 'taunt' }).reaction = !own;
  }

  _voice(who, pool, chance = 1) {
    if (!this.bridge.voiceEnabled || Math.random() > chance) return;
    const now = performance.now();
    if (now - this._voiceAt < 2200) return;
    this._voiceAt = now;
    const v = who === 'player' ? this.bridge.voices.player : this.bridge.voices.rival;
    try { v.speakOneOf(pool); } catch {}
  }

  _onBattle(type, d) {
    const beatNow = this.clock.beatAt(this.battle.songTime);
    const rivalName = this.rDef.name;
    switch (type) {
      case 'barStart': {
        const m = this.level.music;
        if (d.bar === m.battleStartBar - m.introBars) {
          this.phase = 'intro';
          this.hud.show(true);
          this.hud.showBanner(`${this.level.title}<small>DANCE BATTLE vs ${rivalName}</small>`, 'big', 2000);
          this.pDance.play('intro', d.bar * 4, 4); this.rDance.play('intro', d.bar * 4, 4);
          this.director.cut('wide', d.bar * 4, 4);
        } else if (d.bar === m.battleStartBar - 1) {
          this.hud.showBanner('READY?', '', 1900);
          this._voice('rival', 'single');
        } else if (d.bar === m.battleStartBar) {
          this.phase = 'battle';
          this.hud.showBanner('GROOVE!', 'go', 900);
          this.sfx.crowd(0.8);
          this.world.react('drop', {});
        }
        const cut = this.cuts.filter(c => c.bar === d.bar);
        for (const c of cut) this.director.cut(c.kind, d.bar * 4, c.len, { who: c.who });
        this.cuts = this.cuts.filter(c => c.bar !== d.bar);
        break;
      }
      case 'judge':
        if (d.who === 'player') {
          this.hud.judge(d.judgment, d.delta, d.wrong);
          if (d.note.kind === 'groove' && d.judgment !== 'miss') this.sfx.groove();
          else this.sfx.hit(d.judgment);
        } else if (d.note.kind !== 'dodge' && d.note.kind !== 'taunt') {
          this.hud.rivalJudgment(d.judgment);
        }
        break;
      case 'move': {
        const list = this._def(d.who).moves[d.tier] || ['groove'];
        const name = list[d.bar % list.length];
        this._schedule(d.who, name, d.bar * 4, 4, true);
        const foe = d.who === 'player' ? 'rival' : 'player';
        if (d.tier >= 4) {
          this._schedule(foe, 'reactOoh', d.bar * 4, 2, false);
          this.cuts.push({ bar: d.bar, kind: 'orbit', who: d.who, len: 4 });
        } else if (d.tier >= 3) {
          this.cuts.push({ bar: d.bar, kind: 'close', who: d.who, len: 3 });
        }
        this.world.react('move', { ...d, songTime: this.clock.barTime(d.bar) });
        if (d.who === 'player') {
          if (d.perfect) this.hud.showCallout(`PERFECT MOVE <b>+${d.bonus}</b>`, 'good', 1100);
          if (d.tier >= 3) this._voice('player', 'combo', 0.45);
        } else if (d.tier >= 4) {
          this._voice('rival', 'combo', 0.5);
        }
        break;
      }
      case 'fumble':
        this._dc(d.who).react('fumble', beatNow, 1.6);
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
      case 'taunt':
        this._dc(d.attacker).react('taunt', beatNow, 4 - (beatNow % 4) + 0.001, { faceFoe: true, fade: 0.15 });
        this.director.cut('taunt', beatNow, 3, { who: d.attacker });
        this.sfx.taunt();
        this.world.react('taunt', d);
        break;
      case 'tauntWhiff':
        this._dc(d.attacker).react('whiff', beatNow, 2);
        if (d.attacker === 'player') this.hud.showCallout('TAUNT WHIFFED', 'bad', 1200);
        else this.hud.showCallout(`${rivalName} WHIFFED THE TAUNT`, 'good', 1200);
        break;
      case 'dodge':
        this._dc(d.who).react('dodge', beatNow, 2);
        this._dc(d.attacker).react('whiff', beatNow + 0.2, 2);
        this.hud.showBanner(d.who === 'player' ? 'DODGED!' : `${rivalName} DODGED`, d.who === 'player' ? 'good' : 'bad', 1100);
        this.world.react('dodge', d);
        this.sfx.crowd(0.7);
        if (d.who === 'player') this._voice('player', 'single');
        break;
      case 'tauntLanded':
        this._dc(d.defender).react('hitReact', beatNow, 1);
        this._schedule(d.defender, 'stunned', d.stunBar * 4, 4, true);
        this._schedule(d.attacker, 'cheer', Math.ceil(beatNow + 0.5), 2, false);
        this.hud.showBanner(d.defender === 'player' ? 'STUNNED!' : `${rivalName} STUNNED!`, d.defender === 'player' ? 'bad' : 'good', 1300);
        this.director.cut('close', beatNow, 2, { who: d.attacker });
        this.world.react('tauntLanded', d);
        this.sfx.crowd(1);
        this._voice(d.attacker, 'tetris');
        break;
      case 'tauntNotReady':
        this.hud.showCallout(`Fill your HYPE to taunt (${Math.floor(d.hype)}%)`, '', 900);
        break;
      case 'tauntBlocked':
        this.hud.showCallout('Can\'t taunt right now', '', 800);
        break;
      case 'end':
        this._result(d);
        break;
    }
  }

  _result(summary) {
    this.phase = 'result';
    this.summary = summary;
    const m = this.level.music;
    const r = this.level.rewards;
    const win = summary.winner === 'player';
    this.bonus = Math.round(summary.player.score * r.battleScoreShare) + (win ? r.win : r.lose);
    const bar = this.battle.endBar;
    const len = m.resultBars * 4;
    this.pDance.clearQueue(); this.rDance.clearQueue();
    this.pDance.play(win ? 'victory' : 'defeat', bar * 4, len);
    this.rDance.play(win ? 'defeat' : 'victory', bar * 4, len);
    this.director.cut('winner', bar * 4, len, { who: summary.winner });
    this.world.react('end', { who: summary.winner });
    this.sfx.crowd(1.2);
    this.hud.showBanner(
      `${win ? 'YOU WIN!' : `${this.rDef.name} WINS`}<small>${summary.player.score.toLocaleString()} — ${summary.rival.score.toLocaleString()} · GROOVE BONUS +${this.bonus.toLocaleString()}</small>`,
      win ? 'big win' : 'big lose', len * this.clock.spb * 1000);
    this._voice(win ? 'player' : 'rival', win ? 'praise' : 'tetris');
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
    const beatForDance = inWorld ? beat : 0;
    this.pDance.update(beatForDance);
    this.rDance.update(beatForDance);
    this.world.update(this.paused ? 0 : dt, { beat: beatForDance, songTime, leader: this.battle.groove });

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
      if (this.phase === 'result' && songTime >= this.outAtSong) this._startOut();
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
    this.bridge.adoptMusic(this.music.node, this.music.gain, this.level.music.track);
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
    if (this.trans === 'in' || this.phase === 'init') this.transition.layout(this._boardRect(), w, h);
  }
}
