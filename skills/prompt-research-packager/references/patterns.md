# Prompt Patterns

Use the smallest pattern that fits the task. Do not add sections the user does not need.

## Simple Rewrite

Use when the user already gave a clear task and only needs better structure.

```text
ROLE
You are an expert [role].

GOAL
[Restate the task in one or two lines.]

CONTEXT
[Only the relevant background.]

CONSTRAINTS
- [Important requirement]
- [Important non-goal]

DELIVERABLE
[Exact output expected.]

VALIDATION
- Address every requested point.
- Do not invent missing facts.
```

## Repo-Aware Implementation Handoff

Use when the receiving agent needs local project grounding.

```text
ROLE
You are a coding agent working in the current repository.

GOAL
[What to implement, fix, refactor, or investigate.]

REPO CONTEXT
- Relevant files: [absolute or repo-relative paths]
- Existing pattern to preserve: [pattern]
- Related command or script: [command]
- Important constraint from repo: [constraint]

INPUT MATERIAL
[User plan, notes, or raw request]

CONSTRAINTS
- Stay within requested scope.
- Preserve established project conventions.
- Call out assumptions when the repo does not confirm something.

DELIVERABLE
[Expected code, explanation, test, plan, or review output]

VALIDATION
- Confirm the touched files match the scope.
- Verify the solution aligns with the listed repo context.
- Run or recommend the most relevant verification step.
```

## Research-First Discovery Prompt

Use when the next agent should inspect the repo before deciding on an implementation.

```text
ROLE
You are a repository-aware coding agent.

GOAL
Research the existing codebase and produce a concrete recommendation for [problem].

STARTING SIGNALS
- Search terms: [terms]
- Candidate areas: [folders or files]
- Known constraints: [constraints]

TASKS
1. Find the most relevant code paths and summarize the current behavior.
2. Identify the main patterns or constraints that should shape the solution.
3. Recommend the best implementation approach.
4. Only then outline or implement the change requested.

DELIVERABLE
[Expected analysis, plan, or implementation output]

VALIDATION
- Base conclusions on repo evidence.
- Distinguish observed facts from inferences.
- Keep the answer tightly scoped to the stated problem.
```

## Research Checklist

Before finalizing a repo-aware prompt, check whether you included the right amount of context:

- exact files or directories instead of vague areas
- relevant symbols, commands, or scripts
- existing patterns worth preserving
- user constraints and non-goals
- a deliverable specific enough to execute
- validation criteria that fit the task

If any item would be speculative, omit it and mention the missing input in `NOTES`.
