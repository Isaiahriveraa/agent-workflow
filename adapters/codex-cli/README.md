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
- memory: `bridged-explicit` through the shared `status`, `recall`, and `flush` bridge surfaces

## Capability Interpretation
- This profile describes what the hub currently manages for Codex, not every upstream Codex capability.
- Codex has native MCP and local configuration surfaces upstream, but this repo only manages the shared `AGENTS.md` entry point, continuity helpers, and the shared explicit memory bridge.

## Deliberately Not Managed
- `~/.codex/config.toml`
- `~/.codex/skills/.system/`

## Canonical Boundary
- Shared workflow policy lives in `AGENTS.md`, `prompts/`, `commands/`, `contexts/`, and `rules/common/`.
- AGENTS-routing compatibility is bridged through `~/.codex/AGENTS.md -> ~/.agents/AGENTS.md`.
- Explicit memory bridge parity only: `~/.agents/scripts/memory-sync-bridge.mjs` supports `status`, `recall`, and `flush`.
- In Codex, use `gsd <subcommand>`, `gsd-<subcommand>`, or `/gsd:<subcommand>` to invoke the matching hub command document under `commands/gsd/`.
- Use `gsd memory-sync`, `/gsd:memory-sync`, `gsd memory-sync status`, or `gsd memory-sync recall <create-plan|implement-plan>` when you want the shared explicit bridge from Codex command routing.
- Preferred direct bridge path: `node ~/.agents/scripts/memory-sync-bridge.mjs <status|recall|flush>`.
- Compatibility alias: `node ~/.agents/scripts/codex-memory-bridge.mjs <status|recall|flush>`.
- Codex does not have a repo-managed native hook writeback bridge in this repo, so lesson flush remains manual.
- The Codex adapter exists to keep the entry point pointed at the hub and to make regressions easy to validate.
