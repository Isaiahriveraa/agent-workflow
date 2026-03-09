# Verification Context

Use this file to record the canonical automated checks available in the current repo.

## Available Checks
- validate:ssot
- test:workflows
- test:hooks
- test:sessions
- test:tooling
- test

## Preferred Order
1. validate:ssot
2. test

## Command Source
- package manager detection via `node ./scripts/package-manager-tools.mjs`
- verification detection via `node ./scripts/verification-tools.mjs`

## Notes
- Prefer the aggregate `test` script for normal verification.
- Use targeted scripts when diagnosing a specific workflow surface.
- Use workflow tests to enforce capsule selection, quality gates, and learning-loop contracts.
