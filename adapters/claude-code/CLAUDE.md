# Claude Code Workflow Wrapper

`~/.agents` is the workflow single source of truth.
`~/.claude` is the Claude Code adapter and runtime state directory.

This file is intentionally minimal and unversioned.
Legacy OMC/oh-my-claudecode policy that used to live directly in `~/.claude/CLAUDE.md`
is now owned by shared hub surfaces so Claude and Codex follow the same contract:

- `~/.agents/prompts/system.md` for system behavior and communication defaults
- `~/.agents/AGENTS.md` for workflow policy, routing, verification, and execution contract
- `~/.agents/skills/omc-reference/SKILL.md` for Claude-specific OMC agent catalog, model aliases, and slash workflow reference
- `~/.agents/adapters/claude-code/README.md` for Claude adapter-specific capability and model-routing notes

Claude should read in this order:
1. `~/.agents/prompts/system.md`
2. `~/.agents/AGENTS.md`
3. `./.agents/repo.md` when the current repo provides it
