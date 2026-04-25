---
name: ralplan
description: "Consensus planning with RALPLAN-DR structured deliberation. Triggers: 'ralplan', 'consensus plan'. Short by default, --deliberate for high-risk."
---

# Ralplan Skill

RALPLAN-DR (Deliberate-Refine) is a structured multi-round planning workflow for reaching team consensus on complex or high-risk decisions before any code is written. Artifact-driven — produces a reviewed decision record.

## When to Activate

Trigger phrases: `ralplan`, `consensus plan`, `plan with deliberation`, `let's debate the approach`, `weigh the options`, `ralplan --deliberate`.

Default mode is **short** (3 rounds, focused scope). Pass `--deliberate` flag for **high-risk** decisions requiring expanded analysis across more dimensions.

## Mode Flags

- *(default)* — Short deliberation: 3 rounds, focused scope, 1-2 candidate approaches
- `--deliberate` — Expanded deliberation: 5+ rounds, full multi-candidate analysis, explicit risk taxonomy

## Workflow Overview

```
Round 1: PROPOSE  → Leader proposes candidate plan(s)
Round 2: CRITIQUE → Participants challenge and probe
Round 3: REFINE   → Leader refines based on critique
[Round 4-5: (deliberate mode only) Repeat refine cycles]
Final:    DECIDE  → Consensus verdict with decision record
```

## Round Specifications

### Round 1: PROPOSE

The proposer (leader or designated architect) presents:
- **Candidate approach(es)** — 1 for short mode, 2-3 for deliberate mode
- **Why each approach was chosen** — constraints that shaped the decision
- **Rejected alternatives** — what was considered and why it was discarded
- **Boundary conditions** — when this approach breaks down or needs revision

Format: structured proposal with explicit sections, not prose.

### Round 2: CRITIQUE

All participants stress-test the proposal(s) by probing:
- **Completeness** — does this address all stated requirements?
- **Correctness** — are the assumptions valid? are there technical flaws?
- **Scope fit** — does this solve the actual problem or a proxy problem?
- **Reversibility** — can we undo this if it goes wrong?
- **Hidden costs** — what is the maintenance burden? the migration cost? the opportunity cost?
- **Failure modes** — what breaks first? how does it degrade?

Critique should be **specific and actionable** — not vague concerns. Each critique point should be a testable claim.

### Round 3: REFINE

The proposer responds to critique and revises:
- **Accept** critique and modify the plan accordingly
- **Reject** with explicit reasoning — why the critique is incorrect or outweighed by other factors
- **Defer** with a tracking issue — legitimate but out-of-scope for this decision

Do not simply dismiss critique. Every critique point must receive a documented response.

### Rounds 4-5 (Deliberate Mode Only)

Repeat the refine cycle with expanded scope — add new candidate approaches discovered during deliberation, probe edge cases, and stress-test assumptions that survived Round 3.

### Final Round: DECIDE

When all participants have had opportunity to critique and see responses:

1. **Summarize** — restate the winning approach and the key reasons it won
2. **Record dissent** — any remaining objections are documented (not silenced)
3. **Flag watch-items** — what should we monitor that would cause us to revisit this decision?
4. **Assign ownership** — who owns execution and verification?

## Decision Record Artifact

Produce a `.omx/plans/decision-[name].md` containing:

```
# RALPLAN Decision Record: [Decision Name]

**Date:** YYYY-MM-DD
**Mode:** short | deliberate
**Participants:** [names/roles]
**Status:** decided | deferred | rejected

## Problem Statement
The exact problem this decision addresses.

## Candidate Approaches Considered

### Approach A: [Name]
**Summary:** ...
**Rejected:** [reason] | **Accepted**

### Approach B: [Name]
**Summary:** ...
**Rejected:** [reason] | **Accepted**

## Key Deliberation Points

| Point | Critique | Response | Resolution |
|-------|----------|----------|------------|
| ...   | ...      | ...      | accept/reject/defer |

## Dissenting Views
Any remaining objections after deliberation closed.

## Decision
[One sentence stating the chosen approach and primary rationale]

## Watch Items
Conditions under which this decision should be revisited.

## Owner
[Name] owns implementation and verification.

## Verification
How we prove the decision was implemented correctly.
```

## Constraints

- Deliberation is **not** a vote — the goal is a well-reasoned decision, not majority rule
- Dissent is **recorded, not suppressed** — a participant who still disagrees after deliberation documents their objection
- Plans that emerge from RALPLAN are **locked from reflexive change** — deviation requires a new RALPLAN cycle
- Short mode is for **bounded, reversible** decisions; deliberate mode is for **irreversible, high-risk, or system-shaping** decisions
- The facilitator (leader) is responsible for ensuring every critique point receives a documented response before closing deliberation

## Integration with Other Workflows

- RALPLAN outputs a **decision record**, not an implementation plan — use the `plan` skill to convert the decision into phased implementation
- If RALPLAN is triggered mid-implementation (scope change), the decision record becomes the **change control artifact**
- High-risk decisions that pass RALPLAN may warrant `ultraqa` or `ralph` follow-through for verification
