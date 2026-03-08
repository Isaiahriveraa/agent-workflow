# OpenCode Adapter

This directory documents the OpenCode-specific integration boundary.

## Managed Surfaces
- `~/.config/opencode/commands -> ~/.agents/commands`
- Generated agents in `~/.config/opencode/agents`

## Capability Profile
- commands: `native`
- agents: `bridged` through generated OpenCode-compatible agent files
- hooks: `unsupported`
- MCP: `native`
- approvals: `native`
- session continuity: `bridged` through shared continuity helpers and project-local runtime state

## Generator Contract
- `sync.sh gen-opencode-agents` generates OpenCode-compatible agent frontmatter from hub agents.
- OpenCode command behavior remains hub-native via the shared commands symlink.

## Canonical Boundary
- Shared workflow policy remains in the hub.
- This adapter only covers the format and placement needed for OpenCode to consume hub-owned workflow assets.
