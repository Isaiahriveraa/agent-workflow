# herdr — Agent Spawn Recipes

Collection of reliable patterns for spawning agent panes with specific models,
sending them tasks, and collecting results. These are hardened from real usage
— the cookbook approach is more reliable than guessing each time.

## Quick Reference

| Goal | Pattern |
|------|---------|
| Spawn opencode agent with model | `herdr pane run PANE_ID "opencode --model openai/gpt-5.4"` |
| Wait for TUI to initialize | `sleep 5` (can't match a prompt string — opencode has a rich TUI) |
| Send query + submit | `herdr pane run PANE_ID "QUERY"` then `herdr pane send-keys PANE_ID Enter` |
| Wait for work to finish | `herdr wait agent-status PANE_ID --status done --timeout 300000` |
| Read output | `herdr pane read PANE_ID --source recent --lines 100` |

---

## Recipe 1: Spawn an opencode Agent With a Specific Model

This is the core pattern. Works for `opencode` (the TUI agent — NOT plain `claude`).

### Problem

`opencode` uses a rich terminal UI (not a simple `>` prompt). The existing
"spawn a new agent" recipe in SKILL.md assumes `claude` which outputs `>`
when ready. With opencode you cannot `wait output --match ">"` because the
TUI doesn't print a shell prompt.

### Solution — sleep-based wait

```bash
# 1. Get your current pane ID
MY_PANE=$(herdr pane list | python3 -c 'import sys,json; d=json.load(sys.stdin)["result"]["panes"]; print([p["pane_id"] for p in d if p["focused"]][0])')

# 2. Split to the right (stays in your current pane)
NEW_PANE=$(herdr pane split "$MY_PANE" --direction right --no-focus | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')

# 3. Launch opencode with a specific model
herdr pane run "$NEW_PANE" "opencode --model openai/gpt-5.4"

# 4. Wait for the TUI to initialize (cannot match a prompt — use sleep)
sleep 5

# 5. Send the query (this pastes text + presses Enter, but opencode TUI
#    may only paste without submitting — always follow up with send-keys)
herdr pane run "$NEW_PANE" "Your task query here"
herdr pane send-keys "$NEW_PANE" Enter

# 6. Wait for completion
herdr wait agent-status "$NEW_PANE" --status done --timeout 300000

# 7. Read the results
herdr pane read "$NEW_PANE" --source recent --lines 100
```

---

## Recipe 2: Full Chain Command (One-shot)

All-in-one bash script. Use this when you want to fire and forget.

```bash
CURRENT_PANE=$(herdr pane list | python3 -c '
import sys,json
d=json.load(sys.stdin)["result"]["panes"]
print([p["pane_id"] for p in d if p["focused"]][0])
')

MODEL="openai/gpt-5.4"

QUERY="Read the file at some/path.md and critique it. Identify gaps and issues.
Then modify the file to fix any problems found. Be thorough."

# Chain: split → launch agent → wait → send query → submit
NEW_PANE=$(herdr pane split "$CURRENT_PANE" --direction right --no-focus | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])') && \
echo "Pane: $NEW_PANE" && \
herdr pane run "$NEW_PANE" "opencode --model $MODEL" && \
sleep 5 && \
herdr pane run "$NEW_PANE" "$QUERY" && \
herdr pane send-keys "$NEW_PANE" Enter && \
echo "=== Query sent to $NEW_PANE ==="
```

To then wait and read results:

```bash
herdr wait agent-status "$NEW_PANE" --status done --timeout 300000 && \
herdr pane read "$NEW_PANE" --source recent --lines 100
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
herdr pane run "$NEW_PANE" "opencode --model openai/gpt-5.4"
sleep 5
herdr pane run "$NEW_PANE" "Your long task description"
herdr pane send-keys "$NEW_PANE" Enter
echo "Agent spawned in pane $NEW_PANE"

# ... do other work ...

# Check back later
herdr pane list  # see if status is "done"
herdr pane read "$NEW_PANE" --source recent --lines 100
```

---

## Recipe 4: Wait for Agent Completion With Timeout

```bash
# Returns immediately if already done, blocks until done or timeout
if herdr wait agent-status "$NEW_PANE" --status done --timeout 300000; then
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
| `openai/gpt-5.4` | OpenAI GPT-5.4 (latest) |
| `openai/gpt-4.7` | OpenAI GPT-4.7 |
| `anthropic/claude-sonnet-4` | Claude Sonnet 4 |
| `anthropic/claude-opus-4` | Claude Opus 4 |
| `google/gemini-2.5-pro` | Gemini 2.5 Pro |

Usage: `opencode --model openai/gpt-5.4`

---

## Pitfalls & Gotchas

1. **`pane run` doesn't always submit in opencode TUI**
   - opencode's TUI treats `pane run` pasted text differently than a raw shell
   - Always follow with `herdr pane send-keys PANE_ID Enter` to guarantee submission

2. **Cannot `wait output --match ">"` for opencode**
   - opencode has a rich TUI — no simple shell prompt
   - Use `sleep 5` after launching instead

3. **Pane IDs change when tabs close**
   - Always re-read pane IDs from `herdr pane list` — don't hardcode them
   - IDs compact when other panes/tabs are closed

4. **Agent status lifecycle**
   - `idle` → agent is alive, waiting for input
   - `working` → agent is processing a task
   - `done` → agent finished, results ready to read
   - `blocked` → agent needs user input (waiting for you)

5. **`--no-focus` is critical**
   - Without it, focus jumps to the new pane and your terminal gets disrupted
   - Always pass `--no-focus` when splitting from your active pane

6. **Queries with special characters**
   - Use single-quoted heredocs or escaped strings for multi-line queries
   - Avoid unescaped `$`, backticks, and quotes in inline strings

---

## Example: Complete Working Automation

This is the exact pattern verified to work:

```bash
CURRENT_PANE="w65299eff6919fc-1"  # from herdr pane list

# Step 1: Split
NEW_PANE=$(herdr pane split "$CURRENT_PANE" --direction right --no-focus | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')

# Step 2: Launch
herdr pane run "$NEW_PANE" "opencode --model openai/gpt-5.4"

# Step 3: Wait for TUI
sleep 5

# Step 4: Send query + force submit
herdr pane run "$NEW_PANE" "Read the latest handoff in the plan server for this project and critique it. Modify the plan file if needed."
herdr pane send-keys "$NEW_PANE" Enter

# Step 5: Wait
herdr wait agent-status "$NEW_PANE" --status done --timeout 300000

# Step 6: Read
herdr pane read "$NEW_PANE" --source recent --lines 100
```
