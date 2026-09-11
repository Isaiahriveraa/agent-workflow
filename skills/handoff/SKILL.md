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

Open the generated file and fill in the scaffold. The `handoffs` generator
profile is the structural source of truth: preserve its frontmatter and
complete the generated structure rather than replacing it with a separately
invented template.

The completed artifact must retain this metadata and section structure:

- Frontmatter: `date`, `author`, `commit`, `branch`, `repository`, `topic`,
  `tags`, `status`, `last_updated`, `last_updated_by`, and `type: handoff`.
- `# Agent Handoff: ...`
- `## Active Goal`
- `## Current State`
- `## Latest User Intent`
- `## Locked Decisions`
- `## Do Not Repeat` (when applicable)
- `## Work Completed`
- `## Relevant Files`
- `## Remaining Work`
- `## Resume Here`
- `## Open Questions or Blockers` (when applicable)
- `## Verification Status`
- `## Success Criteria`

Write in plain Markdown — no callout syntax, no Obsidian wiki-links, and no
Mermaid unless essential for data-flow understanding. Mermaid is acceptable
only for complex multi-component flows where a diagram conveys more than
prose. Use the generated scaffold's field guidance while preserving all
verified-versus-assumed, evidence, path, status, and approval requirements
below.

### Required section guidance

- `Active Goal`: the latest confirmed objective and the next agent's task;
  include links to relevant context artifacts.
- `Current State`: what works, what is incomplete or broken, and what was
  verified; separate verified facts from assumptions.
- `Latest User Intent`: only the latest confirmed intent, including corrections
  when relevant.
- `Locked Decisions`: each decision, why it was made, and its constraint.
- `Do Not Repeat`: rejected or corrected approaches and why.
- `Work Completed`: each meaningful change, rationale, files, and verification.
- `Relevant Files`: only continuation-relevant paths, with status, role,
  changes, and next use.
- `Remaining Work`: dependency-ordered executable tasks with objective, files,
  dependencies, notes, exact verification, and binary completion condition.
- `Resume Here`: the exact next action, file, and operation.
- `Open Questions or Blockers`: only material unresolved questions, impact,
  safest default, and whether work is blocked.
- `Verification Status`: passed and failed tests, commands, manual checks, and
  unverified areas; never claim unverified behavior works.
- `Success Criteria`: a checklist for the active task.

### 4. Approve

Save the document.

Once this is completed, respond with the human-facing progressive-disclosure summary: **Active Goal**, **Current State**, **Locked Decisions**, and a **Teach-Back checkpoint**, followed by the handoff path:

```
Handoff written to:
`{path-from-script}`

**Next step:** `/skill:recall {path-from-script}`
```

The written 12-section artifact remains for agent continuation; the session response is for the human and must follow the progressive-disclosure format above, using the communication guidance in `references/communication.md`.

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

The human-facing response must follow progressive disclosure (Active Goal, Current State, Locked Decisions, Teach-Back checkpoint), and `$HANDOFF_PATH` is the path printed by the `new-artifact.py` script. The user's clipboard must contain only the document path.
