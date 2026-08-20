---
name: to-tickets
description: Turn a request, plan, or spec into a short implementation plan plus a set of focused tickets — each ticket sized for one reviewable PR. Plain language, no orchestration machinery. Replaces to-plan and to-issues.
argument-hint: "[request, plan, spec, issue, or brief]"
shell-timeout: 20
---

# To Tickets

Turn an idea, spec, or plan into:

1. A short implementation plan (what, why, how, order, verification).
2. A set of focused tickets, each small enough to be one clean PR.

This skill replaces the old `to-plan` and `to-issues` pair. It keeps the plan structure you write to the plan server, and the ticket-quality rules that make one ticket = one reviewable PR. It drops all the parallel-execution machinery (Herdr manifests, waves, shards, fleet rules, fan-out queues). You execute tickets one at a time in separate worktrees, review each PR, and stay in the loop.

## When to use

- You have a spec, issue, PRD, or a settled idea and need to know what work it breaks into.
- You want a plan an implementation agent can follow without the original conversation.
- You want tickets that produce small, reviewable PRs.

## Inputs

`$ARGUMENTS` may contain a request, a conversation, a spec, an issue, a PR, an existing plan, or a pasted brief. Treat upstream artifacts as evidence, not unquestionable spec. Read the source fully and follow its references.

## Workflow

### 1. Resolve the request

Extract:

- Intended outcome (what "done" looks like)
- Current behavior and desired behavior
- Constraints and non-goals
- Locked decisions already made
- Known failures or unresolved questions
- Evidence that will prove completion

Do not turn vague wording directly into tasks. If there is no artifact, synthesize from the conversation and inspect the repository.

### 2. Inspect the repository

- Locate files, modules, symbols, callers, configs, and tests involved.
- Read representative implementation and test files.
- Identify conventions (style, naming, layout, error handling, state).
- Verify referenced paths and components exist.
- Distinguish verified facts from assumptions; flag stale or conflicting architecture.
- Never invent files, symbols, commands, or architecture. Use concrete references: `path/to/file.ext:line`, `ComponentName`, function names, test names, runnable commands.

### 3. Define the target state

Describe, observably:

- Behavior that must exist after implementation.
- Existing behavior that must remain unchanged.
- Affected systems.
- Explicitly out of scope.
- Observable evidence of completion — specific enough that an implementation agent does not need the original conversation.

### 4. Write the plan

One coherent plan that one agent, ticket, branch, and PR can own at a time.

Required sections:

- **## Goal** — one sentence.
- **## Current State** — what exists today.
- **## Target State** — what must exist after.
- **## Scope** — **### In Scope** / **### Out of Scope**.
- **## Locked Decisions** — decisions already made, so nobody re-litigates them.
- **## Implementation Strategy** — the approach and why.
- **## Work Breakdown** — tasks in order. Each task:
  - `### Task N: {Action-oriented name}`
  - **Outcome:** — what this task produces.
  - **Relevant areas:** — files/modules touched.
  - **Changes:** — concrete changes.
  - **Depends on:** — earlier tasks or tickets.
  - **Verification:** — exact command + expected result.
  - **Done when:** — binary, observable.
  - Avoid vague work like "update the backend", "improve the UI", "refactor as needed", "add tests".
- **## Testing and Verification** — the exact commands that prove it works, including the one command that answers "is the whole effort done" (a completion check no single agent can just self-report). If no such command exists, say so — that gap is itself a planning finding.
- **## Definition of Done** — what finished means for the whole effort.

Write the plan to the plan server:

```sh
rtk python3 ~/.agents/scripts/new-artifact.py --dest "$("$HOME/.agents/scripts/plan-server-path")" --type plans "<topic>"
```

Use the exact printed path. Fill the generated `.mdx`. Verify the review URL responds:

```sh
curl -fsS --max-time 3 -o /dev/null "http://localhost:3456/project/{project}/plan/{id}"
```

Copy the absolute path to the clipboard:

```sh
printf '%s' '<path>' | pbcopy
```

### 5. Break the plan into tickets

Rules:

- **One ticket = one focused PR.** If a ticket cannot be reviewed in one PR, split it.
- **Prefer behavior-complete tickets** (vertical slices): "Persist device registration end-to-end", not "add table", "add repo", "add endpoint". Do not force a vertical slice when the result is oversized or unreviewable.
- **Wide mechanical refactors**: expand-contract — add the new form beside the old, migrate callers in reviewable batches, then remove the old form. Each batch is one ticket.
- **Dependencies are explicit and acyclic**: a ticket declares what must land before it (Depends on) and what it unblocks (Blocks), with a reason. Block only when work cannot start or be verified until another closes.
- **Protect shared files**: if two tickets touch the same file or shared contract, they are sequential, not concurrent. Name the collision risk in each ticket.
- **No orchestration manifest.** No YAML, no waves, no shards, no fleet rules, no work queues. Tickets are for humans and single-agent worktree execution.

Ticket template:

```markdown
# <Focused outcome>

## Why
<one-two sentences>

## Target behavior
<what happens when done>

## Scope
<what this ticket owns>

## Out of scope
<what it does not touch>

## Acceptance criteria
<binary, observable — not "create component" but "a user can do X">

## Verification
<exact commands + expected result — not "run tests">

## Dependencies
- Depends on: <ticket or none — why>
- Blocks: <ticket or none>

## Likely ownership
<files/modules this will touch, shared contracts, collision risk>

## Plan reference
<plan-server URL or section>
```

### 6. Present and get approval

- Show the plan URL and the ticket list.
- Do **not** publish GitHub issues, create branches or worktrees, or start implementing until the human approves the ticket set.
- For a single ticket, implementation continues via the `implement` skill (which drives `tdd`, then `code-review`, then `commit`).

## Example Case

Read `EXAMPLE.md` in this skill's directory to calibrate specificity, structure, sequencing, and verification. Do not copy its fictional paths.

## Done when

- Every ticket is readable on its own and maps to the plan.
- One ticket = one reviewable PR.
- Dependencies are explicit and acyclic.
- No orchestration machinery anywhere.
- Human approved the ticket set.
