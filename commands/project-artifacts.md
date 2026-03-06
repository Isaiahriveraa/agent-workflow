---
description: Suggest the most relevant workflow artifacts to read next
---

# Project Artifacts

Suggest the most relevant plan, research, session, and handoff artifacts for the current workflow state.

Only runtime state is project-scoped here. Plans, research, and handoffs remain shared/global artifacts.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read the current project's `state.md`.
3. Read the current project's `session-index.md`.
4. Read `~/.agents/contexts/research-index.md`.
5. Read the current project's `artifacts.md`.
6. Run `node ./scripts/artifact-tools.mjs suggest`.
7. If the user accepts the suggested set or provides overrides, run `node ./scripts/artifact-tools.mjs persist --source project-artifacts --focus "[workflow focus]"` with the selected category paths to write the active working set back into the current project's `state.md`.
8. Present the active working set and the suggested artifacts by category, and explain why they were chosen.

## Output

Tell the user:
- the active working set
- the most relevant plan
- the most relevant research artifact
- the most relevant session artifact
- the most relevant handoff artifact
