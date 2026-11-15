# Agents Workflow Hub

Shared operating contract for thinking, learning, research, and coding across terminal agents. Commands, agents, skills, and adapters live here. Machine-local state does not.

## About

`AGENTS.md` selects a session profile before loading a workflow. Adapters bridge tool ergonomics; coding delivery loads its detailed contract only when needed. The previous coding rules are preserved in `references/coding-contract.md`.

The hub serves Claude Code, Codex CLI, OpenCode, Antigravity/Gemini, and Cursor CLI from the same commands, agents, and skills.

```
┌──────────────────────────────┐
│  Claude Code                 │
│  Codex CLI / OpenCode        │
│  Antigravity / Gemini        │
└──────────┬───────────────────┘
           │
┌──────────▼───────────────────┐
│  adapters/                   │  tool-specific ergonomics
│  (symlinks, wrappers, gen)   │  same contract underneath
└──────────┬───────────────────┘
           │
┌──────────▼───────────────────┐
│  AGENTS.md                   │  single source of truth
│  commands/  agents/ skills/  │  shared workflow contract
│  scripts/  manifest.json     │
└──────────────────────────────┘
```

## Session modes

Run these from the directory you want to work in. Each starts an independent
session; it does not swap shared files or change another terminal's mode.

```sh
sprint                    # attempt-first engineering, defaults to Pi
ideation                  # attempt-first problems and solution options
school-learn              # attempt-first course learning
school-fast               # organize and complete assignment work
research                  # concise, evidence-based answers
coding                    # ordinary agent-written software delivery
aw tutor                  # hands-on coaching: I write the code, the agent coaches
sprint --harness claude    # Claude Code
sprint --harness codex     # Codex CLI
```

The executable aliases point to `scripts/workflow-session.mjs`. Without aliases,
use `node ~/.agents/scripts/workflow-session.mjs sprint`, or `aw sprint`.
Set `AGENT_HARNESS=pi|claude|codex` to choose a default. Place `--harness` immediately
after the mode (or first after an alias); remaining arguments pass through to the
harness. The launcher appends only the mode's profile; the harness already loads
`AGENTS.md` itself.

Sprint and Ideation use one 3–5 minute attempt at a time, capped at 10 minutes
unless requested. The agent gives one concrete task and waits before revealing a
solution. Your existing voice dump or notes can count as the attempt. Afterward,
it synthesizes your reasoning, identifies one gap, and helps you revise. Explicit
hints, examples, and bounded delegation remain available. School Learn adapts
this loop to course material; School Fast does not impose tutoring.

Inside a session, say "switch to sprint", "school learn", "school fast",
"research mode", "ideation mode", "tutor mode", or "coding mode". A bounded request such as
"research this API" stays inside the current mode and returns to the pending
question. Switching is instruction-based, not a harness-native command or a
mechanical guarantee that a model will obey. Existing sessions may retain older
loaded instructions; explicitly ask them to reread `~/.agents/AGENTS.md`.

For an actual local countdown, open `~/.agents/profiles/timer.html` in a browser
(`open ~/.agents/profiles/timer.html` on macOS), select the duration, and click
Start. It needs no server or dependencies. It does not send system notifications
or communicate with the agent. HTML flow diagrams should likewise stay small and
self-contained.

The launchers add the shared contract and selected profile to Pi/Claude system
instructions or Codex developer instructions. They do not disable project rules,
permissions, hooks, extensions, or skill discovery. Other installed hooks and
stale adapter copies can still add context; this is not a claim that all harness
startup overhead has been removed. Relevant repository safety still applies.

## Coding workflow

Product work runs one outcome at a time, with a GitHub Project per product as the source of truth. The full contract is `references/workflow.md`.

```
/design   frame the problem (invest / explore / defer / stop)
          → overview: vision, goals, scope, MoSCoW, flow, domain, slices
/to-issues split into behavior tickets + CRUD check
          → I approve the split → sub-issues on the Project
/plan     when a ticket is taken: implementation plan against today's code
          → I approve → build
/implement TDD → code-judgment → review per speed → my feedback → commit / PR

or, for direct requests: Quick / Small / Full speed per AGENTS.md
```

Tickets say what and why (user story, user flow, edge cases, acceptance criteria) and never how. Nothing technical is planned until a ticket is taken; an unknown becomes a Research ticket that ends in a decision. Drafts and plans live in the ignored `context/` folder and are never referenced from issues, PRs, or commits.

| Stage | Skill | Output |
|---|---|---|
| Frame + overview | `design` | Problem brief and overview → the parent issue |
| Tickets | `to-issues` | Behavior tickets as sub-issues with "blocked by" links on the Project |
| Research | `/research [ticket or question]` | A decision for a Research ticket, or a cited answer |
| Plan | `/plan [ticket]` | Implementation plan in `context/plans/<slug>/`, answering each acceptance criterion |
| Build | `/implement [ticket]` | The change, tested and reviewed per speed, with the card moved along |

## Hooks

`hooks/` holds the Claude Code hooks registered in `~/.claude/settings.json`:

| Hook | What it does |
|---|---|
| `guard-destructive-bash.cjs` | Stops force pushes, hard resets, forced git cleans, and recursive forced deletes until I approve them |
| `board-stamp.sh` | Stamps each prompt on the tab's Herdr board |
| `herdr-agent-state.sh` | Reports agent state to Herdr; Herdr installs and overwrites it |

## Adapters

Each AI tool connects through an adapter directory:

| Adapter | Tool | Entry Point |
|---------|------|-------------|
| `adapters/claude-code/` | Claude Code | `~/.claude/CLAUDE.md` → adapter bridge → `~/.agents/AGENTS.md` |
| `adapters/codex-cli/` | Codex CLI | Config under `~/.codex/` |
| `adapters/opencode/` | OpenCode | Native config discovery |
| `adapters/antigravity/` | Antigravity / Gemini | `GEMINI.md` bridge |
| `adapters/cursor-cli/` | Cursor CLI | `~/.cursor/rules/hub-contract.mdc` → `AGENTS.md` |

Adapters change ergonomics, not behavior. Source of truth stays in this repo.

`sync.sh migrate` regenerates all adapter outputs and verifies parity.

## Herdr app

I run my agents inside [Herdr](https://herdr.dev), a desktop app for terminals and coding agents (`herdr-app` for the window, `hc` for herdr-core). This repo holds the Herdr pieces my workflow depends on:

| Path | What it is | Installed as |
|---|---|---|
| `herdr/mods/board/` | Board mod: a catch-up panel with one row per tab (goal, current step, next step, blockers, a short log of milestones and decisions) plus an archive of closed tabs. | symlink `~/.config/herdr-app/mods/board` |
| `herdr/scripts/board.mjs` | The command agents use to write a tab's board (`set --goal --now --log --decision ...`) | symlink `~/.config/herdr/scripts/board.mjs` |
| `skills/board/` | Tells agents when to update the board and what is worth logging | via the skills symlink |
| `hooks/board-stamp.sh` | UserPromptSubmit hook: stamps each prompt on the tab's board | via the hooks symlink; registered in `~/.claude/settings.json` |
| `herdr/opencode/board-stamp.js` | The same prompt stamp for opencode, as a plugin | symlink `~/.config/opencode/plugins/board-stamp.js` |

Install the board in your own Herdr:

```bash
ln -s ~/.agents/herdr/mods/board ~/.config/herdr-app/mods/board
mkdir -p ~/.config/herdr/scripts && ln -s ~/.agents/herdr/scripts/board.mjs ~/.config/herdr/scripts/board.mjs
herdr-app check ~/.config/herdr-app/mods/board
```

Then add a `board` block to one of your layouts, beside the tab block (use your panes' border color so it matches them):

```json
{ "id": "board", "type": "block", "content": { "mod": "board" }, "size": { "px": 360 },
  "background": "background", "border": { "width": 1, "color": "#33363b" }, "radius": 12 }
```

And register `hooks/board-stamp.sh` as a UserPromptSubmit hook in your agent's settings. Tests: `node --test herdr/scripts/board.test.mjs herdr/mods/board/tests/`.

## Skills

Skills live in `skills/` covering the full pipeline and domain specialties. Key pipeline skills:

| Skill | Role |
|-------|------|
| `caveman/` | Explicit concise, answer-first style; ordinary chat uses the shared contract's concise defaults without mandatory skill reads. `normal mode` disables the style; `/caveman` enables it |
| `human/` | Explicit natural-writing guidance; `/human` writes, rewrites, or audits text while preserving facts and voice. Ordinary chat uses natural defaults without mandatory skill reads |
| `prototype/` | Optional discovery for an unclear flow or finished-quality comparisons of competing UI designs; not required for an agreed production direction. Keep production approval separate |
| `design/` | Frame the problem (invest, explore, defer, stop) and write the what-and-why overview that becomes the parent issue |
| `to-issues/` | Split an approved overview into behavior tickets and create them on the product's GitHub Project once the split is approved |
| `jira-tpm/` (`~/.codex/skills`) | Organize Jira backlogs with actionable tickets, meaningful priorities, appropriate subtasks, real dependencies, and verified status |
| `plan/` | Implementation plan for a taken ticket or a direct Full request, against current code; approval means build |
| `plan-standup-notes/` | Existing plan → compact iPad learning notes, standup narrative, and production tradeoffs |
| `issue-discovery/` | Record a product or engineering decision as a GitHub decision issue; behavior changes go through `/design` |
| `to-spec/` | Conversation → local spec draft; issue publication requires separate exact-content approval |
| `improve/` | Read-only codebase survey → prioritized executor-ready plans |
| `research/` | Standalone questions use the concise Research profile without a delivery queue; queued coding investigations retain their selection and evidence rules |
| `brag/` | Create a project-specific launch video with Hyperframes (`/skill:brag`) |
| `implement/` | Explicit or next eligible approved slice → worktree → TDD → code-judgment → code-review → human gates; refresh queue |
| `wait-what/` | 3-line verbosity corrective |
| `tdd/` | Red-green-refactor with seam discipline |
| `code-review/` | Start at `SKILL.md` for shared policy and stage-specific references. Adversarial review that triages the diff and spawns only the reviewers it needs (`--runner subagents\|opencode\|omp`, default: ask), and adjudication of behavioral and evidenced readability/design findings. The existing `complexity-reviser` directly performs authorized scoped test cleanup with retrospective evidence; unrelated design revisions retain proposal → parent evaluation/authorization → behavior-preserving implementation → tests and fresh independent validation. Fresh independent validation also follows automatic cleanup. No overlapping agent; review-only, `--no-revise`, and implementation ownership boundaries remain. Behavior changes need user approval, including hardener fixes. External runners return observe-only reports; OpenCode uses `scripts/opencode-review.mjs`, OMP uses verified installed Herdr/CLI dispatch |
| `code-judgment/` | Behavior-preserving cleanup before review: dead code, YAGNI, names, comments, module shape, cohesion/coupling; includes authorized automatic test cleanup with retrospective Keep / Rewrite / Delete evidence and behavior contracts over implementation pins |
| `pair-reviewer/` | Interactive reading partner for a branch or worktree the user names: resolves the target, gathers its plan, commit history, and code, then talks through the answers in 2-5 sentences and stops, critiquing only on request (`/skill:pair-reviewer <branch-or-worktree>`); depth follows you — evidence, provenance, and the `REVIEW-THINKING.md` method come when asked; "probe me" withholds a finding behind a location hint so you guess it first; read-only, hands off to `code-review/` for a full adversarial pass |
| `grill-with-docs/` | Relentless interview, glossary + ADRs |
| `domain-modeling/` | Sharpen terminology, ADR management |
| `commit/` | Fast atomic commits, no subagents, for when you are the reviewer. Rules live in `references/` (grouping, messages, edge cases). |
| `commit-review/` | Atomic commits for agent-built work: commit-pr-reviewer approves the exact plan, and an optional code-review gate runs first. Reuses `commit/references/`. |
| `pr/` | Senior developer PR workflow: auto-detects single PR, stacked PRs (gh stack), or parallel worktrees; generates review-ready descriptions focused on rationale and behavior |
| `split-dirty-worktree/` | Oversized dirty tree → mandatory `gh stack` for dependent concerns with a named branch-stack proposal; independent concerns may use separate worktrees. Includes commits per branch; read-only until approved (or end to end in autonomous mode), every PR a draft, then hands off to `commit/` and `pr/` |
| `handoff/` | Session handoff documents |
| `ch/` | Handoff shorthand — /ch as a skill |
| `recall/` | Resume from handoff |
| `recall-worktree/` | Reconstruct dirty work, history, and context freshness for the main agent through a lightweight subagent |
| `later/` | Future improvement notes in `future/` |
| `board/` | Keep each Herdr tab's Board card current: goal, step, next, blockers, and a short log of milestones and decisions |
| `codebase-design/` | Proportionate module, backend, and schema design: ownership, invariants, information hiding, tradeoffs, testability, and cited practitioner guidance |
| `codebase-drill/` | OA-style codebase navigation training |
| `learn-plan/` | Learning-session planning and explanation; human coding practice only when explicitly requested |
| `rederive/` | User-invoked only: re-derive a codebase's design decisions through Socratic problems, repository history, and incremental constraints (`/skill:rederive`) |
| `tutor/` | User-invoked only: adaptive coaching to diagnose the specific gap, trace real code, and use focused explanations or closely matched worked examples |
| `diagnose/` | Bug and performance diagnosis |
| `security-review/` | Team-mode vulnerability research |
| `e2e-testing-patterns/` | Playwright/Cypress testing standards |
| `enforce/` | Review what needs to change (what/why rationale table) → apply it. Gate for delegated work; hygiene pass for existing code |
| `cancel/` | Cancel active modes |
| `prompt-master/` | Prompt engineering |
| `resolving-merge-conflicts/` | Merge conflict resolution |
| `frontend-design/` | Page and application visual direction; prototypes only for unresolved choices |
| `ui-design/` | Familiar interactions, useful skeuomorphism, and visual UI craft |
| `frontend-implement/` | Main agent builds agreed production UI directly; research specialists, checks, cleanup, review, and useful human feedback; prototypes only for uncertainty |
| `design-taste-frontend/` | Anti-slop landing pages, portfolios, and redesigns — brief-first aesthetic inference, strict pre-flight check (leonxlnx/taste-skill) |
| `ui-ux-pro-max/` | Searchable cross-stack UI patterns and accessibility guidance; agreed directions go to authorized production |
| `impeccable/` | Product-interface design, audit, and polish playbooks; comparisons only when useful (pbakaus/impeccable) |
| `framer-motion-animator/` | Framer Motion animations |
| `shadcn/` | shadcn/ui component management |
| `next-best-practices/` | Next.js best practices |
| `performance/` | Web performance optimization |
| `supabase-postgres-best-practices/` | Postgres optimization from Supabase |
| `herdr/` | Control Herdr terminal multiplexer for coding agents |
| `orchestration/` | Delegate approved work to subagents, including splitting a large task into parallel units with self-contained prompts, review, and a correction loop |
| `skill-index/` | Skill router — ask which skill fits |

Plus specialist agents (`agents/`): hardener, qa-runner, codebase-analyzer, codebase-locator, reviewer-behavioral, reviewer-contract, reviewer-maintainability, security-reviewer, adjudicator, fixer, complexity-reviser.

## Directory Structure

```
~/.agents/
├── AGENTS.md              # Source of truth — workflow contract
├── manifest.json          # Hub manifest — symlinks, capabilities
├── package.json           # Node package — scripts
├── sync.sh                # Multi-CLI sync pipeline
├── .skill-lock.json       # Skill registry (tracked)
├── commands/              # Slash commands (ch, later, wf, wf-auto)
├── agents/                # Specialist expert agents
├── skills/                # Workflow + domain skill packs
│   ├── _shared/           # Shared utility modules
│   ├── prototype/          # Throwaway UI prototyping
│   ├── brag/               # Project launch video workflow
│   ├── plan/
│   ├── to-issues/
│   ├── issue-discovery/
│   ├── implement/
│   ├── tdd/
│   ├── code-review/
│   ├── commit/
│   ├── pr/
│   ├── grill-with-docs/
│   ├── domain-modeling/
│   ├── to-spec/
│   ├── improve/
│   ├── handoff/
│   ├── recall/
│   ├── codebase-drill/
│   ├── learn-plan/
│   ├── diagnose/
│   ├── codebase-design/
│   ├── resolving-merge-conflicts/
│   ├── research/
│   ├── prompt-master/
│   ├── frontend-design/
│   ├── frontend-implement/
│   ├── design-taste-frontend/
│   ├── ui-ux-pro-max/
│   ├── impeccable/
│   ├── framer-motion-animator/
│   ├── shadcn/
│   ├── wait-what/
│   └── ...                # Additional domain skills
├── scripts/               # Tooling (init/reset, context paths, worktree helpers, model router)
├── herdr/                 # Herdr app mods and scripts (board)
├── adapters/              # 5 CLI adapter configs
└── .omc/                  # OpenCode project memory (regenerated)
```

## What Gets Shared

- `commands/`, `agents/`, `skills/`, `adapters/`
- `scripts/`, `herdr/`, `manifest.json`, `package.json`, `sync.sh`
- Onboarding docs (`README.md`, `SHARING.md`)

## What Stays Local

- Secrets: `.env`, `.env.local`
- Dependencies: `node_modules/`
- Worktree context: `context/` at the Git worktree root (designs, issue drafts, plans, handoffs, ADRs, and research)

The public repo is inspectable. Credentials, handoffs, live plans, and active project runtime state are intentionally excluded.

## Quick Start

```bash
# Clone into ~/.agents
git clone <this-repo> ~/.agents

# Set up adapter symlinks
cd ~/.agents && bash sync.sh migrate

# Initialize local state
npm run init:local-state
```

Each adapter's README covers tool-specific setup. Start with your tool's directory under `adapters/`.
