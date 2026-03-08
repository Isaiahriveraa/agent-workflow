import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const createFixtureRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};
const fixtureRepoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-fixture-')), 'openclaw');
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
const setWorkingSet = (stateContent, lines) =>
  stateContent.replace(
    /## Active Artifact Working Set\n[\s\S]*$/m,
    `## Active Artifact Working Set\n${lines.trimEnd()}\n`
  );
const withSeededArtifacts = (repoRoot, fn) => {
  const seedId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const intakePath = path.join(repoRoot, '.planning', 'intake', `${seedId}-intake.md`);
  const planPath = path.join(repoRoot, '.planning', 'plans', `${seedId}-plan.md`);
  const researchPath = path.join(repoRoot, '.planning', 'research', `${seedId}-research.md`);
  const handoffPath = path.join(root, 'thoughts', 'shared', 'handoffs', 'ENG-general', `${seedId}-handoff.md`);

  fs.mkdirSync(path.dirname(intakePath), { recursive: true });
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.writeFileSync(intakePath, '# Intake\n');
  fs.writeFileSync(planPath, '# Plan\n');
  fs.writeFileSync(researchPath, '# Research\n');
  fs.writeFileSync(handoffPath, '# Handoff\n');

  try {
    return fn({ intakePath, planPath, researchPath, handoffPath });
  } finally {
    fs.rmSync(intakePath, { force: true });
    fs.rmSync(planPath, { force: true });
    fs.rmSync(researchPath, { force: true });
    fs.rmSync(handoffPath, { force: true });
  }
};

test('artifact retrieval context exists with required sections', () => {
  const content = readFile(runProjectContext(fixtureRepoRoot).contextPaths.artifacts);
  assert.match(content, /## Sources/);
  assert.match(content, /## Preferred Retrieval Order/);
  assert.match(content, /handoffs: `~\/\.agents\/thoughts\/shared\/handoffs`/);
  assert.match(content, /Lightweight continuity artifacts are project-local runtime files/);
});

test('artifact suggestion returns known categories', () => {
  const output = execArtifactTool(['suggest'], fixtureRepoRoot);
  const parsed = JSON.parse(output);

  assert.ok(Object.hasOwn(parsed, 'intake'));
  assert.ok(Object.hasOwn(parsed, 'plan'));
  assert.ok(Object.hasOwn(parsed, 'research'));
  assert.ok(Object.hasOwn(parsed, 'session'));
  assert.ok(Object.hasOwn(parsed, 'handoff'));
  assert.ok(Object.hasOwn(parsed, 'active'));
  assert.ok(Object.hasOwn(parsed, 'suggested'));
});

test('artifact related command returns shared durable artifacts plus project sessions', () => {
  withSeededArtifacts(fixtureRepoRoot, () => {
    const output = execArtifactTool(['related'], fixtureRepoRoot);
    const parsed = JSON.parse(output);

    assert.match(parsed.intake ?? '', /\/\.planning\/intake\//);
    assert.match(parsed.plans ?? '', /\/\.planning\/plans\//);
    assert.match(parsed.research ?? '', /\/\.planning\/research\//);
    assert.match(parsed.handoffs ?? '', /thoughts\/shared\/handoffs\//);
  });
});

test('artifact state exposes an active working set section in project-local state', () => {
  const content = readFile(runProjectContext(fixtureRepoRoot).contextPaths.state);
  assert.match(content, /## Active Artifact Working Set/);
  assert.match(content, /### Selected By Category/);
  assert.match(content, /### Ordered Artifacts/);
});

test('artifact suggestion still returns shared/global artifacts when project-local state starts empty', () => {
  withSeededArtifacts(fixtureRepoRoot, () => {
      const project = runProjectContext(fixtureRepoRoot);
      const projectStatePath = project.contextPaths.state;
      const originalState = readFile(projectStatePath);
      const emptyState = originalState
        .replace(/- intake: .*/g, '- intake: none')
        .replace(/- plan: .*/g, '- plan: none')
        .replace(/- research: .*/g, '- research: none')
        .replace(/- session: .*/g, '- session: none')
        .replace(/- handoff: .*/g, '- handoff: none')
        .replace(/### Ordered Artifacts\n[\s\S]*$/m, '### Ordered Artifacts\n1. none\n');

      try {
        fs.writeFileSync(projectStatePath, emptyState);

        const parsed = JSON.parse(execArtifactTool(['suggest'], fixtureRepoRoot));
        assert.match(parsed.suggested.intake ?? '', /\/\.planning\/intake\//);
        assert.match(parsed.suggested.plan ?? '', /\/\.planning\/plans\//);
        assert.match(parsed.suggested.research ?? '', /\/\.planning\/research\//);
        assert.match(parsed.suggested.handoff ?? '', /thoughts\/shared\/handoffs\//);
      } finally {
        fs.writeFileSync(projectStatePath, originalState);
      }
  });
});

test('artifact persistence writes the active working set to project-local state only', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ intakePath, planPath, researchPath, handoffPath }) => {
      const project = runProjectContext(fixtureRepoRoot);
      const projectStatePath = project.contextPaths.state;
      const globalStatePath = `${root}/contexts/state.md`;
      const originalProjectState = readFile(projectStatePath);
      const originalGlobalState = readFile(globalStatePath);

      try {
        const output = execArtifactTool([
          'persist',
          '--intake',
          intakePath,
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
        ], fixtureRepoRoot);

        const persisted = JSON.parse(output);
        assert.equal(persisted.source, 'test-suite');
        assert.equal(persisted.focus, 'artifact continuity');
        assert.equal(persisted.selected.intake, intakePath);
        assert.equal(persisted.selected.plan, planPath);
        assert.equal(persisted.selected.research, researchPath);
        assert.equal(persisted.selected.handoff, handoffPath);
        assert.ok(Array.isArray(persisted.ordered));
        assert.ok(persisted.ordered.includes(planPath));

        const active = JSON.parse(execArtifactTool(['active'], fixtureRepoRoot));

        assert.equal(active.source, 'test-suite');
        assert.equal(active.focus, 'artifact continuity');
        assert.equal(active.selected.intake, intakePath);
        assert.equal(active.selected.plan, planPath);

        const stateContent = readFile(projectStatePath);
        assert.match(stateContent, /- Source: test-suite/);
        assert.match(stateContent, /- Focus: artifact continuity/);
        assert.match(stateContent, new RegExp(`- intake: ${intakePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        assert.match(stateContent, new RegExp(`- plan: ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        assert.equal(readFile(globalStatePath), originalGlobalState);
      } finally {
        fs.writeFileSync(projectStatePath, originalProjectState);
      }
  });
});

test('artifact persistence remains normalized across repeated writes', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ planPath, researchPath, handoffPath }) => {
      const project = runProjectContext(fixtureRepoRoot);
      const projectStatePath = project.contextPaths.state;
      const originalProjectState = readFile(projectStatePath);

      try {
        execArtifactTool([
          'persist',
          '--plan',
          planPath,
          '--research',
          researchPath,
          '--source',
          'first-pass',
          '--focus',
          'normalization'
        ], fixtureRepoRoot);

        execArtifactTool([
          'persist',
          '--plan',
          planPath,
          '--research',
          researchPath,
          '--handoff',
          handoffPath,
          '--source',
          'second-pass',
          '--focus',
          'normalization'
        ], fixtureRepoRoot);

        const stateContent = readFile(projectStatePath);
        const sectionMatches = stateContent.match(/^## Active Artifact Working Set$/gm) ?? [];

        assert.equal(sectionMatches.length, 1);
        assert.match(stateContent, /- Source: second-pass/);
        assert.match(stateContent, new RegExp(`- handoff: ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      } finally {
        fs.writeFileSync(projectStatePath, originalProjectState);
      }
  });
});

test('artifact persistence rewrites the entire working-set section when stale trailing content exists', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ planPath, researchPath, handoffPath }) => {
      const project = runProjectContext(fixtureRepoRoot);
      const projectStatePath = project.contextPaths.state;
      const originalState = readFile(projectStatePath);
      const malformedState = `${originalState.trimEnd()}\n\n- Source: stale-write\n- Focus: stale-write\n\n### Selected By Category\n- plan: /tmp/stale-plan.md\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. /tmp/stale-plan.md\n`;

      try {
        fs.writeFileSync(projectStatePath, malformedState);

        execArtifactTool([
          'persist',
          '--plan',
          planPath,
          '--research',
          researchPath,
          '--handoff',
          handoffPath,
          '--source',
          'repair-pass',
          '--focus',
          'repair malformed state'
        ], fixtureRepoRoot);

        const stateContent = readFile(projectStatePath);
        const sectionMatches = stateContent.match(/^## Active Artifact Working Set$/gm) ?? [];

        assert.equal(sectionMatches.length, 1);
        assert.match(stateContent, /- Source: repair-pass/);
        assert.doesNotMatch(stateContent, /stale-write/);
        assert.doesNotMatch(stateContent, /\/tmp\/stale-plan\.md/);
        assert.match(stateContent, new RegExp(`- handoff: ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      } finally {
        fs.writeFileSync(projectStatePath, originalState);
      }
  });
});

test('artifact tools reject duplicate working set sections in project-local state', () => {
    const project = runProjectContext(fixtureRepoRoot);
    const projectStatePath = project.contextPaths.state;
    const originalState = readFile(projectStatePath);
    const duplicatedState = `${originalState.trimEnd()}\n\n## Active Artifact Working Set\n- Last updated: none\n- Source: none\n- Focus: none\n\n### Selected By Category\n- intake: none\n- plan: none\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. none\n`;

    try {
      fs.writeFileSync(projectStatePath, duplicatedState);

      const result = spawnSync('node', ['scripts/artifact-tools.mjs', 'active'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          AGENTS_PROJECT_ROOT: fixtureRepoRoot
        }
      });

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Duplicate "## Active Artifact Working Set" sections found in contexts\/state\.md/);
    } finally {
      fs.writeFileSync(projectStatePath, originalState);
    }
});

test('artifact suggestion prefers persisted selections over heuristics', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ intakePath, planPath, researchPath, handoffPath }) => {
      const project = runProjectContext(fixtureRepoRoot);
      const projectStatePath = project.contextPaths.state;
      const originalState = readFile(projectStatePath);

      try {
        const seededState = setWorkingSet(originalState, `
- Last updated: 2026-03-06T00:00:00Z
- Source: manual
- Focus: persisted wins

### Selected By Category
- intake: ${intakePath}
- plan: ${planPath}
- research: ${researchPath}
- session: none
- handoff: ${handoffPath}

### Ordered Artifacts
1. ${planPath}
2. ${researchPath}
3. ${handoffPath}
`);

        fs.writeFileSync(projectStatePath, seededState);

        const parsed = JSON.parse(execArtifactTool(['suggest'], fixtureRepoRoot));

        assert.equal(parsed.intake, intakePath);
        assert.equal(parsed.plan, planPath);
        assert.equal(parsed.research, researchPath);
        assert.equal(parsed.handoff, handoffPath);
        assert.equal(parsed.active.selected.plan, planPath);
      } finally {
        fs.writeFileSync(projectStatePath, originalState);
      }
  });
});

test('artifact suggestion prefers explicit session-index artifacts over latest session heuristic', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ planPath, researchPath, handoffPath }) => {
      const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-session-')), 'resume-target');
      const project = runProjectContext(repoRoot);
      const sessionDir = project.thoughtPaths.sessions;
      const explicitSession = path.join(sessionDir, '2026-03-06_10-00-00_explicit.md');
      const newerFallbackSession = path.join(sessionDir, '2026-03-06_11-00-00_fallback.md');
      const originalState = readFile(project.contextPaths.state);
      const originalSessionIndex = readFile(project.contextPaths.sessionIndex);

      try {
        fs.mkdirSync(sessionDir, { recursive: true });
        fs.writeFileSync(explicitSession, '# explicit session\n');
        fs.writeFileSync(newerFallbackSession, '# fallback session\n');
        fs.writeFileSync(project.contextPaths.sessionIndex, `# Session Index

## Active Sessions
- Session ID: current
- Date: 2026-03-06
- Topic: continuity
- Status: active
- Artifact path: ${explicitSession}
- Related plan: ${planPath}
- Next command: /resume-session
- Summary: explicit session index entry

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
`);

      const seededState = setWorkingSet(originalState, `
- Last updated: 2026-03-06T00:00:00Z
- Source: manual
- Focus: session precedence

### Selected By Category
- intake: none
- plan: none
- research: ${researchPath}
- session: none
- handoff: ${handoffPath}

### Ordered Artifacts
1. ${researchPath}
2. ${handoffPath}
`);
        fs.writeFileSync(project.contextPaths.state, seededState);

        const parsed = JSON.parse(execArtifactTool(['suggest'], repoRoot));

        assert.equal(parsed.session, explicitSession);
        assert.equal(parsed.suggested.session, explicitSession);
        assert.equal(parsed.research, researchPath);
      } finally {
        fs.writeFileSync(project.contextPaths.state, originalState);
        fs.writeFileSync(project.contextPaths.sessionIndex, originalSessionIndex);
        fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
      }
  });
});

test('artifact working sets remain isolated across two repos', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ planPath }) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-isolation-'));
      const repoA = createFixtureRepo(path.join(tmpDir, 'one'), 'shared-name');
      const repoB = createFixtureRepo(path.join(tmpDir, 'two'), 'shared-name');

      try {
        const projectA = runProjectContext(repoA);
        const projectB = runProjectContext(repoB);
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
        ], repoA);

        const activeA = JSON.parse(execArtifactTool(['active'], repoA));
        const activeB = JSON.parse(execArtifactTool(['active'], repoB));

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
