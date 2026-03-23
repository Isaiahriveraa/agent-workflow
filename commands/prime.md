---
description: Prime a repo quickly before planning or implementation by loading the minimum useful context
---

# Prime

Use this command as a lightweight intake step before deeper planning or implementation work.

This command does not replace the full RPI workflow.
It exists to create a fast, structured understanding of the current repo so the next command can start with fewer blind spots.

## When To Use

Use `/prime` when:
- you just entered an unfamiliar repo
- you want a quick map before `/plan-feature`, `/create-plan`, or direct edits
- the user asks what the project looks like, how it is organized, or how to get started

## Required Reads

Load only the minimum useful context:

1. `~/.agents/AGENTS.md`
2. `~/.agents/contexts/tooling.md`
3. `~/.agents/contexts/verification.md`
4. The current repo's `.agents/repo.md` if it exists
5. The current repo's root `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or equivalent entry file when present
6. The current repo's README if present

## Process

1. Resolve the current project context with:
   - `node ~/.agents/scripts/project-context.mjs current`
2. Detect tooling defaults:
   - `node $HOME/.agents/scripts/package-manager-tools.mjs info`
3. Detect verification options:
   - `node $HOME/.agents/scripts/verification-tools.mjs`
4. Inspect high-signal repo structure:
   - top-level directories
   - app or src entry areas
   - tests
   - config files
5. Summarize only what is actionable for the next step

## Output

Return a compact repo brief in this shape:

```text
PRIME SUMMARY
- Project type: [...]
- Main stack: [...]
- Key entry areas: [...]
- Test and verification path: [...]
- Important repo-specific constraints: [...]

SYSTEM MAP
[ASCII diagram of the main system shape]

RECOMMENDED NEXT STEP
- /plan-feature [task]
- /create-plan [task or research artifact]
- direct implementation if scope is already narrow and clear
```

The `SYSTEM MAP` section is required.
Render a compact ASCII diagram that shows the repo's main execution shape, such as:
- entrypoints
- app or service layers
- data stores
- external integrations
- test surfaces

Example:

```text
SYSTEM MAP
[UI]
  |
  v
[API Routes] ---> [Services] ---> [DB]
     |                |
     |                +--------> [External API]
     |
     +--------> [Auth]

Tests:
- unit -> services
- integration -> API routes
```

## Guardrails

- Keep this command lightweight
- Do not create a full implementation plan here
- Do not invent architecture that the repo does not prove
- If the task is substantial, route to `/plan-feature` or `/create-plan` after priming
