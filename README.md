# Star Rebellion

Prototypes and experiments for Star Rebellion's space combat. Combat is inspired by
the rules of the X-Wing miniatures game, adapted for a video game; we'll iterate on
what's fun over time.

## Prototypes

### `space-combat.html` — Skirmish: Operation Picket Break

First playable combat encounter, self-contained HTML (open directly in a browser).
No persistent meta data (pilots, stats) in this build — everything is defined inline.

**Scenario**: 1× GR-4 Viper multi-role fighter, 2× SF-11 Talon interceptors and
1× HK-7 Anvil bomber (player-commanded) vs. 3× Hegemony VK-3 Scimitar multi-roles
and 1× SC-9 Wraith interceptor. Destroy all enemy ships to win.

**Round structure** (X-Wing-derived):

1. **Planning** — assign each of your ships a maneuver from its class dial
   (speed × turn; interceptors get a K-turn) plus one action:
   *Focus* (+hit and +evade chance), *Evade* (+1 guaranteed dodge, spent on first
   attack against you), *Target Lock* (re-roll missed attack dice; arms the
   bomber's torpedoes). The enemy AI plans secretly at the same time.
2. **Maneuvers** — all ships move simultaneously along their plotted arcs.
3. **Engagement** — ships fire in initiative order (interceptors 4 > multi-roles 3 >
   bomber 2, player wins ties). Front arc only (~80°), three range bands
   (Range 1 adds an attack die, Range 3 adds a defense die). Damage strips
   shields, then hull. Torpedoes need a lock and Range 2–3.
4. **End** — Focus/Evade clear; unused locks persist.

**Deliberate adaptations from the tabletop rules** (candidates for iteration):

- Dice are simulated as per-die hit/evade probabilities rather than custom dice
  faces; no critical hits yet.
- Focus applies for the whole round instead of being a spent token.
- Ships auto-target (lock target first, else nearest in arc) rather than the
  player picking a fire target each attack.
- The map edge is a soft boundary (ships clamp and turn inward) instead of
  fleeing the battlefield being destruction.
- No collisions/bumping, no obstacles, no simultaneous fire within an
  initiative step.

**Open playtest questions**: torpedo economy (3 shots, lock-gated) — too strong or
too fiddly? Does round-long Focus make the game too forgiving? Is 4v4 the right
density for readability? Should the player pick fire targets manually?
