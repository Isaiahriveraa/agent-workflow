---
name: ch
description: Create a handoff document to resume work in a future session. Shorthand for the handoff skill — use when the user asks to create a handoff, save session context, or says "ch <description>".
argument-hint: "[description]"
disable-model-invocation: true
---
# Create Agent Handoff (ch)

Shorthand for invoking the `handoff` skill. Run it with an optional description for the handoff title:

- No description → let the handoff skill auto-generate the topic from context.
- With description → pass it as the description parameter (used in the handoff filename slug).

## Steps

1. Invoke the `handoff` skill at `~/.agents/skills/handoff/SKILL.md`.
2. Pass any description the user provided as the description parameter.
3. If invoked without a description, let the handoff skill auto-generate the topic.