import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);

const createRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'nested', 'dir'), { recursive: true });
  return repoRoot;
};

const runCurrent = (cwd, extraEnv = {}) =>
  JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnv,
      AGENTS_PROJECT_ROOT: cwd
    }
  }));

test('same repo path yields the same project id', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-project-context-'));
  const repoRoot = createRepo(tmpDir, 'alpha');

  try {
    const first = runCurrent(repoRoot);
    const second = runCurrent(path.join(repoRoot, 'nested', 'dir'));

    assert.equal(first.projectRoot, repoRoot);
    assert.equal(second.projectRoot, repoRoot);
    assert.equal(first.projectSlug, second.projectSlug);
    assert.match(first.projectSlug, /^alpha-[0-9a-f]{8}$/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('same-named repos in different paths yield different project ids', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-project-context-'));
  const firstRepo = createRepo(path.join(tmpDir, 'one'), 'shared-name');
  const secondRepo = createRepo(path.join(tmpDir, 'two'), 'shared-name');

  try {
    const first = runCurrent(firstRepo);
    const second = runCurrent(secondRepo);

    assert.notEqual(first.projectRoot, second.projectRoot);
    assert.notEqual(first.projectSlug, second.projectSlug);
    assert.match(first.projectSlug, /^shared-name-[0-9a-f]{8}$/);
    assert.match(second.projectSlug, /^shared-name-[0-9a-f]{8}$/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('bootstrapping project context creates only runtime context files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-project-context-'));
  const repoRoot = createRepo(tmpDir, 'runtime-only');

  try {
    const context = runCurrent(repoRoot);

    assert.ok(fs.existsSync(context.contextPaths.state));
    assert.ok(fs.existsSync(context.contextPaths.researchIndex));
    assert.ok(fs.existsSync(context.contextPaths.sessionIndex));
    assert.ok(fs.existsSync(context.contextPaths.artifacts));

    assert.equal(context.projectDir, path.join(repoRoot, '.agents'));
    assert.equal(context.contextsDir, path.join(repoRoot, '.agents', 'contexts'));
    assert.equal(context.thoughtPaths.plans, path.join(repoRoot, 'thoughts', 'plans'));
    assert.equal(context.thoughtPaths.research, path.join(repoRoot, 'thoughts', 'research'));
    assert.equal(fs.existsSync(context.thoughtPaths.sessions), false);
    assert.equal(context.thoughtPaths.handoffs, path.join(repoRoot, 'thoughts', 'handoffs'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
