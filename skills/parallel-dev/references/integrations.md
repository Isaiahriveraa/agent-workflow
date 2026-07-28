# Integration Contracts

## `to-plan`

Use `to-plan` when no implementation-ready plan exists or when validation finds stale paths, missing architecture, undefined interfaces, absent verification, or unsafe dependency ambiguity.

Every accepted plan must include:

- current and target behavior
- repository-grounded architecture and data flow
- affected paths/modules and shared contracts
- implementation sequence
- testing and verification gates
- dependency and parallel-execution section
- Mermaid dependency graph
- likely ownership overlap
- recommended execution waves

`to-plan` must not publish issues, launch agents, create branches, or create PRs.

## `to-issues`

Use `to-issues` only after plan validation.

Required outputs:

- Markdown issue drafts
- authoritative YAML execution manifest
- matching Mermaid dependency graph
- decomposition analysis
- ownership/collision analysis
- execution waves

Every issue must define:

- why
- target behavior
- scope
- out of scope
- acceptance criteria
- verification
- dependencies and reasons
- plan references
- likely files/modules
- collision and parallelism notes
- pending human owner and execution mode

After human approval, `to-issues` publishes only approved GitHub issues. It must not publish before approval.

## Official `herdr` skill

The official `herdr` skill is the only authority for:

- checking whether the agent is inside Herdr
- discovering current workspaces, panes, agents, and worktrees
- creating/removing worktrees, workspaces, and panes
- starting or resuming OMP
- sending input and reading output
- waiting for state transitions
- interpreting installed runtime integrations
- safely cleaning Herdr resources

Before any such operation, invoke `skill(name="herdr")` and follow its current instructions.

Do not embed a copied Herdr CLI manual here. The installed skill and binary can evolve.

### Workspace management

For parallel-dev execution, workspaces isolate worker groups. Create one workspace
per worker batch (up to `workers_per_space` per workspace) and label it `workers-N`:

- `herdr workspace create --cwd <repo-root> --label "workers-1"` — returns
  `workspace`, `tab`, and `root_pane` IDs in JSON.
- The `root_pane` is the first terminal in the workspace. Use it for the first worker,
  then split new panes from it for subsequent workers.
- List all workspaces: `herdr workspace list`.
- Close a workspace: `herdr workspace close <workspace_id>`.
- Workspace lifecycle belongs to the commander, never to individual workers.

### Cross-pane messaging

Workers send STATUS messages to the commander pane using `herdr pane send-text` followed by `herdr pane send-keys Enter`. The commander's pane id is recorded in `.herdr/state.yaml` per worker (`issues.<key>.herdr_resources.commander_pane_id`) and is passed to the worker via the worker context packet.

The commander sends the `VERIFICATION_PASSED` handshake to the worker pane using the same transport after commander verification passes.

Pane IDs are global (`<workspace_id>-<pane_id>`); the same transport works across workspaces. Always re-list pane IDs before sending; they compact when tabs or panes close.

**Send a STATUS line (worker → commander):**

```bash
COMMANDER_PANE_ID="1-1"  # from .herdr/state.yaml
herdr pane send-text "$COMMANDER_PANE_ID" "STATUS session-contract IMPLEMENTING - starting sub-agent decomposition"
herdr pane send-keys "$COMMANDER_PANE_ID" Enter
```

**Send the VERIFICATION_PASSED handshake (commander → worker):**

```bash
WORKER_PANE_ID="1-3"            # from .herdr/state.yaml
VERIFIED_SHA="abc1234"          # from worker STATUS ... READY_FOR_REVIEW
BASE="main"                     # approved base branch
BRANCH="issue-142-session-contract"
TITLE="Define shared session-state contract (#142)"
herdr pane send-text "$WORKER_PANE_ID" "VERIFICATION_PASSED. Proceed to PR: run skill(pr-workflow) /pr from the implementation worktree at $VERIFIED_SHA, then gh pr create --draft --base $BASE --head $BRANCH --title \"$TITLE\" --body-file <body>, then send STATUS session-contract DRAFT_PR_OPENED <sha> <pr_url> to me."
herdr pane send-keys "$WORKER_PANE_ID" Enter
```

**Parse STATUS from the commander's pane output:**

```bash
herdr pane read "$COMMANDER_PANE_ID" --source recent --lines 200 | \
  grep -E '^STATUS [a-z0-9-]+ (IMPLEMENTING|BOSS_REVIEW|CHANGES_REQUESTED|COMMITTING|VERIFYING|READY_FOR_REVIEW|DRAFT_PR_OPENED|DONE|BLOCKED) [a-f0-9]+|.+'
```

The commander never sends a STATUS line for a worker; only the worker emits STATUS for its own issue. The commander forwards parsed STATUS to the user in chat and records the latest phase in `.herdr/state.yaml`.

### OMP spawn recipe

Spawn each worker with the approval-time model and thinking. The model fields come from the approval packet and are persisted in the committed manifest under the `models` block.

```bash
WORKER_MODEL="openai-codex/gpt-5.6-luna"  # from .herdr/manifest.yaml models.worker_model
WORKER_THINKING="high"                   # from .herdr/manifest.yaml models.worker_thinking
herdr pane run "$NEW_PANE" "omp --model $WORKER_MODEL --thinking $WORKER_THINKING"
sleep 10
herdr pane run "$NEW_PANE" "<worker context packet including boss protocol and commander_pane_id>"
herdr pane send-keys "$NEW_PANE" Enter
```

The commander is the user's current OMP session and uses whatever model that session is configured for. There is no `commander_model` field in the packet.

## GitHub

GitHub is the team-facing work ledger.

Publish only approved issues. Use meaningful status labels:

```text
status:ready
status:in-progress
status:blocked
status:human-review
status:done
```

There is no `status:reviewing` label — there is no separate independent reviewer pane. Commander verification happens inside the commander's own session and is reflected via `status:in-progress` until the draft PR is opened.

Add issue comments only for meaningful milestones:

- implementation started
- blocked by another approved issue
- commander verification started
- draft PR opened
- human changes requested
- PR merged

Do not mirror terminal output or every agent transition.

### Tooling

Use the `gh` CLI for GitHub operations. Prefer single‑purpose commands and parse returned JSON:

| Operation | Command |
|-----------|---------|
| Create issue | `gh issue create --title "…" --body "…" --label "status:ready" --json number,url` |
| Assign owner | `gh issue edit <number> --add-assignee <login>` |
| Add label | `gh issue edit <number> --add-label "status:in-progress"` |
| Add comment | `gh issue comment <number> --body "…"` |
| Open draft PR | `gh pr create --draft --title "…" --body-file <pr-body-file> --base <branch> --head <branch> --json number,url` |
| Check PR status | `gh pr view <number> --json state,merged,mergeCommit` |
| Detect merge | Poll `gh pr view <number> --json merged` — when `merged` is `true`, the merge is confirmed. |

Parse returned JSON with `python3 -c 'import sys,json; print(json.load(sys.stdin)…)'` or the tool's built‑in JSON output. Persist returned numbers and URLs into the committed manifest. Never hardcode issue or PR numbers.

The worker pane owns the `gh pr create --draft` call. The commander never opens a PR.

Do not mirror terminal output or every agent transition in GitHub comments.

## Git

Workers may:

- edit only approved scope
- commit and push only their assigned branch

Workers may not:

- merge
- modify the base branch
- rebase unrelated branches
- force-push without explicit commander authorization
- delete remote branches

The commander may perform control-plane Git operations but never feature-code edits.
