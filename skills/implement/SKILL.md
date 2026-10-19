---
name: implement
description: "Implement one selected behavior slice from its approved plan. Use when the user says 'implement this', 'build the next slice', or 'start implementation'; validate the queue and isolate the concern in its own worktree, never start from plan approval alone."
---

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

## Select and validate

For an explicitly requested small, unambiguous fix outside any queued initiative, describe its scope and test seam, then use its own worktree directly with the same TDD, checks, cleanup, review, behavior sign-off, and commit/PR approval steps as any other slice. Do not fabricate design, ticket, or plan artifacts. This exception never bypasses an existing queued item's matching approved-plan requirement; queued requests follow the strict selection and validation below.

For queued work, implement only on an explicit request, one concern at a time. An explicit ticket takes priority; otherwise use the unique contextual initiative and ask only for material ambiguity. Reconcile `context/issues/<slug>/000-index.md` against code, tests, and GitHub before running from the target git repository:

```sh
python3 ~/.agents/scripts/workflow.py select context/issues/<slug>/000-index.md
# Use --target <id> for an explicit item.
python3 ~/.agents/scripts/workflow.py check context/issues/<slug>/000-index.md --target <id> --plan <path> --base <ref>
```

Resolve an explicit issue or ticket path to its queue ID; never fall back to another item if that target is blocked. Automatically find the selected row's matching approved Plan. If absent, stop with the exact next step: `/plan <Ticket path or Issue>` to create/update it, or human review of its existing draft. Do not invent a plan or speculative implementation. Selection requires `ready`, all dependencies `done`, and no active PR. Check requires the matching row Plan, Ticket identity, `**Plan status:** approved`, full `**Planned at:**` SHA, and comma-separated `**In-scope files:**` paths with no in-scope Git drift against the intended base or current dirty work. The CLI cannot prove completion or safe parallel work; inspect active work and shared boundaries yourself.

Describe the selected outcome, approved plan, branch/worktree, base, and boundaries briefly. A clear local implementation request authorizes that described worktree for this concern; do not ask a redundant generic "proceed?". Published `/skill:issue-delivery` retains its separate exact-proposal approval before branch/worktree creation. A materially different scope/base, collisions, security-sensitive work, dependencies, and destructive changes retain their own approval gates. Use `~/.agents/scripts/new-worktree.sh` for one isolated concern. When invoked within `/skill:issue-delivery`, reuse its approved concern and validated worktree; do not reselect or create another worktree.

Before writing code, check the approved plan and the queue row's linked research for `**Status:** UNDECIDED` architecture choices, as defined in `/skill:research`. An undecided choice inside the plan's scope stops implementation: name its options and wait for the user's `**Chosen:**` answer. If that answer changes the approach, return the plan to review. Leave undecided choices outside the scope unresolved, and list them as deferred in the final report.

Resolve the original index and plan to absolute paths before changing directories. Keep ignored context at that original location, without copying it into the worktree or committing it. From the clean execution worktree, recheck its actual base before setting `in-progress` and coding:

```sh
python3 ~/.agents/scripts/workflow.py check /absolute/original-root/context/issues/<slug>/000-index.md --target <id> --plan /absolute/original-root/context/plans/<slice>/00-index.md --base HEAD
```

Row artifact paths resolve against the index owner's Git root; scope files resolve against execution cwd. The CLI rejects unrelated Git common directories. Update the original sole queue, not a worktree copy; validation against a dirty parent is not sufficient.

## Implement and review

Start with the selected user's or caller's outcome and the approved walkthrough.
Implement the smallest working path across the necessary UI, application, and
data boundaries; do not finish every frontend screen before connecting one real
flow. A chosen prototype guides the experience; it does not prove backend behavior.
Replace simulated effects with verified production behavior within the slice's
scope. If the experience reveals a material product gap, return it to design and
plan review instead of silently expanding the feature.

Use `/skill:tdd` for every production-code change; test-first is not optional. Work one behavior at a time: identify its public seam, write one focused test, run it, and confirm it fails for the missing behavior before making the smallest change. Repeat red to green before moving to the next behavior.
Tests describe caller-visible behavior. For data-handling code, use representative inputs and assert the expected returned, persisted, emitted, or displayed data and relevant errors or boundary behavior through public interfaces; derive expected values independently from the contract or a known example. Keep coverage proportionate to meaningful behavior and plausible regressions, not exhaustive permutations, tautologies, or internal implementation details.
For frontend changes, test the human interaction: operate accessible controls with realistic user actions and assert the visible result or data effect. Keep behavior tests; do not pin markup shape, classes, styles, snapshots, or internal state.

Implementation owns TDD → checks → cleanup → review. Run focused tests and typechecking regularly, then project-native tests, lint, typecheck, and build at the end. Record checks not run and why. When called by delivery, return this evidence so it can verify results without blindly repeating the pipeline.

After implementation and initial verification, run `/skill:code-judgment`, then `/skill:code-review` on the completed diff; do not skip it. Address verified findings, rerun affected tests and checks, and let the review apply its default complexity revision. The review runner follows code-review's Runner setting (asks by default; OpenCode runs `--review-only --report`); the hardener still runs here first.

Refresh affected cards, ticket, plan, research links, and originating queue after feedback and delivery. Record verified results and blockers: use `in-progress` while implementing, then `in-review` after local review while awaiting the human or integration. An active draft PR is never `done`. Only verified integrated behavior may mark `done`; do not equate local checks or a draft PR with completion.

On resume, preserve the original approved baseline and review the executor's expected diff; do not rerun the pre-execution readiness gate against an `in-progress` row as though it were untouched work, or rewrite the baseline merely to pass. Material scope/decision changes return to plan review.

After TDD → `/skill:code-judgment` → `/skill:code-review`, present the behavior walkthrough and verification for human approval. Commit through `/skill:commit` and prepare any PR through `/skill:pr`; each consults the `commit-pr-reviewer` subagent for approval before anything is committed, pushed, or opened. Never infer permission to merge, or start another queued ticket automatically.
Once implementation, verification, and review are complete, report back to the user using the **Implementation Mode** protocol in `references/communication.md` (What changed, Before -> After behavior walk, key decisions, failure boundaries, verification, and code details on request).
