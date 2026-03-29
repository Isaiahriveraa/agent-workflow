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

## Model Routing

Codex CLI has a single `--model` flag per session — no per-subagent model selection. The model router now exposes a category-first recommendation contract with additive fields like `category`, `intent_kind`, `tier_hint`, `primary_model`, and `fallback_candidates`, while keeping legacy `tier` and `model` compatibility fields:

```bash
node ~/.agents/scripts/model-router.mjs route --input "implement auth feature"
# → { "model": "gpt-5.4-mini", "tier": "balanced", ... }
```

Before running `codex exec`, the codex skill can call the router to recommend the session model based on overall task complexity. `fallback_candidates` are advisory alternatives; Codex still has one active session model at a time.

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
