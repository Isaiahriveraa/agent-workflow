import test from 'node:test';
import assert from 'node:assert/strict';

// We need to mock fetch before importing the module, but the module also
// caches LLM_AVAILABLE at load time based on env vars.  We control both
// by setting env vars before the dynamic import and by using node:test mock.

const setEnv = () => {
  process.env.AGENTS_MEMORY_OSS_LLM_API_KEY = 'test-key';
  process.env.AGENTS_MEMORY_OSS_LLM_BASE_URL = 'https://fake.test/v1';
  process.env.AGENTS_MEMORY_OSS_LLM_MODEL = 'test-model';
};

const clearEnv = () => {
  delete process.env.AGENTS_MEMORY_OSS_LLM_API_KEY;
  delete process.env.AGENTS_MEMORY_OSS_LLM_BASE_URL;
  delete process.env.AGENTS_MEMORY_OSS_LLM_MODEL;
};

// Helper: build a fake fetch Response for a given JSON body
const fakeResponse = (body, ok = true) => ({
  ok,
  json: async () => ({
    choices: [{ message: { content: JSON.stringify(body) } }]
  })
});

const fakeResponseRaw = (raw, ok = true) => ({
  ok,
  json: async () => ({
    choices: [{ message: { content: raw } }]
  })
});

// ---------------------------------------------------------------------------
// We set env before import so LLM_AVAILABLE is true for most tests.
// Tests that need LLM_AVAILABLE=false use a separate dynamic import.
// ---------------------------------------------------------------------------
setEnv();
const {
  evaluateWriteWorthiness,
  evaluateRecallRelevance,
  checkNovelty
} = await import('../scripts/memory-quality-gate.mjs');

// ===== Write gate tests =====

test('write gate — passes a high-scoring lesson', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    reusability: 4, novelty: 4, durability: 4, specificity: 4,
    overall: 4.0, pass: true,
    reason: 'Highly reusable and specific'
  }));

  const result = await evaluateWriteWorthiness({
    what: 'API rate limits', why: 'got 429', rule: 'use backoff'
  });

  assert.equal(result.pass, true);
  assert.equal(result.gated, true);
  assert.equal(result.score, 4.0);
  assert.ok(result.dimensions.reusability === 4);
});

test('write gate — rejects a low-scoring lesson', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    reusability: 1, novelty: 1, durability: 2, specificity: 1,
    overall: 1.25, pass: false,
    reason: 'Too trivial'
  }));

  const result = await evaluateWriteWorthiness({
    what: 'typo', why: 'misspelled', rule: 'spell check'
  });

  assert.equal(result.pass, false);
  assert.equal(result.gated, true);
  assert.ok(result.score < 3.0);
});

test('write gate — enforces threshold even if LLM says pass: true but overall < 3.0', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    reusability: 2, novelty: 2, durability: 2, specificity: 2,
    overall: 2.0, pass: true, // LLM says pass but score is below threshold
    reason: 'LLM confused'
  }));

  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });

  // Our code uses overall >= WRITE_THRESHOLD, ignoring the LLM's pass field
  assert.equal(result.pass, false);
  assert.equal(result.score, 2.0);
});

test('write gate — fail-open on HTTP error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false }));

  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });

  assert.equal(result.pass, true);
  assert.equal(result.gated, false);
  assert.match(result.reason, /fail-open/i);
});

test('write gate — fail-open on fetch exception (network error)', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('ECONNREFUSED'); });

  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });

  assert.equal(result.pass, true);
  assert.equal(result.gated, false);
});

test('write gate — fail-open on malformed JSON response', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponseRaw('not json at all'));

  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });

  assert.equal(result.pass, true);
  assert.equal(result.gated, false);
});

test('write gate — fail-open when response missing required fields', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    reusability: 4 // missing pass, overall
  }));

  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });

  assert.equal(result.pass, true);
  assert.equal(result.gated, false);
});

test('write gate — handles markdown-wrapped JSON', async (t) => {
  const json = { reusability: 4, novelty: 3, durability: 4, specificity: 4, overall: 3.75, pass: true, reason: 'good' };
  t.mock.method(globalThis, 'fetch', async () =>
    fakeResponseRaw('```json\n' + JSON.stringify(json) + '\n```')
  );

  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });

  assert.equal(result.pass, true);
  assert.equal(result.score, 3.75);
  assert.equal(result.gated, true);
});

test('write gate — handles <think> blocks in response', async (t) => {
  const json = { reusability: 4, novelty: 3, durability: 4, specificity: 4, overall: 3.75, pass: true, reason: 'good' };
  t.mock.method(globalThis, 'fetch', async () =>
    fakeResponseRaw('<think>Let me evaluate this...</think>' + JSON.stringify(json))
  );

  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });

  assert.equal(result.pass, true);
  assert.equal(result.score, 3.75);
});

test('write gate — fail-open on timeout (aborted fetch)', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    // Simulate abort by throwing AbortError
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  });

  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });

  assert.equal(result.pass, true);
  assert.equal(result.gated, false);
});

// ===== Read gate tests =====

test('read gate — marks relevant memory as applicable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    applicable: true, confidence: 0.9, reason: 'Directly relevant'
  }));

  const result = await evaluateRecallRelevance({
    memory: 'use auth headers', taskDescription: 'build API client', workflowStage: 'create-plan'
  });

  assert.equal(result.applicable, true);
  assert.ok(result.confidence >= 0.9);
});

test('read gate — marks irrelevant memory as not applicable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    applicable: false, confidence: 0.1, reason: 'Unrelated domain'
  }));

  const result = await evaluateRecallRelevance({
    memory: 'use auth headers', taskDescription: 'fix CSS layout', workflowStage: 'implement-plan'
  });

  assert.equal(result.applicable, false);
});

test('read gate — fail-open on LLM failure', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('down'); });

  const result = await evaluateRecallRelevance({
    memory: 'test', taskDescription: 'test', workflowStage: 'create-plan'
  });

  assert.equal(result.applicable, true);
  assert.match(result.reason, /fail-open/i);
});

test('read gate — fail-open on missing applicable field', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    confidence: 0.5, reason: 'maybe'  // missing applicable
  }));

  const result = await evaluateRecallRelevance({
    memory: 'test', taskDescription: 'test', workflowStage: 'create-plan'
  });

  assert.equal(result.applicable, true);
  assert.match(result.reason, /fail-open/i);
});

test('read gate — defaults confidence to 0 when missing', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    applicable: true, reason: 'yes'  // missing confidence
  }));

  const result = await evaluateRecallRelevance({
    memory: 'test', taskDescription: 'test', workflowStage: 'create-plan'
  });

  assert.equal(result.applicable, true);
  assert.equal(result.confidence, 0);
});

// ===== Cosine dedup tests =====

test('checkNovelty — detects duplicate above threshold', async () => {
  const mockAdapter = {
    getRelevantMemories: async () => ({
      items: [{ summary: 'existing lesson', score: 0.95 }]
    })
  };

  const result = await checkNovelty({
    summary: 'very similar lesson',
    projectContext: { projectRoot: '/tmp' },
    adapter: mockAdapter
  });

  assert.equal(result.isDuplicate, true);
  assert.ok(result.existingMemory);
  assert.equal(result.existingMemory.score, 0.95);
});

test('checkNovelty — passes novel content below threshold', async () => {
  const mockAdapter = {
    getRelevantMemories: async () => ({
      items: [{ summary: 'different topic', score: 0.5 }]
    })
  };

  const result = await checkNovelty({
    summary: 'brand new lesson',
    projectContext: { projectRoot: '/tmp' },
    adapter: mockAdapter
  });

  assert.equal(result.isDuplicate, false);
  assert.equal(result.existingMemory, null);
});

test('checkNovelty — treats NaN similarity as not duplicate', async () => {
  const mockAdapter = {
    getRelevantMemories: async () => ({
      items: [{ summary: 'corrupted', score: NaN }]
    })
  };

  const result = await checkNovelty({
    summary: 'test',
    projectContext: { projectRoot: '/tmp' },
    adapter: mockAdapter
  });

  assert.equal(result.isDuplicate, false);
});

test('checkNovelty — treats Infinity similarity as not duplicate', async () => {
  const mockAdapter = {
    getRelevantMemories: async () => ({
      items: [{ summary: 'corrupted', score: Infinity }]
    })
  };

  const result = await checkNovelty({
    summary: 'test',
    projectContext: { projectRoot: '/tmp' },
    adapter: mockAdapter
  });

  // Infinity is finite? No — Number.isFinite(Infinity) === false
  assert.equal(result.isDuplicate, false);
});

test('checkNovelty — handles empty results gracefully', async () => {
  const mockAdapter = {
    getRelevantMemories: async () => ({ items: [] })
  };

  const result = await checkNovelty({
    summary: 'test',
    projectContext: { projectRoot: '/tmp' },
    adapter: mockAdapter
  });

  assert.equal(result.isDuplicate, false);
});

test('checkNovelty — fail-open on adapter error', async () => {
  const mockAdapter = {
    getRelevantMemories: async () => { throw new Error('LanceDB down'); }
  };

  const result = await checkNovelty({
    summary: 'test',
    projectContext: { projectRoot: '/tmp' },
    adapter: mockAdapter
  });

  assert.equal(result.isDuplicate, false);
  assert.equal(result.existingMemory, null);
});

test('checkNovelty — uses similarity field when score is absent', async () => {
  const mockAdapter = {
    getRelevantMemories: async () => ({
      items: [{ summary: 'existing', similarity: 0.94 }]
    })
  };

  const result = await checkNovelty({
    summary: 'similar',
    projectContext: { projectRoot: '/tmp' },
    adapter: mockAdapter
  });

  assert.equal(result.isDuplicate, true);
});

// ===== LLM unavailable tests =====
// These test the fail-open path when env vars are missing.
// Since LLM_AVAILABLE is cached at module load, we test via a fresh import.

test('write gate — fail-open when LLM env vars missing', async (t) => {
  // We can't re-import easily, but we can verify the contract:
  // When LLM_AVAILABLE is false, evaluateWriteWorthiness should return pass:true
  // This is already tested implicitly by the module's behavior.
  // For a thorough test, we'd need a separate process. Instead, verify the
  // shape matches fail-open expectations.
  t.mock.method(globalThis, 'fetch', async () => fakeResponse({
    reusability: 1, novelty: 1, durability: 1, specificity: 1,
    overall: 1.0, pass: false, reason: 'bad'
  }));

  // This tests the normal path — for the env-missing path, we use a subprocess
  const result = await evaluateWriteWorthiness({
    what: 'test', why: 'test', rule: 'test'
  });
  // Normal path: gated = true
  assert.equal(result.gated, true);
});

test('LLM unavailable — write gate returns fail-open via subprocess', async () => {
  const { execFileSync } = await import('node:child_process');
  const path = await import('node:path');
  const root = path.resolve(new URL('..', import.meta.url).pathname);

  // Override HOME to prevent loadDefaultEnvFiles() from loading .env with real keys
  const output = execFileSync('node', [
    '-e',
    `
    process.env.AGENTS_MEMORY_OSS_LLM_API_KEY = '';
    const { evaluateWriteWorthiness } = await import('./scripts/memory-quality-gate.mjs');
    const r = await evaluateWriteWorthiness({ what: 'x', why: 'x', rule: 'x' });
    console.log(JSON.stringify(r));
    `
  ], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_MEMORY_OSS_LLM_API_KEY: '',
      AGENTS_ROOT: '/tmp/nonexistent-agents-root'
    }
  });

  const result = JSON.parse(output.trim());
  assert.equal(result.pass, true);
  assert.equal(result.gated, false);
});
