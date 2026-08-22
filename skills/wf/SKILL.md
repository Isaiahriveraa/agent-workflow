---
name: wf
description: Commit the current work with the commit skill, then push and open a PR via pr-workflow — one concern, two approval gates. Use when the user says "wf", "commit and PR", "ship this", or wants the full commit → push → PR flow for the current branch.
argument-hint: "[base-branch]"
disable-model-invocation: true
---
# Commit and PR in One Flow (wf)

Runs the full ship path for the current branch: atomic commits → PR. One concern per branch (see Concern Discipline in AGENTS.md); if the working tree mixes concerns, stop and flag it.

## Input

Optional base branch (e.g. `main`, `development`). Default: upstream default.

## Steps

### 1. Commit phase (commit skill)

Invoke the `commit` skill at `~/.agents/skills/commit/SKILL.md`:

1. Inspect the full working tree (staged, unstaged, untracked, hunks).
2. Group changes into atomic Conventional Commit candidates.
3. Present the full **Proposed Commit Plan** (messages, files, hunks, verification).
4. **STOP — wait for explicit user approval.**
5. Execute the approved plan commit by commit, with pre/post-commit verification.

### 2. PR phase (pr-workflow skill)

Invoke the `pr-workflow` skill at `~/.agents/skills/pr-workflow/SKILL.md`, `/pr` submode:

1. Confirm branch state and base branch (user-provided or upstream default).
2. Inspect the branch diff against base: `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`.
3. Check commit granularity — each commit must be one logical unit; flag violations.
4. Size the PR (`small` / `medium` / `large`).
5. Write the PR body with exactly three sections: `## Summary`, `## Rationale`, `## Tests` (per the pr-workflow template).
6. Present the body and the push/create plan (`git push -u origin <branch>`, `gh pr create --draft`).
7. **STOP — wait for explicit user approval.**
8. Execute: push, then `gh pr create --draft --title <type>(<scope>): <summary> --body <body>`. Create as draft by default so the user reviews before marking ready.

### 3. Report

Return:

- Commits created (short SHA + message)
- PR URL + branch name
- Remaining working tree state

## Rules

- Never stage, commit, push, or create a PR without the corresponding approval gate.
- One concern per branch. If the tree mixes concerns, do not commit them together — follow Concern Discipline (finish current concern, sequence or worktree the rest).
- Respect both skills fully: their proposal formats and approval gates override this summary.