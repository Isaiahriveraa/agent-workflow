---
name: plan-standup-notes
description: Turn an existing engineering plan file into compact, iPad-friendly learning notes and a peer-ready standup explanation. Use when the user supplies a plan path and wants the big idea, tradeoffs, production reasoning, and an explain-back guide—not implementation steps or a code summary.
---

# Plan Standup Notes

Turn a plan the human has already written into a short learning artifact they can handwrite, study, and explain to a peer. The output teaches the design, not the plan's file layout or code syntax.

## Input and boundaries

1. Read the supplied plan file and only directly referenced decision documents needed to understand a material choice.
2. Treat the plan as the source of truth. Do not invent architecture, claim an option was rejected when the plan does not say so, or silently fill material gaps. Label missing rationale **Question to resolve**.
3. Do not implement, edit the plan, or inspect unrelated source code unless asked. This skill explains a plan; it does not validate it.

## Produce one handwriting-friendly note sheet

Aim for one iPad screen/page per view. Use short phrases, whitespace, arrows, and ASCII only when it clarifies a relationship. Prefer 5–7 memorable ideas over exhaustive coverage. If the plan has more than seven concerns, group them by outcome or architectural layer; do not list every ticket.

Start with a **30-second standup**: 2–4 spoken sentences covering the outcome, main approach, and current/proving step. Then produce these two views.

### 1. Simplified view — “the story I can tell”

Use plain language and no unexplained acronyms.

```text
BIG IDEA
<user/problem> → <product outcome>

WHY NOW
- <business/user reason>

THE FLOW
<actor> → <main action> → <system decision> → <user-visible result>

WHAT WE ARE BUILDING
1. <outcome / responsibility>
2. <outcome / responsibility>
3. <outcome / responsibility>

WHY THIS SHAPE
<chosen approach> because <plan-supported reason>
Not <alternative>, because <tradeoff or unresolved rationale>

SAFE TO GROW
<one concrete foundation: contract, boundary, data rule, test seam, or fallback>

MY EXPLAIN-BACK
"We are ___ so that ___. We chose ___ because ___. It stays safe to grow by ___."

CHECK MYSELF
- What fails if this decision is missing?
- What would I verify before calling it done?
```

### 2. Developer view — “the design I can defend”

Keep technical terms, but define each once in parentheses. Center the view on responsibilities and decisions, not filenames.

```text
SYSTEM MAP
<entry point>
      |
      v
<boundary / service> ---> <data or external dependency>
      |
      v
<observable result>

DESIGN DECISIONS
| Decision | Why it wins | Cost / guardrail |
|---|---|---|
| ... | ... | ... |

PRODUCTION CHECKS
- Correctness: <race, retry, state, or validation concern>
- Security/privacy: <boundary or N/A with reason>
- Reliability: <failure behavior, fallback, or N/A>
- Scale/operations: <index, limit, observability, or intentionally deferred reason>
- Verification: <observable test or acceptance signal>

BUILD ORDER
foundation → smallest end-to-end proof → hardening → rollout/verification

SENIOR QUESTIONS
- Which assumption is riskiest, and how will we prove it early?
- What stays stable if a future feature changes?
- What is deliberately deferred, and what signal would make us escalate?
```

Only include applicable production checks. “Production-ready” means proportionate safeguards for the plan's actual risks, not speculative infrastructure. Identify the smallest sound foundation, then name a concrete scale, usage, or failure signal that would justify more complexity.

## Make the notes learnable

Use the design guidance in [references/note-design.md](references/note-design.md).

- Chunk information by a meaningful relationship (flow, decision, or responsibility), not by plan heading.
- Give the learner an executable mental model: a flow diagram, a decision with its tradeoff, and a completion signal.
- End with recall prompts. Do not provide their answers immediately below the questions.
- Be precise about the medium: stylus-on-iPad notes can support intentional handwriting and spatial organization, but evidence does not establish a universal learning advantage over every digital method. Prioritize active summarizing and distraction-free review.

## Finish

After the two views, add **One thing to ask in standup** only if an actual material uncertainty remains. Otherwise end with **Ready to explain** and the explain-back sentence.
