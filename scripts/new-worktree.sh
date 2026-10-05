#!/usr/bin/env bash
# new-worktree.sh — create a worktree in the repo's organized worktree home.
#
# RULE: worktrees live under <repo-parent>/<repo-name>-worktrees/, following the branch path:
#   feat/merch-page      → <repo>-worktrees/feat/merch-page
#   prototype/checkout   → <repo>-worktrees/prototype/checkout
# The branch prefix is the organizing folder. New branch names must follow
# <type>/<short-description> with lowercase words joined by hyphens (see
# branch-name-rules.sh); existing branches are not name-checked.
# Override: WORKTREE_SKIP_NAME_CHECK=1.
#
# usage:
#   new-worktree.sh <branch> [start-point] [dest-dir]
#
#   <branch>       branch to create (new or existing). Required.
#   [start-point]  commit/ref to branch from (default: HEAD). Required when creating a new branch.
#   [dest-dir]     override the worktree directory (default: <repo-parent>/<repo-name>-worktrees/<branch>).
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

# shared branch-name convention (scripts/branch-name-rules.sh)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/branch-name-rules.sh"

# main checkout root — resolves correctly even when run from inside a linked worktree
# (git-common-dir always points at the main checkout's .git), so every worktree lands in the same home
REPO_ROOT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
REPO_PARENT=$(dirname "$REPO_ROOT")

# branch path: strip refs/heads/; slashes become subdirectories under the worktree home
BRANCH_PATH=$(echo "$BRANCH" | sed 's#^refs/heads/##')

if [ -z "$DEST" ]; then
  DEST="$REPO_PARENT/$(basename "$REPO_ROOT")-worktrees/$BRANCH_PATH"
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
  validate_new_branch_name "$BRANCH" || exit 2
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
