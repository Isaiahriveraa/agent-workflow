---
name: to-issues
description: Split an approved overview into behavior tickets and, once the user approves the split, create them as GitHub issues on the product's Project. Use when the user says "split this into tickets", "make the issues", or an overview's scope was just approved.
argument-hint: "[design draft or parent issue] [optional slice]"
shell-timeout: 20
---

# To Issues

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

Turn an approved overview into tickets a teammate or an agent can pick up cold. Tickets say what and why; nobody plans how until a ticket is taken.

## When to use

- An overview's scope was approved and its slices need tickets.
- A published ticket needs to be corrected or split.

Unsettled product behavior returns to `/design`. Never start from an implementation plan.

## Workflow

1. **Read the overview.** Use the approved design draft or the parent issue. Reconcile with any existing issues on the Project so reruns update instead of duplicating.
2. **Draft the split.** One ticket per slice, in the contract's ticket format, following its split rules: vertical slices, thinnest working path first, INVEST, size XS-M, Research tickets for unknowns or anything that cannot be sized. Use Type Feature, Bug, Task, or Research.
3. **Run the CRUD check.** Grid the tickets against the overview's domain things and mark create, read, update, delete. Show the grid and list each empty column as a question: a missing ticket or a deliberate Won't.
4. **Present the split.** A short table (ticket, type, priority, size, blocked by) above the release line and below it, the CRUD questions, and any ticket marked as needing a product decision. Ask for approval of the split.
5. **Publish on approval.** Approval of the split is approval to create these issues. First make sure the parent issue exists, using the design draft's problem brief and overview as its body, then create each ticket in order so "blocked by" numbers resolve:

   ```sh
   gh issue create --title "<title>" --body-file <draft> --parent <parent> --blocked-by <n,...> --project "<project>"
   ```

   Set the Project fields (Status Ready or Backlog, Priority, Size, Type) with `gh project item-edit`. If the token lacks the `project` scope, stop and ask the user to run `gh auth refresh -s project`. Report every created issue with its number; if creation stops partway, report what was created, what failed, and what was not attempted, and reconcile before any retry.

Status is Ready only when the ticket passes INVEST, is sized, has known dependencies, and has no open product question; otherwise Backlog, with the open question stated in the ticket.

## Drafts

Write drafts in `context/issues/<slug>/NNN-<topic>.md` before publishing. They are private working files: the published issue body never contains a `context/` path, a link to a draft or plan, or local metadata.

## Review checklist

- Each ticket is one vertical, user-visible outcome that one review can cover.
- User story, context, user flow, edge cases, acceptance criteria, and out of scope are present.
- Acceptance criteria are observable Given / When / Then checks, specific enough to test.
- No frameworks, schemas, data fields, file layout, or task lists.
- Dependencies are real behavior dependencies, not a guessed coding order.
- Facts are verified or labeled as user-reported; open questions are visible.

## Done when

- The user approved the split, and every ticket exists as a sub-issue of the parent on the Project with its fields and "blocked by" links set.
- The CRUD gaps were each answered by a ticket or a deliberate Won't.
- No published text references a private working file.
