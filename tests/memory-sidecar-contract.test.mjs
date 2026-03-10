import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  deriveMemoryProjectId,
  DeterministicMemoryBackend,
  MEMORY_CONTRACT_LIMITS,
  MEMORY_EVALUATION_THRESHOLDS,
  MEMORY_KINDS,
  SHARED_SCOPE_ALLOWED_KINDS,
  SUPPORTED_MEM0_LANCEDB_PROFILE,
  SUPPORTED_MEM0_PROFILE
} from '../scripts/memory-sidecar-contract.mjs';
import { createMem0LanceDbMemoryBackend } from '../scripts/memory-sidecar-adapter.mjs';
import { getProjectContext } from '../scripts/project-context.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const fixturePath = path.join(root, 'tests', 'fixtures', 'memory-sidecar-evaluation.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const createRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};

test('phase 0 evaluation fixture count matches the locked rubric', () => {
  const scenarios = fixture.scenarios;
  assert.equal(scenarios.length, MEMORY_EVALUATION_THRESHOLDS.totalScenarios);
  assert.equal(scenarios.filter((item) => item.category === 'create-plan').length, MEMORY_EVALUATION_THRESHOLDS.createPlanScenarios);
  assert.equal(scenarios.filter((item) => item.category === 'implement-plan').length, MEMORY_EVALUATION_THRESHOLDS.implementPlanScenarios);
  assert.equal(scenarios.filter((item) => item.category === 'cross-project').length, MEMORY_EVALUATION_THRESHOLDS.crossProjectScenarios);
});

test('project memory identity is derived from the existing project slug', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-contract-'));
  const repoRoot = createRepo(tmpDir, 'alpha');

  try {
    const context = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
    assert.equal(deriveMemoryProjectId(context), context.projectSlug);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('project memory identity uses the explicit override when present', () => {
  assert.equal(
    deriveMemoryProjectId({
      projectSlug: 'derived-from-path',
      projectIdOverride: 'stable-project-id'
    }),
    'stable-project-id'
  );
});

test('supported mem0 profile stays disabled by default and forbids in-memory persistence fallbacks', () => {
  assert.equal(SUPPORTED_MEM0_PROFILE.enabledByDefault, false);
  assert.equal(SUPPORTED_MEM0_PROFILE.integration, 'platform-client');
  assert.equal(SUPPORTED_MEM0_PROFILE.storage.persistenceRequired, true);
  assert.equal(SUPPORTED_MEM0_PROFILE.storage.inMemoryFallbackAllowed, false);
  assert.equal(SUPPORTED_MEM0_PROFILE.storage.provider, 'mem0-managed');
  assert.equal(SUPPORTED_MEM0_PROFILE.model.primary, 'mem0-platform-default');
  assert.equal(SUPPORTED_MEM0_PROFILE.openclaw.supportedInV1, false);
  assert.equal(SUPPORTED_MEM0_PROFILE.failureMode.enabledBackendUnavailable, 'warn-and-return-empty');
});

test('supported mem0 lancedb profile stays disabled by default and locks the lancedb contract', () => {
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.enabledByDefault, false);
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.integration, 'oss-node');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.backend, 'mem0-lancedb');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.storage.persistenceRequired, true);
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.storage.inMemoryFallbackAllowed, false);
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.storage.provider, 'lancedb');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.storage.tableBaseName, 'agents_memory_v1');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.storage.pathTemplate, '<projectRoot>/.agents-memory/lancedb');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.storage.embeddingModel, 'text-embedding-3-small');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.model.primary, 'env:AGENTS_MEMORY_OSS_LLM_MODEL');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.model.embedding, 'text-embedding-3-small');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.model.inferMode, false);
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.historyDb.pathTemplate, '<projectRoot>/.agents-memory/history.db');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.historyDb.explicitPathRequired, true);
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.upsertStrategy, 'delete-and-readd');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.filterStrategy, 'scope-isolated-table-plus-client-side-merge');
  assert.equal(SUPPORTED_MEM0_LANCEDB_PROFILE.openclaw.supportedInV1, false);
});

test('shared scope remains limited to the locked kinds', () => {
  assert.deepEqual(SHARED_SCOPE_ALLOWED_KINDS, ['lesson', 'user_preference']);
  for (const kind of SHARED_SCOPE_ALLOWED_KINDS) {
    assert.ok(MEMORY_KINDS.includes(kind));
  }
});

test('deterministic backend replays the phase 0 fixtures', () => {
  for (const scenario of fixture.scenarios) {
    const backend = new DeterministicMemoryBackend(scenario.records);
    const result = backend.search(scenario.query);
    const ids = result.items.map((item) => item.id);

    assert.ok(result.items.length <= MEMORY_CONTRACT_LIMITS.maxRecallItems, `${scenario.id} exceeded max recall items`);

    for (const expectedId of scenario.expected.included ?? []) {
      assert.ok(ids.includes(expectedId), `${scenario.id} should include ${expectedId}`);
    }

    for (const excludedId of scenario.expected.excluded ?? []) {
      assert.ok(!ids.includes(excludedId), `${scenario.id} should exclude ${excludedId}`);
    }

    if (scenario.expected.ordered) {
      assert.deepEqual(ids.slice(0, scenario.expected.ordered.length), scenario.expected.ordered, `${scenario.id} returned the wrong order`);
    }

    if (scenario.expected.maxItems) {
      assert.equal(ids.length, scenario.expected.maxItems, `${scenario.id} returned the wrong item count`);
    }
  }
});

test('lancedb backend replay matches the locked phase 0 fixture rubric', async () => {
  for (const scenario of fixture.scenarios) {
    const backend = createMem0LanceDbMemoryBackend({
      config: {
        scope: {
          sharedUserId: 'agents-shared'
        }
      },
      namespaceFactory: async (userId) => ({
        userId,
        store: {
          async findMemoryIdsByIdempotencyKey() {
            return [];
          },
          async deleteByMemoryId() {}
        },
        memoryClient: {
          async search(_queryText, options) {
            const scope = options.userId === 'agents-shared' ? 'shared' : 'project';
            const results = scenario.records
              .filter((record) => record.scope === scope)
              .filter((record) => {
                if (scope === 'shared') {
                  return true;
                }

                return record.project_id === scenario.query.project_id;
              })
              .map((record) => ({
                id: record.id,
                memory: record.summary,
                score: record.score,
                createdAt: record.created_at,
                metadata: {
                  project_id: record.project_id,
                  workflow_stage: record.workflow_stage,
                  memory_kind: record.memory_kind,
                  scope: record.scope,
                  source_artifact: record.source_artifact,
                  source_exists: record.source_exists !== false,
                  superseded: record.superseded === true,
                  confidence: record.score,
                  idempotency_key: record.idempotency_key ?? null
                }
              }));

            return { results };
          },
          async add() {
            throw new Error(`record path should not run in fixture replay for ${userId}`);
          }
        }
      })
    });

    const result = await backend.search(scenario.query);
    const ids = result.items.map((item) => item.id);

    assert.ok(result.items.length <= MEMORY_CONTRACT_LIMITS.maxRecallItems, `${scenario.id} exceeded max recall items`);

    for (const expectedId of scenario.expected.included ?? []) {
      assert.ok(ids.includes(expectedId), `${scenario.id} should include ${expectedId}`);
    }

    for (const excludedId of scenario.expected.excluded ?? []) {
      assert.ok(!ids.includes(excludedId), `${scenario.id} should exclude ${excludedId}`);
    }

    if (scenario.expected.ordered) {
      assert.deepEqual(ids.slice(0, scenario.expected.ordered.length), scenario.expected.ordered, `${scenario.id} returned the wrong order`);
    }

    if (scenario.expected.maxItems) {
      assert.equal(ids.length, scenario.expected.maxItems, `${scenario.id} returned the wrong item count`);
    }
  }
});
