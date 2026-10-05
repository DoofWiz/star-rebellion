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

**Last updated:** 2026-10-05, after Phase 4 of the Black Market / Arsenal handoff (ships, ship weapons and deliveries).

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
| C-4 | ⚪ | Source docs disagree with each other (Level scope, Fuel/Intel, tiers) | Nothing live; wording only |
| C-7 | ⚪ | Vehicle rules the Ground Combat excerpt does not cover | How vehicle fights feel |
| C-8 | ⚪ | Bots ride as fire-support assets, not squad members | Where the Strider sits in a plan |
| C-9 | ⚪ | The Steal the Cross laser turret is still its own system | One rule for gun emplacements |
| C-10 | ⚪ | Prices, market weights and `KIT` live in `base.js`, not the database | Where personal kit data lives |
| C-11 | ⚪ | Maker "TBC" on nine items | Dossier maker chips; flavour only |
| C-12 | ⚪ | Ships live in the Arsenal, not their own Fleet tab | Where the fleet is browsed |
| C-13 | ⚪ | Two small bugs in the handoff's §9 CSS, patched from `scenes.css` | Nothing live; keep the canvas CSS in sync |
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
| M-13 | 🟡 | Specialty abilities (the active ability each specialty gives) | 15 of 16 specialties |
| M-14 | 🟡 | Base-specific skills for Support rebels | Support have no skills at all |
| M-15 | 🟡 | Vehicle stats, and a way to own a crewed vehicle | Player-owned cruisers, the Driver specialty |
| M-16 | 🔴 | Armour effects for the new Head and Body slots | Armour is visible in the Arsenal but does nothing in a fight |
| M-17 | 🟡 | Items with no mechanics yet (`live:false` in `KIT`) | 10+ catalogue items; they are kept out of the market |
| M-18 | 🟡 | Rev 2+ market weights | Black Market stock once Level 2 lands |
| M-20 | 🟡 | Sweet Tooth needs an `SR_ART` character spec | The Black Market fence portrait |

(Counts are as of today: 14 of 45 Character Traits and 27 of 59 Rebel Traits are listed but never granted.)

---

## 1. Conflicts

One is open; the rest are in the resolved log at the bottom.

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
matters most: see M-13).
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

### C-10 ⚪ Prices, market weights and `KIT` live in `base.js`, not the database
The Market/Arsenal handoff told me to add the shared item catalogue (`KIT`: footprints, slots, makers, prices,
`live` flags) as a table in `base.js`, because `db.json` does not hold personal kit yet. That is where it is.
**Needs from you:** nothing urgent — but when personal kit joins the database, `KIT`, the prices and the market
weights should move into `db.json` so the data pipeline owns them.
**Your call:** _open_

### C-11 ⚪ Maker "TBC" on nine items
The Gear doc leaves the maker blank for: Cowboy No.4, Varmint Shotgun, Longhorn ’28, Stim, Cowboy Hat, Baseball
Cap, BLS-T Light Repeaters, Door Mounted Gun and the Riot Transport Cruiser. The Arsenal dossier shows a maker
chip, so these read "TBC" (or show none). **Needs from you:** maker names, whenever convenient. Flavour only.
**Your call:** _open_

### C-12 ⚪ Ships live in the Arsenal, not their own Fleet tab
The Gear doc gives ships a tab of their own; the Market/Arsenal handoff puts them under the Arsenal's
Ships chip, and you said that is "fine for now". Built that way. **Needs from you:** say the word if and when a
Fleet tab should exist, and what it would hold that the Arsenal's Ships view does not.
**Your call:** _resolved for now ("fine for now"); reopen at will_

### C-13 ⚪ Two small bugs in the handoff's §9 CSS, patched from `scenes.css`
`sr-kit.css` is checked in verbatim per the handoff, so the fixes live in `scenes.css` (which loads after it):
1. `.bm-strip{display:none}` is declared *after* the phone `@container` block that sets it to `display:flex`,
   so the phone strip never shows — re-asserted inside the same container query.
2. `.bm-restock span{…}` (the sub-line style) out-specifies `.bm-restock__n`, so a `<span>` day-counter renders
   tiny and grey — the game renders the number as `<i class="bm-restock__n">` instead.
3. `.bm-card .kit-well .it-art` (192px) out-specifies `.bm-merc__kit .it-art` (72px), so a mercenary lot's
   own-kit art fills the well and pushes the "Brings own kit" caption out — re-asserted in `scenes.css`.
**Needs from you:** nothing; just carry the fixes back into the canvas CSS if it gets re-exported.
**Your call:** _open (informational)_

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
**Blocks:** Inspired, Survivor, Disgraced, Court-Martialled, Abandoned by Squad, Betrayed by [B], and
Hero of the Rebellion / Made a Name / Symbol (a Hero can now emerge in Level 1, so these can be built).
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

### M-13 🟡 Specialty abilities
**Blocks:** 15 of the 16 specialties, which are labels with no effect. Direction from you (C-5): each specialty
gives **a cool active ability plus slight bonuses to a related skill**. Combat Medic is built as the first
example (+3 Presence, and Treat Wound that reaches further and covers two wounds with one pack). Vanguard
(+1 aim) and Dogfighter (+1 aim) still use the old flat bonus and should become a skill bonus plus an ability.
**Needs from you:** the active ability for each specialty. My first guesses are below, so edit freely. "Skill" is
the related skill that gets the slight bonus (about +3).

| Specialty | Skill | Proposed active ability |
|---|---|---|
| Field Technician (live) | Presence | Overclock: a hack or technical objective finishes in half the time |
| Vanguard (live) | Aim | Push Forward: once a mission, a squad mate in reach advances without losing cover and takes +1 to hit for the round |
| Gunner | Constitution | Suppressing Fire: pins enemies in a cone so they take −2 to hit for the round |
| Commando | Agility | Ghost: one round of true stealth even after being spotted |
| Assault | Aim | Breach and Clear: a rocket or heavy shot also stuns anyone next to the target |
| Combat Medic (live) | Presence | *(built as the Treat Wound bonuses; a second ability is open)* |
| Demolitions Specialist | Constitution | Shaped Charge: a thrown or planted charge ignores cover and walls |
| Marksman | Aim | Called Shot: a held shot at long range that cannot miss a target in the open |
| Commander | Presence | Rally Orders: the squad acts first next round |
| Driver | Agility | Hard Extraction: the squad extracts one round faster (vehicle handling is in M-15) |
| Dogfighter (live) | Aim | Tail Chase: a free shot at a ship that has just passed behind them |
| Leader | Presence | Wing Command: every ship in the wing takes +1 initiative for a round |
| Bomber | Aim | Bomb Run: a bomb that hits everything under its path |
| Fire Support | Cunning | Danger Close: a strafing run on a ground target the ground team has marked |
| Flight Engineer | Cunning | Field Repair: restores part of a wingmate's armour in flight |
| Shipbuster | Aim | Alpha Strike: a torpedo or heavy shot at a fixed point or a large ship, ignoring shields |

**Your call:** _open_

### M-14 🟡 Base-specific skills for Support rebels
**Blocks:** Support rebels have no skills (they never leave the base). You said they need skills of their own in
the future, tied to what they do at the base.
**Needs from you:** the list of base skills and what each one affects (for example Medicine for Infirmary
recovery and Med Pack output, Engineering for the Workshop and ship repairs, Logistics for Stores and supplies,
Intelligence for the Command Center and Sources, Diplomacy for the Diplomatic Quarter), how they grow (posting to
a room over time, training), and whether the specialty system applies to Support.
**Your call:** _open_

### M-15 🟡 Vehicle stats, and a way to own a crewed vehicle
**Blocks:** a player-owned vehicle that needs crew (the planning board and the Fire Support menu already take one,
but nothing gives the player one); the Driver specialty ("Handling vehicles"), which does nothing.
**Why:** the Asset Sheet's Vehicles tab has no entries, so the cruisers' numbers (hp, TN, speed, seats, guns) are
my placeholders carried over from the old enemy units. A cruiser stolen mid-mission is not kept: the *Steal
[Vehicle]* mission type is still waiting on its design.
**Needs from you:** vehicle rows (hp, armour or TN, speed, positions and which are enclosed, weapons per position),
how the player obtains a vehicle (Steal [Vehicle], keeping one taken in a mission, buying one), and what a Driver
specialist adds (speed, a better TN while driving, ramming?).
**Your call:** _open_

### M-16 🔴 Armour effects for the new Head and Body slots
**Blocks:** the Head and Body gear slots (now live in the Arsenal, the personnel file and auto-equip) from doing
anything in ground combat. There is no armour rule in the d20 math (see also M-10).
**Why:** the Market/Arsenal handoff ships the slots and the armour items first; the combat effect is a proposal.
**Proposal (from the handoff):** head armour adds **+1 def** (Frontier Hardhat, Police Helmet, Auto Head-Helm),
the **Police Vest +2 def**, and the Cowboy Hat and Baseball Cap add nothing (cosmetic). The squad entry already
carries `head` and `body` next to `wpns`, so the ground scene can read them the day you confirm.
**Interim:** shipped with **no combat effect** — armour equips, shows everywhere, and changes nothing in a fight.
**Your call:** _open_

### M-17 🟡 Items with no mechanics yet (`live:false` in `KIT`)
**Blocks:** these catalogue items from being stocked by the Black Market or auto-equipped: Improvised Plasma SMG,
Repurposed Mining Laser, Molotov Cocktail, Guardian Angel Drone, Auto Core Improvised Charge, Stim as a carried
item (the ground scene gives every rebel one built-in stim today), HG-40, Power Baton, Riot Shield, Auto Plasma
Hand. The **Improvised Rocket Launcher** is also `live:false`: the supply-drop rule removes a fired rocket from
the carrier's weapons mid-mission, but nothing says whether an *owned* launcher is spent for good (debited from
the armory) or just reloaded back home. The **Frontier Floatin’ Truck** stays out of `GVEH` until it has stats
(see M-15).
**Needs from you:** per item, the mechanic (or "cut it") — and for the rocket launcher, whether one shot consumes
the owned item.
**Your call:** _open_

### M-18 🟡 Rev 2+ market weights
**Blocks:** nothing yet (the Black Market rolls at Revolution Level 1 only). The handoff gives Rev 1 weights
(Weapon 28 · Gadget 24 · Mercenary 14 · Armour 12 · Ship weapon 10 · Vehicle 8 · Ship 4) and says the intent for
Rev 2+ is to move weight from kit toward ships, vehicles and mercs.
**Needs from you:** the Rev 2+ weight table, before Level 2 content lands.
**Your call:** _open_

### M-20 🟡 Sweet Tooth needs an `SR_ART` character spec
**Blocks:** the Black Market fence portrait (the rail's 150px head and the phone strip).
**Why:** `sr-art.js` is not on `main` and she has no character spec anywhere. The mockup stand-in had a big
round head, a teal headscarf with gold dots, an eyepatch, a gold-tooth grin, a gold earring and a pink jacket.
**Needs from you:** nothing from the design side — the handoff says the art chat owns the final look. Until the
art kit lands, the Black Market will use the generic avatar.
**Your call:** _open (owned by the art chat)_

---

## 3. Resolved log

Earlier decisions (Heroes wait for Level 2, Marines data-only, rank decoupled from level, per-rebel morale on top
of base mood, USAF pilot ladder, recruiting through the Command Center) are recorded in `docs/REBELS_PLAN.md` §2.

| ID | Decision | Date | What was built |
|---|---|---|---|
| C-1 | **A.** Pilots follow the database formula (`floor(skill/10) + floor(level/5)` for Aim and Focus), with mood, injury and the Dogfighter specialty added on top. | 2026-10-02 | The `fixed` override is gone. A rebel's skills are carried to the database's 0–50 scale at the base/space boundary (`Rebel.dbSkill`) and the space scene applies its own bonus; mood, injury and specialty ride on top as `aimMod`. Focus is the database bonus alone, so a fresh generated pilot is weaker than before at Aim and Focus. Scripted pilots and rebel pilots now follow one rule. |
| C-2 | The scripted opening rebels are the same for every player but are generated from the same database as every other rebel. | 2026-10-02 | `Rebel.scripted(spec, row)` builds the cast through the normal rebel path. Joss and Sera take level, experience, initiative and skills from their database rows (Joss now starts at level 4 and Sera arrives at level 3, as the database says); the soldiers use fixed values. Sera's Lucky is her Character Trait, not a special case. Petra only exists in the space scenario. |
| C-3 | Revolution Level 1 lets exactly one Hero emerge in a playthrough; if they die there is no replacement. | 2026-10-02 | `G.heroesMade` counts Heroes ever made; Level 1 allows one, Level 2 and above use the normal rules. In ten bot runs a Hero appeared before the escalation in five (days 45–83). The one Hero is for testing; the rate is easy to raise. |
| C-5 | A specialty should give a cool active ability plus slight bonuses to a related skill, depending on the specialty. Support rebels need base-specific skills later. | 2026-10-02 | Direction only for now. Combat Medic is live as the first example (see C-6). The ability for each specialty is M-13; Support skills are M-14. |
| M-19 | Ship weapons live in a store (`G.shipKit`) and a picker fits them — the model the Market/Arsenal handoff §3.3 itself specifies, so no separate answer was needed. | 2026-10-05 | Sweet Tooth sells the BLS-T Light Repeaters, Missiles and Door Mounted Gun; bought weapons land on the hangar racks (`G.shipKit`); the Arsenal's Ships view gains a **Refit** order that fits rack weapons to a ship's mounts (`weapon_slots` from the db) and returns swapped-out weapons to the racks. Built with Phase 4. |
| C-6 | Treating a wound needs an item (a Med Pack); specialist training should add bonuses, never make it harder for the untrained. | 2026-10-02 | A **Med Pack** gadget (four at the start). Ground rebels are handed one in their second gadget slot; Treat Wound uses one pack per action and the card shows how many are left. A used pack leaves the armory at the debrief. The Infirmary makes a pack every three days (two with someone on station) for 8 supplies, up to 4 plus 2 per Infirmary tile. **Combat Medic** is live: treats from 1.5× as far, one pack covers two wounds, and +3 Presence. |
| — | The Strider is a **Bot** (Auto = robot character, Bot = robot vehicle, Drone = robot ship): automated, cannot be manned | 2026-10-02 | `26e3afc` |
