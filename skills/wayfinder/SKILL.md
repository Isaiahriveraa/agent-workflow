---
name: wayfinder
description: Plan a huge chunk of work — more than one agent session can hold — as a shared map of investigation tickets on GitHub Issues, resolved one at a time until the way to the destination is clear.
disable-model-invocation: true
---

A loose idea has arrived — too big for one agent session, and wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding charts the way as a **shared map** on GitHub Issues, then works its tickets one at a time until the route is clear.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear — nothing left to decide before someone goes and does the thing. An effort can override this in its **Notes** (carrying execution into the map itself), but absent that, produce decisions, not deliverables.

## Determining the repo

In priority order:
1. If the first argument is in `owner/repo` format, use it.
2. Otherwise detect from `git remote get-url origin` in CWD.
3. If neither, ask the user for `owner/repo`.

## The Map

The map is a single GitHub Issue on the repo, labelled `wayfinder:map` — the canonical artifact.

### Map body

```markdown
## Destination

<what reaching the end of this map looks like — the spec, decision, or change this effort is finding its way to. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then the link for detail -->

- [<closed ticket title>](link) — <one-line gist of the answer>

## Not yet specified

<!-- in-scope fog that can't be ticketed yet; graduates as the frontier advances -->

## Out of scope

<!-- work ruled beyond the destination; closed, never graduates -->
```

## Tickets

Each ticket is a GitHub Issue with the `wayfinder:` prefix label — one of `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.

A session **claims** a ticket by assigning it to the dev driving the map, **first**, before any work, so concurrent sessions skip it. That assignee _is_ the claim: an open, unassigned ticket is unclaimed.

Blocking uses GitHub's **issue body references** (`#<number>`). A ticket is **unblocked** when every ticket blocking it is closed; the **frontier** is the open, unblocked, unclaimed issues — the edge of the known.

### Ticket body

```markdown
## Question

<the decision or investigation this ticket resolves>
```

### Ticket types

- **Research** (AFK label `wayfinder:research`): Reading docs, third-party APIs, or local resources. Creates a markdown summary as a linked reference. Use when knowledge outside the current context is required.
- **Prototype** (HITL label `wayfinder:prototype`): Raise fidelity by making a cheap, rough, concrete artifact via the /prototype skill. Links the prototype as a reference. Use when "how should it look" or "how should it behave" is the key question.
- **Grilling** (HITL label `wayfinder:grilling`): Conversation via /grill-with-docs, one question at a time. The default case.
- **Task** (HITL or AFK label `wayfinder:task`): Manual work that must happen before a *decision* can be made — signing up for a service, provisioning access, moving data. Resolved when the work is done.

## Fog of war

The map is deliberately incomplete. Beyond the live tickets lies the **fog of war** — decisions you can tell are coming but can't yet pin down. The map's **Not yet specified** section is where that dim view is written down.

The test for fog vs ticket: can you state the question precisely now?
- **Ticket** when the question is already sharp — even if it's blocked and you can't act yet.
- **Not yet specified** when you can't yet phrase it that sharply.

## Out of scope

Work beyond the destination is **out of scope** — ruled out of this effort, not fog. It gets its own **Out of scope** section.

## Invocation

### Chart the map (first session)

User invokes with a loose idea.

1. **Name the destination.** Grill the user to pin down what this map is finding its way to — the spec, decision, or change. The destination fixes the scope.
2. **Map the frontier.** Grill again, **breadth-first** — fan out across the whole space rather than deep on any one thread. If this reveals no fog (the way is already clear, small enough for one session), stop and ask how they'd like to proceed — no map needed.
3. **Create the map** as a GitHub Issue with label `wayfinder:map`.
4. **Create tickets** you can specify now as separate issues with their `wayfinder:` labels. Wire blocking edges in a **second pass** (issues need ids first). Everything you can't yet specify stays in the fog.
5. Stop — charting is one session's work; do not also resolve tickets.

### Work through the map (subsequent sessions)

User invokes with a map (issue number or URL).

1. **Load the map** — read the map issue body.
2. **Choose the ticket.** If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it** — assign it to yourself via `gh issue edit <number> --add-assignee "@me"`.
3. **Resolve it** — invoke the skills the Notes block names. If in doubt, use grilling and domain-modeling.
4. **Record the resolution:** post the answer as a resolution comment via `gh issue comment <number>`, **close** the issue, and append a line to the map's Decisions-so-far via `gh issue edit <map-number> --body-file`.
5. **Surface new tickets** from the resolution; graduate any fog the answer has made specifiable. If the answer reveals a ticket sits beyond the destination, **rule it out of scope**. If decisions invalidate other tickets, update or delete them.

**Never resolve more than one ticket per session.**
