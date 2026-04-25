---
name: plan
description: "Planning workflow. Triggers: 'plan this', 'plan the', 'let's plan'. Start planning workflow."
---

# Plan Skill

A structured implementation planning workflow for turning ambiguous requests into actionable, verified plans.

## When to Activate

Trigger phrases: `plan this`, `plan the`, `let's plan`, `make a plan`, `plan the approach`, `break down the task`, or any explicit planning request that doesn't already have a concrete plan artifact.

## Workflow Overview

The plan skill creates detailed implementation plans through research, architecture consideration, dependency analysis, risk assessment, and test strategy — outputting actionable phases with verification checkpoints.

## Phases

### Phase 1: Scope Discovery

Before writing any plan:
- Identify the **goal** — what does success look like?
- Identify the **constraints** — time, scope, technology, policy, or budget limits
- Identify the **unknowns** — what information is missing that would change the approach?
- Clarify whether the request is a greenfield feature, refactor, bug fix, or integration

If intent is unclear, spend no more than 3 tool calls clarifying before proceeding.

### Phase 2: Research & Architecture

- Pull in relevant **codebase context** — existing patterns, reusable utilities, API contracts
- Check official documentation for any unfamiliar SDKs, frameworks, or APIs being considered
- Identify **boundary interfaces** — how does the new work touches existing code?
- Identify **off-ramps** — alternative approaches if the primary path is blocked

### Phase 3: Task Breakdown

Break the work into **logical phases** (not just a list of todos):
- Each phase should be **independently verifiable** — you should be able to run verification and get a clear pass/fail
- Sequence phases by **dependency order** — no phase depends on output from a later phase
- For each phase, specify:
  - **Entry criteria** — what must be true before starting
  - **Exit criteria** — what must be true before marking complete
  - **Verification method** — how to prove the phase is done correctly

### Phase 4: Risk Assessment

For each phase, flag:
- **Scope risk** — how broadly does this affect the system?
- **Reversibility** — how easily can this be undone?
- **Confidence** — low/medium/high based on knowledge and unknowns
- **Blockers** — what external dependencies could stop progress?

Flag any **irreversible** or **high-risk** decisions explicitly.

### Phase 5: Test Strategy

Define testing per phase:
- **Unit** — what can be tested in isolation?
- **Integration** — what requires a running system?
- **Manual** — what must be verified by hand?
- **Regression** — what existing behavior must not break?

If tests don't exist for the affected code, **lock behavior before changing it**.

### Phase 6: Output Artifact

Produce a plan document containing:

```
# [Feature/Change Name] — Implementation Plan

## Goal
One-paragraph statement of what this delivers and why it matters.

## Constraints
Bullet list of constraints that shaped the approach.

## Approach
High-level architectural summary — what paths were considered and why this one was chosen.

## Phases

### Phase 1: [Name]
**Entry:** ...
**Exit:** ...
**Verification:** ...
**Risks:** ...

### Phase 2: [Name]
...

## Risk Summary
Table: Phase | Scope Risk | Reversibility | Confidence | Blocker

## Test Strategy
How each phase will be verified.

## Open Questions
Any unresolved items that could change the plan.
```

## Verification Contract

Before claiming a plan is complete:
- All phases have **named entry/exit criteria**
- All phases have a **concrete verification method**
- Risks are **explicitly flagged**, not buried
- The plan does **not** conflate planning with implementation — it stops at "here's what to do and how to know if it worked"

## Constraints

- Plans should be **short enough to be reviewable** in one sitting — if a plan exceeds 10 phases, consider splitting into milestones
- Do **not** produce a plan that is just a list of files to edit — include architectural rationale and verification criteria
- If the user provides new information mid-plan, incorporate it and update rather than anchoring on the original scope
