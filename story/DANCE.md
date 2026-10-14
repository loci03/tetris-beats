# Dance system — choreography, rhythm and animation

How the dancers dance in Bust a Beat / Story Mode battles: what we took from
Bust a Groove (1998), what we changed, and how it's built and tested.
Research notes with sources and confidence tags: [`BAG-RESEARCH.md`](BAG-RESEARCH.md).

## 1. What the original game does (research summary)

**Access limits:** GameFAQs (3770/3771/3775), Wikipedia, fandom, TV Tropes,
archive.org and YouTube could not be opened from the build environment.
**No gameplay video was watched or decoded.** Secondary sources were read as
search-result snippets only. The primary source is a public tool-assisted
speedrun of the US release (`fullmoonissue/tas-bust-a-groove`): frame-exact
input scripts that clear all 12 stages, plus the game's command graph. Tags:
**[P]** primary data, **[S]** secondary snippet(s), **[I]** inference.

Original-game mechanics (not our inventions):

| Mechanic | Detail | Conf. |
|---|---|---|
| One command per measure | Arrows on beats 1–3 (not timed), the button on beat 4. Each command, dodge and jammer uses exactly one measure. | P, S |
| Dance string | An **8-row tree**. Each success moves down one row and you pick the easier or the harder child, giving 64 possible strings. Commands grow from 0 arrows up to 5. | P |
| Rows 6–8 | Labelled "Cool / Chillin' / Freeze". The **Freeze** ends the string and is followed by **one measure with no input** (4 beats to rest). | S, P |
| Next string | Usually restarts at row 1; sometimes at row 2–3, rule unknown. | P |
| Miss | "Cuts your combo short"; the dancer "stutters, unable to perform his move". | S |
| Move timing | A move plays in the measure *after* its input. | I (fairly high) |
| Jammer (attack) | Triangle on beat 4, twice per battle. The defender dodges on the next beat 4. | S |
| Dodge | A backflip. | S |
| Jammer hit | Combo → 0; the dancer stops for several bars. Dodging and attacking don't break your own string. | S, P |
| Solo | Fixed 2–4-measure sections with a fixed 4-command string; no attacks. | P, S |
| Fever Time | An automatic victory dance after the song. | S |
| Dance View | Unlockable mode: every animation, camera and speed control, sequencing. | S |
| Motion capture | "Over 1000 individually motion-captured dance moves", from 10 dancers. | S |

**Style identities [S]:**

| Character | Style |
|---|---|
| Heat | Breaking / b-boy |
| Frida | West Coast, pop-lock |
| Hiro | '70s disco (Travolta) |
| Kelly | Modern jazz |
| Strike | Gangsta / rough hip-hop |
| Shorty | Unverified ("playful", candy hip-hop) |

**Acrobatics in the original:**
- Verified: the shared backflip dodge, two breakers' moves, and a capoeirista.
- How often power moves appear in normal strings could not be verified.

**Movement patterns documented** (research §E). P6, P7 and P24 behave as the
original is documented to; the rest are derived from real technique for each
style:

| # | Pattern | Origin / where used here |
|---|---|---|
| P1 | down-groove bounce | → groove layer |
| P2 | up-groove | → Toni's feel |
| P3 | step-touch | → `twoStep` |
| P4 | Indian-step toprock | → `toprock` |
| P5 | six-step | → `footwork` |
| P6 | freezes | **ORIG**: a string-ending pose with a rest bar |
| P7 | backflip dodge | **ORIG** |
| P8 | arm wave + chest pop | → `popWave` |
| P9 | wrist-roll / lock / point | → `lockAndPop` |
| P10 | running man | → `runningMan` |
| P11 | cabbage patch | → `cabbagePatch` |
| P12 | kick-ball-change | → `kickBallChange` |
| P13 | disco point | → `discoPoint` |
| P14 | disco side-step / hip bump / arm roll | → `hustle`, `discoRolls` |
| P15 | jazz square | → `jazzSquare` |
| P16 | pirouette to layout | → `finDisco` / `finDiva` |
| P17 | body roll | → `bodyRoll` |
| P18 | vogue | → `vogueHands` |
| P19 | C-walk heel-toe | → `heelToe`, `swivelStep` |
| P20 | lean-back shoulder bounce | → `shoulderBounce` |
| P21 | ginga | — |
| P22 | robot ticks | → `robot` |
| P23 | moonwalk | — |
| P24 | miss stutter | **ORIG concept** → `missStumble` |
| P25 | jammer hit | → `hitReact` / `stunned` |

## 2. Why our dancers flipped more than they danced (diagnosis)

**1. Escalation was flips.**
- Each landed command climbed a level (max 4). Level 4 was reached after three commands.
- From then on every bar picked from the tier-4 list or the ★ branch move.
- For most characters those were acrobatic:
  - player: windmill freeze, air chair, break windmill, backflip;
  - Toni: jump split, split drop, disco spin;
  - Tina: cartwheel, toe-touch jump, double twirl.
- With the ★ branch on offer (most of a battle), **81–88% of bars were flips, jumps or multi-turn spins**, against 0% now (`moveProfile`, 16-command run).
- Across the level bosses, 33–58% of the moves a player could earn were acrobatic.

**2. No phrasing.**
- A move was `list[bar % list.length]` from 2–3-move lists, so a level-4 battle alternated two moves for the rest of the song.
- Nothing built up, finished or reset.

**3. Moves landed late.**
- A scheduled move started blending *on* its downbeat, so its first key arrived half a beat late.
- Planted feet slid during blends and popped-key moves.
- Foot contacts sat ~0.2 beat early: the spline lowered the foot slowly, so it touched down early.

**4. Misses flailed.**
- A miss played a generic arm flail, not a stutter-and-recover.

## 3. Architecture

```
MusicClock ── song time → beat, bar, count, 8-count, phrase (musicalPosition / timeline)
   │
RhythmBattle ── rules: commands, levels, ★ line, solo, jammer; DANCE STRINGS (row 1-8,
   │            freeze + rest bar, miss / jammer reset)            → 'move' {row, kind, freeze, string}
   ▼
Choreographer (choreo.js) ── row → move on the standard / ★ line, finisher → freeze,
   │                         solo specials, miss → stutter → recovery, victory; states
   ▼
DanceController (dance.js) ── lead-in (preparation) → move (execution) → blend out
   │                          (recovery / transition), groove layer, drum hits, IK
   ▼
Rig (characters.js) · MotionMonitor (dance-metrics.js) · Dance View · tests
```

### Musical timeline

- **Clock:** `MusicClock` turns the AudioContext clock into song time, correcting for output latency and the player's calibration offset.
- **Position:** `musicalPosition(beat)` / `clock.timeline(t)` give the BPM, bar, count 1–4, sub-beat phase (8th / 16th), 8-count, phrase and phrase start/end, plus the offsets in play.
- **Grid sync:** every pose is a function of song beats, so everything is frame-rate independent and tempo-locked (tested at 90 and 150 BPM).

### Dance strings (rules, `rhythm-battle.js`)

| Event | Effect on the string |
|---|---|
| Landed command | Earns row `row` (0–7) and advances. |
| Row 8 landed | The **freeze**. The bar it plays in becomes a **rest bar** (no command). The next string starts at row 1, or row 3 when enthusiasm ≥ 70 — our stand-in for the original's unexplained row-2/3 starts. |
| Miss | Resets to row 1. |
| Landed jammer | Resets to row 1. |
| Your taunt or dodge | Keeps the string. |
| Solo | Closes the string. |

- **Unchanged:** levels (command length), enthusiasm, the ★ option and the solo. The ★ option now takes the **harder line of the same string**, like the original's harder child.
- **HUD:** eight pips per dancer, the last one a diamond for the freeze.

### Choreographer (`choreo.js`)

**Rows of a string:**

| Rows | Content | State |
|---|---|---|
| 1–2 | Basic grooves | DANCE_MOVE |
| 3 | Intermediate step | COMBO_ADVANCE |
| 4 | Intermediate step | DANCE_MOVE |
| 5 | Intermediate step | COMBO_ADVANCE |
| 6 | Intermediate step | DANCE_MOVE |
| 7 | Advanced move | ADVANCED_COMBO |
| 8 | Finisher (counts 1–2) | ADVANCED_COMBO |
| 8 | Freeze hits on count 3, held through the rest bar, 1.5-beat come-up | FREEZE_POSE |

**Variation and escalation:**
- Every other string is **mirrored**, leading with the other foot.
- Moves read the combo level for bigger styling.
- Escalation is choreographic, never faster or flippier.

**Specials:**
- A move is *special* when it flips or inverts (|pitch/roll| > 1.2 rad), is airborne more than 10% of the time, or spins more than 1¼ turns (`moveProfile`).
- Specials may appear **only** in the solo and the victory dance.
- `validateChoreo` checks every row, finisher, freeze, idle routine and phrase accent.
- Level bosses without a hand-written plan get one built from their tier lists with specials filtered out, borrowing shared vocabulary when their pool is small. Their freeze is their signature pose, held.

**Misses:**
- `missStumble` (MISSED_INPUT, about 1.3 beats) is a stutter: a knee buckles, the chest dips, the arms flare, a catch step lands on the "and", then a head shake.
- `missRecover` (RECOVERY) bounces back into the pocket by count 3 of the next bar.
- No tumble, flip or collapse (tested: pitch/roll < 0.3 rad, hips above −0.25).

**States** (`STATES`, `TRANSITIONS`, `canTransition`):

| State | Covers |
|---|---|
| INTRO_TAUNT | Entrance, call-out, answer, ready |
| IDLE_GROOVE | Routines, watching |
| MOVE_PREPARATION | Lead-in |
| DANCE_MOVE | Regular move |
| MOVE_TRANSITION | Blend back to the groove |
| COMBO_ADVANCE | First move of a new band |
| ADVANCED_COMBO | Row 7 and the finisher |
| FREEZE_POSE | The held freeze |
| SOLO_SEQUENCE | Solo |
| JAMMER_ATTACK | Taunt, cheer |
| JAMMER_DODGE | Dodge |
| MISSED_INPUT | Stutter, whiff, hit |
| RECOVERY | Recovery, stun |
| VICTORY_DANCE | Victory dance |

- The controller logs every transition (`stateLog`, `onState`).
- The monitor flags illegal transitions.

### DanceController changes (`dance.js`)

**Timing:**
- **Lead-in:** a planned move starts blending `lead` beats *before* its start and lands its first key exactly on the downbeat (tested).
- **Preparation:** the lead-in is a small knee gather on the "and".
- **Out-blend:** each entry carries its own `out` length (recovery), e.g. 1.5 beats from a floor freeze.

**Feet:**
- **Foot swivel channel:** `p.foot(..., turn)` for heel pivots, Charleston twists and swivels.
- **Landing:** a lifted foot travels over its spot, then drops *accelerating* onto the beat; take-off bursts off the floor. Popped keys and blends *step* a travelling foot instead of skating it.
- **Blends:** one moving foot lands as the blend ends; two feet ball-change (the second lands on the beat). Feet heading into the air go together.
- **Pinned feet:** at the start of a transition the feet are pinned where they stood, so the old move's footwork stops once the body commits to the next.

**Other:** combo level styling, a `mirror` flag, a clean start (no blending from an empty pose), `moveProfile`, `LAYOUT`, `SLIDES` / `meta.slides` for moves that glide on purpose.

## 4. Vocabulary (`vocab.js` + existing moves)

| Band | Moves |
|---|---|
| Basic | knee bounce, two-step / step-touch, step-clap, shoulder bounce, shoulder rolls, upper-body rock (`bounceRock`), hip sway, heel-toe, cross step, head nods + arm swings (groove layer) |
| Intermediate | running man, Roger Rabbit, Charleston, kick-ball-change, body roll, popping (robot, wave & pop), locking (lock & pop), toprock, swivel step (heel pivots), side glide, half turn, Bus Stop, the Hustle, disco point, jazz square, vogue |
| Advanced | toprock + kick, footwork (six-step shapes, crouched, hands skimming the floor), isolations over footwork, extended popping (`popWave`), disco rolls + points, multi-bar combination (row 7 → row 8 finisher → freeze) |
| Finishers | `finBboy` (toprock → go down), `footwork`, `finDisco` (one pirouette → sink), `finDiva` (pivot → plié, hip pop) |
| Freezes | `freezeChair` (YOU — one hand planted, knees tucked, free arm up), `freezeTravolta` (TONI), `freezeDiva` (TINA), `freezeStance` (generic b-boy stance), bosses' signature poses |
| Specials (solo / victory only) | headspin, windmill, backflip, cartwheel, toe-touch, disco inferno, superstar, … |

**Authoring rules in `vocab.js`:**
- The hips sit over the standing foot, and a foot moves only while unweighted.
- Contacts fall on beats; passing positions fall on the "and".
- The torso counter-rotates; the shoulders and head accent the backbeat and the 8ths.

## 5. Character choreography (MVP)

The two hand-built originals are **YOU** (hoodie, backwards cap, headphones —
a b-boy) and **COOL TONI** (pompadour, shades, tracksuit, gold chain — a disco
king). TINA (glam diva) is hand-built too.

| | YOU — b-boy (Heat's lane) | COOL TONI — disco (Hiro's lane) | TINA — diva / jazz (Kelly's lane) |
|---|---|---|---|
| Row 1 | knee bounce / *shoulder bounce* | hip sway / *knee bounce* | hip sway / *shoulder bounce* |
| Row 2 | two-step / *step-clap* | disco point / *Elvis swivel* | catwalk strut / *purse groove* |
| Row 3 | running man / *Roger Rabbit* | Bus Stop / *disco strut* | shoulder rolls / *cross step* |
| Row 4 | Charleston / *lock & pop* | the Hustle / *finger guns* | jazz square / *hair flip* |
| Row 5 | toprock / *isolations* | swivel step / *Elvis legs* | vogue / *shimmy* |
| Row 6 | kick-ball-change / *robot* | kick-ball-change / *funky chicken* | kick-ball-change / *half turn* |
| Row 7 | toprock + kick / *wave & pop* | disco rolls / *half turn* | heart hands / *drop it low* |
| Row 8 | go down / *footwork* → **chair freeze** | pirouette → **the Travolta** | pivot → **diva freeze** |
| Solo | headspin (special) → footwork → freeze | disco inferno (special) → … | superstar (special) → … |

*Italics* = the ★ (harder) line. Idle grooves: each dancer's own 8-count
routines, no specials (Tina's hopping routine was swapped for a hip sway).

## 6. Animation quality — measured

Same metrics for both (`story/dance-metrics.js` rules). Each run is 11
landed commands at 120 BPM, sampled at 30 fps. "Before" is the previous
commit's dance system, measured in a separate checkout and driven the way the
old battle scheduled moves.

| YOU / TONI / TINA | before (std line · ★ line) | now (std line · ★ line) |
|---|---|---|
| frames flipping / airborne outside the solo | 0·70% / 7·0% / 2·75% | **0% everywhere** |
| planted-foot skating frames | 34·10 / 244·67 / 147·41 | **0·0 / 0·0 / 0·0** |
| foot contacts within 45 ms of an 8th note | 39·32% / 83·32% / 47·51% | **74·77% / 91·60% / 73·76%** |
| mean contact offset from the 8th grid | 62·73 / 38·73 / 47·51 ms | **39·42 / 27·50 / 32·33 ms** |
| a move's first key on its downbeat | ½ beat late | exact (tested) |
| illegal state transitions | — | 0 |

**Notes on the timing figures:**
- They include transitions. Contacts a 16th early are deliberate ball-changes into a downbeat; pivots and swivels touch between 8ths by design.
- Inside moves (excluding transitions), the MVP lines score 60–100%, with a mean offset from the 16th grid of 14–23 ms.

**Visual checks:**
- Dance View strips of every new move and of whole strings, from front, ¾ and side cameras.
- Live Bust a Beat battles (autoplay, headless), with screenshots of strings, the miss and recovery, and the solo freeze.

## 7. Dance View (`story/dev/danceview.html`, menu: BEAT → DANCE VIEW)

**Choose what plays:**
- **Dancer:** any of the 19.
- **Modes:**

  | Mode | Plays |
  |---|---|
  | STRING | Standard or ★ line, a simulated battle with freezes and rest bars |
  | MOVE | One move looping on the bar |
  | CHAIN | Click moves to build a sequence |
  | MISS | A string with a miss |
  | SOLO | The solo |
  | GROOVE | Idle groove |

- **Move list:** every move with its row tag and FLIP / AIR / spin flags.

**Playback and view:**
- BPM 60–180; speed 0.1× / ¼× / ½× / 1×; scrub; step by 1/16 beat (← / →, space to play).
- Cameras: front, ¾, side, top, low, orbit.
- Overlays: skeleton; foot-contact rings and trails (a slide shows as a streak); metronome; drum hits; mirror.

**Readouts:**
- HUD: move, state, string label, BPM, bar, count, 8-count, phrase, level.
- Live warnings: flips outside designated specials, airborne frames, skating, pose pops, hands through the floor, illegal transitions.
- Timeline: a state ribbon, the beat grid and every foot contact with its offset in ms.

**Automation:** `window.dv` (`set`, `seek`, `shot`, `info`) for tests and screenshots.

## 8. Original vs our improvements

**Kept from the original:**
- One command per bar; the move plays in the next bar.
- The 8-row string with an easier and a harder line.
- Freeze plus a rest bar.
- A miss is a stutter and cuts the string.
- A jammer hit resets the string; attacking and dodging don't break it.
- Fixed solos; Fever-Time victory dance; Dance View.

**Our changes:**
- Levels 1–4 still set the command length; the string row sets the choreography.
- The ★ option appears when enthusiasm is high rather than at every row.
- The hot-streak start on row 3.
- A grounded **dodge** instead of the original's backflip (fewer flips).
- Procedural keyframes plus IK instead of motion capture.
- Mirrored alternate strings.
- Beat-quantized lead-ins; foot-contact timing rules.

## 9. Limitations

- **No footage was watched.** Move content is derived from documented mechanics and from real-world technique for each style, not frame-matched to the original's clips. Hand-built and procedural, not motion-captured.
- **Hands have no IK:** floor contact in `footwork` / `freezeChair` is aimed by hand-tuned angles (the freeze's hand rests at floor height).
- **Bosses' strings are auto-built** from their existing moves (specials filtered); their choreography quality is that of their level modules.
  - Their string moves were cleaned of foot skating: 0–4 frames per 11-bar line, down from up to 380.
  - Glides that are the point of a move are declared as slides: Coco's roller skates, moonwalks, float walks, rave shuffles.
  - Some solo, intro, taunt and spin moves of a few bosses still skate; they're outside the strings.
  - Violetta's pas de chat is a small ballet leap (airborne under 10% of the move).
- **Grid reporting:** some moves (pivots, swivels, half turns) register "contacts" a 16th off the 8th grid by design. Toni's ★ line has a lower on-8th score (60%) because of its pivots.
- **Assets:** to go beyond procedural keyframes, licensed motion sources include Mixamo (free with an Adobe account, usable in games), the CMU Graphics Lab Motion Capture Database (free for research and commercial use), and commercial libraries such as ActorCore / Rokoko. Any of them would need a skinned rig and retargeting onto this joint layout.
