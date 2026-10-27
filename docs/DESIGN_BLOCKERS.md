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

**Last updated:** 2026-10-27, after the blockers sweep (your answers from the Blockers tracker: 24 entries retired as outdated, 23 trimmed to what is still open, C-85 and C-86 confirmed, C-80 and C-89 confirmed in part; the answers that needed building are built in the commits that follow). Before that, 2026-10-26, after phase S7 of the switch to main (the Sources' space opportunities fly in Type 3.5: Intercept Transport and Tanker Grab as the freighter's variants, Patrol Sweep from Orrin Pell, scaled to the wings sent, a Source's level hiding modifiers; the intel jobs are Tips; a leader never refuses themselves: C-94). Before that, 2026-10-26, after your FTUE answers (Sera always flies Torch the Depots; page 1's loop stays; the animations stay live, not GIF files: C-93 items 2 and 7, resolved). Before that, 2026-10-22, after your Space Combat FTUE (Torch the Depots plans and flies in Type 3.5 for every player, with the intro window and the 16 steps through the planning windows: C-93). Before that, 2026-10-22, after your notes on the freighter run of seed 534180 (the Crash waits for the gravity window; a shot past her shields lands on her hull; a jump point is a jump point; weapon types against shields, armour and hull; missiles wait for a weak shield: C-92). Before that, 2026-10-22, after your S6 notes (a campaign flight ends on a Mission Success / Mission Failed pop-up, the base report has its ships and More information; the relay stays spent; Spoofed Orders and the pirates logged for you in M-40; the trait list for item 36 is `docs/TRAITS-35-REVIEW.md`; grieving pilots kept out of 3.5: C-89 items 33, 34, 36, 44). Before that, 2026-10-22, after phases S5 and S6 of the switch to main (the placeholder Crafting tab and the asset inventory; the player's wings fly Type 3.5 and its results land in the campaign: C-89 items 30 to 43, C-91 updated). Before that, 2026-10-21, after phase S4 of the switch to main (Refit as the ship inspector's tab, on the hardpoints; 3.5's loadouts read from each ship's fit) and your answers on bombs, the Brickbat's passenger room and stealing a Brickbat (C-89 items 16 and 20, resolved). Before that, 2026-10-21, after phases S1 to S3 of the switch to main (Type 3.5's campaign scene, behind ?dev for now; the ships database's hardpoints, configurations and attachments, the Brickbat and the FL-400; wings in the Hangar: C-89, C-91 updated). Before that, 2026-10-21, after phase S0 of the switch to main (`docs/MAIN-SWITCH-HANDOFF.md`: Arena v2, SB Test and Type 3 as a ruleset archived, Type 3.5 on a dev-only test bench, the clean-up report: C-89 to C-91, M-40; M-35 and the v2 and SB entries closed). Before that, 2026-10-21, after phases N1 to N5 of the Type 3.5 playtest 3 handoff (`docs/ARENA-HC35-FEEDBACK-3.md`: the opportunity grammar in `ops-core.js`, orders as verb + object with map points, the clock in the plan and HUD, leaders deciding on help, surrenders done properly, Ambush ending, Patrol Sweep as data: C-87, C-88, M-39). Before that, 2026-10-20, after your Steal run of seed 248991 (a released freighter runs for her jump point instead of jumping where she is; the hail's default serves the primary, the ship for a Steal; a crew that gives up the ship is flown home; missiles wait for a full lock and a firm lock shrugs off some chaff: C-82 item 17, C-83 items 12 and 13). Before that, 2026-10-20, after phases W2 and W3 of the planning windows handoff (window 1's objective cards in their family columns with glyphs and pitches, the secondaries and the rules as toggle rows beside your primary and the plan so far; window 3's wing columns with their ship rows, red segmented controls and the leader's take, the assets bar and its picker: C-84 to C-86, M-38). Before that, 2026-10-20, after phase W1 of the planning windows handoff (`docs/ARENA-HC35-WINDOWS-HANDOFF.md`: the holo frame with its chamfers and V-notch, the step track, the footer on the pedestal with the readiness pill, the tooltip beside the element: C-84), and your call that only the prize crew repairs (C-83.12 in the Resolved log). Before that, 2026-10-20, after your Steal run (Phase 3 only when the response arrives; the prize crew repairs her before she can make her cruise or jump, turning like a capital ship; plasma toned down: C-82 item 16, C-83 item 12). Before that, 2026-10-20, after your boarding and plasma notes (boarding without stopping her, size 10 and up, hangars; engines out she crawls on thrusters; the power plant under 80% hull is what kills her; plasma as blaster bolts with your slider defaults: C-82 item 15, C-83 items 9 to 11). Before that, 2026-10-20, after your second Type 3.5 playtest 2 record (requests withdrawn once their reason has gone, the stuck guard waiting for your signal, no Secondary after the job's settled, a bump isn't being fired on: C-82 item 14). Before that, 2026-10-20, after phase L6, the last of the Type 3.5 playtest 2 fixes (plasma on your Talons and the response's Pursuers: C-82, C-83). Before that, 2026-10-20, after phase L5 of the Type 3.5 playtest 2 fixes (the drift as a slide inside a turn: C-82, C-83). Before that, 2026-10-20, after phase L4 of the Type 3.5 playtest 2 fixes (engines, guns and a shield generator on every ship, aimed at with Mark or Focus, in the readout and on the map: C-82, C-83). Before that, 2026-10-20, after phases L2 and L3 of the Type 3.5 playtest 2 fixes (a retreat really retreats, Hold for My Signal ends when spotted, wings fight back; a primary falls back in its family, the leaders find work and the debrief shows their calls and the rewards: C-82, C-83). Before that, 2026-10-20, after phase L1 of the Type 3.5 playtest 2 fixes (`docs/ARENA-HC35-FEEDBACK-2.md`: the planning windows don't replay on a pick, the rewards on each primary, the secondary objectives as window 1's part 2 and the rules of engagement as window 2: C-82, C-83). Before that, 2026-10-20, after phase K6, the last before K7, of the Type 3.5 playtest 1 fixes (the Missions tab mock, the holographic planning windows, one tooltip and no native ones, the debrief's pods and order of causes: C-79 items 44 to 51, C-80, C-81, M-37). Before that, 2026-10-20, after phase K5 (enemies selected to inspect, the target readout with its schematic, the subsystem rings and tips: C-79 items 39 to 43, C-80, C-81). Before that, 2026-10-20, after phase K4 (one vocabulary for what your ships do, with activity badges; cargo aboard; tethers always; the callouts; your pilots using their abilities again; reinforcements on the roster: C-79 items 31 to 38, C-80, C-81). Before that, 2026-10-20, after phase K3 (no damage numbers, the shields as two halves round the hull with the refill sweep, green / orange / red health in the space HUDs, the death spin from the ship's turn: C-79 items 25 to 30, C-80, C-81). Before that, 2026-10-20, after phase K2 (boarding's approach, the ram on contact, turrets that track, Boost Shields' 24 s cooldown, collisions by mass, the freighter steering itself, Pirate end to end, the stuck guard, Shift+1–3 for requests; High Command's hashes re-recorded: C-79 items 11 to 24, C-80, C-81, M-37). Before that, 2026-10-20, after phase K1 (true scale and icons: C-79 items 7 to 10, C-81). Before that, 2026-10-20, after phase K0 of the Type 3.5 playtest 1 fixes (the flight recorder, its harness, deterministic maths in the sims: C-79, C-81). Before that, 2026-10-17, after phase P6 of Type 3.5, the last (the debrief's cause chain, the metrics record, the keys: C-75 items 38 to 42). Before that, 2026-10-17, after phase P5 of Type 3.5 (the pilots' requests, the volunteers, ejection and pods: C-75 items 29 to 37, C-76 items 16 to 21, C-77). Before that, 2026-10-17, after phase P4 of Type 3.5 (the comms delay and its queue, command points by phase, every commander power and the assets you place: C-75 items 23 to 28, C-76 items 13 to 15, C-77, M-36). Before that, 2026-10-17, after phase P3 of Type 3.5 (the leaders' plans and critiques, the Executive and Secondary Orders playing out, the hidden modifiers showing themselves, OFF PLAN, the ROE and the optional objectives, the plan overlay: C-75 items 16 to 22, C-76 items 11 and 12). Before that, 2026-10-17, after phase P2 of Type 3.5 (the freighter as a target: subsystems, bombs, point defence, the drift and the planet, crew resolve, boarding, hauling, the three phases and the distress call, the seven primaries: C-75 items 9 to 15, C-76 items 7 to 10). Before that, 2026-10-17, after phase P1 of Type 3.5 (High Command Hands Off: the hooks and the hash test, the board, the dossier, the four-step briefing, the freighter's lane, the hands-off HUD, a debrief stub: C-75 to C-78, M-36). Before that, 2026-10-14, after wiring the visual pass round 2 into the map (the hurt read from the hull fraction, the death spiral, the lock marks: C-74 items 5 to 11). Before that, 2026-10-14, after the visual pass round 2 (hull-fraction smoke and fire trails, the death spiral, laser shot styles, the lock-on marks: C-74). Before that, 2026-10-14, after wiring Claude Chat's High Command visual pass (`game/art/sr-space-fx.js`, the station kit) into the map (C-73). Before that, 2026-10-14, after phase I2 of your fourth High Command playtest notes (defenders get between an inbound attacker and what they guard; Hegemony pilots pull back hurt and fight back; their squadrons split into lures and strikers: C-72 items 13 to 20, C-68). Before that, 2026-10-14, after phase I1 of your fourth High Command playtest notes (`docs/archive/ARENA-HC-FEEDBACK-4.md`: map 16 ×, lines and status on the map only for the selected wing, every ship locks and a lock steadies its guns, missiles live 6 s and are run from at once, chaff: C-72 items 1 to 12, C-68). Before that, 2026-10-13, after your third High Command playtest notes (`docs/archive/ARENA-HC-FEEDBACK-3.md`: the wing cards in a column in the bottom-left corner, the commands as big skill icons, the map 4 × wider and taller, the Cross turning at 80% of the interceptors' rate: C-71, C-69.20 in the Resolved log, C-68). Before that, 2026-10-13, after phase G5, the last of your second High Command playtest notes (the commands bar fixed bottom centre between the wings, the time controls under the clock, a five-entry feed, bigger objectives, quiet lines in hc1, status symbols by the ships: C-70 items 26 to 33; your playtest 2 calls are C-70.1 in the Resolved log). Before that, 2026-10-13, after phase G4 of your second High Command playtest notes (a click selects the wing, a second the ship; a selection box; right-drag pans; the right-click order wheel: C-70 items 20 to 25). Before that, 2026-10-13, after phases G2 and G3 of your second High Command playtest notes (collisions and pilots steering clear of them; the Cross's missiles with a lock you can see, the Missile ability's doctrine, targets breaking: C-70 items 8 to 19, C-68). Before that, 2026-10-13, after phase G1 of your second High Command playtest notes (`docs/archive/ARENA-HC-FEEDBACK-2.md`: smooth motion, Convoy Lark's jump, speed 4 by default, the 8 × map round a 4 × play area, holding orbits at corner speed: C-70 items 1 to 7, C-68). Before that, 2026-10-13, after phase F4, the last of your approved playtest proposal (speech bubbles over your pilots' ships for 2 s, one per ship, at most 4, from their emergencies, kills, steadying, rules and new jobs: C-69 items 22 to 24, C-68; your playtest decisions are C-69.1 in the Resolved log). Before that, 2026-10-13, after phase F3 of your approved playtest proposal (attack runs for every ship, pilots breaking off a stalemate or a tail, the tactics reworked around runs, AUTO as the default tactic; a finding: the Cross now loses to Motes on turning: C-69 items 15 to 21, C-68). Before that, 2026-10-13, after phase F2 of your approved playtest proposal (the corner-speed turn model: weak slow turns, turning bleeds speed, no braking into turns, wider turns, a smaller nose lead, formations keeping station along a line: C-69 items 9 to 14, C-68). Before that, 2026-10-13, after building phase F1 of your approved playtest proposal (`docs/archive/ARENA-HC-FEEDBACK-1.md`: faster ships at the full gun reach, the 4 × map with the scenarios scaled, wider spacing, Copy settings, Jump Out and Leave now, the tray and pilot panel above the roster, Commands bottom right opening upward: C-69, C-68). Before that, 2026-10-12, after your first High Command playtest notes (logged with my proposal in `docs/archive/ARENA-HC-FEEDBACK-1.md`). Before that, 2026-10-12, after High Command's phase T4, the last (leaders and promotion tested, the keys, the per-mission metrics, `hc2_lastlight` and `hc3_meltdown` with its 3 / 5 / 7 command point variants, the sectioned HC panel with the tactic weights: C-67 items 30 to 37, C-68). Before that, 2026-10-12, after High Command's phase T3 (the pilot panel with abilities and their AUTO / EMERG / MANUAL doctrine, the commands drawer with the v1 six, command points and objective rewards, pins and panics answered from the feed or the panel: C-67 items 23 to 29, C-68). Before that, 2026-10-12, after High Command's phase T2 (all nine orders and six tactics, the mission rules and their panel, morale and panic, the pilots' assessments, the feed with VIEW and Tab, live camera tiles: C-67 items 14 to 22, C-68). Before that, 2026-10-12, after Arena Type 3, High Command (`docs/archive/ARENA-HC-HANDOFF.md`, phase T1: a third ruleset behind the picker where autonomous wings fly themselves in real time and you order them; `hc1_nightfall` with Attack, Escort and Withdraw, the reinforcement clock, the HUD's top band, roster, wing tray and time controls: C-66 in the Resolved log, C-67, C-68). Before that, 2026-10-12, after your call for more shots doing less damage and a much bigger map (guns fire streams of small bolts at the same damage a second, the map is 2.5 × by default, weapon range and craft speed have room on the panel: C-65, C-65.1 in the Resolved log; C-59 item 12 and C-60's gun rows updated). Before that, 2026-10-12, after your notes on playing E1 under SB (ships flown as bodies along the plan rather than on rails, quicker and smaller bolts leaving the actual guns, thick shield arcs and hull / armour pips on every ship: C-64, C-64.1 in the Resolved log; C-60's projectile rows and C-59 item 6 updated). Before that, 2026-10-12, after the SB planning HUD (`docs/archive/SB-HUD-HANDOFF.md`, phases H1 to H3: a per-ship stepper tray under the selected ship, SEG 1 → action → SEG 2, with the action now resolving between the two segments; ship chips, Execute (n/m planned), hover cards, keys: C-61 in the Resolved log, C-62, C-63; C-59 items 21 and 22 rewritten). Before that, 2026-10-12, after your call to add momentum to SB's reach (the speed carried into a round sets its speed window and how tightly it can turn; enemies too: C-59 item 32, C-59.32 in the Resolved log, C-60). Before that, 2026-10-11, after "it feels like slow motion": SB's rounds are 3 s (a conflict with your SteamBirds note's 6 s, flagged as C-59 item 31), turns brake less, acceleration is quicker, and the reach is documented as worked out per ship and situation (C-59 item 9, C-60). Before that, 2026-10-11, after your second round of SB Test notes (the reach drawn as a spearpoint from the dial, a round worth one dial move with no glide past your line, speed that brakes and powers through manoeuvres, the slip in hard turns, and a manoeuvre-searching AI: C-59 items 6, 7, 9, 11, 26; C-59.6 in the Resolved log; C-60). Before that, 2026-10-11, after your notes on SB Test's feel (smooth motion between sim steps, a chase camera, faster craft, slower glowing tracers with muzzle flashes and sparks, bigger ships with matching hulls, banking and contrails: C-59 item 30, C-60). Before that, 2026-10-11, after your call on SB Test's drag (drag to the destination, and the ship banks there like a plane as far as its dial allows: C-59 items 9 to 11, C-59.9 in the Resolved log). Before that, 2026-10-11, after merging the SB Test ruleset (`docs/archive/ARENA-SB-HANDOFF.md`, phases B1 to B5) into the Arena branch: the picker asks for "SR V2 Combat" or "SB Test" before the scenario, SB runs on its own driver over the same scenario entries (C-59, C-60); this branch's first Arena decisions entry became C-58, as main's C-54 is the CD playtest. Before that, 2026-10-09, after your Arena calls on movement and action points (drag-and-release moves inside each ship's envelope, chained; one AP meter per pilot per round for everything; the Cool bonus: C-57 in the Resolved log, C-55 and C-56 rewritten). Before that, 2026-10-09, after the Arena (`docs/archive/ARENA-HANDOFF.md`: a campaign-free lab for space combat v2, with drawn paths fitted to the dial, continuous simultaneous execution, nerve-priced interrupts and doctrine AI; the decisions are C-58 in the Resolved log, the placeholders C-55, my readings C-56, what waits for E1 M-35). Before that, 2026-10-09, after the 0.2 playtest's §4 (the Black Market's art is never clipped: the wells keep a floor and the art scales inside them, the stall scrolls, the news feed stays off the Market's and the Arsenal's cards; phone rows grow to fit a weapon card: C-51 item 24, C-52, C-53). Before that, 2026-10-09, after the 0.2 playtest's §3 (the prologue's economy: a ledger test that plays New Game to the frontier on its own income, salvage from Hegemony wrecks, the prologue missions' authored rewards, the friend-of-Cass Graf price, the affordability net; the second Hangar section needs 12 rubble tiles excavated, which nothing teaches: C-51 items 16 to 23, C-52, C-48). Before that, 2026-10-09, after the 0.2 playtest's §2 (the base is taught by side beats: the Barracks when the bunks fill, the Infirmary at the first injury, the Workshop at the first ship home damaged; story recruits with no bunk sleep rough: C-51 items 7 to 15, C-52, C-48's room tutorial rows). Before that, 2026-10-09, after the 0.2 playtest's §1 (Rescue Tachi's prisoner rides in the truck; no cinematic moves a prisoner; enemies hold only from cover; ambush guards follow the truck: C-51, C-52). Before that, 2026-10-08, for release 0.2 (main gets the enemy-shot camera hold, guided pointers kept on screen, and no command bar out of combat: the Galaxy and the Arsenal keep their buttons in the panel and the dossier, the Black Market keeps the lot pop-up from the screens handoff part 3; C-50's Arsenal question is settled by C-33.7). Before that, 2026-10-08, after your call on the command bar (none out of combat: C-33 item 7, settled as C-33.7). Before that, 2026-10-08, after your note on enemy shots (the camera holds on each shot and its result: C-45 item 7). Before that, 2026-10-08, after merging the screens handoff part 3 into main (the Fire support menu, the Black Market's type-tinted cards and lot pop-up, Door Gunner Cover on every enemy in its zone, Heavy Bombardment at round end: its entry became C-50, as C-46 was already the prologue's). Before that, 2026-10-08, after iPad Pro 12.9" support (the tablet layout in portrait: C-49). Before that, 2026-10-08, after your phase 5 calls (a lost prize pilot grounds only their ship; Steal the Cross is a Steal Ship; C-47 items 30 to 37 settled as C-47.5; Steal Ship's lines stay placeholders). Before that, 2026-10-08, after the prologue's phase 5 (Raid the Bunker: the Steal Ship type on one engine with Steal the Cross, the indoor bunker map, the player's Reinforcements bringing the pilots; New Game now plays to the frontier: C-47 items 30 to 37, C-48's phase 5 rows, C-41 item 2 in part). Before that, 2026-10-08, after the prologue's phase 4 (Raid the Bunker on the board, Tachi's three pilots, the Black Market and Sweet Tooth, the second hauler and Hangar room: C-47 items 22 to 29, C-48's P4 rows and the Steal Ship type). Before that, 2026-10-08, after the prologue's phase 3 (the tense day, the Bureau's first Lead on Venn, Someone's Asking Questions and Lie Low: C-47 items 18 to 21, C-48's Lie Low row). Before that, 2026-10-08, after the prologue's phase 2 (Rescue Tachi as the new Ambush: Extract VIP mission type, Tachi Gard as the first Agent, Run Your Network built: C-46 resolved, C-47 items 11 to 17, C-48's mission-type rows). Before that, 2026-10-08, after the prologue's phase 1 (`docs/PROLOGUE-HANDOFF.md`: the onboarding as a script of beats, gates that hide mechanics until a beat opens them, today's chain ported with the doc's fixes, the Steal Fuel recruit and Strafing Run callout: C-46 partly built, C-47, C-48, M-34; the designer's prologue decisions in the Resolved log). Before that, 2026-10-08, after merging the base and combat work into main (its two entries became C-44 and C-45, as the weapon voices had taken C-43). Before that, 2026-10-08, after the weapon voices (a distinct sound per weapon, reports driven by the volley the tracers draw: C-43). Before that, 2026-10-07, after your calls on C-45 items 3 and 4 (no Flanked penalty; Take cover keeps the shot). Before that, 2026-10-07, after your cover rework notes (cover by the line of the shot, walls and corners, flanking, the AI's cover; quicker enemy shots; the rebel on turn auto-selected; Automatic (Deployed) -2 on the Razorrat: C-45). Before that, 2026-10-07, after your base and combat notes (Standby and Working at the base; the stun wears off; Leave gun and Pack up gun; Treat wound picks and marks its patient; the per-round check that ends combat once contact is lost: C-44). Before that, 2026-10-07, after the screens handoff part 2, §3 (the Intelligence tab — The Network, all four phases: C-42). Before that, 2026-10-07, after part 2's §4 (the slot-filling planning window: C-41). Before that, 2026-10-07, after part 2's §2 (the source approach and standby contacts: C-40). Before that, 2026-10-07, after part 2's §1 (the Starfighter window: C-39; the part 2 doc and its stylesheets landed). Before that, 2026-10-06, after your call on fire support: the transport assigned to a ground mission brings its own Supply Drop (if its type can fly one) and Door Gunner Cover (if a Door Mounted Gun is fitted), with no second ship (C-31 item 5 resolved). Before that, 2026-10-06, after your call to undo my fire support changes (the Supply Drop toggle is back on the planning board; the transport gives no fire support of its own; the crate carries no Med Packs: C-31). Before that, 2026-10-06, after the audio pass (the persisted sound setting, one toggle wiring, the base's split alert palette: C-38). Before that, 2026-10-06, after the screens handoff, screen 4 (the Missions tab: C-37; M-22 item 4 built). Before that, 2026-10-06, after screen 3 (the comm burst: C-36). Before that, 2026-10-06, after screen 2 (the personnel file: C-35). Before that, 2026-10-06, after screen 1 (the mission report: C-33, C-34). Before that, 2026-10-06, after your Hangar answers (4 × 4 sections, small and large pads, a 14 × 18 map: C-32). Before that, 2026-10-06, after the Haven Rock art handoff (art update 4: the base map and walk-in views, M-33). Before that, 2026-10-06, after your answers on C-29 and C-30 (enemy range with the shooter revealed; downed VIPs; every transport leaves; the transport's own fire support; the developer logo on the title screen: C-31). Before that, 2026-10-06, after your field changes (death, stims, Steal the Cross, the Personnel File, Flight Controller and Combat Support: C-29, C-30). Before that, 2026-10-06, after the Support specialties build (the Support Specialties doc; your answers on staff posts, C-28; M-14 resolved; M-32 lists what waits). Before that, 2026-10-06, after the designer's C-26 answers (mission text per type, the transport by name, guard names by type). Before that, 2026-10-05, after the October 5 art handoff and the designer's answers on the Back slot (C-25),
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
| C-15 | ⚪ | Prologue quips are placeholder lines | The designer's own opening lines |
| C-24 | ⚪ | Enemy types and loadouts the Enemies doc doesn't cover | Which enemies exist and exactly what each carries |
| C-28 | ⚪ | Support specialties: how fast Support rebels level | How fast every Support rebel levels |
| C-31 | ⚪ | Arrival lines: your text, reworded | The pilots' arrival lines |
| C-32 | ⚪ | The 4 × 4 Hangar: the pad drawing for the art kit | The next `sr-art.js` would undo the pad drawing |
| C-33 | 🟡 | Screens handoff: the holo callouts | The Missions tab's holo callouts |
| C-35 | 🟡 | Personnel file: pilot skill tiles and trait chip wording | What the skill tiles promise; how every file reads |
| C-40 | ⚪ | Source approach: standby contacts, and the old Risk number | How a potential source is taken on or parked |
| C-41 | ⚪ | Ground mission planning: the asset cap and a spare transport | How every ground sortie is put together |
| C-42 | 🟡 | The Network: every number is a placeholder (interrogation clock, exposure gains and bands, agent stats and costs); how new Agents are recruited; the base raid | The whole Intelligence tab's tuning |
| C-47 | 🟡 | Prologue: Tachi's pilot beat and Lie Low | When the bunker beats can start |
| C-48 | 🟡 | Prologue text still to write: every `[TEXT NEEDED]` the game shows or will show | Ambush: Extract VIP's and Steal Ship's lines, the Lie Low step, beats 19 to 22's pointers and callouts, the bunker raid's plan tutorial and call-in card, the room tutorials and the sleeping-rough card line |
| C-50 | 🟡 | Fire support: Saturation's wording | How Saturation reads |
| C-51 | 🟡 | 0.2 playtest: the second Hangar section | Whether a new player can land a second Graf |
| C-52 | 🟡 | 0.2 playtest: placeholder numbers to tune (the AI's cover scoring, the cover metric, sleeping rough, salvage, the prologue's rewards and Graf price, the affordability net, the market card's floors), with the economy table | How every enemy fights; what a missing bunk costs; the prologue's economy; the market cards |
| C-54 | 🟡 | CD playtest (8 Oct): the smaller items around the core-gameplay feedback (the two-classes-of-message UI rule, ground phase legibility, an overwatch tell, the briefing layout, the stealth rework, a narrow-win debrief line, ground impact effects, a flavour-text audit, the Marta prompt) | Future triage; none of it blocks current work |
| C-44 | ⚪ | Combat flow: hostiles out of contact, and extracting with hostiles alive | When a ground fight ends |
| C-89 | 🟡 | The switch to main: what I chose building S1 to S6 (open: which assets need a wing, item 25; the trait review, item 36) | Type 3.5 as the campaign's space combat |
| C-90 | 🟡 | The clean-up report's findings that need a decision (the UI kit's source behind the game, the prototypes, Type 3's sim systems, names that collide: leads, exposure, hardpoints; 3.5's text outside the workbook, old docs, stale numbers) | The project's tidiness; nothing the player sees |
| C-94 | 🟡 | S7, opportunities from Sources: Intercept Transport and Tanker Grab fly in 3.5 for everyone, Patrol Sweep from Pell, scaled to the wings sent, the Source's level hides modifiers; Tips (what I chose; the variants' profiles; the requirements still list fuel) | The campaign's space missions |
| C-93 | 🟡 | The Space Combat FTUE: Torch the Depots in Type 3.5 (Sera always flies it; easy sentries that never pin; the mission's own reward), the intro's live animations, the 16 steps (what I chose) | The prologue's first space mission |
| C-92 | 🟡 | Your freighter notes of 22 October: the Crash's gravity window, hits on her hull, a jump point is a jump point, weapon types, missiles that wait (what I chose; the repeaters called plasma; the Crash that still runs out of bombs) | How every 3.5 fight plays |
| C-91 | 🟡 | The switch's placeholders (wing size 1–4, crafting costs, Exposure and Lead numbers, the scaling rule, the Reserve's fuel, leader-death nerve, the support jobs' numbers) | How the switch's phases play |
| C-83 | 🟡 | Type 3.5: which ships have a hangar | Hauling and boarding into a hangar |
| C-82 | 🟡 | Type 3.5: the primaries' rewards | What each 3.5 primary pays |
| C-81 | 🟡 | Type 3.5 playtest 1: placeholders and text (the recorder's rates, the icon, boarding, ram, turret, shield, course and Pirate numbers; K3–K6's as they land) | How 3.5 plays and reads |
| C-80 | 🟡 | Type 3.5 playtest 1: the crew's hail | Whether the crew hail in every primary, about 20 s into any fight |
| C-78 | 🟡 | Type 3.5: every line is lab copy | The text you'll rewrite |
| C-77 | 🟡 | Type 3.5: placeholders (on the panel's Type 3.5 group) | How 3.5 plays |
| C-74 | 🟡 | High Command visual pass: lasers need a weapon, and the readability placeholders | Which ships get lasers; the hurt read |
| C-68 | 🟡 | High Command: placeholders (the sim Type 3.5 flies on: flight and fight, morale and pins, locks, missiles, chaff, collisions, the map and HUD, `HC_TACTICS` and `PERSONALITY`) | How High Command plays; every one is a getter, most on the panel |
| M-1 | 🟡 | Per-rebel Risk and notoriety | 8 Rebel Traits, 2 Character Traits |
| M-2 | 🟡 | Capture, interrogation and ambush | 4 Rebel Traits, Rescue Prisoners missions |
| M-3 | 🟡 | Family | 2 Rebel Traits |
| M-4 | 🟡 | Revive and rescue in space: the traits | Failed to Save; a pod pickup grants no Saved/Owes a Life |
| M-5 | 🟡 | Command decisions and story events | 6 Rebel Traits |
| M-7 | 🟡 | Mission and location tags (civilian, populated, criminal) | Streetwise, Former Criminal, Haunted, Mission Specialist reach |
| M-8 | 🟡 | Boarding theatre: Marines | Marines are data-only |
| M-9 | 🟡 | Rebel-linked economy hooks (Intel, Materials, diplomacy) | 7 Character Traits |
| M-10 | 🟡 | Carried-gear effects: Strong, Scrawny's melee half, Messy, melee, lost gear | 2 Character Traits and a half |
| M-11 | 🟡 | Pilot critical injuries and space-side gear | Pilots get no named injury in 3.5; gear only matters on foot |
| M-12 | 🟡 | Old injuries: permanent Limp, Old Wound | 6 Rebel Traits |
| M-13 | 🟡 | Specialty abilities (the active ability each specialty gives) | 15 of 16 specialties |
| M-15 | 🟡 | Vehicle stats and a way to own a crewed vehicle | Player-owned cruisers, the Driver specialty |
| M-17 | 🟡 | Items with no mechanics yet (`live:false`) | 7 catalogue items and the owned rocket launcher; kept out of the market |
| M-18 | 🟡 | Rev 2+ market weights | Black Market stock once Level 2 lands |
| M-21 | 🟡 | No art descriptions for the fuel depot and the Bruiser | Both draw restyled fallbacks |
| M-22 | 🟡 | Galaxy follow-ups: locked-world dive-in, mission regions, the phone World view | Exact marker placement; the phone World view ships provisional |
| M-23 | 🟡 | Gunship rocket counterfire built, but no enemy spawns with a rocket launcher; shot-down ship has no campaign cost | The gunship risk you specced never triggers today |
| M-24 | 🟡 | Loot rules still open: random crates, gear lost on death (enemy drops are built) | Rolling loot crates; Messy |
| M-28 | 🟡 | Vehicle criticals and wreck damage are placeholders | How vehicle fights feel |
| M-29 | 🟡 | Art follow-ups from the October 5 art handoffs | A weary icon; Helix and the ship weapon makers in the Gear doc; poses that wait on items |
| M-30 | 🟡 | One map per mission type | Every deployment of a type plays on the same layout; only the names change |
| M-31 | ⚪ | Ship names: a bought ship is "Hauler 2" | Mission lines read "the Hauler 2"; a non-Graf transport would still be drawn as a Graf |
| M-32 | 🟡 | Support unlocks that wait on systems not built (the Network, crafting, research…) | 97 of 161 niche unlocks and 3 of 16 base effects; 12 niches have nothing live yet |
| M-33 | 🟡 | Haven Rock art: no Tech Lab furniture or simulator pod in the kit; the base alert has no rule | The Tech Lab draws a stand-in; the alert fires at 70 network heat |
| M-34 | 🟡 | Prologue: stubbed beats (security forces arrive, the first Campaign, the farewell) | Everything after Raid the Bunker; the prologue ends at its frontier until they are written |
| M-40 | 🟡 | The switch to main, for later: phone and iPad for 3.5, the capture system, the Fleet feature, real crafting, Spoofed Orders and the pirates (to scope), the Wing Leader post, squadrons, K7's HUD layout, the design doc's parked items | Nothing in the switch |
| M-39 | 🟡 | The opportunity system beyond Type 3.5: ground missions and the editor | Ground missions on the grammar; the opportunity editor |
| M-38 | 🟡 | Type 3.5 planning windows: art (the objective, secondary and rule glyphs are placeholders; the asset thumbnails need art) | The windows' look |
| M-37 | 🟡 | Type 3.5 playtest 1: missing | Turret tracking and per-turret art for stations and capital ships; the activity glyphs; mission thumbnails |
| M-36 | 🟡 | Type 3.5: what waits for systems that don't exist yet | Burned Agents, other target types, the later objectives and powers, prop art, drone speech |

(Counts are as of today: 12 of 45 Character Traits and 27 of 59 Rebel Traits are listed but never granted.)

---

## 1. Conflicts
### C-89 🟡 The switch to main: your decisions, and what I chose building each phase
`docs/MAIN-SWITCH-HANDOFF.md`. Your 21 October decisions (its §1) make Type 3.5 the campaign's space combat. One item a
phase, added as each is built. **Every other reading in C-75 to C-87 stands as interim** (§1).

*Items 1 to 11 (S0, and S1's first two) are confirmed as built (the designer, 27 October 2026: the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

**S1, Type 3.5's campaign scene** (built; `game/js/space35.js`, `tools/space35-smoke.js`):
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
- The tag is placed (`archive/space-experiments-2026-10`); merge the branch (§3).
- Read `docs/CLEANUP-REPORT.md`; C-90 lists what needs a decision.
- Answer item 25.
- Work through `docs/TRAITS-35-REVIEW.md` (item 36).

**Your call:** _open_

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

### C-91 🟡 The switch's placeholders
`docs/MAIN-SWITCH-HANDOFF.md`. The handoff's own placeholder numbers, logged before the phases that use them; each one
goes on a panel when built:

| Placeholder | Value | Phase |
|---|---|---|
| Wing size | 1 to 4 ships (the High Command doc's "2–5" said squadrons come later) | S3 (built: `WING_MAX`) |
| Crafting costs | the rewards proposal's (Unmanned Ram 150c 120m, Nuclear-tipped Ram 350c 200m 1i, Fire Ship 80c 100m, Minefield 100c 80m, Interdictor Buoy 200c 60m 1i, Comms Relay 120c 40m, Rescue Tug 160c 80m, Boarding pod 120c 60m) and mine (Bombs 100c 60m, Cargo pods 80c 50m, Boarding party 100c 40s); time 0 days | S5 (built) |
| Dig deeper | 1 `G.intel` each | S6 (built) |
| Firebrand Broadcast | +5 `G.exposure` | S6 (built) |
| An escaped witness | +2 `G.exposure`, and a 25% chance of a Bureau Lead | S6 (built) |
| A 3.5 pilot's XP and skill use | +0.15 a win, +0.05 a loss, 0.02 a kill; Aim from hits, Focus from damage taken, Presence for a leader | S6 (built) |
| The trait mapping | `SR_OPS.TRAIT_MAP`: each rebel trait's help weight or relationship (C-89 item 36) | S6 (built) |
| Scaling to the force sent | data on the template (`scale: {perWing, min}`): the numbers in C-94 item 5 | S7 (built) |
| A Reserve's fuel | half, for a Reserve that's never called | S8 |
| Mounts and hardpoints | `mounts` (was `weapon_slots`) and `hardpoints` (was `hard_points`), counts; each attachment's hardpoints: Bombs 1, Cargo pods 1, Boarding party 1, Boarding pod 2 (C-90.4) | S2, reworked 27 October (built) |
| The Brickbat | 2,400 credits; 30 fuel a sortie (no passenger room: your answer) | S2 (built) |
| The FL-400 | 80 fuel a sortie (unused: not ownable) | S2 (built) |
| The attachments | Bombs, a rack of three; Cargo pods carry 2 containers | S2 (built) |
| A leader's death | −35 nerve for their own wing, −8 for the others; Brave halves it | S9 |
| The support jobs | every number in the handoff's §4 | S10 |

**Needs from you:** nothing yet. Each number is yours to change once it's on a panel.
**Your call:** _open_

### C-94 🟡 S7, opportunities from Sources: what I chose
`docs/MAIN-SWITCH-HANDOFF.md` S7, with your answers of 26 October. Tests: `tools/opps35-smoke.js`.

1. **Templates** (decision 5): Vulnerable Freighter is the template; **Intercept Transport** and **Tanker Grab** are its
   variants (`variant()` in `sim-hc35.js`), each with its own target (a transport, a fuel tanker), escort (the tanker
   half: two, not four) and reward (the campaign mission's own: 600c, 140s, 100m and 320c, 240s, 240f). Placeholders.
   - The tanker's "twice the load" isn't in the fight: the FL-400's art has twelve cargo modules. It's in the reward.
2. **A Source reveals one.** Ferren Halt's signal (Intercept Transport) and his event (Tanker Grab) put them on the
   Missions board as one-wing space missions, as before; now **Plan mission opens Type 3.5 for every player** (your
   answer), so the off-screen dice roll is gone for them. Fuel isn't paid for a 3.5 flight until S8, though the board's
   requirements still list it.
3. **The Source's level sets what's hidden** (its `subtle` rule): the opportunity flies as that Source revealed it
   (`intercept_transport@halt-2`), so a level-1 Halt hides more than a level-3 one. Window 1's Intel strip says who
   ("From Ferren Halt · Lv 2"), and the reveals and the debrief name them, not Cass.
4. **It pays the mission's own reward** on a win (what the board promised), not 3.5's stand-ins, for every Source's
   opportunity, until the rewards proposal is yours.
5. **Scaling** (decision 3): the escort, the response and Patrol Sweep's patrol are sized to the wings sent (Strike and
   Reserve), from data on the template (`scale: {perWing, min}`). Placeholders, sized so the demo's three wings meet
   what was authored:

   | | Per wing | At least | One wing | Three wings |
   |---|---|---|---|---|
   | The freighter's escort | 1.4 | 1 | 1 | 4 |
   | Its response | 1.7 | 2 | 2 | 5 |
   | The tanker's escort | 0.7 | 1 | 1 | 2 |
   | Patrol Sweep's patrol (its lead always flies) | 2.4 | 3 | 3 | 7 |
   | Its reinforcements | 1.4 | 2 | 2 | 4 |

   An Ambush needs as many kills as came, at most `AMBUSH_KILLS`.
6. **Patrol Sweep** is a mission of its own, revealed by **Orrin Pell** (your answer) once his first job (the rescue)
   is done. Placeholder copy and reward (300c, 80s, 2i).
7. **Tips** (your answer): the intel jobs (`G.opps`, shown as "leads") are now **Tips** on screen (the galaxy layer,
   the diamonds, the window "Intelligence tip", the news) and `G.tips` in code (`tipId` on a mission;
   MIGRATIONS 18 → 19). The Bureau keeps "Current Leads". This settles C-90 item 4's first collision.
8. **A wing leader in trouble never refuses themselves** (C-90 item 9): alone, they don't consult themselves (another
   wing may come); with wingmates they call one in ("Wren, on me!") or handle it alone. `SIM_VERSION` `hc35-17`.

**Needs from you:** nothing new. Item 1's profiles and item 5's numbers are yours to tune.
**Your call:** _open_

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
6. **Fuel isn't paid** for a 3.5 flight yet (S8), so the depots cost no fuel now.

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

### C-80 🟡 Type 3.5 playtest 1: the crew's hail
*Items 2 to 12 are confirmed as built (the designer, 27 October 2026: the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

1. **The crew now hail about 20 s into any fight, whatever the primary.** With the spec's drain (`RES_THREAT` 1.5 a
   second for each ship within `THREAT35_R`) three ships take 70 resolve to 0 in about 15 s. You get a card; but left
   unanswered, the persona's default decides it, and *Take the cargo* lets the freighter go, which loses a Destroy,
   a Steal or a Crash (it did in my scripted tests until I turned the drain off there). Is the hail meant to come up
   in every primary, or only while a wing is on Intimidate (or Pirate is the primary)?
**Your call:** item 1

### C-81 🟡 Type 3.5 playtest 1: placeholders and text
- **The flight recorder:** a sample and a checkpoint every 20 ticks (1 s), 10 runs kept (`flight-rec.js`).
- **Icons (K1):** `ICON_PX` 18, `ICON_FADE` ±15%, the icon's size 22 px, `FX_MIN_PX` 28 (the panel's FX group), and
  the opening zoom's 30 px fighter (`FIT_PX`).
- **Boarding (K2):** `HOLDOFF_R` 3,200, `DOCK_STAGE` 600, `DOCK_SPD` 0.3 × cruise, `DOCK_SNAP` 80, the 1 s blend, the
  dock point 0.6 × the Brickbat's size off the hull, the final leg's corner-speed turn below 0.35 rad lined up and its
  round-again at 1.6 × `DOCK_STAGE`.
- **The ram:** `RAM_SPD` 1.4, `RAM_HULL` 120, `RAM_ARM` 60, `RAM_DMG` 220 (was 140), `RAM_CORE` 60, the 120 ms hitstop,
  the 0.6 shake.
- **Turrets:** `PD_TRAVERSE` 0.9, `PD_ON_TARGET` 0.08, `PD_RETARGET` 2, `PD_LAG` 0.4, `PD_SPREAD_BASE` 0.02,
  `PD_TRANSV_K` 0.25, `PD_SPREAD_MAX` 0.35, `PD_ARC` 3.49 (200°).
- **Shields and mass:** `SHIELD_CD` 24, AUTO under 30% and hit in the last 2 s; mass = size class².
- **Course keeping:** `CAP_TURN` 0.05, `CAP_TURN_ALARM` 0.08, `CAP_REALIGN` 3.
- **Pirate and the stuck guard:** `RES_THREAT` 1.5, "THEY'RE WAVERING" at 30, `INTIM_STANDOFF` 600, No deal back to 40
  with 30 s before the next hail, `EXEC_STALL` 90, `POD_CAPTURE_R` 2,500 (used in K6).
- **Lab copy (`[TEXT NEEDED]`):** "Who's stopping it so we can get aboard?", "We're getting nowhere. New orders?",
  "They're not folding, Base.", the callouts RAM IMPACT · {WHAT} DOWN / HIT, RAM DESTROYED, THEY'RE WAVERING, THEY'RE
  HOLDING OUT, CARGO SURRENDERED · {n} CRATES, the verbs "guarding the transfer", "closing to board", "closing to haul",
  "waiting for the holds to open", the debrief's "Your ram {knocked out the engines / was shot down {n} m short} at {time}", "You answered their hail at
  {time}" and "{who} decided: {answer} (no answer from you)".
- **Damage numbers and shields (K3):** `SHOW_DMG` 0 (off); `SH_PAD` 10, the beam gap 10°, the refill sweep 0.6 s at a
  gain of 0.1 × the half in 1 s, the 10% swell; the quiet arcs' widths and alphas; enemies' arcs for 2 s after a hit;
  the bars' 0.6 s ease and 0.7 s glint; the red pulse under 15%.
- **The death spin:** `spinK` 4, `spinMin` 0.4, `spinMax` 9, `spinGrow` 1.6, no spiral from size 9 (`spiralMaxSize`),
  the chance's 0.5 + turn ÷ cap.
- **Badges and callouts (K4):** the badge 22 px (`BADGE_R` 11), its pop 1.3 × over 200 ms, the fan 14 px; the
  callout's 0.2 s pop, 2.5 s hold and 0.5 s fade, the edge arrow's 3 s; {PILOT} HIT under 30%; the arriving card's
  200 ms slide and two gold flashes.
- **Lab copy (K4, `[TEXT NEEDED]`):** every verb's words in `verbOf` (sim-hc35.js), "{Wing} on station", and the
  callouts in C-79 item 36.
- **The readout (K5):** its place and size (276 px, top right), the schematic's 260 × 84, the rings' zoom (0.5) and
  sizes, the 14 px pick; the tips' lines ("It can't run or jump.", "No distress call can go out.", "Point defence: it
  struggles against fast ships." …) are lab copy.
- **The Missions tab and the windows (K6):** the board's 290 px, the rail's 340, the windows' 1180 × 760 and
  1600 × 860 (shrunk to fit), the 360 px order column, the 92% panel, the 3% scanlines, the 220 / 180 / 120 ms
  motions; the mock pills (1,240, 86, 54), the comms lines, "Crosses in about 4:30", "Escort of four Motes",
  "Smuggler · Dustfall", "Thessa Reach · Remote system" and every tip's copy (`tipFor` in `arena-hc35.js`: the orders,
  roles, plan markers, lane ticks and gravity window) are lab copy, `[TEXT NEEDED]`.
**Your call** (the designer, 27 October 2026): the copy goes in the export of Claude-written copy (C-78). The numbers: tune on the panel.

### C-82 🟡 Type 3.5: the primaries' rewards
`docs/ARENA-HC35-FEEDBACK-2.md` L1.
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

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

**Needs from you:** the rewards proposal. Until then these stand-ins pay for the test bench's demo; a Source's opportunity pays the mission's own reward (C-94 item 4).
**Your call:** _open_

### C-83 🟡 Type 3.5: which ships have a hangar
`docs/ARENA-HC35-FEEDBACK-2.md`.
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

9. **Hauling doesn't need her stopped either**, by the same reasoning as boarding; and **no ship has a hangar
   yet**: say which (the FL-400? a bigger Hegemony ship later?) and where it sits on the hull.

**Needs from you:** which ships have a hangar, and where it sits on the hull.
**Your call:** _open_

### C-77 🟡 Type 3.5: placeholders
Every number in `sim-hc35.js` is a getter on the designer panel's **Type 3.5** group (Opportunity, Freighter, Phases,
Comms, Powers, Requests): the freighter's crossing time, its alarmed speed and jump spool, the escort's station, the detection
ring, its rates and the jump-in ring, Intel to dig with; the comms delay's parts; command points per phase, each
power's cost and what it does; the requests' timing and caps, their triggers, ejection and pods (Requests).
**Your call:** tune on the panel

### C-78 🟡 Type 3.5: text
Every line in Type 3.5 is lab copy you'll rewrite: the opportunity's lead, the modifiers' lines, the objective and
rule cards, the wings' takes, the critique lines, the request lines, the power cards and the debrief's lines. None of
it reaches the campaign without the normal `[TEXT NEEDED]` flow.
**Your call** (the designer, 27 October 2026): an export of all the copy in the game that Claude wrote, not the designer's own, to review and edit; anything AI-written needs their look. _Building._

### C-74 🟡 High Command visual pass: lasers need a weapon, and the readability placeholders
The space FX pass (`game/art/sr-space-fx.js`, `docs/art/HC-VFX-HANDOFF.md`).
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

1. **Lasers have art but no gun.** You asked for laser shot effects beside the ballistic ones. The art kit now has
   two laser projectile styles (`PROJ.shiplaser` warm, `PROJ.heglaser` cold — drawn as a coherent beam-dart, not a
   tracer) and the renderer path for them, but no weapon in the game's data fires them, so in play nobody lasers.
   **Your call:** which ships or weapons (if any) switch to lasers — a new weapon row, or a variant on an existing
   one. Until then they show only in the style guide and the stress scene.
2. **The hurt read's thresholds are placeholders you named once:** smoke trail at ≤ 25% hull, fire + smoke at
   ≤ 10% (`TUNE.trailSmokeAt` / `trailFireAt`). Confirm or move them.
9. **At High Command speeds the smoke trail reads as dots.** A ship at about 540 a second, puffing 9 times a second,
   drops a puff every ~60 units: at zoom 0.45 that's a dotted line, not a ribbon. Raise "Smoke trail puffs /s" on
   the panel, or the artist could space the puffs by distance flown rather than time.

**Needs from you:** a call on (1); confirm or move (2); for (9), a panel setting or an artist's change.
**Your call:** _open_

### C-68 🟡 High Command: placeholders (the sim Type 3.5 flies on)
Every number in `game/js/sim-hc.js` marked `// placeholder`, each with a getter (`SIMHC.fn.THINK_SECS_()`…, or the
`SIMHC.TUNE` table the panel's HC group is built from).
*Trimmed in the blockers sweep (27 October 2026): the rows for Type 3's own commands, rules and scenarios are retired (3.5 has its own command points, powers and Preservation Order); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*
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
| `HC_MAP`, `HC_SPREAD` | 16 (panel to 48, on restart; was 2, then 4 until C-70, 8 until C-71, 32 until C-72), 4 (panel, on restart) | The map is `HC_MAP` × space.js's 4,200 × 3,000; a scenario (written for 2) is scaled to `HC_SPREAD` and sits in the map's middle (C-69 item 2, C-70 item 3) |
| `ARRIVE_OUT` | 2.6 × the turn radius | How far a ship flies out to line up on a point it can't turn into (C-70 item 5) |
| `HC_TACTICS` | the table in `sim-hc.js` | Each tactic's weights: formation keeping, spacing, fighting range, focus fire, flank, screen, hit-and-run, disengage hull, leash |
| `PERSONALITY` | eager 1.25 / 0.6 / 0.6, steady 1 / 1.4 / 1 | Fighting range ×, formation weight ×, disengage threshold × |
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
| `FEED_ROWS`, `QUIET_ALPHA` | 5, 0.4 (`arena-hc.js`) | The feed's height in entries; quiet lines' strength (C-70 items 28, 30) |
| `BADGE_MS`, `BADGE_MAX`, `BADGE_R` | 2,500 ms real time, 3, 11 px (`arena-hc.js`) | Status symbols: how long, how many a ship, their size (C-70 item 31) |
| `NERVE_K` | 0.6 (panel) | Every nerve loss × this, High Command only (C-67 item 17) |
| `BARK_GAP` | 4 s (panel) | A pilot speaks about a new job at most this often; emergencies, kills, steadying and rules always speak (C-69 item 22) |
| `BUBBLE_MS`, `BUBBLE_MAX`, `BUBBLE_W`, `BUBBLE_POP` | 2,000 ms real time, 4, 210 px, 140 ms (`arena-hc.js`) | A speech bubble's life, how many show at once, its width, its pop in and out (C-69 item 23) |
| `PIN_N` | 2 (panel) | This many hostiles with their guns on a ship pin it |
| `TILE_Z`, `TILE_BUDGET`, `TILE_WARM` | 0.34, 3 ms, 4 rounds | A camera tile's zoom; what the tiles may cost a frame (with 8 or more) before they fall back to static glyphs; how many rounds are drawn before that is measured |
| `TS_SLOW`, `TS_FAST` | 0.3 ×, 3 × (panel) | The slow and fast speeds |
| `RAID_TURN_R` | 700 (panel) | A raider turns from your station onto a fighter this close with its guns on it |
| Tactic weights | the `HC_TACTICS` table (panel, 60 sliders) | Every tactic's formation, spacing, fighting range, focus, flank, extend, pass, tail-chasing, disengage and reach |
| `HELP_SECS`, `PIN_CLEAR` | 15 s, 3 s (panel) | How long a sent wingmate helps at most; how long after a pin breaks it clears |
| `DISENGAGE_R` | 1,600 (panel; was 1,100) | Withdrawing and falling-back ships steer wide of hostiles inside this |
| Abilities | recharge: Boost Shields 8 s, Lock In 14, Boost 10, Drift 10, K-Turn 12, Barrel Roll 9, Field Repair 25 | Effects: shields +15% of their total to the weaker side; nerve +35; 2 s at boost; 3 s of the nose on a pursuer; a flip at half speed; half the hit profile for 1.5 s; hull +15% (the copied `space.js` amounts where one exists) |
The gun, lock, spread, damage and nerve numbers are SB's (C-60, C-64, C-65, now in `docs/archive/DESIGN_BLOCKERS-ARENA.md`), copied with their values.
**Your call:** _open_

### C-54 🟡 CD playtest (8 Oct): UI rules and feedback gaps for future triage
*Trimmed in the blockers sweep (27 October 2026): items 9 and 10, the old space combat's bugs, are retired; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*
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

**Bug seen live:**
11. **Two onboarding hiccups on the CD's run:** the restore-the-Marta prompt didn't fire when expected, and the
   plan-mission lockout caused by an injured rebel surfaced no reason — the lockout was correct, the *why* wasn't
   shown.

**Needs from you:** calls on 1–5; 6–8 and 11 need only a priority. The Claude-written copy export (C-78) is the first pass of item 8.
**Your call:** _open_

### C-51 🟡 0.2 playtest: the second Hangar section
`docs/FEEDBACK-0.2-HANDOFF.md`.
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

23. **Open: the second Hangar section.** The map has no free 4 × 4 floor: the cheapest block (`hangarPlan`) has 12
   rubble tiles to excavate first (480 materials, a day), on top of the section's 960c and 800m, and one of its halves
   must be made a large pad (free, in the Hangar's room view) before the second Graf can land. The handoff's cost table
   left the excavation out. The ledger and the net count it, and the rewards (C-52) cover it, but the hauler tutorial
   (beat 22) has no step for excavating or for the large pad.

**Needs from you:** should the block beside the Hangar start cleared, the hauler tutorial gain steps for excavating and for the large pad, or both?
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

### C-50 🟡 Fire support: Saturation's wording
The Fire support menu (screens handoff part 3).
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

2. **Door Gunner Cover works every enemy in its zone** (the cap of 3, or 5 with Saturation, is gone), for 2 rounds
   (one pass per round, as before). Saturation's rule now reads "The door gunner's zone is half again as wide;
   strafing blasts are wider." Confirm that wording.

**Needs from you:** confirm Saturation's wording.
**Your call:** _open_

### C-44 ⚪ Combat flow: hostiles out of contact, and extracting with hostiles alive
Your notes of 2026-10-07 (Standby, Working and the combat-flow fixes).
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

8. **Open:** alerted hostiles out of contact **hold still** in free time (they do not hunt the squad), and free-
   time **extraction still needs every hostile down** (in rounds, only none near the LZ). Should the Hegemony
   search for the squad, and should the squad be able to extract with hostiles alive but far away?

**Needs from you:** a call on item 8.
**Your call:** _open_

### C-15 ⚪ Prologue quips are placeholder lines
The three soldier quips after the prologue briefing (A3 of the handoff) are reused lines: the old cinematic lead
line, one of Runa's barks and one of Kel's. They sit in one table, `PROLOGUE_QUIPS` in `game/js/ground.js`, so
they can be rewritten without touching anything else. **Needs from you:** the real lines (and whether each should
be pinned to a named rebel or go to whoever stands first, second and third).
**Your call:** _open_

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

### C-28 ⚪ Support specialties: how fast Support rebels level
The Support Specialties doc (`game/js/support.js`).
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

4. **Experience.** You set no pace, so: 0.03 of a level a day working the room, 0.06 on a Job (about 17 to 33 days a
   level), 50% faster as Staff under a higher Lead or when Tutored. Level 19 is a long way off at this pace.

**Needs from you:** an experience pace.
**Your call:** _open_

### C-31 ⚪ Arrival lines: your text, reworded
Rescue and Steal the Cross.
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

6. **Arrival lines (your text, `game/js/mission-text.js` `arrive`, and the Steal the Cross and Strider cutscene
   lines)** said the pilot would wait at the LZ with the engines warm. I reworded them so the pilot stays overhead
   and comes back. Please check the words in the spreadsheet.

**Needs from you:** your wording for the arrival lines.
**Your call:** _open_

### C-32 ⚪ The 4 × 4 Hangar: the pad drawing for the art kit
The bigger base and the 4 × 4 Hangar.
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

- **Art:** the kit draws one pad per tile, so I added `o.pads` to the kit's Hangar (small circles, large rectangles
  with corner marks, the lounge and bay sized to a pad). It's marked as a repo addition in `sr-art.js`.

**Needs from you:** ask the artist to fold `o.pads` into the next art handoff, or the next `sr-art.js` will undo it.
**Your call:** _open_

### C-33 🟡 Screens handoff: the holo callouts
`docs/ui/SCREENS-HANDOFF.md` §6.
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

2. **Holo callouts** (Missions tab, built): the optional `holo` field per mission (`MPOOL` / `MEXTRA`). Steal the
   Cross has your example lines; every other mission shows its first two objectives as Target and Extract (optional
   ones skipped). Please write the callout lines for each mission.

**Needs from you:** the callout lines for each mission.
**Your call:** _open_

### C-35 🟡 Personnel file: pilot skill tiles and trait chip wording
The personnel file (`personHTML` in `game/js/base.js`).
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

1. **Skill effects for pilots (a conflict).** The handoff says Aim reads `aimOf(p,'s')` and Focus `focusTN`, but the
   space scene flies with the database's skill-and-level bonus (`pilotAim`, `SRDB.skillBonus`), and `focusTN` is
   read nowhere. They differ: a level 4 pilot is "+6 to hit" by `aimOf` and +4 in the cockpit. The tiles show what
   the game does. On foot Aim is `soldierAim` (the Vanguard bonus included). Constitution, Agility, Presence and
   Cunning use the handoff's formulas, which are the ones the scenes read.
2. **Good and bad effect chips** for every Character Trait are my wording, split from the effect line (`g` and `b`
   in `CT`, `game/js/rebel.js`). Experiences get one chip, marked bad for the ones that mostly cost the rebel
   (`BAD` in `game/js/rebel-exp.js`); mixed ones (Hardened, Desensitised, In Love…) count as good.

**Needs from you:** whether (1)'s tiles should change to show Type 3.5's numbers once it flies every space mission; the chip wording in (2).
**Your call:** _open_

### C-40 ⚪ Source approach: standby contacts, and the old Risk number
The Approach window and standby (`docs/ui/SCREENS-HANDOFF-2.md` §2).
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

1. **Standby contacts never give up.** The handoff leaves it undecided whether a contact left waiting on the
   Galaxy map eventually walks away; until you call it, they wait forever.
3. **"+4 network heat" moves `G.heat`** (was "+4 exposure" on `G.risk`, renamed by C-90.4). The row was worded for §3's Exposure system;
   recruiting bumps the network risk number exactly as before. When §3 lands, this becomes `G.exposure`.

**Needs from you:** a call on (1); and on (3), whether taking on a Source should add to the Bureau's Exposure (`G.exposure`) instead.
**Your call:** _open_

### C-41 ⚪ Ground mission planning: the asset cap and a spare transport
The slot-filling planning window (`docs/ui/SCREENS-HANDOFF-2.md` §4), for ground missions.
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

1. **The 2-extra-asset cap stays**, as the handoff asks, until you say otherwise.
2. **The Reinforce mode is retired.** Fire support now comes from what an asset is: a starfighter strafes, a
   transport with a Door Mounted Gun covers the door, a drop-capable transport flies the Supply Drop. A spare
   transport with no gun grants nothing — what it *should* grant (the old Reinforce) is the handoff's open
   question. Nobody rides a support ship any more, and its seats go unused. *Since the prologue's phase 5:* a mission
   that flies with Reinforcements (Raid the Bunker) brings it back for itself (C-47.5 in the Resolved log); everywhere else a spare
   gunless transport still grants nothing.

**Needs from you:** calls on (1) and (2).
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
### C-47 ⚪ Prologue: Tachi's pilot beat and Lie Low
The prologue's beats (`game/js/prologue.js`, `docs/PROLOGUE-HANDOFF.md`).
*Trimmed in the blockers sweep (27 October 2026): the rest is retired (the Resolved log); the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*

24. **Timing clash:** Tachi's pilot beat starts with one day of Lie Low left on her cell, and operations wait while a
    cell lies low, so the Recruit she asks for can't start until the next day. Recruit also waits while Run Your
    Network's recruits sit undecided at the Command Center. The pointer shows either way. Shall the bunker beats start
    later, or Lie Low not block Recruit?

**Needs from you:** answer item 24.
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

---

## 2. Missing systems

Each item says which listed traits or features it keeps switched off (they appear on the dossier's trait lists
and in the registry but are never granted).

### M-1 🟡 Per-rebel Risk and notoriety
**Blocks:** Wanted, Hegemony Informant, Defector, Rebel Celebrity, Propaganda Poster, Hero of the Rebellion, Made a
Name for Themselves, Symbol of the Rebellion (Rebel Traits); Streetwise and Former Criminal
(Character Traits, which reduce it).
**Why:** today there is one number, network heat (`G.heat`, was `G.risk`), and only Sources move it. The traits describe
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

### M-4 🟡 Revive and rescue in space: the traits
**Blocks:** Failed to Save [B]; the space half of Saved/Owes a Life.
**Why:** the rescue window exists now, in Type 3.5: an ejected pilot's pod drifts and can be picked up by a ship or
the Rescue Tug, with the outcomes set by decision 4 (picked up = injured, lost = dead, captured). No trait hears of it:
Failed to Save is still switched off, and a pod pickup doesn't grant Saved/Owes a Life.
**Needs from you:** does picking up a pod grant Saved / Owes a Life (the rescuer and the rescued)? Does Failed to Save
fire when a wingmate's pod is lost or captured, or whenever an ally dies in reach?
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

### M-8 🟡 Boarding theatre: Marines
**Blocks:** Marines doing anything a Soldier does not. Marines exist as data (a ladder, a gear set, the dossier),
but no scene needs them and no recruit is ever a Marine.
**Why:** boarding is in Level 1 now: Type 3.5 boards freighters with a Graf's boarding party or a Brickbat's boarding
pod. But that boarding party is a crafted attachment, not people, so Marines are still data-only and there's no
boarding scene.
**Needs from you:** should a boarding party be crewed by your rebels (Marines, or Soldiers), and should boarding become
a scene of its own? If not, confirm Marines stay data-only.
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
**Why:** decision 4 settled the coarse outcome: a pilot picked up comes home injured (laid up), and a lost one dies
through the Infirmary's Critical Condition rule. Two things are still open:
- **The injury table.** Type 3.5 gives a pilot no named injury from the critical table (only the old `space.js`
  cockpit-breach concussion exists, and it goes with `space.js` at S11).
- **Space gear.** A pilot's gear slots only matter on foot; fighters have loadouts but pilots carry nothing personal.
**Needs from you:** should a pilot roll a named injury (picked up from a pod, or from hull criticals), and from which of
the 12? Should a pilot's gadgets matter in space?
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
*Trimmed in the blockers sweep (27 October 2026): item 4 is retired; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md`.*
1. **Locked and uncharted worlds don't dive in** — they open the docked panel at galaxy level, as the handoff
   ships it. Its proposal (dive in shrouded) waits on you.
2. **Missions without a `region`** (e.g. Akkaro Garrison Raid) fall back to the world's first settlement for
   markers and the region card's Local job. Adding `region` to `MPOOL` entries makes placement exact.
3. **The phone World view** uses the provisional layout (planet on top, panels as a bottom sheet, minimap
   hidden) and needs its own design pass.
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
- **The base alert.** There are no raids yet, so the whole base pulses red when network heat (`G.heat`)
  reaches **70** (`BASE_ALERT_HEAT` in `base.js`). I picked 70, where a Source starts to risk a burn.

Smaller choices: the Maintenance Bay's pad holds the most damaged ship (the one the bay repairs); Surgery in a
one-tile Infirmary isn't drawn, because the kit only gives it a tile in a bigger room; free rebels walk the longest
corridors; resting and conked-out rebels sleep on the Barracks beds, and the laid-up lie on the Infirmary beds.
The kit's Barracks shows 3 beds a tile whatever the upgrades (Bunks stack them, Quarters add partitions), so the
beds on screen can number fewer than `bunkCap()`.
**Blocks:** what the Tech Lab and the simulator look like; when the base alert fires.
**Needs from you:** Tech Lab furniture and a simulator pod in `sr-art.js`, and an alert rule (an exposure threshold,
or the raid system when it exists).
**Your call:** _open_

### M-40 🟡 The switch to main: what waits for later
`docs/MAIN-SWITCH-HANDOFF.md`. Your decisions logged these for later; none blocks the switch:

- **Phone and iPad support for 3.5** (decision 6). The test bench and 3.5's screens are built for desktop.
- **The capture system** for captured pilots, with M-2. Until it exists, a captured pilot counts as dead (S6).
- **The Fleet feature.** The FL-400 joins the player's fleet once it's designed. Until then it appears in missions
  only (S2).
- **The real crafting system.** S5's Crafting tab is a placeholder.
- **Spoofed Orders and Call the Pirates in the campaign** (C-89 item 34), for you to scope: the rewards proposal has
  Spoofed Orders coming from intel work and the pirates as a Black Market hire (300 credits). Neither exists, so a
  campaign mission can't take them yet; the test bench's demo still can.
- **The meta layer's Wing Leader post** (traits, bonuses). In 3.5 the leader is only the wing's decision-maker (S3).
- **Squadrons** (wings of more than 4).
- **K7, the HUD layout pass**, following your mock-ups 5–8 as they arrive (decision 14; moved here from M-37).
- **The design doc's parked items** (carried over from M-35): FFG-style mods, doctrine pages as intel, the one authored
  fly-it-yourself setpiece, and how much of each doctrine's tell the game shows.

**Blocks:** nothing in the switch's phases.
**Needs from you:** each in its own time.
**Your call:** _open_

### M-39 🟡 The opportunity system beyond Type 3.5: ground missions and the editor
`docs/OPPORTUNITY-SYSTEM.md` §7. These wait:
- **Ground missions on the grammar**: an adapter for squads, beside space's. Relevant now that ground combat is
  expected to follow 3.5.
- **The opportunity editor**: a designer's view of the derived primaries and order menus as a cast is edited.
**Your call:** _open_

### M-38 🟡 Type 3.5 planning windows: art
`docs/ARENA-HC35-WINDOWS-HANDOFF.md` §6. These are placeholders until the art pass:

- **The glyphs** for the seven primaries, the lock, the seven secondaries and the five rules: single-path line
  glyphs (`G35` in `game/js/arena-hc35.js`, 24 × 24, 2 px stroke, `currentColor`), drawn to the handoff's list.
- **The asset thumbnails** (W3): the rams and the pirates use the Brickbat drawings they fly as; the minefield, the
  buoy, the relay, the fire ship, the tug and the two codes have only their glyphs (M-37).

### M-37 🟡 Type 3.5 playtest 1: missing
`docs/ARENA-HC35-FEEDBACK-1.md`; these wait:

- **Turret tracking for High Command's stations and future capital ships.** `pdTrack` in `sim-hc35.js` is one function
  taking a turret, its ship, the step, its reach and its weapon, ready to be lifted; High Command's stations still fire
  as before.
- **Per-turret aim and death art for future capital ships** (the FL-400 has it: `aims`, `pdDead`, `fire` in `sr-art.js`).
- **The activity glyph set** (K4's glyphs are inline SVG placeholders until then).
- **Mission thumbnails for the campaign's missions** (the review's ask): the Missions tab mock draws only the FL-400;
  the dimmed placeholder cards keep the vanilla type icons.
**Your call:** _open_

### M-36 🟡 Type 3.5: what waits for systems that don't exist yet
These wait:

- **Burned Agents**: nothing in a 3.5 mission burns an Agent yet.
- **The other target types** (Person, Place, Ship) and the follow-up opportunities Tag and Track would create (the
  debrief names them only).
- **The later objectives and powers** (shown greyed "Not in this demo").
- **Art** for the Ram, the Tug, the pirates, the Fire Ship, the mines and the buoy: the ram, tug and pirates are
  Brickbats (civilian, civilian, hunter livery; hazard chevrons on the ram's nose), the fire ship an unlit Graf, the
  mines and the buoy drawn marks.
- **Speech for the drones**: the ram, the tug and the pirates bark High Command's pilot lines like your pilots.
**Your call:** when the campaign side is ready

---

## 3. Resolved log

Earlier decisions (Heroes wait for Level 2, Marines data-only, rank decoupled from level, per-rebel morale on top
of base mood, USAF pilot ladder, recruiting through the Command Center) are recorded in `docs/REBELS_PLAN.md` §2.

| ID | Decision | Date | What was built |
|---|---|---|---|
| C-90.4 | **No two systems share a name** (the designer, 27 October 2026: Tips confirmed; "Introduce new names so none are the same, and I can review later"; "Hardpoints are a count… Each kind of attachment consumes a number of hardpoints… a number of weapon placements… let's call these 'mounts'"; mounts are one count, any weapon). **Tips** (C-94.7) stays. **Heat**: the network's meter (`G.risk`, shown as "network exposure") is now network heat, `G.heat` (the Data Tap's rule `datatap_heat`, `BASE_ALERT_HEAT`); only the Bureau's meter is Exposure. **Mounts and hardpoints**: a ship's `weapon_slots` is now `mounts` (any weapon in any mount), its `hard_points` is now `hardpoints`, the count, and S2's typed `hardpoints` (primary, secondary, pylon, internal) is gone; each attachment's `hardpoints` says how many it uses (placeholders: Bombs 1, Cargo pods 1, Boarding party 1 and passenger room, Boarding pod 2, so a Brickbat carries two bomb racks or one boarding pod); a weapon has no slot; a configuration is a plain list (`bls-t-light-repeaters\|bombs\|bombs`). Refit lists her weapon mounts and her hardpoints used | 2026-10-27 | `db.json` and `build.py`, `SRDB` (`hardpointsUsed`), Refit; MIGRATIONS 19 → 20 (a ship's slots become mounts and hardpoints) and 20 → 21 (`G.risk` to `G.heat`); `ships-smoke`, `refit-smoke` |
| C-90.2 | **The standalone prototypes are archived** (the designer, 27 October 2026: "Archive them") | 2026-10-27 | `base.html`, `ground-combat.html`, `space-combat.html` and `space-combat-gdd.html` moved to `archive/prototypes/` (a row in `archive/README.md`); README's four sections are a pointer now |
| C-90.7 | **The build's numbers are right** (the designer, 27 October 2026: "No numbers are fixed, so whatever the latest numbers in the build are, is what's accurate") | 2026-10-27 | README, GDD, ROADMAP and REBELS_PLAN quote the build: sortie fuel 24–42 a ship, the hangar's leak +4 Fuel a day, Steal Fuel 240 Fuel and 300 credits, Auto Factory 450 credits and 160 Materials, three starting pads (a large and two small), the Supply Drop's 160 supplies, the trait counts; the full list is in `docs/CLEANUP-REPORT.md` §3.5. Wording that isn't a number (the old space combat's rules, the leads naming) is left for its own work |
| C-13 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). The four CSS bugs are fixed in the game's own stylesheet. Nothing here needs a decision; the only remaining note is for whoever re-exports the art kit's canvas CSS. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-18 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). The ship attachment list was settled by the switch: hardpoints, bombs, cargo pods, a boarding party and a boarding pod are now in the ships database, and the placeholder plates and tank are gone. The Floatin' Truck isn't in the game; its attachments belong with vehicles in M-15. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-19 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Ships living in the Arsenal is fine for now. The Fleet feature is already logged for later in M-40 (switch decision 8). | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-27 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Spoken idle chatter has been in since 6 October, through the 0.2 and CD playtests, without objection. The guard lines are in the text workbook's Missions tab, to change or add any line there. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-34 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). A record of how the mission report was built that asks nothing specific, in use since early October. Its one space point (a failed space mission shows every objective missed) belongs to the old space combat, and Type 3.5 has its own debrief. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-36 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). A record of how the comm burst was built that asks nothing specific, used since early October without an objection. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-37 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Its only real question is about the decorative targets on space missions' orbit view in the old Missions tab, which S8 replaces with Type 3.5's Missions tab for space. The rest has been in use since early October. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-38 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). The audio pass asked for nothing beyond 'overrule any bucket', and it's been heard through both playtests. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-39 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). The in-combat starfighter window is the old space combat's and goes when it retires at S11. The hangar half (item 1) has since become the ship inspector's Ship tab, which the Refit work built on. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-43 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Weapon sounds asked for nothing beyond 'name any that sound wrong', and they've been heard through both playtests. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-45 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). The two cover decisions are in the Resolved log (C-45.3, C-45.4), and the rest has been fought through both playtests. The enemy cover-scoring numbers to tune live in C-52. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-49 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). The switch logged phone and iPad support for later and said it isn't a priority (decision 6, in M-40). There's nothing to decide on the tablet layout now. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-53 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). A phone-only layout fix that lets taller weapon cards fit. Phone support is logged for later and isn't a priority (decision 6, M-40). | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-67 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). A record of how Type 3 (High Command as a ruleset) was built: its orders, tactics, rules, commands and scenarios, archived on 21 October. Its one open call, a leader's death as a mass panic (item 34), was replaced by the switch decision on leader death (S9: −35 own wing, −8 others, Brave halves it). | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-69 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Built record of the first High Command playtest; none open. The numbers it changed live on in C-68, and the placeholder pilot lines (item 24) are covered by C-90 item 5. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-70 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Built record of the second High Command playtest. Its one open call (item 13: should the stock Cross carry missiles) was answered by switch decision 9: the prologue's Cross comes pre-modified with missiles, a stock Cross has none, and HC_LOADOUT is gone. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-71 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Built record of the third High Command playtest; it asks nothing. Its numbers (the 32 × map, the Cross's turn) were changed again later and live in C-68. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-72 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Built record of the fourth High Command playtest. Its one open call (item 19: is hc2, Last Light, now too easy) is moot: hc2 is a test fixture, not something anyone plays. Its locks, missiles, chaff and Hegemony tactics live on in 3.5 through C-68's numbers. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-73 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). A record of wiring Claude Chat's visual pass into the map; it asks nothing, and its one artist question (item 6, booms that grow with the icons) was agreed in C-74 item 4. The visual pass has been played through every 3.5 playtest since. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-75 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). The founding decisions for how 3.5 is built (on High Command's sim through hooks, the plan compiling to a scenario). It asks nothing; 3.5 became the campaign's space combat on 21 October, and five rounds of playtests and the switch have built on it since. Code comments cite it by ID, which the archive keeps. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-76 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Readings on the first 3.5 demo (Wing 3's four ships, Cass as the Source, 3.5-only stats for the Brickbat and FL-400). The switch made them interim on 21 October, three playtests built on them, the Brickbat and FL-400 are database rows (S2), and the demo board's wings gave way to the player's own wings (S6). Item 17 was already superseded; item 18 (a steady leader's defaults) stands as built. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-79 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Build record of the first 3.5 playtest's fixes (the flight recorder, true scale, boarding, turrets, the HUD's shields and badges, the Missions tab mock). It asks nothing. Its numbers and copy are listed in C-81, the glyph and art gaps in M-37 and M-38, and K7's HUD layout (item 51) moved to M-40. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-84 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). A record of the planning windows as built to mock-ups 2–4; it asks nothing. The readings were C-85 (confirmed), the text C-86 (confirmed), the art M-38. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-87 | **Retired in the blockers sweep: outdated** (the designer agreed, 27 October 2026). Its call was already answered (Patrol Sweep played and liked: decision 13), and the pilots' placeholder traits it mentions were retired for the one trait mapping table (decision 10), listed with the switch's placeholders in C-91. | 2026-10-27 | The full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-85 | **Confirmed as built** (the designer, 27 October 2026): red for a chosen segment and gold for a picked card; green toggles; the second panels (*Your primary*, *The plan so far*); the suggestion chip in the row's right-hand column | 2026-10-27 | Nothing to change; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-86 | **Confirmed as built** (the designer, 27 October 2026): the pitches, the tooltips' footers and the windows' other words stand as built (they're in the Claude-written copy export with the rest of 3.5's text: C-78) | 2026-10-27 | Nothing to change; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-28 (all but item 4) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. You accepted these defaults and they've been live since early October. The Flight Controller and Aerogineer readings in item 9 are replaced by the switch's new support job texts (S10). The one thing never answered is how fast Support rebels should level. | 2026-10-27 | Entry trimmed to item 4; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-31 (all but item 6) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. The downed-VIP, shooter-reveal and transport rules have been in play since 6 October through both playtests. What's left is the designer's own text: Claude reworded their arrival lines and asked them to check them. | 2026-10-27 | Entry trimmed to item 6; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-32 (all but Art) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. The bigger base and the 4 × 4 Hangar have been played through the 0.2 playtest, and its economy tuning (C-52) is built on these costs. One production note is still live: the art kit needs the pad drawing folded back in. | 2026-10-27 | Entry trimmed to Art; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-33 (all but item 2) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. All four screens were built on 7–8 October and have been used through both playtests. Items 1 and 3–6 asked to confirm what was built, and nothing was overruled. The holo callouts are still the designer's text to write. | 2026-10-27 | Entry trimmed to item 2; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-35 (all but items 1, 2) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Most of the personnel file has been in use since early October. Two things are still open: the trait chip wording is Claude's copy, and the pilot skill tiles show the old space combat's numbers, which will need to match Type 3.5 once it takes over all space missions. | 2026-10-27 | Entry trimmed to items 1, 2; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-40 (all but items 1, 3) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Standby and the courier strip have been in use since early October. Two things are still open: whether a contact on standby ever gives up, and taking on a Source still adds to the old network Risk number, though the Network's Exposure now exists. | 2026-10-27 | Entry trimmed to items 1, 3; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-41 (all but items 1, 2) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Space sorties in this planning window are being replaced by Type 3.5's planning windows (Torch the Depots already, the rest at S8). The ground window's two open questions are still open. | 2026-10-27 | Entry trimmed to items 1, 2; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-44 (all but item 8) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Standby, Working and the combat-flow fixes have been in play since 7 October. One question was never answered. | 2026-10-27 | Entry trimmed to item 8; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-47 (all but item 24) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. The prologue readings have been played through the 0.2 and CD playtests, and the 8 October prologue decisions settled the phase questions. Bunks (item 25) were answered by sleeping rough. One timing question is still open. | 2026-10-27 | Entry trimmed to item 24; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-50 (all but item 2) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. The fire support menu and the market's type colours (the designer's approved proposal) have been in use since 8 October. Saturation's new rule text is still Claude's wording. | 2026-10-27 | Entry trimmed to item 2; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-51 (all but item 23) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. The 0.2 fixes were built from the designer's own handoff and have been in the game since. Only the second Hangar section is still a real question. | 2026-10-27 | Entry trimmed to item 23; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-54 (items 9, 10) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Most of the CD's smaller notes are still untouched and still valid for ground missions and the UI. The two bugs (items 9 and 10: the revenge shot after a win, the refused lock-on) are in the old space combat, which now only flies Take Out Instructor and Intercept Transport and retires at S11. | 2026-10-27 | Entry trimmed to items 1, 2, 3, 4, 5, 6, 7, 8, 11; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-74 (all but items 1, 2, 9) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Three small questions are still genuinely open: no weapon in the game fires the laser art yet, the smoke and fire thresholds are numbers the designer named once, and the smoke trail still reads as dots at speed. The rest is a record of what was built. | 2026-10-27 | Entry trimmed to items 1, 2, 9; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-82 (all but item 2) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Build record of the second playtest's fixes, made interim by the switch and played over since; the automatic fallback (items 7 and 8) is replaced by S9's new-objective request. The rewards are still Claude Code's first-pass stand-ins, and the rewards proposal hasn't been approved yet, so that item stays. | 2026-10-27 | Entry trimmed to item 2; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-83 (all but item 9) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. The two flagged items are answered: being spotted ends Hold for My Signal (21 October) and the family fallback is replaced by S9's new-objective request. Plasma ships (item 8) and missile locks (item 14) were taken over by the 22 October freighter notes (C-92 items 4 and 5). Only hangars are still an open question. | 2026-10-27 | Entry trimmed to item 9; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| M-22 (item 4) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Item 4 was only a note that the Missions tab was built, so it goes. Items 1–3 still stand: locked worlds still don't dive in, Akkaro Garrison Raid still has no region, and the phone World view is still provisional. | 2026-10-27 | Entry trimmed to items 1, 2, 3; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| M-4 (parts) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. The rescue window it asked for now exists in Type 3.5: an ejected pilot's pod drifts and can be picked up by a ship or the Rescue Tug, with outcomes set by decision 4 (picked up = injured, lost = dead, captured). What's left is the traits. | 2026-10-27 | Entry rewritten to what's left; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| M-8 (parts) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Part of the question is answered by events: boarding is in Level 1 now, because Type 3.5 boards freighters with a Graf's boarding party or a boarding pod. But that boarding party is a crafted attachment, not people, so Marines are still data-only and there's no boarding scene. | 2026-10-27 | Entry rewritten to what's left; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| M-11 (parts) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Decision 4 settled the coarse outcome: a pilot picked up comes home injured (laid up), and a lost one dies through the Infirmary's Critical Condition rule. Still open: 3.5 gives a pilot no named injury from the critical table, and a pilot's gear still does nothing in space. | 2026-10-27 | Entry rewritten to what's left; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| M-39 (parts) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Its first part, Sources creating opportunities from cast templates, was decided and is built (S7, C-94). Still open: ground missions on the opportunity grammar (relevant since ground combat is expected to follow 3.5), and the opportunity editor. | 2026-10-27 | Entry rewritten to what's left; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| M-36 (parts) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. The campaign wiring is mostly built: Intel, Exposure and Leads came in with S6, the Brickbat and FL-400 rows with S2, and Sources creating opportunities with S7. Still waiting: burned Agents, the other target types, the later objectives and powers, the props' art, and the drones' speech. | 2026-10-27 | Entry rewritten to what's left; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| M-37 (parts) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Two of its five parts are gone: carried containers are now drawn on the Brickbat's cargo pods, and K7 moved to M-40. Still waiting: turret tracking for stations and future capital ships, per-turret art for them, the activity glyphs (still placeholders) and mission thumbnails. | 2026-10-27 | Entry rewritten to what's left; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-68 (Type 3's rows) | **Retired in the blockers sweep, the designer agreed (27 October 2026)**. Most of these numbers are still live: Type 3.5 flies on High Command's sim, so its speeds, turning, ranges, morale, locks, missiles, chaff, collisions, capture and boarding all come from this table. The rows for Type 3's own commands, rules and scenarios (`HC_CP`, `CMD_COST`, Override, Recall, Recon, Decoy, the rules' thresholds, hc1 to hc3, `HC_LOADOUT`) are moot now that 3.5 has its own command points, powers and Preservation Order. | 2026-10-27 | Rows dropped; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-80 (items 2–12) | **Confirmed as built** (the designer, 27 October 2026): turrets alone can't stop the ram; turret arcs from the hull's centre; the hail's default is the persona's; the death spin's `spinK` 4; the quiet arcs; low health in red (High Command and 3.5 only); sentence-case tiles; your pilots use their abilities; the Missions tab mock and the provisional holo look; unresolved pods count as Captured or Lost; the saturated holo planet and the gold Risk tile stay | 2026-10-27 | Nothing to change; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-89 (items 1–11) | **Confirmed as built** (the designer, 27 October 2026): S0's archive and clean-up (the tag, what was archived, the trimmed renderer kept in `arena-hc.js`, v2's `PRESETS` in `sim-hc.js`, the test bench, `?dev`, Back to title, Type 3's scenarios as fixtures, no `SIM_VERSION` bump) and S1's campaign scene (`SR.go('space35',{mission})`; item 11 was already superseded by S7) | 2026-10-27 | Nothing to change; the full entry is in `docs/archive/DESIGN_BLOCKERS-RETIRED.md` |
| C-94.7 | **The intel jobs are Tips** (the designer, 26 October: "Ours become Tips"): on screen and in code (`G.tips`); the Bureau keeps "Current Leads" | 2026-10-26 | S7 (MIGRATIONS 18 → 19) |
| C-94.6 | **Orrin Pell reveals Patrol Sweep** (the designer, 26 October) | 2026-10-26 | S7 (`storySignal`, after his rescue job) |
| C-94.2 | **The Sources' space opportunities fly in 3.5 now** (the designer, 26 October: live now, fuel with S8) | 2026-10-26 | S7 (`M35_LIVE`) |
| C-93.2 | **Sera always flies Torch the Depots** (the designer, 26 October): "Sera is the pilot the player narratively gets for this mission so it should always be her." She flies it alone, in her own ship if it's a starfighter, else the first free one (Dustfall); Joss and the Marta stay home whatever the wings say. If she can't fly, the mission says so | 2026-10-26 | `FLY35_PILOT` and `wings35(only, who)` in `base.js`; `tools/ftue35-smoke.js` 7 |
| C-93.7 | **The FTUE's animations** (the designer, 26 October): page 1's loop "is fine"; real GIF files only "if it is more efficient and doesn't create extra technical overhead". It isn't: a GIF needs an encoder (a new dependency or one written for it), an export step to rerun whenever the art changes, and a few hundred KB of files, and GIF's 256 colours look worse than the live drawing, which is about 60 lines and no assets. They stay live | 2026-10-26 | Nothing to build |
| C-89.33 | **The Comms Relay stays spent** (the designer, 22 October): asked whether a placed relay should come home, "Nope". It's left behind and counted as spent | 2026-10-22 | Already so since S6 (`L35.outcome`); nothing changed |
| C-89.20 | **Bombs and the Brickbat** (the designer, 21 October): "It should be possible to equip the Graf and the Brickbat with bombs." "The Brickbat should not have any default passenger space." So bombs fit only those two (the attachments' new `ships` column), and the Brickbat has no passenger room: it boards with a boarding pod and carries no troops | 2026-10-21 | The S4 commit: `db.json`, `build.py` and `SRDB.configWhy` check who can carry an attachment |
| C-89.16 | **Stealing a Brickbat** (the designer, 21 October): "the opportunity to steal a brickbat comes from sources and there is no specific steal mission for one." A Source's Steal Ship offer names its prize from the ships the player can own (`stealPick`), the Brickbat among them | 2026-10-21 | The S4 commit (`spawnMission`) |
| M-35 | **E1 is closed** (decision 1, 21 October: Type 3.5 graduates instead of v2). Item 3 (the campaign on the v2 sim) is superseded by the switch; items 1 and 2 are moot with v2 archived (the copy-drift concern now lies between `space.js` and High Command's sims: `docs/CLEANUP-REPORT.md` §3.2); item 4's parked items carry over to M-40. The entry is in `docs/archive/DESIGN_BLOCKERS-ARENA.md` | 2026-10-21 | The S0 archive commit |
| C-55, C-56, C-59, C-60, C-62 to C-65 | **Archived with Arena v2 and SB Test** (decision 1). Their open calls are moot; C-56 item 1 (Enter Arena for everyone) is reversed: the test bench is `?dev` only (C-89 item 6). Moved verbatim to `docs/archive/DESIGN_BLOCKERS-ARENA.md` | 2026-10-21 | The S0 archive commit |
| C-87 | **Patrol Sweep: the grammar works** (decision 13, 21 October: the designer played it and liked it; tweaks will come). C-87's choices stand as interim | 2026-10-21 | As built in `72ec941` |
| M-36, M-37, M-39 (parts) | **Covered by the switch** (decisions 5, 8, 11, 14): M-36's campaign wiring (S6, S7) and `db.json` rows (S2); M-39's Sources creating opportunities from casts (S7); M-37's K7 moved to M-40. Marked in each entry; built in those phases | 2026-10-21 | Recorded in the S0 archive commit |
| C-88 | **Type 3.5 playtest 3: the designer's answers** (21 October, `docs/ARENA-HC35-FEEDBACK-3.md` §4): the opportunity system approved, Clear under Deny it; help across wings by NPC requests and decisions weighted by personality and traits; surrenders accepted outside Pirate, paying bonus cargo; must-answer requests slow the game to 0.3 ×; the core mode-agnostic for ground later. The surrender's default now follows the primary's family (Take: take the cargo; Deny and Use: no deal; Bait: take it if a ship can be spared), replacing C-76 item 17 and the Steal default of C-83 item 13. Placeholders: the pilots' traits (Sera Protective; Joss Reckless and Petra's friend; Hale By-the-book; Ollo Green and Proud) and the Duties weights | 2026-10-21 | N1–N5: `ops-core.js`, the cast, orders with objects and points, the clock, help requests, pace, surrender (C-87). `tools/arena-smoke.js` HC35 P3 |
| C-83.12 | **Only the prize crew repairs** (the designer, 20 October: "no, only the prize crew should repair"), answering C-83 item 12: the Hegemony crew never patches her up during the fight, so a Disable stays a Disable | 2026-10-20 | As built in N1 `427f80d` (`repairTick` runs only once she's our prize); no change needed. Recorded with W1 |
| C-69.20 | **The Cross's turn** (the designer, 13 October: "The cross spacecraft turns way too slowly to be useful, it should turn faster but not as fast as the lighter inteceptor craft"), answering C-69 item 20; with it, playtest 3's layout and map notes (`docs/archive/ARENA-HC-FEEDBACK-3.md`) | 2026-10-13 | A High Command turn factor on the Cross (`HC_TURN`, × 1.6: 80% of a Mote's or a Talon's rate), the wing cards in a column in the bottom-left corner, the commands as skill icons, the 32 × map with a tiled starfield, and the avoidance fixes (C-71), `1bfbfe6`. `tools/arena-smoke.js` C-71 |
| C-70.1 | **High Command playtest 2** (the designer's notes, 13 October, in `docs/archive/ARENA-HC-FEEDBACK-2.md`, asked for directly): speed 4; a bigger map; smooth motion when following the action; Convoy Lark must jump; collisions, with pilots wanting to avoid ships and rocks; missiles and the lock on the FT-4 Cross; select the wing first, then the ship; a right-click wheel of orders; box select on the left button and panning on the right; in hc1, engagement lines only for a hovered or selected wing, fainter; Commands a fixed part of the HUD in the centre; a five-entry feed with a scroll; bigger objectives; the time controls top centre under the clock; symbols by a ship using actions and abilities | 2026-10-13 | G1 `3b57c42`: drawing between sim steps, speed 4, the 8 × map round a 4 × play area, arriving at the jump point, holding orbits (C-70 items 1–7). G2 and G3 `40577e2`: collisions and avoidance, the Cross's missiles, the lock and the Missile doctrine (items 8–19). G4 `62c5112`: the clicks, the box, right-drag, the order wheel (items 20–25). G5 `7ac541b`: the commands bar, the time controls, the feed, the objectives, quiet lines, status symbols (items 26–33). `tools/arena-smoke.js` G1–G5. Open in C-70: item 13 (missiles on the database's stock Cross) |
| C-69.1 | **High Command playtest 1** (the designer's notes and answers, 13 October, in `docs/archive/ARENA-HC-FEEDBACK-1.md`): a bigger map with faster ships and wider spacing; fighting at the full gun reach ("I set fighting range (x gun range) to max"); weaker turning at low speed; attack runs (hit and run) as every ship's way of fighting, with the tactics reworked around them and AUTO as the default tactic (option A: "Yes sounds good to me"); Commands and command points bigger, "near the time controls", opening upward; the order panel popping up "above its tile"; Jump Out once the objectives are done, with "a leave now button too"; speech bubbles for 2 s as well as the event log | 2026-10-13 | F1 `fc579e4`: `SPEED_SCALE` 2.5, `ENGAGE_FRAC` 1, `RANGE_MULT`, the 4 × map with scenarios scaled, spacing, the opening view, Copy settings, ALL WINGS: JUMP OUT and Leave now, the tray and pilot panel above their cards, Commands bottom right opening upward (C-69 items 1–8). F2 `e0c69f7`: the corner-speed turn model, bleed, no braking into turns, `SLIP_NOSE`, station keeping along a line (items 9–14). F3 `5b678c4`: attack runs and pursuit, stalemate and six break-offs, the tactics reworked, AUTO (items 15–21). F4 `e9095da`: bubbles from your pilots' lines, one per ship, at most 4, 2 s of real time, `BARK_GAP` (items 22–24). `tools/arena-smoke.js` F1–F4. Open in C-69: item 20 (the Cross against Motes) |
| C-66 | **High Command: decisions** (`docs/archive/ARENA-HC-HANDOFF.md` §9), recorded so later work doesn't reopen them: (1) Type 3 is **a third ruleset, additive behind the picker**; v2 and SB untouched; (2) **real time with free, unlimited pause; no phases**; orders can be issued at any speed; (3) **wings from mission start**, each sharing one order and one tactic; (4) **intent lines are read-only**: the player never draws a path; (5) **the reinforcement clock is always on**: at zero a dangerous Hegemony force arrives and the objective flips to "get out"; (6) **Abort is always free**; (7) **the High Command HUD canvas is the living layout spec** | 2026-10-12 | T4: leaders and promotion, the keys, the §7 metrics, `hc2_lastlight` (waves, raiders) and `hc3_meltdown` (CP variants), the HC panel group with the tactic weights; `tools/arena-smoke.js` HC 9, 10 and T4, every §8 test green (C-67 items 30–37). T3: the pilot panel and doctrine, the commands drawer (Override, Recall, Emergency Support, Recon Sweep, Decoy, Abort; Reinforcement Request behind reserves), CP and rewards, emergencies and their answers (C-67 items 23–29). T2: every order and tactic, the rules engine and its panel, morale, assessments, the feed's VIEW and Tab, live tiles (C-67 items 14–22). T1: `sim-hc.js` (SB's flown body steered by goals, wings with leaders, Attack / Escort / Withdraw autonomy, the Hegemony's patrol / guard / hunt, SB's guns copied, the clock, objectives, the jammed jump point, the fixed-step determinism); `arena-hc.js` (the map with intent lines, the engagement ring and the gold attack designation; the objectives, the clock, CP and COMMANDS; the event feed with VIEW; the wing roster with static tiles; time controls; the wing tray with the order and tactic rows and target chips; hover cards; the picker and the HC panel group); `hc1_nightfall`; `RULESETS.hc` and its dispatch in `arena.js`; `index.html`, `arena.css`; `tools/arena-smoke.js` HC 1, 6, 7 and T1. Readings: C-67; placeholders: C-68 |
| C-65.1 | **SB: more shots for less damage, a bigger map** (the designer, 12 October: "I'd prefer more shots that do less damage, than one shot per 'round' that does more damage… we do need to alter toward 'more going on' visually to the player even if the maths works out the same. We also need to make the map a lot bigger, and I'll be playing with the designer variables to make ships move further over longer rounds, and increase the range of weapons") | 2026-10-12 | `sim-sb.js`: streams (`BURST_N` 8, `BURST_GAP`, `BURST_EVERY` 0.75) with `GUN_DPS` pinning the damage a second, fractional bolt damage, rescaled criticals and nerve, summed damage numbers, `MISSILE_EVERY`, `RANGE_MULT`, `SPEED_SCALE` to 6; `arena-sb.js`: `MAP_SCALE` 2.5 with the scenario centred; `tools/arena-smoke.js` stream, range and map tests. Choices: C-65 |
| C-64.1 | **SB: flown ships, quicker bolts from the guns, status on the ships** (the designer, 12 October, after playing E1: "I don't want there to be such a strict link between what the player tells the ship to do and what the ship actually does… I'd like it if the ships were actually physically simulated… those paths should map to how the ships work"; "Lasers need both a travel time, to move in a fixed direction, to be smaller overall, and to be accurately mapped to the cannons they are emerging from"; "see each ship's health and armour values visually on them, to have thick shield arcs around each ship that deplete… use all of our existing visual assets") | 2026-10-12 | `sim-sb.js`: the flight model (`planState`, `flightCaps`, `flyStep`, `bodyStart`, `predictFlight`), bolts at `PROJ_SPD` 2,000 from the art's gun mounts (`mountsOf`, `muzzleAt`) drawn small in the maker's colours with the main game's muzzle flash, the ship-file shield arcs and the main game's hull / armour pips (`drawShields`, `drawStatus`); `arena-sb.js` kit `toScreen` / `dpr`; `tools/arena-smoke.js` Flight / Guns / Status tests. What I chose and the numbers: C-64 |
| C-61 | **SB planning HUD: decisions** (the designer, 12 October; `docs/archive/SB-HUD-HANDOFF.md` §8), recorded so later work doesn't reopen them: (1) planning is a **per-ship enforced stepper**, SEG 1 → one action → SEG 2, with the controls in a tray anchored to the ship and only the current step's controls rendered; (2) **the action resolves at the segment boundary** (amends `docs/archive/ARENA-SB-HANDOFF.md` §4's unspecified timing); (3) **the bottom bar loses its controls**; one tray at a time; enemy ships never show one; (4) **End here** is a first-class SEG 2 choice (unspent AP still does nothing); (5) **Execute never blocks**: unplanned ships fly their standing order | 2026-10-12 | `sim-sb.js`: the stepper (`nextStep`, `advance`, `arm`, `pickAction`, `endHere`, `keepFacing`, `goPip`, `back`, `clearPlan`), the tray HTML with inline SVG glyphs and live hover cards, actions fired by `fireActions` at SEG 1's end, Fly def's `noFire` flag, the drag readout; `arena-sb.js`: the tray placed every frame (flip, clamp), ship chips with auto-advance, Execute (n/m planned) and pause, the keys; `index.html`, `arena.css`; `tools/arena-smoke.js` HUD 1–10. Readings and choices: C-62; placeholders: C-63 |
| C-59.32 | **SB Test: momentum in the reach** (the designer, 12 October: "yes, add momentum to the reach, for the SB version of the space rules only") | 2026-10-12 | `sim-sb.js`: `s.mom` carried from the distance flown; `dialOf` gives each round a speed window and a speed-widened tightest turn; the reach, the glide top-up and the Hegemony's search all use them; the planner looks a round ahead for rocks; the "slowest this round" arc; `tools/arena-smoke.js` SB momentum (C-59 item 32) |
| C-59.6 | **SB Test: the reach and the round's distance** (the designer, 11 October: "Ships overall can move too far… when I start clicking and dragging a ship, I'd like to see where I can move it mapped out visually… a bit like a spearpoint, with a narrow side that shows I can bank hard, and a long straight corridor for moving very fast"). With acceleration through manoeuvres, a slip in hard turns, and a threatening AI from the same notes | 2026-10-11 | `sim-sb.js`: `dialOf`/`envelope` build the reach from the dial's straight, bank and hard-turn templates; `solveArc` ends outside it at its nearest point; a round is one dial move's distance shared by its segments, topped up only to the slowest straight; `drawReach` draws it while dragging; the speed profile and slip in `paceSchedule`/`poseAt`; the manoeuvre search (`planSearch`) for the Hegemony; `tools/arena-smoke.js` SB 3 and SB AI (C-59 items 6, 7, 9, 11, 26) |
| C-59.9 | **SB Test: the drag is a destination** (the designer, 11 October: "when the player clicks and drags, they are effectively affecting the final destination… if it's too tight of a corner then it won't be able to move further than what it's capable of doing"). Ships fly like planes: dragging from the ship previews the banked flight path to the destination, limited by the dial | 2026-10-11 | `sim-sb.js` `solveArc`/`buildCurve`: one banked arc per segment through the pointer, cut short past the speed range, flown at the minimum radius toward a too-tight corner, with the shortfall drawn; the traced-path steering removed; flair paced across the round (`paceSchedule`); `tools/arena-smoke.js` SB 3 rewritten (C-59 items 9 to 11) |
| C-57 | **Arena: moves and action points** (the designer, 9 October, after playing the first build: "the movement controls are incredibly stiff"). (1) **Moves are dragged and released:** press and hold on the ship to see how it can and can't move, drag a ghost that follows the pointer within the ship's move stats, release to set one move; further drags from its end chain more. (2) **One move is locked to one direction** (straight, bank or turn); variety comes from chaining. (3) **One action point meter per pilot per round** pays for movement, actions, special moves and interrupts alike, replacing one action per round. (4) **Cool adds a bonus to the meter;** spending it is like spending Cool on an ability: it is gone until the pilot earns Cool back. This supersedes C-58 item 2 (paths fitted to the dial from a drawn line) and the handoff's nerve-priced interrupts (§3.4); the dial still sets each ship's limits. | 2026-10-09 | `sim2.js`: moves are arcs inside each ship's envelope (`envOf`, `moveTo`), chained under a round's distance and flown at one speed; the AP meter (`apMax`, `apLeft`, `settleBonus`) with every price a placeholder (C-55); interrupts paid in AP; orders and doctrines plan within the same AP and distance. `arena.js`: the banded envelope, the ghost on the pointer, the gold handle at the chain's end, Undo (Z) and Clear, the AP meter on the ship card, prices on every button. The drag fitter and the drawn line are gone. Readings in C-56 items 7, 12 and 16. `tools/arena-smoke.js` covers moves, chaining, the AP meter and the Cool bonus. The "Arena: drag-and-release moves and one action point meter" commit |
| C-58 | **Arena: decisions** (items 2 and 3's nerve price superseded by C-57) (the designer, *Space Combat Core Redesign v0.1*, 9 October; `docs/archive/ARENA-HANDOFF.md` §9), recorded so later work doesn't reopen them: (1) space combat v2 is **continuous WEGO**: one plan step, then simultaneous continuous execution; no action or attack phases, no initiative. (2) **Drawn paths are fitted to the ship's dial**: the dial is the balance backend; an illegal path cannot be drawn rather than being refused. (3) **Interrupts are player-only**, priced in the existing nerve meter; enemies commit for the whole turn. (4) **Enemy behaviour is doctrine modules** planning through the same path fitter as the player. (5) The Arena is **campaign-free and save-free**: it never writes the campaign key. (6) Today's `space.js` combat maths is **copied, not shared**, and must not drift during the experiment. | 2026-10-09 | `game/js/sim2.js` (the v2 sim: copied maths, the fixed-tick loop, the dial fitter, standing orders, interrupts, four doctrines, metrics) and `game/js/arena.js` (the scene: picker, five experiment scenarios, drawing, input, the designer panel, `DBGarena`), `game/ui/arena.css`; touches outside them are the title button (`intro.js`), `SR.bootArena` (`core.js`) and the scene, styles, scripts and `#arena` route (`game/index.html`). `space.js`, `ground.js` and `base.js` are unchanged. `tools/arena-smoke.js` covers it. The "Arena" commit |
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
