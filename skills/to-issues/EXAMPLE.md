# Issue Calibration Example

This example compares two weak issues with two strong issues for the same feature: let people archive projects so they leave the active list but remain recoverable.

## Weak Issue 1 (Task list without context)

```markdown
# Add project archiving

- Add an `archived` column.
- Create archive and unarchive endpoints.
- Change the project list query.
- Add an Archive button.
- Add tests.
```

This is weak because it lists implementation tasks without explaining the user problem, the intended behavior, the boundaries of the change, or how anyone can verify that it works. It also combines storage, API, query, and UI work without saying whether the result is one reviewable change or several.

## Weak Issue 2 (Drowning in agent jargon)

```markdown
# Execute C-01 project archival

Execute step C-01 from the plan index under the durable root. Dispatch a worker prompt to add the archived field and reconcile the manifest entry. Run the preflight metadata check, complete the enrichment pass, then hand the shard to the orchestrator for the audit barrier. The fleet should report completion before the next wave starts.
```

This is weak because it describes an internal planning process instead of a software problem and its solution. Terms such as plan index, durable root, worker prompt, manifest, enrichment pass, orchestrator, shard, audit barrier, fleet, and wave give a developer no useful context about the behavior users need.

## Strong Issue 1: Persist the archived flag on a project

```markdown
# Persist the archived flag on a project

<!-- Local draft metadata; omit this block from the published issue body. -->
**Plan-step identity:** C-01-persist-archived-flag
**Local draft path:** context/issues/project-archiving/001-persist-archived-flag.md

## Summary
Store whether each project is archived, and provide endpoints that set or clear that state. This gives the rest of the application a durable, recoverable source of truth for hiding old projects without deleting them.

## Current behavior
Projects that are no longer active still clutter the project list, but deleting them would permanently lose work that people may need later. Today the system has no durable state distinguishing an archived project from an active one.

## Intended behavior
Add an `archived` boolean flag to the project model (defaulting to `false`). Provide `POST /projects/:id/archive` and `POST /projects/:id/unarchive` endpoints so archiving is fully reversible, and return the current archive state in `GET /projects/:id`.

## Context & Sub-issues
- **Part of initiative:** `000-index.md` (Project Archiving)
- **Depends on:** None — this issue creates the stored state required by later behavior.
- **Blocks / Unblocks:** Blocks `002-filter-archived-projects.md` — the active-list filter cannot distinguish archived projects until this field exists.
- **Position:** Start now — no prerequisite is required.

## Expected outcome
- [ ] Given an active project, calling `POST /projects/:id/archive` sets `archived: true` and preserves other fields.
- [ ] Given an archived project, calling `POST /projects/:id/unarchive` resets `archived: false`.
- [ ] Requesting a non-existent project returns the standard not-found status.
- [ ] Existing projects and newly created projects default to `archived: false`.
- [ ] Database migration applies and reverts safely without data loss.

## Plan reference
- **Source Plan:** `context/plans/project-archiving/00-index.md#persist-the-archived-flag`
> **Note for implementers:** This plan is a **rough draft and guidance document**, not an unalterable specification. Use it for architectural context, guidance, and inspiration. Validate assumptions, inspect live code, and think through edge cases yourself during implementation.
```

## Strong Issue 2: Filter archived projects out of the active list

```markdown
# Filter archived projects out of the active list

<!-- Local draft metadata; omit this block from the published issue body. -->
**Plan-step identity:** C-02-filter-archived-projects
**Local draft path:** context/issues/project-archiving/002-filter-archived-projects.md

## Summary
Make the default project list show only active projects while keeping an explicit way to include archived ones. People can then focus on current work without losing access to projects they previously archived.

## Current behavior
Even with the archived flag stored in the database, `GET /projects` currently returns all projects mixed together. Active work remains cluttered with archived work.

## Intended behavior
Update the project list query so `GET /projects` returns only active projects (`archived: false`) by default. Support an opt-in query parameter `GET /projects?include=archived` to return both active and archived projects.

## Context & Sub-issues
- **Part of initiative:** `000-index.md` (Project Archiving)
- **Depends on:** `001-persist-archived-flag.md` (C-01-persist-archived-flag) — needs the persisted `archived` column and endpoints.
- **Blocks / Unblocks:** None — completes active-list filtering.
- **Position:** Blocked — start after the archive-state migration and endpoints land.

## Expected outcome
- [ ] `GET /projects` returns only active projects by default.
- [ ] `GET /projects?include=archived` returns both active and archived projects.
- [ ] Existing authorization, pagination, and response sorting remain intact.

## Plan reference
- **Source Plan:** `context/plans/project-archiving/00-index.md#filter-archived-projects`
> **Note for implementers:** This plan is a **rough draft and guidance document**, not an unalterable specification. Use it for architectural context, guidance, and inspiration. Validate assumptions, inspect live code, and think through edge cases yourself during implementation.
```
## Post-publication relationship shape (terminal first)

After publication, the relationship graph can look like this. Every published issue keeps its own `## Summary` (or `## Main idea`); relationship links supplement that section rather than replace it.

```sh
# Publish one index issue and two native sub-issues.
gh issue create --title "Project archiving" --body-file 000-index.md       # -> #120
gh issue create --title "Persist the archived flag" --body-file state.md # -> #121
gh issue create --title "Filter archived projects" --body-file list.md   # -> #122

# The issue number and database id differ; resolve ids before attaching.
CHILD_121_DATABASE_ID="$(gh issue view 121 --json id --jq .id)"
CHILD_122_DATABASE_ID="$(gh issue view 122 --json id --jq .id)"

# Keep public bodies self-contained with reciprocal relationship references.
gh issue edit 120 --body "$(cat 000-index.md; printf '\n\nSub-issues: #121 and #122.\n')"
gh issue edit 121 --body "$(cat state.md; printf '\n\nIndex issue: #120.\n')"
gh issue edit 122 --body "$(cat list.md; printf '\n\nIndex issue: #120.\n')"

gh api --method POST repos/acme/app/issues/120/sub_issues \
  -F sub_issue_id="$CHILD_121_DATABASE_ID"
gh api --method POST repos/acme/app/issues/120/sub_issues \
  -F sub_issue_id="$CHILD_122_DATABASE_ID"

# Verify both directions before proceeding.
gh issue view 120 --json number,subIssues
gh issue view 121 --json number,parent
gh issue view 122 --json number,parent

# Publish an independent issue, then add a blocked-by edge to #121.
gh issue create --title "Archive project UI" --body-file ui.md            # -> #123
gh issue edit 123 --body "$(cat ui.md; printf '\n\nBlocked by #121.\n')"
gh issue edit 121 --body "$(cat state.md; printf '\n\nIndex issue: #120.\n\nBlocks #123.\n')"

```

The resulting published shape is: index `#120` -> native sub-issues `#121`
and `#122`; independent `#123` is blocked by `#121`. The index body links
`#121` and `#122`, each sub-issue body links back to `#120`, and the dependency is
reciprocal (`#123` says `Blocked by #121`; `#121` says `Blocks #123`). Native
sub-issue containment is separate from the arbitrary blocked-by edge.

## Why these are strong

- **Zero-context SWE clarity:** Any developer or student can understand what is changing, who benefits, and why it matters within seconds without wading through wall-of-text micro-instructions.
- **Clean observable behavior:** Each issue explains current behavior vs intended behavior in plain English rather than dumping code diffs or CLI instructions.
- **Clear expected outcomes:** Outcomes are binary and observable from the caller's perspective.
- **Plan framed as guidance:** The plan reference explicitly prompts the implementer to treat the plan as a rough draft and inspiration, encouraging them to validate assumptions and consider edge cases.
