import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredFiles = [
  'AGENTS.md',
  'prompts/system.md',
  'contexts/decisions.md',
  'contexts/state.md',
  'contexts/research-index.md',
  'contexts/session-index.md',
  'contexts/tooling.md',
  'contexts/verification.md',
  'contexts/artifacts.md',
  'contexts/agent-catalog.md',
  'contexts/ui-ux.md',
  'rules/common/discovery-levels.md',
  'rules/common/decision-fidelity.md',
  'rules/common/search-first.md',
  'rules/common/learning-capture.md',
  'rules/common/expert-agent-routing.md',
  'rules/common/prompt-optimization-routing.md',
  'rules/common/workflow-router.md',
  'rules/common/package-manager-detection.md',
  'rules/common/session-continuity.md',
  'rules/common/ui-ux-routing.md',
  'rules/common/verification-automation.md',
  'rules/common/artifact-retrieval.md',
  'adapters/claude-code/README.md',
  'adapters/codex-cli/README.md',
  'adapters/opencode/README.md',
  'adapters/antigravity/README.md',
  'adapters/openclaw/README.md',
  'adapters/openclaw/templates/AGENTS.md',
  'adapters/openclaw/templates/SOUL.md',
  'adapters/openclaw/templates/USER.md',
  'adapters/openclaw/templates/TOOLS.md',
  'hooks/gsd-check-update.js',
  'hooks/gsd-statusline.js',
  'commands/session-start.md',
  'commands/session-status.md',
  'commands/pause-session.md',
  'commands/resume-session.md',
  'commands/project-tooling.md',
  'commands/project-verification.md',
  'commands/project-artifacts.md',
  'scripts/session-tools.mjs',
  'scripts/package-manager-tools.mjs',
  'scripts/workflow-router-tools.mjs',
  'scripts/verification-tools.mjs',
  'scripts/artifact-tools.mjs'
];

const requiredHeadings = new Map([
  ['contexts/decisions.md', ['## Decisions', '## Deferred Ideas', "## Claude's Discretion", '## Open Questions']],
  ['contexts/state.md', ['## Current Workflow', '## Current Phase', '## Next Step', '## Blockers', '## Last Verified At', '## Related Plan', '## Active Artifact Working Set', '### Selected By Category', '### Ordered Artifacts']],
  ['contexts/research-index.md', ['## Entries', '## Entry Template']],
  ['contexts/session-index.md', ['## Active Sessions', '## Recent Sessions', '## Entry Template']],
  ['contexts/tooling.md', ['## Package Manager', '## Notes']],
  ['contexts/verification.md', ['## Available Checks', '## Preferred Order', '## Command Source', '## Notes']],
  ['contexts/artifacts.md', ['## Sources', '## Preferred Retrieval Order', '## Notes']],
  ['contexts/agent-catalog.md', ['## Agent Classes', '## Workflow Experts', '## Routing Defaults', '## Constraints']],
  ['contexts/ui-ux.md', ['## Intent', '## Audience', '## Visual Direction', '## Constraints', '## Required States', '## Selected Skill']]
]);

const adapterReadmeHeadings = new Map([
  ['adapters/claude-code/README.md', ['# Claude Code Adapter', '## Capability Profile', '## Canonical Boundary']],
  ['adapters/codex-cli/README.md', ['# Codex CLI Adapter', '## Managed Surface', '## Capability Profile', '## Canonical Boundary']],
  ['adapters/opencode/README.md', ['# OpenCode Adapter', '## Managed Surfaces', '## Capability Profile', '## Generator Contract', '## Canonical Boundary']],
  ['adapters/antigravity/README.md', ['# Antigravity Adapter', '## Managed Surfaces', '## Capability Profile', '## Generator Contract', '## Canonical Boundary']],
  ['adapters/openclaw/README.md', ['# OpenClaw Adapter', '## Managed Surfaces', '## Capability Profile', '## Local-Only Surfaces', '## Canonical Boundary']]
]);

const commandContracts = new Map([
  ['commands/create-plan.md', ['~/.agents/contexts/decisions.md', '~/.agents/contexts/research-index.md', "current project's runtime `state.md`", 'scripts/workflow-router-tools.mjs score']],
  ['commands/implement_plan.md', ["current project's `state.md`", '~/.agents/contexts/decisions.md', 'rules/common/workflow-router.md']],
  ['commands/validate_plan.md', ["current project's `state.md`", '~/.agents/contexts/decisions.md']],
  ['commands/research_codebase.md', ['~/.agents/contexts/research-index.md', '~/.agents/contexts/decisions.md', 'scripts/workflow-router-tools.mjs capture']],
  ['commands/session-start.md', ["current project's `session-index.md`", "current project's `state.md`"]],
  ['commands/session-status.md', ["current project's `session-index.md`", "current project's `state.md`"]],
  ['commands/pause-session.md', ["current project's `session-index.md`", "current project's `state.md`"]],
  ['commands/resume-session.md', ["current project's `session-index.md`", "current project's `state.md`", '~/.agents/contexts/research-index.md']],
  ['commands/project-tooling.md', ['~/.agents/contexts/tooling.md', 'scripts/package-manager-tools.mjs']],
  ['commands/project-verification.md', ['~/.agents/contexts/verification.md', 'scripts/verification-tools.mjs']],
  ['commands/project-artifacts.md', ["current project's `artifacts.md`", '~/.agents/contexts/research-index.md', 'scripts/artifact-tools.mjs']]
]);

const handoffContracts = new Map([
  ['commands/create-handoff.md', ['~/.agents/thoughts/shared/handoffs/', "current project's `state.md`", "current project's `session-index.md`", 'scripts/artifact-tools.mjs persist']],
  ['commands/resume-handoff.md', ['~/.agents/thoughts/shared/handoffs/', '.planning/plans', '.planning/research']]
]);

const explicitOutputContracts = new Map([
  ['commands/research_codebase.md', ['/create-plan /absolute/path/to/research.md']],
  ['commands/create-handoff.md', ['Use the exact absolute handoff path written in the current run.', '/resume_handoff path/to/handoff.md']],
  ['commands/implement_plan.md', ['/validate_plan /absolute/path/to/plan.md']]
]);

const continuityContracts = new Map([
  ['AGENTS.md', ['project-local `.agents/sessions/`', 'thoughts/shared/handoffs/']],
  ['rules/common/artifact-retrieval.md', ['.agents/sessions/', 'thoughts/shared/handoffs/']],
  ['contexts/artifacts.md', ['project-local runtime files', '~/.agents/thoughts/shared/handoffs']],
  ['contexts/session-index.md', ['project-local lightweight work sessions', 'Shared/global handoffs']],
  ['commands/session-start.md', ['ordinary pause/resume continuity', ".agents/sessions/general/YYYY-MM-DD_HH-MM-SS_slug.md"]],
  ['commands/resume-session.md', ['project-local session artifacts', 'shared/global transfer artifact']],
  ['commands/project-artifacts.md', ['handoffs remain shared/global transfer artifacts']]
]);

let hasError = false;

const stateHeadings = requiredHeadings.get('contexts/state.md') ?? [];

function validateWorkingState(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  for (const heading of stateHeadings) {
    if (!content.includes(heading)) {
      console.error(`Missing heading "${heading}" in ${relativePath}`);
      hasError = true;
    }
  }

  const workingSetSections = content.match(/^## Active Artifact Working Set$/gm) ?? [];
  if (workingSetSections.length !== 1) {
    console.error(`Expected exactly one "## Active Artifact Working Set" section in ${relativePath}, found ${workingSetSections.length}`);
    hasError = true;
  }

  for (const heading of ['### Selected By Category', '### Ordered Artifacts']) {
    const matches = content.match(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm')) ?? [];
    if (matches.length !== 1) {
      console.error(`Expected exactly one "${heading}" section in ${relativePath}, found ${matches.length}`);
      hasError = true;
    }
  }
}

for (const relativePath of requiredFiles) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required file: ${relativePath}`);
    hasError = true;
  }
}

for (const [relativePath, headings] of requiredHeadings) {
  if (relativePath === 'contexts/state.md') {
    continue;
  }

  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const heading of headings) {
    if (!content.includes(heading)) {
      console.error(`Missing heading "${heading}" in ${relativePath}`);
      hasError = true;
    }
  }
}

for (const [relativePath, headings] of adapterReadmeHeadings) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const heading of headings) {
    if (!content.includes(heading)) {
      console.error(`Missing adapter heading "${heading}" in ${relativePath}`);
      hasError = true;
    }
  }
}

validateWorkingState('contexts/state.md');

const projectsRoot = path.join(root, 'projects');
if (fs.existsSync(projectsRoot)) {
  for (const entry of fs.readdirSync(projectsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    validateWorkingState(path.join('projects', entry.name, 'contexts', 'state.md'));
  }
}

for (const [relativePath, references] of commandContracts) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const reference of references) {
    if (!content.includes(reference)) {
      console.error(`Missing command contract reference "${reference}" in ${relativePath}`);
      hasError = true;
    }
  }
}

for (const [relativePath, references] of handoffContracts) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const reference of references) {
    if (!content.includes(reference)) {
      console.error(`Missing handoff contract reference "${reference}" in ${relativePath}`);
      hasError = true;
    }
  }
}

for (const [relativePath, references] of explicitOutputContracts) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const reference of references) {
    if (!content.includes(reference)) {
      console.error(`Missing explicit output contract "${reference}" in ${relativePath}`);
      hasError = true;
    }
  }
}

for (const [relativePath, references] of continuityContracts) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const reference of references) {
    if (!content.includes(reference)) {
      console.error(`Missing continuity contract "${reference}" in ${relativePath}`);
      hasError = true;
    }
  }
}

const agentsContent = fs.existsSync(path.join(root, 'AGENTS.md'))
  ? fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8')
  : '';

if (agentsContent.includes('Use `thoughts/sessions/` for ordinary workflow continuity')) {
  console.error('AGENTS.md still references legacy thoughts/sessions continuity for ordinary sessions');
  hasError = true;
}

if (hasError) {
  process.exitCode = 1;
} else {
  console.log('SSOT validation passed.');
}
