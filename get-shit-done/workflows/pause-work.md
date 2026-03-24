<purpose>
Create `.continue-here.md` handoff file to preserve complete work state across sessions. Enables seamless resumption with full context restoration.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="detect">
Find current phase directory from most recently modified files:

```bash
# Find most recent phase directory with work
ls -lt .planning/phases/*/PLAN.md 2>/dev/null | head -1 | grep -oP 'phases/\K[^/]+'
```

If no active phase detected, ask user which phase they're pausing work on.
</step>

<step name="gather">
**Collect complete state for handoff:**

1. **Current position**: Which phase, which plan, which task
2. **Work completed**: What got done this session
3. **Work remaining**: What's left in current plan/phase
4. **Decisions made**: Key decisions and rationale
5. **Blockers/issues**: Anything stuck
6. **Mental context**: The approach, next steps, "vibe"
7. **Files modified**: What's changed but not committed

Ask user for clarifications if needed via conversational questions.
</step>

<step name="write">
**Write handoff to `.planning/phases/XX-name/.continue-here.md`:**

```markdown
---
phase: XX-name
task: 3
total_tasks: 7
status: in_progress
last_updated: [timestamp from current-timestamp]
---

<current_state>
[Where exactly are we? Immediate context]
</current_state>

<completed_work>

- Task 1: [name] - Done
- Task 2: [name] - Done
- Task 3: [name] - In progress, [what's done]
</completed_work>

<remaining_work>

- Task 3: [what's left]
- Task 4: Not started
- Task 5: Not started
</remaining_work>

<decisions_made>

- Decided to use [X] because [reason]
- Chose [approach] over [alternative] because [reason]
</decisions_made>

<blockers>
- [Blocker 1]: [status/workaround]
</blockers>

<context>
[Mental state, what were you thinking, the plan]
</context>

<next_action>
Start with: [specific first action when resuming]
</next_action>
```

Be specific enough for a fresh Claude to understand immediately.

Use `current-timestamp` for last_updated field. You can use init todos (which provides timestamps) or call directly:
```bash
timestamp=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" current-timestamp full --raw)
```
</step>

<step name="phase-checkpoint">
Write a structured JSON phase-exit record alongside the handoff file:

```bash
node "$HOME/.agents/scripts/continuity-tools.mjs" phase-checkpoint \
  --phase "[phase-name]" \
  --completed "[task1|task2]" \
  --pending "[task3|task4]" \
  --decisions "[key decision 1|key decision 2]" \
  --files "[modified file 1|modified file 2]" \
  --next-phase "[next-phase-name]"
```

Populate from the state gathered in the `gather` step. Use pipe `|` as separator for multi-value fields.
</step>

<step name="commit">
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "wip: [phase-name] paused at task [X]/[Y]" --files .planning/phases/*/.continue-here.md
```
</step>

<step name="confirm">
```
✓ Handoff created: .planning/phases/[XX-name]/.continue-here.md

Current state:

- Phase: [XX-name]
- Task: [X] of [Y]
- Status: [in_progress/blocked]
- Committed as WIP

To resume: /gsd:resume-work

```
</step>

</process>

<success_criteria>
- [ ] .continue-here.md created in correct phase directory
- [ ] All sections filled with specific content
- [ ] Committed as WIP
- [ ] User knows location and how to resume
</success_criteria>
