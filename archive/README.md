# The archive: space combat experiments

These are the space combat experiments the Arena ran on `space-combat-testing`. The switch to main archived them
(`docs/MAIN-SWITCH-HANDOFF.md`, phase S0) once **Type 3.5 (High Command Hands Off)** became the game's space combat.
They are kept so any of them can be read or played again.

**The archive gets no upkeep.** Nothing in `game/` loads these files, no live smoke test runs them, and they are not
kept working. The copies here are the files as they last ran. They only run together, with the page and the tests
of their own time.

**The tag:** `archive/space-experiments-2026-10`, on `space-combat-testing` at `3060415`, the commit before anything
moved. Every experiment runs there exactly as it last did.

## What each was

| Experiment | Files here | What it was | Final verdict |
|---|---|---|---|
| **Arena v2** ("SR V2 Combat") | `arena/sim2.js`, `arena/arena.js` (also the Arena's scene, ruleset picker and designer panel) | Turn-based space combat: a manoeuvre dial, an action point meter (moves, stances, shield work, interrupts), Cool as bonus points, a few seconds of simultaneous flight and fire per round, doctrine-bound enemies. Experiment E1 (the hunted fox) was its prove-or-kill gate. Docs: `docs/archive/ARENA-HANDOFF.md` | **Closed.** The designer's decision 1 (21 October) closed E1 and graduated Type 3.5 instead. v2's pilot presets live on in `game/js/sim-hc.js` (`PRESETS`) |
| **SB Test** | `arena/sim-sb.js`, `arena/arena-sb.js` | A SteamBirds-informed rival on the same scenarios: drag where the craft should end up and it banks there, two segments a round, pilot movesets (Boost, Drift, K-Turn, Barrel Roll), simulated projectiles, lock as a dial, damage by impact angle. Docs: `docs/archive/ARENA-SB-HANDOFF.md`, `docs/archive/SB-HUD-HANDOFF.md` | **Superseded** by High Command. Its flight, guns and shield arcs were copied into High Command's sim and renderer, which stay live |
| **Type 3: High Command**, as a playable ruleset | `arena/arena-hc.js` (the whole file as it was) | Real time with free pause. You command wings, not ships: orders, tactics, standing mission rules and command points, through the order tray, the order wheel and the commands drawer. Three scenarios: hc1 Nightfall, hc2 Last Light, hc3 Meltdown. Docs: `docs/archive/ARENA-HC-HANDOFF.md`, `docs/archive/ARENA-HC-FEEDBACK-1.md` to `-4.md` | **Graduated, minus its controls.** Its sim (`game/js/sim-hc.js`) and renderer (`game/js/arena-hc.js`, trimmed) run Type 3.5. The tray, wheel, drawer, rules picker, scenario picker and end card are archived. Its three scenarios are test fixtures in `tools/hc-fixtures.js` |
| **The Arena's picker and designer panels** | `arena/arena.js`, `arena/arena.css` (the full stylesheet) | The ruleset picker, v2's scenario list and designer panel, and SB's shell | **Archived.** Type 3.5 opens from its own scene (`game/js/space35.js`); its test opportunity is dev-only (`?dev#arena`). High Command's designer panel stays there |
| **The standalone prototypes** | `prototypes/base.html`, `prototypes/ground-combat.html`, `prototypes/space-combat.html`, `prototypes/space-combat-gdd.html` | The single-page prototypes the game grew from: Haven Rock's base layer, Steal the Cross on the ground, the X-Wing-style skirmish and its GDD-faithful variant. They held old copies of code the game has since changed (`workDone`, `drawProps`) | **Archived** (C-90 item 2, the designer, 27 October 2026). Moved from the repo root; nothing loaded them. They open on their own in a browser |
| **The Arena's test** | `tools/arena-smoke.js` | v2, SB, Type 3 and Type 3.5, in one 3,167-line Playwright test | **Split.** Type 3.5's section is live as `tools/hc35-smoke.js`, plus Type 3's hash baselines and the visual pass on the fixtures. The rest stays here |

## Still live until S11: the old space combat

`game/js/space.js` (the campaign's X-Wing-style space combat) and its tests stay **live until S11**. These are
`space-smoke`, `space-traits-smoke`, `prologue-smoke`, `economy-smoke`, `missions-smoke`, `blockers-smoke` and the
others that fly Torch the Depots or the Training Hall. The prologue still flies on `space.js` until small 3.5
opportunities replace Torch the Depots and Take Out Instructor. Then `space.js` and those tests move here, and the
tests are rewritten or replaced (handoff §3, S11).

## How to run an experiment

From a clean checkout:

```bash
git checkout archive/space-experiments-2026-10
```

Then open `game/index.html#arena` in a browser, or choose **Enter Arena** on the title screen. The picker offers
SR V2 Combat, SB Test, Type 3: High Command and Type 3.5. Its test:

```bash
NODE_PATH=$(npm root -g) node tools/arena-smoke.js
```

Go back with `git checkout main` (or your branch). Don't copy files from here into `game/`: they expect the page
(`game/index.html`) and the globals of that commit.
