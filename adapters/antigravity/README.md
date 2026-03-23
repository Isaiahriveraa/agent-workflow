# Antigravity Adapter

This directory documents the Antigravity-specific integration boundary.

## Managed Surfaces
- `~/.gemini/GEMINI.md -> ~/.agents/adapters/antigravity/GEMINI.md`
- `~/.gemini/get-shit-done -> ~/.agents/get-shit-done`
- Generated commands in `~/.gemini/commands`
- Generated agents in `~/.gemini/agents`

## Capability Profile
- entrypoint: `bridged` through `GEMINI.md`
- skills: `native` through Gemini's `~/.agents/skills` user-scope alias
- get-shit-done: `native` through a direct symlink
- commands: `bridged` through generated TOML command files
- agents: `bridged` through generated Gemini-schema agent files
- hooks: `unsupported`
- MCP: `unsupported`
- approvals: `native`
- session continuity: `bridged` through shared continuity helpers and project-local runtime state
- memory: `bridged-explicit` through the shared `status`, `recall`, and `flush` parity layer

## Capability Interpretation
- This profile describes what the hub bridges for Gemini via the Antigravity adapter, not the full Gemini CLI feature set upstream.
- Gemini CLI upstream supports custom commands, extensions, MCP, and native memory, but this repo currently bridges the entrypoint, commands, agents, and continuity helpers only.
- `hooks: unsupported` and `MCP: unsupported` here mean "not hub-managed in this repo yet," not "Gemini CLI cannot do this."

## Generator Contract
- `sync.sh gen-antigravity-commands` bridges hub markdown commands into Gemini TOML commands and rewrites Claude-local workflow paths to Gemini-local paths.
- `sync.sh gen-antigravity-agents` translates hub agent markdown into Gemini-compatible agent frontmatter and Gemini-native tool names.

## Canonical Boundary
- Shared workflow policy stays in the hub.
- Gemini-native surfaces are symlinked directly when the hub format already matches.
- This adapter only translates the surfaces whose schema differs from the hub: commands and agents.
- Explicit memory bridge parity only: `~/.agents/scripts/memory-sync-bridge.mjs` supports `status`, `recall`, and `flush`.
- Do not mirror `~/.agents/skills` into `~/.gemini/skills`; Gemini already discovers the `.agents` alias and a second copy creates duplicate-skill warnings.
- Use `gsd memory-sync` through the generated command bridge when you want the shared explicit memory bridge.
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
