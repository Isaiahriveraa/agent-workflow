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

## Separation of Concerns

**One commit, one story.** Before writing the message, audit the diff:

- Do all changed files serve a single logical purpose? If not, flag it.
- Is there a mix of concerns (e.g., refactor + bugfix, feature + style, dep bump + logic change)? Recommend splitting.
- When split is needed, list the distinct concerns and suggest commit messages for each.

Separation boundaries (changes belong in different commits when they span):

- Different types (`feat` vs `fix` vs `refactor` vs `chore`)
- Different scopes (e.g., `nvim` vs `tmux`, `lsp` vs `keymaps`)
- Different motivations (fixing a bug vs adding a feature vs cleaning up)

Only proceed to generate a single commit message when the diff passes the
single-concern check.

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
