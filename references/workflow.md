# One outcome at a time

The delivery contract for product work: frame the problem, write an overview,
split it into tickets on a GitHub Project, and build one ticket at a time.
`AGENTS.md` owns interaction, modes, speed, and worktrees. Quick and Small fixes,
and Full requests made directly, never need a ticket. Reading this contract
never authorizes a later stage.

## Each artifact has one job

| Artifact | Owns | Does not repeat |
|---|---|---|
| **Design / parent issue** | The overall problem, desired experience, success, scope, and slices | Technical implementation plans |
| **Delivery issue** | One desired change, why it matters, boundaries, and observable completion criteria | The full design or a coding task list |
| **Technical plan** | How one taken issue will be delivered in today's code, its tradeoffs, risks, and tests | The issue's narrative or a plan for the backlog |
| **GitHub Project** | Status, priority, and effort; native issue Type and Assignees are shown in the Project, and issue relationships own dependencies | Design, issue, or plan prose |
| **PR** | Actual changes, linked issue, verification, and remaining limitations | The design, issue, or intended plan copied in full |

Build on the preceding artifact with links and short references. Include enough
local context to understand the current decision, not the whole history. Later
stages cannot silently change an earlier agreement: bring behavior or scope
changes back to me. A PR reports what actually happened, including deviations
from the approved plan.

## The flow

1. **Frame** (`design`) — is this the right problem, and is it worth doing?
   Output: a problem brief. I decide: invest, explore more, defer, or stop.
2. **Overview** (`design`) — extend the same design with the proposed experience,
   mandatory flowchart, scope, ordered slices, key nouns, and unresolved questions.
   What and why, never how. I approve the scope. The design becomes the
   **parent issue**, without repeating a separate brief and overview.
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
- **Opportunity** — what could improve and why, without prescribing implementation.
- **Success and worth it** — 1-3 observable results with a baseline, why they
  justify the effort, and material feasibility, privacy, or safety concerns.
- **Key nouns** — only terms and relationships needed to understand the design.
- **Decisions** — investment choice and settled answers, labeled **Decided:**.
- **Open questions** — unresolved only, labeled **Open:**, ranked by importance ×
  uncertainty, and last in the main document. Move answered questions to Decisions.

Keep evidence in an appendix: sources, code references, and claims marked
certain, supposed, or unknown. Preserve the original brain spill in a private
appendix at the very bottom; never publish it.

Call out red flags: the problem names a tool or feature; only the requester is
quoted; no measurable success; an assumed cause or a symptom-level fix; a
backlog with only Feature tickets and no Research. Skip PRDs, RACI charts, and anything
that would not change the decision.

## Overview

Extend the brief in place; do not repeat it. Keep the main document readable
in five minutes, using this order:

1. Situation and who
2. Opportunity
3. Success and worth it
4. Proposed experience
5. Scope and slices
6. Key nouns (omit if unnecessary)
7. Decisions
8. Open questions
9. Appendix: evidence
10. Appendix: original brain spill (private)

**Proposed experience** includes a short walkthrough and a mandatory Mermaid
flowchart: starting state, actions, visible result, and a consequential failure.
Use simple syntax and quoted labels; keep the written walkthrough readable even
if the diagram fails to render. Other diagrams are optional.

**Scope and slices** states **In**, **Out**, and ordered end-to-end slices,
each with Must/Should/Could priority and blockers, plus a first-release line.
Technical unknowns go in Open questions as Research ticket candidates.

Use short bullets, plain language, `##` headings, and **bold** scan labels for
MarkText. Keep one home for each fact. Never architecture, schemas, libraries,
or file layout.

One design has one `00-index.md`. Separate problems or independently approvable
outcomes get separate design folders; steps toward the same outcome are slices.
A collection index only links to designs, without duplicating their content.

## Split: rules for tickets

- **Vertical slices.** Each ticket is a thin end-to-end piece a user can see
  working. Never split by database, API, and UI layers.
- **Thinnest working path first**, then variations and exceptions as their own
  tickets.
- **INVEST** — independent, negotiable, valuable, estimable, small, testable.
- **Effort XS, S, or M.** Split anything larger; turn anything that cannot be estimated into a Research ticket first.
- **Order** — Must above the release line, then risky items early, then whatever
  unblocks the most. Ask: would removing this stop the user finishing the task?
- **CRUD check before approval.** Grid the slices against the domain's things
  and mark create, read, update, delete. Each empty column is a question for me:
  a missing ticket or a deliberate Won't.

## Ticket format

Written for a teammate who missed every meeting. What and why, never how.
Use short bullets and plain language; the parent holds the broader design.

```markdown
# <Verb-led title>

Parent: #<n>

## Change
Who needs what to become possible or different?

## Why
What happens today and why this specific change matters.

## Flowchart
<Mandatory Mermaid flowchart: this slice's main path and consequential failure>

## Done when
- [ ] Given <state>, when <action>, then <observable result>

## Out of scope
<deliberate exclusions, linking related issues instead of copying their scope>
```

**Done when is the acceptance checklist**, not a second summary. Include
observable edge cases, failures, permissions, and accessibility behavior where
relevant. Generic quality gates (tests, review, merge) belong to the delivery
contract, not a duplicate checklist. Frameworks, schemas, file changes, and
technical task lists belong to the plan written when this issue is taken.

Keep status, priority, and effort in Project fields, classification in the native
issue Type, and dependencies in GitHub's issue relationships. The split preview
may show them for approval; do not maintain competing copies in issue bodies.

### Classify every issue

Choose the type from the outcome, not the files or programming language involved:

| Type | Use for | Example |
|---|---|---|
| **Feature** | A new or intentionally expanded capability | Let moderators unpublish an event |
| **Bug** | Behavior that fails an existing promise | Filtering makes the Resources page jump |
| **Task** | Maintenance, chores, refactoring without behavior changes, documentation, or operational work | Update channel guidelines |
| **Research** | A bounded question that must be answered before choosing or delivering a change | Establish which Resources work remains |

Set GitHub's native **issue Type** and show it in Project views. Do not create a
second custom Type field, repeat the type in the body, or use competing type
labels. Labels such as `frontend` and `events` describe the area, not the type.
If the organization has no Research type, use **Task** with its existing
`research-needed` label; do not create an organization-wide type without approval.

Assign an initial classification when creating or triaging the issue; I can
correct it. Preserve my corrections on later runs. A Bug should name expected
versus actual behavior; a Feature should name the new capability; a Task should
name the concrete maintenance result. Split unrelated outcomes instead of
calling everything a Task. `feat`, `fix`, `chore`, `docs`, and `refactor` remain
commit/PR prefixes, not a second issue classification system.

### Research tickets

Research promises an answer, not a product change. Use the same compact format:
**Change** names the question, **Why** names the decision it unblocks,
**Flowchart** shows the bounded investigation and decision path, **Done when**
requires cited evidence, viable options, a labeled recommendation, and the
user's decision. **Out of scope** excludes implementation. Agree a timebox;
if it ends without an answer, report the unresolved blocker rather than claiming
completion. Taking it starts `research`, not a coding plan.

A ticket with a report or dashboard adds: the decision it supports and who
makes it, users and access limits, data sources, static or live, freshness, and
what it shows with no data. Keep frameworks, schemas, data fields, file layout,
and task lists out.

## The GitHub Project

One Project per product. Project fields own status, priority, and effort;
native GitHub issue fields own Type and Assignees, and relationships own dependencies.

- **Project fields** — Status (Backlog, Ready, In progress, In review, Done),
  the existing Priority field (Must, Should, Could, Won't or its project equivalents),
  and Effort (XS, S, M). Reuse an existing Size field as Effort rather than adding
  a competing estimate field.
- **Suggested values** — fill missing Priority and Effort directly with initial
  suggestions I can correct. Preserve existing values and my corrections; never
  add a second Priority field or duplicate these values in issue bodies or labels.
  Effort is relative work, not a promised delivery date: XS is a very small change,
  S is a contained change, and M is a multi-step slice. Flag uncertainty and split
  anything larger rather than pretending the estimate is precise.
- **Dates** — leave Start and Target dates blank unless I provide them; preserve
  existing dates. Do not infer dates from priority, effort, meetings, or today's date.
- **Issue type** — classify using the rules above, set the native issue Type,
  and expose it in Project views rather than creating a custom Type field.
- **Assignment** — use GitHub's native **Assignees** field on the issue and show
  it in Project views. Do not create a custom Owner field or duplicate assignment
  in issue bodies or planning templates. Leave unassigned when nobody is chosen.
- **Structure** — the parent issue holds the design; slices are its sub-issues;
  dependencies are native "blocked by" links.
- **No orphan issues** — every delivery or research issue is a native sub-issue
  of a parent issue, so the parent shows "X of Y done" progress. When creating
  an issue, attach it to the matching parent with `--parent`; if none fits,
  create a parent issue first (title is the plain outcome, no prefix; its body is
  the overview:
  Situation and goal, Desired experience with flowchart, Release scope, Done when).
  When touching a Project, find open orphans and propose grouping them under
  existing or new parent issues. Keep one level: parent issues hold tickets,
  tickets hold none. Call them "parent issues", not epics.
- **Backlog** — captured, but not yet agreed, understood, or unblocked.
- **Ready** — passes INVEST, sized, behavior settled (or a Research question
  bounded), with no unresolved dependency blocking the start.
- **In progress** — taken; technical planning, approved implementation, or
  bounded research is underway. Taking a delivery issue does not approve building it.
- **In review** — delivery implementation and local checks/review are complete,
  awaiting human review or merge; for Research, findings await the user's decision.
- **Done** — delivery merged and verified against Done when. Research has met
  its evidence and decision criteria; no code merge is required for research-only work.
  A PR alone is not done. Parent completion requires its agreed release scope
  to be delivered and verified.

Priority is separate from status: important work can still be blocked. Use the
Project and issue relationships for coordination, not extra planning documents.

```sh
gh issue create --title "<title>" --body-file <draft> --parent <parent> --blocked-by <n,...> --project "<project>"
gh project item-list <number> --owner <owner> --format json --query "status:Ready -status:Done"
gh issue view <n> --json title,body,state,blockedBy,parent,subIssues,projectItems
```

Agents move cards, link PRs to their issue, and flag stale items. Closing,
deleting, or archiving an issue still needs my approval. Projects need the `gh`
token's `project` scope; when it is missing, ask me to run
`gh auth refresh -s project`.

## Technical planning: apply PSD

Every technical plan, for a taken ticket or a direct Full-speed request, must
read and apply [Software Design](software-design.md) before choosing the approach.
Use *A Philosophy of Software Design* (PSD) to decide module ownership, what
knowledge each module hides, and what callers must understand—not just to review
finished code. For a non-trivial interface, sketch two meaningfully different
shapes and compare caller complexity and change amplification before choosing.
Briefly explain the relevant PSD tradeoffs in the plan and check the proposed
design against the reference's red flags. Keep this proportional to the work;
do not add abstractions or a boilerplate checklist to satisfy the rules.

## Take a ticket

1. Pick an explicit ticket, or the highest-priority Ready ticket whose
   blocked-by issues are all closed. Move it to In progress.
2. Read the ticket, comments, and relevant current code. If the promised behavior
   conflicts with the code, or a product decision is missing, bring the exact
   question to me. Never silently rewrite the ticket to fit an implementation.
3. For a delivery issue, write the technical plan with `plan` only now. Lead with
   approach, meaningful tradeoffs, and risks; follow with affected modules,
   data/API changes, failures, and tests. Reference each Done when item rather
   than copying the issue narrative. My approval means build.
4. Build per `implement` at Full speed, move the card to In review when local
   review is done, and to Done once merged and verified. A material change to
   the approved approach returns for approval; a changed promise returns to the issue.

For a Research ticket, use `research` instead of steps 3–4: investigate the
bounded question, present evidence and options, and ask for the decision.
Starting another ticket, publishing, closing issues, and implementing a finding
still require their own approval.

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
