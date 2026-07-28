# Parallel Development Workflow

## 1. Resolve and validate the plan

1. Use the explicit plan path when provided.
2. If only a plan-server URL is given, read the root MDX and every concern file referenced in it.
3. If the plan is rough, route the request through `to-plan` first; do not invent missing implementation details.
4. Verify that the plan matches the current repository state, has locked architecture decisions, and declares verification commands.

Record plan path, revision, validation evidence, and unresolved assumptions.

## 2. Derive and validate issue drafts

Invoke `to-issues` with the validated plan.

Reject decompositions that:

- split by technical layer when no resulting PR is independently useful
- merge unrelated concerns into one PR for convenience
- produce issues whose acceptance criteria cannot be objectively verified
- introduce undeclared ownership overlap on likely files

Prefer behavior-complete slices when they remain focused and reviewable.

## 3. Present the approval packet

For every issue show:

- title and stable local key
- why the issue exists
- acceptance criteria (binary, reviewer-checkable)
- ownership map (likely files and tightly coupled modules)
- verification commands
- dependencies and execution wave
- execution mode (`herdr-agent`, `human`, or `unassigned`)
- capacity footprint (workers used, PR slots consumed)

Also show:

- dependency graph
- ownership map
- `max_active_workers`
- `max_prs_awaiting_human_review`
- `models` block (see below)
- risks and approval boundary

The `models` block:

```yaml
models:
  worker_model: openai-codex/gpt-5.6-luna
  worker_thinking: high
```

The skill explicitly prompts the user for `worker_model` and `worker_thinking` before publishing. Defaults shown; user may override. The commander is the user's current OMP session and is not a model-choice field — there is no `commander_model` in the packet.

## 4. Publish and initialize

After approval:

1. Invoke `to-issues` to publish only approved GitHub issues.
2. Promote the draft manifest to the committed manifest (see `references/contracts.md` — Manifest promotion), including the `models` block.
3. Initialize `.herdr/state.yaml` and `.herdr/reports/`.
4. Apply team-facing status labels.
5. Acquire ownership locks for likely files and tightly coupled modules.

The agent never becomes the GitHub owner. The human owns the result.

## 5. Determine readiness

An issue becomes `READY` only when:

- every hard dependency is merged
- capacity is available (workers and human-review slots)
- ownership is non-overlapping
- the issue is approved

Possible orchestration states:

```text
READY
ACTIVE
WAITING_ON_ISSUE
VERIFYING
CHANGES_REQUESTED
HUMAN_REVIEW
RECOVERY_REQUIRED
DEFERRED
CANCELLED
MERGED
```

The commander may use fewer workers than allowed but never more.

### Valid state transitions

```text
READY ──────────────→ ACTIVE
ACTIVE ─────────────→ WAITING_ON_ISSUE
ACTIVE ─────────────→ VERIFYING
ACTIVE ─────────────→ RECOVERY_REQUIRED     (after 2 failed recovery attempts)
WAITING_ON_ISSUE ───→ ACTIVE                (dependency merged)
VERIFYING ──────────→ CHANGES_REQUESTED
VERIFYING ──────────→ HUMAN_REVIEW          (commander verification passed, worker opened draft PR)
CHANGES_REQUESTED ───→ VERIFYING             (worker pushes fix and emits a new READY_FOR_REVIEW STATUS)
HUMAN_REVIEW ───────→ CHANGES_REQUESTED      (human requests changes)
HUMAN_REVIEW ───────→ MERGED                (terminal — human merges)
RECOVERY_REQUIRED ──→ ACTIVE                (human authorizes recovery)
RECOVERY_REQUIRED ──→ DEFERRED
RECOVERY_REQUIRED ──→ CANCELLED
DEFERRED ───────────→ READY                 (rescheduled)
CANCELLED ──────────→ (terminal)
MERGED ─────────────→ (terminal)
```

There is no `INDEPENDENT_REVIEW` state. The worker's boss loop is the quality gate; the commander runs the verification pass.

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
1a. Resolve the branch name using the `branch_naming` block from
    `.herdr/manifest.yaml` (default `issue-<n>-<slug>`, or the repo
    override). Record it on the issue's `herdr_resources` and in
    `.herdr/state.yaml` before any `git checkout -b` runs.
2. Create one branch and isolated worktree from the approved base.
3. Identify the workspace pane for this worker:
   - First issue in a workspace: use the workspace's `root_pane` directly.
   - Subsequent issues: split a new pane from `root_pane`:
     `herdr pane split <root_pane> --direction right --no-focus`.
4. Launch the OMP worker with the approval-time model and thinking:
   ```bash
   herdr pane run "$NEW_PANE" "omp --model $WORKER_MODEL --thinking $WORKER_THINKING"
   sleep 10
   ```
5. Send the worker context packet (see `references/contracts.md#worker-context-packet`),
   including the boss protocol and `commander_pane_id`:
   ```bash
   herdr pane run "$NEW_PANE" "<worker context packet>"
   herdr pane send-keys "$NEW_PANE" Enter
   ```
6. Record authoritative resource identifiers (`workspace_id`, `pane_id`, `worktree_path`,
   `commander_pane_id`, `worker_model`, `worker_thinking`) in `.herdr/state.yaml`
   under the issue's `herdr_resources`.
7. Mark the issue active and update the GitHub milestone state.

### Boss protocol

After launch, the worker pane runs the boss protocol autonomously. The commander does not orchestrate the worker's internal sub-skill sequence; it only sends the `VERIFICATION_PASSED` handshake after the worker reports `READY_FOR_REVIEW`.

The worker's mandated sub-skill sequence:

1. `skill(name="spawn")` — decompose the issue into atomic sub-tasks, write 7-section prompts.
2. `task` tool — delegate each sub-task to an in-model sub-agent with a full 7-section prompt (TASK, EXPECTED OUTPUT, CONTEXT, CODEBASE CONVENTIONS, MUST DO, MUST NOT DO, DONE WHEN).
3. `skill(name="subagent-implementation-review")` — review each sub-agent's output.
3a. Worker diff-review gate — after every sub-agent passes
    `subagent-implementation-review`, run `git diff <base>...HEAD`
    and verify the cumulative diff against every
    `acceptance_criteria` from the worker context packet. Re-delegate
    any unmet criterion before committing. Never advance to commit
    while a criterion is unmet.
4. If review reports `changes-required` or `blocked-awaiting-human`, re-delegate with the correction instructions.
5. `skill(name="commit")` — atomic commits, one logical change per commit, no `and` in subject lines.
6. Push the branch.
7. Wait for the commander's `VERIFICATION_PASSED` handshake before continuing.
8. `skill(name="pr-workflow") /pr` — generate the PR description from the diff.
9. `gh pr create --draft --base <base> --head <branch> --title <title> --body-file <body>`.
10. Send `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>` to the commander.

The worker does not stop until a draft PR is open or it emits `STATUS <key> BLOCKED <sha-or-dash> <reason>`.

## 8. Supervise active workers

### State-aware supervision

Before messaging any worker, inspect the current authoritative Herdr runtime status via the official skill. Workers may be running sub-agents — a `working` status is never a reason to interrupt.

Intervene when:

- Herdr reports `blocked` or `unknown` — investigate immediately.
- Herdr reports `idle` past the configured `stall_threshold_minutes` with no completion — diagnose using pane output, Git diff/status/log, remote branch state, and structured reports.
- Herdr reports `done` — collect evidence (see `references/review-recovery.md#worker-evidence-gate`).
- the same failed approach repeats without meaningful variation.
- the worker exceeds scope.
- worker evidence is incomplete.

**Do not intervene when:**

- Herdr reports `working`, even if prolonged. Workers and their sub-agents may be actively processing. Use the configured stall threshold against actual output/commit/state-change evidence, not pane idleness.
- No stall conditions are met. Sending generic "continue" or "status" messages during `working` wastes context and disrupts high-thinking models.

Send precise next instructions when intervention is warranted. Do not write the implementation fix.

### STATUS message handling

Workers emit single-line STATUS messages to the commander's pane:

```bash
herdr pane send-text "$COMMANDER_PANE_ID" "STATUS <issue_key> <phase> <pushed_sha_or_dash> <one_line_summary>"
herdr pane send-keys "$COMMANDER_PANE_ID" Enter
```

The commander parses STATUS lines from its own pane output and surfaces each to the user in chat.

Phases, in the canonical order the worker transitions through them:

- `IMPLEMENTING` — sub-agents active
- `BOSS_REVIEW` — running `subagent-implementation-review` on sub-agent output
- `CHANGES_REQUESTED` — boss review found defects, re-delegating to sub-agents (loops back)
- `COMMITTING` — running the `commit` skill for atomic commits
- `VERIFYING` — running checks (lint, test, typecheck) on the committed tree
- `READY_FOR_REVIEW` — branch pushed, awaiting commander verification
- `DRAFT_PR_OPENED` — `gh pr create --draft` succeeded
- `DONE` — terminal, evidence report follows

`BLOCKED` is orthogonal: a worker can emit `STATUS <key> BLOCKED <sha-or-dash> <reason>` from any phase when it hits a destructive, irreversible, or materially ambiguous decision.

**Commander response per phase:**

- `IMPLEMENTING`, `BOSS_REVIEW`, `CHANGES_REQUESTED`, `COMMITTING`, `VERIFYING`, `DRAFT_PR_OPENED` — record, surface to user, no action.
- `READY_FOR_REVIEW` — trigger Section 10 commander verification.
- `BLOCKED` — investigate immediately, surface blocker reason, decide whether to unblock or escalate.
- `DONE` — collect final evidence report, mark terminal.

If a worker's output is not a recognized STATUS line, do not assume a phase. Continue supervising; the next STATUS line will clarify.

### VERIFICATION_PASSED handshake (commander → worker)

After Section 10 commander verification passes, the commander sends this single message to the worker pane to gate Section 12 (draft PR):

```bash
herdr pane send-text "$WORKER_PANE_ID" "VERIFICATION_PASSED. Proceed to PR: run skill(pr-workflow) /pr from the implementation worktree at $VERIFIED_SHA, then gh pr create --draft --base <base> --head <branch> --title <title> --body-file <body>, then send STATUS <key> DRAFT_PR_OPENED <sha> <pr_url> to me."
herdr pane send-keys "$WORKER_PANE_ID" Enter
```

The worker remains idle at `READY_FOR_REVIEW` until this handshake arrives. The handshake names the exact verified SHA so the PR head and the verified commit are guaranteed to match.

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
- `herdr pane send-text <global-pane-id> "..."` — send text without Enter to any workspace.
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

## 10. Evidence and commander verification

The worker has reported `STATUS <key> READY_FOR_REVIEW <sha> <summary>` and pushed the branch at that SHA. The commander verifies the worker's evidence; it does NOT spawn a separate reviewer. The worker's boss loop is the quality gate.

Procedure:

1. Invoke the official `herdr` skill.
2. Create a clean temporary checkout at the exact pushed SHA.
3. Re-run the worker's verification commands from the issue contract.
4. Inspect the full diff for scope compliance (no out-of-scope files, no forbidden paths).
5. Inspect the worker's evidence report: criterion-to-evidence mapping, exact verification exit codes, file list, scope confirmation, and `boss_review_summary`.
6. Record the result in a `commander_verification_report` (see `references/contracts.md#commander-verification-report`).
7. If verification passes and evidence is complete: send the `VERIFICATION_PASSED` handshake to the worker pane (see Section 8 — `VERIFICATION_PASSED handshake`). The commander then waits for the worker to emit `STATUS <key> DRAFT_PR_OPENED`.
8. If verification fails or evidence is incomplete: send a precise checklist back to the worker pane via `herdr pane send-text` + Enter. Do NOT write code. Wait for the worker's next STATUS.

The commander never opens a draft PR on unverified work. The commander never re-implements a worker's diff. The worker pane is the only place that runs `gh pr create --draft` — this keeps the SHA, branch, and worktree aligned with the implementation.

## 11. Changes requested

When verification or the human reviewer requests changes:

1. Validate and consolidate findings.
2. Send the checklist to the original worker via `herdr pane send-text` + Enter.
3. Keep the same issue, branch, worktree, and PR.
4. Require a fresh push and a new `STATUS <key> READY_FOR_REVIEW <new_sha> <summary>`.
5. Re-run Section 10 commander verification at the new SHA.

Use a replacement worker only when the original session is unusable. Do not spawn a reviewer; the commander runs the next verification pass.

## 12. Draft PR

Open a draft PR only after Section 10 commander verification passes AND the `VERIFICATION_PASSED` handshake is sent. The worker pane (not the commander) executes the PR workflow:

1. The worker navigates to the implementation worktree at the verified SHA.
2. The worker invokes `/pr` (`skill(pr-workflow)` `/pr`) to generate the PR description from
   the actual branch diff: inspect the diff against the base, determine
   size, and write the four standard sections (Summary, Why, Approach,
   Architecture and Contracts).
3. The worker appends the augmented metadata supplement (see
   `references/contracts.md#draft-pr-generation`) — concise factual
   traceability and evidence that the branch diff alone does not cover.
4. The worker opens the draft PR using `gh pr create --draft --base <base> --head <branch> --title <title> --body-file <body>`.
5. The worker sends `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>` to the commander.
6. The commander records the PR URL, surfaces to the user, and applies the `status:human-review` label.

The commander never opens a draft PR itself; the worker pane owns the call so the SHA, branch, and worktree stay aligned.

The human alone approves and merges.

## 13. Merge and cleanup

After human merge:

1. Confirm the merged commit and issue linkage.
2. Mark the issue merged/done.
3. Close the issue when appropriate.
4. Stop worker processes.
5. Remove any temporary verification checkouts.
6. Remove the implementation worktree only when Git says it is safe.
7. Release ownership locks.
8. Update state.
9. Start newly unblocked work within capacity.

Never force-remove dirty implementation work without human approval.
