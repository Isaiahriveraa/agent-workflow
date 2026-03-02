# Artifact Retrieval Context

Use this file to describe where resumable workflow artifacts live and how they should be prioritized.

## Sources
- plans: `/Users/isaiahrivera/.agents/thoughts/plans`
- research: `/Users/isaiahrivera/.agents/thoughts/research`
- sessions: `/Users/isaiahrivera/.agents/thoughts/sessions`
- handoffs: `/Users/isaiahrivera/.agents/thoughts/handoffs`

## Preferred Retrieval Order
1. active or explicitly requested session artifact
2. related plan from `contexts/state.md`
3. latest matching research artifact
4. latest matching handoff artifact

## Notes
- Use `node ./scripts/artifact-tools.mjs suggest` to retrieve likely relevant artifacts.
- Use `node ./scripts/artifact-tools.mjs active` to inspect the persisted working set.
- Use `node ./scripts/artifact-tools.mjs persist --source [command] --focus "[workflow focus]"` to lock the chosen working set into `contexts/state.md`.
