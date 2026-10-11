# One outcome at a time

Read this contract when design, research, tickets, planning, or delivery need to
choose or refresh the next item. It does not authorize a later stage.

## Intent and execution have different owners

- `context/designs/<initiative>/00-index.md` organizes the user's words,
  numbered behavior cards, default priority, real prerequisites, and provisional
  parallel groups. Cards describe observable behavior, meaningful failure cases,
  scope, and unanswered decisions—not future implementation plans.
- `context/issues/<initiative>/000-index.md` is the **sole execution queue**.
  It links each local ticket, published issue, current plan, research, PR, and
  verification evidence. Do not keep a second delivery-status list in the design.
- Plans describe one current, end-to-end slice. Research records facts and
  unresolved choices for that slice. Reuse links instead of copying findings.

Keep IDs stable when priority changes; numbering is a default tie-breaker, not
proof of readiness. Split an oversized outcome into independently verifiable
behavior tickets before planning; do not split it into database/backend/UI
layers that deliver nothing independently.

## Queue format

Use one `## Queue` table, with these exact columns and plain repository-relative
paths, not Markdown links. `-` means unset; dependencies are comma-separated IDs.
Issue and PR cells hold their number or URL. IDs are three-digit numbers.

| ID | Ticket | Issue | Status | Depends on | Plan | Research | PR | Evidence |
|---|---|---|---|---|---|---|---|---|
| 001 | context/issues/example/001-first.md | - | ready | - | - | - | - | - |
| 002 | context/issues/example/002-follow-up.md | - | draft | 001 | - | - | - | - |

Status means:

- `draft`: an unreviewed local ticket; `needs-review`: an unresolved decision.
- `ready`: a coherent reviewed outcome available for research or planning.
- `blocked`: record the blocker and how to resolve it under Open decisions.
- `in-progress`: owned by an active branch/worktree; not another agent's next job.
- `in-review`: awaiting human review or integration; a draft PR is not done.
- `done`: observable behavior verified in the intended base, with Evidence
  naming the integrated commit and the check or human verdict. A PR URL alone
  is not verification.

Dependencies express required observable outcomes, not convenient coding order.
A ready item is eligible only when its dependencies are done and it has no
active PR. The CLI conservatively treats any populated PR cell as active for a
  ready row: reconcile a closed/abandoned PR before clearing it, retaining its
  history in ticket notes. Never silently turn blocked or active work into ready.
  When a dependency-only blocker clears, verify the prerequisite's integrated
  behavior, restore the already-reviewed consumer to `ready`, and record the
  reason. A remaining product decision or active ownership keeps it unavailable.

## Resolve the requested stage

1. Honor an explicit item or initiative. Otherwise use the active conversation
   and linked artifacts, or the one unambiguous initiative in this repository.
   Ask only if several materially different initiatives remain plausible.
2. Read the relevant design, queue, linked evidence, and live code/tests/Git
   state. Reconcile outdated claims first, including GitHub issue/PR state when
   applicable. If a prerequisite's claimed behavior is absent from the intended
   base, reopen/block it and its consumers rather than trusting the label.
3. If the queue does not exist yet, choose the next unimplemented design outcome
   by its dependencies and default priority; draft only the necessary local
   ticket through `to-issues`. Review its behavior against agreed intent before
   marking it ready. Do not invent approval for unresolved product decisions.
   Standalone research questions remain valid and need no delivery queue.
4. Run the read-only gate from the target repository:

   ```sh
   python3 ~/.agents/scripts/workflow.py select context/issues/<initiative>/000-index.md
   # An explicit request must not fall back to another item:
   python3 ~/.agents/scripts/workflow.py select context/issues/<initiative>/000-index.md --target 002
   ```

   Resolve a ticket path or published issue to its queue ID before invoking the
   gate. Default selection uses ascending numeric ID among eligible rows. To
   express a priority different from that default, name the item explicitly.
   JSON reports selection, eligible candidates, and blockers. No eligible item
   is an ordinary result (`selected: null`); an invalid explicit request or
   malformed queue is an error. Explain the specific blocker or next action.
5. **Research** answers only the selected item's missing questions, starting
   with local code and existing evidence. Skip unnecessary external research.
   **Plan** inspects current callers/tests and writes one small plan; if a
   missing fact blocks it, research that fact, not the backlog. **Implement**
   requires the selected item's matching approved, fresh plan. If absent, name
   the exact planning/approval step; do not improvise a plan while coding.
6. Stop after the requested stage. Selection is not permission to implement,
   publish tickets, stage/commit code, publish a PR, mark it ready, or merge.

A small, unambiguous fix explicitly requested outside a queued initiative may
use the existing direct implementation path: describe its scope and public test
seam, isolate it, and keep TDD, cleanup, review, and human commit/PR gates. Do not
fabricate a backlog for it. This is not an exception to a queued item's approved
plan requirement. Published issue delivery retains its separate proposal
approval before worktree creation.

## Approved plans and code drift

Every executable plan records exactly one of each field:

```markdown
**Ticket:** context/issues/example/001-first.md
**Planned at:** <full commit SHA inspected>
**In-scope files:** src/first.py, tests/test_first.py
**Plan status:** draft
```

Ticket may instead be the queue's recorded Issue value. Paths are literal,
comma-separated repository-relative files, not globs; list existing and new
files whose behavior or contracts the plan relies on. User approval changes
the status to `approved`; a template or agent cannot grant that approval.
Link the plan in its queue row before delivery.

Before creating an implementation worktree, check it against the intended
execution base (default HEAD); after creating it, recheck from that clean
worktree using the original artifact paths when context is ignored:

```sh
python3 ~/.agents/scripts/workflow.py check context/issues/<initiative>/000-index.md --target 001 --plan context/plans/<slice>/00-index.md --base HEAD
```

From a linked worktree, supply the original index and plan as absolute paths.
The gate resolves artifact links against the index owner's root and code scope
against the execution root, requiring both to share the same Git common
directory. Keep updating the original queue; do not copy ignored context into a
second execution-state store.

The gate verifies readiness, exact plan linkage/identity, approval, an ancestor
baseline, and no scoped Git changes. Unrelated commits need not invalidate the
plan. Scoped committed, staged, unstaged, or untracked changes require inspection
and a refreshed plan/approval when decisions change. Do not overwrite the
baseline just to pass. Plans based on uncommitted production changes are not
executable against a clean base: preserve that work and resolve its integration
first. A resumed executor revalidates the original base/plan and reviews its own
expected diff; it must not mistake intentional implementation changes for an
unreviewed new baseline or reset them to pass this pre-execution gate.

The CLI never proves behavior, human consent, issue freshness, scope size, or
parallel safety from text alone. Agents still inspect the live sources and
obtain required human decisions.

## Parallelism and completion

Eligible candidates are not necessarily safe to run together. Before parallel
implementation, inspect shared files, public contracts, migrations, generated
artifacts, and integration order. Serialize consumers of unfinished contracts;
coordinate genuinely independent concerns in separate branches/worktrees/PRs
through orchestration when requested. Do not create separate code plans for
every candidate in advance.

After research, planning, implementation, feedback, and integration, update the
owning artifacts: current links, blockers, decisions, status, and evidence.
Keep implementation `in-progress` until its local review is complete, then
`in-review`; it becomes `done` only after the intended base contains the verified
behavior. Preserve TDD → checks → code-judgment → code-review → human feedback,
plus commit and publication approval from the commit-pr-reviewer subagent. Finish with the selected item, what
was verified, what awaits the human, and the next eligible item or blocker.
Never start that next item merely because it was mentioned in the handoff.

For older bundles, reconcile existing notes and links into this table without
discarding authored content. Do not create a competing manifest or mark legacy
completed work done without evidence.
