---
description: Create a lighter-weight, implementation-ready feature plan before escalating to the full create-plan workflow
---

# Plan Feature

Use this command when the user wants a focused implementation plan for a feature, bug fix, or scoped enhancement without jumping straight into the heavier full-planning workflow.

This command is a lightweight planning entrypoint.
If research reveals substantial scope, cross-subsystem changes, or unclear requirements, escalate to `/create-plan`.

## Initial Response

If no feature description or file path was provided, respond with:

```text
Describe the feature or fix you want planned, or pass a file path with the relevant brief, spec, or research.

Examples:
- /plan-feature add usage analytics to the dashboard
- /plan-feature /absolute/path/to/spec.md
```

Then wait for the user's input.

## Required Context

Before drafting the plan:

1. Read `~/.agents/AGENTS.md`
2. Read `~/.agents/contexts/decisions.md`
3. Resolve the current project with `node ~/.agents/scripts/project-context.mjs current`
4. Read the current project's `state.md` when existing workflow position matters
5. Read the current project's `research-index.md` if prior relevant research exists
6. Load only the relevant files from `~/.agents/rules/common/`
7. Determine task size with `node $HOME/.agents/scripts/workflow-router-tools.mjs activate`

## Planning Flow

1. Read any files the user explicitly provided, fully.
2. Inspect the repo enough to answer:
   - where the feature likely lives
   - what patterns already exist
   - what files are likely to change
   - how the work should be verified
3. If the task is substantial, ambiguous, or cross-subsystem:
   - stop using this lightweight path
   - route to `/create-plan`
4. If the task is still focused, produce a concise feature plan.

## Output

Return the plan in this shape:

```text
FEATURE PLAN

Goal
- [...]

Current Codebase Reality
- [...]

Files Likely To Change
- /absolute/path/one
- /absolute/path/two

Implementation Outline
1. [...]
2. [...]
3. [...]

Verification
- automated: [...]
- manual: [...]

Escalation Check
- Use /create-plan instead if [...]
```

## Escalation Rules

Escalate to `/create-plan` when any are true:
- likely to touch 3 or more files
- multiple subsystems are involved
- the request changes shared workflow behavior
- deeper research is required before planning safely
- the user wants a durable plan artifact rather than an inline feature plan

## Relationship To Other Commands

- `/prime` — quick repo intake before planning
- `/plan-feature` — lightweight focused plan
- `/create-plan` — full decision-complete plan
- `/execute` or `/implement_plan` — execute an approved plan
