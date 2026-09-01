---
name: plan
description: Turn messy intent into a repository-grounded, dependency-aware, testable local plan. Clarify the goal, research the repo with file:line evidence, decompose into independent concerns with explicit dependencies, and write vertical-slice steps with observable acceptance. Use when the user wants a plan before implementation.
argument-hint: "[I need you to plan]"
shell-timeout: 20
---

# Plan

Turn messy intent into a repository-grounded, dependency-aware, testable local plan. The plan is the product: an implementation agent with zero session context must be able to execute, test, and review it.

## When to use

- The user wants a plan before implementation, or hands you a fuzzy idea.
- You need to decompose work into ordered, independently reviewable steps.
- You want a local plan file an agent can follow.

## Workflow

### 1. Clarify intent

Before planning, make sure you understand the goal. Ask the human to resolve anything materially ambiguous about the desired outcome, scope, or constraints. Do not turn vague wording directly into steps.

### 2. Research the repository

Ground every claim in the repo. Locate the files, modules, symbols, callers, configs, and tests involved; read representative implementation and test files. Cite concrete evidence as `path/to/file.ext:line`. Distinguish verified facts from assumptions; flag stale or conflicting architecture. Never invent files, symbols, or commands.

### 3. Research proven external implementations and documentation

Use the repository's `/research` protocol for this pass: delegate background research, use web search, and produce a cited Markdown evidence artifact before finalizing the plan. Search for existing, demonstrably working implementations of the requested behavior and authoritative API documentation, prioritizing official documentation, maintained reference implementations, standards, and release notes. Also investigate relevant libraries, frameworks, protocols, providers, constraints, and known failure modes.

Treat external research as evidence, not a design substitute:

- Prefer primary sources and currently maintained material; verify that an implementation is real, relevant, and demonstrably working rather than copying an unverified snippet.
- Record URLs, source titles, access dates when useful, and the specific claim each source supports in a dedicated **External evidence** section or linked cited Markdown artifact.
- Reconcile external findings with repository evidence. Note version mismatches, conflicting guidance, unproven assumptions, and why the selected approach fits this repository.
- If a source is irrelevant, stale, inaccessible, or unsupported by evidence, exclude it and explain the exclusion when it affects a decision.
- If web search finds no credible implementation or documentation, say so explicitly, mark the affected decision as uncertain, and stop to ask when the uncertainty is material; do not silently proceed as though evidence exists.

The plan's repository evidence and external evidence sections must make it possible for an implementer to trace each material design choice to a source.

### 4. Define current vs desired behavior

- **Current behavior** — what exists today, with evidence.
- **Desired behavior** — what must exist after, observably.
- **Reuse / conventions / architecture constraints** — existing concepts, contracts, invariants, or decisions to reuse; repo conventions (style, naming, layout, error handling, state); architecture constraints that bound the design.

### 5. Decompose into concerns

Break the work into independent concerns, each sized for one reviewable unit. Base the decomposition on how each concern is independently **understood**, **implemented**, **tested**, **reviewed**, and **delivered** — not on file layout. If a concern cannot be understood, implemented, tested, reviewed, and delivered on its own, split it.

### 6. Declare dependencies

For each step, state its dependencies explicitly with a reason:

- **Start now** — no blockers; can begin immediately.
- **Concurrent** — independent of other steps; may run in parallel.
- **Blocked** — cannot start or be verified until another step closes; name the blocker and why.

Dependencies must be acyclic. Protect shared files: if two steps touch the same file or shared contract, they are sequential, not concurrent.

### 7. Order as vertical slices

Prefer behavior-complete vertical slices: "persist device registration end-to-end", not "add table", "add repo", "add endpoint". Do not force a vertical slice when the result is oversized or unreviewable.

### 8. Stack only when criteria hold

Stacking (running steps in sequence where each builds on the previous) is allowed only when **both** the dependency criterion (the later step genuinely depends on the earlier one) **and** the review criterion (each step is still independently reviewable) hold. Otherwise keep steps concurrent or split them.

### 9. Specify tests, edge cases, acceptance

Every step must state:

- **Tests** — the behavior to verify and how.
- **Edge cases** — real failure/empty/error/race states, not generic advice.
- **Observable acceptance criteria** — binary, observable outcomes reachable through public interfaces.

### 10. Assess architecture impact

For each step, note its architecture impact using the deep-module vocabulary:

- **Module** — the cohesive unit of behavior.
- **Interface** — the public boundary.
- **Implementation** — what lives behind the interface.
- **Depth** — how much complexity the interface hides.
- **Seam** — where the module can be tested or varied.
- **Adapter** — a boundary translating between contracts.
- **Leverage** — how much downstream work one decision unlocks.
- **Locality** — how contained a change is.

### 11. State non-goals

List what is explicitly out of scope, so nobody expands the plan.

## Local output

Write the plan under the current worktree's `context/plans/<slug>/` directory. Create `context/` and `context/plans/` when absent.

- Any multi-step plan has a `00-index.md` at the root of the plan directory.
- Avoid unnecessary nesting; simple single-concern work may be one file.

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
- `/research` supplies the mandatory external-evidence pass for plans; invoke it standalone when a cited research Markdown artifact is needed without a plan.
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
- Output is written under `context/plans/<slug>/`, with `00-index.md` for multi-step plans.
- The human has approved the plan.
