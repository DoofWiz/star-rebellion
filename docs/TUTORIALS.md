# Tutorials

Every tutorial in Star Rebellion: when it fires, what shape it takes and what it says. Update this file whenever a
tutorial is added, moved or reworded.

- **Built tutorials** keep their words in the code. This file records their trigger and where they live; edit their
  text through the text spreadsheet (`docs/TEXT.md`).
- **Planned tutorials** keep their full text here until they are built. Once built, move the words out and leave a
  row in the index.
- The order of the onboarding beats comes from the Onboarding section of *Campaigns & Missions: Linear Flow of Star
  Rebellion* (Google Drive). This file covers only the tutorials inside those beats.
- The beats are built as the prologue script in `game/js/prologue.js` (`docs/PROLOGUE-HANDOFF.md`). A built tutorial
  is a `tutorial:` action there: guided steps and callouts live in `PRO_TUTS`, their words in `PRO_TEXT` (the
  Prologue tab of the text spreadsheet). A tutorial fires once; the debug Prologue panel's *Replay tutorials* clears
  that.

## Index

| Tutorial | Trigger | Shape | Status | Where |
|---|---|---|---|---|
| Take the Rock combat cards (Move out, Sneak past, Start the fight, Plan the round, Take the shot, Fire Support, Cover and nerve, Raise the signal) | During the prologue mission | Cards | Built | `TUT` in `game/js/ground.js` |
| Raise Cass (Open the Galaxy, Select Cass Wender, Contact) | Cass's transmission closes (prologue beat `cass_contact`); ends when Cass is contacted | Guided steps (pointer) | Built | `PRO_TUTS.raiseCass` in `game/js/prologue.js` |
| Fire support: Strafing Run | Opening Steal Fuel's plan (prologue beat `fuel_plan`); ends when the FT-4 Cross is assigned as an asset | Guided step (callout on the empty fire support slot) | Built | `PRO_TUTS.strafingRun` in `game/js/prologue.js` |
| Build Your Network (Sources) | The player's first brand-new Source (not Cass or Venn): the farewell beat once it is written; until then the first new Source after the prologue's frontier. The **?** stays on the Sources panel and Cass's and Venn's windows throughout | Intro window + field manual | Built | `srcTutIntro` and `TUT_PAGES` in `game/js/base.js`; `PRO_TUTS.sources` |
| Run Your Network (Agents) | Tachi Gard joins as the first Agent after Rescue Tachi (prologue beat `agents`): the intro window, then five guided steps once it (or its field manual) closes; Step 5 opens Recruit, and starting one ends it | Intro window + guided steps + field manual | Built | Intro window `agentTutIntro` and field manual `AGENT_PAGES` in `game/js/base.js` (the **?** on an Agent's rail opens it); steps `PRO_TUTS.runNetwork` in `game/js/prologue.js` |
| Someone's Asking Questions | The Bureau's first Lead, on Maro Venn (prologue beat `first_lead`): the game moves to the Intelligence tab after Tachi's and Venn's comms. Step 1 completes on selecting Venn, step 2 on opening Exposure; then a step at **Lie Low** on Tachi's rail (its words still to write: DESIGN_BLOCKERS C-48) opens Lie Low, and ordering it ends the tutorial | Guided steps | Built | `PRO_TUTS.askingQuestions` in `game/js/prologue.js` |
| Recruit pointer (Tachi's pilots) | Prologue beat `tachi_recruit`, after Tachi's comm; skipped while a Recruit is running | Pointer | Built (label `[TEXT NEEDED]`) | `PRO_TUTS.tachiRecruit` |
| Black Market pointer | Prologue beat `market`, after Cass's comm | Pointer | Built (label `[TEXT NEEDED]`) | `PRO_TUTS.marketTab` |
| Hire a mercenary | Prologue beat `sweet_tooth`: the first look at the Black Market, after Sweet Tooth's intro comm; ends on a hire | Callout on the mercenary lot | Built (text `[TEXT NEEDED]`) | `PRO_TUTS.hireMerc` |
| The second hauler | Prologue beat `hauler`: Hangar room for 4 starfighters and 2 transports, then the Graf hauler lot | Callouts on the Hangar, then the lot | Built (text `[TEXT NEEDED]`) | `PRO_TUTS.hauler` |
| Sources field manual: Agents update | Lands with Build Your Network: from then on, Making Contact is the Agents version | Page swap | Built | `TUT_CONTACT_AGENTS` in `game/js/base.js` |

## Shapes

- **Intro window.** A small window that opens once, sets out the system in numbered points and ends on a line of
  tension. Buttons: **Field manual** and **Got it**. A **?** in the header opens the field manual.
- **Guided steps.** On-screen prompts in order. Each one points at a piece of UI, says what to do and what it means,
  and completes when the player does it (or clicks **Next** for read-only steps).
- **Field manual.** Paged reference behind the **?** button, read any time. Opt-in, so it can go deeper than the
  intro.
- **Card.** A single prompt during combat or on a screen, pausing play where needed.

