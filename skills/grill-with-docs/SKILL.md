---
name: grill-with-docs
description: An artifact-agnostic architecture-and-behavior interview for plans, issue drafts, design briefs, RFCs, tickets, and ideas, creating glossary and ADR records in the worktree context directory.
disable-model-invocation: true
---

Run a relentless grilling session. Delegate the domain modeling (glossary, ADRs, term resolution) to the `/domain-modeling` skill.

## Document style: terminal first

Every artifact, grill transcript, glossary entry, and ADR must be comfortable
to read in a terminal. Treat plain text as the source of truth; do not use
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
[Decision] -> [Artifact update] -> [Glossary / ADR] -> [Q&A transcript]
```

This changes presentation only. The active artifact remains the source of truth
for resolved decisions.

## Artifact-agnostic interview

First identify the artifact under discussion, its authority and editability,
the goal, and the relevant repository context. Then hold a natural
conversation about the artifact, not a checklist. Ask one question at a time
and adapt the next question to the answer.

Walk the decision map as far as the artifact requires:

1. Problem and intended outcome.
2. Observable behavior and acceptance boundaries.
3. Architecture and system shape.
4. Interfaces, data contracts, schemas, migrations, and compatibility.
5. Edge cases, failures, and recovery.
6. Trade-offs and long-term effects.
7. Teach-back: have the user restate the load-bearing decisions.

Skip branches that repository evidence or earlier decisions already settle,
but do not skip unresolved dependencies or failure behavior.

### How to ask

- Ask questions ONE at a time in plain terminal text. Never use the question /
  multiple-choice / option-picker tool - every question and explanation is
  typed prose.
- Wait for my reply before continuing. Never advance while a question is open.

### How to recommend (teach, don't just pick)

Before each real decision question, teach before you ask:

1. Lead with a plain one-line recommendation.
2. Name the realistic options and explain what each buys, costs, and changes
   long term.
3. Give the specific rationale for this artifact, repository, constraints, and
   goal.
4. End with the decision question stated plainly.

The user must be able to explain every resolved decision without reading code.
If repository exploration can answer a question, explore instead.

## If I ask YOU a question (clarification, not an answer)

When my reply is itself a question - "what does X mean?", "why option A over
option B?", or "what are the trade-offs?" - it is a clarification request,
not an answer:

- Do not log a Q&A pair, edit the artifact, or create glossary/ADR entries.
- Do not advance or mark anything resolved.
- Explain using the "Explaining on follow-ups" rules, then re-ask the original
  question plainly and wait.

A round closes only when I give a position, choice, or constraint.

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

Only run this section when my reply actually answers the open question with a
position, choice, or constraint. If it is a clarification request, follow the
section above instead.

1. **Update the writable artifact in place** with the resolved decision:
   terminology, assumptions, scope, priorities, interfaces, or failure
   behavior. If the artifact is read-only or external, state that and record
   the decision in the local transcript instead; never claim it was edited.
   The artifact remains the source of truth whenever it is writable.

2. **If a term was resolved** or an ADR criterion was met, use
   `/domain-modeling` to capture it. It handles glossary updates and ADR
   creation in the worktree context directory with the right format and
   location.

3. **Append the Q&A pair immediately** to one worktree context transcript. On
   the first answer, create the session transcript if needed:
   ```bash
   python3 ~/.agents/scripts/new-artifact.py \
     --type grill \
     --topic "<session topic>"
   ```
   Keep that generated path for the session and append later rounds to the
   same file. Do not create a new transcript for every answer, and do not
   batch these writes.

## Location convention

### Artifacts, grill, glossary
Land in the current worktree:

```
{git-root}/context/
├── designs/                  ← design artifacts, when locally created
├── issues/                   ← issue artifacts or drafts, when local
├── glossary/glossary.md      ← domain glossary (via domain-modeling)
├── grill/                    ← Q&A transcripts
└── plans/                    ← plan artifacts, when local
```

### ADRs
Land in the worktree context directory:

```
{git-root}/context/adr/{YYYY-MM-DD_HH-MM-SS}_{slug}.md
```
