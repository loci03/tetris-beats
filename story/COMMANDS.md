# Command input & combo display

How the dance battle reads your commands. It follows the original
PlayStation **Bust a Groove** (1998), and every modern addition is labelled
as one. The evidence and its confidence levels are in `BAG-RESEARCH.md` (A1–A5).

## 1. Original mechanics (what we keep)

| Original rule | Evidence | Where |
|---|---|---|
| One command per 4-beat measure. | TAS: each confirm press is exactly one "cycle" after the previous one. Giant Bomb / GameFAQs snippets agree. | `RhythmBattle._buildBar` |
| Directions go in order, any time before beat 4, and are not individually timed. | GameFAQs 3772 snippet: "the green bar represents the first three beats … the button command represents the fourth beat". TAS: the arrows come in a burst. | `_dir`, `applyDirection` |
| ✕ or ○ (the one the command shows) completes it **on beat 4**. | Several snippets agree. TAS confirms the press lands on the cycle boundary. | `_button`, `judgeTiming` |
| Success moves one row down the **8-row command tree**, which is the same for every character: left child = same level (easier), right child = next level (harder, more points). | TAS `scripts/nodes/combos.lua` with the README point triangle. Transcribed as `LATTICE`. | `commands.js` |
| The next command(s) show as soon as the last one is decided. | TAS input bursts start right after the previous confirm. | `_afterResolve` → `_prepare` |
| Row 8 is the **FREEZE**. The measure after it has no command, then a new string starts. | Snippets ("4 beats to rest") and TAS. | `_landed` → `rest` bar |
| A miss (wrong, incomplete or mistimed) cuts the string: back to row 1, combo 0. | Snippets. | `_missed` |
| **Attack** △ on beat 4 instead of the button, twice per battle. The defender presses □ on their next beat 4 to **dodge**. A hit resets their string and stops them dancing for a bar. Neither action breaks your own string. | JA Wikipedia, the fandom wiki and TAS strings with △ / □ measures mid-string. | `_attack`, `_dodge`, `_resolveDodge` |
| A dancer in a Freeze is immune to an attack. | Fandom wiki snippet. | `_attack` (`immune`) |

Two things the sources don't settle, so we chose:
- **When the harder line appears.** The original offers it "at certain points". We offer BOTTOM once the Enthusiasm gauge is ≥ 40.
- **Why some strings restart on row 2–3** (seen in the TAS). We use a "hot streak": Enthusiasm ≥ 70 after a Freeze restarts at row 3.

## 2. Modern additions (labelled)

- **Judgments.** PERFECT ±45 ms, GREAT ±90 ms, GOOD ±150 ms around beat 4 (`RULES.timing`). These are proposed values, configurable and not from the original. `windowsFor` caps them at 45% of a beat, so a window never reaches the neighbouring beats at any tempo. Each judgment scales the points (1 / 0.8 / 0.6).
- **Lenient wrong arrows.** An arrow that fits no candidate flashes red and is ignored; the arrows already entered stay. The original's behaviour here isn't documented.
- **Combo counter.** The consecutive-success count is shown from 3, separately from the move type (row 1–8). It keeps counting across Freezes.
- **Earned SOLO.** At full Enthusiasm on rows 5–7, BOTTOM becomes the dancer's solo command: two bars of solo, the opponent watches.
- Also: per-device latency calibration, remapping, practice mode and the diagnostics panel.

## 3. Architecture (task roles → code)

| Role | Code |
|---|---|
| BeatClock | `MusicClock` (`music-clock.js`). It is the audio clock (`getOutputTimestamp`) and reports song time and beats. `rate` slows playback in practice. `inputSongTime(ts)` maps an event timestamp to song time, applying the calibration offset. |
| CommandDefinition | `LATTICE` and `moveDefinitions(char, plan)`. Every node is a move per character, with: `id`, `character`, `type` (row 1–8), `level` (column + 1), `seq`, `button`, `points`, `anim`, `mirror`, `freeze`, `beats`, `successors`, `branch {top, bottom, rule}`, `transition`. |
| CommandResolver | `resolveCommands(state, {branch, solo})`. TOP is always offered; BOTTOM only when the rules allow it. |
| InputBuffer | `InputBuffer`, one per dancer per measure: `{t, kind, value, result}`, kept in song-time order. |
| InputJudge | `startCandidates` / `applyDirection` (prefix matcher), `resolveFinal` (button picks the completed candidate), `judgeTiming`. |
| ComboStateMachine | `RhythmBattle` per dancer: `row` / `col`, `chain`, `level`, `enthusiasm`, `jammers`, strings, freezes, stuns. |
| DanceAnimationScheduler | `Choreographer.success(moveEvent)` looks the move id up in `moves`. It returns the animation, starting on the next downbeat; row 8 adds a 2-beat finisher plus the freeze. `DanceController` blends it in on the beat, so the dancing never stops. |
| CommandHUD | `CommandBar` (`hud.js`), one per dancer. It reads only `battle.commandFor(who, songTime)` and the clock. |

**Time.** Everything scheduled — showing commands, AI inputs, window time-outs and measures ending — is processed in song-time order (`_advanceTo`). Every input first advances the schedule to its own timestamp, so results don't depend on frame rate (test 13).

**Inputs.** `InputMapper` (`input.js`) handles:
- keyboard by physical key code, ignoring OS auto-repeat;
- gamepads polled every 4 ms with edge detection, d-pad or left stick (with hysteresis), using the pad's own timestamp;
- a 25 ms per-control debounce, which drops switch chatter while repeated commands like ↑ ↑ ↓ still count;
- per-device latency subtracted from the timestamp;
- connect / disconnect: a disconnect mid-battle pauses, and a button held while reconnecting doesn't fire.

The rival AI produces timestamped inputs that go through the same buffer and judge as the player's.

## 4. The battle HUD and the command strip

The dancers come first. The HUD is a slim **top bar** plus a compact **bottom dock**, and the camera frames both dancers, head to feet, into the space between them (§4.3). Nothing opaque sits over the stage.

```
YOU 1,390 ×4 ▬▬▬▬     2:14 ❚❚     ×3 398 NULL ▬▬ △2      ← score · combo · Enthusiasm · attacks
                         ─●─       4/8 ✕ ON 4 [↓✕] [★↓○]  ← the rival's command, one line

                  (both dancers, full body)

        ★ 4/8 LOCK & POP · PERFECT +972                    ← ticker: callouts / controls hint
┌ YOU · MOVE 4/8  △                       PERFECT! −3ms ┐  ← status / judgment + offset
│ TOP  [↓]                            (○)  LV2          │  ← two fixed rows (no jump when
│ ★    [↑][↑]                         (✕)  LV3          │    a branch opens)
│ [ 1 ][ 2 ][ 3 ][▮4▮]                                   │  ← each lights on its beat; gold band
└────────────────────────────────────────────────────────┘    = beat 4's timing window
```

- **Arrows** turn green as you enter them; the next one is outlined; a line your input ruled out dims; a wrong arrow shakes the strip red.
- **The final button box** lights when its arrows are complete. It fills (gold ring) while beat 4's window is open, and flashes on beat 4.
- **Feedback:** the strip flashes green on a hit and red on a miss; the status shows PERFECT / GREAT / GOOD / MISS (with the reason) and the offset in ms. These judgments are a modern addition.
- **Other measures:** dodge (`INCOMING! DODGE ON 4 [□]`), stunned, rest (Freeze), solo and watch measures replace the rows.
- **Removed duplication:** the move-row pips and LV in the score panels (MOVE n/8 and LV are on the strip), the separate status line (now in the strip header), and the full controls line (shown in the ticker only until your first commands land).

### 4.1 Beat pulse (synchronised to the music)
- **Source:** RhythmBattle (the judge) emits a `beat` event for every beat of the song on its own grid. Beat 4's event time is exactly the judge's beat 4. The HUD receives it as `onBeat(beatIndex, measureIndex, songTime)`.
- **Envelope:** every frame, the strip's pulse is computed from the music clock's song time: `pulseEnvelope(since beat)`, a 40 ms attack and a 140 ms decay.
  - Beats 1–3 brighten the border glow, scale the strip by ~1.2 % and light that beat's pill.
  - Beat 4 of a measure you had to press in is a separate, stronger gold pulse: a 280 ms decay, the gold ring, the gold pill and the button box scaled up.
- **Why it can't drift:**
  - There is no timer and no CSS animation on an interval: the pulse is computed from song time each frame.
  - A pause freezes it.
  - A seek or a dropped frame is corrected on the next frame.
  - Practice's slowed playback keeps the 40/140 ms in real time.
- **Tested** in `tests/hud.test.mjs` and in-game: every sampled frame matched the clock-derived envelope, including across a real pause and resume.

### 4.2 Touch (no pad buttons)
- **Directions:** swipe anywhere on the stage.
- **✕ / ○ (and □ on a dodge measure):** tap that box in your strip. Both rows' boxes work, so ✕ and ○ stay separately selectable when both lines are open. Each box has a padded touch target.
- **△ attack:** the small △ chip in the strip header.
- **Timing:** taps and swipes are timed at touch-down. A missed beat 4 is only called after a short input-delivery grace (100 ms, or more on slow devices, following the measured frame time). A press that happened inside the window but reached the game a frame late still counts, judged by its own timestamp.

### 4.3 Stage framing
- **Free area:** `BattleHUD.layout()` reports the free screen area: the band between the top bar and the dock, and in short landscape (dock in the lower-left corner) the full height beside the dock.
- **Fitting:** `CameraDirector.setStage()` picks where the pair comes out biggest. Each shot is fitted by projecting the dancers' real 3D bounds (feet to raised hands, arms' reach, a step of depth) through its actual pose, so perspective, side angles and dutch roll are all accounted for. A projection offset (`setViewOffset`) places the pair low in the area, with headroom for banners.
- **Shots:**
  - All cuts during normal play keep both dancers in frame; only SOLO TIME and the winner's shot frame one dancer.
  - Narrow screens bring the dancers closer together (±1.0 instead of ±1.6) so they can be larger.
  - The camera keeps front-of-stage props (fences, the crowd's heads) below its line to the dancers' feet.

## 5. 2P VS

**2P VS** on the Bust a Beat tab makes the rival a second human. Each player has their own command bar, input buffer, combo, level, judgments, score, attacks / dodges and Freeze state; the two bars sit side by side, each labelled with that player's keys.

- **Keyboard:** P1 uses WASD + J (✕) / K (○) / I (△) / U (□). P2 uses the arrows + . (✕) / slash (○) / ; (△) / ' (□), or Numpad 1 / 2 / 5 / 4.
- **Gamepads:** pad 1 is P1, pad 2 is P2.
- All of it is remappable on the CONTROLS screen.
- **Timing:** presses from both pads in one poll are delivered oldest first.

## 6. Practice mode

On the Bust a Beat tab, turn on **PRACTICE** and pick a speed: 1×, ¾× or ½× (the song really slows down). The panel shows:

- **Readouts:** BAR / BEAT / BPM; **EXPECTED** (every candidate with its node and points); **RECEIVED** (the buffer, wrong arrows in red); **STATUS** (e.g. "Waiting for ○ on beat 4 (−120 ms)"); the last judgment and offset; a histogram of the last 16 offsets; the move id that resolved; the animation planned and the one actually playing.
- **Controls:** choose the ROW and LV; HOLD the row to repeat it; force BRANCH (auto / always / never); RIVAL on or off; CONTROLS.

## 7. Tests (`tests/commands.test.mjs`, `npm test`)

1. A perfect command; great / good by offset.
2. Correct arrows, wrong button.
3. Button outside the window (early, late, never); inclusive edges.
4. Wrong order.
5. Repeated directions.
6. Five-arrow commands, crammed or spread; arrows after beat 4 don't count.
7. Shared prefixes (↑↑✕ vs ↑→○, →→✕ vs →→○, prefix-of-another).
8. TOP keeps the level.
9. BOTTOM steps up, only when eligible; deterministic.
10. A miss mid-combo; move type vs combo.
11. 8 moves → Freeze → rest → new string.
12. Recovery.
13. Identical results at 20 / 60 / 144 fps and jittery frames.
14. 60 / 90 / 180 BPM; windows stay inside half a beat up to 300 BPM.
15. Player and opponent input at the same time.
16. Intro, last measure, end of battle, attack cut-off.
17. Gamepad: d-pad, stick, debounce, disconnect / reconnect, remap, latency; keyboard repeat, remap, saved bindings; 2P routing and cross-pad ordering.
18. Every node of every character → its own animation, no flips; the fallback is logged.
19. No drift over 5½ minutes, at 1× and ½× speed.
20. Attack / dodge / stun never corrupt a string; Freeze immunity.

**Real-game checks** drove the actual page headless (Chromium) through the real input path: arrows as real key events, the beat-4 button as timestamped key presses. Every frame checked that the command bar matches the battle state and that each landed move plays its node's animation. The runs covered:

- Bust a Beat at 1×, and in Practice at ¾×;
- phone size;
- a full string → Freeze → rest → hot restart;
- rival attacks: dodged, and hit (stun);
- an earned solo;
- 2P VS;
- Story mode: the Tetris state is preserved and the arrows go back to Tetris.

The HUD never disagreed with the battle state.

## 8. Limits

- The original's exact judgment windows, the rule for when BOTTOM appears, and the restart-row rule are not documented anywhere I could reach. Ours are tunable stand-ins (`RULES`).
- GameFAQs 3770 / 3771 / 3775 and the videos could not be opened from this environment. The research rests on the TAS replay (primary) plus search snippets (Giant Bomb, GameFAQs 3772, wikis).
- 2P VS is local only: keyboard split (P1 WASD + J/K/I/U, P2 arrows + . / ; ') or two gamepads. Touch screens are 1P.
