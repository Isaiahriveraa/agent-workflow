#!/usr/bin/env bash
# branch-name-rules.sh — branch-name convention shared by the worktree scripts.
#
# New branches follow GitHub style: <type>/<short-description>, where the
# description is lowercase words joined by hyphens:
#   feat/shop-catalog   fix/session-secret-per-env   prototype/checkout
# The type says what kind of change it is; the description names the single
# concern the branch delivers. Dates and process words (production, plan, ...)
# are rejected — but a script whose domain legitimately uses such words (IUGA
# deployment environments) can override BRANCH_NAME_BANNED_WORDS after sourcing.
# Deliberate exceptions: WORKTREE_SKIP_NAME_CHECK=1 prints a warning and continues.

BRANCH_NAME_TYPES='feat|fix|chore|docs|refactor|test|ci|build|perf|style|prototype|review|merge'
BRANCH_NAME_BANNED_WORDS='production|prod|staging|sandbox|prototype|plan'

# validate_new_branch_name <branch>
# @behavior rejects names that don't follow <type>/<short-description>;
#           WORKTREE_SKIP_NAME_CHECK=1 downgrades the rejection to a warning
# @returns 0 when allowed (with a warning when overridden); 1 when rejected
validate_new_branch_name() {
  local branch="$1" type desc problem=''

  if [[ "$branch" != */* ]]; then
    problem='no type prefix — expected <type>/<short-description>'
  else
    type="${branch%%/*}"
    desc="${branch#*/}"
    if [[ "$branch" == */*/* ]]; then
      problem="more than one '/' — expected a single <type>/<short-description>"
    elif [[ ! "$type" =~ ^($BRANCH_NAME_TYPES)$ ]]; then
      problem="unknown type '$type'"
    elif [[ ! "$desc" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
      problem="description '$desc' is not lowercase words joined by hyphens"
    elif [[ "$desc" =~ [0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
      problem="description '$desc' contains a date"
    elif [[ "$desc" =~ (^|-)($BRANCH_NAME_BANNED_WORDS)(-|$) ]]; then
      problem="description '$desc' contains '${BASH_REMATCH[2]}' — name the change, not a process or lifecycle word"
    fi
  fi

  [ -n "$problem" ] || return 0

  if [ "${WORKTREE_SKIP_NAME_CHECK:-0}" = '1' ]; then
    echo "WARNING: unconventional branch name '$branch' allowed by override: $problem" >&2
    return 0
  fi

  {
    echo "ERROR: branch name '$branch' doesn't follow the convention: $problem"
    echo '       Format: <type>/<short-description> — lowercase words joined by hyphens, e.g.'
    echo '         feat/shop-catalog   fix/session-secret-per-env   prototype/checkout'
    echo "       Types: ${BRANCH_NAME_TYPES//|/ }"
    echo '       Deliberate exception: rerun with WORKTREE_SKIP_NAME_CHECK=1'
  } >&2
  return 1
}
