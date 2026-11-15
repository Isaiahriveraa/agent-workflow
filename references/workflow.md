# One outcome at a time

The delivery contract for product work: frame the problem, write an overview,
split it into tickets on a GitHub Project, and build one ticket at a time.
`AGENTS.md` owns interaction, modes, speed, and worktrees. Quick and Small fixes,
and Full requests made directly, never need a ticket. Reading this contract
never authorizes a later stage.

## The flow

1. **Frame** (`design`) — is this the right problem, and is it worth doing?
   Output: a problem brief. I decide: invest, explore more, defer, or stop.
2. **Overview** (`design`) — what and why, never how: vision, goals, scope,
   MoSCoW capabilities, the main user flow, the domain picture, unknowns, and
   the ordered slice list. I approve the scope. Brief and overview together
   become the **parent issue**.
3. **Split** (`to-issues`) — each slice becomes a behavior ticket a teammate or
   agent can pick up cold. My approval of the split creates the issues as
   sub-issues of the parent, with "blocked by" links, on the Project.
4. **Take a ticket** (`plan`, then `implement`) — the agent writes the
   implementation plan only now, against today's code, and shows how it answers
   each acceptance criterion. My approval of that plan means build it.

Nothing technical is planned ahead of a ticket being taken. An unknown that
could sink the work becomes a **Research** ticket: a time-boxed question that
ends in a decision, picked up early like any other ticket.

## Frame: the problem brief

Support one decision, nothing more:

- **Situation and who** — who has the problem, how it shows up, today's workaround.
- **Evidence** — each claim marked certain, supposed, or unknown.
- **Opportunity** — the problem stated without a solution in it.
- **Success** — 1-3 measurable results with a baseline.
- **Worth it?** — desirable, viable, feasible, responsible (privacy, safety).
- **Key nouns** — the things people keep naming; the first domain picture.
- **Open questions** — ranked by importance × uncertainty.

Call out red flags: the problem names a tool or feature; only the requester is
quoted; no measurable success; an assumed cause or a symptom-level fix; a
backlog with only Feature tickets and no Research. Skip PRDs, RACI charts, and anything
that would not change the decision.

## Overview

Readable in five minutes:

- **Vision** — one or two sentences; **Goals** — the brief's success measures.
- **Scope** — in and out.
- **Capabilities** — Must, Should, Could, Won't (this round).
- **Flow** — one simple Mermaid diagram of the main user path.
- **Domain** — the main things and how they relate, as a Mermaid `erDiagram`
  read as sentences ("a member places many RSVPs").
- **Unknowns** — each becomes a Research ticket.
- **Slices** — ordered, each with priority and what blocks it, and a
  first-release line.

Never architecture, schemas, libraries, or file layout.

## Split: rules for tickets

- **Vertical slices.** Each ticket is a thin end-to-end piece a user can see
  working. Never split by database, API, and UI layers.
- **Thinnest working path first**, then variations and exceptions as their own
  tickets.
- **INVEST** — independent, negotiable, valuable, estimable, small, testable.
- **Size XS, S, or M.** Split anything larger; turn anything that cannot be sized into a Research ticket first.
- **Order** — Must above the release line, then risky items early, then whatever
  unblocks the most. Ask: would removing this stop the user finishing the task?
- **CRUD check before approval.** Grid the slices against the domain's things
  and mark create, read, update, delete. Each empty column is a question for me:
  a missing ticket or a deliberate Won't.

## Ticket format

Written for a teammate who missed every meeting. What and why, never how.

```markdown
# <Verb-led title>

Parent: #<n> · Priority: <Must|Should|Could> (<one-line reason>) · Size: <XS|S|M> · Blocked by: <#n or —>

## User story
As a <role>, I want <capability> so that <outcome>.

## Context
What happens today and why it matters. No solution named.

## User flow
<Mermaid flowchart: main path plus the failures that change what the user sees>

## Edge cases
- <variation or failure> → <expected result>

## Acceptance criteria
- [ ] Given <state>, when <action>, then <observable result>

## Out of scope
<what this ticket deliberately excludes, with links to the tickets that cover it>

## Done when
Tests pass · reviewed · keyboard accessible
```

A ticket with a report or dashboard adds: the decision it supports and who
makes it, users and access limits, data sources, static or live, freshness, and
what it shows with no data. Keep frameworks, schemas, data fields, file layout,
and task lists out.

## The GitHub Project

One Project per product. It is the source of truth for status, priority, and
dependencies.

- **Fields** — Status (Backlog, Ready, In progress, In review, Done), Priority
  (Must, Should, Could, Won't), Size (XS, S, M), Type (Feature, Bug, Task, Research).
- **Structure** — the parent issue holds the brief and overview; slices are its
  sub-issues; dependencies are "blocked by" links.
- **Ready** — passes INVEST, sized, dependencies known, no open product question.
- **Done** — merged and verified against the acceptance criteria. A PR alone is
  not done.

```sh
gh issue create --title "<title>" --body-file <draft> --parent <parent> --blocked-by <n,...> --project "<project>"
gh project item-list <number> --owner <owner> --format json --query "status:Ready -status:Done"
gh issue view <n> --json title,body,state,blockedBy,parent,subIssues,projectItems
```

Agents move cards, link PRs to their issue, and flag stale items. Closing,
deleting, or archiving an issue still needs my approval. Projects need the `gh`
token's `project` scope; when it is missing, ask me to run
`gh auth refresh -s project`.

## Take a ticket

1. Pick an explicit ticket, or the highest-priority Ready ticket whose
   blocked-by issues are all closed. Move it to In progress.
2. Read the ticket and today's code. If the ticket is wrong or unclear, stop and
   bring it to me instead of rewriting it.
3. Write the implementation plan with `plan` and show it. My approval means build.
4. Build per `implement` at Full speed, move the card to In review when local
   review is done, and to Done once merged and verified.

## Private working files

Drafts and plans live under the repository's ignored `context/` folder
(`context/designs/`, `context/issues/`, `context/plans/`). They are the agent's
working notes. Never mention, link, or quote a `context/` path in an issue, PR,
commit message, or code comment; published text must stand on its own.

## Who approves what

| Action | Approved by |
|---|---|
| Invest in a framed problem | Me |
| Overview scope | Me |
| The split, which also creates the issues on the Project | Me |
| Implementation plan for a taken ticket | Me; approval means build |
| Worktree placement | `AGENTS.md` **Choose the worktree before implementation** |
| Code review | `AGENTS.md` **Pick the speed before coding** |
| Deleting tests | Me, or my task-scoped cleanup authorization |
| Commit | Me (`commit`); `commit-review` only for unattended work |
| Push or open a PR | Me; invoking `/pr`, `/wf`, or `/wf-auto` counts |
| Close, delete, or archive issues; merge; start the next ticket | Me, every time |

Reviewer agents check quality; they never grant these approvals.

## Parallel work

Before running tickets in parallel, inspect shared files, contracts, migrations,
and integration order. Serialize a ticket that consumes another's unfinished
contract, and coordinate independent tickets through `orchestration`. One
ticket in progress per person or agent.
