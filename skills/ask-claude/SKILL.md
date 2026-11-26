---
name: ask-claude
description: "Use when the user explicitly asks Claude for UI work or a second opinion. Clarifies the brief and does not design it here."
---

# Ask Claude

Claude owns UI design and implementation. When GPT is active, help the user explain what they want, then hand it to Claude; don't design or edit the UI yourself. For non-UI work, GPT stays in charge unless the user asks to switch.

Read these files relative to this skill before acting:

- UI request: [UI handoff](references/ui-handoff.md). Read this even if the user didn't name Claude.
- Choosing a Claude model or effort: [Model routing](references/model-routing.md). Explicit user choices win; otherwise choose the cheapest model that fits. Substantial UI work defaults to Opus medium.
- User asks for Claude's take or invokes this skill for a second opinion: [Second opinion](references/second-opinion.md). Make one read-only call, only with an explicit request. A UI request alone is not permission to call the tool or switch providers.
