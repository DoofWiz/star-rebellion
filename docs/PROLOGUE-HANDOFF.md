# The Prologue: implementation handoff

**For:** Claude Code in `DoofWiz/star-rebellion`.
**Save as** `docs/PROLOGUE-HANDOFF.md`.
**Design source:** the *Onboarding* section of the Google Doc *Campaigns & Missions: Linear Flow of Star Rebellion*
(as of 8 October 2026). Where this file quotes the designer, the words are theirs with spelling fixed only.

**The design is not finished.** Most of this job is building the onboarding as a script the designer can keep
extending, one beat at a time, without anyone touching the systems underneath. Build every beat that is written. Stub
the rest. Make the game stop cleanly at the end of whatever is authored.

---

## 0. Ground rules

- **Branch** from `main` with `claude/tutorials-doc` merged in. That branch adds `docs/TUTORIALS.md`, which holds the
  text of two tutorials this work builds.
- **Follow `CLAUDE.md`.**
  - Log conflicts and anything left unbuilt in `docs/DESIGN_BLOCKERS.md`.
  - The new save field needs a `MIGRATIONS` entry.
  - Run every `tools/*-smoke.js` before each commit.
  - The new file of game text must be registered with `tools/text/text.py` (see §5).
- **Missing text.** Where the designer hasn't written text yet, put `[TEXT NEEDED: what this must say]` in the game,
  not words of your own. List every one in one blocker entry (§7). The designer is replacing Claude-written tutorial
  text with their own, so don't write tutorial text yourself.
- **Every tutorial** gets a row in the `docs/TUTORIALS.md` index when it's built, and its full text there while it's
  planned.
- **Build in phases P1 to P5 (§6).** At the end of each phase the prologue plays from New Game to the last built beat,
  then hands over to the normal game.

---

## 1. What's there today

The onboarding is a string, `G.onboard`, stepped through
`'intro' → 'contact' → 'revealed' → 'pilotwait' → 'seraoffered' → 'crossready' → 'friend' → 'done'`, plus a separate
boolean, `G.postDepot`. The checks are spread across `game/js/base.js`:

| Where | What it does |
|---|---|
| `storySignal()` | Cass's *Steal the Cross* and Sera signals, Venn's depots signal, Cass's *Steal Fuel* signal (on `G.postDepot`) |
| `advanceDay()` | Cass finds Sera; re-arms Cass's fuel signal and Tessaly's Strider signal |
| `followSignal()` | Sets `'pilotwait'` and `'done'` |
| `missionAftermath()` | *Steal the Cross* adds Venn; the depots set `G.postDepot`, **queue Halt and Vokk as candidates** and open Akkaro's local ops |
| Recruit accept (`data-rec-accept`) | Sera joining sets `'crossready'` |
| `discoverCass()`, `updateGuide()`, the `srcBadge` count | The guided pointer to Cass on the Galaxy view |
| `showView()` (line ~3678) | The Sources tutorial (`srcTutIntro`) on the first Galaxy visit |
| New-game setup | Seeds one Agent (`mkAgent('haven')`) holding every Source |

What already matches the doc: *Take the Rock* through the Cass transmission (`docs/ONBOARDING-HANDOFF.md`),
*Steal the Cross* with Sera, Venn arriving, *Cook the Depots*, and Cass offering *Steal Fuel*.

What the doc changes:
- **No new Sources after the depots.** Halt and Vokk must not be queued.
- **No Agent until Tachi Gard joins** (C-46).
- **The Sources tutorial moves** out of the first Galaxy visit.
- **New beats:** from *Steal Fuel* onward.

There's no way to insert a beat today without adding another string value and another scattered check. That's what
§2 fixes.

---

## 2. The prologue runner (new file `game/js/prologue.js`)

### 2.1 Shape

The prologue is an ordered list of **beats**. Each beat has three parts:

- **starts:** when it begins. By default this is as soon as the previous beat finishes. It can also wait for a
  trigger.
- **does:** a list of **actions**: a comm, a mission on the board, a tutorial, a gate opening, and so on.
- **until:** what the player has to do before the next beat begins.

The list is data. The runner is small and knows nothing about Cass or Akkaro.

```js
/* game/js/prologue.js: the authored order is the array order */
const PROLOGUE=[
  {id:'fuel_offer', starts:{day:1},                 // the next morning after the previous beat
   does:[{comm:'cass', text:'fuelOffer'}, {mission:'stealfuel', spec:{req:{team:4}}}],
   until:{accepted:'stealfuel'}},
  {id:'fuel_recruit',
   does:[{comm:'venn', text:'vennRecruit'}, {recruitOffer:{role:'Soldier', from:'venn', must:true}}],
   until:{joined:{role:'Soldier'}}},
  {id:'fuel_plan',
   does:[{gate:'plan.assets'}, {tutorial:'strafingRun'}],
   until:{won:'stealfuel'}},
  // ...
  {id:'frontier'}   // the end of what is authored; see §2.6
];
```

- **Text is a key** into a `PRO_TEXT` table in the same file, never inline, so the text tool finds it.
- **Mission tweaks for the onboarding go in `spec`**, such as four soldiers instead of the type's default three. They
  never go in the type. This follows the doc's pinned and open spec pattern.

### 2.2 Starts and until: the conditions

The runner listens for events and checks the current beat's condition after each one. Emit these from the existing
code:

| Event | Emit from |
|---|---|
| `won(mid)` / `lost(mid)` | `missionAftermath()` and the ground and space debrief paths |
| `reportClosed` | `nextReport()` when the queue empties |
| `day` | the end of `advanceDay()` |
| `accepted(mid)` | `followSignal()` when a mission lands on the board |
| `joined(person)` | the recruit accept handler, and anywhere `G.people.push` adds a rebel |
| `op(kind, agent)` | `agentRecruit()`, `agentLieLow()` and the other Agent operations |
| `opDone(kind, agent)` | `recruitTick()` and `agentsTick()` when an operation finishes |
| `tab(key)` | `showView('galaxy')`, `openMissions()`, `openIntel()`, `openArsenal()`, `openMarket()` |
| `closed(winMode)` | `closeWin()` |
| `asset(cls)` | the plan window, when a ship is put in a fire support slot |
| `bought(lot)` / `hired(person)` | the Black Market buy and hire handlers |
| `built(roomKey)` | build completion |

A condition is one of those events with a matcher, such as `{won:'stealfuel'}`, `{joined:{role:'Pilot', n:2}}` or
`{op:'lielow'}`. It can also be a list (all of them, in any order), `{day:N}` (N days after the beat began), or a
predicate function for anything else.

### 2.3 Actions

Build this vocabulary. Each action is a small function in `prologue.js` that calls code that already exists:

| Action | Does | Calls |
|---|---|---|
| `comm:{who, text}` | A character speaks in the comm window | `openComm()`, through the report queue (§2.4) |
| `mission:{id, spec}` | Puts an authored mission on the board | `addMission()` / `pushMission(spawnMission())` |
| `recruitOffer:{role, from, must, n}` | The new-recruit pop-up with generated people | `openWin('recruit')` with `must` cards |
| `tutorial:key` | A tutorial: a card, an intro window or guided steps | §4 |
| `point:{at, label}` | The guided pointer | `pointAt()` (moves out of `updateGuide()`) |
| `gate:key` / `ungate:key` | Shows or hides a mechanic | §3 |
| `agent:{from, post, cell}` | Turns a named person into an Agent | `mkAgent()`, extended to take a name |
| `source:{id, add\|remove, prologue}` | Adds or retires a Prologue source | `addStorySource()` |
| `lead:{on}` | A scripted Bureau Lead | pushes onto `G.bureauLeads` |
| `marketLot:{cat, id, keep}` | A guaranteed Black Market lot | the market roll |
| `news`, `splash`, `flag` | One-liners | `news()`, the splash, `G.prologue.flags` |

### 2.4 Pop-up order

The doc fixes an order after a mission: mission report, then reward, then **the character's comm immediately, without
the player doing anything**. Comms and windows from beats go onto the existing report queue (`RQ`) as a new
`{t:'pro'}` entry, which `nextReport()` opens. They never open over the reward screen, the BASE ESTABLISHED splash or
the day banner. One beat's actions open in sequence: each waits for the previous window to close.

### 2.5 The save

- **The new field is `G.prologue`:** `{at:'fuel_plan', since:dayStarted, flags:{}, gates:{}, done:false}`.
- **Add a migration** at the end of `MIGRATIONS`. It maps each `G.onboard` value to the matching beat id, and maps
  `'done'` and `G.postDepot` saves to the right later beat. It then deletes `G.onboard` and `G.postDepot`.
  - Saves that were already past the depots before this change stay as they are: Halt and Vokk, if queued, stay.
  - Saves past the last ported beat get `done:true`.
- **Replace every `G.onboard` and `G.postDepot` check in §1** with `Pro.at('beat_id')` / `Pro.past('beat_id')`.
- **Update the smoke tests** that read `G.onboard`.

### 2.6 The frontier: the end of what is authored

The last entry is always `{id:'frontier'}`. When the runner reaches it:

1. `G.prologue.done=true`.
2. Every gate opens.
3. The normal game takes over: random source signals, new candidate Sources and normal recruiting.
4. Debug builds only (`#test` or the debug panel) show a toast: *"End of the authored prologue: beat <id>."*

When the designer writes the next beats, they go in before `frontier`. Saves already past `frontier` are not pulled
back into new beats.

### 2.7 Developer tools

These are what make an unfinished onboarding testable:

- **`setup()` on every beat.** It builds the smallest state that beat needs to begin from a new game: the roster,
  ships, Sources, an Agent, missions done and gates open.
- **A Prologue panel** in the existing debug UI, where `window.DBGbase` is exposed. It shows the current beat, has a
  *Jump to beat* list (it runs the target's `setup()` and the `setup()`s before it, then starts the beat), *Open all
  gates* and *Replay tutorials*.
- **The *Debug: skip mission* button** (`dbgSkip` in `ground.js` and `space.js`) already wins missions. The smoke test (§8) uses it to play the whole prologue.

### 2.8 Safety nets

- **Story missions re-arm.** A lost prologue mission goes back on the board. The existing story signals already
  behave this way.
- **The roster runs short.** If a prologue mission is on the board but can't be planned for 2 days because of deaths
  or injuries, the beat's contact sends a replacement with a `recruitOffer` of the role that's missing. Log the number
  in the blocker as a placeholder.
- **The scripted Lead can't capture anyone during the prologue.** Leads and Exposure from the prologue's scripted
  events build up as normal, but Cass and Venn can't be Burned before `frontier`.

---

## 3. Gates: revealing mechanics a piece at a time

A **gate** is a named switch for a mechanic: a tab, a button, an operation or a section of a window.
`Pro.gate(key)` is `true` once a beat opens it, or once the prologue is done. Every gate opens at `frontier`, and on
old saves (the migration).

| Gate | Prologue default | Opened by | Notes |
|---|---|---|---|
| `tab.galaxy` | closed | after `cassIntro` (today's pointer chain) | Already effectively gated |
| `tab.missions` | closed | the first mission offer | |
| `tab.intel` | **closed** | Tachi joins as an Agent (P2) | Hidden until then (decided; answers C-46) |
| `tab.market` | **closed** | Cass's Black Market comm (P4) | |
| `tab.arsenal` | open | — | The doc is silent; kit exists from the start |
| `plan.assets` | closed | *Steal Fuel*'s plan (P1) | The fire support asset slots in the plan window |
| `op.recruit` | closed | Run Your Network, Step 5 (P2) | Until `frontier`, Recruit returns **Rebels only** (C-46.2) |
| `op.lielow` | closed | the Bureau beat (P3) | |
| `op.other` | closed | `frontier` | Sweep, Repost and Disinformation |
| `sources.new` | closed | `frontier` | No candidate Sources (Halt, Vokk, Tessaly, chain alerts). `chainTick()` and the candidate queue respect it |
| `galaxy.beyond` | closed | `frontier` | Scouting and contact on worlds other than Haven Rock and Akkaro (a reading to confirm, §7) |

**What a closed gate looks like.** It is **hidden** (the designer's decision). When a gate opens on a tab or button,
that control pulses once with a small *New* tag (`sr-tag--info`).

---

## 4. Tutorials

Each tutorial is a beat action, `tutorial:key`. It uses the shapes already defined in `docs/TUTORIALS.md` (intro
window, guided steps, field manual, card).

- **Guided steps** move out of `updateGuide()`'s `G.onboard==='contact'` branch into a general stepper. A step is
  `{at: selector-or-fn, text, until: condition}`.
- **Today's Cass pointer chain** becomes the first user of the stepper, with the same steps and the same text.
- **The Sources tutorial** (`srcTutIntro`, `TUT_PAGES`) stops firing on the first Galaxy visit. It plays when the
  player gets their **first brand-new Source**: the first one that isn't Cass or Venn. That's after the prologue, so
  it's the farewell beat once written, or the first new Source after `frontier` until then.
  - When it plays, the field manual's *Making Contact* page is already the Agents version (*Sources field manual:
    Agents update* in `docs/TUTORIALS.md`), because the player knows Agents by then. The two land together, not as a
    separate swap.
  - Until then, the **?** (`data-srchelp`) stays on the Sources panel and on Cass's and Venn's windows, so the player
    can read the field manual whenever they like.
  - Cass and Venn are called Sources from the start (Run Your Network does too). That's fine: they just aren't the
    focus yet.
- A tutorial that has fired is recorded in `G.prologue.flags.tut`. *Replay tutorials* clears that record.

---

## 5. Text

- **Comms and prologue-only lines** go in `PRO_TEXT` in `prologue.js`. Add `prologue.js` to `tools/text/text.py` as a
  new **Prologue** tab, export, and check that the lines round-trip.
- **Mission type words** go in `game/js/mission-text.js` as usual.
- **Tutorial text** is in `docs/TUTORIALS.md` while planned, and in code once built. Update its index as each one
  lands.
- **Name changes from the doc:**
  - *Cook the Depots* is now **Torch the Depots** (its name in the doc's flow and mission list).
  - `[location name]` in Tachi's line is **Akkaro**. Log this in the blocker as a reading.

---

## 6. The beats, phase by phase

Status key: **Built** (port as is), **Change** (built, but the doc changes it), **New** (build it), **Open** (the
design isn't written: stub it).

### P1: the runner, the gates, and today's chain ported (with the doc's fixes)

| # | Beat | What happens | Until | Status |
|---|---|---|---|---|
| 1 | `rock` | *Take the Rock*, exactly as `docs/ONBOARDING-HANDOFF.md` A0–A6 | won | Built |
| 2 | `cass_intro` | BASE ESTABLISHED splash, then Cass's transmission (`cassIntro`) | closed | Built |
| 3 | `cass_contact` | Opens `tab.galaxy`; guided steps: open the Galaxy, select Cass, Contact | contact made | Built: move to the stepper |
| 4 | `cross_offer` | Cass's *Steal the Cross* signal; opens `tab.missions`. The job needs a second pilot | accepted | Built |
| 5 | `sera` | Next day: Cass finds Sera Kest; recruit pop-up | Sera joined | Built |
| 6 | `cross` | *Steal the Cross* | won | Built |
| 7 | `venn_arrives` | Venn is added as a **Prologue source** and signals the depots job | accepted | Built |
| 8 | `depots` | **Torch the Depots** (renamed). Akkaro's local ops open as today | won | Change: rename; **remove** `G.candQ.push('halt')` / `('vokk')` |
| 9 | `fuel_offer` | Next day: Cass's *Steal Fuel* signal (today's text) | accepted | Change: `spec.req.team = 4` |
| 10 | `fuel_recruit` | Venn's comm, then a recruit pop-up of one generated Soldier (`must:true`) | joined | New |
| 11 | `fuel_plan` | Opens `plan.assets`. When the plan opens: a callout on the empty fire support slot (text below) | won | New |
| 12 | `frontier` | — | — | (moves down each phase) |

Venn's comm (beat 10):
> "Hope you're still kickin', firebrand. I got a problem. Lines of young guys and gals askin' if I can introduce them
> to you and 'the movement'. Can you take one of 'em in to get 'em off my back? I'm in over my head here."

The Strafing Run callout (beat 11). It's a guided step pointing at the fire support slot, and it completes when the
FT-4 Cross is assigned (`asset('cross')`):
> "Assign assets to missions like vehicles & ships to enable fire support in this mission. Add the FT-4 Cross to
> enable the 'Strafing Run' fire support option."

**Prologue sources** (`src.prologue=true`) are Cass and Venn. They are full Sources underneath, but until `frontier`
they:
- don't count against `sourceCap()`
- don't roll random signals (`rollSignal()` skips them)
- don't offer generated jobs (`makeOffer`)

They only say what the beats give them.

### P2: Rescue Tachi, and the first Agent

| # | Beat | What happens | Until | Status |
|---|---|---|---|---|
| 12 | `tachi_offer` | Straight after *Steal Fuel*'s reward: Venn's comm (below), then *Rescue Tachi* on the board | won | New |
| 13 | `tachi_joins` | Tachi's comm (below), then her offer: **accept** | accepted | New |
| 14 | `agents` | Tachi becomes the first Agent, **posted to Akkaro**, with Cass and Venn as her cell. Opens `tab.intel`; tutorial *Run Your Network* | tutorial done | New |

Venn's comm (beat 12):
> "Ranchers have been telling me that the lawmen based out near their land have been leavin', abandonin' their posts
> and consolidatin'. I think you've got 'em scared. I got a personal favour to ask you about… you can say no. But it
> would mean a lot to me… and I got a feelin' it could help ya out too. I got a buddy, name of Tachi Gard. She got
> pulled up yesterday by the Sheriff's lackeys for 'instigatin' trouble'. She's been locked up in the Sheriff's
> office but I'm hearin' they're gonna transfer her to somewhere else… don't know where but we might never see her
> again. Please, rescue her, if you can."

Tachi's comm (beat 13):
> "You saved my hide there, thank you! Those hillbillies were talking about throwing me in a mine until I dropped
> dead. They're going to be looking for me all over Akkaro. If you have space in your crew, I might be able to lay low
> while passing you on some good intel from Akkaro. No doubt the authorities are starting to look at what's happening
> down here with everything you've been stirring up. Let me watch out for you."

**Build in P2:**
1. **A new mission type: Ambush: Extract VIP** (`ambush_vip`). Build its map and enemy behaviour as a reusable
   **ambush** scenario, because *Ambush: Precious Cargo* and *Ambush: Assassinate Officer* use the same setup.
   - **Setup:** a road through cover. A convoy with a holding vehicle (a prisoner truck) and an escort.
   - **Enemy behaviour:** when the alarm goes up or the first shot is fired, the holding vehicle drives for an exit
     edge. If it gets off the map, the mission fails.
   - **Objectives** (the doc's): 1) destroy the holding vehicle; 2) unlock the doors (the **Work** action next to
     them); 3) escort `{npc}` to the extraction point.
   - **Reuse what's there:** the crewed vehicle seats from the Strider scenario's riot cruiser, and VIP escort from
     *Rescue Dissident* and the Strider.
   - **Words:** the type's words go in `mission-text.js`, using the doc's description.
   - **Reward:** by default the type's reward is a new support recruit. *Rescue Tachi* overrides it in its spec: Tachi
     joins as an Agent (beat 13), not a rebel.
   - **Map:** one map is fine for now (M-30).
2. **Agents from people.** `mkAgent()` takes a named person. New games **stop seeding an Agent** (C-46.1). Old saves
   keep theirs.
3. **The Intelligence tab before Tachi** is hidden (§3).
4. **Run Your Network** is built from `docs/TUTORIALS.md` **in full, including Step 5 (Recruit)**. This is where
   recruiting from an Agent is taught; Step 5 opens `op.recruit`.
   - This first Recruit returns Rebels as normal (Rebels only until `frontier`, C-46.2). The player takes whoever
     they like, bunks allowing.
   - The later recruit beat (19) doesn't teach Recruit again; see P4.

### P3: Someone's asking questions

| # | Beat | What happens | Until | Status |
|---|---|---|---|---|
| 15 | `tense` | After the next day advances: Tachi's comm, then Venn's comm (below) | closed | New |
| 16 | `first_lead` | A scripted **Bureau Lead on Venn**. The Intelligence tab opens; tutorial *Someone's Asking Questions* (`docs/TUTORIALS.md`), then a step that points at **Lie Low** on Tachi's rail and opens `op.lielow` | `op('lielow')` | New |
| 17 | `lielow_wait` | The next beat starts **the day after** Lie Low is ordered; it doesn't wait for the 3 days to run out (decided) | `{day:1}` | New |

Tachi's comm (beat 15):
> "Hey boss… checking in. It's barely been a day and things are getting tenser. The lawmen have been patrolling
> Dustfall more intensely and I've got a good word from Maro that the Sheriff has asked the sector command for some
> security forces down here. If they come, things are gonna get real bad around here, real fast."

Venn's comm (beat 15):
> "Some offworlders I don't know are in my bar today… more strangers on the street acting suspicious. Something's up,
> I don't like it one bit."

The scripted Lead uses the real Leads system and moves Exposure as normal. §2.8's no-capture rule keeps it from
burning anyone.

### P4: getting ready for the bunker

| # | Beat | What happens | Until | Status |
|---|---|---|---|---|
| 18 | `bunker_offer` | Cass's comm (below); *Raid the Bunker* on the board. The plan window shows what's missing | accepted | New |
| 19 | `tachi_recruit` | Next day: Tachi's comm (below). No tutorial: Recruit was taught in beat 14. One pointer at **Recruit** on Tachi's rail. The next Recruit to finish brings **three Pilot recruits** from the generation pool | 3 pilots joined | New. Pointer label: `[TEXT NEEDED]` |
| 20 | `market` | Cass's comm (below). Opens `tab.market`; a pointer to the tab | `tab('market')` | New |
| 21 | `sweet_tooth` | The first time the tab opens: Sweet Tooth's intro conversation (below), then a tutorial: hire a mercenary | hired | New. Tutorial text: `[TEXT NEEDED]` |
| 22 | `hauler` | Buy a second Graf hauler from the Black Market, and build hangar room for **4 starfighters and 2 transports** | both done | New. Tutorial text: `[TEXT NEEDED]` |

The doc's Sources tutorial "at this stage" is **not** a beat any more. It waits for the first brand-new Source (§4).

Cass's comm (beat 18):
> "Hey firebrand! I just tried landing on Akkaro and got denied. DENIED! The sheer cheek of it; treating me like I'm a
> criminal or something. Ahem… Seems like things are getting pretty hot here with all the craziness you've been
> pulling off. So tell me… are you a gambler? If so, I know where the Sheriff's secure bunker is. It's got the rest of
> his ships in there too. I'm sure he'd be thrilled to donate them to you."

Tachi's comm (beat 19):
> "Venn told me about this job. He's insane. And you are too if you're actually going to try it… But you're going to
> need more hands to do it so… I'll do what I can."

Cass's comm (beat 20):
> "Ever heard of the Black Market? All those credits and nowhere to spend them… I know somebody you're gonna love who
> can hook you up with some extra help."

Sweet Tooth (beat 21):
> "Well, well, what do we have here? Aren't you a fiery one? Cass told me all about your little project. I think you
> and I could become very fast friends, sugar! Need an extra hand? Why not try hiring a Merc?"

**Build in P4:**
1. **Tachi's pilots.** From the moment beat 19 starts, the next Recruit to finish returns exactly **three Pilots**
   (`must:true` cards).
   - If a Recruit from beat 14 is still running when beat 19 starts, that one's result is the one overridden. Tachi's
     line covers it, and the pointer is skipped because there's nothing to press.
   - Otherwise the player starts a new Recruit from the pointer.
   - After `frontier`, Recruit goes back to Rebels or Sources (C-46.2).
2. **Guaranteed lots.** A guaranteed **mercenary** lot ("will always be available in this screen") and a guaranteed
   **Graf hauler** lot. Both are `marketLot` actions with `keep:true`: they survive the 7-day restock until bought.
   They don't count toward the 6 lots.
3. **The plan window lists what's missing for the bunker:** pilots, the extra soldier, the second transport and pad
   space. Use the existing `precondList()` rows; add a pad-space row for the prize ships.

### P5: Raid the Bunker

| # | Beat | What happens | Until | Status |
|---|---|---|---|---|
| 23 | `bunker` | *Raid the Bunker* | won | New |
| 24 | `frontier` | — | — | — |

**Build in P5:**
1. **A new mission type: Steal Ship** (`stealship`). It generalises today's bespoke *Steal the Cross*.
   - **Ships:** `y` ships can be stolen, set by the difficulty or pinned in the spec, and the job needs `x` pilots.
   - **Objectives per ship**, from the doc:
     1. Escort `{pilot}` to the ship.
     2. Hotwire it: the **Work** action next to it, or just be near it out of combat.
     3. Remove the fuel line and the clamps: **Work** next to each, or be near them out of combat.
     4. Board it with the pilot.
   - **Reward:** `y` ships.
   - *Steal the Cross* becomes an authored instance of the type with 1 ship pinned. Its smoke tests must still pass.
2. ***Raid the Bunker*** is an authored instance:
   - 3 ships pinned: 1 FT-4 Cross and 2 SF-11 Talons
   - a **new indoor bunker map**
   - 5 soldiers
   - 3 pilots arriving as **reinforcements in a second hauler**
   - 5 pilots in all: the two hauler pilots and the three who fly the stolen ships. The player has Joss, Sera and
     Tachi's three recruits.
3. **How the reinforcements work** (decided). This teaches the *player's* reinforcements, not the enemy's:
   - **In planning:** the player adds the second hauler as an asset. That sets up the **Reinforcements** fire support
     option, and the player loads the hauler with the three pilots.
   - **During the mission:** the player calls the pilots in with Reinforcements once it's safer, and they take the
     ships.
   - **What to extend:** this builds on the existing option (`a.mode==='reinforce'` in `ground.js`), which today
     lands `a.soldiers` only. Let the hauler's passenger slots in the plan window take **Pilots** too, and land them
     as ground units the way *Steal the Cross* lands its prize pilot.
   - **A tutorial card** when the plan opens, pointing at the second hauler's slot, and another in combat when calling
     them in is possible. Both are `[TEXT NEEDED]`.
   - **Seats:** a Graf seats 4. Five soldiers don't fit in the first hauler, so by default the fifth rides in with the
     reinforcements. Log this as a reading for the designer to confirm.
4. **The prize ships** need pad space when the mission ends (beat 22 guarantees it).

### Still to design (stubs: they go after `frontier` once written)

These are in the doc's story but have no beats yet. Add each one as a commented-out beat in `PROLOGUE` with a
`// DESIGN OPEN` note, so the order is visible in the code.

| Beat | Doc says | Blocked on |
|---|---|---|
| `security_arrives` | Security forces arrive at Akkaro: the enemy moving when the player heats up a location | The regional Alert system (from the Mission Balance design) isn't built |
| `campaign` | Venn delivers the first **Campaign**, *Liberate Akkaro*: a series of missions with big rewards | The Campaign section is WIP. `CHAINS` is the nearest system to extend. *Gain Space Superiority* (Destroy Squadron) needs a new space scenario (only `depot` and `instructor` exist) |
| `farewell` | Akkaro liberated; Venn and Cass say goodbye and stop being Sources; the first proper Source (Tessaly) arrives with the Sources tutorial (§4) | The two above |

---

## 7. DESIGN_BLOCKERS entries to add

- **C-46: resolve it.** Point 1 is fixed by P2 (no seeded Agent). Point 2 is fixed by `op.recruit`'s Rebels-only
  rule. The open question is answered: the Intelligence tab is **hidden** until Tachi joins. Move it to the Resolved
  log.
- **New: "Prologue: decisions".** Record the designer's answers from 8 October so later work doesn't reopen them:
  1. **The Sources tutorial** plays with the first brand-new Source, not before *Raid the Bunker*. The **?** stays
     available on Sources throughout. Cass and Venn are called Sources from the start.
  2. **Tachi recruits three pilots,** not two.
  3. **Raid the Bunker teaches the player's reinforcements:** a second transport added as an asset sets up
     Reinforcements; it's loaded with the pilots, who are called in once it's safer.
  4. **Gated tabs are hidden,** not shown locked.
  5. **The bunker job arrives the day after Lie Low is ordered.**
  6. **Recruiting is taught in Run Your Network (Step 5).** The later recruit beat is reworked into a prompt, with no
     second tutorial.
- **New: "Prologue: readings to confirm".** Each with your interim choice:
  - **Other worlds during the prologue.** Relay Kess and Veray Yards (and the rest of the map) are visible, with
    scouting and contact gated (`galaxy.beyond`) until the prologue ends.
  - **Who gives Steal Fuel.** The doc's summary paragraph has "Wren" giving the tip and the recruit. The numbered flow
    has Cass give the mission and Venn send the recruit. Followed the numbered flow, with "Wren" read as Venn.
  - **The fifth soldier on the bunker raid** rides in with the reinforcements (a Graf seats 4).
  - **`[location name]`** in Tachi's line is Akkaro.
- **New: "Prologue text still to write".** Every `[TEXT NEEDED]` with where it shows up.
- **New: "Prologue: stubbed beats".** The three still-to-design beats, and what each waits on.

---

## 8. Tests

**Add `tools/prologue-smoke.js`.** It covers:

1. **Every beat's setup.** For each beat with a `setup()`: jump to it, then assert its entry actions fired (comm
   queued, mission on the board, gate state).
2. **A full run.** New Game to `frontier` using `dbgSkip` and auto-accept, asserting along the way:
   - Halt and Vokk are never queued.
   - There's no Agent until beat 14, and Tachi is posted to Akkaro with Cass and Venn in her cell.
   - Prologue sources don't count against `sourceCap()`.
   - Beat 14's Recruit returns Rebels only; the Recruit after beat 19 returns exactly three Pilots, including when
     beat 14's Recruit is still running.
   - The Sources tutorial never fires during the prologue.
   - Nothing opens over the reward screen.
   - All gates are open at `frontier`.
3. **Migration.** Load a save at each old `G.onboard` value and check the beat it lands on.
4. **Safety net.** Kill a soldier before *Steal Fuel* and check that a replacement is offered.

**Then update the old tests.** `tools/onboarding-smoke.js` and the others that read `G.onboard` move to
`G.prologue`. All `tools/*-smoke.js` must pass.

---

## 9. Done means

- [ ] P1 to P5 built. New Game plays to `frontier` after *Raid the Bunker* with no dead ends.
- [ ] No `G.onboard` or `G.postDepot` left in the code. The migration is in place.
- [ ] Adding a beat means editing `PROLOGUE` and `PRO_TEXT` only. Prove it: in the smoke test, a beat added at
      runtime fires in order.
- [ ] `docs/TUTORIALS.md` index updated. Every `[TEXT NEEDED]` is listed in the blocker.
- [ ] The blockers in §7 are added. Every smoke test passes.
