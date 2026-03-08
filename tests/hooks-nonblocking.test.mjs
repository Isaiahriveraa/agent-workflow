import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('compatibility hook wrappers delegate to claude adapter files', () => {
  const updateWrapper = read('hooks/gsd-check-update.js');
  const statuslineWrapper = read('hooks/gsd-statusline.js');

  assert.match(updateWrapper, /adapters\/claude-code\/hooks\/gsd-check-update\.js/);
  assert.match(statuslineWrapper, /adapters\/claude-code\/statusline\/gsd-statusline\.js/);
});

test('claude adapter hook implementations are defensive and non-blocking', () => {
  const updateHook = read('adapters/claude-code/hooks/gsd-check-update.js');
  const statusline = read('adapters/claude-code/statusline/gsd-statusline.js');

  assert.match(updateHook, /try \{/);
  assert.match(updateHook, /Repo-local supplements:/);
  assert.match(updateHook, /path\.join\('\.agents', 'repo\.md'\)/);
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
