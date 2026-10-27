# Design blockers: entries retired in the blockers sweep

> Moved verbatim from `docs/DESIGN_BLOCKERS.md` in the blockers sweep of 27 October 2026, with the designer's agreement
> (their Blockers tracker). Whole entries were retired as outdated or confirmed as built; trimmed entries are here in
> full, and what is still open stays in `docs/DESIGN_BLOCKERS.md` under the same ID. Code comments cite these entries
> by ID. Each one's line in the Resolved log there says why it was retired. Links point at the docs as they stood then.


### C-13 ⚪ Two small bugs in the handoff's §9 CSS, patched from `scenes.css`
`sr-kit.css` is checked in verbatim per the handoff, so the fixes live in `scenes.css` (which loads after it):
1. `.bm-strip{display:none}` is declared *after* the phone `@container` block that sets it to `display:flex`,
   so the phone strip never shows — re-asserted inside the same container query.
2. `.bm-restock span{…}` (the sub-line style) out-specifies `.bm-restock__n`, so a `<span>` day-counter renders
   tiny and grey — the game renders the number as `<i class="bm-restock__n">` instead.
3. `.bm-card .kit-well .it-art` (192px) out-specifies `.bm-merc__kit .it-art` (72px), so a mercenary lot's
   own-kit art fills the well and pushes the "Brings own kit" caption out — re-asserted in `scenes.css`.
4. `.ar-slots` and `.ar-slothead` (the Arsenal's Loadouts rail) have six columns; the Back slot (C-25) needs a seventh,
   re-declared in `scenes.css`.
**Needs from you:** nothing; just carry the fixes back into the canvas CSS if it gets re-exported.
**Your call:** _open (informational)_

### C-18 ⚪ Art-kit lore guesses carried into the game
**Settled:** the makers (Gear doc and the October 5 art handoff: every maker the doc names is in the items table and
the art kit, TenTiU is gone, the Patriot items are confirmed, the EG-55 is Fightstar); the Strider is AutoCom's;
armour is built; the four head items have art.
**Still open:**
- **Ship attachments:** only the Door Mounted Gun is designed; `plates` and `tank` are placeholder examples.
- **Floatin' Truck attachments** (mg, plates, ram, spotlight, crates) are proposals; the truck itself is not in
  the game.
**Needs from you:** the ship and truck attachment lists, whenever you get to them.
**Your call:** _part answered; attachments open_

### C-19 ⚪ Ships live in the Arsenal, not their own Fleet tab
*(Numbered C-12 by mistake when it was added; C-12 is Cass's Door Gunner in the Resolved log.)*
The Gear doc gives ships a tab of their own; the Market/Arsenal handoff puts them under the Arsenal's
Ships chip, and you said that is "fine for now". Built that way. **Needs from you:** say the word if and when a
Fleet tab should exist, and what it would hold that the Arsenal's Ships view does not.
**Your call:** _resolved for now ("fine for now"); reopen at will_

### C-27 ⚪ Guard lines: idle chatter is now spoken; place-bound lines changed
With C-26 every Hegemony guard type has two kinds of line in `game/js/mission-text.js` (the Missions tab of the text
sheet): **alarm** lines, said by whoever raises the alarm, and **idle** lines. Before, each guard had two or three
hand-written lines but the game only ever spoke the last one; the rest were never shown. They are now the idle lines,
and a guard the squad can see says one every 9 to 17 seconds while all is quiet. That is new behaviour I chose so
the lines get used.
Because any guard can now turn up in any mission, lines tied to one place were changed: "Nothing at the toll office"
is "Nothing at the {target}", "Cell block is sealed" is "The {target} is sealed", "Contact at the databank!" is
"Contact at the {target}!". Dropped: "Herders don’t come this way", "Sheriff’ll have my head", "Barge side is clear",
"Cooling plant clear", "Nothing at the store", and the vehicle crews' radio lines ("Unit 4, responding",
"Unloading!", "Turret, light them up!", "Pull over! All of you!").
**Needs from you:** whether idle chatter should stay (and how often), and any lines you want back, written for any
location. Edit them in the Missions tab.
**Your call:** _open_

### C-34 ⚪ Mission report: what I chose
Built from the handoff's §1 (`reportHTML` in `game/js/base.js`, `game/ui/sr-report.css`).
1. **Intel:** the handoff names four resource tiles, but six missions pay Intel. Intel gets a fifth tile in its
   `--sr-res-intel` colour when gained (it wraps to a second row).
2. **Source rows beyond pay and found:** the stealth bonus shows as its own "+N stealth bonus" row (it used to be
   tagged), Scavenger's Eye materials as "salvaged", and a ship sold for want of a berth as "fenced, no berth".
3. **A level-up** fills the whole XP bar in gold (the old level finished), and the line under the gain reads the
   new level and its fill ("Lv 3 · 20%").
4. **Revolution rows:** the handoff's parts (mission, first or second operation, liberation, region liberated) plus
   "Symbol of the Revolution" when the Propagandist's bonus adds to it.
5. **A failed space mission** does not track objectives, so all of them show as missed. Ground missions report
   which were met.
6. **Hacked units** (a Policebot that joins the roster) show as a Bot tile with an icon; there is no art for them
   outside combat.
**Needs from you:** anything above you would like different.
**Your call:** _open_

### C-36 ⚪ Comm burst: what I chose
Built from the handoff's §3 (`commHTML` in `game/js/base.js`, `game/ui/sr-comm.css`; glue in `game/ui/scenes.css`).
1. **After Acknowledge** the channel stays open: what happened becomes a log line ("New mission on the board…",
   with Cass's second-pilot note during onboarding), then "No signal waiting." and Close channel. The handoff does
   not say what follows Acknowledge.
2. **Source events** (a source raising something, with answers to pick) use the same window: their words in the
   bubble with no Signal tag, the answers below it, no footer.
3. **A level-up** fills the meter and names the new level (cultivation restarts at 0 when a source levels).
4. **Narration:** the bare "Cultivation increased." and a visit's "Cultivation +10" lines are gone (the meter shows
   them); a visit's "Their risk +6: being seen costs." stays as a log line. An answer's lines keep their numbers.
5. **Sources have no portraits**, so the avatar is their initials.
6. **The lead card** reads "Ground · Moderate risk · Akkaro · Dustfall" for a ground lead and "Space · High risk"
   (with "· {World} orbit" when the mission has a world) for a space one. Recruit and other signals add no
   mission, so they show no lead card.
7. **Cass's transmission** puts "Unregistered freighter · voices masked" in the channel strip (it was the footer
   note) and has no Signal tag.
**Needs from you:** anything above you would like different.
**Your call:** _open_

### C-37 🟡 Missions tab: what I chose
Built from the handoff's §4 (`openMissions` / `renderMissions` in `game/js/base.js`, `game/ui/sr-briefing.css`; glue
in `game/ui/scenes.css`). The popup is gone: everything that opened it opens the tab.
1. **Space targets and threats are decorative.** No mission says how many targets or Hegemony ships a sortie
   has, so the orbit always shows one target diamond and two threat triangles. Tell me if they should read the
   mission (the space scene's enemy list, say).
2. **Which missions the board lists:** available ones, ones under way (flagged "Under way"; the Plan button reads
   "Under way · N days left") and locked ones. Finished missions leave the board.
3. **New** stays on a card until it has been looked at in the briefing (`m.seen`); an older save's board counts as
   seen (a save migration).
4. **Locked:** no mission is locked today (only an old Strider state used it). A locked card reads "Signal
   encrypted", the table shows scrambled bars, and the briefing says to raise the source; there is no Plan.
5. **The label** for space reads "{World} · Orbit", or "Open space" for a mission with no world.
6. **Requirement details** are generic: "Only 1 available", "None available", "Have 0" for items and fuel, "A
   transport won't do" for a starfighter. The hauler hint shows while the derelict hauler is not restored or
   being restored. The orange reason under Plan is the first unmet requirement ("Needs 2 pilots").
7. **Rewards** list assets first (FT-4 Cross, a fighter, the Strider, a recruit by name), then resources, then the
   region's liberation. There is no XP chip.
8. **Fitting the rail:** the pitch is always 3 lines; if the briefing still runs long, objectives go to one line
   each, then the requirement details are hidden and the pitch drops to 2 lines. At 1440×900 everything fits; at
   1280×800 the objectives clamp.
9. **Phone:** the board and a smaller table stack and scroll, without callouts; a card opens the briefing in the
   drawer (its button reads "Briefing"). `sr-briefing.css` has no phone block of its own, so this is my layout.
10. **Advance day** is the command bar's own button: while the tab is up its wrapper becomes the bare `.bf-go`.
11. **Show on map** closes the tab and opens the world in the Galaxy.
12. The handoff's comms line ("Cass Wender marked Steal the Cross as urgent…", §5 placeholder) is not built; the
    feed shows the real news.
**Needs from you:** (1), and anything else you would like different.
**Your call:** _open_

### C-38 ⚪ Audio pass: what I chose
Bringing the audio up to the rest of the game's standard (`SR.audio` in `game/js/core.js`, the base palette in
`game/js/base.js`).
1. **Sound on/off now persists** with the other player settings (screen shake, blood) and one press anywhere
   flips every scene's button. It used to reset to "on" on every reload.
2. **The base scene played one alert for everything.** It now has three, keyed to the news feed's own kinds:
   a *rising chime* for good news ('p'/'g': level-ups, promotions and commissions, recruits arriving, a new hero,
   a merc's contract, a Support fork, a new source), a *falling tone* for bad news ('h': a burned or assassinated
   source, a walkout, a failed auto or field op, the Hegemony's escalation), and the old *ping* for news that
   waits (new missions and leads, sources calling in). Tell me if any event should move buckets.
3. **The base's sounds gained a layer each** (a wrench on the build chime, a carrier crackle on the comm, an
   engine growl under the launch) to match the combat scenes' layered engines. Nothing changed in ground or space.
**Needs from you:** nothing — overrule any bucket in (2) you hear differently.
**Your call:** _open_

### C-39 ⚪ Starfighter window: what I chose
The one-window pilot-and-ship file (`docs/ui/SCREENS-HANDOFF-2.md` §1, `game/js/space.js`). What the handoff
left open, and the guesses I made:
1. **The hangar's `SR.shipSheet`** now renders the same window with the pilot column, nerve and lock hidden
   (the handoff's §6 asks you to confirm this). The old side-by-side top-down view is gone with it.
2. **Rank chevrons** (display only): one chevron per rung of the pilot ladder (officers count their own ladder),
   at least one, capped at four. A rank the ladders don't know (the Hegemony's "Commandant") shows one chevron.
3. **The move-set popover's rows** run from the ship's un-critted top speed down to 1, so cells an Engine crit
   drops read as off instead of vanishing.
4. **Zone labels** total every segment sitting in the zone: fore and aft both angled forward reads
   "Fore shield · angled forward 30/30" over one arc, with "Aft zone exposed" under the other.
5. **Skill effect lines for scripted pilots** (the sim, the instructor's cadets): Cunning's % derives from the
   skill value; campaign pilots use their rebel record's multiplier as before. Presence's "n Cool" line shows the
   pilot's current nerve value, which moves in combat.
6. **Enemy ships open the same window** (foe styling, same "Starfighter" title); drones and structures open the
   bare variant, like the hangar's.
**Needs from you:** confirm (1); overrule any of (2)–(6) you want differently.
**Your call:** _open_

### C-43 ⚪ Weapon voices: what I chose
Every weapon now has its own sound, and a trigger pull plays one report per round of the same volley plan the
tracers draw from — an 8-round automatic burst is 8 tracers and 8 reports on the same clock (`VOICE`/`sShot` in
`game/js/ground.js`, `SVOICE`/`sVolley` in `game/js/space.js`; before this, the rocket, the Stiletto, the Strider,
the Cruiser guns and even bare fists all played the Longhorn's crack, and burst counts were canned).
1. **Ballistic vs plasma:** ballistic reports are noise-led cracks with a low thump; plasma is oscillator-led
   with no brass and a sizzle (not a ricochet) when a missed bolt lands.
2. **Within plasma**, each weapon sweeps its own way: the EG-55 carbine keeps the military two-tone zap, the
   Stiletto is cleaner, higher and shorter (sporting), the Policebot's Auto Plasma Hand beats two detuned
   squares against each other, the Cruiser pulse cannon is deep and heavy, the Dispersal turret is an airy
   splatter, the Improvised Plasma SMG crackles. In space the drones' pulse emitters share one small chirpy
   voice (the database gives all three the same stats), the Pursuer uses the Cruiser's cannon voice, and
   Hegemony plasma runs lower-pitched than ours, as it always did.
3. **Character calls:** the Longhorn keeps its canyon echo (once per pull, after the last round); the Cowboy's
   fan-the-hammer is three full revolver booms; the rocket plays a launch whoosh on the pull and its burst
   when it lands; melee (bare hands, Riot Fists) is a swing and a thud, not a gunshot. Ricochets now ring at
   the moment a missed round actually lands (more often off a wall) instead of 40% of misses at the muzzle.
4. **Not touched:** missiles (lock, whoosh and warhead were already event-driven), the mining laser, arclight,
   Power Baton and Plasma SMG have voices waiting but stay live:FALSE (M-17).
**Needs from you:** nothing — name any weapon that sounds wrong and I'll re-cut its voice.
**Your call:** _open_

### C-45 ⚪ Cover by the line of the shot: what I chose
Your cover notes of 2026-10-07 are built: no more 360° ring. The numbers and readings are mine:
1. **A prop is cover** when the target is within 34 px of it (hugging) and the shot's line passes through it (its
   radius + 6 px), between shooter and target. Values as before: crates, drums and the charge station +8, the
   truck +10, a boulder +9. Cover still soaks 25% of a hit's damage, and a miss still chips the prop.
2. **A building is cover** (+9, "Wall cover") when the target hugs its wall and the shooter is round the corner:
   the direction to the shooter is within 80° of the direction to the wall. Shooting straight down a wall, or
   from the open side, gets no cover. Buildings still block sight outright.
3. ~~Flanked −2~~ Decided: a flanked target just loses the cover, with no extra penalty (Resolved log, C-45.3).
4. **Take cover** adds +2 on top of the cover, only against shots the cover is in the way of (it used to double
   the cover). ~~It costs the shot~~ Decided: they still shoot that round (Resolved log, C-45.4).
5. **The hints judge cover against the hostiles who could fire on a spot** (in range, clear line, and seen by the
   squad): the move picker draws a shield at every cover spot in reach (bright: covered from all of them, faint:
   from some, none: flanked by all); a planned move and the hover say Covered, Cover from n of m, or Flanked.
6. **The enemy AI** picks spots behind cover as its target sees them (or a building corner), keeps 140 px from
   the squad, never takes a crate a rebel is hugging, and does not pile onto a spot another of its side has
   claimed. In a quick check over three maps, enemies ending a move within 100 px of a rebel fell from 16 of 114
   to 1.
7. **Enemy shots** open straight on their result card. *Since your note of 2026-10-08 (the camera left too soon to
   see what happened):* the shot goes as soon as the camera has the shooter and the target in view (at once if they
   already are, otherwise after 0.25 to 0.7 s), and the result stays on screen 1 s after the last round lands before
   the camera moves to the next shooter (`FAST_TAIL`, `AIM_MIN`/`AIM_MAX` in `ground.js`). A rebel's shot still plays
   the whole card, and their portrait is selected when their turn comes.
8. **The Razorrat** fired from its tripod (a field deployment or the Steal the Cross emplacement) has Automatic
   at −2, shown as "Automatic (Deployed)"; the second burst on a hit rolls at −10 as before.
**Needs from you:** confirm the numbers.
**Your call:** _open_

### C-49 ⚪ iPad Pro 12.9": the tablet layout, and what I chose
The iPad Pro 12.9" (2021) is 1024 × 1366 in portrait and 1366 × 1024 in landscape, a touch screen. No handoff covers
tablets, so these are my choices (`tools/ipad-smoke.js` checks them in both orientations):
1. **Landscape is the desktop layout.** At 1366 wide everything fits as it does on a laptop.
2. **Portrait gets a tablet layout** (a container query in `sr-theme.css`: wider than 900 and up to 1100, taller
   than 520, so a narrow desktop window or an iPad in Split View gets it too). Everything keeps its desktop size; the
   rail becomes a panel that slides in from the right over the stage, opened by the drawer button as on a phone, so
   the map, the tabs and the planning window have the full width. Picking a mission, a node on the Network or a Source
   or world on the Galaxy opens it. In a fight, tapping the map closes it.
3. **The top bar** is a little tighter there (gaps, the resource pills), so the menu button stays on screen.
4. **The mission board and Exposure** sit 16 to 20 px lower at every size, clear of the tabs (they touched at any width up to
   1500).
5. **Not covered yet:** dragging people and ships between plan slots is mouse only (iPad Safari has no drag and drop
   for these); tapping a slot and picking works. Haven Rock's 180 px home-screen icon is used as is (an iPad Pro asks
   for 167 px), and there is no launch image for the home-screen app.
**Needs from you:** confirm the portrait layout, or describe the tablet layout you want.
**Your call:** _open_

### C-53 ⚪ Market art at small heights
`docs/FEEDBACK-0.2-HANDOFF.md` §4 keeps the phone rule (`grid-auto-rows:230px`), but a weapon card (its trait row and a
96px well) needs about 265px, so at 230 its price row was cut off. On a phone the rows are now `minmax(230px, auto)`:
230 stays the floor and a taller card makes its row taller (the whole view scrolls there already). The art is sized
from the well's width on a phone (the width is what limits it there).
**Needs from you:** overrule it, or say how a weapon card should fit 230px (a smaller well, the trait row moved).
**Your call:** _open_

### C-67 ⚪ High Command: readings to confirm, and what I chose building it
`docs/archive/ARENA-HC-HANDOFF.md`, phase T1 (later phases add to this list). Built in `game/js/sim-hc.js` (the sim) and
`game/js/arena-hc.js` (the HUD); v2 and SB are untouched.
1. **The scenarios sit in the registry but are written in `arena-hc.js`**, which adds them to `ARENA_SCENARIOS` with
   `rulesets:['hc']` when it loads, so `arena.js` only gains the ruleset entry and its three dispatch lines. Their
   shape is v2's grouped into wings, plus quiet allies, named points, objectives, the clock, a jammer and rules.
2. **Flight is SB's flown body steered at a goal point** (its turning was replaced by the corner-speed model in C-69), not SB's segment fitter: there are no rounds to fit a
   curve to. The envelope is still the dial's: a speed band (a ship can't stop, so holding is orbiting) and a turn
   rate capped at speed × its tightest-turn curvature, with SB's nose that leads into a turn (`SLIP_NOSE`). Pilot
   movesets (Boost, Drift…) are not flown yet; they arrive as abilities (T3).
3. **Personality comes from traits**: `sim2.js`'s doctrine AI has no per-pilot weights to copy, so reckless / brave
   pilots are *eager* (fight closer, hold formation loosely, stay in hurt) and steady / cautious / veteran ones
   *steady* (hold formation); everyone else is even. Joss (reckless) is hc1's eager pilot.
4. **Relay K-7 jams the jump point**: nothing jumps while it stands, so the convoy waits there for Dagger. Your
   canvas lists the relay and the convoy as separate objectives; this ties them so the scenario has one story.
5. **A mission ends when nothing of yours is left on the map** (every ship down or jumped), or on Abort. It is won
   when every primary objective is done; the optional satellite only pays command points.
6. **The "better local target"**: a ship on Attack turns on a hostile within `THREAT_R` of its guns that has it in
   its arc (or just hit it), unless that is its designation anyway; Patriot Override (T3) holds it to the
   designation. Otherwise wings hold their target `COMMIT_SECS` before switching, so they don't thrash.
7. **Opportunity fire**: while its designated target is outside its guns, a ship fires at any hostile ship that
   crosses them (never at a station it wasn't ordered onto). A withdrawing or escorting ship still shoots; a
   panicking one doesn't.
8. **Leaders are the highest-level pilot** unless the scenario names one, pending the meta layer's Wing Leader.
9. **A mission opens paused**, so the first decision never runs against the clock.
10. **The Hegemony has three roles**: patrol (engages inside `DETECT_R`, gives up past `LEASH_R`), guard (holds on an
    asset inside `GUARD_R`) and hunt (the reinforcements: anything, anywhere).
11. **Relay K-7 is the fuel depot's row** (there is no relay ship or art) with the scenario's own hull and armour;
    it draws as the depot's octagon in Hegemony blue.
12. **The map is 16,800 × 12,000** (4 × space.js's; `HC_MAP`; it was 8,400 × 6,000 until C-69). At the fitted zoom
    ships are drawn up to 3.2 × their size to stay visible.
13. **One existing smoke check changed**: SB's picker test asserted the ruleset list was exactly the two; it now
    checks the first two, and the High Command section checks all three. The handoff asks for every earlier test
    to pass unchanged; a third picker entry makes that one line impossible.

*T2 (orders, tactics, rules, morale, the feed, the tiles):*

14. **The orders.** *Defend* takes an ally, a named point or "Here" (the wing's middle, or a map click) and engages
    what comes inside `DEFEND_R`. *Intercept* takes one enemy ship and never trades it for a closer one. *Hold* holds
    the wing's middle at the moment of the order (orbiting) and engages inside `HOLD_R`. *Regroup* re-forms on the
    leader and fires only at what crosses its guns. *Capture* needs `CAPTURE_SECS` of uncontested presence by ships
    ordered to capture (a hostile inside 1.5 × `CAPTURE_R` stops the clock). *Board* sends the wing's marine ships
    to dock while the rest cover them; a boarded station leaves the fight (a destroy objective on it counts as done).
15. **The tactics, as flown** (reworked in C-69 items 15 to 21; this was the T2 version): *Tight*: a V at 1 × the gap,
    every gun on the leader's target. *Spread*: line abreast at 3.4 ×, each pilot picks their own. *Screen*: an
    escort or defence hangs between its charge and the nearest threat. *Pincer*: alternate ships come in from either
    side of the target. *Hit and Run*: a 3 s pass, a 3 s extension. *Defensive*: fights at 0.8 × range and falls
    back hurt at 50% hull. Every tactic's "falls back hurt" means: when a ship is under its threshold and something
    has its guns on it, it breaks away toward its wing.
16. **The rules.** They outrank each other in the order Preservation, Saviour, Guardian, Bring It Down, Formation,
    and all outrank the wing order. Each fires once per ship (with a feed entry) and holds it; Preservation is for
    good (a ship sent home stays out). The hull rules fire the step the hull crosses, not at the next think.
    Guardian's "friendly objective" is a quiet ally (the convoy), a station you hold, or a ship you must protect.
    Bring It Down's "disabled" is under 50% hull or an engine or controls critical. Saviour asks for its ship when
    you add it. "No Rules" is an empty list, shown as such.
17. **Nerve is rebadged as morale** (EAGER / STEADY / SHAKEN / PANICKED from the same 0–100 meter). Two changes from
    the copied rule, both High Command only: **breathing room only recovers a pilot to their resting nerve** (the
    copied rule climbs to 100, which made every unhurt pilot EAGER within a minute; kills still lift them past it),
    and **every loss is × 0.6** (`NERVE_K`), because a pilot under fire in real time drops through a 3 s round's
    worth of nerve in a second and panics within two.
18. **SHAKEN** pilots hang back from an outnumbered target and fall back hurt sooner. **PANICKED** pilots flee (run
    from the nearest threat) or freeze (straight on, slow), guns silent, until nerve is back over 35: a pilot
    emergency, in the feed with their own words. Hegemony pilots panic too, and flee.
19. **Assessments are placeholder lines** `[TEXT NEEDED]`: two per state in `ASSESS` (`sim-hc.js`): pinned, flee,
    freeze, preserve, withdraw, winning, hurt, engage, station, escort, defend, hold, capture, board, shaken,
    fallback, form. Designer-facing for now; nothing ships without the text flow.
20. **Camera tiles are live** at about 10 frames a second (one tile a frame, round-robin), each its own zoomed view.
    With 8 or more tiles costing over `TILE_BUDGET` (after `TILE_WARM` rounds, while the sprites are first drawn)
    they fall back to static glyphs by themselves, and the panel has a switch.
21. **A tile's corner glyph is what the ship is doing** (cyan when a rule set it, hazard in an emergency), with the
    word and the morale in its foot; the pilot's assessment is its tooltip.
22. **Tab steps to the newest event you haven't viewed**; VIEW on any entry jumps there and opens that pilot.

*T3 (the pilot panel, the commands drawer, the command point economy, abilities and doctrine, emergencies):*

23. **While the jump point is jammed, a withdrawing ship falls back to its wing's rally point** (where the wing
    arrived) and waits there, out of the fight; it heads for the jump once the relay is down. Before this,
    Withdraw, Recall and Preservation all flew a ship through the relay's guards to a jump point it couldn't use.
    Withdrawing and falling-back ships also steer wide of hostiles (`DISENGAGE_R`).
24. **The v1 commands** (your §3.3 list): *Patriot Override* lifts a pilot's nerve to 55 (ending a panic) and holds
    them to the wing's designation for 12 s, ignoring closer threats and fear. *Emergency Recall* sends a ship (or a
    whole wing: arm it, then click the wing in the roster) out at a 6 s burn, for good. *Emergency Support*
    recharges one ship's shields to full (shields only, as the handoff says). *Recon Sweep* shows every Hegemony
    pilot's intent and target for 25 s, and the edge and make-up of the reinforcements. *Decoy Signal* plants a
    false contact at a place: Hegemony pilots within 1,600 chase it for 12 s (still shooting what crosses their
    guns). *Abort Mission* is free, pinned last in hazard, and takes a second click to confirm; the mission ends
    "aborted". *Reinforcement Request* is built behind a scenario's `reserves` (a wing it calls in at your edge);
    no scenario has reserves yet, so it renders disabled. *Comm Scramble* and *Comm Hack* render disabled with a
    `// DESIGN OPEN` card. **Not rendered (v2 stubs)**: Targeting Distortion, Dead Zone, Target Designation
    Support, the environmental orders, carrier ops.
25. **Command points** come from the scenario (hc1: 5), are spent on use, and come back only from an objective's
    `cpReward` (hc1's satellite: +1), never above the starting pool.
26. **Pilot emergencies** are a panic (C-67 item 18) or a **pin**: 2 or more hostiles with their guns on the ship
    while it is taking hits; a pin clears 3 s after it breaks. The feed entry carries the answers as live buttons,
    and the pilot panel has the same row. **The recommended answer**: in a panic, Override; under 40% hull,
    Recall; shields under 30%, Support; otherwise Override. Free answers: *send a wingmate* (the nearest wingmate
    not in trouble goes for whoever has them pinned, up to 15 s) and *ride it out*. In hc1 (seed 7) Wren is pinned
    at 0:12: Override holds her on the relay through the guards; Recall takes her out of the fight to the rally
    point, hull intact; a wingmate (Petra) turns onto her pinners; Support or riding it out leave her fighting on,
    with less shield. Each answer and the time it took are in the metrics.
27. **Two gold buttons can show at once**: the pilot panel's recommended answer is a gold primary, as your canvas
    draws it, beside the standing gold COMMANDS. The house rule is one gold primary a screen; the canvas wins (the
    handoff says so), so this is flagged rather than changed.
28. **Abilities and doctrine.** A pilot's abilities are Boost Shields and Lock In (anyone with shields and nerve),
    their moveset from SB (`ARENA_MOVESETS` by preset, or by level for a database pilot: Boost, Drift, K-Turn,
    Barrel Roll), and the leader's Field Repair. Each has an AUTO trigger and a stricter emergency one (its hover
    card says which); AUTO uses either, EMERG only the emergency one, MANUAL never (the panel's Use button works
    under any doctrine). Everyone starts on AUTO; Hegemony pilots are always AUTO. **Lock In on AUTO catches most
    panics before they land**; set it to EMERG or MANUAL to see more emergencies.
29. **Command first or target first**: COMMANDS, then a ship (on the map or its tile), a wing (Recall) or a place
    (Decoy); or right-click a ship, a tile, a wing header or open space for only the commands that fit it.

*T4 (leaders, the keys, the metrics, the scenarios, the panel):*

30. **The digits do two jobs** in §3.5 (speeds, and the tray's icons). With the tray open, 1–9 press its order icons
    and Shift+1–6 its tactics; with it closed, 1–4 set the speed. Space, Tab, F, Q / E and Esc work either way.
31. **The metrics record is per mission**, written to `ARENA_METRICS` when it ends, or when it is left unfinished
    (outcome "abandoned"). "Time to first order after an alert" counts any order, command or answer after it; the
    order rate is orders a real minute; the pause rate is pauses a real minute and the share of real time paused.
    Abort counts as a command.
32. **hc2, Last Light**: Lastlight is the fuel depot's row as your station (300 hull, 40 armour); three waves on their
    own clock (0:20 east, 1:15 north, 2:10 south) bring *raiders*, a fourth Hegemony role that goes for your
    installations and turns only on a fighter with its guns on it. The clock is the evacuation (3:00); at zero the
    reinforcements come and it's time to get out west. Guardian Directive starts standing.
33. **hc3, Meltdown**: Hammer is two marine-carrying Graf haulers (Anvil and Forge; there is no marine ship in the
    data, M-8) with two Talons; Lance is four fighters. Commandant Vex's Scimitar is the flagship guarding the
    reactor platform (the fuel depot's row again); Bring It Down starts standing. The variants are the standard
    5 command points, 3 and 7.
34. **A leader's death is a likely mass panic.** The copied `space.js` rule costs every wingmate 45 nerve when the
    lead dies (27 here, × `NERVE_K`). Under space.js only the scenario's lead counts; here every wing has one, so
    losing a leader both drops the wing's cohesion and often panics two or three pilots at once. **Your call:** keep
    it, soften it for High Command, or count only the mission's overall lead.
35. **The HC panel group** holds every High Command number in sections (Run, Flight, Fighting, Orders, Hegemony,
    Leaders, Rules, Morale, Commands, Tactics), including the whole tactic weight table and the slow and fast
    speeds, with Reset to defaults and the key list. Values are remembered under `sr-arena-hc-prefs`, never the
    campaign key.
36. **Performance**: an hc3 brawl at speed 3 averages about 9 ms a frame here with eight live tiles. The tiles first
    cost about 3 ms each (enough to trip the fallback) because they drew ships at a size the map doesn't and the two
    evicted each other's cached sprites; with their own coarser cache they cost 0.1 to 0.4 ms, so they stay live.
    With 8 or more ships the roster's tiles are drawn smaller so the whole roster fits beside the time controls.
37. **Not built, waiting on systems that don't exist**: a mission briefing (rules start from the scenario's list and
    are edited live with + RULE), the meta layer's Wing Leader assignment (leaders are by level), marines as a ship
    type (M-8: Hammer's haulers carry them by scenario flag), and reserves in any scenario (Reinforcement Request is
    built and stays disabled).
**Your call:** _open_ (item 34 especially)

### C-69 🟡 High Command playtest 1: what I chose building it, and the placeholders
Your notes and the approved proposal (with your answers of 13 October) are in `docs/archive/ARENA-HC-FEEDBACK-1.md`. Built in
phases F1 to F4 in `game/js/sim-hc.js` and `game/js/arena-hc.js`; v2 and SB are untouched. The numbers that changed
are updated in C-68.

*F1 (the scale, Jump Out, the HUD's placement):*

1. **Faster ships, the full gun reach.** Top speed × 2 (`SPEED_SCALE` 2.5: a Talon tops out at 625 a second, panel to
   5). Ships try to fight at their weapon's full reach (`ENGAGE_FRAC` 1, as you set it). The new weapon range × slider
   (`RANGE_MULT`, on the next load) stays at 1 ×, since that isn't the slider you moved.
2. **The map is 4 × space.js's** (16,800 × 12,000, panel to 8). **Scenarios are written for the old 2 × map and
   scaled** to whatever map they load on: every place × 2 now, and rocks a little bigger (× 1.5). With ships twice as
   fast, the trips take as long as before; the clocks are unchanged. **The ranges that are about the map, not the
   guns, grew too**:
   - escort reach 2,200;
   - defend 2,000, hold 1,800;
   - patrol detection 2,500, guard 1,200, leash 5,000;
   - Guardian's reach 6,000;
   - the decoy's draw 2,500;
   - steering wide while withdrawing 1,600;
   - the jump, capture and boarding radii 350, 400 and 400.
3. **Spacing.** Formation slots are 320 apart (was 120), groups start 340 apart (`SPAWN_GAP`), and ships of one side keep
   220 of personal space (`SEP_R`, was a weak 90).
4. **The opening view frames your ships** (with 1,400 of room), not the whole map.
5. **Copy settings** (the panel's Run group) puts every panel number on the clipboard as one line, and shows it in a
   window to copy by hand if the browser won't allow the clipboard (it often won't from a file).
6. **Jump Out.** Once every primary objective is done, or the clock has run out, the objectives panel shows OBJECTIVES
   COMPLETE (or GET OUT) and a gold **ALL WINGS: JUMP OUT**. While it shows, COMMANDS steps down from gold, so the
   screen keeps one gold button. It orders every wing to Withdraw (cancelling any Recall), shows "Jumping out: n of m
   away", and the mission ends "complete" when the last surviving ship jumps. It is disabled while the jump point is
   jammed (the clock running out with Relay K-7 still up). **Leave now** ends the mission at once; anyone not yet
   jumped is lost, and the end card says how many were left behind. Both go in the metrics as commands.
7. **The order tray pops up above its wing's card** in the roster, and **the pilot panel above its tile**, centred on it
   and kept on the stage.
8. **Command points and COMMANDS sit bottom right, over the time controls**, bigger (a 54 px button, larger diamonds),
   and **the drawer opens upward** from the button. The top right is now empty.

*F2 (turning):*

9. **The corner-speed model, for both sides.** A ship turns best at its corner speed (`CORNER`, 0.7 × top speed), on
   the dial's tightest radius × 4 (`TURN_SCALE`): about 380 for a Talon or a Mote, 760 for a Cross. Below corner
   speed the turn rate falls with the square of speed: a Talon at its slowest turns at a third of its best. Above
   it, the turn widens (the rate falls with speed).
10. **Turning bleeds speed** (`TURN_BLEED` 1.2: a turn at the full corner rate costs 1.2 × top speed a second) while
    the engines push back (`THRUST_K` 0.7 × top speed a second, was 1.6). A sustained hard turn settles at about 0.76
    × corner speed, turning at under 60% of its best, so circling is a losing fight. I first tried a bleed of 0.9,
    but a turn then settled at 0.88 × corner speed, which didn't cost enough.
11. **Ships no longer brake into turns.** A ship that wants a hard turn aims for its corner speed: no faster, and never
    slower on purpose.
12. **The nose leads the line of flight by at most 0.2 rad** (`SLIP_NOSE`, was SB's 0.42), so guns point near where a
    ship is going.
13. **Formations keep station along a line**, not on a point: a ship that can't stop or turn tightly flies through
    its station toward a mark 700 ahead of it along the leader's heading (`SLOT_LOOK`), at a speed set by how far
    ahead or behind it is. A leader holding or re-forming circles 1,400 wide (`LEAD_ORBIT`), and holds and defences
    orbit 700 to 1,100 out. Before this the new wide turns made followers circle their slots.
14. **The proof**: in a two-against-two of Talons against Motes in open space, the ships pass, extend (out to about
    2,300 apart) and come round. They are within 400 of each other under a tenth of the time, where before they
    circled on top of each other.

*F3 (fighting: attack runs, break-offs, the tactics, AUTO):*

15. **Every ship fights in attack runs, both sides**:
    - **run** in at the target's lead point at full speed, guns on it;
    - **extend** once it passes within 0.3 × gun reach (`PASS_K`), or overshoots, straight out to 1.4 × reach past it
      (`EXTEND_K`, at most 9 s), veering away from the target's nose if it is facing them;
    - **turn** back at corner speed;
    - **run** again.

    A ship faster than its target that finds itself in the target's rear quarter may **pursue** it there, and drops
    back to runs as soon as the target turns inside it. Stations get the same runs. This replaces Hit and Run's timed
    passes and Tight / Spread's sit-behind pursuit.
16. **Pilots break off a bad fight themselves.** A close fight (inside 1.5 × reach) turning for 4 s without the target
    in the guns (`STALE_SECS`; eager pilots hang on 1.5 × as long, steady ones 0.7 ×), or an enemy close (0.8 × reach)
    on its six, sends the ship into an extension (boosting if its Boost is on AUTO), then back with a fresh run. Six
    break-offs are at least 3 s apart. The metrics count them (`breakoffs`).
17. **The tactics now shape the runs and the travel formation, never a turning fight**:
    - *Tight* makes its passes together on one target: the wing extends when the leader does and re-forms on the
      leader between passes.
    - *Spread*: each pilot runs on its own target, with wide spacing while travelling.
    - *Screen* is unchanged, with shorter extensions.
    - *Pincer*: the two halves come in from either side (75° apart in the test) and both extend.
    - *Hit and Run* is harassment: it breaks off earlier (1.8 × the pass distance), extends 1.8 × as far, never takes
      the target's tail, and only one ship of the wing runs on a target at a time while the rest wait out of reach.
    - *Defensive* takes short passes (0.7 × the extension), never tail-chases, and falls back hurt at 50%.
18. **AUTO is a seventh tactic, first in the row and every scenario wing's default** (option A). The leader re-thinks
    the wing's tactic every second and holds a choice at least 4 s:
    - *Defensive* when the wing is under 50% average hull, or outnumbered 1.5 : 1 within 4 × gun reach;
    - *Screen* when it is escorting or defending and a hostile is within the escort reach of the charge;
    - *Tight* when its target is a station or a ship of size 7 or more;
    - *Pincer* when it has two or more ships and its target is alone (nothing else within 1.6 × reach);
    - *Spread* otherwise.

    The roster's chip reads "AUTO · TIGHT", the tray marks the picked tactic, and its hover card names it. A
    leaderless wing's cohesion penalty applies to the picked tactic. The metrics count AUTO's switches.
19. **Station keeping uses the new turning** (item 13) for Tight's re-forming too.
20. **The Cross now loses the shot battle to Motes.** The dial gives a Cross half a Mote's tightest turn (a hard turn
    from speed 2 against 1). Under the corner-speed model its turn back takes about 11 s against a Mote's 4, so in
    runs a Mote has its guns on a Cross for about 20 to 33% of a Spread or Tight fight, against 1 to 4% the other
    way. Pincer is the Cross's best answer (0 to 2% either way). Talons, as nimble as Motes and faster, beat them (a
    2 v 2 in open space left one Mote at a quarter hull and both Talons untouched). **Decided** (C-69.20 in the
    Resolved log): the Cross turns faster, but not as fast as the interceptors (C-71 item 6).
21. **Tests updated for the new scale and tactics**: the Tight-vs-Spread spacing test, the T1 escort and withdraw
    checks, T2's defend and hold distances and its feed check, HC 5's recall timing, the keys test (Spread is now
    Shift+3, AUTO being first) and the tray's tactic count. Nothing else changed in the earlier tests.

*F4 (speech bubbles):*

22. **Your pilots speak in bubbles over their ships**, for 2 s of real time (`BUBBLE_MS`), so a bubble reads the same
    at slow, play or fast (and still goes after 2 s while paused). What they say:
    - a pin or a panic: the emergency's quote (amber edge), as well as its feed line;
    - a kill: a "winning" line (green edge);
    - steadying after a panic: a new `steady` bank in `ASSESS` (green edge);
    - a mission rule firing: the pilot's assessment of the job the rule gave them;
    - a new job (a new kind of behaviour or a new target, not re-forming): their assessment.

    Only your pilots speak; the Hegemony is silent. The first four always speak; a new job speaks at most every 4 s
    per pilot (`BARK_GAP`, the panel's Morale group, 0 to 20).
23. **One bubble per ship, at most 4 on screen** (`BUBBLE_MAX`, the newest win): a pilot's new line replaces their
    old bubble. Bubbles are at most 210 px wide (`BUBBLE_W`), wrap, sit above the ship with a tail to it, and are
    nudged apart so two never overlap. They pop in and out over 140 ms (`BUBBLE_POP`), with no pop under reduced
    motion. The feed still carries the events, so nothing said is lost when a bubble goes.
24. **The lines are still the placeholders** (`[TEXT NEEDED]`, C-67 item 19), now with `steady` too. They will be read
    far more often in bubbles than in tooltips, so they are worth writing early.
**Your call:** none open (item 20 decided: C-69.20)

### C-70 🟡 High Command playtest 2: what I chose building it, and the placeholders
Your notes and what I found are in `docs/archive/ARENA-HC-FEEDBACK-2.md`. You asked for the changes directly, so I'm building
them in phases G1 to G5 in `game/js/sim-hc.js` and `game/js/arena-hc.js`; v2 and SB are untouched. The numbers that
changed are updated in C-68.

*G1 (smooth motion, the convoy, speed 4, the map):*

1. **Ships are drawn between their last two sim steps**, not extrapolated ahead of the last one. The sim steps 20
   times a second; a turning ship drawn ahead along its velocity snapped back onto its path every step (about 6 × the
   frame-to-frame jerk in a measured fight at speed 4). The map now shows the world one step (50 ms of game time)
   behind the sim, which is smooth at any frame rate and timescale. Missiles, bolts, trails, the follow camera and the
   camera tiles use the same positions. The starfield only draws the stars in view. Script time was never the
   problem: about 3 ms a frame in a close, followed fight.
2. **Speed 4 by default** (`SPEED_SCALE`, as you set it; the slider now goes to 8): a Talon tops out at 1,000 a second.
3. *(The map is 32 × since C-71 item 4.)* **The map is 8 × space.js's (33,600 × 24,000), and the scenario's places are spread 4 × in its middle**
   (`HC_MAP` 8, the new `HC_SPREAD` 4, both on the panel, on restart). The places are as far apart as in the build you
   played; there is 8,400 of open space east and west of the play area and 6,000 north and south.
4. **Waves and reinforcements come in from 1,200 beyond the play area's edge**, not the map's (which is now far
   away); Recon Sweep's band and the event markers sit on the play area's edge.
5. **Arriving at the jump point.** When the point a ship must fly into is inside its turning circle (closer than 2 ×
   its turn radius × the sine of the bearing off its nose), it flies straight out until it is `ARRIVE_OUT` (2.6) ×
   its turn radius away, then comes back in on a line. Convoy Lark and withdrawing ships use it. In the test the Lark
   jumps 16 s after the relay falls.
6. **Holding on a point is flown at corner speed**, on a circle no tighter than the ship can fly: capturing,
   boarding and the convoy waiting at a jammed jump point. They used to slow down, which under the corner-speed model
   (C-69 item 9) widens the turn; a Graf boarding circled at about 570, outside its boarding range.
7. **Capture and boarding ranges are 550** (`CAPTURE_R`, `BOARD_R`, were 400), so a ship circling at its tightest
   (about 400 for a Graf) counts.

*G2 (collisions):*

8. **Ships collide with ships of either side, stations and rocks.** Each body is a circle: a ship's hull length × 1.15
   (`COLLIDE_K`; about 40 for a Cross), a station's × 1.2, a rock's radius × 0.95. Contact is tested along each
   step's path, since a ship at speed 4 moves 50 units a step, further than a fighter is long.
9. **Damage goes with the square of the closing speed**: `COLLIDE_DMG` 40 at 1,000 a second, through shields, armour
   and hull like any hit, shared by size (the smaller ship takes more). A head-on at full speed (about 2,000 closing)
   is about 160 between two fighters: both die. A scrape at 200 does 1 or 2. The two bounce apart (`COLLIDE_BOUNCE`
   0.3 of the closing speed back) and are knocked off their nose; rocks and stations don't move. Your pilots lose
   some nerve, the feed says who hit what, and the metrics count `collisions`. Nobody gets the kill for a collision.
10. **Pilots steer clear on their own.** Every pilot looks 1.6 s ahead (`AVOID_T`) along its motion relative to every
    ship, station and rock. Anything it would pass closer than the two bodies plus 90 (`AVOID_PAD`; eager pilots ×
    0.6, steady × 1.4) it steers off sideways. The sooner and closer the crash, the harder it steers (`AVOID_W` 3); an
    imminent one outweighs the goal. The side it dodges to is held while the danger lasts, so it never flips mid-turn
    (that put Sera into a rock in an early version). Attack runs still pass close: their break-off distance (0.3 ×
    gun reach) is outside the avoidance.
11. **The proof**: two runs of hc1 for 120 s, 1 collision each with avoidance; with it off (`AVOID_W` 0), 20 each.
12. **Two new speech-bubble banks** (placeholders, `[TEXT NEEDED]`): `bump` after a collision, `evade` when a pilot
    dodges another ship (at most every 8 s).

*G3 (the Cross's missiles and the lock):*

13. **Crosses carry two missiles in High Command** (the repeaters and the missile system in their empty second slot,
    `HC_LOADOUT` in `sim-hc.js`). The database's stock Cross still has none, so v2, SB and the campaign are unchanged.
    **Your call:** should the stock Cross carry missiles everywhere (`default_weapon_2` in the database), or only here?
    On the Hegemony side only the Scimitar (Commandant Vex, in hc1's reinforcements) carries missiles.
14. **The lock, reworked for real-time runs** (the copied SB lock filled at 0.4 a second inside the guns' arc and
    barely filled in a fast run). A ship with missiles locks its target while it holds it inside 0.75 rad of its nose
    (`LOCK_CONE`; the guns' arc is 0.55) and inside missile reach, clear of rocks. The lock fills at 1.1 a second dead
    ahead (`LOCK_RATE`; a little slower off-centre, a little faster for a good shot) and falls away at 1.4 a second
    once the target slips out (`LOCK_LOSS`). A missile can go at 60% (`MISSILE_LOCK`, unchanged); a fuller lock
    still hits harder (`LOCK_DMG_MAX`, unchanged). With no target it locks the hostile nearest its nose.
15. **Missiles scale with speed**: they fly at 13 dial units a round (`MIS_SPD_K`: 2,600 a second at speed 4, 2.6 × a
    Talon's top speed), turn at 6 rad/s (`MIS_TURN`), lead their target a little, and reach 1.6 × the listed range
    (`MIS_RANGE_K`: 1,440). The lock range is the same. They still need 450 of room (`MISSILE_MINR`).
16. **Missiles are an ability with a doctrine**, on the pilot panel as "Missile ×2". *AUTO* fires the moment the lock
    is good. *EMERG* fires only when the pilot is pinned or under half hull. *MANUAL* holds fire; the button reads
    **Fire** when locked (fires now) and **Arm** otherwise (fires at the next lock within 10 s, `MIS_ARM_SECS`), then
    **Armed**, and **Empty** with none left. Missiles no longer fire automatically with the guns. A launch goes in the
    feed and the pilot calls it (a `fox` bank).
17. **A target breaks hard** across a missile's path, at corner speed, when one is 1.1 s out (`MIS_BREAK_T`), whatever
    its job (a frozen pilot can't), and your pilots call it (a `missile` bank). The break shakes the missile with a
    chance of 1 × the lock it was fired without (`MIS_SHAKE`: 40% at a 60% lock, none at a full lock). So AUTO's
    quick shot is the less sure one. In two runs of hc1, 6 missiles fired and 4 hit.
18. **The HUD**: your pilots' locks are four brackets closing on the target, gold and turning while the lock builds,
    orange with **LOCK** under them once a missile can go (fainter for wings you haven't selected). A Hegemony lock on one
    of your ships shows **⚠ LOCK** over it, blinking **⚠ LOCKED** once it can fire. Missiles are small darts with a
    glowing motor, purple for yours and orange for theirs; a hit floats "MISSILE HIT", a shaken one "SHOOK IT".
19. **Tests**: `tools/arena-smoke.js` G2 (a head-on, a rock, the dodge, hc1 with and without avoidance) and G3 (the
    loadout, the lock and AUTO, MANUAL, EMERG, the break, a fight, the pilot panel). F3's run test now also accepts a
    pursue (a Talon catching a Mote's tail, which the runs allow), and G1's convoy test waits for the convoy to reach
    the jump point.

*G4 (selecting and ordering on the map):*

20. **A click selects the wing; a second click selects the ship.** On the map or in the roster, clicking one of your
    ships selects its wing (the order tray opens over the wing's card). Clicking a ship of the wing already selected
    selects that ship (its pilot panel opens). Clicking a ship of another wing selects that wing. A roster click still
    brings the camera to the ship.
21. **Left-drag draws a selection box** (gold, dashed): every wing with one of your ships inside it is selected (none
    clears the selection). With several wings selected the tray reads "DAGGER + AMBER · 2 wings: orders and tactics go
    to all", its orders and tactics go to every one of them, the roster and the map ring them all, and a wing an order
    doesn't fit is named in a toast (Board with no marines). Pressing a ship of a group selects just its wing.
22. **Right-drag pans** (middle-drag too). On a touch screen one finger still pans, as there is no right button.
23. **A right-click, with wings selected, opens the order wheel** round the cursor: the orders that fit what is under
    it, for every selected wing, numbered for the keys 1 to 9.
    - A Hegemony fighter: Attack, Intercept.
    - A Hegemony station: Attack, and Board if a wing carries marines.
    - Another of your ships or the convoy: Escort, Defend.
    - A capture point: Capture, Defend here.
    - Any other point or open space: Hold here, Defend here.
    - Always: Regroup, Withdraw, and **Commands…**, which opens the commands drawer for that ship or place, as the
      right-click did before.

    With no wing selected a right-click opens the commands, as before. Esc or a click elsewhere closes the wheel.
24. **The panel's key list** adds the mouse: click, left-drag, right-drag, right-click.
25. **Tests**: `tools/arena-smoke.js` G4 (the clicks, a group's shared order, the wheel's items for each kind of
    target, a pick, the commands with nothing selected, and a real mouse: a box, a right-drag, a right-click and a key).

*G5 (the HUD):*

26. *(Its placement and icons replaced by C-71 items 1 to 3.)* **The commands bar is a fixed part of the HUD, bottom centre.** The roster's wings sit either side of it (the first
    half left, the rest right), and it shows **COMMANDS**, the command points and every command in three rows of
    three, Abort last. Costs read as one diamond and a number, as the bar is narrow. There is no COMMANDS button and
    no drawer: click a command to use it, or to arm it and then click its target on the map (as before). A right-click
    on a ship or place with no wing selected (or **Commands…** on the order wheel) narrows the bar to what fits there,
    under "For …", with a gold edge; × shows them all again. This replaces C-69 item 8 (COMMANDS bottom right, a
    drawer opening upward). With nothing gold left on the HUD, Jump Out is its only gold button when it shows.
27. **The time controls sit top centre, under the clock**, above the PAUSED banner. The bottom right is empty.
28. **The event feed shows five entries** (`FEED_ROWS`) and scrolls for the rest (it keeps the last 40).
29. **The objectives panel is bigger**: up to 400 wide (was 320), body text 15 px (was 12), bigger diamonds and the
    GET OUT line at 15 px.
30. **Quiet lines in hc1.** The intent lines and the gold attack rings show only for the selected wing (or wings) and
    the wing under the pointer (a ship on the map, or its card in the roster), dashed thinner at 40% (`QUIET_ALPHA`).
    The Hegemony's intent lines are hidden too, except during Recon Sweep. It is a scenario setting (`quietLines`,
    on for hc1 only) and the panel's new toggle, "Lines only for the selected or hovered wing", overrides it in any
    scenario.
31. **Status symbols by the ships**, either side, for 2.5 s of real time (`BADGE_MS`), the newest three (`BADGE_MAX`)
    to the ship's right. One for each ability (Boost Shields, Lock In, Boost, Drift, K-Turn, Barrel Roll, Field
    Repair), a missile away, breaking from a missile, dodging a crash (once every 2.5 s at most) and breaking off a
    run. They pop in and fade, with no pop under reduced motion. The glyphs are mine, drawn in the HUD's stroke style;
    **they want your art pass**.
32. *(Replaced by C-71 item 1.)* **On a small screen** (1,280 wide with the designer panel open) the dock compacts its tiles and wraps the wing
    headers' chips; if it still doesn't fit, it scrolls sideways and the bar rides along.
33. **Tests**: `tools/arena-smoke.js` G5 (the bar narrowed and restored, the feed's five rows, the objectives' size,
    quiet lines, the symbols). F1's placement test now checks the bar between the wings and the time controls under
    the clock; the HUD test allows at most one gold button.
**Your call:** item 13

### C-71 🟡 High Command playtest 3: what I chose building it, and the placeholders
Your notes are in `docs/archive/ARENA-HC-FEEDBACK-3.md`. Built in `game/js/sim-hc.js` and `game/js/arena-hc.js`; v2 and SB
are untouched. The numbers that changed are updated in C-68.

1. **The wing cards are a column in the bottom-left corner** (they were either side of the commands bar, C-70 item
   26). The event feed keeps its five rows unless the cards need the room, when it gives up rows (keeping at least
   60 px, `RAIL_FEED_MIN`). A column too tall for the stage compacts its tiles, then scrolls.
2. **The order tray and the pilot panel open beside the column**, level with their wing card or tile (and above the
   commands bar where they'd overlap it). They used to pop up above the card (your call in playtest 1), but in a
   column that would cover the cards above.
3. **The commands are big skill icons**: 76 × 84 with a 34 px glyph, the cost (a diamond and a number, or FREE) in
   the top right corner, the name under the glyph; the full card is still on hover. The bar sits at the bottom,
   centred in the room right of the cards, and wraps to a second row when that room is narrow (1,280 wide with the
   designer panel open). **Abort is a small button in the bar's title row**, not an icon: it's the one command not to
   hit by accident, and nine icons didn't fit one row at 1,440.
4. **The map is 4 × as wide and tall: `HC_MAP` 32** (134,400 × 96,000; the slider goes to 48). I read "×4 the size" as
   the "Map size ×" slider (8 to 32); if you meant 4 × the area, that's 16. The scenario's places stay where they were
   (`HC_SPREAD` 4) in the middle, with 50,400 of open space east and west and 42,000 north and south. A wing a
   scenario places nowhere now starts in the play area, not at the map's west edge.
5. **The starfield is one tile (8,400 × 6,000, 1,680 stars) repeated over the map**, drawing only what is in view and
   thinning a zoomed-out view to 6,000 stars, so a bigger map neither thins it nor slows it.
6. **The Cross turns at 80% of a Mote's or a Talon's rate**: a High Command turn factor of 1.6 on the Cross (the panel's
   "Cross turn ×", `HC_TURN`). Its tightest circle at corner speed is about 477 against their 382 (it was 760, half
   their rate). The Scimitar, which has the same dial, is unchanged. In a guns-only two-against-two with Motes in
   Spread, a Mote has its guns on a Cross 18% of the time (it was 28%); the shares swing a lot run to run.
7. **Avoidance fixes the faster Cross turned up**:
   - two ships flying the same way and drifting into each other dead-on now dodge away from where the other is,
     not from a predicted passing point that is noise on that course (Sera and Kit turned into each other in
     formation);
   - an extension begun short of a station now veers clear of it rather than flying through it.

   In two runs of hc1 for 120 s: 1 collision that does damage each, 4 contacts in all, against 14 of each with
   avoidance off.
8. **Tests**: `tools/arena-smoke.js` C-71 (the Cross's turn against a Mote, the skill icons and the corner column).
   The F1 placement tests follow the column, F1's scale and G1's map the 32 × map. G2's avoidance test counts
   collisions that do damage, and compares all contacts with avoidance off. G1's convoy test kills the relay as soon
   as the convoy waits (a dodge can briefly push it out of the waiting ring).
**Your call:** none

### C-72 🟡 High Command playtest 4: what I chose building it, and the placeholders
Your notes are in `docs/archive/ARENA-HC-FEEDBACK-4.md`. Built in `game/js/sim-hc.js` and `game/js/arena-hc.js`; v2 and SB
are untouched. The numbers that changed are updated in C-68.

*I1 (the map, the display, locks, missiles, chaff):*

1. **The map is 16 × by default** (`HC_MAP`, as you set it; was 32).
2. **The map's lines show only for the selected wing**, in every scenario (it was hc1's own setting, and a hovered wing
   showed too). With a wing selected: its intent lines and gold attack rings, faint, and the faint blue lines of the
   enemies going for its ships. With nothing selected, none; Recon Sweep still shows every Hegemony line. The panel's
   toggle ("Lines only for the selected wing") turns it off.
3. **Shield arcs and hull pips show on the map only for the selection**: the selected ship or wing, and the enemies it
   is fighting (their target or the one in their guns). Stations and the convoy always show theirs (they are
   objectives); the roster's tiles keep every ship's bars.
4. **Every ship locks on**: a ship with missiles out to missile reach (as before), any other out to 1.3 × its gun
   reach (`LOCK_GUN_K`), on its target or the hostile nearest its nose, filling and fading as in C-70 item 14.
5. **A lock steadies the guns**: a full lock takes 60% off the bolts' spread (`LOCK_AIM`), less for a partial one.
   Across six runs of the three scenarios gun hits went from 36–50% of bolts to 42–59%.
6. **The lock's damage bonus is now the missiles' alone.** SB's lock also added up to 100% to every hit's damage
   (`LOCK_DMG_MAX`); with every ship locking that would have doubled the guns, which you didn't ask for. The Crosses'
   guns had it before this; no other ship's did.
7. **Lock brackets on the map**: for the selected wing's ships and for ships with missiles; the ⚠ LOCK warning over your
   ships comes only from a Hegemony ship with missiles (every lock would be noise).
8. **Missiles explode 6 s after launch, hit or not** (`MIS_LIFE`, the panel's Fighting group; it was about 1.4 s, set by
   range). A missile that overshoots and comes round again gives its target another chance to shake it.
9. **A ship fired on reacts at once**, not just in the last second: while the missile is more than 1.1 s out
   (`MIS_BREAK_T`) it runs straight away from it at full speed, and Boost (if the pilot flies it) fires on AUTO and
   EMERG; inside that it breaks hard across the missile's path and Barrel Roll fires (half the hit profile). The
   abilities are checked every step while a missile is coming, not at the next think. The ⚠ symbol by the ship reads
   "Evading a missile" while it lasts.
10. **Chaff**, an ability for every ship (both sides), two a sortie (`CHAFF_N`), 6 s recharge: a glittering cloud
    thrown out behind the ship. Every missile on its way to that ship within 3,000 (`CHAFF_R`) takes the cloud for it
    (`CHAFF_P`, 100%) and bursts there. AUTO throws it when a missile is 1.2 s out (`CHAFF_T`), EMERG when one is
    about to hit; MANUAL on the pilot panel ("Chaff ×2", **Empty** when spent). It goes in the feed and shows a
    symbol. In six runs (three minutes each of the three scenarios), 28 missiles fired and 7 hit; chaff drew off 19.
11. **Avoidance fixes this turned up**: two ships flying side by side, touching, now push apart (nothing closing was ever
    seen, so they ground along each other); and a dodge's side is held at most 1 s from when it was chosen (it was
    renewed every step, so a stale side could push two ships the same way). Contacts across the six runs: 0 to 2 each.
12. **Tests**: `tools/arena-smoke.js` C-72 I1 (a gunship's lock and spread, the fuse, the run and boost, chaff, status for
    the selection); the abilities and pilot panel tests count Chaff; F1 and G1 follow the 16 × map; G3's break test
    takes Kit's chaff away (Kit would otherwise throw it and lose the missile).

*I2 (Defend, and the Hegemony's squadrons):*

13. **Defenders get between.** A wing on Defend (or Escort, which had the same problem) watches 6,000 out from what it
    guards (`DEFEND_WATCH`). A hostile is a threat if it heads for the charge (within 60°), is going for it, or is
    already inside the guard reach; the soonest to arrive first. Each threat gets up to two of the wing, the nearest;
    the rest stay on station. A defender flies to a point between its threat and the charge (45% of the way out,
    `INTERPOSE_K`, kept 700 to 3,000 from the charge), nose on the threat ("COVERING" in the roster), and engages once
    the threat is inside 1.5 × its guns' reach, or inside the guard reach (`DEFEND_R`, `ESCORT_R`, as before). A
    hostile shooting at a defender inside the watch is fought too. Before, a defender only engaged inside 2,000 of the
    charge, which at speed 4 is two seconds out.
14. **Hegemony pilots pull back hurt**: under 35% hull (`HEG_RETREAT`) a pilot flies home (where it spawned) and circles
    there, out of the fight; the feed says so. Drones fight on.
15. **A Hegemony pilot being shot at fights back**: hit in the last 2 s by a fighter within 1.5 × its guns' reach, it
    turns on it (raiders used to fly on into your guns for the station). A lure doesn't: it wants to be chased.
16. **The squadron leaders' plan.** Every second, for each of your stations the raiders go for: if your fighters are
    within the watch of it, the raiders split. Two squadrons or more (a squadron is one wave, or one scenario entry):
    the older lure, the newest strikes. One squadron of two or more: the half nearest your fighters lure, the rest
    strike (one of each for a pair). The feed says "The raiders split: 2 going for your fighters, 1 hanging back out
    of reach" when a plan forms. With none of your fighters about, everyone strikes.
17. **A lure** flies at the nearest of your fighters until it is in reach (or hit), then drags it out away from the
    station, and away from its strikers' side, to 5,000 (`LURE_DIST`), and comes back for more once there or once
    nothing follows.
18. **A striker** holds off 6,500 out on its own side (`STANDOFF_R`) until the station is clear: none of your fighters
    within 3,000 of it (`CLEAR_R`) except ones tangled with a lure. Then it dives, as a raider did before. It dives
    anyway after 25 s (`STRIKE_WAIT`): a raid can't wait all day with your reinforcements' clock running.
19. **The effect on hc2** (three runs of 175 s, before → after): Lastlight first hit at 32 s → 56 to 119 s, and left at
    120 to 169 hull of 300 → 285 to 300; none of your ships lost either way; Hegemony losses 2 to 5 → 1 to 3 (they
    pull back now). **Your call:** hc2 may now be too easy. Levers: the waves' size, `STRIKE_WAIT`, `CLEAR_R`,
    `DEFEND_WATCH`, or taking the starting Guardian Directive off.
20. **Tests**: `tools/arena-smoke.js` C-72 I2 (a defender gets between an inbound raider and Lastlight and engages it out
    from the station; wave one splits, said in the feed, and its striker dives once its patience runs out; a hurt
    pilot pulls back; one shot at fights back). HC T4's hc2 check accepts a raider with a role in the plan.
**Your call:** item 19

### C-73 🟡 High Command's visual pass, wired: what I chose and where I left the handoff
Claude Chat's art pass (`game/art/sr-space-fx.js` and the station kit in `sr-art.js`; its notes are
`docs/art/HC-VFX-HANDOFF.md`, against my brief `docs/art/HC-VFX-BRIEF.md`) now draws the High Command map. It draws
the backdrop, the rocks, the hulls (live engine flames, banking, lights, damage smoke, crits), the three stations, the
trails, the bolts and missiles, the chaff and every effect. `game/js/arena-hc.js` keeps the command layer as it was:
the selection rings, the lines, the labels, the shields, the pips, the locks and the bubbles. v2 and SB are untouched.

1. **The sim only gained labels** (no gameplay change; `tools/arena-smoke.js` V1 checks that the same seed ends the
   same with the pass on or off). Each bolt hit now records the surface it struck (shield, armour or hull), the bolt's
   style, and whether it was a missile. A crash, a missile hit and a missile miss are each marked as such. Each command
   in the event feed carries its key.
2. **The artist's asks.** The collision positions go through as they were. The station art is a `station` field on
   each structure's scenario entry (relay, lastlight, reactor), falling back to the entry's id; a structure with
   neither draws the old octagon. The handoff asked for the boarder's id; that wasn't needed. The map uses the sim's
   own boarding test, so each Graf docked with the station gets its own link, to the nearest clamp pad.
3. **Effects run on smooth game time**: the real frame time × the speed, so they slow, speed up and freeze with the
   clock. The handoff said to advance them by the sim's 50 ms steps. That would move every particle in jumps, 20 times
   a second, the stutter we fixed in C-70. Past the end of a mission the last explosions play out in real time.
4. **The pass's real-time clock is its own.** The handoff said to give it the browser's clock. But the big-kill screen
   flash measures from the module's own clock, so with the browser's clock it never showed. Lights, blinks and the
   shake all run on the module's clock.
5. **Camera shake is in screen pixels** (at most 9 × 7 px and a hair of roll, from the art kit's shake). The handoff
   said to add the offset to the camera in world units, which at the commander zoom (0.12) would be about one pixel.
   The world shakes; the pips, names, badges and bubbles hold still. Reduced motion (your system setting, or the
   panel's switch) stops it; so does the panel's Camera shake switch.
6. **Booms grow with the icons** (my one change to the artist's module, theirs to review). Zoomed out, the map draws
   ships up to 3.2 × bigger so they stay readable; the explosions didn't grow with them, so a fighter's death at 0.12
   was a 7 px puff beside a 30 px hull. Kills, station deaths, missile hits and misses, crashes and the debris now
   scale with the same boost. The art guide passes no boost, so it is unchanged.
7. **The screen is still cleared before the backdrop, but only when the view shows past the map's edge.** The handoff
   said to drop that clear because the backdrop covers the map. It does, but the camera can show past the map's edge,
   and there the last frame would show through.
8. **Performance, measured headless at 1,440 × 900** (software rendering, no GPU). At DPR 1 a frame's script p95 is
   5–9 ms (the flat look's is 4–6) and the frame rate holds. At DPR 2 the backdrop's nebula, one faint image stretched
   over the view, costs about 20 ms a frame in software: 12–18 frames a second with it, 45–52 without. Any full-screen
   stretched image costs the same, so there's no cheaper way to draw it without a GPU. With a GPU it costs next to
   nothing. So the nebula has a fallback, like the camera tiles: once a mission's first `FX_WARM` (90) frames have
   gone, frames averaging over `FX_SLOW_MS` (30 ms) turn it off, with a toast and a line in the read-outs. Move its
   slider and your setting stands for the session. The handoff's p95 of 3–7 ms at DPR 2 came from its own guide.
9. **Muzzle flashes and bolt hits fire only in or near the view, and no muzzle flashes below the detail zoom.** The
   pass keeps at most 72 one-shot effects and drops the oldest first, so a big fight off screen could otherwise push
   out the explosion you're looking at.
10. **Nothing stale.** After a reload or a debug run the pass skips what has already happened: bolt hits over 0.5 s
    old, kills and jumps over 1 s old, ships already well away from where they arrived.
11. **Warp-ins** for every ship that arrives (waves, reinforcements, the Reinforcement Request), not for those on the
    map at the start.
12. **A boarded station stays on the map**, dark, with the rebel claim light the reactor's art has for it. It used to
    vanish. Its label stays too.
13. **The cream ★ marks every wing leader, both sides**, as the module draws it: Vex and the Hegemony squadron leaders
    as well as yours. The roster cards' ★ is unchanged.
14. **The panel's FX group**: Visual pass (off draws the flat look of C-72, kept for comparison), Camera shake, Reduced
    motion, and "FX numbers", 27 sliders over the module's tunables. Moved numbers are saved with the panel's own,
    appear in Copy settings as `fx.<name>`, and go back with "Reset numbers to defaults".
15. **Unused**: the module's lock events (the locks stay ours, as the artist recommends), and `BARREL_SECS` (1.5) in
    `arena-hc.js` copies the sim's barrel roll window to time the roll.
16. **Tests**: `tools/arena-smoke.js` V1 checks the station art, the panel's FX group, drawing at 0.12, 0.4 and 1.2
    with the pass on and off, each of the sim's moments becoming its effect, nothing stale after a reload, the boarding
    links, no shake under reduced motion, and determinism.
**Your call:** none needed; overrule any item. Item 6 is for the artist to review too.

### C-75 🟡 Type 3.5 (High Command Hands Off): decisions
`docs/ARENA-HC35-HANDOFF.md`, built in `game/js/sim-hc35.js` (the layer) and `game/js/arena-hc35.js` (the screens and
HUD). A fourth Arena ruleset beside v2, SB and Type 3: an opportunity becomes a mission through a four-step briefing,
the mission plays out with you hands off, and a debrief says why it went the way it did.

1. **It runs on High Command's sim and renderer through hooks, not a copy.** This breaks the Arena's
   copy-don't-refactor rule on purpose (the handoff asks for it): copying 4,000 lines would fork the flight and AI you
   tuned over four playtests. `sim-hc.js` gained nine guarded hooks (`SIMHC.hooks`: classExtra, loadoutExtra, think,
   goal, damage, canJump, canFire, step, event), a row lookup that the class hook extends, an optional hit-size factor
   on a row (`hitK`, × 1 when absent), and more exports for the layer. `arena-hc.js` gained a mode (`open({mode:'hc35',
   overlay})`, `loadScenario`) whose overlay can draw and take input, and hides the tray, the order wheel, the commands
   bar and the rule editor. With no layer set, High Command runs byte for byte as before: `tools/arena-smoke.js` HC35 1
   checks hc1, hc2 and hc3's hashes after 90 s against baselines recorded before any change (seed 7, one scripted
   order at 5 s: a9741455, f237a40, 40316536).
2. **The hooks are set only while a 3.5 mission is loaded** (the briefing's plan view or the mission), and every one
   checks it is the live 3.5 mission, so leaving for Type 3 leaves High Command as it was.
3. **One existing test changed**: HC 1 asserted exactly three rulesets; it now checks the first three, with Type 3.5
   fourth. The handoff asks that no existing test change, which adding a ruleset can't meet.
4. **The plan compiles into an ordinary High Command scenario** (`SIMHC35.compile`, registered as `hc35_freighter`),
   so an attempt can be replayed from its compiled entry and seed. The freighter is a Hegemony ship that its layer
   flies along the lane; its escorts are guards on it that the layer holds beside it until they're alarmed.
5. **Bombs, point defence and the freighter's subsystems live in the layer**, not in High Command's weapon code
   (P2), so the guns' code stays untouched.
6. **The map** is High Command's 16 × map; the opportunity is written in layout units, as hc1 is, and scaled with it.
   Only our jump point is a High Command point: the lane, the planet, the relay and the assets are the layer's own, so
   High Command doesn't label them.
7. **In the plan view** (the briefing's map) your ships are hidden and their gold jump-in markers stand in for them;
   the scenario is built at t = 0 and paused, and rebuilt at Launch with the final plan.
8. **The briefing keeps High Command's keys off** (the sim never moves while you plan); in the mission the time
   controls and camera keys work as in Type 3.
9. **The freighter as a target (P2)**: its engines, comms array, four turrets and twelve containers sit where the art
   draws them, and a hit goes to the one it lands on (or to the one the shooter is told to hit); the rest goes to the
   core (its 400 hull). A dead engine block disables it, a dead array cuts the distress call, a hazard module blows
   everything near it. Its point defence, the bombs and the docking are the layer's (C-75 item 5).
10. **Bombs**: slow (`BOMB_K` 0.3 × a missile), they get past shields and half the armour, and they hit only ships of
    size 7 and up, so only the freighter here. Fighter guns do `GUN_VS_CAP` (25%) to a capital hull: on their own they
    don't take the engines out in a minute (`tools/arena-smoke.js` HC35 5).
11. **Brickbats dock to board or haul**: a drifting freighter is far slower than any ship can fly in High Command's
    flight model, so a boarder or hauler that reaches it clamps on beside its spine and moves with it until it's done.
12. **The prize steers itself home**: a capital ship can't turn round at a crawl in the flight model, so the layer flies
    the boarded freighter to our jump point at `PRIZE_SPD` (160 a second).
13. **A lane waypoint counts as reached once the freighter is level with it**: it can't turn tightly enough to touch
    one.
14. **Until pilot requests (P5), the surrender answers itself**: with Pirate as the primary they take the cargo; with
    anything else, no deal (and they don't ask again for a minute).
15. **Tests**: `tools/arena-smoke.js` HC35 5 (guns against bombs, no jump while disabled, the fall into the planet),
    6 (each of the seven primaries won from a scripted plan) and 7 (detection to Phase 2, the cut distress call,
    Remote).
16. **The leaders' plans (P3)**: picking a primary fills in the roles, Executive and Secondary Orders, loadouts and
    ROE the handoff's example plans give for it (`LEADER_PLANS`); your jump-ins and assets are kept. Each leader's line
    on step 4 is the first critique rule that applies (no bombs for a hull, no boarder, no pods, nobody defending a
    Brickbat wing, a jump-in in a ring, a jump-in too far to catch the lane, waiting on your signal), else their
    personality's line.
17. **An Executive Order is busy, waiting, done, impossible or broken** (half the wing lost, or all of it panicking).
    A Secondary is taken up when its trigger fires and the Executive isn't busy; while it's busy the leader says
    they'll switch once it allows. An Executive that's over with no Secondary left holds, or goes home with Jump on
    Completion (a broken wing always goes home).
18. **Hidden modifiers show themselves** when they first matter (a bigger escort when one is first in sensor range,
    Green when Phase 2 begins, Quick Jumper when it spools where it is, Rapid and Remote when the call lands, Fanatical
    at zero resolve, Demoralised when they offer); Unreliable Source's false one is found out in Phase 2.
19. **OFF PLAN** on a wing card names what has it off its Executive Order (panic, Preservation, protecting a pilot, a
    rule, a request, the Secondary, the comms array), and the seconds off plan are kept for the debrief.
20. **The ROE**: Hold for My Signal holds fire unless fired on in the last 3 s; Weapons Tight lets only ships aimed at
    the engines, the array or the turrets fire on the freighter; Preservation pulls a ship out below its hull line;
    Whale Hunt sends a wing with nothing busy at a disabled freighter. Bloodless holds fire on an enemy below 30% hull;
    Kill the Distress Call sends a wing that isn't busy at the array when the call goes out. Ion Storm cuts sensor
    range to 70%.
21. **The plan overlay** (the PLAN button on the phase plate, or P) is on through Phase 1 and off after, unless you
    toggle it yourself.
22. **Tests**: `tools/arena-smoke.js` HC35 3 (the modifiers' roll, Dig deeper), HC35 P3 (the leaders' plans and critiques, two
    plans replaying identically, the Secondary's adoption, Weapons Tight, Preservation and OFF PLAN) and 8 (the signal).
23. **Comms (P4)**: every power is a transmission, queued in the bar's comms rows and drawn as a cyan ring from the
    origin; it lands after the handoff's formula (`COMMS_BASE` + distance / `COMMS_SPD` + the leader's
    acknowledgement, × `ION_K` under Ion Storm) and can't be recalled. A power for the whole force (the signal,
    General Retreat, Abort, the broadcast, a marked target) goes to each wing separately, so each wing hears it at its
    own delay. A leader's acknowledgement goes by level: 2 and under green (1.5 s), 5 and up veteran (0.7 s), else 1 s.
    *Comms delay off* is on the panel (`COMMS_OFF`).
24. **Command points are a phase's allowance** (`CP1`–`CP3`: 2, 3, 3): a new phase sets them afresh and what was left is
    lost (counted for the debrief and the record).
25. **The powers**, as built: *Mark Priority Target* goes to wings whose Executive Order isn't busy; *Change Executive
    Order* gets "We're nearly there, Base" when the order is busy and at least 80% done (`NEARLY`), and *Insist* is
    offered for 15 s; *Call a Pilot by Name* is refused half the time (`REFUSE_P`) by a shaken or panicking pilot; the
    *Reserves* warp in at their jump-in point; the *Ram* drives at what you click and has to hit it, while the
    nuclear one goes off within a quarter of its blast (or at the end of its 40 s run); a blast (fire ship, mine, nuke)
    hits every freighter subsystem in its reach and the core for half; the *Tug* tows a ship to our jump point; *Spoof
    Orders* sends the escort, the response or a squadron away as one group; the *Pirates* roll their greed once as a
    group and leave from the edge they came in by; *Wake the Sleeper* with no agent aboard (Unreliable Source) gets no
    answer and shows the lie.
26. **The ram, the tug and the pirates are the layer's drones** (no nerve, never "pinned"), flown by the layer and
    shot at like your ships; they never count as your losses, and they leave when your last wing does.
27. **Assets you place** (the ram's staging point, the fire ship, the minefield, the buoy, the relay) start where
    `ASSET_AT` puts them and are dragged on the step 4 map, each with its reach drawn.
28. **Tests**: `tools/arena-smoke.js` HC35 9 (the delay against the formula, the relay, Ion Storm, delay off), 7 (command
    points by phase) and 10 (every power after its delay, and the bar by DOM: the icons, the targeting pill, the comms
    queue).
29. **Pilot requests (P5)**: all ten of §5.6, each raised once per subject (a pilot, an enemy, a pod, a wing) with the
    handoff's answers and persona defaults, as an `hc-card` in the right column with A/B/C answers, a DEFAULT tag and a
    countdown ring, and in the feed. An answer rides the comms delay to the asker, who acknowledges; no answer in
    `REQ_SECS` and the asker does their default ("Sera decided: …"). A new request at 3 × drops the speed to 1 ×.
30. **When there's no room** (two open, the 20 s gap, six a mission), the highest priority waits; the urgent ones (the
    surrender, the scuttle charges, Phase 3) skip the gap; one not asked within `REQ_PEND` (8 s, mine) is dropped and
    the pilot carries on, except the surrender, which the asker answers by their default.
31. **Requests off** (the panel): nothing is asked and nothing a request would change happens, except the surrender
    (the asker's default). The P2–P4 tests run with it on, so they test the plan alone.
32. **Preservation Order waits** while a pilot's own "I'm hit, but I can stay in" is open: they asked, so your answer
    decides; *Stay in* then holds against Preservation for that pilot only.
33. **Pods**: a Brickbat with room (Cargo pods with a free slot, or a Boarding party) picks one up passing within
    `POD_R`; *Get him* sends the nearest one with room from any wing; the Tug power can now be pointed at a pod. A pod
    aboard a ship that's lost later is lost with it. Fighters here only die in the fight, so only a nuclear blast stops
    the ejection (no crash deaths).
34. **A volunteer's ram** does `RAM_K` × the ram's damage and, like the Ram, hits inside the target's crash-avoidance
    room; the pilot ejects at half the chance.
35. **Keys**: while a request is open, A, B and C answer the newest, over the powers' C and B.
36. **Crash fails** once the freighter is disabled outside the planet's pull and has drifted to a stop.
37. **Tests**: `tools/arena-smoke.js` HC35 11 (a hit pilot's request timing out to the default, the answer against
    Preservation, the gap and both caps, Requests off, the keys) and 12 (a pod, the Tug collecting it, a pod captured in
    the debrief).
38. **The debrief (P6)**: the stamp is JOB DONE for the primary and every optional, PARTIAL for the primary alone,
    FAILED, or ABORTED; then the objectives, the loot (by primary: the ship and its cargo, the cargo handed over, the
    containers hauled, a lead, response kills, or nothing for a denial), the losses with what became of each pilot
    (picked up, captured, no pod) and the time in each phase.
39. **What decided it** reads your table off the cause log and the context it kept at each loss (who got them, the
    wing's Executive, who was defending whom, the ROE, the phase): the point-defence loss with no Suppress turrets ever
    ordered, the loss to the response mid-Executive without Jump on Completion, *Stay in* on your word, the uncovered
    Brickbat, the escape with the engines never hit (and why: no Disable order, a Brickbat lost, the bombs spent), the
    distress with nobody on the array, each power's result, the modifier Cass missed or got wrong, the jump-in in the
    ring; then your answer to their hail, captured pods, an abort, the exposure, a burned agent, the pirates' take.
    Most specific first, six at most; under three, it adds the feed's turning points and the result.
40. **The record (§10)** pushed to `ARENA_METRICS` per attempt carries every field: the modifiers (hidden at launch,
    and when each was found in play), the plan, the briefing's seconds per step, each phase's length, seconds at each
    speed and the pauses (wall-clock, while the mission is on screen), the powers by type and phase, CP unspent, the
    requests (raised, answered, defaulted, by whom), the Secondaries, OFF PLAN seconds per wing, the outcome and stamp,
    loot, losses, pods, Plan again (set on the attempt's record when you press it), and both panel toggles.
41. **The keys** are §7.6's: High Command's own (Space, 1–4, Tab, F, Q/E, Esc) work as in Type 3, plus P, the powers
    on Z X C V B N M , and A/B/C for requests (C-75 item 35).
42. **Tests**: `tools/arena-smoke.js` HC35 13 (a scripted loss to point defence gives its line), 14 (the same seed, plan,
    powers and answers with pauses and the HUD worked between: the same hash), 15 (the record's fields) and the keys.
**Your call:** none needed; overrule any item.

### C-76 🟡 Type 3.5: readings to confirm
Each with the reading I built:

1. **Wing 3 has four ships** (Cross, two Talons, Brickbat), as you listed them, against "each with three ships".
2. **The Source is Cass** (level 2), and her portrait is a generated face: the art cast has no Cass.
3. **The Brickbat and FL-400 stats are 3.5-only placeholders** (`HC35_CLASSES` in `sim-hc35.js`; neither has a
   `db.json` row).
4. **The freighter is slow**: the handoff gives it the dial's 1–2, but on the 16 × map that crosses the lane in under
   a minute; it crosses in `FREIGHTER_SECS` (270 s) as the handoff also says, so it runs at about 55 units a second
   (its dial floor is 0.2).
5. **A jump-in inside an escort's sensor ring warns, not blocks**: Launch is still allowed (the leaders say so), and
   jumping in there ends Phase 1 at once.
6. **Pause is free in 3.5 too** and the briefing never runs the clock.
7. **The FL-400's hull**: the handoff gives "400 over subsystems", but its subsystems alone come to 640 (engines 120,
   comms 60, turrets 4 × 40, containers 12 × 25). I read the 400 as its core, with the subsystems on top.
8. **Crash is deny-only**: the doc's line is cut off ("crash it on the planet to"); the cargo is lost with the ship.
9. **Crew resolve drains at 0.25 a second for each rebel ship near it**, not the handoff's 1.5: at 1.5, ten ships
   empty it from 70 in five seconds.
10. **Detection builds at 12 a second at the ring's centre** (falling to nothing at its edge); a ship closing in to tag
    counts 35%, a ship holding still 50%.
11. **"[Wing] in trouble"** (a Secondary's trigger) means a ship of that wing below 40% hull, and **"half lost"** half
    of that wing gone: the trigger reads its own wing.
12. **Bloodless** stops your pilots finishing an enemy fighter off (below 30% hull), not just counting kills against
    you; the freighter itself is the primary's, so it's exempt.
13. **The command points sit in the powers bar's title row**, where High Command keeps them, not top right as the
    handoff's sketch has them; they still say when they refresh.
14. **Kill the beacon** (Wake the Sleeper) also calls off a response that's already coming, if the call got out.
15. **Exposure** is noted in the debrief only (it's a campaign resource, M-36).
16. **"Nervous" is High Command's "even" persona** (it has eager, steady and even).
17. ~~**The surrender's default**~~ Superseded: it follows the primary's family (playtest 3, §3.5; Resolved log, C-88).
18. **Defaults you left open**: a steady leader jumps when Phase 3 comes with the job unfinished; a steady leader holds
    for reserves when a hidden modifier shows itself (press on, with no Reserve wing).
19. **Hold for reserves** calls the Reserve wing at no CP (an answer is free) and holds the asker's wing 30 s.
20. **Get out** (the scuttle charges): the boarders cast off and their wing holds; the charges still blow.
21. **A typical run raises two or three requests** at these numbers: the missions run one to three minutes and the
    20 s gap drops a lot. `REQ_GAP` and `REQ_PEND` are the dials for the handoff's three to five.
22. **As the handoff reads them, built so**: pause freezes the request timers (they run on mission time); Abort and
    General Retreat are free but still delayed like any transmission; command points left at a phase change are lost;
    the FL-400 is drawn straight through the art, not the hull cache; the pirates are Brickbats in the hunter livery
    with hazard rings; the objective families aren't colour-coded.
**Your call:** any of these

### C-79 🟡 Type 3.5 playtest 1: what I chose building it
`docs/ARENA-HC35-FEEDBACK-1.md`, phases K0 to K6 (K7, the HUD layout pass, waits for your mock-ups).

1. **The flight recorder (K0, §3.7)** keeps a record of every High Command and Type 3.5 run (`game/js/flight-rec.js`):
   the scenario as built, the seed, the plan, every tuning value, every input with its tick and arguments (powers,
   request answers, orders, commands, rule and tuning changes; speed changes and pauses for analysis), a state hash
   every second, every event, a per-second sample of every ship, the 3.5 logs and the metrics record. It only reads
   the sim: it wraps the sim's public input functions and its step.
2. **Getting a run to me:** *Save flight record* on the debrief (and on High Command's end screen) downloads
   `sr-run-{date-time}-{opportunity}-{seed}.json`; the last 10 are kept in your browser and listed in the designer
   panel's **Runs** group with Download buttons; a run left half-way, or cut off by a reload or a crash, is kept as
   unfinished. Attach the file with your notes. A five-minute run is about 300 KB.
3. **`tools/run-report.js`** re-simulates a record in node, checks every checkpoint, and writes a markdown report
   (outcome, phases, requests with who answered and when, powers and results, losses and causes, seconds per verb for
   each ship, the freighter's deviation from its lane, the curves, and the stuck detectors), or answers `--at m:ss`,
   `--ship`, `--wing`, `--objective`, `--json`. A record from older rules (`SIM_VERSION`, now `hc-2` / `hc35-2`)
   gets a warning, and the report says where a replay diverged.
4. **Deterministic maths in the sims.** Browsers (and node) compute `sin`, `cos`, `atan2`, `hypot` and `asin` to
   slightly different last bits, and a fight amplifies that until a replay drifts away (a run in Chromium diverged
   from node at 0:56). `sim-hc.js` and `sim-hc35.js` now shadow `Math` with `game/js/det-math.js`, built from exact
   arithmetic (fdlibm's kernels, within two ulps of the native functions), so a run computes the same numbers in
   every browser and in the harness. The art's size factor the layer reads is rounded to 9 places for the same reason.
5. **High Command's hashes were re-recorded** in K0, not K2 as the handoff planned: the new maths changes the last
   bits of every High Command fight, so the HC35 1 baselines (hc1–hc3 after 90 s, seed 7) are now 5d3ce14f, b48f8492
   and a36d8ace. Nothing about how High Command plays changed beyond those bits; the hooks still leave it alone.
   (K2 changed them again on purpose: item 21.)
6. **Tests:** `tools/arena-smoke.js` HC35 K0 (a run through the UI with powers, an answered and a timed-out request, a
   pause and a speed change, saved from the debrief and re-simulated with every checkpoint matching; an older
   `SIM_VERSION` warns; a High Command run replays; the Runs group lists the last ten).
7. **True scale (K1, §3.1):** nothing is drawn bigger than it is any more (`iconBoost` is 1 at every zoom), in High
   Command too. "True scale" is the scale the sim's hit sizes already use (the art at its size class); the freighter
   keeps the art's own size factor as before.
8. **Icons:** once a ship is shorter than `ICON_PX` (18 px) on screen it fades into a 22 px icon in its side's colour
   (the shapes of §3.1; the ram, the tug and the pirates in hazard orange), with a 3-cell health tick and its name
   under it, and the shield halves as two ticks when it's selected. Each class crosses at its own zoom: fighters at
   about 0.2, the freighter at about 0.07. Selection rings, lock marks, attack rings, names and pips sit outside the
   icon, so they stay the same size on screen. A boom is never smaller than `FX_MIN_PX` (28 px). The numbers are on the
   panel's FX group (*Map icons*).
9. **The mission opens** at the zoom where a fighter is about 30 px long (`FIT_PX`), on your wings, with the freighter
   in the frame when it fits.
10. **Tests:** `tools/arena-smoke.js` HC35 K1 (iconBoost 1 everywhere, a Talon an icon below the threshold while the
    freighter is still art, the icon's size constant across zooms, the opening zoom).
11. **Boarding (K2, §3.2): the loadout decides.** A Brickbat with a Boarding party or Cargo pods never makes attack
    runs on the freighter, whatever its wing's Executive: until the freighter is disabled (or surrenders) it holds off
    `HOLDOFF_R` out on its wing's side, or flies its wing's Escort or Defend; then it boards or hauls. A Boarding party
    with no wing ordered to Disable gets the critique "Who's stopping it so we can get aboard?".
12. **The approach:** the side it's already on (the sign of the cross product with the freighter's heading); the dock
    point at the hull's edge (half the sim's hull width) plus 0.6 × the Brickbat's size; a staging leg to `DOCK_STAGE`
    out, then a slow final leg at `DOCK_SPD` × cruise matching the freighter's drift; no collision or dodging between
    a boarder on its final leg and the freighter (a new hook pair in High Command's sim, `noCollide` and `noAvoid`,
    unset there); within `DOCK_SNAP` it blends onto the clamp over 1 s. Docked, it holds fire (the inverted
    `holdFire` is fixed) and rides the hull. **Two things I added to make it work:** a fighter at a fifth of its top
    speed barely turns (the corner-speed model: a Brickbat turns 0.06 rad/s at 200, a 3 km circle), so on the final
    leg it flies at its corner speed until it's lined up, and goes round to the staging point again if it ends up
    more than 1.6 × `DOCK_STAGE` off; and its own wingmates' spacing no longer applies to it (escorting it, they were
    herding it away; a third hook, `noSep`).
13. **The ram (§3.2)** runs at `RAM_SPD` × a Talon's top speed straight at the target's predicted contact point, with
    `RAM_HULL` 120, `RAM_ARM` 60 and no shields, and nothing dodged against its target. It strikes on contact with the
    hull outline (the sim's ellipse at true size): `RAM_DMG` to the subsystem nearest the contact point (a container
    has 25, so it's simply destroyed) plus `RAM_CORE` to the core; a 120 ms hitstop, a 0.6 shake, a flash and a
    breach where it struck (the art's new `breaches` field), and a callout naming what went down ("RAM IMPACT ·
    CONTAINER DOWN"). Its death skips the map's kill effect. Shot down: "RAM DESTROYED", and the cause log and debrief
    say how far short ("Your ram was shot down 456 m short at 0:14"). The staging diamond, countdown and dashed ram line with its
    "IMPACT n s" chip draw over the map. The callouts are recorded now (`L.callouts`); K4 draws them.
14. **Turret tracking (§3.2)** is one function, `pdTrack(turret, fr, dt, …)`, for M-37: each turret has a facing it
    traverses at `PD_TRAVERSE`, fires only within `PD_ON_TARGET` of its aim, retargets every `PD_RETARGET` (or when
    its target leaves its arc or reach), leads from the target's velocity `PD_LAG` ago, and spreads by the target's
    angular speed across it. Measured over 60 s in the tests: a Talon crossing at full speed 1,500 out is hit by 6.7%
    of bolts, a docked Brickbat by 76%, a Brickbat on a straight bomb run by 36% (the bands are < 10%, > 50%, 25–40%).
    The art draws each turret on its own aim, and a dead one blackened and drooped with a wisp of smoke (`aims`,
    `pdDead` and a per-turret `fire` on the FL-400's draw; with none of them it draws as before).
15. **Boost Shields (shared with High Command):** 24 s cooldown (`SHIELD_CD`, on the panel's Fighting group); AUTO only
    when a shield half is under 30% **and** was hit in the last 2 s; no "BOOST SHIELDS" floater and no shields badge
    (K3's refill sweep replaces them).
16. **Collisions split by mass (§3.8, shared):** a ship's mass is its size class squared, and a collision's push and
    damage split by mass rather than by size class, so a fighter bounces off the freighter and the freighter barely
    moves.
17. **The freighter steers itself (§3.8):** the layer flies it, turning toward its next waypoint at `CAP_TURN` (0.05
    rad/s; `CAP_TURN_ALARM` 0.08 once it's alarmed) whatever the flight model's corner speed, with its velocity easing
    back onto its heading over `CAP_REALIGN`, so a knock is a lurch and a slow swing back. A Cross rammed into its
    side at full speed turns it 0.2° and it reaches its jump; disabled, a shove moves its drift the way it was pushed.
18. **Pirate end to end (§3.11):** resolve drains at the spec's `RES_THREAT` 1.5; "THEY'RE WAVERING" at 30; Intimidate
    orbits at the hull's half-length + `INTIM_STANDOFF`, guns on turrets and escorts only, and once every turret is
    down an intimidating or Weapons Tight ship stops shooting the freighter at all (no hull leak). The hail's default
    is *Take the cargo* when Pirate is the primary (the persona's otherwise); an objective's request (the hail) ignores
    the gap, the open cap and the mission cap and always shows a card, and Requests off decides it by its default
    unseen only because that switch turns every card off. Take the cargo: it heaves to; the Intimidate Executive ends
    done and the wing **Overwatches the transfer** (a new verb, inside `TRANSFER_R`, guns on anything that comes); the
    containers come out one by one as floating crates (the surviving modules × `PIRATE_SHARE`) that drift to your
    nearest ship; at 100% "CARGO SURRENDERED · n CRATES", and it's released to jump. No deal: resolve to 40, "THEY'RE
    HOLDING OUT", and it hails again the next time resolve reaches 0, after 30 s at least. Fanatical Crew: the first
    time resolve reaches 0 the leader says "They're not folding, Base", the modifier shows, and Intimidate becomes
    impossible, so a Secondary waiting on that wing is taken up at once (Pirate as the primary simply fails, as
    before). The debrief prints when you answered the hail, or "{leader} decided: … (no answer from you)".
19. **The stuck guard:** a busy Executive whose progress hasn't moved for `EXEC_STALL` (90 s) gets one request from its
    leader, "We're getting nowhere. New orders?" (*Switch to the Secondary* / *Keep at it*). Its default: the
    Secondary if there is one and the leader isn't eager.
20. **Request keys:** a request is answered with **Shift+1–3** (its first, second, third answer), never in the 400 ms
    after its card appears; Z X C V B N stay the powers, so C is always Call a Pilot. The cards show ⇧1 ⇧2 ⇧3.
21. **High Command's hashes were re-recorded again (K2):** Boost Shields' cooldown and AUTO rule and the mass split
    change how High Command fights play, so the HC35 1 baselines are now 6823701e, 9a4e5999 and ba50c171, and
    `SIM_VERSION` is `hc-2` (the layer's `hc35-2`). The new hooks are unset there.
22. **Tests changed to fit:** the scripted HC35 5–7 setups turn the crew's resolve drain off outside Pirate (with the
    spec's drain the freighter hails about 20 s into any fight: C-80); HC35 10's ram checks the core's share; HC35 11's
    gap and cap leave out the hail; the old A/B/C keys test is now the Shift+1–3 one; K0's replay needs 60 checkpoints,
    not 100 (the scripted Steal now ends sooner).
23. **Tests:** `tools/arena-smoke.js` HC35 K2 (feedback 1 tests 2, 3, 4, 5, 16, 19, 21; test 20 is in HC35 11, test 14
    is HC35 1 against the new baselines, and every scripted plan is checked to have launched).
24. **K2 left for later phases:** drawing the callouts and the progress shown while boarding beyond the existing chip
    (K4).
25. **No damage numbers (K3, §3.3):** the "-N" floater is off unless the panel's `SHOW_DMG` (Fighting group) turns it
    on, in High Command too. When on, it adds up what the hull actually took (the freighter's read 4 × because it
    counted before the guns-vs-hull cut). In 3.5 no words float at all (IMPACT, COLLISION, SPLASH, FOX, the crits,
    MISSILE HIT …: a new hook, `floater`); High Command keeps them.
26. **The shields as two halves:** two arcs on an ellipse round the hull (the sim's hit size at true scale plus
    `SH_PAD`), the nose half and the tail half, each 180° less a 10° gap at the beam; each arc's thickness and alpha
    follow its half's strength, and an empty half is a thin broken line. A hit flashes only the half it struck, and the
    hex splash sits on that arc at the hit's bearing. A refill (Boost, or a tenth of the half back within a second)
    sweeps out from the arc's middle over 0.6 s and swells the arc 10%. The shape is High Command's too; who shows them
    there is still C-72's rule. In 3.5: always on your ships at art zoom, faint and thin (see C-80) unless the ship is
    selected (or its wing), was hit in the last 2 s or is refilling; on theirs, for 2 s after any hit and while
    selected. The numbers are on the panel's FX group (*Map icons and shields*).
27. **The bars:** the roster tiles' and the pilot panel's bars ease to a new value over 0.6 s, and a rising shield bar
    gets a glint along it. Reduced motion turns both off.
28. **Health colours** (`bands:'gor'` on `TH.hpPips`, and `TH.hpCol`): hull over 60% green, 30–60% orange (hazard),
    under 30% red (#ff4a3d), pulsing under 15%, on the map's pips, the icons' ticks, the tiles' hull bars and the pilot
    panel's hull bar, in High Command and 3.5 only. The wing cards have no health summary to colour (adding one is a
    HUD change, K7's); the target readout comes with K5. Ground combat and the base keep green → gold → hazard.
29. **The death spin follows the turn (§3.9):** the kill's payload carries the ship's nose rate, its path's turn rate
    and its turn cap (and a heading of 0 is no longer dropped). The tumble is the nose rate × `spinK`, clamped to
    `spinMin`–`spinMax`, ÷ √ its size, in the nose's direction; it grows to `spinGrow` × (was 4 ×) over the fall; the
    curl follows the turn; the chance to spiral is `spiralChance` × (0.5 + its turn ÷ its cap). Ships of size 9 and up
    never spiral: they get the ordinary explosion (no ship that size dies on the map today but the FL-400, which
    already plays its own capital death). A Brickbat killed flying straight tumbles at 0.36 rad/s, a Talon killed in a
    hard turn at about 4.6. The knobs are on the FX group.
30. **Tests:** `tools/arena-smoke.js` HC35 K3 (feedback 1 tests 6, 7 without the target readout (K5), 17, and 5's
    refill sweep). C-74's spiral test now sets the chance to 2 (a ship flying straight spirals half as often, so at 1 it
    was a coin flip; fixed in K4).
31. **One vocabulary (K4, §3.4):** `SIMHC35.verbOf(ship)` gives a verb, its glyph, its words and a progress for every
    behaviour your ships can be in: the doc's table, plus *Overwatching the transfer* / *Guarding the transfer*,
    *Closing to board* / *haul*, *Keeping out of sight*, *Holding for the reserves*, *Following false orders*,
    *Springing the ambush*, *Towing*. High Command's own kinds read through as words (*Covering*, *Forming up* …);
    the floor is *Busy*, never a raw id. The tiles show its glyph and words; the pilot panel its glyph, words and the
    behaviour's why; `tools/run-report.js` counts seconds per verb with it.
32. **The activity badge:** over each of your ships at every zoom (icons too), 22 px, a rebel-red rim, the white glyph,
    and a gold ring for the timed verbs (bombs left on a run, the subsystem while disabling, boarding, the container
    being hauled, the crew's resolve, the transfer, tagging, the distance to a pod). It pops 1.3 × → 1 × over 200 ms
    when the verb changes (not with reduced motion); badges that overlap fan apart up to 14 px each. Enemies get none.
    The glyphs are placeholders (M-37).
33. **The `think` hook no longer skips the pilot.** A ship the layer drives still gets its assessment, its new-job
    bubble and its abilities on AUTO. So **in 3.5 your pilots use Boost, Barrel Roll, Field Repair and the rest again**
    (since P1 they hadn't). For a 3.5 job its line is the verb's words (a new hook, `assess`). High Command is
    unchanged (its hashes too); the layer's `SIM_VERSION` is `hc35-3`. One effect: a wing leader's Field Repair now
    heals it back over the "I'm hit" threshold at once, so HC35 11's keys test asks a wingman; HC35 6's Crash now
    orders the disable as the freighter enters the pull (its lane only grazes the pull, and the old 97% mark was its
    closest point, too late once the bombers took longer); K0's scripted run needs 40 checkpoints (it ends sooner).
34. **Cargo aboard shows:** the Brickbat's pods carry crates as they fill (`crates:0..2` on the `cargopod` draw, in
    the map's and the hangar's views), its badge reads "Carrying 2 crates home", and its wing card gets a "▣ 2 aboard"
    chip.
35. **Tethers always show,** whatever is selected: the boarding link (a dashed gold line with the effects off), the
    hauling tether, a tow line from the tug, and the ram line.
36. **The callouts** draw over the spot in Bungee (1.2 × → 1 × over 0.2 s, held 2.5 s, faded over 0.5 s), stacked
    when they'd overlap; off screen, an edge arrow in their colour points at the spot for 3 s. Green for our wins,
    orange for danger to us, blue for the enemy's moves. The set: CARGO SECURED 1/2 · MAGS, CARGO HOME · 2 CRATES,
    BOARDED · PRIZE TAKEN, ENGINES / COMMS / TURRET DOWN (not when the ram did it: it names its own), RAM IMPACT · …,
    RAM DESTROYED, {PILOT} HIT (the first time one of yours drops under 30%), {PILOT} DOWN · POD AWAY (or just
    DOWN), DISTRESS SENT, RESPONSE INBOUND, JUMP SPOOLING, {WING} ARRIVED, and K2's Pirate ones. Where the moment
    already has its own line in the feed (with VIEW), the callout doesn't add a second.
37. **Reinforcements join the roster (§3.10):** the roster's rebuild key includes the wing ids and is checked every
    frame, so 3.5's reserves, the "Hold for reserves" answer and High Command's own Reinforce get their card in the
    frame they warp in. The card slides in at the foot of the column (200 ms) and its header flashes gold twice; in
    3.5 the feed says "{Wing} on station" and "{WING} ARRIVED" fires.
38. **Tests:** `tools/arena-smoke.js` HC35 K4 (feedback 1 tests 8, 9 and 18, High Command's Reinforce with a reserve
    wing put into hc1).
39. **Enemies can be selected in 3.5 (K5, §3.5)** to inspect, never to order: a click on the freighter, an escort or a
    response ship selects it (and clears your own ship's selection); a click on empty space clears it. While a power
    is picking its target, a click still names the target as before.
40. **The target readout** sits top right of the map, by the designer panel (the command points live in the powers bar
    at the foot of the screen, so "under the command points" had no place yet; K7 places it). For the freighter: a
    steel silhouette drawn from the art with every subsystem where it sits (engines, comms and the four turrets as
    green / orange / red dots, a dead one grey with a ✕; the twelve containers as the module grid, a taken one ghosted
    with a red tick, a destroyed one an empty black bay, a hazard module orange); the rows "Engines · 0/120 · DOWN",
    "Comms · 24/60", "Turrets · 3 of 4", "Cargo · 10 aboard · 2 taken · 1 destroyed", the core as a hull bar, the
    crew's resolve as a bar when a plan needs it; and the state chips DISABLED, DRIFTING, JUMP SPOOLING n s,
    BOARDING n%, DISTRESS n%, SURRENDERING. An escort or response ship gets the smaller card: its name, class, pilot
    level, both shield halves, armour and hull.
41. **The subsystem rings:** with the freighter selected or hovered, at zoom 0.5 and closer, or while a power picks a
    target, a small ring sits on each subsystem in its state colour (a dead one grey with a ✕), and on the containers
    too while it's selected. Hovering one shows the in-game tip ("Engines · 0/120 · Down · It can't run or jump."),
    and the one a power would hit is ringed gold. Disabled engines already go dark (no trail flame, the art powered
    down) and keep their sparks.
42. **Targeting** picks a subsystem within its own true-scale size (or 14 px at this zoom), not the old flat 140 units,
    so a click between two subsystems hits the hull.
43. **Tests:** `tools/arena-smoke.js` HC35 K5 (feedback 1 test 10, and an escort's card and clearing).
44. **The Missions tab, as a mock (K6, §3.6)** built in `arena-hc35.js` with the vanilla briefing room's own classes
    (`sr-briefing.css`, `bf-`), to mock-up 1 with the review's corrections: the top bar ("Missions", "Briefing room ·
    Haven Rock", the tabs inert and tipped "Not in the Arena", mock resource pills with Intel live); the mission board
    with the Vulnerable Freighter selected (its thumbnail the FL-400 in its Hegemony livery drawn from the art kit,
    "Space", the risk pips, Cass, NEW), Steal Fuel and Rescue Tachi dimmed and tipped "Not in this demo", a "Signal
    encrypted" card with a lock and no pips, and New opportunity at the foot; the holo-table (the planet as a
    wireframe, its tilted orbit, the freighter on its dashed lane to a Hegemony-blue jump marker, one blue triangle a
    known escort, the Target and Window callouts cyan and the Opposition blue, "Thessa Reach · Remote system"); the
    briefing rail (Cass, the pitch, Risk / Type / Max force, the known modifiers as green and orange tags and a dashed
    "? Cass may have missed something", Dig deeper with its Intel pips, the gold Plan mission); a mock comms feed.
    `base.js` is never called. The board is narrower than the vanilla 330 px (290) to leave the holo-table room
    beside the designer panel. The dossier window is gone.
45. **The planning windows:** each step is a `sr-window` in one `.h35-holo` class (a block of tokens for K7), over the
    dimmed and blurred Missions view: the cyan projector glow along its foot, 3% scanlines, the panel at 92%. The head
    has "PLAN: VULNERABLE FREIGHTER", a ✕ back to the board (the plan kept) and the step track (done green and
    clickable, the current one pulsing gold, later ones grey, the lines filling). The foot: ◀ Mission board / ◀ Back,
    the readiness strip (each need met or missing, tipped), and the gold Next: {step} ▶ or Launch ▶; a disabled one
    says why in orange and in its tip (Next waits for a primary). Keys: Esc and ← back, → and Enter next. It rises out
    of the beam (scaleY 0.02 → 1 in 220 ms, two flickers), a step slides 24 px its way and flickers once, Launch folds
    it into the beam (180 ms); with reduced motion, 120 ms fades and Launch at once.
46. **What the windows hold:** window 1 the four family columns (and the Later ones across the foot); window 2 the
    optionals and the rules side by side; window 3 the three wing cards in a row, the asset slots below; window 4
    wide, its left 360 px the wing orders and the readiness, the rest a cut-out where the plan map shows through, the
    camera fitted to it and the markers dragging there. Each leader's take is a speech bubble under the card. Plan
    again now returns to window 1 (it was step 4), the plan kept.
47. **One tooltip:** `#hcTip` styled as the kit's `.sr-tip` (an ink panel, a 2 px steel border, a bold title, the body,
    and a footer in a meaning colour: cyan info, orange warning, gold cost), one `tipFor(key)` returning `{title, body,
    foot, tone}`, shown after 250 ms anchored to the element, flipped at the screen's edges, on keyboard focus too, and
    in the designer panel. No `title=` is left in `#arHc` or `#arHc35`: the old ones (the clock, the roster tiles, the
    panel's labels, the dossier's and the 3.5 screens') are `data-tip`s, a literal one being `data-tip="@"` with its
    text. Every objective, optional, rule, asset, power, modifier tag, wing role, loadout, order and trigger has a tip.
    The canvas uses the same box: the plan markers, the lane's time ticks, the gravity window, the subsystems (K5) and
    the ships (name, class, verb). A part of the HUD that re-renders now hides only a tip that belongs to it (before, any HUD refresh could
    swallow a tip that was about to show elsewhere).
48. **The debrief:** a pod still drifting at the end is Captured (Hegemony ships within `POD_CAPTURE_R`) or Lost, never
    "drifting" (the feed says so too). "What decided it" goes by weight: why the primary failed first (a Steal: the
    jump, or "Its engines were never knocked out, so nobody could board", or the freighter destroyed …; a Crash
    disabled outside the pull; a Strip with nothing home; a Tag never planted; an Ambush with nothing to ambush; an
    abort), then the losses, then the powers, the answers and the rest. The layer's `SIM_VERSION` is `hc35-4` (a record's pods now resolve at its
    end).
49. **Older tests changed to fit:** HC35 2 walks the Missions tab (no dossier step) and expects Plan again at window 1.
50. **Tests:** `tools/arena-smoke.js` HC35 K6 (feedback 1 tests 11, 12 and 13).
51. **K7 waits for your mock-ups**: nothing on the mission HUD was rearranged beyond K0 to K6 (the target readout sits
    top right only until then).
**Your call:** none needed; overrule any item.

### C-84 🟡 Type 3.5 planning windows: built to mock-ups 2–4
`docs/ARENA-HC35-WINDOWS-HANDOFF.md`, a restyle of the planning windows in `game/js/arena-hc35.js` (`briefHtml`,
`trackHtml`, `needsHtml`) and `game/ui/arena.css`; the flow, the data and the behaviour stay. Built in phases W1 to W3.

1. **W1, the frame (§1).** A chamfered holo plate drawn as five clipped layers (ink, cyan edge, fill, a thin inner
   line, the fill again) so the 45° corners and the V-notch where the beam comes in are real edges, not a rounded box
   with a border; the fill is the navy gradient with the scanlines and a faint circuit grid. About 1310 × 850 at
   1920 × 1080, 75 px down; at 1440 × 900 it fills the stage less 24 px a side. The title is "PLAN: {MISSION}".
2. **The step track:** Objectives · Rules · Wings & assets · The plan, done green with a ✓ badge (click to go back),
   the current one gold with a turning sunburst (static with reduced motion), the rest grey; the connectors green,
   gold chevrons drifting to the next, grey. Window 1's part dots sit inside its label pill. The Next button names
   the short labels too ("Next: Secondaries", "Next: Rules").
3. **The footer straddles the frame's bottom edge:** ◀ Back (◀ Back to board on part 1), the readiness pill, Next or
   Launch. The pill replaces the strip of checks: "Needs: {n} missing" in orange or "all met ✓" in green; its tip
   lists every check with ✓, ✕ or !; a click opens the list above it and any other click closes it. Warnings don't
   count. A disabled Next or Launch keeps its reason in its tip and as the orange line under the pill.
4. **The tooltip** inside the windows is the mock-ups' ink panel with a cyan border and an 8 px pointer, 300 wide,
   beside the element (right, else left, else below), over the window. Elsewhere it's as it was.
5. **Window 4** has no mock-up: it keeps its contents, with the title, track and footer, and only the frame's edges
   (its pane is a cut-out the plan map shows through).
6. **W2, window 1 part 1 (§2).** "What's the job?", then the four family columns. The *Later* column is gone: its
   cards are locked in their families, one a column (Snatch the Paymaster, Misjump, Turn the Crew, Cover Op), and the
   column header's tip names every one to come (Trojan Freighter is only there). A card: its glyph, name and pitch,
   then *Needs:* (green ✓ or orange ✕ once picked, neutral before), then *Pays* and *Accomplished* (L1's rewards, in
   place of the mock-up's Loot tier). Picked: gold border, glow, gold name and a gold ✓ corner tab. Its tip: the name,
   the full `wins` text, the timing or caveat.
7. **The fit at 1440 × 900:** a column too tall for the window first drops its unpicked cards' *Pays* and clamps their
   pitch to one line, then hides its locked card (still named in the header's tip). Take it, with four cards, is the
   only one that needs it, at both 1440 and 1920; the others keep everything. A pitch otherwise runs to two lines.
8. **Window 1 part 2 and window 2 (§3):** the secondaries, then the rules, as toggle rows (60 px, the glyph, the
   name, a switch; green when on), each beside a second panel: *Your primary* (its card, read-only, and a ghost
   *Change* back to part 1) and *The plan so far* (the primary and the secondaries as rows, with their conflict tags).
   The counter is green; at 2 / 2 the rows that are off dim and don't toggle, their tip saying why.
9. **The rows' second line:** Preservation Order is "withdraw below [30%] hull" in a gold field that steps by 5%
   from 10% to 60% with its ‹ › or ← / →, in place of the slider; Protect a ship and Blood the Rookie are "Pilot:
   [Name a pilot…]" in the same field.
10. **Conflict tags** ("⚠ Conflicts with {other}") show only while both are on, in the row's right-hand column, so
    the switches line up down the list; on window 2 the plan so far shows them too. The primary's own clash (Pirate
    against Whale Hunt Tasking) shows there, not on its card.

11. **W3, window 3 (§4).** A column a wing: the leader's Bobblehead in a rebel-red ring, the callsign and the
    leader's name; a row a ship (its top-down art at its size, nose right, in our livery, the Brickbat's following its
    loadout; the class's full name; the pilot, ★ for the leader, and their level or preset); a Brickbat's row adds
    *Bombs | Cargo pods | Boarding party*; then *Strike | Reserve | Stay home*, lined up across the three columns
    (a shared grid, so the tallest column, Amber's, sets where they sit); then the leader's take as a speech bubble,
    orange when it's a critique (anything but the five calm lines: "Let's go.", "Sound plan.", "If you say so.",
    standing by, sitting out). The chosen segment is rebel red. A Stay home column dims to 55%, all but its role.
12. **The assets bar:** three slots in a row. Filled: a thumbnail (the two rams and the pirates as the Brickbat
    drawings they fly as on the map, in their liveries; the rest their glyph on a dark well), the name, "unlocks
    {power}" in cyan (the Comms Relay, which unlocks none, "passive: shorter delays"), a green ✓ corner and a ✕ on
    hover. Empty: a dashed cyan "+ Add asset". The picker rises from the slot clicked as a holo panel of rows
    (thumbnail, name, line, what it unlocks); Esc, a click outside or the slot again closes it.
13. **The fit at 1440 × 900:** with Amber's four ships and every Brickbat on Boarding party, window 3 is taller than
    the window, so its art drops to 80 × 40 and its rows to 48 (the handoff's fallback); at 1920 × 1080 it keeps the
    full size.

**Your call:** nothing; this is what was built.

### C-87 🟡 Type 3.5 playtest 3: what I chose building it
`docs/ARENA-HC35-FEEDBACK-3.md`, on `docs/OPPORTUNITY-SYSTEM.md`. Built lean for internal testing (your call, 21 October).

1. **`game/js/ops-core.js` (`SR_OPS`)** holds the vocabulary (types, tags, the verbs with their families, needs and
   fallbacks), `primaries()` and `objectsFor()`, and the help decisions (`aidScore`, `askScore`, `decideAid`, with a
   node self-test). It knows nothing of ships. **Kept thin:** the per-verb win and can-still checks still live in
   `sim-hc35.js`'s switches (`primaryTick`, `canStill`, `execState`, `fieldExec`); the verb table owns the families,
   fallbacks and surrender defaults. Moving the rest is mechanical, when a second mode needs it.
2. **The freighter as a cast:** `families`, `key`, `cast` and `events` on the opportunity; its seven primaries are
   derived (with a key object, a force verb counts only for Bait: the key is the bait). The response's arrival point is
   read from the cast (`arrives.at`).
3. **Orders keep `{k, arg}`**, with `arg` naming the object for Destroy and Ambush (a cast id, or `area`) and a new
   `at` for a point. Destroy offers the freighter, the escort, the response and "anything near a point"; Disable the
   freighter's parts. Ambush and Hold (and Destroy near a point) get a draggable marker on the plan map
   ("AMBUSH · DAGGER"), defaulting to where the response arrives. Change Executive Order offers the same objects.
   Points are for the Executive only; Secondaries keep the default.
4. **Triggers:** "the response arrives" (Phase 3), "the freighter starts its jump", "the escort is down", and "a wing
   is in trouble" with a wing picker.
5. **The clock:** window 4's "How this plays out" strip; the blue arrival ring on the plan map ("ABOUT 2:50 AFTER THE
   ALARM": the distress's 20 s plus the response's 150); the HUD's "RESPONSE IN 1:17 · AT FREIGHTER'S JUMP POINT" and
   the ring with its countdown. Ambush's leaders' plan: Dagger and Amber wait where the response arrives; Anvil takes
   the engines, then joins the ambush. A critique "Nobody stirs them up, nobody comes."; Ambush conflicts with Kill the
   Distress Call.
6. **Help requests:** every 3 s (`AID_LOOK`) a unit in trouble may ask; its leader decides (send the nearest one, two
   against two or more, or go), unasked at −0.1. Refused, it asks the nearest other wing's leader within 4,000; with
   nobody, it falls back to that wing for 12 s, unless docked. A helper engages the attackers, stays till 5 s clear,
   then goes back. Spoken, in the feed, and in the debrief's leaders' calls. The pilots' traits and the weights are
   placeholders on the *Duties* panel (C-88).
7. **Pace:** a wing on its way to its point flies at its slowest ship's cruise × 0.95, and a ship ahead of its laggard
   circles at the laggard's distance (fighters can't fly as slow as a Brickbat).
8. **The escort is a threat:** a waiting wing engages anything attacking one of its own within 4,000.
9. **Surrender:** the crew's nerve drains only from ships threatening it (Intimidate, or going for the freighter or its
   escort). Take sends the nearest spare ship (Cargo pods first, else one waiting) to stand by, logged; with nobody
   spare it becomes No deal, said. Only ships sent to stand by count for the transfer ("TRANSFER 88% · NOBODY STANDING
   BY"). Outside Pirate, handed-over crates pay `PIRATE_SHARE` × Pirate's per-container rate as "Surrendered cargo".
   A new request card pulses with a sound; a must-answer card slows the game to 0.3 × (`REQ_SLOW`); a timeout's feed
   line ends "(no answer from you)".
10. **Ambush ends** once the response is destroyed, routed or gone; with the distress killed or Remote it's impossible,
    the leader says "Nobody's coming." and the wing finds work. Ambush falls back to Clear the escort, a new verb (Deny
    it), paying without the bonus. `SIM_VERSION` `hc35-13`.

11. **N5, Patrol Sweep** (data, on the mission board as a second card): a patrol (a Scimitar lead and six Motes) that
    hunts you from the start, its reinforcements arriving at the belt's north edge when the lead's call for help gets
    out, the belt, home. Clear and Ambush are derived (with no key object, Destroy applies to things, not forces).
    What needed code, once, for any lead with no freighter: the cast's forces spawned from the data (`of`, `at`); the
    caller for help (a force's lead, as well as the freighter's comms); the arriving force's id where the code said
    "the response"; window 1's families and primaries from the opportunity; secondaries and rules offered only when the
    cast has what they need (Leave No Witnesses something that escapes, Kill the Distress Call something that calls;
    Whale Hunt and Weapons Tight only with the freighter); the freighter's planet, lane and jump point drawn only where
    there is one; leaders' plans per opportunity. No modifiers roll for it yet (its pool would be its own).
12. **A docking fix found on the way:** a boarder's final leg starts up to 950 from the clamp point, and it went back
    round to its staging point beyond 960, so any drift sent it round again (some boarders circled for minutes). It
    goes round now only beyond 1,250. A helper covering a docking ship stands off rather than flying close escort.

**Your call:** answered: you played Patrol Sweep and liked it (decision 13; the Resolved log). Tweaks to come

### C-85 🟡 Type 3.5 planning windows: readings to confirm
1. **Red and gold.** A chosen segment (role, loadout; W3) is rebel red, as the mock-up has it, while a picked card
   is gold. I read it as gold = "picked for the mission", red = "your force's setting". Is that the split you want?
2. **Toggles are green when on**, as the mock-up has them.
3. **The second panels** on window 1 part 2 (*Your primary*) and window 2 (*The plan so far*) aren't in any mock-up:
   the handoff asked for them so neither window is half empty. Say if either should show something else.
4. **The suggestion chip** ("☆ Suggested for Steal") sits in the row's right-hand column, beside the row, not hanging
   under it as in the mock-up: under the row it would run into the next one at 60 px rows with 7 px between.

**Your call:** confirm, or say which to change

### C-86 🟡 Type 3.5 planning windows: text
Lab copy, `[TEXT NEEDED]`: `pitch` and `caveat` on each of `PRIMARIES` in `game/js/sim-hc35.js`.

1. **The pitches** are the mock-up's where the handoff kept them (Steal "Take the freighter intact", Destroy "Blow it
   apart", Crash "Smash it into the planet", Ambush "Use it as bait to draw them in") and the handoff's corrections
   (Pirate "Scare the crew into handing it over", Strip "Haul off what you can carry", Tag "Follow it home to its
   depot").
2. **The tooltips' footers** are mine, from how each plays: Steal "Timing: aboard before the response arrives",
   Pirate "Caveat: a crew holds out while their escort fights", Strip "Timing: one container a haul", Destroy
   "Caveat: nothing to bring home", Crash "Timing: the gravity window" (the handoff's), Tag "Caveat: unseen, or the
   tracker is found", Ambush "Timing: the response arrives in Phase 3".
3. "What's the job?", "Your primary", "The plan so far", "Change", "Two at most: turn one off first", "withdraw below
   … hull", "Pilot:" are the handoff's or mine.

**Your call:** rewrite any of them

### C-28 ⚪ Support specialties: the numbers and readings I chose
The Support Specialties doc is built (`game/js/support.js` holds the data and the Head/Lead/Staff rules; every number
is in the Rules tab of the spreadsheet). You accepted my defaults and asked that the staff posts be replaced by the
Department Head / Lead Specialist / Staff system, and that new features supersede old ones wherever possible. What I
chose, and what replaced what:
1. **Rooms.** A Support rebel works only in their specialty's home room: Infirmary (Doctor), Intelligence Center
   (Intelligence Officer), Workshop (Mechanic), **Tech Lab** (Technician; a new room at the Workshop's cost), Storeroom
   (Logistics), Training Hall (Academic), Diplomatic Quarter (Diplomat), Command Center (Mission Control). A room holds
   **2, plus 1 per extra tile** (upgrades do not count: most rooms have none).
2. **The posts are gone.** Garrison Officer and Flight Deck Officer had no home room and went (Treatment and Repairs
   cover them). Medic, Crew Chief, Signals Operator, Quartermaster, Drill Instructor, Chief Diplomat and Flight
   Coordinator became the base specialties. A room still does its own job when someone of its specialty works there:
   the Intelligence Center makes Intel and finds opportunities only with an Intelligence Officer, the Infirmary makes a
   Med Pack every 2 days with a Doctor (3 without), the Command Center adds a recruit with Mission Control working.
   The Storeroom's cheaper repairs and the Command Center's flat +5% are gone (Mission Support gives +5% to a mission it
   supports).
3. **Jobs.** Base-specialty Jobs (Treatment, Processing, Repairs, Supply Handling, Tutoring, Outreach, Mission Support)
   and a few niche ones (Rehab, Conditioning, Drill, Pre-flight Checks, Decryption) fill themselves each day, most
   urgent first. Other niche Jobs are started from the room (or, for a mission, on the planning board's **Base
   support**). A specialist runs one niche Job at a time; their base Job runs alongside it.
4. **Experience.** You set no pace, so: 0.03 of a level a day working the room, 0.06 on a Job (about 17 to 33 days a
   level), 50% faster as Staff under a higher Lead or when Tutored. Level 19 is a long way off at this pace.
5. **The classroom.** Level 3, 300 credits, 3 days (Curriculum takes a day off from a Level 7 Head, two from 15), one
   seat (two with Expanded Range). They keep working meanwhile, as the doc says. Only a niche with something working
   can be trained; the rest show as "nothing it does works yet".
6. **Words the game does not have.** Move is Agility (a Strength Programme is +3), HP is Constitution, Cool is +10 at
   the start of a mission. Treatment is +50% to +100% of the untreated rate. **Stabilise replaces the Surgery Room's
   60% save**; rebels only die in space today (shot down), so that is where it applies. The Surgery Room now adds half
   a day of recovery. Critical Condition lasts 8 days and only heals under a Doctor's Treatment.
7. **Prosthetics** are a Cyberneticist's Job only (the old Surgery Room fitting is gone): a basic one costs 80 Supplies
   and 5 days and carries −1 aim (arm, eye) or a slower step (leg); Combat Limbs fits a stabilised arm (+1 aim) or a
   runner's leg (faster), and an eye with no penalty. Prosthetics fitted before this build carry no penalty.
8. **Outreach** is the Diplomatic Task: each Diplomat runs one team (it was one per Quarter tile), and a team raises
   ½ a flag plus 25%. The old "a whole flag at level 3" is gone.
9. **Unlocks I had to read to fit the game** (the dossier says what each one does):
   - *Slicer:* no hackable doors or turrets exist, so **Pre-hack** hands over the first Hegemony Auto on the map (or
     starts a terminal hack a round from done). Hacks never fail, so **Overwatch** makes them take one round. Hacked
     Autos already stay ours, so **Backdoors** keeps an interrupted hack's progress. **Map Theft** lifts the terrain fog;
     enemies still have to be seen. **Blackout** stops wave reinforcements and transports unloading on that world.
   - *Tactician:* rounds are simultaneous, so **Battle Plan** is a round in which the Hegemony neither moves nor fires
     (**Perfect Plan**: two). There is no retreat, so **Extraction Plan** means a failed supported mission brings home
     no new injuries. **Overwatch** is a Fire Support menu item that shows every enemy for a round.
   - *Analyst:* **Mission Intel** puts the opposition on the briefing and every enemy on the minimap. **Data Mining**
     gives 3 Intel (a lead on a new Source waits on the Network). **Briefings** (the Head's Rule) shows how many enemies
     from level 1 and which types from level 7.
   - *Aerogineer:* **Refit** is a new cost: without an Aerogineer a weapon change grounds the ship for 2 days. **Fighter
     Tuning** is +1 to be hit or +1 top speed; **Heavy Frames** +15 hull for the hauler (no bombers exist);
     **Pre-flight Checks** +5 front shield; **Scavenger's Eye** 20 Materials a kill (40 a structure).
   - *Smuggler:* **Special Order** takes the stall's sixth lot at the next restock; **Inside Line** swaps the last two
     lots every 3 days; ships and vehicles already sell at Level 1, so **Rare Finds** doubles their weights; **Fence**
     doubles what gear sells for in the Arsenal; **Smuggling Runs** makes deliveries take 1 day.
   - *Propagandist:* campaigns cost 150 credits and 30 Supplies and run 5 days. **Broadcasts** ½ a flag and a 50% chance
     of a recruit; **Recruitment Drive** two recruits, one at level 2; **Hero Stories** a whole flag at a world where we
     won, +5 exposure. Worlds have no neighbours, so **Viral** lifts every world where we have Access at half strength.
     **Martyrs**: ½ a flag where they fell, half the morale loss at base.
   - *Instructor:* **Drill** takes 25% off training and makes the Training Hall's mats 50% faster (the old Drill
     Instructor's perk). **Veteran Mentors** count a level 11+ rebel resting at base as an Instructor.
   - *Flight Controller* (a free one supports space missions first): **Vectoring** lists the enemy wing on the
     briefing; **Scramble** adds one optional pilot and ship to the board (four at most); **Intercept Plot** is a
     choice on the board (flank left, head on, flank right, close in); there is nothing stopping a ship flying again,
     so **Rapid Turnaround** means pilots who bring an undamaged ship home are not tired by it; **Tight Wing** +1 to be
     hit; **Emergency Jump** pulls the wing out with no losses and fails the mission. **Formation Calls** waits on the
     Leader's Take Point (M-13).
   - *Combat Support* (a Tactician or Combat Support specialist supports ground missions first): fire support never
     scatters, so **Precision Strikes** makes the door gunner hit on 6+ instead of 9+; **Fire Coordination** lets the
     first drop or ship be called once more; **Rapid Response** lands drops, reinforcements and vehicles at once;
     **Evac on Call** flies a downed rebel out (home injured, not dead); **Saturation** widens the door gunner's zone
     by half, up to 5 targets, and the strafing blasts; **Danger Close** spares the squad from its own fire support;
     **Heavy Bombardment** is six big blasts on a spot the squad can see, once.
   - *Base Rules:* **Salvage** +10% to +40% Materials from mission rewards; **Maintenance** a 10% to 40% chance a used Med
     Pack, grenade or charge comes back; **Inventory Control** +4 to +20 Arsenal slots (the grid still only warns).
**Needs from you:** anything above you would like different, and an experience pace.
**Your call:** _open_

### C-31 ⚪ Downed VIPs, the shooter's reveal, the transport's fire support: what I chose
Your answers on C-29 and C-30 are built (see the resolved log). Where I had to choose:
1. **Who the objective needs:** the rescued VIP and the Pilot in Steal the Cross. Going down no longer fails the
   mission. It fails when they die, or when they are down and **nobody can bring them round**: no one on their feet
   carries a Med Pack, and (VIP only) no Evac on Call.
   A Treat Wound can now revive the VIP. They can die by the C-29 rules; a VIP takes no injuries, so cannot bleed
   out. **Nobody extracts while the VIP is down.** The Strider is a machine and cannot be treated, so its fall still
   ends the mission.
2. *(Undone at your call.)* The supply crate carried 2 Med Packs for a while; it is back to 5 stims, 2 BLAM and 2
   rockets, so it is no way to revive anyone.
3. **The shooter's reveal:** an enemy who fires stays visible through the next round (its planning and its shots),
   so the squad can answer. Enemies keep their weapons' full reach.
4. **Every transport** drops the squad, lifts off and comes back when the exit opens (the Cross away, the charge
   blown, the prisoner freed, the data taken). The squad can only extract with it on the ground. In Steal Fuel it is
   still called to the pumps, now from the air.
5. *(Resolved: see the log.)* The transport's own fire support.
6. **Arrival lines (your text, `game/js/mission-text.js` `arrive`, and the Steal the Cross and Strider cutscene
   lines)** said the pilot would wait at the LZ with the engines warm. I reworded them so the pilot stays overhead
   and comes back. Please check the words in the spreadsheet.
**Needs from you:** whether any of these should change, and your wording for (6).
**Your call:** _open_

### C-32 ⚪ The bigger base and the 4 × 4 Hangar: what I chose
Your answers: a hangar section is 4 × 4 tiles (four standard 2 × 2 rooms); a small pad is 2 × 2 and a large pad
4 × 2, so a section holds 4 small, 2 large or 1 large + 2 small; the map grows with more rubble; the game starts
with one section holding the Graf's large pad and two small pads. What I filled in:
- **The map** is 14 × 18 (was 8 × 11). The old map is the top-left corner, unchanged except that its bedrock
  makes way for tunnels east and south. The old cave hangar is open floor. There are 55 rubble tiles in
  pockets for rooms, and two 4 × 4 rubble caverns beside the Hangar for its next sections. Bedrock still can't be dug.
- **Which pad a ship needs:** size 7 and up (the Graf, light freighters) needs a large pad; size 6 and under
  takes a small pad, or a large one when the small pads are full. The derelict Graf holds its large pad while it
  waits, and a ship bought from Nyx holds its pad on the way.
- **A section costs** 960 credits, 800 materials and 4 days (four of the old one-pad tiles), +35% for each
  section past the first, and needs a 4 × 4 block of cleared floor. A new section has four small pads.
- **Switching half a section** between two small pads and one large pad is free and instant, from the Hangar
  window, as long as every ship still has a pad.
- **The Ready Lounge and Maintenance Bay** each take the front-most small pad (they need one; split a large pad
  first). The bay holds the most damaged fighter; a damaged hauler repairs on its own pad.
- **Ship scale:** a tile is about 10 m, so ships are drawn at the length their size class gives (Talon 12 m,
  Cross 16 m), shrunk only to fit their pad. The Graf's model is wide, so on its 40 × 20 m pad it draws at about
  27 m rather than 40.
- **Old saves:** the map grows around the old base, and the cave hangar's tiles become floor (a tile still being
  built is refunded). Its ships, upgrades and queued upgrades move to the first new section, and a second or third
  section is added if the fleet needs the room.
- **Art:** the kit draws one pad per tile, so I added `o.pads` to the kit's Hangar (small circles, large rectangles
  with corner marks, the lounge and bay sized to a pad). It's marked as a repo addition in `sr-art.js`.
**Needs from you:** confirm or change the costs, the size cut-off and the free switch. Ask the artist to fold
`o.pads` into the next art handoff, or the next `sr-art.js` will undo it.
**Your call:** _open_

### C-33 🟡 Screens handoff (`docs/ui/SCREENS-HANDOFF.md`): the open questions
The handoff's §6 asks for these to be logged. All four screens are built: the mission report, the personnel file,
the comm burst and the Missions tab.
1. **Cultivation meter scale** (comm burst, built): built as `cult / 100` toward the next level, which is how
   `checkCultLevel` levels a source today. Is that the scale you want?
2. **Holo callouts** (Missions tab, built): the optional `holo` field per mission (`MPOOL` / `MEXTRA`). Steal the
   Cross has your example lines; every other mission shows its first two objectives as Target and Extract (optional
   ones skipped). Please write the callout lines for each mission.
3. **Injured days counter** (personnel file, built): kept on the Injured card ("20 days to go"), though the mission
   report dropped it. Keep it there?
4. **Requirement labels** (Missions tab, built): count-first everywhere ("3 Soldiers", "2 Pilots", "1 Transport",
   "2 Starfighters", "24 Fuel", items and specialty). You accepted it for the transport; confirm the others.
5. **Win objectives** (mission report, built): collapsed to the "All N objectives" pill, as you reviewed. I can
   bring the full list back.
6. **Cass's transmission** (`cassIntro`, built): adopted the comm burst's speech bubble and channel strip, as the
   handoff recommends. Not signed off yet: say if you want the old window back.
7. ~~**Market and Arsenal amendment (§0.1)**~~ *settled 2026-10-08: no command bar out of combat anywhere; see
   "C-33.7" in the Resolved log.*
**Needs from you:** an answer to each.
**Your call:** _open_

### C-35 🟡 Personnel file: what I chose
Built from the handoff's §2 (`personHTML` in `game/js/base.js`, `game/ui/sr-personnel.css`; the build's own glue is
at the Personnel File block in `game/ui/scenes.css`).
1. **Skill effects for pilots (a conflict).** The handoff says Aim reads `aimOf(p,'s')` and Focus `focusTN`, but the
   space scene flies with the database's skill-and-level bonus (`pilotAim`, `SRDB.skillBonus`), and `focusTN` is
   read nowhere. They differ: a level 4 pilot is "+6 to hit" by `aimOf` and +4 in the cockpit. The tiles show what
   the game does. On foot Aim is `soldierAim` (the Vanguard bonus included). Constitution, Agility, Presence and
   Cunning use the handoff's formulas, which are the ones the scenes read.
2. **Good and bad effect chips** for every Character Trait are my wording, split from the effect line (`g` and `b`
   in `CT`, `game/js/rebel.js`). Experiences get one chip, marked bad for the ones that mostly cost the rebel
   (`BAD` in `game/js/rebel-exp.js`); mixed ones (Hardened, Desensitised, In Love…) count as good.
3. **The popover is 250px wide**, not 300: at 300 it runs off the window's right edge. To fit 1100px beside the rail
   at 1440×900 the window's surround is trimmed to 12px, and the column and skill-tile gaps are a little tighter.
4. **Medical:** the Injured card's popover lists each condition and its days; a rebel on their feet with something
   still mending gets a button per condition; lost limbs and fitted prosthetics are buttons too.
5. **The figure** is the front view only. The old doll drew the back view beside it when a Back item was carried;
   the Back peg shows that item now.
6. **The rank button** adds a "▲ Promotion ready" or "★ Can be commissioned" line when it applies.
7. **Heroes** get a "Hero of the Rebellion" button under Character (Rally cry, Heroic surge). Weary and Mercenary
   show in the role line beside Rookie or the specialty.
8. **The next fork's** popover holds the Choose buttons once it is due. The classroom is no longer on the file, so
   the "ready for the classroom" news now says to train them in the Training Hall.
9. **Icons** I picked: a d20 for Character, one per experience category, one per specialty, and Job/Rule icons.
**Needs from you:** whether (1) should change the space numbers or the tiles; anything else you would like
different, especially the chip wording in (2).
**Your call:** _open_

### C-40 ⚪ Source approach: standby contacts, and what I chose
The Approach window and standby (`docs/ui/SCREENS-HANDOFF-2.md` §2). The handoff's own open question, and my guesses:
1. **Standby contacts never give up.** The handoff leaves it undecided whether a contact left waiting on the
   Galaxy map eventually walks away; until you call it, they wait forever.
2. **The old silent queue is gone.** Before, a full network put accepted candidates in `candWait` and they
   re-knocked automatically when a slot opened. Now the window offers Standby up front, the contact waits as a
   gold dashed marker on the map, and *the player* reopens them — nothing re-knocks on its own. Old saves'
   queued candidates migrate onto standby.
3. **"+4 exposure" still moves `G.risk`.** The row is worded for §3's Exposure system, which doesn't exist yet;
   recruiting bumps the network risk number exactly as before. When §3 lands, this becomes `G.exposure`.
4. **The courier strip got a gold variant** (`.cm-chan--courier` in `sr-comm.css`): gold text and a still dot —
   a dead drop, not a live carrier — since the handoff's §7 didn't include one.
**Needs from you:** a call on (1); overrule (2)–(4) if you want them differently.
**Your call:** _open_

### C-41 ⚪ Mission planning: the handoff's open items, and what I chose
The slot-filling planning window (`docs/ui/SCREENS-HANDOFF-2.md` §4). Its own open questions, and my guesses:
1. **The 2-extra-asset cap stays**, as the handoff asks, until you say otherwise.
2. **The Reinforce mode is retired.** Fire support now comes from what an asset is: a starfighter strafes, a
   transport with a Door Mounted Gun covers the door, a drop-capable transport flies the Supply Drop. A spare
   transport with no gun grants nothing — what it *should* grant (the old Reinforce) is the handoff's open
   question. Nobody rides a support ship any more, and its seats go unused. *Since the prologue's phase 5:* a mission
   that flies with Reinforcements (Raid the Bunker) brings it back for itself (C-47.5 in the Resolved log); everywhere else a spare
   gunless transport still grants nothing.
3. **The squad cap** reads the seats of every transport actually assigned (summed, for the rare two-transport
   mission); with no transport assigned yet it falls back to the mission's squad size.
4. **The Support crew's mission jobs and the Flight Controller's Intercept Plot** (C-28 features the handoff
   doesn't place) sit as chip rows under the Mission Control card.
5. **Space sorties** use the same window: each pilot-and-ship pair is an asset card with the pilot layered on,
   no squad row and no fire-support chips.
6. **A few shell rules were added** outside the handoff's §7 (the `.pl-win` width, the soldiers row wrap, the
   blocker's pulse, picker bounds), marked as a build-additions section at the end of `sr-plan.css`.
7. **The old roster column's drag-and-drop** survives only between filled slots; the picker is the path now.
**Needs from you:** calls on (1) and (2); overrule (3)–(7) if you want them differently.
**Your call:** _open_

### C-44 ⚪ Standby and Working; the combat-flow fixes: what I chose
Your notes of 2026-10-07 are built. Where they left a gap I picked:
1. **Standby is the default** for every rebel with nothing to do (new recruits, anyone back from a mission or
   out of training). It has no daily effect: Rest still gives the small daily morale gain, Standby does not.
   Every older save's rebels on Rest move to Standby (Rest was the default; the save cannot tell a chosen Rest
   apart).
2. **They rest when they need to:** a rebel on Standby who is Weary (or Conked) goes to their bunk on their own,
   takes Rest's morale gain, and is back on Standby once fit. I used Weary only, not low morale.
3. **Working** is the tag for a Support rebel posted to their room (the tooltip names the job and room). On the
   map, up to three rebels on Standby walk the corridors and the rest hang about the Barracks (the Command
   Center without one); in the Barracks walk-in they stand among the bunks, labelled Standby.
4. **A stun lasts the round after it lands**, then wears off ("shakes it off"). The concussion itself stays
   untreated, goes home to heal, and Treat wound still clears the stun at once. Free time ends any stun.
5. **Leave gun** puts them back on their own weapons (their primary first, since the Razorrat lives in the Back
   slot, not the hands; you wrote "secondary": say if you want the primary skipped). **Pack up gun** folds a
   field-deployed Razorrat onto their back, ready to set up again. The gunner can do it, or anyone beside the
   unmanned gun with an empty back. The pad's sandbagged gun in Steal the Cross cannot be packed.
6. **Treat wound** with two or more patients in reach asks which one (they ring green); with one it goes
   straight to them. The planned order draws a line, a ring and a cross on the patient with their name; the
   treatment pulses green. If the patient no longer needs it, the most urgent one in reach is treated instead.
7. **Still in combat?** After each round: if no shot was fired, nobody was hit, no grenade is waiting, no rebel is
   bleeding out and no hostile and rebel can see each other, that round is quiet. **Two quiet rounds** in a row
   and time runs free (the alarm stays up, so no sneaking); the first one says so in the log. In free time, the
   moment either side sees the other, it is rounds again.
8. **Open:** alerted hostiles out of contact **hold still** in free time (they do not hunt the squad), and free-
   time **extraction still needs every hostile down** (in rounds, only none near the LZ). Should the Hegemony
   search for the squad, and should the squad be able to extract with hostiles alive but far away?
**Needs from you:** confirm the readings above, and a call on item 8.
**Your call:** _open_


Open: C-13, C-15, C-18, C-19, C-24, C-27, C-28 and C-31; the rest are in the resolved log at the bottom.

### C-47 ⚪ Prologue: readings to confirm, and what I chose building the runner
The prologue is now a script of beats (`game/js/prologue.js`, `docs/PROLOGUE-HANDOFF.md`). Phase 1 plays from New
Game through *Steal Fuel* and stops at the frontier. Readings of the design doc, each with my interim choice:
1. **Other worlds during the prologue.** Relay Kess, Veray Yards and the rest of the map stay visible; scouting them
   and raising Access there are hidden (the `galaxy.beyond` gate) until the prologue ends. Haven Rock and Akkaro work
   as before.
2. **Who gives Steal Fuel.** The doc's summary paragraph has "Wren" giving the tip and the recruit; the numbered flow
   has Cass give the mission and Venn send the recruit. I followed the numbered flow and read "Wren" as Venn.
3. **The fifth soldier on the bunker raid** rides in with the reinforcements, because a Graf seats 4 (phase 5).
4. **`[location name]` in Tachi's line is Akkaro** (phase 2).
What I chose while building it:
5. **The roster safety net waits 2 days** (a placeholder, `SHORT_DAYS` in `prologue.js`): if a prologue mission on the
   board cannot be planned because of deaths or injuries for 2 days, the contact who gave it sends a recruit of the
   missing role (the existing "Cass vouches for them" pop-up). Rebels away on a job or Weary don't count as missing.
   It does not fire while the current beat is itself bringing someone in (Sera, Venn's soldier).
6. **Cass's signals are signals, not comms.** The handoff's action list has `comm` (a character speaks); Cass's Steal
   the Cross, Sera and Steal Fuel offers were signals on his Galaxy node, so I added a `signal` action to keep them
   that way, and a `contacted` event for the guided steps' last step. Venn's recruit line is a `comm` that opens on its
   own after the Steal Fuel burst closes.
7. **A prologue window waits for the day banner** to clear, and for the reward screen and the splash, as the handoff
   asks. If something else is waiting (a New mission card), it can open first; the beat's window follows when it
   closes.
8. **The frontier and the source cap.** Cass and Venn stop being free at the frontier, so a player with other Sources
   by then can be over the cap. Nothing is lost; new contacts wait on standby until there is room.
9. **The test harness** (`#test`) starts at Cass's first contact with every gate open, as an old save does; the
   prologue's own test jumps to each beat instead. **The debug panel** is *Debug: Prologue* in the base's menu, shown
   with `#test` or `#debug` in the address: it shows the beat, jumps to any beat, opens every gate and replays the
   tutorials.
10. **Steal Fuel's four soldiers** are the onboarding job's own spec (`req.team = 4`); the Steal Fuel type still asks
    for three everywhere else.
Phase 2 (Rescue Tachi, the first Agent):
11. **The ambush map and its convoy.** One map for now (M-30): a road across Redrock Flats with rock and wreck cover
    either side, the transport's LZ to the south-west. The holding vehicle is the existing **Riot Transport Cruiser**
    (a driver and a troop bay; its art), escorted by a Police Cruiser and five on foot. The convoy is **halted on the
    road** when the squad arrives rather than driving through in real time; it moves once the alarm goes up or the
    first shot is fired. Nobody can climb into the holding vehicle.
12. **The dash for the edge** (placeholders): the truck drives the road east at 45% of its speed a round (about 200 px,
    so 7 rounds from where it stands); a fleeing truck keeps the fight in rounds even out of sight; off the east edge
    the mission fails. **Destroyed, it stalls rather than blows up** (the prisoner is inside), and its doors, the Work
    point that frees the prisoner, open beside it.
13. **The type's defaults** (placeholders): 3 soldiers, 2 days, Moderate risk, 400 credits, and the freed prisoner joins
    as a Support recruit. No Source offers it yet: only Rescue Tachi uses it (its spec names Tachi as the prisoner,
    skips the recruit and Venn's follow-up line).
14. **The extraction point** is the transport's LZ, as in Rescue Dissident; like it, the hostiles must be down or fled
    before the squad and the prisoner can board.
15. **Tachi as an Agent** has the standard new Agent's file (Tradecraft 15, Cover 70, Rapport 20, Cell 2). Her offer's
    one button reads **Accept**. The Agent rail said "his" and "him"; it now says "their" and "them".
16. **Run Your Network's Step 2** completes when the player clicks Tachi, though the rail opens on her already. Step 5
    opens Recruit; Lie Low and the other operations stay hidden until their own beats (or the frontier).
17. **A save from phase 1's build** still in the prologue loses its generated Agent (save version 13); older saves keep
    theirs.
Phase 3 (someone's asking questions):
18. **"The Intelligence tab opens"** I read as the game moving the player there, after Tachi's and Venn's comms close
    (and after anything else waiting, such as a recruit pop-up). The tense day ends when both comms are closed.
19. **The scripted Lead on Venn** is a real Bureau Lead (it raises Exposure by the usual 4 and his Risk climbs every day
    as any leaded node's does), with no Source behind it. It never goes cold by itself (no Lead does yet); Venn can't
    be Burned before the frontier however hot he runs.
20. **A Source with a Lead** now wears the same Lead badge on the Network an Agent does, and the Lead is listed on their
    rail ("The Bureau holds a Lead on them"). Step 1 points at that badge.
21. **The Lie Low step** points at Lie Low on Tachi's rail; if another node is selected (Exposure, after step 2), it
    points at Tachi first. Its words are `[TEXT NEEDED]` (C-48). Recruit stays open; Lie Low opens with the step.
Phase 4 (getting ready for the bunker):
22. **Cass's bunker offer** is a comm that opens on its own (as Venn's Rescue Tachi offer does), and Raid the Bunker
    lands on the board when it closes; that landing is the beat's "accepted".
23. **Tachi's three pilots** apply from the moment her beat starts (before her comm), so a Recruit already running from
    Run Your Network is the one that brings them; the pointer at Recruit is then skipped. The three are must-take cards:
    no Dismiss, no Decide later.
24. **Timing clash:** Tachi's pilot beat starts with one day of Lie Low left on her cell, and operations wait while a
    cell lies low, so the Recruit she asks for can't start until the next day. Recruit also waits while Run Your
    Network's recruits sit undecided at the Command Center. The pointer shows either way. Shall the bunker beats start
    later, or Lie Low not block Recruit?
25. **Bunks.** The Barracks start with 6 bunks. With Tachi's three pilots (must-take cards ignore the bunk limit) the
    roster is 9, so the mercenary can't be hired until the Barracks grow by two tiles. Nothing tells the player that yet
    beyond the stall's own "no bunks" reason. Do you want spare bunks, fewer must-take recruits, or a line in the hire
    tutorial (C-48)?
26. **Hangar room before the hauler:** a bought Graf needs a free large pad, so the hauler tutorial asks for the Hangar
    room first, then the purchase (the doc lists them the other way round). "Room for 4 starfighters and 2 transports"
    is 2 large pads and 6 pads in all, the second Hangar section's.
27. **The guaranteed lots** (a Soldier mercenary from beat 21, the Graf hauler from beat 22) sit after the six, are kept
    through the restock and Inside Line swaps until bought, and are priced as any lot of their kind.
28. **The plan's pad-space row** reads "Pad space at Haven Rock for 3 stolen ships" and checks the pinned ships fit
    beside the fleet. The pilots row now reads "2 to fly the haulers, 3 for the prizes".
29. **Raid the Bunker** is an authored Steal Ship (3 ships pinned: FT-4 Cross, 2 SF-11 Talons; 5 soldiers; Akkaro,
    Redrock Flats). The Steal Ship type defaults to one SF-11 Talon and 3 soldiers.
Phase 5 (Raid the Bunker): items 30 to 37 are settled; see "C-47.5" in the Resolved log.
**Needs from you:** confirm 1 to 4; answer 24 and 25; overrule any of the rest.
**Your call:** _open_

### C-50 🟡 Fire support menu and Black Market cards (screens handoff part 3): what I chose
Built from the canvas you approved on 2026-10-08:
1. **Fire support menu**: calls grouped by source (the transport, any other ship, Mission Control, vehicles); each
   row has the call's colour, its timing, "Indiscriminate" where it hits our people too, and a footprint of how it
   is aimed. A called one stays listed with its status ("Inbound · next round", "Overhead · 1 round left"); spent
   ones drop off. While sneaking, the loud calls show locked with the reason in their tip. The full rule sits in a
   tip beside the row (`data-tip-right`, new in `sr-hud.js`).
2. **Door Gunner Cover works every enemy in its zone** (the cap of 3, or 5 with Saturation, is gone), for 2 rounds
   (one pass per round, as before). Saturation's rule now reads "The door gunner's zone is half again as wide;
   strafing blasts are wider." Confirm that wording.
3. **Heavy Bombardment hits at the end of the round**: marked when called (a dashed orange ring and BOMBARDMENT on
   the map), resolved in `fsRoundEnd` before the door gunners fly.
4. **Black Market type colours** (a proposal you approved): Weapon rebel red, Armour steel, Gadget green, Mercenary
   psi purple, Vehicle fuel pink, Ship shield cyan (keeps a Rare tag in its band), Ship weapon hazard orange.
5. **The lot pop-up** replaces the command bar in the Black Market: stats, Buy/Hire and Buy all (only for a lot of
   two or more), and the reason a lot can't be bought, beside the picked card. Keys 1 and 2, Esc and a press off
   the cards work as noted on the canvas.
**Needs from you:** confirm Saturation's wording and the type colours. *(The Arsenal is settled: no command bar out of
combat, its buttons in the dossier: C-33.7.)*
**Your call:** _open_

### C-51 🟡 0.2 playtest: decisions and readings
`docs/FEEDBACK-0.2-HANDOFF.md`, the designer's playtest of release 0.2. Each with the interim choice:
1. **The ambush's prisoner rides in the truck** (`heldIn`, kept on the truck by `vehSync`): not drawn, not in the
   squad rail, not targetable, out of every blast, and not a seat (the alarm's deployment and a destroyed truck never
   throw her out). Working the doors frees her there, and she joins the rail as the escort.
2. **No cinematic moves a prisoner.** Rescue Tachi's stays in the truck, unseen. *Reading:* Rescue Dissident's
   prisoner and Steal the Strider's Strider stay visible **in their cell or yard** during the cinematic (they are
   held there, not walking out with the squad), rather than hidden.
3. **Before release, the prisoner is in the objectives panel** through the type's own line, "Escort {npc} to the
   extraction point", which already names her. No new line was needed.
4. **The board:** a mission whose prisoner doesn't join (Rescue Tachi) shows no recruit chip for them; one whose
   prisoner joins keeps it.
5. **Enemies hold only from cover.** In range and in the open, a unit moves to cover first, then fires; a riot
   shield counts as cover. Closing in is worth at most `AI_ADVANCE_CAP` to a spot, and a spot in the open and in the
   target's sight and range loses `AI_EXPOSED` (C-52). The ambush map's props were left as they are.
6. **Ambush guards escort the truck:** their guard point is the holding vehicle wherever it has got to.
7. **Base tutorials are side beats** (`SIDE` in `game/js/prologue.js`) that fire when the room becomes relevant: the
   Barracks when the bunks are full, the Infirmary at the first injured rebel, the Workshop at the first ship home
   damaged. *Reading:* the Storeroom, Intelligence Center, Training Hall, Tech Lab and Diplomatic Quarter get none for
   now. Side beats fire before and after the frontier, and as early as BASE ESTABLISHED (an injury on Take the Rock
   fires the Infirmary's, which then waits behind Raise Cass).
8. **Who goes first.** A main beat's tutorial always goes first: a side tutorial waits, or is held while one runs.
   *Reading:* the handoff says one side beat at a time; I kept that, but one that comes due sets aside a later one in
   `SIDE` order that is still running (its tutorial comes back once the earlier one ends). Without it, a Workshop the
   player can't afford holds up the Barracks: on a normal run the Cross comes home damaged from Torch the Depots (beat
   8), so the Workshop fires before the Barracks (beat 10).
9. **Where the steps point.** The Base tab (or the room view's way out) if the base map isn't up; if there is no free
   floor, a rubble tile and **Excavate**, then **Advance day** while it is dug; the free floor tile; **Build** on the
   room's card (the pop-up scrolls to it once); then for the Barracks **Advance day** and a card on the Barracks
   about the Bunks upgrade (on the upgrade itself if the player is inside the room), and for the Infirmary and the
   Workshop the card right after Build, on the room being built. *Reading:* the Barracks' tile is the free floor beside
   it nearest its middle; the Infirmary's and Workshop's is the free floor nearest the Command Center. A step is
   skipped while the player is already past it (on the base map, the tile open, the room building).
10. **A side beat's `until` met early** (the player built the room before the tutorial got there): the tutorial skips
   to its closing card. If its tutorial had not started yet, the side beat ends without it.
11. **A ship home damaged** is one below 100% hull that has flown (a mission, a patrol, or as a ground mission's
   transport): `f.flown` on the ship. *Reading:* a ship that arrives damaged (the Cross at 85%, captured Talons, the
   Marta at 70%) counts only once it has flown. The ground scene doesn't damage the transport, so the Marta counts the
   first time she is home from a mission (Steal the Cross) still under 100%.
12. **Sleeping rough.** A story (`must`) recruit still joins with no bunk; whoever is over the cap, newest arrival
   first (by the day they joined, then roster order), is *Sleeping rough*: the status shows in the crew rail and the
   personnel file, the Barracks shows *Bunks 7/6*, they rest off exhaustion at `ROUGH_REST` speed, and it is worked
   out each time it's needed (no save field). *Reading:* "morale −`ROUGH_MORALE` a day while anyone is sleeping
   rough" costs **everyone at the base** (each rebel, so the base's mood drops by the same), not only the rough
   sleepers; anyone away on a mission is spared, as for every daily morale change.
13. **A side beat's actions open nothing over the day banner**, but one that opens nothing (starting a tutorial) no
   longer waits for the banner to clear, so a reward queued behind it isn't held up either.
14. **Developer tools.** The Prologue panel lists the side beats with their state and *Fire now* (which sets aside one
   already running). *Replay tutorials* resets them. *Reading:* a debug Jump spends any side beat whose condition
   already holds once the setups have run (a jump to beat 20 has nine aboard and six bunks), as the setups mark the
   tutorials they skip as seen; *Fire now* plays one.
15. **Saves (version 15).** A save past the frontier has every side beat spent; otherwise one is spent if its room is
   there or being built (the Barracks: more than the two tiles a new game has). A ship has flown unless it is the
   Marta before Steal the Cross.
16. **Salvage:** a Hegemony vehicle (one that started on the Hegemony side) destroyed or stalled in a ground mission
   pays `SALVAGE_PER_HP` × its max hp in materials, rounded to 10, as a *Salvaged* row in the debrief. *Reading:* only
   when the squad wins (they hold the field to strip the wreck); a loss pays none. In Rescue Tachi that is the
   prisoner truck (stopping it brings it down) and the escort cruiser.
17. **Authored rewards** sit in each prologue mission's spec (`PRO_REW` in `game/js/prologue.js`), never in its type.
   *Reading:* a spec's `rew` is **added** to what the type pays (Steal the Cross still pays its 500c and 120s).
18. **The prologue Graf** (the guaranteed lot in beat 22) costs `PRO_GRAF_PRICE`, with Sweet Tooth's line on it
   (`grafFriend`, `[TEXT NEEDED]`); after the frontier a Graf is `SHIP_PRICE` again. Graf lots the weekly restock rolls
   keep the full price.
19. **The affordability net.** A beat whose `until` needs a spend declares `needs` (worked out from the real prices:
   `proCost` in `base.js`): `room_barracks`, `sweet_tooth` (the mercenary, and the Bunks upgrade while no bunk is free),
   `hauler` (the Hangar section with its excavation, and the Graf). After `AFFORD_DAYS` days unable to cover it, its
   contact (Cass for the market beats, Venn otherwise) sends the shortfall plus 10% (rounded up to 10) in a comm
   (`affordGrant`, `[TEXT NEEDED]`), paid when the comm closes. Once per beat, only before the frontier, through a new
   `grant:{c,m,s}` action.
20. **The net also covers the Marta** (beat 6, `cross`, from Cass). *Reading, beyond the handoff:* a player who spends
   the starting 400 materials on rooms before restoring her can never fly Steal the Cross, and nothing before it pays
   materials, so it was a hard lock. The spendthrift run found it.
21. **Where materials come from:** a disabled build or buy short of materials adds a second line to its *Need X more*
   reason (`MAT_HINT`, `[TEXT NEEDED]`).
22. **Hangar repairs eat materials.** Damaged ships repair on the pads every day at the materials' cost (the Marta's
   70%, the Cross's 85%), about 8 a day early on. The ledger counts it; nothing tells the player.
23. **Open: the second Hangar section.** The map has no free 4 × 4 floor: the cheapest block (`hangarPlan`) has 12
   rubble tiles to excavate first (480 materials, a day), on top of the section's 960c and 800m, and one of its halves
   must be made a large pad (free, in the Hangar's room view) before the second Graf can land. The handoff's cost table
   left the excavation out. The ledger and the net count it, and the rewards (C-52) cover it, but the hauler tutorial
   (beat 22) has no step for excavating or for the large pad.
24. **The news feed on the Black Market and the Arsenal** hides (both views sit over it, as the Galaxy's panels sit over
   the feed; on a phone the market's feed was already hidden). Purchases still say so in Sweet Tooth's line and the
   lot pop-up. *Reading:* hiding it, rather than lifting the stall's bottom clear of it, keeps the stall's height for
   the cards.
**Needs from you:** overrule any of the above. For item 23: should the block beside the Hangar start cleared, should
the hauler tutorial gain steps for excavating and for the large pad, or both?
**Your call:** _open_

### C-54 🟡 CD playtest (8 Oct): UI rules, feedback gaps and bugs for future triage
From the creative director's first playthrough, 8 October 2026 (the transcript is on the project). Logged
unactioned at the designer's request, to work through later. The core-gameplay feedback itself is handled
elsewhere (the *Space Combat Core Redesign v0.1* doc and `docs/archive/ARENA-HANDOFF.md`); these are the smaller items
around it.

**Decisions to make:**
1. **Two classes of message, nothing in between.** The CD's rule, from the "Move out" tip he clicked past and
   immediately forgot: *learning* content stays front and centre until the player has done the thing, so it can be
   referred back to; a mere *tip* sits out of the way with a dismissible "Got it". The guided stepper already works
   this way (steps persist until their `until`); the one-shot toasts in Take the Rock predate it. Decide: adopt as
   a written UI rule and sweep the old toasts into one of the two classes.
2. **The ground planning phase doesn't say what you can't do yet.** He selected a unit and tried to shoot; nothing
   says attacks come in a later phase, and the round structure (orders → execution → attacks by initiative) is
   never taught — his words: "is it like Warhammer…?". Needs a phase indicator and/or a line in the planning text.
   (Space's phases dissolve in the v2 sim; ground keeps its phases for now, so this is a ground fix.)
3. **Enemy overwatch needs a tell.** "They're shooting me, that's not fair": a holding enemy's overwatch hit him
   before he knew the mechanic existed. A visible brace pose or cone on a unit in Hold — the doctrine-tell
   principle applied to ground.
4. **The mission briefing layout.** The designer's own note on the call: "the briefings on the right… that needs
   to change layout a little bit." No direction chosen yet.
5. **Stealth and the searchlights.** The guards are twitchy, and the designer is "very much considering changing
   how this works because it's not a very important part of the game". The rework (or cut) is undesigned.

**Feedback gaps (cheap wins once prioritised):**
6. **Dramatic wins go unremarked.** After the all-or-nothing escape — the session's best moment — the end screen
   said nothing: "no word on like, hey, well done." The debrief can detect a narrow win (hull remaining, a
   final-round kill against the odds) and say so in one line. `[TEXT NEEDED: debrief flourish for a narrow win]`.
   The Arena's per-exec metrics (`docs/archive/ARENA-HANDOFF.md` §7) will make "dramatic" detectable for the v2 sim too.
7. **Ground impact effects.** The CD noted the missing hit feedback while watching shots land.
8. **A flavour-text audit.** Lines neither of us designed crept in (the "Unregistered freighter" footer on Cass's
   first comm was the example on the call). One pass of comm/briefing/HUD text against `docs/TEXT.md` so every
   player-facing line is designer-owned.

**Bugs seen live (current campaign code; the Arena's v2 sim is unaffected):**
9. **The revenge shot after the win.** When the mission-ending kill lands mid-ATTACK, the rest of the attack queue
   still resolves and can kill the player after victory — it nearly did, and the designer said on the call it
   "probably should be removed". Fix: once the win condition is met, drop the remaining hostile attacks.
10. **Lock-on refused when it looked legal** (~33:00 in the transcript; the designer: "that's a bit strange").
   Unreproduced; check `inLockZone`'s range and arc against what the UI implies at that moment.
11. **Two onboarding hiccups on the CD's run:** the restore-the-Marta prompt didn't fire when expected, and the
   plan-mission lockout caused by an injured rebel surfaced no reason — the lockout was correct, the *why* wasn't
   shown.

**Needs from you:** calls on 1–5; 6–11 need only a priority — each is buildable as written.
**Your call:** _open_

### C-74 🟡 High Command visual pass round 2: lasers need a weapon, and the readability placeholders
The space FX pass (`game/art/sr-space-fx.js`, `docs/art/HC-VFX-HANDOFF.md`, the guide at
`docs/art/space-fx-guide.html`) is art only — nothing in the sim changed. Three things for you:

1. **Lasers have art but no gun.** You asked for laser shot effects beside the ballistic ones. The art kit now has
   two laser projectile styles (`PROJ.shiplaser` warm, `PROJ.heglaser` cold — drawn as a coherent beam-dart, not a
   tracer) and the renderer path for them, but no weapon in the game's data fires them, so in play nobody lasers.
   **Your call:** which ships or weapons (if any) switch to lasers — a new weapon row, or a variant on an existing
   one. Until then they show only in the style guide and the stress scene.
2. **The hurt read's thresholds are placeholders you named once:** smoke trail at ≤ 25% hull, fire + smoke at
   ≤ 10% (`TUNE.trailSmokeAt` / `trailFireAt`). Confirm or move them.
3. **The death spiral is visual-only and its odds are a slider** (`TUNE.spiralChance` 0.5, `spiralSecs` 2): the sim
   still kills, scores and floats SPLASH at the real moment of death; the corpse's careen-then-boom is theatre after
   the fact. If you ever want the spiral to matter (a ship that can crash into others), that's a sim feature, not art.
4. **Claude Code's C-73 item 6 (booms grow with the icon boost): agreed and kept** — the round-2 kill paths
   (the spiral corpse and its end boom) carry the same boost.

*Wired into the map (Claude Code, `game/js/arena-hc.js`):*

5. **The hurt read uses the real hull fraction.** Every ship's view carries `hullFrac`, on the map and in the camera
   tiles, so the old stage-based smoke no longer runs in High Command. Its two panel sliders are gone; the new
   numbers are in the panel's FX numbers (smoke and fire thresholds, smoke rate, spiral chance, length and tumble,
   laser length).
6. **A kill hands the spiral the ship's heading and speed**, so the corpse carries on along its real flight. The
   sim's SPLASH and the scoring stay at the real moment of death.
7. **The lock marks replace the brackets** while the pass is on (the flat look keeps the old brackets). Your locks:
   gold arcs turning while they build, still gold ticks and a diamond once held, with the red LOCK word under them
   as before. A full lock used to turn the brackets red; it's gold now, as the artist's rule says (gold is the
   player's). A Hegemony missile lock on your ship now draws a hazard mark round it as well as the ⚠ LOCK text. The
   pop ring at the flip runs on game time, so it waits while paused; a lost lock pops again when it comes back.
8. **Two small fixes in the module, for the artist to review.** The spiral's end boom kept the icon boost for its
   debris. A spiral is now the last effect dropped when the one-shot list is full, since dropping it would lose the
   explosion it owes.
9. **At High Command speeds the smoke trail reads as dots.** A ship at about 540 a second, puffing 9 times a second,
   drops a puff every ~60 units: at zoom 0.45 that's a dotted line, not a ribbon. Raise "Smoke trail puffs /s" on
   the panel, or the artist could space the puffs by distance flown rather than time.
10. **Lasers**: nothing to wire until a weapon fires them (item 1). A sim weapon mapped to `shiplaser` or
    `heglaser` will draw as a laser with no renderer change.
11. **Tests**: `tools/arena-smoke.js` V1 round 2 checks the hull fraction on the view, the spiral's heading and speed
    and its end boom, and the lock marks (turning while building, held with the pop once locked).

### C-82 🟡 Type 3.5 playtest 2: what I chose building it
`docs/ARENA-HC35-FEEDBACK-2.md` (your notes and what the flight record showed), phases L1 to L6.

1. **No replay on a re-render (L1, note 1).** Every pick rebuilds the planning window, and the kit's window style pops
   in whenever one appears; 3.5's window now only animates when it opens, steps forward or back, or folds into
   the beam. A re-render also keeps each scrolled pane where it was.
2. **The rewards (L1, note 1.1)** are a first pass, in the campaign's own resources, shown on each primary's card as
   *Pays* and *Accomplished* (the bonus for doing the primary you picked, not a fallback: L3). Placeholders, on
   `PRIMARIES` in `sim-hc35.js`:

   | Primary | Pays | Accomplished |
   |---|---|---|
   | Steal | 250 credits, 120 materials (the hull), + 25 supplies a container aboard | + 200 credits |
   | Pirate | 150 credits, + 30 supplies a container handed over | + 150 credits |
   | Strip the Cargo | + 40 supplies a container hauled home | + 100 credits |
   | Destroy | 300 credits (the bounty) | + 100 credits |
   | Crash | 300 credits, 2 intel (it looks like an accident) | + 200 credits |
   | Tag and Track | 4 intel, a follow-up lead | + 150 credits |
   | Ambush the Responders | 100 credits, + 60 credits a response kill | + 150 credits |
3. **Window 1 in two parts (L1, note 2):** part 1 the primary, part 2 the secondary objectives (Next and Back walk
   the parts; two pips on the track's first node); the rules of engagement are window 2. The track reads
   Objectives · Rules of engagement · Wings & assets · The plan.
4. **The retreat (L2, note 3.2)** outranks everything a wing is doing and High Command's own ladder (its rules and
   emergencies): Retreat, Abort, or a wing's order turning to Withdraw, and the ship flies straight for the jump
   point. Only a panicking pilot is beyond it. On the way it still dodges hostiles, but only sideways, at half the
   push (`RETREAT_SIDE` 0.5: the panel's new Wings group): never back toward the fight. 3.5's jump point is 1,000
   across (`JUMP35_R`) where High Command's is 350: a fighter flying home at full speed turns 780 to 970 wide, so it
   flew through High Command's point and looped round, which is the "flying off in other directions" you saw.
5. **Hold for My Signal ends (L2, note 3.1)** for a wing that's fired on, for good (it was 3 s of firing back, then
   waiting again), and for every wing when the alarm goes up; a reserve arriving after the alarm comes in released.
   Each is a leader's decision: a line from the leader, a feed entry, and the log the debrief will show (L3).
6. **Self-defence (L2, note 3.1):** a ship waiting, holding, holding off to board or haul, keeping out of sight or
   intimidating turns on whoever is shooting at it (the one that hit it in the last 2 s, `DEFEND_HIT`, else the
   nearest with guns on it in range), without being told; the freighter's point defence doesn't count. High
   Command's attack and escort orders already did this. A wing with nothing to do also takes on any hostile within
   3,500 (`HOLD35_R`, as Hold does).
7. **Falling back (L3, note 3).** A primary that can no longer be done falls back to the first in its family that
   still can, once a mission: Crash → Destroy; Destroy → Crash; Steal → Strip the Cargo → Pirate; Strip → Steal →
   Pirate; Pirate → Strip → Steal. Tag and Ambush have no family to fall back on. "No longer" is the old failure
   checks plus two new ones: a Crash with no bombs left anywhere (the reserves counted) and the freighter's engines
   still up, and a Steal with no boarding party left before it's aboard. "Still can" is: the freighter alive, not
   jumped or ours, and what the job needs still flying (bombs, a boarding party, cargo pods), or already done (a
   Crash that blows up in space is a Destroy, done). The leader of the first wing in the field calls it; every wing
   then takes the job its ships can do for the new primary (`fieldExec`: bombs go for the kill or the engines,
   boarders board, haulers haul, the rest keep the escort busy or cover the wing at work). The HUD shows the old
   primary failed and the new one as FALLBACK; the debrief stamps PARTIAL.
8. **The fallback's reward (L3, note 3):** the reward of the primary it ended on, never the Accomplished bonus,
   which only the primary you picked pays. The debrief shows what you earned and the bonus you missed.
9. **The leaders find work (L3, note 3.1):** a wing whose Executive is done or impossible, with no Secondary waiting,
   takes the primary's job for its ships, else the escort, else covering a wing still at work, and says so; with
   none, it holds, and looks again every 5 s (`IDLE_LOOK`). A Hold you ordered stays a Hold.
   Found on the way: a Board or Haul wing's other ships flew close cover on their boarder or hauler and counted
   the freighter itself as the threat to it, crowding it off its dock; they now stand off while it docks and only
   go for real threats. No fallback once you've sounded the retreat or aborted.
10. **How your leaders played it (L3, note 3.3):** every call a leader made on their own (going without the signal,
    the fallback, a new job, a Secondary taken up, holding or going home, a request they answered because you
    didn't, the retreat acknowledged), with the time and why, a column a wing in the debrief, in the feed as it
    happens, and in `tools/run-report.js` and the metrics record. The layer's `SIM_VERSION` is `hc35-5` (`hc35-6` from L4, `hc35-7` from L5).
11. **Every ship's subsystems (L4, note 4):** every ship but the freighter (yours and theirs, the response and the
    reserves too; not the ram, the tug or the pirates) has its engines aft, its guns fore and, if it's shielded, a
    shield generator amidships, each with a share of its hull's points (`SUB_ENG` 0.35, `SUB_GUN` 0.3, `SUB_SHD`
    0.3: the panel's new Subsystems group). Fire aimed at one (Mark Priority Target or Call a Pilot by Name: Focus,
    picked on the subsystem's ring) puts all its hull damage into the subsystem and half into the hull
    (`AIM_SUB` 1, `AIM_HULL` 0.5): a ship you disable lives. Any other hit spills a quarter of its hull damage into
    the engines (from behind) or the guns (from ahead) (`SPILL_SUB` 0.25), so a furball rarely knocks one out first.
    Down: **engines**, it limps (High Command's two engine criticals and its control-surface one: slower, no hard
    turns) and can't boost, drift or K-turn; **guns**, it can't fire, missiles included; **shields**, they drop to 0
    and stay there, and Boost Shields is off. A callout and a feed line say so; a pilot told to take one out stops
    once it's down and says so. Inspecting a ship shows its schematic with the three in their health colours (a ✕
    when down) above its bars; its rings show on the map, and on whichever enemy is under the cursor while a power
    picks. Your pilot's panel lists theirs once one's hit.
12. **The drift (L5, note 5)** is now a slide inside a turn, not its own manoeuvre. High Command's Drift flipped the
    nose round onto whoever was behind (up to 180°) and flew on backwards for 3 s, and a pilot used it every time
    they withdrew with something behind: that was the odd look and the spam. In 3.5 a pilot drifts in a turning
    fight: with its target within 1.6 × gun range (`DRIFT_REACH`), 34° to 126° off the nose (`DRIFT_OFF_MIN` /
    `DRIFT_OFF_MAX`) and the speed to slide on (over corner speed × 1.05, `DRIFT_VMIN`). For 1.4 s (`DRIFT_SECS`)
    there's no new thrust, the line of flight turns at 45% of its rate (`DRIFT_TURN`: it carries on wide) and the
    nose swings up to 69° off it onto the target (`DRIFT_NOSE` 1.2 rad), so the guns bear early: about a second of
    fire a turn couldn't give. It costs speed (a Cross from 720 to about 520, near its corner speed) and then 14 s
    (`DRIFT_CD`) before the next. It's never used to run. All on the panel's Wings group. High Command keeps its own
    Drift (its hashes are unchanged). Who can drift is still the pilot's skill: of your ten, only Hale (a veteran);
    none of theirs.
13. **Plasma (L6, note 6).** Every gun in 3.5 was the BLS-T Light Repeaters (the database calls them plasma, but
    they fly as a stream of laser bolts). Now your four Talons carry a **PX-4 Plasma Cannon** in place of their
    repeaters, and the response's Pursuer drones fire their pulse cannon as plasma: 2 bolts a burst (`PX_BOLTS`,
    where the repeaters fire 8) at 0.45 × a repeater bolt's speed (`PX_SPD`), carrying the burst's damage between
    them × 1.3 (`PX_DMG`: slow bolts miss more, about 26% of them to the repeaters' 45%, so it comes out about even
    a second), +0.12 critical chance (`PX_CRIT`), 0.85 × the reach (`PX_RNG`). On the map each bolt is a glowing
    orb with a short smeared tail that throbs, warm (Fightstar orange) for yours, violet for theirs. The panel's new
    Plasma group. The weapon's name and numbers are mine; the Crosses, the Brickbats and the Motes keep their
    repeaters. The layer's `SIM_VERSION` is `hc35-8`.
14. **Requests whose reason has gone are withdrawn (after playtest 2, your second record).** An open request is
    checked every tick: if what it asks about no longer holds (the freighter that's hailing is dead, the ship to chase
    is gone, the distress call is cut, the wing that was "getting nowhere" is moving again) or the job's settled or
    called off, the card shows *Withdrawn: no longer needed*, the pilot says "Never mind, Base." and nothing is
    applied. A hurt pilot's request and a pod pick-up outlive the job. The stuck guard ("We're getting nowhere. New
    orders?") only counts while a wing is free to act: not while it holds for your signal or the reserves, which is
    what you got in Phase 1. And once the job's settled or called off, no wing takes up its Secondary (Dagger did at
    3:06, after "Everyone home"). Found on the way: a wingmate's bump counted as being fired on, so a wing holding
    for your signal could go in on its own; only a hostile's shot counts now. `SIM_VERSION` `hc35-9`.
15. **Boarding, the engines and the power plant (your notes after playtest 2).**
    - **Boarding doesn't need her stopped.** A Boarding party or Cargo pods closes on a ship under way (the slow,
      careful two-leg approach, matching her speed) and clamps on: it then rides with her, moving only as she
      moves, still a target (her point defence and escorts can hit it) but helpless: it can't fire or use an
      ability. Only a ship of size 10 or more can be boarded (`BOARD_SIZE`: the FL-400 is 10). A ship with a hangar
      (`hangar` on its class: none yet; the FL-400 hasn't one) takes the boarder inside: out of sight, and nobody
      can target it while it boards. Steal now reads "Board her (a slow, careful approach…), then fly the prize
      out" and needs only the boarders; Strip the Cargo the same with the haulers.
    - **Engines out, she crawls on her thrusters**: a quarter of her cruise (`THRUST_SPD` 0.25), turning at 0.6 of
      her rate (`THRUST_TURN`), still on her course; she can't jump (not at the lane's end, not let go after a
      surrender), and the planet doesn't take her.
    - **The power plant** (90 points, `POWER_HP`) is buried in the hull until it's under 80% (`POWER_SHOW`): then it
      shows (a callout, the card, its ring, the schematic) and can be aimed at. Knocked out, she's **dead in
      space**: no point defence, no distress call, she drifts, and inside the pull she falls. That's the new Crash:
      the leaders' plan takes the engines out first (so she can't run), then goes for the power plant (Disable has
      a Power plant choice, first in the list); a fallback to Crash picks whichever's next. "No bombs left" only
      ends a Crash before the power plant shows: once it does, guns can finish it.
    - **Hove to** (a surrender), she holds station on her thrusters instead of drifting into the planet.
    - The plasma takes your slider settings as its defaults (2 bolts, 1.5 × a repeater bolt's speed, 1.3 × the
      damage, no extra critical, 0.7 × the reach) and draws as a classic blaster bolt: a long glowing streak with a
      white-hot core, red for yours, green for theirs. `SIM_VERSION` `hc35-10`.
16. **From your Steal run (seed 741944).**
    - **No Hegemony in Phase 3:** that opportunity rolled **Remote** (it was in the briefing): the distress call got
      out, but nobody was near to hear it, so no response was ever coming. What misled you was the phase plate:
      the moment the job was done it went to "Phase 3 · Response" anyway. Phase 3 is now the response arriving and
      nothing else; a settled job only sends everyone home, and the clock keeps counting the response down.
    - **The prize ran off fast, engines blown:** the prize crew flew her home at 160 a second (three times her
      cruise) and turned at 0.25 rad/s, whatever her state. Now, once she's ours, **the prize crew repairs what's
      broken**, the power plant first, then the engines (40 s each, `REPAIR_SECS`, back to half their points,
      `REPAIR_HP`): until then she crawls on her thrusters and can't jump, even at our jump point; then she makes
      her cruise (`PRIZE_K` 1 × it, easing into it), turning at 0.08 rad/s (`PRIZE_TURN`, the alarmed freighter's
      rate). The clock reads "PRIZE: ENGINES 45%" while they work; "ENGINES BACK ONLINE" when it's done.
    - **The Brickbat out-turned by the freighter:** that was the prize's 0.25 rad/s, a 140° swing in 10 s, wider
      Brickbats circling her. The freighter now never turns faster than 0.08 rad/s (0.05 on thrusters); a Brickbat
      turns 0.4 to 1.7. Its own handling is unchanged.
    - **Plasma toned down:** your sliders put a Talon's plasma at 63% of bolts landing and about a quarter more
      damage than the repeaters. The defaults are now 1.2 × a repeater bolt's speed (from 1.5), 1.15 × the damage
      (from 1.3) and a new scatter, 1.6 × the repeaters' (`PX_SPREAD`): 52% landing, a little above the repeaters'
      damage. `SIM_VERSION` `hc35-11`.
17. **From your Steal run (seed 248991).**
    - **She jumped out mid-boarding, far from her jump point:** at 0:14 the crew hailed ("they'll dump the cargo if
      we let them run"); you didn't answer, Sera took the deal by default at 0:26, and when the hand-over finished
      at 0:46 the freighter was let go and spooled its jump where it was (8 s): gone at 0:54, with Mags still clamped
      on, 23 s into boarding. Now a released freighter runs for her jump point like any other (Quick Jumper aside,
      which spools anywhere already): the boarders keep their chance.
    - **The hail's default** was the leader's temperament unless you were flying Pirate; it now serves the primary:
      Steal *Demand the ship*, Destroy and Crash *No deal*, Pirate and Strip *Take the cargo* (Tag and Ambush, the
      leader's temperament). One cost: a refused Demand means she never heaves to, so a boarder chasing her on
      thrusters takes longer to clamp on (97 s from 2,500 off in the test, against 47 s when she stopped for the deal).
    - **A crew that gives up the ship** (Demoralised, Demand the ship) was made our prize but stayed hove to, forever:
      the "hove to" step came before the prize crew's. The prize crew flies her home now. Re-flying your run, the
      Demand lands at 0:24 (that crew was Demoralised) and the Steal is done at 1:33.
    - **Missiles fired blind:** they weren't. Replaying your run, six were fired, each at a 65 to 100% lock: the
      escorts' chaff drew four off (it took every missile within 3,000, every time), a hard break shook one (a 60%
      lock is shaken 40% of the time) and one hit. A missile pulled off flies to the chaff cloud or straight on, which
      reads as dumb-fired. In Type 3.5 a missile now waits for a full lock (`MIS_LOCK35` 0.95; High Command keeps its
      60%), so a break can't shake it, and chaff draws one off `CHAFF35` × (1 − `CHAFF_LOCK35` × its lock): half the
      time at a full lock. The new panel group *Missiles* has the three. `SIM_VERSION` `hc35-12`.

**Your call:** confirm, and tune the rewards

### C-83 🟡 Type 3.5 playtest 2: readings to confirm
1. **"Secondary objectives"** is your word for what the game called the optional objectives; part 2 now uses it.
   The plan's per-wing *Secondary* orders (window 4) keep their name: say if one of them should change.
2. **Spotted means go.** I read Hold for My Signal as a stealth rule: once they know you're there, nobody waits.
   Say if you'd rather the wings kept holding after the alarm until your signal, firing back only when hit.
3. **A panicking pilot is the one exception to a retreat.**
4. **The fallback stays in the family**, as you said: a Steal whose freighter blew up doesn't become a Destroy, and
   if the crew have surrendered (they're hove to, and you hold fire on them) a Crash can't become a Destroy, so it
   fails. Say if a leader should be able to cross families ("if we can't have her, nobody can").
5. **One fallback a mission**, and it's automatic: no request card, no command point. Say if you'd rather be asked.
6. **Only you aim at a small ship's subsystems.** Your leaders don't pick one on their own and the Hegemony never
   aims; the spill is what everyone else does to them. Say if a leader should (crippling a fast escort's engines,
   say), or if the Hegemony should go for your guns.
7. **Only veterans and aces can drift**, as in High Command (Hale, of your ten; none of theirs). Say if more of
   them should, now that a drift is a fighting move.
8. **Which ships carry plasma** is my pick (your Talons, their Pursuers), and so is the PX-4's name: say which
   ships should, and whether plasma should do something the repeaters don't (burn through shields, say), beyond
   hitting harder and slower.
9. **Hauling doesn't need her stopped either**, by the same reasoning as boarding; and **no ship has a hangar
   yet**: say which (the FL-400? a bigger Hegemony ship later?) and where it sits on the hull.
10. **Crash is now two jobs** (engines, then the power plant in the pull), which takes more bombs: in my runs three
    Brickbats often ran dry and fell back to Destroy. The power plant's 90 points and the 80% are yours to tune.
11. **Plasma's colours:** red for yours (the colour law's "ours", and the films'), green for theirs (the films'
    Empire; it's also the HUD's "good"). Say if theirs should be blue or violet instead.
12. ~~Only the prize crew repairs~~ Decided: only the prize crew (Resolved log, C-83.12).
13. ~~The hail's default for a Steal is Demand the ship~~ Superseded by playtest 3: Take it primaries take the cargo (Resolved log, C-88).
14. **Missiles wait for a full lock in 3.5**, and fire less often for it (a lock fills in about a second). Say if
    you'd rather keep High Command's 60% and make chaff and breaks rarer instead.

**Your call:** confirm (items 2 and 4 especially)

### M-22 🟡 Galaxy view follow-ups from the handoff's own open questions
1. **Locked and uncharted worlds don't dive in** — they open the docked panel at galaxy level, as the handoff
   ships it. Its proposal (dive in shrouded) waits on you.
2. **Missions without a `region`** (e.g. Akkaro Garrison Raid) fall back to the world's first settlement for
   markers and the region card's Local job. Adding `region` to `MPOOL` entries makes placement exact.
3. **The phone World view** uses the provisional layout (planet on top, panels as a bottom sheet, minimap
   hidden) and needs its own design pass.
4. **The Missions view** is built (the screens handoff's §4, C-37): the region card's "+n more" link and anything
   else that opened the old Missions window now opens the Missions tab.
**Your call:** _open_

### M-4 🟡 Revive and rescue in space
**Blocks:** Failed to Save [B]; the space half of Saved/Owes a Life.
**Why:** ground combat has Treat Wound and rescue credit. Space has nothing similar: a shot-down pilot is lost.
**Needs from you:** is there a window to save an ejecting pilot (a wingman covering, a tow)? Does it cost an
action, and what does a failed attempt do (the trait fires on a failed rescue, or whenever an ally dies in reach)?
**Your call:** _open_

### M-8 🟡 Boarding theatre
**Blocks:** Marines doing anything a Soldier does not. Marines exist as data (a ladder, a gear set, the dossier),
but no scene needs them and no recruit is ever a Marine.
**Needs from you:** is boarding in Level 1? If so, a brief (round structure, objectives, how it differs from
ground); if not, confirm Marines stay data-only.
**Your call:** _open_

### M-11 🟡 Pilot critical injuries and space-side gear
**Why:** only ground fighters roll critical injuries. A cockpit breach in space gives a concussion; nothing else.
Gear slots only matter on foot; fighters have loadouts from the database but pilots carry nothing personal.
**Needs from you:** should pilots roll injuries from hull criticals? Which of the 12? And should a pilot's
gadgets matter in space?
**Your call:** _open_

### M-39 🟡 The opportunity system beyond the demo
`docs/OPPORTUNITY-SYSTEM.md` §7. These wait: the campaign's Sources creating opportunities from cast templates (**decided**,
decision 5: S7 builds it, Intercept Transport and Tanker Grab first); ground
missions on the grammar (an adapter for squads, beside space's); the opportunity editor (a designer's view of the
derived primaries and order menus as a cast is edited).

### M-36 🟡 Type 3.5: what waits for systems that don't exist yet
Built for the Arena only; these wait:

- **Campaign wiring**: Sources creating opportunities (with their detection levels), Intel and Exposure as campaign
  resources (the dossier's Intel is an Arena-only budget), Leads from Firebrand Broadcast and witnesses, burned Agents.
  **Decided** (the switch, decisions 5 and 11): S6 and S7 build all but burned Agents.
- **The other target types** (Person, Place, Ship) and the follow-up opportunities Tag and Track would create (the
  debrief names them only).
- **The later objectives and powers** (shown greyed "Not in this demo").
- ~~**`db.json` rows** for the Brickbat and the FL-400.~~ **Built** in S2 (decision 8): `bx-17-brickbat`, `ga-fl-400`.
- **Art** for the Ram, the Tug, the pirates, the Fire Ship, the mines and the buoy: the ram, tug and pirates are
  Brickbats (civilian, civilian, hunter livery; hazard chevrons on the ram's nose), the fire ship an unlit Graf, the
  mines and the buoy drawn marks.
- **Speech for the drones**: the ram, the tug and the pirates bark High Command's pilot lines like your pilots.
**Your call:** when the campaign side is ready

### M-37 🟡 Type 3.5 playtest 1: missing
`docs/ARENA-HC35-FEEDBACK-1.md`; these wait:

- **Turret tracking for High Command's stations and future capital ships.** `pdTrack` in `sim-hc35.js` is one function
  taking a turret, its ship, the step, its reach and its weapon, ready to be lifted; High Command's stations still fire
  as before.
- **Per-turret aim and death art for future capital ships** (the FL-400 has it: `aims`, `pdDead`, `fire` in `sr-art.js`).
- **Art for a carried container and the activity glyph set** (K4's glyphs are inline SVG placeholders until then).
- **Mission thumbnails for the campaign's missions** (the review's ask): the Missions tab mock draws only the FL-400;
  the dimmed placeholder cards keep the vanilla type icons.
- **The HUD layout pass (K7)**: moved to M-40 (decision 14).

### C-68 🟡 High Command: placeholders
Every number in `game/js/sim-hc.js` marked `// placeholder`, each with a getter (`SIMHC.fn.THINK_SECS_()`…, or the
`SIMHC.TUNE` table the panel's HC group is built from).
| Constant | Value | What it does |
|---|---|---|
| `TICK` | 50 ms | The sim's fixed step (copied from SB) |
| `TIMESCALES` | 0 / 0.3 / 1 / 3 | Pause / slow / play / fast |
| `THINK_SECS` | 0.5 s (panel) | How often each ship re-decides |
| `ROUND_SECS`, `SPEED_SCALE` | 3 s, 4 (panel to 8; was 1.25 until C-69, 2.5 until C-70) | A ship's top speed covers its top dial straight × `SPEED_SCALE` in `ROUND_SECS` (SB's round), so a Talon tops out at 1,000 units a second and can't fly slower than 400 |
| `CRUISE`, `CONVOY_SPD` | 0.7, 0.55 of top speed (panel) | Unpressed speed; the convoy's speed |
| `THRUST_K`, `TURN_K`, `BOOST_MULT` | 0.7 (panel; was 1.6), 3 (panel), 1.6 | Acceleration (top speed from rest in 1/`THRUST_K` s), how hard the autopilot turns onto its goal, a boost's top speed × |
| `ENGAGE_FRAC`, `RANGE_MULT` | 1 × the longest gun (panel; was 0.55 until C-69), 1 (panel, on the next load) | The range a ship tries to fight at, before the tactic and personality; every weapon's range × |
| `THREAT_R` | 1.1 × gun range (panel) | A hostile this close with its guns on a ship (or that just hit it) is a threat it turns on (C-67 item 6) |
| `COMMIT_SECS` | 2.5 s (panel) | A ship stays on a target it just took at least this long |
| `FORM_GAP`, `SLOT_LEAD`, `SEP_R`, `SPAWN_GAP` | 320 units (panel; was 120), 0.6 s, 220 (panel), 340 (panel) | Formation spacing at a tactic's spacing 1; how far ahead a slot looks; personal space; a scenario group's starting spacing (C-69 item 3) |
| `ESCORT_R` | 2,200 (panel; was 1,500) | An escort engages what comes this close to its charge (at least a patrol's detection, so it moves first) |
| `JUMP_R` | 350 (panel; was 260) | Inside this of the jump point a withdrawing ship jumps |
| `DETECT_R`, `GUARD_R`, `LEASH_R` | 2,500, 1,200, 5,000 (panel; were 1,500, 900, 2,600) | The Hegemony's patrol detection, guard radius and chase leash |
| `EXTEND_K`, `PASS_K`, `EXT_MAX` | 1.4 × gun reach, 0.3 × gun reach, 9 s (panel) | The attack run: how far it carries past the target, how close it goes before breaking off, the longest extension (C-69 item 15; replaced `HR_IN` / `HR_OUT`) |
| `STALE_SECS` | 4 s (panel); eager pilots × 1.5, steady × 0.7 | A close fight turning without a shot this long is a stalemate: break off (C-69 item 16) |
| `AUTO_SECS`, `AUTO_HOLD`, `AUTO_HURT`, `AUTO_ODDS` | 1 s, 4 s, 50% hull, 1.5 : 1 (panel) | AUTO re-thinks this often and holds a choice this long; it goes Defensive under this average hull or at these odds (C-69 item 18) |
| `CORNER`, `TURN_SCALE`, `TURN_BLEED` | 0.7 × top speed, 4 × the dial's radius, 1.2 × top speed a second (panel) | The corner-speed turn model (C-69 items 9 to 11) |
| `HC_TURN` | the Cross × 1.6 (panel: "Cross turn ×") | A class's turn × in High Command (C-71 item 6) |
| `LOCK_GUN_K`, `LOCK_AIM` | 1.3 × gun reach, 0.6 (panel) | A lock's reach without missiles; how much a full lock takes off the guns' spread (C-72 items 4, 5) |
| `MIS_LIFE` | 6 s (panel) | A missile explodes this long after launch (C-72 item 8) |
| `DEFEND_WATCH`, `INTERPOSE_K` | 6,000, 0.45 (panel) | How far out defenders watch; where between threat and charge they go (C-72 item 13) |
| `HEG_RETREAT`, `LURE_DIST`, `STANDOFF_R`, `CLEAR_R`, `STRIKE_WAIT`, `HEG_PLAN_SECS` | 35% hull, 5,000, 6,500, 3,000, 25 s (panel), 1 s | The Hegemony pulls back; the lure's drag, the strikers' hold-off, when it's clear, their patience; how often the leaders re-plan (C-72 items 14 to 18) |
| `CHAFF_N`, `CHAFF_R`, `CHAFF_P`, `CHAFF_SECS`, `CHAFF_T` | 2 a sortie, 3,000, 100%, 3 s, 1.2 s (panel: N, P, T) | Chaff: charges, reach, the chance a missile takes it, a cloud's life, when AUTO throws it (C-72 item 10) |
| `RAIL_FEED_MIN`, `STAR_TW` × `STAR_TH`, `STAR_N`, `STAR_BUDGET` | 60 px; 8,400 × 6,000, 1,680, 6,000 (`arena-hc.js`) | The feed's least height over the wing cards; the starfield tile (C-71 items 1, 5) |
| `SLIP_NOSE`, `SLOT_LOOK`, `LEAD_ORBIT` | 0.2 rad (panel; was 0.42), 700, 1,400 | How far the nose leads; station keeping's lookahead; a holding leader's circle (C-69 items 12, 13) |
| `AVOID_R` | 260 | Rocks, the map edge and wingmates push a ship's heading away inside this |
| `CALM_SECS` | 3 s (panel) | A ship unhurt this long regains the copied `CALM_GAIN` (6) nerve |
| `LEAD_LOSS`, `PROMOTE_SECS` | 0.5, 8 s (panel) | A leaderless wing's cohesion; when the next pilot takes the lead |
| `HC_CP` | 5 (panel) | The command point pool when a scenario sets none |
| `HC_MAP`, `HC_SPREAD` | 16 (panel to 48, on restart; was 2, then 4 until C-70, 8 until C-71, 32 until C-72), 4 (panel, on restart) | The map is `HC_MAP` × space.js's 4,200 × 3,000; a scenario (written for 2) is scaled to `HC_SPREAD` and sits in the map's middle (C-69 item 2, C-70 item 3) |
| `ARRIVE_OUT` | 2.6 × the turn radius | How far a ship flies out to line up on a point it can't turn into (C-70 item 5) |
| `HC_TACTICS` | the table in `sim-hc.js` | Each tactic's weights: formation keeping, spacing, fighting range, focus fire, flank, screen, hit-and-run, disengage hull, leash |
| `PERSONALITY` | eager 1.25 / 0.6 / 0.6, steady 1 / 1.4 / 1 | Fighting range ×, formation weight ×, disengage threshold × |
| hc1's stats | Relay K-7 hull 200, armour 30; Convoy Lark hull 80, armour 20 | The scenario's own overrides (C-67 item 11) |
| `DEFEND_R`, `HOLD_R` | 2,000, 1,800 (panel; were 1,300, 1,200) | A defending or holding wing engages what comes this close |
| `CAPTURE_R`, `CAPTURE_SECS` | 550 (was 320, then 400 until C-70), 10 s (panel) | Capture: how close, and how long uncontested |
| `BOARD_R`, `BOARD_SECS` | 550 (was 320, then 400 until C-70) + the station's size, 12 marine-ship seconds (panel) | Boarding: how close, and how long (two boarders take half as long) |
| `MORALE_EAGER`, `MORALE_SHAKEN`, `MORALE_PANIC` | nerve 80, 45, 25 (panel) | The morale ladder: EAGER at or over 80, STEADY from 45, SHAKEN from 25, PANICKED under |
| `STEADY_AT`, `PANIC_FLEE` | 35, 0.6 (panel) | A panic ends once nerve is back over 35; a panicking pilot flees 60% of the time, else freezes |
| `SHAKEN_ODDS`, `SHAKEN_DISENGAGE` | 2, × 1.6 (panel) | A SHAKEN pilot hangs back from a target with 2 or more hostiles round it, and falls back hurt at 1.6 × the tactic's threshold |
| `COLLIDE_DMG`, `COLLIDE_K`, `COLLIDE_BOUNCE` | 40 at 1,000 a second, 1.15 × the hull length, 0.3 (panel) | Collisions: damage by closing speed², a ship's size, the bounce (C-70 items 8, 9) |
| `AVOID_T`, `AVOID_PAD`, `AVOID_W` | 1.6 s, 90 (eager × 0.6, steady × 1.4), 3 (panel) | How far ahead pilots look for a crash, how much room they leave, how hard they steer (C-70 item 10) |
| `LOCK_CONE`, `LOCK_RATE`, `LOCK_LOSS` | 0.75 rad, 1.1 a second, 1.4 a second (panel) | The missile lock (C-70 item 14; replaced SB's `LOCK_GAIN` 0.4 inside the guns' arc) |
| `MIS_SPD_K`, `MIS_TURN`, `MIS_RANGE_K` | 13 dial units a round, 6 rad/s, 1.6 × (panel) | A missile's speed (2,600 a second at speed 4), turn and reach; the lock range (C-70 item 15) |
| `MIS_BREAK_T`, `MIS_SHAKE`, `MIS_ARM_SECS` | 1.1 s, 1, 10 s (panel, but the last) | When a target breaks; the chance a break shakes a missile × its missing lock; how long MANUAL's arming lasts (C-70 items 16, 17) |
| `HC_LOADOUT` | the Cross: repeaters + missiles | High Command's own stock loadouts (C-70 item 13) |
| `FEED_ROWS`, `QUIET_ALPHA` | 5, 0.4 (`arena-hc.js`) | The feed's height in entries; quiet lines' strength (C-70 items 28, 30) |
| `BADGE_MS`, `BADGE_MAX`, `BADGE_R` | 2,500 ms real time, 3, 11 px (`arena-hc.js`) | Status symbols: how long, how many a ship, their size (C-70 item 31) |
| `NERVE_K` | 0.6 (panel) | Every nerve loss × this, High Command only (C-67 item 17) |
| `BARK_GAP` | 4 s (panel) | A pilot speaks about a new job at most this often; emergencies, kills, steadying and rules always speak (C-69 item 22) |
| `BUBBLE_MS`, `BUBBLE_MAX`, `BUBBLE_W`, `BUBBLE_POP` | 2,000 ms real time, 4, 210 px, 140 ms (`arena-hc.js`) | A speech bubble's life, how many show at once, its width, its pop in and out (C-69 item 23) |
| `PIN_N` | 2 (panel) | This many hostiles with their guns on a ship pin it |
| `PRES_HULL` | 30% (panel) | Preservation Order's threshold |
| `GUARDIAN_SECS`, `GUARDIAN_R` | 2 s, 6,000 (panel; was 3,200) | Guardian Directive: an objective hit this recently; its attacker intercepted if this close |
| `ESCAPE_K`, `FORM_SECS` | 2.2 × gun range, 5 s (panel) | Formation Discipline: when a target has escaped; how long the ship re-forms |
| `BRING_HULL` | 50% (panel) | Bring It Down: the flagship counts as disabled under this (or with an engine or controls critical) |
| `SAVIOUR_HULL` | 30% (panel) | Saviour Protocol: the named friendly is critical under this |
| `TILE_Z`, `TILE_BUDGET`, `TILE_WARM` | 0.34, 3 ms, 4 rounds | A camera tile's zoom; what the tiles may cost a frame (with 8 or more) before they fall back to static glyphs; how many rounds are drawn before that is measured |
| `TS_SLOW`, `TS_FAST` | 0.3 ×, 3 × (panel) | The slow and fast speeds |
| `RAID_TURN_R` | 700 (panel) | A raider turns from your station onto a fighter this close with its guns on it |
| Tactic weights | the `HC_TACTICS` table (panel, 60 sliders) | Every tactic's formation, spacing, fighting range, focus, flank, extend, pass, tail-chasing, disengage and reach |
| hc2's numbers | Lastlight hull 300, armour 40; waves at 0:20, 1:15, 2:10; the clock 3:00; 4 command points | Last Light's balance |
| hc3's numbers | the reactor hull 260, armour 40; Vex hull 120, armour 20; the haulers hull 70, armour 20; the clock 3:30 | Meltdown's balance |
| `CMD_COST` | Override 1, Recall 2, Reinforcement Request 3, Emergency Support 1, Recon Sweep 1, Comm Scramble 2, Comm Hack 3, Decoy Signal 1, Abort 0 (panel, bar the two stubs) | The command costs, in command points |
| `OVERRIDE_SECS`, `OVERRIDE_COOL` | 12 s, 55 (panel) | How long Patriot Override holds a pilot; the nerve it lifts them to |
| `RECALL_BOOST`, `RECALL_HULL` | 6 s, 40% (panel) | A recalled ship's burn; under this hull Recall is the recommended answer |
| `RECON_SECS` | 25 s (panel) | How long a Recon Sweep shows the Hegemony's intent |
| `DECOY_SECS`, `DECOY_R` | 12 s, 2,500 (panel; was 1,600) | How long a decoy draws, and from how far |
| `HELP_SECS`, `PIN_CLEAR` | 15 s, 3 s (panel) | How long a sent wingmate helps at most; how long after a pin breaks it clears |
| `DISENGAGE_R` | 1,600 (panel; was 1,100) | Withdrawing and falling-back ships steer wide of hostiles inside this |
| Abilities | recharge: Boost Shields 8 s, Lock In 14, Boost 10, Drift 10, K-Turn 12, Barrel Roll 9, Field Repair 25 | Effects: shields +15% of their total to the weaker side; nerve +35; 2 s at boost; 3 s of the nose on a pursuer; a flip at half speed; half the hit profile for 1.5 s; hull +15% (the copied `space.js` amounts where one exists) |
The gun, lock, spread, damage and nerve numbers are SB's (C-60, C-64, C-65, now in `docs/archive/DESIGN_BLOCKERS-ARENA.md`), copied with their values.
**Your call:** _open_

### C-80 🟡 Type 3.5 playtest 1: readings to confirm
1. **The crew now hail about 20 s into any fight, whatever the primary.** With the spec's drain (`RES_THREAT` 1.5 a
   second for each ship within `THREAT35_R`) three ships take 70 resolve to 0 in about 15 s. You get a card; but left
   unanswered, the persona's default decides it, and *Take the cargo* lets the freighter go, which loses a Destroy,
   a Steal or a Crash (it did in my scripted tests until I turned the drain off there). Is the hail meant to come up
   in every primary, or only while a wing is on Intimidate (or Pirate is the primary)?
2. **Turrets alone can't stop the ram.** A bolt does 1 to 2, and the ram has 120 hull and 60 armour, so even slowed to
   half speed it takes 22 hits over 23 s and strikes anyway; it's the escorts' guns that can kill it. The "shot down"
   test uses a slow ram with 10 hull. Is that the ram you want (hard to stop), or should point defence be able to?
3. **Turret arcs are measured from the hull's centre**, not from each mount: from a mount's own position the prow pair
   couldn't see a ship alongside the bridge, and fighters sat in a blind spot. Each pair still covers 200°
   (`PD_ARC`).
4. **The hail's default for other primaries is the persona's** as you said; for an eager leader that's *No deal*,
   which keeps the freighter in the fight.
5. **The death spin's `spinK` is 4, not the doc's 1.0.** High Command's turn model keeps a fighter's nose under about
   1.3 rad/s even in its hardest turn, so at 1.0 a Talon killed mid-turn tumbled at 1.4 rad/s, nowhere near the
   doc's own test (over 4), and every death sat near the 0.4 floor. At 4 a Talon in a hard turn whips round at about
   4.6 and a Brickbat flying straight still sags at 0.36. On the FX group.
6. **"Thin when full"** I read as the always-on arcs on your ships being drawn faint and thin (a quiet style),
   thickening to the full read when the ship is selected, hit or refilling. The arc's thickness still follows its
   strength within each style.
7. **Low health is red**, which the colour law reserves for "ours" (your note, and the doc flags it): it's small and
   pulses, so it shouldn't read as a rebel ship. High Command and 3.5 only: should ground combat follow?
8. **3.5's tiles read in sentence case** ("Bomb run on the engines", "Waiting to board"), where High Command's are
   one word in capitals ("ENGAGE"); High Command's stay as they were.
9. **Your pilots using their abilities again** (C-79 item 33) changes how a 3.5 fight plays. It's what the doc asks
   for; say if you'd rather 3.5's pilots kept to the plan without them.
10. **The Missions tab is a static mock**, not campaign code, and its other cards are dimmed placeholders; **the holo
    look is provisional** until the planning windows' mock-ups (2–5); **the dossier is folded into the rail** and the
    holo-table.
11. **Unresolved pods count as Captured or Lost** at the end (C-79 item 48).
12. **From the mock-up review, open:** the holo planet is very saturated (it's the projection, cyan by law; the
    in-mission planet stays dim): intended? And the Risk tile is gold-outlined (Moderate's colour in the vanilla risk
    palette) beside the one gold primary: keep it, or move the palette's middle to the kit's orange?
**Your call:** items 1, 2, 5, 7, 9 and 12; confirm the rest

### C-89 🟡 The switch to main: your decisions, and what I chose building each phase
`docs/MAIN-SWITCH-HANDOFF.md`. Your 21 October decisions (its §1) make Type 3.5 the campaign's space combat. One item a
phase, added as each is built. **Every other reading in C-75 to C-87 stands as interim** (§1).

**S0, the archive and the clean-up** (built; `archive/README.md`, `docs/CLEANUP-REPORT.md`):
1. **The tag.** `archive/space-experiments-2026-10` goes on `space-combat-testing` at `3060415`, the commit before
   anything moved (you place it: `git tag archive/space-experiments-2026-10 3060415`).
2. **Archived:**
   - Arena v2 (`sim2.js`), and the Arena's scene, picker and v2 designer panel (`arena.js`);
   - SB Test (`sim-sb.js`, `arena-sb.js`);
   - Type 3 as a playable ruleset: the whole `arena-hc.js` as it was;
   - the full `arena.css`;
   - `arena-smoke.js`;
   - their eight docs (`docs/archive/`);
   - their blocker entries C-55, C-56, C-59, C-60 and C-62 to C-65, moved verbatim to
     `docs/archive/DESIGN_BLOCKERS-ARENA.md`.
3. **High Command's renderer stays in `arena-hc.js`, trimmed to host Type 3.5 only, rather than being lifted
   now.**
   - Gone: Type 3's scenarios and picker, the order tray, the order wheel, the commands drawer, the rules picker,
     the emergency responses, its end card and its metrics.
   - The renderer, the HUD and the overlay hooks are untouched.
   - S1 lifts it into the campaign's scene. The file keeps its name until then, so links and tests don't break
     twice.
4. **v2's pilot `PRESETS` moved into `sim-hc.js`.** It was the only thing High Command read from `sim2.js`.
5. **The test bench.** The 'arena' scene was `game/js/hc35-bench.js` (S1 made it the `space35` scene, `game/js/space35.js`). It opens Type 3.5's board directly (no
   ruleset picker) and drives High Command's loop.
6. **`?dev` is the debug flag.** The existing debug hash (`#debug`, `#test`) belongs to the base's Prologue panel and
   the harnesses, so I didn't overload it.
   - With `?dev`: the title screen's **Test bench** button (was "Enter Arena", shown to everyone) and `?dev#arena`.
   - Without it: `SR.bootArena()` is the campaign's boot, and `#arena` shows the title screen.
   - The designer panel and the flight recorder's download live on the bench.
7. **Type 3.5's "Change ruleset" and "Back to rulesets" buttons** became "Back to title".
8. **Type 3's three scenarios became test fixtures** (`tools/hc-fixtures.js`). With them, `hc35-smoke` still checks
   that High Command plays byte for byte as before with the 3.5 hooks in (C-75 item 1: the hashes match), and
   still runs the visual pass's tests (C-73, C-74).
   - **Dropped with Type 3:** K0's High Command record and replay, and K4 18 (Type 3's Reinforce command).
9. **No `SIM_VERSION` bump.** The sim plays exactly as before; the hash baselines prove it.

**S1, Type 3.5's campaign scene** (built; `game/js/space35.js`, `tools/space35-smoke.js`):
10. **`SR.go('space35', {mission})`** opens window 1 of the mission's opportunity, never the demo's board. The window is titled
    for the mission, its Back goes home, and the debrief has one way out, **Back to base**. The designer panel shows only
    with `?dev`. Without a mission the scene is the test opportunity (the demo's board, its freighter and Patrol Sweep):
    `?dev#arena`, the title's Test bench, or the Missions tab's **Test opportunity (dev)**.
11. ~~**Dev only for now.**~~ Superseded by S7: Intercept Transport and Tanker Grab fly in 3.5 for every player, as
    their own variants (C-94).
12. **A test flight counts nothing** (S1): the demo's board (the Test opportunity) still returns one, which the base only
    logs. Since S6 a campaign mission flown by the player's wings counts (item 37).
13. **The demo's own wording is still there** inside the windows ("not in this demo", the locked primaries). It goes when
    the opportunities are the campaign's (S7, S8) and the text joins the workbook (C-90 item 5).

**S2, the ships database** (built; `docs/SHIPS-REVIEW.md`, `tools/ships-smoke.js`):
14. **Hardpoints and configurations are database columns.** Ships carry `hardpoints`, `config` and `ownable`; Weapons a
    `slot`; there is a new Attachments table (Bombs, Cargo pods, Boarding party, Boarding pod); Starting Fleet and Space
    Enemies carry their own `config`. `build.py validate` checks every configuration fits its ship. The counts are
    placeholders derived from your columns (C-91; the table is in `docs/SHIPS-REVIEW.md`).
15. **The Brickbat and the FL-400 are rows**, with exactly 3.5's numbers. Every 3.5 fight plays as before: 32 scripted
    fights gave the same state hashes. The FL-400 keeps 3.5's pace over her row (`straight_min` 0.2, no dial), which the
    int columns can't hold. CORE Assembly is a new manufacturer row.
16. **The Brickbat is buyable** (2,400 credits at the Black Market, a placeholder), and **stealable**: a Source's Steal
    Ship offer names its prize from the ships the player can own, the Brickbat among them (your answer, Resolved log).
17. **`HC_LOADOUT` is gone.** The Crosses that carried missiles carry them in their own configuration (the 3.5 demo's,
    the Type 3 fixtures'). A stock Cross has none; the prologue's Dustfall comes with them (decision 9). A **Pirate Cross**
    enemy row shows an enemy fitted unlike the stock one (missiles and cargo pods); no mission flies it yet.
18. **Owned ships have a configuration** (`G.fighters[].config`, MIGRATIONS 15 → 16). Their weapons stay in `loadout` for
    `space.js` and the Arsenal, derived from the configuration. Refit edits the configuration (S4).
19. **The Graf is the usual boarding craft**:
    - In 3.5's planning a Graf gets a loadout like the Brickbat, a boarding party by default.
    - A leaders' plan that boards gives a flying Graf the boarding party.
    - The demo's wings have no Graf, so their plans read as before.
    - The need reads "A Graf or Brickbat to board".
20. **Answered** (Resolved log): the Graf and the Brickbat carry bombs, and nothing else does (an attachment's `ships`
    column says who can carry it; the Cross keeps its 4 pylons for cargo pods and a boarding pod). The Brickbat has no
    passenger room, so it boards with a boarding pod and isn't a troop transport.

**S3, wings** (built; `tools/wings-smoke.js`; ⏸ for you):
21. **The model.** A wing is 1 to 4 ships, each with its pilot or none (a free ship). A pilot is in a wing when seated in
    one of its ships, and `p.ship` follows the seat. The leader is kept while they fly with it, else it is the
    highest-level pilot aboard. `G.wings`, MIGRATIONS 16 → 17: the pilots with ships make one wing (Dagger), led by the
    highest level. More than four make a second wing.
22. **The Assign window.** A pilot with a ship outside every wing gets "Assign {name} to a wing": the wings with room, or
    **Start a new wing** (they lead it). Esc and the scrim don't close it. A pilot without a ship can wait. **Before the
    prologue's frontier** ships and their pilots join the first wing on their own, so the story never stops for it.
23. **The Wings window** (the Hangar's **Wings** button) offers:
    - **Make leader**; **Move** (the pilot and their ship, to another wing with room, or a new one);
    - **Take off the wing** (the pilot leaves their seat; the ship stays, free for another pilot);
    - **Seat** a pilot without a ship in a free one; rename a wing (its name is the field);
    - move a free ship out of its wing, or a ship outside into one.

    Nothing changes for a wing out on a mission.
24. **Only wings fly space missions.** Until S8's planning, the campaign's space plan takes only pilots and ships in wings
    ("Not in a wing" otherwise; it doesn't insist the pilot flies their own wing's ship). An asset slot still takes any
    ship.
25. **Which assets need a wing (your call, asked by the handoff; still open).** Interim: none do.
    - A ground mission's transport and fire support take any ship and pilot, in a wing or not, so the Marta still
      carries the squad.
    - A space mission's asset slot takes any ship.

    Wing names come from a list (Dagger, Anvil, Amber, Ember, Lance, Hammer, Sable, Flint, Kestrel, Ash).

**S4, Refit** (built; `tools/refit-smoke.js`):
26. **Refit is the ship inspector's tab.**
    - A ship's window has **Ship** and **Refit** tabs, and the Arsenal's Refit opens the tab.
    - It lists her hardpoints by type (Guns, Missiles, Pylons, Inside the hull) with what's fitted. You fit, swap or
      take off from what's on the hangar racks.
    - A change takes no time with an Aerogineer in the Workshop, 2 days without (she's grounded). Nothing changes while
      she's out on a mission.
    - A fit she can't take is greyed with the reason: the wrong hardpoint, none free, no passenger room, a ship that
      can't carry it. The racks' items with no hardpoint for them are listed under "Can't fit".
    - The old mount pop-up is gone.
27. **The racks hold attachments too** (`G.shipKit`). The Arsenal's Ship kit shows them, tagged "Attachment". Until
    S5's Crafting, the only attachments are the ones that come off ships (a Brickbat's bomb racks).
28. **Type 3.5's window 3 reads each Brickbat's and Graf's fit** ("Bombs ×2", "Cargo pods", "Boarding pod", "Boarding
    party"), with **Refit**, instead of the segmented control. A Brickbat boards with a boarding pod, a Graf with a
    boarding party.
    - The demo's ships have no hangar, so their Refit is a **demo refit** pop-up of the three fits 3.5 knows, and the
      leaders' plans still refit them per primary.
    - The campaign's own wings (S8) will read the real ships' configurations, and their Refit will lead to the base.
    - 3.5 plays exactly as before: the same 32 state hashes.
29. **The ship inspector's Ship tab is `space.js`'s ship sheet** (`SR.shipSheet`). It has to move out of `space.js`
    before S11 archives it.

**S5, placeholder Crafting** (built; `tools/crafting-smoke.js`):
30. **The Arsenal's Crafting tab**, marked a placeholder: the seven assets (Unmanned Ram, Nuclear-tipped Ram, Fire Ship,
    Minefield, Interdictor Buoy, Comms Relay, Rescue Tug) and four attachments (Boarding pod, Bombs, Cargo pods, Boarding
    party). Each card shows what it unlocks, its cost, 0 days and **Craft**; one you can't afford is greyed with the reason.
31. **The costs are the rewards proposal's** (Claude Doc, *Crafting costs*), placeholders (C-91). The proposal has none
    for Bombs, Cargo pods and a Boarding party: mine are 100c + 60m, 80c + 50m and 100c + 40s.
32. **Assets go into `G.assets`** (counted; MIGRATIONS 17 → 18), attachments onto the hangar racks. A campaign mission's
    asset picker offers only what the inventory holds, and a leaders' plan drops assets you don't have.
33. **An asset is spent when its power is used** in the mission, and used up; one never used comes home. A placed
    **Comms Relay** is spent: it's left behind (**answered**, Resolved log C-89.33).
34. **Spoofed Orders and Call the Pirates** aren't crafted. Spoofed Orders come from intel work and the pirates are a Black
    Market hire (300c in the proposal); neither exists yet, so a campaign mission can't take them (the demo still can).
    **Logged for you to scope** in M-40 (your answer: "That's fine").

**S6, results in and out** (built; `tools/results35-smoke.js`; ⏸ for you):
35. **In.** A campaign mission flies the player's wings (`wings35`): every wing with a ship free to fly and its pilot, the
    leader first.
    - The pilots bring their level, skills, nerve (with injuries) and traits.
    - The ships bring their configuration, stored hull % and Heavy Frames.
    - 3.5's window 3 reads their fits ("Refit at base"), and the leaders' plans give the player's wings the demo wings'
      parts in order.
    - Window 1 has an **Intel** strip, since the demo's dossier isn't shown: what's known, and Dig deeper at 1 of the
      campaign's Intel each.
    - Rank, hero status and mood aren't read beyond the nerve (3.5 has nothing for them yet).
36. **The one mapping table** (decision 10) is `SR_OPS.TRAIT_MAP` in `ops-core.js`: each rebel trait to a help weight
    (`TRAIT_AID`) or a relationship; Friends, Lovers, Family, Old Friends, Battle Brothers, Mentored, Owes and Saved are
    friends, Rivals rivals; a pilot of level 2 or lower is green. The personas stay High Command's (reckless, brave,
    hothead: eager; steady, cautious, veteran: steady). The demo's own trait lists stay only on the demo's wings.
    **Which should do something in 3.5:** your list to work through is `docs/TRAITS-35-REVIEW.md` (every trait the
    game grants, what 3.5 does with it now, my suggestion and a column for your call). Making it, I found that a
    Grieving pilot could fly a 3.5 mission; they're kept home now, as everywhere else.
37. **Out.** The scene returns the result `space.js` returns (`kind:'space'`, people, fighters, salvage), so the debrief,
    the report and `applyDebrief` work unchanged, plus:
    - the primary (done, partial, failed, aborted, or replaced) and the secondaries;
    - the stand-in pay (`rewardOf`; the rewards proposal waits for you), paid whatever the primary, in place of the
      mission's own reward;
    - surrendered cargo, the assets spent and kept, the Broadcast, the witnesses, the Intel spent.
    - the objectives flown, which the base's mission report lists in place of the mission's own ("Destroy (primary)");
    - the debrief's detail and the mission's comms, for the report's More information (item 44).

    The mission's days go by as for any mission.
38. **The pods** (decision 4): home is fine; **picked up** (a pod aboard a ship that came home) is injured; **captured**
    is gone from the roster, kept in `G.captured` as the rescue lead (MIGRATIONS 17 → 18), until the capture system (M-2);
    **lost**, left behind or with no pod is lost, with the Infirmary's Critical Condition still applying. The old "shot
    down: 15% dead" roll isn't used.
39. **XP and skill use** (placeholders, C-91): +0.15 of a level for a win, +0.05 for a loss, as flown missions today, and
    0.02 a kill. Skill use: Aim from hits landed, Focus from damage taken, Presence for a wing leader. The proposal's
    pilot XP (subsystems, a leader's whole wing) waits for you.
40. **Hull.** A ship that came home stores her hull %; one lost in the fight is gone.
41. **Exposure and Leads** (decision 11, placeholders): the Firebrand Broadcast adds 5 Exposure; each enemy that jumped
    away (an escort, the freighter) is a witness: +2 Exposure and a 25% chance of a Bureau Lead on the mission's cell.
    Dig deeper costs 1 Intel.
42. **Fuel isn't paid** for a 3.5 flight yet. S8 pays it, and the proposal's fuel question is yours (C-91: the Reserve's
    half; the proposal's option of fuel per wing).
43. **Still a dev flight.** Only `?dev` reaches it, so the playable game is unchanged; S8 makes the planning the
    campaign's own.
44. **The end of a flight** (your S6 note: "we just need a simple 'Mission Success' or 'Mission Failed' pop up, then
    'NEXT' button"). A campaign flight ends on that pop-up; Next goes to the base's mission report, now the one results
    screen.
    - The report shows what matters: the objectives flown, the crew (with XP, injured, captured or lost), the **ships**
      (each with her hull, or lost) and what was gained.
    - **More information** on the report opens what 3.5's debrief said: the objectives in detail (a fallback), loot,
      the reward breakdown, losses with each pod's fate, the time in each phase, what decided it, how your leaders
      played it, and the **mission comms** (the event feed, in order). **Back** returns to the report. With `?dev`,
      Save flight record is there too.
    - The test bench's demo keeps its full debrief (Plan again, New opportunity, Save flight record).

**Needs from you:**
- Place the tag, and merge (§3, S0.6).
- Read `docs/CLEANUP-REPORT.md`; C-90 lists what needs a decision.
- Answer item 25.
- Work through `docs/TRAITS-35-REVIEW.md` (item 36).

**Your call:** _open_

## Resolved after the sweep (27 October 2026)

### C-90 🟡 The clean-up report: what needs a decision
`docs/CLEANUP-REPORT.md` has every finding with where it is, why it looks redundant and the risk. These are the ones
I can't settle without you:

1. **The UI kit's source is behind the game.** `tools/ui-kit/sr-theme.css` lacks the game's `100dvh` window height
   and the whole tablet layout. Running `tools/ui-kit/build.py` would undo the iPad pass.
   - Interim: nothing is rebuilt.
   - Shall I copy the game's changes back into the source?
2. ~~**The four standalone prototypes**~~ Archived (Resolved log, C-90.2).
3. **Type 3's systems in the sim** (rules, command points, commands, emergencies, tactics): only the fixtures
   exercise them now.
   - 3.5 calls none of them directly.
   - Keep them for 3.5 to draw on later, or plan their removal for S9?
   - Removing them changes the hash baselines.
4. ~~**Names that will collide**~~ Renamed (Resolved log, C-90.4): Tips, Heat, mounts and hardpoints.
5. **3.5's player-facing text is outside the workbook.** `text.py` doesn't read `arena-hc35.js`, `sim-hc35.js`,
   `sim-hc.js` or `ops-core.js`; it was lab copy (C-78).
   - Bring it into the workbook at S1, when it reaches players?
6. **Old docs.** Do you want these moved now?
   - Built handoffs with few links: ONBOARDING, MARKET-ARSENAL, GALAXY with its reference page, LEGACY_AUDIT (this
     report replaces it). They could go to `docs/archive/`.
   - The heavily cited ones could get a "Status: built" line instead.
7. ~~**Stale numbers in README, GDD, ROADMAP and REBELS_PLAN**~~ Fixed to the build's numbers (Resolved log, C-90.7).
8. **Type 3's blocker entries:**
   - C-66, C-67, C-69, C-71 and C-72 are now mostly records of an archived ruleset.
   - C-70 item 13 is answered by decision 9.
   - C-72 item 19 is moot.
   - May I move them to `docs/archive/DESIGN_BLOCKERS-ARENA.md` as I did v2's and SB's? C-68, C-73, C-74 and C-75
     stay: the sim and the visual pass are live.
9. **Two bugs the audit found, for when their phase comes:**
   - High Command's emitter critical does nothing (Boost Shields never checks it): S6.
   - Type 3.5's `unreachable()` assumes a cruise speed of 560 (wrong for the Talon and the Brickbat): S7 or S8.
   - ~~A wing leader in trouble is offered to themselves for help~~ Fixed in S7 (C-94 item 8).

**Your call** (the designer, 27 October 2026): items 1, 5, 6 and 8 stand as built. Item 2: archive the prototypes. Item 3: remove Type 3's systems. Item 4: Tips confirmed; give the other two new names so none are the same (to review later); hardpoints are a count each ship has, each kind of attachment uses some, and weapons go in **mounts**, a separate count (one count, any weapon: a ship with two mounts can't take a third weapon). Item 7: no numbers are fixed, so the build's latest numbers are right. Item 9: fix both bugs. _Building._

### C-93 🟡 The Space Combat FTUE: what I chose
Your doc "Space Combat FTUE" (Google Drive, FTUE folder). Built: Torch the Depots plans and flies in Type 3.5 for every
player, and the first time it's planned the FTUE runs. Code: `game/js/ftue35.js` (the FTUE), `torch_depots` in
`game/js/sim-hc35.js`. Tests: `tools/ftue35-smoke.js`; `prologue-smoke` and `economy-smoke` fly it in 3.5 now.

**The mission**
1. **It's 3.5's for everyone.** Plan mission on Torch the Depots (from the Missions tab, a comm or the new-mission card)
   opens 3.5's planning windows in place of the plan window (`M35_LIVE` in `base.js`). The other 3.5 mission
   (Intercept Transport) stays `?dev` until S8. `space.js`'s depot scenario is no longer reached by players; it and
   its tests stay until S11 (this is S11's Torch the Depots, done early).
2. **One ship.** A mission that needs a starfighter (the old one did: one pilot, one starfighter) flies only your wings'
   starfighters. At the depots that's **Sera in Dustfall**; Joss and the Marta (a transport) stay home, and Sera leads
   the wing for the day.
   - **Answered** (Resolved log, C-93.2): it's always Sera. She flies alone, in her own ship if it's a starfighter, else
     the first free one (Dustfall), whatever the wings say (`FLY35_PILOT`); if she can't fly, the mission says so.
3. **The opportunity** (`torch_depots`, placeholders throughout, as data like Patrol Sweep):
   - **Four depots** (hull 14, no armour).
   - **Sixteen sentry drones**, four round each depot: hull 3, their guns at × 0.35, and a nuisance (their fire
     neither pins a pilot nor rattles their nerve), so one ship massively outperforms them.
   - **No response:** nobody to call.
   - **Window 1 shows all four families** (the steps point at each), with "Nothing to take", "Nothing to use" and
     "Nothing to bait" cards; Destroy (the fuel depots) is the one objective.
   - **The result:** one level-3 Cross won 12 seeds in 12, in 1.5 to 10 minutes of sim time (about 3 minutes on screen
     at the default speed), home on 24 to 40 of her 40 hull.
4. **Missiles for the depots** (your note): she fires them only at a depot, one in flight per depot.
5. **It pays the mission's own reward** (5 Intel, 0.2 XP, the prologue's +400 Materials), not 3.5's stand-in; window 1
   shows it on the Destroy card.
6. ~~**Fuel isn't paid** for a 3.5 flight yet.~~ Paid (Resolved log, C-93.6): Sera's Dustfall burns 24 at the depots.

**The FTUE**
7. **The intro window:** four pages, Previous and Next ("Got it" on the last). Your "smooth gifs" are drawn live, in a
   loop that fades in and out, with the game's own ship art: page 2 a wing of three in formation with its leader
   ringed, page 3 the wing flying at the enemy and opening fire, page 1 a small "Objective, Team, Plan" loop; page 4
   has none. Reduced motion shows a still frame. **Answered** (Resolved log, C-93.7): page 1's loop stays, and they stay
   live rather than GIF files.
8. **The 16 steps,** in your order: a coach card beside what it explains (Next for steps 1 to 5, Got it for the
   pop-ups), or a pointer with a pulsing ring at what to click (steps 6, 7, 9, 11, 14, 16).
   - Your step 7's "Secondaries button" is window 1's **Next: Secondaries** (there's no separate button).
   - The pointers say the button's own name ("Next: Secondaries", "Next: Rules", "Next: Wings & assets", "Next: The
     plan", "Start the mission").
   - Copy is yours, lightly edited (step 6 drops a doubled "in this case").
9. **How it behaves:** a step shows only while its window is on screen, is skipped once you're past it (pick Destroy
   early and step 6 is done), and waits if you go back. The intro window has the keys while it's up.
10. **Seen once you launch.** Back out midway and it starts again next time. Stored as
    `G.prologue.flags.tut.space35` (no save change); `Pro.replayTuts()` clears it.
11. **"Like Ground Missions":** there's no planning FTUE window for ground missions to match (they're taught by the
    prologue's coach cards), so this uses the same coach card and pointer look.
12. **The text is outside the workbook**, like the rest of 3.5's (C-90 item 5).

**Found on the way**
13. **Patrol Sweep:** a Destroy on a cast force read its progress as 0, so its leaders said "we're getting nowhere"
    after 90 s whatever happened. It reads how many are gone now (one fight fingerprint changed; `SIM_VERSION`
    `hc35-15`).

**Needs from you:** nothing (items 2 and 7 answered).
**Your call** (the designer, 27 October 2026): items 1, 3, 5 and 8 to 13 stand as built. Item 4: she prioritises missiles for the depots, but uses them on ships when she gains the advantage. Item 6: every mission the player creates has a travel time, and sending ships always costs fuel. _Building._

### C-92 🟡 Your freighter notes of 22 October: what I chose
Your run of seed 534180 (Crash) and your weapon notes. `SIM_VERSION` is now `hc-3` / `hc35-14`: an older record replays
with a warning and diverges at the first changed shot (yours at 0:19). Tests: `tools/weapons35-smoke.js`.

1. **The Crash waits for the gravity window.** The leaders' Crash plan and a wing finding work no longer go for her
   engines (she has to reach the pull). A Disable on the power plant, when the primary is Crash, holds fire on her and
   stands off ("Waiting for the gravity window") until the window opens.
   - **The window:** she's in the pull, or her power plant going down within `CRASH_LEAD` (10 s) would leave her
     drifting into it.
   - **Through the window and out**, still powered, the Crash is off ("she's through the gravity window") and the
     fallback takes over.
   - **The result:** the leaders' Crash over 10 seeds (the signal at once) fell into the planet 1 time in 10 before, 7
     now; held for the signal, your seed falls at 1:30.
   - **The 3 that still fail** run out of bombs: the lane only grazes the pull (about 240 units inside it), the 12 bombs
     leave the power plant on 22 to 57 HP, and the blasts take her engines, so she crawls back out. **Your call:** fewer
     power plant HP (`POWER_HP` 90), more bombs, a lane that dips deeper (the Near a Planet modifier's), or leave it
     as the difficulty it is.
2. **A shot past her shields lands on her hull.** Every ship was hit on one ellipse (its shield's bubble), and the
   freighter's is wide of her hull. Now, with the shield facing a shot down, the shot meets her own shape: three boxes
   from her art (the drive block with its turrets, the spine and cargo, the bridge). Her art also reaches past the
   ellipse at bow and stern, so a shot there meets her hull, shields up or down. Bombs land on it too. Only the
   freighter has a shape; fighters keep their ellipse, which fits them.
3. **A jump point is a jump point.** The early jump was the hidden Quick Jumper, which spooled a jump wherever she was
   (60 s). Now she spools on the run and jumps the moment she reaches her jump point (the 8 s spool already done). No
   other jump happens short of it (the prize crew's is at our jump point). Its text is new; `QUICK_SPOOL` is gone.
4. **Weapon types** (your note; placeholders, the panel's new **Weapons** group): × damage on each layer.

   | Type | Shields | Armour | Hull |
   |---|---|---|---|
   | Plasma | 1.5 | 0.5 | 1 |
   | Ballistic | 0.4 | 1.6 | 1 |
   | Missile | 0.3 | 1.6 | 1.4 |
   | Anything else | 1 | 1 | 1 |

   - What a layer doesn't take goes on to the next at the next layer's rate.
   - Ballistic scatters 1.6 × (`BALLISTIC_SPREAD`).
   - **A conflict:** the database calls the BLS-T repeaters (every fighter's main gun) and the Hegemony's pulse emitters
     `plasma`, but 3.5 already has true plasma: the PX cannons on your Talons and the response's Pursuers. I treated
     only those as plasma; the repeaters and emitters are the even line. Made plasma, every fighter's main gun would be
     poor against armour. **Your call:** are the repeaters plasma, or a type of their own (laser)?
   - **Another:** the door-mounted gun is ballistic but `bypasses_shields` in the database, so the shield rule never
     touches it. Keep the bypass?
5. **Missiles wait for an opening.** A pilot fires a missile only at a target whose shield facing them is down or under
   a quarter (`MIS_SHIELD_OK`), not by hand. On a capital hull a missile does × 0.5 (`MIS_VS_CAP`) where guns do
   × 0.25, then × 1.4 on her hull: your Crosses spend theirs on the freighter once her shield's gone.

**Needs from you:** items 1 (the Crash that runs out of bombs) and 4 (the repeaters; the door gun).
**Your call** (the designer, 27 October 2026): items 1, 3 and 4 stand as built (the Crash that runs out of bombs is the difficulty it is; the repeaters stay the even line; the door gun keeps its bypass). Item 2 applies to every ship: a shot past a shield that's down or absent reaches the hull. Item 5: a good pilot waits for an opening against a downed shield; a novice makes more mistakes, and some traits change it. _Building._

### C-78 🟡 Type 3.5: text
Every line in Type 3.5 is lab copy you'll rewrite: the opportunity's lead, the modifiers' lines, the objective and
rule cards, the wings' takes, the critique lines, the request lines, the power cards and the debrief's lines. None of
it reaches the campaign without the normal `[TEXT NEEDED]` flow.
**Your call** (the designer, 27 October 2026): an export of all the copy in the game that Claude wrote, not the designer's own, to review and edit; anything AI-written needs their look. _Building._
