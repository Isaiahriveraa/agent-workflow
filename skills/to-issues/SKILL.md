---
name: to-issues
description: Turn a repository plan or settled brief into focused, reviewable local issue drafts, with a separate human-approved publication path for GitHub issues.
argument-hint: "[plan path, plan directory, or settled brief]"
shell-timeout: 20
---

# To Issues

Convert one repository-grounded plan or settled brief into a concise local issue set. Each issue is sized for exactly one reviewable PR and must explain the human-level why and how so any software engineer joining the team can understand, with zero prior context, the problem, why it matters, what needs to be built, and how to verify it.

This skill organizes work. It does not implement code, create branches or worktrees, deliver issues, or invent an orchestration system.

## Modes

The invocation must use one of these modes:

- **Draft mode (default):** an explicit invocation or request to draft authorizes local drafting. Read and reconcile the source, preserve its status and gaps, enrich only from available evidence, establish stable local draft paths and plan-step identities, write or update the issue set, manifest, review summary, and completion report, then present the result. Source-plan approval is not required merely to create local drafts. Draft mode never calls GitHub issue-creation or mutation APIs.
- **Publication mode:** only after the human explicitly requests publication of an already-reviewed draft set. Revalidate the source and drafts, show the publication manifest, obtain separate publication approval immediately before mutation, then create or update the mapped GitHub issues idempotently. Publication does not start implementation or issue delivery.

If the mode is not clear, use Draft mode. Never infer publication approval from an invocation, a plan approval, an issue-set review, or a prior publication request.

## When to use

- A plan or settled brief needs to become local implementation-issue drafts.
- An existing local issue set needs review, correction, enrichment, or rerun.
- An already-reviewed local issue set is explicitly ready for GitHub publication.

Do not use this skill to clarify an unresolved product decision, research an ungrounded idea, or implement an issue. Route unresolved decisions to `/issue-discovery` when appropriate and return plan-level redesign, decomposition, dependency, or behavior changes to `/plan`.

## Required input and authorization

The normal source is a plan produced by `/plan`, including its `00-index.md` and referenced step files. A settled brief may be used when it contains the same evidence. A path alone is not source approval, but an explicit invocation/request to draft is sufficient authorization for Draft mode.

Before drafting, read the complete source and referenced artifacts. Check whether it contains, or explicitly records the absence of:

- goal, current behavior, target behavior, scope, and non-goals;
- repository evidence and assumptions;
- decisions and tradeoffs;
- work items with acceptance criteria, verification, ownership, and dependencies;
- work position: `Start now`, `Concurrent`, or `Blocked`, including blocker and reason;
- a durable source path or plan-step identity.

If the source is Proposed, unapproved, materially unresolved, stale, contradictory, incomplete, or not readable, do not stop merely because it is unsuitable for a ready delivery issue. Draft what can be grounded and record the exact gap in the affected issue metadata, manifest, review summary, and completion report. Mark affected items `needs-review` or `blocked`; do not fabricate acceptance, verification, ownership, implementation details, or decisions. A missing or unreadable source may yield only a review/blocked report and no invented issue set.

Source-plan approval gaps are metadata for Draft mode, not a hard draft blocker. Issue-set approval is still required before publication, and publication always requires a separate explicit approval immediately before GitHub mutation.

## Relationship to sibling skills

- **`/plan` owns** intent clarification, repository and external research, architecture and design decisions, decomposition, dependency reasoning, and the canonical plan. Any proposed change to those decisions returns to `/plan`.
- **`/to-issues` owns** compiling the source into complete, behavior-first, public-language local issue drafts, completeness checks, stable local identities and relationships, review/enrichment, rerun safety, and optional publication gating. It does not replace the plan or silently change it.
- **`/issue-discovery` owns** publishing a settled ambiguity as a decision issue. A decision issue may be a dependency, but must not be disguised as an implementation issue.
- **`/issue-delivery` owns** taking one ready published issue through an isolated worktree, implementation, verification, review, commits, and a human-approved draft PR. One issue maps to one PR.

### Two-phase audit and conversion

Treat drafting as two distinct phases:

1. **Audit:** reconcile the source and existing local drafts; identify approval/status gaps, stale evidence, collisions, missing fields, contradictory decisions, circular dependencies, and unresolved assumptions.
2. **Conversion:** write or update only the concerns already defined by the source. Preserve source identities, decisions, acceptance, verification, dependencies, and work positions. Do not use conversion to repair a plan-level problem by inventing a decomposition or redesign.

The audit may mark an issue `needs-review` or `blocked`; that status does not prevent honest local drafting. Any proposed plan-level correction is reported as a return-to-`/plan` item.

### Input/output contract

**Input:** one plan or settled brief plus any existing local draft set. **Output:** a local, reviewable issue set in source concern order, each identified before publication by a stable local draft path and plan-step identity, with preserved acceptance, verification, dependency reasons, work positions and reasons, plus a parent/child manifest, review summary, and completion report. After publication, the GitHub issue number and URL are canonical. Draft mode makes no GitHub mutations.

## Workflow

### 1. Audit and reconcile the source

Read the complete source and referenced artifacts, then inspect any existing draft artifacts under the initiative's durable issue path. This is a conversion and completeness pass, not a second planning or design stage. Check current evidence only when needed to identify staleness or contradiction safely. Preserve each concern or step identity and its mapping to the local draft path.

Do not recast work positions as an invented execution schedule:

- **Start now:** no declared blocker; work may begin once its issue is approved and published.
- **Concurrent:** independent of the named sibling(s); state any shared-file or shared-contract collision, which may require sequential implementation.
- **Blocked:** cannot begin or cannot be verified until the named dependency or decision is resolved; state the reason and what unblocks it.

### 2. Build and enrich the issue set

Create one issue for each independently understandable, implementable, testable, reviewable concern already defined by the source. Do not invent a new decomposition, split or merge concerns, reorder work, or alter dependencies to make drafting easier. Dependencies must remain acyclic and retain their reasons.

Translate each technical plan concept into a simple explanation of the main idea, the human-level problem and impact, and the technical work needed to solve it. Write so a SWE with zero prior context can understand the issue immediately. Each issue preserves exactly one source concern or step identity and receives a stable local draft path. Do not require or invent a synthetic visible issue ID. Enrich incomplete issues only with evidence already present or narrowly scoped staleness checks. If safe enrichment is impossible, retain the issue as `needs-review` or `blocked` and state the exact gap.

### 3. Draft durable local artifacts

In Draft mode, first select the initiative's durable issue root during preflight:

1. If an existing draft manifest or issue set identifies a repository-local root, use that exact root on every rerun. For example, `context/plans/<slug>/issues/` is valid when that is the repository's established convention.
2. Otherwise use the repository's documented default issue root. Do not invent a new root, make `context/issues/<slug>/` absolute, or silently relocate an existing draft set. If no documented default is discoverable, record the missing convention and produce a review/blocked report rather than guessing.
3. Record the selected root, how it was established, source path, and rerun decision in preflight metadata and in the manifest.

The selected root must be one durable directory for the initiative. Do not create GitHub issues, README/index changes, tests, branches, worktrees, or implementation artifacts.

Keep all initiative issues in the selected root. Use stable readable filenames such as `001-parent.md`, `002-api-contract.md`, and `003-frontend.md`. Numeric prefixes are local ordering only, not public issue IDs. The plan-step identity plus local draft path is the stable pre-publication identity.

Explain the main idea plainly in every draft before adding detail: what is changing, who or what it helps, and the outcome. Then describe the human-level why and the technical how using standard SWE terms and concrete behavior. The draft set must include:

1. issue documents or one clearly delimited issue-set document;
2. a parent/child manifest;
3. a review summary listing audit findings, enrichments, assumptions, collisions, missing evidence, selected root, and publication readiness; and
4. a completion report at `<selected-root>/completion-report.md` recording source, selected root, preflight decision, artifacts examined, files created or updated, statuses, unresolved concerns, and whether any GitHub mutation occurred.

When orchestration supplies fixed completion-report fields, the completion report must contain every such field. If those fields do not belong in the public issue artifacts, write a companion report at `<selected-root>/orchestration-completion-report.md`, link it from the manifest and review summary, and still record the explicit completion-report path in preflight metadata. A report is not complete merely because the issue files exist.

Reruns are idempotent: re-read the existing manifest and completion report first, reuse the recorded selected root, and match by the stable local draft path and plan-step identity. Update existing artifacts in place and do not create duplicate parent/child drafts or a second issue root. Never silently rename, relocate, or remap a conflicting existing path or identity; record the collision as `needs-review`, preserve the original root, and stop conversion for that conflicting item. Preserve manually added review notes unless the source explicitly supersedes them.

The manifest remains plain Markdown but must be stable and machine-readable enough for audit. For each issue record:

- source plan concern or step identity, title, and stable local draft path;
- parent local draft path or `none`, child local draft paths, and dependency local draft paths with reasons;
- preserved work position and blocker reason;
- publication state: `draft`, `approved`, `published`, `existing`, `needs-review`, or `blocked`;
- canonical GitHub issue number and URL after publication, or `unpublished` before publication;
- source approval/status gap, if any;
- selected durable issue root;
- completion-report path, including any orchestration companion report; and
- plan reference and last-reviewed source revision/date.


The parent is a concise umbrella issue linking to the source plan and all child drafts. Before publication, use local paths and plan-step identities. After publication, convert relationships to reciprocal GitHub links and `#number` references. Do not imply that the parent is a delivery issue unless it owns a single concern. Do not create child issues for unresolved decisions.

### 4. Issue format

All issue drafts must follow this exact section structure:

```markdown
# <Action-oriented descriptive title in plain English>

<!-- Local draft metadata; omit this block from the published issue body. -->
**Plan-step identity:** <source plan step or concern>
**Local draft path:** <path under the selected durable issue root>

## Main idea
1–3 plain-English sentences summarizing the change, who/what it is for, and the outcome. Any engineer reading this should instantly grasp the core concept in 5 seconds without prior context.

## Problem & Context (The Human Why)
Explain the background and the pain point simply:
- What is broken, missing, difficult, or unhandled today?
- Why does this matter to users, developers, or system reliability?
- Ground in real software/user impact, never in internal planning steps or agent meta-process.

## Proposed Solution & What is Needed (The How)
Explain simply what needs to be built or changed:
- High-level concept and data/control flow before/after.
- Concrete technical changes required (e.g. database schema changes, new endpoints, UI components, background jobs).
- Clear, step-by-step technical guidance in standard software engineering terms.

## Scope & Files
- **In scope:** Specific files, modules, endpoints, or components this issue owns.
- **Out of scope (non-goals):** Explicit boundaries and neighboring work left to subsequent issues.

## Acceptance criteria
Concrete, observable, testable outcomes:
- [ ] <Observable behavior 1: given X, when Y, then Z>
- [ ] <Observable behavior 2: error/boundary handling>
- [ ] <Observable behavior 3: backward compatibility or data integrity>

## How to verify
Exact, reproducible steps and commands any SWE can run locally:
1. <Setup or migration step>
2. <Command / curl / test execution with expected output>
3. <Teardown or reversal check if applicable>

## Dependencies & Sequencing
- **Depends on:** <prerequisite issue or none> — explain why it is needed before starting
- **Blocks / Unblocks:** <subsequent issue or none> — explain what this enables
- **Position:** <Start now | Concurrent | Blocked> — reason

## Plan reference
<durable source path and section>
```

### 5. Zero-context clarity and language rules

Apply the **Zero-Context SWE Principle**: any SWE on the team with no knowledge of prior discussions or plans must immediately understand the problem, why it matters, what is needed, and how to verify it from the issue alone.

Issue narratives must use plain English, active voice, and standard software engineering terms such as endpoints, database tables, components, props, hooks, services, functions, tests, CLI flags, and schemas. Explain the main idea before implementation detail, and define unavoidable specialized terms in context.

Strictly prohibit agent and process jargon in issue narratives. Do not mention agents, subagents, orchestrators, prompt files, fleets, workers, dispatch, waves, shards, plan indices, reconciliation passes, durable roots, preflight checks, manifests, or internal step IDs. Keep plan-step identity and local draft path only in the dedicated metadata comment at the top. Never include private planning context, execution instructions, YAML manifests, execution graphs, batch instructions, or directions to run agents in the published body. One issue remains one concern and one PR even when local metadata records relationships.

### 6. Review and approval gates

Before presenting drafts, verify:

- every issue maps to exactly one source concern or step, with stable path and identity;
- every issue has one concern, one PR scope, acceptance, verification, ownership, and source reference, or is clearly marked `needs-review`/`blocked`;
- local paths and identities are unique, stable, and consistently used;
- parent/child and dependency links are reciprocal and acyclic, with reasons preserved;
- work positions and reasons are preserved;
- the **Zero-Context SWE Readability Gate** passes: an engineer with no prior discussions or plans can understand the main idea, human-level why, technical how, expected outcome, and verification steps from the issue alone;
- public bodies contain no agent or process jargon or other internal workflow language;
- source gaps, stale evidence, contradictions, and assumptions are explicit; and
- no issue introduces a plan-level redesign, decomposition, dependency, or behavior decision.

Present the source reference, issue list, manifest, review summary, completion report, enrichments, and unresolved assumptions. **Issue-set approval is required before publication.** Draft authorization is not issue-set approval, and issue-set approval is not publication approval. In Publication mode, present exact create/update actions and obtain separate explicit publication approval immediately before mutation. If approval is withdrawn or scope changes, return to Draft mode.


### 7. Publish idempotently (Publication mode only)

Before mutation, re-read the source and draft manifest and verify the repository identity. Use recorded issue numbers/URLs first. For an unpublished draft, search using only an exact approved title and source reference or an established repository-native field; accept a match only when it is unique and materially consistent. If matches disagree, duplicates exist, or an issue changed materially, stop for reconciliation.

Create or update only explicitly approved parent and children. Preserve existing discussion and unrelated labels/body content; make the smallest safe update. Never publish `needs-review` or `blocked` drafts without explicit approval of that exception. Once URLs exist, replace local relationship references with reciprocal GitHub links and `#number` references. Record mappings locally only after successful responses. A partial failure preserves completed mappings, marks remaining entries `needs-review`, and is safe to resume after rechecking mappings and titles.

Publication creates issues only. It does not create branches, worktrees, PRs, assignments, commits, or delivery orchestration. After publication, report which issues are ready, concurrent, or blocked and point to `/issue-delivery` for one issue at a time.

## Done when

- Every drafted issue explains the main idea, the human-level why, and the technical how in simple standard SWE terms understandable without prior context.
- An explicit invocation/request authorized Draft mode and local artifacts were produced or an exact source-gap report was recorded.
- Every drafted issue has a stable local path and plan-step identity, one-PR scope, public-language body, binary acceptance or an explicit review/block status, verification or an explicit proof gap, ownership, source reference, and dependency/position.
- Parent/child and dependency relationships are represented in the local manifest before publication and become reciprocal GitHub links with `#number` references after publication.
- Reruns update existing local drafts by stable identity without duplicates or silent remapping.
- Draft mode made no GitHub mutations.
- Publication, if requested, had separate issue-set and immediate publication approvals and used idempotent existing-issue safeguards.
- No implementation, branch/worktree, PR, README/index, test, or orchestration machinery was created by this skill.

Report the exact changed artifacts, source gaps, unresolved assumptions, statuses, and completion-report path. Do not claim publication, verification, or approval that did not occur.
