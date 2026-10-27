# The ships database, reviewed for Type 3.5

**For:** the designer. **Written:** 21 October 2026, building S2 of `docs/MAIN-SWITCH-HANDOFF.md` (decision 8: "the new space
gameplay may make some stats redundant").

**Nothing has been removed.** This is a recommendation for each stat. You decide; I act after you've read it.

> **Since 27 October (C-90 item 4, the designer):** weapons go in **mounts** and attachments use up **hardpoints**, both
> plain counts. `weapon_slots` is now `mounts` (any weapon in any mount); `hard_points` is now `hardpoints`, the count,
> and S2's typed `hardpoints` (primary, secondary, pylon, internal) is gone; each attachment's `hardpoints` says how many it
> uses (Bombs 1, Cargo pods 1, Boarding party 1 with passenger room, Boarding pod 2: placeholders); a weapon has no slot.
> A configuration is a plain list, `bls-t-light-repeaters|bombs|bombs`. The S2 tables below are kept as they were.

**What reads the database today:**
- **The old space combat** (`space.js`, live until S11).
- **Type 3.5:** High Command's sim, `sim-hc.js`, with the 3.5 layer `sim-hc35.js`.
- **The campaign:** the hangar, the Arsenal and the Black Market in `base.js`.
- **Ground combat** (`ground.js`) reads a ship's name and size only.

---

## 1. What S2 added

| Added | Where | What it is |
|---|---|---|
| `hardpoints` | Ships | Counts by type, `primary:1\|secondary:1\|pylon:4\|internal:0`. **Weapons** go on primary (guns) or secondary (missiles); **attachments** go on a pylon (outside the hull) or internal (inside: needs passenger room). The weapon mounts always equal `weapon_slots` (`build.py validate` checks it) |
| `config` | Ships, Starting Fleet, Space Enemies | What is fitted where, `primary:bls-t-light-repeaters\|pylon:bombs`. A ship row's is the stock ship. A starting-fleet entry or an enemy type can have its own: Dustfall comes with missiles (decision 9), and a Pirate Cross is fitted unlike a stock one. Checked against the hardpoints |
| `ownable` | Ships | TRUE if the player can own one. TRUE for the Cross, Talon, Graf and Brickbat; the FL-400 waits for the Fleet feature (M-40) |
| `slot` | Weapons | `primary` or `secondary`: the missiles are secondary, everything else primary |
| The **Attachments** table | new | Bombs (pylon; the Graf and the Brickbat only: its `ships` column), Cargo pods (pylon, carry 2 containers), Boarding party (internal, needs passenger room), Boarding pod (pylon: lets a ship with no passenger room board) |
| **BX-17 Brickbat** | Ships | From Type 3.5's `HC35_CLASSES`: CORE Assembly (a new manufacturer row), size 6 (a small pad), 1 gun, 2 pylons (stock: two bomb racks), no passenger room (your answer: it boards with a boarding pod). Buyable at the Black Market (2,400 credits, a placeholder) and stealable (a Source's Steal Ship offer can name it) |
| **GA FL-400 Fleet Freighter** | Ships | From `HC35_CLASSES`: General Astronautics, size 10 (no pad fits her), no weapons or hardpoints (her point defence is 3.5's own). Not ownable |
| **Pirate Cross** | Space Enemies | A placeholder showing an enemy fitted unlike the stock Cross: missiles and cargo pods. No mission flies it yet |

**The hardpoint counts are placeholders** (C-91), derived from columns you already had:
- the weapon mounts split `weapon_slots` into one primary, plus one secondary where the art has a missile mount (the
  Cross, Talon, Scimitar and Graf);
- the pylons are `hard_points`;
- `internal` is 1 where `extra_people` is above 0 (the Graf; the Brickbat has none, your answer).

| Ship | Primary | Secondary | Pylon | Internal | Stock configuration |
|---|---|---|---|---|---|
| FT-4 Cross | 1 | 1 | 4 | 0 | the repeaters (no missiles: decision 9) |
| SF-11 Talon | 1 | 1 | 2 | 0 | the repeaters |
| VC Mote | 1 | 0 | 2 | 0 | the repeaters |
| VT-2 Fledgling | 1 | 0 | 2 | 0 | the repeaters |
| VK-3 Scimitar | 1 | 1 | 3 | 0 | the repeaters, missiles |
| Graf Hauler | 1 | 1 | 5 | 1 | nothing (the Marta has her door gun) |
| BX-17 Brickbat | 1 | 0 | 2 | 0 | the repeaters, two bomb racks |
| GA FL-400 | 0 | 0 | 0 | 0 | nothing |
| The four drones | 1 | 0 | 0 | 0 | their emitter or cannon |
| Fuel depot | 0 | 0 | 0 | 0 | nothing |

**Your answers (C-89, resolved):** bombs go on the Graf and the Brickbat only, so the Cross's 4 pylons take cargo
pods and a boarding pod. The Brickbat has no passenger room: it boards with a boarding pod and carries no troops.
Refit (S4) fits all of these on the hardpoints.

---

## 2. Every ship stat: who reads it, and what to do with it

The **space.js** column falls away at S11.

| Stat | space.js | Type 3.5 | Campaign | Recommendation |
|---|---|---|---|---|
| `id`, `name`, `legacy_keys` | yes | yes | yes | **Keep.** `legacy_keys` can retire once the code uses ids, after S11 |
| `kind` (starship, drone, structure) | yes | yes | yes | **Keep** |
| `manufacturer` | no | no (display only) | yes (the Arsenal, the market) | **Keep** |
| `role` | yes (the plate) | yes (labels) | yes (`isHauler` tests `'Light Hauler'`) | **Keep.** `isHauler` should test `extra_people` or `ownable`, not the role's wording |
| `size` | yes (to-hit, drawing) | yes (hit box, drawing, collision mass) | yes (pads) | **Keep.** 3.5 also scales art by `0.7 + 0.09 × size` in several places (`docs/CLEANUP-REPORT.md` §3.2) |
| `straight_max` | yes (the dial) | yes (top speed) | yes (the market's Speed) | **Keep; change its meaning to top speed.** In 3.5 it sets the top speed; in the dial, the fastest straight move |
| `straight_min` | yes | yes (the slowest flying speed) | no | **Keep; change its meaning to the slowest speed.** The FL-400 needs 0.2, which the int column can't hold, so 3.5 keeps hers over the row |
| `bank_max`, `turn_max` | yes (the dial) | **no** | no | **Retire after S11.** 3.5 turns by a corner-speed model, not by maneuver templates |
| `bank_min`, `turn_min` | yes (the dial) | yes (they set how tight it turns: `kappaOf`) | no | **Change their meaning.** Replace them with one "agility" number after S11 (3.5 also multiplies the Cross's by 1.6: `HC_TURN`) |
| `shield_front`, `shield_rear` | yes | yes (two shield zones) | yes (display) | **Keep** |
| `armour`, `hull` | yes | yes | yes | **Keep** |
| `weapon_slots` | yes | yes (a cap on weapons) | no (Refit uses `hardpoints` since S4) | **Retire after S11.** It duplicates the primary and secondary counts |
| `hard_points` | no | no | no | **Retire now or after S4.** Nothing reads it; `hardpoints`' pylon count replaced it |
| `default_weapon_1`, `default_weapon_2` | yes | the fallback for a ship with no configuration | no (the stock `config` since S2) | **Retire after S11.** `config` holds the same (`build.py` could check they agree until then) |
| `extra_people` | copied, never read | no | yes (troop seats) | **Keep.** It is the passenger room a boarding party needs |
| `gunner_positions` | no | no | yes (the Door Gunner) | **Keep** for ground fire support. Could become a hardpoint type later |
| `supply_drop` | no | no | yes | **Keep** (ground) |
| `fuel_per_sortie` | no | no | yes | **Keep.** S8 pays it for the wings that fly |
| `special_rules` | the weapon's, not the ship's | no | no | **Retire or use.** The drone and depot behaviours it describes are hard-coded |
| `description` | no | no | no | **Show it** (the Arsenal's ship card or the planning windows) or retire it. `build.py` says "shown to the player"; it isn't |
| `notes` | | | | Designer-only |

**Data that 3.5 keeps outside the database** (decide whether each joins it):
- **`HC35_CLASSES.fl400`:** her pace (`straight_min 0.2`, no dial), `hitK` (her hit box is longer than her size
  class) and `capital`. Recommendation: columns for `hit_scale` and `capital` once a second capital ship arrives.
- **`HC_TURN`** (the Cross turns × 1.6 in 3.5) and **`TURN_BLEED`**. Recommendation: an agility column (above).
- **`PLASMA_ON`:** 3.5 swaps the Talon's repeaters and the Pursuer's cannon for plasma weapons that aren't in the
  Weapons table. Recommendation: add them as weapons, and give the 3.5 demo's Talons their own configurations.
- **The FL-400's point-defence turrets and cargo modules** (`sim-hc35.js`). Recommendation: a capital-ship turret
  hardpoint type when the Fleet feature is designed (M-40).
- **`HC_LOADOUT` is gone** (S2). The Crosses that carried missiles carry them in their own configuration (the 3.5
  demo's wings, the Type 3 fixtures).

**The weapons:**
- `accuracy_mod` is read by `space.js` only. High Command's `wdefOf` drops it, so it does nothing in 3.5. Decide
  whether 3.5 uses it, or retire it after S11.
- `range`, `damage_min`/`damage_max`, `ammo`, `crit_chance`, `bypasses_shields` and `needs_lock` are read by both
  combats. **Keep them.**
- `fire_support` belongs to ground missions. **Keep it.**
