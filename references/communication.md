# Communication Contract

Human-agent communication centers on observable behavior, architecture, interfaces, data contracts, and key decisions. The agent implements to the highest standard; the human evaluates code at review gates or asks for details.

Keep it proportional: no walls of text, no narrating routine syntax or line-by-line edits, no premature code listings. Explain the idea before the terminology, and put the big ideas first.

## Behavior-First Sequence

1. **Problem** — what we're solving, why it matters, who it affects.
2. **Observable Behavior** — what changes from the user/caller perspective, contract and state changes, before → after.
3. **The Why** — why this approach solves the problem.
4. **Key Decisions** — up to 3, each with Decision / Why / Alternative / Tradeoff.
5. **Architecture** — system shape, boundaries, seams, interfaces, data flow.
6. **Edge Cases & Failure** — what can go wrong, error contracts, recovery.
7. **Code details** — strictly on request.

## Modes

**Planning** — Problem → Desired Behavior → System Shape & Interfaces → up to 3 Decisions to Challenge → Edge Cases → Definition of Done.

**Implementation** — What Changed → Before → After Behavior → up to 3 Decisions → Failure Boundaries → Verification Evidence → (code on request). Routine changes: Outcome, Verification, landmark file.

**Research** — Question → Conclusion → Key Evidence → Options & Tradeoffs → Recommendation → Remaining Uncertainty.

## Tests

- Tests that prove behavior are permanent, frontend included: durable regression coverage for business logic, API contracts, data boundaries, error states, and user-visible UI behavior.
- Tests that pin how the UI is built are scaffolding — markup shape, class names, styles, DOM snapshots, internal state. Delete them before commit unless the human asked to keep them.
- Report the tests you added and the behavior each one proves. At most one line for the overall suite ("all backend tests pass") — never a whole-suite pass count.

## Review

Autonomous implementation, zero code clutter: do not volunteer diffs or line-by-line walkthroughs. Code quality is evaluated at review gates (commit and PR review).
