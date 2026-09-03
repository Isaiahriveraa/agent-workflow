---
name: orchestration
description: Plan and execute multi-workstream Herdr layouts across workspaces, tabs, and panes, with prompt files and status-only monitoring.
---

# Orchestration

Use this skill when a request contains multiple independent workstreams and Herdr can make the work easier to understand or execute. The main agent is the orchestrator; each delegated OMP agent owns exactly one concern.

## Core contract

- First inspect the entire request and build a flat concern map.
- Never silently absorb unrelated concerns into one pane.
- Every spawned OMP agent receives a focused prompt and follows the user's requested workflow exactly.
- Use temporary Markdown prompt files for substantial prompts. Agents read their assigned file rather than receiving a giant shell argument.
- Monitor lifecycle state with `herdr agent list` and `herdr agent wait`; do not repeatedly read pane transcripts. Read a pane only when its status is `blocked`, `failed`, `unknown`, or a concrete diagnostic is required.
- Preserve the user's focus with `--no-focus` unless the user explicitly requests otherwise.
- Do not close or repurpose panes, tabs, or workspaces the orchestrator did not create.
- The orchestrator owns layout, dependencies, status, synthesis, and final verification. Child agents own their concern's implementation.

## Choose the layout before creating it

Present the proposed nested layout in concise ASCII before mutating Herdr state:

```text
Workspace: <label>
├── Tab: <tab label>
│   ├── Pane: <concern-a>
│   └── Pane: <concern-b>
└── Tab: <tab label>
    ├── Pane: <concern-c>
    └── Pane: <concern-d>
```

Use the smallest hierarchy that keeps the work legible:

- **Workspace**: Separate a genuinely independent context, repository, project, client, or user-visible initiative. Do not create one merely to group a few panes.
- **Tab**: Group work that shares a project context, lifecycle, dependency chain, or review audience. A tab is the default grouping boundary when multiple concerns belong to one workspace.
- **Pane**: One independently reasoned concern, agent, service, command, or server. A pane is the default execution unit.
- **Workspace plus tabs**: Use when there are multiple projects or contexts and each has multiple related workstreams.
- **Tabs without a new workspace**: Use when the current workspace already has the right repository/context and the user wants separation by activity or audience.
- **Panes in the current tab**: Use for a small number of independent concerns that benefit from immediate side-by-side visibility.

Layout heuristics:

1. Minimize context switching, not pane count.
2. Keep related concerns in one tab, but do not make a tab so dense that status becomes ambiguous.
3. Prefer one concern per pane; combine only tightly coupled steps with one owner and one acceptance contract.
4. Put parallel concerns at the same nesting level. Represent dependencies in the plan, not by hiding them in one pane.
5. If the request is too large for one readable tab, split by project or audience into workspaces/tabs and show the complete tree before creation.
6. Name every workspace, tab, and pane with short stable kebab-case labels.
## Pane splitting: how and when

“Pane splitting” is the concrete Herdr operation for turning the chosen layout into
side-by-side execution units. Split for independent concerns, not for every step:

- Split when two concerns can start concurrently, have different acceptance evidence,
  or need separate lifecycle/status monitoring.
- Do not split a short sequence, tightly coupled edit, shared design decision, or
  dependent step that cannot begin until another pane produces an artifact.
- Keep one concern per pane. A small request may need no split at all; a large request
  may need several panes at the same nesting level. Optimize for understandable
  context and supervision, not maximum parallelism.
- The orchestrator decides from the concern map. Do not ask the user to pick pane
  count, direction, or ratio when the request and repository context make a safe
  default clear. Ask only when alternatives have materially different user-visible
  consequences or the operation is destructive.

Use the installed CLI syntax and the returned opaque ID:

```bash
herdr pane split --current \
  --direction right --ratio 0.5 --cwd "$PWD" --no-focus
```

Use `--direction down` when a horizontal split would make columns too narrow. Set a
different ratio only when one concern clearly needs more room. The command returns
`.result.pane.pane_id`; use that exact pane ID for the next command. Never infer it
from pane order, and never omit `--cwd "$PWD"` when creating a sibling pane.

Example: a request to add an API endpoint, update its frontend, and add regression
coverage yields this plan:

```text
Workspace: current
└── Tab: endpoint-change
    ├── Pane: api
    ├── Pane: frontend (starts after API contract)
    └── Pane: regression-tests
```

Start `api` and `regression-tests` concurrently if their contracts permit it; hold
`frontend` until the API contract is finalized. If the endpoint is trivial and the
tests necessarily change with the implementation, keep them in one pane instead of
manufacturing parallelism. For each split, record the concern, owner, dependency,
and acceptance evidence before mutating Herdr state.

## Planning and dispatch

Before creation, list:

- concern identifier and owner
- target workspace and tab
- dependencies, if any
- expected output and acceptance evidence
- explicit non-goals

Create prompt files under a run-specific temporary directory, for example:

```text
/tmp/omp-orchestration/<run-id>/
├── concern-a.md
├── concern-b.md
└── manifest.md
```

Each concern file must contain:

```markdown
# Concern
You own `<concern-id>`. Stay focused on this concern.

## Goal
<observable goal>

## Scope
<allowed files, systems, and behavior>

## Out of scope
<other concerns and prohibited changes>

## Dependencies
<start-now, concurrent, or blocked relationships>

## Acceptance
<tests, files, runtime behavior, or report required>
```

Use Herdr's IDs returned by creation commands. Never infer IDs from pane order. Preserve the caller's `PWD` with `--cwd "$PWD"` when creating a sibling layout.

For each available shell pane:

```bash
herdr agent start <stable-name> --kind omp --pane <returned-pane-id>
herdr agent prompt <stable-name> \
  "Read /tmp/omp-orchestration/<run-id>/<stable-name>.md, then invoke the plan skill before implementation." \
  --wait
```

The prompt should be short because the full contract is in the file. Dispatch independent concerns in parallel where possible. Serialize only when a later concern consumes a finalized interface, schema, or artifact.

For issue-oriented work, orchestration coordinates the concerns but does not replace
`/to-issues` or publish GitHub issues. Once the approved plan is ready, `/to-issues`
owns the durable drafts under `context/issues/<slug>/` and the parent/child manifest.
Child prompts may name the issue concern and expected draft path, but public issue
content must remain in the issue workflow rather than in temporary orchestration
files.


## Status-only supervision

Maintain a compact board from `herdr agent list`:

```text
Concern Status

workspace/tab/pane                 state
project-api/backend                working
project-ui/frontend                blocked: waiting for API contract
project-tests/regression            idle
```

Use:

```bash
herdr agent list
herdr agent wait <agent-name> --until idle --timeout 120000
```

Interpret states as follows:

- `working`: execution is active; do not interrupt or read output routinely.
- `idle` or `done`: the agent has stopped active work; inspect expected artifacts and collect its concise result.
- `blocked`: surface the exact blocker and ask the user only if the orchestrator cannot resolve it safely.
- `unknown`: investigate with targeted pane/process inspection.
- timeout: report that completion was not observed; do not claim success.

When an agent reaches a settled state, verify its declared deliverables and run the parent-level gates. A status is evidence of lifecycle completion, not proof that the implementation is correct.

### Child completion report

Every child must explicitly report when its concern is finished, blocked, or failed.
The report is a hand-back to the orchestrator, not a replacement for lifecycle state:

```text
Concern: <stable concern id>
State: done | blocked | failed
Result: <one-sentence outcome>
Changed paths: <paths or none>
Verification: <commands and observed results>
Assumptions/risks: <none or explicit items>
```

Keep that report in the agent's response when it is short. If the result or logs are
too large for a reliable response, have the child write the complete report to a
run-specific temporary Markdown file and reply with only its path. Read that file
after the agent settles, verify the paths and evidence independently, and include
the concise result in the parent synthesis. A temp report is private coordination
state; it is not a durable plan, issue draft, or public GitHub issue body.

For a multi-pane run, maintain a short `team-brief.md` beside the prompt and report
files in the run-specific temporary directory. Update it as concerns settle with
one line per concern: state, outcome, changed paths, verification, and blockers.
Use the brief for the main pane's synthesis; keep detailed logs and child reports in
their panes or temporary files. The brief is a coordination summary only and must
not be mistaken for an issue draft or publication approval.


## Completion and synthesis

Do not synthesize from assumptions. For each concern, record:

- final Herdr state
- plan and implementation result
- affected paths
- verification evidence
- unresolved risks or honest gaps

Then report:

```markdown
## Completed

### <concern>
- State: done
- Deliverables: <paths>
- Verification: <evidence>
- Risks: <none or explicit risk>

## Cross-Concern Decisions
- <layout, dependency, or interface decisions>

## Verification
- <commands and observed outcomes>

## Remaining Risks / Follow-ups
- <only real unresolved items>
```

Never mark a concern complete because a prompt was sent. Never claim a whole layout is complete while a required concern is still working, blocked, failed, or unverified.

## Safety and approval boundaries

Proceed autonomously for ordinary layout creation, prompt-file generation, agent startup, and status polling. Ask before destructive actions, closing user-owned Herdr state, permission changes, new dependencies, or materially ambiguous layout choices with different user-visible consequences. Do not commit or open PRs unless the surrounding workflow explicitly requires it.
