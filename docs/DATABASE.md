# Game database

The data the game systems draw from (ships, ship weapons, personal kit, ground enemies, pilots and the numbers that tie
them together).
The design docs linked from [GDriveMasterSheet](GDriveMasterSheet) are the source of truth for what
the numbers should be. `game/data/db.json` is the machine-readable copy of them.

**Status: the game reads it.** `game/js/data.js` loads `game/data/db.js` (the same data as a script, so it works
over `file://`) and the space and base scenes build their ship, weapon and fuel tables from it. Personal kit goes
through `game/js/items.js`: the base's `KIT` and the ground scene's `WPN` (with its damage types, one-handed list and
icons) are built from the `items` table. The old hand-written tables (`CLS`/`WPN` in `space.js`,
`FUEL_COST`/`SHIPSTATS`/`KIT`/`GEAR_ICON` in `base.js`, `WPN`/`WDAM`/`WICON` in `ground.js`) are gone.

## Files

| File | What it is |
|---|---|
| `game/data/db.json` | The database. One row per line so diffs stay readable. |
| `game/data/db.js` | Generated copy of `db.json` that the page loads. `build.py validate` fails if it is stale. |
| `game/js/data.js` | `SRDB`: lookups by id or legacy key, plus base TN, skill bonus and movement dial. |
| `game/js/items.js` | `Items`: the items table for the scenes (`get`, `name`, `kit`, `wpn`, `pool`, `roll`, `grant`, `take`). |
| `game/js/enemies.js` | `Enemies`: the enemy roster (`get`, `owned`, `spawn`, `kit`, `vehicles`, `seats`). Every ground enemy spawn goes through `spawn`. |
| `tools/db/build.py` | Validate, report, and convert to and from a spreadsheet. |
| `tools/space-smoke.js` | Headless test: plays the space scene (`instructor`, `depot`, `flight`, `loadouts`) and reports errors. |
| `tools/items-smoke.js` | Headless test: the items table, `Items`, and every scene table, loot crate and enemy weapon built from it. |
| `tools/enemies-smoke.js` | Headless test: the roster, every enemy spawn, what they hold, wear and drop, and hacked Autos. |

## Editing in Google Sheets

```
python3 tools/db/build.py export-xlsx star-rebellion-db.xlsx   # needs: pip install openpyxl
# upload to Google Drive, open as a Google Sheet, edit, File > Download > .xlsx
python3 tools/db/build.py import-xlsx star-rebellion-db.xlsx --dry-run   # shows what would change
python3 tools/db/build.py import-xlsx star-rebellion-db.xlsx   # also regenerates game/data/db.js
```

After editing `db.json` by hand, run `python3 tools/db/build.py export-js` to refresh `db.js`.

Import refuses to write anything if a cell is the wrong type or the data breaks a rule
(unknown weapon id, min speed above max, too many default weapons for the slots, and so on) and names
the cell. Columns marked `(auto)` are formulas for reading only and are ignored on import.
`python3 tools/db/build.py validate` and `report` work on `db.json` directly.

## Tables

| Table | Holds |
|---|---|
| `ships` | Starships, drones (no pilot) and structures (never move). Stock model stats only. |
| `weapons` | Every ship weapon. Any weapon fits any slot. Ammo and damage live here, not on the ship. |
| `items` | Personal kit (weapons, armour, gadgets, other) and the built-in weapons of units and vehicles. |
| `enemies` | The ground enemy roster: people, robots and vehicles; faction, tier, stats, and what each type carries (item ids). |
| `vehicle_seats` | Each vehicle's seats: who drives, which gun the seat fires, whether it is enclosed. |
| `space_enemies` | The space roster: which ship and pilot each enemy type flies with, and how it behaves. |
| `market_weights` | How likely each kind of Black Market lot is (weapon, gadget, mercenary, armour, ship weapon, vehicle, ship), one row per Revolution Level it applies from. |
| `pilots` | Level, XP, initiative (1 to 6), the four skills, rebel trait keys, and a rank title for Hegemony pilots. Drones carry a built-in "core" pilot. |
| `starting_fleet` | Individual ships the player begins with: a stock model plus what is loaded in it. |
| `size_scale` | Sizes 1 to 20 (human to super carrier). Capital ships start above size 8. |
| `manufacturers` | Lore list from the Gear doc. |
| `rules` | Shared numbers the formulas use. |

IDs are generated slugs (`ft-4-cross`). They are for the database only; players never see them.
Each ship and weapon keeps a `legacy_keys` value (`viper`, `plasma`, ...) so old and new data can be matched.

## Movement profile

`straight_max`/`straight_min`, `bank_max`/`bank_min`, `turn_max`/`turn_min`. "4-1 straight" means any speed from 1 to 4.
Equal max and min means that is the only speed. Both blank means the ship cannot make that move.
Left and right are always the same.

## Target number and skills

```
base TN      = max(tn_floor, tn_base - ceil(size / tn_size_divisor))            (12, 2, floor 2)
skill bonus  = floor(skill / skill_per_bonus) + floor(level / level_per_bonus)  (10, 5)
TN vs a pilot = base TN + the pilot's Focus bonus      (range, cover, evasive moves are added in game)
to-hit bonus  = the pilot's Aim bonus, same formula
```

The skill-bonus formula is a proposal, not yet in the Rebels & Recruits doc. Initiative comes from the pilot, not
the ship, and traits or morale may push the effective value outside 1 to 6.

## What the game takes from it

- **Ships:** stats, size (draw scale is `0.7 + 0.09 x size`), movement dial, default weapons, fuel per sortie, passenger
  seats and gunner positions. Classes keep their old keys (`viper`, `talon`...) so drawing code and mission data still
  line up; `CLS[key].id` is the database id.
- **Movement:** engine damage and mag-clamps lower top speed but never below the slowest straight move. A bank or turn
  whose slowest speed is above the cap drops off the dial, so a Cross with three engine hits can only fly straight at 1.
- **Weapons:** each ship has slots `w0`, `w1`; any weapon fits any slot. Damage, ammo, range, accuracy, crit, shield
  bypass and lock all come from the weapon. A ship's loadout is part of the ship, not the model:
  `G.fighters[i].loadout` lists weapon ids (stock defaults, or the `starting_fleet` entry for named ships such as Dustfall and Marta).
- **Pilot traits and ranks:** a row's `traits` are the rebels' own trait keys (`lucky`, `veteran`, a pair trait with its
  partner's row: `friends:joss-marrek`), and they do in space exactly what their dossier cards say. Rebels' ranks come
  from the rebel ladder; a Hegemony pilot's from the row's `rank` (Commandant, Cadet, Patrol Officer).
- **Pilots:** initiative, level and skills. The scripted cast (Sera, Joss) is built from the `pilots` table through the
  normal rebel path (`Rebel.scripted`). Campaign rebels' skills live on the rebel and are carried to the database's
  0 to 50 scale at the base/space boundary (`Rebel.dbSkill`); everyone without a row gets a random initiative 1 to 6,
  saved on the pilot. (The space scene's `mkPilot` still accepts the old `aim x 10` shape for its own fixtures.)
- **Target number:** `base TN + Focus bonus`, shown in the engagement panel as `SIZE n HULL` and `PILOT FOCUS`.
- **Door Gunner Support:** needs a ship with a gunner position carrying a weapon whose `fire_support` is `door_gunner`.
  Reinforcements land up to the transport's `extra_people` seats; filling them is optional.

## Items

One row per item. Ids are the short keys saves already use (`akli`, `blam`, `charge`); there is no `legacy_keys`
column, so do not rename an id once a save may hold it.

- **Owned kit** (`weapon`, `armour`, `gadget`, `other`): slot, Storeroom footprint (`width` x `height`), auto-equip
  `quality`, maker, origin, Black Market `price` and `rev`, and the flags `live` (FALSE: no rules yet, so never sold
  and never carried), `hegemony` (loot only) and `drop_only`. The Arsenal shows `description`.
- **Built-in weapons** (`builtin`): fists, bare hands, vehicle guns, turrets. They have stats but are never owned.
- **Armour and shields** (Ground Combat doc): `armour` on an armour item is the armour bar it adds over the
  wearer's health in ground and boarding combat; blank is cosmetic (the Cowboy Hat, the Baseball Cap). `shield`
  is the shield bar a source raises when activated (none at Level 1). A hit drains shield, then armour, then
  health; what a broken bar cannot hold spills through. `Items.protection(ids)` adds up worn kit.
- **Weapon traits** (Gear doc): `fire_modes` (`auto|semi|single|fan`, in the doc's order; a weapon starts on the
  first one with no penalty and the player toggles in the attack window), `steady` (+2 when braced or on a target
  held fire on), `knockback`, `stunning`, `unstable`, `sundering` (damage to an armour bar ×`armour_sunder_mult`),
  `piercing` (`armour_pierce_frac` of each hit skips the armour), `heavy` and `deployable`. Heavy kit and deployables
  go in the `back` slot and are set up with the Deploy order (the Razorrat, the Riot Shield; a riot shield soaks
  `riot_shield_hp` from the front before it breaks). `Items.traits(id)` lists what an item shows, for the art kit's
  trait icons.
- **Weapon stats** are all-or-nothing: `damage_min`/`damage_max`, `range`, `attack`, `shots`, `damage_type`, plus
  `one_handed`, `jams`, `pellets`, `falloff` and `beam`. A live weapon must have them.
- **Getting kit:** `Items.grant(armory, id, n, src)` is the only way into an armory (`grantItem` in `base.js` wraps it
  and re-runs auto-equip). It refuses unknown ids and built-ins, so a typo fails loudly. Loot crates, enemy drops,
  chain gifts and the smuggler bonus all pass ids. `src` (`start`, `looted`, `bought`, `made`, `gift`) is saved on the
  stack and drives the Arsenal's provenance tag.
- **Drawing at random:** `Items.pool(filter)` and `Items.roll(filter, rng, weight)` filter by `cat`, `slot`, `heg`,
  `dropOnly`, `origin`, `maker`, `maxRev`, `sold` and `live`. The Black Market roll is the only caller today; loot
  that rolls waits on DESIGN_BLOCKERS M-24.

Still in code: the gadget stat rows on the market (`BM_GSTATS`), the
briefing chips in `core.js`, and the art kit's own item keys (`blam` draws as `frags`, `charge` as `c90`).

## Enemies

One row per enemy type, from the Enemies doc (Hegemony and Outworlder factions) plus the types the game needed
first (`in_doc` FALSE). A row holds stats (`hp`, `aim`, `def`, `cool`, and innate `armour` and `shield`: a vehicle's
or Bot's plating lives here, kept apart from ship armour; a person's armour comes from the kit they wear), what the type carries (`weapon_1`,
`weapon_2`, `head`, `body`, `gadget`: item ids), robot rules (`kind`, `owned_as`, `hack_rounds`, `heavy`, `big`, `speed`),
whether it leads (`leader`), the credits on the body and what the art kit draws (an archetype, or a vehicle).
`kind` is `person`, `auto` (a robot that fights like a person), `bot` (a robot vehicle that drives itself, like the
Strider) or `vehicle` (needs crew). Bots and vehicles have a `speed`. Robots and vehicles have `owned_as`: the key a
hacked or stolen one has at base (`G.vehicles[i].type`, a hacked Auto's `p.auto`).

- **Spawning:** every enemy in `ground.js` is `foe('type', {placement})`: id, name, position, patrol, lines. A spawn
  may override stats or `wpns` for that one enemy (Dep. Pell carries a carbine; the tower lookouts carry hunting
  rifles and have sniper stats), and nothing else differs from the row.
- **Fighting:** they draw `weapon_1`, and also carry `weapon_2`. Kit with no combat stats (a baton, a riot shield)
  is carried but never fired; carrying a riot shield is what gives the frontal shield.
- **Dropping:** a downed enemy leaves every usable (`live`) item it carried, at the `enemy_drop_chance` rule (1 =
  always), plus a credit roll between `credits_min` and `credits_max`. Built-in weapons never drop.
- **Looks:** the `art` archetype, wearing the drawable part of the kit (police vest, riot shield).
- **Hacked Autos** that join the rebellion keep their row's stats and weapon (`AUTOS` in `base.js` reads them).
- **Vehicles** (the three cruisers) are rows too, spawned the same way: `foe('police-cruiser', {id, x, y, patrol,
  crew:[foe('security-patrolman', {seat:'drv', ...})]})`. They carry no kit; their guns are on their seats in the
  `vehicle_seats` table (one row per seat, in order: exactly one `drives`; `enclosed` FALSE is an exposed seat such as
  a turret, which the art raises when it fires). The ground scene's `VEHDEF` and the base's `GVEH` (owned vehicles
  and Bots) are both built from these rows, so an owned cruiser or Strider has exactly the enemy one's numbers.

## Space enemies

The space half of the roster (the Space Enemies tab). A row names the `ship` it flies and the `pilot` flying it
(drones and the Fuel Depot use a built-in core pilot), plus what the code used to hard-wire by ship id or class:

- `maneuvers`: `loop` and `broll` (Commandant Vex flies both).
- `lead`: the mark. It flies with the instructor's AI, and the rest of the line-up breaks when it falls.
- `flees`: jumps out of the sector once it panics near the edge (the cadets).
- `calls`: the type it calls in once it spots a rebel ship (a Drone Monitor calls a Drone Pursuer).
- `clamps`: fires mag-clamps (the Drone Mag-Clamper).
- `nerve_cap`: their nerve never rises above it (the Academy Cadets: 60).
- `age` and `bio`: the dossier's defaults.

The line-ups themselves (`LINEUPS` in `space.js`) are lists of `[id, callsign, type, x, y, heading, extras]`; the
extras are one enemy's own (each cadet names their own pilot row, Vex his voice and bio). The depot patrol
(`DEPOT_PATROL`: a VC Mote and a Mag-Clamper on round 5) names types the same way. How many cadets fly scales with
the rebel flight in code.

## Still in code, because the database has no column for them

The numbers behind the Drone Monitor's call (900 range) and the Mag-Clamper's clamp (range 650, speed -2 for two
rounds) in `space.js`, the critical-hit table,
and the Door Gunner and Strafing Run numbers in `ground.js` (the `door-mounted-gun` row only decides who can fly it).

## Seed data to review

Rows whose Notes say *seed*, *placeholder* or *converted* came from the old game values rather than a design doc:
the drones and Fuel Depot (not in the Gear doc), the drone weapons, every pilot's skills, and the Pilots'
initiative values.

## Not in the database yet

Ship attachments (Hard Points are stored; the items that use them are not), ship Utilities (activated abilities),
capital ship weapons and attachments, and vehicle attachments (the Floatin' Truck's).

## Market weights

One row per Revolution Level it applies from; the Black Market uses the highest row at or below the current level
(`marketWeights` in `base.js`). Only Level 1 has a row (the Market/Arsenal handoff's weights); Level 2 and up wait on
DESIGN_BLOCKERS M-18.
