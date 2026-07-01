---
name: decision-mapping
description: Turn a loose idea into a sequenced map of investigation tickets, then drive them to resolution one at a time. Use when an idea is too vague to blueprint — you need to push back the fog of war first.
disable-model-invocation: true
---

# Decision Mapping

Turn a loose idea into a sequenced map of investigation tickets, then drive them to resolution one at a time. Creates a stateful decision map in the plan server.

## The Decision Map

The decision map is a single compact markdown file under the plan server. It is the canonical artifact — the **whole map is loaded as context into every session**, so it must stay compact.

Assets created during tickets should be linked to from the map, not duplicated within it.

### Structure

Entries ("tickets"), each its own section keyed by a short dash-case slug:

```markdown
## relational-db: Relational Or Non-Relational Database?

Blocked by: <slug>, <slug>
Status: open | in-progress | resolved
Type: Research | Prototype | Grilling

### Question

<question-here>

### Answer

<answer-here>
```

The slug is the canonical id, used in every `Blocked by` edge. A ticket is **unblocked** when every ticket in its `Blocked by` list is `resolved`. A session **claims** its ticket by setting `Status: in-progress` and saving the map before any work, so concurrent sessions skip it.

Each ticket must be sized to one 100K token agent session.

### Ticket Types

- **Research**: Reading documentation, third-party APIs, or local resources. Write findings to plan server (`research` or `decisions` type).
- **Prototype**: Throwaway code via `/skill:prototype` to answer "how should it look" or "how should it behave".
- **Grilling**: Conversation with the agent via `/skill:grill-with-docs` or `/skill:domain-modeling`.

## Fog of war

The map is _deliberately_ incomplete beyond the frontier. Your job is to investigate the frontier, and to resolve tickets in order to push the frontier forward. Push back the fog of war, one node at a time — until the path to the finish line is clear and no tickets remain.

## Invocation

Two branches. Either way, **every session ends with a handoff** — never resolve more than one ticket per session.

### Create the map

User invokes with a loose idea.

1. Run a grilling session to surface the open decisions. Ask one question at a time.
2. Write a new decision map to the plan server:
   ```bash
   python3 ~/.agents/scripts/new-artifact.py --project <project> --type maps --topic "<feature> decision map"
   ```
3. Handoff. Map-building is one session's work; do not also resolve tickets.

### Work through the map

User invokes with a path to an existing map. A ticket slug is **optional** — without one, you pick the next decision, not the user.

1. Load the **whole map** as context.
2. Choose the ticket. If the user named one, use it. Otherwise pick the first `open` ticket in document order that is unblocked. Claim it: set `Status: in-progress` and save before any work.
3. Resolve it, invoking skills as needed.
4. Record the answer in the ticket's body and set `Status: resolved`.
5. Add newly-discovered tickets with correct `Blocked by` edges. If the decisions made invalidate other parts of the map, update or delete those nodes.
6. Handoff.

## Handoff

End every session by clearing the context and opening one or more fresh sessions. Close with a **Next steps** block the user can copy-paste.

**Open tickets remain.** List the currently-unblocked tickets, then give two copy-paste options: a bare command for one session (you pick the next ticket), and one pinned command per unblocked ticket for running them in parallel.

**No open tickets remain.** Recommend implementing directly, or using `/skill:to-prd` to schedule a multi-session implementation.
