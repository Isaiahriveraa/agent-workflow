---
description: Generate professional commit messages following senior SWE standards
---

# Commit Message Guidelines

Give me a commit message that follows this structure but for the current changes that need to be commited. Make sure to look at git status and not based the changes off the conversation. We need to make sure that our commits tell one story we want to commit like a professional Senior SWE so if we need to do we can do different commits to tell one story. I need to review the changes before you commit. Do not commit without my permission. Give me a one line for each story for each commit. Clean and easy for people to realize what they are pulling. Compare against the branch that we came from for example main or development.

## Commit Discipline

- Each commit must tell exactly one story.
- Split work into phase-sized commits when the implementation happened in phases.
- Order commits so the history reads in the same order the work was introduced:
  1. foundational fixes
  2. feature or behavior changes
  3. verification or follow-up test coverage
- Do not run commit commands in parallel.
- Do not create a later-story commit before an earlier dependency is committed.
- Before proposing commit messages, inspect `git status --short` and group files by story, not by file type alone.
- If the current worktree mixes multiple stories, propose multiple commits in the correct order.
- Before committing, state the planned commit order explicitly so I can review whether the history tells the right story.

**NEVER include:**
- "Generated with Claude Code" or any variation
- "Co-Authored-By: Claude" or any AI co-author attribution
- Links to claude.com
- Any AI attribution footers
