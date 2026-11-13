---
name: board
description: "Keep this Herdr tab's Board card current: goal, current step, next step, blockers, and a short log of milestones and decisions, so the user can catch up on every tab at a glance. Use when you start a task in a Herdr tab, finish a step, make a decision, get blocked, or finish."
---
# Board

`node ~/.config/herdr/scripts/board.mjs set [flags]` updates this tab's card. Flags you leave out keep their value; combine flags in one call.

| When | Flags |
|---|---|
| Start a task | `--goal "<what this tab is for>" --now "<step>" --next "<step>"` |
| Finish a step | `--now "<new step>"` (the old step joins the trail by itself); add `--log "<outcome>"` only when the outcome says more than the step name |
| Make a decision | `--decision "<chose X over Y>"` |
| Blocked / unblocked | `--blocker "<what you need>"` / `--clear-blockers` |
| Done | `--now "done: <outcome>" --clear-blockers` |

The trail also records each user prompt automatically. Log only what helps the user resume after a week away:
- Milestones, decisions (with what you rejected), blocked or unblocked, done.
- Never reads, searches, retries, single edits or "starting X".
- At most one line per 10–15 minutes of work; merge small steps.
- Start with a verb and name the outcome ("Wired rate limiter to /login", not "Edited limiter.ts"). About 60 characters.

Rules:
- `--next` and `--blocker` replace their whole list; repeat the flag per item.
- Outside a Herdr tab it exits 1 and writes nothing. If it fails or is missing, say so once and carry on.
