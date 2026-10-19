import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scripts = fileURLToPath(new URL('.', import.meta.url));

function fixture(t, checkoutPath) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'worktree-container-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const checkout = join(root, checkoutPath);
  mkdirSync(checkout, { recursive: true });
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(checkout, 'init', '-b', 'main');
  git(checkout, 'config', 'user.name', 'Test User');
  git(checkout, 'config', 'user.email', 'test@example.com');
  // Minimal IUGA checkout; provisioning is disabled, but context linking stays real.
  for (const dir of ['frontend', 'backend', 'context']) mkdirSync(join(checkout, dir));
  for (const file of ['.gitmodules', 'frontend/package-lock.json', 'backend/package-lock.json', 'context/README.md']) {
    writeFileSync(join(checkout, file), '');
  }
  git(checkout, 'add', '.');
  git(checkout, 'commit', '-m', 'Initial checkout');
  const template = join(root, 'instructions.md');
  writeFileSync(template, '# Test instructions\n');
  const create = (script, cwd, branch, ...extra) => execFileSync('bash', [join(scripts, script), branch, 'HEAD', ...extra], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, IUGA_AGENT_TEMPLATE: template, IUGA_SKIP_SUBMODULE: '1', IUGA_SKIP_INSTALL: '1', IUGA_SKIP_ENV: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { root, checkout, git, create };
}

for (const script of ['new-worktree.sh', 'iuga-worktree.sh']) {
  test(`${script}: main and linked checkouts share the existing project container`, (t) => {
    const { root, checkout, git, create } = fixture(t, 'iuga-app-worktrees/main');
    const home = join(root, 'iuga-app-worktrees');
    create(script, checkout, 'fix/login');
    const fix = join(home, 'fix/login');
    assert.ok(existsSync(fix), `Expected worktree at ${fix}`);
    assert.equal(git(fix, 'branch', '--show-current').trim(), 'fix/login');
    create(script, fix, 'feat/checkout');
    assert.equal(git(join(home, 'feat/checkout'), 'branch', '--show-current').trim(), 'feat/checkout');
  });

  test(`${script}: dev and nested working directories use the project container`, (t) => {
    const { root, checkout, git, create } = fixture(t, 'iuga-app-worktrees/dev');
    create(script, join(checkout, 'frontend'), 'fix/cart');
    assert.equal(git(join(root, 'iuga-app-worktrees/fix/cart'), 'branch', '--show-current').trim(), 'fix/cart');
  });

  test(`${script}: standalone clones keep their sibling container and explicit destinations win`, (t) => {
    const { root, checkout, git, create } = fixture(t, 'iuga-app');
    create(script, checkout, 'fix/login');
    assert.equal(git(join(root, 'iuga-app-worktrees/fix/login'), 'branch', '--show-current').trim(), 'fix/login');
    const custom = join(root, 'custom checkout');
    create(script, checkout, 'feat/checkout', custom);
    assert.equal(git(custom, 'branch', '--show-current').trim(), 'feat/checkout');
  });
}
