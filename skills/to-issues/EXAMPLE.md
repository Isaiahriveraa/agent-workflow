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

## Main idea
Store whether each project is archived, and provide endpoints that set or clear that state. This gives the rest of the application a durable, recoverable source of truth for hiding old projects without deleting them.

## Problem & Context (The Human Why)
Projects that are no longer active still clutter the project list, but deleting them would lose work that people may need later. Today the system has no durable state that distinguishes an archived project from an active one. Storing this state makes archiving reversible and gives list views a reliable value to filter on.

## Proposed Solution & What is Needed (The How)
Add a non-null `archived` boolean to the project record, with `false` as the default for existing and newly created projects. Add `POST /projects/:id/archive` to set the value to `true` and `POST /projects/:id/unarchive` to set it back to `false`. Return the current value from `GET /projects/:id`, preserve all other project fields, and provide a reversible database migration. Return the existing not-found response when the project ID does not exist.

## Scope & Files
- **In scope:** `prisma/schema.prisma`, the project migration, project model serialization, and the archive/unarchive handlers in `src/routes/projects.ts`.
- **Out of scope (non-goals):** Filtering the active list, archived-project browsing UI, trash/deletion behavior, and changes to pagination.

## Acceptance criteria
- [ ] Given an active project, when `POST /projects/1/archive` succeeds, then `GET /projects/1` returns `archived: true` and all other project data is unchanged.
- [ ] Given an archived project, when `POST /projects/1/unarchive` succeeds, then `GET /projects/1` returns `archived: false`.
- [ ] Given a missing project ID, when either endpoint is called, then the API returns its existing not-found status and does not create a record.
- [ ] Existing projects and newly created projects default to `archived: false`.
- [ ] Applying and reverting the migration succeeds without losing project records.

## How to verify
1. Apply the database migration and start the local server with `npm run dev`.
2. Run `curl -X POST http://localhost:3000/projects/1/archive`, then `curl http://localhost:3000/projects/1`; expect a successful response and JSON containing `"archived":true`.
3. Run `curl -X POST http://localhost:3000/projects/1/unarchive`, then fetch the project again; expect JSON containing `"archived":false`.
4. Run the project API test command; expect all existing project tests and the archive boundary cases to pass.
5. Revert the migration in the local database; expect the command to complete successfully and existing project rows to remain intact.

## Dependencies & Sequencing
- **Depends on:** None — this issue creates the stored state required by later behavior.
- **Blocks / Unblocks:** Blocks `002-filter-archived-projects.md` — the active-list filter cannot distinguish archived projects until this field exists.
- **Position:** Start now — no prerequisite is required.

## Plan reference
context/plans/project-archiving/00-index.md#persist-the-archived-flag
```

## Strong Issue 2: Filter archived projects out of the active list

```markdown
# Filter archived projects out of the active list

<!-- Local draft metadata; omit this block from the published issue body. -->
**Plan-step identity:** C-02-filter-archived-projects
**Local draft path:** context/issues/project-archiving/002-filter-archived-projects.md

## Main idea
Make the default project list show only active projects while keeping an explicit way to include archived ones. People can then focus on current work without losing access to projects they previously archived.

## Problem & Context (The Human Why)
Once archived projects are stored, showing them in the default list would leave the original problem unsolved: active work remains mixed with old work. The list endpoint must apply the archive state consistently so users see a focused active view and can still retrieve archived projects when they need them. The default behavior must remain compatible for callers that do not know about archiving.

## Proposed Solution & What is Needed (The How)
Update the project-list query so `GET /projects` returns only rows where `archived` is `false`. Add an explicit `include=archived` query option that returns both active and archived projects. Keep the existing response shape, ordering, pagination behavior, and authorization rules. Cover both query modes and ensure an archived project is not returned by the default request.

## Scope & Files
- **In scope:** the project-list query and handler in `src/routes/projects.ts` and `src/lib/projectQuery.ts`, plus endpoint-level tests for both list modes.
- **Out of scope (non-goals):** Creating or changing the archived flag, archive/unarchive endpoints, archived-project browsing UI, and pagination redesign.

## Acceptance criteria
- [ ] Given active and archived projects visible to the caller, when `GET /projects` is requested without options, then only active projects are returned.
- [ ] Given active and archived projects visible to the caller, when `GET /projects?include=archived` is requested, then both kinds are returned with the existing response fields and ordering.
- [ ] Given a project the caller is not authorized to see, when either list mode is requested, then that project is still excluded by the existing authorization rules.
- [ ] Existing callers that use `GET /projects` continue receiving the same response shape and pagination contract, except that archived rows are intentionally omitted.

## How to verify
1. Apply the archive-state migration, create one active project and one archived project for the same authorized user, and start the local server with `npm run dev`.
2. Run `curl http://localhost:3000/projects`; expect the response to contain the active project and not contain the archived project.
3. Run `curl 'http://localhost:3000/projects?include=archived'`; expect the response to contain both projects in the established order.
4. Run the project-list endpoint test command; expect the default, opt-in, authorization, and pagination cases to pass.
5. Confirm that a project belonging to another user is absent from both responses; expect the existing authorization status and response behavior.

## Dependencies & Sequencing
- **Depends on:** `001-persist-archived-flag.md` (C-01-persist-archived-flag) — the query needs the persisted `archived` value and its migration.
- **Blocks / Unblocks:** None — this completes active-list filtering; a later UI issue may use the opt-in behavior.
- **Position:** Blocked — start after the archive-state migration and endpoints are available in the shared development branch.

## Plan reference
context/plans/project-archiving/00-index.md#filter-archived-projects
```

## Why these are strong

- **Zero-context SWE clarity:** Any developer can understand what is changing, who benefits, and why it matters within seconds, without reading the source plan.
- **Human why and how:** Each issue starts with real user or system pain, then explains the data flow, API behavior, and concrete technical work needed to resolve it.
- **Observable acceptance and concrete verification:** The criteria describe given/when/then outcomes, and the verification steps provide commands plus expected results, including errors and boundaries.
- **Clean boundaries and explicit dependencies:** Each issue owns one reviewable concern, names its files and non-goals, and states exactly why the second issue follows the first.
