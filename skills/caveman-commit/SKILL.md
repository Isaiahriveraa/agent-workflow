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

## Hard Gate: One Story, One Commit

**ZERO TOLERANCE — ONE COMMIT, ONE STORY.** Before ANY output, audit the diff against the branch it stemmed from:

- Do **all** changed files serve a single logical purpose? If not, **REJECT**.
- Is there a mix of concerns (refactor + bugfix, feature + style, dep bump + logic change)? **MUST SPLIT**.
- Does the subject line need "and" or "also" to describe what changed? **TOO BROAD — SPLIT.**

**If the diff fails the single-concern check:**
1. Print: `✗ ONE-STORY VIOLATION — Split required.`
2. List each distinct concern with the files belonging to it.
3. Output a separate commit message for each concern group.
4. **STOP.** Do not proceed until each commit is truly atomic.

Separation boundaries — changes MUST be in different commits when they span:

- Different types (`feat` vs `fix` vs `refactor` vs `chore`)
- Different scopes (e.g., `nvim` vs `tmux`, `lsp` vs `keymaps`)
- Different motivations (fixing a bug vs adding a feature vs cleaning up)

**Only generate a single commit message when the diff passes the single-concern check with zero ambiguity.**

## No "And" Rule

**The word "and" is banned from the entire commit message.** "And" always means multiple things are happening → you need multiple commits.

- Scan subject + body for "and". If found, the commit is not atomic. Split.
- Exception: "and" inside a proper noun or project name (rare). When unsure, split.

## Rules

Subject line:

- Format: `<type>(<scope>): <imperative summary>` with optional scope
- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`
- Use imperative mood
- Aim for 50 chars or less, hard cap 72
- No trailing period
- **No "and"** — if you need "and" to describe it, it's two commits

Body:

- Skip when subject is self-explanatory
- Add only for non-obvious why, breaking changes, migration notes, or linked issues
- Wrap at 72 chars
- Use `-` for bullets
- **No "and"** — use separate bullets or a more precise verb

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

Only generate commit messages. Do not stage or run `git commit`.
Output each message ready to paste, separated by blank lines.
