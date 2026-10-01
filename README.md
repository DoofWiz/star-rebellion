# Star Rebellion

Prototypes and experiments for Star Rebellion: space combat (inspired by the
rules of the X-Wing miniatures game, adapted for a video game), the Haven Rock
base-management layer, and gridless WeGo ground combat. We'll iterate on
what's fun over time.

## UI kit (`game/ui/`, `tools/ui-kit/`, `docs/ui/`)

All three scenes share one UI kit, "Chunky Ops": `game/ui/sr-theme.css` (tokens and components),
`sr-theme.js` (canvas palette and HUD drawing helpers), `sr-icons.svg` (inline sprite) and `sr-hud.js`
(command bar, VS panel, menus, windows). The kit files are generated: edit the sources in
`tools/ui-kit/` and run `python3 tools/ui-kit/build.py game/ui docs/ui`. `docs/ui/styleguide.html`
is the living style guide and `docs/ui/HANDOFF.md` the migration spec. Scene-specific layout lives
in `game/ui/scenes.css`.

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
  Type 1 Hauler** — after founding, restore it from the hangar (60⬡ 40▤,
  two days) and it becomes the Marta.
- **The reduced day one** the intro establishes: a command centre, a hangar
  holding only the derelict hauler (**one spare berth**; capacity 2, +1 per
  bay), and **bunks for five** — four starting crew (Joss and the three
  soldiers) plus one spare bunk the onboarding fills. There is no starting
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
  **Maro Venn**, cantina keeper of the Dry Comet, whose signal opens *Cook
  the Depots* — the first space combat mission. Winning it raises intel by
  5 and queues **Ferren Halt** and **Senator Vokk** as source candidates
  (the approach flow), opening the mid-game network. Scripted signals
  re-arm if let lie, so the chain can't dead-end.
- **Onboarding UX.** Sources draw as green radio-mast icons on the galaxy
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
  laser turret is a genuine threat (42–62 damage, ATK +4); Dustfall's
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
- **Cook the Depots** is a second space scenario (`SCENS` switch in
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
  Array is staffed. The hangar starts with four landing pads.

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
  Brakka: reach the depot, call the Marta down onto the apron, hold the pumps for five rounds
  while reinforcements arrive, then board. It pays 60 Fuel. Regions are land only; space
  missions never belong to a region.

- **Blow Up Auto Factory (Tier 1).** Tessaly Brandt points you at the Kiln Ridge Autoworks on Menk.
  Carry an Explosive Charge to the Power Plant, plant it, clear the blast zone and detonate,
  ideally without the plant ever raising the alarm (stealth bonus). Introduces Policebots and
  riot shields. Charges come from looting the Redrock depot and the Autoworks' blasting shed.

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
  the planning board, and space **Drone Monitors, Pursuers, Mag-Clampers and VC Motes** in Cook the Depots.

The three standalone prototypes below remain in the repo untouched as
references and iteration history.

The working game design document is reassembled in [`docs/GDD.md`](docs/GDD.md)
(canonical source lives in the designer's Notion).

**Branch layout**: `claude/star-rebellion-combat-rexyta` carries the traditional
X-Wing-style prototype (`space-combat.html`); this branch
(`claude/star-rebellion-combat-gdd`) additionally carries the GDD-faithful
variant (`space-combat-gdd.html`) so the two rulesets can be compared and
evolved side by side.

### `space-combat-gdd.html` — Mission: Take Out Instructor (GDD-faithful variant)

The "Take Out Instructor" mission from the GDD's space combat mission list:
Commandant Dral Vex, a veteran Hegemony flight instructor, is running a live
exercise with four green cadets. Eliminate the instructor to win; his cadets are
likely to panic and flee once he falls.

GDD systems implemented in this variant:

- **d100 resolution** — every shot builds a target number from the defender's
  evasion profile, evasive actions, range band, deflection angle (tail shots are
  easier, beam shots harder), asteroid cover and pilot nerve; the attacker's
  modifiers (aim, weapon accuracy, stacked locks, bullseye, cool/panic, close
  range) are subtracted, and the full math is printed in the combat log.
- **Shield / Armor / Hull** durability layers.
- **Weapon types** — plasma (unlimited, soaked by shields), ballistic (limited
  bursts, bypasses shields, 25% crit chance with a small crit table: engines,
  targeting, pilot rattled), missiles (very limited, require a lock).
- **Stacking locks** — the Lock action repeats to +8 to-hit per level (max 3);
  missiles consume a lock level. Rocks block sensor locks and foul firing lines.
- **Sequential initiative** — ships move one at a time in ascending initiative
  and each pilot chooses an action at their activation (Lock / Evade / Steady /
  Barrel Roll for pilots who know it); attacks then resolve in descending
  initiative. Cool pilots gain initiative, panicking pilots lose it.
- **Pilots** — aim stat, a Cool↔Panicking spectrum moved by taking fire, kills,
  lost wingmen and steadying; traits (Lucky, Veteran, Green cadets who cap low
  and break when the instructor dies, and a "Friends with…" pair that never
  recovers if the friend is lost); pilot-experience maneuvers (loop, barrel
  roll) per the GDD, so K-turns belong to pilots rather than dials here.
- **Large battlespace** — ~3.3× the original map with camera pan (drag/WASD),
  zoom (wheel/pinch/buttons), an execution follow-cam, a minimap, and asteroid
  clusters; movement distances roughly doubled.

**HUD & interaction model** (overhauled after first playtest): the right sidebar
is information only — a pilot dossier for the selected ship (profile, service
record, traits, nerve state, loadout, treated as a vertical slice of the full
game's pilot system) plus compact rosters with layered shield/armor/hull bars
and color-coded nerve text. All controls appear contextually on the
battlefield: the maneuver dial opens beside the selected ship during planning,
a radial action ring opens around each of your ships at its activation, and
attacks pause on a bottom dock where the defense difficulty stacks up modifier
by modifier over the target, you pick a weapon (or tap another contact to
retarget) and press ATTACK, and your own modifiers then stack up before the
visible d100 roll. Locks are signposted with dashed traces, a diamond on the
locked ship and a numbered badge for lock level. The bullseye is a visible
centerline down the firing arc: the closer a target flies to it, the bigger
the scaling aim bonus and crit chance. The mission opens with a short fly-in
cutscene (skippable) and pilots exchange comm chatter on kills, hits, panic
and the instructor's death.

**Iteration 3** (second playtest round): resolution moved from d100 to **d20**
with a visible hit % once modifiers are summed; attacker and defender now share
one **VS panel** (sword = attacker, shield = defender, blue = player / red =
enemy, matching icons hover over the ships). Shields split into **front/rear
zones** shown as arcs around the hull (no shield bar) — attacks deplete only
the zone they strike, and ballistic still bypasses both. **Locks break** the
moment the target slips behind the locker's front hemisphere. Hull damage now
inflicts **named criticals** (Secondary Engine Failure locks out top-speed
maneuvers, Control Surfaces Shredded kills hard turns, Ammo Feed Jam,
Shield Emitter Fried, Targeting Array Damage, Cockpit Breach), cleared only by
the new **Repair** action's Field Repair; Repair also boosts a shield zone by
15% of total, and **Evade** expanded into Fly Defensive or **Angle Shields**
(stack one zone onto the other). *Steady* is now **Lock In** (+35 nerve).
Maneuver distances grew 25%, weapon and explosion effects got heavier
(flashes, shockwave rings, tracer streams, screen flash on kills), ships bank
into turns with stretched engine flares, and planning/decision moments play in
subtle slow time (dimmed drift, slowed ambient motion, cool-blue tint).

**Iteration 4** (third playtest round): shields are now two independent
**segments** (fore/aft) — Angle Shield re-points a segment at the other zone
(max two segments per zone, purple second ring when stacked), Boost Shield
always feeds the segment wherever it is angled, and damage strips the visiting
segment before the zone's own. Exactly **one critical per attack** (hull
damage grants it, or a through-armor crit proc — never both). **Locks**
acquire against any target in the front hemisphere within weapons range and
still break when the target slips behind. The firing arc narrowed ~20%.
**Missiles** gain a guidance bonus (+1 to hit per lock level on top of the
lock bonus). The sidebar is info-glance only: color-coded section bars and
numberless segmented cells (5 HP per cell); **double-clicking any fighter**
opens a two-window readout — a pilot dossier (big level numeral with an XP
ring, US-style rank, traits, nerve) and a ship systems panel (rendered
silhouette, exact durability numbers, visual weapon cards with per-weapon
to-hit modifiers and ammo cells, criticals, sensors). Audio rebuilt on a
compressed master bus with layered synthesis: dual-osc plasma, thumping
tracer bursts, sub-drop explosions with crackle tails, FM shield pings,
two-tone lock beeps and a dice rattle on the d20.

The pre-overhaul flow (auto-resolved attacks, sidebar controls, d100) is
preserved at commit `09dff6e` (tag `combat-gdd-autoresolve`), the first
interactive-HUD version at `1be59fd`, and the d100→d20 shield-zone iteration
at `b78577f`, if we want to revert or compare.

### `base.html` — Haven Rock (base management layer)

The hub the player returns to between missions, per the GDD's Base Management
spec, framed as the day after Operation Take Out Instructor. Vertical slice of:

- **The base** — a fixed, expandable isometric map of a hidden rock hideout.
  Starting rooms (Command, Hangar, Barracks, Storeroom); rubble chambers can be
  excavated and open floors built out (Intelligence Center, Workshop, Infirmary,
  Training Hall, Diplomatic Quarter, Storeroom), with costs in credits/supplies and multi-day
  construction. Same-type rooms that touch merge into one bigger room (more landing pads,
  beds and source slots) and take upgrades such as Bunks or the Refuelling Station.
  The Diplomatic Quarter's Chief Diplomat sends teams to raise local Support. Hangars can
  patrol local space for Intel and salvage, rooms can convert tiles into a Ready Lounge,
  Maintenance Bay or Rec Room, an Infirmary Surgery Room can save the fallen, and the
  Storeroom's Gear Grid shows all kit by category and size. Controls stay contextual: clicking a tile opens its popup.
- **Sources** — the GDD's spy-network loop: Ferren Halt (the depot manager who
  sold out Vex — jumpy, high risk) and Sen. Vokk, plus a recruitable Scientist
  approach. Each has level, cultivation and risk meters, daily income
  (money/supplies/intel), Visit vs. Contact, cultivation dialogue events with
  contextually strong/neutral/weak answers, burn checks when risk runs hot,
  and the Silence (assassin confirmation) and Cut Loose options with their
  network-wide costs.
- **Missions** — source-generated board: the completed Instructor op, the
  GDD's Intercept Transport (assign pilots + flight-ready fighters, multi-day
  auto-resolution with injuries and fighter damage on failure), the locked
  Steal the Strider foot mission, and a Sim Deck entry that links to the space
  combat prototype.
- **Roster & fleet** — rebels with roles, levels/ranks/XP, Rest/Train
  assignments, injuries; fighters repair daily (faster with a Workshop) at a
  supplies cost.
- **Time** — an Advance Day tick drives construction, excavation, repairs,
  training, source income/risk/events/burns, mission resolution, candidate
  approaches, renown toward Revolution Level 2, and a news feed.

**Galaxy & Intel** (design addition, not yet in the GDD): the Galaxy screen is
a large starmap — core worlds are always known but expensive, frontier worlds
are cheap or entirely uncharted, and the player starts with access to only
Veray Yards and Relay Kess near the base. **Intel is spent to scout** a world,
which grants access (missions, sources, signals there) and a pathfinder report
with whatever the scouts found: new missions (Brakka's Steal the Cross ground
op, Dreymar's ore barge, Volund's manifests), source candidates (Marr on
Callis, Customs Chief Renn on Meridian), caches, or honest duds. Scout costs scale with the world:
a wild rock runs 3 intel, the Capital 14. *GDD note*: the GDD defines Intel as
a passive early-warning meter for Hegemony action; this makes it a spendable
currency. Reconciliation candidate: the unspent reserve doubles as the warning
buffer, so aggressive scouting trades away early warning.

Open questions: economy tuning (incomes vs. build costs), whether missions
should consume supplies to launch, base Alerts (the GDD's Hegemony raids) as
the pressure valve for high player risk — now naturally tied to the intel
reserve — and wiring real state hand-off between base and combat scenes
instead of the simulator link.

Still simplified: the GDD's Activation phase is folded into Execution (no ship
abilities yet), bombs and torpedoes are out (no large targets in this
mission), and there are no gunships, jamming or shield-sharing yet.

The sidebar roster is split by role — **Pilots**, **Soldiers**, a **Marines**
section that only appears once a marine is recruited, and **Support** — plus
the Flight list. Pilots carry officer ranks; soldiers and marines use US Army
enlisted ranks (Recruit → Sergeant Major) via `rankFor()`.

### `ground-combat.html` — Mission: Steal the Cross (first ground scenario)

First pass at ground combat, playable from Brakka's scout report in the base
layer ("Fight it on the ground") or standalone. Rev Level 1 framing: the squad
are civilians with stolen Aklis and no armor; the opposition is basically
police with civilian-grade gear.

**The ruleset** is a hybrid RTT — Desperados/Shadow Tactics real-time staging
out of combat, Door Kickers / Frozen Synapse WeGo rounds in it — kept
deliberately familiar to the space game. **Out of combat time runs free**:
right-click (or tap the ground) and the squad follows in loose formation,
auto-looting anything they pass; deputies drift their beats and sweep their
eyes in real time; Sera's hotwire and the pad work tick on timers. The moment
the law is alerted, time drops into the round skeleton the space game uses:
plan orders → simultaneous execution → engagement resolved unit-by-unit on
the shared d20 VS panel, radial order ring, camera/minimap and synth audio.
Clear the street and time runs free again for the mop-up.

- **Stealth & detection** — while the town is calm every lawman projects a
  drawn sight cone (amber = full range, inner red band = the reduced range at
  which they spot a sneaking rebel). Standing in a cone with line of sight
  fills a detection gauge above the rebel — faster up close, slower in cover
  — which decays out of sight; a full gauge raises the town. A **Sneak**
  toggle (button or `C`) halves speed and profile. The player can also open
  the fight deliberately by clicking a lawman.
- **Turn & target telegraphy** — in the engagement phase the acting unit gets
  a pulsing ring in its side's color, a marching-ants targeting line runs to
  its target, the target wears a rotating reticle, and the VS panel counts
  "ACTION k OF n".
- **No grid.** Movement is free-aim inside a ring: **Move** (~150u, gun stays
  up), **Sprint** (~300u, can't shoot, +2 TN harder to hit), **Hold** (braced
  +2 ATK and an overwatch snap-shot at anyone crossing the lane, −2 ATK).
  Planning auto-advances the selection to the next rebel without orders,
  space-combat style. Routing runs on a coarse nav-grid BFS with string-pull
  smoothing, so squad clicks, AI falls-backs and the extraction run all path
  cleanly around buildings from anywhere in town.
- **Cover: high value, destructible** — fuel drums, cargo crates and charge
  stations give +4 TN, trucks +6; buildings block sight, movement and bullets
  outright (tracers clip at walls). Missed shots chew into the cover that
  soaked them: every prop has hit points, and when it shreds ("COVER
  DESTROYED") it becomes rubble worth nothing. Cover is signposted with green
  shield pips, ringed cover pockets while plotting, and a COVER tag on
  qualifying destinations.
- **The laser turret** — one fixed emplacement covering the pad approach.
  Either side can man it (radial "Man Gun" in combat, click it in free move;
  the law sends a guard sprinting for it when the alarm goes). It fires a
  brutal beam, and a frontal energy shield blocks all shots from its facing
  arc — which tracks where it shoots — so it has to be flanked, blasted with
  a canister, or starved of gunners.
- **Fuel canisters** — red environmental explosives clustered near the pad
  (and one by the motor pool). Shoot one deliberately (tap it to retarget
  during engagement) or let a stray round find it: a big blast that wounds
  everyone nearby, wrecks cover, and chain-detonates its neighbours.
- **Akli jams** — a natural 1 jams the rifle for a round (Un-jam action or
  fall back to the Cowboy). **Morale** — dropping Sheriff Reeve breaks
  deputies' nerve into surrenders.
- **Loot lives on the map** — cantina till, assay strongbox, outfitter
  crates, the HQ gun locker, a motor-pool cache, plus whatever downed lawmen
  drop. In combat a Loot order sweeps a ~95u AOE; in free move the squad
  hoovers up whatever they walk past.
- **Neutral civilians** — pale, unarmed townsfolk wander the streets; when
  the shooting starts they flee town or hit the dirt ("CIVILIAN — DOWN
  FLAT"). They can't be targeted and blasts spare them.
- **Fog of war** — three states across both ground scenarios: unseen is
  near-black, explored terrain stays as dimmed memory, and current
  visibility is real line-of-sight vision polygons cast from each standing
  rebel (~560u, throttled raycasts into a half-res fog canvas). Buildings
  and canyon walls cast vision shadows; corridor doorways spill sight into
  the rooms beyond. Moving enemies, their sight cones, speech bubbles,
  minimap dots and click-targeting all respect visibility — unseen
  hostiles list as "Contact — NO VISUAL" — while static loot is revealed
  once spotted and remembered after. Cutscenes bypass the fog; engagement
  targets are always rendered.

**The map** is a sci-fi frontier outpost with western bones: corrugated-metal
and solar-panel roofs, a flickering holo-sign on the Dry Comet cantina, an
assay office, an outfitter, a motor pool of utility trucks and charge
stations, street lamps, a comms mast on the sheriff's HQ, a condenser tower
with a marksman on it — and still a tumbleweed. The Cross sits on a floodlit
pad in the **far north-east corner, diagonal from the LZ**, so the whole town
is between the squad and the prize.

**The scenario**: Joss lands the Graf in an intro cutscene, then Dax, Runa
and Kel escort Sera Kest (sidearm only, frail, must survive) across Dustfall.
At the pad three jobs run in parallel: Sera hotwires (two rounds or a quiet
stretch of real time) while a soldier **releases the docking clamps** and
**pulls the fuel line** — the Cross flies only when all three are done. The
law contests it: once alerted, guard deputies fall back on the pad, one mans
the turret, and Wren's Long Iron covers the approach from the condenser
tower. Sheriff Reeve starts **holed up in his office** — untargetable,
uninvolved, keeping deputy morale intact — and kicks the door open with his
scattergun only when a rebel closes on the pad (or he's the last lawman
standing), so the boss fight happens at the objective instead of on the
street. Under fire the squad extracts by standing in the LZ ring while no
lawman is near; once no hostiles remain a pulsing **Extract** button plays
the boarding cinematic at double speed. Defeat if Sera goes down or the whole
squad does.

Base ↔ ground wiring is still one-way (the mission link opens the artifact;
results don't carry back), same as the space sim link. The base's abstract
resolver can also run the op off-screen: it needs 3 soldiers plus the Graf
flight-ready, and success berths the stolen Cross ("Dustfall") in the hangar.

## Prototypes

### `space-combat.html` — Skirmish: Operation Picket Break

First playable combat encounter, self-contained HTML (open directly in a browser).
No persistent meta data (pilots, stats) in this build — everything is defined inline.

**Scenario**: 1× GR-4 Viper multi-role fighter, 2× SF-11 Talon interceptors and
1× HK-7 Anvil bomber (player-commanded) vs. 3× Hegemony VK-3 Scimitar multi-roles
and 1× SC-9 Wraith interceptor. Destroy all enemy ships to win.

**Round structure** (X-Wing-derived):

1. **Planning** — assign each of your ships a maneuver from its class dial
   (speed × turn; interceptors get a K-turn) plus one action:
   *Focus* (+hit and +evade chance), *Evade* (+1 guaranteed dodge, spent on first
   attack against you), *Target Lock* (re-roll missed attack dice; arms the
   bomber's missiles). The enemy AI plans secretly at the same time.
2. **Maneuvers** — all ships move simultaneously along their plotted arcs.
3. **Engagement** — ships fire in initiative order (interceptors 4 > multi-roles 3 >
   bomber 2, player wins ties). Front arc only (~80°), three range bands
   (Range 1 adds an attack die, Range 3 adds a defense die). Damage strips
   shields, then hull. Missiles need a lock and Range 2–3 (per the GDD, missiles
   are the anti-starfighter ordnance; torpedoes are reserved for large ships and
   fixed positions, which this scenario has none of).
4. **End** — Focus/Evade clear; unused locks persist.

**Deltas vs. the GDD's space combat spec** (deliberate prototype simplifications,
candidates for iteration — see `docs/GDD.md` §7):

- **Resolution**: the GDD specifies a d100 target-number system built from
  situational modifiers; this build simulates X-Wing-style dice pools as per-die
  hit/evade probabilities. No critical hits yet.
- **Durability**: shields + hull only; the GDD's armor layer (and shield-bypass /
  crit-before-armor-lost ballistic behavior) is not in yet. All primary guns here
  behave like GDD plasma weapons (unlimited ammo, absorbed by shields).
- **Turn structure**: the GDD moves ships sequentially in ascending initiative
  with actions chosen during execution; this build moves everyone simultaneously
  and actions are chosen at planning.
- **Locks** are binary here; the GDD stacks lock rating over repeated actions.
- **Pilots** (traits, Cool/Panicking, unique maneuvers) are out of scope for this
  no-meta build, as are gunships, jamming/support mechanics, and weapon loadouts.
- Focus applies for the whole round instead of being a spent token.
- Ships auto-target (lock target first, else nearest in arc) rather than the
  player picking a fire target each attack.
- The map edge is a soft boundary (ships clamp and turn inward); no
  collisions/bumping, no obstacles.

**Open playtest questions**: missile economy (3 shots, lock-gated) — too strong or
too fiddly? Does round-long Focus make the game too forgiving? Is 4v4 the right
density for readability? Should the player pick fire targets manually? Is
simultaneous movement more fun than the GDD's sequential initiative movement?
