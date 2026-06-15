---
description: Max-context sub-agent decomposition — split tasks along natural seams, give each agent full context, spawn in parallel
---

# Spawn

Split a complex task into atomically independent work units, write an exhaustively descriptive 7-section prompt for each, and spawn all units in parallel. Optimizes for **correctness** over speed — the orchestrator takes its time to gather context, study conventions, and ensure zero follow-ups.

---

## Purpose

`/cleave` turns one high-level task into parallel sub-agents that each have **everything they need** to ship independently. No follow-up questions. No "where does X live?" No "what pattern should I follow?" The orchestrator absorbs the full context burden so each sub-agent can execute cleanly.

---

## When To Use

| Use `/cleave` | Don't `/cleave` |
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

### Phase 4 — Verify & Synthesize

Check each result against its DONE WHEN criteria. Verify BERP compliance. Verify convention conformance. Synthesize into complete output. Fix any misses.

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
