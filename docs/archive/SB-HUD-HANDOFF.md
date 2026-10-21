# The SB planning HUD: handoff

**For:** Claude Code in `DoofWiz/star-rebellion`, on the space combat rework branch.
**Save as** `docs/SB-HUD-HANDOFF.md`.
**Read first, in order:** `docs/ARENA-HANDOFF.md` (the Arena chassis), then `docs/ARENA-SB-HANDOFF.md` (the SB
ruleset this HUD drives). **Design source:** the designer's instruction of 12 October 2026, plus his screenshot of
the SB Test build at `e1_fox`, turn 13, and the approved design canvas *SB Planning HUD* (Claude Design, 12 Oct):
the full screen in context, the four steps of one ship's plan, the tray anatomy and the icon set. His brief,
condensed: planning is **procedural, one step after the other** — pick the movement style for segment 1, drag it;
pick the between-segments action; pick the style for segment 2, drag it; then Execute — and the controls live
**in a tray under each ship**, as icons that explain themselves on hover.

**What this file owns.** The SB ruleset's planning-phase UI, end to end: the per-ship tray, the step order, the
drag behaviour per movement mode, the action pick, the turn chrome and the Execute button. The *rules* the UI drives
(envelope, AP, projectiles, actions) stay owned by `docs/ARENA-SB-HANDOFF.md` §2–§5 and do not change here, with
**one rules amendment**: the action now resolves **between the two segments** (§3.4). Where the two files disagree
on UI or on that timing, this file wins. (`docs/ARENA-SB-HANDOFF.md` §4 carries the matching amendment note, added
with this file.)

---

## 0. Ground rules

Everything in `docs/ARENA-HANDOFF.md` §0 applies verbatim: blockers in the same commit, no `G` changes, Arena text
is designer-facing (plain labels and tooltip copy are fine, nothing ships without the text flow), placeholders as
getter-exposed named constants, copy-don't-refactor, every `tools/*-smoke.js` before each commit. Additions:

- **Dependency.** The tray's movement steps need SB phase **B2** (continuous drag, modes, AP); the action step
  needs the **B4** action list (stubs included). H1 (§6) can land with B2 and the action step can arrive with B4 —
  the phases interleave at the designer's direction.
- **v2 is untouched.** This HUD is SB-only. It lives in `sim-sb.js` (plus `sr-theme.css`/a new `arena.css` block
  for the overlay) behind the ruleset interface's `planInput`/`draw`. "SR V2 Combat" keeps its existing planning UI
  byte-for-byte, and every pre-existing smoke test passes unchanged.
- **The tray is HTML, not canvas.** Hover tooltips, disabled states and focus come free. One overlay element inside
  `#sc-arena`, repositioned every frame from the world→screen transform. Use the existing HUD kit classes where
  they fit.
- **Commit per phase** H1 to H3 (§6).

---

## 1. What's there today, and why it changes

From the 12 Oct screenshot (`SB Test · seed 1`, turn 13):

| Today | Problem |
|---|---|
| One full-width bottom bar holds everything: ship stats, a long hint sentence, SEG 1 and SEG 2 mode toggles, the whole action row, SPECIAL, SHIP, Clear | The player's eyes travel from the ship (top of the map) to the bar (bottom) for every choice. Both segments and the action are visible and clickable at once, so nothing tells the player the order; the designer had to *know* that SEG 1 comes first |
| Mode toggles are text buttons, always enabled | No icons, no explanation of what a mode does without reading the handoff |
| The hint line carries AP, distance left, momentum and the drag instruction in one sentence | Unreadable at a glance; the numbers that matter *during the drag* are nowhere near the cursor |
| No Execute affordance visible in the planning HUD | The end of the loop is not discoverable |

The mechanics under it are right and stay: the drag fitter, the mode set, the AP model, targeting by clicking a
hostile. This job moves the controls to the ship and puts them in order.

---

## 2. The loop

Planning a ship is a **stepper** with enforced order. One ship at a time has a tray; the tray shows exactly one
step; finishing a step advances it.

```
select ship
  → SEG 1   pick a mode (icon), drag the path      [Drift: then set facing]
  → ACTION  pick one action icon (or None)
  → SEG 2   pick a mode, drag from seg 1's end      [or End here]
  → done    tray collapses to a review strip; selection auto-advances
            to the next unplanned player ship
→ … all ships …
→ EXECUTE
```

- **State machine** (per ship, in `A.sim`): `idle → seg1 → seg1_facing? → action → seg2 → done`. Stored with the
  plan so re-selecting a ship reopens the tray at its first incomplete step.
- **Only the current step's controls exist.** Action icons are not rendered greyed during `seg1` — they are not
  rendered at all. The breadcrumb (§3.1) is how the player sees the whole shape and goes back.
- **Drag commits on pointer-up** and advances the step. Toggling a different mode icon before dragging just re-arms
  the mode; the armed mode styles the live preview (§3.2).
- **Going back.** Clicking an earlier breadcrumb pip (or Esc) rewinds to that step. Re-dragging SEG 1 **invalidates
  SEG 2** (its start pose moved): SEG 2's pip empties and the stepper will return there. The chosen action survives
  a SEG 1 redo. Clear (kept, in the review strip) wipes the whole plan.
- **Enemy ships never get a tray.** Clicking a hostile sets the selected ship's target at any step, as today.

---

## 3. The tray

### 3.1 Anchor and chrome

- **Position:** centred under the selected ship: screen x = ship x, top = ship y + ship radius + `TRAY_GAP`
  (*placeholder* 18px). Clamped to the viewport with an 8px margin; within `TRAY_FLIP_ZONE` (*placeholder* 140px)
  of the bottom edge it flips above the ship. It follows the ship every frame (ships are stationary in PLAN, so in
  practice it follows the camera).
- **Header row:** ship name · pilot preset + level · a slim nerve bar · the target chip (crosshair glyph, target
  name, live lock %; empty reads "no target — click a hostile"). This replaces the left half of today's bottom
  caption.
- **Breadcrumb row:** three pips labelled **S1 · ACT · S2**, filled as each step commits; the active pip pulses.
  Each committed pip shows its choice in miniature (the mode glyph; the action glyph). Pips are buttons (go back).
- **Step row:** the current step's icon buttons, `TRAY_ICON` (*placeholder* 36px) square, 6px gap.
- **Hint line:** one short line under the icons, swapped per step: `seg1/seg2` → "Drag from the ship to where it
  should end up"; `seg1_facing` → "Drag the handle to set the nose"; `action` → "Pick what happens between moves".
  Designer-facing copy; plain words are fine (§0).

### 3.2 Movement steps (SEG 1 and SEG 2)

- **Icon set:** **Basic** and **Fly def** always (everyone has them, SB handoff §2), then the pilot's moveset mods
  in `ARENA_MOVESETS` order — Boost, Drift, K-Turn, Barrel for an ace; Boost and Drift for the screenshot's
  veteran; none for a green pilot. Mods the pilot lacks render greyed with a small lock glyph and a tooltip naming
  the preset that grants them (`showLockedMods` panel toggle, default **on** — this is a lab and the designer wants
  to see the full verb set; a reading, §8).
- **Arming.** One mode is always armed (default **Basic** each turn). Clicking an icon arms it; the live drag
  preview immediately takes that mode's character:
  - **Basic** — the fitted curve as in B2.
  - **Fly def** — the curve plus a weaving ghost line; the ship's fire arc overlay is suppressed for this
    segment's portion (it won't shoot); the segment renders in the defensive colour.
  - **Boost** — the envelope the fitter clamps to is the boosted one (×`BOOST_MULT` speed, ×0.25 turn cap), so the
    preview is visibly long and nearly straight.
  - **Drift** — the curve draws as normal; on pointer-up the stepper inserts the **facing sub-step**: a rotation
    handle at the segment's end (a short nose line the player drags around the end pose). The fire arc preview
    swings with the handle, because the point of Drift is where the guns point. Committing the handle advances.
    The handle stays clickable after commit (edit without redoing the path).
  - **K-Turn / Loop / Barrel** — drag as Basic; the flip or lateral displacement is drawn into the preview's end
    pose (the fitter already produces it).
- **During the drag,** a small readout rides the cursor: arc length so far vs reach (`2.9 / 5.0 SU`) and the
  momentum it implies. This is the "distance left 52% · momentum 4.9" data from today's caption, moved to where
  the player is looking. The reach ring (the mode's maximum envelope from the start pose) shows faintly while
  dragging, exactly as the armed mode allows — the Boost ring is long and thin.
- **SEG 2 extras:** the step starts from SEG 1's end pose (the preview anchors there), and the icon row gains one
  more slot: **End here** (1 AP unspent — legal, does nothing, per the SB handoff's reading). Picking it completes
  the ship.
- **AP display:** the breadcrumb's S1/S2 pips double as the AP meter (filled pip = spent point). No separate AP
  counter.

### 3.3 The action step

Same tray, same icon grammar, one choice from:

| Icon | Action | Disabled when |
|---|---|---|
| Angle fore / Angle aft | the existing `shiftF`/`shiftR` | — |
| Boost fore / Boost aft | the existing shield boost | — |
| Fix crit | clears one repairable critical | no repairable crit (tooltip says so) |
| Lock In | +35 nerve (the recovery action) | nerve already full |
| Field repair | the lead's special (the one non-stub Special) | not this ship |
| Ship ability | stub slot, `// DESIGN OPEN` | always, in v1 (greyed, tooltip "none yet") |
| **None** | no action this round | — (and it is the default) |

Clicking any icon commits it and advances; **None** is pre-highlighted so a double-click-through costs nothing.
Special and Ship render only when the ship has an entry (the stub slots from SB handoff §4 collapse out of the
tray rather than padding it).

### 3.4 When the action happens (rules amendment)

Per the designer's 12 Oct instruction, the action resolves **at the segment boundary**: during EXEC, segment 1
plays, the action fires at the tick segment 1's arc completes, then segment 2 plays. With **End here** (one
segment), the action fires at that segment's end. `docs/ARENA-SB-HANDOFF.md` §4 left the timing unspecified; this
pins it. A shield angled between segments therefore protects segment 2 only — that is the intent, and it is what
makes the step order mean something. Log as a decision (§8).

### 3.5 Tooltips

- Hover (or keyboard focus) for `TIP_DELAY` (*placeholder* 250ms) opens a small card above the icon: **name**, one
  plain line, and the live numbers read through the constants' getters — so the card never lies when a slider
  moves. Copy for the movement modes (designer-facing, fine as written):
  - **Basic** — "Fly the drawn line."
  - **Fly def** — "No firing this segment. Incoming fire ×0.25; homing weapons ignore it." (×1 "cannot be hit"
    when the `flydefImmunity` toggle is on — the card reads the toggle.)
  - **Boost** — "×2 speed, nearly straight."
  - **Drift** — "Nose comes off the path: drag the line, then set the facing. Guns fire along the nose."
  - **K-Turn** — "Run forward, flip 180 at the end. Speed capped at 3."
  - **Barrel Roll** — "Slide 1 SU sideways, heading kept."
  - **Lock glyph suffix** — "Needs: veteran" / "Needs: ace".
- Action cards use the SB handoff §4 lines; disabled icons' cards lead with the reason.

### 3.6 Keyboard

`1–9` press the visible icons in order · `Esc` back one step · `Tab` / `Shift-Tab` next/previous player ship ·
`Enter` Execute. The whole loop must be playable mouse-only and (bar the drag itself) keyboard-first — E3's
planning-time question needs fast hands.

---

## 4. Turn chrome

- **Ship chips.** A row of chips, bottom-centre, one per player ship: name + three mini-pips (S1·A·S2) mirroring
  the breadcrumb. Click selects. The selected chip is highlighted; a fully planned chip ticks. This is the only
  always-on planning UI besides the Execute button — the old bottom bar's control surface is **removed** (the bar
  itself survives as a one-line status ribbon: scenario, turn, objective, which already live in the top-left strap;
  fold them together and keep one).
- **Auto-advance.** Completing a ship selects the next unplanned player ship and opens its tray at SEG 1. After the
  last one, the Execute button takes focus.
- **Execute.** Bottom-right, big, always enabled once a scenario is loaded: label **Execute (n/m planned)**.
  Unplanned ships fly their standing order, exactly as the Arena handoff's planning-clock rule already states — the
  button never blocks on a lazy wingman. `Enter` triggers it; no confirm (restart-same-seed exists). During EXEC
  the button becomes the pause/resume affordance it already is in the chassis.
- **Review strip.** A done ship's tray collapses to one slim strip: the three committed glyphs + **Clear**.
  Clicking a glyph reopens that step (with §2's invalidation rule).

---

## 5. Icons

Designer-tool art: single-colour glyphs drawn as inline SVG in the tray (no new art pipeline, no `SR_ART` rows).
One path each, currentColor, so the kit's states (armed / greyed / locked) are CSS. The approved glyph drawings are
on the *SB Planning HUD* canvas (Icon set board).

| Key | Glyph |
|---|---|
| basic | straight arrow |
| flydef | arrow weaving through two S-curves |
| boost | triple chevron |
| drift | curved arrow with a detached nose tick pointing inward |
| kturn | arrow doubling back on itself |
| barrel | two parallel arrows with a lateral jog |
| end_here | square stop block |
| angle_f / angle_a | shield arc, fore/aft filled |
| boost_f / boost_a | shield arc + plus |
| fixcrit | wrench |
| lockin | steadying crosshair |
| special / ship | star / hull outline |
| none | slashed circle |
| locked suffix | small padlock badge |

---

## 6. Build phases

| Phase | Build | Playable proof at the end |
|---|---|---|
| **H1** | Tray chassis: anchor + flip, header, breadcrumb, stepper state machine; SEG 1/SEG 2 steps with mode arming, per-mode previews, drag readout, End here; review strip, Clear; old bottom-bar controls removed; Execute button | Plan full two-segment turns for three ships entirely at the ship; the bottom bar is a status ribbon only |
| **H2** | The action step (§3.3) with disabled logic and the boundary-timing resolution (§3.4); tooltips (§3.5); the Drift facing sub-step polished | The whole SEG 1 → ACTION → SEG 2 loop runs with hover cards; an angled shield demonstrably protects segment 2 only |
| **H3** | Ship chips, auto-advance, keyboard (§3.6), locked-mod display + `showLockedMods` toggle, metrics: per-step planning ms added to each exec's `ARENA_METRICS` record | `e1_fox` planned keyboard-and-drag only; `sb3_count` at 8 ships flows ship-to-ship with no chip clicks |

---

## 7. Tests

Extend the SB section of `tools/arena-smoke.js`:

1. **Anchoring.** The tray's box sits within `TRAY_GAP`+tolerance below the selected ship; a ship dragged (via
   `DBGarena`) into the bottom `TRAY_FLIP_ZONE` flips the tray above; the tray never leaves the viewport.
2. **Order is enforced.** At `seg1`, no action icon exists in the DOM; at `action`, no mode icon does. A ship
   cannot reach `done` without S1 committed.
3. **Arming styles the fit.** The same drag gesture under Boost produces a longer, straighter committed segment
   than under Basic; under Fly def the plan carries the no-fire flag; a green pilot's tray offers exactly Basic and
   Fly def, an ace's offers six, and with `showLockedMods` off the locked ones are absent rather than greyed.
4. **Drift sub-step.** After a Drift drag, the facing handle exists; committing it stores a nose heading differing
   from the path tangent; the stored plan fires along the nose in EXEC (reuses B4's Drift acceptance test).
5. **Boundary timing.** Plan Angle fore as the action with shields known aft-heavy: assert `segs` change at the
   tick segment 1 completes, not at exec start; with End here, at segment end.
6. **Invalidation.** Redo S1 → S2's pip empties and its stored segment is gone; the action survives; Clear empties
   all three.
7. **Execute.** With one of two ships unplanned, Execute runs and the unplanned ship flies its standing order; the
   label read "Execute (1/2 planned)".
8. **Tooltips read live constants.** Change `BOOST_MULT` through its getter; the Boost card's number follows.
9. **Keyboard parity.** The §3.6 keys produce the same committed plan as the mouse path (bar the drag).
10. **Metrics.** Each exec record carries per-step planning ms, keyed `s1/act/s2`.

v2's entire existing test section, and all pre-existing `tools/*-smoke.js`, pass unchanged.

---

## 8. DESIGN_BLOCKERS entries to add

- **New: "SB planning HUD: decisions".** Record, 12 Oct:
  1. Planning is a **per-ship enforced stepper**: SEG 1 → one action → SEG 2, controls in a tray anchored to the
     ship; only the current step's controls render.
  2. **The action resolves at the segment boundary** (amends `docs/ARENA-SB-HANDOFF.md` §4's unspecified timing).
  3. **The bottom bar loses its controls** and becomes a status ribbon; one tray at a time; enemy ships never show
     one.
  4. **End here** is a first-class SEG 2 choice (unspent AP still does nothing).
  5. **Execute never blocks**: unplanned ships fly their standing order.
- **New: "SB planning HUD: readings to confirm".** Each with the interim choice:
  - **Locked mods are shown greyed** (`showLockedMods` default on) rather than hidden — right for the lab; what
    the shipping game does is open.
  - **The armed mode defaults to Basic every turn**; remembering last turn's mode per ship is off in v1.
  - **No confirm on Execute** with ships unplanned.
  - **Tooltip copy above is designer-facing**; any line of it that ships goes back through `[TEXT NEEDED]` and the
    normal text flow.
- **New: "SB planning HUD: placeholders".** `TRAY_GAP` 18px, `TRAY_ICON` 36px, `TRAY_FLIP_ZONE` 140px, `TIP_DELAY`
  250ms — each a named, getter-exposed constant on the SB panel group.

---

## 9. Done means

- [ ] H1–H3 built. From `#arena` → SB Test → `e1_fox`: select the Fox, and the tray walks SEG 1 (mode + drag,
      Drift facing included) → action → SEG 2 (or End here); chips and auto-advance carry it across ships;
      Execute runs the turn.
- [ ] The action demonstrably fires between the segments.
- [ ] Every icon explains itself on hover with live numbers; locked mods name their preset.
- [ ] The old bottom-bar controls are gone; v2's planning UI and every pre-existing smoke test are untouched.
- [ ] `docs/ARENA-SB-HANDOFF.md` §4 carries the amendment note.
- [ ] The §8 blockers are added. All smoke tests pass, the new §7 cases included.
