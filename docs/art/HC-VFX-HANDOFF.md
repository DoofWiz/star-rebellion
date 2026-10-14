# Star Rebellion — High Command VFX handoff (the space juice pass)

This is the migration spec for making High Command's real-time space combat look and feel alive: engine flames and
banking, muzzle flashes and glowing bolts, impacts, missiles with tracking smoke, chaff, hull-cut kills, warp-ins and
jump-outs, the three stations, a backdrop with depth, cel asteroids, redrawn status badges and camera shake. It
answers `docs/art/HC-VFX-BRIEF.md` and pairs with the world art handoff (`docs/art/HANDOFF.md`), whose house rules
hold throughout.

The living guide is **`docs/art/space-fx-guide.html`**. Every picture in it is drawn by the real modules; if the game
and the guide disagree, the guide is right. It carries every ship state at three zooms, the stations, every event on a
loop (pause · step · 0.3× / 1× / 3×), the badge set, the backdrop, and the **stress scene** with a live ms / particle
counter.

## Files

| File | Put it at | What it is |
|---|---|---|
| `sr-space-fx.js` | `game/art/sr-space-fx.js` | The FX module: one global, `window.SR_SPACE_FX`. Pure Canvas 2D, no image files. Loads **after** `sr-art.js`. |
| `sr-art.js` (changed) | `game/art/sr-art.js` | Additive changes only (list below). Every existing call draws exactly as before. |
| `space-fx-guide.html` | `docs/art/space-fx-guide.html` | The living guide (loads the real modules by relative path). |
| `HC-VFX-HANDOFF.md` | `docs/art/HC-VFX-HANDOFF.md` | This spec. |

```html
<script src="art/sr-art.js"></script>
<script src="art/sr-space-fx.js"></script>   <!-- new, straight after sr-art.js -->
```

## Guard rails

- **No gameplay changes.** The module is read-only over the sim: it never touches `S`, never reads `S.rng` (it keeps
  its own xorshift), and nothing it draws feeds back. Hit boxes are untouched; silhouettes keep today's sizes.
- **No `shadowBlur` per frame.** Every glow is baked once into a small offscreen sprite and `drawImage`'d
  (`'lighter'` for additive light). `shadowBlur` appears only at bake time, inside the sprite factories.
- **Fixed particle pool** (`TUNE.poolCap` 768): zero allocation per frame; past the cap the smallest, lowest-priority
  particles are overwritten first, so a 3× fast-forward degrades gracefully instead of stuttering.
- **Pause and timescale**: `update(dtGame, dtReal)` — game-time effects freeze when `dtGame` is 0; UI pulses (badge
  pops, light blinks, chaff twinkle) run on `view.now` (real ms) and keep breathing while paused, as the brief asks.
- **Reduced motion** (`view.reduced`): no camera shake, no screen flash, no hull wobble, no missile wobble; pulsing
  rings go steady. The shake also has its own switch (`SR_SPACE_FX.setShake(false)`) regardless.
- **v2, SB and the campaign untouched**: nothing outside `game/art/` changes until you wire it; `SR_ART.ship`'s new
  options default off, so `space.js`, the hangar and the other rulesets draw byte-identically.

## What changed in `sr-art.js` (all additive)

1. **`ship(..., {still:true})`** — a sprite-bake mode: no engine flames, no drifting damage smoke or sparks, no
   blinking (lights draw steady-on), no scanner sweep. This is what lets the FX module cache a clean hull and draw
   the live layers itself — weakness no. 1 in the brief (frozen engines) dies here. Default `false`; every existing
   caller is unchanged.
2. **`SR_ART.STATIONS` + `SR_ART.station(ctx, id, x, y, ang, s, t, o)`** — the station kit (answering brief §11 Q3:
   **a modular kit, three authored entries**, like the ships). Pieces: `ngon`, `ring`, `box`, `pts`, `strut`, `vane`,
   `dish`, `dome`, `win` (lit window strips — warm for rebels, cold for the Hegemony), `chev` (hazard pads), plus the
   ships' livery language (`stripes`, `patches`, `tape`, `scorch`, `mark`, `trim`, `emblem`, nav `lights`) and
   `pads` (docking-clamp points) / `emitter` (where the relay's jam pulse is born).
   - `relay` — Relay K-7: Heg navy hex core, comms dish, antenna arms with vanes, glow trim, the jam emitter block.
   - `lastlight` — Lastlight Station: warm cream drum in a habitat ring, lit windows, rebel stripe with drips,
     patches and tape, a little flag, solar vanes.
   - `reactor` — Reactor Platform: dark slab, glowing reactor dome (**goes dark when boarded; a small rebel-red
     claim light with `ours`**), four clamp arms with gold hazard chevrons, cooling vanes.
   - Options: `{damage 0..1, dark, ours, still}`. Damage scorches and (over 0.45) opens a sparking panel; fires and
     smoke are the FX module's job.
3. **`PROJ.shiplaser` and `PROJ.heglaser`** — the two laser styles (type `slaser`), additive rows beside the ship
   weapons. Nothing uses them until a weapon in the sim does (C-74).
4. Tiny neutral fixes inside the new code only: the ring piece fills as an even-odd annulus (no destructive erase of
   what's behind it).

**The art key**: give each structure a `station` field on its scenario entry — `station:'relay' | 'lastlight' |
'reactor'` — and fall back to matching the entry `id`. That's my recommendation from §5.2's open question; the
renderer passes it through on the station view object below.

## The API (`window.SR_SPACE_FX`)

```js
FX.reset()                             // a new mission: clears the pool, one-shots, per-ship state
FX.update(dtGame, dtReal)              // once a frame, before drawing. dtGame in SECONDS of game time (0 paused)
FX.event(kind, data)                   // one-shots; the full kind list is below
FX.camShake(view) -> {x, y, a}         // ask once a frame, BEFORE building the world transform; add to the camera
FX.backdrop(ctx, view)                 // replaces drawBackdrop (void, nebula, two star layers, map border)
FX.rock(ctx, rock, view)               // replaces drawRock (cel asteroid, baked once per rock)
FX.drawLayer(ctx, 'under'|'over'|'screen', view)
FX.station(ctx, stationView, view)     // a structure (replaces plainDart for structs)
FX.shipBody(ctx, shipView, view)       // replaces drawShipBody (cached still hull + live layers)
FX.drawTrail(ctx, shipView, view)      // replaces drawTrail (engine-tinted, speed-density)
FX.drawBolt(ctx, p, view)              // per S.proj entry
FX.drawMissile(ctx, m, view)           // per S.missiles entry (owns the tracking smoke)
FX.drawChaffCloud(ctx, f, view)        // per S.chaff entry (flares + silver glints)
FX.drawBoardLink(ctx, a, b, prog, view)// the docking clamp + marines crossing, while boarding runs
FX.badge(ctx, key, x, y, r, k)         // the 12 status glyphs, filled chunky art; k = 0..1 pop
FX.lockMark(ctx, x, y, r, k, o, view)  // the lock read (round 2, below); o = {locked, hostile, flipAge, alpha}
FX.setShake(bool) · FX.stats()         // {particles, oneshots, spritesCached, msLastDraw, msLastUpdate}
FX.TUNE                                // the live tunables table (below); a panel slider on any field works
```

**`view`** (build once a frame, pass everywhere):

```js
{ z, cx, cy,            // camera (cx/cy AFTER adding camShake's offset)
  W, H, dpr,            // css size and devicePixelRatio
  t,                    // GAME seconds (S.t)
  now,                  // real ms (performance.now())
  ra, tick,             // the sub-step fraction RA and SIM.TICK/1000 (bolt/missile interpolation)
  reduced,              // prefers-reduced-motion (or the panel toggle)
  mapW, mapH, margin,   // SIM.W, SIM.H, SIM.MARGIN (the backdrop needs them)
  lod }                 // optional; derived from z when absent (<0.25 → 0, ≥1.0 → 2)
```

**`shipView`** — exactly the brief's §9 object. Fields the module actually reads: `id, art, livery, faction, drone,
size, x, y, h, vh, speedFrac, turnFrac, boost, rollT, driftT, crits[], damageStage, panic, pinned, lead, trail,
iconBoost`. (`shieldF/R`, `firing`, `selected` etc. stay the renderer's — shields, pips, locks and selection are the
command layer and keep their current drawing.)

**`stationView`**: `{ id, art, x, y, h, size, damageStage 0..3 (or hullFrac), dark, ours, jam:{x,y}|null,
iconBoost }`. `jam` is the point it jams (the jump point's coordinates); the module draws the dashed hazard link and
its travelling pulse itself, under the station's own hull.

### Events (`FX.event(kind, data)`)

All take `x, y`. The table is the brief's §9 list; extras are noted.

| kind | data beyond x,y | what happens |
|---|---|---|
| `muzzle` | `h` (shot heading), `style` (PROJ key), `r` | baked flare at the gun + two fast glow motes |
| `boltHit` | `surface:'shield'\|'armour'\|'hull'`, `dir`, `style` | shield: hex splash + cyan shards · armour/hull: sparks back along `dir`, hot fleck, a puff |
| `missileLaunch` | `faction` | ignition ring + smoke kick (the FOX floater stays yours) |
| `missileHit` | `size` | staged fireball + embers + smoke + shake |
| `missileMiss` / `missileShaken` | — | small pop · a break-sparkle |
| `chaff` | — | the burst (the drifting cloud is `drawChaffCloud` per sim entry) |
| `explode` | `size, art, livery, faction, struct, h, vh, speed, spiral` | **the money shot.** Fighters: `TUNE.spiralChance` (50%) of the time the corpse first **careens off in a death spiral** — a wild tightening curl along `vh` at `speed`, tumbling, streaming fire and black smoke for `TUNE.spiralSecs` (2 s) — then the full explosion fires where it ends; otherwise (and always when `art` is missing) it blows at once: flash → cel fireball → hot shock ring → **debris cut from the ship's own hull** → embers + smoke + shake + a soft screen flash. Pass `spiral:true/false` to force either path. The spiral is pure theatre: the sim's kill, SPLASH floater and scoring stay at the real death. Structures: multi-stage sub-booms, a huge ring, a smoke column, and a **lingering scorched wreck** that fades over seven seconds |
| `collide` / `rockHit` | `speed` | crunch flash, spark spray, dust, shake |
| `jumpOut` | `ship` (view obj) | spool glow → the hull **stretched along its line of flight** → flash → fading ring. **Green for ours**, Heg-blue for theirs |
| `warpIn` | `ship` | a white rip across the entry heading, a decompression flash, a pulse ring (blue and a touch of shake when it's the Hegemony arriving) |
| `ability` | `ship, key` | boost ignition ring · k-turn thruster ring · barrel jink sparks · shield surge · field-repair green shimmer + welding sparks · lock-in calm pulse |
| `command` | `key` (+`tx,ty` for recall; `edge,x0,x1,y0,y1` for recon) | support wave (cyan) · override flash (gold — it's a command) · recall homing motes (green) · recon sweep wave across the zone (hazard) · decoy deploy pop |
| `capture` / `objective` / `steady` | `done` / `failed` | the pulses |
| `board`, `lockFull`, `lockWarn` | — | no-ops by design: boarding is the continuous `drawBoardLink`, and locks stay the command layer's |

## Where each call goes in `arena-hc.js`

In `frame(now)`, after the sim steps and `RA` is set:

```js
SR_SPACE_FX.update(steppedTicks*SIM.TICK/1000, realDt);   // game seconds advanced this frame, real ms
```

In `render(now)` (line numbers against `space-combat-testing` @ `141eea5`):

1. **Camera** — before building the world transform (~347): `const sh=SR_SPACE_FX.camShake(view);` and add
   `sh.x, sh.y` to `cam.x, cam.y` for this frame only (never write them back).
2. **Backdrop** (~349): replace `drawBackdrop(ctx)` with `SR_SPACE_FX.backdrop(ctx, view)`, and **drop the
   full-screen pre-clear fill** above it — the backdrop covers the map, and the double clear is a wasted
   megapixel fill at DPR 2.
3. **Rocks** (~350): `SR_SPACE_FX.rock(ctx, r, view)`. The cache keys on `r.verts` (stable in the sim), so wrapper
   objects are safe — but don't rebuild `verts` arrays per frame.
4. After `drawPoints` and before the trails: `SR_SPACE_FX.drawLayer(ctx,'under',view)` (recon wave, under-effects).
5. **Trails** (~401): `SR_SPACE_FX.drawTrail(ctx, sView, view)`.
6. **Bodies** (~406): structs go to `SR_SPACE_FX.station(ctx, stView, view)` (killing `plainDart`); everything else
   to `SR_SPACE_FX.shipBody(ctx, sView, view)`. Keep `drawShields`, the selection rings, labels, pips and locks
   exactly where they are — the command layer stays yours and stays gold.
7. **Shots** (~411): inside `drawShots`, bolts → `drawBolt` per `S.proj` entry, missiles → `drawMissile` per
   `S.missiles` entry, and delete the `fx` ring/dot fallbacks for events you now forward (keep forwarding the
   data instead, below). `drawChaff` → `drawChaffCloud` per cloud.
8. While a boarding objective runs: `SR_SPACE_FX.drawBoardLink(ctx, grafPos, clampPos, prog, view)` — clamp
   positions come from `SR_ART.STATIONS[art].pads`.
9. After the shots: `SR_SPACE_FX.drawLayer(ctx,'over',view)` — the pool and one-shots, over the ships.
10. **Screen space** (after the `setTransform(dpr,...)` reset, ~415): `SR_SPACE_FX.drawLayer(ctx,'screen',view)`
    first (the subtle big-kill flash), then your pips, floaters, bubbles.
11. **Badges** (~477): in `drawBadges`, replace the `Path2D` stroke with
    `SR_SPACE_FX.badge(ctx, b.k, x, y, BADGE_R, pop)` — the glyph keys match your `BADGE` table.
12. **Camera tiles**: call `shipBody` with the tile's own view (`dpr:1, lod:0`); the hull cache buckets by pixel
    size, so tiles share the module cleanly. Keep your warm-up / fallback logic as is.

**Raising the events**: you already diff `abLog`, `misBreakT`, `dodgeT`, `breakT` for badges — raise
`FX.event('ability'|…)` from the same diffs. `S.fx` entries carry bolt hits (`kind, x, y, h`) → `boltHit` with
`surface` from `kind` plus armour-vs-hull from the target's `arm`. Kills: on `alive` flipping false without
`jumped` → `explode` with the ship's art/livery/size (struct flag for stations). `jumped` → `jumpOut`. New ships
appearing (waves / reinforcements) → `warpIn`. `S.m.collisions` changing → `collide` at the existing `fx` 'hull'
position. Commands and objectives already flow through `pushEvent` — mirror them to `FX.event`.

## The hurt read, the death spiral, lasers and locks (round 2, the designer's notes of 14 Oct)

- **Damage reads from `hullFrac`, not stages**: at **≤ `trailSmokeAt` (25%)** a ship streams a smoke trail — puffs
  dropped in its wake with almost no velocity, so they hang as a ribbon you read at any zoom; at **≤ `trailFireAt`
  (10%)** it burns: fire licks the hull every frame, embers, and the smoke turns black. Stage 2/3 remains the
  fallback for callers without `hullFrac` (the camera tiles can keep passing stages). Sprite scorch still comes
  from `damageStage`.
- **The death spiral** (see `explode` above): chance and length are `TUNE.spiralChance` / `spiralSecs`, both on
  sliders in the guide. The careen path is baked at the kill from the module's own RNG, so pause and 3× replay it
  exactly. Send `vh`, `h` and `speed` on the explode event so the spiral continues the ship's real motion.
- **Lasers**: `sr-art.js` gains two additive `PROJ` entries — `shiplaser` (warm, devlin palette) and `heglaser`
  (cold, varrondow) — with type `slaser`, which `drawBolt` renders as a **coherent beam-dart**: hard butt ends, a
  white filament core, a cross-flare at the head above zoom 1. The colour meanings hold (rebel warm, Hegemony
  cold); the *shape* is the laser read. **No weapon in the sim fires them yet** — that's C-74 in
  `docs/DESIGN_BLOCKERS.md`; assign the style per weapon when you add one.
- **Lock marks** (`FX.lockMark`): the binary read for a sky full of locks. Acquiring = two thin arcs slowly
  rotating and closing onto the ring (rotating always means not-yet); locked = they snap to four dead-still
  corner ticks and a solid diamond, with one pop ring at the flip (`flipAge` < 0.3 s). Gold for the player's
  locks, hazard for a lock on the player; no glow, no fill, so it sits over the fight without covering it.
  Wiring: in `drawLocks`, keep all your existing *logic* (who shows, `MISSILE_LOCK`, the selected-wing filter,
  the ⚠ LOCK text warning) and replace only the bracket drawing with
  `SR_SPACE_FX.lockMark(ctx, p.x, p.y, shieldR(t,boost)+6/z, lk/need, {locked: lk>=need,
  hostile: s.faction!=='reb', flipAge: S.t - lockedAtT}, view)` — track `lockedAtT` per shooter-target pair where
  convenient, or pass 1 to skip the pop. Under reduced motion the arcs don't rotate (radius and brightness still
  read).

## The tunables (`SR_SPACE_FX.TUNE` — all placeholders, read live)

`poolCap` 768 · `oneshotCap` 72 · `lodOut` 0.25 · `lodIn` 1.0 · `flameLen` 2.4 · `flameBoost` 2.1 ·
`flameFlick` 0.3 · `trailSecs` 1.3 · `boltGlow` 5 · `boltCore` 2 · `missileSmoke` 0.028 s · `missileWobble` 2.2 ·
`trailSmokeAt` 0.25 · `trailFireAt` 0.10 · `trailSmokeRate` 9 /s · `spiralChance` 0.5 · `spiralSecs` 2 ·
`spiralSpin` 7 · `laserLen` 70 · `smokeStage2` 3 /s · `smokeStage3` 7 /s · `muzzleDur` 0.085 · `sparkN` 6 · `shardN` 5 · `boomDur` 0.95 ·
`boomDebris` 9 · `stationBoomDur` 2.8 · `warpOutDur` 0.6 · `warpInDur` 0.55 · `chaffFlares` 6 · `chaffGlints` 12 ·
`shakeBoom` 0.28 · `shakeMissile` 0.16 · `shakeCollide` 0.2 · `shakeStation` 0.6 · `shakeNear` 1600 ·
`screenFlash` 0.1 (0 disables) · `nebulaAlpha` 0.5 · `starFar` 0.55. Plus `HULL_PX_CAP` 3.0 in the module (the
sprite-bake ceiling; above it hulls upsample — a touch soft past zoom 1.0 at DPR 2, and bakes cost a quarter as
much). Put the lot on an `FX` group in the designer panel through the usual getter pattern (`TUNE` itself is the
getter: it's read live).

## Performance (measured)

Method: the guide's stress scene — 16 ships (two marine Grafs, fighters, Vex, motes, drones), the reactor with a
boarding link, **~150 live bolts**, 6 missiles with tracking smoke, chaff, a kill + warp-in every 2.6 s — headless
Chromium (SwiftShader **software** rasteriser, no GPU), 1440 × 900, **DPR 2**, the counter wrapping the entire FX
pipeline (update + clear + every layer and body). Warm caches, 240-frame window:

| zoom | p50 | p95 | note |
|---|---|---|---|
| 0.12 (commander) | 0.9 ms | **3.0 ms** | |
| 0.4 | 0.9–1.0 ms | **2.6–3.3 ms** | the brief's default case |
| 1.2 (close) | 1.2–2.0 ms | **5.2–6.7 ms** | residual spikes are first-sight hull bakes, bounded by `HULL_PX_CAP` |

Round 2 re-measured with the new load — two ships streaming damage trails, death spirals on the rolling kills, two
live lock marks and laser fire in the mix — and stayed in the same envelope: p95 3.2 / 3.7 / 6.0 ms.

All inside the ≤ 8 ms p95 budget **on a software rasteriser**; a real mid laptop's GPU canvas sits well under.
First seconds at a new zoom spend more while the sprite caches warm (same behaviour as today's renderer — keep your
tile warm-up habit). One lesson baked in: the rock cache keys on the `verts` array, after profiling caught a
re-bake-per-frame footgun when a wrapper object was rebuilt each frame (it alone cost 5.9 ms).

Run it yourself: open `docs/art/space-fx-guide.html?stress` — the readout shows live / p50 / p95 / particles, and
`window.__FXSTATS` exposes the same numbers for a headless check.

## Coverage against the brief

Every row of §5 and §6 has a look; the deliberate exceptions: **locks and the lock warning stay the renderer's**
(they're the command layer — I'd keep them gold/hazard brackets exactly as they are; see Q5), **morale** shows only
through panic (flee = ragged burn, freeze = guttering engines, drifting) as §6.4 suggests, and the **Hegemony plan
tells** (`lure`/`strike`) are left out as the optional row they are — a retreating raider already smokes if you set
its `damageStage`. `clamper`'s beam stays `SR_ART.clampBeam` (it bakes badly and no HC scenario fields one).

## The brief's five questions (§11)

1. **Engine flames**: one baked sprite per engine colour (warm lobe + hot core, ink-free, additive), stretched per
   engine per frame — one `drawImage` each, one composite switch per ship. Cheaper than a strip and it scales
   continuously with speed.
2. **Debris**: **cut from the ship's own hull** — at death the body is baked once (`still`, one damage stage up) and
   sliced into three wedges that tumble apart. Juicier than tinted chunks and the cost is one-off, at the kill.
3. **Stations**: the modular kit (above), three authored entries, in `SR_ART.STATIONS` beside `SHIPS` so the next
   station is data.
4. **Backdrop depth**: two layers was the right amount — a far star field at 0.55 parallax and a barely-there baked
   nebula (α 0.5 over near-void tones). A planet or bright nebula started competing with the tracers, so no.
5. **Command layer**: keep it exactly as drawn — flat, gold, on top. Two small offers, not changes: the badge glyphs
   are now filled art (`FX.badge`), and if you want the lock reticle heavier later, thicken the bracket stroke
   rather than adding glow; glow would blur the one layer that must stay crisp.

## Things I need from you (sim / renderer asks)

- **`view.ra` and `view.tick`** on the view object (you already compute `RA`; bolts and missiles interpolate with it).
- **`collide` positions**: keep pushing the contact `fx` entry you already push; I only need its `x, y` forwarded.
- **Boarding**: tell me which Graf is docking (e.g. surface the boarder's id on the board objective) so the renderer
  can hand `drawBoardLink` both ends. Until then, nearest marine Graf works.
- **`station` art key** on scenario structure entries, as above.
- Nothing else — every other field in §6 is already in the view objects the brief promised.

## Acceptance checklist (brief §10)

1. §5/§6 coverage: above, with the three named exceptions. 2. House rules hold; gold stays command-only (the one
gold effect is the Override flash — a command). 3. p95 ≤ 8 ms at DPR 2: measured, table above. 4. Silhouettes and
hit sizes untouched (hulls are the same `SR_ART.ship` geometry). 5. Reads at 0.12 / 0.4 / 1.2: the guide's three-pane
bench and the stress zoom switch. 6. Reduced motion: no shake, no screen flash, no wobble, steady pulses.
7. Existing `SR_ART.ship` callers: `still` defaults off; the hangar, `space.js` and both other rulesets draw
byte-identically (the only touched lines are gated behind the new flag).
