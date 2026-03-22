import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = path.resolve(process.env.HOME ?? path.join(root, '..'));

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
  'contexts/user-taste.md',
  'contexts/failure-patterns.md',
  'contexts/reference-library.md',
  'contexts/lessons-learned.md',
  'rules/common/discovery-levels.md',
  'rules/common/decision-fidelity.md',
  'rules/common/search-first.md',
  'rules/common/learning-capture.md',
  'rules/common/learning-loop.md',
  'rules/common/expert-agent-routing.md',
  'rules/common/output-quality-gate.md',
  'rules/common/prompt-optimization-routing.md',
  'rules/common/workflow-router.md',
  'rules/common/package-manager-detection.md',
  'rules/common/session-continuity.md',
  'rules/common/ui-ux-routing.md',
  'rules/common/verification-automation.md',
  'rules/common/artifact-retrieval.md',
  'capsules/creative-redesign/intent.md',
  'capsules/creative-redesign/assembly.md',
  'capsules/creative-redesign/examples.md',
  'capsules/creative-redesign/anti-patterns.md',
  'capsules/creative-redesign/critic.md',
  'capsules/creative-redesign/grader.md',
  'capsules/creative-redesign/memory-policy.md',
  'capsules/api-workflow/intent.md',
  'capsules/api-workflow/assembly.md',
  'capsules/api-workflow/examples.md',
  'capsules/api-workflow/anti-patterns.md',
  'capsules/api-workflow/critic.md',
  'capsules/api-workflow/grader.md',
  'capsules/api-workflow/memory-policy.md',
  'adapters/claude-code/CLAUDE.md',
  'adapters/claude-code/README.md',
  'adapters/codex-cli/README.md',
  'adapters/opencode/README.md',
  'adapters/antigravity/README.md',
  'adapters/antigravity/GEMINI.md',
  'adapters/openclaw/README.md',
  'adapters/openclaw/templates/AGENTS.md',
  'adapters/openclaw/templates/SOUL.md',
  'adapters/openclaw/templates/USER.md',
  'adapters/openclaw/templates/TOOLS.md',
  'hooks/gsd-check-update.cjs',
  'hooks/gsd-stop-lesson-capture.cjs',
  'hooks/gsd-stop-lesson-capture.js',
  'hooks/gsd-statusline.js',
  'adapters/claude-code/hooks/gsd-stop-lesson-capture.js',
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
  'scripts/workflow-plan-tools.mjs',
  'scripts/lesson-tools.mjs',
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
  ['contexts/ui-ux.md', ['## Intent', '## Audience', '## Visual Direction', '## Constraints', '## References', '## Banned Patterns', '## Differentiation Target', '## Required States', '## Selected Skill', '## Selected Capsule']],
  ['contexts/user-taste.md', ['## Preferred Characteristics', '## Disliked Patterns', '## Recent Confirmations', '## Evidence Threshold', '## Last Updated']],
  ['contexts/failure-patterns.md', ['## Recurring Failure Classes', '## Diagnosis Format', '## Recent Entries', '## Promotion Rules', '## Last Updated']],
  ['contexts/reference-library.md', ['## Approved Sources', '## Reference Entry Format', '## Selection Guidance', '## Last Updated']],
  ['contexts/lessons-learned.md', ['## Active Lessons', '## Lesson Format', '## Writeback Policy', '## Recent Artifacts', '## Last Updated']]
]);

const adapterReadmeHeadings = new Map([
  ['adapters/claude-code/README.md', ['# Claude Code Adapter', '## Capability Profile', '## Canonical Boundary']],
  ['adapters/codex-cli/README.md', ['# Codex CLI Adapter', '## Managed Surface', '## Capability Profile', '## Canonical Boundary']],
  ['adapters/opencode/README.md', ['# OpenCode Adapter', '## Managed Surfaces', '## Capability Profile', '## Generator Contract', '## Canonical Boundary']],
  ['adapters/antigravity/README.md', ['# Antigravity Adapter', '## Managed Surfaces', '## Capability Profile', '## Generator Contract', '## Canonical Boundary']],
  ['adapters/openclaw/README.md', ['# OpenClaw Adapter', '## Managed Surfaces', '## Capability Profile', '## Local-Only Surfaces', '## Canonical Boundary']]
]);

const commandContracts = new Map([
  ['commands/create-plan.md', ['~/.agents/contexts/decisions.md', "current project's runtime `research-index.md`", "current project's runtime `state.md`", 'scripts/workflow-router-tools.mjs score', 'scripts/workflow-plan-tools.mjs sync-child-plans', 'scripts/workflow-artifact-tools.mjs grade-research', 'scripts/workflow-artifact-tools.mjs grade-plan', '~/.agents/contexts/failure-patterns.md', '~/.agents/contexts/lessons-learned.md', 'select and load the relevant capsule', 'scripts/memory-sidecar-adapter.mjs', 'workflow stage `create-plan`', "Do not write advisory recall into the current project's runtime `state.md`, `research-index.md`, or active artifact selections", 'Do not pass advisory recall into `scripts/workflow-artifact-tools.mjs`', 'scripts/workflow-command-decision.mjs evaluate', 'do_more_research', 'run_critic', 'request_user_decision', 'Original Prompt Alignment', 'Research Sufficiency', 'Phase Plan Index', 'one child plan per implementation phase']],
  ['commands/implement_plan.md', ["current project's `state.md`", '~/.agents/contexts/decisions.md', 'rules/common/workflow-router.md', 'scripts/workflow-artifact-tools.mjs grade-plan', 'plan_ready_for_implementation', 'load it before starting work and honor its critic, grader, and memory-policy files', 'scripts/memory-sidecar-adapter.mjs', 'workflow stage `implement-plan`', 'active runtime state and selected artifacts', 'advisory memory recall', 'disabled mode must preserve current behavior', "Do not write advisory recall into the current project's `state.md`, `research-index.md`, session continuity artifacts, or active artifact selections", 'Do not pass advisory recall into `scripts/workflow-artifact-tools.mjs`', 'scripts/workflow-command-decision.mjs evaluate', 'replan', 'capture_lesson', 'request_user_decision', 'Never retry blindly after a verified miss', 'scripts/lesson-tools.mjs capture', 'Phase Plan Index', 'one linked child phase plan per explicit implementation phase', 'read the linked child phase plan for that phase before editing']],
  ['commands/validate_plan.md', ["current project's `state.md`", "current project's `research-index.md`", '~/.agents/contexts/decisions.md', '~/.agents/contexts/lessons-learned.md', '~/.agents/contexts/failure-patterns.md', 'scripts/workflow-artifact-tools.mjs grade-research', 'scripts/workflow-artifact-tools.mjs grade-plan', 'scripts/workflow-command-decision.mjs evaluate', 'request_user_decision', 'capture_lesson', 'scripts/lesson-tools.mjs capture']],
  ['commands/research_codebase.md', ["current project's `research-index.md`", '~/.agents/contexts/decisions.md', 'scripts/workflow-router-tools.mjs capture', 'scripts/workflow-artifact-tools.mjs grade-research', 'research_ready_for_planning']],
  ['commands/session-start.md', ["current project's `session-index.md`", "current project's `state.md`"]],
  ['commands/session-status.md', ["current project's `session-index.md`", "current project's `state.md`"]],
  ['commands/pause-session.md', ["current project's `session-index.md`", "current project's `state.md`"]],
  ['commands/resume-session.md', ["current project's `session-index.md`", "current project's `state.md`", "current project's `research-index.md`"]],
  ['commands/project-tooling.md', ['~/.agents/contexts/tooling.md', 'scripts/package-manager-tools.mjs']],
  ['commands/project-verification.md', ['~/.agents/contexts/verification.md', 'scripts/verification-tools.mjs']],
  ['commands/project-artifacts.md', ["current project's `artifacts.md`", "current project's `research-index.md`", 'scripts/artifact-tools.mjs']]
]);

const handoffContracts = new Map([
  ['commands/create-handoff.md', ['~/.agents/thoughts/shared/handoffs/', "current project's `state.md`", "current project's `session-index.md`", 'scripts/artifact-tools.mjs persist']],
  ['commands/resume-handoff.md', ['~/.agents/thoughts/shared/handoffs/', '~/.agents/thoughts/plans', '.planning/research']]
]);

const explicitOutputContracts = new Map([
  ['commands/research_codebase.md', ['/create-plan /absolute/path/to/research.md']],
  ['commands/create-plan.md', ['Next step', '/implement_plan /absolute/path/to/.agents/thoughts/plans/YYYY-MM-DD-description.md']],
  ['commands/create-handoff.md', ['Use the exact absolute handoff path written in the current run.', 'Next step', '/resume_handoff path/to/handoff.md']],
  ['commands/implement_plan.md', ['Next step', '/validate_plan /absolute/path/to/plan.md']],
  ['commands/validate_plan.md', ['Do not emit a standalone `Next step` command block from this command unless the user explicitly asks for a specific follow-up command.']]
]);

const continuityContracts = new Map([
  ['AGENTS.md', ['project-local `.agents/sessions/`', 'thoughts/shared/handoffs/']],
  ['rules/common/artifact-retrieval.md', ['.agents/sessions/', 'thoughts/shared/handoffs/']],
  ['contexts/artifacts.md', ['project-local runtime files', '~/.agents/thoughts/shared/handoffs']],
  ['contexts/research-index.md', ['shared compatibility document', '[project root]/.agents/contexts/research-index.md']],
  ['contexts/session-index.md', ['shared compatibility document', '[project root]/.agents/contexts/session-index.md', 'Shared/global handoffs']],
  ['commands/session-start.md', ['ordinary pause/resume continuity', ".agents/sessions/general/YYYY-MM-DD_HH-MM-SS_slug.md"]],
  ['commands/resume-session.md', ['project-local session artifacts', 'shared/global transfer artifact']],
  ['commands/project-artifacts.md', ['handoffs remain shared/global transfer artifacts']]
]);

let hasError = false;

function expandHomePath(value) {
  if (value.startsWith('~/.agents')) {
    return path.join(root, value.slice('~/.agents/'.length));
  }
  if (value.startsWith('~/')) {
    return path.join(home, value.slice(2));
  }
  return value;
}

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

const manifestPath = path.join(root, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const claudePromptLink = manifest.symlinks?.find((entry) =>
    entry.tool === 'claude-code' && entry.source === '~/.claude/CLAUDE.md'
  );
  const claudeGsdLink = manifest.symlinks?.find((entry) =>
    entry.tool === 'claude-code' && entry.source === '~/.claude/get-shit-done'
  );

  if (!claudePromptLink) {
    console.error('Manifest is missing the Claude Code CLAUDE.md symlink contract');
    hasError = true;
  } else {
    if (claudePromptLink.target !== '~/.agents/adapters/claude-code/CLAUDE.md') {
      console.error(`Claude Code CLAUDE.md must target ~/.agents/adapters/claude-code/CLAUDE.md, found ${claudePromptLink.target}`);
      hasError = true;
    }

    const claudeEntrypointPath = expandHomePath(claudePromptLink.source);
    const expectedTarget = expandHomePath(claudePromptLink.target);
    if (!fs.existsSync(claudeEntrypointPath)) {
      console.error(`Claude Code entrypoint is missing: ${claudeEntrypointPath}`);
      hasError = true;
    } else {
      const stats = fs.lstatSync(claudeEntrypointPath);
      if (!stats.isSymbolicLink()) {
        console.error(`Claude Code entrypoint must be a symlink: ${claudeEntrypointPath}`);
        hasError = true;
      } else {
        const actualTarget = fs.readlinkSync(claudeEntrypointPath);
        if (actualTarget !== expectedTarget) {
          console.error(`Claude Code entrypoint points to ${actualTarget} but expected ${expectedTarget}`);
          hasError = true;
        }
      }
    }
  }

  if (!claudeGsdLink) {
    console.error('Manifest is missing the Claude get-shit-done symlink contract');
    hasError = true;
  } else {
    if (claudeGsdLink.target !== '~/.agents/get-shit-done') {
      console.error(`Claude get-shit-done must target ~/.agents/get-shit-done, found ${claudeGsdLink.target}`);
      hasError = true;
    }

    const claudeGsdPath = expandHomePath(claudeGsdLink.source);
    const expectedGsdTarget = expandHomePath(claudeGsdLink.target);
    if (!fs.existsSync(claudeGsdPath)) {
      console.error(`Claude get-shit-done surface is missing: ${claudeGsdPath}`);
      hasError = true;
    } else {
      const stats = fs.lstatSync(claudeGsdPath);
      if (!stats.isSymbolicLink()) {
        console.error(`Claude get-shit-done surface must be a symlink: ${claudeGsdPath}`);
        hasError = true;
      } else {
        const actualTarget = fs.readlinkSync(claudeGsdPath);
        if (actualTarget !== expectedGsdTarget) {
          console.error(`Claude get-shit-done surface points to ${actualTarget} but expected ${expectedGsdTarget}`);
          hasError = true;
        }
      }
    }
  }

  const validatedClaudeSettings = manifest.validated_local_contracts?.find((entry) =>
    entry.tool === 'claude-code' && entry.path === '~/.claude/settings.json'
  );
  if (!validatedClaudeSettings) {
    console.error('Manifest is missing the validated Claude settings contract');
    hasError = true;
  }

  const claudeCapabilities = manifest.capabilities?.['claude-code'];
  if (claudeCapabilities?.entrypoint?.contract !== '~/.claude/CLAUDE.md -> ~/.agents/adapters/claude-code/CLAUDE.md') {
    console.error('Manifest Claude Code capability contract does not match the wrapper entrypoint');
    hasError = true;
  }

  const settingsPath = path.join(home, '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    console.error(`Claude settings are missing: ${settingsPath}`);
    hasError = true;
  } else {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const additionalDirectories = Array.isArray(settings.additionalDirectories) ? settings.additionalDirectories : [];
      const permissionsAllow = Array.isArray(settings.permissions?.allow) ? settings.permissions.allow : [];
      const claudeMdFlag = settings.env?.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD;

      if (!additionalDirectories.includes(path.join(home, '.agents'))) {
        console.error(`Claude settings missing additionalDirectories entry for ${path.join(home, '.agents')}`);
        hasError = true;
      }

      if (!permissionsAllow.includes(`Read(${path.join(home, '.agents')}/**)`)) {
        console.error(`Claude settings missing Read(${path.join(home, '.agents')}/**) permission`);
        hasError = true;
      }

      if (claudeMdFlag !== '1') {
        console.error('Claude settings must set env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD to "1"');
        hasError = true;
      }

      const stopHooks = Array.isArray(settings.hooks?.Stop) ? settings.hooks.Stop : [];
      const subagentStopHooks = Array.isArray(settings.hooks?.SubagentStop) ? settings.hooks.SubagentStop : [];
      const hasStopHook = stopHooks.some((matcher) =>
        Array.isArray(matcher.hooks) &&
        matcher.hooks.some((hook) => hook.command === `node "${path.join(home, '.claude', 'hooks', 'gsd-stop-lesson-capture.cjs')}"`)
      );
      const hasSubagentStopHook = subagentStopHooks.some((matcher) =>
        Array.isArray(matcher.hooks) &&
        matcher.hooks.some((hook) => hook.command === `node "${path.join(home, '.claude', 'hooks', 'gsd-stop-lesson-capture.cjs')}"`)
      );

      if (!hasStopHook) {
        console.error('Claude settings missing Stop hook for gsd-stop-lesson-capture.cjs');
        hasError = true;
      }

      if (!hasSubagentStopHook) {
        console.error('Claude settings missing SubagentStop hook for gsd-stop-lesson-capture.cjs');
        hasError = true;
      }
    } catch (error) {
      console.error(`Failed to parse Claude settings: ${settingsPath}`);
      console.error(String(error));
      hasError = true;
    }
  }
}

if (agentsContent.includes('Use `thoughts/sessions/` for ordinary workflow continuity')) {
  console.error('AGENTS.md still references legacy thoughts/sessions continuity for ordinary sessions');
  hasError = true;
}

if (hasError) {
  process.exitCode = 1;
} else {
  console.log('SSOT validation passed.');
}
