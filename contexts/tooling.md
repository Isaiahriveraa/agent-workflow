# Tooling Context

Use this file to record environment-level automation choices that should not be rediscovered every session.

## Package Manager
- detected: npm
- source: package-lock or package.json default
- root: repo root

## Notes
- Use `node ./scripts/package-manager-tools.mjs` to detect or format package-manager commands.
- Continuity automation defaults to `handoff` and is controlled by `AGENTS_CONTINUITY_AUTOMATION`.
- Supported values:
  - `off`: warning-only context monitoring
  - `checkpoint`: warning and critical thresholds create lightweight continuity checkpoints
  - `handoff`: warning creates a checkpoint and critical creates a handoff
