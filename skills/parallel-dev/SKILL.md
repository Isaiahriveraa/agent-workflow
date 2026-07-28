---
name: parallel-dev
description: Execute validated implementation plans through focused GitHub issues, isolated worktrees, Herdr-managed OMP worker panes that run a boss protocol (spawn → subagent-implementation-review → worker diff-review gate → commit → pr-workflow), STATUS progress messages back to the commander, and human-approved draft PRs. Use when the user explicitly wants issue-driven parallel development or asks to execute a plan through multiple agents.
---

# Parallel Development Commander

## Purpose

Coordinate safe parallel software delivery without implementing feature code.

```text
validated plan → approved issues → isolated workers
               → boss protocol (per worker) → commander verification
               → draft PRs → human merge
```

`parallel-dev` owns orchestration decisions.
`to-plan` owns implementation planning.
`to-issues` owns issue decomposition.
The official `herdr` skill owns pane, worktree, process, and OMP runtime operations.
`spawn`, `subagent-implementation-review`, `commit`, and `pr-workflow` are the worker sub-skills.

## Hard boundaries

### You may

- Find and validate an implementation plan.
- Decompose the plan into focused issues and publish them to GitHub after human approval.
- Plan workspace and worker allocation within approved capacity.
- Spawn per-issue worker panes via the official `herdr` skill and the approval-time `worker_model` / `worker_thinking`.
- Send the worker context packet (issue, plan slices, ownership, verification, boss protocol) and the commander's pane id.
- Inspect Herdr runtime state, parse worker STATUS messages, and surface them to the user.
- Verify the worker's evidence at the exact pushed SHA in a clean temporary checkout.
- Send a `VERIFICATION_PASSED` handshake to the worker pane so it can run the PR workflow.
- Diagnose blockers and send precise corrections.
- Detect human merges, clean safe runtime resources, and unlock dependents.

### You must never

- Edit implementation code, application tests, migrations, or dependencies.
- Spawn a separate "independent reviewer" pane. The worker's boss loop is the quality gate.
- Open a draft PR yourself. The worker pane owns `gh pr create --draft` so the SHA, branch, and worktree stay aligned.
- Approve, merge, or push to a base branch.
- Re-implement a worker's diff. Send a checklist; let the worker fix.
- Advance to `COMMITTING` while any acceptance criterion is unmet or
  while the cumulative `git diff <base>...HEAD` has not been verified
  against every acceptance criterion in the worker context packet.

## Ownership model

```text
Commander:   plan validation, approval gate, runtime delegation,
             STATUS supervision, commander verification, human-merge detection
Worker pane: boss protocol (spawn → subagent-implementation-review → commit
             → pr-workflow), STATUS messages to commander, draft PR creation
Human:       issue approval, PR review, and merge authority
Herdr:       pane and OMP runtime control
```

The commander is the user's current OMP session. It is not a separate pane; it supervises worker panes from its own context. Each worker pane runs the boss protocol as one OMP agent that delegates to in-model sub-agents via the `task` tool.

### Branch naming convention

Workers create exactly one branch per approved issue. The branch name MUST
follow standard software-engineering conventions:

- Default form: `issue-<github_issue_number>-<kebab-slug-from-title>`,
  e.g. `issue-142-session-contract`.
- Repo override: if the repository already uses a documented convention
  (e.g. `feat/<slug>`, `fix/<slug>`, `chore/<slug>`), follow that and
  record the rule in `.herdr/manifest.yaml` under
  `branch_naming.convention` plus an example.
- Forbidden prefixes: never use `parallel/`, `parallel-dev/`, or any
  prefix derived from the orchestration skill. Branch names MUST signal
  the issue, not the tool that produced them.
- The branch name is fixed at issue allocation, recorded in
  `.herdr/manifest.yaml` and `.herdr/state.yaml`, and passed verbatim
  to the worker via the worker context packet.

## Core invariant

```text
The commander owns orchestration and verification; the worker owns implementation
and the draft PR. Quality lives in each worker's boss loop. The commander never
opens a PR on unverified work and never re-implements a worker's diff.
```

Optimize for maximum **safe** parallelism, not the maximum number of active agents.

## Required references

Read only what the current phase needs:

- `references/workflow.md` — full lifecycle, worker launch, boss protocol, supervision, draft PR.
- `references/contracts.md` — approval packet, committed manifest, worker context packet (boss protocol), STATUS message schema, VERIFICATION_PASSED handshake, evidence report, commander verification report.
- `references/integrations.md` — herdr CLI recipes (cross-pane messaging for STATUS and VERIFICATION_PASSED), `omp` spawn recipe with approval-time model.
- `references/review-recovery.md` — boss protocol, STATUS message handling, VERIFICATION_PASSED handshake, blocker/stall/recovery.

## Entry behavior

Accept either:

- an explicit plan path, or
- an existing plan-server plan URL.

If multiple plausible plans exist, present the candidates and require the human to select one before issue generation. Do not begin from a rough feature request; route that through `to-plan` first.

## Phase 1 — Validate the plan

A plan passes only when it:

- matches the current repository state
- defines locked architecture decisions
- enumerates likely files and ownership boundaries
- declares verification commands
- predicts likely file or tightly coupled module overlap
- supports focused, independently reviewable PR boundaries

If any requirement fails, invoke `to-plan` to revise the plan. Do not invent missing implementation details.

## Phase 2 — Derive local issue drafts

Invoke `to-issues` with the validated plan.

Required output:

1. Human-readable Markdown issue drafts.
2. Machine-readable YAML execution manifest.
3. Mermaid dependency / parallelism graph.
4. Drafts only; no GitHub mutation.

The YAML manifest is authoritative. Reject the result if Markdown, YAML, and Mermaid disagree.

## Phase 3 — Human approval gate

Before publishing anything, show one complete approval packet containing:

- plan reference and validation result
- all issue drafts
- human owner for each issue
- execution mode: `herdr-agent`, `human`, or `unassigned`
- dependency graph and execution waves
- file/module ownership map
- capacity limits (workers_per_space, max_active_workers, max_prs_awaiting_human_review)
- **`models` block** (see below) — explicitly prompt the user for these fields
- collision risks and unresolved assumptions
- exact actions the approval authorizes

The `models` block:

```yaml
models:
  worker_model: openai-codex/gpt-5.6-luna
  worker_thinking: high
```

The skill explicitly prompts the user for `worker_model` and `worker_thinking` before publishing anything. Defaults shown; user may override. The commander is the user's current OMP session and is not a model-choice field — there is no `commander_model` in the packet.

Nothing is published or launched until the human approves this packet.

## Phase 4 — Initialize execution

After approval:

- invoke `to-issues` to publish only approved issues
- promote the draft manifest to the committed manifest (see `references/contracts.md` — Manifest promotion), including the `models` block
- assign approved human owners
- persist the committed manifest, initialize runtime state and reports
- apply team-facing status labels
- launch only dependency-ready, ownership-safe issues within capacity

Default project state layout:

```text
.herdr/
├── manifest.yaml          # approved execution contract; committed
├── state.yaml             # local runtime state; gitignored
└── reports/               # local worker evidence; gitignored
```

Ensure `.herdr/state.yaml` and `.herdr/reports/` are ignored.

### Workspace capacity plan

Include `workers_per_space` in the approval packet's capacity block (default 3).
During initialization, plan the workspace layout: for N approved `herdr-agent` issues,
calculate the required workspace count: `ceil(N / workers_per_space)`.
Each workspace gets a numeric label (`workers-1`, `workers-2`, ...) and `--cwd` set to
the repository root. Record each workspace in `.herdr/state.yaml` under the
`workspaces` key with its capacity.

## Phase 5 — Runtime delegation

Before creating, inspecting, messaging, waiting on, restarting, or removing any Herdr resource:

1. Invoke the official `herdr` skill.
2. Follow its current installed instructions.
3. Treat returned IDs, paths, process data, and statuses as authoritative.
4. Never reconstruct or guess Herdr commands or identifiers.

Each worker receives a scoped context packet containing the issue, relevant plan sections, locked architecture decisions, ownership boundaries, merged dependencies, acceptance criteria, verification commands, Git permissions, the boss protocol, the commander's pane id, and stop conditions. The packet schema lives in `references/contracts.md`.

### Worker launch

Spawn each worker with the approval-time model and thinking:

```bash
herdr pane run "$NEW_PANE" "omp --model $WORKER_MODEL --thinking $WORKER_THINKING"
sleep 10
herdr pane run "$NEW_PANE" "<worker context packet>"
herdr pane send-keys "$NEW_PANE" Enter
```

Record `workspace_id`, `pane_id`, `issue_key`, and `commander_pane_id` in the worker's `herdr_resources` and in `.herdr/state.yaml`.

### Workspace-aware worker allocation

Before spawning a worker, determine its workspace:

1. List existing workspaces via `herdr workspace list`.
2. Filter to workspaces whose label matches `workers-N` (parallel-dev worker spaces).
3. Find the first workspace with fewer than `workers_per_space` workers assigned to it
   in `.herdr/state.yaml`.
4. If none exists, create a new workspace:
   - `herdr workspace create --cwd <repo-root> --label "workers-<N>"`
   - Parse and record the returned `workspace_id` and `root_pane` from the JSON response.
5. Assign this issue to the selected workspace.
6. Use the workspace's root pane for the first worker, or split a new pane from it for
   subsequent workers.
7. Record `workspace_id`, `pane_id`, and `commander_pane_id` in the issue's `herdr_resources`.

Workers never create or manage workspaces. The commander owns workspace lifecycle.

## Phase 6 — Supervision and evidence

Herdr runtime state and worker task state are separate.

- Herdr reports runtime conditions such as `working`, `idle`, `blocked`, `done`, or `unknown` according to the installed integration.
- Workers report meaningful task states via STATUS messages in the canonical phase order below.

### State-aware patience

Herdr statuses are authoritative runtime state: `idle`, `working`, `blocked`, `done`, `unknown`.
Worker task status is separate and must not be inferred from pane idleness alone — a `working` agent may be computing, waiting for an API, or running sub-agents.

**Before messaging any worker:**

1. Inspect current Herdr status via the official skill (`herdr pane list`).
2. If status is `working`, check for recent evidence of activity: read pane output since last check, compare last-observed Git diff/commit against current state.
3. Check the last worker STATUS phase recorded in `.herdr/state.yaml`.

**When to message:**

- `blocked` — investigate immediately; the worker needs input to proceed.
- `idle` past the configured `stall_threshold_minutes` without completion — diagnose.
- `done` — collect evidence (pane output, Git activity, worker report).
- `unknown` — investigate immediately.

**When NOT to message:**

- A `working` status alone is never sufficient reason to send generic instructions.
- Do not send repeated "continue", "status update", or progress nudges while Herdr reports `working`.
- Do not interpret prolonged `working` as a stall unless no output, diff, or task-state transition occurred within the threshold.

### STATUS message handling

Workers emit single-line STATUS messages to the commander's pane using herdr cross-pane messaging:

```bash
herdr pane send-text "$COMMANDER_PANE_ID" "STATUS <issue_key> <phase> <pushed_sha_or_dash> <one_line_summary>"
herdr pane send-keys "$COMMANDER_PANE_ID" Enter
```

Phases, in the canonical order the worker transitions through them:

- `IMPLEMENTING` — sub-agents active
- `BOSS_REVIEW` — running `subagent-implementation-review` on sub-agent output
- `CHANGES_REQUESTED` — boss review or the worker diff-review gate
  found defects; the worker is re-delegating to sub-agents and will
  continue to do so until every sub-agent returns `ready` and every
  acceptance criterion is verified against the diff. The loop has no
  cap. The worker MUST NOT advance to `COMMITTING` while any sub-agent
  review is `changes-required`, `blocked-awaiting-human`, or any
  acceptance criterion is unmet.
- `COMMITTING` — running the `commit` skill for atomic commits
- `VERIFYING` — running checks (lint, test, typecheck) on the committed tree
- `READY_FOR_REVIEW` — branch pushed, awaiting commander verification
- `DRAFT_PR_OPENED` — `gh pr create --draft` succeeded
- `DONE` — terminal, evidence report follows

`BLOCKED` is orthogonal: a worker can emit `STATUS <key> BLOCKED <sha-or-dash> <reason>` from any phase when it hits a destructive, irreversible, or materially ambiguous decision.

**Commander response per phase:**

- `IMPLEMENTING`, `BOSS_REVIEW`, `CHANGES_REQUESTED`, `COMMITTING`, `VERIFYING`, `DRAFT_PR_OPENED` — record, surface to user, no action.
- `READY_FOR_REVIEW` — trigger Phase 7 commander verification.
- `BLOCKED` — investigate immediately, surface blocker reason, decide whether to unblock or escalate.
- `DONE` — collect final evidence report, mark terminal.

The commander never sends a STATUS line for a worker; only the worker emits STATUS for its own issue.

### VERIFICATION_PASSED handshake (commander → worker)

After Phase 7 commander verification passes, the commander sends a single message to the worker pane to gate Phase 8. Without this handshake, the worker stays idle at `READY_FOR_REVIEW` and never starts the PR workflow.

```bash
herdr pane send-text "$WORKER_PANE_ID" "VERIFICATION_PASSED. Proceed to PR: run skill(pr-workflow) /pr from the implementation worktree at $VERIFIED_SHA, then gh pr create --draft --base <base> --head <branch> --title <title> --body-file <body>, then send STATUS <key> DRAFT_PR_OPENED <sha> <pr_url> to me."
herdr pane send-keys "$WORKER_PANE_ID" Enter
```

The handshake names the exact verified SHA so the PR head and the verified commit are guaranteed to match.

### Sub-agent awareness

Workers using Luna 5.6 at high thinking regularly delegate sub-tasks to nested agents via the `task` tool.
Herdr reports the parent worker as `working` throughout, even when sub-agents are doing the visible work.
The commander MUST:

- Allow extended quiet periods. Sub-agents may run for minutes without producing pane output.
- Use the configured `stall_threshold_minutes` as the patience baseline — a `working` worker that has produced output within the threshold is not stalled.
- Avoid messaging a worker that is `working` with sub-agents active; an interrupt during sub-agent computation wastes the work already done.
- Record `last_output_hash`, `last_commit`, and `last_status_phase` in `.herdr/state.yaml` to detect genuine stalls.
- A worker emitting `STATUS <key> CHANGES_REQUESTED` is iterating with its sub-agents. Do not interrupt; allow extended quiet periods.

Herdr `done` status for the parent pane signals completion of the entire worker task.
A worker is verifiable only after it:

- commits and pushes its assigned branch
- identifies the exact pushed SHA
- maps evidence to every acceptance criterion
- reports exact verification commands and results
- confirms scope and forbidden-path compliance
- states remaining risks
- includes a `boss_review_summary` in its evidence report

Unsupported claims such as "should pass" or "appears complete" are rejected.

### Cross-workspace supervision

Workers may be distributed across multiple herdr workspaces. The commander
supervises all workers regardless of workspace:

- **Global pane addressing**: Pane IDs returned by herdr are globally unique
  (`<workspace_id>-<pane_id>`). All `herdr pane read`, `herdr pane run`,
  `herdr pane send-keys`, and `herdr wait` operations work across workspaces
  using these global IDs.
- **Workspace discovery**: Run `herdr workspace list` and cross-reference with
  `.herdr/state.yaml` to enumerate active workspaces and their worker counts.
- **Cross-workspace messaging**: All inter-worker communication routes through
  the commander. When a dependency merges in one workspace, the commander
  notifies the dependent worker in its workspace. Workers never directly message
  workers in other workspaces.
- **Cleanup**: After all workers in a workspace complete, close the workspace:
  `herdr workspace close <workspace_id>` — but only after verifying all work
  in that workspace is fully collected and no panes have pending output.

## Phase 7 — Commander verification

The commander verifies the worker's evidence but does NOT spawn a separate reviewer. The worker's boss loop is the quality gate. Procedure:

1. The worker has reported `STATUS <key> READY_FOR_REVIEW <sha> <summary>` and pushed the branch at that SHA.
2. Create a clean temporary checkout at the exact pushed SHA through the official Herdr workflow.
3. Re-run the worker's verification commands from the issue contract.
4. Inspect the diff for scope compliance (no out-of-scope files, no forbidden paths).
5. Inspect the evidence report (criterion-to-evidence mapping, exact verification exit codes, file list, scope confirmation, `boss_review_summary`).
6. **If verification passes and evidence is complete:** send the `VERIFICATION_PASSED` handshake to the worker pane (see Phase 6 — `VERIFICATION_PASSED handshake`). The commander then waits for the worker to emit `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>`. Without the handshake, the worker stays idle at `READY_FOR_REVIEW` and never starts the PR workflow.
7. **If verification fails or evidence is incomplete:** send a precise checklist back to the worker pane via `herdr pane send-text` + Enter. Do NOT write code. Wait for the worker's next STATUS.

The commander never opens a draft PR on unverified work. The commander never re-implements a worker's diff. The worker pane is the only place that runs `gh pr create --draft` — this keeps the SHA, branch, and worktree aligned with the implementation.

## Phase 8 — Draft PR and human merge

Open a draft PR only when:

- worker evidence is complete
- the exact pushed SHA was commander-verified
- the `VERIFICATION_PASSED` handshake was sent
- required checks were reproduced successfully
- acceptance criteria pass
- scope is clean
- no blocking finding remains
- human-review queue capacity exists

When all gates pass, the worker pane (not the commander) executes the PR workflow:

1. The worker navigates to the implementation worktree at the verified SHA.
2. The worker invokes `skill(pr-workflow)` `/pr` inside the worktree to generate the
   PR description from the actual branch diff.
3. The worker appends the augmented metadata supplement (see
   `references/contracts.md#draft-pr-generation`).
4. The worker opens the draft PR via `gh pr create --draft --base <base> --head <branch> --title <title> --body-file <body>`.
5. The worker sends `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>` to the commander.

The commander records the PR URL, surfaces to the user, and applies the `status:human-review` label. The commander never opens a draft PR itself; the worker pane owns the call so the SHA, branch, and worktree stay aligned.

The commander never approves or merges. Human review feedback returns to the original worker as a consolidated checklist, followed by fresh worker evidence and a fresh commander verification cycle.

After the human merges, detect the merge, close/update the issue, clean safe runtime resources, release ownership locks, update state, and launch newly unblocked work within capacity.

## Completion standard

The workflow is complete only when:

- every approved issue is merged, intentionally deferred, reassigned, or explicitly cancelled
- every merged PR passed worker boss review and commander verification
- no unresolved ownership lock or active worker remains
- runtime cleanup is safe and complete
- remaining risks and deferred work are clearly reported

Never claim success based only on agent status. Report evidence.
