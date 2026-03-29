import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const hookPath = path.join(root, 'hooks', 'gsd-pre-compact-archive.cjs');

test('pre-compact archive includes execution-state context in restoration guidance', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-pre-compact-'));
  const statePath = path.join(repoRoot, '.agents', 'contexts', 'state.md');
  const executionPath = path.join(repoRoot, '.agents', 'runtime', 'execution', 'active.json');

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.writeFileSync(statePath, [
      '# Workflow State',
      '',
      '## Current Workflow',
      '- implementation',
      '',
      '## Current Phase',
      '- phase 1',
      '',
      '## Next Step',
      '- Continue current task',
      '',
      '## Related Plan',
      '- /tmp/plan.md'
    ].join('\n'));
    fs.writeFileSync(executionPath, JSON.stringify({
      status: 'active',
      current_task_key: 'phase-1-step-1-line-10',
      updated_at: new Date().toISOString()
    }, null, 2));

    const result = spawnSync(process.execPath, [hookPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({ session_id: 'session-1' })
    });

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.hookSpecificOutput.additionalContext, /Execution:/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /Task:\s+phase-1-step-1-line-10/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('pre-compact archive prefers the active execution plan over the broader related plan', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-pre-compact-'));
  const statePath = path.join(repoRoot, '.agents', 'contexts', 'state.md');
  const executionPath = path.join(repoRoot, '.agents', 'runtime', 'execution', 'active.json');
  const parentPlan = '/tmp/parent-plan.md';
  const childPlan = '/tmp/phase-3-plan.md';

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.writeFileSync(statePath, [
      '# Workflow State',
      '',
      '## Current Workflow',
      '- implementation',
      '',
      '## Current Phase',
      '- phase 3',
      '',
      '## Next Step',
      '- Resume phase 3 work',
      '',
      '## Related Plan',
      `- ${parentPlan}`
    ].join('\n'));
    fs.writeFileSync(executionPath, JSON.stringify({
      status: 'active',
      active_plan: childPlan,
      current_task_key: 'phase-3-step-1-line-71',
      updated_at: new Date().toISOString()
    }, null, 2));

    const result = spawnSync(process.execPath, [hookPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({ session_id: 'session-2' })
    });

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.hookSpecificOutput.additionalContext, new RegExp(`Related Plan:\\s+${parentPlan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(parsed.hookSpecificOutput.additionalContext, new RegExp(`Execution Plan:\\s+${childPlan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    const checkpointMatch = parsed.hookSpecificOutput.additionalContext.match(/Checkpoint:\s+(.+)/);
    assert.ok(checkpointMatch);
    const checkpoint = JSON.parse(fs.readFileSync(checkpointMatch[1].trim(), 'utf8'));
    assert.equal(checkpoint.related_plan, childPlan);
    assert.match(checkpoint.notes, /Execution plan overrides related plan/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('pre-compact archive includes autonomy advice in restoration guidance when execution is paused', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-pre-compact-'));
  const statePath = path.join(repoRoot, '.agents', 'contexts', 'state.md');
  const executionPath = path.join(repoRoot, '.agents', 'runtime', 'execution', 'active.json');

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.writeFileSync(statePath, [
      '# Workflow State',
      '',
      '## Current Workflow',
      '- implementation',
      '',
      '## Current Phase',
      '- phase 3',
      '',
      '## Next Step',
      '- Resume phase 3 work',
      '',
      '## Related Plan',
      '- /tmp/phase-3-plan.md'
    ].join('\n'));
    fs.writeFileSync(executionPath, JSON.stringify({
      status: 'paused',
      active_plan: '/tmp/phase-3-plan.md',
      current_task_key: 'phase-3-step-1-line-71',
      updated_at: new Date().toISOString()
    }, null, 2));

    const result = spawnSync(process.execPath, [hookPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({ session_id: 'session-3' })
    });

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.hookSpecificOutput.additionalContext, /Autonomy:\s+resume_execution/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /resume or deliberately clear it/i);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
