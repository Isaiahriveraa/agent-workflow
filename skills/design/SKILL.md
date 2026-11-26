---
name: design
description: "Use when framing a product problem before issues exist. Writes the overview. An implementation plan belongs to plan."
---

# Design

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

Help the user decide whether a problem is worth solving, then describe what and why at a level a teammate reads in five minutes. Design never decides how: architecture, schemas, libraries, and file layout are planned when an issue is taken.

Use this for product changes, bugs whose intended behavior is unclear, backend work, and integrations. Quick, Small, and direct Full requests skip it.

## Workflow

1. **Frame.** Preserve the user's brain spill, including deferred ideas. Name who has the problem, how it shows up, and today's workaround. Mark every claim certain, supposed, or unknown, and verify claims about current behavior against the code when it is available. Use `/skill:grill-with-docs` for unresolved behavior decisions, one topic at a time, reusing answers already given.
2. **Challenge.** Before any overview, call out the red flags from the workflow contract (a solution in the problem statement, no measurable success, an assumed cause, only the requester quoted). Ask the questions that would change the decision, ranked by importance × uncertainty.
3. **Ask for the decision.** Present the problem brief and ask: invest, explore more, defer, or stop. Stop here unless the user chooses invest.
4. **Walk one experience.** From a realistic starting state through the user's actions to the visible result and one consequential failure. Sketch it as a Mermaid flowchart; use `/skill:prototype` discovery only when the interaction must be tried. For non-UI work, walk the caller's interaction.
5. **Complete the design.** Extend the same document, not a second overview that repeats the brief. Add the proposed experience with its mandatory flowchart, scope and ordered slices with priorities, blockers, and a first-release line. Define only necessary key nouns and relationships. Put unresolved questions last in the main document; technical unknowns become Research issue candidates. Ask the user to approve the scope.
6. **Hand off.** Once the scope is approved, `/skill:to-issues` splits the slices into issues. Design does not publish issues or start implementation.

## Output

Draft in `context/designs/<slug>/00-index.md`, created with:

```sh
python3 ~/.agents/scripts/new-artifact.py --type designs "<design title>"
```

Use one `00-index.md` per design. Different problems or independently approvable outcomes get separate design folders; slices are steps toward the same outcome, not competing designs inside one index. A collection index, if present, only links to designs.

Use this section order:

1. **Situation and who** — who struggles, what happens today, and the workaround.
2. **Opportunity** — what could improve and why, in one or two sentences.
3. **Success and worth it** — observable improvement, baseline, and why it merits the effort.
4. **Proposed experience** — a short walkthrough and a mandatory Mermaid flowchart showing the starting state, actions, visible result, and a consequential failure. For non-UI work, show the caller's interaction.
5. **Scope and slices** — **In**, **Out**, ordered end-to-end slices with Must/Should/Could priorities and blockers, and the first-release line.
6. **Key nouns** — only terms and relationships needed to understand the design; omit if unnecessary.
7. **Decisions** — the user's investment decision and settled answers labeled **Decided:**. Move resolved questions here with their answers.
8. **Open questions** — only unresolved questions, labeled **Open:** and ranked by importance × uncertainty. Write None if settled. This is the last main section.
9. **Appendix: evidence** — sources, code references, investigation details, and claim certainty. Short source markers may link here without interrupting the main text.
10. **Appendix: original brain spill (private)** — preserve the user's words and deferred ideas at the bottom; never publish this section.

Frame first, filling only the sections needed for the investment decision. Complete the experience and scope after invest. The completed design and evidence become the parent issue body when `/skill:to-issues` publishes the split, without repeating a separate brief and overview. The draft is a private working file: never reference its path in an issue, PR, or commit.

## Principles

- Keep the user's meaning; label interpretations and user reports.
- Write for a quick decision, not a record of the whole investigation. Use plain, human prose, short bullets, and one home for each fact. Do not repeat vision, goals, capabilities, or unknowns under extra headings.
- Make Markdown readable in MarkText: `##` section headings, `###` only when needed, **bold** decisions and scan labels, italics sparingly for secondary context. Do not rely on renderer-specific callouts or collapsible sections.
- Flowcharts are mandatory, not a substitute for the short walkthrough. Use fenced `mermaid` blocks, simple syntax, stable node IDs, and quoted labels. Fix syntax when updating a diagram; do not claim rendering was checked unless it was. Add other diagrams only when they clarify a decision.
- Prefer observable behavior and plain language over technical prescriptions.
- Research only what verifies current behavior or settles a material factual question, and cite it.
- An open technical question never blocks the overview; it becomes a Research issue or is answered when its issue is taken.
- Do not guess a product decision to make the overview look complete; leave it as an open question.

## Done when

- The user has made an invest, explore, defer, or stop decision on the problem brief.
- For invest: the overview states what and why with no implementation detail, every unknown is a Research issue candidate, and the user approved the scope.
- `python3 ~/.agents/scripts/slop-lint.py context/designs/<slug>/` passes, or remaining hits are deliberate.
