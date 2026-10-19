## Design behavior evaluations

`evals.json` contains three design-only tasks and semantic expectations:

- Checkout: ownership alternatives, concurrent stock protection, and an uncertain remote payment outcome with one production adapter.
- Schema evolution: unresolved historical ownership, all writers, mixed application versions, constraints, backfill, and recovery.
- Routine pagination: extend the existing owner and test behavior without adding architectural ceremony.

To compare revisions, preserve the old skill before editing. Run each prompt in independent fresh sessions with the old and revised skill, including only that version's relevant references. Give the executor the prompt, not its grading expectations. Save each answer separately; do not implement the hypothetical application.

Use `skill-creator` to grade answers against the expectations with quoted evidence and generate its review viewer. A keyword match is not sufficient: a migration plan that says “compatible” but leaves old writers able to violate the new invariant should fail the corresponding expectation. Inspect correctness beyond the rubric too.

These are small qualitative regression cases, not proof of architecture quality or skill-trigger accuracy. Report the number of runs and any shared-context contamination. If timing or token usage is unavailable, leave it unreported rather than inventing measurements. Do not claim a percentage improvement from a single run per case.
