---
name: design
description: Turn a user's raw product, system, or feature intent into a repository-grounded design artifact that records behavior, evidence, decisions, scope, risks, and acceptance for later planning. Use when the user wants to explore or specify what should be built before implementation.
disable-model-invocation: true
---

# Design

Convert an idea into a durable design handoff without silently changing the user's intent. This skill is general-purpose: it applies to product behavior, backend systems, data flows, APIs, workflows, integrations, and user-facing surfaces.

The work has two moves: pull the user's thoughts out of their head, then write them down simply. Most users arrive with jumbled thoughts; cleaning them up without losing meaning is part of the job.

## Output contract

Produce exactly one Markdown design artifact for this invocation. The authoritative inputs to `/plan` are this artifact's **Desired behavior**, **Scope**, **Non-goals**, **Constraints**, **Decisions and trade-offs**, **System shape and boundaries**, **Edge cases and failure behavior**, **Evidence**, **Open questions**, and **Acceptance** sections; **Raw intent** remains the source of the user's intent. `/plan` should verify citations and current repository state rather than repeat research that is already sufficient in the artifact. Supplemental research belongs in `/plan` only for material gaps or stale/contested evidence.

The artifact records the interview: the questions asked and the user's answers, cleaned up the same way as the raw intent. A grill session also leaves a transcript under `context/grill/`; that is a session record, not a second design artifact.

The artifact status is exactly one of:

- **ready-for-plan** — the interview resolved the material decisions and the design is sufficiently decided for `/plan` to validate and decompose it.
- **blocked** — one or more open material decisions prevent a reliable design; name each blocker and its impact in **Open questions**.

Do not edit application code, routing files, or unrelated artifacts.

## Operating principles

- Keep the meaning, clean the wording. Capture what the user said, then distill it into short, plain-language bullets. Remove filler, repetition, and jargon; keep every requirement, constraint, and preference. Never add, drop, or change meaning without labeling the change as an interpretation.
- Write plainly. A reader without your context must understand every bullet and section. If a term needs defining before it can be used, use the ordinary word instead.
- Ask instead of assuming. When an answer would change behavior, scope, architecture, safety, data, compatibility, or acceptance, ask the user. Do not invent answers; record unresolved items in **Open questions** with their impact and a resolution trigger.
- Inspect the repository before making claims about current behavior. Cite concrete files, modules, and interfaces without brittle line numbers.
- Label statements as **Verified**, **Assumption**, **Decision**, or **Open question**. An absence of evidence is not evidence of absence.
- Treat external research as evidence, not as a substitute for design judgment. Prefer primary sources and maintained reference implementations; cite URLs, versions, and relevant sections.

## Workflow

### 1. Capture the intent

Record what the user asked for in their own words, cleaned up:

- short plain-language bullets, grouped by topic;
- filler, repetition, and false starts removed;
- jargon replaced with ordinary words;
- every requirement, constraint, and preference kept, and nothing added.

If the request is a wall of speech-to-text, this is where it becomes readable: the user should recognize their own thinking with the noise removed. Add a short interpreted goal only after the bullets, clearly labeled as an interpretation. Identify the actors, outcome, and trigger when they are known; do not fill gaps with guesses. If the request is too unclear to draft, ask the smallest set of framing questions first, one at a time, and record the answers.

### 2. Inspect the repository

Explore the relevant repository areas, following existing patterns, interfaces, configuration, data models, tests, and documentation. Establish:

- what currently happens and where it is implemented;
- the callers, consumers, persistence, integrations, and failure paths that constrain the design;
- existing conventions or precedents worth preserving; and
- conflicting, stale, or missing evidence.

Use targeted reads and searches. Ground repository claims in concrete files, modules, and interfaces without brittle line-number assumptions. Separate verified observations from assumptions derived from incomplete inspection.

### 3. Research external evidence when needed

Decide whether repository evidence is sufficient. If the design depends on an API, protocol, standard, library behavior, security property, operational constraint, or proven implementation, perform or delegate focused research. Use high-trust primary sources first (official documentation, specifications, source code, release notes, and maintained reference implementations). Record the source, access/version context, finding, and the design implication. If no external research is needed, say why. Record conflicting or unavailable sources as uncertainty rather than smoothing them over.

### 4. Draft the design

Write the artifact with these sections, adapting the detail to the request:

1. **Summary** — problem, users/actors, intended outcome, and a brief recommendation or design direction (not implementation steps).
2. **Raw intent** — the user's request, cleaned into bullets (from step 1).
3. **Current behavior** — verified behavior today, with repository citations; include relevant failure and boundary behavior.
4. **Desired behavior** — observable behavior after the change, including invariants and meaningful transitions.
5. **Scope** — what this design covers.
6. **Non-goals** — what it deliberately does not cover and why.
7. **Constraints** — technical, product, compatibility, security, privacy, reliability, performance, operational, and organizational constraints, each labeled by evidence status.
8. **Decisions and trade-offs** — each material decision with rationale, alternatives considered, costs, risks, and future effect. Keep decisions at the design level; do not turn this into a task list.
9. **System shape and boundaries** — the modules, responsibilities, contracts, data ownership, and integration seams involved, grounded in evidence where they already exist.
10. **Edge cases and failure behavior** — invalid input, retries, partial failure, concurrency, lifecycle changes, migration/rollback, permissions, and observability concerns relevant to the design.
11. **Evidence** — repository evidence and external citations, with each claim traceable to its source; explicitly list assumptions and evidence gaps.
12. **Grill interview** — every question asked and the user's answer, cleaned up; one block per round, with a note on what each answer changed.
13. **Open questions** — what is still unresolved after the interview, with impact and resolution trigger/owner.
14. **Acceptance** — observable, reviewable outcomes that show the design has been correctly realized. Prefer behavioral statements and invariants over file names or implementation recipes.
15. **Status** — exactly `ready-for-plan` or `blocked`; if blocked, identify the open material decisions and their impact.

When the design replaces or reuses existing work, add a **Keep / Drop / Add / Defer** section so the disposition of what already exists is explicit.

This draft is the interview agenda: decisions the user has not settled stay in **Open questions**, each written as the exact question to ask.

Do not prescribe coding order, ticket decomposition, exact implementation commands, or test-file edits here. Those belong to `/plan` after the design is accepted.

Create the worktree-local artifact using the existing convention:

```bash
python3 ~/.agents/scripts/new-artifact.py --type designs --topic "<short design title>"
```

The `designs` generator profile is the structural source of truth for the
artifact: fill in its generated scaffold and preserve its frontmatter and
required headings rather than copying a separate full Markdown template.
The command creates one timestamped Markdown file under `context/designs/`
with design frontmatter (`date`, `title`, `type: design`). Preserve the
generated filename and report its path. Do not create a second summary file,
sidecar, or duplicate handoff.

If the generator is unavailable, create one timestamped, slugged Markdown file
in `context/designs/` matching the same frontmatter and naming convention, and
state the deviation in the artifact's evidence notes.

### 5. Interview the user

Follow the `grill-with-docs` skill's interview rules; the design artifact is the artifact under discussion. In short:

- Open with a short orientation: what the design currently says, what will be grilled, and where you are starting. Then ask the first question.
- Ask one question at a time, in plain prose. Never batch questions or use a question-picker tool, and wait for the reply before continuing.
- Start with "walk me through..." questions: one real end-to-end scenario from the user's world. Scenario answers settle more decisions than abstract ones.
- Then bring decisions and edge cases to the table: failures, retries, partial states, permissions, notifications, lifecycle changes, and what happens when things go wrong. Teach before each decision question: one-line recommendation, realistic options with their costs, why, then the question.
- After each answer, update the artifact in place (Raw intent stays clean, Desired behavior sharpens, Decisions and trade-offs fills in, Open questions shrinks, Grill interview records the Q&A), capture resolved terms and decisions with the `domain-modeling` skill, and append the Q&A to one `context/grill/` transcript created with:

  ```bash
  python3 ~/.agents/scripts/new-artifact.py --type grill --topic "<short session topic>"
  ```

  Create the transcript on the first answer; append later rounds to the same file.
- If the user's reply is itself a question, answer it and re-ask the same question; that round is not an answer.
- Keep asking until the material decisions are settled or the user says stop. Only skip a question the user explicitly declines; record it in **Open questions**.

### 6. Finalize and report status

Set the artifact's **Status** to exactly `ready-for-plan` when the interview resolved the material decisions, or `blocked` when such a decision remains. In the final response, give the artifact path and the status; do not repeat the whole design.

## Completion checklist

Before finishing, verify that:

- raw intent is captured cleanly: plain-language bullets, every requirement kept, nothing added;
- the interview ran: a walk-me-through question first, one question at a time, every answer recorded under **Grill interview**; anything the user declined to answer is in **Open questions**;
- material ambiguity was clarified or explicitly recorded;
- current and desired behavior are distinct;
- scope and non-goals are explicit;
- constraints, decisions/trade-offs, edge cases, open questions, and acceptance are present;
- verified evidence is cited and assumptions are labeled;
- external research is cited when required, including unresolved conflicts;
- exactly one Markdown artifact was written under `context/designs/` (the grill transcript is a session record, not a design artifact);
- the artifact has exactly one status: `ready-for-plan` or `blocked`; and
- no application code or routing file was edited.
