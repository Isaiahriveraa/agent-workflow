---
name: orchestration
description: Plan and execute multi-workstream Herdr layouts across workspaces, tabs, and panes, with prompt files and status-only monitoring.
---

# Orchestration

Use this skill when a request contains multiple independent workstreams and Herdr can make the work easier to understand or execute. The main agent is the orchestrator; each delegated OMP agent owns exactly one concern.

## Core contract

- Inspect the entire request and build a flat concern map before creating anything.
- Run the preflight below before mutating Herdr state or dispatching agents.
- Never silently absorb unrelated concerns into one pane.
- Every child receives a focused prompt and follows the user's requested workflow exactly.
- Use temporary Markdown prompt and report files for substantial coordination; never treat them as durable plans or public issue bodies.
- Monitor lifecycle state with `herdr agent list` and `herdr agent wait`; do not repeatedly read pane transcripts. Read a pane only for `blocked`, `failed`, `unknown`, or a concrete diagnostic.
- Make panes visible and ensure they are always focused; never use `--no-focus` unless explicitly requested otherwise.
- Do not close or repurpose panes, tabs, or workspaces the orchestrator did not create.
- The orchestrator owns layout, dependencies, status, synthesis, and final verification. Children own their concerns and their invoked skills' policy.

## Preflight and modes

Before creation, write a short run manifest that answers:

- **Mode:** audit-only, Draft conversion, or Publication. If both audit and conversion are requested, audit must complete first; only that requested audit-completion barrier blocks conversion.
- **Authorization:** an explicit `/to-issues` Draft invocation authorizes local Draft conversion, including for Proposed or otherwise unapproved source plans. Preserve that source status as metadata such as `needs-review` or `blocked`; source approval is not a Draft prerequisite. Separate issue-set approval and publication authorization remain required for their respective actions.
- **Canonical sources:** list the exact source-plan paths and the source version/commit when relevant. Do not reconcile competing plans silently.
- **Durable output root:** record the exact expected path. On reruns, use the existing repository-local root under `context/plans/<slug>/issues/`; otherwise use the documented default, normally `context/plans/<slug>/issues/`, for the active repository/workflow. Never silently remap an existing root. `/to-issues` owns issue decomposition, drafts, and manifests.
- **Expected reports:** list every child report path and the required synthesis file, normally `team-brief.md` beside prompts and reports in the run directory.
- **Barriers:** state dependencies, the audit-completion barrier only when an audit was requested, the report/artifact barrier, and the separate issue-set approval and publication gates.

Audit work is read-only review and produces evidence for the next stage. `/to-issues` owns issue decomposition, draft content, manifests, and publication policy. Orchestration may dispatch either skill, but must not duplicate or override its policy. Publication is never implied by drafting and requires its own explicit authorization and workflow.

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

- **Workspace:** separate a genuinely independent context, repository, project, client, or user-visible initiative.
- **Tab:** group work sharing project context, lifecycle, dependency chain, or review audience.
- **Pane:** one independently reasoned concern, agent, service, command, or server.
- Use tabs without a new workspace when the current workspace already has the right context. Use current-tab panes for a small number of independent concerns.

Layout heuristics:

1. Minimize context switching, not pane count.
2. Keep related concerns in one tab without making status ambiguous.
3. Prefer one concern per pane; combine only tightly coupled steps with one owner and one acceptance contract.
4. Put parallel concerns at the same nesting level; represent dependencies in the plan.
5. For four or more concerns, do not create one unreadable horizontal row. Group by domain across tabs or use down splits, keeping each pane large enough for its work. Use a workspace only when the contexts are genuinely independent.
6. Name every workspace, tab, and pane with short stable kebab-case labels.
7. Always make newly created panes, tabs, and workspaces visible and focused (`--focus`); never use `--no-focus` unless explicitly requested.

## Pane splitting and creation

Split for independent concerns, different acceptance evidence, or separate lifecycle monitoring—not for every step. Do not split a short sequence, shared design decision, or dependent step that cannot begin until another pane produces an artifact.

Use the installed CLI syntax and returned opaque IDs:

```bash
herdr pane split --current \
  --direction right --ratio 0.5 --cwd "$PWD" --focus
```

Always make panes visible and keep them focused (`--focus`). Never use `--no-focus` unless explicitly instructed to do so. Use `--direction down` when horizontal columns would become too narrow, especially for four or more concerns. Set a different ratio only when one concern clearly needs more room. The command returns `.result.pane.pane_id`; use that exact ID for the next command. Never infer IDs from pane order, and never omit `--cwd "$PWD"` when creating a sibling pane.

Before each split, record the concern, owner, dependency, and acceptance evidence. Dispatch independent concerns concurrently; serialize only when a later concern consumes a finalized interface, schema, audit result, or artifact.

## Prompt files and dispatch

Create a run-specific temporary directory and manifest:

```text
/tmp/omp-orchestration/<run-id>/
├── manifest.md
├── concern-a.md
├── concern-b.md
└── reports/
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
<tests, files, runtime behavior, exact report path, and handoff required>
```

Start and prompt using returned IDs and stable names:

```bash
herdr agent start <stable-name> --kind omp --pane <returned-pane-id>
herdr agent prompt <stable-name> \
  "Read /tmp/omp-orchestration/<run-id>/<stable-name>.md, then invoke the assigned skill." \
  --wait
```

Prompt acceptance can briefly report stale `idle` even while startup is occurring. Confirm with a fresh `herdr agent list`; require observed `working` before treating dispatch as active. If it remains `idle`, inspect the declared handoff or targeted pane evidence rather than assuming failure. Never use prompt acceptance alone as completion evidence.

For issue-oriented work, orchestration coordinates but does not replace `/to-issues` or publish GitHub issues. Once the selected source plan is ready, `/to-issues` owns the exact durable drafts under the selected durable root recorded in preflight and the parent/child manifest. Child prompts may name a concern and expected draft path, but public issue content stays in the issue workflow. The orchestrator hands audit reports and the selected source path to `/to-issues`; it does not reinterpret them.

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

- `working`: active; do not interrupt or read output routinely.
- `idle` or `done`: settled lifecycle state; collect the required report and verify artifacts.
- `blocked`: record the exact blocker and resolve it safely or ask the user only when necessary.
- `failed`: record failure and inspect targeted diagnostics; do not label it a timeout.
- `unknown`: investigate with targeted pane/process inspection.
- `timeout`: completion was not observed within the wait window; distinguish it from failure and do not claim success.

Idle/done proves only that active work stopped. Status never proves correctness, artifact validity, tests, or approval. At settlement, verify declared deliverables and run parent-level gates.

### Fixed child completion report

Every child must provide this exact concise schema when finished, blocked, or failed, in its response or at the exact declared report path. Keep lifecycle state separate from source and issue-set status so the report can be handed to `/to-issues` without changing its meaning:

```text
Concern: <stable concern id>
State: done | blocked | failed
Result: <one sentence>
Source status: approved | proposed | needs-review | blocked | none
Issue-set status: draft | needs-review | blocked | none
Changed paths: <paths or none>
Verification: <commands and observed results, or not run with reason>
Assumptions/risks: <none or explicit items>
Handoff: <next agent, durable artifact path, or none>
```

If the report is too large for a reliable response, the child writes the complete report to its run-specific path and replies only with that path. After settlement, read the report and independently verify every declared path and evidence. Missing or malformed reports keep the concern unverified.

## Artifact barrier, completion, and synthesis

Do not synthesize until every required child is settled and every declared report exists and has been read. Then verify the barriers required by the selected mode: canonical source and exact durable output root always; audit completion only when an audit was requested; issue-set approval and publication authorization only for those actions. A prompt sent, an idle state, or a report alone never completes a concern.

For each concern, record:

- final Herdr state and whether it timed out or failed
- plan/implementation result
- affected paths and exact durable handoff paths
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

Never claim the whole layout is complete while a required concern is working, blocked, failed, timed out, missing its report, or unverified. Do not claim publication from a Draft run.

## Safety and approval boundaries

Proceed autonomously for ordinary layout creation, temporary prompt/report generation, agent startup, and status polling. Ask before destructive actions, closing user-owned Herdr state, permission changes, new dependencies, or materially ambiguous layouts with different user-visible consequences. Do not commit, open PRs, create GitHub issues, or publish unless the surrounding workflow explicitly requires it and its approval gate has passed.
