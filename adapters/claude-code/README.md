# Claude Code Adapter

This directory contains Claude Code-specific operational assets.

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
- Files in this adapter may improve Claude Code ergonomics, but they must not become the source of truth for workflow behavior.

## Compatibility
- Legacy paths under `~/.agents/hooks` may delegate to files in this directory.
- Hook failures must remain non-blocking.
- Context-pressure automation may call the shared continuity helper when `AGENTS_CONTINUITY_AUTOMATION` is enabled, but the helper contract remains the workflow source of truth.
