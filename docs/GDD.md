# Star Rebellion — Game Design Document

> Working draft, reassembled from the Notion WIP GDD. Content is preserved from the
> source; editorial markers like *[unfinished in source]* flag gaps to fill rather
> than decisions that have been made. The canonical doc lives in the designer's
> Notion under Game Concepts; this copy exists so the repo and its prototypes can
> reference it.

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

Rebels are the player's recruits and the main force of victory.

**Roles**:

- **Pilot** — flies starfighters.
- **Crew** — operates large ships.
- **Soldier** — fights in foot battles.
- **Marine** — fights in boarding actions.
- **Support** — out of combat; mans stations in the base and provides benefits
  based on that (medic, flight control coordinator, quartermaster…).

**Per-rebel statistics**:

- Flavour text (name, age)
- Traits
- Rebel Level (starts at 1)
- Equipment
- Any special abilities

### Heroes

Some Rebels become **Heroes** through heavy use, surviving many missions, or
achieving certain individual goals — becoming the leaders within the movement.
Heroes are uniquely powerful and generally survive much longer, so they can take
more dangerous missions. The player cannot see who will become a Hero from any
game interface, but can try to create one by putting rebels in situations that
contribute toward the chance.

### Abilities & Gear

- Rebels who gain experience and levels can train in the base to gain special
  abilities.
- Training can also grant requisition access to better gear — equipping rarer or
  more valuable equipment.

---

## 6. Assets

A rebellion with no assets is a vocal but ignorable problem. A rebellion with lots
of assets is a bit of a crisis!

Assets are the tools of the rebellion: scavenged, purchased, gifted, found, or
stolen from the Hegemony. *(Source text says "Imperium" here — naming
inconsistency to resolve.)* Viewable from the Assets screen in the Base.

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

## Open Questions & Gaps (from source)

- Full list of space combat missions.
- Full list of pilot traits.
- Sources screen UX flow.
- Unfinished Revolution Level 2 and 4 reward notes, and one Sources player story.
- Naming: "Hegemony" vs. one occurrence of "Imperium" (Assets section).
- Foot combat and boarding action rulesets.
