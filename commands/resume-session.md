---
description: Resume work from the latest lightweight session checkpoint
---

# Resume Session

Resume work from a lightweight session checkpoint.

## Process

1. Read `~/.agents/contexts/session-index.md`.
2. If a session path or id is provided, read that session artifact fully.
3. If no argument is provided, use the most recent active session from `contexts/session-index.md`.
4. Read `~/.agents/contexts/state.md`.
5. Read `~/.agents/contexts/research-index.md`.
6. Read `~/.agents/contexts/artifacts.md`.
7. Run `node ./scripts/artifact-tools.mjs suggest`.
8. If the active artifact working set is missing or stale, run `node ./scripts/artifact-tools.mjs persist --source resume-session --focus "[workflow focus]"` with any category overrides needed to lock the resumed working set into `~/.agents/contexts/state.md`.
9. Read any plan or research artifacts referenced by the session, plus the active working set artifacts that are still relevant.
10. Prefer the persisted working set over fresh heuristics when reporting current context.
11. Present:
   - current position
   - active artifacts
   - suggested artifacts to read next
   - blockers
   - next recommended command
12. Update `~/.agents/contexts/state.md` so the resumed workflow matches the session artifact and the active artifact working set.

## If No Session Exists

- Say no lightweight session was found.
- Recommend `/session-start` or the most relevant workflow entry point.
