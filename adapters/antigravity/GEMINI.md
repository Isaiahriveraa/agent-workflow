# Antigravity Workflow Wrapper (agy / gemini)

`~/.agents` is the workflow single source of truth.
`~/.gemini` is the Antigravity/Gemini CLI adapter and runtime state directory.

The CLI (`agy` or `gemini`) reads this file as its entrypoint. Everything below is
sourced from the hub at `~/.agents/.`

---

## Reading Order

This file should be read in this order:
1. This GEMINI.md file (entrypoint adapter)
2. `@~/.agents/AGENTS.md` — the full workflow contract, skill routing, and operating rules
3. `./.agents/repo.md` when the current repo provides it

---

## Hub-Sourced Surfaces

### Commands (`~/.gemini/commands/`)
All 18 command TOML files are **generated from the hub** at `~/.agents/commands/` via:
```bash
~/.agents/sync.sh gen-antigravity-commands
```
Run this after adding or editing commands in the hub to regenerate.
Available commands:
- capture-decision, commit, elite-mode, fix, handoff, ping-pong, plan, plan-feature
- pr, pr-split, prime, read-code, recall, review, review-diff, rpi, rpi-brainstorm, tutor

### Agents (`~/.gemini/agents/`)
All 43 agent markdown files are **generated from the hub** at `~/.agents/agents/` via:
```bash
~/.agents/sync.sh gen-antigravity-agents
```
Run this after adding or editing agents in the hub to regenerate.

### Skills (`~/.agents/skills/`)
Skills are **auto-discovered** by Gemini/agy from the hub's `~/.agents/skills/` directory.
No symlink or generation needed — the CLI finds them via the user-scope alias.
53 skill packs covering Flutter, testing, UI/UX, security, performance, and more.

---

## Generator Contract
| Surface | Source | Format | Generator |
|---------|--------|--------|-----------|
| commands | `~/.agents/commands/*.md` | TOML | `sync.sh gen-antigravity-commands` |
| agents | `~/.agents/agents/*.md` | Gemini frontmatter | `sync.sh gen-antigravity-agents` |
| skills | `~/.agents/skills/` | native discovery | none needed |

---

## Capability Bridge

| Capability | Status | Contract |
|------------|--------|----------|
| Entrypoint | bridged | `~/.gemini/GEMINI.md -> ~/.agents/adapters/antigravity/GEMINI.md` |
| Commands | bridged | Generated TOML from hub markdown |
| Agents | bridged | Generated frontmatter from hub agent markdown |
| Skills | native | Auto-discovered from `~/.agents/skills/` |
| Hooks | unsupported | Hub does not manage an Antigravity hook bridge yet |
| MCP | unsupported | Hub does not manage an Antigravity MCP contract yet |
| Approvals | native | Tool-native permission controls |
| Session continuity | bridged | Shared continuity helpers write project-local runtime state |

---

## Quick Sync

After hub changes, regenerate everything:
```bash
bash ~/.agents/sync.sh gen-antigravity-commands
bash ~/.agents/sync.sh gen-antigravity-agents
```

Or run the full migration (repairs all symlinks, regenerates all adapters):
```bash
bash ~/.agents/sync.sh migrate
```
