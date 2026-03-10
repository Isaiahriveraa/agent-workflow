import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const exampleRepo = 'example-owner/example-repo';
const exampleRepoSlug = 'example-owner-example-repo';

const run = (script, args = [], options = {}) =>
  execFileSync('node', [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env
    }
  });

const withTempGithubPrProposerRoots = (fn) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'github-pr-proposer-'));
  const agentsRoot = path.join(tempRoot, 'agents');
  const workspaceRoot = path.join(tempRoot, 'workspace');

  fs.mkdirSync(path.join(agentsRoot, 'thoughts', 'research'), { recursive: true });
  fs.mkdirSync(path.join(agentsRoot, 'thoughts', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(agentsRoot, 'thoughts', 'shared', 'handoffs'), { recursive: true });
  fs.mkdirSync(workspaceRoot, { recursive: true });

  try {
    return fn({
      GITHUB_PR_PROPOSER_AGENTS_ROOT: agentsRoot,
      GITHUB_PR_PROPOSER_WORKSPACE_ROOT: workspaceRoot
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
};

test('github-pr-proposer skill requires canonical helper scripts and forbids workspace-local artifacts', () => {
  const content = fs.readFileSync(path.join(root, 'skills', 'github-pr-proposer', 'SKILL.md'), 'utf8');

  assert.match(content, /scripts\/github-pr-proposer\/notion\.mjs/);
  assert.match(content, /scripts\/github-pr-proposer\/github-read\.mjs/);
  assert.match(content, /scripts\/github-pr-proposer\/github-write\.mjs/);
  assert.match(content, /scripts\/github-pr-proposer\/artifacts\.mjs/);
  assert.match(content, /be invoked only as `node ~\/\.agents\/scripts\/github-pr-proposer\/<helper>\.mjs \.\.\.`/);
  assert.doesNotMatch(content, /executable CLI/);
  assert.match(content, /\.agents\/thoughts\/research\/github-pr-proposer/);
  assert.match(content, /\.agents\/thoughts\/plans\/github-pr-proposer/);
  assert.match(content, /openclaw-local/);
  assert.match(content, /workspace\/autonomy\/github-pr-proposer\/items/);
  assert.match(content, /up to 3 attempts per phase/);
  assert.match(content, /Partial implementation is an error/);
  assert.match(content, /do not open a PR/);
  assert.match(content, /Reuse that exact branch string in every later artifact, Notion update, commit, push, handoff, and summary/);
  assert.doesNotMatch(content, /select-item/);
});

test('artifact helper resolves canonical research, plan, and handoff paths', () => {
  withTempGithubPrProposerRoots((env) => {
    const research = JSON.parse(run('scripts/github-pr-proposer/artifacts.mjs', [
      'resolve-research',
      '--repo', exampleRepo,
      '--page-id', '311da0f2-ab8c-8089-b40b-fcae833befa8'
    ], { env }));
    const plan = JSON.parse(run('scripts/github-pr-proposer/artifacts.mjs', [
      'resolve-plan',
      '--repo', exampleRepo,
      '--page-id', '311da0f2-ab8c-8089-b40b-fcae833befa8'
    ], { env }));
    const handoff = JSON.parse(run('scripts/github-pr-proposer/artifacts.mjs', [
      'resolve-handoff',
      '--repo', exampleRepo,
      '--page-id', '311da0f2-ab8c-8089-b40b-fcae833befa8'
    ], { env }));

    assert.equal(research.ok, true);
    assert.match(research.path, new RegExp(`/thoughts/research/github-pr-proposer/${exampleRepoSlug}/311da0f2-ab8c-8089-b40b-fcae833befa8\\.md$`));
    assert.equal(plan.ok, true);
    assert.match(plan.path, new RegExp(`/thoughts/plans/github-pr-proposer/${exampleRepoSlug}/311da0f2-ab8c-8089-b40b-fcae833befa8\\.md$`));
    assert.equal(handoff.ok, true);
    assert.match(handoff.path, new RegExp(`/thoughts/shared/handoffs/github-pr-proposer/${exampleRepoSlug}/311da0f2-ab8c-8089-b40b-fcae833befa8\\.md$`));
  });
});

test('artifact helper rejects workspace-local artifact paths', () => {
  withTempGithubPrProposerRoots((env) => {
    const result = spawnSync('node', [
      'scripts/github-pr-proposer/artifacts.mjs',
      'validate-canonical-path',
      '--path', `${env.GITHUB_PR_PROPOSER_WORKSPACE_ROOT}/plans/311da0f2-ab8c-8089-b40b-fcae833befa8.md`
    ], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...env
      }
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Workspace-local artifact path is not allowed/);
  });
});

test('artifact helper resolves openclaw-local research, plan, and handoff paths', () => {
  withTempGithubPrProposerRoots((env) => {
    const localEnv = {
      ...env,
      GITHUB_PR_PROPOSER_RUNTIME_PROFILE: 'openclaw-local',
      GITHUB_PR_PROPOSER_ARTIFACT_ROOT: path.join(env.GITHUB_PR_PROPOSER_WORKSPACE_ROOT, 'autonomy', 'github-pr-proposer', 'items'),
      GITHUB_PR_PROPOSER_HOST_ARTIFACT_ROOT: path.join(env.GITHUB_PR_PROPOSER_WORKSPACE_ROOT, 'host-items')
    };
    const research = JSON.parse(run('scripts/github-pr-proposer/artifacts.mjs', [
      'resolve-research',
      '--repo', exampleRepo,
      '--page-id', '311da0f2-ab8c-8089-b40b-fcae833befa8'
    ], { env: localEnv }));
    const plan = JSON.parse(run('scripts/github-pr-proposer/artifacts.mjs', [
      'resolve-plan',
      '--repo', exampleRepo,
      '--page-id', '311da0f2-ab8c-8089-b40b-fcae833befa8'
    ], { env: localEnv }));
    const handoff = JSON.parse(run('scripts/github-pr-proposer/artifacts.mjs', [
      'resolve-handoff',
      '--repo', exampleRepo,
      '--page-id', '311da0f2-ab8c-8089-b40b-fcae833befa8'
    ], { env: localEnv }));

    assert.equal(research.runtimeProfile, 'openclaw-local');
    assert.match(research.containerPath, /\/autonomy\/github-pr-proposer\/items\/311da0f2-ab8c-8089-b40b-fcae833befa8\/research\.md$/);
    assert.match(research.hostPath, /\/host-items\/311da0f2-ab8c-8089-b40b-fcae833befa8\/research\.md$/);
    assert.equal(plan.runtimeProfile, 'openclaw-local');
    assert.match(plan.containerPath, /\/autonomy\/github-pr-proposer\/items\/311da0f2-ab8c-8089-b40b-fcae833befa8\/plan\.md$/);
    assert.equal(handoff.runtimeProfile, 'openclaw-local');
    assert.match(handoff.containerPath, /\/autonomy\/github-pr-proposer\/items\/311da0f2-ab8c-8089-b40b-fcae833befa8\/handoff\.md$/);
  });
});

test('artifact helper validates openclaw-local namespaced paths', () => {
  withTempGithubPrProposerRoots((env) => {
    const localEnv = {
      ...env,
      GITHUB_PR_PROPOSER_RUNTIME_PROFILE: 'openclaw-local',
      GITHUB_PR_PROPOSER_ARTIFACT_ROOT: path.join(env.GITHUB_PR_PROPOSER_WORKSPACE_ROOT, 'autonomy', 'github-pr-proposer', 'items'),
      GITHUB_PR_PROPOSER_HOST_ARTIFACT_ROOT: path.join(env.GITHUB_PR_PROPOSER_WORKSPACE_ROOT, 'host-items')
    };
    const valid = JSON.parse(run('scripts/github-pr-proposer/artifacts.mjs', [
      'validate-canonical-path',
      '--path', path.join(localEnv.GITHUB_PR_PROPOSER_ARTIFACT_ROOT, '311da0f2-ab8c-8089-b40b-fcae833befa8', 'research.md')
    ], { env: localEnv }));

    assert.equal(valid.runtimeProfile, 'openclaw-local');
    assert.match(valid.containerPath, /\/autonomy\/github-pr-proposer\/items\/311da0f2-ab8c-8089-b40b-fcae833befa8\/research\.md$/);

    const invalid = spawnSync('node', [
      'scripts/github-pr-proposer/artifacts.mjs',
      'validate-canonical-path',
      '--path', `${env.GITHUB_PR_PROPOSER_WORKSPACE_ROOT}/plans/311da0f2-ab8c-8089-b40b-fcae833befa8.md`
    ], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...localEnv
      }
    });

    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /openclaw-local artifact root/);
  });
});

test('github-read normalize-repo validates repo shape without network access', () => {
  const parsed = JSON.parse(run('scripts/github-pr-proposer/github-read.mjs', [
    'normalize-repo',
    '--repo', exampleRepo
  ]));

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.result, {
    owner: 'example-owner',
    name: 'example-repo',
    slug: exampleRepo
  });
});

test('notion helper set-status requires a page id before any network call', () => {
  const result = spawnSync('node', [
    'scripts/github-pr-proposer/notion.mjs',
    'set-status',
    '--status', 'Planning'
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required --page-id argument/);
});

test('github-write helper validates required flags before any network call', () => {
  const result = spawnSync('node', [
    'scripts/github-pr-proposer/github-write.mjs',
    'create-pr',
    '--repo', exampleRepo,
    '--title', 'Test PR'
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required --title, --head, or --base argument/);
});
