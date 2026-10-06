# Game text

The game's words (barks, comms, briefings, source chains, the Black Market patter, tutorials, tooltips, button labels)
are written straight into the JavaScript and the page HTML. `tools/text/text.py` pulls every line of it into one
spreadsheet you can edit in Google Sheets, then writes your edits back into the code.

## Editing in Google Sheets

```
python3 tools/text/text.py export star-rebellion-text.xlsx   # needs: pip install openpyxl
# upload to Google Drive, open as a Google Sheet, edit the Text column, File > Download > .xlsx
python3 tools/text/text.py import star-rebellion-text.xlsx --dry-run   # shows every change, saves nothing
python3 tools/text/text.py import star-rebellion-text.xlsx             # writes the edits into the code
```

Or hand the downloaded workbook to Claude and ask it to import your text edits.

One tab per part of the game: **Base**, **Ground**, **Space**, **Rebels** (traits, experiences, injuries, ranks),
**Title**, **Shared** (HUD and kit) and **Page** (the static labels in `game/index.html`). Each row is one line:

| Column | What it is |
|---|---|
| Kind | **Dialog** (someone talking), **Text** (narration, descriptions, tutorials), **Label** (a button, title or tag: check it still fits), **Markup** (a line that is mostly HTML layout with a few words in it). Filter on it. |
| Where | Where it lives in the code: `REB_LINES.dax[0]` is Dax's first bark, `say() in endRound()` a line shouted mid-fight, `CHAINS.parity_towers.steps[1].text[0]` a source-chain page. |
| Text | **The only column you edit.** A changed row turns yellow. |
| Original | What the game says now. |
| Placeholders | What a numbered placeholder such as `{1}` stands for. |
| File, Line, ID | Where it is. The ID is how the import finds the line again: do not edit or delete it. |

## Placeholders and HTML

- `{curly braces}` are filled in by the game: `{t.first} is down!`, `The {target} at {place}`. Short code shows as
  itself; anything longer shows as `{1}`, `{2}`, and the Placeholders column spells it out. Type a placeholder
  exactly as it is written. You can move one, use it twice or drop it (`{t.first}’s hit! {t.first} is down!` can
  become `Man down! {t.first} is hit!`): the tool rebuilds that bit of code. A placeholder the line does not
  already have, or a `{` or `}` of your own, is refused.
- Some lines carry HTML: `<b>bold</b>`, `<br>`, `<span class="g">` (green), `"b"` (danger), `"d"` (quiet). Keep the
  tags around the words they wrap.
- Spaces at either end of a line are kept as they were, because a line built from pieces often needs them
  (`'Day '+n`).
- Straight and curly quotes and apostrophes are both in the game today; what you type is what you get.

## What the import checks

It refuses the whole file, saving nothing, if a row uses a placeholder the line does not have, if the code changed
that line since your export (export again and copy the edit across), or if the edited file would not parse. It names
each row and why. After a successful import, `git diff` shows exactly what changed.

It also warns, without refusing, when a name you changed is written somewhere else too: a building name the ground
scene looks up, or a ship or pilot name that is also in the game database. The game may match those up, so change
them together (the database through `tools/db/build.py`).

## What is not here

- Item, ship, weapon and enemy names and descriptions: the game database, `python3 tools/db/build.py export-xlsx`
  (see [DATABASE.md](DATABASE.md)).
- The random rebel name lists (`FIRST`, `LAST` in `game/js/rebel.js`).
- Text drawn into the canvas art (`game/art/`) and the generated UI kit files (`sr-theme.js`).
- Words the code also uses as names: a rebel's role (`Soldier`, `Pilot`), a combat phase (`PLANNING`). The code
  compares against them, so renaming one is a code change, not a text edit.
- A line built entirely out of code, or a single lower-case word: these look like ids and are skipped. If a line you
  can see in the game is missing, search for it (`text.py find "words"`) and ask for it to be added.

## Other commands

```
python3 tools/text/text.py find "Sheriff"   # every line containing the words, with file and line number
python3 tools/text/text.py report           # lines per tab and kind
python3 tools/text/text.py dump             # every line, tab separated
```

## How it works

A small JavaScript lexer (checked against TypeScript's parser by `tools/text-smoke.js`) finds every string and
template literal. A `+` chain such as `t.first+' is down!'` or a template literal becomes one line, with the code
pieces shown as placeholders. Strings that are ids, CSS classes, selectors, keys or comparisons are left out. On
import each edited line is written back into the literals it came from, in the same quote style, and the file is
re-read to prove every edited line now says what the sheet says. `tools/text-smoke.js` edits every line at once in a
copy of the game and checks all of them read back.
