---
description: Start or refresh a lightweight work session with explicit workflow state
---

# Session Start

Start a lightweight resumable session for the current stream of work.

## Process

1. Read `~/.agents/contexts/decisions.md`.
2. Read `~/.agents/contexts/state.md`.
3. Read `~/.agents/contexts/session-index.md`.
4. If the user referenced an existing plan, research doc, or session artifact, read it fully.
5. Create or refresh a session artifact under `~/.agents/thoughts/sessions/general/YYYY-MM-DD_HH-MM-SS_slug.md`.

## Session Artifact Format

Write a concise checkpoint with:

```markdown
---
session_id: [timestamp-slug]
date: [ISO timestamp]
topic: "[short topic]"
status: active
related_plan: [path or none]
related_research:
  - [path]
next_command: [recommended command]
---

# Session: [topic]

## Current Position
- Workflow:
- Phase:
- Focus:

## Active Artifacts
- [path]

## Decisions In Force
- [key decision]

## Blockers
- [blocker or none]

## Next Action
- [specific next step]
```

## Index and State Updates

After writing the session artifact:
- Update `~/.agents/contexts/session-index.md`
- Update `~/.agents/contexts/state.md`
- Set `## Current Workflow` to the active workflow
- Set `## Next Step` to the session's next action
- Set `## Related Plan` if applicable
- Preserve or initialize `## Active Artifact Working Set` for the current stream of work

## Output

Tell the user:
- session path
- session id
- next recommended command
