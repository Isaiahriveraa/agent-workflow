---
name: enforce
description: "Read hub AGENTS.md and enforce its rules on the current project using spawn protocol"
---

# Enforce

Read `~/.agents/AGENTS.md` (the hub's master operating contract), extract its operating rules, and use the `skill(name="spawn")` protocol to enforce them on the current project — contract documentation (rule 8), code smell cleanup, convention conformance, and any other policies defined in that file. Not a project-local AGENTS.md — the hub file is the single source of truth.

---

## Purpose

`skill(name="enforce")` bridges hub policy (what `~/.agents/AGENTS.md` says) with project execution (making it real). Instead of manually auditing files, it reads the master rules from the hub, then decomposes the current project's codebase into parallel sub-agents that each enforce the rules on their assigned scope.

---

## When To Use This Skill

| Use enforce | Don't enforce |
|---|---|
| After adding new rules to AGENTS.md | On a codebase with no AGENTS.md |
| Before a major review or release | For a single file — just edit it |
| When code has drifted from conventions | When you're mid-implementation |
| Onboarding a new project into the workflow | On generated or vendored code |
| Periodic cleanup pass | Rules are already being followed |

---

## Workflow

### Step 1 — Read ~/.agents/AGENTS.md

Read `~/.agents/AGENTS.md`. Always the hub file — never a project-local copy.

Extract the operating rules (the numbered list under `## Operating Rules`) and principles (under `## Operating Principles`). These are the **enforcement specification**.

### Step 2 — Map the Codebase

Scan the project's source directories. Identify which files are in scope:
- Source files only (skip `node_modules/`, `.git/`, `build/`, `dist/`, `.venv/`, etc.)
- Group files by natural module/directory boundaries
- Each group should be a **coherent unit** — one module, one layer, one concern

### Step 3 — Decompose into Sub-Agent Tasks

For each module group, create one sub-agent task. The tasks are:
- **Fully independent** — no sub-agent depends on another's output
- **Bounded** — each covers a manageable number of files (5-15 files per agent)
- **Self-contained** — each has the full AGENTS.md ruleset and its file list

### Step 4 — Spawn (via spawn skill)

Each sub-agent gets a prompt structured like this, using the spawn skill's 7-section format:

```
──────────────────────────────────────────────
SUB-AGENT: enforce-rules-[module-name]
──────────────────────────────────────────────

1. TASK
Enforce the operating rules from AGENTS.md on the assigned files.
Do not modify behavior — only fix documentation, comments, and code smells.

2. EXPECTED OUTPUT
All assigned files updated to conform to the rules in AGENTS.md.

3. CONTEXT
Project root: [path]
AGENTS.md rules (full text):
[extracted rules — contract docs (rule 8), inline comments, error handling,
 no type suppressions, code smell cleanup, etc.]

Assigned files:
[file1, file2, file3, ...]

4. MUST DO
- Read each file before editing
- Document contract-bearing functions with the rule-8 block template; short why-comments on non-obvious logic
- Add inline comments for non-obvious logic
- Remove dead code, stale comments, leftover scaffolding
- Fix any rule violations you find
- Only touch what needs changing

5. MUST NOT DO
- Do not change behavior, logic, or functionality
- Do not refactor beyond what's needed to fix rule violations
- Do not touch files outside your assigned list
- Do not add new dependencies
- Do not leave TODO or placeholder comments

6. DONE WHEN
- All assigned files conform to AGENTS.md rules
- Contract-bearing functions documented per rule 8; no boilerplate elsewhere
- No dead code or stale comments remaining
- LSP diagnostics clean on changed files
```

### Step 5 — Verify

After all sub-agents complete:
- Check that no file was left untouched that should have been covered
- Verify rule-8 contract compliance on a sample of changed files
- Report what was done per module

---

## Guardrails

- Do not enforce on `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, or any generated directory
- Do not modify `.md` config files — only source code
- Do not enforce on files larger than 500 lines in one pass (split into sub-agents per section instead)

## Output Format

When reporting results, write the report to the plan server.

### 1. Create the file

Run this to create the enforce report under the plan server project structure:

```bash
PLAN_SERVER="$("$HOME/.agents/scripts/plan-server-path")"
python3 ~/.agents/scripts/new-artifact.py \
  --dest "$PLAN_SERVER" \
  --type reviews \
  "enforce-{scope}"
```

Where `{scope}` is a short slug of what was enforced. The project is auto-detected from the current directory and git context; override with `--project <name>` if needed.

The script creates the file and prints its path. **Do not construct the path yourself** — use the path the script returns.

The report will be viewable in the plan server at:
`http://localhost:3456/project/{project}/reviews`

### 2. Write content

Open the generated file and replace the template content with the full report.

The report must be **Obsidian-friendly** — easy for a human to open in Obsidian, scan quickly, and stay in the loop. Use headings, callouts, checklists, and Obsidian links.

Use this structure:

```markdown
---
date: {ISO timestamp}
author: {Author name}
tags: [enforce, {relevant-tags}]
type: review
---

# Enforce Report: {scope}

> [!summary]
> What rules were enforced, which files were touched, and what the result was.

## Summary

| Module | Files Changed | Issues Fixed | Status |
|--------|--------------|--------------|--------|
| {module} | {n} | {n} | pass/fail |

> [!todo]
> **Remaining Issues** (if any)
> - [ ] {issue to address}

## Per-Module Details

{for each module, list key changes made}

## Related Notes
- [[handoff-{related}]]
```

### 3. Approve

Save the document.

### 4. Clipboard

After writing the report file, immediately run `bash` with `pbcopy <absolute-path>` (using the path from the script output) so the user's clipboard has the file path.
