<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE CLEAR TASKS TO COMPLETION.
DO NOT ASK "SHOULD I PROCEED?" FOR OBVIOUS, LOW-RISK NEXT STEPS. IF BLOCKED, TRY A SAFE ALTERNATIVE. ASK ONLY FOR DESTRUCTIVE, IRREVERSIBLE, SECURITY-SENSITIVE, OR MATERIALLY AMBIGUOUS DECISIONS. <!-- END AUTONOMY DIRECTIVE -->

# Agent Contract

Top-level contract for this `.agents` hub. Commands, skills, adapters, and deeper `AGENTS.md` files extend it; deeper rules override only their scope.

## Operating Rules

1. **Read before writing** — Inspect relevant code, callers, tests, configuration, docs, and scoped instructions before editing.
2. **Define success first** — State the observable outcome and what evidence will prove it.
3. **Keep changes surgical** — Touch only what the task requires. Match repository conventions.
4. **Prefer simplicity** — Use the smallest maintainable solution. Avoid speculative abstractions and unused flexibility.
5. **Design for humans** — Favor explicit names, low coupling, high cohesion, cohesive responsibilities, and clear dependency direction.
6. **Use abstractions deliberately** — Add interfaces, layers, or patterns only for a real boundary, testing seam, proven variation, or recurring problem.
7. **Test observable behavior, not implementation** — Red → green → refactor for non-trivial behavior; trivial changes may skip formal TDD. Assert only outcomes reachable through public interfaces (user-visible output, accessible roles/names/labels, returned values, error results) — never internals such as class names, DOM nesting or element types, private helpers, or internal state. A test must survive harmless refactors (renames, restructures, reimplementations) unchanged; if a behavior test breaks, either the behavior changed or the test over-coupled.
8. **Use testing APIs** — Extract repeated setup or internal test access into small helpers so tests describe behavior.
9. **Invest by feedback speed** — Prefer unit, then focused integration/contract, then minimal end-to-end tests.
10. **Handle errors explicitly** — Never swallow failures. Preserve useful context with idiomatic error/result types.
11. **Name by intent** — Use canonical domain language. Avoid vague, clever, verbose, or directory-redundant names.
12. **Let the code explain itself; comment the why only when it can't** — Write code that reads like plain English: names state intent (e.g. `hasThumbnail`, not `ht`), control flow is obvious, no clever compression. Treat comments as the fallback, not the default: add a ≤2-line why/behavior comment only when the code alone can't convey a non-obvious decision (rationale, constraint, invariant, edge-case trap). Never restate what the code does — a comment that paraphrases the next line gets deleted. If a why needs more than two lines, the code needs renaming or restructuring, not a longer comment.
13. **Document contracts with the block template** — For API endpoints and functions with a non-obvious input/output contract, use this block comment instead of prose. Fill in every applicable field; write `N/A` for the rest:

    ```
    /*
    Purpose: <one sentence — what this does and who calls it>
    Authentication/Authorization Requirements: <None | Logged in | isAdmin, ...>

    Expected Request Information (<r> indicates a required field to include in the call):
    - Parameters: <N/A or list>
    - Queries: <N/A or list>
    - Body: <N/A or list with types>

    Expected Response Information:
    - return <response shape with types>
    */
    ```

    Reserve this template for endpoint/route handlers and contract-bearing functions. Do not wrap ordinary helpers or UI components in it — those use the short inline rule (12).
14. **Optimize where it runs hot; keep it simple where it doesn't** — Default to the simplest correct solution, but write efficient code by default in hot paths:
    - **Frontend**: avoid needless re-renders (stable callbacks/memoization where they matter, keyed lists), virtualize or paginate long lists, don't block the main thread (lazy images, deferred work).
    - **Backend**: no N+1 queries, index-aware, batch where possible, keep payloads minimal.
    - When unsure, measure: profile before micro-optimizing; in cold paths (setup, config, rarely-run code) readability wins. If you optimize, keep the code English-readable and comment *why* the optimization exists.
15. **Keep the repository clean** — Remove dead code, stale comments, abandoned scaffolding, and artifacts exposed by the change without expanding scope.
16. **Refactor safely** — Preserve observable behavior with tests and small reversible steps; do not mix unrelated features into refactors.
17. **Prefer evidence over confidence** — Never claim success when a relevant test, command, or runtime check can verify it.
18. **Fail clearly** — Report uncertainty, failed checks, incomplete work, and known risks directly.
19. **Use authoritative sources** — Check official documentation for unfamiliar or changing APIs before implementation.
20. **Never bypass correctness** — No unsafe casts, ignored type errors, empty catches, or equivalent suppression.
21. **Escalate prolonged blockers** — After sustained investigation, use Oracle or ask with concrete options and evidence.
22. **Be extremely concise** — When reporting to the user, sacrifice grammar for concision. Shortest path from facts to understanding.
23. **Centralize repeated semantic values** — At the second real use, give a repeated implementation value one intention-revealing constant so one edit updates every consumer. Do not unify equal literals with different meanings, and keep test expectations independent from implementation constants.
24. **Codify repeated steps** — Before re-running a multi-step operation by hand, check `scripts/` and hub commands for an existing helper. When the same operation recurs and no helper exists, offer to script it — to cut agent token spend or give the user a reusable command. Offer, don't build: only create with approval.
25. **Prove the behavior before planning it** — When planning backend work, start with the smallest implementation that proves the riskiest assumption end-to-end (a spike: swaks send, curl, a 20-line script). Capture the evidence verbatim and build the plan on it; if the proof fails, the plan changes before real code is written. See `learn-plan`.
26. **Tutor mode: AI-assisted development means explaining, not just writing** — When the user is learning, explain the architecture big-picture first (one-sentence story, then layers, then files), let the user code the backend themselves while the AI explains the why, delegate frontend to specialists, and use DRIVE/DELEGATE vocabulary from `learning-mode`. See `learn-plan`.
27. **Name worktrees after their branch** — Worktree directory name must match the branch name (`/` → `-`): `feat/merch-page` → `feat-merch-page`, `merge/main-into-dev` → `merge-main-into-dev`. Create worktrees with `~/.agents/scripts/new-worktree.sh <branch> [start-point]` (derives the directory from the branch, initializes submodules); tear them down with `~/.agents/scripts/cleanup-worktree.sh <branch>`. Never invent unrelated directory names like `dev-edit` — the directory must be self-describing from the branch name alone.

## Human in the Loop

The agent owns execution. The human owns intent, architecture, and acceptance.

- Write code a reviewer can understand once, verify, and extend locally — boring-explicit over clever compression, variation at clear boundaries.
- Keep related behavior together and dependencies narrow; keep tests readable, deterministic, behavior-focused, and maintained with production code.
- Update established documentation when behavior, APIs, configuration, architecture, or workflows change; review the final diff as a maintainer and remove accidental complexity before completion.

## Subagent Strategy

Maximize subagent use for independent implementation work so the main agent preserves context and focuses on steering.

- The main agent decomposes work, defines boundaries, coordinates dependencies, integrates results, and verifies the whole system.
- Subagents should write scoped code rather than duplicate planning already owned by the main agent.
- Use the spawn skill before delegation to give each subagent complete context: goal, scope, constraints, relevant files, interfaces, repository rules, tests, expected output, and explicit non-goals.
- Split work only when tasks can proceed independently or have clear ownership boundaries.
- Prevent overlapping edits unless coordination is explicit.
- Require each subagent to report decisions, files changed, verification, assumptions, and unresolved risks.
- After every implementation subagent finishes, spawn `subagent-implementation-review` before accepting or integrating its work.
- Fix review findings, rerun verification, and repeat review when remediation is material.
- The main agent remains accountable for architectural consistency, instruction compliance, integration correctness, and final acceptance.

## Skill Routing

Invoke matching skills with `skill(name="skill-name")`.

| Domain | Skill(s) |
|---|---|
| Delegation/context enforcement | `spawn`, `enforce` |
| Frontend UI/UX | `impeccable`, `ui-ux-pro-max`, `frontend-design` |
| Architecture/refactoring | `improve-codebase-architecture` |
| Prototyping | `prototype` |
| Debugging | `diagnose` |
| Code review | `code-review`, `review` |
| Commits | `commit` |
| Testing | `tdd` |
| End-to-end testing | `e2e-testing-patterns` |
| Security | `security-review` |
| Performance | `performance` |
| Next.js | `next-best-practices` |
| Supabase/PostgreSQL | `supabase-postgres-best-practices` |
| Requirements | `discover` |
| Plan stress-testing | `grill-with-docs`, `ping-pong` |
| Explanations | `explain` |
| Git/PRs | `pr-workflow`, `commit` |
| Parallel issue-driven development, agents, worktrees, orchestration | `parallel-dev` |
| Parallel dev with Herdr CLI inbox coordination and worktrees | `parallel-dev-herdr-cli` |
| Issue discovery, decision issues, ambiguous-product exploration | `issue-discovery` |
| Planning | `to-plan`, `explore`, `discover` |
| Planning for learning / prove-first planning | `learn-plan` |
| Issue decomposition, publication | `to-issues` |
| Herdr panes | `herdr` |
| Session handoff | `handoff` via `/ch` |

## Execution Policy

- Work directly when delegation adds no value; otherwise delegate aggressively under the Subagent Strategy.
- Inspect local code and configuration before giving generic advice.
- Prefer deletion and reuse over new layers.
- Do not add dependencies without explicit approval.
- Stop before destructive migrations, irreversible deletion, public contract breaks, permission expansion, or unrelated architecture changes unless authorized.
- For cleanup/refactoring: plan, lock behavior with tests, then perform one focused pass at a time.

## Verification

Before claiming completion:

1. Identify evidence for each important claim.
2. Run relevant tests, lint, typecheck, build, and runtime checks.
3. Read and interpret the output.
4. Fix failures and rerun checks.
5. Confirm requested behavior and integration paths work.
6. State checks not run and why.
7. Confirm no hidden pending work or known errors remain.

Never report a check as passing unless it was executed and its output inspected.

## Completion Report

Use the smallest report that preserves human ownership.

- **Trivial changes**: outcome, changed files, verification.
- **Non-trivial changes**: outcome, decisions, architecture (only when it clarifies), contracts, verification, changed files, risks — include only sections that carry information; drop empty ones.

Full template and guidance: `~/.agents/references/completion-report.md`.
