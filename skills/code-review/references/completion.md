# Human QA and Completion

Read only for full reviews after findings and any accepted changes are settled. Observe-only runs finish at Step 13 in `reporting.md`. Template paths are relative to the skill root.

### Step 10: Prepare the Human QA Pass (spawn qa-runner)

Not run with `--review-only`: the QA pass is prepared by the implementer's harness after changes are settled.

After all code changes are settled (including any revision or `--fix` pass), prepare the pass a human will run.

Spawn the `qa-runner` subagent — a registered agent type whose instructions live in `~/.agents/agents/qa-runner.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Scope: <resolved scope>
Design walkthrough: <design card path, or the task description and acceptance criteria>
Environment: <branch preview or dev deploy URL; otherwise ask it to report the blocker>
```

The qa-runner prepares the environment, test data, and a short numbered customer-path script plus one ugly path. It never clicks for the human and never approves.

Carry its output into Step 11 and the final report: the human runs the script and answers "would a customer be fine here?" — record `approved` or the findings. Findings become the next concern, each named with the step that produced it.

### Step 11: Completion

#### Clean review
```text
Review complete.
No verified Critical or Important findings remain in the selected scope.
Baseline checks pass.
Hardener: {n} scenarios tried, {n} reproduced, {n} fixed.
Reviser: {n} revisions applied, {n} reported.
QA pass prepared — run the Step 10 script and record the human verdict.
```

#### Remaining findings
```text
Review complete with remaining findings.
- {ID} — {title} — {reason it remains}
```

#### Blocked checks
```text
Review incomplete because required checks could not run.
- {command} — {external blocker}
```

Never hide blocked tests, unresolved verified findings, or a QA pass that could not be prepared.

### Step 12: Optional Artifact (`--artifact` or `--deep`)

Write a Markdown document only when `--artifact` is supplied or deep mode produced at least one verified finding. Use the template at `templates/review.md`, fill every `{placeholder}` with reconciled values from Steps 6-9, and include the hardener's scenario table (Step 3) and the QA script (Step 10) in the body.

Suggested filename:
```text
reviews/{YYYY-MM-DD}-{branch-or-scope}-code-review.md
```

Frontmatter:
```yaml
---
type: code-review
scope: <resolved scope>
status: approved | changes_requested
baseline: passed | failed | partial
verified_findings: <count>
weakened_findings: <count>
rejected_candidates: <count>
revisions_applied: <count>
review_mode: standard | deep
---
```

After writing the artifact, immediately run `pbcopy <absolute-path>` so the user's clipboard has the file path.

## Clipboard

After writing the code review artifact to disk at Step 12, immediately run `bash` with `pbcopy <absolute-path>` so the user's clipboard has the file path.
