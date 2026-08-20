---
name: commit
description: >-
  Plan, review, and execute atomic Git commits using Conventional Commits.
  Invoke before every git commit, whether requested by the user or initiated
  by an agent. Inspect the full working tree, separate unrelated concerns,
  split files by hunk when necessary, present the exact commit plan, and
  require explicit user approval before staging or committing anything.
---

# Atomic Commit Workflow

Create clean, reviewable Git history.
Every commit MUST represent one logical story. The commit message, staged
files, and staged hunks MUST describe the same concern.

This skill is mandatory before any `git commit` operation.

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

## Mandatory Two-Phase Workflow

### Phase 1: Inspect and Propose

Before staging, unstaging, committing, or modifying Git state:

1. Inspect the complete repository state.
2. Read staged, unstaged, and untracked changes.
3. Understand the purpose of each changed file.
4. Inspect file-level diffs.
5. Inspect individual hunks when a file contains multiple concerns.
6. Group changes into atomic commit candidates.
7. Present the complete proposed commit structure to the user.
8. Stop and wait for explicit approval.

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

Keep changes together only when separating them would produce an invalid,
unbuildable, misleading, or unusable intermediate commit.

Dependency is a valid grouping reason. Convenience is not.

## Mixed Files and Hunk-Level Staging

A file can contain changes for multiple commits.

Do not place the entire file into one commit merely because Git tracks files
as the default staging unit.

When a file contains multiple independent concerns:

1. Inspect each hunk.
2. Assign each hunk to its logical commit.
3. Use patch-based staging.
4. Verify the staged diff before committing.
5. Leave unrelated hunks unstaged for later commits.

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

## The “And” Heuristic

Treat `and`, `also`, `plus`, or `/` in a subject as a warning that the commit
may contain multiple stories.

Do not enforce this mechanically when one indivisible behavior naturally
requires the wording.

Bad:

```text
feat(ui): add search and refactor sidebar
```

Better:

```text
feat(search): add artifact filtering
refactor(sidebar): simplify navigation state
```

Acceptable when it is genuinely one indivisible operation:

```text
fix(parser): validate key and value pairs
```

Atomicity is determined by intent, not by banning a word blindly.

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

### Commit 1
Message:
<type>(<scope>): <summary>

Purpose:
<one precise explanation of the logical story>

Files:
- path/to/file
- path/to/other-file

Hunks:
- path/to/mixed-file: <specific lines or concern>
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

* every commit represents one logical story
* each message accurately describes its exact staged diff
* mixed files were separated by hunk where appropriate
* the user approved the structure before Git state changed
* relevant verification was performed
* no unrelated changes were committed
* remaining working-tree changes were reported
* the resulting history is easy to review, revert, cherry-pick, or bisect

