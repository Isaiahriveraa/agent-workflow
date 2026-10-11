---
name: to-issues
description: Turn a design brief into behavior-focused ticket drafts, then publish only after separate human approval.
argument-hint: "[design bundle or brief] [optional topic]"
shell-timeout: 20
---

# To Issues

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

Turn one design bundle or settled behavior brief into local tickets that are understandable and independently verifiable. This is the stage where a backlog item becomes a ticket; do not require a technical plan first. The next stage is `/plan` for one selected ticket.

## When to use

- A design brief is ready for tickets.
- A local ticket draft needs review or correction.
- The user explicitly asks to publish an approved local ticket set.

For new work, do not start from an implementation plan. Existing plans may be converted only when the user explicitly asks to migrate them into tickets. Unresolved product behavior returns to `/design`; an issue whose purpose is to record a decision belongs to `/issue-discovery`.

## Modes and approval

- **Draft mode (default):** write or update local Markdown drafts only. An explicit draft request, or preparation of the one selected outcome for `/research` or `/plan` when tickets do not exist, is enough authorization. It never calls GitHub mutation APIs.
- **Publication mode:** only after the user explicitly asks to publish reviewed drafts. Show the exact issue actions and get separate approval immediately before creating or updating GitHub issues.

Plan approval, draft approval, and publication approval are distinct. Do not infer one from another. Publishing tickets does not authorize planning or implementation.

## Input and output

Read the full design index and selected topic card(s), or the complete supplied behavior brief. An explicit request to draft the whole brief may produce its entire ticket set by default; an explicit topic limits drafting to that topic. Preparation invoked by `/research` or `/plan` drafts only the one selected next outcome, never the whole bundle. Keep unresolved behavior marked `needs-review` or `blocked`; do not invent answers, expand scope, or plan dependencies between unrelated topics. Check current behavior only as needed to ground the ticket, and distinguish observed facts from user reports.

Before drafting or publishing, reconcile the selected source with the existing local ticket bundle and any matching GitHub issues. Preserve authored edits and review notes. If the source and ticket materially disagree, do not overwrite the disagreement silently; mark the ticket `needs-review` and report what conflicts.

Create the standard local bundle:

```sh
python3 ~/.agents/scripts/new-artifact.py --type issues "<initiative>"
```

Use `context/issues/<slug>/`. `000-index.md` is the sole execution queue, not a delivery ticket or a published issue. Write one numbered ticket per independent user-visible or caller-visible outcome (`001-<topic>.md`, `002-<topic>.md`, etc.). Reuse existing IDs and paths on reruns and preserve human review notes. Do not create plans, separate manifests, completion reports, tests, branches, worktrees, or implementation artifacts.

The index contains a `## Queue` Markdown table with exactly these fields:

```markdown
## Queue

| ID | Ticket | Issue | Status | Depends on | Plan | Research | PR | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001 | context/issues/<slug>/001-<topic>.md | - | draft | - | - | - | - | - |
```

Use plain repo-relative artifact paths, not Markdown links or backticks; use `-` for unset cells. IDs are `001`, `002`, etc.; dependencies are comma-separated IDs. Record published Issue and PR identities in their own cells. Status is exactly `draft`, `needs-review`, `ready`, `blocked`, `in-progress`, `in-review`, or `done`. Keep ticket metadata about its source and path, not a duplicate mutable status store. Review/feedback updates the queue and affected artifacts; a draft PR is `in-review`, not `done`. Mark `done` only after integrated behavior is verified against code, tests, and GitHub and link the evidence.

Downstream selection reconciles those claims first, then runs `python3 ~/.agents/scripts/workflow.py select <index> [--target <id>]` from the target git repository. Explicit targets take priority; otherwise it selects the next `ready` row whose dependencies are all `done` and which has no active PR. The CLI cannot prove completion or safe parallel work.

The ticket set may include several independent outcomes, but do not split by technical layer or create implementation subtasks. Each ticket should be small enough for one cohesive review and useful on its own; return oversized outcomes to a narrower behavior split, not one huge PR. Map genuine behavior prerequisites to stable queue IDs and name the observable outcome each allows. If a prerequisite is incomplete, mark the dependent ticket `blocked`. Preserve provisional parallel candidates in the design map, not a second queue; technical overlap and readiness are re-evaluated just before planning or delivery.

## Ticket format

Every ticket must include these sections in this order:

```markdown
# <Action-oriented title>

<!-- Local metadata; remove this block from the published issue body.
Source design: <bundle/card path or brief source>
Local draft path: <path under context/issues/<slug>/>
-->

## Problem

Who is affected, what is difficult or missing, and why it matters.

## Current behavior

What happens now and its observable effect. Mark user-reported claims when not verified.

## Desired behavior

What the user, caller, or system should be able to observe instead.

## Context

Relevant behavior boundaries, genuine issue dependencies, and scope notes. Do not add a technical implementation plan.

## Acceptance criteria

- [ ] Observable outcome that can be confirmed after implementation.

```

Acceptance criteria must be specific enough to guide later tests and human review. Do not invent behavior, technical choices, ownership, or verification evidence. If a material question is open, mark the affected ticket `needs-review` or `blocked` and state what must be decided.

The ticket is the durable statement of the problem and desired behavior. Keep it useful without the design conversation. Technical implementation choices belong in the later plan, not in the public ticket.

## Draft review

Before presenting drafts, verify:

- each ticket maps to one independent behavior outcome and one coherent review;
- the exact problem, current behavior, desired behavior, and observable acceptance criteria are present;
- facts are verified or labeled as user-reported, and assumptions/open questions are visible;
- dependencies are genuine behavior dependencies, not a guessed technical schedule;
- no implementation plan, file-by-file checklist, or technical-layer ticket split was introduced;
- paths are stable and reruns do not duplicate or silently remap drafts.

Present the source, draft paths, ticket summaries, and any unresolved gaps. Publication requires a separate explicit request and approval. Before publishing, re-read the selected drafts, confirm the repository, and reconcile each draft with its recorded issue number or an exact title-and-source match. Stop if a match is ambiguous, materially different, or conflicts with the recorded mapping. Publish only approved tickets; preserve unrelated issue text, comments, labels, and local notes on updates. After each successful create or update, record its issue number and URL in `000-index.md`. If publication stops partway through, report completed, failed, and not-yet-attempted tickets, keep the completed mappings, and reconcile them against GitHub before any retry. Never publish `needs-review` or `blocked` tickets without explicit approval of that exception.

After ticket review, set `ready` only when behavior is settled and verified prerequisites allow selection; record blockers otherwise. The next step is `/plan` for the next available ticket, or `/plan <target>` for an explicit one. Local tickets do not require publication before planning. Do not plan the whole backlog or start implementation. After feedback or delivery, refresh affected cards, tickets, and queue links from evidence without assuming permission to publish updates or merge.

## Done when

- The selected behavior is represented by a concise, zero-context ticket or is explicitly marked blocked/needs-review.
- Draft mode changed only local issue documents and made no GitHub mutations.
- Publication, if requested, had its own immediate approval and only approved issues were created or updated.
- The queue and artifacts agree, and the user has a clear next step: `/plan` selects one available ticket unless a target is explicit.
