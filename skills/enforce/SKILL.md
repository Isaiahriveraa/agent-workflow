---
name: enforce
description: "Review what needs to change with a what/why rationale table, then enforce it. Gate for delegated work; hygiene pass for existing code."
---

# Enforce

Review → Enforce → Verify. One skill, three phases. Phase 1 produces a **rationale table** — what needs to change, why, and the rule behind it. Phase 2 applies table rows only. Phase 3 verifies and reports.

The reviewer explains; the enforcer writes. You see the full rationale before anything is touched.

## When To Use This Skill

| Use enforce | Don't use enforce |
|---|---|
| Before accepting delegated subagent work (gate) | Mid-implementation |
| After adding new rules to AGENTS.md (hygiene) | On a single file — just edit it |
| Before a major review or release | On generated or vendored code |
| When code has drifted from conventions | Rules are already being followed |
| Onboarding a new project into the workflow | |

## Enforcement Spec

The rules being enforced come from `~/.agents/AGENTS.md` — the numbered list under `## Operating Rules` (contract docs, error handling, no type suppressions, code smell cleanup, surgical scope, tests at public seams) — plus, in gate mode, the delegated prompt's acceptance criteria and forbidden shortcuts. The hub file is the single source of truth; never a project-local copy.

## Phase 1 — Review (read-only)

Produce the **rationale table**. No edits in this phase — the output is the contract for Phase 2.

| ID | File:line | What | Why (rule) | Impact | Smallest fix |
|---|---|---|---|---|---|
| F1 | `src/auth.ts:42` | `catch (e) {}` swallows errors | AGENTS.md rule 7 — errors explicit | silent token-refresh failure | log + rethrow |

Every row needs a verbatim quote at `file:line`, the rule it violates, an observable impact, and the smallest fix. A row without evidence is dropped. No style noise, no "might/could" without a path.

Depth varies by trigger:

- **Gate mode** (delegated work, small diff): three passes — rules enforcement, codebase conformance (does it look like the repo already wrote it), adversarial (context-free, assumes the code is wrong). Include the task's acceptance criteria.
- **Hygiene mode** (whole codebase): rules + conformance passes only. Skip the adversarial pass at repo scale — it is wasted cost. Map source files by natural module boundaries (5–15 files per unit), skipping generated directories.

## Phase 2 — Enforce (write)

Writers apply the rationale table rows **only**. Nothing outside the table — no "while I'm here" cleanup, no unlisted files, no behavior changes.

Who writes:

- **Gate mode** → the responsible implementing subagent (it has the context). Send it the table rows with exact file/symbol direction, acceptance criteria, and non-goals.
- **Hygiene mode** → parallel spawned enforcers via `skill(name="spawn")`, one per module group, each receiving the full table rows for its files.

Writer rules (every writer):

- Read each file before editing
- Touch only rows assigned to it — the table is the spec
- Do not change behavior, logic, or functionality
- Do not add dependencies; do not leave TODO or placeholder comments
- LSP diagnostics clean on changed files

## Phase 3 — Verify + report

1. Re-check every table row: applied or explicitly rejected with reason.
2. Sample-verify changed files against the table (no unlisted edits).
3. Write the report to the plan server (see Output Format below), including the rationale table and per-module applied rows.
4. Run `pbcopy <absolute-path>` so the user's clipboard has the path.

## Guardrails

- **Reviewer ≠ writer.** The agent that finds a finding never applies it. Findings lose their blindness the moment the author's reasoning leaks in — separate agents, always.
- **The table is the spec.** Any edit not backed by a table row is a violation.
- Do not enforce on `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, or any generated directory.
- Do not modify `.md` config files — only source code.
- Do not enforce on files larger than 500 lines in one pass (split into sub-agents per section instead).
- **`code-review` stays the deep always-run verification** after integration (independent reviewers, adjudication, baseline checks, regression tests). This skill is the cheap/medium gate + hygiene layer — do not grow adjudication machinery into it.

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

## Rationale Table

| ID | File:line | What | Why (rule) | Impact | Status |
|----|-----------|------|------------|--------|--------|
| {id} | {file:line} | {change} | {rule} | {impact} | applied/rejected |

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