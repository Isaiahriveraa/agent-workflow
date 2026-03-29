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

const runProjectContext = (repoRoot) =>
  JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

const runContract = (repoRoot, extraArgs = []) =>
  JSON.parse(execFileSync('node', ['scripts/orchestration-contract-tools.mjs', 'contract', ...extraArgs], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

const runDecision = (repoRoot, extraArgs = []) =>
  JSON.parse(execFileSync('node', ['scripts/orchestration-contract-tools.mjs', 'decide', ...extraArgs], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

test('orchestration contract derives conductor and executor guidance from active execution', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-orchestration-')), 'active');
  const context = runProjectContext(repoRoot);
  const planPath = path.join(repoRoot, '.planning', 'phase-4-plan.md');
  const executionPath = path.join(repoRoot, '.agents', 'runtime', 'execution', 'active.json');
  const notesDir = path.join(repoRoot, '.agents', 'runtime', 'execution', 'notepads', 'phase-4-plan');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(executionPath), { recursive: true });
  fs.mkdirSync(notesDir, { recursive: true });
  fs.writeFileSync(planPath, '# Plan\n### Step 1\n- [ ] define orchestration contract\n');
  fs.writeFileSync(context.contextPaths.state, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 4 Step 1

## Next Step
- Define the orchestration contract

## Blockers
- None.

## Last Verified At
- now

## Related Plan
- ${planPath}

## Active Artifact Working Set
- Last updated: now
- Source: test
- Focus: phase 4

### Selected By Category
- intake: none
- plan: ${planPath}
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. ${planPath}
`);
  fs.writeFileSync(executionPath, JSON.stringify({
    schema: 'execution-state.v1',
    active_plan: planPath,
    plan_name: 'phase-4-plan',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    session_ids: [],
    current_task_key: 'phase-4-step-1-line-2',
    completed_task_keys: [],
    task_sessions: {},
    notes_dir: notesDir,
    task_catalog: [
      { key: 'phase-4-step-1-line-2', label: 'Step 1', completed: false, line: 2, scope: 'Phase 4 / Step 1' }
    ]
  }, null, 2));

  try {
    const result = runContract(repoRoot, ['--input', 'Implement the first orchestration contract slice']);
    assert.equal(result.contract_version, 'orchestration-contract.v1');
    assert.equal(result.provider, 'generic');
    assert.equal(result.acceleration.mode, 'honest-degraded');
    assert.equal(result.execution.status, 'active');
    assert.equal(result.conductor.should_delegate, true);
    assert.equal(result.executor.non_redelegating_by_default, true);
    assert.equal(result.execution_guidance.remaining_task_count, 1);
    assert.equal(result.executor.learnings_handoff.required_files.length, 5);
    assert.equal(result.intent_reset.required, true);
    assert.equal(result.routing.intent_kind, 'implementation');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('orchestration contract recommends start-work when execution state is missing', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-orchestration-')), 'missing');
  const context = runProjectContext(repoRoot);
  const planPath = path.join(repoRoot, '.planning', 'phase-4-plan.md');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, '# Plan\n');
  fs.writeFileSync(context.contextPaths.state, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 4 ready

## Next Step
- Start Phase 4

## Blockers
- None.

## Last Verified At
- now

## Related Plan
- ${planPath}

## Active Artifact Working Set
- Last updated: now
- Source: test
- Focus: phase 4

### Selected By Category
- intake: none
- plan: ${planPath}
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. ${planPath}
`);

  try {
    const result = runContract(repoRoot, ['--input', 'Start Phase 4 orchestration']);
    assert.equal(result.execution, null);
    assert.equal(result.recommended_next_command, '/start-work');
    assert.equal(result.conductor.should_delegate, false);
    assert.match(result.warnings[0], /No active execution state is present/);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('orchestration decision delegates active execution tasks and stays conductor without execution state', () => {
  const activeRepoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-orchestration-')), 'decision-active');
  const activeContext = runProjectContext(activeRepoRoot);
  const activePlanPath = path.join(activeRepoRoot, '.planning', 'phase-4-plan.md');
  const activeExecutionPath = path.join(activeRepoRoot, '.agents', 'runtime', 'execution', 'active.json');
  const activeNotesDir = path.join(activeRepoRoot, '.agents', 'runtime', 'execution', 'notepads', 'phase-4-plan');

  fs.mkdirSync(path.dirname(activePlanPath), { recursive: true });
  fs.mkdirSync(path.dirname(activeExecutionPath), { recursive: true });
  fs.mkdirSync(activeNotesDir, { recursive: true });
  fs.writeFileSync(activePlanPath, '# Plan\n### Step 2\n- [ ] wire live delegation\n');
  fs.writeFileSync(activeContext.contextPaths.state, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 4 Step 2

## Next Step
- Wire live delegation

## Blockers
- None.

## Last Verified At
- now

## Related Plan
- ${activePlanPath}

## Active Artifact Working Set
- Last updated: now
- Source: test
- Focus: phase 4

### Selected By Category
- intake: none
- plan: ${activePlanPath}
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. ${activePlanPath}
`);
  fs.writeFileSync(activeExecutionPath, JSON.stringify({
    schema: 'execution-state.v1',
    active_plan: activePlanPath,
    plan_name: 'phase-4-plan',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    session_ids: [],
    current_task_key: 'phase-4-step-2-line-2',
    completed_task_keys: [],
    task_sessions: {},
    notes_dir: activeNotesDir,
    task_catalog: [
      { key: 'phase-4-step-2-line-2', label: 'Step 2', completed: false, line: 2, scope: 'Phase 4 / Step 2' }
    ]
  }, null, 2));

  const missingRepoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-orchestration-')), 'decision-missing');
  const missingContext = runProjectContext(missingRepoRoot);
  const missingPlanPath = path.join(missingRepoRoot, '.planning', 'phase-4-plan.md');
  fs.mkdirSync(path.dirname(missingPlanPath), { recursive: true });
  fs.writeFileSync(missingPlanPath, '# Plan\n');
  fs.writeFileSync(missingContext.contextPaths.state, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 4

## Next Step
- Start orchestration

## Blockers
- None.

## Last Verified At
- now

## Related Plan
- ${missingPlanPath}

## Active Artifact Working Set
- Last updated: now
- Source: test
- Focus: phase 4

### Selected By Category
- intake: none
- plan: ${missingPlanPath}
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. ${missingPlanPath}
`);

  try {
    const activeDecision = runDecision(activeRepoRoot, ['--input', 'Wire live delegation decisions']);
    assert.equal(activeDecision.decision, 'delegate_executor');
    assert.equal(activeDecision.current_task.label, 'Step 2');
    assert.equal(activeDecision.delegated_task.required_note_files.length, 5);

    const missingDecision = runDecision(missingRepoRoot, ['--input', 'Start orchestration']);
    assert.equal(missingDecision.decision, 'stay_conductor');
    assert.equal(missingDecision.next_command, '/start-work');
  } finally {
    fs.rmSync(path.dirname(activeRepoRoot), { recursive: true, force: true });
    fs.rmSync(path.dirname(missingRepoRoot), { recursive: true, force: true });
  }
});
