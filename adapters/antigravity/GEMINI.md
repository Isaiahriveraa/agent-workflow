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
Command TOML files are **generated from the hub** at `~/.agents/commands/` via:
```bash
~/.agents/sync.sh gen-antigravity-commands
```
Run this after adding or editing commands in the hub to regenerate.
For the current inventory, inspect the source `~/.agents/commands/*.md` and regenerated `~/.gemini/commands/*.toml` files rather than a fixed command list.

### Agents (`~/.gemini/agents/`)
Agent markdown files are **generated from the hub** at `~/.agents/agents/` via:
```bash
~/.agents/sync.sh gen-antigravity-agents
```
Run this after adding or editing agents in the hub to regenerate.
For the current inventory, inspect `~/.agents/agents/*.md` and the regenerated files in `~/.gemini/agents/`.

### Skills (`~/.agents/skills/`)
Skills are **auto-discovered** by Gemini/agy from the hub's `~/.agents/skills/` directory.
No symlink or generation needed — the CLI finds them via the user-scope alias.
Inspect `~/.agents/skills/*/SKILL.md` for the current skill inventory.

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
