# Antigravity Adapter

This directory documents the Antigravity-specific integration boundary.

## Managed Surfaces
- `~/.gemini/antigravity/skills -> ~/.agents/skills`
- Generated commands in `~/.gemini/commands`
- Generated agents in `~/.gemini/agents`
- Generated get-shit-done bridge in `~/.gemini/get-shit-done`

## Generator Contract
- `sync.sh gen-antigravity-commands` bridges hub markdown commands into Antigravity TOML commands.
- `sync.sh gen-antigravity-agents` publishes hub agents into Antigravity's local agent directory.
- `sync.sh gen-antigravity-gsd` mirrors shared get-shit-done workflow content into Antigravity's expected local structure.

## Canonical Boundary
- Shared workflow policy stays in the hub.
- This adapter only handles translation and placement for Antigravity-native surfaces.
