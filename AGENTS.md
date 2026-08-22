<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE CLEAR TASKS TO COMPLETION.
DO NOT ASK "SHOULD I PROCEED?" FOR OBVIOUS, LOW-RISK NEXT STEPS. IF BLOCKED, TRY A SAFE ALTERNATIVE. ASK ONLY FOR DESTRUCTIVE, IRREVERSIBLE, SECURITY-SENSITIVE, OR MATERIALLY AMBIGUOUS DECISIONS. <!-- END AUTONOMY DIRECTIVE -->

# Agent Contract

Top-level contract for this `.agents` hub. Commands, skills, adapters, and deeper `AGENTS.md` files extend it; deeper rules override only their scope.

## Skills & Routing

`skill-index` is the skill index and router: it maps every user-reachable skill and how the flows fit together. When deciding which skill fits a situation, read `skill-index`'s SKILL.md first.

Skills are either **user-invoked** (frontmatter `disable-model-invocation: true`; reachable only when the human names them) or **model-invoked** (the agent may reach them automatically).

Whenever you add, rename, remove, or re-route a skill, update `skill-index`'s SKILL.md and the README skills table so the map stays accurate. A new skill it never mentions, or a stale one it still routes to, is a router that lies.

## Operating Rules

1. **Test-driven development (TDD) — mandatory** — No implementation without a test. Write a failing test first and watch it fail (red), then write the minimal code to make it pass (green), then refactor. Never write production code without a failing test driving it; this applies to every change, not just non-trivial ones. Keep red→green cycles small and fast. Rule 8 defines what counts as a meaningful test; skipping only happens when that analysis concludes no test would catch a regression.
2. **Verify with lint, tests, and build** — Before reporting any work complete, run the repo's linter, its test suite (`npm test` or equivalent), and its build (`npm run build` or equivalent), and confirm all three pass. If a repo uses another toolchain (pnpm, yarn, cargo, …), use its equivalent commands. Never claim something works without running the checks that prove it.
3. **Read before writing** — Inspect relevant code, callers, tests, configuration, docs, and scoped instructions before editing.
4. **Define success first** — State the observable outcome and what evidence will prove it.
5. **Keep changes surgical and the repository clean** — Touch only what the task requires and match repository conventions; remove dead code, stale comments, and abandoned scaffolding exposed by the change without expanding scope.
6. **Prefer simplicity** — Use the smallest maintainable solution. Add interfaces, layers, or patterns only for a real boundary, testing seam, proven variation, or recurring problem.
7. **Design for humans** — Favor explicit, intention-revealing names using canonical domain language; avoid vague, clever, verbose, or directory-redundant names. Keep responsibilities cohesive, dependencies narrow, and dependency direction clear. Balance simplicity with flexibility: make likely next changes local without speculative extension points. Apply SOLID pragmatically, not ceremonially. Write code that reads like plain English; add a ≤2-line why/behavior comment only when the code alone can't convey a non-obvious decision. If a why needs more than two lines, rename or restructure instead of writing a longer comment.
8. **Test observable behavior, not implementation; test only what matters** — Assert outcomes reachable through public interfaces only (user-visible output, accessible roles/names/labels, returned values, error results) — never internals (class names, DOM nesting, private helpers, internal state). A test must survive harmless refactors unchanged; if a behavior test breaks, the behavior changed or the test over-coupled. Cover what can break or regress and carries real value; deliberately skip tests that only re-assert code, duplicate coverage, or lock down trivial wiring. When repeated setup makes tests noisy, create a small testing helper so tests describe behavior. Prefer unit, then focused integration/contract, then minimal end-to-end. Over-testing is waste — every test costs maintenance.
9. **Handle errors explicitly** — Never swallow failures. Preserve useful context with idiomatic error/result types.
10. **Document contracts with behavior tags** — For API endpoints and functions with a non-obvious input/output contract, use a short JSDoc-style block instead of prose. Describe behavior, not implementation; the signature stays the source of truth for types:

    ```
    /*
     * @behavior  <one sentence — what it does and who calls it>
     * @param     <name> — <its role in the behavior, not its type>
     * @returns   <what the caller gets and can rely on>
     * @exceptions <error/result values the caller must handle>
     */
    ```

    - Omit any tag that adds nothing; never restate the type signature. @exceptions is required when the function can fail in a way the caller must handle.
    - Keep auth/security requirements in the code that enforces them, not the comment.
    - Ordinary helpers and self-evident signatures use the ≤2-line inline rule (7) instead.

    Exceptions — do NOT use the block when:
    - The signature's names and types already make the behavior obvious.
    - The function is trivial: pass-through, getter/setter, one-line adapter.
    - The comment would only restate what the code or type system already says.
11. **Optimize where it runs hot; keep it simple where it doesn't** — Default to the simplest correct solution, but write efficient code by default in hot paths:
    - **Frontend**: avoid needless re-renders (stable callbacks/memoization where they matter, keyed lists), virtualize or paginate long lists, don't block the main thread (lazy images, deferred work).
    - **Backend**: no N+1 queries, index-aware, batch where possible, keep payloads minimal.
    - When unsure, measure: profile before micro-optimizing; in cold paths (setup, config, rarely-run code) readability wins. If you optimize, keep the code English-readable and comment *why* the optimization exists.
12. **Refactor safely** — Preserve observable behavior with tests and small reversible steps; do not mix unrelated features into refactors.
13. **Prefer evidence over confidence** — Never claim success when a relevant test, command, or runtime check can verify it.
14. **Fail clearly** — Report uncertainty, failed checks, incomplete work, and known risks directly.
15. **Use authoritative sources** — Check official documentation for unfamiliar or changing APIs before implementation.
16. **Never bypass correctness** — No unsafe casts, ignored type errors, empty catches, or equivalent suppression.
17. **Escalate prolonged blockers** — After sustained investigation ask with concrete options and evidence.
18. **Be extremely concise** — When reporting to the user, sacrifice grammar for concision. Shortest path from facts to understanding.
19. **Prefer one source of truth over repeated knowledge** — Before adding code, tests, configuration, schemas, queries, scripts, CI, documentation, or UI, search for an existing concept, contract, invariant, or decision that already solves the problem. Reuse, extend, parameterize, or compose it before creating code smell.

    - At the second real use, centralize genuinely shared behavior or values in the narrowest stable owner: constant, token, helper, module, component, schema constraint, query, configuration entry, test factory, or canonical documentation.
    - Express variations as data, parameters, or explicit variants when the underlying contract is the same; don't duplicate the shared base.
    - Fix duplication at the source, not at every caller.
    - Apply this to repeated logic, literals, validation, error handling, permissions, formatting, API shapes, database rules, test setup, and documentation.
    - Don't unify values that merely happen to be equal today but differ in meaning, ownership, or lifecycle.
    - Don't create speculative abstractions, generic frameworks, or forced inheritance to avoid harmless one-off code; preserve meaningful semantic differences.
    - Consolidate related duplication when the change is local, safe, and in scope.
    - Before finishing, ask: “If this changes tomorrow, how many places must be edited?” Reduce that number where correctness and clarity improve.
    - If duplication stays intentional, record the semantic reason in one short comment or the completion report.
20. **Codify repeated steps** — Before re-running a multi-step operation by hand, check `scripts/` and hub commands for an existing helper. When the same operation recurs and no helper exists, offer to script it — to cut agent token spend or give the user a reusable command. Offer, don't build: only create with approval.
21. **Ask before destructive or permission-expanding steps** — No new dependencies, destructive migrations, irreversible deletion, public contract breaks, permission expansion, or unrelated architecture changes without explicit authorization.

## Backend Learning Contract

The user is learning backend architecture. Every backend change (logic, data, API, packages, concurrency) must teach, not just ship. After every backend change, include a short **architectural explanation** — the user must be able to answer "how did you implement that?" in an interview from it, without the code:

- **What changed** — one line from 10,000 feet: the system before → the system after. High level first, always; if the change is complex, start at the top and break it down in simple layers — never lead with syntax or line-level detail.
- **What we used and why** — the package/pattern/function that carried the change (e.g. an index on `status`, a queue, an idempotency key), why this situation made it the right tool, and the alternative we didn't pick and why it lost. Mention functions/packages by name as landmarks only — no code dumps.
- **How it fits** — where it sits in the flow (request → handler → service → DB), who calls it, what it touches.

Trivial changes still get the one-line what/why — the habit matters more than the size. Backend/logic changes only; UI-only changes skip this.

## Human in the Loop

The agent owns execution. The human owns intent, architecture, and acceptance.

- Write code a reviewer can understand once, verify, and extend locally — boring-explicit over clever compression, variation at clear boundaries.
- Keep related behavior together and dependencies narrow; keep tests readable, deterministic, behavior-focused, and maintained with production code.
- Update established documentation when behavior, APIs, configuration, architecture, or workflows change; review the final diff as a maintainer and remove accidental complexity before completion.

## Concern Discipline

Every branch and PR addresses exactly one concern. This keeps the PR list small, reviewable, and fast to land.

- **One concern per branch/PR** — A concern is one feature, fix, refactor, or chore. Never mix two concerns in one branch or PR. If a commit message needs "and", it's two concerns.
- **New idea mid-task** — When the user raises a new idea while work is in flight, do not switch tracks. Acknowledge it, finish the current concern, then propose the idea as the next PR. If the current PR is a prerequisite for it, say so and sequence it after. If it is independent, propose a parallel worktree (below) instead of queueing it.
- **Parallel concerns → separate worktrees** — Independent concerns proceed in parallel via `git worktree add`: one worktree = one branch = one concern = one PR. This keeps every PR's diff isolated and reviewable with no stashing or branch switching. Never start a second concern inside the current worktree.
- **Commit** — Every commit goes through the `commit` skill (plan, get approval, then stage). Never commit directly.
- **PR** — Every PR goes through `pr-workflow` (check size, one concern per PR, generate the body). Never open a PR directly.
- **Propose before executing** — When multiple concerns are on the table, present the branch/worktree plan and merge sequencing for approval first. The agent owns execution; the human approves the plan, the commits, and the PRs.
- **Clean up after merge** — As soon as a branch (or its worktree) is merged, tear it down with `~/.agents/scripts/cleanup-worktree.sh <branch>`: it removes the worktree, deletes the merged local branch, and asks before deleting the remote branch. If a branch was merged without a worktree, delete the local branch with `git branch -d` and run `git worktree prune`. Never leave merged branches or stale worktrees behind — a clean `git worktree list` is the baseline for easy PR review.

## Implementation Mode

Default to direct implementation: one model, one session, working back and forth with the user. The main agent owns the whole cycle — plan, implement, test, verify — in a single context. This is the primary mode because it maximizes throughput and keeps every decision in one head. Do not fan out sub-agents by default.

Sub-agent workflows are opt-in, invoked through skills only when a task genuinely benefits from parallel decomposition:

- `spawn` — split a large, multi-file task with clear seams into parallel units.
- `enforce` — review-with-rationale gate before accepting delegated work, and hygiene pass over existing code.
- `code-review` — adversarial verification after integration.

When you do delegate, give each sub-agent complete context (goal, scope, constraints, relevant files, interfaces, repository rules, tests, expected output, explicit non-goals), split only independently decoupled work, require each to report decisions, files changed, verification, assumptions, and unresolved risks, and run the `enforce` gate before accepting. The main agent stays accountable for correctness, integration, and final acceptance.

## Verification

Before claiming completion:

1. Identify evidence for each important claim.
2. Run relevant tests, lint, typecheck, build, and runtime checks.
3. Read and interpret the output — never report a check as passing unless it was executed and its output inspected.
4. Fix failures and rerun checks.
5. Confirm requested behavior and integration paths work.
6. State checks not run and why.
7. Confirm no hidden pending work or known errors remain.

## Completion Report

Use the smallest report that preserves human ownership. Trivial changes: outcome, changed files, verification. Non-trivial changes: outcome, decisions, architecture (only when it clarifies), contracts, verification, changed files, risks — include only sections that carry information; drop empty ones. Full template and guidance: `references/completion-report.md`.
