# Screens handoff: Mission report · Personnel file · Missions tab · Comm burst

**For:** Claude Code in `DoofWiz/star-rebellion`.
**Branch from `origin/Specialties`**, or from `main` once Specialties has been merged. The personnel file depends on Support specialties, niches, the paper doll and the Head/Body/Back slots, which live on that branch.
**Save as:** `docs/ui/SCREENS-HANDOFF.md`, with the four stylesheets in §7 as `game/ui/sr-report.css`, `sr-personnel.css`, `sr-briefing.css` and `sr-comm.css`. Link them after `sr-theme.css` (and after `sr-kit.css` if the Arsenal work has landed).
**Source of truth:** the designer's reviewed canvas, "Star Rebellion — Mission Complete". Everything needed from it is written down here; you don't need to open it.

Follow `CLAUDE.md`: log anything that conflicts or needs a system that doesn't exist in `docs/DESIGN_BLOCKERS.md` (the entries to add are in §6), add the smoke tests listed per screen, and run every `tools/*-smoke.js` before merging. Build in this order and stop for the designer after each screen: **1 Mission report → 2 Personnel file → 3 Comm burst → 4 Missions tab** (the biggest).

---

## 0. Rules that apply to all four screens

1. **The bottom command bar (`sr-cmdbar`) is for combat only.** Out of combat, a screen's information and buttons sit with what the player is looking at or clicking: on the selected card, in its dossier or briefing, or in its window footer. **Advance day** stays bottom-right as a lone gold button (`.bf-go` wrapper, no bar, no count line). The day is already in the top bar.
   - **This amends `docs/ui/MARKET-ARSENAL-HANDOFF.md`.**
     - Black Market: **Buy / Buy all** move onto the selected lot.
     - Arsenal kit: **Give to… / Sell** move into the dossier.
     - Arsenal ships and vehicles: **Fit / Refit / Assign** move into the dossier.
     - The stats row that was in the command bar's "who" moves onto the selected lot, under its name.
     - Whatever has been built already gets the same change.
2. **Style-guide colours, strictly:**
   - gold means *do this*: the primary button, selection, coach;
   - rebel red means *ours*;
   - Hegemony blue means *theirs*;
   - hazard orange means *wounded, warnings, unmet*;
   - psi purple means *XP, levels, cultivation*;
   - shield cyan means *intel, info, holograms*;
   - the Revolution uses the hub's **ember** colours, and liberation uses the rebel-red `.gx-wheel`;
   - resources use `--sr-res-*`.
3. **No "default AI" chrome:** no pill tags for location or state, no left-border cards, no long right-aligned meta that wraps. State is shown with icons, badges on portraits, small caps labels and diamond markers (`.rp-drow` / `.pf-fx`).
4. **Art:** use `SR_ART.item(id)` in `.it-art`, `portraitURL(p)` in `.kf`, and `figureURL(p)` for the paper doll (re-rendered larger, see §2). Planets use `SR_ART.planet` with `WORLD_LOOK[id]` (colour, texture, region fills).
5. **Copy the designer wrote stays verbatim.** Strings marked *placeholder* are the designer's to replace; keep them in one table per screen.
6. **Phone (≤ 900px container):** each stylesheet carries its own `@container sr-app` block. Windows go full-screen, columns stack, and popovers drop below their button.

---

## 1. Mission report window (`winMode==='reward'`, `base.js`)

**Window:** `sr-window rp-win` (880px), head "Mission Complete" / "Mission Failed" plus close. A failed mission adds `.rp-win--fail`.

**Hero (`.rp-hero`):** a location skyline (inline SVG mesas over a dusk gradient; the fail version is darker red), then from top to bottom:
- **The location block (`.rp-loc`)**, replacing the purple tag:
  - a 36px planet drawn with `SR_ART.planet` in the world's `WORLD_LOOK` colour and texture, with the world name under it in small caps;
  - a dotted connector;
  - a red map pin with the **region** name under it (e.g. BRAKKA ··· DUSTFALL). Missions with no region show the planet only.
- **Title** (`sr-brief__title`, 44px).
- **On wins only:** a green `.rp-objpill` reading "All N objectives". There is **no field-time or crew-count line**.
- **Stamp:** "Secured" (`sr-stamp--action`) or "Mission failed" (`sr-stamp--bad`).
- **Nothing mission-specific in the hero**: no prize art.

**Body (`.rp-body`, 2 columns):**
- **Left column:** Resources, then Loot, then The revolution. On fail it's Objectives, then Recovered, then the "still on the board" note.
- **Right column:** Crew.

**Resources (`.rp-res`):** one tile per resource actually gained, in a row of up to four: Credits, Supplies, Materials, Fuel, each in its `--sr-res-*` colour. A tile has an icon and label, the merged total (e.g. **1,060**), then `.rp-drows` diamond rows breaking it down (**+500 pay**, **+560 found**). Rows only appear for sources that are non-zero. Tiles for resources not gained don't render. Heading: "Resources" ("Recovered" on fail).

**Loot (`.rp-loot`):** every item, ship, vehicle, bot or hacked unit gained, as tiles with art, name and `×N`.
- Ships, vehicles and bots get `.is-asset` with a "Ship" / "Vehicle" / "Bot" badge and come first.
- Hegemony items get `.is-foe`.
- 4 per row (3 on phone), **two rows max**. The last cell becomes `.rp-loot__more` "+N more · in the Arsenal".
- Heading: "Loot" plus a total count on the right.
- The FT-4 Cross from *Steal the Cross* is just the first loot tile; there is no special prize card.

**Crew (`.rp-mate` rows):**
- `portraitURL` in `.rp-mate__ava`; name plus "Soldier · Lv 2";
- an XP bar showing **the old fill plus the gain growing in**; a level-up turns the bar gold and pops a `.rp-lvl` "Level 3" badge;
- on the right, "+31% XP" with "Lv 2 · 71%" under it.
- **Injured:** an orange `.rp-mate__badge` with the `patch` icon on the portrait, and "INJURED" (`.rp-mate__state`, `--c:var(--sr-c-warn)`) beside the role. **No recovery time.**
- **Lost:** a grey skull badge, "LOST", a struck-through name and a striped row (`.is-lost`). Lost rebels have no XP bar.

**The revolution (`.rp-rev`):**
- **Revolution progress:** an ember `.rp-revring` (flame plus level numeral, filled to the new score), an ember bar from old to new, "+4.7" in ember, "38 → 42.7 of 100 to Level II", then ember diamond rows for the breakdown: "+1.2 mission", "+3 first operation in Brakka", "+0.5 liberation".
- **Liberation (if the mission has a region):** a `.gx-wheel` with the flame at the new %, a rebel-red bar from old to new, and "0% → 10%". Add "(capped)" when capped.
- Not shown on fail. In its place: a dashed `.rp-next` card, "**{Mission}** stays on the Mission Board. Regroup and try again."

**Failed objectives:** the full list. Done ones use `sr-obj is-done`; missed ones use `.rp-obj-fail` (red mark with `clear` icon). The heading count is red, e.g. "1 / 3".

**Footer:** only **Continue** (primary). No note text.

**Motion:** sections rise in with a stagger (`--d`), bars grow, tiles pop and the stamp lands last. Respect reduced motion.

**Data the window needs.** All of this is additive; the existing `buildReport` / `queueReport` path stays.
- `got` currently mixes strings and HTML. Replace it with a structured report:
  - `res: {c:{pay,found}, s:{pay,found}, m:{…}, f:{…}}`: fill `found` from `r.loot` and `pay` from `applyRew(m.rew)` and `m.bonus`.
  - `loot: [{id|type, name, n, kind:'item'|'ship'|'vehicle'|'bot'|'unit', foe:bool}]`.
- `pinfo` gains `lvl0`, `xp0`, `lvl1` and `xp1` (read before and after `gainXp`).
- `missionCredit(m)` returns `renown0`, `renown1` and a `parts` breakdown (`mission`, `first`/`second`, `lib`, `libFull`), as well as `gain`.

**Smoke (`tools/report-smoke.js`):**
- a win with loot and pay shows merged totals and two diamond rows;
- a zero resource has no tile;
- 9 loot entries show 7 tiles plus "+2 more", with the ship first;
- an injured rebel has a badge and no days text;
- a level-up shows the gold bar and badge;
- the revolution bar uses ember and liberation uses `.gx-wheel`;
- a fail shows red objectives, Recovered and the board note, and no revolution section;
- the phone layout stacks.

---

## 2. Personnel file (`winMode==='person'`, `base.js`)

**Window:** `sr-window pf-win` (1100px), head "Personnel file" plus close, footer **Close** only. Everything must fit on one screen at 900px tall. **No scrolling on desktop.**

**Layout (`.pf-body`):**
- left: `.pf-col--stage` spanning both rows;
- top right: `.pf-plate` as a **header across the two right columns**;
- below it: `.pf-col--mid` and `.pf-col--side`.

**Header plate:**
- `.pf-lvl` ring: purple fill = XP to the next level, with the level number and "LVL";
- name (display font, 30px);
- role icon, role, and tags (Rookie, specialty such as "Doctor", "Injured");
- the rank button (`.pf-rank`): chevrons (gold for soldier ranks, blue for airman ranks), the rank name, and promotion pips. Clicking it opens today's rank overlay.

**Stage (`.pf-stage`, 600px tall):** spotlight, floor grid, a rebel-red hazard stripe across the top and a faint flag.
- **The figure:** `figureURL(p)` re-rendered **large**: `SA.character` at about `s:6.2` on a 420×460 canvas at 2× (today it's 340×300 at `s:3.3`). Show it at 350×383, standing on the floor.
- **Gear slots (`.pf-peg`)** pinned either side of the figure, from `Rebel.gearSlots(p)`:
  - Soldiers, Marines and Heroes: left Primary, Sidearm, Back; right Head, Body, Gadget, Gadget.
  - Pilots: left Sidearm, Gadget; right Head, Body, Gadget.
  - Support have no slots.
  - Each slot shows its item art and name, or a dashed "+" with "Empty". Clicking one opens today's gear picker.
- **Injured:** `.is-hurt` desaturates the figure, and a hazard ribbon across the top-left corner reads **"Injured"**.
- **Support Department Head (or Niche Lead):** a green `.pf-stagebadge` top-left.

**Middle column, top to bottom:**
1. **Medical**, if laid up: `.pf-medical`, titled **"Injured"**, with the text **"This character is off duty until they have recovered from their injuries."** and the days-to-go count on the right. *Designer to confirm whether the count stays; it was removed from the mission report.*
2. **Morale (`.pf-morale`):** a segmented bar in the band colour, with the **band name** (`Rebel.mband(p).n`: Very Low, Low, Middling, High, Very High) where the number used to be. The number goes in the row's `title` ("Morale 60 / 100").
3. **Character:** one compact `.pf-btn` (psi icon, trait name, "Character trait", diamond markers previewing good and bad effects, chevron) inside a `.pf-tip`. Hover, focus or tap opens a `.pf-pop` **popover to its right** with the name, the flavour line (italic) and `.pf-fx` effect chips: green for good, orange for bad. Split the trait's effect text into good and bad parts in the trait data, e.g. Cautious → "−10% damage taken" (good) and "−10% movement speed" (bad).
4. **Experiences:** a heading with an "N / 3" count, then one `.pf-btn` per experience (icon by category, name, category) with the same popover: flavour via `Rebel.expText` and the effect chip from `RTK[k].e`, marked good or bad. With none: "None yet. Missions write these." *(placeholder)*
5. **Specialty and Niche (Support only)**, replacing Skills. A two-column `.pf-btngrid`:
   - **Specialty:** a full-width Specialty button (`heart`, e.g. "Doctor", post "Department Head"), then a button for each unlocked Job and Rule (Treatment, Stabilise). Each has a popover with the full text from `Support`.
   - **Niche:** **the niche the rebel actually has**, not the classroom; training happens in the Training Hall. A full-width niche button (`.pf-spec__head--niche`, e.g. "Physio", "Niche Lead"), the unlocked niche perks (e.g. Rehab, Job), then a dashed "Level 7: pick one" button naming the next fork. With no niche: one "No niche yet" line.
6. **Skills (soldiers and pilots):** a 2×2 grid of `.pf-skill` tiles: name, value, a small purple bar (capped at 50) and a **`.pf-skill__fx` line with what the rank actually does**, from the real formulas in `rebel.js`:

   | Skill | Shows | Comes from |
   |---|---|---|
   | Aim | "+3 to hit" (pilots: "+6 to hit in space") | `aimOf(p,'g'\|'s')` |
   | Constitution | "106 health" | `hpOf` |
   | Agility | "+2% move speed" | `moveMul` |
   | Presence | "68 Cool" (pilots: "in space") | `coolOf` |
   | Cunning | "+21% repairs & shields" | `cunMul` |
   | Focus | "+2 harder to hit" | `focusTN` |

   The header shows "max 50".

**Right column:**
- **Assigned craft (pilots and heroes with a ship):** `.pf-craft` with ship art, name, class · maker, a 5-cell hull bar and its %.
- **Service record:** three `.pf-medal` tiles with a coloured icon disc and a big number: Missions served (gold), Confirmed kills (rebel red), Times injured (orange).
- **Assignment:** a 2-column `.pf-assign` grid: Rest, Train (disabled with a title if there's no Training Hall), and for Support "Work in the {room}" full-width. **When injured, Rest is forced on and the rest are disabled**, with a `.pf-assign__note` reading "Resting until recovered."
- Experiences no longer live here; they moved next to Character.

**Smoke (`tools/dossier-smoke.js`, extend it):**
- the soldier shows 7 slots, the pilot 5, Support none;
- the morale row shows the band name with the number in its title;
- the trait, experience and specialty buttons open their popovers;
- skill fx strings match the formulas for a level-1 and a level-4 rebel;
- Support shows Specialty and their own niche, with no classroom;
- an injured rebel has Rest forced, the "Injured" card and ribbon;
- the window fits 1440×900 with no body scroll;
- the phone stacks, with popovers below.

---

## 3. Comm burst (`winMode==='comm'`, and `srcContact()`)

This fixes the inconsistency where the narration sat in the source's speech bubble and the source's real words were in a separate orange "Signal" box. **Each kind of information has one home:**
- **Who (`.cm-who`):**
  - an initials avatar with a red ring and a signal badge (use the source's portrait if one exists), then name, type, and location;
  - on the right, "Source · Level N" and a purple **cultivation** meter growing from old to new, with "Cultivation +N" under it. This replaces the bare "Cultivation increased." line.
- **Channel strip (`.cm-chan`):** a blinking green "Carrier locked" and **all the transmission flavour in one line**: "Encrypted · rebel net · lag 4.2s · voices masked". Under it, the red waveform: today's `drawCommStatic` canvas, restyled to a thin red line. The footer flavour text is removed.
- **Narration (`.cm-log`):** "Coded burst to {loc}. {First} is responding on our secure channel." as a grey log line with a red ">" marker. **Not a bubble.**
- **The source speaking (`.cm-say` / `.cm-bubble`):** one speech bubble with a tail from the source's avatar, name, and a small "Signal" tag (`sr-tag--action`), then the signal text. This is the **only** bubble style a source uses. *Recommended:* restyle the Cass transmission window (`cassIntro`) with the same bubble.
- **Consequence (`.cm-lead`):** when the signal adds a mission, a cyan card reads **"New Lead – Added to Mission Board"**, with the mission name and "Space · Low risk · Brakka orbit".
- **Footer:** **Acknowledge** (primary) when there's a signal. With no signal: no bubble or lead, just a dashed `.cm-quiet` **"No signal waiting."** and the button reads **Close channel**.

**Data:**
- `srcContact` already knows `src.cult` before and after; pass both through.
- The cultivation meter scale is `cult / 100` toward the next level. *Confirm (blocker).*
- The lead card reads the signal's follow-up mission (`followSignal` → `MPOOL[id]`).

**Smoke (`tools/comm-smoke.js`):**
- a contact with a signal shows the who strip, meter old/new, log line, one bubble with the Signal tag, the lead card and Acknowledge;
- a contact without one shows the quiet note and Close channel;
- there's no flavour text in the footer;
- `cassIntro` uses `.cm-bubble` if adopted.

---

## 4. Missions tab: the briefing room

Today Missions is a popup window (`winMode==='missions'`). It becomes **a full stage view**, like the Galaxy and the Arsenal: the tabs stay at top centre, and the rail is the briefing. Remove the popup.

**Top bar:** title "Missions", sub "Briefing room · Haven Rock".

**Mission board (`.bf-board`, left, 330px):**
- **Title:** "Mission board" (display font, cyan icon). No count, and no footer line.
- **Filter chips:** All · Ground · Space.
- **Cards (`.bf-card`)**, one per available or tracked mission:
  - a type icon box (soldier for ground, ship for space), the name, and a meta line: type · a 3-pip risk meter (Low green, Moderate gold, High orange; `riskTxt` maps to 1–3) · source;
  - an optional flag: "New" (gold) or "Locked" (grey).
  - **Selected:** glows and slides right with a connector into the projection.
  - **Locked:** dimmed (a source not yet raised).

**Holo-table (`.bf-holo`, centre):**
- the projector table (SVG ellipses), a light beam, and the projection (`.bf-proj`) with a scan line, slow-spinning dashed ring and slight flicker. The holo colour is `--sr-shield`.
- **Ground missions:** the mission's planet as a cyan wireframe sphere (meridians, latitudes, the world's texture lines from `WORLD_LOOK`), the mission's **region** as a highlighted patch, and a pulsing pin.
- **Space missions:** the planet plus a tilted orbit ring, with targets as diamonds on the ring and threats as Hegemony-blue triangles.
- **Callouts (`.bf-callout`):** 2–3 boxes with leader lines to the pin or targets, labelled e.g. **Target**, **Opposition** (`.is-foe`, blue), **Extract**, **Threat**, **Window**. Add an optional `holo:[{k:'Target',t:'FT-4 Cross on the pad behind the sheriff’s HQ'},{k:'Opposition',t:'Sheriff Reeve enforces Hegemony law here',foe:1},{k:'Extract',t:'Walk a pilot to the pad and fly it home'}]` field to each `MPOOL` / mission def. With no `holo`, fall back to the first two objectives as Target and Extract.
- **Label chip (`.bf-title`)**, just above the table: **"{World} · {Region}"**, e.g. "Brakka · Dustfall". Locked: "Signal encrypted", with a scrambled-bars projection.

**Briefing (rail, `.bf-rail`).** It must **fit with no scrolling** at 900px tall; the rail never scrolls. If content runs long, clamp the pitch first, then clamp objectives to one line each. Top to bottom:
1. **Title:** `.bf-railtitle` "Briefing".
2. **Mission:** name (23px display font), then the location line (target icon, "Brakka · Dustfall") with a small ghost **Show on map** button on the right. **No Ground/Space tag here.**
3. **Source card:** 32px avatar, name, type · location.
4. **Pitch:** the mission description, italic, **clamped to 3 lines**, with the full text in `title`.
5. **Three fact tiles:** **Risk** (coloured), **Travel time** ("2 days", from `m.days`), **Max squad size** (`req.team`, or e.g. "1 ship").
6. **Requirements**, from `precondList(m)`, **count-first labels** ("3 Soldiers", "1 Transport", "1 Pilot", "1 Starfighter", items, specialty, fuel):
   - each row is a `.bf-req` grid: tick (`is-ok`, green) or lock (`is-no`, orange) in a fixed column, the label, and an optional small detail line underneath;
   - **met rows name nobody**; the requirement is simply met;
   - unmet rows give a generic reason, e.g. "None available";
   - **"Restore the hauler in the Hangar" appears only while the onboarding hauler step is active.**
7. **Objectives:** dashed cyan boxes, then the text.
8. **Rewards:** chips in resource and asset colours (FT-4 Cross, 500, 120, "Dustfall +10%").
9. **Plan (`.bf-plan`):** a big **Plan mission** button, disabled when `!canPlan(m)`. When blocked, the reason sits right under it in orange with a lock (e.g. "Needs a transport"). Clicking it opens today's planning flow.

**Bottom:**
- the comms feed bottom-left as usual;
- **Advance day** bottom-right on its own (`.bf-go`, §0);
- **no command bar.**

**Smoke (`tools/missions-smoke.js`):**
- the tab is a stage view, not a window;
- cards render with risk pips, and selecting one swaps the projection and briefing;
- ground shows the region pin, space shows orbit targets, and locked shows encrypted;
- the label shows world · region;
- requirements are count-first with no names, the hauler hint appears only in onboarding, and Plan is disabled with the reason underneath;
- the briefing fits the rail at 1440×900 (`scrollHeight <= clientHeight`);
- there's no `sr-cmdbar` on this view.

---

## 5. What the canvas showed that isn't for the build

- Faces and item art were sprite stand-ins; use SR_ART.
- The doctor "Mira Okonkwo" was a test character.
- The Missions comms line ("Cass Wender marked Steal the Cross as urgent…") is *placeholder* flavour.
- Joss's "Marta" craft card was an example state.

## 6. DESIGN_BLOCKERS to add

- **Cultivation meter scale** in the comm burst: is it `cult/100` to the next level?
- **Holo callouts:** a new optional `holo` field per mission. The designer should write the callout lines for each mission. Until then, objectives are the fallback.
- **Injured days counter** on the personnel file: kept, pending the designer, since it was removed on the mission report.
- **Requirement labels:** count-first everywhere ("1 Transport"). The designer accepted this for transport; confirm for the others.
- **Win objectives:** collapsed to the "All N objectives" pill (designer reviewed). Revert to the full list if asked.
- **Cass transmission (`cassIntro`):** adopt the comm-burst bubble for consistency (recommended, not yet signed off).
- **Market/Arsenal amendment** per §0.1: confirm it applies to whatever has already been built.

## 7. Stylesheets

These are the designs as reviewed, with mockup-only rules and sprite art removed. `.it-art` and `.kf` are declared in `sr-report.css` too (identical to `sr-kit.css`), so either can load first.

### `game/ui/sr-report.css`

```css
/* =====================================================================
   STAR REBELLION — Mission report window (sr-report.css)
   Builds on sr-theme.css. Prefix rp-. it-/kf- are art slots filled from SR_ART.
   ===================================================================== */

.it-art{display:block;width:128px;height:80px;}            /* holds a canvas from SR_ART.item(id) (same rule as sr-kit.css) */
.it-art>canvas,.it-art>img{display:block;width:100%;height:100%;}
.kf{display:block;width:40px;height:40px;border-radius:50%;flex:none;overflow:hidden;background:var(--sr-hull);box-shadow:0 0 0 var(--sr-line) var(--sr-ink);}
.kf>canvas,.kf>img{display:block;width:100%;height:100%;}   /* portraitURL(p) */

/* ---------- window ---------- */
.rp-win.sr-window{width:880px;max-height:none;}
.rp-win--fail.sr-window{--accent:var(--sr-c-bad);}

/* hero */
.rp-hero{position:relative;display:flex;align-items:flex-end;gap:16px;min-height:150px;padding:20px 22px 18px;overflow:hidden;
  background:linear-gradient(180deg,#3b2a6e 0%,#5a3a7a 40%,#b8603e 78%,#e08a3a 100%);border-bottom:var(--sr-line) solid var(--sr-ink);}
.rp-win--fail .rp-hero{background:linear-gradient(180deg,#2a1730 0%,#4a1e2e 50%,#6e2a26 100%);}
.rp-hero__land{position:absolute;left:0;right:0;bottom:0;width:100%;height:76px;}
.rp-hero__txt{position:relative;flex:1;min-width:0;}
.rp-hero__txt .sr-brief__title{font-size:44px;}
.rp-hero__meta{margin-top:8px;font:700 var(--sr-fs-sm)/1 var(--sr-font-ui);color:rgba(255,255,255,.82);text-shadow:0 1px 0 var(--sr-ink);}
.rp-hero .sr-stamp{position:relative;flex:none;font-size:30px;margin:0 6px 6px 0;background:var(--sr-ink);animation:sr-stamp .45s var(--sr-ease-pop) .55s both;}

/* body */
.rp-body{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);gap:18px;padding:18px;}
.rp-col{display:flex;flex-direction:column;gap:16px;min-width:0;}
.rp-sec{display:flex;flex-direction:column;gap:8px;animation:rp-rise .45s var(--sr-ease-pop) both;animation-delay:var(--d,0s);}
.rp-sec__head{display:flex;align-items:center;gap:8px;font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);color:var(--sr-text-2);text-transform:uppercase;letter-spacing:.06em;}
.rp-sec__head .sr-ico{width:16px;height:16px;color:var(--sr-text-3);}
.rp-sec__head b{margin-left:auto;color:var(--sr-go);letter-spacing:0;}
.rp-sec__head b.is-bad{color:var(--sr-c-bad);}
.rp-objs .sr-obj{padding:3px 0;}
.rp-obj-fail{color:var(--sr-c-bad);}
.rp-obj-fail .sr-obj__mark{border-style:solid;background:var(--sr-c-bad);color:var(--sr-ink);border-color:var(--sr-ink);}

/* haul */
.rp-haul{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
.rp-tile{position:relative;display:flex;flex-direction:column;gap:4px;padding:10px 12px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel);
  animation:rp-pop .4s var(--sr-ease-pop) both;animation-delay:var(--d,0s);}
.rp-tile__top{display:flex;align-items:center;gap:6px;font:700 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.rp-tile__top .sr-ico{width:16px;height:16px;}
.rp-tile__n{font:400 26px/1 var(--sr-font-display);color:var(--c,var(--sr-text));text-shadow:0 2px 0 var(--sr-ink);}
.rp-tile__split{font:600 var(--sr-fs-micro)/1.3 var(--sr-font-ui);color:var(--sr-text-3);}
.rp-tile--item{align-items:center;text-align:center;}
.rp-tile--item .it-art{width:80px;height:50px;margin:-4px 0 -2px;}
.rp-tile--item .rp-tile__n{font-size:18px;}

/* crew */
.rp-crew{display:flex;flex-direction:column;gap:6px;}
.rp-mate{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:10px;padding:7px 10px 7px 7px;background:var(--sr-plate);
  border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);animation:rp-rise .4s var(--sr-ease-pop) both;animation-delay:var(--d,0s);}
.rp-mate__name{display:flex;align-items:baseline;gap:8px;font:800 var(--sr-fs-sm)/1.1 var(--sr-font-ui);color:var(--sr-text);}
.rp-mate__name span{font:600 var(--sr-fs-micro)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.rp-xp{position:relative;height:10px;margin-top:6px;background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:999px;overflow:hidden;}
.rp-xp i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;}
.rp-xp .was{width:var(--from);background:color-mix(in srgb,var(--sr-psi) 45%,var(--sr-night));}
.rp-xp .now{left:var(--from);width:var(--gain);background:var(--sr-psi);box-shadow:inset 0 2px 0 rgba(255,255,255,.3);transform-origin:left center;animation:rp-grow .9s ease-out both;animation-delay:var(--d,0s);}
.rp-xp.is-up .was{display:none;}
.rp-xp.is-up .now{left:0;background:var(--sr-gold);}
.rp-mate__gain{font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);color:var(--sr-psi);text-align:right;white-space:nowrap;}
.rp-mate__gain small{display:block;margin-top:3px;font:700 var(--sr-fs-micro)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.rp-lvl{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;font:400 var(--sr-fs-xs)/1 var(--sr-font-display);color:var(--sr-ink);background:var(--sr-gold);
  border:2px solid var(--sr-ink);border-radius:999px;animation:rp-pop .45s var(--sr-ease-pop) both;animation-delay:calc(var(--d,0s) + .7s);}
.rp-mate .sr-tag{height:22px;}
.rp-mate.is-lost{background:repeating-linear-gradient(-45deg,var(--sr-night) 0 10px,#1c1530 10px 20px);}
.rp-mate.is-lost .kf{filter:grayscale(1) brightness(.6);}
.rp-mate.is-lost .rp-mate__name{color:var(--sr-text-3);text-decoration:line-through;text-decoration-thickness:2px;}

/* revolution */
.rp-rev{display:flex;flex-direction:column;gap:12px;padding:12px;background:var(--sr-night);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);}
.rp-meter{display:grid;grid-template-columns:44px minmax(0,1fr);gap:12px;align-items:center;}
.rp-ring{position:relative;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;
  background:conic-gradient(var(--c) calc(var(--to) * 1%),color-mix(in srgb,var(--c) 22%,var(--sr-night)) 0);box-shadow:0 0 0 var(--sr-line) var(--sr-ink);}
.rp-ring::after{content:"";position:absolute;inset:7px;border-radius:50%;background:var(--sr-hull);box-shadow:0 0 0 2px var(--sr-ink);}
.rp-ring>*{position:relative;z-index:1;}
.rp-ring .sr-ico{width:18px;height:18px;color:var(--c);}
.rp-ring b{font:400 13px/1 var(--sr-font-display);color:var(--sr-text);}
.rp-meter__top{display:flex;align-items:baseline;gap:8px;font:800 var(--sr-fs-sm)/1.1 var(--sr-font-ui);color:var(--sr-text);}
.rp-meter__top em{margin-left:auto;font-style:normal;font:400 18px/1 var(--sr-font-display);color:var(--c);text-shadow:0 2px 0 var(--sr-ink);}
.rp-bar{position:relative;height:12px;margin-top:6px;background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:999px;overflow:hidden;}
.rp-bar i{position:absolute;top:0;bottom:0;left:0;border-radius:999px;}
.rp-bar .was{width:calc(var(--from) * 1%);background:color-mix(in srgb,var(--c) 50%,var(--sr-night));}
.rp-bar .now{left:calc(var(--from) * 1%);width:calc((var(--to) - var(--from)) * 1%);background:var(--c);transform-origin:left center;animation:rp-grow .9s ease-out both;animation-delay:var(--d,0s);}
.rp-meter__sub{display:flex;flex-wrap:wrap;gap:6px 10px;margin-top:6px;font:600 var(--sr-fs-xs)/1.3 var(--sr-font-ui);color:var(--sr-text-3);}
.rp-meter__sub .sr-tag{height:20px;font-size:var(--sr-fs-micro);}
.rp-next{display:flex;align-items:center;gap:10px;padding:12px;border:2px dashed var(--sr-seam);border-radius:var(--sr-r-lg);font:600 var(--sr-fs-sm)/1.4 var(--sr-font-ui);color:var(--sr-text-2);}
.rp-next .sr-ico{width:20px;height:20px;flex:none;color:var(--sr-text-3);}
.rp-next b{color:var(--sr-text);}

/* footer */
.rp-win .sr-window__note{font:700 var(--sr-fs-xs)/1.2 var(--sr-font-ui);color:var(--sr-text-3);}

@keyframes rp-rise{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
@keyframes rp-pop{0%{opacity:0;transform:scale(.7);}70%{opacity:1;transform:scale(1.06);}100%{transform:none;}}
@keyframes rp-grow{from{transform:scaleX(0);}to{transform:scaleX(1);}}
@media (prefers-reduced-motion:reduce){.rp-win *{animation:none !important;}}

/* ===== additions from the review rounds ===== */
/* hero: planet + location pin instead of a tag; objectives pill on wins */
.rp-loc{display:flex;align-items:flex-end;gap:10px;margin-bottom:6px;}
.rp-loc__item{display:flex;flex-direction:column;align-items:center;gap:5px;}
.rp-loc__item canvas,.rp-loc__item svg{width:36px;height:36px;display:block;}
.rp-loc__lbl{font:800 12px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:#fff;text-shadow:0 2px 0 var(--sr-ink);}
.rp-loc__dots{width:26px;margin-bottom:30px;border-top:3px dotted rgba(255,255,255,.6);}
.rp-objpill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 5px;background:var(--sr-go);color:var(--sr-ink);border:2px solid var(--sr-ink);border-radius:999px;
  font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);text-shadow:none;}
.rp-objpill .sr-ico{width:14px;height:14px;}
/* resources: one tile per resource gained (credits, supplies, materials, fuel), up to 4 in a row */
.rp-res{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}
.rp-res .rp-tile{padding:9px 9px 10px;}
.rp-res .rp-tile__n{font-size:22px;}
.rp-drows{display:flex;flex-direction:column;gap:4px;margin-top:6px;padding-top:7px;border-top:2px dashed var(--sr-seam);}
.rp-drow{display:flex;align-items:center;gap:7px;font:700 12px/1.2 var(--sr-font-ui);color:var(--sr-text-3);}
.rp-drow i{width:8px;height:8px;flex:none;background:var(--c);border:2px solid var(--sr-ink);border-radius:2px;transform:rotate(45deg);box-shadow:0 0 6px var(--c);}
.rp-drow b{min-width:34px;font:800 13px/1 var(--sr-font-ui);color:var(--c);}
/* loot: every item, ship, vehicle or bot gained; 4 per row, two rows max, the last becomes "+N more" */
.rp-loot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;}
.rp-loot__tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px 7px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);
  border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel);animation:rp-pop .4s var(--sr-ease-pop) both;animation-delay:var(--d,0s);}
.rp-loot__tile .it-art{width:68px;height:42px;}
.rp-loot__name{max-width:100%;font:700 11px/1.15 var(--sr-font-ui);color:var(--sr-text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-loot__q{position:absolute;top:4px;right:6px;font:400 14px/1 var(--sr-font-display);color:var(--sr-text);text-shadow:0 2px 0 var(--sr-ink);}
.rp-loot__tile.is-foe{background:linear-gradient(180deg,#22336e,var(--sr-plate));}        /* Hegemony loot */
.rp-loot__tile.is-asset{background:linear-gradient(135deg,color-mix(in srgb,var(--sr-gold) 22%,var(--sr-plate)),var(--sr-plate) 70%);}  /* ship / vehicle / bot */
.rp-loot__badge{position:absolute;top:4px;left:5px;padding:2px 5px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.05em;text-transform:uppercase;color:var(--sr-ink);
  background:var(--sr-gold);border:2px solid var(--sr-ink);border-radius:999px;}
.rp-loot__more{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:2px dashed var(--sr-seam);border-radius:var(--sr-r-lg);}
.rp-loot__more b{font:400 18px/1 var(--sr-font-display);color:var(--sr-text-2);}
.rp-loot__more span{font:700 11px/1.2 var(--sr-font-ui);color:var(--sr-text-3);}
/* crew: injured / lost marked on the portrait and in words, no pill, no recovery time */
.rp-mate__ava{position:relative;width:40px;height:40px;flex:none;}
.rp-mate__badge{position:absolute;right:-5px;bottom:-5px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--c);border:2px solid var(--sr-ink);color:var(--sr-ink);}
.rp-mate__badge .sr-ico{width:12px;height:12px;}
.rp-mate__state{font:800 11px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--c);}
/* revolution: the hub's ember look; liberation uses .gx-wheel from sr-theme */
.rp-revring{position:relative;width:48px;height:48px;border-radius:50%;background:conic-gradient(var(--sr-ember-hi) 0,var(--sr-ember) calc(var(--to) * 1%),#2b1014 0);
  box-shadow:0 0 0 3px var(--sr-ink),0 0 14px rgba(255,90,31,.45);}
.rp-revring>span{position:absolute;inset:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:50%;
  background:radial-gradient(circle at 50% 30%,#8a1f12 0,var(--sr-ember-deep) 55%,var(--sr-ember-core) 100%);box-shadow:0 0 0 3px var(--sr-ink);}
.rp-revring .sr-ico{width:14px;height:14px;color:var(--sr-ember-hi);}
.rp-revring b{font:400 13px/1 var(--sr-font-display);color:#fff4e6;text-shadow:0 2px 0 var(--sr-ink);}
.rp-meter.is-rev .now{background:linear-gradient(90deg,var(--sr-ember),var(--sr-ember-hi));}
.rp-meter{grid-template-columns:48px minmax(0,1fr);}
@container sr-app (max-width:900px){
  .rp-win.sr-window{width:100%;height:100%;border-radius:0;border-width:0;}
  .rp-body{grid-template-columns:minmax(0,1fr);padding:14px;gap:16px;overflow-y:auto;flex:1;min-height:0;}
  .rp-res{grid-template-columns:repeat(2,minmax(0,1fr));}
  .rp-loot{grid-template-columns:repeat(3,minmax(0,1fr));}
  .rp-hero .sr-stamp{position:absolute;right:12px;bottom:14px;font-size:20px;margin:0;}
  .rp-hero__txt .sr-brief__title{font-size:32px;}
  .rp-win .sr-window__foot .sr-btn{flex:1;justify-content:center;}
}

```

### `game/ui/sr-personnel.css`

```css
/* =====================================================================
   STAR REBELLION — Personnel file redesign (sr-personnel.css). Prefix pf-.
   Builds on sr-theme.css; item art (.it-art) comes from sr-report.css.
   ===================================================================== */
.pf-win.sr-window{width:1100px;max-height:none;}
.pf-body{display:grid;grid-template-columns:420px minmax(0,1fr) 236px;grid-template-rows:auto 1fr;gap:18px;padding:18px;}
.pf-body>.pf-plate{grid-column:2/4;grid-row:1;position:relative;left:auto;right:auto;bottom:auto;padding:14px 16px;gap:16px;}   /* the header across the two right columns */
.pf-body>.pf-col--stage{grid-column:1;grid-row:1/3;} .pf-body>.pf-col--mid{grid-column:2;grid-row:2;} .pf-body>.pf-col--side{grid-column:3;grid-row:2;}
.pf-col{display:flex;flex-direction:column;gap:14px;min-width:0;}
.pf-h{display:flex;align-items:center;gap:8px;font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);color:var(--sr-text-2);text-transform:uppercase;letter-spacing:.06em;}
.pf-h .sr-ico{width:16px;height:16px;color:var(--sr-text-3);}
.pf-h b{margin-left:auto;letter-spacing:0;color:var(--sr-text-3);}

/* ---------- the stage: big paper doll with gear pegs ---------- */
.pf-stage{position:relative;height:600px;border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-xl);overflow:hidden;
  background:radial-gradient(ellipse 60% 45% at 50% 62%,rgba(255,200,120,.16),transparent 70%),
             linear-gradient(180deg,#1b1f4a 0%,#141738 58%,#0f1130 58.2%,#0b0d26 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.04),var(--sr-lift);}
.pf-stage::before{content:"";position:absolute;left:0;right:0;top:58%;bottom:0;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 2px,transparent 2px 46px),repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 2px,transparent 2px 30px);}
.pf-stage::after{content:"";position:absolute;left:0;top:0;width:100%;height:10px;background:repeating-linear-gradient(-45deg,var(--sr-rebel) 0 12px,#1b1f4a 12px 24px);opacity:.75;}
.pf-flag{position:absolute;right:22px;top:26px;width:46px;height:62px;opacity:.16;color:var(--sr-rebel);}
.pf-doll{position:absolute;left:50%;top:150px;width:350px;height:383px;transform:translateX(-50%);filter:drop-shadow(0 8px 0 rgba(7,8,24,.35));}
.pf-stage.is-hurt .pf-doll{filter:saturate(.55) brightness(.85) drop-shadow(0 8px 0 rgba(7,8,24,.35));}

.pf-pegs{position:absolute;top:30px;display:flex;flex-direction:column;gap:12px;}
.pf-pegs--l{left:14px;} .pf-pegs--r{right:14px;}
.pf-peg{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0;background:none;border:0;cursor:pointer;font:inherit;}
.pf-peg__box{position:relative;display:grid;place-items:center;width:66px;height:58px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);
  border-radius:var(--sr-r);box-shadow:var(--sr-bevel),var(--sr-lift);}
.pf-peg__box .it-art{width:64px;height:40px;}
.pf-peg.is-empty .pf-peg__box{background:rgba(7,8,24,.45);border:2px dashed var(--sr-seam);box-shadow:none;}
.pf-peg.is-empty .pf-peg__box::after{content:"+";font:400 20px/1 var(--sr-font-display);color:var(--sr-seam);}
.pf-peg__lbl{font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.pf-peg__name{font:700 10px/1.1 var(--sr-font-ui);color:var(--sr-text-2);max-width:76px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pf-peg:hover .pf-peg__box{border-color:var(--sr-gold);}

/* name plate across the bottom of the stage */
.pf-plate{position:absolute;left:12px;right:12px;bottom:12px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 14px;
  background:color-mix(in srgb,var(--sr-hull) 92%,transparent);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-float);}
.pf-lvl{position:relative;display:grid;place-items:center;width:58px;height:58px;border-radius:50%;
  background:conic-gradient(var(--sr-psi) calc(var(--xp) * 1%),#26204a 0);box-shadow:0 0 0 var(--sr-line) var(--sr-ink);}
.pf-lvl::after{content:"";position:absolute;inset:7px;border-radius:50%;background:var(--sr-night);box-shadow:0 0 0 2px var(--sr-ink);}
.pf-lvl b{position:relative;z-index:1;font:400 24px/1 var(--sr-font-display);color:var(--sr-psi);text-shadow:0 2px 0 var(--sr-ink);}
.pf-lvl small{position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);z-index:1;padding:2px 6px;font:800 8px/1 var(--sr-font-ui);letter-spacing:.08em;
  color:var(--sr-ink);background:var(--sr-psi);border:2px solid var(--sr-ink);border-radius:999px;}
.pf-name{font:400 24px/1 var(--sr-font-display);color:var(--sr-text);text-shadow:0 2px 0 var(--sr-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pf-role{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;margin-top:7px;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-2);}
.pf-role .sr-ico{width:14px;height:14px;color:var(--sr-rebel);}
.pf-role em{font-style:normal;color:var(--sr-text-3);}
.pf-rank{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 10px;background:var(--sr-night);border:var(--sr-line) solid var(--sr-ink);
  border-radius:var(--sr-r);cursor:pointer;font:inherit;color:var(--sr-text);}
.pf-rank svg{width:26px;height:16px;}
.pf-rank b{font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);white-space:nowrap;}
.pf-rank span{display:flex;gap:3px;}
.pf-rank span i{width:9px;height:4px;border-radius:2px;background:var(--sr-seam);}
.pf-rank span i.is-on{background:var(--sr-gold);}

/* hurt ribbon */
.pf-ribbon{position:absolute;left:-40px;top:52px;width:240px;transform:rotate(-24deg);padding:6px 0;text-align:center;z-index:3;
  font:400 13px/1 var(--sr-font-display);color:var(--sr-ink);background:repeating-linear-gradient(-45deg,var(--sr-hazard) 0 14px,#ffb24a 14px 28px);
  border-top:3px solid var(--sr-ink);border-bottom:3px solid var(--sr-ink);box-shadow:0 4px 0 rgba(7,8,24,.4);}
.pf-stagebadge{position:absolute;left:14px;top:26px;display:flex;align-items:center;gap:6px;padding:5px 10px 5px 6px;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);
  color:var(--sr-ink);background:var(--sr-go);border:2px solid var(--sr-ink);border-radius:999px;box-shadow:var(--sr-lift);}
.pf-stagebadge .sr-ico{width:14px;height:14px;}

/* ---------- middle column ---------- */
.pf-morale{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;background:var(--sr-night);
  border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);}
.pf-morale__lbl{font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);color:var(--sr-text);}
.pf-morale__lbl small{display:block;margin-top:3px;font:700 var(--sr-fs-micro)/1 var(--sr-font-ui);color:var(--c);text-transform:uppercase;letter-spacing:.06em;}
.pf-bar{position:relative;height:14px;background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:999px;overflow:hidden;}
.pf-bar i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--v) * 1%);background:var(--c);border-radius:999px;box-shadow:inset 0 3px 0 rgba(255,255,255,.3);}
.pf-bar::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(25% - 2px),rgba(7,8,24,.6) calc(25% - 2px) 25%);}
.pf-morale__v{font:400 20px/1 var(--sr-font-display);color:var(--c);text-shadow:0 2px 0 var(--sr-ink);}

.pf-trait{position:relative;padding:12px 14px;background:linear-gradient(135deg,#2c2758 0%,var(--sr-plate) 70%);border:var(--sr-line) solid var(--sr-ink);
  border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel);}
.pf-trait__top{display:flex;align-items:center;gap:10px;}
.pf-trait__ico{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:50%;background:var(--sr-psi);border:var(--sr-line) solid var(--sr-ink);color:var(--sr-ink);}
.pf-trait__ico .sr-ico{width:18px;height:18px;}
.pf-trait__name{font:400 17px/1 var(--sr-font-display);color:var(--sr-text);}
.pf-trait__kind{margin-top:4px;font:800 var(--sr-fs-micro)/1 var(--sr-font-ui);text-transform:uppercase;letter-spacing:.07em;color:var(--sr-psi);}
.pf-trait p{margin:10px 0 8px;font:500 italic var(--sr-fs-sm)/1.45 var(--sr-font-ui);color:var(--sr-text-2);}
.pf-fx{display:flex;flex-wrap:wrap;gap:6px;}
.pf-fx span{display:inline-flex;align-items:center;gap:6px;padding:4px 9px 4px 7px;font:700 var(--sr-fs-xs)/1.2 var(--sr-font-ui);border-radius:var(--sr-r-sm);
  background:var(--sr-void);border:2px solid var(--sr-ink);color:var(--c);}
.pf-fx span::before{content:"";width:8px;height:8px;flex:none;background:var(--c);border:2px solid var(--sr-ink);border-radius:2px;transform:rotate(45deg);}

.pf-skills{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.pf-skill{padding:9px 11px 10px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);box-shadow:var(--sr-bevel);}
.pf-skill__top{display:flex;align-items:baseline;justify-content:space-between;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-2);}
.pf-skill__top b{font:400 20px/1 var(--sr-font-display);color:var(--sr-text);text-shadow:0 2px 0 var(--sr-ink);}
.pf-skill .pf-bar{height:8px;margin-top:7px;--c:var(--sr-psi);}
.pf-skill .pf-bar::after{display:none;}

/* support specialty */
.pf-spec{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.pf-spec__head{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:12px 14px;background:linear-gradient(135deg,color-mix(in srgb,var(--sr-rebel) 26%,var(--sr-plate)),var(--sr-plate) 70%);
  border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel);}
.pf-spec__head .sr-ico{width:22px;height:22px;color:var(--sr-rebel);}
.pf-spec__name{font:400 18px/1 var(--sr-font-display);}
.pf-spec__sub{margin-top:4px;font:600 var(--sr-fs-xs)/1.3 var(--sr-font-ui);color:var(--sr-text-2);}
.pf-spec__head .sr-tag{margin-left:auto;}
.pf-perk{padding:10px 12px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);}
.pf-perk__top{display:flex;align-items:center;gap:8px;font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);}
.pf-perk__top span{margin-left:auto;padding:3px 7px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;border-radius:999px;border:2px solid var(--sr-ink);color:var(--sr-ink);background:var(--c);}
.pf-perk p{margin:6px 0 0;font:500 var(--sr-fs-xs)/1.4 var(--sr-font-ui);color:var(--sr-text-2);}
.pf-niches{display:flex;flex-direction:column;gap:6px;}
.pf-niche{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:8px 10px;background:var(--sr-night);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);}
.pf-niche b{display:block;font:800 var(--sr-fs-sm)/1.1 var(--sr-font-ui);}
.pf-niche small{display:block;margin-top:3px;font:600 var(--sr-fs-micro)/1.3 var(--sr-font-ui);color:var(--sr-text-3);}
.pf-niche em{font-style:normal;font:800 var(--sr-fs-micro)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.pf-niche.is-dim{opacity:.55;}

.pf-medical{display:flex;gap:12px;align-items:center;padding:12px 14px;background:repeating-linear-gradient(-45deg,rgba(255,138,31,.12) 0 12px,transparent 12px 24px),var(--sr-plate);
  border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--sr-hazard) 60%,transparent);}
.pf-medical .sr-ico{width:26px;height:26px;color:var(--sr-hazard);flex:none;}
.pf-medical b{display:block;font:400 16px/1 var(--sr-font-display);color:var(--sr-hazard);}
.pf-medical span{display:block;margin-top:5px;font:600 var(--sr-fs-xs)/1.35 var(--sr-font-ui);color:var(--sr-text-2);}
.pf-medical strong{margin-left:auto;font:400 26px/1 var(--sr-font-display);color:var(--sr-hazard);text-align:center;white-space:nowrap;}
.pf-medical strong small{display:block;margin-top:2px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--sr-text-3);}

/* ---------- right column ---------- */
.pf-record{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;}
.pf-medal{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;background:var(--sr-plate);
  border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel);overflow:hidden;}
.pf-medal::before{content:"";position:absolute;right:-18px;top:-18px;width:70px;height:70px;border-radius:50%;background:color-mix(in srgb,var(--c) 16%,transparent);}
.pf-medal__ico{position:relative;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--sr-void);
  border:var(--sr-line) solid var(--sr-ink);box-shadow:inset 0 0 0 3px color-mix(in srgb,var(--c) 70%,transparent);color:var(--c);}
.pf-medal__ico .sr-ico{width:20px;height:20px;}
.pf-medal__lbl{position:relative;font:800 var(--sr-fs-xs)/1.2 var(--sr-font-ui);color:var(--sr-text-2);}
.pf-medal__n{position:relative;font:400 28px/1 var(--sr-font-display);color:var(--sr-text);text-shadow:0 2px 0 var(--sr-ink);}
.pf-xps{display:flex;flex-wrap:wrap;gap:6px;}
.pf-none{font:600 var(--sr-fs-sm)/1.3 var(--sr-font-ui);color:var(--sr-text-3);}
.pf-assign{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}
.pf-assign .sr-btn{justify-content:center;}
.pf-assign .sr-btn--wide{grid-column:1/-1;}
.pf-craft{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-bevel);}
.pf-craft__top{display:flex;align-items:center;gap:10px;}
.pf-craft__top .it-art{width:84px;height:52px;flex:none;}
.pf-craft__top b{display:block;font:400 16px/1 var(--sr-font-display);}
.pf-craft__top span{display:block;margin-top:4px;font:700 var(--sr-fs-micro)/1.3 var(--sr-font-ui);color:var(--sr-text-3);}
.pf-offduty{padding:12px;border:2px dashed var(--sr-seam);border-radius:var(--sr-r-lg);font:600 var(--sr-fs-sm)/1.4 var(--sr-font-ui);color:var(--sr-text-3);}

/* ---------- compact detail buttons with a popover to the right ---------- */
.pf-tip{position:relative;}
.pf-btn{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;padding:7px 10px 7px 7px;text-align:left;color:var(--sr-text);
  background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);box-shadow:var(--sr-bevel);cursor:pointer;font:inherit;}
.pf-btn:hover,.pf-tip.is-open .pf-btn,.pf-tip:focus-within .pf-btn{border-color:var(--sr-gold);}
.pf-btn__ico{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--c,var(--sr-psi));border:var(--sr-line) solid var(--sr-ink);color:var(--sr-ink);}
.pf-btn__ico .sr-ico{width:14px;height:14px;}
.pf-btn__name{display:block;font:800 13px/1.1 var(--sr-font-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pf-btn__kind{display:block;margin-top:3px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.pf-btn__end{display:flex;align-items:center;gap:6px;}
.pf-btn__end .sr-ico{width:14px;height:14px;color:var(--sr-text-3);}
.pf-dots{display:flex;gap:4px;}
.pf-dots i{width:8px;height:8px;border:2px solid var(--sr-ink);border-radius:2px;transform:rotate(45deg);background:var(--c);}
.pf-btn.is-dashed{background:transparent;border:2px dashed var(--sr-seam);box-shadow:none;}
.pf-btngrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}
.pf-btngrid .pf-tip.is-wide{grid-column:1/-1;}
.pf-pop{display:none;position:absolute;left:calc(100% + 14px);top:-8px;z-index:30;width:300px;padding:14px;background:var(--sr-hull);
  border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);box-shadow:var(--sr-float),0 0 0 2px var(--sr-gold);}
.pf-pop::before{content:"";position:absolute;left:-10px;top:20px;width:14px;height:14px;background:var(--sr-hull);border-left:var(--sr-line) solid var(--sr-ink);border-bottom:var(--sr-line) solid var(--sr-ink);transform:rotate(45deg);}
.pf-tip:hover .pf-pop,.pf-tip:focus-within .pf-pop,.pf-tip.is-open .pf-pop{display:block;}
.pf-pop__name{font:400 17px/1 var(--sr-font-display);color:var(--sr-text);}
.pf-pop__kind{margin-top:5px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-psi);}
.pf-pop p{margin:10px 0;font:500 var(--sr-fs-sm)/1.45 var(--sr-font-ui);color:var(--sr-text-2);}
.pf-pop p em{font-style:italic;}

/* ===== additions from the review rounds ===== */
.pf-plate .pf-lvl{width:66px;height:66px;} .pf-plate .pf-lvl b{font-size:28px;}
.pf-plate .pf-name{font-size:30px;} .pf-plate .pf-role{font-size:13px;} .pf-plate .pf-rank{padding:8px 14px;}
.pf-morale__v{font-size:15px;white-space:nowrap;}                     /* the band name; the number is the row's title (hover) */
.pf-skill__fx{display:flex;align-items:center;gap:6px;margin-top:7px;font:800 12px/1.2 var(--sr-font-ui);color:var(--sr-go);}
.pf-skill__fx::before{content:"";width:7px;height:7px;flex:none;background:var(--sr-go);border:2px solid var(--sr-ink);border-radius:2px;transform:rotate(45deg);}
.pf-assign__note{margin:8px 0 0;font:600 12px/1.35 var(--sr-font-ui);color:var(--sr-text-3);}
.pf-spec__head--niche{background:linear-gradient(135deg,color-mix(in srgb,var(--sr-psi) 26%,var(--sr-plate)),var(--sr-plate) 70%);}
@container sr-app (max-width:900px){
  .pf-win.sr-window{width:100%;height:100%;border-radius:0;border-width:0;}
  .pf-body{grid-template-columns:minmax(0,1fr);grid-template-rows:none;padding:12px;gap:14px;overflow-y:auto;flex:1;min-height:0;}
  .pf-body>*{grid-column:auto !important;grid-row:auto !important;}
  .pf-plate .pf-name{font-size:22px;}
  .pf-stage{height:470px;}
  .pf-doll{width:270px;height:296px;top:70px;}
  .pf-peg__box{width:54px;height:48px;} .pf-peg__box .it-art{width:52px;height:32px;} .pf-pegs{gap:8px;}
  .pf-pop{left:0;top:calc(100% + 10px);width:auto;right:0;}
  .pf-pop::before{left:22px;top:-9px;transform:rotate(135deg);}
}

```

### `game/ui/sr-briefing.css`

```css
/* =====================================================================
   STAR REBELLION — Missions tab: the briefing room (sr-briefing.css). Prefix bf-.
   Builds on sr-theme.css. Hologram colour = info/intel (--sr-shield).
   ===================================================================== */
.bf-stage{background:
  radial-gradient(ellipse 46% 34% at 56% 70%,rgba(54,227,242,.13),transparent 70%),
  linear-gradient(180deg,#0d1030 0%,#0a0c26 62%,#080a1e 100%);}
.bf-stage::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(90deg,rgba(54,227,242,.025) 0 1px,transparent 1px 64px),repeating-linear-gradient(0deg,rgba(54,227,242,.025) 0 1px,transparent 1px 64px);}

/* ---------- board (left) ---------- */
.bf-board{position:absolute;left:24px;top:116px;bottom:124px;width:330px;display:flex;flex-direction:column;gap:10px;}
.bf-board__head{display:flex;align-items:center;gap:8px;font:400 18px/1 var(--sr-font-display);color:var(--sr-text);}
.bf-board__head .sr-ico{width:20px;height:20px;color:var(--sr-shield);}
.bf-board__head span{margin-left:auto;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.bf-filters{display:flex;gap:6px;}
.bf-list{display:flex;flex-direction:column;gap:8px;overflow:hidden;}
.bf-card{position:relative;display:grid;grid-template-columns:38px minmax(0,1fr);gap:4px 10px;align-items:center;padding:10px 12px 10px 10px;text-align:left;color:var(--sr-text);
  background:linear-gradient(90deg,rgba(54,227,242,.10),rgba(20,24,64,.85) 60%);border:2px solid rgba(54,227,242,.35);border-radius:var(--sr-r-lg);
  box-shadow:inset 0 0 18px rgba(54,227,242,.08);cursor:pointer;font:inherit;transition:border-color var(--sr-t-fast),transform var(--sr-t-fast);}
.bf-card:hover{border-color:rgba(54,227,242,.7);}
.bf-card.is-sel{border-color:var(--sr-shield);background:linear-gradient(90deg,rgba(54,227,242,.22),rgba(20,24,64,.9) 70%);
  box-shadow:inset 0 0 22px rgba(54,227,242,.18),0 0 18px rgba(54,227,242,.25);transform:translateX(6px);}
.bf-card.is-sel::after{content:"";position:absolute;right:-16px;top:50%;width:12px;height:2px;background:var(--sr-shield);box-shadow:0 0 8px var(--sr-shield);}
.bf-card.is-locked{opacity:.6;}
.bf-card__ico{grid-row:1/3;display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:rgba(7,8,24,.7);border:2px solid rgba(54,227,242,.45);color:var(--sr-shield);}
.bf-card__ico .sr-ico{width:20px;height:20px;}
.bf-card__name{font:800 var(--sr-fs-md)/1.1 var(--sr-font-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bf-card__meta{display:flex;align-items:center;gap:8px;font:700 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-3);white-space:nowrap;overflow:hidden;}
.bf-risk{display:inline-flex;gap:2px;}
.bf-risk i{width:6px;height:10px;border-radius:2px;background:rgba(255,255,255,.12);}
.bf-risk i.is-on{background:var(--rc);}
.bf-card__flag{position:absolute;right:10px;top:9px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;padding:3px 6px;border-radius:999px;border:2px solid var(--sr-ink);}

/* ---------- the projection (centre) ---------- */
.bf-holo{position:absolute;left:372px;right:24px;top:96px;bottom:118px;}
.bf-table{position:absolute;left:50%;bottom:6px;width:520px;height:120px;transform:translateX(-50%);}
.bf-beam{position:absolute;left:50%;bottom:58px;width:470px;height:470px;transform:translateX(-50%);
  background:linear-gradient(0deg,rgba(54,227,242,.20),rgba(54,227,242,.04) 70%,transparent);clip-path:polygon(28% 100%,72% 100%,100% 0,0 0);opacity:.8;}
.bf-proj{position:absolute;left:50%;top:8px;width:640px;height:520px;transform:translateX(-50%);animation:bf-flicker 5s infinite;}
.bf-proj svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}
.bf-scan{position:absolute;left:12%;right:12%;height:2px;top:0;background:linear-gradient(90deg,transparent,rgba(160,250,255,.8),transparent);animation:bf-scan 3.6s linear infinite;opacity:.6;}
.bf-spin{transform-origin:320px 250px;animation:bf-spin 24s linear infinite;}
.bf-spin2{transform-origin:320px 250px;animation:bf-spin 40s linear infinite reverse;}
.bf-pulse{transform-box:fill-box;transform-origin:center;animation:bf-pulse 1.6s ease-out infinite;}
.bf-callout{position:absolute;min-width:150px;max-width:210px;padding:8px 10px;background:rgba(8,30,48,.72);border:2px solid rgba(54,227,242,.7);border-radius:8px;
  box-shadow:0 0 16px rgba(54,227,242,.25),inset 0 0 12px rgba(54,227,242,.12);color:#c8fbff;backdrop-filter:blur(2px);}
.bf-callout b{display:block;font:800 10px/1 var(--sr-font-ui);letter-spacing:.09em;text-transform:uppercase;color:var(--sr-shield);}
.bf-callout span{display:block;margin-top:4px;font:700 13px/1.3 var(--sr-font-ui);color:#e6fdff;}
.bf-callout.is-foe{border-color:rgba(122,170,255,.8);background:rgba(16,28,72,.75);}
.bf-callout.is-foe b{color:#8fb6ff;}
.bf-title{position:absolute;left:50%;top:auto;bottom:132px;z-index:5;white-space:nowrap;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:6px 14px;
  font:800 11px/1 var(--sr-font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--sr-shield);border:2px solid rgba(54,227,242,.45);border-radius:999px;background:rgba(8,20,40,.6);}
.bf-title i{width:8px;height:8px;border-radius:50%;background:var(--sr-shield);box-shadow:0 0 8px var(--sr-shield);animation:bf-blink 1.2s steps(2) infinite;}

/* ---------- briefing dossier (rail) ---------- */
.bf-brief{display:flex;flex-direction:column;gap:14px;}
.bf-brief__type{display:flex;align-items:center;gap:8px;}
.bf-brief__title{font:400 26px/1.05 var(--sr-font-display);color:var(--sr-text);text-shadow:0 3px 0 var(--sr-ink);}
.bf-loc{display:flex;align-items:center;gap:8px;margin-top:6px;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-2);}
.bf-loc .sr-ico{width:14px;height:14px;color:var(--sr-rebel);}
.bf-src{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--sr-night);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r-lg);}
.bf-src__ava{display:grid;place-items:center;width:40px;height:40px;flex:none;border-radius:50%;background:var(--sr-hull);border:var(--sr-line) solid var(--sr-ink);
  box-shadow:inset 0 0 0 3px var(--sr-rebel);font:400 15px/1 var(--sr-font-display);color:var(--sr-text);}
.bf-src b{display:block;font:800 var(--sr-fs-sm)/1.1 var(--sr-font-ui);}
.bf-src span{display:block;margin-top:3px;font:600 var(--sr-fs-xs)/1.2 var(--sr-font-ui);color:var(--sr-text-3);}
.bf-quote{margin:0;font:500 italic var(--sr-fs-sm)/1.5 var(--sr-font-ui);color:var(--sr-text-2);}
.bf-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}
.bf-fact{padding:8px 6px;text-align:center;background:var(--sr-plate);border:var(--sr-line) solid var(--sr-ink);border-radius:var(--sr-r);}
.bf-fact b{display:block;font:400 17px/1 var(--sr-font-display);color:var(--c,var(--sr-text));}
.bf-fact span{display:block;margin-top:4px;font:800 9px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-3);}
.bf-sec{display:flex;flex-direction:column;gap:6px;}
.bf-sec__h{display:flex;align-items:center;gap:7px;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-text-2);}
.bf-sec__h .sr-ico{width:14px;height:14px;color:var(--sr-text-3);}
.bf-req{display:flex;align-items:center;gap:8px;font:700 var(--sr-fs-sm)/1.3 var(--sr-font-ui);color:var(--sr-text);}
.bf-req .sr-ico{width:16px;height:16px;flex:none;}
.bf-req.is-ok .sr-ico{color:var(--sr-go);}
.bf-req.is-no{color:var(--sr-text-2);}
.bf-req.is-no .sr-ico{color:var(--sr-hazard);}
.bf-req em{margin-left:auto;font-style:normal;font:700 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.bf-obj{display:grid;grid-template-columns:18px 1fr;gap:8px;font:600 var(--sr-fs-sm)/1.35 var(--sr-font-ui);color:var(--sr-text-2);}
.bf-obj i{width:14px;height:14px;margin-top:2px;border:2px dashed var(--sr-shield);border-radius:4px;}
.bf-rew{display:flex;flex-wrap:wrap;gap:6px;}
.bf-rew span{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;font:800 var(--sr-fs-sm)/1 var(--sr-font-ui);color:var(--c);background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:var(--sr-r-sm);}
.bf-rew .sr-ico{width:15px;height:15px;}

@keyframes bf-spin{to{transform:rotate(360deg);}}
@keyframes bf-pulse{0%{transform:scale(.6);opacity:1;}100%{transform:scale(2.2);opacity:0;}}
@keyframes bf-scan{0%{top:6%;}100%{top:88%;}}
@keyframes bf-flicker{0%,100%{opacity:1;}47%{opacity:1;}48%{opacity:.82;}49%{opacity:1;}72%{opacity:.94;}}
@keyframes bf-blink{50%{opacity:.2;}}
@media (prefers-reduced-motion:reduce){.bf-proj,.bf-scan,.bf-spin,.bf-spin2,.bf-pulse,.bf-title i{animation:none !important;}}

/* ===== additions from the review rounds ===== */
.bf-railtitle{display:flex;align-items:center;gap:8px;padding-bottom:10px;margin-bottom:10px;border-bottom:3px solid var(--sr-seam);font:400 22px/1 var(--sr-font-display);color:var(--sr-text);}
.bf-railtitle .sr-ico{width:22px;height:22px;color:var(--sr-shield);}
.bf-rail{overflow:hidden;padding-top:14px;padding-bottom:14px;}       /* the briefing must fit: never scrolls */
.bf-brief{gap:10px;}
.bf-brief__title{font-size:23px;}
.bf-loc .sr-btn{margin-left:auto;height:26px;padding:0 8px;font-size:11px;}   /* Show on map */
.bf-src{padding:7px 10px;gap:9px;} .bf-src__ava{width:32px;height:32px;font-size:12px;}
.bf-quote{font-size:13px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}   /* full text in title */
.bf-fact{padding:6px 4px;} .bf-fact b{font-size:15px;}
.bf-sec{gap:5px;}
.bf-req{display:grid;grid-template-columns:18px minmax(0,1fr);gap:3px 8px;align-items:start;}
.bf-req>.sr-ico{grid-row:1/3;margin-top:1px;}
.bf-req em{margin-left:0;grid-column:2;font-size:12px;line-height:1.3;}
.bf-obj{font-size:12.5px;line-height:1.3;gap:7px;}
.bf-rew span{padding:4px 8px;font-size:13px;}
.bf-plan{display:flex;flex-direction:column;gap:6px;padding-top:10px;border-top:2px dashed var(--sr-seam);}
.bf-plan .sr-btn{justify-content:center;width:100%;}
.bf-plan__why{display:flex;align-items:center;gap:6px;font:700 12px/1.35 var(--sr-font-ui);color:var(--sr-hazard);}
.bf-plan__why .sr-ico{width:14px;height:14px;}
.bf-go{display:flex;flex-direction:column;align-items:flex-end;}      /* Advance day on its own, no command bar */

```

### `game/ui/sr-comm.css`

```css
/* STAR REBELLION — Comm burst window redesign (sr-comm.css). Prefix cm-. Builds on sr-theme.css. */
.cm-win.sr-window{width:min(600px,100%);--accent:var(--sr-rebel);}
.cm-who{display:flex;align-items:center;gap:12px;padding:14px 16px 12px;background:var(--sr-plate);border-bottom:var(--sr-line) solid var(--sr-ink);}
.cm-ava{position:relative;display:grid;place-items:center;width:52px;height:52px;flex:none;border-radius:50%;background:var(--sr-hull);border:var(--sr-line) solid var(--sr-ink);
  box-shadow:inset 0 0 0 3px var(--sr-rebel);font:400 18px/1 var(--sr-font-display);color:var(--sr-text);}
.cm-ava i{position:absolute;right:-4px;bottom:-4px;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--sr-rebel);border:2px solid var(--sr-ink);color:var(--sr-ink);}
.cm-ava i .sr-ico{width:12px;height:12px;}
.cm-name{font:400 20px/1 var(--sr-font-display);color:var(--sr-text);}
.cm-role{margin-top:5px;font:700 var(--sr-fs-xs)/1.2 var(--sr-font-ui);color:var(--sr-text-3);}
.cm-who__end{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:5px;}
.cm-lvl{font:800 10px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-psi);}
.cm-meter{position:relative;width:120px;height:10px;background:var(--sr-void);border:2px solid var(--sr-ink);border-radius:999px;overflow:hidden;}
.cm-meter i{position:absolute;top:0;bottom:0;left:0;border-radius:999px;}
.cm-meter .was{width:calc(var(--from) * 1%);background:color-mix(in srgb,var(--sr-psi) 50%,var(--sr-night));}
.cm-meter .now{left:calc(var(--from) * 1%);width:calc((var(--to) - var(--from)) * 1%);background:var(--sr-psi);box-shadow:0 0 8px var(--sr-psi);animation:cm-grow .9s ease-out .5s both;transform-origin:left;}
.cm-gain{font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-psi);}

/* the channel strip: waveform + all the transmission flavour in one place */
.cm-chan{position:relative;margin:14px 16px 0;padding:8px 12px 10px;background:#0b0d22;border:2px solid var(--sr-ink);border-radius:var(--sr-r);overflow:hidden;}
.cm-chan__top{display:flex;align-items:center;gap:8px;font:800 10px/1 var(--sr-font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--sr-text-3);}
.cm-chan__top b{display:inline-flex;align-items:center;gap:5px;color:var(--sr-go);}
.cm-chan__top b::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--sr-go);box-shadow:0 0 6px var(--sr-go);animation:cm-blink 1.4s steps(2) infinite;}
.cm-chan__top span{margin-left:auto;}
.cm-chan svg{display:block;width:100%;height:30px;margin-top:6px;}
.cm-log{margin:12px 16px 0;display:flex;gap:8px;align-items:baseline;font:600 var(--sr-fs-sm)/1.45 var(--sr-font-ui);color:var(--sr-text-3);}
.cm-log::before{content:">";font:800 13px/1 var(--sr-font-ui);color:var(--sr-rebel);}

/* the source speaking: one bubble, always the same */
.cm-say{display:grid;grid-template-columns:36px minmax(0,1fr);gap:10px;margin:14px 16px 0;}
.cm-say__ava{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--sr-hull);border:var(--sr-line) solid var(--sr-ink);box-shadow:inset 0 0 0 2px var(--sr-rebel);
  font:400 12px/1 var(--sr-font-display);color:var(--sr-text);}
.cm-bubble{position:relative;padding:12px 14px;background:color-mix(in srgb,var(--sr-rebel) 12%,var(--sr-plate));border:var(--sr-line) solid var(--sr-ink);border-radius:4px var(--sr-r-lg) var(--sr-r-lg) var(--sr-r-lg);
  box-shadow:var(--sr-bevel),var(--sr-lift);}
.cm-bubble::before{content:"";position:absolute;left:-10px;top:10px;width:14px;height:14px;background:inherit;border-left:var(--sr-line) solid var(--sr-ink);border-bottom:var(--sr-line) solid var(--sr-ink);transform:rotate(45deg);}
.cm-bubble__top{display:flex;align-items:center;gap:8px;margin-bottom:6px;font:800 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-rebel-hi);}
.cm-bubble__top .sr-tag{margin-left:auto;height:20px;font-size:10px;}
.cm-bubble p{margin:0;font:600 var(--sr-fs-md)/1.5 var(--sr-font-ui);color:var(--sr-text);}

/* what acknowledging does */
.cm-lead{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;margin:14px 16px 16px;padding:10px 12px;
  background:linear-gradient(90deg,rgba(54,227,242,.12),var(--sr-night) 70%);border:2px solid rgba(54,227,242,.5);border-radius:var(--sr-r-lg);}
.cm-lead__ico{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:rgba(7,8,24,.7);border:2px solid rgba(54,227,242,.5);color:var(--sr-shield);}
.cm-lead__ico .sr-ico{width:20px;height:20px;}
.cm-lead__k{font:800 10px/1 var(--sr-font-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--sr-shield);}
.cm-lead__n{margin-top:4px;font:800 var(--sr-fs-md)/1.1 var(--sr-font-ui);color:var(--sr-text);}
.cm-lead__m{margin-top:3px;font:700 var(--sr-fs-xs)/1 var(--sr-font-ui);color:var(--sr-text-3);}
.cm-quiet{margin:14px 16px 16px;padding:10px 12px;border:2px dashed var(--sr-seam);border-radius:var(--sr-r-lg);font:600 var(--sr-fs-sm)/1.4 var(--sr-font-ui);color:var(--sr-text-3);}
@keyframes cm-grow{from{transform:scaleX(0);}to{transform:scaleX(1);}}
@keyframes cm-blink{50%{opacity:.25;}}
@media (prefers-reduced-motion:reduce){.cm-win *{animation:none !important;}}

```
