# Star Rebellion

Prototypes and experiments for Star Rebellion: space combat (inspired by the
rules of the X-Wing miniatures game, adapted for a video game), the Haven Rock
base-management layer, and gridless WeGo ground combat. We'll iterate on
what's fun over time.

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
  excavated and open floors built out (Comms Array, Workshop, Infirmary,
  Training Hall, Hangar Bay), with costs in credits/supplies and multi-day
  construction. Controls stay contextual: clicking a tile opens its popup.
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
