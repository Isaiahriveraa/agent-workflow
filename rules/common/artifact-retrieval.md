# Artifact Retrieval

Prefer explicit artifact selection over broad context loading.

## Retrieval Goals
- Find the smallest set of files needed to resume or continue work.
- Prefer artifacts already referenced by session or workflow state.
- Fall back to recent matching artifacts only when no explicit reference exists.

## Sources
- `contexts/state.md`
- `contexts/session-index.md`
- `contexts/research-index.md`
- `thoughts/plans/`
- `.planning/research/`
- `.agents/sessions/`
- `thoughts/shared/handoffs/`

## Notes
- Canonical plans live under `thoughts/plans/`.
- Legacy repo-local `.planning/plans/` references remain readable during migration.

## Usage
- `node ./scripts/artifact-tools.mjs suggest`
- `node ./scripts/artifact-tools.mjs latest <category>`
- `node ./scripts/artifact-tools.mjs related`
