import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const hookPath = path.join(root, 'hooks', 'gsd-subagent-tracker.cjs');

const runHook = ({ cwd, payload, sessionId = 'session-1' }) =>
  spawnSync(process.execPath, [hookPath], {
    cwd,
    encoding: 'utf8',
    input: JSON.stringify(payload ?? { session_id: sessionId }),
    env: {
      ...process.env,
      AGENTS_ROOT: root
    }
  });

test('subagent tracker records execution task lineage for delegated Claude-native subagent spawns', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-subagent-tracker-'));
  const statePath = path.join(repoRoot, '.omx', 'state', 'contexts', 'state.md');
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');
  const notesDir = path.join(repoRoot, '.omx', 'runtime', 'execution', 'notepads', 'phase-4-plan');

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.mkdirSync(notesDir, { recursive: true });

    fs.writeFileSync(statePath, `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- oh-my-openagent-adoption-plan

## Current Phase
- Phase 4 Step 3

## Next Step
- Add Claude accelerators

## Blockers
- None.

## Last Verified At
- now

## Related Plan
- /tmp/phase-4-plan.md

## Active Artifact Working Set
- Last updated: now
- Source: test
- Focus: phase 4

### Selected By Category
- intake: none
- plan: /tmp/phase-4-plan.md
- research: none
- session: none
- handoff: none

### Ordered Artifacts
1. /tmp/phase-4-plan.md
`);
    fs.writeFileSync(executionPath, JSON.stringify({
      schema: 'execution-state.v1',
      active_plan: '/tmp/phase-4-plan.md',
      plan_name: 'phase-4-plan',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active',
      session_ids: [],
      current_task_key: 'phase-4-step-3-line-10',
      completed_task_keys: [],
      task_sessions: {},
      notes_dir: notesDir,
      task_catalog: [
        { key: 'phase-4-step-3-line-10', label: 'Add Claude accelerators', completed: false, line: 10, scope: 'Phase 4 / Step 3' }
      ]
    }, null, 2));

    const result = runHook({
      cwd: repoRoot,
      sessionId: 'session-123',
      payload: {
        session_id: 'session-123',
        tool_name: 'agent',
        tool_input: {
          task: 'Add Claude accelerators'
        }
      }
    });

    assert.equal(result.status, 0);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const updatedExecution = JSON.parse(fs.readFileSync(executionPath, 'utf8'));
    assert.equal(updatedExecution.task_sessions['phase-4-step-3-line-10'].session_id, 'session-123');
    assert.equal(updatedExecution.task_sessions['phase-4-step-3-line-10'].agent, 'agent');
    assert.equal(updatedExecution.task_sessions['phase-4-step-3-line-10'].category, 'unspecified-high');

    const updatedState = fs.readFileSync(statePath, 'utf8');
    assert.match(updatedState, /Subagent spawned: agent/);
    assert.match(updatedState, /task: phase-4-step-3-line-10/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('subagent tracker stays non-blocking when no execution state exists', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-subagent-tracker-'));

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    const result = runHook({
      cwd: repoRoot,
      sessionId: 'session-456',
      payload: {
        session_id: 'session-456',
        tool_name: 'agent',
        tool_input: {
          task: 'Investigate the current issue'
        }
      }
    });

    assert.equal(result.status, 0);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
