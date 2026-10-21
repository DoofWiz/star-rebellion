# Design blockers: the archived Arena experiments

> Moved verbatim from `docs/DESIGN_BLOCKERS.md` in the switch to main (`docs/MAIN-SWITCH-HANDOFF.md` S0, 21 October
> 2026), when Arena v2 and SB Test were archived (`archive/README.md`). They block nothing live. Their links point at
> the docs as they stood then (now in `docs/archive/`). The decisions already made on them stay in the Resolved log
> of `docs/DESIGN_BLOCKERS.md` (C-57, C-58, C-59.x, C-61, C-64.1, C-65.1).

## Arena v2

### C-55 🟡 Arena: placeholders
Every number the space combat v2 sim (`game/js/sim2.js`) adds is mine and marked `// placeholder` in its `DEFAULTS`
table; each has a getter on `SIM2` (`EXEC_LEN_()` and so on) and, except `TICK`, a slider in the Arena's designer panel.
Slider values are remembered in this browser under the Arena's own key, `sr-arena-prefs`; a scenario's own `tune` wins
when it loads (E2's variants set the exec length that way).
| Constant | Value | What it does |
|---|---|---|
| `TICK` | 50 ms | Sim time per fixed tick (the sim is deterministic for a seed and a set of orders) |
| `EXEC_LEN` | 6 s (panel 2 to 10) | Sim time per execution (a round) |
| `SIM_SPEED` | 1× (panel 0.25 to 2) | Wall-clock multiplier |
| `SEG_TIME` | 2 s | The pace a move's length is measured against: a round covers at most top speed × SU × `EXEC_LEN` ÷ `SEG_TIME` (a Talon: 5 × 150 × 3 = 2,250) and at least its slowest straight × the same |
| `STRAIGHT_TOL` | 6° | How far off the nose a move may be and still count, and fly, as a straight |
| `AP_BASE`, `AP_LEVELS` | 6, +1 per 3 levels | Action points a pilot has each round (green 6, regular and veteran 7, ace 8) |
| `COOL_AP`, `COOL_SPENT_TO` | +2; nerve 69 | The Cool bonus, and the nerve a pilot falls to when they spend into it (just under Cool at 70) |
| `AP_STRAIGHT`, `AP_BANK`, `AP_TURN`, `AP_KTURN` | 1, 2, 3, 3 | Moves, whatever their length |
| `AP_EVADE`, `AP_LOCKIN`, `AP_BOOST`, `AP_SHIFT` | 2, 2, 2, 1 | Planning actions: fly defensive, lock in, boost the weaker shield segment, angle a segment |
| `AP_SNAP`, `AP_JUKE`, `AP_SHIFT_INT` | 3, 1 (+ the move), 2 | Interrupts |
| `INT_FLOOR` | 30 | At or below this nerve (panicking) a pilot cannot interrupt |
| `INT_CAP` | 0 (none) | 1 to 3 caps interrupts per exec; otherwise AP is the only limit |
| `WPN_CD` | guns 3 s, missiles 6 s (`GUN_SHOTS` 2, `MSL_SHOTS` 1) | Weapon cooldown: the default exec length over shots per exec. Fixed against the default, not the current `EXEC_LEN`: C-56 item 8 |
| `LOCK_TIME` | 1.5 s | Target held in the lock zone per lock level (to 3) |
| `CALM_GAIN` | 6 | Nerve at an exec's end for a ship not hit in it (today's 6) |
| `SNAP_BONUS` | +2 ATK | Snap Shot |
| `NERVE_GAIN`, `NERVE_DRAIN` | 1×, 1× | Multipliers on every combat nerve change |
| `ENEMY_N` | 0 (the scenario's) | Ships per enemy flight, applied on restart |
| `AI_NOISE` | 0 | Random cost added to each enemy plan candidate (0 = perfect doctrine) |
| `PATH_SEGS` | 3 | Most dial manoeuvres an order or a doctrine chains in a round |
| `PREF_RANGE` | 340 | Pursuit's preferred range (today's `aiManeuver` value) |
| `WING_FLOUNDER` | 4 s | How long a wingman drifts after losing its lead |
| `GUARD_R` | 900 | `hold_asset`'s guard radius |
| `RALLY_D`, `FORM_R` | 1,300, 280 | `firing_line`: how far from the nearest rebel it forms up; how close to its slot each ship must be before the line runs in |
| `OPP_FIRE` | 1 (on) | A ship with no shot on its target fires at any other valid hostile: C-56 item 10 |
| Pilot presets | green L1, skills 10/10/0, presence 24, initiative 2 · regular L3, 20/20/20, 30, 3 · veteran L5, 35/35/30, 36, 4, K-turn · ace L8, 50/50/40, 42, 5, K-turn | The stat templates scenarios pick from (aim / cunning / focus); a scenario's own numbers win (E1's Fox is the handoff's level 3 veteran) |
| Plan beam | 10 | Candidate chains kept per manoeuvre when an order or a doctrine plans (not a slider) |
**Needs from you:** the numbers, after playing E1. **Your call:** _open_

### C-56 ⚪ Arena: readings to confirm, and what I chose building it
Readings of the handoff (§9), each with the interim choice:
1. **"Enter Arena" is on the title screen for everyone** for now (an internal build), under Start game, styled as a
   tool (the debug menu's dashed violet).
2. **Evade survives** rather than folding into Juke: a planning action (2 AP since C-57) that keeps today's +3 to be
   hit and stops lock acquisition for the round (the old trade: fly defensive or lock).
3. **K-turns are moves, not an interrupt verb:** a 3 AP move (a button, or K) for pilots with the loop on their dial
   (veteran and ace presets).
4. **No slow-motion on interrupts** in v1: a hard pause with the acting ship lit and the rest of the screen dimmed.
5. **Tells are always on in the Arena** (a panel switch turns them off); how the shipping game shows them is out of
   scope (M-35).
6. ~~A path has at most 3 segments.~~ Superseded by C-57: AP and the round's distance limit a chain.
What I chose while building it (items 7, 12 and 16 rewritten for C-57's moves and action points):
7. **Moves.** A move is one arc from where the last ended, tangent to the ship's heading: a straight, a bank of any
   angle up to 45° or a turn of any angle up to 90°. The dial's whole speeds become continuous length bands: a type the
   dial flies at speeds lo to hi covers lengths from lo − 0.5 to hi (× SU), so the Talon banks from 225 to 450 and
   turns from 75 to 300. Pressing on a ship shows the bands (turn orange, bank gold, straight green, each with its AP);
   the ghost follows the pointer and, outside the bands, sits on the nearest point inside them. A round's chain covers
   at most top speed × SU × `EXEC_LEN` ÷ `SEG_TIME`, so the bands shrink as moves are added, and the chain is flown at
   one steady speed across the exec. A ship never flies slower than its slowest straight: a short chain (or none) is
   followed by flying straight on, drawn faint. If the exec ends mid-move, the next round starts from where the ship is.
8. **Rate of fire is fixed** at the default exec length over shots per exec (guns 3 s, missiles 6 s). The handoff's
   formula (`EXEC_LEN / shots`) would make E2's 2 s exec fire three times as fast as its 6 s one; fixing it keeps E2
   about the commitment window alone.
9. **Locks:** every ship acquires on its planned target (not only missile carriers), as any ship could Lock today;
   panic, Evade and Lock in stop acquisition; a missile spends a level; the rear hemisphere breaks a lock every tick.
10. **Opportunity fire** (`OPP_FIRE`): the handoff fires only at the planned target; a ship that has no shot on it
    fires at any other hostile it has a shot on. Ships whose doctrine holds fire (a wingman's wing, `hold_asset`
    guards, anyone breaking off) don't. Each weapon has its own cooldown; a missile is held for a target of under 20
    points (today's `bestWeaponFor` rule) when another weapon has the shot.
11. **Simultaneity:** every shot in a tick is chosen from the same instant and then resolved, so a ship destroyed in
    that tick still gets its shot off. Damage lands the instant a shot fires (a missile has no flight time).
12. **Action points in detail.** Moves cost by type, not length. Planning actions last one round and reset at the next
    plan: Evade, Lock in (+35 nerve at the round's end, no lock acquisition; it and Evade exclude each other), Boost
    shield (today's boost, on the weaker segment, as the round starts) and angling a segment (swinging it back
    refunds). AP left when the exec starts is the reserve for interrupts and is lost at the round's end. Interrupts
    cost AP and no longer nerve; panicking pilots still can't interrupt, and the level-based cap is gone (`INT_CAP`
    can bring a flat one back). Snap Shot needs a real shot (arc, range, lock, ammo) at the target, else the nearest
    hostile it has one on. Juke replaces the rest of the exec with one new move from where the ship is, at its
    current speed. The Cool bonus is set when the round's plan starts: a pilot Cool then gets +2; spending past the
    base pool (when the exec starts, or by an interrupt) drops their nerve to 69, so Cool's +2 to hit and +1 to be
    hit go with it until they earn Cool back. Today's actions not yet on the meter: field repair, fix a critical,
    barrel roll, Heroic Surge (say which you want, and their price).
13. **Which enemy hunts:** the handoff's `heg_fighter` is not a `space_enemies` row. The hunters are VC Mote
    Patrolcraft (`vc-mote-patrol`), manned, so nerve and panic apply; the depot is the Fuel Depot row. No rows added.
14. **Enemy planning** sees no one's plan: other ships are predicted flying straight on at their last speed. Pursuit
    scores candidates with today's `aiManeuver` maths (copied). Orders and doctrines plan in whole dial manoeuvres
    within the same AP and round distance as the player (no Cool bonus), searched with a small beam. A panicking enemy
    flies defensive, and `flees` types run, as today. A doctrine switched off in the panel holds position.
15. **Doctrines in detail.** `wingman`: pairs in order within a flight; the wing flies 200 behind and 170 to one side
    of its lead and fires only at a threat to the lead; on the lead's death it flounders (Evade on, no fire) for
    `WING_FLOUNDER`, then pairs with any lone wingman of its side (a lead without a wing, or another flounderer) or
    breaks off for the edge and leaves. `hold_asset`: patrols at half the radius and chases threats inside it on a
    leash (a candidate path that strays outside the radius costs so much that none is picked while one that stays
    inside exists). `firing_line`: forms line abreast, 220 apart, `RALLY_D` from the nearest rebel on its own side,
    runs in once every ship is within `FORM_R` of its slot, runs for one exec, then forms again.
16. **Player ships with no moves** fly their standing order, which plans within the base AP (never the Cool bonus);
    with no order they fly straight on for no AP. The first move dragged replaces the order's plan for that round
    only. Orders: pursue, escort (follow a ship of yours and fire at its threats), follow, hold (circle where it is).
17. **Objectives:** destroying "all" counts a ship that fled as gone; an exit is any one of your ships within 180 of
    the edge; survive counts fight time. A finished scenario offers same seed, new seed or the picker.
18. **The scenarios:** E1 is the handoff's Fox (level 3 veteran Talon) v two pursuit Motes in a rock belt, survive
    60 s. E2 is E1 at 2, 4, 6 and 8 s, clock off or 30 s. E3 is 2, 4 or 8 of a mixed flight of Talons and Crosses v
    half pursuit, half wingman Motes (two wingmen at 2), destroy all. E4 is the Fox and a Cross v four wingman Motes,
    then three `hold_asset` Motes guarding a depot (destroy the guards: the depot is only their asset), then three
    `firing_line` Motes; the parts are labelled Contact 1 to 3 so nothing names the behaviour. E5 is the Fox and a
    Cross: burn the depot while two pursuit Motes hunt, then leave by the east edge.
19. **The board** is today's 4,200 × 3,000; rock layouts (`belt1`, `scatter`, `field`, `open`) have their own seeds, so a
    new fight seed keeps the same rocks. No campaign consequences: no experience, no salvage, no injuries; today's
    nerve fallout of a death (wingman lost, leader down, friends) is kept.
20. **Back to title** reloads the page with the hash cleared; `#arena` boots straight in and counts as a test page (no
    transitions, `DBGarena`).
No line the Arena shows is meant for players, so none is `[TEXT NEEDED]` and none is in the text workbook.
**Needs from you:** confirm items 1 to 5, or say otherwise; anything in 7 to 20 you'd rather have differently; which of
today's other actions belong on the meter (item 12).
**Your call:** _open_

## SB Test

### C-65 🟡 SB streams of fire and the bigger map: what I chose, and the placeholders
Your 12 October note (C-65.1 in the Resolved log): more shots doing less damage, "more going on visually… even if the
maths works out the same", a much bigger map, and room to make ships go further over longer rounds and guns reach
further. Built in `game/js/sim-sb.js` and `game/js/arena-sb.js`; v2 is untouched.

1. **Guns fire streams.** A gun with a shot fires 8 bolts 0.06 s apart every 0.75 s, about 10 a second (was 4 every
   2 s). **The damage a second is pinned, not the damage a bolt**: `GUN_DPS` is 0.5 of the weapon roll a second, what
   four quarter-rolls every 2 s came to, and each bolt's share is `GUN_DPS` × `BURST_EVERY` / `BURST_N` (about 0.05 of
   a roll). So the stream sliders change how busy the screen is, not how fast ships die; `GUN_DPS` changes that.
2. **Bolts deal fractions**: shields, armour and hull keep the remainder (the arcs and pips show part-spent cells), and
   no hit is rounded up to 1 as before, so the old maths ran a little hotter than this.
3. **Criticals per point of damage are unchanged**: a direct hit's critical chance is scaled by the bolt's share over
   the old quarter roll. **Nerve per second under fire is unchanged**: a stream's nerve hit (−12 through armour or
   hull, −5 on shields) is scaled by how often streams come.
4. **Damage numbers add up**: a ship's hits are summed and pop as one number every 0.35 s (`-0.8`, `-2.4`), and a gun's
   "hits / fired" card shows at most every 1.5 s, so the screen shows the stream without a number on every bolt.
   Missiles still show their own hit.
5. **Missiles keep their own launch rate** (`MISSILE_EVERY` 2 s), so the stream rate doesn't empty a rack.
6. **The map is 2.5 × by default** (10,500 × 7,500; `MAP_SCALE`, panel 1–4, applies on the next load or restart and is
   remembered with the sim speed). The scenario's layout (ships and rocks) is set in the middle, so starts are as close
   as they were with open space all round; there are no extra rocks out there yet, and an exit objective's edge is
   that much further away. The starfield grows with the map.
7. **Weapon range ×** (`RANGE_MULT`, panel 0.5–5) stretches every weapon's range, the lock range, the firing-arc
   drawing and the chase camera's framing, and **pursuit's preferred distance follows it** so the AI fights at the same
   share of its gun range. Spread still grows per range unit past the first band, so long shots get wilder.
8. **Room on the sliders**: `SPEED_SCALE` now runs to 6 (was 3); the exec length already runs 1.5–10 s. Longer rounds
   at the same speed scale fly the same distance more slowly; raise both together to go further.
9. The tests run on the original 4,200 × 3,000 map (they set `MAP_SCALE` 1), plus one check of the bigger default.

**Placeholders**: `BURST_N` 8, `BURST_GAP` 0.06 s, `BURST_EVERY` 0.75 s, `GUN_DPS` 0.5, `MISSILE_EVERY` 2 s,
`RANGE_MULT` 1, `MAP_SCALE` 2.5 (all on the panel), the damage number's 0.35 s and the card's 1.5 s (not on the panel).
**Your call:** _open_

### C-64 🟡 SB flight, guns and ship status: what I chose, and the placeholders
Your 12 October notes after playing E1 under SB (C-64.1 in the Resolved log), built in `game/js/sim-sb.js` with a
small kit addition in `arena-sb.js` (`toScreen`, `dpr`). v2 is untouched.

**Flight: ships are flown, not on rails.**
1. **The plan is the pilot's intent.** Each ship is a body (position, velocity, nose, turn rate) and an autopilot
   steers it along the planned path: thrust along its line of flight and grip across it are limited, the nose turns
   at its own rate and has to brake to stop, and the pilot's hands wander. It flies close to the line (in tests,
   8 to 35 units off at its hardest moment, ending about 10 units from the planned end), carries its speed into the
   next round, slides a touch wide at the peak of a hard turn and catches up. Drift's nose takes about 0.4 s to swing
   round rather than the plan's 0.25 s. `PHYSICS` (panel toggle) puts the ships back on the rails.
2. **A ship's thrust and grip come from its own plan**: each is the plan's peak demand × `GRIP` (0.85), never less
   than a floor. A fixed per-ship number doesn't work with today's pacing: speed is even across a round, so a hard
   turn drawn after a fast straight is taken at full speed, and any fixed grip either flies every plan perfectly or
   can't fly that one at all. **Your call:** keep it, or turn the dial into real physical limits (thrust and grip
   per hull), which would mean the reach has to be computed from the physics too.
3. **The wander has no randomness**: a fixed wave per ship over the round's clock, so a seed and its orders still
   replay exactly. Green pilots wander ×1.5 and track a little looser; aces ×0.55 and tighter (`pilotFly`).
4. **The next round starts along the ship's line of flight**, and the nose snaps onto it between rounds if it is
   within 0.6 rad (it only differs by a few degrees after a normal round). A round never asks a ship to fly backwards
   from how it is moving: if it would, the velocity is turned onto the new line. **A K-Turn or Loop's flip reverses
   the line of flight** the moment the flip ends, as the rails did.
5. **The reach and momentum still come from the planned distance**, so the planning rules are unchanged.
6. **`SHOW_FLIGHT` (off)** draws, while planning, exactly where the selected ship will fly. It's off because a
   perfect prediction would bring back the strict link you didn't want; it's there to tune with.

**Guns.**
7. **Bolts fly at 2,000 units a second** (`PROJ_SPD`, was 850; ballistic weapons × 1.25; missiles unchanged), so
   they cross a range band in about 0.15 s but still have visible travel. **They fly straight as aimed and don't
   carry the firing ship's speed** (adding it would bend their direction; your note asked for a fixed direction).
8. **Each bolt leaves from a gun on the ship art**: the mounts in `SR_ART.SHIPS` (a Talon's two wing pods, a Mote's
   one gun, a Scimitar's pods and missile rails), the barrel's end (`MUZZLE`: 10.6 art units ahead for the
   repeaters), scaled as the hull is drawn; paired guns fire alternately. The muzzle is placed at the hull's true
   size, so when zoomed far out (where ships are drawn larger to stay visible) a bolt can appear from inside the
   drawn hull.
9. **Bolts are drawn in the weapon maker's colours** (`SR_ART.PROJ` / `STYLE`, as the main game does), with the
   main game's muzzle flash. A Hegemony Mote fits the same BLS-T repeaters as your Talon, so its bolts are the same
   gold; the main game is the same. Say if you'd rather have faction colours.

**What each ship has left.**
10. **Shield arcs** are the main game's ship-file zones drawn round the ship: fore (120°, centred on the nose) and
    aft, `SHIELD_W` (7 px) thick, a cell per 5 points, lit cyan (a segment angled in from the other zone violet),
    spent cells dark, the cell being spent part-lit. The arc that takes a hit flares for 0.4 s. A zone with no
    shield covering it is drawn red-dashed (as in the ship file).
11. **Hull and armour** are the main game's pips (`hpPips`: 5 hull cells, the armour layer over them) above every
    ship. The target's LOCK % label moved up above them, and the selection ring sits outside the shield arcs.
    `STATUS` (panel toggle) hides both.

**Placeholders** (each on the panel's SB Test group with a getter on `DBGarena.sb.sim`, except where noted):
| Constant | Value | What it does |
|---|---|---|
| `PHYSICS` | on (toggle) | Ships are flown bodies; off puts them on the rails |
| `TRACK` | 3.2 rad/s | The autopilot's tracking bandwidth: higher holds the line tighter |
| `GRIP` | 0.85 | Thrust and grip as a share of the plan's peak demand: below 1 it slides wide at the peak |
| `THRUST_K`, `LAT_FLOOR` | 2.5, 1.4 (× top speed a second) | Floors under thrust and grip |
| `WANDER` | 0.4 (× top speed a second) | The pilot's sideways wander; × 1.5 green, × 1 regular, × 0.8 veteran, × 0.55 ace (not on the panel) |
| `NOSE_K`, `NOSE_RATE`, `NOSE_ACC` | 9 rad/s, 12 rad/s, 120 rad/s² | The nose: tracking, top turn rate, turn acceleration |
| `SHOW_FLIGHT` | off (toggle) | Draw the selected ship's actual flight while planning |
| `FLY_SUB` | 2 | Physics steps per sim tick (not on the panel) |
| `KIND_SPD` | plasma × 1, ballistic × 1.25 | A weapon kind's bolt speed × `PROJ_SPD` (not on the panel) |
| `BOLT_LEN` | 22 units | A bolt's drawn length |
| `MUZZLE` | repeaters 10.6, missiles 8, others 6 art units | How far ahead of its mount a gun's barrel ends (not on the panel) |
| `STATUS`, `SHIELD_W` | on, 7 px | Shield arcs and pips on the ships; the arcs' thickness |
**Your call:** _open_ (item 2 especially)

### C-63 🟡 SB planning HUD: placeholders
The planning tray's numbers (`docs/archive/SB-HUD-HANDOFF.md` §8), each a named constant in `game/js/sim-sb.js` marked
`// placeholder`, with a getter on `DBGarena.sb.sim` (`TRAY_GAP_()`…) and a row in the panel's SB Test group.
| Constant | Value | What it does |
|---|---|---|
| `TRAY_GAP` | 18 px (panel 0–60) | From the selected ship's ring to the top of its tray |
| `TRAY_ICON` | 36 px (panel 24–56) | A tray icon's side |
| `TRAY_FLIP_ZONE` | 140 px (panel 0–400) | A ship this close to the stage's bottom edge (or with no room below) gets its tray above it |
| `TIP_DELAY` | 250 ms (panel 0–1,000) | Hover or focus time before an icon's card opens |
| `showLockedMods` | on (panel toggle) | Mods the pilot lacks show greyed with a padlock (C-62 item 1) |
| Tray margin | 8 px | The tray and the cards never come closer than this to the stage's edge |
**Needs from you:** tune any of them; the panel is the place.
**Your call:** _open_

### C-62 ⚪ SB planning HUD: readings to confirm, and what I chose building it
`docs/archive/SB-HUD-HANDOFF.md`, all three phases (H1 to H3) built in `game/js/sim-sb.js` (the stepper, the tray, the hover
cards, the boundary timing) and `game/js/arena-sb.js` (placing the tray every frame, the chips, Execute, the keys);
the old bottom bar is gone. The top strap keeps the scenario, turn and objective, so no status ribbon was added.

**Readings to confirm (the handoff's §8, with my interim choice):**
1. **Locked mods are shown greyed** with a padlock and "Needs: veteran" / "Needs: ace" on the card
   (`showLockedMods`, default on), rather than hidden. Right for the lab; what the shipping game does is open.
2. **The armed mode defaults to Basic every turn**; remembering last turn's mode per ship is off in v1.
3. **No confirm on Execute** with ships unplanned: an unplanned ship flies its standing order (a straight glide at
   its slowest speed for the round), and its action is None.
4. **The tooltip copy is designer-facing**: the handoff's lines for the moves, and lines of mine for Loop, End
   here, Keep facing and the actions. Any line that ships goes back through `[TEXT NEEDED]` and the normal text
   flow.

**What I chose building it (not in the handoff, or where it disagreed with itself):**
5. **A Keep facing icon on the Drift facing step**, so the default facing (straight back) can be committed with a
   click or the 1 key; dragging the handle commits it too. The handle stays live afterwards, as the handoff asks.
6. **Where each drag starts:** SEG 1 from the ship, SEG 2 from the end of SEG 1 (a pulsing ring marks the step's
   start, and the faint reach for the armed mode shows from it). Pressing the ship on a later step and dragging
   redoes SEG 1 (and drops SEG 2, keeping the action); a click without a drag changes nothing. Pressing another of
   your ships selects it and opens its tray.
7. **Boost fore / aft are greyed with a reason** ("No shields to boost", "Shield emitter damaged") where the
   handoff's table says they are never off: the rules already refuse them in those cases, so the tray says so.
   **Lock In** is greyed with "Nerve already full" or, for a craft with no nerve, "No pilot nerve to steady".
8. **The Ship ability slot collapses out** while no ship has one: the handoff's table says "always greyed", its
   next paragraph says Special and Ship render only when the ship has an entry. I followed the paragraph.
9. **AP per round is capped at 2 on the panel** (was 1 to 3): the stepper is SEG 1 → action → SEG 2. At 1, the
   tray runs SEG 1 → action and the action fires at the end of that segment.
10. **SEG 2's hint reads "Drag from the end of the first move…"** (the handoff gives the SEG 1 line for both), and
    when SEG 1 used the whole round the move icons grey out with "No distance left this round" and End here is
    the choice.
11. **The number keys press the tray's icons** (they used to select ships); Tab and Shift-Tab move between your
    ships; Esc goes back one step; Enter (and Space, as before) executes. Clicking a hostile still sets the
    target at any step.
12. **Execute became pause / resume during the exec**, as the handoff expects of the chassis; the SB driver had no
    pause, so I added one. The Execute in the top bar went (one button, bottom right); the designer panel keeps its
    own.
13. **The drag readout** shows the segment's length against the reach at that turn, in SU, and the momentum the
    whole round would leave (`2.9 / 5.0 SU · momentum 4.9`), drawn just above the pointer.
14. **Fly def's no-fire preview**: the segment draws in the shield colour with a weaving ghost line and "no fire" in
    its label, and the start-pose fire arc is hidden when SEG 1 is Fly def. The plan carries a `noFire` flag.
15. **Planning time per step** (`s1`, `act`, `s2`, in ms) is clocked while that ship's tray shows that step, and
    lands in each exec's `ARENA_METRICS` record as `planSteps` (summed) and on each of your ships as `plan`.
16. The handoff asks for a commit per phase; H1 to H3 landed in one commit, as the stepper, the action timing and
    the keys share most of their code.
**Your call:** _open_ (any of 1 to 4; the rest only if you mind)

### C-60 🟡 SB Test: placeholders
Every number the SB Test ruleset uses that is mine or the handoff's placeholder, each one named constant in
`game/js/sim-sb.js` marked `// placeholder`, exposed through a getter on `DBGarena.sim` (`AP_PER_ROUND_()`…) and on
the panel's SB Test group.
| Constant | Value | What it does |
|---|---|---|
| `AP_PER_ROUND` | 2 (panel 1–2; was 1–3 until the planning tray, C-62 item 9) | Movement segments a round, 1 AP each; every kind costs the same |
| `FLYDEF_FACTOR` | 0.25 (panel) | Fly Defensively: incoming hit profile, as ellipse area (each axis × 0.5) |
| `flydefImmunity` | off (panel toggle) | Your literal Fly Defensively: cannot be hit except by homing weapons |
| `BOOST_MULT` | 2.0 (panel) | Boost: the segment's speed range × this |
| `BOOST_TURN` | 0.25 (panel) | Boost: the turn cap × this (fast and nearly straight) |
| `KTURN_MAX` | 3 (panel) | K-Turn: the speed cap, as the dial's K |
| `BARREL_LAT` | 1 SU (panel) | Barrel Roll: lateral displacement over the segment, heading kept |
| `SPEED_FLAIR` | on (panel toggle) | Acceleration flair (visual pacing only) |
| `EXEC_LEN` (SB) | 3 s (panel 1.5–10; v2's stays 6 s) | SB Test's round length (C-59 item 31) |
| `FLAIR_DIP` | 0.35 (panel; was 0.55) | Flair: how much a minimum-radius turn brakes at its apex |
| `ACCEL`, `BRAKE` | 0.03, 0.05 per 8 units flown (panel) | How fast speed can rise and fall (C-59 item 11) |
| `SLIP_OUT`, `SLIP_NOSE` | 32 units, 0.42 rad (panel) | The slip at the minimum radius: how far wide it slides, how far the nose leads |
| `SEG_MIN` | 0.5 SU | The shortest segment |
| `MOMENTUM` | on (panel toggle) | The reach depends on the speed carried into the round (C-59 item 32) |
| `MOM_UP`, `MOM_DOWN` | 1.5, 2 dial speeds a round (panel) | How much faster or slower than its momentum a ship can fly this round |
| `MOM_TURN` | 1.5 (panel) | The tightest turn × (slowest straight / speed carried in) ^ this |
| Movesets | green none · regular Boost · veteran Boost, Drift · ace Boost, Drift, K-Turn, Barrel Roll | `ARENA_MOVESETS`, keyed off the scenario's pilot preset; moves to `db.json` only if SB wins |
| `BURST_N`, `BURST_GAP`, `BURST_EVERY` | 8 bolts, 0.06 s apart, a stream every 0.75 s (panel; were 4, 0.08 s, 2 s until C-65) | A gun's streams: about 10 bolts a second while it has a shot |
| `GUN_DPS` | 0.5 × the weapon roll a second (panel) | A gun's damage per second of fire; each bolt's share is this × `BURST_EVERY` / `BURST_N` (C-65) |
| `MISSILE_EVERY` | 2 s (panel) | Seconds between a missile rack's launches (was `BURST_EVERY`) |
| `RANGE_MULT` | 1 (panel 0.5–5) | Every weapon's range, the lock range and pursuit's preferred distance × this (C-65) |
| `PROJ_SPD` | 2,000 u/s (panel; was 850 until your 12 Oct note "they all move too slowly", 1,400 before your 11 Oct feel notes) | Gun bolt speed (ballistic × 1.25, C-64); lifetime is the weapon's range at that speed, +15% |
| `SPREAD_BASE` | 6° (panel) | Burst spread, the cone's full width, before Aim, nerve and range |
| `SPREAD_AIM_K` | 0.1 (panel) | Aim narrows spread: × 1 / (1 + this × Aim bonus) |
| `SPREAD_NERVE_K` | 1.5 (panel) | Falling nerve widens it: × 1 + this × (1 − nerve / 100) |
| `SPREAD_CRIT` | 3° (panel) | Added per Targeting Array Damage critical |
| `RANGE_SPREAD` | +3° per RU past band 1 (panel) | Guns: accurate close, poor far |
| `MISSILE_LOCK` | 60% (panel) | Lock a missile needs |
| `MISSILE_MINR` | 1.5 RU (panel) | Range a missile needs: disabled in a knife fight |
| `MISSILE_SPD`, `MISSILE_TURN` | 800 u/s (was 650), 2.4 rad/s (panel) | Missile flight and homing; faster than the fastest craft at the default speed scale |
| `SPEED_SCALE` | 1.25 (panel 0.5–6, widened for the bigger map; was 1.6 until the round's distance became one dial move) | The round's distance and the reach × this; the turn radius is not scaled (C-59 items 6, 30) |
| `SHIP_SCALE` | 1.35 (panel) | Drawn ship size and hull ellipse together (C-59 item 30) |
| `BANK_ROLL` | 0.75 (panel) | How far a ship rolls into a turn at its minimum radius (visual) |
| Chase camera | on (panel toggle); zoom 0.45–1.0, 240 units of margin, eases at 5/s | Frames your selected ship, a little ahead of it, and its target while the exec runs; a hand pan or zoom lets go until the next exec |
| Bolts | 22 units long (`BOLT_LEN`, panel), 2 px core and 5 px glow in the weapon maker's colours, from the gun mounts, the main game's muzzle flash, sparks at the hit (C-64) | How a shot reads (visual); was a glowing 0.12 s streak |
| `LOCK_GAIN` | 40%/s (panel) | Lock gained with the target dead centre, falling to zero at the arc's edge |
| `LOCK_DECAY` | 50%/s (panel) | Lock lost while the target is behind the firer |
| `IMPACT_MIN` | 0.2 (panel) | Damage scale at the shallowest skim; 1.0 dead-on |
| `LOCK_DMG_MAX` | 1.0 (panel) | Damage × (1 + lock × this): a full lock doubles it |
| `CRIT_DIRECT` | 10% (panel) | Critical chance on a direct hit (impact ≥ 0.8), plus the weapon's own |
| `HULL_LEN`, `HULL_WID` | 22, 10 (panel) | The hull ellipse's half-axes before the ship's visual size |
| `PREF_RANGE` | 340 (panel) | Pursuit's preferred distance behind its target (copied from today's `aiManeuver`) |
| `FLANK` | 0.55 rad (panel) | How far each further pursuer of one target sits off the line behind it |
| `AI_NOISE` | 0 (panel 0–400) | Extra score noise on every enemy's choice, in hundredths |
| `AI_JITTER` | 1.2 (panel) | A green pilot's score noise; it shrinks with the Aim bonus |
| `AI_LOOK` | 1 (panel) | How much of its target's current turn the AI expects it to hold |
| `AI_W_ARC`, `AI_W_THREAT`, `AI_W_RANGE`, `AI_W_SIX` | 3, 3, 2, 1.5 (panel) | The search's weights: guns on the target, out of its guns, preferred range, on its six |
| `AI_SWING`, `AI_OVERSHOOT` | 0.5 rad, 700 (panel) | The danger cone's widening; how close in front of the target counts as an overshoot |
| `TELLS`, `CARDS` | on, on (panel toggles) | Doctrine tells; burst resolution cards and damage numbers |
**Needs from you:** tune any of them; the panel is the place.
**Your call:** _open_

### C-59 🟡 SB Test ruleset: decisions and readings
`docs/archive/ARENA-SB-HANDOFF.md`: the Arena's second, rival ruleset ("SB Test", `game/js/sim-sb.js`, driven by
`game/js/arena-sb.js`) beside "SR V2 Combat" (`sim2.js`, driven by `arena.js`), picked before the scenario. All five phases are built (B1–B5): the picker and the ruleset interface;
the continuous drag inside the envelope, two AP segments, Fly Defensively, the acceleration flair; projectiles,
bursts, spread, continuous lock, glancing damage, missiles, burst resolution cards; one action a craft and the
pilot movesets, Drift's facing handle included; the doctrine planner, the full SB panel group, and the experiments
`sb1_fox`, `sb2_drift` and `sb3_count` (4 or 8 ships) with their metrics. **SB-1, the comparison gate, is playable**,
and so is v2 (C-55 to C-58, C-57's moves and action points included), so **the head-to-head can be played now**: pick
a ruleset, then the same scenario and seed (both rulesets place the same cast from the same entry).

**Decisions (yours, written down):**
1. The Arena runs **two rival rulesets behind one picker**; nothing is shared below the Arena chassis (scenarios,
   the PLAN→EXEC loop, the seeded RNG, the panel, metrics, the no-save guarantee), and v2 is the control: its
   behaviour and its section of `tools/arena-smoke.js` are untouched by the SB build.
2. **SB movement is a continuous envelope** derived from the same database dial fields (speed range, minimum turn
   radius): the dial stays the balance backend without discrete manoeuvres.
3. **SB resolution is projectiles**: no d20; Aim → spread, nerve → steadiness, lock → damage multiplier; glancing
   versus direct by impact angle.
4. **Two deliberate deviations from your verbatim notes**, each with a toggle or stub so your literal version can be
   felt: Fly Defensively defaults to a heavy degradation rather than immunity (the panel's `flydefImmunity` restores
   your wording), and the AP system is a flat two segments a round with no spend economy yet. (v2 has since
   gained an AP meter, C-57; SB keeps the handoff's flat two segments so the two models stay distinct.)

**Readings (the handoff's, with my interim choices as they are built):**
5. The picker is one window in two steps: the ruleset cards, then that ruleset's scenarios (a scenario's optional
   `rulesets` allowlist hides it from the other; the SB experiments are SB-only). **SB has its own driver**,
   `arena-sb.js`, beside `arena.js`: the v2 scene is written straight against SIM2 and the handoff makes v2 the
   untouched control, so choosing SB Test hands the scene to a second driver (its own loop, camera and panel) that
   reads `arena.js`'s scenario entries, and copies v2's presets, rock layouts and placement so the casts match.
   Folding the two drivers into one chassis is a refactor for after the comparison. SB remembers its sim speed
   under its own key, `sr-arena-sb-prefs`. v2's only touches: the ruleset step in its picker, the SB entries in its
   scenario list, a `ruleset:'v2'` field in its metrics records, and `DBGarena.sb`.
6. **A round is one dial move's distance, and the ship flies what you drew** (since your 12 October note it is flown
   as a body along that line, close but not exact: C-64) (your call, 11 October:
   "ships overall can move too far"; Resolved log). The round's distance is the top straight × `SPEED_SCALE`, shared
   by its AP segments: the second segment's reach is what the first left (the drag readout shows it).
   Unspent AP does nothing in v1. A ship can't stop, so a round drawn shorter than the slowest straight is topped up
   with a straight glide (drawn dashed grey); a longer one is never glided past. Before this, each segment could use
   the whole top straight and an unplanned AP glided a full segment on, so a ship flew far past your line.
7. **Time follows distance**: the ship's base speed for the round is its whole flight over the exec (a Boost stretch
   at `BOOST_MULT` that speed), then the flair (item 11) shapes it.
8. **The minimum turn radius comes from the slowest hard turn on the dial** (90° over `turn_min` speed units), else
   the slowest bank (45° over `bank_min`). The database gives the Graf freighter the same speed-1 hard turn as the
   Talon, so **both have the same minimum radius (about 95 units)**: the freighter differs only in its shorter top
   straight (3 against 5). If the freighter should draw lazier arcs, its dial row needs a slower-turning entry, or a
   size factor on the radius: your call.
9. **The drag is a destination, not a path, inside a drawn reach** (your calls, 11 October; Resolved log): the
   ships fly like planes, so dragging from the ship previews the flight path to where it should end up. Each
   segment is **one steady banked arc** that leaves along the ship's heading and passes through the pointer.
   **The reach** follows the dial's templates continuously: the furthest a segment can go falls from the top
   straight (θ = 0) through the top bank (at 45° of turn) to the top hard turn (at 90°); no segment turns more than
   90° or tighter than the minimum radius. It is drawn while you drag (and faintly for the next segment), and its
   shape is **worked out from that ship's dial and its situation**, never drawn to a template (your clarification,
   11 October): the Talon's reads like a spearpoint because its top straight is long and its hard turns short; the
   Graf's is short and squat, the Mote's broad, a ship with Control Surfaces damage loses its hard-turn shoulders,
   engine damage shortens the corridor, the second segment's reach shrinks with the distance left, and Boost is long
   and narrow. A destination outside it
   ends at the reach's nearest point, with an orange crosshair and dashed line to where you pointed. A drag under 20
   units is a click; the map edge slides the ship along it. Ships without a bank or hard turn on their dial (the
   depot) have no sideways reach.
10. **Barrel Roll rolls toward the side the destination lies on**, the arc aiming short of it by the roll so the
   ship ends near the pointer; **Loop** is the
   K-Turn's flip after the shortest run the ship can fly (the slowest straight), so the two are already close
   (reading 5 of the handoff: they may merge after play).
11. **Acceleration and the slip** (your notes, 11 October: "I don't like how ships fly at a constant speed during
   their turns… there's no slight drift as they perform hard turns"). Speed now changes within a manoeuvre: a turn
   brakes into its apex and powers out (down to 45% of cruise at the minimum radius, `FLAIR_DIP`), a Boost surges,
   a glide is throttled back, and speed carries across segments at limited rates (`ACCEL` slower than `BRAKE`), so
   a ship visibly accelerates out of a hard bank; its engines flare while it does. In a hard turn the ship **slips**:
   its nose leads the line of flight (up to 0.42 rad at the minimum radius, `SLIP_NOSE`, so the guns come round
   first) and it slides a little wide of the arc (up to 32 units, `SLIP_OUT`), back on line by the end. The preview
   draws the slide, so the line is still the flight. Where the ship ends and the round's length never change.
12. **A deviation from the handoff's damage line (flagged, not silently picked): each projectile deals a quarter of a
   weapon roll** (`PROJ_DMG` 0.25), so a four-round burst is about one roll, the damage one attack does today. With
   the handoff's literal "per projectile: the weapon's damage" (`PROJ_DMG` 1.0, on the panel) a burst is four rolls,
   and on the first test run the E1 Fox died inside one exec to two locked-on Motes, with no plan able to matter. A
   missile is one warhead and deals its whole roll. **Since C-65** a bolt's share comes from `GUN_DPS` (0.5 of a roll a
   second, the same as four quarter-rolls every 2 s) spread over about ten bolts a second.
13. **Guns aim at the intercept**: each burst leads the target by its current velocity, clamped inside the firing
   arc, then the pilot's spread scatters it (the spread is the cone's full width). Drift's guns therefore fire along
   the nose, anywhere inside its arc.
14. **Spread is Aim and nerve**: the base × 1 / (1 + 0.1 × the Aim bonus, the database's skill-and-level bonus) ×
   (1 + 1.5 × (1 − nerve / 100)), plus range past band 1 for guns, plus 3° per Targeting Array Damage critical (the
   critical's "−2 aim" has no meaning without the d20). Drones and the depot have no nerve to rattle, as today.
15. **Nerve from fire, once a burst**: the existing −12 (armour or hull hit) or −5 (shields only) lands once per burst
   that hits a ship, not per projectile (four of them would empty the meter in one burst); each missile hit counts
   on its own. Kills, wingmen lost, a lead down, the cockpit breach and +6 breathing room for a ship not hit all
   exec are today's numbers.
16. **Rocks stop projectiles and missiles** (the same 85% radius `losBlocked` uses), and **block lock gain**: lock
   only climbs with a clear line, as a lock action needs today.
17. **Lock is stored per target and survives target switching**; it decays only while that target is behind the
   firer. Each ship keeps one target: yours default to the nearest hostile and change when you click a hostile with
   your ship selected; enemies take the nearest.
18. **Fly Defensively's profile is an area**: × 0.25 makes each axis of the hull ellipse half as long. With
   `flydefImmunity` on, guns cannot hit at all. The hull ellipse is 22 × 10 units (half-axes) times the ship's
   visual size: a guess at the art's outline, on the panel.
19. **Projectiles in flight keep flying across the PLAN pause**: the next exec picks them up where they were.
20. **Interrupts stay out of SB v1** (they are v2's pillar); whether SB gains them is a cross-breeding question
   after the comparison.
21. **Special Ability and Ship Ability are empty stub slots** (`// DESIGN OPEN` in `sim-sb.js`): the planning
   tray shows a Special or Ship icon only when the ship has one (C-62 item 8); the only entry is the lead's
   self-repair (today's Field repair, +15% hull). What pilots learn and what ships or attachments grant is yours to
   design.
22. **The action resolves between the two segments**, as SEG 1's arc completes (with End here, at that segment's
   end; a ship with no move, at once): `docs/archive/SB-HUD-HANDOFF.md` §3.4, your 12 October instruction (C-61 item 2).
   Until then it resolved as the exec began. The Hegemony chooses its action as the exec begins and it fires at the
   same boundary. **Fix Critical clears the oldest critical**: `CRITDEFS` has no "repairable" flag, so every
   critical is repairable.
23. **The Hegemony takes an action too**, a copy of the useful half of today's `aiAction`: a lead fixes criticals,
   low shields get boosted, nerve under 55 Locks In; panicking pilots do nothing.
24. **Drift**: the facing handle starts pointing straight back (the hunted fox's shot); during the segment the nose
   swings to the facing over its first 15%, holds, and swings back to the line of flight over its last 10%. The guns
   fire anywhere inside the arc around that nose.
25. **Loop is in no preset's moveset** (the handoff's presets give the ace Boost, Drift, K-Turn and Barrel Roll); a
   scenario can grant it with its own `pilot.moveset`, or tick it on the panel's moveset rows.
26. **The Hegemony's pilots search their manoeuvres** (your note, 11 October: "the AI needs major work in order to
   pose a threat"). Each enemy tries about 500 two-segment plans through its own reach (the doctrine's goal among
   them as a seed), predicting where its target is going from how it is flying now (holding its current turn,
   `AI_LOOK`), never from the plan you just drew. It scores each over ten moments of the round: its guns on the target
   (more for centred and close), the target's guns on it (with a wider cone, since the target can swing its nose),
   ending at 340 units and on the target's six, never overshooting in front of it, and staying off the rocks (checked
   every ~30 units), the map edge and its wingmates. A green pilot's choice is noisier than a veteran's; a target is
   picked by nearness, already being in its guns, damage and stickiness. Measured against the old planner on a scripted
   weaving fox in E1 (six seeds): guns on target about 8 s a round against 4 (of 12 possible), the fox lasting 3.5
   rounds against 5. From a head-on start the pursuers now decline the joust, swing wide and come round onto the
   fox's six. All the weights are on the panel. **Doctrine stays a goal module** (`SB_DOCTRINES`, the same
   `{goal, tell}` shape as v2's): only `pursuit` exists. An unbuilt doctrine
   (`wingman`, `hold_asset`, `firing_line`, all built in v2) pursues under SB until they are ported across (one goal
   function, two planners). The pursuit tell is a blue chevron over the pursuer pointing at its quarry, with the
   lock line; both always on (panel toggle).
27. **Panic**: a panicking Hegemony pilot flies its doctrine's line defensively (Fly Defensively segments); one
   that `flees` runs for the nearest edge and jumps out within 120 units of it, as today.
28. **The experiments** are SB-only entries (`rulesets:['sb']`); E1 to E5 also run under SB, so the same seed can be
   played under both rulesets. `sb3_count` reuses E3's 4- and 8-ship variants (matched flights).
   SB metrics add, per ship: bursts, shots, hits, damage, missiles, kills, peak lock, seconds with the target in arc,
   shots fired in a Drift segment and how many of those flew backward along the line of flight (sb2_drift's
   question), the action taken and the segment kinds flown.
29. **At the 8-ship cap the screen is busy** (sb3's question): the panel's "Resolution cards and damage numbers"
   toggle quiets it to tracers, locks and impacts.
30. **Speed, visible shots, smooth motion** (your notes, 11 October: "very slow and lethargic and not like an
   exciting dogfight"). What I changed, all in SB Test, v2 untouched:
   - **Smooth motion.** The sim still steps 20 times a second (deterministic), but ships, shots and missiles are now
     drawn where they are between steps, so motion runs at the screen's frame rate. Before, two of every three frames
     repeated the last step. Ship art is drawn once per look and stamped (it cost about half a millisecond a ship a
     frame), and the starfield is batched.
   - **Speed.** `SPEED_SCALE` 1.6 multiplies every craft's speed range but not its turn radius, so craft cover 60% more
     ground a round and the turn limit bites harder: **the dial is still the backend, scaled**. The chase camera holds
     the fight close, so the speed reads on screen.
   - **Shots.** Projectiles slowed from 1,400 to 850 u/s, longer glowing tracers, muzzle flashes, sparks thrown back
     along the shot, a fuller explosion, and v2's sounds for firing, hits and kills. While the fight runs the firing
     arc and the dashed lock lines are hidden (the lock ring stays), so nothing sits on top of the tracers.
   - **Ship size.** `SHIP_SCALE` 1.35 draws ships bigger **and grows their hull ellipse with them**, so what you see is
     what gets hit; the price is more hits than before. Slower shots and faster craft pull the other way.
   - **Banking and contrails.** Ships roll into turns in proportion to how tight they are, and leave fading contrails
     that carry across the planning pause.
   Rate of fire was unchanged then (`BURST_EVERY` 2 s, the handoff's "frequent, not constant"); C-65 turned it into
   streams. The Graf still turns as tightly as the Talon (item 8).

32. **Momentum shapes the reach** (your call, 12 October, SB only; Resolved log). Each ship carries the speed it flew
   last round (in dial speeds; a fresh ship carries cruise, halfway between its slowest and top straight). This
   round's distance must sit within 1.5 dial speeds faster (`MOM_UP`) and 2 slower (`MOM_DOWN`) than that, and the
   faster it comes in, the wider its tightest turn (× (slowest straight / speed carried in) ^ 1.5, `MOM_TURN`). For a
   Talon: out of a slow round (2) the reach is short and wide with full hard turns but tops out at speed 3.5; at
   cruise (3.5) it is the whole dial; out of a full-speed run (5) the hard-turn shoulders are gone (69° at most) and it
   can't fly slower than 3. While you drag, an orange dashed arc marks the slowest it can fly this round; the orders
   strip shows the momentum and this round's speed range. A Boosted round carries its extra speed into the next.
   The Hegemony flies by the same rule, and its planner now looks a round ahead: a plan that ends pointed at a rock is
   scored down, because momentum will carry it on (before, a pursuer could steer into the belt and find every next
   option crossing rock). Off with the panel's "Momentum shapes the reach" toggle.
31. **A conflict, flagged: SB's rounds are now 3 seconds, where your SteamBirds notes asked for 6** ("it lasts about
   3 seconds… I'd extend it to 6 seconds to account for our action point system"). Your 11 October note ("it feels a
   bit like I'm playing in slow motion; everything movement related ought to be much quicker") and the one before
   ("ships overall can move too far") together leave only time to change: so SB's default exec is 3 s (its own; v2
   keeps 6 s) and the same reach flies twice as fast (a Talon's top speed ~310 units a second, from ~155). The panel's
   exec slider runs 1.5 to 10 s if you'd rather keep the longer round and raise `SPEED_SCALE` instead. With it: turns
   brake less (to 65% of cruise at the minimum radius), acceleration is quicker, Drift's nose swings in 0.25 s, and
   the chase camera follows twice as tightly. Combat's per-second numbers (bursts every 2 s, lock gain) are untouched,
   so a 3 s round has half the shooting of a 6 s one; that waits for the combat pass, as you said.
   **Your call:** keep 3 s, or go back to 6 s with faster craft.

**Needs from you:** your felt verdict after playing the same seed and scenario under both rulesets (the comparison
is the deliverable; I'll record it here); calls on item 8 (should the freighter turn wider than the Talon?) and
item 12 (now a damage-a-second question: `GUN_DPS`, C-65); confirm or change the rest.
**Your call:** _open_

## Arena graduation (M-35)

### M-35 🟡 Arena graduation: what waits until E1 passes
Deliberately not built until experiment E1 (the hunted fox) passes, per the handoff (§9):
1. **A shared combat-maths module.** `sim2.js` copies the `space.js` functions it needs (each block names its source);
   extracting one module both use is a separate job, and only if v2 graduates. Until then the copies must not drift.
2. **Ground combat in the Arena** (the same skeleton: doctrine, nerve, cover-first AI), as Arena v2 reusing the picker
   and the panel.
3. **The campaign's space combat on the v2 sim.**
4. **The design doc's parked items:** FFG-style mods, doctrine pages as intel, the one authored fly-it-yourself
   setpiece; and how much of each doctrine's tell the shipping game shows (always, on hover, or once learned).
**Needs from you:** E1's verdict. **Your call:** _open_
