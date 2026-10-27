# Star Rebellion

Prototypes and experiments for Star Rebellion: space combat (inspired by the
rules of the X-Wing miniatures game, adapted for a video game), the Haven Rock
base-management layer, and gridless WeGo ground combat. We'll iterate on
what's fun over time.

## UI kit (`game/ui/`, `tools/ui-kit/`, `docs/ui/`)

All three scenes share one UI kit, "Chunky Ops": `game/ui/sr-theme.css` (tokens and components),
`sr-theme.js` (canvas palette and HUD drawing helpers), `sr-icons.svg` (inline sprite) and `sr-hud.js`
(command bar, VS panel, menus, windows, window chrome, banners, toasts, the comms feed, tooltips). The Base screen,
the ground scene and the space scene all build on it. `sr-theme.css`, `sr-theme.js`, `sr-icons.svg` and the style guide
are generated: edit the sources in `tools/ui-kit/` and run `python3 tools/ui-kit/build.py game/ui docs/ui`.
`sr-hud.js`, `sr-hud.css`, `sr-kit.css` and `scenes.css` are written by hand. `docs/ui/styleguide.html`
is the living style guide and `docs/ui/HANDOFF.md` the migration spec. Scene-specific layout lives
in `game/ui/scenes.css`.

## Game database (`game/data/`, `tools/db/`, `docs/DATABASE.md`)

Ships, ship weapons, personal kit (`items`), the ground enemy roster (`enemies`), pilots and the target-number rules
live in `game/data/db.json`; the game reads them through `game/js/data.js`, `game/js/items.js` and `game/js/enemies.js`. Edit them in Google Sheets with `python3 tools/db/build.py export-xlsx` and `import-xlsx`.
See `docs/DATABASE.md`.

## Game text (`tools/text/`, `docs/TEXT.md`)

Every line of dialog, briefing, tooltip and label is written into the code. `python3 tools/text/text.py export`
puts all of it in a workbook to edit in Google Sheets, and `import` writes the edits back. See `docs/TEXT.md`. Each reusable
mission type's words live once, in `game/js/mission-text.js`, with `{variables}` for the transport, target and place.

## `game/` — the unified game

The three layers now run as **one playable game** (`game/index.html` +
`game/js/`), no longer separate prototypes linking out to each other:

- **Scene kernel** (`js/core.js`) — one render loop, one shared WebAudio
  engine, and a scene manager hosting `base`, `space` and `ground` as
  modules ported from the prototypes (scoped CSS + DOM so nothing collides).
- **Plays on a phone (iPhone 12 Pro).** The layout adapts to 390x844 portrait and 844x390 landscape:
  compact top bars, full-screen windows, and the side panels (crew, objectives, squad, log) become an
  **Info/Crew drawer** you slide in. Everything is touch-driven: tap the ground to move the squad, tap an
  enemy to fire, drag to pan, pinch to zoom, tap a room's popup and press *Step inside*, and tap a crew
  row for their file. An objective strip stays at the top of the map. Open the page in Safari and use
  *Share → Add to Home Screen* for a full-screen, notch-aware app icon.
- **Missions are led in person.** Playable missions offer *"Fly it
  yourself" / "Fight it on the ground"* alongside *"Send a team"* (the old
  abstract dice resolver). Leading one hands the combat scene a mission
  spec built from the real campaign: the soldiers you picked with
  level-derived aim, the armory's weapons (a looted Scattergun rides along
  on the squad lead), your actual pilots, and your actual hangar — hull
  state carried in, and yes, **Joss can fly Marta into the Take Out
  Instructor fight** (new `graf` ship class: slow, tough, door guns), with
  the cadet opposition scaling to your flight size.
- **Results carry back.** The debrief applies everything: XP earned shot by
  shot, injuries (downed-but-won = infirmary days; downed in a defeat risks
  capture; a destroyed fighter forces an eject roll — 15% lost), everything
  physically looted (credits, supplies, weapons into the armory), the stolen
  Cross berthing as *Dustfall*, fighter hull damage, mission days elapsing
  through the full day tick, renown and morale.
- **Durable saves** — the campaign persists in `localStorage` (plus the hot
  snapshot); reload mid-combat and you resume at Haven Rock with the mission
  still on the board.
- The Training Hall's simulator now runs the space scene in-engine with the
  default cast and no consequences.
- **The opening mission** — *Take the Rock* — starts every new campaign:
  three soldiers walk in from the canyon on foot (no ship yet) toward a
  smuggler bolt-hole cut into a mountain. The scenario system generates the
  map's walls at runtime from a solid massif minus carved rooms, so the
  fight moves from a natural exterior (boulders, a worn trail, the squatter
  watch-camp at the blast-door mouth) into **interior corridors**: hangar
  cave, main hall, barracks and command room, connected by held-gun-owns-it
  hallways. An amber step card teaches movement, sneaking and sight cones,
  opening the fight, WeGo orders, the engagement panel, destructible cover
  and overwatch corridors. Boss Craw is holed up in the command room and
  storms out when the squad closes on it; clear all nine squatters — two
  camped outside, the rest holed up room by room (a door guard in the entry
  corridor, scavengers in the hangar cave, a hall guard outside command) —
  and patch the rebel signal through the base antenna at the command console
  to found the base. A new campaign boots **straight into this mission** —
  no base screen first; Haven Rock is seen for the first time only once
  it's won, and the topbar Restart relaunches the campaign from this same
  briefing. Losing costs nothing: the mission resets in place and the
  squad goes again. In the hangar cave sits a **derelict Graf
  Type 1 Hauler** — after founding, restore it from the hangar (240 credits, 160 materials,
  two days) and it becomes the Marta.
- **The reduced day one** the intro establishes: a command centre, a hangar
  holding only the derelict hauler (**two spare berths**; a large pad and two
  small, +4 small pads per Hangar section), and **bunks for six** — four starting crew (Joss and the three
  soldiers) plus two spare bunks the onboarding fills. There is no starting
  starfighter and no storeroom (now buildable). Mira Osk now arrives as the
  first Support recruit instead of starting aboard.
- **The onboarding chain** walks the player through every system in order:
  the game opens in *Take the Rock*, winning it grants the base and the
  derelict dropship, and only then does the base layer begin. Founding the
  base pops an **Incoming Transmission** window and a guided
  tutorial-arrow chain (Galaxy tab → Cass's marker → Contact) that walks
  the player into their first contact: **Cass Wender**, the
  smuggler who flew the squad in. His first Contact reveals *Steal the
  Cross* — but the plan needs two pilots and the base has one, so Cass asks
  around; advance the day and his ✉ signal delivers **Sera Kest**, the
  campaign's second pilot (the recruitment loop, taught by doing). Restore
  the Marta, steal the Cross, and a second source reaches out as thanks:
  **Maro Venn**, cantina keeper of the Dry Comet, whose signal opens *Torch
  the Depots* — the first space combat mission. Winning it raises intel by
  5 and queues **Ferren Halt** and **Senator Vokk** as source candidates
  (the approach flow), opening the mid-game network. Scripted signals
  re-arm if let lie, so the chain can't dead-end.
- **Onboarding UX.** Sources draw as red radio-mast icons on the galaxy
  map (they're voices, not worlds), with emanating waves — echoed by a
  ping on the Galaxy tab — whenever one has a signal waiting, plus an
  on-screen flash ("◉ Cass Wender wants to talk") the player can't miss.
  Signals resolve with a single **Acknowledge**. Recruit signals open a
  **New Recruit!** window with the candidate's dossier and
  Recruit/Dismiss (Sera, the onboarding recruit, is Recruit-only). A
  discovered mission offers **Arrange Mission** (greyed until it can
  actually be attempted) or **Later**, and the mission-planning window
  states **Pre Conditions** as check-boxes (e.g. *3 Rebel Soldiers
  Available · 1 Starfighter Pilot Available · 1 Hauler Available*), lists
  unavailable crew greyed-out with the reason, and a **Go to the Hangar**
  button plus arrow walks the player to the derelict-hauler restoration
  when that's what's missing.
- **The sources field manual.** The first time the Galaxy opens, a
  one-time **Build Your Network** primer lays out the loop in five steps
  (find sources → cultivate them → use their access → take the risk →
  know when to let go) and points at the green **?** button now living in
  the Galaxy header. The ? opens a six-page manual — *Sources · What
  Sources Provide · Cultivation · Risk · Making Contact · When a Source
  Is Burned* — paged with ◀ ▶ arrows at the bottom of each window and
  closing back onto the galaxy map.
- **Ground combat depth pass.** Every weapon hits ~20% harder and the
  laser turret (now the Razorrat LMG) is a genuine threat (42–62 damage, ATK +4); Dustfall's
  deputies drop to 55–60 hp **and aim 1** (the tower sniper to aim 3),
  rank-and-file law damage lands at 85%, and rebel soldiers carry a
  harder base profile (12) — cover is where fights are won, the open is
  where they're lost. Sheriff Reeve keeps his 140. Cover is
  worth more (+6 to +8 TN), with new crates and a boulder flanking the
  clamp and fuel-line objectives — both of which now complete in **one
  combat round** via the explicit **Work** order (hotwire stays two).
  Ground units carry the **Cool/Panic** nerve system: staying Cool earns
  +1 to hit, taking hits and losing allies erodes nerve, and a Panicking
  unit — rebel or lawman — can do nothing but **Lock In** (+35 nerve) until
  they steady. **Take Cover** doubles the cover bonus for the round. And
  the **BLAM Frag Grenade** is thrown from the engagement dock — a weapon
  chip beside the rifle and revolver during a soldier's firing turn; pick
  a landing point within 300px and it replaces that soldier's shot, lands
  primed, and detonates as the *next* round's execution opens (smart
  lawmen scatter); two BLAM crates sit in Dustfall's streets, and spares
  ride home to the armory for future missions. Cover also **soaks 25% of
  damage** on hits that land through it (values up again: +8 to +10), and
  a rebel's **level** now makes them harder to hit (+1 TN per two levels,
  capped +3).
- **No early fail state.** A failed *Steal the Cross* offers **Retry
  Mission** on the endscreen — the run never happened, the town resets —
  alongside Continue; and a lost ground fight now costs injury days, not
  people, so the young campaign can't strand itself. Every soldier and
  the mission pilot also carry one **Stim**: a chip beside their guns in
  the engagement dock that spends the firing turn to recover 30% of max
  hp.
- **Debug menu.** Both combat topbars carry a purple **Debug** button — a
  home for cheats and dev conveniences. For now it holds **Skip Mission**,
  which instantly wins the loaded mission with the full result applied
  (founding, the Cross, rewards, story hooks).
- **Torch the Depots** is a second space scenario (`SCENS` switch in
  `space.js`): one starfighter against **four orbital fuel depots**
  guarded by three **RQ-7 sentry drones**. Depots are structures — they
  don't move, act, or panic, take "tank rupture" instead of subsystem
  criticals, and go up in oversized fireballs; drones fly the standard AI
  but feel no fear. Win by destroying all four depots; the objective line
  tracks the count. The mission **requires a starfighter** — the Marta
  hauler doesn't qualify (the precondition row says so, and both launch
  paths filter her out), which is exactly what the stolen Cross is for.
  The opposition is deliberately soft for a first space fight: depots are
  fragile fuel bladders (24 hull, armor 3), and each drone is
  individually weak — 10 hull, light armor, aim 1, and a popgun plasma
  battery (3–7 damage).
- **Stealth with teeth, and an attack action.** In free move, tapping an
  enemy now opens fire: every rebel with a clear shot joins an **ambush
  volley** (+2 ATK on the surprise shots, concentrated on the mark you
  picked) before time drops into rounds — no shot, no alert. Detection got
  a **point-blank ring** (drawn dashed around each enemy): inside ~120px
  they notice you cone or no cone, and the eye fills quadratically faster
  the closer you are, so you can no longer stroll past a guard's shoulder.
- **Player-facing briefings.** Every mission brief (base prologue, ground,
  space) now reads like a mission screen instead of a design note: short
  in-world flavour, an **Objectives** list, and a roster-style **team view**
  — one card per character with their role and iconed weapon chips (shared
  `SR.ui` helpers in `core.js`, per-scenario `brief` data in `ground.js`).
  The old caps-lock loadout line and the how-to-play text walls are gone;
  what guidance remains is one line of controls, with the prologue's amber
  step card still teaching in play. Buttons are consistent everywhere: the
  green mission-start button always says **Start**, the end-of-mission
  button always says **Continue**.

- **Level 1 location model.** Every world now has **Security** (Hegemony presence),
  **Access** (0–5, bought with Intel), **Support** (0–5, raised by Source conversations)
  and, on three outworlds — **Menk**, **Ballakan** and **Parity IV** — regional
  **Liberation**. A region's liberation can't pass the lower of the Access and Support
  caps. First access plays a location briefing; the galaxy card shows the four stats,
  region bars and the cap. The Revolution lamp is now a progress meter driven by missions
  across many worlds, liberation, Access and Support (no daily trickle); filling it plays
  the **Level 2 escalation** animation. See `docs/GDD.md` §8 and `docs/ROADMAP.md`.

- **Mission planning and flow (Phase 2).** Every mission opens a **briefing board** with
  its story, objectives and reward plus slots for the team, a transport and its pilot, and any
  extra pilots (space sorties use pilot + ship pairs). Click or drag from the roster;
  **Auto-fill** is there if you'd rather not. Sorties burn **Fuel** (◐) and building or
  repairing costs **Materials** (⚙). After a mission: a return-to-base cinematic, a **reward
  screen**, then the source calls back on its own. Your own **intelligence** surfaces
  **Opportunities**, amber diamonds on the galaxy map, once a world reaches Access 2 and the Comms
  Array is staffed. The hangar starts with three landing pads: a large pad and two small.

- **Mission types, not one-offs.** Steal Fuel, Steal Intelligence, Blow Up Auto Factory and Rescue Dissident are
  reusable *mission types*. Each Source's first job uses its story setting; afterwards any Source with a matching
  specialty, or our own Intelligence leads, deploy the same type in a new context (another world, region and target
  name). Rewards scale with Security, and Security 3+ worlds add extra guards. Steal the Cross, the Depot Run and the
  Strider stay unique story missions. A Steal [Vehicle] type is planned.
- **Playtest bot.** `tools/autoplay.js` plays Level 1 through the real game code (see `docs/GDD.md` §8,
  *Phase 7*), `tools/sweep.sh` runs it over several seeds and `REVW='{...}'` overrides the progress weights.
  It is how the meter weights were tuned: escalation now lands around day 70-110 for an efficient bot.
- **Source quest chains.** A unique, location-tied source can run an authored chain. The first, *The Listening
  Towers* on Parity IV, goes alert, contact, a three-day decode, a blow-or-tap choice, three Disrupt Comm Towers
  jobs (one per region) and a check-in whose ending depends on how you played. Engineer, CEO, Professor and Double
  Agent sources now exist too.
- **Steal Fuel (first Tier 1 mission).** Cass sends you to the Redrock tithe depot on
  Akkaro: reach the depot, call the Marta down onto the apron, hold the pumps for five rounds
  while reinforcements arrive, then board. It pays 240 Fuel and 300 credits. Regions are land only; space
  missions never belong to a region.

- **Blow Up Auto Factory (Tier 1).** Tessaly Brandt points you at the Kiln Ridge AutoCom Plant on Menk.
  Carry an Explosive Charge to the Power Plant, plant it, clear the blast zone and detonate,
  ideally without the plant ever raising the alarm (stealth bonus). Introduces Policebots and
  riot shields. Charges come from looting the Redrock depot and the AutoCom Plant's blasting shed.

- **Rescue Dissident (Tier 1).** Orrin Pell sends you into the Tollgate security outpost on
  Ballakan to free a prisoner from the detention cage and bring them out alive, ideally unseen.
  The prisoner comes from the same pool as your recruits and is offered a place in the
  movement afterwards. Pays 500 credits.

- **Specialty training and Steal Intelligence.** At level 3 a soldier or pilot can train into a
  specialty at the Training Hall (Field Technician, Vanguard and Dogfighter have effects so far).
  Ione Cask's **Steal Intelligence** job on Parity IV needs a Field Technician on the team to crack
  the databank; without one it explains what you are missing. **Economy rebalanced ×4** around the
  500-credit Rescue reward: start with 1000 credits and scale costs and rewards to match.

- **Steal the Strider (Tier 1).** Tessaly Brandt points you at a Strider Mk I parked at Menk Crossing.
  Override its leash panel, then guide the walker and the squad back to the Marta; if it dies the
  mission fails. It then **joins your roster as an Auto** (no bunk needed) and can fight in later
  squads. All five Tier 1 missions are now in.

- **Phase 4 combat depth.** New Level 1 enemies (Riot Bruiser, Strider Mk I, Police, Dispersal and
  Transport cruisers), **hacking Autos** with a Field Technician (hacked Autos fight for you and join
  the roster), a **fire support menu** (Supply Drop, Strafing Run, Door Gunner, Reinforcements) set up on
  the planning board, and space **Drone Monitors, Pursuers, Mag-Clampers and VC Motes** in Torch the Depots.

- **Rebels, in depth.** Every rebel is a person: a generated name, a level (1–20), one Character Trait from a list of 45 and up to three earned Rebel Traits (friendships, rivalries, mentors, scars, grief…), a **morale** that moves with wins, losses and rest and nudges their aim and nerve, skills that grow with experience, a **rank** with its own insignia that the player hands out (Army, Marine or Air Force ladders, and an officer commission), and gear carried in slots from the shared armory. Recruits arrive through the Command Center's *Recruit new Revolutionaries* task (and Sources and rescues) on a multi-card **New Recruit** screen. A critical hit can leave a **critical injury** that a **Treat Wound** order patches in the field and the Infirmary heals over days; treating a wound uses a **Med Pack** (the Infirmary makes more), and a rebel who stands out can become a **Hero** with a once-per-mission action (one in Revolution Level 1, more from Level 2). **Armour** in the Head and Body slots adds an armour bar over health in ground combat (hats are cosmetic), and a raised **shield** sits over both; Sundering weapons tear armour faster and Piercing ones go partly through it. Rebels need **rest**: two missions without a break make them Weary (a morale hit and worse in a fight if sent out anyway), four leave them Conked in their bunk. A **Back** slot carries Heavy kit and deployables: a Razorrat LMG or a Riot Shield is set up with **Deploy**. Weapons have the Gear doc's **fire modes** (automatic, semi-auto, single shot, fan hammer; F toggles them in the attack window) and traits (Steady, Knockback, Sundering, Piercing), shown as icons on the Arsenal and Black Market cards with each maker's badge. The record is in [`docs/REBELS_PLAN.md`](docs/REBELS_PLAN.md); what is stuck on a design decision is in [`docs/DESIGN_BLOCKERS.md`](docs/DESIGN_BLOCKERS.md); the smoke tests are `tools/*-smoke.js` (run each with `NODE_PATH=$(npm root -g) node tools/<name>-smoke.js`).
- **Type 3.5: High Command Hands Off** (becoming the game's space combat: [`docs/MAIN-SWITCH-HANDOFF.md`](docs/MAIN-SWITCH-HANDOFF.md)). Real time with free pause: you plan a space opportunity in four windows (the primary, the rules of engagement, the wings, the executive orders), launch, and the wing leaders fly it themselves; you answer their requests and spend a few commander powers through a comms delay. It is the campaign scene `space35` (`game/js/space35.js`), for developers until its results reach the campaign (phase S6): add `?dev` to the URL and Intercept Transport's briefing offers *Fly it in Type 3.5 (dev)*: your own wings fly it, and its injuries, losses, hull damage, XP, pay and Exposure land in the campaign (phase S6), while the Missions tab and the title screen's *Test bench* (`game/index.html?dev#arena`) open the demo's test opportunity. `?dev` also brings the designer panel and the flight recorder's download (`tools/run-report.js` reads its files). Players never see it, and it never touches the campaign save. The sim is `game/js/sim-hc.js` with the 3.5 layer `game/js/sim-hc35.js`, the screens `game/js/arena-hc35.js` on High Command's renderer `game/js/arena-hc.js`. The earlier experiments (Arena v2, SB Test, Type 3 as a playable ruleset) are archived: [`archive/README.md`](archive/README.md).
- **Crafting** (phase S5, a placeholder). The Arsenal's *Crafting* tab makes Type 3.5's assets (rams, a fire ship, mines, an interdictor buoy, a comms relay, a rescue tug) and ship attachments (bombs, cargo pods, a boarding party, a boarding pod) from credits, supplies, materials and intel. Assets fill a space mission's asset slots and are used up when spent; attachments go on the hangar racks for Refit, the ship inspector's tab.
- **Wings** (phase S3). Pilots fly in wings of one to four ships, each with its pilot; only wings fly space missions, and a ship outside a wing can still be an asset. The Hangar's *Wings* window moves pilots between wings, takes them off, seats them in a free ship, names a leader and renames a wing. A pilot who gets a ship is asked to join a wing or start one.
- **Juice.** An attack is one roll shown as a **volley**: a burst of rounds, re-rolled every time, whose landing rounds split the damage (the numbers always add up to the roll) and strike flesh, armour, a shield or the wall behind. Hits flash and squash the target; the downed topple; a short **hitstop** freezes the game clock on big moments; one trauma **screen shake** per scene moves the world, never the HUD; blood stays on the ground for the mission. Grenades and rockets play in stages with debris, embers, smoke and a scorch; space hits flare the shield bubble or breach the hull, and kills break the ship in three. Scene changes use the kit's **transitions** (an iris into a ground mission, hyperspace to and from a space fight, stripes between the base and the galaxy, a flag for mission start and liberation). **Screen shake** and **Blood** are settings in every scene's menu; reduced motion turns off the shake, the hitstop and the transitions. Parked ships in the hangar are small 3D models.

The early standalone prototypes (`base.html`, `ground-combat.html`, `space-combat.html` and
`space-combat-gdd.html`) are archived in [`archive/prototypes/`](archive/prototypes/). They are kept as
iteration history only: the game does not load them, and they are not kept working.

The working game design document is reassembled in [`docs/GDD.md`](docs/GDD.md)
(canonical source lives in the designer's Notion).
