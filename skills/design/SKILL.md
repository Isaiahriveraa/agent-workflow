---
name: design
description: Turn a user's raw product, system, or feature intent into a repository-grounded design artifact that records behavior, evidence, decisions, scope, risks, and acceptance for later planning. Use when the user wants to explore or specify what should be built before implementation.
disable-model-invocation: true
---

# Design

Convert an idea into a durable design handoff without silently changing the user's intent. This skill is general-purpose: it applies to product behavior, backend systems, data flows, APIs, workflows, integrations, and user-facing surfaces.

## Output contract

Produce exactly one Markdown design artifact for this invocation. The authoritative inputs to `/plan` are this artifact's **Desired behavior**, **Scope**, **Non-goals**, **Constraints**, **Decisions and trade-offs**, **System shape and boundaries**, **Edge cases and failure behavior**, **Evidence**, **Open questions**, and **Acceptance** sections; **Raw intent** remains the source of the user's intent. `/plan` should verify citations and current repository state rather than repeat research that is already sufficient in the artifact. Supplemental research belongs in `/plan` only for material gaps or stale/contested evidence.

The artifact status is exactly one of:

- **ready-for-plan** — the design is sufficiently decided for `/plan` to validate and decompose it.
- **blocked** — one or more open material decisions prevent a reliable design; name each blocker and its impact in **Open questions**.

Do not edit application code, routing files, or unrelated artifacts.

## Operating principles

- Preserve the user's raw intent verbatim near the beginning of the artifact. Do not improve, reinterpret, or normalize it without labeling the change.
- Clarify only issues that are materially ambiguous: questions whose answers would change behavior, scope, architecture, safety, data, compatibility, or acceptance. Record unanswered questions instead of inventing answers.
- Inspect the repository before making claims about current behavior. Cite concrete files, modules, and interfaces without brittle line numbers.
- Label statements as **Verified**, **Assumption**, **Decision**, or **Open question**. An absence of evidence is not evidence of absence.
- Treat external research as evidence, not as a substitute for design judgment. Prefer primary sources and maintained reference implementations; cite URLs, versions, and relevant sections.

## Workflow

### 1. Capture intent

Record the request exactly as supplied under **Raw intent**. Add a short interpreted goal only after it, clearly labeled as an interpretation. Identify the actors, outcome, and trigger if they are known; do not fill gaps with guesses.

### 2. Resolve material ambiguity

Review the raw request for decisions that could materially change the result. Ask focused questions only for those decisions. If the user cannot or need not answer now, state the smallest safe assumption and put the unresolved matter in **Open questions** with its impact and an owner/trigger for resolution.

### 3. Inspect the repository

Explore the relevant repository areas, following existing patterns, interfaces, configuration, data models, tests, and documentation. Establish:

- what currently happens and where it is implemented;
- the callers, consumers, persistence, integrations, and failure paths that constrain the design;
- existing conventions or precedents worth preserving; and
- conflicting, stale, or missing evidence.

Use targeted reads and searches. Ground repository claims in concrete files, modules, and interfaces without brittle line-number assumptions. Separate verified observations from assumptions derived from incomplete inspection.

### 4. Research external evidence when needed

Decide whether repository evidence is sufficient. If the design depends on an API, protocol, standard, library behavior, security property, operational constraint, or proven implementation, perform or delegate focused research. Use high-trust primary sources first (official documentation, specifications, source code, release notes, and maintained reference implementations). Record the source, access/version context, finding, and the design implication. If no external research is needed, say why. Record conflicting or unavailable sources as uncertainty rather than smoothing them over.

### 5. Shape the design

Write the artifact with these sections, adapting the detail to the request:

1. **Summary** — problem, users/actors, intended outcome, and a brief recommendation or design direction (not implementation steps).
2. **Raw intent** — the user's unedited request and any explicitly supplied context.
3. **Current behavior** — verified behavior today, with repository citations; include relevant failure and boundary behavior.
4. **Desired behavior** — observable behavior after the change, including invariants and meaningful transitions.
5. **Scope** — what this design covers.
6. **Non-goals** — what it deliberately does not cover and why.
7. **Constraints** — technical, product, compatibility, security, privacy, reliability, performance, operational, and organizational constraints, each labeled by evidence status.
8. **Decisions and trade-offs** — each material decision with rationale, alternatives considered, costs, risks, and future effect. Keep decisions at the design level; do not turn this into a task list.
9. **System shape and boundaries** — the modules, responsibilities, contracts, data ownership, and integration seams involved, grounded in evidence where they already exist.
10. **Edge cases and failure behavior** — invalid input, retries, partial failure, concurrency, lifecycle changes, migration/rollback, permissions, and observability concerns relevant to the design.
11. **Evidence** — repository evidence and external citations, with each claim traceable to its source; explicitly list assumptions and evidence gaps.
12. **Open questions** — only unresolved matters that could change the design, with impact and resolution trigger/owner.
13. **Acceptance** — observable, reviewable outcomes that show the design has been correctly realized. Prefer behavioral statements and invariants over file names or implementation recipes.
14. **Status** — exactly `ready-for-plan` or `blocked`; if blocked, identify the open material decisions and their impact.

Do not prescribe coding order, ticket decomposition, exact implementation commands, or test-file edits here. Those belong to `/plan` after the design is accepted.

### 6. Write the artifact

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

### 7. Close and report status

Set the artifact's **Status** to exactly `ready-for-plan` when no open material decision prevents planning, or `blocked` when such a decision remains. In the final response, give the artifact path and the status; do not repeat the whole design.

## Completion checklist

Before finishing, verify that:

- raw intent is preserved;
- material ambiguity was clarified or explicitly recorded;
- current and desired behavior are distinct;
- scope and non-goals are explicit;
- constraints, decisions/trade-offs, edge cases, open questions, and acceptance are present;
- verified evidence is cited and assumptions are labeled;
- external research is cited when required, including unresolved conflicts;
- exactly one Markdown artifact was written under `context/designs/`;
- the artifact has exactly one status: `ready-for-plan` or `blocked`; and
- no application code or routing file was edited.
