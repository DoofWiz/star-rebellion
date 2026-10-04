# Black Market + Arsenal — implementation handoff

**For:** Claude Code, working in `DoofWiz/star-rebellion` (branch off `main`).
**Save this file as** `docs/ui/MARKET-ARSENAL-HANDOFF.md` and the CSS at the end as `game/ui/sr-kit.css`.
**Design source:** the designer's approved canvas "Star Rebellion — Black Market & Arsenal" (five boards). This file carries everything needed from it; you do not need to open it.

Two new tabs join **Base · Galaxy · Missions**, in this order: **Base · Galaxy · Missions · Arsenal · Black Market**.

- **Arsenal** is where everything the player owns lives: personal weapons, armour, gadgets, vehicles and bots, ships, and ship weapons and attachments. It **replaces the Gear Grid window** and serves the same purpose.
- **Black Market** is where credits buy stuff. A fixed NPC, **Sweet Tooth**, a fence at Nyx Shadowport, always runs it. Six lots, a full restock every 7 days, no Hegemony kit.

Follow `CLAUDE.md`: keep `docs/DESIGN_BLOCKERS.md` current (entries to add are listed in §8), and all `tools/*-smoke.js` must pass before a merge.

---

## 0. Ground rules

- **House UI rules from `sr-theme.css` still apply.** Top reads, bottom does. Selection actions go on the command bar as `sr-order` buttons on keys 1–2. **Advance day stays the only gold button.** Red is ours, blue is theirs, orange is danger.
- **Both tabs are full stage views**, the same way the Galaxy view works in `GALAXY-HANDOFF.md`, if that has landed. If tabs still open windows (`openWin('sources')` / `openWin('missions')` in `base.js`), add a `.kit-view` layer over the stage canvas instead (CSS below). The top bar, Revolution hub, tabs, comms (bottom-left), command bar (bottom-right) and rail all stay in place. Only the stage content and the rail's contents swap. Extend `syncTabs()` to cover the two new tab ids.
- **Art:** use `SR_ART.item(id)` for item art and the `SR_ART` head renderer (via `lookOf(p)`) for faces, if `game/ui/sr-art.js` is installed. If it is not on `main` yet, fall back to the existing `gearIcon()` glyphs (`sr-icons.svg`) inside `.it-art`, and the role avatar (`.sr-avatar`) inside `.kf`. Do not block on art.
- **Saves:** additive only. Everything new gets a default in `restoreCampaign()`. No save-format breaks.
- **Debug:** expose new functions on `window.DBGbase.fn` like the existing ones, so smoke tests can drive them.

---

## 1. Shared item catalogue (`KIT`)

The database (`docs/DATABASE.md`) does not hold personal kit yet. Add a `KIT` table in `base.js` that **absorbs `GEAR_META`**, keeping the same keys so saves and `G.armory` still line up.

Fields: `id, name, cat ('weapon'|'armour'|'gadget'), slot ('primary'|'secondary'|'head'|'body'|'gadget'|null), w, h, q (auto-equip quality), maker, origin ('factory'|'handmade'|'scavenged'), price (base credits), heg (bool), dropOnly (bool), live (bool), rev (min Revolution Level, 1 for everything here)`.

`live:false` means the game has no mechanics for the item yet. Such items are **never stocked and never auto-equipped** until someone builds them; log each in DESIGN_BLOCKERS.

| id (keep) | Name | cat · slot | w×h | Maker | Price | Flags | Live now? |
|---|---|---|---|---|---|---|---|
| `akli` | Akli AR | weapon · primary | 3×1 | Bhord | 140 | | yes |
| `cowboy` | Cowboy No.4 | weapon · secondary | 1×1 | TBC | 70 | | yes |
| `scatter` | Varmint Shotgun | weapon · primary | 3×1 | TBC | 160 | | yes |
| `longiron` | Longhorn ’28 | weapon · primary | 3×1 | TBC | 240 | | **make live**: add a slot entry (WPN already exists, q 3) |
| `rocket` | Improvised Rocket Launcher | weapon · primary | 3×1 | TBC | 340 | handmade | **make live** if one-shot use can carry over from the supply-drop rule; otherwise false + blocker |
| `plasmasmg` | Improvised Plasma SMG | weapon · primary | 2×1 | — | 280 | handmade | no |
| `mininglaser` | Repurposed Mining Laser | weapon · primary | 3×1 | — | 420 | scavenged | no |
| `carbine` | Peacekeeper Carbine | weapon · primary | 3×1 | Patriot | — | **heg** | yes (loot only) |
| `hg40` | HG-40 | weapon · secondary | 1×1 | Patriot | — | heg | no |
| `baton` | Power Baton | weapon · secondary | 2×1 | Patriot | — | heg | no |
| `riotshield` | Riot Shield | weapon · secondary | 2×2 | Patriot | — | heg | no |
| `autohand` | Auto Plasma Hand | weapon · secondary | 1×1 | AutoCom | — | **dropOnly** | no |
| `hardhat` | Frontier Hardhat | armour · head | 1×1 | TenTiU | 45 | | **make live** (see §4) |
| `cowboyhat` | Cowboy Hat | armour · head | 1×1 | — | 30 | no benefit | **make live** (cosmetic) |
| `cap` | Baseball Cap | armour · head | 1×1 | — | 20 | no benefit | **make live** (cosmetic) |
| `policehelmet` | Police Helmet | armour · head | 1×1 | Patriot | — | heg | make live (loot) |
| `policevest` | Police Vest | armour · body | 2×2 | Patriot | — | heg | make live (loot) |
| `autohelm` | Auto Head-Helm | armour · head | 1×1 | — | 120 | handmade | make live (as Police Helmet) |
| `medpack` | Med Pack | gadget | 1×1 | — | 40 | | yes |
| `blam` | BLAM Frag Grenade | gadget | 1×1 | BLAMCo | 50 | | yes |
| `charge` | BLAM C90 Explosive Charge | gadget | 2×1 | BLAMCo | 110 | | yes (rename display only; key stays `charge`) |
| `stim` | Stim | gadget | 1×1 | — | 35 | | no: ground gives every rebel 1 built-in stim. Making it an item is a blocker |
| `molotov` | Molotov Cocktail | gadget | 1×1 | — | 25 | handmade | no |
| `angel` | Guardian Angel Drone | gadget | 1×1 | — | 220 | handmade | no |
| `autocore` | Auto Core Improvised Charge | gadget | 1×1 | — | 90 | handmade | no (could count as an Explosive Charge for preconditions) |
| `limpet`, `shells` | (existing) | gadget / other | as now | — | — | not sold | as now |

Display names follow the Gear doc. Keep internal keys for save compatibility.

**Ships, vehicles, ship weapons** (prices only; their data stays where it is):

| What | Key | Price | Market? |
|---|---|---|---|
| SF-11 Talon | `talon` / `sf-11-talon` | 2,200 | yes |
| FT-4 Cross | `cross` / `ft-4-cross` | 2,600 | yes |
| Graf Hauler | `graf` / `graf-hauler` | 3,200 | yes |
| VC Mote, VT-2 Fledgling, VK-3 Scimitar | Varrondow | — | **never** (Hegemony; designer confirmed the Fledgling stays out) |
| Drones, Fuel Depot | AutoCom / structure | — | never |
| Frontier Floatin’ Truck | new `GVEH.truck` (vehicle, 3 seats; stats are a blocker) | 1,100 | only once `truck` exists in `GVEH`/`VEHDEF` |
| Police Cruiser, Riot Transport/Dispersal Cruiser, Strider Mk I | `GVEH` | — | never (Hegemony issue) |
| BLS-T Light Repeaters | `bls-t-light-repeaters` | 380 | yes |
| Missiles | `missiles` | 520 | yes |
| Door Mounted Gun | `door-mounted-gun` | 300 | yes |
| Ship attachments | — | — | join the pool when the database has them |

**The market pool rule:** `live && !heg && !dropOnly && rev <= G.revLevel && price`.

---

## 2. Arsenal tab

### Layout (desktop, 1440×900 reference)
- **Top bar:** title "Arsenal", sub "Haven Rock · everything we own".
- **Stage** (`.ar-body`, from `top:120px` to above the command bar), two columns:
  - **Dossier** (`.ar-dossier`, 300px, left) for the selected thing:
    - item art well, name (display font), kind line and maker chip (`.kit-mk`, coloured square per maker);
    - a provenance tag: `sr-tag--friend` for starting kit or stolen, `--action` for bought from Sweet Tooth, `--foe` for looted Hegemony kit, plus a second `--foe` tag "Hegemony issue" with a lock icon;
    - an italic blurb, a stats list (`.kit-stat` dl), three count boxes (Owned · Carried · In store), and "Carried by" chips with head and first name.
  - **Main** (`.ar-main`):
    - **Category chips:** `All kit · Weapons · Armour · Gadgets | Vehicles · Ships · Ship kit`, as `sr-btn--sm` with `aria-pressed`.
    - **Capacity on the right:** "Storeroom 23 / 36 slots" with a gold meter. Ships show landing pads (`G.fighters.length / fighterCap()`). Vehicles show the vehicle count. Ship kit shows "Hangar racks · no limit".
    - **Kit views:** the existing footprint grid (`gearLayout`, 8 columns, 84px rows), sorted by category (weapons, armour, gadgets) then by size, largest first. Each tile shows its art, name, `×N` top-right, and a red "carried" pill top-left with a people icon and count. Hegemony items get a blue gradient tile (`.is-foe`).
    - **In "All kit" only**, free slots up to capacity render as dashed cells (`.ar-free`). The rest of the last row renders as one locked block (`.ar-locked`): "Another Storeroom: +12 slots". Capacity keeps today's rule: `gearCapacity() = 24 + 12 × Storeroom tiles`, duplicates stack, over-capacity shows the existing overflow warning.
    - **Vehicles / Ships:** two-column bay cards (`.ar-bay`) with art, name, class · maker, an `sr-hp` 10-cell health bar, mount chips (`.ar-mount`, dashed when empty), and a crew line ("Pilot: Joss · gunner seat · 4 passengers" / "No pilot assigned" / "Drives itself"). After the cards comes a dashed "free" card: "1 landing pad free — a ship from Sweet Tooth needs one." For vehicles: "Sweet Tooth sometimes has a Frontier Floatin’ Truck."
    - **Ship kit:** tiles like kit. The carried pill becomes a blue "fitted" count, and the hint names the ship.
- **Command bar:** selected art, name, and a hint ("2 in store · 4 carried"; for Hegemony items, append "· Sweet Tooth won’t buy it").
  - **1 Give to…** opens the existing gear picker for a rebel. Fit to ship / Refit / Assign open the existing hangar loadout and vehicle flows.
  - **2 Sell +N** (see §2.3).
- **Rail: Loadouts.** Section head "Loadouts" with a "6 carrying" count, then one fine line: "Auto-equip fills empty slots. Anything you set by hand stays put. Tap a slot to swap."
  - **Column header:** Primary · Side · Head · Body · Gad · Gad.
  - **One card per carrying rebel** (`.ar-row`): head, name, role line, then six slot buttons (`.ar-slot`).
  - **Slot states:** an empty slot is dashed with its label. A slot the role doesn't have shows "—" (pilots have no Primary). A slot holding the **selected item** glows gold (`.is-match`).
  - **Mercenaries:** a purple-tinted card (`.is-merc`) with a "N days left" `sr-tag--progress`. Their own-kit slots get a purple corner (`.is-lock`) and can't be changed.
  - **Tapping a slot** opens today's `gearOverlayHTML` picker.
- **Comms** (bottom-left) as normal.

### 2.1 What it replaces
- `winMode==='gear'` (the Gear Grid window) is removed. Every `data-open="gear"` button (the Storeroom room panel and the store info card) switches to the Arsenal tab.
- The per-rebel **Gear** section in the personnel file stays, with Head and Body rows added (§4).

### 2.2 Default selection
- **First open:** the top-left tile. After that, keep the last selection per category in a module variable (no save needed).

### 2.3 Selling to Sweet Tooth
- **Price:** `floor(price × 0.3)` per unit. The order label reads "Sell +42".
- **Disabled when** any of these apply (the reason shows in the hint):
  - Hegemony item: "Sweet Tooth won’t touch Hegemony kit".
  - No free unit: "All of them are being carried".
  - Mercenary's own kit, or no `price`.
- **Ships and vehicles:** no Sell for now (designer's call to keep it, but scope it to kit).
- A sale removes one unit from `G.armory`, adds credits (with the usual resource delta animation), and posts a friend comm: "Sweet Tooth takes the Akli AR off our hands. +42."

---

## 3. Black Market tab

### Layout
- **Top bar:** title "Black Market", sub "Nyx Shadowport · Sweet Tooth".
- **Stage** (`.bm-stall`):
  - **Header row:** a slightly tilted sign (`.bm-sign`) reading **"Sweet Tooth’s Unclaimed Goods"** (display font, gold, no subtitle). On the right, "This week’s stock · Day 15–21" and an `sr-tag--action` with a lock icon: "Fixed until Day 22".
  - **3×2 grid of lot cards** (`.bm-card`, real `<button>`s, `aria-pressed` when selected). Each card has, top to bottom:
    - a category label with icon and colour: Weapon (`gun`, rebel-hi), Armour (`shield`), Gadget (`grenade`/`patch`, go), Mercenary (`people`, psi), Vehicle (`vehicle`), Ship (`ship`, shield-cyan), Ship weapon (`turret`);
    - a stock pill (`×4`, or "Gone");
    - the art well (mercs: their head at 96px plus small art of their own kit, captioned "Brings own kit");
    - the name and a sub line ("Hunting rifle · long range", "Assault rifle · Bhord", "Soldier · Level 3 · Marksman", "Patrol craft · MenDon");
    - the price in gold (red `.is-short` when unaffordable; mercs append "/ 14 days") and a deal tag.
  - **Card states:** Ships get a purple **Rare** ribbon and a purple-tinted card. Selected: gold ring, lifted. Sold out: dimmed with an `sr-stamp--bad` "Sold" stamp.
- **Command bar:**
  - **Who:** art (or merc head), name, then a **stats row** (`.kit-cstats`, label over value, 3–4 stats). **No delivery or affordability hint text** (designer's comment): affordability shows as the red price and the disabled order.

    | Lot | Stats shown |
    |---|---|
    | Weapons | Damage `d0–d1`, Range (Short < 300, Medium < 500, Long < 800, Very long), Shots (with ", can jam" if `jam`) |
    | Gadgets | Effect, Best vs / Health, Use |
    | Armour | Protects, Slot |
    | Mercs | Level, Specialty, Kit: "Brings own" |
    | Ships | Hull, Shields, Speed (top straight speed) |
    | Vehicles | Health, Seats, Role |

  - **Orders:** **1 Buy** (or **Hire** for mercs, credits icon) and **2 Buy all** (loot icon; disabled unless stock > 1 and all of it is affordable).
  - **Go:** Advance day, with the count line "Restock in **4 days**".
- **Comms** narrowed to 300px on this view.
- **Rail: the fence.**
  - Sweet Tooth's portrait at 150px with a double ring, the name "Sweet Tooth" (display font, 26px), and "Fence · Nyx Shadowport".
  - Below that, her **speech bubble** (`.bm-say`, tail pointing up). The line depends on the state (§3.4).
  - A restock box: a gold-ringed circle with the days left, "**Days to new stock**", the sub line "**Stock will be replaced at refresh**", and seven week pips (past days gold, today red).
  - A dashed perk row: "**Regulars’ discount: 10% off.** Get Access to Nyx Shadowport." Once the player has Access to `nyx`, it becomes solid with a check, and prices show discounted.
  - **No house-rules section** (designer removed it).

### 3.1 State
```
G.market = {
  week,          // 1-based; week k covers days 7k-6 .. 7k
  next,          // day the next restock happens (1, 8, 15, 22 ...)
  lots: [ { kind:'kit'|'merc'|'ship'|'vehicle'|'shipwpn', key, stock, price, deal:'good'|'fair'|'steep', merc?:{...rebel record...} } ],
}
```
- **New game:** roll week 1 on day 1.
- **Old saves with no `G.market`:** roll on load, with `next = the next multiple-of-7-plus-1 after G.day`.

### 3.2 Restock (in `advanceDay()`, after `G.day++`)
When `G.day >= G.market.next`, call `rollMarket()`. Unbought stock is discarded. Post a friend comm: "**Sweet Tooth** has new stock at Nyx. Six lots, gone by Day N." Badge the Black Market tab with "6" until it is opened (the same pattern as `misBadge`).

`rollMarket()`:
- **Seeded RNG:** derive it from a campaign seed and the week (add `G.seed` if there isn't one), so a reload never rerolls the stock.
- **Lots 1–3:** always personal kit from the pool, at least one weapon, armour or gadget for the rest.
- **Lots 4–6:** weighted, no duplicate keys. Weights at Rev 1: **Weapon 28 · Gadget 24 · Mercenary 14 · Armour 12 · Ship weapon 10 · Vehicle 8 · Ship 4**. If a category has nothing eligible, reroll it. Rev 2+ weights are a blocker; the intent is to move weight from kit to ships, vehicles and mercs.
- **Stock:** gadgets 2–4, everything else 1.
- **Price:** `base × swing` with `swing ∈ [0.85, 1.25]`, rounded to the nearest 2. The deal tag is **Good price** if `swing ≤ 0.95`, **Steep** if `≥ 1.10`, otherwise **Fair**. A galaxy event may add to the swing for a week (the mockup comm: "**Hegemony** customs sweep the Nyx docks. Sweet Tooth’s prices are up this week."); the hook is optional.
- **Discount:** with Access to Nyx, multiply by 0.9 at display and purchase time.

### 3.3 Buying
| Kind | Needs | Effect |
|---|---|---|
| kit | credits | `addArmoryItem`-style add of N units by key (extend it to take a key and count), then `autoEquip()`; it lands in the Arsenal **now**. |
| merc | credits, a free bunk (`freeBunks() > 0`) | the merc joins **tomorrow** (queue it and add it in the next `advanceDay`). See §5. |
| ship | credits, a free pad (`G.fighters.length + inbound < fighterCap()`) | `newFighter({cls, hull:100, name})` lands in **2 days**. Name it with the class's short name plus a number, renameable later. |
| vehicle | credits | `addVehicle(type)` in **2 days**. |
| shipwpn | credits | add to a new `G.shipKit` store (`[{id, n}]`, keyed by db weapon id). The hangar loadout picker draws from it. If loadouts don't use a store yet, log a blocker and keep the lot out of the pool. |

- **Blocked buys** disable the order. The hint is gone, so the reason goes in the button's `title` and in Sweet Tooth's line: "Need 1,610 more credits", "Needs a free bunk", "Needs a free landing pad".
- **Every buy** decrements stock and spends credits (resource delta), and posts a friend comm:
  - kit: "Longhorn ’28 bought. It’s in the Arsenal."
  - merc: "Ines Darrow signs a 14-day contract. Arrives tomorrow."
  - ship: "FT-4 Cross is on its way from Nyx. Lands in 2 days."
- Buying everything in a lot sets it to Sold.

### 3.4 Sweet Tooth's lines
Her pet name is **"sugar"**. Store the lines in one table so they can be rewritten easily.
- **Greeting** (tab opened, nothing selected): "Six lots this week, sugar. When they’re gone, they’re gone."
- **Per-lot pitch:** each catalogue entry gets an optional `pitch`. Defaults by category, plus these specific ones:
  - Longhorn ’28: "Off a poacher who won’t be needing it. Not my doing. Mostly. Reaches further than anything else on this table."
  - Akli AR: "Bhord build them to be dropped in mud. These fell off a garrison truck. Twice."
  - BLAM Frag: "BLAMCo. Accept no imitations. I’ve got four, and I’ve stopped counting fingers."
  - Guardian Angel Drone: "Some tinkerer’s pet project. It’ll take a bullet for you. Once. Then it’s a paperweight."
  - FT-4 Cross: "A MenDon Cross, barely shot at. Patrol markings sanded off, mostly. Two days to fly it in, and you’ll want a pad."
  - Merc (template): "[First] shoots for money, not for flags. Pay [them] well and [they] might start caring. Comes with [their] own [weapon]."
- **Can't afford** (pitch + suffix): "…Which is more than you’ve got. I don’t do credit, I do credits."
- **Bought kit:** "Pleasure, sugar. It’s already in your Arsenal. Don’t ask how."
- **Hired merc:** "She’ll be at your door by morning. Feed her, pay her, and don’t ask about the name." (Use the merc's pronoun.)
- **Bought ship:** "Done. My lads will fly it to you in two days. Try not to crash it before it lands."
- **Sold out:** "Gone. Should’ve been quicker, sugar."
- **Asked why there's no Hegemony kit** (optional flavour): "It’s serial-stamped, sugar. It gets stalls burned."

---

## 4. Head and Body slots

The designer approved two new slots: `gear = {primary, secondary, head, body, gad:[a,b]}`.

- **`Rebel.gearSlots`:** Soldiers, Marines and Heroes get Primary, Secondary, Head, Body and two Gadgets. Pilots get everything except Primary. Support get nothing (as now). Update `FULL_KIT`, `gearHeld()`, `slotGet/slotSet`, `gearFits` (match `KIT.slot`), `SLOT_LABEL`, the personnel-file Gear section and the picker.
- **Migration:** add `head:null, body:null` in `gearHeld()`. After load, `autoEquip()` hands out Hardhats (best `q` first, as today).
- **Effect in ground combat:** this is a **proposal to log as a blocker**, since no armour rule exists. Head armour adds +1 to the unit's `def` (Frontier Hardhat, Police Helmet, Auto Head-Helm). The Police Vest adds +2. The Cowboy Hat and Baseball Cap add nothing. Pass head and body into the ground unit spec next to `wpns`. If the designer hasn't answered, ship the slots and data with **no combat effect** and say so in the blocker.
- **Art:** `lookOf(p)` should read `gear.head` and `gear.body` when the art kit is present. The default Hardhat for Soldiers already exists there.

---

## 5. Mercenaries (a recruit type)

- **Generation:** `Rebel.gen(role, taken, rng)`, with role Soldier 70% / Pilot 30% and level 2–3. 50% have a specialty (Soldier: marksman, commando, gunner or demolitions; Pilot: leader or flighteng). Traits are rolled as usual. The record is stored in the lot. Fee: **380–600**, scaled by level and specialty.
- **On arrival**, they join `G.people` with:
  - `p.merc = {until: G.day + 14, fee, missions: 0}`.
  - **Own kit:** `p.ownKit = {primary, secondary}`, rolled from live, non-Hegemony weapons. Their own items fill those slots, are **not in `G.armory`**, can't be swapped or taken, and `reconcileGear`/`autoEquip` must skip those slots. Head, Body and Gadget slots draw from the armory as normal. `wpnsFromGear` must read own kit.
- **Morale** follows pay and winning, not the cause: they skip cause-wide morale events. Find the callers that apply campaign-level morale and exclude `p.merc`. They still get mission win and loss morale. If the split is unclear, log a blocker.
- **No Hero promotion** while `p.merc` is set (gate it in the hero roll).
- **Contract end:** on the day `G.day >= p.merc.until`, open a small window, "Contract’s up", with the merc's head:
  - **Renew** for the same fee (14 more days). Disabled if unaffordable.
  - **Let them go:** they leave, taking their own kit. Post a news line.
  - **Join the cause:** shown only if `p.merc.missions >= 3 && p.morale >= 70`. It's free. Delete `p.merc`, move `p.ownKit` into `G.armory`, and clear `ownKit`. They are now a normal rebel. Post a friend comm.
- **UI:** a "Mercenary" line on the personnel file, the purple loadout card in the Arsenal rail, and "N days left".
- `missions` increments in the same place `creditMission` runs.

---

## 6. Phone (≤ 900px container)

This follows the existing sr-theme phone rules. The rail becomes the drawer and the command bar stacks; the CSS below covers the rest.
- **Black Market:** the grid goes 2 columns and scrolls. A compact **Sweet Tooth strip** (`.bm-strip`: 40px head plus her current line) sits above the grid. The full fence panel stays in the drawer. Comms hide on this view.
- **Arsenal:** the dossier stacks above the grid, the grid goes 4 columns (as the Gear Grid does today), bays go 1 column, and Loadouts live in the drawer. The drawer button label becomes "Loadouts".

---

## 7. Build order and checks

Check in with the designer after Phase 2.

1. **Arsenal + Head/Body slots + Sell.** Remove `winMode==='gear'`. `tools/arsenal-smoke.js` must cover:
   - the tab opens, and all 7 chips render;
   - the "All kit" free and locked cells add up to the capacity row;
   - selecting the Akli lights exactly its holders' slots;
   - selling a free unit adds `floor(140×0.3)` credits and decrements the count;
   - selling the carbine is disabled;
   - an old save loads with `head/body` added and Hardhats auto-equipped.
2. **Black Market (kit only).** `tools/market-smoke.js` must cover:
   - the day-1 roll has 6 lots, 3+ of them kit, at least 1 weapon;
   - no lot is heg, dropOnly or not live;
   - the same seed and week give the same lots after a save and load;
   - Advance day to day 8 restocks;
   - a buy decrements stock and credits and adds to the armory;
   - unaffordable lots disable Buy;
   - Buy all is disabled with stock 1;
   - the Nyx Access discount applies.
3. **Mercenaries.** Extend the market smoke: hire (needs a bunk), arrival next day, own kit locked, contract end at +14, renew / let go / join paths, and no Hero roll while a merc.
4. **Ships, vehicles, ship weapons.** Pad check, 2-day delivery, landing in `G.fighters` / `G.vehicles`, `G.shipKit` stock.
5. **Phone pass** at 390×844.

Run every `tools/*-smoke.js` before merging.

---

## 8. DESIGN_BLOCKERS entries to add

- **Armour effects:** proposed Head +1 def, Police Vest +2 def, hats +0. Shipped without effect until confirmed?
- **Items with no mechanics yet** (excluded from the market until built): Improvised Plasma SMG, Repurposed Mining Laser, Molotov, Guardian Angel Drone, Auto Core Charge, Stim as an item, HG-40, Power Baton, Riot Shield, Auto Plasma Hand. Possibly Improvised Rocket Launcher and Frontier Floatin’ Truck (no stats).
- **Prices, market weights and `KIT` live in `base.js`,** not the database. Move them to `db.json` when personal kit joins it.
- **Rev 2+ market weights.**
- **Ship weapon storage** (`G.shipKit`), if hangar loadouts can't draw from a store yet.
- **Maker TBC:** Cowboy No.4, Varmint Shotgun, Longhorn ’28, Stim, Cowboy Hat, Baseball Cap, BLS-T, Door Mounted Gun, Riot Transport Cruiser.
- **Fleet tab:** the Gear doc gives ships their own tab. For now ships live in Arsenal (designer: "fine for now").
- **Sweet Tooth's art:** she needs an `SR_ART` character spec. The mockup stand-in had a big round head, a teal headscarf with gold dots, an eyepatch, a gold-tooth grin, a gold earring and a pink jacket. The art chat owns the final look.

---

## 9. `game/ui/sr-kit.css`

Link it after `sr-theme.css` in `game/index.html` (and `base.html` if that page shares the shell).

The CSS itself is checked in at `game/ui/sr-kit.css` (saved from this handoff, verbatim).
