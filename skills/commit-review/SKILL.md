---
name: commit-review
description: >-
  Commit agent-produced work as atomic Conventional Commits, with an
  independent commit-pr-reviewer subagent approving the exact plan before Git
  state changes. Use at the end of autonomous agent pipelines or when the user
  asks for a reviewed commit. For everyday commits the user reviews
  themselves, use commit.
---

# Atomic Commit (reviewed)

Same grouping as `commit`, plus an independent check, because no human has read
this work yet. The rules live in `../commit/references/`. This skill adds the
gates.

## Workflow

1. **Review gate (optional, advisory).** Run it only when the work has not
   already been through `code-review` in this session (for example, after
   `implement` it has). See `references/review-gate.md`. Surface the findings and
   never block on them.
2. **Inspect and plan, read-only.** Inspect the full tree as in `commit`. Build
   the responsibility inventory and the plan using
   `../commit/references/grouping.md` and `../commit/references/messages.md`.
   Don't touch the index yet.
3. **Write the proposal** in the shape of `references/proposal.md`.
4. **Approval.** Send the proposal to the `commit-pr-reviewer` subagent once. On
   REVISE, fix the plan and resend. Stage nothing until it says PASS on
   the exact plan.
5. **Execute.** For each commit: stage only its files or hunks, verify
   `git diff --cached` matches the approved story, then commit with the approved
   message. If grouping, files, messages, or the tree change, go back to step 2.
6. **Report** commits (`<sha> <message>`), the reviewer verdict, whether the
   review gate ran or was skipped and why, and what's left.

## Never

Everything in `commit`'s Never list, plus: never stage or commit before PASS on
the exact plan.

## Load only when needed

- `references/review-gate.md`: running the advisory code-review gate.
- `references/proposal.md`: the exact proposal format the reviewer checks.
- `../commit/references/edge-cases.md`: a pre-staged index, untracked files,
  amending, or changes that belong on separate branches.
