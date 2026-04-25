---
name: cancel
description: "Cancel active modes and workflows. Triggers: 'cancel', 'stop', 'abort'."
---

# Cancel Skill

**name:** cancel
**description:** "Cancel active modes and workflows. Triggers: 'cancel', 'stop', 'abort'."

## Cancellation Protocol

When the user triggers cancel, stop, or abort — stop all active workflows, background tasks, and execution modes immediately.

### Steps

1. **Identify active modes**
   - Check for any running agent loops (`ralph`, `ultrawork`, `autopilot`, `team`)
   - Enumerate background tasks via `background_list`
   - Inspect `.omx/state/` for active runtime state

2. **Terminate active execution**
   - Cancel all background tasks with `background_cancel --all=true`
   - End any active agent sessions
   - Stop ongoing build/test/watch processes

3. **Clean up runtime state**
   - Remove or mark inactive all `.omx/state/` entries (set `completed_at` or `cancelled_at`)
   - Clear `.omx/notepad.md` session notes if present
   - Do NOT remove plans, logs, or project memory — only active runtime state

4. **Mark pending work as cancelled**
   - Update any todo items in progress to `cancelled` status
   - Record cancellation timestamp in state

5. **Verify no orphaned processes**
   - Confirm background task list is empty
   - Confirm no lingering tmux panes or subprocesses

### Confirmation Guard

**Do NOT cancel while recoverable work remains.**
If there is meaningful progress in flight or pending tasks that could complete successfully:
- Ask the user: "Cancelling will discard current work. Confirm?"
- Proceed only on explicit confirmation.
- Cancellation of destructive operations requires explicit user consent.

### Output

Report:
- What was cancelled (modes, tasks, processes)
- State cleanup performed
- Confirmation that no orphaned processes remain
