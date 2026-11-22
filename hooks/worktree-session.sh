#!/usr/bin/env bash
# worktree-session.sh — SessionStart hook. Shows the last known worktrees ready to clean up,
# then refreshes that list in the background so the next session starts with current data.
#
# The status report calls gh once per worktree, so it runs detached instead of blocking startup.

status_script="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../scripts" && pwd)/worktree-status.sh"
cache_root=${WORKTREE_STATUS_CACHE_DIR:-$HOME/.cache/agents-worktree-status}

common_dir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
key=$(printf '%s' "$common_dir" | shasum | cut -c1-16)
cache="$cache_root/$key.txt"

if [ -f "$cache" ]; then
  ready=$(awk '$4 == "cleanup" || $4 == "keep-dirty"' "$cache")
  if [ -n "$ready" ]; then
    echo "Worktrees with merged PRs (last check; run wts for detail):"
    echo "$ready"
  fi
fi

mkdir -p "$cache_root" 2>/dev/null || exit 0
(
  tmp=$(mktemp "$cache_root/.refresh.XXXXXX") || exit 0
  if bash "$status_script" > "$tmp" 2>/dev/null; then
    mv "$tmp" "$cache"
  else
    rm -f "$tmp"
  fi
) </dev/null >/dev/null 2>&1 &

exit 0
