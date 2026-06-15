---
name: grill-with-docs
description: Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates the plan in-place after each question. Autowrites glossary/ADR entries and logs grill transcripts to thoughts/glossary.md, thoughts/adr/, and thoughts/{Month-Year}/W{week}/grill/ via new-handoff.py.
---

<what-to-do>

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing.

If a question can be answered by exploring the codebase, explore the codebase instead.

</what-to-do>

<supporting-info>

## Domain awareness

During codebase exploration, look for existing documentation under `thoughts/`:

```
/
├── thoughts/
│   ├── glossary.md              ← domain glossary
│   ├── adr/                     ← Architecture Decision Records
│   │   ├── 0001-slug.md
│   │   └── 0002-slug.md
│   ├── {Month-Name}-{Year}/
│   │   └── W{week-num}/
│   │       ├── handoffs/
│   │       ├── reflections/
│   │       └── grill/
```

- **`thoughts/glossary.md`** — Canonical domain glossary for the project. Created lazily when the first term is resolved.
- **`thoughts/adr/`** — Architecture Decision Records. Numbered: `0001-slug.md`, `0002-slug.md`, etc. Created lazily when the first ADR is needed.
- **`thoughts/{Month-Name}-{Year}/W{week-num}/grill/`** — Grill session outputs and Q&A transcript handoffs created via `new-handoff.py`.

Create files lazily — only when you have something to write.

### Glossary path resolution

- If `thoughts/glossary.md` exists → use it as the canonical glossary
- If it doesn't exist → create `thoughts/glossary.md` when first term is resolved

### ADR path resolution

- If `thoughts/adr/` exists → use it for ADRs
- If it doesn't exist → create `thoughts/adr/` when first ADR is needed

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in the glossary (`thoughts/glossary.md`), call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Cross-reference with thoughts artifacts

Before accepting a plan or design claim, check:
1. **`thoughts/glossary.md`** — does the claim conflict with established domain language?
2. **`thoughts/adr/`** — was an ADR written that this plan contradicts?

If a contradiction is found, surface it: "ADR-0004 decided we're using event sourcing for orders, but your plan assumes a relational write model — which is right?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update glossary inline

When a term is resolved, update `thoughts/glossary.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

The glossary should be totally devoid of implementation details. Do not treat it as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).

ADRs go to `thoughts/adr/NNNN-slug.md`.

### Auto-write after each question

After the user answers each question:

1. **Modify the plan artifact being grilled in-place**: Edit the plan itself to reflect the resolved decision — updated terminology, corrected assumptions, clarified scope, reordered priorities, whatever the answer changed. Read the relevant sections, apply the changes, and save. The artifact IS the source of truth of what we agreed on; don't let it become stale while side-files accumulate the real decisions.

2. **If a term was resolved**: Immediately update `thoughts/glossary.md` with the resolved term using the format: `- **{term}**: {definition}`. Append it to the file, creating it if needed.

3. **If an ADR criterion was met** (hard to reverse, surprising, real trade-off): Immediately create `thoughts/adr/{incrementing-number}-{slug}.md` with the decision. Use the ADR format from [ADR-FORMAT.md](./ADR-FORMAT.md).

4. **Log the Q&A pair**: append to a temp session transcript in `thoughts/{Month-Name}-{Year}/W{week-num}/grill/` using:
   ```
   python3 ~/.agents/scripts/new-handoff.py --type grill "<topic>"
   ```
   The script handles path creation. After calling it, fill in the generated file with the Q&A session content.

Do NOT batch these writes. Write immediately after each question-answer round.

At session end, call `python3 ~/.agents/scripts/new-handoff.py --type grill "<topic>"` to capture the grill session output, then fill in the generated file with the final grill session summary.

</supporting-info>
