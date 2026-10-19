# External Review Runners

Read only in the original harness for `--runner opencode` or `--runner omp`. Read the selected dispatch section, not both. Observe-only children start at `../SKILL.md` and never dispatch recursively. Shared communication rules remain in that entry point; hardening is in `hardening.md`, revision in `complexity-revision.md`, and the report contract in `reporting.md`.

## OpenCode Dispatch (Original Harness)

When the runner is `opencode` (from `--runner opencode`, or from the user's answer under `ask`), the review runs in an OpenCode agent in a Herdr tab, with the models configured in `~/.config/opencode/opencode.json`. The original harness keeps everything that writes code and follows Decision Authority and Communication.

Before dispatch, verify that the helper's generated review scope matches the selected scope. The current helper requests `modified` regardless of `--base`; do not use it for a different scope or silently substitute a working-tree review. Report that limitation and ask for a supported scope or runner instead.

1. Run the hardener (Step 3) in this harness first, so the delegated review sees the hardened diff.
2. `node ~/.agents/scripts/opencode-review.mjs preflight` — shows each check and the OpenCode models that will run. If `ready` is false, stop and show the failing checks. Do not fall back silently.
3. `node ~/.agents/scripts/opencode-review.mjs run --base <ref>` — opens a background tab without focus, starts OpenCode, waits until it settles, and prints one JSON result. Run it in the background and wait for its exit.
4. Act on the result:
   - `complete`: read `report.counts`, then read the findings file at `report.findings`. Show the user the findings by priority, not just the counts: the verdict and counts first, then every Critical and Important finding with its evidence, trigger, and impact, then each Suggestion as one line. Name the findings file in that message so the full detail stays one request away. Apply refactors per the complexity revision (Step 8). Report every behavior change or defect fix to the user and wait for their decision.
   - `blocked`: read the agent's pane with `herdr agent read <agent>` and report what it needs. Do not answer its dialogs yourself.
   - `failed`: report `reason` and `detail`. A failed run is never an approval.

The runner refuses to report success if the working tree changed during the review, and it rejects any report that does not match the contract.

## OMP Dispatch (Original Harness)

Use the same observe-only boundary and Step 13 report contract as OpenCode; do not restore or assume the existence of an OMP runner script.

1. Read the `herdr` skill before controlling Herdr. Verify `HERDR_ENV=1`, the installed `herdr` and `omp` binaries, and the installed CLI help for tab creation and OMP agent dispatch. If OMP or independent reviewer contexts are unavailable, report the blocker; never silently substitute another runner.
2. Create a run-specific prompt and report directory outside tracked repository files. Record the repository/worktree, exact selected scope, relevant rules, baseline commands, and report/findings paths. The prompt invokes this skill with that scope and `--review-only --report <absolute-path>`; it forbids hardening, fixing, revision, QA, and recursive runner dispatch. Do not include the implementer's reasoning.
3. Run the approval-aware hardener in the original harness, refresh the review inputs, and fingerprint the working tree before external review. Open a new Herdr tab in the target worktree and launch OMP using verified installed CLI syntax and the prompt file. Keep the original harness as the conversation owner.
4. Monitor lifecycle status; read the pane only for a blocker or concrete diagnostic. Do not answer the external agent's approval dialogs on the user's behalf.
5. On completion, verify the working-tree fingerprint is unchanged and validate the returned block using `parseReviewReport` from `scripts/opencode-review.mjs`. Confirm the expected findings file exists and read it. A missing, malformed, blocked, failed, or tree-modifying run is not an approval.
6. Return findings to the original main model. Present and apply them under the same approval boundaries as the local and OpenCode routes, then perform the original harness's verification and QA preparation. OMP does not implement the findings.
