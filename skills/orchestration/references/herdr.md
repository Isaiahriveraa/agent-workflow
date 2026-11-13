# Herdr and Isolated CLI Workers

Load this file only when the user explicitly names Herdr, panes, or a separate agent session. Otherwise use `routing.md`.

## Gate

1. Read the `herdr` skill before controlling Herdr.
2. Confirm `HERDR_ENV=1`. If it is unset, stop and report; do not control external panes.
3. Confirm the assignment is approved (see `assignment.md`). Dispatch nothing before that.

Without Herdr, subagents remain available. Do not control panes the orchestrator did not create.

## Preflight

Inspect raw Git status and the worktree inventory. Choose and record an explicit committed start point that actually supports the assignment; do not assume `HEAD` excludes unrelated committed work. Check for shared databases, ports, and generated files.

Write a run manifest with: mode (research, implementation, verification, audit-only, draft conversion, publication), the approved assignment and limits, exact source paths and commit, the durable output root, expected child reports, and barriers.

Create each approved concern's worktree with the existing helper, run from its repository:

```bash
bash ~/.agents/scripts/new-worktree.sh <type/concern> <approved-start-point>
```

Use the returned absolute path as the worker's cwd. Keep the coordinator's cwd and pane unchanged. Use the user's requested CLI kind; otherwise propose one supported by `herdr agent` help. Do not install dependencies or change permissions to start a worker without approval.

## Layout

Show the layout before mutating Herdr state:

```text
Workspace: <label>
├── Tab: <tab label>
│   ├── Pane: <concern-a>
│   └── Pane: <concern-b>
└── Tab: <tab label>
    └── Pane: <concern-c>
```

- **Workspace**: genuinely independent context, repository, project, or initiative.
- **Tab**: shared project context, lifecycle, dependency chain, or review audience.
- **Pane**: one independently reasoned concern.
- Prefer one concern per pane. Use `--direction down` past three or four concerns so panes stay usable.
- Name every workspace, tab, and pane with a short kebab-case label.
- Keep workers unfocused (`--no-focus`). The coordinator keeps the user's focus.

## Splitting and dispatch

```bash
herdr pane split --current --direction right --ratio 0.5 --cwd "$WORKTREE_DIR" --no-focus
```

Use the `.result.pane.pane_id` it returns. Never infer IDs from order. Always pass an explicit worker cwd.

Write each concern file to the run directory:

```text
context/orchestration/<run-id>/
├── manifest.md
├── status.md
├── concern-a.md
├── logs/
└── reports/
```

Each concern file uses the contract in `assignment.md` plus: approved start commit, absolute worktree path, worker identity, applicable repository instructions, required checks, and absolute log and report paths. Tell the worker to append meaningful progress to its log, write its report before signaling completion, and make no commits, publishes, merges, or extra workers.

```bash
herdr agent start <stable-name> --kind <approved-kind> --pane <returned-pane-id>
herdr agent prompt <stable-name> \
  "Read <absolute-run-directory>/<stable-name>.md, then carry out only that approved assignment."
```

Check the installed CLI help first. Omit `--wait` on prompt submission. Confirm with a fresh `herdr agent list` that the worker reaches `working`; a stale `idle` right after startup is not failure. Save worker and pane IDs in `manifest.md`.

## Monitoring

Use `herdr agent list` for lifecycle state. Use `herdr agent wait <name> --until idle --timeout 120000` only in a host-managed background watcher, never in the foreground or in a polling loop. Read a pane only for `blocked`, `failed`, `unknown`, or a concrete diagnostic.

Notifications are hints, not proof:

```bash
herdr notification show "Search fix ready for review" \
  --body "Report: <absolute-report-path>" --sound done
```

Have the worker write its report first, then notify. Never inject unsolicited text into a busy coordinator pane.

Answer worker questions with focused follow-up prompts when the worker is ready. A changed acceptance criterion, a new concern, or a permission dialog goes back to the user.

## Boundaries

Leave worker branches, worktrees, and panes intact after review. Do not auto-merge, cherry-pick, commit, publish, or clean up. Ask before closing user-owned Herdr state, changing permissions, adding dependencies, or any destructive action.
