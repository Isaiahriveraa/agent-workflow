# Ticket Calibration Example

This example shows the difference between a weak ticket and a strong ticket for the same feature. The feature: allow users to archive a project so it disappears from the active project list but stays recoverable.

## Weak Ticket

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
- Scope is a list of layers, so this ticket would touch everything and be unreviewable in one PR.
- Verification is "run tests" with no expected result.
- It mixes schema, API, query, and UI into one unowned blob.

## Strong Tickets

### Ticket 1: Persist the archived flag on a project

```
# Persist the archived flag on a project

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

## Dependencies
- Depends on: none.
- Blocks: Ticket 2 (project list filtering).

## Likely ownership
`prisma/schema.prisma`, `migrations/`, `src/routes/projects.ts`. No collision risk — no other ticket touches these yet.

## Plan reference
http://localhost:3456/project/demo/plan/archiving#persist-the-archived-flag
```

### Ticket 2: Filter archived projects out of the active list

```
# Filter archived projects out of the active list

## Why
Archiving must hide the project from the active list to be useful.

## Target behavior
`GET /projects` (active view) omits projects where `archived` is true. `GET /projects?include=archived` returns everything.

## Scope
The list query and its response shape.

## Out of scope
Archive/unarchive endpoints (Ticket 1), archived-project browsing UI, pagination changes.

## Acceptance criteria
- `GET /projects` returns only non-archived projects.
- `GET /projects?include=archived` returns archived ones too.
- Existing tests for the list endpoint still pass unchanged (backward compatible by default).

## Verification
- `npm run typecheck` passes.
- `curl localhost:3000/projects` shows no archived project; `curl "localhost:3000/projects?include=archived"` does.
- `npm test -- list` passes.

## Dependencies
- Depends on: Ticket 1 (needs the `archived` column).
- Blocks: none.

## Likely ownership
`src/routes/projects.ts` (same file as Ticket 1 — run after Ticket 1 lands), `src/lib/projectQuery.ts`. Collision risk: Ticket 1 touches `src/routes/projects.ts`; these are sequential.

## Plan reference
http://localhost:3456/project/demo/plan/archiving#filter-archived-projects
```

## Why these are strong

- **Behavior-complete, reviewable.** Each ticket is end-to-end and fits one PR.
- **Acceptance criteria are observable.** You can point at a command output and say "done".
- **Dependencies are explicit.** Ticket 2 blocks on Ticket 1, and the shared-file risk is named so they run sequentially.
- **Verification is concrete.** Exact commands + expected results, not "run tests".
- **Scope and out-of-scope bound each ticket.** No layer-hopping.
