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
| `levels.js` | Level registry: every level with a song (18) — theme, special-piece rules, the measured song grid + Story / Bust a Beat sections, boss, AI (harder each level), rewards — and `loadLevel(id)`, which imports `levels/<id>.js`. |
| `levels/<id>.js` (+ `levels/<id>/`) | One level each: the **boss** (look via `build(kit)`, style, routines, moves per tier, ★ branch moves, solo, intro + battle taunt with its projectile and HUD disruption), its **moves**, its 3D **stage** and its Tetris **backdrop** framing. |
| `backdrop.js` | The level's stage in 3D behind the Tetris board: YOU and the boss dance either side of the board to the song and react to clears; adaptive resolution / frame-rate governor, falls back to the 2D scene. |
| `story-mode.js` | `StoryModeManager`: special-piece timing, trigger, freeze/resume, battle bonus. Entry point (`createStoryMode(bridge)`). |
| `battle-session.js` | One trip into the world: renderer, music hand-off, input, and the event wiring between the systems below. |
| `music-clock.js` | `MusicClock` — the beat/BPM manager. Song position from the AudioContext clock, latency- and user-offset-compensated; grid phase check and drum-hit (kick / snare) analysis of the decoded song. **Everything is timed in song time.** |
| `chart.js` | The command tree: levels 1-4 (3→6 directions), ★ branches (signature moves) unlocked by Enthusiasm, the SOLO at the top. |
| `rhythm-battle.js` | `RhythmBattle` — pure rules: untimed direction entry + the timed GROOVE finisher on beat 4, scoring, levels, enthusiasm, hype, taunt / dodge / stun, battle timer. Emits events. |
| `opponent-ai.js` | Rival skill profile → finisher timing, branch choices, taunt decisions, dodges. |
| `characters.js` | Toon dancer rigs (joint hierarchy + outlined parts + anime face: joy ^^ eyes, wink, kiss), and each dancer's own dance identity — base routines, moves per level, ★ branch moves, solo, intro taunt, anime marks. YOU = hip-hop / b-boy, COOL TONI = disco + rock'n'roll, TINA = glam diva with her purse; other bosses register from their level modules (`registerCharacter`). |
| `dance.js` | Choreography: beat-keyframed named moves (two-step, running man, Roger Rabbit, cabbage patch, robot, moonwalk, disco point, jump split…), a groove layer that bounces on every beat (harder on 2 & 4), always-on 8-count base routines, leg IK so planted feet stay planted, and `DanceController` (queue, crossfades, reactions). |
| `camera.js` | `CameraDirector` — two-shot, push-ins, orbit, taunt and winner shots; aspect-aware. |
| `transition.js` | Board capture → 3D tiles aligned to the 2D board; shatter/fly-through in, reassemble out. |
| `hud.js`, `story.css` | Battle HUD, note lane, touch pads, toasts. |
| `sfx.js` | Synthesized hit / whoosh / riser / impact / crowd / count-in sounds. |
| `announcer.js` | Versus-arcade announcer — a few yelled lines ("Here comes… Rhett Ryder!", "Ready?", "DANCE!", "Solo time!", "Fever!", who wins) scheduled so the punch word lands on the beat (`lines.json`); ducks the music. |
| `anime-fx.js` | Manga marks over the dancers (hearts, sparkles, notes, sweat drops, anger veins, "!", plus level sprites) and thrown taunt projectiles. |
| `worlds/underground-world.js` | Level 1 stage: graffiti warehouse, neon, lasers, passing subway train. |
| `worlds/taco-world.js` | Level 16 stage: sunset taco-shell street party. |
| `dev/level.html`, `dev/backdrop.html` | Dev harnesses: render a level's stage / moves from any camera, or its Tetris backdrop, headless. |

`vendor/three/` holds three.js r170 (MIT), so the mode works offline and on
GitHub Pages without a CDN.

## Adding a level

1. **Registry:** add a row to `SONGS` in `levels.js` (`[id, themeIndex, title,
   track, bpm, firstBeat, seconds, bounce, bossId]`) and a `LEVEL_CARDS` entry.
   Grids were measured from the decoded MP3s (onset autocorrelation, then a
   whole-song comb fit of tempo and phase, kick-on-1/3 for the downbeat).
   Songs faster than ~130 BPM battle on the half-time grid (`bounce: 2`).
   The tempo must be exact (0.2 BPM off drifts half a beat over 50 bars);
   `MusicClock.alignPhase()` fine-tunes the phase (±60 ms) at runtime. A level
   module can correct its grid with `music: { bpm, firstBeat, bounce }`.
2. **Module:** `levels/<id>.js` default-exports `{ boss, moves, moveMeta,
   sprites, buildWorld, backdrop }` — see any finished level. Move names are
   global: prefix them with the boss id.
3. Story / Bust a Beat sections, the menu cards and the Tetris backdrop all
   follow from the registry.

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
(headspin). Landing it starts **SOLO TIME**: two bars where the stage is
theirs — no commands, solo then encore, the camera sweeps around them, the
house lights drop and the spotlights close in, the opponent watches (then
claps), +2500 per bar. A solo spends the gauge.

Battle states: INTRO (entrance) → the rival calls the player out → the
player answers → READY + a 3-2-1 count-in on the beat → GROOVE. Both dancers
never stop: between moves they loop their own 8-count routines, and a
drum-hit layer makes them hit the song's actual kicks and snares.

## BUST A BEAT

The **BEAT** tab on the start screen plays the same battle on its own — no
Tetris. `StoryModeManager.startBeat(levelId)` runs a `BattleSession` with
`standalone: true`: no board transition (it opens on the stage), its own
pause card (Esc / P / the ❚❚ button) and a result screen with PLAY AGAIN /
MENU. It plays the level's whole song from the top. Levels, bosses and the
difficulty setting are shared with Story Mode. Every boss has their own moves
for their genre, a SOLO (the camera circles them) and their own taunt: a move,
marks thrown across the stage, and a disruption of your controls while
you're stunned (`BattleHUD.disrupt`: shake, wobble, blur, glitch, flash,
darkness, spin, or the taunt's sprite floating / falling / swirling /
splatting / clouding over the arrows).

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
[Kokoro-82M](https://github.com/hexgrad/kokoro) (Apache-2.0), voice `am_fenrir`, then
processed into a shouted fighting-game delivery (see `CREDITS.txt` there).

