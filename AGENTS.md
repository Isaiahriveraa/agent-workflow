<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE CLEAR TASKS TO COMPLETION.
DO NOT ASK "SHOULD I PROCEED?" FOR OBVIOUS, LOW-RISK NEXT STEPS. IF BLOCKED, TRY A SAFE ALTERNATIVE. ASK ONLY FOR DESTRUCTIVE, IRREVERSIBLE, SECURITY-SENSITIVE, OR MATERIALLY AMBIGUOUS DECISIONS. <!-- END AUTONOMY DIRECTIVE -->

# Agent Contract

Top-level contract for this `.agents` hub. Commands, skills, adapters, and deeper `AGENTS.md` files extend it; deeper rules override only their scope.

**Operating model.** Humans define intent and architecture; agents implement, refactor, and test; deterministic checks verify; humans evaluate the outcome. AI makes implementation cheap — which raises the value of what it cannot verify for itself: boundaries, tests, and judgment. Keep this file small: it states values and routes work; enforcement and detail live in the repos' checks and in skills.

## Rules

1. **TDD** — Failing test first, watch it fail, then the minimal code to pass. No production code without a driving test. Tests that prove behavior are permanent, frontend included; tests that only pin how the UI is built — markup, classes, styles, snapshots, internal state — are scaffolding: delete them before commit unless the human asked to keep them.
2. **Enforce in tools, not prose** — Reminders buried in a large prompt get ignored; a failing check cannot be. A rule a repo relies on gets a deterministic check; no check, no enforcement — a rule with no check is a hope. Two tiers: every repo keeps a floor — test suite, linter + formatter, typechecker, build — and earns the rest from its own shape: an architecture fitness function once there are layers to protect, mutation testing where the tests are the safety net, complexity ceilings and diff coverage once the codebase is big enough for them to mean something. When the same violation appears twice, add the check instead of another reminder; when a check exists, delete the repo prose that restated it. Where a task's quality depends on a check the repo lacks, add it or surface the gap in the report.
3. **Architecture is enforced, not suggested** — Dependencies point one way through the agreed layers — e.g. UI → application → domain, with infrastructure behind the domain's interfaces — and the direction is checked in CI (import-linter, dependency-cruiser, ArchUnit, or the repo's equivalent), not trusted to memory. Favor deep modules: a small, stable interface over rich internals; no shallow wrappers, speculative layers, or classitis (Ousterhout). An agent can use a deep module without loading its implementation into context. When an agent loops between fixing one thing and breaking another, stop rewriting the prompt and inspect the structure — that loop is a design problem, not a prompting problem.
4. **Small increments, inspect often** — Agents over-produce plans, and a big plan is waterfall: it fails on contact with the code. Work one requirement at a time — implement, inspect the result, adjust the architecture, take the next requirement. Plans are short-lived working notes, not contracts: when reality disagrees, the plan changes. AI development should look more agile, not less, because the cost of trying and adjusting has dropped.
5. **Fresh context for significant work** — One giant session drifts. Significant work moves through focused stages, each with fresh context: **Specifier** (requirement → acceptance criteria) → **Coder** (make it work) → **Cleaner** (refactor, remove complexity) → **Hardener** (mutation and adversarial tests — break it) → **QA** (exercise real user behavior). Realize the stages with the existing subagents and skills; do not build a parallel process. Inspect each stage's output before the next stage starts. Small, well-scoped changes skip the pipeline.
6. **Verify before claiming done** — Run the repo's checks and read the output; fix failures and rerun. Never report a check as passing unless it ran; state checks not run and why. Confirm the requested behavior works end-to-end and no pending work or known errors remain. Report the tests you added and the behavior each proves; at most one line for the overall suite ("all backend tests pass") — never recite a whole-suite count.
7. **Read before writing** — Inspect the code, callers, tests, and config you are about to change.
8. **Define success first** — State the observable outcome and the evidence that will prove it.
9. **Surgical changes, clean repo** — Touch only what the task needs, match repo conventions, update docs when behavior or config changes, and remove dead code the change exposes.
10. **Locality of behavior** — Behavior obvious at the unit that owns it: colocate helpers with their caller, keep things that change together together, and use explicit intention-revealing names.
11. **Test behavior, not implementation** — Assert through public interfaces only; a harmless refactor must not break a test. Cover what can regress; skip tests that only re-assert code. Over-testing is waste.
12. **Errors explicit** — Never swallow failures; preserve context with idiomatic error/result types. Design ordinary edge cases out of existence instead of exporting them: a missing lookup returns empty, deleting something already gone succeeds, an out-of-range request is clamped. Surface an error only where the caller genuinely must decide.
13. **One source of truth** — Search for an existing concept, contract, or invariant before adding code, tests, config, schemas, queries, scripts, CI, docs, or UI; reuse, extend, or parameterize it first.
    - **Duplication beats the wrong abstraction (Sandi Metz)**. Wait for the **Rule of Three (AHA)**: extract only when three real uses reveal a stable contract with no caller flags, boolean switches, or special-case branches.
    - An abstraction needing flags or conditional options to satisfy different callers is the wrong abstraction — inline it back into callers.
    - Fix duplication at the source, not every caller; consolidate only when the change is local, safe, and in scope.
    - Don't unify values that merely look equal today but differ in meaning, ownership, or lifecycle — preserve meaningful semantic differences, and note intentional duplication in one short comment.
    - Before finishing, ask: "If this changes tomorrow, how many places must be edited?" Reduce that number where correctness and clarity improve.
14. **Code explains itself; plain language over jargon** — Write simple, understandable code a reader without your context can follow. Never invent terminology: use the project's canonical domain term or the ordinary English word. Aim for the balance — great-quality code that is easy to read, not clever code that is hard to read, and not verbose padding either.
    - **Names** — identifiers say what the thing is or does (see **Locality of behavior**); no invented acronyms or abbreviations that only make sense after reading the body.
    - **Comments** — plain product language, same bar as names; a comment only its author understands is a defect. Non-obvious contracts use the behavior-tag block (see **Document non-obvious contracts**); everything else uses brief plain-English prose.
    - **Docs, commits, PRs** — a reader outside the current context understands them without a glossary.
    - **No internal language in the codebase** — the shorthand we use while talking — metaphors, task names, and terms coined mid-conversation — never reaches the code. A thing is named as the codebase already names it, plainly; no jargon or synonyms unless the term is already established in the code. The code explains itself to a reader who never saw our conversation.
    - Established domain and framework vocabulary is fine; the test is whether a competent newcomer would have to ask what a term means. If it needs defining at the call site, it is the wrong term.
15. **Document non-obvious contracts** — A short `@behavior / @param / @returns / @exceptions` block when the signature does not already say it; never restate types.
16. **Optimize hot paths only** — No N+1 queries, no needless re-renders, batch and paginate. Measure before micro-optimizing; cold paths favor readability.
17. **Refactor safely** — Preserve observable behavior in small reversible steps; never mix features into a refactor.
18. **Never bypass correctness** — No unsafe casts, ignored type errors, empty catches, or equivalent suppression.
19. **Evidence over confidence; fail clearly** — Report uncertainty, failed checks, and known risks directly. Escalate a sustained blocker with concrete options.
20. **Ask before anything destructive** — Deleting working code, files, tests, docs, branches, worktrees, or stashes; `git reset --hard`, force-push, or history rewrite; schema or data drops; new dependencies. Name what is lost, ask one clear question, then wait.
21. **Pushback is a conversation, not a cue to revert** — Restate what you did and why, name the tradeoff you accepted, then ask what they want changed. Never delete or revert first and explain after.
22. **Codify repeated steps** — Reuse existing `scripts/` helpers; when an operation recurs with no helper, offer to script it. Offer, don't build.
23. **Explain at the decision level** — Lead with the result and the evidence. Explain in plain language at the architecture/overview level, surfacing the load-bearing decisions (up to 3: Decision / Why / Alternative / Tradeoff) and making the case for why each is the best long-term choice — we are always producing production code to the highest standard, balanced against simplicity and flexibility. Keep code and low-level implementation detail out of the explanation unless the human asks for them, and keep mechanical work mechanical. Optimize for the human's cognitive load and their ability to keep making good calls, not for demonstrating thoroughness.
24. **YAGNI — build only what the task requires** — Write the code the requested outcome needs, and nothing for imagined futures. Before adding anything, name the concrete requirement it serves in this task — a caller, a failing case, an acceptance criterion. If you cannot name one, omit it.
    - **Over-validating** — re-checking what the type system, a constructor, or an earlier boundary already guarantees, or guarding states that cannot occur. Validate once and completely where untrusted data crosses into trusted code (user input, external APIs, deserialized payloads, cross-service calls); do not re-check it inside that boundary.
    - **Overcommitting** — building for a feature, flag, config, or migration that is not planned or asked for. Ship the current concern; queue the idea for later instead of half-implementing it now.
    - **Speculative generality** — options, parameters, interfaces, or wrapper layers with one caller and no second case in sight (see **Architecture is enforced**; extraction waits for **One source of truth**'s Rule of Three).
    - **Defensive padding** — fallbacks, retries, or broad catches for failures with no reachable cause; dead config and unused knobs.
    - **Unrequested polish** — extra endpoints, fields, screens, or "while I'm here" refactors that widen the diff past the task.
    YAGNI is not license to skip required work: a missing boundary check, an unhandled real error, or absent coverage for a promised behavior is a defect, not restraint (see **Errors explicit**, **Never bypass correctness**). The line is "the code we can defend today", not "the most we could imagine".

## Skills & Routing

`skill-index` routes every skill — read its SKILL.md before choosing one. Skills are user-invoked (frontmatter `disable-model-invocation: true`) or model-invoked. Adding, renaming, removing, or re-routing a skill means updating `skill-index`'s SKILL.md and the README skills table.

## Commit & PR Discipline

One concern per branch and PR. Develop every concern in its own worktree — `~/.agents/scripts/new-worktree.sh <branch>` — and tear it down after merge with `~/.agents/scripts/cleanup-worktree.sh <branch>`. Never start a second concern in an existing worktree; queue a mid-task idea as the next concern instead of switching tracks. All commits go through the `commit` skill and all PRs through the `pr` skill — never commit or open a PR directly.

## Implementation Mode

Default: direct implementation — one session owns plan, implement, test, and verify. Sub-agents are opt-in via `spawn` (parallel decomposition), `enforce` (review gate before accepting delegated work), and `code-review` (adversarial verification); significant work follows the fresh-context pipeline (see **Fresh context for significant work**). When you delegate, give full context (goal, scope, constraints, files, interfaces, tests, non-goals) and stay accountable for correctness and integration.

### Active Workflow Mode
Generated workflow profiles take precedence over default workflow preferences only within this block and for new sessions. A profile tunes workflow only; it cannot weaken or bypass safety, correctness, verification, repository, or user-approval rules.
<!-- ACTIVE WORKFLOW PROFILE:START -->
<!-- mode: ship-fast -->
# Ship Fast

A focused execution overlay for well-scoped work.

- Execute directly when the requested change is clear; do not add ceremony, abstractions, or speculative scope.
- Keep explanations proportional: briefly state the plan and meaningful decisions, while mechanical work stays mechanical.
- Inspect only the context needed to make a correct change, reuse existing repository patterns, and keep the diff narrow.
- Ask when requirements or approval boundaries are genuinely ambiguous; otherwise make the smallest informed decision and proceed.
- Report what changed, what was verified, and any remaining uncertainty.

This overlay cannot override the base safety, correctness, verification, repository, or approval rules. Those rules always govern execution and delivery.
<!-- ACTIVE WORKFLOW PROFILE:END -->
