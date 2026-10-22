# The traits, reviewed for Type 3.5

**For:** the designer. **Written:** 22 October 2026, after S6 of `docs/MAIN-SWITCH-HANDOFF.md` (C-89 item 36: "which
traits should matter in 3.5?").

**How to use it:** work down §3 and fill in **Your call** (a word is enough: "yes", "no", "as suggested", or your own
effect). §2 is what 3.5 already does with a trait, to check. §4 lists traits the game never grants yet; leave them until
they go live. I build from your answers and log the result in `docs/DESIGN_BLOCKERS.md`.

The trait texts are the game's own (`rebel.js` for Character Traits, `rebel-exp.js` for Rebel Traits). The suggestions
are mine.

---

## 1. What 3.5 can do with a trait

A pilot's traits reach 3.5 through one table (`SR_OPS.TRAIT_MAP` in `ops-core.js`, decision 10). It can give a trait:

| Lever | What it does in a fight | Today's values |
|---|---|---|
| **Flying style** | How they fly: **eager** fights closer, holds formation loosely, stays in when hurt; **steady** holds formation, breaks off a bad fight sooner; anyone else is **even** | Reckless, Brave, Hothead → eager. Steady Hands, Cautious, Veteran → steady |
| **Help** | How readily they break off to help a wingmate in trouble (`aid`), and how soon they call for help themselves (`ask`) | protective, loyal (help more); reckless; by-the-book; proud (asks for help late); cold, coward (help less; a coward asks early) |
| **A bond** | A friend is more likely to go to the other's aid; a rival less | friend, rival |
| **Green** | A rookie: more likely to need help, and their leader more likely to give it | level 2 or lower |
| **Nerve** | Their nerve (Cool), from Presence and injuries, drains under fire; at zero they break off | not read from any trait yet |
| **Numbers** | Accuracy (Aim), damage dealt, critical hits taken, surviving a killing hit | not read from any trait yet |
| **After the flight** | Anything the base does with a trait (morale, XP, the Infirmary) works as for any mission | already working |

The **Nerve** and **Numbers** rows are new hooks. They're straightforward to add, but each changes how fights play, so
they bump `SIM_VERSION`.

---

## 2. Already doing something in 3.5 (check these)

These map to a lever today. Their own effect text (the accuracy, the damage) **isn't** applied in space yet; only the
lever is. The last column asks whether it should be.

| Trait | Its effect today | In 3.5 now | Also give it its own effect? |
|---|---|---|---|
| Brave | Much harder to panic | Eager | Nerve drains slower? |
| Cowardly | Panics more quickly under fire | Coward: helps less, asks for help early | Nerve drains faster? |
| Steady Hands | +1 accuracy with ranged weapons | Steady | +1 Aim? |
| Reckless | +20% damage after sprinting; takes criticals more easily | Eager; reckless help | |
| Cautious | −10% damage taken, −10% speed | Steady; by-the-book | |
| Hothead | Gains Cool when attacking; never surrenders | Eager; proud | |
| Loyal | Rattled half as much when allies go down | Loyal (helps more) | |
| Empathetic | Nearby rebels steady a little faster | Protective (helps more) | |
| Cynical | Morale moves 30% less | Cold (helps less) | |
| Self-Preserving | Less likely to be badly wounded; fights worse once wounded | Coward | |
| Former Hegemony Soldier | +2 accuracy and +5% damage against the Hegemony | By-the-book | +2 Aim, +5% damage? |
| Panicky | Panics more easily when allies go down | Coward | |
| Vengeful | +10% damage against the Hegemony | Reckless | +10% damage? |
| Avenging | +1 accuracy against the Hegemony | Reckless | +1 Aim? |
| Hardened | Loses less morale to deaths, injuries and defeats | Cold | |
| Desensitised | Panics less; less morale from good news | Cold | |
| Decorated | A little extra morale from every win | Proud | |
| Veteran | +1 accuracy and slower to panic | Steady | +1 Aim? |
| Friends, In Love, Mentored, Mentoring, Old Friends, Battle Brothers, Owes a Life, Saved a Life | (relationships) | A friend bond with that pilot, if they fly together | Old Friends +1, Battle Brothers +2, Owes +1 Aim together? |
| Rivals | (relationship) | A rival bond | |

---

## 3. Doing nothing in 3.5 yet (your list)

Every trait the game grants today that 3.5 ignores. A **base** trait already works for a 3.5 flight through the base; I
note those so you can skip them.

### 3.1 Character Traits

| Trait | Its effect today | My suggestion for 3.5 | Your call |
|---|---|---|---|
| **Lucky** | 5% chance to avoid otherwise lethal damage | Same: 5% to survive a killing hit on 1 hull | |
| **Unlucky** | 5% more likely to suffer critical hits | Same: +5% critical hits taken (the sim has criticals) | |
| **Former Pilot** | +1 accuracy when flying a ship | +1 Aim | |
| Nervous | Acts later in the first round of a fight | Slow to answer the first order or request | |
| Short Fuse | +10% damage for a while after being hit | Same: +10% damage for 10 s after a hit | |
| Patient | +2 accuracy while holding | +2 Aim on a Hold or Escort order | |
| Restless | +20% speed; −2 accuracy while holding | Eager; −2 Aim on a Hold order | |
| Perfectionist | +3 accuracy; always attacks last | +3 Aim; steady | |
| Former Hunter | Sees 20% further in missions | +20% sensor range: spots stealth and jump-ins sooner | |
| Clumsy | Drops grenades; jams weapons | Nothing (ground) | |
| Neat Freak | Clears a jam on a natural 1 | Nothing (no jams in space) | |
| Scrawny | −20% melee; +2 defence on the ground | Nothing (ground) | |
| Heavy Sleeper, Light Sleeper | Rest rate | Base: already works | |
| Quick Learner, Slow Learner | XP ±10% | Base: already works (3.5's XP goes through it) | |
| Former Smuggler | Small chance of extra mission loot | Base: does it apply to 3.5's loot? I'd say yes | |
| Former Mechanic, Former Medic, Former Doctor, Wealthy | Workshop, Infirmary, recruiting | Base: already works | |
| Charismatic, Idealist | Morale | Base: already works | |

### 3.2 Rebel Traits

| Trait | Its effect today | My suggestion for 3.5 | Your call |
|---|---|---|---|
| Battle-Hardened | Panics less; less morale lost to injuries and defeats | Nerve drains 25% slower | |
| Blooded | Slightly harder to panic | Nerve drains 10% slower | |
| Nearly Dead | Far less likely to panic once wounded | Nerve drains half as fast below half hull | |
| Lost a Squad | A morale blow, then less shaken when squadmates fall | Half the nerve loss when a wingmate goes down | |
| Last One Standing | +2 accuracy when badly outnumbered; uneasy with a full squad | +2 Aim when their wing is outnumbered 2 to 1 | |
| Broken | Fights badly and loses their nerve easily until rested | −2 Aim; nerve drains 50% faster; coward | |
| Fire Support | +1 accuracy with heavy weapons | +1 Aim with missiles and bombs | |
| Mission Specialist | +1 accuracy on that kind of mission | +1 Aim on a space mission of that kind (needs the kind recorded) | |
| Lucky Escape | Small chance to survive a lethal blow | As Lucky, at 3% | |
| Hegemony Nemesis | +1 accuracy and +5% damage against the Hegemony | Same, against Hegemony ships (not pirates) | |
| Grieving | Won't go on missions | Already kept home (fixed with this review: a grieving pilot could fly in 3.5) | |
| Scarred, Survivor's Guilt, Survivor's Resolve, Redeemed, Proved Themselves | Morale | Base: already works | |

---

## 4. Not granted yet

The game never gives these yet (their systems don't exist), so they can wait until they do:

- **Character Traits:** Messy, Strong, Former Engineer, Streetwise, Academic, Former Criminal, Politician,
  Industrialist, Intimidating, Pragmatic, Former Hegemony Officer.
- **Rebel Traits:** Family, Survived an Ambush, Captured, Tortured, Haunted, Hero of the Rebellion, Made a Name,
  Lost an Eye, Lost an Arm, Prosthetic, Limp, Old Wound, Shrapnel, Wanted, Hegemony Informant, Defector, Rebel
  Celebrity, Propaganda Poster, Symbol of the Rebellion, Hegemony Family, Betrayed, Abandoned by Squad, Failed to Save,
  Survivor, Disgraced, Court-Martialled, Inspired.

Five of these already have a 3.5 mapping, ready for when they're granted: Family, Hero of the Rebellion, Rebel
Celebrity, Pragmatic and Former Hegemony Officer.
