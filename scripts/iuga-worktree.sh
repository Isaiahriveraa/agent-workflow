#!/usr/bin/env bash
# iuga-worktree.sh — create and provision an IUGA development worktree.
#
# Usage:
#   iuga-worktree.sh <branch> [start-point] [dest-dir]
#
# Existing branches use the current checkout as their source. New branches
# require an explicit start-point. The destination defaults to a sibling
# directory whose name is derived from the branch.

set -euo pipefail

BRANCH="${1:-}"
START="${2:-}"
DEST="${3:-}"
AGENT_TEMPLATE="${IUGA_AGENT_TEMPLATE:-$HOME/.agents/AGENTS.md}"

usage() {
  echo "usage: iuga-worktree.sh <branch> [start-point] [dest-dir]" >&2
  exit 2
}

[ -n "$BRANCH" ] || usage

command -v git >/dev/null 2>&1 || { echo "ERROR: git is required" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm is required" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 is required" >&2; exit 1; }
[ -r "$AGENT_TEMPLATE" ] || {
  echo "ERROR: agent template is not readable: $AGENT_TEMPLATE" >&2
  echo "       set IUGA_AGENT_TEMPLATE to a readable template" >&2
  exit 1
}

REPO_ROOT="$(git rev-parse --show-toplevel)"
[ -f "$REPO_ROOT/.gitmodules" ] || {
  echo "ERROR: this is not an IUGA checkout: missing .gitmodules" >&2
  exit 1
}
[ -f "$REPO_ROOT/frontend/package-lock.json" ] && [ -f "$REPO_ROOT/backend/package-lock.json" ] || {
  echo "ERROR: this is not an IUGA checkout: package lockfiles are missing" >&2
  exit 1
}

REPO_PARENT="$(dirname "$REPO_ROOT")"
DEV_CONTEXT="${IUGA_DEV_CONTEXT:-$REPO_PARENT/dev/context}"
if [ ! -d "$DEV_CONTEXT" ] && [ -d "$REPO_ROOT/context" ]; then
  DEV_CONTEXT="$REPO_ROOT/context"
fi
[ -d "$DEV_CONTEXT" ] || {
  echo "ERROR: dev context directory not found: $DEV_CONTEXT" >&2
  echo "       set IUGA_DEV_CONTEXT or ensure dev/context exists" >&2
  exit 1
}
DEV_CONTEXT="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$DEV_CONTEXT")"

DIR_NAME="$(printf '%s' "$BRANCH" | sed 's#^refs/heads/##; s#/#-#g')"
[ -n "$DEST" ] || DEST="$REPO_PARENT/$DIR_NAME"
DEST="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$DEST")"

[ ! -e "$DEST" ] || {
  echo "ERROR: $DEST already exists" >&2
  exit 1
}

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  WORKTREE_ARGS=(git worktree add "$DEST" "$BRANCH")
else
  [ -n "$START" ] || {
    echo "ERROR: branch '$BRANCH' does not exist; pass a start-point" >&2
    exit 2
  }
  WORKTREE_ARGS=(git worktree add -b "$BRANCH" "$DEST" "$START")
fi

echo "== creating IUGA worktree: $DEST"
"${WORKTREE_ARGS[@]}"

if [ "${IUGA_SKIP_SUBMODULE:-0}" != "1" ]; then
  echo "== initializing schema submodule"
  git -C "$DEST" submodule update --init --recursive
fi

if [ "${IUGA_SKIP_INSTALL:-0}" != "1" ]; then
  echo "== installing root dependencies"
  npm ci --prefix "$DEST"
  echo "== installing backend dependencies"
  npm ci --prefix "$DEST/backend"
  echo "== installing frontend dependencies"
  npm ci --prefix "$DEST/frontend"
fi

echo "== linking dev context folder"
while IFS= read -r tracked_file; do
  [ -n "$tracked_file" ] || continue
  git -C "$DEST" update-index --skip-worktree "$tracked_file"
done < <(git -C "$DEST" ls-files context)

rm -rf "$DEST/context"
ln -s "$DEV_CONTEXT" "$DEST/context"

echo "== installing private agent instructions"
TMP_AGENT="$(mktemp "$DEST/.AGENTS.md.tmp.XXXXXX")"
trap 'rm -f "$TMP_AGENT"' EXIT
cp "$AGENT_TEMPLATE" "$TMP_AGENT"
mv "$TMP_AGENT" "$DEST/AGENTS.md"

EXCLUDE_FILE="$(git -C "$DEST" rev-parse --git-path info/exclude)"
case "$EXCLUDE_FILE" in
  /*) ;;
  *) EXCLUDE_FILE="$DEST/$EXCLUDE_FILE" ;;
esac
mkdir -p "$(dirname "$EXCLUDE_FILE")"
touch "$EXCLUDE_FILE"
if ! awk '$0 == "AGENTS.md" { found = 1 } END { exit !found }' "$EXCLUDE_FILE"; then
  printf '\n# Private IUGA agent instructions\nAGENTS.md\n' >> "$EXCLUDE_FILE"
fi
if ! awk '$0 == "context" { found = 1 } END { exit !found }' "$EXCLUDE_FILE"; then
  printf 'context\n' >> "$EXCLUDE_FILE"
fi

printf '\n== IUGA worktree ready: %s\n' "$DEST"
printf '   cd %q\n' "$DEST"
