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

const projectContext = (repoRoot) =>
  JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

const runAutonomy = (args, repoRoot) =>
  JSON.parse(execFileSync('node', ['scripts/autonomy-tools.mjs', 'evaluate', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

test('autonomy recommends resume_execution when execution state is paused', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-autonomy-')), 'paused');
  const context = projectContext(repoRoot);
  const executionPath = path.join(repoRoot, '.agents', 'runtime', 'execution', 'active.json');

  try {
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.writeFileSync(context.contextPaths.state, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 3

## Next Step
- Resume phase 3 implementation

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
      status: 'paused',
      current_task_key: 'phase-3-step-1-line-10',
      active_plan: '/tmp/phase-3-plan.md'
    }, null, 2));

    const result = runAutonomy([], repoRoot);
    assert.equal(result.recommended_action, 'resume_execution');
    assert.equal(result.execution.status, 'paused');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('autonomy recommends checkpoint when context is critically low', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-autonomy-')), 'critical');

  try {
    const result = runAutonomy(['--context-remaining', '20'], repoRoot);
    assert.equal(result.recommended_action, 'checkpoint');
    assert.equal(result.checks.context_remaining, 20);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('autonomy recommends continue when execution is active', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-autonomy-')), 'active');
  const executionPath = path.join(repoRoot, '.agents', 'runtime', 'execution', 'active.json');

  try {
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.writeFileSync(executionPath, JSON.stringify({
      schema: 'execution-state.v1',
      status: 'active',
      current_task_key: 'phase-3-step-2-line-20',
      active_plan: '/tmp/phase-3-plan.md'
    }, null, 2));

    const result = runAutonomy([], repoRoot);
    assert.equal(result.recommended_action, 'continue');
    assert.equal(result.execution.current_task_key, 'phase-3-step-2-line-20');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});
