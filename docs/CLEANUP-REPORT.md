# Clean-up report: the switch to main, phase S0

**For:** the designer, and whoever builds S1 to S11. **Written:** 21 October 2026, building S0 of
`docs/MAIN-SWITCH-HANDOFF.md` on `space-combat-testing` (after `3060415`).

**What S0 asked for (§3, S0.4):**
- Audit the whole project for redundancies.
- Remove what is provably unused, in its own commit.
- Log everything else here: what it is, where it is, why it looks redundant, and what removing it would risk.
- Don't refactor live systems.

Anything that needs a decision from you is also in `docs/DESIGN_BLOCKERS.md` **C-90**.

Line numbers are as of this report. Where a file has since changed, the function or table name is the anchor.

---

## 1. What S0 moved and changed

**Archived** (`archive/README.md` says what each was and how to run it from the tag):

| Moved | From | To |
|---|---|---|
| Arena v2's sim, and the Arena's scene, picker and v2 designer panel | `game/js/sim2.js`, `game/js/arena.js` | `archive/arena/` |
| SB Test | `game/js/sim-sb.js`, `game/js/arena-sb.js` | `archive/arena/` |
| Type 3 as a playable ruleset (the whole file as it was) | `game/js/arena-hc.js` | `archive/arena/arena-hc.js` (copy) |
| The Arena's full stylesheet | `game/ui/arena.css` | `archive/arena/arena.css` (copy) |
| The Arena's test | `tools/arena-smoke.js` | `archive/tools/arena-smoke.js` |
| The experiments' docs | `docs/ARENA-HANDOFF.md`, `ARENA-SB-HANDOFF.md`, `SB-HUD-HANDOFF.md`, `ARENA-HC-HANDOFF.md`, `ARENA-HC-FEEDBACK-1.md` to `-4.md` | `docs/archive/` (every live link repointed) |
| The v2 and SB blocker entries (C-55, C-56, C-59, C-60, C-62 to C-65) | `docs/DESIGN_BLOCKERS.md` | `docs/archive/DESIGN_BLOCKERS-ARENA.md`, verbatim |

**Kept live, and what changed in each:**

- **`game/js/sim-hc.js`.** v2's pilot `PRESETS` were copied in, so it no longer reads `window.SIM2`. The values are
  the same. The hash baselines (below) prove the sim plays exactly as before, so there is no `SIM_VERSION` bump.
- **`game/js/arena-hc.js`, High Command's renderer and HUD.** It now hosts Type 3.5 only (1,895 lines down to about
  1,420). Gone:
  - Type 3's scenarios and scenario picker, its end card and its engagement record;
  - the order tray, the order wheel and the commands drawer;
  - the rules picker, the emergency responses, and its own objectives, clock and pilot-panel body;
  - the "Change ruleset" route.

  The overlay hooks Type 3.5 uses are unchanged.
- **`game/js/hc35-bench.js` (new), the dev-only test bench** (S1 turned it into the `space35` scene, `game/js/space35.js`). It was the 'arena' scene: it opens Type 3.5's board
  directly and drives High Command's loop. Its debug hooks are `DBGarena.hc` and `DBGarena.hc35`, plus `fn.open35`.
- **`?dev`.** `core.js` reads `?dev` from the URL into `SR.dev`.
  - Without it, `SR.bootArena()` is the campaign's own boot and `#arena` shows the title screen.
  - With it, the title has a **Test bench** button (it was "Enter Arena", shown to everyone) and `?dev#arena` opens
    the bench.
  - The designer panel and the flight recorder's download live on the bench. `tools/run-report.js` no longer loads
    `sim2.js`.
- **`game/js/arena-hc35.js`.** "Change ruleset" and "Back to rulesets" became "Back to title".
- **`game/index.html`.** The v2 shell, the ruleset picker, SB's shell, `#arOver`, `#arDump`, and the tray, wheel and
  picker elements are gone, along with the four archived scripts. `hc35-bench.js` is loaded.
- **`game/ui/arena.css`.** v2's and SB's rules are gone. Type 3's own rules inside the High Command block went on
  27 October 2026 (§3.1).

**Tests:**
- **`tools/hc35-smoke.js` (new)** is arena-smoke's Type 3.5 section on the bench: 150 checks. It also runs:
  - **HC35 1:** High Command is byte-identical with the 3.5 hooks; the hashes still match the baselines recorded
    before any 3.5 change (re-recorded on 27 October 2026, when Type 3's rules and command points left the fixtures).
  - **The visual pass, V1** (C-73 and C-74).

  Both run on Type 3's three scenarios, kept as fixtures in **`tools/hc-fixtures.js`**. Dropped with Type 3:
  - K0's High Command record and replay (3.5's own record and replay are still checked);
  - K4 18, Type 3's Reinforce command.
- **`tools/archive-smoke.js` (new)** is §5's test 1:
  - main boots, with no dev hooks for players;
  - the bench is unreachable without `?dev` and reachable with it;
  - nothing in `tools/` or `index.html` loads an archived file;
  - `run-report` loads.
- **The live suite: 53 of 54 pass.** The exception is `text-smoke`, which needs Python, and this Windows machine
  has none, so it wasn't run here. Run it before the merge. Nothing it reads was touched, except the title button's
  wording.

## 2. Removed as provably unused (a commit of its own)

Every one of these had no reference anywhere in `game/`, `tools/` or `index.html` (checked by name, including
`data-act` strings).

| Removed | Where | What it was |
|---|---|---|
| `drawProps` | `game/js/ground.js` | Returned on its first line ("retired: props draw in drawActors' depth sort"); never called |
| `drawBldgsOld` | `game/js/ground.js` | The old building renderer; never called |
| `workDone` | `game/js/ground.js` | Never called; a leftover from the `ground-combat.html` prototype |
| `underTreatment` | `game/js/base.js` | Never called |
| `personAvatar` | `game/js/base.js` | Never called (its siblings `shipAvatar` and `personSub` are used) |
| `sub35World` | `game/js/sim-hc35.js` | Never called. Removing it doesn't change the sim |
| `isConv` | `game/art/sr-art.js` (inside `furnishRoom`) | Declared, never used |

**For the commit:** these are the only changes in `ground.js`, `base.js`, `sim-hc35.js` and `sr-art.js`, so those
four files make the "remove unused code" commit on their own. Everything else is the archive commit.

## 3. Logged, not removed

### 3.1 Code that looks dead, or goes dead with the archive

| What | Where | Why it looks redundant | Risk of removing |
|---|---|---|---|
| `supportCard(p)` | `base.js` (the personnel file's Specialty section for a Support rebel) | Never called. It's a full UI section, so it may be waiting to be re-wired | Low. Check it isn't meant for the personnel file first |
| `striderFace` | `sr-art.js` | Never called; only the self-contained `docs/art/styleguide.html` has a copy | Nil for the game; it's art-kit code |
| `syncLocalOps` | `base.js` | `return;` on its first line, so its body is unreachable. It is still called from five places and exported to `DBGbase` | Nil if only the body is emptied; touches six call sites if removed |
| `shipCol` | `arena-hc.js` | Never used (`shipColHi` beside it is) | Nil. Left alone because S1 lifts this file |
| `catchSpd` | `sim-hc.js` | Never called | Nil for the sim. Left alone because the file is the sim |
| Type 3's systems in the sim: rules, command points, commands, emergencies, tactics' tray data (`ORDER_KEYS`, `ORDERS_LIVE`, `TACTIC_KEYS`, `RULES`, `RULE_KEYS`, `COMMANDS`, `COMMAND_KEYS`, `emergencyOpts`, `targetLabel`, `clockLeft`, `ruleLabel`, `commandRefusal`, `targetChips`, `jumpOutState`) | `sim-hc.js` | Only Type 3's archived UI used them; now only the fixtures exercise them | **Done, 27 October 2026** (the designer, C-90 item 3: remove). All of them went, with what only they used: `RULES` and the rule constants, `HC_CP` and the scenario's `cp`/`cpReward`, `COMMANDS` and their constants, the Recall/Override/wingmate jobs, decoys and Recon, Jump Out and Leave now, the default target, the `TUNE` Rules and Commands groups. **Kept**, because 3.5 reaches them: the emergencies themselves (`raiseEmergency`, `pinTick`, `PIN_CLEAR`: panics and pins as morale, which 3.5's verbs and tiles read), `ORDERS` (`setOrder`), `HC_TACTICS`, `PERSONALITY`, abilities and doctrine. `stateHash` keeps a constant `#0#` where the command points stood, so every 3.5 hash and saved flight record is unchanged. `SIM_VERSION` hc-4; the fixtures' baselines were re-recorded |
| Type 3's fallbacks in the renderer: the order and tactic chips when the overlay has none (`SIM.ORDERS`, `SIM.HC_TACTICS`), `behWord`'s own table, and the `A.ov&&` guards | `arena-hc.js` | The overlay is always there now | **Done, 27 October 2026** (the designer, C-90 item 3: remove), with Recon's and the decoys' drawing, the command effect and the `abil`/`doc` tips. The live camera tiles stay: 3.5's roster uses them. Without a 3.5 fight (the fixtures) a tile shows no word |
| Type 3's CSS inside the High Command block: `hc-obj__item`, `hc-obj__getout`, `hc-rchip__x`, `hc-addrule`, `hc-rulepick*`, `hc-tray*`, `hc-ico*`, `hc-tchip`, `hc-pick*`, `hc-fine`, `hc-ev__resp`, `hc-resp`, `hc-cpc`, `hc-abil*`, `hc-seg*`, `hc-use`, `hc-pilot__resp`, `hc-cmds__for`, `hc-jump*`, `hc-wheel*` | `game/ui/arena.css` | Nothing emits them now (3.5 supplies its own markup). `hc-tip__name`, `hc-tip__line` and `hc-tip__warn` were already dead | **Done, 27 October 2026** (the designer, C-90 item 3: remove). Each was checked against `arena-hc35.js`, `arena-hc.js` and `index.html`: none is emitted. Shared rules kept their live half (`.hc-pilot`, `.sr-btn[aria-disabled]`, `.hc-cmds__arm`); `.hc-cmds.is-for`, `.hc-ev.is-live` and `@keyframes hc-arm` went too |
| Exports nobody reads (still used inside their files) | `flight-rec.js`, `prologue.js`, `rebel.js`, `sim-hc.js`, `sim-hc35.js`, `support.js`, `arena-hc.js`'s `api`, `sr-art.js` | Dead export entries only | Trivial. `rebel.js`'s `FIRST`/`LAST` are named in `text.py`'s SKIP list: keep them |
| `rebel.js` `liveTraits`, `focusTN`; `support.js` `LEVELS`, `STAFF_XP` | | Exported, never read; `focusTN` is read only by `skills-smoke` | Low |
| `sr-art.js` `shotTimes`, `fireModeToggle`, `misfire`, `bombRun`, `doorGunner`, `padFor` | | Exported, never read by the game | Keep: they are the documented art-kit API (`docs/art/HANDOFF.md`) |
| `enemies.js` `spaceRows` | | Read only by the archived `arena.js` and by `enemies-smoke` | Low |
| `sim-hc.js` exports `RU`, `SU`; `sr-art.js` export `muzzleFor` | | Their only outside readers were archived | Trivial |

### 3.2 Duplicated combat maths (the copies M-35 warned about)

M-35 asked that `sim2.js`'s copies of `space.js` not drift. `sim2.js` is archived. The live copies are now
`space.js` (the campaign's, until S11) against `sim-hc.js` and `sim-hc35.js` (3.5's), which were copied through SB
and v2 ("copy-don't-refactor", in `sim-hc.js`'s header). **The copies that matter for the switch have already
diverged:**

| What | Copies | How they differ | Why it matters |
|---|---|---|---|
| Damage: shields, then armour, then hull | `space.js` `applyDamage`; `sim-hc.js` `applyDamage`; `sim-hc35.js` `damageShip` (a copy plus subsystems) and `damageFreighter` (different: bombs skip shields and half the armour); in spirit, `ground.js` `soak` | Four variants with three behaviours. Ground's Sunder and Pierce aren't in either space path | **The natural home for a mode-agnostic core** (C-88), but each behaviour has to be kept |
| A ship's death | `space.js` `destroyShip`; `sim-hc.js` `F.kill` | High Command has no friends/love bond nerve hit, no Lucky save, and no kills, XP or salvage. Its leader-loss hit is wing-scoped; `space.js` applies it to the side | S6 (XP, kills), S9 (leader death), Scavenger's Eye |
| Nerve | `space.js` `adjCool`; `sim-hc.js` `adjCool` | High Command adds `NERVE_K` and lacks `friendLock`, panic counting and the floaters | S6, S9 |
| Pilots from the database | `space.js` `mkPilot`/`dbPilot`; `sim-hc.js` `presetPilot`/`dbPilotOf` | High Command has no `Rebel.expNerveMul`, no rank, no `aimMod` | S6 builds 3.5's pilots from the campaign |
| Top speed | `space.js` `maxSpeedOf`; `sim-hc.js` `maxSpeedOf` | `space.js` has Fighter Tuning and the mag-clamp's −2; High Command has neither | S10 (Fighter Tuning) |
| Weapon rows | `space.js` `wdefOf`; `sim-hc.js` `wdefOf`; hand-built `plasmaLoadout`, `PD_W` in `sim-hc35.js` | High Command drops `accuracy_mod` | S2's weapons review |
| Criticals | `space.js` and `sim-hc.js` `CRITDEFS`, `applyCritical` | Same table, different effects (targeting: −2 aim against +3° spread). **The emitter critical does nothing in High Command** (Boost Shields never checks it) | A small bug to fix when S6 wires ship damage |
| Trait → persona | `sim-hc.js` `personalityOf` (rebel trait keys); `ops-core.js` `TRAIT_AID` (other keys: `coward` against the rebel `cowardly`, and most aren't rebel traits); `sim-hc35.js` `WINGS35` traits | Two vocabularies | **Decision 10's "one mapping table"** (S6) |
| Ship scale | `0.7+0.09*size` and the art factor `1.6×0.85×1.35` inlined in `arena-hc.js`, `arena-hc35.js` (twice), `sim-hc35.js` (`FL_UNIT`), `sr-space-fx.js`; `SHIP_SCALE` defined twice; `SIZE_M` in `sr-art.js`, `sim-hc.js` and `db.json` | The same numbers today, with nothing tying them together. **`sim-hc35.js`'s `FL_UNIT` reads the art's scale, so the sim's subsystem positions depend on the art** | Medium: an art change could move the fight |
| Cruise speed | `arena-hc35.js` `unreachable()` uses `560` | Wrong for the Talon (700) and the Brickbat (420), and after tuning | Low; read `capsOf` instead |
| Ship classes outside the database | `sim-hc.js` `HC_LOADOUT` (Cross with missiles), `HC_TURN` (Cross × 1.6); `sim-hc35.js` `HC35_CLASSES` (Brickbat, FL-400), `PLASMA_ON` | `HC35_CLASSES` lacks `extra_people`, `gunner_positions`, `supply_drop`, `fuel_per_sortie` (the hangar would fall back to fuel 5) | **S2** |
| Small helpers (`angNorm`, `bearing`, `inArc`, `dist`, `clamp`, `critCount`, `maxShield`, `totalShield`, `PROJ_OF`, `losBlocked`/rock hits, the d20's `needFor`/`pctFor`) | `space.js`, `sim-hc.js`, `sim-hc35.js`, `ground.js`, `core.js` | Identical. The seeded RNG `mulberry` is written three ways but gives the same output | Low. **`sim-hc` and `sim-hc35` run on `det-math.js`, so any shared helper must not capture the global `Math`, or replays break.** Changing the RNG breaks every flight record |
| Drawing: rocks, ship bodies and sprite caches, starfield, shield arcs, bolts, ability badges | `space.js`, `arena-hc.js` (the "FX off" fallbacks), `sr-space-fx.js` | Three rock looks, two sprite caches from the same constants, the same badge tones twice | Low; the fallbacks go if the flat look goes |

### 3.3 The ships database: who reads what (feeds S2's `docs/SHIPS-REVIEW.md`)

- **Read by both sims:** `straight_max`, `straight_min`, `bank_min`, `turn_min`, the shields, armour, hull, the
  weapon slots and default weapons.
- **Read only by `space.js`:** `bank_max` and `turn_max` (the dial).
- **Read only by the hangar** (`base.js`): `extra_people`, `gunner_positions`, `supply_drop`, `fuel_per_sortie`,
  `manufacturer`. `space.js` copies `extra_people` and never reads it.
- **Read by nothing:**
  - `hard_points`, a count. **Its name clashes with S2's new `hardpoints`**, slot types.
  - Ship `special_rules`: the drone and depot behaviours it describes are hard-coded.
  - Ship `description`, although `tools/db/build.py` says it is "shown to the player".
- `docs/DATABASE.md` says "passenger seats and gunner positions" reach the game; only the hangar reads them. It
  doesn't mention the hand-written ship tables in the two High Command sims.

### 3.4 Files

| What | Where | Why it looks redundant | Risk |
|---|---|---|---|
| **The UI kit's source is behind the game's copy** | `tools/ui-kit/sr-theme.css` against `game/ui/sr-theme.css` | The game's copy has the `100dvh` window height and the whole tablet (`@container`, 901–1100 px) block. **Running `tools/ui-kit/build.py` would overwrite them** | **High if anyone rebuilds the kit.** Copy the game's changes back into the source first |
| The four standalone prototypes | `base.html`, `ground-combat.html`, `space-combat.html`, `space-combat-gdd.html` (repo root) | Nothing loads them; README keeps them as "references and iteration history". They hold old copies of code (`workDone`, `drawProps`), so a search finds two | **Done** (the designer, 27 October 2026: archive them): moved to `archive/prototypes/`; README's sections replaced by a pointer |
| `game/ui/sr-icons.svg` | | The UI kit's build output. Nothing loads it; `game/index.html` inlines the same sprite | None; keep it as the build artifact |
| `index.html` (root) | | A redirect to `game/index.html` | Keep: it is live |

### 3.5 Stale or contradictory docs

These are written up here and not fixed: most need your numbers, or are your design docs.

**Numbers done, 2026-10-27** (the designer: the build's numbers are right). README, GDD, ROADMAP and REBELS_PLAN
now quote the build: sortie fuel 24-42, the hangar's +4 Fuel a day, Steal Fuel's 240 Fuel and 300 credits, Auto
Factory's 450 credits and 160 Materials (+250 credits and 2 Intel unseen), the starting hangar's large pad and two
small, the hauler's 240 credits and 160 materials, and the other numbers in those passages (room costs, repairs,
source pay, liberation %, Supply Drop, bunks, trait counts). The same pass renamed Cook to Torch the Depots and made
the Sources' icons red in README. The four prototypes' README sections went with the prototypes to
`archive/prototypes/` (C-90), which took the stale branch names and the Storeroom's Gear Grid line with them. The
items below that are not numbers are still open.

- **README.md:**
  - "Cook the Depots" (three places): the game says Torch the Depots.
  - The starting hangar is described three ways (capacity 2 +1 a bay; four pads; in ROADMAP four pads; in the GDD a
    large pad and two small, which matches the code).
  - Steal Fuel "pays 60 Fuel" (the code pays 240 Fuel and 300 credits).
  - The Graf's restore cost differs from the GDD.
  - Sources are said to be green icons (they're red now).
  - The Storeroom's Gear Grid (the Arsenal replaced it).
  - Branch names that no longer exist.
  - The eject roll (decision 4 replaces it in S6).
  - The X-Wing intro (3.5 replaces it in S11).
- **GDD.md:**
  - §7 Space Combat describes the old X-Wing phases with a d100, which is stale twice over: `space.js` uses a d20,
    and 3.5 is real time with pause.
  - "Space combat is the exception, turn-based".
  - It contradicts itself on:
    - sortie fuel (16–24 against 24–42);
    - the hangar's fuel leak (+4 against +1 a day);
    - Steal Fuel's and Auto Factory's pay;
    - Combat Medic being "later" (it is live);
    - the Gear Grid;
    - local ops;
    - Disrupt Comm Towers being out of scope (it is built).
  - It already calls opportunities "leads", which **collides with the Bureau's "Current Leads"** once S7 renames
    `G.opps` (C-90).
- **ROADMAP.md:**
  - The "where the game is now" table predates Phase 1.
  - Materials and Fuel are "not yet built" next to "built".
  - Phase 3 is "in progress" next to "all five built".
  - Heroes are out of scope next to built.
  - Marines and boarding are Rev 2+, but 3.5 boards.
  - Nothing yet on the switch's phases.
- **REBELS_PLAN.md:**
  - "Plan only, nothing implemented yet" (it is all built).
  - Owes and Saved a Life are "not granted" next to "live".
  - Combat Medic is "not live" next to "live".
  - "Deaths only happen to pilots shot down in space" (C-29).
  - Two meters are called exposure: `G.risk` and `G.exposure` (C-90).
- **DATABASE.md:** see §3.3; and S2's hardpoints supersede "any weapon fits any slot" and "attachments not in the
  database".
- **TEXT.md:**
  - "Every line goes through the workbook", but `text.py`'s sources leave out `arena-hc35.js`, `sim-hc35.js`,
    `sim-hc.js` and `ops-core.js`. **3.5's player-facing text is outside the pipeline**, which matters from S1
    (C-90).
- **LEGACY_AUDIT.md** (10 October):
  - superseded by this report;
  - its counts (18 smoke tests; there are 54) and most of its §8 dead code are stale (`drawProps` is now removed;
    `syncLocalOps` and `focusTN` are still there).
- **CLAUDE.md:** fixed in this commit (flight records come from the test bench).
- **OPPORTUNITY-SYSTEM.md:** "the arena uses the pilots' existing presets and traits" (S6 retires them).
- **The Type 3.5 handoffs:** their "next free ids" are long out of date, and their `ARENA-` names will mislead once
  3.5 is the campaign's space combat. Renaming would break more than 20 links, so they stay for now.

### 3.6 Old handoffs (built, still in `docs/`)

- **Could go to `docs/archive/` (few links):**
  - `docs/ONBOARDING-HANDOFF.md` (superseded by PROLOGUE-HANDOFF);
  - `docs/ui/MARKET-ARSENAL-HANDOFF.md`;
  - `docs/ui/GALAXY-HANDOFF.md` with `docs/ui/galaxy-reference.html` (they link to each other, so move both or
    neither);
  - `docs/LEGACY_AUDIT.md`.
- **Built, but cited from dozens of code comments:**
  - `docs/FEEDBACK-0.2-HANDOFF.md`;
  - `docs/ui/SCREENS-HANDOFF.md`;
  - `docs/ui/SCREENS-HANDOFF-2.md`;
  - `docs/ui/HANDOFF.md`;
  - `docs/art/HANDOFF.md`;
  - `docs/PROLOGUE-HANDOFF.md` (its §2 is still the prologue's authoring spec);
  - `docs/art/HC-VFX-BRIEF.md` (finished brief).

  Moving them means a pass over every link. Recommended: a "Status: built" line at the top of each instead.
- **Type 3.5's handoffs and feedback** stay live until the switch is done.

### 3.7 The blockers file itself

- **Entries for Type 3 that are now partly moot:**
  - C-66, C-67 (its leader-loss item is replaced by S9), C-69 and C-71 ("Your call: none");
  - C-70 item 13: the stock Cross and missiles, answered by decision 9;
  - C-72 item 19: hc2's difficulty, moot.
  - **C-68 stays:** its numbers are the sim's, and 3.5 flies on them.
  - C-73 and C-74 stay (the visual pass is live).
  - C-75 item 1's "byte for byte" now runs on the fixtures in `hc35-smoke`.
  - Listed in C-90 for you to close.
- **Entries the switch answers:**
  - C-87's call (decision 13);
  - C-83's family fallback (the new-objective request, S9);
  - M-36 and M-39's items (S2, S6, S7);
  - M-37's K7 (moved to M-40);
  - M-4 (revive in space) and part of M-11, by decision 4 and Evac on Call.
  - Recorded in the Resolved log or C-89.
- **Tied to `space.js`, retiring at S11:** C-35, C-39, and C-41's and C-37's space parts.
- **Format:**
  - C-23, M-20 and M-25 appear nowhere (neither open nor resolved).
  - M-36 to M-39 have no "Blocks" or "Your call" lines.
  - C-18's title differs between the table and the heading.
  - The Conflicts and Missing sections aren't in id order.
  - The "Last updated" paragraph has grown into a changelog, against the file's own rule.

## 4. Test notes

- **The smoke tests default to a Linux Chromium path** (`/opt/pw-browsers/chromium`). On this Windows machine they
  ran with `PW_CHROMIUM` pointing at Playwright's headless shell (`chrome-headless-shell.exe`); the full Chromium
  build wouldn't start ("side-by-side configuration").
- **`blockers-smoke`, `prologue-smoke`, `economy-smoke`, `missions-smoke` and the other tests that fly `space.js`**
  must be rewritten at S11 (`archive/README.md`).
- **`text-smoke` needs Python** (see §1).
