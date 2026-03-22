import test from 'node:test';
import assert from 'node:assert/strict';

import { getMemoryHealth } from '../scripts/memory-health-check.mjs';

test('memory health reports healthy when memory is disabled', () => {
  const result = getMemoryHealth({ env: {} });
  assert.equal(result.exitCode, 0);
  assert.equal(result.result.status, 'healthy');
});

test('memory health reports fatal when required mem0 credentials are missing', () => {
  const result = getMemoryHealth({
    env: {
      AGENTS_MEMORY_ENABLED: 'true',
      AGENTS_MEMORY_BACKEND: 'mem0'
    }
  });

  assert.equal(result.exitCode, 2);
  assert.equal(result.result.status, 'fatal');
});

test('memory health reports degraded when the lancedb path is derived instead of explicit', () => {
  const result = getMemoryHealth({
    env: {
      AGENTS_MEMORY_ENABLED: 'true',
      AGENTS_MEMORY_BACKEND: 'mem0-lancedb',
      AGENTS_MEMORY_OSS_LLM_API_KEY: 'llm-key',
      AGENTS_MEMORY_OSS_LLM_MODEL: 'gpt-4.1-mini',
      AGENTS_MEMORY_OSS_EMBEDDER_API_KEY: 'embed-key',
      AGENTS_MEMORY_OSS_HISTORY_DB_PATH: '/tmp/agents-memory/history.db'
    },
    backend: {
      search: async () => ({ items: [], total_considered: 0 }),
      record: async () => ({})
    }
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.result.status, 'degraded');
});
