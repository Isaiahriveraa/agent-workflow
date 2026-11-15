---
name: plan
description: Write the implementation plan for a ticket that was just taken, or for a Full-speed request made directly, against the current code. Use when the user says "plan this", takes a ticket, or asks for Full-speed work; the user's approval of the plan means build it.
argument-hint: "[issue number, or a description of the direct request]"
shell-timeout: 20
---

# Plan

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

Plan how to deliver one ticket, now that it has been taken, against today's code. The plan has one job: answer that ticket. For a Full-speed request made directly, the request plays the ticket's role.

## When to use

- A ticket was just taken (moved to In progress).
- The user asks for a plan, or asks directly for Full-speed work.

Never plan tickets that have not been taken, a whole overview, or a backlog.

## Before planning

1. Read the ticket with `gh issue view <n> --json title,body,state,blockedBy,parent`, including its comments. Confirm its blocked-by issues are closed.
2. Read today's code: the owning modules, callers, configuration, and tests. Cite real paths and symbols and separate verified facts from assumptions.
3. If the code contradicts the ticket, an acceptance criterion is ambiguous, or a product or security decision is open, stop and bring the exact question to the user. Never rewrite the ticket to fit the plan.

## Plan content

Create the plan with:

```sh
python3 ~/.agents/scripts/new-artifact.py --type plans "issue-<number>-<short-title>"
```

Write `context/plans/<slug>/00-index.md`, keeping each section proportional:

- **Answers the ticket** — every acceptance criterion and edge case, and how the change meets it. Anything the ticket does not ask for is out.
- **Current behavior** — what the code does today, with locations.
- **Approach** — the smallest complete change through the existing modules, following `references/software-design.md`. Name architecture changes and new dependencies with the reason. Use `codebase-design` for meaningful backend, schema, ownership, invariant, interface, or dependency changes. The first ticket of an overview usually sets direction that later tickets follow; say so when it does.
- **Data** — what is created, read, updated, or deleted; migrations; data dictionary entries added or changed, with exact validation (type, length, allowed values, case and characters, date formats); behavior with no data and as data grows.
- **Failure** — errors, timeouts, empty states, and a dependency that is down.
- **Security** — only the areas this ticket touches (authentication, access control, input, logging), plus one to three misuse cases such as "a non-member calls the endpoint directly".
- **Tests** — at least one per acceptance criterion and one per misuse case, through public interfaces.
- **Decisions** — a choice that is hard to reverse gets its reason, the alternative considered, and the tradeoff. Small reversible choices stay brief.
- **Interface impact** — the exact declaration `plan-lint.py` checks:

  ```markdown
  - **Interface impact:** none — <why the boundary does not change>
  ```

  For `new` or `changed`, add non-empty `**Interface sketch**` and `**Rejected alternative**` blocks.

Record these fields once, as standalone lines:

```markdown
**Ticket:** #<issue number>, or "direct request"
**Planned at:** <full commit SHA inspected>
**In-scope files:** <comma-separated repo-relative paths>
**Plan status:** draft
```

An open architecture choice inside the ticket's scope (see `/skill:research`) stops planning until the user answers it. If the ticket is too large for one review, propose a split back to `/skill:to-issues` instead of a huge plan.

## Review and handoff

Run the plan checks:

```sh
python3 ~/.agents/scripts/slop-lint.py context/plans/<slug>/
python3 ~/.agents/scripts/plan-lint.py context/plans/<slug>/
```

Present the plan in the **Planning** report shape from `references/communication.md`, leading with how it answers the ticket, then the approach, decisions to challenge, and risks. On the user's approval, set `**Plan status:** approved` and continue with `/skill:implement`: approval means build. Worktree placement and review still follow `AGENTS.md`.

The plan is a private working file. Never mention, link, or quote it in the issue, a PR, a commit message, or code; published text describes the change on its own terms.

## Done when

- One taken ticket (or direct request) has a plan grounded in today's code.
- Every acceptance criterion and edge case maps to how it is met and how it is tested.
- `slop-lint.py` and `plan-lint.py` pass.
- The plan is approved only after the user approves it.
