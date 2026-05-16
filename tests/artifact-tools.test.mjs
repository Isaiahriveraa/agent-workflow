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
const ensureTestContextFiles = (repoRoot) => {
  const context = JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, AGENTS_PROJECT_ROOT: repoRoot }
  }));
  const files = {
    [context.contextPaths.state]: `# Workflow State\n\n## Current Workflow\n- none\n\n## Current Phase\n- none\n\n## Next Step\n- none\n\n## Blockers\n- None.\n\n## Last Verified At\n- none\n\n## Related Plan\n- none\n\n## Active Artifact Working Set\n- Last updated: none\n- Source: none\n- Focus: none\n\n### Selected By Category\n- intake: none\n- plan: none\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. none\n`,
    [context.contextPaths.researchIndex]: `# Research Index\n\n## Entries\n- No project-local research artifacts recorded yet.\n\n## Entry Template\n- Topic:\n- Date:\n- Source files:\n- Artifact path:\n- Summary:\n`,
    [context.contextPaths.sessionIndex]: `# Session Index\n\n## Active Sessions\n- No active sessions recorded.\n\n## Recent Sessions\n- No recent sessions recorded.\n\n## Entry Template\n- Session ID:\n- Date:\n- Topic:\n- Status:\n- Artifact path:\n- Related plan:\n- Next command:\n- Summary:\n`,
    [context.contextPaths.artifacts]: `# Artifact Retrieval Context\n\n## Sources\n- intake: [project root]/.planning/intake\n- plans: [project root]/thoughts/plans\n- research: [project root]/thoughts/research\n- sessions: [project root]/.omx/sessions\n- handoffs: [project root]/thoughts/handoffs\n\n## Preferred Retrieval Order\n1. active or explicitly requested intake/session artifact\n2. related plan from the current project's state file\n3. latest matching repo-local research artifact\n4. latest matching project-local handoff artifact\n\n## Notes\n- Lightweight continuity artifacts are project-local runtime files.\n- Legacy repo-local plan paths under [project root]/.planning/plans remain readable.\n`
  };
  for (const [filePath, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);
  }
};

const execArtifactTool = (args, repoRoot = fixtureRepoRoot, extraEnv = {}) => {
  ensureTestContextFiles(repoRoot);
  return execFileSync('node', ['scripts/artifact-tools.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  });
};
const writeContextFiles = (context) => {
  const files = {
    [context.contextPaths.state]: `# Workflow State\n\n## Current Workflow\n- none\n\n## Current Phase\n- none\n\n## Next Step\n- none\n\n## Blockers\n- None.\n\n## Last Verified At\n- none\n\n## Related Plan\n- none\n\n## Active Artifact Working Set\n- Last updated: none\n- Source: none\n- Focus: none\n\n### Selected By Category\n- intake: none\n- plan: none\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. none\n`,
    [context.contextPaths.researchIndex]: `# Research Index\n\n## Entries\n- No project-local research artifacts recorded yet.\n\n## Entry Template\n- Topic:\n- Date:\n- Source files:\n- Artifact path:\n- Summary:\n`,
    [context.contextPaths.sessionIndex]: `# Session Index\n\n## Active Sessions\n- No active sessions recorded.\n\n## Recent Sessions\n- No recent sessions recorded.\n\n## Entry Template\n- Session ID:\n- Date:\n- Topic:\n- Status:\n- Artifact path:\n- Related plan:\n- Next command:\n- Summary:\n`,
    [context.contextPaths.artifacts]: `# Artifact Retrieval Context\n\n## Sources\n- intake: [project root]/.planning/intake\n- plans: [project root]/thoughts/plans\n- research: [project root]/thoughts/research\n- sessions: [project root]/.omx/sessions\n- handoffs: [project root]/thoughts/handoffs\n\n## Preferred Retrieval Order\n1. active or explicitly requested intake/session artifact\n2. related plan from the current project's state file\n3. latest matching repo-local research artifact\n4. latest matching project-local handoff artifact\n\n## Notes\n- Lightweight continuity artifacts are project-local runtime files.\n- Legacy repo-local plan paths under [project root]/.planning/plans remain readable.\n`
  };
  for (const [filePath, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
};

const fixtureContext = runProjectContext(fixtureRepoRoot);
writeContextFiles(fixtureContext);

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const setWorkingSet = (stateContent, lines) =>
  stateContent.replace(
    /## Active Artifact Working Set\n[\s\S]*$/m,
    `## Active Artifact Working Set\n${lines.trimEnd()}\n`
  );
const readyResearchArtifact = `---
artifact_type: research
substantial: true
critique_completed: true
critique_cycles: 1
refinement_cycles: 1
critique_artifacts: ["/tmp/research-critique.md"]
blocking_unknown_count: 0
evidence_level: strong
research_ready_for_planning: true
related_intake: /tmp/intake.md
last_validated: 2026-03-09T04:00:00.000Z
---

# Research Artifact

## Findings
- Existing workflow routing is shallow.

## Implementation Implications
- Add parser-backed readiness checks.

## Interfaces and Contracts
- workflow-router-tools.mjs stays intake-focused.

## Verification Implications
- Add contract tests and parser tests.

## Critique
- Initial draft missed fail-closed enforcement.

## Blocker Resolution
- Resolved the unknown by defining the blocker taxonomy.
`;
const weakResearchArtifact = `---
artifact_type: research
substantial: true
critique_completed: true
critique_cycles: 1
refinement_cycles: 1
blocking_unknown_count: 0
evidence_level: weak
research_ready_for_planning: true
related_intake: /tmp/intake.md
last_validated: 2026-03-09T04:00:00.000Z
---

# Weak Research

## Findings
- Existing workflow routing is shallow.

## Implementation Implications
- Add parser-backed readiness checks.

## Interfaces and Contracts
- workflow-router-tools.mjs stays intake-focused.

## Verification Implications
- Add contract tests and parser tests.

## Critique
- Initial draft missed fail-closed enforcement.

## Blocker Resolution
- Resolved the unknown by defining the blocker taxonomy.
`;
const withSeededArtifacts = (repoRoot, fn) => {
  const seedId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const intakePath = path.join(repoRoot, '.planning', 'intake', `${seedId}-intake.md`);
  const canonicalPlanPath = path.join(root, 'thoughts', 'plans', `${seedId}-plan.md`);
  const legacyPlanPath = path.join(repoRoot, '.planning', 'plans', `${seedId}-legacy-plan.md`);
  const researchPath = path.join(repoRoot, 'thoughts', 'research', `${seedId}-research.md`);
  const handoffPath = path.join(repoRoot, 'thoughts', 'handoffs', 'ENG-general', `${seedId}-handoff.md`);

  fs.mkdirSync(path.dirname(intakePath), { recursive: true });
  fs.mkdirSync(path.dirname(canonicalPlanPath), { recursive: true });
  fs.mkdirSync(path.dirname(legacyPlanPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.writeFileSync(intakePath, '# Intake\n');
  fs.writeFileSync(canonicalPlanPath, '# Plan\n');
  fs.writeFileSync(legacyPlanPath, '# Legacy Plan\n');
  fs.writeFileSync(researchPath, '# Research\n');
  fs.writeFileSync(handoffPath, '# Handoff\n');

  try {
    return fn({ intakePath, canonicalPlanPath, legacyPlanPath, researchPath, handoffPath });
  } finally {
    fs.rmSync(intakePath, { force: true });
    fs.rmSync(canonicalPlanPath, { force: true });
    fs.rmSync(legacyPlanPath, { force: true });
    fs.rmSync(researchPath, { force: true });
    fs.rmSync(handoffPath, { force: true });
  }
};

test('artifact retrieval context exists with required sections', () => {
  const content = readFile(runProjectContext(fixtureRepoRoot).contextPaths.artifacts);
  assert.match(content, /## Sources/);
  assert.match(content, /## Preferred Retrieval Order/);
  assert.match(content, /handoffs: .*thoughts\/handoffs/);
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
    assert.match(parsed.plans ?? '', /\/(thoughts|\.planning)\/plans\//);
    assert.match(parsed.research ?? '', /\/thoughts\/research\//);
    assert.match(parsed.handoffs ?? '', /thoughts\/handoffs\//);
  });
});

test('artifact state exposes an active working set section in project-local state', () => {
  const content = readFile(runProjectContext(fixtureRepoRoot).contextPaths.state);
  assert.match(content, /## Active Artifact Working Set/);
  assert.match(content, /### Selected By Category/);
  assert.match(content, /### Ordered Artifacts/);
});

test('artifact suggestion uses canonical shared artifacts only when they outrank repo-local fallback', () => {
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
        assert.match(parsed.suggested.plan ?? '', /\/(thoughts|\.planning)\/plans\//);
        assert.match(parsed.suggested.research ?? '', /\/thoughts\/research\//);
        assert.match(parsed.suggested.handoff ?? '', /thoughts\/handoffs\//);
      } finally {
        fs.writeFileSync(projectStatePath, originalState);
      }
  });
});

test('artifact suggestion falls back to legacy repo-local plans when no canonical thought plan exists', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-legacy-')), 'legacy-only');
  const legacyPlanPath = path.join(repoRoot, '.planning', 'plans', 'legacy-plan.md');
  const researchPath = path.join(repoRoot, 'thoughts', 'research', 'legacy-research.md');

  fs.mkdirSync(path.dirname(legacyPlanPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.writeFileSync(legacyPlanPath, '# Legacy Plan\n');
  fs.writeFileSync(researchPath, '# Legacy Research\n');

  try {
    const parsed = JSON.parse(execArtifactTool(['suggest'], repoRoot));
    assert.equal(parsed.suggested.plan, legacyPlanPath);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('artifact persistence writes the active working set to project-local state only', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ intakePath, canonicalPlanPath, researchPath, handoffPath }) => {
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
          canonicalPlanPath,
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
        assert.equal(persisted.mode, 'deterministic');
        assert.equal(persisted.source, 'test-suite');
        assert.equal(persisted.focus, 'artifact continuity');
        assert.equal(persisted.selected.intake, intakePath);
        assert.equal(persisted.selected.plan, canonicalPlanPath);
        assert.equal(persisted.selected.research, researchPath);
        assert.equal(persisted.selected.handoff, handoffPath);
        assert.ok(Array.isArray(persisted.ordered));
        assert.ok(persisted.ordered.includes(canonicalPlanPath));

        const active = JSON.parse(execArtifactTool(['active'], fixtureRepoRoot));

        assert.equal(active.source, 'test-suite');
        assert.equal(active.focus, 'artifact continuity');
        assert.equal(active.selected.intake, intakePath);
        assert.equal(active.selected.plan, canonicalPlanPath);

        const stateContent = readFile(projectStatePath);
        assert.match(stateContent, /- Source: test-suite/);
        assert.match(stateContent, /- Focus: artifact continuity/);
        assert.match(stateContent, new RegExp(`- intake: ${intakePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        assert.match(stateContent, new RegExp(`- plan: ${canonicalPlanPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        assert.equal(readFile(globalStatePath), originalGlobalState);
      } finally {
        fs.writeFileSync(projectStatePath, originalProjectState);
      }
  });
});

test('deterministic persistence keeps unspecified categories pinned to the persisted working set', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ intakePath, canonicalPlanPath, researchPath, handoffPath }) => {
    const project = runProjectContext(fixtureRepoRoot);
    const projectStatePath = project.contextPaths.state;
    const originalState = readFile(projectStatePath);
    const replacementIntakePath = path.join(fixtureRepoRoot, '.planning', 'intake', 'replacement-intake.md');

    fs.mkdirSync(path.dirname(replacementIntakePath), { recursive: true });
    fs.writeFileSync(replacementIntakePath, '# replacement intake\n');

    try {
      const seededState = setWorkingSet(originalState, `
- Last updated: 2026-03-06T00:00:00Z
- Source: manual
- Focus: preserve authored set

### Selected By Category
- intake: ${intakePath}
- plan: ${canonicalPlanPath}
- research: ${researchPath}
- session: none
- handoff: ${handoffPath}

### Ordered Artifacts
1. ${intakePath}
2. ${canonicalPlanPath}
3. ${researchPath}
4. ${handoffPath}
`);

      fs.writeFileSync(projectStatePath, seededState);

      const persisted = JSON.parse(execArtifactTool([
        'persist',
        '--plan',
        canonicalPlanPath,
        '--source',
        'deterministic-test',
        '--focus',
        'preserve authored set'
      ], fixtureRepoRoot));

      assert.equal(persisted.mode, 'deterministic');
      assert.equal(persisted.selected.intake, intakePath);
      assert.equal(persisted.selected.research, researchPath);
      assert.equal(persisted.selected.handoff, handoffPath);
    } finally {
      fs.writeFileSync(projectStatePath, originalState);
      fs.rmSync(replacementIntakePath, { force: true });
    }
  });
});

test('refresh persistence keeps heuristic refresh available when the caller asks for it explicitly', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ canonicalPlanPath, researchPath }) => {
    const project = runProjectContext(fixtureRepoRoot);
    const projectStatePath = project.contextPaths.state;
    const originalState = readFile(projectStatePath);
    const oldIntakePath = path.join(fixtureRepoRoot, '.planning', 'intake', 'old-intake.md');
    const suggestedIntakePath = path.join(fixtureRepoRoot, '.planning', 'intake', 'refresh-focus-intake.md');
    const workflowState = originalState
      .replace(/## Current Workflow\n- .*/m, '## Current Workflow\n- refresh focus')
      .replace(/## Current Phase\n- .*/m, '## Current Phase\n- refresh');

    fs.mkdirSync(path.dirname(oldIntakePath), { recursive: true });
    fs.writeFileSync(oldIntakePath, '# old intake\n');
    fs.writeFileSync(suggestedIntakePath, '# refresh intake\n');

    try {
      const seededState = setWorkingSet(workflowState, `
- Last updated: 2026-03-06T00:00:00Z
- Source: manual
- Focus: previous focus

### Selected By Category
- intake: ${oldIntakePath}
- plan: ${canonicalPlanPath}
- research: ${researchPath}
- session: none
- handoff: none

### Ordered Artifacts
1. ${oldIntakePath}
2. ${canonicalPlanPath}
3. ${researchPath}
`);
      fs.writeFileSync(projectStatePath, seededState);

      const persisted = JSON.parse(execArtifactTool([
        'persist',
        '--mode',
        'refresh',
        '--plan',
        canonicalPlanPath,
        '--research',
        researchPath,
        '--source',
        'refresh-test',
        '--focus',
        'refresh focus'
      ], fixtureRepoRoot));

      assert.equal(persisted.mode, 'refresh');
      assert.equal(persisted.selected.intake, suggestedIntakePath);
    } finally {
      fs.writeFileSync(projectStatePath, originalState);
    }
  });
});

test('artifact persistence remains normalized across repeated writes', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ canonicalPlanPath, researchPath, handoffPath }) => {
      const project = runProjectContext(fixtureRepoRoot);
      const projectStatePath = project.contextPaths.state;
      const originalProjectState = readFile(projectStatePath);

      try {
        execArtifactTool([
          'persist',
          '--plan',
          canonicalPlanPath,
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
          canonicalPlanPath,
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
  withSeededArtifacts(fixtureRepoRoot, ({ canonicalPlanPath, researchPath, handoffPath }) => {
      const project = runProjectContext(fixtureRepoRoot);
      const projectStatePath = project.contextPaths.state;
      const originalState = readFile(projectStatePath);
      const malformedState = `${originalState.trimEnd()}\n\n- Source: stale-write\n- Focus: stale-write\n\n### Selected By Category\n- plan: /tmp/stale-plan.md\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. /tmp/stale-plan.md\n`;

      try {
        fs.writeFileSync(projectStatePath, malformedState);

        execArtifactTool([
          'persist',
          '--plan',
          canonicalPlanPath,
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
  withSeededArtifacts(fixtureRepoRoot, ({ intakePath, canonicalPlanPath, researchPath, handoffPath }) => {
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
- plan: ${canonicalPlanPath}
- research: ${researchPath}
- session: none
- handoff: ${handoffPath}

### Ordered Artifacts
1. ${canonicalPlanPath}
2. ${researchPath}
3. ${handoffPath}
`);

        fs.writeFileSync(projectStatePath, seededState);

        const parsed = JSON.parse(execArtifactTool(['suggest'], fixtureRepoRoot));

        assert.equal(parsed.intake, intakePath);
        assert.equal(parsed.plan, canonicalPlanPath);
        assert.equal(parsed.research, researchPath);
        assert.equal(parsed.handoff, handoffPath);
        assert.equal(parsed.active.selected.plan, canonicalPlanPath);
      } finally {
        fs.writeFileSync(projectStatePath, originalState);
      }
  });
});

test('artifact persistence refreshes stale intake selections only when the caller requests refresh mode', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ canonicalPlanPath, researchPath }) => {
      const project = runProjectContext(fixtureRepoRoot);
      const projectStatePath = project.contextPaths.state;
      const oldIntakePath = path.join(fixtureRepoRoot, '.planning', 'intake', 'old-intake.md');
      const suggestedIntakePath = path.join(fixtureRepoRoot, '.planning', 'intake', 'target-workflow-intake.md');
      const originalState = readFile(projectStatePath);

      fs.mkdirSync(path.dirname(oldIntakePath), { recursive: true });
      fs.writeFileSync(oldIntakePath, '# Old Intake\n');
      fs.writeFileSync(suggestedIntakePath, '# Target Workflow Intake\n');

      try {
        const workflowState = originalState
          .replace(/## Current Workflow\n- .*/m, '## Current Workflow\n- target workflow')
          .replace(/## Current Phase\n- .*/m, '## Current Phase\n- target phase');
        const seededState = setWorkingSet(workflowState, `
- Last updated: 2026-03-06T00:00:00Z
- Source: manual
- Focus: previous workflow focus

### Selected By Category
- intake: ${oldIntakePath}
- plan: ${canonicalPlanPath}
- research: ${researchPath}
- session: none
- handoff: none

### Ordered Artifacts
1. ${oldIntakePath}
2. ${canonicalPlanPath}
3. ${researchPath}
`);

        fs.writeFileSync(projectStatePath, seededState);

        const persisted = JSON.parse(execArtifactTool([
          'persist',
          '--mode',
          'refresh',
          '--source',
          'resume-session',
          '--focus',
          'new workflow focus'
        ], fixtureRepoRoot));

        assert.equal(persisted.selected.intake, suggestedIntakePath);
        assert.equal(persisted.selected.plan, canonicalPlanPath);
        assert.equal(persisted.selected.research, researchPath);
      } finally {
        fs.writeFileSync(projectStatePath, originalState);
        fs.rmSync(oldIntakePath, { force: true });
        fs.rmSync(suggestedIntakePath, { force: true });
      }
  });
});

test('artifact persistence allows explicit none overrides to clear a persisted category', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ intakePath, canonicalPlanPath, researchPath }) => {
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
- plan: ${canonicalPlanPath}
- research: ${researchPath}
- session: none
- handoff: none

### Ordered Artifacts
1. ${intakePath}
2. ${canonicalPlanPath}
3. ${researchPath}
`);

        fs.writeFileSync(projectStatePath, seededState);

        const persisted = JSON.parse(execArtifactTool([
          'persist',
          '--intake',
          'none',
          '--source',
          'clear-intake',
          '--focus',
          'override clear'
        ], fixtureRepoRoot));

        assert.equal(persisted.selected.intake, null);
      } finally {
        fs.writeFileSync(projectStatePath, originalState);
      }
  });
});

test('authoritative persistence keeps continuity-critical resume flows from adopting heuristic suggestions', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ canonicalPlanPath, researchPath, handoffPath }) => {
    const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-authoritative-')), 'resume-authority');
    const project = runProjectContext(repoRoot);
    writeContextFiles(project);
    const sessionDir = project.thoughtPaths.sessions;
    const suggestedSessionPath = path.join(sessionDir, '2026-03-06_10-00-00_suggested.md');
    const suggestedIntakePath = path.join(repoRoot, '.planning', 'intake', 'resume-authority-intake.md');
    const originalState = readFile(project.contextPaths.state);

    fs.mkdirSync(path.dirname(suggestedIntakePath), { recursive: true });
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(suggestedIntakePath, '# intake\n');
    fs.writeFileSync(suggestedSessionPath, '# session\n');

    try {
      const seededState = setWorkingSet(originalState, `
- Last updated: 2026-03-06T00:00:00Z
- Source: manual
- Focus: resume authority

### Selected By Category
- intake: none
- plan: none
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. none
`);
      fs.writeFileSync(project.contextPaths.state, seededState);

      const persisted = JSON.parse(execArtifactTool([
        'persist',
        '--source',
        'resume-session',
        '--focus',
        'resume authority'
      ], repoRoot));

      assert.equal(persisted.mode, 'authoritative');
      assert.equal(persisted.selected.intake, null);
      assert.equal(persisted.selected.plan, null);
      assert.equal(persisted.selected.research, null);
      assert.equal(persisted.selected.session, null);
      assert.equal(persisted.selected.handoff, null);
      assert.notEqual(canonicalPlanPath, null);
      assert.notEqual(researchPath, null);
      assert.notEqual(handoffPath, null);
    } finally {
      fs.writeFileSync(project.contextPaths.state, originalState);
      fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    }
  });
});

test('authoritative persistence lets project-artifacts persist only the explicit accepted selection set', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ canonicalPlanPath, researchPath }) => {
    const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-project-select-')), 'project-artifacts');
    const project = runProjectContext(repoRoot);
    writeContextFiles(project);
    const originalState = readFile(project.contextPaths.state);
    const suggestedIntakePath = path.join(repoRoot, '.planning', 'intake', 'project-artifacts-intake.md');
    const suggestedSessionPath = path.join(project.thoughtPaths.sessions, '2026-03-06_11-00-00_suggested.md');

    fs.mkdirSync(path.dirname(suggestedIntakePath), { recursive: true });
    fs.mkdirSync(path.dirname(suggestedSessionPath), { recursive: true });
    fs.writeFileSync(suggestedIntakePath, '# intake\n');
    fs.writeFileSync(suggestedSessionPath, '# session\n');

    try {
      const persisted = JSON.parse(execArtifactTool([
        'persist',
        '--source',
        'project-artifacts',
        '--focus',
        'accepted selection',
        '--plan',
        canonicalPlanPath,
        '--research',
        researchPath
      ], repoRoot));

      assert.equal(persisted.mode, 'authoritative');
      assert.equal(persisted.selected.plan, canonicalPlanPath);
      assert.equal(persisted.selected.research, researchPath);
      assert.equal(persisted.selected.intake, null);
      assert.equal(persisted.selected.session, null);
      assert.equal(persisted.selected.handoff, null);
    } finally {
      fs.writeFileSync(project.contextPaths.state, originalState);
      fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    }
  });
});

test('artifact tools sync research-index entries by artifact path without duplication', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-research-index-')), 'research-index');
  const context = runProjectContext(repoRoot);
  const researchPath = path.join(repoRoot, 'thoughts', 'research', 'continuity-repair.md');

  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.writeFileSync(researchPath, '# Research\n');

  try {
    const first = JSON.parse(execArtifactTool([
      'sync-research',
      '--topic',
      'Continuity drift repair',
      '--date',
      '2026-03-10',
      '--artifact',
      researchPath,
      '--summary',
      'First summary',
      '--source-file',
      path.join(root, 'scripts', 'artifact-tools.mjs'),
      '--source-file-2',
      path.join(root, 'scripts', 'continuity-tools.mjs')
    ], repoRoot));

    assert.equal(first.artifactPath, researchPath);
    assert.equal(first.summaryLines[0], 'First summary');

    const second = JSON.parse(execArtifactTool([
      'sync-research',
      '--topic',
      'Continuity drift repair',
      '--date',
      '2026-03-11',
      '--artifact',
      researchPath,
      '--summary',
      'Updated summary',
      '--source-file',
      path.join(root, 'scripts', 'artifact-tools.mjs')
    ], repoRoot));

    assert.equal(second.artifactPath, researchPath);
    assert.equal(second.summaryLines[0], 'Updated summary');

    const researchIndex = readFile(context.contextPaths.researchIndex);
    const artifactMatches = researchIndex.match(new RegExp(escapeRegExp(researchPath), 'g')) ?? [];

    assert.equal(artifactMatches.length, 1);
    assert.match(researchIndex, /- Topic: Continuity drift repair/);
    assert.match(researchIndex, /- Date: 2026-03-11/);
    assert.match(researchIndex, /Updated summary/);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('artifact suggestion prefers explicit session-index artifacts over latest session heuristic', () => {
  withSeededArtifacts(fixtureRepoRoot, ({ canonicalPlanPath, researchPath, handoffPath }) => {
      const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-session-')), 'resume-target');
      const project = runProjectContext(repoRoot);
      writeContextFiles(project);
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
- Related plan: ${canonicalPlanPath}
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
  withSeededArtifacts(fixtureRepoRoot, ({ canonicalPlanPath }) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-isolation-'));
      const repoA = createFixtureRepo(path.join(tmpDir, 'one'), 'shared-name');
      const repoB = createFixtureRepo(path.join(tmpDir, 'two'), 'shared-name');

      try {
        const projectA = runProjectContext(repoA);
        const projectB = runProjectContext(repoB);
        writeContextFiles(projectA);
        writeContextFiles(projectB);
        const originalA = readFile(projectA.contextPaths.state);
        const originalB = readFile(projectB.contextPaths.state);

        execArtifactTool([
          'persist',
          '--plan',
          canonicalPlanPath,
          '--source',
          'repo-a-test',
          '--focus',
          'isolation'
        ], repoA);

        const activeA = JSON.parse(execArtifactTool(['active'], repoA));
        const activeB = JSON.parse(execArtifactTool(['active'], repoB));

        assert.equal(activeA.source, 'repo-a-test');
        assert.equal(activeA.selected.plan, canonicalPlanPath);
        assert.equal(activeB.source, 'none');
        assert.equal(activeB.selected.plan, null);

        fs.writeFileSync(projectA.contextPaths.state, originalA);
        fs.writeFileSync(projectB.contextPaths.state, originalB);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
  });
});

test('artifact suggestion prefers ready research over a newer non-ready artifact', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-readiness-')), 'ready-beats-newer');
  const readyPath = path.join(repoRoot, 'thoughts', 'research', '2026-03-08-ready.md');
  const weakPath = path.join(repoRoot, 'thoughts', 'research', '2026-03-09-weak.md');

  fs.mkdirSync(path.dirname(readyPath), { recursive: true });
  fs.writeFileSync(readyPath, readyResearchArtifact);
  fs.writeFileSync(weakPath, weakResearchArtifact);
  const older = new Date('2026-03-08T00:00:00Z');
  const newer = new Date('2026-03-09T00:00:00Z');
  fs.utimesSync(readyPath, older, older);
  fs.utimesSync(weakPath, newer, newer);

  try {
    const parsed = JSON.parse(execArtifactTool(['suggest'], repoRoot));

    assert.equal(parsed.suggested.research, readyPath);
    assert.equal(parsed.research, readyPath);
    assert.equal(parsed.readiness.research.status, 'ready');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('artifact suggestion reports legacy substantial plans as inspectable but blocked for implementation', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-artifact-legacy-block-')), 'legacy-block');
  const legacyPlanPath = path.join(repoRoot, '.planning', 'plans', `${Date.now()}-legacy-substantial-plan.md`);

  fs.mkdirSync(path.dirname(legacyPlanPath), { recursive: true });
  fs.writeFileSync(legacyPlanPath, `# Legacy Plan

## Overview

Legacy plan without readiness frontmatter.

## Implementation Approach

- Introduce a parser-backed helper.

## Phase 1

- Add tests and integration hooks.

## Testing Strategy

- Run workflow contract tests.
`);

  try {
    const project = runProjectContext(repoRoot);
    writeContextFiles(project);
    const statePath = project.contextPaths.state;
    const originalState = readFile(statePath);
    const seededState = setWorkingSet(originalState, `
- Last updated: 2026-03-09T00:00:00Z
- Source: manual
- Focus: legacy plan block

### Selected By Category
- intake: none
- plan: none
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. none
`);

    fs.writeFileSync(statePath, seededState);

    const parsed = JSON.parse(execArtifactTool(['suggest'], repoRoot));

    assert.equal(parsed.suggested.plan, legacyPlanPath);
    assert.equal(parsed.plan, legacyPlanPath);
    assert.equal(parsed.readiness.plan.status, 'legacy_substantial');
    assert.equal(parsed.readiness.plan.legacySubstantial, true);
    assert.deepEqual(parsed.readiness.plan.blockedCommands, ['/implement_plan', '/resume-session']);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(legacyPlanPath, { force: true });
  }
});
