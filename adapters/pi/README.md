# Pi Adapter

Pi-specific integration boundary. `@mariozechner/pi-coding-agent` v0.70.2.

## Managed Surfaces

- `~/.pi/agent/settings.json` — global settings, loads all 4 extensions
- `~/.pi/agent/AGENTS.md` → `~/.agents/AGENTS.md` (symlink)
- `~/.pi/agent/skills/` → `~/.agents/skills/*/` (per-skill symlinks; refresh after adding hub skills)
- `~/.agents/scripts/rtk-pi-extension.ts` — RTK rewrite hook
- `~/.agents/scripts/pi-slash-commands.ts` — hub slash commands
- `~/.agents/scripts/pi-memory-extension.ts` — mempalace session injection
- `~/.agents/scripts/pi-session-hooks.ts` — lifecycle hooks

## Capability Profile

- entrypoint: `bridged` via AGENTS.md symlink
- skills: `bridged` (per-skill symlinks from `~/.agents/skills/`)
- extensions: `native` (TypeScript, `tool_call` / `tool_result` / lifecycle hooks)
- commands: `native` via `pi-slash-commands.ts`
- hooks: `native` via extension events (`session_start`, `agent_start`, `agent_end`, `session_shutdown`)
- MCP: `unsupported`
- approvals: `unsupported`
- session continuity: `bridged` via `pi-memory-extension.ts`
- RTK: `native` via `rtk-pi-extension.ts`

## Extensions

### RTK (rtk-pi-extension.ts)
Intercepts `tool_call` for bash, rewrites via `rtk rewrite` before execution.
Startup-check verifies `rtk` binary is in PATH and warns clearly if missing.

### Slash Commands (pi-slash-commands.ts)

| Command | Action |
|---------|--------|
| `/prime` | Injects prime command doc as user message, agent follows it |
| `/rpi` | Injects RPI command doc + args as user context |
| `/gsd [sub]` | Injects GSD command or subcommand doc |
| `/tutor` | Injects tutor command doc |
| `/pr [args]` | Injects PR command doc + args |
| `/review-pr-comments [pr]` | Injects review command doc + PR arg |
| `/doctor` | Runs `doctor.mjs`, shows output inline |
| `/memory [op]` | Runs `memory-sync-bridge.mjs [status\|recall\|flush]` |
| `/review` | Injects code-review skill guidance |

### Memory (pi-memory-extension.ts)
- `session_start` → injects memory context via `memory-sync-bridge.mjs inject`
- `agent_end` → flushes via `memory-sync-bridge.mjs flush`
- `session_shutdown` → flushes (safety net)

### Session Hooks (pi-session-hooks.ts)
Lifecycle event logging. Wire additional telemetry, auto-compaction, or wiki sync here.

## Activation

1. Ensure `rtk` binary in PATH: `which rtk`
2. Restart pi or run `/reload`
3. Test RTK: `!git status` → auto-rewritten
4. Test slash: `/doctor` → runs diagnostics
5. Test memory: new session → context auto-injected
