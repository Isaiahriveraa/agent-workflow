---
name: gsd:memory-sync
description: Flush queued lesson captures into the shared mem0/LanceDB bridge or inspect memory readiness
argument-hint: "[status|recall <create-plan|implement-plan>]"
---

<objective>
Provide a provider-neutral entrypoint for the shared explicit memory parity layer.

Default behavior:
- no argument -> flush queued lesson captures for the current project
- `status` -> show memory backend readiness and continuity paths
- `recall <create-plan|implement-plan>` -> run advisory memory recall through the shared parity layer
</objective>

<execution_context>
- Preferred bridge script: `$HOME/.agents/scripts/memory-sync-bridge.mjs`
- Compatibility alias: `$HOME/.agents/scripts/codex-memory-bridge.mjs`
</execution_context>

<process>
1. If the argument is `status`, run:
   - `node $HOME/.agents/scripts/memory-sync-bridge.mjs status`
2. If the argument starts with `recall`, require a workflow stage and run:
   - `node $HOME/.agents/scripts/memory-sync-bridge.mjs recall --workflow-stage <create-plan|implement-plan>`
3. Otherwise run:
   - `node $HOME/.agents/scripts/memory-sync-bridge.mjs flush`
4. Report the script output directly.
</process>

<guardrails>
- Use the current project root as the working directory so the bridge resolves the correct runtime state and lesson queue.
- Do not invent separate memory-sync behavior outside the shared bridge script.
- If memory is disabled or unhealthy, report that clearly and point the user to the `status` mode.
- If the user requests `recall`, require `create-plan` or `implement-plan` explicitly; do not guess the workflow stage.
</guardrails>
