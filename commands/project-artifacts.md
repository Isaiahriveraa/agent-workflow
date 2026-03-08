---
description: Suggest the most relevant workflow artifacts to read next
---

# Project Artifacts

Suggest the most relevant plan, research, session, and handoff artifacts for the current workflow state.

Only runtime continuity state is project-scoped here. Plans and research are typically repo-local runtime artifacts, while handoffs remain shared/global transfer artifacts.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read the current project's `state.md`.
3. Read the current project's `session-index.md`.
4. Read `~/.agents/contexts/research-index.md`.
5. Read the current project's `artifacts.md`.
6. Run `node ./scripts/artifact-tools.mjs suggest`.
7. If the user accepts the suggested set or provides overrides, run `node ./scripts/artifact-tools.mjs persist --source project-artifacts --focus "[workflow focus]"` with the selected category paths to write the active working set back into the current project's `state.md`.
   - Include `--intake` when a substantial-task intake artifact exists
8. When continuity helper flows have already persisted a working set, prefer that persisted set over recomputing a new one unless the user asks to override it.
9. Present the active working set and the suggested artifacts by category, and explain why they were chosen.

## Output

Tell the user:
- the active intake artifact
- the active working set
- the most relevant plan
- the most relevant research artifact
- the most relevant session artifact
- the most relevant handoff artifact

Use absolute filesystem paths for every artifact you list.
