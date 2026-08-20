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
  workers_per_space: 3
  max_prs_awaiting_human_review: 2
  max_open_defects: 15
review:
  adversarial_reviewers: 2
  reviewer_context: diff-only
  fixer: separate
models:
  worker_model: openai-codex/gpt-5.6-luna
  worker_thinking: high
```

The commander is the user's current OMP session and is not a model-choice field.

`max_open_defects` is a fleet-wide ceiling on undrained review findings across all active workers. Worker count is not the real throughput limit; unfixed findings are. When the sum of open defect-queue entries reaches the ceiling, do not launch another worker — let the fleet drain first. Adding a worker to a fleet that is already behind on fixes makes completion later, not sooner.

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
- A worker emitting `STATUS <key> ADVERSARIAL_REVIEW` has several reviewer sub-agents running concurrently against the diff. This phase is quiet by construction — the reviewers write no files and produce no pane output until they return. Never interrupt it; an interrupt discards every reviewer's work at once.
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

The loop the worker runs is:

```text
implement → review in parallel with fresh contexts → drain the defect queue → repeat
```

The worker's mandated sub-skill sequence:

1. `skill(name="spawn")` — decompose the issue into atomic sub-tasks, write a full 7-section prompt for each (TASK, EXPECTED OUTPUT, CONTEXT, CODEBASE CONVENTIONS, MUST DO, MUST NOT DO, DONE WHEN).
2. `task` tool — delegate each sub-task to an in-model sub-agent. Pass the 7-section prompt as the sub-agent's task. The sub-agent has the full context to execute independently.
3. `skill(name="subagent-implementation-review")` — review each sub-agent's output against the issue's acceptance criteria, architecture rules, and AGENTS.md standards (rules 5 and 8 for comments and contracts).
4. **Adversarial review round.** Emit `STATUS <key> ADVERSARIAL_REVIEW <sha-or-dash> round <n>`. Dispatch `review.adversarial_reviewers` sub-agents **in one parallel wave** via the `task` tool, each receiving the adversarial reviewer prompt below and nothing else. Append every returned finding to the defect queue in arrival order.
5. **Drain the defect queue** (see "Defect queue" below). For each entry in order, delegate the correction to a **fixer** sub-agent — never to the reviewer that raised it, and never to the sub-agent that wrote the code. Emit `STATUS <key> CHANGES_REQUESTED <sha> <defect-seq>` while draining.
6. **Worker diff-review gate** — verify the cumulative diff against every acceptance criterion (see "Worker diff review gate" below).
7. Repeat steps 4–6 until the loop's termination condition holds (see "Loop termination" below).
8. `skill(name="commit")` — atomic commits, one logical change per commit, no `and` in subject lines.
9. Push the branch. Record the exact pushed SHA.
10. Send `STATUS <key> READY_FOR_REVIEW <sha> <one-line>` to the commander pane and **wait** for the `VERIFICATION_PASSED` handshake.
11. After the handshake arrives, navigate to the implementation worktree at the verified SHA named in the handshake.
12. `skill(name="pr-workflow") /pr` — generate the PR description from the actual branch diff.
13. `gh pr create --draft --base <base> --head <branch> --title <title> --body-file <body>` — open the draft PR.
14. Send `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>` to the commander.

The worker does not stop until a draft PR is open or it emits `STATUS <key> BLOCKED <sha-or-dash> <reason>`.

### Three roles, three contexts

The loop's quality comes from keeping implementer, reviewer, and fixer in **separate context windows**:

- The **implementer** sub-agent has the task prompt and writes the code.
- The **reviewer** sub-agents see the diff and the acceptance criteria. They do not see the task prompt, the implementer's reasoning, the plan narrative, or previous review rounds. A reviewer that reads why the code was written the way it was inherits the implementer's blind spots and rationalizes them.
- The **fixer** sub-agent receives one defect and applies the smallest correction.

The worker pane orchestrates all three but writes none of the code itself. It is not a cold reader either — it wrote the sub-agent prompts — which is exactly why the reviewers must be separate agents rather than the worker re-reading its own delegation.

Reviewers run concurrently, so N reviewers cost roughly the wall-clock of one.

### Adversarial reviewer prompt

Pass this verbatim as the reviewer sub-agent's task, with the diff and acceptance criteria appended. Add nothing else.

```text
ADVERSARIAL REVIEW — you are reviewer <N> of <M>.
You did not write this code. Assume it is incorrect.

INPUT: the diff below and the acceptance criteria. Nothing else.
Do not ask for the implementer's notes, the plan narrative, or prior review rounds.

YOUR ONLY JOB: find bugs and concrete reasons this code does not work.

Report each finding as:
  file:line — `verbatim source line` — mechanism — observable failure — smallest fix — severity

severity is one of: blocking | high | medium | low

Rules:
- If you cannot quote a live source line, omit the finding.
- If a workaround needs a paragraph-long comment to justify it, the code is
  wrong — report it as a finding against the code, not the comment.
- Do not report style, taste, formatting, or folder preference.
- Do not propose refactors beyond the smallest fix for a concrete defect.
- "No findings" is a valid and expected outcome. Do not manufacture findings.
```

That last rule is load-bearing. Agents told to find bugs, with no permission to return empty, will invent findings — and invented findings enter the queue as real work.

Give each reviewer a distinct lens when the change has more than one way to fail (correctness, concurrency/lifetime, error and boundary paths, security, does-it-actually-reproduce). Diversity catches failure modes that redundancy cannot. With identical prompts, reviewer 2 mostly re-derives reviewer 1.

### Defect queue

Every finding — from `subagent-implementation-review`, from an adversarial reviewer, or from the commander — is appended to an ordered, append-only queue at `.herdr/reports/<issue-key>/defects.jsonl`:

```jsonl
{"seq":1,"at":"<iso-8601>","source":"reviewer-a","round":1,"severity":"high","file":"src/session/types.rs","line":42,"claim":"<one line>","evidence":"`<verbatim source line>`","required_change":"<observable correction>","disposition":"open","disposition_evidence":null,"closed_at":null}
```

**Drain order.** Among entries whose `disposition` is `open`: `severity: blocking` first, then ascending `seq`. Everything else is first-in, first-out — findings are worked in the order they arrived, not in the order that is cheapest.

FIFO is the point. Left to its own judgement an agent fixes the three cheap findings and lets the expensive one evaporate between rounds — especially across a context compaction, where an in-memory finding simply ceases to exist. An append-only file with an explicit disposition per entry makes that impossible.

**Terminal dispositions.** Every entry must reach one of:

- `fixed` — corrected; `disposition_evidence` names the commit or the file:line that now satisfies `required_change`.
- `rejected-with-evidence` — the finding is wrong; `disposition_evidence` quotes the live source or test output that contradicts it. A rejection is a disposition, not a skip, and it requires a citation exactly as a finding does.
- `escalated` — resolving it requires a human decision (scope, product behavior, public contract, destructive change). The worker emits `STATUS <key> BLOCKED <sha-or-dash> <defect-seq>` and stops.

The worker MUST NOT advance to `COMMITTING` while any entry is `open`.

**Amendment rule.** Entries are never edited or deleted, only closed. A finding that turns out to be a duplicate closes as `rejected-with-evidence` citing the earlier `seq`.

**Direct fixes.** The worker may fix typos and single-line changes itself. Anything that affects behavior goes to a fixer sub-agent.

### Loop termination

The adversarial round repeats until **both** hold:

1. The defect queue has no `open` entries.
2. The most recent full review round returned **zero** `blocking` and zero `high` findings.

For issues the manifest marks high-risk — touching auth, persistence, migrations, concurrency, or a public contract — require **two consecutive** rounds meeting condition 2.

There is no iteration cap, but there is now a defined exit signal: the loop ends on evidence, not on the worker's judgement that it has done enough. Record `review_rounds` and the final round's finding count in the evidence report so the commander can distinguish a worker that converged from one that is looping.

If a round produces findings that are substantially the same as the previous round's, the fixer is not converging. Emit `STATUS <key> BLOCKED <sha> <defect-seq> repeated finding after N rounds` rather than looping further.

## Worker diff review gate

After every sub-agent implementation returns `ready` from
`subagent-implementation-review`, and again at the end of every
adversarial round once the defect queue drains, the worker pane MUST
inspect the cumulative `git diff <base>...HEAD` against every
`acceptance_criteria` in the worker context packet. The diff review is
the worker pane's own gate between review and commit; it is not the
commander's verification.

The adversarial reviewers check whether the code *works*. This gate
checks whether it does what the issue *asked for*. Both can fail
independently: a correct implementation of the wrong criterion passes
every reviewer.

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
- `ADVERSARIAL_REVIEW` — parallel reviewer sub-agents are running against the diff. Record the round number, surface to user, no action. **Reviewers produce no pane output while they run** — extended quiet during this phase is expected, not a stall.
- `CHANGES_REQUESTED` — defects found; the worker is draining its queue through fixer sub-agents. Record the open-defect count; do not interrupt.
- `COMMITTING` — running the `commit` skill for atomic commits. Record, surface to user, no action.
- `VERIFYING` — running checks (lint, test, typecheck) on the committed tree. Record, surface to user, no action.
- `READY_FOR_REVIEW` — branch pushed, awaiting commander verification. Trigger commander verification (Section 10 of workflow.md).
- `DRAFT_PR_OPENED` — `gh pr create --draft` succeeded. Record PR URL, apply `status:human-review` label, surface to user.
- `DONE` — terminal. Collect final evidence report, mark terminal.

`BLOCKED` is orthogonal: a worker can emit `STATUS <key> BLOCKED <sha-or-dash> <reason>` from any phase when it hits a destructive, irreversible, or materially ambiguous decision. On `BLOCKED`, investigate immediately, surface the blocker reason to the user, and decide whether to unblock or escalate.

### Parse failure

If a worker's output is not a recognized STATUS line, do not assume a phase. Continue supervising; the next STATUS line will clarify. Reject any non-conforming output that claims task-state transitions.

## Commander independent review

Commander verification re-runs the worker's commands and inspects the diff — but the commander authored the worker's context packet and read every STATUS line it emitted. It is the second-least independent reader in the system, after the worker itself.

Before sending `VERIFICATION_PASSED`, the commander dispatches **one** reviewer sub-agent via the `task` tool against the clean temporary checkout at the pushed SHA:

- Input: the diff at the verified SHA and the issue's `acceptance_criteria`. Nothing else.
- Prompt: the adversarial reviewer prompt above, as reviewer 1 of 1.
- The sub-agent does not receive the plan, the worker context packet, the worker's evidence report, the defect queue, or any STATUS history.

This is a `task` sub-agent, not a pane and not a worktree. The ban on reviewer *panes* stands — a pane means another OMP process, another worktree, and another thing to supervise, for a review that finishes in one turn.

Handle the result:

- **No findings** — record `independent_review.findings: []` in the commander verification report and send the handshake.
- **Findings** — append them to the worker's defect queue with `source: commander-review`, set the result to `CHANGES_REQUESTED`, and send the worker a checklist naming the new `seq` values. Do not send the handshake. Do not fix them yourself.

A finding here means two independent contexts disagreed about whether the code works, which is exactly the signal worth spending a human's review slot on — but only after the worker has resolved it.

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

A `STATUS <key> CHANGES_REQUESTED` or `STATUS <key> ADVERSARIAL_REVIEW` followed by quiet pane output for the duration of the stall threshold is **not** a stall — the worker is iterating with sub-agents or waiting on concurrent reviewers.

The defect queue gives a better stall signal than pane output during these phases: read `.herdr/reports/<issue-key>/defects.jsonl` and compare the closed-entry count against the last check. Entries closing means progress even when the pane is silent.

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
- **`defect_queue`** — `total`, `fixed`, `rejected`, `escalated`, `open`, and `review_rounds`, plus the final round's finding count
- remaining risks

Reject stale, partial, or unsupported evidence. Evidence without a `boss_review_summary` is incomplete and must be sent back to the worker.

**Defect queue closure gate.** Verify the queue independently rather than trusting the summary:

1. Read `.herdr/reports/<issue-key>/defects.jsonl` directly.
2. `open` MUST be zero. Any open entry means the worker advanced past its own gate — send it back.
3. `total` MUST equal `fixed + rejected + escalated`. A shortfall means entries were deleted, which the append-only rule forbids.
4. Spot-check every `rejected-with-evidence` entry. A rejection without a live citation is a skip wearing a disposition, and it is the most likely place for a real defect to have been buried.
5. `review_rounds` of 1 with a nonzero finding count means the loop never re-reviewed after fixing. Send it back.

An empty queue is a valid outcome — reviewers finding nothing on a small, clean diff is expected. A queue that is empty on a large diff across several rounds is not; check that the reviewers actually ran and received the diff.

## Human review feedback

Human review comments from the GitHub PR UI return to the original worker as a consolidated checklist. The commander does not resolve human comments on the worker's behalf.

Every correction cycle requires:

- a new pushed SHA
- a fresh worker evidence report (with a fresh `boss_review_summary`)
- a fresh commander verification pass at the new SHA

The commander never resolves comments merely from the worker's claim.
