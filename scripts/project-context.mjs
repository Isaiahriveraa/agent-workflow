import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const agentsRoot = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWorkingDirectory = process.env.AGENTS_PROJECT_ROOT
  ? path.resolve(process.env.AGENTS_PROJECT_ROOT)
  : process.cwd();

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'project';

const hashProjectRoot = (projectRoot) =>
  crypto.createHash('sha1').update(projectRoot).digest('hex').slice(0, 8);

const findGitRoot = (startDir) => {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
};

const bootstrapFiles = {
  state: `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- none

## Current Phase
- none

## Next Step
- none

## Blockers
- None.

## Last Verified At
- none

## Related Plan
- none

## Active Artifact Working Set
- Last updated: none
- Source: none
- Focus: none

### Selected By Category
- intake: none
- plan: none
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. none
`,
  sessionIndex: `# Session Index

Use this file to track project-local lightweight work sessions for the current project.

Shared/global handoffs are recorded here as transfer points, but they do not replace project-local session artifacts for ordinary pause/resume continuity.

## Active Sessions
- No active sessions recorded.

## Recent Sessions
- No recent sessions recorded.

## Entry Template
- Session ID:
- Date:
- Topic:
- Status:
- Artifact path:
- Related plan:
- Next command:
- Summary:
`,
  artifacts: `# Artifact Retrieval Context

Use this file to describe how the current project's runtime state should select from repo-local and shared workflow artifacts.

Lightweight continuity artifacts are project-local runtime files. Shared/global handoffs are transfer artifacts, not the ordinary pause/resume path.

## Sources
- intake: [project root]/.planning/intake
- plans: ~/.agents/thoughts/plans
- research: [project root]/.planning/research
- sessions: [project root]/.agents/sessions
- handoffs: \`~/.agents/thoughts/shared/handoffs\`

## Preferred Retrieval Order
1. active or explicitly requested intake/session artifact
2. related plan from the current project's state file
3. latest matching repo-local research artifact
4. latest matching shared handoff artifact

## Notes
- Use \`node ./scripts/artifact-tools.mjs suggest\` to retrieve likely relevant artifacts for the current project.
- Use \`node ./scripts/artifact-tools.mjs active\` to inspect the persisted working set for the current project.
- Use \`node ./scripts/artifact-tools.mjs persist --source [command] --focus "[workflow focus]"\` to lock the chosen working set into the current project's state file.
- Prefer persisted session and working-set selections over heuristics when resuming work.
- Use \`node ./scripts/workflow-router-tools.mjs capture\` to persist a substantial-task intake artifact before research or planning.
- Legacy repo-local plan paths under \`[project root]/.planning/plans\` remain readable, but new canonical plans live under \`~/.agents/thoughts/plans\`.
`
};

const ensureFile = (filePath, content) => {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
};

export const getProjectContext = (options = {}) => {
  const workingDirectory = options.cwd
    ? path.resolve(options.cwd)
    : defaultWorkingDirectory;
  const projectRoot = options.projectRoot
    ? path.resolve(options.projectRoot)
    : findGitRoot(workingDirectory);
  const slugBase = process.env.AGENTS_PROJECT_SLUG
    ?? options.projectSlug
    ?? path.basename(projectRoot);
  const projectSlug = `${slugify(slugBase)}-${hashProjectRoot(projectRoot)}`;
  const isAgentsRepo = projectRoot === agentsRoot;
  const projectDir = isAgentsRepo ? agentsRoot : path.join(projectRoot, '.agents');
  const contextsDir = isAgentsRepo ? path.join(agentsRoot, 'contexts') : path.join(projectDir, 'contexts');
  const planningDir = path.join(projectRoot, '.planning');
  const sessionsDir = isAgentsRepo
    ? path.join(agentsRoot, 'sessions', 'general')
    : path.join(projectDir, 'sessions', 'general');

  return {
    agentsRoot,
    projectRoot,
    projectSlug,
    projectDir,
    contextsDir,
    planningDir,
    contextPaths: {
      state: path.join(contextsDir, 'state.md'),
      sessionIndex: path.join(contextsDir, 'session-index.md'),
      artifacts: path.join(contextsDir, 'artifacts.md')
    },
    thoughtPaths: {
      intake: path.join(planningDir, 'intake'),
      plans: path.join(agentsRoot, 'thoughts', 'plans'),
      research: path.join(planningDir, 'research'),
      lessons: path.join(agentsRoot, 'thoughts', 'lessons'),
      sessions: sessionsDir,
      handoffs: path.join(agentsRoot, 'thoughts', 'shared', 'handoffs')
    }
  };
};

export const ensureProjectContext = (options = {}) => {
  const context = getProjectContext(options);

  fs.mkdirSync(context.contextsDir, { recursive: true });

  ensureFile(context.contextPaths.state, bootstrapFiles.state);
  ensureFile(context.contextPaths.sessionIndex, bootstrapFiles.sessionIndex);
  ensureFile(context.contextPaths.artifacts, bootstrapFiles.artifacts);

  return context;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? 'current';
  const context = ensureProjectContext();

  if (command === 'current') {
    console.log(JSON.stringify(context, null, 2));
  } else {
    console.error('Usage: node scripts/project-context.mjs [current]');
    process.exitCode = 1;
  }
}
