#!/usr/bin/env python3
"""Build the Star Rebellion UI kit (v1, "Chunky Ops").
   Sources (this folder): icons.py, sr-theme.css, sr-theme.template.js, styleguide.template.html
   Outputs:  <ui_dir>/sr-theme.css, sr-theme.js, sr-icons.svg   and   <docs_dir>/styleguide.html
Usage (from the repo root):  python3 tools/ui-kit/build.py game/ui docs/ui
Default (no args): ../dist for both."""
import json, sys, os
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from icons import ICONS
ui = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'dist')
docs = sys.argv[2] if len(sys.argv) > 2 else ui
for d in (ui, docs): os.makedirs(d, exist_ok=True)

def symbol(name, parts):
    ps = []
    for mode, d in parts:
        if mode == 'f': ps.append(f'<path d="{d}" fill="currentColor"/>')
        else: ps.append(f'<path d="{d}" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>')
    return f'<symbol id="i-{name}" viewBox="0 0 24 24">{"".join(ps)}</symbol>'

sprite = ('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">'
          + ''.join(symbol(k, v) for k, v in ICONS.items()) + '</svg>')
open(os.path.join(ui, 'sr-icons.svg'), 'w').write(sprite)
icons_js = json.dumps({k: [[m, d] for m, d in v] for k, v in ICONS.items()}, separators=(',', ':'))
js = open(os.path.join(here, 'sr-theme.template.js')).read().replace('/*@ICONS@*/{}', icons_js)
open(os.path.join(ui, 'sr-theme.js'), 'w').write(js)
css = open(os.path.join(here, 'sr-theme.css')).read()
open(os.path.join(ui, 'sr-theme.css'), 'w').write(css)
html = (open(os.path.join(here, 'styleguide.template.html')).read()
        .replace('/*@CSS@*/', css).replace('<!--@SPRITE@-->', sprite).replace('/*@JS@*/', js))
open(os.path.join(docs, 'styleguide.html'), 'w').write(html)
print('built', len(ICONS), 'icons ->', os.path.abspath(ui), '+', os.path.abspath(docs))
