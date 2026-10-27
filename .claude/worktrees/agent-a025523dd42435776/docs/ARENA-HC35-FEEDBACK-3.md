# Type 3.5, playtest 3: the plan stage, orders with objects, and leaders who look after their own

**For:** Claude Code, on `space-combat-testing` (after `b54eec7`).
**Read first:** `docs/OPPORTUNITY-SYSTEM.md` (the game-wide design this demo implements first; approved, with the
designer's decisions in its §8).
**Status:** designed by Claude Chat, 21 October; **approved by the designer the same day: build it** (§4 records the
answers).
**Flight record:** none was attached for this run, so §2 comes from reading the code and a headless replay of the
plan. Ask for the record next time.

## 1. The designer's notes (21 October, an Ambush the Responders run), verbatim

> I bring this up because in the demo, I want to do 'ambush the responders'. There's an executive order to 'ambush'
> enemies that arrive at 'the point'. Does this refer to the freighter, or does it refer to the reinforcements in phase
> 3? From my perspective i'm telling my wings to do nothing and wait for phase 3, but how does phase 3 come about here?
>
> It seems to me like the list of exec orders (or orders in general) are very specific. Destroy always means 'destroy
> the freighter'. what if I want to destroy enemy fighters? I think maybe if the player chooses these exec objectives,
> there needs to be a dropdown next to it that choses the object of that executive order.
>
> See screenshot. In this example, I now see that the 'ambush' order really meant 'go to the top of the map and wait
> for the hegemony to show up'. It also looks like there was a decision to make them 'surrender' but i didn't see the
> pop up come up at all, and sera decided it. a brickbat was very slow and behind the others and was being attacked by
> two fighters as you can see, but not one wing leader or even ship decided that the brickbat should be protected or
> saved when it's in danger. The 'response' is 1:17 away from arriving, surely they'd choose to protect their guy
> rather than sit and wait?
>
> It seems like a confusing result from my experience as a player. I gave them orders to ambush the incoming hegemony
> sure, but they;
> 1. Ignored the freighter even though it surrendered and offered them cargo - if the wing leader makes a decision to
>    take it, tehy should actually take it rather than ignore it.
> 2. Ignored the fighters escorting the freigther even though they are a lethal threat.
> 3. Ignored protecting their vulnerable pilot from death.
>
> How can we improve this?

The plan was: primary Ambush the Responders, Leave No Witnesses, Jump on Completion, every wing's Executive Ambush.
In the screenshot at about 0:53, every wing sits by the freighter's jump point, "Waiting in ambush". The freighter has
heaved to at 0:27 ("Sera decided: Take the cargo"), with TRANSFER 88% over it and nobody near. The distress call got
out at 0:29. Ollo's Brickbat is behind and pinned by two escorts.

## 2. What happened (from the code)

| What the designer saw | Why | Where |
|---|---|---|
| "Ambush" meant "the top of the map" | An Ambush with no point (the dropdown cleared it) goes to `ambushPoint()`, above the freighter's jump point, where the response spawns. That's correct in intent, but **nothing on the plan map shows it**: the tether goes to the wing's rally point. No order has a point picker | `sim-hc35.js:814`, `:888`; `arena-hc35.js:418-435`, `:742`, `:809` |
| Destroy only means the freighter | Every order but Disable, Suppress and Defend is hard-wired to the freighter. Only `sub`, `what` and `wing` targets get a second dropdown | `sim-hc35.js:312-327`, `:393`, `:737-782` |
| How Phase 3 comes about | The alarm (spotted, shots fired, a jump-in close to an escort, or the signal) starts the distress call; 20 s later the response clock starts (150 s); Phase 3 is the response's warp-in. **None of this is shown in the plan.** The response's arrival point is hard-coded (`near:'jump'` is never read) | `:870`, `:888`, `:933-940` |
| The crew surrendered with nobody intimidating | **Resolve drains for every primary**: any rebel ship within 2,600 takes 1.5 a second off, whatever it's doing. Wings passing on their way to the ambush point empty it in about 15 s | `:915-924` |
| "Sera decided", and no card seen | The surrender request is must-show, so a card most likely did show for its 12 s and timed out, or Requests were off on the panel. There's no default for Ambush in `SURRENDER_DEF`, so it fell to Sera's persona: "even" means Take the cargo. That contradicts the blockers' older line that non-Pirate primaries default to No deal | `:1250`, `:1785-1846`; `DESIGN_BLOCKERS.md:889` |
| The leader took the cargo and nobody went | After Take, only wings on **Intimidate** are switched to Overwatch. Transfer progress runs whenever *any* rebel ship is within 1,400 and pauses otherwise: that was Ollo, stuck nearby. Outside Pirate the crates pay nothing. Releasing her afterwards fails Leave No Witnesses | `:1222-1244`, `:1378`, `:1043` |
| Nobody helped Ollo | **3.5 has no wingmate rule.** Ambushers engage only hostiles within 3,500 **of their point**, else their own attacker. HC's pinned emergency fires but has no handler in 3.5, and the layer never hands control back to HC's `commandBehaviour`. Guardian and Saviour are off (`rules:[]`) | `:770-811`, `:389`, `:704`; `sim-hc.js:808`, `:990-1024` |
| Ollo was behind | A Brickbat is speed 3 against the Talon's 5. Wings travel at each ship's own cruise, with no pace-matching | `:233`, `:867` |
| Ambush never ends | `execState` returns 'waiting' for ever, so Jump on Completion never fires, and no response (distress killed, Remote) leaves wings waiting for good | `:967`, `:1284` |

## 3. What to build

### 3.1 The opportunity as a cast (the system's first implementation)

Rewrite `OPPORTUNITIES.vulnerable_freighter` as the cast in `OPPORTUNITY-SYSTEM.md` §2: the freighter, escort,
response, planet, freighter's jump point, home, and events. Add the type, tag and verb tables (§3) as data plus one
small module of verb handlers. Each handler gives `applies(thing)`, `win`, `canStill`, `fallbacks`, `reward`,
`execState` and the debrief words.

**Move today's switches into the handlers:** `primaryTick`, `canStill`, `FALLBACKS`, `execState`, `fieldExec`,
`SURRENDER_DEF` and `LEADER_PLANS`. The seven primaries and their rewards must play exactly as now unless this file
says otherwise. Prove it with flight records (§5).

**Read `response.arrives.at` from the data** instead of hard-coding the freighter's jump point.

### 3.2 Orders: a verb plus an object

**Every Executive and Secondary order is `{verb, obj, part?, at?}`.** The plan rows (window 4) show the verb dropdown
and then an **object dropdown** listing only the cast things the verb applies to (§4 of the system doc), plus a part
picker for Disable.

**Destroy** offers the freighter, the escort, the response, and "anything hostile near a point". An escort or response
target maps to HC's attack-on-class or attack-group behaviour.

**Points are picked on the map.** Ambush and Hold (and "near a point") get a **point marker** on the plan map:
- it's draggable, labelled "AMBUSH · DAGGER" or "HOLD · ANVIL", with a dashed tether from the wing's jump-in;
- Ambush's point defaults to **where its object arrives**, which is marked on the plan map as a foe-blue dashed ring:
  "RESPONSE ARRIVES HERE · ABOUT 3:00 AFTER THE ALARM".

**Triggers** become event plus object the same way. "When **the response** arrives", "when **Anvil** is in trouble" (a
wing picker, so a wing can watch another), "when **the freighter** starts its jump", "when **the escort** is down".

Mark Priority Target, Change Executive Order and Call a Pilot → Focus use the same pickers.

### 3.3 Make the clock visible

**In window 4**, add a strip under the map called **"How this plays out"**, read from the opportunity's events:

> **Alarm** (they spot you, shots are fired, or you give the signal) → **Distress call** 20 s (stopped by killing the
> comms or the power) → **Response** about 2:30 later, **at the freighter's jump point**.

Each stage is tipped. With Kill the Distress Call or Remote on, the strip shows "No response" in place of the last
stage.

**For Ambush**, the leaders' plan and critiques must make the trigger explicit:
- **The leader's plan:** one wing (Anvil) hits the freighter to raise the alarm but leaves the comms alone; the others
  ambush at the arrival point.
- **A critique:** when nothing in the plan raises the alarm, "Nobody stirs them up, nobody comes."
- **A conflict:** Ambush with Kill the Distress Call, both ways.

**In the HUD:** the phase plate's clock names the place ("RESPONSE IN 1:17 · AT THE JUMP POINT"), and the arrival
ring stays on the map with its countdown.

### 3.4 The background simulation: duties, help requests, decisions (the system doc's §5)

**Where it lives.** Build the duty ladder, NPC requests, decisions and the field-decision log in a **new mode-agnostic
module**, `game/js/ops-core.js` (`window.SR_OPS`), together with N1's cast, tags and verbs. Space reaches it through
an adapter in `sim-hc35.js`, which says:
- what "in trouble" means (pinned, attacked by N, hull and fire);
- who a unit's leader and group are;
- how to give a unit a Protect job.

Ground will add its own adapter (`OPPORTUNITY-SYSTEM.md` §7). Nothing in `ops-core.js` may reference ships, wings or
`S` directly.

**In trouble.** A unit is in trouble when it's pinned (`F.pinnedBy` ≥ 1 with a hit in the last 3 s), attacked by 2 or
more, or under 40% hull and under fire.

**Help requests (NPC to NPC).**
1. **Ask?** A unit in trouble decides whether to call for help, from its persona and traits (§3.4.1). A unit
   that doesn't ask can still be seen and helped.
2. **The leader decides**, from the factors in the system doc's §5.2: send the nearest wingmate (or two, if there are
   two or more attackers), go themselves, or refuse. A leader who sees a unit in trouble also decides unasked, once
   per `AID_LOOK` (3 s).
3. **Across wings:** if its own leader refuses, or has nobody to send, the unit (or its leader) may call the nearest
   other wing's leader within `AID_R` (4,000), who decides the same way.
4. **A helper on Protect** engages the attackers, stays by the unit until it's been clear for 5 s, then goes back to
   its Executive.
5. **A refused unit** heads for the nearest friendly group (a "Falling back to Dagger" verb), unless it's on critical
   work.

**Every request and decision:**
- is spoken (a bubble: "Two on me, Sera!" / "Brask, go." or "Hold position, Ollo.");
- goes to the feed with VIEW;
- is logged as a field decision (who asked, who decided, what, the top two factors);
- appears in the debrief by wing ("Sera sent Brask to cover Ollo at 0:51"; "Hale refused Kit at 1:30: Amber was
  docked").

These requests never become player cards.

#### 3.4.1 The weights (placeholders, all on a new **Duties** panel group)

A decision is a score against a threshold, using the run's seeded RNG for the tie-break noise, so records replay
exactly.

**Score** = `AID_BASE`
- `+ persona` (eager +0.25, even 0, steady −0.05, nervous −0.15)
- `+ traits` (each listed trait's weight, from a `TRAIT_AID` table; unknown traits count 0)
- `+ relationship` (a `with:` trait naming the unit: friend +0.3, rival −0.3)
- `+ the unit's trouble` (pinned by 2 or more +0.2; hull under 25% +0.2; green +0.1)
- `+ the helper's job` (waiting or idle +0.2; ordinary 0; critical −1, which blocks)
- `− the helper's own hurt` (hull under 40%: −0.3)
- `− distance` (−0.1 per 1,000 beyond 1,500)
- `− urgency` (the primary at over 80% progress: −0.2)
- `± AID_NOISE` (0.1)

The leader helps if the score is at least `AID_THRESH` (0.5). The unit **asks** if its own score, using its persona,
traits and trouble terms, is at least `ASK_THRESH` (0.3). "Proud" or "Reckless" traits lower it.

The arena's pilots get a few traits to show this off (placeholders, log them):
- Sera: Protective.
- Joss: Reckless, and Petra's friend.
- Hale: By-the-book.
- Ollo: Green, proud.

**Pace.** A wing travels at its slowest ship's cruise (× 0.95) until its job splits it up (boarding, hauling, Tag,
specialists). On the map, a wing in transit stays in formation.

**The escort is a threat, not scenery.** Waiting wings engage any hostile that attacks one of their own within
`AID_R`, not only hostiles near their point. Helping *another* wing goes through the requests above.

### 3.5 Surrender, done properly

- **Resolve drains only from a real threat:** ships on Intimidate, ships attacking the freighter or its escort, and
  bombs and hits on it. Ships flying past don't count. That stops surprise surrenders in non-Pirate missions.
- **The default answer follows the primary's family** (a table on the verb handlers, replacing `SURRENDER_DEF` and
  the persona fall-back):

| Primary | Default |
|---|---|
| Take it (Steal, Pirate, Strip) | Take the cargo |
| Deny it (Destroy, Crash) | No deal |
| Use it (Tag) | No deal (she must not know) |
| Bait with it (Ambush) | Take the cargo, if a wing can be spared; else No deal |

  - **Leave No Witnesses** on: the *Take* answer carries a hazard note ("She'll be let go: fails Leave No
    Witnesses"), and the default is No deal.
- **A decision comes with the job.** When *Take* is chosen (by the player or by default):
  - the asker's leader assigns the nearest spare ship (a Cargo-pods Brickbat first, else any ship with a waiting or
    idle job) to **Overwatch the transfer**, logged as a field decision;
  - if nobody can be spared, the answer becomes No deal, and the leader says why;
  - **transfer progress counts only the assigned ship(s)** in the ring. The bar reads "TRANSFER 88% · NOBODY
    STANDING BY" in orange when it's paused.
- **Pay for it everywhere:** outside Pirate, handed-over crates pay as a **bonus** (`PIRATE_SHARE` × the per-container
  rate), shown on the debrief as "Surrendered cargo".
- **Make sure it's seen:**
  - a request card enters with a sound and a pulse;
  - the game drops to 0.3 × while a must-show request is open (`REQ_SLOW`, panel, default on);
  - a timeout's feed line reads "{Leader} decided: {answer} (no answer from you)".

### 3.6 Ambush ends, and can't wait for ever

- **Ambush is done** when its object is destroyed, routed or gone. Then Jump on Completion and re-tasking work.
- **If its object can't come** (the distress was killed, or Remote), the Executive is **impossible**: the leader says
  "Nobody's coming" and finds work (`findWork`).
- **Fallback:** add Ambush → Clear the escort to the Bait family's fallbacks. The table now allows a different
  family's verb as a fallback, paying without the Accomplished bonus.

### 3.7 A second opportunity, as data only: *Patrol Sweep*

To prove the grammar, author **Patrol Sweep** with no new code beyond the verb handlers above. "A Hegemony patrol is
hunting our smugglers in the Ashfall belt."
- **Cast:** a patrol force (6 Motes and a Scimitar lead), its reinforcements (`ambushable`, arriving at the belt's
  north edge on `calls-help` from the lead), the asteroid belt as an area, and home.
- **No key object.** Families: Deny and Bait.
- **It should derive** Clear (the patrol) and Ambush (the reinforcements) as primaries, with order menus to match.
- **It's on the mission board** as a second opportunity card.

If anything about it needs special-case code, log it under the blocker and say why.

## 4. The designer's answers (21 October)

1. `OPPORTUNITY-SYSTEM.md` approved: the family names stand, and Clear sits under Deny it.
2. **Help across wings** goes through NPC requests and leaders' decisions, weighted by personality and traits (§3.4),
   not an automatic rule.
3. **Surrenders are accepted outside Pirate** and pay bonus cargo (§3.5).
4. **The 0.3 × slow-down** while a must-show request is open: on by default (§3.5).
5. **Ground isn't designed yet**, but will likely work like space: build the core mode-agnostic (§3.4).

## 5. Phases and tests

| Phase | Build | Proof |
|---|---|---|
| **N1** | `ops-core.js`: the cast, tags, verbs and handlers. The freighter opportunity as data. The switches moved into handlers | Replaying the designer's recorded runs (the K0 and L-round records) reproduces their outcomes, apart from what this file changes |
| **N2** | Orders as verb + object; map point markers; the arrival ring; trigger objects; the "How this plays out" strip and HUD clock; Ambush plan and critique | Destroy can target the escort; an Ambush point can be dragged; the strip reads the events |
| **N3** | The background simulation in `ops-core.js` and its space adapter: the duty ladder, NPC help requests and decisions with the weights, falling back, pace, threat response; the field decisions in the feed and debrief | §5 tests 5–7 and 12 |
| **N4** | Surrender: resolve drain, family defaults, job with the decision, transfer counting, pay, the slow-down; Ambush end states and fallback | §5 tests 8–10 |
| **N5** | Patrol Sweep as data | §5 test 11 |

**Tests** (the HC35 section of `tools/arena-smoke.js`, and `tools/run-report.js` assertions on scripted runs):
1. The seven primaries still win from their scripted setups.
2. The object picker for Destroy lists the freighter, the escort and the response, and nothing else. Disable lists the
   freighter's parts.
3. An Ambush point dragged on the map is where the wing waits. With no point set, it's the response's arrival point.
4. The strip shows "No response" with Kill the Distress Call on. The HUD clock names the arrival place.
5. A Brickbat pinned by two Motes while its wing ambushes: with Sera (Protective) leading, help is sent within 3 s,
   and the debrief names who sent whom. With the leader's weights forced below `AID_THRESH`, the leader refuses, the
   Brickbat asks the nearest other wing, and it falls back. With its wing docked boarding, nobody in that wing is sent.
6. A wing with a Brickbat arrives at its point together (the gap between first and last arrival is under 4 s).
7. A waiting wing engages an escort attacking one of its own ships within `AID_R`.
8. Wings flying past the freighter on their way to an ambush point don't trigger a surrender.
9. With an Ambush primary and a spare wing, the default *Take* assigns an Overwatch ship, and the transfer completes
   only while it's in the ring. With nobody spare, the answer becomes No deal with a spoken reason. With Leave No
   Witnesses on, the default is No deal.
10. Ambush with Kill the Distress Call on: the Executive is impossible, the leader says so, and the wing finds work.
11. Patrol Sweep: its primaries are derived as Clear and Ambush, and Clear wins when the patrol is destroyed.
12. `ops-core.js` loads and runs its decision tests in node with a stub adapter (no ships, no `S`). The same seed gives
    the same decisions, and the flight record replays them.

**Blockers** (next free: **C-87**, **M-39**):
- **C-87:** the opportunity grammar adopted in 3.5; orders as verb + object; duties before orders; the surrender
  rules; Ambush's end states; Patrol Sweep.
- **C-88:** the designer's answers (§4) go to the Resolved log. Resolve the old line at `DESIGN_BLOCKERS.md:889`
  (non-Pirate surrender defaults now follow §3.5). Log the arena pilots' new traits and the Duties weights as
  placeholders.
- **M-39:**
  - the campaign's Sources creating opportunities from casts;
  - ground missions on the grammar;
  - the opportunity editor (`OPPORTUNITY-SYSTEM.md` §7).
