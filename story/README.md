# Story Mode

Tetris levels that open into a Bust a Groove–style 3D dance battle and back.

```
Tetris ─► special piece ─► clear a line with it ─► transition in ─► rhythm battle (~60 s)
   ▲                                                                        │
   └──────────── same match, state preserved ◄── transition out ◄── result ─┘
```

Everything here is native ES modules, loaded on demand when the player opens
the STORY tab. `index.html` only has small hooks plus the `window.TetrisBridge`
object; the mode never touches game internals directly.

## Files

| File | Role |
|---|---|
| `levels.js` | Level registry — **all level-specific data** (theme, special-piece rules, song timing, stage, dancers, AI, rewards). |
| `story-mode.js` | `StoryModeManager`: special-piece timing, trigger, freeze/resume, battle bonus. Entry point (`createStoryMode(bridge)`). |
| `battle-session.js` | One trip into the world: renderer, music hand-off, input, and the event wiring between the systems below. |
| `music-clock.js` | `MusicClock` — the beat/BPM manager. Song position from the AudioContext clock, latency- and user-offset-compensated. **Everything is timed in song time.** |
| `chart.js` | Command builder (rhythm templates × direction motifs, scaled by move tier). |
| `rhythm-battle.js` | `RhythmBattle` — pure rules: timing windows, scoring, combos, move tiers, hype, taunt / dodge / stun, battle timer. Emits events. |
| `opponent-ai.js` | Rival skill profile → hits, taunt decisions, dodges. |
| `characters.js` | Toon dancer rigs (joint hierarchy + outlined parts + expressive face). |
| `dance.js` | Beat-synced move library and `DanceController` (queue, crossfades, reactions). |
| `camera.js` | `CameraDirector` — two-shot, push-ins, orbit, taunt and winner shots; aspect-aware. |
| `transition.js` | Board capture → 3D tiles aligned to the 2D board; shatter/fly-through in, reassemble out. |
| `hud.js`, `story.css` | Battle HUD, note lane, touch pads, toasts. |
| `sfx.js` | Synthesized hit / whoosh / riser / impact / crowd sounds. |
| `worlds/taco-world.js` | Level 1 stage. |

`vendor/three/` holds three.js r170 (MIT), so the mode works offline and on
GitHub Pages without a CDN.

## Adding a level

1. Add an entry to `STORY_LEVELS` in `levels.js` (copy `taco`).
2. **Music:** set `track`, `bpm` and `firstBeat` for the MP3, plus `battleStartBar`
   (pick a high-energy section with ~28 bars of song after it). The Taco numbers
   were measured with an onset comb-fit over the decoded track — re-measure for
   a new song rather than trusting a rough BPM.
3. **Stage:** add a builder in `worlds/` that returns `{ group, anchors, update,
   react, setLightLevel, dispose }` and register it in `WORLDS` in
   `battle-session.js`.
4. **Dancers:** add a character to `CHARACTERS` in `characters.js` (colours,
   look, style, a move list per tier) or reuse existing ones.
5. Add a card for it in the STORY tab (`#story-panel` in `index.html`).

## Controls (battle)

Arrows / WASD on the notes · Space = GROOVE (and DODGE) · T = taunt ·
P / Esc = pause. Touch devices get on-screen pads. The **Rhythm timing**
slider in Settings compensates for audio latency (e.g. Bluetooth headphones).

## Testing notes

`rhythm-battle.js` is pure logic and can be driven from Node with a fake clock
(the folder is marked `"type": "module"` for that). The full loop was verified
headless with an autoplayer asserting that board, queue, hold, piece, lines and
level are unchanged after the battle and that the score only gains the bonus.
