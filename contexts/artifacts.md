# Artifact Retrieval Context

Use this file to describe where resumable workflow artifacts live and how they should be prioritized.

Runtime context and RPI artifacts are split by type: intake, plans, research, lightweight runtime continuity, and handoffs are project-local workflow artifacts.

Lightweight continuity artifacts are project-local runtime files. Project-local handoffs are transfer artifacts, not the ordinary pause/resume path.

## Sources
- intake: `[project root]/thoughts/intake`
- plans: `[project root]/thoughts/plans`
- research: `[project root]/thoughts/research`
- sessions: `[project root]/.omx/sessions`
- handoffs: `[project root]/thoughts/handoffs`
- active working set metadata: `[project root]/.omx/state/contexts/state.md`

## Preferred Retrieval Order
1. active or explicitly requested intake/session artifact from the current project's runtime state
2. related plan from the current project's runtime `state.md`
3. latest matching repo-local research artifact
4. latest matching project-local handoff artifact

## Notes
- Use `node ./scripts/artifact-tools.mjs suggest` to retrieve likely relevant artifacts for the current project runtime state.
- Use `node ./scripts/artifact-tools.mjs active` to inspect the persisted project-local working set.
- Use `node ./scripts/artifact-tools.mjs persist --source [command] --focus "[workflow focus]"` to lock the current repo's working set into the current project's `state.md`.
- Prefer persisted session and working-set selections over heuristics when resuming work.
- Persist an intake artifact when a substantial request has been normalized before research or planning.
- Legacy absolute paths to older repo-local plan docs remain readable, but new canonical plans should be written to `[project root]/thoughts/plans`.
