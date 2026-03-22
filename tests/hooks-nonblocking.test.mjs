import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('compatibility hooks are self-contained CJS implementations with ESM aliases', () => {
  const updateCjs = read('hooks/gsd-check-update.cjs');
  const updateAlias = read('hooks/gsd-check-update.js');
  const statuslineWrapper = read('hooks/gsd-statusline.js');
  const stopLessonCjs = read('hooks/gsd-stop-lesson-capture.cjs');
  const stopLessonAlias = read('hooks/gsd-stop-lesson-capture.js');
  const contextMonitorCjs = read('hooks/gsd-context-monitor.cjs');
  const contextMonitorAlias = read('hooks/gsd-context-monitor.js');
  const rpiArtifactCjs = read('hooks/gsd-rpi-artifact-watcher.cjs');
  const rpiArtifactAlias = read('hooks/gsd-rpi-artifact-watcher.js');
  const rpiMemoryCjs = read('hooks/gsd-rpi-memory-sync.cjs');
  const rpiMemoryAlias = read('hooks/gsd-rpi-memory-sync.js');

  // .cjs files must be self-contained implementations (no child spawn to adapter path)
  assert.match(updateCjs, /AGENTS_DISABLE_UPDATE_CHECK/);
  assert.match(updateCjs, /gsd-update-check\.json/);
  assert.match(stopLessonCjs, /lesson-tools\.mjs/);
  assert.match(stopLessonCjs, /AGENTS_LESSON_AUTOMATION/);
  assert.match(contextMonitorCjs, /WARNING_THRESHOLD/);
  assert.match(rpiArtifactCjs, /workflow-artifact-tools\.mjs/);
  assert.match(rpiMemoryCjs, /lesson-tools\.mjs/);

  // .js aliases must reference the corresponding local .cjs files (not adapter paths)
  assert.match(updateAlias, /\.\/gsd-check-update\.cjs|adapters\/claude-code\/hooks\/gsd-check-update\.js/);
  assert.match(statuslineWrapper, /adapters\/claude-code\/statusline\/gsd-statusline\.(js|cjs)/);
  assert.match(stopLessonAlias, /\.\/gsd-stop-lesson-capture\.cjs/);
  assert.match(contextMonitorAlias, /\.\/gsd-context-monitor\.cjs/);
  assert.match(rpiArtifactAlias, /\.\/gsd-rpi-artifact-watcher\.cjs/);
  assert.match(rpiMemoryAlias, /\.\/gsd-rpi-memory-sync\.cjs/);
});

test('claude adapter hook implementations are defensive and non-blocking', () => {
  const updateHook = read('adapters/claude-code/hooks/gsd-check-update.js');
  const stopLessonHook = read('adapters/claude-code/hooks/gsd-stop-lesson-capture.js');
  const statusline = read('adapters/claude-code/statusline/gsd-statusline.js');

  assert.match(updateHook, /try \{/);
  assert.match(updateHook, /Repo-local supplements:/);
  assert.match(updateHook, /path\.join\('\.agents', 'repo\.md'\)/);
  assert.match(updateHook, /AGENTS_DISABLE_UPDATE_CHECK/);
  assert.match(stopLessonHook, /try \{/);
  assert.match(stopLessonHook, /lesson-tools\.mjs/);
  assert.match(stopLessonHook, /AGENTS_LESSON_AUTOMATION/);
  assert.match(statusline, /Silent fail|Silently fail/);
});

test('session start hook emits a compact repo-local supplement note when artifacts exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-hook-'));
  const repoRoot = path.join(tmpDir, 'repo');
  const homeDir = path.join(tmpDir, 'home');
  const hookPath = fileURLToPath(new URL('../adapters/claude-code/hooks/gsd-check-update.js', import.meta.url));

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, '.agents', 'contexts'), { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(repoRoot, '.agents', 'repo.md'), '# repo\n');
    fs.writeFileSync(path.join(repoRoot, '.agents', 'contexts', 'state.md'), '# state\n');
    fs.writeFileSync(path.join(repoRoot, '.agents', 'contexts', 'session-index.md'), '# session\n');

    const output = execFileSync(process.execPath, [hookPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: homeDir,
        AGENTS_DISABLE_UPDATE_CHECK: '1'
      }
    });

    assert.match(output, /^Repo-local supplements:/m);
    assert.match(output, new RegExp(path.join(repoRoot, '.agents', 'repo.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(output, new RegExp(path.join(repoRoot, '.agents', 'contexts', 'state.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(output, new RegExp(path.join(repoRoot, '.agents', 'contexts', 'session-index.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('stop hook triggers queued lesson flush in the background', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-stop-hook-'));
  const repoRoot = path.join(tmpDir, 'repo');
  const helperLog = path.join(tmpDir, 'helper.json');
  const helperScript = path.join(tmpDir, 'helper.mjs');
  const hookPath = fileURLToPath(new URL('../adapters/claude-code/hooks/gsd-stop-lesson-capture.js', import.meta.url));

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.writeFileSync(helperScript, `import fs from 'node:fs'; fs.writeFileSync(process.env.HELPER_LOG, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), projectRoot: process.env.AGENTS_PROJECT_ROOT }));`);

    execFileSync(process.execPath, [hookPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({ cwd: repoRoot }),
      env: {
        ...process.env,
        AGENTS_LESSON_HELPER: helperScript,
        AGENTS_CACHE_DIR: path.join(tmpDir, 'cache'),
        HELPER_LOG: helperLog
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    const invocation = JSON.parse(fs.readFileSync(helperLog, 'utf8'));
    assert.deepEqual(invocation.args, ['flush']);
    assert.equal(fs.realpathSync(invocation.cwd), fs.realpathSync(repoRoot));
    assert.equal(fs.realpathSync(invocation.projectRoot), fs.realpathSync(repoRoot));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('legacy stop hook alias stays executable under the ESM hooks package', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-stop-hook-alias-'));
  const repoRoot = path.join(tmpDir, 'repo');
  const helperLog = path.join(tmpDir, 'helper.json');
  const helperScript = path.join(tmpDir, 'helper.mjs');
  const hookPath = fileURLToPath(new URL('../hooks/gsd-stop-lesson-capture.js', import.meta.url));

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.writeFileSync(helperScript, `import fs from 'node:fs'; fs.writeFileSync(process.env.HELPER_LOG, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), projectRoot: process.env.AGENTS_PROJECT_ROOT }));`);

    execFileSync(process.execPath, [hookPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({ cwd: repoRoot }),
      env: {
        ...process.env,
        AGENTS_LESSON_HELPER: helperScript,
        AGENTS_CACHE_DIR: path.join(tmpDir, 'cache'),
        HELPER_LOG: helperLog
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    const invocation = JSON.parse(fs.readFileSync(helperLog, 'utf8'));
    assert.deepEqual(invocation.args, ['flush']);
    assert.equal(fs.realpathSync(invocation.cwd), fs.realpathSync(repoRoot));
    assert.equal(fs.realpathSync(invocation.projectRoot), fs.realpathSync(repoRoot));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('legacy session start hook alias stays executable under the ESM hooks package', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-update-hook-alias-'));
  const repoRoot = path.join(tmpDir, 'repo');
  const homeDir = path.join(tmpDir, 'home');
  const hookPath = fileURLToPath(new URL('../hooks/gsd-check-update.js', import.meta.url));

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, '.agents', 'contexts'), { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(repoRoot, '.agents', 'repo.md'), '# repo\n');
    fs.writeFileSync(path.join(repoRoot, '.agents', 'contexts', 'state.md'), '# state\n');
    fs.writeFileSync(path.join(repoRoot, '.agents', 'contexts', 'session-index.md'), '# session\n');

    const output = execFileSync(process.execPath, [hookPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: homeDir,
        AGENTS_DISABLE_UPDATE_CHECK: '1'
      }
    });

    assert.match(output, /^Repo-local supplements:/m);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
