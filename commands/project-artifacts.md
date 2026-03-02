---
description: Suggest the most relevant workflow artifacts to read next
---

# Project Artifacts

Suggest the most relevant plan, research, session, and handoff artifacts for the current workflow state.

## Process

1. Read `~/.agents/contexts/state.md`.
2. Read `~/.agents/contexts/session-index.md`.
3. Read `~/.agents/contexts/research-index.md`.
4. Read `~/.agents/contexts/artifacts.md`.
5. Run `node ./scripts/artifact-tools.mjs suggest`.
6. If the user accepts the suggested set or provides overrides, run `node ./scripts/artifact-tools.mjs persist --source project-artifacts --focus "[workflow focus]"` with the selected category paths to write the active working set back into `~/.agents/contexts/state.md`.
7. Present the active working set and the suggested artifacts by category, and explain why they were chosen.

## Output

Tell the user:
- the active working set
- the most relevant plan
- the most relevant research artifact
- the most relevant session artifact
- the most relevant handoff artifact
