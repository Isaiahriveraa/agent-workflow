---
name: design
description: Clarify a user problem and visualize the experience before deriving features or tickets. Use when the user says "design this", "organize this idea", or needs to understand a product flow; use lightweight walkthroughs, discovery prototypes when needed, and numbered behavior cards, not upfront implementation planning.
---

# Design

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract. Resolve its path independently of the target repository's working directory.

Shape the user's idea into a short, experience-first brief. Understand **who needs what outcome** before committing to features. Design clarifies the experience, not the implementation. Use `/prototype` discovery mode when seeing or trying the flow would resolve uncertainty; `/to-issues` follows once the selected behavior is clear enough, not merely because a brief exists.

Use this for product changes, bugs that need behavior clarified, backend work, integrations, and other changes where the intended outcome is not already clear. Small, obvious fixes can skip this stage.

## Output

Write one bundle under `context/designs/<slug>/`:

- `00-index.md` — the initiative, preserved brain spill, numbered outcome map, genuine behavior dependencies, provisional parallel candidates, open questions, and design status;
- `NN-<topic>.md` — one numbered behavior card per distinct user-visible or caller-visible outcome.

In the index, capture the user and current workaround, one experience walkthrough,
evidence versus assumptions, and the smallest useful outcome with deferred extras.
Link sketches, prototype decisions, and task feedback where available; say
`not tested` when no task observation exists. Keep this brief, not a mandatory PRD.

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

1. **Frame the user problem.** Preserve the brain spill, including deferred ideas. Name the user or caller, situation, current workaround, and intended outcome before discussing features. Invoke `/skill:grill-with-docs` for unresolved behavior decisions; reuse answers already given instead of repeating an interview. Ask related questions on one topic at a time, proportional to uncertainty.
2. **Check current behavior.** Inspect the relevant code or product evidence when available. Mark claims as user-reported when they cannot be verified; do not turn assumptions into facts.
3. **Walk and visualize one experience.** Start with a realistic situation, then follow the person's actions, visible feedback, result, and a consequential failure or recovery. Use a sketch or storyboard first; invoke `/skill:prototype` in discovery mode when interaction needs to be tried. Stay within the requested design scope; running executable prototypes needs explicit authorization. Do not demand polished alternatives for an unsettled flow. Capture what was learned, what changed, and what remains untested. For non-UI work, walk the caller's interaction instead. Investigate a concrete feasibility risk early through scoped research, not a speculative architecture plan.
4. **Derive and group outcomes.** Keep only capabilities needed for the chosen flow; preserve extras as deferred ideas. Number the cards and map genuine behavior prerequisites. Mark independent outcomes as provisional parallel candidates, noting known shared boundaries without pre-planning files or implementation order. Split only when outcomes can be understood and accepted independently.
5. **Write the brief.** Create the bundle, fill the index and cards, and keep unresolved behavior decisions visible. Do not create issue drafts here; `/to-issues` owns those. Do not wait to settle every future flow before documenting the selected outcome.
6. **Hand off or revisit.** Set `ready-for-issues` when the included topics can be drafted, otherwise set `blocked`. Name the bundle path, evidence, and next unresolved question or ticket-ready outcome. After prototype feedback or delivery, refresh affected cards, dependencies, and open questions; do not keep a second ticket-status table. Do not publish, plan the whole initiative, or start production implementation.

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
