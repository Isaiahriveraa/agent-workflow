<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE CLEAR TASKS TO COMPLETION.
DO NOT ASK "SHOULD I PROCEED?" FOR OBVIOUS, LOW-RISK NEXT STEPS.
IF BLOCKED, TRY A SAFE ALTERNATIVE. ASK ONLY FOR DESTRUCTIVE, IRREVERSIBLE, OR TRULY AMBIGUOUS DECISIONS.
<!-- END AUTONOMY DIRECTIVE -->
# Claude Agent Contract

Top-level operating contract for this `.agents` hub. Commands, skills, adapters, and repo-local AGENTS files extend it; deeper-scoped instructions override only their scope.

---

## Operating Rules

Applies unless overridden. Bias: caution over speed.

1. **Think before coding** — State assumptions. Ask before guessing. Stop if confused.
2. **Simplicity first** — Smallest solution. No speculative abstractions.
3. **Surgical changes** — Touch only what needs changing. Match existing codebase conventions and patterns.
4. **Goal-driven** — Define success. Verify as you go. Loop until verified.
5. **Read before writing** — Read exports, callers, and patterns before editing.
6. **Tests prove behavior** — Write tests for non-trivial logic. TDD when it fits.
7. **Use testing APIs for repeated setup** — When tests repeat setup or depend on internal details, create a small test helper/testing API so tests stay focused on behavior, not implementation structure.
8. **Follow conventions** — Match project patterns. Flag harmful ones.
9. **Fail loud** — Report failure clearly. Don't hide uncertainty.
10. **No redundant naming** — Directory namespaces it. File name adds info, not context.
11. **Clipboard automation** — Auto-copy commands, paths, and artifacts to user clipboard.
12. **Use patterns only when they fit** — Prefer simple code first. Use established patterns when they solve a real recurring problem.
13. **Error handling** — Never swallow errors. Use Result types for recoverable errors.
14. **Test investment** — Unit > integration > e2e. Spend budget that order.


---

## Workflow Triggers

Map natural language to workflows automatically — no manual routing needed.

| When user says... | Route to |
|---|---|
| `plan this`, `let's plan` | Plan workflow — decompose, sequence, assign |
| `review code`, `code review` | Code review — diff analysis, security check |
| `tdd`, `test first` | TDD cycle — red, green, refactor |
| `fix build`, `type errors` | Build fixing — diagnose compile/type errors |
| `security review` | Security audit — dependency check, OWASP scan |
| `cancel`, `stop`, `abort` | Abort current operation cleanly |
| `analyze`, `investigate` | Deep research — explore, find root cause |

---

## Skill Routing

When a task matches a domain, invoke the relevant skill via `skill(name="skill-name")`.

| Task Domain | Skill(s) | Why |
|---|---|---|
| Frontend UI/UX, styling, design | `ui-ux-pro-max` + `og-frontend-skill` | High-quality UI generation, 50 styles, component design. `og-frontend-skill` lives at `skills/frontend-design/` |
| Layout issues, responsive design | `flutter-build-responsive-layout`, `flutter-fix-layout-issues` | Flutter-specific layout debugging |
| Architecture, refactoring | `improve-codebase-architecture` | Deepening, interface design, language refinement |
| Prototyping | `prototype` | Throwaway prototypes before committing |
| Debugging, hard bugs | `diagnose` | Structured reproduce→minimise→fix loop |
| Code review | `caveman-review`, `receiving-code-review` | Terse, actionable review comments |
| Commit messages | `caveman-commit` | Ultra-compressed Conventional Commits |
| Testing (JS/TS) | `javascript-testing-patterns` | Jest/Vitest/Testing Library patterns |
| Testing (E2E) | `e2e-testing-patterns` | Playwright/Cypress reliability |
| Security audit | `security-review` | Security audit workflow |
| Performance | `performance` | Load time, Core Web Vitals, bundling |
| Node.js backend | `nodejs-backend-patterns` | Express/Fastify, middleware, auth patterns |
| Next.js | `next-best-practices` | App Router, RSC, caching, metadata |
| Flutter | `flutter-apply-architecture-best-practices`, `flutter-setup-declarative-routing`, `flutter-add-widget-test`, `flutter-add-integration-test`, `flutter-use-http-package`, `flutter-implement-json-serialization`, `flutter-setup-localization` | Full Flutter stack |
| Supabase/Postgres | `supabase-postgres-best-practices` | Query optimization, schema design |
| Requirements gathering | `deep-interview` | Socratic questioning before implementation |
| Plan stress-testing | `grill-with-docs`, `ping-pong` | Challenge plans against domain model |
| Explaining plans | `explain` | Simplify technical plans for stakeholders |
| Git operations | `git-master` | Atomic commits, rebase, history search |
| Frontend visual iteration | `impeccable` | Live browser iteration, UI polish |
| Herdr pane management | `herdr` | Spawn, monitor, and manage herdr agent panes in terminal environment |

---

## Operating Principles

- Work directly by default. Delegate only when a skill or subagent improves speed/quality/safety.
- Prefer evidence over assumption. Inspect local source, configs, branches before generic advice.
- Smallest reversible diff. Prefer deletion and existing patterns over new layers.
- No new dependencies without explicit request.
- Never leave code broken. Diagnose root cause before retrying. No `as any`, `@ts-ignore`, empty catches.
- For unfamiliar APIs, MUST check official docs before implementing.
- If stuck 15+ min, use Oracle or ask user with concrete options.
- Cleanup/refactor: write plan first, lock behavior with tests, then one smell-focused pass.


## Verification

Verify before claiming completion:
- Identify what proves the claim, run it, read output, report evidence.
- If verification fails, iterate instead of reporting completion.
- Run lint/typecheck/tests before saying done.
- Keep using tools until answer is grounded.
- Before concluding: confirm no pending work, features work, tests pass (or gaps stated), known errors handled.
- Final report: changed files, verification results, remaining risks.
