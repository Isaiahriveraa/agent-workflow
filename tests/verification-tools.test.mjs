import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = '/Users/isaiahrivera/.agents';
const read = (relativePath) => fs.readFileSync(`${root}/${relativePath}`, 'utf8');

test('verification context exists with required sections', () => {
  const content = read('contexts/verification.md');
  assert.match(content, /## Available Checks/);
  assert.match(content, /## Preferred Order/);
  assert.match(content, /## Command Source/);
});

test('verification detector reports available verification scripts', () => {
  const output = execFileSync('node', ['scripts/verification-tools.mjs', 'detect'], {
    cwd: root,
    encoding: 'utf8'
  });
  const parsed = JSON.parse(output);
  const names = parsed.scripts.map((entry) => entry.name);

  assert.equal(parsed.packageManager.manager, 'npm');
  assert.ok(names.includes('validate:ssot'));
  assert.ok(names.includes('test'));
});

test('verification plan prefers aggregate checks', () => {
  const output = execFileSync('node', ['scripts/verification-tools.mjs', 'plan'], {
    cwd: root,
    encoding: 'utf8'
  });
  const parsed = JSON.parse(output);

  assert.equal(parsed.preferred[0].name, 'validate:ssot');
  assert.equal(parsed.preferred[1].name, 'test');
});
