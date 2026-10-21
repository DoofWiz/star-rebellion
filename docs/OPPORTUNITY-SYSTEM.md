# The opportunity system: from a lead to a plan to orders, for the whole game

**Status: approved (21 October); the designer's decisions are in §8.** Written by Claude Chat from the designer's
brief. Type 3.5's demo is its first implementation (`docs/ARENA-HC35-FEEDBACK-3.md`). The campaign, the other space
modes and ground missions adopt it later (§7). **Claude Code: treat this as the plan for every future mission system.**
When you build one, build it on this grammar, or log in `docs/DESIGN_BLOCKERS.md` why you can't.

## 0. The designer's brief (21 October), verbatim

> I notice that all of the executive and secondary orders that the player can choose from are very specifically for
> this type of mission, or opportunity. I know that this is just a demo, but I want to ensure that if we roll this type
> of combat into the actual game, we will have something scalable for when the designer creates an opportunity.
> They'd be able to pick what kinds of mission are relevant to that opportunity, what 'object' in the mission is the
> key if there is one (eg. a freighter, a person, a specific building, so on), or something more vague (some
> opportunities might just be to defeat a load of enemies or blow something up). This then informs what the player
> can set as the primary objective for the opportunity, same for secondary objectives, and what orders can be given to
> pilots or soldiers in the mission too.
>
> We need that logic to run through the whole game, when it steps in. I'm saying this now so that we can plan for that
> system, it's documented, and made part of the plan for the AI that's building the game.

## 1. The idea in one paragraph

A designer authors an **opportunity** as a **cast of things on a map**. Each thing has a **type** and **tags** that
say what can be done to it. One of them may be the **key object**. Objectives and orders are never authored one by
one. They're **verbs from one shared vocabulary**, each with rules about which tags it needs, so the game **derives**:
- which primary objectives this opportunity offers, from the verbs that apply to its key object (or its forces and
  areas), limited to the families the designer allows;
- which secondary objectives make sense, from tags anywhere in the cast;
- **which orders the player can give, and to what**: every order is **a verb plus an object picked from a list**, and
  the list holds only the things in this mission the verb applies to.

A new opportunity is new data, not new code. A new verb or tag is new code once, and every opportunity can then use
it.

```
Opportunity (data)                       derived per mission                    in play
┌──────────────────────────┐   ┌───────────────────────────────┐   ┌─────────────────────────────┐
│ cast: things + type + tags│──▶│ primaries = verbs × key object│──▶│ win / fail / fallback checks│
│ key object (optional)     │   │ secondaries = filters on tags │   │ rewards                     │
│ families allowed          │──▶│ orders = verb + object picker │──▶│ leaders' jobs and duties    │
│ events: alarm → response  │   │ plan timeline (what triggers) │   │ HUD clock and markers       │
└──────────────────────────┘   └───────────────────────────────┘   └─────────────────────────────┘
```

## 2. What a designer authors

```js
OPPORTUNITY = {
  id, title, source, lead, map,                 // as today
  families: ['take','deny','use','bait'],       // which kinds of mission this lead allows (§3.3)
  key: 'freighter',                             // the cast id it's about, or null for "defeat them / blow it up" leads
  cast: [                                       // every thing that matters (§3.1)
    {id:'freighter', type:'vessel', cls:'fl400', name:'the freighter', side:'heg',
     tags:['disableable','boardable','lootable','surrenders','calls-help','escapes','crashable'],
     path:'lane', exit:'fjump', parts:['power','engines','comms','turrets','cargo']},
    {id:'escort',   type:'force',  side:'heg', of:[{type:'vc-mote-patrol',n:4}], guards:'freighter', tags:['destructible']},
    {id:'response', type:'force',  side:'heg', of:[…], arrives:{at:'fjump', on:'distress'}, tags:['destructible','ambushable']},
    {id:'planet',   type:'area',   tags:['gravity']},
    {id:'fjump',    type:'point',  name:"the freighter's jump point"},
    {id:'home',     type:'point',  name:'our jump point', side:'reb'},
  ],
  events: {                                     // the clock everyone can see (§3.5)
    alarm:    ['spotted','shots','signal','warp-close'],
    distress: {from:'freighter.comms', secs:20},
    response: {cast:'response', after:150},
  },
  modifiers: {pool:[…], n:[2,3]},
  rewards:   {…},                               // per primary, as today (or defaults per verb)
}
```

Nothing else is authored. Primaries, secondaries and the order menus come out of this.

## 3. The shared vocabulary

### 3.1 Thing types

| Type | What it is | Space | Ground |
|---|---|---|---|
| `vessel` | One big ship that matters | A freighter, a transport, a frigate | A truck, a train, a dropship on the pad |
| `craft` | One small ship or vehicle | An ace, a courier | A speeder, a walker |
| `person` | Someone who matters | An officer aboard, a defector in a pod | A prisoner, a governor, an informant |
| `structure` | Something built | A relay, a depot, a station | A building, a gate, a turret, a vault |
| `cargo` | Goods | Containers, a data core | Crates, a weapons cache |
| `force` | A group that acts together | The escort, a patrol, **the response** | The garrison, a patrol, reinforcements |
| `area` | A region | A gravity well, an asteroid field | A courtyard, a landing zone |
| `point` | A place | A jump point, an ambush spot | An extraction point, a door |

### 3.2 Tags (what can be done to a thing, or what it does)

| Tag | Means | Enables |
|---|---|---|
| `destructible` | It can be destroyed | Destroy |
| `disableable` | It has parts that can be knocked out (`parts`) | Disable (part picker) |
| `boardable` | Units can board it | Board, Steal |
| `capturable` | It can be held and taken | Capture, Hold |
| `extractable` | It can be carried or walked out | Extract, Rescue |
| `lootable` | It holds cargo | Strip, Loot |
| `surrenders` | It has nerve (resolve) and can give up | Intimidate; the surrender request |
| `calls-help` | It can summon the response | Kill the Distress Call; the clock |
| `escapes` | It can leave the map | Leave No Witnesses; "the target escapes" |
| `crashable` | A nearby `gravity` area can take it | Crash |
| `taggable` | It can carry a tracker | Tag and Track |
| `hackable` | It can be hacked | Hack |
| `ambushable` | It arrives later, somewhere known | Ambush |
| `guards` (field) | It protects another thing | "Suppress", Defend logic, the AI's threat map |

### 3.3 Verbs and families

One table drives everything: the planning windows, the order menus, the win checks, the leaders' jobs and the
debrief's words.

| Verb | Family | Needs on the object | As a primary, it wins when | Units it needs |
|---|---|---|---|---|
| **Steal** | Take it | `boardable` + `escapes` | Boarded and flown or driven out | Boarders |
| **Pirate** | Take it | `surrenders` + `lootable` | It surrenders and its cargo is handed over | — |
| **Strip** | Take it | `lootable` | Some cargo is hauled out | Haulers |
| **Extract / Rescue** | Take it | `extractable` (`person`) | They reach extraction alive | Transport room |
| **Capture** | Take it | `capturable` | Held for N seconds | — |
| **Destroy** | Deny it | `destructible` | It's destroyed | Heavy weapons, if armoured |
| **Crash** | Deny it | `crashable` | It falls into the gravity area | Heavy weapons |
| **Assassinate** | Deny it | `person` | They die | — |
| **Clear** | Deny it | `force` | Every unit of it is destroyed or routed | — |
| **Tag and Track** | Use it | `taggable` + `escapes` | Tagged unseen, then it escapes | A named unit |
| **Hack** | Use it | `hackable` | Hacked for N seconds | A tech |
| **Turn** | Use it | `surrenders` + a modifier | Its crew is turned | — |
| **Ambush** | Bait with it | `ambushable` (a force) | N of it destroyed | — |
| **Draw off** | Bait with it | Something that `guards` | The guards leave what they guard | — |

- **Primaries offered** = the verbs whose family the designer allowed and whose needs the **key object** (or, with
  no key object, any `force`, `structure` or `area` in the cast) meets.
- **A lead with no key object** ("defeat a load of enemies", "blow something up") offers Clear, Destroy and Ambush
  over its forces and structures.
- **Each verb also defines** its fail check ("can it still be done?"), its **fallbacks** (the other verbs in its family
  that still apply), its reward rule, and its debrief wording. These are code, written once per verb. Today's
  `primaryTick`, `canStill`, `FALLBACKS` and `execState` switches become this table.

### 3.4 Secondary objectives

Each secondary declares what it needs in the cast. It's offered only if that's present:

| Secondary | Needs | Example |
|---|---|---|
| Leave No Witnesses | Something hostile that `escapes` | The freighter, the escort |
| Kill the Distress Call | Something that `calls-help` | The freighter's comms |
| Bloodless | Hostile people or crews | Any |
| Bring Everyone Home / Protect a unit | — | Any |
| Blood the Rookie | A green unit in the force | Any |
| Ghost Run | An `alarm` with `spotted` | Any |
| **Also: {verb} {thing}** | Any verb that applies to a non-key thing | "Also destroy the escort", "Also strip the cargo" |

Conflicts are declared on verbs and secondaries, not per opportunity: Leave No Witnesses clashes with any primary or
choice that lets a witness go (Pirate's release, Tag and Track); Bloodless with Destroy and Clear; Kill the Distress
Call with Ambush.

### 3.5 The clock is part of the opportunity

Every opportunity states its **events**: what raises the alarm, who calls for help and how long that takes, and what
responds, where and when. The plan shows this as a timeline; the HUD shows it as a clock with a place ("RESPONSE IN
1:17 · AT THE FREIGHTER'S JUMP POINT") and a map marker. A player choosing Ambush must be able to see what brings the
response and where it will come.

## 4. Orders: a verb plus an object

**Every order the player can give a wing (or, later, a squad) is `verb + object`.** The object is picked from a
dropdown, or by clicking the map, and the list holds only what the verb applies to in this mission:

| Verb (order) | Object picker offers |
|---|---|
| Destroy | Any `destructible` thing: the freighter, the escort, the response, "any hostile in an area" |
| Disable | A `disableable` thing, then one of its parts |
| Board / Haul / Intimidate / Tag | The things with that tag |
| Suppress | A thing's guns (turrets), or a `force` that `guards` |
| Defend | A friendly wing or unit, or an area |
| Protect | One friendly unit (it must come home) |
| Escort | A friendly vessel or wing |
| Ambush | An `ambushable` force, **and** a point (defaulting to where it arrives, shown on the map) |
| Hold | A point or area on the map |
| Withdraw | Our jump point or extraction |

The same picker serves Secondary Orders, Mark Priority Target, and Change Executive Order. Triggers become
`event + object` the same way ("when **the response** arrives", "when **Anvil** is in trouble", "when **the freighter**
starts its jump").

## 5. The background simulation: duties, requests and decisions

Orders say what a wing (or a squad) is *for*. Underneath them runs a **background simulation**: every NPC is trying to
carry out its orders while the mission's circumstances, and its own personality and traits, pull on its decisions.
The player watches it happen, as radio chatter and field decisions.

### 5.1 The duty ladder

Highest first. A unit acts on the highest rung that applies to it:

1. **Retreat** (ordered): straight for the exit.
2. **Survive:** a unit under fire defends itself or breaks away.
3. **Help:** answering a call for help, when its leader has said yes (§5.2).
4. **The Executive order.**
5. **Openings that serve the mission:** a surrender offer, a lone straggler, loose cargo. **A decision always comes
   with the job:** if a leader accepts the cargo, they send someone to collect it. If nobody can be spared, they turn
   it down and say so.
6. **The Secondary order**, when its trigger fires.
7. **Find work:** idle units pick something useful.

### 5.2 Help is asked for, and decided by people

Help isn't automatic. It moves through the chain of command as **requests between NPCs**. These are the same kind of
thing as the requests pilots send the player, but answered by NPCs.

- **A unit in trouble can ask its leader for help** (pinned, attacked by more than one, badly hurt and under fire). It
  may also choose not to ask: a proud or reckless pilot might not.
- **The leader decides:**
  - send someone (who, and how many);
  - go themselves;
  - or refuse ("Hold your position, Ollo, we can't break the ambush").
- **A leader may act unasked:** sending help, or going themselves, when they see a unit in trouble.
- **Across wings:** a pilot or a leader can call another wing's leader, who decides in the same way.
- **The player** isn't asked these questions (they're the background), but hears them, and can override with a power
  (Call a Pilot by Name, Change Executive Order).

**Whether a request is made, and what's decided**, is a weighted choice:

| Factor | Pushes toward helping | Pushes against |
|---|---|---|
| **Personality** (today's HC personas) | Eager, loyal, protective | Cold, by-the-book, cautious |
| **Traits** (the pilot's traits now; the campaign's rebel traits later) | "Loyal", "Protective", "Hot-headed" | "Glory-hound", "Cold", "Coward" |
| **Relationships** (trait links, `with:`) | Friends, wingmates of long standing, family | Rivals |
| **The unit's state** | It's badly hurt, green, or pinned by several | It's only scratched |
| **The helper's job** | Waiting: Ambush before the arrival, Hold, the signal, idle | Critical: docked, a bomb run about to release, a transfer nearly done |
| **The helper's state** | Healthy, close | Hurt, far, out of ammunition |
| **The odds** | The help can win the fight | Help would mean two losses |
| **The orders' urgency** | The Executive can wait | The primary is seconds from done |

**Decisions are deterministic** from the run's seed, so a flight record replays them exactly.

**Every decision is a field decision:** logged, spoken (a speech bubble and a feed line: "Ollo: Two on me! · Sera:
Brask, go."), and listed in the debrief by wing. So the player can see why someone was or wasn't saved.

**Personality and traits come from the campaign's meta layer** once 3.5 is in the campaign. The arena uses the
pilots' existing presets and traits.

### 5.3 Moving together

A wing (or squad) **moves at its slowest unit's pace** until its job splits it up, so a Brickbat isn't left behind.

## 6. Example: three opportunities, one grammar

| Opportunity | Key object | Families | Primaries derived | Orders the picker offers |
|---|---|---|---|---|
| **Vulnerable Freighter** (the demo) | The freighter (`vessel`) | Take, Deny, Use, Bait | Steal, Pirate, Strip, Destroy, Crash, Tag, Ambush | Destroy (freighter, escort, response), Disable (freighter: power, engines, comms, turrets), Board, Haul, Intimidate, Tag, Suppress (turrets, escort), Defend, Protect, Escort, Ambush (response at a point), Hold, Withdraw |
| **Patrol sweep** (no key object: "a patrol hunts our smugglers") | None | Deny, Bait | Clear (the patrol), Ambush (its reinforcements) | Destroy (patrol, reinforcements), Defend, Protect, Ambush, Hold, Withdraw |
| **Rescue Tachi** (ground, today a hand-made scenario) | Tachi (`person`, `extractable`) | Take | Rescue | Escort (Tachi), Clear (the guards), Hold (the gate), Withdraw (the truck) |

## 7. Rolling it out

1. **Type 3.5 demo (now):** the freighter opportunity rewritten as a cast with tags; orders become verb plus object;
   duties as §5; the clock visible. A second opportunity authored **only as data** (Patrol sweep) proves it.
   `docs/ARENA-HC35-FEEDBACK-3.md`.
2. **The campaign's space missions:** Sources create opportunities from cast templates (`M-` entry). The mission
   board shows the families and key object; planning uses the same windows.
3. **Ground missions.** Ground combat hasn't been designed yet, and it's likely to work much like Type 3.5: the
   player plans, and squads with leaders carry it out under the same background simulation. So plan for it now:
   - **The core is mode-agnostic.** The opportunity grammar (cast, tags, verbs, objectives, the clock), orders as verb
     plus object, the duty ladder, NPC requests and decisions, the field-decision log and the debrief live in one
     shared module. They are not part of the space sim.
   - **Each mode supplies an adapter:** how a unit moves, fights and is "in trouble"; what counts as a squad and a
     leader; and its maps.
   - **Space is the first adapter, ground the second.** Today's `MPOOL` and ground `SCENARIOS` become casts when ground
     is built.
4. **Designer tooling:** an opportunity editor that lists the derived primaries and order menus as the cast is edited,
   so a designer sees what a lead will offer before playing it.

## 8. The designer's decisions (21 October)

1. **The family names** are right: Take it, Deny it, Use it, Bait with it. **Clear sits under Deny it.**
2. **Help across wings:** by **requests and decisions between NPCs**, not an automatic rule (§5.2). "A pilot could
   ask their wing leader to go and help someone. The wing leader can approve or deny that request. Or a wing leader
   may decide to send someone to help, or even go themselves. Whether they do or not would be based on factors from
   their personality or traits from the main game's meta layer. It's all part of the 'background simulation' that
   happens during missions: NPCs trying to accomplish their orders, while other elements get involved in affecting
   their decision making from circumstances during the mission and their own personality and traits."
3. **Surrenders are accepted outside Pirate**, and pay bonus cargo.
4. **Must-answer requests slow the game to 0.3 ×** while they're open, so the player doesn't miss them.
5. **Ground:** not designed yet; expect it to work much like space combat. **Plan for it** with a mode-agnostic core
   (§7 item 3).
