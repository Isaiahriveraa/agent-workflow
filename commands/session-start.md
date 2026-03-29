---
description: Start or refresh a lightweight work session with explicit workflow state
---

# Session Start

Start a lightweight resumable session for the current stream of work.

Use this command for ordinary pause/resume continuity. Shared handoffs are for deliberate transfer, not the default session path.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read `~/.agents/contexts/decisions.md`.
3. Read the current project's `state.md`.
4. Read the current project's `session-index.md`.
5. If the user referenced an existing plan, research doc, or session artifact, read it fully.
6. Create or refresh a lightweight session artifact under the current project's `.agents/sessions/general/YYYY-MM-DD_HH-MM-SS_slug.md`.
7. If an execution state already exists, run `node ~/.agents/scripts/execution-state-tools.mjs advise` and include its reminder or cleanup guidance in the session summary instead of writing a generic “continue” note.

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
- Update the current project's `session-index.md`
- Update the current project's `state.md`
- Set `## Current Workflow` to the active workflow
- Set `## Next Step` to the session's next action
- Set `## Related Plan` if applicable
- Preserve or initialize `## Active Artifact Working Set` for the current stream of work

## Output

Tell the user:
- session path
- session id
- next recommended command
