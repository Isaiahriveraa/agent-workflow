---
name: wf
description: Commit the current work with the commit skill, then push and open a PR via the pr skill — one concern, with commit-pr-reviewer subagent approval before each step. Use when the user says "wf", "wf --no", "wf --no-review", "commit and PR", "ship this", or wants the full commit → push → PR flow for the current branch.
argument-hint: "[--no|--no-review] [base-branch]"
disable-model-invocation: true
---

# Commit and PR in One Flow (wf)

Runs the full ship path for the current branch: atomic commits → PR. One concern per branch (see Concern Discipline in AGENTS.md); if the working tree mixes concerns, stop and flag it.

## Input

`--no` and `--no-review` are supported wrapper invocations. The selected flag is forwarded only to the nested `commit` phase, where it skips only commit's pre-commit code-review gate.

An optional base branch (e.g. `main`, `development`) may also be provided. Default: upstream default. For example: `wf --no` or `wf --no-review development`.

## Steps

**Before the commit phase:** if the diff has not been through `code-judgment`, run it now. The pre-commit review gate verifies a frozen diff, so cleanup happens before it — never during.

### 1. Commit phase (commit skill)

Invoke the `commit` skill at `~/.agents/skills/commit/SKILL.md`:

1. Inspect the full working tree (staged, unstaged, untracked, and any relevant hunks).
2. Inventory responsibilities, then propose the most-split valid atomic plan — no commit joins two responsibilities without a named dependency (see the commit skill's Responsibility Unit).
3. The normal `commit` path runs the pre-commit code-review gate (unless the current changes already match its review marker). `--no` and `--no-review` skip only that gate.
4. Write the full **Proposed Commit Plan**.
5. Consult the `commit-pr-reviewer` subagent for approval, in commit mode. Stage nothing until it approves.
6. Execute the approved plan commit by commit: stage whole files when a file belongs to one concern; use hunk-level staging only for mixed-concern or deliberately partial files, with pre/post-commit verification.

### 2. PR phase (pr skill)

Invoke the `pr` skill at `~/.agents/skills/pr/SKILL.md`, `/pr` submode:

1. Confirm branch state and base branch (user-provided or upstream default).
2. Inspect the branch diff against base: `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`.
3. Check commit granularity — each commit must be one logical unit; flag violations.
4. Size the PR (`small` / `medium` / `large`).
5. Write the PR body with the `pr` skill's PR Description Template and run its Pre-Submit Self-Check: `## Rationale` (one sentence), `## Observable Behavior` (1–3 bullets a user would notice), `## Verification` (deploy preview for UI first, then commands actually run with results, then anything not checked), and optional `## Review Notes` (the hardest part, a non-obvious risk, or a prior change it builds on). Use an imperative, specific title. No other sections.
6. Write the body and the push/create plan (`git push -u origin <branch>`, `gh pr create --draft`).
7. Consult the `commit-pr-reviewer` subagent for approval, in pull request mode. Push and create nothing until it approves.
8. Execute the approved plan: push, then `gh pr create --draft --title <type>(<scope>): <summary> --body <body>`. Create as draft so the user reviews before marking ready.

### 3. Report

Return:

- Commits created (short SHA + message)
- Reviewer verdicts for the commit plan and the PR
- PR URL + branch name
- Remaining working tree state

## Rules

- Never stage, commit, push, or open a PR without the commit-pr-reviewer's approval of that exact plan.
- One concern per branch. If the tree mixes concerns, do not commit them together — follow Concern Discipline (finish current concern, sequence or worktree the rest).
- Respect both skills fully: their proposal formats and approval gates override this summary.
