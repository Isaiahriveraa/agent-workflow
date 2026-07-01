---
description: Max-context sub-agent decomposition — split tasks along natural seams, give each agent full context, spawn in parallel
---

# Spawn

Split a complex task into atomically independent work units, write an exhaustively descriptive 7-section prompt for each, and spawn all units in parallel. Optimizes for **correctness** over speed — the orchestrator takes its time to gather context, study conventions, and ensure zero follow-ups.

---

## Purpose

`/spawn` turns one high-level task into parallel sub-agents that each have **everything they need** to ship independently. No follow-up questions. No "where does X live?" No "what pattern should I follow?" The orchestrator absorbs the full context burden so each sub-agent can execute cleanly.

---

## When To Use

| Use `/spawn` | Don't `/spawn` |
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

For each unit, write a prompt with all of these sections:

**1. TASK** — Atomic goal, one action, one bounded deliverable.

**2. EXPECTED OUTPUT** — Exact file paths, data shapes, interfaces. "Create `src/feature/x.py` with exported function `y()` that..."

**3. CONTEXT** — Every relevant file path with contents, existing patterns with exact line references, sibling implementations, config values, type definitions, shared constants, prior decisions, error history.

**4. CODEBASE CONVENTIONS** — Naming conventions, error handling patterns, import style, testing patterns, any style guide the project follows.

**5. MUST DO** — Exhaustive numbered list:
- MUST write BERP docstrings on every public function/method/class
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
- [ ] Every public symbol has a BERP docstring
- [ ] LSP diagnostics clean on changed files
- [ ] No new dependencies added
- [ ] Pattern matches [exact reference file]
- [ ] Tests pass (if applicable)

### Phase 3 — Spawn

All independent units → parallel sub-agents. Each gets its own full context window. Maximum parallelism. Zero contention.

## Phase 4 — Review Gate & Synthesis

The orchestrator must act as a strict reviewer before accepting any sub-agent output.

Do **not** assume sub-agent work is correct. Every result must pass a review gate before it can be synthesized into the final answer.

For each sub-agent result, review against:

1. The original user request.
2. The current plan/spec/artifact.
3. The sub-agent’s assigned TASK.
4. The sub-agent’s EXPECTED OUTPUT.
5. The sub-agent’s MUST DO list.
6. The sub-agent’s MUST NOT DO list.
7. The sub-agent’s DONE WHEN checklist.
8. Existing codebase conventions.
9. `.agents` rules where relevant.
10. Simplicity, maintainability, and future extensibility.

If the sub-agent missed requirements, changed unrelated files, added unnecessary abstractions, violated conventions, ignored `.agents` rules, or implemented something different from the plan, the orchestrator must reject the result and send it back with specific correction instructions.

The orchestrator may only accept a sub-agent result when it can clearly explain why the result satisfies the assignment.

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
* [ ] Public functions/classes/methods have BERP docstrings.
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

---

## BERP Comment Rule (mandatory for all sub-agents)

Every function, method, and class **must** have a BERP docstring:

```
"""Brief one-line description.

Behavior:
    What this does. How it behaves. Side effects, assumptions about state,
    ordering constraints, or concurrency notes.

Exceptions:
    What exceptions can be raised and under what conditions.
    ``None.`` if no exceptions are raised.

Returns:
    What is returned and what the return value represents.

Params:
    param_name: Description of the parameter.
"""
```

If the BERP docstring would be too long → **split the function**. Verbosity in BERP is the signal that concerns aren't separated.

---

## Hard Rule

> Every sub-agent must be able to complete its task independently with **zero follow-ups**.
>
> If a sub-agent would need to ask "what pattern should I follow?" or "where does X live?" — **add more context to the prompt before spawning.**
>
> The orchestrator's job is to absorb ALL the context burden so sub-agents can focus purely on execution. Correctness over speed.
