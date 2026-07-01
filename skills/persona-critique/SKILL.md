---
name: persona-critique
description: >
  Multi-lens code critique that decomposes a git diff into logical areas,
  invents a specialized persona for each area, and dispatches them in
  parallel. The main agent owns the full context — each persona only sees
  their assigned slice through their unique lens. Findings are synthesized
  into a structured report with actionable recommendations.
  Use when the user asks to "critique with personas", "multi-lens review",
  "squad review", "perspective review", "review with different lenses",
  "invent reviewers", or any variation.
---

# Persona Critique

Decompose the diff into logical areas. Invent a persona for each. Dispatch in parallel. Synthesize.

---

## Flow Overview

```
                 ┌─────────────────┐
                 │  Gather Context  │
                 │  (full git diff) │
                 └────────┬────────┘
                          │
                          ▼
                 ┌───────────────────────────┐
                 │  Decompose Diff into Areas │
                 │  (by file, concern, layer) │
                 └────────┬──────────────────┘
                          │
                          ▼
                 ┌───────────────────────────┐
                 │  Map Area → Persona        │
                 │  (invent 1 lens per area)  │
                 └────────┬──────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Persona A │ │Persona B │ │Persona C │  ← each assigned their area
        │area 1    │ │area 2    │ │area 3    │     only
        └────┬─────┘ └────┬─────┘ └────┬─────┘
              │           │           │
              └───────────┼───────────┘
                          ▼
                 ┌─────────────────┐
                 │   Synthesize    │
                 │  (stitch areas) │
                 └────────┬────────┘
                          ▼
                 ┌─────────────────┐
                 │   Report Out    │
                 │ (fix/don't fix) │
                 └─────────────────┘
```

---

## Step 1: Gather Context (Main Agent)

### 1.1 Determine Scope

| User says... | Scope |
|---|---|
| "critique staged" | `git diff --cached` (staged only) |
| "critique working" | `git diff` (unstaged only) |
| "critique commit" | `git show HEAD` (last commit) |
| "critique commit <hash>" | `git show <hash>` |
| "critique branch" | diff vs default branch |
| nothing specified | `git diff HEAD` (all tracked changes vs HEAD) |

If scope is ambiguous, ask the user.

### 1.2 Gather Artifacts

Run ALL in parallel:

```bash
git status
git diff HEAD --stat                    # file summary
git diff HEAD -U20 > /tmp/persona-critique.diff   # full patch
git log --oneline -10                   # recent commits
```

Adjust diff commands for narrowed scope. Always write patch to `/tmp/persona-critique.diff`.

### 1.3 Read Changed Files (Main Agent Owns This)

Read every changed file in **full**. The main agent must understand the entire diff deeply — this is what lets you decompose well. Skip generated files, lockfiles, binaries.

### 1.4 Read Codebase Guidance

If the project has convention files, read them:
- `AGENTS.md`, `.claude/CLAUDE.md`, project guidelines, `CONTRIBUTING.md`

---

## Step 2: Decompose Diff Into Areas + Assign Personas

This is the core orchestration step. The main agent has read everything. Now:

1. **Decompose** the diff into logical areas
2. **Invent a persona** for each area whose lens fits that specific code

### 2.1 Find the Areas

Scan the changed files and ask: **what are the distinct logical units of change here?**
Areas can be split by file, by concern, or by layer — whatever makes the most sense.

Good splits:
- **By file** — each file gets its own persona when files are independent (e.g., `auth.ts` → Security Reviewer, `styles.css` → UI/UX Designer)
- **By concern** — when one file touches multiple concerns (e.g., a route handler that does auth + DB query + response formatting → split by concern within the file)
- **By layer** — frontend vs backend vs data layer for cross-stack changes

Bad splits:
- Splitting a single logical change across multiple personas (they'll overlap and contradict)
- Creating more areas than personas (every area needs its own lens)

**Rule of thumb**: 2-5 areas. Less than 2 and you should just do a single review yourself.
More than 5 and the synthesis gets noisy.

### 2.2 For Each Area, Invent a Persona

For each area, invent **one persona** whose expertise matches that area's code.
The persona is the lens through which that specific code will be critiqued.

Each persona needs:

| Element | Description |
|---------|-------------|
| **Name** | A memorable role title (e.g., "Async Sanity Inspector", "Data Integrity Skeptic") |
| **Identity** | Who they are — their expertise, experience, and attitude (1-2 sentences) |
| **Assigned Area** | The specific file(s) or code section they're reviewing |
| **Lens** | What specific aspects of THEIR area they should scrutinize |
| **Why This Match** | Why THIS persona's perspective is the right one for THIS area |

**Rules for inventing personas:**

1. **Match the area's code.** If the area is a DB migration, invent "Migration Reversibility Inspector." If it's an event handler, invent "Race Condition Hunter." Let the code dictate the lens.
2. **Each persona is unique.** No two personas review the same area or lens.
3. **Be creative.** The value is surprising angles. "DOM Event Propagation Auditor" will find things "Senior SWE" would miss.
4. **2-5 personas.** One per area. Never more personas than areas.

### 2.3 Example Persona Templates (Reference Only)

These examples show the *shape* of a good persona-area match. **Inventing fresh ones for your specific areas is preferred.**

| Persona | Lens | When to Assign |
|---------|------|----------------|
| **Senior SWE** | Code quality, readability, SOLID, naming, structure | Catch-all for any code area — good default if nothing more specific fits |
| **UI/UX Designer** | Spacing, layout, visual consistency, a11y | CSS, components, templates, HTML |
| **Codebase Conventions** | AGENTS.md enforcement, project patterns | Any area — checks consistency |
| **Performance & Smells** | Latency, N+1, code smells, refactoring | Logic-heavy, loops, queries, renders |
| **Security Reviewer** | Vulnerabilities, auth, input validation | API endpoints, auth, user input, secrets |
| **Data Integrity Auditor** | Data model correctness, migration safety | Schema changes, DB migrations, model files |
| **Error Path Analyst** | Error handling, edge cases, defensive coding | Areas adding new logic paths |
| **API Consumer Advocate** | API ergonomics, breaking changes, backwards compat | Public API, routes, interfaces |
| **Testing Skeptic** | Test quality, coverage gaps, tautological tests | Test files |
| **Dependency Watchdog** | New deps, version bumps, lockfile changes | package.json, Cargo.toml, etc. |

### 2.4 Map Your Areas → Personas

Write down the mapping before dispatching:

```
Diff Areas:
1. Area: {files / concern}
   → Persona: {name} — {why this lens fits}

2. Area: {files / concern}
   → Persona: {name} — {why this lens fits}

3. Area: {files / concern}
   → Persona: {name} — {why this lens fits}
```

### 2.5 Worked Example

**Diff**: Four files changed — a Prisma schema migration (new `status` enum), an API route
that queries by that status, a UI component showing status badges, and the test file.

**Decomposition**:

```
1. Area: prisma/schema.prisma (+ migration SQL)
   → Persona: Migration Reversibility Inspector
   — checks rollback path, default values, additive vs breaking change

2. Area: api/routes/list.ts (query logic with new status filter)
   → Persona: Query Path Analyst
   — checks index usage, unknown status handling, pagination correctness

3. Area: components/StatusBadge.tsx (new component for status display)
   → Persona: Visual Consistency Auditor
   — checks color usage, spacing, empty state, loading state

4. Area: tests/api/list.test.ts (new tests for the filter)
   → Persona: Testing Skeptic
   — checks if tests actually test the behavior, not just the happy path
```

### 2.6 Bail-Out

If diff is empty or only generated/whitespace changes → print "No meaningful changes to critique" and STOP.

If only 1 meaningful area → do the critique yourself without spawning agents.

---

## Step 3: Dispatch Persona Agents

### 3.1 Build Each Persona Prompt

For each area-persona pair from Step 2, build a targeted prompt. Each persona gets:

1. **PERSONA IDENTITY** — Name, attitude, expertise (from your invention)
2. **ASSIGNED AREA** — The specific file(s) or code section they own. Explicit scope boundary.
3. **TASK** — Review only THEIR area. They don't see the rest of the diff.
4. **CRITIQUE LENS** — The specific questions they should ask about their area
5. **CONTEXT** — Their area's code (inlined or patch excerpt), relevant conventions
6. **MUST DO / MUST NOT DO** — Behavioral guardrails
7. **OUTPUT FORMAT** — Structured findings with severity

**Critical**: Each persona only sees their assigned area. The main agent owns the full picture.
Do NOT show them the full diff — only their slice.

### 3.2 Dispatch in Parallel

Dispatch ALL persona agents in **parallel** using `task()` calls with
`run_in_background=true` and `category="unspecified-high"`.

### 3.3 Structural Reference: Building a Persona Prompt

Use this structure. Customize every field for the specific persona and area.

```
PERSONA IDENTITY: {Name} — {who they are, 1-2 sentences}

ASSIGNED AREA:
{file paths and specific code sections they're reviewing}
{key lines or functions of interest}

TASK:
Review ONLY the code in your assigned area. Do NOT look at files outside this scope.

CRITIQUE LENS:
{3-10 specific questions tailored to what this code does and what could go wrong}

CONTEXT:
- Area files: {paths}
- Relevant conventions from project: {excerpts}
- What this code is supposed to do: {brief intent}

MUST DO:
- Read the actual files in your area
- Cite exact file:line for every finding
- Rate: 🔴 BLOCKER | 🟡 IMPORTANT | 🔵 NIT | 💭 QUESTION
- Return findings grouped by severity

MUST NOT DO:
- Do NOT review files outside your assigned area
- Do NOT rewrite the code — critique only
- Do NOT invent problems
- Do NOT comment on formatting/linting

OUTPUT FORMAT:
## {Persona Name}

### 🔴 BLOCKER
- `file:line` — problem. Why it's a blocker.

### 🟡 IMPORTANT
- `file:line` — problem. Why it matters.

### 🔵 NIT
- `file:line` — minor suggestion.

### 💭 QUESTION
- `file:line` — unclear intent.

### 📊 Summary
- Files reviewed: N
- Issues found: N
- Verdict: CLEAN / MINOR / NEEDS CHANGES
```

---

## Step 4: Wait for All Persona Agents

Collect results from all background tasks. If an agent fails or times out, note the gap.

Minimum viable: if fewer than 2 personas succeeded, report failure and retry.

---

## Step 5: Synthesize (Main Agent)

### 5.1 Stitch the Areas

Since each persona reviewed a different area, there's no dedup to do — but there ARE
cross-cutting signals to detect:

1. **Cross-area contradictions** — e.g., "Query Path Analyst" says the API accepts `status=all`,
   "Data Integrity Auditor" says the enum has no `all` value. Both are right, they conflict.
2. **Gaps between areas** — code that no persona was assigned to (if any)
3. **Consensus** — multiple personas independently flagging related issues in connected areas
   (e.g., both "Migration Reversibility Inspector" and "Query Path Analyst" note the status
   enum is unclear)

### 5.2 Build the Executive Summary

**What to Fix (and Why):**
- For each 🔴 BLOCKER: what, where, why, which persona flagged it
- For each 🟡 IMPORTANT: what, where, why, which persona flagged it
- Cross-area conflicts found

**What NOT to Fix (and Why):**
- False positives
- Acceptable tradeoffs
- Intentional by design

### 5.3 Persona Coverage Map

Check if every changed file was covered by at least one persona. If not, call out the gap.

---

## Step 6: Report

Write the final report:

```
# Persona Critique — {project_slug} — {date}

## Executive Summary

{2-3 sentence overview}

**Files Reviewed**: N across N files
**Areas Decomposed**: N
**Personas Dispatched**: {list}
**Coverage**: {all files covered | gap: files X,Y not reviewed}
**Verdict**: APPROVED / NEEDS CHANGES / CRITICAL

---

## What To Fix

### 🔴 Must Fix
{findings with explanations}

### 🟡 Should Fix
{findings with explanations}

---

## What NOT To Fix
{findings dismissed with rationale}

---

## Area-by-Area Breakdown

### Area 1: {description}
**Persona**: {name}
{summary of their findings}

### Area 2: {description}
**Persona**: {name}
{summary of their findings}
...

---

## Cross-Area Signals
{contradictions, gaps, or consensus across areas}
```

Use caveman mode to present the summary — terse, direct, no filler.

---

## Edge Cases

| Situation | Handling |
|-----------|----------|
| Empty diff | Bail: "No changes to critique" |
| Only generated files | Skip, report that |
| Huge diff (50+ files) | Group into ~5 coarse areas by concern, not file |
| 1 meaningful area | Do the critique yourself, skip spawning |
| Agent timeout | Note gap, continue |
| Coverage gap (files not assigned) | Note in report |
| All agents return clean | "LGTM. Clean diff — ship it." |

---

## Integration Notes

- This skill decomposes by **area** and assigns specialized personas — unlike `code-critique` (single agent, all lenses) or `code-review` (heavy orchestration, wave-based). Each fills a different niche.
