#!/usr/bin/env bash
# new-worktree.sh — create a worktree whose directory name matches its branch.
#
# RULE: worktree directory name = branch name with '/' → '-' (feat/merch-page → feat-merch-page).
# Worktrees live under the repo's parent directory by default (matching repo layout).
#
# usage:
#   new-worktree.sh <branch> [start-point] [dest-dir]
#
#   <branch>       branch to create (new or existing). Required.
#   [start-point]  commit/ref to branch from (default: HEAD). Required when creating a new branch.
#   [dest-dir]     override the worktree directory (default: <repo-parent>/<branch with / → ->).
#
# examples:
#   new-worktree.sh feat/merch-page origin/main
#   new-worktree.sh fix/relative-api-urls
#   new-worktree.sh merge/main-into-dev origin/dev

set -euo pipefail

BRANCH="${1:-}"
START="${2:-}"
DEST="${3:-}"

if [ -z "$BRANCH" ]; then
  echo "usage: new-worktree.sh <branch> [start-point] [dest-dir]" >&2
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_PARENT=$(dirname "$REPO_ROOT")

# derive directory name: strip refs/heads/, replace / with -
DIR_NAME=$(echo "$BRANCH" | sed 's#^refs/heads/##; s#/#-#g')

if [ -z "$DEST" ]; then
  DEST="$REPO_PARENT/$DIR_NAME"
fi

if [ -e "$DEST" ]; then
  echo "ERROR: $DEST already exists — remove it or pass an explicit dest-dir." >&2
  exit 1
fi

# default start-point: HEAD (for existing branches); force explicit for new ones
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  ARGS=(git worktree add "$DEST" "$BRANCH")
else
  if [ -z "$START" ]; then
    echo "ERROR: branch '$BRANCH' doesn't exist — pass a start-point to create it." >&2
    exit 2
  fi
  ARGS=(git worktree add -b "$BRANCH" "$DEST" "$START")
fi

echo "== creating worktree: $DEST"
echo "   branch: $BRANCH"
"${ARGS[@]}"

# submodules — this repo's backend/schemas is a submodule
if [ -f "$DEST/.gitmodules" ]; then
  echo "== initializing submodules"
  git -C "$DEST" submodule update --init --recursive
fi

echo "== done. worktree list:"
git worktree list
