# Decisions Context

Use this file as the canonical record for choices that must survive across planning, implementation, and validation.

## Decisions
- Keep this repo as the provider-agnostic single source of truth.
- Prefer cherry-picking external workflow improvements over converging on a Claude-first architecture.
- Apply an internal prompt-optimization pass for ambiguous, multi-step, workflow, handoff, or otherwise substantial requests before execution.
- Route substantial optimized tasks through research -> plan -> implement -> validate, while skipping the optimization pass for clear low-risk requests.
- Enforce substantial-task routing with a hard workflow gate instead of relying on discretionary policy alone.
- Use a scored readiness gate before planning or coding substantial work.
- Keep per-project runtime state as the live source of truth, with shared indexes and handoffs acting as discovery and transfer layers.
- Persist the optimized intake artifact alongside plan, research, session, and handoff selections in the active working set.
- Default context-pressure automation to checkpoint on warning and handoff on critical thresholds.

## Deferred Ideas
- Full convergence to a Claude Code-native repository shape
- Auto-injecting every learned note into future prompts by default
- Full global runtime registry replacing per-project live state

## Claude's Discretion
- Select the smallest set of rule cards and skills needed for the task.
- Use adapter-specific assets only when the active toolchain needs them.

## Open Questions
- None recorded in the shared starter.
