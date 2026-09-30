# Star Rebellion — Revolution Level 1 Roadmap

> Draft plan. **Scope: Revolution Level 1 only.** Built from the nine design docs
> linked in `docs/GDriveMasterSheet` (read 2026-09-30) plus a gap check against
> `game/js/`. Anything the docs put at Rev 2+ is listed under *Out of scope*.

## Level 1 in the docs

Level 1 is "peacetime" for the Hegemony: the player is a criminal or local insurgent,
opposed by police, not soldiers. Resources are stolen and improvised, ships are
converted patrol craft and freighters, and there are no special-equipment operatives.
Touchstones are *Red Dawn* and *First Blood*. Progress toward Level 2 comes from
missions, liberation, local support and some narrative events. The player has no
starfighter squadron and no Heroes yet.

## Where the game is now vs. the docs

| Area | Docs say | Game has |
|---|---|---|
| Opening chain | (not specified) | Take the Rock → base → Cass → Sera → Marta → Steal the Cross → Cook the Depots |
| Sources | Type list, cultivation, risk, burn, silence, cut loose; **location-tied**; **quest chains** | Everything except location ties and authored chains |
| Locations | Security (5 helmets), Access (5 eyes), Support (5 flags), Liberation % by region; cinematic intro popup | Planets are `known`/`access` booleans; Intel is spent to scout once |
| Resources | Credits, Supplies, **Materials**, **Fuel**, Intel | Credits, Supplies, Intel (plus renown, risk, morale) |
| Missions | Source / Intelligence-generated; Directives; Opportunities (Access 2+); mission types wrapped in narrative | Source-generated only; several ad-hoc missions |
| Tier 1 missions | Steal Intelligence, Rescue Dissident, Blow Up Auto Factory, Steal Fuel | Steal Cross, Cook the Depots, plus abstract-only jobs; Strider locked |
| Mission planning | Team + Assets + transport slot, drag/click from roster | Team and preconditions UI, no Assets or transport slot |
| Ground combat | Stealth, Fire Support (reinforcements, door gunner, strafing, supply drop), hacking Autos | Stealth, cover, nerve, grenades, stims; no fire support, no hacking |
| Enemies (Rev 1) | Policebot, Patrolman, Riot Shieldman/Rifleman, Riot Bruiser, Cruisers, Strider Mk I; drone starfighters | Dustfall deputies and Sheriff, RQ-7 drones |
| Base rooms | Room expansion and upgrades; Intelligence Center; Diplomatic Quarter; Training Center | Fixed room list; Comms Array ≈ Intelligence Center; no Diplomatic Quarter |
| Gear | Slot grid with size-based fit and categories | Flat armory list |

## Phases

### Phase 0 — Design decisions (blocks everything else)
1. ~~**Level 1 exit.**~~ **Decided:** there is no exit mission. Level 1 ends when
   accumulated progress fills the Rev Level meter and the player sees an escalation
   animation into Level 2. See *Progress to Level 2* below.
2. ~~**Intel semantics.**~~ **Decided:** Intel is the Access currency only in Level 1; the
   early-warning role returns with Alerts at Level 2.
3. ~~Starting hangar~~ **Decided:** four landing pads from the start. The game
   currently starts with capacity 2 and one spare berth, so this is a code change.
4. ~~**Resources.**~~ **Decided:** add Materials and Fuel, both used lightly (Fuel per ship
   mission; Materials for construction and upgrades).
5. ~~**Galaxy scale.**~~ **Decided:** keep the current worlds and give each 2–4 regions; two
   or three are liberation-ready in Level 1.
6. ~~**Liberation rule.**~~ **Decided:** missions add liberation %, capped by the lower of
   Access and Support.
7. **Remaining:** the doc conflicts listed under *Doc issues* need your call, but they
   don't block Phase 1.

Decisions are recorded in `docs/GDD.md` §8. **Phase 0 is complete; Phase 1 is next.**

### Progress to Level 2 (design, decided)
There are no hard gates and no set-piece exit. The meter fills from missions across
**multiple locations**, which is the biggest lever, plus liberation, support and some
narrative events. The design predicts that by the time it fills, the player has:
1. been active in several locations and their sources,
2. expanded the base a fair amount and used the new mechanics,
3. a decent roster,
4. several ships,
5. liberated a region or two within a location, though not necessarily a whole location.

Implementation approach: a single Rev progress meter fed by weighted contributions
(missions completed per location, region liberation, support, source levels, story
events). The five predictions above are **tuning targets**, not checks. A playtest
should reach the escalation animation with roughly that profile, and the design should
not require it. Missions in a *new* location should count for more than repeats in the
same one, to push the player to spread out. The current `G.renown` (which counts sources
and a few missions) is the seed of this.

### Phase 1 — Location model (the spine of the doc set) — **built**
Implemented in `game/js/base.js`: Security / Access / Support / Liberation, three new
liberation-ready worlds (Menk, Ballakan, Parity IV), region liberation with the
lower-of-Access-and-Support cap, the location briefing popup, Access raising, the progress
meter and escalation animation, and a source for each new world. Liberation-world
"local ops" are abstract placeholders for Phase 3. Materials and Fuel were *not* added
in this pass; they move to the start of Phase 2/3. Numbers are starting values to playtest.
Original scope:
- Per-location **Security / Access / Support / Liberation**, with regions and
  settlements inside each location.
- Galaxy inspector shows helmets, eyes, flags and a liberation wheel; regions are
  colour-coded (Hegemony / contested / revolution).
- First-visit **cinematic briefing** popup (Helva-2 is the template).
- Effects wired in: Security scales enemy count/toughness and source risk; Access gates
  rarer sources and Opportunities; Support gates liberation progress.
- Liberation feeds the Revolution Level meter. Add the **Level 1 → 2 progress meter**
  (see *Progress to Level 2*) and the **escalation animation** that plays when it fills.
  Rev Level 2 content itself stays out of scope, so the animation lands on a
  "Level 2 — coming soon" state.
- Add **Materials** and **Fuel** to the resource model. Fuel is consumed by ship missions.
  *(Not yet built.)*

### Phase 2 — Mission framework — **built** (Directives skipped: WIP in the docs)
Built: mission types with requirements and objectives, the briefing/planning board with
team, transport, pilot and ship slots (click or drag), Fuel and Materials, the four-pad hangar,
the arrival cinematic, reward screen and automatic source call-back, and Opportunities
(Access 2+, staffed Comms Array, persistent map markers). See `docs/GDD.md` §8.
Original scope:
- Data-driven **mission type + narrative wrapper**, so a designer can chain missions
  under a Source. This is the docs' central authoring idea.
- Planning window: **Team + Assets + transport slot**, click or drag from the roster,
  with capacity checks. Extends the existing Pre Conditions UI.
- Mission flow: source contact → briefing → play → extract cinematic → return
  cinematic → reward screen → automatic source follow-up window.
- **Directives** (e.g. "Liberate [Location]") and **Opportunities** (Access 2+, generated
  from the player's own infiltration, with a map marker that stays afterwards).

### Phase 3 — Tier 1 mission content — **in progress** (Steal Fuel built)
Built: **Steal Fuel** (call-in transport, timed defend, extraction at the landed transport).
Still to do: Rescue Dissident, Blow Up Auto Factory, Steal Intelligence, Steal the Strider.
Original scope:
Each mission needs new ground objective types, so build the objectives first:
- **Steal Fuel** — reach depot, call in a transport, defend it for 5 rounds. Needs
  *call-in transport* and *timed defend*.
- **Rescue Dissident** — release a prisoner; optional stealth. Rewards a new Support
  recruit. Needs *escort/release NPC*.
- **Blow Up Auto Factory** — plant charges, detonate from a safe distance. Needs *plant
  and detonate*.
- **Steal Intelligence** — hack the databanks, extract. Needs *hack terminal*.
  **Decided:** the mission can appear on the board but cannot be completed until a
  soldier of level 3+ holds the **Field Technician** specialty. If the player tries
  without one, show: *"Missing Field Technician: train a soldier to level 3 and use the
  Training Center to give them the Field Technician specialty to attempt this
  mission."* This adds a soft gate to the preconditions UI and makes the Training Center
  and specialties **in scope** for Level 1 (see Phase 5).
- **Steal the Strider** — the existing locked mission, and a good Level 1 capstone
  candidate. Infiltrate the warehouse, then guide the mech out.

### Phase 4 — Rev 1 enemy roster and combat additions
- **Enemies:** Policebot, Patrolman, Riot Shieldman (frontal immunity), Riot Rifleman,
  Riot Bruiser, police cruisers (three variants), Strider Mk I. Space: Drone Monitor,
  Pursuer, Mag-Clamper, VC Mote Patrolcraft. Security rating scales spawns.
- **Hacking Autos:** a hacked Auto fights for you and joins the roster if it extracts.
  This needs hacking gear.
- **Fire support menu:** *Supply Drop* (40 supplies: 5 stims, 2 grenades, 2 rocket
  launchers) and *Reinforcements* (second transport) are cheapest and fit Level 1.
  *Door Gunner* needs a gunship-type asset. *Strafing Run* needs a starfighter, so it
  is a stretch goal.

### Phase 5 — Base
- Turn the fixed room list into the docs' model: adjacent rooms **merge into one bigger
  room**, and rooms take **upgrades**.
- Rename or split **Comms Array** into the **Intelligence Center** (adjacent rooms add
  source slots) and add the **Diplomatic Quarter** (Chief Diplomat tasks feed Support).
- Barracks (Garrison Officer, Bunks, Quarters), Hangar (Flight Deck Officer, Refuelling
  Station, Maintenance upgrades, *Restore Broken Ship* task), Infirmary, Storeroom.
- **Gear grid** replacing the flat armory list.
- **Training Center and Specialties (now in scope).** Soldiers train at the practice
  range, pilots at the flight simulator, and Support in the classroom. At level 3 a rebel
  can take a specialty, which takes days and gives a title plus abilities. Level 1 needs
  at least **Field Technician**; the rest of the soldier list (Gunner, Commando, Assault,
  Combat Medic, Demolitions Specialist, Marksman, Commander, Vanguard, Driver) can ship in
  stages.
- **Starting hangar:** change to four landing pads to match the docs, and rebalance
  the onboarding around it (the derelict Marta no longer fills the only spare berth).

### Phase 6 — Sources as quest chains
- Add a **location-tied** field to sources, and an authoring format for
  unique, multi-mission sources.
- Build one full Level 1 chain using the Kaver structure: contact → delayed decode
  (3 days) → branching choice → three missions → next check-in. Set it on a Level 1 world.
- Add missing source types (Double Agent, CEO, Professor, Engineer).

### Phase 7 — Level 1 capstone, balance, polish
- Playtest the whole arc from Take the Rock to the escalation animation; tune the economy
  and the progress-meter weights so a typical run lands near the five predicted markers.
- Update the README and GDD copy.

## Suggested order
Phase 0 → 1 → 2 in sequence, then Phases 3 and 4 in parallel, then 5, 6 and 7.
Phase 1 needs the most design work, but everything else builds on it.

## Out of scope (Rev 2+ per the docs)
Alerts, Heroes, Bureau disguise/coordination, Marines and boarding, Tier 2 missions,
mass and fleet combat, capital ships, Levels 2–5. The Tier 2 enemy roster and the
Kaver example (written as a Level 3 story) are reference only.

## Doc issues to resolve
- The Base doc's dev note says scope is "Rev levels 1 and 2". The current scope is
  Level 1 only.
- The README's reduced day one (capacity 2, one spare berth) contradicts the docs. **The
  docs are right:** four landing pads.
- The Base doc lists **Fuel** twice; the second is meant to be **Intel**.
- The Enemies doc lists Frontier Sheriff/Deputy/Shorto Shotty/Tavern Scum under Rev Tier 3,
  but Dustfall (Rev 1) already uses them. It also lists Bureau Officer under Tier 1 and
  again under Tier 2 with Disguise.
- The Missions doc's tier names are cut off mid-sentence, and Tier 1 rewards are blank
  for several missions.
- "Imperium" vs. "Hegemony" (older GDD copy in `docs/GDD.md`).
- Specialties, Locations Regions and Fleet Combat docs contain empty or half-finished
  sections.
