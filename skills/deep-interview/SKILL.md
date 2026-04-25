---
name: deep-interview
description: >
  Ouroboros-inspired Socratic ambiguity-gated requirements workflow.
  Activated by keywords: "interview", "deep interview", "gather requirements",
  "interview me", "don't assume", "ouroboros".
  Pauses all implementation and instead resolves ambiguity through structured
  Socratic questioning before any code is written or a plan is formed.
---

# Deep Interview — Ouroboros Requirements Clarification

## Purpose

Deep-interview is a **requirements-first** gate that runs BEFORE planning, coding, or delegating. Its only job is to kill ambiguity at the root.

Before writing a single line of code or producing any artifact, the AI must exit this mode with:
- A clear **scope summary**
- Known **constraints** (technical, business, temporal)
- Explicit **success criteria**
- A confident **recommended next mode** (ralplan, solo execute, team, etc.)

If any of these remain undefined when the conversation ends, deep-interview is incomplete — regardless of how long the conversation lasted.

---

## Activation

### Entry Trigger

The AI enters deep-interview mode when the user writes (case-insensitive, anywhere in the message):

- `interview`
- `deep interview`
- `gather requirements`
- `interview me`
- `don't assume`
- `ouroboros`

### Entry Behavior

Upon activation, the AI **immediately stops** any in-progress work — no implementation, no planning artifacts, no code generation. The only valid action in deep-interview mode is asking questions.

A minimal acknowledgment is allowed ("Understood — entering deep interview mode. Let's clarify before proceeding.") but **no advice, no suggestions, no pre-emptive plans** may be offered until the mode exits.

### Exit Conditions

Deep-interview exits when **all** of the following are true:

1. Scope is bounded and mutually agreed upon
2. Constraints are surfaced and documented
3. Success criteria are measurable and clear
4. The recommended next mode is stated explicitly

The user may also exit by saying `exit deep-interview` or `skip` at any time — in which case the partially gathered state is still forwarded to the next mode as a partial handoff.

---

## The Ouroboros Cycle

Ouroboros is the serpent that eats its own tail. In this workflow, the cycle refers to the self-referential question loop that drives toward clarity:

```
question → answer → deeper question → answer → ... → clarified requirement
```

The cycle rules:

1. **Surface question** — Ask the most important unknown first. Do not cluster multiple questions into one.
2. **Receive answer** — Accept the user's response as the new ground truth. Do not re-ask the same framing.
3. **Deeper question** — Use the answer to generate a more specific question. Each answer should unlock a more targeted follow-up.
4. **Repeat** — Continue until no new ambiguity surfaces from the answer.
5. **Pivot** — When one dimension is saturated, move to the next (scope → constraints → success criteria → edge cases → exit).

### Question Dimensions (in order)

| Dimension | Purpose | Example |
|---|---|---|
| **Intent** | Why does this need to exist? What problem does it solve? | "What will break if this doesn't ship?" |
| **Scope** | What is explicitly in scope? What is explicitly out? | "Does this need to handle X, or only Y?" |
| **Constraints** | What limits the solution space? | "Is there an existing system this must integrate with?" |
| **Success criteria** | How do we know it's done? | "What does 'working' look like in concrete terms?" |
| **Edge cases** | What are the failure modes? | "What happens if the user does X instead of Y?" |
| **Assumptions** | What is the AI assuming that may not be true? | "I assumed the data source is X — is that correct?" |

Do not advance to the next dimension until the current one is saturated. A dimension is saturated when the user's answers stop producing new critical information after two consecutive follow-ups.

---

## Rules

### The Four Laws of Deep-Interview

1. **Never implement during deep-interview.** Zero lines of code, zero plans, zero design docs. The only output is questions and the final structured handoff.

2. **Never assume.** If something is not stated, ask. Common blind spots:
   - Tech stack preferences
   - Team size / who's maintaining it
   - Existing systems that must integrate
   - Non-functional requirements (latency, scale, compliance)
   - Who's the end user
   - What happens when things go wrong

3. **Ask one question at a time.** Compound questions dilute answers. If you must ask two, separate them with a clear priority order.

4. **Never lead the witness.** Do not embed the desired answer in the question. "Do you want the fast approach or the correct one?" is not a valid question — it telegraphs a judgment the user may not share.

### Prohibited Actions (during deep-interview)

- Writing code, pseudocode, or boilerplate
- Creating plans, PRDs, or design documents
- Suggesting libraries, frameworks, or approaches
- Offering to "just do X for now"
- Making assumptions about the user's intent and proceeding
- Skipping dimensions because they feel settled

---

## Structured Output

When deep-interview exits, produce a **structured handoff block** in this format:

```markdown
## Requirements Handoff

**Intent:** [1-2 sentence description of why this exists]

**Scope:**
- In: [explicitly included]
- Out: [explicitly excluded]

**Constraints:**
- [Technical] [e.g., must run on Node 18, existing Postgres DB]
- [Business] [e.g., must be backward-compatible with v1 API]
- [Temporal] [e.g., must ship before Q3]

**Success Criteria:**
1. [Measureable criterion]
2. [Measureable criterion]

**Edge Cases Surfaced:**
- [What happens when X]
- [What happens when Y]

**Recommended Next Mode:** [ralplan | solo execute | team | deep-interview incomplete]
**Confidence:** [high | medium | low]
```

This block is the **only** artifact that exits deep-interview mode. It is passed to the next mode as the starting context.

---

## Mode Routing After Deep-Interview

| Signal | Recommended Next Mode |
|---|---|
| Clear scope, clear constraints, clear success criteria | `ralplan` or `solo execute` |
| Multiple independent workstreams | `team` |
| Technical ambiguity resolved but business ambiguity remains | `deep-interview` (continue) |
| No meaningful requirements gathered | Do not proceed — state what's missing |