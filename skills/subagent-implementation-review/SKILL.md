---
name: subagent-implementation-review
description: "Rule-enforcement gate for delegated subagent work — checks changes against AGENTS.md rules, codebase conventions, and readability before acceptance; directs remediation by explaining how"
---

# Subagent Implementation Review

A lean rule-enforcement gate for delegated implementation work, run before a sub-agent result is accepted or handed off. It answers three questions: **does the change follow the hub's rules, does it conform to the codebase, and is the code readable** — readable code, not clever code.

The `code-review` skill is the always-run verification step after integration (AGENTS.md Subagent Strategy). This gate is the fast pass before that: it catches rule and convention violations cheaply so `code-review` can focus on substance. Do not duplicate code-review's adversarial workflow here.

## Core contract

- The human stays in the loop for scope, product behavior, public contracts, destructive changes, migrations, auth, dependencies, and unresolved architectural tradeoffs.
- Files are the unit of reasoning. Diff hunks and command output are evidence, not the design boundary.
- Findings must be concrete: `file:line — \`verbatim line\`` plus the violated rule/spec, mechanism, consequence, smallest fix, proof, and confidence.
- Do not report taste, folder preference, or style-only opinions as defects.
- One finding per root cause. Keep distinct structural defects distinct.
- Never trust a subagent's summary without reopening the live implementation, callers, tests, and applicable instruction files.
- Never let a remediation agent expand scope or perform unrelated cleanup.

## Intake and evidence map

1. Capture the original request, acceptance criteria, delegated prompt(s), subagent outputs, changed files, commit/diff scope, and tests or commands claimed by the subagent.
2. Read the applicable instruction hierarchy before judging the code: hub `AGENTS.md` operating rules, repo and directory `AGENTS.md`, project contribution rules, and the task specification. The closest applicable rule wins when rules conflict; report the conflict rather than guessing.
3. Map every changed file to its role, public entry points, inbound callers, outbound collaborators, registrations, persistence, and tests.
4. Keep raw subagent output separate from reconciled findings. Missing proof is itself a review signal, not proof that the implementation is wrong.
5. If the scope, intended behavior, or ownership is genuinely ambiguous, pause and ask the human before reviewing. Do not infer a product decision from code shape.

## Review passes

Run one read-only reviewer with all three passes. The main agent can run the passes itself for small changes; dispatch a single `task` sub-agent when the change is substantial. Use two reviewers only for large multi-file changes — split **adversarial** from **rules + conformance** — and never more than two. If no implementation subagent was used, treat the current implementation as delegated work and run the same passes. A passing test suite never replaces this review.

1. **Rules enforcement** — the hub's operating rules are the checklist:
   - Evidence over confidence (rule 11): every claimed verification was actually run; no claim without a check.
   - Surgical scope (rule 3): only assigned files; no unrelated refactors, dead code, or scaffolding left behind.
   - Simplicity (rule 4): no speculative abstractions; smallest maintainable solution.
   - Human-first code (rule 5): explicit names, plain-English control flow, comments only for non-obvious why.
   - Observable-behavior tests (rule 6): public-interface assertions only; no implementation-detail assertions; required coverage present.
   - Errors handled (rule 7): nothing swallowed; context preserved.
   - Contracts (rule 8): contract-bearing functions documented with the block template; no boilerplate on helpers.
   - Correctness (rule 14): no unsafe casts, ignored type errors, empty catches, or equivalent suppression.
   - Dependencies (rule 19): none added without approval.
   Also check the acceptance criteria and the delegated prompt's forbidden shortcuts.

2. **Codebase conformance** — the change must look like the codebase already wrote it:
   - Existing patterns win: naming, error handling, import style, test style — with exact reference files. A second convention beside an existing one is a finding.
   - Canonical names: one concept → one term; no `Manager`/`Helper`/`Utils` collisions with established symbols.
   - No duplicated logic, split sources of truth, or hidden wiring a fresh developer cannot trace.

3. **Adversarial quality** — receives the diff and the acceptance criteria and *nothing else*: no delegated prompt, no subagent output, no coordinator reasoning, no prior review rounds. Assume the code is incorrect and find concrete reasons it does not work. Also judge readability: names state intent, structure is traceable, no clever compression. Run two adversarial passes with distinct failure lenses (correctness, concurrency/lifetime, error and boundary paths, security, does-it-reproduce) only when the change can fail in more than one way.

The adversarial pass is context-free by design: a reviewer who can see why the code was written the way it was inherits the author's blind spots and rationalizes them — that is the failure this pass exists to catch. Do not "help" it by supplying background.

"No findings" is a valid and expected adversarial result. Say so explicitly — a reviewer told to find bugs, with no permission to return empty, will manufacture them.

Passes return evidence rows only; they do not edit files and do not prescribe broad refactors. Use the citation contract for every claim:

`path/to/file.ext:line — \`exact source line\` — observation and consequence`

A pass must omit a finding when it cannot quote the live source or connect it to a rule, criterion, or observable behavior.

## What counts as actionable

Treat a finding as actionable only when the implementation introduces or worsens a concrete problem:

- **Separation of concerns:** flag mixed UI/domain/persistence/transport concerns, hidden side effects, import cycles, or duplicated sources of truth when you can trace the coupling or behavior impact.
- **Cohesion and depth:** flag shallow wrappers, feature envy, middle-man layers, speculative generality, or a large surface with little policy only when they make callers harder to understand or extend. Do not demand an abstraction for a single case.
- **Navigability:** a fresh developer must be able to trace canonical entry point → collaborators → effects → tests. Flag orphaned paths, duplicate registrations, or hidden wiring that prevent that trace. Directory preference alone is not a finding.
- **Comments:** comments explain why, invariants, or non-obvious constraints; strip redundant, stale, contradictory, generated, or narrational comments. If a workaround needs a paragraph-long comment to justify why it is acceptable, the code is wrong — file the finding against the code, not the comment.
- **Code smells:** use smells as signals, not a checklist. Flag only introduced or worsened duplication, mysterious names, feature envy, data clumps, primitive obsession, repeated switches, shotgun surgery, divergent change, message chains, speculative generality, middle men, or refused bequests when locality, coupling, testability, or correctness cost is concrete. Pre-existing smell: bring it to the human's attention, do not file it as a defect.
- **Tests and seams:** changed risk-bearing behavior needs a focused behavioral test or an explicitly justified existing test path, through the public seam; flag tests that only assert implementation details or omit meaningful boundaries.

## Reconcile and classify

Merge the pass output. Reopen the live files to verify every quote and cross-file claim before classifying — an unverifiable finding is a dropped finding. Deduplicate only identical root cause, evidence, and fix; preserve distinct defects such as a missing validation path and a poor module boundary.

- **Blocker:** explicit rule/spec breach, correctness/security/data-loss risk, public-contract break, unverified critical claim, or missing required behavior.
- **Important:** material maintainability/locality problem or likely regression that must be fixed before handoff.
- **Suggestion:** optional, low-risk improvement with a clear benefit; omit generic style advice.
- **Discussion:** a real tradeoff requiring human choice (product behavior, API, migration, deletion, broad refactor, or competing architecture). Do not silently choose.

Finding shape: `ID | severity | category | file:line + quoted line | violated rule/spec | mechanism and observable impact | smallest fix | proof/test | confidence`

Produce a binary recommendation: `ready`, `changes-required`, or `blocked-awaiting-human`. `ready` requires no unresolved blockers, complete acceptance coverage, navigable code, required contracts/comments, and real verification evidence.

### Queue-shaped output

When the caller maintains a defect queue — `parallel-dev` workers do, at `.herdr/reports/<issue-key>/defects.jsonl` — emit each reconciled finding as one queue row instead of prose, and let the caller append them in the order returned:

```json
{"source":"<pass-id>","severity":"blocking|high|medium|low","file":"<path>","line":<n>,"claim":"<one line>","evidence":"`<verbatim source line>`","required_change":"<observable correction>"}
```

`seq`, `at`, and the disposition fields belong to the queue owner, not to this skill — it produces findings, it does not track their fate. Severity maps directly: **Blocker** → `blocking`, **Important** → `high`, **Suggestion** → `medium` or `low`. **Discussion** items do not enter the queue; they need a human decision and are reported separately.

Emit findings in pass order. The caller works them first-in-first-out, so ordering here is the arrival order there — do not pre-sort by severity or by how easy a fix looks. The queue owner front-inserts `blocking` entries; that is its job, not this skill's.

## Remediation loop

1. Human approval is required before changing product behavior, public APIs, dependencies, auth/security boundaries, schemas/migrations, deleting code, broad refactors, or overlapping agent work.
2. For ordinary findings, send them back to the **responsible subagent** — you never write the fix yourself. Direct by explaining how: finding IDs, exact files/symbols, the approach you would take, acceptance criteria, and non-goals. Assign non-overlapping file sets when multiple fix agents work in parallel.
3. Tell the remediation agent to preserve canonical names and interfaces, remove redundant comments/scaffolding, and avoid unrelated cleanup or speculative abstractions.
4. Reopen the changed files and rerun the same passes on the remediation delta, then run targeted tests/typecheck/lint appropriate to the touched surface. Repeat only for remaining findings; escalate when the loop reveals a human decision or scope change.
5. Never declare success from a green command alone: confirm the requested behavior, rule compliance, conformance, and readability.

## Handoff to code-review

Once the gate passes and the work is integrated, invoke `skill(name="code-review")` — per AGENTS.md Subagent Strategy, code-review is the always-run verification step. This gate makes code-review faster; it does not replace it.

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
- Do not give the adversarial pass the delegated prompt, the subagent's explanation, or your own reasoning so it "has enough context". The missing context is the entire mechanism.
- Do not let the adversarial pass manufacture findings to look productive, and do not treat its empty result as a failed review.
- Do not accept a paragraph-long comment as justification for a workaround; file it against the code.
- Do not ask an agent to "clean it up" without exact evidence and boundaries.
- Do not turn every preference into an architecture defect.
- Do not add comments everywhere; comments are for required contracts and non-obvious why/invariants.
- Do not hide unresolved product or API decisions behind a refactor.
- Do not re-expand this gate into a multi-lane fan-out with a verifier sub-agent; one reviewer, three passes — deep verification belongs to `code-review`.
- Do not use this skill as a replacement for the full `code-review` security/dependency/precedent workflow.
