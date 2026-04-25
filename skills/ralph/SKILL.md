---
name: ralph
description: "Persistence loop until 100% completion with verification. Triggers: 'ralph', \"don't stop\", 'must complete', 'keep going'. Runtime-only - requires OMX CLI/runtime."
---

# Skill: ralph

**name:** ralph

**description:** Persistence loop until 100% completion with verification. Triggers: 'ralph', "don't stop", 'must complete', 'keep going'. Runtime-only — requires OMX CLI/runtime.

---

## Body

Self-referential persistence loop for completing tasks with rigorous verification.

### Core Behavior

**Never stops until task is verified complete.**

### Planning Gate

Before implementation begins, both of these must exist:
- `.omx/plans/prd-*.md` — product requirements document
- `.omx/plans/test-spec-*.md` — test specification

Until both exist, ralph does not begin implementation or execute implementation-focused tools.

### Continuous Verification Cycle

```
implement → verify → fix → repeat
```

1. **Implement** — execute assigned work
2. **Verify** — run verification checks (lint, typecheck, tests, build)
3. **Fix** — address any failures found
4. **Repeat** — continue until verification passes

### Escalation Policy

Escalates to user **only** on:
- Irreversible destructive actions
- Materially branching decisions requiring explicit consent
- Missing authority that blocks all recovery paths

Does NOT escalate for:
- Recoverable failures with a clear fix path
- Scope expansion requests (can be handled within the loop)
- Shared-file conflicts (leader resolves)

### Stop Conditions

- Task is verified complete (all todos done, verification clean)
- User says stop/cancel
- Hard blocker with no recovery path remains after escalation

### Runtime Availability Gate

This skill is **runtime-only**. It activates only when:
- OMX CLI/runtime is active (launched via `omx`)
- OMX session overlay/runtime state is available
- User explicitly invokes `omx ...` from the shell

In plain Codex sessions without OMX runtime, this skill will not activate. Use solo execution or other available modes instead.

### State Management

- Write state on start
- Update state on phase or iteration change
- Mark inactive with `completed_at` on completion
- Clear state on cancel/abort cleanup

### Output Contract

- Default update shape: current mode; action/result; evidence or blocker/next step
- Keep rationale once; do not restate the full plan every turn
- Expand only for risk, handoff, or explicit user request
