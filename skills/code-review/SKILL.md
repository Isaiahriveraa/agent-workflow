---
name: code-review
description: "Review code using independent adversarial reviewers that search for concrete bugs, contract mismatches, and maintainability regressions. A hardener proves failures with failing tests first, three independent reviewers audit the hardened diff, a security-reviewer covers trust-boundary diffs on demand, one adjudicator validates every claim, a complexity-reviser applies adjudicated design findings by default, an optional fixer applies verified fixes, and a qa-runner prepares the human QA pass. Verifies every claim against actual repository state."
argument-hint: "[scope] [--fix] [--no-revise] [--deep] [--artifact] [--runner ask|subagents|opencode|omp] [--review-only --report <path>]"
shell-timeout: 10
---

# Code Review

Review changes using independent adversarial contexts. The goal is not to summarize the implementation or confirm it looks reasonable. The goal is to find a concrete input, state, ordering, caller, or system interaction that proves the changed code is wrong.

## Start Here: Select Mode and Load References

This file owns shared policy and routing. Read references only when their stage is needed; do not load the entire directory. Reference paths are relative to this skill root. Helpers, templates, and `${SKILL_DIR}` continue to refer to the skill root, not `references/`.

1. Parse scope and flags below. For every mode, read [setup](references/setup.md) and run Steps 1-2. Stop if the selected scope has no changes.
2. **Observe-only (`--review-only --report <path>`):** do not ask for a runner or dispatch again. Read [review process](references/review-process.md) for Steps 4, 6, and 7; with `--deep`, load [deep review](references/deep-review.md) for Step 5 before adjudication. Finish with Step 13 in [reporting](references/reporting.md), using Step 9 only for findings formatting. Do not load or execute hardening, revision, external dispatch, or QA.
3. **Full review, local subagents:** choose the runner after baseline checks. Read [hardening](references/hardening.md) for Step 3, then [review process](references/review-process.md) for Steps 4-7, inserting [deep review](references/deep-review.md) only with `--deep`.
4. **Full review, OpenCode or OMP:** read the selected dispatch section of [external runners](references/external-runners.md). The original harness loads [hardening](references/hardening.md); the external child starts here in observe-only mode. Do not run a second local reviewer trio. Read the returned findings before proceeding.
5. **Apply feedback in the original harness:** load [complexity revision](references/complexity-revision.md) for Step 8 when `--fix` is present or revision is enabled. Skip defect application without `--fix` and skip design revision with `--no-revise`. Use the proposal → main-model evaluation → accepted implementation → inspection sequence; retain fresh adversarial validation.
6. **Finish a full review:** read Step 9 in [reporting](references/reporting.md), then Steps 10-12 in [completion](references/completion.md) for human QA, completion, and optional artifacts.

Step numbers are stable across references so existing delegated prompts that request Steps 1, 2, and 4-7 still work. Follow this routing even when a caller names the old step numbers.

### Delegation Context

Do not assume children inherit the parent's loaded instructions. Provide each child the relevant shared rules, explicit mode, necessary reference paths (absolute paths when the child may start elsewhere), and the role-specific context prescribed by that reference. Writers receive Decision Authority and Communication; the reviser additionally receives the supervision section of `references/complexity-revision.md`. Keep reviewer contexts minimal and independent: no author reasoning, parent design discussion, or other reviewers' findings. External prompts still invoke this entry point in observe-only mode.

## Core Loop

```text
setup + baseline → choose runner → hardener in original harness
    → independent reviewers (+ triggered deep specialists) → adjudicator
    → verified findings → approved fixes with --fix
    → supervised complexity revision (unless --no-revise)
    → regression checks + fresh adversarial validation
    → human QA preparation → human verdict
```

With `--review-only --report <path>`:

```text
resolve scope → gather context → reviewers A/B/C → adjudicator → Step 13 report
```

Role separation is mandatory:
- The author or implementer does not review its own reasoning.
- The hardener writes tests and the smallest fixes; its tests enter the diff before reviewers see it.
- Reviewers do not implement fixes.
- The complexity reviser applies adjudicated design findings; it does not decide what counts as a finding.
- Reviewers work in separate contexts and do not see each other's output.
- Reviewers do not receive the implementer's explanation, confidence, or completion summary.
- Reviewer findings are untrusted hypotheses until independently validated.
- The adjudicator, fixer, or reviser must reject unsupported feedback.

## Metadata

```!
node "${SKILL_DIR}/../_shared/now.mjs"
echo
node "${SKILL_DIR}/../_shared/git-context.mjs"
```

- `now.mjs` (line 1) — `<iso>\t<slug>` tab-separated.

Scope resolution is delegated to the bundled helper at Step 1 — it depends on `$ARGUMENTS`, which render-time substitution cannot capture.

## Input

`$ARGUMENTS` may contain one scope and optional flags.

### Scope
- empty — current branch versus its default branch
- `working` — unstaged tracked changes
- `staged` — staged changes
- `modified` — staged and unstaged tracked changes versus `HEAD`
- `commit` — the `HEAD` commit
- a commit hash
- an `A..B` range
- a checked-out branch name

### Flags
- `--fix` — apply verified fixes after approval of their behavior changes and add regression tests; this flag is not behavior-change approval
- `--no-revise` — skip the default complexity revision pass (used by the commit gate, which must not edit code)
- `--deep` — add triggered specialist reviews for security, concurrency, dependencies, persistence, and public compatibility
- `--artifact` — write a persistent Markdown review document
- `--review-only --report <path>` — observe-only review for a delegated run (Step 13 in `references/reporting.md`). Runs Steps 1, 2, and 4-7; no hardener, revision, fixer, or QA. Writes `findings.md` and a `REVIEW-REPORT v1` block to `<path>`. Requires `--report`.
- `--runner ask|subagents|opencode|omp` — where this review runs; overrides the default runner for this run (see Runner).

Do not ask for confirmation when scope can be resolved safely. Ask only when the supplied scope is genuinely unresolvable or could select materially different changes.

### Runner

**Default runner:** `ask`

Where the review runs. The default runner is the setting; change it on the line above. `--runner` overrides it for one run.
- `ask` — after the baseline checks and before the hardener, use the harness's question tool to offer "Subagents in this harness (Recommended)", "OpenCode pane in Herdr", or "OMP CLI in Herdr". Follow the answer and do not ask about the runner again in the same run. Runner selection is separate from behavior-change approval.
- `subagents` — run the Core Loop in this harness: hardener, reviewers, adjudicator, revision, and QA prep as subagents here.
- `opencode` — run the OpenCode Dispatch section in `references/external-runners.md`.
- `omp` — run the OMP Dispatch section in `references/external-runners.md`.

`--review-only --report <path>` runs observe-only in the harness receiving the delegated task and never asks for a runner or dispatches again. OpenCode and OMP use the same review steps and report contract.

### Decision Authority and Communication

The original harness's main model remains the user's point of contact for every runner. Delegating review changes its location, not who owns product decisions. External reviewers only return adjudicated findings; code-writing stages stay in the original harness.

- **Act, verify, inform:** behavior-preserving refactors may proceed without routine permission requests. The specialized complexity reviser proposes the smallest simplification using `codebase-design` principles: deep modules, information hiding, fewer dependencies, and less cognitive load. The main model evaluates the proposal before authorizing implementation and inspects the result afterward; it supervises rather than duplicating the reviser's design work. Briefly report what changed, why it is simpler, and the checks actually run.
- **Explain, ask, wait:** before adding, removing, or changing observable behavior, explain the current behavior, proposed behavior, and reason in plain language, then wait for the user's decision. Bug fixes also change behavior; neither `--fix` nor a reproduced failure grants approval. Record explicit approval for the specific change and pass it to the writer; do not repeatedly ask for that same approved change.
- **Uncertainty needs a decision:** if behavior preservation cannot be established, report the uncertainty rather than labeling the change a refactor. Observable behavior includes public contracts, errors, persisted data, side effects, and customer workflows, not just UI output.
- **Safety gates remain:** destructive, security-sensitive, or dependency changes still follow repository approval rules even during a refactor.
- **Keep updates meaningful:** announce the selected runner, summarize completed refactoring and verification, and surface blockers or decisions promptly. Do not narrate every tool call. Group related decisions without hiding distinct behavior changes. Read-only runs report findings and never apply changes.

Pass these approval boundaries to every code-writing subagent, including the hardener, fixer, and reviser. If a writer discovers a new behavior change, it returns the proposal to the main model without applying it.

## Non-Negotiable Rules

1. **Assume the code is wrong.** Search for the case that breaks it.
2. **Review code, not its story.** Never pass the implementer's reasoning into reviewer contexts.
3. **Concrete failures only.** Every finding requires exact evidence, a trigger, an execution trace, and observable impact.
4. **No style noise.** Omit naming, formatting, subjective architecture preferences, and optional refactors unless they cause a demonstrated defect.
5. **No vague risk language.** Do not report "might," "could," or "possibly" without showing the path that makes it happen.
6. **No blind fixing.** Reviewer output is a hypothesis until the adjudicator verifies it.
7. **Preserve independence.** Do not show one reviewer another reviewer's findings.
8. **Review the authored change.** Do not report unrelated pre-existing problems unless the diff newly exposes or routes execution into them.
9. **Use the smallest correct fix.** With `--fix`, the fixer makes the smallest correct change; the complexity reviser is a separate pass scoped to adjudicated design findings.
10. **Turn real bugs into tests.** Every fixed behavioral defect needs the smallest useful regression test.
11. **No destructive Git operations.** Never run `git reset --hard`, `git clean`, `git stash`, force-push, or broad restore/checkout commands.
12. **Suspicious workaround comments are not proof.** If code needs a paragraph-long comment to argue that an unsafe-looking workaround is correct, inspect the behavior instead of accepting the explanation.
13. **Never claim the code is correct.** Say only that no qualifying verified findings were found in the reviewed scope.

## Escalation Rules

Recommend `--deep` when the diff includes:
- authentication or authorization
- payments or irreversible external operations
- migrations or durable-state transformations
- unsafe code or manual memory management
- concurrency or distributed coordination
- cryptography, secrets, or untrusted deserialization
- public API or protocol compatibility
- infrastructure or deployment configuration
- large cross-layer state-machine changes

## Final Principles

- One implementation result, one adversarial-test pass (hardener), three independent adversarial reviews, one complexity revision, one validating apply step, one human QA pass.
- Search for falsifying examples rather than confirming examples.
- Preserve context separation between author, reviewers, reviser, and fixer.
- Review both local behavior and repository-wide contracts.
- Treat every reviewer claim as untrusted until grounded in code.
- Prefer a small number of high-confidence findings over a long speculative list.
- Convert every fixed behavioral defect into a regression test.
- When the same mistake recurs, improve the workflow or repository guidance that allowed it.

## Important Notes

- **Frontmatter**: `allowed-tools` is intentionally omitted — the skill inherits tools from the session config.
- **Clipboard pattern**: After writing artifact in Step 12, run `pbcopy <absolute-path>` for the user.
- **Exit status**: always exit 0. The status is communicated through the verdict, not the process exit code.
