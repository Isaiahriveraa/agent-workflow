# Commit Review Proposal Format

The exact plan shape the commit-pr-reviewer checks. Write it before touching Git state.

```text
## Proposed Commit Plan

### Responsibility Inventory
1. <verb phrase — one responsibility>
2. <verb phrase — one responsibility>

### Commit 1
Message:
<type>(<scope>): <summary>

Purpose:
<one sentence naming the single behavior change; no conjunctions or concept
lists>

Dependency:
<none — lands independently | blocked by Commit N because <observed failure>>

Indivisible:
<not claimed | the reason a split is impossible, with the check that proves it>

Review gate:
<review ran | marker matched and review skipped | skipped: <reason>>

Files:
- path/to/file
- path/to/other-file

Hunks:
- For a one-concern file staged in full: `<path>` — whole file (all changes
  belong to this concern)
- For a mixed-concern or deliberately partial file: `<path>` — exact hunks,
  lines, or concerns staged
- None

Verification:
- <test, lint, build, or staged-diff check>

### Commit 2
Message:
...

## Excluded or Remaining Changes
- path/to/file: <why it is excluded or deferred>
- None

## Execution Order
1. <commit 1 summary>
2. <commit 2 summary>

## Diff Scope
- path/to/file: +<added> / -<removed>
- path/to/other-file: +<added> / -<removed>
- Total files: <N>
- Total added: +<total added>
- Total removed: -<total removed>

commit-pr-reviewer approval required before staging or committing.
```

For a single commit, still show the full proposal.

Do not output only commit messages. The reviewer must be able to check exactly
which files and hunks belong to each commit.

Every inventory line must appear in exactly one commit, and every commit must
map to exactly one inventory line. When the mapping is not one-to-one, the
plan must name the dependency or indivisible exception that justifies it.

Diff Scope must show the exact line counts for the changes covered by the
proposal: `git diff --numstat` for per-file added/removed counts and
`git diff --stat` for the total. With hunk-level staging, show per-commit
numbers; otherwise show the working-tree totals.
