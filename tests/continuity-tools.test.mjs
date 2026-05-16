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

const writeMinimalContext = (context) => {
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

const setWorkingSet = (stateContent, lines) =>
  stateContent.replace(
    /## Active Artifact Working Set\n[\s\S]*$/m,
    `## Active Artifact Working Set\n${lines.trimEnd()}\n`
  );

test('continuity checkpoint creates a project-local session artifact and updates runtime state', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'checkpoint');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
  const uniqueId = path.basename(repoRoot);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-test-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, 'thoughts', 'research', 'continuity-test-research.md');

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
    assert.match(result.artifactPath, /\/\.omx\/sessions\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_checkpoint-topic\.md$/);

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

test('continuity checkpoint includes execution-state metadata when active execution exists', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'execution');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-execution-plan-${path.basename(repoRoot)}.md`);
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(executionPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(executionPath, JSON.stringify({
    schema: 'execution-state.v1',
    active_plan: planPath,
    plan_name: 'continuity execution plan',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    session_ids: [],
    current_task_key: 'phase-1-step-1-line-10',
    completed_task_keys: [],
    task_sessions: {}
  }, null, 2));

  try {
    const result = runContinuityTool([
      'checkpoint',
      '--topic', 'Execution Checkpoint',
      '--workflow', 'implementation',
      '--phase', 'phase execution',
      '--next-step', 'Continue the active task',
      '--plan', planPath
    ], repoRoot);

    assert.equal(result.execution.path, executionPath);
    assert.equal(result.diagnostics.execution.current_task_key, 'phase-1-step-1-line-10');

    const sessionArtifact = fs.readFileSync(result.artifactPath, 'utf8');
    assert.match(sessionArtifact, new RegExp(`- Path: ${executionPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(sessionArtifact, /- Current task: phase-1-step-1-line-10/);
    assert.match(sessionArtifact, /## Continuation Guidance/);
    assert.match(sessionArtifact, /- Remaining tasks: 1/);
    assert.match(sessionArtifact, /- Reminder: Execution is active with 1 remaining task\(s\)\./);

    const sessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
    assert.match(sessionIndex, /execution active @ phase-1-step-1-line-10/);
    assert.equal(result.diagnostics.next_command, '/start-work');
    assert.equal(result.diagnostics.execution_guidance.remaining_task_count, 1);
    assert.match(sessionArtifact, /next_command: \/start-work/);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});

test('continuity checkpoint surfaces cleanup guidance for terminal execution state', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'terminal-execution');
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-terminal-plan-${path.basename(repoRoot)}.md`);
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');

  const toolContext = runProjectContext(repoRoot);
  writeMinimalContext(toolContext);
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(executionPath), { recursive: true });
  fs.writeFileSync(planPath, '# Plan\n- [ ] first task\n- [ ] second task\n');
  fs.writeFileSync(executionPath, JSON.stringify({
    schema: 'execution-state.v1',
    active_plan: planPath,
    plan_name: 'continuity terminal plan',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'completed',
    session_ids: [],
    current_task_key: null,
    completed_task_keys: ['plan-first-task-line-2'],
    task_sessions: {},
    task_catalog: [
      { key: 'plan-first-task-line-2', label: 'first task', completed: true, line: 2, scope: 'Plan' },
      { key: 'plan-second-task-line-3', label: 'second task', completed: false, line: 3, scope: 'Plan' }
    ]
  }, null, 2));

  try {
    const result = runContinuityTool([
      'checkpoint',
      '--topic', 'Terminal Execution Checkpoint',
      '--workflow', 'implementation',
      '--phase', 'phase execution',
      '--next-step', 'Clean up terminal execution state',
      '--plan', planPath
    ], repoRoot);

    const sessionArtifact = fs.readFileSync(result.artifactPath, 'utf8');
    assert.equal(result.diagnostics.next_command, '/stop-work');
    assert.equal(result.diagnostics.execution_guidance.cleanup.recommended_command, '/stop-work');
    assert.match(sessionArtifact, /- Cleanup command: \/stop-work/);
    assert.match(sessionArtifact, /Execution is completed but 1 task\(s\) still appear incomplete/);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});

test('continuity checkpoint preserves doctor-recommended handoff recovery when no execution state exists', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'doctor-handoff');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
  const uniqueId = path.basename(repoRoot);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-doctor-plan-${uniqueId}.md`);
  const handoffPath = path.join(repoRoot, 'thoughts', 'handoffs', 'general', `2026-03-29_21-00-00_doctor-handoff-${uniqueId}.md`);
  const originalState = fs.readFileSync(context.contextPaths.state, 'utf8');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(handoffPath, '# Handoff\n');

  try {
    const seededState = setWorkingSet(
      originalState
        .replace(/## Current Workflow\n- .*/m, '## Current Workflow\n- implementation')
        .replace(/## Current Phase\n- .*/m, '## Current Phase\n- phase 3')
        .replace(/## Next Step\n- .*/m, '## Next Step\n- Resume from handoff')
        .replace(/## Related Plan\n- .*/m, '## Related Plan\n- none'),
      `
- Last updated: 2026-03-29T00:00:00Z
- Source: manual
- Focus: doctor handoff

### Selected By Category
- intake: none
- plan: none
- research: none
- session: none
- handoff: ${handoffPath}

### Ordered Artifacts
1. ${handoffPath}
`
    );
    fs.writeFileSync(context.contextPaths.state, seededState);

    const result = runContinuityTool([
      'checkpoint',
      '--source', 'test-suite',
      '--focus', 'doctor handoff',
      '--topic', 'Doctor Guided Checkpoint',
      '--handoff', handoffPath
    ], repoRoot);

    assert.equal(result.diagnostics.next_command, `/resume_handoff ${handoffPath}`);
    const sessionArtifact = fs.readFileSync(result.artifactPath, 'utf8');
    assert.match(sessionArtifact, new RegExp(`next_command: /resume_handoff ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    const sessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
    assert.match(sessionIndex, new RegExp(`- Next command: /resume_handoff ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.writeFileSync(context.contextPaths.state, originalState);
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
    fs.rmSync(handoffPath, { force: true });
  }
});

test('continuity checkpoint defaults next command to start-work when active execution exists', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'execution-next-command');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-next-command-plan-${path.basename(repoRoot)}.md`);
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(executionPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(executionPath, JSON.stringify({
    schema: 'execution-state.v1',
    active_plan: planPath,
    plan_name: 'continuity next command plan',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    session_ids: [],
    current_task_key: 'phase-3-step-1-line-71',
    completed_task_keys: [],
    task_sessions: {}
  }, null, 2));

  try {
    const result = runContinuityTool([
      'checkpoint',
      '--topic', 'Execution Resume Command',
      '--workflow', 'implementation',
      '--phase', 'phase 3',
      '--next-step', 'Continue current task',
      '--plan', planPath
    ], repoRoot);

    const sessionArtifact = fs.readFileSync(result.artifactPath, 'utf8');
    assert.match(sessionArtifact, /next_command: \/start-work/);

    const sessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
    assert.match(sessionIndex, /- Next command: \/start-work/);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});

test('continuity handoff preserves authored handoff content and syncs project-local runtime state', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'handoff');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
    const uniqueId = path.basename(repoRoot);
    const handoffPath = path.join(repoRoot, 'thoughts', 'handoffs', 'general', `2026-03-06_20-00-00_continuity-test-${uniqueId}.md`);
    const planPath = path.join(root, 'thoughts', 'plans', `continuity-test-plan-${uniqueId}.md`);
    const researchPath = path.join(repoRoot, 'thoughts', 'research', 'continuity-test-research.md');
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
  writeMinimalContext(context);
  const uniqueId = path.basename(repoRoot);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-refresh-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, 'thoughts', 'research', 'continuity-refresh-research.md');
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
  writeMinimalContext(context);
  const uniqueId = path.basename(repoRoot);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-state-first-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, 'thoughts', 'research', 'continuity-state-first-research.md');
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

  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);

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
  writeMinimalContext(context);
  const uniqueId = path.basename(repoRoot);
  const handoffPath = path.join(repoRoot, 'thoughts', 'handoffs', 'general', `2026-03-06_20-00-00_repair-test-${uniqueId}.md`);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-repair-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, 'thoughts', 'research', 'continuity-repair-research.md');
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
  writeMinimalContext(context);
  const uniqueId = path.basename(repoRoot);
  const handoffPath = path.join(repoRoot, 'thoughts', 'handoffs', 'general', `2026-03-06_20-00-00_transition-test-${uniqueId}.md`);
  const planPath = path.join(root, 'thoughts', 'plans', `continuity-transition-plan-${uniqueId}.md`);
  const researchPath = path.join(repoRoot, 'thoughts', 'research', 'continuity-transition-research.md');

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
