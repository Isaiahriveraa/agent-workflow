---
name: commit
description: >-
  Commit the working tree as atomic Conventional Commits, fast and without
  subagents. Use when the user asks to commit and is the one reviewing the
  work. For agent-produced work that needs an independent reviewer before it
  lands, use commit-review instead.
---

# Atomic Commit (fast)

Turn the current changes into clean, atomic commits. The user is the reviewer,
so no subagent review and no approval round trip: inspect, group, commit,
report.

> One commit, one reason for change.

## Workflow

1. **Inspect.** `git status --short`, `git diff --stat`, `git diff`,
   `git diff --cached`, untracked files, and `git log --oneline -10` for the
   repo's message style.
2. **Group.** List each distinct change in one line. One line is one commit.
   Keep a test or doc with the code it proves or explains. Split by type
   (feat/fix/refactor/docs/...), area, and reason. Keep together only what
   cannot land apart.
3. **Show the plan in one short block.** For each commit: the message and the
   files (mark any file split by hunk). Then execute right away. Do not wait
   for approval unless the grouping is truly ambiguous or a file looks risky.
4. **Commit.** Stage only that commit's files, check `git diff --cached --stat`,
   commit, repeat.
5. **Report.** `<sha> <message>` per commit, plus anything left uncommitted.

## Keep it cheap

- No subagents. No code-review pass.
- Stage whole files. Split a file by hunk only when it truly holds two
  unrelated changes. Several hunks of one change are one commit.
- Don't over-split: if two changes only make sense together, one commit is fine.
- Run a test or check only when it's quick and directly relevant.

## Never

- Commit secrets, `.env` files, keys, or generated or local-state files. Flag them and leave them out.
- `git add .` / `-A` without having looked at every change.
- `--no-verify`, amend, reset, rebase, force-push, or discard changes unless
  the user asks.
- Add AI attribution beyond what the session's attribution instructions require.

## Load only when needed

- `references/grouping.md`: splitting is disputed or hard (dependency test,
  hunk staging, commit order, bundling anti-patterns).
- `references/messages.md`: subject rules, bodies, breaking changes.
- `references/edge-cases.md`: a pre-staged index, unclear untracked files,
  repo conventions, amending, or changes that belong on separate branches.
