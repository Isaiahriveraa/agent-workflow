# Independent Review

Read for local review or an external observe-only child. Setup is in `setup.md`; which reviewers run is decided in `triage.md`; specialist details are in `deep-review.md`. Preserve the shared independence rules in `../SKILL.md`.

### Step 4: Spawn the Selected Independent Reviewers

Dispatch only the reviewers triage selected, in parallel, in separate subagent contexts. When triage split a lens by concern, give each copy only its concern's file list in place of the full changed-files list. The prompts below are the per-lens templates.
They must not receive each other's output or the implementer's reasoning.

#### Reviewer A — Blind Behavioral Adversary

Reviewer A starts as close as practical to the Bun pattern: the patch is its primary context. It receives no task explanation and no implementation reasoning.

Spawn the `reviewer-behavioral` subagent — a registered agent type whose instructions live in `~/.agents/agents/reviewer-behavioral.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Baseline output: .git/code-review.baseline.txt
```

#### Reviewer B — Repository Contract Adversary

Spawn the `reviewer-contract` subagent — a registered agent type whose instructions live in `~/.agents/agents/reviewer-contract.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Minimal context: .git/code-review.context.txt
Baseline output: .git/code-review.baseline.txt
```

#### Reviewer C — Maintainability Adversary

Spawn the `reviewer-maintainability` subagent — a registered agent type whose instructions live in `~/.agents/agents/reviewer-maintainability.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Minimal context: .git/code-review.context.txt
```

### Step 6: Adjudicate All Candidate Findings

Reviewer output is not yet a code review. Treat every candidate as potentially wrong.

Skip this step when no reviewer returned a candidate finding. Otherwise spawn the `adjudicator` subagent — a registered agent type whose instructions live in `~/.agents/agents/adjudicator.md` — with full repository access. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Candidate findings:
{all reviewer and triggered-specialist findings verbatim}
```

The adjudicator receives none of the reviewers' hidden reasoning.

Apply the adjudication:
- Keep `VERIFIED` findings.
- Keep `WEAKENED` findings with corrected wording and reduced severity.
- Remove `REJECTED` findings completely.
- Merge only true duplicates while preserving all distinct evidence.

No candidate reaches the user, reviser, or fixer before adjudication.

### Step 7: Rank Verified Findings

Severity is determined by demonstrated impact and reachability, not reviewer confidence.

#### Critical
Use only for a realistic path to:
- authorization bypass or concrete data exposure
- data loss or irreversible corruption
- crash or severe availability failure
- broken core workflow with no usable fallback
- duplicate payment or another irreversible external action
- unsafe memory behavior with realistic reachability

#### Important
Use for:
- incorrect user-visible behavior
- failure on a supported boundary or edge case
- broken integration, compatibility, or persisted-state contract
- accumulating resource leak
- bounded but inconsistent durable state
- missing explicitly required behavior
- diff-caused compiler, type, or test failure

#### Suggestion

Design-only findings are ranked Suggestion: retain their kind, concrete comprehension/change-locality impact, and before/after evidence without inventing a trigger or behavioral failure. Only separately demonstrated behavioral impact can justify Important or Critical. These findings remain eligible for supervised revision even without `--fix`; `--no-revise` and observe-only mode still prohibit revision.
Use for a verified design-only finding as defined above, or a low-impact defect, narrowly limited defensive gap, or inconsistency with a concrete but small observable effect.

Do not include discussion-only architecture opinions in the default result. Include adjudicated readability/design problems, not personal taste.
