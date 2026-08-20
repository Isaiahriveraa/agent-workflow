# herdr — Agent Spawn Recipes

Collection of reliable patterns for spawning agent panes with specific models,
sending them tasks, and collecting results. These are hardened from real usage
— the cookbook approach is more reliable than guessing each time.

## Quick Reference

| Goal | Pattern |
|------|---------|
| Spawn omp agent with model | `herdr pane run PANE_ID "omp --model openai-codex/gpt-5.6-luna --thinking high"` |
| Spawn opencode agent | `herdr pane run PANE_ID "opencode --model anthropic/claude-sonnet-4"` |
| Wait for OMP to initialize | `sleep 10` |
| Wait for work to finish | `herdr wait agent-status PANE_ID --status done --timeout 600000` |
| Read output | `herdr pane read PANE_ID --source recent --lines 200` |

---

## Recipe 1: Spawn an omp Agent With a Specific Model

This is the core pattern. `omp` is the supported worker runtime and has
native Herdr integration for agent lifecycle reporting.

### Background

`omp` launches an interactive terminal UI by default. Allow it to initialize
before sending the task; do not rely on a shell prompt or output matching.

### Steps

```bash
# 1. Get your current pane ID
MY_PANE=$(herdr pane list | python3 -c 'import sys,json; d=json.load(sys.stdin)["result"]["panes"]; print([p["pane_id"] for p in d if p["focused"]][0])')

# 2. Split to the right (stays in your current pane)
NEW_PANE=$(herdr pane split "$MY_PANE" --direction right --no-focus | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')

# 3. Launch omp with a specific model
herdr pane run "$NEW_PANE" "omp --model openai-codex/gpt-5.6-luna --thinking high"

# 4. Wait for the interactive OMP UI to initialize
sleep 10

# 5. Send the query
herdr pane run "$NEW_PANE" "Your task query here"
herdr pane send-keys "$NEW_PANE" Enter

# 6. Wait for completion
herdr wait agent-status "$NEW_PANE" --status done --timeout 600000

# 7. Read the results
herdr pane read "$NEW_PANE" --source recent --lines 200
```

## Recipe 1b: Spawn an OpenCode Agent

`opencode` is fully supported by Herdr (full-lifecycle integration plugin) and is
the default worker CLI in the parallel-dev skill. The model flag is
optional: `opencode --model <provider>/<model>`; omit it to use your opencode
default model.

```bash
# 1. Get your current pane ID
MY_PANE=$(herdr pane list | python3 -c 'import sys,json; d=json.load(sys.stdin)["result"]["panes"]; print([p["pane_id"] for p in d if p["focused"]][0])')

# 2. Split to the right (stays in your current pane)
NEW_PANE=$(herdr pane split "$MY_PANE" --direction right --no-focus | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')

# 3. Launch opencode (model optional)
herdr pane run "$NEW_PANE" "opencode --model anthropic/claude-sonnet-4"

# 4. Wait for the TUI to initialize
sleep 10

# 5. Send the query
herdr pane run "$NEW_PANE" "Your task query here"
herdr pane send-keys "$NEW_PANE" Enter

# 6. Wait for completion (plugin-reported agent status, like omp)
herdr wait agent-status "$NEW_PANE" --status done --timeout 600000

# 7. Read the results
herdr pane read "$NEW_PANE" --source recent --lines 200
```

Alternative: `herdr agent start opencode --kind opencode --pane "$NEW_PANE"` for
the managed-agent path (readiness handled by herdr; no sleep needed).

---
---
## Recipe 2: Full Chain Command (One-shot)

All-in-one bash script. Use this when you want to fire and forget.

```bash
CURRENT_PANE=$(herdr pane list | python3 -c '
import sys,json
d=json.load(sys.stdin)["result"]["panes"]
print([p["pane_id"] for p in d if p["focused"]][0])
')

MODEL="openai-codex/gpt-5.6-luna"

QUERY="Read the file at some/path.md and critique it. Identify gaps and issues.
Then modify the file to fix any problems found. Be thorough."

# Chain: split → launch agent → wait → send query → submit
NEW_PANE=$(herdr pane split "$CURRENT_PANE" --direction right --no-focus | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])') && \
echo "Pane: $NEW_PANE" && \
herdr pane run "$NEW_PANE" "omp --model $MODEL --thinking high" && \
sleep 10 && \
herdr pane run "$NEW_PANE" "$QUERY" && \
herdr pane send-keys "$NEW_PANE" Enter && \
echo "=== Query sent to $NEW_PANE ==="
```

To then wait and read results:

```bash
herdr wait agent-status "$NEW_PANE" --status done --timeout 600000 && \
herdr pane read "$NEW_PANE" --source recent --lines 200
```

---

## Recipe 3: Spawn an Agent and Check Back Later

Fire-and-forget pattern — useful for long-running tasks.

```bash
# Launch
MY_PANE=$(herdr pane list | python3 -c '
import sys,json; d=json.load(sys.stdin)["result"]["panes"];
print([p["pane_id"] for p in d if p["focused"]][0])')
NEW_PANE=$(herdr pane split "$MY_PANE" --direction right --no-focus | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEW_PANE" "omp --model openai-codex/gpt-5.6-luna --thinking high"
sleep 10
herdr pane run "$NEW_PANE" "Your long task description"
herdr pane send-keys "$NEW_PANE" Enter
echo "Agent spawned in pane $NEW_PANE"

# ... do other work ...

# Check back later
herdr pane list  # see if status is "done"
herdr pane read "$NEW_PANE" --source recent --lines 200
```

---

## Recipe 4: Wait for Agent Completion With Timeout

```bash
# Returns immediately if already done, blocks until done or timeout
if herdr wait agent-status "$NEW_PANE" --status done --timeout 600000; then
  echo "=== Agent finished ==="
  herdr pane read "$NEW_PANE" --source recent --lines 150
else
  echo "=== Agent still working or timed out ==="
  herdr pane read "$NEW_PANE" --source recent --lines 30
fi
```

---

## Recipe 5: Check Agent Status Via Script

```bash
check_agent() {
  local pane_id=$1
  herdr pane list | python3 -c "
import sys,json
d=json.load(sys.stdin)['result']['panes']
for p in d:
    if p['pane_id'] == '$pane_id':
        print(f\"Status: {p['agent_status']}\")
"
}

# Usage
check_agent w65299eff6919fc-2
# → "Status: working" or "Status: done" or "Status: idle"
```

---

## Model Reference

| Model String | Description |
|---|---|
| `openai-codex/gpt-5.6-luna` | Luna 5.6 (default worker; use with `--thinking high`) |
| `openai/gpt-5.4` | OpenAI GPT-5.4 |
| `openai/gpt-4.7` | OpenAI GPT-4.7 |
| `anthropic/claude-sonnet-4` | Claude Sonnet 4 |
| `anthropic/claude-opus-4` | Claude Opus 4 |
| `google/gemini-2.5-pro` | Gemini 2.5 Pro |

Usage: `omp --model openai-codex/gpt-5.6-luna --thinking high`
OpenCode: `opencode --model anthropic/claude-sonnet-4` (same provider/model strings; no `--thinking`)
---

## Pitfalls & Gotchas

1. **`pane run` may paste without submitting in agent panes**
   - Some agent CLIs treat `pane run` pasted text differently than a raw shell
   - Always follow with `herdr pane send-keys PANE_ID Enter` to guarantee submission

2. **Pane IDs change when tabs close**
   - Always re-read pane IDs from `herdr pane list` — don't hardcode them
   - IDs compact when other panes/tabs are closed

3. **Agent status lifecycle**
   - `idle` → agent is alive, waiting for input
   - `working` → agent is processing a task
   - `done` → agent finished, results ready to read
   - `blocked` → agent needs user input (waiting for you)

4. **`--no-focus` is critical**
   - Without it, focus jumps to the new pane and your terminal gets disrupted
   - Always pass `--no-focus` when splitting from your active pane

5. **Queries with special characters**
   - Use single-quoted heredocs or escaped strings for multi-line queries
   - Avoid unescaped `$`, backticks, and quotes in inline strings

6. **Readiness wait pattern varies by agent**
   - For `omp` and other TUI agents, use `sleep 10` after launch (Luna 5.6 may need extra initialization)
   - For `opencode` (TUI) the same `sleep 10` applies; it reports agent status via the herdr integration plugin
   - For non-interactive CLIs, use `herdr wait output PANE_ID --match "ready" --timeout 30000`

## Example: Complete Working Automation

This is the exact pattern verified to work with `omp`:

```bash
CURRENT_PANE="w65299eff6919fc-1"  # from herdr pane list

# Step 1: Split
NEW_PANE=$(herdr pane split "$CURRENT_PANE" --direction right --no-focus | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')

# Step 2: Launch omp with Luna 5.6 at high thinking
herdr pane run "$NEW_PANE" "omp --model openai-codex/gpt-5.6-luna --thinking high"

# Step 3: Wait for the interactive OMP UI to initialize
sleep 10

# Step 4: Send query + submit
herdr pane run "$NEW_PANE" "Read the latest handoff in the plan server for this project and critique it. Modify the plan file if needed."
herdr pane send-keys "$NEW_PANE" Enter

# Step 5: Wait for completion (10 min timeout for high-thinking Luna)
herdr wait agent-status "$NEW_PANE" --status done --timeout 600000

# Step 6: Read results
herdr pane read "$NEW_PANE" --source recent --lines 200
```
