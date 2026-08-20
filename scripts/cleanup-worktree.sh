#!/usr/bin/env bash
# cleanup-worktree.sh — tear down a merged feature branch: worktree, local branch, remote branch.
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

if [ -n "$WT_PATH" ]; then
  if [ "$FORCE" -eq 0 ] && [ -n "$(git -C "$WT_PATH" status --porcelain)" ]; then
    echo "ERROR: worktree $WT_PATH has uncommitted changes — commit/stash them, or rerun with --force to discard." >&2
    exit 1
  fi
  echo "== removing worktree: $WT_PATH"
  git worktree remove "$WT_PATH" $([ "$FORCE" -eq 1 ] && echo --force)
fi

# delete the merged local branch
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  FLAG=-d
  [ "$FORCE" -eq 1 ] && FLAG=-D
  echo "== deleting local branch: $BRANCH ($FLAG)"
  git branch "$FLAG" "$BRANCH"
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
