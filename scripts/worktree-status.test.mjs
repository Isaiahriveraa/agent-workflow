import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, realpathSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./worktree-status.sh', import.meta.url));

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'worktree-status-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  Object.assign(env, {
    HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test User', GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test User', GIT_COMMITTER_EMAIL: 'test@example.com',
  });
  const git = (cwd, ...args) => execFileSync('git', args, {
    cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  const main = join(root, 'main');
  git(root, 'init', '-b', 'main', main);
  git(main, 'commit', '--allow-empty', '-m', 'Initial');

  const addBranch = (name, { merge = false, dirty = false } = {}) => {
    const path = join(root, name);
    git(main, 'worktree', 'add', '-b', name, path);
    git(path, 'commit', '--allow-empty', '-m', `Work on ${name}`);
    if (merge) {
      git(main, 'merge', '--no-ff', name, '-m', `Merge ${name}`);
    }
    if (dirty) writeFileSync(join(path, 'scratch.txt'), 'local\n');
    return path;
  };

  // Fake gh: reports PR state per branch the way `gh pr list --jq` would.
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), `#!/usr/bin/env bash
case "$*" in
  *"--head merged-clean"*|*"--head merged-dirty"*) echo MERGED ;;
  *"--head open-clean"*) echo OPEN ;;
  *) echo null ;;
esac
`);
  chmodSync(join(bin, 'gh'), 0o755);

  const status = (overrides = {}) => spawnSync('bash', [script], {
    cwd: main,
    env: { ...env, PATH: `${bin}:${process.env.PATH}`, ...overrides },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { addBranch, status, main };
}

function rowFor(output, branch) {
  return output.split('\n').find((line) => line.includes(` ${branch} `)) ?? '';
}

test('merged and clean worktree is marked for cleanup', (t) => {
  const { addBranch, status } = fixture(t);
  addBranch('merged-clean', { merge: true });
  const result = status();
  assert.equal(result.status, 0, result.stderr);
  assert.match(rowFor(result.stdout, 'merged-clean'), /^merged\s+merged-clean\s+clean\s+cleanup\s/);
});

test('open worktree is kept', (t) => {
  const { addBranch, status } = fixture(t);
  addBranch('open-clean');
  const result = status();
  assert.equal(result.status, 0, result.stderr);
  assert.match(rowFor(result.stdout, 'open-clean'), /^open\s+open-clean\s+clean\s+keep\s/);
});

test('merged worktree with local files is kept and counted', (t) => {
  const { addBranch, status } = fixture(t);
  addBranch('merged-dirty', { merge: true, dirty: true });
  const result = status();
  assert.equal(result.status, 0, result.stderr);
  assert.match(rowFor(result.stdout, 'merged-dirty'), /^merged\s+merged-dirty\s+[1-9]\d*\s+keep-dirty\s/);
});

test('main checkout is labelled main and never cleaned', (t) => {
  const { status, main } = fixture(t);
  const result = status();
  assert.equal(result.status, 0, result.stderr);
  assert.match(rowFor(result.stdout, 'main'), /^main\s+main\s+-\s+-\s/);
  assert.ok(result.stdout.includes(main));
});

test('without gh the PR state is unknown and nothing is cleaned', (t) => {
  const { addBranch, status } = fixture(t);
  addBranch('merged-clean', { merge: true });
  const result = status({ PATH: '/usr/bin:/bin' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(rowFor(result.stdout, 'merged-clean'), /^unknown\s+merged-clean\s+clean\s+keep\s/);
});
