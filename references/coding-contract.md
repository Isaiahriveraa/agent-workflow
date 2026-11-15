# Coding Contract

Rules for writing, testing, reviewing, and verifying code. `AGENTS.md` owns interaction, modes, speed, worktrees, safety, and approvals; this file owns code quality. Detail lives in `references/software-design.md` (interfaces and modules), `references/code-clarity.md` (names and comments), and `references/test-cleanup.md` (test hygiene).

**Operating model.** Humans define intent and architecture; agents implement, refactor, and test; deterministic checks verify; humans evaluate the outcome. Implementation is cheap, so boundaries, tests, and judgment carry the value.

## Rules

1. **TDD** — Failing test first, watch it fail, then the minimal code to pass. No production code without a driving test. Tests that prove behavior are permanent, frontend included. Tests that only pin how the UI is built (markup, classes, styles, snapshots, internal state) are scaffolding: propose removing them per `references/test-cleanup.md`.
2. **Enforce in tools, not prose** — A rule a repo relies on gets a deterministic check; a rule with no check is a hope. Every repo keeps a floor: test suite, linter and formatter, typechecker, build. It earns the rest from its shape: an architecture fitness function once there are layers, mutation testing where tests are the safety net, complexity ceilings and diff coverage once they mean something. When a violation appears twice, add the check instead of another reminder. Where a task depends on a missing check, add it or name the gap.
3. **Architecture is enforced, not suggested** — Dependencies point one way through the agreed layers (for example UI → application → domain, with infrastructure behind the domain's interfaces), checked in CI rather than trusted to memory. Favor deep modules and somewhat general-purpose interfaces per `references/software-design.md`. When fixing one thing keeps breaking another, inspect the structure; that loop is a design problem, not a prompting problem.
4. **Small increments** — Work one requirement at a time: implement, inspect, adjust, continue. Plans are short-lived working notes; when reality disagrees, the plan changes.
5. **Fresh context for significant work** — Full-speed work moves through focused stages with fresh context: Specifier → Coder → Cleaner (`code-judgment`) → Hardener → QA, using the existing skills and subagents. Inspect each stage's output before the next. Quick and Small work skips the pipeline.
6. **Verify before claiming done** — Run the repo's checks and read the output. Never report a check as passing unless it ran; name checks not run and why. Confirm the requested behavior works end to end. Report the tests you added and the behavior each proves, plus at most one line for the overall suite.
7. **Read before writing** — Inspect the code, callers, tests, and config you are about to change, and state the observable outcome that will prove success.
8. **Surgical changes** — Touch only what the task needs and match repo conventions. Keep relevant docs current when behavior or configuration changes. Remove dead code the change exposes.
9. **Locality of behavior** — Keep behavior obvious at the unit that owns it: colocate helpers with their caller and keep things that change together together.
10. **Test contracts, not implementation** — Name the guarantee a test protects and the realistic failure it must catch. Exercise the caller's interface and assert meaningful outcomes, not private structure. Use the smallest boundary that proves the guarantee, with real collaborators where practical. Judge every test twice: would a behavior-preserving refactor keep it green, and would a plausible defect make it fail?
11. **Errors explicit** — Never swallow failures; preserve context with idiomatic error or result types. Make ordinary cases normal outcomes where the domain permits (an empty lookup or a repeated delete need not be errors). Never conceal invalid business values, unauthorized access, or conflicting writes. Surface an error where the caller must decide.
12. **One source of truth** — Search for an existing concept, contract, or invariant before adding code, tests, config, schemas, scripts, or docs; reuse or extend it first. Duplication beats the wrong abstraction (Sandi Metz): extract once real uses reveal a stable contract (Rule of Three). Don't unify values that only look equal today but differ in meaning or lifecycle. Before finishing, ask: "If this changes tomorrow, how many places must be edited?"
13. **Code explains itself** — Write code a teammate can understand and safely change without its author. Use the project's canonical terms or plain English, never conversation shorthand or invented jargon. Names state the fact in product terms, so a comment that defines a name means the name failed. Prefer straightforward flow over clever compression. Comments carry intent and constraints the code cannot. Apply `references/code-clarity.md`.
14. **Document non-obvious contracts** — A short `@behavior / @param / @returns / @exceptions` block when the signature does not already say it; never restate types or describe internals.
15. **Optimize hot paths only** — No N+1 queries or needless re-renders; batch and paginate. Measure before micro-optimizing; cold paths favor readability.
16. **Refactor safely** — Preserve observable behavior in small reversible steps; never mix features into a refactor.
17. **Never bypass correctness** — No unsafe casts, ignored type errors, empty catches, or equivalent suppression.
18. **Codify repeated steps** — Reuse existing `scripts/` helpers; when an operation recurs with no helper, offer to script it.
19. **YAGNI** — Build only what a named, present requirement needs: a caller, a failing case, an acceptance criterion. Avoid over-validating inside a trusted boundary, overcommitting to unplanned features, defensive padding for unreachable failures, and unrequested polish. A somewhat general-purpose interface shape that replaces several narrow methods is the default, not speculation; new options, knobs, or extension points without a present need are. YAGNI never excuses a missing boundary check, an unhandled real error, or absent coverage for promised behavior.

## Design

Use `codebase-design` for meaningful backend, schema, ownership, invariant, interface, or dependency-direction changes. Routine changes on established contracts need only its quick existing-owner check. Product-flow work follows `references/workflow.md`.

## Commits and PRs

One concern per commit and PR; queue unrelated mid-task ideas instead of mixing them in. Commits go through the `commit` skill (the human reviewed the work) or `commit-review` (agent work that ran unattended), and PRs through the `pr` skill. Worktree placement follows `AGENTS.md`.

## Implementation Mode

Default: one session owns plan, implement, test, and verify. Subagents are opt-in via `orchestration`, `enforce`, and `code-review`. When delegating, use `references/agent-handoff.md`: give the stage, goal, scope, constraints, files, interfaces, tests, non-goals, and completion evidence, and stay accountable for correctness and integration. Preserve each specialist's restricted inputs and output format, especially blind reviews.
