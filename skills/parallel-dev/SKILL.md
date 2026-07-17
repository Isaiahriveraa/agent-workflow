---
name: parallel-dev
description: Execute validated implementation plans through focused GitHub issues, isolated worktrees, Herdr-managed OMP workers, independent review, and human-approved PRs. Use when the user explicitly wants issue-driven parallel development or asks to execute a plan through multiple agents.
---

# Parallel Development Commander

## Purpose

Coordinate safe parallel software delivery without implementing feature code.

```text
validated plan → approved issues → isolated workers
               → independent review → draft PRs → human merge
```

`parallel-dev` owns orchestration decisions.
`to-plan` owns implementation planning.
`to-issues` owns issue decomposition.
The official `herdr` skill owns pane, worktree, process, and OMP runtime operations.

## Hard boundaries

### You may

- Find and validate an implementation plan.
- Invoke `to-plan` when the plan is missing, stale, or incomplete.
- Invoke `to-issues` to derive issue drafts and the execution manifest.
- Present the complete issue set for human approval.
- Invoke `to-issues` to publish only approved GitHub issues.
- Assign approved human owners and execution modes.
- Maintain orchestration metadata and reports.
- Schedule dependency-ready work within approved capacity.
- Use the official `herdr` skill to create and supervise OMP workers.
- Diagnose blockers and send precise corrections.
- Spawn fresh independent reviewers.
- Open and update draft PRs after evidence gates pass.
- Detect human merges, clean runtime resources, and unlock dependents.

### You must never

- Edit implementation code, application tests, migrations, or dependencies.
- Derive issues directly from a vague request when no validated plan exists.
- Publish issues before the human approves the complete breakdown.
- Expand issue scope or change architecture without renewed approval.
- Allow concurrent ownership of the same file or tightly coupled module by default.
- Trust a worker’s completion claim without independent reproduction.
- Approve or merge a feature PR.
- Copy or guess Herdr CLI behavior. Invoke the official `herdr` skill first.

## Ownership model

```text
Commander: orchestration and control plane
Worker:    implementation for one approved issue
Reviewer:  independent diagnosis and verification
Human:     issue approval, PR review, and merge authority
Herdr:     pane and OMP runtime control
```

## Core invariant

```text
one issue = one focused outcome = one human owner
          = one worktree = one branch = one OMP worker = one PR
```

Optimize for maximum **safe** parallelism, not the maximum number of active agents.

## Required references

Read only what the current phase needs:

- `references/workflow.md` — full lifecycle and scheduling rules.
- `references/integrations.md` — contracts with `to-plan`, `to-issues`, GitHub, and the official `herdr` skill.
- `references/contracts.md` — manifests, context packets, reports, and PR generation.
- `references/review-recovery.md` — monitoring, blocker handling, independent review, and recovery.

## Entry behavior

Accept either:

- an explicit plan path, or
- a clear reference to the current implementation plan.

If multiple plausible plans exist, present the candidates and require the human to select one before issue generation. Do not begin from a rough feature request; route that through `to-plan` first.

## Phase 1 — Validate the plan

A plan passes only when it:

- matches the current repository state
- defines current and target behavior
- identifies architecture, affected modules, interfaces, and data flow
- identifies verification and testing strategy
- includes dependency order and integration gates
- distinguishes parallelizable and sequential work
- predicts likely file or tightly coupled module overlap
- supports focused, independently reviewable PR boundaries

If any requirement fails, invoke `to-plan` to revise the plan. Do not invent missing implementation details.

## Phase 2 — Derive local issue drafts

Invoke `to-issues` with the validated plan.

Required output:

1. Human-readable Markdown issue drafts.
2. A machine-readable YAML execution manifest.
3. A Mermaid dependency and parallelism graph.
4. File/module ownership and collision analysis.
5. Recommended execution waves.
6. Drafts only; no GitHub mutation.

The YAML manifest is authoritative. Reject the result if Markdown, YAML, and Mermaid disagree.

## Phase 3 — Human approval gate

Before publishing anything, show one complete approval packet containing:

- plan reference and validation result
- all issue drafts
- human owner for each issue
- execution mode: `herdr-agent`, `human`, or `unassigned`
- dependency graph and execution waves
- file/module ownership map
- capacity limits
- collision risks and unresolved assumptions
- exact actions the approval authorizes

Nothing is published or launched until the human approves this packet.

## Phase 4 — Initialize execution

After approval:

- invoke `to-issues` to publish only approved issues
- promote the draft manifest to the committed manifest (see `references/contracts.md` — Manifest promotion)
- assign approved human owners
- persist the committed manifest, initialize runtime state and reports
- apply team-facing status labels
- launch only dependency-ready, ownership-safe issues within capacity

Default project state layout:

```text
.herdr/
├── manifest.yaml          # approved execution contract; committed
├── state.yaml             # local runtime state; gitignored
└── reports/               # local worker/reviewer evidence; gitignored
```

Ensure `.herdr/state.yaml` and `.herdr/reports/` are ignored.

## Phase 5 — Runtime delegation

Before creating, inspecting, messaging, waiting on, restarting, or removing any Herdr resource:

1. Invoke the official `herdr` skill.
2. Follow its current installed instructions.
3. Treat returned IDs, paths, process data, and statuses as authoritative.
4. Never reconstruct or guess Herdr commands or identifiers.

Each worker receives a scoped context packet containing only its issue, relevant plan sections, locked architecture decisions, ownership boundaries, merged dependencies, acceptance criteria, verification commands, Git permissions, reporting contract, and stop conditions.

## Phase 6 — Supervision and evidence

Herdr runtime state and worker task state are separate.

- Herdr reports runtime conditions such as working, idle, blocked, done, or unknown according to the installed integration.
- Workers report meaningful task states such as `IMPLEMENTING`, `VERIFYING`, `READY_FOR_REVIEW`, and `CHANGES_REQUESTED`.

### State-aware patience

Herdr statuses are authoritative runtime state: `idle`, `working`, `blocked`, `done`, `unknown`.
Worker task status is separate and must not be inferred from pane idleness alone — a `working` agent may be computing, waiting for an API, or running sub-agents.

**Before messaging any worker:**

1. Inspect current Herdr status via the official skill (`herdr pane list`).
2. If status is `working`, check for recent evidence of activity: read pane output since last check, compare last-observed Git diff/commit against current state.
3. Check the last worker task-state transition recorded in `.herdr/state.yaml`.

**When to message:**

- `blocked` — investigate immediately; the worker needs input to proceed.
- `idle` past the configured `stall_threshold_minutes` without completion — diagnose.
- `done` — collect evidence (pane output, Git activity, worker report).
- `unknown` — investigate immediately.

**When NOT to message:**

- A `working` status alone is never sufficient reason to send generic instructions.
- Do not send repeated "continue", "status update", or progress nudges while Herdr reports `working`.
- Do not interpret prolonged `working` as a stall unless no output, diff, or task-state transition occurred within the threshold.

### Sub-agent awareness

Workers using Luna 5.6 at high thinking regularly delegate sub-tasks to nested agents via the `task` tool.
Herdr reports the parent worker as `working` throughout, even when sub-agents are doing the visible work.
The commander MUST:

- Allow extended quiet periods. Sub-agents may run for minutes without producing pane output.
- Use the configured `stall_threshold_minutes` as the patience baseline — a `working` worker that has produced output within the threshold is not stalled.
- Avoid messaging a worker that is `working` with sub-agents active; an interrupt during sub-agent computation wastes the work already done.
- Record `last_output_hash`, `last_commit`, and `last_task_state` in `.herdr/state.yaml` to detect genuine stalls.
Herdr `done` status for the parent pane signals completion of the entire worker task.
A worker is reviewable only after it:

- commits and pushes its assigned branch
- identifies the exact pushed SHA
- maps evidence to every acceptance criterion
- reports exact verification commands and results
- confirms scope and forbidden-path compliance
- states remaining risks

Unsupported claims such as “should pass” or “appears complete” are rejected.

## Phase 7 — Independent review

For every review cycle:

- create a clean temporary checkout at the exact pushed SHA through the official Herdr workflow
- spawn a fresh reviewer with one-issue context
- forbid tracked edits, commits, and pushes
- inspect the full diff
- independently rerun required verification
- record `PASSED` or `CHANGES_REQUESTED`
- destroy the temporary reviewer environment after recording the report

When changes are required, route a concise checklist to the original worker. A later review cycle always uses a fresh reviewer.

## Phase 8 — Draft PR and human merge

Open a draft PR only when:

- worker evidence is complete
- the exact pushed SHA was independently reviewed
- required checks were reproduced successfully
- acceptance criteria pass
- scope is clean
- no blocking finding remains
- human-review queue capacity exists

When all gates pass:

1. Navigate to the implementation worktree at the reviewed SHA.
2. Invoke `skill(pr-workflow)` `/pr` inside the worktree to generate the
   PR description from the actual branch diff.
3. Append the augmented metadata supplement (see
   `references/contracts.md#draft-pr-generation`).
4. Open the draft PR using the official Herdr workflow.

The commander never approves or merges. Human review feedback returns to the original worker, followed by fresh worker evidence and a fresh independent review.

After the human merges, detect the merge, close/update the issue, clean safe runtime resources, release ownership locks, update state, and launch newly unblocked work within capacity.
## Completion standard

The workflow is complete only when:

- every approved issue is merged, intentionally deferred, reassigned, or explicitly cancelled
- every merged PR passed worker and independent verification
- no unresolved ownership lock or active worker remains
- runtime cleanup is safe and complete
- remaining risks and deferred work are clearly reported

Never claim success based only on agent status. Report evidence.
