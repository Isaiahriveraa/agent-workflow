---
name: plan
description: Plan the next available behavior slice or an explicit ticket against current code. Use when the user says "plan this" or "plan the next slice"; stop for human plan review, never start implementation automatically.
argument-hint: "[issue number, local ticket path, or ticket to plan]"
shell-timeout: 20
---

# Plan One Ticket

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

Plan one selected ticket against the current repository. This is just-in-time technical planning, not another product-design or backlog-decomposition stage. The ticket owns the problem, current behavior, desired behavior, and acceptance criteria; the plan explains a safe, proportionate way to implement and verify that outcome.

## When to use

- A published GitHub issue or local ticket draft has been selected for implementation.
- The user asks for a technical plan before starting a specific behavior change.

Do not plan an entire design bundle, initiative, or backlog. For unclear product behavior, return to `/design`; for a decision-record issue, use `/issue-discovery`. Keep a small fix's plan correspondingly short, not exempt from the selected ticket's approval gate.

## Input and preflight

An explicit GitHub issue number/URL, local ticket path, or ID takes priority. Otherwise resolve the unique contextual initiative; ask only for material ambiguity. Reconcile its queue against current code, tests, and GitHub before running from the target git repository:

```sh
python3 ~/.agents/scripts/workflow.py select context/issues/<slug>/000-index.md
# For an explicit ticket:
python3 ~/.agents/scripts/workflow.py select context/issues/<slug>/000-index.md --target <id>
```

Resolve an explicit issue or ticket path to its queue ID; never fall back to another item if that target is blocked. Read the complete selected ticket and relevant published comments. Confirm a concrete problem, current behavior, desired behavior, and observable acceptance criteria. Selection requires `ready`, all dependencies `done`, and no active PR; the CLI cannot prove completion or safe parallel work. If tickets do not exist, choose the next not-implemented design outcome by dependencies and default priority and use `/skill:to-issues` to draft the necessary local ticket as preparation authorized by this plan request, not permission to publish. Review it against agreed intent before marking it ready; do not bypass unresolved behavior decisions. If no item is eligible, report the blocker instead of planning another scope.

Treat the ticket as the product contract. Verify its current-behavior claims against the repository where practical. If code contradicts the ticket, acceptance is ambiguous, or a material product/security decision is unresolved, stop and return the exact discrepancy instead of silently rewriting the ticket or choosing an outcome.

## Planning work

Begin with the user's outcome and one action-to-result walkthrough before naming
modules. Work backward to required data, server-enforced rules, returned results,
and consequential failures; omit irrelevant categories for non-UI work. Link any
chosen prototype and observations, distinguishing simulated behavior from verified
capability. Do not require a prototype when the behavior is already clear.

For new or materially changed backend capabilities, work through the frontend's
data and actions with the user before settling the approach: what must be read or
saved, what the server must enforce, the recommendation, and meaningful tradeoffs.
Resolve material choices together; do not defer that conversation to a finished
plan. Reuse prior agreement and keep routine implementation details out of it.
An agreed UI direction can proceed directly to production implementation once
requested and approved; a prototype or separate demo is not a prerequisite.

If experience uncertainty changes acceptance, return to `/design` or discovery
prototyping rather than guessing. If feasibility or a costly-to-reverse decision
is uncertain, investigate it before committing to the approach. Scale planning to
that risk, not the size of the feature list; do not wait for an entire frontend.

1. **Inspect the relevant code.** Trace the current behavior through the owning modules, callers, configuration, and tests. Cite real repository paths and symbols; distinguish verified facts from assumptions.
2. **Find the smallest complete change.** Identify the behavior boundary, existing conventions to reuse, and the public seam through which the result can be tested. Keep the outcome end-to-end; do not split by database/API/UI layers. If it is too large for one cohesive review, return a narrow behavior split to `/to-issues` instead of planning a huge one-ticket PR.
3. **Choose proportionate technical direction.** Use `codebase-design` for meaningful backend, schema, ownership, invariant, interface, or dependency changes, including its relevant data/compatibility checks; routine work needs only the quick existing-owner check. State the recommended approach and important tradeoff in this plan, not a separate design artifact. For a consequential choice, record why it fits, a meaningful alternative, and any risk, guardrail, or signal that should trigger a revisit. Keep routine reversible choices brief. Reuse linked research; use `/skill:research` only for missing facts about this slice, skipping an external pass when evidence suffices. Re-evaluate technical overlap against active work now; a design's parallel candidates do not prove safety.
4. **Define proof.** Map each ticket acceptance criterion to a test or observable verification. Include only real edge cases and relevant project-native checks.
5. **Check interface impact.** Use the exact declaration format checked by `plan-lint.py`:

   ```markdown
   - **Interface impact:** none — <why the boundary does not change>
   ```

   If the impact is `new` or `changed`, replace `none` with that value and add non-empty `**Interface sketch**` and `**Rejected alternative**` blocks. Follow `codebase-design`; avoid speculative architecture and unrelated cleanup.
6. **Ask only for material decisions.** Small reversible implementation choices belong in the plan; user-visible, security-sensitive, irreversible, or architecture choices (as defined in `/skill:research`) need the user's decision. Read the linked research's **Decision needed from you** blocks first. An UNDECIDED architecture choice inside this ticket's scope stops planning until the user records a `**Chosen:**` answer, and the Technical approach follows that answer. An UNDECIDED choice outside the scope goes under Risks and open questions and stays undecided.

## Local plan

Initialize the plan bundle with the repository generator:

```sh
python3 ~/.agents/scripts/new-artifact.py --type plans "issue-<number>-<short-title>"
```

For a local ticket, use a stable slug based on its title. Write one plan at `context/plans/<slug>/00-index.md`. The plan must include:

Write these gate fields exactly once as standalone lines, not list items or backticked values:

```markdown
**Ticket:** context/issues/<slug>/001-<topic>.md
**Planned at:** <full commit SHA inspected>
**In-scope files:** <comma-separated repo-relative file paths>
**Plan status:** draft
```

Ticket must match the queue's Ticket path or recorded Issue exactly. Scope paths are literal files, not globs; include existing and new files whose behavior or contracts the plan relies on. Do not create an executable plan from uncommitted production changes that are absent from its intended base. Keep these additional sections proportional:

- **Goal:** one sentence tied to the ticket's desired behavior;
- **Current behavior:** verified code behavior and relevant locations;
- **Desired behavior:** the ticket's observable outcome, without scope expansion;
- **Relevant code and tests:** the existing modules, callers, and test seams involved;
- **Technical approach:** the smallest complete change and material tradeoffs;
- **Scope and non-goals:** boundaries for this implementation;
- **Acceptance and verification:** how each ticket criterion will be proved;
- **Risks and open questions:** only concrete risks or unresolved decisions;
- **Interface impact:** `none`, `new`, or `changed` using the exact `plan-lint.py` declaration, with a non-empty sketch and rejected alternative when applicable;

Plan status is `draft`, `approved`, or `blocked`; write `**Plan status:** approved` only after human approval.

Do not create step files or split one ticket into separate deliverables. If execution needs several reviewable steps, use a short ordered checklist of end-to-end slices with the proof for each; do not split by technical layer or pre-plan other tickets. Keep plans under `context/plans/`; do not publish GitHub changes from this skill.

## Review and handoff

Run the repository's plan checks:

```sh
python3 ~/.agents/scripts/slop-lint.py context/plans/<slug>/
python3 ~/.agents/scripts/plan-lint.py context/plans/<slug>/
```

Link the plan in the selected queue row's Plan cell using a plain repo-relative path. Present the ticket, plan path, repository evidence, technical choice, verification, and open risks, then stop awaiting human review. Set `**Plan status:** approved` only after the user approves it. Plan approval is not an implementation request and does not authorize a branch, worktree, commit, push, or PR.

After feedback, refresh the plan, affected ticket/card, queue links, and evidence; material scope or code changes require renewed plan review. Implementation starts only on request through `/skill:implement` or `/skill:issue-delivery`. They find the matching approved linked plan and validate it against the actual execution base; never autostart them.

## Done when

- Exactly one selected ticket has a concise plan grounded in the current repository.
- The technical direction stays within the ticket's desired behavior and acceptance criteria.
- Every acceptance criterion has observable proof, and interface impact is declared.
- `slop-lint.py` and `plan-lint.py` pass, or any unavoidable exception is explicit.
- The plan is marked approved only after explicit human approval.
