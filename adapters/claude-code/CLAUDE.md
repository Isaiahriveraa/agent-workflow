# Claude Code Workflow Wrapper

`/Users/isaiahrivera/.agents` is the workflow single source of truth.
`/Users/isaiahrivera/.claude` is the Claude Code adapter and runtime state directory.

Claude should read in this order:
1. `/Users/isaiahrivera/.agents/prompts/system.md`
2. `/Users/isaiahrivera/.agents/AGENTS.md`
3. `./.agents/repo.md` when the current repo provides it
