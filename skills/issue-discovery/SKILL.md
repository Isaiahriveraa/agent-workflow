---
name: issue-discovery
description: >-
  Compatibility workflow for turning ambiguous product or engineering ideas into clear, team-readable decision GitHub issues. `/plan` owns behavior clarification, repository research, and decomposition; this skill only publishes decision issues.
disable-model-invocation: true
---

# issue-discovery (compatibility)

This skill is a **compatibility workflow** for publishing decision GitHub issues. It does **not** plan, research, or decompose work — `/plan` owns behavior clarification, repository research, and decomposition. Use this only to turn a settled ambiguity into a structured decision issue.

## What `/plan` owns

- **Behavior clarification** — pinning down what "done" means.
- **Repository research** — grounding claims in concrete repository and architectural evidence.
- **Decomposition** — breaking work into concerns, dependencies, and steps.

If the idea still needs any of the above, run `/plan` first. This skill only publishes the resulting decision issues.

## Decision issues

When a decision needs to be recorded as a GitHub issue, use this default template, shorter when context is obvious:

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

1. **Confirm the idea is settled enough to publish** — if behavior, research, or decomposition is still open, redirect to `/plan`.
2. **Propose the issue set** — present the planned decision issues to the user for approval.
3. **Create issues** — once approved, create GitHub issues with plain public labels.
4. **Resolve** — if working a decision, resolve at most one per session.

## Done when

- The user is redirected to `/plan` for any open behavior/research/decomposition work.
- Approved decision issues are published to GitHub with plain public labels.
