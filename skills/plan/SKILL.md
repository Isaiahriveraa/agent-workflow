---
name: plan
description: Turn messy intent into a repository-grounded, dependency-aware, testable local plan, then publish the completed plan through the existing plan-server script. Clarify the goal, research the repo with file:line evidence, decompose into independent concerns with explicit dependencies, and write vertical-slice steps with observable acceptance. Use when the user wants a plan before implementation.
argument-hint: "[I need you to plan]"
shell-timeout: 20
---

# Plan

Turn messy intent into a repository-grounded, dependency-aware, testable local plan. The plan is the product: an implementation agent with zero session context must be able to execute, test, and review it.

## When to use

- The user wants a plan before implementation, or hands you a fuzzy idea.
- You need to decompose work into ordered, independently reviewable steps.
- You want a local plan file and its explicit plan-server artifact an agent can follow.

## Workflow

### 1. Clarify intent

Before planning, make sure you understand the goal. Ask the human to resolve anything materially ambiguous about the desired outcome, scope, or constraints. Do not turn vague wording directly into steps.

### 2. Research the repository

Ground every claim in the repo. Locate the files, modules, symbols, callers, configs, and tests involved; read representative implementation and test files. Cite concrete evidence as `path/to/file.ext:line`. Distinguish verified facts from assumptions; flag stale or conflicting architecture. Never invent files, symbols, or commands.

### 3. Define current vs desired behavior

- **Current behavior** — what exists today, with evidence.
- **Desired behavior** — what must exist after, observably.
- **Reuse / conventions / architecture constraints** — existing concepts, contracts, invariants, or decisions to reuse; repo conventions (style, naming, layout, error handling, state); architecture constraints that bound the design.

### 4. Decompose into concerns

Break the work into independent concerns, each sized for one reviewable unit. Base the decomposition on how each concern is independently **understood**, **implemented**, **tested**, **reviewed**, and **delivered** — not on file layout. If a concern cannot be understood, implemented, tested, reviewed, and delivered on its own, split it.

### 5. Declare dependencies

For each step, state its dependencies explicitly with a reason:

- **Start now** — no blockers; can begin immediately.
- **Concurrent** — independent of other steps; may run in parallel.
- **Blocked** — cannot start or be verified until another step closes; name the blocker and why.

Dependencies must be acyclic. Protect shared files: if two steps touch the same file or shared contract, they are sequential, not concurrent.

### 6. Order as vertical slices

Prefer behavior-complete vertical slices: "persist device registration end-to-end", not "add table", "add repo", "add endpoint". Do not force a vertical slice when the result is oversized or unreviewable.

### 7. Stack only when criteria hold

Stacking (running steps in sequence where each builds on the previous) is allowed only when **both** the dependency criterion (the later step genuinely depends on the earlier one) **and** the review criterion (each step is still independently reviewable) hold. Otherwise keep steps concurrent or split them.

### 8. Specify tests, edge cases, acceptance

Every step must state:

- **Tests** — the behavior to verify and how.
- **Edge cases** — real failure/empty/error/race states, not generic advice.
- **Observable acceptance criteria** — binary, observable outcomes reachable through public interfaces.

### 9. Assess architecture impact

For each step, note its architecture impact using the deep-module vocabulary:

- **Module** — the cohesive unit of behavior.
- **Interface** — the public boundary.
- **Implementation** — what lives behind the interface.
- **Depth** — how much complexity the interface hides.
- **Seam** — where the module can be tested or varied.
- **Adapter** — a boundary translating between contracts.
- **Leverage** — how much downstream work one decision unlocks.
- **Locality** — how contained a change is.

### 10. State non-goals

List what is explicitly out of scope, so nobody expands the plan.

## Local output

Write the plan locally. Honor an existing repo convention for plan output if one exists; otherwise default to `.omo/plans/<slug>/`.

- Any multi-step plan has a `00-index.md` at the root of the plan directory.
- Avoid unnecessary nesting; simple single-concern work may be one file.

## Publish to plan-server

After the local plan is complete, publish its canonical file through the existing plan-server script:

```bash
node "${SKILL_DIR}/../plan-server/scripts/plan-server.mjs" \
  --input-file "$PLAN_FILE" \
  --title "$PLAN_TITLE"
```

The script writes the MDX artifact under the plan-server root resolved by `scripts/plan-server-path`, starts or verifies the server, and returns JSON containing the published `file` and `url`. Return both the local plan path and those server values. If publishing fails, keep the local plan and report the failure; do not silently claim publication succeeded.

### 00-index.md fields

- **Concern map** — each concern and its step(s).
- **Dependency graph** — start-now / concurrent / blocked relationships.
- **Step index** — ordered list of step files with one-line summaries.

### Implementation-ready step fields

Each step file includes:

- **Goal** — one sentence.
- **Repository evidence** — file:line references grounding the change.
- **Changes** — concrete changes to files/modules.
- **Tests / edge cases** — behavior to verify and real edge cases.
- **Acceptance criteria** — binary, observable.
- **Verification** — exact command + expected result.
- **Dependencies** — start-now / concurrent / blocked with reasons.
- **Architecture impact** — Module/Interface/Implementation/Depth/Seam/Adapter/Leverage/Locality.
- **Non-goals** — what this step does not touch.

## Relationship to sibling skills

- `/to-tickets` consumes an **approved** plan and breaks it into focused tickets.
- `/issue-delivery` delivers a **ready** issue through an isolated worktree to a draft PR.
- `/to-spec` remains a GitHub spec workflow (Problem/Stories/Decisions/OutOfScope).
- `/research` is external-source research, not repository planning.
- `/plan-server` is the publishing utility used after local planning; it does not clarify, research, or decompose work.
- `/codebase-design` is unchanged; it deepens module interfaces, this skill plans work.

## Stop and ask

Stop and ask the human before proceeding when a decision is **materially unresolved** — behavior, architecture, or security — and the plan would commit to one side without their input. Do not ask for trivial or reversible choices.

## Done when

- Intent is clarified and recorded.
- Every claim is grounded in file:line evidence.
- Concerns decompose by independent understand/implement/test/review/deliver.
- Dependencies are explicit, acyclic, with start-now/concurrent/blocked reasons.
- Steps are vertical slices, stacked only when dependency and review criteria hold.
- Tests, edge cases, and observable acceptance are specified.
- Architecture impact uses the full deep-module vocabulary.
- Non-goals are explicit.
- Output honors the repo convention or `.omo/plans/<slug>/`, with `00-index.md` for multi-step plans.
- The completed local plan is published through the existing plan-server script, with its returned file and URL recorded.
- The human has approved the plan.
