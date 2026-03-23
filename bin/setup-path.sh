#!/usr/bin/env bash
# Setup script to add agents-memory to PATH
# Add this to your shell RC file (~/.bashrc, ~/.zshrc, etc.)

AGENTS_BIN="$HOME/.agents/bin"

if [[ ! -d "$AGENTS_BIN" ]]; then
  echo "Error: $AGENTS_BIN does not exist" >&2
  exit 1
fi

SHELL_RC=""
if [[ -n "${BASH_VERSION:-}" ]]; then
  SHELL_RC="$HOME/.bashrc"
elif [[ -n "${ZSH_VERSION:-}" ]]; then
  SHELL_RC="$HOME/.zshrc"
fi

if [[ -n "$SHELL_RC" ]] && [[ -f "$SHELL_RC" ]]; then
  if ! grep -q "agents/bin" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# MEM0 memory access for all CLIs" >> "$SHELL_RC"
    echo "export PATH=\"\$HOME/.agents/bin:\$PATH\"" >> "$SHELL_RC"
    echo "Added to $SHELL_RC"
  else
    echo "PATH already configured in $SHELL_RC"
  fi
fi

echo "Alternatively, create a symlink:"
echo "  ln -s $AGENTS_BIN ~/bin"
echo ""
echo "Then open a new terminal or run:"
echo "  source $SHELL_RC"
