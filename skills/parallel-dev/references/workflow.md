# Parallel Development Workflow

## 1. Resolve and validate the plan

1. Use the explicit plan path when provided.
2. Otherwise locate the most relevant active implementation plan.
3. If several plans are plausible, require human selection.
4. Compare the chosen plan against the current repository.
5. Return incomplete or stale plans through `to-plan`.

Record plan path, revision, validation evidence, and unresolved assumptions.

## 2. Derive and validate issue drafts

Invoke `to-issues` with the validated plan.

Reject decompositions that:

- split by technical layer when no resulting PR is independently useful
- combine unrelated outcomes
- leave target behavior or acceptance criteria vague
- require workers to invent shared interfaces
- mark overlapping files/modules as concurrently safe without justification
- contain dependency cycles
- disagree across Markdown, YAML, and Mermaid

Prefer behavior-complete slices when they remain focused and reviewable.

## 3. Present the approval packet

For every issue show:

- title and stable local key
- why and target behavior
- scope and explicit non-goals
- acceptance criteria and verification
- dependencies and dependency reasons
- likely paths/modules and ownership collisions
- human owner
- execution mode
- execution wave

Also show:

- dependency graph
- ownership map
- `max_active_workers`
- `max_prs_awaiting_human_review`
- risks and approval boundary

## 4. Publish and initialize

After approval:

1. Invoke `to-issues` to publish only approved GitHub issues.
2. Promote the approved draft manifest according to
   `references/contracts.md#manifest-promotion`.  
    Record returned `github_issue` numbers and `github_url` after publication.
3. Assign approved human owners to GitHub issues.
4. Persist the committed manifest as `.herdr/manifest.yaml`.
5. Initialize `.herdr/state.yaml` and `.herdr/reports/`.
6. Ensure local runtime files are gitignored.

The agent never becomes the GitHub owner. The human owns the result.

## 5. Determine readiness

An issue becomes `READY` only when:

- every hard dependency is merged
- its files/modules are not locked by another active issue
- execution was approved
- worker capacity exists
- the human-review queue is below capacity

Possible orchestration states:

```text
READY
ACTIVE
WAITING_ON_ISSUE
VERIFYING
INDEPENDENT_REVIEW
CHANGES_REQUESTED
HUMAN_REVIEW
MERGED
RECOVERY_REQUIRED
DEFERRED
CANCELLED
```

The commander may use fewer workers than allowed but never more.

### Valid state transitions

```text
READY ──────────────→ ACTIVE
ACTIVE ─────────────→ WAITING_ON_ISSUE
ACTIVE ─────────────→ VERIFYING
ACTIVE ─────────────→ RECOVERY_REQUIRED     (after 2 failed recovery attempts)
WAITING_ON_ISSUE ───→ ACTIVE                (dependency merged)
VERIFYING ──────────→ INDEPENDENT_REVIEW
INDEPENDENT_REVIEW ─→ CHANGES_REQUESTED
INDEPENDENT_REVIEW ─→ HUMAN_REVIEW          (review passed)
CHANGES_REQUESTED ───→ VERIFYING             (worker pushes fix)
HUMAN_REVIEW ───────→ CHANGES_REQUESTED      (human requests changes)
HUMAN_REVIEW ───────→ MERGED                (terminal — human merges)
RECOVERY_REQUIRED ──→ ACTIVE                (human authorizes recovery)
RECOVERY_REQUIRED ──→ DEFERRED
RECOVERY_REQUIRED ──→ CANCELLED
DEFERRED ───────────→ READY                 (rescheduled)
CANCELLED ──────────→ (terminal)
MERGED ─────────────→ (terminal)
```

All transitions require the commander to update `.herdr/state.yaml`. Transitions not listed here are undefined; consult the human before attempting an unlisted transition.

## 6. Acquire ownership locks

Lock likely files and tightly coupled modules before launch.

If two ready issues overlap:

1. Reassess issue boundaries.
2. Add a dependency if sequential ownership is correct.
3. Return the decomposition to `to-issues` if boundaries are wrong.
4. Require explicit human approval for any overlap exception.

Workers never negotiate ownership changes privately.

## 7. Launch workers

### Workspace allocation

Before launching each worker, determine which workspace it belongs to:

1. List existing workspaces: `herdr workspace list`.
2. Identify worker workspaces (label matches `workers-N`).
3. Find one whose assigned worker count (tracked in `.herdr/state.yaml` workspaces
   entries) is below `workers_per_space`.
4. If none, create a new workspace:
   - `herdr workspace create --cwd <repo-root> --label "workers-<N>"`
   - Parse and record the returned `workspace_id` and `root_pane` from JSON.
5. Assign this issue to the selected workspace.
6. Record the workspace assignment: increment the workspace's `worker_count` in
   `.herdr/state.yaml`.

### Worker launch sequence

For each ready `herdr-agent` issue:

1. Invoke the official `herdr` skill.
2. Create one branch and isolated worktree from the approved base.
3. Identify the workspace pane for this worker:
   - First issue in a workspace: use the workspace's `root_pane` directly.
   - Subsequent issues: split a new pane from `root_pane`:
     `herdr pane split <root_pane> --direction right --no-focus`.
4. Start one OMP worker in the allocated pane, without stealing focus.
5. Record authoritative resource identifiers (workspace_id, pane_id, worktree_path)
   and session metadata in `.herdr/state.yaml` under the issue's `herdr_resources`.
6. Wait for readiness using the official skill.
7. Send the scoped worker context packet.
8. Mark the issue active and update the GitHub milestone state.

## 8. Supervise active workers

### State-aware supervision

Before messaging any worker, inspect the current authoritative Herdr runtime status via the official skill. Workers may be running sub-agents — a `working` status is never a reason to interrupt.

Intervene when:

- Herdr reports `blocked` or `unknown` — investigate immediately.
- Herdr reports `idle` past the configured `stall_threshold_minutes` with no completion — diagnose using pane output, Git diff/status/log, remote branch state, and structured reports.
- Herdr reports `done` — collect evidence (see Phase 6 / Worker review gate).
- the same failed approach repeats without meaningful variation.
- the worker exceeds scope.
- review evidence is incomplete.

**Do not intervene when:**

- Herdr reports `working`, even if prolonged. Workers and their sub-agents may be actively processing. Use the configured stall threshold against actual output/commit/state-change evidence, not pane idleness.
- No stall conditions are met. Sending generic "continue" or "status" messages during `working` wastes context and disrupts high-thinking models.

Send precise next instructions when intervention is warranted. Do not write the implementation fix.

### Periodic health checks

When no event-driven completion signal exists (e.g., OMP agent-status wait is unavailable for the current phase):

1. Run `herdr pane list` at the configured `stall_threshold_minutes` interval.
2. Compare current pane output, Git diff, and task state against the last-observed baseline stored in `.herdr/state.yaml`.
3. Record the new baseline after each check.
4. If no change across consecutive checks exceeding the threshold, apply stall handling.

Do not tight-loop poll. Each check must produce new information or confirm no change.

### Cross-workspace supervision

Workers may span multiple workspaces. The commander accesses any pane using its
global pane ID (`<workspace_id>-<pane_id>`) — all herdr operations accept it:

- `herdr pane read <global-pane-id>` — read output from any workspace.
- `herdr pane run <global-pane-id> <command>` — run commands in any workspace.
- `herdr pane send-keys <global-pane-id> <key>` — send keystrokes to any workspace.
- `herdr wait agent-status <global-pane-id> --status done` — block on completion
  regardless of workspace.

Cross-workspace communication always routes through the commander. When a
dependency worker finishes, the commander messages the dependent worker in its
own workspace. Workers never message across workspaces directly.
## 9. Handle discovered scope

When a worker discovers additional work:

1. Stop scope expansion.
2. Preserve the original issue contract.
3. Draft a new issue through `to-issues`.
4. Update the proposed dependency graph.
5. Require human approval.
6. Continue the original only when independently completable.

## 10. Evidence and independent review

Require a worker report at the exact pushed SHA.

Then:

1. Invoke the official `herdr` skill.
2. Create a clean temporary review checkout at that SHA.
3. Spawn a fresh reviewer.
4. Provide the issue contract, relevant plan, full diff, worker evidence, ownership rules, and verification commands.
5. Require independent reproduction.
6. Record the reviewer report.
7. Remove the temporary review environment safely.

## 11. Changes requested

When the reviewer or human requests changes:

1. Validate and consolidate findings.
2. Send the checklist to the original worker.
3. Keep the same issue, branch, worktree, and PR.
4. Require a fresh push and worker evidence.
5. Spawn a new independent reviewer.

Use a replacement worker only when the original session is unusable.

## 12. Draft PR

Open a draft PR only after every gate passes.

1. Navigate to the implementation worktree at the reviewed SHA.
2. Invoke `/pr` (`skill(pr-workflow)` `/pr`) to generate the PR description from
   the actual branch diff: inspect the diff against the base, determine
   size, and write the four standard sections (Summary, Why, Approach,
   Architecture and Contracts).
3. Append the augmented metadata supplement (see
   `references/contracts.md#draft-pr-generation`) — concise factual
   traceability and evidence that the branch diff alone does not cover.
4. Open the draft PR using `gh pr create --draft --body-file <pr-body-file>`.

The human alone approves and merges.
## 13. Merge and cleanup

After human merge:

1. Confirm the merged commit and issue linkage.
2. Mark the issue merged/done.
3. Close the issue when appropriate.
4. Stop worker and reviewer processes.
5. Remove temporary review worktrees.
6. Remove the implementation worktree only when Git says it is safe.
7. Release ownership locks.
8. Update state.
9. Start newly unblocked work within capacity.

Never force-remove dirty implementation work without human approval.
