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
  - *Revised after review (rank UI):* the Rank card was too heavy inline. The personnel file now has a single **rank row** with the bars (insignia, rank name, a green **▲ Promotion ready** flag, or ★ when a commission is available, otherwise the mission progress, e.g. 4/6) and tapping it opens the old card (missions served, progress, Promote / Commission) as an overlay on top of the file, dismissed by its ✕, a tap outside or Esc, which closes only the overlay. Each rung has its own inline-SVG insignia: chevrons and rockers (gold for Army and Support, red for Marines, blue for pilots) with a diamond, star or wreathed star for senior grades; officers get bars, oak leaves, an eagle and one to three stars.
  - *Elsewhere:* the New Recruit screen hides rank (the doc says they don't have one yet); space-flight dossiers show the same rank as the base; long rank names truncate cleanly on the roster.
  - Tests: `node tools/rank-smoke.js` (every ladder, requirements, credit/promote/commission rules, migration, debrief credit, the buttons, recruit offer hides rank). Autoplay seeds 1–3 unchanged (96 / 71 / 92), no page errors.

### Phase 6 — Recruitment and the New Recruit screen — **built**
- Replace the `recruit` window's single card with a **card stack**: any number of candidates, each Recruit/Dismiss independently, each showing the full dossier minus rank.
- Command Center task **Recruit new Revolutionaries**: a few-day timer, then 1–3 generated candidates (count/quality scaled by Command Center upgrades, base size; capped by bunks). The exact timing rule is missing from the doc — needs a one-line answer.
- Existing paths (Source signals, Rescue Dissident, Sera) feed the same window and use `genRebel` where there is no authored person.
- Respect bunk capacity (current `full&&!must` logic).
- **Done when:** a source signal and the Command Center task both open the same multi-card screen.
- **Built:** the Command Center has a **Recruit new Revolutionaries** card (inside the room, and a hint on its tile popup). It costs 200 credits, needs a free bunk and a Command Center, and takes 3 days; when it ends, 1–3 generated candidates arrive (1, +1 if the Command Center is staffed, +1 half the time with a healthy Charismatic at the base, capped by free bunks). Roles are rolled 45% Soldier, 35% Support, 20% Pilot (no Marines at Level 1). The New Recruit screen opens by itself the next time nothing else is open.
  - *The screen:* `winArg` is now `{cards:[{p,must,line}],batch}`. One card keeps the classic layout (Dismiss and Recruit in the foot); several sit side by side, each with its own Dismiss and Recruit, and the window closes when the last is decided. Each card shows the dossier without rank (name, level, morale, Character trait, skills, terms). With a batch, the X or **Decide later** leaves everyone waiting at the Command Center (`G.recWait`, saved), and the card then offers **Review candidates**; source signals and Rescue Dissident use the same screen but a dismissed offer is gone.
  - *Also:* a bunk shortage disables Recruit on that card (and blocks starting the task); Wealthy recruits still bring their credits; new ids use an `rcb` prefix so a batch can't collide with offer ids.
  - *Open:* the doc's timing rule is cut off, so the 3 days, 200 credits and 1–3 candidates are my starting numbers to tune. The autoplay bot now issues the call whenever it has 1,200 credits; seeds 1–3 escalate on days 99 / 73 / 83.
  - Tests: `node tools/recruit-smoke.js` (card states, cost and days, no double start, candidates well formed and unique, multi-card accept/leave/dismiss, single-offer layout, full-barracks guard).

### Phase 7 — Dossier and roster UI — **built**
- Extend the `person` window (`base.js` ~L2996): level ring with 0–100 XP, rank, specialty (or **Rookie**), type, character trait, rebel traits (max 3), morale bar, skills, gear slots, service record (missions, kills, injuries), and a hidden-stat-free Hero hint (none).
- Roster rows (`personSub`) show rank, level, specialty/Rookie, a morale chip.
- Reuse UI-kit components (`sr-card`, `wTag`, `sr-level`); add icons through `tools/ui-kit/icons.py` and rebuild with `build.py`, then update `docs/ui/styleguide.html`.
- **Built:** one dossier layout for the personnel file and the New Recruit screen: header (level ring, name, tags for rank, specialty or **Rookie**, and a morale tag when not Middling, then type and "with us since day N"), bio, Morale and Experience bars (Experience reads 0–100 and shows MAX at level 20), then in the file the Rank card, then Character, Skills (as bars out of 50), the existing craft/equipment/station section, a new **Service record** (missions served, confirmed kills, times injured) and Assignment. Recruit offers show everything except rank and the record. Autos stay plain.
  - *Telemetry:* both combat scenes now report confirmed kills per rebel and the base counts injuries; `p.joined` records the day they signed up (old saves get today's day).
  - *Roster:* unchanged except that the full rank and level are in a tooltip when a long rank gets truncated.
  - *Left for later:* Rebel Traits (Phase 9) and gear slots (Phase 8) get their sections when they exist; the UI kit and styleguide were not touched, the new bars reuse `sr-meter`.
  - Tests: `node tools/dossier-smoke.js` (tags, bars, section order, specialty vs Rookie, morale tags, MAX, record from a debrief, pilot/support/auto variants, recruit offer, roster tooltip). All five earlier suites still pass.

### Phase 8 — Gear slots and auto-equip — **built**
- Slots: Soldier/Marine primary + secondary + gadgets; Pilot secondary + gadgets; Support none.
- Auto-equip from the armory on recruit/promotion and before each mission; manual change in the dossier and Gear Grid; armory `n` counts are reserved, not duplicated (today two soldiers can both list the same weapon).
- Enforce the slot limit that ROADMAP Phase 5 deferred; Strong trait can swap secondary for a second primary.
- **Built:** every Soldier, Marine and Pilot carries `p.gear = {primary, secondary, gad:[a,b]}` out of the shared armory (Soldiers and Marines have all four slots, Pilots secondary and two gadgets, Support none). An item in stock can only be carried once per unit.
  - *Auto-equip:* empty slots are filled automatically, best item first and to the most experienced rebel first (Carbine over Akli over Scattergun for primaries; Cowboy for secondaries; BLAM for gadgets); it runs on recruit, after every debrief and whenever loot reaches the armory. Slots the player set by hand are never overwritten, and anything used up or lost is quietly removed from the weakest rebels first. Saves and the opening cast read their old `equip` list once.
  - *Manual:* the personnel file has a **Gear** section, one tappable row per slot (greyed while the rebel is away); tapping opens a picker overlay (same style as the rank details) with each fitting item and whether it is free, carried by someone else (tap to take it from them) or all away; "Leave empty" returns it to the armory. Esc or a tap outside closes it. The Gear Grid now shows how many of each item are being carried.
  - *Missions:* the combat loadout is now exactly [primary, secondary]; a rebel with nothing carries bare hands (a new, weak `unarmed` weapon) instead of the old free rifle and pistol. When a ground mission launches, the squad, any reinforcement soldiers and the rescued/prize pilot are outfitted first, taking kit from rebels who stay home. Grenades in the mission are now the BLAMs in the squad's gadget slots, and the armory stock afterwards follows what was thrown and what was found.
  - *Changed:* the opening mission and the Steal the Cross pilot now use the same profile and gear as every other mission (skills, traits and carried weapons); the Scattergun no longer rides on top of a rifle for the squad lead, it is one primary like the rest. Explosive charges, data limpets and shells stay pooled mission items, not carried gear.
  - *Not done:* Armour items, the Strong trait's second primary, and carried gear for space sorties (a pilot's gadgets do nothing in the cockpit yet).
  - Tests: `node tools/gear-smoke.js` (opening kit, slots by role, recruit and loot auto-equip, best-first, bare hands, reconcile, picker, take-from-another, empty, squad outfitting, BLAM stock, gear grid, locked while away, Support has none). Also ran a real opening mission and checked each rebel's weapons and the briefing chips. Autoplay seeds 1–3 unchanged (99 / 73 / 83).

### Phase 9 — Rebel Traits and relationships — **built** (families that need missing systems stay listed but never granted)
Needs the debrief telemetry from §3. Build the grant/removal engine first (max 3, drop-lowest-priority rule needs a decision), then add families in order of how much data they need:
1. **Battlefield / Successes** (Blooded, Battle-Hardened, Veteran, Mission Specialist, Decorated, Last One Standing, Lucky Escape…) — kills, survived counts, per-type counts, squad-alone events.
2. **Psychological and Positive Development** (Grieving, Panicky, Hardened, Redeemed, Proved Themselves…) — death/injury events and recovery over time.
3. **Relationships** (Friends, Rivals, Mentor/Mentee, Love, Family, Old Friends, Battle Brothers, Owes/Saved a Life, Betrayed) — pairwise state keyed on rebel ids, cleaned up on death/desertion, effects on squad selection (Rivals penalty at planning time).
4. **Rebellion-Specific** (Wanted, Celebrity, Symbol…) — hook into global Risk and Rev meter; per-rebel Risk needs a decision.
5. **Injuries and Physical Changes** (Lost an Eye/Arm, Limp, Prosthetic…) — only after Injury v2 (decision 5), with Prosthetics from the Infirmary.
- Each trait gets the same `{live, fx, on}` row as Phase 2; unfinished ones stay `live:0`.

- **Built:** `game/js/rebel-exp.js` holds the registry (all 59 Rebel Traits from the doc, with their quotes and a one-line effect), the grant rules and the pair bookkeeping. A rebel holds at most three (`p.traits`, each `{k, with?}`); when full, a new trait replaces the weakest one only if it ranks higher, and a pair is formed only if both sides can take it. Both combat scenes now report, per rebel: whether they went down, their lowest hit-point (or hull) fraction, heavy-weapon shots, panics and whether luck saved them; the base turns that into grants in `runExperiences` after every debrief, and shows the traits on the dossier under **Experiences n/3** (the New Recruit screen has none).
  - *Granted now (30):* Blooded (first kill), Battle-Hardened (3 close calls), Fire Support (4 rocket shots), Scarred (recovering from a 5+ day injury), Nearly Dead and Lucky Escape (a surgery save, or a lucky survival), Last One Standing, Lost a Squad (a failed mission where everyone else went down: −15 morale), Veteran (10 missions served), Mission Specialist (3 wins of one mission type; +1 accuracy on that type), Decorated (2 notable wins: stealth bonus or Security 3+), Hegemony Nemesis (6 wins), Panicky (panicked on 3 missions), Survivor's Guilt and Vengeful (after allies are killed), Hardened (3 injuries), Desensitised (12 kills), Broken (a failed mission that leaves a downed rebel at 15 morale or less; temporary, +morale needed to recover), Redeemed (recovering from Broken), Proved Themselves (a win after a failure on Security 2+), Grieving (a bonded rebel dies; temporary, 7 days, they sit out missions), Survivor's Resolve (after grief), Avenging (a mentor dies), and the pair traits: **Friends** (4 missions together, never between clashing temperaments), **Old Friends** (10 together), **Battle Brothers** (6 together with 3 shared close calls), **In Love** (a 4% chance per shared win once bonded for 8 missions; one partner each), **Mentored by / Mentoring** (a level 4+ higher rebel and a level 5 or under trainee, 3 missions together) and **Rivals** (clashing temperaments after a shared failure).
  - *Effects:* accuracy edges in ground combat (Veteran, Nemesis, Avenging, Mission Specialist, Fire Support with rockets, Last One Standing when outnumbered 2:1, Battle Brothers +2 and Old Friends +1 while the partner stands, a Rivals edge 15% of rounds, Broken −2), damage (Vengeful +10%, Nemesis +5%), nerve (Blooded, Battle-Hardened, Veteran and Desensitised panic less; Panicky, Broken and Nearly Dead-when-wounded change how fast), a bonded partner going down panics a rebel at once, morale rules (Hardened, Scarred, Resolve, Lost a Squad, Desensitised, Redeemed and Proved shift the daily drift target, Decorated +1 per win, Love +4 beside the partner, Rivals −3 at launch, Mentored rebels earn 30% more XP with their mentor), and a death costs close friends −15, old friends −20, battle brothers or a lover −30 and a mentor of the dead trainee −18. Veteran also reaches space through the existing trait.
  - *Listed but not granted (29):* every injury and physical-change trait (waiting on Injury v2), the Rebellion-specific ones (need per-rebel Risk), Captured/Tortured/Survived an Ambush/Haunted (no capture or enemy ambushes yet), Family, Owes/Saved a Life and Failed to Save (no rescues or revives), Hero of the Rebellion/Made a Name/Symbol/Inspired (wait on Heroes and story events), Survivor, Disgraced, Court-Martialled, Abandoned by Squad and Betrayed.
  - *Interpretations:* "dangerous mission" = downed or under half health; "notable" = stealth bonus or Security 3+; "serious injury" = 5+ days; "critical" = a surgery save; deaths only happen to pilots shot down in space or in the abstract resolver, so grief is rare for now. Because rolls draw on the shared random stream, the autoplay seeds moved to days 105 / 72 / 90 (still inside the 70–110 target).
  - Tests: `node tools/exp-smoke.js` (registry, cap and priority, every grant rule, pair rules, bereavement, daily recovery, the numbers) and `node tools/exp-flow-smoke.js` (kill → Blooded in the news, friendships after four missions, dossier names the friend, losing a friend → grief, morale and sitting out, mentor XP, Scarred, rivals at launch, squad entries, and in the ground scene the accuracy, nerve, heartbreak and telemetry effects). All earlier suites pass.

### Phase 10 — Heroes — **built** (promotions switch on at Revolution Level 2)
- Hidden `heroChance` increases from the same telemetry (missions, kills, standout moments); one Hero per mission, which then slashes everyone else's chance.
- New Hero screen at mission end (after the reward screen), Hero type replaces Soldier/Marine/Pilot, buffs all skills, gets one Hero action usable in ground, boarding or space.
- Gate by Rev Level per decision 1.

- **Built:** every Soldier, Marine and Pilot has a hidden `p.heroP` that creeps up as they play (a little for turning up, more for kills, close calls survived, being the top killer, a notable win, and a lot for being the last one standing; capped at 6%). From Revolution Level 2 a roll follows every mission for the most likely candidates (a rebel with at least 4 missions served and level 3; Support, robot allies and existing Heroes never qualify); one winner at most, and when someone is made a Hero everyone else's chance drops to 35%. Before Level 2 the stat keeps growing but no one is promoted. The number is never shown anywhere.
  - *Becoming a Hero:* `p.role` becomes Hero (`heroOf` remembers Soldier/Marine/Pilot, `rankRole` keeps their rank ladder), +8 to every one of the six skills, +25 health, the full four gear slots, +10 morale, and a **New Hero!** screen after the reward screens (their file, plus what being a Hero means). They have a Heroes section on the roster rail, are selectable for ground, boarding and space slots, keep their rank, specialty, traits and relationships, and show a Hero tag and card on the dossier.
  - *Hero actions (once per mission each):* **Rally cry** on the ground, a new order card: the whole squad steadies to at least 75 Cool and takes +2 to hit for the round; **Heroic surge** in space, a new action: shields to full, half the hull back, +50 nerve and +4 to hit for the round.
  - *Also fixed:* a Phase 9 slip where counting rocket shots reused the unit's existing `heavy` flag; it now has its own counter.
  - Tests: `node tools/hero-smoke.js` (the hidden chance and its cap, eligibility, one winner and the drop, the Level 2 gate, the screen, roster and pools, dossier, squad entry, the Rally cry card and effect in a real ground scene, the Heroic surge in a real space scene). The morale and Rebel Trait suites now pin their dice so chance-based traits cannot make them flaky. All eleven suites pass; autoplay seeds 1 and 2 unchanged (105 / 72).

### Phase 11 — Injury & Recovery — **built**
Built from the *Injury & Recovery* section of the Rebels doc (a critical hit can leave a lingering injury that must be dealt with, like a ship critical).
- **Critical injuries (12):** a critical hit on a rebel (a natural 20, or 19 for the Unlucky, or 18 for a Reckless rebel after a sprint) rolls one from the doc's list, weighted and filtered by what hit them: Concussion, Broken Arm, Broken Leg, Severe Bleeding, Internal Injury, Eye Injury, Maimed, Spinal Injury, Ruptured Eardrum and Facial Trauma from anything, Shrapnel only from guns and explosives, Burns only from energy weapons and explosives. A rebel can carry three at once; Self-Preserving still shrugs most of them off. Explosions can also injure rebels near the centre of a blast. Enemies keep the old "wounded" crit.
- **In the encounter:** each injury's effect is live until treated. Concussion stuns (no orders, no shots, skipped in planning, a status tag). Broken Arm drops the primary and allows one-handed weapons only. Broken Leg halves speed and rules out Sprint. Severe Bleeding costs 6 health at the end of every round. Internal Injury cuts maximum health by 30%. Shrapnel suppresses abilities (stim, grenade, work, hack, Rally cry). Burns slow a rebel and cost 2 accuracy; an Eye Injury costs 3; Facial Trauma dazes (−2). A Ruptured Eardrum cuts sight by a quarter and makes a rebel mishear a plan one round in three. Spinal Injury and Maiming put the rebel down (not shot to zero). Being wounded still costs −1 to hit on top.
- **Treat Wound:** a new order card on every rebel. Target: yourself or an ally within about 110 units; the incapacitated first (downed by injury, then stunned), then the bleeding, then the nearest. One injury per action, worst first. It removes the combat effect for the rest of the encounter (an Internal Injury's lost health returns, a spinal or maimed rebel stands up at a quarter health or what they had, whichever is more); the injury still goes home with them. A stunned or downed rebel cannot treat themselves. The medic who treats someone who could not act is credited with a rescue.
- **Recovery at the base:** what a mission leaves is a **medical condition** with days to heal: Concussed (−1 aim, −10 Cool), Broken Arm (no two-handed weapons), Broken Leg (×0.7 speed, no sprint), Wounded (−15% health), Internal Injury (−25% health), Shrapnel (−1 aim), Burned (×0.85 speed, −1 aim), Eye Injury (−2 aim), Deafened (−10 Cool, −25% sight), Facial Trauma (heals as a scar, 40% of the time a permanent Scarred trait). They follow the rebel into the next mission as standing penalties until healed. Recovery per day is 0.25 with no Infirmary, 1 with one, +1 with a staffed post, +0.5 for a Former Medic, +1 for a Former Doctor, +0.5 for a Surgery Room; an injury nobody patched in the field heals 2 days slower; an Eye Injury still unhealed after 14 days becomes permanent blindness. Spinal Injury means 10 days (14 untreated) out of action; Maiming costs a limb for good (arm: no two-handed weapons; leg: slow, no sprint) after 6 days out. Conditions do not recover while a rebel is away on a mission.
- **Prosthetics:** with a Surgery Room, the Infirmary room view offers **Fit prosthetic** for every lost arm, leg or eye (300 credits, 120 materials, 5 days) which removes the penalty. Without a Surgery Room the card says what is needed.
- **Where it shows:** a **Medical** section on the dossier (conditions with days left, permanent losses), a ✚ on the roster, the Infirmary's patient line with the current recovery rate, status tags and floaters in the ground scene, and news lines. Space: a cockpit breach gives the pilot a Concussion at the base.
- **Knock-ons:** a real **Nearly Dead** (recovering from a spinal injury or maiming), **Scarred** from a facial scar or a long injury, and the rescue traits **Saved [B]'s Life** and **Owes a Life to [B]** are now live (the Treat Wound rescue creates the pair: +1 accuracy beside the saviour, a small morale lift for the saviour, grief if the saviour dies).
- **Decisions I made that you may want to change:** anyone can treat, not only a Combat Medic specialty (the specialty is not live yet); one injury per action; lingering conditions are fixed by base time, not by a second Treat Wound; Maimed is arm or leg 50/50 (the doc's Lost an Eye comes from the Eye Injury going permanent); sources only cover ground combat for now.
- Tests: `node tools/injury-smoke.js` (the table and its source filtering, penalties, recovery arithmetic and the blinding clock, applying injuries, healing rates, the file, the roster, prosthetics, and in the real ground scene every effect, Treat Wound including rescues and standing a spinal rebel back up, the result data, the cockpit concussion, and the debrief). All twelve suites pass.

### Phase 12 — Balance, bot and docs
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


## 7. Systems the trait list is waiting on (questions for the designer)

The 29 traits that are listed but never granted each wait on a game system that does not exist yet. Here is what each needs and the decisions only the designer can make.

### A. Risk, per rebel (Wanted, Hegemony Informant, Rebel Celebrity, Propaganda Poster, Hegemony Family, Hero of the Rebellion, Made a Name, Symbol of the Rebellion; Streetwise and Former Criminal reduce it)
Today there is one number, **network exposure** (`G.risk`, shown on the Command Center), and only Sources move it (a burned source +15, running hot, and so on). The traits talk about *Risk* in other ways: "increased Risk during civilian operations", "increased Risk if their identity becomes known", "increased Risk in populated areas", "reduced Risk when working with Sources in urban areas".
To build them I need to know:
1. Is Risk still one network-wide meter, with rebels *adding* to it (a rebel with Wanted on a civilian mission adds +X exposure), or does each rebel get their own notoriety number?
2. What does Risk *do* at Level 1 and at Level 2 (the docs say Alerts, Hegemony raids, begin at Level 2)? It decides how big the numbers should be.
3. Which missions are "civilian operations" or in "populated areas"? I would tag each mission type and location (for example Dustfall and the Auto Factory populated, a depot not) and each Source as urban or not.
4. What does "identity is known" mean as a state: a flag set when a mission is witnessed, a rebel is captured, or a Source who knew them is burned, and cleared by something (time, a Source's silence)?
5. How are Wanted, Informant, Defector, Celebrity and Poster *acquired*? As rewards of specific missions or events, by a roll after loud missions, or by a threshold of kills and notable wins?

### B. Capture and ambush (Captured, Tortured, Hegemony Trauma, Survived an Ambush, Haunted)
1. **When is a rebel captured?** My suggestion: when a mission is failed and a rebel is downed, there is a chance they are taken instead of coming home injured. Is that right, and what chance?
2. **What does captivity look like?** Missing from the roster for N days; a **Rescue Prisoners** mission opens to free them (the Rebels doc's recruit note already mentions *Rescue Prisoners* and *Break Out VIP*); if the clock runs out they are interrogated (does that raise Risk, burn a Source, or cost the rebel?), then released, executed or turned. Which of those?
3. **Tortured / Hegemony Trauma:** what triggers them (an interrogation outcome?) and do they come with an injury (see the Injury and Recovery section)?
4. **Ambush:** how does a mission *become* an ambush? Possible triggers: a Source was burned, Risk is high, Security is 3 or more, a trap mission type. In the scene, what changes: enemies start alerted and close, the squad starts in a bad position, round one is theirs?
5. **Haunted** needs "missions involving similar circumstances to the triggering event": which tags do missions need (mission type, location type, enemy type) and what event sets it (a death, a capture)?

### C. Family (Family of [Character], Hegemony Family)
1. How does a relative come about? Options: a recruit arrives *with* a relative (a pair on the New Recruit screen, sharing a surname), a rebel reveals a relative back home, or a rescued prisoner is someone's relative.
2. "Large morale effect when the relative is present or absent": a bonus when they share a squad or the base, and a penalty when apart? Which?
3. Is the relative always another rebel on the roster, or sometimes someone outside (the Hegemony Family trait suggests a relative who works for the Hegemony and can appear in events)? If outside, what events?

### D. Rescue traits (Owes a Life, Saved a Life, Failed to Save)
These need a **revive or rescue** mechanic, which neither combat scene has. Today a rebel who is shot to zero is simply down for the rest of the mission and injured afterwards.
1. Is there a window to save them (a few rounds before they are lost or badly hurt)?
2. Who can do it: anyone adjacent, or only a Combat Medic specialty, and what does it cost (a whole order, a Stim, a roll)?
3. What does being saved change: the downed rebel stands up at low health, or avoids the worse injury outcome?
4. In space: is a wingman covering an ejecting pilot or a tow the equivalent, or does this stay ground-only?
5. "Failed to Save [B]": when a rescue was tried and failed, or any time an ally dies within reach?

### E. Hero-linked and command-decision traits (Hero of the Rebellion, Made a Name for Themselves, Symbol of the Rebellion, Inspired; Survivor, Disgraced, Court-Martialled, Abandoned by Squad, Betrayed by [Character])
1. Should **Hero of the Rebellion** simply be granted when a rebel becomes a Hero (Heroes now exist from Level 2)? And "Symbol of the Rebellion" and "Made a Name" come later to Heroes who keep winning?
2. **Inspired** wants a "particularly heroic event" witnessed by others: what counts (a Rally cry that turns a mission, a rescue, a last stand)?
3. **Disgraced, Court-Martialled, Abandoned by Squad, Betrayed**: these need decisions or events the player or the story makes. Examples I could build: leaving wounded behind on a retreat (Abandoned), a failed mission after a rebel disobeyed a plan or panicked (Disgraced), a Source or rebel defecting (Betrayed). Which of these do you want, and what triggers them?
4. **Survivor** (one of the few who made it out) overlaps Lost a Squad. Do you want both, or should Survivor be the lesser version for a partial loss?

### F. Injury and Recovery (now built, see Phase 11)
Still open: (1) the exhaustion traits, Heavy Sleeper and Light Sleeper, need an exhaustion system, which the Injury section does not cover; (2) the Limp, Old Wound and Shrapnel *traits* are not granted because the new conditions (Broken Leg, Shrapnel) do that job. Should a long-untreated Broken Leg become a permanent Limp, or an old injury flare up as Old Wound? (3) Should pilots get critical injuries in space (today a cockpit breach only concussion)? (4) Should a Combat Medic specialty treat faster, treat from further away, or treat two injuries in one action?
