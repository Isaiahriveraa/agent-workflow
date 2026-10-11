---
name: design
description: Organize a brain spill into numbered behavior cards and a dependency map. Use when the user says "design this", "organize this idea", or wants to clarify an initiative before tickets; interview meaningful scenarios with grill-with-docs, not implementation planning.
---

# Design

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract. Resolve its path independently of the target repository's working directory.

Shape the user's idea into a short brief that can become a useful backlog. Design clarifies **what problem to solve**; it does not decide the implementation. The next stage is `/to-issues`, not `/plan`.

Use this for product changes, bugs that need behavior clarified, backend work, integrations, and other changes where the intended outcome is not already clear. Small, obvious fixes can skip this stage.

## Output

Write one bundle under `context/designs/<slug>/`:

- `00-index.md` — the initiative, preserved brain spill, numbered outcome map, genuine behavior dependencies, provisional parallel candidates, open questions, and design status;
- `NN-<topic>.md` — one numbered behavior card per distinct user-visible or caller-visible outcome.

Keep the original brain spill or a faithful linked record alongside the organized cards; do not erase ideas merely because they are deferred. The design map describes outcomes, not execution status. Once tickets exist, `context/issues/<slug>/000-index.md` is the sole execution queue. Behavior dependencies are stable intent; technical overlap and readiness must be re-evaluated just before work. Parallel candidates are provisional, never permission to launch agents or worktrees.

Initialize the bundle with:

```sh
python3 ~/.agents/scripts/new-artifact.py --type designs "<design title>"
```

The index status is exactly one of:

- **ready-for-issues** — each included topic has enough clarity to draft a behavior-focused ticket;
- **blocked** — a material product decision prevents writing a truthful ticket; name the decision and its impact.

An open technical question does not block ticket creation when it can be resolved while planning the selected ticket. Do not guess at a product decision to make a brief look complete.

## Topic brief

Keep each card concise and use these sections:

1. **Problem** — who is affected, what is difficult or missing, and why it matters.
2. **Current behavior** — what happens today and the user-visible effect. Verify repository claims when the relevant code is available; distinguish observed behavior from what the user reported, and cite paths or interfaces without line numbers.
3. **Desired behavior** — what the user, caller, or system should be able to observe instead.
4. **How we will know** — one or more concrete examples or outcomes that could later become ticket acceptance criteria.
5. **Scope and open questions** — only meaningful boundaries or unresolved decisions that affect behavior.

For stateful or ambiguous behavior, add one short scenario from starting state through action to observed result. Include a meaningful failure or alternative outcome only when it could change the desired behavior. Skip scenarios for straightforward changes; do not write an exhaustive edge-case list.

Do not put a proposed architecture, file list, implementation sequence, technical checklist, or speculative edge-case catalog in the design. Record technical evidence only when it helps explain current behavior or a real constraint. `/plan` checks the selected ticket against the live code and owns the implementation approach.

## Workflow

1. **Understand the request.** Preserve what the user wants and organize the brain spill without losing deferred ideas. Invoke `/skill:grill-with-docs` explicitly for the human interview. Ask unanswered questions about meaningful behavior, walkthroughs, and failure outcomes in batches of related questions on one topic (for example, one card's failure cases together), so the user can answer each topic in one reply; scale the batches to uncertainty, not a fixed checklist or mandatory teach-back for every card. Ask follow-ups in the next batch.
2. **Check current behavior.** Inspect the relevant code or product evidence when available. Mark claims as user-reported when they cannot be verified; do not turn assumptions into facts.
3. **Group by outcome.** Number the cards and map genuine behavior prerequisites with the outcome each allows. Mark independent outcomes as provisional parallel candidates, noting known shared boundaries without pre-planning files or implementation order. Split only when outcomes can be understood and accepted independently.
4. **Write the brief.** Create the bundle, fill the index and cards, and keep unresolved behavior decisions visible. Do not create issue drafts here; `/to-issues` owns those.
5. **Hand off.** Set `ready-for-issues` when the topics can be drafted, otherwise set `blocked`. Report the bundle path and specific decisions needing attention. After feedback or delivery, refresh affected cards, dependencies, and open questions from evidence; do not keep a second ticket-status table here. Do not publish, plan the whole initiative, or start implementation.

## Principles

- Keep the user's meaning; label interpretations and reported facts.
- Prefer observable behavior and plain language over technical prescriptions.
- Research only what is needed to verify current behavior or resolve a material factual question. Cite external evidence when used.
- Do not require an explain-back, a full architecture walkthrough, or approval of implementation details before ticket drafting.
- A ticket may be drafted as `needs-review` when its gap is explicit; do not invent behavior to force readiness.

## Done when

- The bundle exists at `context/designs/<slug>/` with an index and one card per distinct outcome.
- Every card states the problem, current behavior, desired behavior, and observable success.
- Repository claims are grounded or marked user-reported; assumptions and material open decisions are visible.
- The index preserves the brain spill, records behavior dependencies and provisional parallel candidates, and has exactly one valid design status, not a duplicate execution queue.
- The brief is ready for `/to-issues`, or clearly names what blocks ticket drafting.
- `python3 ~/.agents/scripts/slop-lint.py context/designs/<slug>/` passes, or remaining hits are deliberate and locally explained.
