---
name: caveman-commit
description: >
  Ultra-compressed commit message generator. Produces terse, exact commit
  messages while preserving intent and reasoning. Conventional Commits format.
  Use when the user says "write a commit", "commit message", "generate commit",
  or invokes /caveman-commit.
---

# Caveman Commit

Write commit messages terse and exact. Conventional Commits format. No fluff.
Why over what.

## Rules

Subject line:

- Format: `<type>(<scope>): <imperative summary>` with optional scope
- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`
- Use imperative mood
- Aim for 50 chars or less, hard cap 72
- No trailing period

Body:

- Skip when subject is self-explanatory
- Add only for non-obvious why, breaking changes, migration notes, or linked issues
- Wrap at 72 chars
- Use `-` for bullets

Never include:

- AI attribution
- filler like "this commit"
- restating obvious file names
- emoji unless repo convention requires it

## Auto-Clarity

Always include a body for:

- breaking changes
- security fixes
- data migrations
- reverts

## Boundaries

Only generate the commit message. Do not stage or run `git commit`.
Output the message ready to paste.
