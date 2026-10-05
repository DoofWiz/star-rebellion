# Star Rebellion — Game Design Document

> Working draft, reassembled from the Notion WIP GDD. Content is preserved from the
> source; editorial markers like *[unfinished in source]* flag gaps to fill rather
> than decisions that have been made. The canonical doc lives in the designer's
> Notion under Game Concepts; this copy exists so the repo and its prototypes can
> reference it.
>
> **Current scope: Revolution Level 1 only.** Decisions made for it are recorded in
> [§8](#8-revolution-level-1--design-decisions). The designer's Google Docs (linked from
> `docs/GDriveMasterSheet`) hold the newer per-system detail; the plan is in
> [`ROADMAP.md`](ROADMAP.md).

**A game about building a revolution and taking down a fascist regime… in space.**

Inspired by Star Wars, Jagged Alliance, Far Cry, and the real revolutions of
history, Star Rebellion is a science-fiction tactical-management game.

You are the **Commander** — the elusive axis of the revolution. Starting from your
first group of radicals, who have nothing but grit and radicalisation against an
impossibly powerful enemy, you send your rebels on missions to gather resources,
hamper your enemy, grow your movement, evade detection, and upgrade your forces and
base, until you are strong enough to face your foe directly. The Hegemony and its
Empress laugh from their ivory towers — only you can take them down.

**References**: the isometric camera, tactical combat and emergent narrative of
XCOM and Wartales; the visual theme of Enter the Gungeon (cheeky-if-serious tone);
modern city-builder base management and expansion. The campaign escalates over
5 levels of scale, from a couple of anarchist rabble into an organised force that
can go toe to toe with the Empress' power.

## Game Loop

1. Accept missions, assign resources to them.
2. Play missions.
3. Collect rewards.
4. Upgrade and improve your rebellion.

---

## 1. Core Structure

Star Rebellion is a game of two phases: **Tactical Action** and **Base Management**.

**Tactical Action** is a real-time-with-pause action game where the player guides
their forces in tactical combat to achieve an objective. Example: a mission
requires sending fighters and equipment to steal a valuable piece of Hegemony
equipment. The player chooses who and what to send from their available resources
and initiates the tactical action on a new map, issuing orders that their forces
execute in real time to the best of their ability — until the player retreats, is
wiped out, or achieves the objective.

*(Note: space combat is the exception — it uses a turn-based ruleset. See
[Space Combat](#space-combat).)*

**Base Management** happens outside any Tactical Action, on a map of the player's
base. The base is a fixed map which the player gradually expands to fit more people
and equipment — including starships. From the base the player can view their
Sources, inspect available Missions, expand the base, upgrade personnel and
officers, manage fleets, and get news and information.

### Goal

To win, the player must **conquer the Capital and capture the Empress**. This is
the sole win condition. At the start of a new game, however, the player has but a
few untrained radicals who have had enough of the Hegemony — and no equipment to
supply them.

---

## 2. Player Statistics

The base-management layer, and progression toward the ultimate goal, is balanced by
a series of statistics.

### Revolution Level

A "wanted level"-style system and a major statistic: it tracks the scale of the
player's revolution against the Hegemony. There are **5 levels**.

**Level 1 — Criminals.** The player's actions are entirely inconsequential to the
Hegemony and the galaxy at large. Operations are treated as criminal rather than
political action by the Hegemony's bloated institutions.

- Resources are very limited: no starships, only simple vehicles. Field operatives
  have no special equipment. Everything the player has obtained is likely stolen.
- *Update:* ships are stolen, converted patrol craft and freighters converted into troop
  transports. Enemies are police and riot police on the ground, autonomous drones in
  space. No Alerts, and at most one Hero (more begin at Level 2). Touchstones: *Red Dawn*,
  *First Blood*. See §8 for how Level 1 ends.

**Level 2 — Noticed.** The revolution has earned the Hegemony's notice; its
intelligence agency begins investigating growing anti-Hegemony activity. The player
is now at risk of discovery if careless. Heavy response teams are a likely opponent.

- The player can be receiving funding and more advanced supplies. Missions to
  acquire spaceships and special weaponry may appear. The player has developed a
  veteran company of operatives by the end of this phase, and has their first
  Heroes. *[sentence unfinished in source]*

**Level 3 — Insurgency.** The Hegemony has fallen victim to the rebellion's first
major action and is alerted to widespread, organised insurgency. Several worlds now
have independent rebel movements. The player starts to encounter Hegemony Marines
as crackdowns begin. The risks are higher than ever.

- The player is ready to attract independent rebel movements into their alliance,
  gaining their manpower and resources. Major turncoats provide the first ship or
  two of a burgeoning rebel fleet. The player has one complete starfighter squadron
  by the end of this phase.

**Level 4 — Open Rebellion.** The galaxy is in open rebellion. The player commands
an organised force for the first time, with a formal structure, and possesses a
sizeable starfleet — but not one powerful enough to beat the Hegemony head on.

- The player is able to take control of worlds and their resources, including
  industry and science. *[sentence unfinished in source]*

**Level 5 — Civil War.** A civil war is in full swing. The Hegemony has a firepower
advantage, but the rebellion's numbers are enough to face them in battles.

- The player takes control of planets to round out the game, and finally attempts
  the mission they've been unable to tackle since day 1: reach the Capital and
  capture the Empress.

---

## 3. Missions

Missions are the main form of challenge. The player spends time in their base
between missions; when one is available, they can inspect it.

### Mission Tiers

- **Regular missions** — the baseline, generated from Sources.
- **Unique tiers** beyond regular missions — highly lucrative rewards, or missions
  that cause the Hegemony major problems, contributing toward a potential
  Revolution level-up.
- **Operations** — the major tier: the biggest moves a revolutionary force can
  make, the equivalent of the Tet Offensive, D-Day, the Easter Uprising, or the
  Battle of Scarif. Multi-stage missions, sometimes requiring one force to make it
  through several missions unscathed, possibly involving several groups of forces
  in several places at once. Massive rewards.
- **Alerts** — missions happening *to* the player rather than resulting from
  Sources: the Hegemony has found one of your smaller bases and is attacking, has
  identified a source you must extract or kill before they are interrogated, or is
  on the verge of finding your forces somewhere. Much more frequent at higher
  Revolution levels.

### Space Combat Missions

- **Intercept Transport** — a large transport is passing through a remote area
  with an escort. Destroy the escorting ships and disable it, then board it and
  steal its cargo.
- **Take Out Instructor** — a Hegemony flight instructor is training rookies and
  must be eliminated.
- *[TODO: full list of space combat missions]*

### Foot Combat Missions

- **Steal the Strider** — a robotic mech could be reprogrammed if we can steal it.
  Infiltrate the warehouse, then guide it out of there.

### Boarding Action Missions

Foot combat on spaceships or stations.

- **Seize Control** — (follow-on from missions like Intercept Transport) move
  through the ship, eliminate hostiles, and take control of the bridge.

### Post-Mission Summary Screen

- Participants gain experience.
- The player gains rewards depending on the mission.

---

## 4. Sources

Missions are created from **Sources**. The player recruits and cultivates Sources
throughout the galaxy, forming the spy network that gathers the intelligence the
rebellion depends on to operate and survive.

**Source types** (examples): Politician (e.g. a disillusioned politician in the
Hegemony's Parliament), Officer, Agent, CEO, Professor, Scientist, Engineer.

### Passive Benefits

Every Source provides passive benefits along with the chance of generating a
mission. Benefits improve as the Source is cultivated.

- **Money** — some source types can fund your cause, at the risk of discovery.
  When improved: larger amounts, possibly periodic bonuses.
- **Supplies** — some sources supply equipment and basic supplies. When improved:
  larger amounts.
- **Intel** — some sources increase Intel, an advanced measure of Hegemony action
  (the higher the value, the more warning of incoming Hegemony actions the player
  may need to respond to). When improved: higher intel value.

### Levels, Cultivation and Risk

As time goes on, and if the player cultivates the source, the Source's **level**
improves — making it more valuable, greatly reducing its risk of discovery, and
unlocking Events that lead to powerful bonuses.

Sources also have a **Risk meter**: the nervousness of the source, the attention
they have drawn, and how close they are to being **burned**. The higher the meter,
the higher the chance that, as time advances, the Source is burned — the Hegemony
discovers they are a traitor. Burn events raise the player's own risk meter.

To avoid a burn when risk is very high, the player can send an **Assassin**
(choosing to *Silence* a source brings up the assassin as a flavour screen, and the
player must confirm). This ends the Source and eliminates the risk — but the source
is gone forever, along with any unique benefits.

**Cultivation** improves a Source, representing reassuring them. When the player
visits or contacts a Source, the Source may have requests, demands, or doubts,
which the player responds to. Contextually strong answers improve cultivation;
weak answers may not, or may even lower it. When the cultivation meter maxes out,
the Source gains a level — higher levels of access within their field.

### Basic Flow

1. From the base (regular in-game HUD and base mode), the player visits the
   **Sources** screen *(UX flow pending)*.
2. All sources appear in a list with flavour text (names, locations, dossier) and
   abbreviated gameplay statistics.
3. Selecting a Source expands its statistics and presents a comm window with two
   options: **Visit** and **Contact**. Contact has much lower risk, only becoming
   risky at higher Revolution levels.
   - A third option, **Cut Loose**, appears when the Source has a high risk
     rating: it eliminates the source and the player's risk of discovery, at the
     cost of a morale penalty for the player's base and a downgrade of all other
     sources.
4. Making contact of either kind may generate a mission, or the player can tell
   the source to escalate their level of access to information.

### Worked Example

The player learns (by being contacted directly) that a bureaucratic manager of a
starfighter facility is angry at being passed over for promotion, and offers to
reveal how to obtain starfighters that will infuriate the one who wronged him. In
over his head, he is accepted and cultivated as a source — so he is higher Risk.
Eventually this source generates a **Steal Hegemony Fighters** mission, which the
player pulls off. But the Source yields nothing further, and the risk is high
because he is so jumpy. The player decides to silence the Source, sending an
assassin to finish him off.

### Player Stories

- The player can view all of their sources by opening a UI window.
- The player can inspect a source for information about its level, passive bonuses
  (money, supplies, intel), Cultivation meter and Risk meter.
- The player earns passive bonuses from the source (money, supply, intel) based on
  its type, level, and specific bonus value.
- The player can choose to visit a source in person or contact them remotely,
  opening a dialog with them.
- *[unfinished in source: "The player can, after initiating dialogue with the source, …"]*
- The player can see, from the source overview screen, when a source wants to make
  contact with them.
- *[TODO: more player stories]*

---

## 5. Rebels

Rebels are the people the player commands, puts into roles and advances to make things happen: the most
important entity to collect and develop. The model below is **built** (see `docs/REBELS_PLAN.md` for the
phase-by-phase record, and its section 7 for what the unbuilt traits are waiting on). Source: the designer's
*Rebels & Recruits* document.

**Types** (set when a rebel is generated):

- **Soldier** — the core character on any ground mission.
- **Pilot** — the core character in space combat.
- **Marine** — the core character in boarding actions (data and rules only; no Level 1 recruits, no boarding theatre yet).
- **Support** — runs the base's rooms, grants their bonuses; has no skills and equips no gear.
- **Hero** — see below. *(The earlier GDD also listed Crew for large ships; not part of Level 1.)*

**Per rebel**:

- **Name** from first and last name pools; a short origin line. A **level** 1–20 (100 XP per level).
- **Character Trait**: exactly one, created with them (45 traits, each with a quote and a mechanical effect).
- **Rebel Traits**: up to three, earned from experience (battlefield, psychological, successes, relationships, recovery).
- **Morale** 0–100 in five bands (Very Low to Very High). It moves with how the revolution and they personally are doing, nudges aim and Cool, and a rebel at 0 leaves.
- **Specialty** (Rookie until trained at the Training Center from level 3).
- **Rank** (seniority, separate from level): Army enlisted for Soldiers and Support, USMC enlisted for Marines, USAF enlisted for Pilots, earned by missions served and handed out by the player; from Sergeant at level 5 a rebel can be commissioned onto the officer ladder.
- **Skills** (cap 50): Aim, Constitution, Agility, Presence for Soldiers and Marines; Aim, Cunning, Focus, Presence for Pilots; none for Support; all six for a Hero. Derived from level plus experience from missions.
- **Gear** in slots: a primary weapon, a secondary weapon and two gadgets (Soldiers and Marines); secondary and gadgets (Pilots); none (Support). Equipped automatically from the player's pool, changeable by hand.
- A **dossier** with all of it, including a medical section and a service record.

**Recruiting.** Rebels are recruited through the Command Center's *Recruit new Revolutionaries* task, by Sources, and by rescue missions. Candidates appear on the **New Recruit** screen as cards (one or several at once); the player recruits or dismisses each.

**Injury and recovery.** A critical hit on a rebel inflicts one of twelve critical injuries (Concussion, Broken Arm, Broken Leg, Severe Bleeding, Internal Injury, Shrapnel, Burns, Eye Injury, Maimed, Spinal Injury, Ruptured Eardrum, Facial Trauma) with an immediate combat effect, removed in the encounter by the **Treat Wound** action. Most injuries then go home as a medical condition to be recovered at the Infirmary over time; an Eye Injury left too long, and Maiming, are permanent until a prosthetic is fitted in a Surgery Room.

### Heroes

Some rebels become **Heroes**. A hidden chance grows with what a rebel does (taking part, kills, close calls, standing out, being the last one standing); one rebel at most can be made a Hero after a mission, and everyone else's chance then falls sharply. Revolution Level 1 allows a single Hero in the whole playthrough (if they fall there is no replacement); from Level 2 the usual rules apply. A Hero replaces their type, keeps their rank, history and relationships, gets a buff to every skill and to health, and has a once-per-mission Hero action (Rally cry on the ground, Heroic surge in space). The player cannot see the chance anywhere. Support cannot become a Hero.

### Abilities & Gear

- Rebels who gain experience and levels can train in the base to gain a specialty.
- Training can also grant requisition access to better gear — equipping rarer or more valuable equipment. *(Armour is built: Head and Body kit adds an armour bar over health in ground combat.)*

---

## 6. Assets

A rebellion with no assets is a vocal but ignorable problem. A rebellion with lots
of assets is a bit of a crisis!

Assets are the tools of the rebellion: scavenged, purchased, gifted, found, or
stolen from the Hegemony. Viewable from the Assets screen in the Base.

**Categories**:

- **Weapons** — Rifles, Pistols, Machine Guns, Rocket Launchers, Missile Launchers
- **Vehicle Weapons** — Laser Cannons, Plasma Cannons, Missile Launchers, Rotary
  Ballistic Cannons
- **Vehicles**
  - Technicals (converted civilian trucks): Hovercar, Hovertruck, Mining Rig
  - Armoured Truck (military mounted-gun truck)
  - APC
  - Tank
  - Starfighter
  - Jury (any civilian freighter or ship rigged for combat — the space version of
    a technical)
  - Dropship (armed vessel for inserting troops into combat)
  - Frigate
  - Cruiser
  - Dreadnought
  - Carrier

---

## 7. Combat

### Space Combat

Space combat is inspired by the ruleset of the X-Wing miniatures game — an
interpretation of turn-based combat for dogfighting ships.

#### Ship Archetypes

These categories are designer/coder reference, not fixed in the game design: each
individual model of ship is unique, but tends to lean toward one archetype.

- **Multi-role starfighters** — don't excel in any one area, but adapt mid-mission
  to serve many roles, from hunting small ships to bombing runs.
- **Interceptors** — very good at starfighter engagement (high manoeuvrability and
  speed) but lack the firepower to attack larger or fixed targets.
- **Bombers** — carry heavy weapons for fixed positions and larger ships; are
  vulnerable to interceptors.
- **Gunships** — medium ships that support others by boosting shields, scrambling
  enemy targeting, and harassing; generally vulnerable even with extra durability.
  Can also board larger enemy ships or fixed positions.

#### Movement

Each ship has a unique set of basic moves: fly straight, bank left/right, or turn
left/right — each with a number indicating by how much (the **speed**).

#### Defense & Durability

- Each ship has an **evasion profile** (how hard it is to hit).
- Durability is made up of **Shield** (if the ship has a shield generator, or
  another ship is granting a shield), **Armor** (prevents direct damage to systems
  and structure), and **Hull**. Usually shield and armor must be eroded before
  hull can suffer damage, but certain abilities, weapons or weapon types change
  that.

#### Weapons

Each ship has a **loadout**, configurable between missions. Weapons have a range
that determines what they can target: at far range, targets gain a boost to their
target number; at close range, attackers gain an additional attacking modifier.

| Type | Ammo | Lock | Profile |
|---|---|---|---|
| **Ballistic** | Limited | Very hard to hit without a lock | Bypasses shields; can cause critical damage before the armor layer is lost |
| **Plasma** | Unlimited | Not required; fast travel improves unguided hit chance | Absorbed by shields; vulnerable to special attacks targeting ship subsystems (disable/interfere) |
| **Bombs** | Very limited | Not required, but immensely benefits | Destroys fixed positions; poor at everything else |
| **Missiles** | Very limited | Required to fire | Anti-starfighter; not as effective against other targets |
| **Torpedoes** | Very limited | Required to fire | Anti-large-ship / hardpoints / fixed positions; fairly ineffective against starfighters |

#### Phases of Combat

Like X-Wing:

1. **Planning** — each ship's movement is input.
2. **Activation** — pilot or ship abilities are activated or enabled.
3. **Execution** — ships move in **ascending** initiative order. Pilots choose an
   Action to execute.
4. **Attack** — ships attack in **descending** initiative order.

#### Attacking and Defending

A **d100 system**: a number of factors determine the **target number** —

> What is the angle of attack? How close to the "bullseye" of the attacker's
> weapon is the target? Does the attacker have a lock? Is anything jamming,
> spoofing, or disrupting the target? Is anything in the way? How elusive is
> this ship?

— then the attacker adds their own modifiers to try to beat that target number and
score a hit:

> What weapon am I using — accurate or inaccurate? How skilled is my pilot at
> aiming? Do I have a target locked, and by how much? Am I cool, or panicking?

**Locks**: ship computers lock onto targets within the lock zone (usually the
front of the ship, up to a certain range). Locking is an Action; repeating it on
future turns **stacks the lock rating** higher and higher, increasing hit chances.

#### Pilots

Ship traits are fixed numbers — the real wildcard is the pilot behind the wheel.

- Like RimWorld, pilots have **Traits** that give them their stats.
  *[TODO: list of traits]* Examples: **Lucky** slightly lowers the target number
  and slightly raises the attacker hit modifier; **Friends with…** ties their
  cool/panic rating to a pilot friend — if that friend dies, they are permanently
  Panicking.
- Pilots sit on a **Cool ↔ Panicking** spectrum. Highly Cool pilots get modifiers
  toward hitting and an initiative bonus; Panicking pilots get the opposite and
  cannot take certain Actions.
- Pilots gain **unique manoeuvres** with experience — e.g. a loop (turn around) at
  the end of a manoeuvre, a 180° turn at the end of a bank, or a barrel roll (move
  sideways, gain evasion).
- Pilots can also train **special abilities** as they level up.

### Foot Combat / Boarding Actions

*[Not yet covered in the source GDD material — real-time-with-pause per Core
Structure; details TBD.]*

---

---

## 8. Revolution Level 1 — Design Decisions

Decisions made with the designer while planning Level 1 (2026-09-30). Source docs are
linked from `docs/GDriveMasterSheet`.

### Progression to Level 2
- Level 1 has **no exit mission and no hard gates.** One Revolution progress meter fills
  over time, and when it fills the player sees an **escalation animation** into Level 2.
  (Level 2 content is out of scope, so the animation lands on a "coming soon" state.)
- The biggest contributor is **completing missions across multiple locations**. Liberation,
  local Support, source levels and some narrative events also contribute. A mission in a
  new location should count for more than a repeat in the same one.
- The design *predicts* (does not require) that by then the player: is active in several
  locations and their sources; has expanded the base a fair amount and used the new
  mechanics; has a decent roster; has several ships; and has liberated a region or two
  within a location, not necessarily a whole location. These are playtest tuning targets.

### Starting position
- The hangar starts with **four landing pads**, one ship per pad. (Supersedes the
  prototype's reduced day one of capacity 2.) Ships repair slowly on a pad.

### Intel
- Intel is **the currency that buys Access** to locations and raises Access levels.
  The early-warning role from the source GDD returns with Alerts at Level 2; it is not a
  Level 1 mechanic.

### Resources
- Five resources: **Credits** (can I pay for it), **Supplies** (can I sustain it),
  **Materials** (can I build or fix it), **Fuel** (can I move it), **Intel** (do I know
  enough to act).
- In Level 1 Materials and Fuel matter *lightly*: Fuel is spent when ships fly missions;
  Materials are spent on base construction and upgrades. Both come from missions
  (e.g. Steal Fuel), loot, and some sources.

### Locations
Each location has four statistics:
- **Security** (0–5 helmets): Hegemony presence. Higher means riskier sources, tougher and
  more numerous enemies, missions that target the Hegemony more directly, and more Intel
  needed to raise Access.
- **Access** (0–5 eyes): the network's reach. Higher unlocks rarer sources, Opportunities
  (from Access 2), and visibility of Hegemony forces there.
- **Support** (0–5 flags): population sympathy. Raised by source events and Diplomatic
  Quarter tasks.
- **Liberation** (0–100%): derived from the liberation of the location's **regions and
  settlements** (Hegemony-controlled, contested, revolution-controlled).
- **Onboarding worlds** (Haven Rock, Brakka, Veray Yards, Relay Kess) sit close together
  near the base and all start with **Access 1**. Brakka is a general frontier backwater
  with two regions: **Dustfall** (where *Steal the Cross* happens) and **Redrock Flats**
  (*Steal Fuel*). Story missions only *start* a region's liberation (*Steal the Cross* adds
  10%); they never finish one. Brakka's repeatable local ops only open once the onboarding is
  finished.
- **Regions are land only.** Space combat is auto-generated in orbit over a location and never
  belongs to a region, so space missions (Cook the Depots, fuel-hauler skims, relay taps) carry
  a location but no region and add no liberation, though they still count for Revolution
  progress.
- **Scale:** the other existing worlds keep Security, Access and Support but have no regions.
  Three new **liberation-ready outworlds** carry 3 regions each: **Menk** (quarry world,
  Security 2), **Ballakan** (river world, Security 1) and **Parity IV** (administrative
  world, Security 3). The rest are scouting and mission targets.
- **Liberating a region:** missions in the region add liberation %. Progress is capped by
  **both Access and Support: the lower of the two applies.** (Cap curve per level is a
  tuning value, initially 20/40/60/80/100%.) Reaching 100% in a region therefore needs
  Access 5 *and* Support 5 in that location.
- **Raising Access:** costs Intel: `Security + current Access + 1`. The first unlock is the
  world's scout cost and gives Access 1.
- **Raising Support:** only by narrative means. Missions do *not* raise Support. A strong
  answer in a Source conversation gives that location +0.5, and a Source levelling up gives
  +1. (The Diplomatic Quarter will add tasks later.)
- First access to a location shows a cinematic briefing popup with its statistics.
- **Local ops (placeholder).** Until the mission framework lands, each liberation-ready
  world puts one abstract "local op" on the board per region that can still move
  (liberation below 100% and below the cap). Each adds 20% to its region. They resolve with
  the old abstract resolver and will be replaced by real missions.

### Revolution progress meter
Implemented as one 0–100 meter. It has **no daily trickle**; it only moves when the player
acts:
- **Mission success:** +1.2, plus +3 for the first success in a location and +1 for the second.
  Repeats in one location are worth less: the 3rd to 5th count for half, the 6th onward for a quarter.
- **Liberation:** +0.05 per % liberated, and +4 when a region reaches 100%.
- **Access:** +1 for first charting a location, +0.5 per Access level after.
- **Support:** +0.5 per Support level gained. **Source level-up:** +2. **A finished source chain:** +3.
At 100 the **escalation animation** plays once and the lamp shows 2. All weights live in `REV_W`
in `base.js` and were tuned in Phase 7 (below). Old saves are clamped to 40 when first loaded.

### Phase 7: playtest and tuning (built)
`tools/autoplay.js` is a headless **bot player**. It drives the real game code day by day (sources,
Access, missions with synthetic results, building, staffing, diplomacy, upgrades, patrols) and logs a
timeline. `tools/sweep.sh` runs it over several seeds; the weights can be overridden with `REVW='{"mission":2}'`.
What the first runs showed, and what changed:
- **Too fast.** With the original weights the meter filled in 45-60 days after only ~17 missions,
  3 worlds, 2 ships and no liberated region. The weights above roughly halve that curve and make
  *new worlds* matter far more than repeats.
- **No way to get pilots.** The bot ran out of pilots (only Joss and Sera). The recruit pool now has
  **Pilots**, offered by sources (Veray, Callis, and a general "people who want to fight" signal).
- **Liberation stalled.** Offers landed in random regions, so no region ever finished. Offers now have
  **momentum** (55% chance to land in the region we are already winning, never one capped by Access or
  Support), and mission liberation yields are x1.6.
- **Credits piled up** (10-40k idle by day 100). Expanding a room now costs +35% per extra tile and a
  specialty costs 300 credits. Credits are still comfortable; real sinks (ships, gear, Level 2 content) are
  Level 2 work.
- **Result (balanced bot, 6 seeds):** escalation on day 71-108 after 26-43 missions, 4-7 worlds touched,
  3-4 sources, 12-20 rebels (5-11 soldiers), 2-3 ships, 20+ base tiles, and one liberated region in
  about half of the runs (the rest have several partly liberated). A human is slower than the bot, so
  expect about 130-180 days. Ships stay at 2-3 until the *Steal [Vehicle]* type exists.

Two rules the bot made visible: Access 3 caps liberation at 60%, and the whole base is only about 36 tiles,
so expansions compete for floor space.

### Economy scale (rebalanced ×4, Intel unchanged)
All credit, supply, material and fuel numbers sit in the range set by Rescue Dissident's 500
credits: the campaign starts with **1000 credits, 480 supplies, 400 materials, 240 fuel** (Intel 3,
unchanged: Intel is a count of leads, not a bankroll). Rooms cost 200-480 credits plus
80-200 materials; restoring the hauler costs 240 credits and 160 materials; a sortie burns
16-24 fuel per ship; repairs cost 4-8 materials per ship per day; the hangar weeps +4 fuel a
day; sources pay 12-120 a day depending on type. Tier 1 missions pay roughly 300-700 credits
(Rescue Dissident 500, Steal the Cross 500, Blow Up Auto Factory 450, Steal Fuel 300 plus 240
fuel, Steal Intelligence 400 plus 6 Intel), with materials, supplies or fuel as secondary
rewards. Map loot is scaled the same way. Old saves are multiplied ×4 once on load.

### Resources, hangar and fuel (built)
- **Materials** (⚙) pay for construction, excavation, repairs and restoring the hauler. **Supplies**
  (▤) remain for people-related costs (infirmary, training hall, barracks annex). **Fuel** (◐)
  is burned per ship on every sortie, by ship type (database: Marta 42, FT-4 Cross 24, Talon 32; see
  [DATABASE.md](DATABASE.md)). A trickle of +1 Fuel a day
  weeps from the hangar-cave tanks so the player can't soft-lock.
- Sources and missions can pay Materials and Fuel (Steal Fuel-type jobs, tanker grabs, ore, quarry
  and timber ops).
- The hangar starts with **four landing pads**; each Hangar Bay adds one.

### Mission planning (built)
- A mission is a **type** (ground, space or off-screen) plus a story. The type sets its
  requirements; a mission can override them (Steal the Cross needs 3 soldiers, a transport
  with its pilot, and a pilot for the prize). Each mission lists **objectives** and is tied
  to a **source**, a **location** and, where relevant, a **region**.
- The **briefing board** shows narrative, objectives, reward and Pre Conditions, with slots for the
  Team (soldiers), Transport (+ its pilot, one transport seats 4 soldiers), and any extra pilots,
  or for space sorties a Flight of pilot + ship pairs. Fill slots by clicking the roster or
  dragging; filled slots are clicked to clear. Choosing a pilot pulls in their ship and vice
  versa. **Auto-fill** is available.
- Playable missions are played: **Start** launches the scene. Missions with no scenario yet
  are off-screen jobs: **Launch** sends the team and resolves in days. Once a mission has a real
  scenario, the off-screen option disappears.

### Mission flow (built)
Play → extract → **return-to-base cinematic** → **reward screen** (objectives, loot, crew XP and
injuries, Revolution progress, liberation gained) → the mission's source **calls back
automatically** in the usual comm window. Fixed mission rewards now apply to ground missions
too, on top of loot.

### Steal Fuel (built, the first Tier 1 mission)
Given by Cass Wender once the depot run is done (he also reaches out on his own). Played on
**Redrock Flats, Brakka** as a ground operation: (1) **reach the fuel depot**, (2) **call in
the Marta**, who flies from the LZ and lands on the loading apron (this wakes the depot),
(3) **defend her while the tanks fill: 5 rounds** (or ~6 seconds each out of combat), and only
while at least one rebel holds the apron. Reinforcement waves arrive after rounds 1 and 3,
(4) **board and lift off**. The mission pays **60 Fuel and 40 credits**, plus loot, and adds 10%
to Redrock Flats' liberation. Failing offers a retry with no cost. The reusable pieces (call-in
transport, timed defend, extract from wherever the transport lands) are in `ground.js` for the
next missions.

### Blow Up Auto Factory (built, Tier 1)
Offered by **Tessaly Brandt** (Menk) once she is a source, or through her signals. Played at
the **Kiln Ridge AutoCom Plant, Menk** (region: Kiln Ridge, +20% liberation, capped by Access/Support):
- **Needs an Explosive Charge** in the armory (a Pre Condition). The Redrock depot and a blasting
  shed at the AutoCom Plant both hold charges. One soldier carries it (marked ✸); if they go down,
  the nearest rebel picks it up. Only the carrier can plant it.
- Plant it on the **Power Plant's main breaker**, get everyone out of the **blast zone** (a dashed
  ring), then **Detonate**. Detonating with anyone inside the zone is refused. The blast hurts
  anyone in range, wrecks cover and sets off fuel drums.
- **Optional: stay unseen.** If the plant never raised the alarm before the charge blew, the
  mission pays a bonus (+2 Intel, +60 credits). The blast then alerts the plant and a riot
  response lands at the gate; the squad extracts at the Marta.
- Reward: 100 credits and 40 Materials, plus loot. The charge is used up once planted.
- **New Level 1 enemies** introduced: **Auto Policebots** (flimsy, never panic), **Patrolmen**,
  **Riot Shieldmen** (their shield blocks every shot from the front, so flank them) and **Riot
  Riflemen**. The Riot Bruiser and Bureau Officer are still to come.

### Specialties and the Training Center (built)
At **level 3** a soldier or pilot can train into a **specialty** at the Training Hall's
**Specialty Training** window (practice range for soldiers, flight simulator for pilots, one slot
each for now). Training takes **3 days** and the trainee is out of action meanwhile; the
specialty shows on their dossier, roster chips and planning slots. Only some specialties have
effects yet: **Field Technician** (cracks databanks), **Vanguard** (+1 aim), **Dogfighter** (+1 pilot
aim). The rest are listed as "later" from the docs (Gunner, Commando, Assault, Combat Medic,
Demolitions Specialist, Marksman, Commander, Driver; Leader, Bomber, Fire Support, Flight Engineer,
Shipbuster). Support specialties are still to come.

### Level 1 enemies, vehicles and hacking (built, Phase 4)
- **Enemy roster:** Patrolman, Auto Policebot, Riot Shieldman (front-blocking shield), Riot Rifleman,
  **Riot Bruiser** (melee, 95 hp), **Strider Mk I** (190 hp and 50 armour, autocannon, patrols the AutoCom Plant), and
  three cruisers: **Police Cruiser** (pulse cannon), **Riot Dispersal Cruiser** (turret) and
  **Riot Transport Cruiser** (unarmed; it arrives with the response wave and **unloads a riot squad**
  when the alarm is up). The cruisers are crewed vehicles (see *Vehicles and Bots* below). Machines drop
  scrap, not credits.
- **Hacking Autos.** A **Field Technician** within 300 units and in line of sight can hack an enemy
  Auto (Policebot 1 round, Bruiser 2, Strider 3): the **Hack** radial action in combat, or the **Hack**
  chip then tap in free move (about 4 seconds a round, silent). The hacker has to stay alive and on
  target. A hacked Auto **fights for us on its own**, and if it survives and **extracts** it **joins
  the roster** as an Auto (no bunk, keeps its stats) and can be fielded in later squads. A hacked
  **Strider** is a Bot, so it joins the vehicle pool instead.

### Vehicles and Bots (built)
Source: *Vehicle Gameplay* in the Ground Combat doc. The designer's classification: an **Auto** is the robot
equivalent of a character, a **Bot** the robot equivalent of a vehicle, a **Drone** the robot equivalent of a ship.
- **Vehicles are not characters.** They never act on their own. A character **mounts** one and acts through a
  **position** (seat): the driver moves it, a gunner fires the position's weapon, a troop bay just rides.
  An **enclosed** position cannot be targeted; the vehicle takes the hits (a grenade or strafing blast hits the
  hull, not the crew). An **open** position (the Dispersal Cruiser's turret) can be shot, at +3 TN for the hatch.
- **Destroyed:** the crew are thrown clear beside the wreck and take 10 to 22 damage (a 1 in 4 chance it is a
  critical, so a rebel can be injured). The wreck stays on the map. A critical on a vehicle damages its drive
  (a quarter off its speed). Rockets and every other weapon hit the hull normally.
- **Inside a vehicle** a character's orders change: **Move** goes up to the vehicle's speed (driver only),
  **Sprint** and **Take cover** do not exist, **Hold** only on a gun position, **Lock in** still works on the
  person's nerve, **Exit** gets out, **Switch position** moves to a free seat (one choice per kind of seat),
  **Loot** and **Work** are out of reach (a job can allow Work from a vehicle with `inVeh`; none does yet).
  **Enter** appears on foot when a vehicle with a free seat is within a walk, and nobody from the other side is
  in it. Exit and Switch happen as the round opens and cost the shot; Enter happens at the end of the walk.
  Grenades are not thrown from a seat. Fire Support and the Hero's Rally cry still work (they are a radio and
  a voice).
- **Free move:** tap a vehicle and the nearest rebel on foot walks over and climbs in; tap one of ours that is
  full and everyone gets out (or use **Exit** on the command bar). A driver takes the vehicle when the squad
  moves; the other seats ride along.
- **Enemy vehicles** spawn crewed when the mission says so: Police Cruiser (driver on the pulse cannon),
  Riot Dispersal Cruiser (driver plus open turret gunner), Riot Transport Cruiser (driver plus a three-seat
  troop bay that gets out when the alarm goes up). Drivers patrol while calm and close to their gun's range
  when alerted; gunners hold and fire. Bay passengers do not keep watch. **A crew bails out of a vehicle under
  30% hull** (the same roll as a lawman surrendering), and an empty vehicle can be taken by whoever gets to it.
- **Stats** (placeholders from the old cruiser units): Police Cruiser 130 hp, TN 7, speed 320; Dispersal
  170 hp, speed 260; Transport 150 hp, speed 280. On foot a Move is 150 and a Sprint 300.
- **Bots** (the Strider): drive themselves and cannot be manned. They take the vehicle action list (Move at the
  Bot's speed of 220, Hold; no Sprint, Take cover, Lock in, Loot, Work, Enter).
- **Owned vehicles and Bots** live in the base's **Vehicles and Bots** list (`G.vehicles`), not on the roster.
  The planning board's Fire support area takes one as an optional asset; in the mission the **Fire Support**
  menu sets it down where you call it at the start of the next planning (a vehicle empty, a Bot ready for
  orders). Whatever is still running comes home (damage carries over and repairs in the hangar like a ship);
  a wreck is lost.

### Fire support (built, Phase 4)
The planning board's **Fire support** area takes assets for ground missions:
- **Supply Drop** (160 supplies, a toggle): a crate lands as the next round begins, where you call it.
  Looting it gives **5 stims, 2 BLAM frags and 2 makeshift rocket launchers** (one shot each, big
  single-target damage, good against vehicles and Striders).
- **Support ships** (up to two, each a spare ship plus a pilot, burning fuel): a **starfighter** flies a
  **Strafing Run** (tap the start, then the heading; ten imprecise blasts along a line at the end of the
  round, **danger close** to your own people). A spare **Graf** can be a **Door Gunner** (circles two
  rounds, rakes up to three visible enemies a round) or carry **Reinforcements** (up to two more soldiers,
  set down at the start of the next planning phase where you call them).
- In the mission, any soldier's radial **Fire Support** opens a menu top-left; pick an item, then tap a spot
  you can see. Level 1 only has one Graf, so Door Gunner and Reinforcements wait for a second hauler.

### Space enemies (built, Phase 4)
Cook the Depots now uses **Drone Monitors** (weak; a Monitor that sees you **calls in a Pursuer**, once),
**Drone Pursuers** (fast hunters) and, from round 5, a patrol answer: a manned **VC Mote** fighter and a
**Drone Mag-Clamper**, whose clamp cuts a ship's top speed by 2 for two rounds.

### Steal the Strider (built, Tier 1)
Offered by **Tessaly Brandt** once the AutoCom Plant's Power Plant is gone. Played at **Menk Crossing**
(region: Menk Crossing, +15% liberation, capped by Access/Support):
- A **Strider Mk I** stands in a locked holding yard. Any soldier can **override its leash panel**
  (two rounds). The override is quiet; it only alarms the depot if the squad was already seen.
- Once freed the Strider is a **Bot you command**: 220 hp, heavy autocannon, big and loud, with the
  vehicle action list. **If it is destroyed the mission fails.** It and the squad must reach the Marta.
- **Optional: stay unseen** (bonus +300 credits). Reward: 450 credits, 200 Materials.
- **The Strider joins the vehicle pool** as a Bot (older saves move it there from the roster). It no longer
  takes a team slot: bring it as a fire-support asset and summon it from the Fire Support menu.

### Steal Intelligence (built, Tier 1)
Offered by **Ione Cask** (Parity IV). Played at the **Data Flats server farm** (region: Data Flats,
+15% liberation, capped by Access/Support):
- **Gated by a Field Technician.** The mission can be opened and read even without one, but it
  cannot be started. The briefing explains: *"Missing Field Technician: train a soldier to level 3
  and use the Training Center to give them the Field Technician specialty to attempt this
  mission."* The team must include a Field Technician.
- **Hack the databank:** only the technician can work the terminal in the east server hall, for
  **three rounds** (about 4 seconds each out of combat). Finishing the hack trips the trace, the
  farm is alarmed and a riot response arrives at the gate; the squad extracts at the Marta.
- Reward: 400 credits and **6 Intel**, plus loot.

### Rescue Dissident (built, Tier 1) and the recruit pool
Offered by **Orrin Pell** (Ballakan). Played at the **Tollgate security outpost** (region: Tollgate
Landing, +15% liberation, capped by Access/Support):
- **Release the prisoner** from the detention cage (a Work order at the cell lock). Once freed
  they follow orders like any rebel but are frail; if they go down the mission fails. They must
  reach the Marta with the squad.
- **Optional: stay unseen.** Never raising the alarm pays a bonus (+2 Intel).
- Reward: **500 credits**, bonus XP for the squad (+35%), plus loot; the prisoner is then
  **offered as a Support recruit**.
- **One recruit pool.** Anyone we offer, hold for a mission or rescue comes from the same pool
  as normal recruits (`RECRUITS` in `base.js`, now 8 Soldiers and 9 Support), and each person
  appears once. A mission that needs an NPC **reserves** a name when it is added, so the
  briefing can name them, and a failed attempt keeps the same person. Dismissed people are
  gone for good. Future rescue and recruit-reward missions should use `holdRecruit()`.

### Phone support (built)
iPhone 12 Pro is a supported device (390x844 portrait, 844x390 landscape, safe areas honoured, added to
the Home Screen it runs full-screen). Phone layout rules: the info panels become a slide-in **drawer**
(Info/Crew button); windows, briefings and the planning board are full-screen and scroll; the ground and
space scenes show the current objective in a strip at the top and move the minimap to the top-right;
hints say *tap* instead of *click*. Input is already pointer-based: tap to move/fire, drag to pan, pinch to
zoom (ground and space); the base uses a *Step inside* button and tap-to-open crew files instead of
double-click.

### Base rooms (built, Phase 5, first slice)
- **Rooms merge.** A room is a rectangle of tiles. Rooms of the same type that touch are one merged
  room: one outline, one label, one set of upgrades (a new room built next to it inherits them). The
  tile popup says *Expand the X* when the build will merge.
- **Hangar:** one landing pad per hangar tile (four at the start). **Barracks:** 3 beds per tile
  (two tiles at the start). **Intelligence Center** (was the Comms Array): +1 source slot and +1
  Intel a day per tile while staffed. **Storeroom:** caps Supplies at 1000 + 250 per tile (+5% per
  extra tile); anything over spoils. The old Hangar Bay and Barracks Annex builds are now just
  expansions of the Hangar and Barracks (old saves convert).
- **Upgrades** apply to the whole merged room, cost credits and materials, and take days.
  Barracks: *Bunks* (+2 beds per tile), *Quarters* (+2 more). Hangar: *Refuelling Station*
  (sorties burn 25% less fuel), *Robot Maintenance Arm* (+5%/day ship repair). Bought from the
  room's interior view.
- **Staff posts** (Support rebels): Garrison Officer (wounded soldiers heal a day faster), Flight Deck
  Officer (+4%/day repairs on the pads), Chief Diplomat. The Infirmary gains one medic post per tile.
- **Diplomatic Quarter:** a Chief Diplomat sends teams to any world where we have Access
  (**400 credits + 60 supplies, 4 days**, one team per Quarter tile). A team adds **+½ Support**, or
  **+1 flag** when the Chief Diplomat is level 3+. Support is what gates liberation, so this is the
  player's way to grow it without waiting for source events.
- **Conversions** turn one tile of a merged room into something else (it needs a spare tile, so the
  room must have been expanded): *Ready Lounge* (hangar: loses a pad; every sortie takes 1 day
  less, minimum 1), *Maintenance Bay* (hangar: loses a pad; the most damaged ship repairs 10%/day
  faster), *Rec Room* (barracks, needs 3+ tiles: loses a tile of beds; resting rebels gain morale
  twice as fast). A conversion is refused if it would leave a ship or rebel without a berth.
- **Surgery Room** (Infirmary upgrade): with a medic on station, a rebel who would be lost in the field
  has a 60% chance to survive, out for 6 days.
- **Patrol Local Space** (Hangar task): a ready ship (hull 60%+, fuel, its pilot free) goes out for 2
  days; it brings back +1 Intel, often 60-100 Materials of salvage, and a 25% chance of a scrap that
  costs 10-20% hull. *Restore Broken Ship* was already built.
- **Gear Grid** (Storeroom, "Gear Grid" button): replaces the flat list. Items have a category
  (Weapons, Explosives, Armour, Other) and a footprint (a rifle is 3x1, a pistol or grenade 1x1);
  duplicates stack as one entry with a count; the Storeroom gives 24 slots plus 12 per tile. The grid
  warns when full but does not yet refuse loot.
- **Not built yet:** Storeroom capacity for other resources, enforcing the gear-slot limit.

### Sources as quest chains (built, Phase 6)
A **chain** is a unique source tied to a world (`locId`), authored as data in `CHAINS` in `base.js`.
Steps run in order: **alert** (a lead the player may answer or snooze for 3 days), **contact** (the
source's first transmission; acknowledging adds them to the network, which needs a free slot),
**decode** (wait N days, then a branching choice that can hand over items), **missions** (one instance
of a mission type per listed region; done when all are done) and **checkin** (the source's next
check-in, answered like any source event; the ending depends on how the missions went).
- **Level 1 chain: The Listening Towers (Parity IV).** Starts when Parity IV Access reaches 2.
  **Hale Doran**, a Signals Authority line engineer (the Engineer source type), reaches out; after a
  3-day decode the player chooses to **blow** the three relay towers (three Explosive Charges) or
  **tap** them (three Data Limpets). Three *Disrupt Comm Towers* missions follow, one per region
  (Ledger Town, Data Flats, Quota Blocks), each with its own guard roster. Then Doran checks in.
  Ending by the method used in at least two of the three: **blow** gives +5 Intel and +1 Support in
  Parity IV; **tap** gives +3 Intel and **+2 Intel a day** from Doran. The check-in answer also raises or
  lowers his cultivation as usual.
- **Disrupt Comm Towers** is a normal mission type (reward 5 Intel, XP). The squad carries the device;
  an Explosive Charge drops the tower, a Data Limpet leaves it standing and tapped. If two soldiers
  carry different devices, who walks up decides which is used. Either completes the objective.
- **Other source types** from the Sources doc now exist as candidates: **CEO** (Director Ansel Brook,
  Dreymar), **Professor** (Nell Ostrander, Callis, at Access 2), **Double Agent** (Constable Iko Varr,
  Veray, at Access 2). All four types (with Engineer) can also offer mission types via `SRC_OFFERS`.

### Mission types and narrative contexts (built)
The Missions document describes **mission types**, not one-off missions. A type (objectives, rewards,
scenario) is deployed in a **narrative context** (a world, a region and a target name) by **any Source
or by our own Intelligence**, and is never "done for good".
- **Types in `MTYPE_DEFS`:** Steal Fuel, Steal Intelligence, Blow Up Auto Factory, Rescue Dissident.
  Each has target-name variants (e.g. listening post, satellite array, server farm) and text with
  `{target} {place} {npc}` slots. Every deployment is its own instance (`fuel_3`) with a context
  (`target, place, locName, sec`), so the same type can sit on the board several times.
- **Context reaches the ground scene.** The briefing, call-sign line, key building label and the
  mission report use the context's place and target. Rewards scale ×(1+12% per Security above 1)
  and Security 3+ worlds add **+2 / +4 / +6 auxiliary guards** (Security 3, 4, 5).
- **Story first, then the network.** Each Source's first job keeps its scripted story context
  (Brakka, Kiln Ridge, Tollgate, Data Flats). After that, a Source with a matching specialty
  (`SRC_OFFERS`: e.g. Tess offers Auto Factory / Fuel / Rescue) sends fresh contexts at any
  Access 1+ world with regions.
- **Intelligence leads** (Opportunities) pick a type at random for the world and spawn an
  instance when accepted. The old regional placeholder ops are retired.
- **Unique story missions** are not types: Steal the Cross, the Depot Run and Steal the Strider
  stay one-offs (the Strider is a capstone).
- **Steal [Vehicle]** (to obtain ships and gear) is a planned new type, to be designed by the
  project owner.

### Tier 1 mission rewards
The Missions doc leaves several Tier 1 rewards blank: they are to be balanced as we go, so these are my
numbers (DESIGN_BLOCKERS C-4). Rewards scale with Security as above, and loot comes on top.

| Type | Missions doc | In the game, or my guess for when it is built |
|---|---|---|
| Steal Intelligence | blank | 400 credits, 6 Intel (built) |
| Rescue Dissident | 500 credits, the dissident as a Support recruit | as the doc (built) |
| Blow Up Auto Factory | blank | 450 credits, 160–200 Materials; +300 credits for staying unseen (built) |
| Steal Fuel | (x) Fuel | 240 Fuel, 300 credits (built) |
| Destroy Checkpoint | materials, supplies | *guess:* 120 Materials, 160 Supplies, 150 credits |
| Ambush: VIP | the prisoner as a Support recruit | *guess:* as the doc, plus 200 credits |
| Ambush: Precious Cargo | whatever gear was in the truck | *guess:* as the doc, plus 100 credits |
| Steal Ship | the ship | as the doc (Steal the Cross gives the Cross, 500 credits, 120 Supplies) |
| Cause a Riot | blank | *guess:* 160 Supplies, 200 credits, +Support in the region |

### Opportunities (built)
Our own intelligence turns up leads in any world at **Access 2+**, but only while the
**Intelligence Center is built and staffed** (internally still the `comms` room). A lead shows as an amber diamond on the galaxy map; clicking it reads the
briefing and adds it to the mission board; the marker stays until the job is done. One
lead per world at a time, at most four open. Higher Access means more frequent, richer leads;
leads in liberation worlds target a region and add liberation. Each lead is a random mission type
(see Mission types and narrative contexts).

### Missions
- Missions come from Sources and from Intelligence (map markers, from Access 2). Alerts are
  Level 2.
- Every mission is a preset type (objectives and parameters) plus a designer-written
  narrative wrapper, so a Source can run a chain of missions.
- Level 1 Tier 1 mission **types**: Steal Intelligence, Rescue Dissident, Blow Up Auto Factory and
  Steal Fuel (reusable, any source), plus the unique Steal the Strider.
- **Steal Intelligence** appears on the board but cannot be completed until a **level 3+
  soldier holds the Field Technician specialty.** Attempting it without one shows:
  *"Missing Field Technician: train a soldier to level 3 and use the Training Center to
  give them the Field Technician specialty to attempt this mission."*
- Specialties (Training Center) are therefore in scope for Level 1, starting with Field
  Technician.

## Open Questions & Gaps (from source)

- Full list of space combat missions.
- Full list of pilot traits.
- Sources screen UX flow.
- Unfinished Revolution Level 2 and 4 reward notes, and one Sources player story.
- Missions doc: tier names are cut off. Blank Tier 1 rewards are deliberate (balanced as we go); my numbers
  are in [Tier 1 mission rewards](#tier-1-mission-rewards).
  (Resolved: the Outworlder enemies are Level 1 only. Directives are WIP and ignored.
  Disrupt Comm Towers is Tier 2 and out of Level 1 scope.)
- Foot combat and boarding action rulesets.
