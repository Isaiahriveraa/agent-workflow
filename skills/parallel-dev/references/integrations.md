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
- creating/removing worktrees and panes
- starting or resuming OMP
- sending input and reading output
- waiting for state transitions
- interpreting installed runtime integrations
- safely cleaning Herdr resources

Before any such operation, invoke `skill(name="herdr")` and follow its current instructions.

Do not embed a copied Herdr CLI manual here. The installed skill and binary can evolve.

## GitHub

GitHub is the team-facing work ledger.

Publish only approved issues. Use meaningful status labels:

```text
status:ready
status:in-progress
status:blocked
status:reviewing
status:human-review
status:done
```

Add issue comments only for meaningful milestones:

- implementation started
- blocked by another approved issue
- independent review started
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
