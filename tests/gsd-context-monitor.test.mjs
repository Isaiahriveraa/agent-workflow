import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const hookPath = path.join(root, 'hooks', 'gsd-context-monitor.js');

const runHook = ({ payload, metrics, env = {}, warned, sessionId = 'session-1' }) => {
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
      cwd: root,
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
