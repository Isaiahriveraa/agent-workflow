# Research Index

Use this file to track reusable research artifacts so future work can find them without re-reading everything.

## Entries
- Topic: AI workflow consistency, RPI execution order, and continuity awareness
- Date: 2026-03-06
- Source files: prompts/system.md; rules/common/prompt-optimization-routing.md; contexts/decisions.md; commands/research_codebase.md; commands/create-plan.md; commands/implement_plan.md; commands/validate_plan.md; commands/create-handoff.md; commands/resume-handoff.md; commands/pause-session.md; commands/resume-session.md; commands/project-artifacts.md; rules/common/session-continuity.md; contexts/tooling.md; scripts/project-context.mjs; scripts/artifact-tools.mjs; scripts/continuity-tools.mjs; scripts/handoff-tools.mjs; hooks/gsd-context-monitor.js; scripts/validate-ssot.mjs; projects/agents-43142fc2/contexts/state.md; projects/agents-43142fc2/contexts/session-index.md
- Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-06-ai-workflow-consistency-and-continuity.md
- Summary: The repo defines an internal optimization -> research -> plan -> implement -> validate workflow, project-scoped continuity state, and helper-backed checkpoint/handoff automation; live state in this project also shows a duplicated active artifact working-set block, while SSOT validation still passes.

- Topic: Autonomous workflow, drift control, context refresh, and state strictness
- Date: 2026-03-06
- Source files: AGENTS.md; prompts/system.md; commands/create-plan.md; commands/implement_plan.md; commands/create-handoff.md; commands/session-start.md; commands/pause-session.md; commands/resume-session.md; commands/project-artifacts.md; scripts/project-context.mjs; scripts/artifact-tools.mjs; hooks/gsd-context-monitor.js; adapters/claude-code/statusline/gsd-statusline.js; thoughts/plans/2026-03-02-openclaw-workflow-pr-automation.md
- Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-06-autonomous-workflow-drift-control-and-context-refresh.md
- Summary: The repo already has strong RPI, runtime-state, artifact-persistence, and context-warning primitives, but automatic handoff creation, universal state writeback, and universal delegation/skill enforcement are still only partially automated.

- Topic: RPI automation, validation, drift control, and uncertainty handling
- Date: 2026-03-06
- Source files: prompts/system.md; commands/research_codebase.md; commands/create-plan.md; commands/implement_plan.md; commands/validate_plan.md; commands/gsd/plan-phase.md; commands/gsd/research-phase.md; commands/gsd/execute-phase.md; commands/project-verification.md; contexts/tooling.md; contexts/verification.md; agents/gsd-planner.md; agents/gsd-plan-checker.md; agents/gsd-executor.md; agents/gsd-verifier.md; agents/gsd-integration-checker.md; scripts/project-context.mjs; scripts/artifact-tools.mjs; scripts/continuity-tools.mjs; scripts/verification-tools.mjs; hooks/gsd-context-monitor.js
- Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-06-rpi-automation-validation-and-drift-control.md
- Summary: The repo already has direct and GSD-style RPI flows, a second-agent plan checker in the GSD path, verification tooling, and continuity automation; the next leverage point is enforcing those gates more uniformly across the plain command path.

## Entry Template
- Topic:
- Date:
- Source files:
- Artifact path:
- Summary:

- Topic: VPS migration and Docker escape plan for OpenClaw runtime
- Date: 2026-03-07
- Source files: docker-compose.yml; scripts/check-raycast-endpoint.sh; config/openclaw.json; config/openclaw.json.example; config/agents/main/agent/auth-profiles.json; config/cron/jobs.json; config/exec-approvals.json; README.md; README runtime sections.
- Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-07-openclaw-vps-migration-options.md
- Summary: The current OpenClaw setup is hard-wired to Docker service patterns and container paths (`openclaw:local`, `/home/node/...`, `127.0.0.1:18789`), so native VPS deployment should decouple workspace/runtime paths, auth source wiring, and launch mode into a host-managed service unit before removing Compose.

- Topic: Telegram-first NVIDIA planner loop and automation architecture for OpenClaw
- Date: 2026-03-07
- Source files: README.md; docker-compose.yml; config/openclaw.json; config/cron/jobs.json; config/thoughts/shared/research/dominionism-Koda/2026-02-20_00-00-00_ai-prompt-optimization-research.md
- Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-07-telegram-first-nvidia-openclaw-automation.md
- Summary: Revised research strengthens the original Telegram-first NVIDIA/OpenClaw architecture by defining a strict planner-to-OpenClaw handoff contract, separating control plane from worker plane, placing make.com in the approvals/SaaS-integration layer rather than the core reasoning loop, and enumerating the infrastructure, storage, queueing, and credential requirements for durable automation.

- Topic: Hardened Telegram-to-OpenClaw automation plan
- Date: 2026-03-07
- Source files: ~/.claude/plans/joyful-swinging-wilkes.md; docker-compose.yml; README.md; config/openclaw.json; config/cron/jobs.json; config/exec-approvals.json; workspace/AGENTS.md
- Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-07-hardened-telegram-openclaw-automation.md
- Summary: Refines the Telegram-first NVIDIA/OpenClaw architecture around a paranoid security posture, one private OpenClaw gateway per host, externalized durable state and secrets, typed planner-to-OpenClaw contracts, and strict compromise containment so OpenClaw can automate bounded work without becoming the public control plane or a broad blast-radius secret holder.

- Topic: OpenClaw content monetization automation strategy, topology, and risk constraints
- Date: 2026-03-08
- Source files: ~/.claude/plans/zany-chasing-blossom.md; ~/.agents/thoughts/research/2026-03-07-hardened-telegram-openclaw-automation.md; ~/.agents/thoughts/research/2026-03-07-telegram-first-nvidia-openclaw-automation.md; docker-compose.yml; config/openclaw.json; config/cron/jobs.json
- Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-08-openclaw-content-monetization-automation-strategy.md
- Summary: Synthesizes the March 7 planning artifacts into a stronger strategy centered on one hardened OpenClaw gateway with specialist agents, an external orchestrator, approval-gated publishing, monetization-first content selection, platform-policy constraints, and explicit rejection of provider-key quota evasion as a scaling strategy.
