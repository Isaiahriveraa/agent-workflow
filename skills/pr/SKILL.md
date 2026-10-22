---
name: pr
description: "Senior Developer PR workflow: auto-detects whether changes belong in a single PR, stacked PRs (gh stack), or parallel worktrees. Writes short, scannable PR descriptions that say what the change is for and why it was needed, splits mixed concerns, and manages stacks. Use when preparing, reviewing, or opening pull requests."
---

# PR — Senior Developer Pull Request Workflow

The goal of this skill is to craft **Senior Developer Pull Requests**: PRs where concerns are cleanly separated, responsibilities are unambiguous, and reviewing is effortless. Reviewers should understand the human/system rationale in seconds, see exactly how behavior changes without deciphering code trivia, and have total confidence in merging.

You do **not** need to decide ahead of time whether to run `/pr`, `/pr split`, or `/pr stack`. By default, this skill inspects your branch diff, **auto-detects the optimal PR strategy**, and consults the `commit-pr-reviewer` subagent for approval before touching any Git state.

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

## Auto-Detection & Approval Gate

**The skill MUST inspect and write the strategy, and get commit-pr-reviewer approval, before touching Git state, creating branches, or opening PRs.**

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

### Step 2: Write the Proposed PR Plan
Write the proposal in this exact format:

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

Draft PR Description(s) (include `## Builds On` only for Strategy 2 PRs):
--------------------------------------------------------------------------------
## Rationale
<One sentence: what this is for, or the failure it prevents.> <One more sentence: why this approach.>

## Observable Behavior
- <one line: what a caller or buyer sees change>
- <one line, only if there is a second>

## Verification
- `<test name>` — the behavior it locks in

## Builds On
<1-2 sentences: what this adds on top of the work beneath it.> <Optional: what stays incomplete until later work lands.>
--------------------------------------------------------------------------------
commit-pr-reviewer approval required before creating branches, worktrees, stacks, or PRs.
```

### Step 3: Approval Gate
Consult the `commit-pr-reviewer` subagent for approval on this plan, in pull request mode. Create nothing until it approves.

The final report gives the PR URL(s), the strategy used, and the reviewer's verdict.

---

## Senior Developer PR Description Standard

Keep the standard headers — they are what a reviewer scans — and keep what sits under them small.
**Target ~150 words / 10 lines in total.** The overload never comes from the headers; it comes from
paragraphs written under them.

- **Rationale — two sentences.** Line 1 is the purpose or the failure; line 2 is why this approach.
  No alternatives essay and no tradeoff catalogue.
- **Observable Behavior — one line per bullet.** What a caller or buyer sees change. Three bullets
  is a lot; a fifth means the PR is doing too much.
- **Verification — one bullet per test**: `<test name>` — the behavior it locks in. One line for the
  whole suite at most, never a pass count.
- **Nothing repeated.** The three headers already partition the story; telling one fact under two of
  them is what makes a description feel long.
- **Plain words.** The project's domain term or the ordinary English word. Never an operator, class,
  or field name where a verb will do.
- **Say what only the author knows**: what broke, why it matters, the constraint being honoured.
  Mechanism is already in the diff — depth is what review is for, not what the description is for.
- **Respect the reader's attention.** If a detail only matters to someone editing those lines, it
  belongs in the code or the review thread. Overload costs more than a missing sentence.
- **`## Files` is never needed** (the Files Changed tab has it).
- **`## Builds On` is only for stacked PRs** (Strategy 2). Omit it for a single PR or an independent
  worktree PR off trunk; when it applies, it is one or two sentences.
- **Length is the split detector.** If it will not fit in ~150 words, or needs "Also included…", the
  PR holds a second concern — split it instead of documenting it.

### Reviewer-Facing Only (no internal leakage)

The description is for a reviewer who has only the repo and the PR. Anything they cannot open or
rerun from there does not belong in it.

- **Author's voice.** Write as the PR author, in first person. Never "the user", the author's name, or
  narration about the assistant, agent, skill, or prompt. One closing attribution line is fine.
- **Only reviewer-visible references.** No prototype or version labels, local URLs or ports, box
  or home paths, worktree names, or scratch screenshots.
- **Reproducible verification.** List commands and checks a reviewer can run from the repo. A
  manual check is described as the behavior observed, not as a tool that only ran locally.
- **No planning metadata.** No line budgets, source-line counts, plan numbers, or internal stack
  ids. GitHub already shows the diff size.
- **Builds On describes the work, not the stack order.** No PR numbers, arrows, or neighbor links:
  `gh stack` and GitHub's stack view already show the order, and hard-coded numbers go stale when
  the stack is reordered or a layer merges. Naming the base branch is fine.

| Leaks | Reviewer-facing |
|---|---|
| The top of the stack matches `?v=13`. | With the whole stack applied, the home page shows the new hero, project showcases, and contact section. |
| Playwright screenshots match `?v=13` to within font antialiasing (under 0.06% of pixels). | `npm run build` passes. Checked the home page at desktop and mobile widths; nothing overflows. |
| `#12 ← this ← #14 · 822 source lines` | With the light design system and header in place, this adds the hero intro so the page has a first impression. |
| This PR moves the user's portfolio to a light theme. | I'm moving my portfolio to a light theme. |

### Pre-Submit Self-Check

Run this on the body before every `gh pr create`, `gh pr edit --body`, or `gh stack submit`. Fix
any hit and re-check; never submit a body that fails.

- [ ] Every sentence is in the author's first person, with no third-person narration of the user
      or the agent.
- [ ] Every link, path, command, and name exists in the repo or on the PR.
- [ ] Every Verification bullet is a repo command, a repo test, or an observed behavior.
- [ ] No line counts, budgets, plan numbers, or internal ids anywhere in the body.
- [ ] `## Builds On`, if present, contains no PR numbers, arrows, or links and says what this PR
      adds on top of the work beneath it.

### PR Description Template (Default)

Use this for every PR. Add `## Builds On` (below) only when the PR is part of a stack.

```markdown
## Rationale

<One sentence: what this is for, or the failure it prevents.> <One more sentence: why this
approach.>

## Observable Behavior

- <one line: what a caller or buyer sees change>
- <one line, only if there is a second>

## Verification

- `<test name>` — the behavior it locks in
```

### Builds On (Strategy 2 only)

Append this section only to a PR created by `gh stack`. Omit it for a single PR or an independent
worktree PR off trunk. In one or two first-person sentences, say what this PR adds now that the work
beneath it exists. Optionally add what is intentionally incomplete until later work lands. The bottom
layer can say it starts the stack on the base branch.

```markdown
## Builds On

<With <what the lower layers already provide> in place, this adds <what this PR adds>.> <Optional:
<what still looks unfinished> until <later work> lands.>
```

Example: "With the light design system and header in place, this adds the hero intro so the page has
a first impression. The project section still looks unstyled until the scroll palette lands."


---

## Execution Runbooks (After Approval Only)

Every body passes the Pre-Submit Self-Check before it is submitted.

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
