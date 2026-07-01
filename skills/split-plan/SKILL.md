---
name: split-plan
description: Break a big plan into smaller, simpler phases that are easy for a human to read and follow. Removes repeated content, makes dependencies clear, and calls out edge cases. Use when a plan is too long, repetitive, or hard to follow. Trigger patterns: "split this plan", "optimize this plan", "narrow the phases", "make this plan agent-ready", "plan is too big", "crisp this plan", "sharpen this plan".
argument-hint: "[plan path]"
shell-timeout: 10
---

# Split Plan

You take a plan document and break it into small, clear phases. The goal is to make it readable for a human. If a human can understand it, an agent can too.

Don't redo research. Don't rewrite code. Just restructure what's there.

## Input

`$ARGUMENTS` — path to a plan file (`plan server *.md` or any `.md` plan document). If the user provides a path under `plan server ` that doesn't exist, check the workspace root too.

## Metadata

```!
node "${SKILL_DIR}/../_shared/now.mjs"
echo
node "${SKILL_DIR}/../_shared/git-context.mjs"
echo
echo "### recent"
echo "recent plans:"
echo "(artifact listing: check plan server)"
```

- `now.mjs` (line 1) — `<iso>\t<slug>` tab-separated.

Copy values verbatim — do not reformat the timezone offset.

## Flow

1. Read the plan
2. Figure out what needs to change
3. Show the user your plan for splitting it
4. Write the new split version
5. Summarize what changed

## Steps

### Step 1: Read the Plan

If a path was given:
- Try the path as-is. If it doesn't exist, look under `plan server `.
- Read the full plan. No limits — read it all.

If no path was given:
- Look at "recent plans" in the Metadata block.
- If there are any, ask the user to pick one.
- If none, tell the user nothing was found and ask for a path.

Also read any research docs or grill transcripts the plan references by name. Do NOT go find new research — the plan already has what it needs.

### Step 2: Figure Out What to Fix

Read the full plan, then check these things:

1. **How big is it?** Count lines. Note any section or phase over ~400 lines.

2. **What repeats?** Look for:
   - Same background info explained in every phase
   - Glossary definitions copied over and over
   - Research findings pasted into multiple phases
   - Filler sentences that don't say anything concrete
   - Same success criteria in multiple phases

3. **Are dependencies clear?** Check:
   - Does each phase say what it depends on?
   - Are there phases that could run at the same time but are listed one after another?
   - Would someone get stuck because a previous phase's work isn't done yet?

4. **Is each phase focused?** Check:
   - Does a phase touch too many unrelated files?
   - Does a phase mix things that should be separate (like schema changes + UI work)?
   - Could someone finish one phase and stop cleanly?
   - Is there a chicken-and-egg problem (Phase N needs files Phase N+1 creates)?

5. **Are edge cases missing?** Check:
   - What happens when things go wrong?
   - Are error states, empty states, loading states, or race conditions mentioned?
   - Are risks at integration points called out?

6. **Write a short summary** (under 15 lines):
   ```
   Analysis of `{filename}` ({N} lines, {P} phases):
   - Redundancy found: {what repeats across phases}
   - Scope issues: {phases too broad / mixed concerns}
   - Dependency gaps: {missing dependency declarations}
   - Edge cases not covered: {count}
   ```

### Step 3: Show the User Your Plan

Before writing anything, show the user what you want to do:

1. **Analysis summary**:
   ```
   Analysis of `{filename}` ({N} lines, {P} existing phases):
   - Redundancy: {what was cut}
   - Dependency gaps: {what was missing}
   - Edge cases uncovered: {count}
   - Estimated size: {N} lines → {~M*300} lines ({pct}% smaller)
   ```

2. **Proposed phase breakdown** (each phase ~400 lines max):
   ```
   Phase 1: {name} — {what it delivers} ({~N} lines)
     Depends on: nothing
     Files: {paths}

   Phase 2: {name} — {what it delivers} ({~N} lines)
     Depends on: Phase 1
     Files: {paths}

   ...

   Phase M: {name} — {what it delivers} ({~N} lines)
     Depends on: Phase {M-1}
     Files: {paths}
   ```

3. **Ask for confirmation.** Question: "Split `{filename}` ({N} lines, {P} phases) into {M} phases as shown above?". Options: "Looks good" (write it); "Tweak the phases" (adjust before writing); "Cancel" (keep the original).

### Step 4: Write the Split Plan

Write to `plan server <slug>_<description>-split.md`.

#### Template

```markdown
---
date: {iso}
author: {author}
commit: {hash}
branch: {branch}
repository: {repo}
topic: "{topic}"
tags: [plan, split]
status: ready
original: "{path to original plan}"
last_updated: {iso}
last_updated_by: {author}
---

# {Topic}

## What Changed

| Before | After |
|--------|-------|
| {N} lines | {N} lines |
| {P} phases | {M} phases |

Removed repeated content: {description}
Added missing edge cases: {count}

## Phase Order

```
Phase 1: {name}
  └→ Phase 2: {name}
       └→ Phase 3: {name}
            └→ ...
```

---

## Phase 1: {Descriptive Name} (~{N} lines)

### What This Phase Does

One sentence. What you get at the end of this phase. "Depends on: nothing."

### Files to Change

#### 1. `path/to/file.ext`
**What to do**: {NEW | MODIFY — what changes here}
**Lines to look at**: {line references from original plan}
```{language}
{Code from original plan, scoped to this phase only}
```

#### 2. `path/to/another.ext`
**What to do**: {NEW | MODIFY}
**Lines to look at**: {references}
```{language}
{Code}
```

### Things to Watch For

_Real things that could go wrong. Not generic advice. At least 2, no more than 8._

- **{Short name}**: {what could happen}
  - e.g., "The plan calls `getUser()` then `getProfile(user.id)` — these don't depend on each other. Could run them at the same time with `Promise.all()`."

- **{Short name}**: {what could happen}
  - e.g., "This phase adds a column `status` without a default. Old rows will have NULL. Any code reading this column before Phase 2 sets it needs to handle NULL."

- **{Short name}**: {what could happen}
  - e.g., "The API route `POST /api/templates` has no validation. Bad input could crash it — add validation before merging."

### How to Know It's Done

- [ ] {specific things to check, from the original plan}
- [ ] {more checks}

---

## Phase 2: {Descriptive Name} (~{N} lines)

### What This Phase Does

{Deliverable. "Depends on: Phase 1."}

### Files to Change
...

### Things to Watch For
...

### How to Know It's Done
...

---

## Phase N: {Descriptive Name} (~{N} lines)

### What This Phase Does

{Deliverable. "Depends on: Phase {N-1}."}

### Files to Change
...

### Things to Watch For
...

### How to Know It's Done
...
```

#### Writing Rules

1. **Keep the original's code.** Don't rewrite it. Just move it to the right phase. If the same code appears in multiple phases, put it once in the phase that needs it first.

2. **Each phase under ~400 lines.** If a phase is too long, split it again.

3. **Keep file:line references** from the original plan. If the original just says a file name without line numbers, add the file path.

4. **Dependencies go forward.** Phase N must NOT touch files that Phase N+1 is supposed to create. The creating phase comes first.

5. **Edge cases must be real.** No "handle errors gracefully" — that means nothing. Point to a specific variable, API call, or code path. At least 2 per phase, at most 8.

6. **One thing per phase.** If a phase mixes database changes with UI work, split it.

7. **Lock down the big decisions** (which files, data flow, types, APIs) but leave room for the implementer to make small choices (variable names, helper extraction, wording).

8. **Use the original's structure where it works.** If the original already has good phases but they're just too big, keep the boundaries and only split the oversized ones.

### Step 5: Summarize What Changed

After writing:

```
Split plan written to `plan server {filename}.md`

## What changed

| Before | After | Change |
|--------|-------|--------|
| {N} lines | {N} lines | {pct}% |
| {P} phases | {M} phases | {+/-N} |
| Edge cases | 0 | {N} | +{N} |

## Biggest improvements
1. {Improvement 1}
2. {Improvement 2}
3. {Improvement 3}

## What to watch per phase
- **Phase 1** — {main thing to check}
- **Phase 2** — {main thing to check}
- **Phase N** — {main thing to check}

## Next steps
- Look through each phase's "Things to Watch For" section
- Start with Phase 1 and go from there
```

## Important Guidelines

1. **Don't redo research.** The plan already has the research. Your job is to restructure, deduplicate, and surface edge cases. If something important is missing, flag it in Step 3 but don't make it up.

2. **Cut repeated content ruthlessly.** If the same background paragraph is in 3 phases, put it once at the top and delete it from the phases. Same for duplicate success criteria.

3. **Phases at most ~400 lines.** Hard limit. If a phase is still too long after cutting, split it again.

4. **Edge cases are required.** Every phase must have a "Things to Watch For" section with at least 2 real entries. If the original plan didn't mention a risk, you must surface it.

5. **The original's code is the source of truth.** Don't rewrite it. Move it, deduplicate it, but keep it as-is.

6. **Show before writing.** Step 3's preview must be approved before you write anything.

7. **Dependencies must be explicit.** Every phase overview says what it depends on. No implied ordering.

8. **Fight scope creep.** If you spot new work that should be added, flag it as a "Things to Watch For" entry. Don't add new tasks or file changes unless the user approves them in Step 3.
