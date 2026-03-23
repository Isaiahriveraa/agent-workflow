---
description: Detect project tooling defaults such as package manager and record them in canonical context
---

# Project Tooling

Detect environment-level tooling choices and persist them for later workflows.

## Process

1. Read `~/.agents/contexts/tooling.md` if it exists.
2. Detect the package manager with:
   - `node $HOME/.agents/scripts/package-manager-tools.mjs info`
3. Update `~/.agents/contexts/tooling.md` with:
   - detected package manager
   - detection source
   - project root used for detection
4. Present the recommended command shapes for:
   - install
   - run script
   - exec binary

## Output

Tell the user:
- detected package manager
- why it was chosen
- example commands to use in this repo
