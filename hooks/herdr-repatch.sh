#!/usr/bin/env bash
# herdr-repatch.sh — Re-apply herdr multiplexer patches to OMC tmux-session.js
#
# Run this after OMC updates to re-inject herdr support into the team pane
# management module. Safe to run multiple times — it checks for existing
# patches before modifying.
#
# Usage: bash ~/.claude/hooks/herdr-repatch.sh

set -euo pipefail

OMC_VERSION_DIR=""
for dir in ~/.claude/plugins/cache/omc/oh-my-claudecode/*/; do
  if [ -f "${dir}dist/team/tmux-session.js" ]; then
    OMC_VERSION_DIR="${dir}"
  fi
done

if [ -z "$OMC_VERSION_DIR" ]; then
  echo "ERROR: OMC plugin not found in plugin cache"
  exit 1
fi

TARGET="${OMC_VERSION_DIR}dist/team/tmux-session.js"
HERDR_MODULE="/Users/isaiahrivera/.claude/hooks/herdr-multiplexer.mjs"

if [ ! -f "$HERDR_MODULE" ]; then
  echo "ERROR: herdr-multiplexer.mjs not found at $HERDR_MODULE"
  exit 1
fi

echo "Target: $TARGET"
echo "Herdr module: $HERDR_MODULE"

if grep -q "isHerdrContext" "$TARGET"; then
  echo "Herdr patches already applied. Nothing to do."
  exit 0
fi

echo "Applying herdr patches..."

# Edit 1: Add herdr import
sed -i '' \
  "s|import { configureTmuxClipboardForSession, configureTmuxClipboardForSessionAsync } from '../cli/tmux-clipboard.js';|import { configureTmuxClipboardForSession, configureTmuxClipboardForSessionAsync } from '../cli/tmux-clipboard.js';\nimport * as herdr from '${HERDR_MODULE}';|" \
  "$TARGET"

# Edit 2: Add HERDR_ENV check
sed -i '' \
  's/if (env.TMUX)/if (env.HERDR_ENV == '\''1'\'')\n        return '\''herdr'\'';\n    if (env.TMUX)/' \
  "$TARGET"

echo "Basic edits applied."
echo ""
echo "NOTE: For full patch restoration, re-run the full patch process from"
echo "the Claude session transcript, or manually re-apply the remaining edits"
echo "(herdr helpers, function branches). The full patch script is at:"
echo "~/.claude/hooks/herdr-multiplexer.mjs (this survives updates)"
