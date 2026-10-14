# High Command, playtest 4: your feedback and what I built

**Status: building, 14 October**, in two phases: I1 (the display, locks, missiles and chaff) and I2 (Defend, and
the Hegemony's squadrons). `docs/DESIGN_BLOCKERS.md` C-72 records what I chose building them.

## 1. Your notes (after testing scenario 2, hc2_lastlight), verbatim

I've been testing scenario 2. Map size of 16.0 is the best default for me right now.

* Defend's logic isn't quite working out for me, ships defending something only engage attackers of the defended
  target if they actually shoot at it, so enemy ships can come all the way up to the target before they get engaged.
  In reality, if someone is defending something, and they see an aggressor coming toward what they're defending,
  they'll get between the two targets and try to keep them off them.
   * In a similar vein, ship AI is prioritising destroying the lastlight station over their own preservation. What if
     the AI squadron leaders tried to make decisions for their wings to lure defenders away for the station so that
     another wave with the specific goal of targeting the objective has a clear shot at it?
* Hide all dotted engagement lines unless a wing is selected, including enemies. Hide the shield/armour/health status
  of ships on the canvas - keeping the HUD variant - unless the wing or ship is selected.
* All ships should be able to lock on. When they do, their free firing weapons become much more accurate.
* When a ship has had a missile fired at it, it should immediately prioritise trying to shake it off by boosting away
  and performing any maneuvers that help it avoid the hit.
* Add a 'chaff' ability that interrupts missile and causes them to lock onto the chaff.
* Missiles should expire (explode) past a certain time in the air, need a control for that with default 6s.
