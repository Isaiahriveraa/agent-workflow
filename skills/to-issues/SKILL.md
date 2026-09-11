---
name: to-issues
description: Turn a repository plan or settled brief into focused, reviewable local issue drafts, with a separate human-approved publication path for GitHub issues.
argument-hint: "[plan path, plan directory, or settled brief]"
shell-timeout: 20
---

# To Issues

Convert one repository-grounded plan or settled brief into a concise, developer-friendly local issue set. Each issue represents a cohesive, demonstrable capability (sized for one reviewable PR) that any software engineer joining the team can understand in 30 seconds with zero prior context: what the user or caller gets, why it matters, what needs to be built, and how to verify it.

This skill organizes work. It does not implement code, create branches or worktrees, deliver issues, or invent an orchestration system.

## Modes

The invocation must use one of these modes:

- **Draft mode (default):** an explicit invocation or request to draft authorizes local drafting. Read and reconcile the source, preserve its status and gaps, enrich only from available evidence, establish stable local draft paths starting with `000-index.md` followed by `001-...`, `002-...`, `003-...`, `004-...`, write or update the issue drafts in place, then present the result. Do not generate manifest or completion report markdown files; only produce the issue documents. Source-plan approval is not required merely to create local drafts. Draft mode never calls GitHub issue-creation or mutation APIs.
- **Publication mode:** only after the human explicitly requests publication of an already-reviewed draft set. Revalidate the source and local issue drafts, show the publication plan, obtain separate publication approval immediately before mutation, then create or update the mapped GitHub issues idempotently. Publication does not start implementation or issue delivery.

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

If the source is Proposed, unapproved, materially unresolved, stale, contradictory, incomplete, or not readable, do not stop merely because it is unsuitable for a ready delivery issue. Draft what can be grounded and record the exact gap in the affected issue metadata or status notes. Mark affected items `needs-review` or `blocked`; do not fabricate acceptance, verification, ownership, implementation details, or decisions. A missing or unreadable source may yield only a review/blocked report and no invented issue set.

Source-plan approval gaps are metadata for Draft mode, not a hard draft blocker. Issue-set approval is still required before publication, and publication always requires a separate explicit approval immediately before GitHub mutation.

### Two-phase audit and conversion

Treat drafting as two distinct phases:

1. **Audit:** reconcile the source and existing local drafts; identify approval/status gaps, stale evidence, collisions, missing fields, contradictory decisions, circular dependencies, and unresolved assumptions.
2. **Conversion:** write or update only the concerns already defined by the source. Preserve source identities, decisions, acceptance, verification, dependencies, and work positions. Do not use conversion to repair a plan-level problem by inventing a decomposition or redesign.

The audit may mark an issue `needs-review` or `blocked`; that status does not prevent honest local drafting. Any proposed plan-level correction is reported as a return-to-`/plan` item.

### Input/output contract

**Input:** one plan or settled brief plus any existing local draft set. **Output:** a local, reviewable issue set in source concern order, starting with `000-index.md` followed by `001-...`, `002-...`, `003-...`, `004-...`. Each issue is identified before publication by a stable local draft path and plan-step identity, with preserved acceptance, verification, dependency reasons, and work positions. Do not produce `manifest.md` or `completion-report.md`. For a multi-issue set, the index issue (`000-index.md`) links constituent issues, representing native GitHub sub-issue containment separately from the dependency DAG: containment says which issues belong under the initiative index; dependencies say which issue must precede or unblock another. After publication, the GitHub issue number and URL are canonical. Draft mode makes no GitHub mutations.

**Granularity and issue scale:**
- An issue represents a **deliverable capability**, typically mapping 1:1 with the plan's step files (`01-*.md`, `02-*.md` listed in `00-index.md`). An initiative typically targets **4 to 8 constituent issues** (plus the `000-index.md` overview).
- **Checklists vs. separate issues:** Tactical phases, implementation sub-slices, or internal checklists inside a step file (e.g. `### Slice 1: Database models`, `### Slice 2: Route`, `### Slice 3: UI`, `### Slice 4: Smoke test`) belong inside the single capability issue as **`## Expected outcome` checklist items** and implementation details. They must NOT be split into separate micro-issues.
## Workflow

### 1. Audit and reconcile the source

Read the complete source and referenced artifacts, then inspect any existing draft artifacts under the initiative's durable issue path. This is a conversion and completeness pass, not a second planning or design stage. Check current evidence only when needed to identify staleness or contradiction safely. Preserve each concern or step identity and its mapping to the local draft path.

Do not recast work positions as an invented execution schedule:

- **Start now:** no declared blocker; work may begin once its issue is approved and published.
- **Concurrent:** independent of the named sibling(s); state any shared-file or shared-contract collision, which may require sequential implementation.
- **Blocked:** cannot begin or cannot be verified until the named dependency or decision is resolved; state the reason and what unblocks it.

### 2. Build and enrich the issue set

Create one issue for each deliverable capability step already defined by the source plan (typically matching each step file in the plan's `00-index.md`). Do not invent a new decomposition, split or merge step concerns, reorder work, or alter dependencies to make drafting easier. Dependencies must remain acyclic and retain their reasons.

**The Anti-Pattern — Hyper-fragmentation vs. Usability:**
- **DO NOT convert internal plan sub-slices (`### Slice N`) into individual issues.** An issue must be an end-to-end demonstrable capability that a developer can read and immediately choose to pick up (e.g. "Build Admin Campaign Panel & API" or "Customer Order History Screen").
- **Reviewability as primary metric:** An issue is properly scoped when a human reviewer can evaluate the problem, inspect the changes, and verify the outcome in one cohesive review pass without having to cross-reference multiple sibling issues to see working code.
- Internal plumbing steps (e.g. "TX1/TX2 coordinator", "Pure contracts and reducers", "Schema indexes") cannot be understood or verified in isolation by a new engineer; they must remain as implementation steps and acceptance criteria within the parent capability issue.
- **Scale check:** If an initiative is producing 15+ issues, stop immediately. The conversion has confused internal implementation checklists with deliverable capabilities. Group the internal slices back into their parent step concern.
Translate each technical plan concept into a simple explanation of the summary, the current behavior vs intended behavior, how it ties into sub-issues, and what success looks like. Write so a SWE or student with zero prior context can understand the issue immediately. Each issue preserves exactly one source concern or step identity and receives a stable local draft path. Do not require or invent a synthetic visible issue ID. Enrich incomplete issues only with evidence already present or narrowly scoped staleness checks. If safe enrichment is impossible, retain the issue as `needs-review` or `blocked` and state the exact gap. Every draft must contain the exact `## Summary` (or `## Main idea`) heading and its 1–3 sentence summary.
### 3. Draft durable local artifacts

Initialize the canonical issue bundle from the repository generator before drafting:

```sh
python3 ~/.agents/scripts/new-artifact.py --type issues <concern>
```

Fill or update the generated files in place. The generator-created bundle is the starting scaffold; retain its canonical paths and do not substitute an ad hoc issue template or create artifacts elsewhere.

In Draft mode, derive a stable `<concern>` slug from the source and use this
canonical root:

```text
context/issues/<concern>/
```

1. Reuse that exact root on every rerun. If existing drafts point to a
   different legacy root, record `needs-review` and stop rather than writing
   outside the canonical path or silently relocating files.
2. Record the concern slug, selected root, source path, and rerun decision in
   preflight notes.

The selected root must be one durable directory for the concern. Every issue draft must be a Markdown file under `context/issues/<concern>/`. Do not produce `manifest.md`, `completion-report.md`, README/index changes, tests, branches, worktrees, or implementation artifacts.

Numbering convention:
- `000-index.md` is the initiative index (e.g. for events plan or redesign).
- The constituent issue drafts are numbered sequentially starting at `001`: `001-api-contract.md`, `002-frontend.md`, `003-background-jobs.md`, `004-monitoring.md`.
Numeric prefixes are local ordering only, not public issue IDs. The plan-step identity plus local draft path is the stable pre-publication identity.

Explain the summary plainly in every draft before adding detail: what is changing, who or what it helps, and the outcome. Then describe the current behavior, intended behavior, context & sub-issues, expected outcome, and plan reference with the rough-draft guidance note using standard SWE terms and concrete behavior. Never include parenthetical notes like `(The Human Why)` or `(The How)` in headings.

The draft set consists exclusively of the issue documents:
1. `000-index.md` (the umbrella index issue linking to the source plan and all constituent issue drafts);
2. constituent issue drafts numbered sequentially (`001-...`, `002-...`, `003-...`, `004-...`).
Do not generate `manifest.md` or `completion-report.md`.

Reruns are idempotent: re-read the existing issue drafts in `<selected-root>` first, reuse the recorded selected root, and match by the stable local draft path and plan-step identity. Update existing issue artifacts in place and do not create duplicate index or issue drafts or a second issue root. Never silently rename, relocate, or remap a conflicting existing path or identity; record the collision as `needs-review`, preserve the original root, and stop conversion for that conflicting item. Preserve manually added review notes unless the source explicitly supersedes them.

The index issue (`000-index.md`) is a concise umbrella issue linking to the source plan and all constituent issue drafts (for example, the index for an events redesign). Before publication, use local paths and plan-step identities. Stop leaking internal "parent/child" jargon into documents; users understand hierarchy intuitively as an initiative index and its constituent issues. Native sub-issue containment is a separate relationship from the dependency DAG: the index issue and sub-issues express initiative structure, while `Depends on`, `Blocks / Unblocks`, and `Position: Blocked` preserve execution order and waiting reasons. After publication, convert containment to reciprocal native GitHub sub-issue relationships and dependency references to reciprocal GitHub links and `#number` references. Do not imply that the index is a delivery issue unless it owns a single concern. Do not create issue drafts for unresolved decisions.

### 4. Issue format

All issue drafts must follow this conversational, human-friendly section structure. Headings must literally be:
1. `## Summary` (or `## Main idea`)
2. `## Current behavior`
3. `## Intended behavior`
4. `## Context & Sub-issues`
5. `## Expected outcome`
6. `## Plan reference`
Do not append parenthetical notes or explanations such as `(The Human Why)` or `(The How)` to any section heading.

Every draft must include the `## Summary` (or `## Main idea`) section shown below, and Publication mode must preserve that heading and its plain-English content in every published issue body (the local metadata comment may be omitted). Issues must strictly avoid walls of text, micro-step code instructions, raw diffs, and CLI commands—the issue describes observable behavior and context for humans, while the referenced plan provides deep technical execution details for agents.

```markdown
# <Action-oriented descriptive title in plain English>

<!-- Local draft metadata; omit this block from the published issue body. -->
**Plan-step identity:** <source plan step or concern>
**Local draft path:** <path under the selected durable issue root>

## Summary
1–3 plain-English, conversational sentences summarizing what this issue tackles, who it helps, and the intended outcome (e.g. "Hey team, here is the overview of what we want to accomplish..."). Any developer, student, or contributor should instantly grasp the core task in 15 seconds without prior context.

## Current behavior
Explain what happens today in the codebase, application, or system in simple terms:
- What is broken, missing, difficult, or unhandled today?
- What does the current user or developer experience look like?
- Keep it concise; ground in real observable impact rather than internal planning steps or code diffs.

## Intended behavior
Explain what should happen once this issue is implemented:
- What does the desired behavior look like from the user, caller, or system perspective?
- What are the key flow and contract shifts in plain English?

## Context & Sub-issues
Explain how this issue ties into the broader initiative and neighboring issues:
- **Part of initiative:** <index issue 000-index.md or parent issue link>
- **Depends on:** <prerequisite issue or none> — explain why it is needed before starting
- **Blocks / Unblocks:** <subsequent issue or none> — explain what this enables
- **Position:** <Start now | Concurrent | Blocked> — reason

## Expected outcome
Clear, observable outcomes indicating what success looks like when implementation is complete:
- [ ] <Observable user/system outcome 1>
- [ ] <Observable user/system outcome 2>
- [ ] <Boundary or edge-case handling>

## Plan reference
- **Source Plan:** <durable source plan path or URL>
> **Note for implementers:** The referenced plan is a **rough draft and guidance document**, not an unalterable specification. Use it for architectural context, guidance, and inspiration. Validate assumptions, inspect live code, and think through edge cases yourself during implementation.
```

### 5. Zero-context clarity and language rules

Apply the **Zero-Context SWE Principle**: any SWE on the team with no knowledge of prior discussions or plans must immediately understand the problem, why it matters, what is needed, and how to verify it from the issue alone.

Issue narratives must use plain English, active voice, and standard software engineering terms such as endpoints, database tables, components, props, hooks, services, functions, tests, CLI flags, and schemas. Explain the main idea before implementation detail, and define unavoidable specialized terms in context.

Strictly prohibit agent and process jargon in issue narratives. Do not mention agents, subagents, orchestrators, prompt files, fleets, workers, dispatch, waves, shards, plan indices, reconciliation passes, durable roots, preflight checks, manifests, completion reports, or internal step IDs. Keep plan-step identity and local draft path only in the dedicated metadata comment at the top. Never include private planning context, execution instructions, YAML manifests, execution graphs, batch instructions, or directions to run agents in the published body. Section headings must remain clean and literal: never append `(The Human Why)` or `(The How)` or any other parenthetical annotations to section headings. Never leak internal "parent/child" jargon into document bodies; refer to the initiative index (e.g. index for events plan or redesign) and its constituent issues. One issue remains one concern and one PR even when local metadata records relationships.

### 6. Review and approval gates

Before presenting drafts, verify:

- every issue maps to exactly one source concern or step, with stable path and identity;
- every issue has one concern, one PR scope, acceptance, verification, ownership, and source reference, or is clearly marked `needs-review`/`blocked`;
- local paths and identities are unique, stable, and consistently used;
- index/sub-issue containment and dependency links are reciprocal and acyclic, with reasons preserved;
- work positions and reasons are preserved;
- the **Zero-Context SWE Readability Gate** passes: an engineer, student, or contributor with no prior discussions or plans can understand the summary, current behavior, intended behavior, context & sub-issues, expected outcome, and plan reference from the issue alone;
- public bodies contain no agent or process jargon or other internal workflow language;
- source gaps, stale evidence, contradictions, and assumptions are explicit; and
- no issue introduces a plan-level redesign, decomposition, dependency, or behavior decision.

Present the source reference, issue list, enrichments, and unresolved assumptions. **Issue-set approval is required before publication.** Draft authorization is not issue-set approval, and issue-set approval is not publication approval. In Publication mode, present exact create/update actions and obtain separate explicit publication approval immediately before mutation. If approval is withdrawn or scope changes, return to Draft mode.


### 7. Publish idempotently (Publication mode only)
For a multi-issue set, publication has a mandatory ordered contract: (1) create or identify the approved index issue first; (2) create or identify each approved sub-issue second; (3) attach each sub-issue to the index issue using GitHub's native sub-issue relationship API; and (4) verify both sides of every relationship before reporting success. Sub-issue containment is not the dependency DAG: publish and verify dependency links separately, preserving their reasons and reciprocal references.
Before mutation, re-read the source plan and local issue drafts and verify the repository identity. Use recorded issue numbers/URLs first. For an unpublished draft, search using only an exact approved title and source reference or an established repository-native field; accept a match only when it is unique and materially consistent. If matches disagree, duplicates exist, or an issue changed materially, stop for reconciliation. Before creating or updating any issue, validate that every published body contains the exact `## Summary` (or `## Main idea`) heading and its plain-English summary.

Create or update only explicitly approved index and sub-issues. Preserve existing discussion and unrelated labels/body content; make the smallest safe update. Never publish `needs-review` or `blocked` drafts without explicit approval of that exception. For each sub-issue, attach native containment only after both issue records are known, using `POST /repos/{owner}/{repo}/issues/{index_number}/sub_issues` with payload `{ "sub_issue_id": <sub_issue_database_id> }`, then verify the index issue's native sub-issue listing includes that sub-issue and the sub-issue's parent relationship points to that index issue. Verify every declared dependency edge independently using the supported GitHub relationship mechanism and reciprocal issue references. If native sub-issues, permissions, the endpoint, or relationship verification are unsupported, ambiguous, or fail, fail closed: preserve successful mappings, mark the unresolved set `needs-review`, and do not claim publication readiness, and do not silently fall back to body-only links. Once URLs exist, replace local relationship references with reciprocal GitHub links and `#number` references. Record mappings locally only after successful responses. A partial failure preserves completed mappings, marks remaining entries `needs-review`, and is safe to resume after rechecking mappings and titles.

Publication creates issues only. It does not create branches, worktrees, PRs, assignments, commits, or delivery orchestration. After publication, report which issues are ready, concurrent, or blocked and point to `/issue-delivery` for one issue at a time.

## Done when

- Every drafted issue explains the summary, current behavior, intended behavior, and expected outcome in simple standard SWE terms understandable without prior context, with clean headings and no parenthetical notes like '(The Human Why)' or '(The How)'.
- Every drafted issue represents a cohesive, demonstrable capability (typically 4–8 issues per initiative, mapping to the plan's step files), with internal execution steps captured as checklist items in `## Expected outcome` rather than fragmented into separate tickets.
- An explicit invocation/request authorized Draft mode and local issue files were produced.
- Numbering is consistent: `000-index.md` for the index, followed by sequential constituent issues (`001`, `002`, `003`, `004`...).
- Every drafted issue has a stable local path and plan-step identity, one-PR scope, public-language body, binary acceptance or an explicit review/block status, verification or an explicit proof gap, ownership, source reference, and dependency/position.
- No `manifest.md` or `completion-report.md` files are produced.
- Index/sub-issue native containment and the dependency DAG are represented in the issue drafts before publication and become, respectively, verified reciprocal GitHub sub-issue relationships and reciprocal dependency links with `#number` references after publication.
- Reruns update existing local drafts by stable identity without duplicates or silent remapping.
- Draft mode made no GitHub mutations.
- Publication, if requested, had separate issue-set and immediate publication approvals and used idempotent existing-issue safeguards.
- No implementation, branch/worktree, PR, README/index, test, or orchestration machinery was created by this skill.

Report the exact changed issue drafts, source gaps, unresolved assumptions, and statuses. Do not claim publication, verification, or approval that did not occur.
