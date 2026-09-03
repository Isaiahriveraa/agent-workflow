---
name: to-issues
description: Turn an approved repository plan into focused, reviewable implementation issues, with a separate human-approved publication path for GitHub issues.
argument-hint: "[approved plan path, plan directory, or settled brief]"
shell-timeout: 20
---

# To Issues

Convert a repository-grounded, **approved plan** into a concise implementation plan reference and a set of focused issues. Each issue is sized for exactly one reviewable PR. Produce local drafts first; publish GitHub issues only in explicit publication mode after the required approvals.

This skill organizes work. It does not implement code, create branches or worktrees, deliver issues, or invent an orchestration system.

## Modes

The invocation must use one of these modes:

- **Draft mode (default):** read and validate the source plan, enrich incomplete issues, establish each issue's stable local draft path and plan-step identity, produce the issue set and a parent/child manifest locally, and present them for approval. Do not call GitHub issue-creation or mutation APIs.
- **Publication mode:** only after the human explicitly requests publication of the already-reviewed draft set. Revalidate the source and draft, show the publication manifest, obtain publication approval, then create or update the mapped GitHub issues idempotently. Before publication, local draft path plus plan-step identity is the stable local identity; after publication, the GitHub issue number and URL are canonical. Publication does not start implementation or issue delivery.

If the mode is not clear, use Draft mode and ask before any publication action.

## When to use

- An approved `/plan` artifact needs to become a set of implementation issues.
- A settled brief already contains enough repository evidence, behavior, scope, dependencies, and verification to be drafted into issues.
- An existing draft issue set needs review, correction, enrichment, or explicit publication.

Do not use this skill to clarify an unresolved product decision, research an ungrounded idea, or implement an issue.

## Required input and approval gate

The normal source is a plan produced by `/plan`, including its `00-index.md` and referenced step files. The source must be approved by the human before issue drafting begins. “Approved” means an explicit approval in the current conversation or an unambiguous approval record attached to the plan. A path alone is not approval.

Before drafting, verify that the source contains, or explicitly records the absence of:

- goal, current behavior, target behavior, scope and non-goals;
- repository evidence and assumptions;
- decisions and tradeoffs;
- work items with acceptance criteria, verification, ownership, and dependencies;
- work position: `Start now`, `Concurrent`, or `Blocked`, including the blocker and reason;
- a plan path or durable source identifier.

If the plan is missing approval, materially unresolved, stale, contradictory, or not readable, stop and report the exact gap. Do not silently turn an unresolved plan into issues. Unresolved design, behavior, dependency, or decomposition decisions block drafting and must return to `/plan` (or `/issue-discovery` when the open item is a settled-decision issue). If the human asks to continue, record the assumption and keep the affected issue in a blocked or review-needed state rather than pretending it is ready.

A pasted brief may be used only when it is settled enough to satisfy the same contract. Cite concrete repository paths and line ranges when available; never invent files, symbols, commands, or evidence.

## Relationship to sibling skills

- **`/plan` owns** intent clarification, repository and external research, architecture and design decisions, decomposition, dependency reasoning, and the canonical plan. If any of those are materially open, return to `/plan`.
- **`/to-issues` owns** compiling that one approved canonical plan into complete, behavior-first, public-language delivery-issue drafts, completeness checks, stable local identities and relationships, review/enrichment, and optional publication gating. It does not replace the plan, redesign it, or change its decisions without approval.
- **`/issue-discovery` owns** publishing a settled ambiguity as a decision issue. It is not a substitute for `/plan`; route unresolved behavior, research, or decomposition there first. A decision issue may be a dependency for an issue, but must not be disguised as an implementation issue.
- **`/issue-delivery` owns** taking one ready published issue through an isolated worktree, implementation, verification, review, commits, and a human-approved draft PR. One issue maps to one PR; invoke delivery separately for each ready issue.

### Input/output contract

**Input:** one explicitly approved, canonical `/plan` artifact (including its index and referenced artifacts), or a settled brief that satisfies the same evidence contract. **Output:** a local, reviewable issue set in concern order, with each issue identified before publication by its stable local draft path and plan-step identity, preserved acceptance, verification, dependency reasons, work positions and reasons, plus a parent/child manifest and review summary. After publication, the GitHub issue number and URL are the canonical identity. Any proposed redesign, decomposition, dependency change, or other plan-level correction is a return-to-`/plan` item, not issue enrichment.

## Workflow

### 1. Read and reconcile the source

Read the complete plan and referenced artifacts. This is a conversion and completeness pass, not a second planning or design stage. Do not repeat repository or external research; only check current evidence for staleness or contradictions when needed to draft safely. Preserve each plan concern or step identity and its mapping to the stable local draft path, along with decisions, acceptance, verification, dependency reasons, and work positions. Identify stale evidence, collisions, missing acceptance or verification, circular dependencies, and unresolved assumptions.

Do not recast `Start now`, `Concurrent`, or `Blocked` as an invented execution schedule. Preserve those labels and their reasons verbatim enough to remain meaningful:

- **Start now:** no declared blocker; work may begin once its issue is approved and published.
- **Concurrent:** independent of the named sibling(s); state any shared-file or shared-contract collision, which makes work sequential instead.
- **Blocked:** cannot begin or cannot be verified until the named dependency or decision is resolved; state the reason and what unblocks it.

### 2. Build and enrich the issue set

Create one issue for each independently understandable, implementable, testable, reviewable concern already defined by the approved plan. Do not invent a new decomposition, split or merge concerns, reorder work, or alter dependencies to make drafting easier; flag any such need and return it to `/plan`. Prefer a behavior-complete vertical slice only when that preserves the plan's concern boundary. Dependencies must remain acyclic and retain their reasons.

Each issue must preserve its source plan concern or step identity and receive a stable local draft path under the issue area before publication. Record the path and plan-step identity together as the local identity; keep both stable across edits and reruns. Do not require or invent a synthetic visible issue ID. After publication, use the GitHub issue number and URL as the canonical identity. If an existing draft has conflicting paths or plan-step mappings, flag the collision rather than silently renaming or remapping it.

Enrich incomplete issues only with evidence already present in the approved plan or with narrowly scoped checks for staleness needed for safe drafting. An issue is incomplete when it lacks behavior, scope, non-goals, binary acceptance, exact verification, ownership, dependency reason, plan reference, or work position. Preserve the plan's acceptance, verification, dependencies and positions; do not rewrite them as design choices. Mark assumptions and unresolved questions. If enrichment cannot make an issue safe to deliver, leave it `Review needed` or `Blocked`; do not fabricate acceptance criteria, test commands, ownership, or implementation details. Present every material enrichment for human review.

### 3. Draft the local artifacts

In Draft mode, write or update local Markdown artifacts under `context/issues/<slug>/`, where `<slug>` names the approved initiative (for example, `context/issues/events-redesign/`). Keep the approved source plan under `context/plans/<slug>/`. Do not create GitHub issues. The draft set must include:

Use stable, readable filenames within that slug directory, for example
`001-parent.md`, `002-api-contract.md`, and `003-frontend.md`. The numeric prefix
is local ordering only, not a public issue ID; the plan-step identity and later
GitHub issue number remain the authoritative mappings. Keep all issues for the
initiative in the slug directory rather than creating an extra directory for each
concern unless a repository-specific convention requires it.

1. the issue documents or a clearly delimited issue-set document;
2. a parent/child issue manifest; and
3. a review summary listing changed enrichments, assumptions, collisions, missing evidence, and publication readiness.

Use the repository's established plan location and naming conventions. Do not create README/index changes or tests merely to assert this documentation contract.

The manifest must be stable and machine-readable enough for a human to audit, while remaining plain Markdown. For each issue record:

- source plan concern or step identity, title, and stable local draft path (the pre-publication local identity);
- parent local draft path or `none`, child local draft paths, and dependency local draft paths with reasons;
- preserved work position (`Start now`, `Concurrent`, or `Blocked`) and blocker reason;
- publication state: `draft`, `approved`, `published`, `existing`, `needs-review`, or `blocked`;
- after publication, the canonical GitHub issue number and URL, or `unpublished` before publication;
- plan reference and last-reviewed source revision/date.

The parent is a concise umbrella issue that links to the approved plan and all child issues. Before publication, local draft paths and plan-step identities are used for these relationships; after issue URLs exist, convert those references to GitHub issue links and use issue numbers in dependency text. Child issues link back to the parent and to relevant siblings/dependencies. Do not imply that the parent is itself a delivery issue unless it owns a single concern. Do not create child issues for unresolved decisions; route those to `/issue-discovery` when appropriate.

### 4. Use the issue format

Each issue must stand alone and use this shape:

```markdown
# Focused outcome

<!-- Local draft metadata; omit this block from the published issue body. -->
**Plan-step identity:** <source plan step or concern>
**Local draft path:** <durable path under `context/issues/<slug>/`>

## Why

Why this outcome matters, grounded in the approved plan.

## Target behavior
Observable behavior before/after; include user or system contract.

## Scope
What this issue owns, including relevant files/modules when verified.

## Out of scope
Explicit non-goals and neighboring work left to other issues.

## Acceptance criteria
Binary, behavior-first criteria. Include errors, boundaries, compatibility, and data/security constraints where relevant.

## Verification
Exact commands or reproducible checks, expected results, and any unavailable proof.

## Dependencies and position
- Depends on: <local draft path and plan-step identity, or none> — reason
- Blocks: <local draft path and plan-step identity, or none> — reason
- Position: <Start now | Concurrent | Blocked> — reason

## Likely ownership
Files/modules and shared-contract collision risk, based on evidence.

## Plan reference
<durable local plan path and section>
```

### 5. Public-language rules

Issue bodies are public project records. Write for maintainers and contributors, not for this assistant or an internal workflow. Use plain, specific language and technical domain terms only when they help implementation. Do not include prompts, agent names, model/tool instructions, hidden paths, internal routing vocabulary, orchestration machinery, worker/fleet terminology, waves, shards, queues, schedules, or private conversation context.

Keep implementation detail that is necessary for correctness, but describe it as repository behavior, constraints, interfaces, risks, and verification. Never put YAML manifests, execution graphs, batch instructions, or “run these agents” directions in public issue bodies. One issue remains one concern and one PR even when the manifest records relationships.

### 6. Review and approval gates

Before presenting a draft as ready, perform a structural review:

- every issue maps to exactly one approved plan concern or step, with its local draft path and plan-step identity preserved;
- every issue has one concern, one PR scope, acceptance, verification, ownership, and a plan reference;
- local draft paths and plan-step identities are unique, stable, and consistently used; parent/child and dependency links are reciprocal and acyclic, with dependency reasons preserved;
- `Start now`/`Concurrent`/`Blocked` positions and reasons are preserved;
- public bodies contain no internal orchestration language;
- incomplete, stale, conflicting, or assumption-dependent issues are clearly marked;
- no issue introduces a plan-level redesign, decomposition, dependency, or behavior decision; such changes are returned to `/plan`.

Then present the plan reference, issue list, manifest, enrichments, and unresolved assumptions. **Issue-set approval is required before publication.** Approval to draft is not approval to publish. In Publication mode, present the exact issue actions (parent create/update, each child create/update, labels if any, and links), then obtain a separate explicit **publication approval** immediately before mutation. If approval is withdrawn or scope changes, return to Draft mode.

### 7. Publish idempotently (Publication mode only)

Before mutation, re-read the approved plan and draft manifest and verify the working repository/repository identity. For each draft, first use the manifest's recorded GitHub issue number/URL when present. For an unpublished draft, search for an existing issue using only an exact, approved title and plan reference (or an established repository-native field); accept a match only when it is unique and materially consistent with the local draft. Do not require or add a synthetic visible identifier. If matches disagree, duplicates exist, or an existing issue has changed materially, stop and ask for reconciliation; never create a second issue automatically.

Create or update only the approved parent and children. Preserve existing issue discussion and unrelated labels/body content; make the smallest safe update. Once issue URLs exist, replace local draft-path/plan-step dependency references with reciprocal GitHub issue links and `#number` references; do not publish unresolved local references as if they were canonical. Record issue numbers and URLs back in the local manifest only after successful responses, making them the canonical identities thereafter. A partial failure leaves completed mappings intact, marks remaining entries `needs-review`, and is safe to resume: re-check titles, plan references, and recorded mappings before retrying rather than retrying blindly. Never publish an issue marked `needs-review` or `blocked` without explicit approval of that exception.

Publication creates issues only. It does not create branches, worktrees, PRs, assignments, implementation commits, or delivery orchestration. After publication, tell the human which issues are ready, concurrent, or blocked and point to `/issue-delivery` for one issue at a time.

## Done when

- An approved plan was consumed, with source gaps and assumptions reported.
- Every issue has a stable local draft path and plan-step identity before publication, and a canonical GitHub issue number/URL after publication, plus one-PR scope, public-language body, binary acceptance, exact verification, ownership, plan reference, and explicit dependency/position.
- Parent/child and dependency relationships are represented in a local manifest before publication and become reciprocal GitHub links with `#number` references after publication.
- Incomplete work is enriched from evidence or clearly marked for review/blocking.
- Draft mode made no GitHub mutations.
- Publication, if requested, had separate issue-set and publication approvals and used idempotent existing-issue safeguards.
- No implementation, branch/worktree, PR, README/index, test, or orchestration machinery was created by this skill.

Report the changed sections/artifacts and unresolved assumptions in the final response. Do not claim publication, verification, or approval that did not occur.
