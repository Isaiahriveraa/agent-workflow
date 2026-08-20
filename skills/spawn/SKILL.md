---
name: spawn
description: "Max-context sub-agent decomposition — split tasks along natural seams, give each agent full context, spawn in parallel, then accept as the senior engineer: verify, critique trade-offs, and direct fixes by explaining how"
---

# Spawn

Split a complex task into atomically independent work units, write an exhaustively descriptive 7-section prompt for each, and spawn all units in parallel. Optimizes for **correctness** over speed — the orchestrator takes its time to gather context, study conventions, and answer any follow-up a sub-agent raises.

---

## Purpose

`skill(name="spawn")` turns one high-level task into parallel sub-agents that each have **everything they need** to ship independently. No "where does X live?" No "what pattern should I follow?" — the orchestrator absorbs the full context burden so each sub-agent can execute cleanly. If a question still arrives, you answer it: you are the sub-agent's point of contact, not a one-shot dispatcher.

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

For each unit, write a prompt with all of these sections:

**1. TASK** — Atomic goal, one action, one bounded deliverable.

**2. EXPECTED OUTPUT** — Exact file paths, data shapes, interfaces. "Create `src/feature/x.py` with exported function `y()` that..."

**3. CONTEXT** — Every relevant file path with contents, existing patterns with exact line references, sibling implementations, config values, type definitions, shared constants, prior decisions, error history.

**4. CODEBASE CONVENTIONS** — Naming conventions, error handling patterns, import style, testing patterns, any style guide the project follows.

**5. MUST DO** — Exhaustive numbered list:
- MUST document contract-bearing functions with the rule-8 block template (AGENTS.md); no boilerplate on ordinary helpers
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
- [ ] Contract-bearing functions documented per rule 8; no boilerplate elsewhere
- [ ] LSP diagnostics clean on changed files
- [ ] No new dependencies added
- [ ] Pattern matches [exact reference file]
- [ ] Tests pass (if applicable)

### Phase 3 — Spawn

All independent units → parallel sub-agents. Each gets its own full context window. Maximum parallelism. Zero contention.

#### Live Q&A — answer, don't re-prompt

A sub-agent question is not a failure; it is a real gap the prompt could not close. Answer it directly with a decision (one hub round-trip): resolve the ambiguity, name the file, state the pattern. Never re-delegate the question and never stay silent while the sub-agent stalls — you are its only point of contact. Broadcast the answer to sibling sub-agents that share the same gap.

## Phase 4 — Senior-Engineer Acceptance

You are the senior engineer; sub-agents are your junior developers. You never write their code — you verify it, critique it, and direct fixes by explaining how you would do it. Every result must pass your acceptance gate before it is synthesized into the final answer.

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

If the sub-agent missed requirements, changed unrelated files, added unnecessary abstractions, violated conventions, ignored `.agents` rules, or implemented something different from the plan, reject the result and send it back. Think long-term: does this survive the next three changes to this code? Is the trade-off the one you would have made? Direct the fix by explaining **how** — the approach, the files, the trade-offs — and let the sub-agent implement it.

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
* [ ] Contract-bearing functions documented per rule 8; no boilerplate elsewhere.
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

### Acceptance Loop

Rejected work returns to the responsible sub-agent with your direction; when it returns, re-review the delta against the same checklist. Loop until acceptance, or escalate when the loop reveals a human decision or a repeated failure you should stop delegating and discuss. Acceptance is not the end: after synthesis, invoke `skill(name="code-review")` for verification — per AGENTS.md Subagent Strategy it is the always-run verification step.

---

## Contract Documentation (per AGENTS.md rule 8)

Sub-agents follow the hub's contract rule (AGENTS.md rule 8), not a docstring-everywhere mandate:

- Contract-bearing functions — API endpoints and functions with a non-obvious input/output contract — get the rule-8 block template from AGENTS.md. Fill in every applicable field; write `N/A` for the rest.
- Ordinary helpers and UI components get no boilerplate: short why-comments only, per rule 5.

If a required contract doc would be too long → **split the function**. Verbosity in the contract is the signal that concerns aren't separated.

---

## Hard Rule

> Every sub-agent must be able to complete its task independently with **zero avoidable follow-ups**.
>
> If a sub-agent would need to ask "what pattern should I follow?" or "where does X live?" — **add more context to the prompt before spawning.**
>
> The orchestrator's job is to absorb ALL the context burden so sub-agents can focus purely on execution. Correctness over speed — and when a follow-up still arrives, answer it (Phase 3).
