---
description: Create a lightweight session checkpoint for ordinary pause and resume workflows
---

# Pause Session

Create a lightweight resumable checkpoint without requiring a full handoff.

## Process

1. Read `~/.agents/contexts/decisions.md`.
2. Read `~/.agents/contexts/state.md`.
3. Read `~/.agents/contexts/session-index.md`.
4. Read any directly relevant plan, research, or validation artifact referenced in `contexts/state.md`.
5. Write a session artifact under `~/.agents/thoughts/sessions/general/YYYY-MM-DD_HH-MM-SS_slug.md`.

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
- Mark the session as active in `~/.agents/contexts/session-index.md`
- Update `~/.agents/contexts/state.md` with the paused workflow position
- Preserve `## Related Plan`
- Preserve the active artifact working set so resume flows do not re-guess context

## Escalation

If the pause point requires richer transfer context, recommend `/create-handoff` instead of forcing a lightweight session.
