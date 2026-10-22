# Star Rebellion: notes for Claude

- **Keep `docs/DESIGN_BLOCKERS.md` current.** It is the coder's log for the designer. Whenever you hit a conflict
  (two docs disagree, a doc and the game disagree, or two systems pull against each other) or leave something
  unbuilt because a game system does not exist yet, add an entry in the same commit, with what it blocks and what
  you need from the designer. When the designer decides, build it, move the entry to the *Resolved* log and note
  the commit. If the file and the code disagree, fix the file. Do not use it as a changelog or wish list.
- **Changing the shape of the campaign save (`G` in `game/js/base.js`)?** Add a function to the end of `MIGRATIONS`
  there that upgrades an older save; never patch old saves inside `restoreCampaign` (that is for work every load needs).
- Smoke tests: `NODE_PATH=$(npm root -g) node tools/<name>-smoke.js` (all `tools/*-smoke.js` should pass before a merge).
- **The designer edits game text in a spreadsheet** (`docs/TEXT.md`). Given their workbook, run
  `python3 tools/text/text.py import <file> --dry-run`, show them the changes, then import without `--dry-run`.
  Some smoke tests check exact wording (`'STEADY'`, `'Arsenal'`, rank titles): update them to the new words, then
  run all `tools/*-smoke.js`. Act on the import's "also written at" warnings before committing.
- **The designer's flight records** (`sr-run-….json`, saved from a Type 3.5 debrief on the test bench, `game/index.html?dev#arena`): run
  `node tools/run-report.js <file>` for the report (`--at m:ss`, `--ship`, `--wing`, `--objective`, `--json` to dig).
  Bump `SIM_VERSION` in `sim-hc.js` / `sim-hc35.js` in any commit that changes how the sim plays.
