# OpenCode Adapter

This directory documents the OpenCode-specific integration boundary.

## Managed Surfaces
- `~/.config/opencode/commands -> ~/.agents/commands`
- Generated agents in `~/.config/opencode/agents`

## Capability Profile
- commands: `native`
- agents: `bridged` through generated OpenCode-compatible agent files
- hooks: `native` through TypeScript plugins in `~/.config/opencode/plugins/`
- MCP: `native`
- approvals: `native`
- session continuity: `bridged` through shared continuity helpers and project-local runtime state
- memory: `bridged-explicit` through the shared `status`, `recall`, and `flush` parity layer

## Capability Interpretation
- This profile describes repo-managed support, not the full upstream OpenCode feature set.
- OpenCode upstream supports command files and plugin event hooks. Plugins are TypeScript files auto-discovered from `~/.config/opencode/plugins/`.
- Available plugin hooks: `chat.message`, `chat.params`, `chat.headers`, `permission.ask`, `command.execute.before`, `tool.execute.before`, `tool.execute.after`, `shell.env`, `experimental.session.compacting`, `experimental.chat.messages.transform`, `experimental.chat.system.transform`, `experimental.text.complete`.
- The hub manages these plugins as hub-owned scripts under `~/.config/opencode/plugins/`:
  - `mempalace-plugin.ts` — MemPalace memory automation via `tool.execute.after` and `experimental.session.compacting`
  - `rtk.ts` — RTK command rewriting
  - `decisions-check-plugin.ts` — undocumented-change detection via `experimental.session.compacting`

## Generator Contract
- `sync.sh gen-opencode-agents` generates OpenCode-compatible agent frontmatter from hub agents.
- OpenCode command behavior remains hub-native via the shared commands symlink.

## Model Routing

OpenCode supports per-agent model overrides and a `small_model` config for lightweight tasks. Model IDs use `provider/model-id` format (e.g., `anthropic/claude-sonnet-4-6`).

The model router is category-first and returns provider-formatted `primary_model` values for OpenCode plus additive metadata such as `category`, `intent_kind`, `tier_hint`, and `fallback_candidates`:

```bash
node ~/.agents/scripts/model-router.mjs route --input "search for files"
# → { "model": "anthropic/claude-haiku-4-5-20251001", ... }
```

`sync.sh gen-opencode-agents` can embed the primary route and compatibility tier hints in generated agent config. `fallback_candidates` describe declared alternates only; runtime fallback remains a separate concern.

## Canonical Boundary
- Shared workflow policy remains in the hub.
- This adapter only covers the format and placement needed for OpenCode to consume hub-owned workflow assets.
- Explicit memory bridge parity only: `~/.agents/scripts/memory-sync-bridge.mjs` supports `status`, `recall`, and `flush`.
- Preferred direct script path: `node ~/.agents/scripts/memory-sync-bridge.mjs <status|recall|flush>`.
- For advisory recall: `node ~/.agents/scripts/memory-sync-bridge.mjs recall <create-plan|implement-plan>`.

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
