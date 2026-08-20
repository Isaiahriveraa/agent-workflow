---
name: code-review
description: "Review code using independent adversarial reviewers that search for concrete bugs, contract mismatches, and maintainability regressions. Three independent reviewers, one adjudicator, optional fixer. Verifies every claim against actual repository state."
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
```

Role separation is mandatory:
- The author or implementer does not review its own reasoning.
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

### Step 3: Spawn Three Independent Adversarial Reviewers

Dispatch Reviewer A, Reviewer B, and Reviewer C in parallel in separate subagent contexts.
They must not receive each other's output or the implementer's reasoning.

#### Reviewer A — Blind Behavioral Adversary

Reviewer A starts as close as practical to the Bun pattern: the patch is its primary context. It receives no task explanation and no implementation reasoning.

Use a `task` subagent with this prompt:

```text
You are a blind adversarial code reviewer.

Assume the changed code is wrong. Your only job is to find concrete bugs and reasons the code does not work.

Primary input:
- Patch: .git/code-review.patch
- Changed files: .git/code-review.changed-files
- Baseline output: .git/code-review.baseline.txt

Do not ask for the author's reasoning. Do not infer intent from commit prose. Inspect the patch itself and, only when needed to prove a finding, read surrounding repository code.

Attack the changed behavior using concrete inputs, states, and execution orderings.

Check for:
- wrong conditions, branch order, off-by-one behavior, and early returns
- empty, null, negative, malformed, overflow, maximum, and boundary values
- eager evaluation and unintended side effects
- errors, cancellation, timeout, retry, and partial-failure behavior
- invalid, unreachable, or non-terminal state transitions
- cleanup, ownership, lifetime, and resource-release mistakes
- async ordering, re-entrancy, stale state, and check-then-act behavior
- duplicate execution and missing idempotency
- language or library semantics that compile but behave differently than they look
- fallback behavior that silently changes externally visible results
- tests that pass while the actual supported edge case remains broken

For each finding, return exactly:

ID: A<n>
Title: <specific failure>
Evidence: <file:line — exact code quote>
Trigger: <specific input, state, or operation ordering>
Trace: <2-5 numbered execution steps>
Impact: <observable incorrect result>
Regression test: <smallest test that fails before the fix>
Confidence: <8-10>

Rules:
- Report only behavior caused by or newly exposed by the reviewed diff.
- Confidence must be at least 8.
- Do not report style, naming, formatting, optional refactors, or general hardening.
- Do not propose a fix.
- Omit any claim without a concrete trigger and trace.
- Return NO_FINDINGS when no qualifying findings exist.
```

#### Reviewer B — Repository Contract Adversary

Use a separate `task` subagent with this prompt:

```text
You are an independent adversarial repository reviewer.

Assume the changed code breaks an existing contract. Your only job is to find concrete mismatches between the diff and the rest of the repository.

Inputs:
- Patch: .git/code-review.patch
- Changed files: .git/code-review.changed-files
- Minimal context: .git/code-review.context.txt
- Baseline output: .git/code-review.baseline.txt

Do not ask for or rely on the author's reasoning. Do not see another reviewer's output.

Read the patch first. Then inspect only the callers, consumers, schemas, registrations, sibling implementations, and tests needed to prove or disprove a contract mismatch.

Check for:
- callers and callees that now make incompatible assumptions
- task acceptance criteria missing from the implementation
- requirements missing or only partially implemented (quote the spec or issue line that demands them)
- behavior added that the spec or issue did not ask for (scope creep)
- requirements implemented but wrong (behavior present but not what the spec/issue requires)
- public API, protocol, event, CLI, or serialized-shape incompatibility
- producer/consumer filters that disagree
- missing enum cases, registrations, routes, handlers, commands, or dispatch entries
- write/read, create/update, migration/rollback, and encode/decode asymmetry
- changed behavior not mirrored across required sibling implementations
- tests or fixtures encoding a different supported contract
- errors represented differently across layers
- authorization or validation removed before a privileged operation
- ownership, lifecycle, transaction, or concurrency guarantees violated across components
- changed dependency behavior that invalidates a repository assumption

For each finding, return exactly:

ID: B<n>
Title: <specific broken contract>
Changed evidence: <file:line — exact code quote>
Contract evidence: <file:line — exact code quote>
Trigger: <specific input, state, or operation ordering>
Trace: <2-5 numbered execution steps>
Impact: <observable incorrect result>
Regression test: <smallest test proving the mismatch>
Confidence: <8-10>

Rules:
- Report only mismatches caused by or newly exposed by the reviewed diff.
- Confidence must be at least 8.
- Two concrete evidence locations are required unless an explicit acceptance criterion provides the second fact.
- Do not report style, naming, formatting, optional refactors, or vague concerns.
- Do not propose a fix.
- Return NO_FINDINGS when no qualifying findings exist.
```

#### Reviewer C — Maintainability Adversary

Use a separate `task` subagent with this prompt:

```text
You are an adversarial maintainability reviewer.

Assume the changed code adds avoidable complexity. Your job is to find structural and design regressions in the diff and missed opportunities to make the code dramatically simpler without changing behavior.

Inputs:
- Patch: .git/code-review.patch
- Changed files: .git/code-review.changed-files
- Minimal context: .git/code-review.context.txt

Do not ask for or rely on the author's reasoning. Do not see another reviewer's output.

You are ambitious about structural simplification (code judo): look for reframes that delete whole branches, helpers, or layers while preserving behavior.

Check for:
- files pushed across the 1000-line boundary without a strong reason
- new ad-hoc conditionals or special cases bolted onto unrelated flows (spaghetti growth) where a dedicated abstraction, state machine, or policy object would be cleaner
- thin wrappers, identity abstractions, and pass-through helpers that add a layer without adding value
- repeated conditionals that reveal a missing model or enum
- unnecessary optionality, `unknown`, `any`, or cast-heavy code obscuring an invariant that types could express
- logic in the wrong layer, or bespoke helpers where a canonical repository helper already exists
- unnecessary sequential orchestration of independent work, and non-atomic partial updates
- feature logic leaking into general-purpose modules
- edge cases and 'temporary' branching that will become permanent debt
- documented repository standards (e.g. CODING_STANDARDS.md, CONTRIBUTING.md) violated by the diff, citing the standard file and rule
- Fowler smells from the baseline: Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest

For each finding, return exactly:

ID: C<n>
Title: <specific maintainability regression or missed simplification>
Evidence: <file:line — exact code quote>
Standard: <which rule above it violates>
Impact: <how this makes the code harder to maintain or extend>
Remedy: <the smallest structural change, e.g. delete the layer, extract the helper, introduce the model, parallelize, make atomic>
Confidence: <8-10>

Rules:
- Report only problems caused by or newly exposed by the reviewed diff.
- Confidence must be at least 8.
- A high-conviction structural finding beats a long cosmetic list: prefer a small number of findings that delete or reshape code.
- Do not report naming, formatting, or style.
- Do not invent remedies that change behavior; the diff must behave identically after the remedy.
- Return NO_FINDINGS when no qualifying findings exist.

### Step 4: Triggered Deep Review (`--deep` only)

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

Require a concrete untrusted source-to-sensitive-sink trace. Do not report generic hardening suggestions, rate-limit ideas, or theoretical attacks without reachability.

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

### Step 5: Adjudicate All Candidate Findings

Reviewer output is not yet a code review. Treat every candidate as potentially wrong. Spawn one adjudicator `task` subagent with full repository access.

The adjudicator receives all candidate findings verbatim, but none of the reviewers' hidden reasoning.

Prompt:
```text
Adjudicate every candidate finding against the actual repository state.

Candidate findings:
{all reviewer and triggered-specialist findings verbatim}

For each candidate:
1. Locate every quoted line in the actual file.
2. Read enough surrounding code to establish the real semantics.
3. Inspect all cited callers, consumers, schemas, tests, registrations, locks, transactions, and guards.
4. Reconstruct the claimed trigger and execution trace.
5. Confirm that the reviewed diff caused or newly exposed the behavior.
6. Check whether a type invariant, validation, authorization guard, transaction, lock, idempotency key, ownership rule, or existing test prevents the failure.
7. Identify true duplicates only when trigger, failure, and correction are the same.

Return exactly one row per candidate:

<id> | VERIFIED | <exact file:line evidence and concise reason>
<id> | WEAKENED | <narrower true claim with exact evidence>
<id> | REJECTED | <contradicting evidence or missing proof>
<id> | DUPLICATE-OF <id> | <why both describe the identical defect>

Rules:
- VERIFIED means the concrete failure is reproducible from repository code.
- WEAKENED means a real defect exists, but its trigger, reach, or impact was overstated.
- REJECTED means code contradicts the claim or evidence is insufficient.
- Related defects with different triggers or observable failures remain separate.
- Do not create new findings.
- Do not propose fixes.
```

Apply the adjudication:
- Keep `VERIFIED` findings.
- Keep `WEAKENED` findings with corrected wording and reduced severity.
- Remove `REJECTED` findings completely.
- Merge only true duplicates while preserving all distinct evidence.

No candidate reaches the user or fixer before adjudication.

### Step 6: Rank Verified Findings

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

### Step 7: Present the Review

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

### Step 8: Apply Feedback (`--fix` only)

Use one `task` subagent as the fixer. It receives:
- verified and weakened findings
- adjudicator evidence
- task acceptance criteria
- relevant repository rules
- current baseline output

Prompt:
```text
Validate and apply the smallest correct change for each adjudicated finding.

For each finding:
1. Reconfirm the adjudicator's evidence in current repository state.
2. Reject the finding if intervening changes made it invalid.
3. Modify only the code needed to remove the demonstrated failure.
4. Add or update the smallest regression test that proves the behavior.
5. Preserve supported behavior outside the failing case.
6. Do not perform unrelated cleanup or refactoring.
7. Do not use destructive Git operations.
8. Do not commit unless the parent workflow explicitly requests a commit.

Return per finding:
<id> | FIXED | <files changed and tests added>
<id> | REJECTED-AFTER-RECHECK | <contradicting evidence>
<id> | BLOCKED | <exact unresolved dependency or ambiguity>
```

After applying fixes:
1. run each new or updated regression test
2. rerun relevant compiler, type-checker, formatter, and linter commands
3. regenerate the patch against the original review base
4. spawn one fresh blind adversarial reviewer on only the fix delta
5. adjudicate any new candidate from that fix review

Do not automatically enter an unbounded review/fix cycle. A second fix pass is allowed only when the fresh fix review identifies a new verified Critical or Important issue caused by the fixer. Stop after two fix passes and report anything remaining.

### Step 9: Completion

#### Clean review
```text
Review complete.
No verified Critical or Important findings remain in the selected scope.
Baseline checks pass.
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

Never hide blocked tests or unresolved verified findings.

### Step 10: Optional Artifact (`--artifact` or `--deep`)

Write a Markdown document only when `--artifact` is supplied or deep mode produced at least one verified finding. Use the template at `templates/review.md`, fill every `{placeholder}` with reconciled values from Steps 5-6 and 8.

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

- One implementation result, three independent adversarial reviews, one validating apply step.
- Search for falsifying examples rather than confirming examples.
- Preserve context separation between author, reviewers, and fixer.
- Review both local behavior and repository-wide contracts.
- Treat every reviewer claim as untrusted until grounded in code.
- Prefer a small number of high-confidence findings over a long speculative list.
- Convert every fixed behavioral defect into a regression test.
- When the same mistake recurs, improve the workflow or repository guidance that allowed it.

## Important Notes

- **Frontmatter**: `allowed-tools` is intentionally omitted — the skill inherits tools from the session config.
- **Clipboard pattern**: After writing artifact in Step 10, run `pbcopy <absolute-path>` for the user.
- **Exit status**: always exit 0. The status is communicated through the verdict, not the process exit code.

## Clipboard

After writing the code review artifact to disk at Step 10, immediately run `bash` with `pbcopy <absolute-path>` so the user's clipboard has the file path.
