---
description: Show the latest resumable session state and recommend the next command
---

# Session Status

Show the current resumable session picture without requiring a formal handoff.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read the current project's `state.md`.
3. Read the current project's `session-index.md`.
4. If an active session exists, read its artifact.
5. Present:
   - current workflow
   - current phase
   - active or latest session
   - blockers
   - next recommended command

## If No Active Session Exists

- Report that no active session is recorded.
- Recommend the most relevant next command based on the current project's `state.md`.
