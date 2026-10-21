# Type 3.5, playtest 1: the designer's feedback and the fixes

**For:** Claude Code in `DoofWiz/star-rebellion`, on `space-combat-testing` (after `4389f30`, Type 3.5 P6).
**Save as** `docs/ARENA-HC35-FEEDBACK-1.md`.
**Read first:** `docs/ARENA-HC35-HANDOFF.md` (what 3.5 is), and `docs/archive/ARENA-HC-FEEDBACK-1.md` to `-4.md` (how
earlier playtest notes were handled).
**Status:** designed by Claude Chat from the designer's notes; build phases K0 to K6 now. **K7, the HUD layout pass,
waits for the designer's mock-ups.** Don't start it, and don't rearrange the HUD beyond what K0 to K6 say.
**Revised 20 October** with the designer's second set of notes (items 10 to 14: §1.1, §3.7 to §3.11).

The designer sent these notes to the design side rather than straight to you, so that the fixes are designed before
they're built. Each item below says what's wrong in the code (§2), then what to build (§3). Where a call was needed
it is made here and logged in §6. Don't re-open a call while building: log anything that doesn't work and move on.

---

## 1. The designer's notes (19 October, after playing the 3.5 build), verbatim

1. It's really hard to tell what the player's ships are actively doing. I didn't even notice that the Brickbat had
   taken the cargo from the enemy ship. I think some very clear visual cues here could be a big benefit.
2. Equally, I think some other visually cues need refinement. I don't think I need to see the damage numbers on the
   screen when a shot hits something. I also think the shield hit effect needs to clearly map over the front half and
   back half of the ship neatly to show what arc is protected. I think healthbars turning to orange and then red as
   they get lower is an important feature too.
3. I think that for the type 3.5 arena flow, you should recreate the currently implemented mission tab from the
   vanilla game so it's a mock up of the player's journey through space combat, starting from the mission board and
   then going through the planning steps. I want you to give a much better user experience for the planning stages,
   rather than having them all in a side bar. I'd prefer it to be pop up holographic windows, one after the ohter,
   with back and forward buttons. I don't want you to use default system hover for hover text features, I want an
   actual in-game hover box to appear when that happens.
4. When the brickbat with the boarding ability was trying to board, it get ramming into the freighter instead, so it
   never seemed to be able to actually board it.
5. It is very difficult to see, visually, even with a representation of damage states, what kind of damage something
   has suffered. It seems that engines are targetable but how do I actually check to see what the status of those
   engines is?
6. Boost shields seems to be a bit too frequent. I think it should have a longer cooldown. I also don't think we need
   the boost shields text any more. Actually giving some animation to the shield bar as it replenishes would be far
   better.
7. The unmanned ship ram didn't really seem to do anything to the freighter, but maybe I'm misunderstanding what it
   should look like. It got 'shot down' next to the freighter. After action report says it did something but I didn't
   see it, it didn't look visually cool.
8. The freighter's turrets are way too accurate. I know we haven't established 'turret' behaviour yet, but turrets on
   larger ships should find it quite hard to hit fast moving ships.
9. I'm not sure how I feel about the ship icons / visuals scaling with how zoomed out I am. I think I'd prefer they
   stay the same size but we use an icon past a certain point for them.

> There's a lot there but the UI/HUD feels really bad to me right now. I think we need to optimise that. Before you
> go and create that I'm going to create some mock ups.

The designer also attached a screenshot of the debrief (FAILED, Steal). It shows "Ollo (drifting)" under Losses, and
"What decided it" lists the player's own good calls before the reason the mission failed.

### 1.1 More notes (20 October, a Pirate run), verbatim

10. If the freighter gets bumped it will change direction and keep going in the direction it was bumped. I think we
    need some kind of hierarchy for the physics result here. A smaller ship bumping into a big ship should not
    completely change its trajectory, especially not permanently, So the freighter should start heading for its
    target if its knocked off course, but also the means to change its trajectory should come from a mixture of size
    of the source of impact, speed of the source of impact, and so on.
11. I like the new 'spin out and explode' animation but it feels a bit weird when a larger ship like a brickbat starts
    spinning out really fast. The animation speed should be based upon how much the ship was turning by when it was
    destroyed to determine its spin speed.
12. When a wing was called in as reinforcements, they did not appear in the bottom left panel.
13. It's completely unclear what the 'pirate' objective does. by the end of the mission i had two wings just circling
    the freighter endlessly, not achieving anything. This is after they sent through the offer cargo if we let them go
    offer, and I chose to ignore it. How does 'pirate' actually achieve its objective? Is something broken here?
14. I'd like to suggest that you build a tool into the project that allows you to evaluate exactly what happens during
    my runs of this simulation. That will save credits in the long run rather than something new every time, if
    that's how you're doing that.

Screenshots: the map in Phase 3 of a Pirate run. It shows "-0.0" damage numbers, tiles reading "INTIM" and "WAI…",
Dagger with Executive Intimidate, and Anvil holding. The debrief shows FAILED; "Brask (drifting), Ollo (no pod)"; and
"You answered their hail at 2:14: no deal."

---

## 2. What's wrong in the code (the diagnosis)

Line numbers are for `4389f30`.

**The root of items 4, 7 and part of 9 is one thing: the art grows when you zoom out, but the sim doesn't.**
`iconBoost()` (`arena-hc.js:140`, `max(1, min(3.2, 0.5/cam.z))`) scales every ship's drawing by up to 3.2 ×. The sim's
distances (`bodyR`, `hullHit`, `DOCK_OFF`, `RAM_REACH`) are in world units and don't change. So at an ordinary zoom a
docked Brickbat is drawn with its tail inside the freighter's hull, and a ram that "hits" 373 units from the
freighter's centre explodes in what looks like empty space. Removing the boost (item 9) fixes what the player *sees*;
the sim fixes in K2 make what the sim *does* match.

| # | What the code does today | Where |
|---|---|---|
| 1 | The roster words for every 3.5 behaviour are raw ids: `BEH` has no 3.5 kinds, so tiles read `DOCK35`, `DOCKED`, `HOLDOFF`, `INTIM`, `FAR`, `WAITPT`, `RAM35`, `FETCH35`, all with the hold glyph. `beh.why` ("carrying 2 home") is never shown. The 3.5 `think` hook returns early, so `assessOf`, the new-job speech bubble and `abilityTick` are skipped. Intent lines, attack rings, shield arcs and hull pips show only for the selected wing (C-72). After hauling, the Brickbat looks the same loaded or empty. Tagging progress is never drawn | `arena-hc.js:1045-1049`, `:345-350`, `:499-575`; `sim-hc.js:774`, `:789-792`; `arena-hc35.js:473-474`, `:548-549` |
| 2 | Damage numbers come from `projTick`'s `floater(t,'-N')` every 0.35 s, and on the freighter they read 4 × the real damage (`dmgAcc` is added before `GUN_VS_CAP` 0.25). The shield arcs are 120° circles at the nose and tail, so they don't read as "front half / back half", and the hex splash isn't placed on the arc that was hit. Canvas health cells go green → gold → hazard; tile hull bars stay green until 35%; the pilot panel bars never change colour | `sim-hc.js:375`, `:406-408`; `sim-hc35.js:477`; `arena-hc.js:247-261`; `sr-theme.js:177`; `arena.css:306`, `:409` |
| 3 | Planning is a 440 px side panel (`.h35-brief`) over the plan map. The board is a scrim card, not the game's Missions tab. Native `title=` hover text is on 8 elements in `arena-hc35.js` and 4 in `arena-hc.js`. There are two tooltip systems that don't share a format (`#hcTip` with string keys; the kit's `.sr-tip` with JSON) | `arena-hc35.js:15`, `:123-151`, `:648`; `arena-hc.js:1180-1214`; `sr-hud.js:66-136` |
| 4 | The boarder is ordered into a dock point 191 from the freighter's centre, but collision is 173 and crash avoidance pushes at 263, so the approach fights the evasion. Then `dockTick` teleports it up to 900 units to a side picked by a hash of its id, not the side it came from. At icon boost the docked ship is drawn inside the hull. And a Boarding-party Brickbat in a wing whose Executive isn't Board makes attack runs at the freighter like any fighter | `sim-hc35.js:574-590`, `:617`, `:634`, `:896-900`; `sim-hc.js:1786` |
| 5 | No UI shows the hp of the engines, comms, turrets or cargo. Enemies can't be selected (`clickShip` needs `s.wing`). The art draws all four turrets alive and aimed at one point, even when they're dead | `arena-hc.js:1066`; `arena-hc35.js:464-470`; `sr-art.js:978-984` |
| 6 | Boost Shields has an 8 s cooldown, fires on AUTO at under 50% shield after any hit, and floats "BOOST SHIELDS" text plus a badge. The arc fill jumps straight to its new value | `sim-hc.js:1133`, `:1164`, `:1197`, `:1207`; `arena-hc.js:257`, `:599` |
| 7 | The ram counts as a hit anywhere within 373 of the freighter's centre (about 255 beyond the drawn hull), sets `alive=false`, and `fxSense` plays an ordinary ship explosion there: it looks shot down. The damage goes to whichever subsystem is nearest the ram, but the debrief names the one you aimed at. Steering avoidance pushes it off its own target. If it's actually shot down, nothing is recorded | `sim-hc35.js:1181-1264`; `arena-hc.js:432-434` |
| 8 | Each turret re-targets every tick, has no traverse rate, leads perfectly, and spreads only ±0.06 rad at any range or target speed. Nothing dodges bolts | `sim-hc35.js:848-862`; `sim-hc.js:316` |
| 9 | Ships are drawn up to 3.2 × bigger as you zoom out; there is no icon mode | `arena-hc.js:140`, every `iconBoost()` call |
| Debrief | "drifting" is a pod still unresolved when the mission ends. `whyLines` lists causes in the order they were recorded, not by how much they mattered | `arena-hc35.js:369-421` |
| 10 | **The freighter tries to steer back but can't turn.** It's flown by High Command's `fly()`, whose turn cap falls with the square of speed below corner speed. At its cruise of about 55 u/s, that's about 0.08° a second, so a 30° knock takes six and a half minutes to correct, longer than the whole crossing. The prize branch already steers the freighter by hand for this reason (`PRIZE_TURN`). The bump splits impulse by **size class** (`ma=a.row.size`), so a Cross (5) gives the FL-400 (10) a third of the impulse: about 173 u/s sideways, three times its cruise. The bump's spin isn't damped by size either. Knocked off its leg, it may never pass the leg check, so it never jumps. When it's disabled, the layer's drift overwrites its position after collisions, so bumps are thrown away | `sim-hc35.js:625-627`, `:817-835`; `sim-hc.js:95`, `:1755`, `:1796`, `:1801-1836` |
| 11 | The death spiral's spin is a fixed `spiralSpin` 7 rad/s for every class, with a random direction, and it accelerates to 4 × over the fall. The ship's real turn (`s.w`, `s.turnW`) is still on the dead ship but isn't passed to the effect | `sr-space-fx.js:66-68`, `:200`, `:705-710`, `:758`; `arena-hc.js:433-434` |
| 12 | The roster only rebuilds when the seed or scenario changes (`rosterBuilt`), so a wing added mid-mission never gets a card. High Command's own Reinforce command has the same bug, hidden because no HC scenario defines reserves | `arena-hc.js:738`, `:958`, `:1016-1018`; `sim-hc35.js:1190`, `:1382`; `sim-hc.js:1097` |
| 13 | **Pirate is a design gap with four bugs on top.** The only win is: the crew's resolve hits 0, the hail is answered *Take the cargo*, and a ship holds within 1,400 for 20 s. **The key clash:** with a request open, `A`/`B`/`C` answer it *before* the power keys are checked, so pressing `C` for Call a Pilot sent "No deal" (and `B` would send "Demand the ship"). That's why the debrief says "you answered". It also prints when the hail was *raised*, not answered. **After "No deal"** resolve resets to 20 with a 60 s cooldown and nothing else changes. Requests share a cap of 6 a mission, and past it the hail is decided by its default with no card; for an eager leader that default is "No deal", every 60 s, for ever. **Intimidate** has no end state but a surrender, no progress, and orbits at about 1,450, outside its guns' 900 reach but inside point defence's 2,200, so the turrets hit the intimidators and they can't reply. **Resolve drains 6 × slower** than the spec (`RES_THREAT` 0.25, not 1.5). And Weapons Tight leaks: once every turret is down, hits route to the hull and push resolve back up | `sim-hc35.js:427`, `:522`, `:595`, `:684-689`, `:726`, `:750-753`, `:919-931`, `:953`, `:1313`, `:1339-1359`; `arena-hc35.js:408`, `:635`, `:721` |
| 14 | No run can be examined after the fact. The metrics record holds counts and the powers and requests without their targets or answer times, and leaves out the plan's positions and the 3.5 tuning. It lives in memory and the console only: no download, no history, no replay. The sim is deterministic from the seed (smoke test HC35 14 proves it), but no live input is logged with its tick, so a run can't be re-simulated | `arena-hc.js:1652-1700`; `arena-hc35.js:428-447`; `sim-hc35.js:1073`; `sim-hc.js:2110` |

---

## 3. What to build

### 3.1 True scale, and icons when zoomed out (item 9)

- **`iconBoost()` returns 1.** Keep the function and every call site, so nothing else moves. Ships, shields, effects
  and the freighter are all drawn at their true size-class scale (`sized:true`), at every zoom.
- **Icon mode.** When a fighter's drawn length falls below `ICON_PX` (18 px on screen), its body is replaced by a
  **screen-constant icon**, 22 px, rotated to its heading. Size classes cross over at their own zoom, so the freighter
  stays art long after the fighters have become icons. Cross-fade over `ICON_FADE` (±15% of that zoom) so nothing
  pops.

| Class | Icon | Fill |
|---|---|---|
| Cross | Wide chevron | Rebel red, ink outline 2 px |
| Talon | Narrow dart | Rebel red |
| Brickbat | Squat block chevron (wider at the back) | Rebel red |
| Mote, Fledgling, Scimitar | Chevron, Scimitar with a notch | Hegemony blue |
| Drones | Small diamond | Hegemony blue |
| FL-400 | Long capsule outline with a heading tick | Hegemony blue outline, navy fill |
| Pirates, the ram, the fire ship | Their class's icon | Hazard orange |
| Stations | Their existing station symbol | Unchanged |

  Each icon carries a **3-cell health tick** under it (§3.3 colours), its **activity badge** for your ships (§3.4),
  and two tiny **shield ticks** at nose and tail for a selected ship. Selection rings, lock marks and engagement
  rings become screen-constant in icon mode.
- **Effects in icon mode:** bolts at true scale, but explosions, kills and the K4 callouts keep a minimum on-screen
  size (`FX_MIN_PX` 28) so a kill is never invisible. The FX `lod` (`sr-space-fx.js:837`) keeps working.
- **Default zoom:** the mission opens at a zoom where fighters are about 30 px long, framed on the freighter's lane.
  The fit-to-all view will mostly show icons, which is the point.
- **Hit-testing** (clicks, hovers) uses the icon's screen box in icon mode and the hull outline otherwise.

### 3.2 Behaviour fixes (items 4, 7, 8, 6)

**Boarding (item 4).**
- **Loadout decides, whatever the wing's order.** A Brickbat with a Boarding party never makes attack runs on the
  freighter. Until the freighter is disabled it holds off (`HOLDOFF_R`) on its wing's side, or follows its wing's
  Escort or Defend if it has one. Once the freighter is disabled (or has surrendered), it boards, whatever its wing's
  Executive Order. Cargo-pod Brickbats get the same rule for hauling. Add a critique line when a Boarding party flies
  with no wing ordered to Disable: "Who's stopping it so we can get aboard?"
- **The approach.**
  - **Side:** the side of the freighter the boarder is already on (sign of the cross product with the freighter's
    heading), not a hash. The dock point sits on that side's hull edge: half the hull width (from the art's
    `sizeK('gafreighter')` and its `parts` extent) plus 0.6 × the Brickbat's `bodyR`.
  - **Two legs:** first to a staging point `DOCK_STAGE` (600) out from the dock point, perpendicular to the hull; then
    a slow final leg at `DOCK_SPD` (0.3 × cruise), matching the freighter's velocity.
  - **No collision or evasion** between a boarder in its final leg and the ship it's boarding. Keep both against
    everything else.
  - **No teleport.** Within `DOCK_SNAP` (80) it blends to the dock pose over 1 s.
- **Docked:** pinned to the hull, matching its drift, **holding fire** (fix the inverted `holdFire` at
  `sim-hc35.js:633`), with `FX.drawBoardLink` to the nearest clamp point and its progress shown (§3.4). Hauling docks
  the same way.

**The Unmanned Ram (item 7).** It should be a moment.
- **Arrival:** a hazard diamond and countdown at its staging point for `ARRIVE_SPOOL`, then a warp-in. A hazard
  dashed **ram line** runs to its target, with an ETA chip ("IMPACT 4 s").
- **The run:** it accelerates hard (`RAM_SPD`, 1.4 × a Talon's top speed) straight at the target's predicted contact
  point, with no avoidance against its target. It's armoured (`RAM_HULL` 120, `RAM_ARM` 60, no shields), so point
  defence and escorts have to work to stop it. With §3.2's turret tracking a fast ram is hard to hit, which is the
  tension.
- **Impact** happens on contact with the hull outline (the true-scale outline), not by proximity. It deals
  `RAM_DMG` (220) to the subsystem it **physically strikes** (the nearest subsystem to the contact point) plus
  `RAM_CORE` (60) to the core.
- **Impact effects:** 120 ms hitstop; `FX.camShake` (0.6); a big orange flash and shockwave ring at the contact point;
  a forced capital damage spot there (breach, fire, smoke trail); debris; the ram crumples against the hull (not an
  ordinary ship explosion in space); a K4 callout "RAM IMPACT · ENGINES DOWN" (naming what actually went down). The
  Nuclear-tipped variant adds a white flash and a `NUKE_R` blast ring.
- **If it's shot down:** its wreck explodes with "RAM DESTROYED" in orange, and the cause log records how far short it
  fell.
- **The debrief tells the truth.** It names the subsystem actually destroyed, or "Your ram was shot down 300 m short
  at 0:36". The ram's normal death no longer passes through `fxSense`'s kill path.

**Turrets that struggle against fast ships (item 8).** A tracking model for capital-ship point defence:
- Each turret has a **facing** and a **traverse rate** (`PD_TRAVERSE`, 0.9 rad/s), and a **mount arc**: the prow pair
  covers the front 200°, the fin pair the rear 200°. It can only fire within `PD_ON_TARGET` (0.08 rad) of its aim.
- It **re-targets** only every `PD_RETARGET` (2 s), or when its target leaves its arc or range.
- Its lead uses the target's velocity from `PD_LAG` (0.4 s) ago, so a jinking ship throws it off.
- **Spread** = `PD_SPREAD_BASE` (0.02) + `PD_TRANSV_K` × the target's angular speed across the turret, up to
  `PD_SPREAD_MAX` (0.35).
- **Result** (assert these in tests): a Talon crossing at full speed 1,500 out is hit by under 10% of bolts; a docked
  or hauling Brickbat by over 50%; a Brickbat on a straight bomb run by 25–40%. So suppressing turrets matters to
  boarders and haulers, and fast fighters dance through.
- **Art:** each turret aims at its own target and a dead turret is drawn dead. Add two optional fields to the FL-400
  draw in `sr-art.js`: `aims:[a0..a3]` (radians off the nose) and `pdDead:[bool×4]`. A dead turret is drawn
  blackened, barrels drooped, with a small smoke wisp. This is additive: with neither field, it draws as today.
- Write the model as one function (`pdTrack(turret, dt)`) so High Command stations can use it later (logged as M-37).

**Boost Shields (item 6).** This changes the shared ability, so it applies in High Command too.
- Cooldown 8 s → `SHIELD_CD` 24 s.
- AUTO uses it only when a zone is under 30% **and** that zone was hit in the last 2 s.
- Remove the "BOOST SHIELDS" floater and the shields badge. What replaces them is the refill animation (§3.3).
- High Command's state hashes (the 3.5 handoff §0 test) will change: re-record the three baselines in this commit and
  say so in the commit message and C-79.

### 3.3 Reading damage, shields and health (items 2, 6)

- **No damage numbers.** Remove the `'-N'` floater from `projTick` (keep the `dmgAcc` reset). Add a panel toggle
  `SHOW_DMG` (default off) so the designer can bring them back, and fix the freighter's 4 × reading behind it. In 3.5,
  the other text floaters (`IMPACT`, `COLLISION`, `SPLASH`, `FOX`, crits) also go: the K4 callouts replace the ones
  that matter. High Command keeps them.
- **Shields as two halves.**
  - **Shape:** two arcs on an **ellipse fitted to the hull** (length and width from the art at its size class, plus
    `SH_PAD`), not a circle. The front arc covers the nose half and the rear arc the tail half, each spanning 180°
    less a 10° gap at the beam, so the split reads.
  - **Strength:** each arc's thickness and alpha follow that zone's fraction. A depleted zone is a thin, dashed,
    broken arc.
  - **Hits:** a hit flashes only the arc that took it, and the hex splash is placed on that arc at the impact angle.
  - **Refill:** when a zone gains shield (Boost, or regeneration of 10% or more of max within 1 s), a bright sweep runs
    along that arc from its centre outward over 0.6 s, and the arc swells 10% then settles.
  - **The tile and pilot-panel shield bars** animate their fill (a 0.6 s ease) with a glint passing along them.
  - **Who shows them:** in 3.5, the arcs show always on your ships at art zoom, thin when full. On enemies they show
    for 2 s after a hit, and always on a selected ship. High Command keeps C-72's rule.
- **Health colours everywhere.** Hull above 60% is green (`--sr-go`); 30–60% is **orange** (`--sr-hazard`); under 30%
  is **red** (`--sr-rebel` red, #ff4a3d), pulsing under 15%.
  - This applies to the canvas cells, the icon ticks, the tile hull bars, the pilot panel bars, the target readout
    (§3.5) and the wing card summary.
  - Add it as a `bands:'gor'` option on `TH.hpPips` (default unchanged) and use it in High Command and 3.5 only. Ground
    combat and the base keep green → gold → hazard until the designer says otherwise (C-80).

### 3.4 What your ships are doing (item 1)

**One vocabulary.** Every behaviour your ships can be in maps to a verb, a glyph, words and an optional progress
value. Add these to `BEH` (`arena-hc.js:1045`) and to the 3.5 overlay; nothing may fall through to a raw id (test it).

| Verb | Glyph | Tile words (examples) | Progress |
|---|---|---|---|
| Attacking | Crosshair | "Attacking Escort 2" | — |
| Bombing run | Falling bomb | "Bomb run on the engines" | Bombs left (rack pips) |
| Disabling | Crosshair with a bolt | "Disabling the engines" | Subsystem hp |
| Suppressing | Crosshair on a turret | "Suppressing turrets" | — |
| Defending / Escorting | Shield / Shield with a ship | "Defending Anvil", "Escorting the prize" | — |
| Holding off | Pause in a ring | "Waiting to board" | — |
| Boarding | Grapple | "Boarding 40%" | Boarding % |
| Hauling | Crate | "Hauling 1/2" | The current container |
| Carrying cargo | Crate with an arrow | "Carrying 2 crates home" | — |
| Intimidating | Raised fist | "Intimidating" | The crew's resolve |
| Tagging | Pin | "Tagging 60%" | Tag % |
| Waiting for signal | Pause | "Waiting for your signal" | — |
| Ambushing | Eye | "Waiting in ambush" | — |
| Ramming (volunteer) | Arrow into a bar | "Going in!" | — |
| Picking up a pod | Hook | "Picking up Tam" | Distance |
| Withdrawing | Arrow out | "Withdrawing" | — |
| Panicking / pinned | Existing HC glyphs | Existing words | — |

- **The activity badge.** Above each of your ships, at every zoom, a 22 px round badge sits with a rebel-red rim,
  the white glyph and, for timed verbs, a gold progress ring. When the verb changes, the badge pops (1.3 × → 1 ×
  over 200 ms, none with reduced motion) so a change of job catches the eye. Enemy ships get no badge. Badges stay
  readable over each other: when two overlap they fan apart by up to 14 px.
- **Tiles and the pilot panel** show the glyph and the words (and `beh.why`, which is the words' source where it
  exists). Fix the `think` hook's early return so `assessOf`, the new-job bubble and `abilityTick` still run for
  layer-driven ships. With no hook, High Command doesn't change, so its hash is unaffected.
- **Cargo aboard shows.** A Brickbat carrying containers draws crates on its pods (an additive `crates:0..2` option
  on the Brickbat's `cargopod` draw), and its badge reads "Carrying 2". The roster's wing card adds a crate chip
  ("▣ 2 aboard").
- **Tethers always show:** boarding links, the hauling tether, a tow, and the ram line, whatever is selected.
- **Big moments: callouts.** A world-anchored label in Bungee pops over the spot (scale 1.2 → 1, holds 2.5 s, fades),
  goes to the feed with VIEW, and if it's off screen, an edge arrow in its colour points at it for 3 s. Colours follow
  the law: **green** for our wins, **orange** for danger to us, **blue** for the enemy's moves.

| Callout | Colour | When |
|---|---|---|
| CARGO SECURED 1/2 · MAGS | Green | A container comes aboard |
| CARGO HOME · 2 CRATES | Green | A carrier jumps out with cargo |
| BOARDED · PRIZE TAKEN | Green | Boarding completes |
| ENGINES DOWN / COMMS DOWN / TURRET DOWN | Green | A freighter subsystem dies |
| RAM IMPACT · {what went down} | Orange | §3.2 |
| RAM DESTROYED | Orange | §3.2 |
| {PILOT} HIT | Orange | One of yours drops below 30% |
| {PILOT} DOWN · POD AWAY | Orange | A loss |
| DISTRESS SENT | Blue | The distress call lands |
| RESPONSE INBOUND | Blue | Phase 3 warp-in |
| JUMP SPOOLING | Blue | The freighter starts its jump |

### 3.5 The target's state (item 5)

- **Enemies can be selected in 3.5** for inspection only (no orders). A click on the freighter, an escort or a
  response ship selects it. A click on empty space clears it.
- **The target readout:** a card in the top right, under the command points, until K7 places it. It has three parts.
  - **A schematic:** a steel silhouette of the FL-400, drawn from the art's outline into a small canvas, with every
    subsystem marked where it sits on the hull.
    - **Engines** (the engine block), **Comms** (the bridge tower) and **Turrets ×4** (their mounts) each show a
      colour (green, orange or red by hp, as §3.3) and a dead grey ✕.
    - **Cargo ×12** shows as the module grid: full, **ghosted** with a small red tick ("taken"), or an empty
      blackened bay ("destroyed").
    - **Core:** a hull bar.
  - **Rows:** one line each, "Engines · 0/120 · DOWN", "Comms · 24/60", "Turrets · 3 of 4", "Cargo · 10 aboard ·
    2 taken", "Crew resolve" (a bar, for Pirate).
  - **State chips:** DISABLED, DRIFTING, JUMP SPOOLING 4 s, BOARDING 40%, DISTRESS 62%, SURRENDERING.

  An escort or response ship shows a smaller card: class, pilot, shield halves, armour and hull.
- **On the map:** with the freighter selected or hovered, or at close zoom, small rings sit on each subsystem in its
  state colour. Hovering one opens the in-game tooltip (§3.6): "Engines · 0/120 · Down. It can't run or jump." Dead
  turrets draw dead (§3.2). Disabled engines keep the existing sparks, and also go dark (no trail flame).
- **Targeting keeps working as now** (`subAt`), but the clickable radius and the highlight use the true-scale positions.

### 3.6 The player's journey: the Missions tab, then holographic planning windows (item 3)

**The flow:** rulesets → **the Missions tab (mock)** → *Plan mission* → **four holographic windows, one per step,
with Back and Next** → Launch → the mission → the debrief → *Plan again* (back to window 1, plan kept) or *New
opportunity* (back to the Missions tab).

**The Missions tab, recreated as a mock.** Build the markup in `arena-hc35.js` using the vanilla game's own classes
and stylesheet (`sr-briefing.css`, `bf-` prefix; spec in `docs/ui/SCREENS-HANDOFF.md` §4). Never call `base.js`'s
`renderMissions` or its helpers, because they read the campaign's globals. **Build it to the designer's mock-up 1
(20 October), with the corrections in `docs/ui/HUD-MOCKUP-REVIEW.md` §Screen 1 (the image is `docs/ui/mockups/hc35-01-mission-board.png`)**: the FL-400 in its `heg` livery on the
card and the holo-table, Hegemony-blue escort triangles and jump marker, a cyan Target callout (gold is only *Plan
mission*), no risk pips on the locked card, and Dig deeper plus New opportunity added.
- **Top bar:** "Missions" and "Briefing room · Haven Rock". The tabs show as in the game but are inert, with an
  in-game tooltip "Not in the Arena". Mock resource pills.
- **Mission board:** the opportunity card "Vulnerable Freighter" (ship icon, "Space · Risk ●●○ · Cass", a NEW flag),
  selected. Below it, two or three dimmed cards borrowed from the campaign's names, each tipped "Not in this demo".
  A New opportunity ghost button sits at the board's foot.
- **The holo-table (space):** the planet and its tilted orbit ring, the freighter's lane drawn across it as a dashed
  line with the freighter's silhouette, a blue jump-point marker, escort triangles in Hegemony blue. Callouts:
  **Target** "GA FL-400 fleet freighter, holds full", **Opposition** "Escort of N Motes" (from the known modifiers),
  **Window** "Crosses in about 4:30". Its label chip reads "Thessa Reach · Remote system".
- **The briefing rail:**
  - The source card (Cass), the pitch, and fact tiles (Risk, Type, Max force "3 wings").
  - The known modifiers as tags (good green, bad orange), plus a dashed grey "? Cass may have missed something" tag
    that tips the Source's reliability.
  - **Dig deeper**, with its Intel pips.
  - The gold **Plan mission**.
- **The dossier window is gone:** its content lives in the rail and the holo-table.

**The holographic windows.** A window for each step: 1 Objective, 2 Optionals & rules, 3 Wings & assets, 4 The plan.
- **The frame:** the kit's `sr-window`, wrapped in one `.h35-holo` class, centred over the dimmed and blurred Missions
  view. Its CSS is one block of variables, so the K7 restyle is a token swap.
  - A cyan projector glow along the bottom edge, joined to the holo-table's beam.
  - A faint scanline texture inside, at 3% opacity.
  - The panel at 92% opacity.
  - The ink outline, the gold primary and the colour law are kept: only the projector light is cyan.
- **The head:** "PLAN: VULNERABLE FREIGHTER", a close ✕ (back to the Missions tab, with the plan kept), and a
  **step track** of four connected nodes. Done steps are green with a tick, the current step pulses gold, and later
  steps are grey. The connecting lines fill as steps complete. Done nodes are clickable.
- **The foot:** left, **◀ Back** (step 1: "◀ Mission board"). Centre, the readiness strip (needs met and missing, each
  tipped). Right, the gold **Next: {next step} ▶**, or **Launch ▶** on step 4. A disabled Next shows its reason inline
  in orange and in its tooltip.
  - Keys: `Esc` = Back, `Enter` = Next when enabled, `←` `→` also step.
- **Motion:**
  - Opening: the window rises out of the beam (scaleY 0.02 → 1, 220 ms) with two quick opacity flickers.
  - Changing step: the content slides 24 px in the direction of travel and the frame flickers once.
  - Launch: the window collapses into the beam (180 ms), then cuts to the mission.
  - Reduced motion: plain 120 ms fades.
- **What each window holds:**
  - **Windows 1 to 3** take the content of today's step 1 to 3 panels, laid out wide (about 1180 × 760):
    - **Window 1:** the four family columns of objective cards.
    - **Window 2:** two panels side by side.
    - **Window 3:** the three wing cards in a row, with the asset slots below.
  - **Window 4 is wide** (about 1600 × 860). Its left 360 px is the wing order rows (Executive, Secondary and trigger)
    and the readiness checklist. The rest is a **cut-out map pane**: the real renderer shows through it, with the
    camera fitted to the pane's rectangle, and markers drag there as today. Outside the pane, the window chrome covers
    the scene.
- **Content changes while moving in:** the wing cards draw their ships at true size class (`sized:true`) and swap
  Brickbat art by loadout as today. The leader's take becomes a speech bubble under the card.

**The in-game hover box, everywhere.**
- **No native tooltips:** remove every `title=` from `#arHc35` and `#arHc` (the twelve in §2), and use `data-tip`
  instead. One tooltip system for both: `#hcTip`, styled as the kit's `.sr-tip`:
  - an ink panel with a 2 px steel border;
  - a bold title line, 1–2 body lines, and an optional footer line in a meaning colour (cyan for info, orange for a
    warning, gold for a cost).
- **Content:** `data-tip` keys resolve through one `tipFor(key)` that returns `{title, body, foot, tone}`. Drop the
  kit's JSON format inside these roots.
- **Behaviour:**
  - It shows after 250 ms, anchored to the element rather than the mouse, flips at screen edges, and appears on
    keyboard focus too.
  - Canvas hovers use the same box: plan markers, subsystems (§3.5), ships (name, class, verb), the lane's time
    ticks, and the gravity window.
- **Copy:** every objective, optional, rule, asset, power, modifier tag, wing control and loadout gets a tip. The copy
  is designer-facing placeholder, logged in C-81.

**The debrief, in the meantime** (its look waits for K7):
- **Pods resolve at the end:** a pod still drifting is "Captured" if Hegemony ships remain within `POD_CAPTURE_R`
  (2,500), else "Lost". It is never "drifting".
- **"What decided it" is ordered by weight:** the primary's failure cause first (for example, "The freighter jumped at
  3:19. Its engines were never hit." with the reason), then losses, then the powers and the player's answers.
- **The ram and other power lines** report what actually happened (§3.2).

### 3.7 The flight recorder (item 14). Build this first

**Purpose:** every run the designer plays can be handed back as one file, re-simulated exactly offline, and asked
questions ("what was Dagger doing at 2:14?", "why didn't Pirate finish?") without re-reading the code each time.

**What's recorded.** Every 3.5 run, and every High Command run (same machinery), keeps a **flight record**:
1. **Header:**
   - `SIM_VERSION`: a string constant at the top of `sim-hc.js` and `sim-hc35.js`, bumped in any commit that changes
     sim behaviour, so the harness can warn when a record comes from older rules.
   - The ruleset, opportunity, seed, the full modifier list (with hidden, false and dug-up flags), and the **whole
     plan** as JSON (jump-ins, asset positions, the tagger, the Preservation threshold, everything in `B.plan`).
   - A snapshot of every tuning value at launch: `SIM.TUNE`, the 3.5 tuning, FX tuning, map size and spread.
   - The browser, the screen size and the date.
2. **Inputs, keyed by `S.tick`, with full arguments:**
   - every power (and its target ship, subsystem, wing or point), Insist, and every request answer (which answer;
     player, timeout or uncapped default);
   - in High Command, every order, tactic, command, response, ability and rule edit;
   - every mid-run tuning change, abort and retreat;
   - speed changes and pauses (for analysis only; they don't affect the sim).
3. **Checkpoints:** `stateHash()` every 20 ticks (1 s).
4. **The analysis stream:**
   - every event (uncapped, unlike the feed's 200), the cause log, deaths, power results, the full request log
     (raised, answered and applied times), transmissions and Secondary switches;
   - **a per-second sample**: phase, CP, detection, resolve, the freighter's position, heading and leg, every ship's
     position, behaviour kind, verb, hull and shields.
5. **The final metrics record.**

**Getting it out.**
- The debrief gets a **Save flight record** button. It downloads `sr-run-{yyyy-mm-dd-hhmm}-{opportunity}-{seed}.json`.
  Compact the samples (rounded numbers, short keys) to keep a 5-minute run under about 1 MB.
- The last 10 records are also kept in `localStorage` (`sr-arena-runs`, trimmed oldest first if storage refuses),
  listed in a new **Runs** group on the designer panel with Download buttons. A run that ended in a crash or a reload
  is saved too, marked unfinished.
- **The designer's workflow:** attach the JSON alongside the written notes. The handoffs will ask for it.

**The offline harness, `tools/run-report.js` (node).**
- **Loading:** it loads the sim files headless in a `vm` context with the data they need (`db.json` through the same
  `SRDB`, `Enemies`, and `sr-art.js`'s size data), runs compile → build → begin from the header, applies the inputs at
  their ticks, and checks every checkpoint hash. On a mismatch it reports the first divergent second and stops,
  naming the `SIM_VERSION` difference if there is one.
- **Default output: a markdown report**, short enough to paste into a chat. It holds:
  - the outcome and the objectives, with when each changed state;
  - the phase timeline;
  - every request (raised, answered how and by whom, and what it changed);
  - every power with its target and result;
  - deaths with their cause;
  - **seconds per verb for each ship** (as §3.4 names them);
  - the freighter's deviation from its lane;
  - the resolve, detection and CP curves as a sparse table;
  - **stuck detectors**:
    - a wing in one verb for over 60 s with no progress;
    - a ship circling (heading wrapping 360° three times inside 400 units);
    - a primary with no state change for 90 s;
    - a request repeating with the same answer;
    - an objective that can no longer be won.
- **Queries:**
  - `--at 2:14` dumps the whole state at that second;
  - `--ship Brask` gives one ship's verb timeline;
  - `--wing Dagger`;
  - `--objective` traces the primary's conditions over time;
  - `--json` gives machine-readable output.
- **Tests:** a smoke test records a scripted run in the browser, downloads it, and confirms the harness reproduces
  every checkpoint.

### 3.8 Capital ships keep their course (item 10)

- **Mass, not size class.** Collisions split impulse by **mass** = `SIZE_M[size]²` (the size table's metres, from
  `sr-art.js`): a Cross (16 m) is 256, a Brickbat (25 m) 625, the FL-400 (130 m) 16,900. A Cross hitting the FL-400
  moves it 1.5% as much as it moves itself; a ram's impulse uses its speed, so a fast ram shoves harder than a
  bumping fighter. A bump's added spin is divided by the same mass ratio.
- **The freighter steers itself.** Like the prize branch, the layer owns the freighter's heading. Each tick:
  - it turns toward its current lane waypoint at `CAP_TURN` (0.05 rad/s at cruise, 0.08 alarmed), whatever the
    flight model's corner speed;
  - its velocity relaxes back onto its heading with a time constant of `CAP_REALIGN` (3 s).

  So a knock is a lurch and a slow swing back, never a new course. The leg check uses the waypoint distance as well as
  "along", so a freighter pushed off the line still reaches its jump point.
- **Disabled, it drifts with the knocks.** Collision impulses (mass-split) are added to `L.drift` instead of being
  discarded, so a ram, or a Brickbat nudging it, can push a dead freighter, including toward the planet. That's a new
  Crash tactic for free, and it's logged.
- Any future capital ship uses the same steering through a `capital:true` row flag.

### 3.9 The death spin follows the turn (item 11)

- Pass the ship's nose rate `w` and its path's turn rate `turnW` in the `explode` payload (`arena-hc.js:434`), and
  fix `h0:d.h||vh0` so a heading of 0 isn't dropped.
- In `deathSpiral`:
  - **Spin** = `clamp(|w| × SPIN_K (1.0), SPIN_MIN 0.4, SPIN_MAX 9) / sqrt(sizeRel(size))`, its sign from `w`. A
    fighter dying mid-turn whips round; a Brickbat that was flying straight sags into a slow tumble.
  - The fall's acceleration drops from 4 × to `SPIN_GROW` (1.6 ×).
  - The curl follows `turnW`'s sign.
  - **The chance to spiral rises with the turn:** `spiralChance × (0.5 + |turnW| / turn cap)`.
  - Ships of size 9 and up never spiral; they use `capitalDeath`.
- Put the new knobs on the FX panel group.

### 3.10 Reinforcements join the roster (item 12)

- The roster's rebuild key includes the wing ids (`arena-hc.js:958`, `:1016`). This fixes 3.5's reserves, the
  "Hold for reserves" answer and High Command's own Reinforce.
- **An arriving wing's card slides in** at the bottom of the column (200 ms), its header flashes gold twice, the feed
  says "{Wing} on station", and K4's callout "{WING} ARRIVED" fires at its warp-in point.

### 3.11 Pirate, made to work and made readable (item 13)

**How Pirate plays:**
1. Your wings frighten the crew until they fold.
2. The crew hail you with an offer.
3. You accept.
4. The freighter heaves to and its cargo is transferred while you stand guard.
5. You let it go.

Each step must be visible.

- **Resolve is the progress bar.**
  - Restore the spec's drain (`RES_THREAT` 1.5).
  - Resolve shows as the Intimidate verb's progress ring (§3.4), as a bar in the target readout (§3.5), and as a thin
    blue arc round the freighter that shrinks as the crew lose nerve.
  - A callout "THEY'RE WAVERING" fires at 30.
- **Intimidate fights at gun range.**
  - The orbit sits **inside its guns' reach of the turret mounts**: the orbit radius is the hull's half-length plus
    `INTIM_STANDOFF` (600), and its guns aim at turrets and escorts only.
  - Once every turret is down, **an intimidating or Weapons Tight ship stops firing at the freighter entirely**, which
    closes the hull leak. It keeps flying menace passes, which still drain resolve.
- **The hail:**
  - **The default answer is the one that serves your primary:** with Pirate as the primary, *Take the cargo* is the
    default whatever the leader's persona. Persona still decides it for other primaries.
  - The surrender request is **exempt from the request cap** and always shows a card. An objective must never be
    decided unseen.
- **The answers:**
  - **Take the cargo:** the freighter heaves to (engines idle, no jump).
  - **Demand the ship:** as today.
  - **No deal:** resolve to 40 (not 20), and a callout "THEY'RE HOLDING OUT". The hail comes back when resolve next
    reaches 0, after a 30 s minimum.
- **The transfer:**
  - A **TRANSFER ring** (`TRANSFER_R`, gold dashed) appears round the freighter, with a progress bar over it.
  - The Intimidate Executive ends as `done` and the wing moves into the ring to **Overwatch the transfer** (a new verb).
    It no longer holds at its rally point.
  - Progress runs while any rebel ship is inside.
  - The freighter visibly **jettisons its containers** as floating crates that drift toward your nearest ship (the
    surviving modules × `PIRATE_SHARE`), the modules emptying on the hull.
  - At 100%: the callout "CARGO SURRENDERED · {n} CRATES", the freighter is released (it spools and jumps), and the
    primary is done.
- **If they won't fold:** with *Fanatical Crew*, the first time resolve reaches 0 the leader radios "They're not
  folding, Base" (revealing the modifier), and the Intimidate Executive becomes *impossible*, so any Secondary with that
  trigger fires.
- **Stuck guard:** if an Executive has had no progress for `EXEC_STALL` (90 s), its leader raises a request: "We're
  getting nowhere. New orders?" with *Switch to the Secondary* or *Keep at it*. This catches every circling-for-ever
  case, not just Pirate.
- **The key clash:**
  - Request answers move to **Shift+1 / Shift+2 / Shift+3** (3.5 has no tactic tray, so they're free), and the buttons
    show those hints.
  - Letters never answer requests.
  - No key answers a request in its first 400 ms on screen.
- **The debrief tells it straight:**
  - "You answered … at {answer time}" only for a player's answer, at the time it was given.
  - A timeout reads "{Leader} decided: {answer} (no answer from you)".
  - For a failed Pirate, the cause line names the step it stopped at: "The crew never folded: resolve bottomed at 22",
    "You turned down their offer at 2:14", or "Nobody stood guard for the transfer".

---

## 4. Phases

| Phase | Build | Playable proof at the end |
|---|---|---|
| **K0** | **The flight recorder and `tools/run-report.js` (§3.7).** First, so every later playtest is recorded | A designer run saved from the debrief is reproduced by the harness with every checkpoint matching, and its report shows the verb timeline |
| **K1** | True scale and icon mode (§3.1), with the hit-testing and default zoom | Zooming out turns fighters into icons, then the freighter. Nothing is ever drawn bigger than its true size |
| **K2** | Boarding, the ram, turret tracking, Boost Shields (§3.2), the per-turret art fields; mass-split collisions and capital-ship course keeping (§3.8); Pirate end to end, the stuck guard and the request keys (§3.11); re-recorded HC hashes | A Steal plan boards cleanly from the side the boarder arrives on. The ram either visibly hits or is visibly shot down. Fast fighters survive point defence; docked Brickbats don't without Suppress. A bumped freighter swings back onto its lane. A Pirate plan wins with no player input beyond the plan |
| **K3** | No damage numbers; half-hull shield arcs with hit placement and the refill sweep; health colours (§3.3); the death spin from the ship's turn (§3.9) | Hits read by arc; low-hull ships are orange then red everywhere; a Brickbat flying straight dies in a slow tumble |
| **K4** | The verb vocabulary, activity badges, cargo aboard, tethers, the callouts, the `think`-hook fix (§3.4); reinforcements joining the roster (§3.10) | With nothing selected, the player can say what every one of their ships is doing, and doesn't miss a container coming aboard |
| **K5** | Selecting enemies, the target readout and schematic, the subsystem rings and tips (§3.5) | The engines' state can be read at a glance at any moment |
| **K6** | The Missions tab mock, the holographic windows, the single in-game tooltip, the debrief fixes (§3.6) | Rulesets → Missions tab → four windows with Back and Next → Launch → debrief → Plan again, with no native tooltip anywhere |
| **K7** | **Hold.** The HUD layout pass from the designer's mock-ups | A separate handoff |

Commit per phase, every `tools/*-smoke.js` passing, blockers in the same commit (`CLAUDE.md`).

---

## 5. Tests (extend the HC35 section of `tools/arena-smoke.js`)

1. **Scale:** `iconBoost()` is 1 at every zoom. Below the threshold, a Talon draws as an icon whose on-screen size is
   constant across three zooms. The freighter is still art at the zoom where fighters switch.
2. **Boarding:** from a scripted disabled freighter, a Boarding-party Brickbat in a **Disable** wing docks on the side
   it approached from within 30 s, never collides with the freighter, never moves more than `DOCK_SNAP` in one step,
   and holds fire while docked. Its docked pose is outside the freighter's true hull outline.
3. **Ram:** scripted with point defence off, it impacts on the hull outline, the struck subsystem loses `RAM_DMG`, the
   cause line names that subsystem, and no ship-kill FX event fires for the ram. Scripted against four full turrets
   and a slow ram, it's shot down and the debrief says so.
4. **Turrets:** over 60 s each, the hit rates fall in §3.2's bands (Talon crossing < 10%, docked Brickbat > 50%,
   straight bomb run 25–40%). Dead turrets don't fire and draw with `pdDead`.
5. **Shields:** `SHIELD_CD` is 24. AUTO doesn't fire at 40% shield. No "BOOST SHIELDS" floater exists. A refill starts
   the arc sweep.
6. **No damage numbers:** with `SHOW_DMG` off, 30 s of fighting creates no `'-N'` floaters. With it on, the
   freighter's numbers equal the damage actually taken.
7. **Health colours:** a tile, a canvas pip and the target readout at 70%, 45% and 20% hull read go, hazard and rebel
   red respectively.
8. **Vocabulary:** every behaviour kind reached in a full scripted run of each primary maps to a verb. No tile text
   ever matches `/^[A-Z0-9]+$/` from a raw id.
9. **Callouts:** hauling a container fires CARGO SECURED, a subsystem death fires its DOWN callout, and off-screen
   callouts make an edge arrow.
10. **Target readout:** selecting the freighter shows it; the engines row tracks hp; a destroyed turret shows ✕.
11. **Journey:** the Missions tab renders with the `bf-` classes, Plan mission opens window 1, Next and Back move one
    step, Esc goes back, Launch from window 4 starts the mission, and Plan again returns to window 1 with the plan kept.
12. **Tooltips:** zero `[title]` attributes inside `#arHc35` and `#arHc`. Hovering an objective card shows `#hcTip`
    with its title.
13. **Debrief:** a run ending with a drifting pod lists it as Captured or Lost, and a failed Steal lists its failure
    cause first.
14. **Isolation:** v2 and SB pass unchanged. High Command passes against its re-recorded hashes, and the K2 commit
    message names the change.
15. **Flight recorder:** a scripted 3.5 run (powers with targets, an answered request, a timed-out request, a pause, a
    speed change) saves a record from the debrief. `tools/run-report.js` re-simulates it with every checkpoint matching,
    and its report lists that request as answered by the player at the right time, and the other as a timeout. A record
    with a changed `SIM_VERSION` produces a warning, not a crash. The last 10 runs appear in the Runs group.
16. **Course keeping:** a Cross rammed into the cruising freighter at full speed moves its heading by under 3°, and the
    freighter is back within 5° of its lane bearing in 20 s and still reaches its jump point. A disabled freighter
    shoved by a Brickbat drifts the way it was shoved.
17. **Death spin:** a Brickbat killed flying straight spins at under 1.5 rad/s; a Talon killed mid-turn spins faster
    than 4 rad/s in its turn's direction; the FL-400 never spirals.
18. **Reinforcements:** calling the Reserves adds a roster card within one frame of the warp-in; so does High Command's
    Reinforce in a test scenario with reserves.
19. **Pirate:** a scripted Pirate plan with two Intimidate wings and no player input wins (resolve falls, the hail
    defaults to *Take the cargo*, the wing overwatches, the containers jettison, the transfer completes). With *No
    deal* answered, the hail returns. Past `REQ_CAP`, the surrender still shows a card. With *Fanatical Crew*, the
    Executive becomes impossible and the Secondary fires.
20. **Keys:** with a request open, `C` uses the third power and doesn't answer the request; `Shift+1` answers it; no
    key answers within 400 ms of the card appearing.
21. **Stuck guard:** an Executive with no progress for `EXEC_STALL` raises the "getting nowhere" request once.

---

## 6. DESIGN_BLOCKERS entries to add

- **C-79 "Type 3.5 playtest 1: what I chose building it".** True scale everywhere, with icons past `ICON_PX`. Loadout
  decides boarding and hauling, whatever the wing's order. The ram hits on contact and is armoured. The point-defence
  tracking model. Boost Shields' 24 s cooldown and tighter AUTO, shared with High Command (with the re-recorded
  hashes). No damage numbers (`SHOW_DMG`). Half-hull shield arcs. The verb vocabulary, badges and callouts. Enemy
  inspection. The Missions tab mock and the holographic windows. One tooltip system.
- **C-80 "Type 3.5 playtest 1: readings to confirm".**
  - Low health is **red**, which the colour law reserves for "ours". This follows the designer's note; it's pulsing
    and small, so it shouldn't read as a rebel ship. Applied in High Command and 3.5 only: does ground combat follow?
  - Shield arcs show always on your ships in 3.5.
  - Unresolved pods count as Captured or Lost at the end.
  - The holo look is provisional until the mock-ups.
  - The Missions tab is a static mock, not campaign code.
  - The other Missions tab cards are dimmed placeholders.
  - The dossier window is folded into the rail.
- **C-81 "Type 3.5 playtest 1: placeholders and text".** `ICON_PX`, `ICON_FADE`, `FX_MIN_PX`, `DOCK_STAGE`, `DOCK_SPD`,
  `DOCK_SNAP`, `RAM_SPD`, `RAM_HULL`, `RAM_ARM`, `RAM_DMG`, `RAM_CORE`, `PD_TRAVERSE`, `PD_ON_TARGET`, `PD_RETARGET`,
  `PD_LAG`, `PD_SPREAD_BASE`, `PD_TRANSV_K`, `PD_SPREAD_MAX`, `SHIELD_CD`, `SH_PAD` and `POD_CAPTURE_R`, all on the
  panel. Every new callout, verb phrase, tooltip and critique line is lab copy, `[TEXT NEEDED]`.
- **C-79, add:** collisions split by mass (`SIZE_M[size]²`), shared with High Command (its hashes re-recorded in
  K2); capital ships steer themselves; the death spin from the ship's turn; Pirate's full flow (the default follows the
  primary; objective requests ignore the cap; No deal resets resolve to 40; the transfer ring and jettisoned crates;
  Overwatch the transfer); the stuck guard; request answers on Shift+1–3; the flight recorder and harness.
- **C-81, add:** `CAP_TURN`, `CAP_REALIGN`, `SPIN_K`, `SPIN_MIN`, `SPIN_MAX`, `SPIN_GROW`, `INTIM_STANDOFF`,
  `EXEC_STALL`, the recorder's sample rate and history size.
- **M-37 "Type 3.5 playtest 1: missing".** Turret tracking for High Command's stations and future capital ships
  (`pdTrack` is ready). Per-turret aim and death art for future capital ships. Art for a carried container and the
  activity glyph set (glyphs are inline SVG placeholders until then). **The HUD layout pass (K7), waiting for the
  designer's mock-ups.**

---

## 7. K7: what the mock-ups need to answer (for the designer; don't build)

The designer is making HUD mock-ups next. When they land, the K7 handoff will place:
- the target readout;
- the request cards;
- the powers bar and comms queue;
- the roster column with its new verbs;
- the phase plate;
- the objectives;
- the callouts' screen budget;
- the debrief's final look (including the phase timeline the designer may want);
- the final holographic window style.

K0 to K6 put every element in a sensible interim spot on the kit, so the mock-ups can be judged against a working
build.
