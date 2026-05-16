import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const hookPath = path.join(root, 'hooks', 'gsd-context-monitor.js');

const runHook = ({ payload, metrics, env = {}, warned, sessionId = 'session-1', cwd = root }) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-hook-test-'));
  const metricsPath = path.join(tmpRoot, `claude-ctx-${sessionId}.json`);
  const warnedPath = path.join(tmpRoot, `claude-ctx-${sessionId}-warned.json`);

  try {
    if (metrics) {
      fs.writeFileSync(metricsPath, JSON.stringify(metrics));
    }
    if (warned) {
      fs.writeFileSync(warnedPath, JSON.stringify(warned));
    }

    const result = spawnSync(process.execPath, [hookPath], {
      cwd,
      encoding: 'utf8',
      input: JSON.stringify(payload ?? { session_id: sessionId }),
      env: {
        ...process.env,
        TMPDIR: tmpRoot,
        ...env
      }
    });

    return {
      ...result,
      tmpRoot,
      metricsPath,
      warnedPath
    };
  } catch (error) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    throw error;
  }
};

test('context monitor emits warning output at warning threshold', async () => {
  const now = Math.floor(Date.now() / 1000);
  const result = runHook({
    metrics: {
      timestamp: now,
      remaining_percentage: 35,
      used_pct: 65
    }
  });

  try {
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.hookSpecificOutput.additionalContext, /CONTEXT MONITOR WARNING/);
  } finally {
    fs.rmSync(result.tmpRoot, { recursive: true, force: true });
  }
});

test('context monitor defaults to handoff automation when not overridden', async () => {
  const helperLog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-hook-helper-')), 'helper.json');
  const helperScript = path.join(path.dirname(helperLog), 'helper.mjs');
  fs.writeFileSync(helperScript, `import fs from 'node:fs'; fs.writeFileSync(process.env.HELPER_LOG, JSON.stringify(process.argv.slice(2)));`);

  const now = Math.floor(Date.now() / 1000);
  const result = runHook({
    metrics: {
      timestamp: now,
      remaining_percentage: 20,
      used_pct: 80
    },
    env: {
      AGENTS_CONTINUITY_HELPER: helperScript,
      HELPER_LOG: helperLog
    }
  });

  try {
    assert.equal(result.status, 0);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const helperArgs = JSON.parse(fs.readFileSync(helperLog, 'utf8'));
    assert.equal(helperArgs[0], 'handoff');
  } finally {
    fs.rmSync(path.dirname(helperLog), { recursive: true, force: true });
    fs.rmSync(result.tmpRoot, { recursive: true, force: true });
  }
});

test('context monitor ignores stale metrics', async () => {
  const now = Math.floor(Date.now() / 1000);
  const result = runHook({
    metrics: {
      timestamp: now - 120,
      remaining_percentage: 20,
      used_pct: 80
    }
  });

  try {
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  } finally {
    fs.rmSync(result.tmpRoot, { recursive: true, force: true });
  }
});

test('context monitor debounces repeat warnings unless severity escalates', async () => {
  const now = Math.floor(Date.now() / 1000);
  const result = runHook({
    metrics: {
      timestamp: now,
      remaining_percentage: 34,
      used_pct: 66
    },
    warned: {
      callsSinceWarn: 1,
      lastLevel: 'warning'
    }
  });

  try {
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');

    const warned = JSON.parse(fs.readFileSync(result.warnedPath, 'utf8'));
    assert.equal(warned.callsSinceWarn, 2);
    assert.equal(warned.lastLevel, 'warning');
  } finally {
    fs.rmSync(result.tmpRoot, { recursive: true, force: true });
  }
});

test('context monitor bypasses debounce when warning escalates to critical', async () => {
  const now = Math.floor(Date.now() / 1000);
  const result = runHook({
    metrics: {
      timestamp: now,
      remaining_percentage: 20,
      used_pct: 80
    },
    warned: {
      callsSinceWarn: 1,
      lastLevel: 'warning'
    }
  });

  try {
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.hookSpecificOutput.additionalContext, /CONTEXT MONITOR CRITICAL/);
  } finally {
    fs.rmSync(result.tmpRoot, { recursive: true, force: true });
  }
});

test('context monitor mentions active execution task when execution state is present', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-context-monitor-'));
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');
  const now = Math.floor(Date.now() / 1000);

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.writeFileSync(executionPath, JSON.stringify({
      status: 'active',
      current_task_key: 'phase-1-step-1-line-10',
      updated_at: new Date().toISOString()
    }, null, 2));

    const result = runHook({
      cwd: repoRoot,
      env: { AGENTS_ROOT: repoRoot },
      metrics: {
        timestamp: now,
        remaining_percentage: 35,
        used_pct: 65
      }
    });

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.hookSpecificOutput.additionalContext, /Active execution:/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /Current task: phase-1-step-1-line-10/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('context monitor includes autonomy recommendation in warning output', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-context-monitor-'));
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');
  const statePath = path.join(repoRoot, '.omx', 'state', 'contexts', 'state.md');
  const now = Math.floor(Date.now() / 1000);

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.dirname(executionPath), { recursive: true });
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, `# Workflow State

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
      status: 'paused',
      current_task_key: 'phase-3-step-1-line-10',
      updated_at: new Date().toISOString()
    }, null, 2));

    const result = runHook({
      cwd: repoRoot,
      env: { AGENTS_ROOT: repoRoot },
      metrics: {
        timestamp: now,
        remaining_percentage: 35,
        used_pct: 65
      }
    });

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.hookSpecificOutput.additionalContext, /CONTEXT MONITOR WARNING/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /paused/i);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('context monitor triggers checkpoint automation in checkpoint mode', async () => {
  const helperLog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-hook-helper-')), 'helper.json');
  const helperScript = path.join(path.dirname(helperLog), 'helper.mjs');
  fs.writeFileSync(helperScript, `import fs from 'node:fs'; fs.writeFileSync(process.env.HELPER_LOG, JSON.stringify(process.argv.slice(2)));`);

  const now = Math.floor(Date.now() / 1000);
  const result = runHook({
    metrics: {
      timestamp: now,
      remaining_percentage: 35,
      used_pct: 65
    },
    env: {
      AGENTS_CONTINUITY_AUTOMATION: 'checkpoint',
      AGENTS_CONTINUITY_HELPER: helperScript,
      HELPER_LOG: helperLog
    }
  });

  try {
    assert.equal(result.status, 0);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const helperArgs = JSON.parse(fs.readFileSync(helperLog, 'utf8'));
    assert.equal(helperArgs[0], 'checkpoint');
    assert.match(helperArgs.join(' '), /gsd-context-monitor/);
    assert.match(helperArgs.join(' '), /resume the tracked plan|wrap up the current task|checkpoint/i);
  } finally {
    fs.rmSync(path.dirname(helperLog), { recursive: true, force: true });
    fs.rmSync(result.tmpRoot, { recursive: true, force: true });
  }
});

test('context monitor triggers handoff automation on critical threshold in handoff mode', async () => {
  const helperLog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-hook-helper-')), 'helper.json');
  const helperScript = path.join(path.dirname(helperLog), 'helper.mjs');
  fs.writeFileSync(helperScript, `import fs from 'node:fs'; fs.writeFileSync(process.env.HELPER_LOG, JSON.stringify(process.argv.slice(2)));`);

  const now = Math.floor(Date.now() / 1000);
  const result = runHook({
    metrics: {
      timestamp: now,
      remaining_percentage: 20,
      used_pct: 80
    },
    env: {
      AGENTS_CONTINUITY_AUTOMATION: 'handoff',
      AGENTS_CONTINUITY_HELPER: helperScript,
      HELPER_LOG: helperLog
    }
  });

  try {
    assert.equal(result.status, 0);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const helperArgs = JSON.parse(fs.readFileSync(helperLog, 'utf8'));
    assert.equal(helperArgs[0], 'handoff');
  } finally {
    fs.rmSync(path.dirname(helperLog), { recursive: true, force: true });
    fs.rmSync(result.tmpRoot, { recursive: true, force: true });
  }
});
