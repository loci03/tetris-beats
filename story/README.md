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
| `levels.js` | Level registry — **all level-specific data** (theme, special-piece rules, song grid + Story / Bust a Beat sections, stage, dancers, AI, rewards). Levels: 01 THE UNDERGROUND (vs ALFRED), 02 TACO TOWN (vs TINA). |
| `story-mode.js` | `StoryModeManager`: special-piece timing, trigger, freeze/resume, battle bonus. Entry point (`createStoryMode(bridge)`). |
| `battle-session.js` | One trip into the world: renderer, music hand-off, input, and the event wiring between the systems below. |
| `music-clock.js` | `MusicClock` — the beat/BPM manager. Song position from the AudioContext clock, latency- and user-offset-compensated; grid phase check and drum-hit (kick / snare) analysis of the decoded song. **Everything is timed in song time.** |
| `chart.js` | The command tree: levels 1-4 (3→6 directions), ★ branches (signature moves) unlocked by Enthusiasm, the SOLO at the top. |
| `rhythm-battle.js` | `RhythmBattle` — pure rules: untimed direction entry + the timed GROOVE finisher on beat 4, scoring, levels, enthusiasm, hype, taunt / dodge / stun, battle timer. Emits events. |
| `opponent-ai.js` | Rival skill profile → finisher timing, branch choices, taunt decisions, dodges. |
| `characters.js` | Toon dancer rigs (joint hierarchy + outlined parts + anime face: joy ^^ eyes, wink, kiss), and each dancer's own dance identity — base routines, moves per level, ★ branch moves, solo, intro taunt, anime marks. YOU = hip-hop / b-boy, ALFRED = disco + rock'n'roll, TINA = glam diva with her purse. |
| `dance.js` | Choreography: beat-keyframed named moves (two-step, running man, Roger Rabbit, cabbage patch, robot, moonwalk, disco point, jump split…), a groove layer that bounces on every beat (harder on 2 & 4), always-on 8-count base routines, leg IK so planted feet stay planted, and `DanceController` (queue, crossfades, reactions). |
| `camera.js` | `CameraDirector` — two-shot, push-ins, orbit, taunt and winner shots; aspect-aware. |
| `transition.js` | Board capture → 3D tiles aligned to the 2D board; shatter/fly-through in, reassemble out. |
| `hud.js`, `story.css` | Battle HUD, note lane, touch pads, toasts. |
| `sfx.js` | Synthesized hit / whoosh / riser / impact / crowd / count-in sounds. |
| `announcer.js` | Arena announcer ("Ready?", "Three! Two! One! Go!", move calls, "Stunned!", "You win!") scheduled on the music clock; ducks the music. |
| `anime-fx.js` | Manga marks over the dancers: hearts, sparkles, notes, sweat drops, anger veins, "!". |
| `worlds/underground-world.js` | Level 1 stage: graffiti warehouse, neon, lasers, passing subway train. |
| `worlds/taco-world.js` | Level 2 stage: sunset taco-shell street party. |

`vendor/three/` holds three.js r170 (MIT), so the mode works offline and on
GitHub Pages without a CDN.

## Adding a level

1. Add an entry to `STORY_LEVELS` in `levels.js` (copy `taco`).
2. **Music:** set `track`, `bpm` and `firstBeat` for the MP3, then a `story`
   section (`battleStartBar` on a high-energy run, ~24 bars) and a `beat`
   section (Bust a Beat: intro from bar 0, battle to just before the song
   ends). For half-time songs set `bounce: 2` so dancers bounce on every snare. The Taco numbers
   were measured with kick- and snare-band comb fits over the battle section of
   the decoded track. The tempo must be exact for the section you battle in
   (0.2 BPM off drifts half a beat over 50 bars); `MusicClock.alignPhase()`
   then fine-tunes the phase (±60 ms) against the decoded buffer at runtime,
   which also absorbs per-browser MP3 decoder padding.
3. **Stage:** add a builder in `worlds/` that returns `{ group, anchors, update,
   react, setLightLevel, dispose }` and register it in `WORLDS` in
   `battle-session.js`.
4. **Dancers:** add a character to `CHARACTERS` in `characters.js` (colours,
   look, style, a move list per tier) or reuse existing ones.
5. Add a card for it in the STORY tab (`#story-panel` in `index.html`).

## How a battle plays (Bust a Groove rules)

Every 4/4 bar is a command: enter the direction sequence any time from the
previous bar's finisher until beat 4 — the arrows are drawn on the lane in
front of the GROOVE note as a guide, they're not timed, and a wrong one is
simply ignored — then hit **GROOVE on beat 4**. That finisher
is the one timed event (Perfect / Great / Good). Land it and your dancer
performs the move through the next bar; each landed command climbs a level
(2 → 4 arrows, bigger moves), two fumbles in a row drop one. Landing commands fills
**Enthusiasm**: from level 2 at half a gauge the tree offers a **★ branch**
row next to the standard command (longer, more points, signature moves — lock
& pop, windmill, backflip), and at level 4 with a full gauge the **SOLO**
(headspin). A solo spends the gauge.

Battle states: INTRO (entrance) → the rival calls the player out → the
player answers → READY + a 3-2-1 count-in on the beat → GROOVE. Both dancers
never stop: between moves they loop their own 8-count routines, and a
drum-hit layer makes them hit the song's actual kicks and snares.

## BUST A BEAT

The **BEAT** tab on the start screen plays the same battle on its own — no
Tetris. `StoryModeManager.startBeat(levelId)` runs a `BattleSession` with
`standalone: true`: no board transition (it opens on the stage), its own
pause card (Esc / P / the ❚❚ button) and a result screen with PLAY AGAIN /
MENU. It plays the level's whole song from the top. Levels, dancers and
ALFRED'S DIFFICULTY are shared with Story Mode, so every new Story level is a
new Bust a Beat stage too.

## Controls (battle)

Arrows / WASD to enter the command · Space = GROOVE on beat 4 (and DODGE) · T = taunt ·
P / Esc = pause. On touch screens: **swipe anywhere** for the arrows (zig-zags
chain without lifting), **tap anywhere** for GROOVE (timed at touch-down), plus GROOVE / TAUNT buttons. The **Rhythm timing** slider in
Settings compensates for audio latency (e.g. Bluetooth headphones).

## Testing notes

`rhythm-battle.js` is pure logic and can be driven from Node with a fake clock
(the folder is marked `"type": "module"` for that). The full loop was verified
headless with an autoplayer asserting that board, queue, hold, piece, lines and
level are unchanged after the battle and that the score only gains the bonus.

## Credits

Announcer voice lines (`audio/voice/announcer/`) were generated with
[Piper](https://github.com/rhasspy/piper) using its LibriTTS (high) voice,
speaker 42. LibriTTS is licensed CC BY 4.0
(http://www.openslr.org/60/). Crowd, count-in and hit sounds are synthesized
at runtime (`sfx.js`).

