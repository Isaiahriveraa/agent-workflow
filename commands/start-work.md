---
description: Initialize or resume project-local execution state for the active plan
---

# Start Work

Use this command to begin deterministic plan execution without creating a second workflow authority.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read the current project's `state.md`.
3. Read the current project's active plan from `## Related Plan` unless the user explicitly supplied another absolute plan path.
4. Read the current execution state first with `node ~/.agents/scripts/execution-state-tools.mjs read`.
5. If an active execution exists and its status is not terminal, resume it with:
   `node ~/.agents/scripts/execution-state-tools.mjs resume [--session-id ...] [--agent ...] [--worktree ...]`
6. If no active execution exists:
   - if exactly one incomplete plan is in scope, create execution state with
     `node ~/.agents/scripts/execution-state-tools.mjs create --plan [absolute plan path] [--session-id ...] [--agent ...] [--worktree ...]`
   - if multiple incomplete plans are candidates, stop and ask the user which plan to resume
7. After execution state is created or resumed:
   - run `node ~/.agents/scripts/execution-state-tools.mjs advise`
   - surface remaining task count, current task, and any cleanup guidance before continuing
   - `state.md` remains authoritative for workflow and artifact selection
   - execution JSON is only the execution-position sidecar
   - continue from `current_task_key`, not from the top of the plan

## Non-Negotiables

- Do not silently choose among multiple incomplete plans.
- Do not add execution JSON to the five working-set categories.
- Do not let execution JSON replace `state.md` as workflow authority.
- Prefer the current task from execution state over generic “start at the beginning” behavior.
