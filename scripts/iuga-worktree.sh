#!/usr/bin/env bash
# iuga-worktree.sh — create and provision an IUGA development worktree.
#
# Usage:
#   iuga-worktree.sh <branch> [start-point] [dest-dir]
#
# Existing branches use the current checkout as their source. New branches
# require an explicit start-point and must follow <type>/<short-description>
# with lowercase words joined by hyphens (see branch-name-rules.sh; existing
# branches are not name-checked). Environment words (production, staging, prod)
# are allowed in IUGA branch names; artifact words (prototype, plan) are not.
# The destination defaults to <repo-parent>/<repo-name>-worktrees/<branch path>.
#
# Beyond `git worktree add`, the script provisions what the checkout needs to
# run immediately: submodules, dependencies, the shared context/ folder, the
# private AGENTS.md, and a copy of the source checkout's backend env files
# (backend/env/.env*) so the API boots without manual env setup.

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

# shared branch-name convention (scripts/branch-name-rules.sh)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/branch-name-rules.sh"

# IUGA branches legitimately reference deployment environments (production,
# staging, prod), so only artifact words stay banned here: a branch must not be
# named after the process around the work (a prototype run, a plan).
BRANCH_NAME_BANNED_WORDS='prototype|plan'

[ -r "$AGENT_TEMPLATE" ] || {
  echo "ERROR: agent template is not readable: $AGENT_TEMPLATE" >&2
  echo "       set IUGA_AGENT_TEMPLATE to a readable template" >&2
  exit 1
}

# main checkout root — resolves correctly even when run from inside a linked worktree
# (git-common-dir always points at the main checkout's .git), so every worktree lands in the same home
REPO_ROOT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
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

BRANCH_PATH="$(printf '%s' "$BRANCH" | sed 's#^refs/heads/##')"
[ -n "$DEST" ] || DEST="$REPO_PARENT/$(basename "$REPO_ROOT")-worktrees/$BRANCH_PATH"
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
  validate_new_branch_name "$BRANCH" || exit 2
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

if [ "${IUGA_SKIP_ENV:-0}" != "1" ]; then
  echo "== copying backend env"
  SRC_ENV_DIR="$REPO_ROOT/backend/env"
  DEST_ENV_DIR="$DEST/backend/env"
  if [ -d "$SRC_ENV_DIR" ]; then
    mkdir -p "$DEST_ENV_DIR"
    copied_env=0
    for src_env in "$SRC_ENV_DIR"/.env*; do
      [ -e "$src_env" ] || continue
      base="$(basename "$src_env")"
      case "$base" in
        *.example) continue ;;
      esac
      cp "$src_env" "$DEST_ENV_DIR/$base"
      copied_env=1
    done
    if [ "$copied_env" -eq 0 ]; then
      echo "   WARNING: no backend env files in $SRC_ENV_DIR — copy backend/.env.example to backend/env/.env.dev" >&2
    fi
  else
    echo "   WARNING: $SRC_ENV_DIR not found — backend env was not copied" >&2
  fi
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
