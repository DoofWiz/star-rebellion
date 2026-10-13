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

**Last updated:** 2026-10-13, after building phase F1 of your approved playtest proposal (`docs/ARENA-HC-FEEDBACK-1.md`: faster ships at the full gun reach, the 4 × map with the scenarios scaled, wider spacing, Copy settings, Jump Out and Leave now, the tray and pilot panel above the roster, Commands bottom right opening upward: C-69, C-68). Before that, 2026-10-12, after your first High Command playtest notes (logged with my proposal in `docs/ARENA-HC-FEEDBACK-1.md`). Before that, 2026-10-12, after High Command's phase T4, the last (leaders and promotion tested, the keys, the per-mission metrics, `hc2_lastlight` and `hc3_meltdown` with its 3 / 5 / 7 command point variants, the sectioned HC panel with the tactic weights: C-67 items 30 to 37, C-68). Before that, 2026-10-12, after High Command's phase T3 (the pilot panel with abilities and their AUTO / EMERG / MANUAL doctrine, the commands drawer with the v1 six, command points and objective rewards, pins and panics answered from the feed or the panel: C-67 items 23 to 29, C-68). Before that, 2026-10-12, after High Command's phase T2 (all nine orders and six tactics, the mission rules and their panel, morale and panic, the pilots' assessments, the feed with VIEW and Tab, live camera tiles: C-67 items 14 to 22, C-68). Before that, 2026-10-12, after Arena Type 3, High Command (`docs/ARENA-HC-HANDOFF.md`, phase T1: a third ruleset behind the picker where autonomous wings fly themselves in real time and you order them; `hc1_nightfall` with Attack, Escort and Withdraw, the reinforcement clock, the HUD's top band, roster, wing tray and time controls: C-66 in the Resolved log, C-67, C-68). Before that, 2026-10-12, after your call for more shots doing less damage and a much bigger map (guns fire streams of small bolts at the same damage a second, the map is 2.5 × by default, weapon range and craft speed have room on the panel: C-65, C-65.1 in the Resolved log; C-59 item 12 and C-60's gun rows updated). Before that, 2026-10-12, after your notes on playing E1 under SB (ships flown as bodies along the plan rather than on rails, quicker and smaller bolts leaving the actual guns, thick shield arcs and hull / armour pips on every ship: C-64, C-64.1 in the Resolved log; C-60's projectile rows and C-59 item 6 updated). Before that, 2026-10-12, after the SB planning HUD (`docs/SB-HUD-HANDOFF.md`, phases H1 to H3: a per-ship stepper tray under the selected ship, SEG 1 → action → SEG 2, with the action now resolving between the two segments; ship chips, Execute (n/m planned), hover cards, keys: C-61 in the Resolved log, C-62, C-63; C-59 items 21 and 22 rewritten). Before that, 2026-10-12, after your call to add momentum to SB's reach (the speed carried into a round sets its speed window and how tightly it can turn; enemies too: C-59 item 32, C-59.32 in the Resolved log, C-60). Before that, 2026-10-11, after "it feels like slow motion": SB's rounds are 3 s (a conflict with your SteamBirds note's 6 s, flagged as C-59 item 31), turns brake less, acceleration is quicker, and the reach is documented as worked out per ship and situation (C-59 item 9, C-60). Before that, 2026-10-11, after your second round of SB Test notes (the reach drawn as a spearpoint from the dial, a round worth one dial move with no glide past your line, speed that brakes and powers through manoeuvres, the slip in hard turns, and a manoeuvre-searching AI: C-59 items 6, 7, 9, 11, 26; C-59.6 in the Resolved log; C-60). Before that, 2026-10-11, after your notes on SB Test's feel (smooth motion between sim steps, a chase camera, faster craft, slower glowing tracers with muzzle flashes and sparks, bigger ships with matching hulls, banking and contrails: C-59 item 30, C-60). Before that, 2026-10-11, after your call on SB Test's drag (drag to the destination, and the ship banks there like a plane as far as its dial allows: C-59 items 9 to 11, C-59.9 in the Resolved log). Before that, 2026-10-11, after merging the SB Test ruleset (`docs/ARENA-SB-HANDOFF.md`, phases B1 to B5) into the Arena branch: the picker asks for "SR V2 Combat" or "SB Test" before the scenario, SB runs on its own driver over the same scenario entries (C-59, C-60); this branch's first Arena decisions entry became C-58, as main's C-54 is the CD playtest. Before that, 2026-10-09, after your Arena calls on movement and action points (drag-and-release moves inside each ship's envelope, chained; one AP meter per pilot per round for everything; the Cool bonus: C-57 in the Resolved log, C-55 and C-56 rewritten). Before that, 2026-10-09, after the Arena (`docs/ARENA-HANDOFF.md`: a campaign-free lab for space combat v2, with drawn paths fitted to the dial, continuous simultaneous execution, nerve-priced interrupts and doctrine AI; the decisions are C-58 in the Resolved log, the placeholders C-55, my readings C-56, what waits for E1 M-35). Before that, 2026-10-09, after the 0.2 playtest's §4 (the Black Market's art is never clipped: the wells keep a floor and the art scales inside them, the stall scrolls, the news feed stays off the Market's and the Arsenal's cards; phone rows grow to fit a weapon card: C-51 item 24, C-52, C-53). Before that, 2026-10-09, after the 0.2 playtest's §3 (the prologue's economy: a ledger test that plays New Game to the frontier on its own income, salvage from Hegemony wrecks, the prologue missions' authored rewards, the friend-of-Cass Graf price, the affordability net; the second Hangar section needs 12 rubble tiles excavated, which nothing teaches: C-51 items 16 to 23, C-52, C-48). Before that, 2026-10-09, after the 0.2 playtest's §2 (the base is taught by side beats: the Barracks when the bunks fill, the Infirmary at the first injury, the Workshop at the first ship home damaged; story recruits with no bunk sleep rough: C-51 items 7 to 15, C-52, C-48's room tutorial rows). Before that, 2026-10-09, after the 0.2 playtest's §1 (Rescue Tachi's prisoner rides in the truck; no cinematic moves a prisoner; enemies hold only from cover; ambush guards follow the truck: C-51, C-52). Before that, 2026-10-08, for release 0.2 (main gets the enemy-shot camera hold, guided pointers kept on screen, and no command bar out of combat: the Galaxy and the Arsenal keep their buttons in the panel and the dossier, the Black Market keeps the lot pop-up from the screens handoff part 3; C-50's Arsenal question is settled by C-33.7). Before that, 2026-10-08, after your call on the command bar (none out of combat: C-33 item 7, settled as C-33.7). Before that, 2026-10-08, after your note on enemy shots (the camera holds on each shot and its result: C-45 item 7). Before that, 2026-10-08, after merging the screens handoff part 3 into main (the Fire support menu, the Black Market's type-tinted cards and lot pop-up, Door Gunner Cover on every enemy in its zone, Heavy Bombardment at round end: its entry became C-50, as C-46 was already the prologue's). Before that, 2026-10-08, after iPad Pro 12.9" support (the tablet layout in portrait: C-49). Before that, 2026-10-08, after your phase 5 calls (a lost prize pilot grounds only their ship; Steal the Cross is a Steal Ship; C-47 items 30 to 37 settled as C-47.5; Steal Ship's lines stay placeholders). Before that, 2026-10-08, after the prologue's phase 5 (Raid the Bunker: the Steal Ship type on one engine with Steal the Cross, the indoor bunker map, the player's Reinforcements bringing the pilots; New Game now plays to the frontier: C-47 items 30 to 37, C-48's phase 5 rows, C-41 item 2 in part). Before that, 2026-10-08, after the prologue's phase 4 (Raid the Bunker on the board, Tachi's three pilots, the Black Market and Sweet Tooth, the second hauler and Hangar room: C-47 items 22 to 29, C-48's P4 rows and the Steal Ship type). Before that, 2026-10-08, after the prologue's phase 3 (the tense day, the Bureau's first Lead on Venn, Someone's Asking Questions and Lie Low: C-47 items 18 to 21, C-48's Lie Low row). Before that, 2026-10-08, after the prologue's phase 2 (Rescue Tachi as the new Ambush: Extract VIP mission type, Tachi Gard as the first Agent, Run Your Network built: C-46 resolved, C-47 items 11 to 17, C-48's mission-type rows). Before that, 2026-10-08, after the prologue's phase 1 (`docs/PROLOGUE-HANDOFF.md`: the onboarding as a script of beats, gates that hide mechanics until a beat opens them, today's chain ported with the doc's fixes, the Steal Fuel recruit and Strafing Run callout: C-46 partly built, C-47, C-48, M-34; the designer's prologue decisions in the Resolved log). Before that, 2026-10-08, after merging the base and combat work into main (its two entries became C-44 and C-45, as the weapon voices had taken C-43). Before that, 2026-10-08, after the weapon voices (a distinct sound per weapon, reports driven by the volley the tracers draw: C-43). Before that, 2026-10-07, after your calls on C-45 items 3 and 4 (no Flanked penalty; Take cover keeps the shot). Before that, 2026-10-07, after your cover rework notes (cover by the line of the shot, walls and corners, flanking, the AI's cover; quicker enemy shots; the rebel on turn auto-selected; Automatic (Deployed) -2 on the Razorrat: C-45). Before that, 2026-10-07, after your base and combat notes (Standby and Working at the base; the stun wears off; Leave gun and Pack up gun; Treat wound picks and marks its patient; the per-round check that ends combat once contact is lost: C-44). Before that, 2026-10-07, after the screens handoff part 2, §3 (the Intelligence tab — The Network, all four phases: C-42). Before that, 2026-10-07, after part 2's §4 (the slot-filling planning window: C-41). Before that, 2026-10-07, after part 2's §2 (the source approach and standby contacts: C-40). Before that, 2026-10-07, after part 2's §1 (the Starfighter window: C-39; the part 2 doc and its stylesheets landed). Before that, 2026-10-06, after your call on fire support: the transport assigned to a ground mission brings its own Supply Drop (if its type can fly one) and Door Gunner Cover (if a Door Mounted Gun is fitted), with no second ship (C-31 item 5 resolved). Before that, 2026-10-06, after your call to undo my fire support changes (the Supply Drop toggle is back on the planning board; the transport gives no fire support of its own; the crate carries no Med Packs: C-31). Before that, 2026-10-06, after the audio pass (the persisted sound setting, one toggle wiring, the base's split alert palette: C-38). Before that, 2026-10-06, after the screens handoff, screen 4 (the Missions tab: C-37; M-22 item 4 built). Before that, 2026-10-06, after screen 3 (the comm burst: C-36). Before that, 2026-10-06, after screen 2 (the personnel file: C-35). Before that, 2026-10-06, after screen 1 (the mission report: C-33, C-34). Before that, 2026-10-06, after your Hangar answers (4 × 4 sections, small and large pads, a 14 × 18 map: C-32). Before that, 2026-10-06, after the Haven Rock art handoff (art update 4: the base map and walk-in views, M-33). Before that, 2026-10-06, after your answers on C-29 and C-30 (enemy range with the shooter revealed; downed VIPs; every transport leaves; the transport's own fire support; the developer logo on the title screen: C-31). Before that, 2026-10-06, after your field changes (death, stims, Steal the Cross, the Personnel File, Flight Controller and Combat Support: C-29, C-30). Before that, 2026-10-06, after the Support specialties build (the Support Specialties doc; your answers on staff posts, C-28; M-14 resolved; M-32 lists what waits). Before that, 2026-10-06, after the designer's C-26 answers (mission text per type, the transport by name, guard names by type). Before that, 2026-10-05, after the October 5 art handoff and the designer's answers on the Back slot (C-25),
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
| C-48 | 🟡 | Prologue text still to write: every `[TEXT NEEDED]` the game shows or will show | Ambush: Extract VIP's and Steal Ship's lines, the Lie Low step, beats 19 to 22's pointers and callouts, the bunker raid's plan tutorial and call-in card, the room tutorials and the sleeping-rough card line |
| C-49 | ⚪ | iPad Pro 12.9": the tablet layout in portrait is my design (the rail slides in from the right); what it doesn't cover yet | How the game plays on a tablet |
| C-50 | 🟡 | Fire support menu and Black Market cards: the type colours and Saturation's new wording (the Arsenal question is settled: C-33.7) | How a lot and a call read |
| C-51 | 🟡 | 0.2 playtest (`docs/FEEDBACK-0.2-HANDOFF.md`): decisions and readings (the prisoner in the truck, enemies in cover, the guards on the truck; the room tutorials as side beats, which side beat goes first, where they point, sleeping rough; salvage, the authored rewards, the affordability net, which also covers the Marta). Open: the second Hangar section needs 12 rubble tiles excavated and a large pad made, and nothing says so | Rescue Tachi; how every enemy fights; how the base is taught; whether a new player can reach Raid the Bunker |
| C-52 | 🟡 | 0.2 playtest: placeholder numbers to tune (the AI's cover scoring, the cover metric, sleeping rough, salvage, the prologue's rewards and Graf price, the affordability net, the market card's floors), with the economy table | How every enemy fights; what a missing bunk costs; the prologue's economy; the market cards |
| C-53 | ⚪ | Market art at small heights: on a phone the market's rows now grow past the screens handoff's fixed 230px to fit a weapon card | How the Black Market reads on a phone |
| C-54 | 🟡 | CD playtest (8 Oct): the smaller items around the core-gameplay feedback — the two-classes-of-message UI rule, ground phase legibility, an overwatch tell, the briefing layout, the stealth rework, a narrow-win debrief line, ground impact effects, a flavour-text audit, and three live bugs (the revenge shot after the win, a refused lock-on, the Marta prompt) | Future triage; none of it blocks current work |
| C-45 | ⚪ | Cover by the line of the shot: the numbers (hug distance, corner arc, wall cover 9, Take cover +2), what counts as a threat in the cover hints, enemy-shot pacing | How every firefight plays |
| C-44 | ⚪ | Standby and Working; the combat-flow fixes: what Standby does, when a rebel rests on their own, how many quiet rounds end a fight, alerted enemies holding still out of contact, extraction with hostiles alive, what Leave gun leaves in their hands | How the base reads; when a fight ends |
| C-55 | 🟡 | Arena: every number in the space combat v2 sim is a placeholder (exec length, the action point meter and every price on it, the Cool bonus, lock time, doctrine radii…) | The whole Arena's tuning, and experiment E1's verdict |
| C-56 | ⚪ | Arena: readings to confirm (Enter Arena for everyone, Evade kept, K-turns as moves, no slow-motion, tells always on) and what I chose building it (move bands, the round's distance, action point details, fixed rate of fire, opportunity fire, which enemy hunts) | How every Arena fight plays |
| C-43 | ⚪ | Weapon voices: every weapon's own sound, reports per visible round — the character I gave each weapon | How combat sounds |
| C-59 | 🟡 | SB Test ruleset: decisions and readings (two rival rulesets behind one picker, SB's own driver, the continuous envelope, projectiles not the d20, the two deviations from your notes; open: a quarter weapon roll per projectile, the freighter's turn radius equal to the Talon's) | Your head-to-head verdict; how SB plays |
| C-65 | 🟡 | SB streams of fire and the bigger map: what I chose (damage kept per second, fractional hits, criticals and nerve rescaled, damage numbers added up, the scenario set in the middle of the map, pursuit's range following the guns) and the placeholders | How an SB fight reads; every number is on the panel |
| C-64 | 🟡 | SB flight, guns and ship status: what I chose (a ship's grip and thrust come from its own plan's peaks, the deterministic pilot wander, the K-Turn's flip, bolts that don't carry the ship's speed, the colours by maker) and the placeholders | How SB ships fly and read; every number is on the panel |
| C-62 | ⚪ | SB planning HUD: readings to confirm (locked mods shown greyed, Basic armed each turn, no confirm on Execute, designer-facing tooltip copy) and what I chose building it (Keep facing, where SEG 2's drag starts, the boost actions greyed with a reason, the ship-ability slot collapsed, AP capped at 2, a pause button) | How planning an SB turn feels |
| C-63 | 🟡 | SB planning HUD: placeholders (the tray's gap, icon size and flip zone, the hover delay) | The tray's look; every one is on the panel |
| C-69 | 🟡 | High Command playtest 1, as built: what I chose (the scenarios scaled to the 4 × map, which ranges grew with it, Jump Out and Leave now, the tray and pilot panel above the roster, Commands bottom right) and the new placeholders | How High Command plays after your first notes |
| C-67 | ⚪ | High Command: readings to confirm (the third ruleset's scenarios, flight as SB's flown body steered at a goal, personality from traits, the relay jamming the jump point, when a mission ends, the "better local target", leaders by level, how each order, tactic and rule reads, nerve as morale with two changes, panic, placeholder assessment lines `[TEXT NEEDED]`, live tiles, withdrawing to the rally point while jammed, the v1 commands and the v2 stubs, emergencies and the recommended answer, two gold buttons at once, abilities and doctrine, the digits' two jobs, the metrics record, hc2 and hc3, a leader's death as a mass panic, the panel, what isn't built; the SB test now checks only the first two rulesets) | How every High Command mission plays |
| C-68 | 🟡 | High Command: placeholders (the timescales, think rate, speeds, ranges, formation spacing, the tactic weight table, leader loss, command points, the scenario's stats) | How High Command plays; every one is a getter, most on the panel |
| C-60 | 🟡 | SB Test: placeholders (AP per round, Fly Defensively, Boost, K-Turn, Barrel Roll, the flair, the movesets; bursts, spread, lock, impact, missiles, the hull ellipse) | How SB plays; every one is on the panel |
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
| M-35 | 🟡 | Arena graduation: what waits until experiment E1 passes (a shared combat-maths module, ground combat in the Arena, the campaign on the v2 sim, the parked design-doc items) | Space combat v2 anywhere but the Arena |

(Counts are as of today: 12 of 45 Character Traits and 27 of 59 Rebel Traits are listed but never granted.)

---

## 1. Conflicts
### C-69 🟡 High Command playtest 1: what I chose building it, and the placeholders
Your notes and the approved proposal (with your answers of 13 October) are in `docs/ARENA-HC-FEEDBACK-1.md`. Built in
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
**Your call:** _open_

### C-68 🟡 High Command: placeholders
Every number in `game/js/sim-hc.js` marked `// placeholder`, each with a getter (`SIMHC.fn.THINK_SECS_()`…, or the
`SIMHC.TUNE` table the panel's HC group is built from).
| Constant | Value | What it does |
|---|---|---|
| `TICK` | 50 ms | The sim's fixed step (copied from SB) |
| `TIMESCALES` | 0 / 0.3 / 1 / 3 | Pause / slow / play / fast |
| `THINK_SECS` | 0.5 s (panel) | How often each ship re-decides |
| `ROUND_SECS`, `SPEED_SCALE` | 3 s, 2.5 (panel; was 1.25 until C-69) | A ship's top speed covers its top dial straight × `SPEED_SCALE` in `ROUND_SECS` (SB's round), so a Talon tops out at 625 units a second and can't fly slower than 250 |
| `CRUISE`, `CONVOY_SPD` | 0.7, 0.55 of top speed (panel) | Unpressed speed; the convoy's speed |
| `THRUST_K`, `TURN_K`, `BOOST_MULT` | 1.6, 3, 1.6 | Acceleration (top speed from rest in 1/`THRUST_K` s), how hard the autopilot turns onto its goal, a boost's top speed × |
| `ENGAGE_FRAC`, `RANGE_MULT` | 1 × the longest gun (panel; was 0.55 until C-69), 1 (panel, on the next load) | The range a ship tries to fight at, before the tactic and personality; every weapon's range × |
| `THREAT_R` | 1.1 × gun range (panel) | A hostile this close with its guns on a ship (or that just hit it) is a threat it turns on (C-67 item 6) |
| `COMMIT_SECS` | 2.5 s (panel) | A ship stays on a target it just took at least this long |
| `FORM_GAP`, `SLOT_LEAD`, `SEP_R`, `SPAWN_GAP` | 320 units (panel; was 120), 0.6 s, 220 (panel), 340 (panel) | Formation spacing at a tactic's spacing 1; how far ahead a slot looks; personal space; a scenario group's starting spacing (C-69 item 3) |
| `ESCORT_R` | 2,200 (panel; was 1,500) | An escort engages what comes this close to its charge (at least a patrol's detection, so it moves first) |
| `JUMP_R` | 350 (panel; was 260) | Inside this of the jump point a withdrawing ship jumps |
| `DETECT_R`, `GUARD_R`, `LEASH_R` | 2,500, 1,200, 5,000 (panel; were 1,500, 900, 2,600) | The Hegemony's patrol detection, guard radius and chase leash |
| `HR_IN`, `HR_OUT` | 3 s, 3 s (panel) | Hit and Run: a pass, then an extension |
| `AVOID_R` | 260 | Rocks, the map edge and wingmates push a ship's heading away inside this |
| `CALM_SECS` | 3 s (panel) | A ship unhurt this long regains the copied `CALM_GAIN` (6) nerve |
| `LEAD_LOSS`, `PROMOTE_SECS` | 0.5, 8 s (panel) | A leaderless wing's cohesion; when the next pilot takes the lead |
| `HC_CP` | 5 (panel) | The command point pool when a scenario sets none |
| `HC_MAP` | 4 (panel to 8, on restart; was 2) | The map is this × space.js's 4,200 × 3,000; scenarios are written for 2 and scaled (C-69 item 2) |
| `HC_TACTICS` | the table in `sim-hc.js` | Each tactic's weights: formation keeping, spacing, fighting range, focus fire, flank, screen, hit-and-run, disengage hull, leash |
| `PERSONALITY` | eager 1.25 / 0.6 / 0.6, steady 1 / 1.4 / 1 | Fighting range ×, formation weight ×, disengage threshold × |
| hc1's stats | Relay K-7 hull 200, armour 30; Convoy Lark hull 80, armour 20 | The scenario's own overrides (C-67 item 11) |
| `DEFEND_R`, `HOLD_R` | 2,000, 1,800 (panel; were 1,300, 1,200) | A defending or holding wing engages what comes this close |
| `CAPTURE_R`, `CAPTURE_SECS` | 400 (was 320), 10 s (panel) | Capture: how close, and how long uncontested |
| `BOARD_R`, `BOARD_SECS` | 400 (was 320) + the station's size, 12 marine-ship seconds (panel) | Boarding: how close, and how long (two boarders take half as long) |
| `MORALE_EAGER`, `MORALE_SHAKEN`, `MORALE_PANIC` | nerve 80, 45, 25 (panel) | The morale ladder: EAGER at or over 80, STEADY from 45, SHAKEN from 25, PANICKED under |
| `STEADY_AT`, `PANIC_FLEE` | 35, 0.6 (panel) | A panic ends once nerve is back over 35; a panicking pilot flees 60% of the time, else freezes |
| `SHAKEN_ODDS`, `SHAKEN_DISENGAGE` | 2, × 1.6 (panel) | A SHAKEN pilot hangs back from a target with 2 or more hostiles round it, and falls back hurt at 1.6 × the tactic's threshold |
| `NERVE_K` | 0.6 (panel) | Every nerve loss × this, High Command only (C-67 item 17) |
| `PIN_N` | 2 (panel) | This many hostiles with their guns on a ship pin it |
| `PRES_HULL` | 30% (panel) | Preservation Order's threshold |
| `GUARDIAN_SECS`, `GUARDIAN_R` | 2 s, 6,000 (panel; was 3,200) | Guardian Directive: an objective hit this recently; its attacker intercepted if this close |
| `ESCAPE_K`, `FORM_SECS` | 2.2 × gun range, 5 s (panel) | Formation Discipline: when a target has escaped; how long the ship re-forms |
| `BRING_HULL` | 50% (panel) | Bring It Down: the flagship counts as disabled under this (or with an engine or controls critical) |
| `SAVIOUR_HULL` | 30% (panel) | Saviour Protocol: the named friendly is critical under this |
| `TILE_Z`, `TILE_BUDGET`, `TILE_WARM` | 0.34, 3 ms, 4 rounds | A camera tile's zoom; what the tiles may cost a frame (with 8 or more) before they fall back to static glyphs; how many rounds are drawn before that is measured |
| `TS_SLOW`, `TS_FAST` | 0.3 ×, 3 × (panel) | The slow and fast speeds |
| `RAID_TURN_R` | 700 (panel) | A raider turns from your station onto a fighter this close with its guns on it |
| Tactic weights | the `HC_TACTICS` table (panel, 42 sliders) | Every tactic's formation, spacing, fighting range, focus, flank, disengage and reach |
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
The gun, lock, spread, damage and nerve numbers are SB's (C-60, C-64, C-65), copied with their values.
**Your call:** _open_

### C-67 ⚪ High Command: readings to confirm, and what I chose building it
`docs/ARENA-HC-HANDOFF.md`, phase T1 (later phases add to this list). Built in `game/js/sim-hc.js` (the sim) and
`game/js/arena-hc.js` (the HUD); v2 and SB are untouched.
1. **The scenarios sit in the registry but are written in `arena-hc.js`**, which adds them to `ARENA_SCENARIOS` with
   `rulesets:['hc']` when it loads, so `arena.js` only gains the ruleset entry and its three dispatch lines. Their
   shape is v2's grouped into wings, plus quiet allies, named points, objectives, the clock, a jammer and rules.
2. **Flight is SB's flown body steered at a goal point**, not SB's segment fitter: there are no rounds to fit a
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
15. **The tactics, as flown**: *Tight*: a V at 1 × the gap, every gun on the leader's target. *Spread*: line abreast
    at 3.4 ×, each pilot picks their own. *Screen*: an escort or defence hangs between its charge and the nearest
    threat. *Pincer*: alternate ships come in from either side of the target. *Hit and Run*: a 3 s pass, a 3 s
    extension. *Defensive*: fights at 0.8 × range and falls back hurt at 50% hull. Every tactic's "falls back hurt"
    means: when a ship is under its threshold and something has its guns on it, it breaks away toward its wing.
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
The planning tray's numbers (`docs/SB-HUD-HANDOFF.md` §8), each a named constant in `game/js/sim-sb.js` marked
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
`docs/SB-HUD-HANDOFF.md`, all three phases (H1 to H3) built in `game/js/sim-sb.js` (the stepper, the tray, the hover
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
`docs/ARENA-SB-HANDOFF.md`: the Arena's second, rival ruleset ("SB Test", `game/js/sim-sb.js`, driven by
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
   end; a ship with no move, at once): `docs/SB-HUD-HANDOFF.md` §3.4, your 12 October instruction (C-61 item 2).
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

### C-54 🟡 CD playtest (8 Oct): UI rules, feedback gaps and bugs for future triage
From the creative director's first playthrough, 8 October 2026 (the transcript is on the project). Logged
unactioned at the designer's request, to work through later. The core-gameplay feedback itself is handled
elsewhere (the *Space Combat Core Redesign v0.1* doc and `docs/ARENA-HANDOFF.md`); these are the smaller items
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
   The Arena's per-exec metrics (`docs/ARENA-HANDOFF.md` §7) will make "dramatic" detectable for the v2 sim too.
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

### C-52 🟡 0.2 playtest: placeholders
Every number the 0.2 fixes added that is mine, each in one named constant marked `// placeholder`:
| Constant | Value | Where | What it does |
|---|---|---|---|
| `AI_ADVANCE_CAP` | 120 | `ground.js`, `pickCoverMove` | The most a move scores for ground closed on (or opened from) the target |
| `AI_EXPOSED` | 90 | `ground.js`, `pickCoverMove` | Taken off a spot in the open, in the target's sight and range (riot shields exempt) |
| `AI_COVER_MIN` | 60% | `tools/cover-smoke.js` | The share of enemies on foot in cover the metric asks for. Measured on the ambush map: 57% before the change, 74% after |
| `ROUGH_MORALE` | 2 | `base.js`, `moraleTick` | Morale everyone at the base loses each day anyone is sleeping rough (C-51 item 12) |
| `ROUGH_REST` | 0.5 | `base.js`, the daily rest | How fast someone sleeping rough rests off exhaustion (half speed) |
| `SALVAGE_PER_HP` | 0.5 | `base.js`, `applyDebrief` | Materials per point of a Hegemony wreck's max hp (C-51 item 16) |
| `PRO_REW` | Steal the Cross 300m · Torch the Depots 400m · Steal Fuel 300m · Rescue Tachi 650m and 600c | `prologue.js` | Added to each prologue mission's reward. The handoff's starting values (150m, 200m, 100m, 300m and 400c) left the frugal run 750m and 200c short at the hauler beat, because of the excavation (C-51 item 23) |
| `PRO_GRAF_PRICE` | 1,000 | `prologue.js` | The guaranteed Graf before the frontier (the handoff's 1,200 left too little to spare) |
| `AFFORD_DAYS` | 2 | `prologue.js` | Days a beat can sit unaffordable before its contact sends the shortfall |
| `AFFORD_EXTRA` | 10% | `prologue.js` | Sent on top of the shortfall (the handoff's number) |
| `ECON_HEADROOM` | 10% | `tools/economy-smoke.js` | What the frugal run must have to spare at every spend |
| `BM_CARD_MIN` | 250px | `game/ui/scenes.css`, `.bm-grid` | The least a market row is on a wider screen; past two rows the stall scrolls |
| Art well floor | 96px | `game/ui/scenes.css`, `.bm-card .kit-well` (and `WELL_MIN` in `tools/market-smoke.js`) | The least a market card's art well is; the art scales inside it at 8:5, 192 × 120 at most |

**The economy table** (`tools/economy-smoke.js`; the mercenary's fee is rolled, 380 to 600). Before the fixes (§3's
first commit, measured with `ECON_MEASURE=1`, shortfalls topped up as they came): **2,436 credits and 1,580
materials short**: the Bunks upgrade 140m, the Hangar block's excavation 640m (16 tiles, the block below the Hangar),
the Hangar section 800m, the Graf 2,436c. After, the frugal run (only what the beats need) reaches the frontier on day
30 with no grant:
| Spend | Beat | Cost (c/m/s) | Had (c/m/s) |
|---|---|---|---|
| Restore the Marta | sera | 240/160/0 | 1,000/400/480 |
| Barracks tile | fuel_plan | 380/160/80 | 1,404/868/712 |
| Bunks upgrade | sweet_tooth | 260/140/0 | 2,708/1,642/760 |
| Mercenary | hauler | 460/0/0 | 2,544/1,502/792 |
| Hangar block (12 tiles excavated) | hauler | 0/480/0 | 2,084/1,502/792 |
| Hangar section | hauler | 960/800/0 | 2,132/1,022/808 |
| Second Graf | bunker | 1,000/0/0 | 1,364/222/872 |
The spendthrift run (an Infirmary, a Workshop and a Storeroom on day 1 too) reaches the frontier on day 33 with three
grants, one each for the Marta, the Barracks tile and the hauler beat.
**Needs from you:** tune any of them.
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

### C-53 ⚪ Market art at small heights
`docs/FEEDBACK-0.2-HANDOFF.md` §4 keeps the phone rule (`grid-auto-rows:230px`), but a weapon card (its trait row and a
96px well) needs about 265px, so at 230 its price row was cut off. On a phone the rows are now `minmax(230px, auto)`:
230 stays the floor and a taller card makes its row taller (the whole view scrolls there already). The art is sized
from the well's width on a phone (the width is what limits it there).
**Needs from you:** overrule it, or say how a weapon card should fit 230px (a smaller well, the trait row moved).
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

**Shown now: the room tutorials** (the side beats, `PRO_TEXT`, the Prologue tab; C-51 items 7 to 10):
| Line | Where it shows | What it must say |
|---|---|---|
| `sbBaseTab` | The pointer at the Base tab (or the room view's Back to the base), any room tutorial | A short label: back to the base |
| `sbDig` | The pointer at a rubble tile, then at Excavate, when there is no free floor | A short label: excavate here to make space |
| `sbDayDig` | The pointer at Advance day while the excavation runs | A short label: the crew needs a day |
| `sbBarracksTile` | The pointer at the free floor tile beside the Barracks | A short label: the bunks are full, build here to make the Barracks bigger |
| `sbBarracksBuild` | The pointer at Build on the Barracks card in the tile pop-up | A short label: build the Barracks |
| `sbBarracksDay` | The pointer at Advance day while the tile is built | A short label: it is built overnight |
| `sbBunksT`, `sbBunks` | The card on the new Barracks (on the Bunks upgrade inside the room) | The Bunks upgrade adds beds to every Barracks tile |
| `sbInfirmaryTile`, `sbInfirmaryBuild` | The pointers at a free floor tile and at Build on the Infirmary card | Someone came home hurt: build an Infirmary here |
| `sbInfirmaryT`, `sbInfirmary` | The card on the Infirmary being built | The injured recover faster there |
| `sbWorkshopTile`, `sbWorkshopBuild` | The pointers at a free floor tile and at Build on the Workshop card | A ship came home damaged: build a Workshop here |
| `sbWorkshopT`, `sbWorkshop` | The card on the Workshop being built | Ships repair there |

**Shown now: the economy** (§3 of the 0.2 playtest):
| Line | Where it shows | What it must say |
|---|---|---|
| `affordGrant` (`PRO_TEXT`) | The comm from Cass or Venn when the affordability net sends what's missing | The contact sends what's missing (the amounts are added when it closes) |
| `grafFriend` (`PRO_TEXT`) | Sweet Tooth's line on the guaranteed Graf lot before the frontier | A friend-of-Cass price on the hauler |
| `MAT_HINT` (`game/js/base.js`) | The second line of a build's or buy's *Need X more* reason when it's short of materials | A short hint: where materials come from (salvage, patrols, Sources) |
The `haulerHangar` callout (phase 4 above) may want to say the block must be excavated and half a section made a large
pad (C-51 item 23).

**Shown now: sleeping rough** (`ROUGH_CARD` in `game/js/base.js`): the line on a story recruit's card when no bunk
is free, in place of *No bunks free*. It must say this one joins but will sleep rough until a bunk is free.
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

---

## 3. Resolved log

Earlier decisions (Heroes wait for Level 2, Marines data-only, rank decoupled from level, per-rebel morale on top
of base mood, USAF pilot ladder, recruiting through the Command Center) are recorded in `docs/REBELS_PLAN.md` §2.

| ID | Decision | Date | What was built |
|---|---|---|---|
| C-66 | **High Command: decisions** (`docs/ARENA-HC-HANDOFF.md` §9), recorded so later work doesn't reopen them: (1) Type 3 is **a third ruleset, additive behind the picker**; v2 and SB untouched; (2) **real time with free, unlimited pause; no phases**; orders can be issued at any speed; (3) **wings from mission start**, each sharing one order and one tactic; (4) **intent lines are read-only**: the player never draws a path; (5) **the reinforcement clock is always on**: at zero a dangerous Hegemony force arrives and the objective flips to "get out"; (6) **Abort is always free**; (7) **the High Command HUD canvas is the living layout spec** | 2026-10-12 | T4: leaders and promotion, the keys, the §7 metrics, `hc2_lastlight` (waves, raiders) and `hc3_meltdown` (CP variants), the HC panel group with the tactic weights; `tools/arena-smoke.js` HC 9, 10 and T4, every §8 test green (C-67 items 30–37). T3: the pilot panel and doctrine, the commands drawer (Override, Recall, Emergency Support, Recon Sweep, Decoy, Abort; Reinforcement Request behind reserves), CP and rewards, emergencies and their answers (C-67 items 23–29). T2: every order and tactic, the rules engine and its panel, morale, assessments, the feed's VIEW and Tab, live tiles (C-67 items 14–22). T1: `sim-hc.js` (SB's flown body steered by goals, wings with leaders, Attack / Escort / Withdraw autonomy, the Hegemony's patrol / guard / hunt, SB's guns copied, the clock, objectives, the jammed jump point, the fixed-step determinism); `arena-hc.js` (the map with intent lines, the engagement ring and the gold attack designation; the objectives, the clock, CP and COMMANDS; the event feed with VIEW; the wing roster with static tiles; time controls; the wing tray with the order and tactic rows and target chips; hover cards; the picker and the HC panel group); `hc1_nightfall`; `RULESETS.hc` and its dispatch in `arena.js`; `index.html`, `arena.css`; `tools/arena-smoke.js` HC 1, 6, 7 and T1. Readings: C-67; placeholders: C-68 |
| C-65.1 | **SB: more shots for less damage, a bigger map** (the designer, 12 October: "I'd prefer more shots that do less damage, than one shot per 'round' that does more damage… we do need to alter toward 'more going on' visually to the player even if the maths works out the same. We also need to make the map a lot bigger, and I'll be playing with the designer variables to make ships move further over longer rounds, and increase the range of weapons") | 2026-10-12 | `sim-sb.js`: streams (`BURST_N` 8, `BURST_GAP`, `BURST_EVERY` 0.75) with `GUN_DPS` pinning the damage a second, fractional bolt damage, rescaled criticals and nerve, summed damage numbers, `MISSILE_EVERY`, `RANGE_MULT`, `SPEED_SCALE` to 6; `arena-sb.js`: `MAP_SCALE` 2.5 with the scenario centred; `tools/arena-smoke.js` stream, range and map tests. Choices: C-65 |
| C-64.1 | **SB: flown ships, quicker bolts from the guns, status on the ships** (the designer, 12 October, after playing E1: "I don't want there to be such a strict link between what the player tells the ship to do and what the ship actually does… I'd like it if the ships were actually physically simulated… those paths should map to how the ships work"; "Lasers need both a travel time, to move in a fixed direction, to be smaller overall, and to be accurately mapped to the cannons they are emerging from"; "see each ship's health and armour values visually on them, to have thick shield arcs around each ship that deplete… use all of our existing visual assets") | 2026-10-12 | `sim-sb.js`: the flight model (`planState`, `flightCaps`, `flyStep`, `bodyStart`, `predictFlight`), bolts at `PROJ_SPD` 2,000 from the art's gun mounts (`mountsOf`, `muzzleAt`) drawn small in the maker's colours with the main game's muzzle flash, the ship-file shield arcs and the main game's hull / armour pips (`drawShields`, `drawStatus`); `arena-sb.js` kit `toScreen` / `dpr`; `tools/arena-smoke.js` Flight / Guns / Status tests. What I chose and the numbers: C-64 |
| C-61 | **SB planning HUD: decisions** (the designer, 12 October; `docs/SB-HUD-HANDOFF.md` §8), recorded so later work doesn't reopen them: (1) planning is a **per-ship enforced stepper**, SEG 1 → one action → SEG 2, with the controls in a tray anchored to the ship and only the current step's controls rendered; (2) **the action resolves at the segment boundary** (amends `docs/ARENA-SB-HANDOFF.md` §4's unspecified timing); (3) **the bottom bar loses its controls**; one tray at a time; enemy ships never show one; (4) **End here** is a first-class SEG 2 choice (unspent AP still does nothing); (5) **Execute never blocks**: unplanned ships fly their standing order | 2026-10-12 | `sim-sb.js`: the stepper (`nextStep`, `advance`, `arm`, `pickAction`, `endHere`, `keepFacing`, `goPip`, `back`, `clearPlan`), the tray HTML with inline SVG glyphs and live hover cards, actions fired by `fireActions` at SEG 1's end, Fly def's `noFire` flag, the drag readout; `arena-sb.js`: the tray placed every frame (flip, clamp), ship chips with auto-advance, Execute (n/m planned) and pause, the keys; `index.html`, `arena.css`; `tools/arena-smoke.js` HUD 1–10. Readings and choices: C-62; placeholders: C-63 |
| C-59.32 | **SB Test: momentum in the reach** (the designer, 12 October: "yes, add momentum to the reach, for the SB version of the space rules only") | 2026-10-12 | `sim-sb.js`: `s.mom` carried from the distance flown; `dialOf` gives each round a speed window and a speed-widened tightest turn; the reach, the glide top-up and the Hegemony's search all use them; the planner looks a round ahead for rocks; the "slowest this round" arc; `tools/arena-smoke.js` SB momentum (C-59 item 32) |
| C-59.6 | **SB Test: the reach and the round's distance** (the designer, 11 October: "Ships overall can move too far… when I start clicking and dragging a ship, I'd like to see where I can move it mapped out visually… a bit like a spearpoint, with a narrow side that shows I can bank hard, and a long straight corridor for moving very fast"). With acceleration through manoeuvres, a slip in hard turns, and a threatening AI from the same notes | 2026-10-11 | `sim-sb.js`: `dialOf`/`envelope` build the reach from the dial's straight, bank and hard-turn templates; `solveArc` ends outside it at its nearest point; a round is one dial move's distance shared by its segments, topped up only to the slowest straight; `drawReach` draws it while dragging; the speed profile and slip in `paceSchedule`/`poseAt`; the manoeuvre search (`planSearch`) for the Hegemony; `tools/arena-smoke.js` SB 3 and SB AI (C-59 items 6, 7, 9, 11, 26) |
| C-59.9 | **SB Test: the drag is a destination** (the designer, 11 October: "when the player clicks and drags, they are effectively affecting the final destination… if it's too tight of a corner then it won't be able to move further than what it's capable of doing"). Ships fly like planes: dragging from the ship previews the banked flight path to the destination, limited by the dial | 2026-10-11 | `sim-sb.js` `solveArc`/`buildCurve`: one banked arc per segment through the pointer, cut short past the speed range, flown at the minimum radius toward a too-tight corner, with the shortfall drawn; the traced-path steering removed; flair paced across the round (`paceSchedule`); `tools/arena-smoke.js` SB 3 rewritten (C-59 items 9 to 11) |
| C-57 | **Arena: moves and action points** (the designer, 9 October, after playing the first build: "the movement controls are incredibly stiff"). (1) **Moves are dragged and released:** press and hold on the ship to see how it can and can't move, drag a ghost that follows the pointer within the ship's move stats, release to set one move; further drags from its end chain more. (2) **One move is locked to one direction** (straight, bank or turn); variety comes from chaining. (3) **One action point meter per pilot per round** pays for movement, actions, special moves and interrupts alike, replacing one action per round. (4) **Cool adds a bonus to the meter;** spending it is like spending Cool on an ability: it is gone until the pilot earns Cool back. This supersedes C-58 item 2 (paths fitted to the dial from a drawn line) and the handoff's nerve-priced interrupts (§3.4); the dial still sets each ship's limits. | 2026-10-09 | `sim2.js`: moves are arcs inside each ship's envelope (`envOf`, `moveTo`), chained under a round's distance and flown at one speed; the AP meter (`apMax`, `apLeft`, `settleBonus`) with every price a placeholder (C-55); interrupts paid in AP; orders and doctrines plan within the same AP and distance. `arena.js`: the banded envelope, the ghost on the pointer, the gold handle at the chain's end, Undo (Z) and Clear, the AP meter on the ship card, prices on every button. The drag fitter and the drawn line are gone. Readings in C-56 items 7, 12 and 16. `tools/arena-smoke.js` covers moves, chaining, the AP meter and the Cool bonus. The "Arena: drag-and-release moves and one action point meter" commit |
| C-58 | **Arena: decisions** (items 2 and 3's nerve price superseded by C-57) (the designer, *Space Combat Core Redesign v0.1*, 9 October; `docs/ARENA-HANDOFF.md` §9), recorded so later work doesn't reopen them: (1) space combat v2 is **continuous WEGO**: one plan step, then simultaneous continuous execution; no action or attack phases, no initiative. (2) **Drawn paths are fitted to the ship's dial**: the dial is the balance backend; an illegal path cannot be drawn rather than being refused. (3) **Interrupts are player-only**, priced in the existing nerve meter; enemies commit for the whole turn. (4) **Enemy behaviour is doctrine modules** planning through the same path fitter as the player. (5) The Arena is **campaign-free and save-free**: it never writes the campaign key. (6) Today's `space.js` combat maths is **copied, not shared**, and must not drift during the experiment. | 2026-10-09 | `game/js/sim2.js` (the v2 sim: copied maths, the fixed-tick loop, the dial fitter, standing orders, interrupts, four doctrines, metrics) and `game/js/arena.js` (the scene: picker, five experiment scenarios, drawing, input, the designer panel, `DBGarena`), `game/ui/arena.css`; touches outside them are the title button (`intro.js`), `SR.bootArena` (`core.js`) and the scene, styles, scripts and `#arena` route (`game/index.html`). `space.js`, `ground.js` and `base.js` are unchanged. `tools/arena-smoke.js` covers it. The "Arena" commit |
| C-33.7 | **No command bar out of combat** (the designer, 8 October, confirming `docs/ui/SCREENS-HANDOFF.md` §0.1 for every screen built): a screen's buttons sit with what they act on; Advance day stays bottom-right on its own. | 2026-10-08 | The base's bar is gone (`#baseGo`: Advance day alone, no count line). **Galaxy:** the selection's actions (Contact, Visit, Silence, Cut loose, Scout, Raise access, Run the job, Back…) are buttons at the foot of its panel (the region card when one is open), with any reason they can't be used under them; on a phone, in the bottom sheet, which now sits above Advance day (it had been running off the top of the screen). **Arsenal:** Give to… / Sell, and Hangar / Refit for a ship, sit in the dossier under the name. **Black Market:** the lot pop-up beside the picked card (screens handoff part 3, C-50) carries the stats and Buy / Buy all (Hire); the restock count is Sweet Tooth's, in the rail. Keys 1–9 press them as before. The "No command bar out of combat" commit |
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
