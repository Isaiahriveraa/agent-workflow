# Edge Cases

Load only when the situation applies: pre-staged index, untracked files, repo conventions, amendments, or concerns that need separate branches.

## Handling Existing Staged Changes

Existing staged changes are not automatically accepted into a plan.

Inspect them separately.

If the staged index mixes concerns:

1. explain the violation
2. show the corrected grouping
3. show the corrected plan (in commit-review, get commit-pr-reviewer approval)
4. only then unstage or restage the necessary files or hunks

Do not destroy the user’s staging intent without showing what will change.

## Handling Untracked Files

Inspect untracked files before assigning them to commits.

Classify each as:

* required source
* required test
* required documentation
* generated output
* local state
* secret or sensitive
* unrelated work
* uncertain

Do not include uncertain files until their purpose is verified.

## Handling Repository Conventions

Inspect recent commit history before choosing message style.

Follow established repository conventions when they are compatible with
atomic, understandable history.

Conventional Commits remain the default.

Repository conventions may determine:

* preferred scopes
* ticket references
* body formatting
* capitalization
* required trailers

Do not copy poor historical practices such as vague messages or mixed commits.

## Concerns That Belong On Different Branches

Responsibilities that cannot share one commit series are not always a failure: independent concerns,
or concerns where one cannot be verified without the other, need separate branches. That is a branch
decision, not a commit decision. Run `/skill:split-dirty-worktree` to inventory the dirty tree,
choose one branch vs a `gh stack` vs separate worktrees, and plan the commits per branch; then run
this workflow once per branch.

## Amendments

Do not amend an existing commit unless the user explicitly requests it.

Before amending:

1. inspect the existing commit
2. inspect the new staged changes
3. show the proposed amended result
4. in commit-review, get commit-pr-reviewer approval of the amended plan

Never amend a commit that may already be shared or pushed without warning the
user about history rewriting.

