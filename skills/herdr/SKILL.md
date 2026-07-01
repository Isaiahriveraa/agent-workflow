---
name: herdr
description: "Control herdr from inside it. Manage workspaces and tabs, split panes, spawn agents, read output, and wait for state changes — all via CLI commands that talk to the running herdr instance over a local unix socket. Use when running inside herdr (HERDR_ENV=1)."
---

# herdr — agent skill

**Pre-check**: `HERDR_ENV=1` must be set. If not, stop — you're not inside herdr.

**What this is**: herdr is a terminal-native agent multiplexer. Workspaces contain tabs, tabs contain panes. Each pane is a real terminal — shell, agent, server, log stream. CLI talks to the daemon over a unix socket.

**IDs**: workspace=`1`, tab=`1:1`, pane=`1-1`. IDs **compact** when tabs/panes close — never hardcode, always re-read from list/create responses.

**Agent statuses**: `idle`, `working`, `blocked`, `done`, `unknown`. `done` = agent finished, you haven't looked yet.

Full API: [socket api docs](https://herdr.dev/docs/socket-api/). Agent spawn recipes: [`AGENT-SPAWN-RECIPES.md`](./AGENT-SPAWN-RECIPES.md) (hardened patterns for spawning agents with specific models).

## Quick Reference

| Action | Command |
|--------|---------|
| List panes (find focused/neighbors) | `herdr pane list` |
| List workspaces | `herdr workspace list` |
| List tabs in workspace 1 | `herdr tab list --workspace 1` |
| Read pane output | `herdr pane read 1-1 [--source visible\|recent\|recent-unwrapped] [--lines N]` |
| Read ANSI (TUI feedback) | `herdr pane read 1-1 --ansi` |
| Wait for text in pane | `herdr wait output 1-3 --match "text" [--regex] --timeout MS` |
| Wait for agent status | `herdr wait agent-status 1-1 --status done --timeout 60000` |
| Split pane right (keep focus) | `herdr pane split 1-2 --direction right --no-focus` |
| Split pane down | `herdr pane split 1-2 --direction down --no-focus` |
| Run command in pane | `herdr pane run 1-1 "npm run dev"` |
| Send text (no Enter) | `herdr pane send-text 1-1 "text"` |
| Send key press | `herdr pane send-keys 1-1 Enter` |
| Close pane | `herdr pane close 1-3` |

### Tab Management

| Action | Command |
|--------|---------|
| Create tab (default name) | `herdr tab create --workspace 1` |
| Create named tab | `herdr tab create --workspace 1 --label "logs"` |
| Rename tab | `herdr tab rename 1:2 "logs"` |
| Focus tab | `herdr tab focus 1:2` |
| Close tab | `herdr tab close 1:2` |

### Workspace Management

| Action | Command |
|--------|---------|
| Create workspace | `herdr workspace create --cwd /path --label "name"` |
| Create (no focus) | `herdr workspace create --no-focus` |
| Focus | `herdr workspace focus 2` |
| Rename | `herdr workspace rename 1 "name"` |
| Close | `herdr workspace close 2` |

## Capturing New IDs

All create commands return JSON. Parse new IDs from responses:

```bash
# Split pane — new ID at result.pane.pane_id
NEW_PANE=$(herdr pane split 1-2 --direction right --no-focus | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')

# Workspace create — result.workspace, result.tab, result.root_pane
# Tab create — result.tab, result.root_pane
```

## Recipes

### Run server + wait for ready

```bash
NEW_PANE=$(herdr pane split 1-2 --direction right --no-focus | python3 -c 'import sys,json;print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEW_PANE" "npm run dev"
herdr wait output "$NEW_PANE" --match "ready" --timeout 30000
herdr pane read "$NEW_PANE" --source recent --lines 20
```

### Run tests in sibling pane

```bash
herdr pane split 1-2 --direction down --no-focus
herdr pane run 1-3 "cargo test"
herdr wait output 1-3 --match "test result" --timeout 60000
herdr pane read 1-3 --source recent --lines 30
```

### Check what another agent is doing

```bash
herdr pane list
herdr pane read 1-1 --source recent --lines 80
```

### Coordinate with agent — wait then read

```bash
herdr wait agent-status 1-1 --status done --timeout 120000
herdr pane read 1-1 --source recent --lines 100
```

### Spawn opencode agent (model-flagged)

See [`AGENT-SPAWN-RECIPES.md`](./AGENT-SPAWN-RECIPES.md) for hardened patterns. Key differences from `claude`:
- opencode has a rich TUI — use `sleep 5` instead of `wait output --match ">"`
- `pane run` may paste without submitting — always follow with `herdr pane send-keys PANE_ID Enter`
- Use `--model openai/gpt-5.4` flag

```bash
CURRENT=$(herdr pane list | python3 -c 'import sys,json;d=json.load(sys.stdin)["result"]["panes"];print([p["pane_id"] for p in d if p["focused"]][0])')
NEW=$(herdr pane split "$CURRENT" --direction right --no-focus | python3 -c 'import sys,json;print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEW" "opencode --model openai/gpt-5.4" && sleep 5
herdr pane run "$NEW" "your task here"
herdr pane send-keys "$NEW" Enter
herdr wait agent-status "$NEW" --status done --timeout 300000
herdr pane read "$NEW" --source recent --lines 100
```

## Notes

- **JSON on success**: `workspace list/create`, `tab list/create/get/focus/rename/close`, `pane list/get/split`, `wait output/agent-status`
- **Text on success**: `pane read` (not JSON). `pane send-text/send-keys/run` prints nothing.
- **Output sources**: `--source visible` (current viewport), `--source recent` (scrollback as rendered), `--source recent-unwrapped` (scrollback with soft wraps joined — same transcript `wait output` matches against)
- **Wait timeout**: Exit code 1 on timeout.
- **`--no-focus`**: Keeps your current pane focused during split/create. Always use when splitting from your active context.
- **`--label`**: Tab/workspace create applies the name immediately. Without it, tab gets numbered name, workspace gets cwd-based name.
- **`pane run` vs send-text vs send-keys**: `run` sends text + Enter; `send-text` sends text only; `send-keys` sends key presses like `Enter`.
