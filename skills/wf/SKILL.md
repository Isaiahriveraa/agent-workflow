---
name: wf
description: Commit the current work with the commit-review skill, then push and open a PR via the pr skill — one concern, with commit-pr-reviewer subagent approval before each step. Use when the user says "wf", "commit and PR", "ship this", or wants the full commit → push → PR flow for the current branch.
argument-hint: "[base-branch]"
disable-model-invocation: true
---

# Commit and PR in One Flow (wf)

Runs the full ship path for the current branch: atomic commits → PR. One concern per branch (see Concern Discipline in AGENTS.md); if the working tree mixes concerns, stop and flag it.

## Input

An optional base branch (e.g. `main`, `development`). Default: upstream default.

## Steps

**Before the commit phase:** if the diff has not been through `code-judgment`, run it now so the reviewer sees a frozen diff.

### 1. Commit phase (commit-review skill)

Run `~/.agents/skills/commit-review/SKILL.md` end to end. Skip its review gate if `code-review` already ran on this diff in the session. If the commits already exist, skip to the PR phase.

### 2. PR phase (pr skill)

Invoke the `pr` skill at `~/.agents/skills/pr/SKILL.md`, `/pr` submode:

1. Confirm branch state and base branch (user-provided or upstream default).
2. Inspect the branch diff against base: `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`.
3. Check commit granularity — each commit must be one logical unit; flag violations.
4. Size the PR (`small` / `medium` / `large`).
5. Write the PR body with the core sections: `## Rationale` (the human/system why), `## Observable Behavior` (what the system does, not code implementation details), and `## Verification` (tests added to verify behavior). If summary and rationale overlap, combine them as `## Summary & Rationale` — do not repeat yourself. Include `## Stack Context` only if part of a PR stack (per the pr skill template).
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
