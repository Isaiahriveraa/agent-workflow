---
name: orchestration
description: Keep the main agent available for conversation while approved, bounded tasks run in subagents. Default route is a subagent; use Herdr panes or isolated CLI workers only when the user explicitly names Herdr, panes, or a separate agent session. Assess and propose first; dispatch only after the user approves the assignment.
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
2. **Propose** one assignment using the template in `references/assignment.md`: goal, allowed changes, non-goals, route, checks, report destination.
3. **Wait** for the user's green light on that specific assignment. General enthusiasm, plan approval, or invoking this skill does not authorize workers.
4. **Dispatch** only the approved scope. Ask again before adding workers, changing concerns, or entering a new stage.
5. **Return control** to the user after dispatch. Say what is running and where its result will appear. Do not hold the conversation open waiting.
6. **Collect and verify** results against the child report and the actual diff or artifacts. Synthesize per `references/synthesis.md`.

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
| Writing an assignment or reading a child report | `references/assignment.md` |
| Tracking progress, verifying, final report | `references/synthesis.md` |
| Herdr panes, worktrees, CLI workers (explicit request only) | `references/herdr.md` |
