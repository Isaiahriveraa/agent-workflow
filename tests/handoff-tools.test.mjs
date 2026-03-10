import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);

const createFixtureRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};

const runHandoffTool = (args, repoRoot, extraEnv = {}) =>
  JSON.parse(execFileSync('node', ['scripts/handoff-tools.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  }));

const withTempProjectsRoot = (fn) => {
  const projectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-projects-root-'));

  try {
    return fn({ AGENTS_PROJECTS_ROOT: projectsRoot });
  } finally {
    fs.rmSync(projectsRoot, { recursive: true, force: true });
  }
};

test('handoff tool resolves an explicit absolute path', () => {
  withTempProjectsRoot((env) => {
    const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-handoff-')), 'repo');
    const handoffPath = path.join(root, 'thoughts', 'shared', 'handoffs', 'general', '2026-03-06_20-30-00_explicit.md');
    fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
    fs.writeFileSync(handoffPath, '# handoff\n');

    try {
      const result = runHandoffTool(['resolve', handoffPath], repoRoot, env);
      assert.equal(result.mode, 'path');
      assert.equal(result.path, handoffPath);
      assert.deepEqual(result.candidates, [handoffPath]);
    } finally {
      fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
      fs.rmSync(handoffPath, { force: true });
    }
  });
});

test('handoff tool reports no candidate when a ticket has no handoffs', () => {
  withTempProjectsRoot((env) => {
    const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-handoff-')), 'repo');

    try {
      const result = runHandoffTool(['resolve', 'ENG-9999'], repoRoot, env);
      assert.equal(result.mode, 'ticket');
      assert.equal(result.path, null);
      assert.deepEqual(result.candidates, []);
    } finally {
      fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    }
  });
});

test('handoff tool picks the most recent timestamped handoff for a ticket', () => {
  withTempProjectsRoot((env) => {
    const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-handoff-')), 'repo');
    const ticketDir = path.join(root, 'thoughts', 'shared', 'handoffs', 'ENG-4242');
    const first = path.join(ticketDir, '2026-03-06_10-00-00_ENG-4242_first.md');
    const latest = path.join(ticketDir, '2026-03-06_11-00-00_ENG-4242_second.md');
    fs.mkdirSync(ticketDir, { recursive: true });
    fs.writeFileSync(first, '# first\n');
    fs.writeFileSync(latest, '# latest\n');

    try {
      const result = runHandoffTool(['resolve', 'ENG-4242'], repoRoot, env);
      assert.equal(result.mode, 'ticket');
      assert.equal(result.path, latest);
      assert.deepEqual(result.candidates, [first, latest]);
    } finally {
      fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
      fs.rmSync(ticketDir, { recursive: true, force: true });
    }
  });
});
