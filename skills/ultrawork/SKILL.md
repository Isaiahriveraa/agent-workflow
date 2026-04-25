---
name: ultrawork
description: "High-throughput parallel agent execution. Triggers: 'ultrawork', 'ulw', 'parallel'. Runtime-only - requires OMX CLI/runtime."
---

# Skill: ultrawork

**name:** ultrawork

**description:** High-throughput parallel agent execution. Triggers: 'ultrawork', 'ulw', 'parallel'. Runtime-only — requires OMX CLI/runtime.

---

## Body

Maximum parallelism execution mode. Fires all available specialist agents simultaneously to complete a task as fast as possible.

### Core Behavior

- **Aggressive decomposition** — one task per agent
- **Fire all agents at once** — no sequential gating
- **Does not stop until all sub-tasks complete**
- All results merge into a final report before returning

### Execution Model

```
task input
  → decompose into N independent subtasks
  → fire N specialist agents in parallel
  → collect results
  → merge and deliver
```

### Specialist Agents (simultaneous)

| Agent | Role |
|---|---|
| `explore` | Fast codebase search and mapping |
| `librarian` | Documentation and knowledge lookup |
| `oracle` | Strategy and decision guidance |
| `executor` | Implementation and refactoring |
| `verifier` | Completion evidence and validation |

Additional agents spawned as needed based on task decomposition.

### Ecomode Variant

ultrawork includes an **ecomode** variant for cost-aware execution:
- Uses lighter models for independent exploratory subtasks
- Reserves frontier models for high-complexity implementation
- Falls back gracefully on rate-limit errors
- Configured via `OMX_DEFAULT_SPARK_MODEL` and `OMX_DEFAULT_FRONTIER_MODEL`

Trigger: 'ecomode', 'eco', 'budget'

### Stop Condition

All subtasks complete (verified) OR user calls cancel.

### Constraints

- Max 6 concurrent agents per ultrawork session (matching team mode limit)
- Subtasks must be genuinely independent — do not parallelize tasks with shared mutable state without coordination
- For tasks requiring shared-state coordination, use `team` mode instead

### Runtime Availability Gate

This skill is **runtime-only**. It activates only when:
- OMX CLI/runtime is active (launched via `omx`)
- OMX session overlay/runtime state is available
- User explicitly invokes `omx ...` from the shell

In plain Codex sessions without OMX runtime, this skill will not activate. Use solo execution or other available modes instead.
