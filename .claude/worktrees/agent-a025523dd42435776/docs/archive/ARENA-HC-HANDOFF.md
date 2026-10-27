# Arena Type 3 — High Command: handoff

**For:** Claude Code (Opus 5.5) in `DoofWiz/star-rebellion`, on the **`space-combat-testing`** branch.
**Save as** `docs/ARENA-HC-HANDOFF.md`.
**Read first, in order:** `docs/ARENA-HANDOFF.md` (the Arena chassis — its §0 ground rules apply verbatim here),
then `docs/ARENA-SB-HANDOFF.md` §1 (how a second ruleset sits behind the picker; Type 3 is the third).
**Design sources:** the designer's *Space Combat V2* doc, §"Type 3: High Command" (the mechanics and the full
option lists), and the approved design canvas **High Command HUD** (Claude Design, 12 Oct) — the full screen
paused mid-order, the wing command tray, the pilot status panel, and the commands drawer + mission rules, all
already styled in `sr-theme.css` "Chunky Ops" tokens. The canvas is a living document the designer edits; where
this file and the canvas disagree on layout or copy, the canvas wins.

**The pitch, in the designer's terms.** The player does not fly ships. They are Mission Control: ships are
autonomous, grouped into **wings**, and the player issues broad orders ("Attack", "Defend"), sets per-wing
tactics, standing mission rules, and spends scarce **command points** on interventions — then watches it unfold
in real time, with pause and time controls. The decisions are mission-command decisions; the pilots (with their
abilities, experience and personalities) decide how to fulfil them.

**What this file owns.** The third Arena ruleset end to end: the autonomous sim (`sim-hc.js`), its HUD
(`arena-hc.js`), the wing/order/tactic/rule/command data, its scenarios, metrics and tests. It does not touch
v2, SB, or the campaign.

---

## 0. Ground rules

Everything in `docs/ARENA-HANDOFF.md` §0, verbatim: blockers in the same commit, no `G` changes, no campaign
saves touched, designer-facing text is fine in plain words but nothing ships without the text flow, placeholders
as getter-exposed named constants on the designer panel, **copy-don't-refactor** (lift from `sim-sb.js` /
`sim2.js` by copying; never restructure a live file to share code), and every `tools/*-smoke.js` passes before
each commit. Additions:

- **v2 and SB are untouched byte-for-byte.** Type 3 is additive: new files `game/js/sim-hc.js` and
  `game/js/arena-hc.js`, a `RULESETS.hc` entry and the same three dispatch lines `arena.js` already has for SB
  (`frame` → `window.SR_ARENA_HC.frame(now)` when active, `close()` on scenario close, `open()` from
  `chooseRuleset('hc')`). Every pre-existing smoke test passes unchanged.
- **The HUD is HTML on the game's own kit.** The mockups are built from `sr-theme.css` tokens — use the real
  classes (`sr-` panels, buttons, the colour variables) rather than re-declaring hexes. House colour law applies
  everywhere: gold = you can act on this (one gold primary per screen), rebel red = yours, Hegemony blue =
  theirs, hazard orange = danger, shield cyan = info, steel = quiet friendlies (Convoy Lark).
- **Commit per phase** T1–T4 (§5).

---

## 1. The seams (what exists to build on)

- `game/js/arena.js` — `RULESETS` map + picker (`chooseRuleset`), scenario registry with per-scenario
  `rulesets:[…]` allowlist, the `A` state object, `ARENA_METRICS`, the designer panel, `DBGarena`.
- `game/js/arena-sb.js` + `sim-sb.js` — the SB module pattern to imitate (`window.SR_ARENA_SB`: `open`,
  `close`, `frame`, `dbg`), and the flight model to **copy from**: continuous curved flight, banking,
  simulated projectiles, lock dial, the chase camera and smooth motion from the SB feel passes.
- `game/js/sim2.js` — doctrine AI shapes (§3.5 of the Arena handoff): target scoring, personality weights.
  Copy the scoring approach, not the file.
- Pilot presets/movesets (`ARENA_MOVESETS`, pilot levels) — pilots keep their abilities from the base game;
  in Type 3 the AI decides when to use them, gated by the player's doctrine setting (§3.4).

**Ruleset entry** (mirror the two existing ones):

```js
hc:{key:'hc',name:'Type 3: High Command',desc:'Mission Control: autonomous wings fly themselves in real '+
  'time; you issue orders, set tactics and standing rules, and spend command points. Pause is free '+
  '(docs/ARENA-HC-HANDOFF.md).'},
```

---

## 2. The sim (`sim-hc.js`)

### 2.1 Real time, seeded, pausable

- One fixed-step integrator (copy SB's), advanced by a **timescale**: `0` (pause) / `0.3` (slow) / `1` /
  `3` (fast-forward). Rendering interpolates; the step count at a given timescale is deterministic for a seed,
  so a seeded run with the same orders at the same sim-ticks replays identically (test §8.6).
- No PLAN/EXEC phases. Orders can be issued at any timescale; pause is free and unlimited (the doc's
  "pause-and-issue-orders preserves the spectacle without forcing every decision at once").
- **Reinforcement clock**: every scenario carries `reinforce:{secs,force}`. At zero, a dangerous Hegemony
  force spawns at a map edge and the objective text flips to "get out". This is the SR-unique pressure — it is
  always on in Type 3 scenarios.

### 2.2 Wings

- Player ships arrive grouped into **wings of 2–5** (`scenario.player` gains `wing:'dagger'` tags; a wing has
  a name, a colour-order in the roster, and a **leader** — highest level unless the scenario names one).
- A wing shares: one **order**, one **tactic**, its mission-rule scope. Ships keep individual state (hull,
  shields, morale, abilities, target).
- Losing the leader degrades the wing: cohesion penalty to tactic effectiveness (placeholder `LEAD_LOSS` 0.5×)
  until a new leader is promoted (next highest level, after `PROMOTE_SECS` 8s).

### 2.3 Autonomy: how a ship decides

Per ship, each think tick (`THINK_SECS` 0.5s), score candidate behaviours and take the best:

1. **Mission rules** (§4.3) are standing interrupts — a triggered rule outranks the current order.
2. **The wing order** (§4.1) supplies the goal: what to engage, protect, reach or avoid.
3. **The wing tactic** (§4.2) weights the how: formation keeping, engagement range, disengage thresholds.
4. **Doctrine + personality**: ability use per the player's 3-way doctrine toggle (AUTO / EMERG / MANUAL),
   coloured by pilot personality weights copied from sim2's doctrine AI (an *eager* pilot over-commits, a
   *steady* one holds formation).
5. Flight itself is SB's model: the AI picks a destination + manoeuvre (including the pilot's moveset mods)
   and the fitter produces the curve; weapons fire per SB's projectile sim when a target crosses the arc.

Pilot voice: each ship keeps a one-line **assessment** string (template bank per state — pinned, winning,
withdrawing…), surfaced in the pilot panel and event feed. `[TEXT NEEDED]` rows; placeholder lines fine.

### 2.4 Morale and emergencies

- Nerve becomes **morale** here (same stat, new words): STEADY → EAGER / SHAKEN → PANICKED
  (thresholds placeholders). SHAKEN pilots disobey marginal orders sooner; PANICKED ones may flee or freeze —
  that is a **pilot emergency**, pushed to the event feed with the player's response options (§3.4): override
  (CP), send support, or let them ride it out.

---

## 3. The HUD (`arena-hc.js`) — build what the canvas shows

The **High Command HUD** canvas is the spec; its four boards map to:

### 3.1 The screen (Main board)

- **Top-left: objectives panel** with **Mission Rules nested under it** — active rules as cyan scope chips
  (`PRESERVATION 30% · ALL`), a `+ RULE` button opening the rule list (§4.3).
- **Top-centre: the reinforcement timer** (Bungee, hazard orange) — the loudest status on screen — with the
  phase banner under it (`PAUSED — ISSUING ORDERS`, gold, only while paused).
- **Top-right: command points** (gold diamond pips, spent = hollow) + the gold **COMMANDS** button (§3.3's
  drawer). This is the screen's one standing gold primary.
- **Left rail: event feed** — kills, pilot emergencies (hazard), objective progress; every entry has a cyan
  **VIEW** button that jumps the camera there (event focus). `Tab` steps through unviewed events.
- **Bottom: the wing roster** — per wing: name (Bungee, rebel red; selected wing ringed gold), order chip
  (gold outline) + tactic chip (cyan outline), then one **camera tile** per ship: a small live canvas camera
  tracking that ship (the designer's "pilot status readout"), hull/shield bars, the ship's current order as a
  corner glyph, morale word. Hazard-ringed when critical. Click a tile → pilot panel (§3.2); click a wing
  header → wing tray (§3.4... see below).
  - **Perf reading:** render tiles from the main sim at ~10fps into small canvases, round-robin one tile per
    frame. If that still hurts at 8+ ships, degrade to static ship glyphs + bars and log it as a blocker.
- **Bottom-right: time controls** — pause / slow / play / fast, divider, event focus / follow ship. Active
  speed is the gold-lit button. `Space` toggles pause.
- **The map**: friendly ships rebel red with **intent lines** (dashed red — where the AI currently plans to
  go; these are read-only, the player never draws paths), enemies Hegemony blue with their visible intent
  faint, the wing's engagement ring, and the current attack designation as a gold dashed ring + Bungee label
  on the target.

### 3.2 The pilot panel (PilotPanel board)

Opens over the left rail from a tile or VIEW. Exactly as drawn: tracking camera strip, name/preset/wing +
morale chip, hull/armour/shield bars, the **order · target · assessment** line (the pilot's own words),
abilities each with the **AUTO / EMERG / MANUAL doctrine segment**, and the response row — the relevant
CP interventions for this pilot's state (gold primary = the recommended one) plus the free option (send a
wingmate). Border hazard-tinted while the pilot is in an emergency.

### 3.3 The commands drawer (Commands board)

Opens from COMMANDS. CP meter in the header (`3 / 5 CP`). Rows exactly per the canvas, costs as placeholders:
Patriot Override 1 · Emergency Recall 2 · Reinforcement Request (disabled unless the scenario grants reserves)
· Emergency Support 1 · Recon Sweep 1 · Comm Scramble 2 · Comm Hack 3 · Decoy Signal 1 · **Abort Mission,
free, pinned last, hazard orange**. Target-first or command-first both work: pick a command then click its
target, or right-click a ship/wing for the same list filtered to what applies. v1 implements Override, Recall,
Emergency Support (shield boost only), Recon Sweep, Decoy and Abort; the rest render disabled with
`// DESIGN OPEN` tooltips (blocker entry, §9). Targeting Distortion, Dead Zone, Target Designation Support and
the environmental orders from the doc are **v2 stubs** — list them in the blocker, don't render them yet.

### 3.4 The wing command tray (WingOrders board)

Click a wing (map or roster) → the tray, anchored panel-left (not ship-anchored — wings move). Per the canvas:
wing name + leader line; **ORDER** row of nine icon buttons (Attack, Defend, Intercept, Escort, Withdraw,
Regroup, Hold, Capture, Board — Board disabled without marines); when a targeted order is armed, the
**TARGET** chip row (objective / ship classes present / stations) or click the map; **WING TACTIC** row of six
(Tight, Spread, Screen, Pincer, Hit & Run, Defensive). Armed order = gold ring; set tactic = cyan ring; both
persist until changed. Hover cards on every icon (same tooltip pattern as the SB tray: name + one plain line,
live numbers through getters). The Attack card's approved copy: *"Engage a designated target: click the
objective, a ship class, or a station. Ships will attempt to attack and destroy the target."*

### 3.5 Keyboard

`Space` pause · `1–4` speeds · `Tab` next event · `F` follow selection · `Q/E` cycle wings · order/tactic icons
number-keyed while the tray is open · `Esc` closes tray/panel/drawer.

---

## 4. The data (from the designer's doc, verbatim lists)

### 4.1 Orders (per wing)
Attack (objective | ship type | stations) · Defend (ally, installation or area) · Intercept (pursue a
particular target) · Escort (stay with and protect) · Withdraw (disengage toward extraction) · Regroup (rally
and reform) · Hold Position (defensive area or orbit) · Capture (interface with hackable/capturable
objectives) · Board (marine-carrying ships land on stations/platforms).

### 4.2 Wing tactics
Tight Formation · Spread Out · Screen · Pincer · Hit and Run · Defensive. Each is a weight set on §2.3's
scoring (placeholder table `HC_TACTICS`, panel-tunable).

### 4.3 Mission rules
No Rules (default) · Preservation Order (hull < 30% → withdraw) · Guardian Directive (friendly objective
attacked → intercept the attacker) · Formation Discipline (target escapes → return to formation) · Bring It
Down Tasking (flagship disabled → focus fire) · Saviour Protocol (named friendly critical → attempt rescue).
Set in the mission briefing, rescindable mid-mission, scoped ALL or per wing. In the Arena (no briefing
screen yet) they start from the scenario's `rules:[…]` and are edited live via `+ RULE`.

### 4.4 Command points
Scenario-set pool (placeholder `HC_CP` 5), rarely regained via objectives (`cpReward` on objective entries).
Commands and costs: §3.3.

---

## 5. Build phases

| Phase | Build | Playable proof at the end |
|---|---|---|
| **T1** | `sim-hc.js`: SB flight copied, timescales + pause, wings, Attack/Escort/Withdraw autonomy, reinforcement clock; `arena-hc.js`: map, time controls, roster with static tiles, wing tray with those three orders; `RULESETS.hc` + dispatch | `hc1_nightfall`: order Dagger onto the relay while Amber escorts the convoy, pause freely, reinforcements arrive on the clock |
| **T2** | All nine orders + six tactics + targeting chips; mission rules engine + top-left panel; morale, assessments, event feed with VIEW/event focus; live camera tiles | Preservation Order visibly pulls a mauled ship out; the feed narrates the battle and every entry jumps the camera |
| **T3** | Pilot panel with doctrine toggles and emergency responses; commands drawer with the v1 six; CP economy + objective rewards | Wren's pin plays out: alert → panel → Override/Recall/send-support each produce a different outcome |
| **T4** | Leaders + promotion, keyboard map, metrics (§7), scenario variants, panel constants group `HC` | All §8 tests green; a full `hc3` brawl is playable hands-on-keyboard at speed 3 |

---

## 6. Scenarios (registry entries, `rulesets:['hc']`)

- `hc1_nightfall` — the canvas's mission: Dagger (3) + Amber (2), Convoy Lark to the jump point, destroy Relay
  K-7, optional satellite capture, reinforcements 4:00. The acceptance scenario.
- `hc2_lastlight` — Defend: one station, two wings, waves until the timer; tests Defend/Hold/rules.
- `hc3_meltdown` — 2 wings of 4 vs a flagship group; Bring It Down, boarding, Abort as the honourable out.
  Variants: CP 3 / CP 7 (does the command economy carry the drama?).

## 7. Metrics

Per engagement into `ARENA_METRICS`: orders issued (count, by type), CP spent (by command), pauses + paused
seconds vs real seconds, rule triggers, pilot emergencies + chosen responses, outcome + ships lost, time to
first order after an alert. The designer's question is "does mission command feel like gameplay?" — the
numbers that answer it are order rate and pause rate.

## 8. Tests (new section in `tools/arena-smoke.js`)

1. Ruleset isolation: picking `hc` runs it; v2 and SB sections pass unchanged.
2. Order persistence: Attack set, 30s at speed 3 — the wing still prosecutes the target class without input.
3. Tactic effect: same seed, Tight vs Spread — measurably different ship dispersion.
4. Mission rule: Preservation at 30% flips a damaged ship to Withdraw within one think tick.
5. Commands: Override redirects despite a better local target; Recall disengages; CP decrements; Abort ends
   the mission; disabled Reinforcement Request stays disabled without reserves.
6. Determinism: same seed + same orders at same ticks, with pauses inserted → identical outcome hash.
7. Reinforcement clock: force spawns at zero; objective text flips.
8. Doctrine: MANUAL never auto-fires an ability; EMERG fires only under its trigger.
9. Leader loss: cohesion penalty applies, promotion after `PROMOTE_SECS`.
10. Metrics record carries every §7 field.

## 9. DESIGN_BLOCKERS entries to add

- **"HC: decisions"** — third ruleset is additive behind the picker; real time with free pause, no phases;
  wings from mission start with shared order+tactic; intent lines are read-only; reinforcement clock always on;
  Abort always free; canvas = living HUD spec.
- **"HC: readings to confirm"** — v1 command subset (§3.3) and the v2 stub list (Targeting Distortion, Dead
  Zone, Target Designation Support, Comm Hack, environmental orders, carrier ops); morale word ladder; camera
  tiles' perf fallback; squad leaders chosen by level pending the meta-layer Wing Leader assignment; nerve
  rebadged as morale.
- **"HC: placeholders"** — `HC_CP` 5, `THINK_SECS` 0.5, `LEAD_LOSS` 0.5, `PROMOTE_SECS` 8, timescales
  (0/0.3/1/3), rule thresholds, `HC_TACTICS` weight table — all getter-exposed on an `HC` panel group.

## 10. Done means

- [ ] T1–T4 built; `#arena` → Type 3: High Command → `hc1_nightfall` plays the canvas's scene end to end.
- [ ] The player never draws a path and never needs to unpause to think.
- [ ] Every icon and command explains itself on hover; the HUD is pure `sr-theme` kit, colour law respected.
- [ ] v2 and SB byte-identical; all smoke tests pass including §8.
- [ ] Blockers §9 added in the same commits.
