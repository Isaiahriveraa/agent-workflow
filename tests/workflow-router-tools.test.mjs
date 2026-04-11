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

const execWorkflowRouter = (args, repoRoot) =>
  execFileSync('node', ['scripts/workflow-router-tools.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  });

test('workflow router classifies substantial workflow requests', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-router-')), 'classify');

  try {
    const parsed = JSON.parse(execWorkflowRouter([
      'classify',
      '--input',
      'This is a multi-step workflow change that touches 3+ files and needs research and planning.'
    ], repoRoot));

    assert.equal(parsed.substantial, true);
    assert.ok(parsed.reasons.length > 0);
    assert.equal(parsed.activation.strictWorkflowRequired, true);
    assert.equal(parsed.activation.recommendedNextAction, 'optimize-prompt');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('workflow router derives strict activation reasons for substantial requests', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-router-')), 'activate-substantial');

  try {
    const parsed = JSON.parse(execWorkflowRouter([
      'activate',
      '--input',
      'This cross-provider workflow refactor needs research, planning, delegation, and will touch 4 files.'
    ], repoRoot));

    assert.equal(parsed.strictWorkflowRequired, true);
    assert.equal(parsed.taskSize, 'substantial');
    assert.equal(parsed.recommendedNextAction, 'optimize-prompt');
    assert.equal(parsed.explicitFileCount, 4);
    assert.equal(parsed.ambiguityDetected, false);
    assert.equal(parsed.recommendedResearchEntry, 'research');
    assert.deepEqual(
      parsed.reasons.map((item) => item.id),
      [
        'workflow_or_planning_change',
        'cross_subsystem_scope',
        'touches_three_or_more_files'
      ]
    );
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('workflow router flags vague substantial requests for brainstorm-first discovery', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-router-')), 'activate-brainstorm');

  try {
    const parsed = JSON.parse(execWorkflowRouter([
      'activate',
      '--input',
      'This vague workflow change needs research, planning, and delegation before implementation.'
    ], repoRoot));

    assert.equal(parsed.strictWorkflowRequired, true);
    assert.equal(parsed.ambiguityDetected, true);
    assert.equal(parsed.recommendedResearchEntry, 'brainstorm');
    assert.equal(parsed.recommendedNextAction, 'optimize-prompt');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('workflow router keeps narrow requests on the lightweight path', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-router-')), 'activate-lightweight');

  try {
    const parsed = JSON.parse(execWorkflowRouter([
      'activate',
      '--input',
      'Rename one test file to match the existing naming convention.'
    ], repoRoot));

    assert.equal(parsed.strictWorkflowRequired, false);
    assert.equal(parsed.taskSize, 'lightweight');
    assert.equal(parsed.recommendedNextAction, 'proceed-lightweight');
    assert.deepEqual(parsed.reasons, []);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('workflow router score enforces readiness thresholds', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-router-')), 'score');

  try {
    const failing = JSON.parse(execWorkflowRouter([
      'score',
      '--clarity', '14',
      '--codebase-coverage', '18',
      '--constraints', '18',
      '--risks', '10',
      '--verification', '10'
    ], repoRoot));
    assert.equal(failing.total, 70);
    assert.equal(failing.passes, false);

    const passing = JSON.parse(execWorkflowRouter([
      'score',
      '--clarity', '18',
      '--codebase-coverage', '18',
      '--constraints', '15',
      '--risks', '10',
      '--verification', '10'
    ], repoRoot));
    assert.equal(passing.total, 71);
    assert.equal(passing.passes, true);
    assert.equal(passing.nextAction, 'create-plan');
    assert.equal(passing.recommendedNextAction, 'create-plan');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('workflow router capture writes a repo-local intake artifact', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-router-')), 'capture');

  try {
    const parsed = JSON.parse(execWorkflowRouter([
      'capture',
      '--topic', 'Strict RPI Workflow',
      '--input', 'Need a multi-step workflow upgrade with research, planning, and continuity.'
    ], repoRoot));

    assert.match(parsed.path, /\/\.planning\/intake\/\d{4}-\d{2}-\d{2}-strict-rpi-workflow\.md$/);
    assert.equal(fs.existsSync(parsed.path), true);

    const content = fs.readFileSync(parsed.path, 'utf8');
    assert.match(content, /# Intake: Strict RPI Workflow/);
    assert.match(content, /status: captured/);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});
