---
name: spawn
description: "Max-context sub-agent decomposition — split tasks along natural seams, give each agent full context, spawn in parallel. Orchestrator never writes code: sub-agents implement, you steer with algorithm/behavior specs, review every change, and correct through the acceptance loop"
---

# Spawn

Split a complex task into atomically independent work units, write an exhaustively descriptive 7-section prompt for each, and spawn all units in parallel. Optimizes for **correctness** over speed — the orchestrator takes its time to gather context, study conventions, and answer any follow-up a sub-agent raises.

---

## Purpose

`skill(name="spawn")` turns one high-level task into parallel sub-agents that each have **everything they need** to ship independently. No "where does X live?" No "what pattern should I follow?" — the orchestrator absorbs the full context burden so each sub-agent can execute cleanly. If a question still arrives, you answer it: you are the sub-agent's point of contact, not a one-shot dispatcher.

**Division of labor — the orchestrator never implements.** Sub-agents write **all** code, including every fix and revision. Your job is architecture, steering, and review: decompose the work, specify each unit's algorithm and behavior in prose, review what comes back against that spec, and send imperfect work back with direction. Any code you catch yourself writing — even a one-line fix — is a broken loop: hand it to the responsible sub-agent instead. You own the code's quality; they own its keystrokes.

---

## When To Use This Skill

| Use spawn | Don't spawn |
|---|---|
| Multi-file features (3+ files) | Single-file typo or trivial fix |
| Clear natural seams (API/DB/UI layers) | Tightly coupled work (one context needed) |
| Complex features with multiple layers | Exploratory research first |
| Refactors across multiple modules | Debugging — diagnose root cause first |
| Greenfield feature builds | Already-atomic single-deliverable task |

---

## Core Protocol

### Phase 0 — Context Gathering (take your time)

Do not rush this phase. Read all relevant files in full. Study existing patterns, conventions, and conventions. Map dependencies between work units. Identify the natural decomposition seams.

If context is unclear → consult specialists (Oracle, Librarian, Explore) **before** decomposing.

### Phase 1 — Decomposition

Decompose into atomic, isolated work units. Each unit:
- ONE bounded deliverable
- No dependency on other units' output
- Clear natural boundary (file, layer, concern)

Sweet spot: 2-4 sub-agents. Over-decomposition adds coordination cost without correctness benefit.

### Phase 2 — Prompt-Writing (7 sections per sub-agent)

For each unit, write a prompt with all of these sections. Specify each unit's **algorithm and behavior** — what the code must do, its inputs and outputs, edge cases, invariants, and constraints — in prose, never as finished implementation. EXPECTED OUTPUT pins the contract (paths, signatures, shapes); the sub-agent writes the body and owns its correctness against your spec. If you could paste the finished code into the prompt, you are implementing — stop and specify behavior instead.

**1. TASK** — Atomic goal, one action, one bounded deliverable.

**2. EXPECTED OUTPUT** — Exact file paths, data shapes, interfaces. "Create `src/feature/x.py` with exported function `y()` that..."

**3. CONTEXT** — Every relevant file path with contents, existing patterns with exact line references, sibling implementations, config values, type definitions, shared constants, prior decisions, error history.

**4. CODEBASE CONVENTIONS** — Naming conventions, error handling patterns, import style, testing patterns, any style guide the project follows.

**5. MUST DO** — Exhaustive numbered list:
- MUST document contract-bearing functions with the rule-10 block template (AGENTS.md); no boilerplate on ordinary helpers
- MUST match existing convention from [exact reference file:line]
- MUST handle these edge cases: [list]
- MUST validate using [specific approach]

**6. MUST NOT DO** — Forbidden actions. Anticipate and block mistakes:
- MUST NOT add new dependencies
- MUST NOT modify files outside [scoped directory]
- MUST NOT use type suppression
- MUST NOT refactor existing code — only add what's specified
- MUST NOT leave TODO comments, placeholder code, or pass stubs

**7. DONE WHEN** — Binary pass/fail checklist:
- [ ] File created with exports A, B, C
- [ ] Contract-bearing functions documented per rule 10; no boilerplate elsewhere
- [ ] LSP diagnostics clean on changed files
- [ ] No new dependencies added
- [ ] Pattern matches [exact reference file]
- [ ] Tests pass (if applicable)

### Phase 3 — Spawn

All independent units → parallel sub-agents. Each gets its own full context window. Maximum parallelism. Zero contention.

#### Live Q&A — answer, don't re-prompt

A sub-agent question is not a failure; it is a real gap the prompt could not close. Answer it directly with a decision (one hub round-trip): resolve the ambiguity, name the file, state the pattern. Never re-delegate the question and never stay silent while the sub-agent stalls — you are its only point of contact. Broadcast the answer to sibling sub-agents that share the same gap.

## Phase 4 — Senior-Engineer Acceptance

You are the senior engineer and the owner of code quality; sub-agents are your implementers. **You never write code — not in prompts, not in fixes, not in synthesis.** You verify, critique, and direct corrections, and you alone decide when a change is good enough. Every result must pass your acceptance gate before it is synthesized into the final answer, and code that does not pass goes **back to its sub-agent** — never under your own hand.

Do **not** assume sub-agent work is correct. For each sub-agent result, review against:

1. The original user request.
2. The current plan/spec/artifact.
3. The sub-agent's assigned TASK.
4. The sub-agent's EXPECTED OUTPUT.
5. The sub-agent's MUST DO list.
6. The sub-agent's MUST NOT DO list.
7. The sub-agent's DONE WHEN checklist.
8. Existing codebase conventions.
9. `.agents` rules where relevant.
10. Simplicity, maintainability, and future extensibility.

If the sub-agent missed requirements, changed unrelated files, added unnecessary abstractions, violated conventions, ignored `.agents` rules, or implemented something different from the plan, reject the result and send it back. Think long-term: does this survive the next three changes to this code? Is the trade-off the one you would have made?

Direct the fix in **behavior and algorithm terms, not code**: name the gap (what behavior is wrong or missing), say why it matters, and describe the approach you would take — the shape of the solution, the files to touch, the edge cases to honor, the trade-offs to weigh — then let the sub-agent translate that into code. Never paste fixed code or diffs into feedback: typing the fix makes you the implementer and teaches the sub-agent nothing. The sub-agent revises; you re-review.

You may only accept a sub-agent result when you can clearly explain why it satisfies the assignment — and would survive review by another senior engineer.

### Review Checklist

For each sub-agent output, verify:

* [ ] It solves the exact assigned task.
* [ ] It matches the plan/spec/artifact.
* [ ] It modifies only allowed files.
* [ ] It does not introduce unrelated refactors.
* [ ] It follows existing codebase patterns.
* [ ] It follows applicable `.agents` rules.
* [ ] It keeps the implementation simple.
* [ ] It avoids unnecessary abstractions.
* [ ] It avoids duplicated logic.
* [ ] It avoids hidden coupling.
* [ ] It has appropriate error handling.
* [ ] It has appropriate tests or verification.
* [ ] Contract-bearing functions documented per rule 10; no boilerplate elsewhere.
* [ ] No TODOs, placeholders, pass stubs, or fake implementations remain.
* [ ] LSP/lint/type diagnostics are clean on changed files where applicable.
* [ ] The work can integrate cleanly with the other sub-agent outputs.

### Red Flag Review

Before final synthesis, actively look for red flags:

* Over-engineering.
* Too many abstractions too early.
* Code that is hard to delete or replace.
* State ownership that is unclear.
* Tight coupling between unrelated modules.
* Duplicated logic across agents.
* Inconsistent naming or patterns.
* New dependencies without clear need.
* Security or privacy risks.
* Missing failure handling.
* Tests that only check happy paths.
* Sub-agent output that technically works but does not match the plan.
* Any implementation that makes future extension harder.

If a red flag is found, stop and document:

1. What the red flag is.
2. Why it matters.
3. Whether it blocks implementation.
4. The simpler or safer alternative.
5. Whether the sub-agent must fix it before acceptance.

### Integration Review

After individual sub-agent outputs pass review, synthesize them together and check the combined result.

Verify that:

* The pieces fit together cleanly.
* Interfaces match across files/modules.
* Naming is consistent.
* No two agents implemented overlapping or conflicting logic.
* No agent made assumptions another agent violated.
* The final implementation still matches the original task.
* The final implementation remains simple enough to understand quickly.

If integration reveals conflicts, resolve them before finalizing.

### Final Acceptance Rule

The orchestrator must not mark the task complete until:

* Every sub-agent result passed the review gate.
* Any rejected work was corrected.
* The synthesized result was checked as a whole.
* Verification steps were run or clearly documented.
* Remaining risks are explicitly listed.

Final output must include:

* What changed.
* Files touched.
* Which sub-agents were used.
* How each sub-agent result was reviewed.
* Red flags found and how they were handled.
* Verification performed.
* Remaining risks or follow-up work.

### Correction Loop

Rejected work returns to the responsible sub-agent — never to your own editor. Run the loop:

1. **Send back with direction.** State precisely which checklist items failed, and steer with the algorithm and behavior you expect — in prose, never as code. See "Direct the fix" above.
2. **Sub-agent revises.** It fixes its own code and reports the delta: what changed and why it now satisfies your direction.
3. **Re-review the delta.** Re-run the failed checklist items against the new code, and confirm the revision did not regress anything that previously passed.
4. **Loop or escalate.** Repeat until acceptance. Escalate when the loop surfaces a decision only the human can make, or when the same defect recurs and further direction is not converging — stop delegating and discuss.

A rejection that returns with the same defect twice means your direction was too vague, the spec was underspecified, or the unit exceeds the sub-agent's context: sharpen the behavioral spec, shrink the unit, or bring the decision to the human — do not take over the implementation.

Acceptance is not the end: after synthesis, invoke `skill(name="code-review")` for verification — per AGENTS.md Implementation Mode it is the always-run verification step.

---

## Contract Documentation (per AGENTS.md rule 10)

Sub-agents follow the hub's contract rule (AGENTS.md rule 10), not a docstring-everywhere mandate:

- Contract-bearing functions — API endpoints and functions with a non-obvious input/output contract — get the rule-10 block template from AGENTS.md. Fill in every applicable field; write `N/A` for the rest.
- Ordinary helpers and UI components get no boilerplate: short why-comments only, per rule 7.

If a required contract doc feels verbose or unwieldy, **deepen the module**: simplify the parameters, hide internal orchestration details, and define edge cases out of existence (Ousterhout). Do not mechanically split a function into shallow wrappers just to shorten documentation; splitting an awkward function produces two awkward functions that callers and reviewers must coordinate.

---

## Hard Rule

> Every sub-agent must be able to complete its task independently with **zero avoidable follow-ups**.
>
> If a sub-agent would need to ask "what pattern should I follow?" or "where does X live?" — **add more context to the prompt before spawning.**
>
> The orchestrator's job is to absorb ALL the context burden so sub-agents can focus purely on execution. Correctness over speed — and when a follow-up still arrives, answer it (Phase 3).
