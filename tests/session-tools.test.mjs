import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const createFixtureRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};
const fixtureRepoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-session-fixture-')), 'openclaw');
const runProjectContext = (repoRoot = fixtureRepoRoot, extraEnv = {}) =>
  JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  }));
const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

test('session index exists with required sections in project-local runtime context', () => {
  const content = readFile(runProjectContext(fixtureRepoRoot).contextPaths.sessionIndex);
  assert.match(content, /## Active Sessions/);
  assert.match(content, /## Recent Sessions/);
  assert.match(content, /## Entry Template/);
});

test('session commands reference project-local session index and state', () => {
  const start = readFile(`${root}/commands/session-start.md`);
  const pause = readFile(`${root}/commands/pause-session.md`);
  const resume = readFile(`${root}/commands/resume-session.md`);
  const status = readFile(`${root}/commands/session-status.md`);
  const agents = readFile(`${root}/AGENTS.md`);

  assert.match(start, /current project's `session-index\.md`/);
  assert.match(start, /current project's `\.agents\/sessions\/general\//);
  assert.match(pause, /current project's `session-index\.md`/);
  assert.match(resume, /current project's `session-index\.md`/);
  assert.match(status, /current project's `session-index\.md`/);
  assert.match(resume, /current project's `state\.md`/);
  assert.match(agents, /project-local `\.agents\/sessions\/`/);
});

test('session tools create deterministic project-local session paths', () => {
  const output = execFileSync('node', ['scripts/session-tools.mjs', 'create-path', 'Workflow Upgrade'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: fixtureRepoRoot
    }
  }).trim();

  assert.match(output, /\/openclaw\/\.agents\/sessions\/general\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_workflow-upgrade\.md$/);
});

test('same-named repos get distinct project-local session directories', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-session-isolation-'));
  const repoA = createFixtureRepo(path.join(tmpDir, 'one'), 'shared-name');
  const repoB = createFixtureRepo(path.join(tmpDir, 'two'), 'shared-name');

  try {
    const contextA = runProjectContext(repoA);
    const contextB = runProjectContext(repoB);

    assert.notEqual(contextA.projectSlug, contextB.projectSlug);
    assert.notEqual(contextA.thoughtPaths.sessions, contextB.thoughtPaths.sessions);
    assert.equal(contextA.thoughtPaths.sessions, path.join(repoA, '.agents', 'sessions', 'general'));
    assert.equal(contextB.thoughtPaths.sessions, path.join(repoB, '.agents', 'sessions', 'general'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
