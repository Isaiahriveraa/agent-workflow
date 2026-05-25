---
description: Clarify vague engineering requests so Discover lands on a concrete direction
---

# RPI Brainstorm

Use this command when an engineering request is still too vague to enter the Discover phase cleanly.

This is not a replacement for Discover. It is the pre-Discover clarification pass when Yonie has a direction but not yet a decision-ready problem statement.

## Purpose

`/rpi-brainstorm` should turn a fuzzy request into a concrete brief that feeds the Discover phase:
- what problem is actually being solved
- what success looks like
- what constraints matter
- what options are on the table
- what direction to validate next

The output is a short artifact that feeds directly into Discover → Research.

## When To Use

Use this command when one or more are true:
- the request is vague or under-specified
- multiple plausible approaches exist and the codebase research target is not obvious yet
- Yonie is asking design-direction questions before implementation details exist
- research would otherwise start with the wrong question

Do not use this command when:
- Yonie already knows what to build and only needs codebase understanding
- a concrete brief already exists
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

### Step 3 — Caveman Big Picture First

Before writing anything, load the caveman skill and explain the direction in 2-4 terse sentences:
- "We need to decide X before we can build Y"
- "The main options are A (fast but brittle) and B (slower but flexible)"
- "I think we should research A first because of Z"

Ask: "Does that sound right before I write this up?"

### Step 4 — Produce a Research Brief

Only after Yonie confirms the high-level direction, write a brief artifact to the current project's `thoughts/intake/` directory. The artifact should contain:
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
