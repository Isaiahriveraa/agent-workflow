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
  max_open_defects: 15
review:
  adversarial_reviewers: 2
  reviewer_context: diff-only
  fixer: separate
fleet_rules:
  forbidden_commands:
    - git stash
    - git reset
    - git checkout .
    - git clean
    - git add -A
    - git add .
    - git push --force
  commit_rule: stage explicitly named paths only — `git add <path> [<path>…]`
  search_rule: scope every search to a path or glob; no unguarded repository-wide grep/find
  build_rule: scope builds and tests to the owned package/module; full-repository builds only at the verification gate
monitoring:
  stall_threshold_minutes: 10
  repeated_failure_limit: 2
  automatic_recovery_limit: 2
waves:
  - id: foundation
    max_parallel: 1
    shards: [shard-core]
models:
  worker_model: openai-codex/gpt-5.6-luna
  worker_thinking: high
issues:
  - key: session-contract
    title: Define shared session-state contract
    issue_type: foundation
    human_owner: <login-or-pending>
    execution_mode: herdr-agent | human | unassigned
    dependencies: []
    dependency_reason: none
    parallel_group: foundation
    shard: shard-core
    unblocks_count: 3
    owned_paths:
      - src/session/types.rs
    owned_modules:
      - session-contract
    likely_conflicts: []
    review:
      adversarial_reviewers: 2
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
  max_open_defects: 15
review:
  adversarial_reviewers: 2
  reviewer_context: diff-only
  fixer: separate
fleet_rules:
  forbidden_commands: [git stash, git reset, git checkout ., git clean, git add -A, git add ., git push --force]
  commit_rule: stage explicitly named paths only
  search_rule: scope every search to a path or glob
  build_rule: scope builds and tests to the owned package/module
completion_oracle: <command from the plan, or none>
waves:
  - id: foundation
    max_parallel: 1
    shards: [shard-core]
    verification_gate: <observable proof the wave is safe to build on>
workflows:
  <workflow-name>:
    work_queue_command: <command that enumerates items, or none>
    implementers: 1
    adversarial_reviewers: 2
    fixers: 1
    verification_gate: <command>
    commit_rule: one logical change per commit, named paths only
models:
  worker_model: openai-codex/gpt-5.6-luna
  worker_thinking: high
issues:
  - key: session-contract
    github_issue: 142
    github_url: <url>
    title: <title>
    issue_type: foundation | implementation | fan-out
    human_owner: <login>
    execution_mode: herdr-agent
    dependencies: []
    dependency_reason: none
    parallel_group: foundation
    shard: shard-core
    unblocks_count: 3
    owned_paths:
      - src/session/types.rs
    forbidden_paths:
      - mobile/
    convention_artifacts:
      - <committed artifact path this issue must read first, or none>
    review:
      adversarial_reviewers: 2
    work_queue_command: <fan-out only>
    queue_order: fifo          # fan-out only
    risk: normal | high        # high requires two consecutive clean review rounds
    target_behavior:
      - <behavior>
    acceptance_criteria:
      - <criterion>
    verification:
      - <command>
```

### Workflow recipes

A `workflows` entry is a named, repeatable recipe: the command that produces the work, the agent composition that consumes it, and the gate that closes it. A phase that has a recipe can be re-run after a bad round by invoking the recipe again, rather than by reconstructing the orchestration from prose.

Define a recipe whenever the same shape of work recurs across issues — "fix the compiler errors in one package", "make one failing test file pass", "migrate one call-site batch". Reference it from an issue as `workflow: <workflow-name>` instead of restating the composition per issue.

Recipes are configuration, not narrative. Changing `adversarial_reviewers` for a phase should be a one-line edit, not a rewrite of the boss protocol.

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
10. Carry `fleet_rules`, `completion_oracle`, `waves`, `shard`, `issue_type`,
    `unblocks_count`, `convention_artifacts`, `work_queue_command`, `queue_order`,
    and per-issue `review` forward **unchanged**. `fleet_rules` in particular is
    copied verbatim — it reaches workers as prohibitions, and paraphrasing a
    prohibition weakens it.
11. Add the approval-packet `review` block as the manifest default. A per-issue
    `review` overrides it; issues without one inherit the default.
12. Set `risk: high` on any issue whose `owned_paths` touch auth, persistence,
    migrations, concurrency primitives, or a published public contract. High-risk
    issues require two consecutive clean adversarial rounds before commit.
13. Add each wave's `verification_gate` from the plan's execution-boundary table.

The committed manifest is authoritative for execution. Do not read back the draft manifest
after promotion.

If the draft manifest is missing `shard`, `fleet_rules`, or a `work_queue_command` on a
fan-out issue, do not synthesize them. Return the decomposition to `to-issues` with the
exact deficiency — a guessed shard boundary is worse than no shard boundary, because it
looks authoritative.

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
    shard: shard-core
    review_round: 0
    defects_open: 0
    defects_total: 0
    recovery_attempts: 0
    latest_pushed_commit: <sha-or-null>
    pull_request: null
    review_cycle: 0
fleet:
  open_defects: 0              # sum of defects_open across active workers
  max_open_defects: 15         # from the committed manifest capacity block
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
  shard: shard-core
  owned_paths:
    - <path>
  forbidden_paths:
    - <path>
convention_artifacts:
  - path: <committed artifact path>
    read_before_starting: true
dependencies:
  - issue: 141
    merged_commit: <sha>
acceptance_criteria:
  - <binary criterion>
verification:
  required_commands:
    - <command>
review:
  adversarial_reviewers: 2
  reviewer_context: diff-only
  fixer: separate
  risk: normal            # `high` requires two consecutive clean rounds
defect_queue:
  path: .herdr/reports/<issue-key>/defects.jsonl
  order: blocking-first-then-fifo
  terminal_dispositions: [fixed, rejected-with-evidence, escalated]
git_permissions:
  branch: issue-142-session-contract
  may_commit: true
  may_push: true
  may_merge: false
  may_force_push: false
fleet_rules:
  forbidden_commands:
    - git stash
    - git reset
    - git checkout .
    - git clean
    - git add -A
    - git add .
    - git push --force
  commit_rule: |
    Stage explicitly named paths: `git add <path> [<path>…]`.
    Never stage by wildcard or by directory. You share this repository with
    other concurrent workers; a wildcard stage captures their files too.
  search_rule: |
    Scope every search to a path or glob inside your owned paths.
    No unguarded repository-wide `grep`/`find`. One slow global search
    saturates the disk for every concurrent worker at once.
  build_rule: |
    Scope builds and tests to your owned package/module. Run the
    full-repository build or typecheck only at the verification gate.
  rationale: |
    These are prohibitions, not preferences. Destructive Git loses another
    worker's uncommitted work; slow global commands serialize the entire
    fleet on disk I/O. Both failure modes are invisible from inside your
    own pane — you will not notice you caused them.
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
     `skill(name="subagent-implementation-review")` on the result.
     Append every finding to the defect queue (step 5). Do NOT edit
     implementation files yourself except for trivial fixes (typos,
     single-line).
  4. ADVERSARIAL REVIEW ROUND. Emit
     `STATUS <key> ADVERSARIAL_REVIEW <sha-or-dash> round <n>`.
     Dispatch `review.adversarial_reviewers` sub-agents via the `task`
     tool IN ONE PARALLEL WAVE. Give each one ONLY the diff
     (`git diff <base>...HEAD`) and this packet's `acceptance_criteria`.
     Do NOT pass them the issue body, the plan, your sub-agent prompts,
     your reasoning, or previous review rounds — a reviewer that can see
     why the code was written inherits the same blind spots. Use this
     prompt verbatim for each:

       ADVERSARIAL REVIEW — you are reviewer <N> of <M>.
       You did not write this code. Assume it is incorrect.
       INPUT: the diff below and the acceptance criteria. Nothing else.
       YOUR ONLY JOB: find bugs and concrete reasons this code does not work.
       Report each finding as:
         file:line — `verbatim source line` — mechanism — observable failure
         — smallest fix — severity (blocking|high|medium|low)
       Rules:
       - If you cannot quote a live source line, omit the finding.
       - If a workaround needs a paragraph-long comment to justify it, the
         code is wrong — report it against the code, not the comment.
       - Do not report style, taste, formatting, or folder preference.
       - "No findings" is a valid and expected outcome. Do not manufacture
         findings.

     Give each reviewer a distinct lens when the change can fail in more
     than one way (correctness, concurrency/lifetime, error and boundary
     paths, security, does-it-reproduce).
  5. DRAIN THE DEFECT QUEUE. Append every finding — from step 3, step 4,
     or the commander — to `.herdr/reports/<issue-key>/defects.jsonl` in
     arrival order, one JSON object per line:
       {"seq":N,"at":"<iso>","source":"<reviewer-id>","round":<n>,
        "severity":"blocking|high|medium|low","file":"<path>","line":<n>,
        "claim":"<one line>","evidence":"`<verbatim source line>`",
        "required_change":"<observable correction>","disposition":"open",
        "disposition_evidence":null,"closed_at":null}
     Work them in order: `blocking` severity first, then ascending `seq`.
     Everything else is strictly first-in-first-out. Do NOT reorder by
     how easy a fix looks. Emit
     `STATUS <key> CHANGES_REQUESTED <sha> <defect-seq>` while draining.
     Delegate each fix to a FIXER sub-agent — never the reviewer that
     raised it, never the sub-agent that wrote the code. Close every
     entry as one of:
       fixed                   — cite the commit or file:line that satisfies it
       rejected-with-evidence  — quote the live source or test output that
                                 contradicts the finding. A rejection needs a
                                 citation exactly as a finding does; it is a
                                 disposition, not a skip.
       escalated               — needs a human decision; emit BLOCKED and stop.
     Entries are append-only. Never edit or delete one; only close it.
  6. Worker diff-review gate. Inspect the cumulative
     `git diff <base>...HEAD` against every `acceptance_criteria` entry
     in this packet. For each unmet criterion, delegate the precise
     correction to a sub-agent. Record
     `diff_review.criterion_evidence: {criterion: evidence}` in the
     evidence report. The reviewers check whether the code WORKS; this
     gate checks whether it does what the issue ASKED FOR. Both can fail
     independently.
  7. Repeat steps 4–6 until BOTH hold:
       (a) the defect queue has no `open` entries, AND
       (b) the most recent round returned zero `blocking` and zero `high`
           findings.
     If `review.risk` is `high`, require two consecutive rounds meeting (b).
     There is no iteration cap. You MUST NOT advance to step 8 while any
     entry is open or any acceptance criterion is unmet. If a round
     produces substantially the same findings as the previous round, the
     fixer is not converging — emit BLOCKED rather than looping.
  8. Run `skill(name="commit")` for each atomic commit. One logical change
     per commit. No `and` in subject lines. Stage explicitly named paths.
  9. Push the branch. Record the exact pushed SHA.
  10. Send `STATUS <key> READY_FOR_REVIEW <sha> <one-line>` to the commander pane
      via `herdr pane send-text "$commander_pane_id" "..."` followed by
      `herdr pane send-keys "$commander_pane_id" Enter`.
  11. WAIT for the commander to send the VERIFICATION_PASSED handshake to you.
      You remain idle at READY_FOR_REVIEW until the handshake arrives. The
      commander runs its own independent reviewer against your diff; if it
      returns findings, they arrive as new defect-queue entries and you
      resume at step 5.
  12. After receiving VERIFICATION_PASSED, navigate to the implementation worktree
      at the verified SHA named in the handshake.
  13. Run `skill(name="pr-workflow") /pr` to generate the PR description from the
      actual branch diff.
  14. Run `gh pr create --draft --base <base> --head <branch> --title <title>
      --body-file <body>` to open the draft PR.
  15. Send `STATUS <key> DRAFT_PR_OPENED <sha> <pr_url>` to the commander.

  You do not stop until a draft PR is open or you emit
  `STATUS <key> BLOCKED <sha-or-dash> <reason>`. If you encounter a destructive,
  irreversible, or materially ambiguous decision, emit BLOCKED and stop.

  Obey `fleet_rules` exactly. You share this repository with other concurrent
  workers. A forbidden Git command destroys their uncommitted work; an
  unguarded global search or full-repository build stalls all of them at once.
  Neither failure is visible from inside your own pane.
reporting:
  status_message_format: "STATUS <issue_key> <phase> <pushed_sha_or_dash> <one_line_summary>"
  status_phases:
    - IMPLEMENTING
    - BOSS_REVIEW
    - ADVERSARIAL_REVIEW
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
Read every entry in `convention_artifacts` before you start. They fix decisions
that other concurrent workers are also making; diverging from them produces code
that is individually correct and collectively inconsistent.
Read relevant exports, callers, tests, and conventions before editing.
Implement only this issue using the smallest correct diff.
Stay inside your shard. A diff touching a path outside `ownership.owned_paths` is
a scope violation, not a merge problem.
Do not touch forbidden paths or add dependencies without escalation.
Commit and push only the assigned branch. Never merge or force-push.
Obey `fleet_rules` exactly — they are prohibitions, not preferences.
Continue obvious reversible steps without asking.
When delegating sub-tasks via the `task` tool, the commander monitors your Herdr status
and waits for sub-agent completion before intervening — do not expect external input
during sub-agent work.
Your adversarial reviewers get the diff and the acceptance criteria and nothing else.
Resist the urge to give them context "so they understand" — the missing context is
the entire mechanism.
Every review finding reaches a terminal disposition in the defect queue before you
commit. Working the queue in arrival order is mandatory, not advisory.
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
    - ADVERSARIAL_REVIEW      # parallel reviewer sub-agents; quiet by construction
    - CHANGES_REQUESTED       # draining the defect queue; loops back to ADVERSARIAL_REVIEW
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
    ADVERSARIAL_REVIEW: record the round; reviewers run concurrently and produce no pane output — never interrupt
    CHANGES_REQUESTED: record the open-defect count; worker is draining its queue, do not interrupt
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
defect_queue:
  path: .herdr/reports/<issue-key>/defects.jsonl
  total: 7
  fixed: 5
  rejected: 2
  escalated: 0
  open: 0                     # MUST be zero
  review_rounds: 3
  final_round_findings: 0     # MUST be zero for blocking and high
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
  outside_shard_paths_changed: false
  dependencies_added: []
  architecture_changed: false
  fleet_rules_observed: true
remaining_risks:
  - none
```

`total` must equal `fixed + rejected + escalated`. A shortfall means entries were
deleted, which the append-only rule forbids. `review_rounds: 1` with a nonzero
finding count means the loop never re-reviewed after fixing.

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
    outside_shard_files: []
  defect_queue_check:
    open: 0                    # MUST be zero to pass
    total_matches_dispositions: true
    rejections_carry_citations: true
    review_rounds: 3
  independent_review:
    dispatched: true           # one task sub-agent, diff-only, against the clean checkout
    reviewer_context: diff-only
    findings: []               # findings here become new defect-queue entries
  evidence_complete: true
  result: PASSED | CHANGES_REQUESTED
  findings:
    - severity: blocking | high | medium | low
      file: <path>
      line: <line-or-range>
      problem: <specific-defect>
      impact: <why-it-matters>
      required_change: <observable-correction>
      queued_as_seq: <defect-queue seq assigned when sent back>
    # findings is empty when result is PASSED
  handshake_sent: true   # true after VERIFICATION_PASSED was sent to the worker
  review_cycle: 0
```

`independent_review.dispatched: false` is never a valid PASSED result. The commander
authored the worker's context packet and read every STATUS line it emitted; its own
read of the diff is not independent, which is why the cold read is delegated to a
sub-agent that has seen none of that.

Findings from the independent review are appended to the worker's defect queue with
`source: commander-review` and drained by the worker's fixer sub-agents. The commander
records `queued_as_seq` so the checklist it sends can reference sequence numbers instead
of restating the findings.

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
