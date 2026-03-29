---
description: Run repo diagnostics for workflow state, execution state, router resolution, adapter capability status, and memory health
---

# Project Doctor

Inspect the repo's current operational health through the shared diagnostics surface.

## Process

1. Resolve the current project context with:
   - `node ~/.agents/scripts/project-context.mjs current`
2. Run the diagnostics report:
   - `node $HOME/.agents/scripts/doctor.mjs report`
3. Present the results in a user-facing summary grouped by:
   - workflow and continuity state
   - active execution state
   - verification availability
   - router and provider resolution
   - adapter capability status
   - memory health
4. Call out warnings explicitly when the report is not fully healthy.

## Output

Tell the user:
- whether the repo is operationally healthy
- any warnings or degraded surfaces
- the most relevant next command or cleanup action
