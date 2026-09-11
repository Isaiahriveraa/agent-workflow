---
name: pr
description: "Senior Developer PR workflow: auto-detects whether changes belong in a single PR, stacked PRs (gh stack), or parallel worktrees. Generates review-ready PR descriptions focused on rationale and observable behavior, splits mixed concerns, and manages stacks. Use when preparing, reviewing, or opening pull requests."
---

# PR — Senior Developer Pull Request Workflow

The goal of this skill is to craft **Senior Developer Pull Requests**: PRs where concerns are cleanly separated, responsibilities are unambiguous, and reviewing is effortless. Reviewers should understand the human/system rationale in seconds, see exactly how behavior changes without deciphering code trivia, and have total confidence in merging.

You do **not** need to decide ahead of time whether to run `/pr`, `/pr split`, or `/pr stack`. By default, this skill inspects your branch diff, **auto-detects the optimal PR strategy**, and proposes it for approval before touching any Git state.

---

## The 3 Senior Developer PR Strategies

When invoked, the skill evaluates the current branch against the target base branch across three core dimensions: **Concern Cohesion**, **Dependency Relationship**, and **Diff Size/Reviewability**. It then auto-proposes one of three strategies:

```
                      ┌────────────────────────────────────────┐
                      │    Inspect Branch Diff Against Base    │
                      └───────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         [ Single Concern ]                             [ Multiple Concerns ]
                  │                                               │
         ┌────────┴────────┐                             ┌────────┴────────┐
         ▼                 ▼                             ▼                 ▼
   ( < 500 lines )   ( > 500 lines )             [ Dependent? ]    [ Independent? ]
         │                 │                             │                 │
         ▼                 ▼                             ▼                 ▼
   ┌───────────┐     ┌───────────┐                 ┌───────────┐     ┌───────────┐
   │ Strategy 1│     │ Split by  │                 │ Strategy 2│     │ Strategy 3│
   │ Single PR │     │ Natural   │                 │ Stacked   │     │ Parallel  │
   │           │     │ Seams     │                 │ PRs       │     │ Worktrees │
   │           │     │ (Stack/WT)│                 │ (gh stack)│     │           │
   └───────────┘     └───────────┘                 └───────────┘     └───────────┘
```

### Strategy 1: Single PR — *Single Cohesive Concern*
- **When auto-detected**: The diff represents one clear, undivided concern (e.g. one feature, one bugfix, one refactor), is appropriately sized (< 500–700 lines), and is logically self-contained.
- **Reviewer experience**: Fast, comprehensive review in one pass. Reviewer reads the problem, understands the behavioral shift, verifies the tests, and approves.
- **Execution**: Generates the senior-developer PR description and opens a single draft PR targeting the base branch.

### Strategy 2: Stacked PRs (`gh stack`) — *Sequentially Dependent Concerns*
- **When auto-detected**: The changes span multiple concerns that build sequentially on top of each other (e.g. Step 1: Schema/Database Migration → Step 2: Domain Logic/API Endpoints → Step 3: UI/Consumer Interface).
- **Why a stack**: Reviewers evaluate and approve foundational architecture first before reviewing dependent consumer code. Diffs stay small and focused without blocking downstream progress.
- **Execution**: Uses `gh stack` to create a bottom-up sequence of draft PRs, where each PR carries one concern and targets the branch immediately below it.

### Strategy 3: Parallel Worktrees / Independent PRs — *Mutually Independent Concerns*
- **When auto-detected**: The branch mixes multiple concerns that do *not* depend on each other (e.g. an unrelated bugfix noticed mid-task, a tooling/deps chore, and a new feature).
- **Why parallel worktrees**: Independent concerns should never be grouped together or block each other. Per `AGENTS.md` Concern Discipline, each belongs in its own isolated worktree (`~/.agents/scripts/new-worktree.sh <branch>`) targeting `main`/`development` directly.
- **Execution**: Extracts the independent concerns into dedicated worktrees/branches, allowing each to be reviewed, approved, and merged in parallel without coupling.

---

## Core Principle: Dual Discipline

Every PR proposal must pass **two levels of separation**:

### Level 1 — PR Concern Discipline
Each PR addresses exactly **one concern** (one user-facing capability, bug fix, or refactor). Files spanning different domains (mobile vs server), change types (`feat` vs `fix` vs `chore`), or unrelated motivations belong in separate PRs.

For a new capability or feature, prefer **behavior-complete vertical slices** (schema + backend + UI + tests in one PR) within review budget (~200–500 lines). Do NOT split a single feature into separate horizontal layer PRs (e.g. schema PR, API PR, UI PR) unless crossing true team or repository boundaries; horizontal PRs cannot be verified end-to-end and force reviewers to evaluate incomplete systems.
### Level 2 — Commit Discipline
Within each PR, **each commit addresses exactly one logical unit**. A single PR may have multiple commits, but no commit may mix unrelated changes.

**The "And" Test**: If a commit or PR summary needs "and" to explain what it does, it contains multiple concerns and must be split.

---

## Auto-Detection & Proposal Gate

**The skill MUST inspect and propose the strategy before touching Git state, creating branches, or opening PRs.**

### Step 1: Discovery & Analysis
Run read-only inspection commands:
```bash
git branch --show-current
git status --short
git log --oneline <base>..HEAD
git diff --stat <base>...HEAD
git diff --name-only <base>...HEAD
```

Evaluate:
1. **Domains**: Are there mobile, backend, CLI, or infra changes mixed together?
2. **Motivations**: Are there feature additions, bugfixes, and chores/refactors mixed together?
3. **Dependencies**: Does concern B require concern A, or could B merge right now without A?
4. **Volume**: Is any single concern > 700 lines?

### Step 2: Present the Proposed PR Plan
Present the proposal in this exact format:

```text
PROPOSED PR PLAN
================
Auto-Detected Strategy: [Strategy 1: Single PR | Strategy 2: Stacked PRs (gh stack) | Strategy 3: Parallel Worktrees]
Rationale: <Why this strategy was selected based on diff analysis and dependencies>

PR Breakdown:
1. PR: <type>(<scope>): <concise title>
   - Branch: <branch-name> -> Base: <base-branch>
   - Concern: <one-sentence description of the concern>
   - Files: <list of files or summary>
   - Commits:
     - <type>(<scope>): <unit 1>
     - <type>(<scope>): <unit 2>

2. PR: <type>(<scope>): <concise title> (if Strategy 2 or 3)
   - Branch: <branch-name> -> Base: <stacked parent or base-branch>
   - Concern: <one-sentence description of the concern>
   ...

Draft PR Description(s):
--------------------------------------------------------------------------------
## Rationale
<The human/system why, problem solved, alternatives considered>

## Observable Behavior
<What the user or caller experiences; contract changes; NO diff recaps>

## Verification
<Specific tests added or run to verify behavior>
--------------------------------------------------------------------------------
Approval required before creating branches, worktrees, stacks, or PRs.
```

**STOP — wait for explicit user approval.** Never create branches or PRs before the user says `approved`, `proceed`, or `yes`.

---

## Senior Developer PR Description Standard

Reviewers read PR descriptions to understand **why** the change was made and **what** the observable behavior is. They already have the "Files changed" tab to inspect the code lines, functions, and files.

- **Rationale (The Why)**: Explain the problem, bug, limitation, or user need that prompted this change. Why does this PR exist? What happens without it? Why this approach over alternatives?
- **Observable Behavior (The What)**: Describe the observable outcome from the perspective of the user, caller, or consumer. What can someone do now that they couldn't before? How does system behavior change?
- **NEVER recite code implementation details**: Never dump a line-by-line or file-by-file code recap (e.g. "added helper X, updated method Y, imported Z"). That is implementation trivia already visible in the diff. Explain behavior, not code plumbing.
- **Verification proves behavior**: Verification exists to prove the behavior was implemented as intended. Explicitly call out tests added or updated to verify that behavior (e.g. "Added `test_name` to verify that..."), followed by the commands run and observable outcomes.
- **No-Repeat Rule**: If summary and rationale overlap, combine them as `## Summary & Rationale` instead of repeating yourself.
- **Omit Stack Context unless stacked**: Only include `## Stack Context` when the PR is part of a multi-PR stack. Never include it for normal standalone PRs.

### PR Description Template (Default)

```markdown
## Rationale

<!--
- What problem, limitation, or user pain existed? (The Human/System Why)
- What happens without this change?
- Why was this solution chosen over alternatives, and what tradeoffs were accepted?
-->

## Observable Behavior

<!--
- What observable outcome or behavior does this produce from the perspective of the user or caller?
- Focus STRICTLY on what the system does and how behavior changes.
- DO NOT list code-level implementation details, file-by-file changes, or repeat the diff.
-->

## Verification

<!--
- How was the behavior verified as implemented as intended?
- List specific tests added or updated to verify behavior (e.g., "Added <test-name> to verify <behavior>").
- What automated commands or manual checks were run, and what were the observed results?
-->
```

### Overlapping Layout (When Summary & Rationale Coincide)

```markdown
## Summary & Rationale

<!--
- State why this change exists and what observable behavior it produces in one cohesive narrative.
- Do NOT repeat yourself across separate headers. Focus on the why and observable behavior, never code implementation.
-->

## Verification

<!--
- How was the behavior verified as implemented as intended?
- List specific tests added or updated to verify behavior (e.g., "Added <test-name> to verify <behavior>").
- What automated commands or manual checks were run, and what were the observed results?
-->
```

### Stack Context (Stacked PRs ONLY)

Include this section **only** when the PR is part of a multi-PR stack (`gh stack`):

```markdown
## Stack Context

- Position: <N> of <M>
- Base PR: #<number> or `<base-branch>` for the bottom PR
- Depends on: #<number> or `N/A` for the bottom PR
```

---

## Execution Runbooks (Post-Approval Only)

### Executing Strategy 1: Single PR
1. Confirm commits on the branch are clean and granular (`git log --oneline <base>..HEAD`).
2. Push branch: `git push -u origin <branch>`.
3. Create draft PR:
   ```bash
   gh pr create --draft --base <base> --title "<type>(<scope>): <summary>" --body-file <temp-body-file>
   ```
4. Verify created PR: `gh pr view --json body,title,state`. Confirm proper line breaks, headers, and draft status.

### Executing Strategy 2: Stacked PRs (`gh stack`)
1. Create or adopt branches in dependency order; each branch contains only its proposed concern.
2. Initialize and sync the stack:
   ```bash
   gh stack init --base <base> <branch-1> <branch-2> ...
   gh stack sync
   gh stack submit
   ```
3. Use `gh stack submit` to create the linked draft PRs on GitHub with their concern-specific titles and descriptions.
4. Verify stack structure: PR 1 targets `<base>`, PR 2 targets `<branch-1>`, PR 3 targets `<branch-2>`.
5. Stacks merge bottom-up: after PR 1 merges, use `gh stack sync` to rebase and retarget PR 2.

### Executing Strategy 3: Parallel Worktrees
1. For each independent concern, create an isolated Git worktree:
   ```bash
   ~/.agents/scripts/new-worktree.sh <branch-name>
   ```
2. In each worktree, stage and commit only that concern's files using atomic commit discipline.
3. Verify each worktree independently (`npm test`, `git diff --stat`).
4. Push each branch and open a draft PR targeting `<base>` directly.
5. Each PR reviews and merges independently. Once merged, clean up each worktree:
   ```bash
   ~/.agents/scripts/cleanup-worktree.sh <branch-name>
   ```

---

## Red Flags (Stop and Split)
- More than 10 files modified in a single PR
- Multiple unrelated change types (`feat` mixed with `refactor` or `chore`)
- "While I'm here, let me also..."
- The PR description requires "and" in the title or summary
- A reviewer would take > 20 minutes to understand the diff

**Remember**: A 5-file PR merged today > a 50-file PR "almost done". Effortless reviewability is the standard of senior engineering.
