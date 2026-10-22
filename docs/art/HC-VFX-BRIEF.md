# Brief for Claude Chat: High Command space combat, a visual pass (art, animation, VFX)

**From:** Claude Code (the game's engineer). **For:** Claude Chat, working as the game's artist, animator and VFX
artist. **Back to:** Claude Code, as a handoff package (§10).

You're being asked to make Star Rebellion's real-time space combat (the Arena's **Type 3: High Command** ruleset)
look and feel much juicier, in the art style the game already has, without slowing it down. This brief is everything
you need: what the game is, what's on screen, every entity, state and event that should read visually, the data
the renderer has for each, the style rules, the performance budget, and what to hand back.

The designer will attach these files alongside this brief. Read them first:

| File | Why |
|---|---|
| `game/art/sr-art.js` | The world art kit (`window.SR_ART`). The ships, projectiles, impacts, explosions and the house style live here. Your work extends it. |
| `docs/art/HANDOFF.md` | The previous art handoff: the house rules and the handoff format to mirror. |
| `docs/art/styleguide.html` | The living style guide. Your new guide page sits beside it. |
| `game/ui/sr-theme.js`, `game/ui/sr-theme.css` | The palette tokens (`SR_THEME.C`). |
| `game/js/arena-hc.js` | High Command's renderer (where your work gets wired in). Read `render()` and everything it calls. |
| `docs/art/hc-vfx/*.png` | Four screenshots of how it looks today (§3). |

You don't need the simulation file; §6 lists every field you can read.

---

## 1. What High Command is

A real-time, top-down space battle at a commander's distance. The player doesn't fly. They command **wings**
(groups of 2 to 4 fighters) with orders (Attack, Escort, Defend, Hold, Withdraw and so on), tactics and mission
rules, and spend command points on interventions. Pilots fly themselves. The fun is watching a plan play out, so
**the action has to read at a glance and be thrilling to watch close up.** Time can be paused (free), slowed
(0.3 ×), played (1 ×) or fast-forwarded (3 ×).

Three scenarios exercise everything:

- **hc1 Nightfall**: escort a hauler (Convoy Lark) past patrols to a jump point that a relay station jams.
- **hc2 Last Light**: defend a rebel station through three raiding waves.
- **hc3 Meltdown**: board a Hegemony reactor platform with marines and bring down an ace (Commandant Vex).

The fighting looks like this, and the visuals should sell it:

- **Attack runs:** ships fly *at* a target, fire, overshoot, extend away, turn back at their best turning speed and
  run in again. A slow ship turns badly, and turning bleeds speed.
- **Break-offs:** pilots disengage from a stalemate or when something is on their tail.
- **Missiles** (Crosses and the Scimitar) need a lock. Targets run, boost, break hard, barrel-roll and throw chaff.
- **Collisions** happen, and pilots steer to avoid them.

## 2. Your role and the bar

You're the art director, animator and VFX artist for this pass. The bar is a polished, small-studio indie top-down
space game: crunchy muzzle flashes, glowing bolts, shield shimmer, sparks and debris, heat and smoke from damaged
ships, readable missile trails and lock-ons, satisfying kills, warp-ins and jump-outs, and stations that look like
places. **All of it in the existing Bobbleheads style**: ink outlines, one cel tone, light from the top left,
chunky shapes, saturated effects on a quiet world. It's not realistic, and it shouldn't be generic sci-fi bloom.

**Two hard limits:** you change how things look, never how they play, and you stay inside the frame budget (§8).

## 3. How it looks today (the screenshots)

- `01-dogfight-close.png`: a close fight at zoom 0.9. Ship sprites, shield arcs, hull pips, bolt streaks, a kill
  (a plain orange ring and SPLASH), speech bubbles and status badges.
- `02-missile-lock.png`: a Cross's missile in flight at the relay, with the lock brackets.
- `03-station-defence.png`: hc2. **Lastlight Station is a placeholder octagon**, and Relay K-7 and the Reactor
  Platform are too. Defenders are interposing, a lock bracket shows on a Pursuer, and the lines are faint intent lines.
- `04-overview-brawl.png`: hc3 at zoom 0.12, the commander's view.

What's weak today (my read; add yours):

1. **Engines are frozen.** Ship bodies are cached sprites drawn at time 0, so the flame, lights, boost and damage
   smoke never animate.
2. **No muzzle flashes** in High Command (the kit has `muzzleFor`, unused here). Bolts are plain two-tone streaks.
3. **Impacts are dots**, and a shield hit is a brief brighter arc.
4. **Kills are a ring.** There's no fireball, debris or flash, and a destroyed station just vanishes.
5. **Stations have no art.**
6. **Jumps and arrivals have no effect.** Ships pop in at the edge and vanish at the jump point.
7. **Abilities are only a small badge.** Boost, barrel roll, K-turn, drift, shield boost and field repair don't
   show on the ship.
8. **Missiles** are a small dart with a grey trail, with no launch, no tracking smoke and no proximity flash.
9. **Chaff** is gold squares.
10. **Speed and turning don't read**: no banking, no afterburner and no motion trail beyond a thin line.
11. **The backdrop is flat**: a black void with tiled stars and one dashed map border.
12. **Rocks** are flat polygons in the rock biome colours.

## 4. The art style (non-negotiable)

From `sr-art.js` and `docs/art/HANDOFF.md`, applied to space:

1. **One ink, one light.** Hulls carry a dark ink outline (`C.ink #070818`) and one cel-shade tone, lit from the
   **screen's top left whatever the heading** (the ship renderer already shifts the light against rotation; keep
   that).
2. **Red is ours, blue is theirs.** Rebels are patched, faded and personal (`C.rebel #ff4a3d` accents, warm cream and
   olive hulls, hand-painted marks, tape, scorch). The Hegemony is clean, dark navy and white, faceless (visor slits)
   and glowing blue (`C.heg #4f8cff`, `C.hegHi #9cc2ff`). Drones are Autocom: cyan eyes (`C.shield #36e3f2`).
3. **Effects carry the saturation; the world stays quiet.** The backdrop, rocks and map furniture are low-contrast
   and desaturated. Bolts, flashes, fire, shields and lock-ons are where colour goes.
4. **Colour has meaning; keep the meanings.**

   | Colour | Token | Means |
   |---|---|---|
   | Gold | `#ffc83a` | The player's selection and command (selection rings, attack designations, armed actions). Not for effects. |
   | Cyan | `#36e3f2` | Shields, drones' eyes |
   | Orange | `#ff8a1f` (`C.hazard`) | Danger and heat (incoming lock, fire, collisions) |
   | Purple | `#b47cff` (`C.psi`) | Your missiles |
   | Green | `#78ec5c` (`C.go`) | Good news (repairs, a jump away, a steadied pilot) |

   Rebel bolts are warm (`STYLE.bhord`: `#fff3c0` core, `#ffb347` glow). Hegemony and drone bolts are cold
   (`autocom` cyan, `patriot` blue-white). Weapon makers' palettes are in `SR_ART.STYLE`.
5. **Readable at a commander's zoom.** At zoom 0.1 to 0.3 a ship is a few dozen pixels, so effects must still read:
   chunky silhouettes, a few big shapes, bright cores. At zoom 1.0 to 1.6 they can show detail.
6. **Swap, don't redraw.** New looks are data in tables (`SHIPS`, `PROJ`, `STYLE`, a new effects table), not
   one-off code paths.

## 5. The cast: every entity on screen

Sizes are in world units. The default map is 67,200 × 48,000 (16 × space.js's 4,200 × 3,000), with the scenario in its
middle 16,800 × 12,000. Ship art is drawn at `scale = visualSize(size) × 1.6 × 0.85 × 1.35`, where `visualSize(n) = 0.7
+ 0.09 × n`. A size-5 Cross is about 86 units long. The hit ellipse is half-length 22 × visualSize × 1.35 and
half-width 10 × visualSize × 1.35, about 34 × 15 for a Cross. **Keep silhouettes roughly that size; hit boxes don't
change.** When zoomed out, ships draw up to 3.2 × bigger as icons (`iconBoost = clamp(0.5/zoom, 1, 3.2)`).

### 5.1 Ships (all already in `SR_ART.SHIPS`; polish them, keep their identity)

| Ship | Key | Side | Size | Top speed | Turn | Weapons | Notes |
|---|---|---|---|---|---|---|---|
| FT-4 Cross | `cross` (game `viper`) | Rebel | 5 | 800 | wide (80% of a Talon's rate) | twin repeaters, **2 missiles** | The workhorse. Missiles under the wing. |
| SF-11 Talon | `talon` | Rebel | 4 | 1,000 | nimble | twin repeaters | Ex-racer, checkers and roundel |
| Graf Hauler | `graf` | Rebel / civilian | 7 | 600 | sluggish | door guns (marines' Grafs) | Convoy Lark (unarmed escort target), Anvil and Forge (marine boarders) |
| VC Mote | `mote` | Hegemony | 4 | 800 | nimble | one repeater | Patrols, guards, raiders, the most common enemy |
| VK-3 Scimitar | `scim` | Hegemony | 5 | 1,000 | medium | repeaters, **missiles** | Commandant Vex: an ace and a **flagship**. Should look like the boss. |
| VT-2 Fledgling | `fledgling` | Hegemony | 3 | 600 | | one repeater | Cadets (not in the three scenarios, but in the roster) |
| Drone Pursuer | `pursuer` | Autocom | 3 | 1,000 | | twin guns | Robotic, no pilot, no morale |
| Drone Monitor | `monitor` | Autocom | 2 | 800 | | one gun | Calls reinforcements |
| Drone Mag-Clamper | `clamper` | Autocom | 6 | 400 | | magnets | Clamp beam (`clampBeam`) exists in the kit |

Speeds are units a second at the default speed setting (×4). Bolts fly 2,000 a second (ballistic 2,500), missiles
2,600. At 1 × a fighter crosses a 1,140 px screen at zoom 0.5 in about a second.

### 5.2 Stations (**no art yet**)

All three use the `fuel-depot` row (size 12, can't move, can't turn) and draw a placeholder octagon. Each needs its
own look, and the art key can come from the label or a new `station` field on the scenario entry; tell me which.

| Station | Scenario | Side | Story | States to show |
|---|---|---|---|---|
| **Relay K-7** | hc1 | Hegemony | A comms relay that **jams the jump point**. Hull 200, armour 30. | Jamming (a pulse that ties it to the jump point, which shows "JAMMED" in hazard orange), damaged, destroyed (big). |
| **Lastlight Station** | hc2 | Rebel | An evacuation station the player defends. Hull 300, armour 40. | Under fire, damaged, still standing when the clock runs out. Patched rebel look; lights in its windows. |
| **Reactor Platform** | hc3 | Hegemony | Boarded by marines. Hull 260, armour 40. | **Boarding progress** (0 to 1: docking clamps and marines crossing over), boarded (it goes dark and is ours), damaged, destroyed. |

### 5.3 Map furniture

| Thing | Today | Data |
|---|---|---|
| **Jump point** (extraction) | Dashed spinning green ring (350 radius), hazard orange and labelled JAMMED while the relay stands | `S.points.jump`, `jammed('jump')`, radius `JUMP_R` 350 |
| **Capture point** (hc1's satellite) | A cyan diamond and a progress arc | `S.points[k].capture`, objective `prog` 0..1, `done` |
| **Asteroids / rocks** | Flat polygons, rock biome colours, ink edge | `{x,y,r,verts[],rot}`, r about 135 to 195 at the default scale. Collision radius 0.95 r. |
| **Backdrop** | Void `#0a0c22`, a repeating star tile (8,400 × 6,000, 1,680 stars, 4 brightness bands), one dashed map border | Camera `{x,y,z}`. You may add parallax layers, a faint nebula or dust (§8). |
| **The play area** | Invisible | `SIM.zone {x0,y0,x1,y1}`. Waves and reinforcements arrive 1,200 beyond its edge. |
| **Decoy beacon** (command) | A cyan diamond, a pulsing ring and a timer label | `S.decoys [{x,y,until}]` |
| **Recon Sweep** (command) | A hazard band on the edge reinforcements come from, and every Hegemony intent line | `S.reconUntil`, `S.reinforce.edge` |

## 6. States and events: what each should look like

Everything here is already in the simulation. You get read-only access through the objects the renderer passes
(§9). Times are **game seconds** (`S.t`) unless noted. Paused means `S.t` stops, so effects keyed to `S.t` freeze, which
is right. UI pulses (selection, badges, bubbles) run on real time.

### 6.1 Flight and handling (per ship, every frame)

| State | Field(s) | Show |
|---|---|---|
| Position and nose | `x,y` and `h` (already interpolated between sim steps, §9) | The body. The nose can lead the line of flight by up to 0.2 rad. |
| Line of flight | `vh` (velocity heading), `vx,vy` | Engine exhaust and the motion trail point back along this, not the nose. |
| Speed | `hypot(vx,vy)` against top speed (`capsOf(s).vMax`) | Flame length, exhaust heat, contrail density. Minimum speed is about 40% of top. |
| Turning hard | `turnW` (rad/s of path), `capsOf(s).wc` (best rate) | **Bank** (the kit's `roll` squashes the hull) and wingtip vortex streaks in a hard turn. Turning bleeds speed. |
| Corner speed | 0.7 × top | Optional: a subtle "in the sweet spot" shimmer. |
| Boost (ability) | `boostT > 0` (2 s) | Afterburner: long hot flame, a shockwave puff at ignition, heat streak. |
| Barrel Roll (ability) | `S.t < evadeT` (1.5 s), half the hit profile | A visible roll: the hull flips through its squash, with jink sparks. |
| K-Turn (ability) | Instant 180° flip of the line of flight (`abLog` entry `kturn`) | A flip with a thruster puff ring. |
| Drift (ability) | `S.t < driftT` (3 s): the nose swings onto a pursuer while it flies on | Side thruster jets, and the nose visibly off the line of flight. |
| Attack-run phase | `mv`: `run` / `extend` / `turn` / `pursue` | Optional subtle cues (throttle-up on `run`, a heat puff when extending). |
| Collision | `S.m.collisions` changes; `fx` 'hull' at the contact; floater "COLLISION" or "IMPACT" | A crunch: sparks, a debris spray, a knock-spin (the sim adds spin). |
| Dodging a crash | `dodgeT === S.t` | A brief side-thruster jet. |

### 6.2 Weapons

| Event | Data | Show |
|---|---|---|
| **Gun burst** | `S.bursts`: a ship fires 8 bolts, 0.06 s apart, every 0.75 s. Each bolt is in `S.proj` `{x,y,x0,y0,vx,vy,owner,faction,w,style,age,life}`. `style` is the `SR_ART.PROJ` key: `repeaters` (rebel), `dronegun`, `cruiser` (Hegemony), `doorgun` (ballistic). | **Muzzle flashes** at the guns (the ship's `mounts.primary` points, alternating sides). The bolts themselves (glow core, maker palette). Spent bolts fade at the end of their life. |
| **Lock** | Every ship: `locks{targetId: 0..1}`, `lockOn`. A missile can go at 0.6 (`MISSILE_LOCK`). | Today it's gold brackets closing, orange with a LOCK label once a missile can go. Make it a crisp HUD-style reticle (screen space is fine). A lock steadies the guns. Show brackets only for the selected wing and for missile carriers. |
| **Lock warning** | A Hegemony missile carrier with `locks[yourShip.id] ≥ 0.25` | A "⚠ LOCK" tag above your ship, blinking at ≥ 0.6. Make it a proper warning glyph. |
| **Missile launch** | `S.missiles` gains `{x,y,px,py,h,owner,faction,target,lock,life,trail[],decoy}`; event `missile`; floater FOX | A launch kick: rail flash, smoke puff, the motor lighting a beat later. |
| **Missile in flight** | Speed 2,600 a second, turn 6 rad/s, life 6 s. `faction` decides the colour (yours purple, theirs orange). | A bright motor, a **smoke trail that lingers and curls** (the best place to spend particles), and wobble in hard turns. |
| **Missile decoyed by chaff** | `decoy` set: it flies into the cloud and bursts there | A turn toward the cloud, then a burst inside it. |
| **Missile hit** | `fx` 'boom' size 0.7, floater "MISSILE HIT −n" | A bigger impact than a bolt: a fireball, a shield flare if shields held, a shock ring. |
| **Missile miss or expiry** | `fx` 'boom' size 0.5 | A small self-destruct pop. |
| **Shaken** | floater "SHOOK IT" | A break of the lock (sparkle at the missile, which goes ballistic). |
| **Chaff** | `S.chaff [{id,x,y,vx,vy,t0,until}]` (3 s, drifting); event `chaff` | A burst of glittering foil and flares from behind the ship, spreading and fading. Hot orange-white flares plus silver glints. |

### 6.3 Damage and defence

| State | Data | Show |
|---|---|---|
| **Shields** | `segs.F` and `segs.R` `{val,max}`: front and rear 120° arcs. `shFx {zone,t}` on a shield hit. | Today: thick arcs (cyan fill on dark) round the ship. Keep the read (front and rear, how full) but make hits **flare where they land**: a hex shimmer and ripple at the hit point (kit: `shipShield`). An empty shield flickers. |
| **Boost Shields** (ability) | `abLog` `shields` | A surge of energy round the arcs. |
| **Bolt hits** | `S.fx` `{x,y,t0,kind:'shield'|'hull',h}` (`h` is the bolt's heading) | Shield: a cyan hex splash. Armour or hull: sparks spraying back along `h`, hot metal flecks and a puff (kit: `impact` surface `armour` / `hull`). |
| **Armour and hull** | `arm/maxArm`, `hull/maxHull` | Damage stages: 0 to 0.3 clean, 0.3 to 0.6 scorched, smoking and sparking, over 0.6 burning, engine sputter, lights failing (the kit has these at `damage` 0..1 but they're frozen in the sprite today). |
| **Criticals** | `crits[]` of `engine`, `targeting`, `controls`, `emitter`, `feed`, `cockpit` | One tell each: engine (sputtering, uneven flame), targeting (a flickering sensor), controls (a wobble), shield emitter (arcs crackle out), ammo feed (a jam spark at the guns), cockpit (the cracked canopy, `pilotHit`). |
| **Field Repair** (ability, wing leader) | `abLog` `fieldrep` | A green repair shimmer and welding sparks. |
| **Destroyed** | `alive` false, `deadT`; `fx` 'boom' with `size`; floater SPLASH (stations: DESTROYED) | **The money shot.** A flash, fireball, expanding debris (hull-coloured chunks that tumble and fade), a smoke puff, a shock ring and an ember shower. Scale by size; a station's is enormous and multi-stage. |
| **Jumped out** | `alive` false and `jumped` true, `jumpT`; event `jump` at the jump point | A warp-out: spool-up glow, stretch along the line of flight, a flash and a fading ring. Green for ours. |
| **Arrived** (waves, reinforcements) | A new ship appears at the play area's edge; events `wave`, `reinforce` | A warp-in: a rip of blue light, the ship decompresses into place, a pulse ring. The Hegemony's should feel threatening. |

### 6.4 Pilots and morale (rebels show it; drones have none)

| State | Data | Show |
|---|---|---|
| Morale | `SIM.moraleOf(s)`: EAGER, STEADY, SHAKEN, PANICKED | Mostly the HUD's job. On the map, a panicked ship could leak erratic exhaust or a stutter. |
| **Pinned** (emergency) | `emerg {kind:'pinned'}`: two or more guns on it | A pulsing hazard ring (today the tile border flashes). |
| **Panicking** | `panic {mode:'flee'|'freeze'}` | Flee: ragged burn. Freeze: engines guttering, drifting. |
| Steadied, Lock In (ability) | event `steady`; `abLog` `lockin` | A calm pulse. |
| Wing leader | `lead` true | A small chevron or star by the ship (the roster shows ★). |
| Speaking | `S.barks` → bubbles (HUD) | Out of scope; leave the bubbles. |

### 6.5 Objectives and commands

| Event | Data | Show |
|---|---|---|
| Capture | Point progress 0..1, `capture` event | A beam or ring filling up, then a flag "ours" pulse. |
| Boarding | Station `boardProg` 0..1, `board` event | Docking clamps and a crossing beam between the marine Graf and the station; the station goes dark when boarded. |
| Objective done or failed | `objective` events | A celebratory or fail pulse on the object (map space). |
| Commands | `command` events: Patriot Override, Emergency Recall, Emergency Support (shield recharge), Recon Sweep, Decoy Signal, Reinforcement Request | A one-shot each on the affected ship or place: Support (a shield recharge wave), Recall (a homing beam), Override (a gold "order" flash), Recon (a radar sweep wave across the map), Decoy (a beacon deploy). Abort has none. |
| Hegemony plan | event `heg`: "The raiders split…"; `hegRole` `lure` / `strike` on raiders; `retreat` (hurt, going home) | Optional: a subtle tell on strikers holding off, smoke on a retreating raider. |

### 6.6 The command layer (keep it, polish it)

These are the player's tools; they must stay crisp, flat and on top. Gold means command.

- **Selection** rings round the selected wing's ships (gold), and the selected ship (brighter).
- **Engagement ring** (dashed, faint rebel red) round the selected wing.
- **Attack designation**: a rotating dashed gold ring and an "ATTACK" label on the target.
- **Intent lines**: dashed lines from a ship to where it's going, shown only for the selected wing and the enemies
  going for it, at 40%.
- **Box select** (a gold dashed rectangle), the order wheel (HTML, out of scope), floaters (rising text), and
  **status badges** (round 22 px icons by a ship for 2.5 s when it uses an ability, fires or dodges a missile, dodges
  a crash, or breaks off). The badge glyphs are placeholders and want your art: shields, lockin, boost, drift, kturn,
  barrel, fieldrep, missile, evade, chaff, dodge, breakoff.

## 7. What exists in code today (so you extend, not duplicate)

**`sr-art.js`** (`window.SR_ART`):

- `ship(ctx, id, x, y, heading, scale, t, {livery, damage, boost, roll, fire, pilot, off, clamp, calling, pilotHit})`:
  the full ship. Engines (an animated flame with `t`, longer with `boost`), lights (blinking with `t`), canopy and
  pilot (a tiny character), the Hegemony's glowing trim, the scanner sweep, damage scorch, smoke and sparks with `t`.
  Rebel liveries are `rebel` (Cross also `law`); Hegemony and drones `heg`.
- `SHIPS` (data), `SHIP_FOR_GAME` (game class to art key), `SHIP_WEAPONS` (mounts drawn on the hull).
- `PROJ`, `STYLE` (projectile types and maker palettes), `shot(...)`, `muzzleFor(...)`,
  `impact(ctx,x,y,k,{dtype,surface:'shield'|'armour'|'hull'|…,dir,style,size})`, `shipShield(...)`,
  `explosion(ctx,x,y,k,{size})`, `smoke`, `clampBeam`.

**`arena-hc.js`** (`render(now)`, in this order; map space unless noted):

1. Backdrop (`drawBackdrop`: void, star tile in view, map border), rocks (`drawRock`), points (`drawPoints`: jump
   ring, capture point).
2. Command overlays: engagement rings, attack designations, intent lines, Recon band, decoys.
3. Trails (`drawTrail`: a thin line through the last 26 positions, 1.3 s).
4. Per ship: selection ring, **body** (`drawShipBody`: a cached sprite, see §8), shield arcs (`drawShields`), labels
   for stations and the convoy.
5. `drawShots` (bolts as two-stroke streaks, missiles as darts with a trail, `fx` booms as rings, sparks as dots),
   `drawChaff`, `drawLocks`.
6. Screen space: hull pips and names (`TH.hpPips`), floaters, status badges, speech bubbles, the box.

Camera tiles in the roster (`drawTileCam`) redraw each ship's small live view (a 204 × 112 canvas at `TILE_Z` 0.34) a
few times a second with a coarser sprite cache (36 headings, no DPR). They need a cheap path.

## 8. Performance: the budget and the rules

**Measured today** (1440 × 900, Chromium, headless, a close followed fight in hc1): about **3.3 ms of script a
frame**, p95 7 ms, at 60 fps; the simulation costs 0.2 ms a step at 20 steps a second. The biggest brawl (hc3)
has 16 ships, about 150 live bolts, up to 6 missiles and a handful of explosions.

**Budget for your pass:** the whole `render()` at **≤ 8 ms script a frame at p95** in the hc3 brawl at 1440 × 900 and
devicePixelRatio 2, on a mid laptop. Prove it with a stress scene in your guide (§10). If something can't fit, tell me
what to cut.

Rules:

1. **Canvas 2D only, no image files** (house rule). Pre-render to offscreen canvases freely.
2. **Never `shadowBlur` per frame per object.** It's the most expensive Canvas call. Bake glows into cached sprites
   (a glow dot, a flare, a ring, a smoke puff, a spark), then `drawImage` them, with
   `globalCompositeOperation = 'lighter'` for additive light.
3. **Ship bodies stay cached sprites**, keyed today by art, livery, a scale bucket (8% steps), heading (72 buckets) and
   damage (4 stages), with up to 900 entries. **Split each ship into a cached hull and live layers**: engine flames,
   blinking lights, the Hegemony's glow trim pulse, damage smoke and fire, shield shimmer, bank squash. Draw the live
   layers on top each frame cheaply.
4. **Particles come from a fixed pool** (suggest a cap of about 600 to 800 live), with no allocation per frame (reuse
   objects). Simple per-particle data (x, y, vx, vy, age, life, size, sprite, spin), updated in one loop.
5. **Level of detail by zoom**: below zoom 0.25 drop small particles and ship detail and keep the big reads (flashes,
   explosions, missile trails, warp rings). Above 1.0 add detail. Cull everything off screen.
6. **Reduced motion** (`prefers-reduced-motion`): no screen shake, no flashing over about 3 Hz, shorter or static
   versions of pulses. Keep a toggle for screen shake regardless.
7. **Screen shake**: if you add it, it's a camera offset in the renderer, small, only for big events near the camera,
   and off under reduced motion.
8. **Determinism**: visuals must never touch the simulation's random numbers (`S.rng`) or state. Use your own RNG.
   Visual randomness is free to differ run to run.
9. **Pause**: effects keyed to game time freeze while paused (good for screenshots). Real-time UI pulses keep going.
10. **Timescale 3 ×**: at fast-forward a lot happens at once. Effects must cap gracefully (the pool cap, and drop the
    smallest first).

## 9. How your work plugs in (the interface I'd like)

I'll wire whatever you give me, but this split keeps it clean. Treat it as a proposal and improve it.

**A new module, `game/art/sr-space-fx.js`, exposing `window.SR_SPACE_FX`** (loaded after `sr-art.js`; it may use
`SR_ART`'s tables and helpers):

```js
SR_SPACE_FX.reset()                               // a new mission
SR_SPACE_FX.update(dtGame, dtReal)                // advance particles; dtGame is 0 while paused
SR_SPACE_FX.event(kind, data)                     // one-shots, see the list below
SR_SPACE_FX.drawLayer(ctx, layer, view)           // layer: 'back' | 'under' | 'over' | 'screen'
SR_SPACE_FX.shipBody(ctx, ship, view)             // replaces drawShipBody: cached hull + live layers
SR_SPACE_FX.station(ctx, station, view)           // the three stations
SR_SPACE_FX.backdrop(ctx, view)                   // replaces drawBackdrop (keep it cheap)
SR_SPACE_FX.rock(ctx, rock, view)
SR_SPACE_FX.badge(ctx, key, x, y, r, k)           // the status badge glyphs, k = 0..1 pop
SR_SPACE_FX.stats()                               // {particles, spritesCached, msLastDraw}
// view = {z: zoom, cx, cy, W, H, dpr, t: game seconds, now: real ms, reduced: bool, lod: 0|1|2}
```

**`ship` is a plain view object I'll build each frame from the simulation** (positions already interpolated):

```js
{ id, art:'cross'|'talon'|…, livery:'rebel'|'heg'|…, faction:'reb'|'heg', drone:bool, size,
  x, y, h /*nose*/, vh /*line of flight*/, speed, speedFrac /*0..1 of top*/, turnFrac /*-1..1 of best turn*/,
  boost:bool, rollT /*0..1 through a barrel roll, or null*/, driftT, kturnAge,
  hullFrac, armFrac, shieldF:{val,max}, shieldR:{val,max}, shieldHit:{zone:'F'|'R', age} | null,
  crits:[…], damageStage:0..3, panic:'flee'|'freeze'|null, pinned:bool, lead:bool, flagship:bool,
  firing:bool, muzzleSide:±1, missilesLeft, chaffLeft, selected:bool, iconBoost }
```

**Event kinds I can send you** (all have `x, y`; most have the ship's view object or id):

`muzzle {ship, side, style}` · `boltHit {surface:'shield'|'armour'|'hull', dir, style}` ·
`missileLaunch {ship, missile}` · `missileHit {surface, size}` · `missileMiss` · `missileShaken` ·
`chaff {ship, cloud}` · `explode {size, art, faction, struct}` · `collide {a, b, speed}` · `rockHit {ship, speed}` ·
`jumpOut {ship}` · `warpIn {ship}` · `ability {ship, key}` · `command {key, target}` · `capture {point, prog, done}` ·
`board {station, prog, done}` · `objective {done|failed}` · `lockFull {ship, target}` · `lockWarn {ship}`

Bolts and missiles stay simulation objects (`S.proj`, `S.missiles`). Give me `drawBolt(ctx, p, view)` and
`drawMissile(ctx, m, view)` that I call per object, and keep missile smoke in your particle pool.

## 10. What to hand back

Mirror `docs/art/HANDOFF.md`'s format. One package:

| File | Where | What |
|---|---|---|
| `sr-space-fx.js` | `game/art/` | The module above. Self-contained, commented in the kit's voice, data-driven (an effects table I can tune). |
| `sr-art.js` (changed) | `game/art/` | Only if you change ship or station art. Additive: new `SHIPS` entries (the three stations), polish to existing ones that **keeps every existing call working** (the campaign's hangar, `space.js` and the other Arena rulesets use `SR_ART.ship` too). Say what changed. |
| `space-fx-guide.html` | `docs/art/` | A living guide like `styleguide.html`, self-contained and loading the real modules. Every ship (rebel and Hegemony) at three zooms with all its states (speed, bank, boost, roll, damage stages, crits, shields and hits), the three stations with their states, every effect on a timeline you can scrub, pause and loop, a **stress scene** (the hc3 brawl: 16 ships, 150 bolts, 6 missiles, explosions) with a live ms-per-frame and particle counter, and a reduced-motion toggle. |
| `HC-VFX-HANDOFF.md` | `docs/art/` | The spec: what's new, the API, where each call goes in `arena-hc.js`, the tunables (the effects table), the performance numbers you measured, the reduced-motion behaviour, and anything you need me to add to the simulation (say exactly which field or event, and why). |

**Acceptance criteria** (I'll check these when I wire it in):

1. Every row in §5 and §6 has a look, or you've said why not.
2. The house rules in §4 hold; the colour meanings are unchanged; gold stays the player's command colour.
3. The hc3 brawl stays at or under 8 ms script a frame at p95 on the stress scene, at DPR 2.
4. Ship silhouettes match their hit sizes within about 20%; no gameplay values change.
5. Ships, effects and the command layer read at zoom 0.12, 0.4 and 1.2.
6. Reduced motion has no shake and no fast flashing.
7. The existing callers of `SR_ART.ship` still draw correctly.

## 11. Open questions for you (answer them in the handoff)

1. Engine flames: one shared animated sprite strip per engine size, or procedural? (Either is fine within budget.)
2. Debris: generic chunks tinted by hull colour, or pieces cut from the ship's own parts table? (The latter is
   juicier and still cheap if pre-rendered at death.)
3. Station art: three bespoke drawings, or a modular station kit (cores, arms, dishes, docking clamps, lights) built
   from data, like the ships?
4. The backdrop: how much depth (parallax star layers, a faint nebula, distant planet) before it competes with the
   action?
5. Anything in the command layer you'd change for readability (still flat and gold).

Thank you. Make it sing.
