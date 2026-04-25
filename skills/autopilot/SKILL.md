---
name: autopilot
description: "Full autonomous execution pipeline from idea to working code. Triggers: 'autopilot', 'build me', 'I want a'. Runtime-only - requires OMX CLI/runtime."
---

# Skill: autopilot

**name:** autopilot

**description:** Full autonomous execution pipeline from idea to working code. Triggers: 'autopilot', 'build me', 'I want a'. Runtime-only — requires OMX CLI/runtime.

---

## Body

End-to-end autonomous pipeline that takes an idea and delivers working code with no user intervention between steps.

### Pipeline

```
idea → deep-interview → plan → implement → verify → deliver
```

### Step Breakdown

1. **Idea** — receive or extract the user's intent
2. **deep-interview** — clarify requirements, boundaries, constraints (Socratic questioning if needed)
3. **plan** — produce a full implementation plan with PRD and test spec
4. **implement** — execute the plan using appropriate agents and tools
5. **verify** — run verification checks (lint, typecheck, tests, build)
6. **deliver** — commit, report completion, provide final evidence

### Behavior Rules

- **No user intervention needed between steps** — autopilot owns the entire execution cycle
- If a step is blocked or ambiguous, autopilot resolves it autonomously before proceeding
- Escalates to user only for irreversible or materially branching decisions
- Verification failure triggers internal fix loop before reporting completion

### Scope Assumptions

Autopilot assumes it has full authority to:
- Read and write files within the working directory
- Invoke agents and tools as needed
- Run verification commands (lint, typecheck, tests, build)
- Create commits on completion

If any authority is restricted, autopilot reports the constraint and halts at the relevant step.

### Delivery Evidence

On completion, autopilot reports:
- Files changed/created
- Simplifications made
- Remaining risks or known gaps
- Verification results (tests passing, build clean, etc.)

### Runtime Availability Gate

This skill is **runtime-only**. It activates only when:
- OMX CLI/runtime is active (launched via `omx`)
- OMX session overlay/runtime state is available
- User explicitly invokes `omx ...` from the shell

In plain Codex sessions without OMX runtime, this skill will not activate. Use solo execution or other available modes instead.
