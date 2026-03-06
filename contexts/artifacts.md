# Artifact Retrieval Context

Use this file to describe where resumable workflow artifacts live and how they should be prioritized.

Only mutable runtime context is project-scoped. Durable workflow artifacts remain shared/global.

## Sources
- plans: `/Users/isaiahrivera/.agents/thoughts/plans`
- research: `/Users/isaiahrivera/.agents/thoughts/research`
- sessions: `~/.agents/projects/<project-id>/thoughts/sessions`
- handoffs: `/Users/isaiahrivera/.agents/thoughts/shared/handoffs`
- active working set metadata: `~/.agents/projects/<project-id>/contexts/state.md`

## Preferred Retrieval Order
1. active or explicitly requested project-local session artifact
2. related plan from the current project's runtime `state.md`
3. latest matching shared/global research artifact
4. latest matching shared/global handoff artifact

## Notes
- Use `node ./scripts/artifact-tools.mjs suggest` to retrieve likely relevant artifacts for the current project runtime state.
- Use `node ./scripts/artifact-tools.mjs active` to inspect the persisted project-local working set.
- Use `node ./scripts/artifact-tools.mjs persist --source [command] --focus "[workflow focus]"` to lock shared/global artifact selections into the current project's `state.md`.
- Existing absolute paths to global plans, research docs, and handoffs remain valid; no artifact migration is required.
