# The SB Test ruleset: handoff

**For:** Claude Code in `DoofWiz/star-rebellion`.
**Save as** `docs/ARENA-SB-HANDOFF.md`.
**Read first, in order:** `docs/ARENA-HANDOFF.md` (the Arena and the v2 sim — everything shared lives there and is
not repeated here), then the *Star Rebellion — Space Combat Core Redesign v0.1* Claude Doc, whose **SteamBirds
research (9 Oct)** tab is this ruleset's design source: the designer's notes there are verbatim and authoritative
where this file is silent.

**What this is.** The Arena gains a second, rival combat ruleset. After **Enter Arena** the player first picks a
ruleset — **"SR V2 Combat"** (the `docs/ARENA-HANDOFF.md` §3 sim, unchanged) or **"SB Test"** (this file: the
SteamBirds-informed model) — then the scenario, so the same scenario can be played under both and compared head to
head. The two rulesets deliberately differ on several axes at once (movement model, resolution model, pilot
expression); they are rival gestalts to be *felt*, not controlled variables, and the panel's toggles are how good
pieces cross-breed afterwards. Nothing in this file changes the v2 sim: every v2 behaviour and every existing smoke
test must pass byte-for-byte as before.

---

## 0. Ground rules

Everything in `docs/ARENA-HANDOFF.md` §0 applies verbatim: branch from `main`, blockers in the same commit, no `G`
changes, Arena text is designer-facing, placeholders as getter-exposed named constants, copy-don't-refactor from
`space.js`, `db.js` is generated, every smoke test before each commit. Additions:

- **Dependency:** this builds on the Arena chassis — `docs/ARENA-HANDOFF.md` phase **A1** (boot, scene, scenario
  loader, no-save) must exist first. The B phases below can then run before, after or interleaved with A2–A5 at the
  designer's direction; the head-to-head comparison needs v2 through A3 and SB through B4.
- **Commit per phase** B1 to B5 (§6).
- Where this file and the designer's verbatim notes disagree, flag it as a blocker reading rather than silently
  picking — §8 lists the two known deliberate deviations.

---

## 1. The ruleset picker

- Entering the Arena now shows **two choices first — "SR V2 Combat" and "SB Test"** — then the scenario picker.
  (This amends `docs/ARENA-HANDOFF.md` §2.2; a matching note has been added there.)
- A ruleset is a module behind one small interface the `arena.js` scene drives:

```js
/* game/js/arena.js */
const RULESETS={
  v2:{key:'v2', name:'SR V2 Combat', mod:SIM2 },   // docs/ARENA-HANDOFF.md §3 (game/js/sim2.js)
  sb:{key:'sb', name:'SB Test',      mod:SIMSB},   // this file (game/js/sim-sb.js)
};
// mod: {build(scenario,rng), planInput(ev), tick(dtSim), draw(ctx,now), panelGroup(), metricsRecord()}
```

- **Shared between rulesets** (owned by `arena.js`, per the Arena handoff): the scenario entries (each may carry an
  optional `rulesets:['v2','sb']` allowlist; absent = both), the PLAN→EXEC loop and `EXEC_LEN`/`SIM_SPEED` sliders,
  seeded RNG and restart, the designer-panel chassis (each ruleset contributes its own slider group), the no-save
  guarantee, `DBGarena` (gains a `ruleset` key), and metrics (every record gains a `ruleset` field).
- **Not shared:** everything about how ships move, shoot and resolve. `sim-sb.js` copies what it needs from
  `space.js`/`sim2.js` under the copy-don't-refactor rule.

---

## 2. SB movement: grab the craft, drag the line

- **The player grabs the ship itself** (no control marker) and drags; the trajectory is a smooth per-pixel curve,
  previewed live. The envelope is **continuous**, derived from the same `db.js` fields the dial uses:
  - arc length per segment is bounded by the ship's speed range (`straight_min/max` × `SU`);
  - heading change per unit of arc length is capped by the ship's tightest turn (from its turn template /
    `TURNS`) — the curve visibly refuses to tighten past its minimum turn radius.
  The drawn line is always the flyable line; there is no snapping to discrete manoeuvres and no legality check
  after the fact.
- **Action points.** `AP_PER_ROUND` (*placeholder* 2). A round's movement is up to two **segments**, each costing
  1 AP; every segment type costs the same. Unspent AP does nothing in v1 (a reading, §8).
- **Segment types everyone has:**
  - **Basic Movement** — the drag above.
  - **Fly Defensively** — no firing during the segment; incoming fire is heavily degraded (`FLYDEF_FACTOR`,
    *placeholder* 0.25× effective hit profile, with a weaving animation) rather than impossible; homing weapons
    ignore the protection. A panel toggle `flydefImmunity` switches to the designer's literal version (cannot be
    hit except by homing) so both can be felt — deviation logged, §8.
- **Movement modifications — the pilot's moveset.** Granted by the pilot on top of the ship's fixed envelope; a
  modified segment still costs 1 AP:

  | Mod | Does | Placeholders |
  |---|---|---|
  | **Boost** | Segment speed ×`BOOST_MULT` (2.0); turn-rate cap ×0.25 — fast and nearly straight | |
  | **Drift** | Nose (and so weapons) decoupled from velocity for the segment: the player drags the path, then sets a facing with a second handle; the ship fires along the nose while travelling the path | the headline verb |
  | **K-Turn** | The dial's K: forward then an instant 180 flip at the segment's end; speed capped at 3 | |
  | **Loop** | A 180 facing flip with minimal displacement at the end of the segment (K-Turn without the run-up; the two may merge — a reading, §8) | |
  | **Barrel Roll** | Lateral displacement `BARREL_LAT` (*placeholder* 1 SU) during the segment, heading kept | |

  Moveset data lives in an `ARENA_MOVESETS` table in `sim-sb.js` keyed off the scenario pilot presets
  (*placeholders*): green `[]`, regular `[boost]`, veteran `[boost, drift]`, ace `[boost, drift, kturn, barrel]`.
  It graduates to `db.json` only if the ruleset wins.
- **Acceleration flair** (`SPEED_FLAIR` toggle, on): speed eases along the curve — slower through minimum-radius
  turns, faster out of them and on straights. Visual pacing only in v1; the segment still covers its planned arc
  length.

---

## 3. SB shooting: projectiles, lock as a dial, glancing geometry

No d20 anywhere in this ruleset; the VS/need UI stays hidden. Misses are things that visibly fly past.

- **Bursts.** While a ship's current target sits inside its firing band (arc + weapon range), each gun fires a
  burst of `BURST_N` (*placeholder* 4) projectiles every `BURST_EVERY` (*placeholder* 2.0 s) — frequent, not
  SteamBirds-constant. Projectiles are simulated: speed `PROJ_SPD` (*placeholder* 1400 u/s), lifetime from weapon
  range, per-tick segment-vs-hull intersection. A projectile that doesn't intersect simply misses.
- **Spread is the pilot.** Burst spread starts at `SPREAD_BASE` (*placeholder* 6°), narrowed by the pilot's **Aim**
  (the `skillBonus` scale) and widened as **nerve** falls — a panicking pilot's bursts visibly wander. This is the
  stat mapping that keeps "pilots win fights" true without dice: Aim = tracking quality, nerve = steadiness.
- **Range asymmetry.** Ballistic/plasma spread grows `RANGE_SPREAD` (*placeholder* +3°/RU) beyond range band 1 —
  accurate close, poor far. Lock-enabled weapons (missiles) are the opposite: they need lock ≥ `MISSILE_LOCK`
  (*placeholder* 60%) and a minimum range `MISSILE_MINR` (*placeholder* 1.5 RU) — enabled at distance, disabled in
  a knife fight. Missiles home (turn-rate limited), consume ammo as today, and ignore Fly Defensively.
- **Lock is continuous, 0–100%, per target.** It gains at `LOCK_GAIN` (*placeholder* 40%/s) scaled by centring —
  full rate with the target at the arc's centre, zero at its edge — and decays at `LOCK_DECAY` (*placeholder*
  50%/s) once the target leaves the front hemisphere. It replaces the 3-level stacking lock in this ruleset.
- **Damage = weapon × impact × lock.** Per projectile: the weapon's damage, scaled by impact angle against the
  target's hull (an ellipse from ship size in v1) from `IMPACT_MIN` (*placeholder* 0.2) at a shallow skim to 1.0
  dead-on, then multiplied by `1 + lock% × LOCK_DMG_MAX` (*placeholder* 1.0 — a 100% lock doubles damage). Skims
  rattle; centred, locked shots ruin.
- **Kept from the existing game, copied as is:** fore/aft shields and `applyDamage`'s shield→armour→hull order,
  `CRITDEFS` and criticals (a critical chance rides direct hits: `CRIT_DIRECT`, *placeholder* 10% at impact ≥ 0.8),
  and the nerve meter with its existing gains and losses (`adjCool`).

---

## 4. SB orders: one movement + one action

Per craft, each PLAN: the movement (§2) and **one action** —

- **Angle Shields** / **Boost Shields** — the existing `shiftF`/`shiftR` and boost, unchanged.
- **Fix Critical** — clears one repairable critical (generalises the lead's self-repair; which crits are
  repairable follows `CRITDEFS`).
- **Lock In** — the existing +35 cool recovery, doubly load-bearing here because nerve is also spread.
- **Special Ability** (pilot, levelled/trained) and **Ship Ability** (a specific ship or attachment) — **stubs** in
  v1: the slots render, the lists are empty bar the lead's self-repair, each stub carries a `// DESIGN OPEN` note
  (the prologue's stub pattern), and the gap is logged (§8). Interrupts are **not** in SB v1 — they are v2's
  pillar; whether SB gains them is a post-comparison cross-breeding question, not a build task.

---

## 5. SB enemies

Doctrine stays the opposition's identity, driving a continuous planner instead of the fitter: the doctrine's goal
(start with `pursuit`, as v2's A2 does) feeds a pure-pursuit steering function clamped to the ship's continuous
envelope, auto-building its segments. Enemies fire by the same burst rules — a green Hegemony pilot's wide spread
is the asymmetry made visible. Panic and `flees` behaviour carry over. The remaining doctrines arrive in whichever
ruleset reaches its doctrine phase first and are then ported across (one goal function, two planners).

---

## 6. Build phases

| Phase | Build | Playable proof at the end |
|---|---|---|
| **B1** | §1: the ruleset picker and interface; v2 wired through it untouched; `sim-sb.js` skeleton (ships fly straight lines) | Both rulesets load `e1_fox`; v2 plays exactly as before |
| **B2** | §2: continuous drag + envelope clamp, AP segments, Fly Defensively, acceleration flair | Drag smooth legal curves for a Talon and the freighter; two-segment turns |
| **B3** | §3: projectiles, bursts, spread, continuous lock, glancing damage, missiles; resolution cards for bursts | A 1v2 chase with live projectile fire |
| **B4** | §4 actions + §2 movesets (Drift with its facing handle is the acceptance test) | **SB-1 playable — the comparison gate** |
| **B5** | §5 doctrine planner, SB panel group complete, SB experiments + metrics | The SB experiment set runs |

---

## 7. Experiments

| Id | Setup | Question |
|---|---|---|
| `sb1_fox` | `e1_fox` under the SB ruleset | The E1 question, head to head: which ruleset makes committing-and-flying feel like being a wily ace? |
| `sb2_drift` | 1 ace (Drift in moveset) v 2 `pursuit` | Does Drift deliver shooting-at-your-pursuer-while-fleeing — the fantasy's single verb? |
| `sb3_count` | 4 then 8 player ships, projectiles live | Does the screen stay readable with simulated fire at the ship cap? |

The comparison itself is the deliverable: the same seed and scenario played under both rulesets, metrics side by
side (`ruleset` field), and the designer's felt verdict recorded in the blockers. The design doc's success criteria
(E1's "tell someone about it" moment) apply to whichever ruleset is being judged.

---

## 8. DESIGN_BLOCKERS entries to add

- **New: "SB Test ruleset: decisions and readings."** Record:
  1. The Arena runs **two rival rulesets behind one picker**; nothing is shared below the arena chassis, and v2 is
     the control (byte-identical behaviour and tests).
  2. **SB movement is a continuous envelope** derived from the same `db.js` dial fields (speed range, minimum turn
     radius) — the dial stays the balance backend without discrete manoeuvres.
  3. **SB resolution is projectiles**: no d20; Aim → spread, nerve → steadiness, lock → damage multiplier; glancing
     vs direct by impact angle.
  4. **Two deliberate deviations from the designer's verbatim notes**, each with a toggle or stub so his literal
     version can be felt: Fly Defensively defaults to a heavy degradation rather than immunity
     (`flydefImmunity` restores his wording), and the AP system is capped at a flat 2-segments-per-round with no
     spend economy yet.
  5. **Readings:** unspent AP does nothing in v1; K-Turn and Loop may merge after play; lock is stored per target
     and survives target switching; interrupts stay out of SB v1; Special/Ship abilities are empty stub slots.
- **New: "SB Test: placeholders."** Every *placeholder* above (`AP_PER_ROUND`, `FLYDEF_FACTOR`, `BOOST_MULT`,
  `BARREL_LAT`, the moveset presets, `BURST_N`, `BURST_EVERY`, `PROJ_SPD`, `SPREAD_BASE`, `RANGE_SPREAD`,
  `MISSILE_LOCK`, `MISSILE_MINR`, `LOCK_GAIN`, `LOCK_DECAY`, `IMPACT_MIN`, `LOCK_DMG_MAX`, `CRIT_DIRECT`), each
  getter-exposed and on the SB panel group.

---

## 9. Tests

Extend `tools/arena-smoke.js` with an SB section (same Playwright pattern, `#arena`):

1. **Picker:** both rulesets listed; `e1_fox` loads under each; after a v2 run and an SB run, the campaign save key
   is still absent.
2. **v2 is untouched:** the entire existing v2 test section passes unchanged with the picker in place.
3. **Envelope:** a drag whose heading rate exceeds the ship's turn cap produces a clamped curve at the cap; segment
   arc lengths respect the speed range; a green pilot's plan offers no Drift, an ace's does.
4. **Projectiles:** a shot only damages on geometric intersection (an offset target is untouched); a skim deals
   less than a direct hit on the same weapon; burst spread for a panicking pilot is wider than for the same pilot
   calm.
5. **Lock:** lock% rises with the target centred, falls behind the firer; a missile is refused below
   `MISSILE_LOCK` and inside `MISSILE_MINR`, and ignores Fly Defensively.
6. **Determinism:** same seed + scripted orders → identical end-state hash, per ruleset.
7. **Metrics:** SB records carry `ruleset:'sb'` and burst/hit counts.

All pre-existing `tools/*-smoke.js` pass unchanged.

---

## 10. Done means

- [ ] B1–B5 built. Enter Arena → ruleset choice → scenario; `e1_fox` plays under both rulesets from one cleared
      browser; `sb1_fox`–`sb3_count` run.
- [ ] v2 and the campaign are untouched: no behaviour change outside `arena.js`'s picker and the new `sim-sb.js`,
      and every pre-existing smoke test passes unchanged.
- [ ] Drift works end to end: path dragged, facing set, shots fired along the nose while fleeing along the path.
- [ ] Every SB constant is named, getter-exposed and on the SB panel group; both deviations from the verbatim notes
      have their toggle or stub.
- [ ] The §8 blockers are added. All smoke tests pass, the SB section of `tools/arena-smoke.js` included.
