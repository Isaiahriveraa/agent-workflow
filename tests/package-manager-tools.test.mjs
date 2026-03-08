import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (relativePath) => fs.readFileSync(`${root}/${relativePath}`, 'utf8');

test('tooling context exists with package manager section', () => {
  const content = read('contexts/tooling.md');
  assert.match(content, /## Package Manager/);
  assert.match(content, /detected:/);
});

test('package manager detector reports current repo defaults', () => {
  const output = execFileSync('node', ['scripts/package-manager-tools.mjs', 'detect'], {
    cwd: root,
    encoding: 'utf8'
  });
  const parsed = JSON.parse(output);

  assert.equal(parsed.manager, 'npm');
  assert.match(parsed.source, /package-lock|package\.json default/);
  assert.equal(parsed.root, root);
});

test('package manager detector formats run and install commands', () => {
  const runOutput = execFileSync('node', ['scripts/package-manager-tools.mjs', 'run', 'test', '--', '--watch'], {
    cwd: root,
    encoding: 'utf8'
  }).trim();
  const installOutput = execFileSync('node', ['scripts/package-manager-tools.mjs', 'install-dev', 'vitest'], {
    cwd: root,
    encoding: 'utf8'
  }).trim();

  assert.equal(runOutput, 'npm run test -- --watch');
  assert.equal(installOutput, 'npm install -D vitest');
});
