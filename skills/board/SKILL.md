---
name: board
description: "Keep this Herdr tab's Board card current: goal, current step, next step, blockers, and decisions. A hook adds a plain one-line log entry for every turn. Use when you start a task in a Herdr tab, finish a step, make a decision, get blocked, or finish."
---
# Board

`node ~/.config/herdr/scripts/board.mjs set [flags]` updates this tab's card. Flags you leave out keep their value; combine flags in one call.

| When | Flags |
|---|---|
| Start a task | `--goal "<what this tab is for>" --now "<step>" --next "<step>"` |
| Finish a step | `--now "<new step>"` (the old step joins the trail by itself) |
| Make a decision | `--decision "<chose X over Y>"` |
| Blocked / unblocked | `--blocker "<what you need>"` / `--clear-blockers` |
| Done | `--now "done: <outcome>" --clear-blockers` |

The Stop hook (`~/.agents/hooks/board-turn.sh`) writes the log itself: after each turn that used tools, it adds one plain line, such as "Edited login.ts: Fixed the login redirect." Do not add `--log` lines for routine work; the hook already did. Use `--decision` only for real choices, with what you rejected.

Rules:
- `--next` and `--blocker` replace their whole list; repeat the flag per item.
- Outside a Herdr tab it exits 1 and writes nothing. If it fails or is missing, say so once and carry on.

Rules:
- `--next` and `--blocker` replace their whole list; repeat the flag per item.
- Outside a Herdr tab it exits 1 and writes nothing. If it fails or is missing, say so once and carry on.
