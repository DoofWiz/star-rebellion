# Type 3.5 becomes the game's space combat: the switch to main

**For:** Claude Code, starting on `space-combat-testing` (after `72ec941`) and ending on `main`.
**Status:** designed by Claude Chat from the designer's decisions of 21 October; **approved to build**, phase by phase
(§3). Stop for the designer after each phase marked ⏸.
**The decisions:** the Claude Doc *Type 3.5: design blockers before it replaces main* (the designer's working copy),
summarised in §1. **Read first:** `docs/OPPORTUNITY-SYSTEM.md`, `docs/ARENA-HC35-FEEDBACK-3.md`, and `CLAUDE.md`.

**What changes.** Type 3.5 (High Command Hands Off) stops being an Arena experiment and becomes **the campaign's space
combat**. The player plans a space opportunity a Source revealed, sends wings of their own pilots and ships, and lives
with the results: injuries, deaths, damaged ships, rewards, Exposure. The old space combat (`space.js`) and the other
experiments are **archived**: preserved in the repo, but nothing (smoke tests included) has to keep them working.

---

## 1. The designer's decisions (21 October)

| # | Decision | What it means for the build |
|---|---|---|
| 1 | **3.5 graduates**; v2's experiment E1 is closed | 3.5 gets its own campaign scene (§3, S1). **Clean up the whole project** for redundancies and log every issue found. **Preserve** the old space combat and the other experiments (v2, SB, High Command as a ruleset, the Arena), **archived**: no smoke tests, no upkeep (§3, S0) |
| 2 | **Persistent wings** | A ship and pilot can **only fly a space mission inside a wing**. Outside a wing, a ship (a Graf, say) can still be **an asset**: on a ground mission, or on a space mission if it gives a benefit. The game starts with one pilot and three soldiers. **A new pilot must be assigned to a wing or start a new one.** The player can change a pilot's wing at any time, remove them from a wing, or make them its leader in place of the current one (§3, S3) |
| 3 | **Small flights** | Opportunities **scale to the force sent**. One-wing and one-ship missions are allowed. `space.js` keeps the prologue until a small 3.5 opportunity replaces it (§3, S7, S11) |
| 4 | **Ejected pilots** | Picked up = injured. Lost = dead (the Infirmary's Critical Condition still applies). Captured = a new state that creates a rescue lead, **counted as dead until the capture system (M-2) exists** (§3, S6) |
| 5 | **Space opportunities** | Sources reveal them from **cast templates**, starting with **Intercept Transport** and **Tanker Grab** as Vulnerable Freighter variants. Source level sets which modifiers are hidden. The campaign's existing "opportunities" (`G.opps`) are renamed **leads** (§3, S7) |
| 6 | **Phone and iPad** | **Logged for later.** Not a priority; don't block the switch (M-entry) |
| 7 | **Assets** | A **placeholder Crafting menu in the Arsenal** makes them for basic resources, until the crafting system is designed. **Used up when spent** (§3, S5) |
| 8 | **The new ships** | The Brickbat and the FL-400 join the existing ships database. The FL-400 can appear in missions now, and joins the player's fleet once the Fleet feature is designed. **Review the whole ships database**: the new space gameplay may make some stats redundant (§3, S2) |
| 9 | **Loadouts** | **Refit**, from the ship inspector screen, swaps attachments on **the hardpoint system, for every ship**. That includes bombs, cargo pods and boarding parties. The prologue's Cross comes **pre-modified with missiles**; a stock Cross has none. **An enemy ship may be configured differently: every ship's configuration is its own.** **The Graf is the usual boarding craft**, and a **boarding pod** attachment lets ships with no passenger room board (§3, S2, S4) |
| 10 | **Traits and personality** | **One mapping table** from the campaign's rebel traits, friends and rivals to 3.5's personas and help weights. The arena's placeholder traits are retired (§3, S6) |
| 11 | **Intel, Exposure and Leads** | Dig deeper costs `G.intel`. Firebrand Broadcast and escaping witnesses add `G.exposure`. An escaped witness can become a Bureau Lead (§3, S6) |
| 12 | **Space support jobs** | Re-homed as 3.5 effects, using the table in §4 |
| 13 | **The grammar** | The designer played Patrol Sweep and liked it; tweaks will come |
| 14 | **The HUD layout** | K7 follows the designer's mock-ups 5–8 as they arrive. Not a blocker for the phases below |

**Readings the designer settled on the same day:**
- **Pilots use their abilities on their own** (AUTO), to be balanced over time.
- **Being spotted ends Hold for My Signal:** the wings go into action at once.
- **When the primary can't be done, the wing leader asks the player for a new objective.** The automatic fallback (C-82, C-83) is replaced by a request card listing the primaries still possible plus **Retreat**. With no answer, the leader picks by their persona. A replacement pays without the Accomplished bonus.
- **A leader's death** is a big hit to **its own wing's** morale and a smaller one to the other wings. Traits like **Brave** give individual resilience.
- **Rewards:** Claude Code's stand-ins are the first pass. Claude Chat's design proposal (rewards by cargo, per primary, secondary objectives paid in campaign stats, pilot XP, crafting costs, and a fuel question) is in the Claude Doc's *Rewards: a design proposal* section. **Don't apply it until the designer approves it.**
- Every other reading in C-75 to C-87 stands as interim.

---

## 2. Ground rules

- `CLAUDE.md` applies. `docs/DESIGN_BLOCKERS.md` is kept in the same commit; the next free ids are **C-89** and
  **M-40**. Bump `SIM_VERSION` in any commit that changes how the sim plays. Save changes need a `MIGRATIONS` entry.
- **The archive** (S0) is the only place old code goes. Never delete an experiment outright.
- Every **live** `tools/*-smoke.js` passes before each commit. Archived ones are moved out of `tools/` and aren't run.
- **Keep a playable game on main at every phase.** `space.js` stays the campaign's path for the prologue until S11
  replaces it.
- **Ask the designer, don't guess,** for anything this file and the decisions don't cover. Log the question and pick
  the least surprising interim, as before.

---

## 3. Phases

| Phase | Build | Proof at the end |
|---|---|---|
| **S0** ⏸ | Archive, clean-up, merge | Main runs the campaign exactly as before, with the Arena gone from players' view |
| **S1** | 3.5's campaign scene | A space opportunity plays end to end inside the campaign with a test wing |
| **S2** | Ships: database, hardpoints, attachments | Every ship has a configuration; the Brickbat and FL-400 are in the database |
| **S3** ⏸ | Wings | Wings are made, edited and led in the Hangar; a new pilot must join one |
| **S4** | Refit | Attachments swap at Refit, on hardpoints |
| **S5** | Placeholder Crafting | Assets are crafted, carried and used up |
| **S6** ⏸ | Results in and out | A 3.5 mission's injuries, deaths, ship damage, XP, rewards and Exposure land in the campaign |
| **S7** | Opportunities from Sources, scaled to your force | Intercept Transport and Tanker Grab arrive from Sources and fly in 3.5 |
| **S8** | Planning merged | The Missions tab and planning windows are the campaign's own for space |
| **S9** | The leaders' new rules | The new-objective request and leader-death morale |
| **S10** | Support jobs re-homed | §4's effects are live |
| **S11** ⏸ | The prologue, then retiring `space.js` | Torch the Depots and Take Out Instructor fly in 3.5; `space.js` goes to the archive |

### S0. Archive, clean-up, merge

1. **Tag before anything moves:** `archive/space-experiments-2026-10` on `space-combat-testing`'s head, so every
   experiment can be restored exactly.
2. **Archive the experiments:**
   - Move Arena v2 (`sim2.js`, `arena.js`'s v2 parts), SB (`sim-sb.js`, `arena-sb.js`), High Command as a playable
     ruleset (`arena-hc.js`'s Type 3 picker, tray, wheel, commands and rules UI), and the Arena's picker and
     designer panels into **`archive/arena/`**.
   - Their smoke tests move to **`archive/tools/`**, their docs to **`docs/archive/`**, and write an
     `archive/README.md` saying what each was, its final verdict, its tag, and how to run it from the tag.
   - **What 3.5 still needs from them stays live:** High Command's sim (`sim-hc.js`) and renderer, v2's `PRESETS`,
     `det-math.js`, `flight-rec.js`, `sr-space-fx.js`. Lift them into the campaign scene in S1; don't archive them.
3. **The old space combat:** mark `space.js` and its tests as **"live until S11"** in `archive/README.md`. They move to
   the archive in S11.
4. **Clean up the whole project.**
   - **Audit** for redundancies: dead code, unused files and functions, duplicated combat maths (the copies M-35
     warned about), stale or contradictory docs, superseded blocker entries, old handoffs.
   - **Remove** what's provably unused, in its own commit.
   - **Log** everything else in a new `docs/CLEANUP-REPORT.md` (what, where, why it looks redundant, what removing it
     would risk), plus a blocker entry for anything needing a decision.
   - **Don't** refactor live systems in this phase.
5. **Hide development tools from players:** the Enter Arena button goes. The designer panel, flight recorder download
   and `run-report` stay, behind a debug flag (`?dev` in the URL, or the existing debug menu).
6. **Merge into `main`.** It's a fast-forward today (the branch is 76 ahead, 0 behind); check the shared ship drawing
   (`sr-art.js`) in the hangar and in `space.js` with `art-smoke` and a manual look.
7. **⏸ Stop for the designer** with the clean-up report.

### S1. 3.5's campaign scene

- A new scene, `SR.go('space35', {mission})` (`game/js/space35.js` plus its HUD), running 3.5 **without the Arena**: no
  picker, no ruleset list, no designer panel unless in dev mode.
- **The demo's content stays as the test fixture:** the three wings, the freighter, and Patrol Sweep, used by the smoke
  tests and by a dev-only "test opportunity" entry.
- **The flow:** the Missions tab → the planning windows → the mission → the debrief → back to the base. The scene owns
  no campaign state; S6 connects it.
- **Proof:** a test wing flies Intercept Transport from the Missions tab. It isn't yet wired to the campaign's results.

### S2. Ships: the database, hardpoints, attachments

- **Add the Brickbat and FL-400 rows to `db.json`** (from `HC35_CLASSES`).
  - **Brickbat:** CORE Assembly, size 6, a small pad; buyable and stealable.
  - **FL-400:** General Astronautics, size 10, `noLand`, not ownable until the Fleet feature exists.
- **Review the whole ships database for the new gameplay.** List what 3.5 uses and what it ignores: the dial's
  bank, turn and minimum speeds; the old per-arc values; fields only `space.js` reads. Write the review as a table in
  `docs/SHIPS-REVIEW.md` with a recommendation per stat (keep, change meaning, or retire after S11), and **don't
  remove anything until the designer has read it.**
- **Hardpoints for every ship.** Every ship row gets `hardpoints`: slot types and counts (primary weapon, secondary,
  pylon/attachment, internal). Every owned or enemy ship has its own **configuration**: what's fitted where.
  - **Enemy rows** carry their configuration too, so a pirate Cross can be fitted differently from a stock one.
  - **The prologue's Cross** starts pre-modified with missiles; a stock Cross has none.
  - High Command's `HC_LOADOUT` goes; the configuration replaces it.
- **The attachments:**
  - **Bombs** (pylon; capital-killers);
  - **Cargo pods** (pylon; carry 2 containers);
  - **Boarding party** (internal; needs passenger room: the Graf, the Brickbat);
  - **Boarding pod** (pylon; lets a ship with no passenger room board);
  - **Missiles** (secondary);
  - plus today's weapons and attachments (`G.shipKit`).
- **The Graf becomes the usual boarding craft** in leaders' plans and the needs text. A Brickbat with a boarding pod
  can still board.

### S3. Wings ⏸

**The model:** `G.wings = [{id, name, leaderId, members:[{pilotId, shipId}]}]`, with a `MIGRATIONS` entry. An existing
save puts every pilot with a ship into one wing, led by the highest level, and names it.

**Rules:**
- Only wings fly space missions.
- A pilot and ship outside a wing can still be **an asset**:
  - a Graf (with its pilot) on a ground mission, as today's transport and fire support;
  - a ship on a space mission where it gives a benefit (a Graf as a boarding or rescue craft, called in like a
    Reserve).

  **Ask the designer** which assets need a wing and which don't, and log the interim choice.
- **A new pilot joining** is prompted at once: "Assign {name} to a wing" (the wings listed with free ships), or "Start a
  new wing". This can't be skipped while they have a ship. A pilot without a ship can wait.
- **In the Hangar** (or a new Wings panel there), the player can:
  - move a pilot to another wing at any time (not while that wing is out on a mission);
  - remove a pilot from a wing;
  - make a member the wing's leader in place of the current one;
  - rename a wing.
- **Wing size:** 1 to 4 ships for now (placeholder, logged); the High Command doc's "2–5" said squadrons come later.
- **The Wing Leader:** the leader is the wing's decision-maker in 3.5 (requests, help, field decisions). The meta
  layer's Wing Leader post (traits, bonuses) is an M-entry for later.
- **⏸ Stop for the designer** with screenshots of the wing screens.

### S4. Refit

- **Refit is a tab of the ship inspector screen.** It shows the ship's hardpoints and what's fitted, and swaps
  attachments from what the player owns (`G.shipKit`, plus crafted or bought attachments).
- **Timing:** instant with an Aerogineer, 2 days without (as today's Refit unlock). Invalid fits (a boarding party on a
  ship with no passenger room) are refused with the reason.
- **The planning windows' loadout controls** (Bombs / Cargo pods / Boarding party) become a read-out of each ship's
  configuration, with a link to Refit. No mission-time changes.

### S5. Placeholder Crafting

- **A Crafting tab in the Arsenal**, marked as a placeholder. A list of recipes: the asset, what it unlocks, its cost in
  basic resources (credits, supplies, materials), the time (0 days for now), and a Craft button.
- **Recipes** (use the proposal's crafting costs as placeholders, logged in a blocker, until the designer approves them):
  - Unmanned Ram;
  - Nuclear-tipped Ram;
  - Fire Ship;
  - Minefield;
  - Interdictor Buoy;
  - Comms Relay;
  - Rescue Tug;
  - plus the boarding pod and the other attachments from S2.

  **Spoofed Orders** come from intel work (S6), not crafting. **Call the Pirates** is a Black Market hire.
- **Crafted assets go into an inventory** (`G.assets`, counted). The plan's asset slots draw from it. **A spent asset is
  used up**; an unspent one returns.

### S6. Results in and out ⏸

**In (the sim reads the campaign):**
- **Pilots:** skills, injuries, wear, mood, rank, hero status and traits.
- **The mapping table** (decision 10): every rebel trait → its persona effect and its help weights (`TRAIT_AID`);
  `friends`/`rivals` → the friend and rival terms. Write it as data, and log every trait that maps to nothing.
- **Ships:** start at their **stored hull %** (add a hull-fraction field to the sim's ship build), with their
  configuration, tune, frame and pre-flight effects.

**Out (the campaign's mission result):** the scene returns the result `space.js` returns today (`{kind, missionId,
days, win, people[], fighters[], salvage}`), so the debrief, report and `applyDebrief` work unchanged, plus 3.5's extras:
- the primary's outcome (done, partial, failed, aborted, or replaced, per §1's new-objective rule);
- the secondaries;
- the rewards (the stand-ins, in campaign resources);
- surrendered cargo;
- per-pilot **XP, kills and skill use** (the sim tracks no XP today: count kills, assists, subsystems, hits taken, time
  under fire, and map them to `sk` training);
- Exposure.

**Pods** (decision 4):
- Picked up → injured.
- Lost → dead, via the Infirmary's Critical Condition rule.
- Captured → `state:'captured'` with a rescue lead, treated as dead until M-2's capture system exists. Log it.
- The old "shot down: 15% dead" rule doesn't apply to 3.5.

**Intel, Exposure, Leads** (decision 11):
- Dig deeper costs 1 `G.intel` each.
- Firebrand Broadcast adds `G.exposure` (placeholder +5).
- Each escaped witness (an escort or the freighter jumping) adds +2 and may create a Bureau Lead (placeholder 25%).

### S7. Opportunities from Sources, scaled to the force

- **Cast templates:** `Vulnerable Freighter` becomes a template. **Intercept Transport** and **Tanker Grab** are its two
  variants (different cargo, escort and reward profiles), replacing their off-screen dice rolls.
  - A Source reveals one as a **space opportunity** on the Missions board.
  - **The Source's level sets which modifiers are hidden** (its `subtle` rule).
- **Scaling** (decision 3): the escort and the response are sized to the wings the player sends, read from the plan at
  Launch, so one wing (even one ship) faces a proportionate fight. The rule is data on the template (`scale: {per wing:
  …}`), logged as a placeholder.
- **The rename:** the campaign's existing `G.opps` intel jobs become **leads** in the UI. Rename the code too, with a
  migration.
- Patrol Sweep becomes a second template, revealed by a Source of the right kind (ask the designer which).

### S8. Planning merged

- **The Missions tab:** the K6/W mock becomes the campaign's own for space. Real Sources, real opportunities, and real
  requirements (fuel, free wings, ships at hull ≥ 60%, configurations).
- **The planning windows** replace the campaign's planning window for space missions.
  - Window 3 lists **the player's wings** (Strike, Reserve, Stay home).
  - Assets come from the inventory (S5).
  - Fuel is paid for wings that fly, **Strike and Reserve** (logged: does a Reserve that's never called burn fuel?
    Interim: half).
  - Support jobs apply (§4).
- Ground missions keep the campaign's existing planning window.

### S9. The leaders' new rules

- **The new-objective request** replaces the automatic fallback.
  - When the primary can't be done, the first wing leader asks: "We can't {primary}. New orders?" The answers are every
    primary still possible on this cast, plus **Retreat**.
  - It's a must-answer request (the 0.3 × slow-down applies). With no answer, the leader picks by persona: eager → the
    most aggressive, steady → the safest, else Retreat.
  - Logged as a field decision. A replacement pays without the Accomplished bonus.
- **Leader death:** a big nerve hit to its own wing (placeholder −35), a small one to other wings (−8). **Brave** halves
  it for that pilot; other resilience traits come through the mapping table.

### S10. Support jobs re-homed

Implement §4's new texts (the designer is copying them into the Google Docs). Each one's numbers go on the panel and
are logged as placeholders.

### S11. The prologue, then retiring `space.js` ⏸

- **Small 3.5 opportunities** replace Torch the Depots (beat 8: one ship against depots, a one-ship wing) and Take Out
  Instructor, and the Haven Rock sim deck launches 3.5.
- When nothing reaches `space.js`, it and its tests go to the archive. **Rewrite or replace** the smoke tests that drove
  it (about 14, including `prologue-smoke`, `economy-smoke` and `missions-smoke`, which play Torch the Depots to a
  win).
- **⏸ Stop for the designer** before the archive move.

---

## 4. Support jobs: the new texts

Implement these. The designer is copying them into the Support Specialties doc; the numbers are placeholders.

| Unlock | New text |
|---|---|
| **Mission Support** (every Mission Control specialist) | The squad or wings start steadier (+10 Cool), **in space your transmissions reach the wings 25% faster**, and an unflown mission is likelier to succeed |
| **Vectoring** (Flight Controller 3) | The briefing reveals **one hidden modifier**, and the plan map shows the enemy's sensor rings exactly |
| **Scramble** (Flight Controller 7A) | A supported space mission can take **one more wing, as a Reserve**, beyond the opportunity's force limit |
| **Formation Calls** (Flight Controller 7B) | Wing leaders **answer calls for help from other wings more readily**, and reach twice as far |
| **Intercept Plot → Quiet Jump** (Flight Controller 11) | A wing that jumps in inside an enemy sensor ring isn't spotted on arrival; detection starts from zero |
| **Rapid Turnaround** (Flight Controller 15A) | No change |
| **Tight Wing** (Flight Controller 15B) | Enemy fire against supported ships spreads 15% wider |
| **Emergency Jump** (Flight Controller 19) | A commander power: once, free and **with no comms delay**, every wing jumps out with no losses; the mission fails |
| **Evac on Call** (Combat Support 11) | Ground unchanged. **In space:** once per supported mission, a free Rescue Tug collects one ejected pilot's pod |
| **Refit** (Aerogineer 3) | Changing a ship's attachments at Refit takes no time with an Aerogineer, 2 days without |
| **Fighter Tuning** (Aerogineer 7A) | Permanently harder to hit (enemy fire spreads 10% wider) or faster (+10% top speed). One tune per ship |
| **Heavy Frames** (Aerogineer 7B) | No change (the Brickbat counts as a bomber) |
| **Pre-flight Checks** (Aerogineer 11) | Up to 2 ships start with **+25% shields** and a Boost Shields charge ready |
| **Scavenger's Eye** (Aerogineer 15B) | Enemy ships destroyed, **and cargo modules blown off a freighter**, are salvaged for Materials |

---

## 5. Tests

Live smoke tests only (the archived ones aren't run). Add:
1. **Archive:** main boots, the campaign plays its prologue to the frontier on `space.js` (until S11), the Arena isn't
   reachable without `?dev`, and nothing in `tools/` imports an archived file.
2. **Scene:** `SR.go('space35')` from the Missions tab plays a scripted opportunity to the debrief and back to the base.
3. **Database:** every ship row has `hardpoints` and a valid default configuration. The Brickbat and FL-400 load. A
   pirate Cross can carry a configuration a stock one doesn't.
4. **Wings:**
   - the migration builds one wing from an old save;
   - a new pilot can't be left wingless while they have a ship;
   - change, remove and make-leader work;
   - a ship outside a wing can't be picked for a space mission but can be an asset.
5. **Refit:** valid fits apply (instant with an Aerogineer, 2 days without); invalid ones are refused with a reason.
6. **Crafting:** crafting costs the resources; a crafted asset fills a slot; spending it removes it; an unspent one
   returns.
7. **Results:**
   - a scripted mission's injuries, deaths, hull changes, XP, rewards and Exposure land in `G`;
   - the pod outcomes map as decision 4;
   - a ship starts at its stored hull %.
8. **Opportunities:**
   - a Source reveals Intercept Transport, and its hidden modifiers follow the Source's level;
   - one wing faces a smaller escort than three wings do.
9. **New objective:** a scripted impossible primary raises the request with the possible primaries plus Retreat, and
   timing out picks by persona.
10. **Leader death:** its own wing loses more nerve than another wing does; Brave halves it.
11. **Support jobs:** each §4 effect, on and off.
12. **S11:** the prologue plays through on 3.5 with no `space.js` call.

---

## 6. Blockers to add (next free: C-89, M-40)

- **C-89:** the switch's decisions (§1) and what was chosen building each phase.
- **C-90:** the clean-up report's findings that need a decision.
- **C-91:** placeholders. Wing size 1–4, crafting costs, Exposure and Lead numbers, the scaling rule, the Reserve's
  fuel, leader-death nerve, the support jobs' numbers.
- **M-40:**
  - phone and iPad support for 3.5;
  - the capture system for captured pilots (with M-2);
  - the Fleet feature (the FL-400 as a player ship);
  - the real crafting system;
  - the meta layer's Wing Leader post;
  - squadrons;
  - K7, the HUD layout, waiting for the mock-ups.
- Mark **M-35**, **M-36** and **M-39**'s items that this switch covers as resolved, with commits.
