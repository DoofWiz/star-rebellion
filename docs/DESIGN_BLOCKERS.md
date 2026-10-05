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

**Last updated:** 2026-10-05, after the October 5 art handoff and the designer's answers on the Back slot (C-25),
wrecks (M-15), the new art (M-26) and Steady (M-27): the Back slot with the Razorrat and Riot Shield as deployables,
fire modes, Steady and Knockback, the EG-55 as Fightstar plasma, maker badges and trait icons, the layered vitals
bar, fire-support art and ships parked in the iso hangar.

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
| C-13 | ⚪ | Two small bugs in the handoff's §9 CSS, patched from `scenes.css` | Nothing live; keep the canvas CSS in sync |
| C-15 | ⚪ | Prologue quips are placeholder lines | The designer's own opening lines |
| C-18 | ⚪ | Ship and truck attachment lists are still guesses | The Armoury copy when attachments arrive |
| C-19 | ⚪ | Ships live in the Arsenal, not their own Fleet tab (was a duplicate C-12) | Where the fleet is browsed |
| C-24 | ⚪ | Enemy types and loadouts the Enemies doc doesn't cover | Which enemies exist and exactly what each carries |
| M-1 | 🟡 | Per-rebel Risk and notoriety | 8 Rebel Traits, 2 Character Traits |
| M-2 | 🟡 | Capture, interrogation and ambush | 4 Rebel Traits, Rescue Prisoners missions |
| M-3 | 🟡 | Family | 2 Rebel Traits |
| M-4 | 🟡 | Revive and rescue in space | Failed to Save, space half of the rescue traits |
| M-5 | 🟡 | Command decisions and story events | 6 Rebel Traits |
| M-7 | 🟡 | Mission and location tags (civilian, populated, criminal) | Streetwise, Former Criminal, Haunted, Mission Specialist reach |
| M-8 | 🟡 | Boarding theatre | Marines are data-only |
| M-9 | 🟡 | Rebel-linked economy hooks (Intel, Materials, diplomacy) | 7 Character Traits |
| M-10 | 🟡 | Carried-gear effects: Strong, Scrawny's melee half, Messy, melee, lost gear | 2 Character Traits and a half |
| M-11 | 🟡 | Pilot critical injuries and space-side gear | Pilots escape injury risk; gear only matters on foot |
| M-12 | 🟡 | Old injuries: permanent Limp, Old Wound | 6 Rebel Traits |
| M-13 | 🟡 | Specialty abilities (the active ability each specialty gives) | 15 of 16 specialties |
| M-14 | 🟡 | Base-specific skills for Support rebels | Support have no skills at all |
| M-15 | 🟡 | Vehicle stats and a way to own a crewed vehicle | Player-owned cruisers, the Driver specialty |
| M-17 | 🟡 | Items with no mechanics yet (`live:false`) | 7 catalogue items and the owned rocket launcher; kept out of the market |
| M-18 | 🟡 | Rev 2+ market weights | Black Market stock once Level 2 lands |
| M-21 | 🟡 | No art descriptions for the fuel depot and the Bruiser | Both draw restyled fallbacks |
| M-22 | 🟡 | Galaxy follow-ups: locked-world dive-in, mission regions, phone World view, Missions view | Exact marker placement; the phone World view ships provisional |
| M-23 | 🟡 | Gunship rocket counterfire built, but no enemy spawns with a rocket launcher; shot-down ship has no campaign cost | The gunship risk you specced never triggers today |
| M-24 | 🟡 | Loot rules still open: random crates, gear lost on death (enemy drops are built) | Rolling loot crates; Messy |
| M-28 | 🟡 | Vehicle criticals and wreck damage are placeholders | How vehicle fights feel |
| M-29 | 🟡 | Art follow-ups from the October 5 art handoffs | A weary icon; Helix and the ship weapon makers in the Gear doc; poses that wait on items |

(Counts are as of today: 12 of 45 Character Traits and 27 of 59 Rebel Traits are listed but never granted.)

---

## 1. Conflicts

Open: C-13, C-15, C-18, C-19 and C-24; the rest are in the resolved log at the bottom.

### C-19 ⚪ Ships live in the Arsenal, not their own Fleet tab
*(Numbered C-12 by mistake when it was added; C-12 is Cass's Door Gunner in the Resolved log.)*
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
4. `.ar-slots` and `.ar-slothead` (the Arsenal's Loadouts rail) have six columns; the Back slot (C-25) needs a seventh,
   re-declared in `scenes.css`.
**Needs from you:** nothing; just carry the fixes back into the canvas CSS if it gets re-exported.
**Your call:** _open (informational)_

### C-15 ⚪ Prologue quips are placeholder lines
The three soldier quips after the prologue briefing (A3 of the handoff) are reused lines: the old cinematic lead
line, one of Runa's barks and one of Kel's. They sit in one table, `PROLOGUE_QUIPS` in `game/js/ground.js`, so
they can be rewritten without touching anything else. **Needs from you:** the real lines (and whether each should
be pinned to a named rebel or go to whoever stands first, second and third).
**Your call:** _open_

### C-18 ⚪ Art-kit lore guesses carried into the game
**Settled:** the makers (Gear doc and the October 5 art handoff: every maker the doc names is in the items table and
the art kit, TenTiU is gone, the Patriot items are confirmed, the EG-55 is Fightstar); the Strider is AutoCom's;
armour is built; the four head items have art.
**Still open:**
- **Ship attachments:** only the Door Mounted Gun is designed; `plates` and `tank` are placeholder examples.
- **Floatin' Truck attachments** (mg, plates, ram, spotlight, crates) are proposals; the truck itself is not in
  the game.
**Needs from you:** the ship and truck attachment lists, whenever you get to them.
**Your call:** _part answered; attachments open_

### C-24 ⚪ Enemy types and loadouts the Enemies doc doesn't cover
The enemy roster (the Enemies tab of the spreadsheet, `enemies` in `db.json`) follows the Enemies doc where it
says something, and the art kit where the doc is silent. Every enemy spawn names a row, and what the row carries
is what they fight with and drop. Where I had to guess:
- **Types the game needs that the doc doesn't have** (`in_doc` FALSE): the Haven Rock squatters and Boss Craw, the
  Tithe depot's guards and warden. Two tower lookouts are a deputy and a depot guard with a hunting rifle and
  sniper stats set on the spawn. In space (the Space Enemies tab): Commandant Vex's Academy Commandant type, the
  Academy Cadets and the Fuel Depot. The doc's four Tier 1 space types (Monitor, Pursuer, Mag-Clamper, Mote) are in.
- **Doc types not in the game yet:** Bureau Officer (a Tier 2 type that may rarely appear in Tier 1 once the
  intelligence meta game's risk is specced, per your C-4 answer), Shorto Shotty, Tavern Scum, the Floatin' Truck,
  and all of Tier 2 and 3.
- **Loadouts:** Hegemony security carries Patriot kit: the HG-40 pistol (Patrolmen, shieldmen, depot guards),
  EG-55 Peacekeeper Carbine (riot riflemen; Fightstar plasma now), Police Helmet and Vest (riot police; Police Vest
  on depot guards). Riot shieldmen carry a Riot Shield that soaks hits from the front until it breaks. Policebots
  carry the Auto Plasma Hand. Outworlders keep frontier guns (Cowboy, Varmint Shotgun); deputies and the sheriff wear
  a Police Vest because the art kit draws one, and the sheriff a Cowboy Hat. Squatters wear nothing. **Now that
  armour works, what they wear matters:** a Police Vest is a 20-point armour bar, a Police Helmet 12, on top of the
  row's health.
- **Placeholder stats:** the HG-40 and Auto Plasma Hand still copy the Cowboy No.4. The Gear doc now gives them
  traits (HG-40: semi-auto, Sundering; Auto Plasma Hand: plasma, semi-auto, crafted from an Auto): Sundering is in,
  the fire modes are built too (the AI always fires on a weapon's default mode).
- **Looks:** riot shieldmen and riflemen are people in Police Helmets (the `riot` and `riotrifle` archetypes, from the
  art handoff); the sheriff wears his Cowboy Hat on screen too. Patrolmen draw no vest.

**Needs from you:** the real loadout per type whenever you spec it in the Enemies doc (straight into the Enemies
tab), stats for the HG-40 and Auto Plasma Hand, and whether the squatters and depot guards should become doc types.
**Your call:** _open (Enemies doc update pending)_

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

### M-10 🟡 Carried-gear effects: Strong, Scrawny, Messy, melee, lost gear
**Blocks:** Strong (+20% melee; a Heavy weapon as a primary, a deployable without deploying it), the melee half of
Scrawny, Messy (10% to lose a piece of gear at launch).
**Done since:** armour is built (M-16 in the resolved log). The Rebels doc renamed **Weak** to **Scrawny** and gave
it +2 defence on the ground: that half is live (the save key stays `weak`).
**Why the rest waits:** melee barely exists (bare hands and the Bruiser's fists are the only melee; the Power Baton
has no rules), Strong's Heavy rule needs a check in the slot rules (the Back slot exists now: C-25), and "lose a
piece of gear" needs a return rule.
**Needs from you:** whether melee is a real action, and what becomes of lost gear (gone, or found again after the
mission?).
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
**Blocks:** a player-owned vehicle that needs crew (the planning board and the Fire Support menu's **Deploy
[Vehicle]** already take one, but nothing gives the player one); the Driver specialty ("Handling vehicles"), which
does nothing.
**Why:** the Asset Sheet's Vehicles tab has no entries, so the cruisers' numbers (hp, armour, TN, speed, seats, guns)
are my placeholders carried over from the old enemy units. They live in the enemy roster (the Enemies and Vehicle
Seats tabs of the spreadsheet), so your numbers can go straight in there. Vehicle armour is its own column there.
A cruiser stolen mid-mission is not kept: the *Steal [Vehicle]* mission type is still waiting on its design.
**Settled:** a wrecked vehicle or Bot is lost for good (you may revisit it later). The Fire Support gdoc entry for
Deploy [Vehicle] is yours to write.
**Needs from you:** vehicle rows (hp, armour, TN, speed, positions and which are enclosed, weapons per position),
how the player obtains a vehicle (Steal [Vehicle], keeping one taken in a mission, buying one), and what a Driver
specialist adds (speed, a better TN while driving, ramming?).
**Your call:** _open (wrecks settled)_

### M-17 🟡 Items with no mechanics yet (`live:false` in the items table)
**Blocks:** these catalogue items from being stocked by the Black Market or carried: Improvised Plasma SMG
(automatic, Unstable), Repurposed Mining Laser (a deployable: a cone sweep and a Recharge action), Molotov Cocktail
(fire, and an Extinguish action), Guardian Angel Drone (intercepts one attack), Auto Core Improvised Charge, Stim as a
carried item (the ground scene gives every rebel one built-in stim today) and the Power Baton (melee, Stunning). The
Gear doc describes all of them and the art kit has their poses and effects (`misfire`, the Mining Laser's
`fire`/`recharge`, `burning`/`extinguish`, `stunned`), so they wait on building, not on you. The **Improvised Rocket
Launcher** is also `live:false`: the supply-drop rule removes a fired rocket from the carrier's weapons mid-mission,
but nothing says whether an *owned* launcher is spent for good (debited from the armory) or just reloaded back home.
The **Frontier Floatin' Truck** stays out of the roster until it has stats (see M-15).
**Done since:** the Razorrat LMG and the Riot Shield are live (resolved log, C-25).
**Needs from you:** for the rocket launcher, whether one shot consumes the owned item; for the rest, nothing until
I build them (say if one should jump the queue).
**Your call:** _open_

### M-18 🟡 Rev 2+ market weights
**Blocks:** nothing yet (the Black Market rolls at Revolution Level 1 only). The handoff gives Rev 1 weights
(Weapon 28 · Gadget 24 · Mercenary 14 · Armour 12 · Ship weapon 10 · Vehicle 8 · Ship 4) and says the intent for
Rev 2+ is to move weight from kit toward ships, vehicles and mercs.
**Needs from you:** the Rev 2+ weight table, before Level 2 content lands. It is a row in the Market Weights tab
of the spreadsheet now (C-10): add a row with `rev` 2 and the game picks it up.
**Your call:** _open_

### M-21 🟡 No art for the fuel depot or the Bruiser
**Blocks:** nothing playable — both draw restyled fallbacks (the depot keeps its octagon with the kit's cel
shade and visor slit; the Bruiser borrows the Policebot archetype at 1.25×).
**Needs from you:** a line or two describing each (the Enemies doc stops short of them) and I'll add proper kit
entries.
**Your call:** _open_

### M-22 🟡 Galaxy view follow-ups from the handoff's own open questions
1. **Locked and uncharted worlds don't dive in** — they open the docked panel at galaxy level, as the handoff
   ships it. Its proposal (dive in shrouded) waits on you.
2. **Missions without a `region`** (e.g. Brakka Garrison Raid) fall back to the world's first settlement for
   markers and the region card's Local job. Adding `region` to `MPOOL` entries makes placement exact.
3. **The phone World view** uses the provisional layout (planet on top, panels as a bottom sheet, minimap
   hidden) and needs its own design pass.
4. **The Missions view** is the next design pass: the gold mission pins and the region card's "+n more" link
   currently open the old Missions window.
**Your call:** _open_

### M-23 🟡 Gunship counterfire is live, but nobody can shoot back yet
Per your spec, any hostile with a rocket launcher now gets a shot at an orbiting door-gun gunship
(one roll each, **14+ on a d20** brings it down — my number, tune at `DG_FLAK_TN` in `ground.js`). Two gaps:
1. **No enemy currently carries a rocket launcher** — `rocket` only reaches rebels via the Supply Drop — so the
   counter never fires today. Tell me which enemy types (or single spawns) should carry one (a Vult heavy in Take
   the Rock? riot squads at higher security?). With the roster that is one cell: `rocket` as their `weapon_2`.
2. **A shot-down support ship**: the crash is visual, the asset is lost for the mission, and the pilot always
   walks away (Cass is story-safe). For the player's *own* Graf later: should the fighter take hull damage or
   be destroyed back at base, and should the support pilot risk injury? Nothing persists right now.
**Your call:** _open_

### M-24 🟡 Loot and drop rules
**Blocks:** random loot of any kind, and the Messy trait.
**Answered (2026-10-05):** downed enemies drop what they carry. Built: every usable item in their roster kit
(`live` items only; built-ins like fists never drop) plus their credits, at the `enemy_drop_chance` rule, which is 1
(always) for now. That is a lot more loot than before (a Steal the Cross run now yields six Police Vests), so tune
the rule, or say "always weapons, sometimes armour", if it floods the stores.
**Still open:**
1. Should some crates roll their contents (e.g. "a Hegemony sidearm, tier 1") rather than list them?
   (`Items.roll` is ready for it.)
2. What happens to a dead rebel's gear: back to the armory (today), or lost on the field (and recoverable if you win)?
**Your call:** _part answered; 1 and 2 open_

### M-28 🟡 Vehicle criticals and wreck damage (placeholders, for you to revisit)
You confirmed the C-7 rules and said vehicle criticals are for another time. What is built, all my numbers:
- A critical hit on a vehicle cuts its speed by a quarter (once).
- A destroyed vehicle throws its crew clear for 10 to 22 each, with a 1 in 4 chance of counting as a critical (so a
  rebel can take an injury); its blast also catches anyone within 130 for 12 to 26 (less further out). The player
  may shoot an empty vehicle to set that off; the enemy never does, and it is never picked as a default target.
- An open gun position (the Dispersal Cruiser's turret) can be shot at +3 TN; enclosed ones cannot be shot at all.
**Needs from you:** the vehicle critical table, when you get to it.
**Your call:** _open_

### M-29 🟡 Art follow-ups from the October 5 art handoff
The handoff landed everything in the resolved log's M-26 row; a few loose ends remain.
- **Weariness** (Rebels doc: a tag on the rebel's icon and an icon by their name) has no icon in the art kit; the
  game shows a "Zz" tag.
- **Makers with no items yet:** LMC, General Astronautics, Nomad and Rook have badges and looks but nothing to wear
  them. The art's style mocks for them (the Arclight, the nomad coat, the Rook helm, the frigate) stay out of the game
  data until the Gear doc names real items.
- **Helix:** the second art handoff of October 5 makes the **Medpack and Stim Helix** (the art kit now draws them in
  Helix's white and teal), so the items table says Helix. The Gear doc does not name their maker yet; add it there,
  or tell me to put them back.
- **Ship weapon makers** are the art's proposals: the BLS-T Repeaters Bhord, the Missiles Varrondow, the drone pulse
  emitters AutoCom, the Pursuer's pulse cannon Patriot. They set the colour of the bolts only.
- **Poses that wait on items:** `burning`/`extinguish` (Molotov), `misfire` (Plasma SMG), `stunned` from Stunning (the
  Power Baton), the Mining Laser's sweep and `recharge` (all M-17). A concussed rebel already uses `stunned`.
- **Personal shields:** the hex bubble and the shield bar are wired, but no Level 1 item grants a shield.
**Needs from you:** Helix and the ship weapon makers in the Gear doc; a weary icon is the art chat's.
**Your call:** _open_

---

## 3. Resolved log

Earlier decisions (Heroes wait for Level 2, Marines data-only, rank decoupled from level, per-rebel morale on top
of base mood, USAF pilot ladder, recruiting through the Command Center) are recorded in `docs/REBELS_PLAN.md` §2.

| ID | Decision | Date | What was built |
|---|---|---|---|
| C-25 | The final slot list is primary, secondary, two gadgets, head, body and back. | 2026-10-05 | Soldiers, Marines and Heroes get a **Back** slot (Pilots and Support do not), in the Arsenal, the personnel file, auto-equip and the squad entry; old saves get an empty one (save version 3). The **Razorrat LMG** and the **Riot Shield** are live. A rebel with one on their back gets **Deploy** (as the round opens, no shot): the Razorrat is set up where they stand and they man it (no sandbags in the field; one emplacement per map), the Riot Shield goes into their hands in place of the primary. Riot shields, the enemy's too, now soak hits from the front until they break (60, the `riot_shield_hp` rule; a broken one is used up and does not drop). **Effect:** riot shieldmen can now be worn down from the front instead of only flanked; the mission hints say so. the "Back slot, deployables, fire modes and the October 5 art handoff" commit |
| M-15 | A wrecked vehicle or Bot is lost for good (to revisit later). | 2026-10-05 | No change: that was already the rule. The rest of M-15 stays open. the "Back slot, deployables, fire modes and the October 5 art handoff" commit |
| M-26 | Claude Design's October 5 art handoff covers the new kit and makers. | 2026-10-05 | New `sr-art.js`, style guide and handoff in. Art for the ST Stiletto, Razorrat, the four head items, the limpet, the shell box and the C90 (the alias is gone); **maker badges** on Arsenal and Black Market cards; **trait and damage-type icons** on the cards and in weapon tooltips; the **EG-55 Peacekeeper Carbine** is Fightstar plasma (C-23 settled); riot police wear Police Helmets (`riot`, `riotrifle`); **Sweet Tooth** has her own character (M-20 settled); the layered **vitals** bar over units and matching plate and hex shapes in the rail; the shield bubble, armour, shield, Sundering and Piercing hit effects; the `deploy`, `knocked` and `stunned` poses; strafing runs, supply drops and landings drawn by the kit (the run flies the assigned ship); ships parked in the iso hangar with `shipIso`. Loose ends are M-29. the "Back slot, deployables, fire modes and the October 5 art handoff" commit |
| M-27 | Holding's +2 belongs to the Steady trait alone. | 2026-10-05 | Item columns `fire_modes`, `steady`, `knockback`, `stunning`, `unstable`, from the Gear doc. **Fire modes** as the doc gives them (Automatic −5 and a second roll at −10 on a hit; Semi-auto +1 a round on the same target until you move or panic; Fan hammer −5 and double damage; Single shot nothing), chosen with a **fire-mode toggle** in the attack window (F cycles); a weapon starts on its mode with no penalty, and the AI never switches. **Steady:** +2 when braced, or on a target you held fire on, only with a Steady weapon (the Longhorn); everyone else lost the old BRACED +2. **Knockback** (the rocket) shoves the target. Stunning and Unstable wait on their items (M-17). **Effect:** Semi-auto's stacking bonus applies to enemies too, so long fights against one target get more accurate on both sides; holding with an Akli is no longer a bonus. the "Back slot, deployables, fire modes and the October 5 art handoff" commit |
| M-16 | Armour and shields in ground and boarding combat (Ground Combat doc): armour is a bar over health that damage drains first, a shield is a bar over both, raised when activated and hit first; no arcs on the ground; hats are cosmetic. Vehicle armour is its own value, apart from ships. | 2026-10-05 | Items carry `armour` and `shield`; enemy rows carry innate `armour` and `shield` (vehicles and Bots). Worn Head and Body kit gives the bar: Frontier Hardhat 10, Police Helmet 12, Auto Head-Helm 15, Police Vest 20; Cowboy Hat and Baseball Cap 0. Sundering (×1.5 to armour, `armour_sunder_mult`) and Piercing (25% past the armour, `armour_pierce_frac`) follow the Gear doc. Bars draw over every health bar (map pips, the squad rail). A hit the bars soak whole causes no wound or critical injury. Enemies raise their shields with the alarm; a rebel raises theirs with **Shield up** in the attack card (costs the shot). Nothing has a shield at Level 1. **My numbers and calls:** all the values above; armour is mended between missions. **Effect:** enemies in vests and helmets now take 20 to 32 more damage than before (their health was not reduced), so Steal the Cross's deputies and the riot squads are tougher; rebels in looted vests are tougher too. The cruisers and the Strider had armour split out of their old health, so they last as long as before. Tune in the Items and Enemies tabs. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| M-6 | Rest (Rebels & Recruits doc): after two missions without rest a rebel is weary, loses morale and rests at the base a day per mission (any day at the base is rest); used weary, they lose morale and fight worse; kept going, they are conked in the Barracks and need longer. Weariness shows as a tag. | 2026-10-05 | `game/js/rebel-rest.js`: `p.tired` counts missions without rest; Weary at 2 (−4 morale, a "Zz Weary" tag, still pickable), each mission while Weary −3 morale, and −1 aim and −10 nerve in a fight (−1 aim in space); Conked at 4 (+2 to the count, off every list and post until rested). Each day not on a mission rests 1 off; **Heavy Sleeper** 0.5 a day and no morale hits, **Light Sleeper** 1.5 (both now live). Old saves start everyone rested (save version 2). **My numbers:** all of them; the Barracks does not speed rest (the doc does not say). the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-4 | Scope is Level 1 for now; the Base doc's second Fuel is Intel; Bureau Officer is Tier 2 (rarely Tier 1 once the intelligence risk is specced); blank Tier 1 rewards are deliberate, so I put in my guesses; the enemy is the Hegemony everywhere; Fleet Combat is out of scope and Specialties and Locations/Regions are being written in the gdocs. | 2026-10-05 | Repo docs updated (`docs/GDD.md` with a Tier 1 rewards table, `docs/ROADMAP.md`); the old name is gone from the repo. The designer has since fixed the Base gdoc's Fuel line. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-7 | The vehicle rules stand as built, bail-out included (enemies bail out when they surrender); vehicle criticals are for later. Unmanned vehicles should still be targetable, since a wreck going up can hurt someone nearby. | 2026-10-05 | The player may shoot an empty vehicle (never the enemy, and never as a default target); a destroyed vehicle's blast now hits anyone within 130, crewed or not. The placeholder critical and wreck numbers are M-28. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-8 | An owned vehicle or Bot assigned to a mission adds **Deploy [Vehicle]** to the Fire Support menu, which deploys it into the mission (the designer will add it to the Fire Support gdoc). | 2026-10-05 | The menu entry reads "Deploy Old Faithful"; the plan's Fire support area says so. Deployment was already built that way (set down where called at the start of the next planning). The wreck question (lost, or a long repair) moved to M-15. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-9 | Swap the Steal the Cross laser turret for the **Razorrat LMG** (a Gear doc deployable), and add it to the database with its missing stats. | 2026-10-05 | `razorrat` item (Bhord, ballistic, Piercing, Heavy, deployable, Back slot; 30–46, attack +3, range 640: my stats; `live:false` until M-25). The pad emplacement is a Razorrat behind sandbags: Man gun / Leave gun as before; the laser's frontal energy shield (which blocked every shot) is now sandbags worth +3 TN from the front, since the ground has no arcs. The `laser` item is gone. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-10 | The market weights go in the spreadsheet too. | 2026-10-05 | A `market_weights` table (Market Weights tab), one row per Revolution Level it applies from; the Black Market reads it. Only Level 1 has a row (M-18). the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-11 | The Gear doc names the makers; new weapons and makers need Claude Design to add visuals. | 2026-10-05 | Makers from the Gear doc: Cowboy No.4, Varmint Shotgun and Longhorn ’28 are Devlin & Son, the Frontier Hardhat and Mining Laser Praxon, the Patriot items confirmed; crafted items (rocket launcher, Plasma SMG, Auto Head-Helm, Auto Core charge, Auto Plasma Hand, Molotov, Angel Drone) have none; the hats have none. The Manufacturers table follows the Gear doc (Fightstar, Devlin & Son, LMC, Praxon, Helix, General Astronautics, Nomad and Rook added; TenTiU dropped). New: the ST Stiletto (Fightstar plasma carbine, my stats, sold). Descriptions come from the Gear doc. Art is M-26. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-17 | Nothing to change in the handoff ids; region and location names must be renamable later. | 2026-10-05 | Worlds, regions and leads were already saved by id. Missions copied the names: they now refresh from `PLANETDEF` on every load, so renaming a world or region there renames it on missions already on the board (save-smoke checks it). Hand-written story copy (briefings, Source lines) still names places in its text. the "Armour and shields, rest, the Razorrat and the designer's C-4 to C-24 answers" commit |
| C-20 | One recovery model, the newer one (conditions at `healRate`). | 2026-10-05 | Being laid up is a condition now (Laid Up, Spinal Injury, Recovering from an Amputation, Prosthetic Surgery) with a `laidUp` flag that keeps the rebel off duty; it heals at the same rate as every other condition (0.25 a day with no Infirmary, 1 with one, +1 with someone on it, +0.5 medic, +1 doctor, +0.5 Surgery Room) and ends as the old counter did (back on their feet, Scarred after five days or more, Nearly Dead after a spinal injury or an amputation, the prosthetic fitted). The Garrison Officer's perk stays as +1 a day for ground fighters. The old `p.injured`, `injDur`, `critHeal` and `prosPending` are converted on load. **Effect:** before an Infirmary is built a stretcher case is out about 12 days instead of 5 (2.4 with a Garrison Officer), and the opening mission's 1 to 3 days become 4 to 12; tune `NO_INFIRMARY` in `rebel-injury.js` if that is too harsh. Commit "One recovery model: being laid up is a condition". |
| C-22 | Space follows the rebels' trait and rank rules (the campaign descriptions are the rules). | 2026-10-05 | Space pilots carry rebel trait keys and each trait does what its card says: Lucky is a 5% chance to survive a killing blow (it was ±1 to hit), Veteran is +1 accuracy and slower to panic (it was +1 initiative and a nerve floor), Unlucky takes 5% more criticals, Brave and Cowardly share one rule with the ground. Friends and In Love now act in space too (panic when the partner goes down), which is what Petra's old "Friends: Joss" did. Green became the Academy Cadets' `nerve_cap` and the roster's `lead`. Ranks: the rebel ladder, or a `rank` title on Hegemony pilot rows (Vex: Commandant). The scene's own trait text and rank ladder are gone. Commit "Space pilots carry the rebels' traits and ranks". |
| C-21 | An owned Strider is the same as the enemy one. | 2026-10-05 | `OWNED_STRIDER` is gone: the owned Bot, the Steal the Strider VIP and the enemy all read the `strider-mk1` roster row (240 hp, aim 1, def 8), so a hacked Strider no longer loses 20 hp on joining. Commit "An owned Strider is the enemy one". |
| C-14 | Every door gunner is zone-targeted, not just Cass's: the gunship-orbit rework (merged from the art branch) anchors any Door Gunner Cover to the player's mark. | 2026-10-04 | `dgTargets` works up to 3 enemies inside the placed zone (240px, growing with the layout scale); Cass's prologue asset still unlocks with its tutorial card and sets `tutFlags.fs` when called. Overrule at will — both halves came from your own handoffs. |
| C-16 | Cass's freighter is drawn in the ground scene by the gun-run rework (merged from the art branch). | 2026-10-04 | The gunship flies in from off the map, orbits the mark with the heavy door gun working and climbs away (`cls:'graf'` art, renamed “Cass’s freighter”). Reduced motion keeps the instant resolution. |
| C-1 | **A.** Pilots follow the database formula (`floor(skill/10) + floor(level/5)` for Aim and Focus), with mood, injury and the Dogfighter specialty added on top. | 2026-10-02 | The `fixed` override is gone. A rebel's skills are carried to the database's 0–50 scale at the base/space boundary (`Rebel.dbSkill`) and the space scene applies its own bonus; mood, injury and specialty ride on top as `aimMod`. Focus is the database bonus alone, so a fresh generated pilot is weaker than before at Aim and Focus. Scripted pilots and rebel pilots now follow one rule. |
| C-2 | The scripted opening rebels are the same for every player but are generated from the same database as every other rebel. | 2026-10-02 | `Rebel.scripted(spec, row)` builds the cast through the normal rebel path. Joss and Sera take level, experience, initiative and skills from their database rows (Joss now starts at level 4 and Sera arrives at level 3, as the database says); the soldiers use fixed values. Sera's Lucky is her Character Trait, not a special case. Petra only exists in the space scenario. |
| C-3 | Revolution Level 1 lets exactly one Hero emerge in a playthrough; if they die there is no replacement. | 2026-10-02 | `G.heroesMade` counts Heroes ever made; Level 1 allows one, Level 2 and above use the normal rules. In ten bot runs a Hero appeared before the escalation in five (days 45–83). The one Hero is for testing; the rate is easy to raise. |
| C-5 | A specialty should give a cool active ability plus slight bonuses to a related skill, depending on the specialty. Support rebels need base-specific skills later. | 2026-10-02 | Direction only for now. Combat Medic is live as the first example (see C-6). The ability for each specialty is M-13; Support skills are M-14. |
| M-19 | Ship weapons live in a store (`G.shipKit`) and a picker fits them — the model the Market/Arsenal handoff §3.3 itself specifies, so no separate answer was needed. | 2026-10-05 | Sweet Tooth sells the BLS-T Light Repeaters, Missiles and Door Mounted Gun; bought weapons land on the hangar racks (`G.shipKit`); the Arsenal's Ships view gains a **Refit** order that fits rack weapons to a ship's mounts (`weapon_slots` from the db) and returns swapped-out weapons to the racks. Built with Phase 4. |
| C-6 | Treating a wound needs an item (a Med Pack); specialist training should add bonuses, never make it harder for the untrained. | 2026-10-02 | A **Med Pack** gadget (four at the start). Ground rebels are handed one in their second gadget slot; Treat Wound uses one pack per action and the card shows how many are left. A used pack leaves the armory at the debrief. The Infirmary makes a pack every three days (two with someone on station) for 8 supplies, up to 4 plus 2 per Infirmary tile. **Combat Medic** is live: treats from 1.5× as far, one pack covers two wounds, and +3 Presence. |
| — | The Strider is a **Bot** (Auto = robot character, Bot = robot vehicle, Drone = robot ship): automated, cannot be manned | 2026-10-02 | `26e3afc` |
| C-12 | Cass's Door Gunner belongs to **Take the Rock** (he's the smuggler who set the squad down in the canyon), not Steal the Cross. One-off: afterwards the player earns fire support by bringing their own Graf with a pilot and a Door Mounted Gun | 2026-10-03 | the "Door Gunner moved to Take the Rock" commit |
