# Star Rebellion — Galaxy view & World view: implementation handoff

For: Claude Code, working in `github.com/DoofWiz/star-rebellion` on **`main`** (the branch named in the UI v1 handoff, `claude/kind-hamilton-wordzt`, no longer exists; the UI kit is already on `main`).

This builds on two earlier handoffs and assumes both are in place or in progress:

- **UI v1 "Chunky Ops"** (`docs/ui/HANDOFF.md`, `docs/ui/styleguide.html`): the `sr-` kit.
- **World art "Bobbleheads"** (`docs/art/HANDOFF.md`, `game/art/sr-art.js`): `SR_ART`. **It is not installed on `main` yet.** Do its Phase 1 (kit in, nothing visible changes) before Phase 3 here.

Living reference: **`docs/ui/galaxy-reference.html`**. It renders every state from the same CSS you are installing. When this document and the reference disagree, the reference wins; when either disagrees with Tom, Tom wins. Design canvas (clickable prototype): https://claude.ai/artifact/PemJtwcrYWbnvknVxejde7

---

## 0. Kickoff prompt (Tom: paste this into Claude Code)

> Read `docs/ui/GALAXY-HANDOFF.md` end to end, then open `docs/ui/galaxy-reference.html` in a browser. We are turning the Galaxy pop-up window into a full view that toggles with the Base view, and adding a World view that opens when a world is selected. Work phase by phase (1 → 5), committing at the end of each phase. Do not change game rules, balance or the save format. After each phase, screenshot every affected state at 1440×900, 1280×720 and 390×844, compare against the reference, and fix overlaps before moving on. Ask me before removing any feature or renaming any player-facing term not listed in §8.

---

## 1. What's in the package

```
docs/ui/GALAXY-HANDOFF.md        this file
docs/ui/galaxy-reference.html    static render of every state (self-contained)
tools/ui-kit/sr-galaxy.css       the gx- components (append to the kit, see Phase 1)
```

## 2. Non-goals and guard rails

- **No game-logic changes.** Scouting, Access, Support, liberation, sources, leads and missions behave exactly as today. Every action in the new UI calls an existing function (§6).
- **No save changes.** Everything new is UI state or static data tables. Nothing is added to `G` and `star-rebellion-campaign-v1` saves load unchanged.
- **The autoplay bot must still run.** `tools/autoplay.js` calls `srcContact`, `scoutPlanet`, `raiseAccess`, `openWin('person')` directly, so keep those functions and their signatures. Run `tools/sweep.sh` at the end of every phase.
- **Keep every element id JS looks up**, or update the lookup in the same change. `#navSources` stays the Galaxy tab.
- **Don't resurrect retired systems.** `syncLocalOps()` returns early on purpose ("regional placeholder ops are retired"). The `op` entries on `PLANETDEF` regions are not jobs any more; see §5.4.

## 3. Decisions already made (don't relitigate without Tom)

1. **Galaxy is a view, not a window.** The Base / Galaxy tabs swap the stage and the rail. Top bar, Revolution hub, comms feed and the command bar stay put. **Advance day never moves.**
2. **Selecting a world with access dives into a World view**: the planet fills the stage, divided into its regions. World-wide information is in a docked panel; region information opens when a region is clicked.
3. **Settlements are a different kind of region.** A region whose `kind` is `'Settlement'` is a small, walled enclave on the planet, selectable on its own, never a slice of the disc.
4. **The rail swaps with the view.** Base: crew and flight (unchanged). Galaxy and World: Network, Worlds, In flight.
5. **Source badges are rebel red** (the art handoff said green; Tom approved red). Orange marks a source running hot. Every source icon carries its **level as a roman numeral** in its bottom zone.
6. **Network rail rows all show the same thing: the daily benefit.** A waiting signal is the `!` badge on the avatar. High risk is shown by the whole row (hazard outline and stripes), not a tag.
7. **Liberation is a picture, not a number**, wherever space is tight: a rebel-red ring filling around the Revolution flame (same language as the hub and the map rings).
8. **The liberation cap is the gold mark** on every liberation bar. Its explanation appears on hover: "Current limit based on level of access and support." No permanent caption.
9. **Hyperlanes are cosmetic** (a static `LANES` table). No travel rules.
10. **The Base / Galaxy / Missions tabs are hidden in the World view.** Back is the panel's Galaxy button, the galaxy minimap, the command bar's Back order, or Esc.
11. **Only live things show on a world.** Finished history (e.g. the burned Brakka depots) is not drawn.
12. **Lore clamps to three lines** in docked panels, with a "Read all" toggle.
13. **No repeated information.** Don't repeat in the command bar's `__who` what the docked panel directly above it already says, and don't add tags that duplicate a stat shown below (no "Access 3" tag over the Access pips, no "Level 2" tag next to a numeral).

## 4. UI state (not saved)

Add to the `let` line at `base.js` ~L155:

```js
let baseView='base';        // 'base' | 'galaxy'  — which view the stage shows
let gxWorld=null;           // planet id while in the World view, else null
let gxRegion=null;          // region id while a region card is open, else null
let gxLayers=null;          // {network,leads,missions,lib,heg,flights}, loaded from localStorage
```

- `srcSel` stays, but now means **"selected in the galaxy, not a world with access"**: a source (`t:'s'`), a lead (`t:'o'`), or a locked/uncharted world (`t:'p'`).
- Layer toggles are a per-viewer preference: `localStorage['sr-galaxy-layers']`, wrapped in try/catch, defaulting to everything on except Hegemony security.
- Navigation helpers (put them next to `openWin`):

```js
function showView(v){ baseView=v; if(v!=='galaxy'){gxWorld=null;gxRegion=null;srcSel=null;} exitRoomView(); closeTilePop(); syncTabs(); syncRail(); syncUI(); }
function enterWorld(id){ gxWorld=id; gxRegion=null; srcSel=null; gxDiveT=performance.now(); syncTabs(); syncUI(); }
function openRegion(rid){ gxRegion=rid; syncUI(); }
function gxBack(){ if(gxRegion){gxRegion=null;} else if(gxWorld){gxWorld=null;} else if(srcSel){srcSel=null;} syncUI(); }
```

- `syncTabs()` (~L3614): Galaxy is selected when `baseView==='galaxy'` and no non-galaxy window is open. Hide the whole `.sr-tabs` while `gxWorld` is set.
- Esc: one keydown handler on the base scene. Close the open window first (existing behaviour), otherwise `gxBack()` while `baseView==='galaxy'`.

## 5. Phases

### Phase 1 — Kit and plumbing

1. Append `tools/ui-kit/sr-galaxy.css` to the end of `tools/ui-kit/sr-theme.css`, then `python3 tools/ui-kit/build.py game/ui docs/ui`. Keep `docs/ui/galaxy-reference.html` alongside the style guide.
2. `.gx-hit` is prototype-only (transparent buttons over SVG worlds). In the game, worlds are hit-tested on the canvas; don't ship `.gx-hit` markup.
3. Add the static tables from §7 to `base.js` next to `PLANETDEF`: `LANES`, `WORLD_LOOK`, `SRC_REGION`, `HEG_SITE`, `REGION_DECOR`.
4. **Acceptance:** game boots, nothing visible changes, `grep -c "gx-" game/ui/sr-theme.css` > 0.

### Phase 2 — Galaxy becomes a view

**Toggle**
- `#navSources` click (~L4018): `showView('galaxy')` instead of `openWin('sources')`. `#navBase`: `showView('base')`. `#navMissions` keeps opening the Missions window for now (Missions screens are the next design pass).
- First switch to Galaxy still shows the network primer once: move the `G.srcTutSeen` check from `openWin` into `showView` (`if(v==='galaxy'&&!G.srcTutSeen){G.srcTutSeen=1;saveSnap();openWin('srcTutIntro');}`).
- `data-srctut-done` / `data-tut-close` (~L3838) now `closeWin()` (the galaxy is already behind the window) instead of `openWin('sources')`. Lines ~1782 and ~1790 that `openWin('sources')` become `showView('galaxy')`.

**Stage**
- `render(now)` (~L2780): `if(baseView==='galaxy') { gxWorld ? drawWorld(now) : drawGalaxy(now); } else if(viewRoom) renderRoomView(now); else renderBase(now);` Skip the base vignette in the galaxy views.
- `drawGalaxy` draws into the main stage canvas `#cv` (CSS size `cssW×cssH`), not `#galaxyCv`. Keep its label queue and collision placement.
- **Camera: fit the galaxy into the clear rect** (the stage minus whatever HUD is open), the same rule as the ground camera. Clear rect = stage inset by: top `tabsBottom + 16` (≈130px desktop), right 72 (layers column), bottom `cmdbarHeight + 32`, left 16, plus the docked panel's width + 16 when one is open. Map `PLANETDEF.x,y` (0–1) into it with a uniform scale centred on the content bounds. Re-fit with a 240ms ease when the rect changes; `RM` snaps.
- **Hit testing** moves from the `#winsB` `galaxyCv` branch (~L3798) to a click handler on `#cv` while `baseView==='galaxy' && !gxWorld`. Same priority as today: leads, then sources, then worlds. Then:
  - lead → `openOpp(id)` (unchanged);
  - source → `srcSel={t:'s',id}`;
  - world with access → `enterWorld(id)`;
  - locked or uncharted world → `srcSel={t:'p',id}`.
- Hover: pointer cursor over anything clickable, and a `T.label` name tag over worlds.

**Map drawing** (all colours from `SR_THEME` / `SR_ART`; see the reference's Galaxy frame)

| Layer | How |
|---|---|
| Ground | `C.void`, deterministic starfield (seeded, ~230 dots, `C.steel` at 12–55%), stepped flat glow around Meridian (3 concentric circles, `C.goldHi` at 3.5–5%). No gradients. |
| Territory (Hegemony security layer) | For each world with security, two flat steps of `C.heg` circles, radius `(18+sec*24)*s` and 55% of that, drawn as a group at 8.5% / 9% alpha so overlaps don't darken. |
| Our reach | `C.rebel` circles at 12% group alpha: radius `(22+acc*11)*s` around worlds with access, and `(20+lib*0.9)*s` around worlds with liberation. |
| Region names | "THE DRIFT", "THE CORE", "THE VERGE" in `FONT.display` 28px at 26% alpha (`C.rebelHi` / `C.hegHi` / `C.psi`). Hidden on phones. |
| Lanes | `SR_ART.route` dots every ~15px, stopping `R+8` short of each world. Both ends with access: `C.rebelHi` dots with ink outline. Both ends known: `#4a5598` with ink. Otherwise faint `#2c3372`, no outline, every ~19px. |
| Worlds with access | `SR_ART.planet` using `WORLD_LOOK` (§7). Name 13px/700 `C.text` (Haven 800 `C.rebelHi`), kind 11px `C.text3` beneath. |
| Known, no access | Same planet at 62% opacity, dashed `C.text3` ring at `R+6`, name 12px `C.text2` with a lock icon. |
| Uncharted | No planet: `C.psi` ring r7.5 on `C.void` + "?" 11px/800, faint ring r13 (pulses unless `RM`), label "Uncharted". |
| Liberation ring | Worlds with regions and access: track circle at `R+8`, `C.rebel` 3px at 28%, plus an arc of `lib%` from 12 o'clock, round caps. |
| Selection | Ink ring 6px, then gold dashed ring 3px (`[7,5]`) at `R+15`. |
| Leads | Gold diamond (8px half-height, ink 1.8), new leads add a 12px gold ring at 50%; "New lead" / "Lead" 11px `C.goldHi` to the left. Unchanged behaviour. |
| Missions | Gold map pin with the type icon (`soldier` ground, `ship` space) for `G.missions` with `state==='avail'` at that `loc`. |
| Sources | §5.1 badge, placed on a ring at `R+10` around their world (`SRCPOS`), angles spread so several don't overlap. |
| Flights | Ships on missions: `SR_ART.ship(ctx,id,…,1.05)` part-way along the lane home, gold dashed trail behind, ink pill "Cross · home tomorrow". |

**5.1 Source badge (map).** Disc r11 in `C.rebel` (hot: `C.hazard`) with ink drop (+1.5,+2.5) and 2.2 outline; the `signal` icon (12px, ink) in its upper half; an ink tab 13px tall straddling the bottom, holding the level numeral in `FONT.display` **11px** (`#fff4e6`). The numeral stays ≥11px, which is why it sits on a tab and not inside the disc. Waiting signal: two `C.rebel` arcs above the badge (r17 at 75%, r24 at 40%), animated outward unless `RM`.

**5.2 Source avatar (DOM).** `<span class="sr-avatar gx-src">` + signal icon + `<span class="gx-lvl"><b>II</b></span>`, plus the kit's `.sr-badge` "!" when a signal waits. Use it everywhere a source appears: rail, panels, command bar, comm windows.

**Galaxy HUD**
- Top bar: title "Galaxy", sub "*n* worlds with access". Resources and hub unchanged.
- `.sr-slot-tr`: `.gx-tools` = `.gx-layers` (header "Layers" + 6 icon toggles with `aria-pressed`: Network `signal`, Leads `intel`, Missions `missions`, Liberation `revolution`, Hegemony security `eye`, Flights `ship`) and `.gx-zoom` (zoom in, zoom out, fit). Clicking "Layers" expands it into `.gx-legend` (the map key, see reference).
- `.sr-slot-bl`: the comms feed (narrowed to 320px by `.gx-view`, so add `gx-view` to the scene root while in Galaxy).
- `.sr-slot-br`: the command bar. Nothing selected: exactly the Base bar (Advance day + count). Something selected: §6.
- `.sr-slot-tl`: the docked panel for `srcSel` (`.sr-window.sr-window--sm.gx-dossier`, no scrim). Content per the reference's three panel frames:
  - **Source**: avatar with level, tags (type, "Running hot" when risk > 60), bio, Cultivation and Risk meters, "Risk *n*: he's being watched" `sr-fine` when hot, income `sr-cost` chips, "Missions from *name*" rows. Reuse the logic in `sourceDetailHTML` (~L3049); move its buttons into the command bar.
  - **Known, no access**: tags, the "Everyone's heard of it…" line, Security + Access pips, a "Scouting reveals" dashed list.
  - **Uncharted**: `--progress` accent, "The Verge · origin unknown", the existing line, "Scouting reveals" list.

**Rail** (new `syncRail()`; `#panel` content swaps with `baseView`)
- **Network** (`--friend`, count "*n* of *cap*"): one `.sr-unit` per live source, avatar §5.2, name, "type · place", side = income as `.sr-cost` chips (from `s.inc`). Risk > 60: `--c:var(--sr-hazard)`, hazard stripes and a 2px hazard outline on the whole row (see reference). Click: select it on the map (`srcSel`). Double-click: open its comm window (Contact).
- **Worlds** (`--info`, "*n* with access"): Haven (tag "Home"), then worlds with access: planet avatar (40px `SR_ART.planet`), name, kind (and "· *n* regions"), side = liberation ring (`.gx-wheel`) if it has regions, else Access pips. Click: `enterWorld(id)`. `.is-selected` on the current world. Last row: ghost "*n* uncharted signals / *m* more worlds known, no access".
- **In flight** (`--info`): ships out on missions, "Mission · place", tag "Home tomorrow" / "*n* days".
- Hint: "Click any row to find it on the map".
- Phones: the drawer button's label becomes "Network and worlds" in the galaxy views.

**Guide and shortage hooks**
- `updateGuide()` onboarding step `contact` (~L2957): when `baseView==='galaxy'`, point at Cass's badge on the stage (`srcBadgePos('cass')`); once selected, point at the command bar's Contact order. When not in Galaxy: point at `#navSources` (unchanged).
- `markShort()` (~L3603): the Intel shortage check runs on `srcSel.t==='p'` with `baseView==='galaxy'`.

**Acceptance:** the Galaxy tab swaps views with no window; Advance day is pixel-identical in both views; every lead, source, mission and world from the old window is on the map; clicking does what the old window did; `#galaxyCv` and the `sources` window are unused (delete them in Phase 5); bot sweep passes.

### Phase 3 — World view

**Entering and leaving**
- `enterWorld(id)` from a map click or a Worlds rail row. **Only worlds with access** dive in. Locked and uncharted worlds open the docked panel instead (see §9, open question 1).
- Transition: the planet scales up from its map position to the stage centre over 420ms (`--sr-ease-out`, 0.16 → 1, fading in over the first 60%), as `.gx-world` does in the reference. `RM`: no animation.
- Leaving: `gxBack()`. The world view's top-right holds a 200×130 **galaxy minimap** button (`.gx-minimap`, "◀ Galaxy" pill, current world ringed gold).

**Planet**
- Centre: middle of the clear rect (≈(770,400) on a 1120×844 stage), radius ≈ 26% of stage height (218 at 844), clamped so the planet plus orbit fits.
- Draw order, all clipped to the disc except the drop, orbit and markers:
  1. Orbit back half (ellipse rx 330, ry 72, −10°, ink 6px + `#5a64a8` 2px dashed `[4,6]`) and any orbit objects behind the planet.
  2. Ink drop disc (+8,+12).
  3. **Territories** (regions whose kind is not `'Settlement'`) filled with their `WORLD_LOOK.regions[id].fill`, then their `REGION_DECOR`, then a **state overlay**: Hegemony = `C.heg` 45° hatch (4px bars every 11px) at 20%; contested = `C.hazard` hatch at 18%; liberated = `C.rebel` flat at 25%.
  4. **Settlements** on top: ink drop (+2,+3, 50%), fill, `isoBox` buildings, the same state overlay.
  5. While a region is open, every other region gets an ink veil at 38%.
  6. Cel shade: one ink tone at 26% over the disc minus a light circle offset (−0.20R, −0.24R) with radius 1.04R (even-odd).
  7. Borders: territories ink 3.2px; settlements ink 5px then their state colour 2px (a "town wall"). The open region gets a gold dashed outline (3px, `[9,6]`).
  8. Disc outline ink 4px, faint atmosphere ring at `R+6`.
  9. Markers (§5.4), then orbit front half and front objects.
- **Region geometry** comes from `regionShapes(planetId)` (§7.4), generated deterministically from the planet id. No art files.
- Region hit testing: point-in-polygon on the canvas (settlements first, they sit on top). The DOM chips (below) are also click targets and the keyboard path.

**Region chips** (DOM, `.gx-rchip`, positioned over each region's label point, recomputed on resize): state dot + (settlements: `base` icon) + name + liberation ring (`libring(pct)`: conic `--sr-rebel` ring with the `revflame` icon, `role="img"` and `aria-label="*n*% liberated"`). Open region: `aria-pressed="true"` (gold). Click: `openRegion(id)`.

**5.4 What sits on the planet** (positions from `REGION_DECOR` markers, else a seeded free spot in the region, keeping clear of chips)

| Marker | Data | Look |
|---|---|---|
| Source | `G.sources` alive, `SRCPOS[id]===world`, region `SRC_REGION[id]` (fallback: the planet's first settlement) | §5.1 badge |
| Mission (ground) | `G.missions`, `state==='avail'`, `loc===world`, `typeOf(m)!=='space'`; region `m.region` (fallback: first settlement) | gold pin, `soldier` |
| Lead | `G.opps`, `!done`, `loc===world`, region `o.region` | gold diamond |
| Hegemony presence | `HEG_SITE[regionId]` (cosmetic) | `C.heg` disc r11, ink `shield` icon |
| Orbit: space missions | `G.missions` avail, `loc===world`, `typeOf(m)==='space'` | gold pin on the orbit's front half |
| Orbit: Hegemony patrol | security ≥ 2 (cosmetic) | small white-and-navy cutter, label "Hegemony patrol" 11px `C.hegHi` |
| Orbit: our ships | flights whose mission is at this world | `SR_ART.ship` on the orbit |

Nothing historical is drawn (no burned depots, no finished missions).

**World HUD**
- Top bar title = world name, sub "World view · Galaxy" (region open: "*Region* · *World*").
- **No tabs** (`.sr-tabs` hidden).
- `.sr-slot-tl`:
  - **Location panel** (`.gx-dossier`). Head: ghost "◀ Galaxy" button (`gxBack` to the galaxy), kicker, world name (display), help `?`. Body: tags (kind, "Pop …"), lore clamped to 3 lines + "Read all", the four mini stats (`.gx-sheet__stats`: Security pips `--sr-heg`, Access pips `--sr-shield`, Support pips coloured by `supCol`, "Freed *n*%" ring), then **Regions** as `button.gx-region` rows (name, kind, state tag, bar with the gold cap mark) that call `openRegion`.
  - **While a region is open** the panel goes compact (`.gx-dossier--compact`: head + mini stats only) and the **region card** (`.gx-regioncard`) opens beneath it: kicker "Region of *World*", name, close; tags (kind, state); blurb; liberation line (`libring` + bar with cap mark + %); **Local job**; **Sources** (only if any); **Missions and Hegemony** (or **Hegemony** when there is no mission).
  - **Cap mark**: every `.gx-region__cap` carries `data-tip="Current limit based on level of access and support."` (CSS shows it on hover) and the same `aria-label`. Cap = `locCap(st)`.
- **Local job** (§5.4 data, not `r.op`): the first available mission or lead in the region, as a `.gx-job` (name, 2-line description, rewards as `.sr-cost` chips from `m.rew`, `+n%` liberation from `m.lib`, "*need* rebels · *days* days · *riskTxt* risk"). If there are several, show the first and a "+*n* more" link to the Missions view. If there are none: `.sr-empty` "No jobs here yet. Leads need Access 2 and a staffed Comms Array; sources offer the rest."
- `.sr-slot-tr`: galaxy minimap button. `.sr-slot-bl`: comms. `.sr-slot-br`: command bar (§6).

**Acceptance:** every world with access dives in and renders its regions; settlements read as walled towns and are selectable on their own; region chips, rows and canvas clicks all open the same region; Esc / minimap / Back return correctly; markers match live data (a new lead appears in its region without a reload); no HUD element overlaps another at 1280×720.

### Phase 4 — Phone (provisional)

Container queries on `.sr-app` already handle the shell. Galaxy on phones: map fits the stage above the command bar; names only for worlds with access and the selection; a `.gx-sheet` above the command bar replaces the docked panel (name, sub line, 4 mini stats, chevron to open the full panel as a window). **World view on phones is not designed yet**: implement it as planet on top, location panel as a bottom sheet, region card replacing the sheet, minimap hidden (Back button in the sheet), and flag it for review.

### Phase 5 — Cleanup

- Delete the `winMode==='sources'` branch of `renderWin`, `#galaxyCv`, the `maphint` line, `.bs-planet` / `.bs-src` / `.bs-stats` / `.bs-region` CSS that only the window used, and the `sources` window's click branch.
- Keep `srcTut`, `srcTutIntro`, `comm`, `silence`, `opp`, `locBrief` windows: they open over the Galaxy view.
- Run §10.

## 6. Command bar per selection

Same component as ground (`.sr-cmdbar` + `.sr-orders` + `__go`), Advance day always rightmost. Keys 1–9, Esc. Order cards may carry one `.sr-cost` line under the label. Disabled orders keep `disabled` and show `.sr-tip` with `.sr-tip__why`. **`__who` is omitted whenever the docked panel directly above already names the selection** (decision 13).

| Selection | Orders (key: label → call) |
|---|---|
| Nothing (galaxy) | none; Advance day + count, identical to Base |
| Source | 1 Contact → `srcContact(s)` (attn + `!` when a signal waits; disabled with reason if already contacted today) · 2 Visit → `srcVisit(s)` · sep · 3 Silence → `openWin('silence',s)` (risk ≥ 50, `gx-order--danger`) · 4 Cut loose → arm, then `srcCutLoose(s)` on the second press (keep the `cutArm` pattern; the card label becomes "Confirm: cut loose") |
| Known world, no access | 1 Scout & gain access → `scoutPlanet(id)`, cost `d.scout` Intel; short: disabled + tip "Need *n* more Intel. Work the network, or wait a day." |
| Uncharted signal | 1 Scout the signal → `scoutPlanet(id)`, cost `d.scout` Intel |
| World (no region open) | 1 Raise access → `raiseAccess(id)`, cost `accessCost(d,st)` (hidden at Access 5) · 2 Contact *source* for any source on the world with a waiting signal · sep · 3 *Mission* → `openPlan(m)` for each available non-region mission (cap at 3, rest in the Missions view) |
| Region open | 1 Run the job → `openPlan(m)` for a mission / `openOpp(id)` for a lead · 2 Contact *source* in this region · 3 *Mission* if a second job exists · sep · Esc Back to *World* → `gxBack()` |

## 7. Data tables (static; extend freely)

### 7.1 `LANES` (cosmetic)

```js
const LANES=[['haven','kess'],['haven','brakka'],['haven','veray'],['kess','veray'],['veray','menk'],['brakka','menk'],
 ['kess','oubli'],['oubli','sable'],['sable','parity'],['veray','parity'],['parity','callis'],['parity','ballakan'],
 ['menk','dreymar'],['dreymar','ballakan'],['ballakan','volund'],['menk','nyx'],['nyx','volund'],['callis','tarsis'],
 ['callis','meridian'],['tarsis','meridian'],['meridian','halcyon'],['halcyon','volund'],['ballakan','callis']];
```

### 7.2 `WORLD_LOOK` (map size, colour, surface texture)

`R` is the galaxy-map radius at scale 1. `tex` is a new optional `SR_ART.planet` option (add it to `sr-art.js`, data-driven, drawn inside the cel-shade clip with `shade(col,-.16)`): `bands` (3 horizontal stripes), `craters` (4 dots), `dunes` (3 wave lines), `cap` (white polar cap + one band), `cracks` (gold-hi molten lines), `islands` (3 green ellipses), `flats` (2 white ellipses at 70% + one band), `river` (one brown wave), `grid` (3×3 thin lines). Meridian adds `ring:true`; core worlds `heg:true`; Haven `home:true`.

| id | R | col | tex | | id | R | col | tex |
|---|---|---|---|---|---|---|---|---|
| haven | 12 | `#7a6656` | craters | | dreymar | 11 | `#a8743a` | craters |
| veray | 12 | `#c0623a` | bands | | sable | 11 | `#5d8a4a` | islands |
| kess | 8 | `#9aa6c4` | — | | nyx | 10 | `#8a5aa8` | craters |
| brakka | 12 | `#c99a5a` | dunes | | tarsis | 12 | `#d8b860` | bands |
| callis | 12 | `#4fb0a0` | cap | | oubli | 10 | `#6a6f7a` | craters |
| meridian | 17 | `#ffd866` | bands, ring, heg | | menk | 12 | `#e6dcc8` | flats |
| volund | 16 | `#d0563a` | cracks, heg | | ballakan | 13 | `#3f8a5a` | river |
| halcyon | 14 | `#7fc8d8` | islands, heg | | parity | 12 | `#8a94b0` | grid |

Region fills for the World view (`WORLD_LOOK[id].regions`): Brakka `flats #b9743f`, `dustfall #a88a62`; Menk `saltreach #ece5d6`, `kiln #bfae94`, `crossing #a99a80`. For other worlds, default territory fills to `col` shaded −8% / +8% alternately and settlements to `shade(col,-.2)`.

### 7.3 `SRC_REGION`, `HEG_SITE`

```js
const SRC_REGION={venn:'dustfall',tess:'saltreach',pell:'tollgate',cask:'ledger'};   // others: first settlement, else planet-wide
const HEG_SITE={dustfall:'Sheriff’s office',flats:'Tithe depot and garrison',saltreach:'Company crawlers',
  kiln:'Foundry contract office',crossing:'Precinct house',tollgate:'Toll office',ledger:'Bureau registry',quota:'Labour wardens'};
```

### 7.4 `regionShapes(planetId)` and `REGION_DECOR`

Deterministic from `hashStr(planetId)`; unit-disc coordinates (−1…1), clipped to the disc when drawn.

- **Territories** (kind ≠ `'Settlement'`): one → the whole disc. Two or more → split the disc by borders that run from the rim through a hub point near the centre (offset ≤ 0.12), one border per territory, at roughly equal angles plus seeded ±12° jitter. Each border is a 4–6 point polyline with seeded ±0.08 wobble. Territory polygons are hub → border → rim corner(s) → next border.
- **Settlements**: an 11-point blob, radius 0.24–0.27 (seeded wobble 0.82–1.12, flattened ×0.92 vertically). Place it on a territory border, 0.4–0.55 from the hub; with one territory, at a seeded point 0.35–0.5 from the centre. Never let two settlements overlap.
- **Chip point**: territories, the polygon's visual centre pushed 15% toward the rim; settlements, just outside the blob on the side away from the hub.
- **Decor** (`REGION_DECOR[regionId]`, optional): a list of `[kind,u,v]` where `kind` is `town`, `pad`, `mesa`, `well`, `depot`, `garrison`, `flats`, `crawler`, `ridge`, `kiln`, `road`, plus marker anchors `source`, `job`, `heg`. Regions without decor get a seeded scatter by keyword in their name and blurb (quarry → flats + crawlers, ridge/kiln → ridge + kilns, river/canopy → river + trees, data/server → grid blocks, flats/herder → mesas + wells). Settlements always get 5–6 `isoBox` buildings.

The reference shows the hand-tuned versions for Brakka and Menk. Match those first, then let the generator cover Ballakan and Parity IV.

## 8. Words

Sentence case, as the UI v1 handoff. New player-facing strings:

| Where | Text |
|---|---|
| Galaxy top bar | Galaxy / *n* worlds with access |
| World top bar | *World* / World view · Galaxy (region open: *Region* · *World*) |
| Layers panel | Layers · Network · Leads · Missions · Liberation · Hegemony security · Flights |
| Panel back button | Galaxy |
| Minimap | Galaxy |
| Panel sections | Regions · Local job · Sources · Missions and Hegemony · Hegemony · Scouting reveals |
| Cap mark tooltip | Current limit based on level of access and support. |
| Hot source line | Risk *n*: he’s being watched. (use the source's pronoun) |
| Command bar | Raise access · Contact *name* · Visit · Silence · Cut loose · Scout & gain access · Scout the signal · Run the job · Back to *World* |
| Rail | Network · Worlds · In flight · Click any row to find it on the map |
| Empty job | No jobs here yet. Leads need Access 2 and a staffed Comms Array; sources offer the rest. |

Keep in-world names, lore, source bios and mission names exactly as they are.

## 9. Open questions for Tom

1. **Should locked and uncharted worlds dive in too?** Proposed: yes, with the planet shrouded and regions hidden until scouted. This handoff keeps them as galaxy-level panels until you decide.
2. **Region data for missions.** Some missions have no `region` (e.g. Brakka Garrison Raid). The World view falls back to the first settlement. Adding `region` to `MPOOL` entries makes placement exact.
3. **Phone World view** needs its own design pass.
4. **Missions view** is next: the gold mission pins and the region cards' "Local job" will hand off to it.

## 10. Acceptance checklist

- [ ] **Sizes:** screenshot Galaxy (nothing / source / locked / uncharted selected) and World (no region / territory / settlement open) at 1920×1080, 1440×900, 1280×720, 390×844, 844×390. No HUD overlaps; the selection is never under a panel.
- [ ] **Advance day** is in the same place, same size, in Base, Galaxy and World.
- [ ] **One gold primary** per state (Advance day); window-level primaries only inside windows.
- [ ] **Faction colours:** our sources, reach and liberation red; Hegemony territory, sites and patrols blue; hot sources and contested regions orange.
- [ ] **Text size:** nothing under 11px on canvas or in CSS (the source numeral is exactly 11px).
- [ ] **No repeats:** no tag duplicates a stat shown in the same panel; the command bar's `__who` never repeats the panel above it.
- [ ] **Keyboard:** Tab reaches tabs, layers, rail rows, panel rows, region chips and orders with a visible focus ring; 1–9 and Esc work; Esc steps region → world → galaxy.
- [ ] **Reduced motion:** no dive animation, no pulsing rings or waves.
- [ ] **Live data:** contacting a source, scouting, raising Access and finishing a mission update the map, rail, panels and chips without reopening anything.
- [ ] **Save compatibility:** an existing campaign loads; nothing new is written to `G`.
- [ ] **Autoplay bot** (`tools/sweep.sh`) completes a run.
- [ ] Old galaxy window code removed (Phase 5).
