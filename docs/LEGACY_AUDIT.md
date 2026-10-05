# Legacy vs current: a sweep of the codebase

**Date:** 2026-10-05 · **Scope:** everything under `game/`, `tools/`, `docs/` and the repo root · **Code changed:** none.
All 18 `tools/*-smoke.js` and `python3 tools/db/build.py validate` pass at the time of writing.

This is a map of where the game still runs on scrappy-prototype patterns (hand-written tables, duplicated
definitions, one-off grants, old save shapes) next to the newer systems that are meant to own the same job. Each
section says what is **current** (the system that should own the job), what is **legacy or parallel** (things
that bypass it), and what it would take to fold the legacy part in. Questions that need a designer's call are
logged in `docs/DESIGN_BLOCKERS.md` (C-19 to C-23, M-24) rather than repeated here.

Line numbers are as of commit `9a9c91c`.

---

## 0. The short version

| Area | Current owner | Still legacy / parallel | Health |
|---|---|---|---|
| **Personal gear** | `KIT` in `base.js` (ownership, slots, prices, market) | Combat stats in ground `WPN`, art in `sr-art.js`, icons, briefing chips and loot all keyed by loose strings; grants by hard-coded id or display name; no item database | 🔴 fragmented |
| **Ships and ship weapons** | `db.json` → `SRDB` → `CLS`/`WDEF` | Legacy class keys (`viper` vs `cross`), behaviours, crit table, enemy line-ups, Door Gunner and Strafing Run numbers, the art kit's own ship catalogue | 🟡 mostly done |
| **Ground units** (enemies, vehicles, Bots, Autos) | none | Every enemy written inline per scenario; vehicles, Bots and Autos defined twice (base and ground), with disagreeing Strider numbers | 🔴 no owner |
| **Rebels** (XP, skills, traits, morale) | `Rebel` (`rebel.js`, `rebel-exp.js`, `rebel-injury.js`) | Injury recovery runs two models at once; space keeps its own trait, rank and nerve logic; two debrief paths skip the new systems | 🟡 mostly done |
| **Missions** | Playable missions (`m.lead`) + `applyDebrief` | "Send a team" dice resolver still runs the off-screen jobs and skips the rebel systems; retired local ops still wired | 🟡 |
| **Save data** | One key, `restoreCampaign` | Unversioned, flag-based migrations, about half of them for saves that can no longer exist | 🟡 |
| **UI** | `SR_HUD` kit (ground, space) | `base.js` hand-rolls its own windows, comms feed, banner, menu and toasts; 76 inline styles | 🟡 |
| **Repo and docs** | `game/`, `DESIGN_BLOCKERS.md`, `DATABASE.md` | Four root prototype pages, README half about prototypes, several finished handoff docs reading as live | 🟡 |

The biggest lesson from the sweep: **the database pattern worked for ships**. Everything that went through
`db.json` → `SRDB` is consistent. Everything that did not (gear, ground units, enemies) ended up defined two to
five times with drift between copies. The fix is the same shape each time: one table, one accessor, and
everything else keyed off it.

---

## 1. Gear: the worked example

### 1.1 Where an item is defined today

One item, the Akli AR, is described in **seven** places, none generated from the others:

| Table | File | What it holds | Coverage |
|---|---|---|---|
| `KIT` | `game/js/base.js:120` | name, slot, footprint, quality, maker, price, `live`, `heg`, `rev` | 27 items: the nominal catalogue |
| `WPN` (exported as `window.SR_WPN`) | `game/js/ground.js:46` | damage, range, attack, shots, jam, pellets | 6 KIT weapons + 6 non-items (fists, unarmed, vehicle guns, the laser turret) |
| `WDAM`, `ONE_HAND`, `WICON` | `game/js/ground.js:1225`, `:1226`, `:5108` | damage type, one-handed, order icon | weapons only |
| `GEAR_ICON` | `game/js/base.js:4121` | Arsenal icon | all 27 |
| `BM_GSTATS` | `game/js/base.js:5178` | Black Market stat rows for gadgets | 3 gadgets |
| `GEAR` | `game/js/core.js:112` | briefing squad-card chips | 5 weapons + ship-weapon kinds; no rocket |
| `WEAPONS`, `GEAR`, `ITEMS`, `GEAR_ALIAS` | `game/art/sr-art.js:215`, `:290`, `:917`, `:303` | how the item is drawn | different ids: `frags` = `blam`, `c90` = `charge`, `shield` = `riotshield`; no art for four head items |

There are also descriptions, which are in **no** table: they are strings written onto each `G.armory` entry when
it is granted, so the same item reads differently depending on how you got it.

Drift that has already happened:
- **Names:** "Longhorn ’28" (`KIT`, `core.js`) vs "Longhorn ’28 Hunting Rifle" (`WPN`, the save rename at
  `base.js:6442`). The charge is "BLAM C90 Explosive Charge" in `KIT`, "Explosive Charge" on the armory entry,
  `c90` in the art kit.
- **The carbine's damage type:** `WDAM` says ballistic, the bullet drawn at `ground.js:3532` is a plasma bolt,
  and the art kit gives it a plasma muzzle (DESIGN_BLOCKERS C-23).
- **Head items with no art:** Cowboy Hat, Baseball Cap, Police Helmet and Auto Head-Helm can be equipped but draw
  nothing on the rebel.

### 1.2 How gear reaches the player today

| Path | Where | How |
|---|---|---|
| New game | `base.js:229` | Literal armory entries (Akli ×6, Cowboy ×4, Med Pack ×4) with their own names and descriptions; the cast uses the old `equip` field, then `gearFromEquip` |
| Infirmary makes Med Packs | `base.js:1489` | Direct `push` / `n++` with its own description |
| Listening Towers decode choice | `base.js:1139`, `:1233` | `addArmoryItem` by **display name** |
| Ground loot, Haven and other missions | `base.js:6203`, `:6265` | `addArmoryItem` by **display name** from the scenario's `loots` |
| Smuggler trait bonus | `base.js:6270` | 50/50 between two hard-coded display names |
| Unused BLAMs after a mission | `base.js:6275` | Direct arithmetic on the armory count |
| Black Market | `base.js:5255` | `addArmoryItem` by **KIT key** |
| Save migrations | `base.js:6394`, `:6438` | One direct push, one `addArmoryItem` |
| "Send a team" rewards, recruits, Heroes, events | — | Never grant items |

`addArmoryItem` (`base.js:6161`) is the nearest thing to a grant function, but it:
- takes **either** a KIT key or a display name, through its own alias map (three names for the shotgun);
- does not check that the id exists in `KIT`, and slugifies unknown names into new ids;
- writes one of four hard-coded descriptions, so a shotgun looted at Haven Rock reads "Taken off Dustfall’s lawmen";
- is bypassed by four of the paths above.

### 1.3 Your questions, answered

**Can gear be picked up off the ground?** Partly, and only along hard-coded lines:
- Each scenario has fixed loot crates listing display names (`ground.js` `loots:[…]`, e.g. Steal the Cross gives
  "Scattergun" and "Shell box"; Rescue gives a "Peacekeeper Carbine").
- A downed lawman leaves "effects" (`dropLoot`, `ground.js:1471`), but the drop is not what they carried. Sheriffs
  drop a Scattergun, carbine users drop a carbine, and everyone else (all the Cowboy, shotgun and rifle carriers)
  drops credits only. Autos and vehicles drop nothing.
- The Supply Drop hands out rockets, stims and grenades that live only for the mission (rockets vanish when fired).
- The Police Helmet and Police Vest are marked "loot only" in `KIT`, but nothing in the game drops them, and
  enemies never carry the HG-40, Power Baton or Riot Shield. Riot shieldmen carry a Cowboy and a `shield:1` flag.

**Does a database feed gear in every instance?** No. `db.json` has ship weapons only; personal kit is in
`KIT` by design for now (DESIGN_BLOCKERS C-10). Enemies don't draw from `KIT` at all: each foe in each scenario has
a literal `wpns:['cowboy']`, read straight from ground `WPN`.

**Designer-picked vs drawn at random by parameters?** There is exactly **one** parameterised random draw in the
game: the Black Market's weekly roll (`rollMarket`, `base.js:5188`: seeded, weighted by category, filtered by
`live`, Hegemony, revolution level and price). Every other grant is a fixed id or a fixed display name. There is no
"give me a Rev-1 Hegemony sidearm" call anywhere.

**What happens to gear when a rebel dies?** It quietly returns to free stock: the armory count is never debited,
and `carried()` only counts living crew. The Messy trait (lose gear at launch) is switched off. See
DESIGN_BLOCKERS M-24.

### 1.4 Latent problems this causes

- **Crash risk:** the manual gear picker and "Give to" (`base.js:4305`, `:5070`, `:388`) don't check `KIT.live`.
  If a `live:0` weapon such as the HG-40 ever reached the armory, it could be equipped, and the ground scene would
  read `WPN[wkey].rng` on `undefined` (`ground.js:1301`). No path grants one today, which is the only thing
  stopping it.
- **Ground fallbacks bypass the armory:** `initUnits` gives anyone without a loadout `['akli','cowboy']`, every
  rebel a built-in stim, the rescued VIP and the prize pilot a free Cowboy (`ground.js:804-821`, `:2405`). That is
  fine for the `#test` fixtures but means the scene never fails loudly when base forgets to send gear.
- **None of the smoke tests cross-check the tables:** nothing asserts that every `KIT` weapon has a `WPN` row, an
  icon and art.

### 1.5 What "current" should look like

> **Progress (after this audit):** steps 1, 2 and 3 are built and step 5 has its test. The `items` table is in
> `db.json`; `game/js/items.js` builds the base's `KIT` and the ground scene's `WPN`, `WDAM`, `ONE_HAND` and `WICON`
> from it; `GEAR_ICON` and the `SR_WPN` leak are gone; `addArmoryItem` (and its display-name alias map) is replaced by
> `grantItem` / `Items.grant`, which every grant goes through; loot crates, enemy drops, chain gifts and the smuggler
> bonus pass ids; descriptions come from the table, with the stack's source as a fallback. `tools/items-smoke.js`
> checks the tables, every loot crate and every enemy weapon against it. Step 4 is built too (the enemy roster, §3).
> Still to do: loot that rolls (M-24), the art kit's item keys, `core.js`'s briefing chips,
> and the market's `CATW` and `BM_GSTATS` (C-10).

A target to work toward, in steps that each keep the game playable:

1. **One item table in the database.** Move `KIT` into `db.json` as an `items` table (the C-10 plan), and give it the
   columns now scattered around: description, combat stats (`d0/d1/rng/atk/shots/...`), damage type, one-handed,
   icon, art key, plus tags for drawing at random (`faction`, `tier`, `rev`, `origin`, `maker`). Vehicle guns, fists
   and turrets can be rows with `owned:false`, so `WPN` becomes a view of the same table.
2. **One module that owns items,** e.g. `game/js/items.js` exposing:
   - `Items.get(id)`: the row (throws on an unknown id).
   - `Items.grant(id, n, {src})`: the only way into `G.armory`. The description comes from the row; `src` (looted,
     bought, made, starting kit) is a field, not a sentence.
   - `Items.roll({cat, faction, tier, rev, tags}, rng)`: the parameterised random draw the Black Market already
     does privately, made general for loot crates, rewards and drops.
   - `Items.take(id, n)` for consumables and losses.
3. **Loot as data, by id or by roll.** A scenario crate becomes `{items:['scatter']}` (a designer pick) or
   `{roll:{faction:'heg', cat:'weapon', tier:1}}` (a random draw). Display names stop being keys.
4. **Enemies carry real items, and drop what they carry** (subject to a drop rule: M-24). That needs the enemy
   roster in section 3.
5. **A consistency smoke test:** every item has stats if it is a weapon, an icon, art and a description, and no
   other table uses an id the item table does not know.

---

## 2. Ships, ship weapons and space

> **Progress (after this audit):** the enemy line-ups are folded into the roster. A `space_enemies` table names each
> enemy type's ship and pilot and carries what was hard-wired before (Vex's AI by ship id `E1`, the cadets' flee rule
> by class `fled`, `BEHAVIOUR`, `CORE_PILOT`, the depot's inline pilot); `LINEUPS` and `DEPOT_PATROL` in `space.js`
> place types. Still here: the legacy class keys inside the scene, Door Gunner and Strafing Run numbers, the art
> kit's ship catalogue, and repair and reward constants in `base.js`.

**Current:** stock stats, the movement dial, size, default weapons, fuel per sortie, troop seats and gunner positions
all come from `db.json` through `SRDB`. `space.js` builds `CLS` and `WDEF` from it at load (`space.js:32-48`); the
old hand-written `CLS`/`WPN`/`SHIPSTATS`/`FUEL_COST` are gone.

**Legacy or parallel:**
- **Two primary keys for the same ship.** Base stores the Cross as `cls:'cross'` (old saves are migrated from
  `viper`, `base.js:6441`); space turns every alias into its first legacy key, so in space the Cross is `'viper'`
  (`space.js:102`). Space logic is keyed by legacy class (`'fled'` flee rule at `:554/:776/:1001`, fallbacks to
  `'viper'` at `:211/:2078/:2548/:2565`, livery and fallback hull shapes). Moving both scenes to database ids would
  remove the alias layer.
- **Behaviour in code:** `BEHAVIOUR` (Monitor summons, Mag-Clamper clamps) and their numbers (clamp range 650,
  speed −2 for 2 rounds, summon range 900), Vex's AI keyed to ship id `'E1'` (`space.js:571`), the crit table
  `CRITDEFS`. `DATABASE.md` lists only the first two.
- **Enemy line-ups inline:** `DEPLOY` and `DEPLOY_DEPOT` (`space.js:160`, `:196`). The depot "pilots" are built
  from the old aim/cool scale (`mkPilot({aim:0, cool:50})`), not a database row.
- **Door Gunner and Strafing Run ignore the database weapon.** The `door-mounted-gun` row (10–16 damage, range 600)
  only decides eligibility; the ground scene hits on d20 ≥ 9 for 16–28 (`ground.js:2177-2214`). The Strafing Run
  is a fixed 10 blasts of 28–44 (`ground.js:2382`). The gun run always draws a Graf.
- **The art kit's ship catalogue:** `SA.SHIPS`, `SHIP_FOR_GAME`, `SHIP_WEAPONS` (`sr-art.js:628-740`) have their own
  names, roles, makers and weapon keys (`repeaters`, `missiles`, `doorgun`).
- **Ship gains and repairs are constants in `base.js`:** reward hulls (70/85), sell-if-no-berth prices (600/800),
  repair rates and costs, the 60% grounding line, patrol damage.
- **`SRDB.weapon('plasma')` is ambiguous:** five weapon rows share the legacy key `plasma`; `byKey` keeps the last
  one. Nothing calls it today.

---

## 3. Ground units: enemies, vehicles, Bots and Autos

> **Progress (after this audit):** the enemy roster is built. `enemies` in `db.json` holds every enemy type (stats,
> faction, kit as item ids), `game/js/enemies.js` spawns them, every ground spawn goes through it, and enemies drop
> what they carry. `AUTOS` in `base.js` reads its numbers from the roster. Ground vehicles followed: the cruisers are
> roster rows with a `vehicle_seats` table, and `VEHDEF`, `BOTDEF` and `GVEH` are built from it (or gone). Still to
> do: space line-ups. (The owned Strider now matches the enemy one: C-21 resolved.)

**Current:** nothing owns them yet (DATABASE.md "Not in the database yet").

**Legacy or parallel:**
- **No enemy roster.** Every deputy, patrolman, Policebot, riot shieldman and sniper is a literal in each scenario's
  `foes()` with its own hp, aim, def and weapons (`ground.js:149-522`, dozens of literals). "Deputy" is the same
  60/1/10 in every scenario only because it was typed the same each time.
- **Vehicles defined twice:** `GVEH` in `base.js:28` and `VEHDEF`/`BOTDEF` in `ground.js:839-847`; the base comment
  admits they "must match". `tools/vehicle-smoke.js` copies the numbers a third time.
- **Autos defined twice:** `AUTOS` in `base.js:19` and the enemy literals.
- **The Strider has four sets of numbers:** 220 hp / aim 2 owned (`GVEH`), 220 as the Steal the Strider VIP
  (`MPOOL`), 240 hp / aim 1 as an enemy (`ground.js:320`), and its speed alone in `BOTDEF`. A Strider you hack in
  the field loses 20 hp on joining (DESIGN_BLOCKERS C-21).

**What "current" should look like:** a `units` table (or `enemies` + `vehicles` tables) in `db.json`, each row
carrying its stats and an item-id loadout; scenarios place a unit by id with per-spawn overrides (name, position,
patrol, lines). Base and ground read the same row, so owned and enemy Striders cannot drift.

---

## 4. Rebels: XP, skills, traits, injuries, morale

**Current:** `window.Rebel` (`rebel.js`, `rebel-exp.js`, `rebel-injury.js`) owns generation, XP and levels, skills
(with the conversion to the database's 0–50 scale), traits, earned experiences, morale, conditions and rank.

**Legacy or parallel:**
- **Two injury-recovery models ran side by side** (DESIGN_BLOCKERS C-20; **folded into the conditions model since**: being laid up is a condition, one `healRate`). `Rebel.condRecover` heals conditions at
  `healRate()` (`base.js:468`: medic +0.5, doctor +1). The old `p.injured` day counter (`base.js:1575-1583`) heals at
  its own rates (medic staff +2, medic +1, doctor +2, Soldier with barracks staff +1, which misses Marines and
  Heroes) and owns prosthetic fitting and the "scarred" and "nearly dead" experiences. `p.injured`, `p.injDur`,
  `p.critHeal`, `p.prosPending` and `p.body` are written directly in six places in `base.js`; the ground scene picks
  the days itself (`ground.js:3444`).
- **Three debrief paths:** `applyDebrief` (the full one); its Haven Rock branch (`base.js:6188`), which skips the
  mentor bonus, morale, experiences and the Hero check; and the "Send a team" `resolveMission` (`base.js:1818`),
  which skips skill training, reviews, bereavement, Hero gain and conditions.
- **Space kept its own rebel model** (DESIGN_BLOCKERS C-22; **folded into `Rebel` since**: rebel trait keys and ranks, one nerve rule):
  - traits keyed by the database's legacy strings ("Veteran", "Lucky", "Ace Training"), which collide with
    campaign traits of the same name and different effect;
  - its own rank ladder `RANKS`/`rankOf(level)` (`space.js:68`) instead of `Rebel.rankName`;
  - its own nerve rules `adjCool` (`space.js:140`), duplicated in ground as `adjCoolG` (`ground.js:1666`);
  - the `aim×10` skill shim in `mkPilot` (`space.js:86`), still used by the depot, the hangar systems sheet and
    `space-smoke.js`.
- **Ground's prize pilot** is hard-coded (`hp:55, aim:1`) with unit id `'sera'`, and about 20 checks test
  `u.id==='sera'` (`ground.js:819`, `:1888`, `:2861`, `:3020`). Any pilot playing the prize role is "Sera" to the code.
- **Old formulas still in ground:** the "combat experience" defence bonus `floor(level/2)` (`ground.js:1321`) predates
  skills.
- **Specialty effects live in `base.js`** (`soldierAim`, `pilotAimMod`) rather than in `Rebel`.
- **Hacked Autos** are pushed as raw objects without `Rebel.migrate` (`base.js:6335`).
- **Petra Voss** is in the database and `SEED_PILOT` but never joins the campaign; Joss's ship and trait differ
  between his database row and his campaign record.

---

## 5. Missions

- **"Send a team" is the old abstract resolver.** It now only runs missions without a playable scene (intercept,
  tanker, skim, fighters, chart, orehaul, foundry). Its odds use average level, base morale and command staff only;
  it never grants items and bypasses the rebel systems above. Its `m.rew.cross` branch is unreachable.
- **Retired local ops are still wired:** `syncLocalOps` returns on its first line (`base.js:2153`) but is called from
  five places; eleven `op:` entries in `PLANETDEF`, the `op_` generation in `MPOOL` (`base.js:1031`) and the `OPX`
  patch only serve old saves. `MPOOL.garrison` is never offered. `docs/GDD.md:511` still describes local ops.

---

## 6. Save data

> **Progress (after this audit):** saves are versioned. `G.v` is the schema version (a save without one is version
> 0); `MIGRATIONS` in `base.js` is a numbered list, each entry upgrading one version, run once and in order by
> `upgradeSave()`, and `newGame()` is born at `saveVersion()`. Every one-off fix that used to run on each load is now
> migration 0 -> 1 (kept whole, so no save from before versioning is lost); the work every load needs (rebels'
> defaults, new worlds, the sortie refund, re-binding functions, refreshing mission data, the market) stays in
> `restoreCampaign`. The `econ4`/`locModel`/`medSeeded` flags only matter to version-0 saves now. A save from a newer
> build loads as it is, with a console warning. Checked by `tools/save-smoke.js`.

- One key (`star-rebellion-campaign-v1`, `core.js:59`), no schema version inside the payload. Migrations in
  `restoreCampaign` (`base.js:6383-6463`) detect old shapes or set one-off flags (`medSeeded`, `econ4`).
- **Probably dead** (they fix saves from the first days of the repo, before the ×4 economy and the room renames):
  `bay→hangar`, `quarters→barracks`, `viper→cross`, `medbay→infirmary`, `introDone`, `p.auto===1`, the
  locked-Strider filter, the `op_` missions, `SEED_PILOT`.
- **Not dead, and harmful:** `econ4`, `locModel` and `medSeeded` fired on the first reload of *every* campaign,
  because `newGame` never set their flags (§10 item 8, now fixed). A flag-based migration needs every new campaign
  to be born with the flag set, which is the strongest argument for the schema number below.
- **Still needed:** `gearFromEquip` (the opening cast still uses `equip`), `ensureMarket`, `Rebel.migrate`, and
  re-binding event and signal functions.
- `MPOOL` is copied over saved missions on every load (`base.js:6446`), so mission data is effectively code, not save.
- **Mid-mission reload:** `startPlan` saves after spending fuel and supplies, but `SR.mission` is not saved, so a
  reload mid-mission loses the mission and keeps the costs. The ground and space `saveSnap` stubs say "reloading
  resumes at Haven Rock", which is the behaviour, but the cost is not refunded.

**Suggestion:** add `G.v` (a schema number), run migrations as a numbered list, and drop the pre-`v1` ones with a
"save too old, start again" message. Nobody has a save from 2026-09-27 that matters.

---

## 7. Duplicated helpers and the UI kit

> **Progress (after this audit):** the Base screen is on the UI kit. Its window chrome is the kit's (`H.winHead`,
> `H.winBody`, `H.winFoot`, `H.closeBtn`, which `H.win` now builds from too), and its menu, day banner, toast, comms
> feed and tooltips are the kit's (`H.menuBind`, `H.banner`, `H.toast` (new), `H.comms`, `H.tips`); `esc`, the icon and
> initials helpers are the kit's. Restart asks with the kit's confirm window instead of "click again". The base keeps
> its own window *manager* (one live window re-rendered by mode, with a queue of reports), now built from kit chrome.
> Wiring the tooltips fixed the galaxy orders' rule tooltips, which had never shown. Screenshots of the base, a window,
> the menu, the feed and the banner are pixel-identical before and after; `tools/basekit-smoke.js` covers it.
> The shared helpers are in `SR.util` (`core.js`): `scoped` (the scenes' `byId`/`$`), `rint` and `pick` (each takes
> the caller's rng, so the ground scene's seeded rolls and the space tests' swapped rng still drive them), `clamp`,
> `dist`, `mulberry32` and `hashStr` (the FNV hash `rebel.js` used inline). `sTick`/`sDice` are `SR.audio.tick`/`dice`,
> `osc`/`nz` are `SR.audio`'s own, every reduced-motion check reads `SR.hud.reduced`, the cast-list tag is `SR.hud.tag`,
> and `core.js` uses the kit's icon and initials helpers. Staying put on purpose: `log`, `say`, `nameSpan` and
> `addFloater` read each scene's own state (its feed, its units, its floaters), so they are scene code, not copies;
> the art kit keeps its own `mkRng`/`hashStr`/`pick` because its style guide loads `sr-art.js` without `core.js`.
> `tools/sweep-smoke.js` pins the helpers. Still to do: the remaining inline styles (mostly data-driven widths and
> grid positions, which belong inline).

- **Copied between scenes:** `rint`, `dist`, `addFloater`, `log`, `nameSpan`, `say`, `sTick` (identical), `sDice`,
  `osc`/`nz`/`byId`/`$`, the reduced-motion check (five copies), three RNGs (`mulberry32`, `sr-art`'s `mkRng`, the
  FNV hash in `rebel.js` sharing constants with `sr-art`'s `hashStr`), three icon helpers, three initials helpers,
  two `esc` (the base one doesn't escape `>`). These belong in `core.js` (`SR.util`).
- **`SR_WPN`** is a scene-to-scene leak: base reads the ground scene's weapon table to show market stats. It goes
  away with the item table in §1.5.
- **Base doesn't use the UI kit.** Ground and space use `SR_HUD` for windows, comms, banners, menus and confirms;
  `base.js` hand-rolls `openWin`/`renderWin`, `feedPush`/`renderFeed`, `showDayBanner`, its own menu handler, a
  double-click restart and `flashMsg`, with 76 inline `style=` attributes. `core.js` also keeps a second card
  builder (`SR.ui.squadCard`).
- **`G` swap hack:** `newGame` temporarily replaces the global `G` to run the gear helpers on a fresh campaign
  (`base.js:249`), because those helpers read the global instead of taking a campaign.

---

## 8. Dead code

| What | Where |
|---|---|
| `drawProps` (returns on its first line, about 86 lines) | `ground.js:3814` |
| `drawBldgsOld` (about 60 lines, never called) | `ground.js:4068` |
| `syncLocalOps` body (returns on its first line) | `base.js:2152` |
| `fighterTop` | `base.js:2315` |
| `easeO` | `intro.js:161` |
| ~~`t.pilot.foc` (never set)~~ removed with the trait fold | `space.js` |
| Recruits' `equip:['pistol']` (not a `KIT` id, never read) | `base.js:1431`, `:1462` |
| `Rebel.focusTN`, the space branch of `Rebel.aimOf` | `rebel.js` |
| Armory `ic` glyph field (icons come from `GEAR_ICON`) | `base.js:4120` |

The `live:0` flags on traits, specialties and items are **not** dead code: they mark unbuilt systems tracked in
DESIGN_BLOCKERS.

---

## 9. Repo and docs

- **Root prototypes:** `base.html`, `ground-combat.html`, `space-combat.html`, `space-combat-gdd.html` (the last is
  a playable page, not a design doc). Nothing in `game/` or `tools/` loads them; only the README mentions them. Their
  tables (`SHIPSTATS`, `CLS`/`WPN`, `armory`) are the original copies of what `game/js` now holds, so grepping for a
  table name finds two answers. Suggest moving them to `prototypes/` (or deleting them; git keeps the history).
- **README.md:** lines 249–570 describe the prototypes, mostly under the `## game/` heading. Out of date: the
  "prototypes and experiments" intro, branch names that no longer exist, the "Send a team" claim for playable
  missions, Graf restore cost (60/40; the code charges 240/160), berth count (2 vs 4), green source icons (now
  red), "kit files are generated" (only some are). Missing: Arsenal, Black Market, Head/Body slots, Galaxy view,
  title screen.
- **Finished handoffs that read as live:** `docs/ONBOARDING-HANDOFF.md`, `docs/ui/HANDOFF.md`,
  `docs/ui/GALAXY-HANDOFF.md`, `docs/ui/MARKET-ARSENAL-HANDOFF.md`, `docs/art/HANDOFF.md` are all built.
  `docs/REBELS_PLAN.md` still says "Plan only, nothing implemented yet" at the top, though all 12 phases are built.
  Suggest a one-line "Status: built in …" header on each, or a `docs/archive/` folder.
- **Contradictions:** ROADMAP's "where the game is now" table predates Phase 1 and calls Phase 3 in progress; GDD
  line 302 says armour isn't built (six items exist, with no effect: M-16); GDD line 855 puts Disrupt Comm Towers out
  of Level 1 scope though it is built; DATABASE.md lines 80–82 still describe the `aim×10` pilot shim, which base no
  longer uses.
- **Generated docs behind their sources:** `docs/ui/styleguide.html` is one line behind its template;
  `docs/art/styleguide.html` misses about 26 lines of later `sr-art.js` changes and has no build step.
- **Tooling:** no `package.json`, no single command that runs all the smoke tests, and every smoke test repeats the
  same Playwright setup. `space-smoke.js` only fails on page errors (it has no assertions). `sweep.sh` misparses a
  lone REVW argument.

---

## 10. Bugs found along the way

Fixed in the commit after this audit (checked by `tools/sweep-smoke.js`) unless marked *open*.

1. **Fixed: reinforcements 3 and 4 weren't outfitted, and could be stripped.** The Graf carries 4 reinforcements
   (`SEATS`), but `startPlan` only collected seats 0–1 for `outfitSquad`, and none at all when a door-gun Graf fell
   back to reinforcing. `outfitSquad` pulls gear from crew who aren't going, so seats 3–4 could lose their rifles to
   the main squad. Every seat is outfitted now.
2. **Fixed: latent crash on equipping a `live:0` weapon** (§1.4). `gearFits` refuses `live:0` kit, so it is never
   offered, auto-equipped or left in a slot; the ground scene's `mkU` swaps any weapon it has no stats for to bare
   hands instead of crashing.
3. **Fixed: hacked Strider lost 20 hp on joining** (§3, C-21: the owned one is now the enemy one).
4. **Fixed: earned "Veteran" double-dipped in space** (§4, C-22: space now follows the rebels' rules).
5. **Fixed: the barracks healing perk checked `role==='Soldier'`**, so Marines and Heroes missed it. It uses
   `isGround` now. (The heal rates were settled by C-20: one model.)
6. **Fixed: a mid-mission reload kept the costs** (§6). `startPlan` records the sortie (`G.sortie`); a debrief clears
   it; `restoreCampaign` hands back the fuel and supply drop of a sortie that never came home, with a news line.
7. **Fixed: the reward window showed raw XP.** It shows what `gainXp` added (traits and the mentor bonus included).
8. **Fixed, found while testing the fixes: reloading any new campaign re-ran three old-save fixes.** `newGame` never
   set `econ4`, `locModel` or `medSeeded`, so the first reload of every campaign multiplied credits, supplies,
   materials, fuel and source income by 4, put the Revolution Level back to 1, capped renown at 40, and could hand
   out four free Med Packs. New campaigns are born with those flags. Campaigns already reloaded once keep their
   inflated stores.

---

## 11. Suggested order

Each step is independent and leaves the game playable. The first two are cheap and stop new drift.

1. ~~Fix the bugs in §10~~ (done).
2. **Housekeeping:** move the root prototypes out of the way, mark finished handoffs, fix the README, add a
   `tools/smoke-all.sh`, delete the dead code in §8.
3. **Items (§1.5):** ~~the item table and `Items` module, every grant through `Items.grant`, loot by id~~ (done);
   loot that rolls waits on M-24.
4. **Units (§3):** ~~an enemy roster, so scenarios place units by id and drops come from what they carry; vehicles~~
   (done).
5. **Rebels (§4):** one injury model, one debrief path, space reading traits and rank from `Rebel`.
6. **Ships (§2):** database ids everywhere instead of legacy keys; behaviours and fire-support numbers as columns.
7. ~~**Save versioning (§6)**~~ (done; the pre-versioning fixes live on as migration 0 -> 1 and can be dropped once
   no version-0 save matters).
8. ~~**Base onto the UI kit (§7)**~~ (done); ~~shared helpers into `SR.util`~~ (done).
