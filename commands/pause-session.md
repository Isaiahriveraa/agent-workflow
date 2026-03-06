---
description: Create a lightweight session checkpoint for ordinary pause and resume workflows
---

# Pause Session

Create a lightweight resumable checkpoint without requiring a full handoff.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read `~/.agents/contexts/decisions.md`.
3. Read the current project's `state.md`.
4. Read the current project's `session-index.md`.
5. Read any directly relevant plan, research, or validation artifact referenced in the current project's `state.md`.
6. Write a session artifact under the current project's `thoughts/sessions/general/YYYY-MM-DD_HH-MM-SS_slug.md`.

## Required Sections

- Current position
- Completed work this session
- Active artifacts
- Decisions in force
- Blockers
- Next action
- Next recommended command

## Updates

After writing the session artifact:
- Mark the session as active in the current project's `session-index.md`
- Update the current project's `state.md` with the paused workflow position
- Preserve `## Related Plan`
- Preserve the active artifact working set so resume flows do not re-guess context

## Escalation

If the pause point requires richer transfer context, recommend `/create-handoff` instead of forcing a lightweight session.
