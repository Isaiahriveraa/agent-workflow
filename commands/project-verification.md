---
description: Detect and summarize the repo's actual verification commands and preferred verification order
---

# Project Verification

Detect the verification commands available in the current repo and persist them as canonical workflow context.

## Process

1. Read `~/.agents/contexts/tooling.md`.
2. Read `~/.agents/contexts/verification.md` if it exists.
3. Detect verification commands with:
   - `node ./scripts/verification-tools.mjs detect`
4. Build a preferred verification plan with:
   - `node ./scripts/verification-tools.mjs plan`
5. Update `~/.agents/contexts/verification.md` with:
   - available checks
   - preferred order
   - command source
   - notes

## Output

Tell the user:
- the preferred verification command
- the fallback targeted commands
- which package manager format should be used
