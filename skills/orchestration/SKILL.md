---
name: orchestration
description: Keep the main agent available for conversation while approved, bounded tasks run in background subagents or independent CLI sessions in isolated Herdr worktrees. Use when discussing background delegation, separate concerns, parallel panes, worker handoffs, or tracking delegated work. Assess and propose first; dispatch only after the user approves the assignment.
---

# Orchestration

The main agent remains the user's conversation partner and owns assessment, delegation, steering, review, and reporting. Workers own bounded assignments, not the conversation. A single side task is enough; do not require a multi-agent team or force delegation for work better done directly.

## Agree before dispatch

1. Clarify the observable outcome, scope, dependencies, risks, and completion evidence with the user.
2. Recommend direct work, a background subagent, or an isolated CLI worker using the table below. Show a short assignment proposal: goal, allowed changes, non-goals, owner/runtime, location/base commit, checks, and report destination. For panes, include the layout.
3. Wait for the user's green light for that specific assignment (or an explicitly approved batch). An instruction such as “yes, run that search fix in another pane” counts; general enthusiasm, plan approval, or invoking this skill does not authorize unspecified workers.
4. Dispatch only the approved scope. Ask again before adding workers, changing concerns, or moving into a new stage. Steer within the approved acceptance criteria without requesting approval for every mechanical step.
5. Return control to the user after dispatch. Say what is running and where to track it; do not hold the conversation open waiting for completion.

| Route | Fit | Boundary |
| --- | --- | --- |
| Direct | Unclear behavior, shared decision, or trivial work where dispatch costs more than it saves | Keep discussing or execute as authorized |
| Background subagent | A bounded question, check, or task within the active concern | Use the host's asynchronous subagent facility and retain its session/task ID; no overlapping writers |
| Isolated CLI worker | An independent concern that can run without current uncommitted changes | Separate branch, worktree, Herdr pane, and CLI session |

Subagents that edit code must also obey repository worktree rules. Give a same-concern writer exclusive ownership of its allowed files while active; the main agent and other workers do not edit them concurrently. If the host has no asynchronous subagent support, disclose that and propose another route instead of claiming background execution.

## Isolate independent concerns

Read the `herdr` skill before controlling Herdr and enforce its `HERDR_ENV=1` preflight. Without Herdr, discussion and supported background subagents remain possible, but do not control external panes.

Inspect raw Git status and worktree inventory. Choose and record an explicit committed starting point that actually supports the assignment; do not assume `HEAD` excludes unrelated committed work. If the task needs current dirty changes or an unfinished contract, it is not independent: wait, narrow it to read-only research, or obtain approval for a dependency-aware sequence. Never stash, reset, copy dirty changes, or commit them just to make dispatch possible.

Create an approved concern's worktree with the existing helper, run from its repository:

```bash
bash ~/.agents/scripts/new-worktree.sh <type/concern> <approved-start-point>
```

Use the returned absolute worktree directory as the worker pane's cwd. Keep the coordinator's cwd and pane unchanged. Check for shared databases, ports, generated files, and other external resources: separate worktrees do not isolate them. Serialize conflicting work or agree on separate resources.

Use the user's requested installed CLI kind. Otherwise propose one supported by the installed `herdr agent` help; OMP is not mandatory. Do not install dependencies or change permissions to make a worker start without approval.

## Core contract

- Inspect the entire request and build a flat concern map before creating anything.
- Run the preflight below before mutating Herdr state or dispatching agents.
- Never silently absorb unrelated concerns into one pane.
- Every child receives a focused prompt and follows the user's requested workflow exactly.
- Keep assignment briefs, progress logs, reports, and the run manifest at the durable coordination root below. They are not plans, public issue bodies, or a second ticket backlog.
- Monitor lifecycle state with `herdr agent list` and `herdr agent wait`; do not repeatedly read pane transcripts. Read a pane only for `blocked`, `failed`, `unknown`, or a concrete diagnostic.
- Keep the user's focus in the coordinator pane. Use `--no-focus` for background workers unless the user asks to switch.
- Do not close or repurpose panes, tabs, or workspaces the orchestrator did not create.
- The orchestrator owns layout, dependencies, status, synthesis, and final verification. Children own their concerns and their invoked skills' policy.

## Preflight and modes

Before creation, write a short run manifest that answers:

- **Mode:** research, implementation, verification, audit-only, Draft conversion, or Publication. If both audit and conversion are requested, audit must complete first; only that requested audit-completion barrier blocks conversion.
- **Authorization:** record the user's approved assignment, route, and limits. An explicit `/to-issues` Draft invocation authorizes local ticket drafting from a design brief, not arbitrary worker dispatch. Preserve source gaps as `needs-review` or `blocked`; a technical plan is not a prerequisite. Separate ticket-set review and publication authorization remain required for their respective actions.
- **Source paths:** list the exact design brief, selected ticket, or approved plan paths and source version/commit when relevant. Do not reconcile competing artifacts silently.
- **Durable output root:** record the exact expected path. Design briefs live under `context/designs/`, issue drafts under `context/issues/`, and just-in-time plans under `context/plans/`. Never silently remap an existing root. `/to-issues` owns ticket drafts and publication; `/plan` owns the technical plan for one selected ticket.
- **Expected reports:** list every child report path and the required synthesis file, normally `team-brief.md` beside prompts and reports in the run directory.
- **Barriers:** state dependencies, the audit-completion barrier only when an audit was requested, the report/artifact barrier, and the separate issue-set approval and publication gates.

Audit work is read-only review and produces evidence for the next stage. `/to-issues` owns behavior-ticket drafts and publication policy; `/plan` plans one selected ticket after it exists. Orchestration may dispatch either skill, but must not duplicate or override its policy. Publication is never implied by drafting and requires its own explicit authorization and workflow.

For delivery work, read `~/.agents/references/workflow.md` and select candidates from the owning ticket index after reconciling live evidence. Its status is authoritative; the run manifest records ownership, not a second backlog. A ready candidate is only provisionally parallel: recheck shared files, public contracts, migrations, and integration order before dispatch. Each independent delivery concern owns its branch/worktree/PR; consumers of unfinished contracts wait. Do not pre-plan every eligible candidate.

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
7. Keep background workers unfocused (`--no-focus`); preserve the coordinator as the user's conversation pane. Switch only at the user's request.

## Pane splitting and creation

Split for independent concerns, different acceptance evidence, or separate lifecycle monitoring—not for every step. Do not split a short sequence, shared design decision, or dependent step that cannot begin until another pane produces an artifact.

Use the installed CLI syntax and returned opaque IDs:

```bash
herdr pane split --current \
  --direction right --ratio 0.5 --cwd "$WORKTREE_DIR" --no-focus
```

Set `WORKTREE_DIR` to the verified absolute worker worktree path. Use `--direction down` when horizontal columns would become too narrow, especially for four or more concerns. Set a different ratio only when one concern clearly needs more room. The command returns `.result.pane.pane_id`; use that exact ID for the next command. Never infer IDs from pane order, and never omit the explicit worker cwd.

Before each split, record the concern, owner, dependency, and acceptance evidence. Dispatch independent concerns concurrently; serialize only when a later concern consumes a finalized interface, schema, audit result, or artifact.

## Prompt files and dispatch

Use the repository's established coordination location if one exists; otherwise create `context/orchestration/<run-id>/` in the coordinator checkout. Resolve it to an absolute path accessible to workers in other worktrees. Keep secrets and unrelated conversation out of these files. Do not commit runtime logs by default.

```text
context/orchestration/<run-id>/
├── manifest.md
├── status.md
├── concern-a.md
├── concern-b.md
├── logs/
└── reports/
```

Each concern file must contain the following contract, plus the approved starting commit, absolute worktree path, worker identity, applicable repository instructions, required checks, and any relevant source excerpts. Workers cannot assume access to this conversation. Record the coordinator identity and absolute report/log destinations. Preserve restricted inputs and output formats of specialist review roles.

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

## Progress and completion
Append timestamped meaningful updates to <absolute logs/concern-a.md>: started,
important findings, checks and outcomes, blockers, and ready for review. Do not
dump every command or hidden reasoning. Write the final report before signaling
completion; include changed paths, checks, risks, and the next decision needed.
Do not expand scope, spawn additional workers, commit, publish, merge, or delete
worktrees without the corresponding approval. Wait for further instructions.
```

Start and prompt using returned IDs and stable names:

```bash
herdr agent start <stable-name> --kind <approved-kind> --pane <returned-pane-id>
herdr agent prompt <stable-name> \
  "Read <absolute-run-directory>/<stable-name>.md, then carry out only that approved assignment."
```

Check the installed CLI help before using these commands. Omit `--wait` on prompt submission so the coordinator does not block for the worker's whole turn. Prompt acceptance can briefly report stale `idle` during startup. Confirm with a fresh `herdr agent list`; require observed `working` before treating dispatch as active. If it remains `idle`, inspect the declared handoff or targeted pane evidence rather than assuming failure. Never use prompt acceptance alone as completion evidence. Save returned worker and pane IDs in the manifest.

## Progress, notifications, and availability

The coordinator owns `status.md`: a compact board with each assignment's goal,
route, worker/session/pane ID, branch/worktree/base, coordination state, latest
update, log/report links, and next action. Each worker owns only its own log and
report. Use proposed, working, blocked, failed, ready-for-review, and verified as
coordination states; the ticket index remains authoritative for delivery state.
Show the board's absolute path after dispatch. A status request reads this board,
logs, and lifecycle state, not every terminal transcript.

Use native asynchronous subagent completion events when available. For CLI
workers, discover `herdr notification` and `herdr agent` syntax first. The
installed notification command can show a user-visible notice, for example:

```bash
herdr notification show "Search fix ready for review" \
  --body "Report: <absolute-report-path>" --sound done
```

Have the worker write its report first, then send the notice with its task ID,
state, and report path. Notifications are hints, not proof of completion. A Herdr
toast does not inject a message into the coordinator's model context or wake an
idle agent. Do not claim automatic agent-to-agent delivery from this command.

If the coordinator's host supports background shell jobs with completion events,
it may run a bounded `herdr agent wait <worker> --timeout 120000` watcher through
that facility after startup is confirmed, then collect the report on its completion
event. Do not run that wait in the foreground or repeatedly poll while the user
is talking. A watcher timeout is not worker failure. Without a verified event
route, say that the notice alerts the user and the coordinator collects results
on the next user turn or requested status check; do not pretend to monitor while
idle. Never send unsolicited prompt text into the coordinator's busy terminal.

Resolve in-scope worker questions with focused follow-up prompts when the worker
is ready for input. A changed acceptance criterion, a new concern, or a permission
dialog needs the user's decision. Record steering decisions in the manifest.

For issue-oriented work, orchestration coordinates but does not replace `/to-issues` or publish GitHub issues. `/to-issues` turns a design brief into local behavior-ticket drafts; after a ticket is selected, `/plan` writes its technical plan. Child prompts may name a concern and expected draft path, but public issue content stays in the issue workflow. The orchestrator hands audit reports and the selected source path to the owning skill; it does not reinterpret them or plan the full backlog in advance.

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
# Only in a host-managed background watcher or when the user requests a wait:
herdr agent wait <agent-name> --until idle --timeout 120000
```

Interpret states as follows:

- `working`: active; do not interrupt or read output routinely.
- `idle` or `done`: settled lifecycle state; collect the required report and verify artifacts.
- `blocked`: record the exact blocker and resolve it safely or ask the user only when necessary.
- `failed`: record failure and inspect targeted diagnostics; do not label it a timeout.
- `unknown`: investigate with targeted pane/process inspection.
- `timeout`: completion was not observed within the wait window; distinguish it from failure and do not claim success.

Idle/done proves only that active work stopped. Status never proves correctness, artifact validity, tests, or approval. Mark a reported result ready-for-review, read its report and actual diff, verify scope and acceptance evidence in its worktree, and run parent-level gates before marking it verified. Keep independently completed concerns visible even while other workers remain active.

### Fixed child completion report

Every child must provide this exact concise schema when finished, blocked, or failed, in its response or at the exact declared report path. Keep lifecycle state separate from source and issue-set status so the report can be handed to `/to-issues` without changing its meaning. Copy the owning artifact's status as-is; never translate it into a second execution state:

```text
Concern: <stable concern id>
State: done | blocked | failed
Result: <one sentence>
Source status: <the owning artifact's actual status, or none>
Issue-set status: draft | needs-review | blocked | none
Changed paths: <paths or none>
Verification: <commands and observed results, or not run with reason>
Assumptions/risks: <none or explicit items>
Handoff: <next agent, durable artifact path, or none>
```

If the report is too large for a reliable response, the child writes the complete report to its run-specific path and replies only with that path. After settlement, read the report and independently verify every declared path and evidence. Missing or malformed reports keep the concern unverified.

## Artifact barrier, completion, and synthesis

Do not synthesize until every required child is settled and every declared report exists and has been read. Then verify the barriers required by the selected mode: source artifact and exact durable output root always; audit completion only when an audit was requested; issue-set approval and publication authorization only for those actions. A prompt sent, an idle state, or a report alone never completes a concern.

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

Assess and propose freely, but create layout/worktrees and start agents only after the assignment approval above. Execution approval is not integration approval: leave worker branches, worktrees, and panes intact after review; do not auto-merge, cherry-pick, commit, publish, or clean up. Ask before destructive actions, closing user-owned Herdr state, permission changes, new dependencies, or materially ambiguous layouts. Follow the existing commit, PR, issue, and worktree-cleanup skills and their approval gates when those later actions are authorized.
