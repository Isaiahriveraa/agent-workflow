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

1. Read the ticket with `gh issue view <n> --json title,body,state,blockedBy,parent`, including its comments. Confirm its blocked-by issues are closed. A Research ticket goes to `/skill:research` for its bounded question and decision, not an implementation plan.
2. Read today's code: the owning modules, callers, configuration, and tests. Cite real paths and symbols and separate verified facts from assumptions.
3. If the code contradicts the ticket, an acceptance criterion is ambiguous, or a product or security decision is open, stop and bring the exact question to the user. Never rewrite the ticket to fit the plan.
4. Read [Software Design](../../references/software-design.md). Use the [coding contract's design trigger](../../references/coding-contract.md#design) to decide whether to use [codebase-design](../codebase-design/SKILL.md). For routine work, confirm the current owner, preserved guarantee, and behavior test without loading specialist guides. Do not invent an alternative for a local fix that keeps the caller contract.
5. For a material choice about a boundary or its owner, use the design loop before drafting **Approach**, even if signatures stay the same. Compare two materially different designs on the same caller action, plausible change, and reachable failure. Name what each promises and hides, which modules would change, and who would handle the failure.

## Plan content

Create the plan with:

```sh
python3 ~/.agents/scripts/new-artifact.py --type plans "issue-<number>-<short-title>"
```

Write `context/plans/<slug>/00-index.md`, keeping each section proportional. Lead with **Approach**, **Decisions**, and material **Failure / Security** risks after the ticket reference; put the code baseline and implementation specifics below them. Link the issue instead of retelling its problem, user story, or flow. This plan owns the technical changes, not a second product specification.

- **Answers the ticket** — reference each Done when item (acceptance criterion), including edge cases, by number and map it to the change that meets it. Do not copy the issue narrative. For older issues, use their existing acceptance criteria without forcing a rewrite. Anything the ticket does not ask for is out.
- **Current behavior** — what the code does today, with locations.
- **Approach** — the smallest complete change through the existing modules. Use the relevant design checks above before settling on it. Name architecture changes and new dependencies with the reason. The first ticket of an overview usually sets direction that later tickets follow; say so when it does.
- **Data** — what is created, read, updated, or deleted; migrations; data dictionary entries added or changed, with exact validation (type, length, allowed values, case and characters, date formats); behavior with no data and as data grows.
- **Failure** — errors, timeouts, empty states, and a dependency that is down.
- **Security** — only the areas this ticket touches (authentication, access control, input, logging), plus one to three misuse cases such as "a non-member calls the endpoint directly".
- **Tests** — cover each Done when item and relevant misuse case with behavior tests through the caller's interface. For a design choice, name the contract test and the failure it must catch. Refer to the checklist without copying it.
- **Decisions** — record the choice, reason, alternative, and tradeoff for decisions that are hard to reverse. For a material design decision, include the comparison above or point to it in the interface blocks below. Small reversible choices stay brief.
- **Interface impact** — declare `none`, `new`, or `changed` based on what callers can do, must supply, or can rely on. Ordering, effects, and failure behavior can change without changing the signature. Use the exact format `plan-lint.py` checks:

  ```markdown
  - **Interface impact:** none — <why the boundary does not change>
  ```

  For `new` or `changed`, add non-empty `**Interface sketch**` and `**Rejected alternative**` blocks. Show caller usage, the signature, and a caller-facing contract comment in the sketch. Show the other design and why it lost in the alternative. Keep minor changes brief. For `none`, record any material internal ownership comparison under **Decisions** instead.

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

Present the plan in the **Planning** report shape from `references/communication.md`: issue reference, approach, decisions to challenge, material risks, and a short coverage summary. Explain the approach in plain language first; keep file-level details in the plan unless requested. On the user's approval, set `**Plan status:** approved` and continue with `/skill:implement`: approval means build. Worktree placement and review still follow `AGENTS.md`.

The plan is a private working file. Never mention, link, or quote it in the issue, a PR, a commit message, or code; published text describes the change on its own terms.

## Done when

- One taken ticket (or direct request) has a plan grounded in today's code.
- Every acceptance criterion and edge case maps to how it is met and how it is tested.
- `slop-lint.py` and `plan-lint.py` pass.
- The plan is approved only after the user approves it.
