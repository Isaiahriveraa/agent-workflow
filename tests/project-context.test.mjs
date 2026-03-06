import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = '/Users/isaiahrivera/.agents';

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

const withTempProjectsRoot = (fn) => {
  const projectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-projects-root-'));

  try {
    return fn(projectsRoot);
  } finally {
    fs.rmSync(projectsRoot, { recursive: true, force: true });
  }
};

test('same repo path yields the same project id', () => {
  withTempProjectsRoot((projectsRoot) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-project-context-'));
    const repoRoot = createRepo(tmpDir, 'alpha');

    try {
      const env = { AGENTS_PROJECTS_ROOT: projectsRoot };
      const first = runCurrent(repoRoot, env);
      const second = runCurrent(path.join(repoRoot, 'nested', 'dir'), env);

      assert.equal(first.projectRoot, repoRoot);
      assert.equal(second.projectRoot, repoRoot);
      assert.equal(first.projectSlug, second.projectSlug);
      assert.match(first.projectSlug, /^alpha-[0-9a-f]{8}$/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

test('same-named repos in different paths yield different project ids', () => {
  withTempProjectsRoot((projectsRoot) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-project-context-'));
    const firstRepo = createRepo(path.join(tmpDir, 'one'), 'shared-name');
    const secondRepo = createRepo(path.join(tmpDir, 'two'), 'shared-name');

    try {
      const env = { AGENTS_PROJECTS_ROOT: projectsRoot };
      const first = runCurrent(firstRepo, env);
      const second = runCurrent(secondRepo, env);

      assert.notEqual(first.projectRoot, second.projectRoot);
      assert.notEqual(first.projectSlug, second.projectSlug);
      assert.match(first.projectSlug, /^shared-name-[0-9a-f]{8}$/);
      assert.match(second.projectSlug, /^shared-name-[0-9a-f]{8}$/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

test('bootstrapping project context creates only runtime context files', () => {
  withTempProjectsRoot((projectsRoot) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-project-context-'));
    const repoRoot = createRepo(tmpDir, 'runtime-only');
    const globalPlan = path.join(root, 'thoughts', 'plans', '2026-03-02-project-scoped-runtime-context-minimal-fix.md');
    const globalResearch = path.join(root, 'thoughts', 'research', '2026-02-26-interface-trigger-recording-flow.md');
    const globalHandoff = path.join(root, 'thoughts', 'shared', 'handoffs', 'ENG-general', '2026-03-01_22-53-44_agent-workflow-automation-upgrade.md');

    try {
      const context = runCurrent(repoRoot, { AGENTS_PROJECTS_ROOT: projectsRoot });

      assert.ok(fs.existsSync(context.contextPaths.state));
      assert.ok(fs.existsSync(context.contextPaths.sessionIndex));
      assert.ok(fs.existsSync(context.contextPaths.artifacts));

      assert.equal(context.thoughtPaths.plans, path.join(root, 'thoughts', 'plans'));
      assert.equal(context.thoughtPaths.research, path.join(root, 'thoughts', 'research'));
      assert.equal(fs.existsSync(context.thoughtPaths.sessions), false);
      assert.equal(context.thoughtPaths.handoffs, path.join(root, 'thoughts', 'shared', 'handoffs'));

      assert.ok(fs.existsSync(globalPlan));
      assert.ok(fs.existsSync(globalResearch));
      assert.ok(fs.existsSync(globalHandoff));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
