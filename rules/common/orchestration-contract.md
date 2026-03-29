# Orchestration Contract

Use this rule when work is intentionally entering conductor/executor mode.

## Purpose

Keep orchestration portable and honest:
- the conductor reads the active plan and delegates bounded tasks
- the executor stays focused on one delegated task and does not redelegate by default
- carried-forward learnings come from the active execution notes, not from vague memory
- delegated results return through an explicit verification gate
- adapter accelerators are optional and capability-aware

## Required Contract

1. Reset intent for the current turn before deciding to orchestrate.
2. Read active execution state before delegating.
3. Route delegated work through category-first routing instead of prompt-only guesses.
4. Inject notes/learnings context into delegated work when execution notes exist.
5. Keep the conductor read/verify-biased; do not let it become a second executor by default.
6. Require a verification pass after delegated work completes.
7. Report degraded mode honestly when the active adapter lacks native orchestration enforcement.

## Helper

Use `node ./scripts/orchestration-contract-tools.mjs contract --input "<task>"` to derive:
- conductor responsibilities
- executor responsibilities
- routing category and model
- learnings/notepad handoff guidance
- verification-gate expectations
- adapter acceleration mode

## Constraints

- No fake native parity across adapters.
- No orchestration without execution-state awareness.
- No notepad contract that relies on passive docs alone.
- No delegation that forgets the current task or active plan.
