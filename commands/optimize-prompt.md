---
description: Rewrite a rough request into a structured, high-signal prompt for the main agent
---

# Optimize Prompt

Use this command when the user wants the optimized prompt returned as a visible artifact.
Internal prompt optimization for complex work may already happen automatically via `rules/common/prompt-optimization-routing.md`.

Use the `prompt-handoff-optimizer` skill to rewrite rough user input into a cleaner agent handoff.

## Default Behavior

- Optimize for agent task handoffs
- Prefer cross-provider-safe prompt patterns
- Return a ready-to-use prompt plus brief notes
- Keep simple requests compact
- For substantial requests, treat the optimized output as the intake artifact that drives research and planning
- For creative or API-contract-heavy requests, select a capsule in the optimized output

## If The User Included Prompt Content

Rewrite it using the `prompt-handoff-optimizer` skill.

Return output in this shape unless the user asked for a different format:

```text
OPTIMIZED PROMPT
[rewritten prompt]

NOTES
- Assumptions: [...]
- Missing inputs: [...]
- Optional settings: [...]
- Capsule: [...]
```

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
