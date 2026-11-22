# One outcome at a time

The GitHub delivery contract for product work: frame the problem, capture the
approved overview in a parent issue, and deliver one sub-issue at a time on the
product's GitHub Project. `AGENTS.md` owns interaction, modes, speed, and
worktrees. Quick and Small fixes and direct Full requests do not require a
GitHub issue. Reading this contract never authorizes a later stage.

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
3. **Split** (`to-issues`) — each slice becomes a delivery issue a teammate or
   agent can pick up cold. My approval of the split creates the issues as
   sub-issues of the parent, with "blocked by" links, on the Project.
4. **Take an issue** (`plan`, then `implement`) — the agent writes the
   implementation plan only now, against today's code, and shows how it answers
   each acceptance criterion. My approval of that plan means build it.

Nothing technical is planned until the delivery issue is taken. An unknown
that could sink the work becomes a **Research** issue: a time-boxed question
that ends in a decision and is picked up early.

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
backlog with only Feature issues and no Research. Skip PRDs, RACI charts, and anything
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
Technical unknowns go in Open questions as candidates for Research issues.

Use short bullets, plain language, `##` headings, and **bold** scan labels for
MarkText. Keep one home for each fact. Never architecture, schemas, libraries,
or file layout.

One design has one `00-index.md`. Separate problems or independently approvable
outcomes get separate design folders; steps toward the same outcome are slices.
A collection index only links to designs, without duplicating their content.

## Split: rules for issues

- **Vertical slices.** Each delivery issue is a thin end-to-end piece a user
  can see working. Never split by database, API, and UI layers.
- **Thinnest working path first**, then variations and exceptions as their own
  issues.
- **INVEST** — independent, negotiable, valuable, estimable, small, testable.
- **Effort XS, S, or M.** Split anything larger; turn anything that cannot be estimated into a Research issue first.
- **Order** — Must above the release line, then risky items early, then whatever
  unblocks the most. Ask: would removing this stop the user finishing the task?
- **CRUD check before approval.** Grid the slices against the domain's things
  and mark create, read, update, delete. Each empty column is a question for me:
  a missing issue or a deliberate Won't.

## Issue format

Apply the [writing skill's GitHub issue guidance](../skills/writing/SKILL.md#github-issues).
The issue says what and why, never how. The parent holds the broader design,
not facts the reader needs to understand this issue.

```markdown
# <Verb-led title naming the affected thing and outcome>

Parent: #<n>

## Change
<Who needs what to change, and where it happens. For a Bug, give actual and expected behavior. For Research, state the question.>

## Why
<What happens today and what consequence makes this work matter. For Research, name the decision it unblocks.>

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

### Research issues

Research promises an answer, not a product change. Use the same compact format:
**Change** names the question, **Why** names the decision it unblocks,
**Flowchart** shows the bounded investigation and decision path, **Done when**
requires cited evidence, viable options, a labeled recommendation, and the
user's decision. **Out of scope** excludes implementation. Agree a timebox;
if it ends without an answer, report the unresolved blocker rather than claiming
completion. Taking it starts `research`, not a coding plan.

An issue with a report or dashboard adds: the decision it supports and who
makes it, users and access limits, data sources, static or live, freshness, and
what it shows with no data. Keep frameworks, schemas, data fields, file layout,
and task lists out.

## The GitHub Project

One Project per product. Project fields own status, priority, and effort;
native GitHub issue fields own Type and Assignees, and relationships own dependencies.

- **Project fields** — Status (the states below, mapped as described next), the
  existing Priority field (Must, Should, Could, Won't or its project equivalents),
  and Effort (XS, S, M). Reuse an existing Size field as Effort rather than adding
  a competing estimate field.
- **Status mapping** — read the board's own Status options with
  `gh project field-list`, then map each state onto them. Backlog and Ready use the
  not-started option; In progress and In review use the active option; Done uses
  Done. A board with no separate In review option keeps the card In progress until it
  is Done. Never add or rename a Status option without my approval.
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
  existing or new parent issues. Keep one level: parent issues have sub-issues;
  sub-issues have none. Call them "parent issues", not epics.
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

## Keep the board and worktrees current

The agent updates the Project and removes merged worktrees at the points below,
without waiting to be asked. Status changes are reversible. Closing, deleting, and
archiving stay approval-gated.

| Event | Agent action |
|---|---|
| Split approved and issues created | Status to the not-started option (Ready or Backlog) |
| Issue taken | Status to the active option (In progress) |
| Local review done and PR open | Status to In review, or the active option on a board without it |
| Merge found by the merge sync | Check Done when; if it holds, Status to Done; if not, keep the card active and report the gap |
| Every delivery sub-issue of a parent is Done | Report the parent as ready for its release check; leave its Status to me |

Built-in Project workflows can also change Status, for example setting Done when a
linked PR merges, before anyone checks the acceptance criteria. After any merge,
the merge sync reconciles the card with Done when.

### Merge sync

Run the merge sync from the repository's main checkout at the start of
`implement`, when `pr` opens a PR, and whenever you say a PR merged or ask for
cleanup. It is safe to repeat.

1. Run the status report from the main checkout:

   ```sh
   ~/.agents/scripts/worktree-status.sh
   ```

   It prints one line per worktree: STATE (`merged`, `open`, `closed`, `no-pr`,
   `unknown`), DIRTY (`clean` or a count of local files), and ACTION (`cleanup`,
   `keep-dirty`, `keep`). Act on that output; do not re-derive PR state by hand.
2. For each `merged` worktree, check its linked issue's Done when against the merged
   result, then set the card as the table above says.
3. For each `cleanup` line, remove the worktree and its local branch:

   ```sh
   ~/.agents/scripts/cleanup-worktree.sh "<branch>"
   ```

   The script refuses worktrees with uncommitted or ignored files and keeps the
   remote branch unless you answer yes. If it refuses, report the files and leave
   the worktree in place. Never add `--force` without your explicit OK. Your
   standing request for merged worktree cleanup covers this worktree and its local
   branch. It does not cover remote branches, unmerged work, or discarded changes.
4. Report the worktrees removed, the cards moved, and anything kept and why.

Nothing runs between sessions. Merges are picked up the next time a step above
runs; a card already moved by a built-in workflow stays as it is.

## Technical planning: apply PSD

A taken delivery issue or a direct Full-speed request needs an approved plan
before implementation. Use [plan](../skills/plan/SKILL.md) to apply
[Software Design](software-design.md) before choosing the approach. Quick and
Small work does not need a plan. My approval means build; a material change
to the approved approach returns for approval.

## Take an issue

1. Pick the requested issue, or the highest-priority Ready issue whose
   blocked-by issues are all closed. Move it to In progress.
2. Read the issue, comments, and relevant current code. If the promised behavior
   conflicts with the code, or a product decision is missing, bring the exact
   question to me. Never silently rewrite the issue to fit an implementation.
3. For a delivery issue, write the technical plan with `plan` only now. Lead with
   approach, meaningful tradeoffs, and risks; follow with affected modules,
   data/API changes, failures, and tests. Reference each Done when item rather
   than copying the issue narrative. My approval means build.
4. Build per `implement` at Full speed. Move the card to In review when local
   review is done and the PR is open. The merge sync moves it to Done once the merge
   is verified. A material change to
   the approved approach returns for approval; a changed promise returns to the issue.

For a Research issue, use `research` instead of steps 3–4: investigate the
bounded question, present evidence and options, and ask for the decision.
Starting another issue, publishing, closing issues, and implementing a finding
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
| Implementation plan for a taken issue | Me; approval means build |
| Worktree placement | `AGENTS.md` **Choose the worktree before implementation** |
| Code review | `AGENTS.md` **Pick the speed before coding** |
| Deleting tests | Me, or my task-scoped cleanup authorization |
| Commit | Me (`commit`); `commit-review` only for unattended work |
| Push or open a PR | Me; invoking `/pr`, `/wf`, or `/wf-auto` counts |
| Move cards for taken, PR-open, and verified-merged work | Automatic (**Keep the board and worktrees current**) |
| Remove a merged worktree and its local branch | Automatic through the merge sync; deleting a remote branch or using `--force` needs me |
| Close, delete, or archive issues; merge; start the next issue | Me, every time |

Reviewer agents check quality; they never grant these approvals.

## Parallel work

Before working on issues in parallel, inspect shared files, contracts,
migrations, and integration order. If one issue depends on an unfinished
contract from another, work on them in order. Coordinate independent issues
through `orchestration`. Keep one issue in progress per person or agent.
