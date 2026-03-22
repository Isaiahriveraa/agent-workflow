---
description: Execute an implementation plan phase by phase with verification checkpoints
---

# Implement Plan

Execute an implementation plan sequentially, phase by phase. Each phase is verified before proceeding. Manual checkpoints require explicit user confirmation.

## Initial Setup

1. **If a plan path was provided as a parameter**, read the plan file fully before doing anything else.
2. **Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current` and read the current project's `state.md` before starting work.**
3. **Read `~/.agents/contexts/decisions.md` before starting work.**
4. **Load `~/.agents/rules/common/workflow-router.md` before starting work.**
5. **If the task class calls for a capsule, load it before starting work and honor its critic, grader, and memory-policy files.**
6. **For substantial plans, run `node ./scripts/workflow-artifact-tools.mjs grade-plan --file [plan path]` before starting work and refuse malformed or non-ready plans.**
7. **After canonical plan/state/decision context is loaded and before phase execution begins, attempt `scripts/memory-sidecar-adapter.mjs` for workflow stage `implement-plan`; this recall attempt is mandatory for implementation entry even when advisory memory is disabled, unavailable, or returns zero items.**
8. **Use the same precedence rule during implementation entry:**
   1. active runtime state and selected artifacts
   2. explicit decisions and active research/plan
   3. advisory memory recall
   4. no recall when relevance is weak
9. **Treat advisory implementation recall as optional input only: disabled mode must preserve current behavior, disabled or unavailable recall still counts as a successful attempt, empty recall is success, and explicit artifacts stay authoritative when advisory memory disagrees.**
10. **Do not write advisory recall into the current project's `state.md`, `research-index.md`, session continuity artifacts, or active artifact selections.**
11. **Do not pass advisory recall into `scripts/workflow-artifact-tools.mjs`; plan grading and readiness remain bound to canonical artifacts only.**
12. **After plan grading, runtime-state loading, and the mandatory recall attempt, run `node ./scripts/workflow-command-decision.mjs evaluate --input ...` to decide whether implementation should `continue`, `replan`, `capture_lesson`, or `request_user_decision`.**
13. **Use the helper-backed strategy as the implementation entry authority: malformed or non-ready plan grades route to `replan`, durable automated verification misses route to `capture_lesson`, and evidence-backed blockers route to `request_user_decision`.**

14. **If no parameter was provided**, ask:
   ```
   Please provide the path to the plan file.
   Example: /absolute/path/to/.agents/thoughts/plans/2026-02-17-my-feature.md
   ```
   Wait for the user to provide the path, then read the file fully.

15. **Confirm readiness**:
   ```
   I've read the plan. It has [N] phases:
   1. [Phase 1 name] — [one-line goal]
   2. [Phase 2 name] — [one-line goal]
   ...

   Ready to begin. Shall I start with Phase 1?
   ```
   Wait for user confirmation before starting any phase, unless the user invoked this command with explicit pre-approval (e.g., "implement the plan, start immediately").

---

## Execution Loop

Repeat the following for each phase in the plan:

### Step 1: Announce the Phase

State clearly:
- Which phase you are starting (number and name)
- What the goal of this phase is
- What files will be touched

Before editing:
- Update the current project's `state.md` with the active workflow, phase name, next step, and related plan path
- Treat router activation and parser-backed plan readiness as the only authority for whether strict workflow enforcement can be bypassed
- Refuse to begin if the substantial-task workflow gate was bypassed and there is no decision-complete plan
- For substantial plans, refuse to begin unless parser-backed output proves `plan_ready_for_implementation: true`

Ask the user to confirm before proceeding, unless they've already pre-approved all phases.

### Step 2: Execute Phase Tasks

Work through every task listed in the phase:
- Make changes incrementally — one logical unit at a time
- After each file change, briefly state what was changed and why (one sentence is enough)
- If a task is ambiguous, stop and ask — do not guess
- Keep changes atomic: each logical unit should be independently reviewable

### Step 3: Run Automated Verification

After all tasks in a phase are complete:
- Execute every command listed under "Automated Verification" in the phase
- Document the result of each check (pass / fail)
- **If any check fails: STOP**
  - Diagnose the root cause
  - Fix it
  - Re-run the failing check
  - Do not proceed to Step 4 until all automated checks pass

If the plan has no automated verification commands for a phase, note this and move to Step 4.

### Step 3.5: Run Failure Diagnosis When Needed

If a check fails, a critic rejects the output, or the user corrects the implementation during the phase:
- Run the learning loop before retrying blindly
- Do not resume the phase until the learning loop or lesson capture step has completed when the miss is evidence-backed
- Classify the miss
- State the likely cause
- Apply the smallest fix
- Record a reusable lesson automatically with `node ./scripts/lesson-tools.mjs capture ...` when the evidence is strong enough
- If `node ./scripts/workflow-command-decision.mjs evaluate --input ...` recommends `capture_lesson`, complete lesson capture before retrying implementation
- Surface a workflow suggestion if the miss appears systemic

### Step 4: Manual Verification Checkpoint

Present the manual verification checklist from the plan:
```
Phase [N] automated checks passed. Before I move on, please verify:

- [ ] [Manual check 1]
- [ ] [Manual check 2]
...

Reply "done" or "confirmed" when you've verified these, or describe any issues you found.
```

**Do NOT auto-advance.** Wait for explicit confirmation from the user.

### Step 5: Mark Phase Complete

After the user confirms:
- Update the plan file: check off completed items (`- [ ]` → `- [x]`)
- Update the current project's `state.md` with the completed phase, next phase or completion state, blockers if any, and the latest verification timestamp
- State: "Phase [N] complete." and announce the next phase, or "All phases complete." if done

---

## Context Recovery

If this is a long session and you suspect context drift:
- Re-read the plan file before starting each new phase
- Re-read the current project's `state.md` before starting each new phase
- This costs a few seconds and prevents costly mistakes

---

## Important Rules

- **Never skip a phase** or reorder them without explicit user instruction
- **Never proceed past a failed automated check** — fix it first
- **Never retry blindly after a verified miss** — diagnose it first
- **Never proceed past a manual checkpoint** without explicit user confirmation
- **Never guess on ambiguous tasks** — ask
- **Keep changes atomic** — one logical unit per logical commit
- **If you discover scope not in the plan**, flag it before acting on it:
  ```
  I noticed [X] which isn't in the plan. Should I:
  A) Address it now (extends scope)
  B) Skip it and continue
  C) Add it as a note for later
  ```

- If newly discovered work maps to `blocking_unknown`, `decision_missing`, `evidence_weak`, `verification_missing`, `dependency_unmodeled`, or `rollout_unspecified`, route it to `/iterate_plan` or full re-planning instead of inventing a new design during implementation.
- When the helper-backed decision returns `replan`, stop implementation entry and route back through `/iterate_plan` or full replanning instead of beginning edits.

- After explicit user correction or eval-backed failure, update local learning artifacts with `node ./scripts/lesson-tools.mjs capture ...` when the lesson is durable and evidence-backed.

---

## Completion

When all phases are complete:

1. Summarize what was built:
   ```
   All phases complete. Here's what was implemented:
   - Phase 1: [summary]
   - Phase 2: [summary]
   ...
   ```

2. Point to next steps:
   - End the response with this exact standalone block using this plan file path:
     ```text
     Next step

     /validate_plan /absolute/path/to/plan.md
     ```
   - Run `/cm` to create commits if you haven't done so inline

---

## Relationship to Other Commands

Recommended RPI workflow:
1. `/research_codebase` — document the current state
2. `/create-plan` — design the implementation plan
3. `/implement_plan` — execute it (this command)
4. `/validate_plan` — verify correctness
5. `/cm` — commit the work
