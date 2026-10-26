# Complexity Revision and Fixes

Read only in the original harness when Step 8 applies. Shared approval and communication rules live in `../SKILL.md`; include them in every writer's context. Do not load for an observe-only child.

Apply **Preserve implementation ownership** from `../SKILL.md` to both defect
fixes and design revisions below. When the main agent owns implementation edits,
keep specialists in proposal-only mode for those files. The main agent evaluates
and applies accepted proposals, updates affected callers and tests, and runs the
same checks and fresh adversarial validation. Otherwise the specialist implements
the accepted proposal under the supervision steps below.

### Main-Model Supervision of Complexity Revision

Specialization gives the reviser responsibility, not unquestioned authority. Neither model size nor confidence proves a proposal correct; use repository evidence and software-design principles.

1. **Propose before editing.** Dispatch the reviser in proposal-only mode first: no file edits. Ask for the finding addressed, proposed structural move, affected callers and tests, why complexity decreases, evidence that observable behavior stays the same, and checks that will verify it. For an internal interface change, include two candidate designs and why the alternative lost, as required by the reviser's instructions.
2. **Evaluate independently.** The original main model checks the proposal against the actual code, adjudicated finding, acceptance criteria, and `codebase-design` principles. Look for mistaken assumptions, missed callers, shifted complexity, speculative abstractions, and unsupported behavior-preservation claims. Acknowledge a sound proposal and authorize that specific refactor; do not approve merely because the specialist recommended it.
3. **Push back with evidence.** If the proposal is flawed or unclear, name the concrete issue and request a corrected proposal or supporting evidence before edits. Keep ordinary technical corrections between the main model and reviser. If a meaningful disagreement remains after a focused clarification, stop that revision and present the alternatives, evidence, tradeoff, and recommendation to the user. Behavior changes and uncertainty about behavior preservation follow the user-approval boundary immediately.
4. **Implement only the accepted proposal.** Continue the reviser with the accepted scope and the same approval boundaries. It must report deviations or newly discovered behavior changes before applying them. Acceptance of a proposal is not permission for unrelated cleanup.
5. **Inspect the actual result.** The main model reads the applied delta and affected callers/tests, checks that it matches the accepted proposal and preserves behavior, and reads the verification output. A completion summary alone is insufficient. Redirect defects within the accepted scope for correction; escalate new behavior decisions or unresolved disagreements instead of silently expanding scope. Keep the fresh adversarial validation in Step 8; supervision does not replace it.

Briefly summarize accepted improvements and verification to the user. Do not require the user to referee minor implementation corrections or narrate the entire model-to-model exchange.

### Step 8: Apply the Complexity Revision and Feedback

Not run with `--review-only`: revision and fixes are applied by the implementer's harness from the report (see OpenCode Dispatch in `external-runners.md`).

The complexity revision runs by default. Skip it only with `--no-revise` — the commit gate passes it so review never edits code at commit time.

Apply in order:

First apply Decision Authority and Communication: obtain approval for each behavior-changing fix and include that approval in the writer's context. Refactoring needs no routine approval, but any uncertain or behavior-changing revision is returned as a proposal, not applied.

1. **With `--fix`, fix defects first.** Spawn the `fixer` subagent — a registered agent type whose instructions live in `~/.agents/agents/fixer.md` — via a `task` subagent. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same items:

```text
Findings (verified and weakened):
{adjudicated findings with adjudicator evidence}

Task acceptance criteria:
{acceptance criteria}

Relevant repository rules:
{repository rules}

Baseline output:
{current baseline output}
```

2. **Revise readability and design (default).** When verified design findings exist, follow Main-Model Supervision of Complexity Revision: first spawn the `complexity-reviser` in proposal-only mode, evaluate its proposal, then continue it to implement only the accepted revision. The registered agent's instructions live in `~/.agents/agents/complexity-reviser.md`. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt. If no subagent dispatch is available, report revision blocked rather than silently replacing independent specialist work with the parent's self-review. Pass an explicit mode with the same context:

```text
Design findings (verified and weakened):
{adjudicated design findings with adjudicator evidence}

Readability scope:
{evidenced intent/effect naming, call-site comprehension, control flow, or module-design problems and their before/after; preserve precise domain/framework vocabulary and useful deep modules, without banned-word rules or speculative wrappers}

Mode: proposal-only (no file edits); await the original main model's acceptance before implementation.
Proposal requirements and approval boundaries:
{Main-Model Supervision of Complexity Revision and Decision Authority and Communication}

Diff scope and acceptance criteria:
{resolved scope and acceptance criteria}

Relevant repository rules:
{repository rules}

Baseline output:
{current baseline output}
```

When no verified design findings exist, skip the spawn and report zero revisions.

The reviser removes complexity from the diff with behavior-preserving moves. It may reshape internal interfaces, but only by updating every caller and test in the same change; anything that would change product-observable behavior or the acceptance criteria is reported, not applied.

After applying changes, the original main model first inspects the actual delta and affected callers/tests against the accepted proposal, correcting or escalating discrepancies under the supervision rules above. Then:
1. run each new or updated regression test
2. rerun relevant compiler, type-checker, formatter, and linter commands
3. regenerate the patch against the original review base
4. spawn one fresh blind adversarial reviewer on only the applied delta, using a generic subagent if necessary; provide the relevant repository rules and finding-kind evidence requirements, not the reviser's rationale or parent's approval. Check behavioral preservation and concrete comprehension/design regressions. If independent dispatch is unavailable, report validation blocked, not passed
5. adjudicate any new candidate from that review

Do not automatically enter an unbounded cycle. A second application pass is allowed only when the fresh validation review identifies a new verified Critical or Important issue caused by the applied changes. Stop after two passes and report anything remaining.
