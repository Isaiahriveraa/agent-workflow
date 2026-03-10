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

## Generator Contract
- `sync.sh gen-antigravity-commands` bridges hub markdown commands into Gemini TOML commands and rewrites Claude-local workflow paths to Gemini-local paths.
- `sync.sh gen-antigravity-agents` translates hub agent markdown into Gemini-compatible agent frontmatter and Gemini-native tool names.

## Canonical Boundary
- Shared workflow policy stays in the hub.
- Gemini-native surfaces are symlinked directly when the hub format already matches.
- This adapter only translates the surfaces whose schema differs from the hub: commands and agents.
- Do not mirror `~/.agents/skills` into `~/.gemini/skills`; Gemini already discovers the `.agents` alias and a second copy creates duplicate-skill warnings.
