# Output Quality Gate

Use this rule to prevent substantial creative work and high-judgment API work from skipping differentiation, evidence, and critique setup.

## When To Trigger

Run this gate when one or more are true:
- the request is a redesign, landing page, UX overhaul, or other creative generation task
- the task is API design or integration work where examples, failure modes, or contract correctness matter
- the user explicitly wants a non-generic, next-level, or materially better result

## Required Inputs Before Planning Or Implementation

- selected capsule
- task brief or intent summary
- relevant examples or reference pack
- anti-patterns or banned failure modes
- critic rubric or grading criteria

If these inputs are missing, gather them before coding.

## Minimum Creative Gate

For creative work, require:
- objective
- audience
- visual direction
- references
- banned patterns
- success criteria

## Minimum API Gate

For API workflow tasks, require:
- interface or contract target
- reference examples or prior art
- known edge cases and failure modes
- verification plan

## Completion Rule

Do not consider the task complete until the result has passed a critic or eval pass appropriate to the task class.
