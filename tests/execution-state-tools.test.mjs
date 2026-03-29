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

const runExecutionTool = (args, repoRoot) =>
  JSON.parse(execFileSync('node', ['scripts/execution-state-tools.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

test('execution-state create initializes active execution and notes for a plan checklist', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-execution-')), 'create');
  const planPath = path.join(repoRoot, '.planning', 'plan.md');
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, [
    '# Plan',
    '',
    '## Phase 1',
    '### Step 1',
    '- [x] finished',
    '- [ ] pending one',
    '### Step 2',
    '- [ ] pending two'
  ].join('\n'));

  try {
    const result = runExecutionTool(['create', '--plan', planPath, '--session-id', 'session-a'], repoRoot);
    assert.equal(result.action, 'create');
    assert.equal(result.state.active_plan, planPath);
    assert.equal(result.state.status, 'active');
    assert.equal(result.state.session_ids[0], 'session-a');
    assert.equal(result.state.current_task_key.includes('pending-one'), true);
    assert.equal(fs.existsSync(result.execution_path), true);
    assert.equal(fs.existsSync(path.join(result.state.notes_dir, 'learnings.md')), true);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('execution-state update-progress and task-session lineage update deterministically', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-execution-')), 'progress');
  const planPath = path.join(repoRoot, '.planning', 'plan.md');
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, [
    '# Plan',
    '',
    '## Phase 1',
    '- [ ] first task',
    '- [ ] second task'
  ].join('\n'));

  try {
    const created = runExecutionTool(['create', '--plan', planPath], repoRoot);
    const firstKey = created.state.current_task_key;
    const secondKey = created.state.task_catalog.find((task) => task.key !== firstKey).key;

    const progressed = runExecutionTool(['update-progress', '--complete', firstKey], repoRoot);
    assert.deepEqual(progressed.state.completed_task_keys, [firstKey]);
    assert.equal(progressed.state.current_task_key, secondKey);

    const linked = runExecutionTool([
      'upsert-task-session',
      '--task-key', secondKey,
      '--session-id', 'session-b',
      '--agent', 'Codex',
      '--category', 'implementation'
    ], repoRoot);
    assert.equal(linked.state.task_sessions[secondKey].session_id, 'session-b');
    assert.equal(linked.state.task_sessions[secondKey].agent, 'Codex');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('execution-state pause, resume, complete, and clear preserve lifecycle meaning', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-execution-')), 'lifecycle');
  const planPath = path.join(repoRoot, '.planning', 'plan.md');
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, '# Plan\n- [ ] only task\n');

  try {
    runExecutionTool(['create', '--plan', planPath], repoRoot);
    const paused = runExecutionTool(['pause', '--reason', 'operator pause'], repoRoot);
    assert.equal(paused.state.status, 'paused');
    assert.equal(paused.state.stop_reason, 'operator pause');

    const resumed = runExecutionTool(['resume', '--session-id', 'session-c'], repoRoot);
    assert.equal(resumed.state.status, 'active');
    assert.equal(resumed.state.session_ids.includes('session-c'), true);

    const completed = runExecutionTool(['complete', '--reason', 'done'], repoRoot);
    assert.equal(completed.state.status, 'completed');

    const cleared = runExecutionTool(['clear'], repoRoot);
    assert.equal(cleared.cleared, true);
    assert.equal(fs.existsSync(cleared.execution_path), false);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('execution-state advise reports reminder and cleanup guidance for active and terminal states', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-execution-')), 'advise');
  const planPath = path.join(repoRoot, '.planning', 'plan.md');
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, [
    '# Plan',
    '',
    '- [ ] first task',
    '- [ ] second task'
  ].join('\n'));

  try {
    const created = runExecutionTool(['create', '--plan', planPath], repoRoot);
    const advice = runExecutionTool(['advise'], repoRoot);
    assert.equal(advice.action, 'advise');
    assert.equal(advice.guidance.present, true);
    assert.equal(advice.guidance.remaining_task_count, 2);
    assert.match(advice.guidance.reminder, /remaining task/);
    assert.equal(advice.guidance.cleanup, null);

    runExecutionTool(['complete', '--reason', 'done'], repoRoot);
    const terminalAdvice = runExecutionTool(['advise'], repoRoot);
    assert.equal(terminalAdvice.guidance.status, 'completed');
    assert.equal(terminalAdvice.guidance.cleanup.recommended_command, '/stop-work');
    assert.match(terminalAdvice.guidance.cleanup.reason, /terminal/i);
    assert.equal(terminalAdvice.guidance.current_task, null);
    assert.equal(created.state.task_catalog.length, 2);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});
