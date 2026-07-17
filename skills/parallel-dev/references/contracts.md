# Orchestration Contracts

These schemas are the minimum machine contracts. Add repository-specific fields when needed, but preserve authority, ownership, dependency, and evidence fields.

## Approval packet

```yaml
objective: <objective>
plan:
  path: <path>
  revision: <hash-or-timestamp>
  validation: passed
capacity:
  max_active_workers: 3
  max_prs_awaiting_human_review: 2
monitoring:
  stall_threshold_minutes: 10
  repeated_failure_limit: 2
  automatic_recovery_limit: 2
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

## Committed manifest

```yaml
version: 1
objective: <objective>
plan:
  path: <path>
  revision: <hash-or-timestamp>
repository: <repository>
base_branch: <branch>
capacity:
  max_active_workers: 3
  max_prs_awaiting_human_review: 2
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
6. After GitHub publication, record `github_issue` (number) and `github_url`.
7. Replace `human_owner: pending` and `execution_mode: pending` with the human-approved values.
8. Add `verification` commands from the plan — each issue includes the commands the worker
   must run and the reviewer must independently reproduce.

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
      worker_agent: issue-142-worker
      omp_session_ref: <native-ref-or-null>
    runtime_status: <official-herdr-status>
    task_status: IMPLEMENTING
    recovery_attempts: 0
    latest_pushed_commit: <sha-or-null>
    pull_request: null
    review_cycle: 0
ownership_locks:
  src/session/types.rs: session-contract
```

## Worker context packet

```yaml
role: implementation-worker
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
reporting:
  meaningful_states:
    - IMPLEMENTING
    - VERIFYING
    - READY_FOR_REVIEW
stop_conditions:
  - scope must expand
  - architecture decision is missing
  - dependency contract is incompatible
  - destructive action is required
```

Append these instructions:

```text
Read relevant exports, callers, tests, and conventions before editing.
Implement only this issue using the smallest correct diff.
Do not touch forbidden paths or add dependencies without escalation.
Commit and push only the assigned branch. Never merge or force-push.
Continue obvious reversible steps without asking.
When delegating sub-tasks via the `task` tool, the commander monitors your Herdr status and waits for sub-agent completion before intervening — do not expect external input during sub-agent work.
READY_FOR_REVIEW requires the exact pushed SHA and evidence contract.
```

## Worker evidence report

```yaml
status: READY_FOR_REVIEW
issue: 142
branch: issue-142-session-contract
commit: <exact-pushed-sha>
summary:
  - <behavior-implemented>
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

## Reviewer context packet

```yaml
role: independent-reviewer
issue: <approved-issue-contract>
plan_sections:
  - <relevant-section>
commit: <exact-pushed-sha>
base_ref: <approved-comparison-base>
diff_command: git diff <base>...<sha>
worker_report: <path-or-embedded-report>
ownership:
  owned_paths:
    - <path>
  forbidden_paths:
    - <path>
acceptance_criteria:
  - <criterion>
verification:
  required_commands:
    - <command>
permissions:
  edit_tracked_files: false
  commit: false
  push: false
```

## Reviewer report

```yaml
status: PASSED | CHANGES_REQUESTED
issue: 142
commit: <sha>
findings:
  - severity: blocking | high | medium | low
    file: <path>
    line: <line-or-range>
    problem: <specific-defect>
    impact: <why-it-matters>
    required_change: <observable-correction>
acceptance_criteria:
  - criterion: <criterion>
    status: passed | failed
    evidence: <evidence>
verification:
  - command: <command>
    exit_code: <code>
    result: <result>
scope_check:
  passed: true | false
review_worktree_clean: true | false
remaining_risks:
  - none
```

## Draft PR generation

After all review gates pass, the commander generates the PR body by invoking
the canonical `/pr` submode (`skill(pr-workflow)` `/pr`) inside the implementation
worktree at the exact pushed SHA. The `/pr` procedure generates a description
from the actual branch diff — it inspects the diff against the base,
determines size, and writes the four standard sections (Summary, Why,
Approach, Architecture and Contracts).

### Procedure

1. Navigate to the implementation worktree at the reviewed SHA.
2. Follow the `/pr` workflow: inspect branch state, base branch, log, and
   diff against the base; size the change; write the four standard sections
   based on the actual diff content.
3. The `/pr` output becomes the descriptive PR body. Do not recreate these
   sections — `/pr` derives them from the committed diff.
4. Append the augmented metadata supplement below the `/pr` body.

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
**Independent review**: `<sha>` — `<command>` — passed
**Risks**: <risk-or-none>
**Human merge authority required**

Closes #<issue>
```

Do not recreate the descriptive body sections that `/pr` generates from the
diff. The metadata section is a supplement, not a replacement body.
