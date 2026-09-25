---
name: split-dirty-worktree
description: "Assess an oversized dirty working tree and propose how to split it into branches: group the uncommitted changes into concerns, decide whether they belong on one branch, a gh stack of dependent layers, or separate worktrees of independent concerns, then plan the commits for each branch. Read-only until you approve the plan."
---

# Split a Dirty Worktree

Given a large mixed working tree, answer how many branches are needed, the dependency order, and which commits belong on each branch. This workflow is read-only until you explicitly approve the plan; it never mutates the index, refs, stash, files, branches, worktrees, or PR state during analysis.

## Step 1 — Take inventory

Run the read-only inventory in a plain bash fence:

```bash
node ~/.agents/skills/split-dirty-worktree/inventory.mjs [--json] [--cwd <path>]
```

Read its labeled blocks in this order: `repo`, `root`, `branch`, `head`, `bases`, `worktrees`, `staged`, `unstaged`, `untracked`, `files`, `hunks`, `untracked-files`, `totals`. Each `files:` row is one tracked change, `XY path +a -d hunks=n flags`; each `hunks:` row is `path#i header`; each `untracked-files:` row is `path bytes flags`. Brand-new files appear only under `untracked-files:` and are never counted in `files:` or `totals:`. Flags are only `test`, `docs`, `ci`, `config`, `lockfile`, `generated`, `local-state`, `submodule`, in that order. `--json` emits one object with the same stable keys and no other output.

Note mixed files (a file later assigned to more than one concern), flags, staged versus unstaged work, and untracked files. Hunk indices are the `git diff HEAD -U0` order and match `git add -p` only when that file's index entry is clean; re-run inventory after tree changes. Never guess the diff. Use raw git output only; never prefix git with `rtk`.

## Step 2 — Group the changes into concerns

A concern is one behavior change with one reason to exist and one reviewer story: the `commit` skill's Responsibility Unit owns the one-sentence, alone-revert, and independent-approve tests. Reference `skills/commit/SKILL.md`; do not duplicate its message format or hunk-staging rules.

Group by change type, domain or scope, motivation, and revertability. A concern expected to exceed about 500–700 changed lines is a candidate for its own branch and probably a stack layer. Keep tests with the behavior they prove. Do not group merely because files were edited together.

## Step 3 — Decide whether the concerns depend on each other

For every pair, answer each question with its concrete check:

- Does B reference a symbol, table, column, route, or file only A introduces? Grep B's added lines for A's new identifiers.
- Do A and B edit the same file? Same file with different hunks is an ordering dependency; the same hunk is not separable, so merge or refactor first.
- Would B's tests fail on a tree containing B but not A? Run the smallest relevant test on that hypothetical branch.
- Would a reviewer approve A without seeing B and merge A alone? Inspect A's diff and its focused verification independently.

Record one verdict per pair: `none` (independent), `ordering` (same branch, commit order), or `hard` (B is unusable without A and must be a later layer).

## Step 4 — Pick the topology

| Evidence | Topology |
|---|---|
| one concern | one branch: hand to `commit`, then `pr` |
| 2+ concerns, every pair `none` | separate worktrees, one branch per concern, all off the same base |
| any pair `hard` | `gh stack`, layers in dependency order |
| a `hard` cluster plus independent concerns | stack for the cluster, separate worktrees for the rest |
| a pair that is not separable (same hunk, or B's tests cannot pass without A) | report it: one concern, or refactor the shared code first |

A stack costs rebases and forces merge order. Choose it only when the lower layer is independently reviewable and must land first. Same file alone is a commit-ordering problem, not a stack. Worktrees are for concerns that can merge in any order and can be worked on in parallel. Use one concern per branch and `~/.agents/scripts/new-worktree.sh <branch> <base>`.

## Step 5 — Plan the commits inside each branch

For each branch, list ordered commits; each commit is one responsibility. Prefer a preparatory refactor with no behavior change, then the contract, then its consumer; keep tests with the behavior they prove. Assign mixed-file hunks by inventory `hunks:` indices. Indices shift when the tree changes, so re-run inventory before staging. Defer commit messages and hunk-staging mechanics to `skills/commit/SKILL.md`.

## Step 6 — Present the plan

Use this exact shape, then stop. Do not mutate Git before explicit approval. List generated, local-state, and secret paths under `Not committed`; they are not silently assigned to a branch.

```text
WORKTREE SPLIT PLAN
===================
Inventory: <files> files, +<a>/-<d>, <n> hunks, <u> untracked
Topology: single branch | N separate worktrees | gh stack (<n> layers) | stack + worktrees
Why: <2 sentences: the dependency evidence that decided it>

Concerns:
1. <concern name> — <one sentence, no "and">
   Files: <paths, or "path (hunks 1,3)">
   Depends on: none | <concern n> (<none|ordering|hard>)
   Branch: <branch-name> -> base <base>
   Commits:
     - <type>(<scope>): <one story>
     - <type>(<scope>): <one story>
2. ...

Not committed: <generated/local-state/secret paths and why>

Execution order: <1. branch a, 2. branch b ... / stack bottom-up>
Approval required before any branch, worktree, stack, or commit is created.
```

## Step 7 — Execute after approval

Read `MECHANICS.md`, especially the named sections, before transporting changes.

1. Take the safety snapshot; verify the working tree still matches the recorded `git status`.
2. Create branches or worktrees; verify with `git worktree list`.
3. Transport each concern using `MECHANICS.md` section A or B; verify `git diff --cached` and `git status --short` prove only other concerns remain.
4. Commit each branch through `skills/commit/SKILL.md`; verify `git log --oneline <base>..<branch>`.
5. Use `skills/pr/SKILL.md` for PR strategy and execution; stack layers bottom-up and worktrees in parallel.
6. Confirm every planned change is committed exactly once, nothing remains unintentionally, and the snapshot proves nothing was lost.

## Rules

- Never mutate before explicit approval.
- Never lose work: snapshot the diff, untracked files, and porcelain status before transport.
- Use exact raw git output; never use `rtk` for git or inventory.
- If the tree cannot be split safely, report that and do not force a split.
- Flag generated and local-state files, secrets, and other non-source artifacts instead of committing them.
