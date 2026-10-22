# Handoff: the soft lock before Raid the Bunker, and excavating in one go

From the designer's playtest (22 Oct 2026), on `main` at `852602d`. Two issues:

1. **Soft lock before *Raid the Bunker*, again.** The designer excavated 16 rubble tiles and built the second Hangar
   section. That left too little to buy the second Graf. The Black Market didn't show a Graf that stays on the stall.
2. **Excavating is tedious.** Each tile takes two clicks (tile, then *Excavate*). A Hangar section is 16 tiles, so
   that is 32 clicks before the build can even be placed.

Read `docs/FEEDBACK-0.2-HANDOFF.md` §3 first. This builds on the affordability net and the guaranteed Graf lot from
there. Placeholders are marked *placeholder*. Text the designer still has to write is marked `[TEXT NEEDED: …]`.

---

## 1. The soft lock

### 1.1 What the beat costs

Beat 22 (`hauler`) asks for a second Hangar section and a second Graf:

| Spend | Credits | Materials |
|---|---|---|
| Hangar section (`BUILDS.hangar`, first extra section) | 960 | 800 |
| Excavation, 12 to 16 rubble tiles × `EXCAVATE.m` 40 | 0 | 480 to 640 |
| Graf (`PRO_GRAF_PRICE`) | 1,000 | 0 |
| **Total** | **1,960** | **1,280 to 1,440** |

`tools/economy-smoke.js` passes on `main`. Its frugal run reaches the bunker with 364 credits to spare. It never
locks because it only plays the scripted order. The designer can lock in three ways that the test never tries.

### 1.2 Why it locks

**A. The net only fires once per beat.** `affordTick()` in `game/js/prologue.js` sets `p.flags.granted[x.id]=1` and
then skips that beat for good. The hauler beat's `needs` is the Hangar and the Graf together. So:
- The net covers a materials gap for the Hangar.
- The player then spends credits elsewhere: a recruit, kit, a mercenary renewal.
- They are now short for the Graf, and the net never fires again. That is a hard lock.

**B. The net prices the cheapest Hangar block, not the one the player builds.** `proCost('hangar')` uses
`hangarPlan()`, the 4 × 4 block with the fewest rubble tiles. The test's block has 12. The designer dug 16, which is
160 materials more than the net budgeted. Once A is fixed this gap closes itself on the next check. Still, the net
should price what the player is actually building (§1.3, step 3).

**C. The Graf lot and the net depend on beat 22, but the bunker shows up at beat 18.**
- *Raid the Bunker* is on the board from beat 18.
- Its plan window already asks for the second hauler and the pad space (`precondList()`).
- The guaranteed Graf lot (`marketLot … keep:true`) and the hauler net only start at beat 22.
- Beat 22 only starts once beat 21 ends, and beat 21 ends only when the mercenary is hired (`until:{hired:true}`).

So a player who follows the plan window can find no Graf on the stall and no net to help. That covers someone who
goes straight to the Hangar, or who fills the fifth soldier slot by recruiting instead of hiring the mercenary. Beat
21 then never ends, so beat 22 never starts. This matches "the black market does not have a second transport
permanently available". It is not yet confirmed against the designer's save.

### 1.3 Fix

Do these in order.

1. **Re-arm the net.**
   - After a grant, a beat can fire again if it is still short for another `AFFORD_DAYS` days.
   - Keep the grant to the shortfall of what the beat still has to pay, plus `AFFORD_EXTRA`, as today. It can't be
     farmed, because it only tops up what is genuinely still owed.
   - Turn `p.flags.granted[id]` into a count. Existing saves hold `1`, which already reads as one grant, so no
     migration is needed.
   - Each grant after the first uses its own line: `[TEXT NEEDED: the contact sends what's missing, again (a little
     exasperated)]` (key `affordGrantAgain`).
   - **This unsticks the designer's current save** after two in-game days, provided the beat is `hauler` (or the
     standing need below applies).

2. **A standing need for the bunker, independent of the beat.** Add a side beat `bunker_hauler` to `SIDE`:
   - `when`: *Raid the Bunker* is on the board and not won, `tab.market` is open, and either
     `h.transports()<2` or `!h.hangarFits()`.
   - `does`: `{marketLot:{cat:'ship',id:'graf',keep:true}}`. It is already a no-op if the lot exists, so beat 22's own
     `marketLot` stays harmless.
   - `needs`: `h.cost(['hangar','graf'])`, re-armed as in step 1.
   - `until`: `h.transports()>=2 && h.hangarFits()`.
   - No tutorial. Beat 22 still teaches it when it comes.
   - With this, the Graf is always on the stall while the bunker needs it, whichever order the player takes.

3. **Price the Hangar the player is actually building.** In `proCost('hangar')`:
   - If a Hangar footprint is reserved (an "Excavate & build" from §2.1 under way), the Hangar is already paid for:
     return `{}`.
   - Otherwise, if the player has started excavating a 4 × 4 block (any rubble tile with `dig` sits inside a block
     that `hangarBlockAt` would accept once cleared), price that block: rubble still to dig, plus the section.
   - Otherwise keep `hangarPlan()`.

4. **Let beat 21 end without the mercenary.** Beat 21's `until` becomes "hired a mercenary, **or** the bunker's
   soldier requirement is met" (`req.team` able soldiers, counting the ones arriving tomorrow). The merc tutorial ends
   on its closing card, as a side beat does when it is met early. The guaranteed merc lot stays on the stall.

5. **Make the plan window point at the stall.** In `precondList()`, when the hauler row fails and a guaranteed Graf
   lot is on the stall, the row's detail reads `[TEXT NEEDED: buy the second Graf at Sweet Tooth's stall]`, and
   clicking it opens the Black Market with that lot selected.

### 1.4 Tests

Extend `tools/economy-smoke.js` with a third run, **wayward**. It reaches the frontier in each of these cases:

1. **Hangar first, then broke.**
   - Build the second Hangar section first, on the most expensive valid block (most rubble).
   - Then spend credits on kit until below `PRO_GRAF_PRICE`.
   - The net fires a second time for `hauler` within `AFFORD_DAYS + 1` days, and the Graf can be bought.
2. **No mercenary.**
   - Fill the fifth soldier slot with a recruit and never hire the mercenary.
   - Beat 21 ends.
   - The Graf lot is on the stall from the day `tab.market` opens.
   - Beat 22 starts.
3. **Bunker first.**
   - From beat 19, follow only the bunker plan window's failing rows.
   - The Graf lot is there and the net covers the gap.

Also:
- Replace the spendthrift run's "net fires at most once per beat" check. Instead, check that across the run the
  grants total no more than what the beats needed.
- Add a load test: a save at beat `hauler` with `granted.hauler=1`, too few credits for the Graf, and the Hangar
  built. After `AFFORD_DAYS` days, the grant arrives.

Run every `tools/*-smoke.js` before the merge.

---

## 2. Excavating in one go

Today, `openTilePop()` on a rubble tile shows one *Excavate* card, and `digAt()` digs one tile. A Hangar section
can only be placed on a 4 × 4 block that is all floor (`hangarBlockAt`). Excavation already runs in parallel, one day
per tile, so the clicks are the only cost. Both changes below are mouse-first; phones adapt.

### 2.1 "Excavate & build" (the main fix)

Room placement accepts rubble in its footprint. One action clears the ground and builds the room.

- **Where it's offered.**
  - The build options in the tile pop-up appear on rubble tiles too, not just floor.
  - `hangarBlockAt` accepts blocks that mix floor and rubble. It still refuses bedrock, rooms and blocks that
    run off the map.
  - Single-tile rooms work the same way on a rubble tile.
- **The card.**
  - The build cost, plus an *Excavation* row: `N tiles × 40 materials`.
  - One total.
  - The button reads **Excavate & build** whenever the footprint has rubble, and **Build** otherwise.
  - Hovering the card outlines the footprint on the map, with rubble tiles tinted.
- **What happens.**
  - Everything is paid up front.
  - Every rubble tile in the footprint starts digging at once.
  - The footprint is **reserved**: shown outlined, and other builds can't use it.
  - When the last tile clears, the room goes into build with its normal `days`, with no further click.
  - News: `[TEXT NEEDED: the crew clears the ground for the new {room}]`.
- **Cancel.**
  - Clicking a reserved tile shows *Cancel*.
  - Materials for tiles not yet dug come back, and the build cost comes back in full.
  - Tiles already dug stay dug.
- **Save.** Store reservations in `G.reserved` (`[{key, r, c, w, h, cost}]`). Add a `MIGRATIONS` entry that defaults
  it to `[]`.
- **Tutorials.**
  - The hauler tutorial and the room side beats point at **Excavate & build** on the tile `roomTileFor` /
    `hangarPlan` picks.
  - The separate `base.dig` step drops out when one button does both.
  - Update the guide targets in `guideTarget()` to match.
  - `[TEXT NEEDED: hauler tutorial step for Excavate & build]`.

### 2.2 Drag to excavate (for digging without a room in mind)

- **The drag.** Press on a rubble tile and drag. A rectangle selects every diggable rubble tile under it (not
  bedrock, not ones already digging).
- **The bar.** Releasing shows a small confirm bar by the cursor: **Excavate {n} tiles · {n × 40} materials**, with a
  *Cancel* link.
- **Short on materials.**
  - The bar says how many tiles can be afforded, and digs that many, nearest to where the drag started.
  - With none affordable, the button is disabled and reads like `needWhy()`.
- **Shortcuts.** Shift-click adds or removes single tiles from the selection. Esc cancels.
- **A single click.** Still opens the tile pop-up as today, so nothing is lost.

### 2.3 Tests

New `tools/excavate-smoke.js`:
1. An *Excavate & build* Hangar on a block with 16 rubble tiles.
   - One click charges 960 credits and 1,440 materials (with the section multiplier for later sections).
   - After one day the tiles are floor, the section is building, and with its `days` it is a Hangar section.
2. A cancel mid-dig refunds what it should.
3. A drag over a 4 × 3 rubble patch with materials for 7 tiles digs 7, nearest first.
4. Bedrock and rooms are never selected.
5. A save with a reservation round-trips.

Then re-run `economy-smoke.js`. Its frugal run should place the Hangar with *Excavate & build* (`buildAt` over
rubble) rather than digging tile by tile.

---

## 3. Notes for `docs/DESIGN_BLOCKERS.md`

Nothing here is blocked. If the side beat in §1.3 step 2 clashes with how the hauler tutorial expects to add the lot
itself, log it there and keep the side beat: the player must never be without the Graf while the bunker needs it.
