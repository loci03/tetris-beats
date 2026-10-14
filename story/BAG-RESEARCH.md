# Bust a Groove (PS1, 1998; JP "Bust A Move", Metro/Enix): research for a dance-battle animation system

## 0. Method, access limits, confidence tags

**Access (read this first).**
- `WebFetch` failed on every host (DNS `ENOTFOUND`). `curl` was refused by the egress proxy for gamefaqs.gamespot.com, web.archive.org, wikipedia, fandom, strategywiki, tvtropes, archive.org and youtube.com. I could not open the GameFAQs FAQs 3770/3771/3775, the Wayback copies, the archive.org manual, or any YouTube page.
- **I watched no footage.** Nothing below comes from video.
- My secondary-source text comes only from **web-search result snippets**. Each claim cites the page the snippet came from, but I never read those pages in full.
- **Primary data:** I was able to `git clone` a public tool-assisted speedrun of the US game, **fullmoonissue/tas-bust-a-groove** (commit c52a73d, 2019). It contains frame-exact input scripts that beat all 12 1P stages on Hard as **Heat**, plus a hand-encoded command graph. Because it is a working replay against the real game, it is the strongest evidence here. I also used the RetroAchievements set definition (game 16698, via a GitHub mirror).

**Tags used on every claim**
- **[P]** verified from primary data (the TAS input scripts or the RA definitions).
- **[S]** verified from one secondary source, seen as a search snippet. **[S+]** means several independent sources agree.
- **[I]** my inference.
- **[?]** sources conflict, or the claim is unverified.

Source keys are listed in section 9.

---

# PART A: ORIGINAL-GAME MECHANICS

## A1. Measure and input structure
- The song is divided into 4/4 measures. Each measure carries exactly one command: arrows, then a face button. [S+] GB, GF3772, NEGAI, JAWP ("ダンスは4拍子ごとに区切られ、コマンドも4拍単位で表示")
- The on-screen bar is green for beats 1–3, where the arrows go, and shows the face button for beat 4. GF3772 (RYago): *"the green bar represents the first three beats of the line, and the button command represents the fourth beat."* [S]
- **All arrows must be entered before beat 4.** Their exact timing does not matter. **The confirm button (Circle or Cross, whichever the command shows) must land on beat 4.** [S+] NEGAI, 1UP, GB
- TAS data agrees. Every command's final button is pressed **exactly one measure ("cycle") after the previous one**. The arrows are pressed in a burst about 40 frames after the previous confirm, 2 frames apart, and the confirm comes at the end of the cycle. Each command uses one whole measure. Dodge (Square) and Jammer (Triangle) presses also take one whole measure each, in place of a dance command. [P] `scripts/write.lua`, `tas/categories/any%/*.lua`
- The 40-frame arrow offset worked at every tempo (102–138 frames per measure). So the arrow window opens no later than about 30–40% of the way into the measure. [P] My guess that it opens at beat 1 is [I].
- Some sources say that if you miss beat 4 with the arrows already in, you can confirm on the *next* beat 4 instead of re-entering the arrows. [S] (1UP/review snippet) [?] I found no confirmation of this.
- In Easy mode the beat-4 trigger requirement is removed. [S] HG101 snippet

**Measure length per stage.** These are TAS "cycle" values in frames at about 60 fps [P]. The BPM column assumes one cycle = one 4-beat measure, so BPM ≈ 14400 / cycle [I].

| Stage (song) | Cycle (frames) | ≈BPM [I] |
|---|---|---|
| Heat | 104 | 138 |
| Frida | 120 | 120 |
| Kelly | 138 | 104 |
| Hiro | 125 | 115 |
| Pinky | 120 | 120 |
| Capoeira | 130 | 111 |
| Hamm | 130 | 111 |
| Kitty-N | 109 | 132 |
| Gas-O | 102 | 141 |
| Shorty | 110 | 131 |
| Strike | 130 | 111 |
| Robo-Z | 102 | 141 |

The TAS author notes the cycles are "approximate" and needed corrections of about 5–10 frames, which suggests non-integer frame lengths. [P]

## A2. The command lattice (the "dance string")
**Key finding [P]:** normal play is not a flat list of moves per level. It is an **8-row binary lattice** shaped like Pascal's triangle. Row *r* has *r* nodes, except row 8, which has 7.
- Each successful command moves you **down one row**. You pick one of the two children of the node you just completed. The **left child is easier and cheaper; the right child is harder and worth more**.
- In-game the two choices appear as two lines. 1UP says the top line leads to easier commands and the bottom line leads to the hardest and most rewarding ones [S]. HG describes "alternative lines appearing where you can choose which way to bend your dance routine" [S].
- There are 6 binary choices (rows 1→7), and row 7 leads to a single row-8 node. That gives **64 possible full strings** (`scripts/process.lua`, `randomizer.lua`). [P]
- **The lattice is the same for all characters in BAG1.** Only the animations differ. TV Tropes: *"everyone has the same command branches that grant the same amount of points during normal play with their own distinct commands for solos only."* [S] The TAS is Heat-only, so it cannot confirm this independently.

Lattice from `scripts/nodes/combos.lua` [P]. Points per node from the TAS README triangle, "only if you start from the first combo" [P]. `o` = Circle, `X` = Cross. Arrows are D-pad directions.

```
Row1:                         o(100)
Row2:                     X(100)   →o(200)
Row3:                →X(200)  ←o(200)  ↑↑o(600)
Row4:            ↓X(300)  ↓o(600)  ↑↑X(900)  ↑→o(1200)
Row5:        ↑X(400) ↓↓o(800) ←→X(1200) ←→o(1600) ↑↑↑o(2000)
Row6:   →→X(500) →→o(1000) ↓→X(1500) ↓↓↓o(3000) ←←←o(4500) ↑↓←→o(5000)
Row7: ↓↓X(1200) ←←o(1800) ↓↓↓X(2400) ↓↑↓o(4200) →↑→o(5400) ↓↑↓↑o(6000) ↓↓→←←o(6600)
Row8: ↑→X(2100) →→→o(3500) ↑↓↑X(4900) ←→←o(7000) ↑↓↑↓o(7700) ←←↑→→o(7700) ↓←→↑←X(8757)
```

- **Children:** node *i* in row *r* leads to nodes *i* (left) and *i+1* (right) in row *r+1*. Example: `↓o` leads to `↓↓o` or `←→X`. Each row-7 node *i* leads only to row-8 node *i*.
- **Command length by row** [P]:

| Row | Arrows |
|---|---|
| 1 | 0 |
| 2 | 0–1 |
| 3–4 | 1–2 |
| 5 | 1–3 |
| 6 | 2–4 |
| 7–8 | 2–5 |

  The maximum is 5 arrows plus a button. This matches HG's "five at the most" [S].
- **Row names.** Sources say "the final patterns in a combo are marked **Cool, Chillin', and Freeze**, the last being the toughest and most valuable, capping off the combo and giving you 4 beats to rest before the next one starts" (NEGAI) [S]. WP describes three levels of moves after five moves, labelled COOL / CHILLIN' / FREEZE from lowest to highest [S]. My mapping of row 6 = COOL, row 7 = CHILLIN', row 8 = FREEZE is [I], with fairly high confidence.

## A3. Success, miss, and the dance-level gauge
- **Success:** you score the node's points and advance one row. The dancer performs that node's move. [P] for the advance; [S+] for the points.
- **Miss:** an arrow not entered in time, or a confirm not on beat 4. *"you get a 'miss,' which cuts your combo short"* (NEGAI) [S]. GameSpot: *"Miss a beat, and your dancer stutters, unable to perform his move."* [S]
  - I infer the string resets to row 1 on a miss [I]. JAWP states this explicitly for jammer hits ("コンボも0に戻ります") [S].
- **Gauge.** It is called the "Enthusiasm Gauge" in the US manual table of contents and on the box [S] (MAN, EBAY), and ノリノリゲージ in JP [S] (JAWP/ATW).
  - It rises with good dancing and with harder commands, and falls on misses and jammer hits [S+].
  - The JP sources say that a higher gauge makes the dancing flashier and the combos longer ("ダンスがより派手になったりコンボが長くなったり") [S].
- **After a full 8-command string:**
  - There is **one measure with no input**: the Freeze/pose measure, the "4 beats to rest" [P][S]. Another source: *"After a successful pose input, dance commands won't appear for one measure, after which the player begins a new dance string."* [S]
  - The next string usually restarts at row 1, but the TAS shows starts "forwarded" to row 2 or 3. For example, Heat stage sequence 2 began at `←o` (row 3), and Frida sequence 4 began at `→X`. [P] **What decides the start row is unknown** [?]. A fan wiki says "when the player performs a combo of eight dance moves, new paths with more complex moves open up" [S].
- A Freeze finished too close to a solo or the end of the song auto-fails, because some sections have odd measure counts (TVT) [S]. Shorty's mouse Columbo jumps out to dance if she lands a "level seven freeze" (WP) [S]. That suggests the levels are numbered 0–7, which is [I].

## A4. Solos
- Each song has fixed **solo segments of 2–4 measures** [S] (GB). The TAS shows segments of 2 and 4 commands [P]. The TAS author labels them "All eyes on me". That is his label; I could not confirm it as in-game text.
- No attacks are allowed during solos, and Dodge is unavailable [S] (GB, FAN-J). A cheat site says a jammer landed just before the opponent's solo "steals" it [S] [?].
- A solo is a **fixed 4-command string with no branching**. `scripts/randomizer.lua` describes "2 common + 1 secret" solos per character [P]. RA has an achievement: *"Do a set of 4 high scoring moves during a solo"* [P].
- Heat's solos [P] (`scripts/nodes/heat/`):

| Solo | Commands |
|---|---|
| Solo 1 | `↓X, ↑↑X, ↑→X, →←X` |
| Solo 2 | `↑↑o, ↓↓o, →→→o, ←←←o` |
| Secret | `↑↓↑o, ↓↑↓X, →←→o, ↓↑↓o` |

- **Secret-solo openers** from cheat sites (SC, CheatCodes) [S]. They list only the first command of each. Heat's opener matches the TAS [P], which partly validates the list.

| Character | Secret-solo opener |
|---|---|
| Heat | ↑↓↑o |
| Frida | ↑↓↑o |
| Hiro | →↑↓o |
| Kelly | →←→o |
| Shorty (and Columbo) | ↓↓↓o |
| Strike | ↑↑←o |
| Hamm (and Burger Dog) | ↓→←o |
| Pinky | ↑←↑o |
| Gas-O | ←↓→↑o |
| Kitty-N | ↓↓→o |
| Capoeira | →↑→X |
| Robo-Z | ↑↓←→o |

## A5. Jammer and Dodge
- **Jammer:** press Triangle on beat 4 (instead of Circle/Cross). There is **one jammer per character, usable twice per battle** [S+] (FAN-J, GB, JAWP "回数に制限"). The TAS never uses more than 2 per stage [P].
- **Dodge:** press Square **on the next beat 4** (JAWP: "受けた側は次の4拍目で□ボタンを押すと回避") [S]. The dodge is a **backflip/somersault** [S+] (FAN-J, other search snippets). Dodges are unlimited, but unavailable during solos [S].
- **Neither action breaks your own string.** The TAS inserts Triangle or Square measures in the middle of strings and then resumes at the next row. Examples [P]:
  - Hiro: `←→X, ↓↓↓o, □, □, ↓↑↓o, ←→←o`
  - Kelly: `o, △, △, →o`
- **On being hit:** the gauge drops and the combo goes back to 0 (JAWP) [S]. The target "stop[s] dancing for several bars" (FAN-J) [S]. A hit just before a solo can cost "a measure or two of inputs" (GB) [S]. Hamm's burger leaves the victim "flat for a few bars" [S].
- If the target lands a Freeze just as the jammer hits, they are immune (FAN-J) [S].
- Each character's jammer is a themed projectile or effect [S+]:

| Character | Jammer |
|---|---|
| Heat | A giant flame falls on the opponent |
| Frida | A painted wolf's head bites |
| Hiro | Throws a signed photo of himself |
| Kelly | Sparkles thrown from a rattle |
| Strike | Two pistols fired at the rival's feet |
| Hamm | A giant burger flattens the rival |
| Shorty | Giant candy (or cake) falls |
| Kitty-N | Heart boomerang or pink light [?] |
| Pinky | Tarot cards fall around the rival |
| Gas-O | Gas chamber |
| Capoeira | Wall of energy |
| Robo-Z | Shockwave [?] |

## A6. Scoring, winning, round flow, presentation
- Points per node are in A2. Harder branches pay more [P][S].
- The winner is the higher score when the song ends, and draws are possible (GB) [S]. Grokipedia says the Enthusiasm bar decides instead [?] (low reliability).
- **One battle = one song.** The song alternates normal sections (both dancers run their strings at the same time, independently) with solo sections [S+] (HG, GB). The 1P mode has 12 stages; the TAS order is Heat, Frida, Kelly, Hiro, Pinky, **Capoeira** (mid-boss), Hamm, Kitty-N, Gas-O, Shorty, Strike, **Robo-Z** (final) [P][S].
- **Fever Time:** after the song, a winner with a high enough score gets an automatic victory solo dance with no input (GB and others) [S]. It is skippable with Cross [P] ("Skip Fever Time" in 10 of the 12 TAS stages).
- **Camera:** it drifts and zooms toward whoever leads on score, and can push the trailing dancer out of frame (GB) [S].
- I found **no source on intro or taunt animations or defeat animations** for BAG1. A BAG2 forum post mentions three win animations per character (BAG2 only) [S].

## A7. Modes relevant to animation
- **Practice:** shows the point value of every command in the tree (TVT) [S]. It can also display the gauge level (JAWP) [S].
- **No Command Display:** you must play from memory [S+]. RA has an achievement: "Beat a stage ... with command display turned off" [P].
- **Dance View:** unlocked per character by clearing 1P mode with that character [S+] (GB, DREW). One listing says Normal difficulty [?].
  - It lets you watch each character's dance animations from various camera angles and at various speeds, and build sequences ("choreograph the dancing plus the camera angles", E3 press release [S]).
  - The "Dance Edit" label on the US box refers to this sequencing feature [S].
- **Motion capture:** "over 1000 individually motion captured dance moves" (E3 1998 press release) [S]. The box says 10 professional dancers were captured [S]. GameSpot called the mocap the showstopper [S].

---

# PART B: MOVE-LIST STRUCTURE PER CHARACTER

- **Number of moves:** each character needs one animation per lattice node.

| Node type | Count |
|---|---|
| Normal-play nodes (rows 1–7: 28, row 8: 7) | 35 |
| Solo moves (3 solos × 4) | 12 |
| Freeze/pose, dodge backflip, jammer cast, hit reaction, Fever Time | extras |

  Under 50 core clips per character [I], derived from [P] and [S]. That is consistent with "over 1000 moves" across 12–14 characters [I].
- **Sequence:** a string of up to 8 moves advances one node per success. You steer it by choosing branches, so a string is a path through the lattice, not a fixed list. [P]
- **Freeze ends a string** (row 8), and then one rest measure follows [P][S].
- **On a miss** the string goes back to the top [S]/[I]. On a jammer hit the combo goes to 0 [S].
- **How moves escalate:** command length and points grow with depth and with how far right the path goes [P]. The idea that the *animations* also get bigger is supported only by JP "ダンスがより派手に" [S] and HG's "more exotic" combinations [S]. Clip-level detail is unverified.
- **Move lists with names:** **I found none.** The GameFAQs move FAQs (3770/3771/3773/3775) could not be read, and no snippet gave per-move names. The usable "move lists" are therefore:
  - the shared lattice (A2), which is valid for Heat, Frida, Hiro, Kelly, Shorty and Strike alike, per TVT;
  - Heat's three solos (A4, [P]);
  - the secret-solo openers for every character (A4, [S]).

---

# PART C: ANIMATION BEHAVIOUR IN THE ORIGINAL (verified vs inferred)

| Behaviour | Status |
|---|---|
| Dancers keep dancing between commands; one clip per command per measure | [I] from the structure: one command per measure, no idle measures inside a string [P] |
| A move plays in the measure after its input | [I], fairly high confidence. The confirm is the last beat of the input measure and the next command's input overlaps. The forced post-Freeze rest measure [P][S] is the clearest sign that a move occupies the measure after its confirm. No source states it directly. |
| Miss leads to a "stutter", with the move not performed | [S] GS. BAG2 uses a "stumble" [S] SIL. |
| Dodge is a backflip/somersault | [S+] |
| Jammer hit stops the target's dancing for several bars; Hamm's burger leaves the victim flat for a few bars | [S] |
| Freeze ends a string with a pose held for 4 beats | [S] + [P] |
| Shorty's level-7 Freeze makes Columbo pop out and dance | [S] |
| Fever Time is an automatic winner's solo after the song | [S], with skip confirmed [P] |
| Camera zooms toward the leader | [S] |
| Intro, taunt and defeat animations | **not found** |
| Dance View shows every clip, with camera, speed and sequencing; unlocked per character | [S] |

---

# PART D: CHARACTER STYLES AND ACROBATICS

| Char | Style (sources) | Conf. |
|---|---|---|
| Heat | Breakdance (WP); "b-boy flair" (GB); East Coast hip-hop (TVT) | S+ |
| Frida | West Coast / California hip-hop (TVT, HG101); "pop-lock" (GB) | S+ |
| Hiro | '70s disco, patterned after Travolta in *Saturday Night Fever* (GB, WP) | S+ |
| Kelly | Modern jazz (HG101) | S |
| Strike | "Gangsta" (HG101, unnamed character, probably Strike); rough hip-hop / pop-locking (GB) | S/? |
| Shorty | Not found. The brief says "playful hip-hop"; Columbo, who reuses her stage, is "candy hip-hop" (TVT) | ? |
| Hamm | Detroit Modern (HG101) / urban street (GB) / hip-hop (fandom) | ? |
| Kitty-N | Vogue (HG101) | S |
| Gas-O | Breaking (GB) / house (TVT, Gamicus) | ? |
| Pinky | "Motown?" (fandom, with the question mark) | ? |
| Capoeira | Capoeira (WP) | S |
| Robo-Z | One snippet says "Vogue" [?]; robot style is plausible [I] | ? |
| Burger Dog | Dances Hamm's style (HG101); "modern dance" (TVT) | S |
| Columbo | Candy hip-hop (TVT) | S |

**Acrobatics.** Verified:
- a universal backflip dodge [S+];
- two breakers (Heat, Gas-O) [S];
- a capoeirista whose art is inherently acrobatic [S].

Unverified: how often the original used power moves (windmills, headspins) compared with grounded dancing. No source describes specific clips [?]. Without footage, my best inference is mostly grounded steps in rows 1–5, with flashier and acrobatic moves and freezes in rows 6–8 and in solos [I].

---

# PART E: REUSABLE MOVEMENT PATTERNS (for keyframing)

**Provenance.** Patterns marked **ORIG** behave as the original game is documented to behave. All others are **DERIVED** from real-world technique of the styles the characters represent; they are not taken from the game's clips.

**Conventions**
- 1 measure = counts `1 & 2 & 3 & 4 &`. Times are given in beats from the clip start (0.0 = count 1).
- R/L are the dancer's own right and left. Leg length L = 1.0; hip height is a fraction of L.

**Stances**
- **S0 Groove-neutral:**
  - Feet about 1.1× hip width, toes out about 10°.
  - Hips 0.95 L, weight 50/50.
  - Chest upright with a slight forward pitch (+3°).
  - Elbows bent about 25°, hands at hip height.
- **S1 Low groove:**
  - Hips 0.88 L, chest pitched forward 10°.
  - Elbows 70–90°, hands at the navel.
- **S2 Floor crouch:**
  - Hips 0.45 L, chest pitched forward 40°.
  - Arms reaching to the floor in front of the feet, since the rig has no hand IK.
- **S3 Ginga base:**
  - Feet 1.5× shoulder width, hips 0.80 L.
  - Torso pitched forward 15°, one forearm guarding the face.

Unless stated otherwise, every clip **starts and ends in S0 at a downbeat**, so any clip can follow any other.

**P1 Down-groove bounce** (hip-hop baseline for all hip-hop characters; DERIVED)
- **Duration:** 1 beat, looping.
- **Counts:**
  - On each count, the knees flex: hips drop 0.05 L, the spine flexes 6° and the chest contracts.
  - The head nods 8° down, lagging 1/8 beat behind the chest.
  - On "&", everything rebounds to neutral.
- **Optional:** a hip side-shift of ±0.03 L every 2 beats, swaying weight between the feet.
- **Arms** swing slightly with the chest.
- **Stance:** S0 to S0. Use this as the **continuous groove layer** under everything.

**P2 Up-groove** (house/disco: Hiro, Gas-O, Pinky; DERIVED)
- **Duration:** 1 beat, looping.
- **Counts:**
  - On the count, the hips rise (knees extend), the chest lifts with a 4° arch, and the chin lifts.
  - On "&", the dancer drops.
- This is P1 with the phase reversed. **Stance:** S0 to S0.

**P3 Step-touch / two-step** (rows 1–2 filler for everyone; DERIVED)
- **Duration:** 4 beats.
- **Counts:**
  - 1: R steps out sideways 0.35 L; weight goes fully to R; knee dip on landing.
  - 2: L taps beside R with no weight; the chest yaws 10° toward L.
  - 3: L steps out sideways; weight to L.
  - 4: R taps beside L.
- **Arms** swing in opposition, or snap fingers at the chest on the taps. The head nods on 1 and 3.
- **Stance:** S0 to S0. Add a closing step if foot positions drift.

**P4 Indian step** (breaking toprock: Heat, Gas-O; DERIVED)
- **Duration:** 4 beats.
- **Counts:**
  - 1: R foot crosses forward-left in front of L, heel touching with toes up; weight 80% on L.
  - 1&: a small bounce on L.
  - 2: R returns to centre, weight 50/50.
  - 3–4: mirror on the other side.
- **Upper body:**
  - On the cross, the torso leans back 5° and the chest yaws 15° toward the crossing side.
  - The arms open: the crossing-side arm sweeps across the chest and the other arm goes out to the side.
  - On 2 and 4, the arms close in front of the chest.
- **Stance:** S0 to S0. This is the standard entry into P5.

**P5 Six-step** (breaking downrock: Heat, Gas-O; DERIVED)
- **Duration:** 4 beats, fast version on `1 & 2 & 3 &` with 4 = settle; or 8 beats at the old-school pace.
- **Stance:** S2 to S2.
- **The circle:**
  - The arms stay planted towards the floor as the support point.
  - The legs walk a circle around the hands: R crosses in front of L; L steps out left; R steps back (legs wide, plank-like); L crosses behind R; R steps out right; L returns to the start.
  - The root yaws about 60° per step, 360° in total.
  - The hips stay at 0.35–0.5 L, and the head stays over the hands.
- **Entry from S0:** 1 beat (4& before: drop to S2). **Exit:** a 1-beat stand-up, or chain into P6.

**P6 Freeze, two variants** (row 8 "Freeze" finisher; ORIG concept, DERIVED shapes)
- The original documents a Freeze as a string-ending pose followed by a 4-beat rest [S][P].
- **(a) Standing b-boy stance** (all hip-hop characters):
  - 4&: a sharp hit into the pose.
  - The pose: weight 70% on the back foot, front foot turned out, hips 0.92 L, chest leaning back 8°, arms folded or one fist up, chin up and head turned to camera.
  - Hold 1–3 with a tiny breathing motion; 4 = release to S0.
- **(b) Baby freeze** (Heat, Gas-O):
  - 4&: drop to S2.
  - 1: the root rolls about 80° so the body is near horizontal; the head lands near the floor; both arms brace under the hips; the knees tuck (feet off the ground, IK targets near the hips).
  - Hold to 3&. On 4, roll back to S2 and stand.
  - Needs 1 beat of entry and about 1 beat of exit.

**P7 Backflip dodge** (ORIG: Square on beat 4 triggers a backflip [S+])
- **Duration:** 4 beats.
- **Counts:**
  - 4 (the input): crouch to hips 0.6 L, arms swing back.
  - 4&: take off; arms swing up; hips rise to 1.25 L.
  - 1: the root pitches −180° (inverted); knees tucked; feet IK released from the floor.
  - 1&: rotation completes −360°.
  - 2: land in a crouch, hips 0.6 L, arms forward for balance.
  - 3–4: rise to S0.
- Airtime is about 0.6 s, roughly 1.2 beats at 120 BPM.

**P8 Arm wave and chest pop** (popping: Frida, Strike; DERIVED)
- **Duration:** 4 beats.
- **Counts:**
  - 1: chest pop. The chest moves forward 0.03 L in 1/16 beat, then holds; the knees snap straight 5°; the head stays fixed in world space as an isolation.
  - 2–2&: the wave travels from the L wrist to the L elbow (raises) to the L shoulder (shrugs).
  - 3–3&: it continues across the chest to the R shoulder, R elbow and R wrist. Offset each joint by 1/8 beat.
  - 4: chest pop plus a hit pose.
- Pops use a very fast ease-in and a hold, not a smooth curve. **Stance:** S0 to S0.

**P9 Wrist-roll, lock and point** (locking: Frida, Strike, Hamm; DERIVED)
- **Duration:** 4 beats.
- **Counts:**
  - 1: wrist roll. The forearms circle each other in front of the chest.
  - 2: lock. A sudden stop: half-squat to hips 0.88 L, elbows bent, hands up near the shoulders, head snapping to the side. Hold 1/2 beat.
  - 3: point. The R arm extends diagonally forward-up; weight shifts to L; L hand on the hip.
  - 4: clap in front of the chest and step back to centre.
- **Stance:** S0 to S0.

**P10 Running man** (hip-hop/house: Shorty, Frida, Gas-O; DERIVED)
- **Duration:** 2 beats per cycle, done twice per measure.
- **Counts:**
  - 1: L foot lands in front, weight on L, R foot behind.
  - &: R knee lifts to hip height while the L support foot **slides back** under the hips. The foot IK target glides with ground contact kept.
  - 2: R lands in front.
  - &: L knee lifts while R slides back.
- **Arms** pump like running (opposite to the knee), elbows at 90°. The torso pitches forward 5° and bounces on each landing.
- **Stance:** S0 to S0.

**P11 Cabbage patch** (old-school hip-hop: Shorty, Columbo, Hamm; DERIVED)
- **Duration:** 4 beats, two circles of 2 beats each.
- **Movement:**
  - Fists together in front of the chest with elbows out.
  - The forearms trace a flat horizontal ellipse, radius about 0.15 L.
  - The hips circle in the **opposite** direction.
  - The knees bounce on every count and the head bobs.
- **Stance:** S1 to S1. Blend from and to S0 over 1/2 beat.

**P12 Kick-ball-change** (playful: Shorty, Kelly, Hiro; DERIVED)
- **Duration:** 2 beats, mirrored over the next 2.
- **Counts:**
  - 1: low R kick forward; the foot reaches 0.3 L forward and 0.15 L up; the body counter-leans back 5°.
  - &: R ball steps down beside L, a quick weight transfer.
  - 2: change, stepping onto L.
  - 3&4: mirror on the other side.
- **Arms** swing loosely; elbows pump on the kick.
- **Stance:** S0 to S0.

**P13 Disco point** ("Saturday Night Fever": Hiro; DERIVED)
- Hiro being modelled on Travolta is [S]; the move itself being in the game is [I].
- **Duration:** 4 beats.
- **Counts:**
  - 1: R arm thrusts up diagonally, shoulder flexed about 150° with index finger extended; L hand on the hip; hips push right; weight to R; the head follows the hand up.
  - 2: R arm sweeps down across the body to point at the floor by the L foot; hips push left; knees bend; the head looks down.
  - 3–4: repeat.
- **Feet:** step R out on 1 and close on 2, or stay planted with knee pumps.
- **Stance:** S0 to S0.

**P14 Disco side-step, hip bump and arm roll** (Hiro, Pinky; DERIVED)
- **Duration:** 4 beats.
- **Counts:**
  - 1: R steps out sideways.
  - 2: L closes; hip bump to the right (hips +0.06 L, yaw 10°); the forearms roll around each other in front of the chest.
  - 3: R steps out again.
  - 4: L taps, with a clap or a point up.
- Mirror it to travel back. **Stance:** S0 to S0.

**P15 Jazz square with port de bras** (modern jazz: Kelly; DERIVED)
- **Duration:** 4 beats.
- **Counts:**
  - 1: R crosses over in front of L, weight to R.
  - 2: L steps back, weight to L, slight chest contraction.
  - 3: R steps out to the right side.
  - 4: L steps forward to close.
- **Arms:** open to second position on 1, sweep low on 2–3, jazz hands up and out on 4. The chest works in opposition to the hips; the head spots front.
- **Stance:** S0 to S0.

**P16 Pirouette to layout** (Kelly; DERIVED; acrobatic-lite)
- **Duration:** 4 beats.
- **Counts:**
  - 4& before: preparation. Plié in fourth position (hips 0.88 L), arms in first position.
  - 1: relevé on L, raising the heel (hip +0.04 L); the R foot IK target goes to passé at the L knee; arms rounded in front of the chest.
  - 1–2: a 360° root yaw on the L ball. Weight must stay directly over the support foot.
  - 3: land in a lunge, arms open to second.
  - 4: layout pose. The chest arches 15°, arms in a high V, head tilted up.
- **Stance:** S0 to S0. The final pose is held into the downbeat.

**P17 Body roll / wave** (Pinky, Kelly, Kitty-N; DERIVED)
- **Duration:** 2 beats, looping.
- **Movement:** a top-down segmental wave with each segment lagging the previous by 1/8 beat.
  - The head moves forward.
  - The chest pushes forward and up, arching 10°.
  - The belly and hips push forward.
  - The knees bend forward as the hips go back.
  - Then everything resets.
- **Arms** trace down along the body. **Stance:** S0 to S0.

**P18 Vogue catwalk, hands and dip** (Kitty-N, Robo-Z [?]; DERIVED)
- **Duration:** 4 beats, plus an optional dip as a Freeze.
- **Counts:**
  - 1: catwalk step, R crossing in front of L; hips swing right 0.05 L.
  - 2: L crosses in front of R; hips swing left; shoulders back; chin up.
  - 3 & 3&: hand performance. Sharp hits of the hands framing the face, elbows up, wrists angled.
  - 4: picture pose, hip popped, weight on the back leg.
- **Dip (Freeze variant):** over 1/2 beat, one leg extends forward while the other folds under; the hips fall to 0.1 L and the spine extends back.
- **Stance:** S0 to S0, or to a floor pose.

**P19 C-walk heel-toe** (West Coast "gangsta walk": Strike; DERIVED)
- **Duration:** 4 beats.
- **Counts:**
  - 1: R heel taps forward-diagonal, toes up; L pivots on its ball, toes out.
  - &: both feet pivot toes-in; R returns.
  - 2: L heel taps forward-diagonal.
  - &: toes-in pivot.
  - 3–4: shuffle. R slides across in front of L, then both pivot so the hips twist 20°, and back.
- **Upper body:** loose shoulders, slight lean back of 5°, hands low or one hand pointing down and forward.
- **Stance:** S0 to S0. Feet slide on IK.

**P20 Lean-back shoulder bounce** (Strike, Hamm, any hip-hop row-1 move; DERIVED)
- **Duration:** 2 beats, looping.
- **Counts:**
  - 1: the spine extends back 8° with weight on the heels; the R shoulder shrugs up 0.04 L; the head tilts right.
  - &: settle.
  - 2: L shoulder shrugs.
  - &: settle.
- Layer P1 on top. **Stance:** S0 to S0.

**P21 Ginga** (Capoeira; DERIVED)
- **Duration:** 4 beats.
- **Counts:**
  - 1: R foot steps back diagonally into a lunge; weight 60% on the front leg; R forearm guards the face; L hand low in front of the belly; torso pitched forward 15° and yawed slightly.
  - 2: R returns to the wide parallel base (S3), arms switching.
  - 3–4: mirror on the other side.
- The knees never straighten and the head always tracks the opponent.
- **Acrobatic extension for rows 6–8:** an aú (cartwheel). The root rolls 360° about the forward axis over 2 beats, the hands brush the floor, and the feet arc overhead.
- **Stance:** S3 to S3. Use 1/2-beat blends to and from S0.

**P22 Robot ticks** (Robo-Z; DERIVED)
- **Duration:** 4 beats, 8 ticks.
- **Counts:**
  - 1: head yaws 45° right.
  - &: R upper arm abducts to 90°.
  - 2: R elbow bends 90° up.
  - &: torso yaws 30° right.
  - 3: L arm mirrors the right.
  - &: knees flex 10°.
  - 4: head snaps back to centre.
  - &: hold.
- **Rule:** only one or two joints move per tick. Use linear interpolation with a hard stop plus a 2° rebound. Everything else stays frozen.
- **Stance:** S0 to S0.

**P23 Moonwalk / backslide** (Hiro, Frida, Strike; DERIVED)
- **Duration:** 2 beats per step pair.
- **Counts:**
  - Start: R flat, L on its ball with the heel up, L in front.
  - 1: R slides straight back with the foot flat and IK keeping ground contact.
  - &: switch; the L heel drops and the R heel rises.
  - 2: L slides back.
  - &: switch.
- **Weight** stays on the heel-up foot; the torso leans forward 5°. It travels backwards about 0.3 L per beat.
- **Stance:** S0 to S0.

**P24 Miss stutter / stumble** (ORIG concept: "dancer stutters, unable to perform his move" [S]; DERIVED keys)
- **Duration:** 4 beats.
- **Counts:**
  - 1: one knee buckles (hips −0.08 L and tilted 8°); the arms flare out.
  - 1&: torso pitches forward 15°.
  - 2: a catch step forward.
  - 3: straighten up with a head shake of ±15°.
  - 4: re-enter P1.
- **Stance:** S0 to S0.

**P25 Jammer hit reaction** (ORIG: stops dancing for "several bars" [S]; DERIVED keys)
- **Duration:** 4–8 beats.
- **Counts:**
  - 1: flinch. The chest jerks back 12°, the arms come up to guard, the hips drop 0.05 L.
  - 1&–2: one stagger step back.
  - 3–4: dazed sway, a slow root roll of ±5°.
  - Optional 2nd measure: a character-specific reaction (for example, flattened by Hamm's burger: hips 0.3 L with the chest squashed), then recover to S0 on the last beat.

**Suggested mapping to lattice rows (proposal):**
- Rows 1–2 use grooves: P1, P2, P3, P20.
- Rows 3–5 use signature steps: P4, P9, P10, P12, P13, P14, P15, P19, P21, P22, P23.
- Rows 6–7 (COOL / CHILLIN') use high-energy combinations: P5, P8, P11, P16, P17, P18, aú.
- Row 8 (FREEZE) uses P6 or the P18 dip, held through the rest measure.
- Solos use each character's showiest 4-clip chain.

---

# PART F: PROPOSED IMPROVEMENTS (not in the original)

1. **Two-layer animation.**
   - A continuous groove layer (P1 or P2, phase-locked to the beat clock) runs at all times.
   - Command clips are blended on top, 4 beats long and starting at the downbeat after the confirm.
   - This avoids dead frames when no clip is playing.
2. **Strict timeline contract.**
   - The input for command *n* happens in measure *m* (confirm on beat 4).
   - Clip *n* plays during measure *m+1* while command *n+1* is being entered.
   - Every clip begins and ends in S0 on a downbeat, so any node can follow any node.
   - Row 8 adds a forced Freeze-hold measure, matching the original.
3. **Beat-quantized reactions.**
   - All beat-4 actions resolve at the next downbeat: the move, the jammer launch, the dodge flip, the hit.
   - A jammer cast on beat 4 of *m* travels during *m+1*. The target confirms Square on beat 4 of *m+1* (as in the original). The impact or flip happens at the downbeat of *m+2*.
4. **Graded timing.** Use Perfect / Good / Miss windows (BAG2 added "perfect hit" flashes [S]) to scale animation amplitude. For example, a Perfect gives +10% extension and an extra head snap.
5. **Miss behaviour.** Play the 1-measure stutter (P24), reset to row 1, and drop the gauge. Make the original's "confirm on the next beat 4" leniency an explicit, optional rule.
6. **Escalation by row.** Scale energy procedurally with depth: deeper knee flexion, larger arm arcs, more root travel. That way even 8 authored clips per character can cover 35 nodes, using mirroring and amplitude variants.
7. **Freeze safety.** Instead of the original's auto-fail when a Freeze lands at a section boundary [S], force a held pose, as BAG2 did [S].
8. **Foot locking.** Keep foot IK pinned during support phases. Allow only the authored slides (running man, moonwalk, six-step) to unpin.
9. **A Dance View-style debug mode.** Scrub any clip at any BPM with a free camera. Useful for authoring, and it matches the original's unlockable mode.

---

## 9. Sources
(S) means seen only as a search-result snippet. (P) means read in full.

- **TAS (P):** github.com/fullmoonissue/tas-bust-a-groove @ c52a73df. Files used: README.md, scripts/nodes/combos.lua, scripts/nodes/heat/solo-1.lua, solo-2.lua and solo-secret.lua, scripts/process.lua, scripts/write.lua, scripts/randomizer.lua, tas/categories/any%/1-heat.lua through 12-robo-z.lua, and mxwell-graph.txt / graph.png. The run's video (youtube.com/watch?v=Kxq-E8L_lfY) was **not** watched.
- **RA (P):** raw.githubusercontent.com/hoanghdtv/achievements/main/16698.json, a mirror of retroachievements.org/game/16698.
- **GF3772 (S):** gamefaqs.gamespot.com/ps/196846-bust-a-groove/faqs/3772 (RYago). **GF3773** (LaPierre, "High Scoring Moves") is referenced by the TAS but could not be read. **GF3770/3771/3775:** inaccessible (proxy 403, Wayback blocked).
- **WP (S):** en.wikipedia.org/wiki/Bust_a_Groove. **JAWP (S):** ja.wikipedia.org/wiki/バスト_ア_ムーブ. **ATW (S):** w.atwiki.jp/gcmatome/pages/3862.html.
- **GB (S):** giantbomb.com/bust-a-groove/3030-19513/
- **TVT (S):** tvtropes.org/pmwiki/pmwiki.php/VideoGame/BustAGroove and /Characters/BustAGroove
- **FAN-J (S):** bust-a-groove.fandom.com/wiki/Jammer. Also used: /wiki/Bust_A_Groove, /wiki/Heat, /wiki/Hamm, /wiki/Pinky, /wiki/Special_moves.
- **HG (S):** honestgamers.com/2136/playstation/bust-a-groove/review.html. **HG101 (S):** hardcoregaming101.net/bust-a-groove/
- **GS (S):** gamespot.com/reviews/bust-a-groove-review/1900-2546923/
- **NEGAI (S):** negaijapan.com/en/blog/details/36/bust-a-move-dance-and-rhythm-action
- **1UP (S):** 1upinfinite.org/bust-a-groove-helped-pioneer-console-rhythm-games/ and /bust-a-groove-2-retrospect-review/
- **SC (S):** supercheats.com/playstation/bustagroove.htm. Also cheatcodes.com/guide/strategy-guide-bust-a-groove-playstation-12107/
- **MAN (S):** archive.org/download/bust-a-groove_english/bust-a-groove_english_text.pdf (table of contents only, via snippet)
- **E3 (S):** 989 Studios E3 1998 press release, bag-rel.rtf, on discmaster.textfiles.com
- **EBAY (S):** eBay listings quoting the box text
- **DREW (S):** drew1440.com/2022/02/01/bust-a-groove/
- **MOBY (S):** mobygames.com/game/3840/bust-a-groove/
- **SIL (S, BAG2):** siliconera.com/bust-a-groove-2-is-the-weirdest-and-best-psx-rhythm-game/
- **Grokipedia (S):** low reliability; flagged where used.
