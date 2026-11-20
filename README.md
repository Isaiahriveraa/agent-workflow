# Agents Workflow Hub

Use one set of agent instructions, session profiles, and skills across terminal tools. [AGENTS.md](AGENTS.md) defines how agents work; the [writing skill](skills/writing/SKILL.md) defines how they write. Tool settings and project notes stay local.

## Setup

Clone the hub and use the setup notes for your tool:

```sh
git clone https://github.com/Isaiahriveraa/agent-workflow.git ~/.agents
cd ~/.agents
```

[Claude Code](adapters/claude-code/README.md) · [Codex CLI](adapters/codex-cli/README.md) · [OpenCode](adapters/opencode/README.md) · [Antigravity/Gemini](adapters/antigravity/README.md) · [Cursor CLI](adapters/cursor-cli/README.md)

[Pi](#start-a-session) is the default session launcher target. It uses the shared skills without a separate adapter directory.

Once your tools are configured, `bash sync.sh migrate` repairs links in your home directory, regenerates adapter files, and checks them. Read [manifest.json](manifest.json) to see what it manages. Run `bash sync.sh verify` to check without changing files.

From a project worktree, run `node ~/.agents/scripts/init-local-state.mjs` to create local folders for plans, research, and handoffs.

## Start a session

Run the launcher from the directory you want to work in:

```sh
node ~/.agents/scripts/workflow-session.mjs sprint
node ~/.agents/scripts/workflow-session.mjs tutor --harness claude
```

Use `aw sprint` if [`scripts/aw`](scripts/aw) is on your `PATH`. Set `AGENT_HARNESS` to `pi`, `claude`, or `codex` to change the default. Put `--harness` just after the mode to override it for one session. The launcher passes later arguments to the selected tool.

| Mode | Who does what |
|---|---|
| `coding` (default) | The agent implements; you own decisions and approvals. |
| [`sprint`](profiles/sprint.md) | You attempt one engineering problem at a time before the agent offers a solution. |
| [`ideation`](profiles/ideation.md) | You explore the problem and options before settling on a direction. |
| [`school-learn`](profiles/school-learn.md) | You try the course material first; the agent coaches. |
| [`school-fast`](profiles/school-fast.md) | The agent organizes your input and helps complete the assignment. |
| [`research`](profiles/research.md) | The agent checks evidence and gives a short synthesis. |
| [`tutor`](profiles/tutor.md) | You write the code; the agent coaches. |

Modes apply to one session. Say “switch to tutor mode” to change the current conversation without editing shared files. A request like “research this API” does not change the mode.

## Deliver work

Use the speed tiers in [AGENTS.md](AGENTS.md#pick-the-speed-before-coding) for direct requests. **Quick** edits need a relevant check. **Small** fixes start with a failing test. **Full** work needs an approved plan before implementation. Direct requests do not need a GitHub issue.

For product work on a GitHub Project, follow the [delivery contract](references/workflow.md):

1. **[Design](skills/design/SKILL.md):** Frame the problem. The approved overview becomes the parent issue.
2. **[Split](skills/to-issues/SKILL.md):** Draft standalone sub-issues. Each states the change, why it matters, the flowchart, observable completion criteria, and what is out of scope. Approve the split before publishing.
3. **[Plan](skills/plan/SKILL.md):** Plan one taken delivery issue against the current code. Approving the plan authorizes implementation. For a Research issue, use [research](skills/research/SKILL.md) instead and end with a decision.
4. **[Implement](skills/implement/SKILL.md):** Build and verify the change. Move the issue to In review after local checks and review, then to Done once merged and verified. Commit, push, and merge approvals stay separate.

The Project tracks status, priority, and effort. GitHub's native fields track issue type and assignees. Issue relationships track dependencies. Keep drafts and plans in the worktree's ignored `context/` folder; published issues and PRs must stand on their own.

## Find the right instructions

| Start here | For |
|---|---|
| [AGENTS.md](AGENTS.md) | Modes, speed, worktrees, safety, and approvals |
| [Writing skill](skills/writing/SKILL.md) | Replies, docs, commit messages, and GitHub issues |
| [Coding contract](references/coding-contract.md) | Tests, code quality, verification, and commits |
| [Software design](references/software-design.md) | Interfaces, module ownership, and design trade-offs |
| [Skill index](skills/skill-index/SKILL.md) | Find a skill when the task does not already name one |

Browse [skills/](skills/) for the full collection. For motion work, start with [animate](skills/animate/SKILL.md) on the web, [animate-expo](skills/animate-expo/SKILL.md) in Expo, or [review-animations](skills/review-animations/SKILL.md) for existing motion. Reusable commands live in [commands/](commands/) and specialist agent definitions in [agents/](agents/). Availability depends on your tool.

## Verify and share

Run `npm test` for the hub tests.

Share the tracked workflow files, not credentials, tool state, or worktree notes. See [SHARING.md](SHARING.md) before publishing.
