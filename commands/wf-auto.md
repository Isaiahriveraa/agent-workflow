---
description: Commit the current work with the commit-review skill, then open a PR with the pr skill
argument-hint: "[base-branch]"
---

# wf-auto — Commit and PR in One Flow

1. Read `~/.agents/skills/commit-review/SKILL.md` and follow it to commit the current work. If the commits already exist, skip this step.
2. Then read `~/.agents/skills/pr/SKILL.md` and follow it to push the branch and open the PR, using `$ARGUMENTS` as the base branch when given.
