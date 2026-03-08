# Codex CLI Adapter

This directory documents the Codex CLI-specific integration boundary.

## Managed Surface
- `~/.codex/AGENTS.md -> ~/.agents/AGENTS.md`

## Capability Profile
- commands: `unsupported`
- agents: `bridged` through the shared `AGENTS.md` entry point
- hooks: `unsupported`
- MCP: `native`
- approvals: `native`
- session continuity: `bridged` through shared continuity helpers and project-local runtime state

## Deliberately Not Managed
- `~/.codex/config.toml`
- `~/.codex/skills/.system/`

## Canonical Boundary
- Shared workflow policy lives in `AGENTS.md`, `prompts/`, `commands/`, `contexts/`, and `rules/common/`.
- The Codex adapter exists to keep the entry point pointed at the hub and to make regressions easy to validate.
