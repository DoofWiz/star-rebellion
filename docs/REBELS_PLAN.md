# Rebels — Implementation Plan

> Source: the "Rebels" design doc on the designer's Google Drive (user stories, 47 Character
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

## 2. Decisions needed before coding (my recommendation first)

1. **Heroes vs. scope.** `GDD.md` and `ROADMAP.md` put Heroes at Rev Level 2+; the Rebels doc has them as a normal mission-end event. *Recommend:* build the hidden stat and the Hero data model now (Phase 9) but keep the New Hero screen off until Level 2 (feature flag), unless you want Heroes in Level 1.
2. **Marines.** No boarding theatre exists (out of scope for Rev 1). *Recommend:* Marines exist as a type with ranks/skills/gear/specialty, can be recruited by a debug path only, and never appear in Level 1 offers.
3. **Rank decoupled from level.** Today level-up announces "promoted in the field — now {rank}". *Recommend:* follow the doc: level and rank are separate; the news line becomes "reached level N"; rank comes from mission count.
4. **Per-rebel morale vs. `G.morale`.** *Recommend:* keep `G.morale` as the **base mood** (average of rebels plus base events) so the existing 12 call sites keep working, and add `p.morale` as the new source of truth for performance. Rec Room, rest, mission wins/losses feed both.
5. **Injury depth.** Many traits assume critical injuries, physical changes (Lost an Eye/Arm, Limp, Prosthetic) and exhaustion/sleep. Injury today is just days out. *Recommend:* a separate **Injury v2** phase (minor / serious / critical, recovery events) and **drop or reinterpret** the Heavy/Light Sleeper traits unless you want an exhaustion system.
6. **Traits that need systems we don't have** (melee for Strong/Weak, interrogation missions for Intimidating, gear loss for Messy, per-rebel "Risk"). *Recommend:* implement the trait as data + description now, mark its effect `live:0` (same pattern as `SPECS.live`), and light it up when the system lands.
7. **XP scale.** Keep `xp` as 0..1 internally (all rewards use it) and show it as 0–100 XP in the UI. Cap level at 20.
8. **Doc gaps to fix in the doc:** the "Recruit new Revolutionaries" bullet is cut off mid-sentence ("After several days, the…"); "Hegemon" typo; Pilot rank list starts at "Private" though the USAF enlisted ladder starts at Airman Basic (I'll follow the doc); "Failed to Save" mentions Redemption but there is no Redemption trait (Redeemed is the likely match).

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

### Phase 1 — Data model, names, XP/levels, save migration
- Add `rebel.js`: first/last name pools (~60 + ~60 per flavour, no duplicates in the roster), `genRebel(type)`; keep the authored `RECRUITS` entries as named "story" recruits so existing flavour is not lost (Mira Osk, Sera, etc.); generated rebels get a bio from a small template set.
- Level cap 20, 100 XP/level; `levelUp` stops at 20, news line reworded (decision 3).
- Migration in `restoreCampaign` (follows the existing `if(x===undefined)` pattern): backfill `first/last`, `charTrait` (deterministic from id so reloads are stable; Sera keeps Lucky, Joss/Petra keep their space.js traits), `morale` from `G.morale`, `rank` from current level, `skills` from level, `gear` from `equip`.
- Opening cast (Joss, Dax, Runa, Kel) get authored traits.
- **Done when:** old saves load, a new campaign boots, roster shows names/levels unchanged, `tools/autoplay.js` still finishes a run.

### Phase 2 — Character Traits (47)
- Registry with `live` flags. Group by what they need:
  - *Ground now:* Clumsy (grenade drop, jam — Akli jams already exist), Nervous (round-1 initiative), Brave/Cowardly (cool delta in `adjCool`), Steady Hands (+1 aim), Short Fuse, Patient/Restless (Hold action, move speed), Neat Freak, Lucky/Unlucky (lethal-hit save, crit chance), Reckless/Cautious (Sprint, damage taken, speed), Perfectionist (+accuracy, acts last — engagement sorts by `aim*3+rint`), Hothead, Self-Preserving, Former Hegemony Soldier, Former Hunter (vision radius), Empathetic (nearby Cool recovery), Loyal.
  - *Base/economy now:* Quick/Slow Learner (XP), Former Mechanic/Engineer/Medic/Doctor (Maintenance Bay, Materials cost, `injured` recovery tick at `base.js` ~L1100), Smuggler (loot roll), Officer (+Intel on mission offer), Academic, Industrialist, Wealthy (credits on recruit), Streetwise/Criminal (Source risk), Charismatic, Pragmatic, Idealist/Cynical (morale rules), Former Pilot (ship assignment), Politician (Diplomatic Quarter task quality).
  - *Blocked, `live:0`:* Heavy/Light Sleeper, Strong/Weak (melee), Messy (gear loss), Intimidating (interrogation).
- Assign exactly one at generation, weighted so a squad is not all one flavour; Former-X traits bias the bio line.
- Show in dossier and New Recruit card (quote + one-line effect).
- **Done when:** every `live` trait has a one-line effect visible in the combat/base log or the dossier, plus a unit-style check in the autoplay bot that the modifier fires.

### Phase 3 — Skills
- Derive skills (cap 50) from level + `skillXp` + trait/spec modifiers; Soldier/Marine: Aim, Constitution, Agility, Presence; Pilot: Aim, Cunning, Focus, Presence; Support: none; Hero: all.
- Plumb into combat: Aim → replaces `soldierAim/pilotAim` (keep the 1–5 range the scenes expect, mapped from skill); Constitution → soldier hp (currently flat 100 in `squadEntry`); Agility → on-foot speed; Presence → starting `cool` (ground flat 65, space `55+4·level`) and panic resistance; Cunning → repair/defensive outcomes; Focus → target-number to be hit (space).
- `skillXp` grows from what the rebel did in the mission (shots → Aim, damage taken → Constitution, sprinting → Agility, staying Cool under fire → Presence), awarded in the debrief.
- **Done when:** a level-10 soldier measurably differs from level 1 in hp/speed/cool, with each point a small increment (balance in Phase 10).

### Phase 4 — Per-rebel morale
- `p.morale` 0–100, bands Very Low/Low/Middling/High/Very High, shown as a bar + word in dossier and roster.
- Inputs: mission win/loss, injuries to self/others, deaths, promotion, revolution progress (Rev meter), Rec Room/rest, character/rebel trait modifiers, Idealist/Cynical/Loyal/Charismatic rules.
- Effects: band → small combat modifier (aim/cool) and, in the base, nothing else at first; a Very Low band warns in the news feed.
- At 0 the rebel **deserts**: removed from `G.people`, news item, base-mood hit; refuse to desert a rebel currently on a mission (resolve after debrief).
- Recompute `G.morale` as the average so Rec Room and existing displays stay valid (decision 4).
- **Done when:** a run of failed missions drives some rebels out and a good streak raises performance; autoplay shows no mass desertion on a normal path.

### Phase 5 — Ranks and promotion
- Ladders per type: Soldier/Support = Army enlisted, Marine = USMC enlisted, Pilot = USAF enlisted (starting Private per the doc). Keep the current officer `RANKS` as the officer ladder.
- `rankFor(p)` reads `p.rank`; promotion eligibility = missions completed vs. a rising threshold (`n = 2,3,4…`); promotion is a player action in the dossier (the file footer already says "manual promotion arrives with the persistent campaign").
- Officer commission at level ≥ 5 and rank ≥ Sergeant: dossier button, one-way.
- **Done when:** ranks no longer move with level; promoting costs nothing but a mission count and gives a morale bump.

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
