---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADRs and glossary) in the worktree context directory as we go.
disable-model-invocation: true
---

Run a relentless grilling session. Delegate the domain modeling (glossary, ADRs, term resolution) to the `/domain-modeling` skill.

## Document style: terminal first

Every plan, grill transcript, glossary entry, and ADR must be comfortable to
read in a terminal. Treat plain text as the source of truth; do not use
Mermaid, HTML, callout syntax, or layout that depends on a graphical renderer.

- Prefer short headings, numbered sections, and bullets over dense prose.
- Wrap prose and table cells at roughly 80 columns. Keep tables narrow; use
  bullets when a table would require horizontal scrolling.
- Use fenced `text` blocks for diagrams and draw relationships with ASCII
  characters such as `+`, `-`, `|`, `>`, and `v`.
- Keep diagrams top-to-bottom or left-to-right, with one clear reading path.
  Put the same relationship in a short bullet list when the diagram would be
  ambiguous in a narrow terminal.
- Use blank lines between sections and bullets. Do not rely on color, emoji,
  alignment, or special Unicode box-drawing characters to convey meaning.

Recommended flow shape:

```text
[Decision] -> [Plan update] -> [Glossary / ADR] -> [Q&A transcript]
```

This changes presentation only. The interview remains exhaustive, and the
plan remains the source of truth for resolved decisions.

## The interview

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

### How to ask

- Ask questions ONE at a time in plain terminal text. Never use the question /
  multiple-choice / option-picker tool - every question and explanation is
  typed prose.
- Wait for my reply before continuing. Never advance while a question is open.

### How to recommend (teach, don't just pick)

Before asking each question, give your recommendation as a teaching answer:

Lead every recommendation with the verdict in ONE plain line; rationale
comes after. The user must be able to stop reading after that line and
still decide.

1. Name the realistic options you weighed.
2. Walk the trade-offs - what each option buys, what it costs, and the
   long-term consequences (maintenance, complexity, scalability).
3. Verdict plus WHY it fits THIS project - cite our actual codebase,
   constraints, and goals.
4. End with the question itself, stated plainly.

By the end of the session I should be able to explain every decision myself,
without reading the code.

If a question can be answered by exploring the codebase, explore the codebase instead.

## If I ask YOU a question (clarification, not an answer)

When my reply is itself a question - "what does X mean?", "why option A over
option B?", "what are the trade-offs?" - that is a CLARIFICATION REQUEST, not
an answer:

- Do NOT log it as a Q&A pair. Do NOT edit the plan. Do NOT create glossary
  or ADR entries. Do NOT mark anything resolved or delegated.
- Do NOT advance to the next question.
- Instead: answer in the "Explaining on follow-ups" style below -- define
  the term, compare the options, but lead with the one-liner and keep
  deeper mechanics available on request.
- Then RE-ASK the original question (restate it more clearly if that helps)
  and wait again.

A question round only closes when I give a position, choice, or constraint.

## Explaining on follow-ups

Every explanation during the session -- recommendations, clarifications,
follow-up whys -- leads with the mechanism, not the history:

- **One-liner first.** Reduce the whole idea to a single yes/no question
  or rule the user can test themselves ("did X read our cookie?"). Give
  depth only if asked.
- **Binary beats taxonomy.** If the explanation has three moving parts,
  find the ONE check that makes the other two irrelevant.
- **No jargon on first pass.** Use the system's own nouns (the route, the
  cookie, the header) instead of pattern names. If a term must be defined
  before it can be used, shrink the explanation until it does not.
- **Cap: five short sentences** before the user can act or decide.
  Anything longer gets split: verdict now, mechanics on request.
- **End teaching by distilling back.** After a multi-step explanation,
  ask the user to say the rule in their own one line. Confirm or correct
  it. Record that line in the transcript if it resolved the decision.

Boundary: deep multi-step teaching stays opt-in (the `/tutor` skill path
when the user explicitly asks to understand something). These rules
govern the default bundled explanation that ships with every grill
question and clarification answer.

## After each answer

Only run this section when my reply actually ANSWERS the open question (a
position, choice, or constraint). If my reply was instead itself a question,
stop and follow "If I ask YOU a question" above before doing any of these
steps.

1. **Modify the plan artifact** being grilled in-place — edit the plan itself to reflect the resolved decision (updated terminology, corrected assumptions, clarified scope, reordered priorities). The artifact IS the source of truth; don't let it go stale while side-files accumulate.

2. **If a term was resolved** or an ADR criterion was met, use `/domain-modeling` to capture it. It handles glossary updates and ADR creation in the worktree context directory with the right format and location.

3. **Log the Q&A pair** to the worktree context directory:
   ```bash
   python3 ~/.agents/scripts/new-artifact.py \
     --type grill \
     --topic "<session topic>"
   ```
   Fill in the generated file with the Q&A transcript.

Do NOT batch these writes. Write immediately after each question-answer round.

## Location convention

### Plans, grill, glossary
Land in the current worktree:

```
{git-root}/context/
├── glossary/glossary.md       ← domain glossary (via domain-modeling)
├── grill/                     ← Q&A transcripts
└── plans/                     ← plan artifacts (modified in-place)
```

### ADRs
Land in the worktree context directory:

```
{git-root}/context/adr/{YYYY-MM-DD_HH-MM-SS}_{slug}.md
```
