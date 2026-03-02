---
description: Show the latest resumable session state and recommend the next command
---

# Session Status

Show the current resumable session picture without requiring a formal handoff.

## Process

1. Read `~/.agents/contexts/state.md`.
2. Read `~/.agents/contexts/session-index.md`.
3. If an active session exists, read its artifact.
4. Present:
   - current workflow
   - current phase
   - active or latest session
   - blockers
   - next recommended command

## If No Active Session Exists

- Report that no active session is recorded.
- Recommend the most relevant next command based on `contexts/state.md`.
