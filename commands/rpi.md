---
description: Simple front door for the full research -> plan -> implement -> validate workflow
---

# RPI

Use this command as the simple user-facing entrypoint for substantial work.

This command does not replace the canonical workflow assets. It orchestrates them:
- `commands/optimize-prompt.md`
- `commands/rpi-brainstorm.md`
- `commands/research_codebase.md`
- `commands/create-plan.md`
- `commands/implement_plan.md`
- `commands/validate_plan.md`
- `rules/common/workflow-router.md`

## Default Behavior

When the user invokes `/rpi`, keep the interaction simple and obvious:
- one short explanation of the workflow
- one current phase at a time
- one clear next action

Do not dump the full internal governance stack on the user unless it blocks progress.

## Initial Response

If no task or artifact path was provided, respond with:

```text
Give me the task and I’ll run it through research, plan, implementation, and validation.

You can paste the task directly or give me an absolute path to an existing research or plan artifact.
```

Then wait for input.

If the user already supplied a task or artifact path, start immediately.

## Orchestration Rules

1. Treat `/rpi` as the simple frontend, not a second workflow system.
2. Use `node ~/.agents/scripts/workflow-router-tools.mjs activate` to classify the task before choosing depth.
3. Follow the router result exactly:
   - Tier 1: do not force full RPI; explain that the task is lightweight and proceed directly
   - Tier 2: route to focused planning, then implementation, then validation
   - Tier 3: run the full strict workflow
4. If the router output indicates `ambiguityDetected: true` or `recommendedResearchEntry: brainstorm`, insert a `Brainstorm` phase before `Research`.
5. Keep user-facing updates phase-based:
   - `Brainstorm` when the request still needs clarification
   - `Research`
   - `Plan`
   - `Implement`
   - `Validate`
6. Keep internal rigor:
   - prompt optimization when required
   - clarification/brainstorming when required
   - readiness gating when required
   - critique cycles when required
   - artifact grading when required
   - memory recall when required
7. Do not expose every internal helper step unless the user asks or a gate fails.

When the brainstorm phase is required, route through `commands/rpi-brainstorm.md` and do not start `research_codebase.md` until the brief is concrete enough to research.

## Phase Flow

### Brainstorm

If the request is still ambiguous after prompt optimization:
- route through `commands/rpi-brainstorm.md`
- produce a short intake brief that names the goal, constraints, non-goals, candidate approaches, and research focus
- report back only:
  - what was clarified
  - which direction research will validate
  - where the brief lives

### Research

If no implementation-ready research artifact was provided:
- route through `commands/research_codebase.md`
- for substantial work, require the parser-backed research grade and critique flow before moving on

When reporting back, summarize only:
- what was researched
- what matters
- where the artifact lives

### Plan

Route through `commands/create-plan.md`.

When presenting the plan:
- keep the summary short
- make the main decision and tradeoffs obvious
- do not bury the user in workflow metadata

For substantial work, do not proceed until the plan is critique-complete and parser-backed as ready.

### Implement

Route through `commands/implement_plan.md`.

Execution should feel simple from the outside:
- announce the phase
- state the goal
- state the files or systems being touched
- execute
- verify

Keep TDD or test-first expectations explicit when they are relevant.

### Validate

Route through `commands/validate_plan.md`.

Validation should close the loop:
- what was built
- what passed
- what still needs human verification
- whether the work matches the plan

## User-Facing Style Contract

Prefer this shape:

```text
RPI flow for this task:
1. Brainstorm and clarify the request
2. Research the current state
3. Create the implementation plan
4. Implement in phases
5. Validate against the plan

Starting with Brainstorm.
```

When brainstorming is not required, omit that phase and start with Research.

Then keep each later handoff similarly compact.

## Guardrails

- Do not create a parallel artifact format for `/rpi`
- Do not bypass `rpi-brainstorm` when ambiguity is still blocking clean research
- Do not bypass `research_codebase`, `create-plan`, `implement_plan`, or `validate_plan` when they are required by the router
- Do not weaken readiness, critique, grading, or validation requirements for substantial work
- Do not make `/rpi` Claude-first or adapter-specific; it remains provider-agnostic
- Do not auto-run git branch, push, or PR actions unless the user explicitly asks
