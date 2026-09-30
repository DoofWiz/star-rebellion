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
1. **Level 1 exit.** What ends Level 1: a scripted set piece, or a renown/liberation
   threshold? Today renown ≥ 100 only prints a "future build" message.
2. **Intel semantics.** The docs now define Intel as the currency that buys Access, and
   also as early warning. Confirm scouting stays a spend. Alerts (the warning consumer)
   are Rev 2, so the warning role can wait.
3. **Reconcile doc conflicts** (see *Doc issues*).

### Phase 1 — Location model (the spine of the doc set)
- Per-location **Security / Access / Support / Liberation**, with regions and
  settlements inside each location.
- Galaxy inspector shows helmets, eyes, flags and a liberation wheel; regions are
  colour-coded (Hegemony / contested / revolution).
- First-visit **cinematic briefing** popup (Helva-2 is the template).
- Effects wired in: Security scales enemy count/toughness and source risk; Access gates
  rarer sources and Opportunities; Support gates liberation progress.
- Liberation feeds the Revolution Level meter. Add the **Level 1 → 2 progress meter** and
  the level-complete screen from Phase 0.
- Add **Materials** and **Fuel** to the resource model. Fuel is consumed by ship missions.

### Phase 2 — Mission framework
- Data-driven **mission type + narrative wrapper**, so a designer can chain missions
  under a Source. This is the docs' central authoring idea.
- Planning window: **Team + Assets + transport slot**, click or drag from the roster,
  with capacity checks. Extends the existing Pre Conditions UI.
- Mission flow: source contact → briefing → play → extract cinematic → return
  cinematic → reward screen → automatic source follow-up window.
- **Directives** (e.g. "Liberate [Location]") and **Opportunities** (Access 2+, generated
  from the player's own infiltration, with a map marker that stays afterwards).

### Phase 3 — Tier 1 mission content
Each mission needs new ground objective types, so build the objectives first:
- **Steal Fuel** — reach depot, call in a transport, defend it for 5 rounds. Needs
  *call-in transport* and *timed defend*.
- **Rescue Dissident** — release a prisoner; optional stealth. Rewards a new Support
  recruit. Needs *escort/release NPC*.
- **Blow Up Auto Factory** — plant charges, detonate from a safe distance. Needs *plant
  and detonate*.
- **Steal Intelligence** — hack the databanks, extract. Needs *hack terminal*. The docs
  require a Field Technician, but Specialties unlock at level 3, so decide whether
  that gate applies in Level 1.
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
- **Stretch:** Training Center specialisations (level 3+). It is unclear whether any
  rebel reaches level 3 inside Level 1.

### Phase 6 — Sources as quest chains
- Add a **location-tied** field to sources, and an authoring format for
  unique, multi-mission sources.
- Build one full Level 1 chain using the Kaver structure: contact → delayed decode
  (3 days) → branching choice → three missions → next check-in. Set it on a Level 1 world.
- Add missing source types (Double Agent, CEO, Professor, Engineer).

### Phase 7 — Level 1 capstone, balance, polish
- Playtest the whole arc from Take the Rock to the Level 1 exit; tune economy against the
  new resources.
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
- The Base doc says the player starts with a **4-room hangar**, and the README's day one
  is one spare berth. Which is intended?
- The Base doc lists **Fuel** twice; the second is meant to be **Intel**.
- The Enemies doc lists Frontier Sheriff/Deputy/Shorto Shotty/Tavern Scum under Rev Tier 3,
  but Dustfall (Rev 1) already uses them. It also lists Bureau Officer under Tier 1 and
  again under Tier 2 with Disguise.
- The Missions doc's tier names are cut off mid-sentence, and Tier 1 rewards are blank
  for several missions.
- "Imperium" vs. "Hegemony" (older GDD copy in `docs/GDD.md`).
- Specialties, Locations Regions and Fleet Combat docs contain empty or half-finished
  sections.
