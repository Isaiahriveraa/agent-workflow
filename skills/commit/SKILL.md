---
name: commit
description: >-
  Plan, review, and execute atomic Git commits using Conventional Commits.
  Invoke before every git commit, whether requested by the user or initiated
  by an agent. Run an informational pre-commit review gate, inspect the full
  working tree, separate unrelated concerns, split files by hunk when
  necessary, present the exact commit plan, and require explicit user
  approval before staging or committing anything.
---

# Atomic Commit Workflow

Create clean, reviewable Git history.
Every commit MUST represent one logical story. The commit message, staged
files, and staged hunks MUST describe the same concern.

This skill is mandatory before any `git commit` operation.

## Invocation and Options

The default `commit` invocation runs the Phase 0 pre-commit review gate,
unless the current fingerprint matches `.git/code-review.marker`, in which
case the gate is skipped as already reviewed.

Use `commit --no` to explicitly skip only the Phase 0 code-review gate.
`commit --no-review` is an accepted descriptive alias. This opt-out must be
intentional and must be reported in both the proposal and the final result.
It does not bypass user approval, atomic grouping, staged-diff verification,
or any relevant checks.

## Core Rule

> One commit, one reason for change.

A commit is atomic when a reviewer can understand, approve, revert, or
cherry-pick it independently.

Files belong in the same commit only when they are necessary to deliver the
same logical change.

Do not group changes merely because:

* they were edited at the same time
* they are in the same directory
* they belong to the same feature branch
* they are part of the same user request
* committing them together is easier

## The Responsibility Unit

A commit's unit is one responsibility: one behavior change with one reason to
exist.

The commit series is the reviewer's table of contents. If a reviewer must hold
two ideas in their head to approve one commit, the split failed.

A candidate commit is one responsibility only when all three tests hold:

1. One-sentence test — its purpose is one sentence with no conjunction and no
   comma-separated concept list.
2. Alone-revert test — reverting only this commit leaves a coherent repository:
   no dead code, orphaned references, or half-applied concept.
3. Independent-approve test — a reviewer can approve or reject it without
   having an opinion about the other commits in the series.

A pull request concern is a cohesive capability; a commit responsibility is one
behavior change inside it. One pull request normally contains several commits,
and a single pull-request concern is never a reason for one omnibus commit.

## Phase 0: Pre-Commit Review Gate (informational)

By default, Phase 0 is review-or-marker-skip: run the code-review gate unless
the current fingerprint matches the marker. The gate is advisory: it surfaces
findings and lets the user decide. It never auto-fixes and never blocks the
commit.

When `--no` or `--no-review` is supplied, intentionally skip only this
code-review gate. Do not treat the review as mandatory in that invocation;
the explicit opt-out must be reported in the proposal and final result, and
all other workflow and safety rules remain in force.

### When to run

Compute a fingerprint of the changes to be committed and compare it to the
last-reviewed marker stored at `.git/code-review.marker`.

* If the current fingerprint matches the marker, the exact changes were
  already reviewed — skip the gate and proceed to Phase 1.
* Otherwise, run the review unless `--no` or `--no-review` was explicitly
  supplied.

### Fingerprint

Fingerprint the full change set that would be committed, including untracked
files so brand-new code is reviewed:

```bash
# include untracked files so new code is reviewed
git add -N <untracked files>
git diff HEAD | shasum -a 256
```

Compare the output to `.git/code-review.marker`. On a match, skip the gate.

After computing the fingerprint (and after any review), clear only the
intent-to-add entries so existing staging intent is preserved:

```bash
git reset -- <the intent-to-added files>
```

### Run the review

Invoke code-review scoped to the working-tree changes (`modified`), which
includes the intent-to-added untracked files. Do NOT pass `--fix` and do NOT
act on the verdict automatically.

### Surface, do not decide

Present the code-review verdict and findings to the user. Do not auto-apply
fixes and do not block the commit on the verdict. The review is input to the
user's decision; the Phase 1 approval gate below remains the sole gate.

The user may:

* fix the findings and re-run the gate (the marker updates on the next pass),
  or
* proceed to Phase 1 and commit as-is with the findings acknowledged.

After a review completes, record the fingerprint in `.git/code-review.marker`
so unchanged work is not re-reviewed on a later commit.


## Mandatory Workflow

### Phase 1: Inspect and Propose

Before staging, unstaging, committing, or modifying Git state:

1. Inspect the complete repository state.
2. Read staged, unstaged, and untracked changes.
3. Understand the purpose of each changed file.
4. Inspect file-level diffs.
5. Inspect individual hunks when a file contains multiple concerns.
6. Inventory responsibilities: list every distinct behavior change in the
   working tree — imperative, one line each, no conjunctions. Read the list
   back: any line containing "and" is two responsibilities; split the line.
7. Map every hunk to exactly one inventory line. A hunk mapping to two lines is
   a mixed hunk and must be patch-split.
8. Propose the most-split valid plan: one commit per inventory line, then merge
   only pairs that pass the Dependency test with a named, observed failure.
9. Present the complete proposed commit structure to the user.
10. Stop and wait for explicit approval.

During Phase 1, NEVER run:

* `git add`
* `git reset`
* `git restore --staged`
* `git commit`
* `git commit --amend`
* interactive staging commands that alter the index

Read-only Git commands are allowed.

### Phase 2: Execute the Approved Plan

Only after the user explicitly approves the proposed structure:

1. Stage only the files or hunks assigned to the first commit.
2. Verify the staged diff.
3. Confirm the staged diff matches the approved story.
4. Create the commit using the approved message.
5. Repeat for each approved commit.
6. Inspect the final repository state.
7. Report the commits created and any remaining changes.

Approval applies only to the exact plan shown.

Return to Phase 1 when:

* the grouping changes
* files are added or removed from a commit
* a commit message changes materially
* new modifications appear
* staging reveals hidden mixed concerns
* the approved plan cannot be executed safely

## Approval Gate

Do not interpret vague responses as approval.

Valid approval includes clear language such as:

* `approved`
* `proceed`
* `commit this`
* `execute the plan`
* `yes, create these commits`

Discussion, questions, corrections, or partial agreement are not approval.

Never bypass the approval gate because the changes appear safe or obvious.

## Repository Inspection

Inspect all relevant states before proposing commits:

```bash
git status --short
git diff --stat
git diff
git diff --cached
git ls-files --others --exclude-standard
```

Use additional read-only commands when useful:

```bash
git diff -- path/to/file
git diff --cached -- path/to/file
git log --oneline -10
git log -10 --format=%s
git branch --show-current
```

Use recent history to identify repository-specific commit conventions.

Do not assume every modified file belongs in a commit. Detect generated,
temporary, secret, local-state, or unrelated files and flag them.

## Atomic Grouping Rules

Split changes into separate commits when they differ by any meaningful axis.

### Change Type

Separate different Conventional Commit types when they represent distinct
work:

* `feat`
* `fix`
* `refactor`
* `perf`
* `test`
* `docs`
* `style`
* `build`
* `ci`
* `chore`
* `revert`

A test may remain with its implementation when it directly proves that same
behavior.

A documentation update may remain with its implementation when the docs are
required to use or understand that exact change.

### Scope

Split changes that affect independent areas, such as:

* frontend versus backend
* CLI versus API
* authentication versus billing
* runtime logic versus CI configuration
* application code versus developer tooling

Shared files do not automatically mean shared scope.

### Motivation

Split changes with different reasons, including:

* fixing existing behavior
* introducing new behavior
* restructuring code without changing behavior
* improving performance
* updating dependencies
* cleaning formatting
* adding tests for previously untested behavior

### Revertability

Ask:

> Could a reviewer reasonably want to revert one part without reverting the
> other?

If yes, split them.

### Dependency

Default to splitting. Merge two responsibilities only when you can name the
concrete failure of splitting them — what breaks and which check proves it —
and record it as:

```text
Dependency: <X> cannot land without <Y> because <observed failure>
```

These are not dependencies:

* "they were designed together"
* "the contract only makes sense with its implementation"
* "it is one feature or one vertical slice"
* "the tests are shared"
* "splitting is extra work"

A vertical slice — domain contract, state reducer, wiring — is normally several
responsibilities that land in sequence. Ordering is how a split is made legal:
when the contract, the reducer, and the wiring can be ordered so each
intermediate commit is valid, the split is legal and required.

When an intermediate commit is genuinely unusable until the next one lands,
that is a finding to report with its cost: propose the split and let the user
choose. Only an observed, named failure justifies a merge. If you cannot name
the broken check, split.

## Mixed Files and Hunk-Level Staging

A file whose changes all belong to one approved concern may be staged as a
whole, even when it contains multiple Git hunks. Do not split such hunks
merely because there is more than one hunk.

When a file contains multiple independent concerns, or when the approved plan
deliberately selects only part of a file, hunk-level staging is required:

1. Inspect each relevant hunk.
2. Assign each hunk to its logical commit.
3. Use patch-based staging.
4. Verify the staged diff before committing.
5. Leave unrelated hunks unstaged for later commits.

Hunk-level staging is therefore required for mixed-concern files and
deliberately partial selection, but not for a one-concern file staged in full.

Preferred tools:

```bash
git add -p path/to/file
git reset -p path/to/file
git restore --staged -p path/to/file
```

Use hunk splitting or manual patch editing when one displayed hunk contains
multiple concerns.

Never stage unrelated lines merely because Git initially groups them into the
same hunk.

If changes are too intertwined to separate safely, report that limitation and
propose one of these approaches:

1. Refactor the working tree before committing.
2. Commit the inseparable dependency together with an explicit explanation.
3. Ask the user to choose between clearly stated tradeoffs.

Do not silently force an artificial split that produces broken commits.

## Commit Ordering

Order commits so each commit leaves the repository in a coherent state.

Prefer this dependency order when applicable:

1. preparatory refactor with no behavior change
2. core implementation
3. tests tied to the implementation
4. documentation
5. build, CI, or tooling changes

Do not create preparatory commits unless the preparation is independently
meaningful.

Every commit should build and pass relevant checks when practical.

## Commit Message Format

Use Conventional Commits:

```text
<type>(<scope>): <imperative summary>
```

The scope is optional but preferred when it adds useful precision.

Examples:

```text
feat(review): add inline follow-up prompts
fix(session): reuse agent process per pull request
refactor(tui): isolate question rendering state
test(review): cover follow-up input expansion
docs(agent): document commit approval workflow
```

## Subject Rules

The subject MUST:

* use lowercase Conventional Commit type
* use imperative mood
* describe one logical result
* explain the meaningful outcome
* remain concise
* have no trailing period
* avoid vague verbs such as `update`, `change`, or `modify` when a more precise
  verb exists
* avoid file-name narration
* avoid AI attribution

Aim for 50 characters when practical.

Hard limit: 72 characters.

## One Subject, One Story

The subject and the Purpose MUST NOT contain `and`, `also`, `plus`, `/`, `+`,
or a comma joining two concepts.

Two exceptions are allowed, and each MUST be named in the proposal as
`Indivisible:` with its reason:

1. One indivisible operation that happens to read with a conjunction, such as
   `fix(parser): validate key and value pairs`.
2. A mechanical rename where the old and new names appear together; prefer
   `switch X to Y` over `replace X with Y`.

Bad:

```text
feat(ui): add search and refactor sidebar
```

Better:

```text
feat(search): add artifact filtering
refactor(sidebar): simplify navigation state
```

When a subject or Purpose fails this gate and no exception is claimed, that is
a Failure Condition: do not present the plan.

## Bundling Anti-Patterns

* Concept-list subject — `feat(domain): add contracts, quote freezing, and
  state reducers` names three concepts, so it is three commits.
* Slice bundle — a contract, its logic, and its wiring committed together
  because they were written together; the inventory lists three lines.
* Layer bundle — `refactor: extract helpers, update callers, adjust tests` when
  each part can land independently.
* While-I-was-there — an unrelated fix riding along with a feature.
* Test coupon — tests for unrelated behaviors in one `test:` commit.

Detection is mechanical: run the one-sentence test on both the subject and the
Purpose. Any conjunction or comma list means split before presenting the plan.

## Commit Body

Skip the body when the subject fully explains the change.

Add a body when the reasoning is not obvious, especially for:

* security fixes
* breaking changes
* migrations
* reverts
* non-obvious tradeoffs
* compatibility constraints
* behavior that appears unusual without context

The body should explain why the change exists and any important consequences.

Do not restate the diff.

Wrap body lines near 72 characters.

Example:

```text
fix(session): reuse agent process per pull request

Starting a new process for every question discarded conversational context
and created unnecessary startup overhead.

Keep one process associated with the active pull request until review ends.
```

## Breaking Changes

Use `!` in the header or a `BREAKING CHANGE:` footer:

```text
feat(api)!: replace legacy review endpoint
```

```text
BREAKING CHANGE: clients must send review context through /v2/reviews.
```

Clearly describe migration requirements.

## Required Proposal Format

Before touching Git state, output:

```text
## Proposed Commit Plan

### Responsibility Inventory
1. <verb phrase — one responsibility>
2. <verb phrase — one responsibility>

### Commit 1
Message:
<type>(<scope>): <summary>

Purpose:
<one sentence naming the single behavior change; no conjunctions or concept
lists>

Dependency:
<none — lands independently | blocked by Commit N because <observed failure>>

Indivisible:
<not claimed | the reason a split is impossible, with the check that proves it>

Review gate:
<default review ran | marker matched and review skipped | explicitly skipped
with --no/--no-review>

Files:
- path/to/file
- path/to/other-file

Hunks:
- For a one-concern file staged in full: `<path>` — whole file (all changes
  belong to this concern)
- For a mixed-concern or deliberately partial file: `<path>` — exact hunks,
  lines, or concerns staged
- None

Verification:
- <test, lint, build, or staged-diff check>

### Commit 2
Message:
...

## Excluded or Remaining Changes
- path/to/file: <why it is excluded or deferred>
- None

## Execution Order
1. <commit 1 summary>
2. <commit 2 summary>

## Diff Scope
- path/to/file: +<added> / -<removed>
- path/to/other-file: +<added> / -<removed>
- Total files: <N>
- Total added: +<total added>
- Total removed: -<total removed>

Approval required before staging or committing.
```

For a single commit, still show the full proposal.

Do not output only commit messages. The user must be able to review exactly
which files and hunks belong to each commit.

Every inventory line must appear in exactly one commit, and every commit must
map to exactly one inventory line. When the mapping is not one-to-one, the
plan must name the dependency or indivisible exception that justifies it.

Diff Scope must show the exact line counts for the changes covered by the
proposal: `git diff --numstat` for per-file added/removed counts and
`git diff --stat` for the total. With hunk-level staging, show per-commit
numbers; otherwise show the working-tree totals.

## Pre-Commit Verification

Before every commit, run:

```bash
git diff --cached --stat
git diff --cached
```

Verify:

* every staged line belongs to the approved commit
* no approved line is missing
* no unrelated file is staged
* no secret or generated artifact is included accidentally
* the message accurately describes the staged diff

When practical, run the smallest relevant verification command:

* focused unit tests
* targeted integration tests
* type checking
* linting
* build checks

Do not claim verification succeeded unless the command was run and its output
was checked.

## Post-Commit Verification

After each commit:

```bash
git show --stat --oneline HEAD
git status --short
```

Confirm:

* the commit contains the intended files and hunks
* later commit changes remain available
* no changes were lost
* no unrelated changes were included

After all commits, report:

```text
## Commits Created

1. `<short-sha> <commit message>`
   - Files: ...
   - Verification: ...

2. `<short-sha> <commit message>`
   - Files: ...
   - Verification: ...

## Remaining Working Tree
- <remaining changes>
- Clean
```

## Amendments

Do not amend an existing commit unless the user explicitly requests it.

Before amending:

1. inspect the existing commit
2. inspect the new staged changes
3. show the proposed amended result
4. obtain explicit approval

Never amend a commit that may already be shared or pushed without warning the
user about history rewriting.

## Safety Rules

Never:

* commit without explicit approval
* stage files before presenting the plan
* stage the entire repository with `git add .` or `git add -A` unless every
  change was inspected and the approved plan explicitly includes all of them
* use `--no-verify` unless explicitly authorized
* include secrets, credentials, `.env` files, or private keys
* modify source code merely to make commit grouping easier without approval
* discard working-tree changes
* reset, rebase, squash, force-push, or rewrite history unless explicitly
  requested
* combine unrelated work to reduce commit count
* split tightly coupled work into commits that leave the repository broken
* invent issue numbers or scopes
* add AI attribution or generated-by trailers

## Handling Existing Staged Changes

Existing staged changes are not automatically approved.

Inspect them separately.

If the staged index mixes concerns:

1. explain the violation
2. show the corrected grouping
3. request approval
4. only then unstage or restage the necessary files or hunks

Do not destroy the user’s staging intent without showing what will change.

## Handling Untracked Files

Inspect untracked files before assigning them to commits.

Classify each as:

* required source
* required test
* required documentation
* generated output
* local state
* secret or sensitive
* unrelated work
* uncertain

Do not include uncertain files until their purpose is verified.

## Handling Repository Conventions

Inspect recent commit history before choosing message style.

Follow established repository conventions when they are compatible with
atomic, understandable history.

Conventional Commits remain the default.

Repository conventions may determine:

* preferred scopes
* ticket references
* body formatting
* capitalization
* required trailers

Do not copy poor historical practices such as vague messages or mixed commits.

## Failure Conditions

Stop without committing when:

* the user has not approved the plan
* a subject or Purpose contains a conjunction and no Indivisible exception is
  claimed
* two responsibilities are grouped with no named, observed dependency
* the inventory lines do not account for every change in the diff
* the diff cannot be understood confidently
* files contain secrets
* changes cannot be separated safely
* the index differs from the approved plan
* required verification fails
* new changes appear during execution
* committing would require destructive or history-rewriting operations

Explain the blocker precisely and show the safest next action.

## Success Criteria

The workflow is complete only when:

* the pre-commit review gate ran, was correctly skipped via the marker, or was
  explicitly skipped with `--no`/`--no-review`, and that choice was reported
* every commit represents one logical story
* every commit subject and Purpose passes the one-sentence test, or claims a
  named Indivisible exception
* every inventory line appears in exactly one commit, and every commit maps to
  exactly one inventory line
* every commit that merges two responsibilities names the observed dependency
  that justifies the merge
* each message accurately describes its exact staged diff
* one-concern files were staged as whole files when appropriate
* mixed-concern and deliberately partial files were separated by hunk
* the user approved the structure before Git state changed
* relevant verification was performed
* no unrelated changes were committed
* remaining working-tree changes were reported
* the resulting history is easy to review, revert, cherry-pick, or bisect
