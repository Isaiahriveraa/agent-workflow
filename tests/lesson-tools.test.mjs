import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);

const createRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};

const runProjectContext = (repoRoot) =>
  JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

const execLessonTool = (args, repoRoot, extraEnv = {}) =>
  execFileSync('node', ['scripts/lesson-tools.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot,
      ...extraEnv
    }
  });

test('project context exposes the shared lessons path', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-context-'));
  const repoRoot = createRepo(tmpDir, 'lessons');

  try {
    const context = runProjectContext(repoRoot);
    assert.equal(context.thoughtPaths.lessons, path.join(root, 'thoughts', 'lessons'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lesson capture writes an artifact and updates learning contexts', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'capture');
  const sourceArtifact = path.join(repoRoot, '.planning', 'research', 'source.md');

  fs.mkdirSync(path.dirname(sourceArtifact), { recursive: true });
  fs.writeFileSync(sourceArtifact, '# Source\n');

  const originalLessons = fs.readFileSync(path.join(root, 'contexts', 'lessons-learned.md'), 'utf8');
  const originalPatterns = fs.readFileSync(path.join(root, 'contexts', 'failure-patterns.md'), 'utf8');
  const originalTaste = fs.readFileSync(path.join(root, 'contexts', 'user-taste.md'), 'utf8');

  try {
    const output = JSON.parse(execLessonTool([
      'capture',
      '--task-class', 'creative-redesign',
      '--trigger', 'user correction',
      '--failure-class', 'creative/taste miss',
      '--diagnosis', 'The output reused a generic structure and ignored bold differentiation.',
      '--rule', 'When the user rejects generic creative output, load stronger references before retrying.',
      '--fix', 'Rebuild the brief with references and banned patterns before another pass.',
      '--source-artifact', sourceArtifact,
      '--confidence', 'high',
      '--systemic', 'true',
      '--suggestion', 'Tighten the creative capsule gate to require references.',
      '--preference-kind', 'disliked',
      '--preference', 'Generic redesigns that only polish the surface.'
    ], repoRoot));

    assert.match(output.artifactPath, /thoughts\/lessons\/\d{4}-\d{2}-\d{2}-creative-redesign-creative-taste-miss-/);
    assert.equal(fs.existsSync(output.artifactPath), true);

    const lessons = fs.readFileSync(path.join(root, 'contexts', 'lessons-learned.md'), 'utf8');
    const failurePatterns = fs.readFileSync(path.join(root, 'contexts', 'failure-patterns.md'), 'utf8');
    const userTaste = fs.readFileSync(path.join(root, 'contexts', 'user-taste.md'), 'utf8');

    assert.match(lessons, /creative-redesign \| user correction/);
    assert.match(lessons, /thoughts\/lessons\//);
    assert.match(failurePatterns, /creative\/taste miss \| trigger: user correction/);
    assert.match(userTaste, /Generic redesigns that only polish the surface\./);
    assert.match(userTaste, /Recent Confirmations/);
  } finally {
    fs.writeFileSync(path.join(root, 'contexts', 'lessons-learned.md'), originalLessons);
    fs.writeFileSync(path.join(root, 'contexts', 'failure-patterns.md'), originalPatterns);
    fs.writeFileSync(path.join(root, 'contexts', 'user-taste.md'), originalTaste);

    const lessonsDir = path.join(root, 'thoughts', 'lessons');
    if (fs.existsSync(lessonsDir)) {
      for (const entry of fs.readdirSync(lessonsDir)) {
        if (entry.includes('creative-redesign-creative-taste-miss')) {
          fs.rmSync(path.join(lessonsDir, entry), { force: true });
        }
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lesson capture requires an absolute source artifact path', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'errors');

  try {
    assert.throws(() => execLessonTool([
      'capture',
      '--task-class', 'api-workflow',
      '--trigger', 'eval failure',
      '--failure-class', 'API contract miss',
      '--diagnosis', 'The handler omitted a documented edge case.',
      '--rule', 'Always add explicit edge-case tests before calling the API workflow done.',
      '--fix', 'Add the missing edge-case test and handler branch.',
      '--source-artifact', 'relative/path.md'
    ], repoRoot), /source-artifact to be an absolute path/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lesson queue persists a pending item and flush processes it', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'queue');
  const sourceArtifact = path.join(repoRoot, '.planning', 'research', 'queued-source.md');

  fs.mkdirSync(path.dirname(sourceArtifact), { recursive: true });
  fs.writeFileSync(sourceArtifact, '# Queued Source\n');

  const originalLessons = fs.readFileSync(path.join(root, 'contexts', 'lessons-learned.md'), 'utf8');
  const originalPatterns = fs.readFileSync(path.join(root, 'contexts', 'failure-patterns.md'), 'utf8');
  const originalTaste = fs.readFileSync(path.join(root, 'contexts', 'user-taste.md'), 'utf8');

  try {
    const queued = JSON.parse(execLessonTool([
      'queue',
      '--task-class', 'api-workflow',
      '--trigger', 'critic rejection',
      '--failure-class', 'edge-case miss',
      '--diagnosis', 'The contract missed an error-path edge case.',
      '--rule', 'Queue reusable API misses for automatic writeback after the run.',
      '--fix', 'Add the missing branch and test before retrying.',
      '--source-artifact', sourceArtifact,
      '--confidence', 'medium'
    ], repoRoot));

    assert.equal(queued.queued, true);
    assert.equal(fs.existsSync(queued.queuePath), true);

    const flushed = JSON.parse(execLessonTool(['flush'], repoRoot));
    assert.equal(flushed.processed, 1);
    assert.equal(flushed.failed, 0);
    assert.equal(fs.existsSync(queued.queuePath), false);

    const lessons = fs.readFileSync(path.join(root, 'contexts', 'lessons-learned.md'), 'utf8');
    const failurePatterns = fs.readFileSync(path.join(root, 'contexts', 'failure-patterns.md'), 'utf8');

    assert.match(lessons, /api-workflow \| critic rejection/);
    assert.match(failurePatterns, /edge-case miss \| trigger: critic rejection/);
  } finally {
    fs.writeFileSync(path.join(root, 'contexts', 'lessons-learned.md'), originalLessons);
    fs.writeFileSync(path.join(root, 'contexts', 'failure-patterns.md'), originalPatterns);
    fs.writeFileSync(path.join(root, 'contexts', 'user-taste.md'), originalTaste);

    const lessonsDir = path.join(root, 'thoughts', 'lessons');
    if (fs.existsSync(lessonsDir)) {
      for (const entry of fs.readdirSync(lessonsDir)) {
        if (entry.includes('api-workflow-edge-case-miss')) {
          fs.rmSync(path.join(lessonsDir, entry), { force: true });
        }
      }
      const queuePath = path.join(lessonsDir, 'queue');
      if (fs.existsSync(queuePath)) {
        fs.rmSync(queuePath, { recursive: true, force: true });
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
