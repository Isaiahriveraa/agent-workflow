---
description: Commit the current work with the commit skill, then push and open a PR via pr-workflow — one concern, two approval gates
argument-hint: "[--no|--no-review] [base-branch]"

# wf — Commit and PR in One Flow

Runs the full ship path for the current branch: atomic commits → PR. One concern per branch (see Concern Discipline in AGENTS.md); if the working tree mixes concerns, stop and flag it.

## Input

`$ARGUMENTS` — supports the optional wrapper flags `--no` and `--no-review`, plus an optional base branch (e.g. `main`, `development`). Default base: upstream default. The selected flag is forwarded only to the nested `commit` phase and skips only commit's pre-commit code-review gate. It does not bypass commit approval, staging/atomicity, verification, push approval, or PR approval. Examples: `wf --no` and `wf --no-review development`.

## Steps

### 1. Commit phase (commit skill)

Invoke the `commit` skill at `~/.agents/skills/commit/SKILL.md`:

1. Inspect the full working tree (staged, unstaged, untracked, and any relevant hunks).
2. Group changes into atomic Conventional Commit candidates.
3. The normal `commit` path runs the pre-commit code-review gate (unless the current changes already match its review marker). If `wf` was invoked with `--no` or `--no-review`, forward that flag to the nested `commit` invocation; it skips only that gate. Commit approval, staging/atomicity, verification, push approval, and PR approval remain required.
4. Present the full **Proposed Commit Plan** (messages, files, hunks when applicable, verification).
5. **STOP — wait for explicit user approval.**
6. Execute the approved plan commit by commit: stage whole files when a file belongs to one concern; use hunk-level staging only for mixed-concern or deliberately partial files, with pre/post-commit verification.

### 2. PR phase (pr-workflow skill)

Invoke the `pr-workflow` skill at `~/.agents/skills/pr-workflow/SKILL.md`, `/pr` submode:

1. Confirm branch state and base branch (`$ARGUMENTS` or upstream default).
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
