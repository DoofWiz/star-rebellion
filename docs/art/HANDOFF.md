# Star Rebellion — World art handoff ("Bobbleheads")

This is the migration spec for replacing the game's in-world art (unit tokens, terrain, props, ships, base figures and the galaxy map) with the Bobbleheads style. It pairs with the HUD kit (`game/ui/`, `docs/ui/HANDOFF.md`). The HUD stays as it is apart from the position changes listed under **HUD offsets**.

The living style guide is `docs/art/styleguide.html`. Every picture in it is drawn by `sr-art.js`. If the game and the guide ever disagree, the guide is right.

## Files

| File | Put it at | What it is |
|---|---|---|
| `sr-art.js` | `game/art/sr-art.js` | The module. It exposes a single global, `window.SR_ART`. Pure Canvas 2D with no image files. |
| `styleguide.html` | `docs/art/styleguide.html` | The living style guide (self-contained). |
| `ART-HANDOFF.md` | `docs/art/HANDOFF.md` | This spec. |

Load the module in `game/index.html` **after** `ui/sr-theme.js` and before the scene modules. It reads `SR_THEME.C` at load time, so faction colours stay in one place:

```html
<script src="ui/sr-theme.js"></script>
<script src="art/sr-art.js"></script>
```

Call `SR_THEME.sync()` before `sr-art.js` loads, or reload `SR_ART` after a theme change. The module copies the colours once.

## Guard rails

- **No gameplay changes.** Hit tests, ranges, sight, cover values and movement must not change. The art draws the existing state and never changes it.
- **Existing saves must load.** Don't add required fields to saved objects. Derive everything the art needs at draw time.
- **The autoplay bot must still run** (`tools/autoplay.js`, `tools/sweep.sh`).
- Keep `prefers-reduced-motion` behaviour: pass a frozen `t` (as the scenes already do with `RM`).

## Rules of the house (summary)

1. Faces carry state. Every pose picks an expression.
2. Red is ours, blue is theirs, on the body: a red scarf or armband on every rebel, and a blue visor, scarf, hatband or trim on every hostile. Gold stays with the HUD.
3. Swap, don't redraw. A character is built from slots: body, head, weapon, gear and pose.
4. One ink, one light. Ink outlines are 2.6 on characters, 2.2 on held items and 3 on terrain. Light comes from the top left, with one cel-shade tone.
5. Rebels make do; the Hegemony doesn't. Rebel kit and ships are patched and personal. Hegemony kit is clean and faceless.
6. A quiet world and loud people. Terrain is muted, and saturation goes on characters, usable props and effects.

## API

```js
SR_ART.character(ctx, x, y, who, pose)
// who:  a CAST/ARCH key ('dax', 'deputy'), a recruit name, or a spec object
// pose: { state, view:'front'|'side'|'back', dir:±1, aim (world radians), t (s), s (scale),
//         weapon (key | null), gear ['helmet','vest','pack','frags','medkit','shield'],
//         slung (bool), face (expression override) }
// (x, y) is the anchor: the point between the feet. That's the unit's map position.

SR_ART.viewFor(angle)          // -> {view, dir}   (sin>0.6 front, sin<-0.6 back, else side)
SR_ART.spec(key) / SR_ART.recruit(name, overrides)
SR_ART.portrait(ctx, x, y, r, who, {state, face, t, bg})

SR_ART.prop(ctx, kind, x, y, {t, biome})   // kinds: crate barrel canister trough rock wagon lamp console sandbags
SR_ART.floor(ctx, x, y, w, h, biome, seed) // biome: 'dust' | 'rock'
SR_ART.wall(ctx, x, y, w, h, biome, {fade}) // footprint x,y,w,h; face rises WALL_H (26) above its south edge
SR_ART.trail(ctx, pts, biome, width) · SR_ART.lampLight(ctx,x,y,r) · SR_ART.scorch(ctx,x,y,r)

SR_ART.bolt(ctx, x0,y0,x1,y1, kind, side)  // kind: 'ballistic'|'plasma'; side 'reb'|'heg' colours plasma
SR_ART.hit(ctx,x,y,k) · SR_ART.explosion(ctx,x,y,k) · SR_ART.smoke(ctx,x,y,k)   // k = 0..1 progress
SR_ART.muzzle(ctx, x, kind)                // already drawn by the 'fire' pose

SR_ART.ship(ctx, id, x, y, heading, scale, t, {livery, damage 0..1, boost, roll, pilot, dark})
SR_ART.SHIP_FOR_GAME  // {viper:'cross', talon:'talon', graf:'graf', mote:'mote', scim:'scim', fled:'fledgling'}

SR_ART.isoP / isoBox / emote(ctx,x,y,icon,t,i) / planet(ctx,x,y,r,col,{home,heg,ring}) / route(...)
SR_ART.WEAPONS, GEAR, POSES, PROPS, SHIPS, CAST, ARCH   // data tables, extend freely
```

To add a weapon, prop, ship or archetype, add a data entry. No renderer code changes.

## Who someone is: rebels come from the rebel system

Every rebel, authored or generated, is drawn from their record in the rebel system (`G.people`, built by `Rebel.gen`, see `docs/REBELS_PLAN.md`) through **`SR_ART.lookOf(p)`**. It returns a plain, serialisable spec. **Nothing is saved:** the face comes from a hash of `p.id`, so a rebel looks the same forever and old saves need no migration. Everything else is read live:

| Layer | Read from | Effect |
|---|---|---|
| Genes | hash of `p.id` | skin, hair colour, hairstyle, facial hair, coat shade. `CAST` entries (Joss, Dax, Runa, Kel) override these genes only. |
| Role | `p.role`, `p.heroOf` | outfit; Support carries no weapon; Marines get a vest and helmet; Pilots get caps or goggles; Heroes get a cape and star pin |
| Character Trait | `p.charTrait` | `TRAIT_LOOK`: one tell (an old Hegemony helmet, welding goggles, a medic's band, glasses, a beanie, a long coat, a bandana, a charm, build) or a resting face |
| Rebel Traits | `p.traits[].k` | `RTRAIT_LOOK`: Veteran greys the hair, Decorated adds a medal, Scarred a scar, Grieving a black band, Hardened stubble, fame traits a star pin |
| Body | `p.body` (0 whole, 1 lost, 2 prosthetic) | pinned sleeve or metal hand; peg and crutch or metal leg; patch or cyan lens |
| Medical | `p.cond[].k` | `COND_LOOK`: head bandage, sling, cast and crutch, torso bandage, eye bandage, soot, plasters |
| Rank | `p.rank`, `p.off` | 1–3 chevrons; officers get a bar and a red beret |
| Specialty | `p.spec` | `SPEC_LOOK`: face paint, hood, headset, bandolier, beret |
| Morale | `Rebel.mband(p)` | resting face: Very Low worried, Low flat, Very High grin |
| Kit | `p.gear` | weapon = primary, else secondary, else none; `blam` gadget → frags; a stim gadget → stim pouch |

New traits, specialties or conditions only need a row in those tables.

### Getting the spec into the scenes

The scenes never read `G.people` (REBELS_PLAN §3), so the spec rides along in the data they already get:

- **Ground:** in `squadEntry(p)` (base.js ~L4380) add `art: SR_ART.lookOf(p)`. `mkU` copies it onto the unit as `u.art`. Do the same for reinforcements, the rescued or prize pilot, and the VIP when they come from `G.people`.
- **In-mission injuries:** pass the live ones as `conds: (u.inj||[]).filter(i=>!i.treated).map(i=>i.k)`, so a Broken Arm from this fight shows a sling straight away. A treated injury drops off. `COND_LOOK` covers both the in-mission keys (`concussion`, `bleeding`, `burns`, `eardrum` and so on) and the base condition keys.
- **Lost limbs mid-mission** (`maimed`): pass `extra:['noarm']` or `['peg','crutch']` from the unit's state until the debrief writes `p.body`.
- **Space:** add the same `art` to each `flight[]` entry. The canopy pilot is `SR_ART.ship(…,{pilot: entry.art})`.
- **Base and dialogue:** `personSpec(p) = SR_ART.lookOf(p)`. Portraits use the same spec, so a rebel's portrait updates when they're hurt, promoted or scarred. Re-render a cached portrait when the person's record changes (a simple key: `rank|off|role|cond|body|traits`).

### Everyone else: `artSpec(u)`

```js
function artSpec(u){
  const A=SR_ART;
  if(u.art)return u.art;                                 // any rebel, via squadEntry / flight entry
  if(u.side==='civ')return A.ARCH.civ;
  if(u.vip)return A.ARCH.prisoner;
  if(u.auto)return A.ARCH.bot;
  if(u.shield)return A.ARCH.riot;
  if(u.sheriff)return A.ARCH.sheriff;
  if(u.id==='craw'||/craw/i.test(u.name||''))return A.ARCH.craw;
  if(u.side==='law')return SCN.style==='rock'?A.ARCH.squatter:A.ARCH.deputy;   // Take the Rock's opposition is the Vult gang
  return A.recruit(u.name||u.id);                       // last resort for a rebel with no record (debug spawns)
}
```

`u.vehicle` units (police cruiser, Strider) aren't characters. Keep their current drawing restyled with the kit (ink outline, cel shade). Proper vehicle art is a follow-up.

**Weapon in a mission:** pass `weapon: u.wpns[u.wsel||0]` in the pose, so a swap mid-fight shows at once (it overrides `art.weapon`). Keys already match `SR_ART.WEAPONS`: `akli, carbine, cowboy, scatter, longiron, rocket`. Use `null` for `unarmed`, `fists` and the vehicle weapons. A rebel with a Broken Arm or a lost arm automatically holds any weapon one-handed.

**Gear in a mission:** pass `gear` in the pose when it changes, for example drop `frags` once the squad's BLAMs are used (`G.nadesOut`). `shield` comes from `u.shield`. `helmet`, `vest` and `pack` are ready for when armour items exist.

## What someone is doing: `artPose(u)`

Use this precedence. The first match wins:

| # | Condition (existing fields) | state |
|---|---|---|
| 1 | `u.down` | `down` |
| 2 | `u.surr` | `surrender` |
| 3 | civilian and `u.cower` | `cower` |
| 4 | `town==='alerted' && coolStateG(u)==='panic' && !u.auto` | `panic` |
| 5 | `engageQ.cur && engageQ.cur.s===u`, during the shot | `fire` (otherwise `aim` while lining up) |
| 6 | `u.jam` and ordered to `clear` | `reload` |
| 7 | Carrying out `u.order.type`: `hack`, `work`, `loot`, `man`, `lockin` → same name; `leave` → `extract`; `sprint` → `run`; `move` → `walk` | as listed |
| 8 | `u.braced` | `overwatch` |
| 9 | `u.bunkered` | `crouch` |
| 10 | Rebel while `sneak && phase==='FREE' && town==='calm'` (the existing `crouch` flag in `hudUnits`) | `sneak` (when moving) or `crouch` |
| 11 | Moved this frame (compare against a cached `u._ax, u._ay`, which aren't saved) | `walk` |
| 12 | Otherwise | `idle` |

Throwing a BLAM uses `throw` for the length of the throw animation (hook it where `drawNades` spawns a grenade).

**View:** `SR_ART.viewFor(u.face)`. **Aim:** pass the angle to the current target during aim and fire, so pupils and gun track it exactly. Otherwise leave it undefined.

**Time:** pass `t = now/1000 + (u.x*0.01)` so units don't blink and bob in sync.

## Scale and zoom

Ground units draw in **world space** (inside the camera transform), at scale `s = Math.max(1, 0.9/cam.z) * (u.big||1)`. That keeps figures at least 0.9 of their size on screen when zoomed out, the same rule as `iconBoost()`. At scale 1 a Bobblehead is about 30 world units wide, the same as the old `r=15` token, so hit areas don't need to change.

## Ground scene (`ground.js`)

### Render order

Current order (around line 3933): `drawGround → … → drawProps → turret/tower/graf/derelict/cross → drawBldgs → drawTowerTop → hudA → drawFog → drawFx`.

New order:

```
drawGround()                 // floor + roads (restyled, see below)
… drawVision, drawWork, drawFactory, drawCage, drawFS, drawNades (unchanged)
hudUnderlay(now)             // NEW: rings, acting pulse, hacked ring, braced arc, sight cones: under the feet
drawActors(now)              // NEW: props + walls + landed ships + units, one depth sort
if(SCN.hasTowerTop) drawTowerTop()
hudA(now)                    // labels, pips, markers (token drawing removed)
drawFog(); drawFx(now)
```

### `drawActors(now)`

Collect drawables and sort them by anchor `y`:

- **Units:** the same filter as `hudUnits` (`!u.extracted && !(u.away&&!u.caged) && !u.office && !u.csHide && unitSeen(u)`). Anchor `(u.x, u.y)`. Draw with `SR_ART.character(ctx, u.x, u.y, artSpec(u), {...artPose(u), s})`.
- **Props:** `PROPS` where not `dead`. Anchor `(p.x, p.y)`. `SR_ART.prop(ctx, p.kind, p.x, p.y, {t, biome})`. Keys already match `PROPDEF`. A dead prop draws `SR_ART.scorch` at its spot instead.
- **Walls (`BLDGS`):** anchor `y + h`. `SR_ART.wall(ctx, b.x, b.y, b.w, b.h, biome, {fade})`. Use `fade = 1` when any visible unit stands within the wall's x-range and within 40 units north of `b.y + b.h`. This fixes units hiding behind the new 26-unit front face.
- **Landed ships:** `drawGraf`, `drawDerelict` and `drawCross` become `SR_ART.ship(ctx, 'graf'|'cross', x, y, a, scale, t, {livery, damage, dark:true})`. The derelict uses `damage:0.5, pilot:null`.
- Turret and tower base: keep the current drawings, but give them ink outlines and the cel shade. Proper art is a follow-up.

Biome: `SCN.style==='rock' ? 'rock' : 'dust'`.

### Terrain

- `drawGround()` / `drawGroundHaven()`: replace the background fill and `patches` with `SR_ART.floor(ctx, 0, 0, W, H, biome, seed)`, and **cache it to an offscreen canvas** once per scenario (it's static). Draw roads with `SR_ART.trail`. Lamps become `SR_ART.prop('lamp')` plus `SR_ART.lampLight`. Scorch decals become `SR_ART.scorch`. Keep LZ rings and pad markings: they're HUD.
- `genWalls()` output is unchanged. Only the drawing changes.

### HUD offsets (in `hudUnits` / the new `hudUnderlay`)

| Element | Before | After |
|---|---|---|
| `T.unitToken(...)` | Draws the token | **Remove.** The character is drawn in `drawActors`. |
| Selection ring, acting pulse, hacked ring | Circle at the centre | The same helpers, inside `ctx.scale(1, 0.5)` at the feet, drawn in `hudUnderlay` |
| Riot shield arc | HUD arc | Remove (the shield is on the figure) |
| Braced arc | HUD arc | Keep it, flattened 50% at the feet |
| `T.hpPips` | `y - r - 14` | `y - (60*s + 6)*cam.z` in CSS space |
| Detect gauge | `y - r - 36` | `y - (60*s + 26)*cam.z` |
| Name label | `y + r + 15` | `y + 16*cam.z` |
| Sight cone origin, fire lines | Token centre | Head height: `u.y - 30*s` (world) |
| Facing nub, panic badge, jam badge | Badges on the token | Remove (the view, face and pose show these). Keep the gold "ordered" dot at the feet. |
| Cover pip | Token corner | Keep it at the feet, bottom left |

### Effects

`drawFx`: tracers become `SR_ART.bolt` (`akli`, `cowboy`, `longiron` and `scatter` → `'ballistic'`; `carbine` and lasers → `'plasma'` with side). Impacts become `SR_ART.hit`. Barrels, rockets and grenades exploding become `SR_ART.explosion` (keep the existing timing and pass `k`). Muzzle flashes come from the `fire` pose. Don't draw them separately.

## Space scene (`space.js`)

- `drawShip(s, …)`: when `SR_ART.SHIP_FOR_GAME[s.cls]` exists, replace the engine glow and `paintShipBody` with:
  ```js
  SR_ART.ship(ctx, SR_ART.SHIP_FOR_GAME[s.cls], x, y, h, s.size*1.6*iconBoost()*0.85, ambT/1000,
    {livery: s.faction==='reb' ? 'rebel' : (s.cls==='viper' ? 'law' : 'heg'),
     damage: 1 - s.hull/s.maxHull, boost: s.moveBoost>0.3, roll: s.visRoll||0,
     pilot: s.pilot && SR_ART.CAST[s.pilot.id] ? s.pilot.id : undefined});
  ```
  Call it **outside** the existing translate/rotate, because `ship()` does its own transform so the lighting stays fixed to the screen. Keep the shield arcs and the rest of `drawShip` as they are.
- `depot`: no art entry yet. Keep `paintShipBody`, but apply the kit: 2.6 ink outline, cel shade (fill at shade −25%, then the lit fill offset 1.4 units toward the top left and clipped), a slit canopy, and no faces.
- Lasers become `SR_ART.bolt(…,'plasma', side)`, missiles a small capsule with a smoke trail (`SR_ART.smoke`), and kills `SR_ART.explosion`.
- Rocks: an ink outline and cel shade, matching the `rock` prop.

## Base scene (`base.js`)

- `figure(x, y, S, name, col)` (line ~1760, used by `addFig` in `renderRoomView`) becomes:
  ```js
  SR_ART.character(ctx, x, y, personSpec(p), {view:'front', state:jobPose(rm.key), t:now/1000+i, s:S*0.48});
  ```
  `jobPose`: workshop → `work`, comms → `hack`, store → `loot`, training → `aim`, everything else → `idle`. Keep the name text under the feet. Add `SR_ART.emote` bubbles for staffed posts: ☕ command, 🔧 workshop, 📡 comms, 📦 store.
- `personSpec(p)`: `SR_ART.lookOf(p)` (see above). Support staff carry no weapon, so room views show them with their hands free or with a job prop.
- `fighterTop(...)` (line ~1770) becomes **`SR_ART.shipIso(ctx, id, x, y, heading, s, k, t, {livery, damage, pilot})`**, where `k` is the room view's isometric scale (the same one used for the floor and crew). Top-down ships look flat in the isometric rooms, so `shipIso` lays the same parts on the iso floor, stacks the hull for thickness and stands it on landing struts with its engines cold. Damage comes from saved hull state. Pass `pilot:null` unless someone's aboard. The derelict Graf uses `damage:0.5, pilot:null` until it's restored.
- Crew lists, the dossier header and the multi-card New Recruit screen (DOM): replace initials with a 48px canvas that draws `SR_ART.portrait(ctx, 24, 24, 22, SR_ART.lookOf(p))`. Cache it as a data URL, keyed on the record fields above. New Recruit cards show the candidate exactly as they'll look in the field.

## Galaxy map (`drawGalaxy`, base.js ~2248)

Planets become `SR_ART.planet(c2, x, y, r, col, {home, heg, ring})`. Routes become `SR_ART.route`. Keep the existing label layer and collision placement. Ships in transit, if shown, become `SR_ART.ship(c2,'graf',…, 1.1, …)`.

## Performance

- Expect about 30 characters per frame. Drawing them procedurally is fine on an iPhone 12 Pro. If profiling says otherwise, cache each character's **body layers** per `(spec, view, weapon, gear)` to an offscreen canvas, and draw only the face, hands and props live.
- Cache the floor per scenario (it's static). Walls and props are cheap.
- Don't allocate gradients per character per frame beyond what the module already does. Only the hack face glow and muzzle flash use them, and only while active.

## Migration order and check-ins

1. **Kit in, nothing visible changes.** Add the module and docs, and load the script. Acceptance: no console errors in any scene, and the style guide renders from `docs/art/`.
2. **Base and galaxy.** These are the lowest-risk screens. Acceptance: crew appear as Bobbleheads in every room view with job poses, names and emotes; the galaxy map matches the guide; phone portrait and landscape both work. **Check in with Tom here** before touching combat.
3. **Ground characters.** `artSpec`, `artPose`, `drawActors` for units only, `hudUnderlay`, and the HUD offsets. Props and walls stay old for now. Acceptance: every unit type in Take the Rock, Steal Fuel, Rescue Dissident and Steal the Strider is drawn as its archetype; every order shows its pose while executing; panic, surrender and down read correctly; the autoplay bot completes the sweep.
4. **Ground terrain, props, walls and effects.** Floor cache, props, walls with front faces and fade, landed ships, effects. Acceptance: no unit is ever fully hidden by a wall; sight cones and cover still match gameplay (spot-check with the debug overlay); 60fps desktop, at least 45fps on an iPhone 12 Pro.
5. **Space.** Ships, liveries, damage, effects. Acceptance: the Cross, Talon, Graf, Mote and Scimitar match the guide; damage states track hull; drones use the restyled fallback.
6. **Portraits and polish.** Crew list portraits, recruit cards, comms log.

## Acceptance checks (all phases)

- At 1280×720 and 390×844, every unit is readable at default zoom, and at minimum zoom never smaller than 0.9 scale on screen.
- Red is ours and blue is theirs on every body. No hostile wears red and no rebel lacks red.
- Silhouette test: each archetype is still identifiable in solid black.
- Reduced motion: no bob, blink, sweat drift or sparks.
- Saves from before the change load, and the autoplay bot runs clean.


## Rev Level 1 armoury (from "Gadgets, Gear and Gunships")

The source of truth for item names, makers and tiers is the design doc *Star Rebellion: Gadgets, Gear and Gunships*. The kit's `SR_ART.ITEMS` follows it.

### Renames: display names only, keys stay

| Key (unchanged) | Old display name | New display name |
|---|---|---|
| `cowboy` | Cowboy | Cowboy No.4 |
| `longiron` | Long Iron | Longhorn ’28 Hunting Rifle |
| `scatter` | Scattergun | Varmint Shotgun |
| `rocket` | Makeshift Rocket | Improvised Rocket Launcher |
| `graf` (ship) | Graf Type 1 Hauler | Graf Hauler |

Change only the `name` strings in `ground.js` `WPN`, the armoury entries in `base.js` and any UI copy. **Don't rename keys**: saves, `p.gear` and armoury stock reference them.

### New item keys (add them to the game data as each item becomes obtainable)

| Key | Item | Category | Notes for the game |
|---|---|---|---|
| `plasmasmg` | Improvised Plasma SMG | weapon (primary) | Crafted |
| `hg40` | HG-40 | weapon (secondary) | Security and police pistol. Make it the default for deputies, sheriffs and riot troops |
| `autohand` | Auto Plasma Hand | weapon (secondary, one hand) | Dropped only by Autos; Policebots fire it themselves |
| `baton` | Power Baton | weapon (melee, one hand) | Use the `aim` pose to raise it and `fire` to swing |
| `riotshield` | Riot Shield | weapon slot, off hand | `lookOf` turns it into the `shield` gear and holds the other weapon one-handed |
| `mininglaser` | Repurposed Mining Laser | weapon (primary, two hands) | Scavenged. Use `fire` to sweep the beam and `recharge` for its Recharge action |
| `hardhat` | Frontier Hardhat | armour (head) | Default for rebel Soldiers (see below) |
| `policevest` | Police Vest | armour (body) | Security forces |
| `medpack` | Medpack | gadget | Used with the `treat` pose (the Treat Wound order) |
| `stim` | Stim | gadget | Belt pouch; `stimuse` pose |
| `blam` | BLAM Frag Grenade | gadget | Already in the game |
| `c90` | BLAM C90 Explosive Charge | gadget | `plant` pose |
| `autocore` | Auto Core Improvised Charge | gadget | Crafted; `plant` pose with `item:'autocore'` |
| `molotov` | Molotov Cocktail | gadget | Crafted; `molotov` pose. The fire area and Extinguish action are game work; the flame effect can reuse `explosion` early frames |
| `angel` | Guardian Angel Drone | gadget | Crafted. While active, pass `'angel'` in `gear` and the drone hovers at the shoulder |

`carbine` (Peacekeeper Carbine) is in the prototype but not in the doc. It stays as Hegemony issue until the doc decides.

### Armour

- `lookOf(p)` puts the **Frontier Hardhat** on every Soldier and Marine by default, as the doc says. When an armour slot exists, read `p.gear.head` and `p.gear.body`. Set `p.gear.head = null` to show a rebel bareheaded.
- Security archetypes (`deputy`, `sheriff`, `riot`) wear the **Police Vest** and carry the HG-40 by default. The game's real weapon still overrides it through the pose.

### Item art for the Armoury tab, loot and pickups

```js
SR_ART.item(ctx, key, x, y, size, t)            // fitted into a size×size box, centred on x,y
SR_ART.item(ctx, key, x, y, 0, t, {scale:2})    // uniform scale, so a pistol stays smaller than a rifle
SR_ART.ITEMS[key]  // {name, short, cat:'weapon'|'armour'|'gadget', kind, maker, makerProposed, origin:'crafted'|'scavenged', tier, box, draw}
SR_ART.MAKERS[key] // {name, short, what, look, col:[...]}  for Bhord, TenTiU, Patriot, MenDon, Aerostar, Varrondow, AutoCom, BLAMCo
```

The Armoury and Fleet tabs themselves are UI-kit work (the HUD / UI chat). They use `item()` and `ship()` to draw their contents. Items animate if you pass `t`: the plasma core, the fingertip glow, the molotov flame, the C90 lights and the drone's rotors.

### New poses

| Pose | Game hook |
|---|---|
| `treat` | Treat Wound order (Phase 11), medpack in hand |
| `stimuse` | Using a Stim |
| `plant` | Placing an explosive charge on an objective. Pass `item:'c90'` or `item:'autocore'` |
| `molotov` | Throwing a Molotov (like `throw`) |
| `recharge` | Mining Laser Recharge action |

Melee: with `baton`, `aim` raises it overhead, `fire` swings it with a whoosh arc, and at rest it hangs at the side.

## Ships: weapons and attachments

Ship weapons and attachments are drawn at **mount points** on each hull from a loadout, so a refit changes the picture. Hard points are game data and aren't drawn.

```js
SR_ART.ship(ctx, id, x, y, heading, scale, t, {
  livery, damage, boost, roll, pilot,
  loadout: {primary:'repeaters', secondary:'missiles'|null, attach:['doorgun', ...]},   // merged over the class defaults
  fire: true                                                                            // muzzle flashes while firing
});
SR_ART.SHIP_WEAPONS  // repeaters (BLS-T Light Repeaters), missiles, doorgun; plates/tank are placeholder examples
SR_ART.SHIPS[id].mounts   // {primary:[[x,y]...], secondary:[...], door:[[x,y,side]...]}
SR_ART.SHIPS[id].defaults // doc defaults: every Tier 1 ship has Repeaters except the Graf (none); the Scimitar adds Missiles
```

- **Graf Hauler:** unarmed by default. Adding the `doorgun` attachment puts a gunner in each door. Show it whenever the ship has the Door Mounted Gun, because that's what enables *Door Gunner Support* in ground missions. Marta's rebel livery fits door guns and welded plates by default; the stock `civ` livery has none.
- **Map the game's ship weapon and attachment ids** onto `SHIP_WEAPONS` keys as they're added to the data. Unknown keys simply draw nothing, so it's safe to add art later.
- **VT-2 Fledgling** is now designed (`fledgling`, game class `fled`): a small dated Varrondow trainer with no shields. Liveries are `heg` (naval trainer, faceless canopy) and `pirate` (scrapyard revival, pilot visible). Remove it from the "restyled fallback" list.
- **Makers on ships:** Cross and Graf are MenDon, Talon is Aerostar, and Mote, Fledgling and Scimitar are Varrondow Conglomerate.


## Drones (space) and vehicles (ground), from the Enemies doc

### Drones

The drones are now ship entries, so `SR_ART.ship()` draws them, and `SHIP_FOR_GAME` maps the game classes `monitor`, `pursuer` and `clamper` straight across. They're AutoCom-built and wear the Hegemony Security livery (`heg`). They're faceless: a sensor eye or visor slit, never a canopy.

- **Monitor:** pass `calling:true` while it summons reinforcements (where `space.js` spawns the patrol answer) to pulse rings.
- **Pursuer:** twin BLS-T Repeaters by default.
- **Mag-Clamper:** unarmed. While it holds a ship, pass `clamp:[targetX, targetY]`. The magnets flare and `clampBeam()` draws field lines from both magnets to the target. You can also call `SR_ART.clampBeam(ctx, x0,y0, x1,y1, t)` on its own.
- **Depot:** not described yet. It keeps the restyled fallback.

### Ground vehicles

```js
SR_ART.vehicle(ctx, id, x, y, heading, s, t, {
  livery, damage,                 // damage > 0.5 adds smoke and sparks
  siren,                          // police light bar (default on)
  turretUp: 0..1, turretAng, fire, // riot dispersal turret
  loadout:{attach:[...]}, gunner, aim  // Floatin' Truck attachments; gunner is any character spec
});
SR_ART.strider(ctx, x, y, {view, dir, state:'idle'|'walk'|'aim'|'fire'|'down', mood:'friendly'|'angry'|'hacked', damage, t, s});
// The Strider is a riot-control war machine; its face is a hologram projected above the hull, so leave headroom (~130 units at s=1) when depth-sorting labels above it.
SR_ART.shipIso(ctx, id, x, y, heading, s, k, t, opts) // ships parked in isometric spaces (Haven Rock hangar)
SR_ART.VEHICLES  // police, riottransport, riotdispersal, truck
```

The footprint is drawn flat in the ground plane at the unit's heading and extruded upward, matching the walls' front faces. The anchor is the footprint centre on the ground, so depth-sort vehicles with units and props by anchor `y`. Draw at `s ≈ 1.5` at zoom 1, which makes the Police Cruiser about 100 world units long. Apply the same minimum-size rule as characters.

| Game unit | Draw with | State mapping |
|---|---|---|
| name "Police Cruiser" (weapon `cruiser`) | `vehicle('police')` | `siren` on once the area is alerted |
| name "Riot Transport Cruiser" | `vehicle('riottransport')` | — |
| name "Riot Dispersal Cruiser" (weapon `dispersal`) | `vehicle('riotdispersal')` | Ease `turretUp` from 0 to 1 when the turret first engages (it stays up), aim `turretAng` at the target, and set `fire` during its shot |
| `autoType:'strider'` | `strider()` | `mood` is `friendly` while the town is calm, `angry` once alerted, and `hacked` when `u.hacked`; `state` comes from `artPose`; `damage = 1 - hp/maxhp`; view from `viewFor(u.face)` |
| (future) Frontier Floatin’ Truck | `vehicle('truck')` | Liveries `civ`/`rebel`; attachments `mg`, `plates`, `ram`, `spotlight`, `crates`; `gunner` and `aim` for the bed gun |

`autoType:'bruiser'` isn't described in the Enemies doc yet. Until it is, draw it with the Policebot archetype at `big:1.25`.


## Update: October 5 docs (Gear, Ground Combat) and the repo

This round follows the updated *Gadgets, Gear and Gunships* and *Ground Combat* docs and the repo at `c27acec`.

**Merge note:** this `sr-art.js` was rebuilt on top of the repo's copy. It keeps Claude Code's own additions: the `off` option on `ship()` for powered-down landed ships, and `planetTex()` with the `tex` option on `planet()`. Drop it in over `game/art/sr-art.js`. Nothing the game already calls has changed signature.

### Items, makers and names (resolves C-18 and C-23)

| Change | What to do in the game |
|---|---|
| **New items** `stiletto` (ST Stiletto, Fightstar plasma carbine) and `razorrat` (Razorrat LMG, Bhord, deployable) | Add rows to `items` with these ids. The art already draws them |
| **New item art** for `policehelmet`, `autohelm`, `cowboyhat`, `cap`, `limpet`, `shells` | Remove their sr-icons fallbacks; `artURL('item', id)` now finds them |
| `ITEMS.charge` now exists (the C90) | `ART_ITEM_ALIAS` in `base.js` can go |
| `carbine` is the **EG-55 Peacekeeper Carbine**, Fightstar, **plasma** | Settles C-23: set `damage_type` to plasma and rename it |
| Makers from the doc: Cowboy, Longhorn and Varmint are Devlin & Son; the Mining Laser and Hardhat are Praxon; the HG-40, Baton, Riot Shield, Police Vest and Police Helmet are Patriot; the Auto Plasma Hand is crafted with no maker | Settles C-18's maker list; fill the `manufacturer` column |
| **15 manufacturers** in `SR_ART.MAKERS` (TenTiU removed; Fightstar, Devlin & Son, LMC, Praxon, Helix, General Astronautics, Nomad and Rook added) | Bring the `manufacturers` table in line with the doc. `SR_ART.makerBadge(ctx, key, x, y, size)` draws each badge for Arsenal and Black Market cards |
| `ITEMS[id].dtype`, `.size`, `.traits` (from the doc) | The art uses these for icons. When the database gets trait and fire-mode columns, read them from there instead |

### Weapon traits, damage types and the fire-mode toggle

- `SR_ART.icon(ctx, key, x, y, size, {active, bare})` draws a trait (`steady`, `auto`, `semi`, `single`, `fan`, `knockback`, `stunning`, `sundering`, `piercing`, `heavy`, `unstable`) or a damage type (`ballistic`, `plasma`, `laser`, `explosive`, `melee`). `SR_ART.TRAITS` and `SR_ART.DTYPES` hold names and one-line rules text.
- Show them on Arsenal item cards, Black Market lots, the engagement panel's weapon row and tooltips. For DOM, draw them once to a 48px canvas and cache the data URL, the same way `artURL` does.
- **Fire-mode toggle:** build it as a DOM segmented control in the attack window, in the HUD kit's chunky-button style (`sr-kit.css`). Show it only when the weapon has two or more fire-mode traits. The selected mode is gold and sits pressed in, and `F` cycles through the modes. Use `SR_ART.icon` for the glyphs. `SR_ART.fireModeToggle()` is the canvas reference drawing in the guide.
- **On the battlefield**, pass `mode:'auto'|'semi'|'single'|'fan'` in the pose with `state:'fire'`. Automatic flickers, ejects brass and shakes. Single shot fires one big flash. Fan hammer animates the off hand slapping the hammer.
- **Trait outcomes:**
  - `knocked` pose while a Knockback shove plays.
  - `stunned` pose for Stunning (spiral eyes, sparks, stars).
  - `sunder(ctx, x, y, k)` when a Sundering hit strips armour.
  - `pierce(ctx, x0, y0, x1, y1, k)` when Piercing damage goes through.
  - `misfire(ctx, x, y, k)` when an Unstable weapon blows.
  - For Steady, show the `steady` icon (active) over a unit that is holding fire on a target.

### Equipment slots, the back slot and deployables

- `lookOf(p)` reads `p.gear.back`, and the art straps the back item across the back in every view. Soldiers and Marines have the slot; Pilots and Support don't.
- **Deploy:** use the `deploy` pose for the set-up action.
  - Razorrat: once set up, draw it with `SR_ART.deployable(ctx, 'razorrat', x, y, heading, t, {gunner, fire})` at its map position. The gunner crouches behind it.
  - Riot Shield: deployed, it moves from `back` into the hands (`gear:['shield']`) and the primary weapon stops being drawn.
  - Mining Laser: wielded once deployed; it uses `fire` (the sweep) and `recharge`.

### Armour, shields and health (Ground Combat doc)

- **`SR_ART.vitals(ctx, x, y, {hp, hpMax, arm, armMax, sh, shMax, s})`** draws the layered bar: health pips, with steel armour plates over them and a cyan shield band over both. Plates crack when they're emptied. Use it in place of `T.hpPips` above units, at `y - (60*s + 6)*cam.z` as before, plus about 8px for each extra layer.
- **DOM unit cards and the engagement panel** should match the shapes: armour as slanted `#a8b4c8` plates with a highlight line, shield as `#36e3f2` hexes with a glow, health as the existing pips. Each layer has its own shape so it stays readable for colour-blind players.
- **While a shield is up**, pass `shield: 0..1` in the pose for the hex bubble, and `shieldHit: 0..1` to flare it on a hit. Use `shieldHit(ctx, x, y, k)` and `armourHit(ctx, x, y, k)` at the impact point.
- **Molotov fire:** a burning character uses the `burning` pose (or the `extinguish` pose when the action is taken). Both show flames.

### Fire support (Ground Combat doc)

| Game function | Draw with |
|---|---|
| `strafeRun(o)` | `SR_ART.strafe(ctx, x0, y0, heading, length, k, t, {ship, livery})`: the flyover plus ten impacts walking up the ladder, leaving scorch marks |
| Door Gunner | `SR_ART.doorGunner(ctx, cx, cy, r, targets, k, t)`: the Graf circles with its door guns fitted and sweeps up to three targets |
| `supplyDrop(u)` | `SR_ART.supplyDrop(ctx, x, y, k, t, {open})`: a rebel-red parachute, then a crate. `open` shows stims and frags |
| Reinforcements | `SR_ART.landing(ctx, x, y, k, t, {s})`: the transport descends with its shadow and lands in a ring of dust |
| Any ship overhead | `SR_ART.flyover(ctx, id, x, y, heading, s, t, {alt})`: the ship plus its shadow on the ground |

### Characters

- **Sweet Tooth (resolves M-20):** use `SR_ART.ARCH.sweettooth` in place of `ST_SPEC` in `base.js`. She has a teal headscarf with gold dots, an eye patch, a gold tooth, a gold earring and a pink jacket, and she always grins. `SR_ART.portrait()` gives the rail's head.
- **Riot police are now people in Police Helmets**, rather than visor troopers. The `art` column should be `riot` for `security-riot-shieldman` and `riotrifle` for `security-riot-rifleman`.
- **New head items** draw whenever they're in `p.gear.head` or an enemy row's `head`: `policehelmet`, `autohelm`, `cowboyhat`, `cap` (and `hardhat`).


### Manufacturer style studies and Helix medical

- **Helix makes the game's medical items.** The Medpack and Stim (item art, the hip and belt pouches, the `treat` and `stimuse` props) are now Helix: clinical white and teal, rounded, with the double-helix mark. Set `manufacturer` to Helix for both in the `items` table. Future medical items should use `helixCase()` and `helixMark()` in the kit.
- **Style mocks** set the look of makers that have no items in the docs yet. They're flagged `mock:1` and **must not be added to the game data** until real items exist:
  - `arclight`, the LMC Arclight laser pistol. White ceramic, violet cell, LEDs. It introduces the `laser` muzzle flash and `bolt(...,'laser')`: violet is now the laser damage colour.
  - `nomadcoat`, the Nomad Drifter Coat: canvas duster, leather straps, patched shoulder plate.
  - `rookhelm`, the Rook Mk II Tactical Helmet: matte charcoal, olive rails, flip-up visor, rook stamp.
  - `gafrigate`, the General Astronautics Bulwark-class Frigate: the capital-ship look, using the same parts and mounts system as the fighters.
- **Personal shields:** the bubble (`pose.shield`) and the shield band in `vitals()` are ready for the first shield item whenever it arrives. No art work is needed then beyond item art for that item.


## Juice (feedback, effects and transitions)

The style guide's **Juice** section is the spec: the rules, an interactive before-and-after arena, the reworked effects, the transitions and the shared event table. Build it in this order, because each step makes the next one land:

1. **Time and camera.**
   - Add a game clock that can be frozen for **hitstop**: game `dt = 0` until `stopUntil`, while UI and audio keep running.
   - Add one `SR_ART.Shake()` per scene. Feed it trauma from `SR_ART.JUICE[event].trauma`, call `update(realDt)` each frame, and apply `offset(t)` (x, y, angle) to the world transform only, never to the HUD.
   - Add a **Screen shake** setting. Reduced motion turns off shake, hitstop and drifting particles.
2. **One particle system per scene.** Use `SR_ART.Particles()`: `emit(kind, x, y, {n, dir, spread, speed, floor})`, then `update(dt)` and `draw(ctx)` in world space after the actors. Kinds are `spark`, `debris`, `smoke`, `dust`, `casing`, `ember`, `plasma`, `shard`, `confetti` and `coin`. Debris, casings and coins bounce on `floor`.
3. **Hit feedback on characters.** In `artPose`, pass `flash` (set to 1 on a hit, decaying at 5 per second) and `squash` (set to 1, decaying at 6 per second). For a unit going down, pass `fall` from 0 to 1 over about 0.6 s, and the topple bounces. Spawn `popText(ctx, text, x, y, k, colour, {crit})` for damage numbers (one per landing round of a volley), MISS and DOWN. These replace the HUD's plain floaters for in-world numbers; the HUD's logic stays.
4. **Reworked effects** (same calls, better results):
   - `explosion()` plays in stages (flash, fireball, shockwave, smoke). Pair it with debris, ember, smoke and dust particles, and a persistent `scorch`.
   - `hit()` has a white core and speed lines.
   - `bolt()` has a glowing trail.
   - New: `ring()` for shockwaves, `shieldBreak()`, `shipExplode()` (breaks the ship into three), and `pickup()` for loot leaving a crate.
5. **Events.** Use the `SR_ART.JUICE` table everywhere: `shot`, `hit`, `armourHit`, `crit`, `down`, `grenade`, `rocket`, `shieldBreak`, `shipKill`, `loot` and `promote`, each with hitstop (ms), trauma, flash and the particles to emit. Tune numbers in that table, not at call sites.
6. **Transitions.** `SR_ART.transition(ctx, W, H, k, type, {x, y, text})`, drawn over everything. The screen is fully covered at `k = 0.5`, so swap scenes there. Use:
   - `iris` into a mission, centred on the target;
   - `stripes` for tab and screen changes;
   - `hyperspace` between the galaxy map and space combat;
   - `flag` for mission start and liberation, with a word.
7. **Easing:** use `SR_ART.ease.*` for world and UI motion: `outBack` for pops, `outBounce` for falls, `inOutCubic` for panels. Nothing should move linearly.

Acceptance: switch juice off and on in the guide's arena to see the target. In the game, a grenade must freeze, shake, flash, throw debris and leave a scorch mark. A single pistol shot must stay subtle. With reduced motion on, nothing shakes or freezes.


### Shots, impacts and blood (Juice, part two)

The guide's old Effects section is now part of Juice.

- **Shots:** `SR_ART.shot(ctx, key, x0,y0, x1,y1, time, {mode, seed})` draws every round of a trigger pull in flight, `time` seconds after the trigger. `SR_ART.shotTimes(key, mode, dist)` returns each round's arrival time, so schedule impacts and damage from those times.
  - **Palette** comes from the weapon's maker (`SR_ART.STYLE`), the same for both factions. **Shape** comes from the weapon (`SR_ART.PROJ`). The **fire mode** sets the pattern: automatic is a staggered spread, fan hammer is three quick rounds, single shot is one round with a big flash.
  - Ship and vehicle weapons are in the same table: `repeaters`, `missiles`, `doorgun`, `dronegun`, `cruiser`, `dispersal` and `strider`. The ship-weapon makers are proposals: BLS-T Repeaters as Bhord, Missiles as Varrondow, drone guns as AutoCom.
  - Replace `bolt()` calls in `ground.js` and `space.js` with `shot()`. `bolt()` stays for anything without a weapon key.
- **Muzzle flashes:** `muzzleFor(ctx, x, key, mode, t)`. The character renderer already uses it when firing.
- **Impacts:** `SR_ART.impact(ctx, x, y, k, {dtype, surface, dir, style, gore, seed, size})`.
  - `surface` is `flesh`, `armour`, `shield`, `cover`, `robot` or `hull` (space). Use `armour` while a target's armour segments remain and `flesh` after. Autos, Bots and vehicles use `robot`.
  - `dir` is the shot's angle, so blood sprays the way the round was travelling.
  - `hit()` now draws a flesh impact. The cartoon star is gone.
- **Blood:**
  - Flesh hits leave `bloodSplat(ctx, x, y, r, seed)` decals on the ground for the rest of the mission. Store them with scorch marks.
  - Add a **Blood** setting that calls `SR_ART.setGore(false)`. This swaps blood for dust and impact lines and keeps canopies clean.
- **Space:**
  - `shipShield(ctx, x, y, r, k, hitX, hitY)` flares the shield bubble at the hit point while the ship's shields hold. When they run out, use `shieldBreak()` plus `shard` particles, then `impact(...{surface:'hull'})` with spark and debris particles.
  - Damaged ships (`damage > 0.3`) vent gas automatically.
  - Pass `pilotHit: 0..1` to `ship()` when a pilot takes a critical. This cracks the canopy and spatters it with blood on rebel ships; Hegemony canopies stay dark.
  - On a kill, use `shipExplode()` with the `shipKill` juice row.
- **Hangar headings:** `hangarShip()` works at any `heading`, so park ships however the hangar layout needs.


### Volleys: an attack is an attempt, not a bullet

An attack is one roll in the rules. On screen it's a burst of fire, re-rolled every time so combat never looks samey. The visuals never change the rules: the total damage shown always equals the roll's result.

```js
const plan = SR_ART.volley(weaponKey, mode, {hit, damage, rng});   // rng optional (Math.random by default)
// plan.rounds = [{fire, hit, dmg, ...}]: when each round leaves the muzzle, whether it lands, its share of the damage
const lands = SR_ART.volleyImpacts(plan, x0, y0, x1, y1);          // [{at, x, y, hit, dmg}]: where and when each round arrives
SR_ART.shot(ctx, weaponKey, x0, y0, x1, y1, time, {mode, plan});    // draws the whole volley in flight
```

- **Round counts:**
  - Single shot: one round.
  - Semi-auto: 3 to 5 rounds, 1 to 3 landing.
  - Automatic: 6 to 10 rounds, roughly half landing.
  - Fan hammer: 3 rounds, 2 or 3 landing.
  - Shotguns: 2 or 3 blasts. Lasers: 2 or 3 pulses. Rockets and missiles: one.
- **Damage split:** `damage` is split across the rounds that land; 10 might read 3, 3, 4. A missed attack sends every round past the target. Misses land beyond or short of the target and hit the ground or cover behind, so draw a `cover` impact there.
- **Feedback per round:** for each landing round, draw its own `impact()` at `{x, y}`, its own damage number (`popText` with `dmg`), and a small flash, squash and shake. A full miss gets a single MISS pop.
- **When to apply the damage mechanically:** apply it once, on the first landing round, or at the end if that's simpler. Never apply it per round.
- **Space works the same way.** Repeater fire is a volley; each landing bolt flares the shield or breaches the hull at its own point.
- **Armour hits** no longer show TINK. They throw sparks, a ricochet streak and a metallic ring. Ship kills no longer show a text callout.

## Hangar ships are now 3D models

`SR_ART.hangarShip(ctx, id, x, y, s, k, t, {livery, damage, loadout, heading, cold})` replaces `shipIso` (and `fighterTop`) in the base's hangar views. Each Tier 1 ship has a small hand-built 3D model (`SR_ART.HM`): bevelled hull blocks, upright fins, round engine barrels, glass domes and the Graf's dish. It's projected into the room's isometric view at any `heading` (the default faces the viewer's left). Pass `cold:true` for parked ships (dark engines and sensor eyes). Door guns appear when the Graf's loadout has them. Ships with no model (drones, the frigate mock) fall back to `shipIso`.

## Rebel acceptance checks

- Two rebels generated in the same batch never look identical (different id, so different genes). The same rebel looks identical after a reload.
- Each layer appears and clears with its source: a Broken Arm shows a sling on the dossier portrait, in the room view and on the ground, and the sling goes when the condition heals. A prosthetic replaces the patch. Promotion adds a chevron, and a commission adds a beret.
- Support never carries a weapon. A rebel with bare hands (`unarmed`) shows empty hands.
- `node tools/*-smoke.js` and the autoplay sweep are unchanged: the art reads the record and never writes to it.

## Open questions for Tom

- **Real items for LMC, Nomad, Rook and General Astronautics:** the style mocks hold their place until the docs name them.
- **Strafing Run ship:** the guide uses the Talon. The game should pass whichever starfighter was assigned.

- **Strider maker:** the Enemies doc says Autoworks, but the gear doc names AutoCom as the maker of Autos and Bots. Is Autoworks a separate company, an AutoCom brand, or a typo?
- **The fuel depot and the Bruiser auto** still need descriptions.
- **Unassigned makers:** the doc doesn't give a maker for Cowboy No.4, Longhorn ’28, Varmint Shotgun, the Improvised Rocket Launcher, the Mining Laser, the Frontier Hardhat, the Medpack or the Stim. I've proposed Patriot for the HG-40, Power Baton, Riot Shield, Police Vest and Peacekeeper Carbine, because Patriot makes the Hegemony's personal weapons. Confirm these or change them in `ITEMS`.
- **Ship attachments:** the doc names only the Door Mounted Gun. Plates and an external tank are placeholders to show how the system works.
- **Floatin' Truck attachments** (gun, plates, ram, spotlight, crates) are my proposals until the attachment list exists.
- **Helmet, vest and pack** are in the kit, but the armory has no armour items yet (REBELS_PLAN's Armour follow-up). Today Marines and Cautious rebels get a helmet as a look only. Decide whether these become equipment.
- **Which Character Traits show.** About half of the 45 have a visual tell, and the rest stay invisible on purpose so squads don't turn into costume parties. The `TRAIT_LOOK` table is yours to tune.

