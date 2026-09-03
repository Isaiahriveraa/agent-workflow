# Issue Calibration Example

This example shows the difference between a weak issue and a strong issue for the same feature. The feature: allow users to archive a project so it disappears from the active project list but stays recoverable.

## Weak Issue

```
# Add project archiving

## Why
Users want to hide old projects.

## Target behavior
Projects can be archived.

## Scope
The backend, the frontend, and the database.

## Out of scope
N/A

## Acceptance criteria
- Create archive endpoint
- Add archived column
- Update project list query
- Add UI button
- Write tests

## Verification
Run tests
```

This is weak because:

- Acceptance criteria are a task list, not observable outcomes. "Add archived column" is an implementation step; it says nothing about what the user can do.
- Scope is a list of layers, so this issue would touch everything and be unreviewable in one PR.
- Verification is "run tests" with no expected result.
- It mixes schema, API, query, and UI into one unowned blob.

## Strong Issues

### Issue 1: Persist the archived flag on a project

```markdown
# Persist the archived flag on a project

**Plan-step identity:** C-01-persist-archived-flag
**Local draft path:** context/plans/project-archiving/01-persist-flag.md

## Why
Users want to hide old projects; the first step is storing that intent.

## Target behavior
A project has an `archived` boolean. `POST /projects/:id/archive` sets it; `POST /projects/:id/unarchive` clears it.

## Scope
Project model, migration, and the two endpoints.

## Out of scope
Project list filtering, UI, restore-from-trash behavior, any other attribute.

## Acceptance criteria
- After `POST /projects/1/archive`, `GET /projects/1` returns `archived: true`.
- After `POST /projects/1/unarchive`, it returns `archived: false`.
- The migration is reversible.

## Verification
- `npm run typecheck` passes.
- `curl -X POST localhost:3000/projects/1/archive` then `curl localhost:3000/projects/1` shows `"archived": true`.
- `npx prisma migrate rollback` succeeds.

## Dependencies and position
- Depends on: none
- Blocks: context/plans/project-archiving/02-filter-list.md (C-02-filter-archived-projects) — requires archived column
- Position: Start now — no blocker

## Likely ownership
`prisma/schema.prisma`, `migrations/`, `src/routes/projects.ts`. No collision risk — no other issue touches these yet.

## Plan reference
context/plans/project-archiving/00-index.md#persist-the-archived-flag
```

### Issue 2: Filter archived projects out of the active list

```markdown
# Filter archived projects out of the active list

**Plan-step identity:** C-02-filter-archived-projects
**Local draft path:** context/plans/project-archiving/02-filter-list.md

## Why
Archiving must hide the project from the active list to be useful.

## Target behavior
`GET /projects` (active view) omits projects where `archived` is true. `GET /projects?include=archived` returns everything.

## Scope
The list query and its response shape.

## Out of scope
Archive/unarchive endpoints (Issue 1), archived-project browsing UI, pagination changes.

## Acceptance criteria
- `GET /projects` returns only non-archived projects.
- `GET /projects?include=archived` returns archived ones too.
- Existing tests for the list endpoint still pass unchanged (backward compatible by default).

## Verification
- `npm run typecheck` passes.
- `curl localhost:3000/projects` shows no archived project; `curl "localhost:3000/projects?include=archived"` does.
- `npm test -- list` passes.

## Dependencies and position
- Depends on: context/plans/project-archiving/01-persist-flag.md (C-01-persist-archived-flag) — needs the `archived` column
- Blocks: none
- Position: Blocked — depends on Issue 1 landing and schema migration

## Likely ownership
`src/routes/projects.ts` (same file as Issue 1 — run after Issue 1 lands), `src/lib/projectQuery.ts`. Collision risk: Issue 1 touches `src/routes/projects.ts`; these are sequential.

## Plan reference
context/plans/project-archiving/00-index.md#filter-archived-projects
```

## Why these are strong

- **Behavior-complete, reviewable.** Each issue is end-to-end and fits one PR.
- **Acceptance criteria are observable.** You can point at a command output and say "done".
- **Dependencies are explicit.** Issue 2 blocks on Issue 1, and the shared-file risk is named so they run sequentially.
- **Verification is concrete.** Exact commands + expected results, not "run tests".
- **Scope and out-of-scope bound each issue.** No layer-hopping.
