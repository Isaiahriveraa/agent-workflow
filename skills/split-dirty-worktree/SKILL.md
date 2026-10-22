---
name: split-dirty-worktree
description: "Audit a dirty working tree and split it into reviewable draft PRs: group uncommitted changes into concerns, require gh stack for dependent concerns, and give independent concerns their own draft PRs off trunk. By default, propose the named branch stack, GitHub-style preview, commit messages, and line counts and stay read-only until the exact plan is approved. Autonomous mode (the user says to just split it, or already approved the work) runs end to end without the approval stop and reports the executed plan with PR URLs. Every PR opens as a draft in both modes; never merge, push to trunk, or force-push."
---

# Split a Dirty Worktree

Turn a large mixed working tree into a set of reviewable **draft** PRs. The plan you approve is the thing you would see on GitHub: the PR list, base branches, stack order, what can be reviewed in parallel, file and line counts, commit messages, and PR descriptions. Nothing is created until that exact plan is approved, unless the user chose autonomous mode.

The plan reuses the existing formats so there is one vocabulary:

- PR title, description, and the one-concern rule: `skills/pr/SKILL.md`
- Commit messages, responsibility tests, and hunk staging: `skills/commit/SKILL.md`
- Branch, worktree, stack, and transport commands: `MECHANICS.md`

Read-only until approval. Analysis never touches the index, refs, stash, files, branches, worktrees, or PR state.

## Modes

- **Approval mode** (default): run Steps 0–6, present the plan, and stop. Execute Step 7 only after the user approves that exact plan.
- **Autonomous mode**: use it when the user invokes this skill and tells you to just do it ("split it", "do it autonomously", "no need to approve"), or has already approved the split in the conversation. Run Steps 0–7 end to end without stopping for plan approval: inventory, concerns, dependency verdicts, topology, transport, a build check on each branch, push, draft PRs, and verification against the plan. Then report the plan as executed in the Step 6 shape, with each PR's URL in place of `PR <n>`. Autonomous mode skips only the approval stop; every other step, check, and stop condition still applies.
- **Both modes**: every PR is created as a draft (`gh stack submit --auto` without `--open`; `gh pr create --draft`). Never mark a PR ready for review, never merge, never push to the trunk, and never force-push.
- **Reviewer fallback**: if the environment cannot launch the `commit-pr-reviewer` subagent (or any other independent reviewer this skill or `commit`/`pr` calls for), review the plan yourself against the same checklist, and state in the report that no independent review happened. Do not report a reviewer verdict that did not happen.

## Step 0 — Read the repo's policy

Read the repo's `AGENTS.md` or `CLAUDE.md` "Commit & PR" rules first. They decide the output shape.

- **PR flow** (default): build the PR plan in Steps 2–6.
- **Solo, master-only repo** (for example this hub, whose `.claude/CLAUDE.md` says to commit straight to `master` with no branches, worktrees, or PRs): plan the same concerns as ordered commits on the current branch. The preview says `no PRs (solo repo policy)`, lists commits in landing order, and skips branch and PR fields. Commit messages still follow the `commit` skill, including its approval gate.

## Step 1 — Take inventory

Run the read-only inventory in a plain bash fence:

```bash
node ~/.agents/skills/split-dirty-worktree/inventory.mjs [--json] [--cwd <path>]
```

Read its labeled blocks in this order: `repo`, `root`, `branch`, `head`, `bases`, `worktrees`, `staged`, `unstaged`, `untracked`, `files`, `hunks`, `untracked-files`, `totals`.

- `files:` rows are `XY path +a -d hunks=n flags`: git's exact per-file added and removed lines.
- `hunks:` rows are `path#i +a -d header`: the exact lines that one hunk adds and removes. Per-hunk counts sum to the file's numbers, so a partial file's line counts are exact too.
- `untracked-files:` rows are `path bytes flags`. New files are never counted in `files:` or `totals:`, so count them separately and say so.
- Flags are only `test`, `docs`, `ci`, `config`, `lockfile`, `generated`, `local-state`, `submodule`.
- `--json` emits one object with the same stable keys and no other output.

Note mixed files (one file assigned to more than one concern), flags, staged versus unstaged work, and untracked files. Hunk indices follow `git diff HEAD -U0` order; they match `git add -p` only when that file's index entry is clean. Re-run inventory after any tree change. Never guess a diff. Use raw git output; never prefix git with `rtk`.

## Step 2 — Group the changes into concerns

A concern is one PR-sized capability or fix with one reason to exist and one reviewer story. The `pr` skill's Level 1 rule applies: one concern per PR. Inside each concern, every commit is one responsibility (the `commit` skill's Responsibility Unit).

- Group by change type, domain or scope, motivation, and revertability. Do not group merely because files were edited together.
- Keep tests with the behavior they prove. Keep docs with the change they document.
- A concern over about 500–700 changed lines is too big for one PR. Split it by layer or motivation, or report that it cannot be split safely.
- Each concern records: a one-sentence name with no "and", its files and hunks, and its `+a -d` totals. Sum whole files from `files:` and partial files from `hunks:`.
- Flag `generated`, `local-state`, `lockfile` drift, submodules, and secrets. They go under `Not committed` with a reason, never into a concern.
- Assign every untracked file to a concern or to `Not committed`. None may stay unassigned.

## Step 3 — Decide whether the concerns depend on each other

For every pair, answer each question with its concrete check:

- Does B reference a symbol, table, column, route, or file only A introduces? Grep B's added lines for A's new identifiers.
- Do A and B edit the same file? Inspect whether the hunks depend on each other; a shared file alone does not prove a dependency. The same hunk may not be separable, so report that before planning transport.
- Would B's tests fail on a tree containing B but not A? Inspect the tests and their prerequisites during read-only planning; record the isolated verification to run after approval, without creating a hypothetical branch now.
- Would a reviewer approve A without seeing B and merge A alone? Inspect A's diff and its focused verification independently.

Record one verdict per pair: `none` (independent), `ordering` (A must land before B), or `hard` (B is unusable without A). Each dependency names its direction and concrete evidence; distinguish an observed failure from one inferred from code. Dependencies between distinct concerns require stack layers. Commit ordering within one concern stays within that concern's PR.

## Step 4 — Pick the topology and review order

| Evidence | PRs | Base of each PR | Review and merge order |
|---|---|---|---|
| one concern | 1 draft PR | trunk | — |
| 2+ concerns, every pair `none` | N draft PRs | trunk for all | parallel: any order |
| any `ordering` or `hard` pair between distinct concerns | mandatory `gh stack`, one layer per concern | layer below (bottom layer: trunk) | serial, bottom-up |
| dependent clusters plus independent concerns | mandatory `gh stack` for each cluster, draft PRs for the rest | as above | each cluster serial; rest parallel |
| a pair that cannot form independently reviewable layers, or a dependency cycle | report the blocker; propose regrouping or refactoring for approval | — | — |

Rules:

- **Dependent concerns must use `gh stack`.** Do not offer parallel trunk-based PRs, separate independent worktrees, or one combined PR as an alternative merely to avoid stacking. Each lower layer must be independently reviewable; B needing A is the reason to stack, not evidence that the pair cannot be split.
- **Every stack is created with the `gh stack` CLI, always.** Never hand-chain PRs with `gh pr create --base <layer below>`, and never assemble a stack with plain `git` and call it done. If `gh stack --version` fails, stop and report it; do not fall back to manual PRs.
- Propose the branch stack before requesting approval: name the trunk, every layer's branch and base, the dependency evidence, and the bottom-up review and merge order. For multiple clusters, show a separate stack for each; show independent branches outside the stacks.
- Worktrees are for work that continues in parallel. A plan that only needs review can use sequential in-place branches (`MECHANICS.md` section A). Name the workspace in the plan: `worktree <path>` or `in place`. The hub's worktree rule (`AGENTS.md`) still applies in repos that require it.
- Branch names are `<type>/<short-description>`, lowercase, hyphenated, validated by `scripts/branch-name-rules.sh`.

## Step 5 — Plan each PR

For each PR, write:

- **Title**: a Conventional Commit title for one concern, with no "and" (`pr` skill).
- **Description**: the `pr` skill's Senior Developer PR Description Standard and template, verbatim, including its Reviewer-Facing Only rules: Rationale, Observable Behavior, Verification, about 150 words. Add `## Stack Context` only to stacked layers, in the `pr` skill's one-line format. Never add `## Files`. Plan numbers and line counts belong in this preview, never in a description.
- **Commits**: ordered, one responsibility each. Each commit carries the `commit` skill's proposal fields: Message, Purpose (one sentence), Dependency, Indivisible, Files (whole or by hunk), Diff (`+a -d`, file count), and Verification. Every hunk maps to exactly one commit.
- **PR totals**: the sum of its commits. The preview row is computed from the same numbers, never estimated by hand.

## Step 6 — Present the plan

Show the plan in this exact shape, then stop. Do not mutate Git before approval. In autonomous mode, do not stop: go to Step 7, then report the executed plan in this same shape (Step 7, item 9). Angle brackets are placeholders, and the sample numbers only show the columns. In `Base`, a stacked layer names the PR below it as `PR <n>` from this plan; before creation, never invent real GitHub numbers. The branch stack section is required whenever distinct concerns depend on each other; a topology label alone is not a proposal.

```text
SPLIT PLAN — <repo>
===================
Tree: <files> files, +<a> -<d>, <n> hunks, <u> untracked (not in totals)
Policy: PR flow | solo repo, commits only (<where the rule is>)
Topology: single PR | N parallel PRs | gh stack (<n> layers) | stack + parallel PRs
Why: <2 sentences: the dependency verdicts that decided it>

PROPOSED BRANCH STACK — bottom to top (gh stack required)
  master
    -> feat/artifact-filter (PR 1; base master)
      -> feat/artifact-api (PR 3; base feat/artifact-filter)
  Dependency: PR 3 requires PR 1 because <concrete evidence>
  Review and merge: PR 1 -> PR 3
  Independent: refactor/sidebar-nav (PR 2; base master)

GITHUB PREVIEW — every PR opens as a draft
  #  Title                                  Base      Head                    Files  +Add   -Del  Commits  Review
  1  feat(search): add artifact filtering   master    feat/artifact-filter        4   +120    -12        2  parallel
  2  refactor(sidebar): simplify nav state  master    refactor/sidebar-nav        3    +80    -40        1  parallel
  3  feat(api): expose artifact filters     PR 1      feat/artifact-api           2    +40     -0        1  after PR 1

PR 1 — feat(search): add artifact filtering
  Branch: feat/artifact-filter -> base master   Workspace: worktree ../.agents-worktrees/feat/artifact-filter
  Depends on: none
  Description:
    ## Rationale
    <pr template text>
    ## Observable Behavior
    - <line>
    ## Verification
    - `<test name>` — <behavior it locks in>
  Commits:
    1. feat(search): add artifact filter query
       Purpose: <one sentence>
       Files: path/a.ts (whole) · path/b.ts (hunks 1,3)
       Diff: +<a> -<d>, <f> files
       Verification: <command or staged-diff check>
    2. test(search): cover artifact filter edge cases
       ...

PR 2 — ...
PR 3 — ...

Not committed: <paths and why>
Execution: 1. PR 1 · 2. PR 2 · 3. PR 3   (or: stack bottom-up)
Approval covers: this exact plan, plus pushing these branches and opening these draft PRs. Nothing is marked ready for review.
commit-pr-reviewer (PR mode) must approve this exact plan before any Git state changes.
```

For a solo-repo plan, replace the preview table with the ordered commit list and drop the branch, workspace, and PR lines.
For a PR-flow plan with no dependent concerns, replace the branch stack section with `Proposed branch stack: none — concerns are independent`.

## Step 7 — Execute after approval (or at once in autonomous mode)

Read `MECHANICS.md` before transporting anything.

1. Take the safety snapshot. Verify that `git status --short` still matches the inventory you planned from. If it differs, stop and re-plan.
2. If the plan has a stack, confirm `gh stack --version` succeeds. If it does not, stop and report it.
3. Create the branches (`MECHANICS.md` section C):
   - Parallel PRs: each branch starts from the trunk (or from its base) with `git switch -c <branch> <base>`.
   - Stack: each layer starts from the layer below it, so layer 1 is `git switch -c <b1> <trunk>`, layer 2 is `git switch -c <b2> <b1>`, and so on. Transport and commit a layer before creating the next one.
   - Worktrees only when the plan says `worktree` and the branches are independent. A stack is built in place. Verify with `git worktree list`.
4. Transport each concern (`MECHANICS.md` section A or B). Verify `git diff --cached --numstat` equals the planned per-commit numbers.
5. Commit each commit with the approved message through `skills/commit/SKILL.md` Phase 2. If the staged diff does not match the approved plan, stop and return to planning.
   Before pushing, check that each branch builds on its own: run the repo's build, typecheck, or focused tests with that branch checked out. If a branch fails, stop and report it; do not push a branch that does not build.
6. Run the `pr` skill's Pre-Submit Self-Check on every body, then push and open the drafts:
   - Parallel PRs: `git push -u origin <branch>`, then `gh pr create --draft --base <base> --head <branch> --title "<title>" --body-file <file>`. Write the body file outside the repo.
   - Stack: `gh stack init --base <trunk> <b1> <b2> ...` adopts the layers bottom to top and checks out the top one. Then `gh stack view` must show no `⚠` marks, which means every layer sits on the one below it. If it shows one, stop and fix the chain before continuing. Then `gh stack submit --auto`. With `--auto`, new PRs are drafts. Never pass `--open`.
7. Verify against the preview: `gh pr list --state open --json number,title,isDraft,baseRefName,headRefName,additions,deletions,changedFiles`. Every PR must match its preview row: draft state, base, `+Add`, `-Del`, and file count. For a stack, the bottom base is the trunk and each higher base is the branch below. Report any mismatch; do not patch it silently.
8. Confirm every planned change is committed exactly once, and `git status --short` shows only the `Not committed` paths.
9. Report: the plan as executed in the Step 6 shape, each PR's URL and draft state, the build check result for each branch, any mismatch from step 7, and the reviewer verdict, or the line `No independent review: <reason>` when the reviewer fallback applied.

## Rules

- Never mutate before approval. The `commit-pr-reviewer` approval and the user's approval both come first. In autonomous mode the user's instruction is the approval; the reviewer approval (or the reviewer fallback) still comes first.
- Open drafts only, in both modes. Never pass `--open`, and never mark a PR ready for review.
- Never merge a PR, never push to the trunk, and never force-push.
- The preview numbers come from the same numstat used for execution. A plan with estimated numbers is invalid.
- Never lose work: take the snapshot before transport.
- Use exact raw git output; never use `rtk` for git or inventory.
- If the tree cannot be split safely, say so and do not force a split.
- Flag generated, local-state, and secret files; do not commit them.
