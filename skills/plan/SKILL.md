---
name: plan
description: Turn messy intent into a repository-grounded, dependency-aware, production-minded local plan. Clarify the goal, research the repo with concrete architectural evidence, choose durable but proportionate foundations, decompose into independent concerns with explicit dependencies, and write vertical-slice steps with observable acceptance. Use when the user wants a plan before implementation.
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

### 0. Preflight inputs: existing design artifact

Before clarifying or researching, check whether the user supplied or the repository contains a relevant `context/designs/*.md` artifact. If one exists, read it fully and treat it as the design source of truth for the handoff. Verify its current-state evidence, desired behavior, citations, scope, and unresolved questions against the repository and the user's request; never silently trust an incomplete artifact. Carry verified decisions and open questions into the plan, and stop to ask the human when a material question remains unresolved.

This creates two valid paths:

- **Design present** — reuse the artifact's relevant, current, cited, sufficient external evidence for the plan's decisions and do not invoke a redundant full `/research` pass. Run targeted supplemental research only for material gaps, stale or conflicting evidence, or missing decisions, and record what was supplemented and why.
- **No design** — follow the mandatory repository and full external-evidence workflow below, including the `/research` protocol.

The design artifact is an input, not a separate handoff deliverable: write the resulting plan under `context/plans/<slug>/` and make its repository and external evidence traceable there.
### Design and issue handoff boundary

`/plan` is the canonical execution-plan owner between `/design` and `/to-issues`. It validates the complete design artifact against the repository and request, verifies and reuses sufficient evidence, and performs only targeted supplemental research for identified gaps. It then owns concern decomposition, dependency and parallelism reasoning, implementation-ready steps, and recording whether the plan is approved. Do not re-author the design's intent or design prose; preserve it as input while translating it into an executable plan. Do not leave decomposition or execution reasoning to `/to-issues`.


### 1. Clarify intent

Before planning, make sure you understand the goal. Ask the human to resolve anything materially ambiguous about the desired outcome, scope, or constraints. Do not turn vague wording directly into steps.

### 2. Research the repository

Ground every claim in the repo. Locate the files, modules, symbols, callers, configs, and tests involved; read representative implementation and test files. Identify relevant files and entry points without brittle line-number assumptions. Distinguish verified facts from assumptions; flag stale or conflicting architecture. Never invent files, symbols, or commands.

### 3. Research proven external implementations and documentation

Use the repository's `/research` protocol for a full pass when no relevant design artifact is available. When a relevant artifact is present, reuse its external evidence only after verifying that it is relevant, current, cited, and sufficient for the plan's decisions; otherwise perform targeted supplemental research for the identified gaps, stale or conflicting evidence, or missing decisions. In either path, produce and cite the evidence needed by the plan, and do not treat the design artifact as a substitute for verification.

Search for existing, demonstrably working implementations of the requested behavior and authoritative API documentation, prioritizing official documentation, maintained reference implementations, standards, and release notes. Also investigate relevant libraries, frameworks, protocols, providers, constraints, and known failure modes.

Treat external research as evidence, not a design substitute:

- Prefer primary sources and currently maintained material; verify that an implementation is real, relevant, and demonstrably working rather than copying an unverified snippet.
- Record URLs, source titles, access dates when useful, and the specific claim each source supports in a dedicated **External evidence** section or linked cited Markdown artifact.
- Reconcile external findings with repository evidence. Note version mismatches, conflicting guidance, unproven assumptions, and why the selected approach fits this repository.
- If a source is irrelevant, stale, inaccessible, or unsupported by evidence, exclude it and explain the exclusion when it affects a decision.
- If web search finds no credible implementation or documentation, say so explicitly, mark the affected decision as uncertain, and stop to ask when the uncertainty is material; do not silently proceed as though evidence exists.

The plan's repository evidence and external evidence sections must make it possible for an implementer to trace each material design choice to a source, whether that evidence was newly researched or verified and reused from the design artifact.

### 4. Define current vs desired behavior

- **Current behavior** — what exists today, referencing the relevant files, modules, or entry points without embedding code diffs.
- **Desired behavior** — what must exist after, observably.
- **Recommended approach & architecture** — explain the best way to approach the problem in clear, simple language (e.g. recommended algorithm, design patterns, data flow, how to optimize for the project's use case and goals). Think long term: why is this the optimal strategy? Never write code diffs or inline code implementations inside the plan; provide architectural clarity and let the implementer write the code against the live codebase.
- **Reuse / conventions / architecture constraints** — existing concepts, contracts, invariants, or decisions to reuse; repo conventions (style, naming, layout, error handling, state); architecture constraints that bound the design.
### 5. Decompose into deliverable capabilities (vertical slices)

Break the work into independent, demonstrable deliverable capabilities. Balance separation of concerns with developer usability: avoid hyper-fragmenting a single feature into shallow, disjointed micro-tickets. Never slice by technical layer (e.g. separate tickets for database schema, API route, and UI component); horizontal layers cannot be verified end-to-end and force reviewers to evaluate incomplete systems without observable behavior.

- **Initiative scale:** An initiative plan typically decomposes into **4 to 8 deliverable steps** (represented by step files `01-*.md`, `02-*.md` in `00-index.md`). If an initiative requires 15+ steps, it is almost certainly hyper-fragmented or needs to be split into multiple initiatives.
- **Deliverable concern boundary:** Each step file must represent one cohesive, independently demonstrable capability that a developer can understand in 30 seconds, implement, test, and ship.
- **Internal implementation phases vs. deliverable concerns:** Inside a step file, breaking down the tactical execution into sequential phases or sub-slices (e.g. `### Slice 1: Models`, `### Slice 2: Route`, `### Slice 3: UI`, `### Slice 4: Verification`) provides execution guidance. These sub-slices are **tactical checklist items for implementing that single step**, NOT separate deliverable steps or separate GitHub issues.

### 6. Declare dependencies

For each step, state its dependencies explicitly with a reason:

- **Start now** — no blockers; can begin immediately.
- **Concurrent** — independent of other steps; may run in parallel.
- **Blocked** — cannot start or be verified until another step closes; name the blocker and why.

Dependencies must be acyclic. Protect shared files: if two steps touch the same file or shared contract, they are sequential, not concurrent.

### 7. Order as vertical slices

Prefer behavior-complete vertical slices: "persist device registration end-to-end (API + UI)", not horizontal slices like "add table", "add repo", "add endpoint". When a developer completes a step, the capability should be demonstrable and verifiable. Do not force a vertical slice when the result is oversized or unreviewable.
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

### 11. Make durable, proportionate decisions

For every material decision that affects users, data, public contracts, security, reliability, or future delivery, record:

- **Foundation** — the smallest production-sound choice to make now.
- **Why now** — the concrete user, operational, or correctness risk it prevents.
- **Alternatives** — the realistic simpler and more elaborate options considered, and why neither is the better fit today.
- **Guardrail** — the test, contract, boundary, migration path, or operational control that keeps the choice safe.
- **Escalation signal** — a measurable trigger (usage, latency, failure rate, data volume, team need, or product requirement) that justifies extra complexity later.

Do not confuse long-term thinking with premature abstraction or infrastructure. Prefer a clear interface, strong invariant, reversible migration, and observable verification over speculative scale systems. If the plan intentionally defers a material concern, name the owner/signal that will reopen it; never hide it as a non-goal.

### 12. State non-goals

List what is explicitly out of scope, so nobody expands the plan.

## Local output

Write the completed plan under the current worktree's `context/plans/<slug>/` directory. Create `context/` and `context/plans/` when absent. Any multi-step plan has a `00-index.md` at the root of the plan directory.

Initialize the bundle from the repository generator before filling it:

```sh
python3 ~/.agents/scripts/new-artifact.py --type plans <slug>
```

Treat the generated `00-index.md` as the starting scaffold; do not replace it with an ad hoc template or write plan artifacts outside the canonical path. Simple single-concern work may be one file.

### 00-index.md fields

- **Concern map** — each concern and its step(s).
- **Dependency graph** — start-now / concurrent / blocked relationships.
- **Step index** — ordered list of step files with one-line summaries.

### Implementation-ready step fields

Each step file provides clear architectural and tactical direction without writing code inside the plan:

- **Goal** — one clear sentence defining the objective.
- **Relevant files & context** — files, modules, and symbols to touch, with location references (e.g. `src/server/auth.ts`) so implementers know where to look.
- **Approach & technical strategy** — explain the best way to go about it in clear language (e.g., recommended algorithm, design pattern, data flow, how to optimize for the project's use case).
- **Scope & Non-goals** — explicit **In-scope** boundaries vs. **Out-of-scope** non-goals.
- **Architectural decisions & trade-offs** — long-term considerations: why this approach is chosen, what alternatives were rejected, and how it aligns with future project goals.
- **Tests & edge cases** — behavior to verify and critical edge cases (failure, boundary, race conditions) for the implementer to handle.
- **Acceptance criteria** — binary, observable outcomes reachable through public interfaces.
- **Verification** — how to verify the step (test commands, checks, or observable results).
- **Dependencies** — start-now / concurrent / blocked with reasons.
- **Architecture impact** — Module/Interface/Implementation/Depth/Seam/Adapter/Leverage/Locality.
- **Implementation sub-slices / checklist (optional)** — ordered tactical phases for executing this step (e.g., model -> endpoint -> UI -> smoke test). These provide execution clarity for the developer or agent, but remain internal checklist items within this single deliverable step.
## Stop and ask

Stop and ask the human before proceeding when a decision is **materially unresolved** — behavior, architecture, or security — and the plan would commit to one side without their input. Do not ask for trivial or reversible choices.

## Done when

- Intent is clarified and recorded.
- Every claim is grounded in repository and architectural evidence without brittle line numbers.
- Concerns decompose by independent understand/implement/test/review/deliver.
- Dependencies are explicit, acyclic, with start-now/concurrent/blocked reasons.
- Steps are vertical slices, stacked only when dependency and review criteria hold.
- Tests, edge cases, and observable acceptance are specified.
- Architecture impact uses the full deep-module vocabulary.
- Every material user-facing decision has a proportionate foundation, explicit tradeoff, guardrail, and escalation signal.
- Non-goals are explicit.
- Output is written under `context/plans/<slug>/`, with `00-index.md` for multi-step plans.
- The human has approved the plan.
