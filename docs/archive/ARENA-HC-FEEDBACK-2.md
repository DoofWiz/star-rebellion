# High Command, playtest 2: your feedback and how I'm building it

**Status: built, 13 October.** You asked for these changes directly (no proposal this time), so I built them in
the five phases in §3. Where your notes left a choice open I picked one and recorded it in `docs/DESIGN_BLOCKERS.md`
C-70, so you can overturn any of them; C-70.1 in the Resolved log records your calls.

---

## 1. Your notes (13 October, after playing playtest 1's build), verbatim

I adjusted speed to 4.
Overall this is feeling much better, though the map constraints mean the action ends up happening at the edge of the
map pretty much all the time so we clearly need a bigger map.
Also, we seem to maybe be having performance issues? I'm noticing a little bit of chop and stutter as ships moves
around at close range, i'd hope that this would look really smooth so I can follow the action more closely. Perhaps a
lot of optimisation to be made?
A bug, convoy lark just orbited the jump point and never actually jumped.
I'd like to add collision to the game. Pilots inherently should want to avoid crashing into other ships and space
obstacles.
I'd like to see missiles added to the FT-4 Cross ships and the lock on system for missile usage.

Some QOL improvements:

* Select the wing first when I click a ship in the HUD or on canvas. If I click a ship again through the HUD or on
  canvas, then it selects that specific ship.
* Intuitive clicks as orders in addition to the HUD. If I have my wing selected, I'd like it if I could right click on
  something on the canvas and a little wheel of relevant orders would pop up for me to choose from.
* I'd like a box select on LMB rather than map scroll, which can stay on RMB click and drag.
* For the purposes of this test in scenario 1, I'd like to see all engagement lines hidden unless I hover or select a
  wing, and for them to be a little bit more obscured.
* I'd like to see the Commands menu as a fixed part of the HUD in the center of the screen.
* I'd like to see the events log be much less long by default with a scroll to it, 5 entries on the screen assumed at
  maximum.
* Objectives panel should be bigger with bigger text.
* Time controls moved to center top below the overall mission timer.
* I'd like to see little symbols (like status symbols) pop up next to a ship on the canvas when they are using actions
  and abilities.

## 2. What I found

- **The stutter was the drawing, not the frame rate.** Frames cost about 3 ms of script in a close, followed fight
  (60 frames a second with room to spare). But the sim steps 20 times a second and the map drew each ship *ahead* of
  its last step along its current velocity. A turning ship at speed 4 then jumped a few pixels back onto its true
  path every step, and the follow camera chased those 20-a-second positions. At slow speed it was worse.
- **The edge of the map**: the scenario was scaled to fill the whole map, so the jump point and the relay sat about
  1,800 from the edge, and an attack run carries 1.4 × gun reach past its target plus a turn.
- **Convoy Lark** waited, correctly, while Relay K-7 jammed the jump point. When the relay fell it was already
  circling the point. At its speed it turns no tighter than about 490, wider than the 350 jump ring, so steering
  straight at the point kept it circling for ever.
- **Missiles and locks already exist** in the High Command sim (copied from SB): a lock builds while a target is in
  the guns' arc, and a missile needs 60% lock. But the stock FT-4 Cross carries no missiles (only the stolen Dustfall
  does), nothing draws the lock, and a lock barely builds during a fast attack run.

## 3. The phases

- **G1: smooth motion, the convoy, speed 4, a bigger map.** Draw every body between its last two steps (one step
  behind the sim, smooth at any frame rate and speed), the camera too; cull the starfield. Speed 4 by default. An 8 ×
  map with the scenario's places spread 4 × in its middle (what you played), so the fighting has open space round it;
  waves and reinforcements come in from beyond the play area's edge. Ships flying into the jump point fly out and
  line up when it is inside their turning circle. Ships holding on a point (capturing, boarding, waiting) circle at
  their tightest turn.
- **G2: collisions.** Ships and rocks collide and take damage by how hard they hit; every pilot looks ahead and
  steers clear of ships of either side and of rocks.
- **G3: the Cross's missiles and the lock.** Crosses carry missiles in the High Command scenarios (the database's
  stock Cross is unchanged, so v2, SB and the campaign are untouched). The lock is drawn closing on its target; a full
  lock fires by the pilot's doctrine (Missiles become an ability with AUTO / EMERG / MANUAL); a ship with a lock on it
  shows a warning.
- **G4: selecting and ordering on the map.** A click selects the wing, a second click the ship (map and roster
  alike); left-drag draws a selection box; right-drag pans; a right-click (a wing selected) opens a wheel of the
  orders that fit what you clicked.
- **G5: the HUD.** Commands fixed in the bottom centre; the event feed five rows with a scroll; a bigger objectives
  panel; time controls top centre under the clock; in hc1, engagement lines only for a hovered or selected wing, and
  fainter; status symbols by a ship using an ability or action.
