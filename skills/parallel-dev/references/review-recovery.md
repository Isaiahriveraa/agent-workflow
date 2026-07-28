# Monitoring, Boss Protocol, STATUS Handling, and Recovery

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
models:
  worker_model: openai-codex/gpt-5.6-luna
  worker_thinking: high
```

The commander is the user's current OMP session and is not a model-choice field.

## Runtime state versus task state

Herdr runtime status answers: "What is the OMP process doing?"

Worker task status answers: "What phase is the issue in?" — communicated via STATUS messages (see "STATUS message handling" below).

Do not equate an idle/done process with a completed issue. Read output and verify Git evidence.

## State-aware supervision

Herdr statuses are authoritative runtime state: `idle`, `working`, `blocked`, `done`, `unknown`. Worker task status is separate and must not be inferred from pane idleness alone — a `working` agent may be computing, waiting for an API, or running sub-agents via the `task` tool.

### Check before message

The commander MUST:

1. Inspect authoritative Herdr status before sending any message to a worker (`herdr pane list` via the official skill).
2. Verify that the worker is genuinely stalled by checking pane output, Git diff/commit history, and the last STATUS phase recorded in `.herdr/state.yaml`.
3. Only message a `working` worker when specific, actionable information must be delivered (e.g. a dependency just merged, scope changed by human decision).

### No-repeated-nudge rule

- Never send repeated generic instructions ("continue", "are you stuck?", "status update") while Herdr reports `working`.
- A `working` worker that has produced output, commits, or STATUS transitions within the configured `stall_threshold_minutes` is not stalled.
- Repeated nudges disrupt high-thinking models, waste context, and may interrupt a sub-agent mid-computation.

### Sub-agent patience

Workers using Luna 5.6 at high thinking regularly delegate sub-tasks to nested agents. The worker pane may show no new output for extended periods while sub-agents are actively computing.

**Patience rules:**

- Use the configured `stall_threshold_minutes` as the patience baseline. A `working` worker with activity within that window is progressing.
- Record `last_output_hash`, `last_commit`, and `last_status_phase` in `.herdr/state.yaml` to enable evidence-based stall detection.
- Herdr `done` status for the parent pane signals completion of the entire worker task, including all sub-agents.
- A worker emitting `STATUS <key> CHANGES_REQUESTED` is iterating with its sub-agents. Do not interrupt; allow extended quiet periods.
- When `done` arrives, collect the evidence normally.

## Event-driven monitoring

Prefer event-driven observation over polling loops:

- Use `herdr wait agent-status <pane> --status done` to block until a worker finishes a meaningful phase.
- Use `herdr wait output <pane> --match <pattern> --regex` to detect milestone log lines without polling.
- Run `herdr pane read <pane> --source recent --lines N` only after a wait completes or when the wait times out.

Fall back to periodic health checks when a worker is expected to make progress without a known completion event:

- Run `herdr pane list` at the configured `stall_threshold_minutes` interval.
- Compare the current pane output against the last known commit, diff, or STATUS transition.
- Store the last-observed-commit, last-status-phase, and last-output-hash in the runtime state to detect stalls.

**Critical: do not confuse a waiting commander with a stalled worker.**
A wait timeout (e.g., `herdr wait agent-status` returns no `done` within the timeout) does NOT mean the worker is stalled.
The worker and its sub-agents may still be actively working. Fall through to a state inspection (check Herdr status, pane output, Git activity, last STATUS phase) before taking any action.

Do not tight-loop poll Herdr. Each `pane read` or `pane list` call that returns no new information wastes tokens and Herdr resources.

## Boss protocol

Each worker pane runs the boss protocol in its own OMP session. The commander does not orchestrate the worker's internal sub-skill sequence; it only sends the `VERIFICATION_PASSED` handshake after the worker reports `READY_FOR_REVIEW`.

The worker's mandated sub-skill sequence:

1. `skill(name="spawn")` — decompose the issue into atomic sub-tasks, write a full 7-section prompt for each (TASK, EXPECTED OUTPUT, CONTEXT, CODEBASE CONVENTIONS, MUST DO, MUST NOT DO, DONE WHEN).
2. `task` tool — delegate each sub-task to an in-model sub-agent. Pass the 7-section prompt as the sub-agent's task. The sub-agent has the full context to execute independently.
3. `skill(name="subagent-implementation-review")` — review each sub-agent's output against the issue's acceptance criteria, architecture rules, and BERP/AGENTS.md standards.
4. If review reports `changes-required` or `blocked-awaiting-human`, re-delegate with the correction instructions. Do not edit the file yourself unless the sub-agent's work is so small that re-delegation is more expensive.
5. `skill(name="commit")` — atomic commits, one logical change per commit, no `and` in subject lines.
6. Push the branch. Record the exact pushed SHA.
7. Send `STATUS <key> READY_FOR_REVIEW <sha> <one-line>` to the commander pane and **wait** for the `VERIFICATION_PASSED` handshake.
8. After the handshake arrives, navigate to the implementation worktree at the verified SHA named in the handshake.
9. `skill(name="pr-workflow") /pr` — generate the PR description from the actual branch diff.
10. `gh pr create --draft --base <base> --head <branch> --title <title> --body-file <body>` — open the draft PR.
11. Send `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>` to the commander.

The worker does not stop until a draft PR is open or it emits `STATUS <key> BLOCKED <sha-or-dash> <reason>`. The boss protocol is the quality gate — the commander does not spawn a separate reviewer pane. In-model self-review is intentional; the commander runs a final verification pass on the worker's evidence and re-runs the worker's verification commands but does not re-implement the worker's diff.
The CHANGES_REQUESTED phase is not transient. Every iteration where a
sub-agent review reports `changes-required` or
`blocked-awaiting-human`, or where the worker diff-review gate finds
an unmet acceptance criterion, the worker emits
`STATUS <key> CHANGES_REQUESTED <sha> <reason>` and re-delegates.
There is no iteration cap. The worker MUST NOT proceed to `commit` or
`pr-workflow` while any sub-agent review is unresolved or any
acceptance criterion is unmet. Trivial fixes (typos, single-line
edits) may be made directly; any change that affects behavior is sent
back to a sub-agent.

## Worker diff review gate

After every sub-agent implementation returns `ready` from
`subagent-implementation-review`, the worker pane MUST inspect the
cumulative `git diff <base>...HEAD` against every `acceptance_criteria`
in the worker context packet. The diff review is the worker pane's own
gate between review and commit; it is not the commander's verification.

For each acceptance criterion, the worker records one row in
`diff_review.criterion_evidence` inside the worker evidence report:

- `criterion` — the exact text from `acceptance_criteria`.
- `evidence` — file path, line range, or command output that proves
  the criterion is met.
- `verified_at` — ISO-8601 timestamp of the verification.

If any criterion is unmet, the worker emits
`STATUS <key> CHANGES_REQUESTED <sha> <criterion-id unmet>` and
re-delegates the precise correction to a sub-agent. The worker does
NOT advance to `COMMITTING` until `diff_review.criterion_evidence`
contains one row per acceptance criterion and every row is marked
verified. Direct edits by the worker are allowed only for trivial
fixes (typos, single-line). Anything that touches behavior goes back
to a sub-agent.

## STATUS message handling

Workers emit single-line STATUS messages to the commander's pane via herdr cross-pane messaging:

```bash
herdr pane send-text "$commander_pane_id" "STATUS <issue_key> <phase> <pushed_sha_or_dash> <one_line_summary>"
herdr pane send-keys "$commander_pane_id" Enter
```

The commander parses STATUS lines from its own pane output and surfaces each to the user in chat. The latest phase is recorded in `.herdr/state.yaml` per worker.

### Phases and commander response

Phases, in the canonical order the worker transitions through them:

- `IMPLEMENTING` — sub-agents active. Record, surface to user, no action.
- `BOSS_REVIEW` — running `subagent-implementation-review` on sub-agent output. Record, surface to user, no action.
- `CHANGES_REQUESTED` — boss review found defects, re-delegating to sub-agents. Record; worker is iterating with sub-agents, do not interrupt.
- `COMMITTING` — running the `commit` skill for atomic commits. Record, surface to user, no action.
- `VERIFYING` — running checks (lint, test, typecheck) on the committed tree. Record, surface to user, no action.
- `READY_FOR_REVIEW` — branch pushed, awaiting commander verification. Trigger commander verification (Section 10 of workflow.md).
- `DRAFT_PR_OPENED` — `gh pr create --draft` succeeded. Record PR URL, apply `status:human-review` label, surface to user.
- `DONE` — terminal. Collect final evidence report, mark terminal.

`BLOCKED` is orthogonal: a worker can emit `STATUS <key> BLOCKED <sha-or-dash> <reason>` from any phase when it hits a destructive, irreversible, or materially ambiguous decision. On `BLOCKED`, investigate immediately, surface the blocker reason to the user, and decide whether to unblock or escalate.

### Parse failure

If a worker's output is not a recognized STATUS line, do not assume a phase. Continue supervising; the next STATUS line will clarify. Reject any non-conforming output that claims task-state transitions.

## VERIFICATION_PASSED handshake (commander → worker)

After commander verification passes, the commander sends this single message to the worker pane to gate the worker's PR workflow. **Without this handshake, the worker stays idle at `READY_FOR_REVIEW` forever.**

Exact message format:

```
VERIFICATION_PASSED. Proceed to PR: run skill(pr-workflow) /pr from the
implementation worktree at <verified_sha>, then gh pr create --draft
--base <base> --head <branch> --title <title> --body-file <body>, then
send STATUS <key> DRAFT_PR_OPENED <sha> <pr_url> to me.
```

Transport:

```bash
herdr pane send-text "$WORKER_PANE_ID" "<message>"
herdr pane send-keys "$WORKER_PANE_ID" Enter
```

The handshake names the exact verified SHA so the PR head and the verified commit are guaranteed to match. The handshake is the gate between commander verification and the worker's PR workflow. Do not skip it.

## Blocker handling

Classify a blocker as one of:

- ordinary implementation friction
- missing permission or input
- hard dependency wait
- scope conflict
- architecture conflict
- runtime failure
- worker emitted `STATUS <key> BLOCKED` — treat as a blocker that needs human input

For ordinary friction, send one precise investigation or correction.

For a real dependency, set `WAITING_ON_ISSUE` and continue other safe work.

Escalate only when the approved plan, scope, architecture, dependency graph, or destructive permissions must change.

## Stall handling

Treat an agent as stalled when there is no meaningful output, diff, commit, verification, or STATUS transition beyond the stall threshold.

**A `working` Herdr status alone is NOT a stall indicator.** The worker or its sub-agents may be actively processing without producing visible pane output or Git activity. Only consider stall when ALL of the following are true:

- Herdr status has been `working` (or `idle` without completion) past the configured threshold.
- No new pane output since the last check (compare `last_output_hash`).
- No new Git diff or commit since the last check (compare `last_commit`).
- No STATUS transition since the last check (compare `last_status_phase`).

A `STATUS <key> CHANGES_REQUESTED` followed by quiet pane output for the duration of the stall threshold is **not** a stall — the worker is iterating with sub-agents.

Awaiting a completion event (`agent-status --status done`) that times out is NOT evidence of a stall.
The agent or its sub-agents may still be working — inspect actual state before acting.

Do not spam generic "continue" messages. Inspect first, then send an evidence-based next action.

After two materially different failed approaches, escalate with:

- issue and current objective
- approaches attempted
- exact failure evidence
- current Git state
- latest STATUS phase and any `BLOCKED` reason
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

When reconstructing a worktree during recovery, re-derive the branch name from `.herdr/manifest.yaml#branch_naming` — never invent a new prefix.

## Worker evidence gate

A worker report must contain:

- exact pushed commit
- changed files
- criterion-to-evidence mapping
- exact verification commands and exit results
- scope confirmation
- **`boss_review_summary`** — one paragraph: how many sub-agents ran, what `subagent-implementation-review` found, what was corrected, final disposition
- remaining risks

Reject stale, partial, or unsupported evidence. Evidence without a `boss_review_summary` is incomplete and must be sent back to the worker.

## Human review feedback

Human review comments from the GitHub PR UI return to the original worker as a consolidated checklist. The commander does not resolve human comments on the worker's behalf.

Every correction cycle requires:

- a new pushed SHA
- a fresh worker evidence report (with a fresh `boss_review_summary`)
- a fresh commander verification pass at the new SHA

The commander never resolves comments merely from the worker's claim.
