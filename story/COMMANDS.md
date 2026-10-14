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

## 4. The command bar

```
YOU                                         MOVE 4/8
TOP       [↓]               ▸ (○)  LV 2       ← arrows turn green as entered,
★ BOTTOM  [↑][↑]            ▸ (✕)  LV 3          the next one pulses; dead line dims
[BEAT 1][BEAT 2][BEAT 3][BEAT 4]              ← marker on the audio clock; BEAT 4 flashes
          ENTER ↓ / ↑ — 1 OF 2                ← what's still needed
```

- The bar shows the command from the moment it appears until its beat-4 result, and then the result for a moment.
- A wrong arrow flashes the bar red.
- On beat 4 the button box flashes when the arrows are complete.
- PERFECT / GREAT / GOOD / MISS pops up with the offset in ms.
- Dodge, stunned, rest (Freeze), solo and watch measures have their own rows.
- The rival has a smaller bar of its own. The top panels show each dancer's LV, string pips, combo, Enthusiasm and attacks left.

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
