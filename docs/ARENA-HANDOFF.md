# Arena mode and the space combat v2 sim: handoff

**For:** Claude Code in `DoofWiz/star-rebellion`.
**Save as** `docs/ARENA-HANDOFF.md`.
**Design source:** *Star Rebellion — Space Combat Core Redesign v0.1* (Claude Doc, 9 October 2026). Read it first:
it holds the fantasy statement, the three resolution decisions, and the five experiments this build exists to run.
Line references below are against `main` at `cbfacc8`.

**This is an experiment, not a spec.** The Arena is a lab for a new space combat model: one planning step, then both
sides execute **simultaneously and continuously**; drawn paths instead of the dial; player-only **interrupts** priced
in nerve; doctrine-bound enemy AI. Experiment E1 (§7) is the prove-or-kill gate for the whole direction, so build
toward E1 being playable as fast as honesty allows, and keep everything tunable: the designer will live in the
sliders, not the code. The campaign's existing space combat keeps working untouched throughout.

---

## 0. Ground rules

- **Branch** from `main`.
- **Follow `CLAUDE.md`.**
  - Log every decision and reading below in `docs/DESIGN_BLOCKERS.md` (§9), same commit, next free ids.
  - **No `G` changes are expected** (§2.4): the Arena never touches the campaign save. If one ever becomes
    necessary, it needs a `MIGRATIONS` entry — and a blocker entry explaining why the Arena needed it.
  - Run every `tools/*-smoke.js` before each commit.
- **Text.** The Arena is a designer tool, not player-facing: its UI labels (panel captions, scenario names, button
  text) may be written plainly and are **not** registered with `tools/text/text.py`. But any line destined for the
  shipping game (a tutorial card, a pilot bark, an objective line) is `[TEXT NEEDED: …]` as usual and listed in the
  blocker. Nothing built in the Arena ships to players without going back through the normal text flow.
- **Numbers marked *placeholder*** get one named constant with a `// placeholder` comment, exposed to tests through a
  getter (the `SALVAGE_PER_HP_:()=>SALVAGE_PER_HP` pattern, `base.js` ~2306), and a line in the blocker. There will
  be a lot of them: that is the point of a lab.
- **Copy, don't refactor.** The v2 sim reuses `space.js` math by **copying** the pure functions it needs into the new
  module with a header comment naming the source (file + approx line). Do not extract shared modules from `space.js`
  or `ground.js` and do not change their behaviour: every existing smoke test must pass byte-for-byte untouched. If
  the v2 sim graduates, extraction is a later, separate job (logged as a reading, §9).
- **`game/data/db.js` is generated** from `db.json` by `tools/db/build.py`; never hand-edit it. The Arena reads the
  same ship/weapon/pilot rows the game does and adds no rows of its own in v1.
- **The legacy prototypes** at the repo root (`space-combat.html`, `ground-combat.html`, `base.html`,
  `space-combat-gdd.html`) stay untouched, per the README.
- **Commit per phase** A1 to A5 (§4), in order. At the end of each phase the Arena boots clean and every smoke test
  passes.

---

## 1. What's there today: the reuse surface

The survey below is why this job is smaller than it looks. The game already runs a real-time rAF loop with tweened,
parametric movement; the turn structure is the only thing that is discrete.

| What | Where | Arena use |
|---|---|---|
| Boot | `core.js` `SR.boot()` ~181 **always** calls `go('base',{boot:true})`; base `enter()` ~9929 loads-or-creates a campaign and `saveSnap()`s it | Must be bypassed: §2.1 |
| Title screen | `intro.js` `SR_INTRO.show()` ~302; one button `#splashStart` ~307 | Second button goes here |
| Campaign-free missions | Training Hall "Simulator" sets `SR.mission={kind:'space',sim:true,…}` (`base.js` ~9631); `buildResult` returns `{sim:true,win}` (`space.js` ~1153); `applyDebrief` only logs news | The precedent: missions can already run without campaign consequences. The Arena goes one further and never enters the base at all |
| rAF loop | `core.js` `frame()` ~176 calls the active scene's `frame(now)` every frame | Reused as is; the Arena registers a scene |
| Movement | `manPath(x0,y0,h0,man)` (`space.js` ~393) returns a parametric `t→{x,y,h}` arc per manoeuvre; `simMan()` ~412 predicts end poses; `TURNS` ~25; `clampEnd()` ~405 | **Load-bearing.** The continuous sim samples these per tick instead of tweening once |
| The dial | `SRDB.dial(row)` (`data.js`) builds each ship's manoeuvre list from `straight/bank/turn min/max` in `db.js`; `CLS[key].dial()` (`space.js` ~40); `dialAvail(s)` ~144 applies crits/clamps | Becomes the **envelope backend** for drawn paths: §3.2 |
| Arcs, range, LOS | `bearing`, `inArc` (`ARCH=0.55`), `inFrontHemi`, `band(d)`, `losBlocked`, `validShot` (`space.js` ~374–392, ~559) | Copied into the v2 sim, checked per tick |
| Locks | `doAction` `lock` ~665 stacks to level 3; `checkLocks()` ~413 breaks on rear hemisphere | Becomes continuous acquisition: §3.3 |
| Shields/damage/crits | `segs.F/R`, `applyDamage()` ~508, `CRITDEFS` ~49, `applyCritical()` ~534 | Copied as is |
| Hit maths | d20: `computeTN` ~468, `computeATK` ~486, `needFor`, `critChance()` ~998 | Copied as is; resolved at the instant a shot fires |
| Nerve | 0–100 cool meter: `coolState()` ~158, `adjCool()` ~163; gains/losses incl. **Lock in +35** ~685; panic blocks Lock, panicked `flees` ships run | Already the right substrate. Interrupts make it **spendable**: §3.4 |
| Pilot stats | `SR_DB.pilots` (`level, initiative, aim, cunning, focus, presence`, 0–50); `mkPilot()`/`dbPilot()` (`space.js` ~102–116); `DEPLOY` ~183, `LINEUPS` ~217, `Enemies.space()` | Scenario casts come from here |
| Enemy AI | `aiManeuver()` ~601 scores dial moves; `aiAction()` ~633 priority list | Replaced by doctrine modules for Arena enemies: §3.5 |
| Rendering | Canvas 2D: `render()` ~1828, `drawShip`, `drawArcFor`, `drawPlanPath` ~1560, `drawLockLines` ~1601, minimap ~1794; `SR_ART` for ships/particles | Draw code patterns reused; the Arena has its own canvas |
| Debug | `#test` hash exposes `window.DBGspace` ~2908 (incl. `fn.setRng` for seeded RNG); `dbgSkip` menu items | `DBGarena` follows the same pattern |
| Save | `SAVE_KEY='star-rebellion-campaign-v1'` (`core.js` ~139) | The Arena must never write it: §2.4 |
| Tests | Playwright Chromium, no shared helper; pattern: `file://…/game/index.html#test` → `addInitScript` seeds RNG → drive via `DBG*` → collect errors (`tools/space-smoke.js`) | `tools/arena-smoke.js` copies the pattern with `#arena` |

---

## 2. Arena mode (new file `game/js/arena.js`)

### 2.1 Getting in

1. **A second title button.** `intro.js` gains `#splashArena` ("Enter Arena") beside `#splashStart`, styled as a tool
   (reuse the debug styling idea from `.sr-menu__item--debug`, `sr-theme.css` ~171, adapted for the splash). Visible
   always for now — the whole build is internal. Log its visibility as a reading (§9).
2. **A direct hash.** `#arena` boots straight into the Arena the way `#test` skips the title, and also turns on
   everything `#test` turns on (no transitions, `DBG*` exposure, fast juice), since the Arena is always a test
   environment.
3. **`SR.bootArena()`** in `core.js`: the rAF/scene setup from `boot()` **without** `go('base')` — it goes straight
   to `go('arena', …)`. The inline boot script in `game/index.html` routes `#arena` here, and `#splashArena`'s
   callback calls it.
4. **Getting out.** A "Back to title" item in the Arena menu clears the hash and reloads. Crude is fine for a lab.

### 2.2 The scene

- `game/index.html` gains `#sc-arena` beside the other three scene containers: its own canvas, a scenario-picker
  overlay, and the designer panel (§5). Script tag added to the load order after `space.js`.
- `arena.js` registers with `SR.register('arena',{enter,exit,frame})`, exactly as the other scenes do.
- Entering the Arena shows the **scenario picker**: the scenario list (§6), each with a one-line description, plus
  the global sliders' current values. Picking one builds the sim (§3) and starts at the first PLAN.

### 2.3 Scenario loader

Scenarios are data, in `game/js/arena.js` (or `arena-scenarios.js` if the file gets long):

```js
const ARENA_SCENARIOS=[
 {id:'e1_fox', title:'E1: The hunted fox', desc:'1 v 2 pursuit. The prove-or-kill scenario.',
  rocks:'belt1',                                   // a named rock layout
  player:[{cls:'talon', pilot:{level:3, preset:'veteran'}}],
  enemies:[{type:'heg_fighter', doctrine:'pursuit', n:2}],
  objective:{kind:'survive', secs:60},             // or {kind:'destroy', targets:[…]} | {kind:'exit', edge:'E'}
  tune:{}                                          // per-scenario slider overrides
 },
 // …
];
```

- Ships and pilots resolve through the existing `CLS`/`SR_DB.pilots`/`Enemies.space` data; `preset` picks a stat
  template (green / regular / veteran / ace) so experiments can vary pilot quality without hand-rolling rows.
- Objectives v1: **destroy** (named targets), **survive** (T seconds of exec time), **exit** (reach a map edge).
  That covers all five experiments.
- Adding a scenario means adding an entry here only. Prove it in the smoke test (§8), the way the prologue test
  proves beats are data.

### 2.4 The no-save guarantee

- The Arena never calls `newGame()`, `saveSnap()`, `persist()` or `SR.endMission()`; a finished scenario returns to
  the picker, not the base.
- All Arena state lives in one module object (`A`), rebuilt per scenario. Nothing reads or writes `G`.
- `prologue.js` needs no changes: `Pro` is never loaded with state in an Arena boot, and every `Pro` read is already
  null-safe (confirmed on `main`).
- The smoke test asserts that after a full Arena session, `localStorage` has no `star-rebellion-campaign-v1` key
  (boot with cleared storage). If the Arena wants to remember slider values between reloads, it may use its own key
  `sr-arena-prefs` — never the campaign key.

---

## 3. The v2 sim (new file `game/js/sim2.js`)

One module, its state in one object (`A.sim`), exposed as `window.DBGarena` under `#arena`/`#test` with the same
shape philosophy as `DBGspace` (state + `fn:{…}`). The campaign's `space.js` is not loaded into it, not patched by
it, and not shared with it: needed functions are **copied** (§0).

### 3.1 The loop

- **Fixed-tick simulation.** `TICK=50`ms of sim time (*placeholder*), advanced from the scene's `frame()` with an
  accumulator, so wall-clock speed is a multiplier (`SIM_SPEED`, panel slider, 0.25×–2×) and the sim is
  deterministic for a given seed and order set.
- **Two phases only:** `PLAN` (paused; orders) → `EXEC` (everything moves and fights simultaneously for `EXEC_LEN`
  seconds of sim time, *placeholder* 6, panel slider 2–10) → pause → `PLAN`. No action phase, no attack phase, no
  initiative ordering anywhere.
- **End-of-exec housekeeping** (the `endRound()` analogue): cool +`CALM_GAIN` (*placeholder* 6) to ships not hit this
  exec, lock decay checks, objective check, fled ships leave.
- **Planning clock:** off by default; the panel can set a countdown (for experiment E2). When it expires, unplanned
  ships fly their standing order.
- **Seeded RNG** via the `setRng` pattern from `DBGspace`, set per scenario start; "Restart (same seed)" replays the
  identical fight if the player gives identical orders.

### 3.2 Movement: paths fitted to the dial

The design doc's rule — *the dial becomes the backend* — is implemented literally, and it is the load-bearing trick
of the whole build:

- **A path is a chain of 1–`PATH_SEGS` manoeuvre segments** (*placeholder* 3) from the ship's own dial
  (`dialAvail`-filtered, so crits and clamps still bite).
- **The player drags; the fitter snaps.** As the player drags from a ship, a greedy fitter picks, at each segment
  boundary, the dial manoeuvre whose `simMan` end pose best approaches the drag line (score: distance to the drag
  path + heading alignment; *placeholder* weights `FIT_W_POS`, `FIT_W_HDG`). The fitted path renders live during the
  drag (reuse the `drawPlanPath` approach), so what the player sees is always flyable: a Talon bends tight, the
  Dustfall draws long lazy arcs, and an illegal hairpin visibly refuses to happen. No separate legality check is
  ever needed — illegal paths are unrepresentable.
- **Execution** samples the chained `manPath(t)` arcs per tick. Heading, and therefore arcs, sweep continuously.
  `clampEnd` keeps ships on the map per segment, as today.
- **Standing orders** — `pursue(target)`, `escort(ally)`, `followOffset(leader,dx,dy)`, `hold` — are the same fitter
  aimed by a goal function instead of a drag. A ship with a standing order auto-plans every turn until the player
  overrides it. This is one code path for three customers: lazy player ships, rev-3 squadron wingmen later, and
  **enemy doctrine** (§3.5), which keeps everyone honest about the envelope.
- **K-turns** stay dial manoeuvres (pilots with `'loop'`), so the fitter can produce them; whether the K-turn should
  *also* be an interrupt verb is logged as a reading (§9).

### 3.3 Combat in continuous time

- **Targets are set in PLAN** (per ship; default: current target, else nearest hostile). **Auto-fire** then runs per
  tick during EXEC: if the copied `validShot` logic passes (arc, range band, LOS, ammo, lock requirement) and the
  weapon is off cooldown, one attack resolves **at that instant** with the copied d20 maths (`computeTN`,
  `computeATK`, `needFor`, damage roll, `critChance`, `applyDamage`). Weapon cooldown `WPN_CD` derives from the
  weapon row (*placeholder*: `EXEC_LEN / shots-per-exec`, default 2 shots per exec for guns, 1 for missiles).
  Attacks mid-movement are therefore not a feature, just a consequence.
- **No attack queue, no confirm step.** The VS panel becomes a floating resolution card at the firing ship
  (number + hit/miss + damage), throttled so overlapping shots stay readable.
- **Locks are continuous acquisition:** `LOCK_TIME` seconds (*placeholder* 1.5) of the target inside the lock zone
  per level, stacking to 3 as today; the rear-hemisphere break check (`checkLocks`) runs per tick. Missiles still
  spend a level. The lock lines (`drawLockLines`) persist — they are the pursuit-protocol tell.
- **Evade and shield angling become PLAN stances** (set alongside the path, costing nothing but attention), keeping
  today's modifier values. Whether evade survives as a stance or folds into the Juke interrupt is a reading (§9).
- **Kept intact:** fore/aft shields, armour, hull, `CRITDEFS`, nerve hits from damage. The fantasy filter applies to
  *new* mechanics; existing resolution maths is the control variable in this experiment and must not drift.

### 3.4 Interrupts and the nerve economy

The riskiest, most original piece — the design doc's jealousy-test candidate. **The Hegemony commits; your aces
don't have to.**

- **During EXEC**, clicking one of your ships (or pressing its number key) **pauses the sim** and opens that ship's
  interrupt menu. Enemy ships can never interrupt: their turn, once begun, is doctrine.
- **v1 verbs** (three, no more):

  | Verb | Does | Nerve cost (*placeholders*) |
  |---|---|---|
  | **Snap Shot** | One immediate attack at the current target, ignoring cooldown, with +`SNAP_BONUS` (2) to ATK — "the shot the instant the pursuer overshoots" | `COST_SNAP` 25 |
  | **Juke** | Discard the remaining path; drag a fresh 1-segment path from the current pose (same fitter) | `COST_JUKE` 20 |
  | **Shield Shift** | The existing `shiftF`/`shiftR`, mid-flight | `COST_SHIFT` 10 |

- **Nerve is the price**, paid through the existing meter: the verb calls `adjCool(s, -COST, 'interrupt')`. A pilot
  below `INT_FLOOR` (*placeholder* 30 — i.e. panicking) cannot interrupt at all; **Lock in** remains the recovery
  action, now doubly meaningful because it refills the thing you spend. Green Hegemony pilots have no nerve economy
  because they have no interrupts: the asymmetry is total.
- **A per-exec cap by pilot quality:** `intCap(pilot)` (*placeholder*: 1 + `floor(level/2)`, min 1, max 3) — a green
  recruit flies the plan; a veteran rewrites the turn. Expose cap, costs and floor as panel sliders; these four
  numbers are experiment E1's main tuning surface.
- **Readability:** an interrupt freezes the sim with a brief radial highlight on the acting ship, resolves visibly,
  then resumes. No slow-motion in v1 (a reading, §9).

### 3.5 Doctrine AI

Enemy behaviour in the Arena comes from **doctrine modules**, not `aiManeuver`. A module is:

```js
{key:'pursuit',
 plan(s, world){ /* returns a goal for the §3.2 fitter: a point+heading or a target */ },
 tell(s, ctx){ /* draws this doctrine's always-on visual tell */ }}
```

Because doctrine plans through the same envelope fitter as the player, enemies can never fly anything the player
couldn't — rigid, legible, fair. The v1 set, from the design doc's sketch table:

| Doctrine | Behaviour (via the fitter) | Tell (drawn) |
|---|---|---|
| `pursuit` | Close to preferred range on the locked target; never breaks off | The existing lock line, plus a chevron on the pursuer |
| `wingman` | Pairs; the wing flies `followOffset` on its lead and only engages threats to the lead; on lead loss, `WING_FLOUNDER` secs (*placeholder* 4) of defensive drift before re-pairing or fleeing | A thin pairing line lead↔wing |
| `hold_asset` | Engage only within `GUARD_R` (*placeholder* 900) of the asset; break off and return beyond it | The guard radius ring around the asset |
| `firing_line` | Regroup at range with the others of its flight, then run in together; vulnerable mid-regroup | A regroup marker where the line is forming |

- Panic behaviour carries over: a panicking doctrine ship flies defensive, and `flees` types run for the edge, as
  today. Doctrine is how they fight, not a second health bar.
- Tells are always-on in the Arena (panel toggle), because the experiments need the player reading them. How much of
  each tell the shipping game shows the player — always, on hover, or only once learned — is deliberately out of
  scope and logged as a reading (§9), since it touches the parked doctrine-as-intel idea.
- `aiAction`'s priority list (lock → barrel roll → defensive) dissolves: locks are continuous, stances are part of
  the doctrine's plan.

---

## 4. Build phases

| Phase | Build | Playable proof at the end |
|---|---|---|
| **A1** | §2 complete (boot, scene, picker, no-save), §3.1 loop, §3.2 fitter + standing orders, scenario shells for E1–E5, ships fly with no weapons | Drag paths for 1–8 ships; everything flies its envelope simultaneously; restart-same-seed replays |
| **A2** | §3.3 combat, `pursuit` doctrine, resolution cards | A 1v2 chase with live fire; shots land mid-manoeuvre |
| **A3** | §3.4 interrupts + nerve economy | **E1 playable end to end — the gate** |
| **A4** | §3.5 remaining doctrines + tells + possess-enemy (§5) | E4's doctrine-read scenarios playable |
| **A5** | §5 panel complete, §7 metrics, E2–E5 wired with success-criteria logging | The full experiment suite runs |

---

## 5. The designer panel

In-scene, built with the existing HUD window kit, open by default in a collapsible dock:

- **Sliders:** `EXEC_LEN`, `SIM_SPEED`, planning clock (off/30s/60s), the four interrupt numbers (§3.4), nerve
  gain/drain multipliers, enemy count per flight, AI fitter noise.
- **Toggles:** each doctrine's behaviour on/off; tells on/off; path visibility (all / hover-only / selected — the
  design doc's clutter mitigations, needed for E3); resolution cards verbose/quiet.
- **Buttons:** Restart (same seed), Restart (new seed), Back to picker, Spawn ship… / Despawn selected,
  **Possess** (take over one enemy's next-turn plan with the player's own path tools — for staging E-scenario
  situations by hand), Dump metrics.
- **Read-outs (live):** planning time this turn and per-turn history, shots fired / hits, time-in-arc per player
  ship, interrupts used vs cap, each pilot's nerve.

Everything the sliders touch reads its constant through the getter pattern so `arena-smoke.js` can assert against
the same values the panel shows.

---

## 6. Scenarios to author (the five experiments)

Each experiment from the design doc is one scenario entry; its question goes in `desc` so it is on screen while
testing.

| Id | Setup | Question it answers |
|---|---|---|
| `e1_fox` | 1 veteran Talon v 2 `pursuit` fighters, rock belt, survive 60s | Does committing to a path and interrupting it feel like being a wily ace? **Prove-or-kill.** |
| `e2_sweep` | `e1_fox` re-run at EXEC_LEN 2/4/6/8, planning clock off/on | Where on the turn-based↔real-time spectrum does the dogfight feel live? |
| `e3_count` | 2 / 4 / 8 player ships (mixed presets, standing orders available) v matched `pursuit`+`wingman` | Does planning stay under ~60–90s/turn and the screen readable at the 6–8 cap? |
| `e4_read` | Three scenarios against one unexplained doctrine (`wingman`, then `hold_asset`, then `firing_line`) | Can a fresh player describe the behaviour and name an exploit unprompted by scenario three? (Human test — the code just stages it) |
| `e5_job` | Destroy a key target (depot) while 2 `pursuit` fighters hunt; exit edge to finish | Do the best moments happen when objective and pursuit are simultaneous? |

---

## 7. Metrics

- Per exec, push one JSON record to `A.metrics` and the console (`ARENA_METRICS` prefix): scenario id, seed, turn
  number, planning ms, per-ship {shots, hits, time-in-arc ticks, interrupts, nerve}, objective state.
- **Dump metrics** (§5) prints the session as one JSON array for pasting into the design review.
- The design doc's success criteria, restated as what the metrics can and cannot show: E3's planning-time threshold
  and E1's interrupt usage are measurable; E1's "tell someone about it moment per session" and all of E4 are human
  judgments — the Arena's job there is only to stage and record, not to score.

---

## 8. Tests

**Add `tools/arena-smoke.js`** (Playwright, the `space-smoke.js` pattern, loading `game/index.html#arena` with
cleared storage and a seeded RNG):

1. **Boot and no-save.** The Arena reaches the picker with no console/page errors, and after loading `e1_fox` and
   running 3 execs, `localStorage` holds no `star-rebellion-campaign-v1` key.
2. **The fitter respects the envelope.** A straight drag on a Talon fits only manoeuvres present in its
   `dialAvail`; a hairpin drag on the freighter fits its widest legal turn, not the drag; a crit-clamped ship's
   fitted speeds obey `maxSpeedOf`.
3. **Continuous fire.** In a scripted head-on pass, at least one attack resolves at a sim timestamp strictly between
   exec start and end, and its damage reached shields-before-hull.
4. **Interrupts.** Mid-exec: Snap Shot resolves an attack, deducts `COST_SNAP` nerve, and the sim resumes; a pilot
   forced below `INT_FLOOR` is refused; the per-exec cap holds.
5. **Doctrine.** Over 3 execs: a `pursuit` enemy's distance to its target decreases; a `hold_asset` enemy never
   exceeds `GUARD_R` + one segment; on lead loss a `wingman` enters flounder then re-pairs.
6. **Determinism.** Same seed + identical scripted orders twice → identical end-state hash (positions, hull,
   nerve).
7. **Scenarios are data.** A scenario appended at runtime through `DBGarena` appears in the picker and loads.
8. **Metrics.** Each exec emits one well-formed `ARENA_METRICS` record.

**Then confirm nothing else moved.** The only touches outside new files are `intro.js` (the button), `core.js`
(`bootArena`), and `game/index.html` (the container + script tags + hash routing). All existing `tools/*-smoke.js`
must pass unchanged — if one needs editing, the change has leaked and should be rethought.

---

## 9. DESIGN_BLOCKERS entries to add

- **New: "Arena: decisions".** Record, so later work doesn't reopen them:
  1. Space combat v2 is **continuous WEGO**: one plan step, simultaneous continuous execution; no action/attack
     phases, no initiative.
  2. **Drawn paths are fitted to the ship's dial** — the dial is the balance backend; illegal paths are
     unrepresentable rather than rejected.
  3. **Interrupts are player-only**, priced in the existing nerve meter; enemies commit for the full turn.
  4. **Enemy behaviour is doctrine modules** planning through the same path fitter as the player.
  5. The Arena is **campaign-free and save-free**; it never writes the campaign key.
  6. Existing `space.js` combat maths is copied, not shared, and must not drift during the experiment.
- **New: "Arena: placeholders".** Every *placeholder* constant above with its value (`TICK`, `EXEC_LEN`,
  `SIM_SPEED` range, `PATH_SEGS`, `FIT_W_*`, `WPN_CD`, `LOCK_TIME`, `CALM_GAIN`, `SNAP_BONUS`, `COST_SNAP/JUKE/SHIFT`,
  `INT_FLOOR`, `intCap` formula, `WING_FLOUNDER`, `GUARD_R`).
- **New: "Arena: readings to confirm".** Each with the interim choice:
  - **"Enter Arena" is visible on the title screen for everyone** for now (internal build).
  - **Evade survives as a PLAN stance** rather than folding into Juke.
  - **K-turns are dial manoeuvres only**, not an interrupt verb.
  - **No slow-motion on interrupts** in v1 (hard pause instead).
  - **Tells are always-on in the Arena**; how the shipping game reveals them (always / hover / learned, incl. the
    parked doctrine-as-intel idea) is out of scope here.
  - **Path segment cap is 3** per turn.
- **New: "Arena: graduation".** What is deliberately deferred until E1 passes: extracting a shared combat-math
  module from `space.js`/`sim2.js`; ground combat in the Arena (same skeleton: doctrine, nerve, cover-first AI —
  enters as Arena v2 reusing the picker and panel); migrating the campaign's space combat to the v2 sim; and the
  parked design-doc items (FFG-style mods, doctrine-pages-as-intel, the one authored fly-it-yourself setpiece).

---

## 10. Done means

- [ ] A1–A5 built. From a cleared browser, `#arena` (and the title button) reaches the picker; `e1_fox` plays end
      to end with paths, continuous fire, interrupts and pursuit doctrine; E2–E5 load and run.
- [ ] The campaign is untouched: no behaviour change in `space.js`/`ground.js`/`base.js` beyond the three entry
      touches in §8, and every pre-existing smoke test passes unchanged.
- [ ] The Arena never writes the campaign save (asserted in the smoke test).
- [ ] Adding a scenario means editing `ARENA_SCENARIOS` only; adding a doctrine means adding one module. Both proven
      in `tools/arena-smoke.js`.
- [ ] Every slider reads a named, getter-exposed constant; all placeholders are in the blocker.
- [ ] The §9 blockers are added. All smoke tests pass, `tools/arena-smoke.js` included.
