# Orchestration Contracts

These schemas are the minimum machine contracts. Add repository-specific fields when needed, but preserve authority, ownership, dependency, and evidence fields.

## Approval packet

```yaml
objective: <objective>
plan:
  path: <path>
  revision: <hash-or-timestamp>
  validation: passed
base_branch: <branch>
branch_naming:
  convention: issue-<number>-<kebab-slug>
  example: issue-142-session-contract
capacity:
  max_active_workers: 3
  workers_per_space: 3
  max_prs_awaiting_human_review: 2
monitoring:
  stall_threshold_minutes: 10
  repeated_failure_limit: 2
  automatic_recovery_limit: 2
models:
  worker_model: openai-codex/gpt-5.6-luna
  worker_thinking: high
issues:
  - key: session-contract
    title: Define shared session-state contract
    human_owner: <login-or-pending>
    execution_mode: herdr-agent | human | unassigned
    dependencies: []
    dependency_reason: none
    parallel_group: foundation
    owned_paths:
      - src/session/types.rs
    owned_modules:
      - session-contract
    likely_conflicts: []
    target_behavior:
      - <observable behavior>
    acceptance_criteria:
      - <binary criterion>
risks:
  - <risk-or-none>
approval_authorizes:
  - publish listed issues
  - assign listed owners
  - create authorized worktrees and OMP workers
  - operate within listed capacity and ownership boundaries
```

The skill explicitly prompts the user for `worker_model` and `worker_thinking` before publishing. Defaults shown; user may override. The commander is the user's current OMP session and is not a model-choice field — there is no `commander_model` in the packet.

## Branch naming

The branch name is decided at issue allocation and recorded in the
committed manifest as `issues.<key>.branch`. Naming rules:

- Default: `issue-<github_issue_number>-<kebab-slug-from-title>`.
- Repo override: if the repository has an established convention,
  record `branch_naming.convention` and `branch_naming.example` in the
  committed manifest and use that convention for every issue in the run.
- Forbidden prefixes: `parallel/`, `parallel-dev/`, or any other
  skill-name-derived prefix. The branch MUST identify the issue, not
  the tool that created it.

The committed manifest example fields already use
`branch: issue-142-session-contract`; that pattern is canonical unless
the repo override applies.

## Committed manifest

```yaml
version: 1
objective: <objective>
plan:
  path: <path>
  revision: <hash-or-timestamp>
repository: <repository>
base_branch: <branch>
branch_naming:
  convention: issue-<number>-<kebab-slug>
  example: issue-142-session-contract
capacity:
  max_active_workers: 3
  workers_per_space: 3
  max_prs_awaiting_human_review: 2
models:
  worker_model: openai-codex/gpt-5.6-luna
  worker_thinking: high
issues:
  - key: session-contract
    github_issue: 142
    github_url: <url>
    title: <title>
    human_owner: <login>
    execution_mode: herdr-agent
    dependencies: []
    dependency_reason: none
    parallel_group: foundation
    owned_paths:
      - src/session/types.rs
    forbidden_paths:
      - mobile/
    target_behavior:
      - <behavior>
    acceptance_criteria:
      - <criterion>
    verification:
      - <command>
```

## Manifest promotion

`to-issues` produces a **draft manifest** using its own field names (`source_plan`, `likely_paths`,
`collision_risks`, `human_owner: pending`, `execution_mode: pending`).
Before execution begins, the commander promotes the draft manifest to the **committed manifest**
(`.herdr/manifest.yaml`).

Promotion steps:

1. Rename `source_plan` to `plan`.
2. Rename `likely_paths` to `owned_paths`.
3. Rename `collision_risks` to `likely_conflicts`; the original list carries forward.
4. Add `repository` and `base_branch` from project context.
5. Derive `forbidden_paths` for each issue from other issues' `owned_paths` and `likely_paths`
   in the same execution wave.
6. Add the `models` block from the approval packet (only `worker_model` and `worker_thinking`).
7. After GitHub publication, record `github_issue` (number) and `github_url`.
8. Replace `human_owner: pending` and `execution_mode: pending` with the human-approved values.
9. Add `verification` commands from the plan — each issue includes the commands the worker
   must run and the commander must independently reproduce.

The committed manifest is authoritative for execution. Do not read back the draft manifest
after promotion.

## Local runtime state

```yaml
plan_validation:
  status: passed
  checked_at: <timestamp>
issues:
  session-contract:
    status: ACTIVE
    github_issue: 142
    branch: issue-142-session-contract
    worktree_path: <absolute-path>
    herdr_resources:
      workspace_id: <opaque-id>
      pane_id: <opaque-id>
      terminal_id: <opaque-id-or-null>
      commander_pane_id: <pane-id>
      worker_agent: issue-142-worker
      omp_session_ref: <native-ref-or-null>
    runtime_status: <official-herdr-status>
    task_status: IMPLEMENTING
    last_status_phase: IMPLEMENTING
    last_status_at: <iso-8601-timestamp>
    recovery_attempts: 0
    latest_pushed_commit: <sha-or-null>
    pull_request: null
    review_cycle: 0
ownership_locks:
  src/session/types.rs: session-contract
  workspaces:
    - workspace_id: <opaque-id>
      label: workers-1
      worker_count: 0
      max_workers: 3
      root_pane_id: <pane-id>
```

## Worker context packet

```yaml
role: implementation-worker-boss
commander_pane_id: <pane-id>
issue:
  number: 142
  title: <title>
  url: <url>
  why: <problem>
  target_behavior:
    - <observable behavior>
  scope:
    - <owned responsibility>
  out_of_scope:
    - <explicit exclusion>
plan:
  path: <path>
  relevant_sections:
    - <section>
architecture:
  required_decisions:
    - <locked decision>
ownership:
  owned_paths:
    - <path>
  forbidden_paths:
    - <path>
dependencies:
  - issue: 141
    merged_commit: <sha>
acceptance_criteria:
  - <binary criterion>
verification:
  required_commands:
    - <command>
git_permissions:
  branch: issue-142-session-contract
  may_commit: true
  may_push: true
  may_merge: false
  may_force_push: false
boss_protocol: |
  You are the boss for this issue. Run these sub-skills in order, iterating as needed.
  The commander does not orchestrate your internal sub-skill sequence; it only sends the
  VERIFICATION_PASSED handshake after you report READY_FOR_REVIEW.

  1. Decompose the issue into atomic sub-tasks using `skill(name="spawn")`.
     Write a full 7-section prompt for each sub-task (TASK, EXPECTED OUTPUT,
     CONTEXT, CODEBASE CONVENTIONS, MUST DO, MUST NOT DO, DONE WHEN).
  2. Delegate each sub-task to an in-model sub-agent via the `task` tool.
     Pass the 7-section prompt as the sub-agent's task. Do not ask the
     sub-agent follow-up questions; the prompt is the full context.
  3. After each sub-agent finishes, run
     `skill(name="subagent-implementation-review")` on the result. If
     review reports `changes-required` or `blocked-awaiting-human`, emit
     `STATUS <key> CHANGES_REQUESTED <sha> <sub-agent-or-criterion-id>`
     and re-delegate the precise correction to a sub-agent. Do NOT
     edit implementation files yourself except for trivial fixes
     (typos, single-line). The CHANGES_REQUESTED loop has no cap; you
     MUST NOT advance to step 4 while any sub-agent review is
     `changes-required` or `blocked-awaiting-human`. Continue iterating
     until every sub-agent returns `ready`.
  3a. Worker diff-review gate. After every sub-agent implementation
      receives a `ready` verdict from `subagent-implementation-review`,
      inspect the cumulative `git diff <base>...HEAD` against every
      `acceptance_criteria` entry in this worker context packet. For
      each unmet criterion, re-delegate the precise correction to a
      sub-agent and re-run the review. Do not advance to step 4 until
      every criterion is verified met against the diff. Record
      `diff_review.criterion_evidence: {criterion: evidence}` in the
      worker evidence report.
  4. Once all sub-agents pass review, run `skill(name="commit")` for each atomic
     commit. One logical change per commit. No `and` in subject lines.
  5. Push the branch. Record the exact pushed SHA.
  6. Send `STATUS <key> READY_FOR_REVIEW <sha> <one-line>` to the commander pane
     via `herdr pane send-text "$commander_pane_id" "..."` followed by
     `herdr pane send-keys "$commander_pane_id" Enter`.
  7. WAIT for the commander to send the VERIFICATION_PASSED handshake to you.
     The worker remains idle at READY_FOR_REVIEW until the handshake arrives.
  8. After receiving VERIFICATION_PASSED, navigate to the implementation worktree
     at the verified SHA named in the handshake.
  9. Run `skill(name="pr-workflow") /pr` to generate the PR description from the
     actual branch diff.
  10. Run `gh pr create --draft --base <base> --head <branch> --title <title>
      --body-file <body>` to open the draft PR.
  11. Send `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>` to the commander.

  You do not stop until a draft PR is open or you emit
  `STATUS <key> BLOCKED <sha-or-dash> <reason>`. If you encounter a destructive,
  irreversible, or materially ambiguous decision, emit BLOCKED and stop.
reporting:
  status_message_format: "STATUS <issue_key> <phase> <pushed_sha_or_dash> <one_line_summary>"
  status_phases:
    - IMPLEMENTING
    - BOSS_REVIEW
    - CHANGES_REQUESTED
    - COMMITTING
    - VERIFYING
    - READY_FOR_REVIEW
    - DRAFT_PR_OPENED
    - DONE
    # BLOCKED is orthogonal — emit from any phase when blocked
  transport: |
    herdr pane send-text "$commander_pane_id" "STATUS <issue_key> <phase> <pushed_sha_or_dash> <one_line_summary>"
    herdr pane send-keys "$commander_pane_id" Enter
stop_conditions:
  - scope must expand
  - architecture decision is missing
  - dependency contract is incompatible
  - destructive action is required
  - worker cannot reach the commander (STATUS messages time out twice)
```

Append these instructions:

```text
Read relevant exports, callers, tests, and conventions before editing.
Implement only this issue using the smallest correct diff.
Do not touch forbidden paths or add dependencies without escalation.
Commit and push only the assigned branch. Never merge or force-push.
Continue obvious reversible steps without asking.
When delegating sub-tasks via the `task` tool, the commander monitors your Herdr status
and waits for sub-agent completion before intervening — do not expect external input
during sub-agent work.
READY_FOR_REVIEW requires the exact pushed SHA and the evidence report (see below).
A draft PR is the only acceptable terminal state, except for BLOCKED.
```

## STATUS message schema

```yaml
status_message:
  format: "STATUS <issue_key> <phase> <pushed_sha_or_dash> <one_line_summary>"
  phases_in_canonical_order:
    - IMPLEMENTING
    - BOSS_REVIEW
    - CHANGES_REQUESTED       # loops back to IMPLEMENTING or BOSS_REVIEW
    - COMMITTING
    - VERIFYING
    - READY_FOR_REVIEW        # branch pushed, awaiting commander verification
    - DRAFT_PR_OPENED         # gh pr create --draft succeeded
    - DONE                    # terminal
  orthogonal_phases:
    - BLOCKED                 # emit from any phase when blocked
  transport: |
    herdr pane send-text "$commander_pane_id" "STATUS <issue_key> <phase> <pushed_sha_or_dash> <one_line_summary>"
    herdr pane send-keys "$commander_pane_id" Enter
  example: "STATUS session-contract READY_FOR_REVIEW abc1234 implemented session API with coverage at 92%"
  commander_response:
    IMPLEMENTING: record, surface to user, no action
    BOSS_REVIEW: record, surface to user, no action
    CHANGES_REQUESTED: record; worker is iterating with sub-agents, do not interrupt
    COMMITTING: record, surface to user, no action
    VERIFYING: record, surface to user, no action
    READY_FOR_REVIEW: trigger commander verification (Section 10 of workflow.md)
    DRAFT_PR_OPENED: record PR URL, apply status:human-review label, surface to user
    BLOCKED: investigate immediately, surface blocker reason, decide whether to unblock or escalate
    DONE: collect final evidence report, mark terminal
```

The commander never sends a STATUS line for a worker; only the worker emits STATUS for its own issue.

## VERIFICATION_PASSED handshake schema

```yaml
verification_passed_handshake:
  sender: commander
  recipient: worker pane
  precondition: commander verification passed (Section 10 of workflow.md)
  format: |
    VERIFICATION_PASSED. Proceed to PR: run skill(pr-workflow) /pr from the
    implementation worktree at <verified_sha>, then gh pr create --draft
    --base <base> --head <branch> --title <title> --body-file <body>, then
    send STATUS <key> DRAFT_PR_OPENED <sha> <pr_url> to me.
  transport: |
    herdr pane send-text "$WORKER_PANE_ID" "<message>"
    herdr pane send-keys "$WORKER_PANE_ID" Enter
  effect: worker_starts_draft_pr
  note: |
    The worker remains idle at READY_FOR_REVIEW until this handshake arrives.
    Without the handshake, the worker never starts the PR workflow.
    The handshake names the exact verified SHA so the PR head and the
    verified commit are guaranteed to match.
```

## Worker evidence report (with boss-review summary)

```yaml
status: READY_FOR_REVIEW
issue: 142
branch: issue-142-session-contract
commit: <exact-pushed-sha>
summary:
  - <behavior-implemented>
boss_review_summary: |
  <one paragraph: how many sub-agents ran, what subagent-implementation-review
  found, what was corrected, final disposition>
files_changed:
  - <path>
acceptance_criteria:
  - criterion: <criterion>
    status: passed
    evidence: <test-observation-or-file-reference>
verification:
  - command: <exact-command>
    exit_code: 0
    result: <concise-output>
scope_confirmation:
  forbidden_paths_changed: false
  dependencies_added: []
  architecture_changed: false
remaining_risks:
  - none
```

## Commander verification report

```yaml
commander_verification_report:
  issue: 142
  verified_commit: <sha>
  verified_at: <iso-8601-timestamp>
  verification:
    - command: <exact-command>
      exit_code: 0
      output_excerpt: <lines>
  scope_check:
    passed: true
    out_of_scope_files: []
  evidence_complete: true
  result: PASSED | CHANGES_REQUESTED
  findings:
    - severity: blocking | high | medium | low
      file: <path>
      line: <line-or-range>
      problem: <specific-defect>
      impact: <why-it-matters>
      required_change: <observable-correction>
    # findings is empty when result is PASSED
  handshake_sent: true   # true after VERIFICATION_PASSED was sent to the worker
  review_cycle: 0
```

## Draft PR generation

After commander verification passes AND the `VERIFICATION_PASSED` handshake is sent to the worker, the **worker pane** (not the commander) executes the PR workflow. The worker remains idle at `READY_FOR_REVIEW` until the handshake arrives.

### Procedure

1. The commander sends the `VERIFICATION_PASSED` handshake to the worker pane (see `VERIFICATION_PASSED handshake schema`).
2. The worker navigates to the implementation worktree at the verified SHA named in the handshake.
3. The worker invokes `/pr` (`skill(pr-workflow)` `/pr`) inside the worktree to generate the PR description from the actual branch diff: inspect the diff against the base, determine size, and write the four standard sections (Summary, Why, Approach, Architecture and Contracts).
4. The `/pr` output becomes the descriptive PR body. The worker does not recreate these sections — `/pr` derives them from the committed diff.
5. The worker appends the augmented metadata supplement below the `/pr` body.
6. The worker opens the draft PR using `gh pr create --draft --base <base> --head <branch> --title <title> --body-file <body>`.
7. The worker sends `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>` to the commander.
8. The commander records the PR URL, surfaces to the user, and applies the `status:human-review` label.

The commander never opens a draft PR itself; the worker pane owns the call so the SHA, branch, and worktree stay aligned with the implementation.

### Augmented metadata supplement

The `/pr` output covers the code change. The following concise factual
metadata adds traceability and evidence that the branch diff alone does not
contain. Append it below the `/pr` body. Skip sections with no meaningful
content.

```text
**Plan**: `<plan-path>` `<plan-revision>`
**Issue**: #<issue-number>
**Worker commit**: `<sha>`
**Worker verification**: `<command>` — passed
**Boss review summary**: <one-line from boss_review_summary>
**Commander verification**: `<sha>` — `<command>` — passed
**Risks**: <risk-or-none>
**Human merge authority required**

Closes #<issue>
```

Do not recreate the descriptive body sections that `/pr` generates from the
diff. The metadata section is a supplement, not a replacement body.
