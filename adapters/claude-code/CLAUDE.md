# Claude Code Workflow Wrapper

`~/.agents` is the workflow single source of truth.
`~/.claude` is the Claude Code adapter and runtime state directory.

Claude should read in this order:
1. `~/.agents/prompts/system.md`
2. `~/.agents/AGENTS.md`
3. `./.agents/repo.md` when the current repo provides it
