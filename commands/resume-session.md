---
description: Resume work from the latest lightweight session checkpoint
---

# Resume Session

Resume work from a lightweight session checkpoint.

This command resumes from the current project's project-local session artifacts. Use `/resume-handoff` only when resuming from a deliberate project-local transfer artifact.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read the current project's `session-index.md`.
3. If a session path or id is provided, read that session artifact fully.
4. If no argument is provided, use the most recent active session from the current project's `session-index.md`.
5. Read the current project's `state.md`.
6. Read the current project's `research-index.md`.
7. Read the current project's `artifacts.md`.
8. Run `node $HOME/.agents/scripts/resume-session-tools.mjs resume [session-path-or-id]`.
9. Treat the helper output as the execution-aware authority for lightweight session recovery:
   - if a live execution state exists, prefer `/start-work` over replaying stale session context
   - if the session conflicts with live execution state, surface that conflict explicitly
   - if there is no live execution state, preserve the session artifact's more specific recovery command when it is non-generic
10. If the active artifact working set needs sync, let the helper-backed session overrides win over heuristics when writing the current project's `state.md`.
   - Treat `/resume-session` as continuity-authoritative: explicit overrides win, persisted working-set entries are reused, and heuristics stay advisory unless you intentionally request `--mode refresh`.
11. Read any plan or research artifacts referenced by the session, plus the active working set artifacts that are still relevant.
12. Prefer the persisted working set over fresh heuristics when reporting current context.
13. If the current position came from a helper-backed checkpoint, preserve that persisted working set unless an explicit operator override or intentional `--mode refresh` says it should be refreshed.
14. Present:
   - current position
   - active artifacts
   - any execution or session conflicts
   - recovery strategy and whether it is live-execution recovery, compaction/context-pressure recovery, or ordinary session replay
   - suggested artifacts to read next
   - blockers
   - next recommended command
15. Update the current project's `state.md` so the resumed workflow matches the session artifact and the active artifact working set.

Only runtime continuity state is project-scoped here. Plans and research may be repo-local, while handoffs remain project-local transfer artifacts.

## If No Session Exists

- Say no lightweight session was found.
- Recommend `/session-start` or the most relevant workflow entry point.
