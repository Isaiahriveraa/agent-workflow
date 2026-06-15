---
description: Refine a dirty branch into clean, stacked draft PRs with separation of concerns
---

# PR Refine — Dirty Branch → Clean Stacked Draft PRs

Take a branch with mixed, messy changes and turn it into a stack of focused,
reviewable draft PRs — each handling ONE concern, each building on the previous.

The command analyzes the diff against the base branch, groups changes by concern,
creates branches via cherry-pick, pushes them, and opens draft PRs with properly
formatted bodies via `gh` CLI. Progress is tracked in a `thoughts/pr-refine/` file
that gets updated after each PR is created.

## Usage

```
/pr-refine [dirty-branch] [base-branch]
```

- `dirty-branch` — the branch with mixed/unclean changes. Omit or pass `.` to use
  the **current branch**.
- `base-branch` — the branch to base the PR stack on (default: detected from
  `git symbolic-ref refs/remotes/origin/HEAD` or falls back to `main`).

If neither argument is given, both are inferred — the current branch as dirty
and the upstream default as base.

## Phases

### Phase 0: Quick Health Check

Before any analysis, run these to confirm the repo is clean enough to proceed:

```bash
rtk git fetch origin <base-branch>
rtk git status --short
```

If there are uncommitted changes on the current working tree, ask the user to
stash or commit them before proceeding — cherry-pick operations need a clean
working tree.

### Phase 1: Setup & Tracking File

1. **Resolve branches**
   - Dirty branch: use the argument, or detect `rtk git branch --show-current`.
   - Base branch: use the argument, or detect `rtk git symbolic-ref refs/remotes/origin/HEAD | sed 's@.*/@@'`.
   - Verify dirty branch exists: `rtk git branch --list <dirty-branch>` — fail if not found.

2. **Create tracking file** under the project root's `thoughts/pr-refine/`:
   ```bash
   mkdir -p thoughts/pr-refine
   ```
   File path: `thoughts/pr-refine/<dirty-branch>_<YYYY-MM-DD>.md`

   Write the initial structure:

   ```markdown
   # PR Refine: <dirty-branch> → <base-branch>

   **Created:** <timestamp>
   **Dirty Branch:** `<dirty-branch>`
   **Base Branch:** `<base-branch>`

   ## PR Stack

   | # | Concern | Branch | Base | Status | PR URL |
   |---|---------|--------|------|--------|--------|
   |   |         |        |      |        |        |

   ## Concern Details

   |   |         |        |      |         |       |

   ## Cherry-pick Conflicts

   _None yet._

   ## Summary

   _Completed when all PRs are created._
   ```

### Phase 2: Analysis — Understand What's in the Branch

1. **Get the full picture** — run all three in parallel:

   ```bash
   rtk git log --oneline <base-branch>..<dirty-branch>
   rtk git diff --stat <base-branch>...<dirty-branch>
   rtk git diff --name-only <base-branch>...<dirty-branch>
   ```

2. **Categorize changes by concern**

   Read through every commit message and every changed file. Group them into
   logical concern areas. Typical groupings:

   | Category | Typical files |
   |----------|--------------|
   | **Setup / Config** | `package.json`, `.env.example`, `Dockerfile`, tooling configs |
   | **Database / Schema** | Migrations, model definitions, type schemas |
   | **Backend API** | Routes, controllers, services, middleware |
   | **Frontend UI** | Components, pages, styles, assets |
   | **Business Logic** | Core feature logic, hooks, state management |
   | **Tests** | Test files, fixtures, test helpers |
   | **Refactors** | Renames, extractions, pattern consolidations |
   | **Bug fixes** | Targeted fixes found during the work |

   For each concern, determine:
   - **Commits** — which commit SHAs belong to it
   - **Primary files** — which files are affected
   - **Dependencies** — does this concern need another concern's changes first?
   - **PR title** — a clear, specific title following `/pr` style

3. **Order the PR stack**

   Sort concerns so that:
   - Dependencies come first (PR 1 has no dependencies)
   - Independent concerns can be parallelized if the user confirms
   - Each concern is a coherent unit that can be reviewed alone

   Typical ordering: `Setup → Schema → Backend → Frontend → Tests → Polish`

4. **Write the plan** to the tracking file immediately (start populating the tables):

   ```markdown
   ## PR Stack

   | # | Concern | Branch | Base | Status | PR URL |
   |---|---------|--------|------|--------|--------|
   | 1 | Setup project scaffolding | `refine/1-setup` | `main` | pending | — |
   | 2 | Add user auth backend | `refine/2-auth` | `refine/1-setup` | pending | — |
   | 3 | Build dashboard UI | `refine/3-dashboard` | `refine/2-auth` | pending | — |

   ## Concern Details

   ### PR 1: Setup project scaffolding
   - **Branch:** `refine/1-setup`
   - **Base:** `<base-branch>`
   - **Commits:** `abc123`, `def456`
   - **Files:** `package.json`, `tsconfig.json`, `.eslintrc.js`
   - **Status:** pending

   ### PR 2: Add user auth backend
   - **Branch:** `refine/2-auth`
   - **Base:** `refine/1-setup`
   - **Commits:** `ghi789`, `jkl012`
   - **Files:** `src/middleware/auth.ts`, `src/routes/login.ts`, `src/routes/register.ts`
   - **Status:** pending
   ```

### Phase 3: Create Each PR

For each PR in the planned order (1 through N):

#### Step 3.1: Create the branch

```bash
# If PR #1: start from the clean base branch
rtk git checkout origin/<base-branch>
rtk git checkout -b <new-branch>

# If PR #N (N>1): start from the previous PR's branch
rtk git checkout <previous-PR-branch>
rtk git checkout -b <new-branch>
```

#### Step 3.2: Cherry-pick the commits

```bash
rtk git cherry-pick <sha1> <sha2> ...
```

**If a cherry-pick conflicts:**

1. Identify conflicted files: `rtk git diff --name-only --diff-filter=U`
2. For each conflict, resolve by keeping ONLY the changes that belong to THIS concern:
   - Open the conflicted file(s) and resolve the conflict markers
   - Discard any changes that belong to other concerns
3. Stage and continue:
   ```bash
   rtk git add <resolved-files>
   rtk git cherry-pick --continue
   # Write a clean commit message (keep the original)
   ```
4. Log the conflict in the tracking file:
   ```
   ### Cherry-pick Conflicts

   - **Branch:** `refine/2-auth`
   - **Commit:** `ghi789`
   - **File:** `src/middleware/auth.ts`
   - **Resolution:** took auth-related changes, omitted unrelated helper additions
   ```
5. If a commit is too entangled to split cleanly → skip it with `rtk git cherry-pick --abort`.
   Note in the tracking file:
   ```
   - **Skipped:** commit `xyz123` (too entangled with other concerns)
   ```

#### Step 3.3: Push the branch

```bash
rtk git push origin <new-branch>
```

#### Step 3.4: Write the PR body

Generate a PR description following the `/pr` command style. Size it to the
actual diff in THIS branch against its base (not the original dirty branch).

**Rules for the PR body:**
- Describe ONLY what's in this branch's diff. Nothing else.
- Match the size to the diff:
  - `small` (1-2 files): `Summary` + `Changes` + `Tests & Validation` + `Risks`
  - `medium` (3-8 files): same + `Rationale` if needed
  - `large` (9+ files): same + grouped changes by area
- No mention of the dirty branch or the split process.
- No "this is part of a larger change" framing.
- No AI attribution, no generated-by footers.
- Keep it professional, direct, and scoped to this concern only.

**PR template (trim sections as needed by size):**

```markdown
## Summary

[1-2 sentences describing what this PR does — specific to this concern]

## Rationale
[Only if the "why" isn't obvious from the summary. 1-3 lines max.]

## Changes

- [Bullet list of changes — grouped by area for large PRs]

## Tests & Validation

- [What checks were run]

## Risks

[Low or concrete risk note]
```

#### Step 3.5: Create the draft PR

```bash
gh pr create \
  --draft \
  --base <parent-branch> \
  --head <new-branch> \
  --title "<PR title>" \
  --body "<PR body>"
```

Capture the PR URL from the output.

#### Step 3.6: Update the tracking file

Update the tracking file's `PR Stack` table:
- Change Status from `pending` to `draft` ✅
- Add the PR URL

If there were conflicts, also update the Cherry-pick Conflicts section.

Commit and push the tracking file update:

```bash
rtk git add thoughts/pr-refine/<file>
rtk git commit -m "pr-refine: PR #<N> <concern> created"
# Push to origin. If working on the dirty branch, push that:
rtk git push origin <dirty-branch> 2>/dev/null || true
```

Go to the next PR in the stack and repeat from Step 3.1.

### Phase 4: Summary

After ALL PRs are created:

1. **Finalize the tracking file** — fill in the Summary section:

   ```markdown
   ## Summary

   **Status:** Complete ✅
   **PRs Created:** <N>
   **Cherry-pick Conflicts:** <N>
   **Skipped Commits:** <N>

   | # | PR | Branch | Base | Status |
   |---|----|--------|------|--------|
   | 1 | [<title>](<url>) | `refine/1-...` | `<base-branch>` | draft ✅ |
   | 2 | [<title>](<url>) | `refine/2-...` | `refine/1-...` | draft ✅ |
   ```

2. **Commit the final tracking file update**:

   ```bash
   rtk git add thoughts/pr-refine/<file>
   rtk git commit -m "pr-refine: complete — <N> draft PRs created"
   rtk git push origin <dirty-branch> 2>/dev/null || true
   ```

3. **Print the summary to the user** in this exact format:

   ```text
   ✅ PR Refine Complete

   Dirty branch:  <dirty-branch>
   Base branch:   <base-branch>
   Total PRs:     <N>

   PR Stack:
   1. [<title>](<url>)  ← <base-branch>
   2. [<title>](<url>)  ← <refine/1-...>
   3. [<title>](<url>)  ← <refine/2-...>
   ...

   Merge order: PR #1 → PR #2 → ... → PR #N

   Tracking file: <absolute-path-to-tracking-file>

   All PRs are drafts. Review each before merging.
   ```

4. **Print the merge instructions**:

   ```text
   Review the PRs in order (1 → N). Each PR targets the previous one's branch.
   Merge PR #1 first, then PR #2, etc. After all are merged, delete the
   refine/ branches and the dirty branch.
   ```

## Cherry-pick Conflict Resolution Guide

When conflicts arise during cherry-pick:

1. **Assess scope**: `rtk git diff --name-only --diff-filter=U` lists conflicted files.
2. **For each file**: decide which changes belong to THIS concern vs. other concerns.
   - Concern's changes → keep
   - Other concerns' changes → discard (they'll be picked up in their own PR)
3. **Resolve**: edit the file, remove conflict markers, keep only this concern's changes.
4. **Stage & continue**:
   ```bash
   rtk git add <file>
   rtk git cherry-pick --continue
   ```
5. **Log**: add a row to the tracking file's Cherry-pick Conflicts section.
6. **If unresolvable**: `rtk git cherry-pick --abort`, skip the commit, log it,
   and proceed. The skipped commit's changes will need to be manually added to
   their correct PR.

## Rules

### MUST DO
- Always create PRs as DRAFTS — `--draft` flag is mandatory.
- Stack PRs: each subsequent PR targets the previous one's branch.
- PR #1 always targets the base branch directly.
- Use `rtk` prefix on git commands.
- Use `gh` CLI for PR creation — never the browser.
- Update the tracking file after EVERY PR created.
- Size the PR body to match the actual diff in THAT branch only.
- Make each PR body specific to its concern — no "part of a larger change" framing.
- Branch naming: `refine/N-<kebab-description>` (e.g., `refine/1-setup`, `refine/2-auth`).
- Commit the tracking file after each PR and at the end.

### MUST NOT DO
- Never create PRs as public — always drafts.
- Never include changes from other concerns in a PR.
- Never force push to any branch.
- Never delete branches automatically.
- Never use `git merge` to bring in dirty branch changes — always cherry-pick.
- Never mention the dirty branch or the split process in the PR body.
- Never modify files outside the project.
- Never push to `origin/main` or `origin/master` directly.
- Never run interactive rebase or amend commits on shared branches.

## Failure Recovery

### If a cherry-pick fails repeatedly:

1. `rtk git cherry-pick --abort`
2. Skip the commit. Log it in the tracking file under Cherry-pick Conflicts as "skipped."
3. Move on to the next commit for this concern.
4. At the end, inform the user: "Commit <sha> was skipped — it was too entangled.
   You'll need to manually port its changes."

### If a `gh pr create` fails:

1. Check `gh auth status` is valid.
2. Ensure the branch is pushed: `rtk git push origin <branch>`.
3. Retry the `gh pr create` command.
4. If still failing, log the error in tracking file and continue.
   The PR can be created manually from the branch later.

### If a concern has zero commits after cherry-picking (all skipped):

1. Skip creating a PR for it.
2. Note in the tracking file: "PR <N> skipped — all commits were too entangled."
3. Re-sequence the remaining PRs.

## Verification Checklist

Before declaring the command complete, verify:

- [ ] All PRs are verified as drafts: `rtk gh pr list --head <branch> --json state,url` for each branch
- [ ] Each PR's base branch is correct (previous PR's branch or base-branch)
- [ ] PR bodies are non-empty and concern-specific
- [ ] Tracking file has all PR URLs and statuses
- [ ] Tracking file is committed to the dirty branch
- [ ] No extraneous files committed on refine/ branches
