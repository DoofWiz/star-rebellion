# Design Blockers — conflicts and missing systems

> **Who this is for:** the designer. **Who keeps it:** the coder (Claude), every session.
> It lists two things and nothing else:
> 1. **Conflicts** — places where two of your docs, or a doc and the game, disagree, or where two systems I
>    built pull against each other. I picked something to keep the game running; you may want to overrule it.
> 2. **Missing systems** — mechanics that do not exist yet and that stop things already in the game (traits,
>    specialties, missions) from working. Each one says what it blocks and what I need from you.
>
> It is *not* a changelog (see `docs/REBELS_PLAN.md`, `docs/ROADMAP.md`) and not a wish list. Every row is
> something that is stuck or that I guessed at.

**Last updated:** 2026-10-03, after the gunship orbit rework (fly-in, orbit the mark, heavy gun, rocket counterfire).

## How to use this

- Answer in chat or edit the **Your call** line under any item; I will build it and move the item to the
  *Resolved* log at the bottom.
- IDs never change, so `C-3` and `M-2` can be quoted in a message. Items I add later get the next number.
- **Priority:** 🔴 blocks something the player can already see or reach · 🟡 blocks something that is listed but
  never switched on · ⚪ a choice I made that you may not care about.
- Maintenance rules I follow: whenever I hit a conflict or leave something unbuilt because a system is missing,
  I add it here *in the same commit*; when you decide, I resolve it in the same commit that builds it. If this
  file and the code disagree, the code is right and I fix this file.

## At a glance

| ID | Pri | Item | Blocks |
|---|---|---|---|
| C-1 | 🔴 | Two pilot skill systems (database vs. rebels) | Pilot aim/focus balance, the Level-bonus rule |
| C-2 | 🟡 | Scripted cast vs. generated rebels | Joss, Sera and Petra look different in space than on the roster |
| C-3 | 🟡 | Hero promotions need Level 2, which has no content | Heroes are rare to see in a real campaign |
| C-4 | ⚪ | Source docs disagree with each other (Level scope, Fuel/Intel, tiers) | Nothing live; wording only |
| C-5 | ⚪ | Specialties: 3 of 16 live, and they overlap the new skills | Rookie vs. specialist feel |
| C-6 | ⚪ | Anyone can treat wounds; the Combat Medic does nothing extra | Medic specialty value |
| C-7 | ⚪ | Vehicle rules the Ground Combat excerpt does not cover | How vehicle fights feel |
| C-8 | ⚪ | Bots ride as fire-support assets, not squad members | Where the Strider sits in a plan |
| C-9 | ⚪ | The Steal the Cross laser turret is still its own system | One rule for gun emplacements |
| M-1 | 🟡 | Per-rebel Risk and notoriety | 8 Rebel Traits, 2 Character Traits |
| M-2 | 🟡 | Capture, interrogation and ambush | 4 Rebel Traits, Rescue Prisoners missions |
| M-3 | 🟡 | Family | 2 Rebel Traits |
| M-4 | 🟡 | Revive and rescue in space | Failed to Save, space half of the rescue traits |
| M-5 | 🟡 | Command decisions and story events | 6 Rebel Traits |
| M-6 | 🟡 | Exhaustion and rest | Heavy Sleeper, Light Sleeper |
| M-7 | 🟡 | Mission and location tags (civilian, populated, criminal) | Streetwise, Former Criminal, Haunted, Mission Specialist reach |
| M-8 | 🟡 | Boarding theatre | Marines are data-only |
| M-9 | 🟡 | Rebel-linked economy hooks (Intel, Materials, diplomacy) | 7 Character Traits |
| M-10 | 🟡 | Armour and carried-gear effects | Strong, Weak, Messy, the fourth gear slot |
| M-11 | 🟡 | Pilot critical injuries and space-side gear | Pilots escape injury risk; gear only matters on foot |
| M-12 | 🟡 | Old injuries: permanent Limp, Old Wound | 6 Rebel Traits |
| M-13 | 🟡 | Vehicle stats, and a way to own a crewed vehicle | Player-owned cruisers, the Driver specialty |
| C-10 | ⚪ | Galaxy handoff ids and names vs. the game's region ids | Nothing live; I keyed the new tables to the game's ids |
| C-11 | ⚪ | Art-kit lore guesses: makers, ship and truck attachments, Strider maker | The Armoury/maker copy when those tabs arrive |
| M-14 | 🟡 | No art descriptions for the fuel depot and the Bruiser | Both draw restyled fallbacks |
| M-15 | 🟡 | Galaxy follow-ups: locked-world dive-in, mission regions, phone World view, Missions view | Exact marker placement; the phone World view ships provisional |
| M-16 | 🟡 | Gunship rocket counterfire built, but no enemy spawns with a rocket launcher; shot-down ship has no campaign cost | The gunship risk you specced never triggers today |

(Counts are as of today: 14 of 45 Character Traits and 27 of 59 Rebel Traits are listed but never granted.)

---

## 1. Conflicts

### C-1 🔴 Two pilot skill systems
**What happened.** While the Rebels work was in progress, the game database landed (`game/data/db.json`,
`game/js/data.js`) with its own pilot model: four skills of 0–50, an initiative of 1–6, and a bonus
`floor(skill/10) + floor(level/5)` for Aim and Focus. The Rebels doc has its own skills (Aim, Cunning, Focus,
Presence for pilots) that grow with experience, plus level, morale and injury effects on top.
**What I did.** Rebel pilots pass their skills, initiative and loadout through the database model so the space
scene displays them, but I kept my own finished Aim and Focus numbers (`fixed: 1` in `mkPilot`). Otherwise level
would be counted twice (once inside my skill curve, once in the `level/5` bonus) and mood and injury penalties
would be skipped. Scripted pilots from the database still use the database formula unchanged.
**Why it matters.** Rebel pilots and scripted pilots now follow different Aim/Focus rules. Both are balanced
separately, but a designer reading either doc would expect one rule.
**Needs from you.** Which is the rule: (a) the database formula (skill and level both give bonuses) with my
mood/injury modifiers added on top, or (b) the Rebels formula (level is already inside skills)? Also: the
database doc says the bonus formula is "proposed, not yet in the Rebels & Recruits doc" — should it go in?
**Your call:** _open_

### C-2 🟡 Scripted cast vs. generated rebels
Joss, Sera and Petra exist in three places: the starting roster in `base.js`, the registry (`AUTHORED` Character
Traits: Reckless, Lucky…), and the database pilot rows (`joss-marrek`, `sera-kest`, `petra-voss`, with their own
stats). On the roster they use the rebel model; in space their **initiative** comes from the database row and
their **skills** from the rebel model, so a database edit to Joss's Aim does nothing in the campaign. Sera's
*Lucky* is also still special-cased in the flight build. I did not unify them because the database rows also feed
scripted scenarios.
**Needs from you:** is the database row the source of truth for the named cast (and the rebel model should read
it), or is the rebel model the source and the database rows are only for tutorials and scenarios?
**Your call:** _open_

### C-3 🟡 Heroes need Level 2, but Level 2 has no content
Your decision was that Hero promotions wait for Revolution Level 2. Level 2 currently only plays the escalation
animation; Alerts, Hegemony raids, Level 2 missions and enemies do not exist (they are out of scope in the
roadmap). So in a Level 1 campaign no rebel ever becomes a Hero, the Hero actions (Rally cry, Heroic surge) can
only be seen in tests, and the Hero-linked traits cannot appear.
**Needs from you:** keep it that way until Level 2 is built, or open Heroes at the end of Level 1 (for example
at 90% of the meter) so they can be seen?
**Your call:** _open_

### C-4 ⚪ Source docs disagree with each other
Carried over from `docs/ROADMAP.md` "Doc issues" so they live in one place. All are wording problems that do not
block play; I followed the answer in brackets.
- Base doc says scope is "Rev levels 1 and 2"; the game scope is Level 1 only. *(Level 1 only.)*
- Base doc lists **Fuel** twice; the second is meant to be **Intel**. *(Intel.)*
- Enemies doc puts Frontier Sheriff/Deputy/Shorto Shotty/Tavern Scum in Rev Tier 3, but Dustfall (Rev 1) uses
  them; Bureau Officer appears under both Tier 1 and Tier 2. *(Left where Dustfall uses them.)*
- Missions doc tier names are cut off mid-sentence and several Tier 1 rewards are blank. *(Rewards are my numbers.)*
- Specialties, Locations Regions and Fleet Combat docs have empty or half-finished sections.
- "Imperium" vs. "Hegemony" in older GDD copy. *(Hegemony; I fixed the sections I touched.)*
**Needs from you:** confirm the bracketed answers, and fill the blank sections when you can (the Specialties one
matters most: see C-5).
**Your call:** _open_

### C-5 ⚪ Specialties are mostly unbuilt, and they overlap the new skills
Only three of the 16 specialties do anything: Field Technician, Vanguard (+1 aim) and Dogfighter (+1 aim). The
rest (Gunner, Commando, Assault, Combat Medic, Demolitions, Marksman, Commander, Driver, Leader, Bomber, Fire
Support, Flight Engineer, Shipbuster) are labels. Meanwhile, skills now grow with play, so a "+1 aim" specialty
sits next to an Aim skill that already grows. Specialties are chosen at level 3 at the Training Center; a rebel is
a "Rookie" until then.
**Needs from you:** what should a specialty give that a skill does not? (a) unique abilities only (no stat
bonuses), (b) a stat bonus plus an ability, or (c) a faster skill growth in their area? And the half-finished
Specialties doc, for the effects of the other 13.
**Your call:** _open_

### C-6 ⚪ Anyone can treat wounds
The Rebels doc's Treat Wound order was written without a specialist in mind; I let anyone use it (one injury per
action, worst first, within about 110 units). The Combat Medic specialty is not live, so it adds nothing yet.
**Needs from you:** should a Combat Medic treat faster, from further away, or two injuries in one action? Should
non-medics be limited to treating themselves, or to the bleeding only?
**Your call:** _open_

### C-7 ⚪ Vehicle rules the Ground Combat excerpt does not cover
I built vehicles from the *Vehicle Gameplay* excerpt you pasted in chat (the Ground Combat gdoc itself is not
reachable from the coding session). It lists Move, Sprint, Hold, Take Cover, Lock In, Exit, Enter, Switch
Position, Loot and Work. Everything below is my guess:
- **Timing:** Exit and Switch Position happen as the round opens and cost that round's shot; Enter happens at the
  end of the walk to the vehicle (the walk is up to a normal Move plus a step), so you are inside before the
  shooting starts.
- **Other actions inside:** no grenades, no Treat Wound, no Hack, no Un-jam (vehicle guns do not jam). Stims,
  Fire Support and the Hero's Rally cry still work.
- **Damage:** a destroyed vehicle does 10 to 22 to each person inside, with a 1 in 4 chance it counts as a critical
  (so a rebel can take an injury). A critical on a vehicle cuts its speed by a quarter. An open gun position
  (the Dispersal Cruiser's turret) can be shot at +3 TN; enclosed positions cannot be shot at all, and blasts hit
  the hull instead of the crew.
- **Bail-out (my addition):** a crew bails out of a vehicle under 30% hull on the same roll as a lawman
  surrendering. That is the only way an enemy vehicle becomes empty, so it is what lets rebels steal one mid-mission.
- **Who may enter:** any character on their feet (rebels, lawmen, Autos, the VIP), not a Bot, and only if nobody
  from the other side is aboard. An empty vehicle cannot be shot; it is scenery until someone climbs in.
**Needs from you:** confirm or change these, especially the bail-out and the damage to the crew.
**Your call:** _open_

### C-8 ⚪ Bots ride as fire-support assets, not squad members
You classed the Strider as a **Bot** (robot equivalent of a vehicle). The excerpt says owned vehicles are assigned
as an asset and summoned from the Fire Support menu, so I treated Bots the same: the Strider left the roster (old
saves move it) for a new **Vehicles and Bots** list, and in a plan it goes in the Fire support area instead of a
team slot. It is set down where you call it at the start of the next planning, so it can no longer start a mission
with the squad, and fire support (like all fire support) is only called once the shooting starts. A Bot that
is wrecked is lost for good; one that survives comes home with its damage and repairs in the hangar like a ship.
**Needs from you:** is that right for Bots, or should a Bot still deploy with the squad from the start (taking a
team slot)? And should a wrecked vehicle or Bot be lost, or come back needing a long repair?
**Your call:** _open_

### C-9 ⚪ The Steal the Cross laser turret is still its own system
The Asset Sheet's Vehicles tab lists turrets as vehicles. The laser turret on the Dustfall pad already works as a
one-seat emplacement (Man gun / Leave gun, a frontal shield arc), and I left it alone rather than risk the
onboarding mission. **Needs from you:** should emplacements become vehicles with speed 0 (Enter/Exit instead of
Man gun/Leave gun), or stay separate?
**Your call:** _open_

### C-10 ⚪ Galaxy handoff ids and names vs. the game's region ids
The Galaxy handoff's §7 tables use region ids `kiln`, `crossing` and `dataflats`/`ledger` shorthand; the game's
regions are `kilnridge`, `menkcross` and `dataflats`. I keyed `HEG_SITE`, `SRC_REGION` and the `WORLD_LOOK`
region fills to the **game's** ids so they actually resolve. The handoff also said source badges were green in
the art handoff; your note in the galaxy handoff says rebel red, which is what I built.
**Needs from you:** nothing unless you meant different region mappings; the table keys are in `base.js` next to
`PLANETDEF`.
**Your call:** _open_

### C-11 ⚪ Art-kit lore guesses carried into the game
From the art handoff's open questions, now live in `game/art/sr-art.js` data tables:
- **Makers:** Patriot is *proposed* for the HG-40, Power Baton, Riot Shield, Police Vest and Peacekeeper
  Carbine (flagged `makerProposed` in `ITEMS`). Cowboy No.4, Longhorn ’28, Varmint Shotgun, the Improvised
  Rocket Launcher, Mining Laser, Frontier Hardhat, Medpack and Stim have no maker.
- **Strider maker:** the Enemies doc says Autoworks, the gear doc says AutoCom makes Autos and Bots. The kit
  comment says Autoworks; nothing in-game shows it yet.
- **Ship attachments:** only the Door Mounted Gun is designed; `plates` and `tank` are placeholder examples.
- **Floatin' Truck attachments** (mg, plates, ram, spotlight, crates) are proposals; the truck itself is not in
  the game.
- **Armour as looks:** Soldiers/Marines wear the Frontier Hardhat and Marines a vest as *looks only*; the
  armoury has no armour items (see M-10).
**Needs from you:** confirm or correct the makers and attachment lists; say whether helmet/vest become equipment.
**Your call:** _open_

---

## 2. Missing systems

Each item says which listed traits or features it keeps switched off (they appear on the dossier's trait lists
and in the registry but are never granted).

### M-1 🟡 Per-rebel Risk and notoriety
**Blocks:** Wanted, Hegemony Informant, Defector, Rebel Celebrity, Propaganda Poster, Hero of the Rebellion, Made a
Name for Themselves, Symbol of the Rebellion (Rebel Traits); Streetwise and Former Criminal
(Character Traits, which reduce it).
**Why:** today there is one number, network exposure (`G.risk`), and only Sources move it. The traits describe
Risk per person and per situation.
**Needs from you:**
1. One network-wide meter that rebels add to, or a notoriety number per rebel?
2. What does Risk *do* at Level 1 and at Level 2 (raids and Alerts begin at Level 2)? It sets the size of the numbers.
3. What does "identity is known" mean as a state, and what clears it (time, a Source going quiet)?
4. How are Wanted, Informant, Defector, Celebrity and Poster acquired: mission rewards, a roll after loud missions,
   or a threshold of kills and notable wins?
**Interim:** none are granted; Streetwise and Former Criminal show on the dossier but change nothing.
**Your call:** _open_

### M-2 🟡 Capture, interrogation and ambush
**Blocks:** Captured, Tortured, Survived an Ambush, Haunted; the *Rescue Prisoners* and *Break
Out VIP* missions named in the Rebels doc.
**Why:** a downed rebel today simply comes home injured, and enemies never ambush.
**Needs from you:**
1. When is a rebel captured: a chance when a mission fails and they are downed? What chance?
2. What does captivity look like: off the roster for N days, a rescue mission, then interrogation (does it raise
   Risk, burn a Source, or cost the rebel?), then released, executed or turned?
3. What triggers Tortured, and does it carry an injury?
4. What makes a mission an ambush (a burned Source, high Risk, Security 3+, a trap mission type) and what changes
   in the scene (alerted enemies, a bad starting position, the first round theirs)?
5. Haunted: what tags and what event set it (see M-7)?
**Your call:** _open_

### M-3 🟡 Family
**Blocks:** Family of [B], Hegemony Family.
**Needs from you:** how does a relative come about (a recruit arrives with one, a rebel reveals one, a rescued
prisoner is someone's relative)? Is the "large morale effect" a bonus when together, a penalty when apart, or
both? Is the relative always on the roster, or sometimes outside it (and then what events)?
**Your call:** _open_

### M-4 🟡 Revive and rescue in space
**Blocks:** Failed to Save [B]; the space half of Saved/Owes a Life.
**Why:** ground combat has Treat Wound and rescue credit. Space has nothing similar: a shot-down pilot is lost.
**Needs from you:** is there a window to save an ejecting pilot (a wingman covering, a tow)? Does it cost an
action, and what does a failed attempt do (the trait fires on a failed rescue, or whenever an ally dies in reach)?
**Your call:** _open_

### M-5 🟡 Command decisions and story events
**Blocks:** Inspired, Survivor, Disgraced, Court-Martialled, Abandoned by Squad, Betrayed by [B], and (see C-3)
Hero of the Rebellion / Made a Name / Symbol.
**Why:** these need a decision the player makes (leaving wounded behind, ordering a retreat) or an event the
story makes (a defection, a witnessed act of heroism). Neither exists.
**Needs from you:** which of these you want and what triggers each. My suggestions: Abandoned = wounded left on
a retreat; Disgraced = a failed mission after a rebel disobeyed or panicked; Betrayed = a Source or rebel defecting;
Inspired = a Rally cry that turned the mission or a last stand. And whether Survivor should be a lesser version of
Lost a Squad (a partial loss) or dropped.
**Your call:** _open_

### M-6 🟡 Exhaustion and rest
**Blocks:** Heavy Sleeper, Light Sleeper.
**Why:** nothing tracks tiredness. Morale rises with rest, but a rebel has no energy meter.
**Needs from you:** is there an exhaustion stat (rises on missions, falls with rest, penalties at the top)? If so,
what does it cost, and does the Barracks speed recovery?
**Your call:** _open_

### M-7 🟡 Mission and location tags
**Blocks:** Streetwise (urban Sources), Former Criminal (criminal operations), Haunted (similar circumstances),
and the reach of Mission Specialist beyond mission *type*.
**Why:** missions have a type but no tags for civilian, populated, urban, criminal or enemy type.
**Needs from you:** the tag list (for example civilian / populated / criminal / hegemony-military) and which
missions and Sources get each. I can start with a guess if you would rather edit it.
**Your call:** _open_

### M-8 🟡 Boarding theatre
**Blocks:** Marines doing anything a Soldier does not. Marines exist as data (a ladder, a gear set, the dossier),
but no scene needs them and no recruit is ever a Marine.
**Needs from you:** is boarding in Level 1? If so, a brief (round structure, objectives, how it differs from
ground); if not, confirm Marines stay data-only.
**Your call:** _open_

### M-9 🟡 Rebel-linked economy hooks
**Blocks (Character Traits that are listed but have no effect):** Former Hegemony Officer (+1 Intel on Hegemony
missions), Former Engineer (Materials cost), Academic (Intel from a posted facility), Politician (diplomacy
quality), Industrialist (Materials generation), Intimidating (interrogation and coercion missions), Pragmatic
(reduced costs on certain operations).
**Why:** each needs a place in the economy that reads the *person* (posting a rebel to a room, picking a rebel
for a diplomatic task) rather than the room. Most rooms work without people today.
**Needs from you:** which rooms take a posted rebel and what they produce, and which of these should be passive
(applies from the roster) versus active (applies when posted or chosen). Also: what are "interrogation and
coercion missions"? (See M-2.)
**Your call:** _open_

### M-10 🟡 Armour and carried-gear effects
**Blocks:** Strong (carry a second primary; melee damage), Weak, Messy (10% to lose a piece of gear at launch);
the fourth gear slot beyond gadgets has no items.
**Why:** gear is slotted (primary, secondary, two gadgets) but there are no armour items, and melee barely exists
(`unarmed` is the only melee-like weapon). "Lose a piece of gear" needs an owner and a return rule.
**Needs from you:** an armour item list (what does armour do in the d20 math?), whether melee is a real action,
and what becomes of lost gear (gone, or found again after the mission?).
**Your call:** _open_

### M-11 🟡 Pilot critical injuries and space-side gear
**Why:** only ground fighters roll critical injuries. A cockpit breach in space gives a concussion; nothing else.
Gear slots only matter on foot; fighters have loadouts from the database but pilots carry nothing personal.
**Needs from you:** should pilots roll injuries from hull criticals? Which of the 12? And should a pilot's
gadgets matter in space?
**Your call:** _open_

### M-12 🟡 Old injuries
**Blocks:** Limp, Old Wound, Shrapnel (Rebel Traits). The current conditions (Broken Leg, Shrapnel) cover the
same ground, so I did not grant the traits. Lost an Eye, Lost an Arm and Prosthetic are the same story: the
Medical section on the dossier shows permanent losses and fitted prosthetics, so the traits are not granted either.
**Needs from you:** should a long-untreated Broken Leg become a permanent Limp, or an old injury flare up as Old
Wound? What flaring means (a random penalty on a mission)?
**Your call:** _open_

### M-13 🟡 Vehicle stats, and a way to own a crewed vehicle
**Blocks:** a player-owned vehicle that needs crew (the planning board and the Fire Support menu already take one,
but nothing gives the player one); the Driver specialty ("Handling vehicles"), which does nothing.
**Why:** the Asset Sheet's Vehicles tab has no entries, so the cruisers' numbers (hp, TN, speed, seats, guns) are
my placeholders carried over from the old enemy units. A cruiser stolen mid-mission is not kept: the *Steal
[Vehicle]* mission type is still waiting on its design.
**Needs from you:** vehicle rows (hp, armour or TN, speed, positions and which are enclosed, weapons per position),
how the player obtains a vehicle (Steal [Vehicle], keeping one taken in a mission, buying one), and what a Driver
specialist adds (speed, a better TN while driving, ramming?).
**Your call:** _open_

### M-14 🟡 No art for the fuel depot or the Bruiser
**Blocks:** nothing playable — both draw restyled fallbacks (the depot keeps its octagon with the kit's cel
shade and visor slit; the Bruiser borrows the Policebot archetype at 1.25×).
**Needs from you:** a line or two describing each (the Enemies doc stops short of them) and I'll add proper kit
entries.
**Your call:** _open_

### M-15 🟡 Galaxy view follow-ups from the handoff's own open questions
1. **Locked and uncharted worlds don't dive in** — they open the docked panel at galaxy level, as the handoff
   ships it. Its proposal (dive in shrouded) waits on you.
2. **Missions without a `region`** (e.g. Brakka Garrison Raid) fall back to the world's first settlement for
   markers and the region card's Local job. Adding `region` to `MPOOL` entries makes placement exact.
3. **The phone World view** uses the provisional layout (planet on top, panels as a bottom sheet, minimap
   hidden) and needs its own design pass.
4. **The Missions view** is the next design pass: the gold mission pins and the region card's "+n more" link
   currently open the old Missions window.
**Your call:** _open_

### M-16 🟡 Gunship counterfire is live, but nobody can shoot back yet
Per your spec, any hostile with a rocket launcher now gets a shot at an orbiting door-gun gunship
(one roll each, **14+ on a d20** brings it down — my number, tune at `DG_FLAK_TN` in `ground.js`). Two gaps:
1. **No enemy currently carries a rocket launcher** — `rocket` only reaches rebels via the Supply Drop — so the
   counter never fires today. Tell me which spawns should carry one (a Vult heavy in Take the Rock? riot squads
   at higher security?) and I'll add them.
2. **A shot-down support ship**: the crash is visual, the asset is lost for the mission, and the pilot always
   walks away (Cass is story-safe). For the player's *own* Graf later: should the fighter take hull damage or
   be destroyed back at base, and should the support pilot risk injury? Nothing persists right now.
**Your call:** _open_

---

## 3. Resolved log

*Nothing resolved through this file yet. Earlier decisions (Heroes wait for Level 2, Marines data-only, rank
decoupled from level, per-rebel morale on top of base mood, USAF pilot ladder, recruiting through the Command
Center) are recorded in `docs/REBELS_PLAN.md` §2.*

| ID | Decision | Date | Built in |
|---|---|---|---|
| — | The Strider is a **Bot** (Auto = robot character, Bot = robot vehicle, Drone = robot ship): automated, cannot be manned | 2026-10-02 | `26e3afc` |
| C-12 | Cass's Door Gunner belongs to **Take the Rock** (he's the smuggler who set the squad down in the canyon), not Steal the Cross. One-off: afterwards the player earns fire support by bringing their own Graf with a pilot and a Door Mounted Gun | 2026-10-03 | the "Door Gunner moved to Take the Rock" commit |
