# Dirty Worktree Mechanics

## Before you touch anything

Make an external snapshot before transport. Replace `<outside-repo>` with a directory outside the repository:

```bash
git diff HEAD > <outside-repo>/backup.patch
git diff --binary HEAD > <outside-repo>/backup-binary.patch
git ls-files --others --exclude-standard -z > <outside-repo>/untracked-files.zlist
git status --porcelain=v2 > <outside-repo>/status.porcelain-v2
git diff --cached --binary > <outside-repo>/index.patch
git stash create
```

`git stash create` records a commit without touching the tree. The patch does not contain untracked contents; copy untracked files to the snapshot directory or preserve them in place until every target has been verified. Record the file list and compare `git status --short` after every operation.

## A. In-place sequential

Use when concerns touch disjoint files. Create branch 1 off the base with the dirty tree intact, stage and commit only concern 1, then create the next branch from the base; uncommitted changes carry forward:

```bash
git switch -c <branch1> <base>
git add -- <files>
git commit

git switch -c <branch2> <base>
git add -- <files>
git commit
```

Git refuses the switch when a file carries both already-committed hunks from branch 1 and pending hunks for branch 2 (`local changes would be overwritten`). That refusal is the signal to use section B, not permission to discard work.

## B. Patch transport

Use for shared files or changes destined for another worktree. Stage one concern's hunks, export the staged patch, then clear the index without changing files:

```bash
printf 'y\nn\n' | git add -p <file>
git diff --cached --binary > <outside-repo>/<concern>.patch
git restore --staged .
git apply --3way <outside-repo>/<concern>.patch
```

Run `git apply --3way <outside-repo>/<concern>.patch` in the target worktree at the base. For untracked files, intent-to-add makes them appear in `git diff`, or copy whole new files directly:

```bash
git add -N <paths>
git diff --binary -- <paths> > <outside-repo>/<concern>.patch
git restore --staged <paths>
```

Verify the target with `git diff --name-only <base>...<branch>` and `git status --short`; never delete the source until the target diff is complete.

## C. Create the destinations

Create independent worktrees with the repository helper. For a stack, enable rerere and create the stack only after approval:

```bash
~/.agents/scripts/new-worktree.sh <branch> <base>
git config rerere.enabled true
gh stack init --base <trunk> <b1> <b2>
gh stack submit --auto
gh stack view --short
git rev-list --left-right --count <base>...<branch>
```

Use one branch per independent concern. Create stack layers in dependency order and submit bottom-up. Follow `skills/pr/SKILL.md` for PR strategy and descriptions; this file only transports the dirty tree.

## D. Verify the split

For every branch, the final file set must equal the planned concern:

```bash
git diff --name-only <base>...<branch>
git diff --stat <base>...<branch>
git status --short
git diff --cached
```

In the original worktree, status must show only unassigned leftovers. The union of all branch diffs plus those leftovers must equal the original inventory; compare totals and file paths, not just commit counts. Run the smallest relevant test per branch, then verify:

```bash
git log --oneline <base>..<branch>
git status --short
```

## E. Failure modes to expect

- A `rtk`-prefixed git command can corrupt exact hunks; use raw git.
- Hunk indices shift when the tree changes; re-run the inventory.
- `git restore --staged <path>` resets the whole file, not one hunk; restore the index from the snapshot if needed.
- `gh stack unstack` can check out a branch belonging to another worktree; inspect `git worktree list` first.
- A `git add -p` answer sequence is positional; count hunks first and do not reuse answers after the file changes.
- If patch application fails, preserve the failed target, inspect rejects, and recover from `<outside-repo>/backup-binary.patch` with `git apply --3way`; never overwrite the source tree.
