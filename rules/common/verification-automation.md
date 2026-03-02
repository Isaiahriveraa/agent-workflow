# Verification Automation

Verification should be derived from actual repo capabilities, not guessed from generic examples.

## Required Detection
- Detect package manager first.
- Detect available verification commands from `package.json` scripts and `Makefile` targets if present.

## Preferred Output
- Present a preferred verification order.
- Prefer one aggregate command when the repo already exposes it.
- Fall back to targeted checks only when an aggregate command is missing.

## Usage
- `node ./scripts/verification-tools.mjs detect`
- `node ./scripts/verification-tools.mjs plan`
- `node ./scripts/verification-tools.mjs runbook`

## Policy
- Commands and plans should reference actual project verification commands whenever possible.
- Generic examples like `make test` or `npm run lint` should be treated as placeholders, not defaults.
