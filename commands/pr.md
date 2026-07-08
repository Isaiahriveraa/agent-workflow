---
description: Generate PR descriptions, split branches into concern-tight PRs, or convert dirty branches into clean stacked draft PRs
---

# PR — Pull Request Workflow

Three submodes: `/pr` (generate description), `/pr split` (split by concern), `/pr stack` (stacked draft PRs from dirty branch).

```
/pr          — Generate a PR description for the current branch
/pr split    — Split current branch into concern-tight PRs (sub-700 lines each)
/pr stack    — Convert a dirty branch into a clean stack of draft PRs
```

---

## Core Principle: Dual Discipline

Every PR must pass **two levels of separation**, enforced at every submode:

### Level 1 — PR Concern Discipline
Each PR addresses exactly **one concern**. Files spanning different domains, change types, motivations, or architectural layers belong in separate PRs.

### Level 2 — Commit Discipline
Within a PR, **each commit addresses exactly one logical unit**. A single PR may have multiple commits, but no commit may mix unrelated changes.

**Examples of valid within-PR commit splits:**

| PR Concern | Good Commits (separated) | Bad Commits (lumped) |
|---|---|---|
| Update app config | `chore: add .env to gitignore` + `chore: update deps` + `chore: wire main.dart` | `chore: update everything` |
| Add auth feature | `feat: add auth screen` + `feat: add auth service` | `feat: add auth` |
| Refactor widgets | `refactor: extract shared button mixin` + `refactor: clean up header layout` | `refactor: fix widgets` |

**Commit boundary test**: If a commit's message needs "and" to describe what it does, it should be split.

---

## Proposal Gate: Propose Before Executing

**Both `/pr split` and `/pr stack` MUST propose the full plan before touching git, branches, or PRs.** No execution happens until the user approves.

The proposal must list, in order:

```
PROPOSED PLAN
=============
PR #1 — <prefix>: <title>
  Branch: <branch-name>
  Files: <file-a>, <file-b>
  Commits:
    1. <prefix>(<scope>): <summary>
    2. <prefix>(<scope>): <summary>

PR #2 — <prefix>: <title>
  Branch: <branch-name>
  Files: <file-c>, <file-d>
  Commits:
    1. <prefix>(<scope>): <summary>
```

Format: a clear table or numbered list showing every PR and every commit within it.

**Rules:**
- Present the plan to the user in a clearly formatted block.
- Do NOT proceed until the user explicitly approves.
- If the user requests adjustments, update the plan and re-propose.
- Only after approval, execute the full plan in sequence.

---

## Submode: `/pr` — PR Description

Generate a PR description based on the actual branch diff. Sized to the change.

### Operating Rules

- Do not open a PR or push commits without approval.
- Inspect the branch against the intended base branch first.
- Size the PR before writing it.
- Describe only what is actually in the committed branch diff against the base branch.
- Do not mention local-only files, ignored files, or plans/research artifacts unless they are committed and reviewer-relevant.
- Do not invent provenance from the conversation. If it is not visible in `git log`, `git diff --stat`, `git diff --name-only`, or the inspected diff, leave it out.
- Keep reviewer-facing text repo-clean: no machine-specific absolute paths, no local home-directory references.
- If `thoughts/` or other artifact directories are not part of the committed diff, do not mention them.

### Required Discovery

1. Check branch state: `git branch --show-current`, `git status --short`
2. Determine the base branch (default: upstream default or user-specified).
3. Inspect the change against base: `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`, `git diff --name-only <base>...HEAD`
4. **Inspect commit granularity**: run `git log --oneline <base>..HEAD` and check that each commit message describes a single logical unit. If any commit mixes unrelated files, flag it and suggest splitting before PR creation.
5. Decide PR size: `small` (1-2 commits), `medium` (several related commits), `large` (cross-cutting, architectural).
   If the branch mixes unrelated stories, stop and say so before writing.

### Structure

Every PR body uses the same three sections regardless of size — each **must** be a markdown header (`###`) in the output body text:

### Summary
A paragraph describing what this PR does — scope, approach, main change.

### Rationale
- Why each change exists — context, constraints, tradeoffs

### Tests
- What was tested and how (manual, unit, integration)
- What was NOT tested and why

### Writing Standard

Professional, direct, plain. No filler, no marketing, no "this PR aims to", no "please review", no AI attribution, no generated-by footers.

---

## Submode: `/pr split` — Split Branch into Concern-Tight PRs

Split the current branch into small, concern-tight PRs targeting `development` (or specified base branch). Each PR carries exactly one concern and stays under 700 diff lines.

### Concern Boundaries

Files belong in different PRs when they span:
- **Different domains** (mobile vs website vs server)
- **Different change types** (`feat` vs `fix` vs `refactor` vs `chore`)
- **Different motivations** (adding a feature vs cleaning up dead code vs adding docs)
- **Different architectural layers** (UI components vs services vs shaders)

Prefix rules: `feat:`, `fix:`, `refactor:`, `chore:` (dead code deletion is `chore:`, NOT `refactor:`).

### Size Gate

Every PR diff MUST be under 700 lines. If a concern exceeds it, split further by natural seams.

### Execution Steps

**Phase 1 — Analyze & Categorize**: Inspect the branch diff against the merge base. Group changed files by concern domain, change type, and motivation. Within each concern group, further split files into logical commit units.

**Phase 2 — Propose**: Present the full plan to the user (per the Proposal Gate above) showing every PR, every branch name, every file in each PR, and every commit with its message. Do NOT execute anything yet.

**Phase 3 — Execute (only after approval)**:

3a. **Create branches with commit discipline**:
   ```bash
   git checkout -b <branch-name> <merge-base>
   git checkout <source-branch> -- <file1> <file2> ...
   ```
   **Then stage and commit files in logical groups** — do NOT lump all files into one commit:
   ```bash
   git add <file-A>          # first logical unit
   git commit -m 'type(scope): summary of unit A'
   git add <file-B> <file-C> # second logical unit
   git commit -m 'type(scope): summary of unit B and C'
   ```
   Each commit must pass the "and" test — if the message needs "and", split.
   
   Example: for a PR updating deps AND wiring main.dart:
   ```
   git add pubspec.yaml pubspec.lock
   git commit -m "chore(scope): update dependencies"
   git add lib/main.dart
   git commit -m "chore(scope): wire new components into app entry point"
   ```

3b. **Verify each branch**: diff --stat, wc -l < 700, log --oneline — **also verify commits are well-separated** (`git log --oneline` shows each commit targeting one unit).

3c. **Merge ordering — CRITICAL**: Merge SEQUENTIALLY from lowest-risk first (chore > refactor > feat). After each merge, sync remaining branches with base before merging next.

3d. **Open PRs** using `gh pr create` with proper bodies sized to each diff.

---
## Submode: `/pr stack` — Dirty Branch → Clean Stacked Draft PRs

Tracking file at `thoughts/pr-stack/<dirty-branch>_<YYYY-MM-DD>.md` (write it as Obsidian-friendly Markdown with callouts, checklists, and links).

**Phase 0: Health check** — `git fetch origin <base>`, `git status --short`. Ensure clean working tree.

**Phase 1: Setup** — Resolve branches, create tracking file with PR stack table.

**Phase 2: Analysis** — Examine the branch: `git log --oneline`, `git diff --stat`, `git diff --name-only`. Categorize changes by concern (Setup, Schema, Backend, Frontend, Tests, Fixes, Refactors). Order by dependency. **Within each category, further group files by logical commit unit.**

**Phase 2.5 — Propose**: Present the full plan to the user (per the Proposal Gate above) showing every PR, every branch name, every file, and every commit within each PR. Do NOT create any branches or PRs yet.

**Phase 3: Create each PR (only after approval)** — For each concern in order (1 through N):
- Create branch from the previous PR's branch (or base for PR #1)
- Cherry-pick the relevant commits, or if no clean commits exist:
  ```
  git checkout <source-branch> -- <file1> <file2> ...
  ```
- **Split into multiple commits per commit discipline rules** — stage files in logical groups, committing each group separately. Do NOT lump all files for the PR into a single commit.
- If conflicts: resolve by keeping ONLY this concern's changes, log in tracking file
- Push branch, generate PR body (scoped to this concern only), create as DRAFT via `gh pr create --draft`
- Update tracking file

**Phase 4: Summary** — Print the PR stack with merge order instructions.

### Rules

- MUST: always draft, stack PRs, branch naming `{type}/<kebab>` (e.g. `feat/setup`, `fix/validation`), use `rtk` prefix, update tracking file after every PR, size body to this concern only.
- MUST: split commits within each PR by logical unit — no "and" in commit messages.
- MUST: propose the full plan and get user approval before any execution.
- MUST NOT: force push, merge in dirty branch changes, mention dirty branch in PR body, run interactive rebase on shared branches.

### Failure Recovery

- Cherry-pick fails repeatedly → abort, skip commit, log, move on.
- `gh pr create` fails → verify `gh auth status`, push branch, retry.
- Zero commits after cherry-pick → skip that PR, re-sequence.

### Verification Checklist

- [ ] All PRs verified as drafts via `gh pr list`
- [ ] Each PR's base branch is correct (previous PR's branch or base-branch)
- [ ] PR bodies are non-empty and concern-specific
- [ ] **Each PR has well-separated commits** — `git log --oneline` per branch shows no commit that mixes unrelated files
- [ ] Tracking file has all PR URLs and statuses, committed to the dirty branch
- [ ] No extraneous files committed on stack/ branches

---

**NEVER include in any PR body:**
- AI attribution
- Generated-by footers
- Over-explaining small diffs
- File-by-file changelogs unless explicitly requested
