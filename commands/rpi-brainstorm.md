---
description: Clarify vague engineering requests before research so RPI starts from a concrete direction
---

# RPI Brainstorm

Use this command when an engineering request is still too vague to research cleanly.

This is not a replacement for research. It is the pre-research clarification pass for RPI when the user has a direction but not yet a decision-ready problem statement.

## Purpose

`/rpi-brainstorm` should turn a fuzzy request into a concrete research brief:
- what problem is actually being solved
- what success looks like
- what constraints matter
- what options are on the table
- what direction should research validate next

The output is a short artifact that feeds directly into `research_codebase.md` or `/rpi`.

## When To Use

Use this command when one or more are true:
- the request is vague or under-specified
- multiple plausible approaches exist and the codebase research target is not obvious yet
- the user is asking design-direction questions before implementation details exist
- research would otherwise start with the wrong question

Do not use this command when:
- the user already knows what to build and only needs codebase understanding
- a concrete research artifact already exists
- the request is a lightweight operational fix

## Initial Response

If no task was provided, respond with:

```text
Describe the feature, workflow, or problem you want to shape.

I’ll turn it into a concrete engineering brief with:
1. the actual goal
2. constraints and non-goals
3. candidate approaches
4. the direction research should validate next
```

Then wait for input.

If the user already supplied the task, begin immediately.

## Workflow

### Step 1 — Clarify the Problem

Ask only the smallest set of questions needed to remove ambiguity. Prefer questions that change implementation direction:
- what outcome matters most?
- what constraints are real?
- what should explicitly stay out of scope?
- where does the user already suspect the solution should live?

Do not start codebase research yet unless a live code check is required to disambiguate an option.

### Step 2 — Frame the Options

Convert the request into 2-4 plausible implementation directions.

For each option, keep it short:
- approach
- why it might fit
- key tradeoff

Do not over-design. The goal is to choose a research direction, not to finish the plan.

### Step 3 — Produce a Research Brief

Write a brief artifact to the current project's `thoughts/intake/` directory. The artifact should contain:
- the clarified goal
- constraints
- non-goals
- candidate approaches
- recommended direction
- open questions for research
- a short section named `## Research Focus`

The artifact should be short and operational, not essay-like.

Use frontmatter that keeps the artifact recognizable:

```yaml
---
artifact_type: intake
intake_kind: brainstorm
substantial: true|false
recommended_next_phase: research
last_validated: YYYY-MM-DD
---
```

### Step 4 — Handoff Cleanly

Present a short summary:
- what was clarified
- what direction was chosen
- where the brief was saved

End with this exact standalone block using the saved artifact path:

```text
Next step

/research_codebase /absolute/path/to/intake.md
```

## Guardrails

- Do not skip straight into detailed implementation planning
- Do not pretend research is complete
- Do not create a second plan artifact format
- Do not bloat the artifact with speculative code detail
- Do not use brainstorming as a substitute for user decisions when a product choice is genuinely blocking
