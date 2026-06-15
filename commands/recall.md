---
description: Resume work from handoff document with context analysis and validation (rpiv-backed)
---

# Resume Handoff

This command is backed by the rpiv `skills/recall/SKILL.md`; load that skill for the full workflow.

Prefer `/resume-session` for lightweight continuity. Use this command when resuming from a richer transfer artifact.

Canonical handoffs are created by `python3 ~/.agents/scripts/new-handoff.py --type handoffs "<topic>"`.

## Inputs

### Path Provided

If a handoff/reflection/grill path is provided, read it fully. Then read any linked plan, research, validation, or prior handoff artifact it references. Use absolute paths in the analysis.

### Ticket Provided

If a ticket such as `ENG-XXXX` is provided:

1. Prefer `node $HOME/.agents/scripts/handoff-tools.mjs resolve ENG-XXXX` when available.
2. Scan the new default tree first:

```text
[project root]/thoughts/{Month-Name}-{Year}/W{week-num}/{handoffs,reflections,grill}/
```

3. Use recursive search and list matching files as absolute paths.
4. Keep the legacy fallback:

```text
[project root]/thoughts/handoffs/<ticket>/
[project root]/thoughts/handoffs/ENG-XXXX/
```

5. If multiple files match, choose the most recent by filename/date evidence.

### No Parameters

Find available handoffs by scanning:

```text
[project root]/thoughts/*/W*/handoffs/*.md
[project root]/thoughts/*/W*/reflections/*.md
[project root]/thoughts/*/W*/grill/*.md
```

Then list the most recent options with absolute paths and ask which one to resume.

Tip:

```text
/recall /absolute/path/to/thoughts/June-2026/W1/handoffs/Jun-05_7-30pm--topic.md
```

## Artifact-Specific Reading

### Handoffs

For files under `handoffs/`, extract task status, critical references, recent changes, learnings, artifacts, action items, and notes.

### Reflections

For files under `reflections/`, extract ownership evidence: files touched, structure changes, rationale, big picture, zero-context explanation, mode, and next thread. Do not pretend these are implementation handoffs unless they also include action items.

### Grill Sessions

For files under `grill/`, extract the starting question, terms challenged, terms resolved, ADRs created, and key insights. Use these to resume the plan/domain discussion, not implementation.

## Process

1. Read the selected document completely.
2. Classify it by path: `handoffs`, `reflections`, or `grill`.
3. Extract the matching artifact-specific sections above.
4. Read directly referenced critical artifacts yourself.
5. Spawn focused research only for secondary context.
6. Verify referenced changes still exist when the artifact claims concrete changes.
7. Present the current situation and recommended next action.

## Output Shape

```text
I've analyzed the handoff from [date]. Current situation:

Original task:
- [Task]: [handoff status] -> [current verification]

Key learnings:
- [Learning] - [still valid/changed]

Recent changes:
- [Change] - [verified/missing/modified]

Artifacts reviewed:
- [Path]: [key takeaway]

Recommended next action:
1. [Most logical next step]

Potential issues:
- [conflict/regression/missing dependency, if any]
```

## Guardrails

- Never assume handoff state matches current state.
- Do not break the legacy `thoughts/handoffs/<ticket>/` flow.
- Do not ignore `thoughts/{Month-Name}-{Year}/W{week-num}/{handoffs,reflections,grill}/`; it is the default scan location.
