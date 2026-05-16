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

const runDoctor = (repoRoot, extraEnv = {}) =>
  JSON.parse(execFileSync('node', ['scripts/doctor.mjs', 'report'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  }));

test('doctor reports execution, continuity, verification, and router diagnostics', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-doctor-')), 'report');
  const context = runProjectContext(repoRoot);
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');

  try {
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.mkdirSync(path.dirname(context.contextPaths.state), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({
      name: 'doctor-fixture',
      private: true,
      scripts: {
        test: 'node --test',
        'validate:ssot': 'node ./scripts/validate-ssot.mjs'
      }
    }, null, 2));
    fs.writeFileSync(context.contextPaths.state, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 3

## Next Step
- Implement doctor and autonomy tools

## Blockers
- None.

## Last Verified At
- now

## Related Plan
- /tmp/phase-3-plan.md

## Active Artifact Working Set
- Last updated: now
- Source: test
- Focus: phase 3

### Selected By Category
- intake: none
- plan: /tmp/phase-3-plan.md
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. /tmp/phase-3-plan.md
`);
    fs.writeFileSync(executionPath, JSON.stringify({
      schema: 'execution-state.v1',
      status: 'active',
      current_task_key: 'phase-3-step-1-line-10',
      active_plan: '/tmp/phase-3-plan.md',
      notes_dir: '/tmp/notepads'
    }, null, 2));

    const result = runDoctor(repoRoot);
    assert.equal(result.continuity.current_phase, 'Phase 3');
    assert.equal(result.execution.present, true);
    assert.equal(result.execution.current_task_key, 'phase-3-step-1-line-10');
    assert.equal(result.verification.available, true);
    assert.ok(result.router.sample_resolution.primary_model);
    assert.ok(result.adapters['claude-code'].hooks);
    assert.equal(result.recommended_next_command, null);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('doctor warns when workflow state has a related plan but no execution state', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-doctor-')), 'warning');
  const context = runProjectContext(repoRoot);

  try {
    fs.mkdirSync(path.dirname(context.contextPaths.state), { recursive: true });
    fs.writeFileSync(context.contextPaths.state, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 3

## Next Step
- Resume implementation

## Blockers
- None.

## Last Verified At
- now

## Related Plan
- /tmp/phase-3-plan.md

## Active Artifact Working Set
- Last updated: now
- Source: test
- Focus: phase 3

### Selected By Category
- intake: none
- plan: /tmp/phase-3-plan.md
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. /tmp/phase-3-plan.md
`);

    const result = runDoctor(repoRoot);
    assert.equal(result.ok, false);
    assert.match(result.warnings.join('\n'), /no active execution state/);
    assert.equal(result.execution.present, false);
    assert.equal(result.recommended_next_command, '/start-work');
    assert.equal(result.actions[0].issue, 'missing_execution_state');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('doctor recommends stop-work when execution state is stale', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-doctor-')), 'stale');
  const context = runProjectContext(repoRoot);
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');

  try {
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.mkdirSync(path.dirname(context.contextPaths.state), { recursive: true });
    fs.writeFileSync(context.contextPaths.state, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 3

## Next Step
- Resume implementation

## Blockers
- None.

## Last Verified At
- now

## Related Plan
- /tmp/phase-3-plan.md

## Active Artifact Working Set
- Last updated: now
- Source: test
- Focus: phase 3

### Selected By Category
- intake: none
- plan: /tmp/phase-3-plan.md
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. /tmp/phase-3-plan.md
`);
    fs.writeFileSync(executionPath, JSON.stringify({
      schema: 'execution-state.v1',
      status: 'active',
      current_task_key: 'phase-3-step-2-line-20',
      active_plan: '/tmp/phase-3-plan.md',
      updated_at: '2020-01-01T00:00:00.000Z'
    }, null, 2));

    const result = runDoctor(repoRoot);
    assert.equal(result.ok, false);
    assert.equal(result.execution.stale, true);
    assert.equal(result.recommended_next_command, '/stop-work');
    assert.equal(result.actions[0].issue, 'stale_execution_state');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});
