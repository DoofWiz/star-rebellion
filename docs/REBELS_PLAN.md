# Rebels — Implementation Plan

> Source: the "Rebels" design doc on the designer's Google Drive (user stories, 45 Character
> Traits, ~70 Rebel Traits), read 2026-10-01. Compared against `game/js/base.js`, `ground.js`,
> `space.js` and `docs/GDD.md` §5. **Plan only, nothing implemented yet.**

## 1. Where we are vs. the doc

A rebel today is one flat object in `G.people` (`base.js` ~L163, ~L1018):

```
{id, name, role, level, xp (0..1 fraction), assign, injured (days), equip[], ship, spec, bio}
```

| Doc says | Game has | Gap |
|---|---|---|
| Name from first/last pools | Hand-authored `RECRUITS` table (name + bio), 8 Soldiers / 9 Support / 6 Pilots, each used once (`holdRecruit`) | Generator; the pool runs dry |
| Level 1–20, 100 XP/level | Level is unbounded in code; `rankFor()` indexes `level` 0–9. XP is 0..1 (mission rewards 0.1–0.35) | Cap 20; **rank is currently derived from level**, doc makes rank a separate promotion track |
| Character Trait (1, at birth) | None in `base.js`/`ground.js`. `space.js` has string traits (`Lucky`, `Veteran`, `Friends: Joss`) on a hard-coded cast; `startPlan` hard-codes Sera = Lucky | Whole trait system |
| Rebel Traits (max 3, earned) | None | Whole system, needs mission telemetry |
| Morale 0–100 per rebel, 5 bands, affects performance, 0 = desert | One global `G.morale` (12 uses): rest +0.5/day, mission win/lose ±6–8, loss −10. No effect on combat | Per-rebel morale, bands, effects, desertion |
| Skills (Aim, Constitution, Agility, Presence / Aim, Cunning, Focus, Presence), cap 50 | Only Aim: `soldierAim`/`pilotAim` = f(level, spec). Soldier hp flat 100, ground cool flat 65, pilot cool = 55+4·level | 6 new skills and plumbing to the combat scenes |
| Ranks: Army / USMC / Army / USAF enlisted; officer at L5 + Sergeant | Soldier/Marine use Army enlisted, Pilot/Support use an officer-style `RANKS` list; level-driven | Per-type ladders, promotion by missions, officer choice |
| Specialty at L3 via Training Center, Rookie until then | Built (`SPECS`, `startSpec`) — Soldier & Pilot only, 3 of 16 live | Add "Rookie" label, Marine/Support handling, finish effects |
| Types: Soldier / Marine / Support / Pilot / Hero | Soldier / Pilot / Support in play, Marine in code paths only (no boarding theatre) | Marine = data-only for now; Hero (see §3) |
| Gear: slots (primary, secondary, gadgets), auto-equip from pool | `equip[]` list; Gear Grid exists, slot limit not enforced (ROADMAP Phase 5 left this) | Slot model + auto-equip |
| Dossier; New Recruit cards (multiple, Recruit/Dismiss, no rank) | `person` window + `dossierHead`; `recruit` window is one card, Recruit/Dismiss already there | Extend both; multi-card |
| Recruit via missions and a Command Center "Recruit new Revolutionaries" task | Recruits come from Source signals and Rescue Dissident only | New Command Center task |
| Hero via hidden stat at mission end | Nothing | Whole system |

## 2. Decisions (settled 2026-10-01)

1. **Heroes:** build the hidden stat and Hero data model, but the New Hero screen waits for Rev Level 2.
2. **Marines:** data-only type for now (ranks, skills, gear, specialty); no Level 1 recruits, no boarding mode.
3. **Rank decoupled from level:** level-ups are announced as "reached level N"; rank comes from mission count (Phase 5).
4. **Morale:** `G.morale` stays as the base mood (average of rebels plus base events); `p.morale` is added as the per-rebel source of truth.
5. **Injury depth:** a separate Injury v2 phase later; traits that depend on it (physical changes, critical injuries, exhaustion) stay `live:0` until then.
6. **Recruitment:** rebels are recruited by issuing a task in the Command Center. The doc's timing sentence was cut off; the task takes a few days and then opens the multi-card New Recruit screen (timing to tune in Phase 6).
7. **Pilot ranks:** true to life — the real USAF enlisted ladder (Airman Basic upward), not "Private". Soldier/Support use Army enlisted, Marine uses USMC enlisted.
8. **Doc gaps** (the "Failed to Save" / Redemption reference, etc.): skipped for now.

Still open, low priority: whether the Heavy/Light Sleeper traits get an exhaustion system or are cut.

## 3. Architecture

Everything new hangs off the rebel object, so existing code keeps working:

```
p.first, p.last           names (name stays = first + ' ' + last)
p.charTrait               key into CHAR_TRAITS (exactly one)
p.traits[]                earned Rebel Traits, max 3: {k, with?}   // 'with' = other rebel id
p.morale                  0..100   (band derived)
p.skills                  {aim, con, agi, pre} | {aim, cun, foc, pre} | all six (Hero)
p.skillXp                 hidden per-skill experience from missions
p.rank                    index into the type's ladder, p.rankOfficer flag
p.missions                count completed (+ per-type counts for Mission Specialist)
p.stats                   lifetime kills, downs, survived, narrow escapes… (feeds trait grants)
p.heroChance              hidden
p.gear                    {primary, secondary, gadgets[]}  (replaces equip[])
```

New module `game/js/rebel.js` (loaded before `base.js`) owns: name pools, trait registries, `genRebel(type, opts)`, skill derivation, morale, rank ladders, and an **effect query** API so combat code stays thin:

```js
Rebel.fx(p, 'accuracy', ctx)   // sums trait/morale/skill modifiers for a stat
Rebel.on(p, 'downed', ctx)     // event hook: updates morale, may grant a Rebel Trait
```

Each trait is a table row `{k, name, quote, live, fx:{…}, on:{…}}`, so adding or tuning one never touches combat code. Ground/space take a plain data blob (`squadEntry` → `mkU`, `flight[]` entries) produced by `Rebel.combatProfile(p)`; they never read `G.people`.

Mission telemetry goes the other way: the debrief currently returns `{id, xp, state, dur}` per person (`applyDebrief`, `base.js` ~L3860–3925). Extend it to `{id, xp, state, kills, downs, revived, hitsTaken, lethalAvoided, aloneAtEnd, …}` plus squad events (`who downed whom / who died`), emitted by `ground.js` and `space.js`.

## 4. Phases

### Phase 1 — Data model, names, XP/levels, save migration — **built**
- Add `rebel.js`: first/last name pools (~60 + ~60 per flavour, no duplicates in the roster), `genRebel(type)`; keep the authored `RECRUITS` entries as named "story" recruits so existing flavour is not lost (Mira Osk, Sera, etc.); generated rebels get a bio from a small template set.
- Level cap 20, 100 XP/level; `levelUp` stops at 20, news line reworded (decision 3).
- Migration in `restoreCampaign` (follows the existing `if(x===undefined)` pattern): backfill `first/last`, `charTrait` (deterministic from id so reloads are stable; Sera keeps Lucky, Joss/Petra keep their space.js traits), `morale` from `G.morale`, `rank` from current level, `skills` from level, `gear` from `equip`.
- Opening cast (Joss, Dax, Runa, Kel) get authored traits.
- **Done when:** old saves load, a new campaign boots, roster shows names/levels unchanged, `tools/autoplay.js` still finishes a run.
- **Built:** `game/js/rebel.js` (name pools, `gen`, `addXp` with the level-20 cap, `migrate`), loaded before `base.js`. Recruits now fall back to a generated, unique name when the authored `RECRUITS` list runs out (the old fallback reused `RECRUITS[role][0]`, duplicating a name; the bot hit this five times in seed 1). Level-ups are announced as "reached level N". Not yet in this pass: the `charTrait`/`morale`/`skills`/`rank`/`gear` backfills, which arrive with their own phases. Autoplay: seeds 1–3 finish with no page errors; seed 2 is unchanged, seed 1 escalates on day 98 instead of 101 because of the generated recruits.

### Phase 2 — Character Traits (45) — **built**
- Registry with `live` flags. Group by what they need:
  - *Ground now:* Clumsy (grenade drop, jam — Akli jams already exist), Nervous (round-1 initiative), Brave/Cowardly (cool delta in `adjCool`), Steady Hands (+1 aim), Short Fuse, Patient/Restless (Hold action, move speed), Neat Freak, Lucky/Unlucky (lethal-hit save, crit chance), Reckless/Cautious (Sprint, damage taken, speed), Perfectionist (+accuracy, acts last — engagement sorts by `aim*3+rint`), Hothead, Self-Preserving, Former Hegemony Soldier, Former Hunter (vision radius), Empathetic (nearby Cool recovery), Loyal.
  - *Base/economy now:* Quick/Slow Learner (XP), Former Mechanic/Engineer/Medic/Doctor (Maintenance Bay, Materials cost, `injured` recovery tick at `base.js` ~L1100), Smuggler (loot roll), Officer (+Intel on mission offer), Academic, Industrialist, Wealthy (credits on recruit), Streetwise/Criminal (Source risk), Charismatic, Pragmatic, Idealist/Cynical (morale rules), Former Pilot (ship assignment), Politician (Diplomatic Quarter task quality).
  - *Blocked, `live:0`:* Heavy/Light Sleeper, Strong/Weak (melee), Messy (gear loss), Intimidating (interrogation).
- Assign exactly one at generation, weighted so a squad is not all one flavour; Former-X traits bias the bio line.
- Show in dossier and New Recruit card (quote + one-line effect).
- **Done when:** every `live` trait has a one-line effect visible in the combat/base log or the dossier, plus a unit-style check in the autoplay bot that the modifier fires.
- **Built:** all 45 traits are in `rebel.js` (`CT`) with the designer's quote and a one-line effect; every rebel gets exactly one (generated rebels by role-weighted draw, the opening cast by bio: Joss Reckless, Sera Lucky, Dax Cautious, Runa Short Fuse, Kel Former Hunter, everyone else by a stable hash so reloads never change it). The dossier and New Recruit screen show a Character card, greyed "Effect soon" for traits not wired yet.
  - *Live in ground combat (20):* Clumsy, Nervous, Brave, Cowardly, Steady Hands, Short Fuse, Patient, Restless, Neat Freak, Lucky, Unlucky, Former Hegemony Soldier, Former Hunter, Empathetic, Reckless, Cautious, Perfectionist, Hothead, Loyal, Self-Preserving. Interpretations: Reckless's sprint bonus applies the round *after* sprinting (sprinters can't shoot); "Never surrenders" (Hothead) is moot for rebels.
  - *Live in space:* Lucky (existing), Steady Hands, Former Pilot, Brave, Cowardly.
  - *Live in the base:* Quick/Slow Learner (all XP now goes through `gainXp`), Former Medic/Doctor (faster recovery when posted to the Infirmary), Former Mechanic (faster repairs when posted to the Workshop), Wealthy (+250 credits on recruit), Former Smuggler (25% chance of an extra item after a ground win).
  - *Not live yet (17):* Heavy/Light Sleeper, Strong/Weak, Messy, Former Hegemony Officer, Former Engineer, Streetwise, Academic, Former Criminal, Politician, Industrialist, Intimidating, Pragmatic (each waits on a system that doesn't exist or is a later phase) and Charismatic/Idealist/Cynical (arrive with per-rebel morale, Phase 4).
  - Not yet threaded: the Marta's pilot and the rescued VIP in ground missions don't carry traits into the combat scene.
  - Test: `node tools/traits-smoke.js` drives every live ground trait through the real combat functions (and fails if one regresses); autoplay seeds 1–3 finish with no page errors, escalation on days 96 / 71 / 92.

### Phase 3 — Skills — **built**
- Derive skills (cap 50) from level + `skillXp` + trait/spec modifiers; Soldier/Marine: Aim, Constitution, Agility, Presence; Pilot: Aim, Cunning, Focus, Presence; Support: none; Hero: all.
- Plumb into combat: Aim → replaces `soldierAim/pilotAim` (keep the 1–5 range the scenes expect, mapped from skill); Constitution → soldier hp (currently flat 100 in `squadEntry`); Agility → on-foot speed; Presence → starting `cool` (ground flat 65, space `55+4·level`) and panic resistance; Cunning → repair/defensive outcomes; Focus → target-number to be hit (space).
- `skillXp` grows from what the rebel did in the mission (shots → Aim, damage taken → Constitution, sprinting → Agility, staying Cool under fire → Presence), awarded in the debrief.
- **Done when:** a level-10 soldier measurably differs from level 1 in hp/speed/cool, with each point a small increment (balance in Phase 10).
- **Built:** skills are derived, not stored: `skill = min(50, 5 + 1.6·(level−1) + earned)`, where earned (`p.sx`, per skill, max +15) comes from missions. Soldier/Marine: Aim, Constitution, Agility, Presence; Pilot: Aim, Cunning, Focus, Presence; Support none; Hero all six (the Hero type itself is Phase 10).
  - *Curves:* Aim reproduces the old level formulas for soldiers exactly (levels 1–9) and for pilots within one point, then keeps climbing to a new cap of 6; Constitution 100 hp at level 1, about +1.2 hp per point; Agility +0.4% speed per point; Presence raises starting Cool (ground 65→85 cap; pilots 59→85 cap) and shrinks every Cool loss by 0.5% per point; Focus adds up to +3 to the target number against a pilot; Cunning scales shield boosts and field repairs by up to +50%.
  - *Experience:* ground counts shots and hits (Aim), damage taken (Constitution), move/sprint orders (Agility), and holding Cool under fire or steadying from panic (Presence); space counts shots and hits (Aim), shots that missed them (Focus), shield, repair and evade actions (Cunning), kills and Lock In (Presence). Each scene's result now carries a per-rebel `sk` object; `base.js` turns it into experience (max +1.5 per skill per mission) in `applyDebrief`.
  - *UI:* the dossier and New Recruit screen show skill bars out of 50.
  - *Not yet:* Aim still applies to guided weapons for pilots (the doc says unguided only); Support skills stay absent; the Marta's pilot and the VIP don't carry skills into ground missions.
  - Tests: `node tools/skills-smoke.js` (curves, caps, role sets, squad and flight profiles, debrief training); I also drove one ground and one space mission end to end and checked the results carry `sk`. Autoplay seeds 1–3 unchanged (96 / 71 / 92).

### Phase 4 — Per-rebel morale — **built**
- `p.morale` 0–100, bands Very Low/Low/Middling/High/Very High, shown as a bar + word in dossier and roster.
- Inputs: mission win/loss, injuries to self/others, deaths, promotion, revolution progress (Rev meter), Rec Room/rest, character/rebel trait modifiers, Idealist/Cynical/Loyal/Charismatic rules.
- Effects: band → small combat modifier (aim/cool) and, in the base, nothing else at first; a Very Low band warns in the news feed.
- At 0 the rebel **deserts**: removed from `G.people`, news item, base-mood hit; refuse to desert a rebel currently on a mission (resolve after debrief).
- Recompute `G.morale` as the average so Rec Room and existing displays stay valid (decision 4).
- **Done when:** a run of failed missions drives some rebels out and a good streak raises performance; autoplay shows no mass desertion on a normal path.
- **Built:** `p.morale` (0–100, new and migrated rebels start at 60) with the doc's five bands. `G.morale` is now the base's mood: the average of everyone's, recomputed after every change.
  - *Events:* a win lifts the mission team +3 and everyone else +1; a failure drops the team −8 and everyone else −3; an injury costs the rebel −5 and their squadmates −2 (−0.5 for the rest of the base); a death costs everyone −6 and the mission team −10; a burned or silenced source −6 to −10; a liberated region +4 and Level 2 +8 for everyone; injured rebels lose 0.5 a day; resting gains 0.3 a day (0.6 with a Rec Room); everyone drifts 4% a day back toward 60.
  - *Traits now live:* Idealist (wins and defeats land 30% harder), Cynical (everything moves 30% less), Charismatic (+0.15 a day to every other rebel at the base per healthy Charismatic), and Loyal now also halves the morale hit from a death.
  - *Effects:* Very Low −1 aim and −10 Cool; Low −5 Cool; High +5 Cool; Very High +1 aim and +8 Cool (applied through `aimOf` / `coolOf`, so both combat scenes see it).
  - *Desertion:* a warning in the news at 20 or below; a rebel at 0 walks out at the next day tick (never mid-mission; mission rebels are frozen until they're back), and everyone else loses 3.
  - *UI:* a Morale row with number and band in the dossier and New Recruit screen, and a red ▼ on the roster for Low or Very Low.
  - *Not yet:* Phase 5's promotions will add their morale bump; relationship-driven morale (Friends, Rivals, Love…) waits on Phase 9; Heavy Sleeper's "immune to sleep penalties" has nothing to dampen yet.
  - Tests: `node tools/morale-smoke.js` (bands, trait bends, clamps, combat nudges, mood average, team vs base-wide, injury and death in a real debrief, warning, desertion, drift, charisma, migration). Autoplay seeds 1–3 finish with no errors on days 96 / 71 / 92; the flawless bot ends with a base mood around 80 and individual rebels between 68 and 100.

### Phase 5 — Ranks and promotion — **built**
- Ladders per type: Soldier/Support = Army enlisted, Marine = USMC enlisted, Pilot = USAF enlisted (starting Private per the doc). Keep the current officer `RANKS` as the officer ladder.
- `rankFor(p)` reads `p.rank`; promotion eligibility = missions completed vs. a rising threshold (`n = 2,3,4…`); promotion is a player action in the dossier (the file footer already says "manual promotion arrives with the persistent campaign").
- Officer commission at level ≥ 5 and rank ≥ Sergeant: dossier button, one-way.
- **Done when:** ranks no longer move with level; promoting costs nothing but a mission count and gives a morale bump.
- **Built:** `p.rank` (rung on the type's ladder), `p.off` (officer ladder), `p.missions` (total served) and `p.rankMissions` (served at this rank). Each ladder has nine rungs: Army enlisted for Soldiers and Support (Private, Private Second Class, Private First Class, Specialist, Sergeant … Sergeant Major), USMC enlisted for Marines (… Lance Corporal, Corporal …), and the real USAF enlisted ladder for Pilots (Airman Basic … Chief Master Sergeant); the officer ladder runs Second Lieutenant to Lieutenant General.
  - *Earning it:* a mission win counts for everyone who took part and came home (the opening mission, the abstract resolver, ground and space debriefs); failures don't count. Promotion needs 2 missions at the first rung and one more at each rung after (3 and one more on the officer ladder). A news line says when someone is due, the roster shows a green ▲, and the dossier's Rank card has the **Promote** button (+5 morale).
  - *Commission:* a Sergeant-grade rebel (the fifth rung of any ladder) at level 5 can be commissioned from their file: one way, restarts them as Second Lieutenant, +8 morale. Available to every type, including Support.
  - *Existing saves:* rank is backfilled from level (one rung per two levels), so nobody loses standing; Joss, who used to read "Captain", is now an Airman by the doc's rules.
  - *Elsewhere:* the New Recruit screen hides rank (the doc says they don't have one yet); space-flight dossiers show the same rank as the base; long rank names truncate cleanly on the roster.
  - Tests: `node tools/rank-smoke.js` (every ladder, requirements, credit/promote/commission rules, migration, debrief credit, the buttons, recruit offer hides rank). Autoplay seeds 1–3 unchanged (96 / 71 / 92), no page errors.

### Phase 6 — Recruitment and the New Recruit screen
- Replace the `recruit` window's single card with a **card stack**: any number of candidates, each Recruit/Dismiss independently, each showing the full dossier minus rank.
- Command Center task **Recruit new Revolutionaries**: a few-day timer, then 1–3 generated candidates (count/quality scaled by Command Center upgrades, base size; capped by bunks). The exact timing rule is missing from the doc — needs a one-line answer.
- Existing paths (Source signals, Rescue Dissident, Sera) feed the same window and use `genRebel` where there is no authored person.
- Respect bunk capacity (current `full&&!must` logic).
- **Done when:** a source signal and the Command Center task both open the same multi-card screen.

### Phase 7 — Dossier and roster UI
- Extend the `person` window (`base.js` ~L2996): level ring with 0–100 XP, rank, specialty (or **Rookie**), type, character trait, rebel traits (max 3), morale bar, skills, gear slots, service record (missions, kills, injuries), and a hidden-stat-free Hero hint (none).
- Roster rows (`personSub`) show rank, level, specialty/Rookie, a morale chip.
- Reuse UI-kit components (`sr-card`, `wTag`, `sr-level`); add icons through `tools/ui-kit/icons.py` and rebuild with `build.py`, then update `docs/ui/styleguide.html`.

### Phase 8 — Gear slots and auto-equip
- Slots: Soldier/Marine primary + secondary + gadgets; Pilot secondary + gadgets; Support none.
- Auto-equip from the armory on recruit/promotion and before each mission; manual change in the dossier and Gear Grid; armory `n` counts are reserved, not duplicated (today two soldiers can both list the same weapon).
- Enforce the slot limit that ROADMAP Phase 5 deferred; Strong trait can swap secondary for a second primary.

### Phase 9 — Rebel Traits and relationships
Needs the debrief telemetry from §3. Build the grant/removal engine first (max 3, drop-lowest-priority rule needs a decision), then add families in order of how much data they need:
1. **Battlefield / Successes** (Blooded, Battle-Hardened, Veteran, Mission Specialist, Decorated, Last One Standing, Lucky Escape…) — kills, survived counts, per-type counts, squad-alone events.
2. **Psychological and Positive Development** (Grieving, Panicky, Hardened, Redeemed, Proved Themselves…) — death/injury events and recovery over time.
3. **Relationships** (Friends, Rivals, Mentor/Mentee, Love, Family, Old Friends, Battle Brothers, Owes/Saved a Life, Betrayed) — pairwise state keyed on rebel ids, cleaned up on death/desertion, effects on squad selection (Rivals penalty at planning time).
4. **Rebellion-Specific** (Wanted, Celebrity, Symbol…) — hook into global Risk and Rev meter; per-rebel Risk needs a decision.
5. **Injuries and Physical Changes** (Lost an Eye/Arm, Limp, Prosthetic…) — only after Injury v2 (decision 5), with Prosthetics from the Infirmary.
- Each trait gets the same `{live, fx, on}` row as Phase 2; unfinished ones stay `live:0`.

### Phase 10 — Heroes
- Hidden `heroChance` increases from the same telemetry (missions, kills, standout moments); one Hero per mission, which then slashes everyone else's chance.
- New Hero screen at mission end (after the reward screen), Hero type replaces Soldier/Marine/Pilot, buffs all skills, gets one Hero action usable in ground, boarding or space.
- Gate by Rev Level per decision 1.

### Phase 11 — Balance, bot and docs
- Teach `tools/autoplay.js` to use rank/gear/recruit flows; run `tools/sweep.sh` across seeds; retune morale deltas, skill increments and XP so the bot still reaches escalation around day 70–110 (the current tuning target).
- Update README (the "Missions are led in person" / roster paragraphs), `docs/GDD.md` §5 and §8, `docs/ROADMAP.md`; fix the Imperium/Hegemony wording while there.

## 5. Suggested order and size

Phases 1 → 2 → 3 first (they unlock everything and are mostly base/data work), then 4 and 5, then 6 + 7 together (UI), 8, then 9 in slices, 10 last. Rough effort: P1 M, P2 L, P3 M, P4 M, P5 S, P6 M, P7 M, P8 M, P9 XL (incremental), P10 M, P11 M.

The spine is Phases 1–4: after those the doc's core promise holds — a named rebel with a level, a trait, skills and morale that matter in combat.

## 6. Risks

- **Save compatibility.** Every phase adds fields; all of them need an `undefined` backfill in `restoreCampaign`. Keep migration deterministic (no `Math.random` on load).
- **Combat balance drift.** Skills, morale and ~20 live ground traits all touch the d20 target-number math; land them behind small modifiers and re-run the bot after each phase.
- **Telemetry coupling.** `ground.js` (4.7k lines) and `space.js` (2.5k) each build their own debrief; add the per-rebel stat object once in `core.js` (`SR.ui` helpers live there) so both emit the same shape.
- **Scope creep from trait text.** ~120 traits with prose effects; the `live` flag is the release valve so the roster can ship with a subset.
- **Hard-coded cast.** `space.js` still lists Joss/Sera/Petra with string traits and `startPlan` special-cases Sera; migrate those to the registry in Phase 2 or they will drift.
