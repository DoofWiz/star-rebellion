# Opening onboarding + copy pass: implementation handoff

**For:** Claude Code in `DoofWiz/star-rebellion`.
**Save as** `docs/ONBOARDING-HANDOFF.md`.

This replaces `COPY-PASS-HANDOFF.md`; if that has already been applied, skip part B.

- **Part A** restructures the opening: the prologue *Take the Rock* through to the first source contact in the base.
- **Part B** is a text-only pass in the designer's own words.

Follow `CLAUDE.md`: log conflicts or missing systems in `docs/DESIGN_BLOCKERS.md`, add `tools/onboarding-smoke.js`, and run every `tools/*-smoke.js` before committing. If a test asserts on old text, update the expected string. Don't revert the copy.

---

# Part A: the opening flow

## A0. The flow, start to finish

1. **New game:** go straight into the *Take the Rock* insertion cinematic. The squad walks in, the camera pans and the banner shows. **No soldier dialogue in the cinematic.**
2. **Squad in position:** Cass's comm window opens over the paused scene (A2). The player acknowledges it.
3. **Briefing:** the existing mission briefing window. The player acknowledges it.
4. **Quips:** the soldiers' speech-bubble quips play (A3) and real-time play begins.
5. **Tutorial cards:** they appear during the mission and pause real-time play where needed (A4). There is a new Fire Support card after the first full round, and Cass flies door-gunner cover (A5).
6. **Mission won:** the existing mission report screen, then the base.
7. **Base:** a splash card dims the scene: **BASE ESTABLISHED · Haven Rock** (A6).
8. **After the splash:** Cass's source transmission (`cassIntro`) opens. From there the existing Galaxy pointer chain takes over.

All changes are scoped to the prologue (`SCN.mode==='haven'` / `SCN.tutorial`) unless stated. Other ground missions keep today's order: briefing, then cinematic.

## A1. Reorder: cinematic first (`game/js/ground.js`)

Today the briefing shows first, and `#enterBtn` starts the cutscene (`startCutscene()`). For the prologue only:

- **On entering the scene,** skip the briefing and call `startCutscene()` straight away.
  - The New Game click is the user gesture, so call `A.wake()` there or on scene enter. If audio can't wake without a gesture on this page, log a blocker and keep a one-tap "Start" on the black frame.
- **In `csUpdate()`:** remove the `wb1` event (*"That’s the rock. Squatters and all…"*) from the cinematic. Keep the walk-in, the pan, the banner and the camera move back.
- **In `endCutscene()` for the prologue:** don't call `enterFree()`. Instead place the squad (as today), keep the scene in a holding phase (new `phase='INTRO'`: rendered, nothing moves, no detection, HUD hidden like `BRIEF`), and open the Cass comm (A2).
- **Cass comm acknowledged:** show `#briefing`.
- **`#enterBtn` in the prologue:** hide the briefing, start the quips (A3), then call `enterFree(null)`. Don't run the cutscene again.
- **Skip:** `csSkip` still works and lands on the Cass comm. The debug skip still wins the mission.
- **Add `INTRO`** to `PHASE_UI` (`['exec','Briefing']`) and to every check that hides the HUD or tutorial card during `BRIEF` / `CUTSCENE`.

## A2. Cass's comm in the prologue (new ground-scene window)

Use the base scene's comm look: an `sr-window sr-window--friend` (small) with the signal-static canvas (`.sr-signal`, reuse `drawCommStatic` or a ground copy), and an `sr-quote` headed with the signal icon and **Cass Wender**.

- **Title:** Incoming transmission
- **Quote** (designer copy; only spelling fixed):
  > “See? Told you I could get your guys in there! We didn’t exchange names earlier: I’m Cass. Best smuggler this side of the Drift. You paid good money to get these firebrands of yours to this spot, and looks like you’ve got some unwelcome visitors in your new digs! Good thing you paid for the air cover package. I’ll watch your guys’ backs while they do their thing. Whatever their thing is.”
- **Footer flavour:** `carrier locked · unregistered freighter`
- **Button** (gold primary): **Acknowledge**. Enter and Space work too; Esc does not close it.

## A3. Soldier quips after the briefing

When the player clicks the briefing's Enter button in the prologue, the first three living rebels speak in turn using `say()` at 0s, 1.6s and 3.2s, each for 3,200ms. Real-time play starts at once; the quips play over it.

1. Lead rebel: *“That’s the rock. Squatters and all. Let’s go take our home.”* (moved from the cinematic)
2. Runa (or the second rebel): *“If it ticks me off, it goes bang.”* (from `REB_LINES.runa`)
3. Kel (or the third rebel): *“Wind’s with us. Take the shot.”* (from `REB_LINES.kel`)

Put these in a `PROLOGUE_QUIPS` table so the designer can rewrite them; they're placeholders from existing lines.

## A4. Tutorial cards: new fields, pausing, and the full list

Extend each `TUT` entry with two optional fields:
- `when()`: the card waits, hidden, until this is true. The default is always true.
- `pause:true`: if the card appears during **real-time play** (`phase==='FREE'`), the simulation freezes until the player clicks **Got it** on the card. Freezing means no movement, no detection build-up, no AI, and no timers. The card shows a gold **Got it** button (a new `sr-coach__foot` button). After that it stays up as a passive reminder until its `done()` fires.
  - In `PLANNING` / `ENGAGE` the game already waits for the player, so no freeze is needed, but still show **Got it** on `pause` cards.

Pausing only applies to the cards marked below. The rest behave as today and advance on their own.

| # | Title | Text (JS) | `when` | `done` | `pause` |
|---|---|---|---|---|---|
| 1 | Move out | `'<b>Out of combat, you can move your squad in real time.</b> <b>'+(SR.touch?'Tap the ground':'Right-click')+'</b>'+(SR.touch?'':' (or tap the ground)')+' to move your squad. Walk them up the canyon toward the squatter camp at the base mouth.'` | — | squad moved | **yes** |
| 2 | Sneak past | `'Those <b>blue searchlights</b> are enemy sightlines. The orange inner band catches your characters while sneaking. Press <span class="sr-kbd">C</span> (or the Sneak button) to go low.'` | — | sneaked, or camp alerted | **yes** |
| 3 | Start the fight | `'Ambushing gives you the opportunity to swing a fight in your favour from the first turn. <b>Click a squatter</b> and everyone with a clear shot can open fire with a bonus to hit.'` | — | camp alerted | **yes** |
| 4 | Plan the round | `'Each rebel takes one order. <b>Move</b> relocates a character, <b>Sprint</b> increases move distance but the character can\u2019t shoot, <b>Hold</b> braces (+2 ATK) and fires on anyone crossing its lane. Green rings indicate cover to make your characters harder to hit. Press <b>Execute</b> when you have finished giving orders.'` | — | first Execute, or no hostiles | no |
| 5 | Take the shot | `'Shots resolve one at a time on the attack panel in initiative order. Tap another squatter to retarget \u2014 or tap a <b>red canister</b> to blow it \u2014 then hit <b>Attack</b>.'` | — | first attack, or no hostiles | no |
| 6 | **Fire Support** (new) | `'Fire Support can help turn the tide of battle. Select the <b>Fire Support</b> action from the action menu and click on an area to summon Cass to provide door gunner cover there.'` | the first full round is over and we're back in `PLANNING` (`round>=1`) | Cass called, or no hostiles | **yes** |
| 7 | Cover and nerve | `'Cover soaks incoming damage. Some cover like crates can be destroyed.<br>Eliminate <b>Boss Craw</b> and other enemies might lose their nerve and panic. Panicking characters cannot use actions.'` | — | every squatter down | no |
| 8 | Raise the signal | `'The rock is yours. Push inside, walk a soldier to the command-room console, and <b>raise the signal</b>.'` | — | never (last card) | no |

- The dots (`tutDots`) now count 8.
- `tutTick()` must respect `when()`. If card 6's `when` isn't met yet but card 5 is done, show nothing until it is.
- The existing narrow-screen fold during `ENGAGE` stays.
- Set `tutFlags.fs=1` when Cass is called.

## A5. Cass as fire support in the prologue

The prologue has no Graf, so today `FS` is null. For `SCN.mode==='haven'`, seed `FS` in `initState()` with one scripted door-gunner asset:

```
{mode:'doorgun', name:'Cass’s freighter', pilot:{first:'Cass'}, state:'ready', left:0, scripted:1}
```

- **Lock it until card 6 appears.** `fsItems()` hides it before then, so the Fire Support action doesn't show early. One use per mission.
- **Area targeting (new):** the designer wants the player to *click an area*. Today's door gunner isn't anchored to a point. For this asset (and as a proposal for every door gunner, logged as a blocker), `fsPlace` stores the clicked point. Each round it's active, it rakes up to 3 enemies within **320px** of that point instead of map-wide.
  - Placement needs a rebel's line of sight to the point (`fsSeen`, as today).
  - Show the radius as a dashed gold ring while placing and while it's active.
- **Log line:** `'<b>Cass</b> <span class="d">(Cass’s freighter):</span> Door gun’s hot. Keep your heads down.'`
- Cass's freighter is drawn the way the current door gunner pass is. If there's no freighter art, reuse the Graf silhouette with a Cass livery note in the blockers.

## A6. Base: "BASE ESTABLISHED" splash, then Cass (`game/js/base.js`)

On the prologue win, `discoverCass()` and `openWin('cassIntro')` run today. Change it to:
1. Mission report (unchanged), then back to the base.
2. **Splash:** a new full-stage overlay (`#estSplash`).
   - **Layout:** it dims the scene (`rgba(7,8,24,.72)`). It shows **BASE ESTABLISHED** in the display font, about 56px, gold, with an ink shadow, and **Haven Rock** below it at about 24px.
   - **Motion:** it pops in with `--sr-ease-pop`, holds about 2.4s, then fades. Click or tap dismisses it early. Respect `prefers-reduced-motion` (no pop, 1s hold).
   - **No other screens over it:** don't show the Day banner while the splash is up, and hold `nextReport()` and the pointer until it closes.
3. **On splash close:** `openWin('cassIntro')`, whose copy is changed in part B.
4. The pointer chain ("Open the Galaxy" etc.) starts after `cassIntro` closes, as today.

## A7. Smoke test: `tools/onboarding-smoke.js`

Use the same Playwright harness as `gear-smoke.js`.
- New game → phase `CUTSCENE` with no `say()` bubbles → skip → Cass comm visible, phase `INTRO`.
- Acknowledge → briefing visible → Enter → three quips queued, phase `FREE`.
- Card 1 is up with the game frozen until Got it. Moving doesn't happen while frozen.
- Card 6 is hidden until `round>=1` in `PLANNING`. Then the Fire Support action is available and lists Cass. Placing it stores a point, and only enemies within 320px are raked.
- Force a win → base → `#estSplash` visible, no day banner → close → `cassIntro` open.
- Non-prologue ground missions still show the briefing before the cinematic.

## A8. DESIGN_BLOCKERS entries

- **Area-targeted door gunner:** made area-based for Cass. Should every door gunner work that way?
- **Prologue quips:** placeholder lines reused; designer to write new ones.
- **Cass's freighter art** in the ground scene.
- **Audio wake** when the cinematic autoplays (only if it was a problem).

---

# Part B: copy pass (text only)

Card text is in A4. Strings are written as they should appear in JS; keep the quote style the file uses.

## B2. Base pointer label: `game/js/base.js`, `updateGuide()`

`'Open the Source Network'` → `'Open the Galaxy'`

---

## B3. Source contact onboarding: `game/js/base.js`

### Prologue won (around L4560, the `news(...)` calls before `discoverCass()`)
- `'<b>Haven Rock is ours.</b> The squatters are gone; the signal is up. Day one of the rest of the war.'`
  → `'<b>The abandoned base at Haven Rock is ours.</b> The squatters are gone; the signal is up. Day one of the rest of the war. The Revolution begins today!'`
- `'…Joss is already talking to it. Restore it from the hangar.'`
  → `'…Joss is already inspecting it. Restore it from the hangar.'`

### `seedNews()`
- `'Haven Rock is powered, pressurized, and off every chart. Day one of the rest of the war.'`
  → `'Haven Rock is powered, pressurized, and off every chart. We\u2019re well hidden from the Hegemony here.'`
- `'Inventory logged: six Aklis, … one derelict hauler in the cave, and a rock with our name on it. Nothing flies. Yet.'`
  → `'Inventory logged: six Aklis, four Cowboys, four Med Packs, one derelict hauler in the cave.'`
- `'First contact on the wire: <b>Cass Wender</b>, the smuggler who flew us in.'`: unchanged.

### Cass transmission window (`winMode==='cassIntro'`)
- **Cass's quote:**
  `“Told you the rock was worth it. You and your revolution, huh? Crazy! I might just stick around for a while and see where this goes. I might know some people who hate the Hegemony as much as you do. Raise me when you’re ready to listen.”`
- **Body:** change `Open the <b>Source Network</b> and raise him.` → `Open the <b>Galaxy</b> and raise him.` The rest stays.
- **Footer:** `'carrier locked · unregistered freighter · voice known'` → `'carrier locked · unregistered freighter'`

### Build Your Network window (`winMode==='srcTutIntro'`)
- `tutS('4. Take the Risk', …)` → `tutS('4. Manage the Risk', …)`. Its description is unchanged.
- Everything else is unchanged.

### Cass's bio (`STORY_SRC.cass.bio`)
`'Flew you in and didn’t ask questions. Knows every port, every price, and every sheriff’s bad habit between here and the core.'`
(Also update the same line in `tools/ui-kit/styleguide.template.html` if it's easy; it's only a style-guide sample.)

### Comm burst on first contact (`srcContact()`)
```
const lines=['Coded burst to '+src.loc+'. '+src.name.split(' ')[0]+' is responding on our secure channel.','Cultivation increased.'];
```

### Cass's first signal (`storySignal()`, the `stealcross` text)
```
'“So you and your revolutionaries want to matter out here, want to survive? Then you need some wings, and I don’t mean that bucket of bolts hauler in your new hangar. I mean something with some teeth! Dustfall, a frontier town on Akkaro, keeps one has-been FT-4 Cross on the pad behind the HQ. And you can’t afford to be picky when you’re just a group of idealists with nothing but dreams to pay for things with. I can get you the pad layout, but the rest will be up to you. Put your team together, and restore that old Graf in your hangar to get them there. You’ll need a second pilot for the job. I’ll ask around. You’re welcome, by the way!”'
```

### After Acknowledge (`followSignal()`, the `stealcross` branch)
`' One catch — the plan needs two pilots and we have one. Cass is already asking around; give him a day.'`
→ `' The mission requires two pilots and we have one. Cass is already asking around; advance a day to see what he has found.'`

### Next-day news (the `pilotwait` block in `advanceDay()`)
`'<b>Cass Wender</b> is on the wire — he has something for us. Raise him from the Source Network.'`
→ `'<b>Cass Wender</b> is on the wire — he has something for us. Raise him from the Galaxy.'`

### Cass's second signal (`storySignal()`, `recruitSera`)
```
'“Don’t thank me too fast, but I’ve found your stick. Sera Kest — ex-Hegemony survey pilot. She’s been asking around unsavoury types for any jobs going to put some dirt in the Empress’ eye and I think she’ll appreciate a real cause like yours. They say she’s grounded for attitude and hungry to fly a fighter again. She’s on my next run over to you if you’ll have her.”'
```

### Sera's arrival (`sig.kind==='recruitSera'`)
- **Line:** `'Cass’s freighter is inbound. He sets down and down comes the boarding ramp. Walking down, one bag over her shoulder: your new pilot.'`
- **Bio, in both places** (`game/js/base.js` castRebel for `sera`, and `game/js/space.js` `dbPilot('sera-kest', …)`):
  `'Ex-Hegemony survey pilot. Deserted after an incident at Callis Reach. Looking to put her skills against the Hegemony, ideally for a cause that means something.'`

---

## B4. Left alone

- The other "Source Network" labels: the Command Center buttons that open the galaxy (L2381, L2897). Flag them in your summary in case the designer wants them renamed.
- The Sources field manual pages (`TUT_PAGES`).
