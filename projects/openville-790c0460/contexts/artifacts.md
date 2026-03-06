# Artifact Retrieval Context

Use this file to describe how the current project's runtime state should select from shared/global workflow artifacts.

## Sources
- plans: ~/.agents/thoughts/plans
- research: ~/.agents/thoughts/research
- sessions: [project thoughts]/sessions
- handoffs: ~/.agents/thoughts/shared/handoffs

## Preferred Retrieval Order
1. active or explicitly requested session artifact
2. related plan from the current project's state file
3. latest matching shared research artifact
4. latest matching shared handoff artifact

## Notes
- Use `node ./scripts/artifact-tools.mjs suggest` to retrieve likely relevant artifacts for the current project.
- Use `node ./scripts/artifact-tools.mjs active` to inspect the persisted working set for the current project.
- Use `node ./scripts/artifact-tools.mjs persist --source [command] --focus "[workflow focus]"` to lock the chosen working set into the current project's state file.
