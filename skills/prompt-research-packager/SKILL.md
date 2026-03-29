---
name: prompt-research-packager
description: Package rough plans, scattered notes, and half-formed agent requests into an execution-ready prompt strengthened with local codebase research. Use when the user wants to optimize a prompt for another CLI agent such as Codex or Claude, turn brainstorming into a structured handoff, gather relevant repository details before writing the prompt, or produce a better task package without changing the requested goal.
---

# Prompt Research Packager

## Overview

Turn messy planning input into a cleaner prompt for another agent to execute. Strengthen the prompt with targeted local codebase evidence so the receiving agent starts with better file references, constraints, and implementation context.

Default for this skill:

- Optimize for terminal agent handoffs, not generic copy polish
- Research the local repository before finalizing the prompt when codebase context would materially help
- Preserve the user's real goal and intent
- Add structure, acceptance criteria, and relevant file references only when they improve execution
- Use the rewritten prompt internally unless the user explicitly asks to see it
- Keep simple requests short

## Workflow

### 1. Distill the real ask

Extract:

- end goal
- raw materials the user already provided
- target agent or environment if stated
- constraints and non-goals
- desired output shape
- what needs evidence from the repo

Do not silently change scope. If the request is broad, package it into a clearer brief rather than inventing a different project.

### 2. Research only what strengthens the handoff

Inspect the local codebase before writing the final prompt when any of these are true:

- the user references an existing feature, file, bug, flow, or architecture
- implementation details, naming, scripts, or paths would help the next agent
- the request could drift without repo-specific grounding

Prefer fast local evidence gathering:

- `rg --files` to map relevant directories
- `rg -n` to find symbols, config, routes, scripts, and domain terms
- `sed -n` or `cat` to read only the most relevant files
- repo docs and agent docs when they affect execution

Avoid broad repo tours. Gather only the details that improve the prompt.

### 3. Convert research into prompt-ready context

Summarize only high-signal findings such as:

- exact file paths
- component, service, script, or command names
- current patterns to preserve
- constraints discovered in docs or config
- obvious risks, unknowns, or dependencies

Do not dump raw grep output into the final prompt. Convert it into compact context another agent can use immediately.

### 4. Build the prompt in explicit sections

Use short labeled sections unless the user wants a different format:

- `ROLE`
- `GOAL`
- `REPO CONTEXT`
- `INPUT MATERIAL`
- `CONSTRAINTS`
- `DELIVERABLE`
- `VALIDATION`

Use stricter structure only when the task is fragile or parse-sensitive.

### 5. Add concrete validation

End the prompt with visible checks the receiving agent can satisfy, for example:

- confirm the changed files match the requested scope
- preserve existing patterns found in the repo
- explain assumptions instead of inventing missing facts
- run or recommend the most relevant verification step

Keep validation short and operational.

## Output Contract

Only return the rewritten prompt in this shape when the user explicitly asks to see it:

```text
OPTIMIZED PROMPT
[ready-to-paste prompt for the target CLI agent]

CODEBASE SIGNALS
- [relevant file, pattern, or command]
- [relevant file, pattern, or command]

NOTES
- Assumptions: [...]
- Missing inputs: [...]
- Optional tighten-ups: [...]
```

If the input is already a clear structured handoff or optimized prompt, preserve it and do not recursively rewrite it.

Rules:

- Put the final prompt first
- Keep `CODEBASE SIGNALS` limited to evidence that materially improves execution
- Keep `NOTES` short
- If no repo research was needed, omit `CODEBASE SIGNALS`

## Prompt Writing Rules

- Preserve the user's goal, tone, and hard constraints
- Replace vague language with operational language
- Prefer concrete deliverables over abstract advice
- Separate user-provided content from instructions to the receiving agent
- Add non-goals when they prevent common failure modes
- Do not ask for hidden reasoning or chain-of-thought
- Do not bloat the prompt with generic best-practice filler

## Research Boundaries

- Prefer local repository evidence over assumptions
- Prefer primary project sources over speculation
- Say when a detail is inferred rather than directly observed
- If the repo does not support the requested context, keep the prompt generic and call out the missing inputs
- Do not fabricate file paths, commands, owners, or architecture decisions

## Reusable Patterns

For ready-made prompt shapes and research checklists, read:

- [references/patterns.md](references/patterns.md)

Load only the pattern that matches the task.

## Example Triggers

- "Package this messy implementation idea into a better Codex prompt."
- "Take my plan, inspect the repo, and give me a stronger Claude prompt."
- "Turn these notes into an agent handoff and include the relevant files."
- "Research this codebase first, then rewrite my request so another CLI agent can execute it."
