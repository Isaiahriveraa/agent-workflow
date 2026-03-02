import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = '/Users/isaiahrivera/.agents';
const read = (relativePath) => fs.readFileSync(`${root}/${relativePath}`, 'utf8');

test('session index exists with required sections', () => {
  const content = read('contexts/session-index.md');
  assert.match(content, /## Active Sessions/);
  assert.match(content, /## Recent Sessions/);
  assert.match(content, /## Entry Template/);
});

test('session commands reference session index and state', () => {
  const start = read('commands/session-start.md');
  const pause = read('commands/pause-session.md');
  const resume = read('commands/resume-session.md');
  const status = read('commands/session-status.md');

  assert.match(start, /contexts\/session-index\.md/);
  assert.match(pause, /contexts\/session-index\.md/);
  assert.match(resume, /contexts\/session-index\.md/);
  assert.match(status, /contexts\/session-index\.md/);
  assert.match(resume, /contexts\/state\.md/);
});

test('session tools can create deterministic session paths', () => {
  const output = execFileSync('node', ['scripts/session-tools.mjs', 'create-path', 'Workflow Upgrade'], {
    cwd: root,
    encoding: 'utf8'
  }).trim();

  assert.match(output, /thoughts\/sessions\/general\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_workflow-upgrade\.md$/);
});
