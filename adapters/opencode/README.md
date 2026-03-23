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
- memory: `bridged-explicit` through the shared `status`, `recall`, and `flush` parity layer

## Capability Interpretation
- This profile describes repo-managed support, not the full upstream OpenCode feature set.
- OpenCode upstream supports command files and plugin event hooks, but this repo currently bridges commands and generated agents only.
- No repo-managed native hook bridge exists yet, so the explicit memory bridge stays operator-invoked in this repo.

## Generator Contract
- `sync.sh gen-opencode-agents` generates OpenCode-compatible agent frontmatter from hub agents.
- OpenCode command behavior remains hub-native via the shared commands symlink.

## Canonical Boundary
- Shared workflow policy remains in the hub.
- This adapter only covers the format and placement needed for OpenCode to consume hub-owned workflow assets.
- Explicit memory bridge parity only: `~/.agents/scripts/memory-sync-bridge.mjs` supports `status`, `recall`, and `flush`.
- Use `gsd memory-sync` to invoke the shared explicit memory bridge from OpenCode's bridged command surface.
- Use `gsd memory-sync recall create-plan` or `gsd memory-sync recall implement-plan` for explicit advisory recall.
- Preferred direct script path when you want to bypass command routing: `node ~/.agents/scripts/memory-sync-bridge.mjs <status|recall|flush>`.

## Universal Memory Access (agents-memory)

All ZLIs can also access memory via shell wrappers in PATH:

```bash
# Add to PATH (optional, one-time setup)
ln -s ~/.agents/bin ~/bin

# Then use from any ZLI
agents-memory status
agents-memory recall create-plan --query "planning a feature"
agents-memory flush
```

This approach works for any CLI that can execute shell commands.
