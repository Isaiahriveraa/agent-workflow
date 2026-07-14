---
name: subagent-implementation-review
description: "Review delegated subagent implementations for instruction adherence, human-first architecture, navigability, naming, comments, tests, and targeted remediation before handoff."
---

# Subagent Implementation Review

Review delegated implementation work before it reaches the human or is merged. This is a focused review of **how a subagent implemented the requested change**: instruction adherence, behavioral completeness, human-first architecture, navigability, and maintainability. Use the generic `code-review` skill for broad diff/security/dependency/PR review; do not duplicate its full workflow here.

## Core contract

- The human stays in the loop for scope, product behavior, public contracts, destructive changes, migrations, auth, dependencies, and unresolved architectural tradeoffs.
- Files are the unit of reasoning. Diff hunks and command output are evidence, not the design boundary.
- Findings must be concrete: `file:line — \`verbatim line\`` plus the violated instruction/spec, mechanism, consequence, smallest fix, proof, and confidence.
- Do not report taste, folder preference, or style-only opinions as defects.
- One finding per root cause. Keep distinct structural defects distinct.
- Never trust a subagent's summary without reopening the live implementation, callers, tests, and applicable instruction files.
- Never let a remediation agent expand scope or perform unrelated cleanup.

## Intake and evidence map

1. Capture the original request, acceptance criteria, delegated prompt(s), subagent outputs, changed files, commit/diff scope, and tests or commands claimed by the subagent.
2. Read the applicable instruction hierarchy before judging the code. Include repository and directory-scoped `AGENTS.md`, `.agents/AGENTS.md` when present, `CLAUDE.md`, project contribution rules, and the task specification. The closest applicable rule wins when rules conflict; report the conflict rather than guessing.
3. Map every changed file to:
   - applicable instruction/spec clauses;
   - its role and public entry points;
   - inbound callers, outbound collaborators, registrations, persistence, and tests;
   - the behavior the acceptance criteria require.
4. Keep raw subagent output separate from reconciled findings. Missing proof is itself a review signal, not proof that the implementation is wrong.
5. If the scope, intended behavior, or ownership is genuinely ambiguous, pause and ask the human before reviewing or editing. Do not infer a product decision from code shape.

## Delegated review lanes

After scoping, maximize useful delegation. Dispatch independent read-only reviewers in **one parallel wave**, using only lanes triggered by the change:
If no implementation subagent was used, treat the current implementation as delegated work for review purposes and still dispatch the applicable read-only lanes. A passing test suite never replaces this review.

1. **Instruction-contract lane** — checks applicable agent/repository rules, acceptance criteria, required APIs, required tests, and forbidden shortcuts.
2. **Behavior/spec lane** — traces inputs to effects, success/error paths, state transitions, callers, registrations, persistence, and boundary cases; checks claimed verification against actual commands and results.
3. **Human-first architecture lane** — checks cohesion, separation of concerns, coupling, interfaces/seams, navigability, naming, comments, duplication, and introduced code smells.
4. **Integration/scope lane** — checks call sites, wiring, configuration, imports, public surface, test seams, and whether the change spread beyond the assigned boundary.
5. Add security, data, operations, or sibling-invariant lanes only when concrete triggers exist. Skip optional lanes for tiny, local, low-risk changes.

Every lane receives the exact goal, acceptance criteria, changed-file scope, relevant instruction excerpts, and diff/commit path. Lanes return evidence rows only; they do not edit files and do not prescribe broad refactors. Use the citation contract for every claim:

`path/to/file.ext:line — \`exact source line\` — observation and consequence`

A lane must omit a finding when it cannot quote the live source or connect it to a task criterion, instruction, or observable behavior.

## Human-first architecture rubric

Treat a finding as actionable only when the implementation introduces or worsens a concrete problem:

- **Separation of concerns:** one module/function should have a coherent reason to change. Flag mixed UI/domain/persistence/transport concerns, hidden side effects, import cycles, or duplicated sources of truth when you can trace the coupling or behavior impact. Prefer side effects at explicit seams and variation at edges.
- **Cohesion and depth:** flag shallow wrappers, feature envy, middle-man layers, speculative generality, or a large surface with little policy only when they make callers harder to understand or extend. Do not demand an abstraction for a single case.
- **Navigability:** a fresh developer must be able to trace the canonical entry point → collaborators → effects → tests. Flag orphaned paths, duplicate registrations, split sources of truth, misleading placement, or hidden wiring that prevents that trace. Directory preference alone is not a finding.
- **Canonical naming:** consult existing glossary, symbols, and file conventions. Enforce one concept → one clear term. Flag generic `Manager`/`Helper`/`Utils`, collision-prone names, aliases, or casing/file mismatches only when they can cause wrong use, ambiguity, serialization/API breakage, or conflict with an established canonical term.
- **Comments:** comments explain why, invariants, or non-obvious constraints. If applicable repository rules require a public-function contract (for example BERP: behavior, exceptions, returns, parameters), verify it. Add brief, useful documentation where required; strip redundant, stale, contradictory, generated, or narrational comments. Do not require a comment for obvious code.
- **Code smells:** use smells as signals, not a checklist. Flag only introduced or worsened duplication, mysterious names, feature envy, data clumps, primitive obsession, repeated switches, shotgun surgery, divergent change, message chains, speculative generality, middle men, or refused bequests when locality, coupling, testability, or correctness cost is concrete.
- **Tests and seams:** changed risk-bearing behavior needs a focused behavioral test or an explicitly justified existing test path. Prefer tests through the public seam; flag tests that only assert implementation details or omit meaningful boundaries.

## Reconcile and classify

The coordinator merges lane output after all required lanes return:

- Deduplicate only identical root cause, evidence, and fix. Preserve distinct defects such as a missing validation path and a poor module boundary.
- **Blocker:** explicit instruction/spec breach, correctness/security/data-loss risk, public-contract break, unverified critical claim, or missing required behavior.
- **Important:** material maintainability/locality problem or likely regression that must be fixed before handoff.
- **Suggestion:** optional, low-risk improvement with a clear benefit; omit generic style advice.
- **Discussion:** a real tradeoff requiring human choice (product behavior, API, migration, deletion, broad refactor, or competing architecture). Do not silently choose.

Use this finding shape:

`ID | severity | category | file:line + quoted line | violated rule/spec | mechanism and observable impact | smallest fix | proof/test | confidence`

Produce a binary recommendation: `ready`, `changes-required`, or `blocked-awaiting-human`. `ready` requires no unresolved blockers, complete acceptance coverage, navigable code, required contracts/comments, and real verification evidence.

## Independent verification gate

Before remediation, dispatch one claim-verifier with the reconciled findings. It reopens the live files, applicable instructions, callers, and tests; checks every quote and cross-file claim; and returns exactly one tag per finding:

- `Verified` — citation and behavior are supported.
- `Weakened` — partly true but narrower; demote one severity tier and rewrite the claim.
- `Falsified` — quote or behavior is contradicted; remove the finding.

The verifier must not invent new findings. Re-dispatch only for missing IDs. Do not remediate unverified claims.

## Remediation loop

1. Human approval is required before changing product behavior, public APIs, dependencies, auth/security boundaries, schemas/migrations, deleting code, broad refactors, or overlapping agent work.
2. For ordinary approved findings, dispatch the smallest possible remediation task to the responsible subagent. Include finding IDs, exact files/symbols, acceptance criteria, non-goals, and required focused tests. Assign non-overlapping file sets to parallel fix agents.
3. Tell the remediation agent to preserve canonical names and interfaces, remove redundant comments/scaffolding, and avoid unrelated cleanup or speculative abstractions.
4. Reopen the changed files and rerun the same review lanes on the remediation delta. Then run targeted tests/typecheck/lint appropriate to the touched surface. Repeat only for remaining findings; escalate when the loop reveals a human decision or scope change.
5. Never declare success from a green command alone: confirm the requested behavior, instruction compliance, architecture, and navigability.

## Closeout

Report:

- changed files and responsible remediation agent(s);
- findings by ID, including verified/modified/dropped status;
- commands/tests actually run and their results;
- final status (`ready`, `changes-required`, or `blocked-awaiting-human`);
- unresolved risks or explicit human decisions.

Remove temporary review artifacts only when authorized. Keep follow-ups append-only and scoped to the question; if the implementation changes materially, start a fresh review rather than mutating the old conclusion.

## Anti-patterns

- Do not rubber-stamp a subagent because its tests pass.
- Do not ask an agent to “clean it up” without exact evidence and boundaries.
- Do not turn every preference into an architecture defect.
- Do not add comments everywhere; comments are for required contracts and non-obvious why/invariants.
- Do not hide unresolved product or API decisions behind a refactor.
- Do not use this skill as a replacement for the full `code-review` security/dependency/precedent workflow.
