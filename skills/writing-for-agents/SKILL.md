---
name: writing-for-agents
description: "Use when writing SKILL.md, AGENTS.md, or a handoff another agent must follow. Checks routing. Prose style stays with writing."
---
# Writing for agents

Use the [writing skill](../writing/SKILL.md) for plain language and its “Instructions a machine follows” checklist. Apply these extra checks to instructions an agent must discover and execute:

- **Check discovery before rewriting the body.** Name the task that triggers the instruction, not just its topic. Say when a neighboring skill owns the task if the two are easy to confuse.
- **Keep the common path short.** Link detail from the step where it becomes necessary. State the condition for opening the linked file and what it answers. Keep unconditional requirements on the common path.
- **Make the next move clear.** Name the canonical artifact, required inputs, and what counts as done. For a meaningful branch, say what the agent should do when the condition is true. Separate a missing prerequisite from a decision that needs human approval.
- **Check the cold read.** Walk one realistic request from the description through completion and one from the nearest neighboring task. Check that a fresh agent would load the right instructions, know what to do next, and know when to stop.

For an implementation handoff, point to the approved plan. Include only execution context it does not already supply; do not copy the plan or reopen its decisions.

Adapted from [Matt Pocock's writing-for-agents skill](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-for-agents).
