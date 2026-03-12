---
description: Resume work from the latest lightweight session checkpoint
---

# Resume Session

Resume work from a lightweight session checkpoint.

This command resumes from the current project's project-local session artifacts. Use `/resume-handoff` only when resuming from a deliberate shared/global transfer artifact.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read the current project's `session-index.md`.
3. If a session path or id is provided, read that session artifact fully.
4. If no argument is provided, use the most recent active session from the current project's `session-index.md`.
5. Read the current project's `state.md`.
6. Read the current project's `research-index.md`.
7. Read the current project's `artifacts.md`.
8. Run `node ./scripts/artifact-tools.mjs suggest`.
9. If the active artifact working set needs refresh, run `node ./scripts/artifact-tools.mjs persist --source resume-session --focus "[workflow focus]"` with any category overrides needed to lock the resumed working set into the current project's `state.md`.
   - Treat freshness with the helper-backed model: explicit overrides win, but stale persisted intake/session/handoff selections may yield to stronger current-workflow suggestions.
10. Read any plan or research artifacts referenced by the session, plus the active working set artifacts that are still relevant.
11. Prefer the persisted working set over fresh heuristics when reporting current context.
12. If the current position came from a helper-backed checkpoint, preserve that persisted working set unless the helper-backed freshness model or an explicit operator override says it should be refreshed.
13. Present:
   - current position
   - active artifacts
   - suggested artifacts to read next
   - blockers
   - next recommended command
14. Update the current project's `state.md` so the resumed workflow matches the session artifact and the active artifact working set.

Only runtime continuity state is project-scoped here. Plans and research may be repo-local, while handoffs remain shared/global transfer artifacts.

## If No Session Exists

- Say no lightweight session was found.
- Recommend `/session-start` or the most relevant workflow entry point.
