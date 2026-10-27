# Arena Type 3.5 — High Command Hands Off: handoff

**For:** Claude Code in `DoofWiz/star-rebellion`, on the **`space-combat-testing`** branch.
**Save as** `docs/ARENA-HC35-HANDOFF.md`.
**Read first, in order:** `docs/archive/ARENA-HANDOFF.md` §0 (the Arena ground rules), `docs/archive/ARENA-HC-HANDOFF.md` (Type 3,
which this builds on), `docs/archive/ARENA-HC-FEEDBACK-1.md` to `-4.md` (what the designer has already tuned in Type 3), and
`docs/art/HC-VFX-HANDOFF.md` (the space FX module this reuses).

**Design sources:**
- *Star Rebellion: Space Combat V2* (Google Doc), section **"Type 3.5: High Command Hands Off"**, as of 16 October.
  It ends with the designer's test brief (§1 below). Where this file quotes the designer, the words are theirs.
- The Claude Doc **"Type 3.5: High Command Hands Off — design review"** (16 October): the pilot requests, comms
  delay, Give the Signal, plan-versus-reality overlay, debrief cause chain, leaders' proposed plans, intel and
  complications, the objective families, the opportunity modifiers and the commander powers. This handoff builds a
  chosen subset of it (§2).
- **Visuals:** the *HUD & UI style guide* ("Chunky Ops", `game/ui/sr-theme.css`), the *Bobbleheads world art style
  guide* (its **Ships** section: Size classes, the **CORE BX-17 Brickbat** and the **GA FL-400 Fleet Freighter**, 16
  October), the *Space FX guide* (`docs/art/space-fx-guide.html`) and the *High Command HUD* canvas. §7 says exactly
  how each is used. Where this file and a style guide disagree on a look, the style guide wins and the gap is logged.

**The pitch.** In Type 3 the player fights the battle from Mission Control. In 3.5 the player *plans* it. A Source
reveals an **opportunity** (here: a freighter crossing a remote system); the player turns it into a mission by
choosing the goal, the rules, who goes and with what, and every wing's orders; then watches it play out, able to
intervene only through slow comms, a few **commander powers**, and the questions their pilots radio up. The skill is
in the plan, the timing and the trust. The designer's worry is that Type 3 "just feels like an RTS"; 3.5 is the
alternative, and this build exists to find out whether watching a plan you made is gripping (§10).

**What this file owns.** The fourth Arena ruleset end to end: the opportunity board, dossier and briefing, the 3.5
layer over the High Command sim (`sim-hc35.js`), its HUD and screens (`arena-hc35.js`), the freighter scenario, its
modifiers, objectives, powers, requests, debrief, metrics and tests. It does not touch v2, SB or the campaign.

---

## 0. Ground rules

Everything in `docs/archive/ARENA-HANDOFF.md` §0 applies: blockers in the same commit (next free ids: **C-75** on, **M-36**
on), no `G` changes, never the campaign save, designer-facing text in plain words, placeholders as named
getter-exposed constants on the designer panel, every `tools/*-smoke.js` before each commit. Additions:

- **Merge the art first.** Merge `origin/art/brickbat-fl400-sizes` into `space-combat-testing` before P1. That branch
  is `space-combat-testing` plus art only (`sim-hc.js`, `arena-hc.js`, `sr-space-fx.js` and `db.json` are
  byte-identical); it adds `SR_ART.SHIPS.brickbat`, `SR_ART.SHIPS.gafreighter` (game key `fl400`), size classes
  (`sizeK`, `sized:true`), `capitalDeath`/`deathBangs` and `PROJ.bombs`. Everything is opt-in, so nothing already
  drawn changes. Run `art-smoke.js` and the HC section of `arena-smoke.js` after the merge.
- **Reuse Type 3 by additive hooks, not by copying** (a deliberate exception to copy-don't-refactor, log it in
  C-75). 3.5 runs on the High Command sim and renderer: copying 4,000 lines would fork the flight and AI tuning the
  designer has spent four playtests on. So `sim-hc.js` and `arena-hc.js` gain **hooks and a mode flag only** (§3):
  every hook defaults to absent, and with it absent High Command behaves byte-for-byte as today. Proof, in the first
  commit: record `SIMHC.stateHash()` for `hc1_nightfall`, `hc2_lastlight` and `hc3_meltdown` after 90 s with a fixed
  seed and scripted orders, on `main` of this branch *before* any change, and assert the same hashes in the new test
  section forever after. No restructuring, no renames, no moved code in either file.
- **v2 and SB are untouched**, and every existing smoke test passes unchanged.
- **New files:** `game/js/sim-hc35.js` (the layer: `window.SIMHC35`), `game/js/arena-hc35.js` (the screens and HUD:
  `window.SR_ARENA_HC35`), and an `#arHc35` block in `game/ui/arena.css`. Script tags go after `arena-hc.js`
  (`game/index.html` ~503).
- **Text.** UI labels, request lines, barks and power cards below are designer-facing lab copy and may ship into the
  Arena as written (they are placeholders the designer will rewrite). None of it reaches the campaign without the
  normal `[TEXT NEEDED]` flow; list them in the blocker as one entry.
- **Commit per phase** P1 to P6 (§9). At the end of each phase `#arena` → *Type 3.5* boots clean, plays from the board
  to the debrief, and every smoke test passes.

---

## 1. The designer's test brief (verbatim, from the doc)

> I would like to test this in Claude:
> - A demo of a mission in type 3.5 that shows the whole loop, starting on the mission board with an opportunity for
>   the player to plan.
> - The opportunity is a freighter traveling over a remote system. It'll be in the mission area travelling from one
>   side to another. The modifiers should be random on every attempt.
> - The player has 3 wings available to assign, each with three ships and pilots for each.
>   - Wing 1: 2 Cross, 1 talon
>   - Wing 2: 1 Talon, 2 Brickbat
>   - Wing 3: 1 Cross, 2 talon, 1 Brickbat
> - A HUD, using the assets established by the visual style, that the player can use during the mission.
> - Assets the player can assign to the mission to try the Commander Powers feature.

Wing 3 lists four ships against "three ships" in the line above: build it **as listed** (four) and log the reading.

---

## 2. What's in, and what waits

From the design review, this build takes the ideas that answer "does the player have enough to do?":

| In this build | Where |
|---|---|
| **Pilot requests**: the battle asks the player questions; free, few, timed, with a personality default | §5.6 |
| **Comms delay** as a visible, systemic cost on every transmission | §5.4 |
| **Give the Signal** with the *Hold for My Signal* rule | §4.2, §5.5 |
| **Plan versus reality**: the plan overlaid on the map, OFF PLAN flags in the pilots' voices | §7.4 |
| **Debrief cause chain**: every loss and failure traced to a plan decision, then *Plan again* | §6 |
| **Leaders' proposed plan** and their one-line critique of the player's plan | §4.4 |
| **Intel and complications**: modifiers rolled per attempt, some hidden, revealed in play | §3 |
| **Event-driven phases** with a per-phase command point pool | §5.3 |
| **Pilot volunteers** (a ram) and **ejection pods** with rescue | §5.6, §5.7 |
| **Objective families**: one primary per family playable on the freighter | §4.1 |
| **Commander powers** from voice, network and hardware assets | §5.5 |

Deliberately **not** in this build (log under M-36): campaign wiring (a real Source creating the opportunity, Intel
and Exposure as campaign resources, Leads), opportunities of the Person / Place / Ship types, follow-up opportunities
created by Tag and Track (the debrief names them only), the objectives marked *later* in §4.1, and the powers marked
*later* in §5.5.

---

## 3. The opportunity and its modifiers

### 3.1 The opportunity

One opportunity type, `vulnerable_freighter` (target type **Cargo or convoy**), defined as data in `sim-hc35.js`:

```js
const OPPORTUNITIES={
 vulnerable_freighter:{title:'Vulnerable Freighter',type:'cargo',source:{id:'cass',name:'Cass',level:2},
  lead:'A GA fleet freighter is crossing the Thessa Reach tonight, holds full, light escort.',   // placeholder copy
  target:{cls:'fl400',livery:'heg'},
  lane:[[300,2400],[3600,2900],[7600,2000]],          // layout units (written for LAYOUT_MAP 2, as hc1 is)
  jump:{x:7600,y:2000,label:'Freighter jump point'},
  planet:{x:3800,y:7600,r:2600,pull:4900},             // the lane skims the pull zone: the gravity window
  extract:{x:300,y:900,label:'Our jump point'},       // where rebel wings leave by default
  relay:{x:0,y:3000},                                  // where your transmissions come from (the Haven relay)
  response:{edge:'N',near:'jump',force:[{type:'vc-mote-patrol',n:3,name:'Response'},{type:'drone-pursuer',n:2,name:'Hunter'}]},
  escorts:[{type:'vc-mote-patrol',n:2,name:'Escort',role:'escort',side:-1},{type:'vc-mote-patrol',n:2,name:'Escort',role:'escort',side:1}],
  cargo:12,hazard:[2,9],                               // FL-400 modules (art indices); hazard ones are not loot
  modN:[2,3]},                                         // modifiers rolled per attempt
};
```

Scale everything through High Command's own `scaleLayout` (`sim-hc.js` ~622), so the freighter scenario sits on the
same 16 × map the designer settled on (`HC_MAP` 16, `HC_SPREAD` 4).

### 3.2 Modifiers

Rolled **on every attempt** from the attempt's seed: *New opportunity* re-rolls the seed; *Plan again* keeps it (and
its modifiers). Each modifier has a `subtle` level 0–3: the Source reveals it if `source.level >= subtle`; otherwise it
is **hidden** and found in play (§5.6's first request, a feed line, or a debrief line). Exclusive pairs never roll
together.

| Modifier | Effect in the sim | subtle | Excludes |
|---|---|---|---|
| **Demoralised Crew** | Freighter crew resolve starts at 40 (default 70); Pirate is easy | 1 | Fanatical |
| **Fanatical Crew** | Never surrenders (Pirate fails); boarding takes 2 × as long | 2 | Demoralised |
| **Scuttle Protocol** | When boarding starts, a `SCUTTLE_SECS` (45) timer; at zero the freighter blows | 2 | |
| **Rich Haul** | Loot × 2; response time × 0.75 | 0 | |
| **Limping** | Cruise × 0.6, one escort fewer | 0 | Heavy Escort, Quick Jumper |
| **Heavy Escort** | Escorts × 2 | 1 | Limping, Green Escort |
| **Green Escort** | Escorts are `academy-cadet` (green pilots, low morale) | 1 | Heavy Escort |
| **Ace Escort** | Adds `academy-commandant` (Vex) to the escort | 2 | |
| **Quick Jumper** | When alarmed, the freighter spools its jump where it is (`QUICK_SPOOL` 60 s); disabling the engines stops the spool | 1 | Limping |
| **Hidden Guns** | Point defence × 2 damage, × 1.5 reach; revealed the first time it fires | 3 | |
| **Asteroid Field** | A rock belt along the lane's last third (High Command rocks) | 0 | |
| **Ion Storm** | Comms delay × 2; detection reach × 0.7 | 0 | |
| **Near a Planet** | The lane's middle waypoint moves 600 south: the gravity window is about 2.5 × longer | 0 | |
| **Rapid Response** | Response time × 0.5 | 1 | Remote |
| **Remote** | No local response: Phase 3 starts only when the primary is done | 1 | Rapid Response |
| **Insider Aboard** | An Agent is on the crew: unlocks *Wake the Sleeper* (§5.5) at no asset cost | 2 | |
| **Unreliable Source** | One revealed modifier is false; found out in play | 3 | |

Every number above is a *placeholder* constant on the panel's **Opportunity** group.

**Intel.** The dossier offers *Dig deeper*: spend 1 of an Arena-only budget of `INTEL_START` (2) to reveal one hidden
modifier at random. The budget resets per opportunity. (Campaign Intel is M-36.)

---

## 4. The briefing (turning the opportunity into a mission)

Four steps, in order, like the SB tray's stepper: the step pips at the top show the whole shape, and earlier steps can
be reopened. Changing step 1 or 3 re-checks the requirements and the plan; nothing is silently discarded.

### 4.1 Step 1: the primary objective

Cards grouped under the four family headings. One card is picked. Each card lists what it **needs**; needs gate the
*Launch* button, not the pick, so the player can pick first and build the force after.

| Family | Objective | Wins when | Needs | Loot |
|---|---|---|---|---|
| Take it | **Steal** | The freighter is disabled, boarded, and the prize crew flies it out through *our* jump point | A Brickbat with Bombs; a Brickbat with a Boarding party | Every surviving container + the ship |
| Take it | **Pirate** | Crew resolve reaches 0, the player accepts the surrender (§5.6), and a rebel ship holds near it for `TRANSFER_SECS` (20) | Nothing (Fanatical makes it fail) | Surviving containers × `PIRATE_SHARE` (0.7) |
| Take it | **Strip the Cargo** | At least one container is hauled and extracted | The freighter disabled; at least one Brickbat with Cargo pods | Containers hauled and jumped out |
| Deny it | **Destroy** | The freighter dies | — | None |
| Deny it | **Crash** | The freighter is disabled inside the planet's pull zone and drifts into the planet | — (timing: the gravity window) | None |
| Use it | **Tag and Track** | One ship holds within `TAG_R` for `TAG_SECS` (12) while unseen (Phase 1) or with that side's point defence down, then the freighter jumps out alive | One ship you name in the plan | A follow-up named in the debrief |
| Bait with it | **Ambush the Responders** | `AMBUSH_KILLS` (3) of the Phase 3 response are destroyed | Not *Remote* | Response kills |
| *later* | Snatch the Paymaster, Misjump, Trojan Freighter, Turn the Crew, Cover Op | Shown greyed with "Not in this demo", to prove the menu scales | | |

### 4.2 Step 2: optional objectives and rules of engagement

**Optional objectives** (up to `OPT_MAX`, 2): their AI tries to honour them but puts the primary first (the doc's
rule). Built: **Protect [ship] at all costs**, **Leave No Witnesses** (no escort or freighter crew escapes; the
freighter jumping counts), **Kill the Distress Call** (the comms array dies before the distress is sent, §5.3),
**Bloodless** (no enemy deaths), **Bring Everyone Home**, **Blood the Rookie** (a green pilot you name scores a kill),
**Ghost Run** (undetected until your signal or the first shot).

**Rules of engagement** (any compatible set; the default is *No Rules*): **Preservation Order** (hull below `x`,
slider, default 30%: withdraw and jump out), **Whale Hunt Tasking** (the flagship disabled: all available fire on it;
here the FL-400 is the flagship), **Hold for My Signal** (wings move to their positions and wait; nobody fires until
the signal or until fired on), **Weapons Tight** (no shots at the freighter's hull or cargo: only engines, comms and
turrets), **Jump on Completion** (each wing jumps out when its Executive Order is done).

**Conflicts** show as hazard tags on both cards, never block: *Leave No Witnesses* ↔ *Preservation Order*; *Bloodless*
↔ *Whale Hunt*; *Pirate* primary ↔ *Whale Hunt*. *Pirate* and *Steal* suggest *Weapons Tight* (a cyan tag).

### 4.3 Step 3: wings and assets

**Wings.** Three wing cards (data in `sim-hc35.js`, names and presets *placeholders*):

| Wing | Ships (as the designer listed) | Pilots (leader first) |
|---|---|---|
| **Dagger** (Wing 1) | Cross, Cross, Talon | Joss (`joss-marrek`, Cross), Wren (regular, Cross), Petra (`petra-voss`, Talon) |
| **Anvil** (Wing 2) | Talon, Brickbat, Brickbat | Sera (`sera-kest`, Talon), Brask (regular, Brickbat), Ollo (green, Brickbat) |
| **Amber** (Wing 3) | Cross, Talon, Talon, Brickbat | Hale (veteran, Cross), Kit (green, Talon), Tam (regular, Talon), Mags (regular, Brickbat) |

Each wing gets a segmented control: **Strike** (jumps in at the start), **Reserve** (held back; called in with a power,
§5.5) or **Stay home**. Each **Brickbat** gets a loadout: **Bombs** (two racks of three, the default), **Cargo pods**
(carries 2 containers) or **Boarding party** (marines; boards a disabled ship). The ship picture on the card swaps with
the loadout (§7.2).

**Ship classes.** Neither the Brickbat nor the FL-400 has a `db.json` row. Define them in `sim-hc35.js` as
`HC35_CLASSES` in the same shape as a ship row (`straight_min/max`, `bank_*`, `turn_*`, `shield_front/rear`,
`armour`, `hull`, `size`, `legacy_keys`), all *placeholders*, and register them through the `classExtra` hook (§3.1
of the sim seams below). Starting values:

| Class | Size | Speed (straight) | Turn | Shields F/R | Armour | Hull | Weapons |
|---|---|---|---|---|---|---|---|
| `brickbat` | 6 | 1–3 | 1–2 | 15 / 15 | 25 | 45 | Repeaters (chin, one side) + the loadout |
| `fl400` | 10 | 1–2 | wide (a capital ship; HC_TURN 0.35) | 60 / 60 | 40 | 400 over subsystems (§5.2) | Point defence × 4 |

**Bombs** are a new HC35 weapon: slow (`BOMB_SPD`, 30% of a missile), tumbling, high damage against size ≥ 7 and
against subsystems, unable to hit anything of size ≤ 6. So fighters cannot disable the freighter on their own: the
Brickbats make the composition puzzle.

**Assets.** `ASSET_SLOTS` (3) dashed slots. Some assets are placed on the map in step 4. Each one unlocks a power
(§5.5):

| Asset | Placed in step 4 | Unlocks |
|---|---|---|
| **Unmanned Ram** (variant: **Nuclear-tipped**) | Its staging point | *Launch the Ram* |
| **Fire Ship** | Its drift position | *Light the Fire Ship* |
| **Minefield** | Its centre | *Detonate the Minefield* |
| **Interdictor Buoy** | Its position | *Raise the Interdictor* |
| **Comms Relay** | Its position (it becomes the transmission origin) | Passive: shorter delays |
| **Rescue Tug** | — | *Send the Tug* |
| **Spoofed Orders** (captured codes) | — | *Spoof Orders* |
| **Call the Pirates** (Black Market mercs) | — | *Call the Pirates* |
| **Wake the Sleeper** | — | Only with *Insider Aboard*, and it takes no slot |

### 4.4 Step 4: the plan, on the map

The map opens in **plan view** (§7.3): the freighter at the start of its lane with time ticks along it, known escorts
with their detection rings, the planet and its pull zone, the asteroid field if known, the response edge, our jump
point and the relay. The player sets:

1. **A jump-in point per Strike wing** (drag its marker; default: one shared point the leaders choose). Reserves get
   an arrival point too. Jumping in within `DETECT_WARP_R` of an escort ends Phase 1 at once; the marker turns foe
   blue when it's inside that ring.
2. **Asset positions** for the placed assets.
3. **Each wing's Executive Order** (one, with a target) and **one Secondary Order** (a trigger plus an order).

**The 3.5 order set.** Map to the High Command orders where they exist (`ORDERS`, `sim-hc.js` ~503); the rest are new
behaviours in the layer:

| Order | Target | Behaviour | HC order reused |
|---|---|---|---|
| Disable | engines / comms / turrets | Bomb or shoot that subsystem only | new (`disable`) |
| Destroy | freighter / class | Kill it | `attack` |
| Board | freighter | Boarding-party ships close and board once the engines are out | `board`, extended to ships |
| Haul | freighter | Cargo-pod ships dock and haul containers, then hold for extraction | new (`haul`) |
| Defend | a wing | Get between threats and that wing (HC's interpose defence) | `defend` |
| Escort | freighter (prize) / a wing | Stay with and protect | `escort` |
| Suppress | turrets / escorts | Engage point defence or the escorts, to clear the way | `attack` on a class |
| Intimidate | freighter | Hold a threatening orbit, guns on turrets and escorts only: drains resolve | new (`intimidate`) |
| Tag | freighter | The named ship closes quietly and plants the tracker | new (`tag`) |
| Ambush | a point | Wait there; engage anything that arrives | `hold` + engage arrivals |
| Hold | a point | Wait there | `hold` |
| Withdraw | our jump point | Leave | `withdraw` |

**Secondary triggers:** *escort bigger than briefed* · *the freighter starts a jump* · *Phase 2 begins* · *Phase 3
begins* · *Executive Order done* · *wing below half strength* · *[wing] in trouble* (any ship of it below 40% hull) ·
*the target escapes*. **Semantics (log as a reading):** when the trigger fires, the leader adopts the Secondary Order
**if the Executive Order has nothing to do right now** (done, waiting, or impossible); otherwise the leader notes it in
the feed and switches as soon as the Executive allows. The Executive ends as the doc says: success, too many ships lost
(`WING_BREAK`, half the wing), pilots' morale breaking, or the target escaping.

**The leaders' plan.** Choosing a primary fills step 4 with the leaders' proposed plan (the table below, *placeholder*
judgement). The player edits from there. Every wing card carries its **leader's one-line take**, rewritten live as
the plan changes, from a rules table (lines are placeholders):

| Proposed plan | Dagger | Anvil | Amber |
|---|---|---|---|
| Steal | Defend Anvil · if Phase 3 → Escort prize | Disable engines (Brickbats: Bombs) · if done → Suppress turrets | Board (Mags: Boarding party) · if done → Escort prize |
| Pirate | Intimidate · if escort bigger → Suppress escorts | Defend Amber | Intimidate · ROE Weapons Tight |
| Strip the Cargo | Suppress escorts · if Phase 3 → Defend Anvil | Disable engines (Brask: Bombs) then Haul (Ollo: Cargo pods) | Haul (Mags: Cargo pods) · Jump on Completion |
| Destroy | Defend Anvil | Destroy (Bombs, hazard modules) | Suppress turrets · if done → Destroy |
| Crash | Suppress escorts | Disable engines · ROE Hold for My Signal (fire inside the window) | Defend Anvil |
| Tag and Track | Hold far · if Phase 2 → Withdraw | Stay home | Tag (Kit) · Ghost Run |
| Ambush the Responders | Ambush at the response edge | Disable engines (keep it here) | Ambush at the response edge · Minefield suggested |

| Critique rule (checked in order) | The leader says (placeholder) |
|---|---|
| Needs unmet (no bombs for a disable) | "We can't crack that hull with repeaters, Base." |
| A Brickbat wing with nobody defending it | "Nobody's watching our backs out there." |
| Jump-in inside a detection ring | "They'll see us the second we drop in." |
| Executive target unreachable before the jump point at cruise | "We'll never catch it from there." |
| Hold for My Signal with no one to give it a reason | "Waiting on your word, Base. Don't leave us hanging." |
| Otherwise, by personality | eager: "Let's go." · steady: "Sound plan." · nervous: "If you say so." |

**Launch** (the gold primary) is enabled when every need is met. A readiness checklist (`sr-check` rows) stays on
screen through all four steps.

---

## 5. The sim: the 3.5 layer

### 5.1 The seams (additive hooks in the High Command files)

`sim-hc.js` gains one object, `const H={}` exported as `SIMHC.hooks`, and these guarded call sites (each `if(H.x)…`,
nothing else changes):

| Hook | Called from | Used for |
|---|---|---|
| `classExtra[cls]` | wherever `SRDB.ship(cls)` resolves a row (scenario build, `addWing`, ~669) | Brickbat, FL-400 |
| `loadoutExtra(row, loadout)` | `loadout()` | bombs, cargo pods, boarding party (`marines`) |
| `think(s)` → `true` to skip | top of `think` (~760), before `commandBehaviour` | wait-for-signal, the new orders, requests' outcomes |
| `goal(s)` → goal or `null` | top of `goalOf` (~1473) | goals for `disable`, `haul`, `intimidate`, `tag`, `ambush`, `ram`, `tug`, `pod` |
| `damage(target, hit)` → `true` if handled | `applyDamage` (~143) | FL-400 subsystems |
| `canJump(s)` → `false` blocks | `jumpCheck` (~1835) | Interdictor Buoy |
| `canFire(s, target, sub)` → `false` blocks | the per-ship fire check before a burst | Hold for My Signal, Weapons Tight, Bloodless |
| `step(dt)` | end of `step` (~2021), after `overCheck` | phases, comms, requests, objectives, modifiers |
| `event(kind, text, o)` | inside `pushEvent` (~707), after the push | the cause log (§6), request triggers |

`arena-hc.js` gains a **mode** (`open({mode:'hc35', scenario, overlay})`, plus a `loadScenario(obj, seed)` beside
`load()` ~717) where `overlay` is `SR_ARENA_HC35`. In `hc35` mode High Command's own picker, wing tray, order wheel,
commands bar, commands drawer and rule editor are not built; the map, camera, roster column with camera tiles, feed,
speech bubbles, time controls, pilot panel (read-only: no doctrine buttons, no responses) and every `SR_SPACE_FX` call
stay. It calls `overlay.drawWorld(ctx, view)` after the shots layer, `overlay.drawScreen(ctx, view)` before the pips,
and `overlay.syncHud(now)` from `syncHud`. With mode absent, nothing changes (the hash test in §0 proves the sim; the
existing HC DOM assertions prove the HUD).

### 5.2 The target: the FL-400

- **Subsystems** in hull-local coordinates (from the art: `SR_ART.SHIPS.gafreighter.cargo`, `.pd`, `.core`,
  `.engines`, times `sizeK('gafreighter')`): **engines** (hp `ENG_HP` 120), **comms array** (60, on the bridge
  tower), **point defence** × 4 (40 each), **cargo modules** × 12 (25 each; indices 2 and 9 are hazard modules that
  explode for `HAZARD_DMG` to everything within `HAZARD_R` when they go), and the **core** (the rest of the 400).
  A hit goes to the subsystem nearest the impact point inside the hull footprint; a shooter with a subsystem target
  aims at it (spread still applies). The ship dies when the core reaches 0, or in a hazard chain.
- **Disabled** = engines at 0: thrust stops, it coasts on its velocity, decaying (`DRIFT_DECAY`), and it can't jump.
  Inside the pull zone it accelerates toward the planet; touching the planet's radius is a **crash**.
- **Point defence** fires repeaters at the nearest rebel within `PD_R`; turret aim feeds the art (`aimAt`).
- **The lane.** It cruises the lane at `FREIGHTER_SECS` (270 s to cross at cruise); alarmed, it runs at
  `FLANK_K` (1.6) × cruise. At the jump point it spools `JUMP_SECS` (8) and leaves (escaped).
- **Crew resolve** (0–100) for Pirate, from `RESOLVE_START` 70: −`RES_THREAT` (1.5) a second per rebel ship within
  `THREAT_R`; −15 per escort killed; −10 per turret lost; −20 engines out; −25 Firebrand Broadcast; +10 per rebel hit on
  hull or cargo. At 0 it raises the surrender request (§5.6).
- **Boarding** (Steal): a Boarding-party Brickbat within `BOARD_R` of a disabled freighter for `BOARD_SECS` (two
  boarders halve it, as High Command's stations do). Boarded: the freighter turns rebel (`faction:'reb'`,
  `quiet:true`), crawls to our jump point at `PRIZE_K` (0.3) × cruise, and becomes the Hegemony's priority target.
- **Hauling** (Strip): a Cargo-pod Brickbat within `HAUL_R`, matching the freighter's drift, takes one container
  every `HAUL_SECS` (10), up to its 2; a container is lost if its module is blown first.

### 5.3 Phases

| Phase | Starts when | What changes | Plate (§7.4) |
|---|---|---|---|
| **1 · Arrival** | Mission start: Strike wings warp in at their jump-in points | Escorts patrol, unaware. **Detection** (0–100) rises while a rebel is inside an escort's `DETECT_R` (× speed; × 0.5 for a ship holding still) | cyan, status **UNDETECTED** with the detection fill |
| **2 · Engaged** | Detection hits 100, any rebel fires, or the signal is given | Escorts engage; the freighter runs at flank speed; the **distress call** starts sending (`DISTRESS_SECS` 20) if the comms array is alive; when it lands, the **response clock** starts (`RESPONSE_SECS` 150) | hazard, status **ALERTED** |
| **3 · Response** | The response clock hits 0 (the force warps in at the response edge), or the primary is done (*Remote*: only this) | The response hunts; everyone's job is to get out | hazard, status **HEGEMONY ON SITE** (foe, blinking) |

Killing the comms array before the distress lands cancels it: no response (a big swing, and the reason *Kill the
Distress Call* exists). Each phase start **resets** the command point pool to `PHASE_CP` = [2, 3, 3]; unspent points
are lost (a reading).

### 5.4 Comms delay

Every transmission (every power, every request answer, the signal, General Retreat, even Abort) is queued and lands
after:

`delay = COMMS_BASE (2.5 s) + distance(origin, recipient) / COMMS_SPD + ACK_SECS (1 s × leader: green 1.5, veteran 0.7)`

× `ION_K` (2) under *Ion Storm*. The origin is the relay (the map's west edge), or the **Comms Relay** asset's
position. Asset powers then add their own arrival (`ARRIVE_SPOOL`, 4 s, with a warp-in warning at the spot). The
queue is visible (§7.4), and so is the wave (§7.5). A pending transmission can't be recalled.

### 5.5 Commander powers

A bar of skill icons in High Command's command-bar style. Costs are *placeholders* in the panel's **Powers** group.

| Power | Cost | Source | Does (after the comms delay) |
|---|---|---|---|
| **Give the Signal** | 0 | *Hold for My Signal* | Every waiting wing goes; Phase 2 begins. Once |
| **General Retreat** | 0 | Always | Every wing Withdraws |
| **Abort** | 0 | Always (pinned last, hazard) | The mission ends as soon as the last ship jumps; the debrief says Aborted |
| **Firebrand Broadcast** | 1 | Always | All your pilots +25 nerve; crew resolve −25; the debrief notes the Exposure. Once a mission |
| **Call a Pilot by Name** | 1 | Always | Pick a ship, then *Pull out* / *Stay in* / *Focus [target]*. Obeyed by loyalty: a shaken pilot may refuse, and says so |
| **Mark Priority Target** | 1 | Always | Click an enemy or a freighter subsystem: ships with no Executive work to do focus it for 20 s |
| **Change Executive Order** | 2 | Always | A wing's new Executive Order. A leader within 20% of finishing pushes back ("We're nearly there, Base"); *Insist* costs 1 more |
| **Call the Reserves** | 1 | A Reserve wing | It warps in at its arrival point |
| **Launch the Ram** | 1 | Unmanned Ram | Warps in at its staging point and drives at a target you click; collision damage `RAM_DMG`. Nuclear-tipped: a blast of `NUKE_R` that hits everything, friends and cargo included |
| **Light the Fire Ship** | 1 | Fire Ship | The derelict blows: `FIRE_DMG` within `FIRE_R`. Escorts ignore it in Phase 1 |
| **Detonate the Minefield** | 1 | Minefield | Each mine blows; anything within `MINE_R` of one takes `MINE_DMG` |
| **Raise the Interdictor** | 1 | Interdictor Buoy | No ship within `INTERDICT_R` can jump for `INTERDICT_SECS` (30), yours included. Response ships arriving inside it drop at its edge |
| **Send the Tug** | 1 | Rescue Tug | Warps in, collects an ejection pod or tows a disabled rebel ship out |
| **Spoof Orders** | 2 | Spoofed Orders | An enemy group you click breaks off to the map edge for `SPOOF_SECS` (25), then realises. Once |
| **Call the Pirates** | 2 | Call the Pirates | Three pirate Brickbats warp in at the nearest edge and attack the Hegemony; with `PIRATE_GREED` (40%) they go for the cargo instead and leave with some of it |
| **Wake the Sleeper** | 1 | *Insider Aboard* | Pick: *Cut the engines* (disables them) / *Kill the beacon* (cancels the distress) / *Open the hatch* (boarding × 2 speed). Once; the debrief notes the Agent may be burned |
| *later* | | | Amend Rules, Decoy Wing, Q-ship, False Beacon (the Claude Doc's list) |

Powers that need a target enter a targeting mode with a gold pill above the bar ("Pick a target · Esc to cancel"),
the HUD kit's `sr-pill`.

### 5.6 Pilot requests

The heart of this build: **the battle asks the player questions.** A request is raised by the situation, carries 2–3
answers, has a default, and lasts `REQ_SECS` (12 s of sim time). The answer is free but travels with the comms delay;
on arrival the asker acknowledges with a speech bubble. No answer in time means the asker does what their personality
says (High Command's personas, `sim-hc.js` ~108). At most `REQ_OPEN` (2) open at once, `REQ_GAP` (20 s) between new
ones, `REQ_CAP` (6) a mission; if several are due, the higher priority wins. When one arrives while at 3 ×, speed drops
to 1 × (`REQ_AUTOSLOW`, panel toggle).

| # | Trigger | Asker | Line (placeholder) | Answers (default by persona) |
|---|---|---|---|---|
| 1 | A hidden modifier shows itself (e.g. the escort count beats the briefing) | Nearest leader | "Base, that escort's twice what Cass said. Your call." | **Press on** (eager) · **Hold for reserves** (steady; only with a Reserve wing) · **Switch to the Secondary** (nervous) |
| 2 | An enemy breaks off and runs, and a ship could chase | That pilot | "One's running! Permission to chase?" | **Go** (eager) · **Stay on task** (steady, nervous) |
| 3 | A pilot drops below 40% hull | That pilot | "I'm hit, but I can stay in this." | **Stay in** (eager) · **Pull out** (steady, nervous). Overrides Preservation Order for that pilot only |
| 4 | Volunteer: an eager or veteran pilot below 35% hull, or out of bombs, with a key target (a turret, the engines, an ace) within `RAM_R` | That pilot | "I can put her into that turret. Say the word." | **Do it** · **Negative** (default). *Do it*: a ram for `RAM_K` × collision damage; the ship is lost; the pilot ejects at half the normal chance |
| 5 | Crew resolve hits 0 | Nearest leader | "They're hailing. They'll dump the cargo if we let them run." | **Take the cargo** (Pirate succeeds) · **Demand the ship** (they refuse unless *Demoralised*; else resolve +30 and the fight goes on) · **No deal** (default for eager) |
| 6 | The distress call starts sending and no wing is on the comms array | Nearest leader | "They're calling for help. Want me on that array?" | **Kill it** (that leader's wing diverts until it dies or lands) · **Ignore it** (default) |
| 7 | *Blood the Rookie* is set and the rookie has a shot the leader would take | The leader | "Kit's got the angle. Let her take it?" | **Let her** · **Take it yourself** (default eager) |
| 8 | A rebel ship dies and its pilot ejects | Their leader | "Tam's out, pod's drifting. Do we pick him up?" | **Get him** (a Brickbat with space, or the Tug power) · **Leave him** (default if the wing is engaged) |
| 9 | *Scuttle Protocol* shows itself (boarding starts) | A boarder | "Scuttle charges! We've got forty-five seconds!" | **Get out** (default steady) · **Keep going** (default eager) |
| 10 | Phase 3 begins with an Executive unfinished | That leader | "They're here. Jump now, or finish it?" | **Jump** (default nervous) · **Finish it** (default eager) |

A request's outcome is applied by the `think` hook (a short-lived override on that ship or wing); every answer and
default is written to the cause log (§6).

### 5.7 Ejection

When a rebel ship dies, its pilot ejects with `EJECT_P` (60%, +20% veteran). The pod drifts for `POD_SECS` (40) and
can be collected by a Brickbat (Cargo pods with a free slot, or a Boarding party) or the Tug. An uncollected pod is
**captured** (the debrief says so). Crash deaths and nuclear blasts don't eject.

### 5.8 What still comes from High Command, unchanged

Flight, turning, collisions and avoidance, guns, locks, missiles, chaff, morale and panic, leaders and promotion,
the Hegemony's lure-and-strike squadrons, waves (the response uses `spawnAtEdge`), jumping, the AUTO tactic, and all
the panel tuning. 3.5 sets each wing's tactic to `auto` and has no tactic control (the leaders pick).

---

## 6. The debrief: why it went the way it did

A full-screen `sr-window--lg` with a **stamp** (`sr-stamp`: JOB DONE green / PARTIAL action / FAILED bad / ABORTED
foe), the objective results, loot, losses (with pods collected and captured) and the time spent in each phase. Then
the part that matters, **What decided it**: three to six lines, most specific first, each tying an outcome to a plan
decision, a power, or an answer the player gave.

**The cause log.** The `event` hook records every kill, loss, subsystem destroyed, phase change, power delivered,
request (answered or defaulted), rule trigger and Secondary switch, with the context at that moment: each wing's order,
who was defending whom, the ROE in force, the phase, the clock. The debrief picks lines from a rules table; starting
set (placeholder copy, add more):

| When | Line |
|---|---|
| A ship lost to point defence, and no wing ever had Suppress turrets | "{pilot} went down to the freighter's guns. Nobody was told to take out the turrets." |
| A ship lost in Phase 3 while its wing's Executive was unfinished, no Jump on Completion | "{pilot} was lost to the response at {t}. {wing} was still {order}." |
| A ship lost after you answered *Stay in* | "{pilot} stayed in because you said so at {t}." |
| A Brickbat lost with no wing defending its wing | "{pilot}'s Brickbat had no cover. No wing was defending {wing}." |
| The freighter escaped with engines intact | "The freighter jumped at {t}. Its engines were never hit." + the reason if known: bombs spent elsewhere, a Brickbat lost, no Disable order |
| The distress landed with nobody on the array | "The distress call got out at {t}. That's why the response came." |
| A power decided something | "Your {power} at {t} {result}." (e.g. took two escorts, cut the engines) |
| A hidden modifier hurt the plan | "Cass missed {modifier}. Now you know." |
| Detection came early from a jump-in point | "{wing} dropped in inside their sensor ring. Phase 1 lasted {secs} s." |

**Buttons:** **Plan again** (the gold primary: back to the briefing with the same seed and modifiers, now marking every
modifier found in play as known, and the last plan kept) · **New opportunity** (a new seed) · **Back to rulesets**.

---

## 7. Visuals

### 7.1 Laws carried over (do not reinvent)

From the HUD style guide and High Command: **gold** = you can act on this, one gold primary per screen, and whatever
advances is gold at the far right; **rebel red** = yours; **Hegemony blue** = theirs *and their awareness*; **hazard
orange** = danger that belongs to nobody (and the pirates); **shield cyan** = information, comms and intel; **steel** =
quiet friendlies and neutral lines; **green** = done, safe. Bungee for display, Exo 2 for UI, nothing below 12 px but
key hints. Every interactive thing has an ink outline and presses down. All HTML on the kit classes (`sr-btn`,
`sr-card`, `sr-tag`, `sr-check`, `sr-slot`, `sr-choice`, `sr-phase`, `sr-banner`, `sr-stamp`, `sr-window`, `sr-pill`,
`sr-kbd`) and the HC classes already in `arena.css` (`hc-card`, `hc-ev`, `hc-tile`, the commands-bar skill icon);
colours from the tokens (`--sr-*`), canvas colours from `SR.theme.C`. Glyphs are single-path inline SVG in
`currentColor`, as the SB tray's are.

From the world art guide: **red is ours, blue is theirs** on hulls too; rebels make do (the Brickbat's rebel livery),
the Hegemony is clean and faceless (the FL-400's `heg` livery); **a quiet world, loud people**: the planet and the
backdrop stay dim, saturation goes on ships and effects. From the Space FX guide: no `shadowBlur` per frame; the
command layer stays flat and on top; reduced motion turns off shake, flashes and pulses.

### 7.2 The board, the dossier, the briefing

- **Board:** a stage like the campaign's Missions tab: one `sr-card` for the opportunity (stripe in rebel red; it's
  your Source's lead), the Source's portrait (`SR_ART.portrait`, Cass), title in Bungee, the lead line, the target-type
  tag (`sr-tag--info` "Cargo / convoy"), and the **modifier tags**: helpful to you `sr-tag--good`, harmful
  `sr-tag--warn`, neutral `sr-tag--info`; a hidden one is never shown (the dossier says how reliable the Source is).
  A gold **Plan mission** button. A small `sr-btn--ghost` **New opportunity**.
- **Dossier** (an `sr-window`): the FL-400 drawn large in its `heg` livery (`SR_ART.ship(..., {sized:true})`, slowly
  turning), its known modifiers with one plain line each, Source reliability ("Cass sees most things. Not all."),
  *Dig deeper* with the Intel pips (cyan), and the gold **Plan mission**.
- **Briefing:** full stage. Left: a 420 px panel with the step pips (**1 OBJECTIVE · 2 OPTIONALS & RULES · 3 WINGS &
  ASSETS · 4 THE PLAN**: done pips green, the current one pulsing gold) and the step's content; under it, always, the
  readiness checklist. Right: the map in plan view (step 4 makes it interactive; steps 1–3 show it as context). The
  step's **Next** (and finally **Launch**) is the gold button bottom right.
  - Objective cards are `sr-card`s under plain family headings (families are not colour-coded: gold is the only
    colour that means "pick"); the picked card gets the gold ring. Needs read as mini `sr-check` rows. Later cards are
    `is-locked`.
  - Wing cards: the leader's portrait, the callsign in Bungee rebel red, a row of small ship pictures drawn by
    `SR_ART.ship` at their size class (`sized:true`), pilot names, levels and morale words, the Strike / Reserve /
    Stay home segmented control (`sr-btngroup`), and for each Brickbat a Bombs / Cargo pods / Boarding party control
    whose picture swaps: `rebel` livery with `bombrack` for Bombs, `rebel` with `cargopod` for Cargo pods, `rebel` with
    bare hardpoints for a Boarding party (if `ship()` can't take a loadout override per call, log it and use the
    nearest livery). Under the card, the **leader's take** as a one-line `sr-quote` in their voice.
  - Assets: `sr-slot`s; a filled slot shows the asset glyph, name and the power it unlocks.

```
┌ 1 OBJECTIVE · 2 OPTIONALS & RULES · 3 WINGS & ASSETS · [4 THE PLAN] ┐┌──────────── plan view (map) ─────────────────┐
│ DAGGER  Joss ▸ Cross Cross Talon                                    ││  relay⟩·      ◇DAGGER         ×··· ⊙ FL-400 jump│
│  EXEC   [Defend ▾] Anvil                                            ││          ◇ANVIL ⟍  ⋰ ⋰ ⋰  rocks             │
│  SECOND [if Phase 3 ▾] → [Escort ▾] prize                           ││  FL-400 ▶━━0:30━━1:00━━1:30━━2:00━━2:30━━▶ │
│  "Sound plan."                                                      ││        (escort rings)  ╲ GRAVITY WINDOW ╱    │
│ ANVIL   Sera ▸ Talon Brickbat Brickbat                              ││  ✸ fire ship   ▣ buoy                       │
│  …                                                                  ││                  ( planet limb, dim )       │
│ ☑ Bombs for Disable  ☑ Boarding party  ☐ Jump-in outside rings      ││                                   [ LAUNCH ]│
└─────────────────────────────────────────────────────────────────────┘└─────────────────────────────────────────────┘
```

### 7.3 Plan view (the map before launch)

The real High Command renderer on the built scenario at t = 0, paused, with the overlay drawing:

- **The lane:** a steel dashed line from the freighter to its jump point, with Bungee time ticks every 30 s of cruise
  ("0:30", "1:00"…), and the freighter drawn at its start.
- **The gravity window:** the stretch of lane inside the pull zone drawn heavier with a label ("GRAVITY WINDOW
  1:04–1:58"). The planet is a dim cel disc at the south edge with a thin rim light and its pull zone as faint dotted
  steel rings (the Space FX guide's lesson: a bright planet competes with tracers).
- **Escort detection rings** in faint foe blue (their awareness). **Response edge:** a foe-blue dashed band with
  "RESPONSE" in small caps.
- **Jump-in markers:** gold diamonds with the callsign, draggable, with a short dashed arrival cone; foe blue when
  inside a detection ring. **Asset markers:** gold glyphs with their radius rings, draggable. **Our jump point** and
  the **relay** (a cyan antenna glyph) are fixed.
- **Plan lines:** from each wing's jump-in to its Executive target, **gold dashed** (the player's order: actionable);
  the Secondary as a **cyan dotted** branch with its trigger as a label ("if Phase 3").

### 7.4 The mission HUD (hands off)

High Command's layout, minus the controls the player no longer has, plus four 3.5 pieces:

```
┌ OBJECTIVES (+ ROE chips, read-only) ┐   ┌ [PHASE 2 · ENGAGED │ ALERTED] ┐   ┌ CP ◆◆◇  refreshes at Phase 3 ┐
│ ◇ Steal the freighter   PRIMARY     │   │  RESPONSE IN 1:42             │   └──────────────────────────────┘
│ ◇ Kill the Distress Call            │   │  ⏸ 0.3× 1× 3×   ◉ plan         │   ┌ REQUEST · Sera ─────── ◔ 8s ┐
└─────────────────────────────────────┘   └───────────────────────────────┘   │ "I'm hit, but I can stay in." │
┌ FEED (5 rows, VIEW) ────────┐                                               │ [A Stay in] [B Pull out]·def  │
│ …                           │                  (map)                        └───────────────────────────────┘
├ DAGGER · Defend Anvil  ──────┤
│ [tile][tile][tile]           │       ┌ COMMS ─ → Anvil: Change Exec · 3.1 s ━━━━━──── ┐
├ ANVIL · OFF PLAN: Preserv. ──┤       ├ POWERS [Signal][Retreat][Broadcast][Name][Mark][Exec][Ram][Mines] [Abort]┤
│ [tile][tile][tile]           │       └────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────┘
```

- **Phase plate** (top centre, where High Command's clock is): the kit's `sr-phase` with status, name and a clock.
  Phase 1: name plate cyan (`--sr-phase-free`), status **UNDETECTED** in green with a thin **detection bar** filling
  in foe blue; clock "FREIGHTER JUMPS IN 3:40". Phase 2: plate hazard (`--sr-phase-fight`), status **ALERTED**; while
  the distress sends, "DISTRESS 62%"; then "RESPONSE IN 1:42". Phase 3: plate hazard, status **HEGEMONY ON SITE**
  blinking foe blue (`data-status="alert"`). A phase change plays the kit's `sr-banner` once: "PHASE 2" / "They know
  we're here" (designer copy), skipped under reduced motion. Time controls stay under it, plus a **Plan** toggle
  (key `P`) for the plan overlay.
- **Command points** (top right): gold diamond pips (spent hollow) and "refreshes at Phase 2 / 3".
- **Requests** (right column, under the CP): up to two cards, newest on top. Each is an `hc-card` with a rebel-red top
  stripe (your pilot is speaking), the pilot's portrait, name and morale word, the line as an `sr-quote`, the answers
  as `sr-choice` buttons with `A`/`B`/`C` key hints and a small `DEFAULT` tag on the default, and a countdown ring in
  the corner (cyan, turning hazard under 4 s). On answer the card shows "Sending… 3.1 s" with the comms bar, then
  collapses. On timeout: "{pilot} decided: {answer}" for 2 s, then collapses. Each one also goes to the feed.
- **Powers bar** (bottom centre): High Command's 76 × 84 skill icons. Gold glyph = usable now, greyed with the reason
  in the tooltip when not (no CP, no target, used, waiting for its asset). Cost in the corner. Abort is the small hazard
  button in the bar's title row, as in High Command.
- **Comms queue** (just above the powers bar): one slim row per transmission in flight: recipient, what, and a cyan
  progress bar with the seconds left. Delivered rows flash green and drop out.
- **Roster column:** High Command's wing cards and camera tiles. The wing header shows the **Executive Order** chip
  (gold outline, as HC's order chip) and, when the wing is doing anything else (a rule, a Secondary, a request's
  outcome, panic), a hazard **OFF PLAN: {reason}** chip. Clicking a tile opens the read-only pilot panel, with a
  **Call by name** button that starts that power on that pilot.
- **Plan overlay** on the map (toggle, default on in Phase 1, off after): the briefing's gold dashed Executive lines
  from each wing's *current* position to its target, so a wing pulled off plan visibly leaves its line.

### 7.5 The world

- **The FL-400** is drawn every frame straight through `SR_ART.ship(ctx,'gafreighter',x,y,h,s,t,{livery:'heg',
  sized:true, lost, aimAt, fire, damage})`, not through `SR_SPACE_FX.shipBody` (its hull cache can't follow blown
  modules or turret aim; one ship a frame is cheap: log it). `lost` = destroyed cargo indices; `aimAt` = each turret's
  current target; `fire` while point defence shoots; `damage` = 1 − hull fraction. Engine trails through
  `FX.drawTrail`. Its death runs `SR_ART.capitalDeath` over `deathMs` (4.2 s) and fires `FX.camShake` / a small
  `FX.event('missileHit')` at each of `SR_ART.deathBangs('gafreighter')`.
- **Subsystem reads:** the subsystem a selected wing targets carries High Command's gold lock mark
  (`FX.lockMark`); a dead subsystem shows a small hazard ✕ on hover. The **comms array** while sending: a foe-blue
  progress arc around the bridge and an expanding foe-blue ring every 2 s (the thing you want to stop).
- **Disabled:** the engine flames gutter out, sparks at the engine block. **Crashing:** a hazard-orange heat rim on the
  leading edge as it falls into the planet, then `capitalDeath` at the limb.
- **Detection:** while an escort's awareness rises, a small foe-blue "?" above it; at Phase 2 every escort pops a "!"
  for 1 s (a stealth-game read, in their colour).
- **The Brickbat:** rebel livery per loadout; its racks show bombs left (`bombs` 0–3 per rack), so a spent bomber
  reads at a glance. **Bombs** use `PROJ.bombs` (slow, tumbling, fuse blinking): add a `bomb` branch to `FX.drawBolt`
  (additive, beside `slaser`). **Hauling:** a steel tether from the pod to the module being emptied, a container
  sliding along it, and a "1/2" chip over the Brickbat.
- **Boarding a ship:** reuse `FX.drawBoardLink` from the Brickbat to the nearest clamp point on the FL-400's spine.
- **Comms:** each transmission draws a thin cyan ring expanding from the origin at `COMMS_SPD`; on arrival the
  recipient flashes and speaks its acknowledgement as a speech bubble (High Command's bubbles, "Copy, Base.").
- **Arrivals:** reserves, the ram, the tug and the pirates show a warp-in warning at their spot for `ARRIVE_SPOOL`
  (a gold diamond for yours, hazard for the pirates), then `FX.event('warpIn')`. The response uses High Command's
  existing Hegemony warp-in.
- **Asset props** (no art exists yet; log it): the **Ram** is a `brickbat` in `civ` livery with hazard chevrons drawn
  over the nose; the **Fire Ship** a dark, unlit `graf` in `civ` livery on a slow spin; **mines** small blinking hazard
  dots in a ring; the **Interdictor Buoy** a small beacon with a pulsing hazard ring at `INTERDICT_R` while live, and a
  "NO JUMP" chip on ships inside it; **pirates** are `brickbat` in the `hunter` livery with hazard selection rings.
  Blasts use `FX.event('explode',{struct:true})` (fire ship, nuke) and `missileHit` (mines).
- **Ejection pods:** a small rebel-red capsule with a blinking beacon and a ring counting down `POD_SECS`.
- **Ion Storm:** a few low-alpha cyan static streaks over the backdrop, nothing that competes with fire.

### 7.6 Keyboard

`Space` pause · `1–4` speeds · `P` plan overlay · `Tab` next event · `F` follow · `Q`/`E` cycle wings · `A`/`B`/`C`
answer the newest request · powers on `Z X C V B N M ,` in bar order (shown on the icons) · `Esc` cancels targeting or
closes a panel. Nothing clashes with High Command's `KEYMAP` (`arena-hc.js` ~1511), which stays as it is for Type 3.

---

## 8. The ruleset entry and scenario

```js
/* game/js/arena.js: RULESETS (~80) */
hc35:{key:'hc35',name:'Type 3.5: High Command Hands Off',desc:'Plan the mission, then trust your pilots: an '+
  'opportunity becomes a plan, the plan plays out, and you intervene only through slow comms, commander powers and '+
  'your pilots\' questions (docs/ARENA-HC35-HANDOFF.md).'},
```

`chooseRuleset('hc35')` opens `SR_ARENA_HC35.open()` (the board) the way `'hc'` opens High Command; `frame`,
`openPicker` and `close` get the same three dispatch lines. The plan compiler (`SIMHC35.compile(opportunity, mods,
plan, seed)`) turns the plan into an ordinary High Command scenario entry (wings with `at`, orders, the freighter as an
enemy `fl400` with `role:'freighter'`, escorts, points, objectives, `reinforce` from the response), registered as
`hc35_freighter` with `rulesets:['hc35']` and loaded with `loadScenario`. So `DBGarena.hc` keeps working, and every
attempt can be replayed from its compiled entry plus seed.

---

## 9. Build phases

| Phase | Build | Playable proof at the end |
|---|---|---|
| **P1** | Art merge; the hooks (§5.1) with the hash test; `RULESETS.hc35`; board → dossier → the four briefing steps (wings, Brickbat loadouts and jump-in points working; objectives, rules and assets listed); the compiler; the FL-400 and Brickbat classes; the freighter flying its lane with escorts; wings warping in; hands-off HUD with the phase plate (Phase 1 only), feed, roster; a debrief stub | From `#arena`: pick 3.5, open the opportunity, set jump-ins, launch, watch the wings arrive and the freighter cross and jump |
| **P2** | The target (§5.2): subsystems, bombs, disable, point defence, cargo, hazard modules, resolve, boarding, hauling, the crash; the three phases and the distress call (§5.3); all seven primaries and their win checks; the capital death | Each primary can be won with a sensible manual plan |
| **P3** | Executive and Secondary orders with triggers; optional objectives and rules (incl. Hold for My Signal, Weapons Tight, Whale Hunt, Preservation, Jump on Completion); the leaders' plans and critiques; modifiers rolled, hidden and revealed; Dig deeper; the plan overlay and OFF PLAN chips | A full briefing changes how the mission plays; the same seed with two plans gives two different fights |
| **P4** | Comms delay and the queue; CP per phase; the powers bar and every power in §5.5; asset placement; the visuals in §7.5 for powers and comms | Every power can be used, arrives after its delay, and does its job |
| **P5** | Pilot requests (all ten), volunteers, ejection and pods, acknowledgements, auto-slow | A typical run raises 3–5 requests; answers and defaults visibly change outcomes |
| **P6** | The debrief cause chain and *Plan again*; metrics (§10); the panel groups (Opportunity, Freighter, Phases, Comms, Powers, Requests); keyboard; all tests | The whole loop, twice in a row on one opportunity, with the debrief explaining the first run |

---

## 10. The experiment and its metrics

The question, from the design review: **is watching a plan you made gripping, or does the player feel helpless?**
Per attempt, push one record to `ARENA_METRICS` with `ruleset:'hc35'`: seed, modifiers (with which were hidden and
when found), primary, optionals, ROE, wings sent and loadouts, assets, briefing seconds per step, each phase's length,
**seconds at each speed** (fast-forward share is the boredom proxy), pauses and paused seconds, powers used (by type and
phase) and CP left unspent, requests raised / answered / defaulted (and by whom), Secondaries triggered, OFF PLAN
seconds per wing, outcome, loot, losses and pods, and whether the player pressed *Plan again*. *Dump metrics* prints
the session.

Two panel toggles let the designer feel each idea's weight: **Requests off** and **Comms delay off** (delay 0). Their
state goes into every record.

---

## 11. Tests (a new HC35 section in `tools/arena-smoke.js`)

Same Playwright pattern as the HC section (fresh context, cleared storage, `#arena`, reduced motion):

1. **Isolation and the hash.** `hc1_nightfall`, `hc2_lastlight` and `hc3_meltdown` hashes match the recorded baselines
   (§0); v2, SB and HC sections pass unchanged; no campaign save key after a 3.5 run.
2. **The loop by DOM.** Board → dossier → steps 1–4 → Launch → debrief → Plan again returns to step 4 with the plan
   and seed kept.
3. **Modifiers.** Same seed, same modifiers; 20 seeds give at least 8 distinct sets; exclusive pairs never co-occur;
   a `subtle` 3 modifier is never shown on the board; Dig deeper reveals exactly one and spends Intel.
4. **Needs gate Launch.** Steal without a Boarding party: Launch disabled with the reason; adding one enables it.
5. **Bombs and subsystems.** Fighter guns alone can't zero the engines within 60 s; two Brickbats with Bombs can.
   A disabled freighter can't jump; inside the pull zone it crashes.
6. **Each primary** wins from a scripted setup through `DBGarena`: Steal, Pirate (with the surrender answer), Strip,
   Destroy, Crash, Tag, Ambush.
7. **Phases.** Detection reaches 100 → Phase 2; killing the array mid-send cancels the response; *Remote* has no
   response; CP resets at each phase.
8. **Hold for My Signal.** Waiting wings don't fire until the signal lands, unless fired on.
9. **Comms delay.** A power lands no earlier than the formula; the Comms Relay shortens it; *Ion Storm* doubles it.
10. **Powers.** Each one, after its delay, does its job; the Interdictor blocks the freighter's jump and yours.
11. **Requests.** Trigger 3 (hit pilot): it appears, times out to the persona default, and an answer overrides
    Preservation Order for that pilot only; the open cap and gap hold; *Requests off* raises none.
12. **Ejection.** A pod appears, the Tug collects it; an uncollected pod is captured in the debrief.
13. **Debrief.** A scripted loss to point defence with no Suppress order produces that cause line.
14. **Determinism.** Same seed, same plan, same powers at the same ticks, with pauses inserted: identical hash.
15. **Metrics.** The record carries every §10 field.

---

## 12. DESIGN_BLOCKERS entries to add

- **C-75 "Type 3.5: decisions".** A fourth ruleset behind the picker; it runs on the High Command sim and renderer
  through additive hooks (an exception to copy-don't-refactor, guarded by the hash test); opportunities become
  missions through a four-step briefing; Executive and Secondary orders; event-driven phases with per-phase CP;
  every transmission is delayed; pilot requests are the main in-mission decision; the debrief traces outcomes to the
  plan.
- **C-76 "Type 3.5: readings to confirm"** (each with the interim choice): Wing 3 has four ships (as listed); the
  Crash line is cut off in the doc ("crash it on the planet to"): read as deny-only, cargo lost; the Secondary Order
  semantics (§4.4); pause stays free and freezes request timers; unspent CP is lost at a phase change; Abort and
  General Retreat are free but still delayed; the Source is Cass; the Brickbat and FL-400 stats are 3.5-local
  placeholders; the FL-400 is drawn directly, not through the FX hull cache; the asset props reuse ship art (§7.5);
  pirates use the Brickbat `hunter` livery in hazard colours; the planet is dim at the map edge; families are not
  colour-coded; requests drop 3 × to 1 ×.
- **C-77 "Type 3.5: placeholders".** Every *placeholder* constant above, getter-exposed on its panel group.
- **C-78 "Type 3.5: text".** Every request line, bark, leader take, critique, debrief line, power card and the
  opportunity copy: designer-facing lab copy, `[TEXT NEEDED]` before any of it ships.
- **M-36 "Type 3.5: missing systems".** Campaign wiring (Sources creating opportunities with their detection levels,
  Intel and Exposure as resources, Leads from Firebrand Broadcast and witnesses, burned Agents); the other target
  types (Person, Place, Ship); follow-up opportunities from Tag and Track; the *later* objectives and powers;
  `db.json` rows for the Brickbat and the FL-400; art for the Ram, Fire Ship, mines and buoy.

---

## 13. Done means

- [ ] P1–P6 built. `#arena` → *Type 3.5: High Command Hands Off* → the board → dossier → briefing → mission → debrief
      → *Plan again*, with fresh modifiers on every new attempt.
- [ ] The three wings exactly as the designer listed them, with Brickbat loadouts that change what's possible.
- [ ] All seven primaries winnable; every §5.5 power usable from an assigned asset or the voice set; all ten requests
      raised by play.
- [ ] The HUD is pure kit and colour law (§7); the FL-400, Brickbat, bombs and capital death come from the world art.
- [ ] High Command is byte-identical (hash test), v2 and SB untouched, and every smoke test passes, the new HC35
      section included.
- [ ] The §12 blockers are added in the same commits.
