---
description: Synchronize pending lessons and plans to the long-term memory store
---

# Sync Memory Workflow

**Purpose**: Safely and synchronously index newly learned lessons, patterns, and planning files without silently hijacking context in the background.

1. **Verify State**:
   - Confirm that there are un-synced lessons in `.planning/lessons/` (if the directory exists).
   
// turbo
2. **Execute Synchronous Flush**:
   - Run the explicit sync script:
   `node $HOME/.agents/scripts/memory-sync-tools.mjs flush all`

3. **Confirm Success**:
   - Read the console output to ensure the flush succeeded without errors.
   - Proceed to the next step in your parent command (e.g. `complete-milestone` or `pause-session`).
