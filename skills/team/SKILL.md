---
name: team
description: "Coordinated team orchestration (tmux-based). Triggers: 'team', 'swarm', 'coordinated team', 'coordinated swarm'. Runtime-only - requires OMX CLI/runtime."
---

# Skill: team

**name:** team

**description:** Coordinated team orchestration (tmux-based). Triggers: 'team', 'swarm', 'coordinated team', 'coordinated swarm'. Runtime-only — requires OMX CLI/runtime.

---

## Body

Team mode for structured multi-agent work.

### Pipeline

```
team-plan → team-prd → team-exec → team-verify → team-fix
```

### When to Use

Use when multiple independent parallel lanes need coordinated execution. Appropriate when:

- Task decomposes into ≥3 independent subtasks
- Subtasks share state or require integration at the end
- Coordination, conflict resolution, or shared blockers are expected
- Durable staged coordination is worth the overhead

### Execution Rules

- **Leader** owns: mode selection, brief maintenance, verification, integration, stop/escalate calls
- **Workers** own: assigned slice execution, blocker reporting, scope-bound decisions only
- **Max 6 concurrent child agents** within a team pane
- Workers do NOT re-plan the whole task or switch modes on their own
- Workers escalate shared-file conflicts, scope expansion, and missing authority upward

### Mode Lifecycle

1. **team-plan** — scope decomposition, lane assignment, sequencing
2. **team-prd** — requirements and acceptance criteria per lane
3. **team-exec** — parallel implementation across lanes
4. **team-verify** — integration, cross-lane verification, evidence collection
5. **team-fix** — iteration loop when verification fails (can loop back to team-exec)

### Terminal States

- `complete` — all lanes verified, integration successful
- `failed` — hard blocker, no recovery path
- `cancelled` — user or leader called cancel

### Runtime Availability Gate

This skill is **runtime-only**. It activates only when:
- OMX CLI/runtime is active (launched via `omx`)
- OMX session overlay/runtime state is available
- User explicitly invokes `omx ...` from the shell

In plain Codex sessions without OMX runtime, this skill will not activate. Use solo execution or other available modes instead.
