# OpenClaw Adapter

This directory contains OpenClaw-specific wrapper assets.

## Managed Surfaces
- `~/.openclaw/CLAUDE.md -> ~/.agents/AGENTS.md`
- `~/.openclaw/workspace/skills -> ~/.agents/skills`
- Generated workspace wrappers:
  - `AGENTS.md`
  - `SOUL.md`
  - `USER.md`
  - `TOOLS.md`

## Capability Profile
- commands: `unsupported`
- agents: `unsupported`
- hooks: `unsupported`
- MCP: `unsupported`
- approvals: `native`
- session continuity: `bridged` through shared continuity helpers and project-local runtime state
- memory: `bridged-explicit` through the shared `status`, `recall`, and `flush` parity layer
- workspace wrappers: `bridged`

## Capability Interpretation
- This profile describes hub-managed support in this repo, not the full upstream OpenClaw feature set.
- OpenClaw upstream documents slash commands, plugins, hooks, and built-in memory, but this repo currently bridges workspace wrappers and continuity helpers only.
- `commands: unsupported` and `hooks: unsupported` here mean "not bridged by this repo yet," not "OpenClaw lacks those features upstream."
- `agents: unsupported` and `MCP: unsupported` remain repo-level statements about missing hub contracts, not broader claims about every upstream OpenClaw surface.

## Local-Only Surfaces
- `~/.openclaw/openclaw.json`
- `~/.openclaw/workspace/IDENTITY.md`

## Canonical Boundary
- Shared workflow policy stays in the hub.
- Wrapper templates in `templates/` preserve OpenClaw-local intent without duplicating hub-owned policy.
- Explicit memory bridge parity only: `~/.agents/scripts/memory-sync-bridge.mjs` supports `status`, `recall`, and `flush`.
- OpenClaw does not have a hub-managed command bridge in this repo, so the explicit memory bridge is the direct script path.

## Universal Memory Access (agents-memory)

The preferred method for all ZLIs to access memory is through shell wrappers in PATH:

```bash
# Add to PATH (optional, one-time setup)
ln -s ~/.agents/bin ~/bin

# Then use from any ZLI
agents-memory status
agents-memory recall create-plan --query "planning a feature"
agents-memory flush
```

This approach works for any CLI that can execute shell commands, including OpenClaw.
