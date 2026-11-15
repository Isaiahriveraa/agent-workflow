---
name: orchestration
description: Delegate approved, bounded work to subagents while the main agent stays the user's conversation partner, including splitting a large task across parallel subagents along natural seams. Default route is a subagent; use Herdr panes or isolated CLI workers only when the user explicitly names Herdr, panes, or a separate agent session. Assess and propose first; dispatch only after the user approves the assignment.
---

# Orchestration

The main agent stays the user's conversation partner and owns assessment, delegation, steering, review, and reporting. Workers own bounded assignments, not the conversation.

## Default route

- **Subagent** (the host's Agent tool) is the default for any delegated task. Do not use Herdr, panes, or CLI workers unless the user asks for them.
- **Direct work** when dispatch costs more than it saves (unclear behavior, shared decisions, trivial edits).
- **Herdr / isolated CLI worker** only on explicit request. Load `references/herdr.md` first and enforce its preflight.

Routing details, model choice, and subagent types: `references/routing.md`.

## Flow

1. **Clarify** the observable outcome, scope, dependencies, risks, and completion evidence with the user.
2. **Propose** the assignment, or the split for a large task, using `references/assignment.md`: goal, allowed changes, non-goals, route, checks, report destination.
3. **Wait** for the user's green light on that specific assignment or split. General enthusiasm, plan approval, or invoking this skill does not authorize workers.
4. **Dispatch** only the approved scope. Ask again before adding workers, changing concerns, or entering a new stage.
5. **Return control** to the user after dispatch. Say what is running and where its result will appear. Do not hold the conversation open waiting.
6. **Collect and verify** results against the child report and the actual diff or artifacts. Review and synthesize per `references/synthesis.md`.

## Splitting a large task

Split when the work spans several files with clear seams and the units can finish without each other's output. Do not split tightly coupled work, a bug whose cause is still unknown, or anything that is already one deliverable.

- **Gather context first.** Read the relevant code, conventions, and dependencies before cutting units. A worker should never need to ask where something lives or which pattern to follow.
- **Cut 2-4 units.** Each has one bounded deliverable and exclusive files. More units add coordination cost without adding correctness.
- **Settle contracts before parallel work.** Agree the frontend direction and the interfaces between units with the user first; never run units in parallel while a contract between them is undecided.
- **Specify behavior, not code.** Each prompt states what the code must do, its inputs and outputs, edge cases, and constraints. If you could paste the finished code into the prompt, you are implementing.
- **The coordinator steers; workers write the code.** Fixes go back to the responsible worker with direction in behavior terms. Taking over the keyboard teaches nothing and hides why the spec failed.
- **Answer questions directly.** A worker's question is a real gap in the prompt: answer it with a decision and share the answer with any sibling that has the same gap.

After all units pass review, run `/skill:code-judgment` on the combined diff; code review follows AGENTS.md **Pick the speed before coding**.

## Core rules

- A worker that edits code gets exclusive ownership of its allowed files while active. No overlapping writers.
- Never stash, reset, copy, or commit dirty changes just to make dispatch possible. If a task needs uncommitted work, it is not independent: wait, narrow it to read-only research, or get approval for a dependency-aware sequence.
- Idle, done, or "report written" proves only that work stopped. Verify artifacts and checks before marking anything verified.
- Execution approval is not integration approval. Do not merge, cherry-pick, commit, publish, or clean up worker branches without that action's own approval.
- If the host cannot spawn subagents, say so and propose another route.

## Load on demand

| Need | Load |
| --- | --- |
| Choosing route, model tier, or subagent type | `references/routing.md` |
| Writing an assignment, a split, or a worker prompt; reading a child report | `references/assignment.md` |
| Reviewing results, the correction loop, and the final report | `references/synthesis.md` |
| Herdr panes, worktrees, CLI workers (explicit request only) | `references/herdr.md` |
