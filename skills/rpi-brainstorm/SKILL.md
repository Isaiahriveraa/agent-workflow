---
name: rpi-brainstorm
description: Clarify vague engineering requests before research by producing a concise intake brief with candidate approaches and a recommended research direction.
---

# rpi-brainstorm

Use this skill when a request is too vague to begin codebase research safely.

The job is to convert an ambiguous engineering ask into a concrete brief that can feed the normal RPI flow.

## Invocation

```text
/rpi-brainstorm [task or problem statement]
```

If no task is provided, ask:

```text
What should I clarify before research begins? Paste the feature, workflow, or problem statement.
```

## Workflow

### Step 1 — Remove the Highest-Impact Ambiguity

Ask concise questions only when they change the research direction:
- desired outcome
- hard constraints
- explicit non-goals
- preferred implementation shape, if any

Keep the clarification phase brief. The purpose is to select what research should validate, not to finish the architecture.

### Step 2 — Enumerate Plausible Directions

Produce 2-4 candidate approaches.

For each direction include:
- short label
- why it fits
- key tradeoff

Then recommend one direction for research to validate next.

### Step 3 — Write the Intake Brief

Write a concise artifact under the current project's `thoughts/intake/` directory.

Required frontmatter:

```yaml
---
artifact_type: intake
intake_kind: brainstorm
substantial: true|false
recommended_next_phase: research
last_validated: YYYY-MM-DD
---
```

Required sections:
- `## Clarified Goal`
- `## Constraints`
- `## Non-Goals`
- `## Candidate Approaches`
- `## Recommended Direction`
- `## Research Focus`

The `## Research Focus` section must tell the next research phase exactly what to validate in the codebase.

### Step 4 — Respond With a Clean Handoff

After writing the artifact, summarize:
- the ambiguity that was removed
- the recommended direction
- the absolute path to the intake brief

End with:

```text
Next step

/research_codebase /absolute/path/to/intake.md
```

## Guardrails

- Do not replace the normal research -> plan -> implement -> validate workflow
- Do not write a full plan here
- Do not invent codebase facts without verifying them later in research
- Keep the output short enough that the next phase can actually use it
