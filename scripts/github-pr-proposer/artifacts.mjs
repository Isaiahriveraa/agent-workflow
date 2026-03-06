#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const agentsRoot = process.env.GITHUB_PR_PROPOSER_AGENTS_ROOT
  ? path.resolve(process.env.GITHUB_PR_PROPOSER_AGENTS_ROOT)
  : '/Users/isaiahrivera/.agents';
const workspaceRoot = process.env.GITHUB_PR_PROPOSER_WORKSPACE_ROOT
  ? path.resolve(process.env.GITHUB_PR_PROPOSER_WORKSPACE_ROOT)
  : '/home/node/.openclaw/workspace';
const runtimeProfile = process.env.GITHUB_PR_PROPOSER_RUNTIME_PROFILE?.trim() || 'shared-strict';
const localArtifactRoot = process.env.GITHUB_PR_PROPOSER_ARTIFACT_ROOT
  ? path.resolve(process.env.GITHUB_PR_PROPOSER_ARTIFACT_ROOT)
  : path.join(workspaceRoot, 'autonomy', 'github-pr-proposer', 'items');
const localHostArtifactRoot = process.env.GITHUB_PR_PROPOSER_HOST_ARTIFACT_ROOT
  ? path.resolve(process.env.GITHUB_PR_PROPOSER_HOST_ARTIFACT_ROOT)
  : localArtifactRoot;
const sharedArtifactRoots = {
  research: path.join(agentsRoot, 'thoughts', 'research', 'github-pr-proposer'),
  plan: path.join(agentsRoot, 'thoughts', 'plans', 'github-pr-proposer'),
  handoff: path.join(agentsRoot, 'thoughts', 'shared', 'handoffs', 'github-pr-proposer')
};
const localArtifactKinds = {
  research: 'research.md',
  plan: 'plan.md',
  handoff: 'handoff.md'
};

const emit = (payload, exitCode = 0) => {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
};

const fail = (message, extra = {}) => emit({ ok: false, error: message, ...extra }, 1);

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80) || 'item';

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const assertSharedCanonicalPath = (targetPath) => {
  const resolved = path.resolve(targetPath);

  if (resolved.startsWith(workspaceRoot)) {
    throw new Error(`Workspace-local artifact path is not allowed: ${resolved}`);
  }

  const allowed = Object.values(sharedArtifactRoots).some((root) => resolved.startsWith(path.resolve(root)));
  if (!allowed) {
    throw new Error(`Artifact path must live under a canonical github-pr-proposer root: ${resolved}`);
  }

  return resolved;
};

const assertOpenClawLocalPath = (targetPath) => {
  const resolved = path.resolve(targetPath);
  const allowedRoot = path.resolve(localArtifactRoot);

  if (!resolved.startsWith(allowedRoot)) {
    throw new Error(`Artifact path must live under the openclaw-local artifact root: ${resolved}`);
  }

  return resolved;
};

const toHostPath = (containerPath) => {
  const relativePath = path.relative(path.resolve(localArtifactRoot), containerPath);
  return path.resolve(localHostArtifactRoot, relativePath);
};

const buildSharedPath = (kind, repo, pageId) => {
  const repoSlug = slugify(repo);
  const safePageId = slugify(pageId);
  const baseDir = ensureDir(path.join(sharedArtifactRoots[kind], repoSlug));
  return assertSharedCanonicalPath(path.join(baseDir, `${safePageId}.md`));
};

const buildOpenClawLocalPath = (kind, _repo, pageId) => {
  const safePageId = slugify(pageId);
  const baseDir = ensureDir(path.join(localArtifactRoot, safePageId));
  const containerPath = assertOpenClawLocalPath(path.join(baseDir, localArtifactKinds[kind]));

  return {
    containerPath,
    hostPath: toHostPath(containerPath)
  };
};

const parseArgs = (argv) => {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    parsed[arg.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
};

const main = () => {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  if (command === 'validate-canonical-path') {
    if (!args.path) {
      fail('Missing required --path argument');
      return;
    }

    try {
      const pathInfo = runtimeProfile === 'openclaw-local'
        ? {
            path: assertOpenClawLocalPath(args.path),
            containerPath: assertOpenClawLocalPath(args.path),
            hostPath: toHostPath(path.resolve(args.path))
          }
        : {
            path: assertSharedCanonicalPath(args.path)
          };
      emit({
        ok: true,
        command,
        runtimeProfile,
        ...pathInfo
      });
    } catch (error) {
      fail(error.message, { command, path: args.path, runtimeProfile });
    }
    return;
  }

  const commandMap = {
    'resolve-research': 'research',
    'resolve-plan': 'plan',
    'resolve-handoff': 'handoff'
  };
  const kind = commandMap[command];

  if (!kind) {
    fail('Usage: node artifacts.mjs <resolve-research|resolve-plan|resolve-handoff|validate-canonical-path> [--repo owner/name --page-id notion-id]');
    return;
  }

  if (!args.repo || !args['page-id']) {
    fail('Missing required --repo or --page-id argument', { command });
    return;
  }

  try {
    const payload = runtimeProfile === 'openclaw-local'
      ? buildOpenClawLocalPath(kind, args.repo, args['page-id'])
      : { path: buildSharedPath(kind, args.repo, args['page-id']) };
    emit({
      ok: true,
      command,
      kind,
      runtimeProfile,
      repo: args.repo,
      pageId: args['page-id'],
      ...payload
    });
  } catch (error) {
    fail(error.message, { command, repo: args.repo, pageId: args['page-id'], runtimeProfile });
  }
};

main();
