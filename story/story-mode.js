// StoryModeManager — runs a Story Mode level on top of the Tetris match.
//
//   TetrisGameplay → StoryTrigger → WorldTransition → RhythmBattle
//        ▲                                                 │
//        └──────── ReturnTransition ◄── BattleResult ◄─────┘
//
// It decides when the special tetrimino enters the queue, fires the story
// event when a line is cleared with it, freezes the match (nothing is
// reset — board, score, queue, hold and level are preserved), runs a
// BattleSession, then hands the match back with the battle bonus added.

import { STORY_LEVELS, DEFAULT_LEVEL } from './levels.js';

export function createStoryMode(bridge) {
  return new StoryModeManager(bridge);
}

class StoryModeManager {
  constructor(bridge) {
    this.bridge = bridge;
    this.level = STORY_LEVELS[DEFAULT_LEVEL];
    this.phase = 'idle';        // idle | tetris | triggered | battle
    this.run = null;
    this.session = null;
    this._timers = [];
    this._sessionModule = null;
    if (!document.getElementById('story-css')) {
      const link = document.createElement('link');
      link.id = 'story-css';
      link.rel = 'stylesheet';
      link.href = new URL('./story.css', import.meta.url).href;
      document.head.appendChild(link);
    }
    this.toast = document.createElement('div');
    this.toast.className = 'story-toast';
    document.body.appendChild(this.toast);
  }

  themeIndex() { return this.level.themeIndex; }

  // ── Hooks called by the game ──────────────────────────────────────
  onGameStart() {
    this.teardown();
    this.run = { specialQueued: false, battles: 0, result: null, bonus: 0, hinted: false };
    this.bridge.registerSpecialPiece(this.level.special.base);
    this.phase = 'tetris';
    this._toast(`<b>${this.level.title}</b>Clear a line with the golden piece to start the dance battle!`, 4200);
    // Warm the battle code in the background while the player stacks.
    this._sessionModule = this._sessionModule || import('./battle-session.js');
  }

  onPieceLocked({ special, cleared }) {
    if (this.phase !== 'tetris' || !this.run || this.run.battles > 0) return;
    const s = this.level.special;
    if (!this.run.specialQueued
        && (this.bridge.lines >= s.appearAfterLines || this.bridge.piecesLocked >= s.appearAfterPieces)) {
      this.bridge.injectSpecialPiece(s.queueSlot);
      this.run.specialQueued = true;
      this._toast('<b>A GOLDEN PIECE IS COMING</b>Clear a line with it to enter the world!', 3200);
    } else if (special && !cleared && !this.run.hinted) {
      this.run.hinted = true;
      this._toast('Clear a line through the <b>golden blocks</b> to open the dance floor!', 3200);
    } else if (this.run.specialQueued && !this.bridge.specialInPlay()) {
      // Safety net: the special left play without triggering — offer another.
      this.run.specialQueued = false;
    }
  }

  onSpecialLineClear({ rows }) {
    if (this.phase !== 'tetris' || !this.run || this.run.battles > 0) return;
    this.phase = 'triggered';
    this.bridge.freeze();
    const cells = this.bridge.specialCells();
    const impactRow = rows && rows.length ? Math.max(...rows) : 10;
    document.body.classList.add('story-charge');
    // Let the line-clear flash play on the 2D board, then go.
    this._later(() => this._enter(cells, impactRow), 450);
  }

  isActive() { return this.phase === 'triggered' || this.phase === 'battle'; }

  setPaused(p) { if (this.session) this.session.setPaused(p); }

  teardown() {
    for (const t of this._timers) clearTimeout(t);
    this._timers.length = 0;
    if (this.session) {
      this.session.abort();
      this.session = null;
      // The battle owned the music; reset the engine so the next start()
      // (restart / new game) brings the level track back.
      try { this.bridge.audio.stop(); } catch {}
    }
    document.body.classList.remove('story-charge', 'story-dim');
    this.toast.classList.remove('show');
    this.phase = 'idle';
  }

  runSummary() {
    const r = this.run;
    if (!r || !r.result) return `${this.level.title} · no battle yet`;
    return `${this.level.title} · battle ${r.result.winner === 'player' ? 'won' : 'lost'} (+${r.bonus.toLocaleString()})`;
  }

  // ── Event flow ────────────────────────────────────────────────────
  async _enter(cells, impactRow) {
    try {
      const { BattleSession } = await (this._sessionModule || import('./battle-session.js'));
      if (this.phase !== 'triggered') return;       // quit / restarted meanwhile
      this.session = new BattleSession({
        bridge: this.bridge, level: this.level, specialCells: cells, impactRow,
        onDone: (r) => this._return(r),
      });
      await this.session.start();
      if (this.phase === 'triggered') this.phase = 'battle';
    } catch (e) {
      console.error('[story] battle failed to start', e);
      this._fallback();
    } finally {
      document.body.classList.remove('story-charge');
    }
  }

  // No WebGL / audio: skip the battle but never strand the match.
  _fallback() {
    if (this.session) { this.session.abort(); this.session = null; }
    this.bridge.normalizeSpecialCells();
    this.bridge.setHide2D(false);
    this.bridge.resume(300);
    if (this.run) this.run.battles++;
    this.phase = 'tetris';
    this._toast('The dance floor couldn\'t open on this device — keep stacking!', 3200);
  }

  _return({ summary, bonus }) {
    const s = this.session;
    this.run.battles++;
    this.run.result = summary;
    this.run.bonus = bonus;
    this.bridge.normalizeSpecialCells();
    this.bridge.addScore(bonus);
    // The live 2D board draws again underneath the 3D canvas (which is now
    // showing the reassembled board in the same spot), then the 3D layer
    // fades out and the side panels fade back in.
    this.bridge.setHide2D(false);
    s.canvas.classList.remove('on');
    document.body.classList.remove('story-dim');
    this._later(() => { s.destroy(); if (this.session === s) this.session = null; }, 420);
    this.bridge.resume(700);
    this.phase = 'tetris';
    const won = summary && summary.winner === 'player';
    this._toast(`<b>${won ? 'BATTLE WON' : 'BATTLE LOST'}</b>GROOVE BONUS +${bonus.toLocaleString()} · back to the board!`, 3400);
  }

  _later(fn, ms) {
    const t = setTimeout(() => { this._timers = this._timers.filter(x => x !== t); fn(); }, ms);
    this._timers.push(t);
  }

  _toast(html, ms = 3000) {
    this.toast.innerHTML = html;
    this.toast.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toast.classList.remove('show'), ms);
  }
}
