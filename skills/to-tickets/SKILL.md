---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets on GitHub Issues, each declaring its blocking edges. Publishes as one issue per ticket with native blocking references.
disable-model-invocation: true
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets** — tracer-bullet vertical slices, each declaring the tickets that **block** it. Published as GitHub Issues so your team can claim and work them.

## Determining the repo

In priority order:

1. If the first argument is in `owner/repo` format, use it (and shift the plan/spec to the remaining args).
2. Otherwise detect from `git remote get-url origin` in CWD.
3. If neither works, ask the user for `owner/repo`.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference (a spec path, an issue number or URL) as an argument, fetch it with `gh issue view <number> -R <owner/repo>` and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

**Vertical slice rules:**
- Each slice cuts a narrow but **complete** path through every layer (schema, API, UI, tests) — NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

Give each ticket its **blocking edges** — the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase. Sequence it as **expand–contract**: First expand (add the new form beside the old), migrate call sites in batches, then contract (delete the old form when no callers remain). Each batch is its own ticket.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work

Ask the user:
- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct — does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?

**CRITICAL**: Wait for user approval before publishing. Iterate until they approve.

### 5. Publish tickets as GitHub Issues

Create issues in dependency order (blockers first) so each ticket's blocking references can use real issue numbers. Run one `gh issue create` per ticket:

```bash
gh issue create \
  --repo "<owner/repo>" \
  --title "<Ticket title>" \
  --label "ticket" \
  --body "<issue body>"
```

After creation, capture the issue number from the output. Subsequent tickets reference it as a blocker: `#<number>`.

<issue-template>

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective — not a layer-by-layer implementation list.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- `#<issue-number>` or "None — can start immediately"

</issue-template>

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts.

Do NOT close or modify any parent spec issue.
