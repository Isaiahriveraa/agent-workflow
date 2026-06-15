---
description: Read ~/.agents/AGENTS.md and enforce its rules on the current project using spawn protocol
---

# Enforce

Read `~/.agents/AGENTS.md` (the hub's master operating contract), extract its operating rules, and use the `/spawn` protocol to enforce them on the current project — BERP comments, code smell cleanup, convention conformance, and any other policies defined in that file. Not a project-local AGENTS.md — the hub file is the single source of truth.

---

## Purpose

`/enforce` bridges hub policy (what `~/.agents/AGENTS.md` says) with project execution (making it real). Instead of manually auditing files, it reads the master rules from the hub, then decomposes the current project's codebase into parallel sub-agents that each enforce the rules on their assigned scope.

---

## When To Use

| Use `/enforce` | Don't `/enforce` |
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

### Step 4 — Spawn (via spawn protocol)

Each sub-agent gets a prompt structured like this:

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
[extracted rules — BERP comments, inline comments, error handling,
 no type suppressions, code smell cleanup, etc.]

Assigned files:
[file1, file2, file3, ...]

4. MUST DO
- Read each file before editing
- Write BERP docstrings on every public function/method/class
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
- BERP docstrings on all public symbols
- No dead code or stale comments remaining
- LSP diagnostics clean on changed files
```

### Step 5 — Verify

After all sub-agents complete:
- Check that no file was left untouched that should have been covered
- Verify BERP compliance on a sample of changed files
- Report what was done per module

---

## Guardrails

- Do not enforce on `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, or any generated directory
- Do not modify `.md` config files — only source code
- Do not enforce on files larger than 500 lines in one pass (split into sub-agents per section instead)
- Prefer smaller sub-agent batches (2-4 at a time) for quality over throughput
- Prefer smaller sub-agent batches (2-4 at a time) for quality over throughput
