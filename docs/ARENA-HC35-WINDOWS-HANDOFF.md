# Type 3.5: the planning windows, built to the designer's mock-ups

**For:** Claude Code in `DoofWiz/star-rebellion`, on `space-combat-testing` (after `427f80d`).
**What it is:** a **restyle** of the holographic planning windows you built in K6 and split in L1 (`arena-hc35.js`
`briefHtml`, `trackHtml`, `stripHtml`, `step1`, `step1b`, `step2`, `step3`; `arena.css` `#arHc35 .h35-holo…`). The
flow, the data and the behaviour stay. What changes is how the windows look and lay out, to match three mock-ups
the designer made in ChatGPT, with the corrections below.
**Mock-ups:**

| File | Screen | Builds |
|---|---|---|
| `docs/ui/mockups/hc35-02-plan-objective.png` | Planning, step 1: the objective | Window 1, part 1 |
| `docs/ui/mockups/hc35-03-plan-rules.png` | Planning, step 2: optionals and rules together | Window 1, part 2 (its left panel) and window 2 (its right panel) |
| `docs/ui/mockups/hc35-04-plan-wings.png` | Planning, step 3: wings and assets | Window 3 |

Window 4 (the plan on the map) has no mock-up yet. Give it the shared frame, track and footer (§1) and leave its
contents as they are. The review log for all the mock-ups is `docs/ui/HUD-MOCKUP-REVIEW.md`.

**How to read a mock-up.** It's a picture, not a spec. Match its **layout, hierarchy, component shapes and colour
use**. Take **every word, number, name and rule from the game's data**, never from the picture: ChatGPT invented some
of them (§5). Where this file and a mock-up disagree, this file wins.

**Ground rules:** as `docs/archive/ARENA-HANDOFF.md` §0. Blockers in the same commit (next free: **C-84**, **M-38**), every
`tools/*-smoke.js` before each commit, and High Command untouched (this is all inside `#arHc35`).

---

## 1. Shared: the window frame, the step track, the footer

All three mock-ups share these; build them once.

**The stage behind.** The Missions tab you built from mock-up 1 stays behind the window, dimmed to about 45%
brightness with a 2 px blur, and the holo-table's pedestal and beam stay visible under the window's bottom edge. The
mock-ups' backdrops differ from mock-up 1 (a different board style and a right-hand rail of base stats): **ignore
them, and in particular never draw the round red emblem at their bottom right.** It closely resembles a well-known film
franchise's insignia. The game's own Revolution mark is the kit's `sr-revhub`.

**The frame (`.h35-holo`).**
- **Size** at 1920 × 1080: about 1310 × 850, centred horizontally, with its top 75 px below the top bar's top. It
  scales down to fit 1440 × 900 with 24 px clear at each side. **The body must not scroll at 1440 × 900** (§2–§4 say
  how each window fits). The `h35-holo__body` scroll stays only as a safety net.
- **Shape:** a bevelled holo plate with **45° chamfered corners** (about 22 px), not rounded ones.
- **Edges:** a 2 px cyan edge (`--sr-shield` at 85%) inside a 2 px ink outline, a soft outer cyan glow (0 0 28 px at
  35%), and a thin inner cyan line 6 px inside the edge (at 30%).
- **Fill:** a deep navy gradient (`#0e1b3c` → `#0a1230`) at 94%, with the existing 3% scanlines, plus a very faint
  circuit-grid texture (at 4%, a CSS gradient pattern, no image).
- **The bottom edge** has a **V-notch** at its centre, about 140 wide and 36 deep, where the projector beam enters. The
  beam's bright core runs up into it. Keep the existing projector glow along the edge, broken by the notch.
- **The head:**
  - The title "PLAN: VULNERABLE FREIGHTER" in Bungee, about 36 px, white, centred, with a 2 px ink text-shadow.
  - The close ✕, top right: white, 30 px, no button chrome until hover.
  - The step track centred under the title.
- **Section panels inside** (the four family columns, the two lists, the three wing columns, the assets bar): a
  darker navy (`--sr-night` at 85%), a 1.5 px cyan line at 40%, radius 10, and a header in Bungee (20 px, white, caps)
  with any sub-label in Exo 2 at the same baseline.

**The step track (`.h35-track`).** Four nodes: **1 Objectives · 2 Rules · 3 Wings & assets · 4 The plan**.
- **Each node** is a 46 px circle holding its number in Bungee (22 px), joined to a label pill (36 px tall, Exo 2 700,
  18 px).
- **Done:** a green ring and number, a small green ✓ badge at the circle's lower right, and the label green. Clicking
  returns to it, as now.
- **Current:** a gold ring and number with a **gold sunburst**: a ring of short radiating ticks behind the circle,
  turning slowly (static with reduced motion). The label pill has a gold border and gold text.
- **To come:** a grey ring and number, and the label pill in plate grey.
- **Connectors:**
  - between two done nodes, a solid green bar, 4 px;
  - from the current node to the next, a gold dashed line with chevrons drifting toward the next node;
  - between nodes still to come, grey chevrons.
- **Window 1's two parts:** two small dots under node 1's label (filled for the parts reached), as the `h35-node__parts`
  pips do now.

**The footer.** The buttons sit **on the pedestal's ledge, straddling the frame's bottom edge** (half outside it).
- **Left:** **◀ Back** (on part 1: **◀ Back to board**). A navy plate button with a cyan rim, Bungee caps, about
  240 × 64.
- **Right:** the gold primary **Next: {next window} ▶** (Bungee, about 270 × 64), or **Launch ▶** on window 4.
- **Centre, between them:** the **readiness pill** in place of the strip of checks. "Needs: **1 missing**" with the
  count in orange, or "Needs: all met ✓" in green. Hovering shows the in-game tooltip listing every check with ✓, ✕
  or !. Clicking opens the same list as a small popover above the pill. Warnings (!) don't count as missing.
- **A disabled Next or Launch** keeps its reason in the tooltip and as the orange line under the pill (`h35-holo__why`).

**The tooltip** (`#hcTip`, every `data-tip` in these windows) takes the mock-ups' look:
- an ink panel (`#070818` at 96%) with a 2 px cyan border and an 8 px pointer toward the element;
- the title in Exo 2 800, 20 px, **cyan**;
- the body in Exo 2 600, 15 px, white;
- an optional footer under a thin cyan divider, in its tone colour (cyan info, orange warning, gold cost).
- **Width:** 300 px. It sits beside the element (right, else left), not under the cursor.

---

## 2. Window 1, part 1: the primary objective (mock-up 2)

**Layout.** "What's the job?" in Bungee (26 px) centred under the track. Then **four family columns of equal width**:
**TAKE IT · DENY IT · USE IT · BAIT WITH IT**, each a section panel with its header centred. The *Later* column you have
now goes: its "not in this demo" cards join their family columns as locked cards (Turn the Crew under Use it, as in the
mock-up; Snatch the Paymaster under Take it; Misjump under Deny it; Trojan Freighter under Use it; Cover Op under Bait
with it). Show at most one locked card per column, and put the rest in its family header's tooltip.

**An objective card.**
- **Top:** a 44 px white line glyph on the left (inline SVG; the set is in §6), then the name (Exo 2 800, 20 px,
  white) and **a one-line pitch** under it (15 px, `--sr-text-2`).
- A thin divider.
- **"Needs:"** (13 px, `--sr-text-2`), then one row per need: green ✓ and green text when met, orange ✕ and orange text
  when missing (unpicked cards show the needs neutral, as now). "No needs" in grey when there are none.
- **"Pays:"** with the resource chips and the per-container or per-kill line, then **"Accomplished +…"** (what L1
  built; it replaces the mock-up's Loot tier word).
- **Picked:** a 2.5 px gold border, a soft gold glow, the name in gold, and a gold corner tab with a ✓ (top right).
- **Hovered:** a 2 px cyan border, and the tooltip to its side (title = the name; body = the full `wins` text; footer
  = the timing or caveat, for example "Timing: the gravity window" for Crash).
- **Locked:** 50% opacity, a lock glyph in place of the icon, the name, and "not in this demo".

**Fit at 1440 × 900.** Take it holds three cards. Clamp the pitch to one line and the needs to two rows, and set the
cards' gap to 8. If the column still overflows, the unpicked cards in it drop their Pays block (it's in their tooltip)
before anything scrolls.

---

## 3. Window 1, part 2, and window 2: secondaries, then rules (mock-up 3)

The mock-up puts the optional objectives and the rules of engagement side by side in one window. The designer has
since asked for them apart (feedback 2, §2, built in L1: the secondaries as part 2 of window 1, the rules as window 2).
**Keep that split.** Use the mock-up's left panel for part 2 and its right panel for window 2, and give each window a
second panel so it isn't half empty:

| Window | Left panel (wider, about 60%) | Right panel |
|---|---|---|
| **1, part 2** | **SECONDARY OBJECTIVES** (pick up to 2), with the counter "1 / 2" right-aligned in green | **YOUR PRIMARY**: the picked primary's card as in §2, read-only, with a ghost "Change" that goes back to part 1 |
| **2** | **RULES OF ENGAGEMENT** | **THE PLAN SO FAR**: the primary and the picked secondaries as compact rows (glyph and name), with any conflict tags. The rules clash with secondaries, so the player needs them in view |

**A toggle row** (both lists).
- **Shape:** 60 px tall; a 30 px white line glyph; the name (Exo 2 700, 19 px); a toggle switch at the right
  (56 × 30).
- **On:** a green track (`--sr-go`) with a white knob, the row's border green (2 px) with a faint green fill.
- **Off:** a dark track (`--sr-night`) with a grey knob and a plate border.
- The whole row is the button, and its tooltip is the `line` text.
- **At the cap** (2 / 2), rows that are off dim to 50% and don't toggle. Their tooltip reads "Two at most: turn one
  off first".
- **Rows that need a choice expand when on**, with a second line inside the row:
  - **Preservation Order:** "withdraw below [30%] hull" (as the mock-up), the value in a gold-bordered field that steps
    in 5% from 10% to 60% (click or ←/→). This replaces the range input.
  - **Protect a ship** and **Blood the Rookie:** "Pilot: [Name a pilot ▾]", using the existing `pilotPick` options,
    styled as the same field.
- **Conflict tags:** an orange-bordered box ("⚠ Conflicts with {other}") hangs off the right of the row, overlapping
  the panel edge as in the mock-up. **Only while both are on.** The mock-up shows it with only one on; that's wrong.
- **Suggestion tag:** a cyan outline chip "☆ Suggested for {primary}" under the row, while the rule is off and the
  primary suggests it (`SUGGESTS`).

**Fit:** seven secondaries at 60 px fit at 1440 × 900. The five rules do with room to spare.

---

## 4. Window 3: wings and assets (mock-up 4)

**Layout.** Three **wing columns** of equal width, top-aligned, then the **assets bar** across the bottom.

**A wing column** (a section panel), top to bottom:
1. **The head:** the leader's portrait, 64 px in a rebel-red ring (`SR_ART.portrait`, the Bobbleheads, **not** the
   mock-up's painted faces); the callsign in Bungee (32 px, rebel red); the leader's name under it (16 px, white).
2. **Ship rows, one per ship**, each a plate row with a seam border.
   - **Left:** the ship art, 104 × 52, drawn by `SR_ART.ship` top-down at its size class (`sized:true`), nose right,
     in the rebel livery. The Brickbat's art follows its loadout (bomb racks, cargo pods, bare hardpoints), as now.
   - **Right:** the class's full name (Exo 2 800, 17 px: "FT-4 Cross", "SF-11 Talon", "BX-17 Brickbat"), and under it
     the pilot's name with a ★ for the leader (14 px, `--sr-text-2`), then their level or preset in `--sr-text-3`.
   - **A Brickbat row** adds a full-width three-way segmented control under that: **Bombs | Cargo pods | Boarding
     party**.
3. **The role control**, **Strike | Reserve | Stay home**, full width, **pinned at the same height in every column**
   (the mock-up's are misaligned).
4. **The leader's take:** a 44 px portrait and a speech bubble with its tail toward the portrait. White text and a
   steel border normally; **orange text and an orange border** when the take is a critique warning (as Sera's is in
   the mock-up).

**The segmented controls** (role and loadout) follow the mock-up: the chosen segment has a **rebel-red fill** with
white text; the others are plate grey with `--sr-text-2`. Red here reads as "your force, your choice" (logged, C-85).
A **Stay home** column dims to 55%, except its role control.

**The assets bar:** a section panel headed "**ASSETS** (3 slots)".
- **Three slots in a row.**
  - **Filled:** a 72 × 48 thumbnail (the asset's prop drawing from K2, or its glyph on a dark well where there's no
    prop), the name (Exo 2 800, 17 px), "unlocks **{power}**" with the power's name in cyan, a green ✓ corner badge,
    and a ✕ to remove on hover.
  - **Empty:** a dashed cyan border with "+ Add asset" centred.
- **The asset picker** (today the `h35-assets` list under the slots) becomes a popover that rises from the slot
  clicked. It's a holo panel listing each available asset as a row: thumbnail, name, its line, "unlocks …" in cyan.
  Esc or a click outside closes it.

**Fit at 1440 × 900.** Amber has four ships, so its column sets the height. Ship rows are 56 px (Brickbat rows 88 with
their control). If the column overflows, the art drops to 80 × 40 and the rows to 48 / 80, before anything scrolls.

---

## 5. Corrections: what the mock-ups got wrong

| Mock-up | Shows | Build | Why |
|---|---|---|---|
| 2 | Needs such as "Any bomber wing", "Recon wing", "Salvage wing", "Any combat wing" | The game's `NEED_TEXT` per primary: Steal "A Brickbat with a Boarding party"; Pirate none; Strip "A Brickbat with Cargo pods"; Destroy none; Crash "A Brickbat with Bombs"; Tag "One ship named to plant the tracker"; Ambush "A response to ambush (not Remote)" | Invented rules; the needs gate Launch |
| 2 | Steal needs "A Brickbat with bombs" and a boarding party | Only the boarding party (L1's data) | As above |
| 2 | "Loot: High / Medium / Low / None / Intel" | The L1 rewards ("Pays", "Accomplished") | The designer asked for real rewards |
| 2 | Pitches: Pirate "Seize the cargo by force", Tag "Use it to reveal more intel", Strip "Salvage what's valuable" | Pirate "Scare the crew into handing it over"; Tag "Follow it home to its depot"; Strip "Haul off what you can carry". Keep the others as drawn: Steal "Take the freighter intact", Destroy "Blow it apart", Crash "Smash it into the planet", Ambush "Use it as bait to draw them in". New `pitch` field, placeholder text (C-86) | Pirate is surrender, not force |
| 2, 3, 4 | A "Later" column (in our build) vs. locked cards in their families (mock-up) | The mock-up's way, one per column | It reads as part of the menu |
| 3 | Optionals and rules in one window | Kept apart (§3) | The designer's later call |
| 3 | A conflict tag showing with only one of the pair on | Only while both are on | The rule |
| 3 | "Protect [ship]" | "Protect a ship at all costs", expanding to a pilot pick | The game's name and need |
| 4 | Pilots Lyra, Mako, Vik, Rain, Grit, Rook, Stone, Iris, Shade, Patch; leaders not among the ships | The game's pilots: Dagger: Joss ★, Wren, Petra · Anvil: Sera ★, Brask, Ollo · Amber: Hale ★, Kit, Tam, Mags | `WINGS35` |
| 4 | Painted, realistic portraits; 3/4-view ship renders | `SR_ART.portrait` and top-down `SR_ART.ship` | The world art style |
| 4 | Asset thumbnails as invented 3D objects | The K2 prop drawings or glyphs | No art exists for them yet (M-37) |
| 2, 3, 4 | The backdrop's red winged emblem and base-stat rail | Not built. The backdrop is the mock-up 1 Missions tab | Resembles a film franchise's insignia; not our screen |
| 2, 3, 4 | The top bar's Missions tab highlighted red | As built from mock-up 1 | Consistency |

---

## 6. The glyph set

Single-path inline SVG line glyphs, white, `currentColor`, 24 × 24 viewBox, 2 px stroke, the same family as the HC
command icons. These are placeholders until the art pass (M-38).

| Item | Glyph |
|---|---|
| Steal | A grappling claw |
| Pirate | A skull and crossed blades |
| Strip the Cargo | A crowbar prising a crate |
| Destroy | A starburst |
| Crash | A ship nose-down with a fall streak |
| Tag and Track | A satellite dish with waves |
| Ambush the Responders | A crosshair with four arrows in |
| Locked | A padlock |
| Kill the Distress Call | A dish with a slash |
| Bring Everyone Home | Three heads |
| Leave No Witnesses | A skull |
| Bloodless | A drop, struck through |
| Ghost Run | A ghost |
| Blood the Rookie | A skull with a star |
| Protect a ship | A shield in brackets |
| Preservation Order | A shield with a cross |
| Hold for My Signal | A flag |
| Weapons Tight | A crosshair |
| Whale Hunt Tasking | A whale |
| Jump on Completion | An arrow bending up and out |

---

## 7. Phases, tests, blockers

| Phase | Build | Proof |
|---|---|---|
| **W1** | The frame, the stage behind, the track, the footer and readiness pill, the tooltip look (§1). Window 4 gets the frame | Every window shows the new frame. The track reads done, current and to come. Nothing scrolls at 1440 × 900 on windows 1–3 |
| **W2** | Window 1 part 1 (§2) and part 2, and window 2 (§3), with the corrections (§5) and the glyphs (§6) | Matches mock-ups 2 and 3, as corrected |
| **W3** | Window 3 (§4) | Matches mock-up 4, as corrected |

**Tests** (the HC35 section of `tools/arena-smoke.js`):
1. At 1440 × 900 and 1920 × 1080, `.h35-holo__body` has `scrollHeight <= clientHeight` on window 1 (both parts),
   window 2 and window 3, with Amber at four ships and every Brickbat set to Boarding party.
2. The track's classes follow the step, and window 1's part dots follow the part.
3. The readiness pill's count equals the missing checks; its tooltip lists them all.
4. A conflict tag appears only with both of its pair on. At 2 / 2, an unpicked secondary doesn't toggle.
5. The Preservation field steps by 5% between 10% and 60%, and the plan's `presHull` follows.
6. Window 3's ship rows name only `WINGS35` pilots, the leader with ★. The role controls' tops align across the three
   columns.
7. No `title` attributes inside `#arHc35`.
8. Re-rendering on a pick doesn't replay the open animation (L1's rule still holds).

**Blockers:**
- **C-84 "Type 3.5 planning windows: built to mock-ups 2–4".** Restyled to the mock-ups. Secondaries and rules kept
  apart against mock-up 3 (the designer's feedback 2 call). The rewards kept in place of the Loot tiers. Locked cards
  moved into their families. The readiness pill replaces the strip.
- **C-85 "Readings to confirm".**
  - The chosen segment is rebel red (the mock-up), while selected cards are gold: is that the split you want (gold =
    "picked for the mission", red = "your force's setting")?
  - Toggles are green when on.
  - The second panel on window 1 part 2 and window 2 (YOUR PRIMARY, THE PLAN SO FAR) isn't in any mock-up.
- **C-86 "Text".** The pitches and the tooltips' footers: lab copy, `[TEXT NEEDED]`.
- **M-38 "Art".** The objective, secondary and rule glyphs are placeholders; the asset thumbnails need art.
