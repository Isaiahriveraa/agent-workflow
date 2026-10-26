# Review Reporting

Read Step 9 for full reviews and findings structure. Observe-only runs read Step 13 as their terminal action and use Step 9 only for findings formatting, not as an extra workflow stage. Paths to templates are relative to the skill root.

### Step 9: Present the Review

With `--review-only`, the output is the Step 13 report instead of this presentation.

When `--no-revise` is set and `--fix` is absent, nothing was applied — present the adjudicated review as a read-only result. Otherwise present the adjudicated review together with what the revision and fixes changed. Read the template at `templates/review.md`, fill the placeholders, and emit the result.

Use this structure:
```text
Code review: {resolved scope}
Verdict: APPROVED | CHANGES_REQUESTED
Baseline: {passed checks} | {failed checks}
Candidates: {total} · Verified: {V} · Weakened: {W} · Rejected: {R}
Revisions: {A} applied · {P} reported · {B} blocked

## Critical

### {ID} — {title}
Evidence: `file:line` — `<exact code>`
Trigger: {specific trigger}
Trace: {short execution trace}
Impact: {observable failure}
Regression test: {smallest useful test}

## Important
...

## Suggestions
...

## Complexity Revision

### {ID} — {title}
Move: {revision move}
Files: {files and tests updated}
```

Omit empty severity sections. Omit the Complexity Revision section when nothing was applied.

For DESIGN Suggestions, show the kind, code/call-site evidence, concrete comprehension impact, and before/after remedy instead of a trigger, execution trace, or invented behavioral failure. Keep them in observe-only findings too; they count as Suggestions in the unchanged report contract. In the Complexity Revision section, include the accepted before/after, why it is easier to read, and checks actually run. Use the same design-finding fields when filling the template.

Findings are tagged by reviewer lens, so the review axes stay visible: A = behavioral correctness, B = contract/spec faithfulness (including requirements missing, scope creep, requirements implemented wrong), C = standards and maintainability (including documented repo standards and Fowler smells). This keeps the standards-vs-spec distinction from `review` without a separate skill.

Verdict rules:
- `APPROVED` — no verified Critical or Important findings and no diff-caused baseline failures.
- `CHANGES_REQUESTED` — at least one verified Critical or Important finding or one diff-caused baseline failure.

The verdict reflects what the review verified; applied revisions and fixes are shown separately.

Approval means only that no qualifying verified defect was found in the reviewed scope.

### Step 13: Review-Only Report (`--review-only --report <path>`)

Runs Steps 1, 2, and 4-7 and nothing else. The run must not edit, create, or delete any repository file. Writing `findings.md` and the report counts as the only output.

1. Write every adjudicated finding to `findings.md` beside the report, in the Step 9 structure, ranked most severe first. Include Suggestions too: the caller decides what to show first, so do not trim lower-severity findings.
2. Write the report to `<path>` in the exact format of `templates/review-report.md`, then reply with the same block as the final message.

Report rules:
- `verdict: CHANGES_REQUESTED` if and only if `critical + important > 0`. A diff-caused baseline failure counts as one important finding.
- `status: complete` after a full review. `blocked` if a required tool or spawn cannot run. `failed` if the review cannot complete.
- `findings:` must always name the findings file, even when there are no findings.
