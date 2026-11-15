#!/bin/bash
# Adds one plain-text line to this Herdr tab's board for the turn that just ended
# (the files it edited and how it ended), so the card keeps a log without the agent
# having to write one. It never blocks the stop: it always exits 0.
# Failures are written to ~/.config/herdr/board-stamp.log.
log="$HOME/.config/herdr/board-stamp.log"
[ -n "${HC_TERMINAL_ID:-}" ] || exit 0
transcript=$(jq -r '.transcript_path // empty') || { echo "board-turn: hook input is not JSON" >>"$log"; exit 0; }
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 0
node "$HOME/.config/herdr/scripts/board.mjs" turn --transcript "$transcript" >/dev/null 2>>"$log" || true
exit 0
