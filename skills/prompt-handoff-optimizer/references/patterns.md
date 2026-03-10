# Prompt Handoff Patterns

Use these patterns when the default structure in `SKILL.md` is not enough.

## Safe Translation Of The Source Rules

### 1. Constitutional prompting

Translate this into explicit constraints and anti-goals.

Use:

- what success looks like
- what must not happen
- what assumptions are forbidden

Avoid vague style instructions with no failure boundaries.

### 2. Chain-of-thought forcing

Do not ask for hidden reasoning.

Use visible substitutes:

- `ASSUMPTIONS`
- `KEY FACTS`
- `DECISION CRITERIA`
- `CHECKLIST`
- `BRIEF RATIONALE`

### 3. Structured output parsers

Use strict tags or headings only when parseability matters.

Example:

```xml
<answer>
  <main_point></main_point>
  <evidence></evidence>
  <conclusion></conclusion>
</answer>
```

### 4. Few-shot examples with reasoning

If the task is easy to misread, include one short example:

```text
EXAMPLE
Input: [task]
Brief rationale: [why this structure works]
Output: [result]
```

Keep rationale visible and brief.

### 5. System prompt separation

Separate role/rules from raw content.

Preferred split:

- `ROLE`
- `RULES`
- `TASK`
- `INPUT CONTENT`

### 6. Temperature control

Treat this as optional runtime advice, not a required prompt feature.

Suggested guidance:

- factual analysis: lower creativity
- code generation: lower creativity
- brainstorming: higher creativity

### 7. Prompt chaining

Split complex tasks into phases when the model must first understand before generating.

Use:

1. extraction
2. analysis
3. output generation

### 8. Validation loops

Close with explicit checks:

- addresses all requested items
- contains no contradictions
- matches required format

If any check fails, revise once before returning.

## Prompt Skeletons

## Coding Handoff

```text
ROLE
You are a senior coding agent working in an existing codebase.

GOAL
[Implement or modify the requested behavior.]

CONTEXT
[Relevant repo, files, current behavior, or constraints.]

CONSTRAINTS
- Preserve existing behavior unless explicitly changed
- Do not invent APIs that were not requested
- Keep changes scoped to the task

DELIVERABLE
[Code change, explanation, tests, or review output.]

VALIDATION
- Confirm the implementation matches the request
- Check for obvious regressions
- Verify output format matches the request
```

## Planning Handoff

```text
ROLE
You are planning implementation, not executing it.

GOAL
Produce a decision-complete plan for the task below.

CONTEXT
[Current state, constraints, related systems.]

CONSTRAINTS
- Do not implement the change
- Do not leave major technical decisions unresolved
- Call out assumptions explicitly

DELIVERABLE
A concise plan with key changes, test scenarios, and assumptions.

VALIDATION
- Covers scope, interfaces, risks, and tests
- Leaves no critical decision to the implementer
```

## Research Handoff

```text
ROLE
You are a research agent.

GOAL
Answer the question using the available sources.

CONTEXT
[Known background and source boundaries.]

PROCESS
1. Extract the relevant facts
2. Compare or analyze them
3. Produce the final answer

CONSTRAINTS
- Distinguish facts from assumptions
- Do not fabricate missing evidence

DELIVERABLE
A concise answer with sources or file references.

VALIDATION
- Every key claim is supported
- Open questions are called out clearly
```

## Rewrite Or Editing Handoff

```text
ROLE
You are an editor.

GOAL
Rewrite the content for the requested audience and purpose.

INPUT CONTENT
[Paste source text here]

CONSTRAINTS
- Preserve meaning
- Do not add new claims
- Keep the requested tone and length

DELIVERABLE
The rewritten text only, unless notes are requested.

VALIDATION
- Meaning preserved
- No unsupported additions
- Tone and length match the request
```
