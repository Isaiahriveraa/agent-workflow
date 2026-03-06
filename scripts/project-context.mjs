import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const agentsRoot = '/Users/isaiahrivera/.agents';
// Tests can override the runtime projects root so disposable state stays in /tmp
// instead of accumulating under ~/.agents/projects.
const projectsRoot = process.env.AGENTS_PROJECTS_ROOT
  ? path.resolve(process.env.AGENTS_PROJECTS_ROOT)
  : path.join(agentsRoot, 'projects');
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
- plan: none
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. none
`,
  sessionIndex: `# Session Index

Use this file to track resumable work sessions for the current project.

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

Use this file to describe how the current project's runtime state should select from shared/global workflow artifacts.

## Sources
- plans: ~/.agents/thoughts/plans
- research: ~/.agents/thoughts/research
- sessions: [project thoughts]/sessions
- handoffs: ~/.agents/thoughts/shared/handoffs

## Preferred Retrieval Order
1. active or explicitly requested session artifact
2. related plan from the current project's state file
3. latest matching shared research artifact
4. latest matching shared handoff artifact

## Notes
- Use \`node ./scripts/artifact-tools.mjs suggest\` to retrieve likely relevant artifacts for the current project.
- Use \`node ./scripts/artifact-tools.mjs active\` to inspect the persisted working set for the current project.
- Use \`node ./scripts/artifact-tools.mjs persist --source [command] --focus "[workflow focus]"\` to lock the chosen working set into the current project's state file.
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
  const projectDir = path.join(projectsRoot, projectSlug);
  const contextsDir = path.join(projectDir, 'contexts');
  const thoughtsDir = path.join(projectDir, 'thoughts');

  return {
    agentsRoot,
    projectRoot,
    projectSlug,
    projectDir,
    contextsDir,
    thoughtsDir,
    contextPaths: {
      state: path.join(contextsDir, 'state.md'),
      sessionIndex: path.join(contextsDir, 'session-index.md'),
      artifacts: path.join(contextsDir, 'artifacts.md')
    },
    thoughtPaths: {
      plans: path.join(agentsRoot, 'thoughts', 'plans'),
      research: path.join(agentsRoot, 'thoughts', 'research'),
      sessions: path.join(thoughtsDir, 'sessions', 'general'),
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
