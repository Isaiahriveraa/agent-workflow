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

const runProjectContext = (repoRoot, extraEnv = {}) =>
  JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  }));

const runContinuityTool = (args, repoRoot, extraEnv = {}) =>
  JSON.parse(execFileSync('node', ['scripts/continuity-tools.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  }));

const setWorkingSet = (stateContent, lines) =>
  stateContent.replace(
    /## Active Artifact Working Set\n[\s\S]*$/m,
    `## Active Artifact Working Set\n${lines.trimEnd()}\n`
  );

test('continuity checkpoint creates a project-local session artifact and updates runtime state', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'checkpoint');
  const context = runProjectContext(repoRoot);
  const uniqueId = path.basename(repoRoot);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-test-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, '.planning', 'research', 'continuity-test-research.md');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(researchPath, '# research\n');

  try {
    const result = runContinuityTool([
      'checkpoint',
      '--source', 'test-suite',
      '--focus', 'continuity phase 2',
      '--topic', 'Checkpoint Topic',
      '--workflow', 'implementation',
      '--phase', 'phase 2',
      '--next-step', 'Run follow-up command',
      '--next-command', '/resume-session',
      '--plan', planPath,
      '--research', researchPath
    ], repoRoot);

    assert.equal(result.action, 'checkpoint');
    assert.equal(result.diagnostics.contract_version, 'continuity-tools.v1');
    assert.equal(result.diagnostics.persistence_mode, 'refresh');
    assert.ok(fs.existsSync(result.artifactPath));
    assert.match(result.artifactPath, /\/\.agents\/sessions\/general\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_checkpoint-topic\.md$/);

    const sessionArtifact = fs.readFileSync(result.artifactPath, 'utf8');
    assert.match(sessionArtifact, /# Session: Checkpoint Topic/);
    assert.match(sessionArtifact, /- Workflow: implementation/);

    const state = fs.readFileSync(context.contextPaths.state, 'utf8');
    assert.match(state, /## Current Workflow\n- implementation/);
    assert.match(state, /## Current Phase\n- phase 2/);
    assert.match(state, new RegExp(`- ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(state, new RegExp(`- session: ${result.artifactPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    const sessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
    assert.match(sessionIndex, /## Active Sessions/);
    assert.match(sessionIndex, /- Status: active/);
    assert.match(sessionIndex, new RegExp(`- Artifact path: ${result.artifactPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('continuity handoff preserves authored handoff content and syncs project-local runtime state', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'handoff');
  const context = runProjectContext(repoRoot);
    const uniqueId = path.basename(repoRoot);
    const handoffPath = path.join(root, 'thoughts', 'shared', 'handoffs', 'general', `2026-03-06_20-00-00_continuity-test-${uniqueId}.md`);
    const planPath = path.join(root, 'thoughts', 'plans', `continuity-test-plan-${uniqueId}.md`);
    const researchPath = path.join(repoRoot, '.planning', 'research', 'continuity-test-research.md');
    const authoredHandoff = [
      '---',
      'date: 2026-03-06T20:00:00-0800',
      'researcher: Codex',
      'status: complete',
      'type: implementation_strategy',
      '---',
      '',
      '# Handoff: Authored continuity handoff',
      '',
      '## Task(s)',
      '- Completed: wrote the real handoff content before runtime sync.'
    ].join('\n') + '\n';

    fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.mkdirSync(path.dirname(researchPath), { recursive: true });
    fs.writeFileSync(planPath, '# plan\n');
    fs.writeFileSync(handoffPath, authoredHandoff);
    fs.writeFileSync(researchPath, '# research\n');

  try {
    const result = runContinuityTool([
      'handoff',
      '--source', 'test-suite',
      '--focus', 'handoff continuity',
      '--topic', 'Continuity Handoff',
      '--workflow', 'implementation',
      '--phase', 'phase 2',
      '--next-step', 'Resume from handoff',
      '--plan', planPath,
      '--research', researchPath,
      '--handoff', handoffPath
    ], repoRoot);

      assert.equal(result.action, 'handoff');
      assert.equal(result.diagnostics.contract_version, 'continuity-tools.v1');
      assert.equal(result.diagnostics.persistence_mode, 'authoritative');
      assert.equal(result.artifactPath, handoffPath);
      assert.ok(fs.existsSync(handoffPath));
      assert.doesNotMatch(handoffPath, /\/projects\/.*\/thoughts\/handoffs\//);

      const handoff = fs.readFileSync(handoffPath, 'utf8');
      assert.equal(handoff, authoredHandoff);

      const state = fs.readFileSync(context.contextPaths.state, 'utf8');
      assert.match(state, new RegExp(`- handoff: ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(state, new RegExp(`- plan: ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(state, new RegExp(`- research: ${researchPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(state, /- session: none/);

      const sessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
      assert.match(sessionIndex, /## Active Sessions\n- No active sessions recorded\./);
      assert.match(sessionIndex, /## Recent Sessions/);
      assert.match(sessionIndex, /- Status: handed_off/);
      assert.match(sessionIndex, new RegExp(`- Artifact path: ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(sessionIndex, new RegExp(`- Next command: /resume_handoff ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
    fs.rmSync(handoffPath, { force: true });
  }
});

test('continuity checkpoint refreshes stale intake selections through helper-backed persistence', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'refresh');
  const context = runProjectContext(repoRoot);
  const uniqueId = path.basename(repoRoot);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-refresh-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, '.planning', 'research', 'continuity-refresh-research.md');
  const oldIntakePath = path.join(repoRoot, '.planning', 'intake', 'old-intake.md');
  const suggestedIntakePath = path.join(repoRoot, '.planning', 'intake', 'checkpoint-focus-intake.md');
  const originalState = fs.readFileSync(context.contextPaths.state, 'utf8');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.mkdirSync(path.dirname(oldIntakePath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(researchPath, '# research\n');
  fs.writeFileSync(oldIntakePath, '# old intake\n');
  fs.writeFileSync(suggestedIntakePath, '# checkpoint intake\n');

  try {
    const workflowState = originalState
      .replace(/## Current Workflow\n- .*/m, '## Current Workflow\n- checkpoint focus')
      .replace(/## Current Phase\n- .*/m, '## Current Phase\n- refresh');
    const seededState = setWorkingSet(workflowState, `
- Last updated: 2026-03-06T00:00:00Z
- Source: manual
- Focus: previous continuity focus

### Selected By Category
- intake: ${oldIntakePath}
- plan: ${planPath}
- research: ${researchPath}
- session: none
- handoff: none

### Ordered Artifacts
1. ${oldIntakePath}
2. ${planPath}
3. ${researchPath}
`);
    fs.writeFileSync(context.contextPaths.state, seededState);

    runContinuityTool([
      'checkpoint',
      '--source', 'test-suite',
      '--focus', 'checkpoint focus',
      '--topic', 'Checkpoint Refresh',
      '--workflow', 'implementation',
      '--phase', 'refresh phase',
      '--next-step', 'Continue',
      '--next-command', '/resume-session',
      '--plan', planPath,
      '--research', researchPath
    ], repoRoot);

    const state = fs.readFileSync(context.contextPaths.state, 'utf8');
    assert.match(state, new RegExp(`- intake: ${suggestedIntakePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.doesNotMatch(state, new RegExp(`- intake: ${oldIntakePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.writeFileSync(context.contextPaths.state, originalState);
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});

test('continuity checkpoint derives refresh suggestions from the updated state payload', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'state-first-refresh');
  const context = runProjectContext(repoRoot);
  const uniqueId = path.basename(repoRoot);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-state-first-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, '.planning', 'research', 'continuity-state-first-research.md');
  const oldIntakePath = path.join(repoRoot, '.planning', 'intake', 'legacy-intake.md');
  const suggestedIntakePath = path.join(repoRoot, '.planning', 'intake', 'implementation-authority-phase-intake.md');
  const originalState = fs.readFileSync(context.contextPaths.state, 'utf8');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.mkdirSync(path.dirname(oldIntakePath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(researchPath, '# research\n');
  fs.writeFileSync(oldIntakePath, '# old intake\n');
  fs.writeFileSync(suggestedIntakePath, '# suggested intake\n');

  try {
    const seededState = setWorkingSet(
      originalState
        .replace(/## Current Workflow\n- .*/m, '## Current Workflow\n- legacy workflow')
        .replace(/## Current Phase\n- .*/m, '## Current Phase\n- old phase'),
      `
- Last updated: 2026-03-06T00:00:00Z
- Source: manual
- Focus: continuity refresh

### Selected By Category
- intake: ${oldIntakePath}
- plan: ${planPath}
- research: ${researchPath}
- session: none
- handoff: none

### Ordered Artifacts
1. ${oldIntakePath}
2. ${planPath}
3. ${researchPath}
`
    );
    fs.writeFileSync(context.contextPaths.state, seededState);

    runContinuityTool([
      'checkpoint',
      '--source', 'test-suite',
      '--focus', 'continuity refresh',
      '--topic', 'State First Refresh',
      '--workflow', 'implementation',
      '--phase', 'authority phase',
      '--next-step', 'Continue',
      '--next-command', '/resume-session',
      '--plan', planPath,
      '--research', researchPath
    ], repoRoot);

    const state = fs.readFileSync(context.contextPaths.state, 'utf8');
    assert.match(state, new RegExp(`- intake: ${suggestedIntakePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.doesNotMatch(state, new RegExp(`- intake: ${oldIntakePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.writeFileSync(context.contextPaths.state, originalState);
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});

test('continuity handoff fails closed when the authored handoff path does not exist', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'handoff-missing');
  const missingHandoffPath = path.join(
    root,
    'thoughts',
    'shared',
    'handoffs',
    'general',
    '2026-03-21_18-00-00_missing-handoff.md'
  );

  try {
    assert.throws(() => {
      runContinuityTool([
        'handoff',
        '--source', 'test-suite',
        '--focus', 'handoff continuity',
        '--topic', 'Continuity Handoff',
        '--workflow', 'implementation',
        '--phase', 'phase 2',
        '--next-step', 'Resume from handoff',
        '--handoff', missingHandoffPath
      ], repoRoot);
    }, /Authored handoff does not exist/);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(missingHandoffPath, { force: true });
  }
});

test('continuity handoff repairs malformed recent session entries while preserving valid history', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'handoff-repair');
  const context = runProjectContext(repoRoot);
  const uniqueId = path.basename(repoRoot);
  const handoffPath = path.join(root, 'thoughts', 'shared', 'handoffs', 'general', `2026-03-06_20-00-00_repair-test-${uniqueId}.md`);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-repair-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, '.planning', 'research', 'continuity-repair-research.md');
  const originalSessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');

  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(researchPath, '# research\n');
  fs.writeFileSync(handoffPath, '# Handoff\n');
  fs.writeFileSync(context.contextPaths.sessionIndex, `# Session Index

## Active Sessions
- No active sessions recorded.

## Recent Sessions
- Session ID: valid-entry
- Date: 2026-03-06T10:00:00Z
- Topic: preserved
- Status: handed_off
- Artifact path: /tmp/preserved.md
- Related plan: ${planPath}
- Next command: /resume_handoff /tmp/preserved.md
- Summary: keep me
- Session ID: malformed-entry

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

  try {
    runContinuityTool([
      'handoff',
      '--source', 'test-suite',
      '--focus', 'handoff repair',
      '--topic', 'Repair Handoff',
      '--workflow', 'implementation',
      '--phase', 'phase 1',
      '--next-step', 'Resume from handoff',
      '--plan', planPath,
      '--research', researchPath,
      '--handoff', handoffPath
    ], repoRoot);

    const sessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
    assert.match(sessionIndex, /- Session ID: valid-entry/);
    assert.doesNotMatch(sessionIndex, /- Session ID: malformed-entry/);
    assert.match(sessionIndex, new RegExp(`- Artifact path: ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.writeFileSync(context.contextPaths.sessionIndex, originalSessionIndex);
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
    fs.rmSync(handoffPath, { force: true });
  }
});

test('continuity checkpoint then handoff keeps state and session-index aligned across the transition', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'checkpoint-to-handoff');
  const context = runProjectContext(repoRoot);
  const uniqueId = path.basename(repoRoot);
  const handoffPath = path.join(root, 'thoughts', 'shared', 'handoffs', 'general', `2026-03-06_20-00-00_transition-test-${uniqueId}.md`);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-transition-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, '.planning', 'research', 'continuity-transition-research.md');

  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(researchPath, '# research\n');
  fs.writeFileSync(handoffPath, '# Handoff\n');

  try {
    const checkpoint = runContinuityTool([
      'checkpoint',
      '--source', 'test-suite',
      '--focus', 'transition continuity',
      '--topic', 'Transition Checkpoint',
      '--workflow', 'implementation',
      '--phase', 'phase 4',
      '--next-step', 'Prepare handoff',
      '--next-command', '/resume-session',
      '--plan', planPath,
      '--research', researchPath
    ], repoRoot);

    const stateAfterCheckpoint = fs.readFileSync(context.contextPaths.state, 'utf8');
    const sessionIndexAfterCheckpoint = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
    assert.match(stateAfterCheckpoint, new RegExp(`- session: ${checkpoint.artifactPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(stateAfterCheckpoint, new RegExp(`- plan: ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(sessionIndexAfterCheckpoint, new RegExp(`- Artifact path: ${checkpoint.artifactPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(sessionIndexAfterCheckpoint, new RegExp(`- Related plan: ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    const handoff = runContinuityTool([
      'handoff',
      '--source', 'test-suite',
      '--focus', 'transition continuity',
      '--topic', 'Transition Handoff',
      '--workflow', 'implementation',
      '--phase', 'phase 4',
      '--next-step', 'Resume from handoff',
      '--plan', planPath,
      '--research', researchPath,
      '--handoff', handoffPath
    ], repoRoot);

    const stateAfterHandoff = fs.readFileSync(context.contextPaths.state, 'utf8');
    const sessionIndexAfterHandoff = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
    assert.match(stateAfterHandoff, /- session: none/);
    assert.match(stateAfterHandoff, new RegExp(`- handoff: ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(stateAfterHandoff, new RegExp(`- plan: ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(sessionIndexAfterHandoff, /## Active Sessions\n- No active sessions recorded\./);
    assert.match(sessionIndexAfterHandoff, new RegExp(`- Artifact path: ${handoff.artifactPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(sessionIndexAfterHandoff, new RegExp(`- Related plan: ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.doesNotMatch(sessionIndexAfterHandoff, new RegExp(`- Artifact path: ${checkpoint.artifactPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
    fs.rmSync(handoffPath, { force: true });
  }
});
