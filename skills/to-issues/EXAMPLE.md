# Ticket Calibration Example

This example shows how to turn a behavior brief into a ticket without putting technical implementation choices in the issue.

Read `~/.agents/references/workflow.md` from the skill hub for the authoritative workflow contract. The example's queue is the only execution-status store.

## Weak ticket

```markdown
# Add project archiving

- Add an `archived` database column.
- Create archive and unarchive endpoints.
- Change the project-list query.
- Add an Archive button.
- Add tests.
```

This lists implementation tasks but does not explain the user problem, the current experience, or what success looks like.

## Strong ticket

```markdown
# Archive and restore projects

<!-- Local metadata; remove this block from the published issue body.
Source design: context/designs/project-archiving/01-archive-projects.md
Local draft path: context/issues/project-archiving/001-archive-projects.md
-->

## Problem

People with completed projects have trouble finding their active work, but deleting old projects would lose work they may need again.

## Current behavior

The project list shows old and active projects together. There is no way to hide a project temporarily and bring it back later.

## Desired behavior

People can archive a project to remove it from the active list and restore it later without losing its contents.

## Context

This ticket covers the complete archive-and-restore experience. No other behavior change is required to ship it.

## Acceptance criteria

- [ ] A person can archive a project, and it no longer appears in the active project list.
- [ ] A person can find archived projects and restore one to the active list.
- [ ] Archiving and restoring a project preserves its name and contents.

```

The ticket describes one complete user-visible outcome. Its later plan can choose how to implement that outcome after checking the repository; no technical plan is required before the ticket exists.

## Execution queue

In `context/issues/project-archiving/000-index.md`, draft review is still pending:

```markdown
## Queue

| ID | Ticket | Issue | Status | Depends on | Plan | Research | PR | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001 | context/issues/project-archiving/001-archive-projects.md | - | draft | - | - | - | - | - |
```

After behavior review, reconcile current code and any GitHub work before setting `ready`. `/plan` then selects this row if its prerequisites are satisfied and no active PR exists. It links one current-code plan here and stops for human review; it does not implement automatically. A later approved draft PR changes the row to `in-review`, not `done`. Completion requires verified integrated behavior and an Evidence link.
