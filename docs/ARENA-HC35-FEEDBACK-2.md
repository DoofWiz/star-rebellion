# Type 3.5 playtest 2: the designer's notes, what the flight record showed, and the build

The designer's second set of notes on Type 3.5 (High Command Hands Off), with the flight record
`sr-run-2026-10-20-1641-vulnerable_freighter-975866.json` (Crash, seed 975866, 8:26 flown, failed). Built as phases
L1 to L6 on `space-combat-testing`; the calls I made are C-82 in `docs/DESIGN_BLOCKERS.md`, the ones I need from you
C-83.

## 1. The notes, as given

1. On the planning pop-up, selecting an objective makes the whole pop-up briefly reopen. We don't need that. It also
   happens elsewhere, such as assigning an asset or changing a wing's Executive Order.
   1. Show some rewards for choosing each objective. It's a demo: come up with an initial idea of each primary's
      rewards and I'll tweak them.
2. Secondary objectives and rules of engagement should be two different screens. If anything, secondary objectives
   should be a "part 2" of screen one (objectives).
3. I played Crash and didn't manage to crash the freighter, but it's weird that this counted as a failure. If they
   can't crash it, any of the other destroy objectives would do: once crashing it is no longer possible, the wings
   should default to another objective in the same family that is still possible. Maybe they get that objective's
   reward but miss a bonus that encourages going for the original.
   1. When my ships couldn't crash it any more they hung around and let the Hegemony reinforcements hit them freely.
      I didn't believe in their AI. The player shouldn't have to tell them to defend themselves and dogfight; I'd
      like to see more of the wing leaders making decisions in the field. That's a big part of the fun.
   2. I sounded a general retreat and my ships didn't seem to follow it: they flew off in other directions. Told to
      retreat, they should be gunning for the jump point in almost all circumstances.
   3. In the debrief, show the wing leaders' decisions: how they went about following your orders.
4. I like the subsystem targeting on the freighter. I'd love the same for every ship.
5. Drifting doesn't work in this gameplay as it used to. The animation looks weird and it looks spammable. Ships
   should drift to gain the advantage in a fight, but it should actually be drifting: a modification of their usual
   turn, not its own form of movement.
6. Some plasma weapons on some of the ships.

## 2. What the flight record showed

`node tools/run-report.js` on the run (it replays exactly: 506 checkpoints match):

- **Why Crash failed (4:43).** Anvil took the engines out at about 3:40, too far from the planet: the freighter coasted
  to a stop outside the pull (1,281 units off its lane, speed 0 by 5:50), and the primary's "dead in space outside
  the pull: it will never fall" check failed it. Every wing was then sent home, and the Destroy you ordered at 5:18
  came too late to count.
- **Why the ships hung around (the big one).** The plan had *Hold for My Signal*, and the signal was never given.
  The alarm went off at 2:19 (Phase 2) and the fight started anyway, but every wing kept "waiting for your signal":
  that check came before every order in the wings' thinking, the retreat included, and a waiting ship only fires for
  3 s after being hit. Amber, called in from reserve at 3:56, spent most of the next four minutes waiting for a
  signal that couldn't come, between bursts of "Pinned!". All seven losses were ships on Withdraw "with nobody
  defending its wing".
- **Why the retreat scattered.** The same check: a ship ordered home flew "Withdrawing" for a few seconds after each
  hit, then went back to orbiting its rally point waiting for the signal. And while it was withdrawing, High
  Command's pinned emergency turned it round to fight.

## 3. The build

| Phase | Notes | What |
|---|---|---|
| L1 | 1, 1.1, 2 | The planning windows don't replay their opening on a re-render and keep their scroll; each primary shows what it pays and an *Accomplished* bonus; window 1 in two parts (the primary, then the secondary objectives); the rules of engagement as window 2 |
| L2 | 3.1, 3.2 | A retreat outranks everything but a docked boarder: straight for the jump point, guns only on what's in the way; Hold for My Signal ends when the alarm goes off or a wing is attacked; wings defend themselves |
| L3 | 3, 3.1, 3.3 | The wing leaders decide in the field: a primary that can no longer be done falls back to one in its family that can, paying that one's reward without the bonus; a wing with nothing left to do picks a job; every decision logged and shown in the debrief |
| L4 | 4 | Subsystems on every ship: engines, guns, shields; the rings, the readout and Mark / Focus on any ship |
| L5 | 5 | Drift as part of the turn: the nose swings past the velocity, the ship slides, and it costs speed coming out; earned, not spammed |
| L6 | 6 | Plasma: slow, heavy, glowing bolts on some ships |

The detail of each is in C-82 as it lands.
