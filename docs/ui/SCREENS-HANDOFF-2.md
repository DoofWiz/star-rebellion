# Screens handoff, part 2: Starfighter window · Source approach · Intelligence tab · Mission planning

**For:** Claude Code in `DoofWiz/star-rebellion`. Branch from `origin/Specialties` (or `main` once it's merged). Build on top of part 1 (`docs/ui/SCREENS-HANDOFF.md`): this reuses its popover buttons (`.pf-btn` / `.pf-tip` / `.pf-pop`), header plate, skill tiles and Comm burst styles, so build part 1's personnel file and Comm burst first.

**Save as:** `docs/ui/SCREENS-HANDOFF-2.md`. The stylesheets in §7 go in `game/ui/`:
- `sr-shipfile.css` (new);
- `sr-intel.css` (new);
- `sr-plan.css` (new);
- the approach rules appended to the end of `sr-comm.css`.

**Design source:** the reviewed canvas "Star Rebellion — Mission Complete", rows "Space combat — pilot & ship", "Comm burst & source approach", "Intelligence tab — The Network" and "Mission planning".
**Rules source for §3:** the Google Doc "Star Rebellion: The Network — Design Proposal", plus the review decisions marked ⚑ below, which change it.

As before:
- follow `CLAUDE.md`;
- log anything that needs a missing system in `docs/DESIGN_BLOCKERS.md` (see §5);
- add the listed smoke tests and run every `tools/*-smoke.js` before merging;
- stop for the designer after each section.

**Build order:** 1 Starfighter window → 2 Source approach → 4 Mission planning → 3 Intelligence tab. The Intelligence tab is a new system and much the largest, so it goes last; it's phased in §3.6.

## 0. Rules (unchanged from part 1, restated)

- **No command bar out of combat.** Actions sit with what the player is looking at. Advance day is a lone gold button bottom-right. *(Space combat may keep its command bar; the Starfighter window is a window, so its actions live in the window.)*
- **Style-guide colours:**
  - gold means *do this*; rebel red means ours; Hegemony blue means theirs;
  - hazard orange means danger, wounds or unmet;
  - psi purple means XP, levels and cultivation;
  - shield cyan means intel and info;
  - resources use `--sr-res-*`.
- **No "default AI" chrome:** no pills for state, no left-border cards, and labels in small caps. Detail goes in hover popovers rather than on the surface wherever possible.
- **Copy marked *placeholder* is the designer's to replace.**

---

## 1. Starfighter window (space combat), `game/js/space.js`

This replaces `dossierHTML(s)` **and** `shipHTML(s)`: today double-clicking a friendly ship opens two windows, "Pilot dossier" and "Ship systems". Now it opens **one** window, `sr-window sf-win` (1100px), titled **"Starfighter"**, with a close button. Use the same layout as part 1's personnel file:
- `.sf-body` grid: a stage column on the left spanning two rows, a header plate across the top of the two right columns, then `.sf-mid` (weapons) and `.sf-side` (pilot).
- `SR.shipSheet` (the hangar's version, with no pilot or combat state) should render the same stage and weapons, without the pilot column, nerve or lock.

**Header plate (`.pf-plate`):** the pilot's portrait (`portraitURL`), the `.pf-lvl` ring (XP to the next grade), the name, then the pilot icon with **"Pilot"** and the nerve state:
- Cool (cyan `cool` icon), Steady, or Panicking (`--sr-c-bad`, `panic` icon);
- the nerve number goes in the state's `title`;
- rank chevrons on the right (display only).
- **Removed:** the bio quote and the age.

**Stage (`.sf-stage`):**
- **The ship, large and top-down:** `SA.ship(c, artShipId(cls), …, s≈6.2, {livery:'rebel', loadout})` on a 520×420 canvas at 2×, shown 364×294 and centred in the shield rings. Starfield background, rebel hazard stripe across the top.
- **Shield zones (`.sf-zones`, SVG):** two segmented arcs around the ship, fore at the top and aft at the bottom, with one segment per 5 shield points. Lit segments are cyan; a segment angled to the other zone is purple (`seg.at !== k`); unlit ones are dark. A zone with no shield (`zoneShield(s,z) === 0` and nothing angled into it) is a red dashed arc.
- **Zone labels (`.sf-zlbl`):** above the fore arc and below the aft arc. Examples: "Fore shield 15/15", "Fore shield · angled forward 10/15", "Aft zone exposed" (red).
- **Plate at the bottom (`.sf-plate`):**
  - ship name (display font) and "FT-4 Cross · Multi-role starfighter";
  - a chip row: **Max speed** (`maxSpeedOf(s)`) and **Initiative** (`effInit(s)`);
  - Armour and Hull `.sf-dur` bars, one cell per 5 points.
- **Move set popover on Max speed:** a `.pf-pop` opening upward. It's the `.sf-dial` grid: rows are speeds max…1, and columns are Hard L, Bank L, Ahead, Bank R, Hard R and Loop.
  - Build it from `dialAvail(s)`. Cells from the ship's own dial are `.is-ship` (cyan); cells from the pilot's maneuvers (`p.mans`, e.g. Loop at 3) are `.is-pilot` (purple); everything else is `.is-off`.
  - Add a small legend: Ship / Pilot maneuver.
  - Engine and controls crits drop cells automatically, because `dialAvail` already handles them.

**Weapons (`.sf-mid`):** a "Weapons" heading, then one `.sf-wpn` card per `s.wpns`, in two rows.
- **Top row:** the icon box (`.sf-wpn__art`, kind colour from `WCOL`) and the name, then on the next line:
  - the **damage-type chip** (`.sf-type`: small filled circle with the kind icon, then "Plasma", "Ballistic" or "Missile");
  - the slot ("Primary" / "Secondary") in `.sf-slot`.
  - **Hovering the type chip** opens a popover: the type name, "Damage type", and its traits as `.pf-fx` chips from `wd.tags` (e.g. "Unlimited charge", "Absorbed by shields"). These traits are **no longer shown on the card**.
- **Bottom row (`.sf-tiles`, `--n` = 2 or 3):**
  - **To hit:** `s.pilot.aim − 2×critCount(s,'targeting') + wd.atk`, green, or orange when negative. **Hovering** it opens a **"Modifiers"** popover with `.sf-mod` rows: "Pilot Aim {skill}" +n; "Weapon handling" (only if `wd.atk ≠ 0`); "Targeting Array Damage" −2 per crit; then a `.sf-mod--total` row. **No situational rows** (lock bonuses and the like).
  - **Damage:** `dmg[0]–dmg[1]`.
  - **Shots:** only for weapons with ammo. Gold `.sf-pips` with `.is-spent`, and the value turns orange at 0.
  - **Jammed weapons** (feed crit, non-plasma) get `.is-off`.
- **Under the cards:**
  - **Critical damage:** each crit is a hazard-striped `.sf-crit` (orange disc with the work icon, name, description from `CRITDEFS`).
  - **Lock:** `s.lock` shows as `.sf-lock`: "Locked on **{target}**" with "Lv n".

**Pilot (`.sf-side`):**
- **Nerve:** a `.pf-morale` row with a cyan, gold or red bar and the **state word** instead of the number (number in `title`).
- **Character:** the trait as a `.pf-btn` with a popover.
- **Experiences:** `p.tr` (the rebel's experiences), each a `.pf-btn` with its popover; "N / 3" in the heading.
- **Pilot maneuvers:** each maneuver is a `.pf-btn`: "Loop" with the `roll` icon. Its popover says only: "A speed-3 loop: finish the move facing back the way you came." *(placeholder)*. **No "Unlocked at level 4"** label.
- **Skills:** a 2×2 `.pf-skill` grid with effect lines, **without "in space"**: Aim "+6 to hit", Cunning "+21% repairs & shields", Focus "+2 harder to hit", Presence "77 Cool". Use the same formulas as part 1 (space values).
- **Removed:** the old "XP … manual promotion arrives with the persistent campaign" line.

**Smoke (`tools/starfighter-smoke.js`):**
- double-clicking a friendly ship opens one `.sf-win`, not two windows;
- the header has no age or quote;
- shield arcs match `segs` (angled shows purple, exposed shows the red dashed arc);
- the Max speed popover cells match `dialAvail` (Loop purple when `mans` includes it);
- To hit equals the formula, and the Modifiers rows add up to it;
- the type popover lists the weapon's tags, and the card shows none;
- missiles at 0 ammo give an orange Shots tile;
- a crit adds a `.sf-crit` and lowers To hit by 2;
- `SR.shipSheet` renders without the pilot column.

---

## 2. Source approach (`winMode==='candidate'`, `base.js`)

The same window family as the Comm burst (`sr-window cm-win`), titled "Approach".
- **Who (`.cm-who`):**
  - initials avatar with a **gold** ring and a `sneak` badge (`.cm-ava--potential`), since they aren't ours yet;
  - above the name, a gold small-caps `.cm-kicker` reading "Potential source" (this replaces the red pill tag);
  - the name and `cd.type · cd.loc`;
  - on the right, two `.cm-mini` meters for their starting values: Cultivation `cd.cult` (psi) and Risk `cd.risk` (hazard).
- **Contact strip (`.cm-chan`):** "Courier contact" (gold) plus `cd.loc` and *placeholder* flavour ("dead drop · unsigned"). No waveform.
- **Narration (`.cm-log`):** `cd.pitch`, verbatim.
- **Network capacity (`.cm-cap`):** the people icon, "Network capacity", a pip per slot (`sourceCap()`; filled red for each live source, dashed for free ones) and "n/cap". When full, it gets `.is-full`: orange border and a "FULL" label.
- **Choices (`.cm-choices`, number keys work):**

  | State | 1 | 2 | 3 |
  |---|---|---|---|
  | Room in the network | **Take them on.** (`.is-primary`) · diamond rows "+{inc} credits a day" (resource colour) and "+4 exposure" (hazard) | **Too dangerous. Send no reply.** | — |
  | Network full | ⚑ **Standby** (`.is-primary`) · "Stays on the Galaxy map as a potential contact", "Recruit them once the network has room" *(placeholder)* | **Take them on.** disabled, with `.cm-choice__why` "Network full" | **Too dangerous. Send no reply.** |

- **Behaviour:**
  - "Send no reply" replaces "Burn the contact" (same effect).
  - ⚑ **Standby is new:** the candidate isn't recruited and isn't dropped. They stay on the Galaxy map as a **potential contact** at `SRCPOS[id]`, drawn as an un-recruited marker. Reopening them shows this same window and lets the player recruit once a slot is free. Store this in `G.candWait`, or a new `G.standby` list, so they survive saves.
  - Whether a standby contact ever gives up is undecided (blocker).

**Smoke (`tools/approach-smoke.js`):**
- with room, two choices, and Take on recruits;
- when full, three choices, Take on disabled, and Standby leaves a potential-contact marker on the galaxy map that reopens the window;
- after freeing a slot, Take on works from the reopened window;
- "Send no reply" posts the existing news line.

---

## 3. Intelligence tab: The Network

A new top-level tab, **after Missions**: Base · Galaxy · Missions · **Intelligence** · Arsenal · Black Market. Its icon is `eye`, and it's a full stage view (like the Missions tab in part 1). Top bar: "Intelligence", sub "Intelligence Centre · Haven Rock".

### 3.1 Data model (new). The rules are in the Network doc; the ⚑ items are review decisions
- **Agents:** `G.agents = [{id, name, level, xp, tradecraft, cover, rapport, cap, postedTo, moving?, leads:[]}]`. This is a **dedicated recruit type**; other rebels never convert. Starting cell capacity is **1**, and it grows with the Intelligence Centre room's expansion and upgrades.
- **Sources:** each source gains `agent` (the handler's id); the existing `loc` stays.
- **Leads:** `G.leads = [{target:{kind:'agent'|'source'|'location'|'base', id}, from, day}]`. A node with a Lead gains Risk passively and can be hunted.
- **Exposure:** `G.exposure` (0–100), banded Low / Medium / High / Max.
  - ⚑ It **rises with Leads, Missions and Liberation.** This changes the doc, which said "high-profile missions and Revolution Level".
  - **Revolution Level only scales the Bureau's response**, not the baseline Exposure (as in the doc's answer).
- **Interrogations:** `G.interrogations = [{source, daysLeft, expectedLeads:[targets]}]`.
- **Intel** becomes a pure currency. Warning comes from coverage, which is the Galaxy tab's job (out of scope here).

### 3.2 Stage: the network graph
- **Nodes** (absolutely positioned buttons over an SVG edge layer):
  - **Intelligence Centre** (`.in-node--hub`, base icon), labelled with its world only, e.g. "Haven Rock". **No "no Leads" text.**
  - **Agents** (`.in-node--agent`): initials disc with a red ring, name, and ⚑ **"{posted location} Cell"** with a world dot (e.g. "Akkaro Cell", "Veray Yards Cell").
    - ⚑ **Cell capacity sits on the icon** as an `.in-cap` pill ("2/2").
    - A Lead on the Agent shows a red target badge; a pending Lead (their Source is under interrogation) shows an orange eye badge. Both have hover text.
  - **Sources** (`.in-node--src`): initials, name, location with a world dot, and an `.in-risk` ring (orange, filled to Risk %; title "Risk n%").
    - **Burned or captured:** greyscale, with a lock badge and an "Interrogation · n days" pill under it.
  - **Open slots:** a dashed `.in-node--empty` per free cell slot ("Open slot", "Recruit in {loc}").
- **Edges (SVG):**
  - base → Agent: dotted red ("The Intelligence Centre handles Agent X");
  - Agent → Source: solid cyan ("Agent X runs Y");
  - Agent → open slot: dashed grey;
  - the Bureau's trail from a captured Source to its Agent: orange dashed ("The Bureau is following this trail from … to …").
  - ⚑ **There's no legend.** All of this is on hover; use styled game tooltips, not browser `title`.
- **Layout:** columns base → Agents → Sources. Lay out from the data, and place each Agent's Sources and open slots beside it.
- **Exposure panel** (top-left, `.in-exp`, a button): eye icon, "Exposure", the band word, four band segments, and one line on what the Bureau does at this band. Clicking it opens **the Bureau** in the rail.
- **Interrogation alert** (top centre, `.in-alert`): "**{Source}** is under interrogation. The Bureau extracts Leads in **n days**." with a **Respond** button that opens §3.4. One alert per active interrogation; the soonest first.
- **Advance day:** lone, bottom-right. No comms panel on this view.

### 3.3 Rail: the selected node (`.in-rail`, never scrolls). Title `.in-railtitle`: "Agent", "Source" or "The Bureau"
- **Agent:**
  - **Who:** initials disc with a red ring, kicker "Agent · Level n", name, and ⚑ "{location} Cell".
  - **Status card:** e.g. "Lead pending · if {Source} talks · n days", and the cell list.
  - **Tradecraft stats (2×2 `.in-stat`):** Tradecraft "His Sources gain less Risk", Cover "Easy to trace if a Source burns" (orange when low), Rapport "Better cultivation outcomes", Cell "n/cap · grows with his level".
  - **Operations (`.in-op` buttons; icon, name and description only, ⚑ no cost labels):**
    - **Lie Low:** the cell rests; Risk decays faster, nothing comes in.
    - **Counter-Intel Sweep:** check the cell for Bureau plants.
    - **Recruit:** ⚑ "Search {location} for new Sources **or Rebels**".
    - **Repost:** move to another world; Cover drops in transit.
    - **Disinformation:** clear a Lead, or send the Bureau after a decoy. Costs Intel; disabled when there's nothing to clear.
- **Source:**
  - **Who:** disc with a cyan ring, kicker "Source · Level n", name, and type.
  - **Card:** ⚑ "Located at **{loc}**" (no Access-ladder label), ⚑ "Handled by **Agent X**", and "+n credits a day".
  - ⚑ **Two wheels (`.in-wheels`):** Risk (orange, value %) and Cultivation (purple, progress to the next level, "LEVEL n" in the centre). There's **no burn-threshold marker or text**; the player isn't told where burning starts.
  - **Actions (`.in-op`):**
    - **Contact:** ⚑ "Check in remotely and safely".
    - **Visit:** ⚑ "Face-to-face with Source". Requires the handler to be posted on-site; disabled otherwise.
    - **Exfiltrate:** pull them out alive; their benefits end.
    - **Cut Loose:** only this cell's Sources are downgraded (`in-op--danger`).
    - **Silence:** gone for good (`in-op--danger`).
- **The Bureau:**
  - **Who:** a blue eye disc, kicker "The Bureau", "Exposure: {band}", and ⚑ "Rises with Leads, Missions and Liberation".
  - **The four bands (`.in-band`, current one `.is-now`):** each with its behaviour and warning, from the doc's table.
  - ⚑ **"Current Leads"** (no count): one row per Lead or pending Lead, plus the base status.
  - **Investigator card (dashed, locked):** ⚑ "The Bureau has not assigned an Investigator into our activities yet." The header shows "Revolution Level 2"; the designer may remove that tag.

### 3.4 Interrogation window (`sr-window in-int`, titled "Interrogation")
- **Who (`.cm-who`):**
  - greyscale initials with a lock badge, and kicker "Captured · under interrogation";
  - name and "type · location · handled by Agent X";
  - on the right, a large "n days" with `.in-clockpips` (filled = days left of the clock length) and "until the Bureau extracts Leads".
- ⚑ **"Information they hold"** (no count or estimate): `.in-leadchip` per expected Lead target (e.g. "Agent Teodor Kade · his handler", "The Veray cell").
- **Responses (`.in-responses`, 2×2, number keys):**
  - **Rescue:** cost "A high-risk extraction mission". Outcomes "{name} saved, no Leads" and "A failed rescue can add Leads". It adds a mission to the board.
  - **Silence:** cost "{name} lost forever; morale hit". Outcome "No Leads extracted".
  - **Contain:** cost "Agent {X} recalled; the cell lies low". Outcome "Leads still come, but point at a cold trail".
  - **Let it play out:** cost "Nothing up front". Outcome "A gamble on their loyalty and what they know".
- **Footer:** only **Decide later** (ghost). ⚑ No note text. The clock keeps running.

### 3.5 Recruitment moves here ⚑
**Recruiting rebels moves to the Intelligence screen as an Agent task.** An Agent's Recruit operation searches their posted location for new Sources **or Rebels**. Retire the Command Center's recruit drive (`recruit:{days}`, `RECRUIT_COST` flow) once this lands, and migrate any in-progress drive into an Agent task on load. Log it in DESIGN_BLOCKERS if the Command Center keeps other duties.

### 3.6 Phasing (stop for the designer after each)
1. **Data and graph:** Agents (recruit type, posting), Sources tied to Agents, the network graph, the Agent and Source rails (read-only), cell capacity from the Intelligence Centre room.
2. **Operations:** Contact and Visit (with the on-site rule), Lie Low, Repost, Recruit (Sources and Rebels, with recruitment moved here), Exfiltrate, Cut Loose (cell-scoped), Silence.
3. **Danger:** burns start interrogations; the interrogation window and its four responses (Rescue makes a mission); Leads; Exposure and its bands; the Bureau rail; Counter-Intel Sweep; Disinformation.
4. **Escalation:** Bureau behaviour by band (sweeps, hunting Agents with Leads). The Investigator waits for the Rev 2 pass; the base raid follows the doc's gates.

**Smoke (`tools/intel-smoke.js`, grown per phase):**
- the tab is a stage view, and the graph renders the base, Agents, Sources and open slots from data;
- capacity pills match `cap`;
- selecting an Agent, Source or the Exposure panel swaps the rail, which never scrolls at 1440×900;
- Visit is disabled when the handler is off-world;
- Recruit can return a rebel;
- a burn adds an interrogation, an alert, an orange trail edge and an Agent "pending" badge;
- each response resolves as specified, and Decide later keeps the clock running;
- Exposure moves with Leads, missions and liberation.

---

## 4. Mission planning (`winMode==='plan'`, `planHTML(m)`, `base.js`)

This is a redesign of the planning window. Today's version shows everything at once: the full roster, a requirements checklist that repeats the slots, and fire-support toggles. The new one is built around **filling slots**.

- **Window:** `sr-window pl-win` (1320px), head "Plan: {mission}" with a close button, `.pl-body`, then `.pl-foot`.
- **It must fit 1440×900 with no scrolling.**
- **Remove** the always-visible Roster column and the "Before you can go" checklist. The slots, the fuel summary and the footer blocker replace them.

**Briefing strip (`.pl-brief`):**
- **Left:** the location block (planet in its `WORLD_LOOK` colour, a dotted connector, a red pin; world and region in small caps).
- **Then:** the description clamped to 2 lines (full text in `title`), "From **{source}**", and a ghost **"N objectives"** button whose popover (`.pf-tip`/`.pf-pop`) lists the objectives.
- **Right:** `.pl-fact` tiles for the operation type (icon plus Ground or Space), Risk (pips plus word, risk colour) and Travel time ("2 days"), then a `.pl-rew` reward block (credits, fuel and so on in resource colours, plus XP in psi).

**Squad (`.pl-soldiers`, wraps):**
- **The header counter (`.pl-count`) is large:** "**3/4**" plus "Squad size" plus seat pips (`.pl-seats`, filled red per soldier assigned, orange dashed per empty slot).
  - The max is the mission's squad size, capped by the transport's seats.
  - The border is orange until full, then `.is-full` (green number).
- **Soldier cards (`.pl-sold`, 160px, so 6+ fit and they wrap beyond that):**
  - portrait with a **small level wheel** (`.pl-lvl`, psi conic for XP progress, number in the centre: the same wheel as the personnel file);
  - name, rank (no "lv" text), a mini gear row (`.pl-kit`), and ✕ to remove. Click to swap.
- **Empty slots up to the max** are `.pl-sold--need` (orange dashed "+ Soldier", with "Slot n of max"). **Never label a slot "Optional"**: every slot shown is one to fill.

**Assets (`.pl-assets`):** this replaces "Transport & pilots" and the "Fire support" toggles.
- **Transport slot (`.pl-asset--primary`, kicker "Transport"):**
  - the ship art, name, class · hull, fuel and seats;
  - its **pilot layered on the ship** as a `.pl-pilot` badge overlapping the art (portrait plus name plus "Pilot"). Clicking the badge swaps the pilot.
  - An unassigned pilot is `.pl-pilot--empty` ("+ Pilot", orange dashed).
- **Then one card per added asset** (ships, vehicles, bots), each with its own layered pilot badge where it needs one.
- **Then a dashed `.pl-asset__add` "+ Add asset" card.** Adding an asset opens another add slot. Keep the current limit of 2 extra assets unless the designer says otherwise (blocker).
- **Picking:** clicking any empty slot (soldier, pilot, asset) opens a **`.pl-pick` picker anchored to that slot**, filtered to who or what fits it.
  - Available entries are green "Available"; unavailable ones are greyed out with the reason ("Assigned", "Injured · 11 days", "In squad").
  - Drag-and-drop from the old roster can stay as a power-user path, but the roster isn't on screen.

**Fire support (`.pl-supportrow`, left): granted automatically by the assets assigned. No toggles.** Each is a `.pl-ab` chip with an icon, name and "from {asset}":
- **A transport adds Supply Drop.**
- **A transport with a door gun also adds Door Gunner Cover.**
- **A starfighter adds Strafing Run.**
- An asset missing its pilot shows its ability greyed out as `.is-off`, "needs a pilot".
- The spare-transport "Reinforce" mode has no design yet (blocker).
- ⚑ **Supply Drop is paid up front:** `DROP_COST` (160 supplies) comes off when you press **Start mission**, and the chip shows the cost (`.pl-ab__cost`).
  - **If the drop isn't called during the mission, it's refunded** in the debrief. This replaces today's charge-when-called logic in the mission result handler (`r.dropUsed`).
  - With not enough supplies, the chip shows `.is-off` "Not enough supplies", and the mission can still start without it.

**Base support (`.pl-supportrow`, right; `.pl-base`):** Mission Control as its own clear card.
- **Unstaffed (dashed):** "Mission Control · UNSTAFFED", with "A free Controller in the Command Center backs this mission: the squad starts steadier, **+{mission_support_cool} Cool**." and a ghost **Command Center** button that opens it.
- **Staffed (`.is-staffed`):** the Controller's portrait in the disc, their name, the same effect line, and their Tactician calls if `nicheOf(ctl)==='tactician'`.
- Use `pickControl(kind)` as today.

**Footer (`.pl-foot`):**
- **Left:** the blocker, linked to the slots. Orange with a lock: "2 slots empty: Soldier 4 and Dustfall's pilot". Clicking a name scrolls to and pulses that slot. When ready it reads "Squad ready" (green).
- **Middle:** the summary: "Fuel **{all assets' fuel}** of {have}", which now **adds every asset's fuel** (today it counts only the transport), and "**n** rebels going".
- **Right:** **Auto-fill** (ghost) and **Start mission** (gold primary, disabled until every slot is filled).

**Smoke (`tools/plan-smoke.js`):**
- the window fits 1440×900 with no roster column or checklist;
- the squad counter and seats match the slots, and the empty soldier slots are "need" style with no "Optional" text;
- the transport pilot sits on the transport card;
- adding a starfighter adds Strafing Run, greyed until its pilot is set;
- the Marta gives Supply Drop and Door Gunner;
- clicking an empty slot opens a filtered picker;
- Start is disabled until full;
- starting charges the 160 supplies, and a mission where the drop wasn't called refunds them;
- the fuel total includes support ships;
- Mission Control shows unstaffed or staffed correctly.

## 5. Placeholders in the mock (not for the build)
- Agent names (Ilka Vos, Teodor Kade, Nim Sarro), their stats and cells, Day 31, and Vos's Lead "from a sweep on Akkaro".
- Approach flavour "dead drop · unsigned".
- The Loop popover line.
- Tam Reyes's and Talia Okafor's faces (sprite stand-ins).

## 6. DESIGN_BLOCKERS to add
- **Standby contacts:** do they ever leave if left waiting?
- **Interrogation clock length (3–5 days?)** and how many Leads a burn yields (doc: by usage and cell size).
- **Exposure numbers:** how much Leads, missions and liberation each add; the band thresholds.
- **Agent stat ranges and growth;** the Cover drop while reposting.
- **Disinformation and Counter-Intel Sweep:** costs and durations.
- **Recruitment move:** what the Command Center keeps once recruiting leaves it.
- **Investigator tag:** whether to show "Revolution Level 2" on the locked card.
- **Hangar `SR.shipSheet`:** the pilot column hidden; confirm.
- **Planning assets:** keep the 2-extra-asset cap? What does a spare transport grant (today's Reinforce mode)?

## 7. Stylesheets

### `game/ui/sr-shipfile.css` (new)

```css
/* STAR REBELLION — Space combat unit file: pilot + ship in one window (sr-shipfile.css). Prefix sf-.
   Builds on sr-theme.css and sr-personnel.css (header plate, buttons, popovers, skills). */
.sf-win.sr-window{width:1100px;max-height:none;--accent:var(--sr-rebel);}
.sf-body{display:grid;grid-template-columns:420px minmax(0,1fr) 300px;grid-template-rows:auto 1fr;gap:18px;padding:18px;}
.sf-body>.pf-plate{grid-column:2/4;grid-row:1;position:relative;left:auto;right:auto;bottom:auto;padding:12px 16px;gap:14px;grid-template-columns:auto auto minmax(0,1fr) auto;}
.sf-body>.sf-stagecol{grid-column:1;grid-row:1/3;}
.sf-body>.sf-mid{grid-column:2;grid-row:2;}
.sf-body>.sf-side{grid-column:3;grid-row:2;}
.sf-col{display:flex;flex-direction:column;gap:14px;min-width:0;}
.sf-pilotface{width:56px;height:56px;border-radius:50%;overflow:hidden;flex:none;background:var(--sr-night);box-shadow:0 0 0 var(--sr-line) var(--sr-ink),inset 0 0 0 3px var(--sr-rebel);}
.sf-pilotface img{width:100%;height:auto;margin-top:-6px;transform:scale(1.9);transform-origin:50% 22%;}

/* the stage: the ship top-down with its shield zones drawn round it */
.sf-stage{position:relative;height:600px;border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-xl);overflow:hidden;
  background:radial-gradient(ellipse 55% 42% at 50% 46%,rgba(54,227,242,.10),transparent 70%),radial-gradient(circle at 20% 15%,#1b2152 0,transparent 40%),#080a1f;box-shadow:var(--sr-lift);}
.sf-stage::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.55) 1px,transparent 1.5px),radial-gradient(rgba(255,255,255,.3) 1px,transparent 1.5px);
  background-size:97px 89px,53px 61px;background-position:11px 23px,37px 5px;opacity:.5;}
.sf-stage::after{content:"";position:absolute;left:0;top:0;width:100%;height:10px;background:repeating-linear-gradient(-45deg,var(--sr-rebel) 0 12px,#1b1f4a 12px 24px);opacity:.75;}
.sf-zones{position:absolute;left:50%;top:44px;width:380px;height:380px;transform:translateX(-50%);}
.sf-ship{position:absolute;left:50%;top:87px;width:364px;height:294px;transform:translateX(-50%);filter:drop-shadow(0 10px 0 rgba(7,8,24,.4));}
.sf-zlbl{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:4px 9px;font:800 10px/1 var(--sr-font-ui);letter-spacing:.07em;
  text-transform:uppercase;color:var(--c);background:rgba(8,10,31,.85);border:2px solid var(--c);border-radius:999px;white-space:nowrap;}
.sf-zlbl b{font:400 13px/1 var(--sr-font-display);letter-spacing:0;}
.sf-chip{display:flex;align-items:center;gap:7px;padding:5px 10px 5px 6px;background:rgba(20,24,64,.9);border:2px solid var(--sr-ink);border-radius:999px;
  font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-2);}
.sf-chip b{font:400 15px/1 var(--sr-font-display);color:var(--sr-text);}
.sf-chip .sr-ico{width:14px;height:14px;color:var(--sr-shield);}
/* armour + hull plate across the bottom of the stage */
.sf-plate{position:absolute;left:12px;right:12px;bottom:12px;display:flex;flex-direction:column;gap:9px;padding:12px 14px;
  background:color-mix(in srgb,var(--sr-hull) 94%,transparent);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-float);}
.sf-plate__top{display:flex;align-items:baseline;gap:10px;}
.sf-plate__name{font:400 20px/1 var(--sr-font-display);color:var(--sr-text);}
.sf-plate__cls{font:700 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.sf-dur{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:10px;align-items:center;font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);color:var(--sr-text-2);}
.sf-dur .sr-hp__cells{display:flex;gap:3px;}
.sf-dur .sr-hp__cell{flex:1;height:12px;}
.sf-dur b{font:400 15px/1 var(--sr-font-display);color:var(--sr-text);min-width:52px;text-align:right;}

/* weapons */
.sf-h{display:flex;align-items:center;gap:8px;font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);color:var(--sr-text-2);text-transform:uppercase;letter-spacing:.06em;}
.sf-h .sr-ico{width:16px;height:16px;color:var(--sr-text-3);}
.sf-wpn{display:flex;flex-direction:column;gap:10px;padding:10px 12px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);
  border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel);}
.sf-wpn.is-off{opacity:.6;}
.sf-wpn__art{display:grid;place-items:center;width:46px;height:46px;flex:none;border-radius:var(--sr-r);background:var(--sr-void);border:var(--sr-line) solid var(--sr-ink);box-shadow:inset 0 0 0 3px color-mix(in srgb,var(--c) 55%,transparent);color:var(--c);}
.sf-wpn__art .sr-ico{width:22px;height:22px;}
.sf-wpn__name{display:flex;align-items:center;gap:8px;font:800 var(--sr-fs-md)/1.1 var(--sr-font-ui);color:var(--sr-text);}
.sf-crit{display:grid;grid-template-columns:32px minmax(0,1fr);gap:10px;align-items:center;padding:9px 12px;
  background:repeating-linear-gradient(-45deg,rgba(255,138,31,.12) 0 12px,transparent 12px 24px),var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);
  box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--sr-hazard) 55%,transparent);}
.sf-crit>span{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--sr-hazard);border:2px solid var(--sr-ink);color:var(--sr-ink);}
.sf-crit>span .sr-ico{width:16px;height:16px;}
.sf-crit b{display:block;font:800 var(--sr-fs-sm)/1.1 var(--sr-font-ui);color:var(--sr-hazard);}
.sf-crit em{display:block;margin-top:3px;font-style:normal;font:600 var(--sr-fs-xs)/1.3 var(--sr-font-ui);color:var(--sr-text-2);}
.sf-lock{display:flex;align-items:center;gap:10px;padding:9px 12px;background:linear-gradient(90deg,rgba(255,74,61,.16),var(--sr-night) 70%);border:2px solid var(--sr-rebel);border-radius:var(--sr-r);
  font:700 var(--sr-fs-sm)/1.3 var(--sr-font-ui);color:var(--sr-text);}
.sf-lock .sr-ico{width:18px;height:18px;color:var(--sr-rebel);}
.sf-lock em{margin-left:auto;font-style:normal;font:400 14px/1 var(--sr-font-display);color:var(--sr-rebel);}

/* ===== additions from the review rounds ===== */
/* weapon card: top row (icon, name, type chip, slot), bottom row (stat tiles) */
.sf-wpn__top{display:flex;align-items:center;gap:10px;min-width:0;}
.sf-wpn__name{font:800 14px/1.15 var(--sr-font-ui);color:var(--sr-text);}
.sf-wpn__meta{display:flex;align-items:center;gap:8px;margin-top:6px;}
.sf-slot{font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.sf-type{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px 0 3px;cursor:help;font:800 12px/1 var(--sr-font-ui);color:var(--c);
  background:color-mix(in srgb,var(--c) 16%,var(--sr-void));border:2px solid color-mix(in srgb,var(--c) 55%,var(--sr-ink));border-radius:999px;}
.sf-type>span{display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:var(--c);color:var(--sr-ink);}
.sf-type>span .sr-ico{width:10px;height:10px;}
.sf-tiles{display:grid;grid-template-columns:repeat(var(--n,2),minmax(0,1fr));gap:6px;}
.sf-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:8px 4px;background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:var(--sr-r);}
.sf-tile b{font:400 20px/1 var(--sr-font-display);color:var(--c,var(--sr-text));text-shadow:0 2px 0 var(--sr-ink);}
.sf-tile>span{font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.sf-pips{display:flex;gap:4px;}
.sf-pips i{width:11px;height:11px;border-radius:3px;border:2px solid var(--sr-ink);background:var(--sr-gold);}
.sf-pips i.is-spent{background:var(--sr-night);}
/* "Modifiers" popover rows (to-hit breakdown) */
.sf-mods{display:flex;flex-direction:column;gap:6px;margin-top:10px;}
.sf-mod{display:flex;align-items:center;gap:8px;font:700 12px/1.3 var(--sr-font-ui);color:var(--sr-text-2);}
.sf-mod i{width:8px;height:8px;flex:none;background:var(--c);border:2px solid var(--sr-ink);border-radius:2px;transform:rotate(45deg);}
.sf-mod b{margin-left:auto;font:800 13px/1 var(--sr-font-ui);color:var(--c);}
.sf-mod--total{padding-top:7px;border-top:2px solid var(--sr-seam);font-weight:800;color:var(--sr-text);}
/* stage plate chips (Max speed opens the move set) */
.sf-chiprow{display:flex;gap:6px;}
.sf-chip{display:flex;align-items:center;gap:7px;padding:5px 10px 5px 6px;background:rgba(20,24,64,.9);border:2px solid var(--sr-ink);border-radius:999px;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-2);}
.sf-chip b{font:400 15px/1 var(--sr-font-display);color:var(--sr-text);}
.sf-chip .sr-ico{width:14px;height:14px;color:var(--sr-shield);}
.sf-plate .pf-pop{top:auto;bottom:-8px;}
/* move set: speed rows × maneuver columns */
.sf-dial{display:grid;grid-template-columns:22px repeat(6,30px);gap:4px;margin-top:10px;align-items:center;}
.sf-dial__h{font:800 8px/1 var(--sr-font-ui);letter-spacing:.04em;text-transform:uppercase;color:var(--sr-text-3);text-align:center;}
.sf-dial__v{font:400 14px/1 var(--sr-font-display);color:var(--sr-text-2);text-align:center;}
.sf-dial__c{display:grid;place-items:center;height:26px;border-radius:6px;background:var(--sr-void);border:2px solid #1f2550;font:800 15px/1 var(--sr-font-ui);}
.sf-dial__c.is-ship{background:rgba(54,227,242,.14);border-color:var(--sr-shield);color:var(--sr-shield);}
.sf-dial__c.is-pilot{background:rgba(180,124,255,.18);border-color:var(--sr-psi);color:var(--sr-psi);}
.sf-dial__c.is-off::after{content:"";width:4px;height:4px;border-radius:50%;background:#2c3366;}

```

### `game/ui/sr-intel.css` (new)

```css
/* STAR REBELLION — Intelligence tab: the network (sr-intel.css). Prefix in-. Builds on sr-theme.css. */
.in-stage{background:radial-gradient(ellipse 50% 45% at 40% 52%,rgba(255,74,61,.07),transparent 70%),linear-gradient(180deg,#0c0e2a 0%,#090b22 100%);}
.in-stage::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(122,140,220,.16) 1px,transparent 1.4px);background-size:26px 26px;}

/* exposure panel (top-left) */
.in-exp{position:absolute;left:24px;top:112px;width:318px;padding:12px 14px;background:color-mix(in srgb,var(--sr-hull) 94%,transparent);border:var(--sr-line) solid var(--sr-ink);
  border-radius:var(--sr-r-lg);box-shadow:var(--sr-float);cursor:pointer;text-align:left;color:var(--sr-text);font:inherit;}
.in-exp.is-sel{box-shadow:var(--sr-float),0 0 0 3px var(--sr-gold);}
.in-exp__top{display:flex;align-items:baseline;gap:8px;}
.in-exp__top b{font:400 18px/1 var(--sr-font-display);}
.in-exp__top em{margin-left:auto;font-style:normal;font:800 11px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-hazard);}
.in-bands{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;margin-top:10px;}
.in-bands i{height:12px;border:2px solid var(--sr-ink);border-radius:3px;background:var(--sr-night);}
.in-bands i.is-on{background:var(--c);}
.in-bands__lbl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;margin-top:5px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--sr-text-3);text-align:center;}
.in-bands__lbl span.is-now{color:var(--sr-hazard);}
.in-exp p{margin:9px 0 0;font:600 var(--sr-fs-xs)/1.4 var(--sr-font-ui);color:var(--sr-text-2);}

/* interrogation alert (top centre) */
.in-alert{position:absolute;left:50%;top:112px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:8px 8px 8px 12px;
  background:repeating-linear-gradient(-45deg,rgba(255,138,31,.16) 0 12px,rgba(255,138,31,.06) 12px 24px),var(--sr-hull);border:var(--sr-line) solid var(--sr-hazard);border-radius:var(--sr-r-lg);box-shadow:var(--sr-float);}
.in-alert .sr-ico{width:20px;height:20px;color:var(--sr-hazard);}
.in-alert span{font:700 var(--sr-fs-sm)/1.3 var(--sr-font-ui);color:var(--sr-text);}
.in-alert b{color:var(--sr-hazard);}

/* the graph */
.in-graph{position:absolute;left:0;top:0;width:100%;height:100%;}
.in-node{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;padding:0;cursor:pointer;font:inherit;color:var(--sr-text);}
.in-node__disc{position:relative;display:grid;place-items:center;border-radius:50%;background:var(--sr-hull);border:var(--sr-line) solid var(--sr-ink);
  font:400 15px/1 var(--sr-font-display);color:var(--sr-text);}
.in-node--hub .in-node__disc{width:96px;height:96px;background:radial-gradient(circle at 50% 35%,#2b3170,#151a44);box-shadow:0 0 0 4px var(--sr-rebel),0 0 0 7px var(--sr-ink),0 0 30px rgba(255,74,61,.35);}
.in-node--hub .in-node__disc .sr-ico{width:40px;height:40px;color:var(--sr-rebel);}
.in-node--agent .in-node__disc{width:68px;height:68px;box-shadow:inset 0 0 0 4px var(--sr-rebel),0 4px 0 var(--sr-ink);}
.in-node--src .in-node__disc{width:52px;height:52px;font-size:13px;box-shadow:inset 0 0 0 3px var(--sr-shield),0 3px 0 var(--sr-ink);}
.in-node--empty .in-node__disc{width:46px;height:46px;background:transparent;border:2px dashed var(--sr-seam);box-shadow:none;color:var(--sr-seam);}
.in-node.is-sel .in-node__disc{outline:3px solid var(--sr-gold);outline-offset:4px;}
.in-node.is-burned .in-node__disc{filter:grayscale(1) brightness(.75);box-shadow:inset 0 0 0 3px #5a5a6a,0 3px 0 var(--sr-ink);}
.in-node__name{font:800 var(--sr-fs-sm)/1.1 var(--sr-font-ui);color:var(--sr-text);text-shadow:0 2px 0 var(--sr-ink);white-space:nowrap;}
.in-node__sub{display:flex;align-items:center;gap:5px;margin-top:-2px;font:700 11px/1.1 var(--sr-font-ui);color:var(--sr-text-3);white-space:nowrap;}
.in-node__sub i{width:9px;height:9px;border-radius:50%;background:var(--pc,#c99a5a);border:2px solid var(--sr-ink);}
.in-badge{position:absolute;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:2px solid var(--sr-ink);color:var(--sr-ink);background:var(--c);}
.in-badge .sr-ico{width:13px;height:13px;}
.in-badge--tr{right:-8px;top:-6px;} .in-badge--br{right:-8px;bottom:-6px;}
.in-risk{position:absolute;inset:-7px;border-radius:50%;background:conic-gradient(var(--c) calc(var(--r) * 1%),transparent 0);-webkit-mask:radial-gradient(circle,transparent 58%,#000 60%);mask:radial-gradient(circle,transparent 58%,#000 60%);}
.in-clock{position:absolute;left:50%;top:calc(100% + 26px);transform:translateX(-50%);display:flex;align-items:center;gap:5px;padding:3px 8px;font:800 10px/1 var(--sr-font-ui);letter-spacing:.06em;text-transform:uppercase;
  color:var(--sr-ink);background:var(--sr-hazard);border:2px solid var(--sr-ink);border-radius:999px;white-space:nowrap;}

/* rail */
.in-rail{overflow:hidden;padding-top:14px;padding-bottom:14px;}
.in-who{display:flex;align-items:center;gap:12px;}
.in-who__disc{display:grid;place-items:center;width:54px;height:54px;flex:none;border-radius:50%;background:var(--sr-hull);border:var(--sr-line) solid var(--sr-ink);font:400 17px/1 var(--sr-font-display);}
.in-kicker{font:800 10px/1 var(--sr-font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--c,var(--sr-text-3));}
.in-name{margin-top:4px;font:400 19px/1.05 var(--sr-font-display);color:var(--sr-text);}
.in-sub{margin-top:4px;font:700 var(--sr-fs-xs)/1.25 var(--sr-font-ui);color:var(--sr-text-3);}
.in-h{display:flex;align-items:center;gap:7px;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-2);}
.in-h .sr-ico{width:14px;height:14px;color:var(--sr-text-3);}
.in-h b{margin-left:auto;letter-spacing:0;color:var(--sr-text-3);}
.in-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}
.in-stat{padding:8px 10px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);}
.in-stat__top{display:flex;align-items:baseline;justify-content:space-between;font:800 11px/1 var(--sr-font-ui);color:var(--sr-text-2);}
.in-stat__top b{font:400 18px/1 var(--sr-font-display);color:var(--c,var(--sr-text));}
.in-stat p{margin:5px 0 0;font:700 11px/1.3 var(--sr-font-ui);color:var(--sr-text-3);}
.in-ops{display:flex;flex-direction:column;gap:5px;}
.in-op{display:grid;grid-template-columns:26px minmax(0,1fr);gap:9px;align-items:center;padding:7px 9px;text-align:left;cursor:pointer;color:var(--sr-text);
  background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);box-shadow:var(--sr-bevel);font:inherit;}
.in-op:hover{border-color:var(--sr-gold);}
.in-op[disabled]{opacity:.5;cursor:not-allowed;}
.in-op__ico{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;background:var(--sr-void);color:var(--c,var(--sr-text-2));border:2px solid var(--sr-ink);}
.in-op__ico .sr-ico{width:14px;height:14px;}
.in-op b{display:block;font:800 13px/1.1 var(--sr-font-ui);}
.in-op small{display:block;margin-top:2px;font:600 11px/1.3 var(--sr-font-ui);color:var(--sr-text-3);}
.in-op--danger .in-op__ico{color:var(--sr-hazard);}
.in-meter{position:relative;height:14px;background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:999px;overflow:visible;}
.in-meter>i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--v) * 1%);background:var(--c);border-radius:999px;}
.in-row{display:flex;align-items:center;gap:8px;font:700 12px/1.3 var(--sr-font-ui);color:var(--sr-text-2);}
.in-row i{width:8px;height:8px;flex:none;background:var(--c);border:2px solid var(--sr-ink);border-radius:2px;transform:rotate(45deg);}
.in-row b{color:var(--c);font-weight:800;}
.in-row em{margin-left:auto;font-style:normal;color:var(--sr-text-3);}
.in-card{display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:var(--sr-night);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);}
.in-band{display:grid;grid-template-columns:62px minmax(0,1fr);gap:8px;align-items:start;padding:7px 9px;border-radius:var(--sr-r);border:2px solid transparent;font:600 11px/1.35 var(--sr-font-ui);color:var(--sr-text-3);}
.in-band b{font:800 11px/1.3 var(--sr-font-ui);letter-spacing:.05em;text-transform:uppercase;color:var(--c);}
.in-band.is-now{background:color-mix(in srgb,var(--sr-hazard) 12%,var(--sr-plate));border-color:var(--sr-hazard);color:var(--sr-text-2);}

/* ===== additions from the review rounds ===== */
.in-node--agent{gap:17px;}
.in-cap{position:absolute;left:50%;bottom:-11px;transform:translateX(-50%);padding:2px 7px;font:400 12px/1 var(--sr-font-display);color:var(--sr-ink);background:var(--sr-text);
  border:2px solid var(--sr-ink);border-radius:999px;white-space:nowrap;}                 /* cell capacity on the Agent icon */
.in-railtitle{display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:3px solid var(--sr-seam);font:400 22px/1 var(--sr-font-display);color:var(--sr-text);}
.in-railtitle .sr-ico{width:22px;height:22px;color:var(--sr-rebel);}
.in-wheels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.in-wheel{display:flex;flex-direction:column;align-items:center;gap:7px;padding:10px 8px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);}
.in-wheel__ring{position:relative;display:grid;place-items:center;width:74px;height:74px;border-radius:50%;
  background:conic-gradient(var(--c) calc(var(--v) * 1%),color-mix(in srgb,var(--c) 18%,var(--sr-night)) 0);box-shadow:0 0 0 3px var(--sr-ink);}
.in-wheel__ring::after{content:"";position:absolute;inset:9px;border-radius:50%;background:var(--sr-hull);box-shadow:0 0 0 2px var(--sr-ink);}
.in-wheel__ring>span{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:2px;}
.in-wheel__ring small{font:800 8px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.in-wheel__ring b{font:400 20px/1 var(--sr-font-display);color:var(--c);text-shadow:0 2px 0 var(--sr-ink);}
.in-wheel__lbl{display:flex;align-items:center;gap:5px;font:800 11px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-2);}
.in-wheel__lbl .sr-ico{width:13px;height:13px;color:var(--c);}
/* interrogation window */
.in-int{width:min(660px,100%);--accent:var(--sr-hazard);}
.in-clockpips{display:flex;gap:4px;}
.in-clockpips i{width:26px;height:12px;border-radius:4px;border:2px solid var(--sr-ink);background:var(--sr-night);}
.in-clockpips i.is-on{background:var(--sr-hazard);}
.in-leadchip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px 5px 7px;background:rgba(255,74,61,.12);border:2px solid var(--sr-c-bad);border-radius:999px;font:800 12px/1 var(--sr-font-ui);color:var(--sr-text);}
.in-leadchip .sr-ico{width:13px;height:13px;color:var(--sr-c-bad);}
.in-responses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:14px 16px 16px;}

```

### `game/ui/sr-plan.css` (new)

```css
/* STAR REBELLION — Mission planning (sr-plan.css). Prefix pl-. Needs sr-theme.css, the .it-art/.kf art slots (sr-report.css / sr-kit.css) and the popovers from sr-personnel.css. */
.pl-body{display:flex;flex-direction:column;gap:16px;padding:16px 18px 18px;}
.pl-h{display:flex;align-items:center;gap:8px;font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--sr-text-2);}
.pl-h .sr-ico{width:16px;height:16px;color:var(--sr-text-3);}
.pl-h .pl-h__end{margin-left:auto;display:flex;gap:8px;align-items:center;letter-spacing:0;text-transform:none;}
.pl-brief{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;padding:14px 16px;border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);
  background:linear-gradient(90deg,rgba(201,154,90,.14),var(--sr-night) 55%);}
.pl-brief__left{display:flex;gap:16px;align-items:flex-start;min-width:0;}
.pl-loc{display:flex;align-items:flex-end;gap:8px;flex:none;}
.pl-loc__it{display:flex;flex-direction:column;align-items:center;gap:5px;}
.pl-loc__it svg{width:34px;height:34px;}
.pl-loc__lbl{font:800 10px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text);}
.pl-loc__dots{width:18px;margin-bottom:24px;border-top:3px dotted rgba(255,255,255,.5);}
.pl-desc{margin:0;font:600 var(--sr-fs-sm)/1.45 var(--sr-font-ui);color:var(--sr-text-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.pl-meta{display:flex;align-items:center;gap:12px;margin-top:8px;font:700 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.pl-meta b{color:var(--sr-text-2);}
.pl-facts{display:flex;gap:8px;align-items:stretch;}
.pl-fact{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:88px;padding:8px 10px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);}
.pl-fact b{font:400 16px/1 var(--sr-font-display);color:var(--c,var(--sr-text));}
.pl-fact span{font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.pl-pips{display:flex;gap:3px;}
.pl-pips i{width:8px;height:13px;border-radius:2px;background:rgba(255,255,255,.12);}
.pl-pips i.is-on{background:var(--c);}
.pl-rew{display:flex;flex-direction:column;justify-content:center;gap:6px;padding:8px 12px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);}
.pl-rew__row{display:flex;gap:10px;align-items:center;font:800 15px/1 var(--sr-font-ui);}
.pl-rew__row span{display:inline-flex;align-items:center;gap:5px;color:var(--c);}
.pl-rew__row .sr-ico{width:15px;height:15px;}
.pl-card__x{position:absolute;right:7px;top:7px;display:grid;place-items:center;width:24px;height:24px;border-radius:7px;background:var(--sr-void);border:2px solid var(--sr-ink);color:var(--sr-text-3);}
.pl-card__x .sr-ico{width:12px;height:12px;}
.pl-name{font:800 var(--sr-fs-md)/1.1 var(--sr-font-ui);}
.pl-sub{font:700 var(--sr-fs-xs)/1.2 var(--sr-font-ui);color:var(--sr-text-3);}
.pl-kit{display:flex;gap:4px;margin-top:4px;}
.pl-kit .it-art{width:46px;height:29px;background-color:var(--sr-void);border:2px solid var(--sr-ink);border-radius:6px;}
.pl-shipstats{display:flex;gap:6px;margin-top:4px;}
.pl-shipstats span{display:inline-flex;align-items:center;gap:4px;padding:3px 7px;font:800 11px/1 var(--sr-font-ui);color:var(--c,var(--sr-text-2));background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:var(--sr-r-sm);}
.pl-shipstats .sr-ico{width:12px;height:12px;}
.pl-foot{display:flex;align-items:center;gap:16px;padding:12px 18px;border-top:var(--sr-line) solid var(--sr-ink);background:var(--sr-night);}
.pl-ready{display:flex;align-items:center;gap:8px;font:800 var(--sr-fs-sm)/1.2 var(--sr-font-ui);color:var(--c);}
.pl-ready .sr-ico{width:18px;height:18px;}
.pl-ready u{text-decoration:none;border-bottom:2px dotted currentColor;cursor:pointer;}
.pl-sum{display:flex;gap:14px;font:700 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.pl-sum span{display:inline-flex;align-items:center;gap:5px;}
.pl-sum b{color:var(--sr-text);}
.pl-sum .sr-ico{width:13px;height:13px;}
.pl-pick{position:absolute;z-index:40;width:300px;padding:12px;background:var(--sr-hull);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);
  box-shadow:var(--sr-float),0 0 0 2px var(--sr-gold);}
.pl-pick__t{display:flex;align-items:center;gap:8px;margin-bottom:8px;font:400 15px/1 var(--sr-font-display);}
.pl-pick__t span{margin-left:auto;font:800 10px/1 var(--sr-font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--sr-text-3);}
.pl-opt{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;padding:7px 8px;margin-top:6px;text-align:left;color:var(--sr-text);font:inherit;cursor:pointer;
  background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);}
.pl-opt:hover{border-color:var(--sr-gold);}
.pl-opt .kf{width:36px;height:36px;}
.pl-opt b{display:block;font:800 13px/1.1 var(--sr-font-ui);}
.pl-opt small{display:block;margin-top:2px;font:700 11px/1.2 var(--sr-font-ui);color:var(--sr-text-3);}
.pl-opt em{font-style:normal;font:800 10px/1 var(--sr-font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--c,var(--sr-text-3));}
.pl-opt[disabled]{opacity:.5;cursor:not-allowed;}
.pl-sold{position:relative;width:160px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 10px 10px;text-align:center;color:var(--sr-text);cursor:pointer;font:inherit;
  background:linear-gradient(180deg,#252b62,var(--sr-plate) 60%);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel),var(--sr-lift);}
.pl-sold .kf{width:60px;height:60px;box-shadow:0 0 0 3px var(--sr-ink),0 0 0 6px var(--sr-rebel);}
.pl-sold .pl-kit .it-art{width:40px;height:25px;}
.pl-sold--empty{background:transparent;border:2px dashed var(--sr-seam);box-shadow:none;justify-content:center;min-height:172px;}
.pl-sold--empty .pl-plus{display:grid;place-items:center;width:60px;height:60px;border-radius:50%;border:2px dashed var(--sr-seam);font:400 26px/1 var(--sr-font-display);color:var(--sr-seam);}
.pl-req{display:inline-flex;align-items:center;gap:6px;font:700 12px/1 var(--sr-font-ui);color:var(--sr-text-3);letter-spacing:0;text-transform:none;}
.pl-req b{color:var(--sr-text);}
.pl-assets{display:flex;gap:12px;align-items:stretch;}
.pl-asset{position:relative;width:300px;display:flex;flex-direction:column;gap:8px;padding:12px;color:var(--sr-text);font:inherit;text-align:left;
  background:linear-gradient(180deg,#232a5e,var(--sr-plate) 65%);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel),var(--sr-lift);}
.pl-asset--primary{border-color:var(--sr-shield);}
.pl-asset__kick{font:800 9px/1 var(--sr-font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--c,var(--sr-text-3));}
.pl-asset__art{position:relative;display:grid;place-items:center;height:96px;background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:var(--sr-r);}
.pl-asset__art .it-art{width:150px;height:94px;}
.pl-pilot{position:absolute;left:8px;bottom:-14px;display:flex;align-items:center;gap:7px;padding:3px 10px 3px 3px;background:var(--sr-hull);border:2px solid var(--sr-ink);border-radius:999px;box-shadow:var(--sr-lift);cursor:pointer;}
.pl-pilot .kf{width:30px;height:30px;box-shadow:0 0 0 2px var(--sr-gold);}
.pl-pilot b{display:block;font:800 12px/1.05 var(--sr-font-ui);color:var(--sr-text);}
.pl-pilot small{display:block;font:700 9px/1.1 var(--sr-font-ui);letter-spacing:.05em;text-transform:uppercase;color:var(--sr-text-3);}
.pl-pilot--empty{border:2px dashed var(--sr-hazard);background:#2a1d1a;color:var(--sr-hazard);padding:6px 12px;font:800 12px/1 var(--sr-font-ui);}
.pl-asset__name{margin-top:12px;font:800 var(--sr-fs-md)/1.1 var(--sr-font-ui);}
.pl-asset__add{width:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:2px dashed var(--sr-seam);border-radius:var(--sr-r-lg);color:var(--sr-text-3);
  font:800 var(--sr-fs-sm)/1.2 var(--sr-font-ui);background:transparent;cursor:pointer;}
.pl-asset__add span{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;border:2px dashed var(--sr-seam);font:400 24px/1 var(--sr-font-display);color:var(--sr-seam);}
.pl-abil{display:flex;flex-wrap:wrap;gap:8px;}
.pl-ab{display:inline-flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:999px;font:800 13px/1 var(--sr-font-ui);color:var(--sr-text);}
.pl-ab>span{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--c);color:var(--sr-ink);border:2px solid var(--sr-ink);}
.pl-ab>span .sr-ico{width:14px;height:14px;}
.pl-ab small{font:700 11px/1 var(--sr-font-ui);color:var(--sr-text-3);}
.pl-ab.is-off{opacity:.55;}
.pl-ab.is-off>span{background:var(--sr-night);color:var(--sr-text-3);}
/* ===== from the review rounds ===== */
.pl-card__x{position:absolute;right:7px;top:7px;display:grid;place-items:center;width:24px;height:24px;border-radius:7px;background:var(--sr-void);border:2px solid var(--sr-ink);color:var(--sr-text-3);}
.pl-card__x .sr-ico{width:12px;height:12px;}
.pl-sold__face{position:relative;}
.pl-lvl{position:absolute;right:-8px;bottom:-6px;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;
  background:conic-gradient(var(--sr-psi) calc(var(--xp) * 1%),#26204a 0);box-shadow:0 0 0 2px var(--sr-ink);}
.pl-lvl>b{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--sr-night);box-shadow:0 0 0 2px var(--sr-ink);font:400 11px/1 var(--sr-font-display);color:var(--sr-psi);}
.pl-sold--need{border-color:var(--sr-hazard);background:rgba(255,138,31,.06);}
.pl-sold--need .pl-plus{border-color:var(--sr-hazard);color:var(--sr-hazard);}
.pl-sold--need .pl-sub{color:var(--sr-hazard);font-weight:800;}
.pl-sold__slot{font:700 10px/1 var(--sr-font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--sr-text-3);}
/* squad size counter in the Squad header */
.pl-count{display:inline-flex;align-items:center;gap:12px;padding:6px 12px;background:var(--sr-night);border:var(--sr-line) solid var(--sr-hazard);border-radius:var(--sr-r);}
.pl-count.is-full{border-color:var(--sr-ink);}
.pl-count b{display:block;font:400 22px/1 var(--sr-font-display);color:var(--sr-text);letter-spacing:0;}
.pl-count.is-full b{color:var(--sr-go);}
.pl-count small{display:block;margin-top:3px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.pl-seats{display:flex;gap:4px;}
.pl-seats i{width:18px;height:22px;border-radius:5px;border:2px solid var(--sr-ink);background:var(--sr-rebel);}
.pl-seats i.is-free{border:2px dashed var(--sr-hazard);background:transparent;}
/* fire support + base support row */
.pl-supportrow{display:grid;grid-template-columns:minmax(0,1fr) 520px;gap:18px;align-items:start;}
.pl-base{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;background:var(--sr-night);border:2px dashed var(--sr-seam);border-radius:var(--sr-r-lg);}
.pl-base.is-staffed{border:var(--sr-line) solid var(--sr-ink);background:var(--sr-plate);}
.pl-base__disc{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:2px dashed var(--sr-seam);color:var(--sr-text-3);}
.pl-base__disc .sr-ico{width:18px;height:18px;}
.pl-base b{display:flex;align-items:center;gap:8px;font:800 14px/1.1 var(--sr-font-ui);color:var(--sr-text);}
.pl-base b small{font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.pl-base p{margin:4px 0 0;font:600 12px/1.35 var(--sr-font-ui);color:var(--sr-text-3);}
.pl-base p em{font-style:normal;font-weight:800;color:var(--sr-shield);}
.pl-ab small.pl-ab__cost{display:inline-flex;align-items:center;gap:3px;color:var(--sr-res-supplies);}
.pl-ab small.pl-ab__cost .sr-ico{width:12px;height:12px;}

```

### Append to `game/ui/sr-comm.css`

```css

/* ===== Approach window (potential source) — additions to sr-comm.css ===== */
.cm-ava--potential{box-shadow:inset 0 0 0 3px var(--sr-gold);} .cm-ava--potential i{background:var(--sr-gold);}
.cm-kicker{margin-bottom:5px;font:800 10px/1 var(--sr-font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--c,var(--sr-gold));}
.cm-mini{display:flex;align-items:center;gap:8px;}
.cm-mini>span{width:74px;font:800 10px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.cm-mini>i{position:relative;width:90px;height:10px;background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:999px;overflow:hidden;}
.cm-mini>i::after{content:"";position:absolute;left:0;top:0;bottom:0;width:calc(var(--v) * 1%);background:var(--c);border-radius:999px;}
.cm-mini>b{min-width:18px;font:800 12px/1 var(--sr-font-ui);color:var(--c);}
.cm-cap{display:flex;align-items:center;gap:10px;margin:14px 16px 0;padding:10px 12px;background:var(--sr-night);border:2px solid var(--sr-ink);border-radius:var(--sr-r);}
.cm-cap.is-full{border-color:var(--sr-hazard);}
.cm-cap>.sr-ico{width:18px;height:18px;color:var(--sr-text-3);}
.cm-cap__lbl{font:800 12px/1 var(--sr-font-ui);color:var(--sr-text-2);}
.cm-cap__full{font:800 10px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-hazard);}
.cm-cap__pips{display:flex;gap:5px;margin-left:auto;}
.cm-cap__pips i{width:22px;height:12px;border-radius:4px;background:var(--sr-rebel);border:2px solid var(--sr-ink);}
.cm-cap__pips i.is-free{background:transparent;border:2px dashed var(--sr-seam);}
.cm-cap>b{font:400 15px/1 var(--sr-font-display);color:var(--sr-text);}
.cm-choices{display:flex;flex-direction:column;gap:10px;margin:14px 16px 16px;}
.cm-choice{display:grid;grid-template-columns:28px minmax(0,1fr);gap:4px 12px;align-items:start;width:100%;padding:12px 14px;text-align:left;cursor:pointer;color:var(--sr-text);font:inherit;
  background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel),var(--sr-lift);}
.cm-choice>.sr-kbd{grid-row:1/3;margin-top:1px;}
.cm-choice__t{font:800 15px/1.2 var(--sr-font-ui);}
.cm-choice__rows{display:flex;flex-direction:column;gap:4px;}
.cm-choice.is-primary{border-color:var(--sr-gold);background:color-mix(in srgb,var(--sr-gold) 10%,var(--sr-plate));}
.cm-choice[disabled]{opacity:.55;cursor:not-allowed;}
.cm-choice__why{display:flex;align-items:center;gap:6px;font:700 12px/1.3 var(--sr-font-ui);color:var(--sr-hazard);}
.cm-choice__why .sr-ico{width:13px;height:13px;}
.cm-drow{display:flex;align-items:center;gap:7px;font:700 12px/1.25 var(--sr-font-ui);color:var(--sr-text-3);}
.cm-drow i{width:8px;height:8px;flex:none;background:var(--c);border:2px solid var(--sr-ink);border-radius:2px;transform:rotate(45deg);box-shadow:0 0 6px var(--c);}
.cm-drow b{font:800 13px/1 var(--sr-font-ui);color:var(--c);}

```
