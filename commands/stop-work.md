---
description: Pause, stop, complete, or clear project-local execution state safely
---

# Stop Work

Use this command to end or pause execution explicitly instead of leaving stale continuation state behind.

## Process

1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Read the active execution state with `node ~/.agents/scripts/execution-state-tools.mjs read`.
3. Run `node ~/.agents/scripts/execution-state-tools.mjs advise` to see remaining tasks and whether cleanup is actually needed.
4. Choose the correct lifecycle transition:
   - pause: `node ~/.agents/scripts/execution-state-tools.mjs pause --reason "[reason]"`
   - stop: `node ~/.agents/scripts/execution-state-tools.mjs stop --reason "[reason]"`
   - complete: `node ~/.agents/scripts/execution-state-tools.mjs complete --reason "[reason]"`
   - clear: `node ~/.agents/scripts/execution-state-tools.mjs clear`
5. Preserve enough metadata to explain why execution ended before clearing state.
6. Keep `state.md` authoritative for workflow state even when execution JSON is paused or cleared.

## Non-Negotiables

- Do not hard-delete execution state when pause/stop/complete metadata is still useful.
- Do not clear plan context unless the user explicitly wants stale execution removed.
- Do not treat `stop` and `complete` as the same state.
