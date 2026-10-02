# Star Rebellion: notes for Claude

- **Keep `docs/DESIGN_BLOCKERS.md` current.** It is the coder's log for the designer. Whenever you hit a conflict
  (two docs disagree, a doc and the game disagree, or two systems pull against each other) or leave something
  unbuilt because a game system does not exist yet, add an entry in the same commit, with what it blocks and what
  you need from the designer. When the designer decides, build it, move the entry to the *Resolved* log and note
  the commit. If the file and the code disagree, fix the file. Do not use it as a changelog or wish list.
- Smoke tests: `NODE_PATH=$(npm root -g) node tools/<name>-smoke.js` (all `tools/*-smoke.js` should pass before a merge).
