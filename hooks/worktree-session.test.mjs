import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const hook = fileURLToPath(new URL('./worktree-session.sh', import.meta.url));

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'worktree-session-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  Object.assign(env, {
    HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test User', GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test User', GIT_COMMITTER_EMAIL: 'test@example.com',
    WORKTREE_STATUS_CACHE_DIR: join(root, 'cache'),
  });
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), '#!/usr/bin/env bash\necho null\n');
  chmodSync(join(bin, 'gh'), 0o755);
  env.PATH = `${bin}:${process.env.PATH}`;

  const main = join(root, 'main');
  execFileSync('git', ['init', '-b', 'main', main], { env, stdio: 'ignore' });
  execFileSync('git', ['commit', '--allow-empty', '-m', 'Initial'], { cwd: main, env, stdio: 'ignore' });
  const commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: main, env, encoding: 'utf8',
  }).trim();
  const key = createHash('sha1').update(commonDir).digest('hex').slice(0, 16);
  const run = (cwd) => spawnSync('bash', [hook], { cwd, env, encoding: 'utf8' });
  return { root, main, env, key, run };
}

test('outside a git repository the hook prints nothing and exits cleanly', (t) => {
  const { root, run } = fixture(t);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('cached cleanup and keep-dirty worktrees are shown at session start', (t) => {
  const { main, key, run } = fixture(t);
  const cacheDir = join(main, '..', 'cache');
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, `${key}.txt`), [
    'open     feat/a    clean  keep      /x/a',
    'merged   feat/b    clean  cleanup   /x/b',
    'merged   feat/c    3      keep-dirty /x/c',
    'no-pr    feat/d    clean  keep      /x/d',
    '',
  ].join('\n'));
  const result = run(main);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /feat\/b/);
  assert.match(result.stdout, /feat\/c/);
  assert.doesNotMatch(result.stdout, /feat\/a|feat\/d/);
});

test('with no cache the hook writes one in the background for the next session', async (t) => {
  const { main, key, run, root } = fixture(t);
  const cacheFile = join(root, 'cache', `${key}.txt`);
  const result = run(main);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  for (let attempt = 0; attempt < 100 && !existsSync(cacheFile); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(existsSync(cacheFile), 'background refresh did not write the cache');
  assert.match(readFileSync(cacheFile, 'utf8'), /^main\s+main/m);
});
