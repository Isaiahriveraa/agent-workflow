# Hardening

Read only for a full review, in the original harness. The shared approval boundaries in `../SKILL.md` apply to the hardener's prompt and every fix.

### Step 3: Harden First (spawn the hardener)

Not run with `--review-only`: the hardener runs in the implementer's harness before the delegated review starts.

Before any reviewer sees the change, spawn the hardener so the diff under review already carries tests that prove its failures.

Spawn the `hardener` subagent — a registered agent type whose instructions live in `~/.agents/agents/hardener.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Scope: <resolved scope>
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Design context: <design card path, or the closest task description and acceptance criteria>
```

The hardener reproduces the real ways this change fails — the design card's edge cases plus: what can happen twice? what can disappear? what else touches this at once? For each scenario it writes a test and must watch it fail before fixing the smallest cause; a scenario that cannot be made to fail is dropped.

Apply Decision Authority and Communication before any fix: the hardener may reproduce a defect but must return an unapproved behavior-changing fix as a proposal. The main model obtains the user's decision before the hardener applies it. Keep the reproduced failure visible when approval is declined or pending; do not claim a clean baseline.

After it returns:
1. Regenerate `.git/code-review.patch`, `.git/code-review.changed-files`, and the baseline output so Steps 4-7 review the hardened diff.
2. Keep the hardener's scenario table for the report (Step 8).
3. If the scope has no executable behavior (docs or config only), or the hardener surfaces a design question, continue and note why.
