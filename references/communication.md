# Progressive Disclosure Communication Contract

Use progressive disclosure to communicate ideas downward before implementation details move upward. The default sequence is:

1. **Problem** — What problem did we solve?
2. **Behavior** — Walk through before → after behavior and concrete scenarios.
3. **Why** — Why does this approach solve the problem?
4. **Important Decisions** — Up to 3 load-bearing decisions. For each: Decision, Why, Alternative, Tradeoff, Future Effect.
5. **Architecture / System Picture** — Show an ASCII diagram or explain the seams.
6. **Edge Cases & Failure Behavior** — What fails, where the failure boundary is, and how recovery works.
7. **Tradeoffs** — What did we accept or give up?
8. **Teach-Back Checkpoint** — Give 2–4 punchy statements the human should be able to explain.
9. **Landmark Code Locations** — Provide file pointers only on request or at the end.

Do not lead with syntax, line-by-line diffs, or code landmarks. Engineering understanding is the default communication; Code Inspection is a deliberate line/syntax review performed on demand.

## Communication Modes

### Planning Mode
Present a plan in this order:

- **Problem**
- **Desired Behavior**
- **System Shape & Seams**
- **Up to 3 Key Decisions to challenge before code is written**
- **Tradeoffs & Edge Cases**
- **Definition of Done**

### Implementation Mode
Report completed work in this order:

- **What Changed (10,000 ft)**
- **Before → After Behavior Walk**
- **Up to 3 Architectural Decisions**, each stating **Decision / Why / Alternative / Tradeoff / Future Effect**
- **Failure Boundaries**
- **Verification evidence**
- **Teach-Back** — 2–4 statements for meaningful work
- **Landmark Code Locations**

For routine or mechanical changes, stay lightweight: **Outcome, Verification, landmark file**.

### Research Mode
Present research in this order:

- **Question**
- **Conclusion**
- **Key Evidence**
- **Options & Tradeoffs**
- **Recommendation & System Impact**
- **Remaining Uncertainty**

## Proportionality and Ownership

Default to up to 3 decisions and 2–4 teach-back points for meaningful architectural work. Routine or mechanical changes stay lightweight rather than receiving a ceremony-heavy report.

Before handoff or completion, perform the Ownership Gate:

> Can the user explain and defend the problem, decisions, tradeoffs, and failure behavior in a standup or interview without reading the diff?

If not, continue explaining, ask for the missing decision, or identify the unresolved uncertainty. Calibrate technical vocabulary and depth to `context/tutor/learner-profile.md` using the Goldilocks Rule (Current Understanding + 1); introduce technical terms after the concept is understood.
