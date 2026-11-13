---
name: board
description: "Keep this Herdr tab's Project Board card current: record its goal, current step, next steps and blockers with the board command, so the user sees every open tab's state at a glance. Use when you start a task in a Herdr tab, when the plan or current step changes, when you are blocked, or when the work is done."
---
# Board

Each open Herdr tab has a card on the Board panel. Keep this tab's card current with the board command.

Command: `node ~/.config/herdr/scripts/board.mjs`

- **Start a task:** `set --goal "<what this tab is for>" --now "<current step>" --next "<step>" --next "<step>"`
- **Step changes:** `set --now "<current step>"`. Fields you don't name stay as they are.
- **Blocked:** `set --blocker "<what you need from the user>"`. When unblocked: `set --clear-blockers`.
- **Done:** `set --now "done: <outcome>" --clear-blockers`.
- **Log a milestone:** `set --log "<what got done>"`. **Log a decision:** `set --decision "<chose X over Y>"`. Both add a line to the card's log (newest last); combine with `--now` in one call when the step changes too.

When to log (the log is how the user catches up after time away, so it must stay short):
- Log only milestones: a step finished, a decision made (always log decisions, with what was rejected), blocked or unblocked, task done.
- Never log reads, searches, retries, single edits, or "starting X".
- Test each line: would it help the user resume this task after a week away? If not, skip it.
- About one line per 10–15 minutes of work at most; merge small steps into one line.
- Write for someone arriving cold: start with a verb, name the outcome ("Wired rate limiter to /login"), not the file ("Edited limiter.ts"). Up to ~60 characters.

Rules:
- Each `--next` or `--blocker` replaces the whole list, so repeat the flag for every item.
- Run it from this tab. Outside a Herdr tab it exits 1 and writes nothing; don't retry, just carry on.
- Keep text short for the user: goal and now up to 200 characters, each list item up to 160. Longer text is cut.
- If the command is missing, say so once and carry on with the task.
