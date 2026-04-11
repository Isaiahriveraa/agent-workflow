import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const daemonScript = path.join(root, 'scripts', 'daemon-manager.mjs');

const runDaemon = (args, env = {}) =>
  execFileSync('node', [daemonScript, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env
    }
  });

test('daemon manager tracks multiple watched projects in state', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-daemon-manager-'));
  const agentsRoot = path.join(tmpDir, 'agents');
  const projectA = path.join(tmpDir, 'project-a');
  const projectB = path.join(tmpDir, 'project-b');

  try {
    fs.mkdirSync(path.join(agentsRoot, '.pids'), { recursive: true });
    fs.mkdirSync(projectA, { recursive: true });
    fs.mkdirSync(projectB, { recursive: true });

    const addA = runDaemon(['add-project', projectA], { AGENTS_ROOT: agentsRoot });
    const addB = runDaemon(['add-project', projectB], { AGENTS_ROOT: agentsRoot });
    const listed = runDaemon(['list-projects'], { AGENTS_ROOT: agentsRoot });
    const status = runDaemon(['status'], { AGENTS_ROOT: agentsRoot });

    assert.match(addA, /Added project:/);
    assert.match(addB, /Watching 2 projects\./);
    assert.match(listed, new RegExp(projectA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(listed, new RegExp(projectB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(status, /STOPPED for 2 projects/);

    const statePath = path.join(agentsRoot, '.pids', 'daemon-state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.deepEqual(state.projectRoots, [projectA, projectB].sort());
    assert.equal(state.projectRoot, [projectA, projectB].sort()[0]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('daemon manager removes projects from the watch set', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-daemon-manager-'));
  const agentsRoot = path.join(tmpDir, 'agents');
  const projectA = path.join(tmpDir, 'project-a');
  const projectB = path.join(tmpDir, 'project-b');

  try {
    fs.mkdirSync(path.join(agentsRoot, '.pids'), { recursive: true });
    fs.mkdirSync(projectA, { recursive: true });
    fs.mkdirSync(projectB, { recursive: true });

    runDaemon(['add-project', projectA], { AGENTS_ROOT: agentsRoot });
    runDaemon(['add-project', projectB], { AGENTS_ROOT: agentsRoot });
    const removed = runDaemon(['remove-project', projectA], { AGENTS_ROOT: agentsRoot });
    const listed = runDaemon(['list-projects'], { AGENTS_ROOT: agentsRoot });

    assert.match(removed, /Removed project:/);
    assert.doesNotMatch(listed, new RegExp(projectA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(listed, new RegExp(projectB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
