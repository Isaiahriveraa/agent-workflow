#!/usr/bin/env bash
# cleanup-worktree.sh — tear down a merged feature branch: worktree, local branch, remote branch.
#
# Squash merges are invisible to `git branch -d`, so merged-ness is confirmed through the
# branch's GitHub PR state (when `gh` is available) instead of failing halfway.
#
#   cleanup-worktree.sh <branch>          # safe: refuses dirty worktrees, asks before remote delete
#   cleanup-worktree.sh --force <branch>  # allow dirty worktree (discards changes) + -D local delete
#   cleanup-worktree.sh --yes <branch>    # skip the remote-delete confirmation prompt

set -euo pipefail

FORCE=0
YES=0
BRANCH=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --yes) YES=1 ;;
    -*) echo "unknown flag: $arg" >&2; echo "usage: cleanup-worktree.sh [--force] [--yes] <branch>" >&2; exit 2 ;;
    *) BRANCH="$arg" ;;
  esac
done

if [ -z "$BRANCH" ]; then
  echo "usage: cleanup-worktree.sh [--force] [--yes] <branch>" >&2
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)

# locate the worktree for this branch, if any
WT_PATH=$(git worktree list | awk -v b="[$BRANCH]" '$3 == b { print $1; exit }')

# Decide how the local branch may be deleted BEFORE removing anything: squash merges are
# invisible to `git branch -d`, so confirm merged-ness through the branch's PR instead of
# failing halfway (worktree already gone, branch still present).
BRANCH_FLAG=""
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  if [ "$FORCE" -eq 1 ]; then
    BRANCH_FLAG=-D
  elif git merge-base --is-ancestor "$BRANCH" HEAD 2>/dev/null; then
    BRANCH_FLAG=-d
  else
    PR_STATE=""
    if command -v gh >/dev/null 2>&1; then
      PR_STATE=$(gh pr view "$BRANCH" --json state --jq .state 2>/dev/null || true)
    fi
    if [ "$PR_STATE" = "MERGED" ]; then
      echo "== '$BRANCH' is not ancestor-merged (squash merge); its PR is MERGED — forcing local delete"
      BRANCH_FLAG=-D
    else
      echo "ERROR: '$BRANCH' is not recognized as merged (squash merges are invisible to git)." >&2
      echo "       Verify its PR is merged, then rerun with --force to delete it anyway." >&2
      exit 1
    fi
  fi
fi

if [ -n "$WT_PATH" ]; then
  if [ "$FORCE" -eq 0 ] && [ -n "$(git -C "$WT_PATH" status --porcelain)" ]; then
    echo "ERROR: worktree $WT_PATH has uncommitted changes — commit/stash them, or rerun with --force to discard." >&2
    exit 1
  fi
  echo "== removing worktree: $WT_PATH"
  git worktree remove "$WT_PATH" $([ "$FORCE" -eq 1 ] && echo --force)
fi

# delete the merged local branch
if [ -n "$BRANCH_FLAG" ]; then
  echo "== deleting local branch: $BRANCH ($BRANCH_FLAG)"
  git branch "$BRANCH_FLAG" "$BRANCH"
fi

# remote branch — ask first unless --yes
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  if [ "$YES" -eq 1 ]; then
    echo "== deleting remote branch: origin/$BRANCH"
    git push origin --delete "$BRANCH"
  else
    read -r -p "Delete remote branch origin/$BRANCH? [y/N] " answer
    case "$answer" in
      y|Y) git push origin --delete "$BRANCH" ;;
      *) echo "skipping remote branch deletion" ;;
    esac
  fi
fi

git worktree prune
echo "== done. worktree list:"
git worktree list
