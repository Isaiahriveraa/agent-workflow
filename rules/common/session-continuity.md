# Session Continuity

Use lightweight sessions for normal workflow continuity and handoffs for deliberate transfer.

## Canonical Storage
- Lightweight session artifacts are project-local runtime artifacts under `[project root]/.agents/sessions/`.
- The live continuity metadata is project-local under `[project root]/.agents/contexts/state.md` and `[project root]/.agents/contexts/session-index.md`.
- Project-local handoffs live under `[project root]/thoughts/handoffs/`.

## Use A Session When
- You are pausing normal work and want to resume later.
- You need to preserve current state, blockers, and next action.
- The current conversation is getting long and you want a resumable checkpoint.

## Use A Handoff When
- Work is being transferred to another agent or another person.
- The context must be compacted into a richer artifact with learnings and references.
- You are intentionally closing one execution thread and handing off the rest.

## Session Requirements
- Record the current workflow stage.
- Record the active artifacts to read first.
- Record blockers and deferred ideas.
- Record the next recommended command or action.
- Preserve or refresh the active artifact working set so resume flows do not re-guess context.
