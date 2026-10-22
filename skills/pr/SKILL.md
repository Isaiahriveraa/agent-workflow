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

Draft PR Description(s) (the PR Description Template below; `## Review Notes` only when needed):
--------------------------------------------------------------------------------
<one body per PR, in the PR Description Template>
--------------------------------------------------------------------------------
commit-pr-reviewer approval required before creating branches, worktrees, stacks, or PRs.
```

### Step 3: Approval Gate
Consult the `commit-pr-reviewer` subagent for approval on this plan, in pull request mode. Create nothing until it approves.

The final report gives the PR URL(s), the strategy used, and the reviewer's verdict.

---

## Senior Developer PR Description Standard

Write for someone reviewing the change without the conversation history. Every PR uses the one
template below; no Summary, Changes, Files, or Notes lists.

- **Title.** Imperative and specific: what the PR does, e.g. "Replace footer with contact section".
  Never "Fix bug", "Updates", or "Phase 1". A Conventional Commit prefix is fine; the subject after it
  stays imperative, e.g. `feat(contact): replace footer with contact section`.
- **Rationale.** One sentence explaining the problem or purpose. Skip personal backstory and obvious
  justifications.
- **Observable Behavior.** The meaningful differences a user (or an agent, for tooling repos) would
  notice, in 1–3 short bullets. Summarize copy changes instead of quoting all the text. Include
  internal changes only when they affect correctness, compatibility, or risk.
- **Verification.** Preview first, then repeatable steps: a deploy preview and what to look at (UI
  changes), each command actually run with its result, then anything important not checked. Never
  claim a check passed without running it. For UI, an optional Before/After table of images a
  reviewer can open (uploaded to the PR, never local paths).
- **Review Notes (optional).** Point to the hardest part: the file or decision to look at closely,
  a non-obvious risk and how to undo it, and a prior change that alters how this PR reads (no PR
  numbers). Omit the section when empty.

Keep the description proportional to the change. Don't repeat information across sections, narrate
implementation steps, list unchanged features, or explain future work unless it affects this review.

Sources: [Google](https://google.github.io/eng-practices/review/developer/cl-descriptions.html),
[GitLab](https://docs.gitlab.com/development/code_review/),
[Phabricator test plans](https://secure.phabricator.com/book/phabricator/article/differential_test_plans/),
[Simon Willison](https://simonwillison.net/2025/Dec/18/code-proven-to-work/),
[Graphite on stacks](https://graphite.com/docs/best-practices-for-reviewing-stacks).

### Reviewer-Facing Only (no internal leakage)

The description is for a reviewer who has only the repo and the PR. Anything they cannot open or
rerun from there does not belong in it.

- **Author's voice.** Write as the PR author, in first person. Never "the user", the author's name, or
  narration about the assistant, agent, skill, or prompt.
- **Attribution.** End with one closing attribution line naming the assistant (for example
  "Co-authored with <assistant name>."), and nothing else about it.
- **Only reviewer-visible references.** No prototype or version labels, local URLs or ports, box
  or home paths, worktree names, or local screenshots. Deploy preview URLs are fine, even with a PR
  number in them, because they don't go stale.
- **No planning metadata.** No line budgets, source-line counts, plan numbers, or internal stack
  ids. GitHub already shows the diff size.
- **No stack order.** No PR numbers, arrows, or neighbor links in Review Notes: `gh stack` and
  GitHub's stack view show the order. Naming the base branch is fine.

| Leaks | Reviewer-facing |
|---|---|
| The top of the stack matches `?v=13`. | Preview: <deploy preview URL> — the hero, project showcases, and contact section. |
| Playwright screenshots match `?v=13` locally. | Ran: `npm run build` → passes. Not checked: mobile layout. |
| `#12 ← this ← #14 · 822 source lines` | Builds on: the header's shared site config. |
| This PR moves the user's portfolio to a light theme. | I'm moving my portfolio to a light theme. |

### PR Description Template

```markdown
<!-- Title: imperative and specific, e.g. "Replace footer with contact section" -->

## Rationale
<one sentence: the problem or purpose>

## Observable Behavior
- <1–3 bullets a user (or agent, for tooling repos) would notice; summarize copy changes>

## Verification
- Preview: <deploy preview URL> — <what to look at>   <!-- UI changes -->
- Ran: `<command>` → <result>
- Not checked: <anything important>

| Before | After |   <!-- optional, UI only -->
|---|---|
| <img> | <img> |

## Review Notes  <!-- optional; omit if empty -->
- Look closely at: <file/area> — <decision, tradeoff, or uncertainty>
- Risk: <what could break / how to undo>, only if not obvious
- Builds on: <prior change that changes how this reads>, no PR numbers

Co-authored with <assistant name>.
```

Drop the HTML comments and any unused optional line before submitting.

### Pre-Submit Self-Check

Run this on the title and body before every `gh pr create`, `gh pr edit`, or `gh stack submit`.
Fix any hit and re-check; never submit a body that fails.

- [ ] Title is imperative and specific.
- [ ] Only the template's sections, in order; Review Notes omitted if empty.
- [ ] Rationale is one sentence; Observable Behavior has 1–3 short bullets.
- [ ] Nothing is repeated across sections, and there is no implementation narration, list of
      unchanged features, or future work that does not affect this review.
- [ ] Every Verification item was actually run, with its result; anything important not checked
      is named.
- [ ] A UI change has a preview link or a Before/After with reviewer-viewable images.
- [ ] Review Notes points to the hardest part, or is omitted.
- [ ] Every sentence is in the author's first person, with no third-person narration of the user
      or the agent.
- [ ] Every link, path, command, and name exists in the repo, on the PR, or on its preview; no
      line counts, budgets, plan numbers, internal ids, or PR numbers/arrows in Review Notes.
- [ ] Finally, for each detail ask: "Would removing this detail make the change harder to review?"
      If not, remove it.

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
