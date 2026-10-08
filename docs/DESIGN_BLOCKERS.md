# Design Blockers — conflicts and missing systems

> **Who this is for:** the designer. **Who keeps it:** the coder (Claude), every session.
> It lists two things and nothing else:
> 1. **Conflicts** — places where two of your docs, or a doc and the game, disagree, or where two systems I
>    built pull against each other. I picked something to keep the game running; you may want to overrule it.
> 2. **Missing systems** — mechanics that do not exist yet and that stop things already in the game (traits,
>    specialties, missions) from working. Each one says what it blocks and what I need from you.
>
> It is *not* a changelog (see `docs/REBELS_PLAN.md`, `docs/ROADMAP.md`) and not a wish list. Every row is
> something that is stuck or that I guessed at.

**Last updated:** 2026-10-08, after your call on the command bar (none out of combat: C-33 item 7, settled as C-33.7). Before that, 2026-10-08, after your note on enemy shots (the camera holds on each shot and its result: C-45 item 7). Before that, 2026-10-08, after iPad Pro 12.9" support (the tablet layout in portrait: C-49). Before that, 2026-10-08, after your phase 5 calls (a lost prize pilot grounds only their ship; Steal the Cross is a Steal Ship; C-47 items 30 to 37 settled as C-47.5; Steal Ship's lines stay placeholders). Before that, 2026-10-08, after the prologue's phase 5 (Raid the Bunker: the Steal Ship type on one engine with Steal the Cross, the indoor bunker map, the player's Reinforcements bringing the pilots; New Game now plays to the frontier: C-47 items 30 to 37, C-48's phase 5 rows, C-41 item 2 in part). Before that, 2026-10-08, after the prologue's phase 4 (Raid the Bunker on the board, Tachi's three pilots, the Black Market and Sweet Tooth, the second hauler and Hangar room: C-47 items 22 to 29, C-48's P4 rows and the Steal Ship type). Before that, 2026-10-08, after the prologue's phase 3 (the tense day, the Bureau's first Lead on Venn, Someone's Asking Questions and Lie Low: C-47 items 18 to 21, C-48's Lie Low row). Before that, 2026-10-08, after the prologue's phase 2 (Rescue Tachi as the new Ambush: Extract VIP mission type, Tachi Gard as the first Agent, Run Your Network built: C-46 resolved, C-47 items 11 to 17, C-48's mission-type rows). Before that, 2026-10-08, after the prologue's phase 1 (`docs/PROLOGUE-HANDOFF.md`: the onboarding as a script of beats, gates that hide mechanics until a beat opens them, today's chain ported with the doc's fixes, the Steal Fuel recruit and Strafing Run callout: C-46 partly built, C-47, C-48, M-34; the designer's prologue decisions in the Resolved log). Before that, 2026-10-08, after merging the base and combat work into main (its two entries became C-44 and C-45, as the weapon voices had taken C-43). Before that, 2026-10-08, after the weapon voices (a distinct sound per weapon, reports driven by the volley the tracers draw: C-43). Before that, 2026-10-07, after your calls on C-45 items 3 and 4 (no Flanked penalty; Take cover keeps the shot). Before that, 2026-10-07, after your cover rework notes (cover by the line of the shot, walls and corners, flanking, the AI's cover; quicker enemy shots; the rebel on turn auto-selected; Automatic (Deployed) -2 on the Razorrat: C-45). Before that, 2026-10-07, after your base and combat notes (Standby and Working at the base; the stun wears off; Leave gun and Pack up gun; Treat wound picks and marks its patient; the per-round check that ends combat once contact is lost: C-44). Before that, 2026-10-07, after the screens handoff part 2, §3 (the Intelligence tab — The Network, all four phases: C-42). Before that, 2026-10-07, after part 2's §4 (the slot-filling planning window: C-41). Before that, 2026-10-07, after part 2's §2 (the source approach and standby contacts: C-40). Before that, 2026-10-07, after part 2's §1 (the Starfighter window: C-39; the part 2 doc and its stylesheets landed). Before that, 2026-10-06, after your call on fire support: the transport assigned to a ground mission brings its own Supply Drop (if its type can fly one) and Door Gunner Cover (if a Door Mounted Gun is fitted), with no second ship (C-31 item 5 resolved). Before that, 2026-10-06, after your call to undo my fire support changes (the Supply Drop toggle is back on the planning board; the transport gives no fire support of its own; the crate carries no Med Packs: C-31). Before that, 2026-10-06, after the audio pass (the persisted sound setting, one toggle wiring, the base's split alert palette: C-38). Before that, 2026-10-06, after the screens handoff, screen 4 (the Missions tab: C-37; M-22 item 4 built). Before that, 2026-10-06, after screen 3 (the comm burst: C-36). Before that, 2026-10-06, after screen 2 (the personnel file: C-35). Before that, 2026-10-06, after screen 1 (the mission report: C-33, C-34). Before that, 2026-10-06, after your Hangar answers (4 × 4 sections, small and large pads, a 14 × 18 map: C-32). Before that, 2026-10-06, after the Haven Rock art handoff (art update 4: the base map and walk-in views, M-33). Before that, 2026-10-06, after your answers on C-29 and C-30 (enemy range with the shooter revealed; downed VIPs; every transport leaves; the transport's own fire support; the developer logo on the title screen: C-31). Before that, 2026-10-06, after your field changes (death, stims, Steal the Cross, the Personnel File, Flight Controller and Combat Support: C-29, C-30). Before that, 2026-10-06, after the Support specialties build (the Support Specialties doc; your answers on staff posts, C-28; M-14 resolved; M-32 lists what waits). Before that, 2026-10-06, after the designer's C-26 answers (mission text per type, the transport by name, guard names by type). Before that, 2026-10-05, after the October 5 art handoff and the designer's answers on the Back slot (C-25),
wrecks (M-15), the new art (M-26) and Steady (M-27): the Back slot with the Razorrat and Riot Shield as deployables,
fire modes, Steady and Knockback, the EG-55 as Fightstar plasma, maker badges and trait icons, the layered vitals
bar, fire-support art and ships parked in the iso hangar.

## How to use this

- Answer in chat or edit the **Your call** line under any item; I will build it and move the item to the
  *Resolved* log at the bottom.
- IDs never change, so `C-3` and `M-2` can be quoted in a message. Items I add later get the next number.
- **Priority:** 🔴 blocks something the player can already see or reach · 🟡 blocks something that is listed but
  never switched on · ⚪ a choice I made that you may not care about.
- Maintenance rules I follow: whenever I hit a conflict or leave something unbuilt because a system is missing,
  I add it here *in the same commit*; when you decide, I resolve it in the same commit that builds it. If this
  file and the code disagree, the code is right and I fix this file.

## At a glance

| ID | Pri | Item | Blocks |
|---|---|---|---|
| C-13 | ⚪ | Two small bugs in the handoff's §9 CSS, patched from `scenes.css` | Nothing live; keep the canvas CSS in sync |
| C-15 | ⚪ | Prologue quips are placeholder lines | The designer's own opening lines |
| C-18 | ⚪ | Ship and truck attachment lists are still guesses | The Armoury copy when attachments arrive |
| C-19 | ⚪ | Ships live in the Arsenal, not their own Fleet tab (was a duplicate C-12) | Where the fleet is browsed |
| C-24 | ⚪ | Enemy types and loadouts the Enemies doc doesn't cover | Which enemies exist and exactly what each carries |
| C-27 | ⚪ | Guard lines: idle chatter is now spoken; a few place-bound lines were made generic or dropped | How guards sound on patrol |
| C-28 | ⚪ | Support specialties: the numbers and readings I chose while building them | How every Support rebel plays |
| C-31 | ⚪ | Downed VIPs, the shooter's reveal, the transport that leaves, reworded arrival lines | Rescue and Steal the Cross |
| C-32 | ⚪ | The bigger base and the 4 × 4 Hangar: map, pad sizes, costs, the free switch, old saves, an `sr-art.js` addition | How the base grows; what a ship needs to land |
| C-33 | 🟡 | Screens handoff: the open questions its §6 lists (cultivation scale, holo callouts, injured days, count-first labels, win objectives, Cass bubble; the Market/Arsenal amendment is settled) | The comm burst, the briefing room, the personnel file; the Market and Arsenal footers |
| C-34 | ⚪ | Mission report: what I chose (Intel tile, extra source rows, a level-up bar, space objectives) | How the report reads |
| C-35 | 🟡 | Personnel file: pilot Aim and Focus read the database bonus, not the handoff's formulas; trait chip wording; what I chose | What the skill tiles promise; how every file reads |
| C-36 | ⚪ | Comm burst: what follows Acknowledge, source events, the level-up meter | How talking to a source reads |
| C-37 | 🟡 | Missions tab: decorative space targets, which missions the board lists, fitting the rail, the phone layout | The briefing room |
| C-38 | ⚪ | Audio pass: the sound setting persists, and the base's one alert became three sounds (good / bad / ping) — my mapping of events to each | How the base sounds |
| C-39 | ⚪ | Starfighter window: one file for pilot and ship — the hangar sheet's hidden pilot column (confirm), rank chevrons, move-set rows, zone labels, scripted pilots' skill lines | How a ship and its pilot read in combat and the hangar |
| C-40 | ⚪ | Source approach: do standby contacts ever give up? Plus my choices — no auto re-knock, "+4 exposure" still moves `G.risk`, the gold courier strip | How a potential source is taken on, parked or burned |
| C-41 | ⚪ | Mission planning: keep the 2-asset cap? What does a spare gunless transport grant now that Reinforce is retired? Plus the squad-seat cap, support-job chip placement, the space variant | How every sortie is put together |
| C-42 | 🟡 | The Network: every number is a placeholder (interrogation clock, exposure gains and bands, agent stats and costs); how new Agents are recruited; the base raid | The whole Intelligence tab's tuning |
| C-47 | 🟡 | Prologue: readings to confirm (other worlds, who gives Steal Fuel, the bunker's fifth soldier, Tachi's "[location name]") and what I chose building it (the roster safety net's 2 days, the test harness, the debug panel, the cap at the frontier; the ambush's truck, numbers and halted convoy; Tachi's Agent stats; the Steal Ship rules, the bunker map, the Reinforcements hauler) | How the onboarding plays; how every ambush and ship theft plays |
| C-48 | 🟡 | Prologue text still to write: every `[TEXT NEEDED]` the game shows or will show | Ambush: Extract VIP's and Steal Ship's lines, the Lie Low step, beats 19 to 22's pointers and callouts, the bunker raid's plan tutorial and call-in card |
| C-49 | ⚪ | iPad Pro 12.9": the tablet layout in portrait is my design (the rail slides in from the right); what it doesn't cover yet | How the game plays on a tablet |
| C-45 | ⚪ | Cover by the line of the shot: the numbers (hug distance, corner arc, wall cover 9, Take cover +2), what counts as a threat in the cover hints, enemy-shot pacing | How every firefight plays |
| C-44 | ⚪ | Standby and Working; the combat-flow fixes: what Standby does, when a rebel rests on their own, how many quiet rounds end a fight, alerted enemies holding still out of contact, extraction with hostiles alive, what Leave gun leaves in their hands | How the base reads; when a fight ends |
| C-43 | ⚪ | Weapon voices: every weapon's own sound, reports per visible round — the character I gave each weapon | How combat sounds |
| M-1 | 🟡 | Per-rebel Risk and notoriety | 8 Rebel Traits, 2 Character Traits |
| M-2 | 🟡 | Capture, interrogation and ambush | 4 Rebel Traits, Rescue Prisoners missions |
| M-3 | 🟡 | Family | 2 Rebel Traits |
| M-4 | 🟡 | Revive and rescue in space | Failed to Save, space half of the rescue traits |
| M-5 | 🟡 | Command decisions and story events | 6 Rebel Traits |
| M-7 | 🟡 | Mission and location tags (civilian, populated, criminal) | Streetwise, Former Criminal, Haunted, Mission Specialist reach |
| M-8 | 🟡 | Boarding theatre | Marines are data-only |
| M-9 | 🟡 | Rebel-linked economy hooks (Intel, Materials, diplomacy) | 7 Character Traits |
| M-10 | 🟡 | Carried-gear effects: Strong, Scrawny's melee half, Messy, melee, lost gear | 2 Character Traits and a half |
| M-11 | 🟡 | Pilot critical injuries and space-side gear | Pilots escape injury risk; gear only matters on foot |
| M-12 | 🟡 | Old injuries: permanent Limp, Old Wound | 6 Rebel Traits |
| M-13 | 🟡 | Specialty abilities (the active ability each specialty gives) | 15 of 16 specialties |
| M-15 | 🟡 | Vehicle stats and a way to own a crewed vehicle | Player-owned cruisers, the Driver specialty |
| M-17 | 🟡 | Items with no mechanics yet (`live:false`) | 7 catalogue items and the owned rocket launcher; kept out of the market |
| M-18 | 🟡 | Rev 2+ market weights | Black Market stock once Level 2 lands |
| M-21 | 🟡 | No art descriptions for the fuel depot and the Bruiser | Both draw restyled fallbacks |
| M-22 | 🟡 | Galaxy follow-ups: locked-world dive-in, mission regions, phone World view, Missions view | Exact marker placement; the phone World view ships provisional |
| M-23 | 🟡 | Gunship rocket counterfire built, but no enemy spawns with a rocket launcher; shot-down ship has no campaign cost | The gunship risk you specced never triggers today |
| M-24 | 🟡 | Loot rules still open: random crates, gear lost on death (enemy drops are built) | Rolling loot crates; Messy |
| M-28 | 🟡 | Vehicle criticals and wreck damage are placeholders | How vehicle fights feel |
| M-29 | 🟡 | Art follow-ups from the October 5 art handoffs | A weary icon; Helix and the ship weapon makers in the Gear doc; poses that wait on items |
| M-30 | 🟡 | One map per mission type | Every deployment of a type plays on the same layout; only the names change |
| M-31 | ⚪ | Ship names: a bought ship is "Hauler 2" | Mission lines read "the Hauler 2"; a non-Graf transport would still be drawn as a Graf |
| M-32 | 🟡 | Support unlocks that wait on systems not built (the Network, crafting, research…) | 97 of 161 niche unlocks and 3 of 16 base effects; 12 niches have nothing live yet |
| M-33 | 🟡 | Haven Rock art: no Tech Lab furniture or simulator pod in the kit; the base alert has no rule | The Tech Lab draws a stand-in; the alert fires at 70 network exposure |
| M-34 | 🟡 | Prologue: stubbed beats (security forces arrive, the first Campaign, the farewell) | Everything after Raid the Bunker; the prologue ends at its frontier until they are written |

(Counts are as of today: 12 of 45 Character Traits and 27 of 59 Rebel Traits are listed but never granted.)

---

## 1. Conflicts
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

### C-19 ⚪ Ships live in the Arsenal, not their own Fleet tab
*(Numbered C-12 by mistake when it was added; C-12 is Cass's Door Gunner in the Resolved log.)*
The Gear doc gives ships a tab of their own; the Market/Arsenal handoff puts them under the Arsenal's
Ships chip, and you said that is "fine for now". Built that way. **Needs from you:** say the word if and when a
Fleet tab should exist, and what it would hold that the Arsenal's Ships view does not.
**Your call:** _resolved for now ("fine for now"); reopen at will_

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

### C-15 ⚪ Prologue quips are placeholder lines
The three soldier quips after the prologue briefing (A3 of the handoff) are reused lines: the old cinematic lead
line, one of Runa's barks and one of Kel's. They sit in one table, `PROLOGUE_QUIPS` in `game/js/ground.js`, so
they can be rewritten without touching anything else. **Needs from you:** the real lines (and whether each should
be pinned to a named rebel or go to whoever stands first, second and third).
**Your call:** _open_

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

### C-24 ⚪ Enemy types and loadouts the Enemies doc doesn't cover
The enemy roster (the Enemies tab of the spreadsheet, `enemies` in `db.json`) follows the Enemies doc where it
says something, and the art kit where the doc is silent. Every enemy spawn names a row, and what the row carries
is what they fight with and drop. Where I had to guess:
- **Types the game needs that the doc doesn't have** (`in_doc` FALSE): the Haven Rock squatters and Boss Craw, the
  Tithe depot's guards and warden. Two tower lookouts are a deputy and a depot guard with a hunting rifle and
  sniper stats set on the spawn. In space (the Space Enemies tab): Commandant Vex's Academy Commandant type, the
  Academy Cadets and the Fuel Depot. The doc's four Tier 1 space types (Monitor, Pursuer, Mag-Clamper, Mote) are in.
- **Doc types not in the game yet:** Bureau Officer (a Tier 2 type that may rarely appear in Tier 1 once the
  intelligence meta game's risk is specced, per your C-4 answer), Shorto Shotty, Tavern Scum, the Floatin' Truck,
  and all of Tier 2 and 3.
- **Loadouts:** Hegemony security carries Patriot kit: the HG-40 pistol (Patrolmen, shieldmen, depot guards),
  EG-55 Peacekeeper Carbine (riot riflemen; Fightstar plasma now), Police Helmet and Vest (riot police; Police Vest
  on depot guards). Riot shieldmen carry a Riot Shield that soaks hits from the front until it breaks. Policebots
  carry the Auto Plasma Hand. Outworlders keep frontier guns (Cowboy, Varmint Shotgun); deputies and the sheriff wear
  a Police Vest because the art kit draws one, and the sheriff a Cowboy Hat. Squatters wear nothing. **Now that
  armour works, what they wear matters:** a Police Vest is a 20-point armour bar, a Police Helmet 12, on top of the
  row's health.
- **Placeholder stats:** the HG-40 and Auto Plasma Hand still copy the Cowboy No.4. The Gear doc now gives them
  traits (HG-40: semi-auto, Sundering; Auto Plasma Hand: plasma, semi-auto, crafted from an Auto): Sundering is in,
  the fire modes are built too (the AI always fires on a weapon's default mode).
- **Looks:** riot shieldmen and riflemen are people in Police Helmets (the `riot` and `riotrifle` archetypes, from the
  art handoff); the sheriff wears his Cowboy Hat on screen too. Patrolmen draw no vest.

**Needs from you:** the real loadout per type whenever you spec it in the Enemies doc (straight into the Enemies
tab), stats for the HG-40 and Auto Plasma Hand, and whether the squatters and depot guards should become doc types.
**Your call:** _open (Enemies doc update pending)_

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

### C-42 🟡 The Network (Intelligence tab): every number is a placeholder
All four phases of `docs/ui/SCREENS-HANDOFF-2.md` §3 are built, but the Network doc's rules weren't in hand, so
the handoff's §6 numbers are mine until you set them:
1. **The interrogation clock is 4 days** (the doc says 3–5, by usage and cell size). A burn's expected Leads:
   the handler, plus — if the Source was ever Visited face-to-face — the way to Haven Rock, otherwise their
   local cell. A run-out clock has a 45% chance of the Source holding out.
2. **Exposure:** +4 per extracted Lead, +2 per mission run, +1 per liberation gain and +6 for a liberated
   region; bands at 0–24 / 25–49 / 50–74 / 75+; no decay.
3. **Agent stats** seed at Tradecraft 15 (cuts his Sources' daily Risk gain), Cover 70 (−15 while in transit,
   back on arrival), Rapport 20 (shown but **not yet wired** to cultivation outcomes). The seeded Agent's cell
   is 2 + the Intelligence Centre's rooms (so it matches the network capacity); later Agents start at 1. Level
   growth isn't built.
4. **How new Agents arrive is unbuilt.** The handoff calls them a dedicated recruit type but gives no path;
   every campaign (and every old save) seeds exactly one, posted where the sources are.
5. **Costs and durations:** Disinformation 2 Intel; Counter-Intel Sweep free (−3 cell Risk, 20% "tail spotted"
   flavour); Lie Low 3 days (−3 Risk a day, no income); Repost 2 days.
6. **Recruitment moved** (§3.5): the Command Center keeps candidate review and its staffing bonus to the
   search; the 200-credit drive is gone. Confirm what else the room keeps.
7. **Escalation by band:** leaded Sources gain Risk and leaded handlers lose Cover daily; High sweeps leaded
   worlds; Max can capture a hot Source of a low-Cover leaded Agent. The Investigator shows as the locked
   Revolution-2 card; **the base raid is not built** (it follows the doc's gates).
8. **The save field is `G.bureauLeads`, not the handoff's `G.leads`** — that name already belongs to the
   Support system's Niche Leads, and the two collided.
**Needs from you:** the §6 numbers, a path for recruiting Agents, and a call on the base raid.
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

### C-48 🟡 Prologue text still to write
The designer is replacing Claude-written tutorial text, so where the doc has no words yet the game shows
`[TEXT NEEDED: what this must say]`.

**Shown now: Ambush: Extract VIP** (the Missions tab of the text spreadsheet, `TYPES.ambush` in
`game/js/mission-text.js`). The doc gives its name, description and objectives; a few lines that fit word for word are
Rescue Dissident's (the prisoner's lines, the cost line, the prisoner lost). Rescue Tachi shows these:
| Line | Where it shows | What it must say |
|---|---|---|
| `hook` | A Source's offer of the job (none offers it yet) | A source tips us off about a convoy moving a prisoner through {place} |
| `after` | The Source's follow-up after a win (Rescue Tachi skips it) | The source reacts to {npc} being freed |
| `banner` | Under the mission name as it starts | A short banner line |
| `calm`, `alert` | The top bar's status | The convoy has not noticed us / the convoy is alerted |
| `hint` | The briefing's hint | Once the shooting starts the truck runs for the edge, so stop it first |
| `arrive` | The transport pilot's call on landing | The pilot sets the squad down near {place} and pulls back |
| `float.flee`, `float.stopped` | Over the truck | It is running / it is stopped |
| `log.flee`, `log.stopped`, `log.free`, `log.escaped` | The combat log | The truck makes a run for it / it is stopped, get to its doors / {npc} is out, escort them back / it got away with {npc} |
| `end.win`, `end.loseEscaped`, `end.lose` | The end screen | {npc} freed and aboard / the truck got away with them / the squad was overrun |

**Shown now: the Lie Low step** (`PRO_TEXT.lieLowStep`, the Prologue tab): the guided step after Someone's Asking
Questions that points at Lie Low on Tachi's rail. It must tell the player to order Tachi's cell to lie low until the
heat dies down (and, if you like, a title for the step).

**Shown now: phase 4** (`PRO_TEXT`, the Prologue tab):
| Line | Where it shows | What it must say |
|---|---|---|
| `recruitPointer` | The pointer at **Recruit** on Tachi's rail (beat 19); it points at the Intelligence tab first | A short label: send Tachi to recruit the pilots the bunker job needs |
| `marketPointer` | The pointer at the Black Market tab (beat 20) | A short label: open the Black Market |
| `mercTut` | The callout on the mercenary lot after Sweet Tooth's intro (beat 21) | How to hire a mercenary (this one is always there); perhaps that a hire needs a free bunk (C-47 item 25) |
| `haulerHangar` | The callout on the Hangar (beat 22) | Build Hangar room for 4 starfighters and 2 transports |
| `haulerBuy` | The callout on the Graf hauler lot (beat 22) | Buy a second Graf hauler from the Black Market |

**Shown now: Steal Ship** (`TYPES.stealship` in `game/js/mission-text.js`, the Missions tab). The doc gives its name,
description and objectives (the last row, "Get the squad back to the {transport}", is Disrupt Comm Towers' words).
Raid the Bunker shows these:
| Line | Where it shows | What it must say |
|---|---|---|
| `hook` | A Source's offer of the job (none offers it yet) | A source tips us off about a ship we could steal at {place} |
| `after` | Cass's follow-up after the win | The source reacts to the ships we stole |
| `banner` | Under the mission name as it starts | A short banner line |
| `calm`, `alert` | The top bar's status | They have not noticed us / they are alerted |
| `hint` | The briefing's hint | A pilot hotwires their ship by staying near it; the fuel line and clamps come off with Work |
| `arrive` | The transport pilot's call on landing | The pilot sets the squad down near {place} |
| `float.away` | Over a ship as it lifts | {ship} is in the air |
| `log.atPanel`, `log.away`, `log.allAway` | The combat log | {shipPilot} is at {ship}'s panel, keep them covered / {shipPilot} lifts {ship} off / every ship is ours, back to the {transport} |
| `float.lost`, `log.lost` | Over a ship, and the log, when its pilot is lost | {ship} stays grounded / {shipPilot} is lost, {ship} stays on its pad, the others can still be taken |
| `end.title`, `end.win`, `end.someLost`, `end.losePilot`, `end.lose` | The end screen | The ships are ours / stolen and out / not every ship came home ({ship}: those left behind) / every pilot was lost / the squad was overrun |

**Shown now: phase 5** (`PRO_TEXT`, the Prologue tab):
| Line | Where it shows | What it must say |
|---|---|---|
| `bunkerPlan` | The callout on the plan's empty asset slot when Raid the Bunker's plan opens (beat 23) | Add the second hauler as an asset: it brings the pilots in later as Reinforcements |
| `bunkerPass` | The callout on the Reinforcements hauler's passengers, once it is added | Load the three pilots (a Graf seats 4, so the fifth soldier rides with them) |
| `bunkerCallT`, `bunkerCall` | The coaching card in the fight, in planning while the hauler is ready (its title, then its text) | Once it's safer, call the pilots in with Reinforcements from Fire Support, and they take the ships |
**Needs from you:** the words for each row. You'll write them in due course; until then the marked placeholders stay.
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

---

## 2. Missing systems

Each item says which listed traits or features it keeps switched off (they appear on the dossier's trait lists
and in the registry but are never granted).

### M-1 🟡 Per-rebel Risk and notoriety
**Blocks:** Wanted, Hegemony Informant, Defector, Rebel Celebrity, Propaganda Poster, Hero of the Rebellion, Made a
Name for Themselves, Symbol of the Rebellion (Rebel Traits); Streetwise and Former Criminal
(Character Traits, which reduce it).
**Why:** today there is one number, network exposure (`G.risk`), and only Sources move it. The traits describe
Risk per person and per situation.
**Needs from you:**
1. One network-wide meter that rebels add to, or a notoriety number per rebel?
2. What does Risk *do* at Level 1 and at Level 2 (raids and Alerts begin at Level 2)? It sets the size of the numbers.
3. What does "identity is known" mean as a state, and what clears it (time, a Source going quiet)?
4. How are Wanted, Informant, Defector, Celebrity and Poster acquired: mission rewards, a roll after loud missions,
   or a threshold of kills and notable wins?
**Interim:** none are granted; Streetwise and Former Criminal show on the dossier but change nothing.
**Your call:** _open_

### M-2 🟡 Capture, interrogation and ambush
**Blocks:** Captured, Tortured, Survived an Ambush, Haunted; the *Rescue Prisoners* and *Break
Out VIP* missions named in the Rebels doc.
**Why:** a downed rebel today simply comes home injured, and enemies never ambush.
**Needs from you:**
1. When is a rebel captured: a chance when a mission fails and they are downed? What chance?
2. What does captivity look like: off the roster for N days, a rescue mission, then interrogation (does it raise
   Risk, burn a Source, or cost the rebel?), then released, executed or turned?
3. What triggers Tortured, and does it carry an injury?
4. What makes a mission an ambush (a burned Source, high Risk, Security 3+, a trap mission type) and what changes
   in the scene (alerted enemies, a bad starting position, the first round theirs)?
5. Haunted: what tags and what event set it (see M-7)?
**Your call:** _open_

### M-3 🟡 Family
**Blocks:** Family of [B], Hegemony Family.
**Needs from you:** how does a relative come about (a recruit arrives with one, a rebel reveals one, a rescued
prisoner is someone's relative)? Is the "large morale effect" a bonus when together, a penalty when apart, or
both? Is the relative always on the roster, or sometimes outside it (and then what events)?
**Your call:** _open_

### M-4 🟡 Revive and rescue in space
**Blocks:** Failed to Save [B]; the space half of Saved/Owes a Life.
**Why:** ground combat has Treat Wound and rescue credit. Space has nothing similar: a shot-down pilot is lost.
**Needs from you:** is there a window to save an ejecting pilot (a wingman covering, a tow)? Does it cost an
action, and what does a failed attempt do (the trait fires on a failed rescue, or whenever an ally dies in reach)?
**Your call:** _open_

### M-5 🟡 Command decisions and story events
**Blocks:** Inspired, Survivor, Disgraced, Court-Martialled, Abandoned by Squad, Betrayed by [B], and
Hero of the Rebellion / Made a Name / Symbol (a Hero can now emerge in Level 1, so these can be built).
**Why:** these need a decision the player makes (leaving wounded behind, ordering a retreat) or an event the
story makes (a defection, a witnessed act of heroism). Neither exists.
**Needs from you:** which of these you want and what triggers each. My suggestions: Abandoned = wounded left on
a retreat; Disgraced = a failed mission after a rebel disobeyed or panicked; Betrayed = a Source or rebel defecting;
Inspired = a Rally cry that turned the mission or a last stand. And whether Survivor should be a lesser version of
Lost a Squad (a partial loss) or dropped.
**Your call:** _open_

### M-7 🟡 Mission and location tags
**Blocks:** Streetwise (urban Sources), Former Criminal (criminal operations), Haunted (similar circumstances),
and the reach of Mission Specialist beyond mission *type*.
**Why:** missions have a type but no tags for civilian, populated, urban, criminal or enemy type.
**Needs from you:** the tag list (for example civilian / populated / criminal / hegemony-military) and which
missions and Sources get each. I can start with a guess if you would rather edit it.
**Your call:** _open_

### M-8 🟡 Boarding theatre
**Blocks:** Marines doing anything a Soldier does not. Marines exist as data (a ladder, a gear set, the dossier),
but no scene needs them and no recruit is ever a Marine.
**Needs from you:** is boarding in Level 1? If so, a brief (round structure, objectives, how it differs from
ground); if not, confirm Marines stay data-only.
**Your call:** _open_

### M-9 🟡 Rebel-linked economy hooks
**Blocks (Character Traits that are listed but have no effect):** Former Hegemony Officer (+1 Intel on Hegemony
missions), Former Engineer (Materials cost), Academic (Intel from a posted facility), Politician (diplomacy
quality), Industrialist (Materials generation), Intimidating (interrogation and coercion missions), Pragmatic
(reduced costs on certain operations).
**Why:** each needs a place in the economy that reads the *person* (posting a rebel to a room, picking a rebel
for a diplomatic task) rather than the room. Most rooms work without people today.
**Needs from you:** which rooms take a posted rebel and what they produce, and which of these should be passive
(applies from the roster) versus active (applies when posted or chosen). Also: what are "interrogation and
coercion missions"? (See M-2.)
**Your call:** _open_

### M-10 🟡 Carried-gear effects: Strong, Scrawny, Messy, melee, lost gear
**Blocks:** Strong (+20% melee; a Heavy weapon as a primary, a deployable without deploying it), the melee half of
Scrawny, Messy (10% to lose a piece of gear at launch).
**Done since:** armour is built (M-16 in the resolved log). The Rebels doc renamed **Weak** to **Scrawny** and gave
it +2 defence on the ground: that half is live (the save key stays `weak`).
**Why the rest waits:** melee barely exists (bare hands and the Bruiser's fists are the only melee; the Power Baton
has no rules), Strong's Heavy rule needs a check in the slot rules (the Back slot exists now: C-25), and "lose a
piece of gear" needs a return rule.
**Needs from you:** whether melee is a real action, and what becomes of lost gear (gone, or found again after the
mission?).
**Your call:** _open_

### M-11 🟡 Pilot critical injuries and space-side gear
**Why:** only ground fighters roll critical injuries. A cockpit breach in space gives a concussion; nothing else.
Gear slots only matter on foot; fighters have loadouts from the database but pilots carry nothing personal.
**Needs from you:** should pilots roll injuries from hull criticals? Which of the 12? And should a pilot's
gadgets matter in space?
**Your call:** _open_

### M-12 🟡 Old injuries
**Blocks:** Limp, Old Wound, Shrapnel (Rebel Traits). The current conditions (Broken Leg, Shrapnel) cover the
same ground, so I did not grant the traits. Lost an Eye, Lost an Arm and Prosthetic are the same story: the
Medical section on the dossier shows permanent losses and fitted prosthetics, so the traits are not granted either.
**Needs from you:** should a long-untreated Broken Leg become a permanent Limp, or an old injury flare up as Old
Wound? What flaring means (a random penalty on a mission)?
**Your call:** _open_

### M-13 🟡 Specialty abilities
**Blocks:** 15 of the 16 specialties, which are labels with no effect. Direction from you (C-5): each specialty
gives **a cool active ability plus slight bonuses to a related skill**. Combat Medic is built as the first
example (+3 Presence, and Treat Wound that reaches further and covers two wounds with one pack). Vanguard
(+1 aim) and Dogfighter (+1 aim) still use the old flat bonus and should become a skill bonus plus an ability.
**Needs from you:** the active ability for each specialty. My first guesses are below, so edit freely. "Skill" is
the related skill that gets the slight bonus (about +3).

| Specialty | Skill | Proposed active ability |
|---|---|---|
| Field Technician (live) | Presence | Overclock: a hack or technical objective finishes in half the time |
| Vanguard (live) | Aim | Push Forward: once a mission, a squad mate in reach advances without losing cover and takes +1 to hit for the round |
| Gunner | Constitution | Suppressing Fire: pins enemies in a cone so they take −2 to hit for the round |
| Commando | Agility | Ghost: one round of true stealth even after being spotted |
| Assault | Aim | Breach and Clear: a rocket or heavy shot also stuns anyone next to the target |
| Combat Medic (live) | Presence | *(built as the Treat Wound bonuses; a second ability is open)* |
| Demolitions Specialist | Constitution | Shaped Charge: a thrown or planted charge ignores cover and walls |
| Marksman | Aim | Called Shot: a held shot at long range that cannot miss a target in the open |
| Commander | Presence | Rally Orders: the squad acts first next round |
| Driver | Agility | Hard Extraction: the squad extracts one round faster (vehicle handling is in M-15) |
| Dogfighter (live) | Aim | Tail Chase: a free shot at a ship that has just passed behind them |
| Leader | Presence | Wing Command: every ship in the wing takes +1 initiative for a round |
| Bomber | Aim | Bomb Run: a bomb that hits everything under its path |
| Fire Support | Cunning | Danger Close: a strafing run on a ground target the ground team has marked |
| Flight Engineer | Cunning | Field Repair: restores part of a wingmate's armour in flight |
| Shipbuster | Aim | Alpha Strike: a torpedo or heavy shot at a fixed point or a large ship, ignoring shields |

**Your call:** _open_

### M-15 🟡 Vehicle stats, and a way to own a crewed vehicle
**Blocks:** a player-owned vehicle that needs crew (the planning board and the Fire Support menu's **Deploy
[Vehicle]** already take one, but nothing gives the player one); the Driver specialty ("Handling vehicles"), which
does nothing.
**Why:** the Asset Sheet's Vehicles tab has no entries, so the cruisers' numbers (hp, armour, TN, speed, seats, guns)
are my placeholders carried over from the old enemy units. They live in the enemy roster (the Enemies and Vehicle
Seats tabs of the spreadsheet), so your numbers can go straight in there. Vehicle armour is its own column there.
A cruiser stolen mid-mission is not kept: the *Steal [Vehicle]* mission type is still waiting on its design.
**Settled:** a wrecked vehicle or Bot is lost for good (you may revisit it later). The Fire Support gdoc entry for
Deploy [Vehicle] is yours to write.
**Needs from you:** vehicle rows (hp, armour, TN, speed, positions and which are enclosed, weapons per position),
how the player obtains a vehicle (Steal [Vehicle], keeping one taken in a mission, buying one), and what a Driver
specialist adds (speed, a better TN while driving, ramming?).
**Your call:** _open (wrecks settled)_

### M-17 🟡 Items with no mechanics yet (`live:false` in the items table)
**Blocks:** these catalogue items from being stocked by the Black Market or carried: Improvised Plasma SMG
(automatic, Unstable), Repurposed Mining Laser (a deployable: a cone sweep and a Recharge action), Molotov Cocktail
(fire, and an Extinguish action), Guardian Angel Drone (intercepts one attack), Auto Core Improvised Charge, Stim as a
carried item (the ground scene gives every rebel one built-in stim today) and the Power Baton (melee, Stunning). The
Gear doc describes all of them and the art kit has their poses and effects (`misfire`, the Mining Laser's
`fire`/`recharge`, `burning`/`extinguish`, `stunned`), so they wait on building, not on you. The **Improvised Rocket
Launcher** is also `live:false`: the supply-drop rule removes a fired rocket from the carrier's weapons mid-mission,
but nothing says whether an *owned* launcher is spent for good (debited from the armory) or just reloaded back home.
The **Frontier Floatin' Truck** stays out of the roster until it has stats (see M-15).
**Done since:** the Razorrat LMG and the Riot Shield are live (resolved log, C-25).
**Needs from you:** for the rocket launcher, whether one shot consumes the owned item; for the rest, nothing until
I build them (say if one should jump the queue).
**Your call:** _open_

### M-18 🟡 Rev 2+ market weights
**Blocks:** nothing yet (the Black Market rolls at Revolution Level 1 only). The handoff gives Rev 1 weights
(Weapon 28 · Gadget 24 · Mercenary 14 · Armour 12 · Ship weapon 10 · Vehicle 8 · Ship 4) and says the intent for
Rev 2+ is to move weight from kit toward ships, vehicles and mercs.
**Needs from you:** the Rev 2+ weight table, before Level 2 content lands. It is a row in the Market Weights tab
of the spreadsheet now (C-10): add a row with `rev` 2 and the game picks it up.
**Your call:** _open_

### M-21 🟡 No art for the fuel depot or the Bruiser
**Blocks:** nothing playable — both draw restyled fallbacks (the depot keeps its octagon with the kit's cel
shade and visor slit; the Bruiser borrows the Policebot archetype at 1.25×).
**Needs from you:** a line or two describing each (the Enemies doc stops short of them) and I'll add proper kit
entries.
**Your call:** _open_

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

### M-23 🟡 Gunship counterfire is live, but nobody can shoot back yet
Per your spec, any hostile with a rocket launcher now gets a shot at an orbiting door-gun gunship
(one roll each, **14+ on a d20** brings it down — my number, tune at `DG_FLAK_TN` in `ground.js`). Two gaps:
1. **No enemy currently carries a rocket launcher** — `rocket` only reaches rebels via the Supply Drop — so the
   counter never fires today. Tell me which enemy types (or single spawns) should carry one (a Vult heavy in Take
   the Rock? riot squads at higher security?). With the roster that is one cell: `rocket` as their `weapon_2`.
2. **A shot-down support ship**: the crash is visual, the asset is lost for the mission, and the pilot always
   walks away (Cass is story-safe). For the player's *own* Graf later: should the fighter take hull damage or
   be destroyed back at base, and should the support pilot risk injury? Nothing persists right now.
**Your call:** _open_

### M-24 🟡 Loot and drop rules
**Blocks:** random loot of any kind, and the Messy trait.
**Answered (2026-10-05):** downed enemies drop what they carry. Built: every usable item in their roster kit
(`live` items only; built-ins like fists never drop) plus their credits, at the `enemy_drop_chance` rule, which is 1
(always) for now. That is a lot more loot than before (a Steal the Cross run now yields six Police Vests), so tune
the rule, or say "always weapons, sometimes armour", if it floods the stores.
**Still open:**
1. Should some crates roll their contents (e.g. "a Hegemony sidearm, tier 1") rather than list them?
   (`Items.roll` is ready for it.)
2. What happens to a dead rebel's gear: back to the armory (today), or lost on the field (and recoverable if you win)?
**Your call:** _part answered; 1 and 2 open_

### M-28 🟡 Vehicle criticals and wreck damage (placeholders, for you to revisit)
You confirmed the C-7 rules and said vehicle criticals are for another time. What is built, all my numbers:
- A critical hit on a vehicle cuts its speed by a quarter (once).
- A destroyed vehicle throws its crew clear for 10 to 22 each, with a 1 in 4 chance of counting as a critical (so a
  rebel can take an injury); its blast also catches anyone within 130 for 12 to 26 (less further out). The player
  may shoot an empty vehicle to set that off; the enemy never does, and it is never picked as a default target.
- An open gun position (the Dispersal Cruiser's turret) can be shot at +3 TN; enclosed ones cannot be shot at all.
**Needs from you:** the vehicle critical table, when you get to it.
**Your call:** _open_

### M-29 🟡 Art follow-ups from the October 5 art handoff
The handoff landed everything in the resolved log's M-26 row; a few loose ends remain.
- **Weariness** (Rebels doc: a tag on the rebel's icon and an icon by their name) has no icon in the art kit; the
  game shows a "Zz" tag.
- **Makers with no items yet:** LMC, General Astronautics, Nomad and Rook have badges and looks but nothing to wear
  them. The art's style mocks for them (the Arclight, the nomad coat, the Rook helm, the frigate) stay out of the game
  data until the Gear doc names real items.
- **Helix:** the second art handoff of October 5 makes the **Medpack and Stim Helix** (the art kit now draws them in
  Helix's white and teal), so the items table says Helix. The Gear doc does not name their maker yet; add it there,
  or tell me to put them back.
- **Ship weapon makers** are the art's proposals: the BLS-T Repeaters Bhord, the Missiles Varrondow, the drone pulse
  emitters AutoCom, the Pursuer's pulse cannon Patriot. They set the colour of the bolts only.
- **Poses that wait on items:** `burning`/`extinguish` (Molotov), `misfire` (Plasma SMG), `stunned` from Stunning (the
  Power Baton), the Mining Laser's sweep and `recharge` (all M-17). A concussed rebel already uses `stunned`.
- **Personal shields:** the hex bubble and the shield bar are wired, but no Level 1 item grants a shield.
**Needs from you:** Helix and the ship weapon makers in the Gear doc; a weary icon is the art chat's.
**Your call:** _open_

### M-30 🟡 One map per mission type
C-26 made a mission type's words reusable, but each type still has exactly one hand-built map in `SCENARIOS`
(`game/js/ground.js`): every Steal Fuel is the Redrock Flats depot, every Blow Up Auto Factory the Kiln Ridge plant,
whatever world the board says. Only the names change (the place, the target, the key building's label). Disrupt
Comm Towers already picks its guard roster by region (`variant`); the layout is still the same.
**Blocks:** maps that differ between deployments of a type.
**Needs from you:** how you want variety: several hand-built layouts per type picked at random, layouts per world
style (desert town, industrial, river port), or generated layouts from a set of building blocks (the Take the Rock
map is already built that way from carved rooms). Also whether a world's look should change the map's art.
**Your call:** _open_

### M-31 ⚪ Ship names
Mission text now names the transport the player picked (C-26). The Marta and Dustfall are named; a ship bought
from the Black Market is called by its class and a number ("Hauler 2", "Talon 3"), so a mission reads "Call in the
Hauler 2". Only the Graf carries troops today, so the ground scene always draws a Graf; a new transport class would
need its own ground art.
**Blocks:** nothing live; how bought ships read in mission text.
**Needs from you:** a list of ship names to draw from, or a rename button in the Arsenal, or both.
**Your call:** _open_

### M-32 🟡 Support unlocks that wait on systems not built
The Support Specialties doc lists 161 niche unlocks and 16 base effects; 64 unlocks and 13 base effects work (C-28).
The rest show on the dossier with what they need. Niches with nothing working yet cannot be trained: Chemist, Handler,
Counterintelligence, Roboticist, Ordnance Tech, Armourer, Signals, Quartermaster, Procurer, Scientist, Envoy and
Agitator. Crewman is parked until capital ships; Archaeologist is left out (optional in the doc).
| Waits on | Unlocks |
|---|---|
| The Network (Agents, Cover, Leads, Exposure, the Bureau) and postings | 28: all of Handler and Counterintelligence, most of Signals, Source Vetting, Read the Bureau, Smuggler's Haven, Shadow Economy, Uprising Prep, Day of Revolt, and the four Postings |
| Hegemony actions to warn of | 4: Early Warning, Pattern Analysis, Predictive Model, Intercept |
| Crafting (recipes from Materials) | 16: Ordnance Tech, Procurer, three Armourer, Requisitions |
| Carried stims and specialty gadgets as items | 11: Chemist, Kit Prep, Standard Issue, Waste Not, Gadget Workshop |
| Implants | 4: Augments, Hegemony Salvage, Second Slot, Rebuilt |
| Weapon attachments, gear damage, trackers, ship Utilities | 8 |
| Drones and building Autos | 7: Roboticist |
| Research, neutral factions, Hegemony stability, Support decay | 19: Scientist, Envoy, Agitator, Goodwill |
| Deployment zones, mission approaches | 2: Insertion Point, Adaptive Orders |
| The Leader's Take Point (M-13) | 1: Formation Calls |
**Done since:** Flight Controller and Combat Support (all but Formation Calls), at your word.
**Needs from you:** which of these to build next. The Network proposal unlocks the most (Postings too). Also: the Network proposal's Access ladder (Foothold, Network,
Uprising) is not in the game, which Postings need.
**Your call:** _open_

### M-34 🟡 Prologue: stubbed beats
The design doc's story continues past *Raid the Bunker*, but these beats aren't written yet. Each sits in `PROLOGUE`
(`game/js/prologue.js`) as a commented-out beat marked `// DESIGN OPEN`, so the order is visible; until they are
written the prologue ends at its frontier and the normal game takes over.
| Beat | The doc says | Blocked on |
|---|---|---|
| `security_arrives` | Security forces arrive at Akkaro: the enemy moving when the player heats up a location | The regional Alert system (from the Mission Balance design) isn't built |
| `campaign` | Venn delivers the first **Campaign**, *Liberate Akkaro*: a series of missions with big rewards | The Campaign section is WIP. `CHAINS` is the nearest system to extend. *Gain Space Superiority* (Destroy Squadron) needs a new space scenario (only `depot` and `instructor` exist) |
| `farewell` | Akkaro liberated; Venn and Cass say goodbye and stop being Sources; the first proper Source (Tessaly) arrives with the Sources tutorial | The two above |
**Needs from you:** the design for each (the Alert system, the Campaign, the farewell's words).
**Your call:** _open_

### M-33 🟡 Haven Rock art: the Tech Lab, the simulator and the base alert
The Haven Rock handoff (art update 4) now draws the base map and every walk-in view. Three things it doesn't cover:
- **The Tech Lab** isn't in the kit (it furnishes nine rooms; the game has ten). It gets the kit's walls and floor
  in the Command Center's floor colours and a grey stripe, plus a stand-in I drew: a bench with two glowing screens
  per tile, a Technician's post at each bench (💻), and two small screens per tile on the map.
- **The Training Hall's simulator pod** isn't in the kit's Training Hall (target wall, dummies, mat, weight rack),
  so the walk-in view no longer shows it. The Simulator button in the room window still works.
- **The base alert.** There are no raids yet, so the whole base pulses red when network exposure (`G.risk`)
  reaches **70** (`BASE_ALERT_RISK` in `base.js`). I picked 70, where a Source starts to risk a burn.

Smaller choices: the Maintenance Bay's pad holds the most damaged ship (the one the bay repairs); Surgery in a
one-tile Infirmary isn't drawn, because the kit only gives it a tile in a bigger room; free rebels walk the longest
corridors; resting and conked-out rebels sleep on the Barracks beds, and the laid-up lie on the Infirmary beds.
The kit's Barracks shows 3 beds a tile whatever the upgrades (Bunks stack them, Quarters add partitions), so the
beds on screen can number fewer than `bunkCap()`.
**Blocks:** what the Tech Lab and the simulator look like; when the base alert fires.
**Needs from you:** Tech Lab furniture and a simulator pod in `sr-art.js`, and an alert rule (an exposure threshold,
or the raid system when it exists).
**Your call:** _open_

---

## 3. Resolved log

Earlier decisions (Heroes wait for Level 2, Marines data-only, rank decoupled from level, per-rebel morale on top
of base mood, USAF pilot ladder, recruiting through the Command Center) are recorded in `docs/REBELS_PLAN.md` §2.

| ID | Decision | Date | What was built |
|---|---|---|---|
| C-33.7 | **No command bar out of combat** (the designer, 8 October, confirming `docs/ui/SCREENS-HANDOFF.md` §0.1 for every screen built): a screen's buttons sit with what they act on; Advance day stays bottom-right on its own. | 2026-10-08 | The base's bar is gone (`#baseGo`: Advance day alone, no count line). **Galaxy:** the selection's actions (Contact, Visit, Silence, Cut loose, Scout, Raise access, Run the job, Back…) are buttons at the foot of its panel (the region card when one is open), with any reason they can't be used under them; on a phone, in the bottom sheet, which now sits above Advance day (it had been running off the top of the screen). **Arsenal:** Give to… / Sell, and Hangar / Refit for a ship, sit in the dossier under the name. **Black Market:** the open lot shows its stats row and Buy / Buy all (Hire) under its name; the restock count is Sweet Tooth's, in the rail. Keys 1–9 press them as before. The "No command bar out of combat" commit |
| C-47.5 | **Steal Ship and Raid the Bunker** (the designer, 8 October). A prize pilot lost (dead, or down with no way left to bring them round) before their ship is up does **not** fail the mission: that ship stays on its pad and the others can still be stolen. Only losing every pilot fails it. Steal the Cross works mechanically as a Steal Ship mission (one ship). The rest of phase 5's choices stand: the Reinforcements hauler (the first transport added as an asset on a mission flown with Reinforcements, carrying the prize pilots and any soldier the first hauler has no seat for; once it has brought them it can't be re-tasked); hotwiring by standing on the pad (a round at a time in combat, 4.5 s out of it, 2 to finish, no Work order); a ship flies once hot with its own clamp and fuel line off; one objective row per ship at its current step; the bunker map and its ten guards; stolen ships at 85% hull, named by class and number, each handed to a pilot without a ship, fenced with no pad free; the call-in card only during the prologue. The Steal Ship lines stay `[TEXT NEEDED]` placeholders until the designer writes them (C-48). | 2026-10-08 | Phase 5 built the rest. Lost pilots: `prizeLostCheck()` in `game/js/ground.js` grounds the ship, fails its objective row and logs it; the way home opens once every ship is up or lost and at least one is up; the win's end screen notes the ships left behind and the result lists only the ships flown; every pilot lost fails as before. Three new placeholder lines (`float.lost`, `log.lost`, `end.someLost`). `tools/stealship-smoke.js` covers it. The "Steal Ship: a lost pilot grounds one ship" commit |
| — | **Prologue: decisions** (the designer, 8 October, `docs/PROLOGUE-HANDOFF.md` §7), recorded so later work doesn't reopen them: (1) the Sources tutorial plays with the first brand-new Source, not before *Raid the Bunker*; the **?** stays on Sources throughout; Cass and Venn are called Sources from the start. (2) Tachi recruits three pilots, not two. (3) *Raid the Bunker* teaches the player's reinforcements: a second transport added as an asset sets up Reinforcements, loaded with the pilots, who are called in once it's safer. (4) Gated tabs are hidden, not shown locked. (5) The bunker job arrives the day after Lie Low is ordered. (6) Recruiting is taught in Run Your Network (Step 5); the later recruit beat is a prompt, with no second tutorial. *Cook the Depots* is now **Torch the Depots**. | 2026-10-08 | Phase 1 builds (1) (the Sources tutorial waits for the first new Source after the frontier, its Making Contact page the Agents version), (4) (every gated tab and button is hidden; one that opens pulses once with a New tag) and the rename. (6) is built in phase 2 (Run Your Network's Step 5 opens Recruit); (5) in phase 3 (the beat after Lie Low waits one day); (2) in phase 4 (the next Recruit brings exactly three Pilots); (3) in phase 5 (Raid the Bunker's second hauler is Reinforcements, carrying the pilots: C-47.5). The "Prologue phase 1" to "Prologue phase 5" commits |
| C-46.1 | No Agent until Tachi Gard joins; she is the first, posted to Akkaro with Cass and Venn as her cell. | 2026-10-08 | New games seed no Agent; `mkAgent()` takes a named person. Rescue Tachi (Ambush: Extract VIP) frees her; she accepts in her comm and becomes the Agent; the Intelligence tab opens with Run Your Network, whose Step 5 opens Recruit. Old saves keep their Agent; a phase 1 save still in the prologue loses its generated one (save version 13). The "Prologue phase 2" commit |
| C-46.2, C-46 question | During the prologue Recruit returns Rebels only; the Intelligence tab is hidden until Tachi joins. | 2026-10-08 | Recruit's potential-Source branch waits for the `sources.new` gate, which opens at the frontier; so do new chains and the candidate queue. Halt and Vokk are no longer queued after the depots. The Intelligence tab (and the Command Center's Intelligence button) is hidden until its gate opens, when Tachi joins (phase 2). The "Prologue phase 1" commit |
| C-45.3, C-45.4 | A flanked target just loses its cover bonus; no extra penalty. Take cover keeps the rebel's shot. | 2026-10-07 | The FLANKED −2 is gone from the Defence card (the move hints still say Flanked). A rebel ordered to Take cover gets +2 and still fires in the engagement; the order's rule says so. "Take cover keeps the shot" commit |
| C-31.5 | The transport assigned to carry the ground team brings the fire support its features enable, with no second ship: a type that can fly a Supply Drop (Marta's Graf Hauler), and Door Gunner Cover from a fitted Door Mounted Gun. My first version (the board toggle removed, the drop paid at the debrief) broke the planning board's design and was undone. | 2026-10-06 | The planning board shows both under Fire support, "From Marta", each a toggle tagged Arranged / Not arranged: the Supply Drop costs 160 supplies at launch as before, Door Gunner Cover is free and on by default. A new Ships column, `supply_drop` (TRUE for the Graf Hauler), says which types can fly a drop; an older workbook without it still imports. In the field the transport works its gun from the air, breaks off (no crash) when a rocket hits, and leaves the gun to make the pickup or land at the pumps. Steal the Cross now has fire support as soon as Marta carries the squad. "Transport fire support" commit |
| C-30 | Enemies keep their range, with counterplay: the shooter is revealed. Every mission's transport leaves after the drop and comes back for the extraction, which is why it can give fire support (door gunner, supply drop). The fire support button was missing in Steal the Cross. | 2026-10-06 | The sight-range cap on enemy shots is gone; a shot marks the shooter through the next round. Every transport leaves and returns. The transport's own supply drop and door gun were built, then undone at your call (C-31 item 5). Readings in C-31. "Downed VIPs" commit |
| C-29 | The rescue readings stand. The mission should not fail when a character the objective needs goes down: only when they die, or cannot be revived for lack of healing items. | 2026-10-06 | One hit from full health kills; a Treat Wound (one Med Pack) revives at a quarter health; untreated Severe Bleeding kills a downed rebel after two rounds; blasts hit the downed; Take the Rock is exempt; the dead are lost, Stabilise still applies. The VIP and the Pilot are now downed rather than lost; readings in C-31. "Downed VIPs" commit |
| — | Your October 6 field list: Flight Controller and Combat Support next; a slimmer Personnel File with a paper doll; faces on the mission briefing; stims as an Action; enemies die and rebels can; the Steal the Cross tower guard, supply drop and transport; no MOVE OUT screen; the Personnel File by double-click in a mission; fewer tags; ships drawn in the roster and ship window; no recruit Terms; Experiences "None". | 2026-10-06 | All built; the readings are C-29 and C-30, Flight Controller and Combat Support are in C-28. the "Field changes" commit |
| M-14 | Support rebels get no skills: they have a base specialty from level 1, a niche at level 3 and unlocks at 3, 7, 11, 15 and 19 (the Support Specialties doc). The staff posts are replaced by the Department Head, Lead Specialist and Staff system, and new features supersede old ones wherever they can. | 2026-10-06 | The whole doc's framework and 51 of its unlocks: see C-28 for what replaced what and M-32 for what waits. Save version 5 turns each post into its room. the "Support specialties" commit |
| C-26 | Curly `{variables}` everywhere; ordinary guards get random names; story missions keep their own endings. | 2026-10-06 | Each reusable type (Steal Fuel, Steal Intelligence, Blow Up Auto Factory, Rescue Dissident, Disrupt Comm Towers) has one text set in `game/js/mission-text.js`: name, target names, offer, follow-up, banner, briefing, objectives (the board, the briefing and the live list read the same ones), hint, arrival call, log lines, end screen. Variables: `{transport}` `{pilot}` `{target}` `{place}` `{npc}` `{npc1}` `{carrier}` `{device}` `{hacker}` `{fallen}`. The transport picked on the planning board now reaches the mission (its name on the LZ, the hauler, the call-in button, every line). Missions on the board read their type's words live (save version 4 drops the old per-mission copy). Hegemony guards get a surname from a pool (a serial for a robot) and their type's lines: alarm calls when they raise the alarm, idle chatter while all is quiet (new: it was never spoken before). Sheriff Reeve, his deputies, Boss Craw and the squatters keep theirs. Lines tied to one place (the toll office, the herders) were made generic or dropped. Each map is still one per type. `tools/mission-text-smoke.js`. The "Mission text per type" commit |
| C-25 | The final slot list is primary, secondary, two gadgets, head, body and back. | 2026-10-05 | Soldiers, Marines and Heroes get a **Back** slot (Pilots and Support do not), in the Arsenal, the personnel file, auto-equip and the squad entry; old saves get an empty one (save version 3). The **Razorrat LMG** and the **Riot Shield** are live. A rebel with one on their back gets **Deploy** (as the round opens, no shot): the Razorrat is set up where they stand and they man it (no sandbags in the field; one emplacement per map), the Riot Shield goes into their hands in place of the primary. Riot shields, the enemy's too, now soak hits from the front until they break (60, the `riot_shield_hp` rule; a broken one is used up and does not drop). **Effect:** riot shieldmen can now be worn down from the front instead of only flanked; the mission hints say so. the "Back slot, deployables, fire modes and the October 5 art handoff" commit |
| M-15 | A wrecked vehicle or Bot is lost for good (to revisit later). | 2026-10-05 | No change: that was already the rule. The rest of M-15 stays open. the "Back slot, deployables, fire modes and the October 5 art handoff" commit |
| M-26 | Claude Design's October 5 art handoff covers the new kit and makers. | 2026-10-05 | New `sr-art.js`, style guide and handoff in. Art for the ST Stiletto, Razorrat, the four head items, the limpet, the shell box and the C90 (the alias is gone); **maker badges** on Arsenal and Black Market cards; **trait and damage-type icons** on the cards and in weapon tooltips; the **EG-55 Peacekeeper Carbine** is Fightstar plasma (C-23 settled); riot police wear Police Helmets (`riot`, `riotrifle`); **Sweet Tooth** has her own character (M-20 settled); the layered **vitals** bar over units and matching plate and hex shapes in the rail; the shield bubble, armour, shield, Sundering and Piercing hit effects; the `deploy`, `knocked` and `stunned` poses; strafing runs, supply drops and landings drawn by the kit (the run flies the assigned ship); ships parked in the iso hangar with `shipIso`. Loose ends are M-29. the "Back slot, deployables, fire modes and the October 5 art handoff" commit |
| M-27 | Holding's +2 belongs to the Steady trait alone. | 2026-10-05 | Item columns `fire_modes`, `steady`, `knockback`, `stunning`, `unstable`, from the Gear doc. **Fire modes** as the doc gives them (Automatic −5 and a second roll at −10 on a hit; Semi-auto +1 a round on the same target until you move or panic; Fan hammer −5 and double damage; Single shot nothing), chosen with a **fire-mode toggle** in the attack window (F cycles); a weapon starts on its mode with no penalty, and the AI never switches. **Steady:** +2 when braced, or on a target you held fire on, only with a Steady weapon (the Longhorn); everyone else lost the old BRACED +2. **Knockback** (the rocket) shoves the target. Stunning and Unstable wait on their items (M-17). **Effect:** Semi-auto's stacking bonus applies to enemies too, so long fights against one target get more accurate on both sides; holding with an Akli is no longer a bonus. the "Back slot, deployables, fire modes and the October 5 art handoff" commit |
| M-16 | Armour and shields in ground and boarding combat (Ground Combat doc): armour is a bar over health that damage drains first, a shield is a bar over both, raised when activated and hit first; no arcs on the ground; hats are cosmetic. Vehicle armour is its own value, apart from ships. | 2026-10-05 | Items carry `armour` and `shield`; enemy rows carry innate `armour` and `shield` (vehicles and Bots). Worn Head and Body kit gives the bar: Frontier Hardhat 10, Police Helmet 12, Auto Head-Helm 15, Police Vest 20; Cowboy Hat and Baseball Cap 0. Sundering (×1.5 to armour, `armour_sunder_mult`) and Piercing (25% past the armour, `armour_pierce_frac`) follow the Gear doc. Bars draw over every health bar (map pips, the squad rail). A hit the bars soak whole causes no wound or critical injury. Enemies raise their shields with the alarm; a rebel raises theirs with **Shield up** in the attack card (costs the shot). Nothing has a shield at Level 1. **My numbers and calls:** all the values above; armour is mended between missions. **Effect:** enemies in vests and helmets now take 20 to 32 more damage than before (their health was not reduced), so Steal the Cross's deputies and the riot squads are tougher; rebels in looted vests are tougher too. The cruisers and the Strider had armour split out of their old health, so they last as long as before. Tune in the Items and Enemies tabs. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| M-6 | Rest (Rebels & Recruits doc): after two missions without rest a rebel is weary, loses morale and rests at the base a day per mission (any day at the base is rest); used weary, they lose morale and fight worse; kept going, they are conked in the Barracks and need longer. Weariness shows as a tag. | 2026-10-05 | `game/js/rebel-rest.js`: `p.tired` counts missions without rest; Weary at 2 (−4 morale, a "Zz Weary" tag, still pickable), each mission while Weary −3 morale, and −1 aim and −10 nerve in a fight (−1 aim in space); Conked at 4 (+2 to the count, off every list and post until rested). Each day not on a mission rests 1 off; **Heavy Sleeper** 0.5 a day and no morale hits, **Light Sleeper** 1.5 (both now live). Old saves start everyone rested (save version 2). **My numbers:** all of them; the Barracks does not speed rest (the doc does not say). the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-4 | Scope is Level 1 for now; the Base doc's second Fuel is Intel; Bureau Officer is Tier 2 (rarely Tier 1 once the intelligence risk is specced); blank Tier 1 rewards are deliberate, so I put in my guesses; the enemy is the Hegemony everywhere; Fleet Combat is out of scope and Specialties and Locations/Regions are being written in the gdocs. | 2026-10-05 | Repo docs updated (`docs/GDD.md` with a Tier 1 rewards table, `docs/ROADMAP.md`); the old name is gone from the repo. The designer has since fixed the Base gdoc's Fuel line. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-7 | The vehicle rules stand as built, bail-out included (enemies bail out when they surrender); vehicle criticals are for later. Unmanned vehicles should still be targetable, since a wreck going up can hurt someone nearby. | 2026-10-05 | The player may shoot an empty vehicle (never the enemy, and never as a default target); a destroyed vehicle's blast now hits anyone within 130, crewed or not. The placeholder critical and wreck numbers are M-28. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-8 | An owned vehicle or Bot assigned to a mission adds **Deploy [Vehicle]** to the Fire Support menu, which deploys it into the mission (the designer will add it to the Fire Support gdoc). | 2026-10-05 | The menu entry reads "Deploy Old Faithful"; the plan's Fire support area says so. Deployment was already built that way (set down where called at the start of the next planning). The wreck question (lost, or a long repair) moved to M-15. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-9 | Swap the Steal the Cross laser turret for the **Razorrat LMG** (a Gear doc deployable), and add it to the database with its missing stats. | 2026-10-05 | `razorrat` item (Bhord, ballistic, Piercing, Heavy, deployable, Back slot; 30–46, attack +3, range 640: my stats; `live:false` until M-25). The pad emplacement is a Razorrat behind sandbags: Man gun / Leave gun as before; the laser's frontal energy shield (which blocked every shot) is now sandbags worth +3 TN from the front, since the ground has no arcs. The `laser` item is gone. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-10 | The market weights go in the spreadsheet too. | 2026-10-05 | A `market_weights` table (Market Weights tab), one row per Revolution Level it applies from; the Black Market reads it. Only Level 1 has a row (M-18). the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-11 | The Gear doc names the makers; new weapons and makers need Claude Design to add visuals. | 2026-10-05 | Makers from the Gear doc: Cowboy No.4, Varmint Shotgun and Longhorn ’28 are Devlin & Son, the Frontier Hardhat and Mining Laser Praxon, the Patriot items confirmed; crafted items (rocket launcher, Plasma SMG, Auto Head-Helm, Auto Core charge, Auto Plasma Hand, Molotov, Angel Drone) have none; the hats have none. The Manufacturers table follows the Gear doc (Fightstar, Devlin & Son, LMC, Praxon, Helix, General Astronautics, Nomad and Rook added; TenTiU dropped). New: the ST Stiletto (Fightstar plasma carbine, my stats, sold). Descriptions come from the Gear doc. Art is M-26. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-17 | Nothing to change in the handoff ids; region and location names must be renamable later. | 2026-10-05 | Worlds, regions and leads were already saved by id. Missions copied the names: they now refresh from `PLANETDEF` on every load, so renaming a world or region there renames it on missions already on the board (save-smoke checks it). Hand-written story copy (briefings, Source lines) still names places in its text. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-20 | One recovery model, the newer one (conditions at `healRate`). | 2026-10-05 | Being laid up is a condition now (Laid Up, Spinal Injury, Recovering from an Amputation, Prosthetic Surgery) with a `laidUp` flag that keeps the rebel off duty; it heals at the same rate as every other condition (0.25 a day with no Infirmary, 1 with one, +1 with someone on it, +0.5 medic, +1 doctor, +0.5 Surgery Room) and ends as the old counter did (back on their feet, Scarred after five days or more, Nearly Dead after a spinal injury or an amputation, the prosthetic fitted). The Garrison Officer's perk stays as +1 a day for ground fighters. The old `p.injured`, `injDur`, `critHeal` and `prosPending` are converted on load. **Effect:** before an Infirmary is built a stretcher case is out about 12 days instead of 5 (2.4 with a Garrison Officer), and the opening mission's 1 to 3 days become 4 to 12; tune `NO_INFIRMARY` in `rebel-injury.js` if that is too harsh. Commit "One recovery model: being laid up is a condition". |
| C-22 | Space follows the rebels' trait and rank rules (the campaign descriptions are the rules). | 2026-10-05 | Space pilots carry rebel trait keys and each trait does what its card says: Lucky is a 5% chance to survive a killing blow (it was ±1 to hit), Veteran is +1 accuracy and slower to panic (it was +1 initiative and a nerve floor), Unlucky takes 5% more criticals, Brave and Cowardly share one rule with the ground. Friends and In Love now act in space too (panic when the partner goes down), which is what Petra's old "Friends: Joss" did. Green became the Academy Cadets' `nerve_cap` and the roster's `lead`. Ranks: the rebel ladder, or a `rank` title on Hegemony pilot rows (Vex: Commandant). The scene's own trait text and rank ladder are gone. Commit "Space pilots carry the rebels' traits and ranks". |
| C-21 | An owned Strider is the same as the enemy one. | 2026-10-05 | `OWNED_STRIDER` is gone: the owned Bot, the Steal the Strider VIP and the enemy all read the `strider-mk1` roster row (240 hp, aim 1, def 8), so a hacked Strider no longer loses 20 hp on joining. Commit "An owned Strider is the enemy one". |
| C-14 | Every door gunner is zone-targeted, not just Cass's: the gunship-orbit rework (merged from the art branch) anchors any Door Gunner Cover to the player's mark. | 2026-10-04 | `dgTargets` works up to 3 enemies inside the placed zone (240px, growing with the layout scale); Cass's prologue asset still unlocks with its tutorial card and sets `tutFlags.fs` when called. Overrule at will — both halves came from your own handoffs. |
| C-16 | Cass's freighter is drawn in the ground scene by the gun-run rework (merged from the art branch). | 2026-10-04 | The gunship flies in from off the map, orbits the mark with the heavy door gun working and climbs away (`cls:'graf'` art, renamed “Cass’s freighter”). Reduced motion keeps the instant resolution. |
| C-1 | **A.** Pilots follow the database formula (`floor(skill/10) + floor(level/5)` for Aim and Focus), with mood, injury and the Dogfighter specialty added on top. | 2026-10-02 | The `fixed` override is gone. A rebel's skills are carried to the database's 0–50 scale at the base/space boundary (`Rebel.dbSkill`) and the space scene applies its own bonus; mood, injury and specialty ride on top as `aimMod`. Focus is the database bonus alone, so a fresh generated pilot is weaker than before at Aim and Focus. Scripted pilots and rebel pilots now follow one rule. |
| C-2 | The scripted opening rebels are the same for every player but are generated from the same database as every other rebel. | 2026-10-02 | `Rebel.scripted(spec, row)` builds the cast through the normal rebel path. Joss and Sera take level, experience, initiative and skills from their database rows (Joss now starts at level 4 and Sera arrives at level 3, as the database says); the soldiers use fixed values. Sera's Lucky is her Character Trait, not a special case. Petra only exists in the space scenario. |
| C-3 | Revolution Level 1 lets exactly one Hero emerge in a playthrough; if they die there is no replacement. | 2026-10-02 | `G.heroesMade` counts Heroes ever made; Level 1 allows one, Level 2 and above use the normal rules. In ten bot runs a Hero appeared before the escalation in five (days 45–83). The one Hero is for testing; the rate is easy to raise. |
| C-5 | A specialty should give a cool active ability plus slight bonuses to a related skill, depending on the specialty. Support rebels need base-specific skills later. | 2026-10-02 | Direction only for now. Combat Medic is live as the first example (see C-6). The ability for each specialty is M-13; Support skills are M-14. |
| M-19 | Ship weapons live in a store (`G.shipKit`) and a picker fits them — the model the Market/Arsenal handoff §3.3 itself specifies, so no separate answer was needed. | 2026-10-05 | Sweet Tooth sells the BLS-T Light Repeaters, Missiles and Door Mounted Gun; bought weapons land on the hangar racks (`G.shipKit`); the Arsenal's Ships view gains a **Refit** order that fits rack weapons to a ship's mounts (`weapon_slots` from the db) and returns swapped-out weapons to the racks. Built with Phase 4. |
| C-6 | Treating a wound needs an item (a Med Pack); specialist training should add bonuses, never make it harder for the untrained. | 2026-10-02 | A **Med Pack** gadget (four at the start). Ground rebels are handed one in their second gadget slot; Treat Wound uses one pack per action and the card shows how many are left. A used pack leaves the armory at the debrief. The Infirmary makes a pack every three days (two with someone on station) for 8 supplies, up to 4 plus 2 per Infirmary tile. **Combat Medic** is live: treats from 1.5× as far, one pack covers two wounds, and +3 Presence. |
| — | The Strider is a **Bot** (Auto = robot character, Bot = robot vehicle, Drone = robot ship): automated, cannot be manned | 2026-10-02 | `26e3afc` |
| C-12 | Cass's Door Gunner belongs to **Take the Rock** (he's the smuggler who set the squad down in the canyon), not Steal the Cross. One-off: afterwards the player earns fire support by bringing their own Graf with a pilot and a Door Mounted Gun | 2026-10-03 | the "Door Gunner moved to Take the Rock" commit |
