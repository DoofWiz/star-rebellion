# High Command, playtest 3: your feedback and what I built

**Status: built, 13 October.** You asked for these directly; `docs/DESIGN_BLOCKERS.md` C-71 records what I chose
building them, and C-69.20 in the Resolved log records your call on the Cross.

## 1. Your notes (13 October, after playtest 2's build), verbatim

* I'd like all the ship panels in the HUD in the left hand corner.
* I'd like the command bar to be bigger and to show as a bigger skill icon.
* I'd like The map to be x4 the size it is right now. Too often combat is getting caught up on the edges.
* The cross spacecraft turns way too slowly to be useful, it should turn faster but not as fast as the lighter
  inteceptor craft.

## 2. What I built

- **The wing cards are a column in the bottom-left corner**, under the event feed (which gives up rows if the cards
  need the room). The order tray and the pilot panel open beside the column, level with their card or tile.
- **The commands are skill icons**: 76 × 84 buttons with a 34 px glyph, the cost in the corner and the name under it,
  in a bar at the bottom, centred in the room right of the cards. Abort is a small button in the bar's title row.
- **The map is 4 × as wide and tall** (`HC_MAP` 32, was 8; the slider goes to 48), with the scenario's places where
  they were, in its middle. The starfield is now one tile repeated, so it doesn't thin out on a bigger map.
- **The Cross turns at 80% of a Mote's or a Talon's rate** (it was 50%): its tightest circle at corner speed is about
  477 against their 382 (it was about 760). It's on the panel as "Cross turn ×" (1.6).
