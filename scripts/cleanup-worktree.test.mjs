import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./cleanup-worktree.sh', import.meta.url));

function fixture(t, { path = 'feature', submodule = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cleanup-worktree-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  Object.assign(env, {
    HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test User', GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test User', GIT_COMMITTER_EMAIL: 'test@example.com',
    GIT_TERMINAL_PROMPT: '0',
  });
  const git = (cwd, ...args) => execFileSync('git', args, {
    cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  const main = join(root, 'main');
  git(root, 'init', '-b', 'main', main);
  writeFileSync(join(main, '.gitignore'), '.env\n');
  git(main, 'add', '.');
  git(main, 'commit', '-m', 'Initial checkout');
  if (submodule) {
    const source = join(root, 'source');
    git(root, 'init', '-b', 'main', source);
    writeFileSync(join(source, '.gitignore'), '.env\n');
    git(source, 'add', '.');
    git(source, 'commit', '-m', 'Initial submodule');
    git(main, '-c', 'protocol.file.allow=always', 'submodule', 'add', source, 'module');
    git(main, 'commit', '-am', 'Add submodule');
  }
  const worktree = join(root, path);
  git(main, 'worktree', 'add', '-b', 'feature', worktree);
  if (submodule) git(worktree, '-c', 'protocol.file.allow=always', 'submodule', 'update', '--init');
  const cleanup = (...args) => spawnSync('bash', [script, ...args, 'feature'], {
    cwd: main, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { main, worktree, git, cleanup };
}

for (const submodule of [false, true]) {
  test(`safe cleanup preserves ignored files ${submodule ? 'inside submodules' : 'in the worktree'}`, (t) => {
    const { main, worktree, git, cleanup } = fixture(t, { submodule });
    const localFile = join(worktree, ...(submodule ? ['module'] : []), '.env');
    writeFileSync(localFile, 'LOCAL_TEST_VALUE=preserve\n');
    const result = cleanup();
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /\.env/);
    assert.equal(readFileSync(localFile, 'utf8'), 'LOCAL_TEST_VALUE=preserve\n');
    assert.equal(git(main, 'show-ref', '--verify', 'refs/heads/feature').includes('refs/heads/feature'), true);
    assert.ok(git(main, 'worktree', 'list', '--porcelain').includes(worktree));
  });

  test(`explicit force discards ignored files ${submodule ? 'inside submodules' : 'in the worktree'}`, (t) => {
    const { main, worktree, git, cleanup } = fixture(t, { submodule });
    writeFileSync(join(worktree, ...(submodule ? ['module'] : []), '.env'), 'DISPOSABLE_TEST_VALUE\n');
    const result = cleanup('--force');
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(existsSync(worktree), false);
    assert.equal(git(main, 'branch', '--list', 'feature').trim(), '');
  });
}

for (const options of [{}, { path: 'feature with spaces' }, { submodule: true }]) {
  test(`clean cleanup removes worktree and branch: ${JSON.stringify(options)}`, (t) => {
    const { main, worktree, git, cleanup } = fixture(t, options);
    const result = cleanup();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(existsSync(worktree), false);
    assert.equal(git(main, 'branch', '--list', 'feature').trim(), '');
    assert.equal(git(main, 'worktree', 'list', '--porcelain').includes(worktree), false);
  });
}
