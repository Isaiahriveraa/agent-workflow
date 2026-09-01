---
name: handoff
description: Transfer clean, verified, implementation-relevant context into a new agent session. Generates a handoff document that another agent can read and continue from without re-reading the original conversation. Use when context is large, session is ending, or /handoff is invoked.
argument-hint: [description]
allowed-tools: Read, Write, Bash(git *), Glob, Grep
disable-model-invocation: true
shell-timeout: 10
---

# Create Agent Handoff

You are tasked with writing a handoff document — a context-preserving transfer to another agent in a new session. This is NOT a human-facing summary. The handoff will be read by a coding agent that needs to continue the work accurately.

The handoff must be:

- **Compact** — remove discussion that does not affect future work.
- **Rich** — preserve all details required to continue correctly.
- **Accurate** — represent the latest verified project state only.
- **Intent-stable** — preserve the user's final intent, not early confusion.
- **Actionable** — the next action must be obvious.
- **Low-drift** — avoid speculative advice or reinterpretation.

## Input

`$ARGUMENTS` — optional description (used in the handoff filename slug).

## Metadata

```!
node "${SKILL_DIR}/../_shared/now.mjs"
echo
node "${SKILL_DIR}/../_shared/git-context.mjs"
```

- `now.mjs` (line 1) — `<iso>\t<slug>` tab-separated. Use `<iso>` for any `date:` frontmatter field.
- `git-context.mjs` — provides `repo:`, `branch:`, `commit:`, `author:` labels. Use `author:` for frontmatter `author:` and `last_updated_by:`.

Copy values verbatim — do not reformat the timezone offset.

## Process

### 1. Create the file

Resolve the current Git worktree root, then create the handoff under its local
`context/handoffs/` directory. The writer creates `context/` and the artifact
directory when absent.

Run this to create the handoff file:

```bash
python3 ~/.agents/scripts/new-artifact.py \
  --type handoffs \
  "<description>"
```

Where `<description>` is a short slug of what you were working on (from `$ARGUMENTS`, or auto-generated from context). If `$ARGUMENTS` is empty, use a brief topic summary.

### 2. Recover context

Before writing, gather the essential information:

1. **Active Goal** — Restate the user's latest confirmed objective. What single task does the next agent need to complete?
2. **Current project state** — What works, what doesn't, what's verified?
3. **Changes made** — Specific files and why.
4. **Decisions locked** — What's been decided and why.
5. **Rejected approaches** — What was tried and discarded.
6. **Remaining work** — What still needs doing.
7. **Verification state** — What tests/checks have been run and their results.

Also check if the session produced or referenced **context artifacts** (plans, research, designs, solutions, and ADRs) from this session or earlier. Include them in the handoff so the next agent can read them for broader context.

### 3. Write content

Open the generated file and replace the template content with the full handoff.

Use the following structure. Write in plain Markdown — no callout syntax, no Obsidian wiki-links, no Mermaid unless essential for data flow understanding. Mermaid is acceptable ONLY for complex multi-component flows where a diagram conveys more than prose.

```markdown
---
date: {ISO timestamp from now.mjs}
author: {Author name from git-context.mjs}
commit: {Current commit hash}
branch: {Current branch name}
repository: {Repository name}
topic: "{Feature/Task Name} - Handoff"
tags: [handoff]
status: complete
last_updated: {Same ISO timestamp}
last_updated_by: {Author name}
type: handoff
---

# Agent Handoff: {Concise Active Task}

## Active Goal

A short, direct description of the user's latest confirmed objective.
What the next agent is expected to complete.

If the session produced a plan, FRD, design document, or other spec artifact on
the context directory, link it here:

- Plan: `{context/plans/path-to-plan.md}`
- Research: `{path/to/research.md}`
- ADR: `{path/to/adr.md}`

## Current State

Describe what is true right now — code state, behavior, test results.

- What works:
- What is incomplete:
- What is broken or known-buggy:
- What has been verified (and how):
- What is assumed but not verified:

Separate verified facts from assumptions.

## Latest User Intent

The user's final resolved requirements. Only include the latest confirmed
intent, not the full history. Earlier corrections should NOT appear here.

If the user changed their mind during the session:

- **Original intent:** (briefly, only if relevant context)
- **Correction:** (what the user said to change)
- **Active intent:** (what to do now)

## Locked Decisions

For each locked decision that affects implementation:

- **Decision:** {what was decided}
- **Why:** {reason}
- **Constraint:** {what this means for the next agent}

Keep entries short. Omit this section if no decisions were made.

## Do Not Repeat

List previously attempted, rejected, or corrected approaches that the next
agent might otherwise repeat. Be specific about why each was wrong.

- {Approach} — {why rejected}

Omit this section if none exist.

## Work Completed

### {Change Name}

**What changed:** {one-line description}
**Why:** {rationale}
**Files:** `{path/to/file.ext}`
**Verification:** {test/command/manual check result, or "Not yet verified"}

Repeat for each meaningful completed change. Do not list cosmetic or
unimportant edits.

## Relevant Files

### `{path/to/file.ext}`
**Status:** Read | Created | Modified | Deleted
**Role:** {what this file controls}
**Changes:** {what changed — only if modified}
**Next use:** {inspect, modify, no further changes expected}

Only include files relevant to continuing the active task.

## Remaining Work

Tasks are ordered by dependency. Each must be immediately executable.

### Task N: {Action-Oriented Name}

**Objective:** {specific result}
**Files:** `{path/to/file}`
**Depends on:** {prior task or None}
**Notes:** {essential implementation details only}
**Verify:** {exact check}
**Done when:** {binary completion condition}

## Resume Here

State the exact next action, file to open, and what to do.

> {The single next step. Example: Open `skills/handoff/SKILL.md` and replace the current template with the agent-handoff structure. After editing, run `cargo test` to verify compatibility.}

## Open Questions or Blockers

Include only unresolved questions that prevent or materially change implementation.

- **Question:** {what}
- **Why it matters:** {why the answer changes the approach}
- **Default:** {safest assumption if unanswered}
- **Blocked:** {yes/no — can work continue without an answer?}

Omit this section if none exist.

## Verification Status

- Tests passed: {list}
- Tests failed: {list}
- Commands run: {list}
- Manual checks: {list}
- Unverified: {areas not yet checked}

Never state that something works unless it was actually verified.

## Success Criteria

Checklist for the active task:

- [ ] {criterion 1}
- [ ] {criterion 2}
```

### 4. Approve

Save the document.

Once this is completed, respond with:

```
Handoff written to:
`{path-from-script}`

**Next step:** `/skill:recall {path-from-script}`
```

## Context Selection Rules

### Preserve

Include information that affects future implementation:

- User's latest confirmed goal.
- Current project state (verified behavior, architecture).
- Completed and partially completed work.
- Files changed and why.
- Architecture and implementation decisions.
- Constraints and rejected approaches.
- Unresolved blockers and next steps.
- Verification state and acceptance criteria.
- Exact user preferences that affect implementation.
- **Context artifacts** from this or related sessions (plans, research, ADRs, designs, and solutions).

### Remove

Exclude content that does not help the next agent:

- Repeated explanations.
- Conversational filler.
- Abandoned brainstorming.
- Early misunderstandings later corrected (except in Do Not Repeat).
- Options considered but never selected (except in Do Not Repeat).
- Generic best practices.
- Duplicated status information.
- Human-facing review language.
- Speculative future ideas outside the active scope.

## Intent Resolution

When earlier and later instructions conflict:

1. Prefer the latest explicit user correction.
2. Preserve the final decision as the active requirement.
3. Record the earlier approach only if the next agent might accidentally repeat it (under "Do Not Repeat").
4. Never present rejected and active decisions as equally valid.

## Compression Rules

- Prefer concise factual statements.
- Merge repeated decisions.
- Remove conversational chronology unless sequence affects implementation.
- Do not preserve every message.
- Do not summarize unrelated parts of the session.
- Use exact file paths when known.
- Keep details that would otherwise require rediscovery.
- Remove detail that can be trivially recovered and does not affect correctness.

## Accuracy Rules

- Do not invent file changes.
- Do not claim tests passed unless they were run.
- Mark uncertainty explicitly.
- Separate verified facts from assumptions.
- Prefer repository evidence over conversational guesses.
- Preserve exact constraints and final user corrections.
- Do not reinterpret the task into a new design direction.

## Continuity Rules

- The handoff must be understandable without the original conversation.
- The handoff must not require the previous agent's memory.
- The next action must be explicit.
- The next agent should continue without asking the user to repeat context.
- Include enough rationale to prevent regressions, but not a full design essay.

## What NOT to Include

- Obsidian wiki-links (`[[note]]`).
- Obsidian callouts (`> [!summary]`, `> [!warning]`, etc.) — use plain markdown.
- Human-facing explanation or review language.
- Mermaid diagrams unless they are essential for data flow understanding.
- The Plan Server Document Quality Standard checklist — handoffs do not need Human-in-the-Loop review.
- Security implications, necessity assessment, coupling analysis, or readability audits.
- "Related Notes" sections with wiki-link placeholders.
- Decorative formatting or question cards for user discussion.

## Clipboard

After writing the handoff file, immediately copy just the path to the clipboard. Use `printf` piped into `pbcopy` (NOT `pbcopy <file>` — that redirects the file's contents, not the path):

```bash
printf '%s' "$HANDOFF_PATH" | pbcopy   # copies the path string, not the document
```

where `$HANDOFF_PATH` is the path printed by the `new-artifact.py` script. The user's clipboard must contain only the document path.
