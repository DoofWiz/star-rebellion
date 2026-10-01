#!/bin/bash
# usage: tools/sweep.sh '<REVW json>' [policy] [seeds...]
W="$1"; POL="${2:-balanced}"; shift 2 2>/dev/null
SEEDS="${@:-1 2 3}"
for s in $SEEDS; do REVW="$W" NODE_PATH=$(npm root -g) timeout 290 node "$(dirname "$0")/autoplay.js" $s $POL 300 2>&1 | python3 "$(dirname "$0")/summ.py"; done
