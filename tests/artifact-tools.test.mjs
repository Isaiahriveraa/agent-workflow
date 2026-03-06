import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

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
const execArtifactTool = (args, repoRoot = fixtureRepoRoot, extraEnv = {}) =>
  execFileSync('node', ['scripts/artifact-tools.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  });
const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const withTempProjectsRoot = (fn) => {
  const projectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-projects-root-'));

  try {
    return fn({ AGENTS_PROJECTS_ROOT: projectsRoot });
  } finally {
    fs.rmSync(projectsRoot, { recursive: true, force: true });
  }
};

test('artifact retrieval context exists with required sections', () => {
  withTempProjectsRoot((env) => {
    const content = readFile(runProjectContext(fixtureRepoRoot, env).contextPaths.artifacts);
    assert.match(content, /## Sources/);
    assert.match(content, /## Preferred Retrieval Order/);
  });
});

test('artifact suggestion returns known categories', () => {
  withTempProjectsRoot((env) => {
    const output = execArtifactTool(['suggest'], fixtureRepoRoot, env);
    const parsed = JSON.parse(output);

    assert.ok(Object.hasOwn(parsed, 'plan'));
    assert.ok(Object.hasOwn(parsed, 'research'));
    assert.ok(Object.hasOwn(parsed, 'session'));
    assert.ok(Object.hasOwn(parsed, 'handoff'));
    assert.ok(Object.hasOwn(parsed, 'active'));
    assert.ok(Object.hasOwn(parsed, 'suggested'));
  });
});

test('artifact related command returns shared durable artifacts plus project sessions', () => {
  withTempProjectsRoot((env) => {
    const output = execArtifactTool(['related'], fixtureRepoRoot, env);
    const parsed = JSON.parse(output);

    assert.match(parsed.plans ?? '', /thoughts\/plans\//);
    assert.match(parsed.research ?? '', /thoughts\/research\//);
    assert.match(parsed.handoffs ?? '', /thoughts\/shared\/handoffs\//);
  });
});

test('artifact state exposes an active working set section in project-local state', () => {
  withTempProjectsRoot((env) => {
    const content = readFile(runProjectContext(fixtureRepoRoot, env).contextPaths.state);
    assert.match(content, /## Active Artifact Working Set/);
    assert.match(content, /### Selected By Category/);
    assert.match(content, /### Ordered Artifacts/);
  });
});

test('artifact suggestion still returns shared/global artifacts when project-local state starts empty', () => {
  withTempProjectsRoot((env) => {
    const project = runProjectContext(fixtureRepoRoot, env);
    const projectStatePath = project.contextPaths.state;
    const originalState = readFile(projectStatePath);
    const emptyState = originalState
      .replace(/- plan: .*/g, '- plan: none')
      .replace(/- research: .*/g, '- research: none')
      .replace(/- session: .*/g, '- session: none')
      .replace(/- handoff: .*/g, '- handoff: none')
      .replace(/### Ordered Artifacts\n[\s\S]*$/m, '### Ordered Artifacts\n1. none\n');

    try {
      fs.writeFileSync(projectStatePath, emptyState);

      const parsed = JSON.parse(execArtifactTool(['suggest'], fixtureRepoRoot, env));
      assert.match(parsed.suggested.plan ?? '', /thoughts\/plans\//);
      assert.match(parsed.suggested.research ?? '', /thoughts\/research\//);
      assert.match(parsed.suggested.handoff ?? '', /thoughts\/shared\/handoffs\//);
    } finally {
      fs.writeFileSync(projectStatePath, originalState);
    }
  });
});

test('artifact persistence writes the active working set to project-local state only', () => {
  withTempProjectsRoot((env) => {
    const project = runProjectContext(fixtureRepoRoot, env);
    const projectStatePath = project.contextPaths.state;
    const globalStatePath = `${root}/contexts/state.md`;
    const originalProjectState = readFile(projectStatePath);
    const originalGlobalState = readFile(globalStatePath);
    const planPath = `${root}/thoughts/plans/2026-02-24-interfaceview-border-fix.md`;
    const researchPath = `${root}/thoughts/research/2026-02-26-interface-trigger-recording-flow.md`;
    const handoffPath = `${root}/thoughts/shared/handoffs/ENG-general/2026-03-01_22-53-44_agent-workflow-automation-upgrade.md`;

    try {
      const output = execArtifactTool([
        'persist',
        '--plan',
        planPath,
        '--research',
        researchPath,
        '--handoff',
        handoffPath,
        '--source',
        'test-suite',
        '--focus',
        'artifact continuity'
      ], fixtureRepoRoot, env);

      const persisted = JSON.parse(output);
      assert.equal(persisted.source, 'test-suite');
      assert.equal(persisted.focus, 'artifact continuity');
      assert.equal(persisted.selected.plan, planPath);
      assert.equal(persisted.selected.research, researchPath);
      assert.equal(persisted.selected.handoff, handoffPath);
      assert.ok(Array.isArray(persisted.ordered));
      assert.ok(persisted.ordered.includes(planPath));

      const active = JSON.parse(execArtifactTool(['active'], fixtureRepoRoot, env));

      assert.equal(active.source, 'test-suite');
      assert.equal(active.focus, 'artifact continuity');
      assert.equal(active.selected.plan, planPath);

      const stateContent = readFile(projectStatePath);
      assert.match(stateContent, /- Source: test-suite/);
      assert.match(stateContent, /- Focus: artifact continuity/);
      assert.match(stateContent, new RegExp(`- plan: ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.equal(readFile(globalStatePath), originalGlobalState);
    } finally {
      fs.writeFileSync(projectStatePath, originalProjectState);
    }
  });
});

test('artifact tools reject duplicate working set sections in project-local state', () => {
  withTempProjectsRoot((env) => {
    const project = runProjectContext(fixtureRepoRoot, env);
    const projectStatePath = project.contextPaths.state;
    const originalState = readFile(projectStatePath);
    const duplicatedState = `${originalState.trimEnd()}\n\n## Active Artifact Working Set\n- Last updated: none\n- Source: none\n- Focus: none\n\n### Selected By Category\n- plan: none\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. none\n`;

    try {
      fs.writeFileSync(projectStatePath, duplicatedState);

      const result = spawnSync('node', ['scripts/artifact-tools.mjs', 'active'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          AGENTS_PROJECT_ROOT: fixtureRepoRoot,
          ...env
        }
      });

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Duplicate "## Active Artifact Working Set" sections found in contexts\/state\.md/);
    } finally {
      fs.writeFileSync(projectStatePath, originalState);
    }
  });
});

test('artifact working sets remain isolated across two repos', () => {
  withTempProjectsRoot((env) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-isolation-'));
    const repoA = createFixtureRepo(path.join(tmpDir, 'one'), 'shared-name');
    const repoB = createFixtureRepo(path.join(tmpDir, 'two'), 'shared-name');
    const planPath = `${root}/thoughts/plans/2026-02-24-interfaceview-border-fix.md`;

    try {
      const projectA = runProjectContext(repoA, env);
      const projectB = runProjectContext(repoB, env);
      const originalA = readFile(projectA.contextPaths.state);
      const originalB = readFile(projectB.contextPaths.state);

      execArtifactTool([
        'persist',
        '--plan',
        planPath,
        '--source',
        'repo-a-test',
        '--focus',
        'isolation'
      ], repoA, env);

      const activeA = JSON.parse(execArtifactTool(['active'], repoA, env));
      const activeB = JSON.parse(execArtifactTool(['active'], repoB, env));

      assert.equal(activeA.source, 'repo-a-test');
      assert.equal(activeA.selected.plan, planPath);
      assert.equal(activeB.source, 'none');
      assert.equal(activeB.selected.plan, null);

      fs.writeFileSync(projectA.contextPaths.state, originalA);
      fs.writeFileSync(projectB.contextPaths.state, originalB);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
