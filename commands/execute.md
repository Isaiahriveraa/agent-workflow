---
description: Compatibility wrapper that routes execution through implement_plan
---

# Execute

This command exists as a lighter ergonomic alias for `/implement_plan`.

Do not define a separate execution workflow here.
Always route execution behavior through `commands/implement_plan.md`.

## Required Behavior

1. If the user provides a plan path, treat it exactly as `/implement_plan [path]`.
2. If the user does not provide a plan path, ask for one using the same behavior as `/implement_plan`.
3. Follow `commands/implement_plan.md` as the authoritative execution contract.

## Autonomy Loop Gate
If you encounter a complex sequence of failures or ambiguous state transitions during execution, do not run blind retries.
Instead, explicitly consult the deterministic autonomy evaluator:
```bash
node $HOME/.agents/scripts/autonomy-tools.mjs evaluate --context "current failure or state"
```
Parse the JSON response to determine your `recommended_action` (e.g., continue, replan, capture_lesson).

## Relationship To Other Commands

- `/prime` — quick repo intake
- `/plan-feature` — lightweight focused planning
- `/create-plan` — full planning workflow
- `/execute` — alias to `/implement_plan`
- `/validate_plan` — post-execution validation
