#!/bin/bash
# Records each prompt in this Herdr tab's board (last prompt and time), so an open
# tab never shows an empty card. It never blocks the prompt: it always exits 0.
# Failures are written to ~/.config/herdr/board-stamp.log.
log="$HOME/.config/herdr/board-stamp.log"
[ -n "${HC_TERMINAL_ID:-}" ] || exit 0
prompt=$(jq -r '.prompt // empty') || { echo "board-stamp: hook input is not JSON" >>"$log"; exit 0; }
[ -n "$prompt" ] || exit 0
node "$HOME/.config/herdr/scripts/board.mjs" stamp --prompt "$prompt" >/dev/null 2>>"$log" || true
exit 0
