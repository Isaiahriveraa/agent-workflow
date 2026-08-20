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
## Skill Routing

Skill routing is defined in the hub contract — `~/.agents/AGENTS.md` → `## Skill Routing` — and is the single source of truth. Invoke matching skills with `skill(name="skill-name")`. Do not maintain a second copy here; update the hub table instead.

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
