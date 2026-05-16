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
  const contextMonitorCjs = read('hooks/gsd-context-monitor.cjs');
  const contextMonitorAlias = read('hooks/gsd-context-monitor.js');
  const rpiArtifactCjs = read('hooks/gsd-rpi-artifact-watcher.cjs');
  const rpiArtifactAlias = read('hooks/gsd-rpi-artifact-watcher.js');
  const consolidationCjs = read('hooks/gsd-stop-memory-consolidation.cjs');
  const consolidationAlias = read('hooks/gsd-stop-memory-consolidation.js');

  // .cjs files must be self-contained implementations (no child spawn to adapter path)
  assert.match(updateCjs, /AGENTS_DISABLE_UPDATE_CHECK/);
  assert.match(updateCjs, /gsd-update-check\.json/);
  assert.match(contextMonitorCjs, /WARNING_THRESHOLD/);
  assert.match(rpiArtifactCjs, /workflow-artifact-tools\.mjs/);
  assert.match(consolidationCjs, /memory-consolidation\.mjs/);
  assert.match(consolidationCjs, /DEBOUNCE_SECONDS/);

  // .js aliases must reference the corresponding local .cjs files (not adapter paths)
  assert.match(updateAlias, /\.\/gsd-check-update\.cjs|adapters\/claude-code\/hooks\/gsd-check-update\.js/);
  assert.match(statuslineWrapper, /adapters\/claude-code\/statusline\/gsd-statusline\.(js|cjs)/);
  assert.match(contextMonitorAlias, /\.\/gsd-context-monitor\.cjs/);
  assert.match(rpiArtifactAlias, /\.\/gsd-rpi-artifact-watcher\.cjs/);
  assert.match(consolidationAlias, /\.\/gsd-stop-memory-consolidation\.cjs/);
});

test('claude adapter hook implementations are defensive and non-blocking', () => {
  const updateHook = read('adapters/claude-code/hooks/gsd-check-update.js');
  const statusline = read('adapters/claude-code/statusline/gsd-statusline.js');

  assert.match(updateHook, /try \{/);
  assert.match(updateHook, /Repo-local supplements:/);
  assert.match(updateHook, /AGENTS_DISABLE_UPDATE_CHECK/);
  assert.match(statusline, /Silent fail|Silently fail/);
});

test('session start hook emits a compact repo-local supplement note when artifacts exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-hook-'));
  const repoRoot = path.join(tmpDir, 'repo');
  const homeDir = path.join(tmpDir, 'home');
  const hookPath = fileURLToPath(new URL('../adapters/claude-code/hooks/gsd-check-update.js', import.meta.url));

  try {
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, '.omx', 'state', 'contexts'), { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(repoRoot, '.omx', 'repo.md'), '# repo\n');
    fs.writeFileSync(path.join(repoRoot, '.omx', 'state', 'contexts', 'state.md'), '# state\n');
    fs.writeFileSync(path.join(repoRoot, '.omx', 'state', 'contexts', 'session-index.md'), '# session\n');

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
    assert.match(output, new RegExp(path.join(repoRoot, '.omx', 'repo.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(output, new RegExp(path.join(repoRoot, '.omx', 'state', 'contexts', 'state.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(output, new RegExp(path.join(repoRoot, '.omx', 'state', 'contexts', 'session-index.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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
    fs.mkdirSync(path.join(repoRoot, '.omx', 'state', 'contexts'), { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(repoRoot, '.omx', 'repo.md'), '# repo\n');
    fs.writeFileSync(path.join(repoRoot, '.omx', 'state', 'contexts', 'state.md'), '# state\n');
    fs.writeFileSync(path.join(repoRoot, '.omx', 'state', 'contexts', 'session-index.md'), '# session\n');

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

test('rpi artifact watcher prompts critique for research artifacts in the Claude adapter', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-rpi-hook-'));
  const repoRoot = path.join(tmpDir, 'repo');
  const homeDir = path.join(tmpDir, 'home');
  const hookPath = fileURLToPath(new URL('../adapters/claude-code/hooks/gsd-rpi-artifact-watcher.js', import.meta.url));
  const artifactPath = path.join(repoRoot, 'thoughts', 'research', '2026-04-03-rpi-hook.md');

  try {
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(artifactPath, '# artifact\n');

    const output = execFileSync(process.execPath, [hookPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({
        tool_name: 'Write',
        tool_input: { file_path: artifactPath },
        workspace: { current_dir: repoRoot }
      }),
      env: {
        ...process.env,
        HOME: homeDir,
        AGENTS_ROOT: '/Users/isaiahrivera/.agents'
      }
    });

    assert.match(output, /Research artifact detected:/);
    assert.match(output, new RegExp(artifactPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(output, /Run \/rpi-critique .* to critique and improve this artifact in-place\./);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('codex pre-bash guard blocks risky shell aliases without blocking safe commands', () => {
  const hookPath = fileURLToPath(new URL('../hooks/gsd-pre-bash-guard.cjs', import.meta.url));

  const blocked = execFileSync(process.execPath, [hookPath], {
    encoding: 'utf8',
    input: JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'unified_exec',
      tool_input: { command: 'git reset --hard HEAD' }
    })
  });

  const parsed = JSON.parse(blocked);
  assert.equal(parsed.decision, 'block');
  assert.equal(parsed.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(parsed.reason, /reset_hard/);

  const safe = execFileSync(process.execPath, [hookPath], {
    encoding: 'utf8',
    input: JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'pwd' }
    })
  });

  assert.equal(safe, '');
});
