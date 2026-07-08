---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADRs and glossary) on the plan server as we go.
disable-model-invocation: true
---

Run a relentless grilling session. Delegate the domain modeling (glossary, ADRs, term resolution) to the `/domain-modeling` skill.

## The interview

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask questions one at a time, waiting for feedback on each before continuing.

If a question can be answered by exploring the codebase, explore the codebase instead.

## After each answer

After the user answers each question:

1. **Modify the plan artifact** being grilled in-place — edit the plan itself to reflect the resolved decision (updated terminology, corrected assumptions, clarified scope, reordered priorities). The artifact IS the source of truth; don't let it go stale while side-files accumulate.

2. **If a term was resolved** or an ADR criterion was met, use `/domain-modeling` to capture it. It handles glossary updates and ADR creation on the plan server with the right format and location.

3. **Log the Q&A pair** to the plan server for the project. Infer the project from `git rev-parse --show-toplevel`:
   ```bash
   python3 ~/.agents/scripts/new-artifact.py \
     --dest "$HOME/Documents/plan-server" \
     --project "$(basename $(git rev-parse --show-toplevel 2>/dev/null || echo 'general'))" \
     --type grill \
     --topic "<session topic>"
   ```
   Fill in the generated file with the Q&A transcript.

Do NOT batch these writes. Write immediately after each question-answer round.

## Location convention

All artifacts land on the plan server:

```
~/Documents/plan-server/projects/{project}/
├── glossary/glossary.md       ← domain glossary (via domain-modeling)
├── adr/NNNN-slug.md           ← ADRs (via domain-modeling)
├── grill/                     ← Q&A transcripts
└── plans/                     ← plan artifacts (modified in-place)
```
