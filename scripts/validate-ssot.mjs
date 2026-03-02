import fs from 'node:fs';
import path from 'node:path';

const root = '/Users/isaiahrivera/.agents';

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
  'contexts/ui-ux.md',
  'rules/common/discovery-levels.md',
  'rules/common/decision-fidelity.md',
  'rules/common/search-first.md',
  'rules/common/learning-capture.md',
  'rules/common/package-manager-detection.md',
  'rules/common/session-continuity.md',
  'rules/common/ui-ux-routing.md',
  'rules/common/verification-automation.md',
  'rules/common/artifact-retrieval.md',
  'adapters/claude-code/README.md',
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
  ['contexts/ui-ux.md', ['## Intent', '## Audience', '## Visual Direction', '## Constraints', '## Required States', '## Selected Skill']]
]);

const commandContracts = new Map([
  ['commands/create-plan.md', ['~/.agents/contexts/decisions.md', '~/.agents/contexts/research-index.md', '~/.agents/contexts/state.md']],
  ['commands/implement_plan.md', ['~/.agents/contexts/state.md', '~/.agents/contexts/decisions.md']],
  ['commands/validate_plan.md', ['~/.agents/contexts/state.md', '~/.agents/contexts/decisions.md']],
  ['commands/research_codebase.md', ['~/.agents/contexts/research-index.md', '~/.agents/contexts/decisions.md']],
  ['commands/session-start.md', ['~/.agents/contexts/session-index.md', '~/.agents/contexts/state.md']],
  ['commands/session-status.md', ['~/.agents/contexts/session-index.md', '~/.agents/contexts/state.md']],
  ['commands/pause-session.md', ['~/.agents/contexts/session-index.md', '~/.agents/contexts/state.md']],
  ['commands/resume-session.md', ['~/.agents/contexts/session-index.md', '~/.agents/contexts/state.md']],
  ['commands/project-tooling.md', ['~/.agents/contexts/tooling.md', 'scripts/package-manager-tools.mjs']],
  ['commands/project-verification.md', ['~/.agents/contexts/verification.md', 'scripts/verification-tools.mjs']],
  ['commands/project-artifacts.md', ['~/.agents/contexts/artifacts.md', 'scripts/artifact-tools.mjs']]
]);

let hasError = false;

for (const relativePath of requiredFiles) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required file: ${relativePath}`);
    hasError = true;
  }
}

for (const [relativePath, headings] of requiredHeadings) {
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

if (hasError) {
  process.exitCode = 1;
} else {
  console.log('SSOT validation passed.');
}
