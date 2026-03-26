import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createMemorySidecarAdapter, DeterministicMemoryBackend } from '../scripts/memory-sidecar-adapter.mjs';
import { captureLesson, quickCapture, flushQueue } from '../scripts/lesson-tools.mjs';

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
    env: { ...process.env, AGENTS_PROJECT_ROOT: repoRoot }
  }));

// Helper: mock fetch to return a quality gate pass verdict
const fakeWritePass = (score = 4.0) => ({
  ok: true,
  json: async () => ({
    choices: [{
      message: {
        content: JSON.stringify({
          reusability: score, novelty: score, durability: score, specificity: score,
          overall: score, pass: true, reason: 'test pass'
        })
      }
    }]
  })
});

// Helper: mock fetch to return a quality gate fail verdict
const fakeWriteFail = (score = 1.5) => ({
  ok: true,
  json: async () => ({
    choices: [{
      message: {
        content: JSON.stringify({
          reusability: 1, novelty: 1, durability: 2, specificity: 2,
          overall: score, pass: false, reason: 'test reject'
        })
      }
    }]
  })
});

test('project context exposes the shared lessons path', { concurrency: false }, () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-context-'));
  const repoRoot = createRepo(tmpDir, 'lessons');

  try {
    const context = runProjectContext(repoRoot);
    assert.equal(context.thoughtPaths.lessons, path.join(root, 'thoughts', 'lessons'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('capture requires an absolute source artifact path', { concurrency: false }, () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'errors');

  try {
    const output = execFileSync('node', ['scripts/lesson-tools.mjs',
      'capture',
      '--task-class', 'api-workflow',
      '--trigger', 'eval failure',
      '--failure-class', 'API contract miss',
      '--diagnosis', 'The handler omitted a documented edge case.',
      '--rule', 'Always add explicit edge-case tests.',
      '--fix', 'Add the missing edge-case test.',
      '--source-artifact', 'relative/path.md'
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, AGENTS_PROJECT_ROOT: repoRoot },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.match(error.stderr, /source-artifact to be an absolute path/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('capture writes to LanceDB when quality gate passes', { concurrency: false }, async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeWritePass());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'capture-pass');
  const sourceArtifact = path.join(repoRoot, 'source.md');
  fs.writeFileSync(sourceArtifact, '# Source\n');

  const projectContext = runProjectContext(repoRoot);
  const backend = new DeterministicMemoryBackend();
  const adapter = createMemorySidecarAdapter({
    env: { AGENTS_MEMORY_ENABLED: 'true' },
    backend
  });

  try {
    const result = await captureLesson({
      'task-class': 'api-workflow',
      trigger: 'critic rejection',
      'failure-class': 'edge-case miss',
      diagnosis: 'The contract missed an error-path edge case.',
      rule: 'Capture the reusable fix after canonical write succeeds.',
      fix: 'Add the missing branch and test.',
      'source-artifact': sourceArtifact,
      confidence: 'high'
    }, { projectContext, memoryAdapter: adapter });

    assert.equal(result.recorded, true);
    assert.equal(result.gateVerdict.pass, true);
    assert.equal(result.memoryResults.length, 2); // lesson + failure_pattern
    assert.equal(result.memoryResults.every(r => r.recorded), true);

    // Verify records landed in backend
    const recall = await adapter.getRelevantMemories({
      workflowStage: 'implement-plan',
      projectContext,
      minScore: 0
    });
    assert.equal(recall.items.some(i => i.memory_kind === 'failure_pattern'), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('capture returns recorded:false when quality gate rejects', { concurrency: false }, async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeWriteFail());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'capture-reject');
  const sourceArtifact = path.join(repoRoot, 'source.md');
  fs.writeFileSync(sourceArtifact, '# Source\n');

  const projectContext = runProjectContext(repoRoot);
  const backend = new DeterministicMemoryBackend();
  const adapter = createMemorySidecarAdapter({
    env: { AGENTS_MEMORY_ENABLED: 'true' },
    backend
  });

  try {
    const result = await captureLesson({
      'task-class': 'api-workflow',
      trigger: 'eval failure',
      'failure-class': 'trivial fix',
      diagnosis: 'Misspelled a variable.',
      rule: 'Spell check.',
      fix: 'Fix the typo.',
      'source-artifact': sourceArtifact
    }, { projectContext, memoryAdapter: adapter });

    assert.equal(result.recorded, false);
    assert.ok(result.reason);
    assert.ok(result.gateVerdict);
    assert.equal(backend.records.length, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('capture does not write artifacts to filesystem', { concurrency: false }, async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeWritePass());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'no-artifacts');
  const sourceArtifact = path.join(repoRoot, 'source.md');
  fs.writeFileSync(sourceArtifact, '# Source\n');

  const projectContext = runProjectContext(repoRoot);
  const backend = new DeterministicMemoryBackend();
  const adapter = createMemorySidecarAdapter({
    env: { AGENTS_MEMORY_ENABLED: 'true' },
    backend
  });

  const lessonsDir = path.join(root, 'thoughts', 'lessons');
  const beforeFiles = fs.existsSync(lessonsDir) ? fs.readdirSync(lessonsDir) : [];

  try {
    await captureLesson({
      'task-class': 'api-workflow',
      trigger: 'user correction',
      'failure-class': 'no-artifact-check',
      diagnosis: 'Testing that no files are written.',
      rule: 'Do not write markdown artifacts.',
      fix: 'Write to LanceDB only.',
      'source-artifact': sourceArtifact
    }, { projectContext, memoryAdapter: adapter });

    const afterFiles = fs.existsSync(lessonsDir) ? fs.readdirSync(lessonsDir) : [];
    assert.equal(afterFiles.length, beforeFiles.length, 'No new lesson artifacts should be created');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('capture handles memory backend failure gracefully', { concurrency: false }, async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeWritePass());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'backend-fail');
  const sourceArtifact = path.join(repoRoot, 'source.md');
  fs.writeFileSync(sourceArtifact, '# Source\n');

  const projectContext = runProjectContext(repoRoot);
  const failingAdapter = {
    recordMemory: async () => { throw new Error('backend offline'); },
    getRelevantMemories: async () => ({ items: [] })
  };

  try {
    const result = await captureLesson({
      'task-class': 'api-workflow',
      trigger: 'eval failure',
      'failure-class': 'backend outage',
      diagnosis: 'The memory backend was unavailable.',
      rule: 'Handle backend failures gracefully.',
      fix: 'Surface warnings, do not throw.',
      'source-artifact': sourceArtifact
    }, { projectContext, memoryAdapter: failingAdapter });

    // Should still return recorded:true (gate passed) but with warnings
    assert.equal(result.recorded, true);
    assert.ok(result.warnings.length >= 1);
    assert.equal(result.memoryResults.every(r => r.recorded === false), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('capture with preference kind writes user_preference event', { concurrency: false }, async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeWritePass());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'preference');
  const sourceArtifact = path.join(repoRoot, 'source.md');
  fs.writeFileSync(sourceArtifact, '# Source\n');

  const projectContext = runProjectContext(repoRoot);
  const backend = new DeterministicMemoryBackend();
  const adapter = createMemorySidecarAdapter({
    env: { AGENTS_MEMORY_ENABLED: 'true' },
    backend
  });

  try {
    const result = await captureLesson({
      'task-class': 'api-workflow',
      trigger: 'user correction',
      'failure-class': 'taste miss',
      diagnosis: 'User disliked the output.',
      rule: 'Follow user taste preferences.',
      fix: 'Check preferences first.',
      'source-artifact': sourceArtifact,
      'preference-kind': 'preferred',
      preference: 'Compact implementation plans.'
    }, { projectContext, memoryAdapter: adapter });

    assert.equal(result.recorded, true);
    assert.equal(result.memoryResults.length, 3); // lesson + failure + preference
    assert.equal(result.memoryResults.some(r => r.memory_kind === 'user_preference'), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('idempotency key dedup on repeated captures', { concurrency: false }, async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeWritePass());

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'idempotency');
  const sourceArtifact = path.join(repoRoot, 'source.md');
  fs.writeFileSync(sourceArtifact, '# Source\n');

  const projectContext = runProjectContext(repoRoot);
  const backend = new DeterministicMemoryBackend();
  const adapter = createMemorySidecarAdapter({
    env: { AGENTS_MEMORY_ENABLED: 'true' },
    backend
  });

  const args = {
    'task-class': 'api-workflow',
    trigger: 'critic rejection',
    'failure-class': 'duplicate capture',
    diagnosis: 'Repeated captures should dedupe.',
    rule: 'Use deterministic idempotency key.',
    fix: 'Upsert instead of append.',
    'source-artifact': sourceArtifact
  };

  try {
    await captureLesson(args, { projectContext, memoryAdapter: adapter });
    await captureLesson(args, { projectContext, memoryAdapter: adapter });

    // DeterministicMemoryBackend upserts by idempotency_key
    assert.equal(backend.records.length, 2); // lesson + failure_pattern (not 4)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('flushQueue is a no-op stub', async () => {
  const result = await flushQueue();
  assert.equal(result.processed, 0);
  assert.equal(result.failed, 0);
  assert.ok(Array.isArray(result.results));
});

test('quickCapture via CLI returns gate verdict', { concurrency: false }, async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeWritePass(3.5));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lesson-tools-'));
  const repoRoot = createRepo(tmpDir, 'quick');
  const projectContext = runProjectContext(repoRoot);
  const backend = new DeterministicMemoryBackend();
  const adapter = createMemorySidecarAdapter({
    env: { AGENTS_MEMORY_ENABLED: 'true' },
    backend
  });

  try {
    const result = await quickCapture({
      what: 'API rate limit hit',
      why: 'exceeded 20 req/min',
      rule: 'implement backoff with jitter'
    }, { projectContext, memoryAdapter: adapter });

    assert.equal(result.recorded, true);
    assert.ok(result.gateVerdict);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
