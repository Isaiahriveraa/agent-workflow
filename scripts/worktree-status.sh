#!/usr/bin/env bash
# worktree-status.sh — one line per worktree: whether its PR merged, its local changes, and the cleanup it qualifies for.
#
#   worktree-status.sh     # run from any checkout of the repository
#
# Columns: STATE BRANCH DIRTY ACTION PATH
#   STATE   merged | open | closed | no-pr | unknown | detached | main
#           "merged" means GitHub reports the branch's PR as merged. "unknown" means gh is unavailable or failed.
#   DIRTY   "clean", or the number of uncommitted, untracked, or ignored entries
#   ACTION  cleanup    merged and clean: cleanup-worktree.sh can remove it
#           keep-dirty merged but holds local files: report them, do not force
#           keep       anything else

set -euo pipefail

main_path=""
path=""
branch=""
detached=0

pr_state() {
  if ! command -v gh >/dev/null 2>&1; then
    echo unknown
    return
  fi
  local state
  if ! state=$(cd "$main_path" && gh pr list --head "$1" --state all --json state --jq '.[0].state' 2>/dev/null); then
    echo unknown
    return
  fi
  case "$state" in
    MERGED) echo merged ;;
    OPEN) echo open ;;
    CLOSED) echo closed ;;
    ""|null) echo no-pr ;;
    *) echo unknown ;;
  esac
}

report() {
  local state dirty action label
  if [ "$path" = "$main_path" ]; then
    state=main
    action=-
    label=main
  elif [ "$detached" -eq 1 ] || [ -z "$branch" ]; then
    state=detached
    action=keep
    label="(detached)"
  else
    state=$(pr_state "$branch")
    label=$branch
    local count
    count=$(git -C "$path" status --porcelain --ignored --untracked-files=all | wc -l | tr -d ' ')
    if [ "$count" -eq 0 ]; then dirty=clean; else dirty=$count; fi
    if [ "$state" = merged ] && [ "$dirty" = clean ]; then
      action=cleanup
    elif [ "$state" = merged ]; then
      action=keep-dirty
    else
      action=keep
    fi
  fi
  printf '%-8s %-40s %-6s %-10s %s\n' "$state" "$label" "${dirty:--}" "$action" "$path"
}

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    worktree\ *)
      path=${line#worktree }
      if [ -z "$main_path" ]; then main_path=$path; fi
      ;;
    branch\ refs/heads/*) branch=${line#branch refs/heads/} ;;
    detached) detached=1 ;;
    "")
      if [ -n "$path" ]; then report; fi
      path=""
      branch=""
      detached=0
      ;;
  esac
done < <(git worktree list --porcelain; echo)
