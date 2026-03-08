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

const runProjectContext = (repoRoot, extraEnv = {}) =>
  JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  }));

const runContinuityTool = (args, repoRoot, extraEnv = {}) =>
  JSON.parse(execFileSync('node', ['scripts/continuity-tools.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  }));

test('continuity checkpoint creates a project-local session artifact and updates runtime state', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'checkpoint');
  const context = runProjectContext(repoRoot);
  const planPath = path.join(repoRoot, '.planning', 'plans', 'continuity-test-plan.md');
  const researchPath = path.join(repoRoot, '.planning', 'research', 'continuity-test-research.md');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(researchPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  fs.writeFileSync(researchPath, '# research\n');

  try {
    const result = runContinuityTool([
      'checkpoint',
      '--source', 'test-suite',
      '--focus', 'continuity phase 2',
      '--topic', 'Checkpoint Topic',
      '--workflow', 'implementation',
      '--phase', 'phase 2',
      '--next-step', 'Run follow-up command',
      '--next-command', '/resume-session',
      '--plan', planPath,
      '--research', researchPath
    ], repoRoot);

    assert.equal(result.action, 'checkpoint');
    assert.ok(fs.existsSync(result.artifactPath));
    assert.match(result.artifactPath, /\/\.agents\/sessions\/general\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_checkpoint-topic\.md$/);

    const sessionArtifact = fs.readFileSync(result.artifactPath, 'utf8');
    assert.match(sessionArtifact, /# Session: Checkpoint Topic/);
    assert.match(sessionArtifact, /- Workflow: implementation/);

    const state = fs.readFileSync(context.contextPaths.state, 'utf8');
    assert.match(state, /## Current Workflow\n- implementation/);
    assert.match(state, /## Current Phase\n- phase 2/);
    assert.match(state, new RegExp(`- ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    const sessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
    assert.match(sessionIndex, /## Active Sessions/);
    assert.match(sessionIndex, /- Status: active/);
    assert.match(sessionIndex, new RegExp(`- Artifact path: ${result.artifactPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
  }
});

test('continuity handoff preserves authored handoff content and syncs project-local runtime state', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-continuity-')), 'handoff');
  const context = runProjectContext(repoRoot);
    const handoffPath = path.join(root, 'thoughts', 'shared', 'handoffs', 'general', '2026-03-06_20-00-00_continuity-test.md');
    const researchPath = path.join(repoRoot, '.planning', 'research', 'continuity-test-research.md');
    const authoredHandoff = [
      '---',
      'date: 2026-03-06T20:00:00-0800',
      'researcher: Codex',
      'status: complete',
      'type: implementation_strategy',
      '---',
      '',
      '# Handoff: Authored continuity handoff',
      '',
      '## Task(s)',
      '- Completed: wrote the real handoff content before runtime sync.'
    ].join('\n') + '\n';

    fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
    fs.mkdirSync(path.dirname(researchPath), { recursive: true });
    fs.writeFileSync(handoffPath, authoredHandoff);
    fs.writeFileSync(researchPath, '# research\n');

  try {
    const result = runContinuityTool([
      'handoff',
      '--source', 'test-suite',
      '--focus', 'handoff continuity',
      '--topic', 'Continuity Handoff',
      '--workflow', 'implementation',
      '--phase', 'phase 2',
      '--next-step', 'Resume from handoff',
      '--research', researchPath,
      '--handoff', handoffPath
    ], repoRoot);

      assert.equal(result.action, 'handoff');
      assert.equal(result.artifactPath, handoffPath);
      assert.ok(fs.existsSync(handoffPath));
      assert.doesNotMatch(handoffPath, /\/projects\/.*\/thoughts\/handoffs\//);

      const handoff = fs.readFileSync(handoffPath, 'utf8');
      assert.equal(handoff, authoredHandoff);

      const state = fs.readFileSync(context.contextPaths.state, 'utf8');
      assert.match(state, new RegExp(`- handoff: ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(state, new RegExp(`- research: ${researchPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

      const sessionIndex = fs.readFileSync(context.contextPaths.sessionIndex, 'utf8');
      assert.match(sessionIndex, /## Active Sessions\n- No active sessions recorded\./);
      assert.match(sessionIndex, /## Recent Sessions/);
      assert.match(sessionIndex, /- Status: handed_off/);
      assert.match(sessionIndex, new RegExp(`- Artifact path: ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(sessionIndex, new RegExp(`- Next command: /resume_handoff ${handoffPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(handoffPath, { force: true });
  }
});
