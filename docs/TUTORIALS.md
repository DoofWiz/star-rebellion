# Tutorials

Every tutorial in Star Rebellion: when it fires, what shape it takes and what it says. Update this file whenever a
tutorial is added, moved or reworded.

- **Built tutorials** keep their words in the code. This file records their trigger and where they live; edit their
  text through the text spreadsheet (`docs/TEXT.md`).
- **Planned tutorials** keep their full text here until they are built. Once built, move the words out and leave a
  row in the index.
- The order of the onboarding beats comes from the Onboarding section of *Campaigns & Missions: Linear Flow of Star
  Rebellion* (Google Drive). This file covers only the tutorials inside those beats.

## Index

| Tutorial | Trigger | Shape | Status | Where |
|---|---|---|---|---|
| Take the Rock combat cards (Move out, Sneak past, Start the fight, Plan the round, Take the shot, Fire Support, Cover and nerve, Raise the signal) | During the prologue mission | Cards | Built | `TUT` in `game/js/ground.js` |
| Fire support: Strafing Run | Opening the Steal Fuel plan in onboarding | Callout in the plan window | Planned | Onboarding implementation brief, change 4 |
| Build Your Network (Sources) | Today: first visit to the Galaxy view. Moving to after Steal Fuel is won | Intro window + field manual | Built; trigger moving | `srcTutIntro` and `TUT_PAGES` in `game/js/base.js`; onboarding brief, change 5 |
| [Run Your Network (Agents)](#run-your-network-agents) | Tachi Gard joins after Rescue Tachi | Intro window + guided steps + field manual | Planned | This file |
| [Someone's Asking Questions](#someones-asking-questions) | The Bureau's first Lead, on Maro Venn | Guided steps | Planned | This file |
| [Sources field manual: Agents update](#sources-field-manual-agents-update) | The player's first non-onboarding Source | Page swap | Planned | This file |

## Shapes

- **Intro window.** A small window that opens once, sets out the system in numbered points and ends on a line of
  tension. Buttons: **Field manual** and **Got it**. A **?** in the header opens the field manual.
- **Guided steps.** On-screen prompts in order. Each one points at a piece of UI, says what to do and what it means,
  and completes when the player does it (or clicks **Next** for read-only steps).
- **Field manual.** Paged reference behind the **?** button, read any time. Opt-in, so it can go deeper than the
  intro.
- **Card.** A single prompt during combat or on a screen, pausing play where needed.

---

## Run Your Network (Agents)

**Trigger:** the player accepts Tachi Gard's offer after *Rescue Tachi* (Ambush: Extract VIP). The intro window
opens through the queued pop-up chain, after the reward screen and Tachi's comm, never on top of them.

**State when it starts**

- Tachi joins as the player's first Agent, already **posted to Akkaro**.
- **Cass and Venn are in Tachi's cell.** They are the only Sources at this point: Tessaly doesn't become a Source
  until the Akkaro onboarding is finished.
- **Starting Cell capacity is 2.** This replaces the starting value of 1 in the Network implementation plan and in
  `docs/ui/SCREENS-HANDOFF-2.md` §3.1. Capacity then grows with Agent level and Intelligence Center upgrades.
- The **Recruit** operation ships with Phase 3 of the Network, alongside the next round of onboarding work, so
  Step 5 goes in with it.

### Intro window

**Title:** Run Your Network

You've got your first **Agent**.

Agents are your operatives in the shadows. You can't be everywhere at once, and you can't risk being seen. Agents
handle your Sources for you, so the trail never leads back to Haven Rock.

1. **Recruit Agents.** Find people with the nerve and know-how to work undercover.
2. **Post Them.** Send each Agent to a location. They can only meet Sources where they are.
3. **Build Their Cell.** The Sources an Agent handles form their cell.
4. **Keep Cells Small.** If one Source is caught, everyone in their cell is in danger.
5. **Protect the Hub.** Your Agents know where you are. If one falls into Hegemony hands, so might you.

A Source can tell the Hegemony about their Agent. An Agent can tell them about you.

The only way to stay hidden is to make sure no one knows too much...

*Click the **?** button to learn more.*

Buttons: **Field manual** · **Got it**

### Guided steps

These start when the intro window is dismissed.

**Step 1: Your network**
*Points at:* the **Intelligence** tab.
Your network lives here: every Agent, every Source and every thread that connects them.
*Completes:* the player opens the Intelligence tab.

**Step 2: Meet your Agent**
*Points at:* Tachi's node.
This is Tachi Gard, your first Agent. Agents don't go on missions. They work in the shadows, handling your Sources
so you never have to meet them yourself.
Tachi is posted to Akkaro. Any Sources she handles there are her **Akkaro Cell**.
*Completes:* the player selects Tachi.

**Step 3: Read her file**
*Points at:* the stats on Tachi's rail.
**Tradecraft** reduces the Risk her Sources build up when you contact them or run their missions.
**Cover** is how hard she is to trace if one of her Sources is caught.
**Rapport** helps her win a Source's trust.
**Cell** is how many Sources she can handle. She can take on two to begin with. That grows as she gains experience
and as you expand your Intelligence Center.
*Completes:* the player clicks **Next**.

**Step 4: Her cell**
*Points at:* Cass and Venn's nodes and the lines joining them to Tachi.
Cass and Venn now report to Tachi. Everyone in a cell is connected through their Agent.
If one of them is **Burned**, the Hegemony will start pulling on that thread, and the rest of the cell could be next.
One Agent handling many Sources is efficient. Many Agents handling a few Sources each is safer. The choice is yours.
*Completes:* the player clicks **Got it**.

**Step 5: Put her to work**
*Points at:* the **Recruit** operation on Tachi's rail.
Agents can do more than handle Sources. Send Tachi to **Recruit**, and she'll search Akkaro for people willing to
join the cause.
Every operation takes time, and every operation carries some risk. Advance the day to let her work.
*Completes:* the Recruit operation starts. End of tutorial.

### Field manual

Opened from the **?** button or **Field manual**. One heading per page.

**Agents**
You can't run a rebellion from the front line. Someone has to work in the dark.
**Agents** are your handlers. Each one is posted to a location and handles a cell of Sources there. They pass on
your requests, calm your Sources' nerves and keep the rebellion's secrets.
Agents aren't soldiers. They don't go on missions. But they level up, they can be hunted, and they can be lost.
Look after them. They know more than anyone else in your network.

**Posting**
Every Agent is posted to one location.
**Visit.** Your Agent meets the Source face-to-face. This builds trust faster, but needs the Agent posted on the
Source's world.
**Contact.** Communicate remotely. This is safer and works from anywhere, but it may not stay safe as Hegemony
surveillance grows.
To move an Agent, **Repost** them. The journey takes days, and their Cover drops while they travel.

**Cells**
Every Source belongs to an Agent's **cell**.
A cell only knows its own Agent. Sources in one cell don't know about Sources in another, and that's the point.
If something goes wrong, the damage stays in that cell. One big cell is easier to manage. Several small cells are
much harder to unravel.
Each Agent has a **Cell capacity**, the number of Sources they can handle at once.

**An Agent's File**
Some Agents are better at this than others.
**Tradecraft:** the skill of staying invisible. The higher it is, the less Risk their Sources gain from contact and
missions.
**Cover:** how hard the Agent is to trace when one of their Sources is caught. Low Cover makes them easy to follow.
**Rapport:** how well they win a Source's trust.
Give your most valuable Sources to your most careful Agents.

**Operations**
Agents can act without a mission:
**Recruit:** search their location for new Sources or Rebels.
**Lie Low:** the cell goes quiet. Risk falls faster, but nothing comes in.
**Counter-Intel Sweep:** check the cell for Bureau plants.
**Repost:** move to another world. Cover drops in transit.
**Disinformation:** spend Intel to clear a Lead, or send the Bureau after a decoy.
Every operation takes time. While an Agent is busy, their cell has to wait.

**Leads**
When a Source is Burned, the Hegemony doesn't just arrest them. They interrogate them.
You have a few days to respond:
**Rescue:** a high-risk mission to get them out.
**Silence:** make sure they never talk.
**Contain:** recall their Agent and have the cell lie low.
**Let it play out:** gamble on their loyalty.
If they talk, the Bureau gains a **Lead**. While a Lead is active, the people it points to grow more dangerous by
the day.
Leads go cold eventually. Until then, someone is following the trail.

**Exposure**
**Exposure** is how close the Hegemony is to finding the rebellion itself.
It rises as the Bureau gathers Leads, and with every mission and liberation. The higher it gets, the harder the
Bureau looks, sweeping locations where it suspects you're operating and putting every Source there at risk.
Keep your cells tight, your Agents careful and your Exposure low.
They're looking for you...

**Dev note:** the interrogation clock is a balancing variable, so the Leads page says "a few days" on purpose.

---

## Someone's Asking Questions

**Trigger:** the Bureau gains its first Lead, on Maro Venn, in the onboarding beat where off-worlders start asking
around town. It opens after Venn's comm. This is where Leads and Exposure are taught; the Agents tutorial only hints
at them.

**Step 1: A Lead**
*Points at:* the Lead badge on Venn's node.
The Bureau has a **Lead** on Maro Venn.
A node with a Lead gains Risk every day until the Lead goes cold. Keep contact to a minimum, or act before they
close in.
*Completes:* the player selects Venn.

**Step 2: Exposure**
*Points at:* the **Exposure** panel.
**Exposure** is how close the Bureau is to finding the rebellion. Every Lead pushes it higher.
*Completes:* the player opens the panel.

*Click the **?** button to learn more about Leads.*

---

## Sources field manual: Agents update

**Trigger:** the player gains their first Source outside onboarding (Cass and Venn don't count). The page below
replaces **Making Contact** in the Sources field manual (`TUT_PAGES` in `game/js/base.js`) from then on. It waits
until then so the player isn't hit with both changes at once.

**Making Contact**
When you need to deal with a Source, you have two options:
**Visit.** Your Agent meets the Source in person. This builds trust faster and opens up more opportunities. But
your Agent must be posted to the Source's location, and every meeting is a chance to be seen.
**Contact.** Communicate remotely. This works from anywhere and is safer, but it may not stay that way as the
Revolution grows and Hegemony surveillance increases.
Either way, speaking with a Source can lead to new opportunities, requests or Missions.
Keep an eye on your Sources. They may have something important to tell you.
