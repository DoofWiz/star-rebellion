# Release 0.2 playtest fixes: handoff

**For:** Claude Code in `DoofWiz/star-rebellion`.
**Save as** `docs/FEEDBACK-0.2-HANDOFF.md`.
**Source:** the designer's playtest of release 0.2 (`main` at `cfbc1e3`), 8 October 2026. Four reports, numbered as
the designer gave them. Each section says what is happening (with the code that causes it), the fix, and the test.

---

## 0. Ground rules

- **Branch** from `main`.
- **Follow `CLAUDE.md`.**
  - Log every decision and reading below in `docs/DESIGN_BLOCKERS.md` (§5), using the next free ids.
  - A new save field needs a `MIGRATIONS` entry.
  - Run every `tools/*-smoke.js` before each commit.
- **No new player-facing words of your own.** Where text is needed, put `[TEXT NEEDED: what this must say]`
  and list it in the blocker (§5). New prologue lines go in `PRO_TEXT`; tutorial text goes in `docs/TUTORIALS.md`
  while planned.
- **Numbers marked *placeholder*** are mine. Put each in one named constant with a `// placeholder` comment and list
  it in the blocker so the designer can tune it.
- **Commit per section** (§1 to §4), in that order. §3 depends on §2 (the barracks tutorial is a spend the economy
  must cover).

| # | Report | Cause, in one line |
|---|---|---|
| 1 | Rescue Tachi is broken | The prisoner is a separate squad-side unit parked where the truck starts, not inside it |
| 1b | Enemies ignore cover | The AI holds or charges in the open; guards guard an empty road |
| 2 | The base is never taught | Every prologue recruit is `must:true`, which skips the bunk check |
| 3 | Materials soft lock | The prologue has no materials income at all, and the smoke test hides it |
| 4 | Market art clipped | Fixed 192×120 art in a well that shrinks to as little as 4px |

---

## 1. Rescue Tachi (Ambush: Extract VIP)

### 1.1 What's happening

| What the designer saw | Cause |
|---|---|
| Tachi sprints from the Marta to the truck in the opening cinematic | `csUpdate()` (`game/js/ground.js` ~5843) walks **every** `side==='reb'` unit out of the transport to its spawn point. The caged VIP is `side:'reb'`, so she walks with the squad, to the truck's start position. The same bug hits *Rescue Dissident* (she walks into the cell) and *Steal the Strider* (the Strider walks into the yard). |
| The truck vanishes while Tachi stands on the pad | `initUnits()` (~871) places the VIP at `SCN.cage` or, with no cage, at `PAD` (the truck's start, `{x:1000,y:770}`). She is a standalone unit, not linked to the truck. After the cinematic, fog hides the truck (`unitSeen()`, ~2072: enemy units need sight) but always draws the squad side, so she is left standing alone on the road. When the alarm goes and the truck drives east, she stays put. |
| Tachi is in the roster before she has joined | The squad rail (`unitRow()`, ~6423) lists every `side:'reb'` unit, so she is a squad row from deployment, tagged *In the cell*. On the board, `msRewards()` (`game/js/base.js` ~5848) shows her as a **people** reward chip, which reads as "she joins your crew", even though `noRecruit` is set. Both are fixed below. |

The mechanics underneath work: release is placed at the stalled truck's doors (`holdStopped()`, ~1065) and frees her
there. `tools/ambush-smoke.js` checks `vip.away&&vip.caged` but never where she is or what the cinematic does,
which is why this shipped.

### 1.2 Fix: the prisoner rides in the truck

1. **A held unit.** Replace `caged` + a fixed position with `heldIn:<vehicle id>` for the ambush. Each frame, a held unit's
   `x,y` is set to its vehicle's: do it in `vehSync()`, which already does this for crew. A held unit is:
   - not drawn, not in the squad rail, not selectable, not targetable, not in `threatsTo()` / `inContact()`;
   - never hurt by fire, blasts or grenades aimed at the vehicle (the truck stalls rather than blows up already);
   - **not** a seat occupant. Don't use the vehicle seat system: `deployUnits()` empties every bay seat when the alarm
     goes up, and `vehDestroyed()` throws and wounds the crew.
2. **Release.** Working the `release` point clears `heldIn`, places her at the doors (as today), and adds her to the
   rail as the escort, with the existing VIP styling (no soldier badge, no level).
3. **If the truck escapes,** the mission fails as now. Her position stays slaved until then, so nothing is left on the
   road.
4. **The cinematic.** Both branches of `csUpdate()` and `endCutscene()` skip any unit that is `vip`, `caged`, `heldIn`
   or `away`. Apply this to every scenario, which fixes *Rescue Dissident* and *Steal the Strider* too.
5. **Before release, she lives in the objectives panel,** not the rail. The *Destroy holding vehicle* row can carry her
   name: `[TEXT NEEDED: objective line naming the prisoner in the truck, e.g. for Tachi]` only if the existing
   `MT.type('ambush')` lines can't already take `{npc}`. Check first; reuse if they can.
6. **The board.** When a mission has `noRecruit`, `msRewards()` must not show the NPC as a people chip. Show the
   prisoner in the mission card's objectives or brief, not its rewards. (Missions without `noRecruit` keep the chip:
   that person does join.)

### 1.3 Fix: enemies use cover

What the AI does today, in `aiPlan()` (~2167) and `pickCoverMove()` (~2291):

- **In range, it holds in the open.** With a target in range, a guard holds braced 50% of the time (35% for the
  Sheriff) **without checking whether it is in cover**.
- **Distance beats cover.** For an unhurt unit, `pickCoverMove(…, toward=true)` scores a spot by distance closed:
  up to +480 for a sprint. Cover is worth +60 plus 4 × the prop's cover value (about +96 for a boulder). So charging
  across open ground nearly always wins.
- **The ambush guards guard nothing.** `guardPt` is the truck's start position on the road. The two `guard:1` riot
  units hold braced within 260 of it, in the open, even after the truck has driven off.

Change:

1. **Hold only in cover.** In range, a unit holds only if `coverOf(tgt,u)` (or `coverVs(u.x,u.y,[tgt])`) gives it
   cover. Otherwise it moves to cover first (`pickCoverMove(u,tgt,MOVE_R,false)`), then fires.
2. **Rebalance `pickCoverMove()`.**
   - Clamp the distance term to ±`AI_ADVANCE_CAP` (*placeholder* 120).
   - A spot with no cover from the target, in its line of sight and range: −`AI_EXPOSED` (*placeholder* 90).
   - Keep the rest of the scoring (claims, grenades, not sharing the enemy's cover).
   - Units with a riot shield are exempt from the exposure penalty: the shield is their cover.
3. **Ambush guards escort the truck.** In `ambush` mode, `guardPt` is a function: the holding vehicle's position
   while it is moving or stalled. Guards pick cover within 260 of that point, not of the road where it started.
4. **Don't add props to fix behaviour.** The ambush map already has two lines of boulders, wagons and crates either
   side of the road. If the metric below still fails after the AI change, log it as a map reading rather than
   moving props.

### 1.4 Tests

Extend `tools/ambush-smoke.js`:

- **Cinematic:** with the cinematic running (not skipped), sample the VIP every 100ms. Assert she never moves and is
  never drawn. Repeat for `rescue` and `strider`.
- **Riding:** after the cinematic, she is not in the rail (`#rail` rows), not in `actorList()`, and her position
  equals the truck's. Run alerted rounds: as the truck moves, her position still equals the truck's.
- **Release:** stall the truck, work the doors, then assert she is in the rail as the escort at the doors.
- **Board:** Rescue Tachi's card has no people reward chip; a generic `ambush` mission (no `noRecruit`) still has one.

Add an AI cover check (in `tools/cover-smoke.js`):

- **Metric:** on the ambush map, set the alarm, then run 6 rounds with the squad holding at fixed points. At the end
  of each round, count the share of law units on foot (shield units excluded) that have cover against their nearest
  rebel.
- **Assert:** the share is at least `AI_COVER_MIN` (*placeholder* 60%).
- **Print** the before and after numbers in the commit message.

---

## 2. The base is never taught

### 2.1 What's happening

- **Every story recruit skips the bunk check.** The recruit accept handler only blocks a recruit with no free bunk
  when `!must` (`game/js/base.js` ~8159). Every prologue recruit offer is `must:true`: Venn's Soldier (beat 10),
  Tachi's three Pilots (beat 19) and the roster safety net.
- **So the base never comes up.** A new game has 6 bunks (one 2-tile Barracks, 3 beds a tile). The crew goes 4 →
  Sera 5 → Venn's Soldier 6 → three Pilots 9, with no prompt. The first time bunks ever stop the player is hiring
  the mercenary in beat 21, and there the only explanation is the disabled button's tooltip.
- **The smoke test hides it.** `tools/prologue-smoke.js` pushes a Barracks room straight into `G.rooms` at that
  point.
- **No room is ever introduced.** Nothing in the prologue asks the player to build anything until the Hangar in beat
  22.

The design doc has no base beats, so this is a gap in the authored flow, not a mis-port. The fix below is my
proposal; its defaults are logged for the designer (§5).

### 2.2 Fix part 1: room tutorials as side beats

Rooms are best taught when they become relevant: bunks run out, someone comes back hurt, a ship comes back damaged.
That doesn't fit the linear `PROLOGUE` list, so give the runner a second, small list.

```js
/* game/js/prologue.js: side beats fire once, whenever their condition first holds, without moving G.prologue.at */
const SIDE=[
  {id:'room_barracks', when:h=>h.bunksFull(), does:[{tutorial:'buildBarracks'}], until:{built:'barracks'}},
  {id:'room_infirmary', when:h=>h.anyInjured()&&!h.hasRoom('infirmary'), does:[{tutorial:'buildInfirmary'}], until:{built:'infirmary'}},
  {id:'room_workshop', when:h=>h.anyShipDamaged()&&!h.hasRoom('workshop'), does:[{tutorial:'buildWorkshop'}], until:{built:'workshop'}},
];
```

- **How the runner handles it.**
  - After each event, the runner checks `SIDE` as well as the current beat.
  - A side beat's actions go through the same report queue (`{t:'pro'}`), so they never open over a reward screen,
    a splash or the day banner (§2.4 of `docs/PROLOGUE-HANDOFF.md`).
  - One side beat runs at a time.
  - Record fired and finished side beats in `G.prologue.flags.side`. This needs a migration: default it to `{}`.
- **When side beats fire.**
  - They fire before and after `frontier`. A tutorial is still useful after the authored story ends.
  - On migration, mark a side beat finished if the save already has that room.
  - Saves already past `frontier` before this change get every side beat marked finished. Don't teach a veteran.
- **What a side beat never does.** It never blocks a main beat. Its `until` only ends the side beat's own tutorial
  steps.
- **Developer tools.** The Prologue debug panel lists side beats with *Fire now*. *Replay tutorials* resets them too.
- **Adding one later** means adding an entry to `SIDE` (and its text) only. Prove it in the smoke test, as
  `docs/PROLOGUE-HANDOFF.md` §9 does for beats.

### 2.3 Fix part 2: the side beats to build

All three use the guided stepper. Text is `[TEXT NEEDED]` in every step.

| Side beat | Fires when | Steps (pointer at, until) |
|---|---|---|
| `room_barracks` | Bunks are full: `bunksUsed() >= bunkCap()`. On a normal run, this happens when Venn's Soldier joins (beat 10). | 1. The **Base** tab (if not on it). 2. A free floor tile beside the Barracks (merging rooms). 3. **Build → Barracks**. 4. **Advance day** until built. 5. One card on the Barracks' **Bunks** upgrade (no action required) |
| `room_infirmary` | A rebel first comes home injured | 1. A floor tile. 2. **Build → Infirmary**. 3. A card: the injured recover faster there |
| `room_workshop` | A ship first comes home damaged. Not the Marta's starting 70% hull: that counts only once she has flown. | 1. A floor tile. 2. **Build → Workshop**. 3. A card: ships repair there |

- **Placing the pointer.** If no free floor tile is next to the Barracks, point at a rubble tile and add an **Excavate**
  step first.
- **Step 2 of `room_barracks`.** Pick the tile in code (a search like `hangarBlockAt()`'s) so the pointer has one place
  to go.
- **Order.** If two side beats are due at once, run them in `SIDE` order.
- **What's left out.** The Storeroom, Intelligence Center, Training Hall, Tech Lab and Diplomatic Quarter get no side
  beat for now (logged as a reading, §5).

### 2.4 Fix part 3: what a missing bunk costs

A story recruit must still never be lost, so `must` cards still join with no bunk. But now it costs something:

- **Sleeping rough.** A rebel over the bunk cap gets the status *Sleeping rough*. Choose who by: newest arrival first.
  - Morale −`ROUGH_MORALE` a day (*placeholder* 2) while anyone is sleeping rough.
  - Those rebels recover from exhaustion at half speed.
  - It ends the moment a bunk frees up.
  - The recruit card for a `must` recruit says so instead of *No bunks free*: `[TEXT NEEDED: card line, this one
    joins but will sleep rough until a bunk is free]`.
- **Where it shows.** The Barracks room panel shows *Bunks 7/6*, and the crew list shows the status.
- **Non-`must` recruits** are still turned away with no bunk, as today.
- **Save.** No new field: the status is derived from `bunksUsed()` versus `bunkCap()` each time it's needed.

### 2.5 Tests

Add to `tools/prologue-smoke.js`:

- **The barracks side beat.**
  - When Venn's Soldier joins, `room_barracks` fires through the queue, after the recruit pop-up, not over it.
  - Its pointer is at a real free tile beside the Barracks.
  - Building there (with `buildAt`, not by pushing a room) and advancing the day finishes it.
  - `G.prologue.at` never changed during any of this.
- **Infirmary and workshop.** Injure a rebel through a mission debrief: `room_infirmary` fires once. Damage a ship:
  `room_workshop` fires once.
- **Sleeping rough.** Force a `must` recruit over the cap: they join, they are *Sleeping rough*, and morale drops at
  the next day. Build a Barracks tile: the status clears.
- **Migration.** A save past `frontier` gets every side beat marked finished, and none fires.
- **Adding a side beat.** One added at runtime fires.

---

## 3. Materials (and credits) soft lock

### 3.1 What's happening

**Nothing in the prologue pays materials.**

- **Mission rewards:**
  - *Steal the Cross*: 500c, 120s
  - *Torch the Depots*: 5 intel
  - *Steal Fuel*: 240 fuel, 300c
  - *Rescue Tachi*: 400c
  - *Raid the Bunker*: ships
- **Other income:**
  - Cass gives 16 supplies a day and Venn 48 credits a day.
  - Ground loot is credits and supplies only (`applyDebrief`, ~9354).
  - Patrols can salvage materials, but they need a spare ship and pilot.

**The critical path costs far more than the starting 400 materials.** From `BUILDS`, `buildCostAt`, `startRestore`,
`SHIP_PRICE` and `mercLot`:

| Spend on the critical path | Credits | Materials | Supplies |
|---|---|---|---|
| Restore the Marta (needed for *Steal the Cross*) | 240 | 160 | — |
| Barracks tile 3 (new in §2) | 380 | 160 | 80 |
| Room for three pilots and a merc: the Bunks upgrade on 3 tiles | 260 | 140 | — |
| Mercenary (beat 21), first 14 days | 380–600 | — | — |
| Second Hangar section (beat 22) | 960 | 800 | — |
| Second Graf hauler (beat 22) | 3,200 | — | — |
| **Total** | **~5,500** | **1,260** | **80** |

**Against that, my rough estimate of income** (the test in §3.3 gives the real numbers):

- **Materials:** 400 at the start, and nothing after that. That's about **860 short**. This is the soft lock the
  designer hit at the Hangar, which beat 22 needs before *Raid the Bunker* can start.
- **Credits:**
  - 1,000 at the start.
  - 1,200 from mission rewards.
  - Roughly 500 to 700 from Venn's income.
  - Some ground loot.
  - That's roughly **2,000 to 3,000 short**. The Graf alone is 3,200. The designer will hit this next, once
    materials are fixed.

**Why the tests missed it.** `tools/prologue-smoke.js` adds 400 credits and 300 materials to restore the Marta,
adds 8,000 credits at the market, and pushes the Barracks and Hangar rooms straight into `G.rooms`. No test has ever
played the prologue on its own economy.

### 3.2 Fix

Do these in order. The test (step 1) decides the numbers in steps 3 and 4.

1. **Build the ledger test first** (§3.3). Run it on `main` and paste the shortfall table into the commit message.
2. **Salvage: a materials income that isn't a one-off.**
   - A Hegemony vehicle destroyed or stalled in a ground mission yields materials:
     `SALVAGE_PER_HP × its max hp`, rounded to 10 (*placeholder* 0.5 per hp).
   - In *Rescue Tachi*, that means the prisoner truck and the escort cruiser.
   - It is paid in the debrief, as a *Salvaged* row on the reward screen next to the loot. Use `gotRes(got,'m',n,
     'salvaged')`, the same as Scavenger's Eye.
   - This works for every ground mission with vehicles, not just the prologue.
3. **Authored prologue rewards.** Add materials (and credits where needed) to the prologue missions' `spec.rew`. Put
   them in the spec, never in the mission type (the same rule as `docs/PROLOGUE-HANDOFF.md` §2.1). Starting values,
   all *placeholders*:

   | Mission | Add |
   |---|---|
   | *Steal the Cross* | 150m |
   | *Torch the Depots* | 200m |
   | *Steal Fuel* | 100m |
   | *Rescue Tachi* | 300m, +400c (on top of its salvage) |

4. **The Graf's prologue price.** The guaranteed Graf lot (beat 22, `marketLot … keep:true`) gets a prologue price,
   `PRO_GRAF_PRICE` (*placeholder* 1,200). Sweet Tooth's lot line can say why:
   `[TEXT NEEDED: Sweet Tooth, a friend-of-Cass price on the hauler]`.
   - After `frontier`, Grafs go back to `SHIP_PRICE`.
   - Without this, credits can't close the gap without large rewards that would then distort every later mission.
5. **An affordability safety net,** like the roster one (`docs/PROLOGUE-HANDOFF.md` §2.8):
   - **Declaring what a beat costs.** A beat or side beat whose `until` needs a spend declares it as
     `needs:{c,m,s}`. These are `room_barracks`, `sweet_tooth` (the merc fee) and `hauler` (Hangar section plus the
     Graf). Work out the amounts with `buildCostAt` and the lot prices, not fixed numbers.
   - **When it fires.** The beat has been running `AFFORD_DAYS` days (*placeholder* 2) and the player still can't
     cover `needs`. Then the beat's contact (Cass for the market beats, Venn otherwise) sends the shortfall plus 10%
     in a comm: `[TEXT NEEDED: the contact sends what's missing]`.
   - **Limits.** It fires once per beat and only before `frontier`. It is a new `grant:{c,m,s}` action, so later
     beats can use it.
6. **Say where to get materials.** Where a build or buy is disabled for materials, its reason already reads *Need X
   more*. Add a second line naming the sources: `[TEXT NEEDED: short hint, where materials come from (salvage,
   patrols, Sources)]`.

### 3.3 Tests

**Add `tools/economy-smoke.js`.** It plays New Game to `frontier` with **no resource injections and no rooms pushed
by hand**. It builds and buys only through the real handlers (`startRestore`, `buildAt`, `startUpgrade`, `buyLot`).
It uses `dbgSkip` for missions, as the prologue test does.

1. **A frugal run.**
   - The player buys only what the beats require.
   - At every beat, log credits, materials and supplies. Write the table to the console.
   - Assert the run reaches `frontier` with no grant from the safety net, and at least `ECON_HEADROOM` (*placeholder*
     10%) to spare at each required spend.
   - Tune the step 3 and 4 numbers until this passes. Put the final table in the commit message.
2. **A spendthrift run.**
   - The player also builds an Infirmary, a Workshop and a Storeroom as soon as they can afford them.
   - Assert the run still reaches `frontier`, with the safety net firing at most once per beat.
3. **Salvage.** Stall the truck in *Rescue Tachi*. The debrief pays its salvage and shows the row.
4. **After the prologue.** After `frontier`, a Graf lot costs `SHIP_PRICE.graf`.

**Then fix `tools/prologue-smoke.js`.** Remove `credits+=400; materials+=300`, `credits+=8000` and the two pushed
rooms. Make it build through `buildAt` like the economy test. All smoke tests must pass.

---

## 4. Black Market art clipped

### 4.1 What's happening

The art is fixed-size, but its well is not:

- `.bm-card .kit-well .it-art` is fixed at **192×120** (`game/ui/sr-kit.css:64`).
- The well is `flex:1;min-height:0` inside a card, and the grid forces two rows to fit the stall's height
  (`grid-template-rows:repeat(2,minmax(0,1fr))`, line 46).
- The well has `overflow:hidden`, so the art is cropped top and bottom (and on phones, side to side).

Measured on `cfbc1e3`:

| Viewport | Well height (weapon card) | Well height (others) | Art |
|---|---|---|---|
| 1440×900 | 92px | 122px | 192×120 |
| 1280×800 | 42px | 72px | 192×120 |
| 1280×720 | **4px** | 32px | 192×120 |
| 390×844 | 61px (148px wide) | 91px | 192×120 |

Weapon cards are worst because their trait icon row takes height from the well. Mercenary cards (`.bm-merc`,
186×96) clip the same way.

**Also seen while checking, at 1280×800:** the news feed (bottom left) sits over the bottom-left lot card.

### 4.2 Fix

1. **The well never collapses.** `.bm-card .kit-well` gets `min-height:96px` (*placeholder*) and keeps `flex:1`.
2. **The art fits its well.**
   - Item, ship, vehicle and ship weapon art scales down to fit inside the well, keeping its 8:5 shape, up to
     192×120.
   - Use `container-type:size` on the well and size the art from `cqw`/`cqh`, or an equivalent. It must not stretch:
     the art is a canvas.
   - The mercenary block (`.bm-merc`) scales the same way. Keep the existing `#sc-base` override for its own-kit art
     (`scenes.css:412`), or fold it into the new rule.
3. **The stall scrolls instead of squeezing.**
   - Rows get a floor: `grid-template-rows:none; grid-auto-rows:minmax(BM_CARD_MIN,1fr)`, with `BM_CARD_MIN`
     *placeholder* 250px.
   - The stall scrolls vertically when two rows don't fit.
   - The phone rule (`grid-auto-rows:230px`) stays.
4. **The news feed** doesn't cover the stall on the Black Market (and the Arsenal). Either the stall's bottom
   clears it, or the feed hides on those views. Pick whichever matches how the Galaxy view already handles it.

### 4.3 Test

Add to `tools/market-smoke.js`, at 1440×900, 1280×800, 1280×720 and 390×844:

- Roll a stock with a weapon, a ship and a mercenary.
- For every lot, assert the well is at least 96px tall, and the art's bounding box lies inside the well's (±1px).
- Assert no news item's box overlaps a lot card.
- Save a screenshot at each size to `tools/out/` (if the folder is gitignored; otherwise skip the screenshots).

---

## 5. DESIGN_BLOCKERS entries to add

- **New: "0.2 playtest: decisions and readings".** Each with the interim choice:
  - **Base tutorials** are side beats that fire when the room becomes relevant (bunks full, first injury, first
    damaged ship), not fixed story beats. Only the Barracks, Infirmary and Workshop get one for now.
  - **Story recruits** still join with no bunk, but *sleep rough* (a morale cost, slower exhaustion recovery) until
    one is free.
  - **Salvage:** destroyed or stalled Hegemony vehicles pay materials in every ground mission.
  - **Prologue rewards** gain materials (and *Rescue Tachi* credits). These sit in each mission's spec.
  - **The prologue Graf** is sold at a friend-of-Cass price; normal price after `frontier`.
  - **The affordability safety net** sends the shortfall once per beat, from the beat's contact.
  - **Ambush guards** escort the truck rather than guarding its start position.
- **New: "0.2 playtest: placeholders".** Every *placeholder* constant above, with its value and the economy table
  from §3.3.
- **"Prologue text still to write": add** every new `[TEXT NEEDED]` from §1, §2 and §3, with where each shows up.
- **New: "Market art at small heights".** Only if §4's fix needs the card layout to change in a way the screens
  handoff didn't cover.

---

## 6. Done means

- [ ] *Rescue Tachi*: Tachi doesn't move in the cinematic, rides in the truck, isn't in the rail or rewards before
      release, and is freed at the doors. *Rescue Dissident* and *Steal the Strider* cinematics are fixed too.
- [ ] Enemies hold only in cover, and the cover metric passes. Ambush guards follow the truck.
- [ ] Side beats run. The Barracks tutorial fires when bunks fill, and the Infirmary and Workshop ones when relevant.
      *Sleeping rough* works.
- [ ] `tools/economy-smoke.js` plays New Game to `frontier` with no injections, frugal and spendthrift. Its table is
      in the commit and the blocker.
- [ ] `tools/prologue-smoke.js` builds and buys for real.
- [ ] Market art is never clipped at the four test sizes, and no news covers a lot.
- [ ] The blockers in §5 are added. Every smoke test passes.
