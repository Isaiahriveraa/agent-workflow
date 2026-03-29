---
description: Optimize a rough request internally and apply the cleaned prompt downstream
---

# Optimize Prompt

Use this command when the user wants the request cleaned up and applied, not when they want the rewritten prompt exposed as a visible artifact.
Internal prompt optimization for complex work may already happen automatically via `rules/common/prompt-optimization-routing.md`.

Use the `prompt-handoff-optimizer` skill to rewrite rough user input into a cleaner agent handoff.

## Default Behavior

- Optimize for agent task handoffs
- Prefer cross-provider-safe prompt patterns
- Use the cleaned-up prompt internally for the next step
- Return only a brief confirmation, status, or next action unless the user explicitly asks to see the rewritten prompt
- Keep simple requests compact
- For substantial requests, treat the cleaned-up request as the internal intake artifact that drives research and planning
- For creative or API-contract-heavy requests, select a capsule in the cleaned-up request
- If the input is already a structured handoff or optimized prompt, use it as-is and do not rewrite it again

## If The User Included Prompt Content

Rewrite it using the `prompt-handoff-optimizer` skill, then apply that version internally.
Do not emit the rewritten prompt block from this command.

## If The User Did Not Include Prompt Content

Ask them to paste the rough prompt or task request they want optimized.

Use this exact response:

```text
Paste the rough prompt or task request you want optimized, and I’ll rewrite it into a cleaner handoff for the main agent.
```

## Rewrite Rules

When optimizing the prompt:

- extract the goal, context, constraints, deliverable, and validation needs
- name the capsule when the task needs richer context assembly or critique
- separate instructions from raw content
- add negative constraints only when they reduce real failure risk
- prefer visible artifacts such as assumptions, checklists, or brief rationale over hidden reasoning requests
- use strict structure only when parseability matters
- split complex workflows into stages when one prompt would be fragile
- end complex prompts with a short validation loop

## Reference

If needed, load:

- `prompt-handoff-optimizer`
- `~/.agents/skills/prompt-handoff-optimizer/references/patterns.md`
