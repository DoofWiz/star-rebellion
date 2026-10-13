# High Command, playtest 1: your feedback and my proposal

**Status: approved 13 October**, with the answers in §6. Built in the phases in §4; all four are built. `docs/DESIGN_BLOCKERS.md` C-69.1
(the Resolved log) records the decision, C-69 what I chose building it.

---

## 1. Your notes (12 October, after playing High Command), verbatim

1. The map is way too small.
2. Ships are a bit too close to one another.
3. Ships in a 'dogfight' while in tight formation don't have dynamic gameplay, they just turn around easily and
   confront one another. I think we need to make turning at the slowest speeds weaker to promote flying defensively
   and to allow for interesting pursuits and gameplay to happen.
4. Ships need to be faster by default.
5. If the objective is complete, we need to add the means for the player's ships to get the mission complete by using
   the same jump point.
6. After playing, it seems like the way formations currently work is more heavily influencing how I think the game
   should play as a whole.
   1. Ships that are in tight formation tend to just bunch up and turn constantly and it rewards them as they can get
      lots of hits off like that due to the superior turn speed. This feels bad and either we scrap the formation or
      rework the logic to make it
   2. I think the general behaviour of hit and run is really good and is closer to the default attack behaviour I was
      hoping for. Ships fly toward a target and get shots off on them, then fly past and turn around for another clean
      run.
   3. Trying loose formation: with the FT-4 cross against motes, they just turn around each other. neither can gain an
      advantage. And this is too fixed behaviour by my ships AI. Why do they default to 'bad' behaviour just because
      they're in a loose formation? If they can't turn to get a good shot, they ought to automatically start trying
      other tactics within the orders I've given them.
   4. Screen seems ok and its very specifically focused so we can leave that for now.
   5. Pincer seems cool and I like how it works in terms of ship behaviour, but the enemy ships seemd to exploit it very
      easily since they can just turn on a dime and shoot.
   6. All in all, I think either formations need to be something determined by the wings autonomously so they can opt
      for the right formation in any given moment, or we need to rework some of them.
7. I think the order panel should pop up just above the wing that's been selected rather than being in the top left.
8. I think Commands should be bigger and should be near the timer and open out upward instead of downward. Same with
   command points.
9. I think combat dialog should be little speech bubbles next to the ship that's saying them in addition to the event
   log - they should literally pop up and then pop down after 2 seconds.
10. After playing with the sliders I found a gun range maxxed out was closer to how I wanted this to be.
11. After playing with the sliders I found that a faster top speed was about right as I assume that's how boosting
    works.

---

## 2. Why it plays like that today (the diagnosis)

- **Turning is far too strong for the distances involved.** A ship's tightest turn comes straight from the dial: a
  Talon or a Mote can turn on a 95-unit radius, a Cross or a Scimitar on 191. Guns reach 900. So a Mote reverses
  course in about 300 units, a third of its gun range, and two ships that meet just keep each other in their guns by
  turning. On top of that, **the turn is the same tightness at any speed, and ships brake into hard turns**, so
  slowing down costs nothing. And the nose may lead the line of flight by 0.42 rad on top of the guns' 0.55 rad arc,
  so a turning ship can shoot almost 1 rad (55°) off the way it's going.
- **Motes out-turn the Cross two to one** (radius 95 against 191). In any turning fight the Cross loses or, with
  wingmates, circles forever: the "turn around each other" you saw.
- **The fighting move is fixed by the tactic.** Tight and Spread both use the same pursuit move (go for the point
  behind the target and stay there); only Hit and Run and attacks on stations make passes. Nothing notices a
  stalemate, so a pilot who can't get the shot keeps trying the same thing.
- **Formation spacing is small**: 120 units between slots, and ships only push apart inside 90 units, while a hull is
  about 60 units long.
- **Finishing a mission is possible but hidden**: once the objectives are done you can order each wing to Withdraw, and
  the mission ends "won" when the last ship jumps. Nothing tells you that, and nothing offers it.

---

## 3. The proposal, item by item

### 3.1 Scale: the map, speed, gun range, spacing (items 1, 2, 4, 10, 11)

| What | Today | Proposed default | Notes |
|---|---|---|---|
| Top speed (`SPEED_SCALE`) | 1.25 | **2.5** (panel to 5) | Twice as fast. A Talon tops out at about 625 a second |
| Gun reach | 900 (the weapon's range), ships fight at 0.55 of it | **Fight at the full reach** (`ENGAGE_FRAC` 1.0), and **a new `RANGE_MULT` slider** (weapon range ×, as SB has), default **1.5** | See question Q1: I'm not sure which slider you maxed |
| Map (`HC_MAP`) | 2 × space.js's (8,400 × 6,000) | **4 ×** (16,800 × 12,000), panel to 8 | The scenarios are scaled to it (positions × 2), so with ships twice as fast the trips take as long as before. Clocks stay as they are |
| Formation spacing (`FORM_GAP`) | 120 | **320** | Tight ≈ 320 apart, Spread ≈ 1,000 |
| Personal space | pushes apart inside 90 | **inside 220**, and stronger | So ships stop stacking in a fight |
| Camera | fits the map | Opens framed on your wings (as SB's does), not the whole map | Otherwise a 4 × map makes every ship a dot |

- **Boost (item 11).** The Speed slider is cruising top speed, not boosting. Boost is a pilot ability (2 s at 1.6 ×
  top speed, when the AI or you trigger it). With faster ships by default, I'd keep Boost as it is.
- **Your exact slider values.** Your panel settings are saved in your browser, so I can't read them. I'll add a
  **Copy settings** button to the panel that puts every value on the clipboard, so you can paste them to me and I can
  make them the defaults. Until then I'll use the values in the table.

### 3.2 Turning: weak at low speed, so energy matters (item 3)

Replace "the same tightest turn at any speed" with a **corner-speed model** (how real fighters turn):

- Each ship has a **corner speed** (`CORNER` 0.7 × its top speed) where it turns best. **Below it, turning gets weaker
  fast** (turn rate falls with the square of speed), so a slow ship is a sitting duck. **Above it**, the turn widens
  (turn rate falls with speed).
- **Turning bleeds speed** (`TURN_BLEED`): a ship that keeps turning hard slows down, which makes its turns weaker
  still. Circling stops being a stable place to be.
- **Ships no longer brake into turns.** They keep their speed up near the corner and accept a wider turn.
- **Tightest turns get wider overall** (`TURN_SCALE` × 4: a Talon or a Mote at corner speed ≈ 380, a Cross ≈ 760), so
  reversing takes most of a gun's reach rather than a third of it.
- **The nose leads less** (`SLIP_NOSE` 0.42 → 0.2 rad), so ships shoot where they're going, not round corners.
- The dial still sets who is nimble: a Mote still out-turns a Cross. The difference is that out-turning is now a
  pursuit that bleeds speed, which a Cross can escape by running straight and fast.
- **Same rules for the Hegemony.** This is what stops the Pincer exploit (6.5): the Motes can no longer turn on a dime
  and shoot.

### 3.3 Fighting: attack runs by default, pilots who adapt, and wings that pick their own tactic (item 6)

**(a) The default attack is the run you liked (6.2).** Every ship on an engage order fights in passes:

`RUN IN` (at speed, guns on the target) → `PASS` (fire, fly through) → `EXTEND` (keep going straight, out past
`EXTEND_D` ≈ 1.2 × gun reach, building speed) → `TURN BACK` (a wide turn at corner speed) → `RUN IN` again.

**(b) Pilots notice a bad fight and change move within your orders (6.3).** If a pilot spends `STALE_SECS` (4 s)
turning without getting the target in its guns, or has an enemy in its six, it breaks off (extends straight and fast,
boosting if it can) and comes back with a fresh run. A pilot who is faster than its target may sit on its tail
(pursuit) while that works, but drops back to runs as soon as the target turns inside it. Personality colours it: an
eager pilot hangs on a turning fight longer, a steady one breaks off sooner.

**(c) The tactics, reworked so none of them is a turning fight:**

| Tactic | Today | Proposed |
|---|---|---|
| **AUTO** (new, the default) | n/a | **The wing chooses** among the five below, moment to moment: Pincer when two or more of its ships can catch a lone target, Tight runs on a station or a big ship, Screen when it's escorting or defending and a threat comes in, Defensive when it's hurt or outnumbered, Spread otherwise. The roster's tactic chip reads `AUTO · PINCER` so you can see the choice. The leader decides; a leaderless wing chooses worse (the cohesion penalty) |
| **Tight** | A V; everyone chases the leader's target and turns with it (the bunching you saw) | **Runs together**: the wing makes its passes on one target in a staggered trail, extends together, re-forms between passes. Concentrated, but never a knife fight |
| **Spread** | Line abreast; each chases its own target | **Each pilot makes its own runs** on its own target; wide spacing while travelling |
| **Screen** | Between the charge and the threat | **Unchanged** (6.4) |
| **Pincer** | Ships come at the target from alternate sides | **Two elements make runs timed from about 90° apart**, then both extend; no lingering in the target's arc |
| **Hit and Run** | Short passes and extensions | Since runs are now the default, this becomes **harassment**: longer extensions, only one ship in the target's arc at a time. Low risk, low damage |
| **Defensive** | Close formation, fights at 0.8 range, falls back hurt | **Unchanged in spirit**: stays close to its charge or leader, takes only safe passes, breaks off early |

**(d) Formation is for travelling.** The tactic's spacing applies while a wing flies somewhere or holds; once it
engages, the ships fly their runs and re-form afterwards. That is how the wing "opts for the right formation in any
given moment" (6.6) without you having to change it.

I recommend **this option (A)**: AUTO by default, with the reworked tactics as overrides you can lock. The other way
(B) would scrap the tactic row and let you set only a stance (aggressive / balanced / cautious). It's simpler, but it
drops a lever your design doc lists. See Q2.

### 3.4 Getting home: Jump Out (item 5)

- When every primary objective is done (or the clock has run out), the objectives panel shows **OBJECTIVES COMPLETE**
  with a gold **ALL WINGS: JUMP OUT** button. While it shows, it is the screen's one gold button.
- It orders every wing to Withdraw to the jump point. Each ship jumps on arrival, and **the mission ends "complete"
  when the last surviving ship has jumped**. The end card shows who made it, who was lost, and the objectives.
- Withdraw in the wing tray keeps working per wing, as now.
- See Q5 for ships that can't make it.

### 3.5 The HUD (items 7, 8, 9)

- **The order tray pops up just above the selected wing's card in the roster** (centred on it, kept on screen), rather
  than in the top left. The pilot panel stays over the left rail (Q4).
- **Commands and command points move to the bottom right, beside the time controls, and grow**: a bigger COMMANDS
  button (48 px, the display font), the CP diamonds larger next to it, and the drawer **opens upward** from the button.
  The top right is left clear. This is my reading of "near the timer… open upward" (Q3).
- **Speech bubbles**: a pilot's line pops up in a small bubble beside their ship for 2 s, then pops down, as well as
  going into the feed.
  - Ships speak on a change: a new target, a kill, pinned, panicking, steadied, pulling out, a rule taking them.
  - At most one bubble a ship, a ship speaks at most every 4 s, and no more than 4 bubbles are on screen.
  - Bubbles follow the ship, with a tail. Hazard-edged in an emergency. They pop without animation if reduced motion
    is on.
  - The lines are still placeholders `[TEXT NEEDED]`.

### 3.6 What stays as it is

Orders, rules, morale, commands, emergencies, abilities and doctrine, the clock and the metrics all stay as they are,
apart from what the changes above touch. v2 and SB are untouched, as before.

---

## 4. Build order (after approval)

| Phase | Build | Proof at the end |
|---|---|---|
| **F1** | §3.1 scale (speed, gun reach and `RANGE_MULT`, map 4 × with the scenarios scaled, spacing, the opening camera, Copy settings); §3.4 Jump Out; §3.5 tray above the wing, Commands and CP bottom right opening upward | hc1 at the new scale; finish it with Jump Out |
| **F2** | §3.2 the corner-speed turn model, turn bleed, the narrower nose lead; for both sides | Two ships meeting no longer circle: in a scripted duel a turning fight bleeds speed and stalls |
| **F3** | §3.3 attack runs, stalemate break-offs, the reworked tactics, AUTO and its chip | Cross against Motes: the Crosses make runs and break off instead of circling; Pincer no longer gets eaten |
| **F4** | §3.5 speech bubbles | Bubbles pop for 2 s by the speaking ship, capped, and also land in the feed |

New smoke tests come with each phase:
- turn rate falls below corner speed;
- a duel's stalemate breaks within `STALE_SECS`;
- AUTO switches tactic when the situation changes;
- Jump Out ends the mission "complete";
- the tray sits above its wing, and the drawer opens upward;
- bubbles appear and are gone after 2 s.

Every existing smoke test must still pass. A few High Command tests that check today's spacing and formation shape will
be updated to the new numbers, and noted in the blockers.

---

## 5. Questions for you

- **Q1 (gun range).** Which slider did you max? The one on the panel is **"Fighting range (× gun range)"**, which only
  sets how close ships try to get, up to the weapon's own 900. If you want guns that **reach further**, that's the new
  `RANGE_MULT`. My default is both: fight at full reach, with reach × 1.5. Or paste your settings once Copy settings
  exists.
- **Q2 (formations).** Option A (recommended: AUTO by default plus the reworked tactics you can lock) or option B
  (scrap the tactic row; you set a stance and the wings do the rest)?
- **Q3 (Commands).** By "near the timer", do you mean the time controls at the bottom right (my reading, which is why
  the drawer opens upward), or the reinforcement clock at the top centre?
- **Q4 (pilot panel).** Should the pilot panel also pop up above its tile, like the order tray, or stay over the left
  rail?
- **Q5 (stragglers).** If some ships can't reach the jump point (pinned, far away), should Jump Out wait for them, or
  should there be a "leave now" that ends the mission and counts them lost?

---

## 6. Your answers (13 October)

1. **Gun range**: "I set fighting range (x gun range) to max." So ships fight at the full weapon reach (`ENGAGE_FRAC`
   1.0). The weapon range × slider (`RANGE_MULT`) is added to the panel at 1 ×, not raised, since that's not what you
   moved.
2. **Formations**: option A: AUTO by default, with the reworked tactics as overrides you can lock.
3. **Commands**: beside the time controls (bottom right), opening upward.
4. **Pilot panel**: pops up above its tile, like the order tray.
5. **Stragglers**: Jump Out, plus a **Leave now** button that ends the mission at once and counts anyone not yet
   jumped as lost.
