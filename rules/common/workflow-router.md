# Workflow Router

Use this rule to enforce the canonical workflow gate for requests.

## Three-Tier Classification

The router classifies every request into one of three tiers:

### Tier 1 — Trivial
Single-file edits, config changes, typo fixes, simple renames. No workflow signals matched.
- **Flow**: Proceed directly to implementation. No research, planning, or critique required.
- **Next action**: `proceed-lightweight`

### Tier 2 — Moderate
Multi-file changes with clear scope, bounded feature additions, new hooks or subcommands. One signal matched (heavy or moderate weight).
- **Flow**: Plan, then implement. Research and RPI critique are optional.
- **Next action**: `plan-then-implement`

### Tier 3 — Substantial
Vague requests, cross-subsystem changes, workflow changes, large refactors. Two or more heavy signals, or one heavy plus one moderate.
- **Flow**: Full strict workflow (see Required Flow below).
- **Next action**: `optimize-prompt`

## When To Trigger Tier 3

Treat the request as substantial (tier 3) when two or more of these are true:
- the request is vague, under-specified, or mixes multiple goals
- the task is likely to touch 3+ files
- the task spans multiple subsystems
- the task is likely to take more than 30 minutes
- the task changes shared workflow behavior, prompts, rules, adapters, or continuity behavior
- the task needs research, planning, handoff, or delegation to execute safely

## Required Flow (Tier 3 Only)

For substantial requests, use this order:
1. optimize prompt
2. select capsule when the task class requires richer context assembly
3. research current state
4. score readiness
5. create a decision-complete plan
6. implement
7. validate
8. run the learning loop after verified failures or explicit corrections

Do not skip from intake to implementation.

## Tier 2 Flow

For moderate requests:
1. create a focused plan
2. implement
3. validate

Research and RPI critique are optional — use them when the scope is uncertain or the change touches unfamiliar code.

## Readiness Gate (Tier 3 Only)

Use `node ./scripts/workflow-router-tools.mjs score` to evaluate whether the task is ready for planning or execution.

Default scorecard:
- clarity: 25
- codebase coverage: 25
- constraints and acceptance criteria: 20
- risks and dependencies: 15
- verification path: 15

Pass conditions:
- total score `>= 70`
- clarity `>= 15`
- codebase coverage `>= 15`

If the gate fails:
- continue research, or
- ask focused questions that materially change the plan

Do not code while the gate is failing.

## Working Set Contract

Persist the current working set in the current project's `state.md`:
- intake
- plan
- research
- session
- handoff

Prefer persisted working-set entries over recomputing context during resume flows.

## Continuity Under Context Pressure

When context monitoring is enabled:
- warning threshold: create a checkpoint
- critical threshold: create a handoff and stop starting new complex work

Default automation mode is `handoff` unless the operator explicitly overrides it.
