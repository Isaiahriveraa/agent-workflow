# Global Agent Single Source of Truth

This Markdown file is the compatibility entrypoint for shared agent behavior across repos.
The optimized source of truth now lives in [AGENTS.xml](/Users/isaiahrivera/.agents/AGENTS.xml).

## Source Paths
- System prompt: `prompts/system.md`
- Contexts: `contexts/*.md`
- Capsules: `capsules/**`
- Commands: `commands/**/*.md`
- Agents: `agents/*.md`
- Rules: `rules/common/*.md`
- Skills: `skills/**/SKILL.md`
- Adapters: `adapters/**`
- Hooks compatibility wrappers: `hooks/*`

## Required Load Order
1. Read `prompts/system.md`.
2. Read [AGENTS.xml](/Users/isaiahrivera/.agents/AGENTS.xml) as the optimized policy source.
3. Use this Markdown file as the compatibility wrapper when adapters, tests, or tools still expect `AGENTS.md`.
4. If the current repo contains `.agents/repo.md`, read it as the repo-specific supplement.
5. Load only the relevant files from `contexts/`, `capsules/`, `commands/`, `rules/common/`, `skills/`, and adapter-specific files.

## Command Rules
- Command definitions in `commands/**/*.md` are authoritative.
- If a command name exists in `commands/`, including namespaced command files such as `commands/gsd/*.md`, follow that file exactly.
- If the user sends a slash-style command such as `/cm`, `/prime`, `/plan-feature`, `/execute`, `/optimize-prompt`, `/gsd:help`, or similar, first look for a matching command document in `commands/` before treating it as plain text.
- Treat underscore and hyphen variants of the same slash-style workflow command as equivalent when they resolve to one unambiguous command file. Prefer the on-disk file name as canonical when reporting or persisting command names.
- Treat `gsd <subcommand>`, `gsd-<subcommand>`, and `/gsd:<subcommand>` as equivalent requests for `commands/gsd/<subcommand>.md`. If the subcommand is omitted, route to `commands/gsd/help.md`.
- When the intended command name is ambiguous, check `commands/` for the closest matching command file and use that as the first resolution step.
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
- `contexts/decisions.md` is the source of truth for locked decisions, deferred ideas, and open questions.
- `contexts/agent-catalog.md` is the source of truth for workflow expert agents, their triggers, and routing boundaries.
- `contexts/user-taste.md` is the source of truth for durable user-specific output preferences and dislikes.
- The current project's `.agents/contexts/state.md`, `.agents/contexts/research-index.md`, and `.agents/contexts/session-index.md` are the live runtime continuity layer.

## Capsule Rules
- `capsules/` contains task-class operating packs that combine context assembly, examples, anti-patterns, critics, graders, and learning policies.
- Use a capsule when the task is substantial enough that better context assembly and critique would materially change the outcome.
- For substantial creative or API workflow tasks, select a capsule before planning or implementation.

## Rule Card Rules
- Reusable workflow policy should live in `rules/common/` instead of being duplicated across prompts and commands.
- Use the output-quality gate rule before substantial creative work or API work where specificity and non-generic output matter.
- Use the learning-loop rule after explicit user correction, critic rejection, or eval failure.
- Use the expert-agent routing rule before delegating substantial workflow tasks to specialist agents.
- Use `node ./scripts/expert-agent-routing-tools.mjs route --input "<task>"` when the correct expert is not obvious from the request.

## Adapter Rules
- `adapters/` contains provider-specific operational assets such as hooks, statuslines, and settings helpers.
- Provider adapters must not redefine canonical workflow policy that belongs in `prompts/`, `contexts/`, `commands/`, or `rules/common/`.

## Session Rules
- Use project-local `.agents/sessions/` for ordinary workflow continuity across sessions.
- Keep handoffs under `thoughts/shared/handoffs/` as shared transfer artifacts, not as the normal session path.

## XML Source
- Canonical optimized policy: [AGENTS.xml](/Users/isaiahrivera/.agents/AGENTS.xml)
- Keep this Markdown file stable for compatibility checks and adapter entrypoints.
