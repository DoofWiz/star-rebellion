# Star Rebellion — UI v1 "Chunky Ops": implementation handoff

For: Claude Code, working in `github.com/DoofWiz/star-rebellion`, branch **`claude/kind-hamilton-wordzt`** (the live build on GitHub Pages; the screenshots this design was made from match it, not `main`).

Living reference: **`docs/ui/styleguide.html`** — every component in every state, rendered from the same files you will install. When this document and the style guide disagree, the style guide wins; when either disagrees with Tom, Tom wins.

---

## 0. Kickoff prompt (Tom: paste this into Claude Code)

> Read `docs/ui/HANDOFF.md` end to end, then open `docs/ui/styleguide.html` in a browser. We are replacing all three scenes' styles in `game/` with the shared UI kit in `game/ui/`. Work phase by phase as the handoff describes (Phase 1 → 5), committing at the end of each phase. Do not change game rules, balance, save format or terrain art. After each phase, screenshot every affected screen at 1440×900, 1280×720 and 390×844, compare against the style guide, and fix overlaps before moving on. Ask me before removing any feature or renaming any player-facing term not listed in §7.

---

## 1. What's in the package

```
game/ui/sr-theme.css        tokens + every shared component (sr- prefixed)
game/ui/sr-theme.js         canvas palette (reads the CSS tokens) + in-world HUD drawing helpers
game/ui/sr-icons.svg        78-icon sprite (inline it into index.html)
docs/ui/HANDOFF.md          this file
docs/ui/styleguide.html     living style guide (self-contained)
tools/ui-kit/               sources: icons.py, sr-theme.css, sr-theme.template.js,
                            styleguide.template.html, build.py
```

**Edit sources, then build.** The `game/ui/` files are generated:

```bash
python3 tools/ui-kit/build.py game/ui docs/ui
```

`icons.py` is the single source of truth for icons (SVG sprite and canvas `Path2D` data both come from it). `sr-theme.css` in `tools/ui-kit/` is the editable CSS; the build copies it to `game/ui/`.

## 2. Non-goals and guard rails

- **No game-logic changes.** Rules, balance, save format (`star-rebellion-campaign-v1`), mission flow and the autoplay bot (`tools/autoplay.js`) must behave identically. If the bot clicks DOM ids, keep those ids or update the bot in the same commit.
- **Terrain, buildings, props and FX art are out of scope.** Keep their colours (browns, rock greys, explosion oranges) as they are. The restyle covers DOM chrome and the *HUD layer* of the canvas (units, rings, cones, labels, markers, pips, VS panel, minimap colours).
- **Keep every element id that JS looks up**, or update the lookup in the same change. Prefer adding `sr-` classes to existing elements over rebuilding markup where the structure already fits.
- **One scene per commit**, old CSS deleted as each scene is finished. Never leave a scene half on each system.

## 3. The house rules (check every screen against these)

1. **Top reads, bottom does.** The top bar and right rail only report. Every decision lives in the bottom command bar or in a window.
2. **Gold means act.** One gold primary per screen. Whatever advances time — Start, Execute, Attack, Advance day, Extract — is `sr-btn--primary` and sits at the right end of the command bar.
3. **Red is yours, blue is theirs, orange is danger.** Rebel red marks the player's side; cold Hegemony blue marks hostiles and their awareness; hazard orange marks danger that belongs to nobody (low health, panic, misses, failed checks, destructive actions). Never decorative.
4. **Nothing whispers.** Body 15px, labels 13px, nothing under 12px except keyboard hints and tiny tags (11px). Sentence case; no tracked capitals for labels.
5. **Everything clicks.** Interactive things have an ink outline, a hard shadow and press down. Disabled things lose all three and say *why* on hover.

## 4. Phases

### Phase 1 — Foundations (shared)

1. **Install files.** Copy `game/ui/*`. In `game/index.html`:
   - Replace the fonts link with `https://fonts.googleapis.com/css2?family=Bungee&family=Exo+2:wght@500;600;700;800&display=swap` (IBM Plex Mono is retired).
   - `<link rel="stylesheet" href="ui/sr-theme.css">` **after** the existing `<style>` block during migration (so new rules win), then delete old blocks scene by scene.
   - Paste the contents of `ui/sr-icons.svg` as the first child of `<body>` (inline sprite; GitHub Pages serves it fine and `<use href="#i-…">` needs it in-document).
   - `<script src="ui/sr-theme.js"></script>` before `js/core.js`.
2. **Kernel.** In `core.js`: expose `SR.theme = window.SR_THEME` and call `SR_THEME.sync()` at the top of `SR.boot()` (re-reads every `--sr-*` token so canvas and CSS can never drift).
3. **Scene roots.** Each `.scene` (`#sc-base`, `#sc-space`, `#sc-ground`) gets `class="scene sr-app sr-root"`. Inside, `#app` becomes `.sr-shell`, `#topbar` `.sr-topbar`, `#stage` `.sr-stage`, `#panel` `.sr-rail`, `#panelScroll` `.sr-rail__scroll`. **All overlays and windows must stay inside the scene's `.sr-app`** — phone rules are container queries on it.
4. **Shared briefing furniture** (`index.html` §"shared briefing furniture" + `SR.ui` in `core.js`):
   - `SR.ui.icon(k)` → return `<svg class="sr-ico"><use href="#i-NAME"/></svg>`. Old→new names: `rifle→gun`, `pistol→pistol`, `shotgun→gun`, `plasma→plasma`, `shell→ballistic`, `missile→missile`, `ship→ship`. Delete the `ICO` path table.
   - `SR.ui.squadCard(o)` → `.sr-squadcard` (avatar with initials, `__name`, `__role`, `__gear` of `.sr-gear` chips); pilots use `.sr-avatar--pilot`.
   - `SR.ui.objRows(list)` → `.sr-obj` rows with `.sr-obj__mark`; `sub` rows → `.sr-obj--note`.
5. **Canvas fonts.** Replace every `ctx.font` (≈69 calls) using `"IBM Plex Mono"` with `SR.theme.FONT.ui` at weight 800 (numbers) or 700 (text), and big numerals with `SR.theme.FONT.display` weight 400. Minimum canvas text size 11px; unit names 12px.
6. **Acceptance:** game boots, nothing visually broken yet beyond fonts; `grep -c "IBM Plex" game/index.html game/js/*.js` returns 0.

### Phase 2 — Base scene (`base.js`, `#sc-base`)

**Top bar** → `.sr-topbar.sr-topbar--hub` (three columns so the Revolution hub sits at the exact screen centre):

```html
<header class="sr-topbar sr-topbar--hub">
  <div class="sr-topbar__side"><div class="sr-topbar__id">…Haven Rock / Hidden base…</div>
    <div class="sr-resbar">[credits][supplies]</div></div>
  <div class="sr-revhub" style="--p:38" tabindex="0">…</div>
  <div class="sr-topbar__side"><div class="sr-resbar">[materials][fuel][intel]</div>
    <div class="sr-topbar__tools">[day][sound][menu]</div></div>
</header>
```

- Resources: `.sr-res.sr-res--credits|supplies|materials|fuel|intel` with `__ico`, `__val` (keep ids `resC/resS/resM/resF/resI` on the `__val` spans), `__lbl`. Keep the existing `title` tooltips. When a value rises, append a `.sr-res__delta` (`+500`) that removes itself after 1.2s. Add `.is-short` when a pending cost can't be paid.
- **Revolution hub** replaces `#revLamp`. In `syncUI()`: `.sr-revhub__lvl` = roman numeral of `G.revLevel` (I–V); `--p` = `G.renown` (0–100 toward next level); move the existing `revTip` HTML into `.sr-revhub__tip` (first line as `<b>`); replace `.hot` with adding `.is-rising` for 1.2s whenever renown increases. Delete `#revLamp` CSS.
- `.sr-shell` gets `.has-revhub` (drops the top-centre slot below the hub).

**Stage**
- `#navRow .navbtn` → `.sr-tabs` in `.sr-slot-tc` with three `.sr-tab`s: Base (`aria-selected="true"` when no window is open), Galaxy (`#navSources`), Missions (`#navMissions`). `.badge` → `.sr-badge`; `.wire` → `.is-calling`. Add a fourth phone-only tab `.sr-tab.sr-drawerbtn.sr-phone-only` (people icon) that toggles `.is-drawer-open` on `.sr-shell`.
- `#flashB` → `.sr-toast.sr-toast--friend` (signal icon) in `.sr-slot-tc` under the tabs.
- `#tutPtr` → `.sr-pointer` (`__label`, `__arrow`). Same positioning logic.
- `#ctlDock` → `.sr-slot-br > .sr-cmdbar > .sr-cmdbar__go`: `#dayBtn` becomes `.sr-btn.sr-btn--primary.sr-btn--lg.sr-btn--go` ("Advance day" + execute icon); `#dockNote` becomes `.sr-cmdbar__count`.
- `#dayBanner` → `.sr-banner` with `.sr-banner__txt` ("Day 4", `--c:var(--sr-gold)`).
- `#roomViewBar` → `.sr-window.sr-window--sm` docked in `.sr-slot-tl` (no scrim); build options inside become `.sr-card.sr-card--good` rows with `.sr-cost` chips (`.is-short` when unaffordable) and a `.sr-btn--primary` Build.
- `.pop#tilePop` → same window component positioned as a popover (no scrim, `animation` on).
- Comms: `#logbox` leaves the rail. Show the newest 2–3 entries as `.sr-comms` in `.sr-slot-bl` (`.sr-comm--friend|foe|good|action`, older lines `.is-old`, expire after ~6s with `.is-expired`), plus an "All news" `.sr-btn--ghost.sr-btn--sm` that opens a window containing the full `.sr-log` (`.is-friend` etc., `.sr-log__day` separators). Keep `#log` as the full log's container id.

**Rail** (`#panel`) → `.sr-rail`
- `.sec-h.crew|rSol|rMar|rSup|fleet` → `.sr-section__head--action` (Pilots) / `--friend` (Soldiers) / `--progress` (Marines) / `--good` (Support) / `--info` (Flight), each with its role icon and a `.sr-section__count`.
- `.rrow` → `<button class="sr-unit">` with `.sr-avatar` (initials, role badge), `__name`, `__role` ("Private, level 1"), `__side` holding the assignment as `.sr-tag` (Resting / `--progress` Training / `--bad` Injured *n* days). Pilots: `style="--c:var(--sr-gold)"` + `.sr-avatar--pilot`.
- `.frow` → `.sr-unit` with a ship avatar (`--c:var(--sr-shield)`), `.sr-hp` hull cells + "Hull 75%", status tag (`--warn` Repairing, `--friend` Out).
- `.sidehint` → `.sr-railhint`. Empty groups → `.sr-empty` with an instruction ("No support crew yet. Recruit them through your sources in the Galaxy.").

**Windows** (`openWin`/`renderWin`, every mode: `arrive, candidate, cassIntro, chain, comm, escalate, locBrief, missions, newmission, opp, person, plan, recruit, reward, silence, sources, srcTut`)
- `.overlay` → `.sr-scrim`; `.winCard` → `.sr-window` (`.narrow` → `--sm`, `.wide` → `--lg`); `.winHead/.wt` → `__head/__title`; `.winX` → `.sr-btn.sr-btn--icon.sr-btn--sm.sr-btn--ghost` (clear icon); `.winQ` → `.sr-btn--icon.sr-btn--sm` with `style="--c:var(--sr-go);--ct:var(--sr-ink)"` (help icon); `.winBody` → `__body`. **Move every window's action buttons out of the body into `.sr-window__foot`**, primary rightmost.
- Accent by sender: `.sr-window` (gold, system/missions), `--friend` (your contacts: comm, cassIntro, candidate, recruit, chain), `--foe` (escalate, Hegemony events), `--progress` (reward, level-ups), `--good` (arrive).
- `srcTut` field manual: `.tutP` → `.sr-p`, `.tutStep .th/.tb` → `.sr-h3` + `.sr-p`, `.tutNav` → foot with `.sr-window__note` ("Page 2 of 6") and a `.sr-btngroup` of back/chevron icon buttons.
- Galaxy (`sources`): `#galaxyCv` stays in a `--lg` window body; `.maphint` → `.sr-fine` centred; `.plcard` → `.sr-card--info` (`.locked` → `.is-locked`, `.unknown` → `.sr-card--progress`); `.scard` → `.sr-card--friend` with `.sr-tag--progress` level, `.sr-meter` cultivation, `.sr-meter--risk` (add `.is-hot` above 60), income as `.sr-cost` chips, actions `.sr-card__acts`: Contact `.sr-btn--friend` (`.sr-btn--attn` when a signal waits), Visit `.sr-btn`, Cut loose / Silence `.sr-btn--danger` (confirm first).
- Comm/`cassIntro`: `#commStatic` → `.sr-signal` (keep the canvas, recolour the waveform to `C.rebel`); `.commBody/.commline` → `.sr-quote` with `.sr-quote__who`; `.commline.sys` → `.sr-window__note`; `.warn` lines → `.sr-tag--bad`. Dialogue options `.dbtn` → `.sr-choice` with a numbered `.sr-kbd` (keys 1–4 pick).
- Missions (`missions`, `newmission`): `.mcard` → `.sr-card` (`.done` → `--good`, `.locked` → `.is-locked`, `.prog` → `--info`); `.mstate` → `.sr-tag`; `.mmeta` → `.sr-card__meta` tags. "Brief & Start"/"Arrange Mission" → **"Plan mission"** (primary); "Later" → ghost.
- Plan (`openPlan`): `.pcRow` → `.sr-check` (`.no` → `.is-no`, `.pwhy` → `.sr-check__why`); team/transport/pilot slots → `.sr-slot` (`.is-filled`, `.is-target` while dragging/after selecting a roster entry, `__label`, `__name`, `.sr-slot__clear`); roster `.prow` → `.sr-unit` (`.off` → `.is-down` + reason tag); reward line → `.sr-cost` chips; footer: note "Fill every slot to go. *n* slots empty." + `Go to the hangar` (`.sr-btn--attn` when that's what's missing) + `Auto-fill` + primary `Start` (disabled until valid).
- Personnel file (`person`) and recruit dossier: `.lvlring/.lvlin` → `.sr-level` (`--p` = XP %), `.dz-name/.dz-rank/.dz-sub` → title/tag/role, `.dz-sec` → `.sr-h3`, `.eqrow` → `.sr-loot` gear rows, `.achip` assignment toggles → `.sr-btn.sr-btn--sm[aria-pressed]`, `.achip.hurt` → `.sr-tag--bad`.
- Briefing/debrief (`.brief`, `#enterBtn`, `.rewline`) → `.sr-window` with `.sr-brief__hero` (sender tag + `.sr-brief__title`), rewards as `.sr-cost` chips, `.sr-fine`, primary in foot. Debrief headline gets a `.sr-stamp` ("Secured" `--action`, "Mission failed" `--bad`).

**Base canvas** (`renderBase`, `renderRoomView`, `drawGalaxy`, `drawCommStatic`): room outlines/labels from tokens (Command `C.gold`, Hangar `C.shield`, Barracks `C.rebel`, Comms `C.shield`, Infirmary `C.go`, Training `C.psi`, Workshop `C.steel`); room labels via `SR.theme.label(..)`; build markers via `SR.theme.marker(..)`; galaxy source masts `C.go` with `C.go` wave rings; intel leads `C.gold`; uncharted `C.psi`.

**Acceptance:** base matches the style guide's Base HUD and Phone base frame; every window opens with the new chrome and no horizontal scrollbar; Revolution hub shows level, progress and tooltip.

### Phase 3 — Ground scene (`ground.js`, `#sc-ground`)

**Top bar**
- `#gTitle/#gSub` → `.sr-topbar__title/__sub`.
- `#townPill` + `#phaseName` + `#roundNum` merge into one `.sr-phase` in `.sr-topbar__mid`:
  `data-status="calm|alert"` (calm: eye icon, "Camp is quiet"/"Town is calm"; alert: panic icon, "Camp alerted") and `data-phase="free|plan|exec|fight"` with `.sr-phase__name` "Free move / Planning / Moving / Engagement" and `.sr-phase__round` "Round *n*" (free move shows "Sneaking" when sneak is on). Put the status words in `.sr-phase__text` (hidden on phones).
- Zoom −/+/Fit → `.sr-btngroup.sr-desk-only` of icon buttons; Follow → icon toggle with `aria-pressed`; Sound → icon toggle (`soundon`/`soundoff`), `.sr-desk-only`.
- **Restart and Debug leave the bar.** One menu icon button opens `.sr-menu`: Sound, Controls, separator, `sr-menu__item--danger` "Restart mission" (confirm), `sr-menu__item--debug` "Debug: skip mission".
- Whenever the phase changes, play `.sr-banner` once ("Planning", sub "Round 2"; colours from `--sr-phase-*`).

**Stage**
- **Objectives move out of the rail** into `.sr-objectives` in `.sr-slot-tl` (head with star icon; rows `.sr-obj` `.is-done/.is-current` with `__count` "0/9"). Add `.is-compact` whenever time is in rounds (only the current objective shows). Delete `#objStrip` (phones get the compact tracker).
- `#tutCard` → `.sr-coach` under the objectives: `.sr-coach__title` from the step (e.g. "Plan the round"), `.sr-coach__dots` (n of 7 `.is-on`), body keeps `<b>` terms, keys as `.sr-kbd`. Optional "Got it" foot button where steps are dismissible. The coach can carry a tail (`--tail-left/up/down`) when it points at something.
- Minimap → `.sr-minimap` canvas in `.sr-slot-tr`, with the comms feed `.sr-comms` stacked under it (same expiry rules as base) and the phone-only drawer button `.sr-btn.sr-btn--icon.sr-drawerbtn.sr-phone-only` (people icon, `.sr-badge` "!" when a rebel is panicking or down) above it.
- `#pickPill` → `.sr-pill` above the command bar ("Pick a destination for Dax" + `.sr-kbd` Esc). Pill texts: "Pick a destination for {name}", "Tap an Auto to hack", "Tap where the run ends", "Tap a visible spot".
- `#csBanner` → `.sr-banner` (`.big` → `__txt`, `.small` → `__sub`); `#csSkip` → `.sr-btn.sr-btn--sm.sr-btn--ghost` "Skip".
- Letterbox `.lb` unchanged.

**Command bar** (`.sr-slot-bc`) — **replaces the radial ring** (`radialHTML`, `#radial`) **and the dock** (`dockHTML`, `#ctlDock`):

```html
<div class="sr-cmdbar">
  <div class="sr-cmdbar__who"><span class="sr-avatar">DF</span>
    <div><div class="sr-cmdbar__name">Dax Ferro</div><div class="sr-cmdbar__hint">Choose an order</div></div></div>
  <div class="sr-orders">…order cards…</div>
  <div class="sr-cmdbar__go"><button class="sr-btn sr-btn--primary sr-btn--lg sr-btn--go">Execute …</button>
    <div class="sr-cmdbar__count"><b>1</b> of 3 ordered</div></div>
</div>
```

Order cards: `<button class="sr-order sr-order--FAMILY" data-ract="…"><span class="sr-kbd sr-order__key">1</span><svg class="sr-ico"><use href="#i-ICON"/></svg>Label</button>`. Selected order `.is-active`. Disabled orders get `disabled` **and** a `.sr-tip` on hover/focus with `.sr-tip__why` ("Get within reach of a job first."). Keep `data-ract` values so the existing click handler logic can be reused.

| `ract` (old) | Label | Icon | Family | Key | When shown |
|---|---|---|---|---|---|
| `move` | Move | `move` | `--move` | 1 | always |
| `sprint` | Sprint | `sprint` | `--move` | 2 | always |
| `hold` | Hold | `hold` | `--stance` | 3 | always |
| `cover` | Take cover | `cover` | `--stance` | 4 | always |
| `lockin` | Lock in | `lockin` | `--nerve` | 5 | always (only order besides Clear while panicking) |
| `loot` | Loot | `loot` | `--util` | 6 | always |
| `work` | Work | `work` | `--util` | 7 | contextual / disabled with reason |
| `man` | Man gun | `turret` | `--stance` | 8 | next to the turret |
| `leave` | Leave gun | `leave` | `--stance` | 8 | while manning (replaces the bar with Hold + Leave gun) |
| `clear` (Un-jam) | Un-jam | `unjam` | `--util` | 8 | Akli jammed |
| `hack` | Hack | `hack` | `--util` | 8 | near an Auto |
| `fs` | Fire support | `firesupport` | `--fight` | 9 | fire support bought |
| `cancel` | Clear | `clear` | (none) | X | always |

Separate groups with `.sr-orders__sep` (movement+stance | nerve+utility | contextual | Clear). The count shows "*n* of *m* ordered" (tooltip: "Rebels without orders stand fast"). **Extract** replaces Execute in `__go` as a primary `extract`-icon button when available (`#extractBtn` id kept).

**Engagement** — the same bar becomes the attack dock: `__who` = acting rebel ("Pick a weapon or retarget"), weapon cards `.sr-order--fight` (Akli AR `gun`, Cowboy `pistol`, Scattergun `gun`, Long Iron `gun`), Grenade ×n `grenade`, Stim ×n `stim` (`--util`); `__go` = primary `#attackBtn` "Attack" (attack icon; the hit % now lives in the VS panel, not the button label) and `#holdBtn` "Hold fire" as `.sr-btn--ghost.sr-btn--sm` beneath it; count "Shot *k* of *n*".

**VS panel** — `drawVsPanel` (canvas) is replaced by DOM `.sr-vs`, inserted in `.sr-slot-bc` **directly above** the command bar during engagement (see style guide markup). Attacker side `.sr-vs__side` (rebel) / defender `.sr-vs__side--foe`, modifiers as `.sr-mod.is-plus|is-minus` sentences, totals, centre `.sr-vs__odds` (`.is-good` ≥60%, `.is-bad` <45%), "Need 12+ on a d20", `.sr-die` (`.is-rolling` then `.is-hit|is-miss`), "Shot 1 of 6". On resolution, briefly add `.sr-stamp` "Hit"/"Miss" (`--bad`). Delete `drawVsPanel` once the DOM version is live.

**Camera rule (new behaviour, required).** When the engagement dock is open, follow-cam must frame the attacker and target inside the stage **minus the bottom dock height** (VS panel + command bar), not the canvas centre. Similarly on phones, follow the selected rebel at ~45% of stage height (portrait) / ~28% (landscape) so the bar never covers them.

**Rail**
- `.sec-h` Squad → `.sr-section__head--friend`; `#foeHead` (Sheriff's Men / Squatters) → `--foe` with "*n* seen" count; Loot → `--good`.
- `.urow` → `.sr-unit` (`.law` → `--foe`, `.sel` → `.is-selected`, `.gone` → `.is-down`; acting unit `.is-acting`). Inside: `.sr-hp` (5 cells, `--mid` <60%, `--low` <35%, number shown for rebels), `.sr-ordertag` for the plotted order (or `--none` "No orders"), `.sr-nerve--cool|steady|shaken|panic` (panic text "Panicking"; rail rows say "Lock in only" in the tooltip).
- **All "Contact — NO VISUAL" rows collapse into one** `.sr-unit--ghost` "*n* contacts out of sight".
- `.lootTally` → `.sr-loot` rows (icon by type, `+40` / `×1`); empty → `.sr-empty` "Nothing yet. Check tills, crates and lockers."
- Comms log leaves the rail (see Stage); the rail ends with Loot.

**Ground canvas (HUD layer only)** — replace with `SR.theme` helpers:

| Old function | New |
|---|---|
| `drawUnit` | `T.unitToken(ctx,x,y,{side,r:16,icon,facing,t,selected,acting,targeted,panicking,down,ordered})` + `T.hpPips(ctx,x,y-30,{hp,max})`; names via the label layer |
| sight cones (in `drawUnit`/`drawVision`) | `T.sightCone(ctx,x,y,angle,spread,range,nearRange,{alert})` — blue searchlight, orange near band |
| detection gauge | `T.detectGauge(ctx,x,y-44,frac)` |
| `drawOrders` | `T.moveRing(ctx,x,y,r,'move'|'sprint')` while plotting; `T.plotLine(...)` for plotted moves; `T.coverPip` on cover destinations (2 = full) |
| `drawEngageFocus` | `T.fireLine(ctx,x0,y0,x1,y1,side,t)` + `T.reticle(ctx,x,y,r,t)` on the target |
| `drawLoots`, `drawWork`, objective spots | `T.marker(ctx,x,y,{icon,color,t})` (loot `C.go`, jobs `C.gold`) |
| unit names, loot labels, "COVER" tags | `const L=T.labelLayer(); L.add(text,x,y,opt,priority); … L.flush(ctx)` once per frame — priorities: units 3, objectives 2, loot 1, others 0 |
| place labels ("Main hall", "Squatter stash") | `T.label(ctx,text,x,y,{kind:'place'})`; fade to 40% when a unit is within 120px |
| `drawBubbles` | keep behaviour; restyle as `T.label` pills with a faction border |
| `drawFog` | colours from `T.ROLE.fog` / `T.ROLE.fogMemory` |
| `drawMinimap` | dots `C.rebel` / `C.heg`, view rect `C.gold` |
| `drawTurret` frontal shield | `C.shield` |
| `drawFx` | leave FX art; recolour tracers by side (`C.rebel` / `C.heg`) |
| terrain/buildings/props (`drawGround`, `drawBldgs`, `drawProps`, `drawGroundHaven`, `drawTower*`, `drawDerelict`, `drawGraf`, `drawCross`, `drawTumbleweed`, `drawCage`, `drawFactory`) | **unchanged** |

**Overlays:** `#briefing .ovCard` → `.sr-window` + `.sr-brief__hero` (tag "Ground operation, Dustfall"), objectives `.sr-obj`, team `.sr-team`, `#gHint` → `.sr-fine`, foot primary `#enterBtn` "Start". `#endscreen` → debrief window with `.sr-stamp`; loot `.lootline` → `.sr-loot`; `#endRetryBtn` primary "Retry mission" when lost (then Continue is `.sr-btn`), `#endRestartBtn` primary "Continue" when won.

**Keyboard:** 1–9 pick order/weapon cards, X clears, Esc cancels a pick, Enter presses the visible primary, C toggles sneak (existing), M toggles sound.

**Acceptance:** ground matches the style guide's three states (switch them) and the phone frames; no HUD element overlaps another or the acting units at 1280×720; the order ring is gone; VS panel is DOM.

### Phase 4 — Space scene (`space.js`, `#sc-space`)

Same patterns as ground, plus:
- Top bar: title/sub, `.sr-phase` (no calm/alert status — use `data-status="alert"` with a target icon and "Engaged", or omit the status cell), tools/menu as ground.
- `#phasebox` → the `.sr-phase` plate; `#objline` → `.sr-objectives` (single current objective; `.done` → `.is-done`).
- **Maneuver dial** `#dialPop .dial` → `.sr-dial` inside the command bar (between `__who` and `__go`): column heads `.sr-dial__h` ("Hard L, Bank L, Ahead, Bank R, Hard R, K-turn"), keys `.sr-dial__k` (`.sel` → `.is-active`, `.none` → `.is-empty`, `.pm` (pilot maneuvers) → `.is-pilot`, disabled stays disabled). Planned maneuver also shows as `.sr-ordertag` in the rail row (replaces `.planchip`).
- **Activation radial with submenus** → order cards; opening a submenu appends `.sr-orders__sep`, a Back card, then the submenu cards (see style guide "space activation").

| `ract` | Label | Icon | Family |
|---|---|---|---|
| `lock` | Lock | `targetlock` | `--fight` |
| `evmenu` | Evade ▸ | `evade` | `--stance` |
| `flydef` | Fly defensive | `evade` | `--stance` |
| `shiftF` / `shiftR` | Fore → aft / Recall … | `angle` | `--stance` |
| `lockin` | Lock in | `lockin` | `--nerve` |
| `repmenu` | Repair ▸ | `work` | `--util` |
| `boostF` / `boostR` | Boost fore / aft | `boost` | `--util` |
| `fieldrep` | Patch hull | `patch` | `--util` |
| `fixcrit` / `fix:n` | Fix critical / crit name | `work` | `--util` |
| `broll` | Barrel roll | `roll` | `--move` |
| `pass` | Pass | `pass` | (none) |
| `back` | Back | `back` | (none) |

- `#lockPill` → `.sr-pill` "Pick a lock target" + Esc.
- Attack dock → command bar with weapon cards (`plasma`, `ballistic` with ammo count, `missile` ×n) + DOM `.sr-vs` above it (same as ground).
- Rail `rosterRow` → `.sr-unit` with stacked `.sr-hp` rows labelled S / A / H: shields `style="--hp:var(--sr-shield)"` (stacked second segment `--sr-psi`), armour `--sr-steel`, hull default thresholds; exposed zone → `.sr-tag--bad` "Aft exposed"; crits → `.sr-tag--bad` list; initiative → `.sr-tag` "Init 4"; nerve → `.sr-nerve--*`.
- Info windows (`openInfo/renderInfo`, `#infoWins`): two `.sr-window--sm` side by side in a `.sr-scrim` — pilot dossier (`.sr-level`, rank tag, traits as `.sr-card` rows, nerve) and ship systems (silhouette canvas, durability `.sr-hp` rows with exact numbers, `.wcard` → compact `.sr-card` with weapon icon, to-hit as `.sr-mod`-style signed number, ammo cells via `.sr-hp`; `.sw-crit` → `.sr-tag--bad`).
- Canvas: `shipColors()` → faction `C.rebel` / `C.heg` (hostiles get the icy glow: `shadowColor=rgba(C.heg,.85)`, `shadowBlur=14` on the outline); shield arcs `C.shield`, stacked segment `C.psi`; `drawLockLines` dashed — your locks `C.gold`, locks on you `C.heg`; `drawLockBadges`/`drawStateIcon`/`drawCritPip`/`drawCombatIcons` → `T.icon(...)` with `{outline:true}` (sword/shield/targetlock/panic icons); `drawPlanPath` → `T.plotLine` style; `drawArcFor` firing arc `rgba(C.gold,.12)` fill with a dashed `C.gold` bullseye line; asteroids/space art unchanged.

**Acceptance:** Take Out Instructor and Cook the Depots playable end to end with the new HUD; dial and submenus work by mouse and keys.

### Phase 5 — Cleanup

- Delete every `#sc-base …`, `#sc-space …`, `#sc-ground …` rule and the old phone block (`index.html` lines ~23–760 today). Only scene-specific *layout* that the kit doesn't cover may remain, in a short `game/ui/scenes.css`.
- Remove dead ids/classes (`revLamp`, `objStrip`, `infoBtn`, `radial`, `dialPop`, `.chipbtn`, `.rbtn` …).
- Run the acceptance checks in §8.

## 5. Colour migration reference (canvas + inline styles)

There are ~400 hex and ~340 `rgba()` literals across `base.js`, `ground.js`, `space.js`. **Do not find-and-replace blindly**: the old red meant both "enemy" and "danger", and the old cyan meant both "rebel" and "info". Decide per call site with the rule in §3, then use the token.

| Old literal (and its `rgba(r,g,b` form) | Old meaning | New token |
|---|---|---|
| `#ffb454` / `rgba(255,180,84` | amber accent, selection, cones | `C.gold` for action/selection; **sight cones → `C.heg`** |
| `#57d7e2` / `rgba(87,215,226` | rebel cyan | `C.rebel` if it marks the player's side; `C.shield` if it's info/stealth/shields |
| `#7de3ec`, `#9ff0f5`, `#8fd8e0` / `rgba(125,227,236` | light rebel cyan | `C.rebelHi` (side) or `C.shield` (info) |
| `#ff4f5e` / `rgba(255,79,94` | Hegemony red **and** danger | `C.heg` if it marks a hostile or their awareness; `C.hazard` for low health, panic, misses, failed checks, alarms about you |
| `#ff8f9a`, `#ff6a75`, `#ff9d9d` | light Hegemony red | `C.hegHi` (hostile) or `C.hazard` (danger) |
| `#7dd97b`, `#9fe0a8` / `rgba(125,217,123` | good / green | `C.go` |
| `#57a8ff`, `#7db8ff`, `#cfe0ff` / `rgba(87,168,255` | blue: shields, fleet, info | `C.shield` (**not** the Hegemony blue) |
| `#c987ff`, `#e3a6ff` / `rgba(201,135,255` | purple progress | `C.psi` |
| `#ffe08a`, `#ffd27d` | ballistic/ammo yellow | `C.goldHi` |
| `#71809c`, `#8a93a8`, `#8fa5c4` / `rgba(113,128,156` | dim text | `C.text3` |
| `#9fb0cc` | secondary text | `C.text2` |
| `#cdd8ec`, `#e8ecf4`, `#d8e2f2` / `rgba(205,216,236` | text | `C.text` |
| `#04060d`, `#0a0f20`, `rgba(8,12,24`, `rgba(10,15,30` | backgrounds/panels | `C.void` / `C.night` / `T.rgba(C.hull,a)` |
| `rgba(120,255,190` | comm green glow | `C.rebel` (comms from your contacts) |
| `#ff9a5c`, `#ff9d3d`, `#ff7a5e`, `rgba(255,120,80`, `rgba(255,150,60`, `rgba(255,170,90` | fire, explosions, canisters | **leave** (FX art) |
| `#b09a78`, `#dcc9a8`, `#3a3430`, `#241a10`, `#181c22`, `#0c0f14`, `#3a3f46` … | terrain, buildings, props | **leave** (out of scope) |

Helpers: `SR.theme.rgba(C.heg,.4)` for alpha; `SR.theme.ROLE.*` for semantic shortcuts (`friend, foe, action, good, warn, bad, progress, revolution, info, select, target, cover, coneFar, coneNear, move, sprint, hold, loot, hpHigh, hpMid, hpLow, phaseFree, phasePlan, phaseFight, phaseExec, fog, fogMemory`).

Useful greps:

```bash
grep -noE "#[0-9a-fA-F]{6}\b" game/js/*.js | sort -t: -k3 | less     # every hex, by colour
grep -noE "rgba\((255,79,94|87,215,226|255,180,84)" game/js/*.js       # the three ambiguous families
```

## 6. Canvas helper API (`SR.theme` / `window.SR_THEME`)

```js
sync(root?)                                   // re-read --sr-* tokens into C and ROLE
C, ROLE, FONT, ICONS                          // palette, semantic roles, font stacks, icon path data
rgba(hex, a)                                  // '#4f8cff',.4 -> 'rgba(79,140,255,.4)'
icon(ctx, name, x, y, size, color, {outline, weight})  // 24-grid icon centred at x,y
rr(ctx,x,y,w,h,r) / chunky(ctx,x,y,w,h,r,fill,{drop,line})  // rounded rect / ink-outlined box with hard drop
label(ctx, text, x, y, {color,bg,size,weight,kind:'unit'|'place'|'loot'|'float',align,pad,icon,border}) -> rect
labelLayer() -> {add(text,x,y,opt,priority), flush(ctx)}   // collision-resolved labels
unitToken(ctx, x, y, {side,r,icon,facing,t,selected,acting,targeted,panicking,down,ordered})
hpPips(ctx, x, y, {hp,max,cells,cw,ch,gap,showNum})
coverPip(ctx, x, y, level)                    // 1 = half, 2 = full
reticle(ctx, x, y, r, t)
sightCone(ctx, x, y, angle, spread, range, nearRange, {alert})
detectGauge(ctx, x, y, frac)                  // 0..1, >=1 = spotted
moveRing(ctx, x, y, r, 'move'|'sprint')
plotLine(ctx, x0, y0, x1, y1, 'move'|'sprint', t)
fireLine(ctx, x0, y0, x1, y1, 'friend'|'foe', t)
marker(ctx, x, y, {icon,color,t,size})
```

`t` is seconds (for pulses/rotation); pass `0` when `prefers-reduced-motion` is set.

## 7. Words (player-facing copy)

Sentence case everywhere except Bungee titles (Bungee is all-caps by design). Buttons say what happens; an action keeps its name through the flow.

| Old | New |
|---|---|
| Brief & Start / Arrange Mission | Plan mission |
| Understood | Got it |
| TUTORIAL 4/7 | coach title (e.g. "Plan the round") + 7 dots |
| Contact — NO VISUAL (×n) | *n* contacts out of sight |
| 0/3 PLOTTED · UNPLOTTED STAND FAST | *n* of 3 ordered (tooltip: Rebels without orders stand fast) |
| Attack · 50% | Attack (odds shown in the VS panel) |
| Sound: On / Follow: On | icon toggles (aria-label "Sound", "Follow camera") |
| Tap or double-click for personnel file | Double-click anyone for their file |
| Pick a destination · tap to cancel | Pick a destination for {name} [Esc] |
| Restart (top bar) | Menu → Restart mission (asks to confirm) |
| Debug → Skip Mission — instant win | Menu → Debug: skip mission |
| Hidden Base · Day 3 | Hidden base (day shown at right as "Day 3") |
| ROUND 1 (rail) | phase plate "Round 1" |

Keep in-world names, lore text, dialogue and mission names exactly as they are.

## 8. Acceptance checklist (run at the end of each phase and before merge)

- [ ] **Sizes:** screenshot every screen/state at 1920×1080, 1440×900, 1280×720, 390×844, 844×390. No HUD element overlaps another HUD element; at engagement, the attacker and target are visible above the dock.
- [ ] **One gold primary** visible per state, at the right end of the command bar (or window foot).
- [ ] **Faction colours:** rebels red, hostiles blue, danger orange — spot-check low-health rebel (orange pips, red row edge), panicking enemy (blue row, orange "Panicking"), missed shot (orange).
- [ ] **Text size:** `grep -nE "font(-size)?:[^;]*\b([0-9]|10)(\.5)?px" game/ui/*.css game/index.html` finds nothing below 11px; canvas `ctx.font` sizes ≥ 11px.
- [ ] **Fonts:** `grep -c "IBM Plex" game/index.html game/js/*.js` → 0.
- [ ] **Colours:** remaining hex/rgba literals in `game/js/*.js` are only terrain/FX (whitelist in §5).
- [ ] **Disabled orders** all show a reason tooltip.
- [ ] **Keyboard:** visible focus ring everywhere; 1–9, X, Esc, Enter, C, M work in combat; 1–4 pick dialogue choices.
- [ ] **Reduced motion:** with `prefers-reduced-motion`, no looping animation remains (the kit handles CSS; pass `t=0` to canvas helpers).
- [ ] **Windows:** none scroll horizontally; all actions in the foot; Esc closes non-blocking windows.
- [ ] **Phone:** rail opens as a drawer from the people button / crew tab; order bar scrolls with a fade hint; objectives compact; coach hidden in landscape.
- [ ] **Save compatibility:** an existing localStorage campaign loads and plays.
- [ ] **Autoplay bot** (`tools/sweep.sh`) still completes a run.
- [ ] Old `#sc-*` CSS deleted; `docs/ui/styleguide.html` rebuilt if the kit changed.

## 9. Decisions already made (don't relitigate without Tom)

- The order **radial ring is replaced** by the bottom command bar (it collided with names and labels). A right-click quick-ring can come back later as an *addition*, not a replacement.
- The **VS panel becomes DOM** and docks above the command bar; the camera frames the fight above it.
- **Bungee + Exo 2**; monospace retired.
- **Factions:** rebels red, Hegemony blue, hazard orange for danger; fuel is plasma pink; shields/intel/stealth are cyan.
- The **Revolution Level** is the centre-screen burning-flag hub on the base top bar, rebel red.
- Comms leave the rail and become a short-lived feed with a full log behind "All news".
- Phones: container queries on `.sr-app`; rail as a drawer; zoom/sound move to pinch and the menu.
