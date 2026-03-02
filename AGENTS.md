# Global Agent Single Source of Truth

This file is the canonical source for agent behavior across repos.

## Source Paths
- System prompt: `/Users/isaiahrivera/.agents/prompts/system.md`
- Contexts: `/Users/isaiahrivera/.agents/contexts/*.md`
- Commands: `/Users/isaiahrivera/.agents/commands/*.md`
- Agents: `/Users/isaiahrivera/.agents/agents/*.md`
- Rules: `/Users/isaiahrivera/.agents/rules/common/*.md`
- Skills: `/Users/isaiahrivera/.agents/skills/**/SKILL.md`
- Adapters: `/Users/isaiahrivera/.agents/adapters/**`
- Hooks compatibility wrappers: `/Users/isaiahrivera/.agents/hooks/*`

## Required Load Order
1. Read `system.md`.
2. Read this global `AGENTS.md`.
3. If the current repo contains `.agents/repo.md`, read it next as the repo-specific supplement.
4. Load only the relevant files from `contexts/`.
5. Load any invoked command docs from `commands/`.
6. Load any needed reusable rule cards from `rules/common/`.
7. Load only relevant skill docs from `skills/`.
8. Load adapter-specific files only when the active toolchain requires them.

## Command Rules
- Command definitions in `commands/*.md` are authoritative.
- If a command name exists in `commands/`, follow that file exactly.
- Do not invent command behavior when a command doc exists.

## Skill Rules
- If a skill is explicitly requested, load its `SKILL.md` before acting.
- If multiple skills apply, use the minimal set and state the order.

## Repo Supplement Rules
- Repo root `AGENTS.md` may be a symlink to this global file.
- Repo-specific instructions belong in `.agents/repo.md` inside the repo.
- Repo supplements extend global rules unless they explicitly state otherwise.

## Context Rules
- `contexts/` is the canonical workspace state layer for reusable planning and execution context.
- Load only the minimum context files needed for the task instead of bulk-loading the whole directory.
- `contexts/decisions.md` is the source of truth for locked decisions, deferred ideas, and open questions.
- `contexts/state.md` is the source of truth for resumable workflow state.
- `contexts/research-index.md` is the index for reusable research artifacts.
- `contexts/session-index.md` is the index for resumable work sessions.
- `contexts/tooling.md` is the source of truth for detected environment tooling defaults.
- `contexts/verification.md` is the source of truth for available automated checks and preferred verification order.
- `contexts/artifacts.md` is the source of truth for resumable artifact retrieval priorities.
- `contexts/ui-ux.md` is required before substantial design-heavy UI work.

## Rule Card Rules
- Reusable workflow policy should live in `rules/common/` instead of being duplicated across prompts and commands.
- Rule cards extend the system prompt; they do not replace task-specific command or skill instructions.
- Use the package-manager detection rule before presenting or running Node package-manager commands in an unknown repo.
- Use the verification automation rule before recommending automated checks in a repo with scripts or build tooling.
- Use the artifact retrieval rule before loading multiple workflow artifacts into context.

## Adapter Rules
- `adapters/` contains provider-specific operational assets such as hooks, statuslines, and settings helpers.
- Provider adapters must not redefine canonical workflow policy that belongs in `prompts/`, `contexts/`, `commands/`, or `rules/common/`.
- Compatibility wrappers under `hooks/` may delegate to adapter files, but adapter files are the maintained implementation.

## Session Rules
- Use `thoughts/sessions/` for ordinary workflow continuity across sessions.
- Use handoffs when work is being intentionally transferred or compacted for another agent.
- Session artifacts should summarize current position, active artifacts, blockers, and the next recommended command.

## Non-Negotiables
- Prefer repo scripts over shell aliases/functions for execution.
- Ask for clarification when intent is ambiguous.
- For risky or destructive actions, require explicit confirmation.
