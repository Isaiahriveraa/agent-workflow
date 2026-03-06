import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = '/Users/isaiahrivera/.agents';
const fixtureRepoRoot = '/Users/isaiahrivera/.openclaw';
const createFixtureRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};
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
const withTempProjectsRoot = (fn) => {
  const projectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-projects-root-'));

  try {
    return fn({ AGENTS_PROJECTS_ROOT: projectsRoot });
  } finally {
    fs.rmSync(projectsRoot, { recursive: true, force: true });
  }
};

test('session index exists with required sections in project-local runtime context', () => {
  withTempProjectsRoot((env) => {
    const content = readFile(runProjectContext(fixtureRepoRoot, env).contextPaths.sessionIndex);
    assert.match(content, /## Active Sessions/);
    assert.match(content, /## Recent Sessions/);
    assert.match(content, /## Entry Template/);
  });
});

test('session commands reference project-local session index and state', () => {
  const start = readFile(`${root}/commands/session-start.md`);
  const pause = readFile(`${root}/commands/pause-session.md`);
  const resume = readFile(`${root}/commands/resume-session.md`);
  const status = readFile(`${root}/commands/session-status.md`);

  assert.match(start, /current project's `session-index\.md`/);
  assert.match(pause, /current project's `session-index\.md`/);
  assert.match(resume, /current project's `session-index\.md`/);
  assert.match(status, /current project's `session-index\.md`/);
  assert.match(resume, /current project's `state\.md`/);
});

test('session tools create deterministic project-local session paths', () => {
  withTempProjectsRoot((env) => {
    const output = execFileSync('node', ['scripts/session-tools.mjs', 'create-path', 'Workflow Upgrade'], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        AGENTS_PROJECT_ROOT: fixtureRepoRoot,
        ...env
      }
    }).trim();

    assert.match(output, /\/[a-z0-9-]+-[0-9a-f]{8}\/thoughts\/sessions\/general\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_workflow-upgrade\.md$/);
  });
});

test('same-named repos get distinct project-local session directories', () => {
  withTempProjectsRoot((env) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-session-isolation-'));
    const repoA = createFixtureRepo(path.join(tmpDir, 'one'), 'shared-name');
    const repoB = createFixtureRepo(path.join(tmpDir, 'two'), 'shared-name');

    try {
      const contextA = runProjectContext(repoA, env);
      const contextB = runProjectContext(repoB, env);

      assert.notEqual(contextA.projectSlug, contextB.projectSlug);
      assert.notEqual(contextA.thoughtPaths.sessions, contextB.thoughtPaths.sessions);
      assert.match(contextA.thoughtPaths.sessions, /\/shared-name-[0-9a-f]{8}\/thoughts\/sessions\/general$/);
      assert.match(contextB.thoughtPaths.sessions, /\/shared-name-[0-9a-f]{8}\/thoughts\/sessions\/general$/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
