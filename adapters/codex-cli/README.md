# Codex CLI Adapter

This directory documents the Codex CLI-specific integration boundary.

## Managed Surface
- `~/.codex/AGENTS.md -> ~/.agents/AGENTS.md`

## Capability Profile
- commands: `unsupported`
- agents: `bridged` through the shared `AGENTS.md` entry point
- hooks: `bridged` through `~/.codex/hooks.json`
- MCP: `native`
- approvals: `native`
- session continuity: `bridged` through shared continuity helpers and project-local runtime state
- memory: `bridged-explicit` through the shared `status`, `recall`, and `flush` bridge surfaces

## Capability Interpretation
- This profile describes what the hub currently manages for Codex, not every upstream Codex capability.
- Codex has native MCP and local configuration surfaces upstream; this repo manages the shared `AGENTS.md` entry point, continuity helpers, the shared explicit memory bridge, and the hook scripts registered from `~/.codex/hooks.json`.

## Deliberately Not Managed
- `~/.codex/config.toml`
- `~/.codex/skills/.system/`

## Hook Bridge
- `~/.codex/hooks.json` registers lifecycle hooks that call hub-owned scripts.
- Session and prompt hooks load OMX/MemPalace context.
- PreToolUse shell hooks run `~/.agents/hooks/gsd-pre-bash-guard.cjs` before the OMX native preflight.
- Keep matcher coverage aligned with Codex shell tool names: `Bash|shell|unified_exec|exec_command|command_execution`.

## Model Routing

Codex CLI has a single `--model` flag per session — no per-subagent model selection. The model router now exposes a category-first recommendation contract with additive fields like `category`, `intent_kind`, `tier_hint`, `primary_model`, and `fallback_candidates`, while keeping legacy `tier` and `model` compatibility fields:

```bash
node ~/.agents/scripts/model-router.mjs route --input "implement auth feature"
# → { "model": "gpt-5.4-mini", "tier": "balanced", ... }
```

Before running `codex exec`, the codex skill can call the router to recommend the session model based on overall task complexity. `fallback_candidates` are advisory alternatives; Codex still has one active session model at a time.

## Canonical Boundary
- Shared workflow policy lives in `AGENTS.md`, `prompts/`, and `commands/`.
- AGENTS-routing compatibility is bridged through `~/.codex/AGENTS.md -> ~/.agents/AGENTS.md`.
- Explicit memory bridge parity only: `~/.agents/scripts/memory-sync-bridge.mjs` supports `status`, `recall`, and `flush`.
- In Codex, use the direct script path: `node ~/.agents/scripts/memory-sync-bridge.mjs <status|recall|flush>`.
