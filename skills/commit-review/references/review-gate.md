# Pre-Commit Review Gate

Optional code-review pass before planning commits. Advisory only: it surfaces findings and never blocks or auto-fixes.

### When to run

Compute a fingerprint of the changes to be committed and compare it to the
last-reviewed marker stored at `.git/code-review.marker`.

* If the current fingerprint matches the marker, the exact changes were
  already reviewed — skip the gate and proceed to planning.
* Otherwise, run the review unless it is skipped (see SKILL.md).

### Fingerprint

Fingerprint the full change set that would be committed, including untracked
files so brand-new code is reviewed:

```bash
# include untracked files so new code is reviewed
git add -N <untracked files>
git diff HEAD | shasum -a 256
```

Compare the output to `.git/code-review.marker`. On a match, skip the gate.

After computing the fingerprint (and after any review), clear only the
intent-to-add entries so existing staging intent is preserved:

```bash
git reset -- <the intent-to-added files>
```

### Run the review

Invoke code-review scoped to the working-tree changes (`modified`), which
includes the intent-to-added untracked files. Pass `--no-revise` — the gate
must not edit code — and `--runner subagents`, so the gate stays in this
harness without asking; do NOT pass `--fix`; do NOT act on the verdict
automatically.

### Surface, do not decide

Present the code-review verdict and findings to the user. Do not auto-apply
fixes or revisions and do not block the commit on the verdict. The review is input to the
user's decision; the Phase 1 approval gate below remains the sole gate for the commit plan.

The user may:

* fix the findings and re-run the gate (the marker updates on the next pass),
  or
* proceed to planning and commit as-is with the findings acknowledged.

After a review completes, record the fingerprint in `.git/code-review.marker`
so unchanged work is not re-reviewed on a later commit.
