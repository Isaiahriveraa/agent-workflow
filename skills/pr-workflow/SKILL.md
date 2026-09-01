---
name: pr-workflow
description: "Generate PR descriptions, split branches into concern-tight PRs, or convert dirty branches into clean stacked draft PRs. Three submodes: `/pr` (generate description), `/pr split` (split by concern), `/pr stack` (stacked draft PRs from dirty branch)."
---

# PR Workflow

Three submodes:

- `/pr` — Generate a PR description for the current branch
- `/pr split` — Split current branch into concern-tight PRs (sub-700 lines each)
- `/pr stack` — Convert a dirty branch into a clean stack of draft PRs

---

## When to Use

- Starting a new feature or project needing PR boundaries
- Changes span more than 5-7 files or will take more than 1-2 hours
- Need a PR description generated from an actual branch diff
- Current branch mixes unrelated concerns that should be separate PRs

---

## Core Principle: Dual Discipline

Every PR must pass **two levels of separation**, enforced at every submode:

### Level 1 — PR Concern Discipline
Each PR addresses exactly **one concern**. Files spanning different domains, change types, motivations, or architectural layers belong in separate PRs.

### Level 2 — Commit Discipline
Within a PR, **each commit addresses exactly one logical unit**. A single PR may have multiple commits, but no commit may mix unrelated changes.

### Stack Decision
Use stacked PRs for dependent concerns, not merely for smaller diffs:

- **Independent concerns:** use separate branches/worktrees based on the base branch; each PR targets the base branch.
- **Dependent concerns:** use one `gh stack`; each branch contains one concern and each PR targets the branch immediately below it.
- A stack must still satisfy the one-concern-per-PR and one-logical-unit-per-commit rules.
- Merge stacks from the bottom upward. After a lower PR merges, verify that GitHub or `gh stack sync` retargeted and rebased the remaining branches.

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

**Rules:**
- Present the plan in a clearly formatted block.
- Do NOT proceed until the user explicitly approves.
- If user requests adjustments, update the plan and re-propose.
- Only after approval, execute the full plan in sequence.

---

## Submode: `/pr` — PR Description

Generate a PR description based on the actual branch diff. Sized to the change.

### Operating Rules

- Do not open a PR or push commits without approval.
- After creating or editing a PR, verify the stored body with `gh pr view --json body`.
  Confirm that section headers are present, blank lines are real newline characters
  rather than literal `\\n` text, and the body contains no unintended Markdown
  formatting artifacts. If verification fails, correct the body before reporting
  the PR as complete.
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

### PR Description Structure

Every PR body uses the same three sections regardless of size — each **must** be a markdown header (`##`) in the output body text. Include the HTML comments with guiding questions.

## Summary

<!-- What changed and what observable outcome does it produce? -->

## Rationale

<!--
- What problem or limitation existed?
- What happens without this change?
- Why was this solution chosen over alternatives, and what tradeoffs were accepted?
-->

## Stack Context

<!-- Include only for stacked PRs. Describe the incremental diff from the immediate base branch. -->

- Position: <N> of <M>
- Base PR: #<number> or `<base-branch>` for the bottom PR
- Depends on: #<number> or `N/A` for the bottom PR

## Tests

<!--
- What tests were added or changed, and what do they cover?
- What verification was run (test suite, lint, typecheck, build, manual checks)?
-->

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

**Phase 1 — Analyze & Categorize**: Inspect the branch diff against the merge base. Group changed files by concern domain, change type, and motivation. Within each concern group, further split files into logical commit units. Mark each group as independent or dependent on another group; only dependent groups belong in a stack.

**Phase 2 — Propose**: Present the full plan showing every PR, every branch name, every file in each PR, and every commit with its message (per the Proposal Gate above). Do NOT execute anything yet.

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

Tracking file at `context/pr-stack/<dirty-branch>_<YYYY-MM-DD>.md` in the current worktree.

**Phase 0: Health check** — `git fetch origin <base>`, `git status --short`. Ensure clean working tree.

**Phase 1: Setup** — Resolve branches, create tracking file with PR stack table.

**Phase 2: Analysis** — Examine the branch: `git log --oneline`, `git diff --stat`, `git diff --name-only`. Categorize changes by concern (Setup, Schema, Backend, Frontend, Tests, Fixes, Refactors). Order by dependency. **Within each category, further group files by logical commit unit.**

**Phase 2.5 — Propose**: Present the full plan showing every PR, every branch name, every file, and every commit within each PR (per the Proposal Gate). Do NOT create any branches or PRs yet.

**Phase 3: Create each PR (only after approval)**

Prefer `gh stack` for branch tracking, cascading rebases, pushing, and linked PR creation:

The `gh-stack` extension is installed as a machine prerequisite; do not reinstall it during each workflow invocation.

```bash
gh stack init --base <base> <branch-1> <branch-2> ...
gh stack sync
gh stack submit
```

`gh stack submit` creates or updates the stacked PRs and links them on GitHub. Use its interactive editor to set concern-specific titles, descriptions, and draft status; use `gh stack submit --auto` only when generated metadata is acceptable. For an existing set of branches managed outside `gh stack`, use `gh stack link <branch-1> <branch-2> ...`.

Before submitting:
- Create or adopt branches in dependency order; each branch contains only its proposed concern.
- If the source branch already has clean concern commits, adopt the branches with `gh stack init`. If it is dirty or mixed, create the proposed branches and selectively check out only each concern's files before committing.
- **Split into multiple commits per commit discipline rules** — stage files in logical groups, committing each group separately. Do NOT lump all files for the PR into one commit.
- Run focused tests for each layer where practical.

During iteration:
- Use `gh stack sync` for fetch, cascading rebase, push, and PR-state synchronization.
- Use `gh stack rebase` when interactive conflict resolution is needed; use `gh stack rebase --abort` to restore the pre-rebase state.
- If conflicts remain, resolve only the affected concern and record the resolution in the tracking file.
- Keep the tracking file as a lightweight audit record; `gh stack` and GitHub are the source of truth for current stack/PR state.

**Phase 4: Summary** — Print the PR stack with merge order instructions. Stacks merge bottom-up; use `gh stack merge <stack-number-or-pr-number>` when the required checks and approvals are complete.

### Rules

- MUST: always draft, stack PRs, branch naming `{type}/<kebab>` (e.g. `feat/setup`, `fix/validation`), use `rtk` prefix, update tracking file after every PR, size body to this concern only.
- MUST: split commits within each PR by logical unit — no "and" in commit messages.
- MUST: propose the full plan and get user approval before any execution.
- MUST NOT: use unprotected `git push --force`, merge in dirty branch changes, mention dirty branch in PR body, or run interactive rebase on shared branches.
- MAY: use `gh stack` commands that perform protected `--force-with-lease` updates as part of a cascading rebase.

### Failure Recovery

- `gh stack init` or `gh stack sync` reports divergence → stop, inspect the local and GitHub stack composition, then resolve explicitly; do not force an unrelated branch into the stack.
- `gh stack rebase` conflicts → resolve only the affected concern, then `gh stack rebase --continue`; use `--abort` if the proposed resolution is unclear.
- `gh stack submit` fails → verify `gh auth status`, branch cleanliness, and remote access before retrying.
- A concern has no commits after extraction → skip that PR and re-sequence the stack.

### Verification Checklist

- [ ] All PRs verified as drafts via `gh pr list`
- [ ] Each PR's base branch is correct (previous PR's branch or base-branch)
- [ ] PR bodies are non-empty and concern-specific
- [ ] PR bodies were fetched after creation/edit and verified to contain real line breaks, correct headers, and no unintended formatting artifacts
- [ ] **Each PR has well-separated commits** — `git log --oneline` per branch shows no commit that mixes unrelated files
- [ ] Tracking file has all PR URLs and statuses, committed to the dirty branch
- [ ] No extraneous files committed on stack/ branches

---

## Branch Naming Convention

```
feat/description             # New features (e.g., feat/project-setup, feat/hero-section)
fix/issue-description        # Bug fixes (e.g., fix/header-mobile-menu)
refactor/what-changed        # Code improvements
docs/what-documented         # Documentation only
chore/what-updated           # Config, deps, tooling
```

## PR Size Guidelines

| Size | Files | Recommendation |
|------|-------|----------------|
| Tiny | 1-2 | Perfect for fixes |
| Small | 3-5 | Ideal PR size |
| Medium | 6-10 | Acceptable for features |
| Large | 11-20 | Consider splitting |
| Huge | 20+ | MUST split |

## Red Flags (Stop and Split)

- More than 10 files modified
- Multiple unrelated changes
- "While I'm here, let me also..."
- Can't describe in one sentence
- Review would take > 30 minutes

## Workflow Per PR

```
1. Create branch from main
2. Implement ONLY this PR's scope
3. Test locally
4. Create PR with clear description (invoke this skill's `/pr` submode)
5. Review and merge to main
6. Delete branch
7. Pull main
8. Repeat for next PR
```

## Discipline Reminders

Before committing, ask yourself:
- [ ] Is this PR focused on ONE thing?
- [ ] Would a reviewer understand this in < 15 minutes?
- [ ] Does main stay deployable after merge?
- [ ] Am I tempted to add "just one more thing"? (Don't!)

## Emergency: PR Getting Too Large

If your current work is getting too big:

1. **Stop** - Don't add more changes
2. **Assess** - What's the smallest shippable unit?
3. **Stash** - `git stash` extra changes
4. **Ship** - Create PR with smallest unit
5. **Continue** - Pop stash, start next PR

---

**NEVER include in any PR body:**
- AI attribution
- Generated-by footers
- Over-explaining small diffs
- File-by-file changelogs unless explicitly requested

---

**Remember**: A 5-file PR merged today > a 50-file PR "almost done"
