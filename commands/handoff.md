---
description: Create handoff document for transferring work to another session (rpiv-backed)
---

# Create Handoff

This command is backed by the rpiv `skills/handoff/SKILL.md`; load that skill for the full workflow. The script is the canonical creator. If you need a richer handoff, edit after creation.

Use `/pause-session` for normal pause/resume continuity. Use this command when the work needs a richer transfer artifact for another agent or deliberate context compaction.

## Filepath

Create handoffs under the current project root:

```text
[project root]/thoughts/{Month-Name}-{Year}/W{week-num}/handoffs/{Mon-DD}_{time}--<topic>.md
```

Example:

```text
[project root]/thoughts/June-2026/W1/handoffs/Jun-05_7-30pm--orb-state-machine.md
```

Use a 12-hour time with no seconds. Tickets are optional metadata; if needed, pass or record an optional `--ticket` value in the body/frontmatter, not in the default path.

## Process

1. Resolve project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Gather metadata with `git rev-parse HEAD`, `git rev-parse --abbrev-ref HEAD`, and `date`.
3. Call:

```bash
python3 ~/.agents/scripts/new-handoff.py --type handoffs "<topic>"
```

4. Fill the created file with the handoff sections below.
5. Report the handoff location as an absolute filesystem path.

## Template Structure

Keep this structure when enriching the generated file:

```markdown
---
date: [Current date and time with timezone in ISO format]
researcher: [Researcher name from thoughts status]
git_commit: [Current commit hash]
branch: [Current branch name]
repository: [Repository name]
topic: "[Feature/Task Name] Implementation Strategy"
ticket: [Optional ticket id, omit if none]
tags: [implementation, strategy, relevant-component-names]
status: complete
last_updated: [Current date in YYYY-MM-DD format]
last_updated_by: [Researcher name]
type: implementation_strategy
---

# Handoff: {very concise description}

## Task(s)

## Critical References

## Recent changes

## Learnings

## Artifacts

## Action Items & Next Steps

## Other Notes
```

## Response

After writing the file, respond with the exact absolute path:

```text
Handoff created.

Next step:
/recall /absolute/path/to/thoughts/June-2026/W1/handoffs/Jun-05_7-30pm--topic.md
```

Follow clipboard automation from `AGENTS.md`: copy the exact `/recall ...` command with `pbcopy`.

## Notes

- More information is better than missing critical context.
- Prefer file references like `/path/to/file.ext:12` over large code blocks.
- Existing legacy handoffs under old directories stay untouched.
