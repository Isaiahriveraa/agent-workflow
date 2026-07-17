# Monitoring, Review, and Recovery

## Default policy

Use approved configuration when present. Otherwise propose these defaults during the approval stage:

```yaml
monitoring:
  stall_threshold_minutes: 10
  repeated_failure_limit: 2
  automatic_recovery_limit: 2
  auto_continue_low_risk_actions: true
```

Do not silently choose capacity limits. The human approves:
```yaml
capacity:
  max_active_workers: 3
  max_prs_awaiting_human_review: 2
```

## Runtime state versus task state

Herdr runtime status answers: “What is the OMP process doing?”

Worker task status answers: “What phase is the issue in?”

Do not equate an idle/done process with a completed issue. Read output and verify Git evidence.

## State-aware supervision

Herdr statuses are authoritative runtime state: `idle`, `working`, `blocked`, `done`, `unknown`. Worker task status is separate and must not be inferred from pane idleness alone — a `working` agent may be computing, waiting for an API, or running sub-agents via the `task` tool.

### Check before message

The commander MUST:

1. Inspect authoritative Herdr status before sending any message to a worker (`herdr pane list` via the official skill).
2. Verify that the worker is genuinely stalled by checking pane output, Git diff/commit history, and the last task-state transition from `.herdr/state.yaml`.
3. Only message a `working` worker when specific, actionable information must be delivered (e.g. a dependency just merged, scope changed by human decision).

### No-repeated-nudge rule

- Never send repeated generic instructions ("continue", "are you stuck?", "status update") while Herdr reports `working`.
- A `working` worker that has produced output, commits, or task-state transitions within the configured `stall_threshold_minutes` is not stalled.
- Repeated nudges disrupt high-thinking models, waste context, and may interrupt a sub-agent mid-computation.

### Sub-agent patience

Workers using Luna 5.6 at high thinking regularly delegate sub-tasks to nested agents. The worker pane may show no new output for extended periods while sub-agents are actively computing.

**Patience rules:**

- Use the configured `stall_threshold_minutes` as the patience baseline. A `working` worker with activity within that window is progressing.
- Record `last_output_hash`, `last_commit`, and `last_task_state` in `.herdr/state.yaml` to enable evidence-based stall detection.
- Herdr `done` status for the parent pane signals completion of the entire worker task, including all sub-agents.
- When `done` arrives, collect the evidence normally.

## Event-driven monitoring

Prefer event-driven observation over polling loops:

- Use `herdr wait agent-status <pane> --status done` to block until a worker finishes a meaningful phase.
- Use `herdr wait output <pane> --match <pattern> --regex` to detect milestone log lines without polling.
- Run `herdr pane read <pane> --source recent --lines N` only after a wait completes or when the wait times out.

Fall back to periodic health checks when a worker is expected to make progress without a known completion event:

- Run `herdr pane list` at the configured `stall_threshold_minutes` interval.
- Compare the current pane output against the last known commit, diff, or task-state change.
- Store the last-observed-commit and last-output-hash in the runtime state to detect stalls.

**Critical: do not confuse a waiting commander with a stalled worker.**
A wait timeout (e.g., `herdr wait agent-status` returns no `done` within the timeout) does NOT mean the worker is stalled.
The worker and its sub-agents may still be actively working. Fall through to a state inspection (check Herdr status, pane output, Git activity) before taking any action.

Do not tight-loop poll Herdr. Each `pane read` or `pane list` call that returns no new information wastes tokens and Herdr resources.
## Blocker handling

Classify a blocker as one of:

- ordinary implementation friction
- missing permission or input
- hard dependency wait
- scope conflict
- architecture conflict
- runtime failure

For ordinary friction, send one precise investigation or correction.

For a real dependency, set `WAITING_ON_ISSUE` and continue other safe work.

Escalate only when the approved plan, scope, architecture, dependency graph, or destructive permissions must change.

## Stall handling

Treat an agent as stalled when there is no meaningful output, diff, commit, verification, or task-state transition beyond the stall threshold.

**A `working` Herdr status alone is NOT a stall indicator.** The worker or its sub-agents may be actively processing without producing visible pane output or Git activity. Only consider stall when ALL of the following are true:

- Herdr status has been `working` (or `idle` without completion) past the configured threshold.
- No new pane output since the last check (compare `last_output_hash`).
- No new Git diff or commit since the last check (compare `last_commit`).
- No task-state transition since the last check (compare `last_task_state`).

Awaiting a completion event (`agent-status --status done`) that times out is NOT evidence of a stall.
The agent or its sub-agents may still be working — inspect actual state before acting.

Do not spam generic "continue" messages. Inspect first, then send an evidence-based next action.

After two materially different failed approaches, escalate with:

- issue and current objective
- approaches attempted
- exact failure evidence
- current Git state
- recommended decision

## Automatic recovery

When OMP stops unexpectedly:

1. Invoke the official `herdr` skill.
2. Confirm the old process is gone.
3. Inspect worktree safety, current diff, last safe commit, and remote branch.
4. Reconstruct the scoped context packet with progress and exact next action.
5. Resume the native session when the official skill and installed OMP support it.
6. Otherwise start fresh OMP in the same branch/worktree.

Retry at most twice.

After two failures, set `RECOVERY_REQUIRED` and report:

- issue
- branch and worktree
- last safe commit
- uncommitted changes
- both recovery attempts
- recommended human action

Never loop indefinitely or launch a duplicate process.

## Worker review gate

A worker report must contain:

- exact pushed commit
- changed files
- criterion-to-evidence mapping
- exact verification commands and exit results
- scope confirmation
- remaining risks

Reject stale, partial, or unsupported evidence.

## Independent reviewer rules

A reviewer:

- receives fresh one-issue context
- reviews the exact pushed SHA
- inspects the complete diff
- independently reruns required checks
- reports file/line findings when possible
- may not edit tracked files, commit, push, redefine scope, or contact the worker directly

Reviewer outcomes:

```text
PASSED
CHANGES_REQUESTED
```

The commander validates findings and communicates with the original worker.

## Human review feedback

Human review comments return to the original worker as a consolidated checklist.

Every correction cycle requires:

- a new pushed SHA
- a fresh worker evidence report
- a fresh temporary reviewer
- independent verification at the new SHA

The commander never resolves comments merely from the worker’s claim.
