# Claude Code Adapter

This directory contains Claude Code-specific operational assets.

## Managed Surfaces
- Symlinked to the hub: `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/agents`, `~/.claude/commands`, `~/.claude/hooks`, `~/.claude/get-shit-done`
- Claude-local but contract-validated: `~/.claude/settings.json`
- Runtime-only and unmanaged: Claude history, debug output, per-project runtime state, and other Claude-native local artifacts

## Scope
- Hooks
- Statusline helpers
- Settings helpers

## Capability Profile
- commands: `native`
- agents: `native`
- hooks: `native`
- MCP: `native`
- approvals: `native`
- session continuity: `bridged` through shared continuity helpers and project-local runtime state

## Canonical Boundary
- Workflow policy lives in `prompts/`, `commands/`, `contexts/`, and `rules/common/`.
- Claude is the strongest repo-managed adapter boundary in this repo: native commands, native agents, native hooks, and validated local settings.
- Files in this adapter may improve Claude Code ergonomics, but they must not become the source of truth for workflow behavior.
- `~/.claude/settings.json` remains Claude-local configuration, but required `~/.agents` access fields are part of the validated adapter contract.

## Compatibility
- Legacy paths under `~/.agents/hooks` may delegate to files in this directory.
- Hook failures must remain non-blocking.
- Context-pressure automation may call the shared continuity helper when `AGENTS_CONTINUITY_AUTOMATION` is enabled, but the helper contract remains the workflow source of truth.
- Claude should be able to read `~/.agents` during ordinary sessions through `additionalDirectories`, read access in `permissions.allow`, and `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`.
