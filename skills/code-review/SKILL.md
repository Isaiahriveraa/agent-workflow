---
name: code-review
description: "Review code using independent adversarial reviewers that search for concrete bugs, contract mismatches, and maintainability regressions. A hardener proves failures with failing tests first, three independent reviewers audit the hardened diff, a security-reviewer covers trust-boundary diffs on demand, one adjudicator validates every claim, an optional fixer applies verified fixes, and a qa-runner prepares the human QA pass. Verifies every claim against actual repository state."
argument-hint: "[scope] [--fix] [--deep] [--artifact]"
shell-timeout: 10
---

# Code Review

Review changes using independent adversarial contexts. The goal is not to summarize the implementation or confirm it looks reasonable. The goal is to find a concrete input, state, ordering, caller, or system interaction that proves the changed code is wrong.

## Core Loop

```text
implemented change
      ↓
run baseline checks
      ↓
spawn the hardener → failing adversarial tests + smallest fixes
      ↓
reviewer A ───┐
            reviewer B ───┼─ independent adversarial review
reviewer C ───┘
      ↓
one adjudicator validates every claim
      ↓
report verified findings
      ↓
with --fix: one fixer applies valid feedback
      ↓
regression tests + baseline checks
      ↓
one fresh adversarial validation of the fix
      ↓
spawn qa-runner → environment, test data, click-through script
      ↓
human runs the QA pass
```

Role separation is mandatory:
- The author or implementer does not review its own reasoning.
- The hardener writes tests and the smallest fixes; its tests enter the diff before reviewers see it.
- Reviewers do not implement fixes.
- Reviewers work in separate contexts and do not see each other's output.
- Reviewers do not receive the implementer's explanation, confidence, or completion summary.
- Reviewer findings are untrusted hypotheses until independently validated.
- The adjudicator or fixer must reject unsupported feedback.

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
- `--fix` — apply verified fixes and add regression tests
- `--deep` — add triggered specialist reviews for security, concurrency, dependencies, persistence, and public compatibility
- `--artifact` — write a persistent Markdown review document

Do not ask for confirmation when scope can be resolved safely. Ask only when the supplied scope is genuinely unresolvable or could select materially different changes.

## Non-Negotiable Rules

1. **Assume the code is wrong.** Search for the case that breaks it.
2. **Review code, not its story.** Never pass the implementer's reasoning into reviewer contexts.
3. **Concrete failures only.** Every finding requires exact evidence, a trigger, an execution trace, and observable impact.
4. **No style noise.** Omit naming, formatting, subjective architecture preferences, and optional refactors unless they cause a demonstrated defect.
5. **No vague risk language.** Do not report "might," "could," or "possibly" without showing the path that makes it happen.
6. **No blind fixing.** Reviewer output is a hypothesis until the adjudicator verifies it.
7. **Preserve independence.** Do not show one reviewer another reviewer's findings.
8. **Review the authored change.** Do not report unrelated pre-existing problems unless the diff newly exposes or routes execution into them.
9. **Use the smallest correct fix.** With `--fix`, do not perform unrelated cleanup.
10. **Turn real bugs into tests.** Every fixed behavioral defect needs the smallest useful regression test.
11. **No destructive Git operations.** Never run `git reset --hard`, `git clean`, `git stash`, force-push, or broad restore/checkout commands.
12. **Suspicious workaround comments are not proof.** If code needs a paragraph-long comment to argue that an unsafe-looking workaround is correct, inspect the behavior instead of accepting the explanation.
13. **Never claim the code is correct.** Say only that no qualifying verified findings were found in the reviewed scope.

## Steps

### Step 1: Resolve Scope

Determine the repository root and default branch using repository-native Git commands.

Use the bundled helper for scope resolution:
```bash
node "${SKILL_DIR}/_helpers/review-range.mjs" "<scope-spec>"
```

The helper resolves the scope and ALSO writes the following files to `.git/`:
- `.git/code-review.patch` — diff with -U20 context (or -U10 if patch >~1MB)
- `.git/code-review.changed-files` — one file path per line
- `.git/code-review.baseline.txt` — empty (populated in Step 2)
- `.git/code-review.context.txt` — empty (populated in Step 2)

Read the helper output to confirm the resolved scope.

Scope-to-patchname mapping (the helper handles this):
| Input | Patch source |
|---|---|
| empty | merge-base of current branch and default branch through `HEAD` |
| `working` | `git diff` |
| `staged` | `git diff --cached` |
| `modified` | `git diff HEAD` |
| `commit` | `git show HEAD` |
| hash | that commit, including its own changes |
| `A..B` | explicit range |
| branch | checked-out branch versus default branch |

If no files changed, print:
```text
No changes in the selected review scope.
```
Then stop.

### Step 2: Gather Minimal Context

Write `.git/code-review.context.txt` containing only:
```text
review scope
changed-file list
directly relevant repository rules from AGENTS.md or local guidance
task acceptance criteria, when explicitly available
commands used for baseline checks
```

Do not include:
- implementation reasoning
- a completion summary
- explanations of design choices
- previous assistant messages about the implementation
- reviewer findings
- proposed fixes
- statements that the code is probably correct

#### Baseline Checks

Detect existing project commands from repository configuration. Do not invent a new toolchain.

Run the cheapest relevant checks in this order:
1. parser, formatter, or format check
2. compiler or type checker
3. tests directly associated with changed code
4. linter
5. broader tests only when repository guidance or change scope justifies them

Record each command, exit status, and concise failure output in `.git/code-review.baseline.txt`.

A failing command is evidence, but not automatically a review finding. The review must establish that the selected diff caused or exposed the failure.

### Step 3: Harden First (spawn the hardener)

Before any reviewer sees the change, spawn the hardener so the diff under review already carries tests that prove its failures.

Spawn the `hardener` subagent — a registered agent type whose instructions live in `~/.agents/agents/hardener.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Scope: <resolved scope>
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Design context: <design card path, or the closest task description and acceptance criteria>
```

The hardener reproduces the real ways this change fails — the design card's edge cases plus: what can happen twice? what can disappear? what else touches this at once? For each scenario it writes a test and must watch it fail before fixing the smallest cause; a scenario that cannot be made to fail is dropped.

After it returns:
1. Regenerate `.git/code-review.patch`, `.git/code-review.changed-files`, and the baseline output so Steps 4-7 review the hardened diff.
2. Keep the hardener's scenario table for the report (Step 8).
3. If the scope has no executable behavior (docs or config only), or the hardener surfaces a design question, continue and note why.

### Step 4: Spawn Three Independent Adversarial Reviewers

Dispatch Reviewer A, Reviewer B, and Reviewer C in parallel in separate subagent contexts.
They must not receive each other's output or the implementer's reasoning.

#### Reviewer A — Blind Behavioral Adversary

Reviewer A starts as close as practical to the Bun pattern: the patch is its primary context. It receives no task explanation and no implementation reasoning.

Spawn the `reviewer-behavioral` subagent — a registered agent type whose instructions live in `~/.agents/agents/reviewer-behavioral.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Baseline output: .git/code-review.baseline.txt
```

#### Reviewer B — Repository Contract Adversary

Spawn the `reviewer-contract` subagent — a registered agent type whose instructions live in `~/.agents/agents/reviewer-contract.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Minimal context: .git/code-review.context.txt
Baseline output: .git/code-review.baseline.txt
```

#### Reviewer C — Maintainability Adversary

Spawn the `reviewer-maintainability` subagent — a registered agent type whose instructions live in `~/.agents/agents/reviewer-maintainability.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Minimal context: .git/code-review.context.txt
```

### Step 5: Triggered Deep Review (`--deep` only)

Deep mode does not mean "spawn every specialist." Dispatch only the specialists whose mechanical trigger appears in the diff. Each specialist remains independent and receives the patch plus only the context required for its domain.

#### Security Specialist
Trigger when changes touch:
- HTTP, RPC, IPC, webhook, or CLI trust boundaries
- authentication or authorization
- query construction
- command/process execution
- filesystem paths
- deserialization or dynamic evaluation
- secrets or cryptography
- outbound hosts, URLs, or sockets
- raw HTML or explicit-trust rendering

Spawn the `security-reviewer` subagent — a registered agent type whose instructions live in `~/.agents/agents/security-reviewer.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Minimal context: .git/code-review.context.txt
```

#### Concurrency Specialist
Trigger when changes touch:
- shared mutable state
- async handlers or callbacks
- queues, retries, or replay
- locks, transactions, or multi-step writes
- caches or singleton initialization
- background jobs or event consumers

Every race finding must include:
```text
operation 1
operation 2
possible interleaving
missing or ineffective ordering primitive
observable failure
```

Reject speculative timing claims without a concrete interleaving.

#### Persistence and Compatibility Specialist
Trigger when changes touch:
- schemas or migrations
- repositories, DAOs, models, or serialized storage
- public API types or protocol messages
- durable queues or caches
- rollback or recovery behavior

Check forward and reverse paths, old and new representations, and compatibility with already persisted data.

#### Dependency Specialist
Trigger only when a manifest or lockfile changed.
Check exact added, removed, or selected versions for:
- unexpected transitive changes
- incompatible constraints
- duplicate or conflicting versions
- removed features used by changed code
- repository policy or license conflicts
- known advisories affecting the selected version

Advisory findings require authoritative source links and the exact affected range.

### Step 6: Adjudicate All Candidate Findings

Reviewer output is not yet a code review. Treat every candidate as potentially wrong.

Spawn the `adjudicator` subagent — a registered agent type whose instructions live in `~/.agents/agents/adjudicator.md` — with full repository access. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Candidate findings:
{all reviewer and triggered-specialist findings verbatim}
```

The adjudicator receives none of the reviewers' hidden reasoning.

Apply the adjudication:
- Keep `VERIFIED` findings.
- Keep `WEAKENED` findings with corrected wording and reduced severity.
- Remove `REJECTED` findings completely.
- Merge only true duplicates while preserving all distinct evidence.

No candidate reaches the user or fixer before adjudication.

### Step 7: Rank Verified Findings

Severity is determined by demonstrated impact and reachability, not reviewer confidence.

#### Critical
Use only for a realistic path to:
- authorization bypass or concrete data exposure
- data loss or irreversible corruption
- crash or severe availability failure
- broken core workflow with no usable fallback
- duplicate payment or another irreversible external action
- unsafe memory behavior with realistic reachability

#### Important
Use for:
- incorrect user-visible behavior
- failure on a supported boundary or edge case
- broken integration, compatibility, or persisted-state contract
- accumulating resource leak
- bounded but inconsistent durable state
- missing explicitly required behavior
- diff-caused compiler, type, or test failure

#### Suggestion
Use only for a verified low-impact defect, narrowly limited defensive gap, or inconsistency that has a concrete but small observable effect.

Do not include discussion-only architecture opinions in the default result.

### Step 8: Present the Review

When `--fix` is absent, stop after presenting the adjudicated review. Read the template at `templates/review.md`, fill the placeholders, and emit the result.

Use this structure:
```text
Code review: {resolved scope}
Verdict: APPROVED | CHANGES_REQUESTED
Baseline: {passed checks} | {failed checks}
Candidates: {total} · Verified: {V} · Weakened: {W} · Rejected: {R}

## Critical

### {ID} — {title}
Evidence: `file:line` — `<exact code>`
Trigger: {specific trigger}
Trace: {short execution trace}
Impact: {observable failure}
Regression test: {smallest useful test}

## Important
...

## Suggestions
...
```

Omit empty severity sections.

Findings are tagged by reviewer lens, so the review axes stay visible: A = behavioral correctness, B = contract/spec faithfulness (including requirements missing, scope creep, requirements implemented wrong), C = standards and maintainability (including documented repo standards and Fowler smells). This keeps the standards-vs-spec distinction from `review` without a separate skill.

Verdict rules:
- `APPROVED` — no verified Critical or Important findings and no diff-caused baseline failures.
- `CHANGES_REQUESTED` — at least one verified Critical or Important finding or one diff-caused baseline failure.

Approval means only that no qualifying verified defect was found in the reviewed scope.

### Step 9: Apply Feedback (`--fix` only)

Spawn the `fixer` subagent — a registered agent type whose instructions live in `~/.agents/agents/fixer.md` — via a `task` subagent. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same items:

```text
Findings (verified and weakened):
{adjudicated findings with adjudicator evidence}

Task acceptance criteria:
{acceptance criteria}

Relevant repository rules:
{repository rules}

Baseline output:
{current baseline output}
```

After applying fixes:
1. run each new or updated regression test
2. rerun relevant compiler, type-checker, formatter, and linter commands
3. regenerate the patch against the original review base
4. spawn one fresh blind adversarial reviewer on only the fix delta
5. adjudicate any new candidate from that fix review

Do not automatically enter an unbounded review/fix cycle. A second fix pass is allowed only when the fresh fix review identifies a new verified Critical or Important issue caused by the fixer. Stop after two fix passes and report anything remaining.

### Step 10: Prepare the Human QA Pass (spawn qa-runner)

After all code changes are settled (including any `--fix` pass), prepare the pass a human will run.

Spawn the `qa-runner` subagent — a registered agent type whose instructions live in `~/.agents/agents/qa-runner.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Scope: <resolved scope>
Design walkthrough: <design card path, or the task description and acceptance criteria>
Environment: <branch preview or dev deploy URL; otherwise ask it to report the blocker>
```

The qa-runner prepares the environment, test data, and a short numbered customer-path script plus one ugly path. It never clicks for the human and never approves.

Carry its output into Step 11 and the final report: the human runs the script and answers "would a customer be fine here?" — record `approved` or the findings. Findings become the next concern, each named with the step that produced it.

### Step 11: Completion

#### Clean review
```text
Review complete.
No verified Critical or Important findings remain in the selected scope.
Baseline checks pass.
Hardener: {n} scenarios tried, {n} reproduced, {n} fixed.
QA pass prepared — run the Step 10 script and record the human verdict.
```

#### Remaining findings
```text
Review complete with remaining findings.
- {ID} — {title} — {reason it remains}
```

#### Blocked checks
```text
Review incomplete because required checks could not run.
- {command} — {external blocker}
```

Never hide blocked tests, unresolved verified findings, or a QA pass that could not be prepared.

### Step 12: Optional Artifact (`--artifact` or `--deep`)

Write a Markdown document only when `--artifact` is supplied or deep mode produced at least one verified finding. Use the template at `templates/review.md`, fill every `{placeholder}` with reconciled values from Steps 6-7 and 9, and include the hardener's scenario table (Step 3) and the QA script (Step 10) in the body.

Suggested filename:
```text
reviews/{YYYY-MM-DD}-{branch-or-scope}-code-review.md
```

Frontmatter:
```yaml
---
type: code-review
scope: <resolved scope>
status: approved | changes_requested
baseline: passed | failed | partial
verified_findings: <count>
weakened_findings: <count>
rejected_candidates: <count>
review_mode: standard | deep
---
```

After writing the artifact, immediately run `pbcopy <absolute-path>` so the user's clipboard has the file path.

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

- One implementation result, one adversarial-test pass (hardener), three independent adversarial reviews, one validating apply step, one human QA pass.
- Search for falsifying examples rather than confirming examples.
- Preserve context separation between author, reviewers, and fixer.
- Review both local behavior and repository-wide contracts.
- Treat every reviewer claim as untrusted until grounded in code.
- Prefer a small number of high-confidence findings over a long speculative list.
- Convert every fixed behavioral defect into a regression test.
- When the same mistake recurs, improve the workflow or repository guidance that allowed it.

## Important Notes

- **Frontmatter**: `allowed-tools` is intentionally omitted — the skill inherits tools from the session config.
- **Clipboard pattern**: After writing artifact in Step 12, run `pbcopy <absolute-path>` for the user.
- **Exit status**: always exit 0. The status is communicated through the verdict, not the process exit code.

## Clipboard

After writing the code review artifact to disk at Step 12, immediately run `bash` with `pbcopy <absolute-path>` so the user's clipboard has the file path.
