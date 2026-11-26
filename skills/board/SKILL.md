---
name: board
description: "Use when a Herdr tab starts, advances, blocks, or finishes a multi-step task. Updates that tab's Board card."
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
