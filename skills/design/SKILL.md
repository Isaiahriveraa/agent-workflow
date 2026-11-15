---
name: design
description: Frame a product problem and write its overview before any tickets exist. Use when the user says "design this", "organize this idea", "is this worth building", or needs a product flow understood; produces a problem brief and a what-and-why overview that become the parent issue, never an implementation plan.
---

# Design

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

Help the user decide whether a problem is worth solving, then describe what and why at a level a teammate reads in five minutes. Design never decides how: architecture, schemas, libraries, and file layout are planned when a ticket is taken.

Use this for product changes, bugs whose intended behavior is unclear, backend work, and integrations. Quick, Small, and direct Full requests skip it.

## Workflow

1. **Frame.** Preserve the user's brain spill, including deferred ideas. Name who has the problem, how it shows up, and today's workaround. Mark every claim certain, supposed, or unknown, and verify claims about current behavior against the code when it is available. Use `/skill:grill-with-docs` for unresolved behavior decisions, one topic at a time, reusing answers already given.
2. **Challenge.** Before any overview, call out the red flags from the workflow contract (a solution in the problem statement, no measurable success, an assumed cause, only the requester quoted). Ask the questions that would change the decision, ranked by importance × uncertainty.
3. **Ask for the decision.** Present the problem brief and ask: invest, explore more, defer, or stop. Stop here unless the user chooses invest.
4. **Walk one experience.** From a realistic starting state through the user's actions to the visible result and one consequential failure. Sketch it as a Mermaid flowchart; use `/skill:prototype` discovery only when the interaction must be tried. For non-UI work, walk the caller's interaction.
5. **Write the overview.** Vision, goals, scope, MoSCoW capabilities, the main flow, the domain picture as a Mermaid `erDiagram` read as sentences, unknowns (each a future Research ticket), and the ordered slice list with a first-release line. Ask the user to approve the scope.
6. **Hand off.** Once the scope is approved, `/skill:to-issues` splits the slices into tickets. Design does not publish issues or start implementation.

## Output

Draft in `context/designs/<slug>/00-index.md`, created with:

```sh
python3 ~/.agents/scripts/new-artifact.py --type designs "<design title>"
```

The draft has two parts in this order, which become the parent issue body when `/skill:to-issues` publishes the split:

1. **Problem brief** — situation and who, evidence, opportunity, success, worth it, key nouns, open questions, and the decision.
2. **Overview** — the sections listed in step 5.

Keep the original brain spill below both parts in the draft only; it is never published. The draft is a private working file: never reference its path in an issue, PR, or commit.

## Principles

- Keep the user's meaning; label interpretations and user reports.
- Prefer observable behavior and plain language over technical prescriptions.
- Research only what verifies current behavior or settles a material factual question, and cite it.
- An open technical question never blocks the overview; it becomes a Research ticket or is answered when its ticket is taken.
- Do not guess a product decision to make the overview look complete; leave it as an open question.

## Done when

- The user has made an invest, explore, defer, or stop decision on the problem brief.
- For invest: the overview states what and why with no implementation detail, every unknown is a Research ticket candidate, and the user approved the scope.
- `python3 ~/.agents/scripts/slop-lint.py context/designs/<slug>/` passes, or remaining hits are deliberate.
