# Antigravity Adapter

This directory documents the Antigravity-specific integration boundary.

## Managed Surfaces
- `~/.gemini/GEMINI.md -> ~/.agents/adapters/antigravity/GEMINI.md`
- Generated commands in `~/.gemini/commands`
- Generated agents in `~/.gemini/agents`

## Capability Profile
- entrypoint: `bridged` through `GEMINI.md`
- skills: `native` through Gemini's `~/.agents/skills` user-scope alias
- commands: `bridged` through generated TOML command files
- agents: `bridged` through generated Gemini-schema agent files
- hooks: `unsupported`
- MCP: `unsupported`
- approvals: `native`
- session continuity: `bridged` through shared continuity helpers and project-local runtime state

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
- Do not mirror `~/.agents/skills` into `~/.gemini/skills`; Gemini already discovers the `.agents` alias and a second copy creates duplicate-skill warnings.



# Add to PATH (optional, one-time setup)

# Then use from any ZLI

This approach works for any CLI that can execute shell commands, including Gemini.

## CLI Triggers

This adapter supports two CLI triggers sharing `~/.gemini/`:
- **`agy`** (antigravity) at `~/.local/bin/agy` (v1.0.5+)
- **`gemini`** (Gemini CLI) at `/opt/homebrew/bin/gemini`

Both consume `~/.gemini/GEMINI.md` as their entrypoint, which symlinks to
this adapter. The hub at `~/.agents/` is SSOT for both.
