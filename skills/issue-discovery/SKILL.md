---
name: issue-discovery
description: >-
  Turn an unresolved product or engineering choice into a clear decision issue. Use design for behavior briefs and planning for the technical approach to one selected ticket.
disable-model-invocation: true
---

# Issue Discovery

Use this when the work is to make or record a decision, not to deliver a behavior change. An unresolved user-facing behavior belongs in `/design`; implementation planning happens later in `/plan`, after a ticket is selected. This skill does not research deeply, plan implementation, or create delivery tickets.

## Decision issues

When a decision needs a durable GitHub record, use this short template, shorter when context is obvious:

```markdown
## Question

What decision needs to be made?

## Context

Why does it matter now? What is already known?

## Decision criteria

- What must the decision optimize for?
- What constraints and tradeoffs matter?

## Expected outcome

Record the chosen direction and the reasoning needed to guide implementation.

## Out of scope

What is explicitly not being decided here?

## References

- Relevant issues, docs, or code
```

Do not add guessed implementation steps, exact file lists, or test checklists unless the user explicitly asks for them.

## Labels

Use only plain public labels:

- `needs-decision` — for unresolved product or engineering choices
- `research-needed` — when evidence must be gathered before deciding
- `prototype-needed` — when a cheap concrete experiment is needed

Do not introduce a manual-task label unless there is a recurring, clearly understood need.

## Invocation

1. **Confirm this is a decision, not a delivery ticket.** If the user needs a behavior change, redirect to `/design`; if they need technical direction for a selected ticket, redirect to `/plan`.
2. **Propose the issue set** — present the planned decision issues to the user for approval.
3. **Create issues** — once approved, create GitHub issues with plain public labels.
4. **Resolve** — if working a decision, resolve at most one per session.

## Done when

- Behavior changes are routed to `/design`, and selected tickets are routed to `/plan` for technical planning.
- Approved decision issues are published to GitHub with plain public labels.
