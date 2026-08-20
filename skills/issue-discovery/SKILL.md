---
name: issue-discovery
description: Turn ambiguous product or engineering ideas into clear, team-readable decision GitHub issues before implementation planning.
disable-model-invocation: true
---

# issue-discovery

A loose idea has arrived — a feature request, a design question, an engineering problem — but it isn't clear enough to implement yet. `issue-discovery` turns the fog into structured decision issues, one at a time, until the way forward is concrete enough for implementation planning.

## Plan, don't do

`issue-discovery` is **planning** by default. Each session produces decision issues, research findings, prototypes, or investigation summaries — not code. If implementation is needed, the session ends with a handoff to `to-tickets`, which turns the settled direction into implementation-ready tickets.

## Discovery flow

### 1. Clarify the destination

Before exploring, pin down what success looks like:

- What should be decided or true when this discovery is complete?
- What is the smallest concrete output that would count as "done"?
- Who needs to be able to act on the result?

### 2. Explore broadly

Map the terrain before committing to a path:

- **Users and stakeholders** — who is affected?
- **Journey boundary** — where does this start and end?
- **Repository context** — which codebases, services, or systems are involved?
- **Constraints** — what hard boundaries exist (time, budget, compliance, platform)?
- **Dependencies** — what else must happen first?
- **Out of scope** — what is explicitly not being addressed?

### 3. Separate concern types

Different kinds of unknowns need different artifacts:

| Unknown | Artifact |
|---|---|
| Unresolved product or engineering choice | `needs-decision` issue |
| Missing evidence before deciding | `research-needed` issue |
| Cheap concrete experiment | `prototype-needed` issue |
| Direction is clear | Hand off to `to-tickets` |

Propose the issue set to the user before creating anything.

## Labels

Use only plain public labels:

- `needs-decision` — for unresolved product or engineering choices
- `research-needed` — when evidence must be gathered before deciding
- `prototype-needed` — when a cheap concrete experiment is needed

Do not introduce a manual-task label unless there is a recurring, clearly understood need.

## Parent/context issue

A parent issue is **optional**. If one helps organize related sub-issues, title it with ordinary language such as "Parent context" or "Product goal" — not "map" or "planning map".

## Decision issues

### Template

When creating a decision issue, use this default template, shorter when context is obvious:

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

### Resolution

At most one decision issue per session. To resolve:

1. Gather evidence and reasoning.
2. Record the decision as a comment on the issue.
3. Close the issue.
4. If a parent context issue exists, update it with a one-line summary and a link.

## Research issues

Research issues collect evidence without deciding. Label with `research-needed`. The deliverable is a markdown summary linked from the issue.

## Prototype issues

Prototype issues are cheap concrete experiments. Label with `prototype-needed`. The deliverable is a runnable prototype linked from the issue.

## Implementation handoff

Once decisions are settled and direction is clear, hand off to `to-tickets`. Implementation tickets are a different artifact from decision issues:

- They specify **observable behavior** and **scope**.
- They define **acceptance criteria** and **verification**.
- They list **dependencies** and **out-of-scope** boundaries.
- They may mention likely files when repository evidence supports them.
- They do **not** over-prescribe implementation details.

## Invocation

User invokes with a loose idea, feature request, or ambiguous problem.

1. **Clarify the destination.** Ask what "done" looks like.
2. **Explore broadly.** Gather context about users, codebases, constraints, dependencies, and out-of-scope areas.
3. **Separate concerns.** Identify decisions, research needs, and prototypes.
4. **Propose issue set.** Present the planned issues to the user for approval.
5. **Create issues.** Once approved, create GitHub issues with plain public labels.
6. **Resolve.** If working a decision, resolve at most one per session.
7. **Hand off.** When direction is settled, hand to `to-tickets` for implementation planning.

## Internal mechanics

All workflow mechanics — labels, the parent-child relationship, the session-at-most-one-decision rule — are internal to this skill. Never expose branded vocabulary such as "wayfinder", "frontier", "map", or "grilling" in issue titles, labels, or bodies.
