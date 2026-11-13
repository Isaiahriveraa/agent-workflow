# Routing

Pick the cheapest route that fits. Subagents are the default; everything else needs a reason.

| Route | Use when | Boundary |
| --- | --- | --- |
| Direct | Shared decision, unclear behavior, or work cheaper to do than to brief | Keep discussing, or execute as authorized |
| Subagent (default) | A bounded question, check, search, or edit inside one active concern | Retain the subagent/task ID; no overlapping writers |
| Herdr / isolated CLI worker | User explicitly asks for Herdr, panes, or a separate agent session, and the concern can run without current uncommitted changes | Own branch, worktree, pane, and CLI session; see `herdr.md` |

## Subagent selection (Claude Code)

Use the Agent tool for delegated work. Pick `subagent_type` by fit:

- `Explore` or `codebase-locator`: read-only fan-out search.
- `general-purpose`: multi-step research or an edit inside an approved file set.
- `reviewer-*`, `security-reviewer`, `adjudicator`: review roles. Do not alter their restricted inputs or output formats.
- `fixer` and `hardener`: apply or test an already-adjudicated change.

Set an explicit `model` per the token-saver tiering: haiku for mechanical run-and-report work, sonnet for search, reading, and test runs, opus for implementation, debugging, review, and synthesis. Escalate on weak results; do not start high by default.

## Concurrency

- Parallel subagents are fine when their file sets are disjoint and none consumes another's unfinished output.
- Serialize when a later task needs a finalized interface, schema, audit result, or artifact.
- Separate worktrees do not isolate shared databases, ports, or generated files. Serialize those or agree on separate resources.

## When to escalate to Herdr

Only when the user names it. A subagent that needs a separate long-lived session, or a worker that must survive the main conversation, is still a subagent unless the user asks for Herdr or a CLI pane. If unsure, propose the subagent route and ask.
