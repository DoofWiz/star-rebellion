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

One tab per part of the game: **Missions** (every reusable mission type's words, and the guards' names and lines),
**Prologue** (the onboarding's comms, signals, guided-step lines and callouts: `PRO_TEXT` in `game/js/prologue.js`),
**Base**, **Ground**, **Space**, **Rebels** (traits, experiences, injuries, ranks), **Title**, **Shared** (HUD and kit)
and **Page** (the static labels in `game/index.html`). Each row is one line:

| Column | What it is |
|---|---|
| Kind | **Dialog** (someone talking), **Text** (narration, descriptions, tutorials), **Label** (a button, title or tag: check it still fits), **Markup** (a line that is mostly HTML layout with a few words in it). Filter on it. |
| Where | Where it lives in the code: `REB_LINES.dax[0]` is Dax's first bark, `say() in endRound()` a line shouted mid-fight, `CHAINS.parity_towers.steps[1].text[0]` a source-chain page. |
| Text | **The only column you edit.** A changed row turns yellow. |
| Original | What the game says now. |
| Placeholders | What a numbered placeholder such as `{1}` stands for. |
| File, Line, ID | Where it is. The ID is how the import finds the line again: do not edit or delete it. |

## Mission types (the Missions tab)

A reusable mission type (Steal Fuel, Steal Intelligence, Blow Up Auto Factory, Rescue Dissident, Ambush: Extract VIP,
Steal Ship, Disrupt Comm Towers) is written once, in `game/js/mission-text.js`, and every deployment of it fills in its own names. Its offer on the
board, the briefing, the objectives (the board, the briefing and the live list all use the same ones), the hint, the
pilot's arrival call, the log lines and the end screen are all there. The variables:

| Variable | Becomes |
|---|---|
| `{transport}` | the transport the player picked (Marta, Hauler 2); "transport" on the board, before one is picked. Write "the {transport}". |
| `{pilot}` | the transport's pilot, first name |
| `{target}` | what is being hit: fuel depot, AutoCom Plant, security outpost |
| `{place}` | the region or world: Redrock Flats, Kiln Ridge |
| `{npc}` `{npc1}` | the person being rescued, full name and first name |
| `{carrier}` `{device}` | who carries the charge or device, and which one |
| `{hacker}` | the Field Technician on the job |
| `{fallen}` | the rebels left behind, as a list |
| `{n}` `{total}` | progress counts |
| `{ship}` `{shipPilot}` | Steal Ship: the ship being stolen (FT-4 Cross, SF-11 Talon) and the first name of the pilot taking it |
| `{SRC}` | the source's surname in capitals, in their follow-up line |

The same tab holds the Hegemony guards: a pool of surnames (robots get a serial number), and per enemy type a title,
**idle** lines (said now and then on patrol while all is quiet) and **alarm** lines (said by whoever raises the alarm).
Story missions (Take the Rock, Steal the Cross, Steal the Strider) and their characters (Sheriff Reeve and his deputies,
Boss Craw and the squatters) keep their own words in the Ground tab.

Rebel traits use `{name}` for the rebel and `{partner}` for the other one in a pair; the merc pitch uses `{first}`,
`{them}`, `{they}`, `{their}` and `{weapon}`.

## Placeholders and HTML

- `{curly braces}` are filled in by the game: `{t.first} is down!`, `The {target} at {place}`. Short code shows as
  itself; anything longer shows as `{1}`, `{2}`, and the Placeholders column spells it out. Type a placeholder
  exactly as it is written. You can move one, use it twice or drop it (`{t.first}’s hit! {t.first} is down!` can
  become `Man down! {t.first} is hit!`): the tool rebuilds that bit of code. A placeholder the line does not
  already have, or a `{` or `}` of your own, is refused.
- Some lines carry HTML: `<b>bold</b>`, `<br>`, `<span class="g">` (green), `"b"` (danger), `"d"` (quiet). Keep the
  tags around the words they wrap.
- Because of that, a word in angle brackets, such as `<muffled shouting>`, would vanish in the game: write it
  `&lt;muffled shouting&gt;`. In a comm or a Source's signal, a line break inside the cell is a line break on screen.
- Spaces at either end of a line are kept as they were, because a line built from pieces often needs them
  (`'Day '+n`).
- Straight and curly quotes and apostrophes are both in the game today; what you type is what you get.

## What the import checks

It refuses the whole file, saving nothing, if a row uses a placeholder the line does not have, if the code changed
that line since your export (export again and copy the edit across), or if the edited file would not parse. It names
each row and why. After a successful import, `git diff` shows exactly what changed.

A few smoke tests check exact wording (a combat label such as `STEADY`, a rank title). Changing that wording
is fine; the test is updated to match when the import is committed.

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
